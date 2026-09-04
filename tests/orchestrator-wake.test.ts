import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The orchestrator wake bridge, executed rather than eyeballed.
 *
 * ── What went wrong ────────────────────────────────────────────────────────
 *
 * The bridge discriminated the two workflows it listens to with
 * `run.name === 'Claude Code Runner'`. But `claude.yml` sets `run-name:`, and
 * when a workflow does that GitHub replaces `workflow_run.name` *and*
 * `workflow_run.display_title` with the evaluated run name. So a real Claude
 * completion arrives as `claude-work-item-93-comment-5539488946`, matches
 * neither branch, and falls through to a `core.notice(...)` no-op — a green
 * check indistinguishable from a correct fail-closed. Every Claude wake was
 * silently dead, and the smoke plan (which only ever exercised CI, the one
 * path that still worked) could not see it. PR #83 review comment
 * `5539488946` verified the payload semantics against the live Actions API.
 *
 * Separately, the job held `issues: write` / `pull-requests: read`. Live run
 * `33886463641` resolved PR #93 correctly and then failed posting to
 * `/issues/93/comments` with `403 Resource not accessible by integration` and
 * `x-accepted-github-permissions: issues=write; pull_requests=write`. A
 * pull-request conversation comment goes through the Issues API but is gated
 * on the `pull_requests` permission, because the target is a PR.
 *
 * ── Why a test and not a note ──────────────────────────────────────────────
 *
 * Both defects are invisible in a green run and neither is hard to reintroduce:
 * `run.name` reads exactly like the workflow name, and `issues: write` reads
 * exactly like the permission an `issues.createComment` call needs. `workflow_run`
 * also cannot be exercised from a pull request — it only ever executes from the
 * default branch — so nothing about this file is provable pre-merge except by
 * running the script itself against payloads shaped like the real ones.
 *
 * These tests extract the actual `script:` body from the workflow YAML and run
 * it with mocked `github` / `context` / `core`, exactly as
 * `actions/github-script` does. They are behaviour tests of the deployed
 * source, not a re-implementation of it.
 */

/**
 * The runner's GitHub App token cannot push `.github/workflows/**`, so a
 * corrected bridge lands in `docs/operations/patches/` first and the owner
 * applies it verbatim. Read the staged copy while it exists and the live
 * workflow once it is gone — either way, the file under test is the one that
 * will actually run. `docs/operations/patches/README.md` owns the procedure.
 */
const STAGED_PATH = "docs/operations/patches/orchestrator-wake.yml";
const LIVE_PATH = ".github/workflows/orchestrator-wake.yml";

const stagedExists = existsSync(STAGED_PATH);
const workflowPath = stagedExists ? STAGED_PATH : LIVE_PATH;
const workflowSource = readFileSync(workflowPath, "utf8");

/**
 * Pull the `script: |` block scalar out of the workflow. Deliberately a small
 * hand-rolled reader rather than a YAML dependency: one block, one shape, and
 * a parser would still hand back the same string.
 */
function extractScript(yaml: string): string {
  const lines = yaml.split("\n");
  const start = lines.findIndex((line) => /^\s*script:\s*\|\s*$/.test(line));
  if (start === -1) {
    throw new Error(`No \`script: |\` block found in ${workflowPath}`);
  }

  const keyLine = lines[start] as string;
  const keyIndent = keyLine.length - keyLine.trimStart().length;

  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "") {
      body.push("");
      continue;
    }
    if (line.length - line.trimStart().length <= keyIndent) break;
    body.push(line);
  }

  const bodyIndent = Math.min(
    ...body.filter((line) => line !== "").map((line) => line.length - line.trimStart().length),
  );
  return body.map((line) => (line === "" ? "" : line.slice(bodyIndent))).join("\n");
}

const SCRIPT = extractScript(workflowSource);

/**
 * The script with `//` comments stripped. Static assertions below are about
 * what the bridge *does*, and the file explains the defect it no longer has —
 * without this, prose describing `run.name === '...'` reads as the bug itself.
 * Safe to strip naively: no string literal or regex in the script contains `//`.
 */
