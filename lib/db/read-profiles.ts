import { and, asc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "./client";
import { assertSchemaIsCurrent } from "./schema-version";
import * as t from "./schema";
import { DESIGN_SURFACES_ENABLED } from "@/lib/site";
import { UNKNOWN, type DimensionKey, type SubcriterionValue } from "@/lib/rubric";
import type {
  BlockType,
  Confidence,
  Evaluation,
  EvidenceSource,
  Game,
  GameArtwork,
  GameImage,
  GameWithEvaluation,
  ProfileScope,
  SubcriterionEntry,
  SubcriterionPlatformOverride,
} from "@/lib/profile/types";
import type { RubricVersion } from "@/lib/rubric";

/**
 * The Postgres read path for published Game Profiles.
 *
 * It assembles the SAME `GameWithEvaluation` records the typed fixtures
 * describe, and hands them to the same `buildProfileView`. There is deliberately
 * no parallel "database view model": one domain shape, two ways of loading it,
 * and `tests/db-read/parity.test.ts` proves the two agree profile by profile.
 *
 * ── Selection ──────────────────────────────────────────────────────────────
 *
 * A public profile is the evaluation that is `published` under the public rubric
 * version, for one profile scope. Nothing here orders by version number or by
 * creation date, because neither is what makes a row public: `draft` and
 * `review` rows routinely carry the *highest* version, and a superseded row is
 * preserved history. The database already guarantees at most one published row
 * per (scope, rubric), so this is a filter rather than a choice.
 *
 * ── One pass, not one per page ─────────────────────────────────────────────
 *
 * Every public route is prerendered, so this runs at build time. It loads the
 * whole published corpus in a fixed number of set-based queries rather than
 * querying per page — a few hundred games is a few tens of thousands of rows,
 * and the alternative is N+1 against every profile in the catalogue.
 *
 * ── History is not public ──────────────────────────────────────────────────
 *
 * Superseded evaluations are preserved in the database and are excluded from
 * `readPublishedProfiles`. Nothing public renders them.
 * `GameWithEvaluation.history` is therefore left undefined, which is exactly
 * what the fixtures do.
 *
 * They are not unreachable, though: `readEvaluationProfile` below loads any one
 * evaluation by id whatever its status, which is what the Phase 2D preview and
 * the admin revision-history view read. Both are behind the editorial guard.
 * The public selector is unchanged — history exposure stayed an admin-only
 * decision (Master Plan §17.2 open decision 5).
 */

/** Order for card listings: alphabetical by game, then by scope. */
const CATALOGUE_ORDER = [
  asc(t.games.canonicalTitle),
  asc(t.profileScopes.displayOrder),
  asc(t.profileScopes.key),
] as const;

/**
 * Either handle onto the same database.
 *
 * The public reader runs at build time on `lib/db/client.ts`; the editorial
 * preview runs while an editor waits, on `lib/admin/db.ts`. Both are
 * `drizzle<typeof schema>` over the same schema module, so the projection below
 * does not care which one it is handed — and taking the handle as a parameter
 * is what keeps it from caring. Typed from `getDatabase` rather than imported
 * from `lib/admin/db.ts` so the public read path acquires no dependency on the
 * admin module.
 *
 * The union includes a transaction handle because the publish gate re-runs
 * inside the publication transaction — checking readiness on a connection
 * outside it would be checking data that the transaction cannot see, and could
 * pass on a row another session is halfway through changing.
 */
type ProfileDatabase = ReturnType<typeof getDatabase>;
export type ProfileReader =
  | ProfileDatabase
  | Parameters<Parameters<ProfileDatabase["transaction"]>[0]>[0];

/**
 * The three rows that identify a profile. Shared so that the two selectors
 * below differ only in their WHERE clause, which is the only thing that should
 * differ: what a profile *is* must not depend on why it was loaded.
 */
const PROFILE_SELECTION = {
  evaluation: t.evaluations,
  scope: t.profileScopes,
  game: t.games,
} as const;

type ProfileSelectionRow = {
  evaluation: typeof t.evaluations.$inferSelect;
  scope: typeof t.profileScopes.$inferSelect;
  game: typeof t.games.$inferSelect;
};

/**
 * Every published profile, in catalogue order.
 *
 * `rubricVersion` is a parameter rather than a constant so the public selector
 * stays in one place (lib/data/games.ts) and this module stays a reader.
 *
 * The schema check comes first and costs one query per build. The queries below
 * name columns by hand, so a database behind this checkout fails on the first
 * one that mentions a pending migration's column — with a driver error, from a
 * build worker, naming a page that has nothing to do with it. See
 * lib/db/schema-version.ts.
 */
export async function readPublishedProfiles(
  rubricVersion: RubricVersion,
): Promise<GameWithEvaluation[]> {
  const db = getDatabase();
  await assertSchemaIsCurrent(db);

  const evaluationRows = await db
    .select(PROFILE_SELECTION)
    .from(t.evaluations)
    .innerJoin(t.profileScopes, eq(t.profileScopes.id, t.evaluations.scopeId))
    .innerJoin(t.games, eq(t.games.id, t.evaluations.gameId))
    .where(
      and(
        eq(t.evaluations.status, "published"),
        eq(t.evaluations.rubricVersion, rubricVersion),
      ),
    )
    .orderBy(...CATALOGUE_ORDER);

  return buildProfiles(db, evaluationRows);
}

/**
 * One evaluation as the profile it would be, whatever its status.
 *
 * This is what makes the Phase 2D preview faithful rather than a lookalike: it
 * is not a second view model assembled for the editor, it is the *same*
 * projection the public build runs, differing only in which row it starts from.
 * A draft renders through it, and so does superseded history, which is what the
 * revision-history view reads.
 *
 * Deliberately status-agnostic. The caller decides what may be looked at — the
 * admin guard, in every current caller — and `checkPublishReadiness` decides
 * what may be published. Filtering by status here would make preview unable to
 * show a draft, which is its entire purpose.
 *
 * NOTE ON ARTWORK. The clearance filter in `buildProfiles` applies here
 * unchanged, and that is correct rather than an oversight: an uncleared image
 * will not appear on the public page, so a preview that showed it would be
 * lying about what ships. The publish gate reports uncleared artwork as an
 * issue; the preview simply renders what the reader would render.
 */
export async function readEvaluationProfile(
  db: ProfileReader,
  evaluationId: string,
): Promise<GameWithEvaluation | null> {
  await assertSchemaIsCurrent(db);

  const [target] = await db
    .select({
      scopeId: t.evaluations.scopeId,
      rubricVersion: t.evaluations.rubricVersion,
    })
    .from(t.evaluations)
    .where(eq(t.evaluations.id, evaluationId))
    .limit(1);
  if (!target) return null;

  /*
   * This evaluation's series: same scope, SAME RUBRIC.
   *
   * `history` is what makes the supersession rules checkable. Loaded with only
   * the one evaluation, `validateGameRecord` sees a chain of length one, and
   * every revision — which by definition supersedes something — fails as
   * "the oldest in the chain but claims to supersede X". The gate would then
   * block the single most common publication there is.
   *
   * ── Why the rubric filter is not optional ─────────────────────────────────
   *
   * Version numbering and supersession are both rubric-local: the database's
   * uniqueness is per (scope, rubric), and a scope re-evaluated under a later
   * rubric starts a NEW series at version 1 rather than continuing the old one.
   * A rubric-1.0 evaluation is therefore not history for a rubric-2.0 one; it
   * is a different lineage describing the same experience under different
   * rules.
   *
   * Without this filter, the first evaluation authored under a second rubric
   * would be handed the entire earlier generation as its history, and the gate
   * would refuse it with a pile of true-sounding nonsense —
   * `history_rubric_mismatch` for every earlier row, `duplicate_version_number`
   * where the two generations both have a v1, and a broken supersession chain
   * because the new v1 correctly supersedes nothing.
   *
   * The admin revision-history page deliberately shows every rubric generation;
   * that is a different question ("what has this scope ever said") from the one
   * asked here ("what lineage is this evaluation part of").
   *
   * Nothing rendered changes: `buildProfileView` never reads `history`, so the
   * preview is byte-identical either way. This is loaded for the validator.
   */
  const seriesRows = await db
    .select(PROFILE_SELECTION)
    .from(t.evaluations)
    .innerJoin(t.profileScopes, eq(t.profileScopes.id, t.evaluations.scopeId))
    .innerJoin(t.games, eq(t.games.id, t.evaluations.gameId))
    .where(
      and(
        eq(t.evaluations.scopeId, target.scopeId),
        eq(t.evaluations.rubricVersion, target.rubricVersion),
      ),
    )
    .orderBy(asc(t.evaluations.versionNumber));

  const series = await buildProfiles(db, seriesRows);
  const index = series.findIndex(
    (record) => record.evaluation.id === evaluationId,
  );
  if (index === -1) return null;

  // Earlier versions only. A later draft is not this evaluation's history, and
  // including one would make the chain claim a successor that has not happened.
  return { ...series[index]!, history: series.slice(0, index).map((r) => r.evaluation) };
}

/**
 * Every published profile of one game, on either handle.
 *
 * This is the scope switcher's data, and the editorial preview needs its own
 * way to get it. The public page resolves siblings through
 * `listProfileScopes`, which reads the corpus assembled at build time — and an
 * admin request has no build-time corpus, so falling through to it would
 * quietly render the *fixture* catalogue's siblings beside a real draft. That
 * is precisely the lookalike failure a preview exists to rule out.
 *
 * Same projection, same published-only rule, same rubric filter; only the
 * handle differs.
 */
export async function readPublishedProfilesForGame(
  db: ProfileReader,
  gameId: string,
  rubricVersion: RubricVersion,
): Promise<GameWithEvaluation[]> {
  const evaluationRows = await db
    .select(PROFILE_SELECTION)
    .from(t.evaluations)
    .innerJoin(t.profileScopes, eq(t.profileScopes.id, t.evaluations.scopeId))
    .innerJoin(t.games, eq(t.games.id, t.evaluations.gameId))
    .where(
      and(
        eq(t.evaluations.gameId, gameId),
        eq(t.evaluations.status, "published"),
        eq(t.evaluations.rubricVersion, rubricVersion),
      ),
    )
    .orderBy(...CATALOGUE_ORDER);

  return buildProfiles(db, evaluationRows);
}

/**
 * Rows → domain records, in a fixed number of set-based queries.
 *
 * Everything below the selection is shared by both readers above. One profile
 * or the whole corpus takes the same code path, so the preview cannot drift
 * from the public page by construction — the failure mode that would otherwise
 * only show up after publication.
 */
async function buildProfiles(
  db: ProfileReader,
  evaluationRows: readonly ProfileSelectionRow[],
): Promise<GameWithEvaluation[]> {
  if (evaluationRows.length === 0) return [];

  const evaluationIds = evaluationRows.map((row) => row.evaluation.id);
  const gameIds = [...new Set(evaluationRows.map((row) => row.game.id))];

  const [
    scoreRows,
    overrideRows,
    assessmentRows,
    blockRows,
    tagRows,
    evidenceRows,
    platformRows,
    aliasRows,
    artworkRows,
  ] = await Promise.all([
    db
      .select({
        evaluationId: t.subcriterionScores.evaluationId,
        subcriterionId: t.subcriterionScores.subcriterionId,
        score: t.subcriterionScores.score,
        rationale: t.subcriterionScores.rationale,
        platformNote: t.subcriterionScores.platformNote,
        dimensionKey: t.dimensions.key,
        subcriterionKey: t.subcriteria.key,
        dimensionOrder: t.dimensions.displayOrder,
        subcriterionOrder: t.subcriteria.displayOrder,
      })
      .from(t.subcriterionScores)
      .innerJoin(
        t.subcriteria,
        eq(t.subcriteria.id, t.subcriterionScores.subcriterionId),
      )
      .innerJoin(t.dimensions, eq(t.dimensions.id, t.subcriteria.dimensionId))
      .where(inArray(t.subcriterionScores.evaluationId, evaluationIds))
      .orderBy(asc(t.dimensions.displayOrder), asc(t.subcriteria.displayOrder)),

    db
      .select({
        evaluationId: t.subcriterionPlatformOverrides.evaluationId,
        subcriterionId: t.subcriterionPlatformOverrides.subcriterionId,
        score: t.subcriterionPlatformOverrides.score,
        rationale: t.subcriterionPlatformOverrides.rationale,
        confidence: t.subcriterionPlatformOverrides.evidenceConfidence,
        platformSlug: t.platforms.slug,
      })
      .from(t.subcriterionPlatformOverrides)
      .innerJoin(
        t.platforms,
        eq(t.platforms.id, t.subcriterionPlatformOverrides.platformId),
      )
      .where(
        inArray(t.subcriterionPlatformOverrides.evaluationId, evaluationIds),
      )
      .orderBy(asc(t.platforms.slug)),

    db
      .select({
        evaluationId: t.dimensionAssessments.evaluationId,
        confidence: t.dimensionAssessments.confidence,
        dimensionKey: t.dimensions.key,
      })
      .from(t.dimensionAssessments)
      .innerJoin(
        t.dimensions,
        eq(t.dimensions.id, t.dimensionAssessments.dimensionId),
      )
      .where(inArray(t.dimensionAssessments.evaluationId, evaluationIds)),

    db
      .select()
      .from(t.profileBlocks)
      .where(inArray(t.profileBlocks.evaluationId, evaluationIds))
      .orderBy(asc(t.profileBlocks.blockType), asc(t.profileBlocks.itemOrder)),

    db
      .select({
        evaluationId: t.evaluationTags.evaluationId,
        intensity: t.evaluationTags.intensity,
        note: t.evaluationTags.note,
        key: t.tags.key,
      })
      .from(t.evaluationTags)
      .innerJoin(t.tags, eq(t.tags.id, t.evaluationTags.tagId))
      .where(inArray(t.evaluationTags.evaluationId, evaluationIds))
      .orderBy(asc(t.evaluationTags.displayOrder), asc(t.tags.key)),

    db
      .select({
        evaluationId: t.evaluationEvidenceLinks.evaluationId,
        dimensionKey: t.dimensions.key,
        dimensionOrder: t.dimensions.displayOrder,
        platformScope: t.evaluationEvidenceLinks.platformScope,
        note: t.evaluationEvidenceLinks.note,
        source: t.evidenceSources,
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
      .where(inArray(t.evaluationEvidenceLinks.evaluationId, evaluationIds))
      .orderBy(
        asc(t.evaluationEvidenceLinks.displayOrder),
        asc(t.evidenceSources.sourceKey),
        asc(t.dimensions.displayOrder),
      ),

    db
      .select({
        gameId: t.gamePlatforms.gameId,
        slug: t.platforms.slug,
        name: t.platforms.name,
      })
      .from(t.gamePlatforms)
      .innerJoin(t.platforms, eq(t.platforms.id, t.gamePlatforms.platformId))
      .where(inArray(t.gamePlatforms.gameId, gameIds)),

    db
      .select()
      .from(t.gameAliases)
      .where(inArray(t.gameAliases.gameId, gameIds))
      .orderBy(asc(t.gameAliases.alias)),

    /*
     * Artwork, filtered by clearance IN THE QUERY.
     *
     * Not a presentation detail. `GameProfile` is a client component, so the
     * whole `ProfileView` — including `game.artwork` — is serialised into the
     * prerendered payload, whether or not the stage renders an image. An
     * uncleared row loaded here would put its URL in production output where
     * `check:containment` would not find it, because its needles come from the
     * evaluation overlay rather than from the database.
     *
     * Filtering here mirrors `mayRender` exactly, and makes the leak
     * unrepresentable rather than merely unrendered.
     */
    db
      .select()
      .from(t.gameArtwork)
      .where(
        DESIGN_SURFACES_ENABLED
          ? inArray(t.gameArtwork.gameId, gameIds)
          : and(
              inArray(t.gameArtwork.gameId, gameIds),
              eq(t.gameArtwork.clearance, "production"),
            ),
      ),
  ]);

  const scoresByEvaluation = groupBy(scoreRows, (row) => row.evaluationId);
  const overridesByScore = groupBy(
    overrideRows,
    (row) => `${row.evaluationId} ${row.subcriterionId}`,
  );
  const assessmentsByEvaluation = groupBy(
    assessmentRows,
    (row) => row.evaluationId,
  );
  const blocksByEvaluation = groupBy(blockRows, (row) => row.evaluationId);
  const tagsByEvaluation = groupBy(tagRows, (row) => row.evaluationId);
  const evidenceByEvaluation = groupBy(evidenceRows, (row) => row.evaluationId);
  const platformsByGame = groupBy(platformRows, (row) => row.gameId);
  const aliasesByGame = groupBy(aliasRows, (row) => row.gameId);
  const artworkByGame = groupBy(artworkRows, (row) => row.gameId);

  return evaluationRows.map(({ evaluation, scope, game }) => ({
    game: toGame(
      game,
      platformsByGame.get(game.id) ?? [],
      aliasesByGame.get(game.id) ?? [],
      artworkByGame.get(game.id) ?? [],
    ),
    scope: toScope(scope),
    evaluation: toEvaluation(
      evaluation,
      scoresByEvaluation.get(evaluation.id) ?? [],
      overridesByScore,
      assessmentsByEvaluation.get(evaluation.id) ?? [],
      blocksByEvaluation.get(evaluation.id) ?? [],
      tagsByEvaluation.get(evaluation.id) ?? [],
      evidenceByEvaluation.get(evaluation.id) ?? [],
    ),
  }));
}

// ---------------------------------------------------------------------------
// Row → domain
// ---------------------------------------------------------------------------

function toGame(
  row: typeof t.games.$inferSelect,
  platforms: readonly { slug: string; name: string }[],
  aliases: readonly (typeof t.gameAliases.$inferSelect)[],
  artwork: readonly (typeof t.gameArtwork.$inferSelect)[],
): Game {
  return {
    id: row.id,
    slug: row.slug,
    canonicalTitle: row.canonicalTitle,
    summary: row.summary ?? "",
    developerText: row.developerText ?? "",
    publisherText: row.publisherText ?? "",
    firstReleaseDate: row.firstReleaseDate ?? "",
    releaseStatus: row.releaseStatus,
    platforms: platforms.map(({ slug, name }) => ({ slug, name })),
    aliases: aliases.map((alias) => alias.alias),
    ...(artwork.length > 0 ? { artwork: toArtwork(artwork) } : {}),
  };
}

/**
 * One artwork record per game, carrying whichever roles exist.
 *
 * The rights fields live on the record rather than per image, matching the
 * application model: a game's art is held on one basis, under one clearance,
 * credited to one holder. Rows for one game therefore agree on them, and the
 * first row is as good as any — the database enforces one row per (game, role),
 * so "first" here means "the cover row or the hero row", not an arbitrary pick
 * between conflicting claims.
 */
function toArtwork(
  rows: readonly (typeof t.gameArtwork.$inferSelect)[],
): GameArtwork {
  const first = rows[0]!;
  const image = (role: "cover" | "hero"): GameImage | undefined => {
    const row = rows.find((candidate) => candidate.role === role);
    if (!row) return undefined;
    return {
      url: row.url,
      width: row.width,
      height: row.height,
      ...(row.altText ? { alt: row.altText } : {}),
      ...(row.focus ? { focus: row.focus } : {}),
    };
  };

  return {
    ...(image("cover") ? { cover: image("cover") } : {}),
    ...(image("hero") ? { hero: image("hero") } : {}),
    source: first.source as GameArtwork["source"],
    ...(first.externalId ? { externalId: first.externalId } : {}),
    clearance: first.clearance,
    basis: first.basis,
    ...(first.credit ? { credit: first.credit } : {}),
    ...(first.sourcePage ? { sourcePage: first.sourcePage } : {}),
    ...(first.retrievedAt ? { retrieved: first.retrievedAt } : {}),
  };
}

function toScope(row: typeof t.profileScopes.$inferSelect): ProfileScope {
  return {
    id: row.id,
    gameId: row.gameId,
    key: row.key,
    label: row.label,
    ...(row.summary ? { summary: row.summary } : {}),
    isPrimary: row.isPrimary,
    displayOrder: row.displayOrder,
  };
}

function toEvaluation(
  row: typeof t.evaluations.$inferSelect,
  scores: readonly ScoreRow[],
  overridesByScore: Map<string, readonly OverrideRow[]>,
  assessments: readonly { dimensionKey: string; confidence: Confidence }[],
  blocks: readonly (typeof t.profileBlocks.$inferSelect)[],
  tags: readonly {
    key: string;
    intensity: "low" | "medium" | "high" | null;
    note: string | null;
  }[],
  evidence: readonly EvidenceRow[],
): Evaluation {
  const dimensions: Record<string, Record<string, SubcriterionEntry>> = {};
  for (const score of scores) {
    const overrides =
      overridesByScore.get(`${score.evaluationId} ${score.subcriterionId}`) ??
      [];
    (dimensions[score.dimensionKey] ??= {})[score.subcriterionKey] = {
      value: toSubcriterionValue(score.score),
      rationale: score.rationale ?? "",
      ...(score.platformNote ? { platformNote: score.platformNote } : {}),
      ...(overrides.length > 0
        ? { platformOverrides: overrides.map(toPlatformOverride) }
        : {}),
    };
  }

  const dimensionConfidence: Record<string, Confidence> = {};
  for (const assessment of assessments) {
    dimensionConfidence[assessment.dimensionKey] = assessment.confidence;
  }

  const blocksByType: Record<BlockType, string[]> = {
    great_fit: [],
    know_before: [],
    probably_not: [],
  };
  for (const block of blocks) blocksByType[block.blockType].push(block.text);

  return {
    id: row.id,
    gameId: row.gameId,
    scopeId: row.scopeId,
    rubricVersion: row.rubricVersion as RubricVersion,
    versionNumber: row.versionNumber,
    scope: {
      edition: row.editionScope,
      mode: row.modeScope,
      platforms: row.platformScope,
      buildOrPatch: row.buildOrPatchScope,
      ...(row.currentStateCutoffAt
        ? { currentStateCutoff: row.currentStateCutoffAt }
        : {}),
    },
    status: row.status,
    evidenceStatus: row.evidenceStatus,
    ...(row.evidenceMaturity ? { evidenceMaturity: row.evidenceMaturity } : {}),
    confidence: row.confidence,
    dimensionConfidence: dimensionConfidence as Record<DimensionKey, Confidence>,
    evidenceCutoffAt: row.evidenceCutoffAt,
    releaseContext: row.releaseContext ?? "",
    oneLineExperience: row.oneLineExperience ?? "",
    primaryPull: row.primaryPull ?? "",
    primaryRisk: row.primaryRisk ?? "",
    dimensions: dimensions as Evaluation["dimensions"],
    blocks: blocksByType,
    tags: tags.map((tag) => ({
      key: tag.key,
      ...(tag.intensity ? { intensity: tag.intensity } : {}),
      ...(tag.note ? { note: tag.note } : {}),
    })),
    sources: toSources(evidence),
    evidenceLedger: row.evidenceLedger,
    scoreProvenance: {
      kind: row.scoreProvenance,
      ...(row.calibrationRound
        ? { round: row.calibrationRound as "round_1" }
        : {}),
      ...(row.provenanceNote ? { note: row.provenanceNote } : {}),
    },
    ...(row.publishedAt ? { publishedAt: toIsoDate(row.publishedAt) } : {}),
    ...(row.supersedesEvaluationId
      ? { supersedesEvaluationId: row.supersedesEvaluationId }
      : {}),
    ...(row.changeSummary ? { changeSummary: row.changeSummary } : {}),
    ...(row.platformWarning ? { platformWarning: row.platformWarning } : {}),
  };
}

/**
 * Evidence links, collapsed back into the source-shaped model the product uses.
 *
 * The database stores one link per (source, dimension) because a source
 * routinely bears on several dimensions and is still one source. The public
 * model instead hangs `supports: DimensionKey[]` off the source, so the rows are
 * regrouped here.
 *
 * `note` and `platformScope` live on the link in the database and on the source
 * in the public model. Every link the seed writes for one source carries the
 * same values, so the first is faithful. Per-link notes are representable in the
 * schema and not in the public model — a real modelling gap, and one the
 * evidence manager will have to close in Phase 2C rather than something to
 * paper over here.
 */
function toSources(rows: readonly EvidenceRow[]): EvidenceSource[] {
  const bySource = new Map<string, EvidenceRow[]>();
  for (const row of rows) {
    const existing = bySource.get(row.source.sourceKey);
    if (existing) existing.push(row);
    else bySource.set(row.source.sourceKey, [row]);
  }

  return [...bySource.values()].map((links) => {
    const { source } = links[0]!;
    const supports = [
      ...new Set(
        links
          .filter((link) => link.dimensionKey !== null)
          .map((link) => link.dimensionKey as DimensionKey),
      ),
    ];
    const described = links.find((link) => link.note !== null) ?? links[0]!;
    const scoped = links.find((link) => link.platformScope !== null);

    return {
      id: source.sourceKey,
      title: source.title,
      ...(source.url ? { url: source.url } : {}),
      ...(source.publisher ? { publisher: source.publisher } : {}),
      ...(source.author ? { author: source.author } : {}),
      ...(source.publishedAt ? { publishedAt: source.publishedAt } : {}),
      tier: source.evidenceTier,
      category: source.sourceCategory,
      ...(supports.length > 0 ? { supports } : {}),
      ...(scoped?.platformScope
        ? { platformScope: scoped.platformScope }
        : {}),
      ...(described.note ? { note: described.note } : {}),
    };
  });
}

function toPlatformOverride(row: OverrideRow): SubcriterionPlatformOverride {
  return {
    platform: row.platformSlug,
    value: toSubcriterionValue(row.score),
    rationale: row.rationale,
    ...(row.confidence ? { confidence: row.confidence } : {}),
  };
}

/**
 * NULL is an explicit editorial unknown, never zero (Rubric §1, §22).
 *
 * `numeric` arrives as a string from the driver; parsing it here rather than
 * anywhere downstream keeps the string form from leaking into arithmetic.
 */
function toSubcriterionValue(score: string | null): SubcriterionValue {
  return score === null ? UNKNOWN : (Number(score) as SubcriterionValue);
}

/**
 * `published_at` is a timestamptz holding what the product means as a date.
 * The session is pinned to UTC (lib/db/client.ts), so this is unambiguous.
 */
function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function groupBy<T, K>(rows: readonly T[], key: (row: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const row of rows) {
    const existing = groups.get(key(row));
    if (existing) existing.push(row);
    else groups.set(key(row), [row]);
  }
  return groups;
}

// Shapes of the joined selects above, named so the assemblers can be typed
// without repeating each select's projection.
type OverrideRow = {
  evaluationId: string;
  subcriterionId: string;
  score: string | null;
  rationale: string;
  confidence: Confidence | null;
  platformSlug: string;
};

type EvidenceRow = {
  evaluationId: string;
  dimensionKey: string | null;
  dimensionOrder: number | null;
  platformScope: string[] | null;
  note: string | null;
  source: typeof t.evidenceSources.$inferSelect;
};

type ScoreRow = {
  evaluationId: string;
  subcriterionId: string;
  score: string | null;
  rationale: string | null;
  platformNote: string | null;
  dimensionKey: string;
  subcriterionKey: string;
};
