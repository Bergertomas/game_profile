import { SEED_PROFILES } from "@/content";
import { multiScopeAdditions, TEST_CORPUS_NAME } from "@/content/test-corpus";
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

  return [
    ...published(SEED_PROFILES),
    ...(testCorpusRequested() ? published(multiScopeAdditions()) : []),
  ];
}

/**
 * Whether this build was asked for the synthetic multi-scope corpus.
 *
 * Every seeded game has one evaluated experience, so the public scope switcher
 * has no way to be exercised in a browser against the real corpus. `PROFILE_
 * TEST_CORPUS=multi-scope` adds a synthetic sibling scope (content/test-corpus.ts)
 * for the Playwright project that proves it.
 *
 * A PRODUCTION BUILD REFUSES RATHER THAN IGNORING IT. Silently dropping the
 * variable would be the safe-looking choice and the wrong one: it makes a
 * misconfigured production build indistinguishable from a correct one, and the
 * failure it is guarding against — synthetic profiles carrying invented numbers
 * published as though they were evaluations — is precisely the kind that has to
 * be loud. `SITE_ENV` folds to a literal at build time, so this branch is not
 * even reachable in a production bundle.
 */
function testCorpusRequested(): boolean {
  const requested = process.env.PROFILE_TEST_CORPUS?.trim();
  if (!requested) return false;

  if (SITE_ENV === "production") {
    throw new Error(
      `PROFILE_TEST_CORPUS=${requested} is set on a production build. The test ` +
        "corpus contains synthetic profiles whose scores are not evaluations of " +
        "anything, and publishing them would put invented numbers on the public " +
        "site. Refusing. Unset it, or build a preview.",
    );
  }

  if (requested !== TEST_CORPUS_NAME) {
    throw new Error(
      `PROFILE_TEST_CORPUS=${requested} is not a corpus this build knows. ` +
        `The only value is "${TEST_CORPUS_NAME}".`,
    );
  }

  return true;
}
