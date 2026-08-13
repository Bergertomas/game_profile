import { describe, expect, it } from "vitest";
import { alanWake2 } from "@/content/games/alan-wake-2";
import { SEED_PROFILES } from "@/content";
import { buildProfileView, summariseEvidence } from "@/lib/profile/build";
import type { Evaluation, GameWithEvaluation } from "@/lib/profile/types";
import {
  BLOCK_ORDER,
  blockHeadings,
  PRE_RELEASE_NOTICE,
} from "@/lib/profile/vocabulary";
import { validateEvaluation } from "@/lib/validation/evaluation";
import { RUBRIC_V1, UNKNOWN } from "@/lib/rubric";

/**
 * Evidence provenance, per-dimension confidence and the pre-release rules
 * introduced by Master Plan v0.6 and the Editorial Evidence & Data Sourcing
 * SOP v0.2.
 */

function withEvaluation(patch: Partial<Evaluation>): GameWithEvaluation {
  return {
    game: alanWake2.game,
    scope: alanWake2.scope,
    evaluation: { ...alanWake2.evaluation, ...patch },
  };
}

describe("Per-dimension confidence", () => {
  const storyWithTwoUnknowns = {
    ...alanWake2.evaluation.dimensions.story,
    story_hook: {
      ...alanWake2.evaluation.dimensions.story.story_hook,
      value: UNKNOWN,
      rationale:
        alanWake2.evaluation.dimensions.story.story_hook?.rationale ??
        "Evidence unavailable.",
    },
    character_investment: {
      ...alanWake2.evaluation.dimensions.story.character_investment,
      value: UNKNOWN,
      rationale:
        alanWake2.evaluation.dimensions.story.character_investment?.rationale ??
        "Evidence unavailable.",
    },
  };

  it("is recorded for all eight dimensions on every seeded profile", () => {
    for (const { game, evaluation } of SEED_PROFILES) {
      for (const dimension of RUBRIC_V1.dimensions) {
        expect(
          evaluation.dimensionConfidence[dimension.key],
          `${game.canonicalTitle} / ${dimension.key}`,
        ).toBeDefined();
      }
    }
  });

  it("surfaces on the dimension view", () => {
    const profile = buildProfileView(alanWake2);
    const execution = profile.dimensions.find(
      (d) => d.dimension.key === "execution",
    );
    expect(execution?.confidence).toBe("medium");
  });

  it("may differ from overall profile confidence", () => {
    // SOP §5 — the whole point of storing it separately. Alan Wake 2 is a
    // High-confidence profile whose Execution rests on platform-divergent
    // evidence.
    const profile = buildProfileView(alanWake2);
    expect(profile.evaluation.confidence).toBe("high");
    expect(
      profile.dimensions.some((d) => d.confidence !== "high"),
    ).toBe(true);
  });

  it("is rejected when a dimension is missing one", () => {
    const { execution: _dropped, ...rest } =
      alanWake2.evaluation.dimensionConfidence;
    const issues = validateEvaluation(
      withEvaluation({
        dimensionConfidence: rest as Evaluation["dimensionConfidence"],
      }).evaluation,
    );
    expect(issues.map((i) => i.code)).toContain("missing_dimension_confidence");
  });

  it("caps the affected dimension rather than overall profile confidence", () => {
    const issues = validateEvaluation(
      withEvaluation({
        confidence: "high",
        dimensions: {
          ...alanWake2.evaluation.dimensions,
          story: storyWithTwoUnknowns,
        },
        dimensionConfidence: {
          ...alanWake2.evaluation.dimensionConfidence,
          story: "medium",
        },
      }).evaluation,
    );
    expect(issues.map((issue) => issue.code)).not.toContain(
      "confidence_too_high",
    );
  });

  it("rejects High confidence on a dimension with too many unknowns", () => {
    const issues = validateEvaluation(
      withEvaluation({
        confidence: "medium",
        dimensions: {
          ...alanWake2.evaluation.dimensions,
          story: storyWithTwoUnknowns,
        },
        dimensionConfidence: {
          ...alanWake2.evaluation.dimensionConfidence,
          story: "high",
        },
      }).evaluation,
    );
    expect(issues.map((issue) => issue.code)).toContain("confidence_too_high");
  });
});

