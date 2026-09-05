import { canonicalDigest, canonicalize, sha256Hex } from "./canonical-json";
import {
  controlledDigest,
  controlledText,
  verifyControlledInputs,
  type LockManifest,
} from "./controlled-inputs";
import { buildScoringPassSchema, scoringPassSchemaDigest } from "./scoring-pass-contract";

/**
 * The single canonical builder for a Phase 3A scoring request, and the pair
 * invariant checker over what it produces.
 *
 * ADR 0036 §5 requires the paired calls to receive "byte-identical semantic
 * inputs and exposed configuration". The only way to prove that is to have one
 * builder and no second path: primary and audit are produced from the SAME
 * serialized semantic input, and the role is attached beside the request as
 * wrapper metadata rather than being interpolated into it. That is why
 * `buildScoringRequest` takes no role parameter at all — a role cannot leak into
 * the model input through an argument that does not exist.
 */

/** The exact preregistered model. Never the moving `gpt-5.6` alias (ADR 0036 §1). */
export const PREREGISTERED_MODEL = "gpt-5.6-sol";
export const PREREGISTERED_REASONING_EFFORT = "high";
/** Independent, stateless scoring calls (ADR 0036 §3; readiness audit §4). */
export const PREREGISTERED_REASONING_CONTEXT = "current_turn";

export type RunRole = "primary" | "audit";

export interface SemanticInput {
  /**
   * The research transport version this packet was frozen under
   * (`RESEARCH_TRANSPORT_VERSION`).
   *
   * Carried inside the packet rather than beside it so a scoring pass can refuse
   * an incompatible packet on the packet's own bytes. Version 1 projected only
   * `source_id`, `record_status` and the normalized text, which hides the tier,
   * independence cluster and dates the protocol's own admissibility rules decide
   * on; version 2 carries the whole frozen source record.
   */
  readonly packet_version: number;
  /** The frozen evaluation scope, exactly as it will appear in the package. */
  readonly evaluation_scope: unknown;
  /** The frozen criterion coverage frames. */
  readonly coverage_frames: unknown;
  /**
   * The normalized captured corpus, review grades masked. One entry per source
   * in canonical order, each the frozen canonical source record plus its
   * `normalized` capture text.
   */
  readonly normalized_corpus: unknown;
  /** Canonical source order. */
  readonly canonical_source_order: readonly string[];
}

export interface ModelConfiguration {
  readonly model: string;
  readonly reasoning_effort: string;
  readonly reasoning_context: string;
  readonly store: false;
  readonly tools: readonly never[];
  readonly max_output_tokens: number;
  /** Present only when the endpoint exposes a seed. */
  readonly seed?: number;
}

export interface ScoringRequest {
  /** Frozen system/developer instructions — controlled bytes, not a paraphrase. */
  readonly instructions: string;
  /** The canonical scoring prompt plus the serialized semantic payload. */
  readonly input: string;
  readonly configuration: ModelConfiguration;
  /** The model-facing Structured Output contract. */
  readonly response_format: {
    readonly type: "json_schema";
    readonly name: string;
    readonly strict: true;
    readonly schema: Record<string, unknown>;
  };
  /** Digests recorded in the run manifest. */
  readonly digests: {
    readonly system_instructions_digest: string;
    readonly prompt_template_digest: string;
    readonly rubric_digest: string;
    readonly protocol_digest: string;
    readonly output_schema_digest: string;
    readonly normalized_packet_digest: string;
    /** Over the exact semantic request bytes — the drift detector. */
    readonly semantic_request_digest: string;
  };
  /**
   * The derived transport schema's digest.
   *
   * Deliberately NOT `digests.output_schema_digest`: the run manifest's
   * controlled-input digests are defined over the exact Item 3-approved bytes,
   * and the derived scoring-pass schema is a request artefact rather than a
   * controlled input. It is carried here for the local ledger and proof report,
   * and it is already covered by `semantic_request_digest`.
   */
  readonly scoringPassSchemaDigest: string;
  readonly canonical_source_order: readonly string[];
}

export interface BuildOptions {
  readonly semanticInput: SemanticInput;
  readonly maxOutputTokens: number;
  /** Supplied only if the endpoint exposes a seed; omitted otherwise. */
  readonly seed?: number;
  /** Injectable for tests; defaults to verifying the real controlled bytes. */
  readonly lock?: LockManifest;
}

/**
 * Serialize the semantic payload.
 *
 * RFC 8785 canonical form, so two builds of the same input are byte-identical
 * regardless of key insertion order — the property the pair check depends on.
 */
function serializeSemanticInput(input: SemanticInput): string {
  return canonicalize(input as never);
}

/**
 * Build the semantic scoring request. Role-free by construction.
 *
 * Fails closed on controlled-input drift before anything else happens: a request
 * built from unapproved bytes is not a Phase 3A request at all.
 */
