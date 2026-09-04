/**
 * `npm run calib:d1-scoring` — the bounded D1 paired scoring command.
 *
 * Three modes, and only one of them can spend money:
 *
 *   (default)          dry run. Runs every gate, proves the pair is byte-identical,
 *                      prints the exact plan and digests, and sends nothing.
 *   --live             performs the two isolated scoring calls, validates each
 *                      output and writes the run artifacts. Opt-in, refuses in CI.
 *   --replay           re-derives manifests, validation and receipts from captured
 *                      outputs with no network call, which is how the receipts'
 *                      determinism is checked against a previous run.
 *
 * `--attempt <n>` names which attempt of this pair is being recorded and defaults
 * to 1. Each attempt has its own immutable run directory, so a repeated measured
 * call cannot land on a previous attempt's artifacts.
 *
 * It never chooses a score, an anchor, a rationale or a confidence label, never
 * repairs model output, never adjudicates and never writes to a database.
 * Artifacts land in the git-ignored `calibration-runs/` tree (Item 4 work order
 * §3.8), and a failed attempt is kept there as evidence.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import {
  D1_SCORING_MAX_OUTPUT_TOKENS,
  buildD1PairReceipt,
  buildD1ScoringCapture,
  buildD1ScoringPair,
  completeD1ScoringPass,
  d1ScoringPairArtifacts,
  d1ScoringPassArtifacts,
  runD1ScoringPass,
  type D1PassResult,
  type D1ResearchHandoff,
  type D1ScoringCapture,
  type D1ScoringPair,
  type D1ScoringRunFacts,
} from "@/lib/calibration/d1-scoring";
import {
  ArtifactIntegrityError,
  assertRunDirectoryUnwritten,
  attemptRunDir,
  firstFreeAttempt,
  parseAttempt,
  readVerifiedArtifact,
  writeVerifiedArtifacts,
  type ArtifactSpec,
} from "@/lib/calibration/artifact-store";
import { readApiKey } from "@/lib/calibration/openai-client";
import { PREREGISTERED_MODEL, type RunRole } from "@/lib/calibration/request-builder";
import { appendLedgerEntry, DEFAULT_LEDGER_DIR } from "@/lib/calibration/ledger";
import { redact, safeError } from "@/lib/calibration/redact";

const ARTIFACT_ROOT = path.join(DEFAULT_LEDGER_DIR, "d1-scoring");

function isCiEnvironment(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.CI || env.GITHUB_ACTIONS || env.BUILDKITE || env.CF_PAGES);
}

function flagValue(argv: readonly string[], name: string): string | null {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

/**
 * Load the three slice-B artifacts as one handoff.
 *
 * All three are required. The semantic input alone cannot prove it is the packet
 * that was frozen — `corpus.json` holds the digest that commits to it and
 * `receipt.json` holds the controlled-input lock it was frozen under — so asking
 * for the directory rather than the file is what makes the drift gates possible.
 *
 * Each file is read through the verifying reader, so a slice-B artifact edited
 * or corrupted after it was written is refused here rather than being carried
 * into a billable scoring call.
 */
function readHandoff(dir: string): D1ResearchHandoff {
  const files = ["semantic-input.json", "corpus.json", "receipt.json"];
  for (const file of files) {
    if (!existsSync(path.join(dir, file))) {
      throw new Error(
        `${dir} is not a slice-B research run directory: ${file} is missing.\n` +
          "Pass --run <calibration-runs/d1-research/<runId>>, produced by `npm run calib:d1-research`.",
      );
    }
  }
  return {
    semanticInput: readVerifiedArtifact(path.join(dir, "semantic-input.json")),
    corpus: readVerifiedArtifact(path.join(dir, "corpus.json")),
    receipt: readVerifiedArtifact(path.join(dir, "receipt.json")),
  };
}

