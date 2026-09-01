import { describe, expect, it } from "vitest";
import {
  CONSTRAINT_ELIGIBILITY,
  DISCOVERY_INTENTS,
  EXPERIENCE_AXES,
  EXPERIENCE_LEVELS,
} from "@/lib/discovery/contracts";
import {
  qualifyDimensionHardConstraint,
  qualifyKnownConstraint,
} from "@/lib/discovery/constraints";

describe("The launch discovery vocabulary", () => {
  it("pins four visible/editable intentions", () => {
    expect(DISCOVERY_INTENTS).toEqual([
      "must_include",
      "prefer",
      "prefer_not",
      "must_exclude",
    ]);
  });

  it("keeps hard eligibility separate from importance", () => {
    expect(CONSTRAINT_ELIGIBILITY).toEqual([
      "factual_hard",
      "classified_hard",
      "soft_by_default",
    ]);
  });

  it("has exactly the resolved eleven experience axes", () => {
    expect(EXPERIENCE_AXES).toHaveLength(11);
    expect(new Set(EXPERIENCE_AXES.map((axis) => axis.key)).size).toBe(11);
    expect(EXPERIENCE_LEVELS).toContain("unknown");
    expect(EXPERIENCE_LEVELS).toContain("not_applicable");
  });
});
describe("Hard-constraint truth", () => {
  it("never turns Unknown into pass or failure", () => {
    expect(qualifyKnownConstraint("unknown")).toBe("indeterminate");
    expect(qualifyKnownConstraint(true)).toBe("satisfied");
    expect(qualifyKnownConstraint(false)).toBe("contradicted");
  });

  it("maps Strong to 7.5/10 without creating an aggregate", () => {
    expect(
      qualifyDimensionHardConstraint(
        { kind: "exact", score: 7.5, unknownCount: 0 },
        "medium",
        "strong",
      ),
    ).toEqual({ state: "satisfied" });
    expect(
      qualifyDimensionHardConstraint(
        { kind: "exact", score: 7, unknownCount: 0 },
        "high",
        "strong",
      ),
    ).toEqual({ state: "contradicted" });
  });

  it("requires the entire range to clear the threshold", () => {
    expect(
      qualifyDimensionHardConstraint(
        { kind: "range", low: 7.5, high: 9.5, unknownCount: 1 },
        "medium",
        "strong",
      ),
    ).toEqual({ state: "satisfied" });
    expect(
      qualifyDimensionHardConstraint(
        { kind: "range", low: 6.5, high: 8.5, unknownCount: 1 },
        "high",
        "strong",
      ),
    ).toEqual({
      state: "indeterminate",
      reason: "range_crosses_threshold",
    });
    expect(
      qualifyDimensionHardConstraint(
        { kind: "range", low: 4, high: 6, unknownCount: 1 },
        "medium",
        "strong",
      ),
    ).toEqual({ state: "contradicted" });
  });

  it("makes missing evidence and Low confidence indeterminate", () => {
    expect(
      qualifyDimensionHardConstraint(
        { kind: "insufficient", knownSum: 6, unknownCount: 2 },
        "high",
        "strong",
      ),
    ).toEqual({ state: "indeterminate", reason: "unknown" });
    expect(
      qualifyDimensionHardConstraint(
        { kind: "exact", score: 10, unknownCount: 0 },
        "low",
        "exceptional",
      ),
    ).toEqual({ state: "indeterminate", reason: "low_confidence" });
  });
});
