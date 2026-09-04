import { canonicalDigest, canonicalize, sha256Hex } from "./canonical-json";
import { COLLECTION_BANDS, QUERY_FAMILIES } from "./protocol-tables";
import { loadPackageSchema, validatorFor } from "./package-schema";
import { deriveStructuredOutputsSchema } from "./scoring-pass-contract";
import { ExecutionContractError, type RequestShape } from "./openai-client";
import {
  PREREGISTERED_MODEL,
  PREREGISTERED_REASONING_CONTEXT,
  PREREGISTERED_REASONING_EFFORT,
  type SemanticInput,
} from "./request-builder";
import type {
  CandidateSource,
  Corpus,
  CoverageFrame,
  EvaluationScope,
  RunManifest,
  Source,
  QueryFamilyAudit,
} from "./package-types";

/**
 * The Phase 3A research collection contract: transport rules, the model-facing
 * Structured Output schema, and the deterministic corpus freeze.
 *
 * The research pass is execution 1 of 3 (preregistration §3.2) and NEVER scores.
 * Everything here is built around that single boundary:
 *
 *  - it has its own execution contract, because research is the one pass with
 *    tool access — "web search only as explicitly configured by the research
 *    harness" (preregistration §4.1) — and the scoring contract forbids tools
 *    outright. The two are separate functions so neither can be reached by
 *    relaxing the other;
 *  - its output schema is derived from the canonical package schema's `corpus`
 *    properties, so the model can produce a candidate log, a source manifest and
 *    coverage frames, and cannot produce a claim ledger, a decision, an anchor
 *    or a score — those fields are not in the contract at all;
 *  - the freeze is a copy plus digests. Nothing is reordered, defaulted or
 *    repaired, because any of those would be the harness authoring research
 *    content.
 */

/** Preregistration §4.1 — the only tool access a research pass may have. */
export const PREREGISTERED_RESEARCH_TOOL_ACCESS: readonly string[] = ["web_search"];

/** The request-body form of that access. */
export const RESEARCH_TOOLS: readonly { readonly type: string }[] = [{ type: "web_search" }];

export interface ResearchConfiguration {
  readonly model: string;
  readonly reasoning_effort: string;
  readonly reasoning_context: string;
  readonly store: false;
  readonly tools: readonly { readonly type: string }[];
  readonly max_output_tokens: number;
}

/**
 * Assert the frozen execution contract on an outbound research request.
 *
 * Identical to the scoring contract except for tools, and deliberately written
 * out rather than composed from it: the tool clause is the whole difference, and
 * a shared helper with a "tools allowed" flag would put the two passes one
 * boolean apart.
 */
export function assertResearchExecutionContract(request: RequestShape): void {
  const fail = (message: string) => {
    throw new ExecutionContractError(message);
  };

  // ADR 0036 §1 / preregistration §4.1 — the exact model, never the alias.
  if (request.model !== PREREGISTERED_MODEL) {
    fail(
      `model must be exactly "${PREREGISTERED_MODEL}"; got "${request.model}". The moving alias and any substitute are refused (ADR 0036 §1).`,
    );
  }
  if (request.reasoning?.effort !== PREREGISTERED_REASONING_EFFORT) {
    fail(
      `reasoning.effort must be "${PREREGISTERED_REASONING_EFFORT}"; got "${String(request.reasoning?.effort)}" (ADR 0036 §2).`,
    );
  }
  if (request.reasoning?.mode !== undefined && request.reasoning.mode !== "standard") {
    fail("reasoning mode must be standard; Pro mode is not authorized by the preregistration (ADR 0036 §2).");
  }
  if (request.reasoning?.context !== PREREGISTERED_REASONING_CONTEXT) {
    fail(
      `reasoning.context must be "${PREREGISTERED_REASONING_CONTEXT}" for an isolated research call; got "${String(request.reasoning?.context)}".`,
    );
  }
  // Preregistration §3.2 — the research context is isolated and ends at freeze.
  if (request.previous_response_id !== undefined && request.previous_response_id !== null) {
    fail("previous_response_id must not be set; the research context is isolated (preregistration §3.2).");
  }
  if (request.conversation !== undefined && request.conversation !== null) {
    fail("conversation linkage must not be set; the research context is isolated (preregistration §3.2).");
  }
  if (request.store !== false) {
    fail(`store must be false for a measured research call; got ${String(request.store)}.`);
  }
  // Preregistration §4.1 — web search only, and only as explicitly configured.
  const tools = request.tools ?? [];
  const toolTypes = tools.map((tool) => String((tool as { type?: unknown } | null)?.type));
  const unauthorized = toolTypes.filter(
    (type) => !PREREGISTERED_RESEARCH_TOOL_ACCESS.includes(type),
  );
  if (unauthorized.length > 0) {
    fail(
      `research tool access is web search only; unauthorized tool(s): ${unauthorized.join(", ")} (preregistration §4.1).`,
    );
  }
  if (toolTypes.length === 0) {
    fail(
      "a research pass must expose the configured web-search tool; an empty tool list is a scoring configuration, not a research one (preregistration §4.1).",
    );
  }
  if (new Set(toolTypes).size !== toolTypes.length) {
    fail("duplicate research tool entries; the configured tool access must be recorded exactly once.");
  }
  if (typeof request.max_output_tokens !== "number" || request.max_output_tokens <= 0) {
    fail("max_output_tokens must be an explicit positive bound (work order §3.10).");
  }
}

