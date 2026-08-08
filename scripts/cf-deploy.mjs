#!/usr/bin/env node
/**
 * Production deploy: guard, verify, deploy the verified artifact.
 *
 * Self-contained by design — `cf-verify` builds the production Worker and boots
 * that artifact under workerd. The containment check then inspects the same
 * `.open-next/` tree that deploy consumes; nothing rebuilds between verification
 * and upload.
 *
 * The branch guard duplicates the Workers Builds production-branch setting on
 * purpose. Promoting an experiment to shouldiplay.gg is one mis-set dashboard
 * dropdown away and the failure is public, so the rule also lives somewhere it
 * gets code-reviewed.
 *
 * Locally (no WORKERS_CI_BRANCH) the guard stays out of the way: a deliberate
 * `npm run cf:deploy` from a laptop still deploys.
 */
import { PRODUCTION_BRANCH, run, runOpenNext } from "./cf-common.mjs";

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
  `Verifying the production Worker, then deploying that artifact${branch ? ` from "${branch}"` : ""}.`,
);

run(process.execPath, ["scripts/cf-verify.mjs"]);
run(process.execPath, ["--import", "tsx", "scripts/check-build-containment.ts"]);
runOpenNext(["deploy"]);
