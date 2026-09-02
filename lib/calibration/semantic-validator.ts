import { canonicalDigest } from "./canonical-json";
import {
  COLLECTION_BANDS,
  DIMENSION_SUBCRITERIA,
  QUERY_FAMILIES,
  REQUIRED_FACETS,
  RETROSPECTIVE_CRITERIA,
  RUBRIC_SUBCRITERION_KEYS,
  deriveAffectedSet,
} from "./protocol-tables";
import {
  deriveDimension,
  deriveDimensionConfidence,
  deriveEvidenceStatus,
  deriveOverallConfidence,
  deriveSubcriterionConfidence,
  dimensionResultFields,
} from "./derivation";
import type {
  Claim,
  CompactScore,
  DerivedDimension,
  Difference,
  ScoreDecision,
  ScoringPackage,
  ScoringPass,
  Source,
} from "./package-types";

/**
 * The Protocol §15.1 semantic validator.
 *
 * "The validator has no editorial discretion. It rejects unless all are true."
 * Every check below is numbered against one of the nine §15.1 families so a
 * reviewer can walk the checklist against the code. The validator NEVER repairs,
 * normalises or reinterprets a package — it only reports — and callers use
 * `assertPackageSemantics` to get the fail-closed behaviour Item 4 gate 8
 * requires.
 *
 * Scope note, deliberately narrow: this runs only over data that has already
 * passed the canonical JSON Schema (`package-schema.ts`). Rules the schema
 * already enforces are not duplicated here; rules JSON Schema cannot express are.
 */

export type SemanticRuleFamily =
  | "digest_binding"
  | "decision_sets"
  | "pair_invariants"
  | "reference_integrity"
  | "score_records"
  | "coverage_and_time"
  | "adjudication"
  | "derivation"
  | "reassessment";

export interface SemanticIssue {
  readonly family: SemanticRuleFamily;
  /** The §15.1 clause number this check belongs to. */
  readonly clause: number;
  readonly path: string;
  readonly message: string;
}

export interface SemanticResult {
  readonly valid: boolean;
  readonly issues: readonly SemanticIssue[];
}

export interface SemanticOptions {
  /**
   * The immutable baseline package named by `baseline_package_digest`.
   *
   * Required for `reassessment_affected`: §14 says derivation reads baseline
   * decisions, affected-set replacements and re-attested facts together, so
   * without the baseline the eight dimension results cannot be recomputed and
   * "missing baseline ... rejects the package". Supplying it is the caller's
   * job; omitting it is a rejection, never a silent skip.
   */
  readonly baseline?: ScoringPackage;
}

class IssueLog {
  readonly issues: SemanticIssue[] = [];
  add(family: SemanticRuleFamily, clause: number, path: string, message: string): void {
    this.issues.push({ family, clause, path, message });
  }
}

/** Calendar validity. The schema's pattern admits 2026-02-31; February does not. */
export function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const MS_PER_DAY = 86_400_000;

/** Whole days between two calendar dates, UTC, `to − from`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

function sortedSet(values: readonly string[]): string {
  return [...values].sort().join("|");
}

function sameCompactScore(a: CompactScore, b: CompactScore): boolean {
  return a.score_value_kind === b.score_value_kind && a.numeric_score === b.numeric_score;
}

function compactOf(decision: ScoreDecision): CompactScore {
  return {
    score_value_kind: decision.score_value_kind,
    numeric_score: decision.numeric_score,
  };
}

/** Protocol §11.2 difference classification, recomputed from the two values. */
export function classifyDifference(
  primary: CompactScore,
  audit: CompactScore,
  primaryMissing: readonly string[],
  auditMissing: readonly string[],
): "exact" | "adjacent" | "material" {
  const bothNumeric =
    primary.score_value_kind === "numeric" && audit.score_value_kind === "numeric";
  if (bothNumeric) {
    const gap = Math.abs((primary.numeric_score ?? 0) - (audit.numeric_score ?? 0));
    if (gap === 0) return "exact";
    if (gap === 0.5) return "adjacent";
    return "material";
  }
  const bothUnknown =
    primary.score_value_kind === "unknown" && audit.score_value_kind === "unknown";
  if (bothUnknown) {
    // "both Unknown with exactly the same nonempty missing_coverage_classes set
    // after canonical sorting. Partial overlap is not a match."
    const same = sortedSet(primaryMissing) === sortedSet(auditMissing);
    return same && primaryMissing.length > 0 ? "exact" : "material";
  }
  // numeric versus Unknown
  return "material";
}

function isEndpoint(value: CompactScore): boolean {
  return (
    value.score_value_kind === "numeric" &&
    (value.numeric_score === 0 || value.numeric_score === 2)
  );
}

function ratesEqual(a: number, b: number): boolean {
  // Rates are recorded as decimals; compare on the value, not the notation.
  return Math.abs(a - b) < 1e-9;
}

function decisionMap(decisions: readonly ScoreDecision[]): Map<string, ScoreDecision> {
  return new Map(decisions.map((decision) => [decision.subcriterion_key, decision]));
}

/** §15.1(1) — canonical JSON and digest/approval binding. */
function checkDigestBinding(pkg: ScoringPackage, log: IssueLog): void {
  const computed = canonicalDigest(pkg.scoring_content as never);
  if (computed !== pkg.content_digest) {
    log.add(
      "digest_binding",
      1,
      "content_digest",
      `content_digest ${pkg.content_digest} does not match the RFC 8785 SHA-256 of scoring_content (${computed})`,
    );
  }
  if (pkg.owner_approval.approved_digest !== pkg.content_digest) {
    log.add(
      "digest_binding",
      1,
      "owner_approval.approved_digest",
      `approved_digest ${pkg.owner_approval.approved_digest} does not bind content_digest ${pkg.content_digest}; approval of one digest cannot authorize another package`,
    );
  }
  if (pkg.owner_approval.scope_key !== pkg.scoring_content.evaluation_scope.scope_key) {
    log.add(
      "digest_binding",
      1,
      "owner_approval.scope_key",
      "owner approval names a different scope_key than the evaluation scope",
    );
  }
}

/** §15.1(2) — exact unique active decision sets. */
function checkDecisionSets(pkg: ScoringPackage, log: IssueLog): readonly string[] {
  const content = pkg.scoring_content;
  const bounded = content.evaluation_kind === "reassessment_affected";
  const expected = bounded
    ? [...(content.reassessment_record?.affected_set_keys ?? [])].sort()
    : [...RUBRIC_SUBCRITERION_KEYS].sort();

  const sets: readonly (readonly [string, readonly ScoreDecision[]])[] = [
    ["primary_pass.decisions", content.primary_pass.decisions],
    ["audit_pass.decisions", content.audit_pass.decisions],
    ["adjudication.final_decisions", content.adjudication.final_decisions],
  ];

  for (const [path, decisions] of sets) {
    const keys = decisions.map((decision) => decision.subcriterion_key);
    const unique = new Set(keys);
    if (unique.size !== keys.length) {
      const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
      log.add(
        "decision_sets",
        2,
        path,
        `duplicate subcriterion keys: ${[...new Set(duplicates)].join(", ")}`,
      );
    }
    const unknownKeys = keys.filter((key) => !RUBRIC_SUBCRITERION_KEYS.includes(key));
    if (unknownKeys.length > 0) {
      log.add("decision_sets", 2, path, `keys outside the rubric: ${unknownKeys.join(", ")}`);
    }
    const sorted = [...unique].sort();
    if (sorted.join("|") !== expected.join("|")) {
      const missing = expected.filter((key) => !unique.has(key));
      const extra = sorted.filter((key) => !expected.includes(key));
      log.add(
        "decision_sets",
        2,
        path,
        `decision set is not exactly the ${bounded ? "affected" : "40-key rubric"} set` +
          (missing.length > 0 ? `; missing ${missing.join(", ")}` : "") +
          (extra.length > 0 ? `; unexpected ${extra.join(", ")}` : ""),
      );
    }
  }
  return expected;
}

