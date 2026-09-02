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

## Active checkpoint — Phase 3A scoring-protocol calibration

As of 2026-09-02:

- Item 1 — baseline/source audit: **complete**.
- Item 2 — cohort reconciliation: **complete**.
- Item 3 — preregistration: **complete**; owner-approved and merged at `00f082022dcbf7f065453513d6f2681c01d63493`.
- Item 4 — Phase 3A engineering readiness: **active / next** and a hard blocker before D1.
- No Phase 3A calibration scoring has begun.
- Candidate Scoring Protocol v1.0 remains non-governing.
- No production/bulk catalog score mutation is authorized.

Read these active records before any Phase 3A work:

- `docs/decisions/0035-released-game-maturity-is-evidence-and-stability-based.md`
- `docs/decisions/0036-phase3a-measured-scoring-execution-surface.md`
- `docs/Game_Profile_Phase_3A_Cohort_Lock_2026-09-02.md`
- `docs/Game_Profile_Phase_3A_Preregistration_v1.0_DRAFT.md`
- `docs/Game_Profile_Phase_3A_Item_3_Approval_and_Item_4_Handoff_2026-09-02.md`
- `docs/scoring/Phase_3A_Execution_System_Instructions_v1.0.md`
- `docs/scoring/Phase_3A_Research_Prompt_v1.0.md`
- `docs/scoring/Phase_3A_Scoring_Prompt_v1.0.md`

### Locked cohort

Development: Alan Wake 2; Battlefield 6 Multiplayer; The Legend of Zelda: Tears of the Kingdom — Switch 2 Edition; Banishers: Ghosts of New Eden; Senua's Saga: Hellblade II Enhanced; Saros.

Untouched holdout: Resident Evil 4 Remake; Kingdom Come: Deliverance II; Astro Bot; Immortals of Aveum.

The cohort-lock file, not this summary, owns identities/high-level scopes.

### Phase 3A role boundary

- **GPT-5.6 Sol High:** research/synthesis orchestration, editorial scoring judgments, rationales/caveats/confidence, calibration analysis and recommendations.
- **Codex / Claude / Claude Code:** engineering support: validators, harnesses, schemas, fixtures, timing/ledger, blinding/isolation, IGDB staging/provenance, tests, branches and PRs. They do not change scoring semantics or substitute their judgment for the designated GPT scorer.
- **Tomas:** final editorial/product authority; approves cohort/scope/DLC choices, material methodology changes, preregistration, candidate freeze, final protocol adoption and production authorization.

### Item 4 boundary

Item 4 must prove the preregistered execution contract before D1 can begin. At minimum this includes OpenAI `gpt-5.6-sol` High-reasoning access and returned-model identity, stateless tool-free scoring calls, byte-identical paired semantic inputs/configuration, strict structured-output/semantic validation, SHA-256 verification of approved controlled bytes, ledger/timing/retry capture, fail-closed behavior, and safe credential/spend handling.

If Item 4 fails, D1 does not begin and the program returns to the relevant methodology/engineering step.

## Active known deferred issue

The current Compare implementation is deployed/implemented but Tomas has **not** accepted its visual/UX parity with the accepted design; owner assessment is that it is barely functional and materially short of the accepted direction. This is deferred to master-checklist Item 12 and must not derail Phase 3A unless it becomes a concrete blocker.

## Cross-tool handoff rule

When handing work between ChatGPT, Codex, Claude web, or Claude Code:

- cite the repository path/ADR/PR/commit that owns the decision;
- state the active checklist item and exact acceptance boundary;
- distinguish owner decisions from recommendations and unresolved questions;
- do not rely on phrases such as “as discussed in chat” when the decision is material;
- if a material decision exists only in chat, record it in GitHub before downstream implementation depends on it.

## Maintenance rule

Update this bootstrap only when the **active phase/checkpoint, mandatory read set, role boundary, or major deferred blocker** changes. Do not turn it into a chronological log or second Master Plan.
