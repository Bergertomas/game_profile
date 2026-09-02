import { canonicalDigest } from "@/lib/calibration/canonical-json";
import {
  REQUIRED_FACETS,
  RUBRIC_SUBCRITERION_KEYS,
  DIMENSION_SUBCRITERIA,
  QUERY_FAMILIES,
} from "@/lib/calibration/protocol-tables";
import type {
  Claim,
  ScoreDecision,
  ScoringPackage,
  ScoringPass,
  RunManifest,
} from "@/lib/calibration/package-types";

/**
 * A synthetic, structurally and semantically valid scoring package.
 *
 * Every value here is invented for the harness's own tests. It describes no real
 * game: the scope is a placeholder title, the "sources" are fake locators and no
 * claim paraphrase asserts anything about a product. Nothing in this file is
 * evidence about a calibration game, and nothing in it may be read as one.
 *
 * The builder produces a package that PASSES, and each negative test mutates one
 * field of a fresh copy. That shape matters: a negative test that had to
 * construct its own near-miss could drift from the positive case and quietly
 * stop testing the rule it names.
 */

const DIGEST = "0".repeat(64);
const RETROSPECTIVE_KEYS = ["memory_residue", "lasting_impact"];

/** Sixteen sources: eight independent active A/B clusters, plus context rows. */
function buildSources() {
  const sources = [];
  for (let index = 0; index < 8; index += 1) {
    sources.push({
      source_id: `src-ab-${index + 1}`,
      record_status: "active" as const,
      title: `Placeholder substantive source ${index + 1}`,
      author_creator: `Author ${index + 1}`,
      publisher_channel: `Outlet ${index + 1}`,
      locator: `https://example.invalid/source-${index + 1}`,
      durable_identifier: null,
      publication_date: "2024-03-01",
      accessed_at: "2026-01-05T00:00:00Z",
      source_class: index % 2 === 0 ? "critical_review" : "specialist_creator",
      source_tier: index % 2 === 0 ? ("A" as const) : ("B" as const),
      independence_cluster_id: `cluster-${index + 1}`,
      platform_build_scope: "placeholder platform, launch build",
      play_completion_scope: "full campaign",
      sponsorship_access_disclosure: "none disclosed",
      dependency_note: "original reporting",
      limitations: [],
      player_signal_sampling: null,
      raw_content_digest: null,
      normalized_content_digest: DIGEST,
    });
  }
  // A Tier-D row exists so the Tier-D negative test has something real to point
  // at, and so the cluster count proves it is excluded from the A/B band.
  sources.push({
    source_id: "src-d-1",
    record_status: "active" as const,
    title: "Placeholder watchlist item",
    author_creator: null,
    publisher_channel: null,
    locator: "https://example.invalid/watchlist",
    durable_identifier: null,
    publication_date: "2024-04-01",
    accessed_at: "2026-01-05T00:00:00Z",
    source_class: "player_signal" as const,
    source_tier: "D" as const,
    independence_cluster_id: "cluster-d",
    platform_build_scope: "unclear",
    play_completion_scope: "unclear",
    sponsorship_access_disclosure: "none disclosed",
    dependency_note: "speculative",
    limitations: ["weakly scoped"],
    player_signal_sampling: {
      platform: "placeholder",
      language: "en",
      window_start: "2024-04-01",
      window_end: "2024-05-01",
      query: "placeholder",
      sampling_method: "placeholder",
      sample_size: 50,
      deduplication_method: "placeholder",
      coding_method: "placeholder",
      limitations: [],
    },
    raw_content_digest: null,
    normalized_content_digest: DIGEST,
  });
  return sources;
}

const SOURCES = buildSources();
const AB_SOURCE_IDS = SOURCES.filter((s) => s.source_tier !== "D").map((s) => s.source_id);

function coverageFrames() {
  return RUBRIC_SUBCRITERION_KEYS.map((key) => ({
    coverage_frame_id: `frame-${key}`,
    subcriterion_key: key,
    coverage_units: ["opening", "early", "middle", "late"].map((label, index) => ({
      unit_id: `${key}-u${index + 1}`,
      label,
      unit_class: "temporal_stratum" as const,
      centrality: index === 3 ? ("central" as const) : ("noncentral" as const),
    })),
  }));
}

