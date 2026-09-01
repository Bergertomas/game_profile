import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Route } from "next";
import { describe, expect, it } from "vitest";
import { CuratedCompare } from "@/components/home/CuratedCompare";
import { alanWake2, returnal } from "@/content";
import {
  resolveCuratedPairs,
  type CuratedPairConfig,
} from "@/lib/home/curated-compare";
import { buildProfileView } from "@/lib/profile/build";

/**
 * "CHOOSING BETWEEN…", and the line it must not cross.
 *
 * The module is a teaser for a journey that does not exist yet, which makes it
 * the easiest place on the homepage to publish something untrue: a link to a
 * route Slice 4 has not built, a winner implied by ordering, or a pairing
 * nobody approved. All three are asserted against here.
 *
 * The shipped configuration is empty (content/curated-compare.ts), so every
 * fixture below is local and says so.
 */

const CATALOGUE = [alanWake2, returnal].map(buildProfileView);

const PAIR: CuratedPairConfig = {
  id: "fixture-pair",
  left: { slug: alanWake2.game.slug },
  right: { slug: returnal.game.slug },
  tension: "Fixture tension sentence. A real entry names one decision.",
};

const render = (props: Parameters<typeof CuratedCompare>[0]) =>
  renderToStaticMarkup(createElement(CuratedCompare, props));

describe("resolving configured pairs", () => {
  it("keeps left on the left", () => {
    const [pair] = resolveCuratedPairs([PAIR], CATALOGUE);
    expect(pair!.left.game.slug).toBe(alanWake2.game.slug);
    expect(pair!.right.game.slug).toBe(returnal.game.slug);
  });

  it("addresses a named scope rather than assuming the primary one", () => {
    const sibling = buildProfileView({
      ...returnal,
      scope: { ...returnal.scope, key: "wintermute", isPrimary: false },
    });
    const [pair] = resolveCuratedPairs(
      [{ ...PAIR, right: { slug: returnal.game.slug, scope: "wintermute" } }],
      [...CATALOGUE, sibling],
    );
    expect(pair!.right.scope.key).toBe("wintermute");
  });

  it("fails the build on a profile this build does not publish", () => {
    expect(() =>
      resolveCuratedPairs(
        [{ ...PAIR, right: { slug: "never-published" } }],
        CATALOGUE,
      ),
    ).toThrow(/never-published/);
  });

  it("refuses a self-pair — Compare is exactly two different profiles", () => {
    expect(() =>
      resolveCuratedPairs(
        [{ ...PAIR, right: { slug: alanWake2.game.slug } }],
        CATALOGUE,
      ),
    ).toThrow(/pairs a profile with itself/);
  });

  it("refuses an entry with no decision to pose", () => {
    expect(() =>
      resolveCuratedPairs([{ ...PAIR, tension: "   " }], CATALOGUE),
    ).toThrow(/no tension sentence/);
  });

  it("refuses two entries sharing an id", () => {
    expect(() => resolveCuratedPairs([PAIR, { ...PAIR }], CATALOGUE)).toThrow(
      /share the id/,
    );
  });

  it("resolves the shipped configuration, which is empty by decision", async () => {
    const { CURATED_COMPARISONS } = await import("@/content/curated-compare");
    expect(resolveCuratedPairs(CURATED_COMPARISONS, CATALOGUE)).toEqual([]);
  });
});

describe("the module's presentation contract", () => {
  const pairs = resolveCuratedPairs([PAIR], CATALOGUE);

  it("renders nothing at all when nothing is approved", () => {
    // No heading, no empty track, no placeholder pair. A curated module with no
    // curation is not a module.
    expect(render({ pairs: [] })).toBe("");
  });

  it("names both games and links each to its canonical profile", () => {
    const html = render({ pairs });
    expect(html).toContain(alanWake2.game.canonicalTitle);
    expect(html).toContain(returnal.game.canonicalTitle);
    expect(html).toContain(`href="/games/${alanWake2.game.slug}"`);
    expect(html).toContain(`href="/games/${returnal.game.slug}"`);
  });

  it("publishes no route to Compare while Compare does not exist", () => {
    const html = render({ pairs });
    // The two failures available here, both refused: a link to a route Slice 4
    // has not built, and the accepted CTA label printed as inert text, which
    // implies a destination the product does not have.
    expect(html).not.toContain("/compare");
    expect(html).not.toContain("See the full comparison");
    expect(html).toContain("Full Compare is not built yet");
  });

  it("shows the accepted CTA once a route is supplied", () => {
    const html = render({
      pairs,
      compareRouteFor: (pair) =>
        `/compare?games=${pair.left.game.slug},${pair.right.game.slug}` as Route,
    });
    // The accepted label, exactly. The prototype's "artwork-free" wording is
    // obsolete (handoff §2.2) and must never reappear.
    expect(html).toContain("See the full comparison");
    expect(html).not.toContain("artwork-free");
    expect(html).toContain(
      `href="/compare?games=${alanWake2.game.slug},${returnal.game.slug}"`,
    );
    expect(html).not.toContain("Full Compare is not built yet");
  });

  it("states no winner, no aggregate and no match", () => {
    const html = render({ pairs });
    // Scanned over the ENTRY, not the section: the module's own standing note
    // uses "never ranked, and never a winner", which is the disclaimer rather
    // than the claim. What this proves is that the COMPONENT contributes none
    // of this vocabulary around an approved pair — the fixture's own prose is
    // deliberately free of it so any hit here comes from the markup.
    const entry = html
      .slice(html.indexOf("<li"), html.indexOf("</li>"))
      .toLowerCase();
    expect(entry).not.toBe("");
    for (const forbidden of [
      "winner",
      "wins",
      "better",
      "overall score",
      "% match",
      "match score",
      "popular",
      "trending",
      "most compared",
    ]) {
      expect(entry, forbidden).not.toContain(forbidden);
    }
  });

  it("says in its own voice that it ranks nothing", () => {
    expect(render({ pairs })).toContain(
      "Editor-chosen, never ranked, and never a winner.",
    );
  });

  it("gives each side its own written shape, so nothing is said by polygon alone", () => {
    const html = render({ pairs });
    const [pair] = pairs;
    // `&` is escaped in the served markup; the dimension names contain it.
    const escaped = (text: string) => text.replaceAll("&", "&amp;");
    expect(html).toContain(escaped(pair!.left.shapeDescription));
    expect(html).toContain(escaped(pair!.right.shapeDescription));
  });
});