/** §15.1(3) — primary/audit pair invariants. */
function checkPairInvariants(pkg: ScoringPackage, log: IssueLog): void {
  const primary = pkg.scoring_content.primary_pass.run_manifest;
  const audit = pkg.scoring_content.audit_pass.run_manifest;

  if (primary.role !== "primary") {
    log.add("pair_invariants", 3, "primary_pass.run_manifest.role", `role is "${primary.role}"`);
  }
  if (audit.role !== "audit") {
    log.add("pair_invariants", 3, "audit_pass.run_manifest.role", `role is "${audit.role}"`);
  }
  if (primary.run_id === audit.run_id) {
    log.add(
      "pair_invariants",
      3,
      "audit_pass.run_manifest.run_id",
      "the paired passes share a run_id; they are separate requests and must have distinct run IDs",
    );
  }

  const mustMatch = [
    "normalized_packet_digest",
    "system_instructions_digest",
    "prompt_template_digest",
    "rubric_digest",
    "protocol_digest",
    "output_schema_digest",
    "model_label",
    "model_snapshot_build_id",
    "provider",
    "protocol_version",
    "rubric_version",
    "package_schema_version",
  ] as const;
  for (const field of mustMatch) {
    if (primary[field] !== audit[field]) {
      log.add(
        "pair_invariants",
        3,
        `audit_pass.run_manifest.${field}`,
        `paired passes differ on ${field}: primary ${String(primary[field])} vs audit ${String(audit[field])}`,
      );
    }
  }

  if (primary.canonical_source_order.join("|") !== audit.canonical_source_order.join("|")) {
    log.add(
      "pair_invariants",
      3,
      "audit_pass.run_manifest.canonical_source_order",
      "paired passes received different canonical source order",
    );
  }

  // "their decoding configurations match except the sampling seed and exposed
  // seeds differ" — the seed is the ONLY permitted difference.
  const asMap = (params: readonly { name: string; value: unknown }[]) =>
    new Map(params.filter((p) => p.name !== "seed").map((p) => [p.name, JSON.stringify(p.value)]));
  const primaryParams = asMap(primary.decoding_parameters);
  const auditParams = asMap(audit.decoding_parameters);
  for (const [name, value] of primaryParams) {
    if (!auditParams.has(name)) {
      log.add("pair_invariants", 3, "audit_pass.run_manifest.decoding_parameters", `audit pass is missing decoding parameter "${name}"`);
    } else if (auditParams.get(name) !== value) {
      log.add(
        "pair_invariants",
        3,
        "audit_pass.run_manifest.decoding_parameters",
        `decoding parameter "${name}" differs between the paired passes`,
      );
    }
  }
  for (const name of auditParams.keys()) {
    if (!primaryParams.has(name)) {
      log.add("pair_invariants", 3, "primary_pass.run_manifest.decoding_parameters", `primary pass is missing decoding parameter "${name}"`);
    }
  }

  // "exposed seeds differ" when a seed exists at all; when the API exposes none,
  // both record the same `parameter_unavailable` sentinel.
  const seedsAreNumbers = typeof primary.seed === "number" && typeof audit.seed === "number";
  if (seedsAreNumbers && primary.seed === audit.seed) {
    log.add(
      "pair_invariants",
      3,
      "audit_pass.run_manifest.seed",
      "both passes record the same seed; an exposed seed must differ between the pair",
    );
  }
  if (typeof primary.seed !== typeof audit.seed) {
    log.add(
      "pair_invariants",
      3,
      "audit_pass.run_manifest.seed",
      "one pass records a numeric seed and the other parameter_unavailable",
    );
  }

  // "their scoring runs had no research/network tools" (§15.1(3), ADR 0036 §6).
  for (const [path, manifest] of [
    ["primary_pass", primary],
    ["audit_pass", audit],
  ] as const) {
    if (manifest.research_tool_access.length > 0) {
      log.add(
        "pair_invariants",
        3,
        `${path}.run_manifest.research_tool_access`,
        `a scoring pass records tool access (${manifest.research_tool_access.join(", ")}); scoring passes are tool-free`,
      );
    }
    // A semantic correction invalidates the measured attempt (§13, ADR 0036 §10).
    if (manifest.human_corrections.length > 0) {
      log.add(
        "pair_invariants",
        3,
        `${path}.run_manifest.human_corrections`,
        "a measured scoring pass records human corrections; a semantically corrected attempt does not count",
      );
    }
  }
}

