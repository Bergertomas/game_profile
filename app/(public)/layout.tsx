import { JsonLd } from "@/components/JsonLd";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { siteGraph } from "@/lib/seo/structured-data";

/**
 * The public site's chrome.
 *
 * Split out of the root layout when the editorial tool arrived. The chrome, the
 * skip link and the site-wide `Organization`/`WebSite` structured data are
 * properties of the *published product*, and `/admin` is not part of it: an
 * editorial tool framed by "What kind of good is it?" and a footer explaining
 * the methodology to readers is a tool wearing a shopfront. Worse, the site
 * JSON-LD would have been emitted on pages describing unpublished drafts.
 *
 * A route group, so no public URL changes — `app/(public)/games/[slug]` still
 * serves `/games/[slug]`. The root layout keeps only what genuinely belongs to
 * every document: the html shell, the fonts and the global stylesheet.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={siteGraph()} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-graphite focus:px-3 focus:py-2 focus:text-sm focus:text-bone focus:outline-signal"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