describe("Evidence provenance", () => {
  it("rejects a published Verified profile with no recorded evidence", () => {
    const issues = validateEvaluation(
      withEvaluation({
        status: "published",
        evidenceStatus: "verified",
        confidence: "medium",
        sources: [],
        evidenceLedger: "pending",
      }).evaluation,
    );
    expect(issues.map((issue) => issue.code)).toContain(
      "verified_without_evidence",
    );
  });

  it("keeps that evidence requirement on superseded history", () => {
    const issues = validateEvaluation(
      withEvaluation({
        status: "superseded",
        publishedAt: "2026-08-01",
        evidenceStatus: "verified",
        confidence: "medium",
        sources: [],
        evidenceLedger: "pending",
      }).evaluation,
    );
    expect(issues.map((issue) => issue.code)).toContain(
      "verified_without_evidence",
    );
  });

  it("categorises every source", () => {
    for (const { game, evaluation } of SEED_PROFILES) {
      for (const source of evaluation.sources) {
        expect(source.category, `${game.canonicalTitle} / ${source.id}`).toBeTruthy();
      }
    }
  });

  it("counts substantive sources as Tier A and B only", () => {
    const summary = summariseEvidence([
      { id: "a", title: "a", tier: "A", category: "direct_play" },
      { id: "b", title: "b", tier: "B", category: "critic" },
      { id: "c", title: "c", tier: "C", category: "first_party" },
      { id: "d", title: "d", tier: "D", category: "player_signal" },
    ]);
    expect(summary.substantiveSources).toBe(2);
    expect(summary.totalSources).toBe(4);
    expect(summary.hasDirectPlay).toBe(true);
  });

  it("groups category counts and omits empty categories", () => {
    const summary = summariseEvidence([
      { id: "a", title: "a", tier: "B", category: "critic" },
      { id: "b", title: "b", tier: "B", category: "critic" },
      { id: "c", title: "c", tier: "C", category: "first_party" },
    ]);
    expect(summary.categoryCounts).toEqual([
      { category: "critic", count: 2 },
      { category: "first_party", count: 1 },
    ]);
    expect(summary.hasDirectPlay).toBe(false);
  });

  it("links sources to the dimensions they bear on", () => {
    const profile = buildProfileView(alanWake2);
    const execution = profile.dimensions.find(
      (d) => d.dimension.key === "execution",
    );
    const atmosphere = profile.dimensions.find(
      (d) => d.dimension.key === "atmosphere",
    );
    // The technical analysis supports Execution and nothing else.
    expect(execution!.linkedSources.length).toBeGreaterThan(
      atmosphere!.linkedSources.length,
    );
    expect(
      execution!.linkedSources.some((s) => s.category === "technical"),
    ).toBe(true);
  });

  it("rejects a source claiming to support a dimension that does not exist", () => {
    const issues = validateEvaluation(
      withEvaluation({
        sources: [
          {
            id: "bad",
            title: "Broken link",
            tier: "B",
            category: "critic",
            supports: ["vibes"] as never,
          },
          ...alanWake2.evaluation.sources,
        ],
      }).evaluation,
    );
    expect(issues.map((i) => i.code)).toContain("unknown_supported_dimension");
  });

  it("holds back source counts while the ledger is unpopulated", () => {
    // The calibration profiles record evidence classes, not individual records.
    // Publishing "supported by 3 sources" would understate the real basis.
    for (const { evaluation } of SEED_PROFILES) {
      expect(evaluation.evidenceLedger).toBe("pending");
    }
  });
});

