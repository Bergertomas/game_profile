/**
 * TypeScript shapes for the canonical scoring package.
 *
 * These mirror `docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json`
 * for the benefit of the semantic validator's arithmetic. They are NOT a second
 * contract: the schema is the structural authority and is what actually gates a
 * package (`package-schema.ts`). Nothing here may loosen or extend it, and the
 * semantic validator runs only after structural validation has passed, so these
 * types describe data already proven to fit the schema.
 */

export type ScoreValueKind = "numeric" | "unknown";
export type NumericScore = 0 | 0.5 | 1 | 1.5 | 2;
export type ConfidenceLabel = "High" | "Medium" | "Low";

export type MissingCoverageClass =
  | "temporal_stratum"
  | "progression_state"
  | "core_loop"
  | "mode"
  | "platform"
  | "build"
  | "retrospective_elapsed"
  | "source_scarcity"
  | "unresolved_scope"
  | "material_conflict";

export interface ConfidenceFacts {
  readonly coverage_state: "full" | "bounded" | "materially_limited";
  readonly conflict_state: "none" | "adjacent_resolved" | "material_unresolved";
  readonly stability_state: "stable" | "bounded_change" | "actively_changing" | "unknown";
}

export interface FacetRecord {
  readonly facet_key: string;
  readonly score_value_kind: ScoreValueKind;
  readonly numeric_score: NumericScore | null;
  readonly unknown_reason: string | null;
  readonly missing_coverage_classes: readonly MissingCoverageClass[];
  readonly observed_pattern: string;
  readonly recurrence: string | null;
  readonly consequence: string | null;
}

export interface EndpointGate {
  readonly scope_spanning_claim_ids: readonly string[];
  readonly calibration_reference: string | null;
  readonly intent_genre_check: string;
}

export interface PlatformOverride {
  readonly platform_key: string;
  readonly score_value_kind: ScoreValueKind;
  readonly numeric_score: NumericScore | null;
  readonly anchor_id: string | null;
  readonly unknown_reason: string | null;
  readonly missing_coverage_classes: readonly MissingCoverageClass[];
  readonly insufficiency_reference_ids: readonly string[];
  readonly zero_reason: string | null;
  readonly rationale: string;
  readonly claim_ids: readonly string[];
  readonly confidence_facts: ConfidenceFacts;
  readonly subcriterion_confidence: ConfidenceLabel;
  /** An override carries its own coverage state, so it carries its own record. */
  readonly coverage_observed_unit_ids: readonly string[];
  readonly coverage_missing_unit_ids: readonly string[];
}

export interface ScoreDecision {
  readonly subcriterion_key: string;
  readonly score_value_kind: ScoreValueKind;
  readonly numeric_score: NumericScore | null;
  readonly anchor_id: string | null;
  readonly unknown_reason: string | null;
  readonly missing_coverage_classes: readonly MissingCoverageClass[];
  readonly observed_pattern: string;
  readonly lower_anchor_rejection: string | null;
  readonly higher_anchor_rejection: string | null;
  readonly internal_rationale: string;
  readonly public_rationale: string;
  readonly claim_ids: readonly string[];
  readonly insufficiency_reference_ids: readonly string[];
  readonly counterevidence_disposition: string;
  readonly facet_records: readonly FacetRecord[];
  readonly confidence_facts: ConfidenceFacts;
  readonly subcriterion_confidence: ConfidenceLabel;
  readonly zero_reason: string | null;
  readonly endpoint_gate: EndpointGate | null;
  readonly platform_overrides: readonly PlatformOverride[];
  /** Frame units this decision observed. With the next field, a total partition. */
  readonly coverage_observed_unit_ids: readonly string[];
  /** Frame units this decision missed. Drives coverage-state derivation (§6.1). */
  readonly coverage_missing_unit_ids: readonly string[];
}

export interface RetrospectiveTime {
  readonly retrospective_observation_date: string;
  readonly play_completion_date: string | null;
  readonly latest_possible_play_date: string | null;
  readonly elapsed_days_lower_bound: number;
}

export interface Claim {
  readonly claim_id: string;
  readonly source_id: string;
  readonly paraphrase: string;
  readonly claim_type: "fact" | "direct_observation" | "interpretation" | "player_signal";
  readonly claim_direction: "supports_higher" | "supports_lower" | "mixed_or_context";
  readonly observation_basis: string;
  readonly subcriterion_key: string;
  readonly scope_platform_build_time: string;
  readonly exact_locator: string | null;
  readonly observed_unit_ids: readonly string[];
  readonly scorer_inference: string | null;
  readonly recurrence: string | null;
  readonly consequence: string | null;
  readonly anchor_condition_ids: readonly string[];
  readonly corroborating_claim_ids: readonly string[];
  readonly contradicting_claim_ids: readonly string[];
  readonly limitation: string | null;
  readonly spoiler: boolean;
  readonly disposition: "accepted" | "limited" | "rejected" | "unresolved";
  readonly disposition_reason: string;
  readonly retrospective_time: RetrospectiveTime | null;
}

