/**
 * Third-party game artwork referenced for internal design evaluation.
 *
 * NOTHING HERE IS COMMITTED AS A BINARY. Each entry is a URL on the rights
 * holder's own site or storefront, loaded live by the browser when a design-lab
 * route is rendered in development. The repository stores the address and the
 * rights record, never a copy of the work.
 *
 * Two independent guards keep it out of production:
 *   1. `app/design-lab/layout.tsx` calls `notFound()` in a production build, so
 *      every route under /design-lab returns 404.
 *   2. `evaluationArtFor()` returns null when NODE_ENV is "production", so even
 *      a stray import cannot emit a third-party URL into a production bundle.
 *
 * There is deliberately no `images.remotePatterns` entry, no image proxy and no
 * `next/image` use for these — a production remote-image configuration would
 * outlive the lab and is exactly the kind of leak this file exists to avoid.
 *
 * Rights record: docs/design/d3/ASSET-PROVENANCE.md. None of this artwork is
 * licensed or cleared; it may not appear on a public route.
 */
export interface EvaluationArt {
  /** Remote URL on the rights holder's own site or storefront listing. */
  readonly url: string;
  readonly intrinsicWidth: number;
  readonly intrinsicHeight: number;
  /** Factual description of what the image shows. Not marketing copy. */
  readonly alt: string;
  readonly rightsHolder: string;
  /** Human-visitable page the asset belongs to. */
  readonly sourcePage: string;
  readonly retrieved: string;
  /**
   * Hard-crop framing for the stage, chosen per image so the recognisable
   * subject stays in a shallow band. `object-fit: cover` does the rest — no
   * scaling distortion, no blur, no filter.
   */
  readonly objectPosition: string;
}

const EVALUATION_ART: Readonly<Record<string, EvaluationArt>> = {
  "alan-wake-2": {
    url: "https://www.alanwake.com/wp-content/uploads/2023/05/Alan_Wake_2_keyart_for_web3-2560x1318.webp",
    intrinsicWidth: 2560,
    intrinsicHeight: 1318,
    alt: "Alan Wake 2 key art: Alan Wake stands vast and half-dissolved among red-lit forest, with FBI agent Saga Anderson small and lit at his feet.",
    rightsHolder: "Remedy Entertainment Plc / Epic Games Publishing",
    sourcePage: "https://alanwake.com",
    retrieved: "7 August 2026",
    objectPosition: "center 32%",
  },
  returnal: {
    url: "https://cdn.akamai.steamstatic.com/steam/apps/1649240/library_hero.jpg",
    intrinsicWidth: 1920,
    intrinsicHeight: 620,
    alt: "Returnal key art: astronaut Selene in a scuffed spacesuit and glass helmet, standing before a wall of teal alien pods.",
    rightsHolder: "Housemarque / Sony Interactive Entertainment",
    sourcePage: "https://store.steampowered.com/app/1649240/Returnal/",
    retrieved: "7 August 2026",
    objectPosition: "center 42%",
  },
  redfall: {
    url: "https://cdn.akamai.steamstatic.com/steam/apps/1294810/library_hero.jpg",
    intrinsicWidth: 1920,
    intrinsicHeight: 620,
    alt: "Redfall key art: four armed survivors on a moonlit New England street, a pale vampire lunging into the foreground.",
    rightsHolder: "Arkane Austin / Bethesda Softworks",
    sourcePage: "https://store.steampowered.com/app/1294810/Redfall/",
    retrieved: "7 August 2026",
    objectPosition: "center 38%",
  },
};

/*
 * Deliberately NOT exporting a derived list of URLs or hostnames from here.
 *
 * A module-level `Object.values(EVALUATION_ART)` export was tried and it broke
 * the containment it was meant to help verify: the derived constant kept a live
 * reference to the table, the bundler could no longer treat the table as dead
 * code behind the production guard below, and all three artwork URLs appeared
 * in a client chunk. `scripts/check-build-containment.ts` caught it, which is
 * the check earning its place on its first run.
 *
 * The checker reads this file as text instead, and
 * tests/no-committed-artwork.test.ts asserts its parse matches what the module
 * actually returns, so the two cannot drift apart.
 */

export function evaluationArtFor(slug: string): EvaluationArt | null {
  // Belt and braces. The route already 404s in production; this makes sure the
  // URL itself cannot be emitted from a production build either.
  if (process.env.NODE_ENV === "production") return null;
  return EVALUATION_ART[slug] ?? null;
}

/** Shown on every page that renders evaluation artwork. Not optional. */
export function evaluationNotice(art: EvaluationArt): string {
  return `Key art © ${art.rightsHolder}, loaded live from ${art.sourcePage} for internal design evaluation only. No copy is stored in this repository. Not licensed, not cleared for production.`;
}
