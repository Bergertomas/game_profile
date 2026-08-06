# ADR 0005 — Score provenance, and the missing Calibration Round 1 report

**Status:** Accepted · 2026-08-06 · **Reconciled against Round 1, 2026-08-06**
**Context:** Project Context §11 step 4; Round 1 report §3–§4; Round 2 report §13;
Master Plan §10.3

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

## Reconciliation — 2026-08-06

The Calibration Round 1 report arrived. Its matrix (§3) is now authoritative for
Alan Wake 2 and Returnal, and both fixtures were reconciled to it. Round 1
publishes dimension totals only, so the subcriterion decompositions remain
engineering work constrained to reproduce them — the same arrangement Redfall
has always had. `tests/calibration.test.ts` now locks all 24 totals.

| | Round 1 | Previously derived |
|---|---|---|
| Alan Wake 2 | 9.5 · 9.0 · 8.5 · 7.5 · 8.0 · 10.0 · 9.5 · 10.0 | 3 of 8 were 0.5 low |
| Returnal | 7.5 · 9.5 · 8.5 · 10.0 · 7.5 · 9.5 · 8.5 · 10.0 | all 8 were low |

The Returnal gap is the instructive one, and it was a rubric error rather than
taste. Two subcriteria had crossed from *describing* a trait into *penalising*
it:

- **Session / Progress Rhythm** had been scored 0.5 because a run can exceed
  three hours with no save. Rubric §6.4 says explicitly "do not reward
  short-session convenience by default"; the run is a legible progress unit for
  this design, and its length belongs in the primary risk and the experience
  tags, not in a low score.
- **Repetition Control** and **Content Focus** had treated re-traversal as
  filler. Round 1 §4.4 is explicit that "repeating areas is the structure, not
  filler accidentally left in".

Round 1's calibration lesson for Returnal — "a trait can reduce Pacing/Time
Respect without being a design failure" — is now quoted at the top of the
fixture so the next editor sees it before touching those numbers.

Primary pull, primary risk and all three interpretation blocks for both games
were replaced with Round 1's approved wording, matching how Redfall already
uses Round 2's. The previously written alternates remain in git history.

## Still open

Whether subcriterion-level breakdowns should be **published editorially** in
future calibration rounds, or whether decomposition stays an engineering
artefact reviewed against the published totals. The current arrangement works
and is fully tested; this is a process question, not a blocker.
