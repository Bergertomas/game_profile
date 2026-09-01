import { byCodeUnit } from "@/lib/order";
import { MATCH_TIER, normalize, tierFor, type MatchTier } from "./text";
import type {
  PublicSearchIndex,
  PublishedEntry,
  SearchEntry,
  SearchOutcome,
} from "./types";

/**
 * The matcher, and the only place a query becomes an answer.
 *
 * Pure, synchronous and dependency-free on purpose: the same function runs in
 * the browser against the serialised index and in vitest against a fixture, so
 * a unit test proves the behaviour a reader actually gets rather than a
 * server-side approximation of it.
 *
 * ── Seven, and why the cap is a product rule ───────────────────────────────
 *
 * A listbox a person can read at a glance is worth more than a complete one. It
 * is also the honest shape for a catalogue this size: a query that "matches"
 * thirty entries has matched none of them, and showing thirty would dress a
 * failed lookup as a rich result.
 */
export const MAX_SUGGESTIONS = 7;

interface Ranked {
  readonly entry: SearchEntry;
  readonly tier: MatchTier;
  /** Length of the term that matched, as the tie-break within a tier. */
  readonly termLength: number;
}

/**
 * Rank every entry that answers `query` at some tier, best first.
 *
 * The comparator is total and deterministic — tier, then published before
 * recognised, then the shorter matched term, then title, then id. Nothing is
 * left to insertion order, so the same query returns the same rows in the same
 * sequence in every process, which is what makes the listbox testable at all.
 */
function rank(index: PublicSearchIndex, query: string): Ranked[] {
  const normalized = normalize(query);
  if (!normalized) return [];

  const entries: SearchEntry[] = [...index.published, ...index.recognized];
  const ranked: Ranked[] = [];

  for (const entry of entries) {
    let best: MatchTier | null = null;
    let bestLength = Number.POSITIVE_INFINITY;
    for (const term of entry.terms) {
      const tier = tierFor(term, normalized);
      if (tier === null) continue;
      if (
        best === null ||
        tier < best ||
        (tier === best && term.length < bestLength)
      ) {
        best = tier;
        bestLength = term.length;
      }
    }
    if (best !== null) {
      ranked.push({ entry, tier: best, termLength: bestLength });
    }
  }

  return ranked.sort(
    (a, b) =>
      a.tier - b.tier ||
      kindRank(a.entry) - kindRank(b.entry) ||
      a.termLength - b.termLength ||
      byCodeUnit(a.entry.title, b.entry.title) ||
      byCodeUnit(a.entry.id, b.entry.id),
  );
}

/**
 * A published profile outranks a recognised title at the same tier.
 *
 * Specificity, not preference: a profile is an answer to the question and a
 * registry row is an answer about the catalogue. Showing the second above the
 * first would bury a page the visitor can actually read.
 */
function kindRank(entry: SearchEntry): number {
  return entry.kind === "published" ? 0 : 1;
}

/** The ranked candidates for a query, capped. */
export function suggest(
  index: PublicSearchIndex,
  query: string,
): readonly SearchEntry[] {
  return rank(index, query)
    .slice(0, MAX_SUGGESTIONS)
    .map((match) => match.entry);
}

/**
 * The full answer: which of the four states this query is in, what to show, and
 * whether there is a single profile Enter may open.
 *
 * ── Resolution is by specificity, not precedence ───────────────────────────
 *
 * `exact` is set only when exactly one published entry matches the query as a
 * whole identity. That is the case where opening the profile is answering the
 * question asked rather than guessing at it — "alan wake 2" names one profile
 * and cannot mean another. Everything short of that leaves `exact` null and
 * makes the visitor choose, including a single fuzzy match: one candidate is
 * not the same claim as one answer.
 *
 * Ambiguity is therefore reached whenever more than one published profile is in
 * play without an exact winner, which is exactly the multi-scope case — two
 * evaluated experiences of one game, neither of which summarises the other.
 */
export function resolve(
  index: PublicSearchIndex,
  query: string,
): SearchOutcome {
  const ranked = rank(index, query);
  if (ranked.length === 0) {
    return { state: "unrecognized", suggestions: [], exact: null };
  }

  const suggestions = ranked
    .slice(0, MAX_SUGGESTIONS)
    .map((match) => match.entry);
  const published = ranked.filter(
    (match): match is Ranked & { entry: PublishedEntry } =>
      match.entry.kind === "published",
  );

  if (published.length === 0) {
    return { state: "recognized", suggestions, exact: null };
  }

  const exact = pickExact(
    published
      .filter((match) => match.tier === MATCH_TIER.exact)
      .map((match) => match.entry),
  );

  if (exact) return { state: "published", suggestions, exact };
  if (published.length > 1) {
    return { state: "ambiguous", suggestions, exact: null };
  }
  return { state: "published", suggestions, exact: null };
}

/**
 * What the live region announces when an outcome changes.
 *
 * A sentence, not a count decorated with punctuation: this is read aloud, and
 * it is the only channel a screen-reader user has for a listbox that changed
 * under a keystroke they did not aim at it. The four states each say something
 * different because they mean something different — "no match" and "we know it
 * but have not profiled it" are not the same news.
 */
function pickExact(
  matches: readonly PublishedEntry[],
): PublishedEntry | null {
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!;

  // Two DIFFERENT games answering the same string exactly is a genuine
  // collision, and the reader settles it. Nothing about two identically-named
  // products tells the product which one was meant.
  if (new Set(matches.map((match) => match.slug)).size > 1) return null;

  // Several scopes of ONE game, all answering that game's own name: the primary
  // scope owns the bare title's canonical address (ADR 0016), and the profile
  // served there carries a switcher to its siblings. Opening it is the
  // canonical answer to "Returnal", not a guess between two evaluations — and
  // every sibling is still listed as its own row above.
  const primary = matches.filter((match) => match.isPrimary);
  return primary.length === 1 ? primary[0]! : null;
}

export function announce(outcome: SearchOutcome): string {
  const count = outcome.suggestions.length;
  switch (outcome.state) {
    case "published":
      return count === 1 ? "1 profile found." : `${count} profiles found.`;
    case "ambiguous":
      return `${count} possible matches. Choose one.`;
    case "recognized":
      return count === 1
        ? "1 recognised game, not yet profiled."
        : `${count} recognised games, not yet profiled.`;
    case "unrecognized":
      return "No match.";
  }
}