const CODE = SCRIPT.split("\n")
  .map((line) => line.replace(/\/\/.*$/, ""))
  .join("\n");

const REPOSITORY = "Bergertomas/game_profile";

type Head = { ref: string; sha: string; repo: { full_name: string } | null };
type PullStub = { number: number; head: Head };

interface WorkflowRunPayload {
  id: number;
  name: string;
  display_title: string;
  path: string;
  status: string;
  conclusion: string;
  run_attempt: number;
  head_branch: string;
  head_sha: string;
  pull_requests: { number: number }[];
}

interface Scenario {
  /** The workflow definition path, as GitHub reports it on the run object. */
  workflowPath: string;
  /** What `run-name` evaluated to. Overwrites both `name` and `display_title`. */
  runName?: string;
  /** Definition name, used only when the workflow sets no `run-name`. */
  definitionName?: string;
  conclusion?: string;
  runId?: number;
  runAttempt?: number;
  headBranch?: string;
  headSha?: string;
  associatedPullRequests?: { number: number }[];
  /** PRs resolvable by `pulls.get`. Anything else 404s, as an issue number does. */
  pulls?: PullStub[];
  /** What `pulls.list` returns for the branch-prefix fallback. */
  openPulls?: PullStub[];
  /** Comments already on the resolved PR. */
  comments?: { id: number; body: string }[];
  /** Status to throw from `issues.createComment`, to exercise the 403 path. */
  createCommentStatus?: number;
}

interface Result {
  notices: string[];
  failures: string[];
  created: { issue_number: number; body: string }[];
}

function inRepoHead(ref: string, sha = "a".repeat(40)): Head {
  return { ref, sha, repo: { full_name: REPOSITORY } };
}

function forkHead(ref: string): Head {
  return { ref, sha: "b".repeat(40), repo: { full_name: "someone-else/game_profile" } };
}

const AsyncFunction = Object.getPrototypeOf(async function noop() {}).constructor as new (
  ...args: string[]
) => (github: unknown, context: unknown, core: unknown) => Promise<void>;

const compiled = new AsyncFunction("github", "context", "core", SCRIPT);

async function runBridge(scenario: Scenario): Promise<Result> {
  const result: Result = { notices: [], failures: [], created: [] };

  const pulls = scenario.pulls ?? [];
  const comments = scenario.comments ?? [];

  const github = {
    rest: {
      pulls: {
        get: async ({ pull_number }: { pull_number: number }) => {
          const pull = pulls.find((candidate) => candidate.number === pull_number);
          if (!pull) {
            const error = new Error("Not Found") as Error & { status: number };
            error.status = 404;
            throw error;
          }
          return { data: pull };
        },
        list: () => {
          throw new Error("pulls.list must be reached through github.paginate");
        },
      },
      issues: {
        listComments: () => {
          throw new Error("issues.listComments must be reached through github.paginate");
        },
        createComment: async ({ issue_number, body }: { issue_number: number; body: string }) => {
          if (scenario.createCommentStatus) {
            const error = new Error("Resource not accessible by integration") as Error & {
              status: number;
              response: { headers: Record<string, string> };
            };
            error.status = scenario.createCommentStatus;
            error.response = {
              headers: { "x-accepted-github-permissions": "issues=write; pull_requests=write" },
            };
            throw error;
          }
          result.created.push({ issue_number, body });
          return { data: { id: 1 } };
        },
      },
    },
    paginate: async (route: unknown) => {
      if (route === github.rest.pulls.list) return scenario.openPulls ?? [];
      if (route === github.rest.issues.listComments) return comments;
      throw new Error("Unexpected paginate route");
    },
  };

  const run: WorkflowRunPayload = {
    id: scenario.runId ?? 33886463641,
    // A workflow with `run-name` reports the evaluated run name in both fields.
    name: scenario.runName ?? scenario.definitionName ?? "",
    display_title: scenario.runName ?? scenario.definitionName ?? "",
    path: scenario.workflowPath,
    status: "completed",
    conclusion: scenario.conclusion ?? "success",
    run_attempt: scenario.runAttempt ?? 1,
    head_branch: scenario.headBranch ?? "main",
    head_sha: scenario.headSha ?? "c".repeat(40),
    pull_requests: scenario.associatedPullRequests ?? [],
  };

  const context = {
    repo: { owner: "Bergertomas", repo: "game_profile" },
    payload: {
      workflow_run: run,
      workflow: { name: scenario.definitionName ?? "", path: scenario.workflowPath },
    },
  };

  const core = {
    notice: (message: string) => result.notices.push(message),
    setFailed: (message: string) => result.failures.push(message),
    info: () => {},
  };

  await compiled(github, context, core);
  return result;
}

