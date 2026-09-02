import { describe, expect, it, vi } from "vitest";
import {
  ExecutionContractError,
  assertExecutionContract,
  assertReturnedModel,
  callResponses,
  readApiKey,
  toRequestBody,
} from "@/lib/calibration/openai-client";
import {
  PREREGISTERED_MODEL,
  PREREGISTERED_REASONING_CONTEXT,
  PREREGISTERED_REASONING_EFFORT,
  type ModelConfiguration,
} from "@/lib/calibration/request-builder";

/**
 * Work order §5(7)–§5(12) and §5(17): every fail-closed guard on the measured
 * execution contract, plus the mocked scoring-call harness.
 *
 * Nothing here touches the network. The transport is injected, so CI proves the
 * guards without a billable call ever being possible.
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
  return {
    ...toRequestBody(CONFIG, { instructions: "i", input: "p" }),
    ...overrides,
  };
}

describe("the frozen execution contract blocks rather than substitutes", () => {
  it("accepts the preregistered configuration", () => {
    expect(() => assertExecutionContract(request())).not.toThrow();
  });

  it("blocks the moving alias and any other model (§5(7))", () => {
    for (const model of ["gpt-5.6", "gpt-5.6-sol-mini", "gpt-5.5-sol", ""]) {
      expect(() => assertExecutionContract(request({ model }))).toThrow(ExecutionContractError);
    }
    expect(() => assertExecutionContract(request({ model: "gpt-5.6" }))).toThrow(
      /must be exactly "gpt-5.6-sol"/,
    );
  });

  it("blocks a reasoning effort or context that is not preregistered (§5(8))", () => {
    expect(() =>
      assertExecutionContract(request({ reasoning: { effort: "medium", context: "current_turn" } })),
    ).toThrow(/reasoning.effort must be "high"/);
    // GPT-5.6 defaults reasoning context to all_turns; an independent call must
    // pin current_turn, so an unset context is a block, not a default.
    expect(() =>
      assertExecutionContract(request({ reasoning: { effort: "high", context: "all_turns" } })),
    ).toThrow(/reasoning.context must be "current_turn"/);
    expect(() => assertExecutionContract(request({ reasoning: { effort: "high" } }))).toThrow(
      /reasoning.context/,
    );
  });

  it("blocks Pro mode (§5(9))", () => {
    expect(() =>
      assertExecutionContract(
        request({ reasoning: { effort: "high", context: "current_turn", mode: "pro" } }),
      ),
    ).toThrow(/Pro mode is not authorized/);
  });

  it("blocks any tool access on a scoring call (§5(10))", () => {
    expect(() => assertExecutionContract(request({ tools: [{ type: "web_search" }] }))).toThrow(
      /tools must be empty/,
    );
  });

  it("blocks previous-response and conversation linkage (§5(11))", () => {
    expect(() => assertExecutionContract(request({ previous_response_id: "resp_1" }))).toThrow(
      /previous_response_id must not be set/,
    );
    expect(() => assertExecutionContract(request({ conversation: "conv_1" }))).toThrow(
      /conversation linkage must not be set/,
    );
  });

  it("blocks store !== false for a measured scoring call (§5(12))", () => {
    expect(() => assertExecutionContract(request({ store: true }))).toThrow(/store must be false/);
    expect(() => assertExecutionContract(request({ store: undefined }))).toThrow(/store must be false/);
  });

  it("requires an explicit positive output bound", () => {
    expect(() => assertExecutionContract(request({ max_output_tokens: 0 }))).toThrow(
      /explicit positive bound/,
    );
    expect(() => assertExecutionContract(request({ max_output_tokens: undefined }))).toThrow(
      /explicit positive bound/,
    );
  });

  it("builds a body that satisfies its own contract", () => {
    const body = toRequestBody(CONFIG, { instructions: "i", input: "p" });
    expect(body.model).toBe(PREREGISTERED_MODEL);
    expect(body.store).toBe(false);
    expect(body.tools).toEqual([]);
    expect(body.reasoning).toEqual({ effort: "high", context: "current_turn" });
    expect(body.previous_response_id).toBeUndefined();
    expect(body.conversation).toBeUndefined();
  });
});

describe("returned model identity (ADR 0036 §8)", () => {
  it("accepts the exact preregistered identity and refuses every substitute", () => {
    expect(() => assertReturnedModel(PREREGISTERED_MODEL)).not.toThrow();
    for (const returned of ["gpt-5.6", "gpt-5.6-sol-2026-08-01", null, ""]) {
      expect(() => assertReturnedModel(returned)).toThrow(ExecutionContractError);
    }
  });
});

describe("the mocked scoring call (§5(17), §5(21))", () => {
  function mockFetch(body: unknown, ok = true) {
    return vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status: ok ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;
  }

  it("returns safe metadata and parsed structured output on success", async () => {
    const fetchImpl = mockFetch({
      id: "resp_123",
      model: PREREGISTERED_MODEL,
      usage: { input_tokens: 10, output_tokens: 5 },
      reasoning: { effort: "high" },
      output_text: JSON.stringify({ claim_ledger: [], decisions: [] }),
    });
    const result = await callResponses(request(), { apiKey: "sk-test-key-value", fetchImpl });
    expect(result.metadata.ok).toBe(true);
    expect(result.metadata.returned_model).toBe(PREREGISTERED_MODEL);
    expect(result.metadata.response_id).toBe("resp_123");
    expect(result.metadata.token_usage).toEqual({ input_tokens: 10, output_tokens: 5 });
    expect(result.metadata.api_elapsed_ms).toBeGreaterThanOrEqual(0);
    expect(result.output).toEqual({ claim_ledger: [], decisions: [] });
  });

  it("sends the credential in the header and never in the body", async () => {
    const fetchImpl = mockFetch({ id: "r", model: PREREGISTERED_MODEL, output_text: "{}" });
    await callResponses(request(), { apiKey: "sk-fake-secret", fetchImpl });
    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer sk-fake-secret",
    });
    expect(String((init as RequestInit).body)).not.toContain("sk-fake-secret");
  });

  it("refuses to send a request that violates the contract, before any transport", async () => {
    const fetchImpl = mockFetch({});
    await expect(
      callResponses(request({ model: "gpt-5.6" }), { apiKey: "sk-x", fetchImpl }),
    ).rejects.toThrow(ExecutionContractError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports a malformed structured output as a failure instead of repairing it (§5(17))", async () => {
    const fetchImpl = mockFetch({
      id: "resp_bad",
      model: PREREGISTERED_MODEL,
      output_text: "{ not json",
    });
    const result = await callResponses(request(), { apiKey: "sk-test-key-value", fetchImpl });
    expect(result.metadata.ok).toBe(false);
    expect(result.metadata.error_class).toBe("StructuredOutputParseError");
    // The invalid text is NOT coerced, patched or partially salvaged.
    expect(result.output).toBeNull();
  });

  it("surfaces an API error without throwing, and records no output", async () => {
    const fetchImpl = mockFetch(
      { error: { type: "invalid_request_error", message: "bad request" } },
      false,
    );
    const result = await callResponses(request(), { apiKey: "sk-test-key-value", fetchImpl });
    expect(result.metadata.ok).toBe(false);
    expect(result.metadata.status).toBe(400);
    expect(result.metadata.error_class).toBe("invalid_request_error");
    expect(result.output).toBeNull();
  });

  it("records whether a stronger snapshot identifier is exposed", async () => {
    const without = await callResponses(request(), {
      apiKey: "sk-test-key-value",
      fetchImpl: mockFetch({ id: "r", model: PREREGISTERED_MODEL, output_text: "{}" }),
    });
    expect(without.metadata.snapshot_identifier).toBeNull();
    const with_ = await callResponses(request(), {
      apiKey: "sk-test-key-value",
      fetchImpl: mockFetch({
        id: "r",
        model: PREREGISTERED_MODEL,
        system_fingerprint: "fp_abc123",
        output_text: "{}",
      }),
    });
    expect(with_.metadata.snapshot_identifier).toBe("fp_abc123");
  });

  it("does not retry internally; a retry is the caller's new clean attempt", async () => {
    const fetchImpl = mockFetch(
      { error: { type: "server_error", message: "boom" } },
      false,
    );
    await callResponses(request(), { apiKey: "sk-test-key-value", fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("credential handling (§5(20))", () => {
  it("reads the key from the environment only, and refuses when absent", () => {
    expect(() => readApiKey({} as unknown as NodeJS.ProcessEnv)).toThrow(/OPENAI_API_KEY is not set/);
    expect(() => readApiKey({ OPENAI_API_KEY: "   " } as unknown as NodeJS.ProcessEnv)).toThrow();
    expect(readApiKey({ OPENAI_API_KEY: "sk-abc" } as unknown as NodeJS.ProcessEnv)).toBe("sk-abc");
  });
});
