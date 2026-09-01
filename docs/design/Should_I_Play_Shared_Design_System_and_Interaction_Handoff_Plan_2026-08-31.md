# Should I Play? — Shared Design-System and Interaction Handoff Plan

**Date:** 31 August 2026  
**Status:** Completed planning record; fulfilled by the v1.0 handoff and
accessibility/conformance matrix; no product code was changed  
**Authority:** ADRs 0030, 0032, 0033 and 0034; accepted Fable A1–A6, B-rail,
C1–C4 and C-rail

## 1. Purpose

Translate the accepted homepage, profile and full Compare directions into one
implementation-ready public system. This is a specification and reconciliation
pass, not a new design direction and not a request for another broad Fable
generation.

**Completion note — 31 August 2026:** this plan is fulfilled by
[`Should_I_Play_Shared_Design_System_and_Interaction_Handoff_v1.0_2026-08-31.md`](Should_I_Play_Shared_Design_System_and_Interaction_Handoff_v1.0_2026-08-31.md),
the machine-readable
[`handoff/should-i-play.tokens.v1.json`](handoff/should-i-play.tokens.v1.json)
and the
[`Should_I_Play_Accessibility_and_Conformance_Matrix_v1.0_2026-08-31.md`](Should_I_Play_Accessibility_and_Conformance_Matrix_v1.0_2026-08-31.md).
The files above now govern implementation detail beneath the accepted ADRs;
this document remains the work-order record.

The handoff must remove implementation guesswork while preserving the boundary
between accepted composition and illustrative prototype content. It must also
reconcile A7's historical artwork-free Compare sentence with ADRs 0033/0034.

## 2. Governing inputs

- A1/A2 Rev 5.1 — accepted desktop/mobile homepage direction;
- A3/A4 — accepted art-led desktop/mobile profile direction;
- A5/A6 — accepted complete artless desktop/mobile profile direction;
- C1/C2 — accepted art-led desktop/mobile full Compare direction;
- C3/C4 — accepted complete artless desktop/mobile Compare direction;
- B-rail and C-rail — state and interaction evidence, subject to the ADRs;
- the score/radar audit and fixed eight-dimension contract;
- the Gate B and art-led Compare briefs/result reviews;
- current repository components, tokens and responsive behavior as
  implementation inputs, not competing visual authority.

Prototype scores, dates, commitment values, destinations, game roster and
private artwork do not become publication data through this handoff.

## 3. Required handoff package

### H1 — foundation and token map

Produce a measured, semantic token map for:

- canvas, elevated and artwork-overlay surfaces;
- primary, secondary, quiet and inverse text;
- dividers, focus indicators and interactive boundaries;
- game-side accents and neutral relationship states;
- difference, alignment, caveat, confidence, Provisional, Range and Unknown
  treatments without red/green good/bad semantics;
- display, editorial, utility, label and numeric typography roles;
- spacing, radius, border, shadow/scrim and responsive layout roles;
- motion duration/easing and reduced-motion equivalents.

Use tokens in the component specification. Record measured source values once;
do not scatter raw values or create a second visual system alongside the
accepted one.

### H2 — component and variant inventory

Specify at minimum:

- public chrome and ranked journey navigation;
- Search opening control, expanded results and the four truthful availability
  states;
- homepage artwork/fingerprint mosaic, poster rail, authored shelf and
  secondary curated Compare module;
- game identity, artwork territory, artless identity and mixed-art pair;
- scope/build/platform identity and platform-logo treatment;
- decision answer, Pull, Tax, fit guidance and practical commitment;
- compact, full labelled and two-game radar variants;
- permanent exact-value rows, dimension explanation and evidence confidence;
- evidence/provisional disclosures, corrections and destination actions;
- Compare selector, two-game stage, relationship field, canonical tag map,
  interval-aware rows and share action.

For every component, record anatomy, content limits, truncation/wrapping,
responsive behavior and default, hover, focus-visible, active, disabled,
loading, empty, error and unavailable states where applicable.

### H3 — interaction and accessibility contract

Specify:

- coherent DOM, reading and focus order on desktop and mobile;
- keyboard behavior for journey selection, Search results, expanded homepage
  states, scope controls, disclosures, Compare selectors and share feedback;
- expanded/collapsed semantics without focus traps or skipped secondary links;
- chart names/descriptions and authoritative accessible value groups;
- live-region behavior only where a state change needs announcement;
- pointer, touch-target and hover-independent behavior;
- motion and reduced-motion behavior;
- non-colour equivalents for game identity and Compare relations.

The radar is never the only precise representation. Exact values, confidence
and relationship words remain available without artwork, hover, colour,
brightness, animation or spatial inference.

### H4 — responsive and stress-state matrix

Document the accepted 1440px and 390px compositions plus behavior at:

- 390×667 before introductory scrolling;
- widths narrower than 390px;
- landscape/short viewports where the opening composition is height-bound;
- 200% text zoom and long titles/platform names;
- one cleared artwork, no cleared artwork and slow/missing images;
- unusually long editorial copy, absent optional facts and Unknown values.

Include the accepted bounded homepage refinement: modestly reduce the opening
hero/artwork height so Search gains prominence while artwork, proposition and
the immediate Search control remain intact.

### H5 — truth and data projection

Map each visible field/state to an approved content or domain contract. In
particular:

- never fabricate commitment bands from prototype examples;
- use approved values, Unknown or omission according to the field contract;
- preserve scope/build/platform notes and overrides;
- preserve Range, Unknown, Provisional and confidence distinctions;
- keep **Evaluated** date semantics explicitly unresolved until its Gate B
  copy/data decision;
- keep all artwork behind rights and placement clearance;
- keep URL/index behavior as an implementation requirement, not shipped truth.

### H6 — engineering acceptance package

Finish with:

- component ownership and reuse map;
- state stories/fixtures using truthful and adversarial examples;
- responsive reference captures and measurement annotations;
- per-surface keyboard and screen-reader acceptance checks;
- visual-regression reference set;
- deliberate-drift log format;
- slice-level definition of done linking design, truth, accessibility and
  repository gates.

## 4. Work order

### Now — shared handoff

1. Inventory and measure the accepted A1–A6/C1–C4 compositions.
2. Reconcile A7 and map the shared semantic tokens.
3. Define component anatomy, variants and state coverage.
4. Specify responsive, keyboard, screen-reader and reduced-motion behavior.
5. Map prototype content to real data contracts and truth fallbacks.
6. Produce the engineering acceptance package and obtain bounded owner review.

### Next — public implementation

1. Establish the shared public foundation and implement the editorially
   governed static Search index plus its four truthful states.
2. Implement the accepted homepage opening and curation system, including the
   small hero-height refinement.
3. Implement the accepted art-led/artless profile system without refactoring
   its existing client boundary before this slice needs it.
4. Implement the accepted exactly-two full Compare system and ADR 0033
   URL/index behavior.
5. Run visual-conformance and accessibility review after each surface and
   address intentional drift explicitly.

### Later — completion and scale

- deterministic **What should I play?** implementation;
- 12–15-profile private validation and first real Publish → dispatch → Live
  catalog cycle;
- protocol calibration and catalog production toward the approximately-100
  quiet-release floor;
- final release conformance, privacy, analytics and artwork due diligence.

## 5. Dependencies and owner checkpoints

No new owner decision is required to begin the handoff. The next bounded owner
checkpoint is approval of the completed cross-surface handoff, focused on
faithfulness and implementation clarity rather than product rediscovery.

Separate decisions are needed only before their dependent implementation can
ship: **Evaluated** date semantics, the practical-time source, coverage-request
receiver/privacy contract, and production artwork policy/per-asset clearance.
They do not block the handoff itself.

## 6. Exit criteria

The handoff is complete when an engineer can implement every accepted surface
without inventing layout, token, interaction, responsive, content-fallback or
accessibility behavior; A7 contains no conflicting Compare rule; and every
prototype fact is either mapped to approved data, explicitly Unknown, omitted
by contract or labelled design-only.
