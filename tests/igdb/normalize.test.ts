import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  BASE_GAME_ID,
  BUNDLE_ID,
  DLC_ID,
  EXPANSION_ID,
  GOLD_EDITION_ID,
  ORPHAN_ID,
  PORT_ID,
  REMAKE_ID,
  REMASTER_ID,
  STAGING_PROOF_RECORDS,
  STANDALONE_EXPANSION_ID,
  UNSTAGED_PARENT_ID,
} from "@/lib/igdb/fixtures/staging-proof";
import { deriveRelations, identityClassOf, normalizeGame, normalizeGames, unixToDate } from "@/lib/igdb/normalize";
import type { IgdbGameRecord } from "@/lib/igdb/record";

/**
 * The identity contract (issue #48 §2): the staging layer keeps base game,
 * edition, DLC, expansion, standalone expansion, bundle, port, remake and
 * remaster apart, reads `version_parent` and `parent_game` as the two
 * different facts IGDB documents them as, and never derives identity from a
 * name or slug.
 */

const staging = normalizeGames(STAGING_PROOF_RECORDS);
const byId = (id: number) => staging.games.find((g) => g.igdbId === id)!;
const edges = (predicate: (r: (typeof staging.relations)[number]) => boolean) =>
  staging.relations.filter(predicate).map((r) => `${r.subjectIgdbId} ${r.kind} ${r.objectIgdbId} via ${r.sourceField} by ${r.assertedByIgdbId}`);

function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}
const digest = (value: unknown) => createHash("sha256").update(stable(value)).digest("hex");

describe("identity classes", () => {
  it("classifies every fixture record by version_parent first, then the table-backed game_type", () => {
    expect(byId(BASE_GAME_ID).identityClass).toBe("base_game");
    expect(byId(GOLD_EDITION_ID).identityClass).toBe("version_edition");
    expect(byId(DLC_ID).identityClass).toBe("dlc");
    expect(byId(EXPANSION_ID).identityClass).toBe("expansion");
    expect(byId(STANDALONE_EXPANSION_ID).identityClass).toBe("standalone_expansion");
    expect(byId(REMASTER_ID).identityClass).toBe("remaster");
    expect(byId(PORT_ID).identityClass).toBe("port");
    expect(byId(BUNDLE_ID).identityClass).toBe("bundle");
    expect(byId(REMAKE_ID).identityClass).toBe("remake");
    expect(byId(ORPHAN_ID).identityClass).toBe("dlc");
  });

  it("keeps an edition's version_title and version_parent, and gives it no content relation", () => {
    const gold = byId(GOLD_EDITION_ID);
    expect(gold.versionTitle).toBe("Gold Edition");
    expect(gold.versionParentIgdbId).toBe(BASE_GAME_ID);
    expect(gold.parentGameIgdbId).toBeNull();
    expect(edges((r) => r.assertedByIgdbId === GOLD_EDITION_ID)).toEqual([
      `${GOLD_EDITION_ID} version_of ${BASE_GAME_ID} via version_parent by ${GOLD_EDITION_ID}`,
    ]);
  });

  it("an unknown or missing game_type is unclassified, never guessed", () => {
    expect(identityClassOf(null, null)).toBe("unclassified");
    expect(identityClassOf(null, "something_new")).toBe("unclassified");
    expect(identityClassOf(BASE_GAME_ID, "something_new")).toBe("version_edition");
    expect(identityClassOf(null, "mod")).toBe("other_content");
  });
});

