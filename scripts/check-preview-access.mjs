#!/usr/bin/env node
/**
 * Is this preview URL behind Cloudflare Access?
 *
 * `noindex` is discoverability control, not access control. A preview carrying
 * evaluation-clearance artwork is a public display to anyone holding the URL,
 * and ADR 0010 says such a preview should be Access-protected. Access itself is
 * an account-level Zero Trust setting with no representation in
 * `wrangler.jsonc`, so this repository cannot turn it on.
 *
 * What it can do is stop the question being answered by assumption. An
 * unauthenticated request to an Access-protected host is redirected to the
 * account's `*.cloudflareaccess.com` login; an unprotected one simply serves
 * the page. So the deploy asks, out loud, every time.
 *
 * Deliberately advisory. Failing the deploy on an unprotected preview would
 * remove the review surface the previews exist to provide, which trades a real
 * capability for a warning — see the "smallest principled adaptation" note in
 * ADR 0012.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** How an unauthenticated fetch of the URL came back. */
export function classifyAccessResponse(response) {
  const location = response.headers.get("location") ?? "";
  if (
    response.status >= 300 &&
    response.status < 400 &&
    /(^|\.)cloudflareaccess\.com/i.test(hostOf(location))
  ) {
    return "protected";
  }
  if (response.status === 403 && response.headers.has("cf-access-jwt-assertion")) {
    return "protected";
  }
  if (response.status >= 200 && response.status < 400) return "open";
  return "unknown";
}

function hostOf(value) {
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

export async function checkPreviewAccess(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, { redirect: "manual" });
  return classifyAccessResponse(response);
}

/** The first workers.dev URL in a wrangler/OpenNext transcript, if any. */
export function previewUrlFrom(output) {
  const match = output.match(/https:\/\/[^\s"'<>()]*\.workers\.dev[^\s"'<>()]*/);
  return match ? match[0].replace(/[.,]$/, "") : null;
}

const PROTECTED_NOTE =
  "Preview URL is behind Cloudflare Access. Evaluation-clearance artwork on it is an internal display.";
const OPEN_NOTE =
  "Preview URL answers an unauthenticated request.\n" +
  "      It carries evaluation-clearance artwork, and `noindex` is not access control.\n" +
  "      Enable it once, account-wide: Cloudflare dashboard -> Workers & Pages ->\n" +
  "      should-i-play -> Settings -> Domains & Routes -> Preview URLs ->\n" +
  "      Enable Cloudflare Access, then authorise the reviewing email addresses.\n" +
  "      Until then, treat preview links as shareable-but-public and do not post\n" +
  "      them anywhere durable.";

export function reportAccess(url, verdict) {
  switch (verdict) {
    case "protected":
      console.log(`\nPASS: ${PROTECTED_NOTE}\n      ${url}`);
      return;
    case "open":
      console.warn(`\nWARNING: ${OPEN_NOTE}\n      ${url}`);
      return;
    default:
      console.warn(
        `\nWARNING: could not determine whether ${url} is Access-protected.\n` +
          "      Check it by hand before sharing the link.",
      );
  }
}

// Run directly: `node scripts/check-preview-access.mjs <url>`.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: node scripts/check-preview-access.mjs <preview-url>");
    process.exit(2);
  }
  reportAccess(url, await checkPreviewAccess(url).catch(() => "unknown"));
}
