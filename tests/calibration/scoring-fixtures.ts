import { canonicalize, sha256Hex } from "@/lib/calibration/canonical-json";
import { verifyControlledInputs } from "@/lib/calibration/controlled-inputs";
import type { D1ResearchHandoff, D1ScoringRunFacts } from "@/lib/calibration/d1-scoring";
import { PREREGISTERED_MODEL, type SemanticInput } from "@/lib/calibration/request-builder";
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

export function semanticInput(overrides: Partial<SemanticInput> = {}): SemanticInput {
  return {
    evaluation_scope: freezeD1EvaluationScope(EVIDENCE_CUTOFF),
    coverage_frames: FIXTURE_CORPUS.coverage_frames,
    normalized_corpus: FIXTURE_CORPUS.canonical_source_order.map((sourceId) => ({
      source_id: sourceId,
      record_status: "active",
      normalized: `Placeholder normalized capture text for ${sourceId}.`,
    })),
    canonical_source_order: FIXTURE_CORPUS.canonical_source_order,
    ...overrides,
  };
}

/**
 * A slice-B handoff, assembled exactly as slice B writes it: the packet, the
 * corpus that commits to its digest and the receipt that records the controlled
 * lock it was frozen under.
 */
export function buildHandoff(options: { readonly semanticInput?: SemanticInput; readonly digest?: string } = {}): D1ResearchHandoff {
  const input = options.semanticInput ?? semanticInput();
  const digest = options.digest ?? sha256Hex(canonicalize(input as never));
  const lock = verifyControlledInputs();
  return {
    semanticInput: input,
    corpus: {
      research_run_manifest: { run_id: "d1-research-fixture" },
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
