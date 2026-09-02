/**
 * `npm run calib:pair -- <semantic-input.json> [--primary-seed N --audit-seed M]`
 *
 * Build the paired primary/audit scoring requests from one semantic input and
 * prove the pair invariants over what comes out.
 *
 * The demonstration matters as much as the check: both requests come from the
 * same builder and the same input, and the role is never an argument to it, so
 * the identity being verified is a property of the construction rather than
 * something the harness asserts about itself afterwards.
 */
import { readFileSync } from "node:fs";
import {
  buildScoringRequest,
  checkPairInvariants,
  manifestSeed,
  type SemanticInput,
} from "@/lib/calibration/request-builder";

function numberFlag(name: string): number | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : undefined;
}

function main(): void {
  const file = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  if (!file) {
    console.error("usage: calib:pair -- <semantic-input.json> [--primary-seed N --audit-seed M]");
    process.exitCode = 2;
    return;
  }
  const semanticInput = JSON.parse(readFileSync(file, "utf8")) as SemanticInput;
  const maxOutputTokens = numberFlag("--max-output-tokens") ?? 32_000;
  const primarySeed = numberFlag("--primary-seed");
  const auditSeed = numberFlag("--audit-seed");

  const primary = buildScoringRequest({ semanticInput, maxOutputTokens, seed: primarySeed });
  const audit = buildScoringRequest({ semanticInput, maxOutputTokens, seed: auditSeed });

  const issues = checkPairInvariants(primary, audit);

  console.log("Paired scoring request invariants\n");
  console.log(`  semantic request digest   ${primary.digests.semantic_request_digest}`);
  console.log(`  normalized packet digest  ${primary.digests.normalized_packet_digest}`);
  console.log(`  output schema digest      ${primary.digests.output_schema_digest}`);
  console.log(`  instruction bytes         ${primary.instructions.length}`);
  console.log(`  semantic input bytes      ${primary.input.length}`);
  console.log(`  primary seed              ${String(manifestSeed(primarySeed))}`);
  console.log(`  audit seed                ${String(manifestSeed(auditSeed))}`);

  if (issues.length > 0) {
    console.error(`\nPAIR INVARIANT FAILURE — ${issues.length} issue(s)\n`);
    for (const issue of issues) console.error(`  ${issue.field}: ${issue.message}`);
    process.exitCode = 1;
    return;
  }
  console.log("\n  PASS — paired requests are byte-identical except an exposed seed.");
}

main();
