/**
 * Radar layout presets for the profile instrument.
 *
 * ONE INSTRUMENT, THREE LEVELS. There is a single radar implementation in this
 * product (components/profile/radar.tsx); everything below is geometry handed
 * to it. The homepage used to run a second, independently written `MiniRadar`
 * with its own rings, its own stroke weights and its own idea of what a bridged
 * segment looked like — which meant the site had two answers to "what does an
 * unknown axis look like". It has one now.
 *
 * The three levels the handoff names (§9.2):
 *
 *   compact   `MARK` — the homepage fingerprint and the poster mark, label-free;
 *             the surface around it states the values.
 *   profile   `PROFILE` — the full instrument on the profile page. The SVG
 *             carries the geometry only; its eight labels are HTML text placed
 *             around it by components/profile/ProfileInstrument.tsx, so they
 *             are real text at a real size rather than SVG text scaled down
 *             with the viewBox. That is what holds the 12px floor at every
 *             width and at 200% zoom, which a scaled SVG label cannot do.
 *   compare   Slice 4.
 *
 * `COMPACT` and `full()` remain for the design-lab record and the homepage
 * explainer, which still draw their labels inside the SVG.
 */
export interface RadarLayout {
  readonly width: number;
  readonly height: number;
  readonly center: { x: number; y: number };
  readonly radius: number;
  readonly labelRadius: number;
  readonly nameSize: number;
  readonly valueSize: number;
  /**
   * Which rings to draw. The readable sizes draw every half-step the rubric can
   * land on, so the rings are a real scale rather than decoration.
   */
  readonly rings: readonly number[];
  /**
   * Whether each axis carries its name and value inside the SVG. False where
   * the text would be smaller than the 12px floor, or where the surface draws
   * the labels itself — and where it is false, the surface around the radar is
   * obliged to state the values instead. Nothing in this product is ever
   * communicated by shape alone.
   */
  readonly labels: boolean;
}

/** Every half-step the rubric can land on. */
const FULL_RINGS = [2.5, 5, 7.5, 10] as const;

/** ~10.7px labels and ~15px numerals once scaled into a 390px viewport. */
export const COMPACT: RadarLayout = {
  width: 400,
  height: 316,
  center: { x: 200, y: 158 },
  radius: 82,
  labelRadius: 99,
  nameSize: 13,
  valueSize: 18,
  rings: FULL_RINGS,
  labels: true,
};

/**
 * The card sigil: the same polygon, the same fixed axis order, the same
 * treatment of an unknown axis — at roughly 100px, with the text stripped.
 *
 * Two rings rather than four, because at this size four is hatching rather than
 * a scale. It is deliberately small: the instrument is this product's signature
 * device, and a signature repeated at full volume on every tile stops being one.
 * The card reads as a game first; this is the mark that says which product the
 * game is filed in.
 */
export const MARK: RadarLayout = {
  width: 128,
  height: 128,
  center: { x: 64, y: 64 },
  radius: 52,
  labelRadius: 0,
  nameSize: 0,
  valueSize: 0,
  rings: [5, 10],
  labels: false,
};

/**
 * The profile instrument's geometry: a square box with the outer ring at
 * 100/110 of the half-width, so the vertex marks on a 10.0 have room to
 * paint. Labels are HTML, positioned by the instrument (see the header note).
 */
export const PROFILE: RadarLayout = {
  width: 220,
  height: 220,
  center: { x: 110, y: 110 },
  radius: 100,
  labelRadius: 0,
  nameSize: 0,
  valueSize: 0,
  rings: FULL_RINGS,
  labels: false,
};

export function full(overrides: Partial<RadarLayout> = {}): RadarLayout {
  return {
    width: 460,
    height: 430,
    center: { x: 230, y: 208 },
    radius: 118,
    labelRadius: 140,
    nameSize: 10,
    valueSize: 17,
    rings: FULL_RINGS,
    labels: true,
    ...overrides,
  };
}
