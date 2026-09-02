import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrast, contrastOn, rgbOf, tokenValue } from "./support/tokens";

const css = readFileSync("app/globals.css", "utf8");

/**
 * What the contract's colours actually measure, and what the type roles do
 * with them.
 *
 * Every number here is computed from the token file, not from the stylesheet.
 * `tests/design-tokens.test.ts` proves the stylesheet transcribes the contract;
 * this proves the contract, as transcribed, meets the accessibility matrix —
 * so a wrong palette fails on both counts rather than agreeing with itself.
 *
 * The alpha border ramp is composited over each surface before measuring,
 * because `rgba(242, 241, 238, 0.42)` is not a colour anything paints. Reading
 * the literal would report a boundary far lighter than the one on screen.
 */

/** Opaque grounds a public surface can sit on. */
const SURFACES = [
  "color.surface.canvas",
  "color.surface.stage",
  "color.surface.chrome",
  "color.surface.panel",
  "color.surface.panelRaised",
] as const;

describe("text on the dark surfaces (matrix X-03)", () => {
  it.each(["primary", "secondary", "muted", "quiet"])(
    "text.%s clears AA on every surface",
    (step) => {
      for (const surface of SURFACES) {
        expect(
          contrastOn(`color.text.${step}`, surface),
          `text.${step} on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it("reads on the warm editorial surface too", () => {
    for (const ink of ["onEditorial", "onEditorialMuted"]) {
      expect(
        contrastOn(`color.text.${ink}`, "color.surface.editorial"),
        `text.${ink} on editorial`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("control boundaries and focus (matrix X-04)", () => {
  /**
   * `border.control` is the minimum normal boundary for a control on the dark
   * ground, and 3:1 is the bar it exists to clear.
   *
   * This is the check the implementation failed: Search used a boundary that
   * measured about 1.35:1 on the panel, which is a hairline for separating
   * reading regions, not a control edge. `border.default` measures ~1.6:1 and
   * is asserted below to be exactly that — too faint for a control — so the
   * two cannot be swapped back without this failing.
   */
  it("border.control clears 3:1 on every surface", () => {
    for (const surface of SURFACES) {
      expect(
        contrastOn("color.border.control", surface),
        `border.control on ${surface}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("border.default is a reading hairline and must not be used as a control edge", () => {
    for (const surface of SURFACES) {
      expect(
        contrastOn("color.border.default", surface),
        `border.default on ${surface}`,
      ).toBeLessThan(3);
    }
  });

  it("border.strong is stronger still", () => {
    for (const surface of SURFACES) {
      expect(
        contrastOn("color.border.strong", surface),
      ).toBeGreaterThan(contrastOn("color.border.control", surface));
    }
  });

  it("the focus indicator is the contract's colour at the contract's width", () => {
    // state.focus aliases the evidence cyan; border.focus is 3px, not the 2px
    // an earlier pass inferred from the specimen.
    expect(tokenValue("color.state.focus")).toBe("{color.brand.evidenceCyan}");
    expect(tokenValue("border.focus")).toBe("0.1875rem");

    for (const surface of SURFACES) {
      expect(
        contrastOn("color.brand.evidenceCyan", surface),
        `focus on ${surface}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("uses the focus width and colour where it is drawn", () => {
    expect(css).toMatch(
      /outline:\s*var\(--border-focus\)\s+solid\s+var\(--color-state-focus\)/,
    );
    // No component may re-declare a thinner ring.
    for (const sheet of [
      "components/search/search.css",
      "components/home/home-opening.css",
      "components/profile/profile.css",
      "components/compare/compare.css",
    ]) {
      const source = readFileSync(sheet, "utf8");
      for (const match of source.matchAll(/outline:\s*([^;]+);/g)) {
        expect(match[1], `${sheet}: ${match[1]}`).toContain("--border-focus");
      }
    }
  });
});

describe("the brand and evidence accents", () => {
  it("both read on every dark surface", () => {
    for (const accent of ["coral", "coralHover", "evidenceCyan"]) {
      for (const surface of SURFACES) {
        expect(
          contrastOn(`color.brand.${accent}`, surface),
          `${accent} on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("neither is legible on the warm editorial surface, so neither may be used there", () => {
    // The negative half matters more than the positive one: an accent that
    // looks right in a dark mock-up is exactly what gets reached for on the
    // light side, where coral measures under 3:1.
    const editorial = rgbOf(tokenValue("color.surface.editorial"));
    for (const accent of ["coral", "evidenceCyan"]) {
      expect(
        contrast(rgbOf(tokenValue(`color.brand.${accent}`)), editorial),
        `${accent} on the editorial surface`,
      ).toBeLessThan(3);
    }
  });

  it("keeps amber to the game and state roles the contract gives it", () => {
    // Amber is Returnal's own colour and the Provisional state marker. It is
    // not a brand value, and `signal` — the old amber brand token — now
    // resolves to the canonical coral for the unmigrated surfaces.
    expect(tokenValue("color.game.returnal.lift")).toBe("#E0B23A");
    expect(tokenValue("color.state.provisional")).toBe("#E0B23A");
    expect(css).toMatch(/--color-signal:\s*var\(--color-brand-coral\)/);
  });
});

describe("the game accents (matrix X-04)", () => {
  /**
   * Game colours identify the two sides of a comparison, and each game has two
   * tints because the page has two grounds (lib/profile/accent.ts). Compare
   * paints a game marker on the warm relationship surface as well as on the
   * dark ones, and the marker is a non-text carrier of identity: 3:1 against
   * its ground is the bar. Lift meets it on every dark surface and misses it
   * on the editorial paper by a wide margin; base is the tint for the paper.
   */
  const GAMES = ["alanWake2", "returnal", "redfall", "fallback"] as const;

  it("lift reads on every dark surface", () => {
    for (const game of GAMES) {
      for (const surface of SURFACES) {
        expect(
          contrastOn(`color.game.${game}.lift`, surface),
          `${game}.lift on ${surface}`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("base reads on the warm editorial surface, where lift does not", () => {
    for (const game of GAMES) {
      expect(
        contrastOn(`color.game.${game}.base`, "color.surface.editorial"),
        `${game}.base on editorial`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrastOn(`color.game.${game}.lift`, "color.surface.editorial"),
        `${game}.lift on editorial`,
      ).toBeLessThan(3);
    }
  });

  it("is the base tint that Compare paints on the relationship surface", () => {
    const compare = readFileSync("components/compare/compare.css", "utf8");
    const rules =
      compare.match(/\.cp-relations \.cp-scale__mark[^{]*\{[^}]*\}/g) ?? [];
    expect(rules).toHaveLength(2);
    expect(rules.join("\n")).toMatch(/--cp-left-base/);
    expect(rules.join("\n")).toMatch(/--cp-right-base/);
    expect(rules.join("\n")).not.toMatch(/var\(--cp-(left|right)\)/);
  });
});

describe("motion (handoff §3.5)", () => {
  it("uses the contract's four durations and standard easing", () => {
    expect(tokenValue("motion.duration.fast")).toBe("150ms");
    expect(tokenValue("motion.duration.standard")).toBe("220ms");
    expect(tokenValue("motion.duration.media")).toBe("320ms");
    expect(tokenValue("motion.duration.reveal")).toBe("600ms");
    expect(css).toContain("--ease-standard: cubic-bezier(0.2, 0, 0, 1);");
  });

  it("declares no duration outside the scale", () => {
    for (const sheet of [
      "app/globals.css",
      "components/search/search.css",
      "components/home/home-opening.css",
      "components/profile/profile.css",
      "components/compare/compare.css",
    ]) {
      const source = readFileSync(sheet, "utf8");
      const literals = [...source.matchAll(/transition:[^;]*?(\d+)ms/g)];
      expect(literals.map((m) => m[0]), sheet).toEqual([]);
    }
  });

  it("strips motion under prefers-reduced-motion", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});

describe("the type system", () => {
  it("sets the visible-text floor at 0.75rem, from the contract", () => {
    expect(tokenValue("font.size.minimum")).toBe("0.75rem");
  });

  it("declares no literal font-size below the floor in any component sheet", () => {
    // The browser-side authority is tests/e2e/type-floor.spec.ts, which
    // measures what was painted. This catches the mistake in the diff.
    const offenders: string[] = [];
    for (const sheet of [
      "components/search/search.css",
      "components/home/home-opening.css",
      "components/profile/profile.css",
      "components/compare/compare.css",
    ]) {
      const source = readFileSync(sheet, "utf8");
      for (const match of source.matchAll(/font-size:\s*([\d.]+)rem/g)) {
        if (Number.parseFloat(match[1]!) < 0.75) offenders.push(`${sheet}: ${match[0]}`);
      }
      for (const match of source.matchAll(/font-size:\s*clamp\(\s*([\d.]+)rem/g)) {
        if (Number.parseFloat(match[1]!) < 0.75) offenders.push(`${sheet}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  /**
   * The condensed all-caps treatment belongs to the WORDMARK alone. Handoff
   * §3.2: display and titles are "restrained weight; no faux cinematic
   * all-caps".
   */
  it("reserves the condensed all-caps treatment for the wordmark", () => {
    const display = css.match(/\.sip-display\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(display).not.toContain("text-transform: uppercase");
    expect(display).not.toContain("font-stretch: 72%");
    expect(display).toContain("var(--font-weight-medium)");

    const wordmark = css.match(/\.sip-wordmark\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(wordmark).toContain("font-stretch: 72%");
    expect(wordmark).toContain("text-transform: uppercase");
  });

  it("gives the evidence kicker its contract tracking", () => {
    // Handoff §3.2: JetBrains Mono, uppercase, 0.14em, 12px minimum.
    const note = css.match(/\.sip-note\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(note).toContain("var(--font-evidence)");
    expect(note).toContain("var(--text-minimum)");
    expect(note).toContain("var(--tracking-kicker)");
    expect(note).toContain("text-transform: uppercase");
  });

  it("carries the contract's three families and no fourth", () => {
    const families = [...css.matchAll(/@font-face\s*\{[^}]*font-family:\s*"([^"]+)"/g)]
      .map((match) => match[1]);
    expect(new Set(families)).toEqual(
      new Set(["Archivo", "Newsreader", "JetBrains Mono"]),
    );
  });

  /**
   * The production stylesheet may not reach into `public/fonts/design-lab/`.
   * Handoff §11: "never reference a design-lab route or generated Fable file
   * at runtime."
   */
  it("loads every production face from the production font directory", () => {
    const sources = [...css.matchAll(/src:\s*url\("([^"]+)"\)/g)].map(
      (match) => match[1],
    );
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source, `${source} must not come from the design lab`).not.toContain(
        "design-lab",
      );
      expect(source).toMatch(/^\/fonts\/[^/]+\.woff2$/);
    }
  });
});

describe("the compatibility layer stays legible while it lasts", () => {
  /** Legacy values still painted by the profile, methodology and admin pages. */
  function legacy(name: string): number[] {
    const value = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
    if (!value) throw new Error(`Missing legacy --color-${name}`);
    return rgbOf(value);
  }

  it("keeps the ink ramp above AA on the old paper grounds", () => {
    for (const ink of ["ink", "ink-soft", "ink-quiet"]) {
      for (const ground of ["page", "page-sunk"]) {
        expect(
          contrast(legacy(ink), legacy(ground)),
          `${ink} on ${ground}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps the bone ramp above AA on the old graphite grounds", () => {
    for (const bone of ["bone", "bone-soft", "bone-quiet"]) {
      for (const ground of ["graphite", "graphite-deep"]) {
        expect(
          contrast(legacy(bone), legacy(ground)),
          `${bone} on ${ground}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps the canonical text ramp legible on the shared graphite chrome", () => {
    // The header and footer are shared between the canonical opening and the
    // unmigrated pages, so canonical text lands on a legacy ground there.
    for (const step of ["primary", "muted", "quiet"]) {
      for (const ground of ["graphite", "graphite-deep"]) {
        expect(
          contrast(rgbOf(tokenValue(`color.text.${step}`)), legacy(ground)),
          `text.${step} on ${ground}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps the coral brand mark legible on the shared graphite chrome", () => {
    for (const ground of ["graphite", "graphite-deep"]) {
      expect(
        contrast(rgbOf(tokenValue("color.brand.coral")), legacy(ground)),
        `coral on ${ground}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
