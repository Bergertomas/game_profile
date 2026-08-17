import { notFound } from "next/navigation";
import { Notice, Panel, Pill } from "@/components/admin/ui";
import { readEvaluationPage } from "@/lib/admin/evaluations";
import { BLOCK_HEADINGS } from "@/lib/admin/evaluation-validation";

/**
 * The derived result, read-only.
 *
 * ── What this is, and what it is not ────────────────────────────────────────
 *
 * It is the arithmetic an editor should be able to check: every dimension's
 * derived total, how it was derived, and which readings are Unknown. It is NOT
 * the Phase 2D preview, which renders the actual public profile through the
 * public renderer and is the thing an editor signs off. Calling this a preview
 * would invite exactly the mistake 2D exists to prevent — approving a profile
 * against a lookalike rather than against what will ship.
 *
 * Everything here is derived. Nothing on this page is editable, and that is the
 * point: a total that could be typed is a total that can disagree with its own
 * rationales.
 */
export default async function ReviewPage({
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

  const incomplete = view.dimensions.filter((d) => d.score === null);

  return (
    <>
      <Notice>
        Everything below is <strong>derived</strong>, by the same scoring
        function the public profile uses. There is no editable field on this
        page and there is no overall score — the product does not have one.
        Formal preview, validation and publication arrive in Phase 2D.
      </Notice>

      {incomplete.length > 0 ? (
        <Notice tone="blocked">
          {incomplete.length} dimension{incomplete.length === 1 ? " is" : "s are"}{" "}
          not fully authored, so {incomplete.length === 1 ? "it has" : "they have"}{" "}
          no total yet: {incomplete.map((d) => d.dimension.name).join(", ")}. This
          is a draft-completeness note, not a validation failure.
        </Notice>
      ) : null}

      <Panel
        title="Derived dimension totals"
        description="Each is the sum of its five subcriteria. A single Unknown makes the total a two-point range; two or more leave it unscored rather than published as fake precision (Rubric §21)."
      >
        <table className="w-full border-collapse text-[0.9rem]">
          <thead>
            <tr className="border-b border-rule-strong text-left">
              <th scope="col" className="py-2 pr-3 font-normal text-ink-quiet">
                Dimension
              </th>
              <th scope="col" className="py-2 pr-3 font-normal text-ink-quiet">
                Derived total
              </th>
              <th scope="col" className="py-2 pr-3 font-normal text-ink-quiet">
                State
              </th>
              <th scope="col" className="py-2 font-normal text-ink-quiet">
                Confidence
              </th>
            </tr>
          </thead>
          <tbody>
            {view.dimensions.map((entry) => (
              <tr key={entry.dimension.key} className="border-b border-rule last:border-b-0">
                <td className="py-2 pr-3">{entry.dimension.name}</td>
                <td className="py-2 pr-3 tabular-nums">
                  {entry.display ?? (
                    <span className="text-ink-quiet">
                      {entry.authoredCount}/{entry.subcriteria.length} authored
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3">
                  {entry.score === null ? (
                    <Pill tone="past">incomplete</Pill>
                  ) : entry.score.kind === "exact" ? (
                    <Pill tone="live">exact</Pill>
                  ) : entry.score.kind === "range" ? (
                    <Pill tone="draft">range · 1 unknown</Pill>
                  ) : (
                    <Pill>not scored · {entry.score.unknownCount} unknown</Pill>
                  )}
                </td>
                <td className="py-2">
                  {entry.confidence ?? <span className="text-ink-quiet">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Interpretation as authored">
        <dl className="m-0 text-[0.9rem]">
          <Row term="One-line experience" value={view.oneLineExperience} />
          <Row term="Primary pull" value={view.primaryPull} />
          <Row term="Primary risk" value={view.primaryRisk} />
          <Row term="Platform warning" value={view.platformWarning} />
        </dl>

        {(["great_fit", "know_before", "probably_not"] as const).map((type) => (
          <div key={type} className="mt-4">
            <h3 className="sip-display m-0 mb-1 text-[0.95rem]">{headings[type]}</h3>
            {view.blocks[type].length === 0 ? (
              <p className="m-0 text-[0.85rem] italic text-ink-quiet">Nothing yet.</p>
            ) : (
              <ul className="m-0 pl-5 text-[0.9rem]">
                {view.blocks[type].map((text, index) => (
                  <li key={index}>{text}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </Panel>

      <Panel
        title="Evidence summary"
        description="Counts distinct sources, not mappings. Tier A and B only — first-party material and anecdote are recorded but are not what a 'supported by N sources' claim rests on."
      >
        <p className="m-0 text-[0.9rem]">
          {distinctSources(view.evidence)} distinct source
          {distinctSources(view.evidence) === 1 ? "" : "s"} across{" "}
          {view.evidence.length} mapping{view.evidence.length === 1 ? "" : "s"};{" "}
          {substantive(view.evidence)} of them tier A or B.
        </p>
        {view.evidenceLedger === "pending" ? (
          <Notice tone="warning">
            The ledger is pending, so the public profile suppresses these counts
            entirely and says the individual records are still to be populated.
          </Notice>
        ) : null}
      </Panel>
    </>
  );
}

function Row({ term, value }: { term: string; value: string | null }) {
  return (
    <div className="flex gap-4 border-b border-rule py-1.5 last:border-b-0">
      <dt className="w-44 shrink-0 text-[0.78rem] uppercase tracking-wide text-ink-quiet">
        {term}
      </dt>
      <dd className="m-0">{value ?? <span className="text-ink-quiet">—</span>}</dd>
    </div>
  );
}

function distinctSources(
  links: readonly { sourceId: string }[],
): number {
  return new Set(links.map((link) => link.sourceId)).size;
}

function substantive(
  links: readonly { sourceId: string; tier: string }[],
): number {
  const byTier = new Map(links.map((link) => [link.sourceId, link.tier]));
  return [...byTier.values()].filter((tier) => tier === "A" || tier === "B").length;
}
