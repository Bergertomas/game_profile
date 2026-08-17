import {
  ActionForm,
  Field,
  Select,
  TextArea,
  TextInput,
  type ActionState,
} from "@/components/admin/forms";
import { Notice } from "@/components/admin/ui";
import type { ActionResult } from "@/lib/admin/errors";
import type { EvaluationEditorView } from "@/lib/admin/evaluations";

/**
 * The declared scope of an evaluation (Rubric §1).
 *
 * Shared between starting a draft and editing one, because they collect exactly
 * the same fields — a new draft is not a lesser version of an evaluation, it is
 * the same thing with nothing authored yet.
 *
 * ── Why these are required and the scores are not ───────────────────────────
 *
 * Rubric §1 makes edition, mode, platforms and build mandatory: a profile that
 * does not say what it evaluated cannot be argued with. They are also the
 * columns Postgres marks NOT NULL, so a draft cannot exist without them. Scores
 * and interpretation are the opposite — the whole point of a draft is that they
 * arrive over days.
 */
export function EvaluationContextForm({
  action,
  submitLabel,
  view,
  platforms,
  calibrationRounds,
}: {
  action: (previous: ActionState, form: FormData) => Promise<ActionResult>;
  submitLabel: string;
  view?: EvaluationEditorView;
  platforms: readonly { id: string; slug: string; name: string; }[];
  calibrationRounds: readonly { key: string; label: string }[];
}) {
  const selected = new Set(view?.platformScope ?? []);

  return (
    <ActionForm action={action} submitLabel={submitLabel}>
      <>
        <div className="grid gap-x-5 sm:grid-cols-2">
          <Field
            name="releaseContext"
            label="Evaluation context"
            hint="When in the product's life this evaluation was made."
          >
            <Select
              name="releaseContext"
              required
              defaultValue={view?.releaseContext ?? "Post-release"}
              options={[
                { value: "Pre-release", label: "Pre-release" },
                { value: "Launch", label: "Launch" },
                { value: "Post-release", label: "Post-release" },
                { value: "Retrospective", label: "Retrospective" },
              ]}
            />
          </Field>

          <Field
            name="editionScope"
            label="Edition"
            hint='Which product, e.g. "Base game" or "Deluxe Edition".'
          >
            <TextInput name="editionScope" defaultValue={view?.editionScope} required />
          </Field>

          <div className="sm:col-span-2">
            <Field
              name="modeScope"
              label="Mode"
              hint="The experience being evaluated, and what it excludes. A materially different mode is a different profile scope, not a wider sentence here."
            >
              <TextInput name="modeScope" defaultValue={view?.modeScope} required />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field
              name="platformScope"
              label="Platforms evaluated"
              hint="What was actually played or examined. Not the platforms the game ships on."
            >
              {platforms.length === 0 ? (
                <Notice tone="warning">
                  This game has no platforms attached yet. Add them on the game
                  page first — an evaluation cannot say what it covers otherwise.
                </Notice>
              ) : (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {platforms.map((platform) => (
                    <label
                      key={platform.id}
                      className="flex items-center gap-1.5 text-[0.88rem]"
                    >
                      <input
                        type="checkbox"
                        name="platformScope"
                        value={platform.name}
                        defaultChecked={selected.has(platform.name)}
                      />
                      {platform.name}
                    </label>
                  ))}
                </div>
              )}
            </Field>
          </div>

          <Field
            name="buildOrPatchScope"
            label="Build or patch"
            hint='What version was evaluated, e.g. "Current retail build, including Update 4".'
          >
            <TextInput
              name="buildOrPatchScope"
              defaultValue={view?.buildOrPatchScope}
              required
            />
          </Field>

          <Field
            name="currentStateCutoffAt"
            label="Current-state cutoff"
            hint="For a game that is still changing: the date this reading of it stops (Rubric §17)."
          >
            <TextInput
              name="currentStateCutoffAt"
              type="date"
              defaultValue={view?.currentStateCutoffAt}
            />
          </Field>

          <Field
            name="evidenceCutoffAt"
            label="Evidence cutoff"
            hint="The date after which no evidence was considered."
          >
            <TextInput
              name="evidenceCutoffAt"
              type="date"
              defaultValue={view?.evidenceCutoffAt}
              required
            />
          </Field>

          <Field
            name="evidenceStatus"
            label="Evidence status"
            hint="Verified, provisional, or pre-release (SOP §10)."
          >
            <Select
              name="evidenceStatus"
              required
              defaultValue={view?.evidenceStatus ?? "provisional"}
              options={[
                { value: "verified", label: "Verified" },
                { value: "provisional", label: "Provisional" },
                { value: "pre_release", label: "Pre-release" },
              ]}
            />
          </Field>

          <Field
            name="evidenceMaturity"
            label="Pre-release maturity"
            hint='Required for a pre-release profile. "Pre-release" alone does not say whether anyone has played it.'
          >
            <Select
              name="evidenceMaturity"
              defaultValue={view?.evidenceMaturity ?? ""}
              options={[
                { value: "announced", label: "Announced" },
                { value: "showcased", label: "Showcased" },
                { value: "hands_on", label: "Hands-on" },
                { value: "review_code", label: "Review code" },
              ]}
            />
          </Field>

          <Field
            name="confidence"
            label="Overall confidence"
            hint="A pre-release profile cannot claim High (Rubric §14). An individual dimension still may."
          >
            <Select
              name="confidence"
              required
              defaultValue={view?.confidence ?? "medium"}
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
            />
          </Field>

          <Field
            name="evidenceLedger"
            label="Evidence ledger"
            hint="Public source counts stay suppressed until this is Populated (SOP §6)."
          >
            <Select
              name="evidenceLedger"
              required
              defaultValue={view?.evidenceLedger ?? "pending"}
              options={[
                { value: "pending", label: "Pending — individual sources not yet recorded" },
                { value: "populated", label: "Populated — the ledger is reconciled" },
              ]}
            />
          </Field>

          <Field
            name="scoreProvenance"
            label="Score provenance"
            hint="Where these numbers came from (ADR 0005). Ordinary editorial work is Editorial."
          >
            <Select
              name="scoreProvenance"
              required
              defaultValue={view?.scoreProvenance ?? "editorial"}
              options={[
                { value: "editorial", label: "Editorial" },
                { value: "calibration", label: "Calibration round" },
                { value: "derived", label: "Derived — no editorial sign-off" },
              ]}
            />
          </Field>

          <Field
            name="calibrationRound"
            label="Calibration round"
            hint="Required when provenance is Calibration, and meaningless otherwise."
          >
            <Select
              name="calibrationRound"
              defaultValue={view?.calibrationRound ?? ""}
              options={calibrationRounds.map((round) => ({
                value: round.key,
                label: round.label,
              }))}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field
              name="provenanceNote"
              label="Provenance note"
              hint="Required when provenance is Derived. A reader is entitled to know the numbers have not been through review."
            >
              <TextArea name="provenanceNote" defaultValue={view?.provenanceNote} rows={2} />
            </Field>
          </div>
        </div>
      </>
    </ActionForm>
  );
}
