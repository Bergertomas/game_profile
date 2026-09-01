# Should I Play? — Fable visual-completeness audit

**Audit date:** 2026-08-26

**Artifact reviewed:** **Should I Play - Reconciled**

**Disposition:** Product-contract conformance passed; final public UI/art-
direction acceptance failed. The artifact is a strong requirements, state and
interaction reference, but it is not yet the Phase 4 visual implementation
authority.

## Why this audit exists

The ten-item conformance repair answered whether the artifact contradicted the
accepted product model. It did not separately answer whether the artifact had
completed the dedicated visual-design mission required by the attached
`p_resolutions.md` record.

Those are different gates:

1. **Contract gate:** does the artifact preserve the frozen product decisions?
2. **Visual-completeness gate:** does it provide the deliberately art-directed,
   implementation-ready public UI those decisions call for?

The first gate passes. The second does not.

## What the artifact does preserve successfully

The reconciled artifact materially preserves the governing decisions,
including:

- the Should I Play? public identity and Game Profile methodology boundary;
- exactly eight dimensions, descriptive low values and no overall or hidden
  aggregate;
- profile-first Field Guide posture;
- Search / Compare / What should I play? journey hierarchy;
- the four Search availability states;
- exactly-two, differences-not-winners, artwork-free Compare;
- deterministic discovery with visible editable criteria, hard-constraint and
  Unknown handling, practical time and no match percentage;
- 12–15 profiles as private validation and approximately 100 substantive
  profiles as the quiet-release floor;
- scope, range, confidence, provisional and pre-release truth;
- practical-time, storefront, trust, corrections and accountability bands;
- responsive and nonvisual behavior for the major interactive surfaces;
- public-first roadmap sequencing and the one-editor admin constraint.

The ten final contract corrections also pass in the repaired source and
recovered local bundle.

## Why the artifact is not the final UI design

### 1. The homepage violates the locked visual proposition

The 24 August homepage resolution locks an **art-led, utility-first entrance to
a profile-first Field Guide**. It says authentic artwork should establish the
product category immediately, inside a compact opening in which art supports
the decision interface.

The reconciled desktop and 390px homepage specimens remain primarily
text-first “contents page” compositions. Their opening viewport is dominated by
the headline, methodology explanation and Search. Artwork appears later as a
shelf/strip rather than materially shaping the opening composition.

This is not a minor polish question. It changes the promised emotional and
category identity of the homepage.

### 2. A superseded exploration was carried forward as if it were the final composition

The attached homepage resolution explicitly states:

- no explored mockup is the final design; and
- the next design must synthesize the useful parts of the earlier concepts,
  including the art-plus-utility composition, prominent Search invitation,
  accessible actions, cinematic shelf, controlled art treatment and radar-led
  comparison result.

The reconciled artifact largely updates the earlier **at Fifteen** contents-page
screen rather than performing that final synthesis. Its product logic is newer;
its principal composition remains the older Field Guide specimen.

### 3. Artwork behavior is specified but not art-directed to acceptance depth

The artifact correctly preserves artless states and rights safeguards. However,
the art-on profile and catalog states use “cleared cover/hero art” placeholders.
That prevents a real judgment of:

- crop behavior and focal-point protection;
- text/art contrast;
- how game identity and Should I Play? identity coexist;
- whether mixed art/artless shelves feel intentional;
- whether authentic artwork dominates, supports or fragments the system;
- how the compact homepage opening works with actual imagery.

A lawful prototype may use approved source material, clearly marked private
design-only assets, or controlled representative placeholders with realistic
composition. Blank striped rectangles are not enough for final art-direction
acceptance.

### 4. The screen designs are buried inside a specification document

The artifact contains useful working specimens for homepage, Search,
discovery, profile, Compare and mobile states. They are not absent. But they are
embedded inside a long reconciliation document and are interleaved with
annotations, contracts and synthetic data.

Engineering still needs a concise visual source containing the canonical route
screens and their principal states at reviewable sizes. The current document is
excellent supporting specification; it is inefficient as the sole visual
handoff.

### 5. The public UI still needs a deliberate final art-direction judgment

Archivo + Newsreader, graphite/warm paper, ruled hierarchy and restrained game-
led accents remain a strong foundation. The remaining job is not to invent a
new aesthetic. It is to compose the final public product from that foundation
so it feels authored, game-specific and emotionally alive rather than like a
well-written editorial specification or generic component system.

## Correct governing interpretation

- The reconciled artifact **does govern product requirements, state behavior,
  copy/trust constraints and implementation dependencies**, subordinate to the
  ADRs and resolution register.
- It **does not yet govern final route composition or art direction**.
- Phase 3B remains active.
- Phase 4 implementation should not begin wholesale from the current visual
  specimens.
- Foundation work that is genuinely design-independent may continue, but the
  next primary milestone is the bounded UI/art-direction completion pass.

## Required final design set

The next Fable pass must produce a concise canonical screen set, using the
existing reconciled artifact as its requirements source rather than restarting
discovery:

1. **Homepage, 12–15 profiles:** desktop and 390px; compact art-led opening,
   ranked Search / Compare / What should I play? entry, art strip/shelf,
   comparison preview and curated decision shelf.
2. **Homepage, approximately 100 profiles:** desktop and 390px; the same visual
   grammar with release-scale catalog affordances.
3. **Global Search:** desktop overlay and mobile sheet; published,
   recognized-unprofiled, ambiguous, unrecognized and failure states.
4. **What should I play?:** prompt/entry, interpreted criteria, verified/near/
   trade-off/indeterminate/no-match results and refinement on desktop and
   mobile.
5. **Game Profile:** art-led and artless, normal and provisional/range states,
   including practical time, Where to play, trust, corrections and Compare
   exits.
6. **Compare:** launcher and populated result on desktop and mobile; exactly two,
   artwork-free, shape-first and fully understandable without the radar.
7. **About/methodology/trust:** the real public presentation, not only copy
   notes.
8. **System states:** loading, empty, error, stale, long-title, mixed-art and
   no-JS/progressive-enhancement behavior where visually material.
9. **Component/tokens sheet:** only the components and tokens needed to make
   those screens implementable; no parallel design system.

Each screen must be visibly labelled **LOCKED**, **PROPOSED**, **REAL** or
**SYNTHETIC** where relevant to review, without those labels becoming public UI.

## Acceptance criteria for Phase 3B

Phase 3B may close only when Tomas can review the canonical screen set and say:

- the homepage is genuinely art-led and utility-first;
- the product is recognizably about games in its first viewport;
- the three journeys have the locked hierarchy;
- profiles remain the underlying authority;
- authentic art and artless fallback both look deliberate;
- Search, discovery, profile and Compare have complete desktop/mobile states;
- the design is recognizably Should I Play?, not generic SaaS, AI-dashboard,
  storefront or magazine styling;
- the screens are implementable without rediscovering composition in code;
- no screen contradicts the governing ADRs or attached resolutions;
- the `/play` route is accepted or replaced explicitly.

## Tool recommendation

Use **Fable 5 / High** for this bounded visual-completion mission. It already has
the project, source artifact and design system. Do not use Fable Max and do not
ask Opus to rediscover the product.

Reserve **Opus Extra** for a later fresh-context critique of the completed
canonical screen set—especially first-impression clarity, accessibility and UX
copy—before Tomas gives final acceptance.
