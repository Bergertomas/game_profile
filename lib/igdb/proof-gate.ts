/**
 * The Item 5 live-proof gates: what makes proof B and proof C a PASS.
 *
 * These are the acceptance conditions from the readiness record (§10) and the
 * orchestrator's round-2 audit of PR #52, expressed as pure functions so the
 * pass/fail semantics are load-bearing and testable without a credential or a
 * network call. `scripts/igdb/probe.ts` prints a report and then asks these
 * functions whether the proof passed; a non-zero exit code comes from here.
 *
 * The governing rule for both gates is the same: a proof command must never
 * look green on ambiguous evidence. A partially expanded field list, or a
 * declared type whose encoding was never actually seen in the data, is a
 * FAILURE with a stated reason — not a warning printed beside a success.
 */
import type { DumpEncodingObservation } from "./dump-observation";

export interface ProofGateResult {
  readonly passed: boolean;
  /** Why the proof failed. Empty when it passed. */
  readonly reasons: readonly string[];
}

/* ── Proof B: the full field contract ─────────────────────────────────── */

export interface FieldContractGateInput {
  readonly request_ok: boolean;
  readonly records_returned: number | null;
  readonly parser_ok: boolean | null;
  readonly unexpanded_fields: readonly string[];
  readonly error: string | null;
}

/**
 * Proof B passes only when the provider accepted the exact `IGDB_GAME_FIELDS`
 * query, returned exactly the one intended record, the production parser
 * accepted it, and NO requested child came back unexpanded.
 *
 * `unexpanded_fields` is the load-bearing condition the readiness record
 * states and the first implementation did not enforce: the parser tolerates a
 * bare reference so that a rejected expander degrades to visible staging
 * rather than silence, which is right for ingestion and wrong for a proof.
 * For the Item 5 gate an unexpanded requested child means the field contract
 * is NOT proven, so the command must fail.
 */
export function evaluateFieldContractGate(report: FieldContractGateInput): ProofGateResult {
  const reasons: string[] = [];
  if (!report.request_ok) reasons.push("The provider did not accept the IGDB_GAME_FIELDS request.");
  if (report.error) reasons.push(report.error);
  if (report.parser_ok !== true) reasons.push("The production API parser did not accept the response.");
  if (report.records_returned !== 1) {
    reasons.push(`Expected exactly one record for the requested id; the provider returned ${report.records_returned ?? "none"}.`);
  }
  if (report.unexpanded_fields.length > 0) {
    reasons.push(
      `Item 5 requires unexpanded_fields to be empty; ${report.unexpanded_fields.length} requested ` +
        `child field(s) came back unexpanded: ${[...report.unexpanded_fields].sort().join(", ")}. ` +
        "The field contract is not proven while any requested expansion is unresolved.",
    );
  }
  const unique = [...new Set(reasons)];
  return { passed: unique.length === 0, reasons: unique };
}

/* ── Proof C: the real dump contract ──────────────────────────────────── */

export interface DumpProofGateInput {
  readonly endpoint: string;
  readonly describe_ok: boolean;
  readonly schema_version: string | null;
  readonly download_ok: boolean | null;
  readonly rows_parsed: number | null;
  readonly error: string | null;
  readonly observation: DumpEncodingObservation | null;
}

/**
 * Proof C passes only when the descriptor was accepted, a real schema version
 * was observed, the production CSV parser accepted the downloaded file, rows
 * were parsed, and BOTH a non-empty array encoding and a timestamp encoding
 * were actually observed in the data.
 *
 * Two failure modes are called out by name because they are the ones that can
 * masquerade as a pass:
 *
 *  - The endpoint's descriptor declares no array type (or no `TIMESTAMP`) at
 *    all, so this endpoint cannot prove that half of the contract however
 *    clean its download is. `game_types` is exactly this case: its documented
 *    fields are `checksum`, `created_at`, `type` and `updated_at`, with no
 *    array among them.
 *  - The descriptor declares the type but no non-empty value was ever seen, so
 *    the encoding is unproven. The declaration is not the evidence.
 */
export function evaluateDumpProofGate(input: DumpProofGateInput): ProofGateResult {
  const reasons: string[] = [];
  if (!input.describe_ok) reasons.push(`The dump descriptor for ${input.endpoint} was not accepted.`);
  if (input.error) reasons.push(input.error);
  if (!input.schema_version) reasons.push("The descriptor carried no schema version.");
  if (input.download_ok !== true) reasons.push("The dump file was not downloaded.");
  if (input.rows_parsed === null) reasons.push("The production CSV parser did not accept the dump file.");
  else if (input.rows_parsed === 0) reasons.push("The dump file parsed to zero rows, so no cell could be observed.");

  const observation = input.observation;
  if (!observation) {
    reasons.push("No encoding observation was made.");
    return { passed: false, reasons: [...new Set(reasons)] };
  }
  if (observation.error) reasons.push(observation.error);

  if (observation.array_columns_declared.length === 0) {
    reasons.push(
      `The ${input.endpoint} dump schema declares no array column, so this endpoint cannot prove an array ` +
        "encoding. Choose an endpoint whose descriptor declares an array type — `platforms` declares " +
        "`versions` and `websites` as arrays of ids alongside `created_at`/`updated_at` timestamps.",
    );
  } else if (observation.array_columns_in_csv.length === 0) {
    reasons.push(
      `The ${input.endpoint} dump schema declares array column(s) ` +
        `${observation.array_columns_declared.join(", ")} but the CSV header carries none of them.`,
    );
  } else if (observation.array_encoding_observed === "none") {
    reasons.push(
      `No non-empty array value was observed in ${observation.rows_scanned} row(s) of ` +
        `${observation.array_columns_in_csv.join(", ")} (${observation.array_cells_empty} empty cell(s), ` +
        `${observation.array_cells_unreadable} unreadable). The declared array type is not evidence of its ` +
        "encoding, so this proof is inconclusive rather than a pass: re-run against a dump whose data " +
        "carries a populated array column.",
    );
  }

  if (observation.timestamp_columns_declared.length === 0) {
    reasons.push(
      `The ${input.endpoint} dump schema declares no TIMESTAMP column, so this endpoint cannot prove a ` +
        "timestamp encoding.",
    );
  } else if (observation.timestamp_columns_in_csv.length === 0) {
    reasons.push(
      `The ${input.endpoint} dump schema declares TIMESTAMP column(s) ` +
        `${observation.timestamp_columns_declared.join(", ")} but the CSV header carries none of them.`,
    );
  } else if (observation.timestamp_encoding_observed === "none") {
    reasons.push(
      `No timestamp value was observed in ${observation.rows_scanned} row(s) of ` +
        `${observation.timestamp_columns_in_csv.join(", ")} (${observation.timestamp_cells_unreadable} ` +
        "unreadable). The declared TIMESTAMP type is not evidence of its encoding.",
    );
  }

  // The observation's structural error can also arrive via `input.error`; a
  // proof failure should state each distinct reason once.
  const unique = [...new Set(reasons)];
  return { passed: unique.length === 0, reasons: unique };
}
