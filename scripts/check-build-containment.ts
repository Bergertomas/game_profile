#!/usr/bin/env tsx
/**
 * Build-artifact containment check. Run after a production build.
 *
 * D3 references third-party key art by URL, held for evaluation only and never
 * licensed. Two guards keep it off the public site — the `/design-lab` layout
 * calls `notFound()` and `evaluationArtFor()` returns null wherever
 * `DESIGN_SURFACES_ENABLED` is false — but both live in source, and source
 * guards are exactly the kind of thing a refactor quietly removes.
 *
 * This checks the artefact instead of the intent. What counts as a violation
 * depends on which site environment was built, because the two builds have
 * genuinely different rules:
 *
 *   production — the artwork must appear NOWHERE in deployable output. The
 *     lab 404s, the art table is dead code, and anything that survived is a
 *     leak.
 *   preview — the lab is the point, so JavaScript chunks may carry the URLs.
 *     What must still hold is that no *public* page references them: the home
 *     page, /methodology, any /games/<slug>, the sitemap and robots.txt are the
 *     same documents production will serve, and none of them has any business
 *     naming uncleared artwork in any environment.
 *
 * The build's own environment is read back out of the artefact (the prerendered
 * robots.txt body) and cross-checked against what this process resolves, so the
 * check cannot grade a production build under preview rules because a shell
 * variable went missing.
 *
 * Scope is deliberately narrow: build output only. Repository documentation is
 * *supposed* to name these URLs — docs/design/d3/ASSET-PROVENANCE.md is the
 * rights record — and is never deployed.
 *
 * Pure Node and path-joined throughout, so it behaves the same on any platform.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { resolveSiteEnv, type SiteEnv } from "../lib/site-env";
import { ROOT, artNeedles } from "./art-needles";

/**
 * Prerendered documents that are public on production, whatever environment
 * built them. These may never name evaluation artwork.
 */
const PUBLIC_SURFACE = [
  join(".next", "server", "app", "index.html"),
  join(".next", "server", "app", "methodology.html"),
  join(".next", "server", "app", "sitemap.xml.body"),
  join(".next", "server", "app", "robots.txt.body"),
];

function isPublicSurface(relPath: string): boolean {
  if (PUBLIC_SURFACE.includes(relPath)) return true;
  const gamesDir = join(".next", "server", "app", "games") + sep;
  return relPath.startsWith(gamesDir);
}

/**
 * Which environment the build on disk was made for, read from the artefact.
 *
 * `robots.txt` is the honest witness: a production build serves `Allow: /` and
 * a preview build serves `Disallow: /`, and both are decided by the same
 * `SITE_ENV` this check needs to know about. Returns null when there is no
 * build to read.
 */
function siteEnvFromArtefact(): SiteEnv | null {
  const robots = join(ROOT, ".next", "server", "app", "robots.txt.body");
  if (!existsSync(robots)) return null;
  const body = readFileSync(robots, "utf8");
  if (body.includes("Allow: /")) return "production";
  if (body.includes("Disallow: /")) return "preview";
  return null;
}

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

/*
 * The artefact decides which rules apply, because the artefact is what ships.
 *
 * Reading it from `process.env` instead would misgrade the ordinary case:
 * `cf:deploy` builds production inside `cf-verify` and then runs this check
 * from a shell that has no `NEXT_PUBLIC_SITE_ENV` at all, which resolves to
 * "preview" and would quietly apply the weaker rules to a production build.
 *
 * An *explicit* disagreement is still worth refusing — someone who typed
 * `NEXT_PUBLIC_SITE_ENV=production` and is looking at a preview build has a
 * problem worth stopping for.
 */
const explicitEnv = process.env.NEXT_PUBLIC_SITE_ENV;
const builtEnv = siteEnvFromArtefact();

if (
  builtEnv !== null &&
  (explicitEnv === "production" || explicitEnv === "preview") &&
  explicitEnv !== builtEnv
) {
  console.error(
    `check-build-containment: refusing to grade this build.\n` +
      `  NEXT_PUBLIC_SITE_ENV says "${explicitEnv}".\n` +
      `  The build output on disk was made as "${builtEnv}".\n` +
      `They must agree, because the two are held to different rules. Rebuild\n` +
      `with the environment you mean to check.`,
  );
  process.exit(1);
}

const siteEnv: SiteEnv = builtEnv ?? resolveSiteEnv(process.env);

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

    // A preview build is *supposed* to carry the lab and its artwork; only the
    // public documents are held to the production rule there.
    if (siteEnv === "preview" && !isPublicSurface(rel)) continue;

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
  `check-build-containment: ${siteEnv} build — scanned ${filesScanned} files across ` +
    `${scannedRoots.join(", ")} for ${NEEDLES.length} evaluation-art needles ` +
    `(${siteEnv === "production" ? "all deployable output" : "public documents only"}).`,
);

if (violations.length > 0) {
  console.error(
    `\nFAIL: evaluation artwork reached ${siteEnv === "production" ? "deployable output" : "a public page"} ` +
      `in ${violations.length} place(s).\n` +
      `This artwork is not licensed and must never be requested from a public page.\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  contains  ${v.needle}`);
  }
  console.error(
    "\nCheck that app/design-lab/layout.tsx still calls notFound() when\n" +
      "DESIGN_SURFACES_ENABLED is false, that evaluationArtFor() still returns\n" +
      "null there, and that no public page renders evaluation artwork.",
  );
  process.exit(1);
}

console.log(
  siteEnv === "production"
    ? "PASS: no evaluation-art hostname or URL in deployable output."
    : "PASS: no evaluation-art hostname or URL on any public page.",
);
