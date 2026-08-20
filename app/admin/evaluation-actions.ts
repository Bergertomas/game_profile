"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withAdminTransaction, withAuthorizedAdminDatabase } from "@/lib/admin/db";
import { dispatchDeployment } from "@/lib/admin/deployments";
import {
  invalidForm,
  reportingFailures,
  type ActionResult,
} from "@/lib/admin/errors";
import { FrozenEvaluationError } from "@/lib/admin/evaluations";
import * as write from "@/lib/admin/evaluation-write";
import {
  dimensionAssessmentSchema,
  evaluationContextSchema,
  evidenceLinkSchema,
  evidenceSourceSchema,
  interpretationSchema,
  platformOverrideSchema,
  subcriterionSchema,
  tagSelectionSchema,
} from "@/lib/admin/evaluation-validation";
import { requireEditor } from "@/lib/admin/guard";
import { publishEvaluation } from "@/lib/admin/publication";
import { formValues, parseObject } from "@/lib/admin/validation";
import { liveTransport } from "@/lib/deploy/transport";
import { CURRENT_RUBRIC_VERSION } from "@/lib/rubric";
import { z } from "zod";

/**
 * Every evaluation-authoring mutation.
 *
 * Same contract as the 2B actions: `requireEditor()` first, one transaction
 * each, and a database refusal reported next to the form rather than as an
 * error page.
 *
 * Exactly one action here makes an evaluation public — `publishEvaluationAction`
 * at the foot of the file. Everything above it authors a working draft and
 * cannot change what the site serves, which is the property that let 2C ship
 * before a publish gate existed.
 *
 * ── Save granularity ────────────────────────────────────────────────────────
 *
 * Scores save one subcriterion at a time rather than forty at once. Two
 * reasons, both about not losing work: a validation failure anywhere in a
 * forty-field form would reject the other thirty-nine, and an editor who leaves
 * a dimension half-answered should have the answered half already stored.
 */

/** Refresh whatever an editor might be looking at for this evaluation. */
function refresh(evaluationId: string, gameId?: string): void {
  revalidatePath(`/admin/evaluations/${evaluationId}`, "layout");
  revalidatePath("/admin");
  if (gameId) revalidatePath(`/admin/games/${gameId}`);
}

/**
 * A frozen snapshot reports as a rule, not a fault.
 *
 * The database refuses with "children of final evaluation … are immutable";
 * this turns that into the sentence an editor needs, which is that a published
 * profile is revised rather than edited.
 */
async function guarded(run: () => Promise<void>, values?: Record<string, string>) {
  try {
    return await reportingFailures(run, values);
  } catch (error) {
    if (error instanceof FrozenEvaluationError) {
      return { ok: false as const, message: error.message, values };
    }
    throw error;
  }
}

/** Context fields arrive as repeated `platformScope` entries. */
function contextFrom(form: FormData) {
  return {
    rubricVersion: CURRENT_RUBRIC_VERSION,
    editionScope: String(form.get("editionScope") ?? ""),
    modeScope: String(form.get("modeScope") ?? ""),
    platformScope: form.getAll("platformScope").map(String).filter(Boolean),
    buildOrPatchScope: String(form.get("buildOrPatchScope") ?? ""),
    currentStateCutoffAt: String(form.get("currentStateCutoffAt") ?? ""),
    evidenceCutoffAt: String(form.get("evidenceCutoffAt") ?? ""),
    releaseContext: String(form.get("releaseContext") ?? ""),
    evidenceStatus: String(form.get("evidenceStatus") ?? ""),
    evidenceMaturity: String(form.get("evidenceMaturity") ?? "") || undefined,
    confidence: String(form.get("confidence") ?? ""),
    evidenceLedger: String(form.get("evidenceLedger") ?? ""),
    scoreProvenance: String(form.get("scoreProvenance") ?? ""),
    calibrationRound: String(form.get("calibrationRound") ?? ""),
    provenanceNote: String(form.get("provenanceNote") ?? ""),
  };
}

