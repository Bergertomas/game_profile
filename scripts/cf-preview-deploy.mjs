#!/usr/bin/env node
/**
 * Preview deploy command for Cloudflare Workers Builds.
 *
 * Workers Builds runs this instead of the deploy command for every branch that
 * is not the production branch. It uploads a new Worker *version* — which gets
 * its own preview URL — without promoting it to production traffic.
 *
 * The `--preview-alias` gives each branch a stable, readable preview hostname
 * (`<alias>-shouldiplay.<subdomain>.workers.dev`) that keeps pointing at that
 * branch's newest version, so a review link stays valid across pushes.
 *
 * Aliases must be a valid DNS label: lowercase alphanumerics and hyphens, 63
 * characters at most. Branch names like `claude/brand-seo-e0cvl8` are not, so
 * they are normalised here.
 */
import { spawnSync } from "node:child_process";

const branch = process.env.WORKERS_CI_BRANCH ?? process.env.GIT_BRANCH ?? "";
const alias = toAlias(branch);

const args = ["opennextjs-cloudflare", "upload"];
if (alias) args.push("--", "--preview-alias", alias);

console.log(
  alias
    ? `Uploading preview version for "${branch}" as alias "${alias}"`
    : "Uploading preview version (no branch name available, no alias assigned)",
);

const result = spawnSync("npx", args, { stdio: "inherit" });
process.exit(result.status ?? 1);

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
