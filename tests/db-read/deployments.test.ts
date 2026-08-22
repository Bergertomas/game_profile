import { afterAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";
import * as t from "@/lib/db/schema";
import type { AdminTransaction } from "@/lib/admin/db";
import {
  dispatchDeployment,
  settleDeploymentRequest,
  evaluationDeploymentStatus,
  readDeploymentOverview,
  readLiveProof,
  refreshBuildStatuses,
  verifyProduction,
  type DeploymentStore,
} from "@/lib/admin/deployments";
import type { CloudflareTransport } from "@/lib/deploy/cloudflare";
import {
  MANIFEST_SCHEMA_ID,
  digestEntries,
  type DeploymentManifest,
  type ManifestEntry,
} from "@/lib/deploy/manifest";
import type { VerifyTransport } from "@/lib/deploy/verify";

/**
 * Deployment tracking against real Postgres.
 *
 * ── Nothing commits ────────────────────────────────────────────────────────
 *
 * Every test runs inside a transaction that is rolled back, and that is not
 * tidiness — it is forced. `deployment_events`, `deployment_artifacts` and
 * `deployment_artifact_evaluations` refuse DELETE by trigger, so a test that
 * committed could not clean up after itself by any means, and the next run
 * would derive Live from the previous run's fixtures.
 *
 * The `afterAll` guard is the standing check that this stayed true. Phase 2D-1
 * learned it the hard way: a concurrency test that committed corrupted the
 * shared corpus, and the damage surfaced as failures in later, unrelated files
 * pointing nowhere near the cause.
 *
 * ── No test reaches Cloudflare or the internet ─────────────────────────────
 *
 * Both transports are stubs built here. The production modules take theirs as
 * required arguments with no default, so this cannot be got wrong by omission.
 */

const URL = process.env.DATABASE_URL;
if (!URL) throw new Error("DATABASE_URL is required for the db-read suite.");

const client = postgres(URL, { max: 1, onnotice: () => {} });
const db = drizzle(client, { schema });

afterAll(async () => {
  try {
    const [counts] = await client<
      { requests: string; events: string; artifacts: string }[]
    >`
      SELECT
        (SELECT count(*) FROM deployment_requests)  AS requests,
        (SELECT count(*) FROM deployment_events)    AS events,
        (SELECT count(*) FROM deployment_artifacts) AS artifacts
    `;
    if (
      counts!.requests !== "0" ||
      counts!.events !== "0" ||
      counts!.artifacts !== "0"
    ) {
      throw new Error(
        `This suite committed deployment rows (${counts!.requests} requests, ` +
          `${counts!.events} events, ${counts!.artifacts} artifacts). They are ` +
          "append-only and cannot be deleted; restore the database before " +
          "trusting any other db-read result.",
      );
    }
  } finally {
    await client.end({ timeout: 5 });
  }
});

/** Thrown to roll a transaction back once it has proved what it needed to. */
class Rollback extends Error {}

/**
 * The message Postgres actually produced.
 *
 * Drizzle wraps a driver error in "Failed query: …" and hangs the real one off
 * `cause`, so asserting on the outer message tests the wrapper rather than the
 * constraint. The same unwrapping the 2D-1 publication tests do.
 */
async function refusalFrom(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : "";
    return `${error instanceof Error ? error.message : String(error)} ${cause}`;
  }
  throw new Error("Expected a refusal, and the statement was accepted.");
}

/** Run `body` against a transaction that is always rolled back. */
async function inRolledBackTransaction(
  body: (store: DeploymentStore) => Promise<void>,
): Promise<void> {
  await db
    .transaction(async (tx) => {
      await body(tx as unknown as AdminTransaction);
      throw new Rollback();
    })
    .catch((error: unknown) => {
      if (!(error instanceof Rollback)) throw error;
    });
}

const CONFIGURED = {
  CLOUDFLARE_API_TOKEN: "test-token-0123456789abcdef",
  CLOUDFLARE_ACCOUNT_ID: "account",
  CLOUDFLARE_BUILDS_TRIGGER_ID: "trigger",
  CLOUDFLARE_WORKER_TAG: "worker-tag",
} as const;

function cloudflareReturning(
  status: number,
  body: unknown,
): CloudflareTransport {
  return {
    fetch: async () =>
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status,
      }),
  };
}

const CLOUDFLARE_UNREACHABLE: CloudflareTransport = {
  fetch: async () => {
    throw new Error("socket hang up");
  },
};

function accepting(buildId: string): CloudflareTransport {
  return cloudflareReturning(200, { result: { build_uuid: buildId } });
}

async function manifestFor(
  entries: ManifestEntry[],
  overrides: Partial<DeploymentManifest> = {},
): Promise<DeploymentManifest> {
  return {
    schema: MANIFEST_SCHEMA_ID,
    generatedAt: "2026-08-19T10:00:00.000Z",
    siteEnv: "production",
    buildUuid: "build-1",
    commitSha: "abc123",
    branch: "main",
    source: "database",
    rubricVersion: "1.0",
    digest: await digestEntries(entries),
    entries,
    ...overrides,
  };
}

function serving(manifest: DeploymentManifest): VerifyTransport {
  return {
    fetch: async () => new Response(JSON.stringify(manifest), { status: 200 }),
  };
}

const UNREACHABLE: VerifyTransport = {
  fetch: async () => {
    throw new Error("ENOTFOUND");
  },
};

