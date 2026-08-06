import { describe, expect, it } from "vitest";
import { SEED_PROFILES } from "@/content";
import { redfall } from "@/content/games/redfall";
import { buildProfileView } from "@/lib/profile/build";
import type { DimensionKey } from "@/lib/rubric";
import { assertValidEvaluation, validateEvaluation } from "@/lib/validation/evaluation";

/**
 * Calibration Round 2 report §3 publishes Redfall's eight dimension totals.
 * Those numbers are editorially approved and authoritative.
 *
 * The subcriterion decomposition in content/games/redfall.ts is engineering
 * work, so it must reproduce the published totals exactly. If a future edit to
 * a rationale changes a subcriterion value, this test fails rather than
 * silently republishing a different profile than the one Round 2 approved.
 */
const REDFALL_ROUND_2: Record<DimensionKey, number> = {
  story: 4.5,
  execution: 5.5,
  structure: 4.5,
  agency: 5.5,
  pacing: 4.5,
  atmosphere: 5.5,
  thematic: 4.0,
  craft: 4.5,
};

describe("Redfall matches the Calibration Round 2 matrix", () => {
  const profile = buildProfileView(redfall);

  for (const [key, expected] of Object.entries(REDFALL_ROUND_2)) {
    it(`${key} totals ${expected}`, () => {
      const view = profile.dimensions.find((d) => d.dimension.key === key);
      expect(view, `dimension ${key} missing`).toBeDefined();
      expect(view!.score.kind).toBe("exact");
      if (view!.score.kind !== "exact") return;
      expect(view!.score.score).toBe(expected);
    });
  }

  it("is recorded as sourced from Round 2, not derived", () => {
    expect(redfall.evaluation.scoreProvenance).toBe("calibration_round_2");
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

  it("Returnal inverts that: agency and execution lead, narrative trails", () => {
    expect(returnal.agency).toBeGreaterThan(returnal.story + 2);
    expect(returnal.execution).toBeGreaterThan(returnal.pacing + 2);
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
