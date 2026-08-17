import { notFound } from "next/navigation";
import { updateContextAction } from "@/app/admin/evaluation-actions";
import { EvaluationContextForm } from "@/components/admin/EvaluationContextForm";
import { AdminLink, Notice, Panel } from "@/components/admin/ui";
import { draftProgress, readEvaluationPage } from "@/lib/admin/evaluations";
import { CALIBRATION_ROUND_LIST } from "@/lib/profile/provenance";

/**
 * Step one: what this evaluation covers, and how far it has got.
 *
 * The progress panel is a completeness INDICATOR, not the publish gate. Master
 * Plan §8.8 lists what publication will check; none of it is enforced here,
 * because a draft exists so an editor can stop halfway. Showing "12 of 40" is
 * help; refusing to save until it says 40 would be the tool deciding when
 * editorial work is allowed to pause.
 */
export default async function EvaluationContextPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { view } = await readEvaluationPage(id);
  if (!view) notFound();

  const progress = draftProgress(view);

  return (
    <>
      <Panel
        title="Progress"
        description="What has been authored so far. This is not the publication gate — that arrives with Phase 2D."
      >
        <dl className="m-0 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric
            label="Subcriteria scored"
            value={`${progress.scoredSubcriteria}/${progress.totalSubcriteria}`}
          />
          <Metric
            label="Rationales written"
            value={`${progress.rationales}/${progress.totalSubcriteria}`}
          />
          <Metric
            label="Dimensions complete"
            value={`${progress.dimensionsComplete}/${progress.totalDimensions}`}
          />
          <Metric
            label="Dimension confidence"
            value={`${progress.dimensionsWithConfidence}/${progress.totalDimensions}`}
          />
          <Metric label="Evidence mappings" value={String(progress.evidenceLinks)} />
          <Metric label="Tags" value={String(progress.tags)} />
          <Metric
            label="Interpretation blocks"
            value={`${progress.blocksAuthored}/3`}
          />
          <Metric
            label="One-line, pull, risk"
            value={progress.hasInterpretation ? "written" : "not yet"}
          />
        </dl>
      </Panel>

      {view.supersedesEvaluationId ? (
        <Notice>
          This is a revision. It was started from an earlier version, which is
          untouched and stays exactly as it was published.
          {view.changeSummary ? ` Change summary: ${view.changeSummary}` : null}
        </Notice>
      ) : null}

      <Panel
        title="Declared scope"
        description="What was evaluated, on what, and against what evidence. Rubric §1 makes these mandatory: a profile that does not say what it evaluated cannot be argued with."
        actions={
          <AdminLink href={`/admin/games/${view.gameId}`}>Back to the game</AdminLink>
        }
      >
        {view.editable ? (
          <EvaluationContextForm
            action={updateContextAction.bind(null, view.id)}
            submitLabel="Save context"
            view={view}
            platforms={view.gamePlatforms}
            calibrationRounds={CALIBRATION_ROUND_LIST}
          />
        ) : (
          <ReadOnlyContext view={view} />
        )}
      </Panel>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="m-0 text-[0.75rem] uppercase tracking-wide text-ink-quiet">
        {label}
      </dt>
      <dd className="sip-display m-0 text-[1.3rem] tabular-nums">{value}</dd>
    </div>
  );
}

function ReadOnlyContext({
  view,
}: {
  view: NonNullable<Awaited<ReturnType<typeof readEvaluationPage>>["view"]>;
}) {
  const rows: [string, string][] = [
    ["Context", view.releaseContext ?? "—"],
    ["Edition", view.editionScope],
    ["Mode", view.modeScope],
    ["Platforms", view.platformScope.join(", ")],
    ["Build", view.buildOrPatchScope],
    ["Current-state cutoff", view.currentStateCutoffAt ?? "—"],
    ["Evidence cutoff", view.evidenceCutoffAt],
    ["Evidence status", view.evidenceStatus],
    ["Confidence", view.confidence],
    ["Ledger", view.evidenceLedger],
    ["Provenance", view.scoreProvenance],
  ];
  return (
    <dl className="m-0">
      {rows.map(([term, value]) => (
        <div key={term} className="flex gap-4 border-b border-rule py-1.5 last:border-b-0">
          <dt className="w-48 shrink-0 text-[0.78rem] uppercase tracking-wide text-ink-quiet">
            {term}
          </dt>
          <dd className="m-0 text-[0.9rem]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