/** Build the Responses API body for a research call. */
export function toResearchRequestBody(
  configuration: ResearchConfiguration,
  parts: {
    readonly instructions: string;
    readonly input: string;
    readonly responseFormat: {
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
    tools: configuration.tools,
    max_output_tokens: configuration.max_output_tokens,
    text: {
      format: {
        type: "json_schema",
        name: parts.responseFormat.name,
        strict: true,
        schema: parts.responseFormat.schema,
      },
    },
  };
}

/**
 * Transport-only subschemas, i.e. the two research records the canonical package
 * schema does not itself define.
 *
 * Both exist because the package stores DIGESTS of content that lives outside
 * it. Neither adds methodology:
 *
 *  - `normalized_captures` carries the normalized per-source text whose SHA-256
 *    the canonical `source.normalized_content_digest` already commits to, and
 *    which Protocol §4.6's "normalized scoring packet receives its own digest"
 *    presupposes exists. The freeze re-derives every digest from this text and
 *    refuses a mismatch, so it is checked, not trusted.
 *  - `research_completion_report` carries the four narrative items the frozen
 *    research prompt's Output section asks for that the wrapper cannot derive.
 *    The report's other items — scope identifier, evidence cutoff, collection
 *    standard, A/B cluster count, query-family state, freeze timestamp and
 *    digests — ARE wrapper facts, and asking the model for them would invite it
 *    to state a freeze timestamp it cannot know.
 */
const TRANSPORT_ONLY_PROPERTIES: Record<string, unknown> = {
  normalized_captures: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["source_id", "normalized_content"],
      properties: {
        source_id: { $ref: "#/$defs/id" },
        normalized_content: { $ref: "#/$defs/nonEmptyString" },
      },
    },
  },
  research_completion_report: {
    type: "object",
    additionalProperties: false,
    required: [
      "material_scope_platform_current_state_limitations",
      "credible_disagreement_represented",
      "retrospective_evidence_status",
      "blocking_concern",
    ],
    properties: {
      material_scope_platform_current_state_limitations: { $ref: "#/$defs/nonEmptyString" },
      credible_disagreement_represented: { $ref: "#/$defs/nonEmptyString" },
      retrospective_evidence_status: { $ref: "#/$defs/nonEmptyString" },
      blocking_concern: { $ref: "#/$defs/nullableString" },
    },
  },
};

/**
 * The corpus fields the MODEL owns. Everything else in `$defs/corpus` —
 * the research run manifest, both packet digests, the canonical source order,
 * the masking assertion and the freeze timestamp — is a wrapper fact produced by
 * the freeze below.
 */
export const MODEL_OWNED_CORPUS_FIELDS: readonly string[] = [
  "collection_standard",
  "collection_reason",
  "query_family_audit",
  "candidate_source_log",
  "source_manifest",
  "coverage_frames",
];

export interface ResearchPassSchema {
  readonly name: string;
  readonly strict: true;
  readonly schema: Record<string, unknown>;
  readonly includedDefs: readonly string[];
}

