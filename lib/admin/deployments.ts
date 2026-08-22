import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { AdminDatabase, AdminTransaction } from "@/lib/admin/db";
import { withAuthorizedAdminDatabase } from "@/lib/admin/db";
import { EditorialRuleError } from "@/lib/admin/errors";
import { requireEditor } from "@/lib/admin/guard";
import { PUBLIC_RUBRIC_VERSION } from "@/lib/data/games";
import * as t from "@/lib/db/schema";
import {
  requestBuild,
  readBuildStatus,
  type CloudflareTransport,
} from "@/lib/deploy/cloudflare";
import {
  deployAvailability,
  explainDeployUnavailable,
  redactSecrets,
} from "@/lib/deploy/config";
import type { DeploymentManifest } from "@/lib/deploy/manifest";
import { readProductionManifest, type VerifyTransport } from "@/lib/deploy/verify";
import { PRODUCTION_BRANCH, SITE_URL } from "@/lib/site";

/**
 * Deployment requests, their audit trail, and the derivation of **Live**.
 *
 * ── The three words, again, because this is where they are decided ─────────
 *
 *   Published   an evaluation is its scope's current editorial version. A fact
 *               this database owns, true the moment the publication commits.
 *   Superseded  preserved editorial history.
 *   Live        the artifact production is serving contains this version.
 *
 * Live is **derived**, never stored on an evaluation. Every input to that
 * derivation is evidence with a timestamp, and the evidence can go away: an
 * origin that stops answering does not make a profile stop being Published, and
 * it absolutely does stop it being *provably* Live. The state model below has a
 * name for that, and it is not "Live".
 *
 * ── What is and is not evidence ────────────────────────────────────────────
 *
 *   a dispatch was accepted      evidence that a build was requested
 *   a build reported success     evidence a build process exited 0
 *   a manifest read from the     THE ONLY evidence about what production
 *   production origin            serves
 *
 * The first two are recorded, shown, and used to explain *why* something has
 * not deployed. Neither is ever allowed to make anything Live. Everything in
 * this module that writes `production_verified` goes through
 * `readProductionManifest`, and nothing else may.
 *
 * ── Publication must survive Cloudflare being down ─────────────────────────
 *
 * Dispatch happens strictly *after* the publication transaction commits, in a
 * separate transaction, and every failure path records rather than throws. An
 * editorial act that was validated, approved and committed must not be undone
 * because a third-party API timed out — the profile is Published either way,
 * and the deployment is a separate thing that can be retried. Putting the
 * dispatch inside the publication transaction would also hold a row lock across
 * a network call to another company, which is its own reason not to.
 */

/** Where the editorial tool believes production lives. */
export const PRODUCTION_ORIGIN = SITE_URL;

/**
 * What an id has to look like before it can be a row in `evaluations`.
 *
 * The manifest reports whatever the artifact contained, and a fixture-backed
 * artifact contains readable keys rather than uuids. `evaluations.id` is a
 * `uuid` column, so passing one of those to a query is a type error rather
 * than an empty result.
 */
const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Request states from which no further work is expected. */
const RESOLVED_STATES = [
  "refused",
  "build_reported_success",
  "build_reported_failure",
  "superseded",
] as const;

/**
 * States in which a request may still produce a build.
 *
 * `dispatch_unknown` is here and that is the point: a request whose outcome was
 * never established may have queued a build, so asking for another one risks a
 * duplicate. It is resolved by looking or by an editor saying what they found —
 * never by assuming.
 */
const UNRESOLVED_STATES = ["pending", "dispatched", "dispatch_unknown"] as const;

/**
 * The advisory lock that serializes "is a build already open, and if not, claim
 * one". Two arbitrary but fixed integers, because `pg_advisory_xact_lock` keys
 * a lock by value and nothing else in this system may pick the same pair.
 *
 * A TRANSACTION lock, deliberately: it is released by COMMIT rather than by the
 * session ending, so it is safe on a pooled Hyperdrive connection, and it
 * cannot outlive the short transaction that takes it.
 */
const DISPATCH_LOCK_NAMESPACE = 0x5190;
const DISPATCH_LOCK_KEY = 0xde91;

/**
 * A database handle or a transaction handle.
 *
 * The same arrangement `ProfileReader` uses in `lib/db/read-profiles.ts`, for
 * the same two reasons: a caller may legitimately want several of these steps
 * in one transaction, and the database-backed tests run every one of them
 * inside a transaction they roll back — which is not optional here, because
 * `deployment_events` and `deployment_artifacts` refuse DELETE by trigger and
 * a test that committed could not clean up after itself at all.
 */
export type DeploymentStore = AdminDatabase | AdminTransaction;

export type DeploymentRequestRow = typeof t.deploymentRequests.$inferSelect;
export type DeploymentEventRow = typeof t.deploymentEvents.$inferSelect;
export type DeploymentArtifactRow = typeof t.deploymentArtifacts.$inferSelect;

interface EventInput {
  readonly kind: (typeof t.deploymentEventKindEnum.enumValues)[number];
  readonly actor: string;
  readonly summary: string;
  readonly requestId?: string | null;
  readonly artifactId?: string | null;
  readonly detail?: Record<string, unknown> | null;
}

/**
 * Append one line to the audit trail.
 *
 * Never fails silently and never swallows: a trail that loses entries when
 * things go wrong loses exactly the entries anyone wanted. The table refuses
 * UPDATE and DELETE by trigger, so this is the only way anything gets in.
 */
async function recordEvent(
  db: DeploymentStore,
  event: EventInput,
): Promise<void> {
  await db.insert(t.deploymentEvents).values({
    kind: event.kind,
    actor: event.actor,
    summary: event.summary,
    requestId: event.requestId ?? null,
    artifactId: event.artifactId ?? null,
    detail: event.detail ?? null,
  });
}

