import { canonicalDigest, canonicalize, sha256Hex } from "./canonical-json";
import type { ArtifactSpec } from "./artifact-store";
import {
  ControlledInputDriftError,
  verifyControlledInputs,
  type LockManifest,
} from "./controlled-inputs";
import {
  assertReturnedModel,
  callResponses,
  toRequestBody,
  type CallResult,
} from "./openai-client";
import {
  PREREGISTERED_MODEL,
  PREREGISTERED_REASONING_CONTEXT,
  PREREGISTERED_REASONING_EFFORT,
  assertPairInvariants,
  buildScoringRequest,
  checkPairInvariants,
  manifestSeed,
  type PairInvariantIssue,
  type RunRole,
  type ScoringRequest,
  type SemanticInput,
} from "./request-builder";
import {
  assembleScoringPass,
  structuredOutputDigest,
  type ModelScoringPass,
} from "./scoring-pass-contract";
import { D1_RUN_INPUT, freezeD1EvaluationScope } from "./run-input";
import {
  assertScoringViewHoldoutIsolation,
  reportControlledInputHoldoutMentions,
  type ControlledByteHoldoutReport,
  type HoldoutMention,
} from "./holdout-isolation";
import { findReviewGradeLeaks } from "./research-pass";
import { validatorFor } from "./package-schema";
import { deriveCoverageState } from "./semantic-validator";
import { REQUIRED_FACETS, RUBRIC_SUBCRITERION_KEYS } from "./protocol-tables";
import type {
  Corpus,
  CoverageFrame,
  CoverageUnit,
  RunManifest,
  ScoreDecision,
  ScoringPass,
} from "./package-types";

/**
 * Slice C: the isolated paired primary/audit scoring transport for D1.
 *
 * This module owns the run-specific half of the paired scoring execution — which
 * frozen packet, which gates, which receipts — and nothing about methodology. It
 * builds no scoring content: every number, anchor, rationale and confidence label
 * comes from the designated GPT-5.6 Sol High scorer, and the wrapper only proves,
 * records and refuses.
 *
 * The invariants it exists to enforce, each already stated by an authority:
 *
 *  - the input is the ALREADY-FROZEN slice-B packet, re-hashed here and refused
 *    on any drift (slice-B handoff; Protocol §4.7);
 *  - the primary and audit calls receive byte-identical semantic inputs and
 *    exposed configuration (ADR 0036 §5; preregistration §4.1);
 *  - each call is an independent stateless closed-corpus execution with no tools,
 *    no research context and no conversation linkage (ADR 0036 §§3, 6;
 *    preregistration §3.2);
 *  - the run role is wrapper metadata attached only AFTER model output
 *    (preregistration §4.2; frozen scoring prompt "Role");
 *  - nothing is retried silently and nothing is repaired (preregistration §9.1;
 *    §4.3 "engineering agents do not score").
 *
 * Every gate runs before a request exists, so a run that should not happen cannot
 * get as far as having something to send.
 */

/**
 * An explicit output bound (work order §3.10). A scoring pass returns a claim
 * ledger and forty decisions with rationales, so the ceiling is generous — but it
 * is a ceiling that stops unbounded spend, not a target.
 */
export const D1_SCORING_MAX_OUTPUT_TOKENS = 64_000;

/**
 * Property names that would carry research context into a scoring call.
 *
 * Preregistration §3.2 is explicit about what neither scoring pass may receive:
 * the candidate/rejection log, research commentary, prior decisions, the other
 * pass, owner expectations, open-web access or external review grades. Slice B
 * already excludes them when it builds `semantic-input.json`; this list is the
 * independent check, because slice C must be able to refuse a packet it did not
 * itself construct.
 */
export const FORBIDDEN_SCORING_VIEW_KEYS: readonly string[] = [
  "candidate_source_log",
  "candidate_id",
  "query_family",
  "query_family_audit",
  "collection_reason",
  "collection_standard",
  "research_completion_report",
  "research_run_manifest",
  "research_tool_access",
  "research_commentary",
  "rejection_log",
  "primary_pass",
  "audit_pass",
  "adjudication",
  "owner_approval",
  "owner_expectation",
  "baseline_package_digest",
];

export class ScoringHandoffError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(
      "The frozen D1 research handoff was refused before any scoring call:\n" +
        problems.map((problem) => `  ${problem}`).join("\n"),
    );
    this.name = "ScoringHandoffError";
  }
}

/**
 * The slice-B run artifacts slice C consumes, exactly as slice B wrote them.
 *
 * All three are required rather than just `semantic-input.json`. The semantic
 * input alone cannot prove it is the packet that was frozen: `corpus.json` holds
 * the digest that commits to it and `receipt.json` holds the controlled-input
 * lock the corpus was frozen under, and both of those are what make a drift
 * refusal possible at all.
 */
export interface D1ResearchHandoff {
  readonly semanticInput: SemanticInput;
  readonly corpus: Corpus;
  readonly receipt: {
    readonly run_id: string;
    readonly role: string;
    readonly frozen_at: string;
    readonly evidence_cutoff: string;
    readonly controlled_inputs: LockManifest;
    readonly digests: { readonly normalized_packet_digest: string; readonly [key: string]: unknown };
    readonly receipt_digest: string;
    readonly [key: string]: unknown;
  };
}