/** Build the model-facing research schema from the controlled canonical bytes. */
export function buildResearchPassSchema(
  canonical: Record<string, unknown> = loadPackageSchema(),
): ResearchPassSchema {
  const canonicalDefs = canonical.$defs as Record<string, unknown>;
  const corpus = canonicalDefs.corpus as Record<string, unknown>;
  const corpusProperties = corpus.properties as Record<string, unknown>;

  const properties: Record<string, unknown> = {};
  for (const field of MODEL_OWNED_CORPUS_FIELDS) {
    properties[field] = corpusProperties[field];
  }
  for (const [name, node] of Object.entries(TRANSPORT_ONLY_PROPERTIES)) {
    properties[name] = node;
  }

  const derived = deriveStructuredOutputsSchema(properties, canonicalDefs);
  return { name: "phase3a_research_pass", strict: true, ...derived };
}

/** The digest recorded for the derived research transport contract. */
export function researchPassSchemaDigest(schema: ResearchPassSchema): string {
  return canonicalDigest(schema.schema as never);
}

export interface NormalizedCapture {
  readonly source_id: string;
  readonly normalized_content: string;
}

export interface ResearchCompletionNarrative {
  readonly material_scope_platform_current_state_limitations: string;
  readonly credible_disagreement_represented: string;
  readonly retrospective_evidence_status: string;
  readonly blocking_concern: string | null;
}

export interface ModelResearchPass {
  readonly collection_standard: Corpus["collection_standard"];
  readonly collection_reason: string;
  readonly query_family_audit: readonly QueryFamilyAudit[];
  readonly candidate_source_log: readonly CandidateSource[];
  readonly source_manifest: readonly Source[];
  readonly coverage_frames: readonly CoverageFrame[];
  readonly normalized_captures: readonly NormalizedCapture[];
  readonly research_completion_report: ResearchCompletionNarrative;
}

export class ResearchContentError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Research output is not safe to freeze:\n${problems.map((p) => `  ${p}`).join("\n")}`);
    this.name = "ResearchContentError";
  }
}

/**
 * Property names that would mean the research pass had scored.
 *
 * The derived schema is closed, so a well-formed response cannot carry them.
 * This is the second line: a replayed capture file, a hand-edited artifact or a
 * future schema edit could, and a research pass that scored must never be
 * frozen as a corpus (preregistration §3.2).
 */
const SCORING_FIELD_NAMES: readonly string[] = [
  "numeric_score",
  "score_value_kind",
  "anchor_id",
  "lower_anchor_rejection",
  "higher_anchor_rejection",
  "subcriterion_confidence",
  "confidence_facts",
  "decisions",
  "claim_ledger",
  "final_decisions",
  "derived_dimensions",
  "dimension_result_kind",
  "overall_confidence",
  "interpretation",
  "primary_pull",
  "primary_risk",
  "audit_summary",
  "adjudication",
];

/** A rubric anchor value stated in prose, e.g. "1.5 / 2" for a subcriterion. */
const ANCHOR_VALUE_PATTERN = /\b(?:0|0\.5|1|1\.5|2)\s*\/\s*2\b/;

/** Fail closed if the research output carries scoring content of any kind. */
export function assertNoScoringContent(output: unknown): void {
  const problems: string[] = [];
  const walk = (value: unknown, at: string): void => {
    if (typeof value === "string") {
      if (ANCHOR_VALUE_PATTERN.test(value)) {
        problems.push(`${at}: states a rubric anchor value ("${value.slice(0, 120)}")`);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${at}[${index}]`));
      return;
    }
    if (value === null || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (SCORING_FIELD_NAMES.includes(key)) {
        problems.push(`${at}.${key}: scoring field in a research output; the research pass never scores`);
      }
      walk(child, `${at}.${key}`);
    }
  };
  walk(output, "<research_output>");
  if (problems.length > 0) throw new ResearchContentError(problems);
}

/**
 * Review-grade forms Protocol §4.6 masks from the scoring view.
 *
 * Narrow on purpose. Substantive verdict prose is explicitly NOT masked, so a
 * pattern that caught ordinary sentences would block legitimate runs; these
 * catch the numeric/aggregate forms the protocol names.
 */
