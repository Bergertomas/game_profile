/**
 * Emit seed SQL for the current fixture corpus.
 *
 *   npm run db:seed-sql > lib/db/seed.sql
 *
 * The generator itself lives in lib/db/build-seed.ts so it can be unit-tested
 * over synthetic corpora. `tests/seed-sql.test.ts` asserts that the committed
 * lib/db/seed.sql is byte-identical to this output.
 */
import { SEED_PROFILES } from "@/content";
import { buildSeedSql } from "@/lib/db/build-seed";

process.stdout.write(buildSeedSql(SEED_PROFILES));
