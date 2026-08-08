import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OPEN_NEXT_CLI, WRANGLER_CLI } from "../scripts/cf-common.mjs";

describe("Cloudflare command entry points", () => {
  it("resolves installed JavaScript CLIs instead of platform-specific npx shims", () => {
    expect(existsSync(OPEN_NEXT_CLI)).toBe(true);
    expect(existsSync(WRANGLER_CLI)).toBe(true);
    expect(OPEN_NEXT_CLI).toMatch(/index\.js$/);
    expect(WRANGLER_CLI).toMatch(/wrangler\.js$/);
  });
});
