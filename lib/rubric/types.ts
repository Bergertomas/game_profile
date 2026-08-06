/**
 * Canonical types for Game Profile Scoring Rubric v1.0.
 *
 * Source of truth: docs/Game_Profile_Scoring_Rubric_v1.0.md (locked 2026-08-06).
 * Nothing in the UI may hardcode dimension labels or ordering; everything reads
 * from the rubric module. See Master Plan §25.10.
 */

/** Every evaluation stores the rubric version it was scored under (Rubric §18). */
export type RubricVersion = "1.0";

/**
 * Canonical dimension identifiers. These are database identities and must never
 * change meaning without a new rubric version (Rubric §18).
 */
export type DimensionKey =
  | "story"
  | "execution"
  | "structure"
  | "agency"
  | "pacing"
  | "atmosphere"
  | "thematic"
  | "craft";

/**
 * A subcriterion is scored 0 / 0.5 / 1 / 1.5 / 2, or is explicitly `unknown`
 * when evidence is insufficient (Rubric §1). `unknown` is not zero.
 */
export type SubcriterionScore = 0 | 0.5 | 1 | 1.5 | 2;
export const UNKNOWN = "unknown" as const;
export type Unknown = typeof UNKNOWN;
export type SubcriterionValue = SubcriterionScore | Unknown;

export interface Subcriterion {
  /** Stable key, unique within its dimension. */
  readonly key: string;
  readonly name: string;
  /** The evaluative question, quoted from the rubric. */
  readonly description: string;
  readonly displayOrder: number;
}

export interface Dimension {
  readonly key: DimensionKey;
  /** Full canonical name, e.g. "Story & Character Investment". */
  readonly name: string;
  /** Two-line label for the radar at desktop width. */
  readonly axisLabel: readonly [string, string];
  /** One-word label for the radar at narrow widths and for compact tables. */
  readonly shortLabel: string;
  /** The dimension's core question, quoted from the rubric. */
  readonly coreQuestion: string;
  /** One-line plain-language gloss used in score rows. */
  readonly summary: string;
  /** "Not this" boundary text — the mitigation for rubric overlap (Plan §21 Risk 6). */
  readonly boundary: string;
  /** Canonical storage/list order (Rubric §2–§9). */
  readonly displayOrder: number;
  readonly subcriteria: readonly Subcriterion[];
}

export interface Rubric {
  readonly version: RubricVersion;
  readonly lockedAt: string;
  readonly dimensions: readonly Dimension[];
  /**
   * Globally fixed radar axis order, clockwise from top
   * (Rubric §22, Plan §15.2, Context §16). Differs deliberately from
   * canonical storage order: meaning/world -> interactivity/play -> delivery/time.
   */
  readonly radarOrder: readonly DimensionKey[];
}

/** Editorial calibration language for 0–10 dimension totals (Rubric §21). */
export interface ScoreAnchor {
  readonly min: number;
  readonly max: number;
  readonly label: string;
  readonly description: string;
}
