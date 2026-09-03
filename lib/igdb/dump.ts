import { z } from "zod";
import type {
  IgdbAlternativeNameRecord,
  IgdbExternalGameRecord,
  IgdbGameRecord,
  IgdbImageRecord,
  IgdbInvolvedCompanyRecord,
  IgdbNamedRef,
  IgdbReleaseDateRecord,
} from "./record";

/**
 * Data Partner dump adapter.
 *
 * The docs (Partnership → Data Dumps) say: dumps are exclusive to Data
 * Partners; every endpoint is available as a daily CSV; `GET /v4/dumps` lists
 * `{ endpoint, file_name, updated_at }`; `GET /v4/dumps/{endpoint}` returns a
 * presigned S3 URL valid for five minutes plus `size_bytes`, `updated_at`,
 * `schema_version` and a `schema` map of column → type (`LONG`, `STRING`,
 * `LONG[]`, `DOUBLE`, `TIMESTAMP`, `UUID`, …). The schema version changes when
 * the schema changes.
 *
 * What the docs do NOT state is the CSV encoding of array and timestamp
 * columns. This adapter therefore parses each cell BY THE SCHEMA TYPE the
 * dump descriptor declares, accepts the two array encodings a Postgres-derived
 * CSV can plausibly use (`{1,2,3}` and JSON `[1,2,3]`), and refuses a cell it
 * cannot read rather than guessing. Confirming the real encoding against a
 * real dump is a readiness item that needs the entitlement (see the readiness
 * record); until then this adapter is proved against the documented schema
 * shape only.
 *
 * Dumps are per endpoint, so a game record is ASSEMBLED here from the games
 * table plus its child tables, into the same `IgdbGameRecord` the API parser
 * produces. One downstream, two upstreams.
 */

export const dumpListingSchema = z.array(
  z.object({
    endpoint: z.string().min(1),
    file_name: z.string().min(1),
    updated_at: z.number().int().nonnegative(),
  }),
);
export type DumpListing = z.infer<typeof dumpListingSchema>;

export const dumpDescriptorSchema = z.object({
  s3_url: z.string().url(),
  endpoint: z.string().min(1),
  file_name: z.string().min(1),
  size_bytes: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
  schema_version: z.string().min(1),
  schema: z.record(z.string(), z.string()),
});
export type DumpDescriptor = z.infer<typeof dumpDescriptorSchema>;

/** The provenance string staged rows carry for a dump-sourced ingestion. */
export function dumpSourceRef(descriptor: Pick<DumpDescriptor, "file_name" | "schema_version">): string {
  return `dump:${descriptor.file_name}@${descriptor.schema_version}`;
}

export type DumpCell = string | number | boolean | null | readonly number[] | readonly string[];
export type DumpRow = Readonly<Record<string, DumpCell>>;

/** Parse one CSV cell by the dump schema's declared type. Throws on a cell it cannot read. */
export function parseDumpCell(raw: string, type: string, column: string): DumpCell {
  const value = raw.trim();
  if (value === "" || value.toUpperCase() === "NULL") return null;
  const upper = type.toUpperCase();
  if (upper.endsWith("[]")) {
    const inner = upper.slice(0, -2);
    let items: string[];
    if (value.startsWith("{") && value.endsWith("}")) items = value.slice(1, -1).split(",");
    else if (value.startsWith("[") && value.endsWith("]")) items = value.slice(1, -1).split(",");
    else throw new Error(`Column ${column}: cannot read array cell ${JSON.stringify(raw)}.`);
    const parts = items.map((item) => item.trim().replace(/^"|"$/g, "")).filter((item) => item !== "");
    if (inner === "LONG" || inner === "INTEGER" || inner === "INT") {
      return parts.map((item) => {
        const n = Number(item);
        if (!Number.isInteger(n)) throw new Error(`Column ${column}: non-integer array item ${JSON.stringify(item)}.`);
        return n;
      });
    }
    return parts;
  }
  switch (upper) {
    case "LONG":
    case "INTEGER":
    case "INT": {
      const n = Number(value);
      if (!Number.isInteger(n)) throw new Error(`Column ${column}: non-integer cell ${JSON.stringify(raw)}.`);
      return n;
    }
    case "DOUBLE":
    case "FLOAT": {
      const n = Number(value);
      if (!Number.isFinite(n)) throw new Error(`Column ${column}: non-numeric cell ${JSON.stringify(raw)}.`);
      return n;
    }
    case "BOOLEAN": {
      const lower = value.toLowerCase();
      if (lower === "true" || lower === "t" || lower === "1") return true;
      if (lower === "false" || lower === "f" || lower === "0") return false;
      throw new Error(`Column ${column}: non-boolean cell ${JSON.stringify(raw)}.`);
    }
    case "TIMESTAMP": {
      // Either unix seconds or an ISO/SQL timestamp; normalized to unix seconds.
      if (/^\d+$/.test(value)) return Number(value);
      const ms = Date.parse(value.includes("T") ? value : value.replace(" ", "T") + (/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? "" : "Z"));
      if (Number.isNaN(ms)) throw new Error(`Column ${column}: cannot read timestamp ${JSON.stringify(raw)}.`);
      return Math.floor(ms / 1000);
    }
    case "UUID":
    case "STRING":
    default:
      return value;
  }
}

