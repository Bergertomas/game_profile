# Should I Play? — Accessibility and Visual-Conformance Matrix v1.0

**Date:** 31 August 2026  
**Target:** WCAG 2.1 AA and faithful implementation of accepted A1–A6/C1–C4  
**Companion:**
[`Should_I_Play_Shared_Design_System_and_Interaction_Handoff_v1.0_2026-08-31.md`](Should_I_Play_Shared_Design_System_and_Interaction_Handoff_v1.0_2026-08-31.md)

## 1. Test envelope

Run every relevant public surface at:

| Mode | Required references |
|---|---|
| Desktop visual | 1440×900 and full-page capture |
| Mobile visual | 390×844 and full-page capture |
| Short mobile opening | 390×667 |
| Minimum supported width | 320×568 |
| Zoom/reflow | 200% browser text zoom at 1280px and 390px viewport baselines |
| Keyboard | Chromium and Firefox current stable |
| Screen reader | VoiceOver/Safari on macOS or iOS; one Chromium + NVDA pass before release |
| Motion | normal and `prefers-reduced-motion: reduce` |
| Contrast | computed colours for default, hover, focus, active, selected, disabled and error |
| Content stress | long title/platform/copy, Range, Unknown, Low confidence, Provisional and absent optional facts |
| Artwork stress | both, one, none, slow and failed artwork |

Automated checks are a floor, not acceptance. Run axe or equivalent on each
state, then complete keyboard, screen-reader, zoom and visual inspection.

## 2. Cross-surface acceptance

| ID | Requirement | Acceptance evidence | WCAG 2.1 |
|---|---|---|---|
| X-01 | Page has one logical `h1`; headings do not skip to imitate size | accessibility tree/DOM inspection | 1.3.1, 2.4.6 |
| X-02 | Header, main, navigation and footer landmarks are named where repeated | accessibility tree | 1.3.1, 2.4.1 |
| X-03 | All text reaches AA contrast; large-text exceptions are applied only to genuinely large text | computed contrast report | 1.4.3 |
| X-04 | Controls, focus indicators, chart markers needed for meaning and selected states reach 3:1 against adjacent colours | computed contrast report | 1.4.11 |
| X-05 | No meaningful visible text is below 12px | computed-style audit at all references | 1.4.4 |
| X-06 | 200% text zoom preserves all content/function; 320px reflows without page-level horizontal scrolling | capture and interaction run | 1.4.4, 1.4.10 |
| X-07 | Text spacing override causes no clipping or loss | bookmarklet/style override capture | 1.4.12 |
| X-08 | All functions work with keyboard alone and visible focus | full keyboard trace | 2.1.1, 2.4.7 |
| X-09 | No modal or expanded state traps focus; modal focus is intentionally contained and returns to invoker | keyboard trace | 2.1.2, 2.4.3 |
| X-10 | Pointer targets are at least 44×44 CSS px; adjacent targets do not overlap | geometry inspection | project AA enhancement |
| X-11 | Colour, brightness, position, artwork and animation are never the sole carrier of meaning | grayscale/non-CSS/accessibility-tree inspection | 1.3.3, 1.4.1 |
| X-12 | Focus order follows the semantic reading order despite visual layout | DOM/focus trace | 1.3.2, 2.4.3 |
| X-13 | Loading, empty, error, unavailable and Unknown are distinguishable and retain recovery/context | state captures and SR output | 3.3.1, 4.1.3 |
| X-14 | Reduced motion removes atmospheric/parallax/chart-drawing effects without hiding state change | reduced-motion capture | 2.3.3 project target |
| X-15 | Link and button names describe destination/action; repeated generic labels receive context | accessibility tree | 2.4.4, 4.1.2 |

## 3. Homepage and Search

| ID | State/action | Keyboard and screen-reader acceptance | Visual/responsive acceptance |
|---|---|---|---|
| H-01 | Opening at 390×667 | Search label and real input are reachable in the first viewport; initial focus remains browser/default | proposition and mosaic remain, with artwork depth reduced before text/Search |
| H-02 | Journey switcher | tablist has an accessible name; arrow/Home/End move focus; Enter/Space selects; panel is labelled; focus stays on tab | Search selected and dominant; exact label/order preserved |
| H-03 | Search typing | input is named; listbox relationship and active descendant are announced; Up/Down/Enter/Escape work | up to seven results; query never disappears during loading/error |
| H-04 | Published result | option announces title plus disambiguating scope/year only where needed | canonical destination apparent without badge clutter |
| H-05 | Recognized-unprofiled | state is announced as unavailable in current coverage; no false link | no stub/profile affordance; request absent until privacy/receiver exists |
| H-06 | Ambiguous | candidates are separate options with distinguishing facts | no candidate pre-presented as the “best” answer |
| H-07 | Unrecognized/error | state announcement is polite and not repeated on every keystroke; query remains editable | recovery and restrained suggestions are visible |
| H-08 | Mobile Search dialog | named dialog; initial focus in input; Tab contained; Escape/Close works; invoker regains focus; background inert | full-height sheet does not obscure its Close control or keyboard |
| H-09 | Poster rail | list semantics; Prev/Next names include rail; disabled at ends; native touch/keyboard scroll remains | no autoplay/loop; one-viewport movement; focus item is not clipped |
| H-10 | Poster preview | explicit button has expanded/controls state; panel follows; Escape closes and returns focus | art remains visible; content wraps; no nested controls |
| H-11 | Curated Compare | both games and “See the full comparison” link are named in logical order | no stale “artwork-free” copy, winner, score or popularity treatment |

