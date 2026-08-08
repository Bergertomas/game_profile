# ADR 0011 — Production artwork comes from the game record, or not at all

**Status:** Accepted · 2026-08-07
**Context:** Design direction D3 is artwork-led and is now the public game page.
The artwork D3 was designed against is evaluation-only and uncleared
([ADR 0010](0010-design-surfaces-and-site-environment.md)).

## Decision

`lib/profile/artwork.ts` resolves key art from **the game record and nowhere
else** — `game.heroUrl` with its alt text, crop focus and credit. No fallback to
a storefront URL, no scraping, no proxy, no remote-image configuration. If the
record has no art, the page has no art.

The evaluation artwork under `lib/design-lab/` cannot reach it. There is no
import path between them, and `npm run check:containment` fails the build if a
public document ever names one of those URLs.

**No seeded game carries `heroUrl` today, so every published page currently
renders the artless composition.** That is the correct state, not a gap.

## Why the layout shipped before the artwork

These are separate decisions and were deliberately not bundled. D3's value is
its hierarchy, its measurement system and its restraint; none of that depends on
having a picture. Holding the whole presentation in the lab until a licence
exists would have left the product on the older page indefinitely for a reason
that has nothing to do with the product.

So the artless case is designed rather than tolerated:

- the stage becomes a short field carrying the game's accent as one soft wash;
- the identity block sits on the graphite band at every width — the phone
  composition, used everywhere;
- nothing reads as a missing image, because nothing is missing. There is no
  empty frame, no placeholder glyph and no reserved hole.

`data-artless="true"` on the root selects it. One attribute, two compositions.

## What this supports

1. **Licensed or approved key art** — set `heroUrl`, `heroAlt`, `heroFocus` and
   `heroCredit` on the game record. The credit renders wherever the art does.
2. **Graceful rendering without artwork** — the artless composition above.
3. **A generic fallback across hundreds of games** — the per-game accent
   (`lib/profile/accent.ts`) with a measured neutral slate for any game without
   an authored colour. Every page is identifiable without a picture.
4. **No layout collapse** — the stage has an explicit height in both states, so
   nothing reflows when art appears or disappears.

`coverUrl` is deliberately **not** used as a stand-in for a missing hero.
Cropping 3:4 box art into a 21:9 stage produces exactly the stretched,
subject-clipped banner this design exists to avoid.

## Before real game art can be enabled

1. **Decide the rights basis per publisher.** Press-kit terms, a storefront
   partner programme, or direct permission. "Publicly available" is not a
   licence.
2. **Decide where the bytes live.** Hot-linking a publisher's CDN from a
   production page is fragile and rude at scale; hosting copies needs the
   licence from step 1 to permit it.
3. **Then, and only then**, add `images.remotePatterns` or an R2 bucket. Not
   before — a remote-image pipeline built speculatively will outlive the reason
   it was built, which is the failure mode ADR 0010 already documents once.
4. Record each asset's provenance the way `docs/design/d3/ASSET-PROVENANCE.md`
   does for the evaluation set.

Until then the artless composition is the product, and it is a finished one.