/** §15.1(4) — query families, collection standard, reference integrity. */
function checkReferenceIntegrity(pkg: ScoringPackage, log: IssueLog): void {
  const content = pkg.scoring_content;
  const corpus = content.corpus;

  // All seven query-family dispositions occur exactly once.
  const families = corpus.query_family_audit.map((entry) => entry.query_family);
  for (const family of QUERY_FAMILIES) {
    const count = families.filter((candidate) => candidate === family).length;
    if (count !== 1) {
      log.add(
        "reference_integrity",
        4,
        "corpus.query_family_audit",
        `query family "${family}" appears ${count} times; each of the seven occurs exactly once`,
      );
    }
  }

  // Independent ACTIVE A/B clusters reproduce the §4.1 band.
  const clusters = new Set(
    corpus.source_manifest
      .filter(
        (source) =>
          source.record_status === "active" &&
          (source.source_tier === "A" || source.source_tier === "B"),
      )
      .map((source) => source.independence_cluster_id),
  );
  const band = COLLECTION_BANDS.get(corpus.collection_standard);
  if (band) {
    const count = clusters.size;
    const tooFew = count < band.min;
    const tooMany = band.max !== null && count > band.max;
    if (tooFew || tooMany) {
      log.add(
        "reference_integrity",
        4,
        "corpus.collection_standard",
        `collection_standard "${corpus.collection_standard}" requires ${band.min}${band.max === null ? " or more" : `–${band.max}`} independent active A/B clusters; the manifest has ${count}`,
      );
    }
  }

  const sourceIds = new Set(corpus.source_manifest.map((source) => source.source_id));
  if (sourceIds.size !== corpus.source_manifest.length) {
    log.add("reference_integrity", 4, "corpus.source_manifest", "duplicate source_id values");
  }
  for (const sourceId of corpus.canonical_source_order) {
    if (!sourceIds.has(sourceId)) {
      log.add(
        "reference_integrity",
        4,
        "corpus.canonical_source_order",
        `canonical source order names unknown source "${sourceId}"`,
      );
    }
  }

  const frameIds = new Set(corpus.coverage_frames.map((frame) => frame.coverage_frame_id));
  const unitIds = new Set(
    corpus.coverage_frames.flatMap((frame) => frame.coverage_units.map((unit) => unit.unit_id)),
  );
  const candidateIds = new Set(corpus.candidate_source_log.map((entry) => entry.candidate_id));

  for (const [path, pass] of [
    ["primary_pass", content.primary_pass],
    ["audit_pass", content.audit_pass],
  ] as const) {
    checkPassReferences(path, pass, sourceIds, unitIds, frameIds, candidateIds, log);
  }

  // Experience-tag keys are unique. The schema's uniqueItems compares whole
  // objects, so two entries for one key with different intensities pass it.
  const tagKeys = content.interpretation.experience_tags.map((tag) => tag.tag_key);
  const duplicateTags = tagKeys.filter((key, index) => tagKeys.indexOf(key) !== index);
  if (duplicateTags.length > 0) {
    log.add(
      "reference_integrity",
      4,
      "interpretation.experience_tags",
      `duplicate tag keys: ${[...new Set(duplicateTags)].join(", ")}`,
    );
  }

  // Owner override references resolve, and name a key the package actually decides.
  const finalKeys = new Set(
    content.adjudication.final_decisions.map((decision) => decision.subcriterion_key),
  );
  const allClaimIds = new Set([
    ...content.primary_pass.claim_ledger.map((claim) => claim.claim_id),
    ...content.audit_pass.claim_ledger.map((claim) => claim.claim_id),
  ]);
  for (const [index, override] of pkg.owner_approval.override_reasons.entries()) {
    if (!finalKeys.has(override.subcriterion_key)) {
      log.add(
        "reference_integrity",
        4,
        `owner_approval.override_reasons[${index}]`,
        `override names "${override.subcriterion_key}", which is not in the final decision set`,
      );
    }
    for (const claimId of override.claim_ids) {
      if (!allClaimIds.has(claimId)) {
        log.add(
          "reference_integrity",
          4,
          `owner_approval.override_reasons[${index}].claim_ids`,
          `unresolved claim reference "${claimId}"`,
        );
      }
    }
  }

  // Reconciled claim records resolve into the two ledgers they reconcile.
  const primaryClaimIds = new Set(
    content.primary_pass.claim_ledger.map((claim) => claim.claim_id),
  );
  const auditClaimIds = new Set(content.audit_pass.claim_ledger.map((claim) => claim.claim_id));
  for (const [index, record] of content.adjudication.reconciled_claim_record.entries()) {
    for (const claimId of record.primary_claim_ids) {
      if (!primaryClaimIds.has(claimId)) {
        log.add(
          "reference_integrity",
          4,
          `adjudication.reconciled_claim_record[${index}].primary_claim_ids`,
          `unresolved primary claim "${claimId}"`,
        );
      }
    }
    for (const claimId of record.audit_claim_ids) {
      if (!auditClaimIds.has(claimId)) {
        log.add(
          "reference_integrity",
          4,
          `adjudication.reconciled_claim_record[${index}].audit_claim_ids`,
          `unresolved audit claim "${claimId}"`,
        );
      }
    }
  }
}

function checkPassReferences(
  path: string,
  pass: ScoringPass,
  sourceIds: ReadonlySet<string>,
  unitIds: ReadonlySet<string>,
  frameIds: ReadonlySet<string>,
  candidateIds: ReadonlySet<string>,
  log: IssueLog,
): void {
  const claims = new Map(pass.claim_ledger.map((claim) => [claim.claim_id, claim]));
  if (claims.size !== pass.claim_ledger.length) {
    log.add("reference_integrity", 4, `${path}.claim_ledger`, "duplicate claim_id values");
  }

  for (const claim of pass.claim_ledger) {
    const at = `${path}.claim_ledger[${claim.claim_id}]`;
    if (!sourceIds.has(claim.source_id)) {
      log.add("reference_integrity", 4, at, `unresolved source reference "${claim.source_id}"`);
    }
    for (const unitId of claim.observed_unit_ids) {
      if (!unitIds.has(unitId)) {
        log.add("reference_integrity", 4, at, `unresolved coverage unit "${unitId}"`);
      }
    }
    // No self-reference in either link direction.
    if (
      claim.corroborating_claim_ids.includes(claim.claim_id) ||
      claim.contradicting_claim_ids.includes(claim.claim_id)
    ) {
      log.add("reference_integrity", 4, at, "claim links refer to the claim itself");
    }
    // No relation-type contradiction: one pair cannot be both.
    const both = claim.corroborating_claim_ids.filter((id) =>
      claim.contradicting_claim_ids.includes(id),
    );
    if (both.length > 0) {
      log.add(
        "reference_integrity",
        4,
        at,
        `claims ${both.join(", ")} are recorded as both corroborating and contradicting`,
      );
    }
    for (const linked of [...claim.corroborating_claim_ids, ...claim.contradicting_claim_ids]) {
      if (!claims.has(linked)) {
        log.add("reference_integrity", 4, at, `unresolved linked claim "${linked}"`);
      }
    }
    // A relation asserted one way must not be denied the other way.
    for (const linked of claim.corroborating_claim_ids) {
      const other = claims.get(linked);
      if (other?.contradicting_claim_ids.includes(claim.claim_id)) {
        log.add(
          "reference_integrity",
          4,
          at,
          `claim "${linked}" contradicts this claim while this claim corroborates it`,
        );
      }
    }
  }

  for (const decision of pass.decisions) {
    const at = `${path}.decisions[${decision.subcriterion_key}]`;
    for (const claimId of decision.claim_ids) {
      const claim = claims.get(claimId);
      if (!claim) {
        log.add("reference_integrity", 4, at, `unresolved claim reference "${claimId}"`);
        continue;
      }
      if (claim.subcriterion_key !== decision.subcriterion_key) {
        log.add(
          "reference_integrity",
          4,
          at,
          `claim "${claimId}" is mapped to ${claim.subcriterion_key} but supports a ${decision.subcriterion_key} decision`,
        );
      }
    }
    // Insufficiency references point at claims, candidate-source records or the
    // coverage frame (Protocol §6 Step 7).
    for (const referenceId of decision.insufficiency_reference_ids) {
      if (
        !claims.has(referenceId) &&
        !candidateIds.has(referenceId) &&
        !frameIds.has(referenceId) &&
        !unitIds.has(referenceId)
      ) {
        log.add(
          "reference_integrity",
          4,
          at,
          `insufficiency reference "${referenceId}" resolves to no claim, candidate source or coverage frame`,
        );
      }
    }
    for (const claimId of decision.endpoint_gate?.scope_spanning_claim_ids ?? []) {
      if (!claims.has(claimId)) {
        log.add("reference_integrity", 4, `${at}.endpoint_gate`, `unresolved claim "${claimId}"`);
      }
    }
    for (const override of decision.platform_overrides) {
      for (const claimId of override.claim_ids) {
        if (!claims.has(claimId)) {
          log.add(
            "reference_integrity",
            4,
            `${at}.platform_overrides[${override.platform_key}]`,
            `unresolved claim "${claimId}"`,
          );
        }
      }
    }
  }
}

