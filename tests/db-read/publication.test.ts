import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import type { AdminTransaction } from "@/lib/admin/db";
import * as write from "@/lib/admin/evaluation-write";
import {
  checkPublishReadiness,
  publishEvaluation,
} from "@/lib/admin/publication";
import {
  readEvaluationProfile,
  readPublishedProfiles,
} from "@/lib/db/read-profiles";
import { buildProfileView } from "@/lib/profile/build";
import { RUBRIC_V1 } from "@/lib/rubric";

/**
 * Preview, the publish gate, and publication — against real Postgres.
 *
 * Everything runs inside a transaction that is rolled back, which is not
 * tidiness: publishing makes a row immutable by trigger, so a test that
 * published something could not clean up any other way.
 *
 * The claims worth stating, because they are what a refactor would break:
 *
 *  - the preview renders the SAME ProfileView the public build renders;
 *  - the gate agrees with the database, and the database is the backstop;
 *  - publication and supersession happen together or not at all.
 */

const db = getDatabase();
afterAll(closeDatabase);

class Rollback extends Error {}

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

async function refusalOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : "";
    return `${error instanceof Error ? error.message : String(error)} ${cause}`;
  }
  throw new Error("expected a refusal, but the call succeeded");
}

/** A seeded published evaluation — the corpus the calibration rounds approved. */
async function aPublishedEvaluation(
  tx: AdminTransaction,
): Promise<{ id: string; scopeId: string; gameId: string }> {
  const [row] = await tx
    .select({
      id: t.evaluations.id,
      scopeId: t.evaluations.scopeId,
      gameId: t.evaluations.gameId,
    })
    .from(t.evaluations)
    .where(eq(t.evaluations.status, "published"))
    .limit(1);
  return row!;
}

describe("Preview renders what ships", () => {
  /**
   * The load-bearing claim of the whole preview.
   *
   * If these two ever diverge, an editor approves one page and the site serves
   * another — and no amount of care in the admin would catch it, because the
   * admin would be showing the truth as it understood it. So this compares the
   * rendered `ProfileView`, not the row.
   */
  it("produces the same ProfileView as the public reader, for a published profile", async () => {
    const published = await readPublishedProfiles(RUBRIC_V1.version);
    expect(published.length).toBeGreaterThan(0);

    for (const record of published) {
      const previewed = await readEvaluationProfile(db, record.evaluation.id);
      expect(previewed).not.toBeNull();
      expect(buildProfileView(previewed!)).toEqual(buildProfileView(record));
    }
  });

  /*
   * Everything in this test stays on `tx`.
   *
   * `getDatabase()` holds a single connection by design, and the transaction
   * owns it for the duration — so calling the public reader in here would wait
   * on a connection this very callback is holding, and hang until the test
   * timed out rather than failing with anything informative.
   */
  it("loads a draft, which the public reader by definition cannot", async () => {
    const { status, publishedIds, draftId } = await inRolledBackTransaction(
      async (tx) => {
        const published = await aPublishedEvaluation(tx);
        const draftId = await write.createRevision(
          tx,
          published.id,
          "editor@example.com",
          "Preview test revision",
        );

        const record = await readEvaluationProfile(tx, draftId);
        const live = await tx
          .select({ id: t.evaluations.id })
          .from(t.evaluations)
          .where(eq(t.evaluations.status, "published"));

        return {
          status: record?.evaluation.status,
          publishedIds: live.map((row) => row.id),
          draftId,
        };
      },
    );

    expect(status).toBe("draft");
    // The public selector reads `status = 'published'` and has no other mode,
    // so a draft is unreachable from it rather than merely unlinked.
    expect(publishedIds).not.toContain(draftId);
  });

  it("gives a revision its predecessors as history, so the chain is checkable", async () => {
    const history = await inRolledBackTransaction(async (tx) => {
      const published = await aPublishedEvaluation(tx);
      const id = await write.createRevision(
        tx,
        published.id,
        "editor@example.com",
        "History test revision",
      );
      const record = await readEvaluationProfile(tx, id);
      return record?.history ?? [];
    });

    // Without this the gate sees a chain of one and rejects every revision as
    // "the oldest in the chain but claims to supersede X".
    expect(history.length).toBe(1);
  });
});

describe("The publish gate", () => {
  it("passes a revision of an approved published profile", async () => {
    const readiness = await inRolledBackTransaction(async (tx) => {
      const published = await aPublishedEvaluation(tx);
      const id = await write.createRevision(
        tx,
        published.id,
        "editor@example.com",
        "Gate test revision",
      );
      return checkPublishReadiness(tx, id);
    });

    // A revision copies an approved profile wholesale, so anything blocking
    // here is the gate disagreeing with a profile the calibration rounds
    // approved — which would be the gate being wrong.
    expect(readiness.blocking).toEqual([]);
    expect(readiness.canPublish).toBe(true);
  });

  it("blocks a bare draft, and says everything that is wrong at once", async () => {
    const readiness = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(
        tx,
        scopeId,
        CONTEXT,
        "editor@example.com",
      );
      return checkPublishReadiness(tx, id);
    });

    expect(readiness.canPublish).toBe(false);
    // Not "the first problem": an editor finishing a profile needs the list.
    expect(readiness.blocking.length).toBeGreaterThan(5);
    const codes = new Set(readiness.blocking.map((issue) => issue.code));
    expect(codes.has("missing_dimension_confidence")).toBe(true);
  });

  it("refuses an evaluation that is already published", async () => {
    const readiness = await inRolledBackTransaction(async (tx) => {
      const published = await aPublishedEvaluation(tx);
      return checkPublishReadiness(tx, published.id);
    });

    expect(readiness.canPublish).toBe(false);
    expect(readiness.blocking.map((i) => i.code)).toContain("already_published");
  });

  it("reports an unknown id rather than throwing", async () => {
    const readiness = await checkPublishReadiness(
      db,
      "00000000-0000-4000-8000-000000000000",
    );
    expect(readiness.record).toBeNull();
    expect(readiness.blocking.map((i) => i.code)).toContain(
      "unknown_evaluation",
    );
  });
});

