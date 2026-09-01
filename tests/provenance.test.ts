import { describe, expect, it } from "vitest";
import { SEED_PROFILES, alanWake2 } from "@/content";
import { buildSeedSql } from "@/lib/db/build-seed";
import {
  CALIBRATION_ROUND_LIST,
  getCalibrationRound,
  isCalibrationRoundKey,
  provenanceLabel,
  publicProvenanceLabel,
} from "@/lib/profile/provenance";
import type { Evaluation, GameWithEvaluation } from "@/lib/profile/types";
import { validateEvaluation } from "@/lib/validation/evaluation";

/**
 * Score provenance after generalisation.
 *
 * The first model was a flat enum of calibration states — `calibration_round_1`,
 * `calibration_round_2`, `derived_pending_round_1_reconciliation`. It described
 * the three-profile calibration corpus exactly and nothing else: an ordinary
 * authored profile had no value to carry, a fourth round meant a schema
 * migration, and "pending reconciliation" is a state a profile passes through
 * rather than a fact about its numbers.
 *
 * The kind is now durable and the round is data.
 */

function withProvenance(
  provenance: Evaluation["scoreProvenance"],
): Evaluation {
  return { ...alanWake2.evaluation, scoreProvenance: provenance };
}

describe("An ordinary editorial profile", () => {
  it("needs no round and no schema change", () => {
    // The case the old enum could not express at all. Every game Phase 2
    // authors is this one.
    expect(validateEvaluation(withProvenance({ kind: "editorial" }))).toEqual(
      [],
    );
  });

  it("cannot borrow a calibration round's authority", () => {
    const issues = validateEvaluation(
      withProvenance({ kind: "editorial", round: "round_1" }),
    );
    expect(issues.map((i) => i.code)).toContain("unexpected_calibration_round");
  });

  it("reads as an editorial evaluation, not as an absence", () => {
    expect(provenanceLabel({ kind: "editorial" })).toBe("Editorial evaluation");
  });
});

describe("A calibration profile", () => {
  it("must name the round that approved its totals", () => {
    // "Calibrated" without saying against what is not a claim a reader can
    // check against a report.
    const issues = validateEvaluation(withProvenance({ kind: "calibration" }));
    expect(issues.map((i) => i.code)).toContain("calibration_without_round");
  });

  it("must name a registered round", () => {
    const issues = validateEvaluation(
      withProvenance({
        kind: "calibration",
        round: "round_9" as "round_1",
      }),
    );
    expect(issues.map((i) => i.code)).toContain("unknown_calibration_round");
  });

  it("labels itself with the round rather than the word calibration", () => {
    expect(provenanceLabel({ kind: "calibration", round: "round_2" })).toBe(
      "Calibration round 2",
    );
  });

  it("uses reader-facing review status on the public profile", () => {
    expect(
      publicProvenanceLabel({ kind: "calibration", round: "round_2" }),
    ).toBe("Editor reviewed");
  });
});

describe("A derived profile", () => {
  it("must say the numbers were not editorially signed off", () => {
    const issues = validateEvaluation(withProvenance({ kind: "derived" }));
    expect(issues.map((i) => i.code)).toContain("derived_without_note");
  });

  it("is accepted once it explains itself", () => {
    expect(
      validateEvaluation(
        withProvenance({
          kind: "derived",
          note: "Scored by tooling against the rubric; not editorially reviewed.",
        }),
      ),
    ).toEqual([]);
  });

  it("says so in its label, without naming a workflow state", () => {
    // "pending round 1 reconciliation" was a workflow event that outlived its
    // reason. What a reader needs is that these were not reviewed.
    const label = provenanceLabel({ kind: "derived", note: "n" });
    expect(label).toMatch(/not editorially signed off/);
    expect(label).not.toMatch(/pending|reconcil/i);
  });
});

describe("The calibration round registry", () => {
  it("is a list of rows, so a new round needs no code change to the model", () => {
    expect(CALIBRATION_ROUND_LIST.length).toBeGreaterThanOrEqual(2);
    for (const round of CALIBRATION_ROUND_LIST) {
      expect(round.label.length).toBeGreaterThan(0);
      expect(isCalibrationRoundKey(round.key)).toBe(true);
    }
  });

  it("points each round at the report publishing its approved totals", () => {
    expect(getCalibrationRound("round_1").reportReference).toContain(
      "Calibration_Round_1_Report",
    );
    expect(getCalibrationRound("round_2").reportReference).toContain(
      "Calibration_Round_2_Report",
    );
  });

  it("is seeded, so the database registry and this one cannot drift", () => {
    const sql = buildSeedSql([alanWake2]);
    expect(sql).toContain("INSERT INTO calibration_rounds");
    for (const round of CALIBRATION_ROUND_LIST) {
      expect(sql).toContain(`'${round.key}'`);
    }
  });
});

describe("The seeded corpus", () => {
  it("carries no retired workflow state", () => {
    const sql = buildSeedSql(SEED_PROFILES as GameWithEvaluation[]);
    expect(sql).not.toContain("derived_pending_round_1_reconciliation");
    expect(sql).not.toContain("calibration_round_1'");
  });

  it("writes the kind and the round as separate columns", () => {
    const sql = buildSeedSql([alanWake2]);
    expect(sql).toContain("score_provenance, calibration_round");
    expect(sql).toContain("'calibration', 'round_1'");
  });
});
