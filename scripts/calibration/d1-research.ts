/**
 * `npm run calib:d1-research` — the bounded D1 research collection command.
 *
 * Three modes, and only one of them can spend money:
 *
 *   (default)            dry run. Runs every gate, prints the exact plan and
 *                        digests, and makes no network call.
 *   --live               performs the single research call, freezes the corpus
 *                        and writes the run artifacts. Opt-in, refuses in CI.
 *   --freeze <capture>   re-freezes a captured research output with no network
 *                        call, which is how the freeze's determinism is checked
 *                        against a previous receipt.
 *
 * `--attempt <n>` names which attempt of this request is being recorded and
 * defaults to 1. Each attempt has its own immutable run directory, so a repeated
 * measured call cannot land on a previous attempt's artifacts.
 *
 * It never scores, never writes to a database, never accepts an IGDB identity
 * and never touches a holdout. Artifacts land in the git-ignored
 * `calibration-runs/` tree (Item 4 work order §3.8).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  D1_RESEARCH_MAX_OUTPUT_TOKENS,
  buildD1ResearchCapture,
  buildD1ResearchRequest,
  d1ResearchArtifacts,
  d1ResearchCaptureOnlyArtifacts,
  d1ResearchRunStem,
  freezeD1Research,
  runD1ResearchPass,
  type D1ResearchCapture,
  type D1ResearchRequest,
} from "@/lib/calibration/d1-research";
import {
  ArtifactImmutabilityError,
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
import { D1_RUN_INPUT, type D1MaturityRevalidation } from "@/lib/calibration/run-input";
import { PREREGISTERED_MODEL } from "@/lib/calibration/request-builder";
import { appendLedgerEntry, DEFAULT_LEDGER_DIR } from "@/lib/calibration/ledger";
import { redact, safeError } from "@/lib/calibration/redact";

const ARTIFACT_ROOT = path.join(DEFAULT_LEDGER_DIR, "d1-research");

/** "Immediately before collection" (preregistration §7), given a bound. */
const MATURITY_FRESHNESS_HOURS = 24;

interface MaturityFile extends D1MaturityRevalidation {
  readonly reviewedAt: string;
}

function isCiEnvironment(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.CI || env.GITHUB_ACTIONS || env.BUILDKITE || env.CF_PAGES);
}

