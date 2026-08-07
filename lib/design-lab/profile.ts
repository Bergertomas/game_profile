import { SEED_PROFILES, alanWake2 } from "@/content";
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

/** Every seeded profile, in seed order. Direction D is rendered with all three. */
export function designLabProfiles(): ProfileView[] {
  return SEED_PROFILES.map(buildProfileView);
}

export function designLabProfileFor(slug: string): ProfileView | null {
  const record = SEED_PROFILES.find((entry) => entry.game.slug === slug);
  return record ? buildProfileView(record) : null;
}

export function designLabSlugs(): string[] {
  return SEED_PROFILES.map((entry) => entry.game.slug);
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

/**
 * Direction D accents — one colour per game, drawn from that game's own visual
 * identity.
 *
 * These are identity, never judgement. The same hue marks the polygon, the
 * reading tick on every score row, citation ordinals and the active state, on a
 * 4.5 game and a 10.0 game alike; nothing in the direction maps colour to
 * quality, and no dimension is ever recoloured by its value.
 *
 * Each value is measured against all three D grounds — #F4F4F2 field, #FFFFFF
 * surface, #EBEBE8 raised — and clears WCAG AA for normal text on every one.
 * Ratios on the worst case (raised): Alan Wake 2 5.54:1, Returnal 7.71:1,
 * Redfall 6.66:1, fallback 7.55:1.
 */
const DIRECTION_D_ACCENTS: Readonly<Record<string, string>> = {
  // The warm red of the Dark Place's lamps and the manuscript pages.
  "alan-wake-2": "#A8341B",
  // Atropos' violet bioluminescence.
  returnal: "#5B2F94",
  // The cold blue of a sun the vampires stopped.
  redfall: "#27547B",
};

/** Neutral slate for any profile without an authored accent. */
export const DIRECTION_D_FALLBACK_ACCENT = "#3F4A57";

export function accentFor(slug: string): string {
  return DIRECTION_D_ACCENTS[slug] ?? DIRECTION_D_FALLBACK_ACCENT;
}

/** The three D0 exploration directions, kept intact as review artifacts. */
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

/**
 * Direction D — the consolidated direction chosen after the A/B/C review.
 * Listed separately because it is not one of the three exploration artifacts:
 * it is what they resolved into.
 */
export const DIRECTION_D = {
  slug: "d",
  letter: "D",
  name: "Editorial Instrument",
  thesis:
    "A premium editorial document that behaves like a precise measurement tool. A's hierarchy, marginalia and index rhythm; B's shared measurement scale, hard alignment and derivation language; C's willingness to let the composition breathe.",
  field: "Light neutral, one game accent",
  type: "Condensed Archivo display + Newsreader prose + Archivo tabular numerals",
} as const;
