import type { EvaluationScope } from "./package-types";
import { validatorFor } from "./package-schema";

type PreFreezeEvaluationScope = Omit<EvaluationScope, "evidence_cutoff">;

export interface Phase3ADevelopmentRunInput {
  readonly runKey: "D1";
  readonly scope: PreFreezeEvaluationScope;
  readonly evidenceCutoffRule: string;
  readonly maturityReview: {
    readonly reviewDate: string;
    readonly preregisteredMaturity: "mature";
    readonly settlementRationale: string;
    readonly evidenceDepthExpectation: string;
    readonly materialKnownChangesInFlight: readonly string[];
    readonly currentStateBasis: string;
  };
}

export const D1_RUN_INPUT: Phase3ADevelopmentRunInput = Object.freeze({
  runKey: "D1",
  scope: Object.freeze({
    canonical_slug: "alan-wake-2",
    canonical_title: "Alan Wake 2",
    scope_key: "alan-wake-2-base-main-campaign",
    edition: "current patched base game",
    mode: "main-campaign",
    included_platforms: Object.freeze(["ps5", "windows", "xbox-series-x-s"]),
    build_cutoff: "Current patched base main campaign at the D1 evidence cutoff, including free Anniversary/QoL updates applicable to that campaign.",
    release_state: "released",
    pre_release_playable_basis: null,
    evidence_status: "verified",
    evaluation_maturity: "mature",
    public_release_date: "2023-10-27",
    direct_play: Object.freeze({
      status: "none",
      evaluator: null,
      platform: null,
      build: null,
      started_at: null,
      ended_at: null,
      hours: null,
      covered_segments: Object.freeze([]),
    }),
    known_exclusions: Object.freeze(["Night Springs", "The Lake House"]),
    profile_stability_state: "bounded_change",
    global_scope_state: "sound",
  }),
  evidenceCutoffRule: "Use the UTC calendar date of the deterministic D1 corpus freeze; frozen_at records the precise UTC timestamp (preregistration §7).",
  maturityReview: Object.freeze({
    reviewDate: "2026-09-04",
    preregisteredMaturity: "mature",
    settlementRationale: "Established released base-campaign scope. The latest observed first-party update (1.2.10, 2026-08-18) adds PC graphics support and bounded fixes; no profile-shaping transformation is identified.",
    evidenceDepthExpectation: "Released mature scope; normal AA/AAA evidence target unless the frozen research pass documents a protocol-valid scarcity or complexity reason.",
    materialKnownChangesInFlight: Object.freeze([]),
    currentStateBasis: "https://www.alanwake.com/story/alan-wake-2-update-notes/ — latest update notes observed 2026-09-04; revalidate again immediately before corpus collection.",
  }),
});

export interface D1MaturityRevalidation {
  readonly evaluationMaturity: EvaluationScope["evaluation_maturity"];
  readonly profileStabilityState: EvaluationScope["profile_stability_state"];
  readonly materialProfileShapingChangesInFlight: readonly string[];
}

/** Fail closed before D1 corpus collection if the preregistered mature scope no longer holds. */
export function assertD1MaturityStillEligible(state: D1MaturityRevalidation): void {
  if (state.evaluationMaturity !== "mature") {
    throw new Error("D1 is preregistered as mature; stop before research if current-state revalidation disagrees.");
  }
  if (state.profileStabilityState === "actively_changing" || state.profileStabilityState === "unknown") {
    throw new Error("D1 maturity revalidation is not settled enough to begin research.");
  }
  if (state.materialProfileShapingChangesInFlight.length > 0) {
    throw new Error("D1 has material profile-shaping change in flight; stop before research.");
  }
}

/**
 * Materialize the canonical evaluationScope only when the corpus freeze date is
 * known. The preregistration requires that date to equal frozen_at's UTC calendar
 * date, so inventing it during pre-research preparation would be protocol drift.
 */
export function freezeD1EvaluationScope(evidenceCutoff: string): EvaluationScope {
  const candidate: EvaluationScope = Object.freeze({
    ...D1_RUN_INPUT.scope,
    evidence_cutoff: evidenceCutoff,
  });
  const validate = validatorFor("/$defs/evaluationScope");
  if (!validate(candidate)) {
    const detail = (validate.errors ?? [])
      .map((error) => `${error.instancePath || "<root>"}: ${error.message ?? error.keyword}`)
      .join("; ");
    throw new Error(`D1 evaluation scope failed canonical schema validation: ${detail}`);
  }
  return candidate;
}
