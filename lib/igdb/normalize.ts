import { IGDB_GAME_TYPE_NAMES, type IgdbGameTypeName } from "./contract";
import type { IgdbGameRecord } from "./record";

/**
 * Normalization: provider records → staging rows, deterministically.
 *
 * This is where IGDB's identity vocabulary is read, and read carefully:
 *
 *   version_parent   "If a version, this is the main game."      → version_of
 *   parent_game      "If a DLC, expansion or part of a bundle,
 *                     this is the main game or bundle."           → dlc_of /
 *                                                                   expansion_of /
 *                                                                   standalone_expansion_of /
 *                                                                   … by the child's game_type
 *   dlcs, expansions, standalone_expansions, expanded_games,
 *   bundles, ports, remakes, remasters, forks                     → the same edges asserted
 *                                                                   from the base game's side
 *
 * An edition is the same work; DLC is more of the work; a port, remake or
 * remaster is another realisation of the work; a bundle contains works. None
 * of these is collapsed into another, and none of them is a Should I Play?
 * game, profile scope or evaluation — that mapping is a reviewed human
 * decision recorded in `igdb_identity_candidates` (ADR 0037).
 *
 * Everything here is pure and total: the same input always yields the same
 * output, in the same order, and a malformed relation becomes a FLAG the
 * staging layer records rather than an exception that hides the record.
 */

export type IgdbIdentityClass =
  | "base_game"
  | "version_edition"
  | "dlc"
  | "expansion"
  | "standalone_expansion"
  | "bundle"
  | "port"
  | "remake"
  | "remaster"
  | "other_content"
  | "unclassified";

export type IgdbRelationKind =
  | "version_of"
  | "dlc_of"
  | "expansion_of"
  | "standalone_expansion_of"
  | "mod_of"
  | "episode_of"
  | "season_of"
  | "pack_of"
  | "update_of"
  | "bundle_contains"
  | "port_of"
  | "remake_of"
  | "remaster_of"
  | "expanded_game_of"
  | "fork_of"
  | "parent_game_unclassified";

export interface StagedGame {
  readonly igdbId: number;
  readonly checksum: string | null;
  readonly igdbUpdatedAt: string | null;
  readonly igdbCreatedAt: string | null;
  readonly name: string;
  readonly slug: string | null;
  readonly url: string | null;
  readonly summary: string | null;
  readonly versionTitle: string | null;
  readonly gameTypeId: number | null;
  readonly gameTypeName: string | null;
  readonly gameStatusId: number | null;
  readonly gameStatusName: string | null;
  readonly parentGameIgdbId: number | null;
  readonly versionParentIgdbId: number | null;
  readonly identityClass: IgdbIdentityClass;
  readonly firstReleaseDate: string | null;
  readonly platformIgdbIds: readonly number[];
  readonly raw: unknown;
}

export interface StagedRelation {
  readonly subjectIgdbId: number;
  readonly objectIgdbId: number;
  readonly kind: IgdbRelationKind;
  readonly sourceField: string;
  readonly assertedByIgdbId: number;
}

export interface StagedReleaseDate {
  readonly igdbId: number;
  readonly igdbGameId: number;
  readonly checksum: string | null;
  readonly igdbUpdatedAt: string | null;
  readonly platformIgdbId: number | null;
  readonly platformName: string | null;
  readonly releaseDate: string | null;
  readonly dateFormatId: number | null;
  readonly dateFormatName: string | null;
  readonly releaseRegionId: number | null;
  readonly releaseRegionName: string | null;
  readonly statusId: number | null;
  readonly statusName: string | null;
  readonly human: string | null;
  readonly raw: unknown;
}

export interface StagedImage {
  readonly imageKind: "cover" | "artwork";
  readonly igdbId: number;
  readonly igdbGameId: number;
  readonly checksum: string | null;
  readonly imageId: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly imageTypeId: number | null;
  readonly imageTypeName: string | null;
  readonly alphaChannel: boolean | null;
  readonly animated: boolean | null;
  readonly providerUrl: string | null;
  readonly gameLocalizationIgdbId: number | null;
  readonly raw: unknown;
}

