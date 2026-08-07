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

/**
 * D3 accents — the same one-colour-per-game rule, in two tints so the hue can
 * sit on the graphite profile field and on the light lower page at AA.
 *
 * Each is taken from the game's own key art, which is what ties the artwork to
 * the polygon and the active row. Identity, never judgement: Redfall's 4.0–5.5
 * profile is drawn with exactly the same grammar as Alan Wake 2's 9.5s, and no
 * dimension is ever recoloured by its value.
 *
 * Measured: `lift` on graphite #191B1F / panel #14161A, `base` on page #F1F1EE /
 * trust #E4E4E0.
 *   Alan Wake 2  lift 5.96 / 6.26   base 5.85 / 5.19
 *   Returnal     lift 8.70 / 9.14   base 6.30 / 5.60
 *   Redfall      lift 6.08 / 6.38   base 7.03 / 6.24
 */
export interface D3Accent {
  /** For light surfaces. */
  readonly base: string;
  /** For the graphite profile field and the open panel. */
  readonly lift: string;
}

const D3_ACCENTS: Readonly<Record<string, D3Accent>> = {
  // The red of the Dark Place's lamps, which is most of the key art.
  "alan-wake-2": { base: "#A8341B", lift: "#EE7454" },
  // The amber of Selene's suit rigging against the teal pod wall.
  returnal: { base: "#6F5400", lift: "#E0B23A" },
  // The moonlit blue the whole Redfall night is lit by.
  redfall: { base: "#27547B", lift: "#5C9EDE" },
};

const D3_FALLBACK: D3Accent = { base: "#3F4A57", lift: "#9FB3C8" };

export function d3AccentFor(slug: string): D3Accent {
  return D3_ACCENTS[slug] ?? D3_FALLBACK;
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

/**
 * D3 — Game-Led Profile, built on the selected D2-A identity study.
 *
 * Direction D was rejected on identity: it read as an institutional report and
 * the game had no visual presence beyond its title. D3 keeps D's structure,
 * measurement system, uncertainty states and accessibility work, and changes
 * what the page looks like it is about.
 */
export const D3 = {
  slug: "d3",
  letter: "D3",
  name: "Game-Led Profile",
  thesis:
    "The game arrives first, at full width, as real key art; the profile answers it on a graphite field attached directly to the artwork's lower edge, in an accent taken from the artwork itself.",
  field: "Key art, then graphite",
  type: "Archivo throughout; Newsreader for the experience summary and expanded rationale only",
} as const;
