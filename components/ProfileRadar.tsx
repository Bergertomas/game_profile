"use client";

import type { RadarPoint } from "@/lib/profile/build";
import {
  axisAngleRad,
  axisLabelPlacement,
  buildPolygon,
  pointAt,
  ringPath,
  scoreRadius,
  vertexFor,
  type Point,
} from "@/lib/radar/geometry";

/**
 * The eight-axis profile silhouette.
 *
 * Contract (Plan §15.2, Rubric §22, Round 2 §12):
 *  - exactly eight axes in a globally fixed order;
 *  - every axis is annotated with its own exact number, so the chart reads as
 *    eight labelled measurements rather than a blob whose size is a grade;
 *  - no aggregate is computed or implied from the polygon's area;
 *  - no green/red good-bad semantics — one accent, used neutrally;
 *  - unknown dimensions break the outline instead of collapsing to the centre;
 *  - the exact score rows beside this chart are the authoritative, accessible
 *    representation. This SVG is aria-hidden; the figure caption carries a text
 *    equivalent.
 */

interface Layout {
  readonly width: number;
  readonly height: number;
  readonly center: Point;
  readonly radius: number;
  readonly labelRadius: number;
  readonly nameSize: number;
  readonly valueSize: number;
  readonly mode: "short" | "full";
}

const COMPACT: Layout = {
  width: 400,
  height: 312,
  center: { x: 200, y: 156 },
  radius: 82,
  labelRadius: 99,
  nameSize: 13,
  valueSize: 18,
  mode: "short",
};

const FULL: Layout = {
  width: 470,
  height: 424,
  center: { x: 235, y: 208 },
  radius: 122,
  labelRadius: 143,
  nameSize: 11,
  valueSize: 20,
  mode: "full",
};

const GRID_LEVELS = [2.5, 5, 7.5, 10] as const;
/** The outer ring is self-evidently the maximum; labelling it collides with a
 *  high Story vertex and adds nothing. */
const LABELLED_LEVELS = [2.5, 5, 7.5] as const;

interface Props {
  readonly points: readonly RadarPoint[];
  readonly activeKey: string | null;
  readonly onActiveChange: (key: string | null) => void;
}

export function ProfileRadar({ points, activeKey, onActiveChange }: Props) {
  return (
    <>
      <div className="sm:hidden">
        <RadarSvg
          layout={COMPACT}
          points={points}
          activeKey={activeKey}
          onActiveChange={onActiveChange}
        />
      </div>
      <div className="hidden sm:block">
        <RadarSvg
          layout={FULL}
          points={points}
          activeKey={activeKey}
          onActiveChange={onActiveChange}
        />
      </div>
    </>
  );
}