export interface StagedInvolvedCompany {
  readonly igdbId: number;
  readonly igdbGameId: number;
  readonly checksum: string | null;
  readonly igdbUpdatedAt: string | null;
  readonly companyIgdbId: number | null;
  readonly companyName: string | null;
  readonly developer: boolean;
  readonly publisher: boolean;
  readonly porting: boolean;
  readonly supporting: boolean;
  readonly raw: unknown;
}

export interface StagedAlternativeName {
  readonly igdbId: number;
  readonly igdbGameId: number;
  readonly checksum: string | null;
  readonly name: string;
  readonly comment: string | null;
  readonly raw: unknown;
}

export interface StagedExternalGame {
  readonly igdbId: number;
  readonly igdbGameId: number;
  readonly checksum: string | null;
  readonly igdbUpdatedAt: string | null;
  readonly sourceId: number | null;
  readonly sourceName: string | null;
  readonly uid: string | null;
  readonly name: string | null;
  readonly platformIgdbId: number | null;
  readonly url: string | null;
  readonly releaseFormatId: number | null;
  readonly releaseFormatName: string | null;
  readonly raw: unknown;
}

export type StagingFlagCode =
  | "missing_checksum"
  | "missing_game_type"
  | "unknown_game_type"
  | "self_reference"
  | "parent_and_version_parent_both_set"
  | "version_of_non_main_type"
  | "parent_game_unclassified"
  | "relation_target_unstaged"
  | "relation_asserted_one_sided";

export interface StagingFlag {
  readonly igdbId: number;
  readonly code: StagingFlagCode;
  /** `refused`: the normalized column was withheld; `review`: a human should look; `info`: recorded only. */
  readonly severity: "refused" | "review" | "info";
  readonly detail: string;
}

export interface NormalizedStaging {
  readonly games: readonly StagedGame[];
  readonly relations: readonly StagedRelation[];
  readonly releaseDates: readonly StagedReleaseDate[];
  readonly images: readonly StagedImage[];
  readonly companies: readonly StagedInvolvedCompany[];
  readonly aliases: readonly StagedAlternativeName[];
  readonly externalGames: readonly StagedExternalGame[];
  readonly flags: readonly StagingFlag[];
}

const KNOWN_GAME_TYPES: ReadonlySet<string> = new Set(IGDB_GAME_TYPE_NAMES);

/** Unix seconds → ISO instant, or null. */
export function unixToIso(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined) return null;
  return new Date(seconds * 1000).toISOString();
}

/** Unix seconds → `YYYY-MM-DD` in UTC, or null. */
export function unixToDate(seconds: number | null | undefined): string | null {
  const iso = unixToIso(seconds);
  return iso ? iso.slice(0, 10) : null;
}

const PARENT_GAME_KIND: Readonly<Partial<Record<IgdbGameTypeName, IgdbRelationKind>>> = {
  dlc_addon: "dlc_of",
  expansion: "expansion_of",
  standalone_expansion: "standalone_expansion_of",
  mod: "mod_of",
  episode: "episode_of",
  season: "season_of",
  pack: "pack_of",
  update: "update_of",
};

/** What a record IS. `version_parent` decides first; the table-backed type decides the rest. */
export function identityClassOf(
  versionParent: number | null,
  gameTypeName: string | null,
): IgdbIdentityClass {
  if (versionParent !== null) return "version_edition";
  switch (gameTypeName) {
    case "main_game":
      return "base_game";
    case "dlc_addon":
      return "dlc";
    case "expansion":
      return "expansion";
    case "standalone_expansion":
      return "standalone_expansion";
    case "bundle":
      return "bundle";
    case "port":
      return "port";
    case "remake":
      return "remake";
    case "remaster":
      return "remaster";
    case "mod":
    case "episode":
    case "season":
    case "pack":
    case "update":
    case "expanded_game":
    case "fork":
      return "other_content";
    default:
      return "unclassified";
  }
}

/**
 * The edges one record asserts, each named after the field that asserted it.
 * Self-references are withheld and flagged; nothing else is interpreted.
 */
