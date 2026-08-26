export const COMMITMENT_BANDS = [
  "brief",
  "moderate",
  "substantial",
  "long",
  "extensive",
] as const;

export type CommitmentBand = (typeof COMMITMENT_BANDS)[number];

export const COMMITMENT_BAND_LABELS: Readonly<
  Record<CommitmentBand, string>
> = {
  brief: "Brief",
  moderate: "Moderate",
  substantial: "Substantial",
  long: "Long",
  extensive: "Extensive",
};

export type CommitmentEstimate =
  | { readonly kind: "hours"; readonly low: number; readonly high: number }
  | {
      readonly kind:
        | "open_ended"
        | "variable"
        | "unknown"
        | "not_applicable";
    };

export type CommitmentEstimateKind =
  | "focused"
  | "engaged_play"
  | "completionist";

export type CommitmentOverrideState =
  | "none"
  | "approved_override"
  | "manual_only";

/** Provenance that travels with one approved, scope-aware estimate. */
export interface CommitmentEstimateSource {
  readonly provider: string;
  readonly source: string;
  readonly externalGameId?: string;
  readonly retrievedAt: string;
  readonly providerUpdatedAt?: string;
  readonly uncertainty?: string;
  readonly overrideState: CommitmentOverrideState;
  readonly overrideNote?: string;
}

export interface SourcedCommitmentEstimate {
  readonly kind: CommitmentEstimateKind;
  readonly estimate: CommitmentEstimate;
  readonly source: CommitmentEstimateSource;
}

/**
 * Approved public practical-time record for one durable profile scope.
 * Engaged play governs the headline; focused/completionist remain supporting
 * estimates and neither feeds a Game Profile score.
 */
export interface TotalCommitmentRecord {
  readonly scopeId: string;
  readonly engagedPlay: SourcedCommitmentEstimate;
  readonly focused?: SourcedCommitmentEstimate;
  readonly completionist?: SourcedCommitmentEstimate;
}

export type CommitmentPresentation =
  | { readonly kind: "band"; readonly band: CommitmentBand }
  | {
      readonly kind: "combined";
      readonly bands: readonly [CommitmentBand, CommitmentBand];
    }
  | {
      readonly kind:
        | "open_ended"
        | "variable"
        | "unknown"
        | "not_applicable";
    };

function assertHours(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number of hours.`);
  }
}

export function commitmentBandForHours(hours: number): CommitmentBand {
  assertHours(hours, "hours");
  if (hours <= 10) return "brief";
  if (hours <= 25) return "moderate";
  if (hours <= 50) return "substantial";
  if (hours <= 100) return "long";
  return "extensive";
}

/**
 * Engaged-play estimates drive this presentation. One adjacent boundary may be
 * stated honestly as a combined band; wider uncertainty becomes Variable.
 */
export function deriveCommitmentPresentation(
  estimate: CommitmentEstimate,
): CommitmentPresentation {
  if (estimate.kind !== "hours") return estimate;

  assertHours(estimate.low, "low");
  assertHours(estimate.high, "high");
  if (estimate.low > estimate.high) {
    throw new Error("low hours cannot exceed high hours.");
  }

  const lowBand = commitmentBandForHours(estimate.low);
  const highBand = commitmentBandForHours(estimate.high);
  const lowIndex = COMMITMENT_BANDS.indexOf(lowBand);
  const highIndex = COMMITMENT_BANDS.indexOf(highBand);

  if (lowBand === highBand) return { kind: "band", band: lowBand };
  if (highIndex - lowIndex === 1) {
    return { kind: "combined", bands: [lowBand, highBand] };
  }
  return { kind: "variable" };
}

export const USEFUL_SESSION_WINDOWS = {
  very_short: { minMinutes: 20, maxMinutes: 30, minExclusive: false },
  short: { minMinutes: 30, maxMinutes: 60, minExclusive: false },
  longer: { minMinutes: 60, maxMinutes: 120, minExclusive: false },
  extended: { minMinutes: 120, maxMinutes: null, minExclusive: true },
} as const;

export type KnownSessionWindow = keyof typeof USEFUL_SESSION_WINDOWS;
export type UsefulSessionWindow =
  | KnownSessionWindow
  | "variable"
  | "unknown"
  | "not_applicable";

export const INTERRUPTION_FLEXIBILITY = [
  "high",
  "medium",
  "low",
  "unknown",
  "not_applicable",
] as const;

export type InterruptionFlexibility =
  (typeof INTERRUPTION_FLEXIBILITY)[number];

/** Two independent editorial facts; public summary wording is a design layer. */
export interface SessionSuitabilityRecord {
  readonly scopeId: string;
  readonly usefulSessionWindow: UsefulSessionWindow;
  readonly interruptionFlexibility: InterruptionFlexibility;
  readonly rationale: string;
}

function assertSource(
  estimate: SourcedCommitmentEstimate,
  expectedKind: CommitmentEstimateKind,
): void {
  if (estimate.kind !== expectedKind) {
    throw new Error(
      `Expected ${expectedKind} estimate, received ${estimate.kind}.`,
    );
  }
  if (!estimate.source.provider.trim() || !estimate.source.source.trim()) {
    throw new Error("Commitment estimates require provider and source.");
  }
  if (
    estimate.source.overrideState !== "none" &&
    !estimate.source.overrideNote?.trim()
  ) {
    throw new Error("A commitment override requires an override note.");
  }
}

/** Validate the provider-independent record before any persistence adapter. */
export function validateTotalCommitmentRecord(
  record: TotalCommitmentRecord,
): void {
  if (!record.scopeId.trim()) {
    throw new Error("Total commitment requires a scopeId.");
  }
  assertSource(record.engagedPlay, "engaged_play");
  if (record.focused) assertSource(record.focused, "focused");
  if (record.completionist) {
    assertSource(record.completionist, "completionist");
  }
  deriveCommitmentPresentation(record.engagedPlay.estimate);
  if (record.focused) deriveCommitmentPresentation(record.focused.estimate);
  if (record.completionist) {
    deriveCommitmentPresentation(record.completionist.estimate);
  }
}

export type SessionBudgetOutcome =
  | { readonly state: "satisfied" }
  | { readonly state: "borderline" }
  | { readonly state: "contradicted" }
  | {
      readonly state: "indeterminate";
      readonly reason: "variable" | "unknown" | "not_applicable";
    };

/** Apply the locked hard-session-budget relation without midpointing a range. */
export function qualifySessionBudget(
  window: UsefulSessionWindow,
  availableMinutes: number,
): SessionBudgetOutcome {
  if (!Number.isFinite(availableMinutes) || availableMinutes < 0) {
    throw new Error("availableMinutes must be finite and non-negative.");
  }

  if (!(window in USEFUL_SESSION_WINDOWS)) {
    return {
      state: "indeterminate",
      reason: window as "variable" | "unknown" | "not_applicable",
    };
  }

  const bounds = USEFUL_SESSION_WINDOWS[window as KnownSessionWindow];
  if (
    bounds.maxMinutes !== null &&
    bounds.maxMinutes <= availableMinutes
  ) {
    return { state: "satisfied" };
  }

  const reachesWindow = bounds.minExclusive
    ? availableMinutes > bounds.minMinutes
    : availableMinutes >= bounds.minMinutes;

  return reachesWindow
    ? { state: "borderline" }
    : { state: "contradicted" };
}
