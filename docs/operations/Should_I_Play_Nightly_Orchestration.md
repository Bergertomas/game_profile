# Should I Play — Canonical Nightly Orchestration

- **Status:** Current owner-approved launcher contract
- **Owner:** Tomas
- **Purpose:** allow Tomas to start a bounded overnight/extended autonomous orchestration run without regenerating a long task-specific prompt each time
- **Preferred runtime:** GPT-6 Astra when the Work surface exposes model selection and Astra is available
- **Repository:** `Bergertomas/game_profile`

## 1. Tomas-facing launcher

For an ordinary night run, Tomas should not need a bespoke orchestration prompt.

Use this instruction:

> **Set up a Should I Play Night Run from <start time> to <end time> using `docs/operations/Should_I_Play_Nightly_Orchestration.md` on current `main`. Prefer GPT-6 Astra if selectable. Do not create or change any standing Event Wake or Watchdog task.**

The requested dates/times and any explicit temporary owner constraint are the only normal per-run inputs.

Examples:

> Set up a Should I Play Night Run tonight from 01:00 to 09:00 using the canonical nightly orchestration contract on current main. Prefer Astra if selectable.

> Set up a Should I Play Night Run from midnight to 07:00 using the canonical nightly orchestration contract. Tonight only, do not start new work after 06:00.

If Tomas gives a temporary constraint, it applies only to that bounded run unless he explicitly makes it a standing project decision.

## 2. What a Night Run is

A Night Run is a **bounded, high-consequence autonomous orchestration session** whose job is to advance the project as far as current repository authority safely permits during the requested window.

It is not:

- the standing Event Wake;
- the standing Watchdog;
- a replacement for GitHub authority;
- a licence to cross owner, methodology, holdout, production or publication gates; or
- a reason to manufacture work merely to consume model/Claude capacity.

The Event Wake remains the primary completion signal for repository-native worker/CI completions. The Watchdog remains a recovery-only safety net. A Night Run adds an intentional period of active project management and throughput.

## 3. Mandatory preflight

Every Night Run must begin from current repository state, not from the launcher text or previous run memory.

Before any material decision or mutation:

1. Verify the live current `main` HEAD.
2. Read `AGENTS.md` completely.
3. Read `docs/Should_I_Play_Orchestrator_Bootstrap.md`.
4. Read `docs/Should_I_Play_Working_Agreement.md`.
5. Read `docs/operations/Should_I_Play_AI_Role_Allocation_2026-09-05.md`.
6. Follow the bootstrap's complete current-phase mandatory read set.
7. Read the current Master Plan and task-specific governing documents, relevant ADRs, handoffs, implementation and tests needed for the actual frontier.
8. Read `docs/operations/Claude_Code_GitHub_Runner.md` and `docs/operations/ChatGPT_Work_GitHub_Wake.md` before interpreting or launching autonomous engineering/orchestration activity.
9. Inspect live open issues, PRs, recent commits, Actions and any active Claude/Event-Wake work.
10. Reconstruct the numbered checklist position and dependency frontier independently.

The first substantive line must be:

`Project preflight: main <short SHA> · bootstrap read · active item <number/name>`

If repository authority is unavailable, stop rather than making material project decisions from memory.

## 4. Orchestration role and model routing

ChatGPT remains program owner/orchestrator. GPT-6 Astra is the preferred Night Run runtime when selectable because this work requires long-horizon state tracking, cross-authority synthesis, planning, independent review and consequential judgment.

The current AI Role Allocation record owns model/agent routing. In particular:

- Tomas retains every owner-reserved decision.
- Astra/ChatGPT owns orchestration, high-consequence synthesis, architecture/forensics and acceptance judgment.
- GPT-5.6 Sol remains the economical ordinary/recovery runtime and, separately, the frozen Phase 3A measured research/scoring runtime where current methodology requires it.
- Claude/Opus remains the default engineering fleet with High/xhigh/Max routing under the Working Agreement and runner guide.
- Codex+Astra is preferred for difficult engineering, forensics, security/data-integrity-sensitive work and major independent review when its marginal value is higher.
- Fable remains the canonical visual/art-direction specialist.

The Night Run runtime must never substitute itself for a separately frozen model role.

## 5. Operating objective

Advance the **highest-value dependency-safe work** available from current `main`.

Do not follow a stale task merely because a previous Night Run was working on it. Reconstruct the frontier every time.

Preserve the existing numbered master checklist. Do not silently renumber, replace, skip or combine items.

For the active frontier:

1. determine the exact blocker/dependency;
2. classify it correctly — engineering, methodology/evidence, owner-reserved, production/publication, capacity, infrastructure or stale documentation;
3. resolve everything the orchestrator is currently authorized to resolve;
4. route implementation/review to the appropriate surface;
5. independently inspect the actual result;
6. integrate accepted work when current authority permits;
7. re-read the dependency-aware ready queue; and
8. continue to the next permissible action without waiting for an arbitrary checkpoint.

