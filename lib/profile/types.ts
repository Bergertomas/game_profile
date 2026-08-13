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

/**
 * One image. `url` is remote and belongs to whoever the artwork record credits;
 * no copy is committed to this repository.
 */
export interface GameImage {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  /** Factual description of what the image shows. Never marketing copy. */
  readonly alt?: string;
  /** `object-position` for a hard crop, e.g. "center 32%". */
  readonly focus?: string;
}

/**
 * A game's artwork, and whether it may be shown on the public site.
 *
 * Shaped so a provider (RAWG, MobyGames, a press kit) can populate it
 * automatically and a human can override one game without touching the
 * sourcing system. `clearance` is the only field that decides where these
 * images may render — see lib/profile/artwork.ts.
 */
export interface GameArtwork {
  /** Standardised portrait art, for cards and listings. */
  readonly cover?: GameImage;
  /** Landscape promotional art, for the profile stage. */
  readonly hero?: GameImage;
  readonly source: import("./artwork").ArtworkSource;
  /** The provider's own identifier, so a record can be refreshed later. */
  readonly externalId?: string;
  /** The application-level question: may this render on production? */
  readonly clearance: import("./artwork").ArtworkClearance;
  /**
   * Why we hold it. Recorded for the humans who have to answer for it later,
   * and deliberately never consulted by rendering code.
   */
  readonly basis: import("./artwork").ArtworkBasis;
  /** Rights holder to credit. Defaults to the publisher when omitted. */
  readonly credit?: string;
  /** Human-visitable page the asset belongs to. */
  readonly sourcePage?: string;
  readonly retrieved?: string;
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
  /**
   * Artwork, or nothing. Absent art must degrade gracefully — see
   * lib/profile/artwork.ts and ADR 0011.
   */
  readonly artwork?: GameArtwork;
}

/**
 * One evaluated experience of a game, and the durable identity of its
 * evaluation series (Rubric §1: separate evaluations where modes materially
 * change the experience).
 *
 *   The Long Dark
 *    ├── scope "survival"    → v1 → v2 → v3
 *    └── scope "wintermute"  → v1 → v2
 *
 * Both are current at the same time and version independently. `key` is the
 * stable editorial handle and the identity every version hangs off; `label` is
 * the public name and is ordinary editable metadata, because renaming a scope
 * rewrites no published judgement.
 *
 * Matching versions by comparing `EvaluationScope.mode` strings is exactly what
 * this replaces: a re-worded mode is the same series, and only an editor can
 * tell a re-wording from a materially different mode.
 */
export interface ProfileScope {
  readonly id: string;
  readonly gameId: string;
  /** Stable, lowercase-hyphenated, unique within the game. */
  readonly key: string;
  /** Public name, e.g. "Survival" or "Wintermute". */
  readonly label: string;
  /** What this scope covers, and what it deliberately excludes. */
  readonly summary?: string;
  /** Ordering within the game. Ties break on `key`, so it stays deterministic. */
  readonly displayOrder: number;
}

/**
 * Mandatory evaluation scope (Rubric §1 "Required evaluation scope").
 * An unscoped score is not a valid score: modes, editions, platforms and patch
 * levels materially change the product being described.
 *
 * Snapshotted per version and frozen on publication. `ProfileScope` says which
 * series a version belongs to; this says what that version declared it covered.
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

/**
 * A materially different value for this subcriterion on one platform
 * (Rubric §3, chiefly Technical Stability).
 *
 * The base `SubcriterionEntry.value` stays canonical: it is what the profile
 * publishes and the only value that reaches a dimension total. An override is
 * the exception layer, so a severe PC/console divergence is recorded rather
 * than averaged into one unexplained number — and so a platform difference does
 * not force an entire duplicate evaluation per platform.
 *
 * An override must differ from the base. A row repeating the base value is not
 * a deviation, and would make "this game diverges here" true of every platform
 * anybody bothered to mention.
 */
export interface SubcriterionPlatformOverride {
  /** Platform slug, which must be one the game ships on. */
  readonly platform: string;
  /** The value on this platform. `unknown` is allowed; it is never zero. */
  readonly value: SubcriterionValue;
  /** Required. An unexplained divergence is what the rubric forbids. */
  readonly rationale: string;
  readonly confidence?: Confidence;
}

export interface SubcriterionEntry {
  readonly value: SubcriterionValue;
  /** Why this value. Required for every scored subcriterion (Plan §14.3). */
  readonly rationale: string;
  /**
   * Platform *context* on the canonical value, e.g. "PC is demanding at
   * ray-traced presets". Prose, not a deviation — a materially different value
   * on a platform is a `platformOverrides` entry.
   */
  readonly platformNote?: string;
  /** Material per-platform deviations, where any exist. */
  readonly platformOverrides?: readonly SubcriterionPlatformOverride[];
}

export type DimensionEntry = Readonly<Record<string, SubcriterionEntry>>;

export interface EvaluationTag {
  readonly key: string;
  readonly intensity?: TagIntensity;
  readonly note?: string;
}

export interface EvidenceSource {
  /**
   * Stable, globally unique key for this source — the identity the database
   * uses. Titles are NOT unique ("Digital Foundry performance analysis" fits a
   * hundred games), so nothing may resolve a source by title.
   */
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

export type {
  ScoreProvenance,
  ScoreProvenanceKind,
} from "./provenance";

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
  /**
   * The evaluation series this version belongs to. Every uniqueness and
   * supersession rule is keyed on this rather than on the game, which is what
   * lets two modes of one game be published simultaneously.
   */
  readonly scopeId: string;
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
  /**
   * Where these numbers came from: the durable kind, plus the calibration
   * round where there is one. See lib/profile/provenance.ts.
   */
  readonly scoreProvenance: import("./provenance").ScoreProvenance;
  readonly publishedAt?: string;
  readonly supersedesEvaluationId?: string;
  readonly changeSummary?: string;
  /** Public platform-performance warning (Rubric §3 platform rule). */
  readonly platformWarning?: string;
}

/**
 * One profile: a game, one of its evaluated experiences, and that experience's
 * current evaluation plus its history.
 *
 * A game with two current scopes is two of these records. They share a `game`
 * and nothing else — separate version numbering, separate supersession chains,
 * separate published rows.
 */
export interface GameWithEvaluation {
  readonly game: Game;
  /** Which evaluated experience this record profiles. */
  readonly scope: ProfileScope;
  /** The current published evaluation. This is what the public page renders. */
  readonly evaluation: Evaluation;
  /**
   * Earlier evaluations this game has carried, oldest first.
   *
   * History is preserved, never overwritten (SOP §10.9): a pre-release profile
   * survives launch as a superseded row, and `evaluation.supersedesEvaluationId`
   * points back at the most recent of these. Seeded and validated, but not
   * rendered — revision history is a later ticket (Plan §6.7).
   *
   * Scoped to this series. The other scopes of the same game have their own.
   */
  readonly history?: readonly Evaluation[];
}
