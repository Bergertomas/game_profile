import type { GameWithEvaluation } from "@/lib/profile/types";

/**
 * Profile B — elite agency / execution / craft, with intentional repetition
 * creating a lower time-respect profile (Round 1 report §4.4).
 *
 * SCORE PROVENANCE: the eight dimension totals are published in the Calibration
 * Round 1 report and are authoritative:
 *   Story 7.5 · Execution 9.5 · Structure 8.5 · Agency 10.0
 *   Pacing 7.5 · Atmosphere 9.5 · Theme 8.5 · Craft 10.0
 *
 * Round 1's calibration lesson governs this profile: "a trait can reduce
 * Pacing/Time Respect without being a design failure", and "repeating areas is
 * the structure, not filler accidentally left in". Structure and Pacing are
 * therefore scored as an intentional, well-executed form that asks a lot of the
 * player's time — not as a game leaking filler. The experience tags and the
 * primary risk carry the warning instead.
 */
export const returnal: GameWithEvaluation = {
  game: {
    id: "gme_returnal",
    slug: "returnal",
    canonicalTitle: "Returnal",
    summary:
      "A third-person roguelike shooter in which a scout crash-lands on a hostile planet and finds that death returns her to the wreck of her own ship, with the world rearranged.",
    developerText: "Housemarque",
    publisherText: "Sony Interactive Entertainment",
    firstReleaseDate: "2021-04-30",
    releaseStatus: "released",
    platforms: [
      { slug: "ps5", name: "PlayStation 5" },
      { slug: "pc", name: "PC" },
    ],
    aliases: [],
  },
  evaluation: {
    id: "evl_returnal_v1",
    gameId: "gme_returnal",
    rubricVersion: "1.0",
    versionNumber: 1,
    scope: {
      edition: "Base game",
      mode:
        "Single-player main-game campaign, excluding co-op and the Tower of Sisyphus",
      platforms: ["PlayStation 5", "PC"],
      buildOrPatch:
        "Current retail build, including the suspend-cycle and Ascension updates",
    },
    status: "published",
    evidenceStatus: "verified",
    confidence: "high",
    // Story and Theme are Medium: the narrative is deliberately ambiguous and
    // credible sources reach genuinely different readings of it. That is
    // evidential disagreement, not a defect, and the profile says so rather
    // than averaging it away.
    dimensionConfidence: {
      story: "medium",
      execution: "high",
      structure: "high",
      agency: "high",
      pacing: "high",
      atmosphere: "high",
      thematic: "medium",
      craft: "high",
    },
    evidenceCutoffAt: "2026-08-06",
    releaseContext: "Post-release",
    scoreProvenance: "calibration_round_1",
    evidenceLedger: "pending",
    publishedAt: "2026-08-06",
    oneLineExperience:
      "A bullet-hell shooter of extraordinary feel bound to a run structure that can take everything back, wrapped in a cryptic story about a woman who cannot stop arriving.",
    primaryPull:
      "One of the clearest examples of mechanical mastery, audiovisual feedback and death-loop structure reinforcing one another.",
    primaryRisk:
      "Run failure, repetition and high execution demands are foundational rather than optional.",
    dimensions: {
      story: {
        story_hook: {
          value: 1.5,
          rationale:
            "The premise lands instantly and is genuinely unsettling, but the game withholds so much so early that the hook is mood rather than stakes.",
        },
        character_investment: {
          value: 2,
          rationale:
            "Selene carries the entire game essentially alone, and Jane Perry's performance sustains a character who is deliberately withholding without ever becoming inert. The house sequences give her a private interior life that recontextualises everything around it.",
        },
        narrative_coherence: {
          value: 1,
          rationale:
            "The fiction sustains multiple mutually exclusive readings by design. Coherent as a psychological text, but the literal world rules are never settled.",
        },
        narrative_momentum: {
          value: 1.5,
          rationale:
            "Story is gated behind run progress, so it advances unevenly — but it does develop, each act reframes the last, and the two endings pay off the setup for a player who reaches them. The payoff is contested, not absent.",
        },
        world_lore_integration: {
          value: 1.5,
          rationale:
            "Scout logs, xeno-glyphs and the ruins carry most of the narrative weight and reward attention, though much of it stays allusive.",
        },
      },
      execution: {
        dramatic_execution: {
          value: 1.5,
          rationale:
            "Sparse but well-judged. Jane Perry's performance and the first-person house sequences are strong; there is simply not much dramatic material to execute.",
        },
        gameplay_execution: {
          value: 2,
          rationale:
            "Aiming, dashing, projectile readability and the alt-fire cadence are close to flawless. Every input arrives exactly when and where it should.",
        },
        technical_stability: {
          value: 2,
          rationale:
            "Locked 60fps on PS5 with no meaningful performance cost; the PC port is well-optimised and the DualSense implementation is a reference case.",
        },
        production_cohesion: {
          value: 2,
          rationale:
            "Audio, haptics, particle work and biome art operate as one system. The feedback loop between what you see, hear and feel in the controller is unusually tight.",
        },
        consistency: {
          value: 2,
          rationale:
            "There is no weak stretch. Combat feel, audio design and encounter construction hold to the same standard across all six biomes and every boss, which is rare in a game built largely from procedural assembly.",
        },
      },
      structure: {
        structural_intentionality: {
          value: 2,
          rationale:
            "The run structure is not a genre habit here — the death loop is the story, and the mechanical reset and the narrative reset are the same event.",
        },
        navigation_legibility: {
          value: 1.5,
          rationale:
            "Room-to-room readability is excellent and the map is clear, but recognising which procedural layout you are in takes practice.",
        },
        repetition_control: {
          value: 1.5,
          rationale:
            "Reuse is the design, and it is handled intelligently: procedural room assembly, escalating enemy sets and permanent unlocks mean a repeated biome is rarely the same run twice. What holds this below exceptional is the mandatory re-traversal of early biomes after a late failure.",
        },
        ux_friction: {
          value: 1.5,
          rationale:
            "The interface is clean and information-dense, and the map communicates a procedural space well. The suspend-cycle feature added later helps but is a single slot consumed on load rather than a save.",
        },
        content_focus: {
          value: 2,
          rationale:
            "Nothing here is padding. Every biome, weapon, parasite and artefact exists to feed the same loop, and the game contains no side content added to inflate its length.",
        },
      },
      agency: {
        moment_to_moment: {
          value: 2,
          rationale:
            "Survival in any given second is unambiguously a function of what the player does. There is almost no gap between intention and outcome.",
        },
        toolset_depth: {
          value: 2,
          rationale:
            "Ten weapon families with rolling traits, alt-fires, parasites, consumables and malignant items produce genuinely different builds run to run.",
        },
        reward_rhythm: {
          value: 2,
          rationale:
            "Weapon proficiency, artefacts and the adrenaline chain deliver reward on several timescales at once, from the individual room to the whole run.",
        },
        failure_fairness: {
          value: 2,
          rationale:
            "Resistance is exemplary here: bullet patterns are readable, damage is nearly always avoidable, and a death is almost always traceable to a specific mistake. The time a death costs is real, but that is a question of time respect, and it is scored there rather than twice.",
        },
        capability_balance: {
          value: 2,
          rationale:
            "Player capability is high enough to meet extreme pressure. The game is punishing, never helpless, and skill growth reliably converts into progress.",
        },
      },
      pacing: {
        opening_effectiveness: {
          value: 1.5,
          rationale:
            "The loop and tone establish quickly, though the first two hours give the player very few tools and read as harder than the game later is.",
        },
        momentum_maintenance: {
          value: 1.5,
          rationale:
            "Momentum is carried by mastery rather than by position: permanent unlocks, new biomes and rising skill mean the experience keeps developing even when a run resets. It stalls when a strong build is lost and the next run opens weak.",
        },
        runtime_justification: {
          value: 2,
          rationale:
            "Roughly 25–30 hours to the credits, and the length is structurally necessary — the loop's argument only lands through accumulated attempts. There is no version of this game at half the size.",
        },
        session_rhythm: {
          value: 1,
          rationale:
            "The run is a legible and appropriate unit of progress for this design, and short-session convenience is not a virtue the rubric rewards by default. What holds this to ordinary is that the unit is unusually long — a meaningful run can exceed three hours, and the suspend feature is one slot deleted on load.",
        },
        content_density: {
          value: 1.5,
          rationale:
            "Almost no downtime within a run — the density inside a session is high, even though the density across the whole experience is diluted by repetition.",
        },
      },
      atmosphere: {
        sense_of_place: {
          value: 2,
          rationale:
            "The six biomes are sharply distinct in silhouette, palette and sound, and Atropos coheres as one hostile planet rather than six themed levels.",
        },
        mood_strength: {
          value: 2,
          rationale:
            "Sustained oppressive dread that never lets up, held together by an alien sound design that stays uncomfortable for the entire runtime.",
        },
        audiovisual_identity: {
          value: 2,
          rationale:
            "Bogdan Chyzhevskyi's score, the bullet-pattern light show and the haptic layer create an identity nothing else looks or feels like.",
        },
        world_coherence: {
          value: 1.5,
          rationale:
            "The xeno-archaeology implies a real culture and history, but the deliberate ambiguity stops the world's rules from ever fully settling.",
        },
        memory_residue: {
          value: 2,
          rationale:
            "The house sequences, the sound of the Severed and the shriek of a biome shifting are among the most distinctive sensory signatures of their console generation, and the haptics give them a physical memory most games cannot leave.",
        },
      },
      thematic: {
        thematic_clarity: {
          value: 1.5,
          rationale:
            "Grief, compulsion and the refusal to accept an outcome are clearly the subject, though the game keeps its reading deliberately unresolved.",
        },
        emotional_power: {
          value: 1.5,
          rationale:
            "The house sequences are genuinely affecting and land harder for being rationed. The material around them is more atmospheric than emotional.",
        },
        theme_character_integration: {
          value: 2,
          rationale:
            "Selene's inability to stop returning is not stated about her — it is the thing the player does, hour after hour. Character, mechanic and theme are the same fact, which is as tight an integration as the medium offers.",
        },
        philosophical_weight: {
          value: 1.5,
          rationale:
            "It reaches seriously for guilt, denial and the myth of Sisyphus and gives them real substance, without arriving anywhere conclusive.",
        },
        lasting_impact: {
          value: 2,
          rationale:
            "Years later the ending is still actively argued over, and the game is routinely cited when people discuss what roguelike structure can mean rather than merely how it plays.",
        },
      },
      craft: {
        mechanics_meaning: {
          value: 2,
          rationale:
            "The death loop is not a metaphor bolted to a roguelike; the compulsion to run again is the game's argument about its protagonist, enacted by the player.",
        },
        player_recontextualization: {
          value: 2,
          rationale:
            "Act 3 and the second ending do not merely add information — they retroactively change what every previous run was, turning a survival story into something considerably worse and sadder.",
        },
        interactive_revelation: {
          value: 2,
          rationale:
            "Atropos can only be understood by being survived. Mastery, the map of the biomes and the meaning of the xeno-glyphs all arrive through doing, and none of it would transmit by being told.",
        },
        medium_irreplaceability: {
          value: 2,
          rationale:
            "Told passively, the central experience disappears entirely — the point is that you, personally, lost the progress and chose to start again.",
        },
        meaningful_agency: {
          value: 2,
          rationale:
            "The consequential choice is not in the build — it is the decision to start again. The player's own compulsion to re-enter the loop is what the story is about, so continuing to play is itself the act that carries the meaning.",
        },
      },
    },
    // Transcribed from Calibration Round 1 §4.4.
    blocks: {
      great_fit: [
        "Learning through repeated failure is satisfying.",
        "Fast, precise combat is a major purchase driver.",
        "You enjoy opaque narrative discovery.",
      ],
      know_before: [
        "Repeating areas is the structure, not filler accidentally left in.",
        "Narrative is deliberately fragmented.",
        "Difficulty remains central.",
      ],
      probably_not: [
        "Lost run progress feels like wasted time.",
        "Repeating spaces or enemies rapidly drains motivation.",
        "You want story momentum independent of mastery.",
      ],
    },
    tags: [
      { key: "run-based" },
      { key: "systemic" },
      { key: "combat-heavy" },
      { key: "buildcraft-heavy" },
      { key: "exploration-heavy" },
      { key: "run-reset" },
      { key: "high-punishment" },
      { key: "difficult-checkpointing" },
      { key: "repetition", intensity: "high" },
      { key: "resource-pressure", intensity: "medium" },
      { key: "horror" },
      { key: "sustained-tension", intensity: "high" },
      { key: "melancholy" },
      { key: "environmental-storytelling" },
      { key: "lore-heavy" },
    ],
    sources: [
      {
        id: "src_returnal_critical_consensus",
        title: "Multiple reputable post-release reviews, April 2021 onward",
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
        id: "src_returnal_save_discourse",
        title:
          "Documented post-launch player consensus on run length and the absence of mid-run saving",
        tier: "B",
        category: "player_signal",
        supports: ["pacing", "structure"],
        note: "Basis for the Session / Progress Rhythm subcriterion. Treated as a signal about how the run length lands in practice, not as a vote on quality.",
      },
      {
        id: "src_returnal_ending_readings",
        title:
          "Specialist and creator analyses of the Act 3 ending and its competing readings",
        tier: "B",
        category: "specialist_creator",
        supports: ["story", "thematic", "craft"],
        note: "Sources disagree substantively about what the ending means. That disagreement is why Story and Theme carry Medium confidence rather than High.",
      },
      {
        id: "src_returnal_update_history",
        title:
          "Developer update history, including the suspend-cycle and Ascension updates",
        url: "https://housemarque.com/news/2022/3/21/returnal-ascension-update",
        publisher: "Housemarque",
        publishedAt: "2022-03-21",
        tier: "C",
        category: "first_party",
        note: "Establishes the current-state build scope: co-op applies to the main game, while the Tower of Sisyphus is a separate single-player endless mode. Not used to judge quality.",
      },
    ],
  },
};
