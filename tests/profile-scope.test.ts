import { describe, expect, it } from "vitest";
import { alanWake2 } from "@/content";
import { buildSeedSql } from "@/lib/db/build-seed";
import {
  getGameProfile,
  getGameProfileForScope,
  listGameProfiles,
  listGameSlugs,
  listProfileScopes,
} from "@/lib/data/games";
import type {
  Evaluation,
  GameWithEvaluation,
  ProfileScope,
} from "@/lib/profile/types";
import {
  assertValidGameRecord,
  validateGameRecord,
} from "@/lib/validation/evaluation";

/**
 * Profile scopes: one game, several simultaneously current evaluated
 * experiences, each with its own independent version history.
 *
 * The blocker these encode is concrete. Rubric §1 says to create separate
 * evaluations where modes materially change the experience, and the previous
 * model could not hold two: uniqueness was keyed on the game, so The Long Dark
 * could publish Survival *or* Wintermute and never both.
 *
 * The seeded corpus deliberately contains no such game — inventing one is
 * editorial work Phase 2 owns — so the capability is proved here against a
 * synthetic two-scope corpus, exactly as supersession chains already are.
 */

const survival: ProfileScope = {
  id: "scp_tld_survival",
  gameId: "gme_tld",
  key: "survival",
  label: "Survival",
  summary: "The open-ended survival sandbox.",
  displayOrder: 1,
};

const wintermute: ProfileScope = {
  id: "scp_tld_wintermute",
  gameId: "gme_tld",
  key: "wintermute",
  label: "Wintermute",
  summary: "The authored story campaign.",
  displayOrder: 2,
};

const game = {
  ...alanWake2.game,
  id: "gme_tld",
  slug: "the-long-dark",
  canonicalTitle: "The Long Dark",
};

function evaluationIn(
  scope: ProfileScope,
  patch: Partial<Evaluation> = {},
): Evaluation {
  return {
    ...alanWake2.evaluation,
    id: `evl_${scope.key}_v${patch.versionNumber ?? 1}`,
    gameId: game.id,
    scopeId: scope.id,
    versionNumber: 1,
    supersedesEvaluationId: undefined,
    changeSummary: undefined,
    ...patch,
  };
}

function recordFor(
  scope: ProfileScope,
  evaluation: Evaluation,
  history?: Evaluation[],
): GameWithEvaluation {
  return { game, scope, evaluation, history };
}

const survivalOnly = recordFor(survival, evaluationIn(survival));
const wintermuteOnly = recordFor(wintermute, evaluationIn(wintermute));

describe("A game with several current profile scopes", () => {
  it("accepts two published profiles of one game", () => {
    expect(validateGameRecord(survivalOnly)).toEqual([]);
    expect(validateGameRecord(wintermuteOnly)).toEqual([]);
    expect(() => buildSeedSql([survivalOnly, wintermuteOnly])).not.toThrow();
  });

  it("lets both series number their first version 1", () => {
    // Version numbers are per series. Forcing Wintermute to start at 2 because
    // Survival exists would make the number mean "how many profiles has this
    // game had", which is not what a version is.
    expect(survivalOnly.evaluation.versionNumber).toBe(1);
    expect(wintermuteOnly.evaluation.versionNumber).toBe(1);
    expect(() => buildSeedSql([survivalOnly, wintermuteOnly])).not.toThrow();
  });

  it("gives each series its own supersession history", () => {
    const survivalV1 = evaluationIn(survival, {
      versionNumber: 1,
      status: "superseded",
      publishedAt: "2026-08-01",
    });
    const survivalV2 = evaluationIn(survival, {
      versionNumber: 2,
      supersedesEvaluationId: survivalV1.id,
      changeSummary: "Reassessed after the Safe Haven update.",
    });

    const twoScopes = [
      recordFor(survival, survivalV2, [survivalV1]),
      wintermuteOnly,
    ];

    expect(validateGameRecord(twoScopes[0]!)).toEqual([]);
    // Wintermute is untouched by Survival's revision — that is the point of
    // separate series, and the reason supersession is scope-local.
    expect(wintermuteOnly.evaluation.versionNumber).toBe(1);
    expect(wintermuteOnly.history).toBeUndefined();
    expect(() => buildSeedSql(twoScopes)).not.toThrow();
  });

  it("resolves each evaluation by scope, so the seed cannot pick the wrong series", () => {
    const sql = buildSeedSql([survivalOnly, wintermuteOnly]);
    for (const key of ["survival", "wintermute"]) {
      expect(sql).toContain(
        `SELECT ps.id FROM profile_scopes ps JOIN games g ON g.id = ps.game_id WHERE g.slug = 'the-long-dark' AND ps.key = '${key}'`,
      );
    }
  });

  it("seeds the scope rows themselves, keyed on (game, key)", () => {
    const sql = buildSeedSql([survivalOnly, wintermuteOnly]);
    expect(sql).toContain("INSERT INTO profile_scopes (game_id, key, label");
    expect(sql).toContain("ON CONFLICT (game_id, key) DO UPDATE");
    expect(sql).toContain("'Wintermute'");
  });
});

