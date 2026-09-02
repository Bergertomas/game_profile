import { eligibleProfile, type CompareIndex, type CompareProfile } from "./index";
import { parsePairParam, type PairTokens } from "./url";
import type { Side } from "./relationship";

/**
 * What `?games=` resolves to against this build's corpus, side by side, with
 * every failure said in words.
 *
 * ── The states (handoff §10.1; matrix C-01, C-02) ───────────────────────────
 *
 *   nothing named        the launcher
 *   one side resolved    left-only: the first selection persists, the page
 *                        says what remains
 *   both resolved        the comparison
 *   a self-pair          the right side is refused and the LEFT SELECTION
 *                        STAYS; the notice explains
 *   unknown / recognised-only / sibling-scope identity
 *                        that side is empty, the other side is untouched, and
 *                        the notice names what was asked for and why it cannot
 *                        be shown. No redirect, no silent substitution.
 *
 * Positions are never shifted to fill a gap: `?games=no-such-game,returnal`
 * is an empty left and Returnal on the right, exactly as written.
 */

export type NoticeKind =
  /** Not a game this site knows. */
  | "unknown"
  /** A game the editor recognises and has not profiled. No page, no side. */
  | "recognized"
  /** A sibling scope (DLC, mode, edition) named as `<slug>/<scope>`: not eligible in the first release. */
  | "scope"
  /** The same game on both sides. */
  | "self"
  /** More than two games named; the extras were dropped. */
  | "extra";

export interface Notice {
  readonly kind: NoticeKind;
  /** Which side the notice is about, or null for the pair as a whole. */
  readonly side: Side | null;
  readonly slug: string;
  /** The title, where the site knows one. */
  readonly title?: string;
  readonly message: string;
}

export interface Selection {
  readonly left: CompareProfile | null;
  readonly right: CompareProfile | null;
  readonly notices: readonly Notice[];
  readonly tokens: PairTokens;
}

export function resolveSelection(
  index: CompareIndex,
  raw: string | null | undefined,
): Selection {
  const tokens = parsePairParam(raw);
  const notices: Notice[] = [];

  const left = tokens.left ? resolveSide(index, tokens.left, "left", notices) : null;
  let right: CompareProfile | null = null;
  if (tokens.right) {
    if (left && tokens.right === left.slug) {
      notices.push({
        kind: "self",
        side: "right",
        slug: tokens.right,
        title: left.title,
        message: `${left.title} is already on the left. Compare is two different games — choose another for the right.`,
      });
    } else {
      right = resolveSide(index, tokens.right, "right", notices);
    }
  }

  if (tokens.extra.length > 0) {
    notices.push({
      kind: "extra",
      side: null,
      slug: tokens.extra.join(","),
      message: `Compare is exactly two games. ${tokens.extra.length === 1 ? "One further game was" : `${tokens.extra.length} further games were`} named in the address and left out.`,
    });
  }

  return { left, right, notices, tokens };
}

function resolveSide(
  index: CompareIndex,
  slug: string,
  side: Side,
  notices: Notice[],
): CompareProfile | null {
  const profile = eligibleProfile(index, slug);
  if (profile) return profile;

  // `<slug>/<scope>` asks for a sibling scope by the profile address grammar.
  // The game may well be published; the scope is simply not eligible yet.
  const slash = slug.indexOf("/");
  if (slash > 0) {
    const gameSlug = slug.slice(0, slash);
    const scopeKey = slug.slice(slash + 1);
    const game = eligibleProfile(index, gameSlug);
    const sibling = index.selector.published.find(
      (entry) => entry.slug === gameSlug && entry.scopeKey === scopeKey,
    );
    if (game || sibling) {
      const title = sibling?.title ?? game?.title ?? gameSlug;
      const scopeLabel = sibling?.scopeLabel ?? scopeKey;
      notices.push({
        kind: "scope",
        side,
        slug,
        title,
        message: `Compare covers each game's main profile for now. ${title}'s ${scopeLabel} profile is not yet eligible; choose ${title} itself to compare its main profile.`,
      });
      return null;
    }
  }

  const recognized = index.selector.recognized.find((entry) => entry.id === slug);
  if (recognized) {
    notices.push({
      kind: "recognized",
      side,
      slug,
      title: recognized.title,
      message: `We know ${recognized.title} and have not profiled it yet, so there is nothing to compare. ${recognized.note}`,
    });
    return null;
  }

  // A published sibling addressed by its bare scope key cannot occur — a slug
  // is a game — but a published game whose primary profile this index does not
  // hold would land here too, and "not profiled" is the truthful answer for it.
  notices.push({
    kind: "unknown",
    side,
    slug,
    message: `There is no Game Profile at "${slug}". Check the address, or choose a game from the catalogue.`,
  });
  return null;
}

/** Which side a fresh pick from the launcher lands on. */
export function nextOpenSide(selection: Selection): Side {
  return selection.left ? "right" : "left";
}
