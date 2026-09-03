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
- GPT-5.6 Sol High remains program owner/orchestrator and the designated Phase 3A editorial scorer. The runner may implement, test, commit, push, and create/update its task PR; it does not self-merge, declare checklist acceptance, mutate production, publish editorial/scoring content, or broaden its assignment.

## Active checkpoint — Phase 3A, integration gate before Item 6

As of 2026-09-03, against `main` at `1f10ec7928e07fdbc71bfdf77dffc6489f9df1dd`:

- Item 1 — baseline/source audit: **complete**.
- Item 2 — cohort reconciliation: **complete**.
- Item 3 — preregistration: **complete**; owner-approved and merged at `00f082022dcbf7f065453513d6f2681c01d63493`.
- Item 4 — Phase 3A engineering readiness: **complete**; final orchestrator ruling 9/9 PASS, recorded on PR #46 (conversation comment `5515828479`), merged at `79f0159b31009173ede153cfc77729d6d2e5ec91`. Issue #44 was the coverage-state blocker, later closed; it does not carry the ruling.
- Item 5 — IGDB staging readiness: **complete**; final readiness ruling **PASS / COMPLETE** in PR #52 review `5106252929` against exact implementation head `a292e9b19dda9a371c5c8701d579db30f3439996`. Issue #48 is closed as completed.
- Item 6 — development run games D1–D6: **pending**, blocked by the integration gate below.
- Items 7–12: unchanged.
- **No Phase 3A calibration scoring has begun; D1 has not started.**
- Candidate Scoring Protocol v1.0 remains non-governing until its later calibration, freeze, and adoption gates pass.
- No production/bulk catalog score mutation is authorized.

### Post-acceptance integration gate — blocks Item 6 / D1

The Item 5 ruling accepted the staging architecture. It did **not** authorize the authoritative migration or the merge. In order:

1. **Tomas's explicit authorization** for the production database action —
   **given** for migration `0011_igdb_staging` on PR #52; the remaining steps
   are execution, not a further owner decision;
2. read-only preflight;
3. apply the authoritative migration `0011_igdb_staging`;
4. verify integration and the Workers build (red on PR #52 by design until `0011` is applied);
5. update/rebase PR #52 against current `main` as needed;
6. merge through the ordinary reviewed path.

D1 does not begin until that gate is complete. No agent invents or widens that authorization, and the generic runner does not apply the migration or merge PR #52 on its own initiative; the readiness ruling in PR #52 and the Working Agreement's owner-reserved list both govern this. The authorization covers `0011_igdb_staging` only — it is not a standing production-mutation licence, and it is unrelated to ADR 0024 §6's future scoring-package migration 4, which still needs its own owner decision.

Read these records before any Phase 3A work.

On `main`:

- `docs/decisions/0035-released-game-maturity-is-evidence-and-stability-based.md`
- `docs/decisions/0036-phase3a-measured-scoring-execution-surface.md`
- `docs/Game_Profile_Phase_3A_Cohort_Lock_2026-09-02.md`
- `docs/Game_Profile_Phase_3A_Preregistration_v1.0_DRAFT.md` — note that its §14 master-checklist state is a frozen Item-3-era snapshot; this checkpoint and the rulings it cites are current.
- `docs/Game_Profile_Phase_3A_Item_3_Approval_and_Item_4_Handoff_2026-09-02.md`
- `docs/calibration/Phase_3A_Item_4_Harness_Architecture_and_Equivalence.md`
- `docs/scoring/Phase_3A_Execution_System_Instructions_v1.0.md`
- `docs/scoring/Phase_3A_Research_Prompt_v1.0.md`
- `docs/scoring/Phase_3A_Scoring_Prompt_v1.0.md`

Not yet on `main` — the Item 5 records live on PR #52 at head `a292e9b19dda9a371c5c8701d579db30f3439996` and land when that PR merges through the gate above:

- `docs/audits/Game_Profile_Phase_3A_Item_5_IGDB_Staging_Forensic_Audit_2026-09-02.md`
- `docs/calibration/Phase_3A_Item_5_IGDB_Staging_Readiness_Record.md` — module map, API-vs-dump strategy, live proofs, rollout and remaining gates
- `docs/decisions/0037-igdb-staging-identity-and-provenance.md` — still **Proposed** on the branch; it is accepted by that merge, not by this bootstrap

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

Item 6 is the measured development run D1–D6 under the preregistered contract and the Item-4 harness. It starts only after the integration gate above completes, and it runs under the existing role boundary: GPT-5.6 Sol High scores; engineering agents do not score, do not change scoring semantics, and do not expose holdout identities or evidence to a development run. The four holdout titles stay untouched.

If a material protocol, mapping, or anchor defect surfaces during D1–D6, record it and follow the preregistration's rerun/versioning rule rather than changing a rule mid-pair.

## Active known deferred issue

The current Compare implementation is deployed/implemented but Tomas has **not** accepted its visual/UX parity with the accepted design; owner assessment is that it is barely functional and materially short of the accepted direction. This is deferred to master-checklist Item 12 and must not derail Phase 3A unless it becomes a concrete blocker.

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
