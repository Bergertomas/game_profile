import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildD1ResearchRequest,
  freezeD1Research,
  EVIDENCE_SOP_PATH,
  type D1ResearchRunFacts,
} from "@/lib/calibration/d1-research";
import {
  assertResearchExecutionContract,
  buildResearchPassSchema,
  canonicalSourceOrder,
  freezeResearchCorpus,
  toResearchRequestBody,
  MODEL_OWNED_CORPUS_FIELDS,
  ResearchContentError,
  type ModelResearchPass,
} from "@/lib/calibration/research-pass";
import {
  ControlledInputDriftError,
  controlledDigest,
  controlledText,
  lockControlledInputs,
  verifyControlledInputs,
} from "@/lib/calibration/controlled-inputs";
import {
  assertExecutionContract,
  ExecutionContractError,
  type RequestShape,
} from "@/lib/calibration/openai-client";
import { buildScoringRequest } from "@/lib/calibration/request-builder";
import { canonicalize } from "@/lib/calibration/canonical-json";
import { validatorFor } from "@/lib/calibration/package-schema";
import {
  HOLDOUT_IDENTITIES,
  HoldoutIsolationError,
  assertNoHoldoutExposure,
  findHoldoutMentions,
} from "@/lib/calibration/holdout-isolation";
import { D1_RUN_INPUT, freezeD1EvaluationScope } from "@/lib/calibration/run-input";

/**
 * A synthetic research output. It describes no real game: every locator is a
 * fake domain and no capture asserts anything about Alan Wake 2 or any other
 * product. It exists to exercise the freeze's mechanics, and nothing in it is
 * evidence about a calibration game.
 */
const CAPTURE_TEXT = (index: number) =>
  `Placeholder normalized capture number ${index}. It records a concrete observation with no grade, badge or ranking label.`;

function sha256(text: string): string {
  return createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");
}

/** Eight independent active A/B clusters — the §4.1 normal AA/AAA target. */
function buildResearchOutput(): ModelResearchPass {
  const sources = Array.from({ length: 8 }, (_unused, index) => {
    const number = index + 1;
    return {
      source_id: `src-${number}`,
      record_status: "active" as const,
      title: `Placeholder substantive source ${number}`,
      author_creator: `Author ${number}`,
      publisher_channel: `Outlet ${number}`,
      locator: `https://example.invalid/source-${number}`,
      durable_identifier: null,
      publication_date: "2024-03-01",
      accessed_at: "2026-09-04T00:00:00Z",
      source_class: index % 2 === 0 ? "critical_review" : "specialist_creator",
      source_tier: index % 2 === 0 ? ("A" as const) : ("B" as const),
      independence_cluster_id: `cluster-${number}`,
      platform_build_scope: "placeholder platform, current patched build",
      play_completion_scope: "full campaign",
      sponsorship_access_disclosure: "none disclosed",
      dependency_note: "original reporting",
      limitations: [],
      player_signal_sampling: null,
      raw_content_digest: null,
      normalized_content_digest: sha256(CAPTURE_TEXT(number)),
    };
  });

  return {
    collection_standard: "normal_target",
    collection_reason: "Placeholder released scope with ordinary evidence availability.",
    query_family_audit: [
      "title_edition",
      "full_game",
      "platform_technical",
      "late_game_endgame",
      "specialist",
      "major_patches",
      "material_disagreement",
    ].map((family) => ({
      query_family: family,
      disposition: "run" as const,
      reason: "Placeholder family run to saturation.",
    })),
    candidate_source_log: [
      {
        candidate_id: "cand-1",
        query_family: "full_game",
        query_text: "placeholder full game assessment query",
        service: "web_search",
        searched_at: "2026-09-04T00:00:00Z",
        result_position: 1,
        locator: "https://example.invalid/source-1",
        disposition: "accepted" as const,
        reason: "Placeholder acceptance reason.",
      },
      {
        candidate_id: "cand-2",
        query_family: "specialist",
        query_text: "placeholder specialist query",
        service: "web_search",
        searched_at: "2026-09-04T00:00:00Z",
        result_position: 4,
        locator: "https://example.invalid/rejected",
        disposition: "rejected" as const,
        reason: "Placeholder rejection reason under the screening rules.",
      },
    ],
    source_manifest: sources,
    coverage_frames: ["story_hook", "memory_residue"].map((key) => ({
      coverage_frame_id: `frame-${key}`,
      subcriterion_key: key,
      coverage_units: ["opening", "early", "middle", "late"].map((label, index) => ({
        unit_id: `${key}-u${index + 1}`,
        label,
        unit_class: "temporal_stratum" as const,
        centrality: index === 3 ? ("central" as const) : ("noncentral" as const),
        omission_effect:
          index === 3 ? ("materially_limiting" as const) : ("bounding" as const),
      })),
    })),
    normalized_captures: sources.map((source, index) => ({
      source_id: source.source_id,
      normalized_content: CAPTURE_TEXT(index + 1),
    })),
    research_completion_report: {
      material_scope_platform_current_state_limitations: "Placeholder limitation note.",
      credible_disagreement_represented: "Placeholder disagreement note.",
      retrospective_evidence_status: "Placeholder dated retrospective coverage note.",
      blocking_concern: null,
    },
  } as ModelResearchPass;
}

