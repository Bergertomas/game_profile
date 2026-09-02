import type { Metadata } from "next";
import { CompareApp } from "@/components/compare/CompareApp";
import { LauncherGuidance } from "@/components/compare/LauncherGuidance";
import { buildCompareIndex } from "@/lib/compare";
import { listGameProfiles } from "@/lib/data/games";
import { indexFrom } from "@/lib/search/public-index";
import { registryForBuild } from "@/lib/search/test-registry";
import { absoluteUrl } from "@/lib/site";

const TITLE = "Compare two Game Profiles";
const DESCRIPTION =
  "Put two published Game Profiles side by side: the same eight dimensions, exact values and confidence for each, the relation on every row, and what the two share. Differences and trade-offs, never a winner.";

/**
 * `/compare` — the launcher, and the only address Compare prerenders.
 *
 * The launcher is indexable because it carries standalone guidance a reader
 * can use without a pair: what a comparison shows, how a relation is decided,
 * what makes a profile eligible, and every game that can be chosen today, each
 * with a real link (ADR 0033: "may be indexed only when it has substantive
 * standalone guidance"). A pair address is the same document with a
 * client-side selection and is `noindex, follow` — by the response header in
 * next.config.ts and by the document's own robots meta once the pair is
 * restored — and it is never in the sitemap.
 *
 * ── The corpus is read once, at build ───────────────────────────────────────
 *
 * `listGameProfiles()` is the public data boundary and runs in the build
 * process against build-time Postgres (ADR 0017). Everything a pair may need
 * is reduced into the Compare index here and serialised into the page; the
 * deployed Worker serves the prerendered document and never reads a database.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/compare" },
  openGraph: {
    type: "website",
    url: absoluteUrl("/compare"),
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default async function ComparePage() {
  const profiles = await listGameProfiles();
  const index = buildCompareIndex(profiles, indexFrom(profiles, registryForBuild()));

  return <CompareApp index={index} launcher={<LauncherGuidance index={index} />} />;
}
