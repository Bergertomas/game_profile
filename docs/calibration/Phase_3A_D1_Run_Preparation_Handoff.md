# Phase 3A D1 — run-preparation handoff

This handoff is preparation only. It does not start Alan Wake 2 research or scoring and does not accept an IGDB identity mapping.

The next D1 execution slice consumes exactly these new records:

- `lib/calibration/run-input.ts` → `D1_RUN_INPUT`: immutable preregistered Alan Wake 2 base-main-campaign scope, including the explicit `Night Springs` / `The Lake House` exclusions and the mature-scope fail-closed revalidation gate.
- `lib/calibration/run-identity.ts` → `D1_IDENTITY_PROPOSAL`: proposal-only IGDB canonical-game identity (`185246`). Before any database candidate is accepted, the provider record must be staged/verified and ADR 0037's named-person decision boundary remains intact.

The later execution transport must not mutate these locked scope semantics. It may add run-time evidence-cutoff timestamps/manifests and staged-provider provenance around them, then perform the preregistered sequence: isolated research collection → deterministic corpus freeze → byte-identical semantic primary/audit scoring inputs → validation/ledger. GPT-5.6 Sol High remains the scorer. Holdout material must not enter any D1 research or scoring context.

If current-state revalidation no longer supports D1's preregistered `mature` classification, or reveals a material profile-shaping change in flight, stop before corpus collection and record the defect under the preregistration's versioning/rerun rules rather than changing scope in place.
