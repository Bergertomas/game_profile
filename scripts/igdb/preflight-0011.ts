/**
 * `npm run igdb:preflight` — READ-ONLY preflight for rolling out migration
 * `0011_igdb_staging` to a database, run before `npm run db:migrate`.
 *
 *   DATABASE_URL=postgres://… npm run igdb:preflight
 *
 * 0011 adds `game_external_ids_provider_external_unique` on
 * `game_external_ids (provider, external_id)`. If the target database already
 * holds two games with one provider identity, the DDL would fail mid-rollout;
 * this reports such duplicates first, along with whether 0011 is already
 * recorded and whether any `igdb_*` table already exists. It issues SELECTs
 * only and changes nothing. Applying the migration itself remains a separate,
 * explicitly authorized step (Working Agreement §4).
 */
import postgres from "postgres";
import journal from "../../lib/db/migrations/meta/_journal.json";

interface DuplicateRow {
  readonly provider: string;
  readonly external_id: string;
  readonly games: number;
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const entry = journal.entries.find((e) => e.tag === "0011_igdb_staging");
  if (!entry) {
    console.error("The journal does not define 0011_igdb_staging.");
    process.exit(1);
  }
  const sql = postgres(url, { max: 1, onnotice: () => {}, connection: { TimeZone: "UTC" } });
  try {
    await sql`SET TRANSACTION READ ONLY`.catch(() => undefined);
    await sql`SET default_transaction_read_only = on`;

    const applied = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations WHERE created_at = ${entry.when}`;
    const igdbTables = await sql<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'igdb\\_%' ORDER BY tablename`;
    const duplicates = await sql<DuplicateRow[]>`
      SELECT provider, external_id, count(*)::int AS games
      FROM game_external_ids
      GROUP BY provider, external_id
      HAVING count(*) > 1
      ORDER BY provider, external_id`;
    const rows = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM game_external_ids`;

    const alreadyApplied = (applied[0]?.n ?? 0) > 0;
    console.log("Migration 0011 preflight (read-only)\n");
    console.log(`  0011 recorded as applied     ${alreadyApplied ? "yes" : "no"}`);
    console.log(`  igdb_* tables present        ${igdbTables.length ? igdbTables.map((t) => t.tablename).join(", ") : "none"}`);
    console.log(`  game_external_ids rows       ${rows[0]?.n ?? 0}`);
    console.log(`  duplicate provider identities ${duplicates.length}`);
    for (const d of duplicates) console.log(`    ${d.provider} ${d.external_id} → ${d.games} games`);
    console.log();
    if (duplicates.length > 0) {
      console.log("  BLOCKED: resolve the duplicates above before applying 0011; the unique index would fail.");
      process.exitCode = 1;
    } else if (alreadyApplied) {
      console.log("  Nothing to do: 0011 is already applied here.");
    } else if (igdbTables.length > 0) {
      console.log("  CAUTION: igdb_* tables exist but 0011 is not recorded; investigate before migrating.");
      process.exitCode = 1;
    } else {
      console.log("  READY: no duplicates; 0011 can be applied with `npm run db:migrate` once authorized.");
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
