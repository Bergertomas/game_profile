/**
 * `npm run calib:probe -- --live` — the manual, credential-safe capability probe.
 *
 * This is the ONLY command in the repository that may make a billable OpenAI
 * call, and it is built so that it cannot happen by accident:
 *
 * - it refuses to run without an explicit `--live` opt-in (work order §3.10);
 * - it refuses to run when a CI environment variable is present, so a workflow
 *   that shells into it fails loudly instead of spending money;
 * - the output cap is small and explicit;
 * - the prompt is a fixed non-game string, so the probe cannot research or score
 *   a calibration game even by mistake;
 * - it never prints, stores or serialises the API key, and every printed string
 *   passes through redaction.
 *
 * It reports only the safe metadata Item 4 needs: success/failure, the returned
 * model identity, effective reasoning configuration where exposed, response ID,
 * token usage, elapsed time, and whether the API exposes any snapshot/build
 * identifier stronger than the model ID.
 */
import {
  assertReturnedModel,
  callResponses,
  ExecutionContractError,
  readApiKey,
  toRequestBody,
} from "@/lib/calibration/openai-client";
import {
  PREREGISTERED_MODEL,
  PREREGISTERED_REASONING_CONTEXT,
  PREREGISTERED_REASONING_EFFORT,
  type ModelConfiguration,
} from "@/lib/calibration/request-builder";
import { redact } from "@/lib/calibration/redact";
import { appendLedgerEntry, deterministicRunId } from "@/lib/calibration/ledger";
import { verifyControlledInputs } from "@/lib/calibration/controlled-inputs";
import { buildScoringPassSchema } from "@/lib/calibration/scoring-pass-contract";

/**
 * A deliberately tiny non-game task. It proves model identity, reasoning
 * configuration and the Structured Outputs path without touching the cohort.
 */
const PROBE_INSTRUCTIONS =
  "You are a capability probe. Answer with the required JSON object and nothing else.";
const PROBE_INPUT =
  'Return the JSON object {"ok": true, "echo": "phase3a-probe"} exactly.';

const PROBE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { ok: { type: "boolean" }, echo: { type: "string" } },
  required: ["ok", "echo"],
} as const;

/** A hard ceiling; a probe that needs more than this is not a probe. */
const PROBE_MAX_OUTPUT_TOKENS = 256;

