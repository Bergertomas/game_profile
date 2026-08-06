import {
  UNKNOWN,
  type Dimension,
  type SubcriterionValue,
} from "@/lib/rubric";

/**
 * Dimension score derivation.
 *
 * Dimension totals are NEVER stored as hand-entered numbers — they are derived
 * from the five subcriterion scores (Plan §13.1: "prefer a derived value rather
 * than duplicated manual numbers"). That guarantees the published number and the
 * published rationale can never disagree.
 */

/** Number of subcriteria every dimension has under rubric v1.0. */
export const SUBCRITERIA_PER_DIMENSION = 5;

/** Maximum contribution of a single subcriterion. */
export const MAX_SUBCRITERION_SCORE = 2;

export type DimensionScore =
  /** All five subcriteria scored. The published number. */
  | { readonly kind: "exact"; readonly score: number; readonly unknownCount: 0 }
  /**
   * Exactly one subcriterion unknown. The total is genuinely a 2-point range,
   * which is wider than a whole calibration anchor band, so publishing a point
   * value would be fake precision (Plan §25.18, Rubric §21).
   */
  | {
      readonly kind: "range";
      readonly low: number;
      readonly high: number;
      readonly unknownCount: 1;
    }
  /**
   * Two or more unknown. Plan §9.2: the dimension is provisional and its score
   * may be hidden. We hide it rather than publish a range spanning 4+ points.
   */
  | {
      readonly kind: "insufficient";
      readonly knownSum: number;
      readonly unknownCount: number;
    };

export type SubcriterionValues = Readonly<Record<string, SubcriterionValue>>;

/**
 * Derive a dimension total from its five subcriterion values.
 *
 * Throws if the input does not cover exactly the dimension's subcriteria — a
 * partially-keyed record is a data bug, not an "unknown". Absence of evidence is
 * expressed with the explicit `unknown` value.
 */
export function deriveDimensionScore(
  dimension: Dimension,
  values: SubcriterionValues,
): DimensionScore {
  const keys = dimension.subcriteria.map((s) => s.key);
  const providedKeys = Object.keys(values);

  const missing = keys.filter((k) => !(k in values));
  if (missing.length > 0) {
    throw new Error(
      `${dimension.key}: missing subcriteria [${missing.join(", ")}]. ` +
        `Use the explicit "unknown" value rather than omitting a key.`,
    );
  }
  const extra = providedKeys.filter((k) => !keys.includes(k));
  if (extra.length > 0) {
    throw new Error(
      `${dimension.key}: unrecognised subcriteria [${extra.join(", ")}].`,
    );
  }

  let knownSum = 0;
  let unknownCount = 0;
  for (const key of keys) {
    const value = values[key];
    if (value === UNKNOWN) {
      unknownCount += 1;
      continue;
    }
    knownSum += value as number;
  }

  if (unknownCount === 0) {
    return { kind: "exact", score: knownSum, unknownCount: 0 };
  }
  if (unknownCount === 1) {
    return {
      kind: "range",
      low: knownSum,
      high: knownSum + MAX_SUBCRITERION_SCORE,
      unknownCount: 1,
    };
  }
  return { kind: "insufficient", knownSum, unknownCount };
}

/**
 * The value the radar plots for a dimension, or `null` when nothing may be
 * plotted. Unknown must never collapse to zero (Rubric §22, Round 2 §12) —
 * `null` makes the polygon break at that axis instead.
 */
export function radarValue(score: DimensionScore): number | null {
  switch (score.kind) {
    case "exact":
      return score.score;
    case "range":
      // Plot the confirmed floor; the uncertainty above it is drawn separately.
      return score.low;
    case "insufficient":
      return null;
  }
}

/** Upper bound of a plotted uncertainty reach, or `null` when there is none. */
export function radarUncertaintyCeiling(score: DimensionScore): number | null {
  return score.kind === "range" ? score.high : null;
}

/**
 * Public score formatting. Always one decimal so values align in tabular
 * figures and 9 never reads as more precise than 9.0.
 */
export function formatScore(value: number): string {
  return value.toFixed(1);
}

/** The text a score row shows in place of a number. */
export function formatDimensionScore(score: DimensionScore): string {
  switch (score.kind) {
    case "exact":
      return formatScore(score.score);
    case "range":
      return `${formatScore(score.low)}–${formatScore(score.high)}`;
    case "insufficient":
      return "Not scored";
  }
}

/**
 * Confidence ceiling implied by unknown coverage (Plan §9.2: "confidence cannot
 * be High"). Returned so validation can reject an over-confident evaluation.
 */
export function impliesConfidenceCeiling(
  scores: readonly DimensionScore[],
): "high" | "medium" {
  const anyProvisional = scores.some((s) => s.unknownCount > 1);
  return anyProvisional ? "medium" : "high";
}
