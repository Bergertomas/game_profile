import { describe, expect, it } from "vitest";
import { SEED_PROFILES } from "@/content";
import { alanWake2 } from "@/content/games/alan-wake-2";
import type { Evaluation, GameWithEvaluation } from "@/lib/profile/types";
import {
  assertValidGameRecord,
  validateEvaluation,
  validateGameRecord,
} from "@/lib/validation/evaluation";
import { RUBRIC_V1 } from "@/lib/rubric";

/**
 * Supersession lineage, evidence-ledger state and publish completeness at the
 * application layer. The equivalent database guarantees are exercised against
 * a real Postgres instance; these are the fast checks that run in CI.
 */

const preRelease: Evaluation = {
  ...alanWake2.evaluation,
  id: "evl_pre",
  versionNumber: 1,
  status: "superseded",
  evidenceStatus: "pre_release",
  evidenceMaturity: "review_code",
  // Low rather than Medium: this fixture reuses Alan Wake 2's two substantive
  // independent sources, and SOP §10.3 targets three before a pre-release
  // profile may claim Medium. That rule has its own coverage in evidence.test.ts.
  confidence: "low",
  publishedAt: "2026-08-01",
};

const postRelease: Evaluation = {
  ...alanWake2.evaluation,
  id: "evl_post",
  versionNumber: 2,
  supersedesEvaluationId: "evl_pre",
  changeSummary: "Reassessed against full-game evidence after launch.",
};

const validChain: GameWithEvaluation = {
  game: alanWake2.game,
  scope: alanWake2.scope,
  evaluation: postRelease,
  history: [preRelease],
};

function codes(record: GameWithEvaluation): string[] {
  return validateGameRecord(record).map((i) => i.code);
}

describe("Valid supersession", () => {
  it("accepts a preserved pre-release profile superseded after launch", () => {
    expect(validateGameRecord(validChain)).toEqual([]);
    expect(() => assertValidGameRecord(validChain)).not.toThrow();
  });

  it("keeps the old evaluation retrievable rather than overwriting it", () => {
    // SOP §10.9 — history is data, not a lost previous state.
    expect(validChain.history).toHaveLength(1);
    expect(validChain.history![0]!.id).toBe("evl_pre");
    expect(validChain.evaluation.supersedesEvaluationId).toBe("evl_pre");
  });

  it("accepts a single evaluation with no history", () => {
    expect(validateGameRecord(alanWake2)).toEqual([]);
  });
});

describe("Invalid supersession", () => {
  it("rejects a link to an evaluation outside this game's history", () => {
    expect(
      codes({
        ...validChain,
        evaluation: { ...postRelease, supersedesEvaluationId: "evl_elsewhere" },
      }),
    ).toContain("dangling_supersession_link");
  });

  it("rejects a supersession link when no history is recorded", () => {
    // A lone evaluation is the oldest in its own chain, so claiming to
    // supersede anything is the more precise diagnosis than "dangling".
    expect(
      codes({
        game: alanWake2.game,
        scope: alanWake2.scope,
        evaluation: postRelease,
      }),
    ).toContain("oldest_evaluation_supersedes");
  });

  it("rejects history that is not linked to", () => {
    expect(
      codes({
        ...validChain,
        evaluation: { ...postRelease, supersedesEvaluationId: undefined },
      }),
    ).toContain("missing_supersession_link");
  });

  it("rejects an evaluation superseding itself", () => {
    expect(
      validateEvaluation({
        ...postRelease,
        supersedesEvaluationId: postRelease.id,
      }).map((i) => i.code),
    ).toContain("self_supersession");
  });

  it("rejects history that is not earlier than the current version", () => {
    expect(
      codes({
        ...validChain,
        history: [{ ...preRelease, versionNumber: 5 }],
        evaluation: { ...postRelease, versionNumber: 2 },
      }),
    ).toContain("history_version_not_earlier");
  });

  it("rejects history still marked published", () => {
    expect(
      codes({ ...validChain, history: [{ ...preRelease, status: "published" }] }),
    ).toContain("history_not_superseded");
  });

  it("requires superseded history to retain its publication date", () => {
    expect(
      codes({
        ...validChain,
        history: [{ ...preRelease, publishedAt: undefined }],
      }),
    ).toContain("missing_published_at");
  });

  it("rejects two live published evaluations for one game", () => {
    expect(
      codes({
        ...validChain,
        history: [{ ...preRelease, status: "published" }],
      }),
    ).toContain("multiple_published_evaluations");
  });

  it("rejects duplicate version numbers", () => {
    expect(
      codes({
        ...validChain,
        history: [{ ...preRelease, versionNumber: 2 }],
      }),
    ).toContain("duplicate_version_number");
  });

  it("rejects an evaluation belonging to another game", () => {
    expect(
      codes({
        ...validChain,
        evaluation: { ...postRelease, gameId: "gme_something_else" },
      }),
    ).toContain("evaluation_game_mismatch");
  });
});

/**
 * A three-version chain is where single-edge validation used to fall down: it
 * only checked the newest link, leaving the middle free to be broken, skipped
 * or reversed while the generator silently repaired it from sort order.
 */