describe("Publication", () => {
  it("publishes the revision and supersedes its predecessor, together", async () => {
    const rows = await inRolledBackTransaction(async (tx) => {
      const published = await aPublishedEvaluation(tx);
      const revisionId = await write.createRevision(
        tx,
        published.id,
        "editor@example.com",
        "Publication test",
      );

      await publishEvaluation(tx, revisionId, { spoilerReviewed: true });

      return tx
        .select({
          id: t.evaluations.id,
          status: t.evaluations.status,
          publishedAt: t.evaluations.publishedAt,
        })
        .from(t.evaluations)
        .where(eq(t.evaluations.scopeId, published.scopeId));
    });

    const byStatus = new Map(rows.map((row) => [row.status, row]));
    expect(byStatus.get("published")).toBeDefined();
    expect(byStatus.get("superseded")).toBeDefined();
    // Exactly one of each: the scope is never without a live profile and never
    // has two.
    expect(rows.filter((r) => r.status === "published").length).toBe(1);
    expect(byStatus.get("published")!.publishedAt).not.toBeNull();
  });

  it("refuses without the spoiler attestation", async () => {
    const message = await inRolledBackTransaction(async (tx) => {
      const published = await aPublishedEvaluation(tx);
      const revisionId = await write.createRevision(
        tx,
        published.id,
        "editor@example.com",
        "Attestation test",
      );
      return refusalOf(() =>
        publishEvaluation(tx, revisionId, { spoilerReviewed: false }),
      );
    });

    expect(message).toContain("spoilers");
  });

  it("refuses a draft that does not pass the gate", async () => {
    const message = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(
        tx,
        scopeId,
        CONTEXT,
        "editor@example.com",
      );
      return refusalOf(() =>
        publishEvaluation(tx, id, { spoilerReviewed: true }),
      );
    });

    expect(message).toContain("not ready to publish");
  });

  /**
   * The gate is not the guarantee — this is.
   *
   * Bypassing `publishEvaluation` entirely and setting the status by hand is
   * how a migration, a psql session, or a future bug would do it. The database
   * must still refuse, or every claim the editorial model makes about published
   * history rests on application code being correct.
   */
  it("is refused by the database when a second row would publish in one scope", async () => {
    const message = await inRolledBackTransaction(async (tx) => {
      const published = await aPublishedEvaluation(tx);
      const revisionId = await write.createRevision(
        tx,
        published.id,
        "editor@example.com",
        "Backstop test",
      );
      // No supersession: straight to published beside the existing one.
      return refusalOf(() =>
        tx
          .update(t.evaluations)
          .set({ status: "published", publishedAt: new Date() })
          .where(eq(t.evaluations.id, revisionId)),
      );
    });

    expect(message).toMatch(/one_published_per_game_rubric|duplicate key/i);
  });

  it("is refused by the database when a draft skips straight to superseded", async () => {
    const message = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(
        tx,
        scopeId,
        CONTEXT,
        "editor@example.com",
      );
      return refusalOf(() =>
        tx
          .update(t.evaluations)
          .set({ status: "superseded" })
          .where(eq(t.evaluations.id, id)),
      );
    });

    expect(message).toContain("cannot skip the published state");
  });
});

const CONTEXT = {
  rubricVersion: "1.0" as const,
  editionScope: "Base game",
  modeScope: "Publication test mode",
  platformScope: ["PC"],
  buildOrPatchScope: "Test build",
  currentStateCutoffAt: undefined,
  evidenceCutoffAt: "2026-08-14",
  releaseContext: "Post-release",
  evidenceStatus: "verified" as const,
  evidenceMaturity: undefined,
  confidence: "medium" as const,
  evidenceLedger: "pending" as const,
  scoreProvenance: "editorial" as const,
  calibrationRound: undefined,
  provenanceNote: undefined,
};

/** A fresh scope on Returnal, so nothing collides with the seeded series. */
async function newScope(tx: AdminTransaction, key = "publication"): Promise<string> {
  const [game] = await tx
    .select({ id: t.games.id })
    .from(t.games)
    .where(eq(t.games.slug, "returnal"))
    .limit(1);
  const [scope] = await tx
    .insert(t.profileScopes)
    .values({
      gameId: game!.id,
      key,
      label: "Publication fixture",
      isPrimary: false,
      displayOrder: 9,
    })
    .returning({ id: t.profileScopes.id });
  return scope!.id;
}