export async function createDraftAction(
  scopeId: string,
  gameId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const editor = await requireEditor();

  const parsed = parseObject(
    evaluationContextSchema,
    contextFrom(form),
    formValues(form),
  );
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  let created = "";
  const result = await guarded(async () => {
    created = await withAdminTransaction((tx) =>
      write.createDraft(tx, scopeId, parsed.value, editor.email),
    );
  }, parsed.values);
  if (!result.ok) return result;

  refresh(created, gameId);
  redirect(`/admin/evaluations/${created}`);
}

export async function updateContextAction(
  evaluationId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = parseObject(
    evaluationContextSchema,
    contextFrom(form),
    formValues(form),
  );
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  const result = await guarded(
    () => withAdminTransaction((tx) => write.updateContext(tx, evaluationId, parsed.value)),
    parsed.values,
  );
  refresh(evaluationId);
  return result;
}

export async function saveSubcriterionAction(
  evaluationId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = parseObject(
    subcriterionSchema,
    {
      dimensionKey: String(form.get("dimensionKey") ?? ""),
      subcriterionKey: String(form.get("subcriterionKey") ?? ""),
      value: String(form.get("value") ?? ""),
      rationale: String(form.get("rationale") ?? ""),
      platformNote: String(form.get("platformNote") ?? ""),
      evidenceConfidence: String(form.get("evidenceConfidence") ?? "") || undefined,
    },
    formValues(form),
  );
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  const result = await guarded(
    () =>
      withAdminTransaction((tx) =>
        write.saveSubcriterion(tx, evaluationId, CURRENT_RUBRIC_VERSION, parsed.value),
      ),
    parsed.values,
  );
  refresh(evaluationId);
  return result;
}

export async function saveDimensionAssessmentAction(
  evaluationId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = parseObject(
    dimensionAssessmentSchema,
    {
      dimensionKey: String(form.get("dimensionKey") ?? ""),
      confidence: String(form.get("confidence") ?? ""),
      note: String(form.get("note") ?? ""),
    },
    formValues(form),
  );
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  const result = await guarded(
    () =>
      withAdminTransaction((tx) =>
        write.saveDimensionAssessment(
          tx,
          evaluationId,
          CURRENT_RUBRIC_VERSION,
          parsed.value.dimensionKey,
          parsed.value.confidence,
          parsed.value.note,
        ),
      ),
    parsed.values,
  );
  refresh(evaluationId);
  return result;
}

export async function saveOverrideAction(
  evaluationId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = parseObject(
    platformOverrideSchema,
    {
      dimensionKey: String(form.get("dimensionKey") ?? ""),
      subcriterionKey: String(form.get("subcriterionKey") ?? ""),
      platformId: String(form.get("platformId") ?? ""),
      value: String(form.get("value") ?? ""),
      rationale: String(form.get("rationale") ?? ""),
      evidenceConfidence: String(form.get("evidenceConfidence") ?? "") || undefined,
    },
    formValues(form),
  );
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  const result = await guarded(
    () =>
      withAdminTransaction((tx) =>
        write.saveOverride(tx, evaluationId, CURRENT_RUBRIC_VERSION, parsed.value),
      ),
    parsed.values,
  );
  refresh(evaluationId);
  return result;
}

export async function removeOverrideAction(
  evaluationId: string,
  dimensionKey: string,
  subcriterionKey: string,
  platformId: string,
): Promise<ActionResult> {
  await requireEditor();
  const result = await guarded(() =>
    withAdminTransaction((tx) =>
      write.removeOverride(
        tx,
        evaluationId,
        CURRENT_RUBRIC_VERSION,
        dimensionKey as never,
        subcriterionKey,
        platformId,
      ),
    ),
  );
  refresh(evaluationId);
  return result;
}

export async function saveEvidenceSourceAction(
  evaluationId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = parseObject(evidenceSourceSchema, formValues(form), formValues(form));
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  const result = await guarded(
    () => withAdminTransaction(async (tx) => { await write.upsertEvidenceSource(tx, parsed.value); }),
    parsed.values,
  );
  refresh(evaluationId);
  return result;
}

