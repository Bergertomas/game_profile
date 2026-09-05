# Should I Play — AI Role Allocation and Runtime Policy

- **Status:** Accepted owner operating decision
- **Owner:** Tomas
- **Date:** 2026-09-05
- **Scope:** orchestration runtime preference, engineering-agent allocation, independent review, and the boundary between general project work and the frozen Phase 3A measured scoring execution
- **Supersession:** this document supersedes older **model-specific role-allocation wording** in the Master Plan, Working Agreement, Orchestrator Bootstrap, Claude runner guide, ChatGPT Work wake guide, README, issues, and other operating records where that wording conflicts with this decision. It does **not** supersede product, scoring, evidence, design, architecture, production, publication, holdout, or owner-gate authority.

## 1. Governing principle

The **program-owner/orchestrator role belongs to ChatGPT as the control plane, not permanently to one model version**.

Model identity is an execution-quality and cost/capacity choice. It is not the project's safety boundary. The safety boundary remains:

- current GitHub `main` as durable authority;
- mandatory repository preflight;
- subject-specific governing documents and ADRs;
- independent inspection of actual diffs, tests and evidence;
- the numbered master checklist and dependency order;
- explicit owner-reserved decisions;
- holdout isolation;
- fail-closed production/publication/methodology behavior; and
- the event-wake claim/idempotency controls where applicable.

A future model upgrade therefore does not automatically rewrite project methodology or authority. It changes a runtime assignment only when this policy or a later owner decision says it does.

## 2. Current role allocation

### 2.1 Tomas — final owner

Tomas remains the final authority for material product/editorial decisions, material scope changes, production activation/mutation, publication, candidate freeze, final protocol adoption, and every other owner-reserved gate named by current governing records.

No model or agent receives standing authority to cross those gates.

### 2.2 ChatGPT — program owner/orchestrator

ChatGPT remains the program owner/orchestrator. It is responsible for:

- reconstructing current state from GitHub rather than chat memory;
- protecting authority and dependency order;
- maintaining the numbered master checklist;
- framing bounded assignments;
- independently reviewing actual implementation/evidence rather than agent summaries;
- accepting/rejecting engineering work under the Working Agreement;
- managing integration and merging/deploying in-scope reviewed engineering work
  under Working Agreement §4.1;
- routing work among Claude, Codex, Fable and OpenAI runtimes;
- preserving owner, scoring, holdout, production and publication gates;
- recording material owner decisions durably in GitHub; and
- surfacing only genuine Tomas decisions rather than making Tomas the message bus.

The role is **model-agnostic by design**. A run that is not on the preferred model may still perform safe orchestration if it can satisfy the governing controls. A run may not take a separately model-frozen role merely because it is the current orchestrator.

### 2.3 GPT-6 Astra — preferred high-consequence OpenAI runtime

When GPT-6 Astra is available on the selected OpenAI surface, it is the **preferred runtime for high-consequence orchestration and specialist work**, especially:

- whole-project / Master Plan / phase-boundary audits;
- difficult cross-system synthesis;
- roadmap/dependency reconstruction where many authorities and implementation surfaces must be reconciled;
- architecture-sensitive planning;
- difficult forensic debugging or repository archaeology;
- high-consequence code/PR review;
- security, data-integrity, workflow/agent-infrastructure or migration-sensitive review;
- complex Codex implementation where its marginal value is materially higher than the default Claude path; and
- adversarial independent review of major Claude-delivered changes.

Astra is a **preferred high-leverage runtime, not a mandatory tax on every task**. Routine checks, low-risk mechanics and recovery polling should not consume scarce Astra capacity merely because it exists.

### 2.4 GPT-5.6 Sol — economical orchestration/support runtime and the frozen Phase 3A model

GPT-5.6 Sol remains useful for ordinary ChatGPT orchestration/support work where Astra's marginal value is low, including recovery/watchdog work that is usually read-only or no-op.

Separately and much more importantly, the current Phase 3A preregistration and ADR 0036 freeze the **measured research and scoring execution** to `gpt-5.6-sol` with the registered configuration. That model assignment is methodological experiment state, not general project-role policy.

Therefore:

- GPT-6 Astra must **not** silently replace Sol in the current Phase 3A measured research pass;
- GPT-6 Astra must **not** silently replace Sol in the isolated primary/audit scoring pair;
- Claude, Codex, Fable or another model must not substitute editorial scoring judgment;
- a future scoring-model transition requires its own explicit qualification/amendment/versioning decision under the methodology records; and
- orchestration may use Astra while the measured scoring harness continues to use Sol.

This distinction is load-bearing.

### 2.5 Claude / Opus — primary engineering fleet

Claude / Opus remains the **default engineering executor and high-throughput implementation fleet** because the project has substantial perishable Claude Max capacity and a mature repository-native runner.

Use Claude by default for:

- ordinary bounded implementation;
- fixes and tests;
- dependency-complete engineering slices;
- routine reviews and corrections;
- implementation under already-accepted architecture; and
- genuinely independent parallel work under the runner's concurrency/headroom policy.

The existing High / xhigh / Max effort routing, dynamic turn ceilings, capacity utilization guidance, runner recovery rules and safety boundaries remain governed by `docs/Should_I_Play_Working_Agreement.md` and `docs/operations/Claude_Code_GitHub_Runner.md`.

Do not replace the Claude fleet wholesale merely because Astra is more capable at the frontier. Optimize for useful accepted work, elapsed time, marginal model value and available capacity.

### 2.6 Codex + Astra — principal engineering specialist / independent reviewer

Codex is promoted from a merely occasional specialist to the **preferred OpenAI engineering specialist surface** when a task benefits materially from Astra-class reasoning or Codex's repository-native execution.

Prefer Codex + Astra for:

- difficult architecture and cross-cutting implementation;
- stubborn debugging/forensics after ordinary implementation has failed or become ambiguous;
- workflow / Actions / agent-infrastructure work;
- security-sensitive or data-integrity-sensitive changes;
- migration-sensitive or irreversible-risk engineering review;
- high-consequence refactors;
- independent review of important Claude PRs; and
- implementation where an Astra pass is likely to avoid multiple expensive correction cycles.

This does not make Codex the default worker for routine implementation.

Useful review patterns include:

1. **Claude implements → Astra/Codex independently reviews → ChatGPT orchestrator accepts/rejects.**
2. **Astra/Codex implements a genuinely difficult slice → Claude independently verifies where useful → ChatGPT orchestrator accepts/rejects.**

Agent review is evidence for the orchestrator. It does not transfer acceptance authority.

### 2.7 Fable — visual / product-design specialist

Fable remains specialist capacity for art direction, long-horizon visual exploration, canonical-screen work and other design tasks where its visual strengths materially improve the result.

Fable is not the default engineering implementation agent and never owns scoring semantics, data truth, accessibility truth, artwork rights, publication, or production authority.

### 2.8 Owner-facing model-selection rule

Tomas should not have to act as the project's model router.

For ordinary owner interaction, use this simple default:

- **Product thinking / product strategy / roadmap discussion / feature judgment / Master Plan shaping:** start with **ChatGPT on GPT-5.6 Sol High**. This is the default conversational product-partner surface.
- **High-consequence audit / whole-project orchestration / phase-boundary review / cross-system architecture or forensic judgment:** use **ChatGPT on GPT-6 Astra** when available.
- **Visual direction / art direction / canonical public-surface design work:** use **Fable** under the current design authority.
- **Engineering execution:** Tomas should normally describe the desired outcome to ChatGPT and let the program orchestrator route the work to Claude High/xhigh/Max or Codex+Astra according to this policy. Tomas does not need to choose the engineering model per task.

For a material product decision developed conversationally with Sol, an Astra audit is appropriate before the decision becomes expensive or difficult to reverse when the consequence or cross-system impact warrants it. This is a review/escalation pattern, not a requirement to double-review every product discussion.

For autonomous orchestration runs whose purpose is to manage and advance the project for an extended period (for example an overnight Work run), **Astra is the preferred runtime when the Work surface exposes a model selector and Astra is available**. The job prompt must remain repository-authoritative and safe under current owner/methodology/production gates. If the platform cannot expose or preserve the selected model, the orchestration role remains ChatGPT and the run must obey the same repository controls; model identity is not the safety boundary.

## 3. Event Wake and watchdog allocation

### 3.1 Event Wake

The event-driven ChatGPT Work path remains the **primary completion signal**.