/**
 * Run several writes as one unit, whichever kind of handle we were given.
 *
 * `DeploymentStore` is a database or a transaction because callers legitimately
 * want both: a Server Action holds neither open across a request, while every
 * database-backed test runs inside a transaction it rolls back. Drizzle answers
 * `transaction()` on both — a real `BEGIN` on a database, a `SAVEPOINT` inside
 * an existing transaction — and both give the property this needs: the writes
 * inside either all land or none do.
 */
function inOneTransaction<T>(
  db: DeploymentStore,
  run: (tx: DeploymentStore) => Promise<T>,
): Promise<T> {
  return (db as AdminDatabase).transaction((tx) => run(tx));
}

/** Requests that might still produce a build, newest first. */
async function unresolvedRequests(
  db: DeploymentStore,
): Promise<DeploymentRequestRow[]> {
  return db
    .select()
    .from(t.deploymentRequests)
    .where(inArray(t.deploymentRequests.state, [...UNRESOLVED_STATES]))
    .orderBy(desc(t.deploymentRequests.requestedAt));
}

export type DispatchReport =
  | { readonly kind: "dispatched"; readonly requestId: string; readonly buildId: string }
  | {
      readonly kind: "coalesced";
      readonly requestId: string;
      readonly detail: string;
    }
  | {
      readonly kind: "not-configured";
      readonly detail: string;
    }
  | {
      readonly kind: "refused";
      readonly requestId: string;
      readonly detail: string;
    }
  | {
      readonly kind: "unknown";
      readonly requestId: string;
      readonly detail: string;
    };

export interface DispatchOptions {
  readonly reason: (typeof t.deploymentRequestReasonEnum.enumValues)[number];
  readonly actor: string;
  readonly triggeringEvaluationId?: string | null;
  readonly transport: CloudflareTransport;
  /** Overridable so tests never read a real environment. */
  readonly env?: Readonly<Record<string, string | undefined>>;
}

/**
 * Ask Cloudflare for a production build, and record everything about it.
 *
 * ── Coalescing, and the line it does not cross ─────────────────────────────
 *
 * A build reads the whole corpus, so one build can carry several publications.
 * It is tempting to conclude that a publication arriving while a build is in
 * flight needs no build of its own. That conclusion is unsound: nothing here
 * knows *when* a running build read the database, so it cannot know whether the
 * new publication was included.
 *
 * So this coalesces on **identical intent**, not on overlapping effect. A
 * second request naming the same triggering evaluation while the first is still
 * unresolved is a double-submitted form or a repeated action, and gets the
 * existing request. Two different publications get two requests, because the
 * second genuinely may not be covered by the first — and a redundant build is a
 * few minutes of CI, while a missed one is a profile that never reaches the
 * site.
 *
 * A `manual` or `retry` request is refused outright while anything is
 * unresolved. Those are the paths a human can repeat at will, and the honest
 * answer to "deploy again?" while a deployment is in flight is "one is already
 * running", not a second build.
 */
