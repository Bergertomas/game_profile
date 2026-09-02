import { describe, expect, it } from "vitest";
import {
  UNSUPPORTED_KEYWORDS,
  assembleScoringPass,
  buildScoringPassSchema,
  canonicalSchemaCompatibility,
  scoringPassSchemaDigest,
  structuredOutputDigest,
} from "@/lib/calibration/scoring-pass-contract";
import { loadPackageSchema, validatePackageStructure } from "@/lib/calibration/package-schema";
import { validatePackageSemantics } from "@/lib/calibration/semantic-validator";
import { canonicalDigest } from "@/lib/calibration/canonical-json";
import { buildValidPackage } from "./fixtures";
import type { ScoringPackage } from "@/lib/calibration/package-types";

/**
 * Work order §5(16) and §5(17): structured-output mapping equivalence, and proof
 * that an invalid model output is never silently repaired.
 */

describe("the canonical schema cannot be posted to Structured Outputs unchanged", () => {
  it("reports the exact constructs outside the accepted subset", () => {
    const findings = canonicalSchemaCompatibility(loadPackageSchema());
    // The empirical finding this establishes on repository evidence: the
    // canonical package schema leans on keywords Structured Outputs rejects, so
    // an explicitly equivalent derived schema is required rather than optional.
    expect(findings.length).toBeGreaterThan(0);
    const keywords = new Set(findings.map((finding) => finding.keyword));
    for (const expected of ["oneOf", "allOf", "if", "pattern", "minItems"]) {
      expect(keywords.has(expected), `expected ${expected} among findings`).toBe(true);
    }
    for (const finding of findings) {
      expect(UNSUPPORTED_KEYWORDS).toContain(finding.keyword);
      expect(finding.pointer).toMatch(/^(\/|$)/);
    }
  });
});

