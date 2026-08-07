"use client";

import type { DimensionView, ProfileView } from "@/lib/profile/build";
import { CONFIDENCE_LABEL, linkedEvidenceSummary } from "@/lib/profile/vocabulary";
import type { EvidenceLedgerState } from "@/lib/profile/types";
import { formatScore } from "@/lib/scoring/derive";
import {
  axisLabelPlacement,
  buildPolygon,
  pointAt,
  ringPath,
  vertexFor,
} from "@/lib/radar/geometry";
import type { RadarLayout } from "../radar-layout";

/**
 * D3 radar and score rows.
 *
 * The measurement system, uncertainty states and disclosure behaviour are
 * Direction D's, unchanged. Two things are specific to D3:
 *
 *  - The grid is drawn *over* the polygon fill, not under it. A filled shape
 *    with the geometry hidden behind it reads as a coloured quality badge; with
 *    four rings and eight spokes crossing it, it stays a measurement you can
 *    read a value off.
 *  - The fill is deliberately light (around a third), so the shape is legible
 *    as a silhouette without becoming a solid area the eye wants to compare.
 */

export interface RadarSkin {
  readonly grid: string;
  readonly gridOuter: string;
  readonly fill: string;
  readonly fillOpacity: number;
  readonly stroke: string;
  readonly vertex: string;
  readonly vertexEdge: string;
  readonly reach: string;
  readonly label: string;
  readonly value: string;
  readonly activeLabel: string;
  readonly activeValue: string;
  readonly activeMark: string;
}

/** Every half-step the rubric can land on, so the rings are a real scale. */
const RINGS = [2.5, 5, 7.5, 10] as const;

