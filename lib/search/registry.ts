export type SearchAvailability = "published" | "unprofiled";

/** One scope-aware, searchable identity in the emitted coverage registry. */
export interface SearchIndexRecord {
  readonly registryId: string;
  readonly canonicalTitle: string;
  /** Aliases, common misspellings, edition/scope phrases and other approved terms. */
  readonly searchTerms?: readonly string[];
  readonly disambiguation?: string;
  readonly availability: SearchAvailability;
  /** Required only for published profiles; always their canonical route. */
  readonly route?: string;
}

export type SearchResolution =
  | { readonly state: "published"; readonly record: SearchIndexRecord }
  | { readonly state: "unprofiled"; readonly record: SearchIndexRecord }
  | {
      readonly state: "ambiguous";
      readonly candidates: readonly SearchIndexRecord[];
    }
  | { readonly state: "unrecognized" };

export function normalizeSearchTerm(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function assertRecord(record: SearchIndexRecord): void {
  if (!record.registryId.trim() || !record.canonicalTitle.trim()) {
    throw new Error("Search records require registryId and canonicalTitle.");
  }

  if (record.availability === "published") {
    if (
      !record.route ||
      !/^\/games\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(
        record.route,
      )
    ) {
      throw new Error(
        `${record.registryId}: published Search records require a canonical /games/* route.`,
      );
    }
    return;
  }

  if (record.route !== undefined) {
    throw new Error(
      `${record.registryId}: an unprofiled registry record cannot have a public route.`,
    );
  }
}

function recordMatches(record: SearchIndexRecord, normalizedQuery: string) {
  const terms = [record.canonicalTitle, ...(record.searchTerms ?? [])];
  return terms.some((term) => normalizeSearchTerm(term) === normalizedQuery);
}

/** Resolve exact approved identities. Suggestions/fuzzy ranking are a later layer. */
export function resolveRegistrySearch(
  query: string,
  records: readonly SearchIndexRecord[],
): SearchResolution {
  const normalized = normalizeSearchTerm(query);
  if (!normalized) return { state: "unrecognized" };

  for (const record of records) assertRecord(record);

  const matches = records
    .filter((record) => recordMatches(record, normalized))
    .sort(
      (left, right) =>
        left.canonicalTitle.localeCompare(right.canonicalTitle) ||
        (left.disambiguation ?? "").localeCompare(right.disambiguation ?? "") ||
        left.registryId.localeCompare(right.registryId),
    );

  if (matches.length === 0) return { state: "unrecognized" };
  if (matches.length > 1) return { state: "ambiguous", candidates: matches };

  const record = matches[0]!;
  return record.availability === "published"
    ? { state: "published", record }
    : { state: "unprofiled", record };
}
