import { describe, expect, it } from "vitest";
import { byCodeUnit } from "@/lib/order";
import { digestEntries, type ManifestEntry } from "@/lib/deploy/manifest";

/**
 * Canonical ordering must not depend on the machine that runs it.
 *
 * The manifest digest is computed by the BUILD, on Workers Builds, and
 * recomputed by the VERIFIER, in the editorial runtime. If those two sort the
 * entry list differently, an honest manifest is refused as `digest-mismatch` —
 * the same signal the product uses for a tampered one — and Live becomes
 * unprovable for reasons nobody can see.
 *
 * The strings below are chosen because a collation and a code-unit comparator
 * genuinely disagree about them: locale collations give punctuation variable
 * weight (so `-` and `_` can be ignorable at primary strength) and sort
 * case-insensitively on the first pass, while code units do neither.
 */

/** Pairs where `localeCompare` and code-unit order are known to differ. */
const CONTENTIOUS: readonly [string, string][] = [
  ["a-b", "ab"],
  ["evl_returnal_v1", "evlreturnal"],
  ["Z", "a"],
  ["a", "A"],
  ["item-2", "item10"],
  ["co-op", "coop"],
];

describe("The stable comparator", () => {
  it("disagrees with localeCompare exactly where a collation would", () => {
    // Not a preference — the point is that these two ARE different functions,
    // so which one the digest uses is a decision rather than a detail.
    const differing = CONTENTIOUS.filter(
      ([a, b]) => Math.sign(byCodeUnit(a, b)) !== Math.sign(a.localeCompare(b)),
    );
    expect(differing.length).toBeGreaterThan(0);
  });

  it("gives the same answer under any locale the runtime offers", () => {
    const locales = ["en-US", "de-DE", "sv-SE", "tr-TR", "en-US-u-co-search"];
    for (const [a, b] of CONTENTIOUS) {
      const mine = Math.sign(byCodeUnit(a, b));
      for (const locale of locales) {
        // The comparator ignores the locale entirely; this asserts that the
        // value it returns is the same one every time it is asked, including
        // while a locale-aware comparator would be changing its mind.
        expect(Math.sign(byCodeUnit(a, b))).toBe(mine);
        expect(typeof a.localeCompare(b, locale)).toBe("number");
      }
    }
  });

  it("is a total order: antisymmetric, transitive and reflexive", () => {
    const values = [
      "a",
      "A",
      "ab",
      "a-b",
      "a_b",
      "",
      "0",
      "9",
      "Z",
      "zz",
      "évl",
      "evl",
    ];
    for (const a of values) {
      expect(byCodeUnit(a, a)).toBe(0);
      for (const b of values) {
        // `+ 0` normalises -0, which `Object.is` would otherwise call a difference.
        expect(Math.sign(byCodeUnit(a, b)) + 0).toBe(-Math.sign(byCodeUnit(b, a)) + 0);
        for (const c of values) {
          if (byCodeUnit(a, b) <= 0 && byCodeUnit(b, c) <= 0) {
            expect(byCodeUnit(a, c)).toBeLessThanOrEqual(0);
          }
        }
      }
    }
  });

  it("sorts a list the same way whatever order it arrives in", () => {
    const values = ["b-1", "b1", "B1", "a", "a_1", "a1"];
    const forward = [...values].sort(byCodeUnit);
    const backward = [...values].reverse().sort(byCodeUnit);
    const shuffled = [values[3]!, values[0]!, values[5]!, values[1]!, values[4]!, values[2]!]
      .sort(byCodeUnit);

    expect(backward).toEqual(forward);
    expect(shuffled).toEqual(forward);
  });
});

function entry(evaluationId: string): ManifestEntry {
  return {
    evaluationId,
    gameSlug: "a-game",
    scopeKey: "default",
    versionNumber: 1,
    rubricVersion: "1.0",
    publishedAt: "2026-08-06",
    path: "/games/a-game",
  };
}

describe("The manifest digest is locale-independent", () => {
  const ids = [
    "evl_returnal_v1",
    "evlreturnal",
    "EVL-alan-wake",
    "24f3cd1e-9dd4-4dd6-947b-bb9174df4270",
    "24f3cd1e9dd44dd6947bbb9174df4270",
    "a-b",
    "ab",
  ];

  it("hashes the same whatever order the rows arrive in", async () => {
    const entries = ids.map(entry);
    const forward = await digestEntries(entries);
    const backward = await digestEntries([...entries].reverse());
    const rotated = await digestEntries([
      ...entries.slice(3),
      ...entries.slice(0, 3),
    ]);

    expect(backward).toBe(forward);
    expect(rotated).toBe(forward);
  });

  /**
   * The regression that matters, stated directly: a digest computed with the
   * comparator the code used to use is not the digest computed with the one it
   * uses now, for entry ids this product genuinely produces. Two runtimes that
   * disagreed would each have called the other's manifest tampered.
   */
  it("no longer depends on a comparator that a collation could change", async () => {
    const entries = ids.map(entry);

    const localeSorted = [...entries]
      .sort((a, b) => a.evaluationId.localeCompare(b.evaluationId))
      .map((row) => row.evaluationId);
    const codeUnitSorted = [...entries]
      .sort((a, b) => byCodeUnit(a.evaluationId, b.evaluationId))
      .map((row) => row.evaluationId);

    // If these were the same list the test would prove nothing.
    expect(localeSorted).not.toEqual(codeUnitSorted);

    // And the digest follows the deterministic one.
    const expected = await digestEntries(
      [...entries].sort((a, b) => byCodeUnit(a.evaluationId, b.evaluationId)),
    );
    expect(await digestEntries(entries)).toBe(expected);
  });

  it("still distinguishes corpora that differ", async () => {
    const base = ids.map(entry);
    const changed = base.map((row, index) =>
      index === 0 ? { ...row, versionNumber: 2 } : row,
    );
    expect(await digestEntries(changed)).not.toBe(await digestEntries(base));
  });
});