export function deriveRelations(record: IgdbGameRecord): {
  relations: StagedRelation[];
  flags: StagingFlag[];
} {
  const relations: StagedRelation[] = [];
  const flags: StagingFlag[] = [];
  const me = record.id;
  const typeName = record.game_type?.name ?? null;

  const push = (subject: number, object: number, kind: IgdbRelationKind, sourceField: string) => {
    if (subject === object) {
      flags.push({
        igdbId: me,
        code: "self_reference",
        severity: "refused",
        detail: `${sourceField} points at the record itself; the edge was not staged.`,
      });
      return;
    }
    relations.push({ subjectIgdbId: subject, objectIgdbId: object, kind, sourceField, assertedByIgdbId: me });
  };

  if (record.version_parent !== null) {
    push(me, record.version_parent, "version_of", "version_parent");
    if (typeName !== null && typeName !== "main_game" && KNOWN_GAME_TYPES.has(typeName)) {
      flags.push({
        igdbId: me,
        code: "version_of_non_main_type",
        severity: "review",
        detail: `version_parent is set on a record whose game_type is ${typeName}; an edition is normally a main_game.`,
      });
    }
  }

  if (record.parent_game !== null) {
    const kind =
      typeName !== null && KNOWN_GAME_TYPES.has(typeName)
        ? (PARENT_GAME_KIND[typeName as IgdbGameTypeName] ?? "parent_game_unclassified")
        : "parent_game_unclassified";
    push(me, record.parent_game, kind, "parent_game");
    if (kind === "parent_game_unclassified") {
      flags.push({
        igdbId: me,
        code: "parent_game_unclassified",
        severity: "review",
        detail: `parent_game is set but game_type ${typeName ?? "(none)"} does not say what kind of content this is.`,
      });
    }
    if (record.version_parent !== null) {
      flags.push({
        igdbId: me,
        code: "parent_and_version_parent_both_set",
        severity: "review",
        detail: "Both parent_game and version_parent are set; IGDB treats these as different relations.",
      });
    }
  }

  // Asserted from the base game's side. Subject is the OTHER record, object is me,
  // except bundles, where the bundle is the subject that contains me.
  const fromBase: readonly [readonly number[], IgdbRelationKind, string][] = [
    [record.dlcs, "dlc_of", "dlcs"],
    [record.expansions, "expansion_of", "expansions"],
    [record.standalone_expansions, "standalone_expansion_of", "standalone_expansions"],
    [record.expanded_games, "expanded_game_of", "expanded_games"],
    [record.ports, "port_of", "ports"],
    [record.remakes, "remake_of", "remakes"],
    [record.remasters, "remaster_of", "remasters"],
    [record.forks, "fork_of", "forks"],
  ];
  for (const [ids, kind, field] of fromBase) {
    for (const other of ids) push(other, me, kind, field);
  }
  for (const bundle of record.bundles) push(bundle, me, "bundle_contains", "bundles");

  return { relations: sortRelations(relations), flags };
}

function sortRelations(relations: StagedRelation[]): StagedRelation[] {
  return [...relations].sort(
    (a, b) =>
      a.subjectIgdbId - b.subjectIgdbId ||
      a.objectIgdbId - b.objectIgdbId ||
      a.kind.localeCompare(b.kind) ||
      a.sourceField.localeCompare(b.sourceField),
  );
}

