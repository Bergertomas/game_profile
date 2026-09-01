export type MetadataScalar = string | number | boolean | null;
export type MetadataSourceKind =
  | "primary_provider"
  | "official"
  | "secondary_provider"
  | "manual_correction";

export interface MetadataCandidate<T extends MetadataScalar = MetadataScalar> {
  readonly value: T;
  readonly sourceKind: MetadataSourceKind;
  readonly sourceId: string;
  readonly retrievedAt: string;
  /** Manual corrections are never authoritative until the editor approves them. */
  readonly approved?: boolean;
}

export type MetadataPrecedence = "routine" | "critical_or_disputed";

function candidatePriority(
  candidate: MetadataCandidate,
  precedence: MetadataPrecedence,
): number {
  if (candidate.sourceKind === "manual_correction") {
    return candidate.approved ? 0 : Number.POSITIVE_INFINITY;
  }
  if (precedence === "critical_or_disputed") {
    if (candidate.sourceKind === "official") return 1;
    if (candidate.sourceKind === "primary_provider") return 2;
  } else {
    if (candidate.sourceKind === "primary_provider") return 1;
    if (candidate.sourceKind === "official") return 2;
  }
  return 3;
}

/**
 * Select by declared ownership rather than averaging/voting. A same-priority
 * conflict is a review state, not permission to pick whichever arrived last.
 */
export function selectMetadataCandidate<T extends MetadataScalar>(
  candidates: readonly MetadataCandidate<T>[],
  precedence: MetadataPrecedence,
): MetadataCandidate<T> | null {
  const eligible = candidates
    .map((candidate) => ({ candidate, priority: candidatePriority(candidate, precedence) }))
    .filter(({ priority }) => Number.isFinite(priority));
  if (eligible.length === 0) return null;

  const bestPriority = Math.min(...eligible.map(({ priority }) => priority));
  const best = eligible
    .filter(({ priority }) => priority === bestPriority)
    .map(({ candidate }) => candidate);
  const values = new Set(best.map(({ value }) => JSON.stringify(value)));
  if (values.size > 1) {
    throw new Error(
      `Conflicting ${best[0]!.sourceKind} metadata requires editorial review.`,
    );
  }

  return [...best].sort((left, right) =>
    right.retrievedAt.localeCompare(left.retrievedAt),
  )[0]!;
}