/** The published corpus this database actually holds. */
async function publishedEntries(store: DeploymentStore): Promise<ManifestEntry[]> {
  const rows = await store
    .select({
      evaluationId: t.evaluations.id,
      versionNumber: t.evaluations.versionNumber,
      rubricVersion: t.evaluations.rubricVersion,
      gameSlug: t.games.slug,
      scopeKey: t.profileScopes.key,
    })
    .from(t.evaluations)
    .innerJoin(t.games, eq(t.games.id, t.evaluations.gameId))
    .innerJoin(t.profileScopes, eq(t.profileScopes.id, t.evaluations.scopeId))
    .where(eq(t.evaluations.status, "published"));

  return rows.map((row) => ({
    evaluationId: row.evaluationId,
    gameSlug: row.gameSlug,
    scopeKey: row.scopeKey,
    versionNumber: row.versionNumber,
    rubricVersion: row.rubricVersion,
    publishedAt: null,
    path: `/games/${row.gameSlug}`,
  }));
}

async function eventKinds(store: DeploymentStore): Promise<string[]> {
  const rows = await store
    .select({ kind: t.deploymentEvents.kind })
    .from(t.deploymentEvents)
    .orderBy(t.deploymentEvents.occurredAt);
  return rows.map((row) => row.kind);
}

describe("Requesting a production build", () => {
  it("records the request, the attempt and the acceptance", async () => {
    await inRolledBackTransaction(async (store) => {
      const report = await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("b-1"),
        env: CONFIGURED,
      });

      expect(report).toMatchObject({ kind: "dispatched", buildId: "b-1" });

      const [request] = await store.select().from(t.deploymentRequests);
      expect(request).toMatchObject({
        state: "dispatched",
        reason: "manual",
        branch: "main",
        requestedBy: "editor@example.com",
        providerBuildId: "b-1",
      });
      expect(request!.dispatchedAt).not.toBeNull();

      expect(await eventKinds(store)).toEqual([
        "dispatch_attempted",
        "dispatch_accepted",
      ]);
    });
  });

  /**
   * A refusal is definitive: Cloudflare declined, so no build exists and the
   * request is closed. The reason is kept, because "why is this not Live" is
   * the only question this table exists to answer.
   */
  it("closes a request Cloudflare refused, keeping its reason", async () => {
    await inRolledBackTransaction(async (store) => {
      const report = await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: cloudflareReturning(403, {
          errors: [{ code: 10000, message: "Invalid token" }],
        }),
        env: CONFIGURED,
      });

      expect(report.kind).toBe("refused");
      const [request] = await store.select().from(t.deploymentRequests);
      expect(request!.state).toBe("refused");
      expect(request!.lastError).toContain("Invalid token");
      expect(await eventKinds(store)).toEqual([
        "dispatch_attempted",
        "dispatch_refused",
      ]);
    });
  });

  /**
   * An unestablished outcome is its own state, and nothing retries it.
   *
   * The request very likely arrived; the response was lost. Marking it failed
   * and retrying queues a second production build for a corpus that already had
   * one on the way.
   */
  it("keeps an unestablished outcome as unknown, with no build id", async () => {
    await inRolledBackTransaction(async (store) => {
      const report = await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: CLOUDFLARE_UNREACHABLE,
        env: CONFIGURED,
      });

      expect(report.kind).toBe("unknown");
      const [request] = await store.select().from(t.deploymentRequests);
      expect(request!.state).toBe("dispatch_unknown");
      expect(request!.providerBuildId).toBeNull();
    });
  });

  it("records the reason when deployment is not configured, and asks for nothing", async () => {
    await inRolledBackTransaction(async (store) => {
      const report = await dispatchDeployment(store, {
        reason: "publication",
        actor: "editor@example.com",
        transport: {
          fetch: async () => {
            throw new Error("a request was made despite no configuration");
          },
        },
        env: {},
      });

      expect(report.kind).toBe("not-configured");
      expect(await store.select().from(t.deploymentRequests)).toHaveLength(0);
      expect(await eventKinds(store)).toEqual(["dispatch_refused"]);
    });
  });
});

describe("Duplicate requests", () => {
  /**
   * Coalescing is on identical INTENT, not on overlapping effect.
   *
   * A second submission naming the same publication while the first is
   * unresolved is a double-clicked form.
   */
  it("gives a repeated publication the request already in flight", async () => {
    await inRolledBackTransaction(async (store) => {
      const [published] = await store
        .select({ id: t.evaluations.id })
        .from(t.evaluations)
        .where(eq(t.evaluations.status, "published"))
        .limit(1);

      const first = await dispatchDeployment(store, {
        reason: "publication",
        actor: "editor@example.com",
        triggeringEvaluationId: published!.id,
        transport: accepting("b-1"),
        env: CONFIGURED,
      });

      const second = await dispatchDeployment(store, {
        reason: "publication",
        actor: "editor@example.com",
        triggeringEvaluationId: published!.id,
        transport: {
          fetch: async () => {
            throw new Error("a second build was requested for one publication");
          },
        },
        env: CONFIGURED,
      });

      expect(second.kind).toBe("coalesced");
      expect(second.kind === "coalesced" && second.requestId).toBe(
        first.kind === "dispatched" ? first.requestId : null,
      );
      expect(await store.select().from(t.deploymentRequests)).toHaveLength(1);
      expect(await eventKinds(store)).toContain("dispatch_coalesced");
    });
  });

  /**
   * Two DIFFERENT publications get two builds, deliberately.
   *
   * Nothing here knows when a running build read the database, so the second
   * publication may not be in it. A redundant build is a few minutes of CI; a
   * missed one is a profile that never reaches the site.
   */
  it("does not coalesce two different publications", async () => {
    await inRolledBackTransaction(async (store) => {
      const published = await store
        .select({ id: t.evaluations.id })
        .from(t.evaluations)
        .where(eq(t.evaluations.status, "published"))
        .limit(2);
      expect(published.length).toBeGreaterThan(1);

      await dispatchDeployment(store, {
        reason: "publication",
        actor: "editor@example.com",
        triggeringEvaluationId: published[0]!.id,
        transport: accepting("b-1"),
        env: CONFIGURED,
      });
      const second = await dispatchDeployment(store, {
        reason: "publication",
        actor: "editor@example.com",
        triggeringEvaluationId: published[1]!.id,
        transport: accepting("b-2"),
        env: CONFIGURED,
      });

      expect(second.kind).toBe("dispatched");
      expect(await store.select().from(t.deploymentRequests)).toHaveLength(2);
    });
  });

  it("refuses a manual request while anything is unresolved", async () => {
    await inRolledBackTransaction(async (store) => {
      await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("b-1"),
        env: CONFIGURED,
      });

      const second = await dispatchDeployment(store, {
        reason: "retry",
        actor: "editor@example.com",
        transport: {
          fetch: async () => {
            throw new Error("a build was requested while one was in flight");
          },
        },
        env: CONFIGURED,
      });

      expect(second.kind).toBe("coalesced");
      expect(second.kind === "coalesced" && second.detail).toMatch(
        /still dispatched/,
      );
    });
  });
});