/**
 * Split a CSV text into RECORDS, not physical lines.
 *
 * A real `platforms` dump proved this is not a nicety: a quoted `summary`
 * value crosses a physical newline, and a line-oriented reader tears the
 * record in half and then reports "Unterminated quoted field". A CSV record
 * ends at a newline only when that newline is OUTSIDE quotes.
 *
 * Handles the constructs real dumps use — quoted fields spanning newlines,
 * doubled quotes (`""` → `"`), embedded commas, and CRLF, LF or lone-CR
 * record separators — and stays fail-closed: a value whose quote is never
 * closed throws rather than being silently truncated. Blank lines between
 * records are skipped; a quoted empty field (`""`) is a real value and is
 * kept.
 */
export function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  // Whether anything at all belongs to the record being built. A blank line
  // contributes nothing; a quoted empty value does.
  let touched = false;

  const endRecord = () => {
    fields.push(field);
    if (touched) records.push(fields);
    fields = [];
    field = "";
    touched = false;
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else {
        // Newlines inside quotes are part of the value, not a record break.
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      touched = true;
      continue;
    }
    if (ch === ",") {
      fields.push(field);
      field = "";
      touched = true;
      continue;
    }
    if (ch === "\r") {
      if (text[i + 1] === "\n") i += 1;
      endRecord();
      continue;
    }
    if (ch === "\n") {
      endRecord();
      continue;
    }
    field += ch;
    touched = true;
  }

  if (inQuotes) {
    throw new Error("Unterminated quoted field in CSV: the file ends inside a quoted value.");
  }
  if (touched) endRecord();
  return records;
}

/**
 * Split ONE CSV record. Kept for callers that hold a single record already;
 * it shares the record-aware reader, so a value carrying a newline is an
 * error here rather than a silent truncation.
 */
export function splitCsvLine(line: string): string[] {
  const records = parseCsvRecords(line);
  if (records.length === 0) return [""];
  if (records.length > 1) throw new Error("Expected one CSV record; the text holds a record separator outside quotes.");
  return records[0]!;
}

/** Parse a whole CSV text by the dump's declared schema into typed rows. */
export function parseDumpCsv(text: string, schema: Readonly<Record<string, string>>): DumpRow[] {
  const records = parseCsvRecords(text);
  if (records.length === 0) return [];
  const header = records[0]!;
  for (const column of header) {
    if (!(column in schema)) throw new Error(`CSV column ${JSON.stringify(column)} is not in the dump schema.`);
  }
  return records.slice(1).map((cells, index) => {
    if (cells.length !== header.length) {
      throw new Error(`CSV row ${index + 1} has ${cells.length} cells; the header has ${header.length}.`);
    }
    const row: Record<string, DumpCell> = {};
    header.forEach((column, i) => {
      row[column] = parseDumpCell(cells[i]!, schema[column]!, column);
    });
    return row;
  });
}