export interface DecodingParameter {
  readonly name: string;
  readonly value: string | number | boolean | null;
}

export interface RunManifest {
  readonly run_id: string;
  readonly role: string;
  readonly started_at: string;
  readonly ended_at: string;
  readonly provider: string;
  readonly model_label: string;
  readonly model_snapshot_build_id: string;
  readonly protocol_version: string;
  readonly rubric_version: string;
  readonly package_schema_version: string;
  readonly system_instructions_digest: string;
  readonly prompt_template_digest: string | null;
  readonly rubric_digest: string;
  readonly protocol_digest: string;
  readonly output_schema_digest: string | null;
  readonly normalized_packet_digest: string;
  readonly canonical_source_order: readonly string[];
  readonly research_tool_access: readonly string[];
  readonly decoding_parameters: readonly DecodingParameter[];
  readonly seed: number | "parameter_unavailable";
  readonly retry_count: number;
  readonly validation_failures: readonly string[];
  readonly human_corrections: readonly string[];
  readonly structured_output_digest: string;
}

export interface ScoringPass {
  readonly run_manifest: RunManifest;
  readonly claim_ledger: readonly Claim[];
  readonly decisions: readonly ScoreDecision[];
}

export interface CoverageUnit {
  readonly unit_id: string;
  readonly label: string;
  readonly unit_class:
    | "temporal_stratum"
    | "progression_state"
    | "core_loop"
    | "mode"
    | "platform"
    | "build"
    | "optional_endgame";
  readonly centrality: "central" | "noncentral";
  /**
   * The recorded consequence of this unit being unobserved, frozen with the
   * frame (§6.1). Coverage state derives from these; nothing is inferred from
   * `label` or `unit_class`.
   */
  readonly omission_effect: "materially_limiting" | "bounding" | "nonlimiting";
}

export interface CoverageFrame {
  readonly coverage_frame_id: string;
  readonly subcriterion_key: string;
  readonly coverage_units: readonly CoverageUnit[];
}

export interface Source {
  readonly source_id: string;
  readonly record_status: "active" | "superseded";
  readonly source_class: string;
  readonly source_tier: "A" | "B" | "C" | "D";
  readonly independence_cluster_id: string;
  readonly publication_date: string | null;
  readonly accessed_at: string;
  readonly normalized_content_digest: string;
  readonly [key: string]: unknown;
}

export interface CandidateSource {
  readonly candidate_id: string;
  readonly query_family: string;
  readonly disposition: "accepted" | "limited" | "rejected";
  readonly [key: string]: unknown;
}

export interface QueryFamilyAudit {
  readonly query_family: string;
  readonly disposition: "run" | "not_applicable";
  readonly reason: string;
}

export interface Corpus {
  readonly research_run_manifest: RunManifest;
  readonly collection_standard: "scarcity_floor" | "normal_target" | "expanded_for_complexity";
  readonly collection_reason: string;
  readonly query_family_audit: readonly QueryFamilyAudit[];
  readonly candidate_source_log: readonly CandidateSource[];
  readonly source_manifest: readonly Source[];
  readonly coverage_frames: readonly CoverageFrame[];
  readonly raw_packet_digest: string;
  readonly normalized_packet_digest: string;
  readonly canonical_source_order: readonly string[];
  readonly review_grades_masked: boolean;
  readonly frozen_at: string;
}

export interface EvaluationScope {
  readonly canonical_slug: string;
  readonly canonical_title: string;
  readonly scope_key: string;
  readonly edition: string;
  readonly mode: string;
  readonly included_platforms: readonly string[];
  readonly build_cutoff: string;
  readonly release_state: "announced" | "showcased" | "pre_release_playable" | "released";
  readonly pre_release_playable_basis: "hands_on" | "review_code" | null;
  readonly evidence_status: "verified" | "provisional" | "pre_release";
  readonly evaluation_maturity: "pre_release" | "newly_released" | "mature";
  readonly public_release_date: string | null;
  readonly evidence_cutoff: string;
  readonly direct_play: Record<string, unknown>;
  readonly known_exclusions: readonly string[];
  readonly profile_stability_state: "stable" | "bounded_change" | "actively_changing" | "unknown";
  readonly global_scope_state: "sound" | "threatened";
}

export interface CompactScore {
  readonly score_value_kind: ScoreValueKind;
  readonly numeric_score: NumericScore | null;
}