function printPlan(pair: D1ScoringPair, source: string, attempt: number, attemptDir: string): void {
  const request = pair.primary;
  console.log("Phase 3A D1 paired scoring — plan\n");
  console.log(`  run key                 ${pair.runKey} (Alan Wake 2, base main campaign)`);
  console.log(`  frozen corpus           ${source}`);
  console.log(`  research run            ${pair.researchRunId}`);
  console.log(`  corpus frozen_at        ${pair.frozenAt}`);
  console.log(`  evidence_cutoff         ${pair.evidenceCutoff}`);
  console.log(`  model                   ${request.configuration.model}`);
  console.log(`  reasoning.effort        ${request.configuration.reasoning_effort}`);
  console.log(`  reasoning.context       ${request.configuration.reasoning_context}`);
  console.log(`  store                   ${String(request.configuration.store)}`);
  console.log(`  tools                   (none — ADR 0036 §6)`);
  console.log(`  max_output_tokens       ${request.configuration.max_output_tokens}`);
  console.log(`  seed                    ${request.configuration.seed ?? "parameter_unavailable"}`);
  console.log(`  controlled lock set     ${pair.lock.lock_set_digest}`);
  for (const input of pair.lock.inputs) {
    console.log(`    ${input.role.padEnd(20)} ${input.sha256}  ${input.path}`);
  }
  console.log(`  transport schema        ${request.scoringPassSchemaDigest}`);
  console.log(`  normalized packet       ${request.digests.normalized_packet_digest}`);
  console.log(`  semantic request        ${pair.semanticRequestDigest}`);
  console.log(`  pair id                 ${pair.pairId}`);
  console.log(`  attempt                 ${attempt}`);
  console.log(`  run directory           ${attemptDir}`);

  console.log("\n  pair proof (ADR 0036 §5)");
  console.log(`    instructions          ${pair.primary.instructions === pair.audit.instructions ? "identical" : "DIFFER"}`);
  console.log(`    semantic input        ${pair.primary.input === pair.audit.input ? "identical" : "DIFFER"}`);
  console.log(
    `    semantic digest       ${pair.primary.digests.semantic_request_digest === pair.audit.digests.semantic_request_digest ? "identical" : "DIFFER"}`,
  );
  console.log(`    outstanding issues    ${pair.pairIssues.length}`);

  console.log("\n  isolation");
  console.log("    research context      not supplied (preregistration §3.2)");
  console.log("    conversation linkage  none (ADR 0036 §3)");
  console.log("    holdout material      none in the scoring view (§3.1)");
  if (pair.isolation.admitted_source_text_mentions.length === 0) {
    console.log("    admitted-source scan  no holdout mention in any admitted D1 capture");
  } else {
    console.log("    admitted-source scan  REPORTED (incidental mention in admitted D1 evidence):");
    for (const mention of pair.isolation.admitted_source_text_mentions) {
      console.log(`      ${mention.at}: ${mention.runKey} "${mention.matched}"`);
    }
  }
  if (pair.isolation.controlled_byte_mentions.length === 0) {
    console.log("    controlled-byte scan  no holdout mention in the locked Item 3 bytes");
  } else {
    console.log("    controlled-byte scan  REPORTED (locked bytes are immutable to this slice):");
    for (const report of pair.isolation.controlled_byte_mentions) {
      for (const mention of report.mentions) {
        console.log(`      ${report.path}: ${mention.runKey} "${mention.matched}"`);
      }
    }
  }
  console.log("    run role              assigned only after model output (§4.2)");
}

/**
 * Persist verbatim, then prove the bytes on disk.
 *
 * Nothing is redacted here. A digest commits to exact bytes, so editing a
 * measured artifact after its digest exists would make the receipt describe a
 * file that no longer exists; credential redaction stays on the console, error
 * and ledger surfaces, which are where a key can actually appear.
 */
function persist(dir: string, specs: readonly ArtifactSpec[], label: string): void {
  const records = writeVerifiedArtifacts(dir, specs);
  console.log(`\n  persisted ${label} — verbatim, re-verified from the bytes on disk`);
  for (const record of records) {
    console.log(
      `    ${`${record.name}.json`.padEnd(20)} ${String(record.byte_length).padStart(9)} bytes  sha256 ${record.file_sha256}`,
    );
    if (record.verified.length > 0) {
      console.log(`    ${" ".repeat(20)} re-derived: ${record.verified.join(", ")}`);
    }
  }
}

