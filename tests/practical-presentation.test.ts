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

/** The scope of the profile under test; every valid record is bound to it. */
const SCOPE = "fixture:scope";
/** Another scope of the same game — a mode, an edition or a DLC. */
const OTHER_SCOPE = "fixture:scope-dlc";

function commitment(
  estimate: TotalCommitmentRecord["engagedPlay"]["estimate"],
  scopeId: string = SCOPE,
): TotalCommitmentRecord {
  return {
    scopeId,
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
  scopeId: string = SCOPE,
): SessionSuitabilityRecord => ({
  scopeId,
  usefulSessionWindow,
  interruptionFlexibility,
  rationale: "Fixture rationale.",
});

describe("With no approved record", () => {
  it("states nothing rather than a row of Unknowns", () => {
    const facts = describePractical(null, SCOPE);
    expect(facts).toEqual({ commitment: null, session: null, interruption: null });
    expect(hasPracticalFacts(facts)).toBe(false);
    expect(describeCommitment(undefined, SCOPE)).toBeNull();
    expect(describeSession(undefined, SCOPE)).toBeNull();
  });
});

describe("Total commitment", () => {
  it("states the approved band from engaged play, with the hours behind it", () => {
    expect(
      describeCommitment(commitment({ kind: "hours", low: 12, high: 16 }), SCOPE),
    ).toEqual({
      label: "Total commitment",
      value: "Moderate",
      state: "known",
      detail: "Engaged play 12–16 h",
    });
  });

  it("states one adjacent boundary as a combined band", () => {
    expect(
      describeCommitment(commitment({ kind: "hours", low: 8, high: 14 }), SCOPE)!.value,
    ).toBe("Brief to Moderate");
  });

  it("keeps the explicit states explicit", () => {
    expect(describeCommitment(commitment({ kind: "unknown" }), SCOPE)).toEqual({
      label: "Total commitment",
      value: "Unknown",
      state: "unknown",
    });
    expect(describeCommitment(commitment({ kind: "open_ended" }), SCOPE)!.value).toBe(
      "Open-ended",
    );
    expect(describeCommitment(commitment({ kind: "variable" }), SCOPE)!.value).toBe(
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
    expect(() => describeCommitment(bad, SCOPE)).toThrow(/provider and source/);
  });
});

describe("Session suitability", () => {
  it("states the window and the interruption flexibility as two facts", () => {
    expect(describeSession(session("short", "low"), SCOPE)).toEqual({
      session: { label: "Useful session", value: "30–60 minutes", state: "known" },
      interruption: {
        label: "Interruption flexibility",
        value: "Low",
        state: "known",
      },
    });
  });

  it("keeps Unknown as the word Unknown", () => {
    const facts = describeSession(session("unknown", "unknown"), SCOPE)!;
    expect(facts.session).toMatchObject({ value: "Unknown", state: "unknown" });
    expect(facts.interruption).toMatchObject({ value: "Unknown", state: "unknown" });
  });

  it("composes no summary phrase", () => {
    // The public phrase matrix is a provisional decision (Plan §17.2); until it
    // is approved the page states the two facts and nothing derived from them.
    const facts = describePractical(
      {
        commitment: commitment({ kind: "hours", low: 18, high: 24 }),
        session: session("longer", "low"),
      },
      SCOPE,
    );
    const words = JSON.stringify(facts);
    expect(words).not.toMatch(/room to breathe/i);
    expect(words).not.toMatch(/45–90/);
    expect(hasPracticalFacts(facts)).toBe(true);
  });
});

describe("Scope binding", () => {
  // A base game, a mode, an edition and a DLC each have their own scope and
  // their own time. A record renders only on the profile of the scope it is
  // bound to; anything else fails rather than lending its hours to the wrong
  // experience.

  it("renders a commitment record bound to the profile's scope", () => {
    const facts = describePractical(
      { commitment: commitment({ kind: "hours", low: 12, high: 16 }) },
      SCOPE,
    );
    expect(facts.commitment).toMatchObject({ value: "Moderate", state: "known" });
    expect(facts.session).toBeNull();
    expect(hasPracticalFacts(facts)).toBe(true);
  });

  it("refuses a commitment record bound to another scope", () => {
    const mismatched = commitment({ kind: "hours", low: 12, high: 16 }, OTHER_SCOPE);
    expect(() => describeCommitment(mismatched, SCOPE)).toThrow(
      /Total commitment record is bound to scope "fixture:scope-dlc", not to the profile's scope "fixture:scope"/,
    );
    expect(() => describePractical({ commitment: mismatched }, SCOPE)).toThrow(
      /bound to scope "fixture:scope-dlc"/,
    );
  });

  it("renders a session record bound to the profile's scope", () => {
    const facts = describePractical({ session: session("short", "low") }, SCOPE);
    expect(facts.commitment).toBeNull();
    expect(facts.session).toMatchObject({ value: "30–60 minutes", state: "known" });
    expect(facts.interruption).toMatchObject({ value: "Low", state: "known" });
    expect(hasPracticalFacts(facts)).toBe(true);
  });

  it("refuses a session record bound to another scope", () => {
    const mismatched = session("short", "low", OTHER_SCOPE);
    expect(() => describeSession(mismatched, SCOPE)).toThrow(
      /Session suitability record is bound to scope "fixture:scope-dlc", not to the profile's scope "fixture:scope"/,
    );
    expect(() => describePractical({ session: mismatched }, SCOPE)).toThrow(
      /bound to scope "fixture:scope-dlc"/,
    );
  });

  it("refuses the pair when the two records belong to different scopes", () => {
    // Commitment for the profile's scope, session for a sibling: the session
    // is the stranger, and it is named.
    expect(() =>
      describePractical(
        {
          commitment: commitment({ kind: "hours", low: 12, high: 16 }),
          session: session("short", "low", OTHER_SCOPE),
        },
        SCOPE,
      ),
    ).toThrow(/Session suitability record is bound to scope "fixture:scope-dlc"/);
    // And the other way round.
    expect(() =>
      describePractical(
        {
          commitment: commitment({ kind: "hours", low: 12, high: 16 }, OTHER_SCOPE),
          session: session("short", "low"),
        },
        SCOPE,
      ),
    ).toThrow(/Total commitment record is bound to scope "fixture:scope-dlc"/);
    // Both matching: both render.
    const facts = describePractical(
      {
        commitment: commitment({ kind: "hours", low: 12, high: 16 }),
        session: session("short", "low"),
      },
      SCOPE,
    );
    expect(facts.commitment).not.toBeNull();
    expect(facts.session).not.toBeNull();
  });

  it("treats no records as valid and renders nothing, whatever the scope", () => {
    for (const records of [null, undefined, {}, { commitment: null, session: null }]) {
      const facts = describePractical(records, SCOPE);
      expect(facts).toEqual({ commitment: null, session: null, interruption: null });
      expect(hasPracticalFacts(facts)).toBe(false);
    }
  });

  it("cannot be asked to render without the profile's scope", () => {
    expect(() =>
      describeCommitment(commitment({ kind: "hours", low: 1, high: 2 }), ""),
    ).toThrow(/without the profile's scope/);
  });
});
