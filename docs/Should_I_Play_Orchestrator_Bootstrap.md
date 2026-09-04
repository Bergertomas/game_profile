# Should I Play? — Orchestrator Bootstrap

- **Purpose:** small mandatory start-here index for material project work across ChatGPT, Codex, Claude web, and Claude Code
- **Authority:** navigation/status aid only; it does not supersede the documents it points to
- **Owner:** Tomas
- **Orchestrator:** ChatGPT / GPT-5.6 Sol High
- **Repository:** `Bergertomas/game_profile`

## Why this exists

GitHub is the durable connective tissue across the project's different AI and desktop/web execution surfaces. Chat memory is useful continuity, but it is not the project constitution. A new agent/session should be able to recover the current operating state without rereading every historical document or relying on a previous conversation summary.

This file is intentionally short. It points to authority; it does not duplicate authority.

## Session activation by surface

The repository can define one project preflight, but different products discover it differently.

- **Codex / repository-native OpenAI agents:** `AGENTS.md` is the automatic repository entrypoint. `AGENTS.md` therefore makes this bootstrap a mandatory preflight read before material work.
- **Claude Code:** the repository `CLAUDE.md` imports `AGENTS.md`; the same preflight therefore flows into Claude Code sessions through its repository instruction mechanism.
- **ChatGPT web/app project chats and Claude web project chats:** the presence of this file in GitHub does **not by itself force an arbitrary new web chat to open it**. The corresponding Project instructions must explicitly require live repository preflight: verify current `main`, read `AGENTS.md`, read this bootstrap, then follow its active/task-specific read set. If repository access is unavailable, the agent must disclose that and avoid material project decisions from chat/model memory alone.

For web/chat orchestration, the first substantive material response of a new session should visibly include a receipt in this form:

`Project preflight: main <short SHA> · bootstrap read · active item <number/name>`

Absence of that receipt means the web-chat preflight has not been demonstrated. This receipt is a process check, not a substitute for actually reading the files.

## Mandatory start sequence for material work

Before making a material product, methodology, scoring, architecture, data, design, publication, or roadmap decision:

1. **Verify the current `main` HEAD.** Do not assume a previously remembered commit is still current.
2. Read `AGENTS.md`.
3. Read this bootstrap.
4. Read the current Master Plan and the governing owner decisions/resolutions named below.
5. Read the **active-phase records** named below.
6. Read the task-specific governing document(s), relevant ADRs, and affected code/tests before acting.
7. If two sources conflict, apply the authority/conflict rules in the Master Plan and Working Agreement. Prefer the newest explicit approved decision within the subject; record the resolution so it does not recur.
8. Never infer product/methodology truth from fixture copy, mock values, implementation accidents, chat recollection, or a design specimen.

Do **not** blindly read every historical document at the start of every task. Historical plans/calibrations are read when the current authority or task requires them.

## Current constitution / always-relevant authority

