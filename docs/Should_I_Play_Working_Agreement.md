# Should I Play — Working Agreement

**Status:** Current cross-chat operating agreement

**Owner:** Tomas

**Last updated:** 5 September 2026

## 1. Purpose and authority

This document governs how Tomas, ChatGPT, Claude, Codex, Fable, and other agents
plan, execute, review, integrate, and report work on Should I Play.

It is a process agreement, not a product specification. Product meaning,
scoring, evidence, design, architecture, and release requirements remain owned
by the Master Plan, decision and resolution documents, rubric, Evidence SOP,
ADRs, and other authorities listed in `AGENTS.md`.

The standing bias is toward useful forward motion, efficient context use, and a
professional launch-capable product. Small imperfections should not repeatedly
stall a working slice. Material risk should. This is not an enterprise-grade
perfection exercise.

This agreement explicitly supersedes earlier one-off instructions requiring
Tomas to approve every routine commit, push, pull-request action, or ordinary
merge. A later explicit instruction from Tomas can still change the policy.

## 2. Roles

The accepted [AI Role Allocation and Runtime Policy](operations/Should_I_Play_AI_Role_Allocation_2026-09-05.md)
owns current model/runtime routing. This agreement owns delivery/process.

- **Tomas:** final product/editorial authority and all owner-reserved decisions.
- **ChatGPT:** program owner/orchestrator, independent acceptance and integration;
  Astra preferred for high-consequence work. Orchestration is model-agnostic.
  Maintain the numbered master checklist, record material decisions durably in
  GitHub, and surface only genuine owner decisions to Tomas.
- **Registered `gpt-5.6-sol`:** Phase 3A measured research and scoring under the
  frozen ADR-0036/preregistration configuration, regardless of orchestrator model.
- **Claude / Opus:** primary engineering fleet for coherent bounded tasks.
- **Codex/Astra:** principal specialist for difficult architecture, forensics,
  security/data-integrity work and independent high-consequence review.
- **Fable:** visual/design specialist under accepted design authority.
- **Any agent:** challenge concrete material risk with evidence and the least-cost
  safe alternative; never silently rewrite governing decisions.

Roles are defaults, not exclusive capability boundaries. The assignment and
current repository state determine who acts; a separately frozen measured-model
contract remains binding.

### 2.1 Claude / Opus effort routing

The orchestrator chooses effort per assignment:

- **High:** normal/default implementation, fixes, tests, ordinary reviews, and
  bounded engineering work.
- **xhigh / Extra high:** complex engineering or design where deeper reasoning
  materially improves quality — difficult debugging, nontrivial cross-cutting
  work, visual-system implementation, architecture-sensitive changes, or
  ambiguous integration.
- **Max:** reserve for unusually demanding planning, scoping, architecture,
  groundwork, oversight, or high-consequence synthesis. Do not use Max
  reflexively; it can overthink. A task may use Max for groundwork and then
  High/xhigh for bounded execution.

### 2.2 Claude capacity is perishable project capacity

Claude Max capacity should be used aggressively when useful work is ready. The
objective is not to minimize model usage; it is to maximize valuable, accepted,
dependency-safe work completed during each available usage window without
weakening project authority or quality.

When sufficient genuinely valuable dependency-safe work exists, the standing
**aspiration is roughly 70–90% useful Claude utilization across a five-hour
window**. This is an orchestration target, not a quota or SLO: never manufacture
work, burn tokens, inflate effort, violate dependencies, weaken review, expose
holdouts, or cross owner/production gates merely to hit the band. Conversely, a
mature window around 20% while useful ready work existed is a strong
underutilization signal and should trigger a review of avoidable orchestration
delay, concurrency, task sizing, effort routing, or runner headroom.

- Maintain a dependency-aware ready queue rather than idling after the critical
  path worker starts.
- When substantial capacity remains in the current usage window, proactively
  launch the highest-value genuinely independent ready work, normally up to two
  concurrent Claude workers and a third only when independence is clear.
- Do not make hourly checkpoints the throughput clock: if orchestration is
  active and a worker finishes, review and advance the next dependency-safe
  assignment promptly rather than waiting merely for the next scheduled poll.
- Repeatedly reaching a mature usage window with very low consumption while
  valuable ready work exists is an orchestration signal. Reassess concurrency,
  task sizing, effort routing, runner headroom, and avoidable checkpoint delay.
- As a reset approaches, pull forward useful independent work where sensible;
  do not manufacture work, inflate effort, violate dependencies, expose
  holdouts, create branch/file races, weaken owner gates, or lower review
  standards merely to consume quota.

`docs/operations/Claude_Code_GitHub_Runner.md` owns the detailed runner
headroom, concurrency, quota-classification, and recovery mechanics. This
section owns the standing cross-chat utilization principle.

## 3. Default delivery loop

1. **Frame a bounded slice.** State the outcome, relevant authority, acceptance
   criteria, dependencies, and anything explicitly out of scope.
