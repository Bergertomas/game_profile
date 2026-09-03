import { describe, expect, it } from "vitest";
import { IGDB_DUMP_PROOF_ENDPOINT } from "@/lib/igdb/contract";
import { observeDumpEncodings, type DumpEncodingObservation } from "@/lib/igdb/dump-observation";
import { evaluateDumpProofGate, evaluateFieldContractGate } from "@/lib/igdb/proof-gate";

/**
 * The Item 5 live proofs must fail closed (orchestrator round-2 audit of
 * PR #52, points 1–3). These tests are the ones that would go green again if
 * the new checks were removed, so they are what makes the checks load-bearing.
 */

const CLEAN_FIELD_CONTRACT = {
  request_ok: true,
  records_returned: 1,
  parser_ok: true,
  unexpanded_fields: [] as readonly string[],
  error: null,
};

describe("evaluateFieldContractGate", () => {
  it("passes only when the request, the parser and the expansion are all clean", () => {
    expect(evaluateFieldContractGate(CLEAN_FIELD_CONTRACT)).toEqual({ passed: true, reasons: [] });
  });

  it("FAILS when any requested child came back unexpanded", () => {
    // The defect this gate exists for: the old command reported the list and
    // exited 0. Item 5 requires unexpanded_fields to be EMPTY.
    const gate = evaluateFieldContractGate({
      ...CLEAN_FIELD_CONTRACT,
      unexpanded_fields: ["release_dates.platform.name", "involved_companies.company.name"],
    });
    expect(gate.passed).toBe(false);
    expect(gate.reasons.join(" ")).toContain("unexpanded_fields to be empty");
    expect(gate.reasons.join(" ")).toContain("release_dates.platform.name");
  });

  it("fails on a single unexpanded child, not just on many", () => {
    expect(evaluateFieldContractGate({ ...CLEAN_FIELD_CONTRACT, unexpanded_fields: ["cover.image_id"] }).passed).toBe(false);
  });

  it("fails when the provider did not accept the query", () => {
    const gate = evaluateFieldContractGate({ ...CLEAN_FIELD_CONTRACT, request_ok: false, records_returned: null, parser_ok: null });
    expect(gate.passed).toBe(false);
    expect(gate.reasons.join(" ")).toContain("did not accept");
  });

  it("fails when the production parser refused the response", () => {
    expect(evaluateFieldContractGate({ ...CLEAN_FIELD_CONTRACT, parser_ok: false }).passed).toBe(false);
  });

  it("fails unless exactly the one intended record came back", () => {
    expect(evaluateFieldContractGate({ ...CLEAN_FIELD_CONTRACT, records_returned: 0 }).passed).toBe(false);
    expect(evaluateFieldContractGate({ ...CLEAN_FIELD_CONTRACT, records_returned: 2 }).passed).toBe(false);
  });

  it("propagates the cohort-guard refusal as a failure", () => {
    // The guard returns its refusal in `error`; the gate must not pass it.
    const gate = evaluateFieldContractGate({
      request_ok: true,
      records_returned: 1,
      parser_ok: null,
      unexpanded_fields: [],
      error: "Refusing: the record matches a calibration or holdout title. Use a non-cohort id (issue #48 §6).",
    });
    expect(gate.passed).toBe(false);
    expect(gate.reasons.join(" ")).toContain("Refusing");
  });
});

const PLATFORMS_SCHEMA = {
  id: "LONG",
  versions: "LONG[]",
  created_at: "TIMESTAMP",
  updated_at: "TIMESTAMP",
} as const;
const GAME_TYPES_SCHEMA = { id: "LONG", type: "STRING", created_at: "TIMESTAMP", updated_at: "TIMESTAMP" } as const;

function dumpInput(overrides: Partial<Parameters<typeof evaluateDumpProofGate>[0]> = {}) {
  const csv = ["id,versions,created_at,updated_at", '6,"{104,105}",1297639288,1656512653'].join("\n");
  return {
    endpoint: IGDB_DUMP_PROOF_ENDPOINT,
    describe_ok: true,
    schema_version: "1756900000",
    download_ok: true,
    rows_parsed: 2,
    error: null,
    observation: observeDumpEncodings(csv, PLATFORMS_SCHEMA) as DumpEncodingObservation | null,
    ...overrides,
  };
}

