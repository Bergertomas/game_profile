import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";

/**
 * The reusable structural validator for the canonical scoring package.
 *
 * The readiness audit's gate 4 finding was that the canonical schema was
 * exercised "inside tests rather than exposed as a reusable harness validation
 * module". This module is that boundary: the execution harness and the schema
 * tests both compile the same on-disk schema through the same Ajv
 * configuration, so there is exactly one structural contract and no second
 * hand-maintained definition to drift against it.
 *
 * The schema file is a controlled input under the Item 3 lock, so it is read,
 * never written, and never inlined into TypeScript.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const PACKAGE_SCHEMA_PATH =
  "docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json";

/** The canonical schema document, exactly as approved. */
export function loadPackageSchema(): Record<string, unknown> {
  const bytes = readFileSync(path.join(REPO_ROOT, PACKAGE_SCHEMA_PATH), "utf8");
  return JSON.parse(bytes) as Record<string, unknown>;
}

/**
 * `strict: false` matches the schema's own dialect usage (it leans on
 * `allOf`/`if`-`then` sibling keywords that Ajv's strict mode warns about).
 * Closed-schema behaviour does NOT come from this flag — it comes from the
 * schema's own `additionalProperties: false`, which is preserved untouched.
 */
function buildAjv(): Ajv2020 {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  return ajv;
}

let cached: { ajv: Ajv2020; schema: Record<string, unknown> } | null = null;

function instance(): { ajv: Ajv2020; schema: Record<string, unknown> } {
  if (cached) return cached;
  const schema = loadPackageSchema();
  const ajv = buildAjv();
  // Compiling registers the document and validates it against the 2020-12
  // metaschema, so a structurally broken schema fails here rather than at use.
  ajv.addSchema(schema);
  cached = { ajv, schema };
  return cached;
}

/** Reset the compiled-schema cache. Test-only; the harness never needs it. */
export function resetPackageSchemaCache(): void {
  cached = null;
}

export interface StructuralIssue {
  /** JSON pointer into the instance. */
  readonly instancePath: string;
  /** JSON pointer into the schema. */
  readonly schemaPath: string;
  readonly message: string;
}

export interface StructuralResult {
  readonly valid: boolean;
  readonly issues: readonly StructuralIssue[];
}

function toIssues(errors: ErrorObject[] | null | undefined): StructuralIssue[] {
  return (errors ?? []).map((error) => ({
    instancePath: error.instancePath,
    schemaPath: error.schemaPath,
    message: error.message ?? error.keyword,
  }));
}

/**
 * Compile a validator for one `$defs` entry, or any JSON pointer into the
 * schema. Used by targeted contract tests; the harness validates whole packages.
 */
export function validatorFor(pointer: string): ValidateFunction {
  const { ajv, schema } = instance();
  return ajv.compile({ $ref: `${schema.$id as string}#${pointer}` });
}

let wholePackage: ValidateFunction | null = null;

/** Validate a complete package against the canonical schema. */
export function validatePackageStructure(candidate: unknown): StructuralResult {
  if (!wholePackage) {
    const { ajv, schema } = instance();
    wholePackage = ajv.compile({ $ref: schema.$id as string });
  }
  const valid = wholePackage(candidate) as boolean;
  return { valid, issues: valid ? [] : toIssues(wholePackage.errors) };
}

/** Fail-closed wrapper: structural failure raises rather than returning false. */
export class PackageStructureError extends Error {
  constructor(readonly issues: readonly StructuralIssue[]) {
    super(
      `Scoring package failed canonical schema validation:\n` +
        issues.map((i) => `  ${i.instancePath || "<root>"}: ${i.message}`).join("\n"),
    );
    this.name = "PackageStructureError";
  }
}

export function assertPackageStructure(candidate: unknown): void {
  const result = validatePackageStructure(candidate);
  if (!result.valid) throw new PackageStructureError(result.issues);
}
