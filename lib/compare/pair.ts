import { CONFIDENCE_LABEL, EVIDENCE_STATUS_LABEL } from "@/lib/profile/vocabulary";
import type { CompareDimension, CompareProfile } from "./index";
import {
  describeRelationship,
  relate,
  scoreWords,
  type Relationship,
  type Side,
} from "./relationship";
import { compareTags, type TagComparison } from "./tags";

/**
 * Two eligible profiles, composed for the page: eight paired rows in
 * canonical order, the deterministic opening facts, and the tag map.
 *
 * ── What the opening may say (ADR 0034; handoff §10.3) ──────────────────────
 *
 * The clearest difference, the strongest alignment and the material caveats
 * are exposed ONLY through facts the relationship and evidence contracts
 * already support. Nothing here writes a game-specific conclusion: the
 * "central trade-off" is the list of which game is higher where, in the
 * rubric's own dimension names, and the caveats are the record's own
 * statuses, warnings, confidences and platform variances. An authored pair
 * sentence is editorial content; none is approved, so none is invented.
 *
 * Every choice below is deterministic and value-blind except where the
 * contract names the value: the clearest difference is the largest exact
 * delta (ties: canonical order), the strongest alignment is the FIRST Equal
 * row in canonical order — never the "best" equal row, because there is no
 * such thing — and, with no Equal row, the first Close row, labelled Closest.
 */

export interface PairRow {
  readonly key: string;
  readonly name: string;
  readonly summary: string;
  readonly question: string;
  readonly left: CompareDimension;
  readonly right: CompareDimension;
  readonly relationship: Relationship;
  /** "Clear difference; Returnal is higher by 2.5." */
  readonly relationSentence: string;
  /** The whole row, spoken in reading order — the accessible group name. */
  readonly sentence: string;
  /** Left and right confidences differ. A caveat, never a re-scoring. */
  readonly asymmetricConfidence: boolean;
  /** Whether each side's record says this dimension varies by platform. */
  readonly varies: { readonly left: boolean; readonly right: boolean };
}

export interface OpeningFact {
  readonly kind: "difference" | "alignment";
  /** "Clearest difference", "Exact alignment" or "Closest". */
  readonly label: string;
  readonly row: PairRow;
}

export interface Caveat {
  readonly kind: "status" | "warning" | "confidence" | "platform";
  readonly side: Side | null;
  readonly text: string;
}

export interface PairView {
  readonly left: CompareProfile;
  readonly right: CompareProfile;
  readonly rows: readonly PairRow[];
  readonly difference: OpeningFact | null;
  readonly alignment: OpeningFact | null;
  readonly caveats: readonly Caveat[];
  /** Rows grouped by relation, each in canonical order. */
  readonly groups: {
    readonly leftHigher: readonly PairRow[];
    readonly rightHigher: readonly PairRow[];
    readonly close: readonly PairRow[];
    readonly equal: readonly PairRow[];
    readonly indeterminate: readonly PairRow[];
  };
  readonly tags: TagComparison;
}

export function composePair(left: CompareProfile, right: CompareProfile): PairView {
  if (left.slug === right.slug) {
    throw new Error("Compare is two different games; a self-pair is refused before composition.");
  }
  if (left.dimensions.length !== right.dimensions.length) {
    throw new Error("Both profiles must carry the same eight dimensions.");
  }

  const names = { left: left.title, right: right.title };
  const rows: PairRow[] = left.dimensions.map((l, index) => {
    const r = right.dimensions[index]!;
    if (l.key !== r.key) {
      throw new Error(`Dimension order differs at ${index}: ${l.key} vs ${r.key}.`);
    }
    const relationship = relate(l.score, r.score);
    const scores = { left: l.score, right: r.score };
    const relationSentence = describeRelationship(relationship, names, scores);
    return {
      key: l.key,
      name: l.name,
      summary: l.summary,
      question: l.question,
      left: l,
      right: r,
      relationship,
      relationSentence,
      sentence:
        `${l.name}. ${left.title}: ${scoreWords(l.score)}, ${CONFIDENCE_LABEL[l.confidence]} confidence. ` +
        `${right.title}: ${scoreWords(r.score)}, ${CONFIDENCE_LABEL[r.confidence]} confidence. ${relationSentence}`,
      asymmetricConfidence: l.confidence !== r.confidence,
      varies: {
        left: l.notes.length > 0 || l.overrides.length > 0,
        right: r.notes.length > 0 || r.overrides.length > 0,
      },
    };
  });

  const clear = rows.filter((row) => row.relationship.kind === "clear");
  const close = rows.filter((row) => row.relationship.kind === "close");
  const equal = rows.filter((row) => row.relationship.kind === "equal");

  let difference: OpeningFact | null = null;
  for (const row of clear) {
    if (
      !difference ||
      (row.relationship as { delta: number }).delta >
        (difference.row.relationship as { delta: number }).delta
    ) {
      difference = { kind: "difference", label: "Clearest difference", row };
    }
  }

  const alignment: OpeningFact | null = equal[0]
    ? { kind: "alignment", label: "Exact alignment", row: equal[0] }
    : close[0]
      ? { kind: "alignment", label: "Closest", row: close[0] }
      : null;

  return {
    left,
    right,
    rows,
    difference,
    alignment,
    caveats: caveatsFor(left, right, rows),
    groups: {
      leftHigher: clear.filter((row) => row.relationship.kind === "clear" && row.relationship.higher === "left"),
      rightHigher: clear.filter((row) => row.relationship.kind === "clear" && row.relationship.higher === "right"),
      close,
      equal,
      indeterminate: rows.filter((row) => row.relationship.kind === "indeterminate"),
    },
    tags: compareTags(left.tags, right.tags),
  };
}

/**
 * Material reading caveats, from the record and nothing else, in a fixed
 * order: evidence status, platform warnings, asymmetric confidence, platform
 * variance on a dimension.
 */
function caveatsFor(
  left: CompareProfile,
  right: CompareProfile,
  rows: readonly PairRow[],
): Caveat[] {
  const caveats: Caveat[] = [];
  const sides = [
    ["left", left],
    ["right", right],
  ] as const;

  for (const [side, profile] of sides) {
    if (profile.evidence.status !== "verified") {
      caveats.push({
        kind: "status",
        side,
        text: `${profile.title} is ${EVIDENCE_STATUS_LABEL[profile.evidence.status]} at ${CONFIDENCE_LABEL[profile.evidence.confidence]} overall confidence; its values may be reassessed.`,
      });
    }
  }
  for (const [side, profile] of sides) {
    if (profile.platformWarning) {
      caveats.push({
        kind: "warning",
        side,
        text: `${profile.title}, platform warning: ${profile.platformWarning}`,
      });
    }
  }
  for (const row of rows) {
    if (row.asymmetricConfidence) {
      caveats.push({
        kind: "confidence",
        side: null,
        text: `${row.name}: ${left.title} ${CONFIDENCE_LABEL[row.left.confidence]} confidence, ${right.title} ${CONFIDENCE_LABEL[row.right.confidence]} confidence.`,
      });
    }
  }
  for (const row of rows) {
    for (const [side, profile] of sides) {
      if (row.varies[side]) {
        caveats.push({
          kind: "platform",
          side,
          text: `${row.name} varies by platform for ${profile.title}; the published value is the base.`,
        });
      }
    }
  }
  return caveats;
}