function wakePayload(result: Result): Record<string, unknown> {
  expect(result.created).toHaveLength(1);
  const body = (result.created[0] as { body: string }).body;
  const json = /```json\n([\s\S]+?)\n```/.exec(body);
  expect(json).not.toBeNull();
  return JSON.parse((json as RegExpExecArray)[1] as string) as Record<string, unknown>;
}

const CLAUDE_PATH = ".github/workflows/claude.yml";
const CI_PATH = ".github/workflows/ci.yml";

/** The shape of a real Claude PR-comment invocation on PR #93. */
function claudeOnPr(overrides: Partial<Scenario> = {}): Scenario {
  return {
    workflowPath: CLAUDE_PATH,
    runName: "claude-work-item-93-comment-5539488946",
    pulls: [{ number: 93, head: inRepoHead("claude/issue-92-20260904-1200") }],
    ...overrides,
  };
}

describe("wake bridge workflow discrimination", () => {
  it("recognises a Claude completion whose run.name was replaced by run-name", async () => {
    const result = await runBridge(claudeOnPr());

    // The regression itself: `run.name` here is the run name, not the
    // definition name, and the pre-fix bridge no-opped on exactly this input.
    expect(result.notices).not.toContain(
      expect.stringContaining("not in the bounded wake set"),
    );
    expect(result.failures).toEqual([]);

    const payload = wakePayload(result);
    expect(payload.target_pr).toBe(93);
    expect(payload.association).toBe("claude_source_pr");
    expect(payload.workflow).toMatchObject({
      name: "Claude Code Runner",
      path: CLAUDE_PATH,
      run_name: "claude-work-item-93-comment-5539488946",
    });
  });

  it("does not discriminate on run.name anywhere in the script", () => {
    // The whole defect in one assertion. `display_title` remains legitimate —
    // it is the field the run-name regex is supposed to read.
    expect(CODE).not.toMatch(/run\.name\s*===/);
    expect(CODE).toContain("display_title");
    expect(CODE).toContain(CLAUDE_PATH);
    expect(CODE).toContain(CI_PATH);
  });

  it("recognises a CI completion, which sets no run-name", async () => {
    const result = await runBridge({
      workflowPath: CI_PATH,
      definitionName: "CI",
      associatedPullRequests: [{ number: 93 }],
      pulls: [{ number: 93, head: inRepoHead("claude/issue-92-20260904-1200") }],
    });

    const payload = wakePayload(result);
    expect(payload.target_pr).toBe(93);
    expect(payload.association).toBe("workflow_run.pull_requests");
    expect(payload.workflow).toMatchObject({ name: "CI", path: CI_PATH });
  });

  it("no-ops for a workflow outside the bounded wake set", async () => {
    const result = await runBridge({
      workflowPath: ".github/workflows/some-other.yml",
      definitionName: "Something Else",
    });

    expect(result.created).toEqual([]);
    expect(result.failures).toEqual([]);
    expect(result.notices.join("\n")).toContain("not in the bounded wake set");
  });

  it("ignores a skipped Claude run even though its run.name is the run name", async () => {
    // Unrelated comments instantiate claude.yml; its trigger-phrase guard then
    // skips the only job. Pre-fix, this guard was unreachable for the same
    // reason the wake path was.
    const result = await runBridge(claudeOnPr({ conclusion: "skipped" }));

    expect(result.created).toEqual([]);
    expect(result.notices.join("\n")).toContain("Ignoring skipped Claude workflow run");
  });

  it("tolerates the reusable-workflow path form", async () => {
    const result = await runBridge(
      claudeOnPr({ workflowPath: `${REPOSITORY}/${CLAUDE_PATH}@refs/heads/main` }),
    );

    expect(wakePayload(result).target_pr).toBe(93);
  });
});

