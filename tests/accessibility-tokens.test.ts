import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");

/**
 * The site palette, checked against the grounds it is actually used on.
 *
 * Two grounds, and a token is only legible on one of them: ink on warm paper,
 * bone on graphite. Getting that pairing wrong is not a subtle regression — it
 * is unreadable text — and it is exactly the kind of thing a redesign does by
 * accident when it moves a colour from one surface to another.
 *
 * lib/profile/accent.ts carries its own contrast proof for the per-game
 * accents, recomputed by the same arithmetic.
 */

function token(name: string): string {
  const value = css.match(
    new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, "i"),
  )?.[1];
  if (!value) throw new Error(`Missing --color-${name}`);
  return value;
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

const PAPER = ["page", "page-sunk"];
const GRAPHITE = ["graphite", "graphite-deep"];

/**
 * The public opening's grounds, added with the cinema surface.
 *
 * Checked as a THIRD ground rather than folded into `GRAPHITE`, because they
 * are a third ground: the bone ramp has to clear AA on all four dark surfaces
 * independently, and a token that only passed on the average of them would be a
 * token that fails on one real screen.
 */
const CINEMA = ["cinema", "cinema-panel"];
const DARK = [...GRAPHITE, ...CINEMA];

describe("site colour tokens", () => {
  it("keeps the whole ink ramp above WCAG AA on both paper grounds", () => {
    for (const ink of ["ink", "ink-soft", "ink-quiet"]) {
      for (const ground of PAPER) {
        expect(
          contrast(token(ink), token(ground)),
          `${ink} on ${ground}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps the whole bone ramp above WCAG AA on every dark ground", () => {
    for (const bone of ["bone", "bone-soft", "bone-quiet"]) {
      for (const ground of DARK) {
        expect(
          contrast(token(bone), token(ground)),
          `${bone} on ${ground}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  /**
   * The brand amber is a graphite-only colour. It measures 7.84:1 there and
   * 1.94:1 on paper, so this asserts both halves — the second is what stops
   * somebody reaching for `text-signal` on the light side because it looks
   * right in a mock-up. `signal-ink` is the paper-ground equivalent.
   */
  it("holds the brand signal to the ground it belongs on", () => {
    for (const ground of DARK) {
      expect(
        contrast(token("signal"), token(ground)),
        `signal on ${ground}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    for (const ground of PAPER) {
      expect(
        contrast(token("signal"), token(ground)),
        `signal must not be used on ${ground}`,
      ).toBeLessThan(3);
      expect(
        contrast(token("signal-ink"), token(ground)),
        `signal-ink on ${ground}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  /**
   * `wayfind` is the second dark-only colour, and it gets the same two-sided
   * proof `signal` does: legible on every dark ground, and demonstrably NOT
   * usable on paper. The negative half is the one that matters — a cyan that
   * looks correct in a dark mock-up is exactly the token somebody reaches for
   * on the light side, where it measures 1.72:1.
   */
  it("holds the wayfinding accent to the dark grounds", () => {
    for (const ground of DARK) {
      expect(
        contrast(token("wayfind"), token(ground)),
        `wayfind on ${ground}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    for (const ground of PAPER) {
      expect(
        contrast(token("wayfind"), token(ground)),
        `wayfind must not be used on ${ground}`,
      ).toBeLessThan(3);
    }
  });

  it("carries one typographic system, not three", () => {
    // Fraunces and Inter were the old system. Two typographic systems in one
    // product was the bug the visual pass existed to fix, so a stray @font-face
    // reintroducing either is a regression, not a variant.
    //
    // JetBrains Mono joined with the public opening and is deliberately a third
    // FACE and not a third system: it sets key caps and fixed measurement cues
    // and nothing else. Listing it here is the decision, so adding a fourth
    // stays a decision too rather than a drive-by @font-face.
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
   * `@font-face` pointing into it would take the public opening's notation
   * voice with it — or, worse, keep an unreviewed lab asset alive in the
   * deployed bundle because one stylesheet still referenced it.
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
