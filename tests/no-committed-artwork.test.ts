import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";

/**
 * Regression guard for a leak that actually happened.
 *
 * Evaluation key art was committed under `public/design-lab/evaluation-art/`.
 * The `/design-lab/*` routes correctly returned 404 in production, so the
 * *route* was isolated — but `public/` is copied verbatim into the deployed
 * bundle and served as a static asset, so the file was not. Uncleared
 * third-party artwork was publicly reachable at its own URL while every page
 * that referenced it 404'd.
 *
 * The lesson these tests encode: a route guard is not a file guard.
 *
 * If a design study needs real game media, hold the URL and the rights record
 * — see docs/design/d3/ASSET-PROVENANCE.md — and let the browser fetch it in
 * development. Do not commit the work.
 */

const ROOT = join(__dirname, "..");
const IMAGE = /\.(png|jpe?g|webp|avif|gif|bmp|tiff?|svg)$/i;

/** Fonts are ours to redistribute: SIL OFL, with notices in the directory. */
const ALLOWED_BINARY_DIRS = ["public/fonts"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("committed assets", () => {
  it("serves no image from public/ outside the vendored fonts", () => {
    const offenders = walk(join(ROOT, "public"))
      .map((file) => relative(ROOT, file).replaceAll("\\", "/"))
      .filter((file) => IMAGE.test(file))
      .filter((file) => !ALLOWED_BINARY_DIRS.some((dir) => file.startsWith(dir)));

    // Anything here is served publicly the moment it is deployed, whatever the
    // route guards say.
    expect(offenders).toEqual([]);
  });
});

describe("evaluation artwork", () => {
  it("keeps evaluation-clearance artwork off the public production site", async () => {
    // Second guard behind the route 404: even if a design-lab route were
    // reachable, a production build must not emit a third-party URL. Asserted
    // through the resolvers every surface actually calls, both image roles,
    // rather than through the overlay module alone.
    //
    // Keyed to the SITE environment, not NODE_ENV. A Cloudflare branch preview
    // is compiled exactly like production and must still show the artwork —
    // that is where the design work gets reviewed.
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "production");
    try {
      vi.resetModules();
      const { coverArtworkFor, heroArtworkFor } = await import(
        "@/lib/profile/artwork"
      );
      const { SEED_PROFILES } = await import("@/content");
      for (const { game } of SEED_PROFILES) {
        expect(heroArtworkFor(game), `${game.slug} hero`).toBeNull();
        expect(coverArtworkFor(game), `${game.slug} cover`).toBeNull();
      }
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("resolves both image roles on a review surface", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "preview");
    try {
      vi.resetModules();
      const { coverArtworkFor, heroArtworkFor } = await import(
        "@/lib/profile/artwork"
      );
      const { SEED_PROFILES } = await import("@/content");
      const bySlug = new Map(SEED_PROFILES.map((p) => [p.game.slug, p.game]));

      // Every seeded game has a hero to review the stage against.
      for (const { game } of SEED_PROFILES) {
        expect(heroArtworkFor(game), `${game.slug} hero`).not.toBeNull();
      }

      // Covers are deliberately partial: the card grammar has to survive a
      // game with no portrait art, so one is reviewed in that state on every
      // preview rather than only imagined.
      expect(coverArtworkFor(bySlug.get("returnal")!)).not.toBeNull();
      expect(coverArtworkFor(bySlug.get("redfall")!)).not.toBeNull();
      expect(coverArtworkFor(bySlug.get("alan-wake-2")!)).toBeNull();

      // A hero is never demoted into the cover role, and never the reverse.
      const hero = heroArtworkFor(bySlug.get("alan-wake-2")!)!;
      expect(hero.width).toBeGreaterThan(hero.height);
      const cover = coverArtworkFor(bySlug.get("returnal")!)!;
      expect(cover.height).toBeGreaterThan(cover.width);
      expect(cover.url).not.toBe(heroArtworkFor(bySlug.get("returnal")!)!.url);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("refuses production clearance on an internal-evaluation basis", async () => {
    const { assertClearedBasis } = await import("@/lib/profile/artwork");
    expect(() =>
      assertClearedBasis({
        source: "manual",
        clearance: "production",
        basis: "internal-evaluation",
      }),
    ).toThrow(/internal-evaluation/);
    // Every other combination is a human judgement this code does not police.
    expect(() =>
      assertClearedBasis({
        source: "rawg",
        clearance: "production",
        basis: "provider-terms",
      }),
    ).not.toThrow();
  });

  it("resolves in a preview build, compiled as production or not", async () => {
    // The regression this file now guards in the other direction: gating the
    // artwork on NODE_ENV made D3 invisible on every Cloudflare preview, which
    // is the only place it can be reviewed in a browser.
    for (const nodeEnv of ["development", "production"]) {
      vi.stubEnv("NODE_ENV", nodeEnv);
      vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "preview");
      try {
        vi.resetModules();
        const { evaluationArtworkFor } = await import(
          "@/content/evaluation-artwork"
        );
        for (const slug of ["alan-wake-2", "returnal", "redfall"]) {
          expect(
            evaluationArtworkFor(slug),
            `${slug} @ NODE_ENV=${nodeEnv}`,
          ).not.toBeNull();
        }
      } finally {
        vi.unstubAllEnvs();
        vi.resetModules();
      }
    }
  });

  it("agrees with the shared design-surface policy in both directions", async () => {
    // evaluation-art.ts duplicates DESIGN_SURFACES_ENABLED as a literal member
    // expression because an imported boolean does not fold, and an unfolded
    // guard leaves the whole URL table in the production bundle. The
    // duplication is deliberate; this is what stops it drifting.
    for (const siteEnv of ["production", "preview"]) {
      vi.stubEnv("NEXT_PUBLIC_SITE_ENV", siteEnv);
      try {
        vi.resetModules();
        const { DESIGN_SURFACES_ENABLED } = await import("@/lib/site");
        const { evaluationArtworkFor } = await import(
          "@/content/evaluation-artwork"
        );
        expect(evaluationArtworkFor("alan-wake-2") !== null, siteEnv).toBe(
          DESIGN_SURFACES_ENABLED,
        );
      } finally {
        vi.unstubAllEnvs();
        vi.resetModules();
      }
    }
  });

  it("is fully covered by the build-artifact containment check", async () => {
    // The checker reads the art module as text rather than importing it, so
    // that a derived export cannot keep the URL table alive through
    // tree-shaking. That decoupling is only safe if the parse stays in step
    // with the module — which is what this asserts.
    const { artNeedles } = await import("@/scripts/art-needles");
    const { evaluationArtworkFor } = await import(
      "@/content/evaluation-artwork"
    );

    const needles = new Set(artNeedles());
    expect(needles.size).toBeGreaterThan(0);

    for (const slug of ["alan-wake-2", "returnal", "redfall"]) {
      const artwork = evaluationArtworkFor(slug)!;
      // Both roles, so adding a cover cannot silently escape containment.
      for (const image of [artwork.hero, artwork.cover].filter((i) => !!i)) {
        expect(needles.has(image.url), `${slug} url`).toBe(true);
        expect(
          needles.has(new URL(image.url).hostname),
          `${slug} hostname`,
        ).toBe(true);
      }
    }
  });

  it("is referenced only by URL, never by a repository path", async () => {
    const { evaluationArtworkFor } = await import(
      "@/content/evaluation-artwork"
    );
    for (const slug of ["alan-wake-2", "returnal", "redfall"]) {
      const artwork = evaluationArtworkFor(slug);
      expect(artwork, slug).not.toBeNull();
      // A relative path would mean a copy is being served from this repo.
      expect(artwork!.hero!.url, slug).toMatch(/^https:\/\//);
      expect(artwork!.cover?.url ?? "https://", slug).toMatch(/^https:\/\//);
      expect(artwork!.credit, slug).toBeTruthy();
      expect(artwork!.sourcePage, slug).toMatch(/^https:\/\//);
      // Clearance gates rendering; basis records why, for the humans who have
      // to answer for it. Both are required on every record.
      expect(artwork!.clearance, slug).toBe("evaluation");
      expect(artwork!.basis, slug).toBe("internal-evaluation");
    }
  });
});
