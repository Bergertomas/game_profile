import { afterAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { closeDatabase, getDatabase } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import * as write from "@/lib/admin/write";
import {
  getGameForAdmin,
  listGamesForAdmin,
  primaryPublicationBlockers,
  readDashboard,
} from "@/lib/admin/games";
import type { AdminTransaction } from "@/lib/admin/db";

/**
 * The editorial write path, against real Postgres.
 *
 * These call the same functions the Server Actions call, so the invariants
 * under test are the ones an editor will actually meet — not a re-statement of
 * them in a test's own SQL. The point of most of these is that the DATABASE
 * refuses: the rules live there, and this suite proves the write layer works
 * with them rather than around them.
 *
 * Every test runs inside a transaction it rolls back. That is not tidiness: the
 * immutability triggers make a published row genuinely un-deletable, so a test
 * that published something could not clean up any other way.
 */

const db = getDatabase();
afterAll(closeDatabase);

/**
 * Run editorial writes in a transaction, then undo it.
 *
 * `SET CONSTRAINTS ALL IMMEDIATE` forces the deferred routing triggers to fire
 * here rather than at a COMMIT that never comes — without it, a rolled-back
 * transaction silently skips the invariants these tests exist to prove. It is
 * applied at the end of the callback's setup rather than at the start, so a
 * legitimate multi-step edit still gets to complete first.
 */
async function inRolledBackTransaction<T>(
  body: (tx: AdminTransaction) => Promise<T>,
): Promise<T> {
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

class Rollback extends Error {}

/** The Postgres message under drizzle's "Failed query" wrapper. */
async function rejectionOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    const wrapper = error instanceof Error ? error.message : String(error);
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : "";
    return `${wrapper}\n${cause}`;
  }
  throw new Error("Expected the database to refuse this write, but it committed.");
}

const NEW_GAME = {
  slug: "a-test-game",
  canonicalTitle: "A Test Game",
  releaseStatus: "released" as const,
  summary: undefined,
  developerText: undefined,
  publisherText: undefined,
  firstReleaseDate: undefined,
};

const SCOPE = {
  key: "default",
  label: "Main game",
  summary: undefined,
  displayOrder: 1,
};

describe("Creating a game", () => {
  it("gives its first scope primacy automatically", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const gameId = await write.createGame(tx, NEW_GAME);
      await write.createScope(tx, gameId, SCOPE);
      await tx.execute(sql.raw("SET CONSTRAINTS ALL IMMEDIATE"));
      return getGameForAdmin(tx as never, gameId);
    });

    // A game whose only scope is not primary has no working canonical URL, and
    // there is no second scope for primacy to be a choice between.
    expect(view?.scopes).toHaveLength(1);
    expect(view?.scopes[0]?.isPrimary).toBe(true);
  });

  it("does not give a second scope primacy", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const gameId = await write.createGame(tx, NEW_GAME);
      await write.createScope(tx, gameId, SCOPE);
      await write.createScope(tx, gameId, {
        key: "endless",
        label: "Endless mode",
        summary: undefined,
        displayOrder: 2,
      });
      await tx.execute(sql.raw("SET CONSTRAINTS ALL IMMEDIATE"));
      return getGameForAdmin(tx as never, gameId);
    });

    expect(view?.scopes.filter((scope) => scope.isPrimary)).toHaveLength(1);
    expect(view?.scopes.find((scope) => scope.isPrimary)?.key).toBe("default");
  });

  it("refuses a slug another game already publishes at", async () => {
    const message = await rejectionOf(() =>
      inRolledBackTransaction((tx) =>
        write.createGame(tx, { ...NEW_GAME, slug: "returnal" }),
      ),
    );
    expect(message).toMatch(/duplicate key|unique/i);
  });

  it("refuses two scopes with the same key in one game", async () => {
    const message = await rejectionOf(() =>
      inRolledBackTransaction(async (tx) => {
        const gameId = await write.createGame(tx, NEW_GAME);
        await write.createScope(tx, gameId, SCOPE);
        await write.createScope(tx, gameId, { ...SCOPE, label: "Duplicate" });
      }),
    );
    expect(message).toMatch(/profile_scopes_game_key|duplicate key/i);
  });
});

