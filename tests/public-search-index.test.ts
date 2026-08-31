import { describe, expect, it } from "vitest";
import { SEED_PROFILES } from "@/content";
import { multiScopeAdditions } from "@/content/test-corpus";
import { buildProfileView, type ProfileView } from "@/lib/profile/build";
import { indexFrom } from "@/lib/search/public-index";
import { MAX_SUGGESTIONS, resolve, suggest } from "@/lib/search/resolve";
import { profilePath } from "@/lib/site";
import type { PublishedEntry } from "@/lib/search/types";

/**
 * The static public search index, against the real published catalogue.
 *
 * Everything here is driven from the same fixtures the site renders, so a
 * change to the corpus that would break search breaks this first. The registry
 * is passed in per test rather than imported: content/search-registry.ts is
 * deliberately empty, and a suite that could only exercise the states the
 * catalogue happens to be in today would prove nothing about the other two.
 */

const single: ProfileView[] = SEED_PROFILES.map(buildProfileView);
const multi: ProfileView[] = [...SEED_PROFILES, ...multiScopeAdditions()].map(
  buildProfileView,
);

const index = indexFrom(single, []);
const multiIndex = indexFrom(multi, []);

function titles(entries: readonly { title: string }[]): string[] {
  return entries.map((entry) => entry.title);
}

describe("the index is the published catalogue, and nothing else", () => {
  it("carries one entry per published profile, not per game", () => {
    expect(index.published).toHaveLength(single.length);
    expect(multiIndex.published).toHaveLength(multi.length);
    // The two Returnal scopes are two entries with two distinct identities.
    const returnal = multiIndex.published.filter((e) => e.title === "Returnal");
    expect(returnal).toHaveLength(2);
    expect(new Set(returnal.map((e) => e.id)).size).toBe(2);
  });

  it("addresses every entry at the canonical path the site actually serves", () => {
    for (const profile of multi) {
      const entry = multiIndex.published.find(
        (candidate) =>
          candidate.id === `${profile.game.slug}:${profile.scope.key}`,
      );
      expect(entry, `${profile.game.slug}/${profile.scope.key}`).toBeDefined();
      // The same function the page, the sitemap and the canonical tag use. A
      // search result must never invent a URL — a placeholder profile route is
      // the one thing this product must not publish.
      expect(entry!.path).toBe(profilePath(profile.game.slug, profile.scope));
    }
  });

  it("publishes no scores, evidence or interpretation into the client index", () => {
    // The index ships to the browser. It carries identity and address, which is
    // what finding a profile needs; carrying the evaluation would put editorial
    // judgements in a payload nobody reads and would make the catalogue
    // reconstructible from a page that shows none of it.
    const keys = new Set(Object.keys(index.published[0]!));
    expect(keys).toEqual(
      new Set([
        "kind",
        "id",
        "slug",
        "title",
        "scopeLabel",
        "scopeKey",
        "isPrimary",
        "path",
        "developer",
        "year",
        "evidenceStatus",
        "terms",
      ]),
    );
  });

  it("is deterministic — two builds of one corpus agree byte for byte", () => {
    const again = indexFrom([...single].reverse(), []);
    expect(JSON.stringify(again)).toBe(JSON.stringify(index));
  });
});

describe("matching follows the accepted cascade", () => {
  it("finds a profile by its exact title", () => {
    expect(titles(suggest(index, "Returnal"))).toContain("Returnal");
  });

  it("finds a profile by an editorial alias", () => {
    // "AW2" and "Alan Wake II" are authored aliases on the game record.
    expect(titles(suggest(index, "aw2"))).toEqual(["Alan Wake 2"]);
    expect(titles(suggest(index, "alan wake ii"))).toEqual(["Alan Wake 2"]);
  });

  it("finds a profile by its scope label where the label identifies", () => {
    expect(titles(suggest(multiIndex, "tower of sisyphus"))).toEqual([
      "Returnal",
    ]);
  });

  it("ignores case, punctuation and diacritics", () => {
    for (const query of ["ALAN WAKE 2", "alan-wake-2", "Alan  Wake  2"]) {
      expect(titles(suggest(index, query)), query).toEqual(["Alan Wake 2"]);
    }
  });

  it("tolerates a bounded misspelling", () => {
    expect(titles(suggest(index, "retrunal"))).toContain("Returnal");
  });

  it("does not match a query that is merely short", () => {
    // A two-letter query that prefixes nothing must not fall through to edit
    // distance and start offering the catalogue.
    expect(suggest(index, "zz")).toEqual([]);
  });

  it("caps suggestions at seven", () => {
    const many: ProfileView[] = Array.from({ length: 20 }, (_, n) => ({
      ...single[0]!,
      game: {
        ...single[0]!.game,
        slug: `game-${n}`,
        canonicalTitle: `Testable Game ${n}`,
        aliases: [],
      },
    }));
    const wide = indexFrom(many, []);
    expect(suggest(wide, "testable").length).toBe(MAX_SUGGESTIONS);
  });

  it("returns the same rows in the same order every time", () => {
    const once = suggest(index, "re").map((entry) => entry.id);
    const twice = suggest(indexFrom([...single].reverse(), []), "re").map(
      (entry) => entry.id,
    );
    expect(twice).toEqual(once);
  });
});

