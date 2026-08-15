import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ScopeSwitcher, type ScopeLink } from "@/components/profile/ScopeSwitcher";

/**
 * Sibling navigation for a game with more than one published profile.
 *
 * Master Plan §4.5 locks the requirement and leaves placement to applied
 * design, so what is asserted here is behaviour rather than layout: which
 * addresses it links to, that it says which one you are reading, and that it is
 * absent for the ordinary single-scope game.
 *
 * The absence branch is not a trivial case. Almost the whole catalogue has one
 * evaluated experience, so a switcher that rendered a single-option chooser
 * would ask every reader to consider a distinction that does not exist for the
 * game in front of them.
 */

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

function render(scopes: readonly ScopeLink[], gameTitle = "The Long Dark") {
  return renderToStaticMarkup(
    createElement(ScopeSwitcher, { scopes, gameTitle }),
  );
}

const SURVIVAL: ScopeLink = {
  key: "survival",
  label: "Survival",
  summary: "The open-ended survival sandbox. The story mode is outside this scope.",
  href: "/games/the-long-dark",
  isCurrent: true,
};

const WINTERMUTE: ScopeLink = {
  key: "wintermute",
  label: "Wintermute",
  summary: "The authored story campaign.",
  href: "/games/the-long-dark/wintermute",
  isCurrent: false,
};

describe("A game with one evaluated experience", () => {
  it("renders nothing at all", () => {
    expect(render([])).toBe("");
    expect(render([{ ...SURVIVAL, summary: undefined }])).toBe("");
  });
});

describe("A game with several evaluated experiences", () => {
  it("offers every scope", () => {
    const html = render([SURVIVAL, WINTERMUTE]);
    expect(html).toContain("Survival");
    expect(html).toContain("Wintermute");
  });

  /**
   * Each entry points at that profile's OWN canonical URL. A query parameter or
   * a client-side swap would put two evaluations on one address, making one of
   * them unlinkable and invisible to a crawler (ADR 0016).
   */
  it("links each sibling to its own canonical address", () => {
    const html = render([SURVIVAL, WINTERMUTE]);
    expect(html).toContain('href="/games/the-long-dark/wintermute"');
    expect(html).not.toMatch(/\?scope=/);
  });

  it("marks the current scope and does not link it to itself", () => {
    const html = render([SURVIVAL, WINTERMUTE]);
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain('href="/games/the-long-dark"');
  });

  it("marks the sibling as current when the sibling is the page", () => {
    const html = render([
      { ...SURVIVAL, isCurrent: false },
      { ...WINTERMUTE, isCurrent: true },
    ]);
    // The primary is now the link, and the sibling is the marked entry.
    expect(html).toContain('href="/games/the-long-dark"');
    expect(html).not.toContain('href="/games/the-long-dark/wintermute"');
  });

  /**
   * Two bare names mean nothing to a reader who does not already know the game.
   * The current scope's own summary is what makes the choice legible.
   */
  it("explains what the current scope covers", () => {
    const html = render([SURVIVAL, WINTERMUTE]);
    expect(html).toContain("The open-ended survival sandbox");
  });

  it("names the game in its accessible label", () => {
    expect(render([SURVIVAL, WINTERMUTE])).toContain(
      'aria-label="Evaluated experiences of The Long Dark"',
    );
  });

  it("says how many experiences there are", () => {
    expect(render([SURVIVAL, WINTERMUTE])).toContain("2 evaluated experiences");
  });
});

describe("The multi-scope test corpus", () => {
  it("produces a real second published profile through the data boundary", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "preview");
    vi.stubEnv("PROFILE_TEST_CORPUS", "multi-scope");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("REQUIRE_DATABASE", "");
    vi.resetModules();

    const { listProfileScopes, getGameProfile, getGameProfileForScope } =
      await import("@/lib/data/games");

    const scopes = await listProfileScopes("returnal");
    expect(scopes).toHaveLength(2);
    expect(scopes.map((s) => s.scope.key).sort()).toEqual([
      "default",
      "tower-of-sisyphus",
    ]);

    // The bare game URL still answers with the primary, never a sibling.
    const primary = await getGameProfile("returnal");
    expect(primary?.scope.key).toBe("default");
    expect(primary?.scope.isPrimary).toBe(true);

    // And the sibling is a genuinely different document, not the same one at a
    // second address — which is what makes the browser proof meaningful.
    const sibling = await getGameProfileForScope("returnal", "tower-of-sisyphus");
    expect(sibling?.scope.isPrimary).toBe(false);
    expect(sibling?.evaluation.oneLineExperience).not.toBe(
      primary?.evaluation.oneLineExperience,
    );
  });

  it("is absent unless it is asked for", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "preview");
    vi.stubEnv("PROFILE_TEST_CORPUS", "");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("REQUIRE_DATABASE", "");
    vi.resetModules();

    const { listProfileScopes } = await import("@/lib/data/games");
    expect(await listProfileScopes("returnal")).toHaveLength(1);
  });

  /**
   * The synthetic profile's scores are not an evaluation of anything. A
   * production build that honoured this variable would publish invented numbers
   * as though they were editorial work, so it refuses loudly rather than
   * ignoring the variable — a silent drop would make a misconfigured production
   * build look exactly like a correct one.
   */
  it("cannot be requested by a production build", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "production");
    vi.stubEnv("PROFILE_TEST_CORPUS", "multi-scope");
    vi.resetModules();

    const { readFixtureProfiles } = await import("@/lib/data/fixture-profiles");
    expect(() => readFixtureProfiles("1.0")).toThrow(/production build/i);
  });

  it("refuses a corpus name it does not know", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "preview");
    vi.stubEnv("PROFILE_TEST_CORPUS", "something-else");
    vi.resetModules();

    const { readFixtureProfiles } = await import("@/lib/data/fixture-profiles");
    expect(() => readFixtureProfiles("1.0")).toThrow(/not a corpus/i);
  });
});
