import { asc, eq, inArray } from "drizzle-orm";
import { withAuthorizedAdminDatabase, type AdminDatabase } from "@/lib/admin/db";
import * as t from "@/lib/db/schema";
import {
  deriveDimensionScore,
  formatDimensionScore,
  type DimensionScore,
} from "@/lib/scoring/derive";
import {
  dimensionsInRadarOrder,
  getRubric,
  UNKNOWN,
  type Dimension,
  type DimensionKey,
  type RubricVersion,
  type SubcriterionValue,
} from "@/lib/rubric";
import { TAGS } from "@/lib/rubric/tags";
import type {
  BlockType,
  Confidence,
  EvaluationStatus,
  EvidenceLedgerState,
  EvidenceMaturity,
  EvidenceStatus,
  SourceCategory,
} from "@/lib/profile/types";

/**
 * Everything the evaluation editor reads.
 *
 * ── One scoring implementation, not two ─────────────────────────────────────
 *
 * Derived totals come from `deriveDimensionScore`, the same function the public
 * profile uses. The editor must never acquire its own arithmetic: a second
 * implementation is how an editor comes to author against numbers the published
 * page will not reproduce.
 *
 * ── Three states, not two ───────────────────────────────────────────────────
 *
 * A subcriterion is either **unauthored** (no row), **Unknown** (a row with a
 * NULL score) or **exact** (a row with a value). The distinction is the whole
 * reason a draft can be saved half-finished:
 *
 *   unauthored — nobody has looked at this yet. Draft-incomplete.
 *   Unknown    — somebody looked and the evidence does not settle it. Complete,
 *                and it is what makes a dimension total a range (Rubric §21).
 *
 * `deriveDimensionScore` refuses a partial record on purpose, so a total is
 * offered only once all five are authored. Before that the editor sees
 * progress, not a number that would change meaning as it filled in.
 */

export interface SubcriterionDraft {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  /** Null when nobody has authored this subcriterion yet. */
  readonly value: SubcriterionValue | null;
  readonly rationale: string | null;
  /** Editorial confidence in this one reading (SOP §5). Optional. */
  readonly evidenceConfidence: Confidence | null;
  /** Prose context on the canonical score — not a platform deviation. */
  readonly platformNote: string | null;
  /** Material platform deviations. Never enter the base total (ADR 0015). */
  readonly overrides: readonly PlatformOverrideDraft[];
}

export interface PlatformOverrideDraft {
  readonly platformId: string;
  readonly platformName: string;
  /** Null means Unknown on this platform — never zero. */
  readonly value: SubcriterionValue | null;
  readonly rationale: string;
  readonly evidenceConfidence: Confidence | null;
}

export interface DimensionDraft {
  readonly dimension: Dimension;
  readonly subcriteria: readonly SubcriterionDraft[];
  /** Per-dimension editorial confidence. Null until authored. */
  readonly confidence: Confidence | null;
  readonly note: string | null;
  /** How many of the five have been authored at all. */
  readonly authoredCount: number;
  /**
   * The derived total, or null while the dimension is incomplete. Never
   * computed from a partial grid — see the module comment.
   */
  readonly score: DimensionScore | null;
  readonly display: string | null;
  readonly unknownCount: number;
}

export interface EvidenceLinkDraft {
  readonly id: string;
  readonly sourceId: string;
  readonly sourceKey: string;
  readonly title: string;
  readonly tier: "A" | "B" | "C" | "D";
  readonly category: SourceCategory;
  /** Null for profile-level evidence that supports no particular score. */
  readonly dimensionKey: DimensionKey | null;
  readonly subcriterionKey: string | null;
  readonly platformScope: readonly string[] | null;
  readonly note: string | null;
  readonly spoilerSensitive: boolean;
  readonly displayOrder: number;
}

export interface EvidenceSourceRow {
  readonly id: string;
  readonly sourceKey: string;
  readonly title: string;
  readonly url: string | null;
  readonly publisher: string | null;
  readonly author: string | null;
  readonly publishedAt: string | null;
  readonly accessedAt: string | null;
  readonly tier: "A" | "B" | "C" | "D";
  readonly category: SourceCategory;
  readonly sourceType: string | null;
}