export async function linkEvidenceAction(
  evaluationId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = parseObject(
    evidenceLinkSchema,
    {
      evidenceSourceId: String(form.get("evidenceSourceId") ?? ""),
      dimensionKey: String(form.get("dimensionKey") ?? ""),
      subcriterionKey: String(form.get("subcriterionKey") ?? ""),
      platformScope: form.getAll("platformScope").map(String).filter(Boolean),
      note: String(form.get("note") ?? ""),
      spoilerSensitive: form.get("spoilerSensitive") === "on",
    },
    formValues(form),
  );
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  const result = await guarded(
    () =>
      withAdminTransaction((tx) =>
        write.linkEvidence(tx, evaluationId, CURRENT_RUBRIC_VERSION, parsed.value),
      ),
    parsed.values,
  );
  refresh(evaluationId);
  return result;
}

export async function unlinkEvidenceAction(
  evaluationId: string,
  linkId: string,
): Promise<ActionResult> {
  await requireEditor();
  const result = await guarded(() =>
    withAdminTransaction((tx) => write.unlinkEvidence(tx, evaluationId, linkId)),
  );
  refresh(evaluationId);
  return result;
}

export async function moveEvidenceAction(
  evaluationId: string,
  linkId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  await requireEditor();
  const result = await guarded(() =>
    withAdminTransaction((tx) =>
      write.moveEvidenceLink(tx, evaluationId, linkId, direction),
    ),
  );
  refresh(evaluationId);
  return result;
}

/**
 * The whole tag selection, in the order the form submitted it.
 *
 * Order is the payload (migration 0008), so this is a whole-list write: the
 * repeated `tagKey` fields arrive in document order and become positions 1..n.
 */
export async function setTagsAction(
  evaluationId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const keys = form.getAll("tagKey").map(String).filter(Boolean);
  const selections = keys.map((key) => ({
    key,
    intensity: String(form.get(`intensity:${key}`) ?? "") || undefined,
    note: String(form.get(`note:${key}`) ?? "") || undefined,
  }));

  const parsed = parseObject(
    z.array(tagSelectionSchema),
    selections,
    formValues(form),
  );
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  const result = await guarded(
    () => withAdminTransaction((tx) => write.setTags(tx, evaluationId, parsed.value)),
    parsed.values,
  );
  refresh(evaluationId);
  return result;
}

/**
 * One tag, one place up or down the reader's list.
 *
 * Separate from `setTagsAction` because they answer different questions. That
 * one writes membership — which tags, with what intensity and note — from a
 * checkbox list whose DOM order is the current order. This one changes that
 * order, which a checkbox cannot express.
 */
export async function moveTagAction(
  evaluationId: string,
  tagKey: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  await requireEditor();
  const result = await guarded(() =>
    withAdminTransaction((tx) => write.moveTag(tx, evaluationId, tagKey, direction)),
  );
  refresh(evaluationId);
  return result;
}

export async function saveInterpretationAction(
  evaluationId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireEditor();

  /*
   * One textarea per block, one bullet per line.
   *
   * A repeating field per bullet would need add/remove controls to author three
   * lines, and an editor writing an interpretation is writing prose, not
   * managing a list widget. Blank lines are dropped rather than stored, so
   * trailing newlines do not become empty bullets on the page.
   */
  const bullets = (name: string) =>
    form
      .getAll(name)
      .flatMap((value) => String(value).split("\n"))
      .map((line) => line.trim())
      .filter(Boolean);

  const parsed = parseObject(
    interpretationSchema,
    {
      oneLineExperience: String(form.get("oneLineExperience") ?? ""),
      primaryPull: String(form.get("primaryPull") ?? ""),
      primaryRisk: String(form.get("primaryRisk") ?? ""),
      platformWarning: String(form.get("platformWarning") ?? ""),
      blocks: {
        great_fit: bullets("great_fit"),
        know_before: bullets("know_before"),
        probably_not: bullets("probably_not"),
      },
    },
    formValues(form),
  );
  if (!parsed.ok) return invalidForm(parsed.errors, parsed.values);

  const result = await guarded(
    () =>
      withAdminTransaction((tx) =>
        write.saveInterpretation(tx, evaluationId, parsed.value),
      ),
    parsed.values,
  );
  refresh(evaluationId);
  return result;
}