describe("evaluateDumpProofGate", () => {
  it("passes when a real non-empty array and a real timestamp were both observed", () => {
    expect(evaluateDumpProofGate(dumpInput())).toEqual({ passed: true, reasons: [] });
  });

  it("FAILS for an endpoint whose schema declares no array column", () => {
    // game_types has timestamps but no array field, so it cannot prove proof C
    // however clean the download is. This is the readiness-record correction.
    const csv = ["id,type,created_at,updated_at", "0,Main Game,1297639288,1656512653"].join("\n");
    const gate = evaluateDumpProofGate(
      dumpInput({ endpoint: "game_types", observation: observeDumpEncodings(csv, GAME_TYPES_SCHEMA) }),
    );
    expect(gate.passed).toBe(false);
    expect(gate.reasons.join(" ")).toContain("declares no array column");
    expect(gate.reasons.join(" ")).toContain("platforms");
  });

  it("FAILS when an array type is declared but no non-empty value was observed", () => {
    const csv = [
      "id,versions,created_at,updated_at",
      "1,{},1297639288,1656512653",
      "2,{},1297639289,1656512654",
    ].join("\n");
    const gate = evaluateDumpProofGate(dumpInput({ observation: observeDumpEncodings(csv, PLATFORMS_SCHEMA) }));
    expect(gate.passed).toBe(false);
    expect(gate.reasons.join(" ")).toContain("No non-empty array value was observed");
    expect(gate.reasons.join(" ")).toContain("inconclusive");
  });

  it("passes once a later row carries the array the first row lacked", () => {
    const csv = [
      "id,versions,created_at,updated_at",
      "1,{},1297639288,1656512653",
      '2,"{55,56}",1297639289,1656512654',
    ].join("\n");
    const gate = evaluateDumpProofGate(dumpInput({ observation: observeDumpEncodings(csv, PLATFORMS_SCHEMA) }));
    expect(gate.passed).toBe(true);
  });

  it("FAILS when a TIMESTAMP is declared but never observed", () => {
    const csv = ["id,versions,created_at,updated_at", "1,{55},NULL,NULL"].join("\n");
    const gate = evaluateDumpProofGate(dumpInput({ observation: observeDumpEncodings(csv, PLATFORMS_SCHEMA) }));
    expect(gate.passed).toBe(false);
    expect(gate.reasons.join(" ")).toContain("No timestamp value was observed");
  });

  it("fails when the production CSV parser refused the file", () => {
    const gate = evaluateDumpProofGate(dumpInput({ rows_parsed: null, error: "dump parser refused the file: Column versions: cannot read array cell \"1;2\"." }));
    expect(gate.passed).toBe(false);
    expect(gate.reasons.join(" ")).toContain("did not accept the dump file");
  });

  it("fails on a descriptor, download, schema-version or zero-row problem", () => {
    expect(evaluateDumpProofGate(dumpInput({ describe_ok: false })).passed).toBe(false);
    expect(evaluateDumpProofGate(dumpInput({ download_ok: false })).passed).toBe(false);
    expect(evaluateDumpProofGate(dumpInput({ schema_version: null })).passed).toBe(false);
    expect(evaluateDumpProofGate(dumpInput({ rows_parsed: 0 })).passed).toBe(false);
  });

  it("fails when no observation was made at all", () => {
    const gate = evaluateDumpProofGate(dumpInput({ observation: null }));
    expect(gate.passed).toBe(false);
    expect(gate.reasons.join(" ")).toContain("No encoding observation");
  });

  it("fails when the CSV header carries none of the declared array columns", () => {
    const csv = ["id,created_at", "1,1297639288"].join("\n");
    const gate = evaluateDumpProofGate(dumpInput({ observation: observeDumpEncodings(csv, PLATFORMS_SCHEMA) }));
    expect(gate.passed).toBe(false);
    expect(gate.reasons.join(" ")).toContain("CSV header carries none of them");
  });
});