/** §15.1(4) — no active Tier-D claim supports a numeric decision. */
function checkTierD(pkg: ScoringPackage, log: IssueLog): void {
  const sources = new Map<string, Source>(
    pkg.scoring_content.corpus.source_manifest.map((source) => [source.source_id, source]),
  );
  for (const [path, pass] of [
    ["primary_pass", pkg.scoring_content.primary_pass],
    ["audit_pass", pkg.scoring_content.audit_pass],
  ] as const) {
    const claims = new Map(pass.claim_ledger.map((claim) => [claim.claim_id, claim]));
    for (const decision of pass.decisions) {
      if (decision.score_value_kind !== "numeric") continue;
      for (const claimId of decision.claim_ids) {
        const claim = claims.get(claimId);
        if (!claim || claim.disposition === "rejected") continue;
        const source = sources.get(claim.source_id);
        if (source?.source_tier === "D") {
          log.add(
            "reference_integrity",
            4,
            `${path}.decisions[${decision.subcriterion_key}]`,
            `active Tier-D claim "${claimId}" supports a numeric decision; Tier D never supports a number (§4.4)`,
          );
        }
      }
    }
  }
}

/** §15.1(5) — score records: anchors, facets, endpoints, overrides. */
function checkScoreRecords(pkg: ScoringPackage, log: IssueLog): void {
  const platforms = new Set(pkg.scoring_content.evaluation_scope.included_platforms);
  const sets: readonly (readonly [string, readonly ScoreDecision[]])[] = [
    ["primary_pass.decisions", pkg.scoring_content.primary_pass.decisions],
    ["audit_pass.decisions", pkg.scoring_content.audit_pass.decisions],
    ["adjudication.final_decisions", pkg.scoring_content.adjudication.final_decisions],
  ];

  for (const [path, decisions] of sets) {
    for (const decision of decisions) {
      const at = `${path}[${decision.subcriterion_key}]`;

      // The anchor names this criterion at this value; the schema only checks shape.
      if (decision.anchor_id !== null) {
        const [anchorKey, anchorValue] = decision.anchor_id.split("@");
        if (anchorKey !== decision.subcriterion_key) {
          log.add(
            "score_records",
            5,
            at,
            `anchor_id names "${anchorKey}" on a ${decision.subcriterion_key} decision`,
          );
        }
        if (Number(anchorValue) !== decision.numeric_score) {
          log.add(
            "score_records",
            5,
            at,
            `anchor_id value ${anchorValue} does not match numeric_score ${String(decision.numeric_score)}`,
          );
        }
      }

      checkRequiredFacets(at, decision, log);

      // §7.4 — an override is a real difference on an included platform.
      for (const override of decision.platform_overrides) {
        const overrideAt = `${at}.platform_overrides[${override.platform_key}]`;
        if (!platforms.has(override.platform_key)) {
          log.add(
            "score_records",
            5,
            overrideAt,
            `override names platform "${override.platform_key}", which is not an included platform`,
          );
        }
        if (sameCompactScore(override, compactOf(decision))) {
          log.add(
            "score_records",
            5,
            overrideAt,
            "override repeats the base value; an override must differ from the base (§7.4)",
          );
        }
        const derived = deriveSubcriterionConfidence(
          override.score_value_kind,
          override.confidence_facts,
        );
        if (derived !== override.subcriterion_confidence) {
          log.add(
            "score_records",
            5,
            overrideAt,
            `override confidence "${override.subcriterion_confidence}" does not derive from its facts (expected ${derived})`,
          );
        }
      }
      const overridePlatforms = decision.platform_overrides.map((o) => o.platform_key);
      const duplicates = overridePlatforms.filter((p, i) => overridePlatforms.indexOf(p) !== i);
      if (duplicates.length > 0) {
        log.add("score_records", 5, at, `duplicate platform overrides: ${[...new Set(duplicates)].join(", ")}`);
      }

      // §10.1 — the label is arithmetic over the recorded facts, never editorial.
      const derived = deriveSubcriterionConfidence(
        decision.score_value_kind,
        decision.confidence_facts,
      );
      if (derived !== decision.subcriterion_confidence) {
        log.add(
          "score_records",
          5,
          at,
          `subcriterion_confidence "${decision.subcriterion_confidence}" does not derive from the recorded facts (expected ${derived})`,
        );
      }
    }
  }
}

/** Protocol §6.1 required-facet rule: the parent is the LOWER of its two facets. */
function checkRequiredFacets(at: string, decision: ScoreDecision, log: IssueLog): void {
  const required = REQUIRED_FACETS.get(decision.subcriterion_key);
  if (!required) return;

  const byKey = new Map(decision.facet_records.map((facet) => [facet.facet_key, facet]));
  const facets = required.map((key) => byKey.get(key));
  if (facets.some((facet) => facet === undefined)) return; // schema already rejects this

  const values = facets as NonNullable<(typeof facets)[number]>[];
  const anyUnknown = values.some((facet) => facet.score_value_kind === "unknown");

  if (anyUnknown) {
    if (decision.score_value_kind !== "unknown") {
      log.add(
        "score_records",
        5,
        at,
        "a required facet is Unknown, so the parent criterion must be Unknown (§6.1)",
      );
      return;
    }
    // "carries the union of the facet missing-coverage classes"
    const union = new Set(values.flatMap((facet) => facet.missing_coverage_classes));
    const recorded = new Set(decision.missing_coverage_classes);
    const missing = [...union].filter((cls) => !recorded.has(cls));
    if (missing.length > 0) {
      log.add(
        "score_records",
        5,
        at,
        `parent must carry the union of facet missing-coverage classes; absent: ${missing.join(", ")}`,
      );
    }
    return;
  }

  if (decision.score_value_kind !== "numeric") {
    log.add(
      "score_records",
      5,
      at,
      "both required facets are numeric, so the parent criterion cannot be Unknown (§6.1)",
    );
    return;
  }
  const lower = Math.min(...values.map((facet) => facet.numeric_score as number));
  if (decision.numeric_score !== lower) {
    log.add(
      "score_records",
      5,
      at,
      `parent value ${String(decision.numeric_score)} is not the lower facet value ${lower} (§6.1: do not average)`,
    );
  }
}

