import {
  PREREGISTERED_MODEL,
  PREREGISTERED_REASONING_CONTEXT,
  PREREGISTERED_REASONING_EFFORT,
  type ModelConfiguration,
} from "./request-builder";
import { safeError, type SafeErrorCause } from "./redact";
import {
  ABORT_BACKSTOP_HEADROOM_MS,
  boundedDispatcher,
  releaseDispatcher,
  type BoundedDispatcher,
} from "./http-transport";

/**
 * The Phase 3A OpenAI execution surface: configuration guards, a thin Responses
 * API transport, and the returned-identity check.
 *
 * The guards come first and are the point of the module. ADR 0036's failure
 * boundary is explicit — "do not silently fall back to `gpt-5.6`, ChatGPT UI,
 * another model, Pro mode, or an engineering agent's judgment" — so every one of
 * those substitutions is a thrown error here rather than a warning, and the
 * checks run BEFORE the request is sent as well as against what comes back.
 *
 * There is deliberately no SDK dependency. The Responses call is one `fetch` of
 * a documented JSON shape; adding a client library would buy little and would
 * put retry, model-fallback and conversation-state behaviour we must control
 * inside someone else's defaults.
 */

export class ExecutionContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionContractError";
  }
}

export interface RequestShape {
  readonly model: string;
  readonly reasoning?: { readonly effort?: string; readonly context?: string; readonly mode?: string };
  readonly store?: boolean;
  readonly tools?: readonly unknown[];
  readonly previous_response_id?: string | null;
  readonly conversation?: unknown;
  readonly max_output_tokens?: number;
  readonly [key: string]: unknown;
}

/**
 * Assert the frozen execution contract on an outbound measured scoring request.
 *
 * Each clause names the authority it enforces so a reader can check the code
 * against the document rather than against the author's memory.
 */
export function assertExecutionContract(request: RequestShape): void {
  const fail = (message: string) => {
    throw new ExecutionContractError(message);
  };

  // ADR 0036 §1 — the exact model, never the moving alias.
  if (request.model !== PREREGISTERED_MODEL) {
    fail(
      `model must be exactly "${PREREGISTERED_MODEL}"; got "${request.model}". The moving alias and any substitute are refused (ADR 0036 §1).`,
    );
  }
  // ADR 0036 §2 — High reasoning, standard mode.
  if (request.reasoning?.effort !== PREREGISTERED_REASONING_EFFORT) {
    fail(
      `reasoning.effort must be "${PREREGISTERED_REASONING_EFFORT}"; got "${String(request.reasoning?.effort)}" (ADR 0036 §2).`,
    );
  }
  if (request.reasoning?.mode !== undefined && request.reasoning.mode !== "standard") {
    fail(
      `reasoning mode must be standard; Pro mode is not authorized by the preregistration (ADR 0036 §2).`,
    );
  }
  // Readiness audit §4 — stateless calls must pin the reasoning context, because
  // GPT-5.6 defaults it to `all_turns`.
  if (request.reasoning?.context !== PREREGISTERED_REASONING_CONTEXT) {
    fail(
      `reasoning.context must be "${PREREGISTERED_REASONING_CONTEXT}" for an independent scoring call; got "${String(request.reasoning?.context)}".`,
    );
  }
  // ADR 0036 §3 — no conversation or previous-response linkage.
  if (request.previous_response_id !== undefined && request.previous_response_id !== null) {
    fail("previous_response_id must not be set; scoring calls share no prior state (ADR 0036 §3).");
  }
  if (request.conversation !== undefined && request.conversation !== null) {
    fail("conversation linkage must not be set; scoring calls are independent (ADR 0036 §3).");
  }
  // Preregistration §12.2 — measured calls are not stored.
  if (request.store !== false) {
    fail(`store must be false for a measured scoring call; got ${String(request.store)}.`);
  }
  // ADR 0036 §6 — no web/research tools in either scoring pass.
  if (request.tools !== undefined && request.tools.length > 0) {
    fail(
      `tools must be empty for a scoring call; ${request.tools.length} tool(s) supplied (ADR 0036 §6).`,
    );
  }
  // Work order §3.10 — an explicit output bound, so a run cannot become unbounded spend.
  if (typeof request.max_output_tokens !== "number" || request.max_output_tokens <= 0) {
    fail("max_output_tokens must be an explicit positive bound (work order §3.10).");
  }
}

