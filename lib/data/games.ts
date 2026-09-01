import { readFixtureProfiles } from "@/lib/data/fixture-profiles";
import type { ManifestSource } from "@/lib/deploy/manifest";
import { isDatabaseConfigured } from "@/lib/db/client";
import { readPublishedProfiles } from "@/lib/db/read-profiles";
import { byCodeUnit } from "@/lib/order";
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
 * loaded once PER PROCESS and memoised there, which is what a static build
 * wants and is also why the memo is safe: there is no request whose data could
 * go stale under it. Moving `/games/*` to request-time rendering would make
 * this cache wrong, and this comment is the warning that goes with it.
 *
 * Per process, not per build: Next renders static pages across several worker
 * processes and each gets its own module instance and its own memo. Every
 * consumer inside one process shares one read — which is the property
 * `/deployment-manifest` relies on — but a build as a whole may read the corpus
 * more than once.
 *
 * The one thing that DOES run in the Worker is a request-time render of a
 * `/games/*` address that was never prerendered, i.e. one that does not exist.
 * There is no database there and there is not supposed to be; see
 * `whenCorpusIsReadable`.
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
 * This runtime cannot read the published corpus at all.
 *
 * Distinct from "the corpus is readable and contains no such game", and the
 * distinction is the whole point of the type. Both used to surface identically
 * — as a thrown `Error` — and the deployed Worker turned every unknown
 * `/games/*` URL into a 500 because of it (see `whenCorpusIsReadable`).
 *
 * Thrown only where a build has no database and must refuse rather than
 * republish the calibration fixtures. A genuine database failure is NOT this:
 * it stays an ordinary error, because "Postgres refused the query" must never
 * be quietly answered with a 404.
 */
export class CorpusUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorpusUnavailableError";
  }
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
    throw new CorpusUnavailableError(
      `DATABASE_URL is not set${
        SITE_ENV === "production"
          ? ", and this is a production build"
          : " and REQUIRE_DATABASE is"
      }.\n` +
        "This build would have published the calibration fixtures as though " +
        "they were the editorial corpus. Refusing: Postgres is the only source " +
        "of published profiles (Master Plan v0.9 §9.2).\n" +
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
      `corpora (ADR 0017, Master Plan v0.9 §9.2).`,
  );
  return profiles;
}

/**
 * The published corpus, loaded once per process.
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
  if (corpus) return corpus;

  const loading = loadPublishedProfiles().then((profiles) =>
    profiles.slice().sort(
      (a, b) =>
        byCodeUnit(a.game.canonicalTitle, b.game.canonicalTitle) ||
        a.scope.displayOrder - b.scope.displayOrder ||
        byCodeUnit(a.scope.key, b.scope.key),
    ),
  );

  // A load that FAILED is not memoised, and the handler attached here is what
  // makes that safe. Keeping the rejected promise would report the same failure
  // to every later caller — fine — but it would also be an unhandled rejection
  // the moment nobody happened to be awaiting it, which in a Worker is a
  // crashed request rather than a logged warning.
  loading.catch(() => {
    if (corpus === loading) corpus = null;
  });

  corpus = loading;
  return loading;
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

/**
 * Read the corpus for a REQUEST, answering `fallback` if this runtime has none.
 *
 * ── The bug this exists to fix ─────────────────────────────────────────────
 *
 * Every published profile is prerendered, so the only `/games/*` URLs the
 * deployed Worker renders on demand are ones that do not exist. The page then
 * called `getGameProfile`, which loaded the corpus, which in a production
 * bundle refuses outright when `DATABASE_URL` is unset — and it always is at
 * request time, because the public path is build-time Postgres only (ADR 0017).
 * So the throw happened before `notFound()` could be reached and production
 * answered **500** for every unknown or stale `/games/*` URL, including every
 * one a crawler still had. The route's own comment said it 404s. It did not.
 *
 * ── Why this is narrow, and must stay narrow ───────────────────────────────
 *
 * "I cannot read the corpus" is only equivalent to "there is no such profile"
 * when the question is about ONE address that would have been prerendered if it
 * existed. It is emphatically not equivalent anywhere else: the sitemap, the
 * homepage and above all `/deployment-manifest` must fail loudly rather than
 * publish an empty answer, because an empty manifest is a certificate that
 * production serves nothing. So this is an explicit wrapper at the two dynamic
 * route files that need it, never a property of the readers themselves.
 *
 * A build is unaffected in both directions: `generateStaticParams` calls the
 * readers directly and still fails a database-less production build closed,
 * before any page renders.
 */
export async function whenCorpusIsReadable<T>(
  read: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof CorpusUnavailableError) return fallback;
    throw error;
  }
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
