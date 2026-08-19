import { DeploymentAction } from "@/components/admin/DeploymentControls";
import {
  AdminLink,
  DefinitionRow,
  Empty,
  Notice,
  Panel,
  Pill,
} from "@/components/admin/ui";
import {
  checkDeploymentAction,
  markDispatchNotDeliveredAction,
  requestDeploymentAction,
} from "@/app/admin/deployment-actions";
import {
  PRODUCTION_ORIGIN,
  readDeploymentOverviewPage,
  type PublishedDeploymentStatus,
} from "@/lib/admin/deployments";

/**
 * Published, awaiting deployment, and Live — Phase 2D-2 (Master Plan §9.8).
 *
 * ── What this page is, in one sentence ─────────────────────────────────────
 *
 * The place where the editorial database's opinion and production's actual
 * contents are put side by side, and every disagreement between them is named.
 *
 * ── Three states, and the third one is the honest one ──────────────────────
 *
 *   Live                  the artifact production is serving contains this
 *                         version — proven by reading the artifact's own
 *                         manifest, not inferred from a build report
 *   Awaiting deployment   production was verified, and it is serving something
 *                         else for this scope
 *   Not proven            production has not been verified recently enough to
 *                         say either way
 *
 * The third exists because the alternative is worse. A tool that cannot reach
 * production and shows "awaiting deployment" is asserting that production does
 * NOT have the version — which it does not know, and which may be false. So the
 * absence of evidence is displayed as the absence of evidence.
 *
 * ── Publishing is not deploying, and neither is deploying ──────────────────
 *
 * Requesting a build does not make anything Live either. A build can fail, be
 * superseded by a later one, or succeed and then have its upload fail. Nothing
 * on this page promotes a request to a proof; only `verifyProduction` can, and
 * it does it by reading `/deployment-manifest` from the origin below.
 */
