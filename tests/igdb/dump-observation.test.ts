import { describe, expect, it } from "vitest";
import { parseDumpCsv } from "@/lib/igdb/dump";
import {
  classifyDumpSchema,
  observeDumpEncodings,
  readArrayCell,
  readTimestampCell,
} from "@/lib/igdb/dump-observation";

/**
 * The Item 5 dump proof has to OBSERVE the CSV encoding of an array and a
 * timestamp in real data (orchestrator round-2 audit of PR #52, point 3). The
 * two ways of faking that observation are reading a single row — whose array
 * cell is legitimately empty — and reading a whole line instead of the
 * declared column's cell. Both are covered here.
 */

/** The shape of the `platforms` dump schema per the Data Dumps docs. */
const PLATFORMS_SCHEMA = {
  id: "LONG",
  name: "STRING",
  slug: "STRING",
  generation: "LONG",
  versions: "LONG[]",
  websites: "LONG[]",
  created_at: "TIMESTAMP",
  updated_at: "TIMESTAMP",
  checksum: "UUID",
} as const;

const HEADER = "id,name,slug,generation,versions,websites,created_at,updated_at,checksum";

describe("classifyDumpSchema", () => {
  it("separates array columns from TIMESTAMP columns", () => {
    expect(classifyDumpSchema(PLATFORMS_SCHEMA)).toEqual({
      arrayColumns: ["versions", "websites"],
      timestampColumns: ["created_at", "updated_at"],
    });
  });

  it("reports no array column for a game_types-shaped schema", () => {
    // Read from api-docs.igdb.com on 2026-09-03: game_types carries only
    // checksum, created_at, type and updated_at. It cannot prove an array.
    const shape = classifyDumpSchema({ id: "LONG", type: "STRING", created_at: "TIMESTAMP", updated_at: "TIMESTAMP", checksum: "UUID" });
    expect(shape.arrayColumns).toEqual([]);
    expect(shape.timestampColumns).toEqual(["created_at", "updated_at"]);
  });

  it("treats any []-suffixed type as an array column", () => {
    expect(classifyDumpSchema({ a: "long[]", b: "STRING[]", c: "DOUBLE" }).arrayColumns).toEqual(["a", "b"]);
  });
});

describe("readArrayCell", () => {
  it("reads a populated array in either encoding", () => {
    expect(readArrayCell("{1,2,3}")).toEqual({ encoding: "braces", hasElement: true });
    expect(readArrayCell("[1,2,3]")).toEqual({ encoding: "brackets", hasElement: true });
  });

  it("does not treat an empty array as an observation of its encoding", () => {
    expect(readArrayCell("{}")).toEqual({ encoding: "braces", hasElement: false });
    expect(readArrayCell("[]")).toEqual({ encoding: "brackets", hasElement: false });
    expect(readArrayCell("")).toEqual({ encoding: "none", hasElement: false });
    expect(readArrayCell("NULL")).toEqual({ encoding: "none", hasElement: false });
  });

  it("reports an unreadable array cell as no encoding", () => {
    expect(readArrayCell("1;2;3")).toEqual({ encoding: "none", hasElement: false });
  });
});

describe("readTimestampCell", () => {
  it("distinguishes unix seconds from an ISO/SQL instant", () => {
    expect(readTimestampCell("1609459200")).toBe("unix");
    expect(readTimestampCell("2021-01-01T00:00:00Z")).toBe("iso");
    expect(readTimestampCell("2021-01-01 00:00:00")).toBe("iso");
    expect(readTimestampCell("2021-01-01")).toBe("iso");
  });

  it("reports blank, NULL and unreadable cells as no observation", () => {
    expect(readTimestampCell("")).toBe("none");
    expect(readTimestampCell("NULL")).toBe("none");
    expect(readTimestampCell("last tuesday")).toBe("none");
  });
});

