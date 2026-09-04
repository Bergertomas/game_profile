import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalDigest, canonicalize, sha256Hex } from "./canonical-json";
import {
  ControlledInputDriftError,
  controlledDigest,
  controlledText,
  verifyControlledInputs,
  type LockManifest,
} from "./controlled-inputs";
import {
  assertReturnedModel,
  callResponses,
  type CallResult,
} from "./openai-client";
import {
  PREREGISTERED_MODEL,
  PREREGISTERED_REASONING_CONTEXT,
  PREREGISTERED_REASONING_EFFORT,
  type SemanticInput,
} from "./request-builder";
import {
  D1_RUN_INPUT,
  assertD1MaturityStillEligible,
  freezeD1EvaluationScope,
  type D1MaturityRevalidation,
} from "./run-input";
import {
  assertNoHoldoutExposure,
  reportControlledInputHoldoutMentions,
  type ControlledByteHoldoutReport,
} from "./holdout-isolation";
import {
  PREREGISTERED_RESEARCH_TOOL_ACCESS,
  RESEARCH_TOOLS,
  assertResearchExecutionContract,
  buildResearchPassSchema,
  freezeResearchCorpus,
  researchCompletionReport,
  researchPassSchemaDigest,
  toResearchRequestBody,
  type ModelResearchPass,
  type ResearchConfiguration,
} from "./research-pass";
import type { Corpus, EvaluationScope, RunManifest } from "./package-types";

/**
 * The D1 binding: Alan Wake 2, current patched base main campaign.
 *
 * This module owns the run-specific half of slice B — which game, which gates,
 * which bytes — and nothing about methodology. Everything it enforces is a rule
 * some other authority already states:
 *
 *  - the scope, its `Night Springs` / `The Lake House` exclusions and the
 *    maturity gate come from the merged slice-A `D1_RUN_INPUT` and are consumed
 *    unaltered;
 *  - the controlled bytes come from the Item 3 lock and are verified before a
 *    request exists at all;
 *  - the holdout boundary comes from preregistration §3.1;
 *  - the tool access and model configuration come from preregistration §4.1.
 *
 * Every one of those is a fail-closed check, and each runs BEFORE the request is
 * built rather than beside it, so a run that should not happen cannot get as far
 * as having a request to send.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * The Evidence SOP is named by the frozen research prompt's authoritative-input
 * list but is NOT one of the six Item 3 controlled inputs. It is supplied from
 * repository bytes and hashed into the receipt as a supplied (not controlled)
 * input, so the run states exactly which SOP text it ran against.
 */
export const EVIDENCE_SOP_PATH = "docs/Game_Profile_Editorial_Evidence_and_Data_Sourcing_SOP_v0.2.md";

/**
 * An explicit output bound (work order §3.10). Generous, because a full corpus
 * carries per-source normalized captures, but bounded: this is a ceiling that
 * stops an unbounded spend, not a target.
 */
export const D1_RESEARCH_MAX_OUTPUT_TOKENS = 100_000;

export interface SuppliedInput {
  readonly path: string;
  readonly role: string;
  readonly sha256: string;
  readonly byteLength: number;
}

export interface D1ResearchRequest {
  readonly runKey: "D1";
  /** Frozen system instructions — controlled bytes, not a paraphrase. */
  readonly instructions: string;
  /** Research prompt, rubric, protocol, Evidence SOP and the frozen run input. */
  readonly input: string;
  readonly configuration: ResearchConfiguration;
  readonly response_format: {
    readonly type: "json_schema";
    readonly name: string;
    readonly strict: true;
    readonly schema: Record<string, unknown>;
  };
  readonly digests: {
    readonly system_instructions_digest: string;
    readonly prompt_template_digest: string;
    readonly rubric_digest: string;
    readonly protocol_digest: string;
    readonly output_schema_digest: string;
    readonly semantic_request_digest: string;
  };
  /** The derived transport contract's digest — a request artefact, not a controlled input. */
  readonly researchPassSchemaDigest: string;
  readonly lock: LockManifest;
  readonly suppliedInputs: readonly SuppliedInput[];
  readonly maturityRevalidation: D1MaturityRevalidation & { readonly reviewed_at: string };
  readonly isolation: {
    /** True once the wrapper-authored payload has passed the §3.1 guard. */
    readonly wrapper_payload_clean: true;
    /**
     * Holdout mentions inside the byte-locked Item 3 inputs. Reported, never
     * edited: the freeze is owner-approved and immutable to this slice.
     */
    readonly controlled_byte_mentions: readonly ControlledByteHoldoutReport[];
  };
}