describe("Scope identity", () => {
  it("rejects two records of one game claiming the same scope key", () => {
    // Same key means same series, so these two would compete for the single
    // published row that series is allowed — a conflict no per-record check
    // can see.
    const duplicate = recordFor(
      { ...wintermute, id: "scp_tld_other", key: "survival" },
      evaluationIn({ ...wintermute, id: "scp_tld_other", key: "survival" }, {
        id: "evl_dupe",
      }),
    );
    expect(() => buildSeedSql([survivalOnly, duplicate])).toThrow(
      /profile scope "survival" appears in more than one seed record/,
    );
  });

  it("rejects one scope id describing two different scopes", () => {
    const collidingId = recordFor(
      { ...wintermute, id: survival.id },
      evaluationIn({ ...wintermute, id: survival.id }, { id: "evl_collide" }),
    );
    expect(() => buildSeedSql([survivalOnly, collidingId])).toThrow(
      /is used by two different scopes/,
    );
  });

  it("rejects a scope belonging to another game", () => {
    const foreign = recordFor(
      { ...survival, gameId: "gme_somewhere_else" },
      evaluationIn(survival),
    );
    expect(validateGameRecord(foreign).map((i) => i.code)).toContain(
      "scope_game_mismatch",
    );
  });

  it("rejects an evaluation filed under another series", () => {
    const misfiled = recordFor(survival, evaluationIn(wintermute));
    expect(validateGameRecord(misfiled).map((i) => i.code)).toContain(
      "evaluation_scope_mismatch",
    );
  });

  it("rejects supersession across two series of one game", () => {
    // Wintermute v2 does not replace Survival v1. They describe different
    // experiences, and neither is a revision of the other.
    const survivalV1 = evaluationIn(survival, {
      versionNumber: 1,
      status: "superseded",
      publishedAt: "2026-08-01",
    });
    const crossed = recordFor(
      wintermute,
      evaluationIn(wintermute, {
        versionNumber: 2,
        supersedesEvaluationId: survivalV1.id,
      }),
      [survivalV1],
    );
    const codes = validateGameRecord(crossed).map((i) => i.code);
    expect(codes).toContain("evaluation_scope_mismatch");
  });

  it("rejects a scope key that is prose rather than an identity", () => {
    const prose = recordFor(
      { ...survival, key: "The Long Dark — Survival" },
      evaluationIn(survival),
    );
    expect(() => assertValidGameRecord(prose)).toThrow();
  });
});

describe("The seeded corpus", () => {
  it("gives every seeded game exactly one scope, owned by that game", () => {
    for (const record of [alanWake2]) {
      expect(record.scope.gameId).toBe(record.game.id);
      expect(record.evaluation.scopeId).toBe(record.scope.id);
    }
  });

  it("serves one page per game, not one per profile", async () => {
    const slugs = await listGameSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("addresses a profile by game and scope key", async () => {
    const direct = await getGameProfileForScope("alan-wake-2", "default");
    expect(direct?.scope.key).toBe("default");
    expect(await getGameProfileForScope("alan-wake-2", "wintermute")).toBeNull();
  });

  it("lists every published scope of a game", async () => {
    const scopes = await listProfileScopes("alan-wake-2");
    expect(scopes.map((s) => s.scope.key)).toEqual(["default"]);
    expect(await listProfileScopes("not-a-game")).toEqual([]);
  });

  it("carries the scope onto the rendered view", async () => {
    const profile = await getGameProfile("alan-wake-2");
    expect(profile?.scope.label).toBe("Main game");
  });

  it("orders profiles deterministically by scope", async () => {
    // displayOrder then key, so "the first scope" is a stable answer rather
    // than whatever the fixture array happened to hold.
    const profiles = await listGameProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    const ordering = profiles.map(
      (p) => `${p.scope.displayOrder}:${p.scope.key}`,
    );
    expect([...ordering].sort()).toEqual(ordering);
  });
});
