# Game Profile — Phase 3A Calibration Cohort Lock

- **Date:** 2026-09-02
- **Status:** Owner-approved cohort selection; **not** the full Appendix B preregistration
- **Program owner / final editorial authority:** Tomas
- **Primary scoring editor:** GPT-5.6-sol High
- **Methodology dependency:** Scoring Protocol v1.0 candidate plus ADR 0035 maturity amendment

## Purpose

This file is the durable cross-tool record of the Phase 3A game selection agreed by Tomas and ChatGPT before Appendix B preregistration. GitHub is the connective tissue across ChatGPT web, Codex desktop, Claude web, and Claude Code desktop; no agent should rely on chat recollection for the cohort.

This document locks **game identities and intended high-level scopes only**. Item 3 preregistration still must freeze run order, exact scope/edition/platform/build, DLC inclusion, evidence cutoff, protocol/schema/prompt versions and hashes, scorer/model snapshot/configuration, source rules, timing, blinding, acceptance gates, and holdout protections before scoring begins.

## Owner exclusions / substitutions

The following are explicitly **not** in this Phase 3A cohort:

- The Long Dark
- Forspoken
- Redfall
- Onimusha 2: Samurai's Destiny (2025 remaster)

The originally discussed Onimusha: Way of the Sword and The Blood of Dawnwalker are not used to satisfy Appendix B's mature ten-game statistical corpus. They remain appropriate launch/pre-release workflow cases outside the 6+4 agreement statistics.

## Development cohort — six

### D1 — Alan Wake 2

**Intended scope:** current complete base-game scope.

Calibration role: narrative/atmosphere-led strength, medium-specific craft, high evidence density, strong authored identity.

### D2 — Battlefield 6

**Intended scope:** Multiplayer, current state at evidence cutoff.

Calibration role: recent but mature current-state product; systems/execution-led profile; minimal conventional narrative dependence; live/seasonal evolution; current-state and platform evidence.

Maturity basis: ADR 0035. Battlefield 6 is explicitly accepted as mature for this calibration despite being under twelve months old because maturity is evidence- and stability-based, not age-gated.

### D3 — The Legend of Zelda: Tears of the Kingdom

**Intended scope:** Switch 2 Edition.

Calibration role: open/systemic structure, extreme player agency, emergent problem-solving, relatively light conventional narrative propulsion, Nintendo-exclusive/platform-specific case.

### D4 — Banishers: Ghosts of New Eden

**Intended scope:** current main-game scope.

Calibration role: long narrative RPG; strong story/character material against repetition, pacing, and execution tradeoffs; useful mixed-strength case.

### D5 — Senua's Saga: Hellblade II Enhanced

**Intended scope:** current Enhanced main-game scope.

Calibration role: short, highly authored/cinematic experience with deliberately constrained agency; difficult rubric-boundary case around craft, structure, agency, pacing, and emotional/thematic impact.

### D6 — Saros

**Intended scope:** current main-game scope on the PS5 family; exact PS5/PS5 Pro handling to be frozen at preregistration.

Calibration role: contemporary Housemarque systems/action case; punishment/repetition and run structure without simply reusing Returnal; very deep current review corpus; useful test of ADR 0035 because the game can be epistemically mature while still young enough that age-sensitive retrospective subcriterion safeguards remain relevant.

**Decision:** Saros replaces Returnal in the locked development six.

## Untouched holdout cohort — four

> **Holdout protection:** these identities are recorded here for durable project continuity. Development scoring contexts must not receive this file, prior holdout scores, expected outcomes, or holdout-specific analysis. Item 3 must make the isolation mechanism explicit and reproducible before D1 begins.

### H1 — Resident Evil 4 Remake

High-level scope only. DLC/Separate Ways inclusion must be explicitly decided with Tomas before the holdout scope is frozen/scored.

### H2 — Kingdom Come: Deliverance II

High-level scope only. Applicable DLC/expansion inclusion must be explicitly decided with Tomas before the holdout scope is frozen/scored.

### H3 — Astro Bot

