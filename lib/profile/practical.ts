import {
  COMMITMENT_BAND_LABELS,
  deriveCommitmentPresentation,
  validateTotalCommitmentRecord,
  type InterruptionFlexibility,
  type SessionSuitabilityRecord,
  type TotalCommitmentRecord,
  type UsefulSessionWindow,
} from "@/lib/discovery/time";

/**
 * Practical commitment, as the profile page may state it.
 *
 * ── The rule ────────────────────────────────────────────────────────────────
 *
 * Practical time is not a ninth dimension and never touches a score (ADR
 * 0027). It is structured information, and it comes from an APPROVED,
 * scope-aware record or it does not appear: the accepted A3–A6 screens carry a
 * labelled design specimen ("Substantial", "45–90 minutes", "Needs room to
 * breathe") that is layout material and nothing else. Nothing here can produce
 * those words from anything but a record that actually says so.
 *
 * Handoff §4.3 sets the fallbacks: render an approved value, an explicit
 * `Unknown`, or — where the contract permits absence — omit the row. Today no
 * profile carries a record at all, so `describePractical(null)` is the shipped
 * state and the component that consumes it renders nothing. The moment an
 * approved record exists it is passed in and the band appears, with no code
 * change.
 *
 * ── What is deliberately not derived ────────────────────────────────────────
 *
 * The public session-summary phrase matrix is a provisional decision (Master
 * Plan §17.2). So the two session facts are stated as the two facts they are —
 * window and interruption flexibility — and no sentence is composed from them.
 */

/** One practical fact, in words. `state` lets a surface mark Unknown as such. */
export interface PracticalFact {
  readonly label: string;
  readonly value: string;
  readonly state: "known" | "special" | "unknown";
  /** Supporting detail, e.g. the approved hour range behind a band. */
  readonly detail?: string;
}

export interface PracticalFacts {
  readonly commitment: PracticalFact | null;
  readonly session: PracticalFact | null;
  readonly interruption: PracticalFact | null;
}

export interface PracticalRecords {
  readonly commitment?: TotalCommitmentRecord | null;
  readonly session?: SessionSuitabilityRecord | null;
}

const SESSION_WINDOW_LABEL: Readonly<Record<UsefulSessionWindow, string>> = {
  very_short: "20–30 minutes",
  short: "30–60 minutes",
  longer: "60–120 minutes",
  extended: "More than two hours",
  variable: "Variable",
  unknown: "Unknown",
  not_applicable: "Not applicable",
};

const INTERRUPTION_LABEL: Readonly<Record<InterruptionFlexibility, string>> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  unknown: "Unknown",
  not_applicable: "Not applicable",
};

const SPECIAL_LABEL = {
  open_ended: "Open-ended",
  variable: "Variable",
  not_applicable: "Not applicable",
} as const;

function formatHours(low: number, high: number): string {
  return low === high ? `${low} h` : `${low}–${high} h`;
}

/** The headline band, from the engaged-play estimate (ADR 0027). */
export function describeCommitment(
  record: TotalCommitmentRecord | null | undefined,
): PracticalFact | null {
  if (!record) return null;
  validateTotalCommitmentRecord(record);

  const label = "Total commitment";
  const { estimate } = record.engagedPlay;
  const presentation = deriveCommitmentPresentation(estimate);

  switch (presentation.kind) {
    case "band":
      return {
        label,
        value: COMMITMENT_BAND_LABELS[presentation.band],
        state: "known",
        detail: `Engaged play ${formatHours(
          (estimate as { low: number; high: number }).low,
          (estimate as { low: number; high: number }).high,
        )}`,
      };
    case "combined":
      return {
        label,
        value: `${COMMITMENT_BAND_LABELS[presentation.bands[0]]} to ${COMMITMENT_BAND_LABELS[presentation.bands[1]]}`,
        state: "known",
        detail: `Engaged play ${formatHours(
          (estimate as { low: number; high: number }).low,
          (estimate as { low: number; high: number }).high,
        )}`,
      };
    case "unknown":
      return { label, value: "Unknown", state: "unknown" };
    case "open_ended":
    case "variable":
    case "not_applicable":
      return { label, value: SPECIAL_LABEL[presentation.kind], state: "special" };
  }
}

/** The two session facts, each stated on its own. */
export function describeSession(
  record: SessionSuitabilityRecord | null | undefined,
): { readonly session: PracticalFact; readonly interruption: PracticalFact } | null {
  if (!record) return null;
  if (!record.scopeId.trim()) {
    throw new Error("Session suitability requires a scopeId.");
  }
  const window = record.usefulSessionWindow;
  const flexibility = record.interruptionFlexibility;
  return {
    session: {
      label: "Useful session",
      value: SESSION_WINDOW_LABEL[window],
      state:
        window === "unknown"
          ? "unknown"
          : window === "variable" || window === "not_applicable"
            ? "special"
            : "known",
    },
    interruption: {
      label: "Interruption flexibility",
      value: INTERRUPTION_LABEL[flexibility],
      state:
        flexibility === "unknown"
          ? "unknown"
          : flexibility === "not_applicable"
            ? "special"
            : "known",
    },
  };
}

/**
 * Everything the practical band may say. All three are null when no record
 * exists, which is the signal to render nothing rather than a row of Unknowns
 * that would imply a record was consulted and came back empty.
 */
export function describePractical(
  records: PracticalRecords | null | undefined,
): PracticalFacts {
  const commitment = describeCommitment(records?.commitment);
  const session = describeSession(records?.session);
  return {
    commitment,
    session: session?.session ?? null,
    interruption: session?.interruption ?? null,
  };
}

export function hasPracticalFacts(facts: PracticalFacts): boolean {
  return facts.commitment !== null || facts.session !== null;
}