export async function dispatchDeployment(
  db: DeploymentStore,
  options: DispatchOptions,
): Promise<DispatchReport> {
  const availability = deployAvailability(options.env ?? process.env);
  if (!availability.available) {
    const detail = explainDeployUnavailable(availability.reason);
    // Recorded even though nothing was attempted: "we could not even try" is
    // the answer to "why is this not Live", and it belongs in the trail.
    await recordEvent(db, {
      kind: "dispatch_refused",
      actor: options.actor,
      summary: "No production build was requested: deployment is not configured.",
      detail: { reason: availability.reason },
    });
    return { kind: "not-configured", detail };
  }

  // ── The guard and the row it creates are one step, and it ends here ───────
  //
  // Checking for an open request and then inserting one is a read-then-write,
  // and two editors pressing Request at the same moment arrive on two
  // connections: both read zero open requests, both insert, and two production
  // builds are queued for one corpus. The guard read as though it prevented
  // that and did not.
  //
  // A transaction alone does not fix it either — these are inserts, not
  // updates, so there is no row to contend on and READ COMMITTED lets both
  // proceed. So the section is serialized explicitly, and this commits BEFORE
  // the Cloudflare call: the lock is a transaction lock, released at COMMIT, so
  // nothing is held across network I/O and nothing is held in a pooled
  // connection beyond the statement that took it.
  const claim = await inOneTransaction(db, async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(${DISPATCH_LOCK_NAMESPACE}, ${DISPATCH_LOCK_KEY})`,
    );

    const open = await unresolvedRequests(tx);

    if (options.reason === "publication" && options.triggeringEvaluationId) {
      const duplicate = open.find(
        (request) =>
          request.triggeringEvaluationId === options.triggeringEvaluationId,
      );
      if (duplicate) {
        const detail =
          `A production build for this publication was already requested at ` +
          `${duplicate.requestedAt.toISOString()} and has not resolved.`;
        await recordEvent(tx, {
          kind: "dispatch_coalesced",
          actor: options.actor,
          requestId: duplicate.id,
          summary: detail,
        });
        return {
          kind: "coalesced" as const,
          requestId: duplicate.id,
          detail,
        };
      }
    }

    if (options.reason !== "publication" && open.length > 0) {
      const blocking = open[0]!;
      const detail =
        `A production build requested at ${blocking.requestedAt.toISOString()} ` +
        `is still ${blocking.state.replace(/_/g, " ")}. Check it before asking ` +
        "for another, so two builds are not racing for the same corpus.";
      await recordEvent(tx, {
        kind: "dispatch_coalesced",
        actor: options.actor,
        requestId: blocking.id,
        summary: detail,
      });
      return { kind: "coalesced" as const, requestId: blocking.id, detail };
    }

    const [created] = await tx
      .insert(t.deploymentRequests)
      .values({
        reason: options.reason,
        branch: PRODUCTION_BRANCH,
        requestedBy: options.actor,
        triggeringEvaluationId: options.triggeringEvaluationId ?? null,
      })
      .returning({ id: t.deploymentRequests.id });

    const requestId = created!.id;

    // Retry lineage. `retry` and `manual` differ only in the story the trail
    // tells, and a retry's story is "this follows something that did not work" —
    // which is unreadable unless the trail says what it followed. Recorded on
    // the new request and naming the previous one, so a run of builds can be
    // read back as a sequence rather than as four unexplained requests.
    if (options.reason === "retry") {
      const [previous] = await tx
        .select({
          id: t.deploymentRequests.id,
          state: t.deploymentRequests.state,
          providerBuildId: t.deploymentRequests.providerBuildId,
        })
        .from(t.deploymentRequests)
        .where(ne(t.deploymentRequests.id, requestId))
        .orderBy(desc(t.deploymentRequests.requestedAt))
        .limit(1);

      await recordEvent(tx, {
        kind: "retry_requested",
        actor: options.actor,
        requestId,
        summary: previous
          ? `A retry of the request before this one, which ended ` +
            `"${previous.state.replace(/_/g, " ")}".`
          : "A retry, though no earlier request is on record.",
        detail: previous
          ? {
              previousRequestId: previous.id,
              previousState: previous.state,
              previousProviderBuildId: previous.providerBuildId,
            }
          : null,
      });
    }

    await recordEvent(tx, {
      kind: "dispatch_attempted",
      actor: options.actor,
      requestId,
      summary: `Asking Cloudflare Workers Builds to build ${PRODUCTION_BRANCH}.`,
      detail: { reason: options.reason },
    });

    return { kind: "claimed" as const, requestId };
  });

  if (claim.kind === "coalesced") {
    return { kind: "coalesced", requestId: claim.requestId, detail: claim.detail };
  }

  const requestId = claim.requestId;

  // ── Past this point no transaction is open ────────────────────────────────
  //
  // The request is durably `pending`. If this process dies now, that row
  // survives with no dispatch outcome — which is exactly why
  // `settleDeploymentRequest` accepts `pending`: the window cannot be closed
  // without holding a transaction across a call to another company, and the
  // answer to a window that cannot be closed is a way out of it.
  const outcome = await requestBuild(
    options.transport,
    availability.config,
    PRODUCTION_BRANCH,
  );

  if (outcome.kind === "accepted") {
    await db
      .update(t.deploymentRequests)
      .set({
        state: "dispatched",
        providerBuildId: outcome.buildId,
        dispatchedAt: new Date(),
      })
      .where(eq(t.deploymentRequests.id, requestId));

    await recordEvent(db, {
      kind: "dispatch_accepted",
      actor: options.actor,
      requestId,
      summary: `Cloudflare accepted the request and started build ${outcome.buildId}.`,
      detail: { buildId: outcome.buildId },
    });

    return { kind: "dispatched", requestId, buildId: outcome.buildId };
  }

  if (outcome.kind === "refused") {
    const detail = redactSecrets(outcome.detail, [availability.config.apiToken]);
    await db
      .update(t.deploymentRequests)
      .set({ state: "refused", lastError: detail })
      .where(eq(t.deploymentRequests.id, requestId));

    await recordEvent(db, {
      kind: "dispatch_refused",
      actor: options.actor,
      requestId,
      summary: `Cloudflare refused the request (HTTP ${outcome.status}).`,
      detail: { status: outcome.status, detail },
    });

    return { kind: "refused", requestId, detail };
  }

  const detail = redactSecrets(outcome.detail, [availability.config.apiToken]);
  await db
    .update(t.deploymentRequests)
    .set({ state: "dispatch_unknown", lastError: detail })
    .where(eq(t.deploymentRequests.id, requestId));

  await recordEvent(db, {
    kind: "dispatch_unknown",
    actor: options.actor,
    requestId,
    summary:
      "The outcome of this request was never established. A build may or may " +
      "not have been queued, so nothing here will retry automatically.",
    detail: { detail },
  });

  return { kind: "unknown", requestId, detail };
}

/**
 * Record what production is serving, from the artifact's own manifest.
 *
 * The only writer of `production_verified`, and therefore the only thing in
 * this system that can make anything Live.
 *
 * Idempotent: re-running it against an unchanged production writes no new
 * artifact — `deployment_artifacts_identity` makes (generated_at, digest) the
 * artifact's identity, so a second verification of the same deployment finds
 * the existing row. It does append a fresh `production_verified` event, and
 * that is correct rather than noise: each one is a distinct observation with
 * its own timestamp, and "still serving this at 14:05" is a different fact from
 * "was serving this at 14:00".
 */
export async function verifyProduction(
  db: DeploymentStore,
  options: {
    readonly transport: VerifyTransport;
    readonly actor: string;
    readonly origin?: string;
  },
): Promise<
  | { readonly kind: "verified"; readonly artifactId: string; readonly manifest: DeploymentManifest }
  | { readonly kind: "unverifiable"; readonly detail: string }
> {
  const origin = options.origin ?? PRODUCTION_ORIGIN;

  // OUTSIDE every transaction, and that ordering is load-bearing. This is an
  // HTTP request to a remote origin over the public internet; holding a
  // database transaction open across one would pin a connection and its locks
  // for as long as a third party takes to answer, which is the same mistake
  // dispatch avoids by committing before it calls Cloudflare.
  const check = await readProductionManifest(options.transport, origin);

  if (check.kind === "unverifiable") {
    await recordEvent(db, {
      kind: "production_unverifiable",
      actor: options.actor,
      summary: `Could not establish what ${origin} is serving: ${check.rejection}.`,
      detail: { origin, rejection: check.rejection, detail: check.detail },
    });
    return { kind: "unverifiable", detail: check.detail };
  }

  const manifest = check.manifest;

  // The network is done. Everything below is ONE observation and commits as
  // one unit — see `persistVerifiedObservation`.
  try {
    const artifactId = await inOneTransaction(db, (tx) =>
      persistVerifiedObservation(tx, manifest, options.actor, origin),
    );
    return { kind: "verified", artifactId, manifest };
  } catch (error) {
    if (!(error instanceof ContradictedArtifactError)) throw error;

    // Recorded outside the rolled-back transaction, because the refusal is the
    // one thing that must survive it.
    await recordEvent(db, {
      kind: "production_unverifiable",
      actor: options.actor,
      summary: `Refused to record what ${origin} is serving: ${error.message}`,
      detail: { origin, rejection: "contradicted-artifact", detail: error.message },
    });
    return { kind: "unverifiable", detail: error.message };
  }
}

/**
 * An artifact identity that two different artifacts are both claiming.
 *
 * `deployment_artifacts_identity` makes `(generated_at, digest)` an artifact's
 * identity. If a row already carries that identity but describes a different
 * build, or carries a membership list that does not match the manifest just
 * read, then one of the two records is wrong and this code cannot tell which.
 * Both readings are refused: certifying either would put a false Live proof in
 * front of an editor, and the rows are immutable so a wrong one is permanent.
 */
class ContradictedArtifactError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContradictedArtifactError";
  }
}

/**
 * Write one verification observation: artifact identity, complete membership,
 * the `production_verified` event, and any request the build settles.
 *
 * ── Why this is one transaction and not four statements ────────────────────
 *
 * It used to be four autocommits, and the failure mode was permanent. A crash
 * between the artifact insert and the membership insert left an immutable
 * artifact row with no members; every later verification then matched that row
 * on `(generated_at, digest)`, took the `existing` branch, and skipped the
 * membership insert forever. The tool would report a *proven* deployment
 * containing nothing — so every published profile read "awaiting deployment",
 * which is the confident false negative the three-state model exists to
 * prevent. The append-only triggers refuse UPDATE and DELETE, so nothing in
 * the application could ever repair it.
 *
 * An artifact and the list of what it contained are one fact. They now commit
 * together or not at all.
 */
async function persistVerifiedObservation(
  tx: DeploymentStore,
  manifest: DeploymentManifest,
  actor: string,
  origin: string,
): Promise<string> {
  const generatedAt = new Date(manifest.generatedAt);

  const [existing] = await tx
    .select()
    .from(t.deploymentArtifacts)
    .where(
      and(
        eq(t.deploymentArtifacts.generatedAt, generatedAt),
        eq(t.deploymentArtifacts.digest, manifest.digest),
      ),
    )
    .limit(1);

  const expectedMembers = new Set(
    manifest.entries.map((entry) => entry.evaluationId),
  );
  if (expectedMembers.size !== manifest.entries.length) {
    throw new ContradictedArtifactError(
      "the manifest names the same evaluation twice, so what the artifact " +
        "contains cannot be recorded unambiguously",
    );
  }

  let artifactId: string;

  if (existing) {
    // Re-observation. Idempotent by design: the same deployment verified twice
    // is one artifact and two observations. But "the same identity" must mean
    // "the same artifact", so anything that disagrees is refused rather than
    // quietly re-certified.
    assertArtifactAgrees(existing, manifest);

    const members = await tx
      .select({ evaluationId: t.deploymentArtifactEvaluations.evaluationId })
      .from(t.deploymentArtifactEvaluations)
      .where(eq(t.deploymentArtifactEvaluations.artifactId, existing.id));

    const recorded = new Set(members.map((member) => member.evaluationId));
    const complete =
      recorded.size === expectedMembers.size &&
      [...expectedMembers].every((id) => recorded.has(id));

    if (!complete) {
      // Only reachable for a row written before this function existed, since
      // nothing can now commit an artifact without its membership. Refusing is
      // the honest answer: the row is immutable, so it cannot be completed, and
      // deriving Live from it would under-report every profile it omits.
      throw new ContradictedArtifactError(
        `an artifact with this identity was already recorded with ` +
          `${recorded.size} member(s), but the manifest names ` +
          `${expectedMembers.size}; the record is immutable and cannot be ` +
          "completed, so nothing is certified from it",
      );
    }

    artifactId = existing.id;
  } else {
    const [inserted] = await tx
      .insert(t.deploymentArtifacts)
      .values({
        generatedAt,
        digest: manifest.digest,
        buildUuid: manifest.buildUuid,
        commitSha: manifest.commitSha,
        branch: manifest.branch,
        siteEnv: manifest.siteEnv,
        source: manifest.source,
        rubricVersion: manifest.rubricVersion,
        manifest,
      })
      .returning({ id: t.deploymentArtifacts.id });
    artifactId = inserted!.id;

    if (manifest.entries.length > 0) {
      await tx.insert(t.deploymentArtifactEvaluations).values(
        manifest.entries.map((entry) => ({
          artifactId,
          evaluationId: entry.evaluationId,
        })),
      );
    }
  }

  await recordEvent(tx, {
    kind: "production_verified",
    actor,
    artifactId,
    summary:
      `${origin} is serving a ${manifest.source}-backed artifact carrying ` +
      `${manifest.entries.length} profile(s)` +
      (manifest.buildUuid ? `, from build ${manifest.buildUuid}` : "") +
      ".",
    detail: {
      origin,
      digest: manifest.digest,
      buildUuid: manifest.buildUuid,
      commitSha: manifest.commitSha,
      generatedAt: manifest.generatedAt,
      source: manifest.source,
    },
  });

  // A verified artifact settles any request that asked for exactly this build.
  // Nothing else can settle one: matching on build uuid is the only link
  // between "we asked" and "this is what is being served".
  if (manifest.buildUuid) {
    const [matching] = await tx
      .select({ id: t.deploymentRequests.id, state: t.deploymentRequests.state })
      .from(t.deploymentRequests)
      .where(eq(t.deploymentRequests.providerBuildId, manifest.buildUuid))
      .limit(1);

    if (matching && !RESOLVED_STATES.some((state) => state === matching.state)) {
      await tx
        .update(t.deploymentRequests)
        .set({ state: "build_reported_success", lastCheckedAt: new Date() })
        .where(eq(t.deploymentRequests.id, matching.id));

      await recordEvent(tx, {
        kind: "build_status_observed",
        actor,
        requestId: matching.id,
        artifactId,
        summary:
          `Build ${manifest.buildUuid} is the artifact production is serving, ` +
          "so this request is complete.",
      });
    }
  }

  return artifactId;
}

/** The identifying fields an artifact cannot change without being a different one. */
function assertArtifactAgrees(
  existing: DeploymentArtifactRow,
  manifest: DeploymentManifest,
): void {
  const disagreements = (
    [
      ["buildUuid", existing.buildUuid, manifest.buildUuid],
      ["commitSha", existing.commitSha, manifest.commitSha],
      ["branch", existing.branch, manifest.branch],
      ["siteEnv", existing.siteEnv, manifest.siteEnv],
      ["source", existing.source, manifest.source],
      ["rubricVersion", existing.rubricVersion, manifest.rubricVersion],
    ] as const
  ).filter(([, recorded, claimed]) => recorded !== claimed);

  if (disagreements.length > 0) {
    throw new ContradictedArtifactError(
      "an artifact with this identity was already recorded with a different " +
        disagreements
          .map(([field, recorded, claimed]) => `${field} (${recorded} vs ${claimed})`)
          .join(", "),
    );
  }
}

/**
 * Ask Cloudflare what became of the builds we are still waiting on.
 *
 * ADVISORY. Nothing here makes anything Live; it exists so an editor looking at
 * a deployment that never arrived can see whether the build failed, is still
 * running, or was never visible at all.
 *
 * A request in `dispatch_unknown` is skipped, because there is no build id to
 * ask about — that is what `dispatch_unknown` means. Those are settled by an
 * editor (`settleDeploymentRequest`) or by a verification that matches a build
 * uuid, and never by this function guessing.
 */
export async function refreshBuildStatuses(
  db: DeploymentStore,
  options: {
    readonly transport: CloudflareTransport;
    readonly actor: string;
    readonly env?: Readonly<Record<string, string | undefined>>;
  },
): Promise<{ readonly checked: number; readonly detail: string | null }> {
  const availability = deployAvailability(options.env ?? process.env);
  if (!availability.available) {
    return { checked: 0, detail: explainDeployUnavailable(availability.reason) };
  }

  const open = (await unresolvedRequests(db)).filter(
    (request) => request.providerBuildId !== null,
  );

  for (const request of open) {
    const status = await readBuildStatus(
      options.transport,
      availability.config,
      request.providerBuildId!,
    );

    if (status.kind === "unavailable") {
      await recordEvent(db, {
        kind: "build_status_observed",
        actor: options.actor,
        requestId: request.id,
        summary: `Build status could not be read: ${status.detail}`,
      });
      continue;
    }

    if (status.kind === "not-found") {
      await db
        .update(t.deploymentRequests)
        .set({ lastCheckedAt: new Date() })
        .where(eq(t.deploymentRequests.id, request.id));
      await recordEvent(db, {
        kind: "build_status_observed",
        actor: options.actor,
        requestId: request.id,
        summary:
          `Build ${request.providerBuildId} is not in Cloudflare's recent list. ` +
          "That says nothing about whether it succeeded, so this request is left as it is.",
      });
      continue;
    }

    // Cloudflare does not document its status vocabulary, so an unrecognised
    // value must not be forced into a verdict. Only the two shapes that are
    // unambiguous move the request; anything else is recorded verbatim and the
    // request keeps waiting.
    const outcome = (status.buildOutcome ?? "").toLowerCase();
    const nextState =
      outcome === "success"
        ? ("build_reported_success" as const)
        : outcome === "failure" || outcome === "canceled" || outcome === "cancelled"
          ? ("build_reported_failure" as const)
          : null;

    await db
      .update(t.deploymentRequests)
      .set({
        ...(nextState ? { state: nextState } : {}),
        providerStatus: status.status,
        lastCheckedAt: new Date(),
      })
      .where(eq(t.deploymentRequests.id, request.id));

    await recordEvent(db, {
      kind: "build_status_observed",
      actor: options.actor,
      requestId: request.id,
      summary:
        `Cloudflare reports build ${request.providerBuildId} as "${status.status}"` +
        (status.buildOutcome ? ` (outcome "${status.buildOutcome}")` : "") +
        ". A build report is not proof that production serves its output.",
      detail: { status: status.status, buildOutcome: status.buildOutcome },
    });
  }

  return { checked: open.length, detail: null };
}

