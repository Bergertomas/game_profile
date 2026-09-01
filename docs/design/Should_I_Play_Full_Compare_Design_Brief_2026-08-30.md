# Should I Play? — Full Compare Design Brief

**Date:** 30 August 2026  
**Status:** Superseded for visual/art direction by the 31 August art-led revision brief; canonical specimen data, methodology and accessibility requirements remain evidence  
**Public product:** Should I Play?  
**Method:** Game Profile  
**Authority:** Master Plan v0.9; ADRs 0025, 0027, 0030–0032; accepted A1–A6;
the score/radar audit. This brief does not change scores, scope or methodology.

The [art-led revision brief](Should_I_Play_Full_Compare_Art_Led_Revision_Brief_2026-08-31.md)
and ADR 0033 supersede this first pass's artwork-free and open-URL assumptions.

## 1. Problem

A reader deciding between two games needs to see meaningful differences quickly
without being told which game is universally better. The current product has
authoritative profile rows and a Compare contract, but no accepted full desktop
or mobile experience. A generic side-by-side report would bury the decision;
an overlaid radar alone would hide exact values, confidence and uncertainty.

## 2. Goals

1. Make the most decision-relevant contrasts legible before methodological
   detail, without declaring a winner.
2. Preserve both profiles' exact eight values, fixed order, scope and evidence
   state in an accessible representation independent of shape or colour.
3. Keep the radar as a recognisable signature overview only when it helps.
4. Produce one coherent artwork-free desktop/mobile direction compatible with
   accepted A1–A6.
5. Expose enough interaction and URL-state behavior for an implementation
   handoff and a bounded URL/index ADR.

## 3. Non-goals

- no three- or four-game Compare;
- no winner, recommendation, match percentage, aggregate, area comparison,
  ranking, popularity or price-comparison layer;
- no artwork inside the full Compare experience;
- no new dimension, reordered axis, catalog-relative normalization or score
  adjustment for visual drama;
- no runtime AI prose, exhaustive manually authored pair copy or account state;
- no Search, homepage or profile redesign;
- no commitment-time values unless an approved source record exists.

## 4. Priority user stories

- As a player choosing between two games, I want the largest meaningful
  differences first so I can understand the trade-off quickly.
- As a reader who distrusts a chart, I want aligned exact values and confidence
  for all eight dimensions so I can verify the comparison.
- As a keyboard, screen-reader or text-zoom user, I want the same comparison and
  explanations without relying on hover, colour or polygon geometry.
- As a player comparing different platforms or scopes, I want material scope
  and platform caveats attached to the affected game or dimension.
- As a player who picked the wrong title, I want to replace either side without
  losing the other selection.
- As a reader opening a shared comparison, I want both games and their order to
  restore deterministically.

## 5. Canonical design specimen

Use **Alan Wake 2** and **Returnal**. They are both published, verified profiles
with real differences but no obvious universal winner. Do not use Fable example
values.

Fixed public order:

| Dimension | Alan Wake 2 | Confidence | Returnal | Confidence | Relationship |
|---|---:|---|---:|---|---|
| Story & Character Investment | 9.5 | High | 7.5 | Medium | Alan Wake 2 higher; Returnal has credible interpretive disagreement |
| Thematic & Emotional Impact | 9.5 | High | 8.5 | Medium | Alan Wake 2 higher; asymmetric confidence matters |
| Atmosphere & World Pull | 10 | High | 9.5 | High | Close |
| Medium-Specific Craft | 10 | High | 10 | High | Equal |
| Agency & Satisfaction | 7.5 | High | 10 | High | Returnal higher; largest contrast |
| Execution & Polish | 9 | Medium | 9.5 | High | Close; Alan Wake 2 has material platform variation |
| Structure & Focus | 8.5 | High | 8.5 | High | Equal |
| Pacing & Time Respect | 8 | High | 7.5 | High | Close; do not confuse with session convenience |

Exact scopes:

- **Alan Wake 2:** Base game; single-player campaign; PlayStation 5, Xbox Series
  X|S and PC; current retail build with post-launch updates. Night Springs and
  The Lake House are excluded. PC performance varies materially with graphics
  settings; console is the stable reference.
- **Returnal:** Base game; single-player main-game campaign; PlayStation 5 and
  PC; current retail build including suspend-cycle and Ascension updates. Co-op
  and Tower of Sisyphus are excluded.

Show full platform names with accessible official-style marks where lawful;
never expose `XSX`. Practical commitment/session fields are **Unknown or
omitted** in this pass because no approved production source record exists.

## 6. Required information hierarchy

### Desktop

1. Should I Play? chrome and the exact **Compare** journey label.
2. Two balanced game selectors with title, scope, platform identities and
   evidence status; neither side is visually privileged.
3. A concise authored comparison sentence describing the central trade-off,
   not a verdict: authored mechanics/mastery versus authored narrative/world
   pull is a suitable specimen, subject to editorial review.
