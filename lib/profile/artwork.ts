import { evaluationArtworkFor } from "@/content/evaluation-artwork";
import { DESIGN_SURFACES_ENABLED } from "@/lib/site";
import type { Game, GameArtwork, GameImage } from "@/lib/profile/types";

/**
 * Artwork resolution for the public game page.
 *
 * ARTWORK IS METADATA, NOT CURATION. At a few hundred games and growing,
 * hand-picking every image is not a workflow, so the model assumes a provider
 * supplies art automatically and a human only intervenes when a specific image
 * is wrong. Nothing in the product knows or cares which provider that is: the
 * page asks for a hero, gets one or doesn't, and composes either way.
 *
 * Two image roles, modelled from the start even though only the hero is used
 * today, because retrofitting a second role into forty call sites is exactly
 * the mistake worth avoiding once:
 *
 *   cover — standardised portrait art. Search results, comparison cards,
 *           related games, anywhere a game needs to be recognisable small.
 *   hero  — landscape promotional art. The stage on this page.
 *
 * A cover is never substituted for a missing hero. Cropping 3:4 box art into a
 * 21:9 stage produces the stretched, subject-clipped banner this design exists
 * to avoid, and a bad hero is worse than none — the artless composition is
 * finished work (ADR 0011).
 *
 * ── Rights are data, and they decide where an image may render ──────────────
 *
 * Every artwork record carries the basis on which we hold it. That basis, not
 * the environment and not the provider, is what decides whether an image can
 * appear on the public site:
 *
 *   licensed   — a provider's terms, a press-kit grant or direct permission
 *                cover it. Renders everywhere, production included.
 *   evaluation — held for internal design review only, no licence. Renders
 *                only where design surfaces are enabled: local development and
 *                Cloudflare previews, never production.
 *
 * That means a game can carry uncleared art today and cleared art tomorrow by
 * changing one field, with no code change and no risk of the uncleared image
 * reaching production in between. `npm run check:containment` proves the
 * production half against the built artefact rather than trusting this comment.
 */

/** Where an image came from. Free-form so a new provider needs no code change. */
export type ArtworkSource = "manual" | "rawg" | "mobygames" | "press-kit";

export type ArtworkRights = "licensed" | "evaluation";

export interface ProfileArtwork {
  readonly url: string;
  /** Factual description of what the image shows. Never marketing copy. */
  readonly alt: string;
  /**
   * Hard-crop framing for the stage, chosen per image so the recognisable
   * subject stays in a shallow band. `object-fit: cover` does the rest — no
   * scaling distortion, no blur, no filter.
   */
  readonly objectPosition: string;
  /** Rights holder, rendered wherever the image is. */
  readonly credit: string;
  readonly rights: ArtworkRights;
  readonly source: ArtworkSource;
  /** Human-visitable page the asset belongs to, where one is known. */
  readonly sourcePage?: string;
}

/** Whether an image with this basis may render in the current build. */
export function mayRender(rights: ArtworkRights): boolean {
  return rights === "licensed" || DESIGN_SURFACES_ENABLED;
}

function toProfileArtwork(
  image: GameImage,
  artwork: GameArtwork,
  game: Game,
): ProfileArtwork | null {
  if (!mayRender(artwork.rights)) return null;
  return {
    url: image.url,
    alt: image.alt ?? `Key art for ${game.canonicalTitle}.`,
    objectPosition: image.focus ?? "center 40%",
    credit: artwork.credit ?? game.publisherText,
    rights: artwork.rights,
    source: artwork.source,
    sourcePage: artwork.sourcePage,
  };
}

/**
 * The landscape stage image, or null when there is none we may show.
 *
 * Resolution order is provider record, then manual override — the override
 * wins, because the point of having one is fixing a single game's bad
 * alternate-edition art without touching the sourcing system.
 */
export function heroArtworkFor(game: Game): ProfileArtwork | null {
  const artwork = artworkRecordFor(game);
  if (!artwork?.hero) return null;
  return toProfileArtwork(artwork.hero, artwork, game);
}

/** The portrait image, for cards and listings. Not used on the profile stage. */
export function coverArtworkFor(game: Game): ProfileArtwork | null {
  const artwork = artworkRecordFor(game);
  if (!artwork?.cover) return null;
  return toProfileArtwork(artwork.cover, artwork, game);
}

/**
 * The artwork record for a game: whatever the game carries, else the
 * review-only overlay, which resolves to nothing in a production build.
 *
 * The game's own record always wins. That is the manual-override path — when a
 * provider returns bad alternate-edition art for one game, it is corrected on
 * that game without touching the sourcing system.
 */
function artworkRecordFor(game: Game): GameArtwork | null {
  return game.artwork ?? evaluationArtworkFor(game.slug);
}

/**
 * The notice shown wherever evaluation-basis artwork renders. Not optional:
 * it is what makes the internal-review basis visible on the page carrying it.
 */
export function rightsNoticeFor(artwork: ProfileArtwork): string | null {
  if (artwork.rights === "licensed") return null;
  return (
    `Key art © ${artwork.credit}` +
    (artwork.sourcePage ? `, loaded live from ${artwork.sourcePage}` : "") +
    `, for internal design evaluation only. No copy is stored in this ` +
    `repository. Not licensed, not cleared for production.`
  );
}
