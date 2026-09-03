import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { STAGING_PROOF_RECORDS } from "@/lib/igdb/fixtures/staging-proof";
import {
  assembleDumpGames,
  dumpDescriptorSchema,
  dumpSourceRef,
  parseDumpCell,
  parseDumpCsv,
  splitCsvLine,
  type DumpRow,
  type DumpTables,
} from "@/lib/igdb/dump";
import { normalizeGames } from "@/lib/igdb/normalize";
import type { IgdbGameRecord } from "@/lib/igdb/record";

/**
 * The Data Partner dump path produces the same staging as the API path
 * (issue #48 §4, §9 "API/dump normalized equivalence"). The fixture is turned
 * into per-endpoint dump tables, assembled back into records, and normalized;
 * the result must equal the API-shaped normalization except for `raw`.
 */

function stripRaw<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (key, v: unknown) => (key === "raw" ? undefined : v))) as T;
}
function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}
const digest = (value: unknown) => createHash("sha256").update(stable(value)).digest("hex");

/** Fixture records → per-endpoint dump tables, the way a Data Partner export is shaped. */
function toDumpTables(records: readonly IgdbGameRecord[]): DumpTables {
  const names = <T>(rows: readonly { id: number; name: string | null }[], key = "name") =>
    rows.filter((r) => r.name !== null).map((r) => ({ id: r.id, [key]: r.name }) as unknown as T);
  const gameTypes = new Map<number, string>();
  const gameStatuses = new Map<number, string>();
  const imageTypes = new Map<number, string>();
  const platforms = new Map<number, string>();
  const dateFormats = new Map<number, string>();
  const regions = new Map<number, string>();
  const rdStatuses = new Map<number, string>();
  const companies = new Map<number, string>();
  const sources = new Map<number, string>();
  const formats = new Map<number, string>();
  const put = (map: Map<number, string>, ref: { id: number; name: string | null } | null) => {
    if (ref && ref.name !== null) map.set(ref.id, ref.name);
  };
  const covers: DumpRow[] = [];
  const artworks: DumpRow[] = [];
  const releaseDates: DumpRow[] = [];
  const involved: DumpRow[] = [];
  const altNames: DumpRow[] = [];
  const externals: DumpRow[] = [];
  const games: DumpRow[] = records.map((r) => {
    put(gameTypes, r.game_type);
    put(gameStatuses, r.game_status);
    const image = (im: NonNullable<IgdbGameRecord["cover"]>): DumpRow => {
      put(imageTypes, im.image_type);
      return { id: im.id, game: r.id, image_id: im.image_id, width: im.width, height: im.height, url: im.url, checksum: im.checksum, alpha_channel: im.alpha_channel, animated: im.animated, image_type: im.image_type?.id ?? null, game_localization: im.game_localization };
    };
    if (r.cover) covers.push(image(r.cover));
    for (const a of r.artworks) artworks.push(image(a));
    for (const rd of r.release_dates) {
      put(platforms, rd.platform);
      put(dateFormats, rd.date_format);
      put(regions, rd.release_region);
      put(rdStatuses, rd.status);
      releaseDates.push({ id: rd.id, game: r.id, checksum: rd.checksum, updated_at: rd.updated_at, date: rd.date, human: rd.human, platform: rd.platform?.id ?? null, date_format: rd.date_format?.id ?? null, release_region: rd.release_region?.id ?? null, status: rd.status?.id ?? null });
    }
    for (const ic of r.involved_companies) {
      put(companies, ic.company);
      involved.push({ id: ic.id, game: r.id, checksum: ic.checksum, updated_at: ic.updated_at, company: ic.company?.id ?? null, developer: ic.developer, publisher: ic.publisher, porting: ic.porting, supporting: ic.supporting });
    }
    for (const an of r.alternative_names) altNames.push({ id: an.id, game: r.id, checksum: an.checksum, name: an.name, comment: an.comment });
    for (const eg of r.external_games) {
      put(sources, eg.external_game_source);
      put(formats, eg.game_release_format);
      externals.push({ id: eg.id, game: r.id, checksum: eg.checksum, updated_at: eg.updated_at, uid: eg.uid, name: eg.name, url: eg.url, platform: eg.platform, external_game_source: eg.external_game_source?.id ?? null, game_release_format: eg.game_release_format?.id ?? null });
    }
    return {
      id: r.id, checksum: r.checksum, updated_at: r.updated_at, created_at: r.created_at, name: r.name, slug: r.slug, url: r.url, summary: r.summary,
      first_release_date: r.first_release_date, version_title: r.version_title, game_type: r.game_type?.id ?? null, game_status: r.game_status?.id ?? null,
      parent_game: r.parent_game, version_parent: r.version_parent, dlcs: r.dlcs, expansions: r.expansions, standalone_expansions: r.standalone_expansions,
      expanded_games: r.expanded_games, bundles: r.bundles, ports: r.ports, remakes: r.remakes, remasters: r.remasters, forks: r.forks, platforms: r.platforms,
    };
  });
  const rows = (map: Map<number, string>, key: string): DumpRow[] => [...map].map(([id, name]) => ({ id, [key]: name }));
  void names;
  return {
    games,
    game_types: rows(gameTypes, "type"),
    game_statuses: rows(gameStatuses, "status"),
    image_types: rows(imageTypes, "name"),
    platforms: rows(platforms, "name"),
    date_formats: rows(dateFormats, "format"),
    release_date_regions: rows(regions, "region"),
    release_date_statuses: rows(rdStatuses, "name"),
    companies: rows(companies, "name"),
    external_game_sources: rows(sources, "name"),
    game_release_formats: rows(formats, "format"),
    covers,
    artworks,
    release_dates: releaseDates,
    involved_companies: involved,
    alternative_names: altNames,
    external_games: externals,
  };
}

