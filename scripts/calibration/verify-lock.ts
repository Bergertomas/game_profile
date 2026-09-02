/**
 * `npm run calib:lock` — verify the six Item 3-approved controlled inputs and
 * print the deterministic lock manifest.
 *
 * Read-only. It never rewrites a controlled file, and it exits non-zero on any
 * drift so a caller (or CI) fails closed rather than proceeding on unapproved
 * bytes.
 */
import {
  ControlledInputDriftError,
  verifyControlledInputs,
} from "@/lib/calibration/controlled-inputs";

function main(): void {
  const json = process.argv.includes("--json");
  try {
    const manifest = verifyControlledInputs();
    if (json) {
      process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
      return;
    }
    console.log("Phase 3A controlled-input lock: VERIFIED\n");
    for (const input of manifest.inputs) {
      console.log(`  ${input.path}`);
      console.log(`    role       ${input.role}`);
      console.log(`    git blob   ${input.actualBlobSha}  (Item 3 approved)`);
      console.log(`    sha-256    ${input.sha256}`);
      console.log(`    bytes      ${input.byteLength}`);
    }
    console.log(`\n  lock set digest  ${manifest.lock_set_digest}`);
  } catch (error) {
    if (error instanceof ControlledInputDriftError) {
      console.error(error.message);
      console.error(
        "\nThe Item 3 byte freeze is not intact. This is an owner decision, not an\n" +
          "engineering fix: the preregistration must be amended and re-approved.",
      );
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

main();