/**
 * An operator settling a durable request that is never going to resolve itself.
 *
 * ── The dead ends this exists to remove ────────────────────────────────────
 *
 * A request blocks every later `manual`/`retry` while it is unresolved, and
 * three unresolved states could not be resolved by anything in the application:
 *
 *   pending           the row committed, then the process died before the
 *                     dispatch outcome could be written. No build id, so
 *                     `refreshBuildStatuses` skips it and verification has
 *                     nothing to match.
 *   dispatched        a build id exists, but its outcome cannot be read —
 *                     `CLOUDFLARE_WORKER_TAG` is unset (it is documented
 *                     optional), or the build has aged off Cloudflare's list,
 *                     or it failed and so will never appear in a manifest.
 *   dispatch_unknown  the POST outcome was never established, so there is no
 *                     build id to ask about at all.
 *
 * Each of those left the tool permanently unable to request another build, with
 * no repair short of hand-written SQL — and the retry path is disabled exactly
 * when a first build has failed and retrying is what an operator needs.
 *
 * ── Why `superseded`, and not `refused` ────────────────────────────────────
 *
 * `superseded` is the state 0009 already defines for a request that is no
 * longer the one being awaited ("a build is dispatched, then reports, then is
 * superseded"). It is the only honest terminal state here, because it is a fact
 * about *this tool's* intent rather than a claim about Cloudflare:
 *
 *   refused                  Cloudflare declined; no build exists
 *   build_reported_success   a build process exited 0
 *   build_reported_failure   a build process did not
 *   superseded               we have stopped waiting for this request
 *
 * Only the last of those is something an operator can know without provider
 * truth. Settling never writes the other three, so the trail cannot come to
 * contain a fabricated provider outcome — which also means settling a
 * `dispatched` request does NOT assert its build failed. It may yet succeed and
 * deploy; if it does, verification records the artifact and Live from the
 * manifest exactly as it would have, because Live is derived from evidence
 * about production and never from a request's state.
 *
 * ── What is preserved ──────────────────────────────────────────────────────
 *
 * Nothing is deleted or rewritten: the request keeps its reason, requester,
 * branch and `provider_build_id` (frozen by trigger anyway), and an event is
 * appended recording the state it was settled *from*, the build id if there was
 * one, and that a named person decided. The active-request guard is preserved
 * rather than weakened — `superseded` is a resolved state, so the guard stops
 * blocking because the request genuinely stopped being open, not because the
 * check was loosened.
 *
 * And it only ever settles a request that is *still open at the moment it is
 * written*. A request that resolved while the operator was looking at it is
 * refused rather than overwritten, so an observed provider outcome cannot be
 * replaced by a human judgement and the recorded prior state is the one the
 * settlement actually replaced. See the lock inside the transaction below.
 *
 * No network call and no transaction across one: settling is a local judgement
 * about a local row.
 */
