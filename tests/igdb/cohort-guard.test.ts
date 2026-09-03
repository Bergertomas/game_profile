import { describe, expect, it } from "vitest";
import { isProtectedTitle } from "@/lib/igdb/cohort-guard";

describe("the live contract proof refuses calibration and holdout titles", () => {
  it("matches every cohort-lock title by fragment, ignoring case and accents", () => {
    for (const name of [
      "Alan Wake 2",
      "Battlefield 6",
      "The Legend of Zelda: Tears of the Kingdom",
      "Banishers: Ghosts of New Eden",
      "Senua's Saga: Hellblade II Enhanced",
      "SAROS",
      "Resident Evil 4",
      "Kingdom Come: Deliverance II",
      "Astro Bot",
      "Immortals of Aveum",
    ]) {
      expect(isProtectedTitle(name), name).toBe(true);
    }
  });

  it("lets a non-cohort record through", () => {
    expect(isProtectedTitle("Fixture Base Game")).toBe(false);
    expect(isProtectedTitle("Returnal")).toBe(false);
    expect(isProtectedTitle(null)).toBe(false);
    expect(isProtectedTitle("")).toBe(false);
  });
});