export interface EvaluationTagDraft {
  readonly key: string;
  readonly label: string;
  readonly intensity: "low" | "medium" | "high" | null;
  readonly note: string | null;
  readonly displayOrder: number;
}

export interface EvaluationEditorView {
  readonly id: string;
  readonly gameId: string;
  readonly gameSlug: string;
  readonly gameTitle: string;
  readonly scopeId: string;
  readonly scopeKey: string;
  readonly scopeLabel: string;
  readonly rubricVersion: RubricVersion;
  readonly versionNumber: number;
  readonly status: EvaluationStatus;
  /** Published and Superseded rows are frozen snapshots (ADR 0009). */
  readonly editable: boolean;

  readonly editionScope: string;
  readonly modeScope: string;
  readonly platformScope: readonly string[];
  readonly buildOrPatchScope: string;
  readonly currentStateCutoffAt: string | null;
  readonly evidenceCutoffAt: string;
  readonly releaseContext: string | null;

  readonly evidenceStatus: EvidenceStatus;
  readonly evidenceMaturity: EvidenceMaturity | null;
  readonly confidence: Confidence;
  readonly evidenceLedger: EvidenceLedgerState;
  readonly scoreProvenance: "editorial" | "calibration" | "derived";
  readonly calibrationRound: string | null;
  readonly provenanceNote: string | null;

  readonly oneLineExperience: string | null;
  readonly primaryPull: string | null;
  readonly primaryRisk: string | null;
  readonly platformWarning: string | null;
  readonly blocks: Readonly<Record<BlockType, readonly string[]>>;

  readonly dimensions: readonly DimensionDraft[];
  readonly tags: readonly EvaluationTagDraft[];
  readonly evidence: readonly EvidenceLinkDraft[];

  readonly supersedesEvaluationId: string | null;
  readonly changeSummary: string | null;
  readonly createdBy: string | null;
  readonly publishedAt: string | null;

  /** Platforms this game ships on, for override and scope pickers. */
  readonly gamePlatforms: readonly { id: string; slug: string; name: string }[];
}

/** The blocks an interpretation carries, in the order they are authored. */
export const BLOCK_TYPES: readonly BlockType[] = [
  "great_fit",
  "know_before",
  "probably_not",
];

/**
 * The whole editor state for one evaluation.
 *
 * Loaded in one pass rather than per panel: the editor renders context, forty
 * subcriteria, evidence, tags and interpretation together, and a page that
 * opened a connection per panel would be an N+1 an editor could feel.
 */
