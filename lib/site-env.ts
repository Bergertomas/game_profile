/**
 * Build-time resolution of the deployment environment.
 *
 * Kept in its own module with no Next.js imports so `next.config.ts` can import
 * it directly. The config calls `resolveSiteEnv` once and pins the answer into
 * `env.NEXT_PUBLIC_SITE_ENV`, which Next then substitutes textually into both
 * bundles — see the comment on `SITE_ENV` in lib/site.ts for why that
 * indirection is load-bearing rather than decorative.
 */

/**
 * The branch that owns the production deployment. Any other branch that
 * Cloudflare builds is a preview and must not be indexed.
 */
export const PRODUCTION_BRANCH = "main";

export type SiteEnv = "production" | "preview";

/**
 * A non-production Workers Builds branch is always a preview, even if a stale
 * explicit variable says otherwise. An explicit `preview` also vetoes
 * production; only an explicit `production` with no contradictory branch, or
 * the production branch with no contradictory explicit value, is indexable.
 * With neither signal we assume "preview": a build we cannot identify is one
 * we should not let into the index.
 *
 * This runs in the Node process that performs the build. It must never be the
 * thing a *request* consults — `WORKERS_CI_BRANCH` is a build variable and does
 * not exist in the Workers runtime, so calling this at request time silently
 * answers "preview" no matter what was built.
 */
export function resolveSiteEnv(
  env: Readonly<Record<string, string | undefined>> = process.env,
): SiteEnv {
  const explicit = env.NEXT_PUBLIC_SITE_ENV;
  const branch = env.WORKERS_CI_BRANCH;

  if (branch && branch !== PRODUCTION_BRANCH) return "preview";
  if (explicit === "preview") return "preview";
  if (explicit === "production") return "production";
  if (explicit !== undefined) return "preview";
  if (branch === PRODUCTION_BRANCH) return "production";

  return "preview";
}
