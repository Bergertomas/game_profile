"use client";

import { createContext, useContext, useMemo } from "react";
import type { PublicSearchIndex } from "@/lib/search/types";

/**
 * One copy of the search index per document.
 *
 * ── The problem this solves is payload, and it grows ───────────────────────
 *
 * Two client components need the index — the field embedded in the homepage
 * opening and the header dialog on every page — and a client component's props
 * are serialised into the page for each boundary. Passing the index to both
 * shipped it twice: measurable but trivial at three profiles, and a doubling of
 * a payload that grows linearly with the catalogue. At a hundred profiles it is
 * the difference between one index and two on every single page.
 *
 * Hoisting it into a provider in the public layout serialises it once. The
 * layout's `children` stay server-rendered — a client provider does not turn
 * the tree beneath it into client components, because the children arrive as an
 * already-rendered slot — so nothing else about the page changes.
 *
 * ── Null is a real state, and both consumers honour it ─────────────────────
 *
 * The layout reads the corpus through `whenCorpusIsReadable`, which answers
 * null in a runtime that has no database (the deployed Worker rendering a 404).
 * A field backed by no index would answer "we do not recognise that title" for
 * every real game, so both consumers render nothing at all instead. Where the
 * product cannot answer, it does not offer.
 */

interface SearchIndexValue {
  readonly index: PublicSearchIndex;
  readonly profileCount: number;
}

const SearchIndexContext = createContext<SearchIndexValue | null>(null);

export function SearchIndexProvider({
  index,
  children,
}: {
  readonly index: PublicSearchIndex | null;
  readonly children: React.ReactNode;
}) {
  const value = useMemo(
    () => (index ? { index, profileCount: index.published.length } : null),
    [index],
  );

  return (
    <SearchIndexContext.Provider value={value}>
      {children}
    </SearchIndexContext.Provider>
  );
}

/** The index, or null where this runtime could not read the catalogue. */
export function useSearchIndex(): SearchIndexValue | null {
  return useContext(SearchIndexContext);
}
