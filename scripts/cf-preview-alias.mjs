import { createHash } from "node:crypto";

const HOST_LABEL_LIMIT = 63;
const HASH_LENGTH = 10;

/**
 * Turn a Git branch name into a stable Cloudflare preview alias.
 *
 * Cloudflare is stricter than a generic DNS label here: an alias must begin
 * with a lowercase letter, and `<alias>-<worker-name>` must fit in one 63-byte
 * label. A hash is always retained so branch names that normalise to the same
 * text (for example `feature/a-b` and `feature-a/b`) cannot steal each other's
 * persistent preview URL.
 */
export function toPreviewAlias(branchName, workerName) {
  assertWorkerName(workerName);
  if (!branchName) return "";

  const maxAliasLength = HOST_LABEL_LIMIT - workerName.length - 1;
  const suffix = `-${shortHash(branchName)}`;
  if (maxAliasLength < suffix.length + 1) {
    throw new Error(
      `Worker name "${workerName}" leaves no room for a valid preview alias.`,
    );
  }

  let stem = branchName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!stem) stem = "branch";
  if (!/^[a-z]/.test(stem)) stem = `b-${stem}`;

  const maxStemLength = maxAliasLength - suffix.length;
  stem = stem.slice(0, maxStemLength).replace(/-+$/g, "");
  if (!stem) stem = "b";

  return `${stem}${suffix}`;
}

function shortHash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, HASH_LENGTH);
}

function assertWorkerName(workerName) {
  if (
    typeof workerName !== "string" ||
    workerName.length === 0 ||
    workerName.length > HOST_LABEL_LIMIT ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(workerName)
  ) {
    throw new Error(`Invalid Cloudflare Worker name: "${workerName}".`);
  }
}
