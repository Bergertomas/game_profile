import { readFixtureProfiles } from "@/lib/data/fixture-profiles";
import type { ManifestSource } from "@/lib/deploy/manifest";
import { isDatabaseConfigured } from "@/lib/db/client";
import { readPublishedProfiles } from "@/lib/db/read-profiles";
import { buildProfileView, type ProfileView } from "@/lib/profile/build";
import type { GameWithEvaluation } from "@/lib/profile/types";
import { RUBRIC_V1 } from "@/lib/rubric";
import { SITE_ENV } from "@/lib/site";

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
 * The cutover switch (Master Plan v0.7 §9.5, activation step 5).
 *
 * Set `REQUIRE_DATABASE=1` as a Workers Builds build variable once production
 * Postgres is provisioned. From that point a build with no `DATABASE_URL` fails
 * closed instead of quietly republishing the calibration corpus, which is the
 * one failure mode a fixture fallback can produce that nobody would notice.
 *
 * It defaults off because production has no database yet and the public site
 * has to stay deployable until it does. Cutover is therefore one variable, not
 * a code change — and after it, deleting the fallback branch below is the
 * cleanup.
 */
function databaseIsRequired(): boolean {
  // A PRODUCTION BUILD REQUIRES THE DATABASE WHATEVER THE ENVIRONMENT SAYS.
  //
  // `REQUIRE_DATABASE=1` is set for production and is the operational switch,
  // but a switch is a thing that can be unset — by an edited build variable, a
  // new Workers Builds environment, or a local `next build` somebody deploys.
  // `SITE_ENV` folds to a literal at build time, so this half is not a runtime
  // check that could be missing: in a production bundle the fallback branch
  // below is unreachable code.
  //
  // Which means production cannot substitute the calibration corpus for the
  // editorial one even if every variable is wrong. That is the failure worth
  // making structurally impossible: it is silent, it looks exactly like a
  // successful deploy, and what it publishes is three profiles nobody authored
  // today wearing the clothes of the real catalogue.
  return SITE_ENV === "production" || process.env.REQUIRE_DATABASE === "1";
}

/**
 * TEMPORARY COMPATIBILITY PATH — the whole of it, in one function.
 *
 * Postgres is the operational source of editorial truth. Production Postgres is
 * not yet provisioned, and the public site has to stay deployable in the
 * meantime, so a build with no `DATABASE_URL` reads the calibration fixtures
 * instead of failing.
 *
 * This is not a second long-term datastore and must not become one. The build
 * always says which path it took, because a silent fallback is how a
 * fixture-backed deploy gets mistaken for a database-backed one.
 */
async function loadPublishedProfiles(): Promise<GameWithEvaluation[]> {
  if (isDatabaseConfigured()) {
    corpusSource = "database";
    const profiles = await readPublishedProfiles(PUBLIC_RUBRIC_VERSION);
    console.log(
      `[data] ${profiles.length} published profile(s) from Postgres.`,
    );
    return profiles;
  }

  if (databaseIsRequired()) {
    throw new Error(
      `DATABASE_URL is not set${
        SITE_ENV === "production"
          ? ", and this is a production build"
          : " and REQUIRE_DATABASE is"
      }.\n` +
        "This build would have published the calibration fixtures as though " +
        "they were the editorial corpus. Refusing: Postgres is the only source " +
        "of published profiles (Master Plan v0.8 §9.2).\n" +
        (SITE_ENV === "production"
          ? "A production build has no fixture fallback at all. Set DATABASE_URL."
          : "Set DATABASE_URL, or unset REQUIRE_DATABASE if this environment is " +
            "deliberately fixture-backed."),
    );
  }

  corpusSource = "fixtures";
  const profiles = readFixtureProfiles(PUBLIC_RUBRIC_VERSION);
  console.log(
    `[data] DATABASE_URL is not set — reading ${profiles.length} published ` +
      `profile(s) from the calibration fixtures. This build is NOT production; ` +
      `a production build refuses outright. Fixtures remain valid for unit ` +
      `tests, parity, development harnesses and named synthetic Playwright ` +
      `corpora (ADR 0017, Master Plan v0.8 §9.2).`,
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

/**
 * Which corpus the load above actually read.
 *
 * Set inside `loadPublishedProfiles`, so it reports what happened rather than
 * what would happen if the question were asked again. That distinction is the
 * point: the deployment manifest publishes this value as a fact about the
 * artifact, and re-deriving it from `isDatabaseConfigured()` at some later
 * moment would be a guess dressed as a record.
 */
let corpusSource: ManifestSource | null = null;

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
  corpusSource = null;
}

/**
 * Whether this build's published corpus came from Postgres or the fixtures.
 *
 * Awaits the load deliberately. Asked before the corpus resolves the answer
 * would be `null`, and a manifest that omitted the field — or guessed it — would
 * be unable to distinguish a correctly deployed fixture-backed site from a
 * database-backed one. Those two artifacts are equally healthy and share not a
 * single Live evaluation, which is exactly the confusion the field exists to
 * prevent.
 */
export async function publishedCorpusSource(): Promise<ManifestSource> {
  await publishedProfiles();
  // Non-null by construction: `loadPublishedProfiles` assigns on every path
  // that returns, and throws on the one that does not.
  return corpusSource!;
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
