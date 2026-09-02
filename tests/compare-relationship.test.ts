import { describe, expect, it } from "vitest";
import {
  describeRelationship,
  relate,
  scoreWords,
} from "@/lib/compare/relationship";
import type { DimensionScore } from "@/lib/scoring/derive";

/**
 * The relationship rule (handoff §10.3): deterministic, interval-aware, and
 * blind to confidence. Every branch, and the two things it must never do —
 * midpoint a Range, or let confidence move a relation.
 */

const exact = (score: number): DimensionScore => ({ kind: "exact", score, unknownCount: 0 });
const range = (low: number, high: number): DimensionScore => ({
  kind: "range",
  low,
  high,
  unknownCount: 1,
});
const unknown: DimensionScore = { kind: "insufficient", knownSum: 4, unknownCount: 3 };
const names = { left: "Left Game", right: "Right Game" };

describe("relate", () => {
  it("delta 0 is Equal", () => {
    expect(relate(exact(10), exact(10))).toEqual({ kind: "equal", delta: 0 });
    expect(relate(exact(0), exact(0))).toEqual({ kind: "equal", delta: 0 });
  });

  it("delta 0.5 is Close, naming the higher side", () => {
    expect(relate(exact(9.5), exact(10))).toEqual({ kind: "close", delta: 0.5, higher: "right" });
    expect(relate(exact(8), exact(7.5))).toEqual({ kind: "close", delta: 0.5, higher: "left" });
  });

  it("delta ≥ 1.0 is a Clear difference, naming the higher side", () => {
    expect(relate(exact(7.5), exact(10))).toEqual({ kind: "clear", delta: 2.5, higher: "right" });
    expect(relate(exact(9.5), exact(8.5))).toEqual({ kind: "clear", delta: 1, higher: "left" });
    expect(relate(exact(10), exact(0))).toEqual({ kind: "clear", delta: 10, higher: "left" });
  });

  it("any Range is Indeterminate — never midpointed", () => {
    // 6.0–8.0 against 8.5: the midpoint (7.0) would say Clear difference, the
    // top endpoint would say Close. Neither is claimed.
    expect(relate(range(6, 8), exact(8.5))).toEqual({ kind: "indeterminate", reason: "range" });
    expect(relate(exact(7), range(6, 8))).toEqual({ kind: "indeterminate", reason: "range" });
    expect(relate(range(6, 8), range(6, 8))).toEqual({ kind: "indeterminate", reason: "range" });
    // Even a Range that does not overlap the other value at all.
    expect(relate(range(2, 4), exact(10))).toEqual({ kind: "indeterminate", reason: "range" });
  });

  it("Not scored is Indeterminate, beside exact and beside Not scored", () => {
    expect(relate(unknown, exact(9.5))).toEqual({ kind: "indeterminate", reason: "unknown" });
    expect(relate(exact(9.5), unknown)).toEqual({ kind: "indeterminate", reason: "unknown" });
    expect(relate(unknown, unknown)).toEqual({ kind: "indeterminate", reason: "unknown" });
    // Not scored beside a Range: the missing total is the stronger reason.
    expect(relate(unknown, range(6, 8))).toEqual({ kind: "indeterminate", reason: "unknown" });
  });

  it("takes no confidence input, so confidence cannot move a relation", () => {
    // The signature is the proof: two scores in, one relation out.
    expect(relate.length).toBe(2);
  });
});

describe("describeRelationship", () => {
  const scores = { left: exact(7.5), right: exact(10) };

  it("writes each relation with the direction by game name", () => {
    expect(describeRelationship({ kind: "equal", delta: 0 }, names, scores)).toBe("Equal.");
    expect(
      describeRelationship({ kind: "close", delta: 0.5, higher: "right" }, names, scores),
    ).toBe("Close; Right Game is higher by 0.5.");
    expect(
      describeRelationship({ kind: "clear", delta: 2.5, higher: "right" }, names, scores),
    ).toBe("Clear difference; Right Game is higher by 2.5.");
  });

  it("names which side is a range, or not scored", () => {
    expect(
      describeRelationship(
        { kind: "indeterminate", reason: "range" },
        names,
        { left: range(6, 8), right: exact(8.5) },
      ),
    ).toBe("Indeterminate; Left Game is published as a range, so no exact difference is claimed.");
    expect(
      describeRelationship(
        { kind: "indeterminate", reason: "unknown" },
        names,
        { left: unknown, right: unknown },
      ),
    ).toBe("Indeterminate; Left Game and Right Game are not scored on this dimension.");
  });

  it("never uses winner language", () => {
    for (const relationship of [
      { kind: "equal", delta: 0 } as const,
      { kind: "close", delta: 0.5, higher: "left" } as const,
      { kind: "clear", delta: 3, higher: "left" } as const,
      { kind: "indeterminate", reason: "range" } as const,
    ]) {
      const sentence = describeRelationship(relationship, names, { left: range(1, 3), right: exact(5) });
      expect(sentence).not.toMatch(/winner|wins|better|worse|beats/i);
    }
  });
});

describe("scoreWords", () => {
  it("speaks exact, range and not scored", () => {
    expect(scoreWords(exact(9.5))).toBe("9.5 out of 10");
    expect(scoreWords(range(6, 8))).toBe("a range from 6.0 to 8.0 out of 10");
    expect(scoreWords(unknown)).toBe("not scored");
  });
});
