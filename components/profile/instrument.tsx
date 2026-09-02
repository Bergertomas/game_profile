"use client";

/**
 * One exact row of the profile instrument, and the reading scale inside it.
 *
 * ── What a row permanently shows ────────────────────────────────────────────
 *
 * Every row shows, with no interaction: the full dimension name, the exact
 * value, the published range, or "Not scored"; the confidence in words; and
 * the rubric's one-line plain-language gloss of what the dimension measures
 * (brief §7.2, handoff §9.2). The value is never hover-only and never lives
 * only in the chart — the row is the authoritative representation and the
 * radar is its picture.
 *
 * ── The disclosure ──────────────────────────────────────────────────────────
 *
 * "Why this score?" is an explicit button beside the reading, not the row
 * itself. A whole-row button would make a screen reader's accessible name for
 * the control the entire reading, gloss included; a small explicit trigger
 * keeps the reading as text and the control as a control. It carries
 * `aria-expanded` and `aria-controls`, its panel follows it in DOM order, focus
 * stays on it when it toggles, and nothing traps or moves focus (matrix P-08).
 * The panel is always in the DOM and hidden with `hidden`, so the IDREF never
 * dangles while closed. Rows open independently.
 *
 * ── Platform truth on the row ───────────────────────────────────────────────
 *
 * Where a subcriterion carries a platform note or a material override, the
 * row says so beside its value — "Varies by platform" — and the panel states
 * the note under the subcriterion it belongs to and each override with its
 * platform, its value and the base it deviates from. The base total does not
 * move (ADR 0015); the row is where a reader deciding between builds needs to
 * know it varies (ADR 0032).
 */

import { useState } from "react";
import type { DimensionView } from "@/lib/profile/build";
import {
  describeOverride,
  platformsForDimension,
  type PlatformProjection,
} from "@/lib/profile/platform";
import type { EvidenceLedgerState } from "@/lib/profile/types";
import { CONFIDENCE_LABEL, linkedEvidenceSummary } from "@/lib/profile/vocabulary";
import { formatScore } from "@/lib/scoring/derive";

/* ========================================================================== */

/**
 * The shared 0–10 reading: a hairline baseline, a measured rule to the value,
 * an accent tick — and for a range, a dotted reach to its ceiling with an open
 * tick at the end. A ruler, not a filled bar. Unknown is a dashed baseline with
 * no rule at all: never a rule to zero.
 */
export function ScaleReading({ score }: { score: DimensionView["score"] }) {
  if (score.kind === "insufficient") {
    return <span className="gp-scale gp-scale--unknown" aria-hidden="true" />;
  }

  const low = score.kind === "exact" ? score.score : score.low;
  const high = score.kind === "exact" ? score.score : score.high;

  return (
    <span className="gp-scale" aria-hidden="true">
      <span className="gp-scale__measure" style={{ width: `${(low / 10) * 100}%` }} />
      {score.kind === "range" && (
        <span
          className="gp-scale__reach"
          style={{
            left: `${(low / 10) * 100}%`,
            width: `${((high - low) / 10) * 100}%`,
          }}
        />
      )}
      <span className="gp-scale__tick" style={{ left: `${(low / 10) * 100}%` }} />
      {score.kind === "range" && (
        <span
          className="gp-scale__tick gp-scale__tick--open"
          style={{ left: `${(high / 10) * 100}%` }}
        />
      )}
    </span>
  );
}

/* ========================================================================== */

