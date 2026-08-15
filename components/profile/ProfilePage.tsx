import type { Metadata } from "next";
import { GameCard } from "@/components/GameCard";
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
 * The presentation is design direction D3: the game arrives first at full
 * width, the profile answers it on a graphite field attached to the stage, and
 * everything about how the evaluation was made is collected below.
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
      <MoreInTheLibrary current={profile} />
    </>
  );
}

/**
 * Every published profile of this game, for the scope switcher.
 *
 * Resolved here rather than inside `GameProfile` because that component is a
 * client component: it cannot read the data layer, and passing it a ready list
 * of links keeps the switcher's markup static.
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
 * Everything else in the catalogue.
 *
 * Not a recommendation engine and not pretending to be one — no similarity, no
 * ranking, no personalisation. It is the shelf, minus the profile you are
 * already reading, so a page ends on somewhere to go rather than on a
 * provenance table.
 *
 * Excludes the current *profile*, not the current game: a game's sibling scope
 * is a genuinely different evaluated experience and belongs on the shelf. When
 * the catalogue outgrows a strip this becomes a real selection; the card
 * grammar it renders does not change.
 */
async function MoreInTheLibrary({ current }: { current: ProfileView }) {
  const others = (await listGameProfiles()).filter(
    (other) =>
      !(
        other.game.slug === current.game.slug &&
        other.scope.key === current.scope.key
      ),
  );
  if (others.length === 0) return null;

  return (
    <section aria-labelledby="more-games" className="border-t border-rule bg-page">
      <div className="mx-auto w-full max-w-[74rem] px-5 py-12 sm:px-8 sm:py-14">
        <h2 id="more-games" className="sip-display text-[1.5rem]">
          More in the library
        </h2>
        <ul className="mt-7 grid list-none grid-cols-1 gap-x-6 gap-y-10 p-0 min-[30rem]:grid-cols-2 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-3">
          {others.map((other) => (
            <li
              key={`${other.game.slug}/${other.scope.key}`}
              className="flex min-w-0"
            >
              <GameCard profile={other} />
            </li>
          ))}
        </ul>
      </div>
    </section>
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