describe("Moving primacy", () => {
  /**
   * The two-statement order in `setPrimaryScope` is the thing under test.
   * "At most one primary" is a partial unique INDEX, checked per row, so
   * setting the new primary first violates it immediately. Clearing first
   * leaves the game briefly with no primary, which only survives because the
   * routing rule is a DEFERRABLE trigger checked at COMMIT.
   */
  it("moves the canonical URL between two unpublished scopes", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const gameId = await write.createGame(tx, NEW_GAME);
      await write.createScope(tx, gameId, SCOPE);
      const second = await write.createScope(tx, gameId, {
        key: "endless",
        label: "Endless mode",
        summary: undefined,
        displayOrder: 2,
      });
      await write.setPrimaryScope(tx, gameId, second);
      await tx.execute(sql.raw("SET CONSTRAINTS ALL IMMEDIATE"));
      return getGameForAdmin(tx as never, gameId);
    });

    const primaries = view?.scopes.filter((scope) => scope.isPrimary) ?? [];
    expect(primaries).toHaveLength(1);
    expect(primaries[0]?.key).toBe("endless");
  });

  it("leaves display order alone", async () => {
    // Reordering a listing must not move a canonical URL, and moving a
    // canonical URL must not reorder a listing. The two are independent
    // properties and this is the second direction (ADR 0016).
    const view = await inRolledBackTransaction(async (tx) => {
      const gameId = await write.createGame(tx, NEW_GAME);
      await write.createScope(tx, gameId, SCOPE);
      const second = await write.createScope(tx, gameId, {
        key: "endless",
        label: "Endless mode",
        summary: undefined,
        displayOrder: 7,
      });
      await write.setPrimaryScope(tx, gameId, second);
      await tx.execute(sql.raw("SET CONSTRAINTS ALL IMMEDIATE"));
      return getGameForAdmin(tx as never, gameId);
    });

    expect(view?.scopes.find((scope) => scope.key === "endless")?.displayOrder).toBe(7);
    expect(view?.scopes.find((scope) => scope.key === "default")?.displayOrder).toBe(1);
  });

  /**
   * The invariant that protects the bare game URL. Returnal is published, so
   * taking primacy away from its published scope and giving it to a scope that
   * publishes nothing would make `/games/returnal` a 404 while the sibling
   * still resolved.
   */
  it("is refused when it would strand a published game", async () => {
    const message = await rejectionOf(() =>
      inRolledBackTransaction(async (tx) => {
        const [game] = await tx
          .select({ id: t.games.id })
          .from(t.games)
          .where(eq(t.games.slug, "returnal"))
          .limit(1);
        const gameId = game!.id;

        const unpublished = await write.createScope(tx, gameId, {
          key: "endless",
          label: "Endless mode",
          summary: undefined,
          displayOrder: 2,
        });
        await write.setPrimaryScope(tx, gameId, unpublished);
        await tx.execute(sql.raw("SET CONSTRAINTS ALL IMMEDIATE"));
      }),
    );
    expect(message).toMatch(/canonical \/games\/<slug> URL would not resolve/);
  });
});

describe("Deleting a scope", () => {
  it("is allowed while it has no evaluations", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const gameId = await write.createGame(tx, NEW_GAME);
      await write.createScope(tx, gameId, SCOPE);
      const spare = await write.createScope(tx, gameId, {
        key: "endless",
        label: "Endless mode",
        summary: undefined,
        displayOrder: 2,
      });
      await write.deleteScope(tx, gameId, spare);
      await tx.execute(sql.raw("SET CONSTRAINTS ALL IMMEDIATE"));
      return getGameForAdmin(tx as never, gameId);
    });
    expect(view?.scopes).toHaveLength(1);
  });

  it("is refused once it carries evaluation history", async () => {
    // A scope is the durable identity an evaluation series hangs from, so
    // deleting one with history would orphan preserved editorial record.
    const message = await rejectionOf(() =>
      inRolledBackTransaction(async (tx) => {
        const [scope] = await tx
          .select({ id: t.profileScopes.id, gameId: t.profileScopes.gameId })
          .from(t.profileScopes)
          .innerJoin(t.games, eq(t.games.id, t.profileScopes.gameId))
          .where(eq(t.games.slug, "returnal"))
          .limit(1);
        await write.deleteScope(tx, scope!.gameId, scope!.id);
      }),
    );
    expect(message).toMatch(/violates foreign key|still referenced/i);
  });
});