/** §15.1(6) — coverage, calendar dates, retrospective minima. */
function checkCoverageAndTime(pkg: ScoringPackage, log: IssueLog): void {
  const content = pkg.scoring_content;
  const scope = content.evaluation_scope;

  for (const [path, value] of [
    ["evaluation_scope.evidence_cutoff", scope.evidence_cutoff],
    ["evaluation_scope.public_release_date", scope.public_release_date],
  ] as const) {
    if (value !== null && !isCalendarDate(value)) {
      log.add("coverage_and_time", 6, path, `"${value}" is not a valid calendar date`);
    }
  }
  if (
    scope.public_release_date !== null &&
    isCalendarDate(scope.public_release_date) &&
    isCalendarDate(scope.evidence_cutoff) &&
    daysBetween(scope.public_release_date, scope.evidence_cutoff) < 0
  ) {
    log.add(
      "coverage_and_time",
      6,
      "evaluation_scope.evidence_cutoff",
      "evidence cutoff precedes the public release date",
    );
  }
  if (scope.release_state === "released" && scope.public_release_date === null) {
    log.add(
      "coverage_and_time",
      6,
      "evaluation_scope.public_release_date",
      "a released scope must record its public release date",
    );
  }

  for (const source of content.corpus.source_manifest) {
    if (source.publication_date !== null && !isCalendarDate(source.publication_date)) {
      log.add(
        "coverage_and_time",
        6,
        `corpus.source_manifest[${source.source_id}].publication_date`,
        `"${source.publication_date}" is not a valid calendar date`,
      );
    }
  }

  const frames = new Map(
    content.corpus.coverage_frames.map((frame) => [frame.subcriterion_key, frame]),
  );

  for (const [path, pass] of [
    ["primary_pass", content.primary_pass],
    ["audit_pass", content.audit_pass],
  ] as const) {
    for (const claim of pass.claim_ledger) {
      const retro = claim.retrospective_time;
      if (!retro) continue;
      const at = `${path}.claim_ledger[${claim.claim_id}].retrospective_time`;
      const basis = retro.play_completion_date ?? retro.latest_possible_play_date;
      for (const [field, value] of [
        ["retrospective_observation_date", retro.retrospective_observation_date],
        ["play_completion_date", retro.play_completion_date],
        ["latest_possible_play_date", retro.latest_possible_play_date],
      ] as const) {
        if (value !== null && !isCalendarDate(value)) {
          log.add("coverage_and_time", 6, `${at}.${field}`, `"${value}" is not a valid calendar date`);
        }
      }
      if (basis && isCalendarDate(basis) && isCalendarDate(retro.retrospective_observation_date)) {
        // "elapsed_days_lower_bound is derived rather than guessed."
        const computed = daysBetween(basis, retro.retrospective_observation_date);
        if (computed !== retro.elapsed_days_lower_bound) {
          log.add(
            "coverage_and_time",
            6,
            at,
            `elapsed_days_lower_bound ${retro.elapsed_days_lower_bound} does not reproduce from the recorded dates (${computed})`,
          );
        }
      }
    }

    for (const decision of pass.decisions) {
      checkCoverageState(`${path}.decisions[${decision.subcriterion_key}]`, decision, frames, log);
    }
  }

  for (const [path, decisions] of [
    ["primary_pass.decisions", content.primary_pass.decisions],
    ["audit_pass.decisions", content.audit_pass.decisions],
    ["adjudication.final_decisions", content.adjudication.final_decisions],
  ] as const) {
    const ledger =
      path === "audit_pass.decisions"
        ? content.audit_pass.claim_ledger
        : content.primary_pass.claim_ledger;
    for (const decision of decisions) {
      checkRetrospectiveMinima(path, decision, ledger, content, log);
    }
  }
}

/**
 * Protocol §6.1 coverage bands, expressed over the fields the package records.
 *
 * KNOWN LIMITATION, deliberately not papered over: §6.1 separates `bounded`
 * from `materially_limited` partly by whether the missing stratum is CENTRAL,
 * and the package records missing coverage *classes*, not the missing *units*,
 * so centrality is not recoverable from the record. These checks therefore
 * implement the part that is unambiguous and never reject a package the
 * protocol permits. See the Item 4 report's open-question list.
 */
function checkCoverageState(
  at: string,
  decision: ScoreDecision,
  frames: ReadonlyMap<string, { readonly coverage_units: readonly { unit_class: string }[] }>,
  log: IssueLog,
): void {
  const facts = decision.confidence_facts;
  const missing = decision.missing_coverage_classes;

  if (facts.coverage_state === "full" && missing.length > 0) {
    log.add(
      "coverage_and_time",
      6,
      at,
      `coverage_state "full" contradicts recorded missing coverage classes (${missing.join(", ")})`,
    );
  }
  if (facts.coverage_state !== "full" && missing.length === 0 && decision.score_value_kind === "unknown") {
    log.add(
      "coverage_and_time",
      6,
      at,
      `coverage_state "${facts.coverage_state}" records no missing coverage class`,
    );
  }
  // "bounded coverage is missing exactly one noncentral stratum and has no known
  // material mode/platform/build gap."
  if (facts.coverage_state === "bounded") {
    const gapClasses = missing.filter((cls) =>
      ["mode", "platform", "build", "material_conflict"].includes(cls),
    );
    if (gapClasses.length > 0) {
      log.add(
        "coverage_and_time",
        6,
        at,
        `coverage_state "bounded" cannot carry a ${gapClasses.join("/")} gap; that is materially_limited (§6.1)`,
      );
    }
    if (missing.length > 1) {
      log.add(
        "coverage_and_time",
        6,
        at,
        `coverage_state "bounded" admits exactly one missing stratum; ${missing.length} recorded`,
      );
    }
  }

  // A missing stratum class must exist in this criterion's frozen frame.
  const frame = frames.get(decision.subcriterion_key);
  if (frame) {
    const unitClasses = new Set(frame.coverage_units.map((unit) => unit.unit_class));
    const frameBound = ["temporal_stratum", "progression_state", "core_loop", "mode", "platform", "build"];
    for (const cls of missing) {
      if (frameBound.includes(cls) && !unitClasses.has(cls)) {
        log.add(
          "coverage_and_time",
          6,
          at,
          `missing coverage class "${cls}" is not a unit class in the frozen coverage frame`,
        );
      }
    }
  } else if (decision.score_value_kind === "numeric") {
    log.add(
      "coverage_and_time",
      6,
      at,
      "no frozen coverage frame exists for this criterion; coverage cannot be checked before an anchor (§6 Step 2)",
    );
  }
}