const REVIEW_GRADE_PATTERNS: readonly RegExp[] = [
  /\b\d{1,3}(?:\.\d)?\s*\/\s*(?:5|10|100)\b/,
  /\b\d{1,2}(?:\.\d)?\s*out\s+of\s+(?:5|10)\b/,
  /\b(?:metacritic|metascore|opencritic|user\s+score|critic\s+score|aggregate\s+score)\b/i,
  /★|✩|⭐/,
];

export interface ReviewGradeLeak {
  readonly at: string;
  readonly matched: string;
}

/** Every masked-grade form still present in a value destined for scoring. */
export function findReviewGradeLeaks(value: unknown, at = "<normalized_packet>"): readonly ReviewGradeLeak[] {
  if (typeof value === "string") {
    const leaks: ReviewGradeLeak[] = [];
    for (const pattern of REVIEW_GRADE_PATTERNS) {
      const match = pattern.exec(value);
      if (match) leaks.push({ at, matched: match[0] });
    }
    return leaks;
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findReviewGradeLeaks(item, `${at}[${index}]`));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      findReviewGradeLeaks(child, `${at}.${key}`),
    );
  }
  return [];
}

/**
 * The canonical source order: active sources first, then superseded, each group
 * in UTF-16 code-unit order of source ID.
 *
 * The protocol requires the order to be frozen and hashed (§4.7) but does not
 * define the ordering, so this is a mechanical determinism rule and not a
 * methodology choice: it is total, stable, depends on nothing outside the
 * manifest, and is reproducible from the frozen corpus alone. Record status
 * leads because §14 supersession is the one thing that legitimately changes a
 * source's standing between packets.
 */
export function canonicalSourceOrder(sources: readonly Source[]): readonly string[] {
  const rank = (source: Source) => (source.record_status === "active" ? 0 : 1);
  return [...sources]
    .sort((a, b) => rank(a) - rank(b) || (a.source_id < b.source_id ? -1 : a.source_id > b.source_id ? 1 : 0))
    .map((source) => source.source_id);
}

/**
 * The normalized scoring packet: exactly what a later scoring pass may see.
 *
 * The candidate/rejection log, the collection reason and the completion report
 * are deliberately absent — preregistration §3.2 keeps the candidate log and
 * research commentary out of both scoring contexts.
 */
export function normalizedScoringPacket(options: {
  readonly evaluationScope: EvaluationScope;
  readonly coverageFrames: readonly CoverageFrame[];
  readonly sourceManifest: readonly Source[];
  readonly normalizedCaptures: readonly NormalizedCapture[];
  readonly canonicalSourceOrder: readonly string[];
}): SemanticInput {
  const captures = new Map(
    options.normalizedCaptures.map((capture) => [capture.source_id, capture.normalized_content]),
  );
  // Ordered by the canonical source order so the packet's bytes are a function
  // of the frozen corpus rather than of the model's array order.
  const sources = new Map(options.sourceManifest.map((source) => [source.source_id, source]));
  return {
    evaluation_scope: options.evaluationScope,
    coverage_frames: options.coverageFrames,
    normalized_corpus: options.canonicalSourceOrder.map((sourceId) => ({
      source_id: sourceId,
      record_status: sources.get(sourceId)?.record_status ?? null,
      normalized: captures.get(sourceId) ?? null,
    })),
    canonical_source_order: options.canonicalSourceOrder,
  };
}

/** The wrapper-owned facts a research run manifest records beside the output. */
export interface ResearchManifestFacts {
  readonly run_id: string;
  readonly started_at: string;
  readonly ended_at: string;
  readonly provider: string;
  readonly model_label: string;
  readonly model_snapshot_build_id: string;
  readonly system_instructions_digest: string;
  readonly prompt_template_digest: string;
  readonly rubric_digest: string;
  readonly protocol_digest: string;
  readonly output_schema_digest: string;
  readonly research_tool_access: readonly string[];
  readonly decoding_parameters: RunManifest["decoding_parameters"];
  readonly seed: RunManifest["seed"];
  readonly retry_count: number;
  readonly validation_failures: readonly string[];
  readonly human_corrections: readonly string[];
}

export interface FrozenResearchCorpus {
  readonly corpus: Corpus;
  /** The exact hand-off shape a later paired scoring call consumes. */
  readonly semanticInput: SemanticInput;
  readonly rawPacketDigest: string;
  readonly normalizedPacketDigest: string;
  readonly structuredOutputDigest: string;
  readonly canonicalSourceOrder: readonly string[];
}

