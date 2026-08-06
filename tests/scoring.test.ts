import { describe, expect, it } from "vitest";
import { getDimension, UNKNOWN } from "@/lib/rubric";
import {
  deriveDimensionScore,
  formatDimensionScore,
  formatScore,
  radarUncertaintyCeiling,
  radarValue,
  type SubcriterionValues,
} from "@/lib/scoring/derive";

const story = getDimension("story");

function storyValues(
  values: readonly (number | "unknown")[],
): SubcriterionValues {
  return Object.fromEntries(
    story.subcriteria.map((sub, i) => [sub.key, values[i]!]),
  ) as SubcriterionValues;
}

describe("deriveDimensionScore", () => {
  it("sums five known subcriteria", () => {
    const score = deriveDimensionScore(story, storyValues([2, 2, 1.5, 2, 2]));
    expect(score).toEqual({ kind: "exact", score: 9.5, unknownCount: 0 });
  });

  it("produces 0 and 10 at the ends of the scale", () => {
    expect(deriveDimensionScore(story, storyValues([0, 0, 0, 0, 0]))).toEqual({
      kind: "exact",
      score: 0,
      unknownCount: 0,
    });
    expect(deriveDimensionScore(story, storyValues([2, 2, 2, 2, 2]))).toEqual({
      kind: "exact",
      score: 10,
      unknownCount: 0,
    });
  });

  it("only ever produces totals on a 0.5 grid", () => {
    const steps = [0, 0.5, 1, 1.5, 2] as const;
    for (const a of steps) {
      for (const b of steps) {
        const score = deriveDimensionScore(story, storyValues([a, b, 1, 1, 1]));
        if (score.kind !== "exact") throw new Error("expected exact");
        expect(score.score * 2).toBe(Math.round(score.score * 2));
      }
    }
  });

  it("publishes a range when exactly one subcriterion is unknown", () => {
    const score = deriveDimensionScore(
      story,
      storyValues([2, 2, 1.5, 2, UNKNOWN]),
    );
    expect(score).toEqual({ kind: "range", low: 7.5, high: 9.5, unknownCount: 1 });
    expect(formatDimensionScore(score)).toBe("7.5–9.5");
  });

  it("publishes no total when two or more subcriteria are unknown", () => {
    const score = deriveDimensionScore(
      story,
      storyValues([2, 2, 1.5, UNKNOWN, UNKNOWN]),
    );
    expect(score.kind).toBe("insufficient");
    expect(score.unknownCount).toBe(2);
    expect(formatDimensionScore(score)).toBe("Not scored");
  });

  it("rejects a missing subcriterion rather than treating it as unknown", () => {
    const partial = { story_hook: 2 } as unknown as SubcriterionValues;
    expect(() => deriveDimensionScore(story, partial)).toThrow(/missing/i);
  });

  it("rejects subcriteria that do not belong to the dimension", () => {
    const values = {
      ...storyValues([1, 1, 1, 1, 1]),
      not_a_real_key: 2,
    } as unknown as SubcriterionValues;
    expect(() => deriveDimensionScore(story, values)).toThrow(/unrecognised/i);
  });
});

describe("radar plotting rules", () => {
  it("never plots an unknown dimension at zero", () => {
    const insufficient = deriveDimensionScore(
      story,
      storyValues([2, 2, 2, UNKNOWN, UNKNOWN]),
    );
    // The distinction that matters: null means "no vertex", 0 means "scored 0".
    expect(radarValue(insufficient)).toBeNull();
    expect(radarValue(insufficient)).not.toBe(0);
  });

  it("plots a genuine zero at zero", () => {
    const zero = deriveDimensionScore(story, storyValues([0, 0, 0, 0, 0]));
    expect(radarValue(zero)).toBe(0);
  });

  it("plots the confirmed floor of a range, with the ceiling as a reach", () => {
    const range = deriveDimensionScore(
      story,
      storyValues([1, 1, 1, 1, UNKNOWN]),
    );
    expect(radarValue(range)).toBe(4);
    expect(radarUncertaintyCeiling(range)).toBe(6);
  });

  it("has no uncertainty reach for an exact score", () => {
    const exact = deriveDimensionScore(story, storyValues([1, 1, 1, 1, 1]));
    expect(radarUncertaintyCeiling(exact)).toBeNull();
  });
});

describe("formatScore", () => {
  it("always shows one decimal, so 9 never reads as more precise than 9.0", () => {
    expect(formatScore(9)).toBe("9.0");
    expect(formatScore(9.5)).toBe("9.5");
    expect(formatScore(0)).toBe("0.0");
    expect(formatScore(10)).toBe("10.0");
  });
});
