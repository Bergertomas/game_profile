import { describe, expect, it } from "vitest";
import {
  commitmentBandForHours,
  deriveCommitmentPresentation,
  validateTotalCommitmentRecord,
  qualifySessionBudget,
} from "@/lib/discovery/time";

describe("Total commitment", () => {
  it("uses the approved inclusive band boundaries", () => {
    expect(commitmentBandForHours(10)).toBe("brief");
    expect(commitmentBandForHours(10.1)).toBe("moderate");
    expect(commitmentBandForHours(25)).toBe("moderate");
    expect(commitmentBandForHours(25.1)).toBe("substantial");
    expect(commitmentBandForHours(50)).toBe("substantial");
    expect(commitmentBandForHours(50.1)).toBe("long");
    expect(commitmentBandForHours(100)).toBe("long");
    expect(commitmentBandForHours(100.1)).toBe("extensive");
  });

  it("uses a combined band only across one adjacent boundary", () => {
    expect(
      deriveCommitmentPresentation({ kind: "hours", low: 8, high: 14 }),
    ).toEqual({ kind: "combined", bands: ["brief", "moderate"] });
    expect(
      deriveCommitmentPresentation({ kind: "hours", low: 8, high: 55 }),
    ).toEqual({ kind: "variable" });
  });

  it("preserves special states and rejects impossible ranges", () => {
    expect(deriveCommitmentPresentation({ kind: "open_ended" })).toEqual({
      kind: "open_ended",
    });
    expect(() =>
      deriveCommitmentPresentation({ kind: "hours", low: 20, high: 10 }),
    ).toThrow(/cannot exceed/);
  });

  it("keeps an approved scope-aware engaged-play record with provenance", () => {
    expect(() =>
      validateTotalCommitmentRecord({
        scopeId: "alan-wake-2:primary",
        engagedPlay: {
          kind: "engaged_play",
          estimate: { kind: "hours", low: 18, high: 24 },
          source: {
            provider: "approved-provider",
            source: "provider-record:1087100",
            externalGameId: "1087100",
            retrievedAt: "2026-08-26T12:00:00Z",
            overrideState: "none",
          },
        },
      }),
    ).not.toThrow();
  });

  it("requires an accountable note for manual or approved overrides", () => {
    expect(() =>
      validateTotalCommitmentRecord({
        scopeId: "alan-wake-2:primary",
        engagedPlay: {
          kind: "engaged_play",
          estimate: { kind: "hours", low: 18, high: 24 },
          source: {
            provider: "manual",
            source: "editorial-research",
            retrievedAt: "2026-08-26T12:00:00Z",
            overrideState: "manual_only",
          },
        },
      }),
    ).toThrow(/override note/);
  });
});

describe("A concrete available-session budget", () => {
  it("is satisfied only when the whole useful window fits", () => {
    expect(qualifySessionBudget("very_short", 30)).toEqual({
      state: "satisfied",
    });
    expect(qualifySessionBudget("short", 60)).toEqual({ state: "satisfied" });
  });

  it("is borderline when the budget lands inside the useful window", () => {
    expect(qualifySessionBudget("short", 45)).toEqual({ state: "borderline" });
    expect(qualifySessionBudget("extended", 180)).toEqual({
      state: "borderline",
    });
  });

  it("fails when the useful window begins above the budget", () => {
    expect(qualifySessionBudget("longer", 30)).toEqual({
      state: "contradicted",
    });
    expect(qualifySessionBudget("extended", 120)).toEqual({
      state: "contradicted",
    });
  });

  it("keeps non-numeric states indeterminate", () => {
    expect(qualifySessionBudget("unknown", 60)).toEqual({
      state: "indeterminate",
      reason: "unknown",
    });
    expect(qualifySessionBudget("variable", 60)).toEqual({
      state: "indeterminate",
      reason: "variable",
    });
  });
});
