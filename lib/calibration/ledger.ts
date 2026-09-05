import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalDigest } from "./canonical-json";
import { redactDeep, type SafeErrorCause } from "./redact";

/**
 * The Phase 3A run ledger: local, append-only, never production.
 *
 * Item 4 gate 7 needs ledger/timing/retry/validation-failure capture to work.
 * Two properties matter more than the schema of the rows:
 *
 * 1. It is APPEND-ONLY. A measured attempt that failed is evidence, and a
 *    harness that could overwrite it could quietly turn a failed run into a
 *    clean one. Entries are written as JSON Lines; nothing rewrites a line.
 * 2. It is LOCAL. Run artifacts "must not be committed by default" (work order
 *    §3.8), so the default directory is git-ignored and only sanitized fixtures
 *    are ever checked in.
 *
 * Every string that reaches disk passes through redaction first.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Git-ignored by `.gitignore`'s `/calibration-runs/` entry. */
export const DEFAULT_LEDGER_DIR = path.join(REPO_ROOT, "calibration-runs");

export interface LedgerEntry {
  readonly entry_version: "1.0";
  readonly run_id: string;
  readonly role: "primary" | "audit" | "research" | "probe";
  /** Which attempt this is for the run; a clean retry increments it. */
  readonly attempt: number;
  readonly started_at: string;
  readonly ended_at: string;
  /** Wall-clock API time, milliseconds. */
  readonly api_elapsed_ms: number;
  /** Operator-supplied active QA/validation minutes, when measured. */
  readonly qa_minutes: number | null;
  readonly provider: string;
  /** The model asked for. */
  readonly requested_model: string;
  /** The model the API said it served. */
  readonly returned_model: string | null;
  readonly response_id: string | null;
  readonly controlled_input_digests: Readonly<Record<string, string>>;
  readonly controlled_lock_set_digest: string;
  readonly semantic_request_digest: string | null;
  readonly normalized_packet_digest: string | null;
  readonly structured_output_digest: string | null;
  readonly decoding_parameters: readonly { readonly name: string; readonly value: unknown }[];
  readonly seed: number | "parameter_unavailable";
  readonly retry_count: number;
  readonly validation_failures: readonly string[];
  /** Normally empty. Any semantic correction invalidates the measured attempt. */
  readonly human_corrections: readonly string[];
  readonly token_usage: Readonly<Record<string, number>> | null;
  readonly outcome: "succeeded" | "failed_validation" | "failed_api" | "blocked";
  readonly error_class: string | null;
  readonly error_message: string | null;
  /**
   * Nested transport diagnostics, class and code only (issue #126).
   *
   * D1 research attempt 2 recorded `failed_api / TypeError / fetch failed` and
   * nothing else, because every undici transport fault surfaces under that one
   * outer error. Without the nested code the ledger cannot say whether an
   * attempt hit a timeout, a refused connection or a reset, which is exactly the
   * question a later attempt needs answered. Never a message, URL, header, body
   * or environment value — those are the parts that could carry a secret.
   */
  readonly error_cause_chain?: readonly SafeErrorCause[];
}

export interface LedgerOptions {
  readonly dir?: string;
  /** File name within the directory. One file per Phase 3A program day is fine. */
  readonly file?: string;
}

function ledgerPath(options: LedgerOptions = {}): string {
  const dir = options.dir ?? DEFAULT_LEDGER_DIR;
  return path.join(dir, options.file ?? "phase3a-runs.jsonl");
}

/**
 * Append one entry. Redacts, then writes a single line.
 *
 * `appendFileSync` with a newline-terminated record is the whole durability
 * story on purpose: there is no update path, no rewrite path and no in-place
 * edit, so an earlier entry cannot be revised by this module at all.
 */
export function appendLedgerEntry(entry: LedgerEntry, options: LedgerOptions = {}): string {
  const file = ledgerPath(options);
  mkdirSync(path.dirname(file), { recursive: true });
  const safe = redactDeep(entry);
  appendFileSync(file, `${JSON.stringify(safe)}\n`, "utf8");
  return file;
}

/** Read the ledger back, for the proof report and for tests. */
export function readLedger(options: LedgerOptions = {}): readonly LedgerEntry[] {
  const file = ledgerPath(options);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as LedgerEntry);
}

/**
 * A deterministic run ID.
 *
 * Derived from the semantic request digest, the role and the attempt number, so
 * the same attempt of the same request always names itself the same way and two
 * different requests cannot collide. Deliberately not random: a run ID that
 * changed between a run and its report would make the ledger unciteable.
 */
export function deterministicRunId(
  semanticRequestDigest: string,
  role: LedgerEntry["role"],
  attempt: number,
): string {
  const digest = canonicalDigest({ semanticRequestDigest, role, attempt } as never);
  return `run-${role}-${digest.slice(0, 24)}`;
}

/**
 * Retry accounting. A retry after an API/structural failure is a NEW clean
 * attempt: it starts from the same request, never feeds the invalid output back
 * as context, and is recorded separately (work order §3.9).
 */
export interface RetryState {
  readonly attempts: readonly LedgerEntry[];
}

export function retryCount(entries: readonly LedgerEntry[], runSemanticDigest: string): number {
  const forRequest = entries.filter(
    (entry) => entry.semantic_request_digest === runSemanticDigest,
  );
  // The first attempt is not a retry.
  return Math.max(0, forRequest.length - 1);
}

/** A run counts only when a clean attempt succeeded and nothing was corrected. */
export function countedAttempt(
  entries: readonly LedgerEntry[],
  runSemanticDigest: string,
): LedgerEntry | null {
  return (
    entries.find(
      (entry) =>
        entry.semantic_request_digest === runSemanticDigest &&
        entry.outcome === "succeeded" &&
        entry.human_corrections.length === 0 &&
        entry.validation_failures.length === 0,
    ) ?? null
  );
}
