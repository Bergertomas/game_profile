# Should I Play? — Full Compare Fable Candidate Review

**Date:** 31 August 2026  
**Status:** **Not accepted — URL/index approved; visual revision directed 31 August 2026**  
**Design artifact:** [Should I Play - Canonical Screens.dc.html](https://claude.ai/design/p/1016e606-4407-4fb1-ad8d-f74c1e80ed82?file=Should+I+Play+-+Canonical+Screens.dc.html)  
**Scope:** C1 desktop, C2 mobile and the C-rail only; accepted A1–A6 remain protected

## 1. Outcome

Fable 5 High added a dedicated full Compare candidate after the accepted Gate
A and Gate B material:

- C1 — artwork-free desktop Compare at 1440px;
- C2 — artwork-free mobile Compare at 390px;
- C-rail — relation, selector, accessibility, URL and indexing handoff states.

The specimen compares Alan Wake 2 with Returnal using the canonical values,
scope and confidence states from the design brief. It compares exactly two
games, declares no winner and computes no aggregate. The radar is a secondary
desktop overview; the permanent eight-row paired instrument is the precise and
accessible representation. Mobile omits the radar because its labels cannot
remain honestly legible at that width.

This candidate did not close the Compare gate. Tomas approved its URL/index
recommendation but found the visual experience insufficiently alluring and too
report-like. ADR 0033 records the accepted URL/index policy and the art-led
revision direction. The candidate remains useful evidence for exact values,
states and accessibility; it is not the accepted visual direction.

## 2. Protected accepted boundary

The captured A1–A6 plus B-rail DOM-text segment is an exact match before and
after the initial Compare pass and the subsequent bounded correction:

| Protected material | Result | Captured length | SHA-256 |
|---|---|---:|---|
| A1–A6 and B-rail | exact match | 62,050 | `3c2dc539156e8be425481dc76f8a097cc13f2a3c4ac93c73a1391fc8ba1a7fef` |

The Compare pass was inserted between the B-rail and A7. No production or
repository public-product code changed.

## 3. Fable checklist result

Fable reported all 14 requested checks as PASS. The reported checks cover:

1. A1–A6 unchanged.
2. Exactly two games, balanced selectors and no winner or aggregate.
3. Complete artwork-free desktop and mobile experiences.
4. Exact canonical scopes, platforms, values and confidence states.
5. A central trade-off, largest contrast, meaningful alignment and material
   caveat before the full instrument.
6. A desktop overview radar with persistent, non-colour-only identities.
7. Eight permanent paired rows as the authoritative representation.
8. Truthful equal, close, range, Unknown, asymmetric-confidence and
   provisional states.
9. No fabricated commitment hours; the unavailable record is Unknown.
10. Full platform identities with no visible `XSX` abbreviation.
11. Complete 390px mobile treatment plus narrower-width and 200%-zoom notes.
12. Keyboard order, disclosure semantics, focus return and reduced-motion
    behavior.
13. A working URL/index recommendation labelled as handoff rather than shipped
    truth.
14. Compatibility with the accepted A1–A6 visual and evidence hierarchy.

Fable was explicitly told not to run a background verifier for the bounded
correction. No absent verifier result is claimed.

## 4. Independent checks

Independent DOM and visual inspection confirmed:

- C1 and C2 contain no artwork images;
- both screens show Alan Wake 2 and Returnal with their exact scope, full
  platform identities and evidence status before analytical depth;
- all eight paired values appear in fixed public order on both screens;
- C1 and C2 each expose eight accessible Alan Wake 2 value groups and eight
  accessible Returnal value groups;
- each group identifies game, exact value and confidence in meaningful
  nonvisual order, eliminating the original ambiguous mobile announcement;
- the largest contrast is Agency & Satisfaction, the explicit alignment is
  Medium-Specific Craft and the confidence/platform caveats are not flattened;
- practical commitment is Unknown rather than inferred from the Fable example;
- C2 uses a vertical reading order with no horizontal comparison table;
- C-rail covers ranges, Unknown, asymmetric confidence, Provisional, duplicate
  selection, replacement focus return and copy-link confirmation;
- the corrected URL note contains no `canonical URL` claim and no instruction
  to alphabetize before render/share;
- the result contains no winner, ranking, aggregate or catalog normalization.

## 5. Bounded correction applied

The initial candidate had two correctable defects:

1. Mobile paired values could be announced in an ambiguous order such as
   `9.5 High Medium 7.5` without naming the game for each group.
2. The handoff rail called the pair URL canonical and said duplicate orders
   were alphabetized before render/share, even though the URL/index policy is
   still open and visible left/right order must be preserved.

The corrected C1/C2 rows now use accessible named groups for each game. The
handoff rail now says **current shareable pair URL**, preserves the user's
left/right order in the visible experience and share URL, and limits unordered
pair normalization to internal caching/deduplication that cannot reorder the
displayed sides.

## 6. Accepted URL and indexing policy

The candidate recommends:

- share state: `/compare?games=alan-wake-2,returnal`;
- preserve the user's left/right order in the UI and share URL;
- allow an unordered internal pair key only for caching/deduplication and never
  use it to reorder the visible sides;
- mark pair-state URLs `noindex, follow`, omit them from the sitemap and attach
  no rating/review schema;
- consider only the unparameterized `/compare` journey page for indexing when
  it contains substantive standalone guidance;
- do not pre-render every catalog pair.

Tomas approved this policy on 31 August 2026. ADR 0033 now governs it. It is an
implementation decision, not evidence that the current production site has
shipped the route.

## 7. Owner review result and required revision

Tomas's 31 August review resolved the candidate as follows:

- **URL/index policy:** accepted and recorded in ADR 0033;
- **visual direction:** not accepted;
- **next pass:** make Compare substantially more alluring through two equal
  artworks, a central radar that feels connected to or emanates from both,
  stronger visual treatment of differences and alignments, and canonical tags
  divided into Shared/left-only/right-only;
- **accessibility:** colour and brightness may reinforce comprehension but must
  not be the only carrier of game identity or relation;
- **rights:** retain a complete artless parity state and the full lawful-artwork
  gate.

Only acceptance of that bounded revision will authorize the shared
design-system and interaction handoff. Neither the first candidate nor a later
design artifact authorizes publication of unapproved artwork, evidence,
destination or commitment-time records.
