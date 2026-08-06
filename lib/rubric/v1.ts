import type {
  Dimension,
  DimensionKey,
  Rubric,
  ScoreAnchor,
  SubcriterionScore,
} from "./types";

/**
 * Game Profile Scoring Rubric v1.0 — transcribed from
 * docs/Game_Profile_Scoring_Rubric_v1.0.md.
 *
 * LOCKED for initial engineering (Rubric §23, changelog v1.0). Any change to
 * dimension semantics, subcriteria membership, the score scale or derivation
 * requires a new rubric version, not an edit here (Rubric §18).
 */

const dimensions: readonly Dimension[] = [
  {
    key: "story",
    name: "Story & Character Investment",
    axisLabel: ["Story &", "Characters"],
    shortLabel: "Story",
    coreQuestion:
      "How effectively does the game create and sustain narrative/character investment on its own terms?",
    summary:
      "How strongly the game makes you care about what happens and who it happens to.",
    boundary:
      "Not “does the reviewer like this genre?”, not atmosphere by itself, not philosophical depth by itself, and not production value.",
    displayOrder: 1,
    subcriteria: [
      {
        key: "story_hook",
        name: "Story Hook & Stakes",
        description:
          "Does the central situation create a reason to care or continue?",
        displayOrder: 1,
      },
      {
        key: "character_investment",
        name: "Character Investment",
        description:
          "Are central characters legible, compelling, affecting or interesting enough to carry the experience?",
        displayOrder: 2,
      },
      {
        key: "narrative_coherence",
        name: "Narrative Coherence",
        description:
          "Do plot, motivations and world rules hold together at the level the game requires?",
        displayOrder: 3,
      },
      {
        key: "narrative_momentum",
        name: "Narrative Momentum & Payoff",
        description:
          "Does the story develop rather than merely exist? Are setup and payoff proportionate?",
        displayOrder: 4,
      },
      {
        key: "world_lore_integration",
        name: "World/Lore Integration",
        description:
          "Does worldbuilding, lore, continuity or environmental narrative meaningfully strengthen investment?",
        displayOrder: 5,
      },
    ],
  },
  {
    key: "execution",
    name: "Execution & Polish",
    axisLabel: ["Execution", "& Polish"],
    shortLabel: "Execution",
    coreQuestion:
      "How reliably and competently does the finished product deliver what it is trying to do?",
    summary:
      "How well built the thing is — writing, feel, stability and finish, judged against its own intent.",
    boundary:
      "Scores delivered execution, not ambition and not studio reputation. Where platform performance differs materially, Technical Stability carries platform-specific notes.",
    displayOrder: 2,
    subcriteria: [
      {
        key: "dramatic_execution",
        name: "Dramatic/Writing Execution",
        description:
          "Dialogue, scene construction, delivery and dramatic competence relative to the game’s intent.",
        displayOrder: 1,
      },
      {
        key: "gameplay_execution",
        name: "Gameplay Execution",
        description:
          "Responsiveness, clarity, consistency, animation/feedback and implementation quality.",
        displayOrder: 2,
      },
      {
        key: "technical_stability",
        name: "Technical Stability",
        description:
          "Performance, bugs, crashes, streaming/stutter and major technical problems, with platform context where necessary.",
        displayOrder: 3,
      },
      {
        key: "production_cohesion",
        name: "Production Cohesion",
        description:
          "Do art, audio, UX, content and systems feel finished and coherent rather than visibly compromised?",
        displayOrder: 4,
      },
      {
        key: "consistency",
        name: "Consistency",
        description:
          "Does quality hold across the runtime, or do major sections/systems collapse?",
        displayOrder: 5,
      },
    ],
  },
  {
    key: "structure",
    name: "Structure & Focus",
    axisLabel: ["Structure", "& Focus"],
    shortLabel: "Structure",
    coreQuestion:
      "How well is the game’s form organized around its intended experience?",
    summary:
      "How purposefully the game is shaped — and how much of it earns its place.",
    boundary:
      "“Large” is not bad and “small” is not automatically focused. A Soulslike is not penalised for being one. Judge signal-to-noise.",
    displayOrder: 3,
    subcriteria: [
      {
        key: "structural_intentionality",
        name: "Structural Intentionality",
        description:
          "Do linear/open/hub/mission/run structures support the game’s goals?",
        displayOrder: 1,
      },
      {
        key: "navigation_legibility",
        name: "Navigation & Information Legibility",
        description:
          "Does the game provide enough environmental, interface or systemic information for its intended navigation model to be learnable and coherent? Absence of a map or quest marker is not inherently a penalty.",
        displayOrder: 2,
      },
      {
        key: "repetition_control",
        name: "Repetition Control",
        description:
          "Does the structure reuse content intelligently, or lean on filler/repetition beyond its value?",
        displayOrder: 3,
      },
      {
        key: "ux_friction",
        name: "UX / Interaction Friction",
        description:
          "Menus, inventory, traversal, checkpointing, onboarding and interface friction.",
        displayOrder: 4,
      },
      {
        key: "content_focus",
        name: "Content Focus",
        description:
          "How much of the game feels purposeful versus padded, duplicated or obligatory?",
        displayOrder: 5,
      },
    ],
  },
  {
    key: "agency",
    name: "Agency & Satisfaction",
    axisLabel: ["Agency &", "Satisfaction"],
    shortLabel: "Agency",
    coreQuestion:
      "Does the act of playing create meaningful, satisfying action/decision/reward loops?",
    summary:
      "How much your input matters moment to moment, and how satisfying acting on it feels.",
    boundary:
      "High agency does not require power fantasy. A deliberately helpless game can be excellent overall, but its agency score should honestly reflect its design rather than be rescued because the helplessness is intentional.",
    displayOrder: 4,
    subcriteria: [
      {
        key: "moment_to_moment",
        name: "Moment-to-Moment Agency",
        description:
          "Does player input meaningfully influence the immediate situation?",
        displayOrder: 1,
      },
      {
        key: "toolset_depth",
        name: "Toolset / Choice Depth",
        description:
          "Are there interesting tactical, strategic, expressive or systemic options appropriate to the genre?",
        displayOrder: 2,
      },
      {
        key: "reward_rhythm",
        name: "Reward Rhythm",
        description:
          "Does action produce satisfying feedback, progress, discovery, mastery or narrative reward?",
        displayOrder: 3,
      },
      {
        key: "failure_fairness",
        name: "Failure / Friction Fairness",
        description:
          "When the game resists the player, is the resistance readable and proportionate to its design?",
        displayOrder: 4,
      },
      {
        key: "capability_balance",
        name: "Capability Balance",
        description:
          "Does the player have enough capability to engage with the pressure the game creates?",
        displayOrder: 5,
      },
    ],
  },
  {
    key: "pacing",
    name: "Pacing & Time Respect",
    axisLabel: ["Pacing &", "Time"],
    shortLabel: "Pacing",
    coreQuestion: "How well does the game earn the time it asks from the player?",
    summary:
      "Whether the hours it asks for are hours it earns. Long is fine; empty is not.",
    boundary:
      "This does not reward shortness, and short-session convenience is not a default virtue. Slow is fine when rich.",
    displayOrder: 5,
    subcriteria: [
      {
        key: "opening_effectiveness",
        name: "Opening Effectiveness",
        description:
          "How effectively does the game establish its loop, stakes or appeal?",
        displayOrder: 1,
      },
      {
        key: "momentum_maintenance",
        name: "Momentum Maintenance",
        description:
          "Does the experience continue developing or repeatedly stall?",
        displayOrder: 2,
      },
      {
        key: "runtime_justification",
        name: "Runtime Justification",
        description: "Does the amount of content justify the runtime?",
        displayOrder: 3,
      },
      {
        key: "session_rhythm",
        name: "Session / Progress Rhythm",
        description:
          "Does the game create appropriate and legible units of progress for its design, whether those are short missions, long survival days, runs, quests, chapters or gradual simulation growth?",
        displayOrder: 4,
      },
      {
        key: "content_density",
        name: "Content Density",
        description:
          "How much meaningful gameplay/story/discovery exists relative to downtime, chores or filler?",
        displayOrder: 5,
      },
    ],
  },
  {
    key: "atmosphere",
    name: "Atmosphere & World Pull",
    axisLabel: ["Atmosphere", "& World"],
    shortLabel: "Atmosphere",
    coreQuestion:
      "How strongly does the game create a place, mood and sensory identity?",
    summary:
      "How completely it builds a place in your head, and how long that place stays there.",
    boundary: "Graphics fidelity alone does not equal atmosphere.",
    displayOrder: 6,
    subcriteria: [
      {
        key: "sense_of_place",
        name: "Sense of Place",
        description:
          "Do locations feel distinct, grounded and inhabitable?",
        displayOrder: 1,
      },
      {
        key: "mood_strength",
        name: "Mood Strength",
        description:
          "Does the game sustain an intentional emotional/sensory tone?",
        displayOrder: 2,
      },
      {
        key: "audiovisual_identity",
        name: "Audiovisual Identity",
        description: "Art direction, sound, music and audiovisual coherence.",
        displayOrder: 3,
      },
      {
        key: "world_coherence",
        name: "World Coherence / Myth",
        description:
          "Does the world feel like it has rules, history, culture or meaningful internal continuity?",
        displayOrder: 4,
      },
      {
        key: "memory_residue",
        name: "Memory Residue",
        description:
          "Does the world/mood leave distinctive places, sounds, images or sensations in memory?",
        displayOrder: 5,
      },
    ],
  },
  {
    key: "thematic",
    name: "Thematic & Emotional Impact",
    axisLabel: ["Theme &", "Emotion"],
    shortLabel: "Theme",
    coreQuestion:
      "How effectively does the game create emotional or thematic meaning beyond functional plot progression?",
    summary:
      "Whether it means something, and whether the meaning is earned rather than announced.",
    boundary:
      "“On-paper themes” do not automatically score highly. A game containing grief, fatherhood, identity or sacrifice must actually land them through execution. We do not score whether themes match the evaluator’s life.",
    displayOrder: 7,
    subcriteria: [
      {
        key: "thematic_clarity",
        name: "Thematic Clarity",
        description:
          "Does the game meaningfully engage with themes, whether explicitly or implicitly?",
        displayOrder: 1,
      },
      {
        key: "emotional_power",
        name: "Emotional Power",
        description:
          "Do characters/events/systems create genuine emotional response appropriate to the intent?",
        displayOrder: 2,
      },
      {
        key: "theme_character_integration",
        name: "Theme–Character Integration",
        description:
          "Are themes embodied through characters and situations rather than only stated?",
        displayOrder: 3,
      },
      {
        key: "philosophical_weight",
        name: "Philosophical / Mythic Weight",
        description:
          "Where the game reaches for larger ideas, does it give them substance?",
        displayOrder: 4,
      },
      {
        key: "lasting_impact",
        name: "Lasting Impact",
        description:
          "Does the emotional/thematic material continue to resonate after play?",
        displayOrder: 5,
      },
    ],
  },
  {
    key: "craft",
    name: "Medium-Specific Craft",
    axisLabel: ["Medium", "Craft"],
    shortLabel: "Craft",
    coreQuestion:
      "How meaningfully does the game use interactivity itself rather than merely delivering content through a game-shaped container?",
    summary:
      "How much of the experience only works because you are the one playing it.",
    boundary:
      "This is not a general “gameplay quality” category — that is largely Agency and Execution. Most excellent games will not score 10 here.",
    displayOrder: 8,
    subcriteria: [
      {
        key: "mechanics_meaning",
        name: "Mechanics–Meaning Integration",
        description:
          "Do mechanics reinforce narrative, emotion, theme or world?",
        displayOrder: 1,
      },
      {
        key: "player_recontextualization",
        name: "Player Recontextualization",
        description:
          "Does the game meaningfully change the player’s understanding of prior actions/assumptions?",
        displayOrder: 2,
      },
      {
        key: "interactive_revelation",
        name: "Interactive Revelation / Discovery",
        description:
          "Does learning through doing/exploring create value that passive media would lose?",
        displayOrder: 3,
      },
      {
        key: "medium_irreplaceability",
        name: "Medium Irreplaceability",
        description:
          "Would the core experience lose something essential if converted directly into film/TV/prose?",
        displayOrder: 4,
      },
      {
        key: "meaningful_agency",
        name: "Meaningful Agency",
        description:
          "Do player choices/actions create consequences, complicity, expression or meaning?",
        displayOrder: 5,
      },
    ],
  },
] as const;

