import type {
  BlockType,
  Confidence,
  EvidenceLedgerState,
  EvidenceMaturity,
  EvidenceStatus,
  SourceCategory,
} from "./types";

/**
 * Public wording that varies with a profile's evidence state.
 *
 * Kept in one module because the pre-release/post-release split is a product
 * rule (SOP §10.8), not a styling choice: a pre-release profile must not use
 * language that sounds like a final purchase verdict.
 */

export const CONFIDENCE_LABEL: Readonly<Record<Confidence, string>> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const EVIDENCE_STATUS_LABEL: Readonly<Record<EvidenceStatus, string>> = {
  verified: "Verified",
  provisional: "Provisional",
  pre_release: "Pre-release",
};

export const EVIDENCE_MATURITY_LABEL: Readonly<
  Record<EvidenceMaturity, string>
> = {
  announced: "Announced",
  showcased: "Showcased",
  hands_on: "Hands-on",
  review_code: "Review code",
};

export const EVIDENCE_MATURITY_MEANING: Readonly<
  Record<EvidenceMaturity, string>
> = {
  announced:
    "Only basic first-party information exists. Not enough evidence to score most of this profile.",
  showcased:
    "Substantial official gameplay or a public demo exists, but little independent hands-on evidence.",
  hands_on:
    "Independent outlets or creators have played meaningful portions, or a substantial public demo is available.",
  review_code:
    "Multiple reviewers have played a near-final build before release. Launch technical state and player signal are still unknown.",
};

export const SOURCE_CATEGORY_LABEL: Readonly<Record<SourceCategory, string>> = {
  direct_play: "Direct play",
  critic: "Critic reviews",
  technical: "Technical analysis",
  specialist_creator: "Specialist & creator coverage",
  player_signal: "Player signal",
  first_party: "First-party material",
};

/** Order used wherever source categories are counted, strongest evidence first. */
export const SOURCE_CATEGORY_ORDER: readonly SourceCategory[] = [
  "direct_play",
  "critic",
  "technical",
  "specialist_creator",
  "player_signal",
  "first_party",
];

/**
 * Recommendation block headings.
 *
 * The three slots are the same before and after release — positive fit,
 * caveats, mismatch — but a pre-release profile describes what has been
 * observed, not a verdict on a finished game, so it says so (SOP §10.8).
 */
const POST_RELEASE_BLOCKS: Readonly<
  Record<BlockType, { title: string; note: string }>
> = {
  great_fit: {
    title: "Great fit if…",
    note: "Preferences this game rewards",
  },
  know_before: {
    title: "Know before buying…",
    note: "True either way — a plus for some, friction for others",
  },
  probably_not: {
    title: "Probably not for you if…",
    note: "Strong mismatch conditions",
  },
};

const PRE_RELEASE_BLOCKS: Readonly<
  Record<BlockType, { title: string; note: string }>
> = {
  great_fit: {
    title: "Looks promising if…",
    note: "What the available evidence suggests it rewards",
  },
  know_before: {
    title: "Watch before buying…",
    note: "Things to check for yourself before release",
  },
  probably_not: {
    title: "Biggest unknowns…",
    note: "What no available evidence can answer yet",
  },
};

export function blockHeadings(
  evidenceStatus: EvidenceStatus,
): Readonly<Record<BlockType, { title: string; note: string }>> {
  return evidenceStatus === "pre_release"
    ? PRE_RELEASE_BLOCKS
    : POST_RELEASE_BLOCKS;
}

export const BLOCK_ORDER: readonly BlockType[] = [
  "great_fit",
  "know_before",
  "probably_not",
];

/**
 * How a single dimension's evidence backing may be described.
 *
 * A count is a claim about reconciled individual source records. While the
 * ledger is `pending` it holds evidence *classes* — "multiple reputable
 * post-release reviews" is one row, not one source — so counting those rows and
 * publishing the total would understate the real basis and overstate its
 * precision at the same time. SOP §6: sources are evidence, not votes, and a
 * number implies a ledger we do not yet have.
 *
 * This is the same rule the public trust line already follows by omitting the
 * count while pending; it lives here so every surface phrases it identically
 * and cannot drift into contradicting the evidence section.
 */
export function linkedEvidenceSummary(
  ledger: EvidenceLedgerState,
  linkedSourceCount: number,
): string {
  if (ledger === "pending") {
    return linkedSourceCount > 0
      ? "Evidence coverage recorded; source records pending"
      : "No evidence coverage recorded yet";
  }
  if (linkedSourceCount === 0) return "No source linked yet";
  return `${linkedSourceCount} linked source${linkedSourceCount === 1 ? "" : "s"}`;
}

/**
 * Mandatory notice on every pre-release profile (SOP §10.7). Shown prominently,
 * not tucked into an evidence section.
 */
export const PRE_RELEASE_NOTICE =
  "This profile describes currently available evidence, not the finished release. It will be reassessed after launch.";