/** Normalize one record. Children are sorted by id so output is stable. */
export function normalizeGame(record: IgdbGameRecord): {
  game: StagedGame;
  relations: StagedRelation[];
  releaseDates: StagedReleaseDate[];
  images: StagedImage[];
  companies: StagedInvolvedCompany[];
  aliases: StagedAlternativeName[];
  externalGames: StagedExternalGame[];
  flags: StagingFlag[];
} {
  const flags: StagingFlag[] = [];
  const me = record.id;
  const typeName = record.game_type?.name ?? null;

  if (record.checksum === null) {
    flags.push({
      igdbId: me,
      code: "missing_checksum",
      severity: "info",
      detail: "The provider record carried no checksum; change detection falls back to field comparison.",
    });
  }
  if (record.game_type === null) {
    flags.push({ igdbId: me, code: "missing_game_type", severity: "review", detail: "No game_type on the record." });
  } else if (typeName === null || !KNOWN_GAME_TYPES.has(typeName)) {
    flags.push({
      igdbId: me,
      code: "unknown_game_type",
      severity: "review",
      detail: `game_type id ${record.game_type.id} resolved to ${typeName === null ? "no name" : `"${typeName}"`}, which this layer does not know.`,
    });
  }

  // Self-references are refused at the column level too; the database has the same check.
  const parentGame = record.parent_game === me ? null : record.parent_game;
  const versionParent = record.version_parent === me ? null : record.version_parent;

  const derived = deriveRelations(record);
  flags.push(...derived.flags);

  const game: StagedGame = {
    igdbId: me,
    checksum: record.checksum,
    igdbUpdatedAt: unixToIso(record.updated_at),
    igdbCreatedAt: unixToIso(record.created_at),
    name: record.name,
    slug: record.slug,
    url: record.url,
    summary: record.summary,
    versionTitle: record.version_title,
    gameTypeId: record.game_type?.id ?? null,
    gameTypeName: typeName,
    gameStatusId: record.game_status?.id ?? null,
    gameStatusName: record.game_status?.name ?? null,
    parentGameIgdbId: parentGame,
    versionParentIgdbId: versionParent,
    identityClass: identityClassOf(versionParent, typeName),
    firstReleaseDate: unixToDate(record.first_release_date),
    platformIgdbIds: [...record.platforms].sort((a, b) => a - b),
    raw: record.raw,
  };

  const releaseDates = [...record.release_dates]
    .sort((a, b) => a.id - b.id)
    .map(
      (rd): StagedReleaseDate => ({
        igdbId: rd.id,
        igdbGameId: me,
        checksum: rd.checksum,
        igdbUpdatedAt: unixToIso(rd.updated_at),
        platformIgdbId: rd.platform?.id ?? null,
        platformName: rd.platform?.name ?? null,
        releaseDate: unixToDate(rd.date),
        dateFormatId: rd.date_format?.id ?? null,
        dateFormatName: rd.date_format?.name ?? null,
        releaseRegionId: rd.release_region?.id ?? null,
        releaseRegionName: rd.release_region?.name ?? null,
        statusId: rd.status?.id ?? null,
        statusName: rd.status?.name ?? null,
        human: rd.human,
        raw: rd.raw,
      }),
    );

  const toImage = (kind: "cover" | "artwork", image: NonNullable<IgdbGameRecord["cover"]>): StagedImage => ({
    imageKind: kind,
    igdbId: image.id,
    igdbGameId: me,
    checksum: image.checksum,
    imageId: image.image_id,
    width: image.width,
    height: image.height,
    imageTypeId: image.image_type?.id ?? null,
    imageTypeName: image.image_type?.name ?? null,
    alphaChannel: image.alpha_channel,
    animated: image.animated,
    providerUrl: image.url,
    gameLocalizationIgdbId: image.game_localization,
    raw: image.raw,
  });
  const images: StagedImage[] = [
    ...(record.cover ? [toImage("cover", record.cover)] : []),
    ...[...record.artworks].sort((a, b) => a.id - b.id).map((image) => toImage("artwork", image)),
  ];

  const companies = [...record.involved_companies]
    .sort((a, b) => a.id - b.id)
    .map(
      (ic): StagedInvolvedCompany => ({
        igdbId: ic.id,
        igdbGameId: me,
        checksum: ic.checksum,
        igdbUpdatedAt: unixToIso(ic.updated_at),
        companyIgdbId: ic.company?.id ?? null,
        companyName: ic.company?.name ?? null,
        developer: ic.developer,
        publisher: ic.publisher,
        porting: ic.porting,
        supporting: ic.supporting,
        raw: ic.raw,
      }),
    );

  const aliases = [...record.alternative_names]
    .sort((a, b) => a.id - b.id)
    .map(
      (an): StagedAlternativeName => ({
        igdbId: an.id,
        igdbGameId: me,
        checksum: an.checksum,
        name: an.name,
        comment: an.comment,
        raw: an.raw,
      }),
    );

  const externalGames = [...record.external_games]
    .sort((a, b) => a.id - b.id)
    .map(
      (eg): StagedExternalGame => ({
        igdbId: eg.id,
        igdbGameId: me,
        checksum: eg.checksum,
        igdbUpdatedAt: unixToIso(eg.updated_at),
        sourceId: eg.external_game_source?.id ?? null,
        sourceName: eg.external_game_source?.name ?? null,
        uid: eg.uid,
        name: eg.name,
        platformIgdbId: eg.platform,
        url: eg.url,
        releaseFormatId: eg.game_release_format?.id ?? null,
        releaseFormatName: eg.game_release_format?.name ?? null,
        raw: eg.raw,
      }),
    );

  return { game, relations: derived.relations, releaseDates, images, companies, aliases, externalGames, flags };
}

