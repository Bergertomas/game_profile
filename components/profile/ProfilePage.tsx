import type { Metadata } from "next";
import { ProfileRail } from "@/components/home/ProfileRail";
import { GameProfile } from "@/components/profile/GameProfile";
import type { ScopeLink } from "@/components/profile/ScopeSwitcher";
import { JsonLd } from "@/components/JsonLd";
import { heroArtworkFor } from "@/lib/profile/artwork";
import type { ProfileView } from "@/lib/profile/build";
import { listGameProfiles, listProfileScopes } from "@/lib/data/games";
import { gameProfileGraph } from "@/lib/seo/structured-data";
import { gameTitle, profilePath, profileUrl } from "@/lib/site";

/**
 * The public Game Profile page, shared by both public addresses.
 *
 * A game's primary scope answers `/games/<slug>`; every sibling scope answers
 * `/games/<slug>/<scope-key>`. They are the same page rendering a different
 * evaluated experience, so they are the same component — a second copy would
 * be a second place for the profile's semantics to drift.
 *
 * The presentation is the accepted A3–A6 profile system (ADR 0032): the
 * decision before the instrument, art-led where artwork is cleared and
 * complete without it, and a rail of every other profile as the exit.
 */
export async function ProfilePageBody({ profile }: { profile: ProfileView }) {
  return (
    <>
      <JsonLd data={gameProfileGraph(profile)} />
      <GameProfile
        profile={profile}
        artwork={heroArtworkFor(profile.game)}
        scopes={await siblingScopes(profile)}
      />
      <MoreProfiles current={profile} />
    </>
  );
}

/**
 * Every published profile of this game, for the scope switcher.
 *
 * Resolved here rather than inside `GameProfile` so the profile component
 * stays a pure function of the data it is handed and never reads the corpus
 * itself — the admin preview renders it from an editorial connection, where
 * the public data layer would be the wrong answer.
 *
 * Each entry carries that profile's own canonical address — the primary scope's
 * is the bare game URL, a sibling's is its scoped path. Never a query parameter
 * and never a client-side swap: two evaluations on one address makes one of
 * them unlinkable and invisible to a crawler (ADR 0016).
 */
async function siblingScopes(profile: ProfileView): Promise<ScopeLink[]> {
  const scopes = await listProfileScopes(profile.game.slug);
  // The ordinary case. Nothing is rendered for it, so nothing is computed.
  if (scopes.length < 2) return [];

  return scopes.map((other) => ({
    key: other.scope.key,
    label: other.scope.label,
    summary: other.scope.summary,
    href: profilePath(other.game.slug, other.scope),
    isCurrent: other.scope.key === profile.scope.key,
  }));
}

/**
 * The exit: everything else in the catalogue, as the accepted poster rail.
 *
 * Not a recommendation engine and not pretending to be one — no similarity,
 * no ranking, no personalisation. It is the catalogue in catalogue order,
 * minus the profile you are already reading, so a page ends on somewhere to
 * go rather than on a provenance table. The same rail grammar the homepage
 * uses, so one game is recognisably itself in both places.
 *
 * Excludes the current *profile*, not the current game: a game's sibling
 * scope is a genuinely different evaluated experience and belongs here.
 *
 * "Compare with" is not offered: full Compare is Slice 4 and no editor-selected
 * pair exists, and a control that goes nowhere is worse than an honest
 * absence.
 */
async function MoreProfiles({ current }: { current: ProfileView }) {
  const others = (await listGameProfiles()).filter(
    (other) =>
      !(
        other.game.slug === current.game.slug &&
        other.scope.key === current.scope.key
      ),
  );

  return (
    <ProfileRail
      heading="More profiles"
      note={
        others.length === 1
          ? "The one other published Game Profile. Not a ranking."
          : `Every other published Game Profile, in catalogue order. Not a ranking, and nothing here moves on its own.`
      }
      profiles={others}
    />
  );
}

/**
 * Search-intent metadata for one profile.
 *
 * The title is the question a person types and the description is the
 * profile's own one-line answer to it. No keyword padding — the page has to
 * earn the click on the strength of the evaluation, which is the whole product
 * thesis.
 *
 * The canonical URL is the profile's own address, never the game's. A sibling
 * scope canonicalising back to `/games/<slug>` would tell a crawler that
 * Wintermute's profile is a duplicate of Survival's, and the two are different
 * evaluations of different experiences (ADR 0016).
 */
export function profileMetadata(profile: ProfileView): Metadata {
  const { game, scope, evaluation } = profile;
  const path = profilePath(game.slug, scope);
  const url = profileUrl(game.slug, scope);

  // A sibling scope names the experience it profiles, because "Should I Play
  // The Long Dark?" is the same question for both and the answers differ.
  const title = scope.isPrimary
    ? gameTitle(game.canonicalTitle)
    : gameTitle(`${game.canonicalTitle} — ${scope.label}`);

  const description = `${evaluation.oneLineExperience} Profiled across eight dimensions — what it does well, what it asks of you, and who it is not for.`;

  return {
    // Absolute: the template would otherwise append the brand a second time.
    title: { absolute: title },
    description,
    // Alternate titles are published as JSON-LD `alternateName`, which search
    // engines actually read. `<meta name="keywords">` is ignored and is left off.
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url,
      title,
      description: evaluation.oneLineExperience,
      publishedTime: evaluation.publishedAt,
      modifiedTime: evaluation.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: evaluation.oneLineExperience,
    },
  };
}
