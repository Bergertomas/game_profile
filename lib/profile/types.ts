import type { DimensionKey, RubricVersion, SubcriterionValue } from "@/lib/rubric";
import type { TagIntensity } from "@/lib/rubric/tags";

/** Rubric §13. A status is not a score. */
export type EvidenceStatus = "verified" | "provisional" | "pre_release";
export type Confidence = "low" | "medium" | "high";

/**
 * Editorial maturity of a pre-release profile (SOP §10.1, Plan §9.3).
 *
 * Required whenever `evidenceStatus` is `pre_release`, and meaningless
 * otherwise. It governs how much of the profile may carry numbers at all:
 * `announced` is first-party material only and cannot support a complete
 * eight-dimension numerical profile (SOP §10.3).
 */
export type EvidenceMaturity =
  | "announced"
  | "showcased"
  | "hands_on"
  | "review_code";

/**
 * Source category (Plan §13.1 `evidence_sources.source_category`).
 *
 * Drives the public source-category counts. These are counts of *evidence*,
 * never votes to be averaged — see SOP §6.
 */
export type SourceCategory =
  | "direct_play"
  | "critic"
  | "technical"
  | "specialist_creator"
  | "player_signal"
  | "first_party";

export type ReleaseStatus = "released" | "upcoming" | "early_access";
export type EvaluationStatus = "draft" | "review" | "published" | "superseded";

/** Plan §6.3 — the three canonical interpretation blocks. */
export type BlockType = "great_fit" | "know_before" | "probably_not";

/** Plan §10.1 evidence tiers. */
export type EvidenceTier = "A" | "B" | "C" | "D";

export interface Platform {
  readonly slug: string;
  readonly name: string;
}

export interface Game {
  readonly id: string;
  readonly slug: string;
  readonly canonicalTitle: string;
  /** Neutral factual description. Not marketing copy, not a verdict. */
  readonly summary: string;
  readonly developerText: string;
  readonly publisherText: string;
  readonly firstReleaseDate: string;
  readonly releaseStatus: ReleaseStatus;
  readonly platforms: readonly Platform[];
  readonly aliases: readonly string[];
  /** Optional owned/licensed art. Absent art must degrade gracefully. */
  readonly coverUrl?: string;
  readonly heroUrl?: string;
}

/**
 * Mandatory evaluation scope (Rubric §1 "Required evaluation scope").
 * An unscoped score is not a valid score: modes, editions, platforms and patch
 * levels materially change the product being described.
 */
export interface EvaluationScope {
  /** Product/edition, e.g. "Base game" or "Deluxe Edition". */
  readonly edition: string;
  /** Campaign or mode scope, e.g. "Single-player campaign". */
  readonly mode: string;
  /** Platforms this evaluation covers. */
  readonly platforms: readonly string[];
  /** Build/patch scope, e.g. "Game Update 4". */
  readonly buildOrPatch: string;
  /** Current-state cutoff for actively-changing products (Rubric §17, §21). */
  readonly currentStateCutoff?: string;
}

export interface SubcriterionEntry {
  readonly value: SubcriterionValue;
  /** Why this value. Required for every scored subcriterion (Plan §14.3). */
  readonly rationale: string;
  /** Platform-specific override note, chiefly for Technical Stability. */
  readonly platformNote?: string;
}

export type DimensionEntry = Readonly<Record<string, SubcriterionEntry>>;

export interface EvaluationTag {
  readonly key: string;
  readonly intensity?: TagIntensity;
  readonly note?: string;
}

export interface EvidenceSource {
  readonly id: string;
  readonly title: string;
  readonly url?: string;
  readonly publisher?: string;
  readonly author?: string;
  readonly publishedAt?: string;
  readonly tier: EvidenceTier;
  readonly category: SourceCategory;
  /**
   * Dimensions this source bears on. Empty means profile-level evidence not
   * attached to any single dimension. Drives the per-dimension "supported by N
   * linked sources" count in `Why this score?` (Plan §6.6).
   */
  readonly supports?: readonly DimensionKey[];
  /** Platforms this source speaks to, where that matters (Plan §13.1). */
  readonly platformScope?: readonly string[];
  readonly note?: string;
}

/**
 * Where a profile's numbers came from. `calibration_round_1` /
 * `calibration_round_2` mean the totals are published in a calibration report
 * and are authoritative. `derived_pending_round_1_reconciliation` marks scores
 * Claude derived directly from the rubric because the Round 1 report is not in
 * the repository — they are engineering-grade, not editorially signed off.
 */
export type ScoreProvenance =
  | "calibration_round_1"
  | "calibration_round_2"
  | "derived_pending_round_1_reconciliation";

/**
 * Whether the evidence ledger holds individual source records yet.
 *
 * The calibration profiles were scored against broad critical consensus, which
 * is recorded here as a handful of truthful evidence *classes* rather than the
 * 8–15 individual sources SOP §3 targets. Publishing "supported by 3 sources"
 * off the back of that would understate the real basis, so the trust line omits
 * the count while this is `pending`. It becomes `populated` when the Phase 2
 * evidence manager holds the real records.
 */
export type EvidenceLedgerState = "populated" | "pending";

export interface Evaluation {
  readonly id: string;
  readonly gameId: string;
  readonly rubricVersion: RubricVersion;
  readonly versionNumber: number;
  readonly scope: EvaluationScope;
  readonly status: EvaluationStatus;
  readonly evidenceStatus: EvidenceStatus;
  /** Overall profile confidence. Cannot be High for a pre-release profile. */
  readonly confidence: Confidence;
  /**
   * Per-dimension confidence (SOP §5, Plan §13.1). May legitimately differ from
   * the overall figure — a profile can be broadly well-evidenced while one
   * dimension rests on thin ground. Every dimension must be present.
   */
  readonly dimensionConfidence: Readonly<Record<DimensionKey, Confidence>>;
  /** Required when evidenceStatus is pre_release; omitted otherwise. */
  readonly evidenceMaturity?: EvidenceMaturity;
  readonly evidenceCutoffAt: string;
  /** e.g. "Post-release", "Launch", "Legacy retrospective". */
  readonly releaseContext: string;
  /** One sentence. What this is to play, not whether it is good. */
  readonly oneLineExperience: string;
  /** Exactly one. The single strongest reason this game earns attention. */
  readonly primaryPull: string;
  /** Exactly one. The single most likely source of mismatch. */
  readonly primaryRisk: string;
  readonly dimensions: Readonly<Record<DimensionKey, DimensionEntry>>;
  readonly blocks: Readonly<Record<BlockType, readonly string[]>>;
  readonly tags: readonly EvaluationTag[];
  readonly sources: readonly EvidenceSource[];
  readonly evidenceLedger: EvidenceLedgerState;
  readonly scoreProvenance: ScoreProvenance;
  /** Note shown in-product when provenance is not editorially final. */
  readonly provenanceNote?: string;
  readonly publishedAt?: string;
  readonly supersedesEvaluationId?: string;
  readonly changeSummary?: string;
  /** Public platform-performance warning (Rubric §3 platform rule). */
  readonly platformWarning?: string;
}

export interface GameWithEvaluation {
  readonly game: Game;
  readonly evaluation: Evaluation;
}
