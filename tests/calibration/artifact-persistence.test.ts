import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ArtifactImmutabilityError,
  ArtifactIntegrityError,
  MAX_ATTEMPT,
  assertRunDirectoryUnwritten,
  attemptRunDir,
  firstFreeAttempt,
  parseAttempt,
  persistedArtifactNames,
  readVerifiedArtifact,
  writeVerifiedArtifacts,
} from "@/lib/calibration/artifact-store";
import { canonicalDigest } from "@/lib/calibration/canonical-json";
import {
  buildD1ResearchCapture,
  d1ResearchArtifacts,
  d1ResearchRunStem,
  freezeD1Research,
  type D1FrozenResearch,
  type D1ResearchCapture,
} from "@/lib/calibration/d1-research";
import {
  buildD1ScoringCapture,
  buildD1ScoringPair,
  completeD1ScoringPass,
  d1ScoringPassArtifacts,
  type D1PassResult,
  type D1ScoringCapture,
  type D1ScoringPair,
} from "@/lib/calibration/d1-scoring";
import { structuredOutputDigest, type ModelScoringPass } from "@/lib/calibration/scoring-pass-contract";
import { redact, redactDeep } from "@/lib/calibration/redact";
import type { ScoreDecision } from "@/lib/calibration/package-types";
import { FACTS, FROZEN_AT, buildResearchOutput, request } from "./research-fixtures";
import { FACTS as SCORING_FACTS, buildHandoff, modelOutput } from "./scoring-fixtures";

/**
 * #87A — digest-bound artifacts are persisted verbatim, verified on read-back,
 * and a repeated measured attempt cannot overwrite a previous one.
 *
 * Two defects are fenced here, and the first one is not hypothetical. The
 * credential redactor's `Bearer <token>` pattern is deliberately broad, and
 * ordinary English satisfies it: in `torch-bearer carrying`, `bearer` starts at
 * a word boundary and `carrying` is a long enough token, so the phrase used to
 * be rewritten to `torch-[redacted]` on its way to disk — after the digests
 * committing to it had already been computed. Every fixture below is synthetic
 * and nothing in this file encodes a scoring judgment.
 */

/** Ordinary prose that the credential redactor mangles. */
const TORCH = "A torch-bearer carrying a lantern crossed the bridge at dusk.";

function scratch(): string {
  return mkdtempSync(path.join(tmpdir(), "calib-artifacts-"));
}

const researchCaptureText = (index: number) =>
  `Placeholder normalized capture number ${index}. ${TORCH} It records a concrete observation with no grade, badge or ranking label.`;

/** One frozen synthetic research run plus the capture that produced it. */
function frozenResearch(
  options: { readonly captureText?: (index: number) => string; readonly facts?: typeof FACTS } = {},
): { frozen: D1FrozenResearch; capture: D1ResearchCapture } {
  const built = request();
  const output = buildResearchOutput(options.captureText ?? researchCaptureText);
  const facts = options.facts ?? FACTS;
  return {
    frozen: freezeD1Research({ request: built, output, facts, frozenAt: FROZEN_AT }),
    capture: buildD1ResearchCapture({ request: built, output, facts, frozenAt: FROZEN_AT }),
  };
}

/** The model-owned half of a scoring pass, with the awkward phrase inside it. */
function scoringOutput(role: "primary" | "audit"): ModelScoringPass {
  const output = modelOutput(role);
  const decisions: ScoreDecision[] = output.decisions.map((decision, index) =>
    index === 0 ? { ...decision, observed_pattern: `${decision.observed_pattern} ${TORCH}` } : decision,
  );
  return { claim_ledger: output.claim_ledger, decisions };
}

function completedPass(
  role: "primary" | "audit",
  facts: typeof SCORING_FACTS = SCORING_FACTS,
): { pair: D1ScoringPair; result: D1PassResult; capture: D1ScoringCapture } {
  const handoff = buildHandoff();
  const pair = buildD1ScoringPair({ handoff });
  const output = scoringOutput(role);
  return {
    pair,
    result: completeD1ScoringPass({ pair, handoff, role, output, facts }),
    capture: buildD1ScoringCapture({ pair, role, output, facts }),
  };
}

