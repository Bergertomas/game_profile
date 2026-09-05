import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import {
  MODEL_FACING_SOURCE_DEF,
  RESEARCH_TRANSPORT_VERSION,
  ResearchContentError,
  WRAPPER_ASSEMBLED_SOURCE_FIELDS,
  assembleSourceManifest,
  buildResearchPassSchema,
  type ModelResearchPass,
} from "@/lib/calibration/research-pass";
import {
  ResearchCaptureVersionError,
  assertReplayableResearchCapture,
  buildD1ResearchCapture,
  d1ResearchArtifacts,
  freezeD1Research,
} from "@/lib/calibration/d1-research";
import {
  ArtifactIntegrityError,
  readVerifiedArtifact,
  writeVerifiedArtifacts,
} from "@/lib/calibration/artifact-store";
import { ScoringHandoffError, buildD1ScoringPair } from "@/lib/calibration/d1-scoring";
import { buildScoringRequest, type SemanticInput } from "@/lib/calibration/request-builder";
import { canonicalize, sha256Hex } from "@/lib/calibration/canonical-json";
import { loadPackageSchema, validatorFor } from "@/lib/calibration/package-schema";
import { FACTS, FROZEN_AT, buildResearchOutput, request, sha256 } from "./research-fixtures";
import { buildHandoff } from "./scoring-fixtures";

/**
 * #114 — the D1 research transport is executable by the model it is sent to, and
 * the packet it freezes carries every source fact the scoring rules decide on.
 *
 * Two defects are fenced here.
 *
 * The first is that the model-facing schema used to demand
 * `normalized_content_digest` — a lowercase SHA-256 — from a pass whose only
 * tool is web search, and the freeze then compared that value to its own hash of
 * the same text. It could never have run. The old fixture hid this by computing
 * the digest with `createHash`, so the tests below state the property directly:
 * NO digest appears anywhere in a model output, and the real derived schema is
 * the thing the fixture is validated against.
 *
 * The second is that the frozen packet carried `source_id`, `record_status` and
 * the text and nothing else, while Protocol §4.4, §4.1 and §15.1(6) all decide
 * on the tier, the independence cluster and the dates. A scorer cannot satisfy a
 * rule from facts it was never shown.
 *
 * Every fixture is synthetic placeholder text. Nothing here is research about
 * any product, and no holdout source is acquired, named or described.
 */

function scratch(): string {
  return mkdtempSync(path.join(tmpdir(), "calib-transport-"));
}

function freeze(output: ModelResearchPass) {
  return freezeD1Research({ request: request(), output, facts: FACTS, frozenAt: FROZEN_AT });
}

/** Every entry of a frozen packet's scoring view, as the scorer receives it. */
function packetEntries(semanticInput: SemanticInput): Record<string, unknown>[] {
  return semanticInput.normalized_corpus as Record<string, unknown>[];
}