export function ProfileRadar({
  profile,
  active,
  layout,
  skin,
}: {
  profile: ProfileView;
  active: string | null;
  layout: RadarLayout;
  skin: RadarSkin;
}) {
  const { center, radius, labelRadius, nameSize, valueSize } = layout;
  const count = profile.radar.length;
  const polygon = buildPolygon(
    center,
    radius,
    profile.radar.map((point) => point.value),
  );

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      {polygon.fillPath && (
        <path
          d={polygon.fillPath}
          fill={skin.fill}
          fillOpacity={skin.fillOpacity}
          stroke="none"
        />
      )}

      {/* Grid over the fill: the geometry has to survive the colour, or the
          shape stops being a measurement. */}
      <g fill="none">
        {RINGS.map((level) => (
          <path
            key={level}
            d={ringPath(center, radius, count, level)}
            stroke={level === 10 ? skin.gridOuter : skin.grid}
            strokeWidth={level === 10 ? 1.25 : 0.75}
          />
        ))}
        {profile.radar.map((point, index) => {
          const outer = pointAt(center, radius, index, count);
          const on = active === point.key;
          return (
            <line
              key={point.key}
              x1={center.x}
              y1={center.y}
              x2={outer.x}
              y2={outer.y}
              stroke={on ? skin.activeMark : skin.grid}
              strokeWidth={on ? 1.75 : 0.75}
            />
          );
        })}
      </g>

      {/* Uncertainty reach on any axis published as a range. */}
      <g fill="none">
        {profile.radar.map((point, index) => {
          if (point.value === null || point.ceiling === null) return null;
          const from = vertexFor(center, radius, index, count, point.value);
          const to = vertexFor(center, radius, index, count, point.ceiling);
          return (
            <line
              key={point.key}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={skin.reach}
              strokeWidth={1.75}
              strokeDasharray="2 3"
            />
          );
        })}
      </g>

      <g className="dl-reveal" fill="none" strokeLinejoin="miter">
        {polygon.segments.map((segment, index) => (
          <line
            key={index}
            x1={segment.from.x}
            y1={segment.from.y}
            x2={segment.to.x}
            y2={segment.to.y}
            stroke={skin.stroke}
            strokeWidth={2.5}
            strokeDasharray={segment.bridged ? "3 4" : undefined}
          />
        ))}
      </g>

      <g>
        {profile.radar.map((point, index) => {
          if (point.value === null) return null;
          const v = vertexFor(center, radius, index, count, point.value);
          const on = active === point.key;
          const size = on ? 5 : 3.5;
          return (
            <rect
              key={point.key}
              x={v.x - size}
              y={v.y - size}
              width={size * 2}
              height={size * 2}
              fill={on ? skin.activeMark : skin.vertex}
              stroke={skin.vertexEdge}
              strokeWidth={1}
            />
          );
        })}
        {profile.radar.map((point, index) => {
          if (point.ceiling === null) return null;
          const v = vertexFor(center, radius, index, count, point.ceiling);
          return (
            <rect
              key={`${point.key}-ceiling`}
              x={v.x - 3.5}
              y={v.y - 3.5}
              width={7}
              height={7}
              fill="none"
              stroke={skin.reach}
              strokeWidth={1.5}
            />
          );
        })}
      </g>

      <g>
        {profile.radar.map((point, index) => {
          const place = axisLabelPlacement(center, labelRadius, index, count);
          const on = active === point.key;
          const above = place.vertical === "above";
          const wide = point.value !== null && point.ceiling !== null;
          const size =
            point.value === null || wide ? valueSize * 0.72 : valueSize;
          return (
            <g key={point.key}>
              <text
                x={place.point.x}
                y={above ? place.point.y - valueSize * 0.84 : place.point.y}
                textAnchor={place.anchor}
                fontFamily="Archivo, system-ui, sans-serif"
                fontSize={nameSize}
                fontWeight={600}
                fill={on ? skin.activeLabel : skin.label}
              >
                {point.shortLabel.toUpperCase()}
              </text>
              <text
                x={place.point.x}
                y={
                  above
                    ? place.point.y + valueSize * 0.32
                    : place.point.y + valueSize
                }
                textAnchor={place.anchor}
                fontFamily="Archivo, system-ui, sans-serif"
                fontSize={size}
                fontWeight={700}
                fill={on ? skin.activeValue : skin.value}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {point.value === null ? "—" : point.display}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/* ========================================================================== */

export function ScaleReading({
  score,
  accent,
}: {
  score: DimensionView["score"];
  accent: string;
}) {
  if (score.kind === "insufficient") {
    return <span className="dl-d3__scale dl-d3__scale--unknown" aria-hidden="true" />;
  }

  const low = score.kind === "exact" ? score.score : score.low;
  const high = score.kind === "exact" ? score.score : score.high;

  return (
    <span className="dl-d3__scale" aria-hidden="true">
      <span className="dl-d3__measure" style={{ width: `${(low / 10) * 100}%` }} />
      {score.kind === "range" && (
        <span
          className="dl-d3__reach"
          style={{
            left: `${(low / 10) * 100}%`,
            width: `${((high - low) / 10) * 100}%`,
          }}
        />
      )}
      <span
        className="dl-d3__tick"
        style={{ left: `${(low / 10) * 100}%`, background: accent }}
      />
      {score.kind === "range" && (
        <span
          className="dl-d3__tick dl-d3__tick--open"
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
  const panelId = `dl-d3-why-${dimension.key}`;

  return (
    <li className="dl-d3__row-wrap">
      <button
        type="button"
        className="dl-d3__row"
        data-active={isActive}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => onToggle(dimension.key)}
        onMouseEnter={() => onHover(dimension.key)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onFocus(dimension.key)}
        onBlur={() => onFocus(null)}
      >
        <span className="dl-d3__row-name text-[0.9375rem] font-medium sm:truncate">
          {dimension.name}
        </span>
        <span className="dl-d3__row-scale">
          <ScaleReading score={score} accent={accent} />
        </span>
        <span className="dl-d3__row-value sm:text-right">
          {score.kind === "insufficient" ? (
            <span className="dl-d3__label whitespace-nowrap">Not scored</span>
          ) : (
            <span className="dl-d3__num text-[1.0625rem]">{display}</span>
          )}
        </span>
        <span className="dl-sr">Why this score?</span>
      </button>

      <div id={panelId} hidden={!isOpen} className="dl-d3__panel px-3 py-4 sm:px-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h3 className="dl-d3__label dl-d3__label--bone">Why this score?</h3>
          <span className="dl-d3__label">
            {CONFIDENCE_LABEL[confidence]} confidence ·{" "}
            {linkedEvidenceSummary(ledger, view.linkedSources.length)}
          </span>
        </div>

        <p className="dl-d3__prose mt-2 max-w-[46rem] text-[0.9375rem] text-[var(--dl-bone-soft)]">
          {dimension.coreQuestion}
        </p>

        <ol className="mt-3 list-none p-0">
          {subcriteria.map((sub) => (
            <li
              key={sub.key}
              className="dl-d3__sub grid grid-cols-[minmax(0,1fr)_3rem] gap-x-3 py-2.5"
            >
              <span>
                <span className="block text-[0.9375rem] font-medium text-[var(--dl-bone)]">
                  {sub.name}
                </span>
                <span className="dl-d3__prose mt-1 block max-w-[42rem] text-[0.9375rem] text-[var(--dl-bone-soft)]">
                  {sub.entry.rationale ||
                    "No evidence available for this subcriterion."}
                </span>
              </span>
              <span className="dl-d3__num text-right text-[0.9375rem] text-[var(--dl-bone)]">
                {sub.entry.value === "unknown" ? (
                  <span className="dl-d3__label">Unknown</span>
                ) : (
                  formatScore(sub.entry.value)
                )}
              </span>
            </li>
          ))}
        </ol>

        <p className="dl-d3__prose dl-d3__sub mt-2.5 pt-2.5 text-[0.9375rem] text-[var(--dl-bone-soft)]">
          {derivationSentence(view)}
        </p>

        {view.linkedSources.length > 0 && (
          <ul className="mt-3 list-none space-y-1 p-0">
            {/* Named to match what the ledger actually holds, so this list and
                the evidence section at the foot describe the same thing. */}
            <li className="dl-d3__label">
              {ledger === "pending"
                ? "Evidence classes bearing on this dimension"
                : "Sources linked to this dimension"}
            </li>
            {view.linkedSources.map((source) => (
              <li
                key={source.id}
                className="text-[0.875rem] text-[var(--dl-bone-quiet)]"
              >
                {source.title}
                <span className="dl-d3__label"> Tier {source.tier}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

/** Duplicated from Direction D, which is frozen as a reference artifact. */
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