The goal is useful accepted progress, not activity volume.

## 6. Engineering and concurrency

Before launching a worker, inspect active/recent work and avoid duplicates or branch/file races.

Use Claude as the default implementation fleet:

- High for normal bounded work;
- xhigh/Extra for difficult/cross-cutting implementation and demanding verification;
- Max only when unusually demanding groundwork, architecture or synthesis genuinely justifies it.

Use dependency-safe parallelism when it reduces elapsed time:

- normally up to two independent Claude workers;
- a third only when independence is clear and valuable;
- keep the critical path staffed;
- never parallelize dependent measured scoring steps;
- never create contract/migration/file races;
- never manufacture work to consume capacity.

Use Codex+Astra for tasks where deep forensic or architecture-sensitive reasoning is likely to avoid repeated correction cycles or where a high-consequence independent review is valuable.

## 7. Independent review and acceptance

Never accept an agent summary or green CI as proof by itself.

For consequential work inspect the exact head/base, actual diff, affected implementation, relevant tests and CI/log evidence as appropriate, then compare the result with governing authority.

Apply the Working Agreement's threshold:

- block material product, methodology, data, security, production, accessibility or integration risk;
- accept and defer low-value cleanup, stylistic preference and hypothetical enterprise concerns.

Use independent Astra/Codex or Claude review when it adds meaningful failure diversity, not as ceremonial double-review.

## 8. Phase 3A integrity

When Phase 3A is active, preserve its current registered experiment exactly.

Never:

- expose untouched holdout evidence during development;
- silently change cohort/scope, prompts, schema, rubric, anchors, confidence rules or scoring semantics;
- silently retry or repair measured outputs;
- substitute Astra, Claude, Fable or arbitrary Codex judgment for a registered measured Sol role;
- treat synthetic harness success as proof a real measured workflow is ready;
- overwrite immutable attempt evidence; or
- proceed from research to scoring without an accepted frozen real corpus and every required gate.

If a material harness/methodology defect is discovered, stop the affected measured path, record it durably and resolve it under current change control before spending another measured attempt.

## 9. Event Wake / Night Run coexistence

Event Wake may execute while a Night Run is active.

Before any mutation or successor launch, refresh current GitHub state and check whether another orchestrator has already handled the same frontier.

Do not race two orchestrators into duplicate corrections, successor issues, Claude runs, merges or conflicting branch work.

The Event Wake's event-claim protocol remains governed by its own guide. A Night Run uses current live GitHub state as its duplicate-work guard and works on genuinely independent ready work when another canonical orchestrator already owns the exact frontier.

## 10. Production and publication boundary

Before a merge, determine the actual downstream production effect under current deployment configuration and governing authority.

Do not assume that `merge to main` is non-production merely because the PR is described that way.

Never deploy, mutate authoritative production data, run unauthorized migrations/imports, change secrets/access/billing/DNS, or publish editorial content without the required durable owner authority.

Follow any later accepted merge/deployment policy if the repository has reconciled this boundary.

## 11. Product-value discipline

Should I Play is a public decision product, not an orchestration-infrastructure project.

Bias discretionary work toward:

1. trustworthy methodology;
2. real content production;
3. compelling end-to-end user journeys;
4. accepted visual/product quality;
5. launch-critical metadata/data;
6. accountability/privacy/security; and
7. sustainable catalog throughput.

Avoid generic admin polish, repeated broad audits, unnecessary orchestration infrastructure, speculative scale architecture and premature editorial automation unless a concrete current blocker justifies them.

## 12. Durable continuity

GitHub must be sufficient to reconstruct the state after the run.

Record material outcomes where they naturally belong: issue/PR acceptance, correction request, blocker, owner decision request, phase/frontier checkpoint or other durable evidence.

Do not create chronology noise for every minor action and do not rewrite historical controlled records merely to refresh prose.

At the end of the bounded run:

1. re-read current `main`;
2. inspect open PRs/issues and running work;
3. ensure material decisions are durable;
4. ensure the numbered checklist/frontier is truthful;
5. ensure no worker/result needing review is silently abandoned; and
6. leave the exact resumable next action.

Return a concise handoff with:

- current main and active checklist item;
- accepted/merged work;
- work still running;
- corrections requested;
- current critical-path blocker;
- genuine Tomas decisions required; and
- exact next dependency-safe action.

## 13. Scheduling rule

A Night Run is always **bounded** by the start/end time Tomas supplies for that run.

Do not convert it into a standing nightly recurrence unless Tomas explicitly requests a recurring schedule.

If Tomas specifies a stop time for initiating new work, respect it. Otherwise the bounded task may continue orchestration until its end time while still obeying all repository dependencies and gates.

Changing the requested hours changes only the schedule, not this canonical project contract.
