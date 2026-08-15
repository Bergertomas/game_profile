import { asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { withAuthorizedAdminDatabase, type AdminDatabase } from "@/lib/admin/db";
import * as t from "@/lib/db/schema";

/**
 * Editorial reads.
 *
 * Separate from `lib/db/read-profiles.ts`, which loads the *published* corpus
 * for the public build. This one sees everything: drafts, review rows,
 * superseded history, scopes with no evaluation at all, and artwork of every
 * clearance. That difference is the reason it is a different module rather than
 * a flag on the other — a public reader that could be asked for draft rows is
 * one refactor away from publishing one.
 *
 * ── Two kinds of function here, and the distinction is the security boundary ─
 *
 * The `read*Page` functions at the bottom are the ENTRYPOINTS. They authorise
 * before they open a connection, so unpublished editorial is guarded next to
 * the data rather than by a parent layout that Partial Rendering may not
 * re-run. Pages call these and nothing else.
 *
 * Everything above them takes an already-open `db` handle and does not
 * authorise. They are composition units — one connection, several queries —
 * and are not reachable from a route without going through an entrypoint.
 */

export interface GameListEntry {
  readonly id: string;
  readonly slug: string;
  readonly canonicalTitle: string;
  readonly releaseStatus: "released" | "upcoming" | "early_access";
  readonly scopeCount: number;
  readonly publishedCount: number;
  readonly draftCount: number;
  /** False when a game has scopes but none is primary — a routing hazard. */
  readonly hasPrimaryScope: boolean;
  readonly updatedAt: string;
}

/**
 * The catalogue, as an editor sees it.
 *
 * Counts come from grouped subqueries rather than from loading every scope and
 * evaluation: the dashboard is a list, and a list that N+1s over the catalogue
 * gets slower every time the product succeeds.
 */
export async function listGamesForAdmin(
  db: AdminDatabase,
): Promise<GameListEntry[]> {
  const scopeCounts = db
    .select({
      gameId: t.profileScopes.gameId,
      scopes: count().as("scopes"),
      primaries: sql<number>`count(*) filter (where ${t.profileScopes.isPrimary})`.as(
        "primaries",
      ),
    })
    .from(t.profileScopes)
    .groupBy(t.profileScopes.gameId)
    .as("scope_counts");

  const evaluationCounts = db
    .select({
      gameId: t.evaluations.gameId,
      published:
        sql<number>`count(*) filter (where ${t.evaluations.status} = 'published')`.as(
          "published",
        ),
      drafts:
        sql<number>`count(*) filter (where ${t.evaluations.status} in ('draft','review'))`.as(
          "drafts",
        ),
    })
    .from(t.evaluations)
    .groupBy(t.evaluations.gameId)
    .as("evaluation_counts");

  const rows = await db
    .select({
      id: t.games.id,
      slug: t.games.slug,
      canonicalTitle: t.games.canonicalTitle,
      releaseStatus: t.games.releaseStatus,
      updatedAt: t.games.updatedAt,
      scopes: scopeCounts.scopes,
      primaries: scopeCounts.primaries,
      published: evaluationCounts.published,
      drafts: evaluationCounts.drafts,
    })
    .from(t.games)
    .leftJoin(scopeCounts, eq(scopeCounts.gameId, t.games.id))
    .leftJoin(evaluationCounts, eq(evaluationCounts.gameId, t.games.id))
    .orderBy(asc(t.games.canonicalTitle));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    canonicalTitle: row.canonicalTitle,
    releaseStatus: row.releaseStatus,
    scopeCount: Number(row.scopes ?? 0),
    publishedCount: Number(row.published ?? 0),
    draftCount: Number(row.drafts ?? 0),
    hasPrimaryScope: Number(row.primaries ?? 0) > 0,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export interface EvaluationSummary {
  readonly id: string;
  readonly rubricVersion: string;
  readonly versionNumber: number;
  readonly status: "draft" | "review" | "published" | "superseded";
  readonly evidenceStatus: "verified" | "provisional" | "pre_release";
  readonly confidence: "low" | "medium" | "high";
  readonly modeScope: string;
  readonly editionScope: string;
  readonly publishedAt: string | null;
  readonly createdAt: string;
  readonly supersedesEvaluationId: string | null;
  readonly changeSummary: string | null;
}

export interface ScopeAdminView {
  readonly id: string;
  readonly key: string;
  readonly label: string;
  readonly summary: string | null;
  readonly isPrimary: boolean;
  readonly displayOrder: number;
  /** Newest first, across every status. This is the evaluation history. */
  readonly evaluations: readonly EvaluationSummary[];
  readonly publishedRubricVersions: readonly string[];
  /**
   * Rubric versions where this scope has unpublished work and the game's
   * primary scope has nothing published — i.e. where publishing this scope
   * would be refused by the database. See `primaryPublicationBlockers`.
   */
  readonly blockedRubricVersions: readonly string[];
}

export interface ArtworkAdminView {
  readonly role: "cover" | "hero";
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly altText: string | null;
  readonly focus: string | null;
  readonly source: string;
  readonly externalId: string | null;
  readonly clearance: "production" | "evaluation";
  readonly basis:
    | "licence"
    | "provider-terms"
    | "press-kit"
    | "permission"
    | "internal-evaluation";
  readonly credit: string | null;
  readonly sourcePage: string | null;
  readonly retrievedAt: string | null;
}

export interface GameAdminView {
  readonly id: string;
  readonly slug: string;
  readonly canonicalTitle: string;
  readonly summary: string | null;
  readonly developerText: string | null;
  readonly publisherText: string | null;
  readonly releaseStatus: "released" | "upcoming" | "early_access";
  readonly firstReleaseDate: string | null;
  readonly aliases: readonly { alias: string; aliasType: string | null }[];
  readonly platforms: readonly {
    platformId: string;
    slug: string;
    name: string;
    releaseDate: string | null;
    performanceNotes: string | null;
  }[];
  readonly externalIds: readonly {
    provider: string;
    externalId: string;
    externalUrl: string | null;
  }[];
  readonly artwork: readonly ArtworkAdminView[];
  readonly scopes: readonly ScopeAdminView[];
}

/** One game and everything hanging off it. Null when the id is unknown. */
export async function getGameForAdmin(
  db: AdminDatabase,
  gameId: string,
): Promise<GameAdminView | null> {
  const [game] = await db
    .select()
    .from(t.games)
    .where(eq(t.games.id, gameId))
    .limit(1);
  if (!game) return null;

  const [aliases, platformRows, externalIds, artwork, scopes] = await Promise.all([
    db
      .select()
      .from(t.gameAliases)
      .where(eq(t.gameAliases.gameId, gameId))
      .orderBy(asc(t.gameAliases.alias)),
    db
      .select({
        platformId: t.platforms.id,
        slug: t.platforms.slug,
        name: t.platforms.name,
        releaseDate: t.gamePlatforms.releaseDate,
        performanceNotes: t.gamePlatforms.performanceNotes,
      })
      .from(t.gamePlatforms)
      .innerJoin(t.platforms, eq(t.platforms.id, t.gamePlatforms.platformId))
      .where(eq(t.gamePlatforms.gameId, gameId))
      .orderBy(asc(t.platforms.name)),
    db
      .select()
      .from(t.gameExternalIds)
      .where(eq(t.gameExternalIds.gameId, gameId))
      .orderBy(asc(t.gameExternalIds.provider)),
    db
      .select()
      .from(t.gameArtwork)
      .where(eq(t.gameArtwork.gameId, gameId))
      .orderBy(asc(t.gameArtwork.role)),
    db
      .select()
      .from(t.profileScopes)
      .where(eq(t.profileScopes.gameId, gameId))
      .orderBy(asc(t.profileScopes.displayOrder), asc(t.profileScopes.key)),
  ]);

  const scopeIds = scopes.map((scope) => scope.id);
  const evaluations = scopeIds.length
    ? await db
        .select()
        .from(t.evaluations)
        .where(inArray(t.evaluations.scopeId, scopeIds))
        .orderBy(
          desc(t.evaluations.rubricVersion),
          desc(t.evaluations.versionNumber),
        )
    : [];

  const byScope = new Map<string, EvaluationSummary[]>();
  for (const row of evaluations) {
    const list = byScope.get(row.scopeId) ?? [];
    list.push({
      id: row.id,
      rubricVersion: row.rubricVersion,
      versionNumber: row.versionNumber,
      status: row.status,
      evidenceStatus: row.evidenceStatus,
      confidence: row.confidence,
      modeScope: row.modeScope,
      editionScope: row.editionScope,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      supersedesEvaluationId: row.supersedesEvaluationId,
      changeSummary: row.changeSummary,
    });
    byScope.set(row.scopeId, list);
  }

  const primary = scopes.find((scope) => scope.isPrimary);
  const primaryPublished = new Set(
    primary
      ? (byScope.get(primary.id) ?? [])
          .filter((evaluation) => evaluation.status === "published")
          .map((evaluation) => evaluation.rubricVersion)
      : [],
  );

  const scopeViews: ScopeAdminView[] = scopes.map((scope) => {
    const own = byScope.get(scope.id) ?? [];
    const publishedRubricVersions = [
      ...new Set(
        own
          .filter((evaluation) => evaluation.status === "published")
          .map((evaluation) => evaluation.rubricVersion),
      ),
    ].sort();
    const blockedRubricVersions = scope.isPrimary
      ? []
      : [
          ...new Set(
            own
              .filter(
                (evaluation) =>
                  evaluation.status === "draft" || evaluation.status === "review",
              )
              .map((evaluation) => evaluation.rubricVersion)
              .filter((version) => !primaryPublished.has(version)),
          ),
        ].sort();

    return {
      id: scope.id,
      key: scope.key,
      label: scope.label,
      summary: scope.summary,
      isPrimary: scope.isPrimary,
      displayOrder: scope.displayOrder,
      evaluations: own,
      publishedRubricVersions,
      blockedRubricVersions,
    };
  });

  return {
    id: game.id,
    slug: game.slug,
    canonicalTitle: game.canonicalTitle,
    summary: game.summary,
    developerText: game.developerText,
    publisherText: game.publisherText,
    releaseStatus: game.releaseStatus,
    firstReleaseDate: game.firstReleaseDate,
    aliases: aliases.map((row) => ({
      alias: row.alias,
      aliasType: row.aliasType,
    })),
    platforms: platformRows,
    externalIds: externalIds.map((row) => ({
      provider: row.provider,
      externalId: row.externalId,
      externalUrl: row.externalUrl,
    })),
    artwork,
    scopes: scopeViews,
  };
}

/** Every platform the catalogue knows, for the picker. */
export async function listPlatforms(db: AdminDatabase) {
  return db
    .select()
    .from(t.platforms)
    .orderBy(asc(t.platforms.name));
}

/** Resolve a game id from its slug, for links that carry the public address. */
export async function findGameIdBySlug(
  db: AdminDatabase,
  slug: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: t.games.id })
    .from(t.games)
    .where(eq(t.games.slug, slug))
    .limit(1);
  return row?.id ?? null;
}

