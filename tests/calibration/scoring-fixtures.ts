import { canonicalize, sha256Hex } from "@/lib/calibration/canonical-json";
import { verifyControlledInputs } from "@/lib/calibration/controlled-inputs";
import type { D1ResearchHandoff, D1ScoringRunFacts } from "@/lib/calibration/d1-scoring";
import { PREREGISTERED_MODEL, type SemanticInput } from "@/lib/calibration/request-builder";
import { RESEARCH_TRANSPORT_VERSION } from "@/lib/calibration/research-pass";
import { freezeD1EvaluationScope } from "@/lib/calibration/run-input";
import type { ModelScoringPass } from "@/lib/calibration/scoring-pass-contract";
import type { Corpus } from "@/lib/calibration/package-types";
import { buildValidPackage } from "./fixtures";

/**
 * Shared synthetic slice-C scoring fixtures.
 *
 * Every fixture is synthetic: the frozen "corpus" is the harness's own
 * placeholder package and the "captures" say nothing about any product. Nothing
 * here encodes a scoring judgment.
 */

export const FROZEN_AT = "2026-09-04T12:00:00Z";
export const EVIDENCE_CUTOFF = "2026-09-04";

export const FIXTURE = buildValidPackage();
export const FIXTURE_CORPUS = FIXTURE.scoring_content.corpus;

/** The model-owned half of a pass: exactly what the transport schema returns. */
export function modelOutput(role: "primary" | "audit"): ModelScoringPass {
  const pass = role === "primary" ? FIXTURE.scoring_content.primary_pass : FIXTURE.scoring_content.audit_pass;
  return JSON.parse(JSON.stringify({ claim_ledger: pass.claim_ledger, decisions: pass.decisions }));
}

/** The placeholder capture text a fixture source's frozen digest commits to. */
export const CAPTURE_TEXT = (sourceId: string) =>
  `Placeholder normalized capture text for ${sourceId}.`;

/**
 * The frozen source manifest as slice B would have assembled it: the fixture
 * package's own source records, with each `normalized_content_digest` computed —
 * by the WRAPPER, which is what this fixture stands in for — over the exact
 * UTF-8 bytes of that source's capture.
 */
export const FIXTURE_SOURCES = FIXTURE_CORPUS.source_manifest.map((source) => ({
  ...source,
  raw_content_digest: null,
  normalized_content_digest: sha256Hex(Buffer.from(CAPTURE_TEXT(source.source_id), "utf8")),
}));

export function semanticInput(overrides: Partial<SemanticInput> = {}): SemanticInput {
  const sources = new Map(FIXTURE_SOURCES.map((source) => [source.source_id, source]));
  return {
    packet_version: RESEARCH_TRANSPORT_VERSION,
    evaluation_scope: freezeD1EvaluationScope(EVIDENCE_CUTOFF),
    coverage_frames: FIXTURE_CORPUS.coverage_frames,
    normalized_corpus: FIXTURE_CORPUS.canonical_source_order.map((sourceId) => ({
      ...sources.get(sourceId)!,
      normalized: CAPTURE_TEXT(sourceId),
    })),
    canonical_source_order: FIXTURE_CORPUS.canonical_source_order,
    ...overrides,
  };
}

/**
 * One frozen source, bound the way slice B binds it: the manifest record whose
 * `normalized_content_digest` is the SHA-256 of the capture's exact UTF-8 bytes,
 * and the packet entry that carries that record beside the capture itself.
 */
export function frozenSource(
  source: Record<string, unknown>,
  normalized: string,
): { readonly manifest: Record<string, unknown>; readonly entry: Record<string, unknown> } {
  const manifest = {
    ...FIXTURE_SOURCES[0],
    ...source,
    raw_content_digest: null,
    normalized_content_digest: sha256Hex(Buffer.from(normalized, "utf8")),
  };
  return { manifest, entry: { ...manifest, normalized } };
}

/**
 * A handoff over an arbitrary synthetic corpus, bound end to end.
 *
 * Slice C re-derives every capture digest against the frozen manifest, so a test
 * that wants to exercise a LATER gate has to hand it a packet that is actually
 * bound — otherwise the binding gate refuses first and the test proves nothing
 * about the gate it meant to reach.
 */
export function boundHandoff(
  entries: readonly { readonly source: Record<string, unknown>; readonly normalized: string }[],
  overrides: Partial<SemanticInput> = {},
): D1ResearchHandoff {
  const frozen = entries.map((entry) => frozenSource(entry.source, entry.normalized));
  const order = frozen.map((source) => String(source.manifest.source_id));
  return buildHandoff({
    semanticInput: semanticInput({
      normalized_corpus: frozen.map((source) => source.entry),
      canonical_source_order: order,
      ...overrides,
    }),
    sourceManifest: frozen.map((source) => source.manifest),
  });
}

/**
 * A slice-B handoff, assembled exactly as slice B writes it: the packet, the
 * corpus that commits to its digest and the receipt that records the controlled
 * lock it was frozen under.
 */
export function buildHandoff(
  options: {
    readonly semanticInput?: SemanticInput;
    readonly digest?: string;
    readonly sourceManifest?: readonly Record<string, unknown>[];
  } = {},
): D1ResearchHandoff {
  const input = options.semanticInput ?? semanticInput();
  const digest = options.digest ?? sha256Hex(canonicalize(input as never));
  const lock = verifyControlledInputs();
  return {
    semanticInput: input,
    corpus: {
      research_run_manifest: { run_id: "d1-research-fixture" },
      // The frozen manifest the packet is bound to: slice C re-derives every
      // capture digest against these records before a paired call is spent.
      source_manifest: options.sourceManifest ?? FIXTURE_SOURCES,
      canonical_source_order: input.canonical_source_order,
      normalized_packet_digest: digest,
      review_grades_masked: true,
      frozen_at: FROZEN_AT,
    } as unknown as Corpus,
    receipt: {
      run_id: "d1-research-fixture",
      role: "research",
      frozen_at: FROZEN_AT,
      evidence_cutoff: EVIDENCE_CUTOFF,
      controlled_inputs: lock,
      digests: { normalized_packet_digest: digest },
      receipt_digest: "0".repeat(64),
    },
  };
}

export const FACTS: D1ScoringRunFacts = {
  started_at: "2026-09-04T12:10:00Z",
  ended_at: "2026-09-04T12:24:00Z",
  api_elapsed_ms: 840_000,
  returned_model: PREREGISTERED_MODEL,
  response_id: "resp_fixture",
  snapshot_identifier: null,
  token_usage: { input_tokens: 100, output_tokens: 200 },
  attempt: 1,
};
