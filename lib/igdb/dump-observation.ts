/**
 * Non-vacuous observation of the CSV encodings a real Data Partner dump uses.
 *
 * The dump docs (Partnership → Data Dumps, read from https://api-docs.igdb.com/
 * on 2026-09-03) publish a `schema` map of column → type whose vocabulary
 * includes `LONG`, `STRING`, `LONG[]`, `DOUBLE`, `TIMESTAMP` and `UUID`, but
 * they never state how an array or a timestamp is written into the CSV. Item 5
 * therefore has to OBSERVE the encoding in real data rather than infer it from
 * the declared type.
 *
 * Two ways of getting that wrong are what this module exists to prevent:
 *
 *  1. **Reading one row.** A declared `LONG[]` column is legitimately empty in
 *     any given row, so the first data row can yield "no array seen" while
 *     later rows exercise the encoding. Every helper here scans rows until it
 *     has a real observation or the (already size-capped) text runs out.
 *  2. **Reading the wrong cell.** Matching an array or timestamp pattern
 *     against a whole CSV line will happily report a timestamp encoding from a
 *     `created_at`-shaped substring of some unrelated `STRING` column. Every
 *     helper here reads the RAW CELL of a column the descriptor actually
 *     declares with that type.
 *
 * An empty array cell (`{}` / `[]` / blank / `NULL`) is not an observation of
 * an array encoding: it carries no element, so it cannot show how an element
 * is written. Only a cell with at least one element counts.
 *
 * These helpers are pure and take the CSV text and the declared schema, so the
 * proof semantics are testable without a network call or a credential.
 * `parseDumpCsv` remains the authority on whether the file is acceptable at
 * all; this module only characterises what the accepted bytes contain.
 */
import { parseCsvRecords } from "./dump";

/** How an array cell writes its elements. `none` means "not observed". */
export type DumpArrayEncoding = "braces" | "brackets" | "none";

/** How a timestamp cell writes its instant. `none` means "not observed". */
export type DumpTimestampEncoding = "unix" | "iso" | "none";

/** The columns a dump descriptor declares with the types Item 5 must observe. */
export interface DumpSchemaShape {
  readonly arrayColumns: readonly string[];
  readonly timestampColumns: readonly string[];
}

/**
 * Split a declared dump schema into the array and timestamp columns.
 * `LONG[]`, `STRING[]` and any other `…[]` type is an array column; only
 * `TIMESTAMP` is a timestamp column.
 */
export function classifyDumpSchema(schema: Readonly<Record<string, string>>): DumpSchemaShape {
  const arrayColumns: string[] = [];
  const timestampColumns: string[] = [];
  for (const [column, type] of Object.entries(schema)) {
    const upper = type.trim().toUpperCase();
    if (upper.endsWith("[]")) arrayColumns.push(column);
    else if (upper === "TIMESTAMP") timestampColumns.push(column);
  }
  return { arrayColumns: arrayColumns.sort(), timestampColumns: timestampColumns.sort() };
}

/** What one raw array cell shows: its encoding, and whether it carries an element. */
export interface ArrayCellReading {
  readonly encoding: DumpArrayEncoding;
  readonly hasElement: boolean;
}

/**
 * Read one raw array cell. A blank or `NULL` cell, and a cell whose delimiters
 * hold nothing, carry no element and therefore prove no encoding.
 */
export function readArrayCell(raw: string): ArrayCellReading {
  const value = raw.trim();
  if (value === "" || value.toUpperCase() === "NULL") return { encoding: "none", hasElement: false };
  let encoding: DumpArrayEncoding;
  let inner: string;
  if (value.startsWith("{") && value.endsWith("}")) {
    encoding = "braces";
    inner = value.slice(1, -1);
  } else if (value.startsWith("[") && value.endsWith("]")) {
    encoding = "brackets";
    inner = value.slice(1, -1);
  } else {
    // Not an encoding this adapter can read. `parseDumpCsv` refuses such a
    // cell; here it is only counted as unreadable.
    return { encoding: "none", hasElement: false };
  }
  const hasElement = inner
    .split(",")
    .map((item) => item.trim().replace(/^"|"$/g, ""))
    .some((item) => item !== "");
  return { encoding, hasElement };
}