const ELIGIBLE = {
  evaluationMaturity: "mature" as const,
  profileStabilityState: "bounded_change" as const,
  materialProfileShapingChangesInFlight: [] as readonly string[],
};

const REVIEWED_AT = "2026-09-04T06:00:00Z";

const FACTS: D1ResearchRunFacts = {
  started_at: "2026-09-04T06:05:00Z",
  ended_at: "2026-09-04T06:12:00Z",
  api_elapsed_ms: 420_000,
  returned_model: "gpt-5.6-sol",
  response_id: "resp_placeholder",
  snapshot_identifier: null,
  token_usage: { input_tokens: 100, output_tokens: 200 },
  attempt: 1,
};

const FROZEN_AT = "2026-09-04T06:12:30Z";

function request() {
  return buildD1ResearchRequest({ maturity: ELIGIBLE, reviewedAt: REVIEWED_AT });
}

describe("Phase 3A D1 research — run binding", () => {
  it("binds to the merged slice-A D1 scope and its exclusions, unaltered", () => {
    const built = request();
    const payload = built.input.split("# Frozen D1 run input (RFC 8785 canonical JSON)")[1] ?? "";

    expect(built.runKey).toBe("D1");
    expect(payload).toContain("alan-wake-2-base-main-campaign");
    expect(payload).toContain("Night Springs");
    expect(payload).toContain("The Lake House");
    // The excluded expansions appear only as exclusions, and the cutoff the
    // scope cannot yet know is absent until the freeze.
    expect(payload).toContain(canonicalize(D1_RUN_INPUT.scope as never));
    expect(payload).not.toContain("evidence_cutoff\":");
  });

  it("supplies the frozen research instruction set and no scoring prompt", () => {
    const built = request();
    expect(built.instructions).toBe(controlledText("system_instructions"));
    expect(built.input).toContain(controlledText("research_prompt"));
    expect(built.input).toContain(controlledText("rubric"));
    expect(built.input).toContain(controlledText("protocol"));
    expect(built.input).not.toContain(controlledText("scoring_prompt"));

    const lock = verifyControlledInputs();
    expect(built.digests.system_instructions_digest).toBe(controlledDigest(lock, "system_instructions"));
    expect(built.digests.prompt_template_digest).toBe(controlledDigest(lock, "research_prompt"));
    expect(built.digests.rubric_digest).toBe(controlledDigest(lock, "rubric"));
    expect(built.digests.protocol_digest).toBe(controlledDigest(lock, "protocol"));
    expect(built.digests.output_schema_digest).toBe(controlledDigest(lock, "output_schema"));
    // The Evidence SOP is named by the frozen prompt but is not Item 3-locked,
    // so it is recorded as a supplied input rather than a controlled one.
    expect(built.suppliedInputs.map((input) => input.path)).toEqual([EVIDENCE_SOP_PATH]);
  });

  it("exposes web search only, and its configuration is not a scoring configuration", () => {
    const built = request();
    const body = toResearchRequestBody(built.configuration, {
      instructions: built.instructions,
      input: built.input,
      responseFormat: {
        name: built.response_format.name,
        strict: true,
        schema: built.response_format.schema,
      },
    });

    expect(built.configuration.model).toBe("gpt-5.6-sol");
    expect(built.configuration.reasoning_effort).toBe("high");
    expect(built.configuration.reasoning_context).toBe("current_turn");
    expect(built.configuration.store).toBe(false);
    expect(built.configuration.tools.map((tool) => tool.type)).toEqual(["web_search"]);
    expect(() => assertResearchExecutionContract(body)).not.toThrow();
    // ADR 0036 §6: the same body is refused as a scoring call precisely because
    // it carries the research tool.
    expect(() => assertExecutionContract(body)).toThrow(ExecutionContractError);
  });

  it("refuses configuration drift on the research contract", () => {
    const built = request();
    const base = toResearchRequestBody(built.configuration, {
      instructions: built.instructions,
      input: built.input,
      responseFormat: {
        name: built.response_format.name,
        strict: true,
        schema: built.response_format.schema,
      },
    });
    const drift = (patch: Partial<RequestShape>) =>
      assertResearchExecutionContract({ ...base, ...patch } as RequestShape);

    expect(() => drift({ model: "gpt-5.6" })).toThrow(/must be exactly "gpt-5.6-sol"/);
    expect(() => drift({ reasoning: { effort: "medium", context: "current_turn" } })).toThrow(/reasoning.effort/);
    expect(() => drift({ reasoning: { effort: "high", context: "all_turns" } })).toThrow(/reasoning.context/);
    expect(() => drift({ store: true })).toThrow(/store must be false/);
    expect(() => drift({ tools: [] })).toThrow(/must expose the configured web-search tool/);
    expect(() => drift({ tools: [{ type: "code_interpreter" }] })).toThrow(/web search only/);
    expect(() => drift({ previous_response_id: "resp_x" })).toThrow(/previous_response_id/);
    expect(() => drift({ max_output_tokens: 0 })).toThrow(/max_output_tokens/);
  });

  it("makes any byte of the assembled request visible in the semantic digest", () => {
    const a = request();
    const b = buildD1ResearchRequest({
      maturity: ELIGIBLE,
      reviewedAt: REVIEWED_AT,
      maxOutputTokens: 1_234,
    });
    expect(a.digests.semantic_request_digest).not.toBe(b.digests.semantic_request_digest);
    expect(request().digests.semantic_request_digest).toBe(a.digests.semantic_request_digest);
  });
});

