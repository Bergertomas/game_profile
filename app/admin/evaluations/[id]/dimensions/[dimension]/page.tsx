import Link from "next/link";
import { notFound } from "next/navigation";
import {
  removeOverrideAction,
  saveDimensionAssessmentAction,
  saveOverrideAction,
  saveSubcriterionAction,
} from "@/app/admin/evaluation-actions";
import {
  ActionButton,
  ActionForm,
  Disclosure,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/forms";
import { Empty, Notice, Panel, Pill } from "@/components/admin/ui";
import { readEvaluationPage, type SubcriterionDraft } from "@/lib/admin/evaluations";
import { SUBCRITERION_SCALE, UNKNOWN } from "@/lib/rubric";

/**
 * Five subcriteria, one dimension, one page.
 *
 * ── Why the score is a select and not free text ─────────────────────────────
 *
 * The rubric's scale is five discrete steps with published meanings, and each
 * option shows its label — "2 · Exceptional" rather than a bare number — so an
 * editor is choosing a described position rather than typing a number and
 * hoping it means what they think. `SUBCRITERION_SCALE` is read from the rubric
 * module, so a rubric change cannot leave this list behind.
 *
 * ── Three states, visibly ───────────────────────────────────────────────────
 *
 *   Not yet authored — no row exists. This is what draft incompleteness IS.
 *   Unknown          — authored, and the evidence does not settle it. This is
 *                      what turns a dimension total into a range (Rubric §21).
 *   A score          — including 0, which is a real reading, not an absence.
 *
 * They are three options in one control rather than a score plus a checkbox,
 * because they are three answers to one question and any pair of them is
 * mutually exclusive.
 *
 * ── One save per subcriterion ───────────────────────────────────────────────
 *
 * Not one save for the page. A rejected forty-field form loses thirty-nine good
 * answers, and an editor who fills in two of five and walks away should come
 * back to two of five.
 */
export default async function DimensionPage({
  params,
}: {
  params: Promise<{ id: string; dimension: string }>;
}) {
  const { id, dimension: dimensionKey } = await params;
  const { view } = await readEvaluationPage(id);
  if (!view) notFound();

  const index = view.dimensions.findIndex((d) => d.dimension.key === dimensionKey);
  if (index === -1) notFound();
  const draft = view.dimensions[index]!;
  const previous = view.dimensions[index - 1];
  const next = view.dimensions[index + 1];
  const base = `/admin/evaluations/${view.id}/dimensions`;

  return (
    <>
      <nav
        aria-label="Dimensions"
        className="mb-5 flex flex-wrap gap-1 text-[0.78rem]"
      >
        {view.dimensions.map((entry) => {
          const current = entry.dimension.key === dimensionKey;
          return (
            <Link
              key={entry.dimension.key}
              href={`${base}/${entry.dimension.key}` as never}
              aria-current={current ? "page" : undefined}
              className={`rounded-sm border px-2 py-1 no-underline ${
                current
                  ? "border-ink bg-graphite text-bone"
                  : "border-rule text-ink-soft hover:border-rule-strong hover:text-ink"
              }`}
            >
              {entry.dimension.shortLabel}{" "}
              <span className="tabular-nums opacity-70">
                {entry.authoredCount}/{entry.subcriteria.length}
              </span>
            </Link>
          );
        })}
      </nav>

      <Panel
        title={draft.dimension.name}
        description={draft.dimension.coreQuestion}
        actions={
          <span className="text-[0.82rem] text-ink-soft">
            {draft.score ? (
              <>
                Derived total{" "}
                <strong className="tabular-nums">{draft.display}</strong>
                {draft.score.kind === "range" ? " (one unknown)" : null}
                {draft.score.kind === "insufficient" ? " — not scored" : null}
              </>
            ) : (
              <>
                {draft.authoredCount}/{draft.subcriteria.length} authored — no
                total yet
              </>
            )}
          </span>
        }
      >
        <Notice>
          <strong>Not this:</strong> {draft.dimension.boundary}
        </Notice>

        {draft.score ? (
          <p className="m-0 mb-3 text-[0.82rem] text-ink-soft">
            The total is <strong>derived</strong> from the five values below and
            is never typed. It cannot disagree with its own rationales, and it is
            computed by the same function the public profile uses.
            {draft.score.kind === "range"
              ? " One Unknown makes it a two-point range rather than a false point value."
              : null}
            {draft.score.kind === "insufficient"
              ? " Two or more Unknowns leave the dimension unscored rather than published as a four-point range."
              : null}
          </p>
        ) : (
          <p className="m-0 mb-3 text-[0.82rem] text-ink-soft">
            A total appears once all five are authored. Until then there is
            nothing honest to derive — a partial grid would produce a number that
            changed meaning as you filled it in.
          </p>
        )}

        <ol className="m-0 list-none p-0">
          {draft.subcriteria.map((sub) => (
            <li key={sub.key} className="border-b border-rule py-4 last:border-b-0">
              <SubcriterionEditor
                evaluationId={view.id}
                dimensionKey={draft.dimension.key}
                sub={sub}
                editable={view.editable}
                platforms={view.gamePlatforms}
              />
            </li>
          ))}
        </ol>
      </Panel>

      <Panel
        title="Confidence in this dimension"
        description="An editorial input, not something derivable from the scores. A dimension may sit at Medium inside an otherwise High-confidence profile — that is the point of recording it separately (SOP §5)."
      >
        {view.editable ? (
          <ActionForm
            action={saveDimensionAssessmentAction.bind(null, view.id)}
            submitLabel="Save confidence"
          >
            <>
              <input type="hidden" name="dimensionKey" value={draft.dimension.key} />
              <div className="grid gap-x-5 sm:grid-cols-2">
                <Field name="confidence" label="Confidence">
                  <Select
                    name="confidence"
                    required
                    defaultValue={draft.confidence ?? ""}
                    options={[
                      { value: "low", label: "Low" },
                      { value: "medium", label: "Medium" },
                      { value: "high", label: "High" },
                    ]}
                  />
                </Field>
                <Field
                  name="note"
                  label="Note"
                  hint="Optional. Why the evidence here is stronger or thinner than elsewhere."
                >
                  <TextInput name="note" defaultValue={draft.note} />
                </Field>
              </div>
            </>
          </ActionForm>
        ) : (
          <p className="m-0 text-[0.9rem]">
            {draft.confidence ?? "not recorded"}
            {draft.note ? ` — ${draft.note}` : null}
          </p>
        )}
      </Panel>

      <nav className="mb-8 flex justify-between text-[0.85rem]">
        {previous ? (
          <Link href={`${base}/${previous.dimension.key}` as never} className="text-ink-soft">
            ← {previous.dimension.name}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`${base}/${next.dimension.key}` as never} className="text-ink-soft">
            {next.dimension.name} →
          </Link>
        ) : (
          <Link
            href={`/admin/evaluations/${view.id}/interpretation` as never}
            className="text-ink-soft"
          >
            Tags &amp; interpretation →
          </Link>
        )}
      </nav>
    </>
  );
}