describe("the redaction that used to run between a digest and its bytes", () => {
  it("rewrites ordinary prose, which is why it may not touch a digest-bound artifact", () => {
    // Not a contrived string: `\bBearer\s+[\w.~+/-]{8,}` matches inside an
    // ordinary hyphenated compound followed by any long-enough word.
    expect(redact(TORCH)).not.toBe(TORCH);
    expect(redact(TORCH)).toContain("[redacted]");
    expect(redactDeep({ text: TORCH }).text).not.toBe(TORCH);
  });

  it("still masks a credential-shaped string, so error and ledger surfaces keep it", () => {
    expect(redact("denied for sk-abcdefghijklmnop")).toContain("[redacted]");
  });
});

describe("digest-bound research artifacts persist verbatim (#87A defect 1)", () => {
  it("round-trips the awkward phrase byte-for-byte and re-derives every digest", () => {
    const { frozen, capture } = frozenResearch();
    const dir = scratch();
    const records = writeVerifiedArtifacts(dir, d1ResearchArtifacts({ frozen, capture }));

    const raw = readFileSync(path.join(dir, "semantic-input.json"), "utf8");
    expect(raw).toContain("torch-bearer carrying");
    expect(raw).not.toContain("[redacted]");
    // The digest the corpus and the receipt commit to still describes the file.
    expect(canonicalDigest(JSON.parse(raw))).toBe(frozen.corpus.normalized_packet_digest);

    const captureRaw = readFileSync(path.join(dir, "capture.json"), "utf8");
    expect(captureRaw).toContain("torch-bearer carrying");
    expect(canonicalDigest((JSON.parse(captureRaw) as D1ResearchCapture).output as never)).toBe(
      frozen.corpus.raw_packet_digest,
    );

    const byName = new Map(records.map((record) => [record.name, record]));
    expect(byName.get("semantic-input")!.verified).toContain("corpus.normalized_packet_digest");
    expect(byName.get("capture")!.verified).toEqual(
      expect.arrayContaining(["output_digest", "corpus.raw_packet_digest"]),
    );
    expect(byName.get("receipt")!.verified).toContain("receipt_digest");
  });

  it("would have failed under the old write-time redaction", () => {
    const { frozen } = frozenResearch();
    const redacted = redactDeep(frozen.semanticInput);
    expect(redacted).not.toEqual(frozen.semanticInput);
    // This is the exact break: slice C re-hashes semantic-input.json and refuses
    // a packet whose digest does not reproduce the frozen one.
    expect(canonicalDigest(redacted as never)).not.toBe(frozen.corpus.normalized_packet_digest);
  });

  it("persists a corpus with no awkward phrase identically too", () => {
    const { frozen, capture } = frozenResearch({ captureText: (index) => `Plain capture ${index}.` });
    const dir = scratch();
    writeVerifiedArtifacts(dir, d1ResearchArtifacts({ frozen, capture }));
    expect(canonicalDigest(JSON.parse(readFileSync(path.join(dir, "semantic-input.json"), "utf8")))).toBe(
      frozen.corpus.normalized_packet_digest,
    );
  });
});

describe("digest-bound scoring artifacts persist verbatim (#87A defect 1)", () => {
  it("round-trips model output and re-derives the recorded structured-output digest", () => {
    const { result, capture } = completedPass("primary");
    const dir = scratch();
    const records = writeVerifiedArtifacts(dir, d1ScoringPassArtifacts({ result, capture }));

    for (const name of ["capture", "pass"]) {
      const raw = readFileSync(path.join(dir, `${name}.json`), "utf8");
      expect(raw, `${name}.json`).toContain("torch-bearer carrying");
      expect(raw, `${name}.json`).not.toContain("[redacted]");
    }

    const persistedPass = JSON.parse(readFileSync(path.join(dir, "pass.json"), "utf8")) as {
      claim_ledger: ModelScoringPass["claim_ledger"];
      decisions: ModelScoringPass["decisions"];
      run_manifest: unknown;
    };
    expect(
      structuredOutputDigest({
        claim_ledger: persistedPass.claim_ledger,
        decisions: persistedPass.decisions,
      }),
    ).toBe(result.manifest.structured_output_digest);
    expect(canonicalDigest(persistedPass.run_manifest as never)).toBe(
      result.receipt.digests.run_manifest_digest,
    );

    const byName = new Map(records.map((record) => [record.name, record]));
    expect(byName.get("capture")!.verified).toEqual(
      expect.arrayContaining(["output_digest", "manifest.structured_output_digest"]),
    );
    expect(byName.get("receipt")!.verified).toContain("receipt_digest");
  });
});

