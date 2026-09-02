import { describe, expect, it } from "vitest";
import {
  PairInvariantError,
  assertPairInvariants,
  buildScoringRequest,
  checkPairInvariants,
  manifestSeed,
  PREREGISTERED_MODEL,
  type SemanticInput,
} from "@/lib/calibration/request-builder";
import { verifyControlledInputs } from "@/lib/calibration/controlled-inputs";
import {
  buildScoringPassSchema,
  scoringPassSchemaDigest,
} from "@/lib/calibration/scoring-pass-contract";

/**
 * Work order §5(13)–§5(15): primary/audit semantic request equality, pair drift
 * detection, and seed handling when available and unavailable.
 */

const SEMANTIC_INPUT: SemanticInput = {
  evaluation_scope: { scope_key: "placeholder-title", edition: "Standard" },
  coverage_frames: [{ coverage_frame_id: "frame-1", subcriterion_key: "story_hook" }],
  normalized_corpus: [{ source_id: "src-1", normalized: "placeholder text" }],
  canonical_source_order: ["src-1"],
};

function build(overrides: Partial<Parameters<typeof buildScoringRequest>[0]> = {}) {
  return buildScoringRequest({
    semanticInput: SEMANTIC_INPUT,
    maxOutputTokens: 32_000,
    ...overrides,
  });
}

describe("the paired requests are identical by construction (§5(13))", () => {
  it("produces byte-identical instructions, input and configuration", () => {
    const primary = build();
    const audit = build();
    expect(audit.instructions).toBe(primary.instructions);
    expect(audit.input).toBe(primary.input);
    expect(audit.configuration).toEqual(primary.configuration);
    expect(checkPairInvariants(primary, audit)).toEqual([]);
    expect(() => assertPairInvariants(primary, audit)).not.toThrow();
  });

  it("cannot be given a run role, so no role can reach the model input", () => {
    // The words "primary" and "audit" DO appear in the model input — the frozen
    // protocol and scoring prompt describe the paired-pass method, and those are
    // controlled bytes that must be sent verbatim. What must be impossible is a
    // role reaching the request as DATA, so the assertion is that supplying one
    // changes nothing at all.
    const plain = build();
    const withRole = buildScoringRequest({
      semanticInput: SEMANTIC_INPUT,
      maxOutputTokens: 32_000,
      // Not part of BuildOptions; TypeScript rejects it and the builder ignores
      // it. Cast so the runtime behaviour is proven rather than assumed.
      role: "primary",
    } as unknown as Parameters<typeof buildScoringRequest>[0]);
    expect(withRole.input).toBe(plain.input);
    expect(withRole.instructions).toBe(plain.instructions);
    expect(withRole.configuration).toEqual(plain.configuration);
    expect(withRole.digests.semantic_request_digest).toBe(plain.digests.semantic_request_digest);
    // And the configuration the wrapper exposes carries no role of its own.
    expect(Object.keys(plain.configuration)).not.toContain("role");
  });

  it("embeds the exact approved controlled bytes, not a paraphrase", () => {
    const lock = verifyControlledInputs();
    const request = build();
    for (const role of ["system_instructions", "scoring_prompt", "rubric", "protocol"] as const) {
      const expected = lock.inputs.find((input) => input.role === role)!.sha256;
      const field =
        role === "system_instructions"
          ? request.digests.system_instructions_digest
          : role === "scoring_prompt"
            ? request.digests.prompt_template_digest
            : role === "rubric"
              ? request.digests.rubric_digest
              : request.digests.protocol_digest;
      expect(field).toBe(expected);
    }
    expect(request.configuration.model).toBe(PREREGISTERED_MODEL);
    expect(request.configuration.store).toBe(false);
    expect(request.configuration.tools).toEqual([]);
  });

  it("binds output_schema_digest to the APPROVED canonical schema, not the transport one", () => {
    // Gate 6 defines run-manifest controlled-input digests over the exact Item 3
    // bytes. The derived scoring-pass schema is a request artefact and must not
    // occupy that field, or the manifest would attest to something the owner
    // never approved.
    const lock = verifyControlledInputs();
    const approved = lock.inputs.find((input) => input.role === "output_schema")!.sha256;
    const request = build();
    expect(request.digests.output_schema_digest).toBe(approved);
    // The transport schema is still recorded, just not there.
    expect(request.scoringPassSchemaDigest).not.toBe(approved);
    expect(request.scoringPassSchemaDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(request.scoringPassSchemaDigest).toBe(
      scoringPassSchemaDigest(buildScoringPassSchema()),
    );
  });

  it("serialises the semantic payload canonically, so member order cannot drift", () => {
    const reordered: SemanticInput = {
      canonical_source_order: ["src-1"],
      normalized_corpus: [{ normalized: "placeholder text", source_id: "src-1" }],
      coverage_frames: [{ subcriterion_key: "story_hook", coverage_frame_id: "frame-1" }],
      evaluation_scope: { edition: "Standard", scope_key: "placeholder-title" },
    };
    const a = build();
    const b = build({ semanticInput: reordered });
    expect(b.digests.semantic_request_digest).toBe(a.digests.semantic_request_digest);
    expect(b.digests.normalized_packet_digest).toBe(a.digests.normalized_packet_digest);
  });
});

describe("pair drift is detected (§5(14))", () => {
  it("detects a changed semantic input", () => {
    const primary = build();
    const audit = build({
      semanticInput: { ...SEMANTIC_INPUT, canonical_source_order: ["src-1", "src-2"] },
    });
    const issues = checkPairInvariants(primary, audit);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((issue) => issue.field === "input")).toBe(true);
    expect(issues.some((issue) => issue.field === "digests.semantic_request_digest")).toBe(true);
    expect(() => assertPairInvariants(primary, audit)).toThrow(PairInvariantError);
  });

  it("detects a changed exposed configuration", () => {
    const primary = build();
    const audit = build({ maxOutputTokens: 16_000 });
    const issues = checkPairInvariants(primary, audit);
    expect(issues.some((issue) => issue.field === "configuration")).toBe(true);
  });

  it("detects a changed output contract", () => {
    const primary = build();
    const audit = build();
    const drifted = {
      ...audit,
      response_format: {
        ...audit.response_format,
        schema: { ...audit.response_format.schema, extra: true },
      },
    };
    expect(
      checkPairInvariants(primary, drifted).some(
        (issue) => issue.field === "response_format.schema",
      ),
    ).toBe(true);
  });

  it("a one-character change in a controlled digest breaks the pair", () => {
    const primary = build();
    const audit = build();
    const drifted = {
      ...audit,
      digests: { ...audit.digests, rubric_digest: `${audit.digests.rubric_digest.slice(0, 63)}0` },
    };
    expect(
      checkPairInvariants(primary, drifted).some(
        (issue) => issue.field === "digests.rubric_digest",
      ),
    ).toBe(true);
  });
});

