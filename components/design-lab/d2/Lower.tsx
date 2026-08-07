import type { ProfileView } from "@/lib/profile/build";
import {
  BLOCK_ORDER,
  CONFIDENCE_LABEL,
  EVIDENCE_STATUS_LABEL,
  blockHeadings,
} from "@/lib/profile/vocabulary";
import { formatDate } from "@/lib/format";
import {
  evaluationNotice,
  type EvaluationArt,
} from "@/lib/design-lab/evaluation-art";

const PROVENANCE_LABEL: Readonly<
  Record<ProfileView["evaluation"]["scoreProvenance"], string>
> = {
  calibration_round_1: "Calibration round 1",
  calibration_round_2: "Calibration round 2",
  derived_pending_round_1_reconciliation:
    "Derived from the rubric, pending calibration reconciliation",
};

/**
 * Everything below the identity treatment, shared by both D2 studies.
 *
 * This is Direction D's structure, unchanged in substance. The one real move is
 * that the trust and provenance material — evidence status, overall confidence,
 * rubric version, calibration round, evidence cut-off, ledger state and the
 * no-overall-score rule — has been pulled out of the first viewport and
 * collected here, where a reader who wants it can find all of it at once.
 *
 * The studies differ above this line, not below it, so a reviewer is comparing
 * identity treatments rather than two different pages.
 */
