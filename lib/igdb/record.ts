import { z } from "zod";

/**
 * The provider record as this layer understands it, and the parser that turns
 * an IGDB API response into one.
 *
 * `IgdbGameRecord` is the single intermediate shape both ingestion paths
 * produce — the API (`parseApiGame`) and the Data Partner dumps
 * (`lib/igdb/dump.ts`) — so normalization, change detection and staging have
 * exactly one input and cannot drift between paths (issue #48 §4).
 *
 * Table-backed references (`game_type`, `game_status`, `image_type`,
 * `date_format`, `release_region`, `status`, `external_game_source`,
 * `game_release_format`) are carried as `{ id, name }`. The name is what the
 * layer resolves on; the id is kept beside it as provenance. No deprecated
 * enum field is read (`IGDB_DEPRECATED_GAME_FIELDS`).
 */

export interface IgdbNamedRef {
  readonly id: number;
  readonly name: string | null;
}

export interface IgdbImageRecord {
  readonly id: number;
  readonly image_id: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly url: string | null;
  readonly checksum: string | null;
  readonly alpha_channel: boolean | null;
  readonly animated: boolean | null;
  readonly image_type: IgdbNamedRef | null;
  readonly game_localization: number | null;
  readonly raw: unknown;
}

export interface IgdbReleaseDateRecord {
  readonly id: number;
  readonly checksum: string | null;
  readonly updated_at: number | null;
  readonly date: number | null;
  readonly human: string | null;
  readonly platform: IgdbNamedRef | null;
  readonly date_format: IgdbNamedRef | null;
  readonly release_region: IgdbNamedRef | null;
  readonly status: IgdbNamedRef | null;
  readonly raw: unknown;
}

export interface IgdbInvolvedCompanyRecord {
  readonly id: number;
  readonly checksum: string | null;
  readonly updated_at: number | null;
  readonly company: IgdbNamedRef | null;
  readonly developer: boolean;
  readonly publisher: boolean;
  readonly porting: boolean;
  readonly supporting: boolean;
  readonly raw: unknown;
}

export interface IgdbAlternativeNameRecord {
  readonly id: number;
  readonly checksum: string | null;
  readonly name: string;
  readonly comment: string | null;
  readonly raw: unknown;
}

export interface IgdbExternalGameRecord {
  readonly id: number;
  readonly checksum: string | null;
  readonly updated_at: number | null;
  readonly uid: string | null;
  readonly name: string | null;
  readonly url: string | null;
  readonly platform: number | null;
  readonly external_game_source: IgdbNamedRef | null;
  readonly game_release_format: IgdbNamedRef | null;
  readonly raw: unknown;
}

export interface IgdbGameRecord {
  readonly id: number;
  readonly checksum: string | null;
  readonly updated_at: number | null;
  readonly created_at: number | null;
  readonly name: string;
  readonly slug: string | null;
  readonly url: string | null;
  readonly summary: string | null;
  readonly first_release_date: number | null;
  readonly version_title: string | null;
  readonly game_type: IgdbNamedRef | null;
  readonly game_status: IgdbNamedRef | null;
  readonly parent_game: number | null;
  readonly version_parent: number | null;
  readonly dlcs: readonly number[];
  readonly expansions: readonly number[];
  readonly standalone_expansions: readonly number[];
  readonly expanded_games: readonly number[];
  readonly bundles: readonly number[];
  readonly ports: readonly number[];
  readonly remakes: readonly number[];
  readonly remasters: readonly number[];
  readonly forks: readonly number[];
  readonly platforms: readonly number[];
  readonly cover: IgdbImageRecord | null;
  readonly artworks: readonly IgdbImageRecord[];
  readonly release_dates: readonly IgdbReleaseDateRecord[];
  readonly involved_companies: readonly IgdbInvolvedCompanyRecord[];
  readonly alternative_names: readonly IgdbAlternativeNameRecord[];
  readonly external_games: readonly IgdbExternalGameRecord[];
  /** The provider payload exactly as received. */
  readonly raw: unknown;
}

/* ── API JSON parsing ───────────────────────────────────────────────────── */

const id = z.number().int().positive();
const unix = z.number().int().nonnegative();
const optionalText = z.string().nullable().optional();
const optionalBool = z.boolean().nullable().optional();
const optionalUnix = unix.nullable().optional();
const optionalChecksum = z.string().nullable().optional();

/** A reference may arrive expanded (object) or bare (id). */
function namedRef(nameField: string) {
  return z
    .union([id, z.object({ id }).passthrough()])
    .nullable()
    .optional()
    .transform((value): IgdbNamedRef | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === "number") return { id: value, name: null };
      const name = (value as Record<string, unknown>)[nameField];
      return { id: value.id, name: typeof name === "string" ? name : null };
    });
}

