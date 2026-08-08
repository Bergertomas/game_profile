import { describe, expect, it } from "vitest";
import { toPreviewAlias } from "../scripts/cf-preview-alias.mjs";

const WORKER_NAME = "should-i-play";

describe("Cloudflare preview aliases", () => {
  it("leaves an unidentified local build without an alias", () => {
    expect(toPreviewAlias("", WORKER_NAME)).toBe("");
  });

  it("normalises a branch and keeps the result stable", () => {
    const branch = "Codex/review hardening";
    const alias = toPreviewAlias(branch, WORKER_NAME);

    expect(alias).toMatch(/^codex-review-hardening-[a-f0-9]{10}$/);
    expect(toPreviewAlias(branch, WORKER_NAME)).toBe(alias);
  });

  it("prefixes branches that would begin with a digit", () => {
    expect(toPreviewAlias("123/fix", WORKER_NAME)).toMatch(
      /^b-123-fix-[a-f0-9]{10}$/,
    );
  });

  it("fits the complete alias-worker hostname label within 63 characters", () => {
    const alias = toPreviewAlias(
      `feature/${"very-long-branch-".repeat(8)}`,
      WORKER_NAME,
    );

    expect(`${alias}-${WORKER_NAME}`).toHaveLength(63);
    expect(alias).toMatch(/^[a-z][a-z0-9-]*[a-z0-9]$/);
  });

  it("does not collide when distinct branches normalise to the same text", () => {
    const first = toPreviewAlias("feature/a-b", WORKER_NAME);
    const second = toPreviewAlias("feature-a/b", WORKER_NAME);

    expect(first.replace(/-[a-f0-9]{10}$/, "")).toBe(
      second.replace(/-[a-f0-9]{10}$/, ""),
    );
    expect(first).not.toBe(second);
  });

  it("rejects a Worker name that cannot form the documented hostname", () => {
    expect(() => toPreviewAlias("feature/x", "-invalid-")).toThrow(
      /Invalid Cloudflare Worker name/,
    );
    expect(() => toPreviewAlias("feature/x", "a".repeat(54))).toThrow(
      /leaves no room/,
    );
  });
});