describe("machine-addressable Claude run-name parsing", () => {
  const accepted = [
    { runName: "claude-work-item-93-comment-5539488946", item: 93, comment: 5539488946 },
    { runName: "claude-work-item-1-comment-2", item: 1, comment: 2 },
  ];

  for (const { runName, item, comment } of accepted) {
    it(`parses ${runName}`, async () => {
      const result = await runBridge(
        claudeOnPr({ runName, pulls: [{ number: item, head: inRepoHead("claude/x") }] }),
      );

      const payload = wakePayload(result);
      expect(payload.target_pr).toBe(item);
      expect(payload.runner_source).toMatchObject({
        work_item_number: item,
        comment_id: comment,
      });
    });
  }

  const rejected = [
    // What the Actions UI shows when no `run-name` is set: the comment title.
    "Repair event-wake bridge and shorten Work task prompt",
    // The definition name, which is what a mis-set run-name would leave behind.
    "Claude Code Runner",
    "claude-work-item-93-comment-",
    "claude-work-item--comment-5539488946",
    // Anchoring: neither a prefix nor a suffix may smuggle a different number.
    "x claude-work-item-93-comment-5539488946",
    "claude-work-item-93-comment-5539488946 (#12)",
    "claude-work-item-93-comment-55/../94",
    "",
  ];

  for (const runName of rejected) {
    it(`fails closed on ${JSON.stringify(runName)}`, async () => {
      const result = await runBridge(claudeOnPr({ runName }));

      expect(result.created).toEqual([]);
      expect(result.failures).toEqual([]);
      expect(result.notices.join("\n")).toContain("machine-addressable run-name");
    });
  }
});

describe("event idempotency", () => {
  it("keys one marker on workflow_run:<run_id>:attempt:<attempt>", async () => {
    const result = await runBridge(claudeOnPr({ runId: 4242, runAttempt: 2 }));

    const body = (result.created[0] as { body: string }).body;
    expect(body).toContain("<!-- should-i-play-orchestrator-wake:v1 event_id=workflow_run:4242:attempt:2 -->");
    expect(wakePayload(result).event_id).toBe("workflow_run:4242:attempt:2");
  });

  it("no-ops when that exact marker is already on the PR", async () => {
    const result = await runBridge(
      claudeOnPr({
        runId: 4242,
        runAttempt: 2,
        comments: [
          { id: 1, body: "unrelated" },
          {
            id: 2,
            body: "<!-- should-i-play-orchestrator-wake:v1 event_id=workflow_run:4242:attempt:2 -->\n\n{}",
          },
        ],
      }),
    );

    expect(result.created).toEqual([]);
    expect(result.notices.join("\n")).toContain("already exists on PR #93");
  });

  it("still wakes for a different attempt of the same run", async () => {
    const result = await runBridge(
      claudeOnPr({
        runId: 4242,
        runAttempt: 2,
        comments: [
          {
            id: 2,
            body: "<!-- should-i-play-orchestrator-wake:v1 event_id=workflow_run:4242:attempt:1 -->\n\n{}",
          },
        ],
      }),
    );

    expect(wakePayload(result).event_id).toBe("workflow_run:4242:attempt:2");
  });
});

