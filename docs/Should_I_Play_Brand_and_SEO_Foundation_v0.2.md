# Should I Play? — Brand, Discoverability & Hosting v0.2

**Date:** 2026-08-07
**Status:** Locked for implementation. Source of truth for brand, domain, SEO architecture, hosting and analytics.
**Supersedes:** v0.1 (brand + first SEO layer, PR #2)

This is the only document that owns these topics. The Master Product & Build Plan
and the Project Context brief point here rather than restating any of it.

---

## 1. Brand

| | |
|---|---|
| Public product / site brand | **Should I Play?** |
| Canonical production domain | **https://shouldiplay.gg** |
| Supporting line | **What kind of good is it?** |
| Evaluation construct | **Game Profile** |
| Methodology | **Game Profile Scoring Rubric v1.0** |
| Registrar | Porkbun |
| DNS / CDN / host | Cloudflare |
| Source repository | GitHub — `Bergertomas/game_profile` |

The site's name is the question the user is already asking. The Game Profile is
the evidence structure that answers it. Keeping those two things distinct is the
whole point of the naming — "Should I Play?" is a destination, "Game Profile" is
a document type.

### Which word goes where

| Context | Correct |
|---|---|
| Site header, footer, `og:site_name`, `applicationName` | Should I Play? |
| Page titles | `Should I Play <Game>? \| Should I Play?` |
| The evaluation itself, in copy | "the Game Profile", "Game Profiles evaluate games across eight dimensions" |
| Card call-to-action, links to a profile | "Read the Game Profile" |
| Rubric, methodology page, ADRs | Game Profile Scoring Rubric / Game Profile methodology |
| TypeScript types, DB tables, repo name, package name | `GameProfile`, `game_profile` — unchanged, and deliberately so |

Do not force the brand into every heading. The home page H1 remains
"Not just whether a game is good. **What kind of good is it?**" — the header
already asks the brand's question, so the first heading gives the answer
mechanism rather than repeating it.

---

## 2. Discoverability as an architectural requirement

Organic search is a primary acquisition channel. Two properties follow, and both
are load-bearing rather than aspirational:

1. **Every published game is a durable, indexable page** at the permanent URL
   `https://shouldiplay.gg/games/<canonical-slug>`. Slugs are permanent; if a
   game is ever renamed, the old slug redirects rather than disappearing.
2. **Substantive content is in the HTML Google receives.** Every public page is
   statically prerendered at build time — the profile text, the eight scores,
   the subcriterion rationales, the evidence ledger and the interpretation
   blocks are all in the server-rendered markup. The radar is decorative and
   `aria-hidden`; the authoritative score table beside it is plain HTML. No
   important content depends on client-side JavaScript.

### Implemented

| | Where |
|---|---|
| Canonical origin as one constant, never derived from the request host | `lib/site.ts` |
| Per-page canonical URLs | `alternates.canonical` on every route |
| Search-intent titles | `gameTitle()` in `lib/site.ts` |
| Per-game descriptions from the real evaluation | `generateMetadata` in `app/games/[slug]/page.tsx` |
| Data-driven `sitemap.xml` | `app/sitemap.ts` |
| Environment-aware `robots.txt` | `app/robots.ts` |
| JSON-LD, with no rating of any kind | `lib/seo/structured-data.ts` |
| Prerendered Open Graph cards | `app/opengraph-image.tsx`, `app/games/[slug]/opengraph-image.tsx` |
| Regression tests for all of the above | `tests/seo.test.ts` |

### Titles and descriptions

Titles follow `Should I Play <Game Title>? | Should I Play?` — the question a
person types, and the site's name, which happen to be the same words.

Descriptions lead with the profile's own `oneLineExperience` — the sentence that
already exists to describe what the game is to play — followed by one clause
naming what the page contains. They are not keyword-padded and are not written
for the crawler. The page has to deserve the click because of the evaluation.

### Sitemap

Generated from `listGameProfiles()`, the same data-access boundary the pages
read. That function filters to `status === "published"`, which is what keeps
drafts, in-review and superseded evaluations out of the index, and it means a
catalogue of a thousand games needs no hand-editing.

`lastModified` is the evaluation's `publishedAt`, never the build timestamp — a
sitemap that claims every page changed at deploy time teaches a crawler to
ignore the field.

### robots.txt

Allows everything public, advertises the sitemap, and disallows `/dev/` (the
development-only radar harness, which 404s in production anyway). No rules are
invented for routes that do not exist. When the editorial/admin surface lands in
Phases 4–5 it goes under one prefix, gets one `disallow` line here, **and** gets
its own `noindex` — robots.txt suppresses crawling, not indexing.

### Preview deployments must never enter the index

Three independent mechanisms, because getting this wrong is expensive and silent:

1. The canonical URL is a constant. A preview on `*.workers.dev` still emits
   `<link rel="canonical" href="https://shouldiplay.gg/...">`.
2. A non-production build emits `<meta name="robots" content="noindex, nofollow">`.
3. A non-production build serves `robots.txt` as `Disallow: /` with no sitemap.

"Production" means an explicit `NEXT_PUBLIC_SITE_ENV=production` with no
non-production branch signal, or a Cloudflare Workers Build of `main` with no
contradictory explicit value. A non-main `WORKERS_CI_BRANCH`, an explicit
`preview`, or an invalid explicit value always resolves to preview. With neither
signal, local and unidentified builds are preview and are not indexable. This
fails closed on purpose: the cost of the opposite default is a duplicate-content
problem that takes months to unwind.

---

## 3. Structured data

Emitted as JSON-LD:

- **`WebSite` + `Organization`** site-wide, in the root layout.
- **`WebPage` → `mainEntity`: `VideoGame`** on a game page. The honest shape:
  we publish an evaluation *about* a game, not the game's own product page.
  Carries name, alternate names, the neutral factual summary, release date,
  platforms, developer and publisher.
- **`BreadcrumbList`** on game and methodology pages, naming only URLs that
  actually resolve.

Deliberately **not** emitted, and asserted absent in `tests/seo.test.ts`:

`aggregateRating` · `reviewRating` · `ratingValue` · `ratingCount` ·
`reviewCount` · `bestRating` · `worstRating` · `Review` · `Rating`

`Review` requires a `reviewRating`. This product has no overall score, so there
is no honest value to put there, and inventing one — an average of the eight, a
polygon area, a "recommendation strength" — would publish in machine-readable
form exactly the claim the product exists to refuse. Rich-result eligibility is
not worth it. If a future schema lets us describe a multi-dimensional profile
without collapsing it to one number, revisit this then.

No `SearchAction`/sitelinks searchbox either: there is no search endpoint yet,
and declaring one that 404s is a lie to the crawler.

---

## 4. Social sharing

Every page has an Open Graph card and a `summary_large_image` Twitter card, both
prerendered as PNG at build time and served as static assets — nothing is
generated at request time, so this costs nothing on Workers.

The game card carries: **Should I Play?** · the game title · the one-line
experience · the profile silhouette (drawn from the same
`lib/radar/geometry.ts` the page uses) · the two strongest dimensions with their
own 0–10 figures · `shouldiplay.gg`.

Naming the two highest axes describes the shape. It is not a rating, and no
total, average or "score out of" appears on the card.

This is enough for Discord, Reddit, X, Bluesky and messaging apps, which all
read Open Graph. Remaining polish (typography in the brand's own faces rather
than the bundled fallback, a per-evidence-state treatment) is not urgent and
should not be prioritised over catalogue growth.

---

## 5. Hosting

Cloudflare Workers via the OpenNext adapter. Full rationale, topology,
environment separation and the dashboard steps are in
**`docs/decisions/0008-cloudflare-hosting.md`**.

Summary: production deploys from `main` only; every other branch and PR gets a
Cloudflare preview version with a stable per-branch preview URL; the production
custom domain is `shouldiplay.gg` with `www` redirecting to the apex.

One thing to know before starting: the Worker exceeds Cloudflare's 1 MiB
free-plan size limit — measured against the real API, not estimated — so the
**Workers Paid plan ($5/month)** is required. ADR 0008 has the numbers and the
free static-export alternative that was considered and rejected.

---

## 6. Analytics

**Recommendation: Cloudflare Web Analytics, enabled after the production domain
is attached. Nothing before then, and nothing else for now.**

It answers what we currently need — organic traffic, referrers, which game pages
draw people, entry and exit pages, returning visitors — without cookies, without
a consent banner, without shipping a third-party script that slows the page, and
without handing browsing behaviour to an ad network. It is free at our scale.
When the site is served through Cloudflare it can be enabled from the dashboard
with no code change at all, which is why nothing has been added to the repo.

Google Analytics is explicitly not the default here. It is heavier, it is
ad-tech, it needs a consent banner in the EU/UK, and it does not answer a
question Cloudflare's numbers cannot.

Two things Cloudflare Web Analytics will *not* answer, both of which have a
better home elsewhere:

- **Which search queries bring people in.** That is Google Search Console and
  Bing Webmaster Tools, below — the correct tool, and free.
- **Whether a visitor continued to a second game.** Deferred deliberately.
  Revisit once the catalogue is large enough for the answer to mean anything;
  the fix then is a self-hosted event counter, not a tracking platform.

Never add: ad-tech pixels, session recording, cross-site identifiers, or
anything that needs a cookie banner.

---

## 7. Search Console / Bing — post-deployment runbook

None of this is possible before `shouldiplay.gg` serves production. Do it in
this order, once, immediately after the domain is attached.

1. **Confirm the production surface.** `https://shouldiplay.gg/robots.txt`
   returns `Allow: /` plus the sitemap line — not `Disallow: /`. If it returns
   `Disallow: /`, the build was not identified as production; fix that before
   going further, because everything downstream depends on it.
   `https://shouldiplay.gg/sitemap.xml` lists the home page, `/methodology` and
   every published game. A game page's HTML source contains its own canonical
   URL, its eight scores and no `noindex`.
2. **Google Search Console** → add a *Domain* property for `shouldiplay.gg`
   (not a URL-prefix property — a domain property covers `www`, `http` and any
   subdomain in one). Verify with the DNS TXT record it gives you, added in
   Cloudflare DNS.
3. Submit `https://shouldiplay.gg/sitemap.xml`.
4. Use **URL Inspection** on the home page and each game page; "Request
   indexing" on each. At this catalogue size, doing it by hand is faster than
   waiting for discovery.
5. **Bing Webmaster Tools** → add the site; import from Google Search Console if
   offered, which carries the verification and the sitemap across in one step.
   Otherwise verify by DNS and submit the sitemap again.
6. After ~1 week: check Search Console Coverage for anything excluded, and
   confirm no `*.workers.dev` hostname appears in any report. If one does, the
   preview `noindex` failed and it is a bug, not a nuisance.
7. After ~1 month: read the Performance report for the queries actually arriving.
   Expect long-tail "is X worth playing" / "should I play X" phrasings. Use them
   to choose which games to profile next — not to write pages targeting them.

---

## 8. Content strategy guardrail

The catalogue is the acquisition surface. Growth means **more real Game
Profiles**, not more pages.

Every indexed page must correspond to an actual evaluation produced through the
methodology and the Evidence SOP. No thin auto-generated pages, no "10 Reasons
You Should Play X in 2026", no programmatic permutation pages
("best co-op games for PS5 under 20 hours"). If editorial content is ever
wanted, that is a deliberate product decision taken on its own merits — not an
SEO tactic, and not something to drift into.

The honest version of this product ranks because a handful of pages are
genuinely the best answer to a specific question. That only survives if the
ratio of real evaluation to published page stays 1:1.
