import { describe, expect, it } from "vitest";
import { SEED_PROFILES } from "@/content";
import { alanWake2 } from "@/content/games/alan-wake-2";
import { redfall } from "@/content/games/redfall";
import { returnal } from "@/content/games/returnal";
import { buildProfileView } from "@/lib/profile/build";
import type { GameWithEvaluation, ScoreProvenance } from "@/lib/profile/types";
import type { DimensionKey } from "@/lib/rubric";
import { assertValidEvaluation, validateEvaluation } from "@/lib/validation/evaluation";

/**
 * The calibration reports publish each game's eight dimension totals. Those
 * numbers are editorially approved and authoritative.
 *
 * The subcriterion decompositions in content/games/*.ts are engineering work,
 * so they must reproduce the published totals exactly. If a future edit to a
 * rationale moves a subcriterion value, these tests fail rather than silently
 * republishing a profile the calibration rounds did not approve.
 */
type Matrix = Record<DimensionKey, number>;

const CANONICAL: readonly {
  record: GameWithEvaluation;
  source: string;
  provenance: ScoreProvenance;
  matrix: Matrix;
}[] = [
  {
    record: alanWake2,
    source: "Calibration Round 1 §3",
    provenance: "calibration_round_1",
    matrix: {
      story: 9.5,
      execution: 9.0,
      structure: 8.5,
      agency: 7.5,
      pacing: 8.0,
      atmosphere: 10.0,
      thematic: 9.5,
      craft: 10.0,
    },
  },
  {
    record: returnal,
    source: "Calibration Round 1 §3",
    provenance: "calibration_round_1",
    matrix: {
      story: 7.5,
      execution: 9.5,
      structure: 8.5,
      agency: 10.0,
      pacing: 7.5,
      atmosphere: 9.5,
      thematic: 8.5,
      craft: 10.0,
    },
  },
  {
    record: redfall,
    source: "Calibration Round 2 §3",
    provenance: "calibration_round_2",
    matrix: {
      story: 4.5,
      execution: 5.5,
      structure: 4.5,
      agency: 5.5,
      pacing: 4.5,
      atmosphere: 5.5,
      thematic: 4.0,
      craft: 4.5,
    },
  },
];

for (const { record, source, provenance, matrix } of CANONICAL) {
  describe(`${record.game.canonicalTitle} matches ${source}`, () => {
    const profile = buildProfileView(record);

    for (const [key, expected] of Object.entries(matrix)) {
      it(`${key} totals ${expected.toFixed(1)}`, () => {
        const view = profile.dimensions.find((d) => d.dimension.key === key);
        expect(view, `dimension ${key} missing`).toBeDefined();
        expect(view!.score.kind).toBe("exact");
        if (view!.score.kind !== "exact") return;
        expect(view!.score.score).toBe(expected);
      });
    }

    it("records where its numbers came from", () => {
      expect(record.evaluation.scoreProvenance).toBe(provenance);
    });
  });
}

describe("No seed profile still carries unreconciled derived scores", () => {
  it("all three are traceable to a calibration report", () => {
    for (const record of SEED_PROFILES) {
      expect(
        record.evaluation.scoreProvenance,
        record.game.canonicalTitle,
      ).not.toBe("derived_pending_round_1_reconciliation");
    }
  });
});

describe("First-party update facts stay correctly attributed", () => {
  it("treats Returnal co-op and the Tower of Sisyphus as separate modes", () => {
    expect(returnal.evaluation.scope.mode).toBe(
      "Single-player main-game campaign, excluding co-op and the Tower of Sisyphus",
    );
    expect(
      returnal.evaluation.sources.find(
        (source) => source.id === "src_returnal_update_history",
      ),
    ).toMatchObject({
      publisher: "Housemarque",
      publishedAt: "2022-03-21",
      note: expect.stringContaining("separate single-player endless mode"),
    });
  });

  it("attributes Redfall's Xbox Performance Mode to Update 2", () => {
    expect(
      redfall.evaluation.dimensions.execution.technical_stability?.rationale,
    ).toContain("introduced in Update 2");
    expect(
      redfall.evaluation.sources.find(
        (source) => source.id === "src_redfall_update_2",
      ),
    ).toMatchObject({
      title: "Game Update 2 release notes introducing Xbox Performance Mode",
      category: "first_party",
    });
  });
});