describe("#114 M1 — the model is never asked for a hash it cannot compute", () => {
  it("omits every wrapper-computed digest from the model-facing contract", () => {
    const schema = buildResearchPassSchema();
    const defs = schema.schema.$defs as Record<string, Record<string, unknown>>;

    // The canonical definition is a controlled input and is untouched …
    const canonicalSource = (loadPackageSchema().$defs as Record<string, Record<string, unknown>>)
      .source!;
    for (const field of WRAPPER_ASSEMBLED_SOURCE_FIELDS) {
      expect(canonicalSource.properties).toHaveProperty(field);
    }

    // … while the projection the model actually sees carries neither digest, and
    // requires neither.
    const projected = defs[MODEL_FACING_SOURCE_DEF]!;
    const properties = Object.keys(projected.properties as Record<string, unknown>);
    for (const field of WRAPPER_ASSEMBLED_SOURCE_FIELDS) {
      expect(properties).not.toContain(field);
      expect(projected.required as string[]).not.toContain(field);
    }
    // Everything else survives, so the projection is a removal and not a rewrite.
    const canonicalNames = Object.keys(canonicalSource.properties as Record<string, unknown>);
    expect(properties).toEqual(
      canonicalNames.filter((name) => !WRAPPER_ASSEMBLED_SOURCE_FIELDS.includes(name)),
    );
    expect(defs).not.toHaveProperty("source");
    expect(JSON.stringify(schema.schema)).not.toContain("sha256");
  });

  it("accepts the real transport fixture against the real derived schema, with no digest anywhere in it", () => {
    const output = buildResearchOutput();

    // The property that makes this fixture honest: it states nothing a model
    // with web search and no hashing tool could not have written.
    expect(JSON.stringify(output)).not.toMatch(/[a-f0-9]{64}/);

    const ajv = new Ajv2020({ strict: false, allErrors: true });
    const validate = ajv.compile(JSON.parse(JSON.stringify(buildResearchPassSchema().schema)));
    const valid = validate(JSON.parse(JSON.stringify(output)));
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });

  it("assembles the canonical manifest from the capture bytes and satisfies the canonical schema", () => {
    const frozen = freeze(buildResearchOutput());
    const validateSource = validatorFor("/$defs/source");

    for (const [index, source] of frozen.corpus.source_manifest.entries()) {
      expect(source.normalized_content_digest).toBe(sha256(`Placeholder normalized capture number ${index + 1}. It records a concrete observation with no grade, badge or ranking label.`));
      // No raw body was retained, so the nullable digest is null rather than a
      // fabricated value.
      expect(source.raw_content_digest).toBeNull();
      expect(validateSource(source)).toBe(true);
    }
    expect(validatorFor("/$defs/corpus")(frozen.corpus)).toBe(true);
  });

  it("hashes a raw body when one is supplied, and only then", () => {
    const output = buildResearchOutput();
    const raw = "<article>Placeholder retained body.</article>";
    const withRaw: ModelResearchPass = {
      ...output,
      source_captures: output.source_captures.map((capture, index) =>
        index === 0 ? { ...capture, raw_content: raw } : capture,
      ),
    };
    const manifest = new Map(
      freeze(withRaw).corpus.source_manifest.map((source) => [source.source_id, source]),
    );
    expect(manifest.get("src-1")!.raw_content_digest).toBe(sha256(raw));
    expect(manifest.get("src-2")!.raw_content_digest).toBeNull();
  });

  it("hashes the exact UTF-8 bytes, newlines and non-BMP characters included", () => {
    // A capture that a naive re-encoding, a trim or a newline normalisation
    // would silently change.
    const awkward = (index: number) =>
      `Line ${index}.\nSecond line with CRLF\r\nand a tab\there.\n` +
      "Non-BMP and combining marks: 𝄞 👩🏽‍🚀 é (e + U+0301) 漢字 ふりがな.\n" +
      "  Leading and trailing whitespace is part of the bytes.  \n";

    const frozen = freeze(buildResearchOutput(awkward));
    for (const [index, source] of frozen.corpus.source_manifest.entries()) {
      const text = awkward(index + 1);
      expect(source.normalized_content_digest).toBe(
        sha256Hex(Buffer.from(text, "utf8")),
      );
      // Not the UTF-16 length, not a normalised form: the byte count the digest
      // was actually taken over.
      expect(Buffer.from(text, "utf8").length).not.toBe(text.length);
    }
    // And the scorer receives those exact characters, unaltered.
    expect(packetEntries(frozen.semanticInput)[0]!.normalized).toBe(awkward(1));
  });

  it("refuses a capture whose text has no UTF-8 encoding at all", () => {
    const output = buildResearchOutput();
    const lone: ModelResearchPass = {
      ...output,
      source_captures: output.source_captures.map((capture, index) =>
        index === 0 ? { ...capture, normalized_content: `broken \uD83D pair` } : capture,
      ),
    };
    expect(() => freeze(lone)).toThrow(/unpaired surrogate/);
  });

  it("refuses missing, duplicated and unlinked captures", () => {
    const output = buildResearchOutput();

    const missing: ModelResearchPass = {
      ...output,
      source_captures: output.source_captures.slice(1),
    };
    expect(() => freeze(missing)).toThrow(/no capture accompanies this source/);

    const duplicated: ModelResearchPass = {
      ...output,
      source_captures: [...output.source_captures, output.source_captures[0]!],
    };
    expect(() => freeze(duplicated)).toThrow(/duplicate capture for source "src-1"/);

    const unknown: ModelResearchPass = {
      ...output,
      source_captures: [
        ...output.source_captures,
        { source_id: "src-not-in-manifest", normalized_content: "Placeholder.", raw_content: null },
      ],
    };
    expect(() => freeze(unknown)).toThrow(/capture for unknown source "src-not-in-manifest"/);
  });

  it("reports every linkage problem at once rather than the first one", () => {
    const output = buildResearchOutput();
    const broken = {
      ...output,
      source_captures: [
        ...output.source_captures.slice(2),
        { source_id: "src-ghost", normalized_content: "Placeholder.", raw_content: null },
      ],
    } as ModelResearchPass;
    const { problems } = assembleSourceManifest(broken);
    expect(problems).toHaveLength(3);
    expect(problems.join("\n")).toContain("src-ghost");
    expect(problems.join("\n")).toContain("src-1");
    expect(problems.join("\n")).toContain("src-2");
  });
});

