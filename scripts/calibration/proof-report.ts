/**
 * `npm run calib:report` — print the safe Item 4 proof report.
 *
 * Read-only, offline and safe to paste into a review: it prints digests,
 * capability findings and ledger counts, never a credential, never model prose,
 * and never a calibration game's content.
 */
import { verifyControlledInputs } from "@/lib/calibration/controlled-inputs";
import {
  buildScoringPassSchema,
  canonicalSchemaCompatibility,
  scoringPassSchemaDigest,
} from "@/lib/calibration/scoring-pass-contract";
import { loadPackageSchema } from "@/lib/calibration/package-schema";
import { readLedger } from "@/lib/calibration/ledger";
import { RUBRIC_SUBCRITERION_KEYS } from "@/lib/calibration/protocol-tables";

function main(): void {
  const lock = verifyControlledInputs();
  const passSchema = buildScoringPassSchema();
  const findings = canonicalSchemaCompatibility(loadPackageSchema());
  const byKeyword = new Map<string, number>();
  for (const finding of findings) {
    byKeyword.set(finding.keyword, (byKeyword.get(finding.keyword) ?? 0) + 1);
  }

  console.log("Phase 3A Item 4 — harness proof report\n");

  console.log("Controlled-input lock (gate 6)");
  for (const input of lock.inputs) {
    console.log(`  ${input.role.padEnd(20)} sha256 ${input.sha256}`);
  }
  console.log(`  ${"lock set".padEnd(20)} sha256 ${lock.lock_set_digest}\n`);

  console.log("Model-facing scoring-pass contract (gate 4)");
  console.log(`  schema name           ${passSchema.name}`);
  console.log(`  schema digest         ${scoringPassSchemaDigest(passSchema)}`);
  console.log(`  definitions included  ${passSchema.includedDefs.length}`);
  console.log(
    `  canonical keywords outside the Structured Outputs subset: ${findings.length} occurrence(s)`,
  );
  for (const [keyword, count] of [...byKeyword].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${keyword.padEnd(20)} ${count}`);
  }
  console.log(
    "  => the canonical package schema cannot be posted unchanged; the derived\n" +
      "     scoring-pass schema is the transport contract and every dropped\n" +
      "     constraint is re-imposed by local canonical + semantic validation.\n",
  );

  console.log("Contract surfaces");
  console.log(`  rubric subcriterion keys  ${RUBRIC_SUBCRITERION_KEYS.length}`);
  console.log("  validators                canonical JSON Schema + Protocol §15.1 semantic\n");

  const ledger = readLedger();
  console.log("Run ledger (gate 7)");
  if (ledger.length === 0) {
    console.log("  no local run artifacts present (expected on a clean checkout)\n");
  } else {
    const outcomes = new Map<string, number>();
    for (const entry of ledger) {
      outcomes.set(entry.outcome, (outcomes.get(entry.outcome) ?? 0) + 1);
    }
    console.log(`  entries  ${ledger.length}`);
    for (const [outcome, count] of outcomes) console.log(`    ${outcome.padEnd(20)} ${count}`);
    const live = ledger.filter((entry) => entry.returned_model !== null);
    if (live.length > 0) {
      const latest = live[live.length - 1]!;
      console.log(`  latest returned model  ${String(latest.returned_model)}`);
      console.log(`  latest api elapsed ms  ${latest.api_elapsed_ms}`);
    }
    console.log("");
  }

  console.log("Boundaries");
  console.log("  no calibration game is researched or scored by any command here");
  console.log("  no production, IGDB, database or publication action is available");
  console.log("  the live probe is opt-in, CI-blocked and output-capped");
}

main();
