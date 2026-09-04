# Should I Play — GPT-6 Astra State-of-Project Audit Work Order

- **Status:** Ready to execute; read-only audit
- **Owner:** Tomas
- **Intended auditor:** GPT-6 Astra at the highest practical reasoning level available
- **Date prepared:** 2026-09-05
- **Repository:** `Bergertomas/game_profile`
- **Mutation authority:** none — this audit must not edit, commit, push, merge, deploy, score, publish, mutate data, or launch downstream work

## Prompt to give GPT-6 Astra

You are performing a **State of Should I Play** audit for GitHub repository `Bergertomas/game_profile`.

This is a high-consequence, whole-project, **read-only constitutional / product / methodology / architecture / delivery audit**. The purpose is to determine whether the project, as it actually exists on current `main`, is coherent, correctly prioritized, dependency-safe, launch-directed, and using its AI/engineering resources intelligently.

You are not being asked to praise prior work, continue the current plan by inertia, rewrite the product from first principles, or make changes. You are being asked to independently establish what is true, what is stale, what is risky, what is unnecessarily complicated, what is missing, and what the best dependency-ordered path forward is.

Repository evidence outranks this prompt. If this prompt disagrees with current governing GitHub authority, identify the conflict and follow the repository's authority rules.

### 1. Mandatory preflight — before any substantive conclusion

1. Verify the **current `main` HEAD** live. Do not rely on a SHA from this prompt, prior chat, memory, an issue body, or a stale document header.
2. Read repository-root `AGENTS.md` completely.
3. Read `docs/Should_I_Play_Orchestrator_Bootstrap.md` completely.
4. Read `docs/operations/Should_I_Play_AI_Role_Allocation_2026-09-05.md` completely.
5. Follow the bootstrap's mandatory current-phase reading sequence.
6. Read `docs/Should_I_Play_Working_Agreement.md` completely.
7. Read the current Master Plan completely: `docs/Game_Profile_Master_Product_and_Build_Plan_v0.9.md`.
8. Read the governing public-product owner decisions/resolutions:
   - `docs/Should_I_Play_Public_Product_P0_Decisions_2026-08-24.md`
   - `docs/Should_I_Play_Public_Product_Resolutions_2026-08-25.md`
9. Read the governing methodology/evidence set relevant to current Phase 3A:
   - `docs/Game_Profile_Scoring_Rubric_v1.0.md`
   - `docs/Game_Profile_Editorial_Evidence_and_Data_Sourcing_SOP_v0.2.md`
   - `docs/Game_Profile_Scoring_Protocol_v1.0_DRAFT.md`
   - `docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json`
   - the current Phase 3A cohort lock and preregistration
   - ADRs 0024, 0035, 0036, 0037 and any later ADR that materially governs the active state
   - the active D1 handoffs and execution-system/research/scoring instructions named by the bootstrap
10. Read the current operating/integration records relevant to autonomous delivery:
   - `docs/operations/Claude_Code_GitHub_Runner.md`
   - `docs/operations/ChatGPT_Work_GitHub_Wake.md`
11. For public-product/design claims, read the canonical design-source locator and the accepted shared handoff / accessibility / conformance / deliberate-drift records that currently govern.
12. Read the current `README.md` and inspect the actual implementation/tests/configuration in every area on which you make a material claim.
13. Inspect live GitHub state: open issues, open PRs, recent merged PRs/commits, relevant Actions runs, and especially the current active Item-6 / D1 record. Do not infer current status from plan prose alone.
14. Where production/deployment state materially affects a conclusion, distinguish repository implementation, accepted design, deployed production, and owner visual/product acceptance. Do not treat one as proof of another.

Your first substantive line must be exactly in this shape:

`Project preflight: main <short SHA> · bootstrap read · active item <number/name>`

If repository authority cannot be accessed sufficiently to perform this audit, stop and say so. Do not substitute model memory.

### 2. Audit posture

Be **independent and adversarial but proportionate**.

Do not accept agent summaries, PR descriptions, green CI, stale plan status, fixture values, mocks, design specimen copy, or prior orchestrator conclusions as proof by themselves. For material findings, inspect the underlying document, diff, code, test, log, deployment evidence, or issue/PR discussion that actually supports the claim.

At the same time, do not manufacture problems merely because perfection is possible. Apply the project's Working Agreement threshold: distinguish launch/material risk from ordinary cleanup and theoretical enterprise concerns.

The audit should optimize for a **professional, coherent, trustworthy, launch-capable product**, not maximal process, maximal documentation, maximal abstraction, or maximal AI usage.

### 3. Hard safety / scope boundaries

This audit is **read-only**.

