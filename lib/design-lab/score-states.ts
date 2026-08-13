import { alanWake2 } from "@/content";
import type { GameWithEvaluation } from "@/lib/profile/types";

/**
 * The score-state fixture, shared by every direction's state proof.
 *
 * The seeded corpus is fully evidenced and post-release, so it exercises exactly
 * one of the published score states. This forces the others by marking
 * individual subcriteria `unknown` on a copy of the Alan Wake 2 fixture, and
 * spreads Low, Medium and High across the dimension confidences.
 *
 * Extracted so Direction D and D3 prove themselves against the *same* data.
 * A direction that quietly proved itself against an easier fixture would not be
 * a proof of anything.
 *
 * Nothing here is an editorial claim about Alan Wake 2 — it is a rendering
 * fixture, and every page that uses it says so on the page.
 *
 * States covered:
 *   exact        Story 9.5, Thematic, Atmosphere 10.0, Craft, Structure
 *   range        Agency and Pacing — one unknown subcriterion each, so the
 *                total is a genuine 2-point range, not a point value
 *   not scored   Execution — three unknown, so no total may be published
 *   confidence   Low, Medium and High all present and deliberately uncorrelated
 *                with the score: Atmosphere is 10.0 at Low.
 *
 * `evidenceStatus` is pre-release so the pre-release notice and the
 * "Looks promising if…" block headings are exercised rather than assumed.
 */
export function scoreStateFixture(directionName: string): GameWithEvaluation {
  const source = alanWake2.evaluation;

  return {
    game: {
      ...alanWake2.game,
      canonicalTitle: "Score-state proof",
      developerText: "Rendering harness",
      publisherText: "Design lab",
    },
    scope: alanWake2.scope,
    evaluation: {
      ...source,
      evidenceStatus: "pre_release",
      evidenceMaturity: "hands_on",
      // Plan §9.2: a profile carrying an unscored dimension cannot be High.
      confidence: "medium",
      dimensionConfidence: {
        story: "high",
        thematic: "medium",
        atmosphere: "low",
        craft: "high",
        agency: "medium",
        execution: "low",
        structure: "high",
        pacing: "low",
      },
      oneLineExperience: `A rendering fixture, not a game profile. It exists to show how ${directionName} presents a precise score, a published range, a dimension with no publishable total, and Low, Medium and High confidence side by side.`,
      dimensions: {
        ...source.dimensions,
        // One unknown -> published as a 2-point range.
        agency: {
          ...source.dimensions.agency,
          toolset_depth: { value: "unknown", rationale: "" },
        },
        pacing: {
          ...source.dimensions.pacing,
          runtime_justification: { value: "unknown", rationale: "" },
        },
        // Three unknown -> no total published; the polygon breaks at this axis.
        execution: {
          ...source.dimensions.execution,
          gameplay_execution: { value: "unknown", rationale: "" },
          technical_stability: { value: "unknown", rationale: "" },
          consistency: { value: "unknown", rationale: "" },
        },
      },
    },
  };
}
