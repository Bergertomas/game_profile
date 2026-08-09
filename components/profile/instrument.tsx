"use client";

/**
 * The interactive half of the profile instrument: the score rows beside the
 * radar, and the reading scale inside each one.
 *
 * Promoted from design-lab direction D3 after review. The measurement system,
 * uncertainty states and disclosure behaviour came through Direction D
 * unchanged and are unchanged again here.
 *
 * The radar itself is ./radar.tsx and is deliberately not a client component:
 * it holds no state, and a card grid has to be able to render it on the server.
 * This module owns everything that needs an event handler.
 */

import type { DimensionView } from "@/lib/profile/build";
import { CONFIDENCE_LABEL, linkedEvidenceSummary } from "@/lib/profile/vocabulary";
import type { EvidenceLedgerState } from "@/lib/profile/types";
import { formatScore } from "@/lib/scoring/derive";

/* ========================================================================== */

export function ScaleReading({
  score,
  accent,
}: {
  score: DimensionView["score"];
  accent: string;
}) {
  if (score.kind === "insufficient") {
    return <span className="gp__scale gp__scale--unknown" aria-hidden="true" />;
  }

  const low = score.kind === "exact" ? score.score : score.low;
  const high = score.kind === "exact" ? score.score : score.high;

  return (
    <span className="gp__scale" aria-hidden="true">
      <span className="gp__measure" style={{ width: `${(low / 10) * 100}%` }} />
      {score.kind === "range" && (
        <span
          className="gp__reach"
          style={{
            left: `${(low / 10) * 100}%`,
            width: `${((high - low) / 10) * 100}%`,
          }}
        />
      )}
      <span
        className="gp__tick"
        style={{ left: `${(low / 10) * 100}%`, background: accent }}
      />
      {score.kind === "range" && (
        <span
          className="gp__tick gp__tick--open"
          style={{ left: `${(high / 10) * 100}%`, borderColor: accent }}
        />
      )}
    </span>
  );
}

/* ========================================================================== */

/**
 * A collapsed row carries three things: dimension, measurement, exact value.
 * Confidence and linked evidence live inside the panel, read once and in
 * context, rather than repeating quietly across all eight rows.
 */
export function ScoreRow({
  view,
  isActive,
  isOpen,
  accent,
  ledger,
  onHover,
  onFocus,
  onToggle,
}: {
  view: DimensionView;
  isActive: boolean;
  isOpen: boolean;
  accent: string;
  /**
   * Whether the evidence ledger holds individual source records yet. The panel
   * may only publish a count when it does — see `linkedEvidenceSummary`.
   */
  ledger: EvidenceLedgerState;
  onHover: (key: string | null) => void;
  onFocus: (key: string | null) => void;
  onToggle: (key: string) => void;
}) {
  const { dimension, display, score, subcriteria, confidence } = view;
  const panelId = `gp-why-${dimension.key}`;

  return (
    <li className="gp__row-wrap">
      <button
        type="button"
        className="gp__row"
        data-active={isActive}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => onToggle(dimension.key)}
        onMouseEnter={() => onHover(dimension.key)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onFocus(dimension.key)}
        onBlur={() => onFocus(null)}
      >
        <span className="gp__row-name text-[0.9375rem] font-medium sm:truncate">
          {dimension.name}
        </span>
        <span className="gp__row-scale">
          <ScaleReading score={score} accent={accent} />
        </span>
        <span className="gp__row-value sm:text-right">
          {score.kind === "insufficient" ? (
            <span className="gp__label whitespace-nowrap">Not scored</span>
          ) : (
            <span className="gp__num text-[1.0625rem]">{display}</span>
          )}
        </span>
        <span className="gp-sr">Why this score?</span>
      </button>

      <div id={panelId} hidden={!isOpen} className="gp__panel px-3 py-4 sm:px-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h3 className="gp__label gp__label--bone">Why this score?</h3>
          <span className="gp__label">
            {CONFIDENCE_LABEL[confidence]} confidence ·{" "}
            {linkedEvidenceSummary(ledger, view.linkedSources.length)}
          </span>
        </div>

        <p className="gp__prose mt-2 max-w-[46rem] text-[0.9375rem] text-[var(--gp-bone-soft)]">
          {dimension.coreQuestion}
        </p>

        <ol className="mt-3 list-none p-0">
          {subcriteria.map((sub) => (
            <li
              key={sub.key}
              className="gp__sub grid grid-cols-[minmax(0,1fr)_3rem] gap-x-3 py-2.5"
            >
              <span>
                <span className="block text-[0.9375rem] font-medium text-[var(--gp-bone)]">
                  {sub.name}
                </span>
                <span className="gp__prose mt-1 block max-w-[42rem] text-[0.9375rem] text-[var(--gp-bone-soft)]">
                  {sub.entry.rationale ||
                    "No evidence available for this subcriterion."}
                </span>
              </span>
              <span className="gp__num text-right text-[0.9375rem] text-[var(--gp-bone)]">
                {sub.entry.value === "unknown" ? (
                  <span className="gp__label">Unknown</span>
                ) : (
                  formatScore(sub.entry.value)
                )}
              </span>
            </li>
          ))}
        </ol>

        <p className="gp__prose gp__sub mt-2.5 pt-2.5 text-[0.9375rem] text-[var(--gp-bone-soft)]">
          {derivationSentence(view)}
        </p>

        {view.linkedSources.length > 0 && (
          <ul className="mt-3 list-none space-y-1 p-0">
            {/* Named to match what the ledger actually holds, so this list and
                the evidence section at the foot describe the same thing. */}
            <li className="gp__label">
              {ledger === "pending"
                ? "Evidence classes bearing on this dimension"
                : "Sources linked to this dimension"}
            </li>
            {view.linkedSources.map((source) => (
              <li
                key={source.id}
                className="text-[0.875rem] text-[var(--gp-bone-quiet)]"
              >
                {source.title}
                <span className="gp__label"> Tier {source.tier}</span>
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