describe("association boundaries", () => {
  it("refuses a Claude source PR whose head lives in a fork", async () => {
    const result = await runBridge(
      claudeOnPr({ pulls: [{ number: 93, head: forkHead("patch-1") }] }),
    );

    expect(result.created).toEqual([]);
    expect(result.notices.join("\n")).toContain("out-of-repository head");
  });

  it("falls back to the canonical branch prefix when the work item is an issue", async () => {
    const result = await runBridge(
      claudeOnPr({
        runName: "claude-work-item-94-comment-5542328488",
        // No PR #94 — issues and PRs share a number space, so `pulls.get` 404s.
        pulls: [{ number: 95, head: inRepoHead("claude/issue-94-20260904-1459") }],
        openPulls: [
          { number: 95, head: inRepoHead("claude/issue-94-20260904-1459") },
          { number: 96, head: inRepoHead("claude/issue-87-20260903-0900") },
        ],
      }),
    );

    const payload = wakePayload(result);
    expect(payload.target_pr).toBe(95);
    expect(payload.association).toBe("claude_issue_branch_prefix");
  });

  it("fails closed when the branch prefix is ambiguous", async () => {
    const result = await runBridge(
      claudeOnPr({
        runName: "claude-work-item-94-comment-5542328488",
        pulls: [],
        openPulls: [
          { number: 95, head: inRepoHead("claude/issue-94-20260904-1459") },
          { number: 97, head: inRepoHead("claude/issue-94-20260904-1600") },
        ],
      }),
    );

    expect(result.created).toEqual([]);
    expect(result.notices.join("\n")).toContain("resolved 2 open task PRs; fail closed");
  });

  it("fails closed when no task PR exists yet", async () => {
    const result = await runBridge(
      claudeOnPr({ runName: "claude-work-item-94-comment-5542328488", pulls: [], openPulls: [] }),
    );

    expect(result.created).toEqual([]);
    expect(result.notices.join("\n")).toContain("resolved 0 open task PRs; fail closed");
  });

  it("fails closed when a CI run is not associated with exactly one PR", async () => {
    for (const associatedPullRequests of [[], [{ number: 93 }, { number: 95 }]]) {
      const result = await runBridge({
        workflowPath: CI_PATH,
        definitionName: "CI",
        associatedPullRequests,
        pulls: [{ number: 93, head: inRepoHead("claude/x") }],
      });

      expect(result.created).toEqual([]);
      expect(result.notices.join("\n")).toContain("fail closed");
    }
  });
});

describe("wake payload contract", () => {
  it("separates runner-source metadata from the resolved target PR head", async () => {
    // `issue_comment` workflows always execute from the default branch, so a
    // Claude run's own head is `main` and is never the task PR head. Both are
    // emitted, under names that cannot be confused.
    const result = await runBridge(
      claudeOnPr({
        headBranch: "main",
        headSha: "4200149dff8b8f9613f3bfa8e5cafc577946049a",
        pulls: [
          {
            number: 93,
            head: {
              ref: "claude/issue-92-20260904-1200",
              sha: "d".repeat(40),
              repo: { full_name: REPOSITORY },
            },
          },
        ],
      }),
    );

    const payload = wakePayload(result);
    expect(payload.runner_source).toMatchObject({
      head_branch: "main",
      head_sha: "4200149dff8b8f9613f3bfa8e5cafc577946049a",
      work_item_number: 93,
      comment_id: 5539488946,
    });
    expect(payload.target_pr_head).toEqual({
      ref: "claude/issue-92-20260904-1200",
      sha: "d".repeat(40),
    });
    // The old flat `source` key conflated the two; it must not come back.
    expect(payload.source).toBeUndefined();
  });

  it("emits only bounded metadata under the versioned schema", async () => {
    const payload = wakePayload(await runBridge(claudeOnPr()));

    expect(payload.schema).toBe("should-i-play.orchestrator-wake.v1");
    expect(payload.event_type).toBe("workflow_run.completed");
    expect(payload.repository).toBe(REPOSITORY);
    expect(Object.keys(payload).sort()).toEqual([
      "association",
      "event_id",
      "event_type",
      "repository",
      "schema",
      "target_pr",
      "target_pr_head",
      "runner_source",
      "workflow",
    ].sort());
  });

  it("reports a cancelled run rather than filtering it", async () => {
    // Classification is the orchestrator's job. The bridge must not decide that
    // a superseded run is uninteresting.
    const payload = wakePayload(await runBridge(claudeOnPr({ conclusion: "cancelled" })));
    expect((payload.workflow as { conclusion: string }).conclusion).toBe("cancelled");
  });
});

