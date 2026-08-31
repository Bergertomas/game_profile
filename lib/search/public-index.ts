import { RECOGNIZED_GAMES } from "@/content/search-registry";
import { listGameProfiles } from "@/lib/data/games";
import { formatYear } from "@/lib/format";
import { byCodeUnit } from "@/lib/order";
import type { ProfileView } from "@/lib/profile/build";
import { profilePath } from "@/lib/site";
import { toRecognizedEntries, uniqueTerms, type RegisteredGame } from "./registry";
import type { PublicSearchIndex, PublishedEntry } from "./types";

/**
 * Assemble the public search index.
 *
 * ── This runs during `next build`, and only there ──────────────────────────
 *
 * `listGameProfiles()` is the single public data boundary (lib/data/games.ts),
 * and every public route is prerendered, so this executes in the build process
 * against build-time Postgres — never in the Cloudflare Worker, which has no
 * database at all (ADR 0017). The result is serialised into the page and
 * matched in the browser, which is what makes search work on a static site
 * without a query, a service or a second runtime.
 *
 * ── Published entries are the published catalogue, exactly ─────────────────
 *
 * One entry per PROFILE, not per game: a game with two current scopes is two
 * evaluated experiences and neither summarises the other, so both are
 * searchable and both carry their own canonical path. `path` comes from
 * `profilePath`, the same function the pages and the sitemap use, so a search
 * result cannot address a URL the site does not serve.
 *
 * Nothing unpublished reaches this index, because nothing unpublished reaches
 * `listGameProfiles`. There is no filtering step here that could be got wrong
 * later — the absence of one is the guarantee.
 */
export async function buildPublicSearchIndex(): Promise<PublicSearchIndex> {
  return indexFrom(await listGameProfiles(), RECOGNIZED_GAMES);
}

/**
 * The pure half, so the whole index is testable without a data layer.
 *
 * Exported for tests and for the page, which already holds the profiles it
 * rendered and should not read the corpus twice.
 */
export function indexFrom(
  profiles: readonly ProfileView[],
  registry: readonly RegisteredGame[],
): PublicSearchIndex {
  const published = profiles.map(toPublishedEntry).sort(
    (a, b) => byCodeUnit(a.title, b.title) || byCodeUnit(a.id, b.id),
  );

  // A game the catalogue now profiles is no longer "recognised, not profiled",
  // whatever a stale registry row says. Keyed on the game slug, which is the id
  // a registry row is required to use.
  const profiledSlugs = new Set(profiles.map((profile) => profile.game.slug));

  return { published, recognized: toRecognizedEntries(registry, profiledSlugs) };
}

function toPublishedEntry(profile: ProfileView): PublishedEntry {
  const { game, scope, evaluation } = profile;
  const year = formatYear(game.firstReleaseDate);

  return {
    kind: "published",
    id: `${game.slug}:${scope.key}`,
    slug: game.slug,
    title: game.canonicalTitle,
    scopeLabel: scope.label,
    scopeKey: scope.key,
    isPrimary: scope.isPrimary,
    path: profilePath(game.slug, scope),
    developer: game.developerText,
    year: year || null,
    evidenceStatus: evaluation.evidenceStatus,
    terms: termsFor(profile),
  };
}

/**
 * Everything this profile may be found by.
 *
 * Titles and editorial aliases, plus the scope label where that label
 * IDENTIFIES rather than merely describes. The distinction is the reason for
 * the `isPrimary` test: "Tower of Sisyphus" names one specific evaluated
 * experience and is worth searching on its own, while "Main game" is what
 * almost every primary scope is called and would match half the catalogue on a
 * query that meant nothing.
 *
 * Scope-qualified forms ("returnal tower of sisyphus") are included so a
 * visitor who knows exactly which experience they want can say so and land on
 * it — that is the specificity the exact-match rule in resolve.ts rewards.
 */
function termsFor(profile: ProfileView): readonly string[] {
  const { game, scope } = profile;
  const names = [game.canonicalTitle, ...game.aliases];
  const qualified = scope.isPrimary
    ? []
    : [...names.map((name) => `${name} ${scope.label}`), scope.label];

  return uniqueTerms([...names, ...qualified]);
}
