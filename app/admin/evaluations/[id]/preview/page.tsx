import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/admin/ui";
import { GameProfile } from "@/components/profile/GameProfile";
import { withAuthorizedAdminDatabase } from "@/lib/admin/db";
import { readPreview } from "@/lib/admin/preview";
import { heroArtworkFor } from "@/lib/profile/artwork";

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
 * game must show it or the preview is not faithful. `readPreview` assembles it
 * on the editorial connection, in the state publication would leave — see
 * lib/admin/preview.ts for why the *current* published set is the wrong answer
 * for the first draft of a second scope.
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

  const preview = await withAuthorizedAdminDatabase((db) => readPreview(db, id));
  if (!preview) notFound();

  const { canonicalPath, record } = preview;
  const status = record.evaluation.status;
  const isWorking = status === "draft" || status === "review";

  /*
   * A draft that cannot yet be a page says so, rather than 500ing.
   *
   * The public renderer requires a complete profile, and an editor opens
   * Preview long before one exists. Reporting that plainly — and pointing at
   * the Publish page, which already enumerates every gap — is more useful than
   * either an error boundary or a half-rendered profile that would misrepresent
   * what publishing produces.
   */
  if (preview.kind === "incomplete") {
    return (
      <>
        <Notice tone="warning">
          This {status} evaluation cannot be rendered as a public page yet:{" "}
          <strong>{preview.reason}</strong>
        </Notice>
        <p className="mt-4 text-[0.85rem] leading-relaxed text-ink-soft">
          The public profile needs every dimension scored before it can be
          drawn, so there is nothing faithful to show until then. The{" "}
          <Link
            href={`/admin/evaluations/${record.evaluation.id}/publish`}
            className="text-ink underline"
          >
            Publish page
          </Link>{" "}
          lists everything still outstanding. When published, this profile would
          answer at <code>{canonicalPath}</code>.
        </p>
      </>
    );
  }

  const { profile, scopes } = preview;

  return (
    <>
      <Notice
        tone={isWorking ? "warning" : "info"}
      >
        This is the public profile, rendered by the public renderer, from this{" "}
        <strong>{status}</strong> evaluation — not a mock-up and not the derived
        review. It is what <code>{canonicalPath}</code> would serve if this
        version were the published one, including the scope switcher as
        publishing this version would leave it.
        {isWorking ? (
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
