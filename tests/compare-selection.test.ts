import { describe, expect, it } from "vitest";
import { alanWake2, redfall, returnal, SEED_PROFILES } from "@/content";
import { buildCompareIndex, eligibleProfile } from "@/lib/compare";
import { nextOpenSide, resolveSelection } from "@/lib/compare/selection";
import { buildProfileView } from "@/lib/profile/build";
import { indexFrom } from "@/lib/search/public-index";
import type { RegisteredGame } from "@/lib/search/registry";

/**
 * Eligibility and selection (handoff §10.1; matrix C-01, C-02): published
 * primary profiles only; every failure said in words; positions never shifted.
 */

const views = SEED_PROFILES.map(buildProfileView);
const sibling = buildProfileView({
  ...returnal,
  scope: { ...returnal.scope, key: "tower-of-sisyphus", label: "Tower of Sisyphus", isPrimary: false },
});
const registry: RegisteredGame[] = [
  { id: "fixture-recognised", title: "Fixture Recognised Game", note: "Not yet evaluated.", aliases: [] },
];
const index = buildCompareIndex([...views, sibling], indexFrom([...views, sibling], registry));

describe("the Compare index", () => {
  it("holds published primary profiles only", () => {
    expect(index.profiles.map((profile) => profile.slug).sort()).toEqual(
      [alanWake2, returnal, redfall].map((record) => record.game.slug).sort(),
    );
    expect(index.profiles.some((profile) => profile.title.includes("Tower"))).toBe(false);
  });

  it("still knows the sibling and the recognised title, for the selector to refuse truthfully", () => {
    expect(
      index.selector.published.some((entry) => entry.scopeKey === "tower-of-sisyphus" && !entry.isPrimary),
    ).toBe(true);
    expect(index.selector.recognized.map((entry) => entry.id)).toEqual(["fixture-recognised"]);
  });

  it("carries no artwork in a production build", () => {
    // Every seed record uses evaluation-clearance artwork through the review
    // overlay, which resolves to nothing unless design surfaces are enabled.
    // The unit environment has them enabled, so what is asserted is the
    // clearance: nothing production-cleared exists to publish.
    for (const profile of index.profiles) {
      if (profile.artwork) expect(profile.artwork.clearance).toBe("evaluation");
    }
  });

  it("carries the eight dimensions in radar order with exact scores, and no aggregate", () => {
    const profile = eligibleProfile(index, "alan-wake-2")!;
    expect(profile.dimensions).toHaveLength(8);
    expect(profile.dimensions[0]!.key).toBe("story");
    expect(JSON.stringify(profile)).not.toMatch(/overall|average|aggregate|total_score/i);
  });
});

describe("resolveSelection", () => {
  it("resolves nothing to the launcher", () => {
    const selection = resolveSelection(index, null);
    expect(selection.left).toBeNull();
    expect(selection.right).toBeNull();
    expect(selection.notices).toEqual([]);
    expect(nextOpenSide(selection)).toBe("left");
  });

  it("resolves a lone slug to the left", () => {
    const selection = resolveSelection(index, "returnal");
    expect(selection.left?.slug).toBe("returnal");
    expect(selection.right).toBeNull();
    expect(nextOpenSide(selection)).toBe("right");
  });

  it("resolves a pair in the order written", () => {
    const selection = resolveSelection(index, "returnal,alan-wake-2");
    expect(selection.left?.slug).toBe("returnal");
    expect(selection.right?.slug).toBe("alan-wake-2");
    expect(selection.notices).toEqual([]);
  });

  it("refuses a self-pair and keeps the left selection", () => {
    const selection = resolveSelection(index, "alan-wake-2,alan-wake-2");
    expect(selection.left?.slug).toBe("alan-wake-2");
    expect(selection.right).toBeNull();
    expect(selection.notices).toHaveLength(1);
    expect(selection.notices[0]).toMatchObject({ kind: "self", side: "right", title: "Alan Wake 2" });
    expect(selection.notices[0]!.message).toMatch(/already on the left/);
  });

  it("leaves an unknown slug empty on its own side without shifting the other", () => {
    const selection = resolveSelection(index, "no-such-game,returnal");
    expect(selection.left).toBeNull();
    expect(selection.right?.slug).toBe("returnal");
    expect(selection.notices[0]).toMatchObject({ kind: "unknown", side: "left", slug: "no-such-game" });
  });

  it("names a recognised-but-unprofiled game as unprofiled, with its note", () => {
    const selection = resolveSelection(index, "alan-wake-2,fixture-recognised");
    expect(selection.left?.slug).toBe("alan-wake-2");
    expect(selection.right).toBeNull();
    expect(selection.notices[0]).toMatchObject({
      kind: "recognized",
      side: "right",
      title: "Fixture Recognised Game",
    });
    expect(selection.notices[0]!.message).toMatch(/Not yet evaluated/);
  });

  it("refuses a sibling scope as not yet eligible, naming the scope and the game", () => {
    const selection = resolveSelection(index, "alan-wake-2,returnal/tower-of-sisyphus");
    expect(selection.right).toBeNull();
    expect(selection.notices[0]).toMatchObject({ kind: "scope", side: "right", title: "Returnal" });
    expect(selection.notices[0]!.message).toMatch(/Tower of Sisyphus/);
    expect(selection.notices[0]!.message).toMatch(/main profile/);
  });

  it("drops a third game and says so", () => {
    const selection = resolveSelection(index, "alan-wake-2,returnal,redfall");
    expect(selection.left?.slug).toBe("alan-wake-2");
    expect(selection.right?.slug).toBe("returnal");
    expect(selection.notices[0]).toMatchObject({ kind: "extra", side: null, slug: "redfall" });
  });

  it("never selects a sibling scope by its bare address grammar either", () => {
    // `returnal/tower-of-sisyphus` on the left, nothing on the right.
    const selection = resolveSelection(index, "returnal/tower-of-sisyphus");
    expect(selection.left).toBeNull();
    expect(selection.notices[0]!.kind).toBe("scope");
  });
});