export interface DashboardSummary {
  readonly games: number;
  readonly scopes: number;
  readonly publishedProfiles: number;
  readonly drafts: number;
  /** Games with at least one scope but no primary — the canonical URL is dead. */
  readonly gamesWithoutPrimaryScope: readonly {
    id: string;
    canonicalTitle: string;
  }[];
  /** Artwork an editor has recorded but production may not render (ADR 0011). */
  readonly evaluationOnlyArtwork: number;
}

/**
 * The dashboard's counts, and the two conditions worth surfacing at the top.
 *
 * Deliberately not a "queue": the reassessment queue is Phase 2D (§8.7) and
 * needs evaluation authoring to exist before it has anything to say. What is
 * here is the state 2B can actually observe and that an editor can act on now.
 */
export async function readDashboard(
  db: AdminDatabase,
): Promise<DashboardSummary> {
  const [games, scopes, published, drafts, orphans, evaluationArtwork] =
    await Promise.all([
      db.select({ value: count() }).from(t.games),
      db.select({ value: count() }).from(t.profileScopes),
      db
        .select({ value: count() })
        .from(t.evaluations)
        .where(eq(t.evaluations.status, "published")),
      db
        .select({ value: count() })
        .from(t.evaluations)
        .where(inArray(t.evaluations.status, ["draft", "review"])),
      db
        .select({ id: t.games.id, canonicalTitle: t.games.canonicalTitle })
        .from(t.games)
        .innerJoin(t.profileScopes, eq(t.profileScopes.gameId, t.games.id))
        .groupBy(t.games.id, t.games.canonicalTitle)
        .having(sql`count(*) filter (where ${t.profileScopes.isPrimary}) = 0`)
        .orderBy(asc(t.games.canonicalTitle)),
      db
        .select({ value: count() })
        .from(t.gameArtwork)
        .where(eq(t.gameArtwork.clearance, "evaluation")),
    ]);

  return {
    games: games[0]?.value ?? 0,
    scopes: scopes[0]?.value ?? 0,
    publishedProfiles: published[0]?.value ?? 0,
    drafts: drafts[0]?.value ?? 0,
    gamesWithoutPrimaryScope: orphans,
    evaluationOnlyArtwork: evaluationArtwork[0]?.value ?? 0,
  };
}