/* ── Assembling game records from per-endpoint tables ─────────────────── */

export interface DumpTables {
  readonly games: readonly DumpRow[];
  readonly game_types?: readonly DumpRow[];
  readonly game_statuses?: readonly DumpRow[];
  readonly covers?: readonly DumpRow[];
  readonly artworks?: readonly DumpRow[];
  readonly image_types?: readonly DumpRow[];
  readonly release_dates?: readonly DumpRow[];
  readonly platforms?: readonly DumpRow[];
  readonly date_formats?: readonly DumpRow[];
  readonly release_date_regions?: readonly DumpRow[];
  readonly release_date_statuses?: readonly DumpRow[];
  readonly involved_companies?: readonly DumpRow[];
  readonly companies?: readonly DumpRow[];
  readonly alternative_names?: readonly DumpRow[];
  readonly external_games?: readonly DumpRow[];
  readonly external_game_sources?: readonly DumpRow[];
  readonly game_release_formats?: readonly DumpRow[];
}

function num(row: DumpRow, column: string): number | null {
  const value = row[column];
  return typeof value === "number" ? value : null;
}
function str(row: DumpRow, column: string): string | null {
  const value = row[column];
  return typeof value === "string" ? value : null;
}
function bool(row: DumpRow, column: string): boolean | null {
  const value = row[column];
  return typeof value === "boolean" ? value : null;
}
function ids(row: DumpRow, column: string): number[] {
  const value = row[column];
  return Array.isArray(value) ? [...(value as readonly number[])].filter((v) => typeof v === "number").sort((a, b) => a - b) : [];
}

function nameLookup(rows: readonly DumpRow[] | undefined, nameColumn: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const row of rows ?? []) {
    const id = num(row, "id");
    const name = str(row, nameColumn);
    if (id !== null && name !== null) map.set(id, name);
  }
  return map;
}

function ref(id: number | null, names: Map<number, string>): IgdbNamedRef | null {
  return id === null ? null : { id, name: names.get(id) ?? null };
}

function byGame(rows: readonly DumpRow[] | undefined): Map<number, DumpRow[]> {
  const map = new Map<number, DumpRow[]>();
  for (const row of rows ?? []) {
    const game = num(row, "game");
    if (game === null) continue;
    if (!map.has(game)) map.set(game, []);
    map.get(game)!.push(row);
  }
  for (const list of map.values()) list.sort((a, b) => (num(a, "id") ?? 0) - (num(b, "id") ?? 0));
  return map;
}

function imageOf(row: DumpRow, imageTypes: Map<number, string>): IgdbImageRecord | null {
  const id = num(row, "id");
  const imageId = str(row, "image_id");
  if (id === null || imageId === null) return null;
  return {
    id,
    image_id: imageId,
    width: num(row, "width"),
    height: num(row, "height"),
    url: str(row, "url"),
    checksum: str(row, "checksum"),
    alpha_channel: bool(row, "alpha_channel"),
    animated: bool(row, "animated"),
    image_type: ref(num(row, "image_type"), imageTypes),
    game_localization: num(row, "game_localization"),
    raw: row,
  };
}

/**
 * Build `IgdbGameRecord`s from dump tables. Only games present in `tables.games`
 * are produced; children with no parent in that set are ignored.
 */