describe("Proving what production serves", () => {
  it("records the artifact, its contents, and the observation", async () => {
    await inRolledBackTransaction(async (store) => {
      const entries = await publishedEntries(store);
      const result = await verifyProduction(store, {
        transport: serving(await manifestFor(entries)),
        actor: "editor@example.com",
      });

      expect(result.kind).toBe("verified");

      const [artifact] = await store.select().from(t.deploymentArtifacts);
      expect(artifact).toMatchObject({
        source: "database",
        siteEnv: "production",
        buildUuid: "build-1",
      });

      const members = await store
        .select()
        .from(t.deploymentArtifactEvaluations);
      expect(members).toHaveLength(entries.length);
      expect(await eventKinds(store)).toEqual(["production_verified"]);
    });
  });

  /**
   * Idempotent about the artifact, appending about the observation.
   *
   * "Still serving this at 14:05" is a different fact from "was serving this at
   * 14:00", so a second verification is a second event — but the same
   * deployment is one artifact, keyed on (generated_at, digest).
   */
  it("verifying twice records one artifact and two observations", async () => {
    await inRolledBackTransaction(async (store) => {
      const manifest = await manifestFor(await publishedEntries(store));
      await verifyProduction(store, {
        transport: serving(manifest),
        actor: "editor@example.com",
      });
      await verifyProduction(store, {
        transport: serving(manifest),
        actor: "editor@example.com",
      });

      expect(await store.select().from(t.deploymentArtifacts)).toHaveLength(1);
      expect(await eventKinds(store)).toEqual([
        "production_verified",
        "production_verified",
      ]);
    });
  });

  it("records why it could not tell, and proves nothing", async () => {
    await inRolledBackTransaction(async (store) => {
      const result = await verifyProduction(store, {
        transport: UNREACHABLE,
        actor: "editor@example.com",
      });

      expect(result.kind).toBe("unverifiable");
      expect(await store.select().from(t.deploymentArtifacts)).toHaveLength(0);
      expect(await eventKinds(store)).toEqual(["production_unverifiable"]);
      expect(await readLiveProof(store)).toMatchObject({ kind: "unproven" });
    });
  });

  /**
   * Matching on build uuid is the only link between "we asked for this" and
   * "this is what is being served". A build reported successful proves neither.
   */
  it("settles the request that asked for the artifact now being served", async () => {
    await inRolledBackTransaction(async (store) => {
      const report = await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("build-1"),
        env: CONFIGURED,
      });

      await verifyProduction(store, {
        transport: serving(await manifestFor(await publishedEntries(store))),
        actor: "editor@example.com",
      });

      const [request] = await store
        .select()
        .from(t.deploymentRequests)
        .where(
          eq(
            t.deploymentRequests.id,
            report.kind === "dispatched" ? report.requestId : "",
          ),
        );
      expect(request!.state).toBe("build_reported_success");
    });
  });
});

