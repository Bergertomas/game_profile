import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");

/**
 * The canonical v1 palette, checked against the grounds it is actually used on.
 *
 * A token is only legible on some surfaces, and getting that pairing wrong is
 * not a subtle regression — it is unreadable text, and it is exactly what a
 * palette promotion does by accident when it moves a colour from one system to
 * another. So every ramp is asserted against every ground it can land on, and
 * the two accents are asserted in BOTH directions: legible where they belong,
 * and demonstrably illegible where they do not.
 *
 * lib/profile/accent.ts carries its own contrast proof for the per-game
 * accents, recomputed by the same arithmetic.
 */

/** Resolve a token, following one level of `var()` aliasing. */
function token(name: string): string {
  const raw = css.match(new RegExp(`--color-${name}:\\s*([^;]+);`))?.[1]?.trim();
  if (!raw) throw new Error(`Missing --color-${name}`);
  const alias = raw.match(/^var\(--color-([a-z-]+)\)$/)?.[1];
  if (alias) return token(alias);
  const hex = raw.match(/^#[0-9a-f]{6}$/i)?.[0];
  if (!hex) throw new Error(`--color-${name} is not a hex value: ${raw}`);
  return hex;
}

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

/** The canonical dark surfaces. */
const CANONICAL = ["canvas", "surface", "surface-raised", "surface-sunk"];

/**
 * The provisional reading surface. The game profile and the methodology page
 * have not migrated to the canonical system yet, so their grounds still exist
 * and still have to be legible — a promotion that quietly broke an accepted
 * screen would be a worse outcome than the one it fixed.
 */
const PROVISIONAL_DARK = ["graphite", "graphite-deep"];
const PAPER = ["page", "page-sunk"];
const DARK = [...CANONICAL, ...PROVISIONAL_DARK];

describe("the canonical text ramp", () => {
  it("clears WCAG AA on every canonical surface", () => {
    for (const step of [
      "text-bright",
      "text",
      "text-strong",
      "text-muted",
      "text-quiet",
    ]) {
      for (const ground of CANONICAL) {
        expect(
          contrast(token(step), token(ground)),
          `${step} on ${ground}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("still clears AA on the provisional graphite grounds", () => {
    // The chrome is shared: a header rendered above a paper page and a header
    // rendered above the canonical opening are the same header.
    for (const step of ["text", "text-muted", "text-quiet"]) {
      for (const ground of PROVISIONAL_DARK) {
        expect(
          contrast(token(step), token(ground)),
          `${step} on ${ground}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("the provisional reading surface stays legible", () => {
  it("keeps the ink ramp above AA on both paper grounds", () => {
    for (const ink of ["ink", "ink-soft", "ink-quiet"]) {
      for (const ground of PAPER) {
        expect(
          contrast(token(ink), token(ground)),
          `${ink} on ${ground}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps the bone ramp above AA on the graphite grounds", () => {
    for (const bone of ["bone", "bone-soft", "bone-quiet"]) {
      for (const ground of PROVISIONAL_DARK) {
        expect(
          contrast(token(bone), token(ground)),
          `${bone} on ${ground}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("the two accents", () => {
  /**
   * Coral is the brand and the primary affordance. Like every accent in this
   * product it is a DARK-GROUND colour, so this asserts both halves — the
   * second is what stops somebody reaching for it on the light side because it
   * looked right in a mock-up. `brand-ink` is the paper-ground equivalent.
   */
  it("holds the brand coral to the grounds it belongs on", () => {
    for (const ground of DARK) {
      expect(
        contrast(token("brand"), token(ground)),
        `brand on ${ground}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    for (const ground of PAPER) {
      expect(
        contrast(token("brand"), token(ground)),
        `brand must not be used on ${ground}`,
      ).toBeLessThan(3);
      expect(
        contrast(token("brand-ink"), token(ground)),
        `brand-ink on ${ground}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("holds the evidence cyan to the grounds it belongs on", () => {
    for (const ground of DARK) {
      expect(
        contrast(token("evidence"), token(ground)),
        `evidence on ${ground}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    for (const ground of PAPER) {
      expect(
        contrast(token("evidence"), token(ground)),
        `evidence must not be used on ${ground}`,
      ).toBeLessThan(3);
    }
  });

  /**
   * Amber was the brand and is not any more.
   *
   * `signal` is kept as a name only because the profile and methodology pages
   * still reference it; it now resolves to the canonical coral, so those pages
   * carry the correct brand affordance without this slice repainting them. An
   * amber hex reappearing under this name is the regression to catch.
   */
  it("retargets the old amber brand token to the canonical coral", () => {
    expect(token("signal")).toBe(token("brand"));
    expect(token("signal-ink")).toBe(token("brand-ink"));
    expect(css).not.toMatch(/--color-signal:\s*#/);
  });

  it("keeps amber only as a per-game accent", () => {
    // Returnal's accent is amber because Returnal is amber — that is identity,
    // not branding, and it lives in lib/profile/accent.ts with its own proof.
    expect(css).not.toContain("#e2a33f");
  });
});

describe("the type system", () => {
  it("sets the visible-text floor at 12px", () => {
    // The browser-side proof is tests/e2e/type-floor.spec.ts, which measures
    // what was actually painted. This is the static half: the token that every
    // small role resolves to cannot be below the floor.
    expect(css).toMatch(/--text-micro:\s*0\.75rem/);
  });

  it("declares no size token below the floor", () => {
    const scale = [...css.matchAll(/--text-[a-z-]+:\s*([\d.]+)rem/g)].map(
      (match) => Number.parseFloat(match[1]!),
    );
    expect(scale.length).toBeGreaterThan(0);
    for (const size of scale) {
      expect(size, `${size}rem is below the 0.75rem floor`).toBeGreaterThanOrEqual(
        0.75,
      );
    }
  });

  /**
   * The same floor, in the stylesheets that still carry literal sizes.
   *
   * `globals.css` resolves everything through the scale above, but a component
   * sheet can write `font-size: 0.5625rem` directly — which is exactly how a
   * 9px measurement cue got onto the homepage. The browser check in
   * tests/e2e/type-floor.spec.ts is the authority on what a reader actually
   * gets; this catches the mistake in the diff, before a build exists.
   */
  it("declares no literal font-size below the floor in any component sheet", () => {
    const sheets = [
      "components/search/search.css",
      "components/home/home-opening.css",
    ];
    const offenders: string[] = [];

    for (const sheet of sheets) {
      const source = readFileSync(sheet, "utf8");
      for (const match of source.matchAll(/font-size:\s*([\d.]+)rem/g)) {
        const size = Number.parseFloat(match[1]!);
        if (size < 0.75) offenders.push(`${sheet}: ${size}rem`);
      }
      // A `clamp()` is only as safe as its lower bound, which is the value a
      // 320px viewport actually gets.
      for (const match of source.matchAll(/font-size:\s*clamp\(\s*([\d.]+)rem/g)) {
        const floor = Number.parseFloat(match[1]!);
        if (floor < 0.75) offenders.push(`${sheet}: clamp floor ${floor}rem`);
      }
    }

    expect(offenders).toEqual([]);
  });

  /**
   * The condensed all-caps treatment is the WORDMARK's, and only the
   * wordmark's. Applying it to the display role made every heading in the
   * product shout, which is the "faux-cinematic" language the canonical system
   * replaced with restrained Archivo.
   */
  it("reserves the condensed all-caps treatment for the wordmark", () => {
    const display = css.match(/\.sip-display\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(display).not.toContain("text-transform: uppercase");
    expect(display).not.toContain("font-stretch: 72%");
    expect(display).toContain("font-weight: 500");

    const wordmark = css.match(/\.sip-wordmark\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(wordmark).toContain("font-stretch: 72%");
    expect(wordmark).toContain("text-transform: uppercase");
  });

  it("carries one typographic system, not three", () => {
    // Fraunces and Inter were the old system. JetBrains Mono is a third FACE
    // and not a third system: it sets key caps and fixed measurement cues and
    // nothing else. Listing them here keeps adding a fourth a decision.
    const families = [...css.matchAll(/font-family:\s*"([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(new Set(families)).toEqual(
      new Set(["Archivo", "Newsreader", "JetBrains Mono"]),
    );
  });

  /**
   * The production stylesheet may not reach into `public/fonts/design-lab/`.
   * That directory exists to be deleted with the lab, and a production
   * `@font-face` pointing into it would take the opening's notation voice with
   * it — or keep an unreviewed lab asset alive in the deployed bundle.
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