describe("Pre-release rules", () => {
  const preRelease = (patch: Partial<Evaluation> = {}) =>
    withEvaluation({
      evidenceStatus: "pre_release",
      confidence: "low",
      evidenceMaturity: "hands_on",
      ...patch,
    }).evaluation;

  it("requires an evidence maturity state", () => {
    const issues = validateEvaluation(
      preRelease({ evidenceMaturity: undefined }),
    );
    expect(issues.map((i) => i.code)).toContain("missing_evidence_maturity");
  });

  it("rejects evidence maturity on a released profile", () => {
    const issues = validateEvaluation(
      withEvaluation({ evidenceMaturity: "review_code" }).evaluation,
    );
    expect(issues.map((i) => i.code)).toContain("unexpected_evidence_maturity");
  });

  it("caps overall confidence below High", () => {
    const issues = validateEvaluation(preRelease({ confidence: "high" }));
    expect(issues.map((i) => i.code)).toContain("pre_release_confidence");
  });

  it("refuses a complete numerical profile on first-party evidence alone", () => {
    // SOP §10.3. Alan Wake 2's fixture scores all eight dimensions precisely,
    // which an Announced profile may not do.
    const issues = validateEvaluation(
      preRelease({ evidenceMaturity: "announced" }),
    );
    expect(issues.map((i) => i.code)).toContain("announced_full_profile");
  });

  it("targets three substantive independent sources for Medium confidence", () => {
    const issues = validateEvaluation(
      preRelease({
        confidence: "medium",
        sources: [
          {
            id: "s1",
            title: "One preview",
            tier: "B",
            category: "specialist_creator",
          },
        ],
      }),
    );
    expect(issues.map((i) => i.code)).toContain("pre_release_evidence_thin");
  });

  it("switches the recommendation headings away from verdict language", () => {
    const pre = blockHeadings("pre_release");
    const post = blockHeadings("verified");

    expect(pre.great_fit.title).toBe("Looks promising if…");
    expect(pre.know_before.title).toBe("Watch before buying…");
    expect(pre.probably_not.title).toBe("Biggest unknowns…");

    expect(post.great_fit.title).toBe("Great fit if…");
    expect(post.know_before.title).toBe("Know before buying…");
    expect(post.probably_not.title).toBe("Probably not for you if…");

    // Provisional is still a released game, so it reads as one.
    expect(blockHeadings("provisional")).toEqual(post);

    // No pre-release heading may sound like a settled purchase verdict.
    for (const type of BLOCK_ORDER) {
      expect(pre[type].title).not.toBe(post[type].title);
    }
  });

  it("states plainly that it does not describe the finished game", () => {
    expect(PRE_RELEASE_NOTICE).toMatch(/not the finished release/i);
    expect(PRE_RELEASE_NOTICE).toMatch(/reassessed after launch/i);
  });
});

describe("Launch transition", () => {
  it("supersedes rather than overwrites", () => {
    // SOP §10.9 — the model must let a post-release evaluation point back at
    // the pre-release one it replaces, and both remain retrievable.
    const original = preReleaseEvaluation();
    const postRelease: Evaluation = {
      ...alanWake2.evaluation,
      id: "evl_next",
      versionNumber: 2,
      evidenceStatus: "provisional",
      evidenceMaturity: undefined,
      confidence: "medium",
      supersedesEvaluationId: original.id,
      changeSummary: "Reassessed against full-game evidence after launch.",
    };

    expect(postRelease.supersedesEvaluationId).toBe(original.id);
    expect(postRelease.versionNumber).toBeGreaterThan(original.versionNumber);
    expect(validateEvaluation(postRelease)).toEqual([]);
  });

  function preReleaseEvaluation(): Evaluation {
    return {
      ...alanWake2.evaluation,
      id: "evl_pre",
      versionNumber: 1,
      evidenceStatus: "pre_release",
      evidenceMaturity: "review_code",
      confidence: "medium",
    };
  }
});
