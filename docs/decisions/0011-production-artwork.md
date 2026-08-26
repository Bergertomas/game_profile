# ADR 0011 — Production artwork comes from the game record, or not at all

**Status:** Accepted · 2026-08-07 · **Extended into the schema, 2026-08-13 ·
Amended for editorial fair use, 2026-08-26**
**Context:** Design direction D3 is artwork-led and is now the public game page.
The artwork D3 was designed against is evaluation-only and uncleared
([ADR 0010](0010-design-surfaces-and-site-environment.md)).

## Decision

**Artwork is rights-aware game metadata, not an untracked layout choice.** At a
few hundred games and growing, a provider or research pass may propose
candidates, but no automated path production-clears an image. The editor
approves the source, basis, role and final visual selection on the game record.

```
game
 └── artwork
      ├── cover      portrait — cards and listings (Compare stays artless)
      ├── hero       landscape — the profile stage
      ├── source     manual | rawg | mobygames | press-kit
      ├── externalId the provider's own id, so a record can be refreshed
      ├── clearance  production | evaluation   ← decides where it may render
      └── basis      licence | provider-terms | press-kit | permission |
                     internal-evaluation      ← recorded, never rendered on
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

### Clearance is data, and it decides where an image may render

The rendering layer is not copyright counsel, so it does not model rights. It
models the one question it actually has to answer:

> May this asset appear on the public production site?

| `clearance` | renders |
|---|---|
| `production` | everywhere, production included |
| `evaluation` | local dev and Cloudflare previews only, never production |

A game moves from uncleared to cleared by changing one field. No code change,
and no window in which the uncleared image could reach production.

**`clearance` deliberately replaced an earlier `rights: licensed | evaluation`.**
"Licensed" is a claim about a legal instrument, and the application is in no
position to make it on a publisher's behalf — a press-kit grant, a provider's
API terms and direct written permission are all legitimate production bases and
none of them is a licence. Naming the field after the permission it actually
governs keeps the product from asserting more than it knows.

*Why* an asset is held is recorded separately in `basis`, which is descriptive,
required on every record, and read by no rendering code. One consistency rule is
enforced (`assertClearedBasis`): an asset held on an `internal-evaluation` basis
cannot also be cleared for production. Every other combination is a human
judgement this code does not police.

Wherever `evaluation`-clearance art renders, the page says so — the notice
travels with the image rather than living only in this document. Production
artwork gets a plain `Key art © …` credit and no claim about terms.

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

**No seeded game carries an `artwork` record today, so every published page and
every card currently renders its artless composition.** That is the correct
state, not a gap. `npm run check:containment` fails a production build if an
uncleared URL reaches deployable output at all.

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

1. **Cleared key art** — set `artwork` on the game record with
   `clearance: "production"` and the `basis` it is held on. The credit renders
   wherever the art does.
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

1. **Decide the basis per publisher.** Press-kit terms, a provider's API terms,
   a storefront partner programme, or direct permission. "Publicly available" is
   not a basis. Record the answer in `basis`; flip `clearance` only once it is
   settled.
2. **Decide where the bytes live.** Hot-linking a publisher's CDN from a
   production page is fragile and rude at scale; hosting copies needs the
   licence from step 1 to permit it.
3. **Then, and only then**, add `images.remotePatterns` or an R2 bucket. Not
   before — a remote-image pipeline built speculatively will outlive the reason
   it was built, which is the failure mode ADR 0010 already documents once.
4. Record each asset's provenance the way `docs/design/d3/ASSET-PROVENANCE.md`
   does for the evaluation set.

Until then the artless composition is the product, and it is a finished one.

## Extension — the database, 2026-08-13

This ADR described the application model. The database did not implement it:
`games` held plain `cover_url` and `hero_url` columns, which record that an
image is *reachable* and nothing about whether it may be shown. That is the
failure this document exists to prevent, sitting in the schema — and the schema
is the layer an import, a migration or a future editor writes to, none of which
pass through `lib/profile/artwork.ts`.

`game_artwork` replaces those columns and carries the model above verbatim: one
row per (game, role), with `source`, `external_id`, `clearance`, `basis`,
`credit`, `source_page` and `retrieved_at`. Enforced there rather than assumed:

- production clearance cannot rest on an `internal-evaluation` basis —
  the database half of `assertClearedBasis`;
- production artwork must name who to credit and where it came from, because a
  production rights position is a decision somebody took and has to be auditable;
- URLs are absolute `https`, and intrinsic dimensions are positive — which is
  how a surface reserves space before the image loads, and a zero would collapse
  the layout the artless composition holds open.

Validation now also refuses evaluation-clearance artwork on a **game fixture**,
for the mechanical reason stated above: a fixture is reachable from every
production page, so an uncleared URL there ships in the bundle unrendered but
present. That was a comment in this document and in the overlay; it is a rule
enforced where art would first enter the corpus, rather than only where a build
is later scanned.

Nothing about containment weakens. No seeded game carries artwork, the overlay
stays behind its folded literal, `check:containment` still passes against the
built production artefact, and production still renders the artless composition.

## Amendment — editorial-fair-use basis, accepted 2026-08-26

Editorial fair use is an approved independent basis for appropriate official
publisher/developer promotional artwork used to identify, navigate to, or
directly illustrate substantive evaluation and criticism. Provider terms,
press-kit permission, a licence or direct permission remain preferred when
convenient because they reduce operational risk, but the absence of those
channels does not automatically force an otherwise appropriate editorial use
into the artless state.

Public availability on Steam or another storefront does not itself establish
the basis. It is a use-specific editorial judgment, not a source-site flag. The
approved posture does not cover:

- large decorative imagery without direct editorial/navigation context;
- standalone galleries or original-resolution distribution;
- fan/community/user-uploaded artwork without permission;
- paid advertising creative; or
- any artwork in Compare, which remains intentionally artless.

The `artwork_basis` contract now includes `editorial-fair-use`. As with every
basis other than `internal-evaluation`, code records the accountable human
decision but does not pretend to provide per-asset legal clearance. Tomas alone
may approve production clearance; automated import cannot.

No asset may be marked `production` on editorial-fair-use grounds until the
operating gate has:

1. obtained a one-time, jurisdiction-aware legal review of the intended uses,
   including profile heroes, catalog/search cards, homepage editorial links,
   crops, resolution, attribution, storage and takedown handling;
2. landed the forward enum migration and corresponding application type,
   validation, admin/import, fixture and regression-test changes;
3. documented the eligible source/placement rules, required credit and source
   page, web-appropriate resolution, prohibition on standalone downloads and
   user-uploaded art, and the rights-holder removal channel; and
4. retained the artless fallback and existing containment rules for every asset
   that does not meet the approved policy.

The fair-use policy is therefore **approved but operationally gated**. The
artless fallback, production/evaluation containment, auditable credit/source
page requirements and prompt takedown posture remain unchanged. This amendment
is a product and operating decision, not legal advice or a blanket clearance.