/** Build the Responses API body from the harness's own configuration record. */
export function toRequestBody(
  configuration: ModelConfiguration,
  parts: {
    readonly instructions: string;
    readonly input: string;
    readonly responseFormat?: {
      readonly name: string;
      readonly strict: true;
      readonly schema: Record<string, unknown>;
    };
  },
): RequestShape {
  return {
    model: configuration.model,
    instructions: parts.instructions,
    input: parts.input,
    reasoning: {
      effort: configuration.reasoning_effort,
      context: configuration.reasoning_context,
    },
    store: configuration.store,
    tools: [],
    max_output_tokens: configuration.max_output_tokens,
    ...(configuration.seed === undefined ? {} : { seed: configuration.seed }),
    ...(parts.responseFormat
      ? {
          text: {
            format: {
              type: "json_schema",
              name: parts.responseFormat.name,
              strict: true,
              schema: parts.responseFormat.schema,
            },
          },
        }
      : {}),
  };
}

export interface ResponseMetadata {
  readonly ok: boolean;
  readonly status: number;
  /** The model the API reports having served. */
  readonly returned_model: string | null;
  readonly response_id: string | null;
  readonly token_usage: Record<string, number> | null;
  /** Reasoning configuration the API echoes back, where exposed. */
  readonly effective_reasoning: Record<string, unknown> | null;
  /** Any stronger snapshot/build identifier the API exposes beyond the model ID. */
  readonly snapshot_identifier: string | null;
  readonly api_elapsed_ms: number;
  readonly error_class: string | null;
  readonly error_message: string | null;
  /**
   * Nested transport diagnostics, class and code only. Empty unless the call
   * failed below the HTTP response — a headers/body timeout, a refused
   * connection — where the outer error is always `TypeError: fetch failed`.
   */
  readonly error_cause_chain: readonly SafeErrorCause[];
}

/** The default total bound for a measured call. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 600_000;

export interface CallOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  /** Injectable transport. Tests pass a mock; nothing in CI touches the network. */
  readonly fetchImpl?: typeof fetch;
  /**
   * The request bound, in milliseconds.
   *
   * Applied twice, because one layer was never enough: as undici's
   * `headersTimeout`/`bodyTimeout` on a per-call dispatcher, and as an abort
   * backstop `ABORT_BACKSTOP_HEADROOM_MS` later that also stops a response
   * trickling bytes indefinitely. Before this was configured the effective bound
   * was undici's 300-second default, whatever this value said.
   */
  readonly timeoutMs?: number;
  /**
   * The frozen contract asserted before the request is sent. Defaults to the
   * scoring contract, which forbids tools outright (ADR 0036 §6). The research
   * pass supplies its own, because §6's other half — "research is a separate
   * pass with separately controlled tool access" — is a different contract, not
   * a relaxation of this one. It is injected rather than switched on a flag so
   * that a scoring caller cannot reach the research contract by passing a
   * boolean.
   */
  readonly assertContract?: (request: RequestShape) => void;
}

export interface CallResult {
  readonly metadata: ResponseMetadata;
  /** Parsed structured output, when the response carried one. */
  readonly output: unknown;
  /** The raw response body, for digesting. Never logged unredacted. */
  readonly raw: unknown;
}

function extractText(body: Record<string, unknown>): string | null {
  if (typeof body.output_text === "string") return body.output_text;
  const output = body.output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    const content = (item as Record<string, unknown>)?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const text = (part as Record<string, unknown>)?.text;
      if (typeof text === "string") return text;
    }
  }
  return null;
}

/**
 * Send one Responses API request.
 *
 * The contract is asserted before the call. No retry loop lives here: work order
 * §3.9 makes a retry "a new clean attempt" that the caller records, so a
 * transport-level retry that reused this request would be exactly the silent
 * repair the protocol forbids.
 */