## 4. Profile

| ID | State/action | Keyboard and screen-reader acceptance | Visual/responsive acceptance |
|---|---|---|---|
| P-01 | Identity | one `h1`; title, scope, platform and status read before the decision | long title wraps; artless state does not retain an empty hero |
| P-02 | Platform marks | mark is decorative where full platform name is present | no abbreviation is the sole label |
| P-03 | Scope change | links use canonical URLs and current state, or true tabs follow tab grammar; focus is not stolen | scope/build/platform note remains visible and does not alter base scores silently |
| P-04 | Rapid answer/Pull/Tax/fit | headings and authored prose read in the intended order | no truncation; warm surface retains AA contrast |
| P-05 | Practical facts | exact/range/Unknown read as text; absent optional fact creates no empty focus target | no Fable-derived values or ninth-axis visual treatment |
| P-06 | Full radar | chart is either a concise named image or hidden when redundant; exact list is always available | labels ≥12px; Range has no midpoint; Unknown has no point |
| P-07 | Exact dimension row | dimension, exact/range/Unknown, scale and confidence are one understandable group | aligned values remain legible at 200% and mobile |
| P-08 | Dimension disclosure | expanded/controls state correct; panel follows trigger; no skipped link or trap | expanded content does not cover adjacent rows or artwork unexpectedly |
| P-09 | Provisional/Low confidence | words and caveat are exposed, not only colour/dash | visually visible without dominating the decision answer |
| P-10 | Evidence/corrections/destination | descriptive links; expired/unavailable action is not focusable as a false destination | trust material remains editorial, not report-like |

## 5. Full Compare

| ID | State/action | Keyboard and screen-reader acceptance | Visual/responsive acceptance |
|---|---|---|---|
| C-01 | Empty/half-selected | selector names the side; first selection persists; status tells what remains | empty space looks intentional; no fake opponent |
| C-02 | Self-pair | inline error is associated with selector and announced once; first selection remains | no redirect loop or silent replacement |
| C-03 | Identity stage | left game then right game are named in DOM; artwork is decorative when titles supply identity | equal territories; central radar reads as shared comparison, not a winner badge |
| C-04 | One/no artwork | same identity and control order as both-art state | typographic territory has equal weight; no blank/broken image/apology |
| C-05 | Paired radar | concise overview or hidden as redundant; both styles named in a legend/equivalent | central ~340px desktop/~128px mobile; colour not sole identity |
| C-06 | Editorial trade-off | paragraph names both games and meaningful choice without winner language | remains visually prominent above detailed relations |
| C-07 | Relationship summary | Equal/Close/Clear difference/Indeterminate are words in reading order | each has distinct marker geometry; Range/Unknown never receive a certainty bridge |
| C-08 | Tag map | shared and side-unique group headings name relationship/game; intensities are written | shared traits central/bright but not colour-only; no overlap score |
| C-09 | Paired exact row | group reads dimension, left value/confidence, right value/confidence, relation/direction | stacked mobile order remains left then right; no horizontal page scroll |
| C-10 | Range/Unknown row | both endpoints or Unknown are announced; relation is Indeterminate when required | no fabricated midpoint or zero point |
| C-11 | Replace | accessible name includes side/current game; dialog follows modal contract; focus returns; other side persists | controls remain available in both/artless/mobile states |
| C-12 | Copy link | success/failure enters polite live region; Clipboard failure reveals selected read-only URL | control label remains stable; feedback does not shift layout excessively |
| C-13 | URL/index | launcher indexable; pair has `noindex,follow`; order preserved; pair absent from sitemap/schema | share and reload restore the same left/right composition |

## 6. Visual conformance checkpoints

At each implementation slice, capture production and compare against the
accepted reference at the same viewport. The reference is the imported
canonical Claude Design file named in
[`Should_I_Play_Canonical_Design_Source.md`](Should_I_Play_Canonical_Design_Source.md),
not a remembered screenshot or derived prose. Judge in this order:

1. proposition/decision hierarchy;
2. section order and relative visual weight;
3. art-led versus artless parity;
4. Search visibility and control prominence;
5. profile and Compare identity/radar relationships;
6. type roles, colour roles, spacing and boundaries;
7. interaction states and motion;
8. specimen details that may legitimately change for truthful content.

Pixel equality is not the goal. Any material drift in the first six categories
requires correction or a completed deliberate-drift entry from the handoff.

## 7. Release evidence bundle

The final bundle contains:

- reference and implementation captures at 1440, 390, 390×667, 320 and 200%;
- automated accessibility results with false positives adjudicated;
- keyboard traces for journey tabs, Search, poster preview, profile disclosure,
  Compare selection/Replace and Copy link;
- VoiceOver and NVDA notes for exact, Range, Unknown and Provisional fixtures;
- computed contrast report for text, controls, focus and relation markers;
- reduced-motion capture;
- artwork state captures for both/one/none/loading/error;
- route/metadata evidence for Search destinations and Compare pair noindex;
- deliberate-drift log; and
- confirmation that publication values came from approved records, not Fable.
