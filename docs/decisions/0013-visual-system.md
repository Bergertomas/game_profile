# ADR 0013 — One Should I Play? visual system

**Status:** Accepted · 2026-08-09
**Context:** [ADR 0010](0010-design-surfaces-and-site-environment.md) made design
work reviewable. [ADR 0011](0011-production-artwork.md) modelled artwork as game
metadata. D3 became the canonical game page (PR #12). What remained was that the
*product* had never been art-directed — only one page of it had.

## The problem

Three design systems, in one site:

| surface | type | ground | accent | instrument |
|---|---|---|---|---|
| header / footer | Fraunces + Inter | ink `#08090b` | brass | — |
| homepage | Fraunces + Inter | ink | brass | `MiniRadar` |
| game profile | Archivo + Newsreader | paper + graphite | per-game | profile instrument |

Two typefaces too many, two grounds too many, and two independently written
radars that disagreed about what an unknown axis looks like. Clicking from the
homepage into a game profile was a visit to a different website.

And a second problem, less visible and more important: **D3 was excellent and
slightly joyless.** It read as an analytical document about a videogame. The
methodology is rigorous and the product should say so — but through clarity,
consistency, evidence and hierarchy, not through looking solemn. Rigour and
visual heaviness are not the same thing, and only one of them is worth having.

## The decision

### The site is the frame; the games are the colour

The governing rule, and the one every other decision falls out of.

Every game arrives with a visual identity louder than anything a site could put
over it — Alan Wake 2, Returnal, a colourful platformer and a medieval RPG share
nothing. So the chrome is **achromatic**: graphite and bone, with one amber
question mark. All colour on any page comes from the game — its artwork, and its
accent (`lib/profile/accent.ts`).

The payoff is at catalogue scale. A shelf of thirty cards is polychrome by
construction, because each card carries its own game's accent, and it stays that
way at three hundred games without anybody choosing a palette. It also holds
when there is no artwork at all: the artless cards on production today are three
different coloured typographic sleeves, not three grey rectangles.

### Typography: Archivo and Newsreader, everywhere

Fraunces and Inter are gone, files included. Two typographic systems in one
product was the bug, not a hedge.

| role | face | where |
|---|---|---|
| `sip-display` | Archivo 72% width, 700, uppercase | game titles, headings, the wordmark |
| `sip-label` | Archivo 100%, 600, uppercase, 12px floor | axis names, field keys, metadata |
| `sip-num` | Archivo, tabular | every number in the product |
| `sip-prose` | Newsreader | anything meant to be read rather than scanned |

Newsreader is **rationed on the profile page** (experience summary, expanded
rationale) and **allowed to run on the homepage and methodology**, which are
prose. That asymmetry is the point: the instrument should read as an instrument,
and the writing around it should read as writing.

### Colour: two grounds, one signal

Warm paper `#f1f1ee` for reading and browsing; graphite `#191b1f` for chrome and
for the measurement field. A page is bracketed by graphite and filled with
paper. The old ink/bone/brass palette is gone.

`--color-signal` (amber `#e2a33f`) is the one brand colour, and it has one job:
the question mark, and affordances in the chrome. It measures 7.84:1 on graphite
and 1.94:1 on paper, so `tests/accessibility-tokens.test.ts` asserts **both** —
the second assertion is what stops somebody reaching for it on the light side
because it looked right in a mock-up.

No colour anywhere encodes a value. The per-game accent marks a 4.0 exactly as
it marks a 10.0.

### Shape: ruled, not boxed

Hairlines separate; containers do not enclose. No rounded cards, no glassmorphic
panels, no gradient hero, no bordered box per section, and no radius above 0
anywhere in the product. Image crops are hard — `object-fit: cover` with a
per-image focus, never a blur or a filter.

### Motion: a nod, not an effect

220ms, three places, all of them a response to the pointer rather than
decoration: the card lifts 3px, its cover pushes 1.5%, the wordmark's question
mark tips. Each reinforces a state that is also expressed structurally, so
`prefers-reduced-motion` removes all of it at no cost.

### One instrument, three sizes

`components/profile/radar.tsx` is the only radar in the product. `MiniRadar` is
deleted. The card carries the same polygon, the same fixed axis order and the
same treatment of an unknown axis at ~100px with the text stripped (`MARK` in
`radar-layout.ts`), which makes it a *mark* rather than a second chart.

The radar is deliberately **small and last** on a card. It is this product's
signature device, and a signature repeated at full volume on every tile stops
being one.

Where the mark carries no text, the surface around it is obliged to state the
values — the card names its strongest and weakest dimension with exact figures.
Nothing in this product is ever communicated by shape or colour alone.

### The card reads as a game first

1. the cover · 2. the title · 3. one sentence on what playing it is like ·
4. the profile signal

Not the other way round. A grid of thirty of these has to look like a catalogue
somebody curated, not a dashboard of thirty small reports. `hero` is never
substituted for a missing `cover`: letterboxing 21:9 art into a 2:3 frame is the
same mistake as cropping box art into a stage, turned ninety degrees.

The coverless card is a **typographic sleeve** — accent field, spine, title set
large — and it is a design rather than a fallback. It has to be: it is the only
card production renders today, and at catalogue scale some share of the shelf
will always be in that state.

### The homepage is a library entrance

Proposition → **games** → what a Game Profile is. Methodology is why the product
is worth trusting; it is not why anyone arrives. Curiosity should pull a visitor
into the rigour rather than the reverse. The explainer that follows the shelf
uses a real profile with its real numbers, because an abstract diagram of a
scoring system is a consultancy slide.

### The game page was aligned, not redesigned

D3 is the anchor and its structure is untouched: game first at full width,
graphite field attached to the artwork's lower edge, radar and score rows as one
instrument, no overall score, unknown is not zero, exact values without hover,
trust material placed at the foot rather than salted through the page.

What changed: it draws its palette and typefaces from the site's tokens instead
of defining its own, its stylesheet moved next to the component that needs it
(`components/profile/profile.css`), and the page now ends on **more games**
rather than on a provenance table. That last one is the whole tonal correction
in miniature — the evidence did not move, the exit did.

## What was retired

`MiniRadar`, `ProfilePanel`, `ProfileRadar`, `ScoreRows`, `ProfileBlocks`,
`TrustLine`, `EvidenceStrip`, `fraunces-latin.woff2`, `inter-latin.woff2`, and
the `ink` / `bone` / `brass` / `line` token families. `/dev/radar-states` now
renders the canonical components instead of a parallel panel — the one surface
built to prove the uncertainty states had been the one surface not showing the
code that ships them.

The design lab under `/design-lab` is kept. It is 404 on production, contributes
nothing to the product surface, and the historical directions are the record of
how D3 was arrived at. Retiring it is a separate decision from this one.

## What did not change

Every product semantic ADRs 0003–0009 encode. No aggregate score in any form, no
hidden derivation, no score expressed only as colour, exact values without hover
or click, range visibly distinct from precise, unknown never drawn as zero,
fixed axis order, substantive content in server-rendered HTML, preview
non-indexability, production canonical correctness, and no evaluation-clearance
artwork on production.

Asserted by 220 unit tests, 47 e2e tests, `cf:verify` against workerd in both
environments, and `check:containment` against the built artefact.

## Consequences

- The visual foundation is **frozen** at four surfaces: chrome, homepage, game
  card, game profile. Search, Discover, Compare and account surfaces get the
  card grammar when they are built; they do not get new grammar invented ahead
  of them.
- `GameCard` is the reusable unit. It takes a `ProfileView` and nothing else, so
  any future list of games renders by mapping over it.
- Two fewer font files ship (~115KB), and the homepage no longer loads a second
  radar implementation.
