import { afterAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { closeDatabase, getDatabase } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import type { AdminTransaction } from "@/lib/admin/db";
import * as write from "@/lib/admin/write";
import {
  BASE_GAME_ID,
  DLC_ID,
  FIXTURE_SOURCE_REF,
  GOLD_EDITION_ID,
  STAGING_PROOF_RECORDS,
  STAGING_PROOF_RECORDS_REVISED,
} from "@/lib/igdb/fixtures/staging-proof";
import { normalizeGames } from "@/lib/igdb/normalize";
import {
  beginIngestionRun,
  canonicalIgdbIdFor,
  decideIdentityCandidate,
  finishIngestionRun,
  openChangeEvents,
  proposeIdentityCandidate,
  readStagedSnapshot,
  stageNormalized,
} from "@/lib/igdb/staging-write";

/**
 * The non-production staging proof against real Postgres (issue #48 §6, §9).
 * Every test runs in a transaction it rolls back: the seeded editorial corpus
 * is read for its ids and never written.
 */

const db = getDatabase();
afterAll(closeDatabase);

class Rollback extends Error {}

async function inRolledBackTransaction<T>(body: (tx: AdminTransaction) => Promise<T>): Promise<T> {
  let result!: T;
  try {
    await db.transaction(async (tx) => {
      result = await body(tx);
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
  return result;
}

async function rejectionOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    const wrapper = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
    return `${wrapper}\n${cause}`;
  }
  throw new Error("Expected the database to refuse this write, but it committed.");
}

const BOUNDARY = ["games", "profile_scopes", "evaluations", "subcriterion_scores", "game_artwork", "game_external_ids", "deployment_requests"] as const;

async function boundaryCounts(tx: AdminTransaction): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const table of BOUNDARY) {
    const rows = (await tx.execute(sql.raw(`SELECT count(*)::int AS n FROM ${table}`))) as Iterable<{ n: number }>;
    out[table] = [...rows][0]!.n;
  }
  return out;
}

const FIRST = normalizeGames(STAGING_PROOF_RECORDS);
const REVISED = normalizeGames(STAGING_PROOF_RECORDS_REVISED);
const FETCHED_AT = new Date("2026-09-02T00:00:00Z");

async function stage(tx: AdminTransaction, staging = FIRST, ref = FIXTURE_SOURCE_REF) {
  const runId = await beginIngestionRun(tx, { sourceKind: "fixture", sourceRef: ref, note: "db-read proof" });
  const report = await stageNormalized(tx, staging, { runId, sourceKind: "fixture", sourceRef: ref, fetchedAt: FETCHED_AT });
  await finishIngestionRun(tx, runId, staging.games.length);
  return { runId, report };
}

async function gameId(tx: AdminTransaction, slug: string): Promise<string> {
  const [row] = await tx.select({ id: t.games.id }).from(t.games).where(eq(t.games.slug, slug)).limit(1);
  if (!row) throw new Error(`seed has no game ${slug}`);
  return row.id;
}

