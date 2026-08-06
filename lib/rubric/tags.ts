/**
 * Controlled experience-tag vocabulary (Rubric §10, Plan §6.4).
 *
 * Tags describe what a player must like or tolerate. They are deliberately NOT
 * judgements: "high-punishment" is a fact about the game, not a deduction.
 * Freeform tags are not permitted — editorial consistency is the moat.
 */

export type TagCategory =
  | "structure"
  | "narrative"
  | "play"
  | "friction"
  | "mood"
  | "social"
  | "technical";

export type TagValueType = "boolean" | "intensity";

export type TagIntensity = "low" | "medium" | "high";

export interface TagDefinition {
  readonly key: string;
  readonly label: string;
  readonly category: TagCategory;
  readonly valueType: TagValueType;
  readonly description: string;
}

export const TAG_CATEGORY_LABELS: Readonly<Record<TagCategory, string>> = {
  structure: "Structure",
  narrative: "Narrative",
  play: "Play emphasis",
  friction: "Friction & commitment",
  mood: "Mood & pressure",
  social: "Social",
  technical: "Technical & temporal",
};

const t = (
  key: string,
  label: string,
  category: TagCategory,
  description: string,
  valueType: TagValueType = "boolean",
): TagDefinition => ({ key, label, category, valueType, description });

export const TAGS: readonly TagDefinition[] = [
  // Structure
  t("linear", "Linear", "structure", "A single authored path through the game."),
  t("hub-based", "Hub-based", "structure", "A central hub connects discrete areas."),
  t("open-world", "Open world", "structure", "A large continuous traversable space."),
  t("mission-based", "Mission-based", "structure", "Discrete selectable missions or contracts."),
  t("run-based", "Run-based", "structure", "Progress is organised into attempts that end and restart."),
  t("sandbox", "Sandbox", "structure", "Player-set goals inside a permissive system."),
  t("systemic", "Systemic", "structure", "Interacting systems produce unscripted outcomes."),

  // Narrative
  t("story-heavy", "Story-heavy", "narrative", "Narrative occupies a large share of the runtime."),
  t("dialogue-heavy", "Dialogue-heavy", "narrative", "Substantial conversation and dialogue trees."),
  t("lore-heavy", "Lore-heavy", "narrative", "Depth is carried by documents, history and background material."),
  t("environmental-storytelling", "Environmental storytelling", "narrative", "Story is told through spaces and objects."),
  t("choice-consequence", "Choice & consequence", "narrative", "Player decisions durably alter outcomes."),
  t("cutscene-heavy", "Cutscene-heavy", "narrative", "Frequent non-interactive sequences."),

  // Play emphasis
  t("combat-heavy", "Combat-heavy", "play", "Fighting is the dominant activity."),
  t("stealth-heavy", "Stealth-heavy", "play", "Avoidance and concealment are central."),
  t("exploration-heavy", "Exploration-heavy", "play", "Searching and route-finding are central."),
  t("puzzle-heavy", "Puzzle-heavy", "play", "Discrete problem-solving is central."),
  t("traversal-heavy", "Traversal-heavy", "play", "Movement through space is itself a core pleasure."),
  t("buildcraft-heavy", "Buildcraft-heavy", "play", "Assembling loadouts, builds or structures is central."),
  t("management-heavy", "Management-heavy", "play", "Resource, base or roster management is central."),

  // Friction & commitment
  t("backtracking", "Backtracking", "friction", "Revisiting cleared areas is expected.", "intensity"),
  t("grind", "Grind", "friction", "Repeated low-variety activity gates progress.", "intensity"),
  t("repetition", "Repetition", "friction", "Content structures recur across the runtime.", "intensity"),
  t("run-reset", "Run reset", "friction", "Failure returns the player to a start state."),
  t("high-punishment", "High punishment", "friction", "Failure costs significant time or progress."),
  t("difficult-checkpointing", "Difficult checkpointing", "friction", "Save or restart points are sparse or unforgiving."),
  t("inventory-pressure", "Inventory pressure", "friction", "Carrying capacity forces ongoing decisions.", "intensity"),
  t("resource-pressure", "Resource pressure", "friction", "Scarcity forces ongoing decisions.", "intensity"),
  t("reading-dense", "Reading-dense", "friction", "Substantial text must be read to follow the game."),
  t("complex-onboarding", "Complex onboarding", "friction", "The game takes real effort to learn."),

  // Mood & pressure
  t("horror", "Horror", "mood", "Fear is a designed part of the experience."),
  t("sustained-tension", "Sustained tension", "mood", "Pressure is maintained rather than punctuated.", "intensity"),
  t("helplessness-sections", "Helplessness sections", "mood", "Passages deliberately remove player power."),
  t("power-fantasy", "Power fantasy", "mood", "The player is decisively capable."),
  t("melancholy", "Melancholy", "mood", "A sad or wistful prevailing tone."),
  t("comedic", "Comedic", "mood", "Humour is a deliberate register."),
  t("cozy", "Cozy", "mood", "Low-threat, comfortable play."),

  // Social
  t("co-op-forward", "Co-op forward", "social", "Designed with cooperative play in mind."),
  t("couch-friendly", "Couch friendly", "social", "Supports local shared play."),
  t("multiplayer-dependent", "Multiplayer-dependent", "social", "Requires other players to work as intended."),
  t("pvp-forward", "PvP forward", "social", "Player-versus-player is a primary mode."),

  // Technical & temporal
  t("dated-friction", "Dated friction", "technical", "Conventions that modern players may find awkward.", "intensity"),
  t("technical-instability", "Technical instability", "technical", "Bugs or performance problems affect play.", "intensity"),
  t("performance-sensitive", "Performance sensitive", "technical", "Experience varies materially by hardware or platform."),
] as const;

const TAG_INDEX = new Map(TAGS.map((tag) => [tag.key, tag]));

export function getTag(key: string): TagDefinition {
  const tag = TAG_INDEX.get(key);
  if (!tag) throw new Error(`Unknown experience tag: "${key}"`);
  return tag;
}

export function isTagKey(key: string): boolean {
  return TAG_INDEX.has(key);
}