/** Protocol §6 Step 2 — the retrospective minima for the two delayed criteria. */
function checkRetrospectiveMinima(
  path: string,
  decision: ScoreDecision,
  ledger: readonly Claim[],
  content: ScoringPackage["scoring_content"],
  log: IssueLog,
): void {
  if (!RETROSPECTIVE_CRITERIA.includes(decision.subcriterion_key)) return;
  const at = `${path}[${decision.subcriterion_key}]`;
  const scope = content.evaluation_scope;

  // "For an evaluated release less than 30 days old, both criteria are normally
  // Unknown." Measured from public release to the evidence cutoff.
  if (
    scope.release_state === "released" &&
    scope.public_release_date !== null &&
    isCalendarDate(scope.public_release_date) &&
    isCalendarDate(scope.evidence_cutoff)
  ) {
    const age = daysBetween(scope.public_release_date, scope.evidence_cutoff);
    if (age < 30 && decision.score_value_kind === "numeric") {
      log.add(
        "coverage_and_time",
        6,
        at,
        `the evaluated release is ${age} days old at the evidence cutoff; a delayed-effect criterion must be Unknown under 30 days (§6 Step 2)`,
      );
    }
  }

  // "Pre-release material is Unknown unless ... at least 90 days ... and
  // confidence may not exceed Medium."
  if (
    scope.release_state !== "released" &&
    decision.score_value_kind === "numeric" &&
    decision.subcriterion_confidence === "High"
  ) {
    log.add(
      "coverage_and_time",
      6,
      at,
      "the 90-day pre-release exception caps confidence at Medium (§6 Step 2)",
    );
  }

  if (decision.score_value_kind !== "numeric") return;

  const claims = new Map(ledger.map((claim) => [claim.claim_id, claim]));
  const eligible = decision.claim_ids
    .map((claimId) => claims.get(claimId))
    .filter((claim): claim is Claim => claim !== undefined)
    .filter((claim) => claim.disposition !== "rejected")
    .filter(
      (claim) =>
        claim.retrospective_time !== null &&
        claim.retrospective_time.elapsed_days_lower_bound >= 30,
    );

  // "Independent" is the §4.2 sense: distinct independence clusters.
  const sources = new Map(
    content.corpus.source_manifest.map((source) => [source.source_id, source]),
  );
  const clusters = new Set(
    eligible
      .map((claim) => sources.get(claim.source_id)?.independence_cluster_id)
      .filter((cluster): cluster is string => cluster !== undefined),
  );

  const value = decision.numeric_score as number;
  const needsTwo = value === 0 || value === 0.5 || value === 1.5 || value === 2;
  const required = needsTwo ? 2 : 1;
  if (clusters.size < required) {
    log.add(
      "coverage_and_time",
      6,
      at,
      `value ${value} requires ${required} independent eligible retrospective claim(s) with an elapsed lower bound of 30+ days; ${clusters.size} present`,
    );
  }
  if (value === 2 && !eligible.some((claim) => (claim.retrospective_time?.elapsed_days_lower_bound ?? 0) >= 180)) {
    log.add(
      "coverage_and_time",
      6,
      at,
      "a value of 2 requires at least one eligible claim with an elapsed lower bound of 180+ days (§6 Step 2)",
    );
  }
}

/** §15.1(7) — differences, audit rates, adjudication, endpoint agreement. */
function checkAdjudication(pkg: ScoringPackage, pairedKeys: readonly string[], log: IssueLog): void {
  const content = pkg.scoring_content;
  const primary = decisionMap(content.primary_pass.decisions);
  const audit = decisionMap(content.audit_pass.decisions);
  const differences = content.adjudication.differences;
  const byKey = new Map<string, Difference>();

  for (const difference of differences) {
    const at = `adjudication.differences[${difference.difference_id}]`;
    if (byKey.has(difference.subcriterion_key)) {
      log.add("adjudication", 7, at, `a second difference record for "${difference.subcriterion_key}"`);
    }
    byKey.set(difference.subcriterion_key, difference);

    const primaryDecision = primary.get(difference.subcriterion_key);
    const auditDecision = audit.get(difference.subcriterion_key);
    if (!primaryDecision || !auditDecision) {
      log.add("adjudication", 7, at, `no paired decisions for "${difference.subcriterion_key}"`);
      continue;
    }
    if (!sameCompactScore(difference.primary_value, compactOf(primaryDecision))) {
      log.add("adjudication", 7, at, "recorded primary_value does not match the primary decision");
    }
    if (!sameCompactScore(difference.audit_value, compactOf(auditDecision))) {
      log.add("adjudication", 7, at, "recorded audit_value does not match the audit decision");
    }
    const expected = classifyDifference(
      compactOf(primaryDecision),
      compactOf(auditDecision),
      primaryDecision.missing_coverage_classes,
      auditDecision.missing_coverage_classes,
    );
    if (expected !== difference.difference_class) {
      log.add(
        "adjudication",
        7,
        at,
        `difference_class "${difference.difference_class}" does not recompute from the paired values (expected "${expected}") (§11.2)`,
      );
    }
    if (difference.confidence_differs !== (primaryDecision.subcriterion_confidence !== auditDecision.subcriterion_confidence)) {
      log.add("adjudication", 7, at, "confidence_differs does not match the paired confidence labels");
    }
    // "every material difference and every difference touching an endpoint value
    // is marked for owner review and is adjudicated."
    const touchesEndpoint = isEndpoint(difference.primary_value) || isEndpoint(difference.audit_value);
    const mustReview =
      expected === "material" || (expected !== "exact" && touchesEndpoint);
    if (mustReview && !difference.owner_review_required) {
      log.add(
        "adjudication",
        7,
        at,
        "a material or endpoint-touching difference must be marked for owner review (§11.3)",
      );
    }
  }

  // One difference record per paired decision, so the rates below have a domain.
  for (const key of pairedKeys) {
    if (!byKey.has(key)) {
      log.add(
        "adjudication",
        7,
        "adjudication.differences",
        `no difference record for paired key "${key}"; the audit rates are computed over every paired decision (§11.4)`,
      );
    }
  }

  const summary = content.audit_summary;
  for (const differenceId of summary.difference_ids) {
    if (!differences.some((difference) => difference.difference_id === differenceId)) {
      log.add(
        "adjudication",
        7,
        "audit_summary.difference_ids",
        `unresolved difference reference "${differenceId}"`,
      );
    }
  }

  // `difference_ids` is the set of per-key records representing an ACTUAL
  // divergence needing reconciliation or retention: a non-exact class, or any
  // recorded secondary difference in claim inclusion, mapping, disposition or
  // confidence. Clean exact rows with no secondary difference are omitted.
  // Owner review on material/endpoint differences remains a stricter subset.
  // (Owner determination, 2026-09-02, on the Item 4 review of this contract.)
  const divergent = differences
    .filter(
      (difference) =>
        difference.difference_class !== "exact" ||
        difference.claim_inclusion_differs ||
        difference.mapping_differs ||
        difference.disposition_differs ||
        difference.confidence_differs,
    )
    .map((difference) => difference.difference_id);
  const recordedIds = [...summary.difference_ids].sort();
  if (recordedIds.join("|") !== [...divergent].sort().join("|")) {
    const missing = divergent.filter((id) => !summary.difference_ids.includes(id));
    const extra = summary.difference_ids.filter((id) => !divergent.includes(id));
    log.add(
      "adjudication",
      7,
      "audit_summary.difference_ids",
      "difference_ids is not exactly the set of divergent per-key records" +
        (missing.length > 0 ? `; missing ${missing.join(", ")}` : "") +
        (extra.length > 0 ? `; unexpected ${extra.join(", ")}` : ""),
    );
  }

  const paired = pairedKeys.length;
  const counts = { exact: 0, adjacent: 0, material: 0 };
  for (const key of pairedKeys) {
    const difference = byKey.get(key);
    if (difference) counts[difference.difference_class] += 1;
  }
  const expectedSummary: Record<string, number> = {
    paired_decision_count: paired,
    exact_count: counts.exact,
    adjacent_count: counts.adjacent,
    material_count: counts.material,
  };
  for (const [field, value] of Object.entries(expectedSummary)) {
    if ((summary as unknown as Record<string, number>)[field] !== value) {
      log.add(
        "adjudication",
        7,
        `audit_summary.${field}`,
        `recorded ${String((summary as unknown as Record<string, number>)[field])}, recomputes to ${value}`,
      );
    }
  }

  if (paired > 0) {
    const numericIn = (map: Map<string, ScoreDecision>) =>
      pairedKeys.filter((key) => map.get(key)?.score_value_kind === "numeric").length / paired;
    const confidenceExact =
      pairedKeys.filter(
        (key) =>
          primary.get(key)?.subcriterion_confidence === audit.get(key)?.subcriterion_confidence,
      ).length / paired;
    const rates: readonly (readonly [string, number, number])[] = [
      ["numeric_rate_primary", summary.numeric_rate_primary, numericIn(primary)],
      ["numeric_rate_audit", summary.numeric_rate_audit, numericIn(audit)],
      ["exact_rate", summary.exact_rate, counts.exact / paired],
      [
        "exact_or_adjacent_rate",
        summary.exact_or_adjacent_rate,
        (counts.exact + counts.adjacent) / paired,
      ],
      ["confidence_exact_rate", summary.confidence_exact_rate, confidenceExact],
    ];
    for (const [field, recorded, expected] of rates) {
      if (!ratesEqual(recorded, expected)) {
        log.add(
          "adjudication",
          7,
          `audit_summary.${field}`,
          `recorded ${recorded}, recomputes to ${expected}`,
        );
      }
    }
  }

  const endpointMaterial = pairedKeys.filter((key) => {
    const difference = byKey.get(key);
    if (!difference || difference.difference_class !== "material") return false;
    return isEndpoint(difference.primary_value) || isEndpoint(difference.audit_value);
  }).length;
  if (summary.endpoint_material_disagreement_count !== endpointMaterial) {
    log.add(
      "adjudication",
      7,
      "audit_summary.endpoint_material_disagreement_count",
      `recorded ${summary.endpoint_material_disagreement_count}, recomputes to ${endpointMaterial}`,
    );
  }

  // Final decisions resolve to a recorded pass value or a documented override.
  const overrides = new Map(
    pkg.owner_approval.override_reasons.map((override) => [override.subcriterion_key, override]),
  );
  for (const final of content.adjudication.final_decisions) {
    const at = `adjudication.final_decisions[${final.subcriterion_key}]`;
    const value = compactOf(final);
    const primaryValue = primary.get(final.subcriterion_key);
    const auditValue = audit.get(final.subcriterion_key);
    const override = overrides.get(final.subcriterion_key);
    const matchesPass =
      (primaryValue && sameCompactScore(value, compactOf(primaryValue))) ||
      (auditValue && sameCompactScore(value, compactOf(auditValue)));
    const matchesOverride = override && sameCompactScore(value, override.selected_value);
    if (!matchesPass && !matchesOverride) {
      log.add(
        "adjudication",
        7,
        at,
        "final value is neither a recorded primary/audit resolution nor a documented owner override (§15.1(7))",
      );
    }
    // "every endpoint final value shows blind exact agreement or a documented
    // owner adjudication."
    if (isEndpoint(value)) {
      const blindAgreement =
        primaryValue &&
        auditValue &&
        sameCompactScore(compactOf(primaryValue), compactOf(auditValue)) &&
        sameCompactScore(value, compactOf(primaryValue));
      if (!blindAgreement && !matchesOverride) {
        log.add(
          "adjudication",
          7,
          at,
          "an endpoint final value requires blind exact agreement or a documented owner adjudication (§9)",
        );
      }
    }
  }
}

