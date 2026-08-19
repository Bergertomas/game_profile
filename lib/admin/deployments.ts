import { and, desc, eq, inArray } from "drizzle-orm";
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

  const open = await unresolvedRequests(db);

  if (options.reason === "publication" && options.triggeringEvaluationId) {
    const duplicate = open.find(
      (request) =>
        request.triggeringEvaluationId === options.triggeringEvaluationId,
    );
    if (duplicate) {
      const detail =
        `A production build for this publication was already requested at ` +
        `${duplicate.requestedAt.toISOString()} and has not resolved.`;
      await recordEvent(db, {
        kind: "dispatch_coalesced",
        actor: options.actor,
        requestId: duplicate.id,
        summary: detail,
      });
      return { kind: "coalesced", requestId: duplicate.id, detail };
    }
  }

  if (options.reason !== "publication" && open.length > 0) {
    const blocking = open[0]!;
    const detail =
      `A production build requested at ${blocking.requestedAt.toISOString()} ` +
      `is still ${blocking.state.replace(/_/g, " ")}. Check it before asking ` +
      "for another, so two builds are not racing for the same corpus.";
    await recordEvent(db, {
      kind: "dispatch_coalesced",
      actor: options.actor,
      requestId: blocking.id,
      summary: detail,
    });
    return { kind: "coalesced", requestId: blocking.id, detail };
  }

  const [created] = await db
    .insert(t.deploymentRequests)
    .values({
      reason: options.reason,
      branch: PRODUCTION_BRANCH,
      requestedBy: options.actor,
      triggeringEvaluationId: options.triggeringEvaluationId ?? null,
    })
    .returning({ id: t.deploymentRequests.id });

  const requestId = created!.id;

  await recordEvent(db, {
    kind: "dispatch_attempted",
    actor: options.actor,
    requestId,
    summary: `Asking Cloudflare Workers Builds to build ${PRODUCTION_BRANCH}.`,
    detail: { reason: options.reason },
  });

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
  const generatedAt = new Date(manifest.generatedAt);

  const [existing] = await db
    .select({ id: t.deploymentArtifacts.id })
    .from(t.deploymentArtifacts)
    .where(
      and(
        eq(t.deploymentArtifacts.generatedAt, generatedAt),
        eq(t.deploymentArtifacts.digest, manifest.digest),
      ),
    )
    .limit(1);

  let artifactId = existing?.id;

  if (!artifactId) {
    const [inserted] = await db
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
      await db.insert(t.deploymentArtifactEvaluations).values(
        manifest.entries.map((entry) => ({
          artifactId: artifactId!,
          evaluationId: entry.evaluationId,
        })),
      );
    }
  }

  await recordEvent(db, {
    kind: "production_verified",
    actor: options.actor,
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
    const [matching] = await db
      .select({ id: t.deploymentRequests.id, state: t.deploymentRequests.state })
      .from(t.deploymentRequests)
      .where(eq(t.deploymentRequests.providerBuildId, manifest.buildUuid))
      .limit(1);

    if (matching && !RESOLVED_STATES.some((state) => state === matching.state)) {
      await db
        .update(t.deploymentRequests)
        .set({ state: "build_reported_success", lastCheckedAt: new Date() })
        .where(eq(t.deploymentRequests.id, matching.id));

      await recordEvent(db, {
        kind: "build_status_observed",
        actor: options.actor,
        requestId: matching.id,
        artifactId,
        summary:
          `Build ${manifest.buildUuid} is the artifact production is serving, ` +
          "so this request is complete.",
      });
    }
  }

  return { kind: "verified", artifactId, manifest };
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
 * editor (`markDispatchNotDelivered`) or by a verification that matches a build
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
 * An editor settling a request whose outcome nothing could establish.
 *
 * `dispatch_unknown` cannot be resolved by looking, because there is no build id
 * to look for. Leaving it open forever would block every later manual request;
 * clearing it automatically would risk a duplicate production build. So a person
 * decides, and the trail records that a person decided and who.
 */
export async function markDispatchNotDelivered(
  db: DeploymentStore,
  requestId: string,
  actor: string,
): Promise<void> {
  const [request] = await db
    .select()
    .from(t.deploymentRequests)
    .where(eq(t.deploymentRequests.id, requestId))
    .limit(1);

  // Rules, not faults: both are things an editor can legitimately run into by
  // having two tabs open, and both belong next to the button rather than on an
  // error page.
  if (!request) {
    throw new EditorialRuleError("That deployment request does not exist.");
  }
  if (request.state !== "dispatch_unknown") {
    throw new EditorialRuleError(
      "Only a request whose dispatch outcome was never established can be " +
        `settled by hand. This one is "${request.state.replace(/_/g, " ")}", ` +
        "so there is nothing left to decide.",
    );
  }

  await db
    .update(t.deploymentRequests)
    .set({ state: "refused", lastCheckedAt: new Date() })
    .where(eq(t.deploymentRequests.id, requestId));

  await recordEvent(db, {
    kind: "dispatch_refused",
    actor,
    requestId,
    summary:
      "An editor confirmed this request produced no build, after checking " +
      "Cloudflare directly. Recorded as a human judgement, not an observation.",
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

/** How a published evaluation stands against what production serves. */
export type PublishedDeploymentStatus =
  | "live"
  | "awaiting_deployment"
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
      status:
        live.kind !== "proven"
          ? "unproven"
          : live.evaluationIds.has(evaluationId)
            ? "live"
            : "awaiting_deployment",
    };
  });
}