export interface Difference {
  readonly difference_id: string;
  readonly subcriterion_key: string;
  readonly difference_class: "exact" | "adjacent" | "material";
  readonly primary_value: CompactScore;
  readonly audit_value: CompactScore;
  readonly claim_inclusion_differs: boolean;
  readonly mapping_differs: boolean;
  readonly disposition_differs: boolean;
  readonly confidence_differs: boolean;
  readonly owner_review_required: boolean;
  readonly resolution_reason: string;
}

export interface ReconciledClaim {
  readonly reconciled_claim_id: string;
  readonly primary_claim_ids: readonly string[];
  readonly audit_claim_ids: readonly string[];
  readonly resolution: string;
  readonly reason: string;
}

export interface Adjudication {
  readonly reconciled_claim_record: readonly ReconciledClaim[];
  readonly differences: readonly Difference[];
  readonly final_decisions: readonly ScoreDecision[];
}

export interface DerivedDimension {
  readonly dimension_key: string;
  readonly dimension_result_kind: "exact" | "range" | "insufficient";
  readonly exact_value: number | null;
  readonly lower_bound: number | null;
  readonly upper_bound: number | null;
  readonly dimension_confidence: ConfidenceLabel;
  readonly dimension_scope_state: "sound" | "threatened";
}

export interface OverallConfidence {
  readonly label: ConfidenceLabel;
  readonly global_scope_state: "sound" | "threatened";
  readonly profile_stability_state: "stable" | "bounded_change" | "actively_changing" | "unknown";
  readonly evaluation_maturity: "pre_release" | "newly_released" | "mature";
}

export interface ExperienceTag {
  readonly tag_key: string;
  readonly value_kind: "boolean" | "intensity";
  readonly intensity: "low" | "medium" | "high" | null;
}

export interface Interpretation {
  readonly one_line_experience: string;
  readonly primary_pull: string;
  readonly primary_risk: string;
  readonly experience_tags: readonly ExperienceTag[];
  readonly great_fit_if: readonly string[];
  readonly know_before_buying: readonly string[];
  readonly probably_not_for_you_if: readonly string[];
  readonly material_platform_warning: string | null;
}

export interface AuditSummary {
  readonly paired_decision_count: number;
  readonly numeric_rate_primary: number;
  readonly numeric_rate_audit: number;
  readonly exact_count: number;
  readonly adjacent_count: number;
  readonly material_count: number;
  readonly exact_rate: number;
  readonly exact_or_adjacent_rate: number;
  readonly confidence_exact_rate: number;
  readonly endpoint_material_disagreement_count: number;
  readonly difference_ids: readonly string[];
}

export interface CarriedForwardReattestation {
  readonly subcriterion_key: string;
  readonly confidence_facts: ConfidenceFacts;
}

export interface ReassessmentRecord {
  readonly trigger: string;
  readonly checked_at: string;
  readonly disposition: "affected_set_revision" | "full_revision";
  readonly initial_impact_keys: readonly string[];
  readonly affected_set_keys: readonly string[];
  readonly carried_forward_reattestations: readonly CarriedForwardReattestation[];
  readonly active_source_ids: readonly string[];
  readonly superseded_source_ids: readonly string[];
  readonly no_change_reason: null;
}

export interface OwnerOverride {
  readonly subcriterion_key: string;
  readonly selected_value: CompactScore;
  readonly reason: string;
  readonly claim_ids: readonly string[];
}

export interface OwnerApproval {
  readonly actor_id: string;
  readonly decided_at: string;
  readonly approval_status: "draft" | "approved" | "rejected";
  readonly approved_digest: string;
  readonly protocol_version: string;
  readonly rubric_version: string;
  readonly scope_key: string;
  readonly override_reasons: readonly OwnerOverride[];
  readonly no_ai_autopublish_attestation: true;
}

export interface ScoringContent {
  readonly protocol_version: string;
  readonly rubric_version: string;
  readonly tag_registry_version: string;
  readonly evaluation_kind: "initial" | "reassessment_affected" | "reassessment_full";
  readonly baseline_package_digest: string | null;
  readonly evaluation_scope: EvaluationScope;
  readonly corpus: Corpus;
  readonly primary_pass: ScoringPass;
  readonly audit_pass: ScoringPass;
  readonly adjudication: Adjudication;
  readonly derived_dimensions: readonly DerivedDimension[];
  readonly overall_confidence: OverallConfidence;
  readonly interpretation: Interpretation;
  readonly audit_summary: AuditSummary;
  readonly reassessment_record: ReassessmentRecord | null;
}

export interface ScoringPackage {
  readonly package_schema_version: string;
  readonly package_id: string;
  readonly scoring_content: ScoringContent;
  readonly content_digest: string;
  readonly owner_approval: OwnerApproval;
}