/**
 * Read one raw timestamp cell: all-digits is unix seconds, a leading calendar
 * date is ISO/SQL, anything else is not an observation.
 */
export function readTimestampCell(raw: string): DumpTimestampEncoding {
  const value = raw.trim();
  if (value === "" || value.toUpperCase() === "NULL") return "none";
  if (/^\d+$/.test(value)) return "unix";
  if (/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?/.test(value)) return "iso";
  return "none";
}

/** What a scan of the downloaded dump actually saw. */
export interface DumpEncodingObservation {
  readonly array_columns_declared: readonly string[];
  readonly timestamp_columns_declared: readonly string[];
  readonly array_columns_in_csv: readonly string[];
  readonly timestamp_columns_in_csv: readonly string[];
  readonly rows_scanned: number;
  readonly scan_reached_end: boolean;
  readonly array_encoding_observed: DumpArrayEncoding;
  readonly array_observed_column: string | null;
  readonly array_observed_row: number | null;
  readonly array_cells_with_element: number;
  readonly array_cells_empty: number;
  readonly array_cells_unreadable: number;
  readonly timestamp_encoding_observed: DumpTimestampEncoding;
  readonly timestamp_observed_column: string | null;
  readonly timestamp_observed_row: number | null;
  readonly timestamp_cells_readable: number;
  readonly timestamp_cells_unreadable: number;
  readonly error: string | null;
}

export interface ObserveDumpOptions {
  /** Stop after this many data rows. Defaults to the whole (size-capped) text. */
  readonly maxRows?: number;
}

/**
 * Scan the dump CSV for a real non-empty array value and a real timestamp
 * value, reading only the raw cells of columns the descriptor declares with
 * those types.
 *
 * The scan is deterministic: it walks data rows in file order and stops as
 * soon as both encodings have been observed (or the text/row budget runs out),
 * so `rows_scanned` and the reported encodings are a function of the bytes
 * alone. `scan_reached_end` says whether the counters cover the whole file.
 */
