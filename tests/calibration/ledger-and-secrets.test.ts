import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  appendLedgerEntry,
  countedAttempt,
  deterministicRunId,
  readLedger,
  retryCount,
  type LedgerEntry,
} from "@/lib/calibration/ledger";
import { REDACTED, redact, redactDeep, safeError } from "@/lib/calibration/redact";

/**
 * Work order §5(18)–§5(21): clean retry accounting, ledger/timing/usage
 * recording, secret redaction and no live key in fixtures, and proof that the
 * live probe cannot run in ordinary CI by accident.
 */

function entry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    entry_version: "1.0",
    run_id: "run-primary-test",
    role: "primary",
    attempt: 1,
    started_at: "2026-01-06T09:00:00Z",
    ended_at: "2026-01-06T09:04:00Z",
    api_elapsed_ms: 240_000,
    qa_minutes: 12,
    provider: "openai",
    requested_model: "gpt-5.6-sol",
    returned_model: "gpt-5.6-sol",
    response_id: "resp_1",
    controlled_input_digests: { rubric: "a".repeat(64) },
    controlled_lock_set_digest: "b".repeat(64),
    semantic_request_digest: "c".repeat(64),
    normalized_packet_digest: "d".repeat(64),
    structured_output_digest: "e".repeat(64),
    decoding_parameters: [{ name: "reasoning_effort", value: "high" }],
    seed: "parameter_unavailable",
    retry_count: 0,
    validation_failures: [],
    human_corrections: [],
    token_usage: { input_tokens: 120_000, output_tokens: 18_000 },
    outcome: "succeeded",
    error_class: null,
    error_message: null,
    ...overrides,
  };
}

function scratchDir(): string {
  return mkdtempSync(path.join(tmpdir(), "calib-ledger-"));
}