describe("Deriving Live", () => {
  /**
   * The most recent OBSERVATION wins, not the newest artifact.
   *
   * A rollback makes an older artifact the current one. Ordering by build time
   * would report the rolled-back version as Live forever.
   */
  it("follows the latest verification, even to an older artifact", async () => {
    await inRolledBackTransaction(async (store) => {
      const entries = await publishedEntries(store);
      const newer = await manifestFor(entries, {
        generatedAt: "2026-08-19T12:00:00.000Z",
        buildUuid: "build-new",
      });
      const older = await manifestFor(entries.slice(0, 1), {
        generatedAt: "2026-08-18T09:00:00.000Z",
        buildUuid: "build-old",
      });

      await verifyProduction(store, {
        transport: serving(newer),
        actor: "editor@example.com",
      });
      // A rollback: production now serves the older artifact again.
      await verifyProduction(store, {
        transport: serving(older),
        actor: "editor@example.com",
      });

      const live = await readLiveProof(store);
      expect(live.kind).toBe("proven");
      expect(live.kind === "proven" && live.artifact.buildUuid).toBe("build-old");
      expect(live.kind === "proven" && live.evaluationIds.size).toBe(1);
    });
  });

  it("reports every published profile as unproven before any verification", async () => {
    await inRolledBackTransaction(async (store) => {
      const overview = await readDeploymentOverview(store, {});
      expect(overview.published.length).toBeGreaterThan(0);
      expect(overview.published.every((row) => row.status === "unproven")).toBe(
        true,
      );
      expect(overview.configured).toBe(false);
    });
  });

  it("marks a served profile Live and an unserved one awaiting deployment", async () => {
    await inRolledBackTransaction(async (store) => {
      const entries = await publishedEntries(store);
      expect(entries.length).toBeGreaterThan(1);

      // Production is serving all but one of the published profiles.
      await verifyProduction(store, {
        transport: serving(await manifestFor(entries.slice(1))),
        actor: "editor@example.com",
      });

      const overview = await readDeploymentOverview(store, {});
      const missing = overview.published.find(
        (row) => row.evaluationId === entries[0]!.evaluationId,
      );
      expect(missing!.status).toBe("awaiting_deployment");
      expect(
        overview.published
          .filter((row) => row.evaluationId !== entries[0]!.evaluationId)
          .every((row) => row.status === "live"),
      ).toBe(true);
    });
  });

  /**
   * §9.8's "the previous deployed artifact remains Live", which is invisible if
   * you only ever ask about the current corpus.
   */
  it("reports a served version this database does not publish", async () => {
    await inRolledBackTransaction(async (store) => {
      const entries = await publishedEntries(store);
      const stranger: ManifestEntry = {
        ...entries[0]!,
        evaluationId: "99999999-9999-4999-8999-999999999999",
        versionNumber: 1,
      };

      await verifyProduction(store, {
        transport: serving(await manifestFor([...entries, stranger])),
        actor: "editor@example.com",
      });

      const overview = await readDeploymentOverview(store, {});
      expect(overview.stillServed).toHaveLength(1);
      expect(overview.stillServed[0]).toMatchObject({
        evaluationId: stranger.evaluationId,
        // Not an evaluation this database has ever seen, and said so rather
        // than dropped.
        status: null,
      });
    });
  });

  /**
   * A fixture-backed artifact is a healthy deployment in which NO editorial
   * evaluation is Live. Nothing may report otherwise on the strength of a
   * successful verification.
   */
  it("makes nothing Live from a fixture-backed artifact", async () => {
    await inRolledBackTransaction(async (store) => {
      await verifyProduction(store, {
        transport: serving(
          await manifestFor(
            [
              {
                evaluationId: "evl_returnal_v1",
                gameSlug: "returnal",
                scopeKey: "default",
                versionNumber: 1,
                rubricVersion: "1.0",
                publishedAt: null,
                path: "/games/returnal",
              },
            ],
            { source: "fixtures" },
          ),
        ),
        actor: "editor@example.com",
      });

      const overview = await readDeploymentOverview(store, {});
      expect(overview.live.kind).toBe("proven");
      expect(
        overview.live.kind === "proven" && overview.live.artifact.source,
      ).toBe("fixtures");
      // Verified, and not one editorial evaluation is served by it.
      expect(overview.published.every((row) => row.status !== "live")).toBe(true);
    });
  });
});

describe("Build status is advisory", () => {
  it("moves a request to reported-failure without touching Live", async () => {
    await inRolledBackTransaction(async (store) => {
      await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("b-1"),
        env: CONFIGURED,
      });

      await refreshBuildStatuses(store, {
        transport: cloudflareReturning(200, {
          result: [
            { build_uuid: "b-1", status: "failed", build_outcome: "failure" },
          ],
        }),
        actor: "editor@example.com",
        env: CONFIGURED,
      });

      const [request] = await store.select().from(t.deploymentRequests);
      expect(request!.state).toBe("build_reported_failure");
      expect(request!.providerStatus).toBe("failed");
      // A build report is not evidence about production, in either direction.
      expect(await readLiveProof(store)).toMatchObject({ kind: "unproven" });
    });
  });

  /**
   * Cloudflare does not document its status vocabulary, so an unrecognised
   * value must not be forced into a verdict.
   */
  it("leaves a request waiting on an outcome it does not recognise", async () => {
    await inRolledBackTransaction(async (store) => {
      await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("b-1"),
        env: CONFIGURED,
      });

      await refreshBuildStatuses(store, {
        transport: cloudflareReturning(200, {
          result: [
            { build_uuid: "b-1", status: "quarantined", build_outcome: "weird" },
          ],
        }),
        actor: "editor@example.com",
        env: CONFIGURED,
      });

      const [request] = await store.select().from(t.deploymentRequests);
      expect(request!.state).toBe("dispatched");
      expect(request!.providerStatus).toBe("quarantined");
    });
  });

  /** No build id to ask about is what `dispatch_unknown` means. */
  it("does not poll a request whose dispatch outcome is unknown", async () => {
    await inRolledBackTransaction(async (store) => {
      await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: CLOUDFLARE_UNREACHABLE,
        env: CONFIGURED,
      });

      const result = await refreshBuildStatuses(store, {
        transport: {
          fetch: async () => {
            throw new Error("polled a request with no build id");
          },
        },
        actor: "editor@example.com",
        env: CONFIGURED,
      });

      expect(result.checked).toBe(0);
    });
  });
});