describe("Phase 3A D1 research — fail-closed gates", () => {
  it("refuses to build a request when maturity revalidation no longer holds", () => {
    expect(() =>
      buildD1ResearchRequest({
        maturity: { ...ELIGIBLE, evaluationMaturity: "newly_released" },
        reviewedAt: REVIEWED_AT,
      }),
    ).toThrow(/preregistered as mature/);
    expect(() =>
      buildD1ResearchRequest({
        maturity: { ...ELIGIBLE, profileStabilityState: "actively_changing" },
        reviewedAt: REVIEWED_AT,
      }),
    ).toThrow(/not settled enough/);
    expect(() =>
      buildD1ResearchRequest({
        maturity: {
          ...ELIGIBLE,
          materialProfileShapingChangesInFlight: ["placeholder transformation"],
        },
        reviewedAt: REVIEWED_AT,
      }),
    ).toThrow(/profile-shaping change/);
  });

  it("refuses to build a request when controlled bytes have drifted", () => {
    const drifted = lockControlledInputs().map((lock, index) =>
      index === 0 ? { ...lock, matches: false } : lock,
    );
    expect(() =>
      buildD1ResearchRequest({
        maturity: ELIGIBLE,
        reviewedAt: REVIEWED_AT,
        lock: { manifest_version: "1.0", inputs: drifted, lock_set_digest: "0".repeat(64) },
      }),
    ).toThrow(ControlledInputDriftError);
  });
});