describe("seed handling (§5(15))", () => {
  it("records the exact sentinel when the endpoint exposes no seed", () => {
    expect(manifestSeed(undefined)).toBe("parameter_unavailable");
    const request = build();
    expect(request.configuration.seed).toBeUndefined();
  });

  it("records an exposed seed and permits it as the only pair difference", () => {
    expect(manifestSeed(42)).toBe(42);
    const primary = build({ seed: 1 });
    const audit = build({ seed: 2 });
    expect(primary.configuration.seed).toBe(1);
    expect(audit.configuration.seed).toBe(2);
    // Different seeds, identical everything else — including the digest, which
    // deliberately excludes the seed.
    expect(checkPairInvariants(primary, audit)).toEqual([]);
    expect(audit.digests.semantic_request_digest).toBe(primary.digests.semantic_request_digest);
  });

  it("rejects an identical exposed seed across the pair", () => {
    const issues = checkPairInvariants(build({ seed: 9 }), build({ seed: 9 }));
    expect(issues.some((issue) => issue.field === "configuration.seed")).toBe(true);
  });

  it("rejects a pair where only one side exposes a seed", () => {
    const issues = checkPairInvariants(build({ seed: 9 }), build());
    expect(issues.some((issue) => issue.field === "configuration.seed")).toBe(true);
  });

  it("never fabricates a seed", () => {
    const request = build();
    expect(JSON.stringify(request.configuration)).not.toContain("seed");
  });
});
