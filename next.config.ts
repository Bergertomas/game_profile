import type { NextConfig } from "next";
import { resolveSiteEnv } from "./lib/site-env";

/**
 * The deployment environment is decided here, once, and pinned into the bundle.
 *
 * `env` entries are substituted textually into every `process.env.<KEY>` in both
 * the server and client bundles at build time. That is the point: the signals
 * this is derived from — `WORKERS_CI_BRANCH` above all — are *build* variables
 * that do not exist in the Cloudflare Workers runtime. Resolving it at request
 * time instead answers "preview" on every request, which serves `noindex` and
 * `Disallow: /` from production. See lib/site.ts.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Game pages are static-first: they are editorial documents that change only
  // when an evaluation is published. See docs/decisions/0002-data-access.md.
  typedRoutes: true,
  env: {
    NEXT_PUBLIC_SITE_ENV: resolveSiteEnv(process.env),
  },
};

export default nextConfig;
