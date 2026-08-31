/**
 * The text primitives the matcher is built from.
 *
 * Separated from the matcher because normalisation is the one thing the index
 * builder and the query path must agree on exactly. An index normalised one way
 * and searched another produces a search box that cannot find its own catalogue
 * — a failure that looks like bad matching and is actually two functions.
 */

/**
 * One canonical form for anything that will be compared.
 *
 * Case folded, diacritics stripped, everything that is not a letter or a digit
 * collapsed to a single space. So "Pokémon: Let's Go!" and "pokemon lets go"
 * are the same string, which is the point — a visitor typing a game's name
 * should not have to reproduce its punctuation.
 *
 * Letters and digits are matched by Unicode property, not by `a-z0-9`: a
 * catalogue that will hold Japanese and Cyrillic titles must not silently
 * normalise them to the empty string.
 */
export function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * How well a term answers a query. Lower is a better match.
 *
 * A const object rather than an `enum`, because `isolatedModules` is on and a
 * plain object is what the rest of this codebase reaches for anyway — the
 * values are ordinary numbers a comparator can subtract.
 */
export const MATCH_TIER = {
  exact: 0,
  prefix: 1,
  wordPrefix: 2,
  substring: 3,
  subsequence: 4,
  edit: 5,
} as const;

export type MatchTier = (typeof MATCH_TIER)[keyof typeof MATCH_TIER];

/**
 * The accepted cascade, in order: exact, prefix, word-prefix, substring,
 * subsequence, then a bounded edit distance. Returns null when a term does not
 * answer the query at any tier.
 *
 * The order is the ranking. Each tier is a weaker claim than the one above it,
 * and the last is weak enough that it is bounded rather than scored — see
 * `withinEditBudget`.
 */
export function tierFor(term: string, query: string): MatchTier | null {
  if (!query) return null;
  if (term === query) return MATCH_TIER.exact;
  if (term.startsWith(query)) return MATCH_TIER.prefix;
  if (term.includes(` ${query}`)) return MATCH_TIER.wordPrefix;
  if (term.includes(query)) return MATCH_TIER.substring;
  if (isSubsequence(term, query)) return MATCH_TIER.subsequence;
  if (withinEditBudget(term, query)) return MATCH_TIER.edit;
  return null;
}

/**
 * Every character of the query appearing in the term, in order, with gaps.
 *
 * This is what catches "alnwke" for "alan wake" — dropped letters, which is the
 * commonest way a name is mistyped fast.
 */
export function isSubsequence(term: string, query: string): boolean {
  let index = 0;
  for (const character of term) {
    if (character === query[index]) index += 1;
    if (index === query.length) return true;
  }
  return query.length === 0;
}

/**
 * The last resort, and deliberately the tightest.
 *
 * Edit distance is the tier that invents matches: at a generous budget every
 * short query "nearly" matches every short title, and the search box starts
 * confidently offering the wrong game. So it is bounded three ways — a minimum
 * query length, a budget that grows only with the query, and an early bail when
 * the lengths are already further apart than the budget allows.
 *
 * Compared against the whole term and against each of its words, because the
 * useful case is a misspelt word inside a longer title ("retrunal" in
 * "returnal", "alan wale 2" in "alan wake 2").
 */
export function withinEditBudget(term: string, query: string): boolean {
  if (query.length < 4) return false;
  const budget = query.length <= 6 ? 1 : 2;
  const candidates = [term, ...term.split(" ")];
  return candidates.some((candidate) => {
    if (Math.abs(candidate.length - query.length) > budget) return false;
    return editDistance(candidate, query, budget) <= budget;
  });
}

/**
 * Levenshtein distance, abandoned as soon as it exceeds `budget`.
 *
 * The cap is not an optimisation detail — it is what keeps this bounded. A
 * caller only ever asks "is this within N edits", so the row minimum exceeding
 * N means the answer is already no, whatever the true distance turns out to be.
 */
export function editDistance(a: string, b: string, budget: number): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMinimum = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      const deletion = previous[j]! + 1;
      const insertion = current[j - 1]! + 1;
      const best = Math.min(substitution, deletion, insertion);
      current.push(best);
      if (best < rowMinimum) rowMinimum = best;
    }
    if (rowMinimum > budget) return budget + 1;
    previous = current;
  }

  return previous[b.length]!;
}