export async function settleDeploymentRequest(
  db: DeploymentStore,
  requestId: string,
  actor: string,
): Promise<void> {
  const [seen] = await db
    .select({ state: t.deploymentRequests.state })
    .from(t.deploymentRequests)
    .where(eq(t.deploymentRequests.id, requestId))
    .limit(1);

  // Rules, not faults: both are things an editor can legitimately run into by
  // having two tabs open, and both belong next to the button rather than on an
  // error page. This read is for the message; the decision is made under a lock
  // below, because by the time the write happens this answer may be stale.
  if (!seen) {
    throw new EditorialRuleError("That deployment request does not exist.");
  }
  if (!UNRESOLVED_STATES.some((state) => state === seen.state)) {
    throw new EditorialRuleError(
      "Only a request that is still open can be settled by hand. This one is " +
        `"${seen.state.replace(/_/g, " ")}", so there is nothing left to ` +
        "decide.",
    );
  }

  await inOneTransaction(db, async (tx) => {
    /*
     * Lock the row BEFORE deciding, because the check above is not the write.
     *
     * The read above happens on its own statement and its own snapshot, and
     * another operation can resolve this request before the update below runs.
     * `verifyProduction` does exactly that: it settles a matching request to
     * `build_reported_success` the moment a production manifest names its build
     * uuid, on a different connection, in a transaction of its own. An
     * unconditional update would then overwrite an outcome the provider was
     * actually observed to produce with `superseded`, and append an immutable
     * event naming a prior state the row had already left — a false record in
     * the one table that refuses UPDATE and DELETE and so can never be
     * corrected.
     *
     * `FOR UPDATE` is the same mechanism `finalizePublication` uses for the
     * same reason: from this statement onward nothing else can change this row
     * until this transaction ends, so what is read here is what is written, and
     * `priorState` describes the row the settlement actually replaced. A
     * concurrent resolver either committed before this lock was taken — in
     * which case the state read here is the resolved one and settlement is
     * refused — or waits, and finds the request already `superseded`.
     */
    const [request] = await tx
      .select()
      .from(t.deploymentRequests)
      .where(eq(t.deploymentRequests.id, requestId))
      .for("update");

    if (!request) {
      throw new EditorialRuleError("That deployment request does not exist.");
    }
    if (!UNRESOLVED_STATES.some((state) => state === request.state)) {
      throw new EditorialRuleError(
        "This request resolved while you were looking at it, so there is " +
          "nothing left to settle.",
      );
    }

    const priorState = request.state;

    // Compare-and-set, saying the same thing again where the write happens.
    // Under the lock above this cannot fail; it is here so that the statement
    // which changes the state also carries the condition the change depends on,
    // rather than leaving that condition somewhere a later edit might move.
    const settled = await tx
      .update(t.deploymentRequests)
      .set({ state: "superseded", lastCheckedAt: new Date() })
      .where(
        and(
          eq(t.deploymentRequests.id, requestId),
          inArray(t.deploymentRequests.state, [...UNRESOLVED_STATES]),
        ),
      )
      .returning({ id: t.deploymentRequests.id });

    if (settled.length === 0) {
      throw new EditorialRuleError(
        "This request resolved while you were looking at it, so there is " +
          "nothing left to settle.",
      );
    }

    await recordEvent(tx, {
      kind: "dispatch_coalesced",
      actor,
      requestId,
      summary:
        `An editor stopped waiting for this request, which was ` +
        `"${priorState.replace(/_/g, " ")}"` +
        (request.providerBuildId
          ? ` after Cloudflare accepted build ${request.providerBuildId}`
          : "") +
        ". Recorded as a human judgement, not an observation: nothing here " +
        "claims what Cloudflare did, and if that build does deploy, " +
        "verification will still prove it from the manifest.",
      detail: {
        resolution: "settled_by_operator",
        priorState,
        priorProviderBuildId: request.providerBuildId,
        priorProviderStatus: request.providerStatus,
      },
    });
  });
}

