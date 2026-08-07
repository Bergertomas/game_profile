import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext Cloudflare adapter configuration.
 *
 * Deliberately bare. Every public page in the app is statically prerendered
 * (see the route table in `npm run build`: the home page, /methodology, every
 * /games/<slug>, robots.txt, sitemap.xml and all Open Graph images), so there is
 * nothing yet for an incremental cache to hold. When a route starts using ISR or
 * on-demand revalidation, add the R2 incremental cache here — that is the
 * documented next step, not a change of architecture.
 *
 * See docs/decisions/0008-cloudflare-hosting.md.
 */
export default defineCloudflareConfig();
