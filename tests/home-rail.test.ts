import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PosterRail } from "@/components/home/PosterRail";
import { ProfilePoster } from "@/components/home/ProfilePoster";
import { ProfileRail } from "@/components/home/ProfileRail";
import { alanWake2, returnal } from "@/content";
import { buildProfileView } from "@/lib/profile/build";
import type { GameArtwork, GameWithEvaluation } from "@/lib/profile/types";

/**
 * THE POSTER AND ITS RAIL, as served.
 *
 * What is provable without a browser is the markup contract, and it is the half
 * that carries the accessibility rules: the disclosure's state and target, the
 * absence of a control nested inside a link, art-led/artless parity, and the
 * honest pre-hydration state of the two step controls. The behaviour that needs
 * a real layout — one-viewport steps, disabled ends, native scrolling, Escape
 * returning focus — is proved in tests/e2e/homepage.spec.ts.
 */

const ARTLESS = buildProfileView(alanWake2);

/**
 * An art-led poster, built here rather than borrowed from the corpus.
 *
 * Production clears no artwork (ADR 0011), and the review-only overlay resolves
 * differently per environment — so the one way to assert the art-led branch
 * deterministically is to hand the component a game that carries a cleared
 * record of its own.
 */
const CLEARED: GameArtwork = {
  cover: {
    url: "https://example.invalid/fixture-cover.jpg",
    width: 600,
    height: 800,
    alt: "Fixture cover artwork.",
  },
  source: "fixture",
  clearance: "production",
  basis: "press-kit",
  credit: "Fixture rights holder",
};

const ART_LED = buildProfileView({
  ...returnal,
  game: { ...returnal.game, artwork: CLEARED },
} satisfies GameWithEvaluation);

const poster = (profile: typeof ARTLESS) =>
  renderToStaticMarkup(createElement(ProfilePoster, { profile }));

describe("one poster", () => {
  const html = poster(ARTLESS);

  it("carries exactly one canonical destination for the game", () => {
    expect(html).toContain(`href="/games/${alanWake2.game.slug}"`);
    expect([...html.matchAll(/<a\s/g)]).toHaveLength(1);
  });

  it("keeps the preview control outside the link, not inside it", () => {
    // A card whose whole surface is a link cannot also hold a button: the
    // stretched hit area swallows it and the accessibility tree gets a link
    // containing a control. The anchor must therefore close before the button.
    expect(html.indexOf("</a>")).toBeLessThan(html.indexOf("<button"));
    // A button reached without first passing a closing </a> is a nested one.
    expect(html).not.toMatch(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<button/);
  });

  it("names an element that exists while the preview is closed", () => {
    const controls = /aria-controls="([^"]+)"/.exec(html)?.[1];
    expect(controls).toBeTruthy();
    expect(html).toContain(`id="${controls}"`);
    expect(html).toContain('aria-expanded="false"');
    // Hidden with the attribute, so the IDREF never dangles.
    expect(html).toMatch(new RegExp(`id="${controls}"[^>]*hidden`));
  });

  it("gives the control a name that says which game it belongs to", () => {
    expect(html).toContain(`of ${alanWake2.game.canonicalTitle}`);
  });

  it("previews only fields the published evaluation already carries", () => {
    expect(html).toContain(alanWake2.evaluation.oneLineExperience);
    expect(html).toContain(alanWake2.evaluation.primaryPull);
    expect(html).toContain(alanWake2.evaluation.primaryRisk);
  });

  it("makes no practical-time or storefront claim", () => {
    // Practical time is not a ninth dimension (ADR 0027) and there is no
    // approved commitment record behind a poster. Absent, not guessed.
    const text = html.toLowerCase();
    for (const forbidden of [
      "hours",
      "minutes",
      "how long",
      "commitment",
      "session length",
      "buy",
      "store",
      "steam",
      "£",
      "$",
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }
  });

  it("states its shape in words as well as drawing it", () => {
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain(
      ARTLESS.shapeDescription.replaceAll("&", "&amp;"),
    );
  });

  it("is a complete composition without artwork", () => {
    expect(html).toContain("sip-poster__sleeve");
    expect(html).toContain("is-artless");
    expect(html).not.toContain("<img");
    // No apology, no placeholder glyph, no empty frame.
    expect(html.toLowerCase()).not.toContain("no image");
    expect(html.toLowerCase()).not.toContain("unavailable");
  });

  it("is the same composition with artwork, with the picture in the frame", () => {
    const art = poster(ART_LED);
    expect(art).toContain('src="https://example.invalid/fixture-cover.jpg"');
    // Empty alt, by contract: the plate names the game, so the picture stays
    // outside the accessibility tree (handoff §4.2) — and an empty-alt image
    // that fails to load paints no broken-image glyph over the territory.
    expect(art).toContain('alt=""');
    // Identical structure either way: same plate, same one link, same control.
    expect(art).toContain("sip-poster__plate");
    expect([...art.matchAll(/<a\s/g)]).toHaveLength(1);
    expect(art).toContain('aria-expanded="false"');
  });

  it("keeps the authored sleeve under the artwork, not instead of it", () => {
    const art = poster(ART_LED);
    // `cleared`, `loading`, `failed` and `absent` all resolve to the same
    // authored composition (handoff §4.2). An image that is slow, blocked or
    // gone leaves the game's own identity showing rather than an empty black
    // rectangle, and that costs one always-rendered decorative span.
    expect(art).toContain("sip-poster__sleeve");
    expect(art.indexOf("sip-poster__sleeve")).toBeLessThan(art.indexOf("<img"));
    // The art-led poster is still not marked artless.
    expect(art).not.toContain("is-artless");
  });
});

describe("the rail around them", () => {
  const html = renderToStaticMarkup(
    createElement(PosterRail, {
      heading: "Start somewhere interesting",
      note: "All published Game Profiles, in catalogue order.",
    }),
  );

  it("is a list under a heading that names it", () => {
    expect(html).toContain("<ul");
    expect(html).toContain("Start somewhere interesting");
    expect(html).toContain("aria-labelledby");
  });

  it("names both step controls after the rail they step through", () => {
    expect(html).toContain("Previous posters in Start somewhere interesting");
    expect(html).toContain("Next posters in Start somewhere interesting");
  });

  it("serves both controls disabled, which is the honest state before measurement", () => {
    expect([...html.matchAll(/<button[^>]*disabled/g)]).toHaveLength(2);
  });

  it("takes an explicit heading id so #catalogue keeps resolving", () => {
    const anchored = renderToStaticMarkup(
      createElement(PosterRail, {
        heading: "Start somewhere interesting",
        headingId: "catalogue",
        note: "Note.",
      }),
    );
    expect(anchored).toContain('id="catalogue"');
  });
});

describe("a rail with nothing in it", () => {
  it("renders nothing at all — no heading over an empty track", () => {
    expect(
      renderToStaticMarkup(
        createElement(ProfileRail, {
          heading: "Empty",
          note: "Nothing here.",
          profiles: [],
        }),
      ),
    ).toBe("");
  });
});