/* ===========================================================================
 * Derivation — what an editor is shown.
 * ======================================================================== */

export type LiveProof =
  | {
      readonly kind: "proven";
      readonly artifact: DeploymentArtifactRow;
      readonly observedAt: Date;
      readonly evaluationIds: ReadonlySet<string>;
    }
  | { readonly kind: "unproven"; readonly detail: string };

/**
 * The most recently *verified* production deployment, and nothing else.
 *
 * Deliberately not "the newest artifact": a rollback makes an older artifact
 * the current one, and ordering by build time would report the rolled-back
 * version as Live forever. The question is which observation is most recent,
 * so the answer comes from the observation, not from the thing observed.
 */
export async function readLiveProof(db: DeploymentStore): Promise<LiveProof> {
  const [latest] = await db
    .select({
      artifact: t.deploymentArtifacts,
      observedAt: t.deploymentEvents.occurredAt,
    })
    .from(t.deploymentEvents)
    .innerJoin(
      t.deploymentArtifacts,
      eq(t.deploymentArtifacts.id, t.deploymentEvents.artifactId),
    )
    .where(eq(t.deploymentEvents.kind, "production_verified"))
    // `seq` is the tie-break, not decoration: two verifications inside one
    // transaction share an `occurred_at`, and without it a rollback can report
    // the artifact that was rolled back AWAY FROM as the current one.
    .orderBy(desc(t.deploymentEvents.occurredAt), desc(t.deploymentEvents.seq))
    .limit(1);

  if (!latest) {
    return {
      kind: "unproven",
      detail:
        "Production has never been verified from this tool, so nothing can be " +
        "reported as Live. Publishing is unaffected — this is a gap in " +
        "evidence, not in the site.",
    };
  }

  const members = await db
    .select({ evaluationId: t.deploymentArtifactEvaluations.evaluationId })
    .from(t.deploymentArtifactEvaluations)
    .where(eq(t.deploymentArtifactEvaluations.artifactId, latest.artifact.id));

  return {
    kind: "proven",
    artifact: latest.artifact,
    observedAt: latest.observedAt,
    evaluationIds: new Set(members.map((member) => member.evaluationId)),
  };
}

