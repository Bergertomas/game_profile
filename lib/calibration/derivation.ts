import { UNKNOWN, getDimension, type SubcriterionValue } from "@/lib/rubric";
import { deriveDimensionScore, type DimensionScore } from "@/lib/scoring/derive";
import { DIMENSION_SUBCRITERIA } from "./protocol-tables";
import type {
  ConfidenceFacts,
  ConfidenceLabel,
  DerivedDimension,
  EvaluationScope,
  ScoreDecision,
} from "./package-types";

/**
 * The derivations Protocol §15.1 requires the validator to recompute.
 *
 * Dimension totals are NOT reimplemented here: §7.3 says the algorithm "must
 * match TypeScript, SQL/read-path and tests byte-for-byte", so this module
 * calls the product's existing `lib/scoring/derive.ts` rather than growing a
 * second copy that could drift from the published radar. What is implemented
 * here is the confidence arithmetic of §10 and the `evidence_status` rule of
 * §15.2, neither of which had an executable form before Item 4.
 */

/** One decision's value in the form `deriveDimensionScore` consumes. */
export function toSubcriterionValue(decision: ScoreDecision): SubcriterionValue {
  if (decision.score_value_kind === "unknown") return UNKNOWN;
  return decision.numeric_score as Exclude<SubcriterionValue, typeof UNKNOWN>;
}

/** Derive one dimension result from its five final decisions. */
export function deriveDimension(
  dimensionKey: string,
  decisionsByKey: ReadonlyMap<string, ScoreDecision>,
): DimensionScore {
  const keys = DIMENSION_SUBCRITERIA.get(dimensionKey);
  if (!keys) throw new Error(`Unknown dimension key: ${dimensionKey}`);
  const values: Record<string, SubcriterionValue> = {};
  for (const key of keys) {
    const decision = decisionsByKey.get(key);
    if (!decision) throw new Error(`No decision for ${dimensionKey}.${key}`);
    values[key] = toSubcriterionValue(decision);
  }
  return deriveDimensionScore(getDimension(dimensionKey as never), values);
}

/**
 * Protocol §10.1 — subcriterion confidence from the three closed facts.
 *
 * Unknown is always Low, and a numeric value earns High only from the fully
 * clean fact triple. "Exactly one of `bounded`, `adjacent_resolved` or
 * `bounded_change`" is read literally: two soft limitations produce Low, which
 * is the §10.1 note that "multiple bounded limitations therefore produce Low
 * rather than an editorial guess".
 */
export function deriveSubcriterionConfidence(
  kind: "numeric" | "unknown",
  facts: ConfidenceFacts,
): ConfidenceLabel {
  if (kind === "unknown") return "Low";

  const { coverage_state, conflict_state, stability_state } = facts;
  if (
    coverage_state === "full" &&
    conflict_state === "none" &&
    stability_state === "stable"
  ) {
    return "High";
  }

  const hasHardFact =
    coverage_state === "materially_limited" ||
    conflict_state === "material_unresolved" ||
    stability_state === "actively_changing" ||
    stability_state === "unknown";
  if (hasHardFact) return "Low";

  const softCount =
    (coverage_state === "bounded" ? 1 : 0) +
    (conflict_state === "adjacent_resolved" ? 1 : 0) +
    (stability_state === "bounded_change" ? 1 : 0);
  return softCount === 1 ? "Medium" : "Low";
}

