import type { MetadataRoute } from "next";
import { absoluteUrl, IS_INDEXABLE } from "@/lib/site";

/**
 * Public pages are all crawlable; this deliberately invents no rules beyond the
 * three that are real:
 *
 * - `/dev/*` and `/design-lab/*` are development-only surfaces that 404 in a
 *   production build. Excluding them costs nothing and stops a crawler wasting
 *   requests on them. Any future segment guarded the same way belongs here too.
 * - `/admin/*` is the editorial tool. It is authenticated and sends
 *   `X-Robots-Tag: noindex` on every response, and it is absent from the
 *   sitemap, which lists published profiles only. This line is the third of
 *   those and the weakest: robots.txt suppresses crawling, not indexing, and
 *   none of the three is access control — Cloudflare Access is (ADR 0012, 0018).
 * - a non-production build (any Cloudflare preview, or a local build) refuses
 *   crawling outright, so a preview hostname can never enter the index.
 */
export default function robots(): MetadataRoute.Robots {
  if (!IS_INDEXABLE) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/dev/", "/design-lab/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