describe("#114 M2 — the frozen packet carries the provenance the rules decide on", () => {
  const frozen = freeze(buildResearchOutput());

  it("shows each scorer the whole frozen source record beside its capture", () => {
    const entries = packetEntries(frozen.semanticInput);
    const manifest = new Map(
      frozen.corpus.source_manifest.map((source) => [source.source_id, source]),
    );

    expect(entries.map((entry) => entry.source_id)).toEqual(frozen.corpus.canonical_source_order);
    for (const entry of entries) {
      const { normalized, ...facts } = entry;
      // Byte-identical to the frozen manifest record — one source of truth, not
      // a second editable copy of it.
      expect(canonicalize(facts as never)).toBe(
        canonicalize(manifest.get(String(entry.source_id)) as never),
      );
      // The facts §4.4 / §4.1 / §15.1(6) need, named explicitly so a future
      // narrowing of the projection fails here.
      for (const field of [
        "source_tier",
        "independence_cluster_id",
        "publication_date",
        "accessed_at",
        "locator",
        "source_class",
        "record_status",
        "sponsorship_access_disclosure",
        "dependency_note",
        "limitations",
        "normalized_content_digest",
      ]) {
        expect(facts).toHaveProperty(field);
      }
      // The scorer can verify the text it is reading is the text that was frozen.
      expect(sha256Hex(Buffer.from(String(normalized), "utf8"))).toBe(
        facts.normalized_content_digest,
      );
    }
  });

  it("keeps the candidate log and every research commentary field out of the packet", () => {
    const serialized = canonicalize(frozen.semanticInput as never);
    for (const forbidden of [
      "candidate_source_log",
      "candidate_id",
      "query_family",
      "query_family_audit",
      "collection_standard",
      "collection_reason",
      "research_completion_report",
      "research_run_manifest",
      "raw_packet_digest",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    // The rejected candidate's reason text is in the corpus archive and not in
    // the scoring view.
    expect(serialized).not.toContain("Placeholder rejection reason");
    expect(canonicalize(frozen.corpus.candidate_source_log as never)).toContain(
      "Placeholder rejection reason",
    );
    expect(Object.keys(frozen.semanticInput).sort()).toEqual([
      "canonical_source_order",
      "coverage_frames",
      "evaluation_scope",
      "normalized_corpus",
      "packet_version",
    ]);
  });

  it("changes the scorer-visible bytes when a tier, cluster or date changes", () => {
    // Twelve sources under the open-ended band, so demoting one to Tier D or
    // superseding it stays inside the declared collection standard and the test
    // measures the packet rather than the band.
    const wide = () =>
      buildResearchOutput(undefined, {
        sourceCount: 12,
        collectionStandard: "expanded_for_complexity",
      });
    const base = freeze(wide());
    const vary = (patch: Record<string, unknown>) => {
      const output = wide();
      return freeze({
        ...output,
        source_manifest: output.source_manifest.map((source, index) =>
          index === 0 ? { ...source, ...patch } : source,
        ),
      });
    };

    // Tier D is the sharpest case: under the old packet this was invisible to
    // both scorers, yet §4.4 refuses a numeric decision that leans on it.
    for (const patch of [
      { source_tier: "D" },
      { independence_cluster_id: "cluster-shared" },
      { publication_date: "2025-11-30" },
      { accessed_at: "2026-09-01T00:00:00Z" },
      { record_status: "superseded" },
    ]) {
      const changed = vary(patch);
      expect(changed.corpus.normalized_packet_digest).not.toBe(
        base.corpus.normalized_packet_digest,
      );
      expect(canonicalize(changed.semanticInput as never)).not.toBe(
        canonicalize(base.semanticInput as never),
      );
      const scorerInput = buildScoringRequest({
        semanticInput: changed.semanticInput,
        maxOutputTokens: 64_000,
      }).input;
      expect(scorerInput).not.toBe(
        buildScoringRequest({ semanticInput: base.semanticInput, maxOutputTokens: 64_000 }).input,
      );
    }
  });

  it("gives the primary and audit calls byte-identical provenance", () => {
    const pair = buildD1ScoringPair({
      handoff: buildHandoff({
        semanticInput: frozen.semanticInput,
        digest: frozen.corpus.normalized_packet_digest,
        sourceManifest: frozen.corpus.source_manifest as unknown as Record<string, unknown>[],
      }),
    });
    expect(pair.pairIssues).toEqual([]);
    expect(pair.audit.input).toBe(pair.primary.input);
    expect(pair.audit.digests.normalized_packet_digest).toBe(
      pair.primary.digests.normalized_packet_digest,
    );
    for (const request of [pair.primary, pair.audit]) {
      expect(request.input).toContain("independence_cluster_id");
      expect(request.input).toContain("source_tier");
      expect(request.input).toContain("publication_date");
    }
  });
});

describe("#114 — transport versioning preserves recorded attempts", () => {
  it("stamps the transport version on the capture, the receipt and the packet", () => {
    const built = request();
    const output = buildResearchOutput();
    const frozen = freezeD1Research({ request: built, output, facts: FACTS, frozenAt: FROZEN_AT });
    const capture = buildD1ResearchCapture({ request: built, output, facts: FACTS, frozenAt: FROZEN_AT });

    expect(capture.transport_version).toBe(RESEARCH_TRANSPORT_VERSION);
    expect(frozen.receipt.transport_version).toBe(RESEARCH_TRANSPORT_VERSION);
    expect(frozen.semanticInput.packet_version).toBe(RESEARCH_TRANSPORT_VERSION);
    // The raw model output is preserved separately and unrepaired: the assembled
    // manifest is a wrapper derivation, and the capture still says exactly what
    // came back.
    expect(capture.output).toBe(output);
    expect(JSON.stringify(capture.output)).not.toMatch(/[a-f0-9]{64}/);
  });

  it("refuses to replay a capture from the superseded transport, and writes nothing", () => {
    const dir = scratch();
    const built = request();
    const output = buildResearchOutput();
    const legacyOutput = {
      ...output,
      source_manifest: output.source_manifest.map((source, index) => ({
        ...source,
        raw_content_digest: null,
        normalized_content_digest: sha256(`Placeholder normalized capture number ${index + 1}. It records a concrete observation with no grade, badge or ranking label.`),
      })),
      normalized_captures: output.source_captures.map(({ source_id, normalized_content }) => ({
        source_id,
        normalized_content,
      })),
      source_captures: undefined,
    };
    delete (legacyOutput as Record<string, unknown>).source_captures;

    // An attempt-1 capture exactly as the v1 harness wrote it: no
    // `transport_version`, model-stated digests, `normalized_captures`.
    const v1Capture = {
      facts: FACTS,
      output: legacyOutput,
      frozen_at: FROZEN_AT,
      request_semantic_digest: built.digests.semantic_request_digest,
      output_digest: sha256Hex(canonicalize(legacyOutput as never)),
    };
    const file = path.join(dir, "capture.json");
    writeFileSync(file, `${JSON.stringify(v1Capture, null, 2)}\n`);
    const before = readFileSync(file);

    // It still reads back as an intact artifact — its own digest is fine …
    expect(() => readVerifiedArtifact(file)).not.toThrow();
    // … and it is refused anyway, by version, with a diagnostic that says what
    // to do instead.
    try {
      assertReplayableResearchCapture(readVerifiedArtifact(file), file);
      expect.unreachable("a v1 capture must not be replayable under v2 rules");
    } catch (error) {
      expect(error).toBeInstanceOf(ResearchCaptureVersionError);
      const message = (error as Error).message;
      expect(message).toContain("records no transport_version");
      expect(message).toContain("will not reinterpret it");
      expect(message).toContain("§9.1");
    }
    // The recorded attempt is byte-for-byte as it was.
    expect(readFileSync(file).equals(before)).toBe(true);
  });

  it("refuses a capture from a transport this build does not implement", () => {
    expect(() =>
      assertReplayableResearchCapture({ transport_version: 99 }, "capture.json"),
    ).toThrow(ResearchCaptureVersionError);
    expect(() =>
      assertReplayableResearchCapture({ transport_version: 99 }, "capture.json"),
    ).toThrow(/does not implement/);
    expect(() =>
      assertReplayableResearchCapture(
        { transport_version: RESEARCH_TRANSPORT_VERSION },
        "capture.json",
      ),
    ).not.toThrow();
  });

  it("keeps an attempt the freeze already refused refused", () => {
    // A v1 attempt whose output the freeze rejected stays rejected: under v2 it
    // is refused earlier, by version, rather than being re-examined under rules
    // it was never produced against.
    const output = buildResearchOutput();
    const refusedThen = {
      facts: FACTS,
      output: { ...output, query_family_audit: output.query_family_audit.slice(0, 6) },
      frozen_at: FROZEN_AT,
      request_semantic_digest: request().digests.semantic_request_digest,
    };
    expect(() => assertReplayableResearchCapture(refusedThen, "capture.json")).toThrow(
      ResearchCaptureVersionError,
    );
    // And the same output under the current transport is still refused on its
    // merits, so the version gate has not become a way around the freeze.
    expect(() =>
      freeze({ ...output, query_family_audit: output.query_family_audit.slice(0, 6) }),
    ).toThrow(ResearchContentError);
  });

  it("refuses a pre-v2 packet at the scoring boundary instead of scoring it", () => {
    const frozen = freeze(buildResearchOutput());
    const v1Packet = {
      evaluation_scope: frozen.semanticInput.evaluation_scope,
      coverage_frames: frozen.semanticInput.coverage_frames,
      normalized_corpus: frozen.corpus.canonical_source_order.map((sourceId) => ({
        source_id: sourceId,
        record_status: "active",
        normalized: "Placeholder normalized capture text.",
      })),
      canonical_source_order: frozen.corpus.canonical_source_order,
    } as unknown as SemanticInput;

    try {
      buildD1ScoringPair({ handoff: buildHandoff({ semanticInput: v1Packet }) });
      expect.unreachable("a v1 packet must not reach a paired scoring call");
    } catch (error) {
      expect(error).toBeInstanceOf(ScoringHandoffError);
      const problems = (error as ScoringHandoffError).problems.join("\n");
      expect(problems).toContain("transport version");
      expect(problems).toContain("§4.4");
      expect(problems).toContain("Re-freeze the research attempt");
    }
  });
});

describe("#114 — tampering after the freeze is refused", () => {
  it("names the source whose capture text was edited on disk", () => {
    const dir = scratch();
    const built = request();
    const output = buildResearchOutput();
    const frozen = freezeD1Research({ request: built, output, facts: FACTS, frozenAt: FROZEN_AT });
    const capture = buildD1ResearchCapture({ request: built, output, facts: FACTS, frozenAt: FROZEN_AT });
    const specs = d1ResearchArtifacts({ frozen, capture });
    writeVerifiedArtifacts(dir, specs);

    const file = path.join(dir, "semantic-input.json");
    const persisted = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    const entries = persisted.normalized_corpus as Record<string, unknown>[];
    // A single character, in the text one scorer would read.
    entries[0]!.normalized = `${String(entries[0]!.normalized)} `;
    writeFileSync(file, `${JSON.stringify(persisted, null, 2)}\n`);

    const bindings = specs.find((spec) => spec.name === "semantic-input")!.bindings!;
    expect(() => readVerifiedArtifact(file, bindings)).toThrow(ArtifactIntegrityError);
    // The whole-packet digest catches it first; the per-source binding is what
    // says WHICH capture moved, so it is asserted on its own.
    const perSource = bindings.filter((binding) =>
      binding.label.includes("normalized_content_digest"),
    );
    expect(perSource).toHaveLength(1);
    expect(() => readVerifiedArtifact(file, perSource)).toThrow(
      /normalized_content_digest does not re-derive/,
    );
  });

  it("refuses a packet whose source facts were changed after the freeze", () => {
    const frozen = freeze(buildResearchOutput());
    const entries = packetEntries(frozen.semanticInput).map((entry, index) =>
      index === 0 ? { ...entry, source_tier: "C" as const } : entry,
    );
    // A tier changed after the freeze: the packet digest is recomputed by the
    // fixture, so only the binding to the frozen manifest can catch it.
    const tampered = { ...frozen.semanticInput, normalized_corpus: entries } as SemanticInput;

    try {
      buildD1ScoringPair({
        handoff: buildHandoff({
          semanticInput: tampered,
          sourceManifest: frozen.corpus.source_manifest as unknown as Record<string, unknown>[],
        }),
      });
      expect.unreachable("a post-freeze source-fact edit must not reach a scoring call");
    } catch (error) {
      expect(error).toBeInstanceOf(ScoringHandoffError);
      expect((error as ScoringHandoffError).problems.join("\n")).toContain(
        "are not the frozen manifest record",
      );
    }
  });

  it("refuses a packet whose capture text no longer hashes to the frozen digest", () => {
    const frozen = freeze(buildResearchOutput());
    const entries = packetEntries(frozen.semanticInput).map((entry, index) =>
      index === 0 ? { ...entry, normalized: "Quietly substituted capture text." } : entry,
    );
    const tampered = { ...frozen.semanticInput, normalized_corpus: entries } as SemanticInput;

    try {
      buildD1ScoringPair({
        handoff: buildHandoff({
          semanticInput: tampered,
          sourceManifest: frozen.corpus.source_manifest as unknown as Record<string, unknown>[],
        }),
      });
      expect.unreachable("substituted capture text must not reach a scoring call");
    } catch (error) {
      expect((error as ScoringHandoffError).problems.join("\n")).toContain(
        "does not hash to the frozen normalized_content_digest",
      );
    }
  });
});
