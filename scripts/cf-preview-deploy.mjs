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
 * Aliases must be a valid DNS label: lowercase alphanumerics and hyphens, 63
 * characters at most. Branch names like `claude/brand-seo-e0cvl8` are not, so
 * they are normalised here.
 */
import { buildForCloudflare, run } from "./cf-common.mjs";

const branch = process.env.WORKERS_CI_BRANCH ?? process.env.GIT_BRANCH ?? "";
const alias = toAlias(branch);

console.log(
  alias
    ? `Building for Cloudflare, then uploading a preview version for "${branch}" as alias "${alias}".`
    : "Building for Cloudflare, then uploading a preview version (no branch name available, no alias assigned).",
);

buildForCloudflare();

const args = ["opennextjs-cloudflare", "upload"];
if (alias) args.push("--", "--preview-alias", alias);
run("npx", args);

function toAlias(name) {
  const normalised = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
    .replace(/-+$/g, "");
  // A leading digit is legal in a DNS label but reads badly in a hostname made
  // of two joined parts; anything empty just means "no alias".
  return normalised.length > 0 ? normalised : "";
}