/**
 * Every durable unresolved state must have a way out that does not need psql.
 *
 * Before N1 exactly one of the three could be settled. A `pending` request —
 * committed, then abandoned when the process died before its dispatch outcome
 * was written — and a `dispatched` one whose build cannot be polled were both
 * permanent: they blocked every later manual request, and no application path
 * could close them. These are the tests for each dead end.
 */
describe("Settling a request that nothing here can resolve", () => {
  /**
   * The state reached by a row that committed and was then abandoned. Produced
   * directly, because the only honest way to reach it is a crash.
   */
  async function abandonedPendingRequest(
    store: DeploymentStore,
  ): Promise<string> {
    const [created] = await store
      .insert(t.deploymentRequests)
      .values({
        reason: "manual",
        branch: "main",
        requestedBy: "editor@example.com",
      })
      .returning({ id: t.deploymentRequests.id });
    return created!.id;
  }

  it("settles a pending request abandoned before its outcome was written", async () => {
    await inRolledBackTransaction(async (store) => {
      const requestId = await abandonedPendingRequest(store);

      const [before] = await store.select().from(t.deploymentRequests);
      expect(before!.state).toBe("pending");

      await settleDeploymentRequest(store, requestId, "editor@example.com");

      const [after] = await store.select().from(t.deploymentRequests);
      expect(after!.state).toBe("superseded");
    });
  });

  it("settles a dispatched request whose build outcome cannot be read", async () => {
    await inRolledBackTransaction(async (store) => {
      const report = await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("build-stranded"),
        env: CONFIGURED,
      });
      const requestId = report.kind === "dispatched" ? report.requestId : "";

      // The configuration that strands it: no worker tag, so build status is
      // unreadable, and the build will never appear in a manifest either.
      const { CLOUDFLARE_WORKER_TAG: _omitted, ...WITHOUT_TAG } = CONFIGURED;
      await refreshBuildStatuses(store, {
        transport: {
          fetch: async () => {
            throw new Error("polled Cloudflare without a worker tag");
          },
        },
        actor: "editor@example.com",
        env: WITHOUT_TAG,
      });

      // Polling looked at it and learned nothing: with no worker tag there is no
      // endpoint to ask, so the request stays exactly where it was, forever.
      const [stranded] = await store.select().from(t.deploymentRequests);
      expect(stranded!.state).toBe("dispatched");
      expect(stranded!.providerStatus).toBeNull();

      const observed = await store
        .select({ summary: t.deploymentEvents.summary })
        .from(t.deploymentEvents)
        .where(eq(t.deploymentEvents.kind, "build_status_observed"));
      expect(observed.at(-1)!.summary).toMatch(/CLOUDFLARE_WORKER_TAG is unset/);

      await settleDeploymentRequest(store, requestId, "editor@example.com");

      const [after] = await store.select().from(t.deploymentRequests);
      expect(after!.state).toBe("superseded");
    });
  });

  it("settles a request whose dispatch outcome was never established", async () => {
    await inRolledBackTransaction(async (store) => {
      const report = await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: CLOUDFLARE_UNREACHABLE,
        env: CONFIGURED,
      });
      const requestId = report.kind === "unknown" ? report.requestId : "";

      await settleDeploymentRequest(store, requestId, "editor@example.com");

      const [after] = await store.select().from(t.deploymentRequests);
      expect(after!.state).toBe("superseded");
    });
  });

  it("records the state it was settled from, and that a person decided", async () => {
    await inRolledBackTransaction(async (store) => {
      const report = await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("build-7"),
        env: CONFIGURED,
      });
      const requestId = report.kind === "dispatched" ? report.requestId : "";

      await settleDeploymentRequest(store, requestId, "chief@example.com");

      const events = await store
        .select()
        .from(t.deploymentEvents)
        .orderBy(t.deploymentEvents.seq);
      const settlement = events.at(-1)!;

      expect(settlement.actor).toBe("chief@example.com");
      expect(settlement.requestId).toBe(requestId);
      expect(settlement.summary).toMatch(/a human judgement/);
      expect(settlement.summary).toMatch(/dispatched/);
      expect(settlement.detail).toMatchObject({
        resolution: "settled_by_operator",
        priorState: "dispatched",
        priorProviderBuildId: "build-7",
      });
    });
  });

  /**
   * The line settlement must not cross. `superseded` says "we stopped waiting";
   * it must never be readable as "Cloudflare refused" or "the build failed",
   * because an operator cannot know either without provider truth.
   */
  it("never records a provider outcome it did not observe", async () => {
    await inRolledBackTransaction(async (store) => {
      const report = await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("build-8"),
        env: CONFIGURED,
      });
      const requestId = report.kind === "dispatched" ? report.requestId : "";

      await settleDeploymentRequest(store, requestId, "editor@example.com");

      const [after] = await store.select().from(t.deploymentRequests);
      expect(after!.state).not.toBe("refused");
      expect(after!.state).not.toBe("build_reported_success");
      expect(after!.state).not.toBe("build_reported_failure");
      // The provider's own fields are untouched: nothing was observed.
      expect(after!.providerStatus).toBeNull();
      expect(after!.providerBuildId).toBe("build-8");
    });
  });

  it("does not make anything Live", async () => {
    await inRolledBackTransaction(async (store) => {
      const report = await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("build-9"),
        env: CONFIGURED,
      });
      const requestId = report.kind === "dispatched" ? report.requestId : "";

      await settleDeploymentRequest(store, requestId, "editor@example.com");

      expect((await readLiveProof(store)).kind).toBe("unproven");
    });
  });

  it("unblocks the retry that was refused while it was open", async () => {
    await inRolledBackTransaction(async (store) => {
      const first = await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("build-a"),
        env: CONFIGURED,
      });
      const requestId = first.kind === "dispatched" ? first.requestId : "";

      // Blocked while it is open — the active-request guard, still doing its job.
      const blocked = await dispatchDeployment(store, {
        reason: "retry",
        actor: "editor@example.com",
        transport: accepting("build-b"),
        env: CONFIGURED,
      });
      expect(blocked.kind).toBe("coalesced");

      await settleDeploymentRequest(store, requestId, "editor@example.com");

      const retried = await dispatchDeployment(store, {
        reason: "retry",
        actor: "editor@example.com",
        transport: accepting("build-b"),
        env: CONFIGURED,
      });
      expect(retried.kind).toBe("dispatched");
    });
  });

  it("keeps retry lineage in the trail", async () => {
    await inRolledBackTransaction(async (store) => {
      const first = await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("build-a"),
        env: CONFIGURED,
      });
      const firstId = first.kind === "dispatched" ? first.requestId : "";
      await settleDeploymentRequest(store, firstId, "editor@example.com");

      await dispatchDeployment(store, {
        reason: "retry",
        actor: "editor@example.com",
        transport: accepting("build-b"),
        env: CONFIGURED,
      });

      const [lineage] = await store
        .select()
        .from(t.deploymentEvents)
        .where(eq(t.deploymentEvents.kind, "retry_requested"));

      expect(lineage).toBeDefined();
      expect(lineage!.detail).toMatchObject({
        previousRequestId: firstId,
        previousState: "superseded",
      });
    });
  });

  /** A settled request stays settled; a resolved one was never open. */
  it("refuses to settle a request that is not open", async () => {
    await inRolledBackTransaction(async (store) => {
      const report = await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: cloudflareReturning(400, { errors: [{ message: "no" }] }),
        env: CONFIGURED,
      });
      const requestId = report.kind === "refused" ? report.requestId : "";

      await expect(
        settleDeploymentRequest(store, requestId, "editor@example.com"),
      ).rejects.toThrow(/nothing left to decide/);
    });
  });

  it("refuses a request id that does not exist", async () => {
    await inRolledBackTransaction(async (store) => {
      await expect(
        settleDeploymentRequest(
          store,
          "00000000-0000-4000-8000-000000000000",
          "editor@example.com",
        ),
      ).rejects.toThrow(/does not exist/);
    });
  });

  /**
   * Settling a `dispatched` request is not a claim that its build failed. If it
   * deploys anyway, the manifest still proves it — Live is derived from evidence
   * about production, never from a request's state.
   */
  it("still proves Live from the manifest if a settled build deploys", async () => {
    await inRolledBackTransaction(async (store) => {
      const report = await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("build-late"),
        env: CONFIGURED,
      });
      const requestId = report.kind === "dispatched" ? report.requestId : "";
      await settleDeploymentRequest(store, requestId, "editor@example.com");

      const entries = await publishedEntries(store);
      const manifest = await manifestFor(entries, { buildUuid: "build-late" });
      const verified = await verifyProduction(store, {
        transport: serving(manifest),
        actor: "editor@example.com",
      });

      expect(verified.kind).toBe("verified");
      const live = await readLiveProof(store);
      expect(live.kind).toBe("proven");
      if (live.kind === "proven") {
        expect(live.evaluationIds.size).toBe(entries.length);
      }
    });
  });
});