describe("the run ledger records what Item 4 gate 7 requires (§5(19))", () => {
  it("round-trips every required field", () => {
    const dir = scratchDir();
    appendLedgerEntry(entry(), { dir });
    const [stored] = readLedger({ dir });
    expect(stored).toBeDefined();
    // Timing, usage, identity, digests, retry and correction state all survive.
    expect(stored!.api_elapsed_ms).toBe(240_000);
    expect(stored!.qa_minutes).toBe(12);
    expect(stored!.token_usage).toEqual({ input_tokens: 120_000, output_tokens: 18_000 });
    expect(stored!.returned_model).toBe("gpt-5.6-sol");
    expect(stored!.seed).toBe("parameter_unavailable");
    expect(stored!.controlled_lock_set_digest).toBe("b".repeat(64));
    expect(stored!.retry_count).toBe(0);
    expect(stored!.human_corrections).toEqual([]);
  });

  it("is append-only: a later entry never replaces an earlier one", () => {
    const dir = scratchDir();
    appendLedgerEntry(entry({ attempt: 1, outcome: "failed_api" }), { dir });
    appendLedgerEntry(entry({ attempt: 2, outcome: "succeeded" }), { dir });
    const entries = readLedger({ dir });
    expect(entries).toHaveLength(2);
    // The failed attempt is still there; a harness cannot quietly turn a failed
    // run into a clean one by rewriting history.
    expect(entries[0]!.outcome).toBe("failed_api");
    expect(entries[1]!.outcome).toBe("succeeded");
  });

  it("writes one JSON Lines record per entry", () => {
    const dir = scratchDir();
    appendLedgerEntry(entry(), { dir });
    appendLedgerEntry(entry({ attempt: 2 }), { dir });
    const file = path.join(dir, "phase3a-runs.jsonl");
    const lines = readFileSync(file, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    for (const line of lines) expect(() => JSON.parse(line)).not.toThrow();
  });

  it("returns an empty ledger rather than throwing on a clean checkout", () => {
    expect(readLedger({ dir: scratchDir() })).toEqual([]);
  });

  it("derives a deterministic, collision-resistant run id", () => {
    expect(deterministicRunId("a".repeat(64), "primary", 1)).toBe(
      deterministicRunId("a".repeat(64), "primary", 1),
    );
    expect(deterministicRunId("a".repeat(64), "primary", 1)).not.toBe(
      deterministicRunId("a".repeat(64), "audit", 1),
    );
    expect(deterministicRunId("a".repeat(64), "primary", 1)).not.toBe(
      deterministicRunId("a".repeat(64), "primary", 2),
    );
    expect(deterministicRunId("a".repeat(64), "primary", 1)).not.toBe(
      deterministicRunId("f".repeat(64), "primary", 1),
    );
  });
});

describe("clean retry accounting (§5(18))", () => {
  it("counts attempts after the first as retries, per request", () => {
    const digest = "c".repeat(64);
    const other = "9".repeat(64);
    const entries = [
      entry({ attempt: 1, outcome: "failed_api" }),
      entry({ attempt: 2, outcome: "failed_validation" }),
      entry({ attempt: 3, outcome: "succeeded" }),
      entry({ semantic_request_digest: other, attempt: 1 }),
    ];
    expect(retryCount(entries, digest)).toBe(2);
    // A different request's attempts never inflate this request's retry count.
    expect(retryCount(entries, other)).toBe(0);
  });

  it("counts a run only when a clean attempt succeeded", () => {
    const digest = "c".repeat(64);
    expect(countedAttempt([entry({ outcome: "failed_api" })], digest)).toBeNull();
    // A semantic correction invalidates the measured attempt (ADR 0036 §10).
    expect(
      countedAttempt([entry({ outcome: "succeeded", human_corrections: ["changed a value"] })], digest),
    ).toBeNull();
    expect(
      countedAttempt([entry({ outcome: "succeeded", validation_failures: ["schema"] })], digest),
    ).toBeNull();
    expect(countedAttempt([entry()], digest)).not.toBeNull();
  });
});

describe("secret redaction (§5(20))", () => {
  it("masks provider key shapes wherever they appear", () => {
    expect(redact("failed with key sk-proj-fakeval")).toBe(`failed with key ${REDACTED}`);
    expect(redact("Authorization: Bearer sk-abcdefghijklmnop")).toContain(REDACTED);
    expect(redact("org-abcdefgh1234")).toBe(REDACTED);
    expect(redact("nothing sensitive here")).toBe("nothing sensitive here");
  });

  it("masks the literal value of a configured secret, whatever its shape", () => {
    const env = { OPENAI_API_KEY: "an-unusual-but-real-secret" } as unknown as NodeJS.ProcessEnv;
    expect(redact("boom: an-unusual-but-real-secret failed", env)).toBe(`boom: ${REDACTED} failed`);
    // A short or empty value must not turn into a match-everything pattern.
    expect(redact("hello", { OPENAI_API_KEY: "" } as unknown as NodeJS.ProcessEnv)).toBe("hello");
    expect(redact("hello", { OPENAI_API_KEY: "abc" } as unknown as NodeJS.ProcessEnv)).toBe("hello");
  });

  it("redacts through nested structures without changing their shape", () => {
    const redacted = redactDeep({
      a: "sk-abcdefghijklmnop",
      b: [1, { c: "sk-abcdefghijklmnop" }],
      d: null,
      e: 42,
    });
    expect(redacted).toEqual({ a: REDACTED, b: [1, { c: REDACTED }], d: null, e: 42 });
  });

  it("produces a safe error class and message", () => {
    const env = { OPENAI_API_KEY: "an-unusual-but-real-secret" } as unknown as NodeJS.ProcessEnv;
    const safe = safeError(new Error("auth failed for an-unusual-but-real-secret"), env);
    expect(safe.error_class).toBe("Error");
    expect(safe.message).toBe(`auth failed for ${REDACTED}`);
    expect(safeError("plain string").error_class).toBe("UnknownError");
  });

  it("redacts on the way into the ledger, not merely on the way out", () => {
    const dir = scratchDir();
    appendLedgerEntry(
      entry({ outcome: "failed_api", error_message: "denied for sk-abcdefghijklmnop" }),
      { dir },
    );
    // Assert against the bytes on disk: a key must never be written at all.
    const raw = readFileSync(path.join(dir, "phase3a-runs.jsonl"), "utf8");
    expect(raw).not.toContain("sk-abcdefghijklmnop");
    expect(raw).toContain(REDACTED);
  });
});

describe("committed fixtures carry no live credential (§5(20))", () => {
  it("no calibration source or fixture contains a credential-shaped string", () => {
    const roots = ["lib/calibration", "scripts/calibration", "tests/calibration"];
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else files.push(full);
      }
    };
    roots.forEach(walk);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const contents = readFileSync(file, "utf8");
      // A real OpenAI key is far longer than 20 characters after its prefix;
      // the stand-ins in these tests are deliberately shorter, so this scan
      // rejects a real credential without being satisfied by a fake one.
      expect(contents, `${file} contains a credential-shaped string`).not.toMatch(
        /\bsk-(proj-)?[A-Za-z0-9_-]{20,}/,
      );
    }
  });

  it("the run-artifact directory is git-ignored", () => {
    const gitignore = readFileSync(".gitignore", "utf8");
    expect(gitignore).toMatch(/^\/calibration-runs\/$/m);
  });
});

describe("the live probe cannot run in ordinary CI by accident (§5(21))", () => {
  const probe = readFileSync("scripts/calibration/live-probe.ts", "utf8");

  it("requires an explicit --live opt-in", () => {
    expect(probe).toContain('argv.includes("--live")');
    expect(probe).toMatch(/if \(!live\)/);
  });

  it("refuses to run when a CI environment is detected", () => {
    expect(probe).toMatch(/env\.CI \|\| env\.GITHUB_ACTIONS/);
    expect(probe).toContain("Refusing to run: a CI environment was detected");
  });

  it("bounds its own output and uses a fixed non-game prompt", () => {
    expect(probe).toMatch(/PROBE_MAX_OUTPUT_TOKENS = \d+/);
    expect(probe).toContain("phase3a-probe");
  });

  it("is not reachable from any aggregate npm script", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["calib:probe"]).toContain("live-probe");
    // No script that CI or a developer runs by habit may invoke the probe.
    for (const [name, command] of Object.entries(pkg.scripts)) {
      if (name === "calib:probe") continue;
      expect(command, `${name} must not invoke the live probe`).not.toContain("live-probe");
    }
    // And there is no bulk/catalog scoring command at all (work order §4).
    for (const command of Object.values(pkg.scripts)) {
      expect(command).not.toMatch(/score-catalog|bulk-score/);
    }
  });
});