export function observeDumpEncodings(
  text: string,
  schema: Readonly<Record<string, string>>,
  options: ObserveDumpOptions = {},
): DumpEncodingObservation {
  const { arrayColumns, timestampColumns } = classifyDumpSchema(schema);
  const empty: DumpEncodingObservation = {
    array_columns_declared: arrayColumns,
    timestamp_columns_declared: timestampColumns,
    array_columns_in_csv: [],
    timestamp_columns_in_csv: [],
    rows_scanned: 0,
    scan_reached_end: true,
    array_encoding_observed: "none",
    array_observed_column: null,
    array_observed_row: null,
    array_cells_with_element: 0,
    array_cells_empty: 0,
    array_cells_unreadable: 0,
    timestamp_encoding_observed: "none",
    timestamp_observed_column: null,
    timestamp_observed_row: null,
    timestamp_cells_readable: 0,
    timestamp_cells_unreadable: 0,
    error: null,
  };

  // Records, not physical lines: a quoted value may carry a newline, and the
  // declared cell must still be read from the right column of the right
  // record. Malformed quoting fails closed here exactly as it does in
  // `parseDumpCsv`.
  let records: string[][];
  try {
    records = parseCsvRecords(text);
  } catch (error) {
    return { ...empty, error: `Unreadable CSV: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (records.length === 0) return { ...empty, error: "The dump file carried no lines." };
  const header = records[0]!;

  // Only columns that are BOTH declared with the type and present in the file
  // can be observed. Indices are resolved once, from the header.
  const arrayIndices = arrayColumns
    .map((column) => [column, header.indexOf(column)] as const)
    .filter(([, index]) => index >= 0);
  const timestampIndices = timestampColumns
    .map((column) => [column, header.indexOf(column)] as const)
    .filter(([, index]) => index >= 0);

  const base: DumpEncodingObservation = {
    ...empty,
    array_columns_in_csv: arrayIndices.map(([column]) => column),
    timestamp_columns_in_csv: timestampIndices.map(([column]) => column),
  };

  let arrayEncoding: DumpArrayEncoding = "none";
  let arrayColumn: string | null = null;
  let arrayRow: number | null = null;
  let arrayWithElement = 0;
  let arrayEmpty = 0;
  let arrayUnreadable = 0;
  let timeEncoding: DumpTimestampEncoding = "none";
  let timeColumn: string | null = null;
  let timeRow: number | null = null;
  let timeReadable = 0;
  let timeUnreadable = 0;
  let rowsScanned = 0;

  const budget = options.maxRows ?? Number.POSITIVE_INFINITY;
  const dataRows = records.slice(1);

  for (let i = 0; i < dataRows.length; i += 1) {
    if (rowsScanned >= budget) {
      return {
        ...base,
        rows_scanned: rowsScanned,
        scan_reached_end: false,
        array_encoding_observed: arrayEncoding,
        array_observed_column: arrayColumn,
        array_observed_row: arrayRow,
        array_cells_with_element: arrayWithElement,
        array_cells_empty: arrayEmpty,
        array_cells_unreadable: arrayUnreadable,
        timestamp_encoding_observed: timeEncoding,
        timestamp_observed_column: timeColumn,
        timestamp_observed_row: timeRow,
        timestamp_cells_readable: timeReadable,
        timestamp_cells_unreadable: timeUnreadable,
      };
    }
    const cells = dataRows[i]!;
    rowsScanned += 1;

    for (const [column, index] of arrayIndices) {
      const raw = cells[index];
      if (raw === undefined) continue;
      const reading = readArrayCell(raw);
      if (reading.hasElement) {
        arrayWithElement += 1;
        if (arrayEncoding === "none") {
          arrayEncoding = reading.encoding;
          arrayColumn = column;
          arrayRow = i + 1;
        }
      } else if (reading.encoding === "none" && raw.trim() !== "" && raw.trim().toUpperCase() !== "NULL") {
        arrayUnreadable += 1;
      } else {
        arrayEmpty += 1;
      }
    }

    for (const [column, index] of timestampIndices) {
      const raw = cells[index];
      if (raw === undefined) continue;
      const reading = readTimestampCell(raw);
      if (reading === "none") {
        if (raw.trim() !== "" && raw.trim().toUpperCase() !== "NULL") timeUnreadable += 1;
        continue;
      }
      timeReadable += 1;
      if (timeEncoding === "none") {
        timeEncoding = reading;
        timeColumn = column;
        timeRow = i + 1;
      }
    }

    // Both encodings observed: nothing further can change the answer.
    const arrayDone = arrayIndices.length === 0 || arrayEncoding !== "none";
    const timeDone = timestampIndices.length === 0 || timeEncoding !== "none";
    if (arrayDone && timeDone) {
      return {
        ...base,
        rows_scanned: rowsScanned,
        scan_reached_end: i === dataRows.length - 1,
        array_encoding_observed: arrayEncoding,
        array_observed_column: arrayColumn,
        array_observed_row: arrayRow,
        array_cells_with_element: arrayWithElement,
        array_cells_empty: arrayEmpty,
        array_cells_unreadable: arrayUnreadable,
        timestamp_encoding_observed: timeEncoding,
        timestamp_observed_column: timeColumn,
        timestamp_observed_row: timeRow,
        timestamp_cells_readable: timeReadable,
        timestamp_cells_unreadable: timeUnreadable,
      };
    }
  }

  return {
    ...base,
    rows_scanned: rowsScanned,
    scan_reached_end: true,
    array_encoding_observed: arrayEncoding,
    array_observed_column: arrayColumn,
    array_observed_row: arrayRow,
    array_cells_with_element: arrayWithElement,
    array_cells_empty: arrayEmpty,
    array_cells_unreadable: arrayUnreadable,
    timestamp_encoding_observed: timeEncoding,
    timestamp_observed_column: timeColumn,
    timestamp_observed_row: timeRow,
    timestamp_cells_readable: timeReadable,
    timestamp_cells_unreadable: timeUnreadable,
  };
}