function RadarSvg({
  layout,
  points,
  activeKey,
  onActiveChange,
}: Props & { layout: Layout }) {
  const { center, radius, labelRadius, width, height, nameSize, valueSize } =
    layout;
  const count = points.length;
  const polygon = buildPolygon(
    center,
    radius,
    points.map((p) => p.value),
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto select-none"
      aria-hidden="true"
      focusable="false"
      onPointerLeave={() => onActiveChange(null)}
    >
      {/* Grid: octagonal rings matching the polygon's own geometry. */}
      <g className="stroke-line" fill="none" strokeWidth={1}>
        {GRID_LEVELS.map((level) => (
          <path
            key={level}
            d={ringPath(center, radius, count, level)}
            className={level === 10 ? "stroke-line-strong" : "stroke-line"}
          />
        ))}
      </g>

      {/* Spokes. */}
      <g strokeWidth={1}>
        {points.map((point, index) => {
          const outer = pointAt(center, radius, index, count);
          const isActive = activeKey === point.key;
          return (
            <line
              key={point.key}
              x1={center.x}
              y1={center.y}
              x2={outer.x}
              y2={outer.y}
              className={
                isActive
                  ? "stroke-brass/60"
                  : point.value === null
                    ? "stroke-line/50"
                    : "stroke-line"
              }
              strokeDasharray={point.value === null ? "2 3" : undefined}
            />
          );
        })}
      </g>

      {/* Scale ticks, printed once along the bisector between the first two
          axes. No vertex can ever fall there, so the labels never collide with
          the polygon whatever the scores are. Omitted at phone size, where they
          are too small to read and only add noise inside the shape; the axis
          values and the score rows carry the scale there. */}
      {layout.mode === "full" && (
        <g className="fill-bone-faint" fontSize={9} textAnchor="middle">
          {LABELLED_LEVELS.map((level) => {
            const bisector = axisAngleRad(0, count) + Math.PI / count;
            const r = scoreRadius(level, radius);
            return (
              <text
                key={level}
                x={center.x + r * Math.cos(bisector)}
                y={center.y + r * Math.sin(bisector) + 3}
                className="tabular"
              >
                {level}
              </text>
            );
          })}
        </g>
      )}

      {/* The profile itself. */}
      {polygon.fillPath && (
        <path d={polygon.fillPath} className="fill-brass/12" stroke="none" />
      )}
      <g fill="none" strokeLinejoin="round" strokeLinecap="round">
        {polygon.segments.map((segment, index) => (
          <line
            key={index}
            x1={segment.from.x}
            y1={segment.from.y}
            x2={segment.to.x}
            y2={segment.to.y}
            className={segment.bridged ? "stroke-brass/45" : "stroke-brass"}
            strokeWidth={2}
            strokeDasharray={segment.bridged ? "3 4" : undefined}
          />
        ))}
      </g>

      {/* Uncertainty reach for dimensions published as a range. */}
      <g fill="none">
        {points.map((point, index) => {
          if (point.value === null || point.ceiling === null) return null;
          const from = vertexFor(center, radius, index, count, point.value);
          const to = vertexFor(center, radius, index, count, point.ceiling);
          return (
            <g key={`reach-${point.key}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className="stroke-brass/50"
                strokeWidth={1.5}
                strokeDasharray="2 3"
              />
              <circle
                cx={to.x}
                cy={to.y}
                r={3}
                className="stroke-brass/60"
                strokeWidth={1.5}
              />
            </g>
          );
        })}
      </g>

      {/* Vertex markers. */}
      <g>
        {points.map((point, index) => {
          if (point.value === null) return null;
          const vertex = vertexFor(center, radius, index, count, point.value);
          const isActive = activeKey === point.key;
          return (
            <circle
              key={`dot-${point.key}`}
              cx={vertex.x}
              cy={vertex.y}
              r={isActive ? 5 : 3}
              className={isActive ? "fill-brass-bright" : "fill-brass"}
            />
          );
        })}
      </g>

      {/* Axis labels: name plus its own exact value. */}
      <g>
        {points.map((point, index) => (
          <AxisLabel
            key={`label-${point.key}`}
            point={point}
            index={index}
            count={count}
            layout={layout}
            isActive={activeKey === point.key}
          />
        ))}
      </g>

      {/* Transparent wedge hit-areas. Pointer only — keyboard users navigate the
          score rows, which drive the same highlight without duplicate tab stops. */}
      <g>
        {points.map((point, index) => (
          <path
            key={`hit-${point.key}`}
            d={wedgePath(center, labelRadius + nameSize * 3, index, count)}
            fill="transparent"
            onPointerEnter={() => onActiveChange(point.key)}
            onClick={() =>
              onActiveChange(activeKey === point.key ? null : point.key)
            }
            style={{ cursor: "pointer" }}
          />
        ))}
      </g>
    </svg>
  );
}

function AxisLabel({
  point,
  index,
  count,
  layout,
  isActive,
}: {
  point: RadarPoint;
  index: number;
  count: number;
  layout: Layout;
  isActive: boolean;
}) {
  const { center, labelRadius, nameSize, valueSize, mode } = layout;
  const placement = axisLabelPlacement(center, labelRadius, index, count);
  const lines =
    mode === "full" ? [...point.axisLabel] : [point.shortLabel];
  const nameLead = nameSize * 1.15;

  // Every label block reads the same way — name above, value below — so the
  // eight annotations share one rhythm instead of flipping around the circle.
  // The block is then pushed clear of the chart: up for the top axes, down for
  // the bottom ones, centred for the two horizontal axes.
  const blockHeight = (lines.length - 1) * nameLead + valueSize + nameSize;
  const firstNameBaseline =
    placement.vertical === "above"
      ? placement.point.y - (lines.length - 1) * nameLead - valueSize
      : placement.vertical === "below"
        ? placement.point.y + nameSize
        : placement.point.y - blockHeight / 2 + nameSize;

  const nameBaselines = lines.map((_, i) => firstNameBaseline + i * nameLead);
  const valueBaseline =
    firstNameBaseline + (lines.length - 1) * nameLead + valueSize;

  const unscored = point.value === null;

  return (
    <g>
      {lines.map((line, i) => (
        <text
          key={i}
          x={placement.point.x}
          y={nameBaselines[i]}
          textAnchor={placement.anchor}
          fontSize={nameSize}
          className={`label-micro ${
            unscored
              ? "fill-bone-faint"
              : isActive
                ? "fill-bone"
                : "fill-bone-dim"
          }`}
        >
          {line}
        </text>
      ))}
      <text
        x={placement.point.x}
        y={valueBaseline}
        textAnchor={placement.anchor}
        fontSize={valueSize}
        fontWeight={600}
        className={`tabular ${
          unscored
            ? "fill-bone-faint"
            : isActive
              ? "fill-brass-bright"
              : "fill-brass"
        }`}
      >
        {/* An em dash, not an abbreviation: this axis has no value, and the
            score row beside it says why. */}
        {unscored ? "—" : point.display}
      </text>
    </g>
  );
}

/** A pie wedge centred on one axis, used as a forgiving pointer target. */
function wedgePath(
  center: Point,
  outerRadius: number,
  index: number,
  count: number,
): string {
  const half = Math.PI / count;
  const mid = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  const a = mid - half;
  const b = mid + half;
  const p1 = {
    x: center.x + outerRadius * Math.cos(a),
    y: center.y + outerRadius * Math.sin(a),
  };
  const p2 = {
    x: center.x + outerRadius * Math.cos(b),
    y: center.y + outerRadius * Math.sin(b),
  };
  return `M${center.x},${center.y} L${p1.x.toFixed(1)},${p1.y.toFixed(1)} A${outerRadius},${outerRadius} 0 0 1 ${p2.x.toFixed(1)},${p2.y.toFixed(1)} Z`;
}
