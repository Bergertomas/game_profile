import { TAGS } from "@/lib/rubric/tags";
import type { EvaluationTag, EvidenceSource, GameWithEvaluation } from "./types";

/**
 * The order a record takes when nothing authored one.
 *
 * ── Why this exists as its own module ───────────────────────────────────────
 *
 * `evaluation_tags` and `evaluation_evidence_links` now carry an authored
 * `display_order` (migration 0008), so the Postgres reader returns the order an
 * editor chose and `buildProfileView` no longer imposes one. Typed fixtures have
 * no such column: they are arrays, and an array's order is whoever typed it.
 *
 * Migration 0008 backfilled every existing row using exactly the rule below, so
 * applying it to fixtures keeps fixture/Postgres parity exact — and keeps the
 * public pages byte-identical across the change, which is the point of a
 * backfill that preserves what was already being rendered.
 *
 * This is NOT an editorial opinion about ordering. It is the answer to "what
 * order were these in before anyone could say?", and it belongs to the fixture
 * path and to the migration, not to the renderer.
 */

/** Position of each tag in the controlled vocabulary. */
const TAG_POSITION = new Map(TAGS.map((tag, index) => [tag.key, index]));

/**
 * Tags in the controlled vocabulary's own order.
 *
 * Better than insertion order in the absence of an authored one: the vocabulary
 * is grouped by category, so structure tags sit together, then narrative, then
 * play. An unrecognised key sorts last rather than throwing.
 */
function orderTags(tags: readonly EvaluationTag[]): EvaluationTag[] {
  return [...tags].sort(
    (a, b) =>
      (TAG_POSITION.get(a.key) ?? Number.MAX_SAFE_INTEGER) -
      (TAG_POSITION.get(b.key) ?? Number.MAX_SAFE_INTEGER),
  );
}

/**
 * Evidence by its stable source key, and each source's `supports` in rubric
 * order.
 *
 * Sorting on the key is deliberately mechanical: it makes no claim that one
 * source matters more than another, which ordering by tier would. Evidence is
 * counted, never weighted (SOP §6).
 *
 * `byCodeUnit` rather than `localeCompare` or a database `ORDER BY`, because
 * both depend on a collation: a `C` database returns "AW2" before "Alan Wake
 * II" and an `en_US.utf8` one returns the reverse, and a public page's order
 * must not depend on which machine built it.
 */
function orderSources(
  sources: readonly EvidenceSource[],
): readonly EvidenceSource[] {
  // Only the sequence of sources. Each source's `supports` is a set rather than
  // an authored list, and `buildProfileView` presents it in rubric order for
  // both read paths.
  return [...sources].sort((a, b) => byCodeUnit(a.id, b.id));
}

/** A stable comparator that depends on nothing outside this process. */
export function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** One record with its orderless collections put into the canonical order. */
export function canonicallyOrdered(
  record: GameWithEvaluation,
): GameWithEvaluation {
  return {
    ...record,
    evaluation: {
      ...record.evaluation,
      tags: orderTags(record.evaluation.tags),
      sources: orderSources(record.evaluation.sources),
    },
  };
}
