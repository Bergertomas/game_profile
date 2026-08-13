/**
 * Where a profile's numbers came from.
 *
 * The first version of this was a flat enum of calibration states —
 * `calibration_round_1`, `calibration_round_2`,
 * `derived_pending_round_1_reconciliation`. That described the three-profile
 * calibration corpus exactly and described nothing else: an ordinary authored
 * profile had no value to carry and would have had to pretend to belong to a
 * round, a fourth round meant a schema migration, and "pending reconciliation"
 * is a state a profile passes through rather than a fact about its numbers.
 *
 * Two orthogonal things were tangled together, and are separated here: the
 * durable *kind*, and — for calibration only — *which round*, which is data.
 */

/** The registered calibration rounds. A new round is a row, not a code change. */
export const CALIBRATION_ROUNDS = {
  round_1: {
    key: "round_1",
    label: "Calibration round 1",
    conductedAt: "2026-08-06",
    reportReference: "docs/Game_Profile_Calibration_Round_1_Report_v0.1.md",
  },
  round_2: {
    key: "round_2",
    label: "Calibration round 2",
    conductedAt: "2026-08-06",
    reportReference: "docs/Game_Profile_Calibration_Round_2_Report_v0.1.md",
  },
} as const;

export type CalibrationRoundKey = keyof typeof CALIBRATION_ROUNDS;

export interface CalibrationRound {
  readonly key: string;
  readonly label: string;
  readonly conductedAt?: string;
  readonly reportReference?: string;
}

export const CALIBRATION_ROUND_LIST: readonly CalibrationRound[] =
  Object.values(CALIBRATION_ROUNDS);

export function isCalibrationRoundKey(key: string): key is CalibrationRoundKey {
  return Object.hasOwn(CALIBRATION_ROUNDS, key);
}

export function getCalibrationRound(key: string): CalibrationRound {
  if (!isCalibrationRoundKey(key)) {
    throw new Error(`Unknown calibration round "${key}".`);
  }
  return CALIBRATION_ROUNDS[key];
}

/**
 * The durable kind. Three values, and deliberately not a fourth:
 *
 *   editorial   — authored against the rubric and editorially signed off. The
 *                 normal case, and what Phase 2 authors every game as.
 *   calibration — scored in a calibration round whose report publishes the
 *                 approved totals. `calibrationRound` says which.
 *   derived     — produced against the rubric without editorial sign-off. It
 *                 must carry a note, because a reader is entitled to know the
 *                 numbers have not been through review.
 */
export type ScoreProvenanceKind = "editorial" | "calibration" | "derived";

export interface ScoreProvenance {
  readonly kind: ScoreProvenanceKind;
  /** Required when kind is `calibration`, meaningless otherwise. */
  readonly round?: CalibrationRoundKey;
  /** Required when kind is `derived`. Rendered on the public page. */
  readonly note?: string;
}

/**
 * The public label for a profile's provenance.
 *
 * A calibration profile names its round, because "calibrated" without saying
 * against what is not a claim a reader can check.
 */
export function provenanceLabel(provenance: ScoreProvenance): string {
  switch (provenance.kind) {
    case "calibration":
      return provenance.round
        ? getCalibrationRound(provenance.round).label
        : "Calibration round";
    case "derived":
      return "Derived from the rubric, not editorially signed off";
    case "editorial":
      return "Editorial evaluation";
  }
}