function readSuppliedInput(repoPath: string, role: string): SuppliedInput {
  const bytes = readFileSync(path.join(REPO_ROOT, repoPath));
  return {
    path: repoPath,
    role,
    sha256: sha256Hex(bytes),
    byteLength: bytes.length,
  };
}

export interface D1ResearchRequestOptions {
  /** Current-state facts observed immediately before collection. */
  readonly maturity: D1MaturityRevalidation;
  /** When that revalidation was performed, ISO-8601 UTC. */
  readonly reviewedAt: string;
  /** Injectable for tests; defaults to verifying the real controlled bytes. */
  readonly lock?: LockManifest;
  readonly maxOutputTokens?: number;
}

/**
 * Build the D1 research request, or refuse.
 *
 * Order matters and is deliberate: controlled bytes, then maturity, then holdout
 * isolation, then the request. A caller cannot obtain a partially built request
 * from a failed gate because nothing is constructed until every gate has passed.
 */
export function buildD1ResearchRequest(options: D1ResearchRequestOptions): D1ResearchRequest {
  // Gate 1 — the Item 3 byte freeze. A request built from unapproved bytes is
  // not a Phase 3A request at all.
  const lock = options.lock ?? verifyControlledInputs();
  // The lock is injectable for tests, so the drift check is re-applied to it
  // here as well: an injected manifest must not be a way past the gate it exists
  // to enforce.
  const drifted = lock.inputs.filter((input) => !input.matches);
  if (drifted.length > 0) throw new ControlledInputDriftError(drifted);

  // Gate 2 — ADR 0035 / preregistration §7: revalidate the preregistered
  // `mature` state immediately before collection.
  assertD1MaturityStillEligible(options.maturity);

  // The wrapper-authored payload. The pre-freeze scope is consumed exactly as
  // slice A froze it; `evidence_cutoff` is absent because it cannot truthfully
  // exist until the corpus is frozen.
  const payload = {
    run_key: D1_RUN_INPUT.runKey,
    evaluation_scope_pre_freeze: D1_RUN_INPUT.scope,
    evidence_cutoff_rule: D1_RUN_INPUT.evidenceCutoffRule,
    maturity_revalidation: {
      preregistered_maturity: D1_RUN_INPUT.maturityReview.preregisteredMaturity,
      reviewed_at: options.reviewedAt,
      evaluation_maturity: options.maturity.evaluationMaturity,
      profile_stability_state: options.maturity.profileStabilityState,
      material_profile_shaping_changes_in_flight:
        options.maturity.materialProfileShapingChangesInFlight,
      settlement_rationale: D1_RUN_INPUT.maturityReview.settlementRationale,
      evidence_depth_expectation: D1_RUN_INPUT.maturityReview.evidenceDepthExpectation,
      current_state_basis: D1_RUN_INPUT.maturityReview.currentStateBasis,
    },
    separation_notice:
      "This is the research collection pass. It never scores, and its context ends when the corpus is frozen.",
  };

  // Gate 3 — preregistration §3.1. The guard runs over wrapper-authored bytes,
  // which are the bytes engineering owns and can therefore be held to a
  // fail-closed standard.
  assertNoHoldoutExposure(payload, "the D1 wrapper-authored research payload");

  const passSchema = buildResearchPassSchema();
  const instructions = controlledText("system_instructions");
  const researchPrompt = controlledText("research_prompt");
  const rubric = controlledText("rubric");
  const protocol = controlledText("protocol");
  const evidenceSop = readFileSync(path.join(REPO_ROOT, EVIDENCE_SOP_PATH), "utf8");

  // One fixed assembly order, matching the scoring builder's discipline: any
  // change here changes the semantic request digest, which is the point.
  const input = [
    "# Research prompt",
    researchPrompt,
    "# Rubric",
    rubric,
    "# Effective scoring protocol",
    protocol,
    "# Evidence and data sourcing SOP",
    evidenceSop,
    "# Frozen D1 run input (RFC 8785 canonical JSON)",
    canonicalize(payload as never),
  ].join("\n\n");

  const configuration: ResearchConfiguration = {
    model: PREREGISTERED_MODEL,
    reasoning_effort: PREREGISTERED_REASONING_EFFORT,
    reasoning_context: PREREGISTERED_REASONING_CONTEXT,
    store: false,
    tools: RESEARCH_TOOLS,
    max_output_tokens: options.maxOutputTokens ?? D1_RESEARCH_MAX_OUTPUT_TOKENS,
  };

  return {
    runKey: "D1",
    instructions,
    input,
    configuration,
    response_format: {
      type: "json_schema",
      name: passSchema.name,
      strict: true,
      schema: passSchema.schema,
    },
    digests: {
      system_instructions_digest: controlledDigest(lock, "system_instructions"),
      prompt_template_digest: controlledDigest(lock, "research_prompt"),
      rubric_digest: controlledDigest(lock, "rubric"),
      protocol_digest: controlledDigest(lock, "protocol"),
      // The approved canonical package-schema bytes, never the derived transport
      // schema — the same rule the scoring builder records at gate 6.
      output_schema_digest: controlledDigest(lock, "output_schema"),
      semantic_request_digest: canonicalDigest({
        instructions,
        input,
        configuration,
        response_format_schema: passSchema.schema,
      } as never),
    },
    researchPassSchemaDigest: researchPassSchemaDigest(passSchema),
    lock,
    suppliedInputs: [readSuppliedInput(EVIDENCE_SOP_PATH, "evidence_sop")],
    maturityRevalidation: { ...options.maturity, reviewed_at: options.reviewedAt },
    isolation: {
      wrapper_payload_clean: true,
      controlled_byte_mentions: reportControlledInputHoldoutMentions(),
    },
  };
}