function SubcriterionEditor({
  evaluationId,
  dimensionKey,
  sub,
  editable,
  platforms,
}: {
  evaluationId: string;
  dimensionKey: string;
  sub: SubcriterionDraft;
  editable: boolean;
  platforms: readonly { id: string; name: string }[];
}) {
  const stateLabel =
    sub.value === null ? "not yet authored" : sub.value === UNKNOWN ? "Unknown" : "scored";

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="sip-display m-0 text-[0.95rem]">{sub.name}</h3>
        <Pill
          tone={sub.value === null ? "past" : sub.value === UNKNOWN ? "draft" : "live"}
        >
          {stateLabel}
        </Pill>
        {sub.overrides.length > 0 ? (
          <Pill>{sub.overrides.length} platform override(s)</Pill>
        ) : null}
      </div>
      <p className="m-0 mb-3 max-w-[52rem] text-[0.85rem] text-ink-soft">
        {sub.description}
      </p>

      {editable ? (
        <ActionForm
          action={saveSubcriterionAction.bind(null, evaluationId)}
          submitLabel="Save"
        >
          <>
            <input type="hidden" name="dimensionKey" value={dimensionKey} />
            <input type="hidden" name="subcriterionKey" value={sub.key} />
            <div className="grid gap-x-5 sm:grid-cols-[16rem_minmax(0,1fr)]">
              <Field
                name="value"
                label="Value"
                hint="Unknown is not zero. Zero is a reading; Unknown is the absence of one."
              >
                <Select
                  name="value"
                  defaultValue={
                    sub.value === null ? "" : sub.value === UNKNOWN ? UNKNOWN : String(sub.value)
                  }
                  options={[
                    ...SUBCRITERION_SCALE.map((step) => ({
                      value: String(step.value),
                      label: `${step.value} · ${step.label}`,
                    })),
                    { value: UNKNOWN, label: "Unknown — evidence does not settle it" },
                  ]}
                />
              </Field>
              <Field
                name="rationale"
                label="Rationale"
                hint="Why this value, in the terms the rubric uses."
              >
                <TextArea name="rationale" defaultValue={sub.rationale} rows={3} />
              </Field>
              <Field
                name="evidenceConfidence"
                label="Confidence in this reading"
                hint="Optional, and separate from the dimension's."
              >
                <Select
                  name="evidenceConfidence"
                  defaultValue={sub.evidenceConfidence ?? ""}
                  options={[
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ]}
                />
              </Field>
              <Field
                name="platformNote"
                label="Platform note"
                hint="Prose context on this score. A materially different value on a platform is an override below, not a note."
              >
                <TextInput name="platformNote" defaultValue={sub.platformNote} />
              </Field>
            </div>
          </>
        </ActionForm>
      ) : (
        <dl className="m-0 text-[0.88rem]">
          <div className="flex gap-3">
            <dt className="w-24 text-ink-quiet">Value</dt>
            <dd className="m-0">{sub.value === null ? "—" : String(sub.value)}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 text-ink-quiet">Rationale</dt>
            <dd className="m-0">{sub.rationale ?? "—"}</dd>
          </div>
        </dl>
      )}

      <div className="mt-3">
        <Disclosure
          summary={`Platform overrides (${sub.overrides.length})`}
          defaultOpen={sub.overrides.length > 0}
        >
          <p className="m-0 mb-3 max-w-[52rem] text-[0.82rem] text-ink-soft">
            A materially different reading on one platform. The base score above
            stays canonical and <strong>no override ever enters the dimension
            total</strong> — overrides are the exception layer, so a severe
            divergence is recorded rather than averaged into the base or
            duplicated into a parallel evaluation per platform (ADR 0015).
          </p>

          {sub.overrides.length === 0 ? (
            <Empty>No overrides.</Empty>
          ) : (
            <ul className="m-0 mb-4 list-none p-0">
              {sub.overrides.map((override) => (
                <li
                  key={override.platformId}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule py-1.5 last:border-b-0"
                >
                  <span className="text-[0.88rem]">{override.platformName}</span>
                  <span className="tabular-nums text-ink-soft">
                    {override.value === UNKNOWN ? "Unknown" : String(override.value)}
                  </span>
                  <span className="w-full text-[0.82rem] text-ink-soft">
                    {override.rationale}
                  </span>
                  {editable ? (
                    <span className="ml-auto">
                      <ActionButton
                        action={removeOverrideAction.bind(
                          null,
                          evaluationId,
                          dimensionKey,
                          sub.key,
                          override.platformId,
                        )}
                        label="Remove"
                        confirm={`Remove the ${override.platformName} override?`}
                      />
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {editable && platforms.length > 0 ? (
            <ActionForm
              action={saveOverrideAction.bind(null, evaluationId)}
              submitLabel="Save override"
            >
              <>
                <input type="hidden" name="dimensionKey" value={dimensionKey} />
                <input type="hidden" name="subcriterionKey" value={sub.key} />
                <div className="grid gap-x-5 sm:grid-cols-3">
                  <Field name="platformId" label="Platform">
                    <Select
                      name="platformId"
                      required
                      options={platforms.map((platform) => ({
                        value: platform.id,
                        label: platform.name,
                      }))}
                    />
                  </Field>
                  <Field
                    name="value"
                    label="Value on this platform"
                    hint="Must differ from the base score — an override equal to the base is not a deviation."
                  >
                    <Select
                      name="value"
                      required
                      options={[
                        ...SUBCRITERION_SCALE.map((step) => ({
                          value: String(step.value),
                          label: `${step.value} · ${step.label}`,
                        })),
                        { value: UNKNOWN, label: "Unknown on this platform" },
                      ]}
                    />
                  </Field>
                  <Field
                    name="evidenceConfidence"
                    label="Confidence"
                    hint="Optional."
                  >
                    <Select
                      name="evidenceConfidence"
                      options={[
                        { value: "low", label: "Low" },
                        { value: "medium", label: "Medium" },
                        { value: "high", label: "High" },
                      ]}
                    />
                  </Field>
                  <div className="sm:col-span-3">
                    <Field
                      name="rationale"
                      label="Rationale"
                      hint="Required. An unexplained divergence is exactly the single unexplained number the rubric forbids."
                    >
                      <TextArea name="rationale" rows={2} />
                    </Field>
                  </div>
                </div>
              </>
            </ActionForm>
          ) : null}
        </Disclosure>
      </div>
    </div>
  );
}
