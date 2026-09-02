import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";
import { metadata } from "../app/(public)/compare/page";

/**
 * The URL/index policy (ADR 0033; matrix C-13): the launcher is indexable and
 * canonical at `/compare`; a pair address is `noindex, follow` by response
 * header; no pair is ever in the sitemap; no rating/review schema exists.
 */

describe("the launcher", () => {
  it("is canonical at /compare and does not opt out of the index on its own", () => {
    expect(metadata.alternates?.canonical).toBe("/compare");
    // Indexability is decided by the site environment in the root layout; the
    // launcher adds no `noindex` of its own.
    expect(metadata.robots).toBeUndefined();
    expect(metadata.title).toBe("Compare two Game Profiles");
  });
});

describe("a pair address", () => {
  it("receives X-Robots-Tag: noindex, follow — and only when `games` is present", async () => {
    const headers = await nextConfig.headers!();
    const rule = headers.find((entry) => entry.source === "/compare");
    expect(rule).toBeDefined();
    // The value is what keeps the OpenNext router from matching an absent
    // parameter (see next.config.ts): it must require a non-empty value.
    expect(rule!.has).toEqual([{ type: "query", key: "games", value: ".+" }]);
    expect(new RegExp(rule!.has![0]!.value!).test("")).toBe(false);
    expect(new RegExp(rule!.has![0]!.value!).test("alan-wake-2,returnal")).toBe(true);
    expect(rule!.headers).toEqual([{ key: "x-robots-tag", value: "noindex, follow" }]);
  });
});

describe("the sitemap", () => {
  it("lists the launcher once and never a pair", async () => {
    const { default: sitemap } = await import("../app/sitemap");
    const entries = await sitemap();
    const compare = entries.filter((entry) => entry.url.includes("/compare"));
    expect(compare).toHaveLength(1);
    expect(compare[0]!.url).toBe("https://shouldiplay.gg/compare");
    expect(entries.some((entry) => entry.url.includes("games="))).toBe(false);
  });
});

describe("structured data", () => {
  it("has no Compare graph at all — no rating, review, winner or aggregate", async () => {
    const structured = await import("@/lib/seo/structured-data");
    expect(Object.keys(structured).some((name) => /compare/i.test(name))).toBe(false);
  });
});