function ledgerBase(pair: D1ScoringPair, role: RunRole, facts: D1ScoringRunFacts) {
  const request = role === "primary" ? pair.primary : pair.audit;
  return {
    entry_version: "1.0" as const,
    role,
    attempt: facts.attempt,
    started_at: facts.started_at,
    ended_at: facts.ended_at,
    api_elapsed_ms: facts.api_elapsed_ms,
    qa_minutes: null,
    provider: "openai",
    requested_model: PREREGISTERED_MODEL,
    returned_model: facts.returned_model,
    response_id: facts.response_id,
    controlled_input_digests: Object.fromEntries(
      pair.lock.inputs.map((input) => [input.role, input.sha256]),
    ),
    controlled_lock_set_digest: pair.lock.lock_set_digest,
    semantic_request_digest: request.digests.semantic_request_digest,
    normalized_packet_digest: request.digests.normalized_packet_digest,
    decoding_parameters: [
      { name: "reasoning_effort", value: request.configuration.reasoning_effort },
      { name: "reasoning_context", value: request.configuration.reasoning_context },
      { name: "store", value: request.configuration.store },
      { name: "max_output_tokens", value: request.configuration.max_output_tokens },
      { name: "tools", value: "" },
    ],
    seed: request.configuration.seed ?? ("parameter_unavailable" as const),
    retry_count: Math.max(0, facts.attempt - 1),
    human_corrections: [] as readonly string[],
    token_usage: facts.token_usage,
  };
}

/**
 * Write one pass's artifacts. Shared by `--live` and `--replay` so a replay
 * reproduces the same files from the same capture — which is what makes the
 * receipt-digest comparison a determinism check rather than a spot check.
 *
 * A replay writes byte-identical files, which the immutable writer permits. A
 * replay that derived anything different would be refused instead of quietly
 * replacing the measured artifact it disagrees with.
 */
function writePassArtifacts(
  attemptDir: string,
  result: D1PassResult,
  capture: D1ScoringCapture,
): void {
  persist(path.join(attemptDir, result.role), d1ScoringPassArtifacts({ result, capture }), `${result.role} pass`);
}

function summarisePass(result: D1PassResult, facts: D1ScoringRunFacts): void {
  console.log(`\n  ${result.role} pass`);
  console.log(`    run id                ${result.manifest.run_id}`);
  console.log(`    returned model        ${String(facts.returned_model)}`);
  console.log(`    structured output     ${result.manifest.structured_output_digest}`);
  console.log(`    validation            ${result.validation.valid ? "clean" : `${result.validation.issues.length} issue(s)`}`);
  console.log(`    receipt digest        ${result.receipt.receipt_digest}`);
  for (const issue of result.validation.issues.slice(0, 12)) {
    console.log(`      [${issue.family}] ${issue.path}: ${issue.message}`);
  }
  if (result.validation.issues.length > 12) {
    console.log(`      … ${result.validation.issues.length - 12} more; see validation.json`);
  }
}

/** Record one completed measured pass: artifacts, ledger row and console summary. */
function recordPass(
  attemptDir: string,
  pair: D1ScoringPair,
  result: D1PassResult,
  facts: D1ScoringRunFacts,
  capture: D1ScoringCapture,
): void {
  writePassArtifacts(attemptDir, result, capture);

  appendLedgerEntry({
    ...ledgerBase(pair, result.role, facts),
    run_id: result.manifest.run_id,
    structured_output_digest: result.manifest.structured_output_digest,
    validation_failures: result.receipt.validation_failures,
    outcome: result.validation.valid ? "succeeded" : "failed_validation",
    error_class: result.validation.valid ? null : "PassValidationError",
    error_message: result.validation.valid ? null : `${result.validation.issues.length} pass-scoped issue(s)`,
  });

  summarisePass(result, facts);
}

