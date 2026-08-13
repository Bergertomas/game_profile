import { describe, expect, it } from "vitest";
import { alanWake2 } from "@/content";
import { profileMetadata } from "@/components/profile/ProfilePage";
import { buildProfileView } from "@/lib/profile/build";
import type { ProfileScope } from "@/lib/profile/types";
import { gameProfileGraph } from "@/lib/seo/structured-data";
import { profilePath, profileUrl, SITE_URL } from "@/lib/site";

/**
 * Canonical addressing for a game's profile scopes (ADR 0016).
 *
 *   /games/<slug>              the primary scope
 *   /games/<slug>/<scope-key>  every sibling scope
 *
 * The rule these tests exist to hold: ONE PROFILE, ONE INDEXABLE ADDRESS. A
 * sibling must not canonicalise back to the game URL — that would tell a
 * crawler Wintermute's evaluation is a duplicate of Survival's — and the
 * primary scope must not be reachable as a second page under its own key.
 */

const primary: ProfileScope = { ...alanWake2.scope, isPrimary: true };
const sibling: ProfileScope = {
  ...alanWake2.scope,
  id: "scp_sibling",
  key: "wintermute",
  label: "Wintermute",
  isPrimary: false,
  displayOrder: 2,
};

const primaryProfile = buildProfileView({ ...alanWake2, scope: primary });
const siblingProfile = buildProfileView({ ...alanWake2, scope: sibling });

describe("Canonical addresses", () => {
  it("gives the primary scope the bare game URL", () => {
    expect(profilePath("alan-wake-2", primary)).toBe("/games/alan-wake-2");
    expect(profileUrl("alan-wake-2", primary)).toBe(
      `${SITE_URL}/games/alan-wake-2`,
    );
  });

  it("gives a sibling scope its own keyed URL", () => {
    expect(profilePath("alan-wake-2", sibling)).toBe(
      "/games/alan-wake-2/wintermute",
    );
    expect(profileUrl("alan-wake-2", sibling)).toBe(
      `${SITE_URL}/games/alan-wake-2/wintermute`,
    );
  });

  it("does not depend on display order", () => {
    // The whole reason primacy is explicit. Reordering a listing must not move
    // a canonical URL.
    const reordered = { ...primary, displayOrder: 99 };
    expect(profilePath("alan-wake-2", reordered)).toBe("/games/alan-wake-2");
  });
});

describe("Page metadata", () => {
  it("canonicalises the primary scope to the game URL", () => {
    expect(profileMetadata(primaryProfile).alternates?.canonical).toBe(
      "/games/alan-wake-2",
    );
  });

  it("canonicalises a sibling to its own URL, never back to the game", () => {
    const canonical = profileMetadata(siblingProfile).alternates?.canonical;
    expect(canonical).toBe("/games/alan-wake-2/wintermute");
    expect(canonical).not.toBe("/games/alan-wake-2");
  });

  it("names the evaluated experience in a sibling's title", () => {
    const title = profileMetadata(siblingProfile).title as {
      absolute: string;
    };
    expect(title.absolute).toContain("Wintermute");
    // The primary page stays the plain question.
    const primaryTitle = profileMetadata(primaryProfile).title as {
      absolute: string;
    };
    expect(primaryTitle.absolute).not.toContain("—");
  });
});

describe("Structured data", () => {
  it("describes the profile at its own URL", () => {
    const graph = gameProfileGraph(siblingProfile) as {
      "@graph": Record<string, unknown>[];
    };
    const webPage = graph["@graph"].find((n) => n["@type"] === "WebPage")!;
    expect(webPage.url).toBe(`${SITE_URL}/games/alan-wake-2/wintermute`);
  });

  it("keeps one shared game identity across a game's scopes", () => {
    // Two scopes are two pages *about the same game*, so the VideoGame node
    // must be one entity, not two competing descriptions of one product.
    const nodeOf = (profile: typeof primaryProfile) => {
      const data = gameProfileGraph(profile) as {
        "@graph": Record<string, unknown>[];
      };
      return data["@graph"].find((n) => n["@type"] === "VideoGame")!;
    };
    expect(nodeOf(siblingProfile)["@id"]).toBe(nodeOf(primaryProfile)["@id"]);
    expect(nodeOf(siblingProfile).url).toBe(`${SITE_URL}/games/alan-wake-2`);
  });

  it("puts a sibling under the game in the breadcrumb", () => {
    const graph = gameProfileGraph(siblingProfile) as {
      "@graph": Record<string, unknown>[];
    };
    const crumbs = graph["@graph"].find(
      (n) => n["@type"] === "BreadcrumbList",
    ) as { itemListElement: { name: string; item: string }[] };
    expect(crumbs.itemListElement.map((c) => c.name)).toEqual([
      "Should I Play?",
      "Alan Wake 2",
      "Wintermute",
    ]);
    expect(crumbs.itemListElement.at(-1)!.item).toBe(
      `${SITE_URL}/games/alan-wake-2/wintermute`,
    );
  });

  it("still publishes no rating of any kind for a sibling", () => {
    const serialised = JSON.stringify(gameProfileGraph(siblingProfile));
    for (const banned of [
      "aggregateRating",
      "AggregateRating",
      "ratingValue",
      "reviewRating",
      "Review",
    ]) {
      expect(serialised).not.toContain(banned);
    }
  });
});
