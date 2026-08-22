import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";
import * as t from "@/lib/db/schema";
import {
  dispatchDeployment,
  settleDeploymentRequest,
  verifyProduction,
} from "@/lib/admin/deployments";
import type { CloudflareTransport } from "@/lib/deploy/cloudflare";
import {
  MANIFEST_SCHEMA_ID,
  digestEntries,
  type DeploymentManifest,
} from "@/lib/deploy/manifest";
import type { VerifyTransport } from "@/lib/deploy/verify";

/**
 * The two places deployment state is decided by a read that is not the write.
 *
 * ── Why this file has its own database ─────────────────────────────────────
 *
 * Every other deployment test runs inside a transaction it rolls back, because
 * the audit tables refuse DELETE by trigger. That model cannot express either
 * test here at all: two connections racing must be two *committed*
 * transactions, or neither can see the other's work and the race being tested
 * does not happen.
 *
 * So this creates a database of its own, migrates it, races, and drops it. The
 * shared corpus is never touched, and the sibling suite's standing "did this
 * commit anything" guard stays true.
 *
 * ── What is being proved ───────────────────────────────────────────────────
 *
 * Both defects are the same shape — a decision made from a read, and a write
 * that assumes the read still holds — and both were found only by putting two
 * connections against one row:
 *
 *   claiming a request   "is a build already open, and if not, claim one" was a
 *                        read followed by a write. Two editors pressing Request
 *                        at the same moment arrive on two connections; both read
 *                        zero open requests, both insert, and one corpus gets two
 *                        production builds. A transaction alone does not close it
 *                        — these are inserts, so there is no row to contend on.
 *                        `dispatchDeployment` therefore takes an advisory
 *                        transaction lock across the check and the claim, and
 *                        commits it before it calls Cloudflare.
 *
 *   settling a request   `settleDeploymentRequest` read the state, then wrote
 *                        `superseded` using only the request id. A concurrent
 *                        `verifyProduction` resolving the same request to
 *                        `build_reported_success` in between meant settlement
 *                        overwrote an outcome the provider was observed to
 *                        produce, and appended an immutable event naming a prior
 *                        state the row had already left. It now decides under
 *                        `FOR UPDATE`, and the update carries the condition.
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

/**
 * An empty slate for each race, so every test states its own starting position.
 *
 * TRUNCATE and not DELETE, because the append-only triggers refuse DELETE — and
 * TRUNCATE is a statement-level operation none of them fire on. This suite owns
 * the database it created and therefore holds that privilege. The deployed
 * application role deliberately does not: withholding TRUNCATE from
 * `should_i_play_admin` is what makes the audit trail immutable against the
 * application, and it is the reason a test cannot clean up this way anywhere
 * else (ADR 0022 §F).
 */
