import { notFound } from "next/navigation";
import {
  linkEvidenceAction,
  moveEvidenceAction,
  saveEvidenceSourceAction,
  unlinkEvidenceAction,
} from "@/app/admin/evaluation-actions";
import {
  ActionButton,
  ActionForm,
  Disclosure,
  Field,
  GroupedSelect,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/forms";
import { Empty, Notice, Panel, Pill } from "@/components/admin/ui";
import { readEvaluationPage } from "@/lib/admin/evaluations";
import { dimensionsInRadarOrder } from "@/lib/rubric";

/**
 * Evidence, before scores.
 *
 * The step order is editorial (Master Plan §8.1): a score authored before its
 * evidence is a number looking for a justification, which is the failure the
 * whole methodology exists to prevent.
 *
 * ── Sources and mappings are two different things ───────────────────────────
 *
 * A SOURCE exists once in the catalogue and is identified by its stable key
 * (ADR 0006) — titles are not unique, so nothing resolves a source by title. A
 * MAPPING attaches that source to this evaluation, optionally narrowed to a
 * dimension or a single subcriterion. One source legitimately maps several
 * times; that is why a link is its own row.
 *
 * ── Order is authored ───────────────────────────────────────────────────────
 *
 * Migration 0008 gave links a `display_order`, so the sequence here is the
 * sequence a reader sees. New links append, because inserting into the middle
 * of a list somebody arranged is a decision they did not make.
 */
export default async function EvidencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { view, sources } = await readEvaluationPage(id);
  if (!view) notFound();

  const dimensionOptions = dimensionsInRadarOrder().map((dimension) => ({
    value: dimension.key,
    label: dimension.name,
  }));

  // The forty subcriteria, under the dimension each belongs to. Read from the
  // rubric module rather than listed here — nothing in the UI may hardcode
  // rubric labels or ordering (Master Plan §25.10), and this is the control that
  // would otherwise be most tempted to.
  const subcriterionGroups = dimensionsInRadarOrder().map((dimension) => ({
    label: dimension.name,
    options: dimension.subcriteria.map((subcriterion) => ({
      value: subcriterion.key,
      label: subcriterion.name,
    })),
  }));

  return (
    <>
      {view.evidenceLedger === "pending" ? (
        <Notice tone="warning">
          The evidence ledger is <strong>pending</strong>, so the public profile
          suppresses source counts and says the individual records are still to
          be populated. Set it to Populated on the Context step once the ledger
          genuinely reconciles — until then a count would overstate what has been
          recorded (SOP §6).
        </Notice>
      ) : null}

      <Panel
        title={`Mapped evidence (${view.evidence.length})`}
        description="What this evaluation rests on, in the order a reader will see it. Evidence is counted, never weighted — a mapping makes no claim that one source matters more than another."
      >
        {view.evidence.length === 0 ? (
          <Empty>Nothing mapped yet.</Empty>
        ) : (
          <ol className="m-0 list-none p-0">
            {view.evidence.map((link, index) => (
              <li
                key={link.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule py-2 last:border-b-0"
              >
                <span className="w-6 shrink-0 tabular-nums text-ink-quiet">
                  {index + 1}
                </span>
                <span className="text-[0.9rem]">{link.title}</span>
                <code className="text-[0.75rem] text-ink-quiet">{link.sourceKey}</code>
                <Pill tone="past">tier {link.tier}</Pill>
                <Pill tone="past">{link.category.replace(/_/g, " ")}</Pill>
                {link.dimensionKey ? (
                  <Pill>
                    {link.dimensionKey}
                    {link.subcriterionKey ? ` · ${link.subcriterionKey}` : ""}
                  </Pill>
                ) : (
                  <Pill tone="past">profile-level</Pill>
                )}
                {link.spoilerSensitive ? <Pill tone="draft">spoiler</Pill> : null}
                {link.platformScope?.length ? (
                  <span className="text-[0.78rem] text-ink-quiet">
                    {link.platformScope.join(", ")}
                  </span>
                ) : null}
                {link.note ? (
                  <span className="w-full text-[0.82rem] text-ink-soft">{link.note}</span>
                ) : null}
                {view.editable ? (
                  <span className="ml-auto flex gap-1">
                    <ActionButton
                      action={moveEvidenceAction.bind(null, view.id, link.id, "up")}
                      label="↑"
                    />
                    <ActionButton
                      action={moveEvidenceAction.bind(null, view.id, link.id, "down")}
                      label="↓"
                    />
                    <ActionButton
                      action={unlinkEvidenceAction.bind(null, view.id, link.id)}
                      label="Unmap"
                      confirm={`Unmap “${link.title}” from this evaluation? The source itself stays in the catalogue.`}
                    />
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Panel>

      {view.editable ? (
        <>
          <Panel
            title="Map a source to this evaluation"
            description="Leave the dimension empty for profile-level evidence — scope or factual context that does not support any particular score."
          >
            <ActionForm
              action={linkEvidenceAction.bind(null, view.id)}
              submitLabel="Map source"
            >
              <div className="grid gap-x-5 sm:grid-cols-2">
                <Field name="evidenceSourceId" label="Source">
                  <Select
                    name="evidenceSourceId"
                    required
                    options={sources.map((source) => ({
                      value: source.id,
                      label: `${source.sourceKey} — ${source.title}`,
                    }))}
                  />
                </Field>
                <Field
                  name="dimensionKey"
                  label="Dimension"
                  hint="Optional. Drives the per-dimension linked-source count."
                >
                  <Select name="dimensionKey" options={dimensionOptions} />
                </Field>
                <Field
                  name="subcriterionKey"
                  label="Subcriterion"
                  hint="Optional. Narrows the mapping to one of the dimension's five — it must be one of that dimension's own."
                >
                  <GroupedSelect
                    name="subcriterionKey"
                    placeholder="No single subcriterion"
                    groups={subcriterionGroups}
                  />
                </Field>
                <Field
                  name="platformScope"
                  label="Platform scope"
                  hint="Where the source speaks to particular platforms."
                >
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {view.gamePlatforms.map((platform) => (
                      <label
                        key={platform.id}
                        className="flex items-center gap-1.5 text-[0.88rem]"
                      >
                        <input
                          type="checkbox"
                          name="platformScope"
                          value={platform.name}
                        />
                        {platform.name}
                      </label>
                    ))}
                  </div>
                </Field>
                <div className="sm:col-span-2">
                  <Field
                    name="note"
                    label="Note"
                    hint="Disagreement between sources belongs here, recorded rather than silently resolved (SOP §6)."
                  >
                    <TextArea name="note" rows={2} />
                  </Field>
                </div>
                <Field
                  name="spoilerSensitive"
                  label="Spoiler-sensitive"
                  hint="Recorded so it is never surfaced blind."
                >
                  <label className="flex items-center gap-2 text-[0.88rem]">
                    <input type="checkbox" name="spoilerSensitive" />
                    This note discusses story specifics
                  </label>
                </Field>
              </div>
            </ActionForm>
          </Panel>

          <Panel
            title="Evidence sources"
            description="The catalogue, shared across evaluations. A source cited by a published evaluation is frozen — its record is part of that profile's explanation of itself."
          >
            <Disclosure summary={`Add or update a source (${sources.length} in the catalogue)`}>
              <ActionForm
                action={saveEvidenceSourceAction.bind(null, view.id)}
                submitLabel="Save source"
              >
                <div className="grid gap-x-5 sm:grid-cols-2">
                  <Field
                    name="sourceKey"
                    label="Source key"
                    hint="Stable identity, e.g. src_aw2_technical_analysis. Titles are not unique, so nothing resolves a source by title."
                  >
                    <TextInput name="sourceKey" required />
                  </Field>
                  <Field name="title" label="Title">
                    <TextInput name="title" required />
                  </Field>
                  <Field name="url" label="URL">
                    <TextInput name="url" />
                  </Field>
                  <Field name="publisher" label="Publisher">
                    <TextInput name="publisher" />
                  </Field>
                  <Field name="author" label="Author">
                    <TextInput name="author" />
                  </Field>
                  <Field name="publishedAt" label="Published">
                    <TextInput name="publishedAt" type="date" />
                  </Field>
                  <Field name="accessedAt" label="Accessed">
                    <TextInput name="accessedAt" type="date" />
                  </Field>
                  <Field
                    name="tier"
                    label="Evidence tier"
                    hint="A and B are substantive; C is first-party material and D is anecdote (SOP §4)."
                  >
                    <Select
                      name="tier"
                      required
                      options={[
                        { value: "A", label: "A — direct, verifiable" },
                        { value: "B", label: "B — substantive secondary" },
                        { value: "C", label: "C — first-party material" },
                        { value: "D", label: "D — anecdote / aggregate signal" },
                      ]}
                    />
                  </Field>
                  <Field name="category" label="Category">
                    <Select
                      name="category"
                      required
                      options={[
                        { value: "direct_play", label: "Direct play" },
                        { value: "critic", label: "Critic" },
                        { value: "technical", label: "Technical analysis" },
                        { value: "specialist_creator", label: "Specialist creator" },
                        { value: "player_signal", label: "Player signal" },
                        { value: "first_party", label: "First party" },
                      ]}
                    />
                  </Field>
                  <Field
                    name="sourceType"
                    label="Type"
                    hint='Free-text refinement, e.g. "video essay".'
                  >
                    <TextInput name="sourceType" />
                  </Field>
                </div>
              </ActionForm>
            </Disclosure>
          </Panel>
        </>
      ) : null}
    </>
  );
}
