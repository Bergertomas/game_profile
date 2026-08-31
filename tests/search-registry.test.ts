import { describe, expect, it } from "vitest";
import { RECOGNIZED_GAMES } from "@/content/search-registry";
import { SEED_PROFILES } from "@/content";
import { buildProfileView } from "@/lib/profile/build";
import { indexFrom } from "@/lib/search/public-index";
import { announce, resolve } from "@/lib/search/resolve";
import { toRecognizedEntries, type RegisteredGame } from "@/lib/search/registry";

/**
 * The recognised-but-unprofiled registry.
 *
 * Two halves, and both matter. The first asserts what the repository actually
 * ships — nothing — because an empty registry is a deliberate editorial
 * position and not an oversight to be helpfully filled in. The second drives
 * the state from a fixture, so the behaviour is proven without publishing a
 * single fabricated identity.
 */

const profiles = SEED_PROFILES.map(buildProfileView);

describe("what this repository publishes", () => {
  it("ships an empty registry", () => {
    // No approved list of launch identities exists. Adding rows to make the
    // search box feel fuller would publish invented editorial claims about real
    // products, in the one place a visitor is most likely to believe them.
    expect(RECOGNIZED_GAMES).toEqual([]);
  });

  it("therefore answers an unprofiled game with `unrecognized`, not a stub", () => {
    const index = indexFrom(profiles, RECOGNIZED_GAMES);
    expect(index.recognized).toEqual([]);
    expect(resolve(index, "hollow knight silksong").state).toBe("unrecognized");
  });
});

describe("a registry row, when one is approved", () => {
  const rows: RegisteredGame[] = [
    {
      id: "silksong",
      title: "Hollow Knight: Silksong",
      aliases: ["silksong"],
      note: "Recognised, not yet evaluated.",
    },
  ];

  it("becomes a searchable entry with no address", () => {
    const index = indexFrom(profiles, rows);
    const outcome = resolve(index, "silksong");

    expect(outcome.state).toBe("recognized");
    expect(outcome.suggestions).toHaveLength(1);

    const entry = outcome.suggestions[0]!;
    expect(entry.kind).toBe("recognized");
    expect(entry.title).toBe("Hollow Knight: Silksong");
    // The whole point of the state: it is findable and it is not a page.
    expect(entry).not.toHaveProperty("path");
    expect(outcome.exact).toBeNull();
  });

  it("is matched on its aliases as well as its title", () => {
    const index = indexFrom(profiles, rows);
    expect(resolve(index, "hollow knight").state).toBe("recognized");
  });

  it("says something true to a screen reader", () => {
    const index = indexFrom(profiles, rows);
    expect(announce(resolve(index, "silksong"))).toBe(
      "1 recognised game, not yet profiled.",
    );
    expect(announce(resolve(index, "zzzzzzzz"))).toBe("No match.");
  });

  it("disappears once the catalogue profiles that game", () => {
    // A registry row is a claim about our coverage, and the claim expires the
    // moment it stops being true. Showing both rows would have the product
    // contradict itself inside one listbox.
    const stale: RegisteredGame[] = [
      { id: "returnal", title: "Returnal", note: "Recognised, not yet evaluated." },
    ];
    const index = indexFrom(profiles, stale);
    expect(index.recognized).toEqual([]);
    expect(resolve(index, "returnal").state).toBe("published");
  });
});

describe("the registry refuses to ship a malformed row", () => {
  it("rejects a duplicate id", () => {
    expect(() =>
      toRecognizedEntries([
        { id: "same", title: "One", note: "Not yet." },
        { id: "same", title: "Two", note: "Not yet." },
      ]),
    ).toThrow(/duplicate id/i);
  });

  it("rejects a row with no note", () => {
    // The note is the whole of what the product says about a recognised game,
    // because it gets no page to say anything else on.
    expect(() =>
      toRecognizedEntries([{ id: "x", title: "X", note: "  " }]),
    ).toThrow(/no note/i);
  });

  it("rejects a title nothing could ever match", () => {
    expect(() =>
      toRecognizedEntries([{ id: "x", title: "!!!", note: "Not yet." }]),
    ).toThrow(/no searchable title/i);
  });

  it("orders rows deterministically whatever order they were authored in", () => {
    const authored: RegisteredGame[] = [
      { id: "b", title: "Beta", note: "Not yet." },
      { id: "a", title: "Alpha", note: "Not yet." },
    ];
    expect(toRecognizedEntries(authored).map((entry) => entry.id)).toEqual([
      "a",
      "b",
    ]);
  });
});