export function Lower({
  profile,
  art,
  serifInterpretation = false,
}: {
  profile: ProfileView;
  art: EvaluationArt;
  /** D2-B reserves the serif for editorial interpretation; D2-A does not. */
  serifInterpretation?: boolean;
}) {
  const { evaluation } = profile;
  const headings = blockHeadings(evaluation.evidenceStatus);
  const interpretation = serifInterpretation ? "dl-d2__prose" : "";

  return (
    <>
      {/* Pull and risk ------------------------------------------------- */}
      <section className="mx-auto w-full max-w-[74rem] px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
          {(
            [
              ["Primary pull", evaluation.primaryPull, true],
              ["Primary risk", evaluation.primaryRisk, false],
            ] as const
          ).map(([label, text, isPull]) => (
            <div key={label}>
              <h2
                className="dl-d2__label"
                style={{
                  color: isPull ? "var(--dl-accent)" : "var(--dl-ink-quiet)",
                }}
              >
                {label}
              </h2>
              <p
                className={`${interpretation} mt-2.5 max-w-[34rem] text-[1.0625rem] leading-[1.5]`}
              >
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Who this is for ------------------------------------------------ */}
      <section className="mx-auto w-full max-w-[74rem] px-5 pb-12 sm:px-8">
        <h2 className="dl-d2__label" style={{ color: "var(--dl-ink-quiet)" }}>
          Who this is for
        </h2>
        <div className="mt-5 grid gap-x-10 gap-y-8 lg:grid-cols-3">
          {BLOCK_ORDER.map((type) => (
            <section key={type}>
              <h3 className="dl-d2__display text-[1.0625rem]">
                {headings[type].title}
              </h3>
              <ul className="mt-3 list-none space-y-2.5 p-0">
                {evaluation.blocks[type].map((item) => (
                  <li
                    key={item}
                    className="text-[0.9375rem] leading-snug"
                    style={{ color: "var(--dl-ink-soft)" }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 grid gap-x-10 gap-y-6 lg:grid-cols-2">
          <div>
            <h3
              className="dl-d2__label"
              style={{ color: "var(--dl-ink-quiet)" }}
            >
              Traits
            </h3>
            <p
              className="mt-2 max-w-[38rem] text-[0.9375rem] leading-relaxed"
              style={{ color: "var(--dl-ink-soft)" }}
            >
              {profile.tags.map((tag, i) => (
                <span key={tag.definition.key}>
                  {i > 0 && " · "}
                  <span style={{ color: "var(--dl-ink)" }}>
                    {tag.definition.label}
                  </span>
                  {tag.intensity && (
                    <span className="dl-d2__label"> {tag.intensity}</span>
                  )}
                </span>
              ))}
            </p>
          </div>
          {evaluation.platformWarning && (
            <div>
              <h3
                className="dl-d2__label"
                style={{ color: "var(--dl-accent)" }}
              >
                Platform variance
              </h3>
              <p
                className="mt-2 max-w-[38rem] text-[0.9375rem] leading-relaxed"
                style={{ color: "var(--dl-ink-soft)" }}
              >
                {evaluation.platformWarning}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Trust and provenance — everything the first viewport no longer
          carries, collected in one compact place. -------------------------- */}
      <section
        className="px-5 py-10 sm:px-8"
        style={{ background: "var(--dl-trust)" }}
      >
        <div className="mx-auto w-full max-w-[74rem]">
          <h2 className="dl-d2__label" style={{ color: "var(--dl-ink)" }}>
            How this profile was made
          </h2>

          <div className="mt-5 grid gap-x-10 gap-y-7 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <dl className="grid max-w-[40rem] grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
                {[
                  ["Evidence status", EVIDENCE_STATUS_LABEL[evaluation.evidenceStatus]],
                  ["Overall confidence", CONFIDENCE_LABEL[evaluation.confidence]],
                  ["Rubric", `v${evaluation.rubricVersion}`],
                  ["Scores", PROVENANCE_LABEL[evaluation.scoreProvenance]],
                  ["Evidence cut-off", formatDate(evaluation.evidenceCutoffAt)],
                  ["Release context", evaluation.releaseContext],
                  [
                    "Ledger",
                    evaluation.evidenceLedger === "pending"
                      ? "Source records pending"
                      : "Source records held",
                  ],
                  ["Edition", evaluation.scope.edition],
                  ["Mode", evaluation.scope.mode],
                  ["Platforms", evaluation.scope.platforms.join(", ")],
                  ["Build", evaluation.scope.buildOrPatch],
                ].map(([term, value]) => (
                  <div key={term}>
                    <dt
                      className="dl-d2__label"
                      style={{ color: "var(--dl-ink-quiet)" }}
                    >
                      {term}
                    </dt>
                    <dd className="mt-0.5 text-[0.875rem] leading-snug">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p
                className="mt-6 max-w-[40rem] text-[0.9375rem] leading-relaxed"
                style={{ color: "var(--dl-ink-soft)" }}
              >
                Each of the eight dimensions is scored 0–10 on its own, from five
                subcriteria worth 0–2 each. Totals are derived from those five,
                never entered by hand. There is no overall score, and nothing is
                calculated from the area the profile shape encloses — the shape
                describes what kind of game this is, not how good it is.
              </p>
            </div>

            <div>
              <h3
                className="dl-d2__label"
                style={{ color: "var(--dl-ink-quiet)" }}
              >
                Evidence
              </h3>
              <ol className="mt-2.5 list-none space-y-2 p-0">
                {evaluation.sources.map((source) => (
                  <li
                    key={source.id}
                    className="text-[0.9375rem] leading-snug"
                    style={{ color: "var(--dl-ink-soft)" }}
                  >
                    {source.title}
                    <span className="dl-d2__label"> Tier {source.tier}</span>
                  </li>
                ))}
              </ol>
              <p
                className="mt-3 text-[0.875rem] leading-relaxed"
                style={{ color: "var(--dl-ink-quiet)" }}
              >
                {evaluation.evidenceLedger === "pending"
                  ? "The ledger holds these classes of source, not yet the individual records behind them. No source count is published until it does."
                  : "Sources are evidence, not votes. Nothing here is averaged."}
              </p>
            </div>
          </div>

          {/* Rights notice. Required wherever the evaluation artwork renders. */}
          <p
            className="mt-8 max-w-[54rem] border-t pt-4 text-[0.8125rem] leading-relaxed"
            style={{
              color: "var(--dl-ink-quiet)",
              borderColor: "rgba(22,24,28,0.18)",
            }}
          >
            {evaluationNotice(art)}
          </p>
        </div>
      </section>
    </>
  );
}