When the Work product allows a runtime choice, **GPT-6 Astra is the preferred runtime for Event Wake orchestration**, because a wake normally occurs at a point where actual judgment may be required: reconstructing a completed/failed run, auditing a PR, deciding correction versus acceptance, integrating work, or choosing the next dependency-safe assignment.

The live Work prompt remains deliberately runtime-agnostic and must stay safe if the platform does not expose or honor model pinning. The event's validation, repository preflight, claim protocol, independent review and owner gates remain the control boundary.

Any live Work-task configuration change that falls under the re-qualification triggers in `docs/operations/ChatGPT_Work_GitHub_Wake.md` must be re-qualified there before relying on the event path as primary again.

### 3.2 Hourly watchdog

The hourly Watchdog remains a **recovery path, not a throughput clock**.

Its normal job is to discover that the event path is healthy and do nothing, or to recover a missed/stalled orchestration step. GPT-5.6 Sol High (or another sufficiently capable economical ChatGPT runtime) is therefore the default preference for ordinary watchdog execution.

Use Astra for watchdog/recovery only when the recovered state is itself high-consequence or unusually complex enough to justify it. Do not spend scarce Astra allowance on repetitive no-op polling.

The existing hourly task `6a9a57402f248191857fc31c2cd46baf` was restored on
5 September 2026 as `Should I Play — Watchdog`. `docs/operations/ChatGPT_Work_GitHub_Wake.md`
owns the exact configuration record; that record is a configuration observation,
not proof of an executed recovery run. This runtime preference is unchanged.

## 4. Routing rule

For each task, the orchestrator should choose the lowest-cost / highest-throughput execution surface that preserves quality for the task's consequence and ambiguity.

A practical default:

| Work | Default allocation |
|---|---|
| Whole-project constitutional / Master Plan audit | GPT-6 Astra, highest appropriate reasoning |
| High-consequence orchestration decision | ChatGPT on Astra when available |
| Event Wake orchestration | Astra preferred when selectable; otherwise safe runtime-agnostic ChatGPT |
| Hourly recovery/watchdog | Sol/economical capable ChatGPT by default |
| Routine engineering | Claude / Opus High |
| Complex engineering | Claude xhigh, or Astra/Codex when marginal value is higher |
| Unusually demanding groundwork/architecture | Claude Max or Astra/Codex, chosen by task fit |
| Difficult forensic/security/data-integrity review | Astra/Codex preferred |
| Major Claude PR independent review | Astra/Codex preferred where consequence warrants |
| Visual/art-direction mission | Fable |
| Phase 3A measured research | **Frozen `gpt-5.6-sol` only** under preregistration |
| Phase 3A measured primary/audit scoring | **Frozen `gpt-5.6-sol` only** under preregistration |
| Final owner decision | Tomas |

Do not route by prestige alone. Route by expected marginal value, independence, risk, capacity and the current governing contract.

## 5. What this decision does not change

This role allocation does not:

- reopen the Phase 3A cohort, scope, DLC choices, prompts, schema, scoring semantics or frozen model/configuration;
- authorize a D1 retry or resolve the current Final Draft / New Game Plus owner gate;
- expose or research holdouts;
- authorize production mutation or deployment;
- authorize publication;
- change the master-checklist order;
- replace the Working Agreement's review threshold;
- weaken the Claude runner's safety boundaries;
- alter the event-wake claim/idempotency contract; or
- make an AI model the final product/editorial owner.

**Later owner decision, same day.** Tomas subsequently approved a bounded
standing delegation for **code deployment** of in-scope reviewed engineering work
through the existing main/Workers wiring; Working Agreement §4.1 owns it. That
decision is separate from this record and does not widen anything above: it
grants no production **data** mutation, publication, configuration, credential,
methodology or scoring authority, and it does not touch the frozen Phase 3A
model contract.

## 6. Documentation conflict rule

Older records will continue to contain historical statements such as "GPT-5.6 Sol High is the program owner/orchestrator" or "Codex is a selective specialist." Those statements remain accurate for the historical state in which they were written but are stale as **current role allocation** where they conflict with this document.

For current role allocation, apply this record first. Preserve historical controlled records rather than rewriting experiment history.

The next broad Master Plan / Working Agreement reconciliation may fold this decision into those documents and remove stale wording. Until then, this file is the current owner-approved role-allocation amendment and `AGENTS.md` makes it mandatory reading for material work.
