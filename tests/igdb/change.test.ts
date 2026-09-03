import { describe, expect, it } from "vitest";
import { classifyChange, type StagedGameSnapshot } from "@/lib/igdb/change";
import {
  BASE_GAME_ID,
  DLC_ID,
  GOLD_EDITION_ID,
  REMASTER_ID,
  STAGING_PROOF_RECORDS,
  STAGING_PROOF_RECORDS_REVISED,
} from "@/lib/igdb/fixtures/staging-proof";
import { normalizeGames, type NormalizedStaging } from "@/lib/igdb/normalize";

/**
 * Change detection (issue #48 §7): deterministic, class-by-class, and a review
 * signal only — the event never carries a score, a status or a clearance.
 */

const first = normalizeGames(STAGING_PROOF_RECORDS);
const revised = normalizeGames(STAGING_PROOF_RECORDS_REVISED);

function snap(staging: NormalizedStaging, id: number): StagedGameSnapshot {
  return {
    game: staging.games.find((g) => g.igdbId === id)!,
    relations: staging.relations.filter((r) => r.assertedByIgdbId === id),
    releaseDates: staging.releaseDates.filter((rd) => rd.igdbGameId === id),
    images: staging.images.filter((im) => im.igdbGameId === id),
    companies: staging.companies.filter((ic) => ic.igdbGameId === id),
    aliases: staging.aliases.filter((an) => an.igdbGameId === id),
    externalGames: staging.externalGames.filter((eg) => eg.igdbGameId === id),
  };
}

describe("classifyChange", () => {
  it("returns null when nothing observable moved", () => {
    for (const game of first.games) expect(classifyChange(snap(first, game.igdbId), snap(first, game.igdbId))).toBeNull();
    expect(classifyChange(snap(first, REMASTER_ID), snap(revised, REMASTER_ID))).toBeNull();
  });

  it("refuses to compare two different records", () => {
    expect(() => classifyChange(snap(first, BASE_GAME_ID), snap(first, DLC_ID))).toThrow();
  });

  it("separates text drift, an artwork candidate and a new port relation on the base game — none needs review", () => {
    const event = classifyChange(snap(first, BASE_GAME_ID), snap(revised, BASE_GAME_ID))!;
    expect(event.classes).toEqual(["provider_text_drift", "artwork_candidate", "identity_or_relationship"]);
    expect(event.changedFields).toEqual(["checksum", "images", "relations.port_of", "summary"]);
    expect(event.requiresEditorialReview).toBe(false);
    expect(event.previousChecksum).not.toBe(event.nextChecksum);
  });

  it("classifies a new platform release on the edition as platform_or_release", () => {
    const event = classifyChange(snap(first, GOLD_EDITION_ID), snap(revised, GOLD_EDITION_ID))!;
    expect(event.classes).toEqual(["platform_or_release"]);
    expect(event.changedFields).toEqual(["checksum", "release_dates"]);
    expect(event.requiresEditorialReview).toBe(false);
  });

  it("re-parenting DLC is a material scope change that prompts editorial review", () => {
    const event = classifyChange(snap(first, DLC_ID), snap(revised, DLC_ID))!;
    expect(event.classes).toEqual(["material_scope"]);
    expect(event.changedFields).toEqual(["checksum", "parentGameIgdbId", "relations.dlc_of"]);
    expect(event.requiresEditorialReview).toBe(true);
  });

  it("a checksum that moves with nothing staged changing is still reported, as drift", () => {
    const before = snap(first, REMASTER_ID);
    const after = { ...before, game: { ...before.game, checksum: "00000000-0000-4000-8000-999999999999" } };
    const event = classifyChange(before, after)!;
    expect(event.classes).toEqual(["provider_text_drift"]);
    expect(event.changedFields).toEqual(["checksum"]);
  });

  it("a version_parent appearing or a game_type changing is material", () => {
    const before = snap(first, REMASTER_ID);
    const asEdition = { ...before, game: { ...before.game, versionParentIgdbId: BASE_GAME_ID, identityClass: "version_edition" as const } };
    expect(classifyChange(before, asEdition)!.requiresEditorialReview).toBe(true);
    const retyped = { ...before, game: { ...before.game, gameTypeName: "remake", identityClass: "remake" as const } };
    expect(classifyChange(before, retyped)!.classes).toEqual(["material_scope"]);
  });

  it("never carries anything editorial", () => {
    const event = classifyChange(snap(first, DLC_ID), snap(revised, DLC_ID))!;
    for (const key of Object.keys(event)) expect(key).not.toMatch(/score|status|publish|clearance|evaluation/i);
  });
});
