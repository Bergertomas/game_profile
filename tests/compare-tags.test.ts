import { describe, expect, it } from "vitest";
import { compareTags, type CompareTag } from "@/lib/compare/tags";

/**
 * The tag map (handoff §10.4): compared by canonical key, three groups, both
 * intensities exposed where they differ, and no arithmetic of any kind.
 */

const tag = (key: string, extra: Partial<CompareTag> = {}): CompareTag => ({
  key,
  label: key,
  ...extra,
});

describe("compareTags", () => {
  it("groups by key: shared, left only, right only", () => {
    const result = compareTags(
      [tag("horror"), tag("hub-based"), tag("story-heavy")],
      [tag("run-based"), tag("horror"), tag("systemic")],
    );
    expect(result.shared.map((t) => t.key)).toEqual(["horror"]);
    expect(result.leftOnly.map((t) => t.key)).toEqual(["hub-based", "story-heavy"]);
    expect(result.rightOnly.map((t) => t.key)).toEqual(["run-based", "systemic"]);
  });

  it("compares by key, never by display string", () => {
    // Same label, different keys: not shared. Different label, same key: shared.
    const result = compareTags(
      [{ key: "grind", label: "Repetition" }, { key: "repetition", label: "Repetition (old label)" }],
      [{ key: "repetition", label: "Repetition" }],
    );
    expect(result.shared.map((t) => t.key)).toEqual(["repetition"]);
    expect(result.leftOnly.map((t) => t.key)).toEqual(["grind"]);
    expect(result.rightOnly).toEqual([]);
  });

  it("keeps a shared key shared when the intensities are equal", () => {
    const [shared] = compareTags(
      [tag("sustained-tension", { intensity: "high" })],
      [tag("sustained-tension", { intensity: "high" })],
    ).shared;
    expect(shared).toMatchObject({
      key: "sustained-tension",
      left: { intensity: "high" },
      right: { intensity: "high" },
      intensitiesDiffer: false,
    });
  });

  it("keeps a shared key shared when the intensities differ, exposing both", () => {
    const [shared] = compareTags(
      [tag("resource-pressure", { intensity: "medium" })],
      [tag("resource-pressure", { intensity: "high" })],
    ).shared;
    expect(shared).toMatchObject({
      key: "resource-pressure",
      left: { intensity: "medium" },
      right: { intensity: "high" },
      intensitiesDiffer: true,
    });
  });

  it("carries each side's approved note without merging them", () => {
    const [shared] = compareTags(
      [tag("performance-sensitive", { note: "PC only." })],
      [tag("performance-sensitive")],
    ).shared;
    expect(shared!.left).toEqual({ note: "PC only." });
    expect(shared!.right).toEqual({});
  });

  it("produces no count, ratio or percentage", () => {
    const result = compareTags([tag("a"), tag("b")], [tag("a"), tag("c")]);
    const keys = Object.keys(result);
    expect(keys.sort()).toEqual(["leftOnly", "rightOnly", "shared"]);
    expect(JSON.stringify(result)).not.toMatch(/percent|match|score|overlap/i);
  });
});
