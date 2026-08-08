import type { Game } from "@/lib/profile/types";

/**
 * Key art for the public game page.
 *
 * This is a rights boundary, not a rendering detail, so it is deliberately
 * narrow: the ONLY artwork the public page will ever render is art carried on
 * the game record itself, which means art we hold a licence or permission for.
 * There is no fallback to a storefront URL, no scraping and no proxy. If the
 * record has no art, the page has no art.
 *
 * The evaluation key art under lib/design-lab/ is a separate thing and stays
 * separate. It is uncleared, it is referenced for internal design review only,
 * and nothing here can reach it — see
 * docs/decisions/0010-design-surfaces-and-site-environment.md and
 * docs/decisions/0011-production-artwork.md.
 *
 * Today no seeded game carries art, so every published page renders the
 * artless treatment. That is the correct current state rather than a gap: the
 * layout was designed so the artless case is a composition in its own right,
 * not a hole where a picture should be.
 */
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
  /** Who owns it. Rendered wherever the artwork is. */
  readonly credit: string;
}

/**
 * Resolve the artwork for a game, or null when there is none to show.
 *
 * `heroUrl` is the wide stage image. `coverUrl` is portrait box art and is
 * deliberately NOT used as a stand-in: cropping a 3:4 cover into a 21:9 stage
 * produces exactly the stretched, subject-clipped banner this design exists to
 * avoid. A game with only a cover renders artless until a hero exists.
 */
export function artworkFor(game: Game): ProfileArtwork | null {
  if (!game.heroUrl) return null;

  return {
    url: game.heroUrl,
    alt: game.heroAlt ?? `Key art for ${game.canonicalTitle}.`,
    objectPosition: game.heroFocus ?? "center 40%",
    credit: game.heroCredit ?? game.publisherText,
  };
}
