import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompareView } from "@/components/compare/CompareView";
import { alanWake2, redfall, returnal, SEED_PROFILES } from "@/content";
import { buildCompareIndex, toCompareProfile, type CompareIndex, type CompareProfile } from "@/lib/compare";
import { composePair } from "@/lib/compare/pair";
import { resolveSelection, type Selection } from "@/lib/compare/selection";
import { scoreStateFixture } from "@/lib/design-lab/score-states";
import { buildProfileView } from "@/lib/profile/build";
import { indexFrom } from "@/lib/search/public-index";

/**
 * THE COMPARE COMPOSITION, as markup (ADR 0034; handoff §10; matrix C-03 to
 * C-10, C-13).
 *
 * What only markup can prove: that the DOM order is the accepted reading
 * order, that both identities are named in words before any picture, that
 * every row states dimension, left value and confidence, right value and
 * confidence, then the relation, that Range and Not scored are words with
 * both endpoints, that the tag map has three named groups, that the art-led
 * and artless states carry identical text, and that nothing anywhere says
 * winner, match or overall.
 */

const views = SEED_PROFILES.map(buildProfileView);
const index = buildCompareIndex(views, indexFrom(views, []));
const aw2 = toCompareProfile(buildProfileView(alanWake2));
const ret = toCompareProfile(buildProfileView(returnal));
const red = toCompareProfile(buildProfileView(redfall));

const artless = (profile: CompareProfile): CompareProfile => ({ ...profile, artwork: null });
const pair = (left: CompareProfile | null, right: CompareProfile | null): Selection => ({
  left,
  right,
  notices: [],
  tokens: { left: left?.slug ?? null, right: right?.slug ?? null, extra: [] },
});

function render(selection: Selection, options: { index?: CompareIndex } = {}): string {
  return renderToStaticMarkup(
    createElement(CompareView, {
      selection,
      index: options.index ?? index,
      onChoose: () => {},
      launcher: createElement("p", { className: "fixture-launcher" }, "Launcher guidance fixture."),
    }),
  );
}

const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const FORBIDDEN = [
  /\bwinner\b/i,
  /\bwins\b/i,
  /\bbetter fit\b/i,
  /\boverall score\b/i,
  /\d+\s*%/,
  /\bmatch (score|percentage)\b/i,
  /\bcompatib/i,
  /\brank(ed|ing)?\b/i,
  /\bpopular\b/i,
];