/**
 * Normalize a batch. Output order depends only on ids, never on input order,
 * so two fetches of the same records produce identical staging — which is what
 * makes idempotent upserts and byte-comparable proofs possible.
 */
export function normalizeGames(records: readonly IgdbGameRecord[]): NormalizedStaging {
  const seen = new Set<number>();
  for (const record of records) {
    if (seen.has(record.id)) throw new Error(`IGDB record ${record.id} appears twice in one batch.`);
    seen.add(record.id);
  }
  const ordered = [...records].sort((a, b) => a.id - b.id);
  const games: StagedGame[] = [];
  const relations: StagedRelation[] = [];
  const releaseDates: StagedReleaseDate[] = [];
  const images: StagedImage[] = [];
  const companies: StagedInvolvedCompany[] = [];
  const aliases: StagedAlternativeName[] = [];
  const externalGames: StagedExternalGame[] = [];
  const flags: StagingFlag[] = [];

  for (const record of ordered) {
    const one = normalizeGame(record);
    games.push(one.game);
    relations.push(...one.relations);
    releaseDates.push(...one.releaseDates);
    images.push(...one.images);
    companies.push(...one.companies);
    aliases.push(...one.aliases);
    externalGames.push(...one.externalGames);
    flags.push(...one.flags);
  }

  // Cross-record checks: a target we do not hold, and an edge only one side asserts.
  const staged = new Set(games.map((game) => game.igdbId));
  const edgeKey = (r: StagedRelation) => `${r.subjectIgdbId}>${r.objectIgdbId}:${r.kind}`;
  const assertedBy = new Map<string, Set<number>>();
  for (const relation of relations) {
    const key = edgeKey(relation);
    if (!assertedBy.has(key)) assertedBy.set(key, new Set());
    assertedBy.get(key)!.add(relation.assertedByIgdbId);
  }
  const seenOneSided = new Set<string>();
  for (const relation of relations) {
    const other = relation.assertedByIgdbId === relation.subjectIgdbId ? relation.objectIgdbId : relation.subjectIgdbId;
    if (!staged.has(other)) {
      flags.push({
        igdbId: relation.assertedByIgdbId,
        code: "relation_target_unstaged",
        severity: "info",
        detail: `${relation.sourceField} names IGDB ${other}, which is not in this batch; the edge is staged and the target is not.`,
      });
    } else if (relation.kind !== "version_of" && relation.kind !== "bundle_contains" && relation.kind !== "parent_game_unclassified") {
      const asserters = assertedBy.get(edgeKey(relation))!;
      if (asserters.size === 1 && !seenOneSided.has(edgeKey(relation))) {
        seenOneSided.add(edgeKey(relation));
        flags.push({
          igdbId: relation.assertedByIgdbId,
          code: "relation_asserted_one_sided",
          severity: "info",
          detail: `${relation.kind} between ${relation.subjectIgdbId} and ${relation.objectIgdbId} is asserted by ${relation.assertedByIgdbId} only, though both records are staged.`,
        });
      }
    }
  }

  return {
    games,
    relations: sortRelations(relations),
    releaseDates,
    images,
    companies,
    aliases,
    externalGames,
    flags: [...flags].sort(
      (a, b) => a.igdbId - b.igdbId || a.code.localeCompare(b.code) || a.detail.localeCompare(b.detail),
    ),
  };
}