const bareRef = z
  .union([id, z.object({ id }).passthrough()])
  .nullable()
  .optional()
  .transform((value): number | null =>
    value === null || value === undefined ? null : typeof value === "number" ? value : value.id,
  );

const refList = z
  .array(z.union([id, z.object({ id }).passthrough()]))
  .optional()
  .transform((values): number[] =>
    (values ?? []).map((value) => (typeof value === "number" ? value : value.id)).sort((a, b) => a - b),
  );

const imageSchema = z
  .object({
    id,
    image_id: z.string().regex(/^[A-Za-z0-9_-]+$/),
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
    url: optionalText,
    checksum: optionalChecksum,
    alpha_channel: optionalBool,
    animated: optionalBool,
    image_type: namedRef("name"),
    game_localization: bareRef,
  })
  .passthrough();

const releaseDateSchema = z
  .object({
    id,
    checksum: optionalChecksum,
    updated_at: optionalUnix,
    date: unix.nullable().optional(),
    human: optionalText,
    platform: namedRef("name"),
    date_format: namedRef("format"),
    release_region: namedRef("region"),
    status: namedRef("name"),
  })
  .passthrough();

const involvedCompanySchema = z
  .object({
    id,
    checksum: optionalChecksum,
    updated_at: optionalUnix,
    company: namedRef("name"),
    developer: optionalBool,
    publisher: optionalBool,
    porting: optionalBool,
    supporting: optionalBool,
  })
  .passthrough();

const alternativeNameSchema = z
  .object({ id, checksum: optionalChecksum, name: z.string().min(1), comment: optionalText })
  .passthrough();

const externalGameSchema = z
  .object({
    id,
    checksum: optionalChecksum,
    updated_at: optionalUnix,
    uid: optionalText,
    name: optionalText,
    url: optionalText,
    platform: bareRef,
    external_game_source: namedRef("name"),
    game_release_format: namedRef("format"),
  })
  .passthrough();

/**
 * Children that arrive as bare ids were not expanded. They are dropped from the
 * record and reported, so a query that forgot an expander is visible rather
 * than silently staging an empty cover.
 */
function expandedList<T extends z.ZodTypeAny>(schema: T) {
  return z.array(z.union([id, schema])).optional();
}

const apiGameSchema = z
  .object({
    id,
    checksum: optionalChecksum,
    updated_at: optionalUnix,
    created_at: optionalUnix,
    name: z.string().min(1),
    slug: optionalText,
    url: optionalText,
    summary: optionalText,
    first_release_date: unix.nullable().optional(),
    version_title: optionalText,
    game_type: namedRef("type"),
    game_status: namedRef("status"),
    parent_game: bareRef,
    version_parent: bareRef,
    dlcs: refList,
    expansions: refList,
    standalone_expansions: refList,
    expanded_games: refList,
    bundles: refList,
    ports: refList,
    remakes: refList,
    remasters: refList,
    forks: refList,
    platforms: refList,
    cover: z.union([id, imageSchema]).nullable().optional(),
    artworks: expandedList(imageSchema),
    release_dates: expandedList(releaseDateSchema),
    involved_companies: expandedList(involvedCompanySchema),
    alternative_names: expandedList(alternativeNameSchema),
    external_games: expandedList(externalGameSchema),
  })
  .passthrough();

export interface ParsedApiGame {
  readonly record: IgdbGameRecord;
  /** Fields whose children were not expanded and were therefore dropped. */
  readonly unexpanded: readonly string[];
}

function toImage(value: z.infer<typeof imageSchema>, raw: unknown): IgdbImageRecord {
  return {
    id: value.id,
    image_id: value.image_id,
    width: value.width ?? null,
    height: value.height ?? null,
    url: value.url ?? null,
    checksum: value.checksum ?? null,
    alpha_channel: value.alpha_channel ?? null,
    animated: value.animated ?? null,
    image_type: value.image_type,
    game_localization: value.game_localization,
    raw,
  };
}

function rawOf(list: unknown, index: number): unknown {
  return Array.isArray(list) ? list[index] : undefined;
}

function splitExpanded<T extends { id: number }>(
  field: string,
  values: readonly (number | T)[] | undefined,
  rawList: unknown,
  unexpanded: string[],
): { readonly value: T; readonly raw: unknown }[] {
  const out: { value: T; raw: unknown }[] = [];
  let dropped = false;
  (values ?? []).forEach((value, index) => {
    if (typeof value === "number") dropped = true;
    else out.push({ value, raw: rawOf(rawList, index) });
  });
  if (dropped) unexpanded.push(field);
  return out.sort((a, b) => a.value.id - b.value.id);
}