describe("the four states", () => {
  it("1 · published — an exact, unique identity resolves and may navigate", () => {
    const outcome = resolve(index, "Alan Wake 2");
    expect(outcome.state).toBe("published");
    expect(outcome.exact?.path).toBe("/games/alan-wake-2");
  });

  it("2 · recognized — a registry title with no profile behind it", () => {
    const withRegistry = indexFrom(single, [
      {
        id: "a-recognised-game",
        title: "A Recognised Game",
        note: "Recognised, not yet evaluated.",
      },
    ]);
    const outcome = resolve(withRegistry, "a recognised game");
    expect(outcome.state).toBe("recognized");
    expect(outcome.exact).toBeNull();
    expect(outcome.suggestions).toHaveLength(1);
    // The contract that matters: no address. A recognised game gets no page,
    // no stub and no route.
    expect(outcome.suggestions[0]).not.toHaveProperty("path");
  });

  it("3 · ambiguous — several valid readings, and the product does not choose", () => {
    const outcome = resolve(index, "re");
    expect(outcome.state).toBe("ambiguous");
    expect(titles(outcome.suggestions).sort()).toEqual(["Redfall", "Returnal"]);
    expect(outcome.exact).toBeNull();
  });

  it("3 · ambiguous — two scopes of one game are two valid answers", () => {
    const outcome = resolve(multiIndex, "returna");
    expect(outcome.state).toBe("ambiguous");
    expect(outcome.suggestions).toHaveLength(2);
    expect(outcome.exact).toBeNull();
  });

  it("4 · unrecognized — nothing matched, said plainly", () => {
    const outcome = resolve(index, "a game we have never heard of");
    expect(outcome.state).toBe("unrecognized");
    expect(outcome.suggestions).toEqual([]);
    expect(outcome.exact).toBeNull();
  });

  it("prefers a published profile over a recognised row at the same tier", () => {
    const withRegistry = indexFrom(single, [
      { id: "returnal-adjacent", title: "Returnal Adjacent", note: "Not yet." },
    ]);
    const outcome = resolve(withRegistry, "returnal");
    expect(outcome.suggestions[0]!.kind).toBe("published");
  });

  it("shows ambiguity before it shows the registry", () => {
    const withRegistry = indexFrom(single, [
      { id: "reverie", title: "Reverie", note: "Not yet." },
    ]);
    const outcome = resolve(withRegistry, "re");
    expect(outcome.state).toBe("ambiguous");
    expect(titles(outcome.suggestions)).toContain("Reverie");
  });
});

describe("nothing auto-routes on a guess", () => {
  it("leaves a fuzzy single match unopened", () => {
    // One candidate is not one answer. "retrunal" is very probably Returnal and
    // the product still will not open it: the row is offered, the reader picks.
    const outcome = resolve(index, "retrunal");
    expect(outcome.suggestions.map((e) => e.title)).toContain("Returnal");
    expect(outcome.exact).toBeNull();
  });

  it("leaves a prefix of several profiles unopened", () => {
    expect(resolve(index, "re").exact).toBeNull();
  });

  it("opens a scope only when the query names that scope exactly", () => {
    const sibling = resolve(multiIndex, "returnal tower of sisyphus");
    expect(sibling.exact?.path).toBe("/games/returnal/tower-of-sisyphus");

    // The bare game title is the game's canonical address (ADR 0016), and the
    // profile there carries a switcher to its siblings — so this is the
    // canonical answer rather than a guess between two scopes.
    const primary = resolve(multiIndex, "returnal");
    expect(primary.exact?.path).toBe("/games/returnal");
    expect((primary.exact as PublishedEntry).isPrimary).toBe(true);
  });

  it("refuses to choose when two entries answer the same string exactly", () => {
    const collided = indexFrom(
      [
        single[0]!,
        {
          ...single[1]!,
          game: { ...single[1]!.game, canonicalTitle: single[0]!.game.canonicalTitle },
        },
      ],
      [],
    );
    const outcome = resolve(collided, single[0]!.game.canonicalTitle);
    expect(outcome.exact).toBeNull();
    expect(outcome.state).toBe("ambiguous");
  });
});