export function buildScoringRequest(options: BuildOptions): ScoringRequest {
  const lock = options.lock ?? verifyControlledInputs();
  const passSchema = buildScoringPassSchema();

  const instructions = controlledText("system_instructions");
  const scoringPrompt = controlledText("scoring_prompt");
  const rubric = controlledText("rubric");
  const protocol = controlledText("protocol");

  const payload = serializeSemanticInput(options.semanticInput);
  const normalizedPacketDigest = sha256Hex(payload);

  // One fixed assembly order. Any change here changes every digest, which is the
  // point: the semantic request digest is what makes drift mechanically visible.
  const input = [
    "# Scoring prompt",
    scoringPrompt,
    "# Rubric",
    rubric,
    "# Effective scoring protocol",
    protocol,
    "# Frozen execution payload (RFC 8785 canonical JSON)",
    payload,
  ].join("\n\n");

  const configuration: ModelConfiguration = {
    model: PREREGISTERED_MODEL,
    reasoning_effort: PREREGISTERED_REASONING_EFFORT,
    reasoning_context: PREREGISTERED_REASONING_CONTEXT,
    store: false,
    tools: [],
    max_output_tokens: options.maxOutputTokens,
    ...(options.seed === undefined ? {} : { seed: options.seed }),
  };

  const digests = {
    system_instructions_digest: controlledDigest(lock, "system_instructions"),
    prompt_template_digest: controlledDigest(lock, "scoring_prompt"),
    rubric_digest: controlledDigest(lock, "rubric"),
    protocol_digest: controlledDigest(lock, "protocol"),
    // Gate 6: a run-manifest controlled-input digest is the SHA-256 of the
    // approved canonical package-schema bytes, never of the derived transport
    // schema. See `scoringPassSchemaDigest` below for the latter.
    output_schema_digest: controlledDigest(lock, "output_schema"),
    normalized_packet_digest: normalizedPacketDigest,
    // The seed is excluded: it is the one permitted pair difference, so a digest
    // that included it could never be equal across a legitimate pair.
    semantic_request_digest: canonicalDigest({
      instructions,
      input,
      configuration: { ...configuration, seed: null },
      response_format_schema: passSchema.schema,
    } as never),
  };

  return {
    instructions,
    input,
    configuration,
    response_format: {
      type: "json_schema",
      name: passSchema.name,
      strict: true,
      schema: passSchema.schema,
    },
    digests,
    scoringPassSchemaDigest: scoringPassSchemaDigest(passSchema),
    canonical_source_order: options.semanticInput.canonical_source_order,
  };
}

export interface PairInvariantIssue {
  readonly field: string;
  readonly message: string;
}

/**
 * Prove the pair. Every field ADR 0036 §5 and Protocol §15.1(3) name is compared;
 * a seed, when exposed, is the only difference permitted.
 */
export function checkPairInvariants(
  primary: ScoringRequest,
  audit: ScoringRequest,
): readonly PairInvariantIssue[] {
  const issues: PairInvariantIssue[] = [];
  const equal = (field: string, a: unknown, b: unknown, message: string) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) issues.push({ field, message });
  };

  equal("instructions", primary.instructions, audit.instructions, "system instruction bytes differ");
  equal("input", primary.input, audit.input, "semantic input bytes differ");
  equal(
    "response_format.schema",
    primary.response_format.schema,
    audit.response_format.schema,
    "output contract differs",
  );
  equal(
    "canonical_source_order",
    primary.canonical_source_order,
    audit.canonical_source_order,
    "canonical source order differs",
  );

  for (const field of Object.keys(primary.digests) as (keyof ScoringRequest["digests"])[]) {
    if (primary.digests[field] !== audit.digests[field]) {
      issues.push({ field: `digests.${field}`, message: "digest differs between the pair" });
    }
  }
  if (primary.scoringPassSchemaDigest !== audit.scoringPassSchemaDigest) {
    issues.push({
      field: "scoringPassSchemaDigest",
      message: "transport schema differs between the pair",
    });
  }

  const { seed: primarySeed, ...primaryConfig } = primary.configuration;
  const { seed: auditSeed, ...auditConfig } = audit.configuration;
  equal("configuration", primaryConfig, auditConfig, "exposed configuration differs");

  if (primarySeed !== undefined && auditSeed !== undefined && primarySeed === auditSeed) {
    issues.push({
      field: "configuration.seed",
      message: "an exposed seed must differ between the paired calls (ADR 0036 §5)",
    });
  }
  if ((primarySeed === undefined) !== (auditSeed === undefined)) {
    issues.push({
      field: "configuration.seed",
      message: "one call exposes a seed and the other does not",
    });
  }
  return issues;
}

export class PairInvariantError extends Error {
  constructor(readonly issues: readonly PairInvariantIssue[]) {
    super(
      "Paired scoring requests are not byte-identical:\n" +
        issues.map((issue) => `  ${issue.field}: ${issue.message}`).join("\n"),
    );
    this.name = "PairInvariantError";
  }
}

export function assertPairInvariants(primary: ScoringRequest, audit: ScoringRequest): void {
  const issues = checkPairInvariants(primary, audit);
  if (issues.length > 0) throw new PairInvariantError(issues);
}

/**
 * The seed value a run manifest records: the exposed integer, or the exact
 * sentinel the candidate protocol permits. Never a fabricated number
 * (ADR 0036 §9).
 */
export function manifestSeed(seed: number | undefined): number | "parameter_unavailable" {
  return seed === undefined ? "parameter_unavailable" : seed;
}