export function assembleDumpGames(tables: DumpTables): IgdbGameRecord[] {
  const gameTypes = nameLookup(tables.game_types, "type");
  const gameStatuses = nameLookup(tables.game_statuses, "status");
  const imageTypes = nameLookup(tables.image_types, "name");
  const platforms = nameLookup(tables.platforms, "name");
  const dateFormats = nameLookup(tables.date_formats, "format");
  const regions = nameLookup(tables.release_date_regions, "region");
  const rdStatuses = nameLookup(tables.release_date_statuses, "name");
  const companies = nameLookup(tables.companies, "name");
  const sources = nameLookup(tables.external_game_sources, "name");
  const formats = nameLookup(tables.game_release_formats, "format");

  const covers = byGame(tables.covers);
  const artworks = byGame(tables.artworks);
  const releaseDates = byGame(tables.release_dates);
  const involved = byGame(tables.involved_companies);
  const altNames = byGame(tables.alternative_names);
  const externals = byGame(tables.external_games);

  const records: IgdbGameRecord[] = [];
  for (const row of tables.games) {
    const id = num(row, "id");
    const name = str(row, "name");
    if (id === null || name === null || name.length === 0) {
      throw new Error(`Dump games row without id/name: ${JSON.stringify(row)}`);
    }
    const cover = (covers.get(id) ?? []).map((c) => imageOf(c, imageTypes)).find((c) => c !== null) ?? null;
    records.push({
      id,
      checksum: str(row, "checksum"),
      updated_at: num(row, "updated_at"),
      created_at: num(row, "created_at"),
      name,
      slug: str(row, "slug"),
      url: str(row, "url"),
      summary: str(row, "summary"),
      first_release_date: num(row, "first_release_date"),
      version_title: str(row, "version_title"),
      game_type: ref(num(row, "game_type"), gameTypes),
      game_status: ref(num(row, "game_status"), gameStatuses),
      parent_game: num(row, "parent_game"),
      version_parent: num(row, "version_parent"),
      dlcs: ids(row, "dlcs"),
      expansions: ids(row, "expansions"),
      standalone_expansions: ids(row, "standalone_expansions"),
      expanded_games: ids(row, "expanded_games"),
      bundles: ids(row, "bundles"),
      ports: ids(row, "ports"),
      remakes: ids(row, "remakes"),
      remasters: ids(row, "remasters"),
      forks: ids(row, "forks"),
      platforms: ids(row, "platforms"),
      cover,
      artworks: (artworks.get(id) ?? []).map((a) => imageOf(a, imageTypes)).filter((a): a is IgdbImageRecord => a !== null),
      release_dates: (releaseDates.get(id) ?? []).flatMap((rd): IgdbReleaseDateRecord[] => {
        const rdId = num(rd, "id");
        if (rdId === null) return [];
        return [
          {
            id: rdId,
            checksum: str(rd, "checksum"),
            updated_at: num(rd, "updated_at"),
            date: num(rd, "date"),
            human: str(rd, "human"),
            platform: ref(num(rd, "platform"), platforms),
            date_format: ref(num(rd, "date_format"), dateFormats),
            release_region: ref(num(rd, "release_region"), regions),
            status: ref(num(rd, "status"), rdStatuses),
            raw: rd,
          },
        ];
      }),
      involved_companies: (involved.get(id) ?? []).flatMap((ic): IgdbInvolvedCompanyRecord[] => {
        const icId = num(ic, "id");
        if (icId === null) return [];
        return [
          {
            id: icId,
            checksum: str(ic, "checksum"),
            updated_at: num(ic, "updated_at"),
            company: ref(num(ic, "company"), companies),
            developer: bool(ic, "developer") ?? false,
            publisher: bool(ic, "publisher") ?? false,
            porting: bool(ic, "porting") ?? false,
            supporting: bool(ic, "supporting") ?? false,
            raw: ic,
          },
        ];
      }),
      alternative_names: (altNames.get(id) ?? []).flatMap((an): IgdbAlternativeNameRecord[] => {
        const anId = num(an, "id");
        const anName = str(an, "name");
        if (anId === null || anName === null) return [];
        return [{ id: anId, checksum: str(an, "checksum"), name: anName, comment: str(an, "comment"), raw: an }];
      }),
      external_games: (externals.get(id) ?? []).flatMap((eg): IgdbExternalGameRecord[] => {
        const egId = num(eg, "id");
        if (egId === null) return [];
        return [
          {
            id: egId,
            checksum: str(eg, "checksum"),
            updated_at: num(eg, "updated_at"),
            uid: str(eg, "uid"),
            name: str(eg, "name"),
            url: str(eg, "url"),
            platform: num(eg, "platform"),
            external_game_source: ref(num(eg, "external_game_source"), sources),
            game_release_format: ref(num(eg, "game_release_format"), formats),
            raw: eg,
          },
        ];
      }),
      raw: row,
    });
  }
  return records.sort((a, b) => a.id - b.id);
}
