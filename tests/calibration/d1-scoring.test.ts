import { describe, expect, it } from "vitest";
import { canonicalize, sha256Hex } from "@/lib/calibration/canonical-json";
import { verifyControlledInputs } from "@/lib/calibration/controlled-inputs";
import { HoldoutIsolationError } from "@/lib/calibration/holdout-isolation";
import {
  DEFERRED_VALIDATION_FAMILIES,
  ScoringHandoffError,
  buildD1PairReceipt,
  buildD1ScoringManifest,
  buildD1ScoringPair,
  completeD1ScoringPass,
  runD1ScoringPass,
  validateD1ScoringPass,
  type D1ResearchHandoff,
  type D1ScoringRunFacts,
} from "@/lib/calibration/d1-scoring";
import { PREREGISTERED_MODEL, type SemanticInput } from "@/lib/calibration/request-builder";
import { freezeD1EvaluationScope } from "@/lib/calibration/run-input";
import type { ModelScoringPass } from "@/lib/calibration/scoring-pass-contract";
import type { Corpus } from "@/lib/calibration/package-types";
import { buildValidPackage } from "./fixtures";

/**
 * Slice C — the isolated paired primary/audit scoring transport.
 *
 * Every fixture here is synthetic. The frozen "corpus" is the harness's own
 * placeholder package, the "captures" say nothing about any product, and no
 * assertion in this file encodes a scoring judgment: the tests prove transport
 * invariants — pair identity, isolation, drift refusal, role ordering,
 * determinism and fail-closed validation — and nothing about what a score is.
 */

const FROZEN_AT = "2026-09-04T12:00:00Z";
const EVIDENCE_CUTOFF = "2026-09-04";

const FIXTURE = buildValidPackage();
const FIXTURE_CORPUS = FIXTURE.scoring_content.corpus;

/** The model-owned half of a pass: exactly what the transport schema returns. */
function modelOutput(role: "primary" | "audit"): ModelScoringPass {
  const pass = role === "primary" ? FIXTURE.scoring_content.primary_pass : FIXTURE.scoring_content.audit_pass;
  return JSON.parse(JSON.stringify({ claim_ledger: pass.claim_ledger, decisions: pass.decisions }));
}

