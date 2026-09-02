# ADR 0033 — Compare URL/index policy and art-led revision direction

**Status:** Accepted · 2026-08-31 · Amended 2026-09-02 (first-release eligibility)  
**Context:** Master Plan §5.4; the accepted A1–A6 direction; the first C1/C2
candidate review; Tomas's owner review on 31 August 2026.

## Context

The first dedicated full Compare candidate proved the exactly-two, fixed-scale,
no-winner data and accessibility contract, but its artwork-free composition
felt too much like a report and did not carry the emotional recognition or
visual magnetism of the accepted public product. Tomas approved its URL/index
recommendation but did not accept its visual direction.

This owner decision supersedes the earlier rule that full Compare and its share
card are always artwork-free. It does not weaken the rights-aware artwork gate,
the complete no-art requirement or any scoring constraint.

## Decision

### URL and index policy

- Share state uses `/compare?games=<left-slug>,<right-slug>`.
- The user's left/right selection order is preserved in the visible UI and in
  the share URL.
- Engineering may normalize the unordered pair internally for caching or
  deduplication only when that cannot reorder the displayed sides.
- Parameterized pair states are `noindex, follow`, absent from the sitemap and
  carry no rating/review structured data.
- The unparameterized `/compare` journey page may be indexed only when it has
  substantive standalone guidance.
- The MVP does not pre-render every catalog pair.

### Compare visual direction

The primary full Compare state is **art-led**:

- two equal artwork territories establish the two games without privileging a
  winner;
- the signature two-profile radar occupies the charged space between them and
  should feel visually connected to, or emanating from, both identities;
- the most meaningful difference, strongest alignment and material caveat are
  visually prominent before the full instrument;
- exact paired values remain permanently readable and authoritative;
- canonical public tags are grouped into **Shared**, **Alan Wake 2 only** and
  **Returnal only** (or the corresponding selected-game names), never converted
  into a match percentage or hidden aggregate;
- game accent colours identify the two sides; relation treatments may use
  colour, brightness, scale, connector weight, pattern and motion restraint to
  improve comprehension, but must also state the relation in text and use
  non-colour structure;
- shared does not mean better, unique does not mean worse, and red/green
  success/failure semantics are prohibited;
- the radar remains fixed at exactly eight dimensions on the public 0–10
  scale, with no normalization, area comparison or aggregate.

The art-led experience must have a **complete artless parity state**. Missing or
uncleared artwork removes the images without removing identity, comparison
meaning, exact values, tags, evidence, scope or interaction. It must not leave
empty frames or imply that the artless pair is inferior.

### Artwork governance

Compare artwork uses the same rights-aware records, clearance filtering,
credits, containment and takedown posture as every other public placement.
Evaluation-only art stays in protected preview. Production art remains blocked
until the full seven-step lawful artwork path in Master Plan §7.3 is complete.
An accepted art-led design is not production clearance.

## Preserved constraints

- exactly two games;
- differences and trade-offs, never a winner;
- no public or hidden aggregate, total area, average, match percentage,
  ranking, popularity or quality sorting;
- exact scope/build/platform identity, evidence status, dimension confidence,
  ranges, Unknown and Provisional states;
- all eight exact paired values available without relying on artwork, radar,
  hover, colour, brightness or position;
- practical commitment remains outside the rubric and is Unknown or omitted
  without an approved record;
- accepted A1–A6 remain unchanged.

## Consequences

- The first artwork-free C1/C2 candidate is evidence, not the accepted design.
- The bounded Fable High revision changed only Compare material and added
  artless-parity specimens; A1–A6 remained unchanged.
- Tomas accepted the revised C1–C4/C-rail visual and interaction direction on
  31 August 2026. ADR 0034 records that gate closure.
- Compare engineering cannot begin until the shared handoff is complete; that
  precondition was met by the v1.0 handoff on 31 August 2026.
- ADR 0011 and every earlier artwork-free Compare statement are superseded only
  for this Compare-placement rule; their rights, clearance, containment and
  no-art requirements remain governing.

## Amendment — 2 September 2026: first-release eligibility

**Decided by:** Tomas, 2 September 2026 · **Recorded in:** Engineering Slice 4

### Context

The accepted share state identifies each side of a comparison by **game
slug**: `/compare?games=<left-slug>,<right-slug>`. A game's public address
is its primary profile (ADR 0016), so that contract names "the main profile
of this game" and has no place for a sibling scope — a DLC, expansion, mode
or other separately evaluated experience of the same game. Master Plan §5.4
had allowed the launcher "arbitrary published pairs, including the same game
across different scopes". Implementing that inside the accepted contract
would have required inventing a scope-encoding scheme the accepted URL does
not have, or silently changing the contract.

### Decision

- The first Compare release supports **published primary profiles only**.
- DLC, expansion, mode and other sibling profile scopes are **temporarily
  ineligible** for Compare. They remain visible to the selector as rows that
  say why they cannot be chosen, and an address that names one by the profile
  address grammar (`<slug>/<scope>`) is refused in words, leaving the other
  side untouched.
- The accepted URL contract is **unchanged**. No scope-encoding scheme is
  invented.
- Sibling-scope Compare is a **deliberate later decision**, taken together
  with whatever encoding it needs. This amendment is a bound on the first
  release, not a permanent prohibition.

### Consequences

- Master Plan §5.4 is reconciled to this bound; "arbitrary published pairs,
  including the same game across different scopes" is superseded for the
  first release.
- The homepage's curated-Compare module links only a pair whose two sides are
  primary profiles; a configured pair naming a sibling scope states that no
  comparison page exists yet rather than linking to a refusal.
- `lib/compare/index.ts` holds eligible profiles only; `tests/compare-selection.test.ts`
  and the multi-scope Playwright project pin the refusal.
