"use client";

import type { DimensionView } from "@/lib/profile/build";
import { formatScore } from "@/lib/scoring/derive";

/**
 * The exact score rows.
 *
 * These are the authoritative representation of the profile: always present in
 * the DOM, never collapsed, never behind a toggle, and readable without hover
 * (Plan §6.2, §22.2). The radar is the silhouette; this is the record.
 *
 * Rows run in radar order so the polygon and the numbers read in the same
 * sequence — see docs/decisions/0003-display-order.md.
 */

interface Props {
  readonly dimensions: readonly DimensionView[];
  readonly activeKey: string | null;
  readonly onActiveChange: (key: string | null) => void;
}

export function ScoreRows({ dimensions, activeKey, onActiveChange }: Props) {
  return (
    <div className="divide-y divide-line border-y border-line">
      <p className="px-3 py-2.5 text-xs leading-relaxed text-bone-faint sm:px-4">
        Open any row for the five subcriteria behind its score, and why each one
        landed where it did.
      </p>
      {dimensions.map((dimension) => (
        <ScoreRow
          key={dimension.dimension.key}
          view={dimension}
          isActive={activeKey === dimension.dimension.key}
          onActiveChange={onActiveChange}
        />
      ))}
    </div>
  );
}

function ScoreRow({
  view,
  isActive,
  onActiveChange,
}: {
  view: DimensionView;
  isActive: boolean;
  onActiveChange: (key: string | null) => void;
}) {
  const { dimension, score, display, subcriteria } = view;
  const key = dimension.key;

  return (
    <details
      className={`group transition-colors ${isActive ? "bg-ink-850" : ""}`}
      onMouseEnter={() => onActiveChange(key)}
      onMouseLeave={() => onActiveChange(null)}
    >
      <summary
        className="flex cursor-pointer list-none items-baseline gap-3 px-3 py-3 sm:px-4 [&::-webkit-details-marker]:hidden"
        onFocus={() => onActiveChange(key)}
        onBlur={() => onActiveChange(null)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="truncate text-[0.9375rem] font-medium text-bone">
              {dimension.name}
            </h3>
            <span
              className={`tabular shrink-0 text-lg font-semibold leading-none ${
                score.kind === "insufficient"
                  ? "text-[0.8125rem] font-normal text-bone-faint"
                  : "text-brass"
              }`}
            >
              {display}
              {score.kind !== "insufficient" && (
                <span className="ml-0.5 text-[0.6875rem] font-normal text-bone-faint">
                  /10
                </span>
              )}
            </span>
          </div>

          <ScoreBar score={score} className="mt-2" />

          <div className="mt-2 flex items-start justify-between gap-3">
            <p className="text-[0.8125rem] leading-snug text-bone-dim">
              {dimension.summary}
            </p>
            <svg
              viewBox="0 0 12 12"
              aria-hidden="true"
              className="mt-1 h-3 w-3 shrink-0 text-bone-faint transition-transform duration-150 group-open:rotate-180 group-hover:text-brass"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2.5 4.5 6 8l3.5-3.5" />
            </svg>
          </div>
        </div>
      </summary>

      <div className="px-3 pb-5 sm:px-4">
        <div className="rounded-sm border border-line bg-ink-900 p-3 sm:p-4">
          <p className="text-[0.8125rem] leading-relaxed text-bone-dim">
            <span className="text-bone">{dimension.coreQuestion}</span>{" "}
            {dimension.boundary}
          </p>

          <ol className="mt-4 space-y-3">
            {subcriteria.map((sub) => (
              <li
                key={sub.key}
                className="grid grid-cols-[2.75rem_1fr] gap-x-3 border-t border-line pt-3 first:border-t-0 first:pt-0"
              >
                <span className="tabular pt-px text-right text-[0.9375rem] font-semibold leading-tight text-brass">
                  {sub.entry.value === "unknown" ? (
                    <span className="text-[0.6875rem] font-normal text-bone-faint">
                      unknown
                    </span>
                  ) : (
                    <>
                      {formatScore(sub.entry.value)}
                      <span className="text-[0.625rem] font-normal text-bone-faint">
                        /2
                      </span>
                    </>
                  )}
                </span>
                <div className="min-w-0">
                  <h4 className="text-[0.8125rem] font-medium leading-tight text-bone">
                    {sub.name}
                  </h4>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-bone-dim">
                    {sub.entry.rationale}
                  </p>
                  {sub.entry.platformNote && (
                    <p className="mt-1.5 text-xs leading-relaxed text-bone-faint">
                      {sub.entry.platformNote}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {score.kind === "exact" && (
            <p className="mt-4 border-t border-line pt-3 text-xs text-bone-faint">
              Five subcriteria, each 0–2. Total{" "}
              <span className="tabular text-bone-dim">{display}</span> — derived,
              not entered.
            </p>
          )}
          {score.kind === "range" && (
            <p className="mt-4 border-t border-line pt-3 text-xs text-bone-faint">
              One subcriterion is unknown, so the total is published as a range
              rather than a single figure.
            </p>
          )}
          {score.kind === "insufficient" && (
            <p className="mt-4 border-t border-line pt-3 text-xs text-bone-faint">
              {score.unknownCount} of {subcriteria.length} subcriteria lack
              sufficient evidence, so no total is published for this dimension.
            </p>
          )}
        </div>
      </div>
    </details>
  );
}

/**
 * A single-dimension magnitude bar. Deliberately one neutral colour at one
 * opacity: there is no scale on which 4.0 is "red" and 9.0 is "green"
 * (Rubric §1, Round 2 §10).
 */
function ScoreBar({
  score,
  className = "",
}: {
  score: DimensionView["score"];
  className?: string;
}) {
  const low =
    score.kind === "exact"
      ? score.score
      : score.kind === "range"
        ? score.low
        : 0;
  const high = score.kind === "range" ? score.high : low;

  return (
    <div
      className={`relative h-[3px] w-full overflow-hidden rounded-full bg-ink-700 ${className}`}
    >
      {/* Midpoint reference so a bare bar still carries scale. */}
      <span className="absolute left-1/2 top-0 h-full w-px bg-ink-950/80" />
      {score.kind === "insufficient" ? (
        <span
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--color-line-strong) 0 3px, transparent 3px 7px)",
          }}
        />
      ) : (
        <>
          {score.kind === "range" && (
            <span
              className="absolute left-0 top-0 h-full bg-brass/30"
              style={{ width: `${(high / 10) * 100}%` }}
            />
          )}
          <span
            className="absolute left-0 top-0 h-full bg-brass/80"
            style={{ width: `${(low / 10) * 100}%` }}
          />
        </>
      )}
    </div>
  );
}