function flagValue(argv: readonly string[], name: string): string | null {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

/**
 * The current-state maturity observation. A live run must supply a fresh one;
 * the dry run falls back to slice A's recorded review purely so the plan can be
 * printed, and says so.
 */
function readMaturity(file: string | null): { maturity: MaturityFile; source: string } {
  if (file === null) {
    return {
      maturity: {
        evaluationMaturity: D1_RUN_INPUT.scope.evaluation_maturity,
        profileStabilityState: D1_RUN_INPUT.scope.profile_stability_state,
        materialProfileShapingChangesInFlight:
          D1_RUN_INPUT.maturityReview.materialKnownChangesInFlight,
        reviewedAt: `${D1_RUN_INPUT.maturityReview.reviewDate}T00:00:00Z`,
      },
      source: "slice-A recorded review (dry run only)",
    };
  }
  const parsed = JSON.parse(readFileSync(file, "utf8")) as MaturityFile;
  return { maturity: parsed, source: file };
}

function assertMaturityIsFresh(maturity: MaturityFile, now: Date): void {
  const reviewed = Date.parse(maturity.reviewedAt);
  if (Number.isNaN(reviewed)) {
    throw new Error(`--maturity file has an unparseable reviewedAt: "${maturity.reviewedAt}"`);
  }
  const ageHours = (now.getTime() - reviewed) / 3_600_000;
  if (ageHours < 0) {
    throw new Error("--maturity reviewedAt is in the future; supply the actual observation time.");
  }
  if (ageHours > MATURITY_FRESHNESS_HOURS) {
    throw new Error(
      `--maturity reviewedAt is ${ageHours.toFixed(1)}h old. The preregistration requires revalidation immediately before collection; re-observe within ${MATURITY_FRESHNESS_HOURS}h.`,
    );
  }
}

function printPlan(request: D1ResearchRequest, maturitySource: string, attempt: number, runDir: string): void {
  console.log("Phase 3A D1 research collection — plan\n");
  console.log(`  run key                 ${request.runKey} (Alan Wake 2, base main campaign)`);
  console.log(`  known exclusions        ${D1_RUN_INPUT.scope.known_exclusions.join(", ")}`);
  console.log(`  maturity source         ${maturitySource}`);
  console.log(`  maturity gate           passed (${request.maturityRevalidation.evaluationMaturity} / ${request.maturityRevalidation.profileStabilityState})`);
  console.log(`  model                   ${request.configuration.model}`);
  console.log(`  reasoning.effort        ${request.configuration.reasoning_effort}`);
  console.log(`  reasoning.context       ${request.configuration.reasoning_context}`);
  console.log(`  store                   ${String(request.configuration.store)}`);
  console.log(`  tools                   ${request.configuration.tools.map((t) => t.type).join(", ")}`);
  console.log(`  max_output_tokens       ${request.configuration.max_output_tokens}`);
  console.log(`  controlled lock set     ${request.lock.lock_set_digest}`);
  for (const input of request.lock.inputs) {
    console.log(`    ${input.role.padEnd(20)} ${input.sha256}  ${input.path}`);
  }
  for (const input of request.suppliedInputs) {
    console.log(`    ${input.role.padEnd(20)} ${input.sha256}  ${input.path} (supplied, not Item 3-controlled)`);
  }
  console.log(`  transport schema        ${request.researchPassSchemaDigest}`);
  console.log(`  semantic request        ${request.digests.semantic_request_digest}`);
  console.log(`  attempt                 ${attempt}`);
  console.log(`  run directory           ${runDir}`);
  console.log(`  holdout isolation       wrapper payload clean`);
  if (request.isolation.controlled_byte_mentions.length === 0) {
    console.log("  controlled-byte scan    no holdout mention in the locked Item 3 bytes");
  } else {
    console.log("  controlled-byte scan    REPORTED (locked bytes are immutable to this slice):");
    for (const report of request.isolation.controlled_byte_mentions) {
      for (const mention of report.mentions) {
        console.log(`    ${report.path}: ${mention.runKey} "${mention.matched}"`);
      }
    }
  }
  console.log("  scoring                 none; the research pass never scores");
}

/**
 * Persist verbatim, then prove the bytes on disk.
 *
 * Nothing is redacted here. A digest commits to exact bytes, so editing an
 * artifact after its digest exists would make the receipt describe a file that
 * no longer exists; credential redaction stays on the console, error and ledger
 * surfaces, which are where a key can actually appear.
 */
function persist(dir: string, specs: readonly ArtifactSpec[]): string {
  const records = writeVerifiedArtifacts(dir, specs);
  console.log("\nPersisted artifacts — verbatim, re-verified from the bytes on disk\n");
  for (const record of records) {
    console.log(
      `  ${`${record.name}.json`.padEnd(22)} ${String(record.byte_length).padStart(9)} bytes  sha256 ${record.file_sha256}`,
    );
    if (record.verified.length > 0) {
      console.log(`  ${" ".repeat(22)} re-derived: ${record.verified.join(", ")}`);
    }
  }
  return dir;
}

function reportFreeze(dir: string, receiptDigest: string, corpusDigest: string, cutoff: string, frozenAt: string): void {
  console.log("\nDeterministic corpus freeze\n");
  console.log(`  frozen_at               ${frozenAt}`);
  console.log(`  evidence_cutoff         ${cutoff}`);
  console.log(`  normalized packet       ${corpusDigest}`);
  console.log(`  receipt digest          ${receiptDigest}`);
  console.log(`  artifacts               ${dir}`);
  console.log("\nNext: slice C (isolated primary/audit scoring transport) consumes semantic-input.json.");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const live = argv.includes("--live");
  const freezeFrom = flagValue(argv, "--freeze");
  const maturityFile = flagValue(argv, "--maturity");

  if (live && freezeFrom) {
    console.error("--live and --freeze are mutually exclusive.");
    process.exitCode = 1;
    return;
  }

  const now = new Date();
  let maturity: MaturityFile;
  let maturitySource: string;
  let attempt: number;
  try {
    attempt = parseAttempt(flagValue(argv, "--attempt"));
    const read = readMaturity(maturityFile);
    maturity = read.maturity;
    maturitySource = read.source;
    if (live) {
      if (maturityFile === null) {
        throw new Error(
          "--live requires --maturity <file.json> recording the current-state observation made immediately before collection.",
        );
      }
      assertMaturityIsFresh(maturity, now);
    }
  } catch (error) {
    console.error(redact(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
    return;
  }

  // Every gate runs before any mode branches: controlled bytes, maturity,
  // holdout isolation. A refusal here means no request exists to send.
  let request: D1ResearchRequest;
  try {
    request = buildD1ResearchRequest({
      maturity,
      reviewedAt: maturity.reviewedAt,
    });
  } catch (error) {
    console.error(`D1 research refused at a preflight gate:\n${redact(error instanceof Error ? error.message : String(error))}`);
    process.exitCode = 1;
    return;
  }

  const digest24 = request.digests.semantic_request_digest.slice(0, 24);
  const runStem = d1ResearchRunStem(request.digests.semantic_request_digest);
  const unfrozenStem = `d1-research-unfrozen-${digest24}`;
  const runDir = attemptRunDir(ARTIFACT_ROOT, runStem, attempt);
  const unfrozenDir = attemptRunDir(ARTIFACT_ROOT, unfrozenStem, attempt);

  printPlan(request, maturitySource, attempt, runDir);

  if (freezeFrom) {
    let capture: D1ResearchCapture;
    try {
      // Read-back verification, not a bare parse: a capture whose recorded
      // `output_digest` no longer describes its own bytes is refused here rather
      // than being frozen into a corpus that would then commit to the damage.
      capture = readVerifiedArtifact<D1ResearchCapture>(freezeFrom);
      if (typeof capture.output_digest !== "string") {
        throw new ArtifactIntegrityError(
          `${freezeFrom}: the capture records no output_digest, so its persisted model output cannot be verified. Re-produce it with this command rather than hand-assembling one.`,
        );
      }
    } catch (error) {
      console.error(
        `\nRefusing to freeze: ${redact(error instanceof Error ? error.message : String(error))}`,
      );
      process.exitCode = 1;
      return;
    }

    if (capture.request_semantic_digest !== request.digests.semantic_request_digest) {
      console.error(
        "\nRefusing to freeze: the capture was produced from a different semantic request.\n" +
          `  capture  ${capture.request_semantic_digest}\n` +
          `  current  ${request.digests.semantic_request_digest}\n` +
          "Pass the same --maturity observation the capture was produced from. If that is\n" +
          "already the case, the controlled bytes, the supplied SOP or the run input have\n" +
          "drifted since the capture, and the corpus may not be frozen against them.",
      );
      process.exitCode = 1;
      return;
    }
    if (capture.facts.attempt !== attempt) {
      console.error(
        `\nRefusing to freeze: the capture records attempt ${capture.facts.attempt} but --attempt is ${attempt}.\n` +
          "An attempt's artifacts belong to that attempt's run directory; re-run with\n" +
          `  --attempt ${capture.facts.attempt}`,
      );
      process.exitCode = 1;
      return;
    }

    const frozen = freezeD1Research({
      request,
      output: capture.output,
      facts: capture.facts,
      frozenAt: capture.frozen_at,
    });
    const priorReceipt = path.join(runDir, "receipt.json");
    let identical = true;
    try {
      const prior = readVerifiedArtifact<{ receipt_digest: string }>(priorReceipt);
      identical = prior.receipt_digest === frozen.receipt.receipt_digest;
      console.log(`\n  replay vs prior receipt ${identical ? "IDENTICAL" : "DIFFERS"}`);
      if (!identical) process.exitCode = 1;
    } catch (error) {
      if (error instanceof ArtifactIntegrityError && !error.message.includes("no such artifact")) {
        console.error(`\nThe prior receipt failed read-back verification:\n${redact(error.message)}`);
        process.exitCode = 1;
        return;
      }
    }

    try {
      persist(runDir, d1ResearchArtifacts({ frozen, capture }));
    } catch (error) {
      console.error(
        `\nThe re-freeze was not persisted:\n${redact(error instanceof Error ? error.message : String(error))}`,
      );
      process.exitCode = 1;
      return;
    }
    reportFreeze(
      runDir,
      frozen.receipt.receipt_digest,
      frozen.corpus.normalized_packet_digest,
      frozen.evaluationScope.evidence_cutoff,
      frozen.corpus.frozen_at,
    );
    return;
  }

  if (!live) {
    console.log(
      "\nDRY RUN — no request was sent. This command makes a billable OpenAI call with\n" +
        "web search enabled and is opt-in. Re-run with:\n\n" +
        "  npm run calib:d1-research -- --live --maturity <observation.json>\n\n" +
        `once OPENAI_API_KEY is set and the current-state observation is fresh (<${MATURITY_FRESHNESS_HOURS}h).\n` +
        `Output is bounded at ${D1_RESEARCH_MAX_OUTPUT_TOKENS} tokens.`,
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

  // Preregistration §9.3 preserves old runs. This refusal is a preflight rather
  // than only a write-time check: refusing after the call would keep the prior
  // artifacts but throw away the evidence just paid for.
  try {
    const next = Math.max(
      firstFreeAttempt(ARTIFACT_ROOT, runStem),
      firstFreeAttempt(ARTIFACT_ROOT, unfrozenStem),
    );
    const remedy = `Record this call as a new attempt: re-run with --attempt ${next}.`;
    assertRunDirectoryUnwritten(runDir, { what: `Attempt ${attempt} of this D1 research request`, remedy });
    assertRunDirectoryUnwritten(unfrozenDir, {
      what: `Attempt ${attempt} of this D1 research request (refused at the freeze)`,
      remedy,
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

  console.log("\nSending the research request…");
  const result = await runD1ResearchPass({ request, apiKey, attempt });

  const ledgerBase = {
    entry_version: "1.0" as const,
    role: "research" as const,
    attempt: result.facts.attempt,
    started_at: result.facts.started_at,
    ended_at: result.facts.ended_at,
    api_elapsed_ms: result.facts.api_elapsed_ms,
    qa_minutes: null,
    provider: "openai",
    requested_model: PREREGISTERED_MODEL,
    returned_model: result.facts.returned_model,
    response_id: result.facts.response_id,
    controlled_input_digests: Object.fromEntries(
      request.lock.inputs.map((input) => [input.role, input.sha256]),
    ),
    controlled_lock_set_digest: request.lock.lock_set_digest,
    semantic_request_digest: request.digests.semantic_request_digest,
    decoding_parameters: [
      { name: "reasoning_effort", value: request.configuration.reasoning_effort },
      { name: "reasoning_context", value: request.configuration.reasoning_context },
      { name: "store", value: request.configuration.store },
      { name: "max_output_tokens", value: request.configuration.max_output_tokens },
      { name: "tools", value: request.configuration.tools.map((t) => t.type).join(",") },
    ],
    seed: "parameter_unavailable" as const,
    retry_count: Math.max(0, result.facts.attempt - 1),
    human_corrections: [] as readonly string[],
    token_usage: result.facts.token_usage,
  };

  if (!result.ok || result.output === null) {
    console.error(`\nResearch call failed: ${redact(result.error_message ?? "unknown error")}`);
    appendLedgerEntry({
      ...ledgerBase,
      run_id: `d1-research-failed-${digest24}-a${result.facts.attempt}`,
      normalized_packet_digest: null,
      structured_output_digest: null,
      validation_failures: [],
      outcome: "failed_api",
      error_class: result.error_class,
      error_message: result.error_message,
    });
    process.exitCode = 1;
    return;
  }

  const frozenAt = new Date().toISOString();
  const capture = buildD1ResearchCapture({
    request,
    output: result.output,
    facts: result.facts,
    frozenAt,
  });

  try {
    const frozen = freezeD1Research({
      request,
      output: result.output,
      facts: result.facts,
      frozenAt,
    });
    const dir = persist(runDir, d1ResearchArtifacts({ frozen, capture }));
    appendLedgerEntry({
      ...ledgerBase,
      run_id: frozen.runId,
      normalized_packet_digest: frozen.corpus.normalized_packet_digest,
      structured_output_digest: frozen.corpus.raw_packet_digest,
      validation_failures: [],
      outcome: "succeeded",
      error_class: null,
      error_message: null,
    });
    reportFreeze(
      dir,
      frozen.receipt.receipt_digest,
      frozen.corpus.normalized_packet_digest,
      frozen.evaluationScope.evidence_cutoff,
      frozenAt,
    );
  } catch (error) {
    if (error instanceof ArtifactImmutabilityError || error instanceof ArtifactIntegrityError) {
      // The freeze itself succeeded; persistence refused. Do not fall through to
      // the unfrozen path, which would record a validation failure that did not
      // happen.
      console.error(`\nThe frozen research run was not persisted:\n${redact(error.message)}`);
      process.exitCode = 1;
      return;
    }
    const safe = safeError(error);
    console.error(`\nThe research output was refused at the freeze:\n${safe.message}`);
    // The raw capture is still written: a refused attempt is evidence, and a
    // second live call to recover it would be spend the protocol does not need.
    try {
      const dir = persist(unfrozenDir, d1ResearchCaptureOnlyArtifacts(capture));
      console.error(`  capture retained in    ${dir}`);
    } catch (writeError) {
      console.error(
        `  the capture could not be retained: ${redact(writeError instanceof Error ? writeError.message : String(writeError))}`,
      );
    }
    appendLedgerEntry({
      ...ledgerBase,
      run_id: `${unfrozenStem}-a${result.facts.attempt}`,
      normalized_packet_digest: null,
      structured_output_digest: null,
      validation_failures: [safe.message],
      outcome: "failed_validation",
      error_class: safe.error_class,
      error_message: safe.message,
    });
    process.exitCode = 1;
  }
}

void main();
