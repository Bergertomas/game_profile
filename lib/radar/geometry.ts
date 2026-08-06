/**
 * Pure geometry for the eight-axis profile radar.
 *
 * Kept separate from the component so the rules that matter — clockwise from
 * twelve o'clock, unknown never collapses to zero, no area is ever computed —
 * are unit-testable without a DOM.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export const MAX_DIMENSION_SCORE = 10;

/** Clockwise from twelve o'clock (Rubric §22, Plan §15.2). */
export function axisAngleRad(index: number, count: number): number {
  return -Math.PI / 2 + (index * 2 * Math.PI) / count;
}

export function pointAt(
  center: Point,
  radius: number,
  index: number,
  count: number,
): Point {
  const angle = axisAngleRad(index, count);
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  };
}

/** Map a 0–10 score onto a pixel radius. */
export function scoreRadius(
  score: number,
  maxRadius: number,
  max: number = MAX_DIMENSION_SCORE,
): number {
  return (Math.max(0, Math.min(max, score)) / max) * maxRadius;
}

export function vertexFor(
  center: Point,
  maxRadius: number,
  index: number,
  count: number,
  score: number,
): Point {
  return pointAt(center, scoreRadius(score, maxRadius), index, count);
}

/** An n-sided ring at a given score level, used for the grid. */
export function ringPath(
  center: Point,
  maxRadius: number,
  count: number,
  atScore: number,
): string {
  const radius = scoreRadius(atScore, maxRadius);
  const points = Array.from({ length: count }, (_, i) =>
    pointAt(center, radius, i, count),
  );
  return `${points
    .map((p, i) => `${i === 0 ? "M" : "L"}${round(p.x)},${round(p.y)}`)
    .join(" ")} Z`;
}

export interface Segment {
  readonly from: Point;
  readonly to: Point;
  /**
   * `true` when the segment spans one or more unknown axes. Rendered dashed:
   * we do not know what the profile does across that span, and a solid line
   * would assert something we cannot support (Round 2 §12).
   */
  readonly bridged: boolean;
}

export interface RadarGeometry {
  readonly vertices: readonly (Point | null)[];
  readonly segments: readonly Segment[];
  /** Closed path for the low-opacity wash. Empty when fewer than 3 knowns. */
  readonly fillPath: string;
  readonly knownCount: number;
}

/**
 * Build the polygon for a set of scores, where `null` means the dimension has
 * insufficient evidence.
 *
 * An unknown axis produces a gap: no vertex is emitted, and the neighbouring
 * known vertices are joined by a dashed bridge. It is never plotted at the
 * centre — that would read as "scored zero", which is a different and much
 * stronger claim (Rubric §22).
 */
export function buildPolygon(
  center: Point,
  maxRadius: number,
  scores: readonly (number | null)[],
): RadarGeometry {
  const count = scores.length;
  const vertices = scores.map((score, index) =>
    score === null ? null : vertexFor(center, maxRadius, index, count, score),
  );

  const knownIndices = vertices
    .map((vertex, index) => (vertex === null ? -1 : index))
    .filter((index) => index >= 0);

  const segments: Segment[] = [];
  if (knownIndices.length >= 2) {
    for (let i = 0; i < knownIndices.length; i += 1) {
      const fromIndex = knownIndices[i]!;
      const toIndex = knownIndices[(i + 1) % knownIndices.length]!;
      // Skip the wrap-around segment when only two vertices are known, or the
      // same line would be drawn twice on top of itself.
      if (knownIndices.length === 2 && i === 1) break;
      const adjacent = (fromIndex + 1) % count === toIndex;
      segments.push({
        from: vertices[fromIndex]!,
        to: vertices[toIndex]!,
        bridged: !adjacent,
      });
    }
  }

  const fillPath =
    knownIndices.length >= 3
      ? `${knownIndices
          .map((index, i) => {
            const p = vertices[index]!;
            return `${i === 0 ? "M" : "L"}${round(p.x)},${round(p.y)}`;
          })
          .join(" ")} Z`
      : "";

  return {
    vertices,
    segments,
    fillPath,
    knownCount: knownIndices.length,
  };
}

export type TextAnchor = "start" | "middle" | "end";

export interface AxisLabelPlacement {
  readonly point: Point;
  readonly anchor: TextAnchor;
  /**
   * Vertical placement of the label block relative to the anchor point:
   * "above" pushes the block up, "below" pushes it down, "middle" centres it.
   */
  readonly vertical: "above" | "middle" | "below";
}

/** Where an axis's label block sits, and how to align it. */
export function axisLabelPlacement(
  center: Point,
  labelRadius: number,
  index: number,
  count: number,
): AxisLabelPlacement {
  const angle = axisAngleRad(index, count);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const point = {
    x: center.x + labelRadius * cos,
    y: center.y + labelRadius * sin,
  };

  const epsilon = 0.2;
  const anchor: TextAnchor =
    cos > epsilon ? "start" : cos < -epsilon ? "end" : "middle";
  const vertical =
    sin < -0.5 ? "above" : sin > 0.5 ? "below" : "middle";

  return { point, anchor, vertical };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
