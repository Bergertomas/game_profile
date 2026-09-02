# Phase 3A Item 4 — Calibration Harness Engineering Work Order

- **Date:** 2026-09-02
- **Program:** Should I Play — Phase 3A Candidate Scoring Protocol calibration
- **Owner:** Tomas
- **Orchestrator/editorial scorer:** ChatGPT / GPT-5.6 Sol High
- **Engineering assignee:** Codex or Claude/Claude Code
- **Baseline audit:** `docs/audits/Game_Profile_Phase_3A_Item_4_Engineering_Readiness_Audit_2026-09-02.md`
- **Status:** implementation assignment; **does not authorize D1 research/scoring**

## 0. Mission

Build and prove the smallest repository-controlled, offline calibration harness that faithfully implements the owner-approved Phase 3A execution contract.

The harness exists to run measured research/scoring workflows later. This assignment uses fixtures/mocks and one credential-safe capability probe only. It does **not** research or score Alan Wake 2 or any other calibration game.

Do not alter scoring semantics, rubric anchors, cohort membership/scope, holdout rules, evidence rules, acceptance thresholds, production data, IGDB state, or publication behavior.

## 1. Mandatory preflight

Before coding:

1. verify current `main`;
2. read root `AGENTS.md` and `docs/Should_I_Play_Orchestrator_Bootstrap.md`;
3. read the current Master Plan and Working Agreement;
4. read:
   - `docs/Game_Profile_Phase_3A_Preregistration_v1.0_DRAFT.md`;
   - `docs/Game_Profile_Phase_3A_Item_3_Approval_and_Item_4_Handoff_2026-09-02.md`;
   - `docs/decisions/0035-released-game-maturity-is-evidence-and-stability-based.md`;
   - `docs/decisions/0036-phase3a-measured-scoring-execution-surface.md`;
   - the Item 4 readiness audit named above;
   - all six controlled inputs in the preregistration provenance table;
5. inspect `tests/scoring-package-schema.test.ts`, `lib/scoring/derive.ts`, `lib/admin/evaluation-validation.ts`, related schemas/tests, and current package scripts before designing new code.

Create a fresh engineering branch from current `main`. Do not work directly on `main`.

## 2. Hard execution contract

Measured scoring calls must be configured as follows unless the current preregistration is explicitly amended by Tomas:

- provider: OpenAI;
- API: Responses API;
- exact model: `gpt-5.6-sol` — never substitute the moving `gpt-5.6` alias;
- `reasoning.effort = high`;
- standard reasoning mode; do not enable Pro mode;
- explicitly set `reasoning.context = current_turn` for independent/stateless scoring calls;
- `store = false`;
- no `previous_response_id`;
- no conversation linkage;
- `tools = []` / no network or tool access in scoring;
- all exposed model/configuration parameters recorded;
- paired primary/audit semantic inputs and exposed configuration byte-identical except a seed when the API exposes one;
- if no seed exists, record `parameter_unavailable`; never fabricate one;
- response `model` must equal the preregistered exact model ID or the run fails closed.

The model output is an editorial scoring pass. Codex/Claude may execute and validate the call but may not change a score, claim, rationale, anchor, confidence fact or Unknown decision because it disagrees with the model.

## 3. Deliverables

### 3.1 Controlled-input lock verifier

Implement one reusable module/command that:

- loads the six controlled files from the repository;
- verifies each exact Item 3-approved Git blob SHA;
- computes lowercase SHA-256 over the exact bytes;
- emits a deterministic lock manifest containing path, Git blob SHA and SHA-256;
- fails closed on any byte/blob mismatch;
- never rewrites the controlled files.

The six approved blob SHAs are authoritative in the preregistration. Do not replace them with newly generated values.

### 3.2 Reusable structural package validator

Extract or build a reusable Ajv-based validator for the canonical current schema:

`docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json`

Requirements:

- the execution harness and tests call the same reusable validator;
- strict/closed-schema behavior is preserved;
- existing schema tests remain green;
- do not fork a second hand-maintained schema definition.

### 3.3 Protocol semantic validator

Implement a reusable fail-closed semantic validator covering the full current Protocol §15.1 checklist that is not expressible by JSON Schema alone.

At minimum it must deterministically verify the currently governing candidate-contract requirements for:

- exact unique active decision sets;
- canonical query-family coverage;
- source/claim/reference integrity and claim-link consistency;
- A/B cluster collection counts and declared collection standard;
- no active Tier-D support for numeric decisions;
- required facets/minimum derivation;
- score/Unknown/zero/endpoint-gate rules;
- coverage-frame derivation and retrospective date/evidence constraints;
- platform-override validity;
- primary/audit pair invariants;
- difference classification and recomputed audit metrics;
- owner-review/adjudication requirements;
- dimension/confidence derivation parity;
- evaluation scope/release/maturity/evidence-status consistency;
- reassessment graph/baseline/disposition rules;
- canonical content digest/approval binding.

Do not weaken or silently reinterpret a protocol rule because implementation is inconvenient. If a rule cannot be implemented unambiguously, stop and report the exact ambiguity to ChatGPT/Tomas rather than inventing semantics.

### 3.4 RFC 8785 / content-digest implementation

Implement and test the protocol's package digest contract:

- canonicalize `scoring_content` using RFC 8785 JSON Canonicalization Scheme bytes;
- compute lowercase SHA-256;
- verify `content_digest`;
- verify `owner_approval.approved_digest` binding when approval is present/required;
- fail closed on mismatch.

Prefer a small, mature library if it demonstrably implements RFC 8785 correctly; otherwise provide rigorous canonicalization fixtures. Do not use ordinary `JSON.stringify` as a claimed RFC 8785 implementation unless equivalence is proven for the full allowed value space.

### 3.5 Model-facing scoring-pass Structured Output contract

The canonical scoring prompt requires one `scoringPass` output, not a complete approved package.

Determine empirically whether the exact model-facing scoring-pass schema needed by the contract is accepted by OpenAI Structured Outputs. If the canonical package schema cannot be supplied directly because of API JSON-Schema limitations, implement an **explicitly equivalent deterministic scoring-pass schema** that:

- contains every field the model is responsible for producing;
- cannot alter score semantics;
- is deterministically mapped into the canonical package representation;
- is validated locally against the canonical schema + semantic validator before any run counts.

Document the equivalence/mapping. Do not omit difficult fields merely to make Structured Outputs accept the schema.

### 3.6 OpenAI client and credential-safe live probe

Implement a manual live capability probe separate from CI.

The probe should:

- read credentials from environment/runtime configuration only;
- never print, store, serialize or commit the API key;
- send a tiny fixed non-game prompt with a deliberately small output cap;
- call exact `gpt-5.6-sol`, High reasoning, standard mode, `reasoning.context=current_turn`, `store=false`, no previous response/conversation and no tools;
- report only safe metadata needed for Item 4, such as success/failure, returned model ID, effective reasoning configuration where exposed, response ID if useful for audit, token usage and elapsed time;
- avoid printing model response prose unless needed to prove the structured-output contract;
- fail if returned `model` is not exactly `gpt-5.6-sol`;
- record whether the live API exposes any stronger snapshot/build identifier beyond the exact model ID.

The current official OpenAI model catalog lists `gpt-5.6-sol` itself in GPT-5.6 Sol's Snapshots section. The probe must still verify actual project access and returned identity.

CI must use mocks and must never make a billable live OpenAI call.

### 3.7 Stateless paired-call builder / invariant checker

Implement one canonical builder for the semantic scoring request. Primary and audit must be generated from the same serialized semantic input/configuration.

Required proof:

- canonical scope bytes identical;
- coverage-frame bytes identical;
- normalized corpus bytes and canonical source order identical;
- rubric/protocol/scoring prompt/output-contract bytes identical;
- model/configuration identical;
- no run-role string changes the semantic model input;
- primary/audit role is assigned only as wrapper/run metadata after/beside model output;
- exposed differing seed is the only allowed pair difference if a seed parameter exists.

Persist/request a digest of the canonical semantic request so drift is mechanically detectable.

### 3.8 Run ledger and effort/timing capture

Implement local, non-production Phase 3A run artifacts/ledger with deterministic IDs and append-only/revision-safe behavior sufficient to preserve:

- run ID/role;
- UTC timestamps;
- provider/model/returned model identity;
- controlled-input hashes;
- corpus/input/request digests;
- exposed decoding/reasoning parameters;
- seed or `parameter_unavailable`;
- retry count;
- validation failures;
- human corrections (normally empty; any semantic correction invalidates the measured attempt);
- structured-output digest;
- API elapsed time;
- active QA/validation time where supplied by the operator;
- token usage;
- safe error class/message with secret redaction.

Run artifacts must not be committed by default. Add an appropriate ignored local artifact directory and sanitized fixtures only.

### 3.9 Retry and fail-closed policy

Implement tests and behavior so that:

- model mismatch blocks;
- incorrect reasoning/config blocks;
- any tool/network capability in a scoring request blocks;
- conversation/previous-response linkage blocks;
- controlled-byte or digest mismatch blocks;
- malformed/invalid Structured Output blocks;
- canonical schema failure blocks;
- semantic-validator failure blocks;
- pair-input/config drift blocks;
- secret leakage checks block/flag;
- no model result is silently repaired into a counted run.

A retry after an API/structural failure is a new clean attempt and is recorded. It may not feed the invalid output back to the model as context. Semantic changes to model-produced scoring content are not engineering repair.

### 3.10 Spend controls

Implement conservative calibration-specific controls without changing the owner-approved choice of High reasoning:

- live commands require explicit opt-in (for example `--live` or equivalent);
- model fixed to preregistered ID;
- maximum output tokens explicitly bounded/configured for probes and run type;
- usage captured for every live call;
- no accidental loop/bulk mode;
- no automatic catalog execution;
- no CI live calls.

Do not invent a production billing/account policy. The goal is to prevent accidental Phase 3A spend and bulk calls.

## 4. Suggested command surface

Names may vary if repository conventions demand it, but provide equivalent explicit commands for:

- verifying the controlled-input lock;
- validating a package fixture structurally + semantically;
- comparing/verifying a paired request fixture;
- running a mocked scoring-call harness test;
- running the manual credential-safe live model probe;
- printing a safe Item 4 proof report.

There must be no command that bulk-scores the catalog.

## 5. Required tests

Add deterministic tests covering at least:

1. all six approved blob locks and SHA-256 generation;
2. controlled-byte drift failure;
3. reusable canonical schema success/failure;
4. semantic validator positive fixture;
5. one targeted negative fixture for every Protocol §15.1 semantic rule family;
6. RFC 8785 digest known vectors and package binding;
7. model ID mismatch;
8. reasoning effort/context mismatch;
9. Pro-mode rejection;
10. nonempty tools/tool access rejection;
11. previous-response/conversation linkage rejection;
12. `store !== false` rejection for measured scoring;
13. primary/audit semantic request equality;
14. pair drift detection;
15. seed handling when available/unavailable;
16. structured-output mapping equivalence;
17. invalid output is not silently repaired;
18. clean retry accounting;
19. ledger/timing/usage recording;
20. secret redaction / fixture contains no live key;
21. live probe command cannot run in ordinary CI by accident.

Existing repository quality, DB-read, browser/integration and production Worker gates must continue to pass.

## 6. Proof package required from engineering

Return a reviewable PR with:

- objective and exact boundary;
- files changed;
- architecture note for request construction, validation and ledger;
- dependency additions and why;
- all relevant test commands/results;
- the safe live probe result if a configured credential is available in the engineering environment;
- Item 4 gate matrix showing which gates the PR claims to satisfy and exact evidence for each;
- explicit unresolved blockers/assumptions;
- confirmation that no calibration game was researched/scored and no production/IGDB/database/publication action occurred.

Do not mark Item 4 complete in the bootstrap yourself. ChatGPT/Tomas performs the post-implementation gate audit and advances the checklist only after evidence is accepted.

## 7. Stop conditions / owner escalation

Stop and escalate rather than altering methodology if any of these occur:

- exact `gpt-5.6-sol` cannot be called by the configured project/account;
- live returned model identity does not satisfy the frozen exact-model contract;
- the API cannot provide an independent/stateless execution consistent with ADR 0036;
- the scoring-pass contract cannot be represented in Structured Outputs without semantic loss;
- a Protocol §15.1 rule is ambiguous or impossible to validate deterministically;
- the approved controlled bytes no longer match their Item 3 blob locks;
- implementation would require changing scoring anchors, confidence rules, holdout rules or acceptance gates.

Those are program-owner decisions, not engineering discretion.
