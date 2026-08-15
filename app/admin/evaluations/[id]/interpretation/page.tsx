import { notFound } from "next/navigation";
import {
  moveTagAction,
  saveInterpretationAction,
  setTagsAction,
} from "@/app/admin/evaluation-actions";
import {
  ActionButton,
  ActionForm,
  Field,
  TextArea,
  TextInput,
} from "@/components/admin/forms";
import { Empty, Notice, Panel, Pill } from "@/components/admin/ui";
import { readEvaluationPage } from "@/lib/admin/evaluations";
import { BLOCK_HEADINGS } from "@/lib/admin/evaluation-validation";
import { TAGS } from "@/lib/rubric/tags";

/**
 * Tags and the interpretation a reader actually reads.
 *
 * ── The block headings change with evidence status, the block types do not ──
 *
 * A released profile says "Great fit if…", a pre-release one "Looks
 * promising if…" (Plan §3.6). Same three `block_type` values underneath, so a
 * pre-release profile revised after launch keeps its shape and only its
 * vocabulary moves. The headings here are read from the evaluation's own
 * evidence status rather than chosen by the editor, because they are a
 * consequence of that status and not an independent decision.
 *
 * ── Membership and order are two different acts ─────────────────────────────
 *
 * Migration 0008 gave `evaluation_tags` a `display_order`, so the sequence a
 * reader meets is authored rather than derived. A checkbox list cannot author
 * it: ticking forty-four boxes says which tags, and says nothing about which
 * comes first. So the panels are split the way the evidence step splits — an
 * ordered list with Up/Down at the top, the chooser below — and `setTags`
 * preserves the order the arrows established, because the chooser renders
 * selected tags first, in that order, and submits in document order.
 */
