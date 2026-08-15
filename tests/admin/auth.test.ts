import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Whether the editorial tool exists in a given deployment, and who gets in.
 *
 * The property under test throughout is FAIL CLOSED. Every question here has a
 * safe answer and a convenient one, and the tests exist because the convenient
 * one is what a refactor drifts towards: a missing variable becoming "skip the
 * check", a development identity surviving into a production bundle, an
 * unverifiable token falling through to an unauthenticated editor.
 */

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

/** A fresh module graph, because `SITE_ENV` folds at import time. */
async function loadAuth(siteEnv: "production" | "preview") {
  vi.stubEnv("NEXT_PUBLIC_SITE_ENV", siteEnv);
  vi.resetModules();
  return import("@/lib/admin/auth");
}

const ACCESS = {
  CF_ACCESS_TEAM_DOMAIN: "shouldiplay.cloudflareaccess.com",
  CF_ACCESS_AUD: "b1a2c3d4e5f60718293a4b5c6d7e8f90",
};
const DATABASE = { ADMIN_DATABASE_URL: "postgres://localhost/editorial" };

describe("Whether the admin exists at all", () => {
  it("does not, with no identity provider", async () => {
    const { adminAvailability } = await loadAuth("production");
    expect(adminAvailability({ ...DATABASE })).toEqual({
      available: false,
      reason: "no-identity-provider",
    });
  });

  it("does not, with no request-time database", async () => {
    const { adminAvailability } = await loadAuth("production");
    expect(adminAvailability({ ...ACCESS })).toEqual({
      available: false,
      reason: "no-database",
    });
  });

  it("does, with both", async () => {
    const { adminAvailability } = await loadAuth("production");
    expect(adminAvailability({ ...ACCESS, ...DATABASE })).toEqual({
      available: true,
    });
  });

  /**
   * The deployed default, and the whole point of the arrangement: shipping this
   * branch changes nothing about the deployed Worker. No Access application, no
   * database secret, no editorial surface.
   */
  it("does not, in a deployment configured for neither", async () => {
    const { adminAvailability } = await loadAuth("production");
    expect(adminAvailability({}).available).toBe(false);
  });
});

describe("The request-time database", () => {
  it("is a different variable from the build-time one", async () => {
    const { adminDatabaseUrl } = await loadAuth("preview");
    // `DATABASE_URL` is the public read path's BUILD variable (ADR 0017).
    // Provisioning production Postgres must not switch on a request-time
    // editorial surface in the Worker as a side effect.
    expect(adminDatabaseUrl({ DATABASE_URL: "postgres://build/only" })).toBeNull();
    expect(adminDatabaseUrl({ ...DATABASE })).toBe(
      "postgres://localhost/editorial",
    );
  });

  it("treats an empty value as absent", async () => {
    const { adminDatabaseUrl } = await loadAuth("preview");
    expect(adminDatabaseUrl({ ADMIN_DATABASE_URL: "   " })).toBeNull();
  });
});

describe("The development identity", () => {
  const DEV = { NODE_ENV: "development", ADMIN_DEV_IDENTITY: "tomas@example.com" };

  it("works under a developer's own next dev", async () => {
    const { developmentIdentity } = await loadAuth("preview");
    expect(developmentIdentity(DEV)).toEqual({
      email: "tomas@example.com",
      source: "development",
    });
  });

  /**
   * `SITE_ENV` is substituted textually at build time, so in a production
   * bundle this branch is unreachable — no value of `ADMIN_DEV_IDENTITY` can
   * conjure an unauthenticated editor.
   */
  it("cannot exist in a production build, whatever the environment says", async () => {
    const { developmentIdentity, adminAvailability } = await loadAuth("production");
    expect(developmentIdentity({ ...DEV, ADMIN_DEV_IDENTITY: "attacker@example.com" })).toBeNull();
    expect(
      adminAvailability({ ...DEV, ADMIN_DEV_IDENTITY: "attacker@example.com", ...DATABASE }),
    ).toEqual({ available: false, reason: "no-identity-provider" });
  });

  /**
   * THE ONE THAT MATTERS MOST HERE.
   *
   * A Cloudflare branch preview is a non-production site environment AND a
   * production-compiled build on a publicly reachable hostname. Keying the
   * development identity on "not production" alone would mean a preview
   * carrying `ADMIN_DEV_IDENTITY` and a database authenticated every request as
   * that named editor — without authenticating the requester at all. A remote
   * deployment must require Cloudflare Access whether or not it is production.
   */
  it("cannot exist on a deployed preview, which is remotely reachable", async () => {
    const { developmentIdentity, adminAvailability } = await loadAuth("preview");
    // A preview is built with `next build`, so NODE_ENV is production.
    const previewEnv = {
      NODE_ENV: "production",
      ADMIN_DEV_IDENTITY: "anyone@example.com",
      ...DATABASE,
    };

    expect(developmentIdentity(previewEnv)).toBeNull();
    expect(adminAvailability(previewEnv)).toEqual({
      available: false,
      reason: "no-identity-provider",
    });
  });

  it("still lets a preview run the admin, but only behind Access", async () => {
    const { adminAvailability } = await loadAuth("preview");
    expect(
      adminAvailability({ NODE_ENV: "production", ...ACCESS, ...DATABASE }),
    ).toEqual({ available: true });
  });
});

describe("Resolving the editor for a request", () => {
  it("uses the development identity only where Access is not configured", async () => {
    const { resolveEditor } = await loadAuth("preview");
    await expect(
      resolveEditor(new Headers(), {
        ...DATABASE,
        NODE_ENV: "development",
        ADMIN_DEV_IDENTITY: "dev@example.com",
      }),
    ).resolves.toEqual({ email: "dev@example.com", source: "development" });
  });

  /**
   * The failure this prevents: Access configured but the assertion missing or
   * invalid — a bypassed edge, a policy on the wrong hostname, an expired
   * token — silently falling back to a development identity that also happens
   * to be set. Configured Access is the only authority once it exists.
   */
  it("refuses rather than falling back when Access is configured", async () => {
    const { resolveEditor } = await loadAuth("preview");
    await expect(
      resolveEditor(new Headers(), {
        ...ACCESS,
        ...DATABASE,
        NODE_ENV: "development",
        ADMIN_DEV_IDENTITY: "dev@example.com",
      }),
    ).resolves.toBeNull();
  });

  it("refuses an assertion that does not verify", async () => {
    const { resolveEditor } = await loadAuth("preview");
    const headers = new Headers({
      "cf-access-jwt-assertion": "clearly.not.valid",
    });
    await expect(
      resolveEditor(headers, { ...ACCESS, ...DATABASE }),
    ).resolves.toBeNull();
  });
});

describe("Explaining an unavailable admin", () => {
  it("names the variable an operator has to set", async () => {
    const { explainUnavailable } = await loadAuth("preview");
    expect(explainUnavailable("no-identity-provider")).toContain("CF_ACCESS_AUD");
    expect(explainUnavailable("no-identity-provider")).toContain("ADMIN_DEV_IDENTITY");
    expect(explainUnavailable("no-database")).toContain("ADMIN_DATABASE_URL");
  });
});
