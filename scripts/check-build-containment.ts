#!/usr/bin/env tsx
/**
 * Build-artifact containment check. Run after a production build.
 *
 * D3 references third-party key art by URL, held for evaluation only and never
 * licensed. Two guards keep it out of production — the `/design-lab` layout
 * calls `notFound()` in a production build, and `evaluationArtFor()` returns
 * null when NODE_ENV is "production" — but both live in source, and source
 * guards are exactly the kind of thing a refactor quietly removes.
 *
 * This checks the artefact instead of the intent: if any evaluation-art
 * hostname or URL can be found in anything the deploy actually serves, the
 * build fails. It is the same class of guard as tests/no-committed-artwork.ts,
 * moved one step later in the pipeline.
 *
 * Scope is deliberately narrow: build output only. Repository documentation is
 * *supposed* to name these URLs — docs/design/d3/ASSET-PROVENANCE.md is the
 * rights record — and is never deployed.
 *
 * Pure Node and path-joined throughout, so it behaves the same on any platform.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { ROOT, artNeedles } from "./art-needles";

/**
 * Roots that end up in front of a browser.
 *
 * `.next` is the Next.js build; `.open-next` is what the Cloudflare Worker
 * actually ships (see docs/decisions/0008-cloudflare-hosting.md). Whichever
 * exist get scanned, so the check is useful after `npm run build` alone and
 * stricter after `npm run cf:build`.
 */
const ROOTS = [
  join(".next", "static"),
  join(".next", "server"),
  join(".open-next", "assets"),
  join(".open-next", "worker.js"),
  join(".open-next", "server-functions"),
  join(".open-next", "middleware"),
];

/** Text formats a browser or the Worker can receive. */
const SCANNED = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".html",
  ".rsc",
  ".txt",
  ".css",
  ".meta",
  ".body",
  ".xml",
]);

/**
 * Source maps are not scanned by default: `productionBrowserSourceMaps` is off,
 * so Next emits maps only for the server build, which is never served. A map
 * inside a *served* asset directory is a different matter and is scanned — that
 * one would reach a browser.
 */
function isSkippableSourceMap(relPath: string): boolean {
  if (!relPath.endsWith(".map")) return false;
  const servedAssetDir = join(".open-next", "assets");
  return !relPath.startsWith(servedAssetDir + sep);
}

function walk(target: string): string[] {
  if (!existsSync(target)) return [];
  if (!statSync(target).isDirectory()) return [target];
  return readdirSync(target).flatMap((entry) => walk(join(target, entry)));
}

const NEEDLES = artNeedles();

if (NEEDLES.length === 0) {
  console.error(
    "check-build-containment: no evaluation-art URLs to look for.\n" +
      "Either the art module is empty or its shape changed. Refusing to\n" +
      "report a pass, because a check with nothing to check is not a pass.",
  );
  process.exit(1);
}

const scannedRoots: string[] = [];
const violations: { file: string; needle: string; line: number }[] = [];
let filesScanned = 0;

for (const root of ROOTS) {
  const absolute = join(ROOT, root);
  if (!existsSync(absolute)) continue;
  scannedRoots.push(root);

  for (const file of walk(absolute)) {
    const rel = relative(ROOT, file);
    if (isSkippableSourceMap(rel)) continue;
    const ext = extname(file);
    if (ext && !SCANNED.has(ext) && !rel.endsWith(".map")) continue;

    let text: string;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue; // Binary or unreadable: cannot carry a URL as text.
    }
    filesScanned += 1;

    for (const needle of NEEDLES) {
      const at = text.indexOf(needle);
      if (at === -1) continue;
      violations.push({
        file: rel,
        needle,
        line: text.slice(0, at).split("\n").length,
      });
    }
  }
}

if (scannedRoots.length === 0) {
  console.error(
    "check-build-containment: found no build output to scan.\n" +
      "Run `npm run build` (or `npm run cf:build`) first — this check must not\n" +
      "pass by looking at nothing.",
  );
  process.exit(1);
}

console.log(
  `check-build-containment: scanned ${filesScanned} files across ${scannedRoots.join(", ")} ` +
    `for ${NEEDLES.length} evaluation-art needles.`,
);

if (violations.length > 0) {
  console.error(
    `\nFAIL: evaluation artwork reached deployable output in ${violations.length} place(s).\n` +
      `This artwork is not licensed and must never be requested from a public page.\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  contains  ${v.needle}`);
  }
  console.error(
    "\nCheck that app/design-lab/layout.tsx still calls notFound() in production\n" +
      "and that evaluationArtFor() still returns null there.",
  );
  process.exit(1);
}

console.log("PASS: no evaluation-art hostname or URL in deployable output.");