describe("staging the fixture", () => {
  it("stages every record, relation, release, image and company with its run provenance", async () => {
    const result = await inRolledBackTransaction(async (tx) => {
      const { runId, report } = await stage(tx);
      const [games, relations, releases, images, companies, aliases, externals, run] = await Promise.all([
        tx.select().from(t.igdbGames),
        tx.select().from(t.igdbGameRelations),
        tx.select().from(t.igdbReleaseDates),
        tx.select().from(t.igdbImages),
        tx.select().from(t.igdbInvolvedCompanies),
        tx.select().from(t.igdbAlternativeNames),
        tx.select().from(t.igdbExternalGames),
        tx.select().from(t.igdbIngestionRuns).where(eq(t.igdbIngestionRuns.id, runId)),
      ]);
      return { report, games, relations, releases, images, companies, aliases, externals, run: run[0] };
    });
    expect(result.report).toMatchObject({ inserted: 10, updated: 0, unchanged: 0, changeEvents: [] });
    expect(result.games).toHaveLength(10);
    expect(result.relations).toHaveLength(13);
    expect(result.releases).toHaveLength(FIRST.releaseDates.length);
    expect(result.images).toHaveLength(5);
    expect(result.companies).toHaveLength(2);
    expect(result.aliases).toHaveLength(1);
    expect(result.externals).toHaveLength(1);
    expect(result.run?.recordCount).toBe(10);
    expect(result.run?.finishedAt).not.toBeNull();
    for (const game of result.games) {
      expect(game.runId).toBe(result.run?.id);
      expect(game.sourceKind).toBe("fixture");
      expect(game.sourceRef).toBe(FIXTURE_SOURCE_REF);
      expect(game.fetchedAt.toISOString()).toBe(FETCHED_AT.toISOString());
      expect(game.raw).not.toBeNull();
    }
    const gold = result.games.find((g) => g.igdbId === GOLD_EDITION_ID)!;
    expect(gold).toMatchObject({ identityClass: "version_edition", versionParentIgdbId: BASE_GAME_ID, parentGameIgdbId: null, versionTitle: "Gold Edition" });
    const dlc = result.games.find((g) => g.igdbId === DLC_ID)!;
    expect(dlc).toMatchObject({ identityClass: "dlc", parentGameIgdbId: BASE_GAME_ID, versionParentIgdbId: null });
  });

  it("reads back the snapshot it wrote", async () => {
    const snapshot = await inRolledBackTransaction(async (tx) => {
      await stage(tx);
      return readStagedSnapshot(tx, BASE_GAME_ID);
    });
    expect(snapshot?.game.platformIgdbIds).toEqual([6, 48]);
    expect(snapshot?.relations).toHaveLength(7);
    expect(snapshot?.releaseDates).toHaveLength(3);
    expect(snapshot?.images.map((im) => im.imageId)).toEqual(["fixtureartbase00001", "fixtureartbase00002", "fixturecoverbase0001"]);
  });

  it("is idempotent: staging the same observation again changes nothing and records no event", async () => {
    const second = await inRolledBackTransaction(async (tx) => {
      await stage(tx);
      const { report } = await stage(tx);
      const events = await tx.select().from(t.igdbChangeEvents);
      return { report, events };
    });
    expect(second.report).toMatchObject({ inserted: 0, updated: 0, unchanged: 10 });
    expect(second.events).toEqual([]);
  });

  it("re-stages a revised observation and appends one classified event per changed record", async () => {
    const out = await inRolledBackTransaction(async (tx) => {
      await stage(tx);
      const { report } = await stage(tx, REVISED, `${FIXTURE_SOURCE_REF}-revised`);
      const events = await tx.select().from(t.igdbChangeEvents).orderBy(t.igdbChangeEvents.igdbGameId);
      const open = await openChangeEvents(tx);
      const dlcRelations = await tx.select().from(t.igdbGameRelations).where(eq(t.igdbGameRelations.assertedByIgdbId, DLC_ID));
      return { report, events, open, dlcRelations };
    });
    expect(out.report).toMatchObject({ inserted: 0, updated: 3, unchanged: 7 });
    expect(out.events.map((e) => [e.igdbGameId, e.classes, e.requiresEditorialReview])).toEqual([
      [BASE_GAME_ID, ["provider_text_drift", "artwork_candidate", "identity_or_relationship"], false],
      [GOLD_EDITION_ID, ["platform_or_release"], false],
      [DLC_ID, ["material_scope"], true],
    ]);
    expect(out.open).toHaveLength(3);
    expect(out.dlcRelations.map((r) => [r.kind, r.objectIgdbId])).toEqual([["dlc_of", GOLD_EDITION_ID]]);
  });

  it("leaves every editorial table untouched across three passes", async () => {
    const counts = await inRolledBackTransaction(async (tx) => {
      const before = await boundaryCounts(tx);
      await stage(tx);
      await stage(tx);
      await stage(tx, REVISED, `${FIXTURE_SOURCE_REF}-revised`);
      const after = await boundaryCounts(tx);
      return { before, after };
    });
    expect(counts.after).toEqual(counts.before);
    expect(counts.after.game_artwork).toBe(0);
  });
});

