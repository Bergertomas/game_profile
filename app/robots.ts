import type { MetadataRoute } from "next";
import { absoluteUrl, IS_INDEXABLE } from "@/lib/site";

/**
 * Public pages are all crawlable; there is nothing private in the app yet, so
 * this deliberately invents no rules beyond the two that are real:
 *
 * - `/dev/*` and `/design-lab/*` are development-only surfaces that 404 in a
 *   production build. Excluding them costs nothing and stops a crawler wasting
 *   requests on them. Any future segment guarded the same way belongs here too.
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
    rules: { userAgent: "*", allow: "/", disallow: ["/dev/", "/design-lab/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
