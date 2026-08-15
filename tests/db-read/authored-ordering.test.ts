import { afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDatabase, getDatabase } from "@/lib/db/client";
import { readPublishedProfiles } from "@/lib/db/read-profiles";
import * as t from "@/lib/db/schema";
import { buildProfileView } from "@/lib/profile/build";
import { RUBRIC_V1 } from "@/lib/rubric";

/**
 * Authored ordering for tags and evidence links (migration 0008).
 *
 * Master Plan §8.7 named both as known schema gaps. Before 0008 neither table
 * had an ordering column, so an editor's sequence was not representable and
 * `buildProfileView` imposed a canonical one — deterministic, and not the same
 * thing as preserving a decision.
 *
 * ── Why these stage a whole profile instead of reordering a seeded one ──────
 *
 * Because the first attempt to reorder Alan Wake 2's tags was refused by
 * `trg_evaluation_child_immutable`: "children of final evaluation … are
 * immutable; create a new version". That is the correct answer and it is worth
 * recording — a published snapshot does not get quietly re-sorted, not even by
 * a test. So each reordering proof authors its own scope, sets the order while
 * the evaluation is still a draft, publishes it, and reads it back through the
 * public reader.
 */

const db = getDatabase();
afterAll(closeDatabase);

const RETURNAL = `(SELECT id FROM games WHERE slug='returnal')`;
const SIBLING = `(SELECT ps.id FROM profile_scopes ps JOIN games g ON g.id=ps.game_id
                   WHERE g.slug='returnal' AND ps.key='ordering')`;
const SIBLING_EVALUATION = `(SELECT id FROM evaluations WHERE scope_id = ${SIBLING})`;

/**
 * A complete, publishable evaluation on a fresh sibling scope, carrying tags
 * and evidence links whose `display_order` this test controls.
 *
 * Published rather than left as a draft, because the property under test is
 * what the PUBLIC reader emits, and that reader selects published rows only.
 */
function stageOrderedProfile(tagOrder: readonly string[], linkOrder: readonly string[]): string {
  const tagValues = tagOrder
    .map((key, index) => `('${key}', ${index + 1})`)
    .join(", ");
  const linkValues = linkOrder
    .map((key, index) => `('${key}', ${index + 1})`)
    .join(", ");

  return `
    INSERT INTO profile_scopes (game_id, key, label, is_primary, display_order)
    VALUES (${RETURNAL}, 'ordering', 'Ordering fixture', false, 9);

    INSERT INTO evaluations (
      game_id, scope_id, rubric_version, version_number, edition_scope, mode_scope,
      platform_scope, build_or_patch_scope, status, evidence_status, confidence,
      evidence_cutoff_at, release_context, one_line_experience, primary_pull,
      primary_risk, score_provenance, calibration_round
    ) VALUES (
      ${RETURNAL}, ${SIBLING}, '1.0', 1, 'Base game', 'Ordering fixture',
      ARRAY['PC'], 'Test build', 'draft', 'verified', 'medium',
      '2026-08-06', 'Post-release', 'An ordering fixture.', 'A test pull.',
      'A test risk.', 'calibration', 'round_1'
    );

    INSERT INTO subcriterion_scores (evaluation_id, subcriterion_id, score, rationale)
    SELECT e.id, s.id, 1, 'test rationale'
    FROM evaluations e
    JOIN dimensions d ON d.rubric_version = e.rubric_version
    JOIN subcriteria s ON s.dimension_id = d.id
    WHERE e.scope_id = ${SIBLING};

    INSERT INTO dimension_assessments (evaluation_id, dimension_id, confidence)
    SELECT e.id, d.id, 'medium'
    FROM evaluations e
    JOIN dimensions d ON d.rubric_version = e.rubric_version
    WHERE e.scope_id = ${SIBLING};

    INSERT INTO profile_blocks (evaluation_id, block_type, item_order, text)
    SELECT e.id, b.block_type, b.item_order, 'A test bullet.'
    FROM evaluations e,
      (VALUES ('great_fit'::block_type,1),('know_before',1),('probably_not',1)) AS b(block_type,item_order)
    WHERE e.scope_id = ${SIBLING};

    INSERT INTO evaluation_tags (evaluation_id, tag_id, display_order)
    SELECT ${SIBLING_EVALUATION}, tg.id, v.position
    FROM (VALUES ${tagValues}) AS v(key, position)
    JOIN tags tg ON tg.key = v.key;

    INSERT INTO evidence_sources (source_key, title, evidence_tier, source_category)
    SELECT v.key, 'Source ' || v.key, 'B', 'critic'
    FROM (VALUES ${linkValues}) AS v(key, position)
    ON CONFLICT (source_key) DO NOTHING;

    INSERT INTO evaluation_evidence_links (evaluation_id, evidence_source_id, display_order)
    SELECT ${SIBLING_EVALUATION}, es.id, v.position
    FROM (VALUES ${linkValues}) AS v(key, position)
    JOIN evidence_sources es ON es.source_key = v.key;

    UPDATE evaluations SET status='published', published_at=now()
     WHERE scope_id = ${SIBLING};
  `;
}

