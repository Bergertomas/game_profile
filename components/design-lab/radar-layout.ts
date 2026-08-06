/**
 * Radar layout presets shared by the three D0 directions.
 *
 * A single SVG scaled down to phone width renders its labels at roughly 7px,
 * which fails the brief's "radar labels must remain readable" rule (§17). Each
 * direction therefore renders two instances — a compact one below 640px and a
 * full one above — swapped with CSS so there is no resize observer, no layout
 * shift and no hydration mismatch.
 *
 * The compact geometry mirrors the production radar, whose label sizes were
 * verified legible at 390px.
 */
export interface RadarLayout {
  readonly width: number;
  readonly height: number;
  readonly center: { x: number; y: number };
  readonly radius: number;
  readonly labelRadius: number;
  readonly nameSize: number;
  readonly valueSize: number;
}

/** ~10.7px labels and ~15px numerals once scaled into a 390px viewport. */
export const COMPACT: RadarLayout = {
  width: 400,
  height: 316,
  center: { x: 200, y: 158 },
  radius: 82,
  labelRadius: 99,
  nameSize: 13,
  valueSize: 18,
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
    ...overrides,
  };
}
