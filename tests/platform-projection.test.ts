import { describe, expect, it } from "vitest";
import { alanWake2, redfall, returnal } from "@/content";
import { buildProfileView } from "@/lib/profile/build";
import {
  describeOverride,
  platformsForDimension,
  projectPlatforms,
} from "@/lib/profile/platform";
import type { Evaluation, GameWithEvaluation } from "@/lib/profile/types";
import { UNKNOWN } from "@/lib/rubric";

/**
 * Platform truth reaches the page, and never reaches a total (ADR 0015, ADR
 * 0032). The seeded corpus carries a warning and two platform notes and no
 * override; the override half runs against a synthetic record, exactly as
 * tests/platform-overrides.test.ts does.
 */

const BASE = alanWake2.evaluation.dimensions.execution.technical_stability!;

function withOverride(
  override: NonNullable<typeof BASE.platformOverrides>[number],
): GameWithEvaluation {
  const evaluation: Evaluation = {
    ...alanWake2.evaluation,
    dimensions: {
      ...alanWake2.evaluation.dimensions,
      execution: {
        ...alanWake2.evaluation.dimensions.execution,
        technical_stability: { ...BASE, platformOverrides: [override] },
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

describe("The seeded corpus", () => {
  it("projects Alan Wake 2's warning and technical-stability note", () => {
    const projection = projectPlatforms(buildProfileView(alanWake2));
    expect(projection.warning).toMatch(/ray-tracing/);
    expect(projection.notes).toHaveLength(1);
    expect(projection.notes[0]).toMatchObject({
      dimensionKey: "execution",
      subcriterionKey: "technical_stability",
    });
    expect(projection.overrides).toEqual([]);
    expect(projection.hasMaterial).toBe(true);
  });

  it("projects nothing for a profile that records no platform variance", () => {
    const projection = projectPlatforms(buildProfileView(returnal));
    expect(projection.warning).toBeNull();
    expect(projection.notes).toEqual([]);
    expect(projection.hasMaterial).toBe(false);
  });

  it("keeps Redfall's platform note attached to its dimension", () => {
    const view = buildProfileView(redfall);
    const projection = projectPlatforms(view);
    expect(projection.notes.length).toBeGreaterThan(0);
    for (const note of projection.notes) {
      const dimension = view.dimensions.find(
        (d) => d.dimension.key === note.dimensionKey,
      )!;
      expect(platformsForDimension(projection, dimension).notes).toContainEqual(
        note,
      );
    }
  });
});

describe("A material override", () => {
  it("is projected with the platform's full name, its value and the base", () => {
    const projection = projectPlatforms(buildProfileView(withOverride(pcOverride)));
    expect(projection.overrides).toHaveLength(1);
    const [override] = projection.overrides;
    expect(override!.platform).toEqual({ slug: "pc", name: "PC" });
    expect(override!.value).toBe(1);
    expect(override!.baseValue).toBe(BASE.value);
    expect(override!.confidence).toBe("medium");
    expect(describeOverride(override!)).toBe(
      "PC: 1.0 on this platform, against a base of 2.0.",
    );
  });

  it("never moves the dimension total", () => {
    // The load-bearing property. The projection reads a view that derivation
    // has already finished with, so an override cannot become a second score.
    const before = buildProfileView(alanWake2);
    const after = buildProfileView(withOverride(pcOverride));
    const total = (view: typeof before) =>
      view.dimensions.find((d) => d.dimension.key === "execution")!.display;
    expect(total(after)).toBe(total(before));
    expect(after.radar).toEqual(before.radar);
  });

  it("states unknown as Unknown, never as zero", () => {
    const projection = projectPlatforms(
      buildProfileView(
        withOverride({
          platform: "ps5",
          value: UNKNOWN,
          rationale: "No technical coverage of this platform at the current build.",
        }),
      ),
    );
    expect(describeOverride(projection.overrides[0]!)).toBe(
      "PlayStation 5: Unknown on this platform, against a base of 2.0.",
    );
    expect(describeOverride(projection.overrides[0]!)).not.toMatch(/0\.0/);
  });

  it("narrows to the dimension it belongs to and no other", () => {
    const view = buildProfileView(withOverride(pcOverride));
    const projection = projectPlatforms(view);
    const execution = view.dimensions.find((d) => d.dimension.key === "execution")!;
    const story = view.dimensions.find((d) => d.dimension.key === "story")!;
    expect(platformsForDimension(projection, execution).overrides).toHaveLength(1);
    expect(platformsForDimension(projection, story).overrides).toHaveLength(0);
    expect(platformsForDimension(projection, story).notes).toHaveLength(0);
  });
});
