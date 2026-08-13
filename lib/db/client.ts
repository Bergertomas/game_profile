import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * The Postgres connection used by the public read path.
 *
 * WHEN THIS RUNS. Every public route is prerendered, so these queries execute
 * during `next build` and not in the Cloudflare Worker. That is why there is no
 * Hyperdrive binding, no pooling strategy and no runtime credential here: the
 * database is a *build* dependency. Moving `/games/*` to request-time rendering
 * later would change that, and this module is where it would change — nothing
 * above the data-access boundary knows a connection exists.
 *
 * `TimeZone: "UTC"` is not decoration. `evaluations.published_at` is a
 * timestamptz holding what the product means as a plain date, and the public
 * page and sitemap render it as one. Read through a session in, say, Asia/Tokyo,
 * midnight UTC on the 6th formats as the 5th — a published date silently one
 * day early. Pinning the session removes the ambiguity at both ends, since
 * scripts/seed.ts and scripts/migrate.ts pin it too.
 *
 * `idle_timeout` matters for a different reason: an open socket keeps the Node
 * event loop alive, and a build that never exits is indistinguishable from one
 * that hung.
 */

let client: ReturnType<typeof postgres> | null = null;
let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Session settings every connection to this database must share.
 *
 * `max: 1` because the read path is one sequential pass over the published
 * corpus at build time, where a pool buys nothing — and because a pool makes
 * transaction control unsafe by construction: postgres.js rejects a bare
 * `BEGIN` on a pooled client, since the next query may land on a different
 * connection. A single connection lets the database-backed tests wrap their
 * fixtures in a transaction they roll back, which is the only way to exercise
 * a *published* row given that the immutability triggers make one
 * un-deletable.
 */
export const CONNECTION_OPTIONS = {
  max: 1,
  idle_timeout: 10,
  connection: { TimeZone: "UTC" },
} as const;

/**
 * Whether a database is configured for this process.
 *
 * The single switch between the Postgres reader and the fixture reader — see
 * lib/data/games.ts. Presence of `DATABASE_URL` is the signal because it is
 * already the convention every db script in this repository uses.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabase() {
  if (database) return database;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. The Postgres reader cannot run without it; " +
        "lib/data/games.ts should have selected the fixture reader instead.",
    );
  }

  client = postgres(url, { ...CONNECTION_OPTIONS, onnotice: () => {} });
  database = drizzle(client, { schema });
  return database;
}

/**
 * Close the connection.
 *
 * Only needed by tests, which run many reads in one process and should not
 * leave sockets holding the runner open. A build exits on its own once
 * `idle_timeout` has closed the pool.
 */
export async function closeDatabase(): Promise<void> {
  if (client) await client.end({ timeout: 5 });
  client = null;
  database = null;
}
