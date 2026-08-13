import { readFixtureProfiles } from "@/lib/data/fixture-profiles";
import { isDatabaseConfigured } from "@/lib/db/client";
import { readPublishedProfiles } from "@/lib/db/read-profiles";
import { buildProfileView, type ProfileView } from "@/lib/profile/build";
import type { GameWithEvaluation } from "@/lib/profile/types";
import { RUBRIC_V1 } from "@/lib/rubric";

/**
 * The single data-access boundary for the public site.
 *
 * Everything above this line — pages, metadata, sitemap, share cards — works in
 * `ProfileView`s and has no idea a database exists. Everything below assembles
 * them. Nothing renders SQL and nothing queries from a component.
 *
 * ── When this runs ─────────────────────────────────────────────────────────
 *
 * Every public route is prerendered, so these functions execute during
 * `next build`, not in the Cloudflare Worker. The published corpus is therefore
 * loaded once per build and memoised for the process, which is what a static
 * build wants and is also why the memo is safe: there is no request whose data
 * could go stale under it. Moving `/games/*` to request-time rendering would
 * make this cache wrong, and this comment is the warning that goes with it.
 */

/**
 * The database deliberately permits one published row per profile scope *per
 * rubric* so a rubric migration can preserve both interpretations. The public
 * site still needs one deterministic answer; changing this selector is the
 * explicit cut-over step when a future rubric becomes authoritative.
 */
export const PUBLIC_RUBRIC_VERSION = RUBRIC_V1.version;

/**
 * TEMPORARY COMPATIBILITY PATH — the whole of it, in one expression.
 *
 * Postgres is the operational source of editorial truth. Production Postgres is
 * not yet provisioned, and the public site has to stay deployable in the
 * meantime, so a build with no `DATABASE_URL` reads the calibration fixtures
 * instead of failing.
 *
 * This is not a second long-term datastore and must not become one. Removing it
 * is deleting the `else` branch below, once a production `DATABASE_URL` exists.
 * Until then the build says which path it took, because a silent fallback is
 * how a fixture-backed deploy gets mistaken for a database-backed one.
 */
async function loadPublishedProfiles(): Promise<GameWithEvaluation[]> {
  if (isDatabaseConfigured()) {
    const profiles = await readPublishedProfiles(PUBLIC_RUBRIC_VERSION);
    console.log(
      `[data] ${profiles.length} published profile(s) from Postgres.`,
    );
    return profiles;
  }

  const profiles = readFixtureProfiles(PUBLIC_RUBRIC_VERSION);
  console.log(
    `[data] DATABASE_URL is not set — reading ${profiles.length} published ` +
      `profile(s) from the calibration fixtures. This is the temporary path ` +
      `until production Postgres is provisioned (ADR 0017).`,
  );
  return profiles;
}

/**
 * The published corpus, loaded once per build.
 *
 * Sorted here rather than in each reader so both paths present the same
 * catalogue order: alphabetical by game, then scope order within a game. That
 * ordering is presentation only — it decides how cards are listed and has no
 * bearing on which scope is primary, which is an explicit property.
 */
let corpus: Promise<GameWithEvaluation[]> | null = null;

function publishedProfiles(): Promise<GameWithEvaluation[]> {
  corpus ??= loadPublishedProfiles().then((profiles) =>
    profiles.slice().sort(
      (a, b) =>
        a.game.canonicalTitle.localeCompare(b.game.canonicalTitle) ||
        a.scope.displayOrder - b.scope.displayOrder ||
        a.scope.key.localeCompare(b.scope.key),
    ),
  );
  return corpus;
}

/** Discard the memo. Tests only — a build loads once and exits. */
export function resetProfileCache(): void {
  corpus = null;
}

/**
 * Every published profile, in catalogue order.
 *
 * One entry per *profile*, not per game. A game with two current scopes — The
 * Long Dark's Survival and Wintermute — contributes two, because they are two
 * evaluations of two different experiences and neither summarises the other.
 */
export async function listGameProfiles(): Promise<ProfileView[]> {
  return (await publishedProfiles()).map(buildProfileView);
}

/** Every published profile of one game, in scope order. Empty if it has none. */
export async function listProfileScopes(slug: string): Promise<ProfileView[]> {
  return (await publishedProfiles())
    .filter((entry) => entry.game.slug === slug)
    .map(buildProfileView);
}

/**
 * The profile served at `/games/<slug>` — the game's PRIMARY scope.
 *
 * Primary is an explicit, durable property of the scope, never "the first row"
 * and never `displayOrder`: reordering two scopes for a listing must not move a
 * canonical URL (ADR 0016). The database guarantees at most one primary scope
 * per game, and that a game publishing anything publishes its primary scope, so
 * this resolves for every game with public content.
 *
 * Returns null when the game is unknown, or when its primary scope has no
 * published evaluation under the public rubric. It never falls back to a
 * sibling scope: answering the canonical URL with a different evaluated
 * experience would silently publish the wrong profile.
 */
export async function getGameProfile(
  slug: string,
): Promise<ProfileView | null> {
  const record = (await publishedProfiles()).find(
    (entry) => entry.game.slug === slug && entry.scope.isPrimary,
  );
  return record ? buildProfileView(record) : null;
}

/**
 * One specific profile, addressed by game and scope key.
 *
 * Used by the sibling route. Returns null for an unknown key and for a key
 * whose scope has no published evaluation — a draft-only scope is not public
 * merely because it exists.
 */
export async function getGameProfileForScope(
  slug: string,
  scopeKey: string,
): Promise<ProfileView | null> {
  const record = (await publishedProfiles()).find(
    (entry) => entry.game.slug === slug && entry.scope.key === scopeKey,
  );
  return record ? buildProfileView(record) : null;
}

/** Distinct slugs, for static generation. One base page per game. */
export async function listGameSlugs(): Promise<string[]> {
  return [
    ...new Set(
      (await publishedProfiles())
        .filter((entry) => entry.scope.isPrimary)
        .map((entry) => entry.game.slug),
    ),
  ];
}

/**
 * Every published sibling-scope address, for static generation.
 *
 * The primary scope is excluded: its canonical address is the bare game URL,
 * and prerendering it here as well would publish one profile at two indexable
 * URLs. The sibling route redirects the primary key rather than rendering it.
 */
export async function listSiblingScopeParams(): Promise<
  { slug: string; scope: string }[]
> {
  return (await publishedProfiles())
    .filter((entry) => !entry.scope.isPrimary)
    .map((entry) => ({ slug: entry.game.slug, scope: entry.scope.key }));
}

/**
 * Scope keys that are published for a game but are not its public address —
 * i.e. the primary key, which the sibling route redirects to `/games/<slug>`.
 */
export async function listPrimaryScopeParams(): Promise<
  { slug: string; scope: string }[]
> {
  return (await publishedProfiles())
    .filter((entry) => entry.scope.isPrimary)
    .map((entry) => ({ slug: entry.game.slug, scope: entry.scope.key }));
}
