import type { IgdbGameRecord, IgdbImageRecord, IgdbReleaseDateRecord } from "@/lib/igdb/record";

/**
 * The Item 5 staging-proof fixture: a deliberately small, SYNTHETIC corpus in
 * the shape of IGDB `/games` records, exercising every relationship the
 * staging layer must keep distinct (issue #48 §6).
 *
 * Every id, name and image hash here is invented and out of any real IGDB
 * range. No calibration title appears. Two platform ids are the ones the IGDB
 * docs themselves use in examples (6 = PC, 48 = PlayStation 4); the third is
 * synthetic. Nothing about a real game is asserted, so nothing here can be
 * mistaken for research, evidence or a mapping decision.
 *
 * The shape of the corpus:
 *
 *   9000001  Fixture Base Game                 main_game
 *   9000002  … Gold Edition                    main_game, version_parent → 9000001
 *   9000003  … Night Chapter                   dlc_addon, parent_game → 9000001
 *   9000004  … Far Shore                       expansion, parent_game → 9000001
 *   9000005  … Standalone Tale                 standalone_expansion, parent_game → 9000001
 *   9000006  Fixture Base Game Remastered      remaster (asserted by base.remasters)
 *   9000007  Fixture Base Game (Handheld)      port (asserted by base.ports)
 *   9000008  Fixture Complete Bundle           bundle (asserted by base.bundles)
 *   9000009  Fixture Base Game Remake          remake, and ALSO parent_game → base
 *                                              with type remake: parent_game_unclassified
 *   9000010  Fixture Orphan Content            dlc_addon, parent_game → 9000999 (not staged)
 */

export const FIXTURE_SOURCE_REF = "fixture:item5-staging-proof-v1";

const T0 = 1_700_000_000; // a fixed unix instant so output is byte-stable
const PC = { id: 6, name: "PC (Microsoft Windows)" };
const PS4 = { id: 48, name: "PlayStation 4" };
const HANDHELD = { id: 9_000_130, name: "Fixture Handheld" };

const TYPE = {
  main_game: { id: 9_100_000, name: "main_game" },
  dlc_addon: { id: 9_100_001, name: "dlc_addon" },
  expansion: { id: 9_100_002, name: "expansion" },
  bundle: { id: 9_100_003, name: "bundle" },
  standalone_expansion: { id: 9_100_004, name: "standalone_expansion" },
  remake: { id: 9_100_008, name: "remake" },
  remaster: { id: 9_100_009, name: "remaster" },
  port: { id: 9_100_011, name: "port" },
} as const;
const RELEASED = { id: 9_200_000, name: "released" };
const FULL_DATE = { id: 9_300_000, name: "YYYYMMMMDD" };
const WORLDWIDE = { id: 9_400_008, name: "worldwide" };
const EUROPE = { id: 9_400_001, name: "europe" };
const RD_RELEASED = { id: 9_500_000, name: "Released" };
const COVER_TYPE = { id: 9_600_001, name: "Cover" };
const ART_TYPE = { id: 9_600_002, name: "Artwork" };

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function release(id: number, platform: { id: number; name: string }, day: number, region = WORLDWIDE): IgdbReleaseDateRecord {
  const date = T0 + day * 86_400;
  return {
    id,
    checksum: uuid(id),
    updated_at: T0,
    date,
    human: new Date(date * 1000).toISOString().slice(0, 10),
    platform,
    date_format: FULL_DATE,
    release_region: region,
    status: RD_RELEASED,
    raw: { id, fixture: true },
  };
}

function cover(id: number, imageId: string): IgdbImageRecord {
  return {
    id,
    image_id: imageId,
    width: 600,
    height: 800,
    url: `//images.igdb.com/igdb/image/upload/t_thumb/${imageId}.jpg`,
    checksum: uuid(id),
    alpha_channel: false,
    animated: false,
    image_type: COVER_TYPE,
    game_localization: null,
    raw: { id, fixture: true },
  };
}

function artwork(id: number, imageId: string): IgdbImageRecord {
  return { ...cover(id, imageId), width: 1920, height: 1080, image_type: ART_TYPE };
}

function game(partial: Partial<IgdbGameRecord> & Pick<IgdbGameRecord, "id" | "name">): IgdbGameRecord {
  const base: IgdbGameRecord = {
    id: partial.id,
    checksum: uuid(partial.id),
    updated_at: T0,
    created_at: T0 - 86_400,
    name: partial.name,
    slug: partial.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    url: `https://www.igdb.com/games/fixture-${partial.id}`,
    summary: null,
    first_release_date: T0,
    version_title: null,
    game_type: TYPE.main_game,
    game_status: RELEASED,
    parent_game: null,
    version_parent: null,
    dlcs: [],
    expansions: [],
    standalone_expansions: [],
    expanded_games: [],
    bundles: [],
    ports: [],
    remakes: [],
    remasters: [],
    forks: [],
    platforms: [PC.id],
    cover: null,
    artworks: [],
    release_dates: [],
    involved_companies: [],
    alternative_names: [],
    external_games: [],
    raw: { id: partial.id, fixture: true },
  };
  return { ...base, ...partial };
}

export const BASE_GAME_ID = 9_000_001;
export const GOLD_EDITION_ID = 9_000_002;
export const DLC_ID = 9_000_003;
export const EXPANSION_ID = 9_000_004;
export const STANDALONE_EXPANSION_ID = 9_000_005;
export const REMASTER_ID = 9_000_006;
export const PORT_ID = 9_000_007;
export const BUNDLE_ID = 9_000_008;
export const REMAKE_ID = 9_000_009;
export const ORPHAN_ID = 9_000_010;
export const UNSTAGED_PARENT_ID = 9_000_999;

