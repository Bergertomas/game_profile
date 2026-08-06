# ADR 0004 — How unknown subcriteria become (or do not become) a published score

**Status:** Accepted · 2026-08-06 · **Needs product sign-off**
**Context:** Master Plan §9.2, §25.18–19; Rubric v1.0 §1, §14, §22; Round 2 §12

## Problem

The rubric allows a subcriterion to be `unknown`. The Master Plan defines what
happens when **more than one** of five is unknown:

> If >1 of 5 subcriteria is unknown: dimension is provisional, score may be
> hidden or shown as a range, confidence cannot be High.

It does not define the case of **exactly one** unknown. That case is not rare —
pre-release profiles will hit it constantly, since §14 lists runtime
justification, narrative payoff and launch technical stability as things that are
dangerous to score early.

With one unknown, the dimension total is genuinely somewhere in a two-point band.
Two points is wider than an entire calibration anchor (§21: 8.0–8.5 is "Strong",
7.0–7.5 is "Good/solid"), so publishing a point value would be exactly the fake
precision §25.18 forbids.

## Decision

| Unknown subcriteria | Published as | Radar |
|---|---|---|
| 0 | Exact total, e.g. `8.5` | Vertex at the value |
| 1 | Range, `low`–`low + 2`, e.g. `7.0–9.0` | Vertex at the confirmed floor, plus a dashed reach to the ceiling ending in a hollow marker |
| 2 or more | Not scored | No vertex. The outline breaks and the two neighbouring vertices are joined by a dashed bridge |

Unknown is never plotted at the centre. `unknown` and `0` are different claims:
one is "we do not know", the other is "we assessed this and it is absent". The
database stores unknown as `NULL`, never `0`, and a test asserts the distinction
survives into the geometry layer.

Where a dimension has two or more unknowns, confidence is capped below High and
the publish gate rejects an evaluation that claims otherwise.

## Why hide rather than range at 2+ unknowns

The Master Plan permits either ("may be hidden or shown as a range"). Two unknowns
produce a four-point range — `4.0–8.0` spans four anchor bands and tells a reader
nothing they can act on. "Not scored", beside a note saying how many subcriteria
lack evidence, is more honest and more useful.

## Consequences

- Both implementations of this rule — `lib/scoring/derive.ts` and the
  `dimension_scores` view — must change together.
- `/dev/radar-states` renders all three states for visual review. It is
  development-only, and an e2e test asserts it 404s in production.
- **For Tomas/ChatGPT:** this fills a genuine gap in the Master Plan rather than
  reinterpreting an existing rule, but it is a product-visible semantic. If you
  would rather publish a point estimate with an uncertainty marker at one unknown,
  say so — it is a small change here and a large change to what the numbers mean.
