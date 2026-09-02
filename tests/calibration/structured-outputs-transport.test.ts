import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020";
import {
  StructuredOutputsClosureError,
  buildScoringPassSchema,
  structuredOutputsClosureViolations,
} from "@/lib/calibration/scoring-pass-contract";
import { loadPackageSchema } from "@/lib/calibration/package-schema";
import { buildValidPackage } from "./fixtures";

/**
 * Regression coverage for the Structured Outputs transport defect that PR #45's
 * live Gate 1 probe exposed.
 *
 * The live API rejected the derived scoring-pass schema before the model ran:
 *
 *     HTTP 400 — Invalid schema for response_format 'phase3a_scoring_pass':
 *     In context=('anyOf', '0'), 'additionalProperties' is required to be
 *     supplied and to be false.
 *
 * Two things are asserted here, and the second matters as much as the first:
 * that every object-shaped branch is closed at every depth, and that the schema
 * is still SATISFIABLE. Closing the offending branches naively would have
 * produced a schema the API accepts and no model output can satisfy — a defect
 * that would surface only after a measured run had been spent.
 */

const derived = buildScoringPassSchema();

/** The exact shape the live API rejected: an unclosed object inside `anyOf`. */
const FAILURE_SHAPE = {
  type: "object",
  additionalProperties: false,
  required: ["retrospective_time"],
  properties: {
    retrospective_time: {
      anyOf: [
        // Branch 0 — object-shaped, but not closed. This is what produced the 400.
        { properties: { play_completion_date: { type: "string" } } },
        { type: "null" },
      ],
    },
  },
};

describe("the closure checker catches the exact live failure", () => {
  it("flags an unclosed object branch inside anyOf, naming its pointer", () => {
    const violations = structuredOutputsClosureViolations(FAILURE_SHAPE);
    expect(violations.length).toBeGreaterThan(0);
    const pointers = violations.map((violation) => violation.pointer);
    expect(pointers).toContain("/properties/retrospective_time/anyOf/0");
    expect(violations[0]!.reason).toMatch(/additionalProperties:false|required list/);
  });

  it("accepts the same branch once it is closed", () => {
    const fixed = JSON.parse(JSON.stringify(FAILURE_SHAPE)) as typeof FAILURE_SHAPE;
    const branch = (fixed.properties.retrospective_time.anyOf as Record<string, unknown>[])[0]!;
    branch.type = "object";
    branch.additionalProperties = false;
    branch.required = ["play_completion_date"];
    expect(structuredOutputsClosureViolations(fixed)).toEqual([]);
  });

  it("flags a `required` list that does not cover every declared property", () => {
    const partial = {
      type: "object",
      additionalProperties: false,
      required: ["a"],
      properties: { a: { type: "string" }, b: { type: "string" } },
    };
    const violations = structuredOutputsClosureViolations(partial);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.reason).toMatch(/missing b/);
  });

  it("flags an object declared only by `properties`, with no `type`", () => {
    // The canonical schema contains exactly this shape, and keying the closure
    // rule off `type === "object"` alone is what let it through.
    expect(
      structuredOutputsClosureViolations({ properties: { a: { type: "string" } } }),
    ).not.toEqual([]);
  });
});

