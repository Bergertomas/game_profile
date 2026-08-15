import { afterAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { closeDatabase, getDatabase } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import type { AdminTransaction } from "@/lib/admin/db";
import {
  draftProgress,
  readEvaluationEditor,
  readScopeHistory,
} from "@/lib/admin/evaluations";
import * as write from "@/lib/admin/evaluation-write";
import { readPublishedProfiles } from "@/lib/db/read-profiles";
import { buildProfileView } from "@/lib/profile/build";
import {
  deriveDimensionScore,
  formatDimensionScore,
} from "@/lib/scoring/derive";
import {
  dimensionsInRadarOrder,
  RUBRIC_V1,
  UNKNOWN,
  type SubcriterionValue,
} from "@/lib/rubric";

/**
 * Evaluation authoring, against real Postgres.
 *
 * These call the functions the Server Actions call, so what is under test is
 * what an editor will actually meet. Everything runs inside a transaction that
 * is rolled back — published rows are immutable by trigger, so a test that
 * published something could not clean up any other way.
 *
 * The properties worth stating up front, because they are the ones a refactor
 * would quietly break:
 *
 *  - Unknown is NULL and is never zero;
 *  - an unauthored subcriterion has NO ROW, which is a different thing again;
 *  - dimension totals are derived by the SAME function the public site uses;
 *  - a revision leaves its predecessor byte-for-byte alone;
 *  - a draft may be saved in any state of incompleteness.
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
      error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
    return `${error instanceof Error ? error.message : String(error)} ${cause}`;
  }
  throw new Error("expected a refusal, but the write succeeded");
}

const CONTEXT = {
  rubricVersion: "1.0" as const,
  editionScope: "Base game",
  modeScope: "Authoring test mode",
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
async function newScope(tx: AdminTransaction, key = "authoring"): Promise<string> {
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
      label: "Authoring fixture",
      isPrimary: false,
      displayOrder: 8,
    })
    .returning({ id: t.profileScopes.id });
  return scope!.id;
}

describe("Starting a draft", () => {
  it("saves with declared scope alone, and nothing else authored", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(tx, scopeId, CONTEXT, "editor@example.com");
      return readEvaluationEditor(tx as never, id);
    });

    expect(view?.status).toBe("draft");
    expect(view?.editable).toBe(true);
    // Draft completeness is not publication completeness: nothing is scored,
    // nothing is interpreted, and the row exists happily.
    const progress = draftProgress(view!);
    expect(progress.scoredSubcriteria).toBe(0);
    expect(progress.totalSubcriteria).toBe(40);
    expect(view?.oneLineExperience).toBeNull();
  });

  it("numbers versions per scope, not per game", async () => {
    const versions = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const first = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");
      await tx.delete(t.evaluations).where(eq(t.evaluations.id, first));
      const second = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");
      const view = await readEvaluationEditor(tx as never, second);
      return view?.versionNumber;
    });
    // Returnal's seeded scope is a different series, so this one starts at 1.
    expect(versions).toBe(1);
  });
});

describe("All forty subcriteria", () => {
  it("can be authored, and persist exactly", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");

      let n = 0;
      for (const dimension of dimensionsInRadarOrder()) {
        for (const sub of dimension.subcriteria) {
          const value = ([0, 0.5, 1, 1.5, 2] as const)[n % 5]!;
          await write.saveSubcriterion(tx, id, "1.0", {
            dimensionKey: dimension.key,
            subcriterionKey: sub.key,
            value,
            rationale: `Rationale for ${dimension.key}.${sub.key}`,
            platformNote: undefined,
            evidenceConfidence: undefined,
          });
          n += 1;
        }
      }
      return readEvaluationEditor(tx as never, id);
    });

    const all = view!.dimensions.flatMap((d) => d.subcriteria);
    expect(all).toHaveLength(40);
    expect(all.every((sub) => sub.value !== null)).toBe(true);
    expect(all.every((sub) => (sub.rationale ?? "").startsWith("Rationale for"))).toBe(true);
    expect(draftProgress(view!).scoredSubcriteria).toBe(40);
    expect(draftProgress(view!).rationales).toBe(40);
  });
});

describe("The three states of a subcriterion", () => {
  it("keeps Unknown, zero and unauthored distinct", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");
      const story = RUBRIC_V1.dimensions.find((d) => d.key === "story")!;

      await write.saveSubcriterion(tx, id, "1.0", {
        dimensionKey: "story",
        subcriterionKey: story.subcriteria[0]!.key,
        value: 0,
        rationale: "A real reading of zero.",
        platformNote: undefined,
        evidenceConfidence: undefined,
      });
      await write.saveSubcriterion(tx, id, "1.0", {
        dimensionKey: "story",
        subcriterionKey: story.subcriteria[1]!.key,
        value: UNKNOWN,
        rationale: "The evidence does not settle it.",
        platformNote: undefined,
        evidenceConfidence: undefined,
      });
      // The third is left entirely alone.
      return readEvaluationEditor(tx as never, id);
    });

    const story = view!.dimensions.find((d) => d.dimension.key === "story")!;
    expect(story.subcriteria[0]!.value).toBe(0);
    expect(story.subcriteria[1]!.value).toBe(UNKNOWN);
    expect(story.subcriteria[2]!.value).toBeNull();
    // Zero is a score; Unknown is not; unauthored is neither.
    expect(story.authoredCount).toBe(2);
    expect(story.unknownCount).toBe(1);
    // No total from a partial grid, however tempting.
    expect(story.score).toBeNull();
  });

  it("clears a subcriterion by removing the row, not by nulling the score", async () => {
    // Nulling it would turn "not looked at" into "looked at, cannot say" —
    // which is a published claim about the evidence.
    const [authored, cleared] = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");
      const key = RUBRIC_V1.dimensions[0]!.subcriteria[0]!.key;
      const dimensionKey = RUBRIC_V1.dimensions[0]!.key;

      await write.saveSubcriterion(tx, id, "1.0", {
        dimensionKey,
        subcriterionKey: key,
        value: UNKNOWN,
        rationale: undefined,
        platformNote: undefined,
        evidenceConfidence: undefined,
      });
      const [withUnknown] = await tx
        .select({ value: sql<number>`count(*)` })
        .from(t.subcriterionScores)
        .where(eq(t.subcriterionScores.evaluationId, id));

      await write.saveSubcriterion(tx, id, "1.0", {
        dimensionKey,
        subcriterionKey: key,
        value: null,
        rationale: undefined,
        platformNote: undefined,
        evidenceConfidence: undefined,
      });
      const [afterClear] = await tx
        .select({ value: sql<number>`count(*)` })
        .from(t.subcriterionScores)
        .where(eq(t.subcriterionScores.evaluationId, id));

      return [Number(withUnknown?.value), Number(afterClear?.value)];
    });

    expect(authored).toBe(1);
    expect(cleared).toBe(0);
  });
});

describe("Derived totals", () => {
  /**
   * The editor must not acquire its own arithmetic. This asserts the editor's
   * number against `deriveDimensionScore` computed independently — the same
   * function `buildProfileView` uses for the public page.
   */
  it("match the public scoring function exactly, including the range state", async () => {
    const { editorTotals, expectedTotals } = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");
      const story = RUBRIC_V1.dimensions.find((d) => d.key === "story")!;
      const values: SubcriterionValue[] = [2, 1.5, 1, 0, UNKNOWN];

      for (const [index, sub] of story.subcriteria.entries()) {
        await write.saveSubcriterion(tx, id, "1.0", {
          dimensionKey: "story",
          subcriterionKey: sub.key,
          value: values[index]!,
          rationale: "r",
          platformNote: undefined,
          evidenceConfidence: undefined,
        });
      }

      const view = await readEvaluationEditor(tx as never, id);
      const draft = view!.dimensions.find((d) => d.dimension.key === "story")!;
      const independent = deriveDimensionScore(
        story,
        Object.fromEntries(story.subcriteria.map((s, i) => [s.key, values[i]!])),
      );
      return {
        editorTotals: { score: draft.score, display: draft.display },
        expectedTotals: { score: independent, display: formatDimensionScore(independent) },
      };
    });

    expect(editorTotals.score).toEqual(expectedTotals.score);
    expect(editorTotals.display).toBe(expectedTotals.display);
    // 2 + 1.5 + 1 + 0 = 4.5, and one Unknown makes it a two-point range.
    expect(editorTotals.display).toBe("4.5–6.5");
  });

  it("leave a dimension unscored once two readings are Unknown", async () => {
    const draft = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");
      const story = RUBRIC_V1.dimensions.find((d) => d.key === "story")!;
      const values: SubcriterionValue[] = [2, 2, 2, UNKNOWN, UNKNOWN];
      for (const [index, sub] of story.subcriteria.entries()) {
        await write.saveSubcriterion(tx, id, "1.0", {
          dimensionKey: "story",
          subcriterionKey: sub.key,
          value: values[index]!,
          rationale: "r",
          platformNote: undefined,
          evidenceConfidence: undefined,
        });
      }
      const view = await readEvaluationEditor(tx as never, id);
      return view!.dimensions.find((d) => d.dimension.key === "story")!;
    });

    expect(draft.score?.kind).toBe("insufficient");
    expect(draft.display).toBe("Not scored");
  });
});