/**
 * An artifact and the list of what it contained are ONE fact.
 *
 * They used to be written as separate autocommits, and the failure was
 * permanent: a crash in between left an immutable artifact with no members,
 * every later verification matched it on `(generated_at, digest)` and skipped
 * the membership insert, and the tool reported a *proven* deployment containing
 * nothing — so every published profile read "awaiting deployment". The
 * append-only triggers meant nothing could repair it.
 */
describe("A verification observation commits as one unit", () => {
  /**
   * A store that fails a chosen write, wrapping transactions too so the failure
   * lands inside the real transaction rather than beside it.
   */
  function failingWrite(
    store: DeploymentStore,
    shouldFail: (table: unknown) => boolean,
  ): DeploymentStore {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const handler: ProxyHandler<any> = {
      get(target, prop) {
        if (prop === "insert") {
          return (table: unknown) => {
            if (shouldFail(table)) {
              throw new Error("injected failure between artifact and membership");
            }
            return target.insert(table);
          };
        }
        if (prop === "transaction") {
          return (run: (tx: any) => Promise<unknown>) =>
            target.transaction((tx: any) => run(new Proxy(tx, handler)));
        }
        const value = target[prop];
        return typeof value === "function" ? value.bind(target) : value;
      },
    };
    return new Proxy(store, handler) as DeploymentStore;
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  it("leaves no artifact when membership cannot be written", async () => {
    await inRolledBackTransaction(async (store) => {
      const entries = await publishedEntries(store);
      const manifest = await manifestFor(entries);

      const injected = failingWrite(
        store,
        (table) => table === t.deploymentArtifactEvaluations,
      );

      await expect(
        verifyProduction(injected, {
          transport: serving(manifest),
          actor: "editor@example.com",
        }),
      ).rejects.toThrow(/injected failure/);

      const artifacts = await store.select().from(t.deploymentArtifacts);
      expect(artifacts).toHaveLength(0);

      const members = await store
        .select()
        .from(t.deploymentArtifactEvaluations);
      expect(members).toHaveLength(0);
    });
  });

  it("shows no partial Live proof after a failed write", async () => {
    await inRolledBackTransaction(async (store) => {
      const entries = await publishedEntries(store);
      const manifest = await manifestFor(entries);

      await expect(
        verifyProduction(
          failingWrite(store, (table) => table === t.deploymentArtifactEvaluations),
          { transport: serving(manifest), actor: "editor@example.com" },
        ),
      ).rejects.toThrow();

      expect((await readLiveProof(store)).kind).toBe("unproven");

      const overview = await readDeploymentOverview(store, CONFIGURED);
      expect(
        overview.published.every((row) => row.status === "unproven"),
      ).toBe(true);
    });
  });

  it("verifies normally on the next attempt", async () => {
    await inRolledBackTransaction(async (store) => {
      const entries = await publishedEntries(store);
      const manifest = await manifestFor(entries);

      await expect(
        verifyProduction(
          failingWrite(store, (table) => table === t.deploymentArtifactEvaluations),
          { transport: serving(manifest), actor: "editor@example.com" },
        ),
      ).rejects.toThrow();

      const retried = await verifyProduction(store, {
        transport: serving(manifest),
        actor: "editor@example.com",
      });
      expect(retried.kind).toBe("verified");

      const live = await readLiveProof(store);
      expect(live.kind).toBe("proven");
      if (live.kind === "proven") {
        expect(live.evaluationIds.size).toBe(entries.length);
      }
    });
  });

  it("re-observes an existing complete artifact without rewriting it", async () => {
    await inRolledBackTransaction(async (store) => {
      const entries = await publishedEntries(store);
      const manifest = await manifestFor(entries);

      const first = await verifyProduction(store, {
        transport: serving(manifest),
        actor: "editor@example.com",
      });
      const second = await verifyProduction(store, {
        transport: serving(manifest),
        actor: "editor@example.com",
      });

      expect(first.kind).toBe("verified");
      expect(second.kind).toBe("verified");
      if (first.kind === "verified" && second.kind === "verified") {
        expect(second.artifactId).toBe(first.artifactId);
      }

      expect(await store.select().from(t.deploymentArtifacts)).toHaveLength(1);
      expect(
        await store.select().from(t.deploymentArtifactEvaluations),
      ).toHaveLength(entries.length);

      const observations = await store
        .select()
        .from(t.deploymentEvents)
        .where(eq(t.deploymentEvents.kind, "production_verified"));
      expect(observations).toHaveLength(2);
    });
  });

  /**
   * `(generated_at, digest)` is an artifact's identity. Two artifacts claiming
   * it while disagreeing about what they are cannot both be right, and this
   * code cannot tell which is. It certifies neither.
   */
  it("fails closed when a duplicate identity describes a different build", async () => {
    await inRolledBackTransaction(async (store) => {
      const entries = await publishedEntries(store);
      const manifest = await manifestFor(entries, { buildUuid: "build-one" });

      expect(
        (
          await verifyProduction(store, {
            transport: serving(manifest),
            actor: "editor@example.com",
          })
        ).kind,
      ).toBe("verified");

      // Same generatedAt, same digest — a different build claiming to be it.
      const impostor = { ...manifest, buildUuid: "build-two" };
      const result = await verifyProduction(store, {
        transport: serving(impostor),
        actor: "editor@example.com",
      });

      expect(result.kind).toBe("unverifiable");
      if (result.kind === "unverifiable") {
        expect(result.detail).toMatch(/buildUuid/);
      }

      // Refused, and the refusal is on the record.
      const refusals = await store
        .select()
        .from(t.deploymentEvents)
        .where(eq(t.deploymentEvents.kind, "production_unverifiable"));
      expect(refusals).toHaveLength(1);

      // And the artifact that was already proven is untouched.
      expect(await store.select().from(t.deploymentArtifacts)).toHaveLength(1);
    });
  });

  it("refuses a manifest naming one evaluation twice", async () => {
    await inRolledBackTransaction(async (store) => {
      const entries = await publishedEntries(store);
      const doubled = [...entries, entries[0]!];
      const manifest = await manifestFor(doubled);

      const result = await verifyProduction(store, {
        transport: serving(manifest),
        actor: "editor@example.com",
      });

      expect(result.kind).toBe("unverifiable");
      expect(await store.select().from(t.deploymentArtifacts)).toHaveLength(0);
    });
  });

  it("keeps the previous Live proof when a later verification fails", async () => {
    await inRolledBackTransaction(async (store) => {
      const entries = await publishedEntries(store);
      const manifest = await manifestFor(entries);

      const first = await verifyProduction(store, {
        transport: serving(manifest),
        actor: "editor@example.com",
      });
      const artifactId = first.kind === "verified" ? first.artifactId : "";

      const failed = await verifyProduction(store, {
        transport: UNREACHABLE,
        actor: "editor@example.com",
      });
      expect(failed.kind).toBe("unverifiable");

      const live = await readLiveProof(store);
      expect(live.kind).toBe("proven");
      if (live.kind === "proven") {
        expect(live.artifact.id).toBe(artifactId);
        expect(live.evaluationIds.size).toBe(entries.length);
      }
    });
  });
});

describe("The record cannot be rewritten", () => {
  it("refuses to change what a request asked for", async () => {
    await inRolledBackTransaction(async (store) => {
      await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("b-1"),
        env: CONFIGURED,
      });

      expect(
        await refusalFrom(() =>
          store
            .update(t.deploymentRequests)
            .set({ requestedBy: "someone-else@example.com" }),
        ),
      ).toMatch(/fixed in what it asked for/);
    });
  });

  it("refuses to re-point a request at another build", async () => {
    await inRolledBackTransaction(async (store) => {
      await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("b-1"),
        env: CONFIGURED,
      });

      expect(
        await refusalFrom(() =>
          store.update(t.deploymentRequests).set({ providerBuildId: "b-2" }),
        ),
      ).toMatch(/already matched to build/);
    });
  });

  it("refuses to edit or delete the audit trail", async () => {
    await inRolledBackTransaction(async (store) => {
      await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("b-1"),
        env: CONFIGURED,
      });

      expect(
        await refusalFrom(() =>
          store.update(t.deploymentEvents).set({ summary: "rewritten" }),
        ),
      ).toMatch(/append-only/);
    });
  });

  it("refuses to delete a recorded artifact", async () => {
    await inRolledBackTransaction(async (store) => {
      await verifyProduction(store, {
        transport: serving(await manifestFor(await publishedEntries(store))),
        actor: "editor@example.com",
      });

      expect(
        await refusalFrom(() => store.delete(t.deploymentArtifacts)),
      ).toMatch(/append-only/);
    });
  });
});

