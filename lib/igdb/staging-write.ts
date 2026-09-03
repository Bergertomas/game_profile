import { and, eq, inArray, sql } from "drizzle-orm";
import type { AdminTransaction } from "@/lib/admin/db";
import * as t from "@/lib/db/schema";
import { classifyChange, type IgdbChangeEvent, type StagedGameSnapshot } from "./change";
import { IGDB_PROVIDER } from "./contract";
import type {
  NormalizedStaging,
  StagedAlternativeName,
  StagedExternalGame,
  StagedGame,
  StagedImage,
  StagedInvolvedCompany,
  StagedRelation,
  StagedReleaseDate,
} from "./normalize";

/**
 * Writing provider staging into Postgres.
 *
 * ── What this module will never do ─────────────────────────────────────────
 *
 * It does not import, reference or write `evaluations`, `subcriterion_scores`,
 * `game_artwork`, `profile_scopes` or `games`. A staging run cannot create a
 * game, publish a profile, move a score or clear an image; a test walks these
 * imports and the row counts of those tables across a full staging run to
 * prove it (issue #48 §9). The single write across the boundary is
 * `decideIdentityCandidate`, which — only when a NAMED person accepts a
 * `canonical_game` candidate — records the provider id in `game_external_ids`,
 * the table that has always held provider ids (Plan §12.3).
 *
 * Every function takes a transaction so a run is one commit or nothing, like
 * the editorial writes in `lib/admin/write.ts`.
 */

export type IgdbSourceKind = "api" | "dump" | "fixture";

export interface IngestionRunInput {
  readonly sourceKind: IgdbSourceKind;
  readonly sourceRef: string;
  readonly note?: string;
}

export async function beginIngestionRun(tx: AdminTransaction, input: IngestionRunInput): Promise<string> {
  const [row] = await tx
    .insert(t.igdbIngestionRuns)
    .values({ sourceKind: input.sourceKind, sourceRef: input.sourceRef, note: input.note ?? null })
    .returning({ id: t.igdbIngestionRuns.id });
  if (!row) throw new Error("Insert returned no ingestion run.");
  return row.id;
}

export async function finishIngestionRun(tx: AdminTransaction, runId: string, recordCount: number): Promise<void> {
  await tx
    .update(t.igdbIngestionRuns)
    .set({ finishedAt: sql`now()`, recordCount })
    .where(eq(t.igdbIngestionRuns.id, runId));
}

function toDate(iso: string | null): Date | null {
  return iso === null ? null : new Date(iso);
}
function toIso(date: Date | null): string | null {
  return date === null ? null : date.toISOString();
}

