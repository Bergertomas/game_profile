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
import { buildForCloudflare, runOpenNext } from "./cf-common.mjs";
import { toPreviewAlias } from "./cf-preview-alias.mjs";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const WORKER_NAME = packageJson.name;
const branch = process.env.WORKERS_CI_BRANCH ?? process.env.GIT_BRANCH ?? "";
const alias = toPreviewAlias(branch, WORKER_NAME);

console.log(
  alias
    ? `Building for Cloudflare, then uploading a preview version for "${branch}" as alias "${alias}".`
    : "Building for Cloudflare, then uploading a preview version (no branch name available, no alias assigned).",
);

buildForCloudflare();

const args = ["upload"];
if (alias) args.push("--", "--preview-alias", alias);
runOpenNext(args);
