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

import type { Route } from "next";

export const SITE_NAME = "Should I Play?";

/** The canonical production origin. No trailing slash. */
export const SITE_URL = "https://shouldiplay.gg";

/** Retained from the original positioning: the product's one-line thesis. */
export const SITE_TAGLINE = "What kind of good is it?";

export const SITE_DESCRIPTION =
  "Should I Play? gives every game a Game Profile: eight fixed dimensions scored " +
  "against a published rubric, so you can see what a game is actually good at — " +
  "and what might make it wrong for you. There is no overall score.";

export { PRODUCTION_BRANCH, resolveSiteEnv, type SiteEnv } from "@/lib/site-env";

/**
 * The environment this bundle was built for.
 *
 * `process.env.NEXT_PUBLIC_SITE_ENV` is written as a literal member expression
 * on purpose, and it must stay that way. `next.config.ts` resolves the
 * environment once at build time and declares it under `env`, which Next
 * substitutes textually — so this compiles down to a constant string baked into
 * the bundle.
 *
 * Reading it any other way (through a variable, a helper, a destructure) defeats
 * the substitution and leaves a real `process.env` lookup in the deployed
 * Worker. That lookup finds nothing: `WORKERS_CI_BRANCH` is a *build* variable
 * and does not exist in the Workers runtime, so the fallback answers "preview"
 * on every request and production serves `noindex` and `Disallow: /` while the
 * prerendered files on disk say the opposite. That bug shipped once and was
 * caught by `npm run cf:verify`, which exists to catch it again.
 */
export const SITE_ENV: SiteEnvValue =
  process.env.NEXT_PUBLIC_SITE_ENV === "production" ? "production" : "preview";

type SiteEnvValue = "production" | "preview";

/** Whether this build may be indexed by search engines. */
export const IS_INDEXABLE = SITE_ENV === "production";

/**
 * Whether internal design-review surfaces are part of this build.
 *
 * Covers `/design-lab/*`, `/dev/*` and the evaluation artwork they reference.
 *
 * This is deliberately keyed to the *site* environment and not to `NODE_ENV`.
 * `NODE_ENV` says how the JavaScript was compiled; a Cloudflare branch preview
 * is compiled exactly like production and is still not the public site. Keying
 * the lab to `NODE_ENV === "production"` made the design work invisible
 * everywhere except a laptop, which defeated the point of having branch
 * previews at all — see docs/decisions/0010-design-surfaces-and-site-environment.md.
 *
 * Because `SITE_ENV` folds to a literal at build time, so does this, so the
 * whole lab and its artwork table remain dead code a bundler can drop from a
 * production build. `npm run check:containment` verifies that against the real
 * artefact rather than trusting it.
 */
export const DESIGN_SURFACES_ENABLED = SITE_ENV !== "production";

/** Absolute canonical URL for a site-root-relative path. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}

/** Canonical public URL for a game. The address of its primary profile. */
export function gameUrl(slug: string): string {
  return absoluteUrl(`/games/${slug}`);
}

/**
 * The canonical public path of one profile.
 *
 * A game's primary scope owns the bare game URL; every sibling scope is
 * addressed by its key. One profile, one address — the primary scope is
 * deliberately NOT also reachable at `/games/<slug>/<its-key>` as a second
 * indexable page (ADR 0016).
 *
 *   primary   →  /games/returnal
 *   sibling   →  /games/the-long-dark/wintermute
 */
export function profilePath(
  slug: string,
  scope: { readonly key: string; readonly isPrimary: boolean },
): Route {
  return (
    scope.isPrimary ? `/games/${slug}` : `/games/${slug}/${scope.key}`
  ) as Route;
}

/** Absolute canonical URL for one profile. */
export function profileUrl(
  slug: string,
  scope: { readonly key: string; readonly isPrimary: boolean },
): string {
  return absoluteUrl(profilePath(slug, scope));
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