/**
 * One claim per decision, plus a second independent retrospective claim for the
 * two delayed-effect criteria, whose 1.5 value requires two of them.
 */
function claimsFor(passPrefix: string): Claim[] {
  const claims: Claim[] = [];
  RUBRIC_SUBCRITERION_KEYS.forEach((key, index) => {
    const retrospective = RETROSPECTIVE_KEYS.includes(key);
    const count = retrospective ? 2 : 1;
    for (let n = 0; n < count; n += 1) {
      claims.push({
        claim_id: `${passPrefix}-claim-${key}-${n + 1}`,
        source_id: AB_SOURCE_IDS[(index + n) % AB_SOURCE_IDS.length]!,
        paraphrase: `Placeholder observation ${n + 1} mapped to ${key}.`,
        claim_type: "direct_observation",
        claim_direction: "supports_higher",
        observation_basis: "source_reported",
        subcriterion_key: key,
        scope_platform_build_time: "placeholder platform, launch build, 2024",
        exact_locator: "section 2",
        observed_unit_ids: [`${key}-u1`, `${key}-u2`],
        scorer_inference: null,
        recurrence: "recurring",
        consequence: "material",
        anchor_condition_ids: [`${key}@1.5`],
        corroborating_claim_ids: [],
        contradicting_claim_ids: [],
        limitation: null,
        spoiler: false,
        disposition: "accepted",
        disposition_reason: "admissible and in scope",
        retrospective_time: retrospective
          ? {
              // 2024-03-01 play completion → 2024-09-15 observation = 198 days,
              // clearing the 30-day floor with room to spare.
              retrospective_observation_date: "2024-09-15",
              play_completion_date: "2024-03-01",
              latest_possible_play_date: null,
              elapsed_days_lower_bound: 198,
            }
          : null,
      });
    }
  });
  return claims;
}

const CLEAN_FACTS = {
  coverage_state: "full" as const,
  conflict_state: "none" as const,
  stability_state: "stable" as const,
};

function decisionFor(passPrefix: string, key: string): ScoreDecision {
  const facets = REQUIRED_FACETS.get(key);
  const retrospective = RETROSPECTIVE_KEYS.includes(key);
  const claimIds = retrospective
    ? [`${passPrefix}-claim-${key}-1`, `${passPrefix}-claim-${key}-2`]
    : [`${passPrefix}-claim-${key}-1`];
  return {
    subcriterion_key: key,
    score_value_kind: "numeric",
    numeric_score: 1.5,
    anchor_id: `${key}@1.5`,
    unknown_reason: null,
    missing_coverage_classes: [],
    observed_pattern: `Placeholder observed pattern for ${key}.`,
    lower_anchor_rejection: "The lower adjacent anchor understates the observed pattern.",
    higher_anchor_rejection: "The higher adjacent anchor overstates the observed pattern.",
    internal_rationale: `Placeholder internal rationale for ${key}.`,
    public_rationale: `Placeholder public rationale for ${key} that clears the length floor.`,
    claim_ids: claimIds,
    insufficiency_reference_ids: [],
    counterevidence_disposition: "No material counterevidence survived review.",
    facet_records: facets
      ? facets.map((facetKey) => ({
          facet_key: facetKey,
          score_value_kind: "numeric" as const,
          numeric_score: 1.5 as const,
          unknown_reason: null,
          missing_coverage_classes: [],
          observed_pattern: `Placeholder facet pattern for ${facetKey}.`,
          recurrence: "recurring" as const,
          consequence: "material" as const,
        }))
      : [],
    confidence_facts: CLEAN_FACTS,
    subcriterion_confidence: "High",
    zero_reason: null,
    endpoint_gate: null,
    platform_overrides: [],
  };
}

