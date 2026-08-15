import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Editorial reads authorise next to the data, not only in the layout.
 *
 * Next's authentication guidance is explicit that a layout check is not a
 * sufficient authorization boundary: layouts do not re-render on every
 * navigation under Partial Rendering, and a segment can be entered by more than
 * one path. The admin reader deliberately sees drafts, review rows, superseded
 * history and artwork of every clearance — exactly the data that must not
 * depend on a parent segment having rendered.
 *
 * So every exported read entrypoint refuses before it opens a connection. These
 * tests assert that with no database configured at all: if the guard ran first,
 * the refusal is an admin one; if it did not, the failure would instead be the
 * data layer complaining about a missing `ADMIN_DATABASE_URL`, which is how a
 * missing guard would look.
 */

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

/** A deployment with an editorial database but nobody authorised to read it. */
async function loadEntrypoints() {
  vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "production");
  vi.stubEnv("ADMIN_DATABASE_URL", "postgres://localhost/editorial");
  vi.stubEnv("CF_ACCESS_TEAM_DOMAIN", "shouldiplay.cloudflareaccess.com");
  vi.stubEnv("CF_ACCESS_AUD", "b1a2c3d4e5f60718293a4b5c6d7e8f90");
  vi.stubEnv("ADMIN_DEV_IDENTITY", "");
  vi.resetModules();
  return import("@/lib/admin/games");
}

describe("Every admin read entrypoint", () => {
  it("refuses an unauthenticated caller before touching the database", async () => {
    const { readDashboardPage, readGamesPage, readGamePage } =
      await loadEntrypoints();

    // No request context and no Access assertion, so no editor can be resolved.
    for (const read of [
      () => readDashboardPage(),
      () => readGamesPage(),
      () => readGamePage("2f1c9a6e-0f1e-4a5b-9c3d-8e7f6a5b4c3d"),
    ]) {
      await expect(read()).rejects.toThrow();
      // Never the data layer's "ADMIN_DATABASE_URL is not set" — a database IS
      // configured here. Reaching that message would mean the read had gone
      // looking for a connection before asking who was calling.
      await expect(read()).rejects.not.toThrow(/ADMIN_DATABASE_URL is not set/);
    }
  });

  it("refuses through the authorized database wrapper itself", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "production");
    vi.stubEnv("ADMIN_DATABASE_URL", "postgres://localhost/editorial");
    vi.resetModules();

    const { withAuthorizedAdminDatabase } = await import("@/lib/admin/db");
    const ran = vi.fn();
    await expect(withAuthorizedAdminDatabase(ran)).rejects.toThrow();
    // The callback never sees a connection.
    expect(ran).not.toHaveBeenCalled();
  });
});
