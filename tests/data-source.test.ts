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

describe("Without a database", () => {
  it("falls back to the calibration fixtures", async () => {
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
    // The whole point: once production has a database, a build that cannot
    // reach it must stop, not fall back to a corpus nobody authored today.
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("REQUIRE_DATABASE", "1");
    const { listGameProfiles } = await loadGames();
    await expect(listGameProfiles()).rejects.toThrow(
      /REQUIRE_DATABASE is set but DATABASE_URL is not/,
    );
  });

  it("explains what it refused to do", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("REQUIRE_DATABASE", "1");
    const { listGameProfiles } = await loadGames();
    await expect(listGameProfiles()).rejects.toThrow(
      /would have published the calibration fixtures/,
    );
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