/** Read what is currently staged for one IGDB record, in the normalized shape. */
export async function readStagedSnapshot(tx: AdminTransaction, igdbId: number): Promise<StagedGameSnapshot | null> {
  const [game] = await tx.select().from(t.igdbGames).where(eq(t.igdbGames.igdbId, igdbId)).limit(1);
  if (!game) return null;
  const [relations, releaseDates, images, companies, aliases, externalGames] = await Promise.all([
    tx.select().from(t.igdbGameRelations).where(eq(t.igdbGameRelations.assertedByIgdbId, igdbId)),
    tx.select().from(t.igdbReleaseDates).where(eq(t.igdbReleaseDates.igdbGameId, igdbId)),
    tx.select().from(t.igdbImages).where(eq(t.igdbImages.igdbGameId, igdbId)),
    tx.select().from(t.igdbInvolvedCompanies).where(eq(t.igdbInvolvedCompanies.igdbGameId, igdbId)),
    tx.select().from(t.igdbAlternativeNames).where(eq(t.igdbAlternativeNames.igdbGameId, igdbId)),
    tx.select().from(t.igdbExternalGames).where(eq(t.igdbExternalGames.igdbGameId, igdbId)),
  ]);
  const staged: StagedGame = {
    igdbId: game.igdbId,
    checksum: game.checksum,
    igdbUpdatedAt: toIso(game.igdbUpdatedAt),
    igdbCreatedAt: toIso(game.igdbCreatedAt),
    name: game.name,
    slug: game.slug,
    url: game.url,
    summary: game.summary,
    versionTitle: game.versionTitle,
    gameTypeId: game.gameTypeId,
    gameTypeName: game.gameTypeName,
    gameStatusId: game.gameStatusId,
    gameStatusName: game.gameStatusName,
    parentGameIgdbId: game.parentGameIgdbId,
    versionParentIgdbId: game.versionParentIgdbId,
    identityClass: game.identityClass,
    firstReleaseDate: game.firstReleaseDate,
    platformIgdbIds: [...game.platformIgdbIds].map(Number).sort((a, b) => a - b),
    raw: game.raw,
  };
  return {
    game: staged,
    relations: relations
      .map(
        (r): StagedRelation => ({
          subjectIgdbId: r.subjectIgdbId,
          objectIgdbId: r.objectIgdbId,
          kind: r.kind,
          sourceField: r.sourceField,
          assertedByIgdbId: r.assertedByIgdbId,
        }),
      )
      .sort((a, b) => a.subjectIgdbId - b.subjectIgdbId || a.objectIgdbId - b.objectIgdbId || a.kind.localeCompare(b.kind)),
    releaseDates: releaseDates
      .map(
        (rd): StagedReleaseDate => ({
          igdbId: rd.igdbId,
          igdbGameId: rd.igdbGameId,
          checksum: rd.checksum,
          igdbUpdatedAt: toIso(rd.igdbUpdatedAt),
          platformIgdbId: rd.platformIgdbId,
          platformName: rd.platformName,
          releaseDate: rd.releaseDate,
          dateFormatId: rd.dateFormatId,
          dateFormatName: rd.dateFormatName,
          releaseRegionId: rd.releaseRegionId,
          releaseRegionName: rd.releaseRegionName,
          statusId: rd.statusId,
          statusName: rd.statusName,
          human: rd.human,
          raw: rd.raw,
        }),
      )
      .sort((a, b) => a.igdbId - b.igdbId),
    images: images
      .map(
        (im): StagedImage => ({
          imageKind: im.imageKind,
          igdbId: im.igdbId,
          igdbGameId: im.igdbGameId,
          checksum: im.checksum,
          imageId: im.imageId,
          width: im.width,
          height: im.height,
          imageTypeId: im.imageTypeId,
          imageTypeName: im.imageTypeName,
          alphaChannel: im.alphaChannel,
          animated: im.animated,
          providerUrl: im.providerUrl,
          gameLocalizationIgdbId: im.gameLocalizationIgdbId,
          raw: im.raw,
        }),
      )
      .sort((a, b) => a.imageKind.localeCompare(b.imageKind) || a.igdbId - b.igdbId),
    companies: companies
      .map(
        (ic): StagedInvolvedCompany => ({
          igdbId: ic.igdbId,
          igdbGameId: ic.igdbGameId,
          checksum: ic.checksum,
          igdbUpdatedAt: toIso(ic.igdbUpdatedAt),
          companyIgdbId: ic.companyIgdbId,
          companyName: ic.companyName,
          developer: ic.developer,
          publisher: ic.publisher,
          porting: ic.porting,
          supporting: ic.supporting,
          raw: ic.raw,
        }),
      )
      .sort((a, b) => a.igdbId - b.igdbId),
    aliases: aliases
      .map(
        (an): StagedAlternativeName => ({
          igdbId: an.igdbId,
          igdbGameId: an.igdbGameId,
          checksum: an.checksum,
          name: an.name,
          comment: an.comment,
          raw: an.raw,
        }),
      )
      .sort((a, b) => a.igdbId - b.igdbId),
    externalGames: externalGames
      .map(
        (eg): StagedExternalGame => ({
          igdbId: eg.igdbId,
          igdbGameId: eg.igdbGameId,
          checksum: eg.checksum,
          igdbUpdatedAt: toIso(eg.igdbUpdatedAt),
          sourceId: eg.sourceId,
          sourceName: eg.sourceName,
          uid: eg.uid,
          name: eg.name,
          platformIgdbId: eg.platformIgdbId,
          url: eg.url,
          releaseFormatId: eg.releaseFormatId,
          releaseFormatName: eg.releaseFormatName,
          raw: eg.raw,
        }),
      )
      .sort((a, b) => a.igdbId - b.igdbId),
  };
}

