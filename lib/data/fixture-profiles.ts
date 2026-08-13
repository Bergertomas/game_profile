import { SEED_PROFILES } from "@/content";
import type { GameWithEvaluation } from "@/lib/profile/types";
import type { RubricVersion } from "@/lib/rubric";

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
  return SEED_PROFILES.filter(
    (record) =>
      record.evaluation.status === "published" &&
      record.evaluation.rubricVersion === rubricVersion,
  ).slice();
}
