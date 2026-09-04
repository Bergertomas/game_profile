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

Size every Claude assignment to **comfortably complete inside the runner's bounded turn budget**, including repository preflight, implementation, proportional verification, commit/push, and PR handoff. A logically coherent checklist item may still be too large for one runner invocation; runner-sized slices are an execution concern and do not change checklist semantics or acceptance authority.

Prefer the smallest dependency-complete slice that leaves a durable, independently reviewable repository state. Split work along real interfaces (for example immutable inputs/identity, research/freeze transport, scoring transport, validation/ledger) rather than asking one run to discover architecture, implement several dependent subsystems, exhaustively verify them, and perform the GitHub handoff at once.

**Ceiling-recovery rule:** if a run reaches or credibly appears to reach the turn ceiling before completing its required handoff, do not repeatedly rerun the same oversized assignment. Inspect what, if anything, was durably produced; then decompose the remaining work into smaller dependency-ordered assignments and resume from the last accepted repository state. One targeted retry is reasonable only when the failure was transient or the remaining work is demonstrably small. Repeated ceiling failures are evidence of bad assignment sizing, not a reason to increase orchestration churn.

Effort level is not a substitute for decomposition: High/xhigh/Max controls reasoning effort, while assignment size must still fit the runner envelope. Do not parallelize slices that consume one another's not-yet-accepted contracts merely to recover elapsed time.

## Quota exhaustion versus other run failures

Claude Max usage is shared across Claude surfaces — Claude Code, the Claude apps, and this repository-native runner all draw on the same subscription pool — and it operates under a rolling five-hour session window plus weekly limits. Reaching those limits is **resource exhaustion, not an engineering defect**. Misclassifying it produces the wrong recovery: pointless reruns, unnecessary redesign of a correct assignment, or credential churn against a healthy token.

Classify the observed signal before reacting:

| Observed signal | Classification | Correct response |
|---|---|---|
| `5-hour limit reached`, `resets <time>`, `rate limit reached`, or an equivalent subscription-capacity response | Claude Max usage exhaustion | pause the lane and recover per the rules below |
| the run stops at the runner's `--max-turns` ceiling with work still outstanding | assignment exceeded the runner envelope | apply the ceiling-recovery rule above: inspect durable output, decompose, resume |
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

`max` is not the default implementation tier. Where useful, a task may use Max for groundwork and a later High/xhigh invocation for bounded execution.

## Capacity-aware Claude scheduling

The project has substantial Claude Max capacity. Running a single Claude worker out of habit, while genuinely independent ready work sits idle, wastes elapsed time. The orchestrator therefore maintains a **dependency-aware ready queue** rather than a single default lane.

- **Default target: up to 2 concurrent Claude workers** whenever two high-value assignments are ready and genuinely independent.
- **A 3rd worker only** when there is a clearly independent, bounded task with no dependency, no branch/file collision, and no acceptance-contract race against the other two. If that independence is arguable, it does not qualify.
- **Keep one worker on the critical path.** Additional workers consume genuinely dependency-free supporting work — they do not fragment the critical path to look busy.
- **Parallelism buys elapsed time, not throughput of quota.** All workers draw on the same Max pool, so concurrency is worth spending only when the tasks are real and independently valuable. Read *Quota exhaustion versus other run failures* above before widening a fan-out.
- **Prefer High for ordinary parallel work.** Reserve xhigh/Max for assignments that actually warrant them under *Effort lanes*.

Never:

- manufacture low-value work merely to fill available capacity;
- start a downstream slice against a contract that has not been accepted yet (this is the same rule as the sizing section's prohibition on parallelizing slices that consume one another's unaccepted contracts);
- assign holdout research or any work that would expose calibration holdout identities/evidence;
- create branch, file, or migration races between concurrent workers.

**Before launching any worker,** inspect current state so hourly or scheduled orchestrators do not duplicate work already in flight: active GitHub Actions runs, recent issue/PR comments, open PRs, and the files each in-flight assignment touches. The runner already serializes per issue/PR; that does not prevent two different issues from colliding on the same files.

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

The runner uses Opus 5 and a bounded turn budget. It may read GitHub Actions results. Full raw Claude output is not enabled by the workflow.

The runner does not allow bot-triggered invocations by default. Program-owner comments created through the connected GitHub account are expected to arrive as the repository owner; verify this in the harmless dry run before relying on automated orchestrator-to-Claude handoff.

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

## Review threshold

The runner exists to accelerate delivery, not create an enterprise-grade perfection loop. The program owner blocks only material product, trust, accessibility, data-integrity, security, methodology, integration, architectural, legal/provenance, or meaningful rework risk. Non-material cleanup is logged or ignored when its expected value is below the delay it creates.
