import { byCodeUnit } from "@/lib/order";
import {
  dimensionsInRadarOrder,
  getRubric,
  type Dimension,
} from "@/lib/rubric";
import {
  getTag,
  type TagDefinition,
  type TagIntensity,
} from "@/lib/rubric/tags";
import {
  deriveDimensionScore,
  formatDimensionScore,
  radarUncertaintyCeiling,
  radarValue,
  type DimensionScore,
} from "@/lib/scoring/derive";
import type {
  Confidence,
  Evaluation,
  EvaluationTag,
  EvidenceSource,
  Game,
  GameWithEvaluation,
  ProfileScope,
  SourceCategory,
  SubcriterionEntry,
} from "./types";
import { SOURCE_CATEGORY_ORDER } from "./vocabulary";

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
  /** Editorial confidence in this dimension specifically (SOP §5). */
  readonly confidence: Confidence;
  /** Sources linked to this dimension. Evidence, never votes (SOP §6). */
  readonly linkedSources: readonly EvidenceSource[];
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

export interface SourceCategoryCount {
  readonly category: SourceCategory;
  readonly count: number;
}

/**
 * Everything the compact public trust line needs (Plan §6.6, SOP §6).
 *
 * `substantiveSources` counts Tier A and B evidence only. Tier C first-party
 * material and Tier D anecdote are recorded but are not what "supported by N
 * sources" is claiming.
 */
export interface EvidenceSummary {
  readonly substantiveSources: number;
  readonly totalSources: number;
  readonly categoryCounts: readonly SourceCategoryCount[];
  readonly hasDirectPlay: boolean;
}

export interface ProfileView {
  readonly game: Game;
  /**
   * Which evaluated experience this is. A game may publish several at once, so
   * a view of "the profile for a game" is not well-defined without it.
   */
  readonly scope: ProfileScope;
  readonly evaluation: Evaluation;
  /** Evidence sources in a canonical order. See `orderSources`. */
  readonly sources: readonly EvidenceSource[];
  /** Dimensions in fixed radar order — the same order the score rows use. */
  readonly dimensions: readonly DimensionView[];
  readonly radar: readonly RadarPoint[];
  readonly tags: readonly TagView[];
  readonly evidence: EvidenceSummary;
  /**
   * Text equivalent of the polygon for assistive technology. Deliberately
   * describes distribution, never an overall rating.
   */
  readonly shapeDescription: string;
}

/**
 * Aliases and platforms in a canonical order.
 *
 * Same class of gap as tags and evidence links: neither `game_aliases` nor
 * `game_platforms` has an ordering column, so an authored sequence is not
 * representable and the database's own row order is not a promise — the
 * platform query has no `ORDER BY` at all, because there is nothing meaningful
 * to order by. Sorting here gives both readers one answer that no environment
 * can change.
 */
function canonicalGame(game: Game): Game {
  return {
    ...game,
    aliases: [...game.aliases].sort(byCodeUnit),
    platforms: [...game.platforms].sort((a, b) => byCodeUnit(a.slug, b.slug)),
  };
}

export function buildProfileView({
  game,
  scope,
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

    const confidence = evaluation.dimensionConfidence[dimension.key];
    if (!confidence) {
      throw new Error(
        `Evaluation ${evaluation.id} has no confidence for dimension "${dimension.key}".`,
      );
    }

    return {
      dimension,
      score,
      display: formatDimensionScore(score),
      confidence,
      linkedSources: evaluation.sources.filter((source) =>
        source.supports?.includes(dimension.key),
      ),
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
    game: canonicalGame(game),
    scope,
    evaluation,
    sources: evaluation.sources.map(orderSupports),
    dimensions,
    radar,
    tags: evaluation.tags.map(toTagView),
    evidence: summariseEvidence(evaluation.sources),
    shapeDescription: describeShape(dimensions),
  };
}


/**
 * The dimensions one source bears on, in rubric order.
 *
 * NOT an authored sequence, and so not covered by migration 0008's ordering
 * columns. `supports` is a SET reconstructed from the evidence links a source
 * has — "this article speaks to structure and pacing" — and a set has no
 * editorial order to preserve. Rubric order is the only presentation of it that
 * reads the same way as the score rows above it.
 *
 * Which *sources* appear in which order is the authored decision, and that one
 * the builder no longer touches.
 */

/**
 * A tag row as the page renders it, in the order it arrived.
 *
 * ORDER IS NO LONGER DECIDED HERE. `evaluation_tags` and
 * `evaluation_evidence_links` carry an authored `display_order` (migration
 * 0008), so the Postgres reader returns the sequence an editor chose and this
 * builder must not overrule it — which is exactly what the previous
 * vocabulary-order sort did.
 *
 * The fixture path has no such column and is ordered canonically on the way out
 * of `readFixtureProfiles`, by the same rule migration 0008 used to backfill.
 * See lib/profile/canonical-order.ts.
 */
function orderSupports(source: EvidenceSource): EvidenceSource {
  if (!source.supports) return source;
  return {
    ...source,
    supports: [...source.supports].sort(
      (a, b) => (RUBRIC_ORDER.get(a) ?? 0) - (RUBRIC_ORDER.get(b) ?? 0),
    ),
  };
}

const RUBRIC_ORDER = new Map(
  dimensionsInRadarOrder().map((dimension, index) => [dimension.key, index]),
);

function toTagView(tag: EvaluationTag): TagView {
  return {
    definition: getTag(tag.key),
    intensity: tag.intensity,
    note: tag.note,
  };
}

export function summariseEvidence(
  sources: readonly EvidenceSource[],
): EvidenceSummary {
  const counts = new Map<SourceCategory, number>();
  for (const source of sources) {
    counts.set(source.category, (counts.get(source.category) ?? 0) + 1);
  }

  return {
    // Tier A/B only. First-party material and anecdote are stored but are not
    // what a "supported by N sources" claim rests on (Plan §10.1).
    substantiveSources: sources.filter((s) => s.tier === "A" || s.tier === "B")
      .length,
    totalSources: sources.length,
    categoryCounts: SOURCE_CATEGORY_ORDER.flatMap((category) => {
      const count = counts.get(category);
      return count ? [{ category, count }] : [];
    }),
    hasDirectPlay: sources.some((s) => s.category === "direct_play"),
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
