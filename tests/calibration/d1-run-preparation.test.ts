import { describe, expect, it } from "vitest";
import {
  D1_RUN_INPUT,
  assertD1MaturityStillEligible,
  freezeD1EvaluationScope,
} from "@/lib/calibration/run-input";
import { D1_IDENTITY_PROPOSAL } from "@/lib/calibration/run-identity";

describe("Phase 3A D1 run preparation", () => {
  it("freezes the owner-approved Alan Wake 2 base-campaign inputs", () => {
    expect(D1_RUN_INPUT.runKey).toBe("D1");
    expect(D1_RUN_INPUT.scope.canonical_title).toBe("Alan Wake 2");
    expect(D1_RUN_INPUT.scope.scope_key).toBe("alan-wake-2-base-main-campaign");
    expect(D1_RUN_INPUT.scope.evaluation_maturity).toBe("mature");
    expect(D1_RUN_INPUT.scope.release_state).toBe("released");
    expect(D1_RUN_INPUT.scope.known_exclusions).toEqual(["Night Springs", "The Lake House"]);
    expect(Object.isFrozen(D1_RUN_INPUT)).toBe(true);
    expect(Object.isFrozen(D1_RUN_INPUT.scope)).toBe(true);
    expect(Object.isFrozen(D1_RUN_INPUT.scope.known_exclusions)).toBe(true);
  });

  it("materializes a structurally valid canonical evaluationScope only at corpus freeze", () => {
    const scope = freezeD1EvaluationScope("2026-09-04");
    expect(scope.evidence_cutoff).toBe("2026-09-04");
    expect(scope.included_platforms).toEqual(["ps5", "windows", "xbox-series-x-s"]);
    expect(scope.direct_play).toEqual({
      status: "none",
      evaluator: null,
      platform: null,
      build: null,
      started_at: null,
      ended_at: null,
      hours: null,
      covered_segments: [],
    });

    expect(() => freezeD1EvaluationScope("not-a-date")).toThrow(/canonical schema validation/);
  });

  it("fails closed when current-state maturity no longer satisfies the preregistration", () => {
    expect(() => assertD1MaturityStillEligible({
      evaluationMaturity: "newly_released",
      profileStabilityState: "stable",
      materialProfileShapingChangesInFlight: [],
    })).toThrow(/preregistered as mature/);

    expect(() => assertD1MaturityStillEligible({
      evaluationMaturity: "mature",
      profileStabilityState: "actively_changing",
      materialProfileShapingChangesInFlight: [],
    })).toThrow(/not settled enough/);

    expect(() => assertD1MaturityStillEligible({
      evaluationMaturity: "mature",
      profileStabilityState: "bounded_change",
      materialProfileShapingChangesInFlight: ["material transformation"],
    })).toThrow(/profile-shaping change/);
  });

  it("keeps the provider identity strictly proposal-only", () => {
    expect(D1_IDENTITY_PROPOSAL).toMatchObject({
      runKey: "D1",
      canonicalSlug: "alan-wake-2",
      scopeKey: "alan-wake-2-base-main-campaign",
      provider: "igdb",
      igdbGameId: 185246,
      role: "canonical_game",
      state: "proposed",
    });
    expect(Object.isFrozen(D1_IDENTITY_PROPOSAL)).toBe(true);
    expect(D1_IDENTITY_PROPOSAL).not.toHaveProperty("decidedBy");
    expect(D1_IDENTITY_PROPOSAL).not.toHaveProperty("acceptedAt");
  });
});