export default async function DeploymentsPage() {
  const overview = await readDeploymentOverviewPage();
  const { live } = overview;

  const awaiting = overview.published.filter(
    (row) => row.status === "awaiting_deployment",
  );
  const unproven = overview.published.filter(
    (row) => row.status === "unproven",
  );

  return (
    <>
      <h1 className="sip-display mb-2 text-[1.5rem]">Deployment</h1>
      <p className="mb-6 max-w-prose text-[0.85rem] leading-relaxed text-ink-soft">
        Publishing changes the database. Production changes when a build reads
        that database, verification succeeds, and the artifact deploys. This
        page is where the two are compared — and what it reports about
        production is read from{" "}
        <code className="text-[0.8rem]">{PRODUCTION_ORIGIN}</code> itself, never
        inferred from a build having been requested or reported successful.
      </p>

      {!overview.configured ? (
        <Notice tone="warning">
          {overview.configurationDetail} Verification still works: reading what
          production serves needs no credential.
        </Notice>
      ) : null}

      <Panel
        title="What production is serving"
        description={
          live.kind === "proven"
            ? `Last verified ${live.observedAt.toISOString().replace("T", " ").slice(0, 16)} UTC.`
            : "Unverified."
        }
      >
        {live.kind === "proven" ? (
          <dl className="m-0">
            <DefinitionRow term="Profiles served">
              {live.evaluationIds.size}
            </DefinitionRow>
            <DefinitionRow term="Corpus">
              {live.artifact.source === "database" ? (
                "Read from Postgres."
              ) : (
                <span className="text-signal-ink">
                  Read from the calibration fixtures, not the editorial
                  database. This is a healthy artifact, but no editorial
                  evaluation is Live in it.
                </span>
              )}
            </DefinitionRow>
            <DefinitionRow term="Built">
              {live.artifact.generatedAt.toISOString().replace("T", " ").slice(0, 16)}{" "}
              UTC
            </DefinitionRow>
            <DefinitionRow term="Build">
              {live.artifact.buildUuid ?? (
                <span className="text-ink-quiet">
                  none — this artifact was not built by Workers Builds
                </span>
              )}
            </DefinitionRow>
            <DefinitionRow term="Commit">
              {live.artifact.commitSha ?? (
                <span className="text-ink-quiet">not reported</span>
              )}
            </DefinitionRow>
            <DefinitionRow term="Digest">
              <code className="text-[0.75rem]">{live.artifact.digest}</code>
            </DefinitionRow>
          </dl>
        ) : (
          <Notice tone="blocked">{live.detail}</Notice>
        )}

        <div className="mt-4">
          <DeploymentAction
            label="Check production now"
            pendingLabel="Reading the manifest…"
            run={checkDeploymentAction}
            emphasis="primary"
          />
          <p className="m-0 mt-1 max-w-prose text-[0.78rem] leading-relaxed text-ink-quiet">
            Reads <code>{PRODUCTION_ORIGIN}/deployment-manifest</code> and asks
            Cloudflare what became of any build still outstanding. Nothing here
            polls on its own: until someone looks, nobody knows.
          </p>
        </div>
      </Panel>

      <Panel
        title="Published profiles"
        description={`${overview.published.length} published; ${awaiting.length} awaiting deployment; ${unproven.length} unproven.`}
      >
        {overview.published.length === 0 ? (
          <Empty>Nothing is published yet.</Empty>
        ) : (
          <ol className="m-0 list-none space-y-2 p-0">
            {overview.published.map((row) => (
              <li
                key={row.evaluationId}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule py-1.5 last:border-b-0"
              >
                <StatusPill status={row.status} />
                <span className="text-[0.9rem]">{row.gameTitle}</span>
                <span className="text-[0.82rem] text-ink-quiet">
                  {row.scopeLabel} · version {row.versionNumber}
                </span>
                <span className="ml-auto text-[0.8rem]">
                  <AdminLink href={`/admin/evaluations/${row.evaluationId}/preview`}>
                    Preview
                  </AdminLink>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      {overview.stillServed.length > 0 ? (
        <Panel
          title="Still served, no longer published"
          description="Production is serving versions this database does not currently publish. This is the ordinary state between a publication and its deployment — and the reason a superseded version is not automatically gone from the site."
        >
          <ol className="m-0 list-none space-y-2 p-0">
            {overview.stillServed.map((row) => (
              <li
                key={row.evaluationId}
                className="border-b border-rule py-1.5 text-[0.85rem] last:border-b-0"
              >
                <code className="text-[0.78rem]">{row.gameSlug}</code>
                {" · "}
                {row.scopeKey} · version {row.versionNumber}{" "}
                <span className="text-ink-quiet">
                  (
                  {row.status
                    ? `this database has it as ${row.status}`
                    : "this database does not recognise that id at all"}
                  )
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      ) : null}

      <Panel
        title="Build requests"
        description="One row per production build this tool asked for. A build reads the whole corpus, so one can carry several publications."
        actions={
          <DeploymentAction
            label="Request a production build"
            pendingLabel="Asking Cloudflare…"
            run={requestDeploymentAction.bind(null, "manual")}
            confirm="This asks Cloudflare to build and deploy main. Continue?"
          />
        }
      >
        {overview.recentRequests.length === 0 ? (
          <Empty>No production build has been requested from this tool.</Empty>
        ) : (
          <ol className="m-0 list-none space-y-3 p-0">
            {overview.recentRequests.map((request) => (
              <li
                key={request.id}
                className="border-l-2 border-rule-strong pl-3 text-[0.85rem]"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Pill
                    tone={
                      request.state === "build_reported_failure" ||
                      request.state === "refused"
                        ? "past"
                        : request.state === "build_reported_success"
                          ? "live"
                          : "draft"
                    }
                  >
                    {request.state.replace(/_/g, " ")}
                  </Pill>
                  <span className="text-ink-quiet">
                    {request.reason} · {request.requestedBy}
                  </span>
                  <span className="text-ink-quiet">
                    {request.requestedAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                  </span>
                </div>
                {request.providerBuildId ? (
                  <p className="m-0 mt-1 text-[0.78rem] text-ink-quiet">
                    build <code>{request.providerBuildId}</code>
                    {request.providerStatus
                      ? ` · Cloudflare reports "${request.providerStatus}"`
                      : null}
                  </p>
                ) : null}
                {request.lastError ? (
                  <p className="m-0 mt-1 max-w-prose text-[0.8rem] leading-relaxed text-signal-ink">
                    {request.lastError}
                  </p>
                ) : null}
                {request.state === "dispatch_unknown" ? (
                  <div className="mt-2">
                    <p className="m-0 mb-1 max-w-prose text-[0.78rem] leading-relaxed text-ink-quiet">
                      Nothing can settle this by looking: no build id was ever
                      returned, so there is nothing to ask Cloudflare about.
                      Check the Workers Builds dashboard; if no build was
                      created, record that here so later requests are not
                      blocked.
                    </p>
                    <DeploymentAction
                      label="No build was created"
                      pendingLabel="Recording…"
                      run={markDispatchNotDeliveredAction.bind(null, request.id)}
                    />
                  </div>
                ) : null}
                {request.state === "build_reported_failure" ? (
                  <div className="mt-2">
                    <DeploymentAction
                      label="Request another build"
                      pendingLabel="Asking Cloudflare…"
                      run={requestDeploymentAction.bind(null, "retry")}
                      confirm="This asks Cloudflare to build and deploy main again. Continue?"
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel
        title="Audit trail"
        description="Every request, every provider answer, every verification — successful or not. Append-only: the database refuses UPDATE and DELETE on these rows."
      >
        {overview.recentEvents.length === 0 ? (
          <Empty>Nothing has happened yet.</Empty>
        ) : (
          <ol className="m-0 list-none space-y-1.5 p-0">
            {overview.recentEvents.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap gap-x-3 border-b border-rule py-1 text-[0.8rem] leading-relaxed last:border-b-0"
              >
                <span className="w-32 shrink-0 text-ink-quiet">
                  {event.occurredAt.toISOString().replace("T", " ").slice(5, 16)}
                </span>
                <span className="w-44 shrink-0 uppercase tracking-wide text-ink-quiet text-[0.7rem] pt-0.5">
                  {event.kind.replace(/_/g, " ")}
                </span>
                <span className="min-w-0 flex-1">{event.summary}</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </>
  );
}

function StatusPill({ status }: { status: PublishedDeploymentStatus }) {
  if (status === "live") return <Pill tone="live">Live</Pill>;
  if (status === "awaiting_deployment") {
    return <Pill tone="draft">Awaiting deployment</Pill>;
  }
  return <Pill tone="past">Not proven</Pill>;
}