/** §15.1(8) — dimensions, confidence, scope facts, evidence status. */
function checkDerivation(
  pkg: ScoringPackage,
  options: SemanticOptions,
  log: IssueLog,
): void {
  const content = pkg.scoring_content;
  const scope = content.evaluation_scope;

  // Duplicated scope facts must match the frozen evaluation scope.
  const overall = content.overall_confidence;
  const mirrored: readonly (readonly [string, string, string])[] = [
    ["global_scope_state", overall.global_scope_state, scope.global_scope_state],
    ["profile_stability_state", overall.profile_stability_state, scope.profile_stability_state],
    ["evaluation_maturity", overall.evaluation_maturity, scope.evaluation_maturity],
  ];
  for (const [field, recorded, expected] of mirrored) {
    if (recorded !== expected) {
      log.add(
        "derivation",
        8,
        `overall_confidence.${field}`,
        `"${recorded}" contradicts the frozen evaluation scope ("${expected}")`,
      );
    }
  }

  // Build the merged 40-decision map derivation consumes (§14 for bounded work).
  const merged = mergedDecisions(pkg, options, log);
  if (!merged) return;

  const recorded = new Map(
    content.derived_dimensions.map((dimension) => [dimension.dimension_key, dimension]),
  );
  const dimensionKeys = [...DIMENSION_SUBCRITERIA.keys()];
  for (const key of dimensionKeys) {
    if (!recorded.has(key)) {
      log.add("derivation", 8, "derived_dimensions", `no derived result for dimension "${key}"`);
    }
  }

  // §10.3: "The importer recomputes dimension and overall confidence from the
  // stored facts; imported derived labels are never trusted." The overall label
  // is therefore derived from RE-DERIVED dimension results, not from the ones
  // the package recorded — otherwise a package could launder a bad dimension
  // label into a good overall one.
  const rederived: DerivedDimension[] = [];

  for (const dimension of content.derived_dimensions) {
    const at = `derived_dimensions[${dimension.dimension_key}]`;
    const keys = DIMENSION_SUBCRITERIA.get(dimension.dimension_key);
    if (!keys) continue;
    if (keys.some((key) => !merged.has(key))) continue;

    const result = deriveDimension(dimension.dimension_key, merged);
    const fields = dimensionResultFields(result);
    for (const [field, expected] of Object.entries(fields)) {
      const actual = (dimension as unknown as Record<string, unknown>)[field];
      if (actual !== expected) {
        log.add(
          "derivation",
          8,
          `${at}.${field}`,
          `recorded ${JSON.stringify(actual)}, derives to ${JSON.stringify(expected)} (§7.3)`,
        );
      }
    }

    const decisions = keys.map((key) => merged.get(key)!);
    const expectedConfidence = deriveDimensionConfidence(
      result,
      decisions,
      dimension.dimension_scope_state,
    );
    rederived.push({
      ...dimension,
      ...fields,
      dimension_confidence: expectedConfidence,
    });
    if (expectedConfidence !== dimension.dimension_confidence) {
      log.add(
        "derivation",
        8,
        `${at}.dimension_confidence`,
        `recorded "${dimension.dimension_confidence}", derives to "${expectedConfidence}" (§10.2)`,
      );
    }
  }

  const expectedOverall = deriveOverallConfidence(
    rederived.length === content.derived_dimensions.length ? rederived : content.derived_dimensions,
    scope,
  );
  if (expectedOverall !== overall.label) {
    log.add(
      "derivation",
      8,
      "overall_confidence.label",
      `recorded "${overall.label}", derives to "${expectedOverall}" (§10.3)`,
    );
  }

  const expectedStatus = deriveEvidenceStatus(scope, expectedOverall);
  if (expectedStatus !== scope.evidence_status) {
    log.add(
      "derivation",
      8,
      "evaluation_scope.evidence_status",
      `recorded "${scope.evidence_status}", derives to "${expectedStatus}" (§15.2)`,
    );
  }
}