describe("the derived scoring-pass schema (§5(16))", () => {
  const derived = buildScoringPassSchema();

  it("asks only for what the model owns", () => {
    expect(Object.keys(derived.schema.properties as object).sort()).toEqual([
      "claim_ledger",
      "decisions",
    ]);
    // The run manifest is wrapper metadata — role, timing, digests and seed are
    // facts about the execution, not model output, so the model is never asked
    // for them and therefore cannot assert them.
    expect(JSON.stringify(derived.schema)).not.toContain("run_manifest");
  });

  it("contains every field of a canonical decision, none omitted for convenience", () => {
    const canonical = loadPackageSchema() as {
      $defs: Record<string, { required?: string[] }>;
    };
    const derivedDefs = derived.schema.$defs as Record<string, { required?: string[] }>;
    for (const name of ["scoreDecision", "claim", "facetRecord", "platformOverride", "endpointGate", "confidenceFacts", "retrospectiveTime"]) {
      expect(derivedDefs[name], `missing $defs/${name}`).toBeDefined();
      expect(new Set(derivedDefs[name]!.required)).toEqual(
        new Set(canonical.$defs[name]!.required),
      );
    }
  });

  it("is closed and fully required at every object, as strict mode demands", () => {
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node === null || typeof node !== "object") return;
      const schema = node as Record<string, unknown>;
      if (schema.type === "object" && schema.properties) {
        expect(schema.additionalProperties).toBe(false);
        expect(new Set(schema.required as string[])).toEqual(
          new Set(Object.keys(schema.properties as object)),
        );
      }
      Object.values(schema).forEach(walk);
    };
    walk(derived.schema);
  });

  it("carries no keyword the Structured Outputs subset rejects", () => {
    const findings = canonicalSchemaCompatibility(derived.schema);
    // `anyOf` replaces `oneOf`; everything else in the unsupported list is gone.
    expect(findings).toEqual([]);
    expect(JSON.stringify(derived.schema)).toContain('"anyOf"');
  });

  it("resolves every $ref it emits", () => {
    const refs = [...JSON.stringify(derived.schema).matchAll(/"\$ref":"#\/\$defs\/([A-Za-z0-9_]+)"/g)].map(
      (match) => match[1]!,
    );
    const defs = new Set(Object.keys(derived.schema.$defs as object));
    expect([...new Set(refs)].filter((ref) => !defs.has(ref))).toEqual([]);
  });

  it("has a stable digest for the run manifest to record", () => {
    expect(scoringPassSchemaDigest(derived)).toBe(scoringPassSchemaDigest(buildScoringPassSchema()));
    expect(scoringPassSchemaDigest(derived)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("mapping model output into the canonical representation (§5(16))", () => {
  it("assembles a canonical pass that passes canonical validation", () => {
    const reference = buildValidPackage();
    // A model output is exactly the two arrays the derived schema asks for.
    const modelOutput = {
      claim_ledger: reference.scoring_content.primary_pass.claim_ledger,
      decisions: reference.scoring_content.primary_pass.decisions,
    };
    const assembled = assembleScoringPass(
      modelOutput,
      reference.scoring_content.primary_pass.run_manifest,
    );
    // Round-trip: the assembled pass is byte-identical to the canonical one.
    expect(canonicalDigest(assembled as never)).toBe(
      canonicalDigest(reference.scoring_content.primary_pass as never),
    );

    const rebuilt = {
      ...reference,
      scoring_content: { ...reference.scoring_content, primary_pass: assembled },
    } as ScoringPackage;
    expect(validatePackageStructure(rebuilt).valid).toBe(true);
    expect(validatePackageSemantics(rebuilt).valid).toBe(true);
  });

  it("copies rather than repairs: a deficient output stays deficient (§5(17))", () => {
    const reference = buildValidPackage();
    const deficient = {
      claim_ledger: reference.scoring_content.primary_pass.claim_ledger,
      // The model returned 39 of the 40 required decisions.
      decisions: reference.scoring_content.primary_pass.decisions.slice(0, 39),
    };
    const assembled = assembleScoringPass(
      deficient,
      reference.scoring_content.primary_pass.run_manifest,
    );
    // Nothing was back-filled, defaulted or reordered.
    expect(assembled.decisions).toHaveLength(39);

    const rebuilt = {
      ...reference,
      scoring_content: { ...reference.scoring_content, primary_pass: assembled },
    } as ScoringPackage;
    // And the deficiency is caught locally rather than absorbed.
    const structural = validatePackageStructure(rebuilt);
    const semantic = validatePackageSemantics(rebuilt);
    expect(structural.valid && semantic.valid).toBe(false);
  });

  it("re-imposes locally every constraint dropped for transport", () => {
    const reference = buildValidPackage();
    // `pattern` is dropped from the derived schema, so a malformed anchor id
    // would transport fine — and must still be rejected on arrival.
    const decisions = reference.scoring_content.primary_pass.decisions.map((decision, index) =>
      index === 0 ? { ...decision, anchor_id: "NOT A VALID ANCHOR" } : decision,
    );
    const assembled = assembleScoringPass(
      { claim_ledger: reference.scoring_content.primary_pass.claim_ledger, decisions },
      reference.scoring_content.primary_pass.run_manifest,
    );
    const rebuilt = {
      ...reference,
      scoring_content: { ...reference.scoring_content, primary_pass: assembled },
    } as ScoringPackage;
    const structural = validatePackageStructure(rebuilt);
    expect(structural.valid).toBe(false);
    expect(
      structural.issues.some((issue) => issue.instancePath.includes("anchor_id")),
    ).toBe(true);
  });

  it("digests one model output deterministically", () => {
    const output = { claim_ledger: [], decisions: [] };
    expect(structuredOutputDigest(output)).toBe(structuredOutputDigest({ decisions: [], claim_ledger: [] }));
    expect(structuredOutputDigest(output)).toMatch(/^[a-f0-9]{64}$/);
  });
});
