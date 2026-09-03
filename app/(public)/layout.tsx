import { JsonLd } from "@/components/JsonLd";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SearchIndexProvider } from "@/components/search/SearchIndexProvider";
import { whenCorpusIsReadable } from "@/lib/data/games";
import { buildPublicSearchIndex } from "@/lib/search/public-index";
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
 *
 * ── Why the search index is read through `whenCorpusIsReadable` ────────────
 *
 * The header carries a search trigger, which needs the static index, which is
 * built from the published corpus. This layout renders for EVERY public
 * response including the 404 the deployed Worker produces for a `/games/*`
 * address that was never prerendered — and in that runtime there is no
 * database, so an unguarded read throws before `notFound()` is reached and the
 * 404 becomes a 500. That exact bug shipped once (see lib/data/games.ts) and
 * this is the guard that keeps the chrome from reintroducing it.
 *
 * The fallback is `null` and NOT an empty index, deliberately. A search field
 * backed by an empty index answers "we do not recognise that title" for every
 * real game, which is a lie; a header with no search trigger is merely a header
 * with no search trigger. Where the product cannot answer, it does not offer.
 *
 * It is read ONCE here and provided to the whole document, rather than handed
 * separately to the header trigger and to the homepage's own field. A client
 * component's props are serialised per boundary, so passing it twice shipped it
 * twice — trivial at three profiles and a doubling of a payload that grows with
 * the catalogue.
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchIndex = await whenCorpusIsReadable(buildPublicSearchIndex, null);

  return (
    <SearchIndexProvider index={searchIndex}>
      <JsonLd data={siteGraph()} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-[var(--color-surface-chrome)] focus:px-3 focus:py-2 focus:text-sm focus:text-[var(--color-text-primary)]"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </SearchIndexProvider>
  );
}
