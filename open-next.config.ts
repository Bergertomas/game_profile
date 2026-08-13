import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import incrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * OpenNext Cloudflare adapter configuration.
 *
 * ── Why an incremental cache is not optional here ───────────────────────────
 *
 * Every public route is statically prerendered, and the obvious reading of that
 * is "there is nothing for a cache to hold". It is wrong, and the way it is
 * wrong is invisible until the build and the runtime disagree about the data.
 *
 * With no incremental cache configured, the Worker does not serve the HTML the
 * build produced. It re-renders the page on request, in the Worker, from
 * whatever the data layer can reach there. While the fixtures were the only
 * source that was unobservable: build and runtime rendered identical bytes. Once
 * the build reads Postgres it stops being unobservable — the build has a
 * database and the Worker does not, so the Worker would quietly serve the
 * fixture corpus instead of the published one. Proved by changing a title in the
 * database, rebuilding, and watching the Worker serve the old one.
 *
 * `staticAssetsIncrementalCache` reads prerendered pages back out of the
 * deployed assets, which is exactly this application's shape: prerendered only,
 * no revalidation, nothing to write. It is read-only by design — a `set` is an
 * error, which is the correct behaviour for a site whose content changes only
 * when it is rebuilt.
 *
 * If a route ever does need ISR or on-demand revalidation, this becomes the R2
 * cache and the Worker gains the self-reference binding wrangler.jsonc
 * documents. That is the documented next step, not a change of architecture.
 *
 * See docs/decisions/0008-cloudflare-hosting.md and ADR 0017.
 */
export default defineCloudflareConfig({ incrementalCache });
