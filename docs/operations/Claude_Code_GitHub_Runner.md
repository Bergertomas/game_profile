# Claude Code GitHub Runner — Should I Play?

**Status:** operating guide for Issue #53

**Owner:** Tomas

**Program owner / orchestrator:** ChatGPT / GPT-5.6 Sol High

## Purpose

Use Anthropic's official `anthropics/claude-code-action` as the default repository-native implementation runner so Tomas is not the message bus between the orchestrator and Claude.

The normal loop is:

1. the program owner creates or updates a bounded GitHub issue/PR with current authority and acceptance criteria;
2. the program owner invokes the appropriate Claude effort lane;
3. Claude performs repository preflight, implements on the task branch/PR, runs proportional verification, and reports exact repository state;
4. the program owner independently reviews the actual diff and CI;
5. one bounded correction round is requested when material risk remains;
6. the program owner merges when the professional/launch-worthy threshold is met.

Claude does not self-authorize checklist advancement, production activation, publication, or merge acceptance.

For an issue-triggered implementation that changes repository files, Claude must complete the handoff itself: push the scoped branch and open the pull request (for example with the repo-scoped `gh pr create`) rather than leaving Tomas a manual “create PR” link. This is a transport responsibility, not merge authority. On an existing PR, Claude updates that PR's branch instead of opening a competing PR.

## Assignment sizing and runner-envelope discipline

Size Claude assignments around the **natural coherent unit of work first**, then check that the assignment has enough runner headroom to complete repository preflight, implementation, proportional verification, commit/push, and PR handoff. The turn ceiling is a safety envelope, not a target and not a reason to fragment a task against its engineering nature.

Prefer a dependency-complete assignment that can be understood, implemented, tested, and reviewed as one meaningful change. Split work when there is a real architectural, dependency, review, risk, or parallelization boundary — for example immutable inputs/identity, research/freeze transport, scoring transport, validation/ledger — but do **not** beat a naturally coherent assignment into very small slices merely to stay far below the ceiling. Repeated preflight and handoff overhead is itself a real cost.

A large task should first be tested for **natural decomposition**: can independent pieces proceed safely, can one bounded prerequisite land before another, or can genuinely independent work run in parallel without contract/file races? If yes, split there. If not, preserve the coherent assignment and select the effort lane/headroom that matches its complexity.

### Dynamic turn-headroom policy

The repository runner deliberately gives higher-effort work more breathing room:

| Trigger | Effort | Default turn ceiling | Intended posture |
|---|---|---:|---|
| `@claude` | `high` | 50 | ordinary bounded implementation with enough room for mandatory preflight and handoff |
| `/claude-extra` | `xhigh` | 100 | complex/cross-cutting work that benefits from materially deeper exploration and verification |
| `/claude-max` | `max` | 150 | unusually demanding groundwork, architecture, planning, oversight, or high-consequence synthesis |

These are the live values in `.github/workflows/claude.yml`. The xhigh and Max ceilings were raised from 75/100 in PR #78 after two consecutive naturally coherent xhigh assignments reached 78 and 76 turns against the previous 75-turn envelope — one completing just past the ceiling, one losing its local work at it. High stays at its owner-approved 50. That adjustment applied this section's own rule: correct the envelope rather than atomize coherent work.

These ceilings are defaults, not work quotas. Claude should stop as soon as the accepted assignment is complete. The orchestrator should periodically inspect run behavior and historical ceiling usage; if a lane routinely finishes with large unused headroom, leave it alone unless the extra envelope causes a concrete problem. If a lane routinely hits the ceiling on otherwise well-sized coherent assignments, adjust the runner policy rather than mechanically slicing work smaller and smaller.

**Ceiling-recovery rule:** if a run reaches or credibly appears to reach the turn ceiling before completing its required handoff, inspect what, if anything, was durably produced. Then decide whether the cause was (a) a naturally oversized assignment that should be split at a meaningful boundary, (b) an effort/headroom mismatch, or (c) transient churn. Do not repeatedly rerun an unchanged assignment against the same inadequate ceiling. One targeted retry is reasonable when the remaining work is demonstrably small or when the runner envelope has just been corrected. Repeated ceiling failures remain a signal to revisit sizing or lane selection, but they do **not** automatically prove that the assignment must be atomized.