describe("permissions and control boundary", () => {
  it("grants pull-requests: write and nothing else", () => {
    // Live run 33886463641: `issues: write` + `pull-requests: read` produced
    // `403 Resource not accessible by integration` posting to a PR
    // conversation, and GitHub advertised `issues=write; pull_requests=write`.
    // The target is always a PR, so `pull_requests` is the one that applies.
    const block = /\npermissions:\n((?:  .+\n)+)/.exec(workflowSource);
    expect(block).not.toBeNull();

    const granted = ((block as RegExpExecArray)[1] as string)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");

    expect(granted).toEqual(["pull-requests: write"]);
  });

  it("explains the 403 instead of throwing a raw stack", async () => {
    const result = await runBridge(claudeOnPr({ createCommentStatus: 403 }));

    expect(result.created).toEqual([]);
    expect(result.failures.join("\n")).toContain("pull-requests: write");
    expect(result.failures.join("\n")).toContain("issues=write; pull_requests=write");
  });

  it("contains no project judgment", () => {
    // Issue #94 verification 6, and Working Agreement §9.1: the GitHub layer
    // identifies an event and emits metadata. Everything below is orchestration.
    for (const forbidden of [
      "pulls.merge",
      "createDispatch",
      "issues.create(",
      "@claude",
      "/claude-extra",
      "/claude-max",
      "ready queue",
      "approve",
    ]) {
      expect(CODE).not.toContain(forbidden);
    }
  });
});

describe("the Work UI bootstrap prompt", () => {
  /**
   * The Work prompt field is short, and the previous guide told Tomas to paste
   * a 30-step procedure into it. The §5.1 prompt is what actually goes in the
   * UI; §5.2 is the durable repository procedure it hands off to. If §5.1 ever
   * grows back toward §5.2's size, the split has failed.
   */
  const guide = readFileSync("docs/operations/ChatGPT_Work_GitHub_Wake.md", "utf8");

  function fencedTextAfter(heading: string): string {
    const headingIndex = guide.indexOf(heading);
    expect(headingIndex, `missing heading: ${heading}`).toBeGreaterThan(-1);
    const open = guide.indexOf("```text", headingIndex);
    expect(open, `no \`\`\`text block after ${heading}`).toBeGreaterThan(-1);
    const close = guide.indexOf("```", open + "```text".length);
    return guide.slice(open + "```text\n".length, close);
  }

  const shortPrompt = fencedTextAfter("### 5.1 Exact short Work UI bootstrap prompt");
  const fullProcedure = fencedTextAfter("### 5.2 Repository-owned orchestration procedure");

  it("fits substantially below the full procedure", () => {
    expect(shortPrompt.length).toBeLessThan(2600);
    expect(shortPrompt.length).toBeLessThan(fullProcedure.length * 0.4);
  });

  it("establishes the safety boundary before any mutation", () => {
    // Each of these must survive in the UI copy even though §5.2 repeats them,
    // because they have to hold when the repository has not been read yet.
    for (const required of [
      "should-i-play-orchestrator-wake:v1",
      "should-i-play.orchestrator-wake.v1",
      "Bergertomas/game_profile",
      "event_id",
      "untrusted",
      "main` HEAD",
      "AGENTS.md",
      "docs/Should_I_Play_Orchestrator_Bootstrap.md",
      "docs/Should_I_Play_Working_Agreement.md",
      "should-i-play-orchestrator-claim:v1",
      "lowest comment ID",
      "fail closed",
    ]) {
      expect(shortPrompt).toContain(required);
    }
  });

  it("hands off to the repository-owned procedure", () => {
    expect(shortPrompt).toContain("docs/operations/ChatGPT_Work_GitHub_Wake.md` §5.2");
  });

  it("carries no mutable operating policy the Working Agreement owns", () => {
    // A percentage pasted into a SaaS field is an undated copy that drifts.
    expect(shortPrompt).not.toMatch(/\d+\s*[–-]\s*\d+\s*%/);
    expect(shortPrompt).not.toMatch(/\d+%/);
  });
});

describe("staged patch hygiene", () => {
  it("is deleted once the live workflow carries it", () => {
    if (!stagedExists) return;

    const live = readFileSync(LIVE_PATH, "utf8");
    expect(
      live === workflowSource,
      `${STAGED_PATH} has been applied to ${LIVE_PATH}. Delete the staged copy ` +
        "so one file owns the bridge (see docs/operations/patches/README.md).",
    ).toBe(false);
  });
});