describe("Per-dimension confidence", () => {
  it("persists independently of the overall figure", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");
      await write.saveDimensionAssessment(tx, id, "1.0", "story", "low", "Thin evidence.");
      await write.saveDimensionAssessment(tx, id, "1.0", "craft", "high", undefined);
      return readEvaluationEditor(tx as never, id);
    });

    expect(view?.confidence).toBe("medium");
    const byKey = new Map(view!.dimensions.map((d) => [d.dimension.key, d]));
    expect(byKey.get("story")?.confidence).toBe("low");
    expect(byKey.get("story")?.note).toBe("Thin evidence.");
    expect(byKey.get("craft")?.confidence).toBe("high");
  });
});

describe("Platform overrides", () => {
  it("persist without changing the base total", async () => {
    const { before, after, override } = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");
      const story = RUBRIC_V1.dimensions.find((d) => d.key === "story")!;
      for (const sub of story.subcriteria) {
        await write.saveSubcriterion(tx, id, "1.0", {
          dimensionKey: "story",
          subcriterionKey: sub.key,
          value: 2,
          rationale: "r",
          platformNote: undefined,
          evidenceConfidence: undefined,
        });
      }
      const beforeView = await readEvaluationEditor(tx as never, id);

      const [platform] = await tx
        .select({ id: t.platforms.id })
        .from(t.gamePlatforms)
        .innerJoin(t.platforms, eq(t.platforms.id, t.gamePlatforms.platformId))
        .innerJoin(t.games, eq(t.games.id, t.gamePlatforms.gameId))
        .where(eq(t.games.slug, "returnal"))
        .limit(1);

      await write.saveOverride(tx, id, "1.0", {
        dimensionKey: "story",
        subcriterionKey: story.subcriteria[0]!.key,
        platformId: platform!.id,
        value: 0.5,
        rationale: "Materially worse on this platform.",
        evidenceConfidence: undefined,
      });

      const afterView = await readEvaluationEditor(tx as never, id);
      const story2 = afterView!.dimensions.find((d) => d.dimension.key === "story")!;
      return {
        before: beforeView!.dimensions.find((d) => d.dimension.key === "story")!.display,
        after: story2.display,
        override: story2.subcriteria[0]!.overrides[0],
      };
    });

    expect(before).toBe("10.0");
    // The whole contract of ADR 0015: the override is recorded and the base
    // total is untouched.
    expect(after).toBe("10.0");
    expect(override?.value).toBe(0.5);
    expect(override?.rationale).toBe("Materially worse on this platform.");
  });

  it("are refused when they do not actually differ from the base", async () => {
    const message = await refusalOf(() =>
      inRolledBackTransaction(async (tx) => {
        const scopeId = await newScope(tx);
        const id = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");
        const story = RUBRIC_V1.dimensions.find((d) => d.key === "story")!;
        await write.saveSubcriterion(tx, id, "1.0", {
          dimensionKey: "story",
          subcriterionKey: story.subcriteria[0]!.key,
          value: 2,
          rationale: "r",
          platformNote: undefined,
          evidenceConfidence: undefined,
        });
        const [platform] = await tx
          .select({ id: t.platforms.id })
          .from(t.gamePlatforms)
          .innerJoin(t.platforms, eq(t.platforms.id, t.gamePlatforms.platformId))
          .innerJoin(t.games, eq(t.games.id, t.gamePlatforms.gameId))
          .where(eq(t.games.slug, "returnal"))
          .limit(1);
        await write.saveOverride(tx, id, "1.0", {
          dimensionKey: "story",
          subcriterionKey: story.subcriteria[0]!.key,
          platformId: platform!.id,
          value: 2,
          rationale: "Identical, which is not a deviation.",
          evidenceConfidence: undefined,
        });
      }),
    );
    expect(message).toMatch(/differ|override/i);
  });
});