describe("the complete pair", () => {
  const html = render(pair(artless(aw2), artless(ret)));
  const text = textOf(html);

  it("has one h1 naming both games in order, and reads identity, relations, tags, rows, controls", () => {
    expect([...html.matchAll(/<h1/g)]).toHaveLength(1);
    expect(html).toMatch(/<h1[^>]*>Alan Wake 2<span[^>]*> and <\/span>Returnal<\/h1>/);
    const marks = [
      "cp-stage",
      'cp-identity" data-side="left"',
      'cp-identity" data-side="right"',
      "cp-legend",
      "cp-relations",
      "cp-tags",
      "cp-instrument",
      "cp-controls",
    ];
    const positions = marks.map((mark) => html.indexOf(mark));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions]).toEqual([...positions].sort((a, b) => a - b));
  });

  it("names the left game before the right game, before any relation", () => {
    expect(text.indexOf("Left · Game Profile")).toBeLessThan(text.indexOf("Right · Game Profile"));
    expect(text.indexOf("Right · Game Profile")).toBeLessThan(text.indexOf("Where they differ"));
  });

  it("carries eight rows in canonical order, each reading name, left, right, relation", () => {
    const rows = [...html.matchAll(/<li class="cp-row"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(m[1]!));
    expect(rows).toHaveLength(8);
    expect(rows[0]).toMatch(/^Story & Character Investment/);
    expect(rows[3]).toMatch(/^Medium-Specific Craft/);
    const first = rows[0]!;
    expect(first.indexOf("Alan Wake 2")).toBeLessThan(first.indexOf("Returnal"));
    expect(first.indexOf("Returnal")).toBeLessThan(first.indexOf("Clear difference"));
    expect(first).toContain("Alan Wake 2 : 9.5 out of 10 , High confidence");
    expect(first).toContain("Returnal : 7.5 out of 10 , Medium confidence");
    expect(first).toContain("Clear difference; Alan Wake 2 is higher by 2.0.");
    expect(rows[3]).toContain("Equal.");
    expect(rows[2]).toContain("Close; Alan Wake 2 is higher by 0.5.");
  });

  it("exposes the clearest difference and the exact alignment as facts, with a caveat list", () => {
    expect(text).toContain("Clearest difference Agency & Satisfaction");
    expect(text).toContain("Exact alignment Medium-Specific Craft");
    expect(text).toContain("Read with care");
    // Asymmetric confidence is a caveat, from the record.
    expect(text).toContain("Story & Character Investment: Alan Wake 2 High confidence, Returnal Medium confidence.");
  });

  it("writes the trade-off in dimension names, never a verdict", () => {
    expect(text).toContain("Differences and trade-offs — never a winner.");
    expect(text).toMatch(/Alan Wake 2 is higher on Story & Character Investment/);
    expect(text).toMatch(/Returnal is higher on Agency & Satisfaction/);
    expect(text).toMatch(/they are equal on Medium-Specific Craft and Structure & Focus/);
  });

  it("maps the tags into three named groups by key, with intensities written", () => {
    expect(text.indexOf("Alan Wake 2 only")).toBeLessThan(text.indexOf(" Shared "));
    expect(text.indexOf(" Shared ")).toBeLessThan(text.indexOf("Returnal only"));
    const shared = html.slice(html.indexOf('data-group="shared"'), html.indexOf('data-group="right"'));
    expect(textOf(shared)).toContain("Sustained tension · High");
    expect(textOf(shared)).toContain("Environmental storytelling");
    expect(textOf(shared)).not.toContain("Hub-based");
    const left = html.slice(html.indexOf('data-group="left"'), html.indexOf('data-group="shared"'));
    expect(textOf(left)).toContain("Hub-based");
    expect(textOf(left)).toContain("Performance sensitive · PC only");
    const right = html.slice(html.indexOf('data-group="right"'), html.indexOf("cp-instrument"));
    expect(textOf(right)).toContain("Run-based");
    expect(textOf(right)).toContain("Repetition · High");
  });

  it("names the Replace and Copy-link controls with side and game", () => {
    expect(text).toContain("Replace Alan Wake 2 on the left");
    expect(text).toContain("Replace Returnal on the right");
    expect(text).toContain("Copy link to this comparison");
    expect(text.indexOf("Replace Alan Wake 2 on the left")).toBeGreaterThan(text.indexOf("Details — Pacing"));
  });

  it("links both Game Profiles and publishes no winner, match, percentage or ranking", () => {
    expect(html).toContain('href="/games/alan-wake-2"');
    expect(html).toContain('href="/games/returnal"');
    for (const pattern of FORBIDDEN) {
      // The product's own disclaimers name the things it refuses; strip them
      // so what is scanned is any CLAIM of one.
      const scanned = text
        .replace(/never a winner/g, "")
        .replace(/no winner/g, "")
        .replace(/no overall score/g, "");
      expect(scanned, String(pattern)).not.toMatch(pattern);
    }
  });

  it("marks the radar decorative and gives the legend both identities in words", () => {
    expect(html).toMatch(/<div class="cp-art" aria-hidden="true">/);
    expect(text).toContain("solid outline, square markers");
    expect(text).toContain("dashed outline, round markers");
    expect(text).toContain("A larger shape is not a better game");
  });
});

describe("art-led and artless parity", () => {
  it("carries identical text in identical order, with only the images and credits differing", () => {
    const led = render(pair(aw2, ret));
    const less = render(pair(artless(aw2), artless(ret)));
    expect(led).toMatch(/data-art="both"/);
    expect(less).toMatch(/data-art="none"/);
    expect(led).toContain("<img");
    expect(less).not.toContain("<img");
    const strip = (html: string) =>
      textOf(html.replace(/<p class="cp-credit">[\s\S]*?<\/p>/g, ""));
    expect(strip(led)).toBe(strip(less));
  });

  it("keeps the same identity order and controls with one artwork only", () => {
    for (const [selection, art] of [
      [pair(aw2, artless(ret)), "left"],
      [pair(artless(aw2), ret), "right"],
    ] as const) {
      const html = render(selection);
      expect(html).toMatch(new RegExp(`data-art="${art}"`));
      expect(textOf(html).indexOf("Left · Game Profile")).toBeLessThan(textOf(html).indexOf("Right · Game Profile"));
      expect(textOf(html)).toContain("Replace Alan Wake 2 on the left");
    }
  });

  it("uses empty alt on artwork, because the identity names the game", () => {
    expect(render(pair(aw2, ret))).toMatch(/<img[^>]*alt=""/);
  });
});

