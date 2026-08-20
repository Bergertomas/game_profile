import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";
import * as t from "@/lib/db/schema";
import { dispatchDeployment } from "@/lib/admin/deployments";
import type { CloudflareTransport } from "@/lib/deploy/cloudflare";

/**
 * The active-request guard, under genuine concurrency.
 *
 * ── Why this file has its own database ─────────────────────────────────────
 *
 * Every other deployment test runs inside a transaction it rolls back, because
 * the audit tables refuse DELETE by trigger. That model cannot express this
 * test at all: two dispatchers racing must be two *committed* transactions on
 * two connections, or neither can see the other's row and the race being tested
 * does not happen.
 *
 * So this creates a database of its own, migrates it, races, and drops it. The
 * shared corpus is never touched, and the sibling suite's standing "did this
 * commit anything" guard stays true.
 *
 * ── What is being proved ───────────────────────────────────────────────────
 *
 * "Is a build already open, and if not, claim one" is a read followed by a
 * write. Two editors pressing Request at the same moment arrive on two
 * connections; both read zero open requests, both insert, and one corpus gets
 * two production builds. A transaction alone does not close it — these are
 * inserts, so there is no row to contend on and READ COMMITTED lets both
 * through. `dispatchDeployment` therefore takes an advisory transaction lock
 * across the check and the claim, and commits it before it calls Cloudflare.
 */

const URL = process.env.DATABASE_URL;
if (!URL) throw new Error("DATABASE_URL is required for the db-read suite.");

const base = URL.split("?")[0]!;
const query = URL.includes("?") ? `?${URL.slice(URL.indexOf("?") + 1)}` : "";
const sourceName = base.slice(base.lastIndexOf("/") + 1);
const raceName = `${sourceName}_concurrency_ci`;
const adminUrl = `${base.slice(0, base.lastIndexOf("/"))}/postgres${query}`;
const raceUrl = `${base.slice(0, base.lastIndexOf("/"))}/${raceName}${query}`;

if (!/^[A-Za-z0-9_]+$/.test(raceName) || raceName.length > 63) {
  throw new Error(`Refusing to create database "${raceName}".`);
}

async function withAdmin(run: (sql: postgres.Sql) => Promise<void>): Promise<void> {
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  try {
    await run(admin);
  } finally {
    await admin.end({ timeout: 5 });
  }
}

beforeAll(async () => {
  await withAdmin(async (admin) => {
    await admin.unsafe(`DROP DATABASE IF EXISTS "${raceName}" WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE "${raceName}"`);
  });

  const client = postgres(raceUrl, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: "lib/db/migrations" });
  } finally {
    await client.end({ timeout: 5 });
  }
}, 120_000);

afterAll(async () => {
  await withAdmin(async (admin) => {
    await admin.unsafe(`DROP DATABASE IF EXISTS "${raceName}" WITH (FORCE)`);
  });
}, 60_000);

const CONFIGURED = {
  CLOUDFLARE_API_TOKEN: "test-token-0123456789abcdef",
  CLOUDFLARE_ACCOUNT_ID: "account",
  CLOUDFLARE_BUILDS_TRIGGER_ID: "trigger",
} as const;

/** Accepts, after a beat — so both racers are inside the claim at once. */
function acceptingSlowly(buildId: string): CloudflareTransport {
  return {
    fetch: async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      return new Response(JSON.stringify({ result: { build_uuid: buildId } }), {
        status: 200,
      });
    },
  };
}

async function race(
  reason: "manual" | "retry",
): Promise<{ kinds: string[]; requests: number }> {
  const a = postgres(raceUrl, { max: 1, onnotice: () => {} });
  const b = postgres(raceUrl, { max: 1, onnotice: () => {} });
  try {
    const results = await Promise.all([
      dispatchDeployment(drizzle(a, { schema }), {
        reason,
        actor: "one@example.com",
        transport: acceptingSlowly("build-a"),
        env: CONFIGURED,
      }),
      dispatchDeployment(drizzle(b, { schema }), {
        reason,
        actor: "two@example.com",
        transport: acceptingSlowly("build-b"),
        env: CONFIGURED,
      }),
    ]);
    const rows = await drizzle(a, { schema })
      .select()
      .from(t.deploymentRequests);
    return {
      kinds: results.map((result) => result.kind).sort(),
      requests: rows.length,
    };
  } finally {
    await a.end({ timeout: 5 });
    await b.end({ timeout: 5 });
  }
}

describe("Two editors pressing Request at the same moment", () => {
  it("creates one request, and tells the loser one is already open", async () => {
    const { kinds, requests } = await race("manual");

    expect(requests).toBe(1);
    expect(kinds).toEqual(["coalesced", "dispatched"]);
  });

  it("holds for retry as well, against the request the race just created", async () => {
    // The previous test left one `dispatched` request behind, so both racers
    // here should be refused by the guard rather than by each other.
    const { kinds, requests } = await race("retry");

    expect(requests).toBe(1);
    expect(kinds).toEqual(["coalesced", "coalesced"]);
  });
});