export async function readEvaluationEditor(
  db: AdminDatabase,
  evaluationId: string,
): Promise<EvaluationEditorView | null> {
  const [row] = await db
    .select({
      evaluation: t.evaluations,
      gameSlug: t.games.slug,
      gameTitle: t.games.canonicalTitle,
      scopeKey: t.profileScopes.key,
      scopeLabel: t.profileScopes.label,
    })
    .from(t.evaluations)
    .innerJoin(t.games, eq(t.games.id, t.evaluations.gameId))
    .innerJoin(t.profileScopes, eq(t.profileScopes.id, t.evaluations.scopeId))
    .where(eq(t.evaluations.id, evaluationId))
    .limit(1);
  if (!row) return null;

  const evaluation = row.evaluation;
  const rubric = getRubric(evaluation.rubricVersion as RubricVersion);

  const [scores, assessments, blocks, tagRows, evidenceRows, overrides, platforms] =
    await Promise.all([
      db
        .select({
          dimensionKey: t.dimensions.key,
          subcriterionKey: t.subcriteria.key,
          subcriterionId: t.subcriteria.id,
          score: t.subcriterionScores.score,
          rationale: t.subcriterionScores.rationale,
          platformNote: t.subcriterionScores.platformNote,
          evidenceConfidence: t.subcriterionScores.evidenceConfidence,
        })
        .from(t.subcriterionScores)
        .innerJoin(
          t.subcriteria,
          eq(t.subcriteria.id, t.subcriterionScores.subcriterionId),
        )
        .innerJoin(t.dimensions, eq(t.dimensions.id, t.subcriteria.dimensionId))
        .where(eq(t.subcriterionScores.evaluationId, evaluationId)),
      db
        .select({
          dimensionKey: t.dimensions.key,
          confidence: t.dimensionAssessments.confidence,
          note: t.dimensionAssessments.note,
        })
        .from(t.dimensionAssessments)
        .innerJoin(
          t.dimensions,
          eq(t.dimensions.id, t.dimensionAssessments.dimensionId),
        )
        .where(eq(t.dimensionAssessments.evaluationId, evaluationId)),
      db
        .select()
        .from(t.profileBlocks)
        .where(eq(t.profileBlocks.evaluationId, evaluationId))
        .orderBy(asc(t.profileBlocks.blockType), asc(t.profileBlocks.itemOrder)),
      db
        .select({
          key: t.tags.key,
          label: t.tags.label,
          intensity: t.evaluationTags.intensity,
          note: t.evaluationTags.note,
          displayOrder: t.evaluationTags.displayOrder,
        })
        .from(t.evaluationTags)
        .innerJoin(t.tags, eq(t.tags.id, t.evaluationTags.tagId))
        .where(eq(t.evaluationTags.evaluationId, evaluationId))
        .orderBy(asc(t.evaluationTags.displayOrder), asc(t.tags.key)),
      db
        .select({
          id: t.evaluationEvidenceLinks.id,
          sourceId: t.evidenceSources.id,
          sourceKey: t.evidenceSources.sourceKey,
          title: t.evidenceSources.title,
          tier: t.evidenceSources.evidenceTier,
          category: t.evidenceSources.sourceCategory,
          dimensionKey: t.dimensions.key,
          subcriterionKey: t.subcriteria.key,
          platformScope: t.evaluationEvidenceLinks.platformScope,
          note: t.evaluationEvidenceLinks.note,
          spoilerSensitive: t.evaluationEvidenceLinks.spoilerSensitive,
          displayOrder: t.evaluationEvidenceLinks.displayOrder,
        })
        .from(t.evaluationEvidenceLinks)
        .innerJoin(
          t.evidenceSources,
          eq(t.evidenceSources.id, t.evaluationEvidenceLinks.evidenceSourceId),
        )
        .leftJoin(
          t.dimensions,
          eq(t.dimensions.id, t.evaluationEvidenceLinks.dimensionId),
        )
        .leftJoin(
          t.subcriteria,
          eq(t.subcriteria.id, t.evaluationEvidenceLinks.subcriterionId),
        )
        .where(eq(t.evaluationEvidenceLinks.evaluationId, evaluationId))
        .orderBy(
          asc(t.evaluationEvidenceLinks.displayOrder),
          asc(t.evidenceSources.sourceKey),
        ),
      db
        .select({
          dimensionKey: t.dimensions.key,
          subcriterionKey: t.subcriteria.key,
          platformId: t.platforms.id,
          platformName: t.platforms.name,
          score: t.subcriterionPlatformOverrides.score,
          rationale: t.subcriterionPlatformOverrides.rationale,
          evidenceConfidence: t.subcriterionPlatformOverrides.evidenceConfidence,
        })
        .from(t.subcriterionPlatformOverrides)
        .innerJoin(
          t.subcriteria,
          eq(t.subcriteria.id, t.subcriterionPlatformOverrides.subcriterionId),
        )
        .innerJoin(t.dimensions, eq(t.dimensions.id, t.subcriteria.dimensionId))
        .innerJoin(
          t.platforms,
          eq(t.platforms.id, t.subcriterionPlatformOverrides.platformId),
        )
        .where(eq(t.subcriterionPlatformOverrides.evaluationId, evaluationId))
        .orderBy(asc(t.platforms.name)),
      db
        .select({ id: t.platforms.id, slug: t.platforms.slug, name: t.platforms.name })
        .from(t.gamePlatforms)
        .innerJoin(t.platforms, eq(t.platforms.id, t.gamePlatforms.platformId))
        .where(eq(t.gamePlatforms.gameId, evaluation.gameId))
        .orderBy(asc(t.platforms.name)),
    ]);

  const scoreIndex = new Map(
    scores.map((score) => [`${score.dimensionKey}.${score.subcriterionKey}`, score]),
  );
  const overrideIndex = new Map<string, PlatformOverrideDraft[]>();
  for (const override of overrides) {
    const key = `${override.dimensionKey}.${override.subcriterionKey}`;
    const list = overrideIndex.get(key) ?? [];
    list.push({
      platformId: override.platformId,
      platformName: override.platformName,
      value: toSubcriterionValue(override.score),
      rationale: override.rationale,
      evidenceConfidence: override.evidenceConfidence,
    });
    overrideIndex.set(key, list);
  }
  const confidenceIndex = new Map(
    assessments.map((assessment) => [assessment.dimensionKey, assessment]),
  );

  const dimensions: DimensionDraft[] = dimensionsInRadarOrder()
    .filter((dimension) => rubric.dimensions.some((d) => d.key === dimension.key))
    .map((dimension) => {
      const subcriteria: SubcriterionDraft[] = dimension.subcriteria.map((sub) => {
        const stored = scoreIndex.get(`${dimension.key}.${sub.key}`);
        return {
          key: sub.key,
          name: sub.name,
          description: sub.description,
          value: stored ? toSubcriterionValue(stored.score) : null,
          rationale: stored?.rationale ?? null,
          evidenceConfidence: stored?.evidenceConfidence ?? null,
          platformNote: stored?.platformNote ?? null,
          overrides: overrideIndex.get(`${dimension.key}.${sub.key}`) ?? [],
        };
      });

      const authored = subcriteria.filter((sub) => sub.value !== null);
      const complete = authored.length === dimension.subcriteria.length;
      // Only a complete grid is handed to the scorer: it refuses a partial
      // record rather than treating an unauthored subcriterion as Unknown, and
      // that refusal is the property that keeps drafts honest.
      const score = complete
        ? deriveDimensionScore(
            dimension,
            Object.fromEntries(
              subcriteria.map((sub) => [sub.key, sub.value as SubcriterionValue]),
            ),
          )
        : null;

      const assessment = confidenceIndex.get(dimension.key);
      return {
        dimension,
        subcriteria,
        confidence: assessment?.confidence ?? null,
        note: assessment?.note ?? null,
        authoredCount: authored.length,
        score,
        display: score ? formatDimensionScore(score) : null,
        unknownCount: authored.filter((sub) => sub.value === UNKNOWN).length,
      };
    });

  const blocksByType: Record<BlockType, readonly string[]> = {
    great_fit: blockTexts(blocks, "great_fit"),
    know_before: blockTexts(blocks, "know_before"),
    probably_not: blockTexts(blocks, "probably_not"),
  };

  const tagLabels = new Map(TAGS.map((tag) => [tag.key, tag.label]));

  return {
    id: evaluation.id,
    gameId: evaluation.gameId,
    gameSlug: row.gameSlug,
    gameTitle: row.gameTitle,
    scopeId: evaluation.scopeId,
    scopeKey: row.scopeKey,
    scopeLabel: row.scopeLabel,
    rubricVersion: evaluation.rubricVersion as RubricVersion,
    versionNumber: evaluation.versionNumber,
    status: evaluation.status,
    editable: evaluation.status === "draft" || evaluation.status === "review",

    editionScope: evaluation.editionScope,
    modeScope: evaluation.modeScope,
    platformScope: evaluation.platformScope,
    buildOrPatchScope: evaluation.buildOrPatchScope,
    currentStateCutoffAt: evaluation.currentStateCutoffAt,
    evidenceCutoffAt: evaluation.evidenceCutoffAt,
    releaseContext: evaluation.releaseContext,

    evidenceStatus: evaluation.evidenceStatus,
    evidenceMaturity: evaluation.evidenceMaturity,
    confidence: evaluation.confidence,
    evidenceLedger: evaluation.evidenceLedger,
    scoreProvenance: evaluation.scoreProvenance,
    calibrationRound: evaluation.calibrationRound,
    provenanceNote: evaluation.provenanceNote,

    oneLineExperience: evaluation.oneLineExperience,
    primaryPull: evaluation.primaryPull,
    primaryRisk: evaluation.primaryRisk,
    platformWarning: evaluation.platformWarning,
    blocks: blocksByType,

    dimensions,
    tags: tagRows.map((tag) => ({
      key: tag.key,
      label: tagLabels.get(tag.key) ?? tag.label,
      intensity: tag.intensity,
      note: tag.note,
      displayOrder: tag.displayOrder,
    })),
    evidence: evidenceRows.map((link) => ({
      id: link.id,
      sourceId: link.sourceId,
      sourceKey: link.sourceKey,
      title: link.title,
      tier: link.tier,
      category: link.category,
      dimensionKey: (link.dimensionKey as DimensionKey | null) ?? null,
      subcriterionKey: link.subcriterionKey,
      platformScope: link.platformScope,
      note: link.note,
      spoilerSensitive: link.spoilerSensitive,
      displayOrder: link.displayOrder,
    })),

    supersedesEvaluationId: evaluation.supersedesEvaluationId,
    changeSummary: evaluation.changeSummary,
    createdBy: evaluation.createdBy,
    publishedAt: evaluation.publishedAt?.toISOString() ?? null,
    gamePlatforms: platforms,
  };
}