describe("dump cells are read by declared schema type", () => {
  it("parses scalars, booleans, timestamps and both plausible array encodings", () => {
    expect(parseDumpCell("42", "LONG", "id")).toBe(42);
    expect(parseDumpCell("1.5", "DOUBLE", "rating")).toBe(1.5);
    expect(parseDumpCell("true", "BOOLEAN", "developer")).toBe(true);
    expect(parseDumpCell("f", "BOOLEAN", "developer")).toBe(false);
    expect(parseDumpCell("1700000000", "TIMESTAMP", "updated_at")).toBe(1700000000);
    expect(parseDumpCell("2023-11-14 22:13:20", "TIMESTAMP", "updated_at")).toBe(1700000000);
    expect(parseDumpCell("2023-11-14T22:13:20Z", "TIMESTAMP", "updated_at")).toBe(1700000000);
    expect(parseDumpCell("{1,2,3}", "LONG[]", "dlcs")).toEqual([1, 2, 3]);
    expect(parseDumpCell("[1, 2]", "LONG[]", "dlcs")).toEqual([1, 2]);
    expect(parseDumpCell("{}", "LONG[]", "dlcs")).toEqual([]);
    expect(parseDumpCell("", "LONG", "id")).toBeNull();
    expect(parseDumpCell("NULL", "STRING", "name")).toBeNull();
    expect(parseDumpCell("a1b2", "UUID", "checksum")).toBe("a1b2");
  });

  it("refuses a cell it cannot read rather than guessing", () => {
    expect(() => parseDumpCell("abc", "LONG", "id")).toThrow(/id/);
    expect(() => parseDumpCell("1;2", "LONG[]", "dlcs")).toThrow(/array/);
    expect(() => parseDumpCell("{a,b}", "LONG[]", "dlcs")).toThrow(/non-integer/);
    expect(() => parseDumpCell("maybe", "BOOLEAN", "developer")).toThrow(/boolean/);
    expect(() => parseDumpCell("yesterday", "TIMESTAMP", "updated_at")).toThrow(/timestamp/);
  });

  it("splits quoted CSV fields and refuses ragged rows or unknown columns", () => {
    expect(splitCsvLine('1,"A, ""quoted"" name","{1,2}"')).toEqual(["1", 'A, "quoted" name', "{1,2}"]);
    expect(() => splitCsvLine('1,"open')).toThrow(/Unterminated/);
    const schema = { id: "LONG", name: "STRING", dlcs: "LONG[]" };
    expect(parseDumpCsv('id,name,dlcs\n1,"Game","{2,3}"\n', schema)).toEqual([{ id: 1, name: "Game", dlcs: [2, 3] }]);
    expect(() => parseDumpCsv("id,name,dlcs\n1,Game\n", schema)).toThrow(/row 1/);
    expect(() => parseDumpCsv("id,nope\n1,x\n", schema)).toThrow(/not in the dump schema/);
    expect(parseDumpCsv("", schema)).toEqual([]);
  });

  it("validates the documented dump descriptor and derives the provenance ref", () => {
    const descriptor = dumpDescriptorSchema.parse({
      s3_url: "https://example.invalid/presigned",
      endpoint: "games",
      file_name: "1234567890_games.csv",
      size_bytes: 123,
      updated_at: 1234567890,
      schema_version: "1234567890",
      schema: { id: "LONG", name: "STRING", checksum: "UUID" },
    });
    expect(dumpSourceRef(descriptor)).toBe("dump:1234567890_games.csv@1234567890");
    expect(() => dumpDescriptorSchema.parse({ endpoint: "games" })).toThrow();
  });
});

describe("dump and API paths normalize identically", () => {
  it("assembles the fixture from dump tables into the same staging the API records give", () => {
    const viaApi = normalizeGames(STAGING_PROOF_RECORDS);
    const viaDump = normalizeGames(assembleDumpGames(toDumpTables(STAGING_PROOF_RECORDS)));
    expect(digest(stripRaw(viaDump))).toBe(digest(stripRaw(viaApi)));
    expect(viaDump.games.map((g) => g.identityClass)).toEqual(viaApi.games.map((g) => g.identityClass));
  });

  it("refuses a games row without an id or a name", () => {
    expect(() => assembleDumpGames({ games: [{ id: 1, name: null }] })).toThrow(/without id\/name/);
  });

  it("keeps a reference id whose name table is absent, with a null name", () => {
    const [record] = assembleDumpGames({ games: [{ id: 1, name: "X", game_type: 4 }] });
    expect(record?.game_type).toEqual({ id: 4, name: null });
    expect(normalizeGames([record!]).games[0]?.identityClass).toBe("unclassified");
  });
});
