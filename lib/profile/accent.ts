/**
 * One accent colour per game, taken from that game's own visual identity.
 *
 * IDENTITY, NEVER JUDGEMENT. This is the rule the whole colour system rests on:
 * the same hue marks the polygon, the reading tick on every score row and the
 * active state, on a 4.0 dimension and a 10.0 dimension alike. Nothing maps
 * colour to quality, and no dimension is ever recoloured by its value. A game
 * with a small profile is drawn in exactly the grammar of a game with a large
 * one — the shape differs because the game differs, not because one is better.
 *
 * Two tints because the page has two grounds: `lift` for the graphite profile
 * field and the open panel, `base` for the light lower page. Each is measured
 * rather than eyeballed, and every pair clears WCAG AA for normal text on the
 * surfaces it is used on:
 *
 *   lift on graphite #191B1F / panel #14161A · base on page #F1F1EE / trust #E4E4E0
 *     Alan Wake 2  lift 5.96 / 6.26   base 5.85 / 5.19
 *     Returnal     lift 8.70 / 9.14   base 6.30 / 5.60
 *     Redfall      lift 6.08 / 6.38   base 7.03 / 6.24
 *     fallback     lift 7.30 / 7.66   base 8.24 / 7.31
 *
 * tests/accessibility-tokens.test.ts recomputes those ratios from these values,
 * so a new accent cannot be added without meeting the same bar.
 */
export interface ProfileAccent {
  /** For light surfaces: the lower page and the trust band. */
  readonly base: string;
  /** For the graphite profile field and the expanded panel. */
  readonly lift: string;
}

const ACCENTS: Readonly<Record<string, ProfileAccent>> = {
  // The red of the Dark Place's lamps, which is most of the key art.
  "alan-wake-2": { base: "#A8341B", lift: "#EE7454" },
  // The amber of Selene's suit rigging against the teal pod wall.
  returnal: { base: "#6F5400", lift: "#E0B23A" },
  // The moonlit blue the whole Redfall night is lit by.
  redfall: { base: "#27547B", lift: "#5C9EDE" },
};

/**
 * Neutral slate, used by any game without an authored accent.
 *
 * This is the honest default for a catalogue meant to reach hundreds of games:
 * most will not have had a colour chosen by hand, and a page must look
 * deliberate without one. It is a real accent, not a placeholder — nothing
 * about the page reads as unfinished when it is in use.
 */
export const FALLBACK_ACCENT: ProfileAccent = {
  base: "#3F4A57",
  lift: "#9FB3C8",
};

export function accentFor(slug: string): ProfileAccent {
  return ACCENTS[slug] ?? FALLBACK_ACCENT;
}

/** Every authored accent, for the contrast test. */
export const AUTHORED_ACCENTS = ACCENTS;