Effort level and assignment size are related but distinct: High/xhigh/Max controls reasoning effort and corresponding headroom; task boundaries should still follow natural engineering structure. Do not parallelize slices that consume one another's not-yet-accepted contracts merely to recover elapsed time.

## Quota exhaustion versus other run failures

Claude Max usage is shared across Claude surfaces — Claude Code, the Claude apps, and this repository-native runner all draw on the same subscription pool — and it operates under a rolling five-hour session window plus weekly limits. Reaching those limits is **resource exhaustion, not an engineering defect**. Misclassifying it produces the wrong recovery: pointless reruns, unnecessary redesign of a correct assignment, or credential churn against a healthy token.

Classify the observed signal before reacting:

| Observed signal | Classification | Correct response |
|---|---|---|
| `5-hour limit reached`, `resets <time>`, `rate limit reached`, or an equivalent subscription-capacity response | Claude Max usage exhaustion | pause the lane and recover per the rules below |
| the run stops at the runner's `--max-turns` ceiling with work still outstanding | runner-envelope exhaustion | inspect durable output, then reassess natural task boundaries and effort/headroom under the sizing policy above |
| GitHub Actions job timeout or cancellation | CI infrastructure envelope | inspect the workflow run; resize or rerun the job, not the subscription |
| `401`, token expired/revoked, or auth rejection | authentication failure | follow *Token rotation / recovery* below |
| red CI, failing tests, failing build | ordinary verification failure | fix on the task branch |
| wrong, incomplete, or out-of-scope behavior in the diff | implementation defect | one bounded correction round |

On usage exhaustion:

- preserve the branch, commits, and artifacts already produced; do not discard partial durable work or force-reset the task branch;
- record the reported reset time when one is available, and state the classification plainly in the issue/PR handoff so the next session does not re-diagnose it as a defect;
- do not retry the same invocation repeatedly before the reset — repeated attempts consume nothing but wall-clock and noise;
- use the interval for other safe work that does not need Claude capacity: orchestration, independent review of existing diffs, CI inspection, issue framing, documentation;
- after the reset, resume the highest-value blocked Claude task first rather than whatever is most recently in view;
- never weaken authentication, downgrade repository permissions, or substitute production credentials as a capacity workaround.

## Effort lanes

The orchestrator chooses the lane per assignment.

| Trigger | Opus 5 effort | Intended use |
|---|---|---|
| `@claude` | `high` | default implementation, fixes, tests, ordinary bounded engineering |
| `/claude-extra` | `xhigh` | complex engineering/design, difficult debugging, cross-cutting or architecture-sensitive implementation |
| `/claude-max` | `max` | unusually demanding initial planning, scoping, architecture, groundwork, or high-consequence synthesis |

`max` is not the default implementation tier. Where useful, a task may use Max for groundwork and a later High/xhigh invocation for bounded execution. The larger xhigh/Max turn envelopes are there to preserve coherent work, not to encourage unnecessary deliberation.

## Capacity-aware Claude scheduling

The project has substantial Claude Max capacity. Running a single Claude worker out of habit, while genuinely independent ready work sits idle, wastes elapsed time. The orchestrator therefore maintains a **dependency-aware ready queue** rather than a single default lane.

**Claude capacity is perishable project capacity.** When substantial capacity remains in the current five-hour usage window, the orchestrator should proactively spend it on the highest-value dependency-safe ready work rather than defaulting to idle capacity. Optimize for useful, accepted work completed per usage window — not for minimum model usage and not for maximum token burn.

When sufficient genuinely useful dependency-safe work exists, **aspire to roughly 70–90% useful utilization of the five-hour Claude window**. This is not a quota/SLO and does not override engineering judgment. A mature window around 20% while useful ready work existed is a strong underutilization signal; diagnose waiting, overly conservative concurrency, poor task framing, effort mismatch, or inadequate headroom rather than manufacturing token consumption.

