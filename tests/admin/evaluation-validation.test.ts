import { describe, expect, it } from "vitest";
import { evidenceLinkSchema } from "@/lib/admin/evaluation-validation";
import { dimensionsInRadarOrder } from "@/lib/rubric";

/**
 * What the evaluation forms accept, for the one rule a control cannot keep.
 *
 * The evidence mapper offers the forty subcriteria grouped under the dimension
 * each belongs to, so an incoherent pair is not reachable by pointing at
 * things. That is a courtesy to the editor and not a guarantee about the
 * request: a Server Action is a POST, and the grouping exists only in the page
 * that rendered it. The pair is therefore checked again here, and again by
 * `trg_evidence_link_rubric_coherent` in Postgres.
 */

const SOURCE_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

function link(fields: Record<string, unknown>) {
  return evidenceLinkSchema.safeParse({
    evidenceSourceId: SOURCE_ID,
    spoilerSensitive: false,
    ...fields,
  });
}

describe("An evidence mapping", () => {
  it("may name no dimension at all — that is profile-level evidence", () => {
    const parsed = link({});
    expect(parsed.success).toBe(true);
    expect(parsed.data?.dimensionKey).toBeUndefined();
    expect(parsed.data?.subcriterionKey).toBeUndefined();
  });

  it("may name a dimension and stop there", () => {
    const parsed = link({ dimensionKey: "story" });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.dimensionKey).toBe("story");
    expect(parsed.data?.subcriterionKey).toBeUndefined();
  });

  it("accepts a subcriterion that belongs to the dimension it names", () => {
    const parsed = link({
      dimensionKey: "story",
      subcriterionKey: "narrative_coherence",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.subcriterionKey).toBe("narrative_coherence");
  });

  it("refuses a subcriterion with no dimension", () => {
    const parsed = link({ subcriterionKey: "narrative_coherence" });
    expect(parsed.success).toBe(false);
    expect(String(parsed.error)).toMatch(/which dimension it belongs to/i);
  });

  /**
   * The rule this file exists for. `narrative_coherence` is a real subcriterion
   * and `execution` is a real dimension; the pair is not. Before the mapper
   * used a grouped selector an editor typed the key by hand, which made this
   * the easiest mistake in the step to make and the hardest to see afterwards.
   */
  it("refuses a real subcriterion belonging to a different dimension", () => {
    const parsed = link({
      dimensionKey: "execution",
      subcriterionKey: "narrative_coherence",
    });
    expect(parsed.success).toBe(false);
    expect(String(parsed.error)).toMatch(/does not belong to/i);
  });

  it("refuses a subcriterion key that is not in the rubric at all", () => {
    const parsed = link({
      dimensionKey: "story",
      subcriterionKey: "vibes",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts every canonical pair the rubric defines, and no other", () => {
    // Read from the rubric rather than listed, so a rubric change moves this
    // test with it instead of leaving it asserting yesterday's forty.
    const dimensions = dimensionsInRadarOrder();
    let checked = 0;

    for (const dimension of dimensions) {
      for (const subcriterion of dimension.subcriteria) {
        expect(
          link({ dimensionKey: dimension.key, subcriterionKey: subcriterion.key })
            .success,
        ).toBe(true);
        checked += 1;

        // The same subcriterion under any other dimension is refused.
        for (const other of dimensions) {
          if (other.key === dimension.key) continue;
          expect(
            link({ dimensionKey: other.key, subcriterionKey: subcriterion.key })
              .success,
          ).toBe(false);
        }
      }
    }

    expect(checked).toBe(40);
  });
});