describe("Phase 3A D1 research — holdout isolation", () => {
  it("keeps every holdout identity out of the wrapper-authored payload", () => {
    const built = request();
    const payload = built.input.split("# Frozen D1 run input (RFC 8785 canonical JSON)")[1] ?? "";
    expect(payload.length).toBeGreaterThan(0);
    expect(findHoldoutMentions(payload)).toEqual([]);
    expect(built.isolation.wrapper_payload_clean).toBe(true);
  });

  it("fails closed when a holdout identity reaches wrapper-authored content", () => {
    for (const identity of HOLDOUT_IDENTITIES) {
      expect(() =>
        assertNoHoldoutExposure(
          { run_key: "D1", note: `prior decision for ${identity.title}` },
          "a test payload",
        ),
      ).toThrow(HoldoutIsolationError);
    }
  });

  it("reports controlled-byte holdout mentions instead of blocking or editing them", () => {
    // The Item 3 freeze is owner-approved and immutable to this slice, so a
    // historical mention inside locked bytes is disclosed in the receipt and the
    // run still proceeds.
    const built = request();
    expect(Array.isArray(built.isolation.controlled_byte_mentions)).toBe(true);
    for (const report of built.isolation.controlled_byte_mentions) {
      expect(report.mentions.length).toBeGreaterThan(0);
      expect(report.path).toMatch(/^docs\//);
    }
  });
});

describe("Phase 3A D1 research — deterministic corpus freeze", () => {
  it("produces byte-identical corpora, digests and receipts for one output", () => {
    const built = request();
    const output = buildResearchOutput();
    const first = freezeD1Research({ request: built, output, facts: FACTS, frozenAt: FROZEN_AT });
    const second = freezeD1Research({ request: built, output, facts: FACTS, frozenAt: FROZEN_AT });

    expect(canonicalize(second.corpus as never)).toBe(canonicalize(first.corpus as never));
    expect(second.receipt.receipt_digest).toBe(first.receipt.receipt_digest);
    expect(second.runId).toBe(first.runId);
    expect(first.corpus.review_grades_masked).toBe(true);
    expect(first.corpus.frozen_at).toBe(FROZEN_AT);
    expect(validatorFor("/$defs/corpus")(first.corpus)).toBe(true);
  });

  it("materializes evidence_cutoff from the freeze UTC calendar date via the slice-A helper", () => {
    const built = request();
    const frozen = freezeD1Research({
      request: built,
      output: buildResearchOutput(),
      facts: FACTS,
      frozenAt: FROZEN_AT,
    });
    expect(frozen.evaluationScope.evidence_cutoff).toBe("2026-09-04");
    expect(frozen.evaluationScope).toEqual(freezeD1EvaluationScope("2026-09-04"));
    expect(frozen.receipt.evidence_cutoff).toBe("2026-09-04");
  });

  it("refuses a freeze timestamp that is not a UTC instant", () => {
    const built = request();
    expect(() =>
      freezeD1Research({
        request: built,
        output: buildResearchOutput(),
        facts: FACTS,
        frozenAt: "2026-09-04T06:12:30+02:00",
      }),
    ).toThrow(/must be a UTC instant/);
  });

  it("orders the normalized packet by the canonical source order, not by model array order", () => {
    const built = request();
    const output = buildResearchOutput();
    const shuffled: ModelResearchPass = {
      ...output,
      source_manifest: [...output.source_manifest].reverse(),
      normalized_captures: [...output.normalized_captures].reverse(),
    };

    const ordered = freezeD1Research({ request: built, output, facts: FACTS, frozenAt: FROZEN_AT });
    const reordered = freezeD1Research({ request: built, output: shuffled, facts: FACTS, frozenAt: FROZEN_AT });

    expect(canonicalSourceOrder(shuffled.source_manifest)).toEqual(ordered.corpus.canonical_source_order);
    // The normalized scoring packet is order-invariant …
    expect(reordered.corpus.normalized_packet_digest).toBe(ordered.corpus.normalized_packet_digest);
    // … while the raw captured packet still records exactly what came back.
    expect(reordered.corpus.raw_packet_digest).not.toBe(ordered.corpus.raw_packet_digest);
  });

  it("hands slice C a semantic input whose digest the scoring builder reproduces", () => {
    const built = request();
    const frozen = freezeD1Research({
      request: built,
      output: buildResearchOutput(),
      facts: FACTS,
      frozenAt: FROZEN_AT,
    });
    const scoring = buildScoringRequest({
      semanticInput: frozen.semanticInput,
      maxOutputTokens: 64_000,
    });
    expect(scoring.digests.normalized_packet_digest).toBe(frozen.corpus.normalized_packet_digest);
    expect(scoring.canonical_source_order).toEqual(frozen.corpus.canonical_source_order);
  });

  it("records the isolation boundary and states that nothing was scored", () => {
    const built = request();
    const { receipt } = freezeD1Research({
      request: built,
      output: buildResearchOutput(),
      facts: FACTS,
      frozenAt: FROZEN_AT,
    });
    expect(receipt.role).toBe("research");
    expect(receipt.isolation.scoring_performed).toBe(false);
    expect(receipt.isolation.research_context_ends_at_freeze).toBe(true);
    expect(receipt.research_tool_access).toEqual(["web_search"]);
    expect(receipt.controlled_inputs.lock_set_digest).toBe(built.lock.lock_set_digest);
    expect(receipt.digests.raw_packet_digest).toHaveLength(64);
    expect(receipt.maturity_revalidation.reviewed_at).toBe(REVIEWED_AT);
    expect(receipt.research_completion_report.independent_active_ab_cluster_count).toBe(8);
    expect(receipt.research_completion_report.frozen_scope_identifier).toBe(
      "alan-wake-2-base-main-campaign",
    );
  });
});

describe("Phase 3A D1 research — the research pass never scores", () => {
  const scope = freezeD1EvaluationScope("2026-09-04");
  const manifestFacts = {
    run_id: "run-research-test",
    started_at: FACTS.started_at,
    ended_at: FACTS.ended_at,
    provider: "openai",
    model_label: "gpt-5.6-sol",
    model_snapshot_build_id: "gpt-5.6-sol (test)",
    system_instructions_digest: "a".repeat(64),
    prompt_template_digest: "b".repeat(64),
    rubric_digest: "c".repeat(64),
    protocol_digest: "d".repeat(64),
    output_schema_digest: "e".repeat(64),
    research_tool_access: ["web_search"],
    decoding_parameters: [],
    seed: "parameter_unavailable" as const,
    retry_count: 0,
    validation_failures: [],
    human_corrections: [],
  };

  const freeze = (output: ModelResearchPass) =>
    freezeResearchCorpus({ output, evaluationScope: scope, manifestFacts, frozenAt: FROZEN_AT });

  it("excludes scoring fields from the model-facing contract", () => {
    const schema = buildResearchPassSchema();
    const properties = Object.keys(schema.schema.properties as Record<string, unknown>);
    expect(properties).toEqual([
      ...MODEL_OWNED_CORPUS_FIELDS,
      "normalized_captures",
      "research_completion_report",
    ]);
    expect(properties).not.toContain("decisions");
    expect(properties).not.toContain("claim_ledger");
    expect(schema.includedDefs).not.toContain("scoreDecision");
    expect(schema.includedDefs).not.toContain("numericScore");
    // The wrapper owns the freeze facts; the model is never asked for them.
    expect(properties).not.toContain("frozen_at");
    expect(properties).not.toContain("research_run_manifest");
    expect(properties).not.toContain("normalized_packet_digest");
  });

  it("refuses a research output carrying scoring content", () => {
    const withDecisions = {
      ...buildResearchOutput(),
      decisions: [{ subcriterion_key: "story_hook" }],
    } as unknown as ModelResearchPass;
    expect(() => freeze(withDecisions)).toThrow(ResearchContentError);

    const output = buildResearchOutput();
    const anchored: ModelResearchPass = {
      ...output,
      collection_reason: "The opening scores 1.5 / 2 against the anchor.",
    };
    expect(() => freeze(anchored)).toThrow(/rubric anchor value/);
  });

  it("refuses to freeze an unmasked review grade into the scoring view", () => {
    const output = buildResearchOutput();
    const graded: ModelResearchPass = {
      ...output,
      normalized_captures: output.normalized_captures.map((capture, index) =>
        index === 0
          ? { ...capture, normalized_content: "The outlet awarded it 9/10 overall." }
          : capture,
      ),
      source_manifest: output.source_manifest.map((source, index) =>
        index === 0
          ? { ...source, normalized_content_digest: sha256("The outlet awarded it 9/10 overall.") }
          : source,
      ),
    };
    expect(() => freeze(graded)).toThrow(/unmasked review grade/);
  });

  it("refuses a corpus whose digests do not describe its own captures", () => {
    const output = buildResearchOutput();
    const tampered: ModelResearchPass = {
      ...output,
      normalized_captures: output.normalized_captures.map((capture, index) =>
        index === 0 ? { ...capture, normalized_content: "Silently edited capture." } : capture,
      ),
    };
    expect(() => freeze(tampered)).toThrow(/does not describe the supplied capture/);
  });

  it("refuses a corpus that could not satisfy the collection standard it declares", () => {
    const output = buildResearchOutput();
    const thin: ModelResearchPass = {
      ...output,
      source_manifest: output.source_manifest.slice(0, 3),
      normalized_captures: output.normalized_captures.slice(0, 3),
    };
    expect(() => freeze(thin)).toThrow(/independent active A\/B clusters/);
  });

  it("refuses a corpus missing a query family", () => {
    const output = buildResearchOutput();
    const partial: ModelResearchPass = {
      ...output,
      query_family_audit: output.query_family_audit.slice(0, 6),
    };
    expect(() => freeze(partial)).toThrow(/appears 0 times/);
  });
});