function runManifest(role: "primary" | "audit" | "research"): RunManifest {
  return {
    run_id: `run-${role}-fixture`,
    role,
    started_at: "2026-01-06T09:00:00Z",
    ended_at: "2026-01-06T09:20:00Z",
    provider: "openai",
    model_label: "gpt-5.6-sol",
    model_snapshot_build_id: "gpt-5.6-sol",
    protocol_version: "1.0",
    rubric_version: "1.0",
    package_schema_version: "1.0-draft",
    system_instructions_digest: DIGEST,
    prompt_template_digest: DIGEST,
    rubric_digest: DIGEST,
    protocol_digest: DIGEST,
    output_schema_digest: DIGEST,
    normalized_packet_digest: DIGEST,
    canonical_source_order: SOURCES.map((source) => source.source_id),
    research_tool_access: role === "research" ? ["web_search"] : [],
    decoding_parameters: [{ name: "reasoning_effort", value: "high" }],
    seed: "parameter_unavailable",
    retry_count: 0,
    validation_failures: [],
    human_corrections: [],
    structured_output_digest: DIGEST,
  };
}

function pass(role: "primary" | "audit"): ScoringPass {
  return {
    run_manifest: runManifest(role),
    claim_ledger: claimsFor(role),
    decisions: RUBRIC_SUBCRITERION_KEYS.map((key) => decisionFor(role, key)),
  };
}

function differences() {
  return RUBRIC_SUBCRITERION_KEYS.map((key) => ({
    difference_id: `diff-${key}`,
    subcriterion_key: key,
    difference_class: "exact" as const,
    primary_value: { score_value_kind: "numeric" as const, numeric_score: 1.5 as const },
    audit_value: { score_value_kind: "numeric" as const, numeric_score: 1.5 as const },
    claim_inclusion_differs: false,
    mapping_differs: false,
    disposition_differs: false,
    confidence_differs: false,
    owner_review_required: false,
    resolution_reason: "Blind exact agreement; nothing to reconcile.",
  }));
}

/** Five subcriteria at 1.5 each → an exact 7.5 total, all-High confidence. */
function derivedDimensions() {
  return [...DIMENSION_SUBCRITERIA.keys()].map((dimensionKey) => ({
    dimension_key: dimensionKey,
    dimension_result_kind: "exact" as const,
    exact_value: 7.5,
    lower_bound: null,
    upper_bound: null,
    dimension_confidence: "High" as const,
    dimension_scope_state: "sound" as const,
  }));
}

