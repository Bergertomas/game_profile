import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ABORT_BACKSTOP_HEADROOM_MS,
  TransportBoundError,
  boundedDispatcher,
  bundledAgentConstructor,
  proveTransportBound,
} from "@/lib/calibration/http-transport";
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  ExecutionContractError,
  callResponses,
  toRequestBody,
} from "@/lib/calibration/openai-client";
import {
  PREREGISTERED_MODEL,
  PREREGISTERED_REASONING_CONTEXT,
  PREREGISTERED_REASONING_EFFORT,
  type ModelConfiguration,
} from "@/lib/calibration/request-builder";
import { D1_RESEARCH_REQUEST_TIMEOUT_MS } from "@/lib/calibration/d1-research";
import { REDACTED, safeError, safeErrorCauses } from "@/lib/calibration/redact";
import { appendLedgerEntry, readLedger, type LedgerEntry } from "@/lib/calibration/ledger";

/**
 * #126 — the request timeout is effective at the HTTP dispatcher layer, and a
 * transport failure names itself in the ledger.
 *
 * D1 research attempt 2 ran once from `main` `2ae42c8` and ended after
 * `300095 ms` as `failed_api / TypeError / fetch failed`, with no returned
 * model, response ID or token usage (issue #101 comment 5554326255). The harness
 * set a 600-second `AbortController` and nothing else; Node's global `fetch` is
 * undici, whose dispatcher applies its own 300-second `headersTimeout` and
 * `bodyTimeout`. The intended bound was never the effective one.
 *
 * The same failure was reproduced offline before this file was written, against
 * a loopback server that accepts the POST and never sends a response header:
 * `TypeError: fetch failed` after `300790 ms`, nested cause `HeadersTimeoutError`
 * / `UND_ERR_HEADERS_TIMEOUT`, with the 600-second abort never reached. Waiting
 * out five minutes is not something a test suite should do, so the tests below
 * hold the mechanism fixed at small configured bounds instead: the same stalled
 * server, the same nested code, at the bound this harness asks for.
 *
 * Nothing here contacts a provider, reads a credential or spends anything. Every
 * server is bound to 127.0.0.1 on an ephemeral port.
 */

const CONFIG: ModelConfiguration = {
  model: PREREGISTERED_MODEL,
  reasoning_effort: PREREGISTERED_REASONING_EFFORT,
  reasoning_context: PREREGISTERED_REASONING_CONTEXT,
  store: false,
  tools: [],
  max_output_tokens: 4096,
};

function request(overrides: Record<string, unknown> = {}) {
  return { ...toRequestBody(CONFIG, { instructions: "i", input: "p" }), ...overrides };
}

/** How the controlled server behaves once it has accepted the request. */
type Behaviour =
  /** Accept, then never send a status line or headers. The attempt-2 shape. */
  | "stall"
  /** Send headers, then never send a body byte. */
  | "headers-then-stall"
  /** Send headers, then trickle bytes forever, so no inactivity bound fires. */
  | "headers-then-trickle"
  /** Answer normally. */
  | "respond";

interface Controlled {
  readonly baseUrl: string;
  /** Requests the server actually received. Proves the call count on the wire. */
  readonly received: () => number;
}

const servers: Server[] = [];
const timers: NodeJS.Timeout[] = [];

afterEach(() => {
  for (const timer of timers.splice(0)) clearInterval(timer);
  for (const server of servers.splice(0)) server.close();
});

async function controlled(behaviour: Behaviour): Promise<Controlled> {
  let received = 0;
  const server = createServer((_req, res) => {
    received += 1;
    if (behaviour === "stall") return;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.flushHeaders();
    if (behaviour === "headers-then-stall") return;
    if (behaviour === "headers-then-trickle") {
      const timer = setInterval(() => res.write(" "), 100);
      timers.push(timer);
      res.on("close", () => clearInterval(timer));
      return;
    }
    res.end(JSON.stringify({ id: "resp_local", model: PREREGISTERED_MODEL, output_text: "{}" }));
  });
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("no ephemeral port");
  return { baseUrl: `http://127.0.0.1:${address.port}/v1`, received: () => received };
}

