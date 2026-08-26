/** Governing launch semantics for deterministic What should I play? discovery. */

export const DISCOVERY_INTENTS = [
  "must_include",
  "prefer",
  "prefer_not",
  "must_exclude",
] as const;

export type DiscoveryIntent = (typeof DISCOVERY_INTENTS)[number];

export const CONSTRAINT_ELIGIBILITY = [
  "factual_hard",
  "classified_hard",
  "soft_by_default",
] as const;

export type ConstraintEligibility =
  (typeof CONSTRAINT_ELIGIBILITY)[number];

export type HardConstraintState =
  | "satisfied"
  | "contradicted"
  | "indeterminate";

export const EXPERIENCE_LEVELS = [
  "low",
  "medium",
  "high",
  "unknown",
  "not_applicable",
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

/**
 * Balanced experience intensities. These describe what play asks of someone,
 * never how good the game is. Keys are durable discovery identities; exact
 * public labels/anchor prose are calibrated on the validation corpus.
 */
export const EXPERIENCE_AXES = [
  { key: "challenge_demand", label: "Challenge demand" },
  { key: "reflex_precision_demand", label: "Reflex & precision demand" },
  { key: "mechanical_complexity", label: "Mechanical complexity" },
  { key: "cognitive_load", label: "Cognitive load" },
  { key: "failure_penalty", label: "Failure penalty" },
  { key: "pressure_tension", label: "Pressure & tension" },
  { key: "repetition_grind", label: "Repetition & grind exposure" },
  { key: "guidance_self_direction", label: "Guidance & self-direction" },
  { key: "narrative_emphasis", label: "Narrative emphasis" },
  { key: "emotional_heaviness", label: "Emotional heaviness" },
  { key: "horror_fright", label: "Horror & fright intensity" },
] as const;

export type ExperienceAxisKey = (typeof EXPERIENCE_AXES)[number]["key"];
