#!/usr/bin/env node
/**
 * Preview deploy: build, upload a version, alias it to the branch.
 *
 * Workers Builds runs this instead of the deploy command for every branch that
 * is not the production branch. `upload` creates a new Worker *version*, which
 * gets its own preview URL, without promoting it to production traffic.
 *
 * Self-contained by design — it builds the Worker it is about to upload rather
 * than trusting whatever a previous CI step left in `.open-next/`. See
 * scripts/cf-common.mjs.
 *
 * The `--preview-alias` gives each branch a stable, readable preview hostname
 * (`<alias>-should-i-play.<subdomain>.workers.dev`) that keeps pointing at that
 * branch's newest version, so a review link stays valid across pushes.
 *
 * Cloudflare requires an alias to begin with a lowercase letter, and the alias
 * plus Worker name must fit in one 63-character DNS label. Branch names like
 * `claude/brand-seo-e0cvl8` are therefore normalised and hashed here.
 */
import { readFileSync } from "node:fs";
import { run, runOpenNextCaptured } from "./cf-common.mjs";
import { toPreviewAlias } from "./cf-preview-alias.mjs";
import {
  checkPreviewAccess,
  previewUrlFrom,
  reportAccess,
} from "./check-preview-access.mjs";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const WORKER_NAME = packageJson.name;
const branch = process.env.WORKERS_CI_BRANCH ?? process.env.GIT_BRANCH ?? "";
const alias = toPreviewAlias(branch, WORKER_NAME);

console.log(
  alias
    ? `Verifying the preview Worker, then uploading that artifact for "${branch}" as alias "${alias}".`
    : "Verifying the preview Worker, then uploading that artifact (no branch name available, no alias assigned).",
);

// Same contract as production: build the artifact, boot it, check what it
// actually serves, then upload that exact `.open-next/` tree. A preview has its
// own obligations — reachable design surfaces, nothing indexable, production
// canonicals, no artwork on a public page — and only the runtime can confirm
// them. cf-verify --preview leaves the built tree in place; nothing rebuilds
// between verification and upload.
run(process.execPath, ["scripts/cf-verify.mjs", "--preview"]);
run(process.execPath, ["--import", "tsx", "scripts/check-build-containment.ts"]);

const args = ["upload"];
if (alias) args.push("--", "--preview-alias", alias);
const uploadOutput = runOpenNextCaptured(args);

// A preview carries evaluation-clearance artwork, and `noindex` is not access
// control. Cloudflare Access is an account-level Zero Trust setting with no
// representation in wrangler.jsonc, so this cannot enable it — but it can stop
// the question being answered by assumption. Advisory on purpose: failing here
// would take away the review surface previews exist to provide.
const previewUrl = previewUrlFrom(uploadOutput);
if (previewUrl) {
  reportAccess(
    previewUrl,
    await checkPreviewAccess(previewUrl).catch(() => "unknown"),
  );
} else {
  console.warn(
    "\nWARNING: no preview URL found in the upload output, so its Cloudflare Access\n" +
      "      state could not be checked. Verify by hand before sharing the link.",
  );
}