- **Default target: up to 2 concurrent Claude workers** whenever two high-value assignments are ready and genuinely independent.
- **A 3rd worker only** when there is a clearly independent, bounded task with no dependency, no branch/file collision, and no acceptance-contract race against the other two. If that independence is arguable, it does not qualify.
- **Keep one worker on the critical path.** Additional workers consume genuinely dependency-free supporting work — they do not fragment the critical path to look busy.
- **Use spare capacity proactively.** Suitable ready work includes already-authorized test/tooling hardening, bounded documentation or checkpoint reconciliation, independent implementation audits, preparation behind already-accepted interfaces, and unrelated accepted public-product work that remains useful even if the critical-path PR changes.
- **Do not make the hourly checkpoint the throughput clock.** If a worker finishes and its output can be independently reviewed and accepted, launch the next dependency-safe assignment promptly when orchestration is active rather than idling until the next scheduled observation. Hourly runs are watchdog/recovery checkpoints, not a reason to leave ready work waiting.
- **Treat persistently low window utilization as an orchestration signal.** If a window is well advanced while only a small fraction of available capacity has been consumed and valuable ready work exists, inspect whether concurrency, assignment sizing, effort routing, or avoidable checkpoint waiting is too conservative. Repeatedly ending windows with substantial unused capacity should trigger an operating-policy review.
- **As a reset approaches, widen useful concurrency before inventing work.** Remaining capacity can justify pulling forward genuinely valuable dependency-free work or using xhigh/Max for work that independently warrants those lanes; proximity to reset is never by itself a reason to inflate effort or start low-value tasks.
- **Parallelism buys elapsed time and can improve utilization, but all workers draw on the same Max pool.** Spend concurrency only on real independently valuable tasks. Read *Quota exhaustion versus other run failures* above before widening a fan-out.
- **Prefer High for ordinary parallel work.** Reserve xhigh/Max for assignments that actually warrant them under *Effort lanes*.

Never:

- manufacture low-value work merely to fill available capacity;
- start a downstream slice against a contract that has not been accepted yet;
- assign holdout research or any work that would expose calibration holdout identities/evidence;
- create branch, file, or migration races between concurrent workers;
- weaken an owner gate, methodology boundary, production boundary, or review threshold merely to consume expiring capacity.

**Before launching any worker,** inspect current state so hourly or event-driven orchestrators do not duplicate work already in flight: active GitHub Actions runs, recent issue/PR comments, open PRs, and the files each in-flight assignment touches. The runner already serializes per issue/PR; that does not prevent two different issues from colliding on the same files.

## Orchestration context boundary

Scheduled or automated orchestrator conversations may execute outside the ChatGPT UI's `Should I Play` Project container, so Project-level instructions and chat continuity cannot be assumed present. This must never become a correctness dependency. Repository preflight is the durable correctness boundary: verify current `main`, read `AGENTS.md` and `docs/Should_I_Play_Orchestrator_Bootstrap.md`, then the task-specific authority. GitHub remains the source of truth for project context. If repository authority cannot be read, disclose that and stop before making a material decision from chat or model memory.

## Safety boundaries

The generic runner has repository/GitHub workflow permissions only. It must not be given production database credentials, deployment credentials, provider secrets used for live editorial/data mutation, or other production-control credentials.

Unless a separately governed task explicitly authorizes otherwise, Claude must not:

- mutate or migrate the authoritative production database;
- deploy or change production infrastructure/configuration;
- publish editorial/scoring content;
- change scoring methodology or act as the Phase 3A editorial scorer;
- expose calibration holdout identities/evidence to a development scoring run;
- merge its own PR or declare a master-checklist item accepted;
- broaden an issue merely because adjacent cleanup is possible.

Repository `CLAUDE.md` imports `AGENTS.md`, so every material runner task inherits the mandatory live-main/bootstrap/task-authority preflight.

## Trigger behavior

The workflow listens only to newly created issue/PR conversation comments and inline PR review comments containing one of the three effort triggers. A run is serialized per issue/PR so two Claude executions do not race on the same work item.

The runner uses Opus 5 with effort-sensitive turn headroom: High 50, xhigh 100, Max 150. The GitHub Actions job timeout is 240 minutes. These are safety envelopes; Claude should stop once the bounded assignment and required handoff are complete. The runner may read GitHub Actions results. Full raw Claude output is not enabled by the workflow.