/** Protocol §10.2 — dimension confidence from the five subcriteria's facts. */
export function deriveDimensionConfidence(
  result: DimensionScore,
  decisions: readonly ScoreDecision[],
  dimensionScopeState: "sound" | "threatened",
): ConfidenceLabel {
  const labels = decisions.map((decision) =>
    deriveSubcriterionConfidence(decision.score_value_kind, decision.confidence_facts),
  );
  const facts = decisions.map((decision) => decision.confidence_facts);
  const high = labels.filter((label) => label === "High").length;
  const highOrMedium = labels.filter((label) => label !== "Low").length;
  const low = labels.filter((label) => label === "Low").length;

  if (
    result.kind === "exact" &&
    high >= 4 &&
    highOrMedium === labels.length &&
    facts.every((fact) => fact.stability_state === "stable") &&
    dimensionScopeState === "sound"
  ) {
    return "High";
  }

  if (
    (result.kind === "exact" || result.kind === "range") &&
    highOrMedium >= 4 &&
    low <= 1 &&
    facts.every((fact) => fact.conflict_state !== "material_unresolved") &&
    facts.every((fact) => fact.stability_state !== "unknown") &&
    dimensionScopeState === "sound"
  ) {
    return "Medium";
  }

  return "Low";
}

/** Protocol §10.3 — overall confidence from the eight derived dimensions. */
export function deriveOverallConfidence(
  dimensions: readonly DerivedDimension[],
  scope: Pick<
    EvaluationScope,
    "global_scope_state" | "profile_stability_state" | "evaluation_maturity" | "release_state"
  >,
): ConfidenceLabel {
  // "Profiles with release_state = announced | showcased are Low."
  if (scope.release_state === "announced" || scope.release_state === "showcased") {
    return "Low";
  }

  const allExact = dimensions.every((d) => d.dimension_result_kind === "exact");
  const high = dimensions.filter((d) => d.dimension_confidence === "High").length;
  const medium = dimensions.filter((d) => d.dimension_confidence === "Medium").length;

  if (
    allExact &&
    high >= 6 &&
    high + medium === dimensions.length &&
    scope.global_scope_state === "sound" &&
    scope.profile_stability_state === "stable" &&
    scope.release_state === "released" &&
    scope.evaluation_maturity !== "pre_release"
  ) {
    return "High";
  }

  const scoreable = dimensions.filter(
    (d) => d.dimension_result_kind !== "insufficient",
  ).length;
  const highOrMedium = high + medium;
  // "no more than two are Low/insufficient" counts a dimension once even when it
  // is both, hence the union rather than the sum.
  const lowOrInsufficient = dimensions.filter(
    (d) => d.dimension_confidence === "Low" || d.dimension_result_kind === "insufficient",
  ).length;

  if (
    scoreable >= 6 &&
    highOrMedium >= 6 &&
    lowOrInsufficient <= 2 &&
    scope.global_scope_state === "sound" &&
    scope.profile_stability_state !== "unknown"
  ) {
    // "Other pre-release profiles and games under active remediation cannot
    // exceed Medium" — Medium is the cap, and this is that branch.
    return "Medium";
  }

  return "Low";
}

/**
 * Protocol §15.2 — `evidence_status` is derived, then stored. The validator
 * recomputes it so a package cannot declare a friendlier status than its own
 * facts support.
 */
export function deriveEvidenceStatus(
  scope: Pick<EvaluationScope, "release_state" | "profile_stability_state">,
  overallConfidence: ConfidenceLabel,
): "verified" | "provisional" | "pre_release" {
  if (scope.release_state !== "released") return "pre_release";
  if (
    scope.profile_stability_state === "actively_changing" ||
    scope.profile_stability_state === "unknown" ||
    overallConfidence === "Low"
  ) {
    return "provisional";
  }
  return "verified";
}

/** The package's recorded shape for a derived dimension, for comparison. */
export function dimensionResultFields(result: DimensionScore): {
  readonly dimension_result_kind: "exact" | "range" | "insufficient";
  readonly exact_value: number | null;
  readonly lower_bound: number | null;
  readonly upper_bound: number | null;
} {
  switch (result.kind) {
    case "exact":
      return {
        dimension_result_kind: "exact",
        exact_value: result.score,
        lower_bound: null,
        upper_bound: null,
      };
    case "range":
      return {
        dimension_result_kind: "range",
        exact_value: null,
        lower_bound: result.low,
        upper_bound: result.high,
      };
    case "insufficient":
      return {
        dimension_result_kind: "insufficient",
        exact_value: null,
        lower_bound: null,
        upper_bound: null,
      };
  }
}
