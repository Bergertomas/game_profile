import { describe, expect, it } from "vitest";
import { D1_RUN_INPUT, assertD1MaturityStillEligible } from "@/lib/calibration/run-input";
import { D1_IDENTITY_PROPOSAL } from "@/lib/calibration/run-identity";

describe("Phase 3A D1 run preparation", () => {
  it("freezes the owner-approved Alan Wake 2 base-campaign scope", () => {
    expect(D1_RUN_INPUT.runKey).toBe("D1");
    expect(D1_RUN_INPUT.scope.canonical_title).toBe("Alan Wake 2");
    expect(D1_RUN_INPUT.scope.evaluation_maturity).toBe("mature");
    expect(D1_RUN_INPUT.scope.release_state).toBe("released");
    expect(D1_RUN_INPUT.scope.known_exclusions).toEqual(["Night Springs", "The Lake House"]);
    expect(Object.isFrozen(D1_RUN_INPUT)).toBe(true);
    expect(Object.isFrozen(D1_RUN_INPUT.scope)).toBe(true);
    expect(Object.isFrozen(D1_RUN_INPUT.scope.known_exclusions)).toBe(true);
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
      profileStabilityState: "stable",
      materialProfileShapingChangesInFlight: ["material transformation"],
    })).toThrow(/profile-shaping change/);
  });

  it("keeps the provider identity strictly proposal-only", () => {
    expect(D1_IDENTITY_PROPOSAL).toMatchObject({
      runKey: "D1",
      canonicalSlug: "alan-wake-2",
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