export interface StagingWriteOptions {
  readonly runId: string;
  readonly sourceKind: IgdbSourceKind;
  readonly sourceRef: string;
  readonly fetchedAt: Date;
}

export interface StagingWriteReport {
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly changeEvents: readonly IgdbChangeEvent[];
}

/**
 * Stage one normalized batch. Idempotent: staging the same batch twice leaves
 * the tables identical and records no change event. A changed record is
 * re-staged and its change is classified and appended to `igdb_change_events`.
 */
export async function stageNormalized(
  tx: AdminTransaction,
  staging: NormalizedStaging,
  options: StagingWriteOptions,
): Promise<StagingWriteReport> {
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  const changeEvents: IgdbChangeEvent[] = [];
  const { runId, sourceKind, sourceRef, fetchedAt } = options;

  for (const game of staging.games) {
    const id = game.igdbId;
    const previous = await readStagedSnapshot(tx, id);
    const next: StagedGameSnapshot = {
      game,
      relations: staging.relations.filter((r) => r.assertedByIgdbId === id),
      releaseDates: staging.releaseDates.filter((rd) => rd.igdbGameId === id),
      images: staging.images.filter((im) => im.igdbGameId === id),
      companies: staging.companies.filter((ic) => ic.igdbGameId === id),
      aliases: staging.aliases.filter((an) => an.igdbGameId === id),
      externalGames: staging.externalGames.filter((eg) => eg.igdbGameId === id),
    };

    const event = previous ? classifyChange(previous, next) : null;
    if (previous && event === null) {
      unchanged += 1;
      continue;
    }

    const gameRow = {
      checksum: game.checksum,
      igdbUpdatedAt: toDate(game.igdbUpdatedAt),
      igdbCreatedAt: toDate(game.igdbCreatedAt),
      name: game.name,
      slug: game.slug,
      url: game.url,
      summary: game.summary,
      versionTitle: game.versionTitle,
      gameTypeId: game.gameTypeId,
      gameTypeName: game.gameTypeName,
      gameStatusId: game.gameStatusId,
      gameStatusName: game.gameStatusName,
      parentGameIgdbId: game.parentGameIgdbId,
      versionParentIgdbId: game.versionParentIgdbId,
      identityClass: game.identityClass,
      firstReleaseDate: game.firstReleaseDate,
      platformIgdbIds: [...game.platformIgdbIds],
      raw: game.raw,
      sourceKind,
      sourceRef,
      runId,
      fetchedAt,
    };

    if (!previous) {
      await tx.insert(t.igdbGames).values({ igdbId: id, ...gameRow });
      inserted += 1;
    } else {
      await tx
        .update(t.igdbGames)
        .set({ ...gameRow, lastChangedAt: sql`now()` })
        .where(eq(t.igdbGames.igdbId, id));
      updated += 1;
      // Replace the children this record's payload owns.
      await tx.delete(t.igdbGameRelations).where(eq(t.igdbGameRelations.assertedByIgdbId, id));
      await tx.delete(t.igdbReleaseDates).where(eq(t.igdbReleaseDates.igdbGameId, id));
      await tx.delete(t.igdbImages).where(eq(t.igdbImages.igdbGameId, id));
      await tx.delete(t.igdbInvolvedCompanies).where(eq(t.igdbInvolvedCompanies.igdbGameId, id));
      await tx.delete(t.igdbAlternativeNames).where(eq(t.igdbAlternativeNames.igdbGameId, id));
      await tx.delete(t.igdbExternalGames).where(eq(t.igdbExternalGames.igdbGameId, id));
    }

    if (next.relations.length > 0) {
      await tx.insert(t.igdbGameRelations).values(
        next.relations.map((r) => ({
          subjectIgdbId: r.subjectIgdbId,
          objectIgdbId: r.objectIgdbId,
          kind: r.kind,
          sourceField: r.sourceField,
          assertedByIgdbId: r.assertedByIgdbId,
          runId,
        })),
      );
    }
    if (next.releaseDates.length > 0) {
      await tx.insert(t.igdbReleaseDates).values(
        next.releaseDates.map((rd) => ({
          igdbId: rd.igdbId,
          igdbGameId: id,
          checksum: rd.checksum,
          igdbUpdatedAt: toDate(rd.igdbUpdatedAt),
          platformIgdbId: rd.platformIgdbId,
          platformName: rd.platformName,
          releaseDate: rd.releaseDate,
          dateFormatId: rd.dateFormatId,
          dateFormatName: rd.dateFormatName,
          releaseRegionId: rd.releaseRegionId,
          releaseRegionName: rd.releaseRegionName,
          statusId: rd.statusId,
          statusName: rd.statusName,
          human: rd.human,
          raw: rd.raw,
          runId,
          fetchedAt,
        })),
      );
    }
    if (next.images.length > 0) {
      await tx.insert(t.igdbImages).values(
        next.images.map((im) => ({
          imageKind: im.imageKind,
          igdbId: im.igdbId,
          igdbGameId: id,
          checksum: im.checksum,
          imageId: im.imageId,
          width: im.width,
          height: im.height,
          imageTypeId: im.imageTypeId,
          imageTypeName: im.imageTypeName,
          alphaChannel: im.alphaChannel,
          animated: im.animated,
          providerUrl: im.providerUrl,
          gameLocalizationIgdbId: im.gameLocalizationIgdbId,
          raw: im.raw,
          runId,
          fetchedAt,
        })),
      );
    }
    if (next.companies.length > 0) {
      await tx.insert(t.igdbInvolvedCompanies).values(
        next.companies.map((ic) => ({
          igdbId: ic.igdbId,
          igdbGameId: id,
          checksum: ic.checksum,
          igdbUpdatedAt: toDate(ic.igdbUpdatedAt),
          companyIgdbId: ic.companyIgdbId,
          companyName: ic.companyName,
          developer: ic.developer,
          publisher: ic.publisher,
          porting: ic.porting,
          supporting: ic.supporting,
          raw: ic.raw,
          runId,
          fetchedAt,
        })),
      );
    }
    if (next.aliases.length > 0) {
      await tx.insert(t.igdbAlternativeNames).values(
        next.aliases.map((an) => ({
          igdbId: an.igdbId,
          igdbGameId: id,
          checksum: an.checksum,
          name: an.name,
          comment: an.comment,
          raw: an.raw,
          runId,
          fetchedAt,
        })),
      );
    }
    if (next.externalGames.length > 0) {
      await tx.insert(t.igdbExternalGames).values(
        next.externalGames.map((eg) => ({
          igdbId: eg.igdbId,
          igdbGameId: id,
          checksum: eg.checksum,
          igdbUpdatedAt: toDate(eg.igdbUpdatedAt),
          sourceId: eg.sourceId,
          sourceName: eg.sourceName,
          uid: eg.uid,
          name: eg.name,
          platformIgdbId: eg.platformIgdbId,
          url: eg.url,
          releaseFormatId: eg.releaseFormatId,
          releaseFormatName: eg.releaseFormatName,
          raw: eg.raw,
          runId,
          fetchedAt,
        })),
      );
    }

    if (event) {
      changeEvents.push(event);
      await tx.insert(t.igdbChangeEvents).values({
        igdbGameId: id,
        runId,
        previousChecksum: event.previousChecksum,
        nextChecksum: event.nextChecksum,
        previousIgdbUpdatedAt: toDate(event.previousIgdbUpdatedAt),
        nextIgdbUpdatedAt: toDate(event.nextIgdbUpdatedAt),
        classes: [...event.classes],
        changedFields: [...event.changedFields],
        requiresEditorialReview: event.requiresEditorialReview,
      });
    }
  }

  return { inserted, updated, unchanged, changeEvents };
}

