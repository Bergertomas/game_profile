import { loadPackageSchema } from "./package-schema";
import { canonicalDigest } from "./canonical-json";
import type { Claim, RunManifest, ScoreDecision, ScoringPass } from "./package-types";

/**
 * The model-facing scoring-pass Structured Output contract, and its
 * deterministic mapping back into the canonical package representation.
 *
 * Why a separate schema exists at all: the canonical scoring prompt asks for one
 * `scoringPass`, not a complete approved package — the model never produces a
 * corpus, an adjudication, derived dimensions, an owner approval or its own run
 * manifest, and it must not. Beyond that, OpenAI Structured Outputs accepts a
 * restricted JSON Schema subset, and the canonical schema uses keywords outside
 * it (`oneOf`, `pattern`, `minItems`, `format`, `if`/`then`, `contains`, …).
 *
 * The safety property that makes this sound: the derived schema is only ever a
 * TRANSPORT contract. Nothing is trusted because the model returned it. The
 * mapped result is validated against the FULL canonical schema and the complete
 * §15.1 semantic validator before a run counts, so every constraint dropped for
 * transport is re-imposed locally. Dropping a keyword can therefore only cause a
 * local rejection, never a silently accepted package — which is the direction
 * the work order requires ("cannot alter score semantics").
 */

/**
 * Keywords the Structured Outputs subset does not accept. Recorded explicitly so
 * the compatibility report names them rather than a transformation quietly
 * eating them.
 */
export const UNSUPPORTED_KEYWORDS: readonly string[] = [
  "oneOf",
  "allOf",
  "if",
  "then",
  "else",
  "not",
  "contains",
  "pattern",
  "format",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "default",
];

export interface CompatibilityFinding {
  /** JSON pointer into the canonical schema. */
  readonly pointer: string;
  readonly keyword: string;
}

/**
 * Walk the canonical schema and report every construct outside the Structured
 * Outputs subset. This is the deterministic half of §3.5's "determine
 * empirically whether the exact model-facing schema is accepted": it establishes
 * on repository evidence alone that the canonical schema CANNOT be posted
 * unchanged, and the live probe then confirms that the derived schema is.
 */
