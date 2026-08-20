import Link from "next/link";
import { notFound } from "next/navigation";
import { publishEvaluationAction } from "@/app/admin/evaluation-actions";
import { PublishPanel } from "@/components/admin/PublishPanel";
import { Notice, Panel } from "@/components/admin/ui";
import { readEvaluationDeploymentStatus } from "@/lib/admin/deployments";
import { readPublishReadiness } from "@/lib/admin/publication";

/**
 * The publish gate (Master Plan §8.8).
 *
 * ── What this page is for ──────────────────────────────────────────────────
 *
 * Postgres already refuses to publish an incomplete profile. What it cannot do
 * is tell an editor what is wrong with one *before* they try: a constraint
 * reports the first violation it reaches, by name, at the moment of failure.
 * This page is the same rules asked in advance and answered all at once, in
 * sentences — so a profile is finished by working down a list rather than by
 * pressing Publish repeatedly and reading Postgres errors.
 *
 * Which means the list being long is a success, not a failure state.
 *
 * ── Blocking and advisory are different kinds of thing ─────────────────────
 *
 * Blocking issues are rules: the database will refuse the publication, so the
 * button is disabled and no amount of intent changes that. Advisory issues are
 * prompts for a human — chiefly the spoiler read, which no program can perform
 * — and they are answered by an attestation rather than by a check passing.
 * Mixing the two would teach an editor to click past both.
 */
export default async function PublishPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const readiness = await readPublishReadiness(id);
  if (!readiness.record) notFound();

  const { record, blocking, advisory, canPublish } = readiness;
  const status = record.evaluation.status;
  const isFinal = status === "published" || status === "superseded";

  // Only asked for a final snapshot: a draft cannot be Live, so putting the
  // question to the database at all would be answering something nobody asked.
  const deployment = isFinal ? await readEvaluationDeploymentStatus(id) : null;

  return (
    <>
      {isFinal ? (
        <Notice tone="blocked">
          This evaluation is <strong>{status}</strong>.{" "}
          {status === "published"
            ? "It is the current editorially published version for this scope — which is not the same as saying production serves it, since that needs a later production build to read it, verify, and deploy successfully. A published snapshot is never edited: to change it, create a revision, which supersedes this version at the moment the revision publishes."
            : "It is preserved editorial history: it was published once and has been replaced."}
        </Notice>
      ) : null}

      {deployment ? (
        <Notice
          tone={deployment.status === "live" ? "info" : "warning"}
        >
          {deployment.status === "live"
            ? "Production is serving this version. Verified by reading the deployed artifact's own manifest, not inferred from a build report."
            : deployment.status === "awaiting_deployment"
              ? "Production was verified and is serving a different version for this scope. This version is Published and awaiting deployment."
              : "Whether production serves this version is not currently proven: it has not been verified recently enough to say either way."}{" "}
          <Link href="/admin/deployments" className="text-ink underline">
            Deployment status
          </Link>
        </Notice>
      ) : null}

      <Panel
        title="Readiness"
        description={
          canPublish
            ? "Every publication rule this profile can be checked against passes."
            : `${blocking.length} ${blocking.length === 1 ? "problem blocks" : "problems block"} publication.`
        }
      >
        {blocking.length === 0 ? (
          <p className="m-0 text-[0.85rem] text-ink-soft">
            No blocking issues. The database enforces these same rules at COMMIT,
            so this is a genuine pre-flight rather than a second opinion.
          </p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {blocking.map((issue, index) => (
              <li
                key={`${issue.code}-${index}`}
                className="border-l-2 border-signal/60 pl-3 text-[0.85rem] leading-relaxed"
              >
                <span className="sip-display mr-2 text-[0.72rem] uppercase tracking-wide text-ink-quiet">
                  {issue.code}
                </span>
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Worth a second read"
        description="Prompts for a human, not rules. Nothing here blocks publication."
      >
        {advisory.length === 0 ? (
          <p className="m-0 text-[0.85rem] text-ink-soft">
            Nothing flagged. The spoiler read is still yours to make — no program
            can decide what a given game withholds.
          </p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {advisory.map((issue, index) => (
              <li
                key={`${issue.code}-${index}`}
                className="border-l-2 border-rule-strong pl-3 text-[0.85rem] leading-relaxed"
              >
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Publish"
        description="Publication is a transaction: this version becomes published and the version it replaces becomes superseded, or neither happens."
      >
        <p className="m-0 mb-3 text-[0.85rem] leading-relaxed text-ink-soft">
          Approve against the{" "}
          <Link
            href={`/admin/evaluations/${record.evaluation.id}/preview`}
            className="text-ink underline"
          >
            preview
          </Link>
          , which renders this evaluation through the public renderer. The
          derived review shows the arithmetic; the preview shows the page.
        </p>

        {/*
          Publishing does not deploy. Master Plan §9.8 keeps Published and Live
          distinct, and 2D-2 added the request and the proof without collapsing
          them: pressing Publish asks for a build, and asking is not arriving.
          Saying so here is not a caveat — an editor who believes Publish put
          the profile on the site has been misled by the interface.
        */}
        <Notice tone="info">
          Publishing changes the database, not the site. This version becomes
          Live only if a later production build reads it, verification succeeds,
          and that artifact deploys successfully. Publishing does request that
          build, and the request is recorded — but a request is not an arrival,
          and none of it is waited for here. Until a deployment is verified,
          production keeps serving whatever the last one contained, and a
          version can even be published and later superseded without ever having
          been served. The{" "}
          <Link href="/admin/deployments" className="text-ink underline">
            deployment page
          </Link>{" "}
          is where that gap is shown and closed.
        </Notice>

        {isFinal ? null : (
          <PublishPanel
            action={publishEvaluationAction.bind(
              null,
              record.evaluation.id,
              record.game.id,
            )}
            canPublish={canPublish}
            gameTitle={record.game.canonicalTitle}
            scopeLabel={record.scope.label}
          />
        )}
      </Panel>
    </>
  );
}