describe("the empty and left-only states", () => {
  it("renders the launcher guidance and one primary control when nothing is selected", () => {
    const html = render(pair(null, null));
    expect(html).toContain("fixture-launcher");
    expect(textOf(html)).toContain("Choose the first game");
    expect(textOf(html)).not.toContain("Choose the right game");
    expect(html).not.toContain("cp-stage");
  });

  it("keeps the first selection, opens the right side honestly, and offers both controls", () => {
    const html = render(pair(artless(aw2), null));
    const text = textOf(html);
    expect(html).toMatch(/data-state="left-only"/);
    expect(text).toContain("Alan Wake 2 is on the left.");
    expect(text).toContain("No second game yet.");
    expect(text).toContain("Replace Alan Wake 2 on the left");
    expect(text).toContain("Choose the right game");
    expect(html).not.toContain("cp-instrument");
    expect(html).not.toContain("Copy link");
  });
});

describe("notices", () => {
  it("announces a self-pair once and keeps the left selection", () => {
    const html = render(resolveSelection(index, "alan-wake-2,alan-wake-2"));
    expect(html).toMatch(/<li class="cp-notice" data-kind="self" role="alert">/);
    expect(textOf(html)).toContain("Alan Wake 2 is already on the left.");
    expect(textOf(html)).toContain("Replace Alan Wake 2 on the left");
    expect(textOf(html)).toContain("Choose the right game");
  });

  it("states an unknown identity in words and leaves the other side where it was", () => {
    const html = render(resolveSelection(index, "no-such-game,returnal"));
    expect(textOf(html)).toContain('There is no Game Profile at "no-such-game".');
    // Returnal was named on the right, and there it is: nothing on the left.
    expect(html).not.toMatch(/data-state="pair"/);
  });
});

describe("uncertainty states", () => {
  const left: CompareProfile = {
    ...toCompareProfile(buildProfileView(scoreStateFixture("Compare"))),
    slug: "fixture-left",
    title: "Range fixture",
    artwork: null,
  };
  const html = render(pair(left, artless(ret)));
  const rows = [...html.matchAll(/<li class="cp-row"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(m[1]!));

  it("writes both endpoints of a Range and calls the relation Indeterminate", () => {
    const agency = rows.find((row) => row.startsWith("Agency & Satisfaction"))!;
    expect(agency).toContain("6.0–8.0 out of 10 range , both endpoints published");
    expect(agency).toContain("Indeterminate; Range fixture is published as a range");
    expect(agency).not.toMatch(/7\.0 out of 10/);
  });

  it("writes Not scored, says it is not zero, and calls the relation Indeterminate", () => {
    const execution = rows.find((row) => row.startsWith("Execution & Polish"))!;
    expect(execution).toContain("Not scored — insufficient evidence; no total is published, and this is not zero");
    expect(execution).toContain("Indeterminate; Range fixture is not scored on this dimension.");
  });

  it("gives an Indeterminate row no bridge", () => {
    const agency = html.slice(html.indexOf('data-relation="indeterminate"'));
    const scale = agency.slice(agency.indexOf('class="cp-scale"'), agency.indexOf("</span></span>") + 1);
    expect(scale).not.toContain("cp-scale__bridge");
  });

  it("states a Provisional profile as a caveat and marks its status", () => {
    const html = render(pair(artless(aw2), artless(red)));
    expect(html).toMatch(/data-status="provisional"/);
    expect(textOf(html)).toMatch(/Redfall is Provisional at \w+ overall confidence/);
  });
});

describe("composePair", () => {
  it("refuses a self-pair before composition", () => {
    expect(() => composePair(aw2, aw2)).toThrow(/self-pair/);
  });

  it("picks the largest exact delta as the clearest difference and the first Equal row as the alignment", () => {
    const view = composePair(aw2, ret);
    expect(view.difference?.row.key).toBe("agency");
    expect(view.alignment?.row.key).toBe("craft");
    expect(view.alignment?.label).toBe("Exact alignment");
  });
});