export function canonicalSchemaCompatibility(
  schema: Record<string, unknown> = loadPackageSchema(),
): readonly CompatibilityFinding[] {
  const findings: CompatibilityFinding[] = [];
  const walk = (node: unknown, pointer: string): void => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${pointer}/${index}`));
      return;
    }
    if (node === null || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (UNSUPPORTED_KEYWORDS.includes(key)) {
        findings.push({ pointer, keyword: key });
      }
      walk(value, `${pointer}/${key}`);
    }
  };
  walk(schema, "");
  return findings;
}

type SchemaNode = Record<string, unknown>;

/**
 * Is this subschema object-shaped for the purposes of the Structured Outputs
 * closure rule?
 *
 * Deliberately broader than `type === "object"`: the live API requires
 * `additionalProperties: false` on anything it treats as an object, and the
 * canonical schema contains subschemas that carry `properties` WITHOUT
 * declaring a type. Keying only off `type` is exactly the defect that produced
 * `In context=('anyOf', '0'), 'additionalProperties' is required to be supplied
 * and to be false.`
 */
function isObjectShaped(node: SchemaNode): boolean {
  return node.type === "object" || "properties" in node;
}

/**
 * Is this `oneOf` branch a standalone schema (a type alternative), or a bare
 * property constraint?
 *
 * The canonical schema uses `oneOf` for two different jobs:
 *
 *  - **type unions** — `[{$ref: X}, {type: "null"}]`, `[{type:"integer"},
 *    {const:"parameter_unavailable"}]`. These are real alternatives and must
 *    survive as `anyOf`, or the property loses its type entirely.
 *  - **cross-field constraints** — `retrospectiveTime.oneOf`, whose branches
 *    carry only `properties` and narrow two of the four members ("exactly one
 *    date basis is stored"). These are the same kind of rule as `allOf`/`if`,
 *    which are already dropped for transport.
 *
 * Telling them apart matters for correctness, not tidiness. Closing a
 * constraint branch — giving it `additionalProperties:false` and
 * `required: [its own two keys]` — would forbid the two members the branch
 * does not mention but the parent still requires, making the branch
 * unsatisfiable and the whole union unsatisfiable with it. The API would then
 * accept the schema and no model output could ever validate against it: a
 * worse failure than the 400, because it would surface only after a measured
 * run had been spent.
 */
function isTypeAlternative(branch: unknown): boolean {
  if (branch === null || typeof branch !== "object" || Array.isArray(branch)) return false;
  const node = branch as SchemaNode;
  return "type" in node || "$ref" in node || "const" in node || "enum" in node;
}

/**
 * Rewrite one canonical subschema into the Structured Outputs subset.
 *
 * The transformation is deliberately mechanical and lossy in exactly one
 * direction — it only ever REMOVES constraints or widens a type union, never
 * adds or alters one — so a value the derived schema accepts is a superset of
 * the values the canonical schema accepts. Local canonical validation then
 * narrows it back.
 */
function toStructuredOutputs(node: unknown, defs: Set<string>): unknown {
  if (Array.isArray(node)) return node.map((item) => toStructuredOutputs(item, defs));
  if (node === null || typeof node !== "object") return node;

  const source = node as SchemaNode;
  const out: SchemaNode = {};

  for (const [key, value] of Object.entries(source)) {
    if (key === "$ref") {
      const ref = String(value);
      const name = ref.replace("#/$defs/", "");
      defs.add(name);
      out.$ref = `#/$defs/${name}`;
      continue;
    }
    // `oneOf` is not in the subset. A type union becomes `anyOf`, which accepts
    // exactly the same instances because the branches are disjoint by type. A
    // property-constraint `oneOf` is dropped like any other cross-field rule —
    // see `isTypeAlternative` for why converting it would be actively wrong.
    if (key === "oneOf") {
      const branches = value as unknown[];
      if (branches.every(isTypeAlternative)) {
        out.anyOf = branches.map((branch) => toStructuredOutputs(branch, defs));
      }
      continue;
    }
    // Conditional and combinator keywords carry the schema's cross-field rules.
    // They are dropped for transport and re-imposed by canonical validation.
    if (UNSUPPORTED_KEYWORDS.includes(key)) continue;

    if (key === "properties") {
      const properties: SchemaNode = {};
      for (const [name, child] of Object.entries(value as SchemaNode)) {
        properties[name] = toStructuredOutputs(child, defs);
      }
      out.properties = properties;
      continue;
    }
    if (key === "items" || key === "additionalProperties") {
      out[key] = typeof value === "object" && value !== null
        ? toStructuredOutputs(value, defs)
        : value;
      continue;
    }
    out[key] = toStructuredOutputs(value, defs);
  }

  // Structured Outputs requires every declared property to be required and every
  // object to be closed — at EVERY depth, including branches inside `anyOf`,
  // items inside arrays and entries in `$defs`. The canonical schema already
  // requires every property of every object it defines, so this restates the
  // shape rather than changing it.
  if (isObjectShaped(out)) {
    out.type = "object";
    const properties = (out.properties as SchemaNode | undefined) ?? {};
    out.properties = properties;
    out.additionalProperties = false;
    out.required = Object.keys(properties);
  }
  return out;
}

export interface ClosureViolation {
  /** JSON pointer into the derived schema. */
  readonly pointer: string;
  readonly reason: string;
}

/**
 * Walk a schema destined for Structured Outputs and report every object-shaped
 * subschema the live API would reject.
 *
 * This exists because the failure it catches is invisible locally: Ajv happily
 * compiles and uses an unclosed object, so the canonical-side tests stay green
 * while the API returns HTTP 400 before the model ever runs. The check is the
 * local stand-in for that API rule, and `buildScoringPassSchema` runs it on
 * every build so an invalid schema cannot leave this module.
 */
