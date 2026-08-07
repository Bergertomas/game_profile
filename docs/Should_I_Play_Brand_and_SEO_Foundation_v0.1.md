# Should I Play? — Brand & SEO Foundation v0.1
**Date:** 2026-08-06
**Status:** Working brand/domain locked for implementation

## Brand

- Public brand: **Should I Play?**
- Registered production domain: **shouldiplay.gg**
- Product-internal term: **Game Profile** remains useful for the standardized eight-dimension evaluation itself.
- Current supporting line: **Know the game before you play it.**

The brand is deliberately framed around the user's purchase/play decision rather than the analytical mechanism. The site should answer the natural consumer question “Should I play this?” while the Game Profile is the evidence structure used to help the player decide.

## SEO / discoverability principle

Every published game must be a durable, indexable public page at a stable URL:

`https://shouldiplay.gg/games/<game-slug>`

Game pages should be rendered as normal crawlable HTML and must not depend on client-only rendering for their primary text/content.

### Page-title pattern

Use search-intent language around the actual question where natural. Preferred target pattern:

`Should I Play <Game Title>? | Should I Play?`

The title should remain human-readable; do not keyword-stuff alternate queries.

### Required technical foundation

- canonical production base URL is `https://shouldiplay.gg`
- dynamic XML sitemap containing every published game profile
- `robots.txt` allowing public crawling and pointing at the sitemap
- canonical URL per game page
- unique title and description per game
- Open Graph metadata for sharing
- Twitter/X card metadata
- semantic server-rendered page content
- mobile performance and accessibility preserved

### Later additions

- per-game social/share image generation
- structured data where it accurately describes the editorial product (do not misuse review/rating schema to imply an overall rating that does not exist)
- Google Search Console verification after production deployment
- Bing Webmaster Tools verification after production deployment
- analytics from launch so acquisition source, landing page and downstream game searches can be measured

## Content/acquisition strategy

The game database itself is the long-term organic acquisition surface. Each high-quality profile should answer real player questions such as whether a game suits someone who values story, combat, pacing, exploration, atmosphere, or low friction.

Do **not** generate thin SEO articles merely to manufacture search inventory. Prefer one strong canonical game profile with real evaluation/evidence.

Early acquisition should come from useful profile sharing and gaming-community discussion, especially around current releases. The profile/radar should eventually generate a visually distinctive share card that links back to the canonical game page.

## Hosting / domain separation

The domain is registered independently at Porkbun. Hosting/DNS may use Cloudflare or another platform without moving the registration. Registrar, DNS provider and application host are separate concerns.

## Immediate implementation in this branch

- rebrand top-level site chrome to Should I Play?
- set `metadataBase` to `https://shouldiplay.gg`
- add global Open Graph/Twitter metadata
- add `/robots.txt` metadata route
- add `/sitemap.xml` metadata route populated from published game slugs
- keep `/games/<slug>` as the canonical game-page URL architecture

## Guardrail

The product still has **no overall score**. SEO copy, structured metadata and share cards must never invent or imply a single aggregate rating merely because search engines have schemas that make one convenient.
