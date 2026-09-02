# Game Profile — Phase 3A Item 4 Engineering Readiness Audit

- **Date:** 2026-09-02
- **Baseline `main`:** `4782e637792c91391dc4e6c97286737cf0c75d32`
- **Active checklist item:** 4 — Phase 3A engineering readiness
- **Audit mode:** read-only repository/code + current official OpenAI API documentation
- **Owner:** Tomas
- **Orchestrator:** ChatGPT / GPT-5.6 Sol High
- **Status:** **NOT READY FOR D1**

## 0. Purpose and boundary

Item 3 froze the Phase 3A calibration contract. Item 4 must prove that the repository can execute that contract faithfully before D1 research or scoring begins.

This audit does not score a game, call production systems, ingest IGDB, mutate a database, publish anything, or make the candidate Scoring Protocol governing.

The authoritative Item 4 gates are in:

- `docs/Game_Profile_Phase_3A_Preregistration_v1.0_DRAFT.md` §12.2;
- `docs/Game_Profile_Phase_3A_Item_3_Approval_and_Item_4_Handoff_2026-09-02.md`.

## 1. Executive result

The repository currently contains substantial **contract scaffolding**, but not the measured Phase 3A execution harness required by Item 4.

What already exists:

- the frozen Phase 3A research/scoring prompts and execution instructions;
- the candidate scoring protocol and canonical package JSON Schema;
- strong schema-focused tests in `tests/scoring-package-schema.test.ts`;
- deterministic dimension derivation in `lib/scoring/derive.ts`;
- historical calibration-regression tests in `tests/calibration.test.ts`;
- existing draft/public evaluation validation paths for the product.

What is not yet implemented as a reusable Phase 3A execution system:

- OpenAI Responses API client/harness;
- live model/account probe;
- paired-pass semantic-input/configuration identity enforcement;
- reusable canonical scoring-package structural validator;
- complete protocol §15.1 semantic validator;
- controlled-input SHA-256 lock verification;
- RFC 8785 package canonicalization/digest path;
- Phase 3A run ledger/timing/retry/failure capture;
- fail-closed model/config/schema/digest guards;
- Phase 3A credential/spend guardrails.

Therefore Item 4 is **not complete** and D1 remains blocked.

## 2. Nine-gate audit

| # | Item 4 proof gate | Current status | Evidence / gap |
|---|---|---|---|
| 1 | Configured OpenAI access can call exact `gpt-5.6-sol` with `reasoning.effort=high`; returned model identity satisfies ADR 0036 | **PARTIAL — external capability verified; project access not yet probed** | Current official OpenAI docs list model ID `gpt-5.6-sol`, High reasoning, Responses API, Structured Outputs, and place `gpt-5.6-sol` in the model's Snapshots section. No credential-safe live project probe exists yet. |
| 2 | Scoring calls are stateless, tool/network-free and share no prior-response state | **MISSING** | No Phase 3A OpenAI client/harness found. |
| 3 | Paired primary/audit semantic inputs and exposed configuration are byte-identical except an exposed differing seed | **MISSING** | Prompt states the rule, but no executable pair-invariant checker/builder was found. |
| 4 | Structured output is strictly validated against the canonical scoring package/scoring-pass contract or an explicitly equivalent deterministic representation | **PARTIAL** | Canonical schema + substantial Ajv tests exist. The schema validator is exercised inside tests rather than exposed as a reusable harness validation module, and no model-output integration exists. |
| 5 | Semantic validator enforces the protocol/schema contract and fails closed | **MISSING** | `lib/admin/evaluation-validation.ts` and `lib/validation/evaluation.ts` serve other product validation responsibilities. No reusable validator implementing the complete Protocol §15.1 scoring-package semantic checklist was found. |
| 6 | SHA-256 is computed/verified over exact Item 3-approved controlled bytes and recorded in run manifests | **MISSING** | Item 3 recorded Git blob provenance, but no Phase 3A controlled-byte SHA-256 lock verifier/manifester was found. |
| 7 | Run ledger/timing/retry/validation-failure capture works | **MISSING** | Schema defines run-manifest fields, but no Phase 3A run ledger/execution recorder was found. |
| 8 | Model/config/schema/digest failures block rather than silently repair/substitute | **MISSING** | No Phase 3A execution path exists yet on which to prove fail-closed behavior. |
| 9 | Credentials/secrets/spend controls are safe | **NOT VERIFIED** | No committed `OPENAI_API_KEY` usage or Phase 3A credential code was found. This is good from a secret-leak perspective but does not prove configured credentials, redaction, or spend limits. |

## 3. Repository findings

### 3.1 No Phase 3A OpenAI execution client yet

