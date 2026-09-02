import type { Route } from "next";

/**
 * The Compare address, and the one query parameter that carries its state.
 *
 * ── The contract (ADR 0033) ─────────────────────────────────────────────────
 *
 *   /compare                          the launcher, indexable, in the sitemap
 *   /compare?games=<left>,<right>     a pair, noindex,follow, never in the sitemap
 *
 * Each side is identified by GAME SLUG, and the order in the parameter IS the
 * order on the page: the left slug is the left game. Nothing here alphabetises,
 * normalises or swaps the pair — an unordered key exists only inside caches
 * that cannot reorder the display, and there are none on this path.
 *
 * ── Why a slug, and why that bounds the first release ───────────────────────
 *
 * A slug names a game, and a game's public address is its PRIMARY profile
 * (ADR 0016). The accepted URL contract therefore identifies each side as "the
 * main profile of this game", and a DLC, expansion, mode or other sibling
 * scope has no place in it. Tomas decided on 2 September 2026 (ADR 0033
 * amendment) that the first Compare release supports published primary
 * profiles only, rather than inventing a scope-encoding scheme the accepted
 * contract does not have. Sibling-scope Compare is a later decision, not a
 * prohibition; when it is taken, the encoding is decided with it.
 */

export const COMPARE_PATH = "/compare";
export const PAIR_PARAM = "games";

export interface PairTokens {
  /** The first slug named, or null. A lone selection is the left side. */
  readonly left: string | null;
  readonly right: string | null;
  /** Anything past the second slug. Compare is exactly two; these are dropped. */
  readonly extra: readonly string[];
}

/** Read `?games=` as written. Empty tokens are ignored, not positions. */
export function parsePairParam(raw: string | null | undefined): PairTokens {
  const tokens = (raw ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  return {
    left: tokens[0] ?? null,
    right: tokens[1] ?? null,
    extra: tokens.slice(2),
  };
}

/** `left,right`, `left`, or null when nothing is selected. Order preserved. */
export function pairParam(
  left: string | null | undefined,
  right: string | null | undefined,
): string | null {
  const tokens = [left, right].filter(
    (token): token is string => typeof token === "string" && token.length > 0,
  );
  return tokens.length > 0 ? tokens.join(",") : null;
}

/**
 * The address of a selection. Slugs are URL-safe by construction (they are
 * path segments already), so the comma stays a literal comma, as the accepted
 * contract writes it.
 */
export function comparePath(
  left?: string | null,
  right?: string | null,
): Route {
  const param = pairParam(left, right);
  return (
    param
      ? `${COMPARE_PATH}?${PAIR_PARAM}=${param
          .split(",")
          .map(encodeURIComponent)
          .join(",")}`
      : COMPARE_PATH
  ) as Route;
}
