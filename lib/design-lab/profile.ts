import { alanWake2 } from "@/content/games/alan-wake-2";
import { buildProfileView, type ProfileView } from "@/lib/profile/build";
import type { DimensionKey } from "@/lib/rubric";

/**
 * D0 design-lab data adapter.
 *
 * Disposable exploration infrastructure (brief §21). It reads the calibrated
 * Alan Wake 2 fixture and changes nothing: all three directions render the same
 * ProfileView the production page renders, so differences between them are
 * purely compositional.
 */

export function designLabProfile(): ProfileView {
  return buildProfileView(alanWake2);
}

/**
 * Citation ordinals. The brief asks for evidence to read as research apparatus
 * — superscript source IDs, numbered markers, footnotes (§12) — so every source
 * gets a stable 1-based number used identically by all three directions.
 */
export function sourceOrdinals(profile: ProfileView): Map<string, number> {
  return new Map(
    profile.evaluation.sources.map((source, index) => [source.id, index + 1]),
  );
}

export function citationsFor(
  profile: ProfileView,
  dimensionKey: DimensionKey,
): number[] {
  const ordinals = sourceOrdinals(profile);
  const view = profile.dimensions.find((d) => d.dimension.key === dimensionKey);
  return (view?.linkedSources ?? [])
    .map((source) => ordinals.get(source.id))
    .filter((n): n is number => n !== undefined)
    .sort((a, b) => a - b);
}

export function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

/**
 * Per-game accent (brief §7): one restrained colour drawn from the game's own
 * identity. Alan Wake 2 is light-against-dark, so warm amber reading toward red.
 * The accent never signals good/bad and never recolours individual dimensions.
 */
export const ALAN_WAKE_2_ACCENT = {
  ink: "#B4321E",
  warm: "#C8641E",
  amber: "#D69A3C",
} as const;

/** The three D0 directions. */
export const DIRECTIONS = [
  {
    slug: "a",
    letter: "A",
    name: "Editorial Dossier",
    thesis:
      "A researched game file on paper. Asymmetric editorial spread, condensed grotesque against a reading serif, evidence as true marginalia.",
    field: "Warm paper, light",
    type: "System A — condensed grotesque + editorial serif",
  },
  {
    slug: "b",
    letter: "B",
    name: "Scouting Sheet",
    thesis:
      "A measuring instrument. Strict ruled sheet, radar as the primary anchor, mono numerals, everything tabular and scannable at a glance.",
    field: "Cool paper, light",
    type: "System B — characterful grotesque + technical mono",
  },
  {
    slug: "c",
    letter: "C",
    name: "Cinematic Archive",
    thesis:
      "An archival record of a work. Full-bleed authored plate, high-contrast serif display, analysis set as annotations in open dark fields.",
    field: "Ink, dark",
    type: "High-contrast serif display + grotesque support",
  },
] as const;

export type DirectionSlug = (typeof DIRECTIONS)[number]["slug"];
