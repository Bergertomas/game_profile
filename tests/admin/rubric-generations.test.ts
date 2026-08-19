import { describe, expect, it } from "vitest";
import {
  groupByRubricGeneration,
  type ScopeEvaluationHistory,
} from "@/lib/admin/evaluations";

/**
 * Evaluation history is a set of rubric lineages, not one list.
 *
 * ── The bug this pins ──────────────────────────────────────────────────────
 *
 * Version numbers are per `(scope, rubric)`: `evaluations_scope_version UNIQUE
 * (scope_id, rubric_version, version_number)` makes that a database rule, so a
 * second rubric generation starts again at version 1.
 *
 * The history page originally sorted the whole series by version number
 * descending and called the result "newest first". Under two generations that
 * is exactly wrong: rubric 2.0's v1 — the current answer — sorts below rubric
 * 1.0's v3, and the page presents the superseded generation as the newest work.
 * Repeated "Version 1" headings compound it, since nothing on the row said
 * which lineage it belonged to.
 */

type Row = ScopeEvaluationHistory["evaluations"][number];

function row(partial: Partial<Row> & Pick<Row, "id" | "versionNumber" | "rubricVersion" | "rubricLockedAt">): Row {
  return {
    status: "published",
    modeScope: "Base game",
    publishedAt: null,
    supersedesEvaluationId: null,
    changeSummary: null,
    ...partial,
  };
}

/**
 * Two generations, deliberately interleaved in the input.
 *
 * Rubric 1.0 ran to v3; rubric 2.0 has restarted at v1. Locked dates are the
 * only honest signal of which generation is later, and 2.0's smaller version
 * number is precisely the trap.
 */
const HISTORY: Row[] = [
  row({ id: "old-v1", versionNumber: 1, rubricVersion: "1.0", rubricLockedAt: "2026-08-06" }),
  row({ id: "new-v1", versionNumber: 1, rubricVersion: "2.0", rubricLockedAt: "2027-03-01" }),
  row({ id: "old-v3", versionNumber: 3, rubricVersion: "1.0", rubricLockedAt: "2026-08-06" }),
  row({ id: "old-v2", versionNumber: 2, rubricVersion: "1.0", rubricLockedAt: "2026-08-06" }),
];

describe("Rubric generations are presented separately", () => {
  it("puts the later generation first even though its version number is smaller", () => {
    const generations = groupByRubricGeneration(HISTORY);

    expect(generations.map((g) => g.rubricVersion)).toEqual(["2.0", "1.0"]);

    // The specific inversion: v1 of the newer rubric outranks v3 of the older.
    const first = generations[0]!;
    expect(first.rubricVersion).toBe("2.0");
    expect(first.versions[0]!.versionNumber).toBe(1);
  });

  it("keeps each lineage internally ordered, newest version first", () => {
    const [current, earlier] = groupByRubricGeneration(HISTORY);

    expect(current!.versions.map((v) => v.id)).toEqual(["new-v1"]);
    expect(earlier!.versions.map((v) => v.versionNumber)).toEqual([3, 2, 1]);
  });

  it("keeps the lineages separate rather than merging them", () => {
    const generations = groupByRubricGeneration(HISTORY);

    expect(generations).toHaveLength(2);
    for (const generation of generations) {
      const rubrics = new Set(generation.versions.map((v) => v.rubricVersion));
      expect([...rubrics]).toEqual([generation.rubricVersion]);
    }

    // Every row is present exactly once — grouping is a partition, not a filter.
    const ids = generations.flatMap((g) => g.versions.map((v) => v.id)).sort();
    expect(ids).toEqual(["new-v1", "old-v1", "old-v2", "old-v3"]);
  });

  it("orders by locked date, not by comparing rubric version strings", () => {
    // "10.0" sorts before "2.0" lexically. Chronology says otherwise, and a
    // rubric numbering scheme is not this function's business to interpret.
    const generations = groupByRubricGeneration([
      row({ id: "a", versionNumber: 1, rubricVersion: "2.0", rubricLockedAt: "2027-03-01" }),
      row({ id: "b", versionNumber: 1, rubricVersion: "10.0", rubricLockedAt: "2029-01-01" }),
    ]);

    expect(generations.map((g) => g.rubricVersion)).toEqual(["10.0", "2.0"]);
  });

  it("handles the ordinary single-generation scope unchanged", () => {
    const generations = groupByRubricGeneration(
      HISTORY.filter((r) => r.rubricVersion === "1.0"),
    );

    expect(generations).toHaveLength(1);
    expect(generations[0]!.versions.map((v) => v.versionNumber)).toEqual([3, 2, 1]);
  });

  it("returns nothing for a scope with no evaluations", () => {
    expect(groupByRubricGeneration([])).toEqual([]);
  });
});
