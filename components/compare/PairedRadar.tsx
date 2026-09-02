import type { RadarLayout } from "@/components/profile/radar-layout";
import type { CompareProfile } from "@/lib/compare";
import type { RadarPoint } from "@/lib/profile/build";
import { buildPolygon, pointAt, ringPath, vertexFor } from "@/lib/radar/geometry";

/**
 * The Compare overview: two profiles on one set of eight axes (handoff §9.2,
 * third level). Geometry only — no labels, no values, no text — and
 * `aria-hidden` at every size, because the paired rows beneath it are the
 * authoritative and accessible representation.
 *
 * ── Two shapes, told apart by more than colour ──────────────────────────────
 *
 * The left profile is a solid outline with square vertices; the right is a
 * dashed outline with round vertices. The legend beside the chart names which
 * is which in words, and the same square/round grammar marks every paired row,
 * so a reader who cannot see the accents still has two consistent identities.
 *
 * ── What it refuses ─────────────────────────────────────────────────────────
 *
 * The fills are faint and equal, so the eye is not invited to compare enclosed
 * area — the one aggregate this product does not publish. A Range plots its
 * confirmed floor with the dotted reach the profile radar uses; Not scored
 * plots nothing and the outline bridges the gap dashed. Nothing is normalised,
 * and no axis is reordered for either game.
 */

export const COMPARE_LAYOUT: RadarLayout = {
  width: 220,
  height: 220,
  center: { x: 110, y: 110 },
  radius: 100,
  labelRadius: 0,
  nameSize: 0,
  valueSize: 0,
  rings: [2.5, 5, 7.5, 10],
  labels: false,
};

const GRID = "rgba(237,235,231,0.20)";
const GRID_OUTER = "rgba(237,235,231,0.46)";

export function PairedRadar({
  left,
  right,
}: {
  left: CompareProfile;
  right: CompareProfile;
}) {
  const { center, radius, width, height, rings } = COMPARE_LAYOUT;
  const count = left.radar.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="cp-radar__svg"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none">
        {rings.map((level) => (
          <path
            key={level}
            d={ringPath(center, radius, count, level)}
            stroke={level === 10 ? GRID_OUTER : GRID}
            strokeWidth={level === 10 ? 1.1 : 0.7}
          />
        ))}
        {left.radar.map((point, index) => {
          const outer = pointAt(center, radius, index, count);
          return (
            <line
              key={point.key}
              x1={center.x}
              y1={center.y}
              x2={outer.x}
              y2={outer.y}
              stroke={GRID}
              strokeWidth={0.7}
            />
          );
        })}
      </g>
      <Shape points={left.radar} side="left" count={count} />
      <Shape points={right.radar} side="right" count={count} />
    </svg>
  );
}

function Shape({
  points,
  side,
  count,
}: {
  points: readonly RadarPoint[];
  side: "left" | "right";
  count: number;
}) {
  const { center, radius } = COMPARE_LAYOUT;
  const colour = `var(--cp-${side})`;
  const polygon = buildPolygon(
    center,
    radius,
    points.map((point) => point.value),
  );
  const dashed = side === "right";

  return (
    <g className="cp-radar__shape" data-side={side}>
      {polygon.fillPath && (
        <path d={polygon.fillPath} fill={colour} fillOpacity={0.14} stroke="none" />
      )}
      <g fill="none">
        {points.map((point, index) => {
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
              stroke={colour}
              strokeWidth={1.5}
              strokeDasharray="1.5 3"
            />
          );
        })}
      </g>
      <g fill="none" strokeLinejoin="miter">
        {polygon.segments.map((segment, index) => (
          <line
            key={index}
            x1={segment.from.x}
            y1={segment.from.y}
            x2={segment.to.x}
            y2={segment.to.y}
            stroke={colour}
            strokeWidth={2.2}
            strokeDasharray={
              segment.bridged ? "2 4" : dashed ? "6 3.5" : undefined
            }
          />
        ))}
      </g>
      <g>
        {points.map((point, index) => {
          if (point.value === null) return null;
          const v = vertexFor(center, radius, index, count, point.value);
          return dashed ? (
            <circle
              key={point.key}
              cx={v.x}
              cy={v.y}
              r={3.6}
              fill="var(--cp-ground)"
              stroke={colour}
              strokeWidth={2}
            />
          ) : (
            <rect
              key={point.key}
              x={v.x - 3.2}
              y={v.y - 3.2}
              width={6.4}
              height={6.4}
              fill={colour}
              stroke="var(--cp-ground)"
              strokeWidth={1}
            />
          );
        })}
      </g>
    </g>
  );
}

/**
 * One profile's outline alone, as the decorative fragment of a typographic
 * artwork territory. Stroke only, faint, and never the only representation.
 */
export function Fingerprint({
  points,
  side,
}: {
  points: readonly RadarPoint[];
  side: "left" | "right";
}) {
  const { center, radius, width, height } = COMPARE_LAYOUT;
  const polygon = buildPolygon(
    center,
    radius,
    points.map((point) => point.value),
  );
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
      className="cp-art__mark"
    >
      <g fill="none" stroke={`var(--cp-${side})`} strokeWidth={2.5}>
        {polygon.segments.map((segment, index) => (
          <line
            key={index}
            x1={segment.from.x}
            y1={segment.from.y}
            x2={segment.to.x}
            y2={segment.to.y}
            strokeDasharray={segment.bridged ? "2 4" : undefined}
          />
        ))}
      </g>
    </svg>
  );
}