/**
 * What the Publish page says about ONE evaluation.
 *
 * The bug was a sentence: a superseded snapshot that production no longer
 * serves was described as "Published and awaiting deployment", in a warning
 * tone. It is neither. It is not the published version — a later one replaced
 * it — and no build will ever make it Live again, so nothing is outstanding.
 * Reported as a gap, it sends an editor to press Request for a deployment that
 * cannot exist.
 */
describe("How one evaluation stands against production", () => {
  /**
   * One published version, and one that has been superseded.
   *
   * Built by moving a seeded evaluation `published -> superseded`, which is the
   * only transition into that state the immutability trigger permits and
   * exactly what publishing a revision does. Inventing a fresh evaluation would
   * mean satisfying every completeness rule the publish gate enforces, to
   * produce a row this test never reads the contents of.
   *
   * Rolled back with everything else, so the shared corpus is unchanged.
   */
  async function publishedAndSupersededIds(
    store: DeploymentStore,
  ): Promise<{ published: string; superseded: string }> {
    const rows = await store
      .select({ id: t.evaluations.id })
      .from(t.evaluations)
      .where(eq(t.evaluations.status, "published"))
      .orderBy(t.evaluations.id);

    expect(rows.length).toBeGreaterThanOrEqual(2);
    const [first, second] = rows as [{ id: string }, { id: string }];

    await store
      .update(t.evaluations)
      .set({ status: "superseded" })
      .where(eq(t.evaluations.id, second.id));

    return { published: first.id, superseded: second.id };
  }

  it("calls a superseded version production does not serve history, not a gap", async () => {
    await inRolledBackTransaction(async (store) => {
      const { superseded } = await publishedAndSupersededIds(store);

      const entries = await publishedEntries(store);
      await verifyProduction(store, {
        transport: serving(await manifestFor(entries)),
        actor: "editor@example.com",
      });

      const live = await readLiveProof(store);
      expect(await evaluationDeploymentStatus(store, live, superseded)).toBe(
        "no_longer_served",
      );
    });
  });

  it("still calls the current published version awaiting deployment", async () => {
    await inRolledBackTransaction(async (store) => {
      const { published } = await publishedAndSupersededIds(store);

      // A manifest that carries no editorial evaluation at all.
      await verifyProduction(store, {
        transport: serving(await manifestFor([])),
        actor: "editor@example.com",
      });

      const live = await readLiveProof(store);
      expect(await evaluationDeploymentStatus(store, live, published)).toBe(
        "awaiting_deployment",
      );
    });
  });

  /** §9.8's "the previous deployed artifact remains Live". Still true, still said. */
  it("calls a superseded version production IS serving Live", async () => {
    await inRolledBackTransaction(async (store) => {
      const { superseded } = await publishedAndSupersededIds(store);

      // The artifact production is serving still carries the older version —
      // which is the whole point: it was deployed before the revision landed.
      const entries = await publishedEntries(store);
      const withHistory = await manifestFor([
        ...entries,
        {
          evaluationId: superseded,
          gameSlug: "a-game",
          scopeKey: "default",
          versionNumber: 1,
          rubricVersion: "1.0",
          publishedAt: "2026-08-01",
          path: "/games/a-game",
        },
      ]);

      await verifyProduction(store, {
        transport: serving(withHistory),
        actor: "editor@example.com",
      });

      const live = await readLiveProof(store);
      expect(await evaluationDeploymentStatus(store, live, superseded)).toBe(
        "live",
      );
    });
  });

  it("says nothing either way when production has not been verified", async () => {
    await inRolledBackTransaction(async (store) => {
      const { published, superseded } = await publishedAndSupersededIds(store);
      const live = await readLiveProof(store);

      expect(await evaluationDeploymentStatus(store, live, published)).toBe(
        "unproven",
      );
      expect(await evaluationDeploymentStatus(store, live, superseded)).toBe(
        "unproven",
      );
    });
  });

  /** `evaluations.id` is a uuid column; a non-uuid is a type error, not a miss. */
  it("does not take the page down for an id that is not a uuid", async () => {
    await inRolledBackTransaction(async (store) => {
      const entries = await publishedEntries(store);
      await verifyProduction(store, {
        transport: serving(await manifestFor(entries)),
        actor: "editor@example.com",
      });

      const live = await readLiveProof(store);
      expect(
        await evaluationDeploymentStatus(store, live, "evl_returnal_v1"),
      ).toBe("awaiting_deployment");
    });
  });
});