/** Stage, read the public view, then roll the whole thing back. */
async function withStagedProfile<T>(
  setup: string,
  body: (profile: ReturnType<typeof buildProfileView>) => T,
): Promise<T> {
  await db.execute(sql.raw("BEGIN"));
  try {
    await db.execute(sql.raw(`${setup}\nSET CONSTRAINTS ALL IMMEDIATE;`));
    const records = await readPublishedProfiles(RUBRIC_V1.version);
    const record = records.find((entry) => entry.scope.key === "ordering");
    if (!record) throw new Error("the staged profile did not publish");
    return body(buildProfileView(record));
  } finally {
    await db.execute(sql.raw("ROLLBACK"));
  }
}

/**
 * Deliberately NOT in vocabulary order, and NOT alphabetical. If anything in
 * the stack still derives an order, this sequence cannot survive it.
 */
const TAGS_AS_AUTHORED = ["melancholy", "linear", "horror", "puzzle-heavy"];
const SOURCES_AS_AUTHORED = ["src_zulu_order", "src_alpha_order", "src_mike_order"];

describe("What the editor put first", () => {
  it("is what the public page shows first, for tags", async () => {
    const keys = await withStagedProfile(
      stageOrderedProfile(TAGS_AS_AUTHORED, SOURCES_AS_AUTHORED),
      (profile) => profile.tags.map((tag) => tag.definition.key),
    );
    expect(keys).toEqual([...TAGS_AS_AUTHORED]);
    // The two orders the old implementation would have produced instead.
    expect(keys).not.toEqual([...keys].sort());
  });

  it("is what the public page shows first, for evidence", async () => {
    const ids = await withStagedProfile(
      stageOrderedProfile(TAGS_AS_AUTHORED, SOURCES_AS_AUTHORED),
      (profile) => profile.sources.map((source) => source.id),
    );
    expect(ids).toEqual([...SOURCES_AS_AUTHORED]);
    // Source key order is what `orderSources` used to impose.
    expect(ids).not.toEqual([...ids].sort());
  });

  it("survives being authored in the reverse order", async () => {
    const reversedTags = [...TAGS_AS_AUTHORED].reverse();
    const reversedSources = [...SOURCES_AS_AUTHORED].reverse();

    const { tags, sources } = await withStagedProfile(
      stageOrderedProfile(reversedTags, reversedSources),
      (profile) => ({
        tags: profile.tags.map((tag) => tag.definition.key),
        sources: profile.sources.map((source) => source.id),
      }),
    );

    expect(tags).toEqual(reversedTags);
    expect(sources).toEqual(reversedSources);
  });
});

describe("A published snapshot", () => {
  it("refuses to be re-sorted at all", async () => {
    // The first version of this suite tried exactly this and was refused. The
    // refusal is the guarantee: reordering a published profile is a new
    // version, not an UPDATE.
    await db.execute(sql.raw("BEGIN"));
    let refusal = "";
    try {
      await db.execute(
        sql.raw(`
          UPDATE evaluation_tags SET display_order = display_order + 100
           WHERE evaluation_id = (
             SELECT e.id FROM evaluations e
               JOIN games g ON g.id = e.game_id
              WHERE g.slug = 'alan-wake-2' AND e.status = 'published')
        `),
      );
    } catch (error) {
      // Drizzle wraps the driver error in "Failed query: …", so asserting on
      // the wrapper alone would pass for any failure at all.
      const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
      refusal = `${error instanceof Error ? error.message : String(error)} ${cause}`;
    } finally {
      await db.execute(sql.raw("ROLLBACK"));
    }

    expect(refusal).toMatch(/children of final evaluation .* are immutable/);
  });
});

describe("The backfilled column", () => {
  it("is populated for every seeded row, not left at the default", async () => {
    // A backfill that silently did nothing would leave every row at 0, and the
    // reader's tiebreaker would hide that by still producing a stable order.
    const [tags] = await db
      .select({ value: sql<number>`count(*) filter (where display_order = 0)` })
      .from(t.evaluationTags);
    const [links] = await db
      .select({ value: sql<number>`count(*) filter (where display_order = 0)` })
      .from(t.evaluationEvidenceLinks);

    expect(Number(tags?.value ?? -1)).toBe(0);
    expect(Number(links?.value ?? -1)).toBe(0);
  });

  it("numbers each evaluation from one, independently", async () => {
    const rows = await db
      .select({
        evaluationId: t.evaluationTags.evaluationId,
        lowest: sql<number>`min(display_order)`,
      })
      .from(t.evaluationTags)
      .groupBy(t.evaluationTags.evaluationId);

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(Number(row.lowest)).toBe(1);
  });

  it("preserved what the calibration corpus was already rendering", async () => {
    // The backfill's whole job: no published page changed when the readers
    // started honouring the column. Alan Wake 2's tags are in vocabulary order
    // because that is the order the old builder produced, not because anything
    // still sorts them.
    const records = await readPublishedProfiles(RUBRIC_V1.version);
    const aw2 = records.find((entry) => entry.game.slug === "alan-wake-2");
    const keys = buildProfileView(aw2!).tags.map((tag) => tag.definition.key);

    expect(keys).toEqual([
      "hub-based",
      "story-heavy",
      "environmental-storytelling",
      "cutscene-heavy",
      "exploration-heavy",
      "puzzle-heavy",
      "resource-pressure",
      "reading-dense",
      "horror",
      "sustained-tension",
      "melancholy",
      "performance-sensitive",
    ]);
  });
});