/**
 * How one evaluation stands against what production serves.
 *
 *   live                    the verified artifact contains this version
 *   awaiting_deployment     production was verified and serves a different
 *                           version of this scope, and THIS one is the current
 *                           published version — so a deployment is genuinely
 *                           outstanding
 *   no_longer_served        production was verified and does not contain this
 *                           version, and this version has been superseded —
 *                           it is history, and nothing is outstanding
 *   unproven                production has not been verified recently enough
 *                           to say either way
 *
 * The third exists because the other three were once said with two words too
 * few. A superseded snapshot that production no longer serves was reported as
 * "Published and awaiting deployment", which is false twice over: it is not the
 * published version, and no deployment will ever make it Live again. A
 * superseded version production IS still serving remains `live`, because that
 * is true and is exactly the situation §9.8 asks the tool to surface.
 */
export type PublishedDeploymentStatus =
  | "live"
  | "awaiting_deployment"
  | "no_longer_served"
  | "unproven";

export interface PublishedDeploymentRow {
  readonly evaluationId: string;
  readonly versionNumber: number;
  readonly publishedAt: Date | null;
  readonly gameId: string;
  readonly gameTitle: string;
  readonly gameSlug: string;
  readonly scopeId: string;
  readonly scopeLabel: string;
  readonly status: PublishedDeploymentStatus;
}

/** A version production is still serving that this database no longer publishes. */
export interface StaleServedRow {
  readonly evaluationId: string;
  readonly gameSlug: string;
  readonly scopeKey: string;
  readonly versionNumber: number;
  /** `superseded` when the row is recognised; null when the id is unknown here. */
  readonly status: string | null;
}

export interface DeploymentOverview {
  readonly live: LiveProof;
  readonly published: readonly PublishedDeploymentRow[];
  readonly stillServed: readonly StaleServedRow[];
  readonly openRequests: readonly DeploymentRequestRow[];
  readonly recentRequests: readonly DeploymentRequestRow[];
  readonly recentEvents: readonly DeploymentEventRow[];
  readonly configured: boolean;
  readonly configurationDetail: string | null;
}

/**
 * Everything the deployment page shows, derived in one pass.
 *
 * Both directions are reported, because both are real and only one of them is
 * obvious:
 *
 *   published but not served   the ordinary awaiting-deployment gap
 *   served but not published   a superseded version production still serves,
 *                              which is §9.8's "previous deployed artifact
 *                              remains Live" and is invisible if you only ever
 *                              ask about the current corpus
 */
