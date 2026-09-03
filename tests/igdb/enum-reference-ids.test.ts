import { describe, expect, it } from "vitest";
import { IGDB_POSITIVE_ONLY_REFERENCES, IGDB_ZERO_VALUED_ENUM_REFERENCES } from "@/lib/igdb/contract";
import { parseApiGame } from "@/lib/igdb/record";

/**
 * Zero is a LEGITIMATE id in three enum→table reference contracts, and only
 * those three (program-owner live-proof ruling on PR #52; read from
 * api-docs.igdb.com on 2026-09-03):
 *
 *   game_type    main_game  = 0
 *   game_status  released   = 0
 *   date_format  YYYYMMMMDD = 0
 *
 * The live field-contract probe returned `game_type.id = 0` and six
 * `release_dates[].date_format.id = 0`; the parser rejecting them was our
 * contract being too strict. Relaxing those three must NOT relax ordinary
 * entity ids, which IGDB numbers from 1 — a zero there is still malformed.
 */

/** A minimal valid game; each test perturbs exactly one reference. */
function game(overrides: Record<string, unknown> = {}) {
  return { id: 1942, name: "A Game", ...overrides };
}

describe("zero-valued enum→table reference contracts", () => {
  it("names exactly the three contracts IGDB documents as starting at zero", () => {
    expect(IGDB_ZERO_VALUED_ENUM_REFERENCES).toEqual({
      game_type: "main_game",
      game_status: "released",
      date_format: "YYYYMMMMDD",
    });
  });

  it("parses a legitimate zero game_type, expanded or bare", () => {
    const expanded = parseApiGame(game({ game_type: { id: 0, type: "main_game" } }));
    expect(expanded.record.game_type).toEqual({ id: 0, name: "main_game" });
    const bare = parseApiGame(game({ game_type: 0 }));
    expect(bare.record.game_type).toEqual({ id: 0, name: null });
  });

  it("parses a legitimate zero game_status", () => {
    const { record } = parseApiGame(game({ game_status: { id: 0, status: "released" } }));
    expect(record.game_status).toEqual({ id: 0, name: "released" });
  });

  it("parses legitimate zero date_format ids on every release date", () => {
    const { record } = parseApiGame(
      game({
        release_dates: [
          { id: 11, date: 1700000000, platform: { id: 6, name: "PC" }, date_format: { id: 0, format: "YYYYMMMMDD" } },
          { id: 12, date: 1700000001, platform: { id: 48, name: "PS4" }, date_format: 0 },
        ],
      }),
    );
    expect(record.release_dates.map((rd) => rd.date_format)).toEqual([
      { id: 0, name: "YYYYMMMMDD" },
      { id: 0, name: null },
    ]);
  });

  it("reproduces the exact live-probe shape: zero game_type beside six zero date_formats", () => {
    const releaseDates = Array.from({ length: 6 }, (_, i) => ({
      id: 100 + i,
      date: 1700000000 + i,
      platform: { id: 6 + i, name: `P${i}` },
      date_format: { id: 0, format: "YYYYMMMMDD" },
    }));
    const { record } = parseApiGame(game({ game_type: { id: 0, type: "main_game" }, release_dates: releaseDates }));
    expect(record.game_type?.id).toBe(0);
    expect(record.release_dates).toHaveLength(6);
    expect(record.release_dates.every((rd) => rd.date_format?.id === 0)).toBe(true);
  });

  it("still rejects a NEGATIVE id in those same three contracts", () => {
    expect(() => parseApiGame(game({ game_type: { id: -1, type: "main_game" } }))).toThrow();
    expect(() => parseApiGame(game({ game_type: -1 }))).toThrow();
    expect(() => parseApiGame(game({ game_status: { id: -1, status: "released" } }))).toThrow();
    expect(() =>
      parseApiGame(game({ release_dates: [{ id: 11, platform: { id: 6 }, date_format: { id: -1, format: "x" } }] })),
    ).toThrow();
  });
});

describe("ordinary entity and reference ids stay strictly positive", () => {
  it("documents which references zero must never reach", () => {
    for (const reference of ["release_region", "external_game_source", "image_type", "platform", "company", "record id"]) {
      expect(IGDB_POSITIVE_ONLY_REFERENCES).toContain(reference);
    }
    // The zero-valued set and the positive-only set may not overlap.
    for (const zeroValued of Object.keys(IGDB_ZERO_VALUED_ENUM_REFERENCES)) {
      expect(IGDB_POSITIVE_ONLY_REFERENCES).not.toContain(zeroValued);
    }
  });

  it("rejects a zero release_region — the region enum starts at europe = 1", () => {
    expect(() =>
      parseApiGame(game({ release_dates: [{ id: 11, platform: { id: 6 }, release_region: { id: 0, region: "nowhere" } }] })),
    ).toThrow();
  });

  it("rejects a zero external_game_source — the category enum starts at steam = 1", () => {
    expect(() => parseApiGame(game({ external_games: [{ id: 8, uid: "1", external_game_source: { id: 0, name: "x" } }] }))).toThrow();
  });

  it("rejects a zero image_type, platform and company", () => {
    expect(() => parseApiGame(game({ cover: { id: 7, image_id: "co1", image_type: { id: 0, name: "Cover" } } }))).toThrow();
    expect(() => parseApiGame(game({ release_dates: [{ id: 11, platform: { id: 0, name: "PC" } }] }))).toThrow();
    expect(() => parseApiGame(game({ involved_companies: [{ id: 5, company: { id: 0, name: "Studio" } }] }))).toThrow();
  });

  it("rejects a zero record id — the game's own and every child's", () => {
    expect(() => parseApiGame(game({ id: 0 }))).toThrow();
    expect(() => parseApiGame(game({ release_dates: [{ id: 0, platform: { id: 6 } }] }))).toThrow();
    expect(() => parseApiGame(game({ involved_companies: [{ id: 0, company: { id: 9 } }] }))).toThrow();
    expect(() => parseApiGame(game({ alternative_names: [{ id: 0, name: "AG" }] }))).toThrow();
    expect(() => parseApiGame(game({ external_games: [{ id: 0, uid: "1" }] }))).toThrow();
    expect(() => parseApiGame(game({ cover: { id: 0, image_id: "co1" } }))).toThrow();
  });

  it("rejects a zero relation target — parent_game, version_parent and the id arrays", () => {
    expect(() => parseApiGame(game({ parent_game: 0 }))).toThrow();
    expect(() => parseApiGame(game({ version_parent: { id: 0 } }))).toThrow();
    expect(() => parseApiGame(game({ dlcs: [1, 0] }))).toThrow();
    expect(() => parseApiGame(game({ platforms: [0] }))).toThrow();
  });
});