describe("Artwork records", () => {
  it("stores clearance and basis with the URL", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const gameId = await write.createGame(tx, NEW_GAME);
      await write.upsertArtwork(tx, gameId, {
        role: "hero",
        url: "https://images.example.com/hero.jpg",
        width: 1920,
        height: 1080,
        source: "press-kit",
        clearance: "production",
        basis: "press-kit",
        // Required by the database for production clearance: an asset that may
        // appear publicly is a rights position, so it has to be auditable.
        credit: "Example Studio",
        sourcePage: "https://example.com/press",
        altText: undefined,
        focus: undefined,
        externalId: undefined,
        retrievedAt: undefined,
      });
      return getGameForAdmin(tx as never, gameId);
    });

    expect(view?.artwork).toHaveLength(1);
    expect(view?.artwork[0]).toMatchObject({
      role: "hero",
      clearance: "production",
      basis: "press-kit",
    });
  });

  it("replaces rather than accumulating candidates for a role", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const gameId = await write.createGame(tx, NEW_GAME);
      const base = {
        role: "cover" as const,
        width: 600,
        height: 800,
        source: "manual",
        clearance: "evaluation" as const,
        basis: "internal-evaluation" as const,
        altText: undefined,
        focus: undefined,
        externalId: undefined,
        credit: undefined,
        sourcePage: undefined,
        retrievedAt: undefined,
      };
      await write.upsertArtwork(tx, gameId, {
        ...base,
        url: "https://images.example.com/first.jpg",
      });
      await write.upsertArtwork(tx, gameId, {
        ...base,
        url: "https://images.example.com/second.jpg",
        clearance: "production",
        basis: "permission",
        credit: "Example Studio",
        sourcePage: "https://example.com/press",
      });
      return getGameForAdmin(tx as never, gameId);
    });

    expect(view?.artwork).toHaveLength(1);
    expect(view?.artwork[0]?.url).toContain("second.jpg");
    expect(view?.artwork[0]?.clearance).toBe("production");
  });

  /**
   * The rule the editorial form now states as two required fields. Asserted
   * here too, at the database, so the form's version can never be the only
   * thing holding it: `lib/admin/validation.ts` is a courtesy to the editor,
   * and this is the guarantee.
   */
  it("refuses production clearance with no attribution", async () => {
    const message = await rejectionOf(() =>
      inRolledBackTransaction(async (tx) => {
        const gameId = await write.createGame(tx, NEW_GAME);
        await write.upsertArtwork(tx, gameId, {
          role: "hero",
          url: "https://images.example.com/hero.jpg",
          width: 1920,
          height: 1080,
          source: "manual",
          clearance: "production",
          basis: "press-kit",
          credit: undefined,
          sourcePage: undefined,
          altText: undefined,
          focus: undefined,
          externalId: undefined,
          retrievedAt: undefined,
        });
      }),
    );
    expect(message).toMatch(/production_is_attributable/);
  });

  it("allows an evaluation-clearance record without it", async () => {
    // Internal surfaces only, so it is held to the looser rule.
    const view = await inRolledBackTransaction(async (tx) => {
      const gameId = await write.createGame(tx, NEW_GAME);
      await write.upsertArtwork(tx, gameId, {
        role: "hero",
        url: "https://images.example.com/hero.jpg",
        width: 1920,
        height: 1080,
        source: "manual",
        clearance: "evaluation",
        basis: "internal-evaluation",
        credit: undefined,
        sourcePage: undefined,
        altText: undefined,
        focus: undefined,
        externalId: undefined,
        retrievedAt: undefined,
      });
      return getGameForAdmin(tx as never, gameId);
    });
    expect(view?.artwork[0]?.clearance).toBe("evaluation");
  });
});

describe("Aliases, platforms and provider IDs", () => {
  it("round-trips through the editorial reader", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const gameId = await write.createGame(tx, NEW_GAME);
      await write.addAlias(tx, gameId, { alias: "ATG", aliasType: "abbreviation" });
      await write.upsertExternalId(tx, gameId, {
        provider: "igdb",
        externalId: "12345",
        externalUrl: undefined,
      });
      const [platform] = await tx.select().from(t.platforms).limit(1);
      await write.upsertGamePlatform(tx, gameId, {
        platformId: platform!.id,
        releaseDate: "2024-03-01",
        performanceNotes: undefined,
      });
      return getGameForAdmin(tx as never, gameId);
    });

    expect(view?.aliases).toEqual([{ alias: "ATG", aliasType: "abbreviation" }]);
    expect(view?.externalIds).toEqual([
      { provider: "igdb", externalId: "12345", externalUrl: null },
    ]);
    expect(view?.platforms).toHaveLength(1);
    expect(view?.platforms[0]?.releaseDate).toBe("2024-03-01");
  });

  it("corrects an alias type rather than failing on the duplicate", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const gameId = await write.createGame(tx, NEW_GAME);
      await write.addAlias(tx, gameId, { alias: "ATG", aliasType: "abbrevation" });
      await write.addAlias(tx, gameId, { alias: "ATG", aliasType: "abbreviation" });
      return getGameForAdmin(tx as never, gameId);
    });
    expect(view?.aliases).toEqual([{ alias: "ATG", aliasType: "abbreviation" }]);
  });

  it("removes what it added", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const gameId = await write.createGame(tx, NEW_GAME);
      await write.addAlias(tx, gameId, { alias: "ATG", aliasType: undefined });
      await write.removeAlias(tx, gameId, "ATG");
      await write.upsertExternalId(tx, gameId, {
        provider: "igdb",
        externalId: "1",
        externalUrl: undefined,
      });
      await write.removeExternalId(tx, gameId, "igdb");
      return getGameForAdmin(tx as never, gameId);
    });
    expect(view?.aliases).toEqual([]);
    expect(view?.externalIds).toEqual([]);
  });
});

