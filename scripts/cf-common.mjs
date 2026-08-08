/**
 * Shared pieces of the two Cloudflare deployment entry points.
 *
 * Both deployment entry points produce the Worker artifact they ship rather
 * than inheriting whatever the CI provider's build step happened to leave on
 * disk. Production does that through `cf-verify`, which boots and checks the
 * artifact before deploying it; preview does it through `buildForCloudflare`
 * below. `opennextjs-cloudflare deploy` and `upload` both read a compiled OpenNext
 * config from `.open-next/`, which a plain `next build` does not produce — so a
 * script that only deploys fails with
 * "Could not find compiled Open Next config" the moment the surrounding build
 * command is anything other than the OpenNext one.
 *
 * Making each script produce exactly the artifact it ships means the workflow
 * behaves identically on a laptop and in Workers Builds, stays correct whatever
 * the dashboard's build command is set to, and never verifies one build before
 * deploying a different one.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * The branch that owns production. One definition, imported by every script
 * that needs it, so a rename cannot leave a guard checking the old name — the
 * TypeScript side reads it from lib/site-env.ts and tests/cf-command-paths
 * asserts the two agree.
 */
export const PRODUCTION_BRANCH = "main";
export const OPEN_NEXT_CLI = join(
  ROOT,
  "node_modules",
  "@opennextjs",
  "cloudflare",
  "dist",
  "cli",
  "index.js",
);
export const WRANGLER_CLI = join(
  ROOT,
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js",
);

/** Runs a command, streaming its output, and exits the process if it fails. */
export function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) {
    console.error(`Failed to start ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/** Run the installed OpenNext CLI without relying on a platform shell or npx shim. */
export function runOpenNext(args) {
  run(process.execPath, [OPEN_NEXT_CLI, ...args]);
}

/** Produces `.open-next/` — the Worker bundle, its assets and the compiled config. */
export function buildForCloudflare() {
  runOpenNext(["build"]);
}
