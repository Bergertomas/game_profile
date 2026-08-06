/**
 * Apply all pending migrations.
 *
 *   DATABASE_URL=postgres://… npm run db:migrate
 *
 * This is the canonical, and only, database setup path. Starting from an empty
 * database it produces the fully constrained schema: `0000_schema.sql` creates
 * the tables, `0001_contract.sql` installs the checks, indexes, triggers and the
 * `dimension_scores` view. Drizzle runs every pending migration inside one
 * transaction, so the schema is never left half-built.
 *
 * There is deliberately no second command to remember. The contract SQL used to
 * live outside the migration path, which meant a migration-only deploy produced
 * a schema that silently accepted incomplete published evaluations.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  // max: 1 — migrations must run on a single connection so the transaction and
  // its DDL locks stay coherent.
  const client = postgres(url, { max: 1, onnotice: () => {} });

  try {
    await migrate(drizzle(client), { migrationsFolder: "lib/db/migrations" });
    console.log("Migrations applied.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