export interface D1ResearchRunFacts {
  readonly started_at: string;
  readonly ended_at: string;
  readonly api_elapsed_ms: number;
  readonly returned_model: string | null;
  readonly response_id: string | null;
  readonly snapshot_identifier: string | null;
  readonly token_usage: Record<string, number> | null;
  readonly attempt: number;
}

export interface D1ResearchRunResult {
  readonly ok: boolean;
  readonly facts: D1ResearchRunFacts;
  readonly output: ModelResearchPass | null;
  readonly error_class: string | null;
  readonly error_message: string | null;
}

/**
 * Execute one D1 research call.
 *
 * No retry loop: work order §3.9 makes a retry a new clean attempt the caller
 * records, so a transport-level retry here would be the silent repair the
 * protocol forbids. The returned-model identity is checked before the output is
 * offered to the freeze.
 */
export async function runD1ResearchPass(options: {
  readonly request: D1ResearchRequest;
  readonly apiKey: string;
  readonly attempt?: number;
  readonly fetchImpl?: typeof fetch;
  readonly baseUrl?: string;
  readonly now?: () => Date;
}): Promise<D1ResearchRunResult> {
  const now = options.now ?? (() => new Date());
  const body = toResearchRequestBody(options.request.configuration, {
    instructions: options.request.instructions,
    input: options.request.input,
    responseFormat: {
      name: options.request.response_format.name,
      strict: true,
      schema: options.request.response_format.schema,
    },
  });

  const started_at = now().toISOString();
  const result: CallResult = await callResponses(body, {
    apiKey: options.apiKey,
    fetchImpl: options.fetchImpl,
    baseUrl: options.baseUrl,
    assertContract: assertResearchExecutionContract,
  });
  const ended_at = now().toISOString();

  const facts: D1ResearchRunFacts = {
    started_at,
    ended_at,
    api_elapsed_ms: result.metadata.api_elapsed_ms,
    returned_model: result.metadata.returned_model,
    response_id: result.metadata.response_id,
    snapshot_identifier: result.metadata.snapshot_identifier,
    token_usage: result.metadata.token_usage,
    attempt: options.attempt ?? 1,
  };

  if (!result.metadata.ok || result.output === null) {
    return {
      ok: false,
      facts,
      output: null,
      error_class: result.metadata.error_class ?? "EmptyResearchOutput",
      error_message: result.metadata.error_message ?? "the research call returned no structured output",
    };
  }

  try {
    assertReturnedModel(result.metadata.returned_model);
  } catch (error) {
    return {
      ok: false,
      facts,
      output: null,
      error_class: "ExecutionContractError",
      error_message: error instanceof Error ? error.message : String(error),
    };
  }

  return {
    ok: true,
    facts,
    output: result.output as ModelResearchPass,
    error_class: null,
    error_message: null,
  };
}