export interface D1ScoringIsolation {
  /** True once the frozen scoring view has passed every §3.2 / §3.1 check. */
  readonly scoring_view_clean: true;
  /** Tools exposed to a scoring call. Always empty (ADR 0036 §6). */
  readonly scoring_tool_access: readonly never[];
  readonly research_context_supplied: false;
  readonly conversation_linkage: false;
  /**
   * No holdout material was supplied to the context: no wrapper-authored holdout
   * content, no holdout scope or identity field, no holdout-specific analysis or
   * evidence. Guaranteed by the fail-closed gate below, which is what "material"
   * means in §3.1 — not the absence of the string anywhere in the packet.
   */
  readonly holdout_material_supplied: false;
  /**
   * Holdout mentions inside the byte-locked Item 3 inputs. Reported, never
   * edited: the Item 3 freeze is owner-approved and immutable to this slice, so
   * the receipt discloses the true isolation boundary instead of implying a
   * cleanliness the frozen bytes do not have.
   */
  readonly controlled_byte_mentions: readonly ControlledByteHoldoutReport[];
  /**
   * Incidental holdout-title mentions inside the captured bodies of sources
   * admitted to D1's own evidence corpus. Reported for the same reason: they are
   * D1 evidence rather than holdout calibration material (#87/#89 ruling), and
   * editing an admitted capture would break the corpus freeze it was hashed
   * under. Usually empty; when it is not, the receipt says exactly where.
   */
  readonly admitted_source_text_mentions: readonly HoldoutMention[];
}

export interface D1ScoringPair {
  readonly runKey: "D1";
  /** The two requests. Identical by construction; proven identical below. */
  readonly primary: ScoringRequest;
  readonly audit: ScoringRequest;
  /** Empty by definition — the pair is refused if it is not. */
  readonly pairIssues: readonly PairInvariantIssue[];
  readonly lock: LockManifest;
  readonly isolation: D1ScoringIsolation;
  readonly evidenceCutoff: string;
  readonly frozenAt: string;
  readonly researchRunId: string;
  /** The digest both calls are identified by. */
  readonly semanticRequestDigest: string;
  /** Stable name for the pair's artifacts, derived from that digest. */
  readonly pairId: string;
}

export interface D1ScoringPairOptions {
  readonly handoff: D1ResearchHandoff;
  /** Injectable for tests; defaults to verifying the real controlled bytes. */
  readonly lock?: LockManifest;
  readonly maxOutputTokens?: number;
  /** Supplied only if the endpoint exposes a seed; the two must then differ. */
  readonly seeds?: { readonly primary: number; readonly audit: number };
}

function deepKeys(value: unknown, at: string, found: { key: string; at: string }[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => deepKeys(item, `${at}[${index}]`, found));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_SCORING_VIEW_KEYS.includes(key)) found.push({ key, at: `${at}.${key}` });
    deepKeys(child, `${at}.${key}`, found);
  }
}

/**
 * Build the D1 primary/audit scoring pair, or refuse.
 *
 * The gate order is deliberate and each gate is fail-closed: controlled bytes,
 * research-lock continuity, handoff digest binding, scope lock, scoring-view
 * isolation, then — and only then — the two requests and the pair proof.
 */
