import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OPEN_NEXT_CLI, WRANGLER_CLI } from "../scripts/cf-common.mjs";

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
});