describe("recursive closure of the produced schema", () => {
  it("closes every object-shaped subschema at every depth", () => {
    expect(structuredOutputsClosureViolations(derived.schema)).toEqual([]);
  });

  it("closes every object reached through $defs, arrays and anyOf branches", () => {
    // Walk independently of the checker so this test cannot pass by sharing the
    // implementation's own blind spot.
    const seen: string[] = [];
    const walk = (node: unknown, pointer: string): void => {
      if (Array.isArray(node)) {
        node.forEach((item, index) => walk(item, `${pointer}/${index}`));
        return;
      }
      if (node === null || typeof node !== "object") return;
      const subschema = node as Record<string, unknown>;
      if (subschema.type === "object" || "properties" in subschema) {
        seen.push(pointer);
        expect(subschema.additionalProperties, `${pointer} additionalProperties`).toBe(false);
        expect(
          new Set(subschema.required as string[]),
          `${pointer} required`,
        ).toEqual(new Set(Object.keys((subschema.properties ?? {}) as object)));
      }
      Object.entries(subschema).forEach(([key, value]) => walk(value, `${pointer}/${key}`));
    };
    walk(derived.schema, "");
    // Sanity: the walk actually reached objects at several depths, so a future
    // change that stopped producing them would fail here rather than pass
    // vacuously. Named pointers rather than a round number, so the assertion
    // says what it means.
    expect(seen).toContain("");                         // the root
    expect(seen).toContain("/$defs/scoreDecision");     // a $defs object
    expect(seen).toContain("/$defs/retrospectiveTime"); // the def that carried the defect
    expect(seen.length).toBeGreaterThanOrEqual(8);

    // Array members are `$ref`s rather than inline objects, so closure reaches
    // them through `$defs`. Assert that link explicitly, or "nested inside
    // arrays" would be an unbacked claim.
    const root = derived.schema as Record<string, Record<string, Record<string, unknown>>>;
    const decisionsItems = root.properties!.decisions!.items as Record<string, string>;
    expect(decisionsItems.$ref).toBe("#/$defs/scoreDecision");
    expect(seen).toContain("/$defs/scoreDecision");
    // …and that anyOf branches were walked, even though these are $refs/nulls.
    const claim = (derived.schema.$defs as Record<string, Record<string, unknown>>).claim!;
    const retro = (claim.properties as Record<string, Record<string, unknown>>).retrospective_time!;
    expect(Array.isArray(retro.anyOf)).toBe(true);
  });

  it("leaves no anyOf branch that is object-shaped and unclosed", () => {
    const offenders: string[] = [];
    const walk = (node: unknown, pointer: string): void => {
      if (Array.isArray(node)) {
        node.forEach((item, index) => walk(item, `${pointer}/${index}`));
        return;
      }
      if (node === null || typeof node !== "object") return;
      const subschema = node as Record<string, unknown>;
      if (Array.isArray(subschema.anyOf)) {
        subschema.anyOf.forEach((branch, index) => {
          const candidate = branch as Record<string, unknown>;
          const objectShaped = candidate.type === "object" || "properties" in candidate;
          if (objectShaped && candidate.additionalProperties !== false) {
            offenders.push(`${pointer}/anyOf/${index}`);
          }
        });
      }
      Object.entries(subschema).forEach(([key, value]) => walk(value, `${pointer}/${key}`));
    };
    walk(derived.schema, "");
    expect(offenders).toEqual([]);
  });

  it("refuses to return a schema that violates closure", () => {
    // The build-time guard is what keeps an invalid schema from reaching the API
    // at all, so it is asserted as behaviour rather than trusted as a comment.
    expect(() => {
      const violations = structuredOutputsClosureViolations(FAILURE_SHAPE);
      if (violations.length > 0) throw new StructuredOutputsClosureError(violations);
    }).toThrow(StructuredOutputsClosureError);
  });
});

describe("oneOf is classified, not blindly converted", () => {
  it("keeps type-union oneOf as an anyOf that preserves the type", () => {
    const decision = (derived.schema.$defs as Record<string, Record<string, unknown>>)
      .scoreDecision!;
    const numeric = (decision.properties as Record<string, Record<string, unknown>>)
      .numeric_score!;
    expect(Array.isArray(numeric.anyOf)).toBe(true);
    expect(numeric.anyOf).toHaveLength(2);
  });

  it("drops a property-constraint oneOf instead of converting it", () => {
    // `retrospectiveTime.oneOf` narrows two of four members ("exactly one date
    // basis"). It is a cross-field rule, dropped for transport like `allOf` and
    // `if`, and re-imposed by canonical validation.
    const retrospective = (derived.schema.$defs as Record<string, Record<string, unknown>>)
      .retrospectiveTime!;
    expect(retrospective.anyOf).toBeUndefined();
    expect(retrospective.additionalProperties).toBe(false);
    expect(new Set(retrospective.required as string[])).toEqual(
      new Set(Object.keys(retrospective.properties as object)),
    );
    // The canonical schema does still carry the constraint.
    const canonical = loadPackageSchema() as { $defs: Record<string, Record<string, unknown>> };
    expect(canonical.$defs.retrospectiveTime!.oneOf).toBeDefined();
  });
});

describe("the derived schema remains satisfiable", () => {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  const validate = ajv.compile(JSON.parse(JSON.stringify(derived.schema)));

  it("accepts a real scoring-pass output", () => {
    const reference = buildValidPackage();
    const output = {
      claim_ledger: reference.scoring_content.primary_pass.claim_ledger,
      decisions: reference.scoring_content.primary_pass.decisions,
    };
    const valid = validate(output) as boolean;
    if (!valid) console.error(JSON.stringify(validate.errors?.slice(0, 5), null, 1));
    expect(valid).toBe(true);
  });

  it("accepts a claim carrying retrospective_time — the branch that could have been made unsatisfiable", () => {
    const reference = buildValidPackage();
    const withRetrospective = reference.scoring_content.primary_pass.claim_ledger.filter(
      (claim) => claim.retrospective_time !== null,
    );
    // Guard the guard: if the fixture stopped carrying these, this test would
    // silently prove nothing.
    expect(withRetrospective.length).toBeGreaterThan(0);
    const valid = validate({
      claim_ledger: withRetrospective,
      decisions: reference.scoring_content.primary_pass.decisions,
    }) as boolean;
    if (!valid) console.error(JSON.stringify(validate.errors?.slice(0, 5), null, 1));
    expect(valid).toBe(true);
  });

  it("still rejects a decision missing a required property", () => {
    const reference = buildValidPackage();
    const [first, ...rest] = reference.scoring_content.primary_pass.decisions;
    const { anchor_id: _dropped, ...withoutAnchor } = first!;
    expect(
      validate({
        claim_ledger: reference.scoring_content.primary_pass.claim_ledger,
        decisions: [withoutAnchor, ...rest],
      }),
    ).toBe(false);
  });
});