- `docs/Game_Profile_Master_Product_and_Build_Plan_v0.9.md` — current product/roadmap constitution.
- `docs/Should_I_Play_Public_Product_P0_Decisions_2026-08-24.md` — governing owner P0 decisions.
- `docs/Should_I_Play_Public_Product_Resolutions_2026-08-25.md` — later governing public-product resolutions.
- `docs/Should_I_Play_Working_Agreement.md` — collaboration, authority, branch/PR, and operating rules.
- `docs/Game_Profile_Scoring_Rubric_v1.0.md` — scoring semantics.
- `docs/Game_Profile_Editorial_Evidence_and_Data_Sourcing_SOP_v0.2.md` — evidence operations and pre-release workflow, except where explicitly superseded.
- `docs/Game_Profile_Scoring_Protocol_v1.0_DRAFT.md` + package schema + accepted amendments — candidate evidence-to-number contract while Phase 3A is active; **not governing** until its gates pass and Tomas gives final approval.
- `docs/design/Should_I_Play_Canonical_Design_Source.md` — where the accepted Claude Design artifact lives and how to import it; mandatory before any visual implementation or conformance work on an accepted public surface (Issue #47). It is a locator, not a design manual.

## Execution surfaces and process authority

- `docs/Should_I_Play_Working_Agreement.md` is the **current cross-chat operating agreement**: task framing, Claude-first execution and effort routing, routine Git/PR authority, review thresholds, verification depth, integration, and the owner-reserved actions Tomas must authorize. Chat recollection of an older approval ceremony does not override it.
- The repository-native Claude runner (official Claude Code GitHub Action) is **operational**: merged in PR #54 and successfully smoke-tested in PR #56. `docs/operations/Claude_Code_GitHub_Runner.md` owns its triggers, effort lanes, and safety boundaries; read it before a runner task rather than restating it here.
- The event-driven ChatGPT Work wake bridge is **merged but not yet working** (PR #83). Live GitHub disproves the merged behaviour on `main`: PR #83's review comment `5539488946` and bridge run `33886463641` show Claude completions falling through the workflow discriminator and the wake comment failing to post. Issues #94 and #99, and PRs #98 and #100 — open and unmerged — carry the bounded corrections and own the defects, the fix and its proofs; do not restate them here. The bridge is therefore **not** a completion signal, the live smoke test in `docs/operations/ChatGPT_Work_GitHub_Wake.md` remains unpassed, and the hourly autonomous checkpoint remains the normal throughput clock as well as the watchdog. By design the bridge emits bounded event metadata only; it never chooses successor work, decides acceptance, merges, or advances the checklist. That guide and Working Agreement §9.1 own the contract.
- GPT-5.6 Sol High remains program owner/orchestrator and the designated Phase 3A editorial scorer. The runner may implement, test, commit, push, and create/update its task PR; it does not self-merge, declare checklist acceptance, mutate production, publish editorial/scoring content, or broaden its assignment.

## Active checkpoint — Phase 3A, Item 6 / D1 in progress

As of 2026-09-04, against `main` at `a5c66a2c138c897b468bc1b392fc87d38721878c`:

- Item 1 — baseline/source audit: **complete**.
- Item 2 — cohort reconciliation: **complete**.
- Item 3 — preregistration: **complete**; owner-approved and merged at `00f082022dcbf7f065453513d6f2681c01d63493`.
- Item 4 — Phase 3A engineering readiness: **complete**; final orchestrator ruling 9/9 PASS, recorded on PR #46 (conversation comment `5515828479`), merged at `79f0159b31009173ede153cfc77729d6d2e5ec91`. Issue #44 was the coverage-state blocker, later closed; it does not carry the ruling. That ruling also closed the Amendment 1–4 exact-byte review — see the preregistration note in the read set below.
- Item 5 — IGDB staging readiness: **complete**; final readiness ruling **PASS / COMPLETE** in PR #52 review `5106252929` against exact implementation head `a292e9b19dda9a371c5c8701d579db30f3439996`. Issue #48 is closed as completed. The post-acceptance integration gate is closed — see below.
- Item 6 — development run games D1–D6: **active**. D1 (Alan Wake 2) is the current development run; preparation slices A, B and C are all merged, so the D1 engineering transport exists end to end, and the run's research/scoring executions have **not** been performed. The engineering corrections behind the post-Slice-C readiness audit's **BLOCKED** ruling (issue #84) have landed — PR #90 and PR #91 are merged — and the final read-only preflight (issue #95) returned an engineering-readiness recommendation of **READY** against this same `main`. Issues #84, #87, #88 and #95 are all closed. What remains is the orchestrator's own measured D1 research execution, and it has **not** been run.
- Items 7–12: unchanged.
- **No Phase 3A calibration scoring has begun; no D1 research or scoring execution has run.** Slices B and C merged the research-collection/corpus-freeze and paired primary/audit scoring *transports*, proved against synthetic fixtures; a merged transport is not an executed run. Only D1 preparation records and those transports exist. Verify against live GitHub before asserting otherwise.
- Candidate Scoring Protocol v1.0 remains non-governing until its later calibration, freeze, and adoption gates pass.
- No production/bulk catalog score mutation is authorized. The one completed production action is the bounded `0011_igdb_staging` schema migration recorded below; it authorizes nothing further.

### Post-acceptance integration gate — complete

The Item 5 ruling accepted the staging architecture; it did not by itself authorize the authoritative migration or the merge. Under Tomas's explicit, bounded authorization on PR #52, the orchestrator ran the read-only preflight and applied migration `0011_igdb_staging` to the authoritative production database, then verified it (one Drizzle journal row at `created_at=1788445599007`, the 11 expected `igdb_*` tables, the identity/provider uniqueness indexes, the append-only trigger). PR #52 was reconciled against `main` at head `d3b49e9eecafb3341fa2eaf9519beb452b314bd3` and merged through the ordinary reviewed path. Item 6 / D1 is therefore unblocked.

That authorization covered `0011_igdb_staging` only. It was never a standing production-mutation licence, it does not extend to any later migration, and it remains unrelated to ADR 0024 §6's future scoring-package migration 4, which still needs its own owner decision. The generic runner still does not apply migrations, mutate production, or merge on its own initiative.

### Active D1 dependency sequence

D1 was prepared in small dependency-ordered slices under parent issue #63, now closed as completed. None of them score:

1. **Slice A — merged (PR #66).** Immutable preregistered D1 scope/run-input (`lib/calibration/run-input.ts` → `D1_RUN_INPUT`, with the `Night Springs` / `The Lake House` exclusions, the mature-eligibility record, the fail-closed maturity gate and `freezeD1EvaluationScope`) and **proposal-only** IGDB identity (`lib/calibration/run-identity.ts` → `D1_IDENTITY_PROPOSAL`). No identity is accepted or promoted, and no research or scoring input exists yet.
2. **Slice B — merged (PR #76, issue #68 closed).** The controlled research collection pass and deterministic corpus freeze, consuming slice A's records unchanged: the fail-closed gate order, the web-search-only research contract, the deterministic hashed corpus freeze and the run receipt (`lib/calibration/holdout-isolation.ts`, `research-pass.ts`, `d1-research.ts`, `npm run calib:d1-research`). The transport exists and is tested against synthetic fixtures; **no live D1 research collection has been executed and no corpus has been frozen from real evidence.** It does not score.
3. **Slice C — merged (PR #81, issue #77 closed).** The isolated paired primary/audit scoring transport consuming one already-frozen slice-B run directory: the six preflight gates, the byte-identity pair proof, two isolated non-retrying calls, pass-scoped validation and the receipts (`lib/calibration/d1-scoring.ts`, `npm run calib:d1-scoring`). Proved against synthetic fixtures; **no live scoring pair has been executed.** It chooses no score, anchor, rationale, confidence or adjudication, and GPT-5.6 Sol High remains the sole D1 editorial scorer.

The read-only post-Slice-C execution readiness audit (issue #84) delivered a **BLOCKED** ruling against `main` at `3acca852e387b6c2256156a9eb15884e68d70f14`. Issue #87 carried its bounded implementation corrections, and they are merged:

- **PR #90 (`4200149`, issue #89 closed)** narrowed the scoring transport's holdout guard to wrapper-authored material, so an incidental holdout-title mention inside an admitted D1 source body is reported rather than refused.
- **PR #91 (`a51be6d`, issue #88 closed)** made digest-bound artifact writes verbatim, read-back verified and attempt-immutable, covering defects 1 and 2.

**Issues #84, #87 and #88 are closed.** #87 records those as implementation corrections, not a methodology amendment; #84, #87, #90 and #91 own the exact findings, the orchestrator's holdout-isolation interpretation and the required proofs — do not restate or re-derive them here.

**Engineering readiness is READY.** The final read-only preflight (issue #95, closed) re-drove the merged A→B→C path on this `main` with synthetic fixtures only, re-verified current-state Alan Wake 2 maturity eligibility under ADR 0035 from first-party sources, spent no billable call, and returned **READY**. It also discloses one **non-blocking** residual in the holdout guard's identifier patterns, with a mandatory pre-spend operator inspection and an optional bounded correction the orchestrator may take first; #95 owns that finding, the exact operator command sequence and the maturity-observation shape — read it there rather than restating it. READY is an engineering recommendation, not an owner or orchestrator acceptance.

**The next measured step is the orchestrator's own.** It is `npm run calib:d1-research -- --live` on a credentialed non-CI runtime — the harness refuses `--live` inside CI — with a maturity observation freshly stamped at the moment of observation, since the gate refuses one older than 24 hours; the paired scoring execution follows it under the preregistered contract. **That call has not been made: no live D1 research or scoring has occurred, and no corpus has been frozen from real evidence.** No engineering agent executes a live D1 research or scoring call on its own initiative.

The slice handoffs own the exact records each next slice consumes; do not restate or re-derive them here. `docs/calibration/Phase_3A_D1_Run_Preparation_Handoff.md` owns slice A's records, `docs/calibration/Phase_3A_D1_Research_and_Corpus_Freeze_Handoff.md` owns the frozen-corpus contract, and `docs/calibration/Phase_3A_D1_Paired_Scoring_Transport_Handoff.md` owns the scoring-transport command, gates, artifacts and the point where editorial scoring begins.

Slices B and C deliberately **reported rather than resolved** the bounded questions they surfaced — controlled Item 3 bytes are owner-approved and immutable to an engineering slice. Those items are stated in their own handoffs and remain open orchestrator/owner decisions; this checkpoint does not close them, the issue #84 audit classified them and the issue #95 preflight carried them forward unchanged, and no agent should resolve one by editing a controlled input.

Read these records before any Phase 3A work.

On `main`:

- `docs/decisions/0035-released-game-maturity-is-evidence-and-stability-based.md`
- `docs/decisions/0036-phase3a-measured-scoring-execution-surface.md`
- `docs/Game_Profile_Phase_3A_Cohort_Lock_2026-09-02.md`
- `docs/Game_Profile_Phase_3A_Preregistration_v1.0_DRAFT.md` — a frozen controlled-input record with two known stale-by-design passages; this checkpoint and the rulings it cites are current.
  - §14's master-checklist state is an Item-3-era snapshot.
  - §15.5's closing sentence — "Amendments 1 through 4 are pending exact-byte review" — records the position before that review closed. Gate 6 of the later final Item-4 ruling on PR #46 (conversation comment `5515828479`) is **PASS — controlled freeze / provenance**, approving the exact controlled bytes at lock digest `4d78ed79c02654972a96e02f0211282e0b4386ed9e93c16cf2de255375d7c2ce` — the same digest §15.5 records. The exact-byte review is therefore **closed, and is not a D1 blocker**. The frozen preregistration text stands as written; this note carries the active status.
- `docs/Game_Profile_Phase_3A_Item_3_Approval_and_Item_4_Handoff_2026-09-02.md`
- `docs/calibration/Phase_3A_Item_4_Harness_Architecture_and_Equivalence.md`
- `docs/scoring/Phase_3A_Execution_System_Instructions_v1.0.md`
- `docs/scoring/Phase_3A_Research_Prompt_v1.0.md`
- `docs/scoring/Phase_3A_Scoring_Prompt_v1.0.md`
- `docs/audits/Game_Profile_Phase_3A_Item_5_IGDB_Staging_Forensic_Audit_2026-09-02.md` — landed with PR #52
- `docs/calibration/Phase_3A_Item_5_IGDB_Staging_Readiness_Record.md` — module map, API-vs-dump strategy, live proofs, rollout and remaining gates; landed with PR #52
- `docs/decisions/0037-igdb-staging-identity-and-provenance.md` — the Item-5 identity/provenance decision record that bounds D1 identity work; landed with PR #52, with the status note below
- `docs/calibration/Phase_3A_D1_Run_Preparation_Handoff.md` — mandatory before any D1 execution slice; landed with PR #66
- `docs/calibration/Phase_3A_D1_Research_and_Corpus_Freeze_Handoff.md` — the slice-B gates, freeze contract and the artifacts slice C consumes; mandatory before D1 research or scoring transport work; landed with PR #76, artifact layout reconciled by PR #91
- `docs/calibration/Phase_3A_D1_Paired_Scoring_Transport_Handoff.md` — the slice-C gates, pair proof, validation boundary and operator sequence; mandatory before any D1 scoring execution or readiness ruling; landed with PR #81, reconciled by PR #90 and PR #91

Two status lines elsewhere lag this checkpoint. Treat both as drift to reconcile at the next owner/orchestrator checkpoint, not as current status and not as licence for an agent to restate them:

- ADR 0037's own header still reads **Proposed**. The Item-5 ruling, the PR #52 merge and issue #63 all treat its boundary as the accepted one that D1 works under; only the owner/orchestrator flips that header.
- Master Plan v0.9's status/checkpoint lines still describe Item 6 as pending behind the integration gate. The Plan remains the product/roadmap constitution; this bootstrap carries the running phase status it names.

Historical Item-4 records — read on demand, not as active status:
`docs/audits/Game_Profile_Phase_3A_Item_4_Engineering_Readiness_Audit_2026-09-02.md` and
`docs/work-orders/Phase_3A_Item_4_Calibration_Harness_Engineering_Work_Order_2026-09-02.md`
describe the assignment before it closed. Where those files and the harness architecture record still read "Item 4 incomplete" or "Gate 1 PARTIAL", they predate the final 9/9 PASS ruling on PR #46 (conversation comment `5515828479`); that ruling governs. Treat the wording as drift to reconcile at the next checkpoint, not as current status.

### Locked cohort

Development: Alan Wake 2; Battlefield 6 Multiplayer; The Legend of Zelda: Tears of the Kingdom — Switch 2 Edition; Banishers: Ghosts of New Eden; Senua's Saga: Hellblade II Enhanced; Saros.

Untouched holdout: Resident Evil 4 Remake; Kingdom Come: Deliverance II; Astro Bot; Immortals of Aveum.

The cohort-lock file, not this summary, owns identities/high-level scopes.

### Phase 3A role boundary

- **GPT-5.6 Sol High:** research/synthesis orchestration, editorial scoring judgments, rationales/caveats/confidence, calibration analysis and recommendations.
- **Codex / Claude / Claude Code:** engineering support: validators, harnesses, schemas, fixtures, timing/ledger, blinding/isolation, IGDB staging/provenance, tests, branches and PRs. They do not change scoring semantics or substitute their judgment for the designated GPT scorer.
- **Tomas:** final editorial/product authority; approves cohort/scope/DLC choices, material methodology changes, preregistration, candidate freeze, final protocol adoption and production authorization.

### Item 6 boundary

Item 6 is the measured development run D1–D6 under the preregistered contract and the Item-4 harness. It is **active**, and it runs under the existing role boundary: GPT-5.6 Sol High scores; engineering agents do not score, do not change scoring semantics, and do not expose holdout identities or evidence to a development run. The four holdout titles stay untouched. Item 6 being active authorizes the preregistered measured run only — it does not reopen scope, cohort, DLC, prompt, schema or scoring semantics, and it does not carry any production-mutation, deployment or publication authority.

If a material protocol, mapping, or anchor defect surfaces during D1–D6, record it and follow the preregistration's rerun/versioning rule rather than changing a rule mid-pair.

## Active known deferred issue

The current Compare implementation (Slice 4) is **implemented** in the current codebase — not deployed. No deliberate production deployment of it is recorded, and production still exposes the earlier three-profile experience; Master Plan v0.9's *Public-product state* owns that fact. Branch previews and green CI are not deployment evidence.

Tomas has **not** accepted its visual/UX parity with the accepted design; owner assessment is that it is barely functional and materially short of the accepted direction. This is deferred to master-checklist Item 12 and must not derail Phase 3A unless it becomes a concrete blocker.

Item 12 must also incorporate the owner-approved
[`Freshness and accountability presentation decisions`](design/Should_I_Play_VGC_Freshness_and_Accountability_Decisions_2026-09-02.md):
make currency, evidence classes, material disagreement and reassessment change
more immediately legible inside the accepted Claude/Fable composition. Do not
surface personal play/completion coverage. These are bounded presentation
refinements, not authority to reopen the art direction or interrupt Phase 3A.

## Cross-tool handoff rule

When handing work between ChatGPT, Codex, Claude web, or Claude Code:

- cite the repository path/ADR/PR/commit that owns the decision;
- state the active checklist item and exact acceptance boundary;
- distinguish owner decisions from recommendations and unresolved questions;
- do not rely on phrases such as “as discussed in chat” when the decision is material;
- if a material decision exists only in chat, record it in GitHub before downstream implementation depends on it.

## Maintenance rule

Update this bootstrap only when the **active phase/checkpoint, mandatory read set, role boundary, or major deferred blocker** changes. Do not turn it into a chronological log or second Master Plan.
