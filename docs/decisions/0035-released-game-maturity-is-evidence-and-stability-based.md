# ADR 0035 — Released-game maturity is evidence- and stability-based, not age-gated

- **Status:** Accepted owner decision; applies to the Scoring Protocol v1.0 candidate before Phase 3A preregistration
- **Date:** 2026-09-02
- **Owner / final editorial authority:** Tomas
- **Related:** `Game_Profile_Scoring_Protocol_v1.0_DRAFT.md` §3, Appendix B; ADR 0024; `Game_Profile_Editorial_Evidence_and_Data_Sourcing_SOP_v0.2.md` §10

## Context

The Scoring Protocol v1.0 candidate currently says that `newly_released` lasts through the twelve-month maturity check and that older first-time catalog evaluations are `mature`.

During Phase 3A cohort reconciliation, that rule produced an obviously wrong calibration result: a released game can be well understood, heavily evidenced, and unlikely to undergo profile-shaping change while still being younger than twelve months. Battlefield 6 was the concrete marker. Conversely, age alone does not make an unstable or poorly evidenced game mature.

Appendix B still requires a mature-game calibration corpus. The owner decision is to preserve that gate while correcting what `mature` means.

## Decision

### 1. `mature` is an editorial/evidentiary state, not an elapsed-time threshold

Released evaluations still use:

- `evaluation_maturity = newly_released | mature`

A released game begins as `newly_released`. It may be promoted to `mature` after an explicit maturity review once the available evidence supports reliable current-state scoring.

There is **no minimum release age** that must elapse before a game can be classified `mature`.

### 2. Maturity review criteria

A maturity review may classify a released scope as `mature` when, taken together:

1. **The evaluated scope is sufficiently settled.** The edition/mode/build being scored represents the product players are actually deciding about, and no known imminent overhaul is expected to materially reshape that profile.
2. **The evidence corpus is sufficiently deep and diverse.** The released-game evidence rules can be met for the relevant scope/platforms/current state, including material disagreement rather than only launch-day consensus.
3. **The material change trajectory is understood.** Known technical problems, balance changes, progression/economy changes, live-service additions, or remediation are understood well enough to distinguish ordinary evolution from unresolved profile-shaping instability.
4. **Current-state scoring is more informative than launch-state uncertainty.** The editor can defend the profile as a description of the present product rather than as a guess about where the product will settle.

This remains an editorial classification supported by recorded evidence; source count is not a vote and no single criterion is a mechanical timer.

### 3. Twelve months is a backstop review, not a waiting period

The twelve-month point remains useful as a mandatory maturity review/backstop for any released scope still marked `newly_released`.

- A game may become `mature` before twelve months.
- Reaching twelve months does **not** automatically make a game mature.
- A scope that still fails the maturity review may remain `newly_released` after twelve months.

### 4. Stability remains orthogonal

The existing `stability_state = stable | bounded_change | actively_changing | unknown` contract remains separate from `evaluation_maturity`.

A live-service or actively updated game can be mature when its current product identity and change pattern are sufficiently understood. Continued seasons, maps, weapons, events, tuning, or ordinary patches do not by themselves force `newly_released`.

Likewise, a nominally old game can remain epistemically immature if its evaluated scope is undergoing material remediation or transformation.

### 5. Age-sensitive subcriterion safeguards are unchanged

This ADR changes only the profile-level `evaluation_maturity` classification rule.

Any rubric/protocol safeguards that require elapsed retrospective evidence for specific subcriteria — for example memory residue / lasting-impact constraints — remain in force. Classifying a four- or ten-month-old game as `mature` does not manufacture evidence that cannot yet exist.

### 6. Maturity reviews must be auditable

For any promotion from `newly_released` to `mature`, the evaluation record/preregistration must capture at minimum:

- review date;
- evidence cutoff;
- evaluated scope/build;
- concise maturity rationale;
- material known changes still in flight;
- resulting `stability_state`.

The exact persistence shape may be finalized with the Phase 3A package/import contract, but the decision itself is effective now for calibration.

## Calibration application

For the Phase 3A cohort approved on 2026-09-02, **Battlefield 6 — Multiplayer, current state** is accepted as a mature calibration scope despite being less than twelve months from release. Its ongoing seasonal/content evolution does not, by itself, make the core multiplayer product epistemically immature.

Saros may likewise qualify through the same maturity review rather than through a release-age exception; age-sensitive subcriterion rules still apply independently.

## Supersession

Until the candidate protocol text is amended, this ADR explicitly supersedes the sentence in Scoring Protocol v1.0 §3 that says:

> `newly_released` lasts through the twelve-month maturity check; older catalog games evaluated for the first time are `mature`.

The protocol must incorporate this decision before the Phase 3A preregistration/freeze. This ADR does **not** make the candidate protocol governing; Appendix B calibration and final owner approval remain required.
