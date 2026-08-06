# ADR 0005 — Score provenance, and the missing Calibration Round 1 report

**Status:** Accepted · 2026-08-06 · **Needs editorial reconciliation**
**Context:** Project Context §11 step 4; Round 2 report §13; Master Plan §10.3

## Problem

The handoff set is Alan Wake 2, Returnal and Redfall.

`/docs` contains the Calibration **Round 2** report, which publishes exact
dimension totals for its six games including Redfall. It does not contain the
Round 1 report, which is where Alan Wake 2 and Returnal were scored. The only
Alan Wake 2 signal in the repository is
`Game_Profile_Radar_Concept_Alan_Wake_2.png`, which is labelled "Illustrative".

So two of the three seed profiles have no approved numbers, and all three need a
subcriterion-level decomposition that no report provides.

## Decision

Every evaluation records where its numbers came from, in a `score_provenance`
column with three values:

- `calibration_round_2` — dimension totals are published in the Round 2 report and
  are authoritative.
- `calibration_round_1` — reserved; nothing uses it yet.
- `derived_pending_round_1_reconciliation` — scored by Claude directly against
  Rubric v1.0 because no approved matrix was available.

Alan Wake 2 and Returnal carry the third value and render a provenance note on the
public page. Redfall carries the second.

Two rules constrain the work:

1. **Redfall's decomposition must reproduce the Round 2 totals exactly.**
   `tests/calibration.test.ts` asserts all eight. If a future edit to a rationale
   moves a subcriterion value, the test fails rather than quietly republishing a
   profile Round 2 did not approve.
2. **Every scored subcriterion carries a written rationale.** All 120 in the seed
   corpus do, and a test enforces a minimum length. The rationale is the artefact
   an editor reviews; the number is a summary of it.

## Evidence records are placeholders

Master Plan §10.3 forbids inventing sources. The `evidence_sources` entries in the
seed profiles are therefore truthful **evidence classes** — "multiple reputable
post-release reviews, October 2023 onward" (Tier B), "developer post-launch update
history" (Tier C) — with no fabricated URLs, article titles or bylines. They are
honest about what they are and are structurally correct, but they are not a
populated evidence ledger. That is Phase 2 work in the evidence manager.

## What is needed from Tomas/ChatGPT

1. The **Calibration Round 1 report**, so the Alan Wake 2 and Returnal totals can
   be reconciled. Where they disagree, Round 1 wins and the fixtures change.
2. A decision on whether subcriterion-level breakdowns should be **published**
   from Round 1 as well, or whether decomposition stays an engineering artefact
   reviewed by an editor.

Until then the two derived profiles are engineering-grade: internally consistent,
rubric-faithful and testable, but not editorially signed off — and the product
says so on the page rather than only in this file.