function blockTexts(
  blocks: readonly { blockType: BlockType; text: string }[],
  type: BlockType,
): string[] {
  return blocks.filter((block) => block.blockType === type).map((b) => b.text);
}

/**
 * NULL is Unknown, not zero (Rubric §22).
 *
 * The same mapping the public reader makes. A numeric column cannot hold
 * "nobody knows", so the absence of a number carries that meaning — and the one
 * thing it must never become is 0, which is a real score meaning "actively bad".
 */
function toSubcriterionValue(score: string | null): SubcriterionValue {
  return score === null ? UNKNOWN : (Number(score) as SubcriterionValue);
}

export interface DraftProgress {
  readonly scoredSubcriteria: number;
  readonly totalSubcriteria: number;
  readonly rationales: number;
  readonly dimensionsComplete: number;
  readonly dimensionsWithConfidence: number;
  readonly totalDimensions: number;
  readonly evidenceLinks: number;
  readonly tags: number;
  readonly hasInterpretation: boolean;
  readonly blocksAuthored: number;
}

/**
 * How far along a draft is.
 *
 * DELIBERATELY NOT THE PUBLISH GATE. Phase 2D owns "may this be published";
 * this is "how much has been written", so an editor can see what is left
 * without being told a half-finished draft is invalid. Master Plan §8.8 lists
 * what publication will check, and none of it is enforced here.
 */