/** Record an attempt that produced no usable output. Failed attempts are evidence. */
function recordFailure(
  attemptDir: string,
  pair: D1ScoringPair,
  role: RunRole,
  facts: D1ScoringRunFacts,
  errorClass: string | null,
  errorMessage: string | null,
): void {
  // This artifact carries a provider error string rather than model output, so
  // it is one of the credential-bearing surfaces redaction still owns. It binds
  // no digest, so redacting it invalidates nothing.
  const safeClass = errorClass === null ? null : redact(errorClass);
  const safeMessage = errorMessage === null ? null : redact(errorMessage);
  try {
    persist(
      path.join(attemptDir, role),
      [
        {
          name: "failed-attempt",
          value: {
            role,
            facts,
            error_class: safeClass,
            error_message: safeMessage,
            request_semantic_digest: pair.semanticRequestDigest,
          },
        },
      ],
      `${role} failed attempt`,
    );
  } catch (error) {
    console.error(
      `\n  the ${role} failed attempt could not be retained: ${redact(error instanceof Error ? error.message : String(error))}`,
    );
  }
  appendLedgerEntry({
    ...ledgerBase(pair, role, facts),
    run_id: `${pair.pairId}-${role}-a${facts.attempt}-failed`,
    structured_output_digest: null,
    validation_failures: [],
    outcome: "failed_api",
    error_class: safeClass,
    error_message: safeMessage,
  });
  console.error(`\n  ${role} pass failed: ${safeMessage ?? "unknown error"}`);
}

