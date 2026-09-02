import { RUBRIC_V1 } from "@/lib/rubric";

/**
 * Protocol-owned lookup tables, transcribed from the candidate Scoring Protocol.
 *
 * Every table here is a copy of a table in
 * `docs/Game_Profile_Scoring_Protocol_v1.0_DRAFT.md`, which is a controlled
 * input under the Item 3 byte lock. They are transcribed rather than parsed out
 * of the markdown because the validator must fail on a *silent* protocol edit,
 * and a parser would simply adopt the new text. The controlled-input lock is
 * what catches an intentional edit; these tables are what catch a change in
 * meaning. A protocol amendment must therefore update both.
 */

/** The 40 canonical subcriterion keys, from the rubric registry. */
export const RUBRIC_SUBCRITERION_KEYS: readonly string[] = RUBRIC_V1.dimensions.flatMap(
  (dimension) => dimension.subcriteria.map((subcriterion) => subcriterion.key),
);

/** Dimension key → its five subcriterion keys, in canonical rubric order. */
export const DIMENSION_SUBCRITERIA: ReadonlyMap<string, readonly string[]> = new Map(
  RUBRIC_V1.dimensions.map((dimension) => [
    dimension.key,
    dimension.subcriteria.map((subcriterion) => subcriterion.key),
  ]),
);

/** Protocol §6.1 required-facet rule — the six criteria with two facets each. */
export const REQUIRED_FACETS: ReadonlyMap<string, readonly [string, string]> = new Map([
  ["narrative_momentum", ["development_momentum", "payoff"]],
  ["failure_fairness", ["causality_feedback", "proportionality_recovery"]],
  ["capability_balance", ["capability_counterplay", "pressure_fit"]],
  ["session_rhythm", ["progress_unit_legibility", "closure_resumption_loss"]],
  ["theme_character_integration", [
    "agent_situation_embodiment",
    "thematic_testing_consequence",
  ]],
  ["mechanics_meaning", ["rule_behavior", "meaning_consequence"]],
] as const);

/** Protocol §4.1 collection bands, in independence-cluster units. */
export const COLLECTION_BANDS: ReadonlyMap<
  string,
  { readonly min: number; readonly max: number | null }
> = new Map([
  ["scarcity_floor", { min: 5, max: 7 }],
  ["normal_target", { min: 8, max: 10 }],
  ["expanded_for_complexity", { min: 11, max: null }],
]);

/** Protocol §4.7 predefined query families. All seven, exactly once. */
export const QUERY_FAMILIES: readonly string[] = [
  "title_edition",
  "full_game",
  "platform_technical",
  "late_game_endgame",
  "specialist",
  "major_patches",
  "material_disagreement",
];

/**
 * The two time-dependent criteria of Protocol §6 Step 2, whose numeric values
 * require dated retrospective evidence.
 */
export const RETROSPECTIVE_CRITERIA: readonly string[] = [
  "memory_residue",
  "lasting_impact",
];

/**
 * Protocol §14 reassessment neighbour graph, closed and undirected.
 *
 * The protocol prints each edge once but states "an edge applies from either
 * endpoint even if printed once", so this table is symmetrised at module load
 * rather than trusted to be written symmetrically.
 */
const PRINTED_NEIGHBOURS: readonly (readonly [string, readonly string[]])[] = [
  ["story_hook", ["opening_effectiveness"]],
  ["narrative_momentum", ["momentum_maintenance"]],
  ["repetition_control", ["content_focus", "content_density"]],
  ["content_focus", ["repetition_control", "content_density"]],
  ["content_density", ["repetition_control", "content_focus", "runtime_justification"]],
  ["runtime_justification", ["content_density"]],
  ["gameplay_execution", [
    "technical_stability",
    "ux_friction",
    "failure_fairness",
    "consistency",
  ]],
  ["technical_stability", ["gameplay_execution", "production_cohesion", "consistency"]],
  ["production_cohesion", ["technical_stability", "consistency"]],
  ["consistency", [
    "dramatic_execution",
    "gameplay_execution",
    "technical_stability",
    "production_cohesion",
  ]],
  ["dramatic_execution", ["consistency"]],
  ["navigation_legibility", ["ux_friction"]],
  ["ux_friction", ["navigation_legibility", "gameplay_execution"]],
  ["failure_fairness", ["gameplay_execution", "capability_balance"]],
  ["moment_to_moment", ["toolset_depth", "capability_balance", "meaningful_agency"]],
  ["toolset_depth", ["moment_to_moment", "capability_balance"]],
  ["capability_balance", ["moment_to_moment", "toolset_depth", "failure_fairness"]],
  ["meaningful_agency", ["moment_to_moment"]],
  ["reward_rhythm", ["session_rhythm"]],
  ["session_rhythm", ["reward_rhythm"]],
  ["mood_strength", ["emotional_power", "memory_residue"]],
  ["emotional_power", ["mood_strength", "lasting_impact"]],
  ["memory_residue", ["mood_strength"]],
  ["lasting_impact", ["emotional_power"]],
  ["world_lore_integration", ["world_coherence", "mechanics_meaning"]],
  ["world_coherence", ["world_lore_integration", "mechanics_meaning"]],
  ["mechanics_meaning", [
    "world_lore_integration",
    "world_coherence",
    "player_recontextualization",
    "interactive_revelation",
    "medium_irreplaceability",
  ]],
  ["player_recontextualization", ["mechanics_meaning", "interactive_revelation"]],
  ["interactive_revelation", [
    "mechanics_meaning",
    "player_recontextualization",
    "medium_irreplaceability",
  ]],
  ["medium_irreplaceability", ["mechanics_meaning", "interactive_revelation"]],
];

function symmetrise(): ReadonlyMap<string, ReadonlySet<string>> {
  const graph = new Map<string, Set<string>>();
  const edge = (from: string, to: string) => {
    if (!graph.has(from)) graph.set(from, new Set());
    graph.get(from)!.add(to);
  };
  for (const [key, neighbours] of PRINTED_NEIGHBOURS) {
    for (const neighbour of neighbours) {
      edge(key, neighbour);
      edge(neighbour, key);
    }
  }
  return graph;
}

export const REASSESSMENT_NEIGHBOURS = symmetrise();

/**
 * Protocol §14: the affected set is the initial impact set plus every one-hop
 * neighbour. "Do not expand recursively beyond one hop."
 */
export function deriveAffectedSet(initialImpactKeys: readonly string[]): readonly string[] {
  const affected = new Set<string>(initialImpactKeys);
  for (const key of initialImpactKeys) {
    for (const neighbour of REASSESSMENT_NEIGHBOURS.get(key) ?? []) {
      affected.add(neighbour);
    }
  }
  // Canonical rubric order, so two callers with the same input agree byte-wise.
  return RUBRIC_SUBCRITERION_KEYS.filter((key) => affected.has(key));
}

/**
 * Protocol §14: a full reassessment is required when the impact set reaches
 * eight subcriteria or three dimensions. Reported, not enforced as a rejection
 * on its own — the package's declared `evaluation_kind` is checked against it.
 */
export function requiresFullReassessment(affectedKeys: readonly string[]): boolean {
  if (affectedKeys.length >= 8) return true;
  const dimensions = new Set<string>();
  for (const [dimension, keys] of DIMENSION_SUBCRITERIA) {
    if (affectedKeys.some((key) => keys.includes(key))) dimensions.add(dimension);
  }
  return dimensions.size >= 3;
}
