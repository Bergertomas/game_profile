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
  /**
   * An alternate build directory, for the one case that needs two builds at
   * once: the Playwright run builds the ordinary catalogue and the multi-scope
   * test corpus and serves both concurrently. Sharing `.next` would let the
   * second build overwrite the first's prerendered pages mid-run, and the
   * failure would read as a flaky test rather than as two builds colliding.
   *
   * Unset everywhere else, including every real build.
   */
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  env: {
    NEXT_PUBLIC_SITE_ENV: resolveSiteEnv(process.env),
  },
  /**
   * Response headers for the editorial tool.
   *
   * THESE LIVE HERE RATHER THAN IN A `proxy.ts`, AND THAT IS FORCED. Next 16
   * renamed middleware to Proxy and pins it to the Node.js runtime — the
   * `runtime` segment option is explicitly unavailable in a proxy file — while
   * `@opennextjs/cloudflare` refuses to build one:
   *
   *     ERROR Node.js middleware is not currently supported.
   *           Consider switching to Edge Middleware.
   *
   * So a proxy-based route gate cannot deploy on this stack at all. It builds
   * clean, passes the unit suite and serves correctly under `next start`, and
   * fails only at `cf:verify` — which is the gate that asks the real runtime,
   * and the reason that gate exists.
   *
   * Access control therefore lives where it has to anyway: Cloudflare Access at
   * the edge, and `requireEditor()` inside the admin layout and every Server
   * Action (ADR 0018). Headers are static routing metadata and need no runtime.
   *
   * `noindex` is not access control (ADR 0012) — it stops an authenticated
   * editor's browser or a toolbar from handing an unpublished draft to a
   * crawler. `no-store` keeps drafts out of any shared cache.
   */
  async headers() {
    return [
      /**
       * A Compare PAIR is `noindex, follow` (ADR 0033). The launcher at
       * `/compare` is one prerendered document and every pair address serves
       * it, so the distinction cannot live in the HTML; it lives in the
       * response header, attached to any request for the launcher that carries
       * the `games` parameter. The client restores the pair and repeats the
       * rule in the document's robots meta (components/compare/CompareApp.tsx).
       *
       * The `value` is load-bearing. Next treats a `has` query condition with
       * no value as "the parameter is present"; the OpenNext router tests an
       * EMPTY regex against the parameter's value, and an empty regex matches
       * the empty string a missing parameter reads as — so without a value
       * the deployed Worker marked the launcher itself noindex, which
       * `npm run cf:verify` caught. `.+` requires a non-empty parameter in
       * both runtimes.
       */
      {
        source: "/compare",
        has: [{ type: "query", key: "games", value: ".+" }],
        headers: [{ key: "x-robots-tag", value: "noindex, follow" }],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "x-robots-tag", value: "noindex, nofollow, noarchive" },
          { key: "cache-control", value: "no-store, must-revalidate" },
          { key: "referrer-policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
