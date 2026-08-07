import type { MetadataRoute } from "next";
import { absoluteUrl, IS_INDEXABLE } from "@/lib/site";

/**
 * Public pages are all crawlable; there is nothing private in the app yet, so
 * this deliberately invents no rules beyond the two that are real:
 *
 * - `/dev/*` is a development-only harness that 404s in production. Excluding
 *   it costs nothing and stops a crawler wasting requests on it.
 * - a non-production build (any Cloudflare preview, or a local build) refuses
 *   crawling outright, so a preview hostname can never enter the index.
 *
 * When admin/editorial routes land (Plan Phases 4–5) they go under a single
 * prefix and get one more `disallow` line here — plus their own `noindex`,
 * because robots.txt suppresses crawling, not indexing.
 */
export default function robots(): MetadataRoute.Robots {
  if (!IS_INDEXABLE) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: "/dev/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