export default async function InterpretationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { view } = await readEvaluationPage(id);
  if (!view) notFound();

  const headings =
    view.evidenceStatus === "pre_release"
      ? BLOCK_HEADINGS.pre_release
      : BLOCK_HEADINGS.released;

  const selected = new Map(view.tags.map((tag) => [tag.key, tag]));
  // Selected tags first, in their authored order, then the rest of the
  // vocabulary in its own order. An editor rearranging a selection should not
  // have to hunt through forty-four checkboxes to find the four they chose.
  const ordered = [
    ...view.tags.map((tag) => TAGS.find((t) => t.key === tag.key)!).filter(Boolean),
    ...TAGS.filter((tag) => !selected.has(tag.key)),
  ];

  return (
    <>
      <Panel
        title={`Experience tags (${view.tags.length})`}
        description="What a reader sees, in the order they see it. Tags describe what playing this is like — they are not genres and they are not scores."
      >
        {view.tags.length === 0 ? (
          <Empty>No tags selected yet.</Empty>
        ) : (
          <ol className="m-0 list-none p-0">
            {view.tags.map((tag, index) => (
              <li
                key={tag.key}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule py-1.5 last:border-b-0"
              >
                <span className="w-6 shrink-0 tabular-nums text-ink-quiet">
                  {index + 1}
                </span>
                <span className="text-[0.9rem]">{tag.label}</span>
                {tag.intensity ? <Pill tone="past">{tag.intensity}</Pill> : null}
                {tag.note ? (
                  <span className="text-[0.82rem] text-ink-soft">{tag.note}</span>
                ) : null}
                {view.editable ? (
                  <span className="ml-auto flex gap-1">
                    <ActionButton
                      action={moveTagAction.bind(null, view.id, tag.key, "up")}
                      label="↑"
                    />
                    <ActionButton
                      action={moveTagAction.bind(null, view.id, tag.key, "down")}
                      label="↓"
                    />
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Panel>

      {view.editable ? (
        <Panel
          title="Choose tags"
          description="Tick a tag to include it. Order is set above — a new tag joins the end of the list."
        >
          <ActionForm action={setTagsAction.bind(null, view.id)} submitLabel="Save tags">
            <>
              <Notice>
                Saving keeps the order set above; newly ticked tags append. The
                vocabulary is closed (Rubric §20) — a tag that does not exist here
                is a tag this profile does not claim.
              </Notice>
              <ul className="m-0 list-none p-0">
                {ordered.map((tag) => {
                  const current = selected.get(tag.key);
                  return (
                    <li
                      key={tag.key}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule py-1.5 last:border-b-0"
                    >
                      <label className="flex items-center gap-2 text-[0.88rem]">
                        <input
                          type="checkbox"
                          name="tagKey"
                          value={tag.key}
                          defaultChecked={Boolean(current)}
                        />
                        {tag.label}
                      </label>
                      <span className="text-[0.75rem] uppercase tracking-wide text-ink-quiet">
                        {tag.category}
                      </span>
                      {tag.valueType === "intensity" ? (
                        <select
                          name={`intensity:${tag.key}`}
                          defaultValue={current?.intensity ?? ""}
                          className="rounded-sm border border-rule-strong bg-page px-1.5 py-0.5 text-[0.8rem]"
                          aria-label={`${tag.label} intensity`}
                        >
                          <option value="">intensity…</option>
                          <option value="low">low</option>
                          <option value="medium">medium</option>
                          <option value="high">high</option>
                        </select>
                      ) : null}
                      <input
                        type="text"
                        name={`note:${tag.key}`}
                        defaultValue={current?.note ?? ""}
                        placeholder="note (optional)"
                        aria-label={`${tag.label} note`}
                        className="ml-auto w-full max-w-[22rem] rounded-sm border border-rule bg-page px-2 py-0.5 text-[0.8rem]"
                      />
                      <span className="w-full text-[0.8rem] text-ink-soft">
                        {tag.description}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          </ActionForm>
        </Panel>
      ) : null}

      <Panel
        title="Interpretation"
        description="What this is to play, and who it is not for. Never whether it is good — there is no verdict and no overall score."
      >
        {view.editable ? (
          <ActionForm
            action={saveInterpretationAction.bind(null, view.id)}
            submitLabel="Save interpretation"
          >
            <>
              <Field
                name="oneLineExperience"
                label="One-line experience"
                hint="One sentence. What this is to play, not whether it is good."
              >
                <TextArea
                  name="oneLineExperience"
                  defaultValue={view.oneLineExperience}
                  rows={2}
                />
              </Field>
              <div className="grid gap-x-5 sm:grid-cols-2">
                <Field
                  name="primaryPull"
                  label="Primary pull"
                  hint="Exactly one. The single strongest reason this earns attention."
                >
                  <TextArea name="primaryPull" defaultValue={view.primaryPull} rows={3} />
                </Field>
                <Field
                  name="primaryRisk"
                  label="Primary risk"
                  hint="Exactly one. The single most likely source of mismatch."
                >
                  <TextArea name="primaryRisk" defaultValue={view.primaryRisk} rows={3} />
                </Field>
              </div>
              <Field
                name="platformWarning"
                label="Platform warning"
                hint="Only where a platform difference is severe enough that a reader must know before buying."
              >
                <TextInput name="platformWarning" defaultValue={view.platformWarning} />
              </Field>

              {(["great_fit", "know_before", "probably_not"] as const).map((type) => (
                <Field
                  key={type}
                  name={type}
                  label={headings[type]}
                  hint="One bullet per line. Blank lines are ignored."
                >
                  <TextArea
                    name={type}
                    defaultValue={view.blocks[type].join("\n")}
                    rows={4}
                  />
                </Field>
              ))}
            </>
          </ActionForm>
        ) : (
          <dl className="m-0 text-[0.9rem]">
            <dt className="text-ink-quiet">One-line experience</dt>
            <dd className="mb-2 ml-0">{view.oneLineExperience ?? "—"}</dd>
            <dt className="text-ink-quiet">Primary pull</dt>
            <dd className="mb-2 ml-0">{view.primaryPull ?? "—"}</dd>
            <dt className="text-ink-quiet">Primary risk</dt>
            <dd className="mb-2 ml-0">{view.primaryRisk ?? "—"}</dd>
          </dl>
        )}
      </Panel>
    </>
  );
}