describe("version_parent and parent_game are different relations", () => {
  it("version_of is asserted only by version_parent", () => {
    const versions = staging.relations.filter((r) => r.kind === "version_of");
    expect(versions).toHaveLength(1);
    expect(versions.every((r) => r.sourceField === "version_parent")).toBe(true);
    expect(staging.relations.filter((r) => r.sourceField === "version_parent").every((r) => r.kind === "version_of")).toBe(true);
  });

  it("parent_game yields the content relation the child's game_type names, asserted from both sides", () => {
    expect(edges((r) => r.subjectIgdbId === DLC_ID && r.objectIgdbId === BASE_GAME_ID)).toEqual([
      `${DLC_ID} dlc_of ${BASE_GAME_ID} via dlcs by ${BASE_GAME_ID}`,
      `${DLC_ID} dlc_of ${BASE_GAME_ID} via parent_game by ${DLC_ID}`,
    ]);
    expect(edges((r) => r.subjectIgdbId === EXPANSION_ID).map((e) => e.split(" ")[1])).toEqual(["expansion_of", "expansion_of"]);
    expect(edges((r) => r.subjectIgdbId === STANDALONE_EXPANSION_ID).map((e) => e.split(" ")[1])).toEqual([
      "standalone_expansion_of",
      "standalone_expansion_of",
    ]);
  });

  it("ports, remakes, remasters and bundles come from the base game's side with their own kinds", () => {
    expect(edges((r) => r.subjectIgdbId === PORT_ID)).toEqual([`${PORT_ID} port_of ${BASE_GAME_ID} via ports by ${BASE_GAME_ID}`]);
    expect(edges((r) => r.subjectIgdbId === REMASTER_ID)).toEqual([`${REMASTER_ID} remaster_of ${BASE_GAME_ID} via remasters by ${BASE_GAME_ID}`]);
    expect(edges((r) => r.subjectIgdbId === BUNDLE_ID)).toEqual([`${BUNDLE_ID} bundle_contains ${BASE_GAME_ID} via bundles by ${BASE_GAME_ID}`]);
  });

  it("a parent_game whose child type is not additional content is recorded as an open question", () => {
    expect(edges((r) => r.subjectIgdbId === REMAKE_ID)).toEqual([
      `${REMAKE_ID} parent_game_unclassified ${BASE_GAME_ID} via parent_game by ${REMAKE_ID}`,
      `${REMAKE_ID} remake_of ${BASE_GAME_ID} via remakes by ${BASE_GAME_ID}`,
    ]);
    expect(staging.flags.find((f) => f.igdbId === REMAKE_ID && f.code === "parent_game_unclassified")?.severity).toBe("review");
  });

  it("nothing in the fixture is conflated: no edition carries a content edge and no content carries a version edge", () => {
    for (const game of staging.games) {
      const own = staging.relations.filter((r) => r.assertedByIgdbId === game.igdbId && r.subjectIgdbId === game.igdbId);
      if (game.identityClass === "version_edition") expect(own.every((r) => r.kind === "version_of")).toBe(true);
      else expect(own.some((r) => r.kind === "version_of")).toBe(false);
    }
    expect(staging.relations).toHaveLength(13);
  });
});

