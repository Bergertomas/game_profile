/**
 * Load the generated seed into the database.
 *
 *   DATABASE_URL=postgres://… npm run db:seed
 *
 * Schema first (`npm run db:migrate`), then this. The seed is data, not
 * structure, which is why it is a separate command; it is idempotent, so
 * running it repeatedly is safe.
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const client = postgres(url, { max: 1, onnotice: () => {} });

  try {
    // The file carries its own BEGIN/COMMIT and contains many statements, so it
    // goes through the simple query protocol in one shot.
    await client.unsafe(readFileSync("lib/db/seed.sql", "utf8"));
    console.log("Seed applied.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
