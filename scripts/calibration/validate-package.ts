/**
 * `npm run calib:validate -- <package.json> [--baseline <baseline.json>]`
 *
 * Validate a scoring package structurally (canonical JSON Schema) and then
 * semantically (Protocol §15.1). Structural failure short-circuits: the semantic
 * validator's arithmetic assumes a package that already fits the schema.
 *
 * Exits non-zero on any failure. There is no `--force`, and no flag that
 * downgrades a rejection to a warning — "semantic-validator failure rejects the
 * whole package" (Protocol §15).
 */
import { readFileSync } from "node:fs";
import { validatePackageStructure } from "@/lib/calibration/package-schema";
import { validatePackageSemantics } from "@/lib/calibration/semantic-validator";
import type { ScoringPackage } from "@/lib/calibration/package-types";

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

function main(): void {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) {
    console.error("usage: calib:validate -- <package.json> [--baseline <baseline.json>]");
    process.exitCode = 2;
    return;
  }
  const baselineIndex = args.indexOf("--baseline");
  const baselineFile = baselineIndex >= 0 ? args[baselineIndex + 1] : undefined;

  const candidate = readJson(file);

  const structural = validatePackageStructure(candidate);
  if (!structural.valid) {
    console.error(`STRUCTURAL FAILURE — ${structural.issues.length} issue(s)\n`);
    for (const issue of structural.issues) {
      console.error(`  ${issue.instancePath || "<root>"}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log("Canonical schema: PASS");

  const semantic = validatePackageSemantics(candidate as ScoringPackage, {
    baseline: baselineFile ? (readJson(baselineFile) as ScoringPackage) : undefined,
  });
  if (!semantic.valid) {
    console.error(`\nSEMANTIC FAILURE — ${semantic.issues.length} issue(s)\n`);
    for (const issue of semantic.issues) {
      console.error(`  [§15.1(${issue.clause}) ${issue.family}] ${issue.path}`);
      console.error(`      ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log("Protocol §15.1 semantic validator: PASS");
}

main();
