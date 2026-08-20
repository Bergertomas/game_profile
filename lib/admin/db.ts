import { getCloudflareContext } from "@opennextjs/cloudflare";
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
 * Production reaches Postgres through the Worker's HYPERDRIVE binding. Local
 * `next dev` retains the direct ADMIN_DATABASE_URL path so editorial work does
 * not depend on a Cloudflare runtime. The direct path is also a temporary
 * deployment fallback while the Hyperdrive cutover is being verified.
 *
 * ── No Worker-side pool, by construction ───────────────────────────────────
 *
 * Master Plan §9.4 rules out a request-time connection pool inside the Worker,
 * and a module-scoped client kept alive between requests is a pool of one
 * however it is described. So every call creates a client and closes it in
 * `finally`. Hyperdrive owns its own managed connection pool outside the Worker.
 *
 * `max: 1` is deliberate: editorial requests do not need concurrent database
 * connections, and it keeps transaction behaviour deterministic.
 */

export type AdminDatabase = ReturnType<typeof drizzle<typeof schema>>;

/** The handle inside `withAdminTransaction`. Same query surface, one COMMIT. */
export type AdminTransaction = Parameters<
  Parameters<AdminDatabase["transaction"]>[0]
>[0];

export type AdminDatabaseConnection = {
  readonly url: string;
  readonly viaHyperdrive: boolean;
};

/**
 * Resolve the request-time connection without ever exposing credentials.
 *
 * Local development deliberately prefers ADMIN_DATABASE_URL. A production
 * Worker prefers Hyperdrive when the binding exists, then falls back to the
 * direct URL only during the cutover window. `getCloudflareContext()` throws
 * outside the Workers/OpenNext runtime, so the lookup is intentionally guarded.
 */
function adminDatabaseConnection(): AdminDatabaseConnection | null {
  const directUrl = adminDatabaseUrl();

  if (process.env.NODE_ENV === "development" && directUrl) {
    return { url: directUrl, viaHyperdrive: false };
  }

  try {
    const env = getCloudflareContext().env as unknown as {
      HYPERDRIVE?: { connectionString?: string };
    };
    const hyperdriveUrl = env.HYPERDRIVE?.connectionString?.trim();
    if (hyperdriveUrl) {
      return { url: hyperdriveUrl, viaHyperdrive: true };
    }
  } catch {
    // Node tests and local tools do not necessarily have a Cloudflare context.
  }

  return directUrl ? { url: directUrl, viaHyperdrive: false } : null;
}

/**
 * TLS for the direct connection, verified rather than merely encrypted.
 *
 * ── What `ssl: "require"` actually did ─────────────────────────────────────
 *
 * Read from the installed driver rather than from memory. postgres.js 3.4.9,
 * `src/connection.js`:
 *
 *     if (ssl === 'require' || ssl === 'allow' || ssl === 'prefer')
 *       options.rejectUnauthorized = false
 *     else if (typeof ssl === 'object')
 *       Object.assign(options, ssl)
 *
 * So `"require"` negotiates TLS and then explicitly turns certificate
 * verification OFF. It means "encrypt this", not "check who I am talking to" —
 * the same distinction `sslmode=require` carries in libpq — and an encrypted
 * channel to an unverified peer is exactly what a network attacker in the path
 * would like the editorial database connection to use.
 *
 * `"verify-full"` is NOT the fix here. In 3.4.9 that string matches neither
 * branch above, so it falls through to Node's `tls.connect` defaults and
 * happens to verify. Relying on a value the driver does not parse is relying on
 * an accident. The object form is the supported one, so that is what is used.
 *
 * ── Local development ──────────────────────────────────────────────────────
 *
 * Verification is the default and is never silently dropped. A developer
 * pointing at a local Postgres that speaks no TLS says so in the connection
 * string, with the standard libpq spelling — `?sslmode=disable` — which
 * postgres.js already understands and which this respects by declining to
 * override it. Anything else, including every remote database, verifies.
 *
 * Hyperdrive is untouched: it terminates the Worker-side transport itself and
 * owns the credentials, so the Worker passes no TLS options at all (ADR 0021).
 */
export function directTlsOptions(
  connection: AdminDatabaseConnection,
): { ssl?: { rejectUnauthorized: true } } {
  if (connection.viaHyperdrive) return {};

  // Passing `ssl` explicitly would override whatever the URL asked for, because
  // postgres.js prefers an explicit option over a parsed `sslmode`. So an
  // explicit opt-out in the URL is honoured by NOT passing one.
  if (/[?&]sslmode=disable(&|$)/.test(connection.url)) return {};

  return { ssl: { rejectUnauthorized: true } };
}

/**
 * Run one unit of editorial work against Postgres, **for a verified editor**.
 *
 * THIS IS THE ONE TO USE FROM A PAGE OR AN ACTION. The unauthorised
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
  const connection = adminDatabaseConnection();
  if (!connection) {
    throw new Error(
      "No editorial database connection is configured. Set ADMIN_DATABASE_URL " +
        "for local development or bind HYPERDRIVE for a deployed Worker. See " +
        "docs/decisions/0018-admin-access.md.",
    );
  }

  const client = postgres(connection.url, {
    max: 1,
    ...directTlsOptions(connection),
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
      transport: connection.viaHyperdrive ? "hyperdrive" : "direct",
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