export interface D1ResearchReceipt {
  readonly receipt_version: "1.0";
  readonly run_key: "D1";
  readonly role: "research";
  readonly run_id: string;
  readonly attempt: number;
  readonly scope_key: string;
  readonly known_exclusions: readonly string[];
  readonly evidence_cutoff: string;
  readonly frozen_at: string;
  readonly started_at: string;
  readonly ended_at: string;
  readonly api_elapsed_ms: number;
  readonly provider: string;
  readonly requested_model: string;
  readonly returned_model: string | null;
  readonly response_id: string | null;
  readonly model_snapshot_build_id: string;
  readonly configuration: ResearchConfiguration;
  readonly research_tool_access: readonly string[];
  readonly token_usage: Record<string, number> | null;
  readonly controlled_inputs: LockManifest;
  readonly supplied_inputs: readonly SuppliedInput[];
  readonly digests: D1ResearchRequest["digests"] & {
    readonly research_transport_schema_digest: string;
    readonly raw_packet_digest: string;
    readonly normalized_packet_digest: string;
    readonly structured_output_digest: string;
  };
  readonly maturity_revalidation: D1ResearchRequest["maturityRevalidation"];
  readonly isolation: D1ResearchRequest["isolation"] & {
    readonly research_context_ends_at_freeze: true;
    readonly scoring_performed: false;
  };
  readonly research_completion_report: ReturnType<typeof researchCompletionReport>;
  readonly validation_failures: readonly string[];
  readonly human_corrections: readonly string[];
  /** SHA-256 over the RFC 8785 bytes of everything above. */
  readonly receipt_digest: string;
}

export interface D1FrozenResearch {
  readonly corpus: Corpus;
  readonly evaluationScope: EvaluationScope;
  readonly semanticInput: SemanticInput;
  readonly receipt: D1ResearchReceipt;
  readonly runId: string;
}

/**
 * Freeze an accepted D1 research output and produce the run receipt.
 *
 * The evidence cutoff is materialized here and only here, from the UTC calendar
 * date of `frozenAt`, through slice A's helper — preregistration §7 defines it
 * that way, so deriving it anywhere earlier would be protocol drift.
 */