describe("the request timeout is enforced at the undici dispatcher layer", () => {
  it("resolves the bundled undici Agent rather than depending on a separate copy", () => {
    const Agent = bundledAgentConstructor();
    expect(Agent).not.toBeNull();
    expect(Agent!.name).toBe("Agent");
  });

  it("ends a stalled connection at the configured bound, not undici's 300-second default", async () => {
    const server = await controlled("stall");
    const started = Date.now();
    const result = await callResponses(request(), {
      apiKey: "sk-not-a-real-key",
      baseUrl: server.baseUrl,
      timeoutMs: 250,
    });
    const elapsed = Date.now() - started;

    expect(result.metadata.ok).toBe(false);
    expect(result.metadata.error_class).toBe("TypeError");
    // The nested code attempt 2 could not report.
    expect(result.metadata.error_cause_chain).toEqual([
      { error_class: "HeadersTimeoutError", code: "UND_ERR_HEADERS_TIMEOUT" },
    ]);
    // Undici's timer is coarse, so the assertion is that the configured bound
    // governed — orders of magnitude below the 300-second default.
    expect(elapsed).toBeLessThan(5_000);
    expect(result.metadata.returned_model).toBeNull();
    expect(result.metadata.response_id).toBeNull();
    expect(result.metadata.token_usage).toBeNull();
  });

  it("ends a stalled response body at the configured bound", async () => {
    const server = await controlled("headers-then-stall");
    const started = Date.now();
    const result = await callResponses(request(), {
      apiKey: "sk-not-a-real-key",
      baseUrl: server.baseUrl,
      timeoutMs: 250,
    });

    expect(result.metadata.ok).toBe(false);
    expect(result.metadata.error_cause_chain).toEqual([
      { error_class: "BodyTimeoutError", code: "UND_ERR_BODY_TIMEOUT" },
    ]);
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("without a configured dispatcher the same stall is not bounded anywhere near it", async () => {
    // The other half of the diagnosis: nothing about the stalled server makes
    // the call fail quickly. Only the dispatcher configuration does. Left to
    // Node's default this connection would sit for the full 300 seconds.
    const server = await controlled("stall");
    const controller = new AbortController();
    const bare = fetch(`${server.baseUrl}/responses`, {
      method: "POST",
      signal: controller.signal,
    }).catch((error: unknown) => error);

    const outcome = await Promise.race([
      bare,
      new Promise<"still-open">((resolve) => setTimeout(() => resolve("still-open"), 1_500)),
    ]);
    controller.abort();
    await bare;

    expect(outcome).toBe("still-open");
  });

  it("still applies the abort backstop when no inactivity bound can fire", async () => {
    // A response that keeps trickling bytes resets undici's body timeout for
    // ever. Total wall clock is the abort's job, and it is still there.
    const server = await controlled("headers-then-trickle");
    const started = Date.now();
    const result = await callResponses(request(), {
      apiKey: "sk-not-a-real-key",
      baseUrl: server.baseUrl,
      timeoutMs: 250,
    });
    const elapsed = Date.now() - started;

    expect(result.metadata.ok).toBe(false);
    expect(result.metadata.error_class).toBe("AbortError");
    expect(elapsed).toBeGreaterThanOrEqual(250 + ABORT_BACKSTOP_HEADROOM_MS - 100);
    expect(elapsed).toBeLessThan(250 + ABORT_BACKSTOP_HEADROOM_MS + 5_000);
  });

  it("makes exactly one request on the wire and never retries it", async () => {
    const server = await controlled("stall");
    const result = await callResponses(request(), {
      apiKey: "sk-not-a-real-key",
      baseUrl: server.baseUrl,
      timeoutMs: 250,
    });
    expect(result.metadata.ok).toBe(false);
    // Work order §3.9: a retry is a new clean attempt the caller records. A
    // transport that reconnected here would silently create a second attempt.
    expect(server.received()).toBe(1);
  });

  it("succeeds normally through the bounded dispatcher", async () => {
    const server = await controlled("respond");
    const result = await callResponses(request(), {
      apiKey: "sk-not-a-real-key",
      baseUrl: server.baseUrl,
      timeoutMs: 30_000,
    });
    expect(result.metadata.ok).toBe(true);
    expect(result.metadata.returned_model).toBe(PREREGISTERED_MODEL);
    expect(result.metadata.error_cause_chain).toEqual([]);
    expect(server.received()).toBe(1);
  });

  it("attaches the dispatcher to the request it sends", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ id: "r", model: PREREGISTERED_MODEL, output_text: "{}" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;
    await callResponses(request(), { apiKey: "sk-not-a-real-key", fetchImpl });
    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const dispatcher = (init as { dispatcher?: unknown }).dispatcher;
    expect(dispatcher).toBeDefined();
    expect((dispatcher as object).constructor.name).toBe("Agent");
  });

  it("asserts the frozen contract before any dispatcher or request exists", async () => {
    const server = await controlled("respond");
    await expect(
      callResponses(request({ model: "gpt-5.6" }), {
        apiKey: "sk-not-a-real-key",
        baseUrl: server.baseUrl,
      }),
    ).rejects.toThrow(ExecutionContractError);
    expect(server.received()).toBe(0);
  });
});

describe("a runtime that cannot enforce the bound refuses instead of guessing", () => {
  const SLOT = Symbol.for("undici.globalDispatcher.1");

  it("refuses when the installed global dispatcher is not undici's Agent", () => {
    const holder = globalThis as unknown as Record<symbol, unknown>;
    const original = holder[SLOT];
    class ProxyAgent {}
    holder[SLOT] = new ProxyAgent();
    try {
      expect(bundledAgentConstructor()).toBeNull();
      expect(() => boundedDispatcher(1_000)).toThrow(TransportBoundError);
      // The refusal says what it is protecting against, so an operator reading
      // it does not "fix" it by removing the bound.
      expect(() => boundedDispatcher(1_000)).toThrow(/300-second default/);
    } finally {
      holder[SLOT] = original;
    }
  });

  it("refuses a non-positive bound", () => {
    expect(() => boundedDispatcher(0)).toThrow(TransportBoundError);
    expect(() => boundedDispatcher(Number.NaN)).toThrow(TransportBoundError);
  });

  it("proves the bound offline, which is what the operator's dry run reports", async () => {
    const proof = await proveTransportBound(250);
    expect(proof.ok).toBe(true);
    expect(proof.cause_code).toBe("UND_ERR_HEADERS_TIMEOUT");
    expect(proof.elapsed_ms).toBeLessThan(5_000);
  });
});

describe("the bounds this harness ships", () => {
  it("keeps the default call bound and gives the research call its own explicit one", () => {
    expect(DEFAULT_REQUEST_TIMEOUT_MS).toBe(600_000);
    // The registered research request asks for up to 100,000 output tokens from
    // a high-reasoning model with web search and is not streamed, so nothing
    // arrives until the pass is finished.
    expect(D1_RESEARCH_REQUEST_TIMEOUT_MS).toBe(1_800_000);
    expect(D1_RESEARCH_REQUEST_TIMEOUT_MS).toBeGreaterThan(300_000);
  });

  it("wires that bound into the research call and refuses a live run on an unproven runtime", () => {
    const pass = readFileSync("lib/calibration/d1-research.ts", "utf8");
    expect(pass).toContain("timeoutMs: options.timeoutMs ?? D1_RESEARCH_REQUEST_TIMEOUT_MS");
    const cli = readFileSync("scripts/calibration/d1-research.ts", "utf8");
    expect(cli).toContain("await proveTransportBound()");
    expect(cli).toMatch(/if \(!transport\.ok\)/);
    expect(cli).toContain("error_cause_chain: result.error_cause_chain");
  });
});

describe("nested transport diagnostics are retained safely", () => {
  it("keeps the class and code of every nested cause", () => {
    const inner = Object.assign(new Error("Headers Timeout Error"), {
      name: "HeadersTimeoutError",
      code: "UND_ERR_HEADERS_TIMEOUT",
    });
    const outer = new TypeError("fetch failed", { cause: inner });
    expect(safeErrorCauses(outer)).toEqual([
      { error_class: "HeadersTimeoutError", code: "UND_ERR_HEADERS_TIMEOUT" },
    ]);
    expect(safeError(outer).error_class).toBe("TypeError");
    expect(safeError(outer).message).toBe("fetch failed");
  });

  it("never retains a nested cause's message, which is where a host or URL lives", () => {
    const inner = Object.assign(new Error("connect ECONNREFUSED 10.1.2.3:443"), {
      name: "Error",
      code: "ECONNREFUSED",
    });
    const chain = safeErrorCauses(new TypeError("fetch failed", { cause: inner }));
    expect(chain).toEqual([{ error_class: "Error", code: "ECONNREFUSED" }]);
    expect(JSON.stringify(chain)).not.toContain("10.1.2.3");
    expect(JSON.stringify(chain)).not.toContain("connect");
  });

  it("masks anything that is not identifier-shaped, and any credential", () => {
    const env = { OPENAI_API_KEY: "an-unusual-but-real-secret" } as unknown as NodeJS.ProcessEnv;
    const freeText = Object.assign(new Error("x"), {
      name: "failed to POST https://api.openai.com/v1/responses",
      code: "Bearer sk-abcdefghijklmnop",
    });
    expect(safeErrorCauses(new TypeError("fetch failed", { cause: freeText }), env)).toEqual([
      { error_class: REDACTED, code: REDACTED },
    ]);
    const secret = Object.assign(new Error("x"), {
      name: "Error",
      code: "an-unusual-but-real-secret",
    });
    expect(safeErrorCauses(new TypeError("fetch failed", { cause: secret }), env)).toEqual([
      { error_class: "Error", code: REDACTED },
    ]);
  });

  it("walks a bounded chain and survives a cycle", () => {
    const a = Object.assign(new Error("a"), { name: "A", code: "A_CODE" }) as Error & {
      cause?: unknown;
    };
    const b = Object.assign(new Error("b"), { name: "B", code: "B_CODE", cause: a });
    a.cause = b;
    const chain = safeErrorCauses(new TypeError("fetch failed", { cause: b }));
    expect(chain).toEqual([
      { error_class: "B", code: "B_CODE" },
      { error_class: "A", code: "A_CODE" },
    ]);
  });

  it("records no cause when there is no nested transport fault", () => {
    expect(safeErrorCauses(new Error("plain"))).toEqual([]);
    expect(safeError("a string").cause_chain).toEqual([]);
  });

  it("reaches the ledger, and carries no credential onto disk", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "calib-transport-ledger-"));
    const entry: LedgerEntry = {
      entry_version: "1.0",
      run_id: "d1-research-failed-test-a2",
      role: "research",
      attempt: 2,
      started_at: "2026-09-05T19:36:37.992Z",
      ended_at: "2026-09-05T19:41:38.087Z",
      api_elapsed_ms: 300_095,
      qa_minutes: null,
      provider: "openai",
      requested_model: PREREGISTERED_MODEL,
      returned_model: null,
      response_id: null,
      controlled_input_digests: { rubric: "a".repeat(64) },
      controlled_lock_set_digest: "b".repeat(64),
      semantic_request_digest: "c".repeat(64),
      normalized_packet_digest: null,
      structured_output_digest: null,
      decoding_parameters: [],
      seed: "parameter_unavailable",
      retry_count: 1,
      validation_failures: [],
      human_corrections: [],
      token_usage: null,
      outcome: "failed_api",
      error_class: "TypeError",
      error_message: "fetch failed",
      error_cause_chain: [
        { error_class: "HeadersTimeoutError", code: "UND_ERR_HEADERS_TIMEOUT" },
      ],
    };
    appendLedgerEntry(entry, { dir });

    const [stored] = readLedger({ dir });
    // The row attempt 2 should have written: the same outer error, plus the one
    // fact that makes it diagnosable.
    expect(stored!.error_class).toBe("TypeError");
    expect(stored!.error_cause_chain).toEqual([
      { error_class: "HeadersTimeoutError", code: "UND_ERR_HEADERS_TIMEOUT" },
    ]);
    const raw = readFileSync(path.join(dir, "phase3a-runs.jsonl"), "utf8");
    expect(raw).not.toMatch(/\bsk-/);
    expect(raw).not.toContain("Authorization");
    expect(raw).not.toContain("api.openai.com");
  });
});
