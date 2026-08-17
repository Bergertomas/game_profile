import Link from "next/link";
import { notFound } from "next/navigation";
import { publishEvaluationAction } from "@/app/admin/evaluation-actions";
import { PublishPanel } from "@/components/admin/PublishPanel";
import { Notice, Panel } from "@/components/admin/ui";
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

  return (
    <>
      {isFinal ? (
        <Notice tone="blocked">
          This evaluation is <strong>{status}</strong>.{" "}
          {status === "published"
            ? "It is the live profile for this scope. A published snapshot is never edited — to change it, create a revision, which supersedes this version at the moment the revision publishes."
            : "It is preserved history: it was published once and has been replaced."}
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
          distinct, and the rebuild that makes a published profile Live is 2D-2.
          Saying so here is not a caveat — an editor who believes Publish put
          the profile on the site has been misled by the interface.
        */}
        <Notice tone="info">
          Publishing changes the database, not the site. The public pages are
          prerendered, so this profile becomes Live at the next production build.
          Triggering that build from here, and showing the gap while it is
          pending, is the next slice of Phase 2D.
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
