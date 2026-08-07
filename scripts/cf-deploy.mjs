#!/usr/bin/env node
/**
 * Production deploy: guard, build, deploy.
 *
 * Self-contained by design — it builds the Worker it is about to ship rather
 * than trusting whatever a previous CI step left in `.open-next/`. See
 * scripts/cf-common.mjs.
 *
 * The branch guard duplicates the Workers Builds production-branch setting on
 * purpose. Promoting an experiment to shouldiplay.gg is one mis-set dashboard
 * dropdown away and the failure is public, so the rule also lives somewhere it
 * gets code-reviewed.
 *
 * Locally (no WORKERS_CI_BRANCH) the guard stays out of the way: a deliberate
 * `npm run cf:deploy` from a laptop still deploys.
 */
import { buildForCloudflare, run } from "./cf-common.mjs";

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

console.log(
  `Building for Cloudflare, then deploying to production${branch ? ` from "${branch}"` : ""}.`,
);

buildForCloudflare();
run("npx", ["opennextjs-cloudflare", "deploy"]);