Do not:

- edit any repository file;
- create a branch, commit, PR, issue, or comment;
- merge or close anything;
- invoke Claude/Codex/Fable or launch downstream work;
- deploy or change infrastructure;
- mutate Neon/production/editorial data;
- publish editorial content;
- execute a measured Phase 3A research or scoring call;
- authorize a D1 retry;
- decide the current Final Draft / New Game Plus owner-reserved scope question;
- change the cohort, scope/DLC contract, prompts, schema, anchors, confidence rules or scoring semantics;
- expose, research, score, rehearse, predict, or use holdout evidence as development feedback;
- silently replace the preregistered `gpt-5.6-sol` measured runtime with Astra; or
- make any owner-reserved decision for Tomas.

You may identify a needed owner decision, present options and make a recommendation, but label it **OWNER DECISION REQUIRED** and do not treat your recommendation as adopted.

### 4. Central questions the audit must answer

#### A. What is the project actually trying to ship?

Reconstruct the current product thesis, primary user jobs, launch product, private validation milestone, quiet-public-release threshold, and post-launch direction from governing authority.

Determine whether the current roadmap still directly serves that thesis or whether engineering/process work has drifted away from public user value.

Identify any mismatch between:

- product promise and current implementation;
- accepted product/design direction and deployed experience;
- catalog ambition and actual content-production machinery;
- launch requirements and work currently receiving attention.

#### B. Is the Master Plan still a trustworthy constitution?

Audit Master Plan v0.9 against current governing decisions, bootstrap status, accepted ADRs, implementation and operations.

Classify every material discrepancy you find as one of:

- **still correct**;
- **stale wording/status only**;
- **actual contradiction**;
- **missing dependency/gate**;
- **unnecessary gate/process**;
- **implementation drift**;
- **owner decision required**.

Specifically test whether the Plan:

- accurately describes the current Phase 3A frontier;
- still has the right phase ordering;
- preserves all genuine owner gates without adding ceremonial ones;
- distinguishes accepted design from implementation and production conformance;
- reflects the current autonomous/event-driven operating model;
- correctly represents IGDB/provider/artwork/legal status;
- correctly represents catalog/launch milestones;
- correctly separates public-product value from internal-tool polish; and
- contains any historical assumptions that should now be retired or delegated to narrower governing records.

Do not recommend a new Master Plan version merely for cosmetic freshness. Recommend reconciliation only where it materially improves future execution truth.

#### C. Is Phase 3A methodologically sound and operationally sane?

Audit the candidate Scoring Protocol calibration program as a system, without performing scoring or changing it.

Evaluate:

- authority separation among Rubric, Evidence SOP, candidate Protocol, ADRs, preregistration and harness;
- whether the development/holdout design genuinely tests what it claims to test;
- corpus-freeze and paired-pass isolation;
- holdout protection;
- retry/change-control rules;
- model/configuration reproducibility assumptions;
- schema/semantic validation;
- time/cost/effort measurement;
- owner adjudication boundaries;
- whether the calibration is overengineered, undercontrolled, or appropriately controlled for an editorial product;
- whether the current D1 failure revealed a methodology defect, an operator/scope ambiguity, a research-prompt weakness, or simply a legitimate owner gate;
- what must be learned from D1–D6 before candidate freeze; and
- whether any current requirement risks making catalog production impractically slow without adding equivalent trust value.

Preserve the experiment: recommendations that would alter controlled inputs must be framed as possible future amendments and must respect preregistration/reset consequences.

#### D. Is the architecture appropriate for the product we are building?

Audit the actual stack and implementation rather than the architecture prose alone.

Cover at least:

- Next.js/OpenNext/Cloudflare static public rendering;
- Neon authoritative Postgres and Hyperdrive admin path;
- public vs admin data boundaries;
- publication → deployment → Live proof;
- migrations and data integrity;
- scoring-package/import architecture;
- IGDB staging/identity/provenance;
- Search architecture;
- Compare architecture;
- eventual What should I play? architecture;
- analytics/privacy posture;
- artwork containment/rights controls;
- security/auth boundaries;
- CI and repository automation;
- event-driven orchestration wake/claim/idempotency; and
- operational complexity relative to a one-editor launch product.

For each major architectural area, answer:

1. Is it fit for the current scale?
2. Is it likely to survive the ~100-profile release floor without a redesign?
3. Is it prematurely complex?
4. Is there material technical debt that should be paid before release?
5. Is there an important missing proof that current tests/docs falsely make feel complete?

#### E. Is the public product good enough, not merely implemented?

Audit current public-product progress against governing product/design authority.

Distinguish:

