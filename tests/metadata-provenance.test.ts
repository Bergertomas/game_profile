import { describe, expect, it } from "vitest";
import { selectMetadataCandidate } from "@/lib/metadata/provenance";

const primary = {
  value: "2026-10-10",
  sourceKind: "primary_provider" as const,
  sourceId: "igdb:1",
  retrievedAt: "2026-08-25T00:00:00Z",
};
const official = {
  value: "2026-10-12",
  sourceKind: "official" as const,
  sourceId: "publisher:release-page",
  retrievedAt: "2026-08-26T00:00:00Z",
};

describe("Provider-first factual metadata", () => {
  it("uses the primary provider for routine facts", () => {
    expect(
      selectMetadataCandidate([primary, official], "routine"),
    ).toBe(primary);
  });

  it("lets an official source override a critical or disputed fact", () => {
    expect(
      selectMetadataCandidate([primary, official], "critical_or_disputed"),
    ).toBe(official);
  });

  it("preserves an approved manual correction across provider refreshes", () => {
    const correction = {
      value: "2026-10-15",
      sourceKind: "manual_correction" as const,
      sourceId: "editor:correction-4",
      retrievedAt: "2026-08-26T01:00:00Z",
      approved: true,
    };
    expect(
      selectMetadataCandidate(
        [primary, official, correction],
        "critical_or_disputed",
      ),
    ).toBe(correction);
  });

  it("does not treat an unapproved correction as authoritative", () => {
    expect(
      selectMetadataCandidate(
        [primary, { ...official, sourceKind: "manual_correction", approved: false }],
        "routine",
      ),
    ).toBe(primary);
  });

  it("escalates same-priority conflicts instead of averaging or guessing", () => {
    expect(() =>
      selectMetadataCandidate(
        [primary, { ...primary, value: "2027-01-01", sourceId: "igdb:2" }],
        "routine",
      ),
    ).toThrow(/requires editorial review/);
  });
});