describe("the database refuses conflation", () => {
  it("rejects a record that is its own parent and an edition without a version_parent", async () => {
    const message = await rejectionOf(() =>
      inRolledBackTransaction(async (tx) => {
        const { runId } = await stage(tx);
        await tx.insert(t.igdbGames).values({ igdbId: 1, name: "Self", parentGameIgdbId: 1, identityClass: "dlc", raw: {}, sourceKind: "fixture", sourceRef: "x", runId, fetchedAt: FETCHED_AT });
      }),
    );
    expect(message).toContain("igdb_games_not_own_parent");
    const mismatch = await rejectionOf(() =>
      inRolledBackTransaction(async (tx) => {
        const { runId } = await stage(tx);
        await tx.insert(t.igdbGames).values({ igdbId: 1, name: "Edition", identityClass: "version_edition", raw: {}, sourceKind: "fixture", sourceRef: "x", runId, fetchedAt: FETCHED_AT });
      }),
    );
    expect(mismatch).toContain("igdb_games_version_edition_iff_version_parent");
  });

  it("rejects version_of asserted by parent_game", async () => {
    const message = await rejectionOf(() =>
      inRolledBackTransaction(async (tx) => {
        const { runId } = await stage(tx);
        await tx.insert(t.igdbGameRelations).values({ subjectIgdbId: DLC_ID, objectIgdbId: BASE_GAME_ID, kind: "version_of", sourceField: "parent_game", assertedByIgdbId: DLC_ID, runId });
      }),
    );
    expect(message).toContain("igdb_game_relations_version_field_matches_kind");
  });

  it("keeps the change log append-only", async () => {
    const message = await rejectionOf(() =>
      inRolledBackTransaction(async (tx) => {
        await stage(tx);
        await stage(tx, REVISED, "rev");
        await tx.update(t.igdbChangeEvents).set({ requiresEditorialReview: false }).where(eq(t.igdbChangeEvents.igdbGameId, DLC_ID));
      }),
    );
    expect(message).toContain("append-only");
    const acknowledged = await inRolledBackTransaction(async (tx) => {
      await stage(tx);
      await stage(tx, REVISED, "rev");
      await tx.update(t.igdbChangeEvents).set({ reviewState: "acknowledged", reviewedBy: "Tomas", reviewedAt: sql`now()` }).where(eq(t.igdbChangeEvents.igdbGameId, DLC_ID));
      return openChangeEvents(tx);
    });
    expect(acknowledged.map((e) => e.igdbGameId)).toEqual([BASE_GAME_ID, GOLD_EDITION_ID]);
  });
});

