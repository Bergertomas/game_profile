import { sql } from "drizzle-orm";
import journal from "./migrations/meta/_journal.json";

/**
 * Does the database in front of us have the schema this code was written for?
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 *
 * There is one authoritative Postgres (Master Plan v0.8 §9.2), and every public
 * page is prerendered, so `next build` reads that database directly. A branch
 * that adds a migration therefore describes a schema the deployed database does
 * not have yet, and *every* build of that branch — including the Cloudflare
 * preview build — queries the live database with the new column names.
 *
 * That is not a bug to design away; it is the ordering rule that comes with a
 * single database: **apply migrations before building the code that needs
 * them.** What was a bug is how it failed. Adding `display_order` to
 * `evaluation_tags` in `0008_authored_ordering` and building against a database
 * still on `0007` produced this, two minutes into a build, from a worker
 * process:
 *
 *     Error: Failed query: select "evaluation_tags"."evaluation_id", …
 *       [cause]: column evaluation_tags.display_order does not exist
 *     Error: Failed to collect page data for /games/[slug]/opengraph-image-102te0
 *
 * Nothing in that names a migration, and the page it blames is unrelated. So
 * the read path states its precondition instead of discovering it: one query,
 * once per build, that says which migration is missing and what to run.
 *
 * ── Why the journal is the source ──────────────────────────────────────────
 *
 * Drizzle's migrator writes one `drizzle.__drizzle_migrations` row per applied
 * migration, whose `created_at` is verbatim the `when` of that migration's
 * journal entry. The join is therefore exact, needs no filesystem access in the
 * build bundle, and cannot drift: a new migration is a new journal entry, which
 * is a new expectation here, with nothing to remember to update.
 */

type JournalEntry = { when: number; tag: string };

const ENTRIES: readonly JournalEntry[] = journal.entries;

/** Every migration this checkout defines, oldest first. */
export function expectedMigrations(): readonly JournalEntry[] {
  return ENTRIES;
}

/**
 * The migrations this checkout defines that the database has not applied.
 *
 * Migrations the *database* has and this checkout does not are deliberately not
 * reported: that is a database ahead of the code, which is the normal and safe
 * half of an expand-then-deploy rollout — 0008 adds nullable-with-default
 * columns and indexes, so `main` keeps building against it unchanged.
 */
export async function missingMigrations(
  db: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> },
): Promise<string[]> {
  const rows = (await db.execute(
    sql`select created_at from drizzle.__drizzle_migrations`,
  )) as Iterable<{ created_at: unknown }>;

  const applied = new Set<number>();
  for (const row of rows) applied.add(Number(row.created_at));

  return ENTRIES.filter((entry) => !applied.has(entry.when)).map(
    (entry) => entry.tag,
  );
}

/**
 * Refuse to read a database that is behind this checkout.
 *
 * Called once, at the top of the build-time read, before any query that could
 * name a column a pending migration introduces.
 */
export async function assertSchemaIsCurrent(
  db: Parameters<typeof missingMigrations>[0],
): Promise<void> {
  let pending: string[];
  try {
    pending = await missingMigrations(db);
  } catch (cause) {
    throw new Error(
      "Could not read drizzle.__drizzle_migrations, so this database's schema " +
        "version is unknown.\n" +
        "An unmigrated database is the likeliest explanation: run " +
        "`DATABASE_URL=… npm run db:migrate` against it.",
      { cause },
    );
  }

  if (pending.length === 0) return;

  throw new Error(
    `This database is missing ${pending.length} migration(s) that this ` +
      `checkout requires: ${pending.join(", ")}.\n` +
      "Reading it would fail on whatever column or constraint they add, deep " +
      "inside page collection, blaming an unrelated route.\n" +
      "Apply them first: `DATABASE_URL=… npm run db:migrate`. Migrations go " +
      "out before the code that needs them — there is one authoritative " +
      "database and the build reads it (Master Plan v0.8 §9.2).",
  );
}