describe("Evidence", () => {
  it("creates a source, maps it, and keeps the authored order", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");

      const first = await write.upsertEvidenceSource(tx, {
        sourceKey: "src_2c_one",
        title: "First source",
        tier: "A",
        category: "direct_play",
        url: undefined,
        publisher: undefined,
        author: undefined,
        publishedAt: undefined,
        accessedAt: undefined,
        sourceType: undefined,
      });
      const second = await write.upsertEvidenceSource(tx, {
        sourceKey: "src_2c_two",
        title: "Second source",
        tier: "D",
        category: "player_signal",
        url: undefined,
        publisher: undefined,
        author: undefined,
        publishedAt: undefined,
        accessedAt: undefined,
        sourceType: undefined,
      });

      await write.linkEvidence(tx, id, "1.0", {
        evidenceSourceId: first,
        dimensionKey: "story",
        subcriterionKey: undefined,
        platformScope: ["PC"],
        note: "Sources disagree; recorded rather than resolved.",
        spoilerSensitive: true,
      });
      await write.linkEvidence(tx, id, "1.0", {
        evidenceSourceId: second,
        dimensionKey: undefined,
        subcriterionKey: undefined,
        platformScope: undefined,
        note: undefined,
        spoilerSensitive: false,
      });

      return readEvaluationEditor(tx as never, id);
    });

    expect(view!.evidence.map((link) => link.sourceKey)).toEqual([
      "src_2c_one",
      "src_2c_two",
    ]);
    expect(view!.evidence[0]).toMatchObject({
      dimensionKey: "story",
      spoilerSensitive: true,
      platformScope: ["PC"],
      displayOrder: 1,
    });
    // Profile-level evidence supports no particular score.
    expect(view!.evidence[1]!.dimensionKey).toBeNull();
  });

  it("reorders by swapping positions, leaving the rest alone", async () => {
    const order = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");
      for (const key of ["src_a", "src_b", "src_c"]) {
        const sourceId = await write.upsertEvidenceSource(tx, {
          sourceKey: key,
          title: key,
          tier: "B",
          category: "critic",
          url: undefined,
          publisher: undefined,
          author: undefined,
          publishedAt: undefined,
          accessedAt: undefined,
          sourceType: undefined,
        });
        await write.linkEvidence(tx, id, "1.0", {
          evidenceSourceId: sourceId,
          dimensionKey: undefined,
          subcriterionKey: undefined,
          platformScope: undefined,
          note: undefined,
          spoilerSensitive: false,
        });
      }

      const before = await readEvaluationEditor(tx as never, id);
      const last = before!.evidence[2]!;
      await write.moveEvidenceLink(tx, id, last.id, "up");
      const after = await readEvaluationEditor(tx as never, id);
      return after!.evidence.map((link) => link.sourceKey);
    });

    expect(order).toEqual(["src_a", "src_c", "src_b"]);
  });

  it("maps a subcriterion only alongside its dimension", async () => {
    // The database says the same thing with
    // `evidence_subcriterion_requires_dimension`; this proves the write path
    // does not find a way around it.
    const message = await refusalOf(() =>
      inRolledBackTransaction(async (tx) => {
        const scopeId = await newScope(tx);
        const id = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");
        const sourceId = await write.upsertEvidenceSource(tx, {
          sourceKey: "src_orphan",
          title: "Orphan",
          tier: "B",
          category: "critic",
          url: undefined,
          publisher: undefined,
          author: undefined,
          publishedAt: undefined,
          accessedAt: undefined,
          sourceType: undefined,
        });
        await tx.execute(sql`
          INSERT INTO evaluation_evidence_links
            (evaluation_id, evidence_source_id, subcriterion_id, display_order)
          VALUES (${id}, ${sourceId},
            (SELECT s.id FROM subcriteria s JOIN dimensions d ON d.id = s.dimension_id
              WHERE d.rubric_version='1.0' AND d.key='story' LIMIT 1), 1)
        `);
      }),
    );
    expect(message).toMatch(/subcriterion/i);
  });
});

