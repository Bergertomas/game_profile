import { createHash } from "node:crypto";
import { buildD1ResearchRequest } from "@/lib/calibration/d1-research";
import type { D1ResearchRunFacts } from "@/lib/calibration/d1-research";
import type { ModelResearchPass } from "@/lib/calibration/research-pass";

/**
 * Shared synthetic slice-B research fixtures.
 *
 * Every value here is a placeholder: fake domains, no product claims and no
 * grade, badge or ranking label anywhere. It exists to exercise the freeze and
 * the persistence mechanics, and nothing in it is evidence about a calibration
 * game.
 *
 * The fixture states NO content digest anywhere in the model output. That is the
 * point of the transport correction and the reason the earlier fixture hid the
 * defect: it computed `normalized_content_digest` with a local `createHash`,
 * which is exactly the capability a research pass with `web_search` and no
 * hashing tool does not have. `sha256` survives only for tests that assert what
 * the WRAPPER should have derived.
 */

/**
 * A synthetic research output. It describes no real game: every locator is a
 * fake domain and no capture asserts anything about Alan Wake 2 or any other
 * product. It exists to exercise the freeze's mechanics, and nothing in it is
 * evidence about a calibration game.
 */
export const CAPTURE_TEXT = (index: number) =>
  `Placeholder normalized capture number ${index}. It records a concrete observation with no grade, badge or ranking label.`;

/** The expected wrapper-side digest. Never used to build a model output. */
export function sha256(text: string): string {
  return createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");
}

/** Eight independent active A/B clusters — the §4.1 normal AA/AAA target. */
export function buildResearchOutput(
  captureText: (index: number) => string = CAPTURE_TEXT,
): ModelResearchPass {
  const sources = Array.from({ length: 8 }, (_unused, index) => {
    const number = index + 1;
    return {
      source_id: `src-${number}`,
      record_status: "active" as const,
      title: `Placeholder substantive source ${number}`,
      author_creator: `Author ${number}`,
      publisher_channel: `Outlet ${number}`,
      locator: `https://example.invalid/source-${number}`,
      durable_identifier: null,
      publication_date: "2024-03-01",
      accessed_at: "2026-09-04T00:00:00Z",
      source_class: index % 2 === 0 ? "critical_review" : "specialist_creator",
      source_tier: index % 2 === 0 ? ("A" as const) : ("B" as const),
      independence_cluster_id: `cluster-${number}`,
      platform_build_scope: "placeholder platform, current patched build",
      play_completion_scope: "full campaign",
      sponsorship_access_disclosure: "none disclosed",
      dependency_note: "original reporting",
      limitations: [],
      player_signal_sampling: null,
    };
  });

  return {
    collection_standard: "normal_target",
    collection_reason: "Placeholder released scope with ordinary evidence availability.",
    query_family_audit: [
      "title_edition",
      "full_game",
      "platform_technical",
      "late_game_endgame",
      "specialist",
      "major_patches",
      "material_disagreement",
    ].map((family) => ({
      query_family: family,
      disposition: "run" as const,
      reason: "Placeholder family run to saturation.",
    })),
    candidate_source_log: [
      {
        candidate_id: "cand-1",
        query_family: "full_game",
        query_text: "placeholder full game assessment query",
        service: "web_search",
        searched_at: "2026-09-04T00:00:00Z",
        result_position: 1,
        locator: "https://example.invalid/source-1",
        disposition: "accepted" as const,
        reason: "Placeholder acceptance reason.",
      },
      {
        candidate_id: "cand-2",
        query_family: "specialist",
        query_text: "placeholder specialist query",
        service: "web_search",
        searched_at: "2026-09-04T00:00:00Z",
        result_position: 4,
        locator: "https://example.invalid/rejected",
        disposition: "rejected" as const,
        reason: "Placeholder rejection reason under the screening rules.",
      },
    ],
    source_manifest: sources,
    coverage_frames: ["story_hook", "memory_residue"].map((key) => ({
      coverage_frame_id: `frame-${key}`,
      subcriterion_key: key,
      coverage_units: ["opening", "early", "middle", "late"].map((label, index) => ({
        unit_id: `${key}-u${index + 1}`,
        label,
        unit_class: "temporal_stratum" as const,
        centrality: index === 3 ? ("central" as const) : ("noncentral" as const),
        omission_effect:
          index === 3 ? ("materially_limiting" as const) : ("bounding" as const),
      })),
    })),
    source_captures: sources.map((source, index) => ({
      source_id: source.source_id,
      normalized_content: captureText(index + 1),
      raw_content: null,
    })),
    research_completion_report: {
      material_scope_platform_current_state_limitations: "Placeholder limitation note.",
      credible_disagreement_represented: "Placeholder disagreement note.",
      retrospective_evidence_status: "Placeholder dated retrospective coverage note.",
      blocking_concern: null,
    },
  } as ModelResearchPass;
}

export const ELIGIBLE = {
  evaluationMaturity: "mature" as const,
  profileStabilityState: "bounded_change" as const,
  materialProfileShapingChangesInFlight: [] as readonly string[],
};

export const REVIEWED_AT = "2026-09-04T06:00:00Z";

export const FACTS: D1ResearchRunFacts = {
  started_at: "2026-09-04T06:05:00Z",
  ended_at: "2026-09-04T06:12:00Z",
  api_elapsed_ms: 420_000,
  returned_model: "gpt-5.6-sol",
  response_id: "resp_placeholder",
  snapshot_identifier: null,
  token_usage: { input_tokens: 100, output_tokens: 200 },
  attempt: 1,
};

export const FROZEN_AT = "2026-09-04T06:12:30Z";

export function request() {
  return buildD1ResearchRequest({ maturity: ELIGIBLE, reviewedAt: REVIEWED_AT });
}
