import { describe, expect, it } from "vitest";
import { parseCsvRecords, parseDumpCsv, splitCsvLine } from "@/lib/igdb/dump";
import { observeDumpEncodings } from "@/lib/igdb/dump-observation";

/**
 * The real `platforms` dump exposed the defect these tests lock down: a quoted
 * `summary` value crosses a physical newline, and the line-oriented reader
 * tore the record in half and then reported "Unterminated quoted field"
 * (program-owner live-proof ruling on PR #52, Proof C).
 *
 * The parser is now record-aware. It must handle the constructs real dumps
 * use — quoted multiline fields, doubled quotes, embedded commas, CRLF/LF —
 * and stay fail-closed on quoting it cannot close.
 */

const SCHEMA = {
  id: "LONG",
  name: "STRING",
  summary: "STRING",
  versions: "LONG[]",
  created_at: "TIMESTAMP",
} as const;
const HEADER = "id,name,summary,versions,created_at";

describe("parseCsvRecords", () => {
  it("keeps a quoted field that spans physical newlines in ONE record", () => {
    const csv = [HEADER, '6,PC,"A summary\nthat continues\non a third line","{104,105}",1297639288'].join("\n");
    const records = parseCsvRecords(csv);
    expect(records).toHaveLength(2);
    expect(records[1]).toEqual(["6", "PC", "A summary\nthat continues\non a third line", "{104,105}", "1297639288"]);
  });

  it("reads doubled quotes as one literal quote", () => {
    expect(splitCsvLine('1,"A ""quoted"" name",x')).toEqual(["1", 'A "quoted" name', "x"]);
    expect(parseCsvRecords('a\n"say ""hi""",b\n')[1]).toEqual(['say "hi"', "b"]);
  });

  it("keeps embedded commas inside a quoted field", () => {
    expect(splitCsvLine('1,"Sony, Interactive","{1,2,3}"')).toEqual(["1", "Sony, Interactive", "{1,2,3}"]);
  });

  it("accepts CRLF, LF and a lone CR as record separators", () => {
    const expected = [["id", "name"], ["1", "A"], ["2", "B"]];
    expect(parseCsvRecords("id,name\r\n1,A\r\n2,B\r\n")).toEqual(expected);
    expect(parseCsvRecords("id,name\n1,A\n2,B\n")).toEqual(expected);
    expect(parseCsvRecords("id,name\r1,A\r2,B")).toEqual(expected);
  });

  it("preserves a CRLF that falls inside a quoted value", () => {
    expect(parseCsvRecords('a,b\r\n1,"line one\r\nline two"\r\n')[1]).toEqual(["1", "line one\r\nline two"]);
  });

  it("skips blank lines but keeps a quoted empty field as a real value", () => {
    expect(parseCsvRecords("id,name\n\n1,A\n\n")).toEqual([["id", "name"], ["1", "A"]]);
    expect(parseCsvRecords('id,name\n1,""\n')[1]).toEqual(["1", ""]);
    expect(parseCsvRecords("id,name\n1,\n")[1]).toEqual(["1", ""]);
  });

  it("fails closed on quoting it cannot close", () => {
    expect(() => parseCsvRecords('a,b\n1,"never closed\n2,x\n')).toThrow(/Unterminated quoted field/);
    expect(() => splitCsvLine('1,"open')).toThrow(/Unterminated/);
  });

  it("refuses to pass a multi-record text off as one record", () => {
    expect(() => splitCsvLine("1,A\n2,B")).toThrow(/one CSV record/);
  });

  it("returns nothing for an empty text", () => {
    expect(parseCsvRecords("")).toEqual([]);
    expect(parseCsvRecords("\n\n")).toEqual([]);
  });
});

describe("parseDumpCsv over real-shaped dump text", () => {
  it("types a row whose summary carries newlines, quotes and commas", () => {
    const csv = [
      HEADER,
      '6,PC,"A ""personal"" computer, or PC,\nis a multi-purpose machine.","{104,105}",1297639288',
      '48,PlayStation 4,"",{55},1301939288',
    ].join("\n");
    const rows = parseDumpCsv(csv, SCHEMA);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      id: 6,
      name: "PC",
      summary: 'A "personal" computer, or PC,\nis a multi-purpose machine.',
      versions: [104, 105],
      created_at: 1297639288,
    });
    expect(rows[1]!.summary).toBeNull();
    expect(rows[1]!.versions).toEqual([55]);
  });

  it("still counts cells per RECORD, so a torn row is reported, not guessed", () => {
    expect(() => parseDumpCsv([HEADER, "1,A,B"].join("\n"), SCHEMA)).toThrow(/row 1 has 3 cells/);
  });

  it("still refuses a column the schema does not declare, and an unreadable cell", () => {
    expect(() => parseDumpCsv("id,nope\n1,x\n", SCHEMA)).toThrow(/not in the dump schema/);
    expect(() => parseDumpCsv([HEADER, "1,A,B,1;2,3"].join("\n"), SCHEMA)).toThrow(/cannot read array cell/);
  });

  it("fails closed on an unterminated quote rather than truncating the file", () => {
    expect(() => parseDumpCsv([HEADER, '1,A,"open,{1},1'].join("\n"), SCHEMA)).toThrow(/Unterminated quoted field/);
  });
});

describe("dump observation after record-aware parsing", () => {
  it("reads the declared array and timestamp cells of the right record", () => {
    // The multiline summary sits between the array and timestamp columns; a
    // line-oriented scan would misalign every cell after it.
    const csv = [
      HEADER,
      '6,PC,"multi\nline\nsummary","{104,105}",1297639288',
      '48,PlayStation 4,"another\nsummary",{},1301939288',
    ].join("\n");
    const observed = observeDumpEncodings(csv, SCHEMA);
    expect(observed.rows_scanned).toBe(1);
    expect(observed.array_encoding_observed).toBe("braces");
    expect(observed.array_observed_column).toBe("versions");
    expect(observed.timestamp_encoding_observed).toBe("unix");
    expect(observed.timestamp_observed_column).toBe("created_at");
    expect(observed.error).toBeNull();
  });

  it("does not read an encoding out of a multiline summary that looks like one", () => {
    // The summary contains both `{1,2}` and an ISO date; the declared array
    // column is empty and the declared timestamp is NULL, so neither counts.
    const csv = [HEADER, '6,PC,"see {1,2}\nand 2021-01-01",{},NULL'].join("\n");
    const observed = observeDumpEncodings(csv, SCHEMA);
    expect(observed.array_encoding_observed).toBe("none");
    expect(observed.timestamp_encoding_observed).toBe("none");
  });

  it("finds a populated array in a later record even when earlier ones are empty and multiline", () => {
    const csv = [
      HEADER,
      '1,A,"empty\none",{},1297639288',
      '2,B,"empty\ntwo",{},1297639289',
      '3,C,"has\nversions","{55,56}",1297639290',
    ].join("\n");
    const observed = observeDumpEncodings(csv, SCHEMA);
    expect(observed.array_encoding_observed).toBe("braces");
    expect(observed.array_observed_row).toBe(3);
    expect(observed.rows_scanned).toBe(3);
  });

  it("agrees with the production parser about the same bytes", () => {
    const csv = [HEADER, '6,PC,"a, b\nc","{104,105}",1297639288'].join("\n");
    expect(parseDumpCsv(csv, SCHEMA)[0]!.versions).toEqual([104, 105]);
    expect(observeDumpEncodings(csv, SCHEMA).array_encoding_observed).toBe("braces");
  });
});
