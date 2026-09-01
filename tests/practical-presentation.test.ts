import { describe, expect, it } from "vitest";
import type {
  SessionSuitabilityRecord,
  TotalCommitmentRecord,
} from "@/lib/discovery/time";
import {
  describeCommitment,
  describePractical,
  describeSession,
  hasPracticalFacts,
} from "@/lib/profile/practical";

/**
 * Practical time on the profile page: approved values, explicit Unknown, or
 * nothing at all. Never a specimen (ADR 0027, ADR 0032, handoff §4.3).
 */

function commitment(
  estimate: TotalCommitmentRecord["engagedPlay"]["estimate"],
): TotalCommitmentRecord {
  return {
    scopeId: "fixture:scope",
    engagedPlay: {
      kind: "engaged_play",
      estimate,
      source: {
        provider: "fixture-provider",
        source: "fixture-record",
        retrievedAt: "2026-08-26T12:00:00Z",
        overrideState: "none",
      },
    },
  };
}

const session = (
  usefulSessionWindow: SessionSuitabilityRecord["usefulSessionWindow"],
  interruptionFlexibility: SessionSuitabilityRecord["interruptionFlexibility"],
): SessionSuitabilityRecord => ({
  scopeId: "fixture:scope",
  usefulSessionWindow,
  interruptionFlexibility,
  rationale: "Fixture rationale.",
});

describe("With no approved record", () => {
  it("states nothing rather than a row of Unknowns", () => {
    const facts = describePractical(null);
    expect(facts).toEqual({ commitment: null, session: null, interruption: null });
    expect(hasPracticalFacts(facts)).toBe(false);
    expect(describeCommitment(undefined)).toBeNull();
    expect(describeSession(undefined)).toBeNull();
  });
});

describe("Total commitment", () => {
  it("states the approved band from engaged play, with the hours behind it", () => {
    expect(
      describeCommitment(commitment({ kind: "hours", low: 12, high: 16 })),
    ).toEqual({
      label: "Total commitment",
      value: "Moderate",
      state: "known",
      detail: "Engaged play 12–16 h",
    });
  });

  it("states one adjacent boundary as a combined band", () => {
    expect(
      describeCommitment(commitment({ kind: "hours", low: 8, high: 14 }))!.value,
    ).toBe("Brief to Moderate");
  });

  it("keeps the explicit states explicit", () => {
    expect(describeCommitment(commitment({ kind: "unknown" }))).toEqual({
      label: "Total commitment",
      value: "Unknown",
      state: "unknown",
    });
    expect(describeCommitment(commitment({ kind: "open_ended" }))!.value).toBe(
      "Open-ended",
    );
    expect(describeCommitment(commitment({ kind: "variable" }))!.value).toBe(
      "Variable",
    );
  });

  it("refuses a record without provenance", () => {
    const bad: TotalCommitmentRecord = {
      ...commitment({ kind: "hours", low: 1, high: 2 }),
      engagedPlay: {
        kind: "engaged_play",
        estimate: { kind: "hours", low: 1, high: 2 },
        source: {
          provider: "",
          source: "",
          retrievedAt: "2026-08-26T12:00:00Z",
          overrideState: "none",
        },
      },
    };
    expect(() => describeCommitment(bad)).toThrow(/provider and source/);
  });
});

describe("Session suitability", () => {
  it("states the window and the interruption flexibility as two facts", () => {
    expect(describeSession(session("short", "low"))).toEqual({
      session: { label: "Useful session", value: "30–60 minutes", state: "known" },
      interruption: {
        label: "Interruption flexibility",
        value: "Low",
        state: "known",
      },
    });
  });

  it("keeps Unknown as the word Unknown", () => {
    const facts = describeSession(session("unknown", "unknown"))!;
    expect(facts.session).toMatchObject({ value: "Unknown", state: "unknown" });
    expect(facts.interruption).toMatchObject({ value: "Unknown", state: "unknown" });
  });

  it("composes no summary phrase", () => {
    // The public phrase matrix is a provisional decision (Plan §17.2); until it
    // is approved the page states the two facts and nothing derived from them.
    const facts = describePractical({
      commitment: commitment({ kind: "hours", low: 18, high: 24 }),
      session: session("longer", "low"),
    });
    const words = JSON.stringify(facts);
    expect(words).not.toMatch(/room to breathe/i);
    expect(words).not.toMatch(/45–90/);
    expect(hasPracticalFacts(facts)).toBe(true);
  });
});