/* ── Identity review ──────────────────────────────────────────────────── */

export type IgdbIdentityRole =
  | "canonical_game"
  | "edition_of_game"
  | "dlc_of_game"
  | "expansion_of_game"
  | "standalone_expansion_of_game"
  | "remake_or_remaster_of_game"
  | "port_of_game"
  | "bundle_of_game"
  | "unrelated";

export interface IdentityCandidateInput {
  readonly igdbGameId: number;
  readonly gameId: string | null;
  readonly scopeId?: string | null;
  readonly role: IgdbIdentityRole;
  readonly rationale: string;
  readonly proposedBy: string;
}

/** Record a proposal. Nothing about the internal game changes. */
export async function proposeIdentityCandidate(tx: AdminTransaction, input: IdentityCandidateInput): Promise<string> {
  const [row] = await tx
    .insert(t.igdbIdentityCandidates)
    .values({
      igdbGameId: input.igdbGameId,
      gameId: input.gameId,
      scopeId: input.scopeId ?? null,
      role: input.role,
      rationale: input.rationale,
      proposedBy: input.proposedBy,
    })
    .returning({ id: t.igdbIdentityCandidates.id });
  if (!row) throw new Error("Insert returned no candidate.");
  return row.id;
}

export interface IdentityDecision {
  readonly state: "accepted" | "rejected";
  readonly decidedBy: string;
  readonly note?: string;
}

