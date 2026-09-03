import { describe, expect, it } from "vitest";
import { parseApiGame, parseApiGames } from "@/lib/igdb/record";

const expanded = {
  id: 1942,
  checksum: "5a3e1e1a-2f8b-4d2f-9a1a-7b2e5f6c8d90",
  updated_at: 1700000000,
  name: "A Game",
  slug: "a-game",
  game_type: { id: 1, type: "main_game" },
  game_status: { id: 1, status: "released" },
  parent_game: null,
  version_parent: { id: 40 },
  dlcs: [3, { id: 2 }, 1],
  cover: { id: 7, image_id: "co1abc", width: 600, height: 800, url: "//images.igdb.com/x.jpg", image_type: { id: 1, name: "Cover" } },
  release_dates: [
    { id: 11, date: 1700000000, human: "Nov 14, 2023", platform: { id: 6, name: "PC" }, date_format: { id: 1, format: "YYYYMMMMDD" }, release_region: { id: 8, region: "worldwide" }, status: { id: 6, name: "Released" } },
    { id: 10, date: 1700000000, platform: 48 },
  ],
  involved_companies: [{ id: 5, company: { id: 9, name: "Studio" }, developer: true }],
  alternative_names: [{ id: 3, name: "AG", comment: "Acronym" }],
  external_games: [{ id: 8, uid: "123", external_game_source: { id: 1, name: "Steam" }, game_release_format: 1 }],
  category: 0, // deprecated field present in a response; must be ignored, not rejected
};

describe("parseApiGame", () => {
  it("reads expanded and bare references alike, keeping id and name apart", () => {
    const { record, unexpanded } = parseApiGame(expanded);
    expect(record.game_type).toEqual({ id: 1, name: "main_game" });
    expect(record.version_parent).toBe(40);
    expect(record.parent_game).toBeNull();
    expect(record.dlcs).toEqual([1, 2, 3]);
    expect(record.cover?.image_id).toBe("co1abc");
    expect(record.cover?.image_type).toEqual({ id: 1, name: "Cover" });
    expect(record.release_dates.map((rd) => rd.id)).toEqual([10, 11]);
    expect(record.release_dates[0]?.platform).toEqual({ id: 48, name: null });
    expect(record.release_dates[1]?.date_format).toEqual({ id: 1, name: "YYYYMMMMDD" });
    expect(record.involved_companies[0]).toMatchObject({ developer: true, publisher: false, company: { id: 9, name: "Studio" } });
    expect(record.external_games[0]?.game_release_format).toEqual({ id: 1, name: null });
    expect(record.raw).toBe(expanded);
    expect(unexpanded).toEqual([]);
  });

  it("does not read a deprecated enum field even when the provider still sends it", () => {
    const { record } = parseApiGame({ ...expanded, category: 1, status: 0 });
    expect(record.game_type?.name).toBe("main_game");
    expect(Object.keys(record)).not.toContain("category");
    expect(Object.keys(record)).not.toContain("status");
  });

  it("reports children that arrived unexpanded instead of staging nothing silently", () => {
    const { record, unexpanded } = parseApiGame({ ...expanded, cover: 7, artworks: [1, 2] });
    expect(record.cover).toBeNull();
    expect(record.artworks).toEqual([]);
    expect(unexpanded).toEqual(["cover", "artworks"]);
  });

  it("refuses a malformed record rather than guessing", () => {
    expect(() => parseApiGame({ ...expanded, name: "" })).toThrow();
    expect(() => parseApiGame({ ...expanded, id: -1 })).toThrow();
    expect(() => parseApiGame({ ...expanded, cover: { id: 7, image_id: "../x" } })).toThrow();
    expect(() => parseApiGame({ ...expanded, cover: { id: 7, image_id: "ok", width: 0 } })).toThrow();
    expect(() => parseApiGame({ ...expanded, dlcs: ["3"] })).toThrow();
  });

  it("names the failing element of a response", () => {
    expect(() => parseApiGames([expanded, { id: 2 }])).toThrow(/element 1 is malformed/);
    expect(() => parseApiGames({ not: "an array" })).toThrow(/not an array/);
    const { records, unexpanded } = parseApiGames([expanded, { ...expanded, id: 3, cover: 1 }]);
    expect(records.map((r) => r.id)).toEqual([1942, 3]);
    expect(unexpanded).toEqual(["cover"]);
  });
});