describe("Tags", () => {
  it("persist with intensity, note and the authored order", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");
      await write.setTags(tx, id, [
        { key: "melancholy", intensity: undefined, note: "Persistent." },
        { key: "linear", intensity: undefined, note: undefined },
        { key: "horror", intensity: "high", note: undefined },
      ]);
      return readEvaluationEditor(tx as never, id);
    });

    // Exactly the order given, which is NOT the vocabulary order.
    expect(view!.tags.map((tag) => tag.key)).toEqual([
      "melancholy",
      "linear",
      "horror",
    ]);
    expect(view!.tags[0]!.note).toBe("Persistent.");
    expect(view!.tags[2]!.intensity).toBe("high");
  });
});

describe("Interpretation", () => {
  it("persists the one-line, pull, risk and every block in order", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");
      await write.saveInterpretation(tx, id, {
        oneLineExperience: "What it is to play.",
        primaryPull: "The single strongest reason.",
        primaryRisk: "The single likeliest mismatch.",
        platformWarning: "One platform is materially worse.",
        blocks: {
          great_fit: ["First bullet.", "Second bullet."],
          know_before: ["A caveat."],
          probably_not: [],
        },
      });
      return readEvaluationEditor(tx as never, id);
    });

    expect(view?.oneLineExperience).toBe("What it is to play.");
    expect(view?.primaryPull).toBe("The single strongest reason.");
    expect(view?.primaryRisk).toBe("The single likeliest mismatch.");
    expect(view?.platformWarning).toBe("One platform is materially worse.");
    expect(view?.blocks.great_fit).toEqual(["First bullet.", "Second bullet."]);
    expect(view?.blocks.know_before).toEqual(["A caveat."]);
    expect(view?.blocks.probably_not).toEqual([]);
  });
});