- accepted canonical design direction;
- current repository implementation;
- current production deployment;
- Tomas's actual acceptance of UX/visual parity.

Review the launch-critical journeys:

- homepage / Search;
- profile;
- Compare;
- What should I play? / discovery;
- methodology/trust/accountability;
- mobile behavior;
- artwork/artless behavior;
- practical time/session context;
- storefront actions;
- correction/accountability paths;
- analytics required to learn from quiet release.

Identify the largest gaps between “code exists” and “this is a compelling, trustworthy product someone would return to.”

Do not reopen accepted art direction merely because another aesthetic is possible.

#### F. Are we building the catalog efficiently enough to launch?

Reconstruct the complete path from selecting a title to a Live substantive profile.

Assess:

- research/scoring throughput;
- owner review burden;
- provider/metadata preparation;
- artwork clearance burden;
- import/admin workflow;
- deployment proof;
- reassessment operation;
- whether the 12–15 private validation milestone and ~100-profile release floor remain realistic;
- likely bottlenecks once methodology validation ends; and
- which tasks should be automated versus deliberately remain manual.

Flag any place where the system is optimized for the first profile but unlikely to sustain 100.

#### G. Is the new AI role allocation optimal?

Audit `docs/operations/Should_I_Play_AI_Role_Allocation_2026-09-05.md` against the real work the project performs.

The currently approved allocation is:

- Tomas = final owner;
- ChatGPT = model-agnostic program owner/orchestrator;
- GPT-6 Astra = preferred high-consequence orchestration, cross-project audit, architecture/forensics and major independent-review runtime when available;
- GPT-5.6 Sol = economical ordinary/recovery runtime and the **frozen Phase 3A measured research/scoring model**;
- Claude / Opus = default high-throughput engineering fleet;
- Codex + Astra = principal OpenAI engineering specialist / independent reviewer for difficult or high-consequence work;
- Fable = visual/art-direction specialist.

Assess whether this allocation:

- uses Astra where its marginal reasoning value is highest rather than everywhere;
- preserves useful Claude Max throughput and concurrency;
- creates meaningful independent-review diversity rather than ceremonial double-review;
- keeps acceptance authority with the orchestrator;
- avoids model identity becoming a safety boundary;
- appropriately separates orchestration from the frozen Phase 3A scoring experiment;
- has any obvious cost/capacity waste;
- needs a different routing threshold; and
- is robust to future model releases without another constitutional rewrite.

Do not change the allocation in this audit. Recommend adjustments if evidence supports them.

#### H. Is autonomous orchestration helping or becoming its own project?

Audit the Claude runner, Event Wake, hourly Watchdog, concurrency/capacity policy and GitHub-native handoff loop.

Determine:

- whether the event-driven path is materially reducing idle time;
- whether recovery/watchdog logic is appropriately bounded;
- whether agent work is sized naturally;
- whether Claude capacity is being used intelligently;
- whether too much project energy is going into orchestration infrastructure instead of product/content;
- whether any remaining event-wake assertions are launch/project risks or merely bounded operational observations;
- whether the system has enough fail-closed/idempotency protection without overengineering; and
- what, if anything, should now be frozen as “good enough” infrastructure until user-facing value catches up.

#### I. What are the real risks to soft launch?

Build a risk register based on actual evidence.

Include product, methodology, content throughput, design/UX, technical, data, security/privacy, legal/artwork, SEO/discoverability, analytics, operational and AI-process risks.

For every risk provide:

- severity: **critical / high / medium / low**;
- likelihood: **high / medium / low**;
- evidence;
- affected milestone;
- whether it blocks the current critical path, private validation, ~100-profile quiet release, or only later scale;
- cheapest credible mitigation; and
- owner/agent best suited to address it.

Do not elevate minor cleanup to a launch risk.

### 5. Reconstruct the master checklist and critical path

Independently reconstruct the current numbered master checklist from governing repository records.

For every remaining item:

- current state;
- exact dependency;
- current blocker, if any;
- whether the blocker is technical, methodological, owner-reserved, capacity-related or merely stale documentation;
- evidence that proves the state; and
- next permissible action.

Then produce the **critical path to:**

1. completion of Phase 3A candidate calibration;
2. the 12–15-profile private product-validation milestone; and
3. the ~100-profile quiet public release.

Where safe independent work can proceed off the critical path, identify it, but do not recommend parallelism that violates dependencies, creates branch/file races, exposes holdouts, or consumes effort that should go to the product critical path.

### 6. Resource / effort review

Assess whether project effort is currently allocated rationally among:

