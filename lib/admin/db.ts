import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { adminDatabaseUrl } from "@/lib/admin/auth";
import { requireEditor } from "@/lib/admin/guard";
import * as schema from "@/lib/db/schema";

/**
 * The editorial tool's request-time database access.
 *
 * A separate module from `lib/db/client.ts`, and the separation is the point.
 * That one is the public read path: it runs during `next build`, memoises a
 * process-wide connection, and is deliberately never reached from the Worker.
 * This one runs while an editor is waiting, and must therefore hold nothing
 * across requests.
 *
 * ── No pool, by construction ────────────────────────────────────────────────
 *
 * Master Plan §9.4 rules out a request-time connection pool, and a
 * module-scoped client kept alive between requests is a pool of one however it
 * is described. So every call opens a connection and closes it in `finally`.
 *
 * That is a real cost — a TCP and TLS handshake per editorial request — and it
 * is the right trade at this size. The editorial team is a handful of people
 * making a handful of writes a day (§8.2); the alternative buys latency nobody
 * is measuring in exchange for the one thing the architecture says not to
 * introduce. If editorial volume ever makes this inadequate, that is a measured
 * decision with an ADR, not a default that crept in.
 *
 * `max: 1` on top of that is not pooling either: it is what makes a transaction
 * safe, since postgres.js rejects a bare `BEGIN` on a pooled client whose next
 * query may land on a different connection.
 */

export type AdminDatabase = ReturnType<typeof drizzle<typeof schema>>;

/** The handle inside `withAdminTransaction`. Same query surface, one COMMIT. */
export type AdminTransaction = Parameters<
  Parameters<AdminDatabase["transaction"]>[0]
>[0];

/**
 * Run one unit of editorial work against Postgres, **for a verified editor**.
 *
 * THIS IS THE ONE TO USE FROM A page OR an action. The unauthorised
 * `withAdminDatabase` below opens a connection to a database full of
 * unpublished drafts, superseded history and uncleared artwork; it exists for
 * tests and for internal composition, and reaching for it from a route is how
 * that data escapes a missing guard.
 *
 * Authorisation happens here, next to the data, rather than only in the parent
 * layout — see the reasoning on `requireEditor`. The check is memoised per
 * request, so several guarded reads on one page verify once.
 */
export async function withAuthorizedAdminDatabase<T>(
  run: (db: AdminDatabase) => Promise<T>,
): Promise<T> {
  await requireEditor();
  return withAdminDatabase(run);
}

/**
 * Run one unit of editorial work against Postgres.
 *
 * UNAUTHORISED. Callers are responsible for having established that the request
 * may see editorial data; prefer `withAuthorizedAdminDatabase`.
 *
 * The connection does not outlive the callback. Nothing may retain the handed
 * `db` — it is closed by the time this resolves.
 */
export async function withAdminDatabase<T>(
  run: (db: AdminDatabase) => Promise<T>,
): Promise<T> {
  const url = adminDatabaseUrl();
  if (!url) {
    throw new Error(
      "ADMIN_DATABASE_URL is not set. The editorial tool has no request-time " +
        "database in this deployment, which is the default — see " +
        "docs/decisions/0018-admin-access.md. `adminAvailability()` should have " +
        "refused this request before it reached a query.",
    );
  }

  const client = postgres(url, {
    max: 1,
    // Short, because the connection is closed explicitly anyway; this only
    // bounds a socket left behind by an error path.
    idle_timeout: 5,
    // The same reason as the public reader: `published_at` is a timestamptz
    // holding what the product means as a plain date, and a session in another
    // zone renders it a day out.
    connection: { TimeZone: "UTC" },
    onnotice: () => {},
  });

  try {
    return await run(drizzle(client, { schema }));
  } catch (error) {
    const cause =
      error instanceof Error && "cause" in error
        ? (error as Error & { cause?: unknown }).cause
        : undefined;

    console.error("[admin-db] request-time database failure", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      cause:
        cause instanceof Error
          ? {
              name: cause.name,
              message: cause.message,
              code:
                "code" in cause
                  ? (cause as Error & { code?: unknown }).code
                  : undefined,
            }
          : cause,
    });

    throw error;
  } finally {
    await client.end({ timeout: 5 });
  }
}

/**
 * Run one unit of editorial work inside a transaction.
 *
 * Every multi-table write in the editor goes through this. The database's own
 * invariants — one primary scope per game, a primary published under each
 * rubric its siblings publish under (ADR 0016) — are enforced by deferred
 * constraint triggers, which fire at COMMIT. Outside a transaction they would
 * fire per statement, and a legitimate two-step edit (make B primary, then make
 * A not primary) would be rejected halfway through for a state the editor was
 * in the middle of leaving.
 */
export async function withAdminTransaction<T>(
  run: (tx: AdminTransaction) => Promise<T>,
): Promise<T> {
  // Authorised, like every read entrypoint. Each Server Action also calls
  // `requireEditor()` itself before it validates input — belt and braces that
  // costs nothing, because the check is memoised for the request.
  return withAuthorizedAdminDatabase((db) => db.transaction((tx) => run(tx)));
}
