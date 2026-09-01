import type { ProfileView } from "@/lib/profile/build";

/**
 * "CHOOSING BETWEEN…" — the bounded presentation contract for the secondary
 * curated module, without full Compare behind it.
 *
 * P0 §6 and the Master Plan keep this as a SECONDARY homepage module: a small
 * set of editor-selected pairs, each posing one meaningful decision, with a
 * route into Compare. ADR 0030 keeps Compare from ever becoming the default
 * homepage subject, and the handoff (§7.3) fixes the route label as
 * "See the full comparison" — the prototype's "artwork-free" wording is dead.
 *
 * ── What this module is allowed to say ─────────────────────────────────────
 *
 * Two published identities, and one authored sentence naming the tension
 * between them. Nothing else. In particular there is no winner, no aggregate,
 * no computed match, no overlap count and no "most compared" — none of which
 * exist in this product and none of which a homepage module may invent.
 *
 * The pairing and the tension sentence are qualitative editorial claims, so
 * they are owner-approved configuration (`content/curated-compare.ts`), never
 * derived. Deterministic pair interpretation is real and is coming, but it
 * belongs to full Compare (Slice 4), not to a homepage teaser.
 *
 * ── Why the destination is a parameter ─────────────────────────────────────
 *
 * `/compare` does not exist yet: it is Slice 4. A module that linked to it
 * would publish a broken route, and one that implied an unavailable
 * destination exists would be worse than a broken link. So the caller states
 * the destination, `null` means "there is nowhere to send anyone yet", and the
 * component says exactly that instead of pretending. When Slice 4 lands, the
 * page passes a route and the CTA appears with no change here.
 */

export interface CuratedProfileRef {
  readonly slug: string;
  /** Scope key. Omitted means the game's primary scope. */
  readonly scope?: string;
}

export interface CuratedPairConfig {
  readonly id: string;
  readonly left: CuratedProfileRef;
  readonly right: CuratedProfileRef;
  /**
   * The decision this pair poses, in one owner-approved sentence. It names a
   * trade-off, never a better game — "Atmosphere first, or absolute control?"
   * is the shape of it (P0 §6).
   */
  readonly tension: string;
  /** Optional approved context. Omitted rather than padded. */
  readonly context?: string;
}

export interface CuratedPairView {
  readonly id: string;
  readonly left: ProfileView;
  readonly right: ProfileView;
  readonly tension: string;
  readonly context?: string;
}

/**
 * Resolve configured pairs against what this build publishes.
 *
 * Throws on an unresolvable reference, for the reason `lib/home/shelves.ts`
 * gives: a curated pair naming a profile the site does not publish is a broken
 * editorial claim, and it is fixed in the configuration rather than routed
 * around at render time.
 *
 * A self-pair is refused here rather than at the route, because "exactly two
 * profiles" is the product contract (ADR 0033/0034) and a module that teased a
 * comparison of a game with itself would be nonsense before it was ineligible.
 */
export function resolveCuratedPairs(
  configured: readonly CuratedPairConfig[],
  profiles: readonly ProfileView[],
): CuratedPairView[] {
  const byScope = new Map<string, ProfileView>();
  const primary = new Map<string, ProfileView>();
  for (const profile of profiles) {
    byScope.set(`${profile.game.slug}/${profile.scope.key}`, profile);
    if (profile.scope.isPrimary) primary.set(profile.game.slug, profile);
  }

  const seen = new Set<string>();

  return configured.map((pair) => {
    if (seen.has(pair.id)) {
      throw new Error(`Two curated comparisons share the id "${pair.id}".`);
    }
    seen.add(pair.id);

    const find = (ref: CuratedProfileRef, side: string): ProfileView => {
      const found = ref.scope
        ? byScope.get(`${ref.slug}/${ref.scope}`)
        : primary.get(ref.slug);
      if (!found) {
        throw new Error(
          `Curated comparison "${pair.id}" names ${ref.slug}` +
            (ref.scope ? ` (scope "${ref.scope}")` : "") +
            ` on the ${side}, which this build does not publish.`,
        );
      }
      return found;
    };

    const left = find(pair.left, "left");
    const right = find(pair.right, "right");

    if (left === right) {
      throw new Error(
        `Curated comparison "${pair.id}" pairs a profile with itself. ` +
          `Compare is exactly two different published profiles.`,
      );
    }

    if (!pair.tension.trim()) {
      throw new Error(
        `Curated comparison "${pair.id}" has no tension sentence. The module ` +
          `exists to pose a decision; without one there is nothing to say.`,
      );
    }

    return {
      id: pair.id,
      left,
      right,
      tension: pair.tension,
      ...(pair.context ? { context: pair.context } : {}),
    };
  });
}
