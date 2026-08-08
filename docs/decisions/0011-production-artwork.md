# ADR 0011 — Production artwork comes from the game record, or not at all

**Status:** Accepted · 2026-08-07
**Context:** Design direction D3 is artwork-led and is now the public game page.
The artwork D3 was designed against is evaluation-only and uncleared
([ADR 0010](0010-design-surfaces-and-site-environment.md)).

## Decision

**Artwork is game metadata, not curation.** At a few hundred games and growing,
hand-picking every image is not a workflow, so the model assumes a provider
supplies art automatically and a human intervenes only when one image is wrong.

```
game
 └── artwork
      ├── cover      portrait — cards, listings, comparison
      ├── hero       landscape — the profile stage
      ├── source     manual | rawg | mobygames | press-kit
      ├── externalId the provider's own id, so a record can be refreshed
      └── rights     licensed | evaluation
```

Both image roles are modelled now even though only `hero` is used, because
retrofitting a second role into forty call sites is the mistake worth avoiding
once. A cover is never substituted for a missing hero — cropping 3:4 box art
into a 21:9 stage produces the stretched, subject-clipped banner this design
exists to avoid.

Resolution is `game.artwork` first, then a review-only overlay. The game's own
record always wins, which is the manual-override path: bad alternate-edition art
for one game is corrected on that game without touching the sourcing system.

Nothing in the product knows which provider supplied an image. The page asks for
a hero, gets one or does not, and composes either way.

### Rights are data, and they decide where an image may render

| basis | renders |
|---|---|
| `licensed` | everywhere, production included |
| `evaluation` | local dev and Cloudflare previews only, never production |

A game moves from uncleared to cleared by changing one field. No code change,
and no window in which the uncleared image could reach production.

Wherever `evaluation`-basis art renders, the page states the basis — the notice
travels with the image rather than living only in this document.

### On choosing a provider

RAWG is the obvious first candidate on coverage and fit. It also carries a
licensing inconsistency worth naming: its pricing page describes the free tier
as non-commercial while its API terms permit commercial use below a usage
threshold. Those cannot both be true, and the risk is not the ambiguity itself
but building around it.

Which is exactly why the abstraction above exists. `source` is a free-form
string and no rendering code branches on it, so switching providers — or running
two — is a data change. **Do not let the production architecture become
dependent on any single supplier's terms staying as they are today.**

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

### Why evaluation artwork is not on the game records

It belongs there conceptually, and licensed art will live there. Uncleared art
cannot, for a mechanical reason: a game fixture is reachable from every
production page, so nothing inside it can be dead-code-eliminated. An uncleared
URL placed there ships in the production bundle — unrendered, but present.
`check:containment` caught exactly that, on the first build after trying it.

So `content/evaluation-artwork.ts` holds the overlay behind an inline literal the
bundler folds, and production output contains no uncleared URL at all. The
overlay is temporary: when real art arrives it goes on the game record, the
overlay entry is deleted, and nothing that renders it changes.

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
