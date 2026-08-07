"use client";

import type { CSSProperties } from "react";
import type { DimensionView, ProfileView } from "@/lib/profile/build";
import { CONFIDENCE_LABEL } from "@/lib/profile/vocabulary";
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
 * Shared parts for the two D2 identity studies.
 *
 * The measurement system, uncertainty states and disclosure behaviour are
 * Direction D's, unchanged. What the studies vary is how the radar is *drawn*
 * and which surface each part sits on, so both are passed in as a skin rather
 * than hard-coded — one geometry implementation, two identities.
 *
 * Direction D itself is frozen as a reference artifact, so the small helpers it
 * keeps private are duplicated here rather than extracted out of it.
 */

export interface RadarSkin {
  readonly ring: string;
  readonly ringOuter: string;
  readonly ringOuterWidth: number;
  readonly spoke: string;
  /** Which score levels get a grid ring. Fewer rings, less chart-like. */
  readonly rings: readonly number[];
  readonly fill: string;
  readonly fillOpacity: number;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly vertex: string;
  readonly vertexEdge: string;
  readonly vertexSize: number;
  readonly reach: string;
  readonly label: string;
  readonly value: string;
  readonly activeLabel: string;
  readonly activeValue: string;
  readonly activeMark: string;
}

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
      <g fill="none">
        {skin.rings.map((level) => (
          <path
            key={level}
            d={ringPath(center, radius, count, level)}
            stroke={level === 10 ? skin.ringOuter : skin.ring}
            strokeWidth={level === 10 ? skin.ringOuterWidth : 0.75}
          />
        ))}
        {profile.radar.map((point, index) => {
          const outer = pointAt(center, radius, index, count);
          return (
            <line
              key={point.key}
              x1={center.x}
              y1={center.y}
              x2={outer.x}
              y2={outer.y}
              stroke={skin.spoke}
              strokeWidth={0.75}
            />
          );
        })}
      </g>

      {polygon.fillPath && (
        <path
          d={polygon.fillPath}
          fill={skin.fill}
          fillOpacity={skin.fillOpacity}
          stroke="none"
        />
      )}

      {/* Uncertainty reach on any axis published as a range. Drawn above the
          fill so a solid silhouette cannot swallow it. */}
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
            strokeWidth={skin.strokeWidth}
            strokeDasharray={segment.bridged ? "3 4" : undefined}
          />
        ))}
      </g>

      {/* The active axis is marked over the polygon, so a filled silhouette
          cannot hide the link between an open row and its axis. */}
      {active !== null &&
        (() => {
          const index = profile.radar.findIndex((p) => p.key === active);
          if (index < 0) return null;
          const outer = pointAt(center, radius, index, count);
          return (
            <line
              x1={center.x}
              y1={center.y}
              x2={outer.x}
              y2={outer.y}
              stroke={skin.activeMark}
              strokeWidth={2}
            />
          );
        })()}

      <g>
        {profile.radar.map((point, index) => {
          if (point.value === null) return null;
          const v = vertexFor(center, radius, index, count, point.value);
          const on = active === point.key;
          const size = on ? skin.vertexSize + 1.5 : skin.vertexSize;
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

/**
 * A reading on the shared 0–10 scale. Identical logic to Direction D — exact,
 * range and unknown all read differently and unknown is never a zero — with the
 * leader-dot rhythm removed and the colours taken from the surface it sits on.
 */
export function ScaleReading({
  score,
  accent,
}: {
  score: DimensionView["score"];
  accent: string;
}) {
  if (score.kind === "insufficient") {
    return (
      <span
        className="dl-d2__scale dl-d2__scale--unknown"
        aria-hidden="true"
      />
    );
  }

  const low = score.kind === "exact" ? score.score : score.low;
  const high = score.kind === "exact" ? score.score : score.high;

  return (
    <span className="dl-d2__scale" aria-hidden="true">
      <span
        className="dl-d2__measure"
        style={{ width: `${(low / 10) * 100}%` }}
      />
      {score.kind === "range" && (
        <span
          className="dl-d2__reach"
          style={{
            left: `${(low / 10) * 100}%`,
            width: `${((high - low) / 10) * 100}%`,
          }}
        />
      )}
      <span
        className="dl-d2__tick"
        style={{ left: `${(low / 10) * 100}%`, background: accent }}
      />
      {score.kind === "range" && (
        <span
          className="dl-d2__tick dl-d2__tick--open"
          style={{ left: `${(high / 10) * 100}%`, borderColor: accent }}
        />
      )}
    </span>
  );
}

/* ========================================================================== */

export interface RowSkin {
  /** Class on the wrapper that draws the divider between rows. */
  readonly wrap: string;
  readonly panel: string;
  readonly accent: string;
  readonly nameColor: string;
  readonly valueColor: string;
  readonly quietColor: string;
  readonly proseColor: string;
  readonly ruleColor: string;
}

/**
 * A collapsed row carries three things: the dimension, its measurement and its
 * exact value. Per-dimension confidence and linked evidence used to repeat on
 * all eight rows; they now live inside the panel, where they are read once and
 * in context.
 */
export function ScoreRow({
  view,
  isActive,
  isOpen,
  idPrefix,
  skin,
  onHover,
  onFocus,
  onToggle,
}: {
  view: DimensionView;
  isActive: boolean;
  isOpen: boolean;
  idPrefix: string;
  skin: RowSkin;
  onHover: (key: string | null) => void;
  onFocus: (key: string | null) => void;
  onToggle: (key: string) => void;
}) {
  const { dimension, display, score, subcriteria, confidence } = view;
  const panelId = `${idPrefix}-why-${dimension.key}`;
  const notScored = score.kind === "insufficient";

  return (
    <li className={skin.wrap}>
      <button
        type="button"
        className="dl-d2__row"
        data-active={isActive}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => onToggle(dimension.key)}
        onMouseEnter={() => onHover(dimension.key)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onFocus(dimension.key)}
        onBlur={() => onFocus(null)}
      >
        <span
          className="dl-d2__row-name text-[0.9375rem] font-medium sm:truncate"
          style={{ color: skin.nameColor }}
        >
          {dimension.name}
        </span>
        <span
          className="dl-d2__row-scale"
          style={{ color: skin.valueColor }}
        >
          <ScaleReading score={score} accent={skin.accent} />
        </span>
        <span
          className="dl-d2__row-value sm:text-right"
          style={{ color: skin.valueColor }}
        >
          {notScored ? (
            <span className="dl-d2__label whitespace-nowrap">Not scored</span>
          ) : (
            <span className="dl-d2__num text-[1.0625rem]">{display}</span>
          )}
        </span>
        <span className="dl-sr">Why this score?</span>
      </button>

      <div
        id={panelId}
        hidden={!isOpen}
        className={`${skin.panel} px-3 py-4 sm:px-4`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h3 className="dl-d2__label" style={{ color: skin.valueColor }}>
            Why this score?
          </h3>
          <span className="dl-d2__label" style={{ color: skin.quietColor }}>
            {CONFIDENCE_LABEL[confidence]} confidence ·{" "}
            {view.linkedSources.length > 0
              ? `${view.linkedSources.length} linked source${
                  view.linkedSources.length === 1 ? "" : "s"
                }`
              : "No source linked yet"}
          </span>
        </div>

        <p
          className="dl-d2__prose mt-2 max-w-[46rem] text-[0.9375rem]"
          style={{ color: skin.proseColor }}
        >
          {dimension.coreQuestion}
        </p>

        <ol className="mt-3 list-none p-0">
          {subcriteria.map((sub) => (
            <li
              key={sub.key}
              className="grid grid-cols-[minmax(0,1fr)_3rem] gap-x-3 py-2.5"
              style={{ borderTop: `1px solid ${skin.ruleColor}` }}
            >
              <span>
                <span
                  className="block text-[0.9375rem] font-medium"
                  style={{ color: skin.valueColor }}
                >
                  {sub.name}
                </span>
                <span
                  className="dl-d2__prose mt-1 block max-w-[42rem] text-[0.9375rem]"
                  style={{ color: skin.proseColor }}
                >
                  {sub.entry.rationale ||
                    "No evidence available for this subcriterion."}
                </span>
              </span>
              <span
                className="dl-d2__num text-right text-[0.9375rem]"
                style={{ color: skin.valueColor }}
              >
                {sub.entry.value === "unknown" ? (
                  <span className="dl-d2__label">Unknown</span>
                ) : (
                  formatScore(sub.entry.value)
                )}
              </span>
            </li>
          ))}
        </ol>

        <p
          className="dl-d2__prose mt-2.5 pt-2.5 text-[0.9375rem]"
          style={{
            color: skin.proseColor,
            borderTop: `1px solid ${skin.ruleColor}`,
          }}
        >
          {derivationSentence(view)}
        </p>

        {view.linkedSources.length > 0 && (
          <ul className="mt-3 list-none space-y-1 p-0">
            {view.linkedSources.map((source) => (
              <li
                key={source.id}
                className="text-[0.875rem]"
                style={{ color: skin.quietColor }}
              >
                {source.title}
                <span className="dl-d2__label"> Tier {source.tier}</span>
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

/** Inline CSS custom properties without fighting the type checker. */
export function vars(record: Record<string, string>): CSSProperties {
  return record as CSSProperties;
}