/**
 * Deterministically freeze an accepted research output into a canonical corpus.
 *
 * Deterministic in the strict sense: given the same output, the same scope and
 * the same `frozenAt`, every byte and every digest is identical. The only
 * transformations are ordering by the canonical source order and computing
 * digests; no field is defaulted, coerced or repaired.
 *
 * Fails closed on scoring content, unmasked review grades, capture/digest
 * disagreement, and anything the canonical `$defs/corpus` schema rejects.
 */
export function freezeResearchCorpus(options: {
  readonly output: ModelResearchPass;
  readonly evaluationScope: EvaluationScope;
  readonly manifestFacts: ResearchManifestFacts;
  readonly frozenAt: string;
}): FrozenResearchCorpus {
  const { output, evaluationScope, manifestFacts, frozenAt } = options;

  if (!frozenAt.endsWith("Z")) {
    throw new ResearchContentError([
      `frozen_at must be a UTC instant so the evidence cutoff is unambiguous; got "${frozenAt}"`,
    ]);
  }

  assertNoScoringContent(output);

  const problems: string[] = [];

  // Every capture names a manifest source, every source has a capture, and the
  // capture's SHA-256 is the digest the manifest already committed to. A corpus
  // whose digests do not describe its own content is not frozen in any useful
  // sense, so this is checked rather than assumed.
  const captureBySource = new Map<string, string>();
  for (const capture of output.normalized_captures) {
    if (captureBySource.has(capture.source_id)) {
      problems.push(`normalized_captures: duplicate capture for source "${capture.source_id}"`);
    }
    captureBySource.set(capture.source_id, capture.normalized_content);
  }
  const manifestIds = new Set(output.source_manifest.map((source) => source.source_id));
  for (const sourceId of captureBySource.keys()) {
    if (!manifestIds.has(sourceId)) {
      problems.push(`normalized_captures: capture for unknown source "${sourceId}"`);
    }
  }
  for (const source of output.source_manifest) {
    const content = captureBySource.get(source.source_id);
    if (content === undefined) {
      problems.push(`source_manifest[${source.source_id}]: no normalized capture accompanies this source`);
      continue;
    }
    const digest = sha256Hex(Buffer.from(content, "utf8"));
    if (digest !== source.normalized_content_digest) {
      problems.push(
        `source_manifest[${source.source_id}]: normalized_content_digest does not describe the supplied capture`,
      );
    }
  }

  // §4.1 / §8 — every family accounted for exactly once, and the declared
  // collection standard reproduced by the manifest's independent ACTIVE A/B
  // clusters. Both rules are already implemented by the package-level validator;
  // they are applied here too so a corpus that could never pass validation is
  // never frozen and handed to a scoring pass in the first place.
  const families = output.query_family_audit.map((entry) => entry.query_family);
  for (const family of QUERY_FAMILIES) {
    const count = families.filter((candidate) => candidate === family).length;
    if (count !== 1) {
      problems.push(`query_family_audit: family "${family}" appears ${count} times; each of the seven occurs exactly once`);
    }
  }
  const clusters = new Set(
    output.source_manifest
      .filter(
        (source) =>
          source.record_status === "active" &&
          (source.source_tier === "A" || source.source_tier === "B"),
      )
      .map((source) => source.independence_cluster_id),
  );
  const band = COLLECTION_BANDS.get(output.collection_standard);
  if (band && (clusters.size < band.min || (band.max !== null && clusters.size > band.max))) {
    problems.push(
      `collection_standard "${output.collection_standard}" requires ${band.min}${band.max === null ? " or more" : `–${band.max}`} independent active A/B clusters; the manifest has ${clusters.size}`,
    );
  }

  const order = canonicalSourceOrder(output.source_manifest);
  const semanticInput = normalizedScoringPacket({
    evaluationScope,
    coverageFrames: output.coverage_frames,
    sourceManifest: output.source_manifest,
    normalizedCaptures: output.normalized_captures,
    canonicalSourceOrder: order,
  });

  // §4.6 — the scoring view is masked. Only the packet a scoring pass would see
  // is scanned; the candidate log and the archive keep lawful provenance.
  const leaks = findReviewGradeLeaks(semanticInput);
  for (const leak of leaks) {
    problems.push(`${leak.at}: unmasked review grade or aggregate ("${leak.matched}") in the scoring view`);
  }

  if (problems.length > 0) throw new ResearchContentError(problems);

  const rawPacketDigest = canonicalDigest(output as never);
  const normalizedPacketDigest = sha256Hex(canonicalize(semanticInput as never));

  const researchRunManifest: RunManifest = {
    run_id: manifestFacts.run_id,
    role: "research",
    started_at: manifestFacts.started_at,
    ended_at: manifestFacts.ended_at,
    provider: manifestFacts.provider,
    model_label: manifestFacts.model_label,
    model_snapshot_build_id: manifestFacts.model_snapshot_build_id,
    protocol_version: "1.0",
    rubric_version: "1.0",
    package_schema_version: "1.0-draft",
    system_instructions_digest: manifestFacts.system_instructions_digest,
    prompt_template_digest: manifestFacts.prompt_template_digest,
    rubric_digest: manifestFacts.rubric_digest,
    protocol_digest: manifestFacts.protocol_digest,
    output_schema_digest: manifestFacts.output_schema_digest,
    normalized_packet_digest: normalizedPacketDigest,
    canonical_source_order: order,
    research_tool_access: manifestFacts.research_tool_access,
    decoding_parameters: manifestFacts.decoding_parameters,
    seed: manifestFacts.seed,
    retry_count: manifestFacts.retry_count,
    validation_failures: manifestFacts.validation_failures,
    human_corrections: manifestFacts.human_corrections,
    structured_output_digest: rawPacketDigest,
  };

  const corpus: Corpus = {
    research_run_manifest: researchRunManifest,
    collection_standard: output.collection_standard,
    collection_reason: output.collection_reason,
    query_family_audit: output.query_family_audit,
    candidate_source_log: output.candidate_source_log,
    source_manifest: output.source_manifest,
    coverage_frames: output.coverage_frames,
    raw_packet_digest: rawPacketDigest,
    normalized_packet_digest: normalizedPacketDigest,
    canonical_source_order: order,
    review_grades_masked: true,
    frozen_at: frozenAt,
  };

  const validate = validatorFor("/$defs/corpus");
  if (!validate(corpus)) {
    throw new ResearchContentError(
      (validate.errors ?? []).map(
        (error) => `${error.instancePath || "<corpus>"}: ${error.message ?? error.keyword}`,
      ),
    );
  }

  return {
    corpus,
    semanticInput,
    rawPacketDigest,
    normalizedPacketDigest,
    structuredOutputDigest: rawPacketDigest,
    canonicalSourceOrder: order,
  };
}