describe("post-write corruption is caught fail-closed", () => {
  it("refuses a receipt whose body no longer re-derives its receipt_digest", () => {
    const { frozen, capture } = frozenResearch();
    const dir = scratch();
    writeVerifiedArtifacts(dir, d1ResearchArtifacts({ frozen, capture }));

    const file = path.join(dir, "receipt.json");
    const tampered = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    tampered.evidence_cutoff = "2019-01-01";
    writeFileSync(file, `${JSON.stringify(tampered, null, 2)}\n`, "utf8");

    expect(() => readVerifiedArtifact(file)).toThrow(ArtifactIntegrityError);
    expect(() => readVerifiedArtifact(file)).toThrow(/receipt_digest does not re-derive/);
  });

  it("refuses a capture whose model output was edited after the write", () => {
    const { frozen, capture } = frozenResearch();
    const dir = scratch();
    writeVerifiedArtifacts(dir, d1ResearchArtifacts({ frozen, capture }));

    const file = path.join(dir, "capture.json");
    const tampered = JSON.parse(readFileSync(file, "utf8")) as {
      output: { collection_reason: string };
    };
    tampered.output.collection_reason = "quietly rewritten after the digest existed";
    writeFileSync(file, `${JSON.stringify(tampered, null, 2)}\n`, "utf8");

    expect(() => readVerifiedArtifact(file)).toThrow(/output_digest does not re-derive/);
  });

  it("refuses a scoring capture whose model output was edited after the write", () => {
    const { result, capture } = completedPass("audit");
    const dir = scratch();
    writeVerifiedArtifacts(dir, d1ScoringPassArtifacts({ result, capture }));

    const file = path.join(dir, "capture.json");
    const tampered = JSON.parse(readFileSync(file, "utf8")) as {
      output: { decisions: { numeric_score: number }[] };
    };
    tampered.output.decisions[0]!.numeric_score = 3;
    writeFileSync(file, `${JSON.stringify(tampered, null, 2)}\n`, "utf8");

    expect(() => readVerifiedArtifact(file)).toThrow(/output_digest does not re-derive/);
  });

  it("refuses a declared cross-artifact binding that no longer holds", () => {
    const { frozen, capture } = frozenResearch();
    const dir = scratch();
    writeVerifiedArtifacts(dir, d1ResearchArtifacts({ frozen, capture }));

    const file = path.join(dir, "semantic-input.json");
    const tampered = JSON.parse(readFileSync(file, "utf8")) as {
      normalized_corpus: { normalized: string }[];
    };
    tampered.normalized_corpus[0]!.normalized = "edited";
    writeFileSync(file, `${JSON.stringify(tampered, null, 2)}\n`, "utf8");

    expect(() =>
      readVerifiedArtifact(file, [
        {
          label: "corpus.normalized_packet_digest",
          expected: frozen.corpus.normalized_packet_digest,
          derive: (readBack) => canonicalDigest(readBack as never),
        },
      ]),
    ).toThrow(/corpus.normalized_packet_digest does not re-derive/);
  });

  it("refuses an artifact that is no longer parseable JSON", () => {
    const dir = scratch();
    writeVerifiedArtifacts(dir, [{ name: "thing", value: { a: 1 } }]);
    writeFileSync(path.join(dir, "thing.json"), "{ not json", "utf8");
    expect(() => readVerifiedArtifact(path.join(dir, "thing.json"))).toThrow(ArtifactIntegrityError);
  });

  it("refuses to persist a value that has no faithful JSON representation", () => {
    const dir = scratch();
    // `JSON.stringify` would silently drop the member; canonicalization refuses
    // it, so nothing is written that a digest could not describe.
    expect(() =>
      writeVerifiedArtifacts(dir, [{ name: "lossy", value: { kept: 1, dropped: undefined } }]),
    ).toThrow();
    expect(persistedArtifactNames(dir)).toEqual([]);
  });
});

