import { evaluationArtworkFor } from "@/content/evaluation-artwork";
import { DESIGN_SURFACES_ENABLED } from "@/lib/site";
import type { Game, GameArtwork, GameImage } from "@/lib/profile/types";

/**
 * Artwork resolution for the public site.
 *
 * ARTWORK IS METADATA, NOT CURATION. At a few hundred games and growing,
 * hand-picking every image is not a workflow, so the model assumes a provider
 * supplies art automatically and a human only intervenes when a specific image
 * is wrong. Nothing in the product knows or cares which provider that is: a
 * surface asks for a cover or a hero, gets one or doesn't, and composes either
 * way.
 *
 * Two image roles, because they are two different jobs:
 *
 *   cover — standardised portrait art. Cards, listings, search results,
 *           related games: anywhere a game has to be recognisable small.
 *   hero  — landscape promotional art. The stage on the profile page.
 *
 * A cover is never substituted for a missing hero, and a hero is never
 * substituted for a missing cover. Cropping 3:4 box art into a 21:9 stage
 * produces the stretched, subject-clipped banner this design exists to avoid,
 * and a bad image is worse than none — both artless compositions are finished
 * work, not holes (ADR 0011).
 *
 * ── Clearance is data, and it decides where an image may render ─────────────
 *
 * The rendering layer is not copyright counsel, so it does not model rights.
 * It models the one question it actually has to answer:
 *
 *   May this asset appear on the public production site?
 *
 *   production — yes, everywhere, production included.
 *   evaluation — internal review only: local development and Cloudflare
 *                previews, never production.
 *
 * *Why* an asset is cleared — a licence, a provider's API terms, a press-kit
 * grant, direct permission — is recorded separately in `basis`, for the humans
 * who have to answer for it. No rendering code reads it, because "licensed" is
 * a claim the application is in no position to make on a publisher's behalf.
 *
 * A game moves from uncleared to cleared by changing one field, with no code
 * change and no window in which the uncleared image could reach production.
 * `npm run check:containment` proves the production half against the built
 * artefact rather than trusting this comment.
 */

/** Where an image came from. Free-form so a new provider needs no code change. */
export type ArtworkSource = "manual" | "rawg" | "mobygames" | "press-kit";

/**
 * Whether an asset may render on the public production site. This is an
 * application-level permission, not a legal characterisation.
 */
export type ArtworkClearance = "production" | "evaluation";

/**
 * The production basis an asset is held on. Descriptive and auditable; never
 * read by rendering code, and never asserted in public copy.
 *
 * `internal-evaluation` is the only value that cannot support production
 * clearance, and `assertClearedBasis` enforces exactly that.
 */
export type ArtworkBasis =
  | "licence"
  | "provider-terms"
  | "press-kit"
  | "permission"
  | "internal-evaluation";

export interface ProfileArtwork {
  readonly url: string;
  /** Factual description of what the image shows. Never marketing copy. */
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  /**
   * Hard-crop framing, chosen per image so the recognisable subject stays in a
   * shallow band. `object-fit: cover` does the rest — no scaling distortion,
   * no blur, no filter.
   */
  readonly objectPosition: string;
  /** Rights holder, credited wherever the image renders. */
  readonly credit: string;
  readonly clearance: ArtworkClearance;
  readonly basis: ArtworkBasis;
  readonly source: ArtworkSource;
  /** Human-visitable page the asset belongs to, where one is known. */
  readonly sourcePage?: string;
}

/**
 * Whether an image with this clearance may render in the current build.
 *
 * The whole rule, in one expression. `DESIGN_SURFACES_ENABLED` folds to a
 * literal at build time (lib/site.ts), so a production bundle contains
 * `clearance === "production"` and nothing else.
 */
export function mayRender(clearance: ArtworkClearance): boolean {
  return clearance === "production" || DESIGN_SURFACES_ENABLED;
}

/**
 * The one consistency rule worth encoding: an asset held for internal
 * evaluation only cannot also be cleared for production. Everything else about
 * `basis` is a human judgement this code has no business second-guessing.
 */
export function assertClearedBasis(artwork: GameArtwork): void {
  if (
    artwork.clearance === "production" &&
    artwork.basis === "internal-evaluation"
  ) {
    throw new Error(
      "Artwork cleared for production cannot be held on an internal-evaluation basis.",
    );
  }
}

function toProfileArtwork(
  image: GameImage,
  artwork: GameArtwork,
  game: Game,
  fallbackFocus: string,
): ProfileArtwork | null {
  if (!mayRender(artwork.clearance)) return null;
  assertClearedBasis(artwork);
  return {
    url: image.url,
    alt: image.alt ?? `Key art for ${game.canonicalTitle}.`,
    width: image.width,
    height: image.height,
    objectPosition: image.focus ?? fallbackFocus,
    credit: artwork.credit ?? game.publisherText,
    clearance: artwork.clearance,
    basis: artwork.basis,
    source: artwork.source,
    sourcePage: artwork.sourcePage,
  };
}

/**
 * The landscape stage image, or null when there is none we may show.
 *
 * Used by the profile stage and nowhere else. A portrait cover is never
 * promoted into this role.
 */
export function heroArtworkFor(game: Game): ProfileArtwork | null {
  const artwork = artworkRecordFor(game);
  if (!artwork?.hero) return null;
  return toProfileArtwork(artwork.hero, artwork, game, "center 40%");
}

/**
 * The portrait image, for cards and listings, or null when there is none we
 * may show. A landscape hero is never demoted into this role.
 */
export function coverArtworkFor(game: Game): ProfileArtwork | null {
  const artwork = artworkRecordFor(game);
  if (!artwork?.cover) return null;
  return toProfileArtwork(artwork.cover, artwork, game, "center 50%");
}

/**
 * The artwork record for a game: whatever the game carries, else the
 * review-only overlay, which resolves to nothing in a production build.
 *
 * The game's own record always wins. That is the manual-override path — when a
 * provider returns bad alternate-edition art for one game, it is corrected on
 * that game without touching the sourcing system.
 */
export function artworkRecordFor(game: Game): GameArtwork | null {
  return game.artwork ?? evaluationArtworkFor(game.slug);
}

/**
 * The notice shown wherever evaluation-clearance artwork renders. Not
 * optional: it is what makes the internal-review basis visible on the page
 * carrying it.
 *
 * Production-cleared artwork gets a plain credit instead. The page states who
 * owns the image and stops there — it does not publish a claim about the terms
 * we hold it under, because that claim is not the page's to make.
 */
export function rightsNoticeFor(artwork: ProfileArtwork): string | null {
  if (artwork.clearance === "production") return null;
  return (
    `Key art © ${artwork.credit}` +
    (artwork.sourcePage ? `, loaded live from ${artwork.sourcePage}` : "") +
    `, for internal design evaluation only. No copy is stored in this ` +
    `repository. Not cleared for production.`
  );
}

/** The credit line for any artwork, whatever its clearance. */
export function creditLineFor(artwork: ProfileArtwork): string {
  return rightsNoticeFor(artwork) ?? `Key art © ${artwork.credit}.`;
}
