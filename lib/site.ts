/**
 * Site identity and deployment environment.
 *
 * Two rules live here and are relied on everywhere else:
 *
 * 1. The canonical origin is a constant. It is never derived from the request
 *    host, because a preview deployment on `*.workers.dev` must never publish
 *    itself as canonical — see docs/Should_I_Play_Brand_and_SEO_Foundation.md.
 * 2. Only a production build is indexable. Everything else (previews, local
 *    builds, other hosts) is served with `noindex` and a `Disallow: /` robots
 *    file, so preview URLs cannot become part of the public search surface.
 *
 * "Should I Play?" is the public brand. "Game Profile" remains the name of the
 * eight-dimension evaluation the site publishes, and that distinction is
 * deliberate in every string below.
 */

export const SITE_NAME = "Should I Play?";

/** The canonical production origin. No trailing slash. */
export const SITE_URL = "https://shouldiplay.gg";

/** Retained from the original positioning: the product's one-line thesis. */
export const SITE_TAGLINE = "What kind of good is it?";

export const SITE_DESCRIPTION =
  "Should I Play? gives every game a Game Profile: eight fixed dimensions scored " +
  "against a published rubric, so you can see what a game is actually good at — " +
  "and what might make it wrong for you. There is no overall score.";

/**
 * The branch that owns the production deployment. Any other branch that
 * Cloudflare builds is a preview and must not be indexed.
 */
export const PRODUCTION_BRANCH = "main";

export type SiteEnv = "production" | "preview";

/**
 * Resolved at build time, because every public page is statically rendered.
 *
 * `NEXT_PUBLIC_SITE_ENV` wins if set. Otherwise Cloudflare Workers Builds tells
 * us which branch it is building. With neither signal we assume "preview": a
 * build we cannot identify is one we should not let into the index.
 */
export function resolveSiteEnv(
  env: Readonly<Record<string, string | undefined>> = process.env,
): SiteEnv {
  const explicit = env.NEXT_PUBLIC_SITE_ENV;
  if (explicit === "production" || explicit === "preview") return explicit;

  const branch = env.WORKERS_CI_BRANCH;
  if (branch) return branch === PRODUCTION_BRANCH ? "production" : "preview";

  return "preview";
}

export const SITE_ENV: SiteEnv = resolveSiteEnv();

/** Whether this build may be indexed by search engines. */
export const IS_INDEXABLE = SITE_ENV === "production";

/** Absolute canonical URL for a site-root-relative path. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}

/** Canonical public URL for a game profile. The permanent address of a game. */
export function gameUrl(slug: string): string {
  return absoluteUrl(`/games/${slug}`);
}

/**
 * The `<title>` for a game page.
 *
 * Deliberately phrased as the question a person actually types, because that
 * question is also the product's name. `Should I Play Returnal? | Should I Play?`
 */
export function gameTitle(canonicalTitle: string): string {
  return `Should I Play ${canonicalTitle}? | ${SITE_NAME}`;
}