/** Parse one game object from an IGDB `/games` response. Throws on a malformed record. */
export function parseApiGame(value: unknown): ParsedApiGame {
  const parsed = apiGameSchema.parse(value);
  const source = value as Record<string, unknown>;
  const unexpanded: string[] = [];

  let cover: IgdbImageRecord | null = null;
  if (typeof parsed.cover === "number") unexpanded.push("cover");
  else if (parsed.cover) cover = toImage(parsed.cover, source.cover);

  const artworks = splitExpanded("artworks", parsed.artworks, source.artworks, unexpanded).map(
    ({ value: image, raw }) => toImage(image, raw),
  );
  const releaseDates = splitExpanded(
    "release_dates",
    parsed.release_dates,
    source.release_dates,
    unexpanded,
  ).map(
    ({ value: rd, raw }): IgdbReleaseDateRecord => ({
      id: rd.id,
      checksum: rd.checksum ?? null,
      updated_at: rd.updated_at ?? null,
      date: rd.date ?? null,
      human: rd.human ?? null,
      platform: rd.platform,
      date_format: rd.date_format,
      release_region: rd.release_region,
      status: rd.status,
      raw,
    }),
  );
  const companies = splitExpanded(
    "involved_companies",
    parsed.involved_companies,
    source.involved_companies,
    unexpanded,
  ).map(
    ({ value: ic, raw }): IgdbInvolvedCompanyRecord => ({
      id: ic.id,
      checksum: ic.checksum ?? null,
      updated_at: ic.updated_at ?? null,
      company: ic.company,
      developer: ic.developer ?? false,
      publisher: ic.publisher ?? false,
      porting: ic.porting ?? false,
      supporting: ic.supporting ?? false,
      raw,
    }),
  );
  const aliases = splitExpanded(
    "alternative_names",
    parsed.alternative_names,
    source.alternative_names,
    unexpanded,
  ).map(
    ({ value: an, raw }): IgdbAlternativeNameRecord => ({
      id: an.id,
      checksum: an.checksum ?? null,
      name: an.name,
      comment: an.comment ?? null,
      raw,
    }),
  );
  const externalGames = splitExpanded(
    "external_games",
    parsed.external_games,
    source.external_games,
    unexpanded,
  ).map(
    ({ value: eg, raw }): IgdbExternalGameRecord => ({
      id: eg.id,
      checksum: eg.checksum ?? null,
      updated_at: eg.updated_at ?? null,
      uid: eg.uid ?? null,
      name: eg.name ?? null,
      url: eg.url ?? null,
      platform: eg.platform,
      external_game_source: eg.external_game_source,
      game_release_format: eg.game_release_format,
      raw,
    }),
  );

  const record: IgdbGameRecord = {
    id: parsed.id,
    checksum: parsed.checksum ?? null,
    updated_at: parsed.updated_at ?? null,
    created_at: parsed.created_at ?? null,
    name: parsed.name,
    slug: parsed.slug ?? null,
    url: parsed.url ?? null,
    summary: parsed.summary ?? null,
    first_release_date: parsed.first_release_date ?? null,
    version_title: parsed.version_title ?? null,
    game_type: parsed.game_type,
    game_status: parsed.game_status,
    parent_game: parsed.parent_game,
    version_parent: parsed.version_parent,
    dlcs: parsed.dlcs,
    expansions: parsed.expansions,
    standalone_expansions: parsed.standalone_expansions,
    expanded_games: parsed.expanded_games,
    bundles: parsed.bundles,
    ports: parsed.ports,
    remakes: parsed.remakes,
    remasters: parsed.remasters,
    forks: parsed.forks,
    platforms: parsed.platforms,
    cover,
    artworks,
    release_dates: releaseDates,
    involved_companies: companies,
    alternative_names: aliases,
    external_games: externalGames,
    raw: value,
  };
  return { record, unexpanded };
}

/** Parse a whole `/games` response body. Throws on a malformed element, naming its position. */
export function parseApiGames(body: unknown): { records: IgdbGameRecord[]; unexpanded: string[] } {
  if (!Array.isArray(body)) throw new Error("IGDB /games response is not an array.");
  const records: IgdbGameRecord[] = [];
  const unexpanded = new Set<string>();
  body.forEach((element, index) => {
    try {
      const parsed = parseApiGame(element);
      records.push(parsed.record);
      parsed.unexpanded.forEach((field) => unexpanded.add(field));
    } catch (error) {
      throw new Error(
        `IGDB /games element ${index} is malformed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
  return { records, unexpanded: [...unexpanded].sort() };
}