export function buildD1ScoringPair(options: D1ScoringPairOptions): D1ScoringPair {
  const { handoff } = options;

  // Gate 1 — the Item 3 byte freeze. A request built from unapproved bytes is not
  // a Phase 3A request at all. The lock is injectable for tests, so the drift
  // check is re-applied to an injected manifest: it must not be a way past the
  // gate it exists to enforce.
  const lock = options.lock ?? verifyControlledInputs();
  const drifted = lock.inputs.filter((input) => !input.matches);
  if (drifted.length > 0) throw new ControlledInputDriftError(drifted);

  const problems: string[] = [];

  // Gate 2 — research-lock continuity. Scoring a corpus that was frozen under
  // different methodology bytes than the ones this call would send is exactly the
  // drift §9.3 says to record rather than paper over.
  const researchLock = handoff.receipt.controlled_inputs;
  if (researchLock?.lock_set_digest !== lock.lock_set_digest) {
    problems.push(
      `controlled-input lock drift: the corpus was frozen under lock set ${String(researchLock?.lock_set_digest)} but the current bytes hash to ${lock.lock_set_digest}`,
    );
  }
  for (const current of lock.inputs) {
    const atResearch = researchLock?.inputs?.find((input) => input.role === current.role);
    if (atResearch && atResearch.sha256 !== current.sha256) {
      problems.push(
        `controlled input "${current.role}" changed since the corpus freeze: ${atResearch.sha256} → ${current.sha256}`,
      );
    }
  }

  // Gate 3 — handoff digest binding. The semantic input is re-hashed here and
  // must reproduce the digest the freeze committed to, in both the corpus and the
  // research receipt. This is the check the slice-B handoff asks for before a
  // paired call is spent.
  const recomputed = sha256Hex(canonicalize(handoff.semanticInput as never));
  if (recomputed !== handoff.corpus.normalized_packet_digest) {
    problems.push(
      `semantic-input.json does not hash to the frozen corpus digest: recomputed ${recomputed}, corpus records ${handoff.corpus.normalized_packet_digest}`,
    );
  }
  if (handoff.receipt.digests?.normalized_packet_digest !== handoff.corpus.normalized_packet_digest) {
    problems.push(
      `the research receipt and the corpus disagree about the normalized packet digest: ${String(handoff.receipt.digests?.normalized_packet_digest)} vs ${handoff.corpus.normalized_packet_digest}`,
    );
  }
  if (
    canonicalize(handoff.semanticInput.canonical_source_order as never) !==
    canonicalize(handoff.corpus.canonical_source_order as never)
  ) {
    problems.push("the semantic input's canonical source order differs from the frozen corpus order");
  }
  if (handoff.corpus.review_grades_masked !== true) {
    problems.push("the frozen corpus does not record review_grades_masked; a scoring view must be masked");
  }

  // Gate 4 — scope lock. The scope in the scoring view is re-derived from the
  // immutable slice-A run input plus the freeze date and must match byte for
  // byte, so a mutated scope key, edition, platform list or DLC exclusion cannot
  // reach a scoring call.
  const evidenceCutoff = handoff.corpus.frozen_at.slice(0, 10);
  let expectedScope: string | null = null;
  try {
    expectedScope = canonicalize(freezeD1EvaluationScope(evidenceCutoff) as never);
  } catch (error) {
    problems.push(
      `the D1 evaluation scope could not be re-derived from the freeze date ${evidenceCutoff}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (expectedScope !== null && canonicalize(handoff.semanticInput.evaluation_scope as never) !== expectedScope) {
    problems.push(
      "the scoring view's evaluation_scope is not the frozen D1 scope re-derived from D1_RUN_INPUT; scope, edition, platforms or the Final Draft / New Game Plus, Night Springs / Lake House exclusions have drifted",
    );
  }

  // Gate 5 — scoring-view isolation (preregistration §3.2, §3.1; ADR 0036 §6).
  const leaked: { key: string; at: string }[] = [];
  deepKeys(handoff.semanticInput, "<semantic_input>", leaked);
  for (const entry of leaked) {
    problems.push(`research or downstream context leaked into the scoring view: "${entry.key}" at ${entry.at}`);
  }
  for (const leak of findReviewGradeLeaks(handoff.semanticInput, "<semantic_input>")) {
    problems.push(`${leak.at}: unmasked review grade or aggregate ("${leak.matched}") in the scoring view`);
  }

  if (problems.length > 0) throw new ScoringHandoffError(problems);

  // Fails closed over everything in the scoring view that is wrapper-authored or
  // identity-bearing — the evaluation scope, the coverage frames, the canonical
  // source order, every source ID and record status, every property name — which
  // is where holdout scope/identity fields, holdout-specific analysis or evidence,
  // expected outcomes and prior holdout decisions would appear.
  //
  // It does NOT reject the packet merely because an admitted third-party D1
  // source incidentally mentions a holdout title in its captured body: per the
  // orchestrator ruling on #87/#89, that text is D1 evidence, not holdout
  // calibration material, and §3.1 forbids supplying material ABOUT a holdout.
  // Such mentions are reported into the receipt instead, so the isolation
  // boundary is disclosed rather than silently widened or silently ignored.
  const admittedSourceTextMentions = assertScoringViewHoldoutIsolation(
    handoff.semanticInput,
    "the D1 scoring semantic input",
  );

  // Gate 6 — the two requests, from the one frozen builder and no second path.
  const maxOutputTokens = options.maxOutputTokens ?? D1_SCORING_MAX_OUTPUT_TOKENS;
  const build = (seed: number | undefined): ScoringRequest =>
    buildScoringRequest({
      semanticInput: handoff.semanticInput,
      maxOutputTokens,
      lock,
      ...(seed === undefined ? {} : { seed }),
    });

  const primary = build(options.seeds?.primary);
  const audit = build(options.seeds?.audit);

  // The proof, not the assumption. `assertPairInvariants` throws on any
  // difference ADR 0036 §5 forbids.
  assertPairInvariants(primary, audit);
  const pairIssues = checkPairInvariants(primary, audit);

  const semanticRequestDigest = primary.digests.semantic_request_digest;

  return {
    runKey: "D1",
    primary,
    audit,
    pairIssues,
    lock,
    isolation: {
      scoring_view_clean: true,
      scoring_tool_access: [],
      research_context_supplied: false,
      conversation_linkage: false,
      holdout_material_supplied: false,
      controlled_byte_mentions: reportControlledInputHoldoutMentions(),
      admitted_source_text_mentions: admittedSourceTextMentions,
    },
    evidenceCutoff,
    frozenAt: handoff.corpus.frozen_at,
    researchRunId: handoff.corpus.research_run_manifest.run_id,
    semanticRequestDigest,
    pairId: `d1-scoring-${semanticRequestDigest.slice(0, 24)}`,
  };
}

export interface D1ScoringRunFacts {
  readonly started_at: string;
  readonly ended_at: string;
  readonly api_elapsed_ms: number;
  readonly returned_model: string | null;
  readonly response_id: string | null;
  readonly snapshot_identifier: string | null;
  readonly token_usage: Record<string, number> | null;
  readonly attempt: number;
}

export interface D1ScoringRunResult {
  readonly ok: boolean;
  readonly facts: D1ScoringRunFacts;
  readonly output: ModelScoringPass | null;
  readonly error_class: string | null;
  readonly error_message: string | null;
}

/**
 * Execute ONE scoring call as an isolated clean context.
 *
 * Deliberately takes a `ScoringRequest` and no role: the role is not a parameter
 * here either, so it cannot reach the wire through this path any more than it can
 * through the builder. The caller attaches it afterwards, to the manifest.
 *
 * No retry loop: preregistration §9.1 makes a retry a fresh independent call that
 * the caller records, so a transport-level retry here would be the silent repair
 * the protocol forbids. `assertExecutionContract` — the scoring contract, which
 * refuses tools outright — runs inside `callResponses` before anything is sent.
 */
export async function runD1ScoringPass(options: {
  readonly request: ScoringRequest;
  readonly apiKey: string;
  readonly attempt?: number;
  readonly fetchImpl?: typeof fetch;
  readonly baseUrl?: string;
  readonly now?: () => Date;
}): Promise<D1ScoringRunResult> {
  const now = options.now ?? (() => new Date());
  const body = toRequestBody(options.request.configuration, {
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
  });
  const ended_at = now().toISOString();

  const facts: D1ScoringRunFacts = {
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
      error_class: result.metadata.error_class ?? "EmptyScoringOutput",
      error_message:
        result.metadata.error_message ?? "the scoring call returned no structured output",
    };
  }

  try {
    // ADR 0036 §8 — the returned identity must satisfy the preregistered contract
    // before a run counts.
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
    output: result.output as ModelScoringPass,
    error_class: null,
    error_message: null,
  };
}

/**
 * Build the run manifest for one completed pass.
 *
 * This is the first and only place a run role exists. It takes the model output
 * as an argument precisely so it cannot be called before there is one:
 * preregistration §4.2 and the frozen scoring prompt both say the wrapper assigns
 * `primary`/`audit` only as run metadata after the model output.
 */
export function buildD1ScoringManifest(options: {
  readonly pair: D1ScoringPair;
  readonly request: ScoringRequest;
  readonly role: RunRole;
  readonly output: ModelScoringPass;
  readonly facts: D1ScoringRunFacts;
}): RunManifest {
  const { pair, request, role, output, facts } = options;
  return {
    run_id: `${pair.pairId}-${role}-a${facts.attempt}`,
    role,
    started_at: facts.started_at,
    ended_at: facts.ended_at,
    provider: "openai",
    model_label: PREREGISTERED_MODEL,
    model_snapshot_build_id:
      facts.snapshot_identifier ??
      `${String(facts.returned_model ?? PREREGISTERED_MODEL)} (no stronger snapshot identifier exposed by the API)`,
    protocol_version: "1.0",
    rubric_version: "1.0",
    package_schema_version: "1.0-draft",
    system_instructions_digest: request.digests.system_instructions_digest,
    prompt_template_digest: request.digests.prompt_template_digest,
    rubric_digest: request.digests.rubric_digest,
    protocol_digest: request.digests.protocol_digest,
    output_schema_digest: request.digests.output_schema_digest,
    normalized_packet_digest: request.digests.normalized_packet_digest,
    canonical_source_order: request.canonical_source_order,
    // ADR 0036 §6 — a scoring pass has no tool access at all.
    research_tool_access: [],
    decoding_parameters: [
      { name: "reasoning_effort", value: request.configuration.reasoning_effort },
      { name: "reasoning_context", value: request.configuration.reasoning_context },
      { name: "store", value: request.configuration.store },
      { name: "max_output_tokens", value: request.configuration.max_output_tokens },
      { name: "tools", value: "none" },
    ],
    // Preregistration §4.1 — never fabricate a seed.
    seed: manifestSeed(request.configuration.seed),
    retry_count: Math.max(0, facts.attempt - 1),
    validation_failures: [],
    human_corrections: [],
    structured_output_digest: structuredOutputDigest(output),
  };
}

export type PassRuleFamily =
  | "structure"
  | "digest_binding"
  | "decision_set"
  | "reference_integrity"
  | "coverage_derivation"
  | "facet_records"
  | "run_manifest";

export interface PassValidationIssue {
  readonly family: PassRuleFamily;
  readonly path: string;
  readonly message: string;
}

export interface PassValidationResult {
  readonly valid: boolean;
  readonly issues: readonly PassValidationIssue[];
}

function frameIndex(semanticInput: SemanticInput): Map<string, CoverageFrame> {
  const frames = Array.isArray(semanticInput.coverage_frames)
    ? (semanticInput.coverage_frames as CoverageFrame[])
    : [];
  return new Map(frames.map((frame) => [frame.subcriterion_key, frame]));
}

function checkCoveragePartition(
  family: PassRuleFamily,
  path: string,
  frame: CoverageFrame | undefined,
  observed: readonly string[],
  missing: readonly string[],
  declaredState: string,
  issues: PassValidationIssue[],
): void {
  if (!frame) {
    issues.push({ family, path, message: "no frozen coverage frame exists for this criterion" });
    return;
  }
  const units = new Map<string, CoverageUnit>(frame.coverage_units.map((unit) => [unit.unit_id, unit]));
  const seen = new Set<string>();
  for (const unitId of [...observed, ...missing]) {
    if (!units.has(unitId)) {
      issues.push({ family, path, message: `names unit "${unitId}", which is not in the frozen frame` });
    }
    if (seen.has(unitId)) {
      issues.push({ family, path, message: `unit "${unitId}" appears in both the observed and missing lists` });
    }
    seen.add(unitId);
  }
  for (const unitId of units.keys()) {
    if (!seen.has(unitId)) {
      issues.push({ family, path, message: `frozen frame unit "${unitId}" is neither observed nor missing` });
    }
  }
  const missingUnits = missing.map((unitId) => units.get(unitId)).filter((unit): unit is CoverageUnit => Boolean(unit));
  const derived = deriveCoverageState(missingUnits);
  if (derived !== declaredState) {
    issues.push({
      family: "coverage_derivation",
      path,
      message: `coverage_state is recorded as "${declaredState}" but the frozen frame derives "${derived}" (Protocol §6.1)`,
    });
  }
}

/**
 * Validate ONE scoring pass, without repairing anything.
 *
 * Two layers, and the first is the authority:
 *
 *  1. the canonical package schema's own `scoringPass` definition, compiled by
 *     the shared `package-schema` module — the same structural contract a
 *     complete package is held to, applied to the part that exists now;
 *  2. the pass-scoped subset of the Protocol §15.1 checklist that can be decided
 *     from one pass plus the frozen packet: digest binding, decision-set
 *     completeness, reference integrity, the §6.1 coverage derivation (through
 *     the existing `deriveCoverageState`, not a second implementation) and the
 *     required-facet rule.
 *
 * The families §15.1 defines ACROSS the pair or over the adjudicated package —
 * difference classification, adjudication, derived dimensions, reassessment — are
 * deliberately not evaluated here: they are the orchestrator's, they need content
 * this slice must not author, and `validatePackageSemantics` already owns them
 * for the assembled package.
 *
 * Nothing below normalises, reorders, defaults or coerces. It reports, and the
 * caller fails closed.
 */
export function validateD1ScoringPass(options: {
  readonly pass: ScoringPass;
  readonly semanticInput: SemanticInput;
  readonly corpus: Corpus;
  readonly output: ModelScoringPass;
  readonly role: RunRole;
}): PassValidationResult {
  const { pass, semanticInput, corpus, output, role } = options;
  const issues: PassValidationIssue[] = [];

  const validate = validatorFor("/$defs/scoringPass");
  if (!validate(pass)) {
    for (const error of validate.errors ?? []) {
      issues.push({
        family: "structure",
        path: error.instancePath || "<root>",
        message: error.message ?? error.keyword,
      });
    }
  }

  const manifest = pass.run_manifest;
  if (manifest.normalized_packet_digest !== corpus.normalized_packet_digest) {
    issues.push({
      family: "digest_binding",
      path: "run_manifest.normalized_packet_digest",
      message: "does not equal the frozen corpus digest",
    });
  }
  if (manifest.structured_output_digest !== structuredOutputDigest(output)) {
    issues.push({
      family: "digest_binding",
      path: "run_manifest.structured_output_digest",
      message: "does not equal the digest of the raw model output",
    });
  }
  if (
    canonicalize(manifest.canonical_source_order as never) !==
    canonicalize(corpus.canonical_source_order as never)
  ) {
    issues.push({
      family: "digest_binding",
      path: "run_manifest.canonical_source_order",
      message: "differs from the frozen canonical source order",
    });
  }
  if (manifest.role !== role) {
    issues.push({
      family: "run_manifest",
      path: "run_manifest.role",
      message: `records "${manifest.role}" but this is the ${role} pass`,
    });
  }
  if (manifest.model_label !== PREREGISTERED_MODEL) {
    issues.push({
      family: "run_manifest",
      path: "run_manifest.model_label",
      message: `must be the preregistered "${PREREGISTERED_MODEL}" (ADR 0036 §1)`,
    });
  }
  if (manifest.research_tool_access.length > 0) {
    issues.push({
      family: "run_manifest",
      path: "run_manifest.research_tool_access",
      message: "a scoring pass exposes no tools (ADR 0036 §6)",
    });
  }
  const reasoningContext = manifest.decoding_parameters.find(
    (parameter) => parameter.name === "reasoning_context",
  );
  if (reasoningContext?.value !== PREREGISTERED_REASONING_CONTEXT) {
    issues.push({
      family: "run_manifest",
      path: "run_manifest.decoding_parameters",
      message: `reasoning_context must be recorded as "${PREREGISTERED_REASONING_CONTEXT}"`,
    });
  }
  const reasoningEffort = manifest.decoding_parameters.find(
    (parameter) => parameter.name === "reasoning_effort",
  );
  if (reasoningEffort?.value !== PREREGISTERED_REASONING_EFFORT) {
    issues.push({
      family: "run_manifest",
      path: "run_manifest.decoding_parameters",
      message: `reasoning_effort must be recorded as "${PREREGISTERED_REASONING_EFFORT}"`,
    });
  }

  // Decision set: exactly one decision per rubric subcriterion, nothing else.
  const byKey = new Map<string, ScoreDecision[]>();
  for (const decision of pass.decisions) {
    byKey.set(decision.subcriterion_key, [...(byKey.get(decision.subcriterion_key) ?? []), decision]);
  }
  for (const key of RUBRIC_SUBCRITERION_KEYS) {
    const found = byKey.get(key) ?? [];
    if (found.length === 0) {
      issues.push({ family: "decision_set", path: `decisions/${key}`, message: "no decision for this rubric subcriterion" });
    } else if (found.length > 1) {
      issues.push({ family: "decision_set", path: `decisions/${key}`, message: `${found.length} decisions for one subcriterion` });
    }
  }
  for (const key of byKey.keys()) {
    if (!RUBRIC_SUBCRITERION_KEYS.includes(key)) {
      issues.push({ family: "decision_set", path: `decisions/${key}`, message: "is not a rubric subcriterion key" });
    }
  }

  // Reference integrity, pass-local: raw claim IDs are pass-scoped (§15.1
  // amendment 4), so every reference must resolve inside THIS ledger.
  const claimIds = new Set<string>();
  for (const claim of pass.claim_ledger) {
    if (claimIds.has(claim.claim_id)) {
      issues.push({
        family: "reference_integrity",
        path: `claim_ledger/${claim.claim_id}`,
        message: "duplicate claim_id within the pass ledger",
      });
    }
    claimIds.add(claim.claim_id);
  }

  const orderedSources = new Set(corpus.canonical_source_order);
  const frames = frameIndex(semanticInput);
  // The global sets exist only to tell "names nothing frozen" apart from "names
  // another criterion's frozen object". Neither is ever what makes a reference
  // resolve: coverage frames and their units are criterion-scoped, and every
  // acceptance below is decided against the one frame that belongs to the
  // criterion the reference is made under.
  const frameIds = new Set([...frames.values()].map((frame) => frame.coverage_frame_id));
  const frameUnitIds = new Set(
    [...frames.values()].flatMap((frame) => frame.coverage_units.map((unit) => unit.unit_id)),
  );
  const unitIdsOf = (frame: CoverageFrame | undefined): Set<string> =>
    new Set(frame?.coverage_units.map((unit) => unit.unit_id) ?? []);

  for (const claim of pass.claim_ledger) {
    if (!orderedSources.has(claim.source_id)) {
      issues.push({
        family: "reference_integrity",
        path: `claim_ledger/${claim.claim_id}.source_id`,
        message: `"${claim.source_id}" is not in the frozen canonical source order`,
      });
    }
    if (!RUBRIC_SUBCRITERION_KEYS.includes(claim.subcriterion_key)) {
      issues.push({
        family: "reference_integrity",
        path: `claim_ledger/${claim.claim_id}.subcriterion_key`,
        message: `"${claim.subcriterion_key}" is not a rubric subcriterion key`,
      });
    }
    // §5.2 — a claim's observed units are "observed-unit IDs from the frozen
    // criterion coverage frame", meaning the frame of the criterion this claim
    // is mapped to. §6.1 depends on that scoping: a linked, non-rejected claim's
    // observed unit is observed for the decision, which only means anything if
    // the unit belongs to that criterion's frame. A unit of some other
    // criterion's frame therefore does not resolve here either.
    const claimFrame = frames.get(claim.subcriterion_key);
    const claimFrameUnitIds = unitIdsOf(claimFrame);
    for (const unitId of claim.observed_unit_ids) {
      if (claimFrameUnitIds.has(unitId)) continue;
      const path = `claim_ledger/${claim.claim_id}.observed_unit_ids`;
      if (!claimFrame) {
        issues.push({
          family: "reference_integrity",
          path,
          message: `"${unitId}" cannot resolve: no frozen coverage frame exists for ${claim.subcriterion_key}, the criterion this claim is mapped to`,
        });
        continue;
      }
      issues.push({
        family: "reference_integrity",
        path,
        message: frameUnitIds.has(unitId)
          ? `"${unitId}" is a unit of another criterion's frozen frame, not of the ${claim.subcriterion_key} frame this claim is mapped to (Protocol §5.2)`
          : `"${unitId}" is not a unit of any frozen coverage frame`,
      });
    }
  }

  for (const decision of pass.decisions) {
    const path = `decisions/${decision.subcriterion_key}`;
    const references: readonly (readonly [string, readonly string[]])[] = [
      ["claim_ids", decision.claim_ids],
      ["endpoint_gate.scope_spanning_claim_ids", decision.endpoint_gate?.scope_spanning_claim_ids ?? []],
      ...decision.platform_overrides.map(
        (override, index) =>
          [`platform_overrides[${index}].claim_ids`, override.claim_ids] as const,
      ),
    ];
    for (const [field, ids] of references) {
      for (const claimId of ids) {
        if (!claimIds.has(claimId)) {
          issues.push({
            family: "reference_integrity",
            path: `${path}.${field}`,
            message: `"${claimId}" resolves to no claim in this pass's ledger`,
          });
        }
      }
    }
    const frame = frames.get(decision.subcriterion_key);
    const ownFrameUnitIds = unitIdsOf(frame);

    // §15.1 amendment 4 names four object kinds, and two of them are scoped to
    // the criterion being marked Unknown: "the scored criterion's own frozen
    // coverage frame, or a unit of that frame. Another criterion's frame or unit
    // says nothing about this criterion's coverage and does not resolve."
    //
    // The candidate-source record is the one kind a scoring pass cannot see —
    // §3.2 withholds the candidate log from the scoring view — so a reference
    // that resolves to none of the visible kinds is reported as an unresolved
    // reference for the orchestrator rather than guessed at here. A reference
    // that names a real frozen object belonging to a different criterion is a
    // different, decidable failure and is reported as such.
    const checkInsufficiencyReference = (at: string, referenceId: string): void => {
      if (claimIds.has(referenceId)) return;
      if (frame && referenceId === frame.coverage_frame_id) return;
      if (ownFrameUnitIds.has(referenceId)) return;
      issues.push({
        family: "reference_integrity",
        path: `${at}.insufficiency_reference_ids`,
        message:
          frameIds.has(referenceId) || frameUnitIds.has(referenceId)
            ? `"${referenceId}" is another criterion's frozen coverage frame or unit, which says nothing about ${decision.subcriterion_key}'s coverage (§15.1 amendment 4)`
            : `"${referenceId}" resolves to no claim, coverage frame or frame unit visible in this pass`,
      });
    };
    for (const referenceId of decision.insufficiency_reference_ids) {
      checkInsufficiencyReference(path, referenceId);
    }
    for (const [index, override] of decision.platform_overrides.entries()) {
      for (const referenceId of override.insufficiency_reference_ids) {
        // An override is scored under the same criterion, so it is held to the
        // same criterion-scoped rule.
        checkInsufficiencyReference(`${path}.platform_overrides[${index}]`, referenceId);
      }
    }

    checkCoveragePartition(
      "coverage_derivation",
      path,
      frame,
      decision.coverage_observed_unit_ids,
      decision.coverage_missing_unit_ids,
      decision.confidence_facts.coverage_state,
      issues,
    );
    for (const [index, override] of decision.platform_overrides.entries()) {
      checkCoveragePartition(
        "coverage_derivation",
        `${path}.platform_overrides[${index}]`,
        frame,
        override.coverage_observed_unit_ids,
        override.coverage_missing_unit_ids,
        override.confidence_facts.coverage_state,
        issues,
      );
    }

    // Protocol §6.1 required facets: the six named criteria carry exactly their
    // two facet records; every other criterion carries none.
    const required = REQUIRED_FACETS.get(decision.subcriterion_key);
    const present = decision.facet_records.map((record) => record.facet_key).sort();
    const expected = required ? [...required].sort() : [];
    if (canonicalize(present as never) !== canonicalize(expected as never)) {
      issues.push({
        family: "facet_records",
        path: `${path}.facet_records`,
        message: `expected facets [${expected.join(", ")}]; found [${present.join(", ")}]`,
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

export interface D1PassReceipt {
  readonly receipt_version: "1.0";
  readonly run_key: "D1";
  readonly role: RunRole;
  readonly pair_id: string;
  readonly run_id: string;
  readonly attempt: number;
  readonly research_run_id: string;
  readonly scope_key: string;
  readonly known_exclusions: readonly string[];
  readonly evidence_cutoff: string;
  readonly corpus_frozen_at: string;
  readonly started_at: string;
  readonly ended_at: string;
  readonly api_elapsed_ms: number;
  readonly provider: string;
  readonly requested_model: string;
  readonly returned_model: string | null;
  readonly response_id: string | null;
  readonly model_snapshot_build_id: string;
  readonly configuration: ScoringRequest["configuration"];
  readonly scoring_tool_access: readonly never[];
  readonly token_usage: Record<string, number> | null;
  readonly controlled_inputs: LockManifest;
  readonly digests: ScoringRequest["digests"] & {
    readonly scoring_transport_schema_digest: string;
    readonly structured_output_digest: string;
    readonly run_manifest_digest: string;
  };
  readonly isolation: D1ScoringIsolation & { readonly role_assigned_after_output: true };
  readonly validation: {
    readonly structural_and_pass_scoped: PassValidationResult;
    readonly deferred_to_package_assembly: readonly string[];
  };
  readonly validation_failures: readonly string[];
  readonly human_corrections: readonly string[];
  /** SHA-256 over the RFC 8785 bytes of everything above. */
  readonly receipt_digest: string;
}

/**
 * The §15.1 families that cannot be decided from one pass and are therefore the
 * orchestrator's, at package assembly. Named explicitly so the receipt states
 * what this slice did NOT validate rather than implying completeness.
 */
export const DEFERRED_VALIDATION_FAMILIES: readonly string[] = [
  "pair_invariants (§15.1(3)) — proven here over the REQUESTS; the paired-output half needs both passes in one package",
  "adjudication (§15.1(9)) — owner/orchestrator stage; this slice performs no reconciliation",
  "derivation (§15.1(10)) — needs adjudicated final decisions",
  "coverage_and_time (§15.1(8)) — the package-level half needs the evaluation scope and adjudicated set together",
  "reassessment (§15.1(11)) — needs a baseline package",
];

export interface D1PassResult {
  readonly role: RunRole;
  readonly pass: ScoringPass;
  readonly manifest: RunManifest;
  readonly validation: PassValidationResult;
  readonly receipt: D1PassReceipt;
}

/**
 * Assemble one completed pass: manifest, canonical pass, validation and receipt.
 *
 * Deterministic. Given the same pair, output and facts it produces the same
 * `receipt_digest` every time, which is what makes a replay meaningful.
 */
export function completeD1ScoringPass(options: {
  readonly pair: D1ScoringPair;
  readonly handoff: D1ResearchHandoff;
  readonly role: RunRole;
  readonly output: ModelScoringPass;
  readonly facts: D1ScoringRunFacts;
}): D1PassResult {
  const { pair, handoff, role, output, facts } = options;
  const request = role === "primary" ? pair.primary : pair.audit;

  // The role exists for the first time here, after the model output.
  const manifest = buildD1ScoringManifest({ pair, request, role, output, facts });
  const pass = assembleScoringPass(output, manifest);

  const validation = validateD1ScoringPass({
    pass,
    semanticInput: handoff.semanticInput,
    corpus: handoff.corpus,
    output,
    role,
  });

  const body = {
    receipt_version: "1.0" as const,
    run_key: "D1" as const,
    role,
    pair_id: pair.pairId,
    run_id: manifest.run_id,
    attempt: facts.attempt,
    research_run_id: pair.researchRunId,
    scope_key: D1_RUN_INPUT.scope.scope_key,
    known_exclusions: D1_RUN_INPUT.scope.known_exclusions,
    evidence_cutoff: pair.evidenceCutoff,
    corpus_frozen_at: pair.frozenAt,
    started_at: facts.started_at,
    ended_at: facts.ended_at,
    api_elapsed_ms: facts.api_elapsed_ms,
    provider: "openai",
    requested_model: PREREGISTERED_MODEL,
    returned_model: facts.returned_model,
    response_id: facts.response_id,
    model_snapshot_build_id: manifest.model_snapshot_build_id,
    configuration: request.configuration,
    scoring_tool_access: [] as readonly never[],
    token_usage: facts.token_usage,
    controlled_inputs: pair.lock,
    digests: {
      ...request.digests,
      scoring_transport_schema_digest: request.scoringPassSchemaDigest,
      structured_output_digest: manifest.structured_output_digest,
      run_manifest_digest: canonicalDigest(manifest as never),
    },
    isolation: { ...pair.isolation, role_assigned_after_output: true as const },
    validation: {
      structural_and_pass_scoped: validation,
      deferred_to_package_assembly: DEFERRED_VALIDATION_FAMILIES,
    },
    validation_failures: validation.issues.map(
      (issue) => `[${issue.family}] ${issue.path}: ${issue.message}`,
    ),
    // Always empty from this slice. A semantic correction would invalidate the
    // measured pair (preregistration §9.1) and is not engineering's to make.
    human_corrections: [] as readonly string[],
  };

  return {
    role,
    pass,
    manifest,
    validation,
    receipt: { ...body, receipt_digest: canonicalDigest(body as never) },
  };
}

export interface D1PairReceipt {
  readonly receipt_version: "1.0";
  readonly run_key: "D1";
  readonly pair_id: string;
  readonly research_run_id: string;
  readonly evidence_cutoff: string;
  readonly corpus_frozen_at: string;
  readonly semantic_request_digest: string;
  readonly normalized_packet_digest: string;
  readonly controlled_lock_set_digest: string;
  /** The byte-identity proof required by ADR 0036 §5. */
  readonly pair_proof: {
    readonly instructions_identical: boolean;
    readonly semantic_input_identical: boolean;
    readonly configuration_identical_except_seed: boolean;
    readonly output_contract_identical: boolean;
    readonly semantic_request_digests_equal: boolean;
    readonly outstanding_issues: readonly PairInvariantIssue[];
  };
  readonly isolation: D1ScoringIsolation & { readonly role_assigned_after_output: true };
  readonly primary: { readonly run_id: string; readonly receipt_digest: string; readonly valid: boolean } | null;
  readonly audit: { readonly run_id: string; readonly receipt_digest: string; readonly valid: boolean } | null;
  readonly pair_counts: boolean;
  readonly blocking_reasons: readonly string[];
  readonly receipt_digest: string;
}

/**
 * The pair-level receipt: the byte-identity proof, the isolation record and
 * whether the pair counts.
 *
 * "Counts" is deliberately conservative and fails closed. A pair counts only when
 * both passes exist, both validate cleanly and nothing was corrected — anything
 * else is a blocking reason handed to the orchestrator under preregistration
 * §9.1/§9.3, never something this slice resolves.
 */
export function buildD1PairReceipt(options: {
  readonly pair: D1ScoringPair;
  readonly primary: D1PassResult | null;
  readonly audit: D1PassResult | null;
  readonly primaryFailure?: string | null;
  readonly auditFailure?: string | null;
}): D1PairReceipt {
  const { pair, primary, audit } = options;
  const issues = pair.pairIssues;

  const blocking: string[] = [];
  if (issues.length > 0) {
    blocking.push(...issues.map((issue) => `pair invariant: ${issue.field} — ${issue.message}`));
  }
  if (!primary) blocking.push(`primary pass did not complete: ${options.primaryFailure ?? "no output"}`);
  if (!audit) blocking.push(`audit pass did not complete: ${options.auditFailure ?? "no output"}`);
  for (const result of [primary, audit]) {
    if (result && !result.validation.valid) {
      blocking.push(
        ...result.validation.issues.map(
          (issue) => `${result.role} validation: [${issue.family}] ${issue.path}: ${issue.message}`,
        ),
      );
    }
  }

  const body = {
    receipt_version: "1.0" as const,
    run_key: "D1" as const,
    pair_id: pair.pairId,
    research_run_id: pair.researchRunId,
    evidence_cutoff: pair.evidenceCutoff,
    corpus_frozen_at: pair.frozenAt,
    semantic_request_digest: pair.semanticRequestDigest,
    normalized_packet_digest: pair.primary.digests.normalized_packet_digest,
    controlled_lock_set_digest: pair.lock.lock_set_digest,
    pair_proof: {
      instructions_identical: pair.primary.instructions === pair.audit.instructions,
      semantic_input_identical: pair.primary.input === pair.audit.input,
      configuration_identical_except_seed: !issues.some((issue) => issue.field === "configuration"),
      output_contract_identical:
        canonicalize(pair.primary.response_format.schema as never) ===
        canonicalize(pair.audit.response_format.schema as never),
      semantic_request_digests_equal:
        pair.primary.digests.semantic_request_digest === pair.audit.digests.semantic_request_digest,
      outstanding_issues: issues,
    },
    isolation: { ...pair.isolation, role_assigned_after_output: true as const },
    primary: primary
      ? {
          run_id: primary.manifest.run_id,
          receipt_digest: primary.receipt.receipt_digest,
          valid: primary.validation.valid,
        }
      : null,
    audit: audit
      ? {
          run_id: audit.manifest.run_id,
          receipt_digest: audit.receipt.receipt_digest,
          valid: audit.validation.valid,
        }
      : null,
    pair_counts: blocking.length === 0,
    blocking_reasons: blocking as readonly string[],
  };

  return { ...body, receipt_digest: canonicalDigest(body as never) };
}

/**
 * The raw scoring attempt as it is persisted.
 *
 * `output_digest` is the same digest the run manifest records as
 * `structured_output_digest`, carried on the capture itself so the file is
 * self-verifying: a capture edited after it was written no longer re-derives its
 * own digest and is refused when it is read back for a replay.
 */
export interface D1ScoringCapture {
  readonly role: RunRole;
  readonly facts: D1ScoringRunFacts;
  readonly output: ModelScoringPass;
  readonly request_semantic_digest: string;
  readonly output_digest: string;
}

export function buildD1ScoringCapture(options: {
  readonly pair: D1ScoringPair;
  readonly role: RunRole;
  readonly output: ModelScoringPass;
  readonly facts: D1ScoringRunFacts;
}): D1ScoringCapture {
  return {
    role: options.role,
    facts: options.facts,
    output: options.output,
    request_semantic_digest: options.pair.semanticRequestDigest,
    output_digest: structuredOutputDigest(options.output),
  };
}

/**
 * The artifact set for one completed pass, with the digest bindings the
 * persisted bytes must re-derive.
 *
 * The model's own bytes are bound twice — once on the capture and once on the
 * assembled pass — because those two files are what the orchestrator reads as
 * the measured output. If persistence altered either of them, the recorded
 * `structured_output_digest` stops describing what is on disk, and that is
 * exactly the condition these bindings make impossible to miss.
 */
export function d1ScoringPassArtifacts(options: {
  readonly result: D1PassResult;
  readonly capture: D1ScoringCapture;
}): readonly ArtifactSpec[] {
  const { result, capture } = options;
  const structuredOutput = result.manifest.structured_output_digest;
  const runManifestDigest = result.receipt.digests.run_manifest_digest;

  return [
    {
      name: "capture",
      value: capture,
      bindings: [
        {
          label: "manifest.structured_output_digest",
          expected: structuredOutput,
          derive: (readBack) => structuredOutputDigest((readBack as D1ScoringCapture).output),
        },
      ],
    },
    {
      name: "manifest",
      value: result.manifest,
      bindings: [
        {
          label: "receipt.digests.run_manifest_digest",
          expected: runManifestDigest,
          derive: (readBack) => canonicalDigest(readBack as never),
        },
      ],
    },
    {
      name: "pass",
      value: result.pass,
      bindings: [
        {
          label: "manifest.structured_output_digest",
          expected: structuredOutput,
          derive: (readBack) => {
            const pass = readBack as ScoringPass;
            return structuredOutputDigest({
              claim_ledger: pass.claim_ledger,
              decisions: pass.decisions,
            });
          },
        },
        {
          label: "receipt.digests.run_manifest_digest",
          expected: runManifestDigest,
          derive: (readBack) => canonicalDigest((readBack as ScoringPass).run_manifest as never),
        },
      ],
    },
    { name: "validation", value: result.validation },
    { name: "receipt", value: result.receipt },
  ];
}

/** The pair-level artifact. Its `receipt_digest` is verified on read-back. */
export function d1ScoringPairArtifacts(receipt: D1PairReceipt): readonly ArtifactSpec[] {
  return [{ name: "pair-receipt", value: receipt }];
}