describe("identity review", () => {
  it("a proposal changes nothing; an accepted canonical decision records the provider id on the game", async () => {
    const out = await inRolledBackTransaction(async (tx) => {
      await stage(tx);
      const returnal = await gameId(tx, "returnal");
      const candidate = await proposeIdentityCandidate(tx, { igdbGameId: BASE_GAME_ID, gameId: returnal, role: "canonical_game", rationale: "fixture proof", proposedBy: "tooling" });
      const beforeDecision = await canonicalIgdbIdFor(tx, returnal);
      await decideIdentityCandidate(tx, candidate, { state: "accepted", decidedBy: "Tomas", note: "proof" });
      const afterDecision = await canonicalIgdbIdFor(tx, returnal);
      const [external] = await tx.select().from(t.gameExternalIds).where(and(eq(t.gameExternalIds.gameId, returnal), eq(t.gameExternalIds.provider, "igdb")));
      const [row] = await tx.select().from(t.igdbIdentityCandidates).where(eq(t.igdbIdentityCandidates.id, candidate));
      return { beforeDecision, afterDecision, external, row };
    });
    expect(out.beforeDecision).toBeNull();
    expect(out.afterDecision).toBe(BASE_GAME_ID);
    expect(out.external).toMatchObject({ externalId: String(BASE_GAME_ID), externalUrl: `https://www.igdb.com/games/fixture-${BASE_GAME_ID}` });
    expect(out.row).toMatchObject({ state: "accepted", decidedBy: "Tomas", decisionNote: "proof" });
    expect(out.row?.decidedAt).not.toBeNull();
  });

  it("a rejection, and an accepted non-canonical role, write nothing to the game", async () => {
    const out = await inRolledBackTransaction(async (tx) => {
      await stage(tx);
      const returnal = await gameId(tx, "returnal");
      const rejected = await proposeIdentityCandidate(tx, { igdbGameId: BASE_GAME_ID, gameId: returnal, role: "canonical_game", rationale: "wrong", proposedBy: "tooling" });
      await decideIdentityCandidate(tx, rejected, { state: "rejected", decidedBy: "Tomas" });
      const edition = await proposeIdentityCandidate(tx, { igdbGameId: GOLD_EDITION_ID, gameId: returnal, role: "edition_of_game", rationale: "edition", proposedBy: "tooling" });
      await decideIdentityCandidate(tx, edition, { state: "accepted", decidedBy: "Tomas" });
      return { canonical: await canonicalIgdbIdFor(tx, returnal), externals: await tx.select().from(t.gameExternalIds).where(eq(t.gameExternalIds.provider, "igdb")) };
    });
    expect(out.canonical).toBeNull();
    expect(out.externals).toEqual([]);
  });

  it("a decision cannot be made twice, by nobody, or for a candidate that does not exist", async () => {
    await inRolledBackTransaction(async (tx) => {
      await stage(tx);
      const returnal = await gameId(tx, "returnal");
      const candidate = await proposeIdentityCandidate(tx, { igdbGameId: BASE_GAME_ID, gameId: returnal, role: "canonical_game", rationale: "x", proposedBy: "tooling" });
      await expect(decideIdentityCandidate(tx, candidate, { state: "accepted", decidedBy: "  " })).rejects.toThrow(/name who made it/);
      await decideIdentityCandidate(tx, candidate, { state: "accepted", decidedBy: "Tomas" });
      await expect(decideIdentityCandidate(tx, candidate, { state: "rejected", decidedBy: "Tomas" })).rejects.toThrow(/already been decided/);
      await expect(decideIdentityCandidate(tx, "00000000-0000-4000-8000-000000000000", { state: "accepted", decidedBy: "Tomas" })).rejects.toThrow(/No such/);
    });
  });

  it("a candidate naming a scope must name the scope's own game — in code and in the database", async () => {
    const crossedInCode = await inRolledBackTransaction(async (tx) => {
      await stage(tx);
      const returnal = await gameId(tx, "returnal");
      const redfall = await gameId(tx, "redfall");
      const [redfallScope] = await tx.select({ id: t.profileScopes.id }).from(t.profileScopes).where(eq(t.profileScopes.gameId, redfall)).limit(1);
      let message = "";
      try {
        await proposeIdentityCandidate(tx, { igdbGameId: GOLD_EDITION_ID, gameId: returnal, scopeId: redfallScope!.id, role: "edition_of_game", rationale: "crossed", proposedBy: "tooling" });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      return message;
    });
    expect(crossedInCode).toContain("belongs to a different game");

    const crossedInDatabase = await rejectionOf(() =>
      inRolledBackTransaction(async (tx) => {
        await stage(tx);
        const returnal = await gameId(tx, "returnal");
        const redfall = await gameId(tx, "redfall");
        const [redfallScope] = await tx.select({ id: t.profileScopes.id }).from(t.profileScopes).where(eq(t.profileScopes.gameId, redfall)).limit(1);
        await tx.insert(t.igdbIdentityCandidates).values({ igdbGameId: GOLD_EDITION_ID, gameId: returnal, scopeId: redfallScope!.id, role: "edition_of_game", rationale: "crossed", proposedBy: "tooling" });
      }),
    );
    expect(crossedInDatabase).toContain("igdb_identity_candidates_scope_belongs_to_game");

    const scopeWithoutGame = await rejectionOf(() =>
      inRolledBackTransaction(async (tx) => {
        await stage(tx);
        const redfall = await gameId(tx, "redfall");
        const [redfallScope] = await tx.select({ id: t.profileScopes.id }).from(t.profileScopes).where(eq(t.profileScopes.gameId, redfall)).limit(1);
        await tx.insert(t.igdbIdentityCandidates).values({ igdbGameId: GOLD_EDITION_ID, gameId: null, scopeId: redfallScope!.id, role: "unrelated", rationale: "orphan scope", proposedBy: "tooling" });
      }),
    );
    expect(scopeWithoutGame).toContain("igdb_identity_candidates_scope_needs_game");

    const valid = await inRolledBackTransaction(async (tx) => {
      await stage(tx);
      const returnal = await gameId(tx, "returnal");
      const [scope] = await tx.select({ id: t.profileScopes.id }).from(t.profileScopes).where(eq(t.profileScopes.gameId, returnal)).limit(1);
      const id = await proposeIdentityCandidate(tx, { igdbGameId: GOLD_EDITION_ID, gameId: returnal, scopeId: scope!.id, role: "edition_of_game", rationale: "own scope", proposedBy: "tooling" });
      const [row] = await tx.select().from(t.igdbIdentityCandidates).where(eq(t.igdbIdentityCandidates.id, id));
      return row;
    });
    expect(valid?.state).toBe("proposed");
    await expect(
      inRolledBackTransaction(async (tx) => {
        await stage(tx);
        await proposeIdentityCandidate(tx, { igdbGameId: GOLD_EDITION_ID, gameId: null, scopeId: "00000000-0000-4000-8000-000000000000", role: "unrelated", rationale: "x", proposedBy: "tooling" });
      }),
    ).rejects.toThrow(/must name the scope's game/);
  });

  it("one IGDB record cannot become the canonical record of two internal games", async () => {
    const message = await rejectionOf(() =>
      inRolledBackTransaction(async (tx) => {
        await stage(tx);
        const first = await proposeIdentityCandidate(tx, { igdbGameId: BASE_GAME_ID, gameId: await gameId(tx, "returnal"), role: "canonical_game", rationale: "a", proposedBy: "tooling" });
        const second = await proposeIdentityCandidate(tx, { igdbGameId: BASE_GAME_ID, gameId: await gameId(tx, "redfall"), role: "canonical_game", rationale: "b", proposedBy: "tooling" });
        await decideIdentityCandidate(tx, first, { state: "accepted", decidedBy: "Tomas" });
        await decideIdentityCandidate(tx, second, { state: "accepted", decidedBy: "Tomas" });
      }),
    );
    expect(message).toContain("igdb_identity_candidates_one_accepted_canonical_per_igdb");
  });

  it("the ordinary editorial provider-id write is now held to the same one-identity rule", async () => {
    const message = await rejectionOf(() =>
      inRolledBackTransaction(async (tx) => {
        await write.upsertExternalId(tx, await gameId(tx, "returnal"), { provider: "igdb", externalId: "424242", externalUrl: undefined });
        await write.upsertExternalId(tx, await gameId(tx, "redfall"), { provider: "igdb", externalId: "424242", externalUrl: undefined });
      }),
    );
    expect(message).toContain("game_external_ids_provider_external_unique");
  });
});
