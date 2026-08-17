import { afterEach, describe, expect, it, vi } from "vitest";
import { readFixtureProfiles } from "@/lib/data/fixture-profiles";
import { RUBRIC_V1 } from "@/lib/rubric";

/**
 * Which source the build reads from, and when it refuses to guess.
 *
 * Postgres is the operational source of editorial truth (ADR 0017). Until
 * production Postgres is provisioned, a build with no `DATABASE_URL` falls back
 * to the calibration fixtures — the one temporary compatibility path.
 *
 * The failure mode that path can produce is a quiet one: production silently
 * republishing the calibration corpus as though it were the editorial corpus,
 * with nothing in the output to say so. `REQUIRE_DATABASE=1` is the cutover
 * switch that turns that into a build error (Master Plan v0.7 §9.5, activation
 * step 5). These pin both halves.
 */

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

/** A fresh module graph each time: the corpus is memoised per process. */
async function loadGames() {
  return import("@/lib/data/games");
}

/** A fresh module graph, because `SITE_ENV` folds at import time. */
async function loadGamesFor(siteEnv: "production" | "preview") {
  vi.stubEnv("NEXT_PUBLIC_SITE_ENV", siteEnv);
  vi.resetModules();
  return import("@/lib/data/games");
}

describe("A production build", () => {
  /**
   * The cleanup Phase 2C makes: production has NO fixture fallback, whatever
   * the environment says. `REQUIRE_DATABASE=1` is the operational switch and a
   * switch can be unset — by an edited build variable, a new Workers Builds
   * environment, or a local `next build` somebody deploys. `SITE_ENV` folds to
   * a literal at build time, so the fallback is unreachable code in a
   * production bundle rather than a check that might be skipped.
   */
  it("refuses to build without a database, even with REQUIRE_DATABASE unset", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("REQUIRE_DATABASE", "");
    const { listGameProfiles } = await loadGamesFor("production");
    await expect(listGameProfiles()).rejects.toThrow(
      /this is a production build/i,
    );
  });

  it("says what it refused to publish", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("REQUIRE_DATABASE", "");
    const { listGameProfiles } = await loadGamesFor("production");
    await expect(listGameProfiles()).rejects.toThrow(
      /would have published the calibration fixtures/,
    );
  });
});

describe("Without a database", () => {
  it("falls back to the calibration fixtures", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "preview");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("REQUIRE_DATABASE", "");
    const { listGameProfiles } = await loadGames();
    const profiles = await listGameProfiles();
    expect(profiles.map((p) => p.game.slug).sort()).toEqual([
      "alan-wake-2",
      "redfall",
      "returnal",
    ]);
  });

  it("says so, so a fixture-backed deploy is not mistaken for a real one", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "preview");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("REQUIRE_DATABASE", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { listGameProfiles } = await loadGames();
    await listGameProfiles();
    const said = log.mock.calls.flat().join(" ");
    expect(said).toContain("DATABASE_URL is not set");
    expect(said).toContain("calibration fixtures");
    log.mockRestore();
  });
});

describe("After cutover", () => {
  it("fails closed rather than republishing the fixtures", async () => {
    // Still meaningful for a NON-production build: a preview pointed at the
    // editorial database should fail loudly rather than quietly showing the
    // calibration corpus to a reviewer.
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "preview");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("REQUIRE_DATABASE", "1");
    const { listGameProfiles } = await loadGames();
    await expect(listGameProfiles()).rejects.toThrow(
      /DATABASE_URL is not set and REQUIRE_DATABASE is/,
    );
  });

  it("explains what it refused to do", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "preview");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("REQUIRE_DATABASE", "1");
    const { listGameProfiles } = await loadGames();
    await expect(listGameProfiles()).rejects.toThrow(
      /would have published the calibration fixtures/,
    );
  });
});

describe("Named synthetic corpora", () => {
  /**
   * Preserved from the CI isolation work: the ordinary browser server is
   * DB-backed, while an explicitly named synthetic corpus clears DATABASE_URL
   * and REQUIRE_DATABASE. That has to keep working now that production requires
   * Postgres — and it does, because the production rule is keyed on SITE_ENV,
   * which a Playwright build is not.
   */
  it("still work fixture-backed while production requires Postgres", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "preview");
    vi.stubEnv("PROFILE_TEST_CORPUS", "multi-scope");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("REQUIRE_DATABASE", "");
    const { listProfileScopes } = await loadGamesFor("preview");
    expect(await listProfileScopes("returnal")).toHaveLength(2);
  });

  it("cannot be requested by a production build", async () => {
    vi.stubEnv("PROFILE_TEST_CORPUS", "multi-scope");
    vi.stubEnv("DATABASE_URL", "");
    vi.resetModules();
    const { readFixtureProfiles } = await import("@/lib/data/fixture-profiles");
    vi.stubEnv("NEXT_PUBLIC_SITE_ENV", "production");
    vi.resetModules();
    const production = await import("@/lib/data/fixture-profiles");
    expect(() => production.readFixtureProfiles("1.0")).toThrow(/production build/i);
    expect(readFixtureProfiles).toBeDefined();
  });
});

describe("The fixture reader itself", () => {
  it("returns only published profiles for the requested rubric", () => {
    const profiles = readFixtureProfiles(RUBRIC_V1.version);
    expect(profiles).toHaveLength(3);
    for (const record of profiles) {
      expect(record.evaluation.status).toBe("published");
      expect(record.evaluation.rubricVersion).toBe(RUBRIC_V1.version);
    }
  });

  it("returns nothing for a rubric no profile is published under", () => {
    expect(readFixtureProfiles("9.9" as typeof RUBRIC_V1.version)).toEqual([]);
  });
});