function semanticInput(overrides: Partial<SemanticInput> = {}): SemanticInput {
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
function buildHandoff(options: { readonly semanticInput?: SemanticInput; readonly digest?: string } = {}): D1ResearchHandoff {
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

const FACTS: D1ScoringRunFacts = {
  started_at: "2026-09-04T12:10:00Z",
  ended_at: "2026-09-04T12:24:00Z",
  api_elapsed_ms: 840_000,
  returned_model: PREREGISTERED_MODEL,
  response_id: "resp_fixture",
  snapshot_identifier: null,
  token_usage: { input_tokens: 100, output_tokens: 200 },
  attempt: 1,
};

/** A `fetch` that records every call and answers with one canned response. */
function stubFetch(body: unknown, options: { readonly ok?: boolean; readonly status?: number } = {}) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const impl = (async (url: unknown, init: unknown) => {
    const request = init as { body: string };
    calls.push({ url: String(url), body: JSON.parse(request.body) as Record<string, unknown> });
    return {
      ok: options.ok ?? true,
      status: options.status ?? 200,
      json: async () => body,
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

function okResponse(output: ModelScoringPass) {
  return { model: PREREGISTERED_MODEL, id: "resp_fixture", output_text: JSON.stringify(output) };
}

describe("pair identity (ADR 0036 §5, preregistration §4.1)", () => {
  it("builds primary and audit from one frozen packet with byte-identical inputs", () => {
    const pair = buildD1ScoringPair({ handoff: buildHandoff() });
    expect(pair.primary.instructions).toBe(pair.audit.instructions);
    expect(pair.primary.input).toBe(pair.audit.input);
    expect(pair.primary.configuration).toEqual(pair.audit.configuration);
    expect(pair.primary.digests).toEqual(pair.audit.digests);
    expect(pair.primary.response_format.schema).toEqual(pair.audit.response_format.schema);
    expect(pair.pairIssues).toEqual([]);
    expect(pair.pairId).toBe(`d1-scoring-${pair.semanticRequestDigest.slice(0, 24)}`);
  });

  it("binds the request's normalized packet digest to the frozen corpus digest", () => {
    const handoff = buildHandoff();
    const pair = buildD1ScoringPair({ handoff });
    expect(pair.primary.digests.normalized_packet_digest).toBe(
      handoff.corpus.normalized_packet_digest,
    );
  });

  it("permits differing exposed seeds and nothing else", () => {
    const pair = buildD1ScoringPair({
      handoff: buildHandoff(),
      seeds: { primary: 11, audit: 12 },
    });
    expect(pair.primary.configuration.seed).toBe(11);
    expect(pair.audit.configuration.seed).toBe(12);
    expect(pair.pairIssues).toEqual([]);
    expect(pair.primary.digests.semantic_request_digest).toBe(
      pair.audit.digests.semantic_request_digest,
    );
  });

  it("refuses a pair whose exposed seeds are identical", () => {
    expect(() =>
      buildD1ScoringPair({ handoff: buildHandoff(), seeds: { primary: 7, audit: 7 } }),
    ).toThrow(/seed/i);
  });

  it("records the byte-identity proof in the pair receipt", () => {
    const pair = buildD1ScoringPair({ handoff: buildHandoff() });
    const receipt = buildD1PairReceipt({ pair, primary: null, audit: null });
    expect(receipt.pair_proof.instructions_identical).toBe(true);
    expect(receipt.pair_proof.semantic_input_identical).toBe(true);
    expect(receipt.pair_proof.output_contract_identical).toBe(true);
    expect(receipt.pair_proof.semantic_request_digests_equal).toBe(true);
    expect(receipt.pair_proof.outstanding_issues).toEqual([]);
    // Neither pass ran, so the pair cannot count.
    expect(receipt.pair_counts).toBe(false);
    expect(receipt.blocking_reasons.join(" ")).toMatch(/primary pass did not complete/);
  });
});

describe("isolation: no tools, no research context, no linkage (ADR 0036 §§3, 6; §3.2)", () => {
  it("sends an outbound body with no tools, no state and the pinned reasoning context", async () => {
    const pair = buildD1ScoringPair({ handoff: buildHandoff() });
    const fetchStub = stubFetch(okResponse(modelOutput("primary")));
    const result = await runD1ScoringPass({
      request: pair.primary,
      apiKey: "test-key",
      fetchImpl: fetchStub.impl,
    });
    expect(result.ok).toBe(true);
    expect(fetchStub.calls).toHaveLength(1);
    const body = fetchStub.calls[0]!.body;
    expect(body.model).toBe(PREREGISTERED_MODEL);
    expect(body.tools).toEqual([]);
    expect(body.store).toBe(false);
    expect((body.reasoning as Record<string, unknown>).context).toBe("current_turn");
    expect((body.reasoning as Record<string, unknown>).effort).toBe("high");
    expect(body.previous_response_id).toBeUndefined();
    expect(body.conversation).toBeUndefined();
    expect(body.max_output_tokens).toBe(64_000);
  });

  it("carries no research context in the model input", () => {
    const pair = buildD1ScoringPair({ handoff: buildHandoff() });
    // The frozen prompt and protocol are controlled bytes and are sent verbatim,
    // so the assertion is about the PAYLOAD: the serialized packet holds exactly
    // the four semantic members and none of the research view.
    const payload = pair.primary.input.split("# Frozen execution payload (RFC 8785 canonical JSON)\n\n")[1]!;
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual([
      "canonical_source_order",
      "coverage_frames",
      "evaluation_scope",
      "normalized_corpus",
    ]);
    for (const forbidden of ["candidate_source_log", "collection_reason", "research_completion_report", "query_family_audit"]) {
      expect(payload).not.toContain(forbidden);
    }
  });

  it("refuses a packet that reintroduces the research view", () => {
    const leaked = semanticInput({
      normalized_corpus: [{ source_id: "src-ab-1", candidate_source_log: ["cand-1"] }],
    });
    expect(() => buildD1ScoringPair({ handoff: buildHandoff({ semanticInput: leaked }) })).toThrow(
      ScoringHandoffError,
    );
    try {
      buildD1ScoringPair({ handoff: buildHandoff({ semanticInput: leaked }) });
    } catch (error) {
      expect((error as ScoringHandoffError).problems.join(" ")).toMatch(/candidate_source_log/);
    }
  });

  it("refuses a packet carrying an unmasked review grade", () => {
    const graded = semanticInput({
      normalized_corpus: [{ source_id: "src-ab-1", normalized: "The outlet scored it 9/10 overall." }],
    });
    expect(() => buildD1ScoringPair({ handoff: buildHandoff({ semanticInput: graded }) })).toThrow(
      /unmasked review grade/,
    );
  });

  it("records the scoring pass as tool-free in the run manifest", () => {
    const pair = buildD1ScoringPair({ handoff: buildHandoff() });
    const manifest = buildD1ScoringManifest({
      pair,
      request: pair.primary,
      role: "primary",
      output: modelOutput("primary"),
      facts: FACTS,
    });
    expect(manifest.research_tool_access).toEqual([]);
    expect(manifest.decoding_parameters).toContainEqual({ name: "tools", value: "none" });
    expect(manifest.decoding_parameters).toContainEqual({ name: "reasoning_context", value: "current_turn" });
  });
});

describe("holdout exclusion (preregistration §3.1)", () => {
  it("fails closed when a holdout identity reaches the scoring view", () => {
    const leaked = semanticInput({
      normalized_corpus: [
        { source_id: "src-ab-1", normalized: "A comparison piece discussing Kingdom Come: Deliverance II." },
      ],
    });
    expect(() => buildD1ScoringPair({ handoff: buildHandoff({ semanticInput: leaked }) })).toThrow(
      HoldoutIsolationError,
    );
  });

  it("reports — never edits — holdout mentions inside the locked Item 3 bytes", () => {
    const pair = buildD1ScoringPair({ handoff: buildHandoff() });
    expect(pair.isolation.holdout_material_supplied).toBe(false);
    for (const report of pair.isolation.controlled_byte_mentions) {
      expect(report.mentions.length).toBeGreaterThan(0);
      // Disclosed in the receipt, and the bytes on disk are untouched.
      expect(report.path).toMatch(/^docs\//);
    }
  });
});

describe("drift is refused before any call is spent", () => {
  it("refuses a semantic input that does not hash to the frozen corpus digest", async () => {
    const handoff = buildHandoff({ digest: "f".repeat(64) });
    const fetchStub = stubFetch(okResponse(modelOutput("primary")));
    expect(() => buildD1ScoringPair({ handoff })).toThrow(ScoringHandoffError);
    expect(fetchStub.calls).toHaveLength(0);
  });

  it("refuses when the research receipt and the corpus disagree about the digest", () => {
    const handoff = buildHandoff();
    const drifted: D1ResearchHandoff = {
      ...handoff,
      receipt: { ...handoff.receipt, digests: { normalized_packet_digest: "a".repeat(64) } },
    };
    expect(() => buildD1ScoringPair({ handoff: drifted })).toThrow(/disagree about the normalized packet digest/);
  });

  it("refuses when the controlled bytes changed since the corpus was frozen", () => {
    const handoff = buildHandoff();
    const lock = handoff.receipt.controlled_inputs;
    const drifted: D1ResearchHandoff = {
      ...handoff,
      receipt: {
        ...handoff.receipt,
        controlled_inputs: { ...lock, lock_set_digest: "b".repeat(64) },
      },
    };
    expect(() => buildD1ScoringPair({ handoff: drifted })).toThrow(/controlled-input lock drift/);
  });

  it("refuses a mutated evaluation scope, including a dropped DLC exclusion", () => {
    const scope = freezeD1EvaluationScope(EVIDENCE_CUTOFF);
    const mutated = semanticInput({ evaluation_scope: { ...scope, known_exclusions: ["Night Springs"] } });
    expect(() => buildD1ScoringPair({ handoff: buildHandoff({ semanticInput: mutated }) })).toThrow(
      /evaluation_scope is not the frozen D1 scope/,
    );
  });

  it("refuses a canonical source order that differs from the frozen corpus order", () => {
    const handoff = buildHandoff();
    const reordered: SemanticInput = {
      ...handoff.semanticInput,
      canonical_source_order: [...handoff.semanticInput.canonical_source_order].reverse(),
    };
    // Rehashed so the digest gate passes and the order gate is what fires.
    const drifted: D1ResearchHandoff = {
      ...handoff,
      semanticInput: reordered,
      corpus: {
        ...handoff.corpus,
        normalized_packet_digest: sha256Hex(canonicalize(reordered as never)),
      } as Corpus,
      receipt: {
        ...handoff.receipt,
        digests: { normalized_packet_digest: sha256Hex(canonicalize(reordered as never)) },
      },
    };
    expect(() => buildD1ScoringPair({ handoff: drifted })).toThrow(/canonical source order/);
  });

  it("refuses an unmasked corpus", () => {
    const handoff = buildHandoff();
    const drifted: D1ResearchHandoff = {
      ...handoff,
      corpus: { ...handoff.corpus, review_grades_masked: false } as Corpus,
    };
    expect(() => buildD1ScoringPair({ handoff: drifted })).toThrow(/review_grades_masked/);
  });
});

describe("the run role is assigned only after model output (§4.2)", () => {
  it("keeps the role out of both requests entirely", () => {
    const pair = buildD1ScoringPair({ handoff: buildHandoff() });
    for (const request of [pair.primary, pair.audit]) {
      expect(Object.keys(request.configuration)).not.toContain("role");
      const payload = request.input.split("# Frozen execution payload (RFC 8785 canonical JSON)\n\n")[1]!;
      expect(payload).not.toContain("primary");
      expect(payload).not.toContain("audit");
    }
  });

  it("introduces the role for the first time in the manifest built from the output", () => {
    const pair = buildD1ScoringPair({ handoff: buildHandoff() });
    const output = modelOutput("primary");
    const primary = buildD1ScoringManifest({ pair, request: pair.primary, role: "primary", output, facts: FACTS });
    const audit = buildD1ScoringManifest({ pair, request: pair.audit, role: "audit", output, facts: FACTS });
    expect(primary.role).toBe("primary");
    expect(audit.role).toBe("audit");
    // Role metadata does not alter the paired semantic inputs.
    expect(primary.normalized_packet_digest).toBe(audit.normalized_packet_digest);
    expect(primary.canonical_source_order).toEqual(audit.canonical_source_order);
    expect(primary.run_id).not.toBe(audit.run_id);
  });
});

describe("validation reports and fails closed; it never repairs (§9.1, §4.3)", () => {
  it("accepts a structurally and pass-scoped valid output", () => {
    const handoff = buildHandoff();
    const pair = buildD1ScoringPair({ handoff });
    const result = completeD1ScoringPass({
      pair,
      handoff,
      role: "primary",
      output: modelOutput("primary"),
      facts: FACTS,
    });
    expect(result.validation.issues).toEqual([]);
    expect(result.validation.valid).toBe(true);
    expect(result.receipt.validation_failures).toEqual([]);
    expect(result.receipt.human_corrections).toEqual([]);
    expect(result.receipt.validation.deferred_to_package_assembly).toEqual(DEFERRED_VALIDATION_FAMILIES);
  });

  it("reports a missing decision rather than filling one in", () => {
    const handoff = buildHandoff();
    const pair = buildD1ScoringPair({ handoff });
    const output = modelOutput("primary");
    const truncated: ModelScoringPass = {
      claim_ledger: output.claim_ledger,
      decisions: output.decisions.slice(1),
    };
    const result = completeD1ScoringPass({ pair, handoff, role: "primary", output: truncated, facts: FACTS });
    expect(result.validation.valid).toBe(false);
    expect(result.validation.issues.some((issue) => issue.family === "decision_set")).toBe(true);
    // Reported, not repaired: the pass still holds exactly what the model returned.
    expect(result.pass.decisions).toHaveLength(truncated.decisions.length);
  });

  it("recomputes coverage state from the frozen frame rather than trusting the assertion", () => {
    const handoff = buildHandoff();
    const pair = buildD1ScoringPair({ handoff });
    const output = modelOutput("primary");
    const first = output.decisions[0]!;
    const mutated: ModelScoringPass = {
      claim_ledger: output.claim_ledger,
      decisions: [
        {
          ...first,
          // The frame's fourth unit is `materially_limiting`, so missing it can
          // only derive `materially_limited` — while the decision still claims
          // `full`.
          coverage_observed_unit_ids: first.coverage_observed_unit_ids.slice(0, 3),
          coverage_missing_unit_ids: [first.coverage_observed_unit_ids[3]!],
        },
        ...output.decisions.slice(1),
      ],
    };
    const result = completeD1ScoringPass({ pair, handoff, role: "primary", output: mutated, facts: FACTS });
    expect(
      result.validation.issues.some(
        (issue) => issue.family === "coverage_derivation" && /materially_limited/.test(issue.message),
      ),
    ).toBe(true);
  });

  it("reports a claim reference that resolves to nothing in this pass's ledger", () => {
    const handoff = buildHandoff();
    const pair = buildD1ScoringPair({ handoff });
    const output = modelOutput("primary");
    const first = output.decisions[0]!;
    const mutated: ModelScoringPass = {
      claim_ledger: output.claim_ledger,
      decisions: [{ ...first, claim_ids: ["audit-claim-that-does-not-exist-here"] }, ...output.decisions.slice(1)],
    };
    const result = validateD1ScoringPass({
      pass: {
        run_manifest: buildD1ScoringManifest({ pair, request: pair.primary, role: "primary", output: mutated, facts: FACTS }),
        claim_ledger: mutated.claim_ledger,
        decisions: mutated.decisions,
      },
      semanticInput: handoff.semanticInput,
      corpus: handoff.corpus,
      output: mutated,
      role: "primary",
    });
    expect(
      result.issues.some(
        (issue) => issue.family === "reference_integrity" && /resolves to no claim/.test(issue.message),
      ),
    ).toBe(true);
  });

  it("blocks the pair when either pass fails validation", () => {
    const handoff = buildHandoff();
    const pair = buildD1ScoringPair({ handoff });
    const output = modelOutput("primary");
    const clean = completeD1ScoringPass({ pair, handoff, role: "primary", output, facts: FACTS });
    const broken = completeD1ScoringPass({
      pair,
      handoff,
      role: "audit",
      output: { claim_ledger: [], decisions: modelOutput("audit").decisions },
      facts: FACTS,
    });
    const receipt = buildD1PairReceipt({ pair, primary: clean, audit: broken });
    expect(receipt.pair_counts).toBe(false);
    expect(receipt.blocking_reasons.some((reason) => reason.startsWith("audit validation:"))).toBe(true);
    expect(receipt.primary?.valid).toBe(true);
  });

  it("counts a pair only when both passes validate cleanly", () => {
    const handoff = buildHandoff();
    const pair = buildD1ScoringPair({ handoff });
    const primary = completeD1ScoringPass({ pair, handoff, role: "primary", output: modelOutput("primary"), facts: FACTS });
    const audit = completeD1ScoringPass({ pair, handoff, role: "audit", output: modelOutput("audit"), facts: FACTS });
    const receipt = buildD1PairReceipt({ pair, primary, audit });
    expect(receipt.pair_counts).toBe(true);
    expect(receipt.blocking_reasons).toEqual([]);
  });
});

describe("execution facts, retries and determinism", () => {
  it("makes exactly one request per attempt and never retries silently (§9.1)", async () => {
    const pair = buildD1ScoringPair({ handoff: buildHandoff() });
    const fetchStub = stubFetch({ error: { type: "server_error", message: "upstream failure" } }, { ok: false, status: 500 });
    const result = await runD1ScoringPass({ request: pair.primary, apiKey: "test-key", fetchImpl: fetchStub.impl });
    expect(fetchStub.calls).toHaveLength(1);
    expect(result.ok).toBe(false);
    expect(result.output).toBeNull();
    expect(result.error_class).toBe("server_error");
  });

  it("refuses an output whose returned model is not the preregistered identity (ADR 0036 §8)", async () => {
    const pair = buildD1ScoringPair({ handoff: buildHandoff() });
    const fetchStub = stubFetch({
      model: "gpt-5.6",
      id: "resp_fixture",
      output_text: JSON.stringify(modelOutput("primary")),
    });
    const result = await runD1ScoringPass({ request: pair.primary, apiKey: "test-key", fetchImpl: fetchStub.impl });
    expect(result.ok).toBe(false);
    expect(result.error_class).toBe("ExecutionContractError");
    expect(result.output).toBeNull();
    // The facts of the failed attempt survive; a failed attempt is evidence.
    expect(result.facts.returned_model).toBe("gpt-5.6");
  });

  it("produces the same receipt digest for the same pair, output and facts", () => {
    const handoff = buildHandoff();
    const pair = buildD1ScoringPair({ handoff });
    const once = completeD1ScoringPass({ pair, handoff, role: "primary", output: modelOutput("primary"), facts: FACTS });
    const again = completeD1ScoringPass({ pair, handoff, role: "primary", output: modelOutput("primary"), facts: FACTS });
    expect(again.receipt.receipt_digest).toBe(once.receipt.receipt_digest);
    expect(again.manifest.structured_output_digest).toBe(once.manifest.structured_output_digest);
  });

  it("gives the two roles different receipts over the same request bytes", () => {
    const handoff = buildHandoff();
    const pair = buildD1ScoringPair({ handoff });
    const primary = completeD1ScoringPass({ pair, handoff, role: "primary", output: modelOutput("primary"), facts: FACTS });
    const audit = completeD1ScoringPass({ pair, handoff, role: "audit", output: modelOutput("audit"), facts: FACTS });
    expect(audit.receipt.receipt_digest).not.toBe(primary.receipt.receipt_digest);
    expect(audit.receipt.digests.semantic_request_digest).toBe(primary.receipt.digests.semantic_request_digest);
    expect(audit.receipt.scoring_tool_access).toEqual([]);
    expect(audit.receipt.isolation.role_assigned_after_output).toBe(true);
  });

  it("never fabricates a seed", () => {
    const handoff = buildHandoff();
    const pair = buildD1ScoringPair({ handoff });
    const primary = completeD1ScoringPass({ pair, handoff, role: "primary", output: modelOutput("primary"), facts: FACTS });
    expect(primary.manifest.seed).toBe("parameter_unavailable");
    expect(JSON.stringify(pair.primary.configuration)).not.toContain("seed");
  });
});
