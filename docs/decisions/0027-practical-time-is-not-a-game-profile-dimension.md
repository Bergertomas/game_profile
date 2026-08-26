# ADR 0027 — Practical time is not a Game Profile dimension

**Status:** Accepted · 2026-08-26
**Context:** Master Plan v0.9 §10.6;
`Should_I_Play_Public_Product_Resolutions_2026-08-25.md` §8.

## Decision

The product models **total commitment** and **session suitability** separately.
Neither is a ninth Game Profile dimension and neither changes any score.

Total commitment is scope-aware and provider/provenance-aware. It may retain
focused, engaged-play and completionist estimates, with range/uncertainty and
freshness. Engaged play—central path plus meaningful optional content—governs
the headline band:

- Brief: up to 10 hours;
- Moderate: over 10 through 25 hours;
- Substantial: over 25 through 50 hours;
- Long: over 50 through 100 hours;
- Extensive: over 100 hours;
- Open-ended, Variable, Unknown and Not applicable remain explicit states.

Session suitability has two independent scope-aware fields:

- useful session window: Very short (20–30 minutes), Short (30–60), Longer
  (60–120), Extended (more than two hours), Variable, Unknown or Not applicable;
- interruption flexibility: High, Medium, Low, Unknown or Not applicable.

The public phrase is derived from both and states conflicts rather than hiding
one axis. A concrete available-session statement is interpreted as a hard
constraint by default, but remains visibly editable. For a hard budget, a
window whose upper bound is within budget satisfies it; a budget inside the
window is a borderline near match; a window beginning above it contradicts it;
Unknown is indeterminate.

HowLongToBeat is a candidate source only. Scraping without an approved lawful
contract is rejected.

## Consequences

- Public and discovery code cannot reuse the eight-dimension score structures
  for time.
- Range boundaries are compared directly; no midpoint is invented.
- Total completion budget and available session budget remain different query
  concepts.
- Reacclimation cost remains rationale unless validation proves a third launch
  axis necessary.