describe("observeDumpEncodings", () => {
  it("reports both encodings from a dump whose rows exercise them", () => {
    const csv = [
      HEADER,
      '6,PC,pc,0,"{104,105}","{1,2}",1297639288,1656512653,abc',
      "48,PlayStation 4,ps4,8,{55},{3},1301939288,1656512999,def",
    ].join("\n");
    const observed = observeDumpEncodings(csv, PLATFORMS_SCHEMA);
    expect(observed.array_encoding_observed).toBe("braces");
    expect(observed.timestamp_encoding_observed).toBe("unix");
    expect(observed.array_observed_column).toBe("versions");
    expect(observed.array_observed_row).toBe(1);
    expect(observed.error).toBeNull();
  });

  it("finds the real array encoding when the FIRST row's array is empty", () => {
    // The vacuity bug: row 1 carries `{}` for both array columns, so a
    // first-row-only inspection reports "none" although the dump plainly
    // encodes arrays with braces in row 3.
    const csv = [
      HEADER,
      "1,Empty One,empty-one,0,{},{},1297639288,1656512653,a",
      "2,Empty Two,empty-two,0,{},NULL,1297639289,1656512654,b",
      '3,Has Versions,has-versions,8,"{55,56}",{7},1297639290,1656512655,c',
    ].join("\n");
    const observed = observeDumpEncodings(csv, PLATFORMS_SCHEMA);
    expect(observed.array_encoding_observed).toBe("braces");
    expect(observed.array_observed_column).toBe("versions");
    expect(observed.array_observed_row).toBe(3);
    expect(observed.rows_scanned).toBe(3);
    expect(observed.array_cells_with_element).toBeGreaterThan(0);
    expect(observed.array_cells_empty).toBeGreaterThan(0);
  });

  it("reports `none` when an array type is declared but never carries a value", () => {
    // Declaration is not evidence. Every array cell here is empty, so the
    // encoding is genuinely unobserved and must not be claimed.
    const csv = [
      HEADER,
      "1,A,a,0,{},{},1297639288,1656512653,a",
      "2,B,b,0,{},{},1297639289,1656512654,b",
    ].join("\n");
    const observed = observeDumpEncodings(csv, PLATFORMS_SCHEMA);
    expect(observed.array_columns_declared).toEqual(["versions", "websites"]);
    expect(observed.array_encoding_observed).toBe("none");
    expect(observed.array_observed_column).toBeNull();
    expect(observed.timestamp_encoding_observed).toBe("unix");
  });

  it("does not read a timestamp encoding out of a non-timestamp column", () => {
    // `name` holds an ISO-looking string and every declared TIMESTAMP cell is
    // NULL. Matching the whole line would wrongly report `iso`.
    const csv = [
      HEADER,
      '1,"2021-01-01 edition",ed,0,{9},{1},NULL,NULL,a',
    ].join("\n");
    const observed = observeDumpEncodings(csv, PLATFORMS_SCHEMA);
    expect(observed.timestamp_encoding_observed).toBe("none");
    expect(observed.array_encoding_observed).toBe("braces");
  });

  it("reads bracket arrays and ISO timestamps when that is what the data uses", () => {
    const csv = [HEADER, '1,A,a,0,"[104,105]",[],2021-01-01T00:00:00Z,2022-06-29T14:24:13Z,a'].join("\n");
    const observed = observeDumpEncodings(csv, PLATFORMS_SCHEMA);
    expect(observed.array_encoding_observed).toBe("brackets");
    expect(observed.timestamp_encoding_observed).toBe("iso");
  });

  it("ignores declared columns the CSV header does not carry", () => {
    const csv = ["id,name,created_at", "1,A,1297639288"].join("\n");
    const observed = observeDumpEncodings(csv, PLATFORMS_SCHEMA);
    expect(observed.array_columns_declared).toEqual(["versions", "websites"]);
    expect(observed.array_columns_in_csv).toEqual([]);
    expect(observed.array_encoding_observed).toBe("none");
    expect(observed.timestamp_columns_in_csv).toEqual(["created_at"]);
    expect(observed.timestamp_encoding_observed).toBe("unix");
  });

  it("honours a row budget and says the scan did not reach the end", () => {
    const rows = ["1,A,a,0,{},{},1297639288,1656512653,a", "2,B,b,0,{55},{1},1297639289,1656512654,b"];
    const observed = observeDumpEncodings([HEADER, ...rows].join("\n"), PLATFORMS_SCHEMA, { maxRows: 1 });
    expect(observed.rows_scanned).toBe(1);
    expect(observed.scan_reached_end).toBe(false);
    expect(observed.array_encoding_observed).toBe("none");
  });

  it("is deterministic and quoted-field aware", () => {
    const csv = [HEADER, '1,"Sony, Interactive",sony,0,{55},{1},1297639288,1656512653,a'].join("\n");
    const first = observeDumpEncodings(csv, PLATFORMS_SCHEMA);
    expect(observeDumpEncodings(csv, PLATFORMS_SCHEMA)).toEqual(first);
    expect(first.array_encoding_observed).toBe("braces");
    expect(first.timestamp_encoding_observed).toBe("unix");
  });

  it("reports a structural error rather than an encoding for an empty or broken file", () => {
    expect(observeDumpEncodings("", PLATFORMS_SCHEMA).error).toMatch(/no lines/i);
    const broken = observeDumpEncodings([HEADER, '1,"unterminated,a,0,{1},{1},1,1,a'].join("\n"), PLATFORMS_SCHEMA);
    expect(broken.error).toMatch(/Unreadable CSV row/);
    expect(broken.array_encoding_observed).toBe("none");
  });

  it("agrees with the production parser about what the cells mean", () => {
    // The observation characterises encodings; parseDumpCsv remains the
    // authority on acceptance. They must not disagree about the same bytes.
    const csv = [HEADER, '6,PC,pc,0,"{104,105}",{1},1297639288,2022-06-29T14:24:13Z,abc'].join("\n");
    const rows = parseDumpCsv(csv, PLATFORMS_SCHEMA);
    expect(rows[0]!.versions).toEqual([104, 105]);
    expect(rows[0]!.created_at).toBe(1297639288);
    const observed = observeDumpEncodings(csv, PLATFORMS_SCHEMA);
    expect(observed.array_encoding_observed).toBe("braces");
    expect(observed.timestamp_encoding_observed).toBe("unix");
  });

  it("leaves an unsupported array encoding fail-closed through the production parser", () => {
    const csv = [HEADER, "1,A,a,0,1;2;3,{1},1297639288,1656512653,a"].join("\n");
    expect(() => parseDumpCsv(csv, PLATFORMS_SCHEMA)).toThrow(/cannot read array cell/);
    const observed = observeDumpEncodings(csv, PLATFORMS_SCHEMA);
    expect(observed.array_cells_unreadable).toBeGreaterThan(0);
  });
});
