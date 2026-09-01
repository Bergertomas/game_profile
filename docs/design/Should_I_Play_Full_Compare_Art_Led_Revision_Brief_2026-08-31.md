# Should I Play? — Art-led Full Compare Revision Brief

**Date:** 31 August 2026  
**Status:** Implementation-ready brief for the second bounded Fable High pass  
**Authority:** ADR 0033; accepted A1–A6; canonical score/radar audit  
**Scope:** Revise C1/C2, add complete C3/C4 artless parity, update C-rail

## 1. Problem

The first Compare candidate is methodologically correct but visually too close
to a report. Its opening gives equal weight to many small facts, the signature
radar is subordinate to the rows, equalities and meaningful differences do not
create memorable visual events, tags are absent, and the artwork-free treatment
breaks the emotional continuity of the accepted public product.

A player choosing between two games should feel the two identities immediately,
then understand where their experiences diverge and meet without being told
that one wins.

## 2. Goals

1. Make the first two seconds feel like an encounter between two games, not a
   comparison report.
2. Establish the two titles, central trade-off and signature radar in the first
   viewport on desktop and without an introductory mobile scroll.
3. Make clear differences, close relationships and exact equalities visually
   distinctive while preserving permanent exact values and confidence.
4. Show canonical Shared/left-only/right-only experience tags without deriving
   a match percentage or preference verdict.
5. Preserve complete meaning, hierarchy and interaction when one or both
   artworks are unavailable.

## 3. Non-goals

- no winner, recommendation, match percentage, aggregate, area comparison,
  ranking, popularity or good/bad colour scale;
- no third game, swap-to-rank interaction or price comparison;
- no changed dimensions, axis order, values, confidence or scope;
- no invented tags, artwork rights, practical time or pair-specific evidence;
- no changes to A1–A6 or product rediscovery;
- no implementation of production code in this pass.

## 4. User stories

- As a player choosing between two games, I want to recognize both immediately
  so the comparison feels relevant before I inspect numbers.
- As a player with limited time, I want the clearest difference and strongest
  alignment to stand out so I can understand the trade-off quickly.
- As a player who thinks in traits rather than scores, I want to see what the
  games share and what is distinctive about each.
- As a reader who distrusts visual effects, I want exact paired values,
  confidence and scope in permanent text.
- As a keyboard, screen-reader, low-vision or text-zoom user, I want every
  relationship communicated without depending on artwork, colour, brightness,
  motion or geometry.
- As a visitor to an artless pair, I want a complete composition rather than a
  broken or visibly downgraded version.

## 5. Art-led opening composition

### Desktop C1

Create one cinematic comparison stage rather than two cards:

- Alan Wake 2 owns the left artwork field and Returnal the right, with equal
  visual area, crop importance and luminance;
- scrims protect text and form a dark central seam without hiding either work;
- the two-profile radar sits in that seam, approximately 300–360px, and appears
  connected to both images through restrained accent light, lines or particles;
- Alan Wake 2 uses its existing coral lift accent (`#EE7454`); Returnal uses its
  existing gold lift accent (`#E0B23A`); neither accent means better;
- titles, developer, full platform identities, scope and evidence status anchor
  their corresponding artwork territory with equal hierarchy;
- a concise central trade-off and the phrase **differences and trade-offs —
  never a winner** frame the radar;
- the radar includes persistent game identities, distinct line/marker styles
  and a calm fixed-scale cue; exact values remain below.

The stage should feel atmospheric and editorial, not like an esports matchup,
fight poster, betting board or winner screen. Avoid a literal `VS` as the main
symbol, aggressive diagonal slashes, trophy language and red-versus-blue
combat coding.

### Mobile C2

- Use a compact side-by-side artwork diptych in the opening rather than
  stacking two tall heroes.
- Center a compact decorative radar over the seam, with game marker legend and
  accessible adjacent summary; radial labels may be omitted at this size.
- Keep both titles and the central trade-off visible before introductory scroll
  at 390×667.
- Preserve a useful crop at narrower widths and 200% text zoom; text may move
  below the art while the image pair remains balanced.

## 6. Relationship storytelling

Immediately after the opening, create a visually strong relationship summary:

1. **Largest clear difference — Agency & Satisfaction:** Alan Wake 2 7.5
   (High) versus Returnal 10.0 (High).
2. **Exact alignment — Medium-Specific Craft:** 10.0 (High) versus 10.0
   (High).
