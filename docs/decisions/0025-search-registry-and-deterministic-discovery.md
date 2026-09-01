# ADR 0025 — Search registry and deterministic discovery

**Status:** Accepted · 2026-08-26
**Context:** Master Plan v0.9 §5.2, §9.10 and §10.6;
`Should_I_Play_Public_Product_Resolutions_2026-08-25.md` §4–6.

## Decision

Search and **What should I play?** are separate public journeys over one
approved, provider-independent catalog projection.

Search is global and returns exactly four public states:

1. a published profile, linked to its scope-correct canonical route;
2. a recognized but unprofiled registry record;
3. an ambiguous set requiring title/year/platform/edition/scope clarification;
4. an unrecognized query.

A recognized registry record is factual identity, not a Game Profile. It cannot
receive a `/games/*` route, scores, interpretation, confidence, profile
structured data, sitemap membership or any other thin public stub. Its one-step
coverage request is a private, deduplicated demand signal with no account,
public count, queue, rank, ETA or promise.

What should I play? is deterministic at launch. Its interpreter maps ordinary
language into versioned controlled concepts and one of four intentions:
`must_include`, `prefer`, `prefer_not`, or `must_exclude`. Visitors can inspect
and edit the interpretation.

Hard constraints are allowed only when the concept declares an eligibility
tier:

- reliable factual/normalized facts are hard-eligible;
- deliberately classified experiences are conditionally hard-eligible;
- continuous editorial judgments and dimensions are soft by default.

An explicit dimension hard request may use only the published thresholds
Strong-or-better (`>= 1.5` on the rubric's `0–2` scale) or Exceptional (`2.0`).
A full hard pass requires at least Medium confidence. A crossing range, Unknown
value or Low confidence is indeterminate rather than pass or contradiction.

Hard-constraint outcomes are `satisfied`, `contradicted`, or `indeterminate`.
Indeterminate results form their own explained group. They are not silently
excluded and are not called near matches. Ordering considers valid hard
constraints, alignment, confidence/completeness, trade-offs and appropriate
freshness. It may compute query-specific relevance internally but may publish
neither a match percentage nor a universal game score/ranking.

The homepage may show an initial preview. A durable full-results state supports
editing, relaxation, sharing and browser navigation and is normally `noindex`.
No runtime model, external search service or request-time database is required
for the initial implementation.

## Consequences

- The build emits explicit registry availability rather than inferring it from
  route presence or display order.
- Controlled concepts own aliases, supported values, eligibility, thresholds,
  provenance and Unknown/Not-applicable behavior.
- Search and discovery behavior is testable independently of the final visual
  composition.
- A future language model may translate text into the same concepts; it cannot
  invent catalog facts, classifications or profile claims.
- A later search service or server path requires measured corpus/performance
  evidence and must preserve this contract.
