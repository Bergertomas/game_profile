# Phase 3A D1 — run-preparation handoff

This handoff is preparation only. It does not start Alan Wake 2 research or scoring and does not accept an IGDB identity mapping.

The next D1 execution slice consumes exactly these new records:

- `lib/calibration/run-input.ts` → `D1_RUN_INPUT`: immutable preregistered Alan Wake 2 base-main-campaign inputs, including the explicit `Night Springs` / `The Lake House` exclusions, current mature-eligibility record, and the fail-closed maturity gate. `freezeD1EvaluationScope(date)` adds the only value that cannot truthfully exist before research — the corpus-freeze UTC date — and validates the resulting object against the canonical `/$defs/evaluationScope` schema.
- `lib/calibration/run-identity.ts` → `D1_IDENTITY_PROPOSAL`: proposal-only IGDB canonical-game identity (`185246`). Before any database candidate is accepted, the provider record must be staged/verified and ADR 0037's named-person decision boundary remains intact.

The later execution transport must not mutate the locked scope semantics. It should revalidate maturity immediately before collection, perform isolated research collection, deterministically freeze the corpus and call `freezeD1EvaluationScope` with `frozen_at`'s UTC calendar date, then build byte-identical semantic primary/audit scoring inputs and run validation/ledger capture. GPT-5.6 Sol High remains the scorer. Holdout material must not enter any D1 research or scoring context.

If current-state revalidation no longer supports D1's preregistered `mature` classification, or reveals a material profile-shaping change in flight, stop before corpus collection and record the defect under the preregistration's versioning/rerun rules rather than changing scope in place.

Slice B consumes these records and takes D1 as far as a frozen, hashed research corpus. See `Phase_3A_D1_Research_and_Corpus_Freeze_Handoff.md` for the command, gates, artifacts and the exact input slice C's paired scoring transport consumes.
