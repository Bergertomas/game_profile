import { describe, expect, it } from "vitest";
import {
  IGDB_DEPRECATED_GAME_FIELDS,
  IGDB_GAME_FIELDS,
  IGDB_GAME_TYPE_NAMES,
  IGDB_LEGACY_GAME_TYPE_VALUES,
  IGDB_QUERY_LIMIT,
  IGDB_RATE_LIMIT,
  gamesByIdQuery,
  gamesUpdatedSinceQuery,
  igdbImageUrl,
} from "@/lib/igdb/contract";

/**
 * The provider contract as read from api-docs.igdb.com on 2026-09-02. These
 * lock the facts the architecture rests on, so a change in the constants is a
 * visible decision rather than a drift.
 */
describe("the IGDB contract this layer is built against", () => {
  it("records the documented rate and query limits", () => {
    expect(IGDB_RATE_LIMIT).toEqual({ requestsPerSecond: 4, maxOpenRequests: 8 });
    expect(IGDB_QUERY_LIMIT).toEqual({ default: 10, max: 500 });
  });

  it("targets table-backed fields and never a deprecated enum field", () => {
    for (const deprecated of IGDB_DEPRECATED_GAME_FIELDS) {
      expect(IGDB_GAME_FIELDS as readonly string[]).not.toContain(deprecated);
      // Nor a nested expansion of one.
      expect(IGDB_GAME_FIELDS.some((f) => f.split(".")[0] === deprecated)).toBe(false);
    }
    expect(IGDB_GAME_FIELDS).toContain("game_type.type");
    expect(IGDB_GAME_FIELDS).toContain("game_status.status");
    expect(IGDB_GAME_FIELDS).toContain("release_dates.date_format.format");
    expect(IGDB_GAME_FIELDS).toContain("release_dates.release_region.region");
    expect(IGDB_GAME_FIELDS).toContain("external_games.external_game_source.name");
  });

  it("requests both identity fields and every relation array separately", () => {
    for (const field of [
      "parent_game",
      "version_parent",
      "version_title",
      "dlcs",
      "expansions",
      "standalone_expansions",
      "bundles",
      "ports",
      "remakes",
      "remasters",
      "expanded_games",
      "forks",
      "checksum",
      "updated_at",
    ]) {
      expect(IGDB_GAME_FIELDS).toContain(field);
    }
  });

  it("knows the fifteen documented game types by name with their legacy numbering", () => {
    expect(IGDB_GAME_TYPE_NAMES).toHaveLength(15);
    expect(IGDB_LEGACY_GAME_TYPE_VALUES.main_game).toBe(0);
    expect(IGDB_LEGACY_GAME_TYPE_VALUES.dlc_addon).toBe(1);
    expect(IGDB_LEGACY_GAME_TYPE_VALUES.standalone_expansion).toBe(4);
    expect(IGDB_LEGACY_GAME_TYPE_VALUES.remaster).toBe(9);
    expect(IGDB_LEGACY_GAME_TYPE_VALUES.port).toBe(11);
    expect(IGDB_LEGACY_GAME_TYPE_VALUES.update).toBe(14);
  });
});

describe("query builders", () => {
  it("builds a sorted, bounded point lookup", () => {
    const body = gamesByIdQuery([30, 10, 20]);
    expect(body).toContain("where id = (10,20,30);");
    expect(body).toContain("limit 3;");
    expect(body.startsWith("fields id,checksum,")).toBe(true);
  });

  it("refuses empty, oversized and malformed id lists", () => {
    expect(() => gamesByIdQuery([])).toThrow();
    expect(() => gamesByIdQuery(Array.from({ length: 501 }, (_, i) => i + 1))).toThrow(/500/);
    expect(() => gamesByIdQuery([0])).toThrow(/Invalid/);
    expect(() => gamesByIdQuery([1.5])).toThrow(/Invalid/);
  });

  it("builds a change sweep ordered by updated_at with offset paging", () => {
    const body = gamesUpdatedSinceQuery(1700000000, 500, 1000);
    expect(body).toContain("where updated_at > 1700000000; sort updated_at asc; limit 500; offset 1000;");
    expect(() => gamesUpdatedSinceQuery(-1, 10, 0)).toThrow();
    expect(() => gamesUpdatedSinceQuery(0, 501, 0)).toThrow();
    expect(() => gamesUpdatedSinceQuery(0, 10, -1)).toThrow();
  });

  it("builds provider image URLs from image_id and size only", () => {
    expect(igdbImageUrl("abc123XYZ_-", "cover_big")).toBe(
      "https://images.igdb.com/igdb/image/upload/t_cover_big/abc123XYZ_-.jpg",
    );
    expect(igdbImageUrl("abc", "1080p", true)).toContain("/t_1080p_2x/");
    expect(() => igdbImageUrl("../etc", "cover_big")).toThrow();
    expect(() => igdbImageUrl("abc", "cover big")).toThrow();
  });
});