export function structuredOutputsClosureViolations(
  schema: Record<string, unknown>,
): readonly ClosureViolation[] {
  const violations: ClosureViolation[] = [];
  const walk = (node: unknown, pointer: string): void => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${pointer}/${index}`));
      return;
    }
    if (node === null || typeof node !== "object") return;
    const subschema = node as SchemaNode;

    if (isObjectShaped(subschema)) {
      const properties = subschema.properties as SchemaNode | undefined;
      const declared = properties ? Object.keys(properties) : [];
      if (subschema.additionalProperties !== false) {
        violations.push({
          pointer: pointer || "<root>",
          reason: "object-shaped subschema without additionalProperties:false",
        });
      }
      const required = Array.isArray(subschema.required)
        ? (subschema.required as string[])
        : null;
      if (required === null) {
        violations.push({
          pointer: pointer || "<root>",
          reason: "object-shaped subschema without a required list",
        });
      } else {
        const missing = declared.filter((name) => !required.includes(name));
        const extra = required.filter((name) => !declared.includes(name));
        if (missing.length > 0 || extra.length > 0) {
          violations.push({
            pointer: pointer || "<root>",
            reason:
              "required must list exactly the declared properties" +
              (missing.length > 0 ? `; missing ${missing.join(", ")}` : "") +
              (extra.length > 0 ? `; undeclared ${extra.join(", ")}` : ""),
          });
        }
      }
    }
    for (const [key, value] of Object.entries(subschema)) {
      walk(value, `${pointer}/${key}`);
    }
  };
  walk(schema, "");
  return violations;
}

export class StructuredOutputsClosureError extends Error {
  constructor(readonly violations: readonly ClosureViolation[]) {
    super(
      "Derived scoring-pass schema would be rejected by Structured Outputs:\n" +
        violations.map((v) => `  ${v.pointer}: ${v.reason}`).join("\n"),
    );
    this.name = "StructuredOutputsClosureError";
  }
}

export interface ScoringPassSchema {
  readonly name: string;
  readonly strict: true;
  readonly schema: Record<string, unknown>;
  /** The `$defs` entries pulled across, for the equivalence record. */
  readonly includedDefs: readonly string[];
}

/**
 * Build the model-facing scoring-pass schema from the canonical schema.
 *
 * Derived at runtime from the controlled schema bytes rather than hand-written,
 * so it cannot drift from the canonical contract: a canonical field the model
 * owns appears here automatically, and one that is removed disappears here too.
 */
export function buildScoringPassSchema(
  canonical: Record<string, unknown> = loadPackageSchema(),
): ScoringPassSchema {
  const canonicalDefs = canonical.$defs as SchemaNode;
  const pass = canonicalDefs.scoringPass as SchemaNode;
  const passProperties = pass.properties as SchemaNode;

  const wanted = new Set<string>();
  // The model owns the claim ledger and the decisions. It does NOT own the run
  // manifest: role, timing, digests and seed are wrapper facts recorded beside
  // the output, and the prompt says the wrapper assigns primary/audit "only as
  // run metadata after the model output".
  const root: SchemaNode = {
    type: "object",
    additionalProperties: false,
    properties: {
      claim_ledger: toStructuredOutputs(passProperties.claim_ledger, wanted),
      decisions: toStructuredOutputs(passProperties.decisions, wanted),
    },
    required: ["claim_ledger", "decisions"],
  };

  // Transitively pull in every referenced definition.
  const defs: SchemaNode = {};
  const queue = [...wanted];
  while (queue.length > 0) {
    const name = queue.shift()!;
    if (name in defs) continue;
    const found = new Set<string>();
    defs[name] = toStructuredOutputs(canonicalDefs[name], found);
    for (const next of found) if (!(next in defs)) queue.push(next);
  }

  const schema = { ...root, $defs: defs };

  // Fail closed at build time rather than at the API. A schema that violates the
  // closure rule is never returned, so it can never reach a measured run.
  const violations = structuredOutputsClosureViolations(schema);
  if (violations.length > 0) throw new StructuredOutputsClosureError(violations);

  return {
    name: "phase3a_scoring_pass",
    strict: true,
    schema,
    includedDefs: Object.keys(defs).sort(),
  };
}

/** The digest recorded as `output_schema_digest` for the model-facing contract. */
export function scoringPassSchemaDigest(schema: ScoringPassSchema): string {
  return canonicalDigest(schema.schema as never);
}

export interface ModelScoringPass {
  readonly claim_ledger: readonly Claim[];
  readonly decisions: readonly ScoreDecision[];
}

/**
 * Deterministically assemble a canonical `scoringPass` from the model output and
 * the wrapper's own run manifest.
 *
 * Deterministic in the strict sense: it copies. Nothing is reordered, defaulted,
 * coerced or filled in, because any of those would be the harness quietly
 * authoring scoring content. If the model omitted something, the canonical
 * validation that follows rejects the pass — that is the intended outcome, not a
 * problem to smooth over.
 */
export function assembleScoringPass(
  output: ModelScoringPass,
  runManifest: RunManifest,
): ScoringPass {
  return {
    run_manifest: runManifest,
    claim_ledger: output.claim_ledger,
    decisions: output.decisions,
  };
}

/** The digest recorded as `structured_output_digest` for one model response. */
export function structuredOutputDigest(output: ModelScoringPass): string {
  return canonicalDigest(output as never);
}