describe("a repeated measured attempt cannot overwrite prior artifacts (#87A defect 2)", () => {
  it("refuses to replace a research run's artifacts and leaves every byte in place", () => {
    const dir = scratch();
    const first = frozenResearch();
    writeVerifiedArtifacts(dir, d1ResearchArtifacts(first));
    const before = {
      capture: readFileSync(path.join(dir, "capture.json")),
      receipt: readFileSync(path.join(dir, "receipt.json")),
    };

    // The same request run again: same attempt number, new timings and response.
    const second = frozenResearch({
      facts: { ...FACTS, started_at: "2026-09-04T07:05:00Z", response_id: "resp_second" },
    });
    expect(second.frozen.receipt.receipt_digest).not.toBe(first.frozen.receipt.receipt_digest);

    expect(() => writeVerifiedArtifacts(dir, d1ResearchArtifacts(second))).toThrow(
      ArtifactImmutabilityError,
    );
    // The whole set is checked before anything is written, so the refusal is not
    // a half-applied overwrite.
    expect(readFileSync(path.join(dir, "capture.json"))).toEqual(before.capture);
    expect(readFileSync(path.join(dir, "receipt.json"))).toEqual(before.receipt);
  });

  it("refuses to replace a scoring pass's artifacts", () => {
    const dir = scratch();
    const first = completedPass("primary");
    writeVerifiedArtifacts(dir, d1ScoringPassArtifacts(first));
    const before = readFileSync(path.join(dir, "receipt.json"));

    const second = completedPass("primary", { ...SCORING_FACTS, response_id: "resp_second" });
    expect(() => writeVerifiedArtifacts(dir, d1ScoringPassArtifacts(second))).toThrow(
      ArtifactImmutabilityError,
    );
    expect(readFileSync(path.join(dir, "receipt.json"))).toEqual(before);
  });

  it("gives each attempt its own run directory and preserves the earlier one", () => {
    const root = scratch();
    const stem = d1ResearchRunStem(request().digests.semantic_request_digest);

    expect(firstFreeAttempt(root, stem)).toBe(1);
    const first = frozenResearch();
    const firstDir = attemptRunDir(root, stem, 1);
    writeVerifiedArtifacts(firstDir, d1ResearchArtifacts(first));
    const preserved = readFileSync(path.join(firstDir, "receipt.json"));

    expect(firstFreeAttempt(root, stem)).toBe(2);
    const second = frozenResearch({ facts: { ...FACTS, attempt: 2, response_id: "resp_second" } });
    const secondDir = attemptRunDir(root, stem, 2);
    writeVerifiedArtifacts(secondDir, d1ResearchArtifacts(second));

    expect(secondDir).not.toBe(firstDir);
    expect(second.frozen.runId).not.toBe(first.frozen.runId);
    expect(second.frozen.runId.endsWith("-a2")).toBe(true);
    // Attempt 1 is exactly as it was; §9.3 preserves old runs.
    expect(readFileSync(path.join(firstDir, "receipt.json"))).toEqual(preserved);
    expect(firstFreeAttempt(root, stem)).toBe(3);
  });

  it("refuses a measured attempt into an already-populated run directory, before any call", () => {
    const dir = scratch();
    writeVerifiedArtifacts(dir, d1ResearchArtifacts(frozenResearch()));
    expect(() =>
      assertRunDirectoryUnwritten(dir, { what: "Attempt 1", remedy: "use --attempt 2" }),
    ).toThrow(ArtifactImmutabilityError);
    expect(() =>
      assertRunDirectoryUnwritten(dir, { what: "Attempt 1", remedy: "use --attempt 2" }),
    ).toThrow(/use --attempt 2/);
  });

  it("allows a measured attempt into an empty or absent run directory", () => {
    expect(() =>
      assertRunDirectoryUnwritten(scratch(), { what: "Attempt 1", remedy: "" }),
    ).not.toThrow();
    expect(() =>
      assertRunDirectoryUnwritten(path.join(scratch(), "never-created"), { what: "Attempt 1", remedy: "" }),
    ).not.toThrow();
  });

  it("finds nested artifacts, so a per-role subdirectory still counts as populated", () => {
    const root = scratch();
    const { result, capture } = completedPass("primary");
    writeVerifiedArtifacts(path.join(root, "primary"), d1ScoringPassArtifacts({ result, capture }));
    expect(persistedArtifactNames(root)).toContain("primary/receipt.json");
    expect(() => assertRunDirectoryUnwritten(root, { what: "Attempt 1", remedy: "" })).toThrow(
      ArtifactImmutabilityError,
    );
  });

  it("takes the attempt from the operator and never invents one", () => {
    expect(parseAttempt(null)).toBe(1);
    expect(parseAttempt("2")).toBe(2);
    expect(() => parseAttempt("0")).toThrow(/positive integer/);
    expect(() => parseAttempt("-1")).toThrow(/positive integer/);
    expect(() => parseAttempt("1.5")).toThrow(/positive integer/);
    expect(() => parseAttempt("two")).toThrow(/positive integer/);
    expect(() => parseAttempt(String(MAX_ATTEMPT + 1))).toThrow(/at most/);
  });
});

