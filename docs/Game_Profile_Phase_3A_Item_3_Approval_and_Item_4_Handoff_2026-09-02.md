# Game Profile — Phase 3A Item 3 Approval and Item 4 Handoff

- **Date:** 2026-09-02
- **Owner / final editorial authority:** Tomas
- **Program:** Phase 3A — Candidate Scoring Protocol calibration
- **Item 3 preregistration merge:** `00f082022dcbf7f065453513d6f2681c01d63493`
- **Merged PR:** #36 (`docs: preregister Phase 3A calibration execution`)
- **Original reviewed draft PR:** #34, closed only because the connector could not mark a draft PR ready for review; PR #36 used the same approved head SHA `e4c204885fa170a28863bf2bb5074c92197db7ca` with no content change.

## Owner approval recorded

Tomas explicitly approved the final Phase 3A Item 3 preregistration on 2026-09-02. The approval includes:

- the exact D1–D6 and H1–H4 identities, order and statistical scopes;
- all recorded DLC/content inclusions and exclusions;
- all-ten `mature` Appendix B eligibility, including the Saros maturity determination and ADR 0035 handling for Battlefield 6;
- ADR 0036: measured primary/audit scoring through repository-controlled stateless OpenAI `gpt-5.6-sol` executions at High reasoning;
- the stronger holdout-isolation rule that forbids holdout evidence collection before candidate freeze;
- the frozen evidence/corpus, acceptance, timing and change-control rules;
- the Item 3 → Item 4 boundary.

This approval and merge complete **Master Checklist Item 3 — Preregistration**.

## What this approval does not authorize

It does **not** authorize:

- D1 research or scoring;
- any holdout exposure;
- IGDB ingestion;
- database import or migration;
- production/bulk catalog score mutation;
- publication;
- promotion of the candidate Scoring Protocol to governing status.

## Item 4 is now active

**Master Checklist Item 4 — Phase 3A engineering readiness** is the next active item and is a hard blocker before D1.

Item 4 must prove the preregistered execution contract against the approved bytes, including:

1. configured OpenAI access can call `gpt-5.6-sol` with `reasoning.effort=high` and returned model identity satisfies ADR 0036;
2. scoring calls are stateless, tool/network-free and share no prior-response state;
3. paired primary/audit semantic inputs and exposed configuration are byte-identical except an exposed differing seed;
4. structured output is validated strictly against the canonical scoring package/scoring-pass contract or an explicitly equivalent deterministic representation;
5. the semantic validator enforces the candidate protocol/schema contract and fails closed;
6. SHA-256 is computed and verified over the exact approved controlled bytes and recorded in run manifests;
7. ledger/timing/retry/validation-failure capture works;
8. model/config/schema/digest failures block rather than silently repair/substitute;
9. credentials, secrets and spend controls are handled safely.

If Item 4 cannot prove those points, D1 does not begin.

## Master checklist

1. Baseline and source audit — **COMPLETED**
2. Cohort reconciliation — **COMPLETED**
3. Preregistration — **COMPLETED**
4. Phase 3A engineering readiness — **ACTIVE / NEXT**
5. IGDB staging readiness — PENDING
6. Development run games 1–6 — PENDING
7. Development calibration analysis + launch-window/pre-release rehearsals — PENDING
8. Candidate freeze — PENDING
9. Untouched holdout run games 1–4 — PENDING
10. Acceptance report — PENDING
11. Publication preparation — PENDING
12. Deferred product follow-up / Compare parity — PENDING
