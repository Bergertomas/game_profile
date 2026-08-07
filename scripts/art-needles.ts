import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The evaluation-art URLs and hostnames, read out of the art module's source
 * text rather than imported from it.
 *
 * Importing would require the module to export a derived list, and a
 * module-level derived export keeps the URL table alive through tree-shaking —
 * which is exactly the leak `check-build-containment.ts` exists to catch. It was
 * tried, it put all three URLs into a client chunk, and the check caught it.
 * Reading the source leaves the app's bundle graph untouched.
 *
 * Kept in its own module with no side effects so both the CLI and
 * tests/no-committed-artwork.test.ts can use it. That test asserts this parse
 * matches what `evaluationArtFor()` actually returns, so the two cannot drift.
 */
export const ART_MODULE = join("lib", "design-lab", "evaluation-art.ts");

export const ROOT = join(import.meta.dirname, "..");

export function artNeedles(root: string = ROOT): string[] {
  const source = readFileSync(join(root, ART_MODULE), "utf8");
  const urls = [...source.matchAll(/url:\s*"(https:\/\/[^"]+)"/g)].map(
    (m) => m[1]!,
  );
  const hosts = urls.map((url) => new URL(url).hostname);
  return [...new Set([...hosts, ...urls])];
}