describe("Seed corpus validity", () => {
  for (const record of SEED_PROFILES) {
    describe(record.game.canonicalTitle, () => {
      it("passes publish validation", () => {
        expect(() => assertValidEvaluation(record.evaluation)).not.toThrow();
      });

      it("reports no validation issues", () => {
        expect(validateEvaluation(record.evaluation)).toEqual([]);
      });

      it("builds a profile view with eight dimensions in radar order", () => {
        const profile = buildProfileView(record);
        expect(profile.dimensions).toHaveLength(8);
        expect(profile.radar.map((p) => p.key)).toEqual([
          "story",
          "thematic",
          "atmosphere",
          "craft",
          "agency",
          "execution",
          "structure",
          "pacing",
        ]);
      });

      it("writes a rationale for every scored subcriterion", () => {
        for (const [dimensionKey, entries] of Object.entries(
          record.evaluation.dimensions,
        )) {
          for (const [subKey, entry] of Object.entries(entries)) {
            if (entry.value === "unknown") continue;
            expect(
              entry.rationale.length,
              `${dimensionKey}.${subKey}`,
            ).toBeGreaterThan(30);
          }
        }
      });

      it("declares full evaluation scope", () => {
        const { scope } = record.evaluation;
        expect(scope.edition).toBeTruthy();
        expect(scope.mode).toBeTruthy();
        expect(scope.platforms.length).toBeGreaterThan(0);
        expect(scope.buildOrPatch).toBeTruthy();
      });

      it("has exactly one primary pull and one primary risk", () => {
        expect(record.evaluation.primaryPull).toBeTruthy();
        expect(record.evaluation.primaryRisk).toBeTruthy();
      });
    });
  }

  it("uses unique slugs", () => {
    const slugs = SEED_PROFILES.map((p) => p.game.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

/**
 * The first success criterion, expressed as a test: the three seeded games must
 * be measurably different shapes, not three variations on the same polygon.
 */
describe("The three seeded profiles are meaningfully different shapes", () => {
  const views = SEED_PROFILES.map(buildProfileView);
  const scores = (slug: string) => {
    const view = views.find((v) => v.game.slug === slug)!;
    return Object.fromEntries(
      view.dimensions.map((d) => [
        d.dimension.key,
        d.score.kind === "exact" ? d.score.score : NaN,
      ]),
    ) as Record<DimensionKey, number>;
  };

  const aw2 = scores("alan-wake-2");
  const returnal = scores("returnal");
  const redfallScores = scores("redfall");

  it("Alan Wake 2 leads on narrative and atmosphere, not on agency", () => {
    expect(aw2.atmosphere).toBeGreaterThan(aw2.agency + 2);
    expect(aw2.story).toBeGreaterThan(aw2.agency + 1.5);
  });

  it("Returnal inverts that: agency peaks where story and pacing dip", () => {
    expect(returnal.agency).toBeGreaterThanOrEqual(returnal.story + 2.5);
    expect(returnal.agency).toBeGreaterThanOrEqual(returnal.pacing + 2.5);
  });

  /**
   * Under the Round 1 matrix these two are much closer in overall level than a
   * naive reading would suggest — Round 1 §8 warns the corpus is "intentionally
   * full of distinctive, generally good games". The product claim is therefore
   * carried by where each profile notches, not by how big it is: Alan Wake 2
   * dips at Agency, Returnal dips at Story and Pacing, and they cross over.
   */
  it("Alan Wake 2 and Returnal notch in opposite places", () => {
    expect(aw2.story).toBeGreaterThan(returnal.story);
    expect(returnal.agency).toBeGreaterThan(aw2.agency);
    expect(aw2.agency).toBeLessThan(aw2.story);
    expect(returnal.story).toBeLessThan(returnal.agency);
  });

  it("Redfall sits materially below both across every dimension", () => {
    for (const key of Object.keys(redfallScores) as DimensionKey[]) {
      expect(redfallScores[key], key).toBeLessThan(aw2[key]);
      expect(redfallScores[key], key).toBeLessThan(returnal[key]);
    }
  });

  it("Alan Wake 2 and Returnal disagree sharply somewhere, despite both being strong", () => {
    const gaps = (Object.keys(aw2) as DimensionKey[]).map((key) =>
      Math.abs(aw2[key] - returnal[key]),
    );
    expect(Math.max(...gaps)).toBeGreaterThanOrEqual(2.5);
  });

  it("no profile is flat — each has real internal spread", () => {
    for (const view of views) {
      const values = view.dimensions
        .map((d) => (d.score.kind === "exact" ? d.score.score : NaN))
        .filter((n) => !Number.isNaN(n));
      const spread = Math.max(...values) - Math.min(...values);
      expect(spread, view.game.canonicalTitle).toBeGreaterThanOrEqual(1.5);
    }
  });
});
