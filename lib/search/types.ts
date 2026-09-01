import type { EvidenceStatus } from "@/lib/profile/types";

/**
 * The public search index, and the four answers it can give.
 *
 * ── What this is, and what it deliberately is not ──────────────────────────
 *
 * A STATIC, BUILD-TIME index. It is assembled while `next build` renders the
 * public pages (lib/search/public-index.ts), serialised into the page, and
 * matched entirely in the browser. There is no request-time query, no search
 * service, no provider lookup and no model call anywhere on this path, and
 * ADR 0017's build-time-Postgres-only rule is the reason: the deployed Worker
 * has no database, so a search box that asked one at request time would be a
 * search box that 500s in production.
 *
 * It is also not a back door onto anything unpublished. Every entry here is
 * either a profile the site already serves at a public URL, or a title an
 * editor has explicitly opted into the recognised registry. Nothing is
 * reconstructed client-side from hidden records, because there are no hidden
 * records in it to reconstruct.
 *
 * ── Four states, because a catalogue of three games has four honest answers ─
 *
 *   published     — we profiled this, here it is.
 *   ambiguous     — several valid readings of what you typed. You choose;
 *                   the product does not guess.
 *   recognized    — we know this game and have not profiled it. It gets no
 *                   page, no stub and no route: saying so in the field is the
 *                   whole answer.
 *   unrecognized  — we do not know it. Also a real answer, and said plainly.
 *
 * The state a query lands in is decided by SPECIFICITY, not by a blanket
 * precedence: an exact, scope-correct published identity may open directly,
 * genuine ambiguity is shown before anything from the registry, and
 * `unrecognized` is reached only when nothing matched at all.
 */

/** A profile the site publishes. One entry per profile, never per game. */
export interface PublishedEntry {
  readonly kind: "published";
  /** Unique within the index: `<slug>:<scopeKey>`. */
  readonly id: string;
  /** The game this profile evaluates. Two scopes of one game share it. */
  readonly slug: string;
  readonly title: string;
  /** The evaluated experience, e.g. "Main game" or "Tower of Sisyphus". */
  readonly scopeLabel: string;
  readonly scopeKey: string;
  /** Whether this scope owns the game's bare URL (ADR 0016). */
  readonly isPrimary: boolean;
  /** The profile's canonical public path. Truthful, never synthesised. */
  readonly path: string;
  readonly developer: string;
  /** Release year, or null where the record has no usable date. */
  readonly year: string | null;
  readonly evidenceStatus: EvidenceStatus;
  /**
   * Normalised strings this entry may be matched on: its title, its editorial
   * aliases, and its scope label where that label identifies rather than
   * merely describes. Precomputed so the matcher deals in one shape and a
   * normalisation change cannot mean two things in two places.
   */
  readonly terms: readonly string[];
}

/**
 * A game the editor has recognised and not profiled.
 *
 * It has no `path`, and that absence is the contract: a recognised game gets
 * no public route, no thin page and no indexable stub. Anything that could be
 * mistaken for an evaluation of a game nobody has evaluated is the failure this
 * state exists to prevent.
 */
export interface RecognizedEntry {
  readonly kind: "recognized";
  readonly id: string;
  readonly title: string;
  /**
   * Why it is not profiled, in the editor's words. Shown to the reader, so it
   * has to be true and useful — "not yet evaluated" is honest, a promised date
   * is not.
   */
  readonly note: string;
  readonly terms: readonly string[];
}

export type SearchEntry = PublishedEntry | RecognizedEntry;

export interface PublicSearchIndex {
  readonly published: readonly PublishedEntry[];
  readonly recognized: readonly RecognizedEntry[];
}

export type SearchState =
  | "published"
  | "ambiguous"
  | "recognized"
  | "unrecognized";

export interface SearchOutcome {
  readonly state: SearchState;
  /** Ranked candidates, capped. Empty only when `state` is `unrecognized`. */
  readonly suggestions: readonly SearchEntry[];
  /**
   * The one published profile this query names beyond doubt, or null.
   *
   * Non-null ONLY for an exact, unique identity match. It is what Enter opens,
   * so anything less certain must leave it null: navigating a fuzzy match to a
   * profile is the product answering a question the visitor did not ask, about
   * a game they may not have meant.
   */
  readonly exact: PublishedEntry | null;
}