/**
 * A person decides a candidate. Accepting a `canonical_game` candidate is the
 * ONE act that writes across the boundary: it records the IGDB id in
 * `game_external_ids` for that game. Every other role, and every rejection,
 * changes only the candidate row.
 */
export async function decideIdentityCandidate(
  tx: AdminTransaction,
  candidateId: string,
  decision: IdentityDecision,
): Promise<void> {
  if (!decision.decidedBy.trim()) throw new Error("A decision must name who made it.");
  const [candidate] = await tx
    .select()
    .from(t.igdbIdentityCandidates)
    .where(eq(t.igdbIdentityCandidates.id, candidateId))
    .limit(1);
  if (!candidate) throw new Error("No such identity candidate.");
  if (candidate.state !== "proposed") throw new Error("This candidate has already been decided.");

  await tx
    .update(t.igdbIdentityCandidates)
    .set({
      state: decision.state,
      decidedBy: decision.decidedBy,
      decidedAt: sql`now()`,
      decisionNote: decision.note ?? null,
    })
    .where(eq(t.igdbIdentityCandidates.id, candidateId));

  if (decision.state === "accepted" && candidate.role === "canonical_game") {
    if (!candidate.gameId) throw new Error("A canonical_game candidate names an internal game.");
    const [staged] = await tx
      .select({ url: t.igdbGames.url })
      .from(t.igdbGames)
      .where(eq(t.igdbGames.igdbId, candidate.igdbGameId))
      .limit(1);
    await tx
      .insert(t.gameExternalIds)
      .values({
        gameId: candidate.gameId,
        provider: IGDB_PROVIDER,
        externalId: String(candidate.igdbGameId),
        externalUrl: staged?.url ?? null,
      })
      .onConflictDoUpdate({
        target: [t.gameExternalIds.gameId, t.gameExternalIds.provider],
        set: { externalId: String(candidate.igdbGameId), externalUrl: staged?.url ?? null },
      });
  }
}

/** The accepted canonical IGDB id for an internal game, if any. */
export async function canonicalIgdbIdFor(tx: AdminTransaction, gameId: string): Promise<number | null> {
  const [row] = await tx
    .select({ externalId: t.gameExternalIds.externalId })
    .from(t.gameExternalIds)
    .where(and(eq(t.gameExternalIds.gameId, gameId), eq(t.gameExternalIds.provider, IGDB_PROVIDER)))
    .limit(1);
  if (!row) return null;
  const n = Number(row.externalId);
  return Number.isInteger(n) ? n : null;
}

/** Open review prompts, most material first. */
export async function openChangeEvents(tx: AdminTransaction, igdbIds?: readonly number[]) {
  const where = igdbIds
    ? and(eq(t.igdbChangeEvents.reviewState, "open"), inArray(t.igdbChangeEvents.igdbGameId, [...igdbIds]))
    : eq(t.igdbChangeEvents.reviewState, "open");
  return tx.select().from(t.igdbChangeEvents).where(where);
}
