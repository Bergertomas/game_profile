import Link from "next/link";
import { useId } from "react";
import type { ProfileView } from "@/lib/profile/build";
import {
  CONFIDENCE_LABEL,
  EVIDENCE_MATURITY_LABEL,
  EVIDENCE_STATUS_LABEL,
  SOURCE_CATEGORY_LABEL,
} from "@/lib/profile/vocabulary";
import { formatDate } from "@/lib/format";
import { publicProvenanceLabel } from "@/lib/profile/provenance";
import { creditLineFor, type ProfileArtwork } from "@/lib/profile/artwork";

/**
 * THE TRUST BAND. How this profile was made, in one place at the foot.
 *
 * Everything that says how much weight the numbers can carry is collected
 * here rather than salted through the page: evidence status, overall
 * confidence, rubric version, review status, evidence cut-off, release
 * context, ledger state, the full evaluation scope, the evidence by class and
 * the derivation rule. The status line near the identity states the two facts
 * a reader needs before the answer; this is the full record for a reader who
 * wants it, and it is placed, not buried.
 *
 * ── What it says about sources ──────────────────────────────────────────────
 *
 * Counts of evidence by KIND, never one opaque number, and never a number at
 * all while the ledger is pending (SOP §6, tests/evidence-copy.test.ts). The
 * provenance sentence is the accepted trust copy from the Gate B review,
 * minus its correction route: corrections@ is not yet operational (Master
 * Plan P0.10), and a page must not offer an address that does not answer.
 *
 * Internal calibration language does not leak into the public voice: the
 * review status is "Editor reviewed", and the round stays in the record.
 */
export function TrustBand({
  profile,
  artwork,
}: {
  profile: ProfileView;
  artwork: ProfileArtwork | null;
}) {
  const id = useId();
  const { evaluation } = profile;
  const derived = evaluation.scoreProvenance.kind === "derived";

  const facts: ReadonlyArray<readonly [string, string]> = [
    ["Evidence status", EVIDENCE_STATUS_LABEL[evaluation.evidenceStatus]],
    ["Overall confidence", CONFIDENCE_LABEL[evaluation.confidence]],
    ["Rubric", `v${evaluation.rubricVersion}`],
    ["Assessment", publicProvenanceLabel(evaluation.scoreProvenance)],
    ["Evidence cut-off", formatDate(evaluation.evidenceCutoffAt)],
    ["Release context", evaluation.releaseContext],
    [
      "Ledger",
      evaluation.evidenceLedger === "pending"
        ? "Source records pending"
        : "Source records held",
    ],
    // Only meaningful for a pre-release profile, and required there: it says
    // how much of the game the evaluation could actually reach (SOP §10.1).
    ...(evaluation.evidenceMaturity
      ? ([
          ["Evidence maturity", EVIDENCE_MATURITY_LABEL[evaluation.evidenceMaturity]],
        ] as const)
      : []),
    ["Edition", evaluation.scope.edition],
    ["Mode", evaluation.scope.mode],
    ["Platforms", evaluation.scope.platforms.join(", ")],
    ["Build", evaluation.scope.buildOrPatch],
  ];

  return (
    <section className="gp-trust" aria-labelledby={`${id}-trust`}>
      <div className="gp-measure">
        <h2 id={`${id}-trust`} className="gp-kicker">
          How this profile was made
        </h2>

        <p className="sip-prose gp-trust__lead">
          {derived
            ? "These values were derived against the published rubric and have not yet been editor approved. "
            : "Editor reviewed against the published rubric and the scoped evidence record. "}
          Sources inform the judgement; they are not averaged as votes.{" "}
          <Link href="/methodology" className="gp-link">
            How we score
          </Link>
          .
        </p>

        <div className="gp-trust__grid">
          <div>
            <dl className="gp-facts">
              {facts.map(([term, value]) => (
                <div key={term} className="gp-facts__item">
                  <dt>{term}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <p className="gp-trust__rule">
              Each of the eight dimensions is scored 0–10 on its own, from five
              subcriteria worth 0–2 each. Totals are derived from those five,
              never entered by hand. There is no overall score, and nothing is
              calculated from the area the profile shape encloses — the shape
              describes what kind of game this is, not how good it is.
            </p>

            {/* Provenance and revision history. Both say how much weight the
                published numbers can carry, so neither is optional. */}
            {evaluation.scoreProvenance.note && (
              <div className="gp-trust__aside">
                <h3 className="gp-kicker">Score provenance</h3>
                <p>{evaluation.scoreProvenance.note}</p>
              </div>
            )}
            {evaluation.changeSummary && (
              <div className="gp-trust__aside">
                <h3 className="gp-kicker">What changed</h3>
                <p>{evaluation.changeSummary}</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="gp-kicker">Evidence</h3>

            {/* Counts of evidence by kind, never votes to be averaged. The
                breakdown is the point: "supported by 6 sources" hides whether
                those are hands-on hours or six people repeating one preview
                (SOP §6). */}
            {evaluation.evidenceLedger === "pending" ? (
              <ul className="gp-evidence__classes">
                {profile.evidence.categoryCounts.map(({ category }) => (
                  <li key={category}>{SOURCE_CATEGORY_LABEL[category]}</li>
                ))}
                <li className="gp-evidence__direct">
                  Direct play:{" "}
                  {profile.evidence.hasDirectPlay ? "recorded" : "not recorded"}
                </li>
              </ul>
            ) : (
              <dl className="gp-evidence__counts" data-evidence-counts="reconciled">
                {profile.evidence.categoryCounts.map(({ category, count }) => (
                  <div key={category}>
                    <dt>{SOURCE_CATEGORY_LABEL[category]}</dt>
                    <dd className="sip-num">{count}</dd>
                  </div>
                ))}
                <div>
                  <dt>Direct play</dt>
                  <dd>{profile.evidence.hasDirectPlay ? "Yes" : "Not yet"}</dd>
                </div>
              </dl>
            )}

            <ol className="gp-evidence__sources">
              {evaluation.sources.map((source) => (
                <li key={source.id}>
                  {source.title}
                  <span className="gp-evidence__tier"> Tier {source.tier}</span>
                </li>
              ))}
            </ol>
            <p className="gp-evidence__note">
              {evaluation.evidenceLedger === "pending"
                ? "The ledger holds these classes of source, not yet the individual records behind them. No source count is published until it does."
                : "Sources are evidence, not votes. Nothing here is averaged."}
            </p>
          </div>
        </div>

        {/* Credit, and — for artwork held on an evaluation basis — the full
            rights notice. Required wherever the image renders, so the basis is
            visible on the page carrying it rather than only in an ADR. */}
        {artwork && <p className="gp-credit">{creditLineFor(artwork)}</p>}
      </div>
    </section>
  );
}
