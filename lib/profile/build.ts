import {
  dimensionsInRadarOrder,
  getRubric,
  type Dimension,
} from "@/lib/rubric";
import { getTag, type TagDefinition, type TagIntensity } from "@/lib/rubric/tags";
import {
  deriveDimensionScore,
  formatDimensionScore,
  radarUncertaintyCeiling,
  radarValue,
  type DimensionScore,
} from "@/lib/scoring/derive";
import type {
  Evaluation,
  Game,
  GameWithEvaluation,
  SubcriterionEntry,
} from "./types";

export interface SubcriterionView {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly entry: SubcriterionEntry;
}

export interface DimensionView {
  readonly dimension: Dimension;
  readonly score: DimensionScore;
  /** Pre-formatted public string, e.g. "9.5", "7.0–9.0" or "Not scored". */
  readonly display: string;
  readonly subcriteria: readonly SubcriterionView[];
}

export interface RadarPoint {
  readonly key: string;
  readonly axisLabel: readonly [string, string];
  readonly shortLabel: string;
  readonly name: string;
  /** 0–10, or null when the dimension has insufficient evidence. */
  readonly value: number | null;
  /** Upper bound of a plotted uncertainty reach, else null. */
  readonly ceiling: number | null;
  readonly display: string;
}

export interface TagView {
  readonly definition: TagDefinition;
  readonly intensity?: TagIntensity;
  readonly note?: string;
}

export interface ProfileView {
  readonly game: Game;
  readonly evaluation: Evaluation;
  /** Dimensions in fixed radar order — the same order the score rows use. */
  readonly dimensions: readonly DimensionView[];
  readonly radar: readonly RadarPoint[];
  readonly tags: readonly TagView[];
  /**
   * Text equivalent of the polygon for assistive technology. Deliberately
   * describes distribution, never an overall rating.
   */
  readonly shapeDescription: string;
}

export function buildProfileView({
  game,
  evaluation,
}: GameWithEvaluation): ProfileView {
  // Resolve against the rubric version the evaluation was scored under, not the
  // current one — old evaluations must keep rendering under their own rubric.
  const rubric = getRubric(evaluation.rubricVersion);
  const ordered = rubric.radarOrder.map((key) => {
    const dimension = rubric.dimensions.find((d) => d.key === key);
    if (!dimension) throw new Error(`Rubric ${rubric.version} lacks ${key}`);
    return dimension;
  });

  const dimensions: DimensionView[] = ordered.map((dimension) => {
    const entries = evaluation.dimensions[dimension.key];
    if (!entries) {
      throw new Error(
        `Evaluation ${evaluation.id} has no scores for dimension "${dimension.key}".`,
      );
    }
    const values = Object.fromEntries(
      Object.entries(entries).map(([key, entry]) => [key, entry.value]),
    );
    const score = deriveDimensionScore(dimension, values);

    return {
      dimension,
      score,
      display: formatDimensionScore(score),
      subcriteria: dimension.subcriteria.map((subcriterion) => {
        const entry = entries[subcriterion.key];
        if (!entry) {
          throw new Error(
            `Evaluation ${evaluation.id} missing ${dimension.key}.${subcriterion.key}`,
          );
        }
        return {
          key: subcriterion.key,
          name: subcriterion.name,
          description: subcriterion.description,
          entry,
        };
      }),
    };
  });

  const radar: RadarPoint[] = dimensions.map(({ dimension, score, display }) => ({
    key: dimension.key,
    axisLabel: dimension.axisLabel,
    shortLabel: dimension.shortLabel,
    name: dimension.name,
    value: radarValue(score),
    ceiling: radarUncertaintyCeiling(score),
    display,
  }));

  return {
    game,
    evaluation,
    dimensions,
    radar,
    tags: evaluation.tags.map((tag) => ({
      definition: getTag(tag.key),
      intensity: tag.intensity,
      note: tag.note,
    })),
    shapeDescription: describeShape(dimensions),
  };
}

/**
 * Screen-reader description of the profile silhouette.
 *
 * Names the extremes and the spread. It must not state or imply an overall
 * rating — there is no public aggregate score (Plan §9.1).
 */
export function describeShape(dimensions: readonly DimensionView[]): string {
  const scored = dimensions.flatMap((d) => {
    if (d.score.kind === "insufficient") return [];
    return [
      {
        name: d.dimension.name,
        display: d.display,
        value: d.score.kind === "exact" ? d.score.score : d.score.low,
      },
    ];
  });

  if (scored.length === 0) {
    return "No dimensions have sufficient evidence to be scored.";
  }

  const sorted = [...scored].sort((a, b) => b.value - a.value);
  const highest = sorted.slice(0, 2);
  const lowest = sorted.slice(-2).reverse();
  const unscored = dimensions.filter((d) => d.score.kind === "insufficient");

  const parts = [
    `Profile across ${dimensions.length} dimensions, each scored 0 to 10 independently.`,
    `Strongest: ${highest.map((d) => `${d.name} ${d.display}`).join(", ")}.`,
    `Lowest: ${lowest.map((d) => `${d.name} ${d.display}`).join(", ")}.`,
  ];
  if (unscored.length > 0) {
    parts.push(
      `Not scored for lack of evidence: ${unscored
        .map((d) => d.dimension.name)
        .join(", ")}.`,
    );
  }
  parts.push("Exact values for every dimension follow in the score table.");
  return parts.join(" ");
}

/** Convenience for callers that only need the fixed axis order. */
export { dimensionsInRadarOrder };
