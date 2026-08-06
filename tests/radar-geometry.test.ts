import { describe, expect, it } from "vitest";
import {
  axisAngleRad,
  buildPolygon,
  pointAt,
  scoreRadius,
  vertexFor,
} from "@/lib/radar/geometry";

const CENTER = { x: 100, y: 100 };
const RADIUS = 100;

describe("axis placement", () => {
  it("puts the first axis at twelve o'clock", () => {
    const p = pointAt(CENTER, RADIUS, 0, 8);
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(0);
  });

  it("runs clockwise", () => {
    // Index 2 of 8 is a quarter turn clockwise from the top: due right.
    const p = pointAt(CENTER, RADIUS, 2, 8);
    expect(p.x).toBeCloseTo(200);
    expect(p.y).toBeCloseTo(100);
  });

  it("spaces eight axes at 45 degrees", () => {
    for (let i = 0; i < 8; i += 1) {
      const delta = axisAngleRad(i + 1, 8) - axisAngleRad(i, 8);
      expect(delta).toBeCloseTo(Math.PI / 4);
    }
  });
});

describe("score to radius", () => {
  it("maps 0 to the centre and 10 to the outer ring", () => {
    expect(scoreRadius(0, RADIUS)).toBe(0);
    expect(scoreRadius(10, RADIUS)).toBe(RADIUS);
    expect(scoreRadius(5, RADIUS)).toBe(50);
  });

  it("clamps out-of-range input rather than drawing outside the chart", () => {
    expect(scoreRadius(-3, RADIUS)).toBe(0);
    expect(scoreRadius(14, RADIUS)).toBe(RADIUS);
  });
});

describe("buildPolygon", () => {
  const full = [9, 8, 7, 6, 5, 4, 3, 2];

  it("emits a vertex per axis and a closed fill when everything is scored", () => {
    const geometry = buildPolygon(CENTER, RADIUS, full);
    expect(geometry.vertices.every((v) => v !== null)).toBe(true);
    expect(geometry.knownCount).toBe(8);
    expect(geometry.segments).toHaveLength(8);
    expect(geometry.segments.every((s) => !s.bridged)).toBe(true);
    expect(geometry.fillPath.endsWith("Z")).toBe(true);
  });

  it("omits an unknown vertex entirely rather than plotting it at the centre", () => {
    const scores = [...full];
    scores[3] = null as unknown as number;
    const geometry = buildPolygon(CENTER, RADIUS, scores as (number | null)[]);

    expect(geometry.vertices[3]).toBeNull();
    // The critical assertion: nothing was drawn at the origin.
    const atCentre = geometry.vertices.filter(
      (v) => v !== null && v.x === CENTER.x && v.y === CENTER.y,
    );
    expect(atCentre).toHaveLength(0);
  });

  it("bridges across an unknown axis with a dashed segment", () => {
    const scores: (number | null)[] = [...full];
    scores[3] = null;
    const geometry = buildPolygon(CENTER, RADIUS, scores);

    expect(geometry.knownCount).toBe(7);
    expect(geometry.segments).toHaveLength(7);
    const bridged = geometry.segments.filter((s) => s.bridged);
    expect(bridged).toHaveLength(1);

    // The bridge must span axis 2 -> axis 4, skipping the unknown at 3.
    const from = vertexFor(CENTER, RADIUS, 2, 8, full[2]!);
    const to = vertexFor(CENTER, RADIUS, 4, 8, full[4]!);
    expect(bridged[0]!.from.x).toBeCloseTo(from.x);
    expect(bridged[0]!.from.y).toBeCloseTo(from.y);
    expect(bridged[0]!.to.x).toBeCloseTo(to.x);
    expect(bridged[0]!.to.y).toBeCloseTo(to.y);
  });

  it("bridges across two adjacent unknown axes as a single span", () => {
    const scores: (number | null)[] = [...full];
    scores[3] = null;
    scores[4] = null;
    const geometry = buildPolygon(CENTER, RADIUS, scores);
    expect(geometry.knownCount).toBe(6);
    expect(geometry.segments.filter((s) => s.bridged)).toHaveLength(1);
  });

  it("distinguishes a scored zero from an unknown", () => {
    const zeroed = buildPolygon(CENTER, RADIUS, [0, 8, 7, 6, 5, 4, 3, 2]);
    expect(zeroed.vertices[0]).toEqual({ x: CENTER.x, y: CENTER.y });
    expect(zeroed.segments.every((s) => !s.bridged)).toBe(true);

    const unknown = buildPolygon(CENTER, RADIUS, [null, 8, 7, 6, 5, 4, 3, 2]);
    expect(unknown.vertices[0]).toBeNull();
    expect(unknown.segments.some((s) => s.bridged)).toBe(true);
  });

  it("draws no fill when fewer than three dimensions are scored", () => {
    const geometry = buildPolygon(CENTER, RADIUS, [
      9,
      8,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(geometry.fillPath).toBe("");
    expect(geometry.segments).toHaveLength(1);
  });

  it("never computes an area", () => {
    // Guard against a future "profile strength" metric sneaking in through the
    // geometry layer. Plan §15.2: no total polygon-area score.
    const geometry = buildPolygon(CENTER, RADIUS, full);
    expect(Object.keys(geometry).sort()).toEqual([
      "fillPath",
      "knownCount",
      "segments",
      "vertices",
    ]);
  });
});