/**
 * Whether a scope may be published under a rubric version today, and why not.
 *
 * The rule is ADR 0016's second invariant: for every rubric version under which
 * a game publishes any scope, its primary scope must publish under that same
 * version. The database enforces it with a deferred constraint trigger, so this
 * function is not the enforcement — it is the explanation, so an editor meets
 * the rule in the interface rather than as a constraint violation.
 */
export function primaryPublicationBlockers(
  game: Pick<GameAdminView, "scopes">,
): readonly { scopeKey: string; rubricVersion: string; message: string }[] {
  const primary = game.scopes.find((scope) => scope.isPrimary);
  return game.scopes.flatMap((scope) =>
    scope.blockedRubricVersions.map((rubricVersion) => ({
      scopeKey: scope.key,
      rubricVersion,
      message: primary
        ? `“${scope.label}” cannot be published under rubric ${rubricVersion} until “${primary.label}”, the primary scope, is published under the same rubric. Otherwise the game’s own address would have no profile to answer with.`
        : `“${scope.label}” cannot be published until this game has a primary scope. The game’s own address would have nothing to answer with.`,
    })),
  );
}

/**
 * ENTRYPOINT — one game's editor, for a verified editor.
 *
 * Both reads share one connection, which is the reason this exists rather than
 * a page calling `getGameForAdmin` and `listPlatforms` separately: each call to
 * the database helper opens and closes its own connection.
 */
export async function readGamePage(gameId: string) {
  return withAuthorizedAdminDatabase(async (db) => {
    const [game, platforms] = await Promise.all([
      getGameForAdmin(db, gameId),
      listPlatforms(db),
    ]);
    return { game, platforms };
  });
}

/** ENTRYPOINT — the dashboard, for a verified editor. */
export async function readDashboardPage() {
  return withAuthorizedAdminDatabase(async (db) => ({
    summary: await readDashboard(db),
    games: await listGamesForAdmin(db),
  }));
}

/** ENTRYPOINT — the catalogue listing, for a verified editor. */
export async function readGamesPage() {
  return withAuthorizedAdminDatabase(listGamesForAdmin);
}