4. A small set of deterministic contrast callouts: largest clear difference,
   meaningful alignment and material confidence/scope caveat.
5. Signature two-profile radar overview with persistent identities and a
   one-time “larger is not better” explanation.
6. Authoritative eight-row paired instrument in fixed public order.
7. Per-row disclosure for each dimension's question, relevant rationale and
   confidence/scope caveats.
8. Practical commitment and official destinations only when truthful records
   exist; otherwise omit the band rather than fabricating it.
9. Replace-game actions and a stable share/copy-link action.

### Mobile

1. Title and both selected games/scopes before analytical depth.
2. Central trade-off and deterministic contrast callouts.
3. Compact radar overview only if it remains legible at 390px and text zoom.
4. One vertical eight-row paired instrument; do not create a horizontally
   scrolling desktop table.
5. Disclosure content appears in DOM/source order immediately after its row.
6. Replace/share controls remain reachable without sticky UI obscuring content.

## 7. Visualization contract

The radar is a signature overview, not the precise comparison.

- Keep canonical axis order and fixed 0–10 geometry.
- Use two labelled polygons with more than colour alone: distinct line/marker
  treatment plus a persistent legend.
- Never compute or describe total area.
- Unknown is not plotted as zero; a range is not reduced to its midpoint.
- Explain once that more is not universally better.

The authoritative layer is a paired dot/dumbbell or equivalent aligned-value
instrument:

- all eight rows remain visible in fixed order;
- each side shows exact value/range/Unknown and confidence;
- equal, close, disjoint and indeterminate relations are structurally distinct;
- a dumbbell connector appears only when the relation is truthful; it must not
  imply that rightward or larger is universally preferable;
- game identity uses labels and marker shape in addition to colour;
- the text order remains meaningful without CSS or SVG.

## 8. States the pass must resolve

- exact versus exact, including equal and close values;
- asymmetric dimension confidence;
- one provisional overall profile;
- one side Unknown;
- one side a range whose interval overlaps the other;
- different scope/build/platform warnings;
- unavailable or unpublished selection;
- same game selected twice;
- one side removed/replaced;
- narrow mobile and 200% text zoom;
- reduced motion, keyboard-only and screen-reader reading order.

Use component-labelled state specimens for range/Unknown rather than attributing
unsupported states to Alan Wake 2 or Returnal. Redfall may appear only in the
state rail to demonstrate a truthful provisional profile, using its canonical
published values and evidence state.

## 9. URL and indexing decision to close with the pass

Working recommendation for review:

- shareable state uses `/compare?games=alan-wake-2,returnal`;
- left/right selection order is preserved in the UI and share URL; engineering
  may normalize unordered pair identity internally for caching/deduplication
  only when that does not reorder the displayed sides;
- pair-state URLs are `noindex, follow`, excluded from sitemap and carry no
  rating/review structured data;
- `/compare` is the indexable journey page only if it contains substantive
  standalone guidance;
- no all-pair prerender requirement; the static client restores valid published
  profiles from the build corpus and handles stale/invalid keys honestly.

Why: an approximately-100-profile catalog creates 4,950 unordered pairs. Most
would be generated combinations rather than independently authored pages. A
shareable noindex state preserves user value without manufacturing an SEO
surface. This is a recommendation, not a locked ADR until the dedicated pass is
reviewed.

## 10. P0 acceptance criteria

- [ ] Exactly two games; no third slot or multi-select affordance.
- [ ] No artwork in the full Compare screens.
- [ ] Neither side is called better, recommended, leading or winning.
- [ ] All eight canonical values appear exactly and in fixed public order.
- [ ] Confidence, range, Unknown, provisional and scope/platform caveats have
      non-colour representations.
- [ ] The radar is not the only exact or accessible representation.
- [ ] The largest difference, a meaningful alignment and a material caveat are
      legible before the full instrument.
- [ ] Equal and near-equal rows do not fabricate contrast.
- [ ] Practical-time specimens are absent; production value, Unknown or
      omission is supported.
- [ ] Desktop and 390px mobile are complete, with narrower/text-zoom notes.
- [ ] Keyboard order follows source order; disclosures expose
      `aria-expanded`/`aria-controls`; focus returns after replacement dialogs.
- [ ] Every paired value group identifies game, exact value/range/Unknown and
      confidence in meaningful nonvisual source order.
- [ ] Replace-left, replace-right, swap/order and copy-link behavior are
      specified without losing valid state.
- [ ] URL/index recommendation is visible in handoff notes for owner/ADR review.
- [ ] A1–A6 remain unchanged.

## 11. Success evidence

Before implementation approval, a fresh reviewer should be able to answer
within the first viewport:

1. which two scoped experiences are being compared;
2. the central trade-off without mistaking it for a winner;
3. the largest meaningful difference;
4. where confidence or platform scope changes interpretation.

Conformance later verifies exact values, keyboard/source order, mobile overflow,
text zoom, URL restoration and the absence of aggregate/winner language.