export async function readDeploymentOverview(
  db: DeploymentStore,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<DeploymentOverview> {
  const live = await readLiveProof(db);

  const publishedRows = await db
    .select({
      evaluationId: t.evaluations.id,
      versionNumber: t.evaluations.versionNumber,
      publishedAt: t.evaluations.publishedAt,
      gameId: t.games.id,
      gameTitle: t.games.canonicalTitle,
      gameSlug: t.games.slug,
      scopeId: t.profileScopes.id,
      scopeLabel: t.profileScopes.label,
    })
    .from(t.evaluations)
    .innerJoin(t.games, eq(t.games.id, t.evaluations.gameId))
    .innerJoin(t.profileScopes, eq(t.profileScopes.id, t.evaluations.scopeId))
    .where(
      and(
        eq(t.evaluations.status, "published"),
        eq(t.evaluations.rubricVersion, PUBLIC_RUBRIC_VERSION),
      ),
    )
    .orderBy(t.games.canonicalTitle, t.profileScopes.displayOrder);

  const published: PublishedDeploymentRow[] = publishedRows.map((row) => ({
    ...row,
    status:
      live.kind !== "proven"
        ? "unproven"
        : live.evaluationIds.has(row.evaluationId)
          ? "live"
          : "awaiting_deployment",
  }));

  const stillServed: StaleServedRow[] = [];
  if (live.kind === "proven") {
    const publishedIds = new Set(publishedRows.map((row) => row.evaluationId));
    const manifest = live.artifact.manifest as DeploymentManifest;
    const strangers = manifest.entries.filter(
      (entry) => !publishedIds.has(entry.evaluationId),
    );

    if (strangers.length > 0) {
      /*
       * The ids may not be evaluations at all, and the shape filter is load-
       * bearing rather than defensive.
       *
       * `evaluations.id` is a `uuid` column. A fixture-backed artifact names
       * keys like `evl_returnal_v1`, and asking Postgres for
       * `id IN ('evl_returnal_v1')` is not an empty result — it is a type
       * error that fails the query and takes this whole page down with it. So
       * anything that is not a uuid is answered without asking: it is
       * definitively not a row in this table.
       */
      const lookupIds = strangers
        .map((entry) => entry.evaluationId)
        .filter((id) => UUID_SHAPE.test(id));

      const known = lookupIds.length
        ? await db
            .select({ id: t.evaluations.id, status: t.evaluations.status })
            .from(t.evaluations)
            .where(inArray(t.evaluations.id, lookupIds))
        : [];
      const statusById = new Map(known.map((row) => [row.id, row.status]));

      for (const entry of strangers) {
        stillServed.push({
          evaluationId: entry.evaluationId,
          gameSlug: entry.gameSlug,
          scopeKey: entry.scopeKey,
          versionNumber: entry.versionNumber,
          status: statusById.get(entry.evaluationId) ?? null,
        });
      }
    }
  }

  const recentRequests = await db
    .select()
    .from(t.deploymentRequests)
    .orderBy(desc(t.deploymentRequests.requestedAt))
    .limit(10);

  const recentEvents = await db
    .select()
    .from(t.deploymentEvents)
    .orderBy(desc(t.deploymentEvents.occurredAt), desc(t.deploymentEvents.seq))
    .limit(25);

  const availability = deployAvailability(env);

  return {
    live,
    published,
    stillServed,
    openRequests: recentRequests.filter((request) =>
      UNRESOLVED_STATES.some((state) => state === request.state),
    ),
    recentRequests,
    recentEvents,
    configured: availability.available,
    configurationDetail: availability.available
      ? null
      : explainDeployUnavailable(availability.reason),
  };
}

/** ENTRYPOINT — the deployment page, for a verified editor. */
export async function readDeploymentOverviewPage(): Promise<DeploymentOverview> {
  return withAuthorizedAdminDatabase((db) => readDeploymentOverview(db));
}

/**
 * ENTRYPOINT — how one evaluation stands, for the Publish page.
 *
 * Cheap on purpose: the Publish page asks about a single evaluation and must
 * not pay for the whole overview to answer.
 */
export async function readEvaluationDeploymentStatus(
  evaluationId: string,
): Promise<{
  readonly status: PublishedDeploymentStatus;
  readonly live: LiveProof;
}> {
  await requireEditor();
  return withAuthorizedAdminDatabase(async (db) => {
    const live = await readLiveProof(db);
    return {
      live,
      status: await evaluationDeploymentStatus(db, live, evaluationId),
    };
  });
}

/**
 * How one evaluation stands, given what production was last proven to serve.
 *
 * ── Why the evaluation's own status is an input ────────────────────────────
 *
 * "Production does not contain this version" is the same observation for a
 * published version and a superseded one, and it means opposite things:
 *
 *   published + not served    a deployment is outstanding
 *   superseded + not served   history, and nothing is outstanding
 *
 * Reading both as "awaiting deployment" told an editor that a version they had
 * already replaced was Published and waiting for a build that no build could
 * ever deliver.
 *
 * Superseded AND served stays `live`, because it is true: §9.8's "the previous
 * deployed artifact remains Live" is precisely this, and it is invisible to
 * anything that only asks about the current corpus.
 */
export async function evaluationDeploymentStatus(
  db: DeploymentStore,
  live: LiveProof,
  evaluationId: string,
): Promise<PublishedDeploymentStatus> {
  if (live.kind !== "proven") return "unproven";
  if (live.evaluationIds.has(evaluationId)) return "live";

  // The shape filter is the one `readDeploymentOverview` needs, for the same
  // reason: `evaluations.id` is a `uuid` column, and handing it a non-uuid is a
  // type error that fails the query and takes the page down, not an empty
  // result. A manifest can name ids that are not evaluations at all.
  const [record] = UUID_SHAPE.test(evaluationId)
    ? await db
        .select({ status: t.evaluations.status })
        .from(t.evaluations)
        .where(eq(t.evaluations.id, evaluationId))
        .limit(1)
    : [];

  return record?.status === "superseded"
    ? "no_longer_served"
    : "awaiting_deployment";
}
