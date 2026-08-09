import type { GameArtwork } from "@/lib/profile/types";

/**
 * Uncleared game artwork, held for internal design review only.
 *
 * WHY THIS IS NOT ON THE GAME RECORDS. Artwork is game metadata and belongs on
 * the game — that is the model (lib/profile/artwork.ts), and cleared art will
 * live there. Evaluation-clearance art cannot, for a mechanical reason worth
 * stating: a game fixture is reachable from every production page, so nothing
 * inside it can be dead-code-eliminated. Put an uncleared URL there and it
 * ships in the production bundle, unrendered but present. `check:containment`
 * caught exactly that.
 *
 * Here, behind an inline literal the bundler folds, the whole table is
 * droppable — and production output contains no uncleared URL at all, which is
 * the guarantee worth keeping absolute.
 *
 * This is a temporary overlay, not a parallel model. When a provider or a
 * clearance decision supplies real art it goes on the game record as
 * `artwork`, this entry is deleted, and nothing that renders it changes.
 *
 * Alan Wake 2 deliberately carries a hero and no cover. That is not an
 * oversight — it is the mixed state the card grammar has to survive, and
 * keeping it here means the coverless card is reviewed on every preview rather
 * than only imagined.
 */

/**
 * Must stay a literal member expression. An imported boolean is not a literal
 * where the bundler decides whether this table is reachable — see the same note
 * in lib/site.ts, and the two leaks it has now caught.
 */
const DESIGN_SURFACES_ENABLED =
  process.env.NEXT_PUBLIC_SITE_ENV !== "production";

const EVALUATION_ARTWORK: Readonly<Record<string, GameArtwork>> = {
  "alan-wake-2": {
    source: "manual",
    clearance: "evaluation",
    basis: "internal-evaluation",
    credit: "Remedy Entertainment Plc / Epic Games Publishing",
    sourcePage: "https://alanwake.com",
    retrieved: "7 August 2026",
    hero: {
      url: "https://www.alanwake.com/wp-content/uploads/2023/05/Alan_Wake_2_keyart_for_web3-2560x1318.webp",
      width: 2560,
      height: 1318,
      alt: "Alan Wake 2 key art: Alan Wake stands vast and half-dissolved among red-lit forest, with FBI agent Saga Anderson small and lit at his feet.",
      focus: "center 32%",
    },
  },
  returnal: {
    source: "manual",
    clearance: "evaluation",
    basis: "internal-evaluation",
    credit: "Housemarque / Sony Interactive Entertainment",
    sourcePage: "https://store.steampowered.com/app/1649240/Returnal/",
    retrieved: "7 August 2026",
    hero: {
      url: "https://cdn.akamai.steamstatic.com/steam/apps/1649240/library_hero.jpg",
      width: 1920,
      height: 620,
      alt: "Returnal key art: astronaut Selene in a scuffed spacesuit and glass helmet, standing before a wall of teal alien pods.",
      focus: "center 42%",
    },
    cover: {
      url: "https://cdn.akamai.steamstatic.com/steam/apps/1649240/library_600x900.jpg",
      width: 300,
      height: 450,
      alt: "Returnal cover: Selene in a white spacesuit and open helmet holds a pistol at her side, backed by a dark wall of teal alien pods, with the title set across the middle.",
      focus: "center 30%",
    },
  },
  redfall: {
    source: "manual",
    clearance: "evaluation",
    basis: "internal-evaluation",
    credit: "Arkane Austin / Bethesda Softworks",
    sourcePage: "https://store.steampowered.com/app/1294810/Redfall/",
    retrieved: "7 August 2026",
    hero: {
      url: "https://cdn.akamai.steamstatic.com/steam/apps/1294810/library_hero.jpg",
      width: 1920,
      height: 620,
      alt: "Redfall key art: four armed survivors on a moonlit New England street, a pale vampire lunging into the foreground.",
      focus: "center 38%",
    },
    cover: {
      url: "https://cdn.akamai.steamstatic.com/steam/apps/1294810/library_600x900.jpg",
      width: 300,
      height: 450,
      alt: "Redfall cover: the title in red above four armed survivors grouped under a blue moon, with a bald vampire crawling towards the viewer beneath them.",
      focus: "center 42%",
    },
  },
};

export function evaluationArtworkFor(slug: string): GameArtwork | null {
  if (!DESIGN_SURFACES_ENABLED) return null;
  return EVALUATION_ARTWORK[slug] ?? null;
}