/**
 * Start a revision from an existing version.
 *
 * The predecessor is copied and left alone. Supersession — flipping the old row
 * to `superseded` — happens at publication, which is Phase 2D.
 */
export async function createRevisionAction(
  sourceEvaluationId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const editor = await requireEditor();

  const summary = String(form.get("changeSummary") ?? "").trim();
  if (!summary) {
    return invalidForm(
      {
        changeSummary:
          "Say what is changing and why. This is the note that explains the new version to a reader and to the next editor.",
      },
      formValues(form),
    );
  }

  let created = "";
  const result = await guarded(async () => {
    created = await withAdminTransaction((tx) =>
      write.createRevision(tx, sourceEvaluationId, editor.email, summary),
    );
  }, formValues(form));
  if (!result.ok) return result;

  refresh(created);
  redirect(`/admin/evaluations/${created}`);
}

export async function setWorkingStatusAction(
  evaluationId: string,
  status: "draft" | "review",
): Promise<ActionResult> {
  await requireEditor();
  const result = await guarded(() =>
    withAdminTransaction((tx) => write.setWorkingStatus(tx, evaluationId, status)),
  );
  refresh(evaluationId);
  return result;
}

export async function deleteDraftAction(
  evaluationId: string,
  gameId: string,
): Promise<ActionResult> {
  await requireEditor();
  const result = await guarded(() =>
    withAdminTransaction((tx) => write.deleteDraft(tx, evaluationId)),
  );
  if (!result.ok) return result;
  refresh(evaluationId, gameId);
  redirect(`/admin/games/${gameId}`);
}

/**
 * Publish this evaluation, superseding the version it replaces.
 *
 * The transition every other action in this file deliberately avoided: 2C
 * authored working evaluations and nothing here could make one public. The
 * publication itself — gate, supersession and status change in one transaction
 * — lives in `lib/admin/publication.ts`; this is the form boundary.
 *
 * ── Why the gate runs again, after the page already ran it ─────────────────
 *
 * The Publish page shows readiness computed when it rendered. Between that
 * render and this submission an editor may have changed a score in another tab,
 * a revision may have published, or a rubric may have moved. Publishing on the
 * strength of a check made against data that has since changed is the class of
 * bug the whole immutability model exists to prevent, so `publishEvaluation`
 * re-runs the gate inside the transaction that commits. This action does not
 * pre-check at all: doing so would only produce a friendlier message for a race
 * it cannot close.
 */
export async function publishEvaluationAction(
  evaluationId: string,
  gameId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  // Named, because the deployment request below records who asked for it.
  const editor = await requireEditor();

  const result = await guarded(() =>
    withAdminTransaction((tx) =>
      publishEvaluation(tx, evaluationId, {
        spoilerReviewed: form.get("spoilerReviewed") === "on",
        scopeConfirmation: String(form.get("scopeConfirmation") ?? ""),
      }),
    ),
  );
  if (!result.ok) return result;

  // ── The publication has COMMITTED. Everything below is a separate concern ──
  //
  // Strictly after, and deliberately outside that transaction. Publishing is an
  // editorial act that was validated, approved and committed; a third-party API
  // being down must not undo it, and holding the evaluation's row lock across a
  // network call to another company would be its own mistake.
  //
  // So every failure here is *recorded* rather than raised. `dispatchDeployment`
  // already writes the trail for a refusal, an unknown outcome and an
  // unconfigured deployment; this catch is for the case where even that could
  // not be written, which must still not turn a successful publication into an
  // error page. The profile is Published either way, and the deployment page is
  // where the gap is visible and retryable.
  try {
    await withAuthorizedAdminDatabase((db) =>
      dispatchDeployment(db, {
        reason: "publication",
        actor: editor.email,
        triggeringEvaluationId: evaluationId,
        transport: liveTransport,
      }),
    );
  } catch (error) {
    console.error(
      "[deploy] publication committed, but the deployment request could not be recorded",
      { evaluationId, message: error instanceof Error ? error.message : String(error) },
    );
  }

  refresh(evaluationId, gameId);
  revalidatePath("/admin/deployments");
  redirect(`/admin/evaluations/${evaluationId}/publish`);
}