export function draftProgress(view: EvaluationEditorView): DraftProgress {
  const subcriteria = view.dimensions.flatMap((d) => d.subcriteria);
  return {
    scoredSubcriteria: subcriteria.filter((s) => s.value !== null).length,
    totalSubcriteria: subcriteria.length,
    rationales: subcriteria.filter((s) => (s.rationale ?? "").trim().length > 0).length,
    dimensionsComplete: view.dimensions.filter((d) => d.score !== null).length,
    dimensionsWithConfidence: view.dimensions.filter((d) => d.confidence !== null).length,
    totalDimensions: view.dimensions.length,
    evidenceLinks: view.evidence.length,
    tags: view.tags.length,
    hasInterpretation: Boolean(
      view.oneLineExperience && view.primaryPull && view.primaryRisk,
    ),
    blocksAuthored: BLOCK_TYPES.filter((type) => view.blocks[type].length > 0).length,
  };
}

/** Every evidence source in the catalogue, for the picker. */
export async function listEvidenceSources(
  db: AdminDatabase,
): Promise<EvidenceSourceRow[]> {
  const rows = await db
    .select()
    .from(t.evidenceSources)
    .orderBy(asc(t.evidenceSources.sourceKey));
  return rows.map((row) => ({
    id: row.id,
    sourceKey: row.sourceKey,
    title: row.title,
    url: row.url,
    publisher: row.publisher,
    author: row.author,
    publishedAt: row.publishedAt,
    accessedAt: row.accessedAt,
    tier: row.evidenceTier,
    category: row.sourceCategory,
    sourceType: row.sourceType,
  }));
}

