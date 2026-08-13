import { describe, expect, it } from "vitest";
import { alanWake2 } from "@/content";
import { buildSeedSql } from "@/lib/db/build-seed";
import { buildProfileView } from "@/lib/profile/build";
import type { Evaluation, GameWithEvaluation } from "@/lib/profile/types";
import { UNKNOWN } from "@/lib/rubric";
import { validateGameRecord } from "@/lib/validation/evaluation";

/**
 * Platform-specific subcriterion overrides (Rubric §3).
 *
 * The base value stays canonical: it is what the profile publishes and the only
 * value that reaches a dimension total. An override is the exception layer, so
 * a severe PC/console divergence is recorded rather than hidden inside one
 * unexplained number — and so a platform difference does not force a duplicate
 * evaluation per platform.
 *
 * No calibration fixture carries an override. Their two `platformNote` entries
 * are genuine context ("PC is demanding at ray-traced presets"), not score
 * deviations, and inventing a deviation would move totals Rounds 1 and 2
 * approved. These run against a synthetic corpus instead.
 */

const BASE = alanWake2.evaluation.dimensions.execution.technical_stability!;

function withOverrides(
  overrides: NonNullable<typeof BASE.platformOverrides>,
): GameWithEvaluation {
  const evaluation: Evaluation = {
    ...alanWake2.evaluation,
    dimensions: {
      ...alanWake2.evaluation.dimensions,
      execution: {
        ...alanWake2.evaluation.dimensions.execution,
        technical_stability: { ...BASE, platformOverrides: overrides },
      },
    },
  };
  return { ...alanWake2, evaluation };
}

const pcOverride = {
  platform: "pc",
  value: 1,
  rationale:
    "Path-traced presets destabilise frame delivery on mid-range hardware in a way console builds do not exhibit.",
  confidence: "medium",
} as const;

describe("Recording a material platform deviation", () => {
  it("accepts several platforms overriding one subcriterion", () => {
    // The shape the old schema could not hold at all: its score row had one
    // platform column under a (evaluation, subcriterion) primary key.
    const record = withOverrides([
      pcOverride,
      {
        platform: "ps5",
        value: 1.5,
        rationale: "Occasional traversal hitching that PC builds avoid.",
      },
    ]);
    expect(validateGameRecord(record)).toEqual([]);
  });

  it("accepts an override recording unknown on one platform", () => {
    // Unknown is a legitimate per-platform state and is never zero.
    const record = withOverrides([
      {
        platform: "ps5",
        value: UNKNOWN,
        rationale: "No technical coverage of this platform at the current build.",
      },
    ]);
    expect(validateGameRecord(record)).toEqual([]);
  });

  it("keeps the base value canonical and the dimension total unmoved", () => {
    // The load-bearing property. An override that moved a total would create a
    // second competing profile with no page to publish it on.
    const before = buildProfileView(alanWake2);
    const after = buildProfileView(withOverrides([pcOverride]));

    const total = (view: typeof before) =>
      view.dimensions.find((d) => d.dimension.key === "execution")!.display;

    expect(total(after)).toBe(total(before));
    expect(
      after.dimensions.find((d) => d.dimension.key === "execution")!.subcriteria
        .find((s) => s.key === "technical_stability")!.entry.value,
    ).toBe(BASE.value);
  });
});

describe("What an override may not be", () => {
  it("rejects an override that repeats the base value", () => {
    const record = withOverrides([
      { platform: "pc", value: BASE.value, rationale: "identical to base" },
    ]);
    expect(validateGameRecord(record).map((i) => i.code)).toContain(
      "immaterial_platform_override",
    );
  });

  it("rejects two overrides for one platform", () => {
    const record = withOverrides([
      pcOverride,
      { ...pcOverride, value: 0.5, rationale: "a conflicting second reading" },
    ]);
    expect(validateGameRecord(record).map((i) => i.code)).toContain(
      "duplicate_platform_override",
    );
  });

  it("rejects an override without a rationale", () => {
    const record = withOverrides([{ ...pcOverride, rationale: "   " }]);
    expect(validateGameRecord(record).map((i) => i.code)).toContain(
      "missing_override_rationale",
    );
  });

  it("rejects an override for a platform the game does not ship on", () => {
    const record = withOverrides([
      { ...pcOverride, platform: "switch", value: 0.5 },
    ]);
    expect(validateGameRecord(record).map((i) => i.code)).toContain(
      "override_platform_not_on_game",
    );
  });
});

describe("Seeding overrides", () => {
  it("emits an override row resolved by platform slug", () => {
    const sql = buildSeedSql([withOverrides([pcOverride])]);
    expect(sql).toContain("INSERT INTO subcriterion_platform_overrides");
    expect(sql).toContain("SELECT id FROM platforms WHERE slug = 'pc'");
  });

  it("writes unknown as NULL, never as zero", () => {
    const sql = buildSeedSql([
      withOverrides([
        {
          platform: "ps5",
          value: UNKNOWN,
          rationale: "No technical coverage of this platform.",
        },
      ]),
    ]);
    const row = sql
      .split("\n")
      .find((line) => line.startsWith("INSERT INTO subcriterion_platform_overrides"))!;
    expect(row).toContain("'ps5'), NULL,");
  });

  it("emits no override rows for the calibration corpus", () => {
    // The seeded profiles record platform *context*, not deviations. If this
    // ever fails, a calibration fixture has grown an override and its approved
    // totals need re-checking.
    expect(buildSeedSql([alanWake2])).not.toContain(
      "INSERT INTO subcriterion_platform_overrides",
    );
  });
});
