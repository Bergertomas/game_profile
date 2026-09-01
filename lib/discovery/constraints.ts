import type { Confidence } from "@/lib/profile/types";
import {
  SUBCRITERIA_PER_DIMENSION,
  type DimensionScore,
} from "@/lib/scoring/derive";
import type { HardConstraintState } from "./contracts";

export const DIMENSION_HARD_THRESHOLDS = {
  strong: 1.5,
  exceptional: 2,
} as const;

export type DimensionHardThreshold =
  keyof typeof DIMENSION_HARD_THRESHOLDS;

export type HardConstraintOutcome =
  | { readonly state: "satisfied" }
  | { readonly state: "contradicted" }
  | {
      readonly state: "indeterminate";
      readonly reason:
        | "unknown"
        | "low_confidence"
        | "range_crosses_threshold";
    };

/** Truth-table for a reliable factual or deliberately classified condition. */
export function qualifyKnownConstraint(
  value: boolean | "unknown",
): HardConstraintState {
  if (value === "unknown") return "indeterminate";
  return value ? "satisfied" : "contradicted";
}

/**
 * Qualify an explicitly hard dimension request without inventing an aggregate.
 *
 * Rubric anchors are expressed per subcriterion on 0–2; public dimension totals
 * are the sum of five subcriteria on 0–10. Multiplying the named threshold by
 * the canonical five preserves the decision exactly and avoids a second score
 * representation in the public model.
 */
export function qualifyDimensionHardConstraint(
  score: DimensionScore,
  confidence: Confidence,
  threshold: DimensionHardThreshold,
): HardConstraintOutcome {
  if (confidence === "low") {
    return { state: "indeterminate", reason: "low_confidence" };
  }

  if (score.kind === "insufficient") {
    return { state: "indeterminate", reason: "unknown" };
  }

  const totalThreshold =
    DIMENSION_HARD_THRESHOLDS[threshold] * SUBCRITERIA_PER_DIMENSION;

  if (score.kind === "exact") {
    return score.score >= totalThreshold
      ? { state: "satisfied" }
      : { state: "contradicted" };
  }

  if (score.low >= totalThreshold) return { state: "satisfied" };
  if (score.high < totalThreshold) return { state: "contradicted" };
  return { state: "indeterminate", reason: "range_crosses_threshold" };
}