2. **Implement in isolation.** Prefer a scoped branch/worktree. Preserve dirty
   user work and do not reset, overwrite, or silently absorb unrelated changes.
3. **Verify proportionally.** Run the smallest checks that give credible
   evidence for the change. Expand verification when the change is cross-cutting
   or the risk justifies it.
4. **Report precisely.** Include the branch and SHA, meaningful diff summary,
   checks run and results, known limitations, and any remote or production-side
   effects.
5. **Review the actual change.** The orchestrator inspects the real diff and
   relevant behavior, not only the implementer's narrative. Classify findings
   as blocking or follow-up using Section 5.
6. **Correct material findings.** Re-review the changed area. Avoid restarting a
   full audit for every narrow correction unless the correction changes the
   broader risk profile.
7. **Accept and integrate.** The normal path is branch → review → correction if
   needed → acceptance → merge. Direct work on `main` is atypical. Once the
   orchestrator has independently accepted an in-scope reviewed engineering PR
   under the approved plan, it may merge without a separate ceremonial owner
   approval, and may complete the resulting code deployment through the existing
   `main` → Workers wiring under §4.1. The implementing agent never accepts or
   merges its own work.

Ordinarily, one complete review/correction pass should be enough. Further
iterations should be driven by remaining material risk, not by the existence of
minor possible improvements.

## 4. Actions that do and do not require fresh approval

Within an assigned engineering task, agents may normally perform these routine,
recoverable actions without asking Tomas each time:

- create or switch scoped branches and worktrees;
- edit in-scope files;
- run local checks, tests, builds, and read-only inspections;
- commit coherent work with an accurate message;
- push the scoped branch;
- create or update a pull request;
- fetch and inspect remote repository state; and
- make review-requested corrections within the accepted scope.

### 4.1 Standing code-deployment delegation