describe("Save and resume", () => {
  it("returns a half-finished draft exactly as it was left", async () => {
    const { first, second } = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx);
      const id = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");
      const story = RUBRIC_V1.dimensions.find((d) => d.key === "story")!;

      await write.saveSubcriterion(tx, id, "1.0", {
        dimensionKey: "story",
        subcriterionKey: story.subcriteria[0]!.key,
        value: 1.5,
        rationale: "Written on day one.",
        platformNote: undefined,
        evidenceConfidence: undefined,
      });
      const firstRead = await readEvaluationEditor(tx as never, id);

      // "Come back later" — a second read of the same row.
      const secondRead = await readEvaluationEditor(tx as never, id);
      return { first: firstRead, second: secondRead };
    });

    expect(second).toEqual(first);
    const story = second!.dimensions.find((d) => d.dimension.key === "story")!;
    expect(story.subcriteria[0]!.value).toBe(1.5);
    expect(story.subcriteria[0]!.rationale).toBe("Written on day one.");
    expect(draftProgress(second!).scoredSubcriteria).toBe(1);
  });
});

describe("Revisions", () => {
  /**
   * The rule the whole versioning model exists for: a revision is a NEW row.
   * The predecessor is not edited, not re-statused and not touched.
   */
  it("copy the predecessor's content and leave it untouched", async () => {
    const { predecessorBefore, predecessorAfter, revision } =
      await inRolledBackTransaction(async (tx) => {
        const [published] = await tx
          .select()
          .from(t.evaluations)
          .innerJoin(t.games, eq(t.games.id, t.evaluations.gameId))
          .where(eq(t.games.slug, "alan-wake-2"))
          .limit(1);
        const sourceId = published!.evaluations.id;

        const before = await readEvaluationEditor(tx as never, sourceId);
        const revisionId = await write.createRevision(
          tx,
          sourceId,
          "editor@example.com",
          "Patched since the original reading.",
        );
        const after = await readEvaluationEditor(tx as never, sourceId);
        const created = await readEvaluationEditor(tx as never, revisionId);
        return {
          predecessorBefore: before,
          predecessorAfter: after,
          revision: created,
        };
      });

    // Byte-for-byte: nothing about the published version changed.
    expect(predecessorAfter).toEqual(predecessorBefore);
    expect(predecessorAfter?.status).toBe("published");

    expect(revision?.status).toBe("draft");
    expect(revision?.supersedesEvaluationId).toBe(predecessorBefore!.id);
    expect(revision?.changeSummary).toBe("Patched since the original reading.");
    expect(revision?.versionNumber).toBe(predecessorBefore!.versionNumber + 1);

    // The content came across, so an editor is revising rather than retyping.
    const scored = revision!.dimensions.flatMap((d) => d.subcriteria);
    expect(scored.filter((sub) => sub.value !== null)).toHaveLength(40);
    expect(revision!.tags.map((tag) => tag.key)).toEqual(
      predecessorBefore!.tags.map((tag) => tag.key),
    );
    expect(revision!.evidence).toHaveLength(predecessorBefore!.evidence.length);
    expect(revision!.blocks.great_fit).toEqual(predecessorBefore!.blocks.great_fit);

    /*
     * Provenance resets to editorial. The predecessor came out of a calibration
     * round; nobody re-ran that round for this revision, so claiming it would
     * put a false round label on a published page (ADR 0005).
     */
    expect(predecessorBefore!.scoreProvenance).toBe("calibration");
    expect(revision!.scoreProvenance).toBe("editorial");
    expect(revision!.calibrationRound).toBeNull();
  });

  it("refuse a second open draft for the same scope", async () => {
    const message = await refusalOf(() =>
      inRolledBackTransaction(async (tx) => {
        const [published] = await tx
          .select({ id: t.evaluations.id })
          .from(t.evaluations)
          .innerJoin(t.games, eq(t.games.id, t.evaluations.gameId))
          .where(eq(t.games.slug, "alan-wake-2"))
          .limit(1);
        await write.createRevision(tx, published!.id, "e@example.com", "First.");
        await write.createRevision(tx, published!.id, "e@example.com", "Second.");
      }),
    );
    expect(message).toMatch(/already has an evaluation in progress/i);
  });

  it("show up in the scope's history, newest first", async () => {
    const history = await inRolledBackTransaction(async (tx) => {
      const [published] = await tx
        .select({ id: t.evaluations.id, scopeId: t.evaluations.scopeId })
        .from(t.evaluations)
        .innerJoin(t.games, eq(t.games.id, t.evaluations.gameId))
        .where(eq(t.games.slug, "alan-wake-2"))
        .limit(1);
      await write.createRevision(tx, published!.id, "e@example.com", "A revision.");
      return readScopeHistory(tx as never, published!.scopeId);
    });

    expect(history!.evaluations).toHaveLength(2);
    expect(history!.evaluations[0]!.status).toBe("draft");
    expect(history!.evaluations[1]!.status).toBe("published");
  });
});