describe("deterministic replay and freeze remain valid", () => {
  it("permits the byte-identical rewrite a research re-freeze produces", () => {
    const dir = scratch();
    const { frozen, capture } = frozenResearch();
    writeVerifiedArtifacts(dir, d1ResearchArtifacts({ frozen, capture }));
    const before = readFileSync(path.join(dir, "receipt.json"));

    // A `--freeze` replay re-derives the same receipt from the same capture.
    const again = frozenResearch();
    expect(again.frozen.receipt.receipt_digest).toBe(frozen.receipt.receipt_digest);
    const records = writeVerifiedArtifacts(dir, d1ResearchArtifacts(again));

    expect(records.every((record) => record.already_present)).toBe(true);
    expect(readFileSync(path.join(dir, "receipt.json"))).toEqual(before);
  });

  it("permits the byte-identical rewrite a scoring replay produces", () => {
    const dir = scratch();
    const first = completedPass("audit");
    writeVerifiedArtifacts(dir, d1ScoringPassArtifacts(first));
    const before = readFileSync(path.join(dir, "pass.json"));

    const replayed = completedPass("audit");
    expect(replayed.result.receipt.receipt_digest).toBe(first.result.receipt.receipt_digest);
    const records = writeVerifiedArtifacts(dir, d1ScoringPassArtifacts(replayed));

    expect(records.every((record) => record.already_present)).toBe(true);
    expect(readFileSync(path.join(dir, "pass.json"))).toEqual(before);
  });

  it("reports the file hash and length of every persisted artifact", () => {
    const dir = scratch();
    const records = writeVerifiedArtifacts(dir, d1ResearchArtifacts(frozenResearch()));
    for (const record of records) {
      expect(record.file_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(record.byte_length).toBe(readFileSync(record.file).length);
      expect(record.canonical_digest).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

describe("redaction stays on the surfaces that can carry a credential", () => {
  const research = readFileSync("scripts/calibration/d1-research.ts", "utf8");
  const scoring = readFileSync("scripts/calibration/d1-scoring.ts", "utf8");
  const ledger = readFileSync("lib/calibration/ledger.ts", "utf8");

  it("no longer redacts artifacts on the way to disk", () => {
    for (const [name, source] of [["d1-research", research], ["d1-scoring", scoring]] as const) {
      expect(source, `${name} must not redact digest-bound artifacts`).not.toContain("redactDeep");
    }
  });

  it("still redacts error and console output in both commands", () => {
    for (const source of [research, scoring]) {
      expect(source).toContain('from "@/lib/calibration/redact"');
      expect(source).toMatch(/redact\(error instanceof Error \? error\.message : String\(error\)\)/);
    }
  });

  it("still redacts every ledger entry on the way in", () => {
    expect(ledger).toContain("redactDeep(entry)");
  });

  it("keeps the artifact store free of any redaction path", () => {
    const store = readFileSync("lib/calibration/artifact-store.ts", "utf8");
    // It may explain the hazard in prose; it may not import or call the redactor.
    expect(store).not.toMatch(/from "\.\/redact"/);
    expect(store).not.toMatch(/\bredact(Deep)?\(/);
  });
});
