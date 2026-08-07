#!/usr/bin/env node
/**
 * Production deploy command for Cloudflare Workers Builds.
 *
 * Promoting a branch to production is a one-line dashboard misconfiguration
 * away, and the symptom — an experiment answering on shouldiplay.gg — is the
 * thing we most need not to happen. So the branch check lives here too, in the
 * repository, rather than only in a dashboard setting nobody re-reads.
 *
 * Locally (no WORKERS_CI_BRANCH) this does not get in the way: a deliberate
 * `npm run cf:deploy` from a laptop still deploys.
 */
import { spawnSync } from "node:child_process";

const PRODUCTION_BRANCH = "main";
const branch = process.env.WORKERS_CI_BRANCH;

if (branch && branch !== PRODUCTION_BRANCH) {
  console.error(
    `Refusing to deploy "${branch}" to production.\n` +
      `Only "${PRODUCTION_BRANCH}" deploys to production; every other branch uploads a\n` +
      `preview version instead. Set the Workers Builds non-production branch deploy\n` +
      `command to "npm run cf:deploy-preview".`,
  );
  process.exit(1);
}

const result = spawnSync("npx", ["opennextjs-cloudflare", "deploy"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