`package.json` has no OpenAI SDK dependency and no Phase 3A harness/probe scripts. Repository search found no committed `OPENAI_API_KEY` reference. Do not infer from that absence that no secret exists in Tomas's local/runtime environment; only committed source was audited.

### 3.2 Structural package contract is real, but not yet reusable by the harness

`tests/scoring-package-schema.test.ts` directly loads the canonical schema and exercises many structural and cross-field requirements. This is valuable existing coverage, but Item 4 requires a reusable validation boundary callable by the execution harness, not test-local validation logic.

Engineering should extract/reuse—not duplicate—the contract so tests and execution call the same validator.

### 3.3 Existing scoring code does not score

`lib/scoring/derive.ts` correctly derives dimension result shapes from already-selected subcriterion values. It does not research, call a model, build claim ledgers, validate a complete scoring package, hash controlled artifacts, or maintain a run ledger.

### 3.4 Historical calibration tests are not the new 6+4 harness

`tests/calibration.test.ts` protects prior approved calibration/fixture behavior. It is historical regression coverage and must not be treated as evidence that Appendix B's newly preregistered six-development/four-holdout program has started or passed.

### 3.5 Existing admin/public validation is not Protocol §15.1

The current evaluation-validation modules protect product/admin/read-path contracts. They do not constitute the complete scoring-package semantic validator required by Protocol §15.1 and Item 4.

## 4. Current OpenAI API facts relevant to implementation

Verified against current official OpenAI developer documentation on 2026-09-02:

- `gpt-5.6-sol` is the flagship GPT-5.6 Sol model ID; `gpt-5.6` is the alias.
- `gpt-5.6-sol` supports Responses API, Structured Outputs and `reasoning.effort = high`.
- The GPT-5.6 Sol model page lists `gpt-5.6-sol` in its **Snapshots** section. Item 4 must still verify that a live project response returns the exact preregistered model identity rather than an unexpected substitute.
- GPT-5.6 defaults persisted reasoning context to `all_turns`. For the preregistered independent stateless scoring calls, the harness should explicitly request `reasoning.context = current_turn` and must not supply `previous_response_id` or a conversation linkage.
- `store = false` is available in the Responses API and should be used for these calibration calls.
- The response object exposes a `model` field and usage metadata that can be recorded without logging response secrets.

Official references reviewed:

- https://developers.openai.com/api/docs/guides/latest-model
- https://developers.openai.com/api/docs/models/gpt-5.6-sol
- https://developers.openai.com/api/reference/cli/resources/responses/methods/create
- https://developers.openai.com/api/reference/cli/resources/responses/methods/retrieve

The full canonical package schema is large and contract-rich. Although GPT-5.6 Sol supports Structured Outputs, Item 4 must **test** whether the exact model-facing schema required for one `scoringPass` is accepted by the API. It must not assume the full canonical package schema can be passed unchanged. The preregistration permits an explicitly equivalent deterministic scoring-pass representation so long as the wrapper deterministically assembles and then fully validates the canonical package.

## 5. Frozen controlled inputs

Item 4 must use the exact Item 3-approved repository bytes, not chat attachments or reconstructed text:

| Controlled input | Approved Git blob SHA |
|---|---|
| `docs/scoring/Phase_3A_Execution_System_Instructions_v1.0.md` | `caa241d45f3c6619ae7b139cd0e135a8168ee009` |
| `docs/scoring/Phase_3A_Research_Prompt_v1.0.md` | `401920703c9d3e8577641c3616e9c7d39bbd71a0` |
| `docs/scoring/Phase_3A_Scoring_Prompt_v1.0.md` | `64ae778e1d93d9f9b0c7faa7902a447154a0bc89` |
| `docs/Game_Profile_Scoring_Rubric_v1.0.md` | `93524fd398099423e31f8b7f88c0efd7886c7b66` |
| `docs/Game_Profile_Scoring_Protocol_v1.0_DRAFT.md` | `1fa2707421518396c6c68ca26d36c5d98df92e7b` |
| `docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json` | `9cee78be1b70e463e67b1dbea51678039269918b` |

The harness must verify those blob identities and compute lowercase SHA-256 over the exact bytes for the run manifests. A Git blob SHA is provenance, not a substitute for protocol-required SHA-256.

## 6. Decision / next action

**Do not start D1.**

The next action is the bounded Item 4 calibration-harness engineering assignment in:

`docs/work-orders/Phase_3A_Item_4_Calibration_Harness_Engineering_Work_Order_2026-09-02.md`

After engineering completes, ChatGPT/GPT-5.6 Sol High must audit the implementation and proof artifacts gate-by-gate. Item 4 closes only when all nine gates have concrete evidence on current `main` and Tomas accepts any material decision that emerges from an actual incompatibility.