describe("A published evaluation", () => {
  it("cannot be edited through the authoring path", async () => {
    const message = await refusalOf(() =>
      inRolledBackTransaction(async (tx) => {
        const [published] = await tx
          .select({ id: t.evaluations.id })
          .from(t.evaluations)
          .innerJoin(t.games, eq(t.games.id, t.evaluations.gameId))
          .where(eq(t.games.slug, "alan-wake-2"))
          .limit(1);
        await write.saveSubcriterion(tx, published!.id, "1.0", {
          dimensionKey: "story",
          subcriterionKey: RUBRIC_V1.dimensions[0]!.subcriteria[0]!.key,
          value: 0,
          rationale: "Should never land.",
          platformNote: undefined,
          evidenceConfidence: undefined,
        });
      }),
    );
    // The editor's own sentence, not the trigger's — but the trigger is behind
    // it either way.
    expect(message).toMatch(/published profile is a snapshot|immutable/i);
  });

  it("is reported as read-only by the editor view", async () => {
    const view = await inRolledBackTransaction(async (tx) => {
      const [published] = await tx
        .select({ id: t.evaluations.id })
        .from(t.evaluations)
        .innerJoin(t.games, eq(t.games.id, t.evaluations.gameId))
        .where(eq(t.games.slug, "alan-wake-2"))
        .limit(1);
      return readEvaluationEditor(tx as never, published!.id);
    });
    expect(view?.editable).toBe(false);
  });
});