export interface ScopeEvaluationHistory {
  readonly scopeId: string;
  readonly scopeKey: string;
  readonly scopeLabel: string;
  readonly gameId: string;
  readonly gameTitle: string;
  readonly gameSlug: string;
  readonly evaluations: readonly {
    id: string;
    versionNumber: number;
    rubricVersion: string;
    status: EvaluationStatus;
    modeScope: string;
    publishedAt: string | null;
    supersedesEvaluationId: string | null;
    changeSummary: string | null;
    /**
     * `rubric_versions.locked_at` — when this evaluation's rubric generation was
     * fixed.
     *
     * Carried so the history view can order generations by real chronology.
     * Version numbers cannot do that job: they are per `(scope, rubric)`, so a
     * later rubric's v1 is genuinely newer than an earlier rubric's v3 while
     * sorting below it.
     */
    rubricLockedAt: string;
  }[];
}

/** One scope's whole evaluation series, newest first. */
export async function readScopeHistory(
  db: AdminDatabase,
  scopeId: string,
): Promise<ScopeEvaluationHistory | null> {
  const [scope] = await db
    .select({
      id: t.profileScopes.id,
      key: t.profileScopes.key,
      label: t.profileScopes.label,
      gameId: t.games.id,
      gameTitle: t.games.canonicalTitle,
      gameSlug: t.games.slug,
    })
    .from(t.profileScopes)
    .innerJoin(t.games, eq(t.games.id, t.profileScopes.gameId))
    .where(eq(t.profileScopes.id, scopeId))
    .limit(1);
  if (!scope) return null;

  const evaluations = await db
    .select({
      evaluation: t.evaluations,
      rubricLockedAt: t.rubricVersions.lockedAt,
    })
    .from(t.evaluations)
    .innerJoin(
      t.rubricVersions,
      eq(t.rubricVersions.version, t.evaluations.rubricVersion),
    )
    .where(eq(t.evaluations.scopeId, scopeId))
    .orderBy(asc(t.evaluations.rubricVersion), asc(t.evaluations.versionNumber));

  return {
    scopeId: scope.id,
    scopeKey: scope.key,
    scopeLabel: scope.label,
    gameId: scope.gameId,
    gameTitle: scope.gameTitle,
    gameSlug: scope.gameSlug,
    evaluations: evaluations
      .map(({ evaluation: row, rubricLockedAt }) => ({
        id: row.id,
        versionNumber: row.versionNumber,
        rubricVersion: row.rubricVersion,
        status: row.status,
        modeScope: row.modeScope,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        supersedesEvaluationId: row.supersedesEvaluationId,
        rubricLockedAt,
        changeSummary: row.changeSummary,
      }))
      .reverse(),
  };
}

/** ENTRYPOINT — the evaluation editor, for a verified editor. */
export async function readEvaluationPage(evaluationId: string) {
  return withAuthorizedAdminDatabase(async (db) => {
    const view = await readEvaluationEditor(db, evaluationId);
    if (!view) return { view: null, sources: [] as EvidenceSourceRow[] };
    return { view, sources: await listEvidenceSources(db) };
  });
}

export interface RubricGeneration {
  readonly rubricVersion: string;
  /** `rubric_versions.locked_at` for this generation. */
  readonly lockedAt: string;
  /** This lineage's versions, newest first. */
  readonly versions: ScopeEvaluationHistory["evaluations"];
}