function reportPair(
  attemptDir: string,
  pair: D1ScoringPair,
  primary: D1PassResult | null,
  audit: D1PassResult | null,
  primaryFailure: string | null,
  auditFailure: string | null,
): boolean {
  const receipt = buildD1PairReceipt({ pair, primary, audit, primaryFailure, auditFailure });
  persist(attemptDir, d1ScoringPairArtifacts(receipt), "pair receipt");

  console.log("\nPair result\n");
  console.log(`  pair id                 ${receipt.pair_id}`);
  console.log(`  semantic request        ${receipt.semantic_request_digest}`);
  console.log(`  pair counts             ${receipt.pair_counts ? "yes" : "NO — blocked"}`);
  for (const reason of receipt.blocking_reasons.slice(0, 20)) {
    console.log(`    ${reason}`);
  }
  if (receipt.blocking_reasons.length > 20) {
    console.log(`    … ${receipt.blocking_reasons.length - 20} more; see pair-receipt.json`);
  }
  console.log(`  receipt digest          ${receipt.receipt_digest}`);
  console.log(`  artifacts               ${attemptDir}`);
  console.log(
    "\nEditorial scoring judgment — anchors, rationales, confidence, adjudication — belongs to\n" +
      "the GPT-5.6 Sol High orchestrator and begins from these raw outputs. This command\n" +
      "produced no score of its own and repaired nothing.",
  );
  return receipt.pair_counts;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const live = argv.includes("--live");
  const replay = argv.includes("--replay");
  const runDir = flagValue(argv, "--run");

  if (live && replay) {
    console.error("--live and --replay are mutually exclusive.");
    process.exitCode = 1;
    return;
  }
  if (runDir === null) {
    console.error(
      "--run <dir> is required: the slice-B research run directory holding\n" +
        "semantic-input.json, corpus.json and receipt.json.",
    );
    process.exitCode = 1;
    return;
  }

  let attempt: number;
  try {
    attempt = parseAttempt(flagValue(argv, "--attempt"));
  } catch (error) {
    console.error(redact(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
    return;
  }

  // Every gate runs before any mode branches: artifact read-back verification,
  // controlled bytes, research-lock continuity, handoff digest binding, scope
  // lock, scoring-view isolation, then the pair proof. A refusal here means no
  // request exists to send.
  let pair: D1ScoringPair;
  let handoff: D1ResearchHandoff;
  try {
    handoff = readHandoff(runDir);
    pair = buildD1ScoringPair({ handoff });
  } catch (error) {
    console.error(
      `D1 paired scoring refused at a preflight gate:\n${redact(error instanceof Error ? error.message : String(error))}`,
    );
    process.exitCode = 1;
    return;
  }

  const attemptDir = attemptRunDir(ARTIFACT_ROOT, pair.pairId, attempt);

  printPlan(pair, runDir, attempt, attemptDir);

  if (replay) {
    const results: Partial<Record<RunRole, D1PassResult>> = {};
    for (const role of ["primary", "audit"] as const) {
      const file = path.join(attemptDir, role, "capture.json");
      if (!existsSync(file)) {
        console.error(`\nNo capture to replay for the ${role} pass at ${file}.`);
        process.exitCode = 1;
        return;
      }
      let capture: D1ScoringCapture;
      try {
        // Read-back verification: a capture whose recorded `output_digest` no
        // longer describes its own bytes is refused rather than replayed into a
        // receipt that would then commit to the damage.
        capture = readVerifiedArtifact<D1ScoringCapture>(file);
        if (typeof capture.output_digest !== "string") {
          throw new ArtifactIntegrityError(
            `${file}: the capture records no output_digest, so its persisted model output cannot be verified.`,
          );
        }
      } catch (error) {
        console.error(
          `\nRefusing to replay the ${role} pass: ${redact(error instanceof Error ? error.message : String(error))}`,
        );
        process.exitCode = 1;
        return;
      }
      if (capture.request_semantic_digest !== pair.semanticRequestDigest) {
        console.error(
          `\nRefusing to replay the ${role} pass: the capture was produced from a different semantic request.\n` +
            `  capture  ${capture.request_semantic_digest}\n` +
            `  current  ${pair.semanticRequestDigest}\n` +
            "The controlled bytes or the frozen packet have drifted since the capture.",
        );
        process.exitCode = 1;
        return;
      }
      const result = completeD1ScoringPass({
        pair,
        handoff,
        role,
        output: capture.output,
        facts: capture.facts,
      });
      const priorReceipt = path.join(attemptDir, role, "receipt.json");
      if (existsSync(priorReceipt)) {
        try {
          const prior = readVerifiedArtifact<{ receipt_digest: string }>(priorReceipt);
          const identical = prior.receipt_digest === result.receipt.receipt_digest;
          console.log(`\n  ${role} replay vs prior receipt  ${identical ? "IDENTICAL" : "DIFFERS"}`);
          if (!identical) process.exitCode = 1;
        } catch (error) {
          console.error(
            `\nThe prior ${role} receipt failed read-back verification:\n${redact(error instanceof Error ? error.message : String(error))}`,
          );
          process.exitCode = 1;
          return;
        }
      }
      results[role] = result;
      // Artifacts are rewritten, but no ledger row is appended: a replay
      // re-derives an existing attempt and is not a new one. The writer permits
      // the byte-identical rewrite and refuses anything else.
      try {
        writePassArtifacts(attemptDir, result, capture);
      } catch (error) {
        console.error(
          `\nThe ${role} replay was not persisted:\n${redact(error instanceof Error ? error.message : String(error))}`,
        );
        process.exitCode = 1;
        return;
      }
      summarisePass(result, capture.facts);
    }
    try {
      const counted = reportPair(attemptDir, pair, results.primary ?? null, results.audit ?? null, null, null);
      if (!counted) process.exitCode = 1;
    } catch (error) {
      console.error(
        `\nThe replayed pair receipt was not persisted:\n${redact(error instanceof Error ? error.message : String(error))}`,
      );
      process.exitCode = 1;
    }
    return;
  }

  if (!live) {
    console.log(
      "\nDRY RUN — nothing was sent. This command makes two billable OpenAI calls and is\n" +
        "opt-in. Re-run with:\n\n" +
        `  npm run calib:d1-scoring -- --run ${runDir} --live\n\n` +
        "once OPENAI_API_KEY is set. Each call is bounded at " +
        `${D1_SCORING_MAX_OUTPUT_TOKENS} output tokens.`,
    );
    return;
  }

  if (isCiEnvironment(process.env)) {
    console.error(
      "\nRefusing to run: a CI environment was detected. CI must use mocks and must never\n" +
        "make a billable live OpenAI call (work order §3.6, §3.10).",
    );
    process.exitCode = 1;
    return;
  }

  // Preregistration §9.1 preserves primary and audit outputs immutably and §9.3
  // preserves old runs. This refusal is a preflight rather than only a
  // write-time check: refusing after the calls would keep the prior artifacts
  // but throw away the evidence just paid for.
  try {
    assertRunDirectoryUnwritten(attemptDir, {
      what: `Attempt ${attempt} of this D1 scoring pair`,
      remedy:
        "Record these calls as a new attempt: re-run with --attempt " +
        `${firstFreeAttempt(ARTIFACT_ROOT, pair.pairId)}.`,
    });
  } catch (error) {
    console.error(`\n${redact(error instanceof Error ? error.message : String(error))}`);
    process.exitCode = 1;
    return;
  }

  let apiKey: string;
  try {
    apiKey = readApiKey();
  } catch (error) {
    console.error(redact(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
    return;
  }

  const results: Partial<Record<RunRole, D1PassResult>> = {};
  const failures: Partial<Record<RunRole, string>> = {};

  // Two separate requests, executed one after the other. They share no client
  // state, no conversation and no output: the audit call is built from the same
  // frozen packet and never sees what primary returned (preregistration §3.2).
  for (const role of ["primary", "audit"] as const) {
    console.log(`\nSending the ${role} scoring request…`);
    const request = role === "primary" ? pair.primary : pair.audit;
    const result = await runD1ScoringPass({ request, apiKey, attempt });

    if (!result.ok || result.output === null) {
      recordFailure(attemptDir, pair, role, result.facts, result.error_class, result.error_message);
      failures[role] = result.error_message ?? result.error_class ?? "unknown error";
      continue;
    }

    const capture = buildD1ScoringCapture({ pair, role, output: result.output, facts: result.facts });

    let completed: D1PassResult;
    try {
      completed = completeD1ScoringPass({
        pair,
        handoff,
        role,
        output: result.output,
        facts: result.facts,
      });
    } catch (error) {
      // The raw capture is still written: a refused attempt is evidence, and a
      // second live call to recover it would be spend the protocol does not need.
      const safe = safeError(error);
      try {
        persist(path.join(attemptDir, role), [{ name: "capture", value: capture }], `${role} capture`);
      } catch (writeError) {
        console.error(
          `\n  the ${role} capture could not be retained: ${redact(writeError instanceof Error ? writeError.message : String(writeError))}`,
        );
      }
      appendLedgerEntry({
        ...ledgerBase(pair, role, result.facts),
        run_id: `${pair.pairId}-${role}-a${result.facts.attempt}-unassembled`,
        structured_output_digest: null,
        validation_failures: [safe.message],
        outcome: "failed_validation",
        error_class: safe.error_class,
        error_message: safe.message,
      });
      console.error(`\n  the ${role} output could not be assembled: ${safe.message}`);
      failures[role] = safe.message;
      continue;
    }

    try {
      recordPass(attemptDir, pair, completed, result.facts, capture);
      results[role] = completed;
    } catch (error) {
      // Persistence refused. The pass is not recorded as measured evidence,
      // because the harness cannot show the bytes it would be citing.
      const message = redact(error instanceof Error ? error.message : String(error));
      console.error(`\n  the ${role} pass was not persisted:\n${message}`);
      failures[role] = message;
    }
  }

  try {
    const counted = reportPair(
      attemptDir,
      pair,
      results.primary ?? null,
      results.audit ?? null,
      failures.primary ?? null,
      failures.audit ?? null,
    );
    if (!counted) process.exitCode = 1;
  } catch (error) {
    console.error(
      `\nThe pair receipt was not persisted:\n${redact(error instanceof Error ? error.message : String(error))}`,
    );
    process.exitCode = 1;
  }
}

void main();
