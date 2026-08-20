import { afterAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";
import * as t from "@/lib/db/schema";
import type { AdminTransaction } from "@/lib/admin/db";
import {
  dispatchDeployment,
  markDispatchNotDelivered,
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

describe("Settling an unknown dispatch by hand", () => {
  it("closes it and records that a person decided", async () => {
    await inRolledBackTransaction(async (store) => {
      const report = await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: CLOUDFLARE_UNREACHABLE,
        env: CONFIGURED,
      });
      const requestId = report.kind === "unknown" ? report.requestId : "";

      await markDispatchNotDelivered(store, requestId, "editor@example.com");

      const [request] = await store.select().from(t.deploymentRequests);
      expect(request!.state).toBe("refused");

      const summaries = await store
        .select({ summary: t.deploymentEvents.summary })
        .from(t.deploymentEvents);
      expect(summaries.at(-1)!.summary).toMatch(/a human judgement/);
    });
  });

  it("refuses to settle a request that is not in doubt", async () => {
    await inRolledBackTransaction(async (store) => {
      const report = await dispatchDeployment(store, {
        reason: "manual",
        actor: "editor@example.com",
        transport: accepting("b-1"),
        env: CONFIGURED,
      });
      const requestId = report.kind === "dispatched" ? report.requestId : "";

      await expect(
        markDispatchNotDelivered(store, requestId, "editor@example.com"),
      ).rejects.toThrow(/nothing left to decide/);
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