describe("Draft and review data", () => {
  /**
   * Queried through the transaction's own handle rather than
   * `readPublishedProfiles`.
   *
   * The public reader holds its own connection, and the pool is `max: 1`, so
   * calling it from inside an open transaction queues behind that transaction
   * and times out. The selection rule is what matters and it is the same one:
   * status = published, for the public rubric version.
   */
  it("never reaches the public selector", async () => {
    const visible = await inRolledBackTransaction(async (tx) => {
      const scopeId = await newScope(tx, "hidden");
      const id = await write.createDraft(tx, scopeId, CONTEXT, "e@example.com");
      await write.setWorkingStatus(tx, id, "review");
      await tx.execute(sql.raw("SET CONSTRAINTS ALL IMMEDIATE"));

      const rows = await tx
        .select({ key: t.profileScopes.key, status: t.evaluations.status })
        .from(t.evaluations)
        .innerJoin(t.profileScopes, eq(t.profileScopes.id, t.evaluations.scopeId))
        .where(eq(t.evaluations.status, "published"));
      return rows.map((row) => row.key);
    });

    expect(visible).not.toContain("hidden");
    expect(visible.length).toBeGreaterThan(0);
  });

  it("is invisible to the real public reader too", async () => {
    // Outside any transaction, so the reader may use its own connection.
    const published = await readPublishedProfiles(RUBRIC_V1.version);
    expect(published.every((record) => record.evaluation.status === "published")).toBe(
      true,
    );
  });
});

describe("The calibration corpus", () => {
  it("still derives exactly the approved totals", async () => {
    // The public numbers must not move because an editor gained the ability to
    // author new ones.
    const records = await readPublishedProfiles(RUBRIC_V1.version);
    const returnal = records.find((record) => record.game.slug === "returnal");
    const view = buildProfileView(returnal!);
    const totals = Object.fromEntries(
      view.dimensions.map((d) => [d.dimension.key, d.display]),
    );

    expect(totals).toMatchObject({
      story: "7.5",
      execution: "9.5",
      structure: "8.5",
      agency: "10.0",
      pacing: "7.5",
      atmosphere: "9.5",
      thematic: "8.5",
      craft: "10.0",
    });
  });
});
