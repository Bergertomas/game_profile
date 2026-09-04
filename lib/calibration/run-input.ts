import type { EvaluationScope } from "./package-types";

export interface Phase3ADevelopmentRunInput {
  readonly runKey: "D1";
  readonly scope: EvaluationScope;
  readonly maturityReview: {
    readonly reviewDate: string;
    readonly preregisteredMaturity: "mature";
    readonly settlementRationale: string;
    readonly evidenceDepthExpectation: string;
    readonly materialKnownChangesInFlight: readonly string[];
  };
}

export const D1_RUN_INPUT: Phase3ADevelopmentRunInput = Object.freeze({
  runKey: "D1",
  scope: Object.freeze({
    canonical_slug: "alan-wake-2",
    canonical_title: "Alan Wake 2",
    scope_key: "alan-wake-2:base-main-campaign",
    edition: "current patched base game",
    mode: "main campaign",
    included_platforms: Object.freeze(["PlayStation 5", "Windows", "Xbox Series X|S"]),
    build_cutoff: "Current patched base main campaign at the D1 evidence cutoff, including free Anniversary/QoL updates applicable to that campaign.",
    release_state: "released",
    pre_release_playable_basis: null,
    evidence_status: "verified",
    evaluation_maturity: "mature",
    public_release_date: "2023-10-27",
    evidence_cutoff: "Freeze to the timestamp recorded when the D1 research corpus closes; no later evidence may enter the paired scoring inputs.",
    direct_play: Object.freeze({ status: "not_preregistered", scope: null }),
    known_exclusions: Object.freeze(["Night Springs", "The Lake House"]),
    profile_stability_state: "stable",
    global_scope_state: "sound",
  }),
  maturityReview: Object.freeze({
    reviewDate: "2026-09-02",
    preregisteredMaturity: "mature",
    settlementRationale: "Established released base-campaign scope; current-state patching does not create an identified profile-shaping transformation.",
    evidenceDepthExpectation: "Released mature scope; normal AA/AAA evidence target unless the frozen research pass documents a protocol-valid scarcity or complexity reason.",
    materialKnownChangesInFlight: Object.freeze([]),
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
