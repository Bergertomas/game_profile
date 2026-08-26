import { describe, expect, it } from "vitest";
import {
  normalizeSearchTerm,
  resolveRegistrySearch,
  type SearchIndexRecord,
} from "@/lib/search/registry";

const RECORDS: readonly SearchIndexRecord[] = [
  {
    registryId: "alan-wake-2",
    canonicalTitle: "Alan Wake 2",
    searchTerms: ["Alan Wake II", "AW2"],
    availability: "published",
    route: "/games/alan-wake-2",
  },
  {
    registryId: "silksong",
    canonicalTitle: "Hollow Knight: Silksong",
    searchTerms: ["Silksong"],
    availability: "unprofiled",
  },
  {
    registryId: "doom-1993",
    canonicalTitle: "Doom",
    disambiguation: "1993 original",
    availability: "published",
    route: "/games/doom-1993",
  },
  {
    registryId: "doom-2016",
    canonicalTitle: "Doom",
    disambiguation: "2016 reboot",
    availability: "unprofiled",
  },
];

describe("Global Search registry states", () => {
  it("resolves canonical titles and approved aliases to a published profile", () => {
    expect(resolveRegistrySearch("AW2", RECORDS)).toMatchObject({
      state: "published",
      record: { route: "/games/alan-wake-2" },
    });
  });

  it("recognizes an unprofiled game without inventing a route", () => {
    expect(resolveRegistrySearch("silksong", RECORDS)).toMatchObject({
      state: "unprofiled",
      record: { registryId: "silksong" },
    });
  });

  it("returns an explicit ambiguous state", () => {
    const result = resolveRegistrySearch("Doom", RECORDS);
    expect(result.state).toBe("ambiguous");
    if (result.state !== "ambiguous") return;
    expect(result.candidates.map((candidate) => candidate.disambiguation)).toEqual(
      ["1993 original", "2016 reboot"],
    );
  });

  it("returns unrecognized rather than a fabricated fuzzy result", () => {
    expect(resolveRegistrySearch("a game that is not here", RECORDS)).toEqual({
      state: "unrecognized",
    });
  });

  it("normalizes punctuation, case and diacritics", () => {
    expect(normalizeSearchTerm("  POKÉMON—Legends  ")).toBe("pokemon legends");
  });

  it("refuses a public route on an unprofiled registry record", () => {
    expect(() =>
      resolveRegistrySearch("No profile", [
        {
          registryId: "no-profile",
          canonicalTitle: "No profile",
          availability: "unprofiled",
          route: "/games/no-profile",
        },
      ]),
    ).toThrow(/cannot have a public route/);
  });
});