/**
 * The complete 40-decision map derivation reads.
 *
 * For an initial or full package that is simply the final decision set. For a
 * bounded reassessment it is the baseline's finals with the affected set
 * replaced by canonical key, per §14 — which is why the baseline is mandatory
 * rather than optional.
 */
function mergedDecisions(
  pkg: ScoringPackage,
  options: SemanticOptions,
  log: IssueLog,
): Map<string, ScoreDecision> | null {
  const content = pkg.scoring_content;
  const finals = decisionMap(content.adjudication.final_decisions);
  if (content.evaluation_kind !== "reassessment_affected") return finals;

  const baseline = options.baseline;
  if (!baseline) {
    log.add(
      "reassessment",
      9,
      "baseline_package_digest",
      "a bounded reassessment cannot be validated without its immutable baseline package; supply it or reject the package (§14)",
    );
    return null;
  }
  if (baseline.content_digest !== content.baseline_package_digest) {
    log.add(
      "reassessment",
      9,
      "baseline_package_digest",
      `the supplied baseline has digest ${baseline.content_digest}, not the named ${String(content.baseline_package_digest)}`,
    );
    return null;
  }

  const merged = decisionMap(baseline.scoring_content.adjudication.final_decisions);
  for (const [key, decision] of finals) merged.set(key, decision);

  // Re-attested facts are what derivation consumes for carried-forward keys.
  for (const reattestation of content.reassessment_record?.carried_forward_reattestations ?? []) {
    const carried = merged.get(reattestation.subcriterion_key);
    if (!carried) {
      log.add(
        "reassessment",
        9,
        `reassessment_record.carried_forward_reattestations[${reattestation.subcriterion_key}]`,
        "re-attests a key the baseline does not decide",
      );
      continue;
    }
    merged.set(reattestation.subcriterion_key, {
      ...carried,
      confidence_facts: reattestation.confidence_facts,
      subcriterion_confidence: deriveSubcriterionConfidence(
        carried.score_value_kind,
        reattestation.confidence_facts,
      ),
    });
  }
  return merged;
}

/** §15.1(9) — reassessment graph, baseline, disposition, source status. */
function checkReassessment(pkg: ScoringPackage, log: IssueLog): void {
  const content = pkg.scoring_content;
  const record = content.reassessment_record;
  const kind = content.evaluation_kind;

  if (kind === "initial") {
    // The schema already nulls both; nothing semantic remains.
    return;
  }
  if (!record) return;

  const expectedDisposition =
    kind === "reassessment_affected" ? "affected_set_revision" : "full_revision";
  if (record.disposition !== expectedDisposition) {
    log.add(
      "reassessment",
      9,
      "reassessment_record.disposition",
      `evaluation_kind "${kind}" requires disposition "${expectedDisposition}" (§14)`,
    );
  }

  for (const key of record.initial_impact_keys) {
    if (!RUBRIC_SUBCRITERION_KEYS.includes(key)) {
      log.add("reassessment", 9, "reassessment_record.initial_impact_keys", `unknown key "${key}"`);
    }
  }

  const derived = deriveAffectedSet(record.initial_impact_keys);
  const recordedAffected = [...record.affected_set_keys].sort();
  if (recordedAffected.join("|") !== [...derived].sort().join("|")) {
    log.add(
      "reassessment",
      9,
      "reassessment_record.affected_set_keys",
      `affected set does not reproduce from the impact set plus one-hop neighbours (§14); expected ${derived.join(", ")}`,
    );
  }

  if (kind === "reassessment_affected") {
    // "a carried-forward set that is not exactly the affected set's complement
    // ... rejects the package."
    const affected = new Set(record.affected_set_keys);
    const expectedComplement = RUBRIC_SUBCRITERION_KEYS.filter((key) => !affected.has(key));
    const carriedKeys = record.carried_forward_reattestations.map((r) => r.subcriterion_key);
    const uniqueCarried = new Set(carriedKeys);
    if (uniqueCarried.size !== carriedKeys.length) {
      log.add(
        "reassessment",
        9,
        "reassessment_record.carried_forward_reattestations",
        "duplicate carried-forward keys",
      );
    }
    if ([...uniqueCarried].sort().join("|") !== [...expectedComplement].sort().join("|")) {
      log.add(
        "reassessment",
        9,
        "reassessment_record.carried_forward_reattestations",
        "carried-forward set is not exactly the affected set's complement (§14)",
      );
    }
  }

  const sourceIds = new Set(content.corpus.source_manifest.map((source) => source.source_id));
  const statusById = new Map(
    content.corpus.source_manifest.map((source) => [source.source_id, source.record_status]),
  );
  for (const [field, expectedStatus] of [
    ["active_source_ids", "active"],
    ["superseded_source_ids", "superseded"],
  ] as const) {
    for (const sourceId of record[field]) {
      if (!sourceIds.has(sourceId)) {
        log.add("reassessment", 9, `reassessment_record.${field}`, `unresolved source "${sourceId}"`);
        continue;
      }
      if (statusById.get(sourceId) !== expectedStatus) {
        log.add(
          "reassessment",
          9,
          `reassessment_record.${field}`,
          `source "${sourceId}" is recorded as ${String(statusById.get(sourceId))} in the manifest`,
        );
      }
    }
  }
  const overlap = record.active_source_ids.filter((id) => record.superseded_source_ids.includes(id));
  if (overlap.length > 0) {
    log.add(
      "reassessment",
      9,
      "reassessment_record.active_source_ids",
      `sources listed as both active and superseded: ${overlap.join(", ")}`,
    );
  }
}

/** Run the complete §15.1 checklist. Reports; never repairs. */
export function validatePackageSemantics(
  pkg: ScoringPackage,
  options: SemanticOptions = {},
): SemanticResult {
  const log = new IssueLog();
  checkDigestBinding(pkg, log);
  const pairedKeys = checkDecisionSets(pkg, log);
  checkPairInvariants(pkg, log);
  checkReferenceIntegrity(pkg, log);
  checkTierD(pkg, log);
  checkScoreRecords(pkg, log);
  checkCoverageAndTime(pkg, log);
  checkAdjudication(pkg, pairedKeys, log);
  checkDerivation(pkg, options, log);
  checkReassessment(pkg, log);
  return { valid: log.issues.length === 0, issues: log.issues };
}

export class PackageSemanticError extends Error {
  constructor(readonly issues: readonly SemanticIssue[]) {
    super(
      "Scoring package failed Protocol §15.1 semantic validation:\n" +
        issues
          .map((issue) => `  [§15.1(${issue.clause}) ${issue.family}] ${issue.path}: ${issue.message}`)
          .join("\n"),
    );
    this.name = "PackageSemanticError";
  }
}

/** Fail-closed entry point. "Semantic-validator failure rejects the whole package." */
export function assertPackageSemantics(
  pkg: ScoringPackage,
  options: SemanticOptions = {},
): void {
  const result = validatePackageSemantics(pkg, options);
  if (!result.valid) throw new PackageSemanticError(result.issues);
}