Claude runs carry a machine-addressable `run-name` of `claude-work-item-<issue-or-pr-number>-comment-<comment-id>`. That name is transport metadata only. It lets the separate wake bridge associate a completed/failed runner invocation with its durable work item without reading model output or making project judgments. Because `run-name` also overwrites `workflow_run.name`, anything consuming these runs must identify the workflow by its definition path rather than its name; `docs/operations/ChatGPT_Work_GitHub_Wake.md` §3 owns that contract.

The runner does not allow bot-triggered invocations by default. Program-owner comments created through the connected GitHub account are expected to arrive as the repository owner; verify this in the harmless dry run before relying on automated orchestrator-to-Claude handoff.

## Event-driven orchestrator wake

`docs/operations/ChatGPT_Work_GitHub_Wake.md` governs the event-driven completion path. After its end-to-end smoke test passes, a completed Claude or PR-CI run should wake the GPT-5.6 Sol orchestrator through a bounded machine-readable PR comment instead of waiting for the next hourly checkpoint. The hourly job remains the watchdog/recovery layer.

The wake workflow is not an orchestrator. It may identify repository/workflow/run/PR/branch/SHA/conclusion metadata, deduplicate the event, and post the wake comment. It may not read a ready queue to choose work, decide acceptance, merge, invoke Claude, advance the checklist, alter methodology, expose holdouts, mutate production, or publish content.

The existing issue-first runner remains supported for now. Issue-first runs are associated only when exactly one open in-repository task PR has the canonical `claude/issue-<issue>-*` branch prefix; zero or several candidates fail closed. One in-between case is contained rather than fail-closed — a run that dies before opening its PR while an older prefix-matching PR is still open will name that stale PR. `docs/operations/ChatGPT_Work_GitHub_Wake.md` §8 states that boundary precisely and records why a later PR-first framing posture is preferable for orchestration-critical work and why that change is not made mandatory until its mechanical creation path is separately tested.

Workflow files cannot be pushed by the runner's GitHub App token. When a runner task needs to change one, it stages the exact file under `docs/operations/patches/` for the owner to apply; see that directory's README.

## One-time owner setup

1. Install the official Claude GitHub App for `Bergertomas/game_profile`.
2. Generate a Claude subscription token locally with `claude setup-token` while authenticated to the intended Max account.
3. Store it as repository Actions secret `CLAUDE_CODE_OAUTH_TOKEN`.
4. Never commit, print, paste into chat, or place that token in issue/PR text.

## Token rotation / recovery

The OAuth token is a long-lived credential. If it expires, is revoked, or authentication starts returning 401:

1. confirm the local Claude session is authenticated to the intended subscription;
2. update Claude Code to current;
3. generate a fresh token with `claude setup-token`;
4. replace the repository secret `CLAUDE_CODE_OAUTH_TOKEN` without exposing the value;
5. rerun the harmless runner smoke test.

If a freshly generated token works locally but the official GitHub Action still rejects it, treat that as an Anthropic auth-integration problem. Do not weaken repository permissions or switch to production credentials as a workaround. Use the current official Anthropic troubleshooting path or, with Tomas's explicit approval, choose another supported authentication method.

## Acceptance smoke test

Before relying on the runner for Item 6:

- create a harmless disposable issue with no production or scoring effect;
- invoke `@claude` with a tiny documentation-only change;
- verify Claude reads `AGENTS.md`/bootstrap, creates the correct branch and pull request itself, runs at the expected effort, and cannot self-merge;
- repeat only if necessary with `/claude-extra` or `/claude-max` to verify effort routing; do not waste Max usage solely for ceremony;
- independently review the resulting diff and workflow logs, then close/delete the disposable artifact as appropriate.

The separate event-wake smoke test is owned by `docs/operations/ChatGPT_Work_GitHub_Wake.md`; runner acceptance does not imply bot-authored Work wake support.

## Review threshold

The runner exists to accelerate delivery, not create an enterprise-grade perfection loop. The program owner blocks only material product, trust, accessibility, data-integrity, security, methodology, integration, architectural, legal/provenance, or meaningful rework risk. Non-material cleanup is logged or ignored when its expected value is below the delay it creates.