describe("malformed and missing relations", () => {
  const base = STAGING_PROOF_RECORDS[0]!;

  it("stages a relation to an unstaged target and says so", () => {
    expect(edges((r) => r.assertedByIgdbId === ORPHAN_ID)).toEqual([
      `${ORPHAN_ID} dlc_of ${UNSTAGED_PARENT_ID} via parent_game by ${ORPHAN_ID}`,
    ]);
    const flag = staging.flags.find((f) => f.igdbId === ORPHAN_ID && f.code === "relation_target_unstaged");
    expect(flag?.severity).toBe("info");
    expect(flag?.detail).toContain(String(UNSTAGED_PARENT_ID));
  });

  it("refuses a self-reference in both the column and the edge", () => {
    const one = normalizeGame({ ...base, parent_game: base.id, version_parent: base.id, dlcs: [base.id] });
    expect(one.game.parentGameIgdbId).toBeNull();
    expect(one.game.versionParentIgdbId).toBeNull();
    expect(one.game.identityClass).toBe("base_game");
    expect(one.relations.some((r) => r.subjectIgdbId === r.objectIgdbId)).toBe(false);
    expect(one.flags.filter((f) => f.code === "self_reference").map((f) => f.severity)).toEqual(["refused", "refused", "refused"]);
  });

  it("flags a record that is both an edition and additional content, and keeps both facts", () => {
    const one = normalizeGame({ ...base, id: 5, game_type: { id: 1, name: "dlc_addon" }, parent_game: 1, version_parent: 2, dlcs: [], expansions: [], standalone_expansions: [], remasters: [], remakes: [], ports: [], bundles: [] });
    expect(one.game.identityClass).toBe("version_edition");
    expect(one.relations.map((r) => r.kind)).toEqual(["dlc_of", "version_of"]);
    expect(one.flags.map((f) => f.code)).toEqual(expect.arrayContaining(["parent_and_version_parent_both_set", "version_of_non_main_type"]));
  });

  it("flags an unresolved game_type and a missing checksum without dropping the record", () => {
    const one = normalizeGame({ ...base, checksum: null, game_type: { id: 77, name: "brand_new_type" } });
    expect(one.game.identityClass).toBe("unclassified");
    expect(one.game.gameTypeId).toBe(77);
    expect(one.game.gameTypeName).toBe("brand_new_type");
    expect(one.flags.map((f) => f.code)).toEqual(expect.arrayContaining(["missing_checksum", "unknown_game_type"]));
    expect(normalizeGame({ ...base, game_type: null }).flags.map((f) => f.code)).toContain("missing_game_type");
  });

  it("refuses a batch that names one record twice", () => {
    expect(() => normalizeGames([base, base])).toThrow(/appears twice/);
  });
});

describe("determinism and provider-independence", () => {
  it("is order-independent and idempotent, byte for byte", () => {
    const reversed = normalizeGames([...STAGING_PROOF_RECORDS].reverse());
    expect(digest(reversed)).toBe(digest(staging));
    expect(digest(normalizeGames(STAGING_PROOF_RECORDS))).toBe(digest(staging));
  });

  it("derives no identity from name or slug", () => {
    const renamed: IgdbGameRecord[] = STAGING_PROOF_RECORDS.map((r) => ({ ...r, name: `Renamed ${r.id}`, slug: `renamed-${r.id}` }));
    const other = normalizeGames(renamed);
    expect(other.games.map((g) => [g.igdbId, g.identityClass])).toEqual(staging.games.map((g) => [g.igdbId, g.identityClass]));
    expect(digest(other.relations)).toBe(digest(staging.relations));
  });

  it("carries provider timestamps as ISO instants and release days as UTC dates", () => {
    expect(unixToDate(1_700_000_000)).toBe("2023-11-14");
    expect(byId(BASE_GAME_ID).igdbUpdatedAt).toBe("2023-11-14T22:13:20.000Z");
    const base = staging.releaseDates.filter((rd) => rd.igdbGameId === BASE_GAME_ID);
    expect(base.map((rd) => [rd.platformName, rd.releaseRegionName, rd.releaseDate])).toEqual([
      ["PC (Microsoft Windows)", "worldwide", "2023-11-14"],
      ["PlayStation 4", "worldwide", "2023-11-14"],
      ["PlayStation 4", "europe", "2023-11-17"],
    ]);
  });

  it("stages artwork as candidates with provider identity and no clearance of any kind", () => {
    const images = staging.images.filter((im) => im.igdbGameId === BASE_GAME_ID);
    expect(images.map((im) => [im.imageKind, im.imageId, im.width, im.height])).toEqual([
      ["cover", "fixturecoverbase0001", 600, 800],
      ["artwork", "fixtureartbase00001", 1920, 1080],
      ["artwork", "fixtureartbase00002", 1920, 1080],
    ]);
    for (const image of staging.images) {
      expect(Object.keys(image)).not.toContain("clearance");
      expect(Object.keys(image)).not.toContain("basis");
    }
  });

  it("keeps the raw provider record beside every normalized value", () => {
    for (const game of staging.games) expect(game.raw).toBeDefined();
    expect(deriveRelations(STAGING_PROOF_RECORDS[0]!).relations).toHaveLength(7);
  });
});
