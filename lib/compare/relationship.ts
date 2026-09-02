import { formatScore, type DimensionScore } from "@/lib/scoring/derive";

/**
 * How two published values of one dimension relate. Deterministic, interval-
 * aware, and the only place the words Equal / Close / Clear difference /
 * Indeterminate are decided (handoff §10.3; Master Plan §5.4).
 *
 * ── The rule ────────────────────────────────────────────────────────────────
 *
 *   both exact, delta 0        Equal
 *   both exact, delta 0.5      Close
 *   both exact, delta ≥ 1.0    Clear difference, with the higher game named
 *   any Range or Not scored    Indeterminate
 *
 * A Range is an interval and is never collapsed to its midpoint to force a
 * verdict; Not scored has no interval at all. Both are stated in words beside
 * the values, and neither receives a bridge that would imply a certainty the
 * evidence does not support.
 *
 * Confidence is not an input. It changes the caveat copy and the line style
 * around a relation; it never changes which relation this returns, and it
 * never moves a value (handoff §4.1).
 *
 * ── What is deliberately absent ─────────────────────────────────────────────
 *
 * No sum, average, area, percentage, count of wins or ranking of any kind is
 * derived here or anywhere downstream. "Higher on this dimension" is the whole
 * claim, and it is a claim about one dimension.
 */

export type Side = "left" | "right";

export type Relationship =
  | { readonly kind: "equal"; readonly delta: 0 }
  | { readonly kind: "close"; readonly delta: 0.5; readonly higher: Side }
  | { readonly kind: "clear"; readonly delta: number; readonly higher: Side }
  | {
      readonly kind: "indeterminate";
      /** Which state stops a comparison: a Range on either side, or Not scored. */
      readonly reason: "range" | "unknown";
    };

export type RelationshipKind = Relationship["kind"];

export const RELATIONSHIP_LABEL: Readonly<Record<RelationshipKind, string>> = {
  equal: "Equal",
  close: "Close",
  clear: "Clear difference",
  indeterminate: "Indeterminate",
};

export function relate(left: DimensionScore, right: DimensionScore): Relationship {
  if (left.kind === "insufficient" || right.kind === "insufficient") {
    return { kind: "indeterminate", reason: "unknown" };
  }
  if (left.kind === "range" || right.kind === "range") {
    return { kind: "indeterminate", reason: "range" };
  }
  // Scores are half-steps, so the difference is an exact binary fraction and
  // needs no rounding — but the comparison below is written against 0.5 and
  // 1.0 rather than against a float epsilon on purpose: those ARE the rule.
  const delta = Math.abs(left.score - right.score);
  if (delta === 0) return { kind: "equal", delta: 0 };
  const higher: Side = left.score > right.score ? "left" : "right";
  if (delta === 0.5) return { kind: "close", delta: 0.5, higher };
  return { kind: "clear", delta, higher };
}

/** A published value, spoken: "9.5 out of 10", "a range from 6.0 to 8.0", "not scored". */
export function scoreWords(score: DimensionScore): string {
  switch (score.kind) {
    case "exact":
      return `${formatScore(score.score)} out of 10`;
    case "range":
      return `a range from ${formatScore(score.low)} to ${formatScore(score.high)} out of 10`;
    case "insufficient":
      return "not scored";
  }
}

/**
 * The relation as one sentence, naming the direction by game. The sentence is
 * the accessible carrier of the relation; the marker geometry in the row is
 * its picture.
 */
export function describeRelationship(
  relationship: Relationship,
  names: { readonly left: string; readonly right: string },
  scores: { readonly left: DimensionScore; readonly right: DimensionScore },
): string {
  switch (relationship.kind) {
    case "equal":
      return "Equal.";
    case "close":
      return `Close; ${names[relationship.higher]} is higher by 0.5.`;
    case "clear":
      return `Clear difference; ${names[relationship.higher]} is higher by ${formatScore(relationship.delta)}.`;
    case "indeterminate": {
      const sides = (["left", "right"] as const).filter((side) =>
        relationship.reason === "range"
          ? scores[side].kind === "range"
          : scores[side].kind === "insufficient",
      );
      const who = sides.map((side) => names[side]).join(" and ");
      return relationship.reason === "range"
        ? `Indeterminate; ${who} ${sides.length > 1 ? "are" : "is"} published as a range, so no exact difference is claimed.`
        : `Indeterminate; ${who} ${sides.length > 1 ? "are" : "is"} not scored on this dimension.`;
    }
  }
}
