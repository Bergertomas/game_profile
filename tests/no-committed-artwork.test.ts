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
  it("resolves to nothing in a production build", async () => {
    // Second guard behind the route 404: even if a design-lab route were
    // reachable, a production build must not emit a third-party URL.
    // vi.stubEnv is used because process.env.NODE_ENV is not reconfigurable.
    vi.stubEnv("NODE_ENV", "production");
    try {
      vi.resetModules();
      const { evaluationArtFor } = await import(
        "@/lib/design-lab/evaluation-art"
      );
      for (const slug of ["alan-wake-2", "returnal", "redfall"]) {
        expect(evaluationArtFor(slug), slug).toBeNull();
      }
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("is referenced only by URL, never by a repository path", async () => {
    const { evaluationArtFor } = await import(
      "@/lib/design-lab/evaluation-art"
    );
    for (const slug of ["alan-wake-2", "returnal", "redfall"]) {
      const art = evaluationArtFor(slug);
      expect(art, slug).not.toBeNull();
      // A relative path would mean a copy is being served from this repo.
      expect(art!.url, slug).toMatch(/^https:\/\//);
      expect(art!.rightsHolder, slug).toBeTruthy();
      expect(art!.sourcePage, slug).toMatch(/^https:\/\//);
    }
  });
});