/**
 * The research completion report the frozen prompt asks for: the model's four
 * narrative items, plus the items the wrapper derives from the frozen corpus.
 * Derived rather than requested so no wrapper fact is taken from the model.
 */
export function researchCompletionReport(
  corpus: Corpus,
  scope: EvaluationScope,
  narrative: ResearchCompletionNarrative,
) {
  const activeAbClusters = new Set(
    corpus.source_manifest
      .filter(
        (source) =>
          source.record_status === "active" &&
          (source.source_tier === "A" || source.source_tier === "B"),
      )
      .map((source) => source.independence_cluster_id),
  );
  return {
    frozen_scope_identifier: scope.scope_key,
    evidence_cutoff: scope.evidence_cutoff,
    collection_standard: corpus.collection_standard,
    independent_active_ab_cluster_count: activeAbClusters.size,
    query_family_completion_state: corpus.query_family_audit.map((entry) => ({
      query_family: entry.query_family,
      disposition: entry.disposition,
    })),
    material_scope_platform_current_state_limitations:
      narrative.material_scope_platform_current_state_limitations,
    credible_disagreement_represented: narrative.credible_disagreement_represented,
    retrospective_evidence_status: narrative.retrospective_evidence_status,
    corpus_frozen_at: corpus.frozen_at,
    raw_packet_digest: corpus.raw_packet_digest,
    normalized_packet_digest: corpus.normalized_packet_digest,
    blocking_concern: narrative.blocking_concern,
  } as const;
}
