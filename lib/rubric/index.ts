import { RUBRIC_V1 } from "./v1";
import type {
  Dimension,
  DimensionKey,
  Rubric,
  RubricVersion,
  Subcriterion,
} from "./types";

export * from "./types";
export { RUBRIC_V1, SUBCRITERION_SCALE, SCORE_ANCHORS } from "./v1";

const REGISTRY: Readonly<Record<RubricVersion, Rubric>> = {
  "1.0": RUBRIC_V1,
};

/** Resolve a rubric by the version stored on an evaluation. */
export function getRubric(version: RubricVersion): Rubric {
  return REGISTRY[version];
}

/** The rubric new evaluations are authored against. */
export const CURRENT_RUBRIC_VERSION: RubricVersion = "1.0";

const byKey = new Map<DimensionKey, Dimension>(
  RUBRIC_V1.dimensions.map((d) => [d.key, d]),
);

export function getDimension(key: DimensionKey): Dimension {
  const dimension = byKey.get(key);
  if (!dimension) throw new Error(`Unknown dimension key: ${key}`);
  return dimension;
}

/** Dimensions in canonical storage order (Rubric §2–§9). */
export function dimensionsInCanonicalOrder(): readonly Dimension[] {
  return RUBRIC_V1.dimensions;
}

/**
 * Dimensions in fixed radar/display order (Rubric §22).
 *
 * Public score rows use this order too, so the polygon and the numbers below it
 * read in the same sequence. See docs/decisions/0003-display-order.md.
 */
export function dimensionsInRadarOrder(): readonly Dimension[] {
  return RUBRIC_V1.radarOrder.map(getDimension);
}

export function getSubcriterion(
  dimensionKey: DimensionKey,
  subcriterionKey: string,
): Subcriterion {
  const found = getDimension(dimensionKey).subcriteria.find(
    (s) => s.key === subcriterionKey,
  );
  if (!found) {
    throw new Error(`Unknown subcriterion: ${dimensionKey}.${subcriterionKey}`);
  }
  return found;
}
