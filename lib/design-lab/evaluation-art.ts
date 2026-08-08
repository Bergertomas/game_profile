/**
 * Evaluation artwork for the design lab.
 *
 * The records themselves moved onto the game fixtures in content/games/, where
 * artwork belongs — it is game metadata, not lab furniture, and a provider will
 * populate it automatically at catalogue scale (lib/profile/artwork.ts).
 *
 * This module is now only the lab's view of that data. It exists so the D3
 * study keeps working unchanged; both it and the product page resolve the same
 * record and honour the same `rights` field.
 */
import { heroArtworkFor, type ProfileArtwork } from "@/lib/profile/artwork";
import { SEED_PROFILES } from "@/content";

export type EvaluationArt = ProfileArtwork & {
  readonly intrinsicWidth: number;
  readonly intrinsicHeight: number;
};

export function evaluationArtFor(slug: string): EvaluationArt | null {
  const record = SEED_PROFILES.find((entry) => entry.game.slug === slug);
  if (!record) return null;
  const art = heroArtworkFor(record.game);
  const hero = record.game.artwork?.hero;
  if (!art || !hero) return null;
  return { ...art, intrinsicWidth: hero.width, intrinsicHeight: hero.height };
}

/** Shown on every lab page that renders evaluation artwork. Not optional. */
export function evaluationNotice(art: EvaluationArt): string {
  return (
    `Key art © ${art.credit}` +
    (art.sourcePage ? `, loaded live from ${art.sourcePage}` : "") +
    `, for internal design evaluation only. No copy is stored in this ` +
    `repository. Not licensed, not cleared for production.`
  );
}