async function reset(): Promise<void> {
  const client = postgres(raceUrl, { max: 1, onnotice: () => {} });
  try {
    await client.unsafe(
      `TRUNCATE deployment_artifact_evaluations, deployment_artifacts,
                deployment_events, deployment_requests`,
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

beforeEach(reset);

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

function accepting(buildId: string): CloudflareTransport {
  return {
    fetch: async () =>
      new Response(JSON.stringify({ result: { build_uuid: buildId } }), {
        status: 200,
      }),
  };
}

type HumanReason = "manual" | "retry";

async function race(
  first: HumanReason,
  second: HumanReason,
): Promise<{ kinds: string[]; requests: number }> {
  const a = postgres(raceUrl, { max: 1, onnotice: () => {} });
  const b = postgres(raceUrl, { max: 1, onnotice: () => {} });
  try {
    // Warm both connections, so neither racer pays a startup cost the other
    // does not and the two arrive at the claim together.
    await Promise.all([a`select 1`, b`select 1`]);

    const results = await Promise.all([
      dispatchDeployment(drizzle(a, { schema }), {
        reason: first,
        actor: "one@example.com",
        transport: acceptingSlowly("build-a"),
        env: CONFIGURED,
      }),
      dispatchDeployment(drizzle(b, { schema }), {
        reason: second,
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
  /**
   * Each pair starts from an empty table, so what is being tested is two
   * dispatchers racing each other for the claim — not one of them being turned
   * away by a request some earlier test left open, which is a different
   * property and is covered where the guard itself is tested.
   */
  for (const [first, second] of [
    ["manual", "manual"],
    ["retry", "retry"],
    ["manual", "retry"],
  ] as [HumanReason, HumanReason][]) {
    it(`creates one request for ${first} against ${second}`, async () => {
      const { kinds, requests } = await race(first, second);

      expect(requests).toBe(1);
      expect(kinds).toEqual(["coalesced", "dispatched"]);
    });
  }

  it("still refuses a later request while the one it created is open", async () => {
    const { requests } = await race("manual", "manual");
    expect(requests).toBe(1);

    const client = postgres(raceUrl, { max: 1, onnotice: () => {} });
    try {
      const later = await dispatchDeployment(drizzle(client, { schema }), {
        reason: "retry",
        actor: "three@example.com",
        transport: accepting("build-c"),
        env: CONFIGURED,
      });
      expect(later.kind).toBe("coalesced");

      const rows = await drizzle(client, { schema })
        .select()
        .from(t.deploymentRequests);
      expect(rows).toHaveLength(1);
    } finally {
      await client.end({ timeout: 5 });
    }
  });
});

/**
 * Settlement decides under a lock, so it cannot overwrite what it did not see.
 *
 * ── The window, exactly ────────────────────────────────────────────────────
 *
 * `settleDeploymentRequest` reads the request, finds it open, and writes
 * `superseded`. Those are two statements. Between them, `verifyProduction` on
 * another connection can resolve the very same request to
 * `build_reported_success` — it does that the moment a production manifest
 * names its build uuid. Before the fix the settlement wrote anyway, replacing an
 * observed provider outcome with a human judgement and appending an immutable
 * event that named `dispatched` as the state it replaced, which by then was
 * false.
 *
 * ── Why this is deterministic and not a sleep-and-hope ─────────────────────
 *
 * The verifier holds its transaction open while the settler runs. That gives
 * three facts rather than a hope about scheduling:
 *
 *   1. the settler's first read sees `dispatched`, because the verifier has not
 *      committed and READ COMMITTED cannot see it;
 *   2. the settler then blocks, because `FOR UPDATE` conflicts with the row lock
 *      the verifier's own UPDATE is holding — waited for explicitly below, not
 *      slept through;
 *   3. when the verifier commits, the settler resumes and re-evaluates against
 *      the newly committed row, which is the whole point of taking the lock.
 *
 * `verifyProduction` is the real one, running against a transaction handle, so
 * what it does to the request is what it does in production.
 */
describe("Settling a request another connection has already resolved", () => {
  async function manifestNaming(buildUuid: string): Promise<DeploymentManifest> {
    return {
      schema: MANIFEST_SCHEMA_ID,
      generatedAt: "2026-08-19T10:00:00.000Z",
      siteEnv: "production",
      buildUuid,
      commitSha: "abc123",
      branch: "main",
      source: "database",
      rubricVersion: "1.0",
      digest: await digestEntries([]),
      entries: [],
    };
  }

  function serving(manifest: DeploymentManifest): VerifyTransport {
    return {
      fetch: async () => new Response(JSON.stringify(manifest), { status: 200 }),
    };
  }

  /**
   * Wait until some backend on this database is genuinely blocked on a lock.
   *
   * Reports rather than throws, so that a settler which did NOT block produces
   * the failure that matters — an overwritten terminal state — instead of a
   * complaint about this helper.
   */
  async function waitForALockWait(sql: postgres.Sql): Promise<boolean> {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const [row] = await sql<{ waiting: string }[]>`
        SELECT count(*)::text AS waiting
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND wait_event_type = 'Lock'
          AND state = 'active'
      `;
      if (row && row.waiting !== "0") return true;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return false;
  }

  it("refuses, keeps the observed outcome, and appends no settlement", async () => {
    const settler = postgres(raceUrl, { max: 1, onnotice: () => {} });
    const verifier = postgres(raceUrl, { max: 1, onnotice: () => {} });
    const watcher = postgres(raceUrl, { max: 1, onnotice: () => {} });

    try {
      await Promise.all([settler`select 1`, verifier`select 1`, watcher`select 1`]);

      const dispatched = await dispatchDeployment(drizzle(settler, { schema }), {
        reason: "manual",
        actor: "one@example.com",
        transport: accepting("build-q"),
        env: CONFIGURED,
      });
      expect(dispatched.kind).toBe("dispatched");
      const requestId =
        dispatched.kind === "dispatched" ? dispatched.requestId : "";

      // The verifier observes production serving build-q and resolves the
      // request, then holds its transaction open. `resolved` fires once that
      // has happened, so the settler below cannot start early and take the row
      // lock first — which would be a different scenario, and a passing one.
      let release!: () => void;
      const held = new Promise<void>((resolve) => (release = resolve));
      let observed!: () => void;
      const resolved = new Promise<void>((resolve) => (observed = resolve));

      const verifying = drizzle(verifier, { schema }).transaction(async (tx) => {
        const check = await verifyProduction(tx, {
          transport: serving(await manifestNaming("build-q")),
          actor: "verifier@example.com",
        });
        if (check.kind !== "verified") {
          throw new Error(`verification did not run: ${check.kind}`);
        }
        observed();
        await held;
      });

      let outcome: unknown;
      let blocked = false;
      try {
        // If the verifier fails instead, surface that rather than hanging here.
        await Promise.race([resolved, verifying]);

        // Settlement starts while that is uncommitted: its first read sees
        // `dispatched`, and it then blocks taking the row lock.
        const settling = settleDeploymentRequest(
          drizzle(settler, { schema }),
          requestId,
          "one@example.com",
        ).then(
          () => "settled" as const,
          (error: unknown) => error,
        );

        blocked = await waitForALockWait(watcher);
        release();
        outcome = await settling;
      } finally {
        release();
      }
      await verifying;

      // The provider-observed outcome stands, unrewritten. This is the
      // assertion the fix exists for: without it, `superseded` lands here.
      const [request] = await drizzle(settler, { schema })
        .select()
        .from(t.deploymentRequests)
        .where(eq(t.deploymentRequests.id, requestId));
      expect(request!.state).toBe("build_reported_success");

      // And nothing claimed a person settled it.
      const events = await drizzle(settler, { schema })
        .select()
        .from(t.deploymentEvents);
      const settlements = events.filter(
        (event) =>
          (event.detail as Record<string, unknown> | null)?.resolution ===
          "settled_by_operator",
      );
      expect(settlements).toEqual([]);

      // The editor is told what happened, rather than the call quietly winning.
      expect(outcome).not.toBe("settled");
      expect((outcome as Error).message).toMatch(
        /resolved while you were looking at it/,
      );

      // And the window really was the one described: the settler waited.
      expect(blocked).toBe(true);
    } finally {
      await settler.end({ timeout: 5 });
      await verifier.end({ timeout: 5 });
      await watcher.end({ timeout: 5 });
    }
  }, 60_000);
});
