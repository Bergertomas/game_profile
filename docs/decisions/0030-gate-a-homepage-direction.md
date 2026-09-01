# ADR 0030 — Gate A homepage direction

**Status:** Accepted · 2026-08-28 · supersession scope confirmed 2026-08-30

**Context:** Master Plan v0.9; the 24–25 August public-product decision records;
ADR 0013; the reconciled Fable requirements/state artifacts; Fable
**Should I Play - Canonical Screens.dc.html**, A1/A2 Rev 5.1; owner acceptance
on 28 August 2026.

## Problem

The product contract had resolved the homepage proposition and journey
hierarchy, but the repository still described the final homepage composition as
pending. That made the accepted Rev 5.1 screen direction indistinguishable from
older exploratory Fable work and left ADR 0013's earlier library-entrance
composition over-broad.

At the same time, the accepted prototype contains illustrative games, values,
polygons, words, dates and artwork. Treating those as publication truth would
silently change content, methodology and artwork decisions that the visual
artifact does not own.

## Decision

A1/A2 Rev 5.1 is the canonical homepage visual and interaction direction for
desktop and mobile. It complements the Master Plan; it does not replace it.

The accepted direction freezes:

1. the decision-first **“Should you play it?”** proposition;
2. the dark, cinematic and deliberately art-directed visual language;
3. Search embedded into the opening composition and selected by default;
4. the exact journey labels **Search / Compare / What should I play?**;
5. a three-game artwork mosaic with integrated Game Profile fingerprints;
6. artwork remaining visible during expanded interactions;
7. a general **“Start somewhere interesting”** poster rail;
8. authored discovery shelves following that rail;
9. **“Choosing between…”** as a secondary curated module;
10. Compare never becoming the default homepage subject;
11. the desktop/mobile conceptual hierarchy;
12. no rankings, winner, aggregate score, popularity or trending mechanics.

This is a direction, information-architecture and interaction freeze. The
following are not accepted publication facts:

- example dimension scores or resulting polygons;
- profile summaries, Pull/Risk copy or other illustrative prose;
- dates, shelf membership or game roster;
- artwork rights, clearance or final asset selection;
- final implementation dimensions, typography sizes, responsive breakpoints or
  production accessibility behavior.

This ADR supersedes ADR 0013 as the governing public visual-system decision.
ADR 0013 remains historical evidence only. Gate B's accepted A3–A6 profile
application is recorded separately in ADR 0032. Neither decision changes a
product-semantic, methodology, evidence, scope or artwork-rights ADR.

The accepted homepage system establishes a dark cinematic ground, coral brand
voice, cyan evidence role and JetBrains Mono evidence/numeric voice as the
handoff starting point. Exact production tokens still require measured contrast
and responsive conformance; this is implementation work, not another owner
decision.

## Required implementation safeguards

- A chart label shown at roughly 9px in the prototype is not a production
  target. Use genuinely readable labels or an aligned exact-value list.
- Expanded-state semantics and focus order must include every actionable link,
  remain coherent and never trap focus.
- Search must remain available without an introductory scroll at 390×667,
  narrower widths and text zoom.
- Artwork is still gated by the lawful-artwork policy; the artless state remains
  complete and first-class.
- The absent final Fable verifier message is not conformance evidence.
- Prototype scores and polygons must never be copied into canonical content.

## Consequences

- A1/A2 must not be redesigned or rediscovered.
- Gate B is accepted under ADR 0032 after the score/radar audit; visual drama
  did not drive score changes.
- The shared design-system/interaction handoff must translate A1–A6 into
  measured production tokens and components before visual conformance is
  claimed.
- The dedicated full Compare design pass and shared handoff precede product
  implementation. Inside implementation, static Search ships before full
  Compare because it is the dominant, load-bearing journey. Compare remains
  exactly two; ADR 0033 later supersedes the artwork-free rule and resolves its
  URL/index policy.
- Production remains unchanged until implementation is separately completed
  and verified.

## Non-blocking owner refinement — 30 August 2026

During implementation, modestly reduce the vertical footprint of the opening
hero/artwork composition so Search has greater visual prominence. Preserve the
accepted hierarchy, artwork/fingerprint relationship and immediate Search
availability. This is a conformance refinement, not a Gate A redesign or a new
Fable prerequisite.