Tomas approved this delegation on 5 September 2026 in
[#113](https://github.com/Bergertomas/game_profile/issues/113#issuecomment-5553535483).
It supersedes the earlier blanket "non-production only" merge exclusion within
the bounded scope stated here.

The program owner/orchestrator may independently accept, merge and deploy
**in-scope reviewed engineering work under the approved plan**, through the
existing `main` → Workers wiring, when all of the following hold:

- the delivered result follows current governing authority and material review
  findings are resolved;
- the review was performed against the **exact head** being merged, on the
  actual diff and behavior rather than the implementer's narrative;
- proportionate applicable CI has **actually succeeded**; a required check may
  not be waived, bypassed or assumed;
- integration against the current base is sound — exact head/base, conflicts and
  relationship to current `main` are known;
- the canonical origin is verified **before and after** the resulting deployment;
  and
- a known rollback reference to the previous good artifact is recorded before the
  merge.

That a `main` merge deploys code is therefore **no longer, by itself, a per-PR
owner gate**. Downstream-effect awareness is retained as a factual duty, not as a
blocking gate: know what the merge actually triggers, verify the effect, and be
able to roll it back. Do not impose a new ceremonial approval step in front of
this delegation, and do not change production configuration to avoid or widen it.

The delegation covers **code deployment of reviewed in-scope work only**. It
grants no data, content, configuration, methodology or product-direction
authority, and the owner gates below are unchanged. The implementing agent —
Claude or any other worker — remains implementer only: it does not accept, merge
or deploy its own work, and self-acceptance is never authorized.

### 4.2 Owner-reserved decisions

Explicit Tomas authority is still required before actions with materially
different or difficult-to-reverse consequences, including:

- production database migrations, writes, imports, or destructive data work;
- changing secrets, credentials, access policy, platform settings, domains, DNS,
  billing or spending commitments, or live Cloudflare/Neon configuration;
- deleting or rewriting material history or user work;
- publishing editorial/scoring content or making external communications when
  that was not already explicitly authorized;
- material methodology changes, final candidate freeze, or Protocol v1.0
  adoption; or
- choosing among materially different product directions when current authority
  does not resolve the choice.

Tool or platform security prompts may still require a click; that is an
execution constraint, not a project-management approval ceremony.

## 5. Review threshold

### Block acceptance when a finding creates material risk

- security, privacy, data-loss, rights, or production-safety exposure;
- a broken core journey or significant regression;
- fabricated evidence, misleading editorial claims, incorrect scoring meaning,
  or another breach of user trust;
- accessibility failure that prevents or seriously impairs use;
- architecture or data-model behavior likely to cause significant rework,
  unsafe deployment, or incompatible integration;
- tests that are materially green for the wrong reason, or missing verification
  for a high-risk behavior; or
- a clear conflict with governing product authority that changes the delivered
  outcome.

### Accept and log for later when the issue is non-material

- small styling or design-token misreferences that do not change the intended
  experience;
- dead code, minor duplication, naming cleanup, stale comments, or test-harness
  polish;
- cosmetic inconsistencies and low-impact edge cases;
- hypothetical enterprise edge cases that are not credible launch risks;
- temporary migration or documentation drift that does not make the current
  slice unsafe or misleading; or
- broader cleanup that is better handled once several slices are integrated.

Non-blocking findings belong in the task/PR handoff or a cleanup list when they
are worth preserving at all. They do not need to trigger another implementation
loop. If several small issues combine into meaningful product, maintenance, or
release risk, classify the combined effect as material and explain why.

The acceptance target is **professional, coherent, and launch-worthy**, not
perfect. Do not spend more project time eliminating a minor imperfection than
its expected user/project value justifies.

## 6. Verification and context efficiency

- Match checks to risk: narrow change, targeted checks; shared contract or
  integration change, broader suite; release candidate, full release checks.
- Visual or interaction changes require relevant browser/visual evidence, but
  not a full-product audit on every small patch.
- Distinguish product failures from environment or harness failures and report
  both accurately.
- Read the authorities relevant to the slice. Load the full governing set for
  cross-cutting decisions, major integration, or release work; do not repeatedly
  reload unrelated historical material for a narrow correction.
- Reuse prior verified context when the underlying files and SHAs have not
  changed. Verify unstable facts rather than re-deriving the whole project.

## 7. Repository and integration hygiene

- Treat the authoritative dirty worktree as owner work: inspect first, preserve
  it, and prefer isolated review/implementation worktrees.
- Do not assume that every unmerged branch should land. Compare it with `main`,
  current governing documents, and newer competing implementations.
- A functionally good slice can be accepted before its governing-document branch
  is integrated, but it is not merge-ready until the integration base is sound.
- Keep commits coherent and do not include unrelated user changes.
- Before merging, confirm the intended branch, exact SHA, checks, conflicts, and
  relationship to current `main`.
- “Slice accepted,” “merge-ready,” and “production-ready” are distinct states.
  Production readiness may include a later cleanup, security, accessibility,
  content, migration, and release pass.

## 8. Communication and decision style

- Lead with outcome and material risk. Keep routine mechanics concise.
- Use exact branches, SHAs, checks, and observed effects when they matter.
- Do not turn small cleanup observations into release-blocking language.
- Do not wave through a material risk for speed.
- When uncertainty is inexpensive and reversible, make a reasonable scoped
  assumption and continue. Ask Tomas when the answer would materially change the
  product, scope, production state, methodology, publication state, legal
  position, or another owner-reserved outcome.
- Batch non-urgent owner decisions when possible instead of interrupting Tomas
  one at a time.
- Do not make Tomas the message bus when a durable GitHub issue/comment/review
  can carry an engineering instruction directly.

## 9. Repository-native autonomous runner

The canonical runner guide is
`docs/operations/Claude_Code_GitHub_Runner.md`.

The official Claude Code GitHub Action is the preferred default implementation
transport once its smoke test has passed. The program owner may create/update a
bounded issue, invoke Claude at the appropriate effort level, review the result,
post one bounded correction round, and merge the accepted PR under §4.1 without
Tomas manually opening Claude or relaying messages.

The generic runner must not contain production credentials and cannot authorize
its own merge, production action, checklist advancement, scoring-methodology
change, or publication. Repository preflight and task-specific authority still
apply to every material run.

### 9.1 Event-driven orchestrator wake

Once the live smoke test in `docs/operations/ChatGPT_Work_GitHub_Wake.md` passes,
repository-native orchestration should use event-driven ChatGPT Work wakeups as
the normal completion signal and retain the hourly autonomous job as a
watchdog/recovery checkpoint.

The GitHub wake layer is strictly non-decision-making. It may emit one bounded,
machine-readable event signal identifying a completed Claude/CI run, associated
PR, branch/SHA, run ID/attempt, and conclusion. It must not decide that work is
acceptable, choose or launch successor work, merge, advance the checklist,
change scoring/methodology, inspect protected holdouts, mutate production, or
publish editorial content. The awakened ChatGPT orchestrator must perform a
fresh repository preflight and independently reconstruct the actual state before
any such decision.

Duplicate/stale wake events must be harmless. The bridge owns event-level
deduplication; the awakened Work task must claim an event before mutation and
stop if another claim is canonical. If the native Work trigger or required
GitHub action permissions are unavailable, fail closed and let the hourly
watchdog recover rather than replacing GPT judgment with GitHub automation.

**Watchdog state, 5 September 2026:** the existing hourly recovery task was
restored on Tomas's explicit instruction. `docs/operations/ChatGPT_Work_GitHub_Wake.md`
owns the exact configuration record. Event Wake remains enabled and
current-prompt requalification remains incomplete, so do not describe the event
path as requalified. A schedule configuration reading is not proof of an
executed recovery run or of event-path reliability.

## 10. Maintaining this agreement

Update this document when Tomas changes the standing workflow. Keep project-level
memory and agent instruction files as short pointers to this canonical copy so
future chats use one policy rather than drifting duplicates. If a chat-specific
instruction conflicts with this agreement, the latest explicit instruction wins
for that work; update this document when the change is intended to persist.
