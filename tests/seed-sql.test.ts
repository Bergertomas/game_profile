import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SEED_PROFILES } from "@/content";
import { alanWake2 } from "@/content/games/alan-wake-2";
import { buildSeedSql, sqlString } from "@/lib/db/build-seed";
import type { Evaluation, GameWithEvaluation } from "@/lib/profile/types";

/**
 * The generated seed is a build artefact of the fixtures. These tests keep the
 * committed file honest and cover the properties that make re-seeding safe.
 */

const seed = buildSeedSql(SEED_PROFILES);

describe("committed seed.sql", () => {
  it("is byte-identical to the generator output", () => {
    const committed = readFileSync("lib/db/seed.sql", "utf8");
    expect(committed).toBe(seed);
  });
});

describe("Idempotent seeding", () => {
  it("makes every INSERT conflict-safe", () => {
    const inserts = seed
      .split("\n")
      .filter((line) => line.startsWith("INSERT INTO"));
    expect(inserts.length).toBeGreaterThan(100);
    const unguarded = inserts.filter((line) => !line.includes("ON CONFLICT"));
    expect(unguarded, `unguarded inserts:\n${unguarded.join("\n")}`).toEqual([]);
  });

  it("identifies evidence sources by their stable key, never by title", () => {
    expect(seed).toContain("ON CONFLICT (source_key) DO NOTHING");
    // Resolving a source by title is the bug this replaced.
    expect(seed).not.toMatch(/FROM evidence_sources WHERE title/);
    for (const source of alanWake2.evaluation.sources) {
      expect(seed).toContain(
        `FROM evidence_sources WHERE source_key = ${sqlString(source.id)}`,
      );
    }
  });

  it("survives two sources sharing a title, because keys differ", () => {
    const record = withSources([
      {
        id: "src_a",
        title: "Performance analysis",
        tier: "B",
        category: "technical",
      },
      {
        id: "src_b",
        title: "Performance analysis",
        tier: "B",
        category: "technical",
      },
    ]);
    const sql = buildSeedSql([record]);
    expect(sql).toContain(sqlString("src_a"));
    expect(sql).toContain(sqlString("src_b"));
    // Two distinct inserts, two distinct link resolutions.
    expect(
      sql.match(/INSERT INTO evidence_sources/g)?.length,
    ).toBe(2);
  });

  it("persists evidence-ledger state", () => {
    expect(seed).toContain("evidence_ledger");
    for (const { evaluation } of SEED_PROFILES) {
      expect(seed).toContain(sqlString(evaluation.evidenceLedger));
    }
  });
});

describe("Supersession seeding", () => {
  const previous: Evaluation = {
    ...alanWake2.evaluation,
    id: "evl_prev",
    versionNumber: 1,
    status: "superseded",
    evidenceStatus: "pre_release",
    evidenceMaturity: "review_code",
    confidence: "low",
    publishedAt: undefined,
  };

  const current: Evaluation = {
    ...alanWake2.evaluation,
    id: "evl_current",
    versionNumber: 2,
    supersedesEvaluationId: "evl_prev",
    changeSummary: "Reassessed against full-game evidence after launch.",
  };

  const record: GameWithEvaluation = {
    game: alanWake2.game,
    evaluation: current,
    history: [previous],
  };

  const evaluationInserts = (sql: string) =>
    sql.split("\n").filter((line) => line.startsWith("INSERT INTO evaluations"));

  it("emits the predecessor before the successor", () => {
    // Order matters: the successor's supersedes_evaluation_id is a subquery
    // against the predecessor's row, which therefore has to exist already.
    const inserts = evaluationInserts(buildSeedSql([record]));
    expect(inserts).toHaveLength(2);
    expect(inserts[0]).toContain("'1.0', 1,");
    expect(inserts[1]).toContain("'1.0', 2,");
  });

  it("links the successor to the predecessor by version lookup", () => {
    const inserts = evaluationInserts(buildSeedSql([record]));
    // The first evaluation in the chain supersedes nothing.
    expect(inserts[0]).not.toMatch(/e\.version_number = \d+\)/);
    // The second resolves its predecessor by (game slug, version number).
    expect(inserts[1]).toMatch(/e\.version_number = 1\)/);
  });

  it("seeds a null supersession link when there is no history", () => {
    const inserts = evaluationInserts(buildSeedSql([alanWake2]));
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).not.toMatch(/e\.version_number = \d+\)/);
  });

  it("refuses to emit SQL for an incoherent chain", () => {
    const broken: GameWithEvaluation = {
      ...record,
      evaluation: { ...current, supersedesEvaluationId: "evl_does_not_exist" },
    };
    expect(() => buildSeedSql([broken])).toThrow(/dangling_supersession_link/);
  });
});

function withSources(
  sources: Evaluation["sources"],
): GameWithEvaluation {
  return {
    game: alanWake2.game,
    evaluation: { ...alanWake2.evaluation, sources },
  };
}