describe("Multi-version chains", () => {
  const v1: Evaluation = {
    ...alanWake2.evaluation,
    id: "evl_v1",
    versionNumber: 1,
    status: "superseded",
    evidenceStatus: "pre_release",
    evidenceMaturity: "hands_on",
    confidence: "low",
    publishedAt: "2026-08-01",
    supersedesEvaluationId: undefined,
  };
  const v2: Evaluation = {
    ...alanWake2.evaluation,
    id: "evl_v2",
    versionNumber: 2,
    status: "superseded",
    evidenceStatus: "provisional",
    confidence: "medium",
    publishedAt: "2026-08-02",
    supersedesEvaluationId: "evl_v1",
  };
  const v3: Evaluation = {
    ...alanWake2.evaluation,
    id: "evl_v3",
    versionNumber: 3,
    supersedesEvaluationId: "evl_v2",
  };

  const chain = (
    history: Evaluation[],
    current: Evaluation,
  ): GameWithEvaluation => ({
    game: alanWake2.game,
    scope: alanWake2.scope,
    evaluation: current,
    history,
  });

  it("accepts a valid three-version chain", () => {
    expect(validateGameRecord(chain([v1, v2], v3))).toEqual([]);
  });

  it("requires the oldest evaluation to supersede nothing", () => {
    expect(
      codes(chain([{ ...v1, supersedesEvaluationId: "evl_v2" }, v2], v3)),
    ).toContain("oldest_evaluation_supersedes");
  });

  it("rejects a missing intermediate link", () => {
    expect(
      codes(chain([v1, { ...v2, supersedesEvaluationId: undefined }], v3)),
    ).toContain("missing_supersession_link");
  });

  it("rejects an intermediate link that skips its predecessor", () => {
    // v3 jumps straight back to v1, orphaning v2.
    expect(
      codes(chain([v1, v2], { ...v3, supersedesEvaluationId: "evl_v1" })),
    ).toContain("supersession_skips_history");
  });

  it("rejects a reversed link", () => {
    // v2 claims to supersede v3, which is later than it.
    expect(
      codes(chain([v1, { ...v2, supersedesEvaluationId: "evl_v3" }], v3)),
    ).toContain("supersession_not_forward");
  });

  it("rejects a link to another game's evaluation", () => {
    expect(
      codes(
        chain(
          [v1, { ...v2, gameId: "gme_other_game" }],
          { ...v3, supersedesEvaluationId: "evl_v2" },
        ),
      ),
    ).toContain("cross_game_supersession");
  });

  it("rejects a dangling intermediate link", () => {
    expect(
      codes(chain([v1, { ...v2, supersedesEvaluationId: "evl_ghost" }], v3)),
    ).toContain("dangling_supersession_link");
  });

  it("keeps every historical evaluation retrievable", () => {
    const record = chain([v1, v2], v3);
    expect(record.history?.map((e) => e.id)).toEqual(["evl_v1", "evl_v2"]);
    expect(record.history?.every((e) => e.status === "superseded")).toBe(true);
  });
});

describe("Evidence ledger state", () => {
  it("is recorded on every seeded evaluation", () => {
    for (const { game, evaluation } of SEED_PROFILES) {
      expect(evaluation.evidenceLedger, game.canonicalTitle).toBeDefined();
    }
  });

  it("rejects a populated ledger with no source records", () => {
    expect(
      validateEvaluation({
        ...alanWake2.evaluation,
        evidenceLedger: "populated",
        sources: [],
      }).map((i) => i.code),
    ).toContain("empty_populated_ledger");
  });

  it("accepts a populated ledger that actually has sources", () => {
    expect(
      validateEvaluation({
        ...alanWake2.evaluation,
        evidenceLedger: "populated",
      }),
    ).toEqual([]);
  });

  it("accepts a pending ledger regardless of source count", () => {
    expect(
      validateEvaluation({
        ...alanWake2.evaluation,
        evidenceLedger: "pending",
        sources: [],
      }).filter((i) => i.code === "empty_populated_ledger"),
    ).toEqual([]);
  });
});

describe("Evidence source identity", () => {
  it("requires unique source keys within an evaluation", () => {
    expect(
      validateEvaluation({
        ...alanWake2.evaluation,
        sources: [
          {
            id: "src_same",
            title: "First",
            tier: "B",
            category: "critic",
          },
          {
            id: "src_same",
            title: "Second",
            tier: "B",
            category: "technical",
          },
        ],
      }).map((i) => i.code),
    ).toContain("duplicate_source_key");
  });

  it("permits two sources that share a title but differ by key", () => {
    expect(
      validateEvaluation({
        ...alanWake2.evaluation,
        sources: [
          {
            id: "src_one",
            title: "Performance analysis",
            tier: "B",
            category: "technical",
          },
          {
            id: "src_two",
            title: "Performance analysis",
            tier: "B",
            category: "technical",
          },
        ],
      }).filter((i) => i.code === "duplicate_source_key"),
    ).toEqual([]);
  });

  it("uses globally unique source keys across the whole corpus", () => {
    const keys = SEED_PROFILES.flatMap(({ evaluation }) =>
      evaluation.sources.map((s) => s.id),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("Published evaluations require complete per-dimension confidence", () => {
  it("flags every dimension that is missing one", () => {
    const issues = validateEvaluation({
      ...alanWake2.evaluation,
      dimensionConfidence: { story: "high" } as never,
    }).filter((i) => i.code === "missing_dimension_confidence");
    expect(issues).toHaveLength(RUBRIC_V1.dimensions.length - 1);
  });

  it("passes when all eight are present", () => {
    expect(
      validateEvaluation(alanWake2.evaluation).filter(
        (i) => i.code === "missing_dimension_confidence",
      ),
    ).toEqual([]);
  });
});
