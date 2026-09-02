import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "@/next.config";

/**
 * How `/admin` is kept shut, given that a proxy cannot run on this stack.
 *
 * The obvious design was a `proxy.ts` route gate. It cannot deploy: Next 16
 * pins Proxy to the Node.js runtime with no opt-out, and
 * `@opennextjs/cloudflare` rejects Node middleware outright — a build that
 * passes `next build`, the unit suite and `next start` fails at `cf:verify`.
 *
 * So the gate is the admin layout, which calls `requireEditor()` and answers
 * `notFound()` for anything it will not serve, plus `requireEditor()` inside
 * every Server Action. Headers move to static routing config.
 *
 * `tests/e2e/admin.spec.ts` proves the 404 against a real build. What is here
 * is the policy those layers consult, and the header rules that travel with it.
 */

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("Admin response headers", () => {
  it("cover every admin path", async () => {
    const rules = await nextConfig.headers!();
    const admin = rules.find((rule) => rule.source === "/admin/:path*");
    expect(admin).toBeDefined();
  });

  it("tell a crawler not to index, and a cache not to keep, editorial drafts", async () => {
    const rules = await nextConfig.headers!();
    const admin = rules.find((rule) => rule.source === "/admin/:path*")!;
    const byKey = Object.fromEntries(
      admin.headers.map((header) => [header.key, header.value]),
    );

    expect(byKey["x-robots-tag"]).toContain("noindex");
    expect(byKey["cache-control"]).toContain("no-store");
    expect(byKey["referrer-policy"]).toBe("same-origin");
  });

  /**
   * The public site is prerendered and served from deployed assets. A header
   * rule matching `/games/*` would be harmless, but a rule matching everything
   * is how a "just add noindex" edit reaches the public catalogue.
   *
   * One public rule exists on purpose: a Compare PAIR (`/compare` with the
   * `games` query) is `noindex, follow` by ADR 0033. It is conditioned on that
   * query, so the launcher itself is untouched, and it sets no cache policy.
   */
  it("do not reach any public route, beyond the query-conditioned Compare pair rule", async () => {
    const rules = await nextConfig.headers!();
    for (const rule of rules) {
      if (rule.source.startsWith("/admin")) continue;
      expect(rule.source).toBe("/compare");
      expect(rule.has).toEqual([{ type: "query", key: "games" }]);
      expect(rule.headers.map((header) => header.key)).toEqual(["x-robots-tag"]);
      expect(rule.headers[0]!.value).toBe("noindex, follow");
    }
  });
});

describe("The policy the layout and the actions consult", () => {
  async function loadAuth(siteEnv: "production" | "preview") {
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", siteEnv);
    vi.resetModules();
    return import("@/lib/admin/auth");
  }

  it("refuses a deployment carrying no admin configuration", async () => {
    const { adminAvailability } = await loadAuth("production");
    // The deployed default: shipping the editorial tool does not switch it on.
    expect(adminAvailability({}).available).toBe(false);
  });

  it("refuses when the database is configured but nobody can sign in", async () => {
    const { adminAvailability } = await loadAuth("production");
    expect(
      adminAvailability({ ADMIN_DATABASE_URL: "postgres://x/y" }),
    ).toEqual({ available: false, reason: "no-identity-provider" });
  });

  it("refuses when an editor could sign in but there is nothing to edit", async () => {
    const { adminAvailability } = await loadAuth("production");
    expect(
      adminAvailability({
        CF_ACCESS_TEAM_DOMAIN: "shouldiplay.cloudflareaccess.com",
        CF_ACCESS_AUD: "b1a2c3d4e5f60718293a4b5c6d7e8f90",
      }),
    ).toEqual({ available: false, reason: "no-database" });
  });
});
