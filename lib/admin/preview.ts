import type { ScopeLink } from "@/components/profile/ScopeSwitcher";
import { PUBLIC_RUBRIC_VERSION } from "@/lib/data/games";
import {
  readEvaluationProfile,
  readPublishedProfilesForGame,
  type ProfileReader,
} from "@/lib/db/read-profiles";
import { buildProfileView, type ProfileView } from "@/lib/profile/build";
import type { GameWithEvaluation } from "@/lib/profile/types";
import { profilePath } from "@/lib/site";

/**
 * The public page as this evaluation would leave it — Phase 2D preview.
 *
 * ── Prospective, not current ───────────────────────────────────────────────
 *
 * The thing an editor signs off is the page that will exist *after* this
 * evaluation publishes, so that is what this assembles. The distinction is not
 * academic, and the case that proves it is the second scope of a game:
 *
 *     before publication   scope A published, scope B a first draft
 *     after publication    scope A and scope B both published
 *
 * The public page renders a scope switcher only when a game has two or more
 * published profiles. Built from the *current* published set, B's preview shows
 * no switcher at all — and then the next successful production artifact built
 * from the post-publication corpus renders one, on a page nobody approved with
 * it. Built prospectively, the editor sees the two-scope page they are actually
 * creating.
 *
 * Note what "prospective" is measured against: the **database corpus** a
 * successful publication would leave, not production. Publishing changes what a
 * later build would read; it does not change what production serves, which
 * moves only when a build reads that corpus, verifies, and deploys.
 *
 * The same reasoning runs the other way for a revision: a revision of scope A
 * replaces A's published version rather than joining it, so the scope must
 * appear exactly once. Representing it twice would invent a game with two
 * copies of one experience.
 *
 * ── What is deliberately NOT included ──────────────────────────────────────
 *
 * Other scopes' drafts. Publishing this evaluation does not publish theirs, so
 * a switcher listing them would describe a page that no single action produces.
 * Only this evaluation moves; everything else is taken as it stands.
 */

/**
 * A draft is previewable only once it can be a page at all.
 *
 * `buildProfileView` throws on a partially scored evaluation — "has no scores
 * for dimension story" — and it is right to: the public renderer's contract is
 * a complete profile, and a radar with three of eight dimensions is not a
 * smaller version of the page, it is a different claim.
 *
 * That has to be a state this module returns rather than an exception the page
 * turns into a 500, because it is the ORDINARY state of a draft. An editor
 * opens Preview early and often, and "not yet" is a legitimate answer that the
 * Publish page can already enumerate in detail.
 */
export type PreviewResult =
  | {
      readonly kind: "renderable";
      readonly profile: ProfileView;
      readonly scopes: readonly ScopeLink[];
      readonly canonicalPath: string;
      readonly record: GameWithEvaluation;
    }
  | {
      readonly kind: "incomplete";
      /** What the renderer objected to, verbatim. */
      readonly reason: string;
      /**
       * Still computed, and still correct. The prospective switcher depends on
       * which scopes exist and which are published, not on whether this draft
       * can be drawn yet — so it is knowable well before the profile is.
       */
      readonly scopes: readonly ScopeLink[];
      readonly canonicalPath: string;
      readonly record: GameWithEvaluation;
    };

/**
 * Public listing order within one game: `display_order`, then `key`.
 *
 * Mirrors `CATALOGUE_ORDER` in lib/db/read-profiles.ts. The prospective set is
 * assembled in memory rather than by a query, so the order has to be reapplied
 * here — a scope inserted at the end of a sorted list is not sorted.
 */
function inPublicOrder(
  records: readonly GameWithEvaluation[],
): GameWithEvaluation[] {
  return [...records].sort(
    (a, b) =>
      a.scope.displayOrder - b.scope.displayOrder ||
      a.scope.key.localeCompare(b.scope.key),
  );
}

export async function readPreview(
  db: ProfileReader,
  evaluationId: string,
): Promise<PreviewResult | null> {
  const record = await readEvaluationProfile(db, evaluationId);
  if (!record) return null;

  // Never hand-built. A sibling scope lives at `/games/<slug>/<key>` and only
  // the primary owns the bare game URL (ADR 0016); that rule belongs to
  // `profilePath` rather than to every page that wants to mention an address.
  const canonicalPath = profilePath(record.game.slug, record.scope);

  const publishedSiblings = await readPublishedProfilesForGame(
    db,
    record.game.id,
    PUBLIC_RUBRIC_VERSION,
  );

  /*
   * Replace-or-add, keyed on the scope.
   *
   * Dropping any published record for this evaluation's scope covers both
   * shapes at once: a revision replaces the version it supersedes, and a first
   * publication of a new scope drops nothing and is simply added. Keying on
   * `scope.id` rather than on the evaluation id is what makes the revision case
   * work — the published predecessor has a different evaluation id but the same
   * scope, and leaving it in would show the scope twice.
   *
   * Computed from scope rows alone, so it does not depend on the profile being
   * renderable — an incomplete draft still has a knowable prospective switcher.
   */
  const prospective = inPublicOrder([
    ...publishedSiblings.filter(
      (sibling) => sibling.scope.id !== record.scope.id,
    ),
    record,
  ]);

  // The switcher renders nothing below two scopes, exactly as on the public
  // page, so nothing is computed for the ordinary one-experience game.
  const scopes: ScopeLink[] =
    prospective.length < 2
      ? []
      : prospective.map((other) => ({
          key: other.scope.key,
          label: other.scope.label,
          summary: other.scope.summary,
          href: profilePath(other.game.slug, other.scope),
          isCurrent: other.scope.id === record.scope.id,
        }));

  try {
    return {
      kind: "renderable",
      profile: buildProfileView(record),
      scopes,
      canonicalPath,
      record,
    };
  } catch (error) {
    return {
      kind: "incomplete",
      reason: error instanceof Error ? error.message : String(error),
      scopes,
      canonicalPath,
      record,
    };
  }
}
