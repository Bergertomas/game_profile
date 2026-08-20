import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MANIFEST_PATH as SCRIPT_MANIFEST_PATH,
  OPEN_NEXT_CLI,
  PRODUCTION_BRANCH as SCRIPT_PRODUCTION_BRANCH,
  WRANGLER_CLI,
} from "../scripts/cf-common.mjs";
import { MANIFEST_PATH } from "@/lib/deploy/manifest";
import { PRODUCTION_BRANCH } from "@/lib/site-env";

const ROOT = join(__dirname, "..");

describe("Cloudflare command entry points", () => {
  it("resolves installed JavaScript CLIs instead of platform-specific npx shims", () => {
    expect(existsSync(OPEN_NEXT_CLI)).toBe(true);
    expect(existsSync(WRANGLER_CLI)).toBe(true);
    expect(OPEN_NEXT_CLI).toMatch(/index\.js$/);
    expect(WRANGLER_CLI).toMatch(/wrangler\.js$/);
  });

  /**
   * cf-preview-deploy derives the preview alias length budget from
   * package.json's name, but the Worker is actually named by wrangler.jsonc.
   * If those drift, `<alias>-<worker>` can exceed the 63-byte DNS label and
   * previews break — and a three-way name mismatch is the exact bug that
   * shipped once already.
   */
  it("names the Worker identically in package.json and wrangler.jsonc", () => {
    const packageName = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ).name;
    const wranglerName = JSON.parse(
      readFileSync(join(ROOT, "wrangler.jsonc"), "utf8").replace(
        /^\s*\/\/.*$/gm,
        "",
      ),
    ).name;

    expect(wranglerName).toBe(packageName);
  });

  /**
   * Two constants exist twice, because the deployment scripts are plain `.mjs`
   * and cannot import TypeScript. Duplication is fine; unpinned duplication is
   * not, and both of these fail silently rather than loudly.
   *
   * A `PRODUCTION_BRANCH` that disagrees leaves `cf-deploy.mjs` guarding a
   * branch name the site no longer treats as production — so a preview branch
   * deploys to shouldiplay.gg, or `main` refuses to. A `MANIFEST_PATH` that
   * disagrees leaves `cf:verify` checking an address the artifact does not
   * serve, which passes as a 404 nobody looks at until deployment verification
   * starts reporting that nothing is Live.
   *
   * `cf-common.mjs` already claimed this test existed. It did not.
   */
  it("pins the constants the .mjs scripts duplicate from TypeScript", () => {
    expect(SCRIPT_PRODUCTION_BRANCH).toBe(PRODUCTION_BRANCH);
    expect(SCRIPT_MANIFEST_PATH).toBe(MANIFEST_PATH);
  });
});