High-level scope only. Any materially relevant post-launch content/DLC handling must be explicitly resolved before scoring.

### H4 — Immortals of Aveum

High-level scope only. Exact current edition/build/platform coverage to be frozen during preregistration.

## Cohort coverage intent

Collectively, the ten are intended to cover:

- narrative/atmosphere-led strengths;
- execution/agency/systems-led strengths;
- intentionally constrained or minimal conventional narrative/agency forms;
- mixed or weaker execution cases;
- short and long experiences;
- linear, open, systemic, and run-based structures;
- single-platform and multiplatform contexts;
- recent/current-state and older/retrospective evidence;
- high-consensus and credible-disagreement evidence environments;
- technical/platform variance and ongoing update patterns;
- scoring cases where low values may be descriptive rather than condemnatory.

Item 3 must re-check this coverage against Appendix B before freezing the preregistration. No title substitution occurs after this lock without Tomas's explicit approval and a revised cohort-lock record.

## Newly released and pre-release validation — required but outside the 6+4 statistics

The ten mature games are **not sufficient** to prove the production use case. Should I Play? is expected to be most valuable during release windows, when evidence is incomplete and user purchase intent is highest.

The existing Evidence SOP v0.2 §10 already defines pre-release coverage as a first-class use case and supports:

- `ANNOUNCED`, `SHOWCASED`, `HANDS-ON`, and `REVIEW-CODE / PRE-LAUNCH REVIEWS` states;
- partial scoring only where evidence directly supports it;
- exact estimates where sufficiently supported;
- bounded score ranges where evidence supports a range but not false precision;
- `Unknown` where the evidence cannot support even a bounded estimate;
- explicit `PRE-RELEASE` confidence and trust treatment;
- pre-release interpretation language such as `Looks promising if…`, `Watch before buying…`, and `Biggest unknowns…`;
- preserved pre-release history followed by fresh launch/post-release reassessment rather than carrying preview numbers forward.

Therefore Phase 3A must validate **two additional non-statistical operating cases** after development scoring and before candidate freeze:

1. **Launch-window rehearsal** — a just-released game with incomplete/moving launch evidence, to test provisional post-release scoring, confidence, patch volatility, and reassessment triggers. The Blood of Dawnwalker is the preferred first candidate if timing/evidence remain suitable.
2. **Pre-release estimation rehearsal** — an upcoming game at `SHOWCASED`, `HANDS-ON`, or `REVIEW-CODE` maturity, to test evidence-bounded exact/range/Unknown output before street date. Use the most decision-relevant upcoming game with sufficient independent evidence at execution time; current likely candidates include the September 2026 release window.

These rehearsals do **not** enter the 160 paired Appendix B agreement decisions and do not replace any holdout. If either exposes a material protocol defect, the defect is resolved before candidate freeze; any later material protocol/prompt change still follows Appendix B's holdout-reset rules.

### Boundary on “hypothesized” estimates

The product may provide **evidence-bounded expectations** for upcoming games, including ranges, but the current governing direction does not authorize free-form speculative scoring from studio pedigree, trailers, marketing promises, or genre assumptions. A hypothesis must remain visibly tied to currently observable/credible evidence and use `Unknown` where that evidence cannot bound the outcome.

If Tomas later wants a separate explicitly speculative `expected profile` layer beyond the SOP §10 pre-release model, that would be a new product/methodology decision and must not be silently folded into Game Profile scores.

## Checklist state after this lock

1. Baseline and source audit — **COMPLETED**
2. Cohort reconciliation — **COMPLETED once ADR 0035 + this lock are merged to `main`**
3. Preregistration — **NEXT / PENDING**
4. Phase 3A engineering readiness — PENDING
5. IGDB staging readiness — PENDING
6. Development run games 1–6 — PENDING
7. Development calibration analysis + launch-window/pre-release rehearsals — PENDING
8. Candidate freeze — PENDING
9. Untouched holdout run games 1–4 — PENDING
10. Acceptance report — PENDING
11. Publication preparation — PENDING
12. Deferred product follow-up / Compare parity — PENDING