- methodology/calibration;
- product/UX/design parity;
- catalog/content production;
- provider/data work;
- internal admin/editorial tooling;
- infrastructure/reliability;
- orchestration automation;
- testing/auditing; and
- launch/SEO/analytics/legal readiness.

Identify areas of:

- underinvestment;
- appropriate investment;
- diminishing returns;
- overengineering; and
- work that should explicitly stop until a later milestone.

### 7. Required output format

Return one coherent audit report with the following sections in this exact order.

#### 1. Executive verdict

In no more than ~12 bullets, answer:

- Is Should I Play fundamentally on the right track?
- Is the product thesis strong and still reflected by the build?
- Is the methodology credible enough to continue calibration?
- Is the architecture fit for launch scale?
- Is the current roadmap/order correct?
- What are the 3–5 most important things the program owner should care about now?

Give an overall project health rating: **GREEN / GREEN-AMBER / AMBER / AMBER-RED / RED**, with a short justification.

#### 2. Verified current-state map

State current `main`, active phase/item, active blocker/frontier, open material PRs/issues, production-vs-repo state, and the next dependency-safe step. Cite exact repository evidence.

#### 3. Authority and drift matrix

Table columns:

`Area | Governing authority | Current observed state | Classification | Severity | Recommended reconciliation`

Include all material contradictions or stale instructions you found.

#### 4. Master Plan audit

State what remains sound, what is stale, what is contradictory, what is missing, and what should be deleted/delegated/rewritten at the next reconciliation. Do not edit it.

#### 5. Phase 3A methodology/calibration audit

Cover soundness, reproducibility, operational burden, D1 lesson, integrity risks, and what must be proven before holdout/freeze/adoption.

#### 6. Product and design audit

Cover Search, homepage, profile, Compare, discovery, trust/accountability, mobile, mixed artwork, practical context, storefront actions and analytics. Separate implemented / deployed / accepted.

#### 7. Architecture, data, security and operations audit

Highlight only material findings plus the few highest-value non-blocking improvements.

#### 8. Catalog-production and launch-throughput audit

Show the current title→research→score→approve→import→publish→Live pipeline, likely bottlenecks, and what must change before trying to make ~100 profiles.

#### 9. AI operating-model audit

Evaluate the ChatGPT/Astra/Sol/Claude/Codex/Fable role allocation, event wake, watchdog, concurrency and review model. State what to keep, revise, stop or measure.

#### 10. Risk register

Ranked table as defined above.

#### 11. Reconstructed remaining master checklist

Preserve existing numbering. Do not invent a replacement checklist unless you first show exactly why the governing one is wrong. If you recommend reordering, distinguish the current authoritative order from the proposed order.

#### 12. Dependency-ordered path to private validation and quiet public release

Give the shortest credible path that preserves quality and authority. Mark critical-path versus safely parallel work.

#### 13. Owner decisions required

For each genuine Tomas decision, provide:

- exact question;
- why current authority does not decide it;
- options;
- consequences;
- your recommendation;
- latest safe decision point.

Do not list decisions that an orchestrator/engineer is already authorized to make.

#### 14. Immediate next actions

Give the next **5–10 actions** in strict priority/dependency order. For each, recommend the execution surface and effort level: Astra/ChatGPT, Sol/ChatGPT, Claude High/xhigh/Max, Codex+Astra, Fable, Tomas, or no action.

Do not launch them.

#### 15. Stop-doing / defer list

Explicitly name work that should not consume project attention now.

#### 16. Confidence and unresolved evidence

State where your audit is highly confident, where evidence was incomplete, and what would change a material conclusion.

### 8. Finding quality bar

Every material finding must be anchored in evidence. Prefer exact file paths, ADRs, issue/PR numbers, SHAs, test results, implementation references, workflow-run evidence or production observations.

Separate:

- **fact observed**;
- **inference**;
- **recommendation**.

If two authoritative records conflict, do not silently choose the one you prefer. Explain the authority conflict and identify which record should govern under the repository's own conflict rules.

Do not confuse a later timestamp with greater authority unless the subject-specific rules make it so.

### 9. What success looks like

A successful audit should allow Tomas and the ChatGPT program owner to answer, with high confidence:

- “Are we still building the right product?”
- “Is the project constitution still telling agents the truth?”
- “Is Phase 3A worth continuing as designed?”
- “What genuinely blocks the next milestone?”
- “What are we overthinking?”
- “What are we underinvesting in?”
- “Is our AI-agent division of labor now optimal?”
- “What is the shortest safe path from this exact repository state to a compelling private validation corpus and then a credible ~100-profile public release?”

Be decisive where evidence supports decisiveness. Be explicit where Tomas must decide. Do not make changes.
