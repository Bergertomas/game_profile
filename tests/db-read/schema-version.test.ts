import { afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDatabase, getDatabase } from "@/lib/db/client";
import {
  assertSchemaIsCurrent,
  expectedMigrations,
  missingMigrations,
} from "@/lib/db/schema-version";

/**
 * The build's precondition on the database it reads.
 *
 * There is one authoritative Postgres and every public page is prerendered, so
 * `next build` queries the live database with whatever column names this
 * checkout knows. A branch that adds a migration therefore cannot build until
 * that migration is applied — an ordering rule, not a defect.
 *
 * What was a defect is how it announced itself: 0008 added `display_order`, the
 * Cloudflare build ran against a database still on 0007, and the failure was a
 * driver-level "column … does not exist" two minutes in, attributed to an
 * opengraph route that has nothing to do with tags.
 */

const db = getDatabase();
afterAll(closeDatabase);

/** Run `body` with the newest migration un-recorded, then put it back. */
async function withoutTheNewestMigration<T>(body: () => Promise<T>): Promise<T> {
  await db.execute(sql.raw("BEGIN"));
  try {
    await db.execute(
      sql.raw(
        "DELETE FROM drizzle.__drizzle_migrations WHERE created_at = " +
          "(SELECT max(created_at) FROM drizzle.__drizzle_migrations)",
      ),
    );
    return await body();
  } finally {
    await db.execute(sql.raw("ROLLBACK"));
  }
}

describe("A database that is up to date", () => {
  it("is missing nothing", async () => {
    expect(await missingMigrations(db)).toEqual([]);
  });

  it("passes the build's precondition", async () => {
    await expect(assertSchemaIsCurrent(db)).resolves.toBeUndefined();
  });
});

describe("A database behind this checkout", () => {
  it("is reported by migration name", async () => {
    const newest = expectedMigrations().at(-1)!.tag;
    const pending = await withoutTheNewestMigration(() => missingMigrations(db));
    expect(pending).toEqual([newest]);
  });

  it("refuses the build, saying which migration and what to run", async () => {
    const newest = expectedMigrations().at(-1)!.tag;
    const message = await withoutTheNewestMigration(async () =>
      assertSchemaIsCurrent(db).then(
        () => "",
        (error: unknown) => (error instanceof Error ? error.message : String(error)),
      ),
    );

    // An editor reading this in a build log needs the name and the command; a
    // bare "schema mismatch" would send them to the same place the raw driver
    // error did.
    expect(message).toContain(newest);
    expect(message).toContain("npm run db:migrate");
  });
});

describe("A database with migrations this checkout does not have", () => {
  it("is accepted, because that is the safe half of a rollout", async () => {
    // Migrations go out before the code that needs them, so the deployed site
    // routinely builds against a database that is one migration ahead. Treating
    // that as an error would make the correct ordering unusable.
    await db.execute(sql.raw("BEGIN"));
    try {
      await db.execute(
        sql.raw(
          "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) " +
            "VALUES ('a-future-migration', 9999999999999)",
        ),
      );
      expect(await missingMigrations(db)).toEqual([]);
    } finally {
      await db.execute(sql.raw("ROLLBACK"));
    }
  });
});