3. **Material reading caveat:** Alan Wake 2 Execution 9.0 (Medium) versus
   Returnal 9.5 (High), plus Returnal's Medium Story/Thematic confidence.

These should not be three identical cards. Give each relation a truthful visual
grammar:

- **Clear difference:** separated accent endpoints and a long labelled bridge;
- **Close:** nearby endpoints and a short labelled bridge;
- **Equal:** converged or stacked markers at a bright neutral midpoint with an
  explicit **Equal** label;
- **Indeterminate:** no connector; state Range/Unknown in text.

Use scale, spacing, brightness, connector length and texture for emphasis, but
retain exact values, game names, confidence and relation words. Shared/equal
may use luminous bone or cyan as a neutral meeting state; it must not read as a
success badge. Never use red/green pass/fail semantics.

The authoritative eight-row instrument remains in canonical order. Increase
the prominence of values and relation labels, reduce report-like boxes and let
the visual relation grammar carry through every row. Each row's nonvisual order
is game name → value/range/Unknown → confidence.

## 7. Canonical tag comparison

Show the controlled public tags in three explicit groups. Use friendly public
labels and retain intensity where present.

### Shared

- Environmental storytelling
- Exploration-heavy
- Horror
- Sustained tension · High
- Melancholy
- Resource pressure · Medium

### Alan Wake 2 only

- Hub-based
- Story-heavy
- Cutscene-heavy
- Reading-dense
- Puzzle-heavy
- Performance-sensitive · PC note

### Returnal only

- Run-based
- Systemic
- Combat-heavy
- Buildcraft-heavy
- Run reset
- High punishment
- Difficult checkpointing
- Repetition · High
- Lore-heavy

Present Shared tags in the meeting field and unique tags inside their game's
accent territory. Use heading, placement, border/pattern and accessible group
labels as well as colour. Do not use checks/crosses, “match”, compatibility or
a computed overlap count.

## 8. Artless parity

Add complete specimens:

- C3 — artless desktop Compare;
- C4 — artless mobile Compare.

Replace the image fields with equally authored typographic/accent territories
using title, developer, game accent, fingerprint fragments and texture. Keep
the central radar, relationship summary, tag map, exact instrument, scope and
actions. Reserve no empty image rectangles and display no fallback apology.

## 9. Truth and accessibility requirements

- Use only the canonical values, confidence, scope and tags in this brief and
  the first Compare brief.
- Artwork in the Fable artifact is private design-only placement; reuse the
  existing Alan Wake 2 and Returnal promotional assets already in the project.
- Production requires the complete seven-step lawful-artwork path and
  production clearance for both images.
- If only one game has cleared art, use a deliberately asymmetric mixed-art
  state that does not imply importance or quality; specify it in C-rail.
- Exact paired values and confidence are permanent text on desktop/mobile.
- Radar, art, colour, brightness, line length and position are never the only
  carrier of meaning.
- All text meets contrast requirements over art; use persistent scrims.
- Controls are at least 44px, keyboard order follows source order, disclosures
  expose `aria-expanded`/`aria-controls`, and replacement returns focus.
- Support reduced motion; no comprehension depends on animation.

## 10. Accepted URL/index policy

ADR 0033 is no longer a recommendation:

- `/compare?games=alan-wake-2,returnal` preserves visible left/right order;
- parameterized pair states are `noindex, follow`, absent from sitemap and
  rating/review schema;
- internal unordered normalization cannot reorder the display;
- no all-pair prerender requirement.

The design labels this **accepted handoff policy, not shipped production
truth**.

## 11. P0 acceptance criteria

- [ ] C1/C2 feel materially more alluring and emotionally continuous with
      accepted A1–A6.
- [ ] Two equal artworks and the central radar dominate the art-led opening.
- [ ] Both mobile identities and the trade-off remain available before an
      introductory scroll.
- [ ] Largest difference, exact alignment and material caveat are visually
      distinct rather than three generic cards.
- [ ] All eight exact rows remain permanent, fixed-order and accessible.
- [ ] Shared and unique tag groups use only canonical tags.
- [ ] Colour/brightness reinforce text, shape, pattern and group labels.
- [ ] C3/C4 are complete artless parity compositions.
- [ ] One-art/mixed-clearance state is specified without hierarchy distortion.
- [ ] No winner, aggregate, match percentage, normalization or fabricated
      practical time appears.
- [ ] Accepted URL/index behavior is represented accurately.
- [ ] A1–A6 remain unchanged.

