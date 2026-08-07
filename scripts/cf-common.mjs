/**
 * Shared pieces of the two Cloudflare deployment entry points.
 *
 * Both `cf:deploy` and `cf:deploy-preview` build the Worker themselves rather
 * than inheriting whatever the CI provider's build step happened to leave on
 * disk. `opennextjs-cloudflare deploy` and `upload` both read a compiled
 * OpenNext config from `.open-next/`, which a plain `next build` does not
 * produce — so a script that only deploys fails with
 * "Could not find compiled Open Next config" the moment the surrounding build
 * command is anything other than the OpenNext one.
 *
 * Making each script produce exactly the artifact it ships means the workflow
 * behaves identically on a laptop and in Workers Builds, and stays correct
 * whatever the dashboard's build command is set to.
 */
import { spawnSync } from "node:child_process";

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

/** Produces `.open-next/` — the Worker bundle, its assets and the compiled config. */
export function buildForCloudflare() {
  run("npx", ["opennextjs-cloudflare", "build"]);
}
