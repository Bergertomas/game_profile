import Link from "next/link";
import { notFound } from "next/navigation";
import { readEvaluationPage, draftProgress } from "@/lib/admin/evaluations";
import { Notice } from "@/components/admin/ui";

/**
 * The evaluation editor's shell.
 *
 * ── The nav IS the authoring sequence ───────────────────────────────────────
 *
 * Master Plan §8.1 lays out the workflow, and the tabs follow it in order:
 * context → evidence → the eight dimensions → interpretation → derived review
 * → preview → publish. That ordering is editorial rather than technical.
 * Evidence comes before scores because a score authored before its evidence is
 * a number looking for a justification, which is the failure the whole
 * methodology exists to prevent.
 *
 * The last two are Phase 2D, and their order is the same kind of claim. Preview
 * comes before publish because what an editor approves has to be the thing that
 * ships, rendered by the renderer that will ship it — not the derived review,
 * which is arithmetic, and not a lookalike built for the admin.
 *
 * ── Forty subcriteria are not one form ──────────────────────────────────────
 *
 * They are eight pages of five. A single page of forty is unreviewable, loses
 * everything on one bad field, and gives an editor no sense of where they are.
 * Each dimension page carries its own five, its own confidence and its own
 * derived total, so the unit of work matches the unit of meaning in the rubric.
 */
export default async function EvaluationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const { view } = await readEvaluationPage(id);
  if (!view) notFound();

  const progress = draftProgress(view);
  const base = `/admin/evaluations/${view.id}`;

  return (
    <>
      <nav className="mb-4 text-[0.8rem] text-ink-quiet" aria-label="Breadcrumb">
        <Link href="/admin/games" className="text-ink-soft">
          Games
        </Link>
        {" / "}
        <Link href={`/admin/games/${view.gameId}`} className="text-ink-soft">
          {view.gameTitle}
        </Link>
        {" / "}
        <span>
          {view.scopeLabel} · v{view.versionNumber}
        </span>
      </nav>

      <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="sip-display m-0 text-[1.5rem]">
          {view.gameTitle} — {view.scopeLabel}
        </h1>
        <span className="text-[0.82rem] text-ink-quiet">
          version {view.versionNumber} · rubric {view.rubricVersion} · {view.status}
        </span>
      </div>

      {!view.editable ? (
        <Notice tone="blocked">
          This evaluation is <strong>{view.status}</strong> and is a frozen
          snapshot. It is shown read-only because that is what it is — the record
          of what was published. To change anything, create a revision from the
          evaluation history: it starts a new version and leaves this one exactly
          as it is.
        </Notice>
      ) : null}

      <nav
        aria-label="Authoring steps"
        className="mb-6 flex flex-wrap gap-x-1 gap-y-1 border-b border-rule-strong pb-2 text-[0.85rem]"
      >
        <Step href={base} label="Context" />
        <Step href={`${base}/evidence`} label={`Evidence (${progress.evidenceLinks})`} />
        <Step
          href={`${base}/dimensions/${view.dimensions[0]?.dimension.key ?? "story"}`}
          label={`Scores (${progress.scoredSubcriteria}/${progress.totalSubcriteria})`}
        />
        <Step href={`${base}/interpretation`} label="Tags & interpretation" />
        <Step href={`${base}/review`} label="Derived review" />
        <Step href={`${base}/preview`} label="Preview" />
        <Step href={`${base}/publish`} label="Publish" />
      </nav>

      {children}
    </>
  );
}

function Step({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href as never}
      className="rounded-sm border border-rule px-3 py-1.5 text-ink-soft no-underline hover:border-rule-strong hover:text-ink"
    >
      {label}
    </Link>
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
