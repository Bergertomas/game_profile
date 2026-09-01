import type { ProfileView } from "@/lib/profile/build";
import {
  BLOCK_ORDER,
  CONFIDENCE_LABEL,
  EVIDENCE_MATURITY_LABEL,
  EVIDENCE_STATUS_LABEL,
  SOURCE_CATEGORY_LABEL,
  blockHeadings,
} from "@/lib/profile/vocabulary";
import { formatDate } from "@/lib/format";
import { publicProvenanceLabel } from "@/lib/profile/provenance";
import { creditLineFor, type ProfileArtwork } from "@/lib/profile/artwork";

/**
 * Everything below the profile field.
 *
 * All the trust and provenance material is collected here rather than salted
 * through the page: evidence status, overall confidence, rubric version,
 * calibration round, evidence cut-off, release context, ledger state, the full
 * evaluation scope, the evidence list and the derivation rule. A reader who
 * wants any of it finds all of it in one place; a reader who only wants to know
 * what the game is like never has to walk past it.
 *
 * Nothing here is hidden — the scope, the confidence and the cut-off are
 * exactly what makes the eight numbers above readable as evidence rather than
 * as a verdict. It is placed, not buried.
 */
export function ProfileLower({
  profile,
  artwork,
}: {
  profile: ProfileView;
  artwork: ProfileArtwork | null;
}) {
  const { evaluation } = profile;
  const headings = blockHeadings(evaluation.evidenceStatus);

  return (
    <>
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
                className={`gp__label ${
                  isPull ? "gp__label--accent" : "gp__label--ink"
                }`}
              >
                {label}
              </h2>
              <p className="mt-2.5 max-w-[34rem] text-[1.0625rem] leading-[1.5]">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[74rem] px-5 pb-12 sm:px-8">
        <h2 className="gp__label gp__label--ink">Who this is for</h2>
        <div className="mt-5 grid gap-x-10 gap-y-8 lg:grid-cols-3">
          {BLOCK_ORDER.map((type) => (
            <section key={type}>
              <h3 className="gp__display text-[1.0625rem]">
                {headings[type].title}
              </h3>
              <ul className="mt-3 list-none space-y-2.5 p-0">
                {evaluation.blocks[type].map((item) => (
                  <li
                    key={item}
                    className="text-[0.9375rem] leading-snug text-[var(--gp-ink-soft)]"
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
            <h3 className="gp__label gp__label--ink">Traits</h3>
            <p className="mt-2 max-w-[38rem] text-[0.9375rem] leading-relaxed text-[var(--gp-ink-soft)]">
              {profile.tags.map((tag, i) => (
                <span key={tag.definition.key}>
                  {i > 0 && " · "}
                  <span className="text-[var(--gp-ink)]">
                    {tag.definition.label}
                  </span>
                  {tag.intensity && (
                    <span className="gp__label gp__label--ink">
                      {" "}
                      {tag.intensity}
                    </span>
                  )}
                </span>
              ))}
            </p>
          </div>
          {evaluation.platformWarning && (
            <div>
              <h3 className="gp__label gp__label--accent">
                Platform variance
              </h3>
              <p className="mt-2 max-w-[38rem] text-[0.9375rem] leading-relaxed text-[var(--gp-ink-soft)]">
                {evaluation.platformWarning}
              </p>
            </div>
          )}
        </div>
      </section>

      <section
        className="px-5 py-10 sm:px-8"
        style={{ background: "var(--gp-trust)" }}
      >
        <div className="mx-auto w-full max-w-[74rem]">
          <h2 className="gp__label" style={{ color: "var(--gp-ink)" }}>
            How this profile was made
          </h2>

          <div className="mt-5 grid gap-x-10 gap-y-7 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <dl className="grid max-w-[40rem] grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
                {[
                  [
                    "Evidence status",
                    EVIDENCE_STATUS_LABEL[evaluation.evidenceStatus],
                  ],
                  [
                    "Overall confidence",
                    CONFIDENCE_LABEL[evaluation.confidence],
                  ],
                  ["Rubric", `v${evaluation.rubricVersion}`],
                  [
                    "Assessment",
                    publicProvenanceLabel(evaluation.scoreProvenance),
                  ],
                  ["Evidence cut-off", formatDate(evaluation.evidenceCutoffAt)],
                  ["Release context", evaluation.releaseContext],
                  [
                    "Ledger",
                    evaluation.evidenceLedger === "pending"
                      ? "Source records pending"
                      : "Source records held",
                  ],
                  // Only meaningful for a pre-release profile, and required
                  // there: it says how much of the game the evaluation could
                  // actually reach (SOP §10.1).
                  ...(evaluation.evidenceMaturity
                    ? ([
                        [
                          "Evidence maturity",
                          EVIDENCE_MATURITY_LABEL[evaluation.evidenceMaturity],
                        ],
                      ] as const)
                    : []),
                  ["Edition", evaluation.scope.edition],
                  ["Mode", evaluation.scope.mode],
                  ["Platforms", evaluation.scope.platforms.join(", ")],
                  ["Build", evaluation.scope.buildOrPatch],
                ].map(([term, value]) => (
                  <div key={term}>
                    <dt className="gp__label gp__label--ink">{term}</dt>
                    <dd className="mt-0.5 text-[0.875rem] leading-snug">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-6 max-w-[40rem] text-[0.9375rem] leading-relaxed text-[var(--gp-ink-soft)]">
                Each of the eight dimensions is scored 0–10 on its own, from five
                subcriteria worth 0–2 each. Totals are derived from those five,
                never entered by hand. There is no overall score, and nothing is
                calculated from the area the profile shape encloses — the shape
                describes what kind of game this is, not how good it is.
              </p>

              {/* Provenance and revision history. Both say how much weight the
                  published numbers can carry, so neither is optional. */}
              {evaluation.scoreProvenance.note && (
                <div className="mt-6 max-w-[40rem]">
                  <h3 className="gp__label gp__label--accent">
                    Score provenance
                  </h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--gp-ink-soft)]">
                    {evaluation.scoreProvenance.note}
                  </p>
                </div>
              )}

              {evaluation.changeSummary && (
                <div className="mt-6 max-w-[40rem]">
                  <h3 className="gp__label gp__label--ink">What changed</h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--gp-ink-soft)]">
                    {evaluation.changeSummary}
                  </p>
                </div>
              )}
            </div>

            <div>
              <h3 className="gp__label gp__label--ink">Evidence</h3>

              {/* Counts of evidence by kind, never votes to be averaged. The
                  breakdown is the point: "supported by 6 sources" hides whether
                  those are hands-on hours or six people repeating one preview
                  (SOP §6). */}
              {evaluation.evidenceLedger === "pending" ? (
                <ul className="mt-2.5 flex list-none flex-wrap gap-x-5 gap-y-1 p-0">
                  {profile.evidence.categoryCounts.map(({ category }) => (
                    <li key={category} className="gp__label gp__label--ink">
                      {SOURCE_CATEGORY_LABEL[category]}
                    </li>
                  ))}
                  <li className="text-[0.875rem]">
                    Direct play:{" "}
                    {profile.evidence.hasDirectPlay ? "recorded" : "not recorded"}
                  </li>
                </ul>
              ) : (
                <dl
                  className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1"
                  data-evidence-counts="reconciled"
                >
                  {profile.evidence.categoryCounts.map(({ category, count }) => (
                    <div key={category} className="flex items-baseline gap-1.5">
                      <dt className="gp__label gp__label--ink">
                        {SOURCE_CATEGORY_LABEL[category]}
                      </dt>
                      <dd className="gp__num text-[0.875rem]">{count}</dd>
                    </div>
                  ))}
                  <div className="flex items-baseline gap-1.5">
                    <dt className="gp__label gp__label--ink">Direct play</dt>
                    <dd className="text-[0.875rem]">
                      {profile.evidence.hasDirectPlay ? "Yes" : "Not yet"}
                    </dd>
                  </div>
                </dl>
              )}

              <ol className="mt-3 list-none space-y-2 p-0">
                {evaluation.sources.map((source) => (
                  <li
                    key={source.id}
                    className="text-[0.9375rem] leading-snug text-[var(--gp-ink-soft)]"
                  >
                    {source.title}
                    <span className="gp__label gp__label--ink">
                      {" "}
                      Tier {source.tier}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[0.875rem] leading-relaxed text-[var(--gp-ink-quiet)]">
                {evaluation.evidenceLedger === "pending"
                  ? "The ledger holds these classes of source, not yet the individual records behind them. No source count is published until it does."
                  : "Sources are evidence, not votes. Nothing here is averaged."}
              </p>
            </div>
          </div>

          {/* Credit, and — for artwork held on an evaluation basis — the full
              rights notice. Required wherever the image renders, so the basis
              is visible on the page carrying it rather than only in an ADR. */}
          {artwork && (
            <p
              className="mt-8 max-w-[54rem] border-t pt-4 text-[0.8125rem] leading-relaxed text-[var(--gp-ink-quiet)]"
              style={{ borderColor: "rgba(22,24,28,0.18)" }}
            >
              {creditLineFor(artwork)}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