/**
 * Globally fixed radar axis order, clockwise from twelve o'clock.
 * meaning/world -> interactivity/play -> delivery/time (Rubric §22).
 */
const radarOrder: readonly DimensionKey[] = [
  "story",
  "thematic",
  "atmosphere",
  "craft",
  "agency",
  "execution",
  "structure",
  "pacing",
] as const;

export const RUBRIC_V1: Rubric = {
  version: "1.0",
  lockedAt: "2026-08-06",
  dimensions,
  radarOrder,
};

/** The five permitted subcriterion values and what each one means (Rubric §1). */
export const SUBCRITERION_SCALE: readonly {
  value: SubcriterionScore;
  label: string;
}[] = [
  { value: 0, label: "Notably weak / absent where expected" },
  { value: 0.5, label: "Weak" },
  { value: 1, label: "Competent / mixed / ordinary" },
  { value: 1.5, label: "Strong" },
  { value: 2, label: "Exceptional" },
] as const;

/**
 * Editorial calibration language for dimension totals (Rubric §21).
 * These are internal calibration terms and must NOT be rendered as public
 * school grades or drive good/bad colour semantics.
 */
export const SCORE_ANCHORS: readonly ScoreAnchor[] = [
  {
    min: 9,
    max: 10,
    label: "Exceptional",
    description: "A defining strength; reference-point quality.",
  },
  {
    min: 8,
    max: 8.5,
    label: "Strong",
    description:
      "Clearly above ordinary execution and a meaningful reason to choose the game.",
  },
  {
    min: 7,
    max: 7.5,
    label: "Good / solid",
    description: "Works well with visible limitations.",
  },
  {
    min: 6,
    max: 6.5,
    label: "Mixed / compromised",
    description:
      "Functional but recurring limitations materially affect the experience.",
  },
  {
    min: 5,
    max: 5.5,
    label: "Weak",
    description: "Some value remains, but shortcomings are persistent.",
  },
  {
    min: 3.5,
    max: 4.5,
    label: "Poor / limited",
    description: "Contributes little or is repeatedly undermined.",
  },
  {
    min: 0,
    max: 3,
    label: "Absent / severely deficient",
    description:
      "Reserved for genuinely absent offerings or extreme execution failure. Absence can be intentional.",
  },
] as const;
