import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Notice } from "@/components/admin/ui";
import { GameProfile } from "@/components/profile/GameProfile";
import type { ScopeLink } from "@/components/profile/ScopeSwitcher";
import { withAuthorizedAdminDatabase } from "@/lib/admin/db";
import { PUBLIC_RUBRIC_VERSION } from "@/lib/data/games";
import {
  readEvaluationProfile,
  readPublishedProfilesForGame,
} from "@/lib/db/read-profiles";
import { buildProfileView } from "@/lib/profile/build";
import { heroArtworkFor } from "@/lib/profile/artwork";
import { profilePath } from "@/lib/site";

/**
 * The profile as it will ship — Phase 2D's preview.
 *
 * ── Why this is not the derived review ─────────────────────────────────────
 *
 * The review page next door shows the arithmetic: every dimension's total and
 * how it was derived. It is the right page for checking a number. It is the
 * wrong page for approving a profile, because approving a profile against a
 * lookalike is how a profile ships looking like something nobody approved.
 *
 * So this page does not render a representation of the profile. It renders the
 * profile: `GameProfile`, the same component `/games/<slug>` renders, handed a
 * `ProfileView` from `buildProfileView` — the same builder, from the same
 * `GameWithEvaluation` projection the production build reads. There is no
 * second view model and no admin-flavoured copy, which is the only way "what
 * you approved is what shipped" can be a fact rather than a hope.
 *
 * ── What is deliberately not rendered ──────────────────────────────────────
 *
 * The public page wraps this component in `ProfilePageBody`, which also renders
 * the JSON-LD graph and the "more in the library" strip. Neither is reproduced
 * here, and not for convenience: both read the *public* data layer, which
 * resolves the corpus assembled at build time and falls back to fixtures when
 * no build-time database is configured. Rendering them during an admin request
 * would put the fixture catalogue on screen beside a real draft — a lookalike
 * arriving through the back door of a component that looked safe to reuse.
 *
 * The scope switcher is different: it belongs to the profile, so a multi-scope
 * game must show it or the preview is not faithful. Its data therefore comes
 * from `readPublishedProfilesForGame` on the editorial connection — the same
 * projection and the same published-only rule as the public page, read through
 * the handle this request actually has.
 *
 * ── Artwork ────────────────────────────────────────────────────────────────
 *
 * Uncleared artwork is filtered out here exactly as it is for the public page,
 * which is the faithful behaviour rather than a limitation: an uncleared image
 * will not appear publicly, so a preview that showed it would be describing a
 * page that does not exist. The publish gate reports the clearance gap in
 * words, which is where an editor can act on it.
 */
export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { record, siblings } = await withAuthorizedAdminDatabase(async (db) => {
    const found = await readEvaluationProfile(db, id);
    if (!found) return { record: null, siblings: [] };
    return {
      record: found,
      siblings: await readPublishedProfilesForGame(
        db,
        found.game.id,
        PUBLIC_RUBRIC_VERSION,
      ),
    };
  });

  if (!record) notFound();

  const profile = buildProfileView(record);

  // Mirrors `siblingScopes` in components/profile/ProfilePage.tsx: the switcher
  // renders nothing below two scopes, so nothing is computed for the ordinary
  // one-experience game.
  const published = siblings.map(buildProfileView);
  const scopes: ScopeLink[] =
    published.length < 2
      ? []
      : published.map((other) => ({
          key: other.scope.key,
          label: other.scope.label,
          summary: other.scope.summary,
          href: profilePath(other.game.slug, other.scope),
          isCurrent: other.scope.key === profile.scope.key,
        }));

  return (
    <>
      <Notice
        tone={record.evaluation.status === "published" ? "info" : "warning"}
      >
        This is the public profile, rendered by the public renderer, from this{" "}
        <strong>{record.evaluation.status}</strong> evaluation — not a mock-up
        and not the derived review. It is what <code>/games/{record.game.slug}</code>{" "}
        would serve if this version were the published one.
        {record.evaluation.status === "draft" ||
        record.evaluation.status === "review" ? (
          <>
            {" "}
            Nothing here is public: the public reader selects published
            evaluations only.
          </>
        ) : null}
      </Notice>

      {/*
        Outside the profile, never around it. Admin chrome inside this boundary
        would change the thing being approved, which is the one thing a preview
        may not do.
      */}
      <div className="mt-6 border border-rule-strong">
        <GameProfile
          profile={profile}
          artwork={heroArtworkFor(profile.game)}
          scopes={scopes}
        />
      </div>
    </>
  );
}
