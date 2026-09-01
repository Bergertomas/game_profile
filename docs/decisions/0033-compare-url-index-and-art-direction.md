# ADR 0033 — Compare URL/index policy and art-led revision direction

**Status:** Accepted · 2026-08-31  
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
