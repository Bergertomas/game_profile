import { SEED_PROFILES } from "@/content";
import { canonicallyOrdered } from "@/lib/profile/canonical-order";
import {
  multiScopeAdditions,
  TEST_CORPUS_NAME,
  TEST_REGISTRY_CORPUS_NAME,
} from "@/content/test-corpus";
import type { GameWithEvaluation } from "@/lib/profile/types";
import type { RubricVersion } from "@/lib/rubric";
import { SITE_ENV } from "@/lib/site";

/**
 * The typed-fixture read path.
 *
 * NOT the editorial datastore. Postgres is (ADR 0017); this exists for three
 * bounded reasons:
 *
 *  1. unit tests, which must run without a database;
 *  2. controlled development harnesses (`/dev/radar-states`, the design lab);
 *  3. the parity fixture that proves the Postgres reader reproduces the
 *     approved public meaning of the calibration corpus.
 *
 * It is also the temporary compatibility path that keeps the public site
 * deployable until production Postgres is provisioned — see lib/data/games.ts,
 * which is the one place that chooses between the two.
 *
 * New editorial content must never arrive here. Once an editor can publish, a
 * fixture edit is a source-code change standing in for a database write, which
 * is exactly the arrangement Phase 2 exists to end.
 */
export function readFixtureProfiles(
  rubricVersion: RubricVersion,
): GameWithEvaluation[] {
  const published = (records: readonly GameWithEvaluation[]) =>
    records.filter(
      (record) =>
        record.evaluation.status === "published" &&
        record.evaluation.rubricVersion === rubricVersion,
    );

  /*
   * Ordered canonically on the way out.
   *
   * `evaluation_tags` and `evaluation_evidence_links` now carry an authored
   * `display_order` (migration 0008), and the Postgres reader honours it. A
   * fixture is a TypeScript array with no such column, so the two paths would
   * otherwise agree only by luck. Applying the same rule the migration used to
   * backfill keeps fixture/Postgres parity exact and keeps `buildProfileView`
   * free of an ordering opinion it should no longer hold.
   */
  return [
    ...published(SEED_PROFILES),
    ...(requestedTestCorpus() === TEST_CORPUS_NAME
      ? published(multiScopeAdditions())
      : []),
  ].map(canonicallyOrdered);
}

/**
 * Which synthetic corpus this build was asked for, if any.
 *
 * Two exist, and both exist for the same reason: a state the real corpus cannot
 * reach in a browser. `multi-scope` adds a synthetic sibling scope so the public
 * scope switcher has something to switch between. `recognized-registry` fills
 * the recognised-but-unprofiled registry, which ships empty and must, so the
 * search field's registry branch is reachable at all. Neither adds profiles and
 * scopes at the same time — one corpus, one question.
 *
 * A PRODUCTION BUILD REFUSES RATHER THAN IGNORING IT. Silently dropping the
 * variable would be the safe-looking choice and the wrong one: it makes a
 * misconfigured production build indistinguishable from a correct one, and the
 * failure it is guarding against — synthetic profiles carrying invented numbers
 * published as though they were evaluations — is precisely the kind that has to
 * be loud. `SITE_ENV` folds to a literal at build time, so this branch is not
 * even reachable in a production bundle.
 */
export function requestedTestCorpus(): string | null {
  const requested = process.env.PROFILE_TEST_CORPUS?.trim();
  if (!requested) return null;

  if (SITE_ENV === "production") {
    throw new Error(
      `PROFILE_TEST_CORPUS=${requested} is set on a production build. The test ` +
        "corpus contains synthetic profiles whose scores are not evaluations of " +
        "anything, and publishing them would put invented numbers on the public " +
        "site. Refusing. Unset it, or build a preview.",
    );
  }

  const known = [TEST_CORPUS_NAME, TEST_REGISTRY_CORPUS_NAME];
  if (!known.includes(requested)) {
    throw new Error(
      `PROFILE_TEST_CORPUS=${requested} is not a corpus this build knows. ` +
        `The values are ${known.map((name) => `"${name}"`).join(" and ")}.`,
    );
  }

  return requested;
}
