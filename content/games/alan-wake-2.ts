import type { GameWithEvaluation } from "@/lib/profile/types";

/**
 * Profile A — narrative / atmosphere / medium-craft apex, with merely good
 * rather than elite mechanical agency (Round 1 report §4.1).
 *
 * SCORE PROVENANCE: the eight dimension totals are published in the Calibration
 * Round 1 report and are authoritative:
 *   Story 9.5 · Execution 9.0 · Structure 8.5 · Agency 7.5
 *   Pacing 8.0 · Atmosphere 10.0 · Theme 9.5 · Craft 10.0
 * The subcriterion decomposition below is engineering work constrained to
 * reproduce those totals exactly; `tests/calibration.test.ts` enforces it.
 * Primary pull, primary risk and the three interpretation blocks are
 * transcribed from Round 1 §4.1 rather than rewritten.
 */
export const alanWake2: GameWithEvaluation = {
  game: {
    id: "gme_alan_wake_2",
    slug: "alan-wake-2",
    canonicalTitle: "Alan Wake 2",
    summary:
      "A survival-horror sequel in which an FBI agent investigating ritual killings in the Pacific Northwest and a writer trapped inside his own manuscript work the same case from two sides.",
    developerText: "Remedy Entertainment",
    publisherText: "Epic Games Publishing",
    firstReleaseDate: "2023-10-27",
    releaseStatus: "released",
    platforms: [
      { slug: "ps5", name: "PlayStation 5" },
      { slug: "xbox-series", name: "Xbox Series X|S" },
      { slug: "pc", name: "PC" },
    ],
    aliases: ["AW2", "Alan Wake II"],
  },
  // One evaluated experience. The game has no second mode that materially
  // changes what it is to play, so it has no second scope — but the identity is
  // recorded explicitly rather than implied, because a series that acquires a
  // sibling later must not have to be re-identified to get one.
  scope: {
    id: "scp_alan_wake_2_default",
    gameId: "gme_alan_wake_2",
    key: "default",
    label: "Main game",
    summary:
      "The single-player campaign. Night Springs and The Lake House are expansions and are not covered here.",
    displayOrder: 1,
  },
  evaluation: {
    id: "evl_alan_wake_2_v1",
    gameId: "gme_alan_wake_2",
    scopeId: "scp_alan_wake_2_default",
    rubricVersion: "1.0",
    versionNumber: 1,
    scope: {
      edition: "Base game",
      mode: "Single-player campaign",
      platforms: ["PlayStation 5", "Xbox Series X|S", "PC"],
      buildOrPatch: "Current retail build, post-launch updates applied",
    },
    status: "published",
    evidenceStatus: "verified",
    confidence: "high",
    // Execution sits a step lower than the rest: PC and console technical
    // behaviour diverge materially, which Round 1 R6 says should reduce
    // confidence in a platform-agnostic Execution figure.
    dimensionConfidence: {
      story: "high",
      execution: "medium",
      structure: "high",
      agency: "high",
      pacing: "high",
      atmosphere: "high",
      thematic: "high",
      craft: "high",
    },
    evidenceCutoffAt: "2026-08-06",
    releaseContext: "Post-release",
    scoreProvenance: { kind: "calibration", round: "round_1" },
    evidenceLedger: "pending",
    publishedAt: "2026-08-06",
    oneLineExperience:
      "A deliberately slow horror mystery told from two sides at once, where assembling the story is the main act of play and combat is a rationed interruption.",
    primaryPull:
      "A uniquely authored survival-horror experience where audiovisual design, narrative structure and interactivity continually reinforce one another.",
    primaryRisk:
      "Slow investigative movement, backtracking and comparatively modest combat depth can feel heavy to players wanting constant mechanical momentum.",
    platformWarning:
      "PC performance varies sharply with ray-tracing and path-tracing settings. The console versions are the stable reference experience.",
    dimensions: {
      story: {
        story_hook: {
          value: 2,
          rationale:
            "Two investigations — a federal agent working ritual killings and a writer escaping a manuscript that is authoring reality — are legible within minutes and immediately imply each other.",
        },
        character_investment: {
          value: 2,
          rationale:
            "Saga Anderson is a rare thing in horror: a competent professional with a life outside the plot. Wake's self-loathing writerly vanity gives the second half a genuinely different voice rather than a second protagonist skin.",
        },
        narrative_coherence: {
          value: 1.5,
          rationale:
            "The internal rules of the Dark Place are applied consistently, but the game deliberately withholds resolution and ends on an unclosed loop. Coherent at the level it requires, not at the level a viewer wanting closure would want.",
        },
        narrative_momentum: {
          value: 2,
          rationale:
            "Each chapter reframes what the previous one meant, and the two storylines converge rather than merely alternate. Setup and payoff stay proportionate across a long runtime.",
        },
        world_lore_integration: {
          value: 2,
          rationale:
            "Manuscript pages, TV segments, radio and cross-title continuity all feed the central mystery instead of sitting beside it as optional collectible fiction.",
        },
      },
      execution: {
        dramatic_execution: {
          value: 2,
          rationale:
            "Scene construction and performance are exceptional for the medium, and the register shifts — procedural, pulp, musical, comic — are controlled rather than indulgent.",
        },
        gameplay_execution: {
          value: 1.5,
          rationale:
            "Shooting is readable and weighty but intentionally sluggish; enemy tracking and the dodge can feel imprecise in crowded encounters. Implementation is competent, not a strength.",
        },
        technical_stability: {
          value: 2,
          rationale:
            "It shipped in an unusually clean state for its ambition: no significant bug or crash reporting, and stable performance on console. PC is demanding at ray-traced presets, but hardware cost is not the same thing as instability, and the subcriterion measures the latter.",
          platformNote:
            "PS5 / Xbox Series X|S: stable. PC: heavy GPU demand at RT/path-traced settings, so the experience varies by hardware.",
        },
        production_cohesion: {
          value: 2,
          rationale:
            "Art, sound, live action, UI and lighting are unusually unified; the Mind Place and the Writer's Room feel authored by the same hand as the world outside them.",
        },
        consistency: {
          value: 1.5,
          rationale:
            "Quality holds across a long runtime, but the combat encounters in the later Dark Place chapters lean on repetition the rest of the game avoids.",
        },
      },
      structure: {
        structural_intentionality: {
          value: 2,
          rationale:
            "The player-chosen order of the two campaigns is a structural argument, not a convenience: which story you advance changes what the other half means when you return to it.",
        },
        navigation_legibility: {
          value: 1.5,
          rationale:
            "Hub areas are hand-authored and readable, with clear landmarks. The Dark Place intentionally disorients, and a few late routes are harder to parse than the design needs them to be.",
        },
        repetition_control: {
          value: 1.5,
          rationale:
            "Areas are revisited with meaningful transformation rather than re-run, though the Taken encounters themselves recycle a small set of patterns.",
        },
        ux_friction: {
          value: 1.5,
          rationale:
            "The Mind Place and Plot Board are inspired but add navigation steps to routine actions; inventory management is functional but fiddly under pressure.",
        },
        content_focus: {
          value: 2,
          rationale:
            "There is essentially no filler. Optional content — nursery rhymes, cult stashes, coffee thermoses — is short, thematically placed and never gates the campaign.",
        },
      },
      agency: {
        moment_to_moment: {
          value: 1.5,
          rationale:
            "Light-then-shoot combat gives input real consequence, but the character's mobility is deliberately constrained and the margin for reaction is narrow.",
        },
        toolset_depth: {
          value: 1.5,
          rationale:
            "A small arsenal plus flares, flashbangs and the flashlight covers the encounter design, but there is little room for expression or personal approach.",
        },
        reward_rhythm: {
          value: 1.5,
          rationale:
            "The strongest rewards are narrative and investigative — a case-board connection resolving — rather than mechanical. Weapon upgrades are modest and slow.",
        },
        failure_fairness: {
          value: 1.5,
          rationale:
            "Checkpointing is generous and death costs little, though ambushes in tight geometry can feel arbitrary rather than readable.",
        },
        capability_balance: {
          value: 1.5,
          rationale:
            "Resource scarcity is calibrated so the player is pressured but never helpless. The game is a survival horror that lets you fight, not one that removes the option.",
        },
      },
      pacing: {
        opening_effectiveness: {
          value: 1.5,
          rationale:
            "The opening establishes tone and place superbly but takes its time reaching the loop the rest of the game runs on.",
        },
        momentum_maintenance: {
          value: 1.5,
          rationale:
            "Momentum is sustained by escalating revelations, with occasional stalls where an investigation gate requires backtracking for a single item.",
        },
        runtime_justification: {
          value: 2,
          rationale:
            "Roughly 20 hours, and the length is structurally necessary — the dual-campaign design does not work at half the size.",
        },
        session_rhythm: {
          value: 1.5,
          rationale:
            "Chapters make clean stopping points, though the tension design rewards longer uninterrupted sittings than a short-session player can usually give it.",
        },
        content_density: {
          value: 1.5,
          rationale:
            "Very little downtime, but a substantial share of the runtime is walking, reading and looking, which is deliberate rather than dense.",
        },
      },
      atmosphere: {
        sense_of_place: {
          value: 2,
          rationale:
            "Bright Falls, Watery and Cauldron Lake are specific, inhabited and geographically coherent; the Dark Place is a recognisable New York rendered as a recurring nightmare.",
        },
        mood_strength: {
          value: 2,
          rationale:
            "Dread is sustained continuously rather than delivered in shocks, and it survives even the game's comic and musical detours.",
        },
        audiovisual_identity: {
          value: 2,
          rationale:
            "Lighting-as-mechanic, the licensed end-of-chapter songs, Petri Alanko's score and the live-action inserts form a single unmistakable signature.",
        },
        world_coherence: {
          value: 2,
          rationale:
            "The Dark Place operates by stated rules the fiction obeys, and the wider Remedy continuity strengthens rather than clutters it.",
        },
        memory_residue: {
          value: 2,
          rationale:
            "The Oceanview Hotel musical sequence, the talk-show segments and the Watery caravan park are the kind of set pieces players describe to other people years later.",
        },
      },
      thematic: {
        thematic_clarity: {
          value: 2,
          rationale:
            "Authorship, control and the cost of shaping reality by telling stories about it are the explicit subject, not a reading imposed on it.",
        },
        emotional_power: {
          value: 1.5,
          rationale:
            "Saga's family material lands genuinely, though the game's formal cleverness sometimes holds the audience at a slight distance from its feeling.",
        },
        theme_character_integration: {
          value: 2,
          rationale:
            "Wake's writing is the mechanism of the plot; his self-destruction and the manuscript's power are the same fact expressed two ways.",
        },
        philosophical_weight: {
          value: 2,
          rationale:
            "It reaches for the horror of authorship and actually gives it substance — the loop, the doubles and the rewriting all argue the same idea.",
        },
        lasting_impact: {
          value: 2,
          rationale:
            "It became a reference point almost immediately — the game other developers and players cite when arguing about what the medium can do with narrative form. That is durable impact, even where the emotional residue is thinner than the intellectual one.",
        },
      },
      craft: {
        mechanics_meaning: {
          value: 2,
          rationale:
            "The Writer's Room literally makes editing the story into the level design: choosing a scene rewrites the space you then walk through.",
        },
        player_recontextualization: {
          value: 2,
          rationale:
            "Playing the second campaign systematically changes what earlier scenes meant, and the game is built to be re-read rather than merely replayed.",
        },
        interactive_revelation: {
          value: 2,
          rationale:
            "The Case Board makes deduction a player action. Connections are drawn by you, so understanding arrives as something you did rather than something you were told.",
        },
        medium_irreplaceability: {
          value: 2,
          rationale:
            "Converted to film, the central device collapses — the horror depends on the player being the one holding the pen and choosing the order.",
        },
        meaningful_agency: {
          value: 2,
          rationale:
            "The plot is fixed, but the player is made complicit in shaping it: choosing which campaign to advance, which scene to write, which connection to draw. Meaning is produced by the player's ordering of the material rather than by branching outcomes — which is the more interesting use of the medium, not a lesser one.",
        },
      },
    },
    // Transcribed from Calibration Round 1 §4.1.
    blocks: {
      great_fit: [
        "You want ambitious, authored narrative games.",
        "Atmosphere and presentation matter as much as combat.",
        "You enjoy investigation, environmental storytelling and deliberate pacing.",
      ],
      know_before: [
        "Exploration and case-board work consume meaningful time.",
        "Combat is effective but not the main reason the game is exceptional.",
        "The narrative expects attention.",
      ],
      probably_not: [
        "You need fast traversal and constant combat.",
        "Slow-burn mystery feels like friction rather than tension.",
        "Dense metanarrative structures annoy you.",
      ],
    },
    tags: [
      { key: "hub-based" },
      { key: "story-heavy" },
      { key: "environmental-storytelling" },
      { key: "cutscene-heavy" },
      { key: "reading-dense" },
      { key: "exploration-heavy" },
      { key: "puzzle-heavy" },
      { key: "horror" },
      { key: "sustained-tension", intensity: "high" },
      { key: "melancholy" },
      { key: "resource-pressure", intensity: "medium" },
      {
        key: "performance-sensitive",
        note: "PC only; console builds are consistent.",
      },
    ],
    sources: [
      {
        id: "src_aw2_critical_consensus",
        title: "Multiple reputable post-release reviews, October 2023 onward",
        tier: "B",
        category: "critic",
        supports: [
          "story",
          "execution",
          "structure",
          "agency",
          "pacing",
          "atmosphere",
          "thematic",
          "craft",
        ],
        note: "Treated as evidence about execution, structure and pacing rather than as a vote. Individual source records to be populated in the editorial evidence manager.",
      },
      {
        id: "src_aw2_technical_analysis",
        title:
          "Independent technical and performance analyses across PS5, Xbox Series X|S and PC",
        tier: "B",
        category: "technical",
        supports: ["execution"],
        platformScope: ["PlayStation 5", "Xbox Series X|S", "PC"],
        note: "Basis for the Technical Stability subcriterion and the platform performance warning.",
      },
      {
        id: "src_aw2_update_history",
        title: "Developer post-launch update and patch history",
        tier: "C",
        category: "first_party",
        note: "Establishes the current-state build scope. Not used to judge quality.",
      },
    ],
  },
};