function isCiEnvironment(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.CI || env.GITHUB_ACTIONS || env.BUILDKITE || env.CF_PAGES);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const live = argv.includes("--live");
  const schemaProbe = argv.includes("--schema-probe");

  if (!live) {
    console.log(
      "Phase 3A live probe — DRY RUN.\n\n" +
        "This command makes a billable OpenAI call and is opt-in. Re-run with --live\n" +
        "once OPENAI_API_KEY is set in the environment.\n\n" +
        "It would send:\n" +
        `  model              ${PREREGISTERED_MODEL}\n` +
        `  reasoning.effort   ${PREREGISTERED_REASONING_EFFORT}\n` +
        `  reasoning.context  ${PREREGISTERED_REASONING_CONTEXT}\n` +
        "  store              false\n" +
        "  tools              []\n" +
        `  max_output_tokens  ${PROBE_MAX_OUTPUT_TOKENS}\n` +
        "  prompt             a fixed non-game string; no calibration game is involved\n",
    );
    return;
  }

  if (isCiEnvironment(process.env)) {
    console.error(
      "Refusing to run: a CI environment was detected. CI must use mocks and must\n" +
        "never make a billable live OpenAI call (work order §3.6, §3.10).",
    );
    process.exitCode = 1;
    return;
  }

  // Controlled bytes are verified even for the probe: the digests it records are
  // only meaningful against the approved freeze.
  const lock = verifyControlledInputs();

  let apiKey: string;
  try {
    apiKey = readApiKey();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const configuration: ModelConfiguration = {
    model: PREREGISTERED_MODEL,
    reasoning_effort: PREREGISTERED_REASONING_EFFORT,
    reasoning_context: PREREGISTERED_REASONING_CONTEXT,
    store: false,
    tools: [],
    max_output_tokens: PROBE_MAX_OUTPUT_TOKENS,
  };

  // `--schema-probe` posts the real derived scoring-pass schema instead of the
  // tiny one, which is how §3.5's "determine empirically whether the schema is
  // accepted" gets its answer from the live API rather than from reasoning.
  const responseFormat = schemaProbe
    ? (() => {
        const derived = buildScoringPassSchema();
        return { name: derived.name, strict: true as const, schema: derived.schema };
      })()
    : { name: "phase3a_probe", strict: true as const, schema: PROBE_SCHEMA as unknown as Record<string, unknown> };

  const request = toRequestBody(configuration, {
    instructions: PROBE_INSTRUCTIONS,
    input: PROBE_INPUT,
    responseFormat,
  });

  const startedAt = new Date().toISOString();
  const result = await callResponses(request, { apiKey });
  const endedAt = new Date().toISOString();

  const runId = deterministicRunId(lock.lock_set_digest, "probe", 1);
  let identityOk = true;
  let identityError: string | null = null;
  try {
    assertReturnedModel(result.metadata.returned_model);
  } catch (error) {
    identityOk = false;
    identityError = error instanceof ExecutionContractError ? error.message : String(error);
  }

  console.log("Phase 3A live capability probe\n");
  console.log(`  outcome                 ${result.metadata.ok && identityOk ? "PASS" : "FAIL"}`);
  console.log(`  http status             ${result.metadata.status}`);
  console.log(`  requested model         ${PREREGISTERED_MODEL}`);
  console.log(`  returned model          ${String(result.metadata.returned_model)}`);
  console.log(`  identity matches        ${identityOk ? "yes" : "NO"}`);
  console.log(`  response id             ${String(result.metadata.response_id)}`);
  console.log(
    `  effective reasoning     ${JSON.stringify(result.metadata.effective_reasoning ?? null)}`,
  );
  console.log(
    `  stronger snapshot id    ${result.metadata.snapshot_identifier ?? "none exposed by the API"}`,
  );
  console.log(`  token usage             ${JSON.stringify(result.metadata.token_usage ?? null)}`);
  console.log(`  api elapsed ms          ${result.metadata.api_elapsed_ms}`);
  console.log(`  output contract         ${schemaProbe ? "derived scoring-pass schema" : "tiny probe schema"}`);
  console.log(`  structured output ok    ${result.output !== null ? "yes" : "no"}`);
  if (result.metadata.error_message) {
    console.log(`  error                   ${redact(result.metadata.error_message)}`);
  }
  if (identityError) console.log(`  identity error          ${redact(identityError)}`);

  const file = appendLedgerEntry({
    entry_version: "1.0",
    run_id: runId,
    role: "probe",
    attempt: 1,
    started_at: startedAt,
    ended_at: endedAt,
    api_elapsed_ms: result.metadata.api_elapsed_ms,
    qa_minutes: null,
    provider: "openai",
    requested_model: PREREGISTERED_MODEL,
    returned_model: result.metadata.returned_model,
    response_id: result.metadata.response_id,
    controlled_input_digests: Object.fromEntries(
      lock.inputs.map((input) => [input.role, input.sha256]),
    ),
    controlled_lock_set_digest: lock.lock_set_digest,
    semantic_request_digest: null,
    normalized_packet_digest: null,
    structured_output_digest: null,
    decoding_parameters: [
      { name: "reasoning_effort", value: configuration.reasoning_effort },
      { name: "reasoning_context", value: configuration.reasoning_context },
      { name: "store", value: configuration.store },
      { name: "max_output_tokens", value: configuration.max_output_tokens },
    ],
    seed: "parameter_unavailable",
    retry_count: 0,
    validation_failures: identityOk ? [] : ["returned_model_mismatch"],
    human_corrections: [],
    token_usage: result.metadata.token_usage,
    outcome: result.metadata.ok && identityOk ? "succeeded" : "failed_api",
    error_class: result.metadata.error_class,
    error_message: result.metadata.error_message,
  });
  console.log(`\n  ledger entry written to ${file}`);

  if (!result.metadata.ok || !identityOk) process.exitCode = 1;
}

void main();