/** Build the passing package. Each call returns a fresh deep copy. */
export function buildValidPackage(): ScoringPackage {
  const scoringContent = {
    protocol_version: "1.0",
    rubric_version: "1.0",
    tag_registry_version: "1.0",
    evaluation_kind: "initial" as const,
    baseline_package_digest: null,
    evaluation_scope: {
      canonical_slug: "placeholder-title",
      canonical_title: "Placeholder Title",
      scope_key: "placeholder-title",
      edition: "Standard Edition",
      mode: "single-player campaign",
      included_platforms: ["pc", "console-a"],
      build_cutoff: "patch 1.4",
      release_state: "released" as const,
      pre_release_playable_basis: null,
      evidence_status: "verified" as const,
      evaluation_maturity: "mature" as const,
      public_release_date: "2024-02-01",
      evidence_cutoff: "2026-01-05",
      direct_play: {
        status: "none" as const,
        evaluator: null,
        platform: null,
        build: null,
        started_at: null,
        ended_at: null,
        hours: null,
        covered_segments: [],
      },
      known_exclusions: [],
      profile_stability_state: "stable" as const,
      global_scope_state: "sound" as const,
    },
    corpus: {
      research_run_manifest: runManifest("research"),
      collection_standard: "normal_target" as const,
      collection_reason: "Eight independent substantive clusters met the normal target.",
      query_family_audit: QUERY_FAMILIES.map((family) => ({
        query_family: family,
        disposition: "run" as const,
        reason: "Family was run to saturation.",
      })),
      candidate_source_log: [
        {
          candidate_id: "cand-1",
          query_family: "full_game",
          query_text: "placeholder query",
          service: "placeholder search",
          searched_at: "2026-01-04T00:00:00Z",
          result_position: 1,
          locator: "https://example.invalid/source-1",
          disposition: "accepted" as const,
          reason: "Original full-game assessment in scope.",
        },
      ],
      source_manifest: SOURCES,
      coverage_frames: coverageFrames(),
      raw_packet_digest: DIGEST,
      normalized_packet_digest: DIGEST,
      canonical_source_order: SOURCES.map((source) => source.source_id),
      review_grades_masked: true,
      frozen_at: "2026-01-05T12:00:00Z",
    },
    primary_pass: pass("primary"),
    audit_pass: pass("audit"),
    adjudication: {
      reconciled_claim_record: [],
      differences: differences(),
      final_decisions: RUBRIC_SUBCRITERION_KEYS.map((key) => decisionFor("primary", key)),
    },
    derived_dimensions: derivedDimensions(),
    overall_confidence: {
      label: "High" as const,
      global_scope_state: "sound" as const,
      profile_stability_state: "stable" as const,
      evaluation_maturity: "mature" as const,
    },
    interpretation: {
      one_line_experience: "A placeholder one-line description.",
      primary_pull: "A placeholder primary pull.",
      primary_risk: "A placeholder primary risk.",
      experience_tags: [
        { tag_key: "linear", value_kind: "boolean" as const, intensity: null },
        { tag_key: "grind", value_kind: "intensity" as const, intensity: "low" as const },
      ],
      great_fit_if: ["Placeholder fit one.", "Placeholder fit two."],
      know_before_buying: ["Placeholder caveat one.", "Placeholder caveat two."],
      probably_not_for_you_if: ["Placeholder anti-fit one.", "Placeholder anti-fit two."],
      material_platform_warning: null,
    },
    audit_summary: {
      paired_decision_count: 40,
      numeric_rate_primary: 1,
      numeric_rate_audit: 1,
      exact_count: 40,
      adjacent_count: 0,
      material_count: 0,
      exact_rate: 1,
      exact_or_adjacent_rate: 1,
      confidence_exact_rate: 1,
      endpoint_material_disagreement_count: 0,
      difference_ids: [],
    },
    reassessment_record: null,
  };

  const contentDigest = canonicalDigest(scoringContent as never);

  return {
    package_schema_version: "1.0-draft",
    package_id: "pkg-placeholder-1",
    scoring_content: scoringContent,
    content_digest: contentDigest,
    owner_approval: {
      actor_id: "owner-tomas",
      decided_at: "2026-01-07T10:00:00Z",
      approval_status: "approved",
      approved_digest: contentDigest,
      protocol_version: "1.0",
      rubric_version: "1.0",
      scope_key: "placeholder-title",
      override_reasons: [],
      no_ai_autopublish_attestation: true,
    },
  } as ScoringPackage;
}

/**
 * Deep-clone and mutate, then re-seal the digest so a semantic test exercises
 * the rule it names rather than tripping the digest check first. Tests that
 * target the digest binding itself skip `reseal`.
 */
export function mutate(
  change: (draft: Record<string, unknown>) => void,
  options: { readonly reseal?: boolean } = {},
): ScoringPackage {
  const draft = JSON.parse(JSON.stringify(buildValidPackage())) as Record<string, unknown>;
  change(draft);
  if (options.reseal !== false) {
    const digest = canonicalDigest(draft.scoring_content as never);
    draft.content_digest = digest;
    (draft.owner_approval as Record<string, unknown>).approved_digest = digest;
  }
  return draft as unknown as ScoringPackage;
}

/** A decision from one of the three sets, by key, for targeted mutation. */
export function decisionIn(
  draft: Record<string, unknown>,
  set: "primary_pass" | "audit_pass" | "final",
  key: string,
): Record<string, unknown> {
  const content = draft.scoring_content as Record<string, unknown>;
  const decisions =
    set === "final"
      ? ((content.adjudication as Record<string, unknown>).final_decisions as Record<string, unknown>[])
      : ((content[set] as Record<string, unknown>).decisions as Record<string, unknown>[]);
  const found = decisions.find((decision) => decision.subcriterion_key === key);
  if (!found) throw new Error(`fixture has no ${set} decision for ${key}`);
  return found;
}