export const STAGING_PROOF_RECORDS: readonly IgdbGameRecord[] = [
  game({
    id: BASE_GAME_ID,
    name: "Fixture Base Game",
    summary: "A synthetic base game used only to prove staging relationships.",
    platforms: [PC.id, PS4.id],
    dlcs: [DLC_ID],
    expansions: [EXPANSION_ID],
    standalone_expansions: [STANDALONE_EXPANSION_ID],
    remasters: [REMASTER_ID],
    remakes: [REMAKE_ID],
    ports: [PORT_ID],
    bundles: [BUNDLE_ID],
    cover: cover(9_700_001, "fixturecoverbase0001"),
    artworks: [artwork(9_800_001, "fixtureartbase00001"), artwork(9_800_002, "fixtureartbase00002")],
    release_dates: [release(9_900_001, PC, 0), release(9_900_002, PS4, 0), release(9_900_003, PS4, 3, EUROPE)],
    involved_companies: [
      { id: 9_910_001, checksum: uuid(9_910_001), updated_at: T0, company: { id: 9_920_001, name: "Fixture Studio" }, developer: true, publisher: false, porting: false, supporting: false, raw: { fixture: true } },
      { id: 9_910_002, checksum: uuid(9_910_002), updated_at: T0, company: { id: 9_920_002, name: "Fixture Publishing" }, developer: false, publisher: true, porting: false, supporting: false, raw: { fixture: true } },
    ],
    alternative_names: [{ id: 9_930_001, checksum: uuid(9_930_001), name: "FBG", comment: "Acronym", raw: { fixture: true } }],
    external_games: [
      { id: 9_940_001, checksum: uuid(9_940_001), updated_at: T0, uid: "900000001", name: "Fixture Base Game", url: null, platform: PC.id, external_game_source: { id: 9_950_001, name: "Fixture Store" }, game_release_format: { id: 9_960_001, name: "Digital" }, raw: { fixture: true } },
    ],
  }),
  game({
    id: GOLD_EDITION_ID,
    name: "Fixture Base Game: Gold Edition",
    version_title: "Gold Edition",
    version_parent: BASE_GAME_ID,
    platforms: [PC.id, PS4.id],
    release_dates: [release(9_900_011, PC, 200), release(9_900_012, PS4, 200)],
    cover: cover(9_700_002, "fixturecovergold0002"),
  }),
  game({ id: DLC_ID, name: "Fixture Base Game: Night Chapter", game_type: TYPE.dlc_addon, parent_game: BASE_GAME_ID, release_dates: [release(9_900_021, PC, 90)] }),
  game({ id: EXPANSION_ID, name: "Fixture Base Game: Far Shore", game_type: TYPE.expansion, parent_game: BASE_GAME_ID, release_dates: [release(9_900_031, PC, 180), release(9_900_032, PS4, 180)] }),
  game({
    id: STANDALONE_EXPANSION_ID,
    name: "Fixture Base Game: Standalone Tale",
    game_type: TYPE.standalone_expansion,
    parent_game: BASE_GAME_ID,
    cover: cover(9_700_005, "fixturecoverstand005"),
    release_dates: [release(9_900_041, PC, 400)],
  }),
  game({ id: REMASTER_ID, name: "Fixture Base Game Remastered", game_type: TYPE.remaster, platforms: [PS4.id], release_dates: [release(9_900_051, PS4, 1000)] }),
  game({ id: PORT_ID, name: "Fixture Base Game (Handheld)", game_type: TYPE.port, platforms: [HANDHELD.id], release_dates: [release(9_900_061, HANDHELD, 700)] }),
  game({ id: BUNDLE_ID, name: "Fixture Complete Bundle", game_type: TYPE.bundle, platforms: [PC.id], release_dates: [release(9_900_071, PC, 500)] }),
  game({ id: REMAKE_ID, name: "Fixture Base Game Remake", game_type: TYPE.remake, parent_game: BASE_GAME_ID, platforms: [PS4.id] }),
  game({ id: ORPHAN_ID, name: "Fixture Orphan Content", game_type: TYPE.dlc_addon, parent_game: UNSTAGED_PARENT_ID }),
];

/**
 * A second observation of the same corpus, with five deliberate provider
 * changes — one per change class — so the proof exercises classification:
 *
 *   base game     summary re-worded, checksum moved        provider_text_drift
 *   base game     cover replaced                           artwork_candidate
 *   gold edition  a third release date appears             platform_or_release
 *   remaster      base now also lists it under `ports`     identity_or_relationship
 *   dlc           re-parented to the gold edition          material_scope
 */
export const STAGING_PROOF_RECORDS_REVISED: readonly IgdbGameRecord[] = STAGING_PROOF_RECORDS.map((record) => {
  switch (record.id) {
    case BASE_GAME_ID:
      return {
        ...record,
        checksum: uuid(record.id + 1_000_000),
        updated_at: T0 + 86_400,
        summary: "A synthetic base game, re-described by the provider.",
        cover: cover(9_700_101, "fixturecoverbase0101"),
        ports: [PORT_ID, REMASTER_ID],
      };
    case GOLD_EDITION_ID:
      return {
        ...record,
        checksum: uuid(record.id + 1_000_000),
        updated_at: T0 + 86_400,
        release_dates: [...record.release_dates, release(9_900_013, HANDHELD, 260)],
      };
    case DLC_ID:
      return { ...record, checksum: uuid(record.id + 1_000_000), updated_at: T0 + 86_400, parent_game: GOLD_EDITION_ID };
    default:
      return record;
  }
});
