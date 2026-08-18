import { afterAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { closeDatabase, getDatabase } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import type { AdminTransaction } from "@/lib/admin/db";
import { readPreview } from "@/lib/admin/preview";
import * as write from "@/lib/admin/evaluation-write";
import { readEvaluationProfile } from "@/lib/db/read-profiles";

/**
 * The preview shows the page publication would produce.
 *
 * Two properties, and both are about a state that does not exist yet:
 *
 *  - the scope switcher is assembled prospectively, so the first draft of a
 *    second scope is previewed with the switcher it will cause;
 *  - the canonical address is the one this profile would own, which for a
 *    sibling scope is not the bare game URL.
 *
 * Plus the boundary that keeps history honest: a lineage is rubric-local.
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

const CONTEXT = {
  rubricVersion: "1.0" as const,
  editionScope: "Base game",
  modeScope: "Preview test mode",
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

/** The seeded published primary scope of one game. */
async function publishedPrimary(tx: AdminTransaction) {
  const [row] = await tx
    .select({
      evaluationId: t.evaluations.id,
      scopeId: t.profileScopes.id,
      scopeKey: t.profileScopes.key,
      gameId: t.games.id,
      slug: t.games.slug,
    })
    .from(t.evaluations)
    .innerJoin(t.profileScopes, eq(t.profileScopes.id, t.evaluations.scopeId))
    .innerJoin(t.games, eq(t.games.id, t.evaluations.gameId))
    .where(eq(t.evaluations.status, "published"))
    .limit(1);
  return row!;
}

describe("Prospective scope switcher", () => {
  /**
   * The case that motivated the whole prospective model.
   *
   * Built from the CURRENTLY published set, this preview shows no switcher —
   * the game has one published scope — and the switcher then appears on the
   * public site the instant this draft publishes, on a page nobody approved.
   */
  it("previews the first draft of a second scope with the switcher publishing will create", async () => {
    const preview = await inRolledBackTransaction(async (tx) => {
      const primary = await publishedPrimary(tx);

      const [sibling] = await tx
        .insert(t.profileScopes)
        .values({
          gameId: primary.gameId,
          key: "expansion",
          label: "Expansion",
          isPrimary: false,
          displayOrder: 2,
        })
        .returning({ id: t.profileScopes.id });

      const draftId = await write.createDraft(
        tx,
        sibling!.id,
        CONTEXT,
        "editor@example.com",
      );
      return readPreview(tx, draftId);
    });

    expect(preview).not.toBeNull();
    // A freshly created draft has no scores, so the public renderer cannot draw
    // it — the switcher is still assembled, because that is what this asserts.
    // A freshly created draft has no scores, so the public renderer cannot draw
    // it yet. The prospective switcher is knowable regardless, which is what
    // this test is about.
    expect(preview!.kind).toBe("incomplete");
    const { scopes, canonicalPath } = preview!;

    // Two scopes, so the public page would render the switcher.
    expect(scopes).toHaveLength(2);
    expect(scopes.map((scope) => scope.key).sort()).toEqual([
      "default",
      "expansion",
    ]);

    // The scope being previewed is the current one.
    const current = scopes.filter((scope) => scope.isCurrent);
    expect(current).toHaveLength(1);
    expect(current[0]!.key).toBe("expansion");

    // Canonical addresses follow ADR 0016: the primary owns the bare game URL,
    // a sibling owns its own scoped path.
    const byKey = new Map(scopes.map((scope) => [scope.key, scope.href]));
    expect(byKey.get("default")).toMatch(/^\/games\/[a-z0-9-]+$/);
    expect(byKey.get("expansion")).toBe(`${byKey.get("default")}/expansion`);

    // And the notice's address is this profile's own, not the game's.
    expect(canonicalPath).toBe(byKey.get("expansion"));
  });

  /**
   * A revision replaces its predecessor in the switcher rather than joining it.
   *
   * Length 0 is the whole assertion, and it is decisive: the game has exactly
   * one scope, so a correct prospective set has one entry and renders no
   * switcher. If the revision were represented alongside the published version
   * it supersedes, the set would have two entries with the same scope key and
   * the switcher would render — a game apparently offering the same experience
   * twice.
   */
  it("does not represent a scope twice when previewing a revision of it", async () => {
    const preview = await inRolledBackTransaction(async (tx) => {
      const primary = await publishedPrimary(tx);
      const revisionId = await write.createRevision(
        tx,
        primary.evaluationId,
        "editor@example.com",
        "Prospective revision",
      );
      return readPreview(tx, revisionId);
    });

    expect(preview!.scopes).toHaveLength(0);
    expect(preview!.canonicalPath).toMatch(/^\/games\/[a-z0-9-]+$/);
  });

  /** Publishing this evaluation does not publish anyone else's draft. */
  it("leaves an unrelated draft scope out of the switcher", async () => {
    const preview = await inRolledBackTransaction(async (tx) => {
      const primary = await publishedPrimary(tx);

      const [sibling] = await tx
        .insert(t.profileScopes)
        .values({
          gameId: primary.gameId,
          key: "unrelated",
          label: "Unrelated",
          isPrimary: false,
          displayOrder: 3,
        })
        .returning({ id: t.profileScopes.id });
      await write.createDraft(tx, sibling!.id, CONTEXT, "editor@example.com");

      // Preview the PRIMARY, which is published. The sibling's draft is not
      // part of what publishing this would do.
      return readPreview(tx, primary.evaluationId);
    });

    expect(preview!.scopes).toHaveLength(0);
  });
});

describe("A lineage is rubric-local", () => {
  /**
   * Version numbering and supersession are per (scope, rubric) — the database
   * says so directly, in `evaluations_scope_version UNIQUE (scope_id,
   * rubric_version, version_number)`.
   *
   * So a rubric-1.0 evaluation is not history for a rubric-2.0 one. Without the
   * rubric filter in `readEvaluationProfile`, the first evaluation authored
   * under a second rubric inherits the entire earlier generation and the gate
   * refuses it with `history_rubric_mismatch`, a duplicate version number, and
   * a supersession chain that cannot be satisfied.
   *
   * This registers a synthetic rubric version at the SQL layer only. It does
   * not invent rubric 2.0 product semantics, and the canonical public rubric is
   * untouched — the boundary under test is which rows are selected.
   */
  it("gives a later rubric's evaluation no history from the earlier one", async () => {
    const result = await inRolledBackTransaction(async (tx) => {
      const primary = await publishedPrimary(tx);

      await tx.execute(sql`
        INSERT INTO rubric_versions
          (version, expected_dimension_count, expected_subcriteria_per_dimension, locked_at)
        VALUES ('9.9-test', 8, 5, '2026-08-17')
      `);

      // Same scope, later rubric, version 1 of its own series. Inserted
      // directly: the point is the read boundary, not the authoring path.
      const [next] = await tx
        .insert(t.evaluations)
        .values({
          gameId: primary.gameId,
          scopeId: primary.scopeId,
          rubricVersion: "9.9-test",
          versionNumber: 1,
          status: "draft",
          evidenceStatus: "verified",
          editionScope: "Base game",
          modeScope: "Second rubric generation",
          platformScope: ["PC"],
          buildOrPatchScope: "Test build",
          evidenceCutoffAt: "2026-08-14",
          releaseContext: "Post-release",
          evidenceLedger: "pending",
          scoreProvenance: "editorial",
          confidence: "medium",
          createdBy: "editor@example.com",
        })
        .returning({ id: t.evaluations.id });

      const sameScopeRows = await tx
        .select({ id: t.evaluations.id })
        .from(t.evaluations)
        .where(eq(t.evaluations.scopeId, primary.scopeId));

      return {
        record: await readEvaluationProfile(tx, next!.id),
        earlier: await readEvaluationProfile(tx, primary.evaluationId),
        sameScopeCount: sameScopeRows.length,
      };
    });

    // The scope really does hold both generations — otherwise this proves
    // nothing about filtering.
    expect(result.sameScopeCount).toBeGreaterThan(1);

    // The later generation starts clean.
    expect(result.record).not.toBeNull();
    // Cast: `RubricVersion` is a literal union of the registered rubrics, and
    // this synthetic one exists only in the database for the duration.
    expect(result.record!.evaluation.rubricVersion as string).toBe("9.9-test");
    expect(result.record!.history ?? []).toEqual([]);

    // And the earlier generation is unaffected by the newcomer.
    expect(result.earlier!.history ?? []).toEqual([]);
    expect(
      (result.earlier!.history ?? []).some(
        (entry) => (entry.rubricVersion as string) === "9.9-test",
      ),
    ).toBe(false);
  });
});
