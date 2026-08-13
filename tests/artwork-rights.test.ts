import { describe, expect, it } from "vitest";
import { SEED_PROFILES, alanWake2 } from "@/content";
import { buildSeedSql } from "@/lib/db/build-seed";
import { validateGameArtwork } from "@/lib/validation/evaluation";
import type { GameArtwork, GameWithEvaluation } from "@/lib/profile/types";

/**
 * Artwork carries its rights record, or it does not exist (ADR 0011).
 *
 * The model half of this was already right: `clearance` decides where an image
 * may render, `basis` records why we hold it. The database was not — `games`
 * held bare `cover_url` and `hero_url` columns, which record that an image is
 * *reachable* and nothing about whether it may be shown. That is the failure
 * mode this whole area exists to prevent, encoded in the schema.
 *
 * These pin the application half. `tests/no-committed-artwork.test.ts` and
 * `npm run check:containment` cover the build-output half.
 */

const CLEARED: GameArtwork = {
  source: "press-kit",
  clearance: "production",
  basis: "press-kit",
  credit: "Some Publisher",
  sourcePage: "https://example.com/press",
  retrieved: "2026-08-07",
  hero: {
    url: "https://example.com/hero.jpg",
    width: 1920,
    height: 1080,
    alt: "Key art.",
  },
};

function withArtwork(artwork: GameArtwork): GameWithEvaluation {
  return { ...alanWake2, game: { ...alanWake2.game, artwork } };
}

describe("Artwork is optional", () => {
  it("accepts a game with no artwork at all", () => {
    // The artless composition is a finished design, not a gap, and it is what
    // production renders today.
    expect(validateGameArtwork(alanWake2)).toEqual([]);
    expect(alanWake2.game.artwork).toBeUndefined();
  });

  it("emits no artwork rows for a corpus that has none", () => {
    expect(buildSeedSql(SEED_PROFILES as GameWithEvaluation[])).not.toContain(
      "INSERT INTO game_artwork",
    );
  });
});

describe("Approved artwork", () => {
  it("is accepted with its clearance, basis, credit and source page", () => {
    expect(validateGameArtwork(withArtwork(CLEARED))).toEqual([]);
  });

  it("seeds with the rights record attached, never as a bare URL", () => {
    const sql = buildSeedSql([withArtwork(CLEARED)]);
    expect(sql).toContain("INSERT INTO game_artwork");
    for (const value of ["'production'", "'press-kit'", "'Some Publisher'"]) {
      expect(sql).toContain(value);
    }
  });

  it("credits the publisher when the record names no other holder", () => {
    const { credit: _dropped, ...withoutCredit } = CLEARED;
    const sql = buildSeedSql([withArtwork(withoutCredit as GameArtwork)]);
    expect(sql).toContain(`'${alanWake2.game.publisherText}'`);
  });
});

describe("What may not reach a game record", () => {
  it("rejects evaluation-clearance artwork on a fixture", () => {
    // Mechanical, not aesthetic: a game fixture is reachable from every
    // production page, so nothing in it can be dead-code-eliminated. An
    // uncleared URL here ships in the production bundle, unrendered but
    // present — which check:containment has already caught once.
    const codes = validateGameArtwork(
      withArtwork({
        ...CLEARED,
        clearance: "evaluation",
        basis: "internal-evaluation",
      }),
    ).map((i) => i.code);
    expect(codes).toContain("uncleared_artwork_on_fixture");
  });

  it("rejects production clearance held on an internal-evaluation basis", () => {
    const codes = validateGameArtwork(
      withArtwork({ ...CLEARED, basis: "internal-evaluation" }),
    ).map((i) => i.code);
    expect(codes).toContain("cleared_artwork_internal_basis");
  });

  it("rejects production artwork with no recorded source page", () => {
    const { sourcePage: _dropped, ...withoutPage } = CLEARED;
    const codes = validateGameArtwork(
      withArtwork(withoutPage as GameArtwork),
    ).map((i) => i.code);
    expect(codes).toContain("artwork_without_source_page");
  });

  it("rejects a non-https artwork URL", () => {
    const codes = validateGameArtwork(
      withArtwork({
        ...CLEARED,
        hero: { ...CLEARED.hero!, url: "http://example.com/hero.jpg" },
      }),
    ).map((i) => i.code);
    expect(codes).toContain("artwork_url_not_https");
  });

  it("rejects artwork with no intrinsic dimensions", () => {
    // Dimensions are how a surface reserves space before the image loads. A
    // zero collapses the layout the artless composition holds open.
    const codes = validateGameArtwork(
      withArtwork({
        ...CLEARED,
        hero: { ...CLEARED.hero!, width: 0, height: 0 },
      }),
    ).map((i) => i.code);
    expect(codes).toContain("artwork_without_dimensions");
  });

  it("refuses to generate a seed carrying uncleared artwork", () => {
    // The rule holds where art would first enter the corpus, not only where a
    // build is later scanned.
    expect(() =>
      buildSeedSql([
        withArtwork({
          ...CLEARED,
          clearance: "evaluation",
          basis: "internal-evaluation",
        }),
      ]),
    ).toThrow(/uncleared_artwork_on_fixture/);
  });
});