describe("What the editor is told before the database refuses", () => {
  /**
   * §8.3: an editor must "see why a scope cannot be published before the
   * primary". This is that explanation, computed from the same state the
   * trigger checks — so the interface and the constraint cannot disagree.
   */
  it("names the scope, the rubric and the consequence", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const [game] = await tx
        .select({ id: t.games.id })
        .from(t.games)
        .where(eq(t.games.slug, "returnal"))
        .limit(1);

      // A sibling scope carrying a draft under a rubric the primary has never
      // published under.
      const sibling = await write.createScope(tx, game!.id, {
        key: "endless",
        label: "Endless mode",
        summary: undefined,
        displayOrder: 2,
      });
      await tx.execute(sql`
        INSERT INTO rubric_versions (version, expected_dimension_count, expected_subcriteria_per_dimension, locked_at)
        VALUES ('9.9', 8, 5, CURRENT_DATE)
      `);
      await tx.insert(t.evaluations).values({
        gameId: game!.id,
        scopeId: sibling,
        rubricVersion: "9.9",
        versionNumber: 1,
        editionScope: "Base game",
        modeScope: "Endless",
        platformScope: ["PC"],
        buildOrPatchScope: "Current",
        status: "draft",
        evidenceStatus: "verified",
        confidence: "medium",
        evidenceCutoffAt: "2026-08-06",
        scoreProvenance: "editorial",
      });

      return getGameForAdmin(tx as never, game!.id);
    });

    const blockers = primaryPublicationBlockers(view!);
    expect(blockers).toHaveLength(1);
    expect(blockers[0]?.rubricVersion).toBe("9.9");
    expect(blockers[0]?.message).toContain("Endless mode");
    expect(blockers[0]?.message).toContain("Main game");
    expect(blockers[0]?.message).toMatch(/primary scope/i);
  });

  it("says nothing when the primary publishes under the same rubric", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const [game] = await tx
        .select({ id: t.games.id })
        .from(t.games)
        .where(eq(t.games.slug, "returnal"))
        .limit(1);
      await write.createScope(tx, game!.id, {
        key: "endless",
        label: "Endless mode",
        summary: undefined,
        displayOrder: 2,
      });
      return getGameForAdmin(tx as never, game!.id);
    });
    expect(primaryPublicationBlockers(view!)).toEqual([]);
  });
});

describe("The editorial dashboard", () => {
  it("counts the seeded catalogue", async () => {
    const summary = await readDashboard(db);
    expect(summary.games).toBeGreaterThanOrEqual(3);
    expect(summary.publishedProfiles).toBeGreaterThanOrEqual(3);
    // Every seeded game has a primary scope, which is what makes the public
    // catalogue resolvable at all.
    expect(summary.gamesWithoutPrimaryScope).toEqual([]);
  });

  it("lists every game with its scope and evaluation counts", async () => {
    const games = await listGamesForAdmin(db);
    const returnal = games.find((game) => game.slug === "returnal");
    expect(returnal).toBeDefined();
    expect(returnal?.scopeCount).toBe(1);
    expect(returnal?.publishedCount).toBe(1);
    expect(returnal?.hasPrimaryScope).toBe(true);
  });

  /**
   * The editorial reader sees drafts. The public one must not — that is the
   * reason they are separate modules rather than one with a flag.
   */
  it("sees evaluation history the public reader excludes", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const [scope] = await tx
        .select({ id: t.profileScopes.id, gameId: t.profileScopes.gameId })
        .from(t.profileScopes)
        .innerJoin(t.games, eq(t.games.id, t.profileScopes.gameId))
        .where(
          and(eq(t.games.slug, "returnal"), eq(t.profileScopes.isPrimary, true)),
        )
        .limit(1);

      await tx.insert(t.evaluations).values({
        gameId: scope!.gameId,
        scopeId: scope!.id,
        rubricVersion: "1.0",
        versionNumber: 2,
        editionScope: "Base game",
        modeScope: "Main game",
        platformScope: ["PC"],
        buildOrPatchScope: "Next patch",
        status: "draft",
        evidenceStatus: "verified",
        confidence: "medium",
        evidenceCutoffAt: "2026-08-06",
        scoreProvenance: "editorial",
      });

      return getGameForAdmin(tx as never, scope!.gameId);
    });

    const primary = view?.scopes.find((scope) => scope.isPrimary);
    expect(primary?.evaluations).toHaveLength(2);
    expect(primary?.evaluations.map((e) => e.status).sort()).toEqual([
      "draft",
      "published",
    ]);
    // The published one is still the only one the public rubric resolves.
    expect(primary?.publishedRubricVersions).toEqual(["1.0"]);
  });
});