export function freezeD1Research(options: {
  readonly request: D1ResearchRequest;
  readonly output: ModelResearchPass;
  readonly facts: D1ResearchRunFacts;
  readonly frozenAt: string;
}): D1FrozenResearch {
  const { request, output, facts, frozenAt } = options;

  const evidenceCutoff = frozenAt.slice(0, 10);
  const evaluationScope = freezeD1EvaluationScope(evidenceCutoff);

  const runId = `d1-research-${request.digests.semantic_request_digest.slice(0, 24)}-a${facts.attempt}`;

  const decodingParameters: RunManifest["decoding_parameters"] = [
    { name: "reasoning_effort", value: request.configuration.reasoning_effort },
    { name: "reasoning_context", value: request.configuration.reasoning_context },
    { name: "store", value: request.configuration.store },
    { name: "max_output_tokens", value: request.configuration.max_output_tokens },
    { name: "tools", value: request.configuration.tools.map((tool) => tool.type).join(",") },
  ];

  const frozen = freezeResearchCorpus({
    output,
    evaluationScope,
    frozenAt,
    manifestFacts: {
      run_id: runId,
      started_at: facts.started_at,
      ended_at: facts.ended_at,
      provider: "openai",
      model_label: PREREGISTERED_MODEL,
      model_snapshot_build_id:
        facts.snapshot_identifier ??
        `${String(facts.returned_model ?? PREREGISTERED_MODEL)} (no stronger snapshot identifier exposed by the API)`,
      system_instructions_digest: request.digests.system_instructions_digest,
      prompt_template_digest: request.digests.prompt_template_digest,
      rubric_digest: request.digests.rubric_digest,
      protocol_digest: request.digests.protocol_digest,
      output_schema_digest: request.digests.output_schema_digest,
      research_tool_access: PREREGISTERED_RESEARCH_TOOL_ACCESS,
      decoding_parameters: decodingParameters,
      // Preregistration §4.1 — never fabricate a seed.
      seed: "parameter_unavailable",
      retry_count: Math.max(0, facts.attempt - 1),
      validation_failures: [],
      human_corrections: [],
    },
  });

  const body = {
    receipt_version: "1.0" as const,
    run_key: "D1" as const,
    role: "research" as const,
    run_id: runId,
    attempt: facts.attempt,
    scope_key: evaluationScope.scope_key,
    known_exclusions: evaluationScope.known_exclusions,
    evidence_cutoff: evidenceCutoff,
    frozen_at: frozenAt,
    started_at: facts.started_at,
    ended_at: facts.ended_at,
    api_elapsed_ms: facts.api_elapsed_ms,
    provider: "openai",
    requested_model: PREREGISTERED_MODEL,
    returned_model: facts.returned_model,
    response_id: facts.response_id,
    model_snapshot_build_id: frozen.corpus.research_run_manifest.model_snapshot_build_id,
    configuration: request.configuration,
    research_tool_access: PREREGISTERED_RESEARCH_TOOL_ACCESS,
    token_usage: facts.token_usage,
    controlled_inputs: request.lock,
    supplied_inputs: request.suppliedInputs,
    digests: {
      ...request.digests,
      research_transport_schema_digest: request.researchPassSchemaDigest,
      raw_packet_digest: frozen.rawPacketDigest,
      normalized_packet_digest: frozen.normalizedPacketDigest,
      structured_output_digest: frozen.structuredOutputDigest,
    },
    maturity_revalidation: request.maturityRevalidation,
    isolation: {
      ...request.isolation,
      research_context_ends_at_freeze: true as const,
      scoring_performed: false as const,
    },
    research_completion_report: researchCompletionReport(
      frozen.corpus,
      evaluationScope,
      output.research_completion_report,
    ),
    validation_failures: [] as readonly string[],
    human_corrections: [] as readonly string[],
  };

  const receipt: D1ResearchReceipt = {
    ...body,
    receipt_digest: canonicalDigest(body as never),
  };

  return {
    corpus: frozen.corpus,
    evaluationScope,
    semanticInput: frozen.semanticInput,
    receipt,
    runId,
  };
}