export async function callResponses(
  request: RequestShape,
  options: CallOptions,
): Promise<CallResult> {
  (options.assertContract ?? assertExecutionContract)(request);

  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  // Built before anything is sent, and for every transport, injected or not, so
  // the bound a caller asked for is the bound that governs. A runtime that
  // cannot enforce it throws here, alongside the contract assertion: no request
  // exists, so there is no attempt to record.
  const dispatcher: BoundedDispatcher = boundedDispatcher(timeoutMs);
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs + ABORT_BACKSTOP_HEADROOM_MS);

  try {
    const response = await fetchImpl(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        // The key is used here and nowhere else; it is never logged or stored.
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: controller.signal,
      // Not in the DOM `RequestInit`, but the option undici's fetch reads. The
      // cast is the whole reason this is one line rather than an SDK.
      dispatcher,
    } as RequestInit);
    const elapsed = Date.now() - started;
    const body = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const error = body.error as Record<string, unknown> | undefined;
      return {
        metadata: {
          ok: false,
          status: response.status,
          returned_model: typeof body.model === "string" ? body.model : null,
          response_id: typeof body.id === "string" ? body.id : null,
          token_usage: null,
          effective_reasoning: null,
          snapshot_identifier: null,
          api_elapsed_ms: elapsed,
          error_class: String(error?.type ?? `http_${response.status}`),
          error_message: safeError(String(error?.message ?? "request failed")).message,
          // A provider error arrived over a working connection; there is no
          // transport fault below it to name.
          error_cause_chain: [],
        },
        output: null,
        raw: body,
      };
    }

    const text = extractText(body);
    let output: unknown = null;
    let parseError: string | null = null;
    if (text !== null) {
      try {
        output = JSON.parse(text);
      } catch (error) {
        // A malformed structured output is a blocking failure, not something to
        // patch up: it is reported and the attempt does not count.
        parseError = safeError(error).message;
      }
    }

    return {
      metadata: {
        ok: parseError === null,
        status: response.status,
        returned_model: typeof body.model === "string" ? body.model : null,
        response_id: typeof body.id === "string" ? body.id : null,
        token_usage: (body.usage as Record<string, number> | undefined) ?? null,
        effective_reasoning: (body.reasoning as Record<string, unknown> | undefined) ?? null,
        snapshot_identifier: readSnapshotIdentifier(body),
        api_elapsed_ms: elapsed,
        error_class: parseError === null ? null : "StructuredOutputParseError",
        error_message: parseError,
        error_cause_chain: [],
      },
      output,
      raw: body,
    };
  } catch (error) {
    const safe = safeError(error);
    return {
      metadata: {
        ok: false,
        status: 0,
        returned_model: null,
        response_id: null,
        token_usage: null,
        effective_reasoning: null,
        snapshot_identifier: null,
        api_elapsed_ms: Date.now() - started,
        error_class: safe.error_class,
        error_message: safe.message,
        // The branch attempt 2 landed in. `TypeError: fetch failed` on its own
        // does not say which transport fault occurred; the nested class/code
        // does, and is the only part of the cause safe to keep.
        error_cause_chain: safe.cause_chain,
      },
      output: null,
      raw: null,
    };
  } finally {
    clearTimeout(timeout);
    await releaseDispatcher(dispatcher);
  }
}

/**
 * Whether the API exposes a stronger snapshot/build identifier than the model
 * ID. Item 4 must record the answer either way (work order §3.6), so this
 * returns `null` rather than guessing when no such field is present.
 */
function readSnapshotIdentifier(body: Record<string, unknown>): string | null {
  for (const field of ["model_version", "system_fingerprint", "snapshot", "model_snapshot"]) {
    const value = body[field];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

/**
 * ADR 0036 §8 — the returned identity must satisfy the preregistered contract
 * before a run counts. Fails closed.
 */
export function assertReturnedModel(returnedModel: string | null): void {
  if (returnedModel !== PREREGISTERED_MODEL) {
    throw new ExecutionContractError(
      `returned model identity "${String(returnedModel)}" is not the preregistered "${PREREGISTERED_MODEL}"; the run does not count (ADR 0036 §8).`,
    );
  }
}

/**
 * Read the API key from the environment only.
 *
 * Never from a file in the repository, never from an argument that could land in
 * shell history, and the value is never returned anywhere it could be printed —
 * callers pass it straight to `callResponses`.
 */
export function readApiKey(env: NodeJS.ProcessEnv = process.env): string {
  const key = env.OPENAI_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new ExecutionContractError(
      "OPENAI_API_KEY is not set. The live probe reads credentials from the environment only; it never reads a committed file.",
    );
  }
  return key;
}