/**
 * One scope's history, split into rubric generations and ordered.
 *
 * ── Why a flat list cannot be ordered ──────────────────────────────────────
 *
 * Version numbers are per `(scope, rubric)` — `evaluations_scope_version` makes
 * that a uniqueness rule, not a convention — so every rubric generation starts
 * again at 1. Sorting the whole series by version number therefore places a
 * later rubric's v1 *below* an earlier rubric's v3, and any label reading
 * "newest first" over that list is wrong for the generation an editor came for.
 *
 * ── What orders the generations ────────────────────────────────────────────
 *
 * `rubric_versions.locked_at`: real chronology, recorded in the database when
 * the rubric was fixed. The version string breaks ties deterministically.
 *
 * Deliberately NOT the version numbers inside each generation, and not a
 * lexical comparison of rubric versions alone — "10.0" sorts before "2.0" as a
 * string, and a rubric numbering scheme is not this function's business.
 */
export function groupByRubricGeneration(
  evaluations: ScopeEvaluationHistory["evaluations"],
): RubricGeneration[] {
  const byRubric = new Map<string, ScopeEvaluationHistory["evaluations"][number][]>();
  for (const row of evaluations) {
    const bucket = byRubric.get(row.rubricVersion);
    if (bucket) bucket.push(row);
    else byRubric.set(row.rubricVersion, [row]);
  }

  return [...byRubric.entries()]
    .map(([rubricVersion, rows]) => ({
      rubricVersion,
      lockedAt: rows[0]!.rubricLockedAt,
      // Within one lineage, the version number IS the order.
      versions: [...rows].sort((a, b) => b.versionNumber - a.versionNumber),
    }))
    .sort(
      (a, b) =>
        b.lockedAt.localeCompare(a.lockedAt) ||
        b.rubricVersion.localeCompare(a.rubricVersion),
    );
}

/** ENTRYPOINT — one scope's evaluation history, for a verified editor. */
export async function readScopeHistoryPage(scopeId: string) {
  return withAuthorizedAdminDatabase((db) => readScopeHistory(db, scopeId));
}

/** Drafts and review rows across the catalogue, for the dashboard. */
export async function listOpenDrafts(db: AdminDatabase) {
  return db
    .select({
      id: t.evaluations.id,
      status: t.evaluations.status,
      versionNumber: t.evaluations.versionNumber,
      gameTitle: t.games.canonicalTitle,
      scopeLabel: t.profileScopes.label,
    })
    .from(t.evaluations)
    .innerJoin(t.games, eq(t.games.id, t.evaluations.gameId))
    .innerJoin(t.profileScopes, eq(t.profileScopes.id, t.evaluations.scopeId))
    .where(inArray(t.evaluations.status, ["draft", "review"]))
    .orderBy(asc(t.games.canonicalTitle), asc(t.profileScopes.displayOrder));
}

/** Guard used by write paths that must not touch a frozen snapshot. */
export async function assertEvaluationEditable(
  db: AdminDatabase,
  evaluationId: string,
): Promise<void> {
  const [row] = await db
    .select({ status: t.evaluations.status })
    .from(t.evaluations)
    .where(eq(t.evaluations.id, evaluationId))
    .limit(1);
  if (!row) throw new Error("That evaluation does not exist.");
  if (row.status === "published" || row.status === "superseded") {
    throw new FrozenEvaluationError(row.status);
  }
}

/**
 * A published or superseded evaluation is a snapshot and does not change.
 *
 * The database enforces this with immutability triggers (ADR 0009); this class
 * exists so the editor can say so in a sentence instead of surfacing
 * "children of final evaluation … are immutable".
 */
export class FrozenEvaluationError extends Error {
  constructor(status: "published" | "superseded") {
    super(
      status === "published"
        ? "This evaluation is published. A published profile is a snapshot and is never edited — create a revision instead, which starts a new version and leaves this one exactly as it was."
        : "This evaluation is superseded history. It is kept as the record of what was published at the time, and is never edited.",
    );
    this.name = "FrozenEvaluationError";
  }
}
