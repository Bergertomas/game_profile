import { notFound } from "next/navigation";
import { createDraftAction } from "@/app/admin/evaluation-actions";
import { EvaluationContextForm } from "@/components/admin/EvaluationContextForm";
import { AdminLink, Notice, Panel } from "@/components/admin/ui";
import { withAuthorizedAdminDatabase } from "@/lib/admin/db";
import { readScopeHistory } from "@/lib/admin/evaluations";
import { getGameForAdmin } from "@/lib/admin/games";
import { CALIBRATION_ROUND_LIST } from "@/lib/profile/provenance";

/**
 * Start a Draft for one profile scope.
 *
 * ── Why this is a form and not a button ─────────────────────────────────────
 *
 * An evaluation cannot exist without saying what it evaluated: edition, mode,
 * platforms, build and evidence cutoff are mandatory in the rubric (§1) and NOT
 * NULL in the database. A "create empty draft" button would have to invent them,
 * and invented scope is the thing that makes a profile unfalsifiable.
 *
 * Everything else — forty scores, evidence, tags, interpretation — is authored
 * afterwards, over as long as it takes.
 */
export default async function NewEvaluationPage({
  params,
}: {
  params: Promise<{ scopeId: string }>;
}) {
  const { scopeId } = await params;
  if (!isUuid(scopeId)) notFound();

  const data = await withAuthorizedAdminDatabase(async (db) => {
    const history = await readScopeHistory(db, scopeId);
    if (!history) return null;
    return { history, game: await getGameForAdmin(db, history.gameId) };
  });
  if (!data?.game) notFound();

  const { history, game } = data;
  const open = history.evaluations.find(
    (evaluation) => evaluation.status === "draft" || evaluation.status === "review",
  );

  // One working evaluation per scope. The form is not disabled here, it is
  // absent: a disabled control that posts anyway on a stale tab is a suggestion,
  // and the editor's next move is to continue the open draft, not to look at a
  // greyed-out copy of a form they cannot use. `createDraft` refuses this
  // independently — this is the part that stops it being offered.
  if (open) {
    return (
      <>
        <h1 className="sip-display mb-2 text-[1.5rem]">
          New evaluation — {history.gameTitle}, {history.scopeLabel}
        </h1>
        <Notice tone="blocked">
          This scope already has an evaluation in progress (v{open.versionNumber},{" "}
          {open.status}), so a new one cannot be started.{" "}
          <AdminLink href={`/admin/evaluations/${open.id}`}>
            Continue that evaluation
          </AdminLink>{" "}
          — two open evaluations of one experience is two answers to the same
          question. Its published versions are unaffected.
        </Notice>
        <p className="mt-4 text-[0.85rem] text-ink-soft">
          To start a different version instead, finish or discard v
          {open.versionNumber} first.{" "}
          <AdminLink href={`/admin/games/${game.id}`}>Back to the game</AdminLink>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="sip-display mb-2 text-[1.5rem]">
        New evaluation — {history.gameTitle}, {history.scopeLabel}
      </h1>
      <p className="mb-6 text-[0.85rem] text-ink-soft">
        This starts version {history.evaluations.length + 1} of this scope&rsquo;s
        evaluation series. Existing versions are untouched.
      </p>

      <Panel
        title="Declared scope"
        description="What this evaluation covers. Rubric §1 makes these mandatory, and they are the only fields required to save a draft."
        actions={<AdminLink href={`/admin/games/${game.id}`}>Back to the game</AdminLink>}
      >
        <EvaluationContextForm
          action={createDraftAction.bind(null, scopeId, game.id)}
          submitLabel="Create draft"
          platforms={game.platforms.map((platform) => ({
            id: platform.platformId,
            slug: platform.slug,
            name: platform.name,
          }))}
          calibrationRounds={CALIBRATION_ROUND_LIST}
        />
      </Panel>
    </>
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