export function DimensionRow({
  idBase,
  view,
  ledger,
  platforms,
  isActive,
  onHover,
  onFocus,
}: {
  idBase: string;
  view: DimensionView;
  /**
   * Whether the evidence ledger holds individual source records yet. The panel
   * may only publish a count when it does — see `linkedEvidenceSummary`.
   */
  ledger: EvidenceLedgerState;
  platforms: PlatformProjection;
  isActive: boolean;
  onHover: (key: string | null) => void;
  onFocus: (key: string | null) => void;
}) {
  const { dimension, display, score, subcriteria, confidence } = view;
  const panelId = `${idBase}-why-${dimension.key}`;
  const [open, setOpen] = useState(false);
  const variance = platformsForDimension(platforms, view);
  const varies = variance.notes.length > 0 || variance.overrides.length > 0;
  // Direct-play provenance remains part of the internal evidence record, but
  // the public product does not present personal play/completion coverage as
  // a trust signal (owner decision, 2026-09-02).
  const publicLinkedSources = view.linkedSources.filter(
    ({ category }) => category !== "direct_play",
  );

  return (
    <li
      className="gp-row"
      data-active={isActive || undefined}
      data-kind={score.kind}
      data-confidence={confidence}
      onMouseEnter={() => onHover(dimension.key)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="gp-row__head">
        <div className="gp-row__lead">
          <h3 className="gp-row__name">{dimension.name}</h3>
          <p className="gp-row__gloss">{dimension.summary}</p>
        </div>

        <div className="gp-row__reading">
          <ScaleReading score={score} />
          <p className="gp-row__value">
            {score.kind === "insufficient" ? (
              <>
                <span className="gp-row__notscored">Not scored</span>
                <span className="sr-only">
                  {" "}
                  — insufficient evidence; no total is published, and this is
                  not zero.
                </span>
              </>
            ) : (
              <>
                <span className="sip-num gp-row__num">{display}</span>
                <span className="sr-only"> out of 10</span>
                {score.kind === "range" && (
                  <span className="gp-row__kind"> range</span>
                )}
              </>
            )}
          </p>
          <p className="gp-row__confidence">
            {CONFIDENCE_LABEL[confidence]} confidence
            {varies && (
              <>
                {" · "}
                <span className="gp-row__varies">Varies by platform</span>
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          className="gp-row__why"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((was) => !was)}
          onFocus={() => onFocus(dimension.key)}
          onBlur={() => onFocus(null)}
        >
          Why this score?
          <span className="sr-only"> — {dimension.name}</span>
          <span className="gp-row__chevron" aria-hidden="true">
            &#8964;
          </span>
        </button>
      </div>

      <div id={panelId} hidden={!open} className="gp-row__panel">
        <p className="sip-prose gp-row__question">{dimension.coreQuestion}</p>
        <p className="gp-row__evidence">
          {linkedEvidenceSummary(ledger, publicLinkedSources.length)}
        </p>

        <ol className="gp-subs">
          {subcriteria.map((sub) => {
            const overrides = variance.overrides.filter(
              (override) => override.subcriterionKey === sub.key,
            );
            return (
              <li key={sub.key} className="gp-sub">
                <div className="gp-sub__head">
                  <span className="gp-sub__name">{sub.name}</span>
                  <span className="sip-num gp-sub__value">
                    {sub.entry.value === "unknown" ? (
                      <span className="gp-sub__unknown">Unknown</span>
                    ) : (
                      formatScore(sub.entry.value)
                    )}
                  </span>
                </div>
                <p className="sip-prose gp-sub__rationale">
                  {sub.entry.rationale ||
                    "No evidence available for this subcriterion."}
                </p>
                {sub.entry.platformNote && (
                  <p className="gp-sub__platform">
                    <strong>Platform note.</strong> {sub.entry.platformNote}
                  </p>
                )}
                {overrides.length > 0 && (
                  <ul className="gp-sub__overrides">
                    {overrides.map((override) => (
                      <li key={override.platform.slug}>
                        <strong>{describeOverride(override)}</strong>{" "}
                        {override.rationale}
                        {override.confidence && (
                          <> ({CONFIDENCE_LABEL[override.confidence]} confidence.)</>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>

        <p className="sip-prose gp-row__derivation">{derivationSentence(view)}</p>

        {publicLinkedSources.length > 0 && (
          <ul className="gp-row__sources">
            {/* Named to match what the ledger actually holds, so this list and
                the evidence section at the foot describe the same thing. */}
            <li className="gp-row__sources-label">
              {ledger === "pending"
                ? "Evidence classes bearing on this dimension"
                : "Sources linked to this dimension"}
            </li>
            {publicLinkedSources.map((source) => (
              <li key={source.id}>
                {source.title}
                <span className="gp-row__tier"> Tier {source.tier}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

/** The sentence that makes a total auditable: five values, shown, summed. */
export function derivationSentence(view: DimensionView): string {
  const { score, subcriteria } = view;
  const total = subcriteria.length;
  switch (score.kind) {
    case "exact":
      return `Derived, not entered: the ${total} subcriteria above are each scored 0–2 and summed to ${formatScore(
        score.score,
      )}. Change a rationale and the number has to change with it.`;
    case "range":
      return `Derived, not entered: ${total - score.unknownCount} of ${total} subcriteria sum to ${formatScore(
        score.low,
      )}, and the one with no evidence could add up to 2 more — so the published figure is the range ${formatScore(
        score.low,
      )}–${formatScore(score.high)}, not a point value we cannot support.`;
    case "insufficient":
      return `Not scored: ${score.unknownCount} of ${total} subcriteria have no evidence behind them. The ${
        total - score.unknownCount
      } that do sum to ${formatScore(
        score.knownSum,
      )}, but a range that wide would be a guess, so no total is published. Unknown is not zero.`;
  }
}
