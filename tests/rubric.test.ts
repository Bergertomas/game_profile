import { describe, expect, it } from "vitest";
import {
  dimensionsInCanonicalOrder,
  dimensionsInRadarOrder,
  getDimension,
  RUBRIC_V1,
  SCORE_ANCHORS,
  SUBCRITERION_SCALE,
} from "@/lib/rubric";
import { TAGS } from "@/lib/rubric/tags";

/** GP-002 — the rubric is locked. These tests are the lock. */
describe("Rubric v1.0 structure", () => {
  it("has exactly eight dimensions", () => {
    expect(RUBRIC_V1.dimensions).toHaveLength(8);
  });

  it("gives every dimension exactly five subcriteria", () => {
    for (const dimension of RUBRIC_V1.dimensions) {
      expect(
        dimension.subcriteria,
        `${dimension.key} subcriteria`,
      ).toHaveLength(5);
    }
  });

  it("uses unique dimension keys", () => {
    const keys = RUBRIC_V1.dimensions.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("uses unique subcriterion keys within each dimension", () => {
    for (const dimension of RUBRIC_V1.dimensions) {
      const keys = dimension.subcriteria.map((s) => s.key);
      expect(new Set(keys).size, dimension.key).toBe(keys.length);
    }
  });

  it("numbers subcriteria 1..5 in order", () => {
    for (const dimension of RUBRIC_V1.dimensions) {
      expect(dimension.subcriteria.map((s) => s.displayOrder)).toEqual([
        1, 2, 3, 4, 5,
      ]);
    }
  });

  it("numbers dimensions 1..8 in canonical order", () => {
    expect(dimensionsInCanonicalOrder().map((d) => d.displayOrder)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  it("caps every dimension at a 0–10 total", () => {
    for (const dimension of RUBRIC_V1.dimensions) {
      const max = dimension.subcriteria.length * 2;
      expect(max, dimension.key).toBe(10);
    }
  });

  it("permits only 0 / 0.5 / 1 / 1.5 / 2 at subcriterion level", () => {
    expect(SUBCRITERION_SCALE.map((s) => s.value)).toEqual([0, 0.5, 1, 1.5, 2]);
  });
});

describe("Radar axis order", () => {
  /**
   * The order in Rubric §22, Plan §15.2 and Context §16. Fixed globally: it
   * creates the progression meaning/world -> interactivity/play -> delivery/time
   * that makes silhouettes mentally comparable across games.
   */
  const EXPECTED = [
    "story",
    "thematic",
    "atmosphere",
    "craft",
    "agency",
    "execution",
    "structure",
    "pacing",
  ];

  it("matches the locked clockwise order", () => {
    expect([...RUBRIC_V1.radarOrder]).toEqual(EXPECTED);
  });

  it("covers every dimension exactly once", () => {
    expect(new Set(RUBRIC_V1.radarOrder).size).toBe(
      RUBRIC_V1.dimensions.length,
    );
    for (const key of RUBRIC_V1.radarOrder) {
      expect(() => getDimension(key)).not.toThrow();
    }
  });

  it("differs from canonical storage order, and that is deliberate", () => {
    const canonical = dimensionsInCanonicalOrder().map((d) => d.key);
    const radar = dimensionsInRadarOrder().map((d) => d.key);
    expect(radar).not.toEqual(canonical);
    expect([...radar].sort()).toEqual([...canonical].sort());
  });
});

describe("Presentation metadata", () => {
  it("gives every dimension a two-line axis label and a one-word short label", () => {
    for (const dimension of RUBRIC_V1.dimensions) {
      expect(dimension.axisLabel, dimension.key).toHaveLength(2);
      expect(dimension.shortLabel.trim().split(/\s+/), dimension.key).toHaveLength(
        1,
      );
    }
  });

  it("gives every dimension a boundary statement, to keep dimensions from bleeding", () => {
    for (const dimension of RUBRIC_V1.dimensions) {
      expect(dimension.boundary.length, dimension.key).toBeGreaterThan(20);
    }
  });
});

describe("Score anchors", () => {
  it("are editorial calibration bands, not a public grading scale", () => {
    // Guard against anyone reintroducing pass/fail or good/bad language.
    for (const anchor of SCORE_ANCHORS) {
      expect(anchor.label.toLowerCase()).not.toMatch(/\b(fail|bad|good game)\b/);
    }
  });

  it("covers 0 through 10 without overlapping", () => {
    const sorted = [...SCORE_ANCHORS].sort((a, b) => a.min - b.min);
    expect(sorted[0]!.min).toBe(0);
    expect(sorted[sorted.length - 1]!.max).toBe(10);
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i]!.min).toBeGreaterThan(sorted[i - 1]!.max);
    }
  });
});

describe("Experience tags", () => {
  it("uses unique keys", () => {
    const keys = TAGS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("describes every tag, so nothing is a bare unexplained label", () => {
    for (const tag of TAGS) {
      expect(tag.description.length, tag.key).toBeGreaterThan(10);
    }
  });
});
