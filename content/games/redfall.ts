import type { GameWithEvaluation } from "@/lib/profile/types";

/**
 * Profile C — the lower-range anchor (Round 2 report §8, §13).
 *
 * SCORE PROVENANCE: the eight dimension totals are published in the Calibration
 * Round 2 report and are authoritative:
 *   Story 4.5 · Execution 5.5 · Structure 4.5 · Agency 5.5
 *   Pacing 4.5 · Atmosphere 5.5 · Theme 4.0 · Craft 4.5
 * The subcriterion decomposition below is engineering work, but it is
 * constrained to reproduce those totals exactly. `tests/calibration.test.ts`
 * enforces that constraint.
 *
 * The three interpretation blocks and the primary pull/risk are transcribed
 * from Round 2 §8 rather than rewritten.
 */
export const redfall: GameWithEvaluation = {
  game: {
    id: "gme_redfall",
    slug: "redfall",
    canonicalTitle: "Redfall",
    summary:
      "An open-world first-person shooter set in a Massachusetts island town cut off from the mainland by vampires, playable solo or in co-op with one of four characters.",
    developerText: "Arkane Austin",
    publisherText: "Bethesda Softworks",
    firstReleaseDate: "2023-05-02",
    releaseStatus: "released",
    platforms: [
      { slug: "xbox-series", name: "Xbox Series X|S" },
      { slug: "pc", name: "PC" },
    ],
    aliases: [],
  },
  evaluation: {
    id: "evl_redfall_v1",
    gameId: "gme_redfall",
    rubricVersion: "1.0",
    versionNumber: 1,
    scope: {
      edition: "Base game",
      mode: "Campaign, solo or co-op",
      platforms: ["Xbox Series X|S", "PC"],
      buildOrPatch: "Game Update 4 — the final update",
      currentStateCutoff: "2026-08-06",
    },
    status: "published",
    evidenceStatus: "provisional",
    confidence: "medium",
    // The per-dimension pattern maps the Update 4 evidence gap precisely.
    // Atmosphere was unchanged by the update and is well documented, so it is
    // High. Structure and Pacing are Low because Update 4 revised exactly those
    // systems — Nests, Neighborhoods, offline play, pausing — and almost no
    // full review covers the build that resulted.
    dimensionConfidence: {
      story: "medium",
      execution: "low",
      structure: "low",
      agency: "medium",
      pacing: "low",
      atmosphere: "high",
      thematic: "medium",
      craft: "medium",
    },
    evidenceCutoffAt: "2026-08-06",
    releaseContext: "Post-release, final build",
    scoreProvenance: "calibration_round_2",
    evidenceLedger: "pending",
    publishedAt: "2026-08-06",
    oneLineExperience:
      "An open-world vampire shooter whose town and toolkit are more interesting than anything it asks you to do in them.",
    primaryPull:
      "A visually distinctive vampire-town premise with some enjoyable weapons and abilities, particularly in cooperative play.",
    primaryRisk:
      "The world, shooting, AI, mission structure and systemic interactions rarely generate enough depth or surprise to sustain the premise.",
    changeSummary:
      "Profile scores the final Game Update 4 build, not the 2023 launch build. Confidence is held at Medium because most full critical reviews assessed the earlier state.",
    dimensions: {
      // Round 2 canonical total: 4.5
      story: {
        story_hook: {
          value: 1,
          rationale:
            "A vampire-besieged island town is a serviceable premise, but the game states it rather than dramatising it, and the stakes never sharpen past the opening.",
        },
        character_investment: {
          value: 1,
          rationale:
            "The four heroes have distinct silhouettes and abilities but almost no arc; they comment on events rather than being changed by them.",
        },
        narrative_coherence: {
          value: 1,
          rationale:
            "The plot holds together at a basic level, though the relationship between the cult, the vampire gods and the town's collapse stays underspecified.",
        },
        narrative_momentum: {
          value: 0.5,
          rationale:
            "Story is delivered mostly through static mission briefings and text; long stretches pass with no development, and the finale arrives without adequate build.",
        },
        world_lore_integration: {
          value: 1,
          rationale:
            "Environmental storytelling in the abandoned houses is the strongest narrative material in the game, but it sits beside the plot rather than feeding it.",
        },
      },
      // Round 2 canonical total: 5.5
      execution: {
        dramatic_execution: {
          value: 1,
          rationale:
            "Voice work is competent and occasional lines land, but scene construction is minimal and most exposition is delivered standing still in a safe house.",
        },
        gameplay_execution: {
          value: 1.5,
          rationale:
            "Gunplay itself is reasonable and the ability sets are readable. Enemy AI, pathing and reaction behaviour are the clearest implementation weakness.",
        },
        technical_stability: {
          value: 1,
          rationale:
            "The final build includes the 60fps Performance Mode introduced in Update 2; Update 4 added offline play and pausing, but pop-in, traversal hitching and animation faults remain routine.",
          platformNote:
            "Assessed on Xbox Series X|S and PC at the Game Update 4 build.",
        },
        production_cohesion: {
          value: 1,
          rationale:
            "Art direction and systems design point in different directions: the town is dressed as an immersive sim while the mission and loot layer is a live-service shooter.",
        },
        consistency: {
          value: 1,
          rationale:
            "Quality is uniformly mid rather than uneven — the second district repeats the structure of the first without improving on it.",
        },
      },
      // Round 2 canonical total: 4.5
      structure: {
        structural_intentionality: {
          value: 1,
          rationale:
            "The open-world-plus-safehouse form is a recognisable shape, but it serves neither the co-op shooter nor the immersive-sim instincts the game keeps gesturing at.",
        },
        navigation_legibility: {
          value: 1,
          rationale:
            "The map and objective markers work as intended; the town is legible enough to cross, but rarely gives a reason to prefer one route over another.",
        },
        repetition_control: {
          value: 0.5,
          rationale:
            "Nests and Neighborhood objectives recycle a very small set of layouts and goals, and the game asks the player to run them repeatedly across both districts.",
        },
        ux_friction: {
          value: 1,
          rationale:
            "Menus, inventory and the safe-house loop are functional. Update 4 added offline play and pausing, removing the most severe friction the game shipped with.",
        },
        content_focus: {
          value: 1,
          rationale:
            "A large share of the map is populated with activities that exist to fill it, and clearing them changes little about the experience.",
        },
      },
      // Round 2 canonical total: 5.5
      agency: {
        moment_to_moment: {
          value: 1.5,
          rationale:
            "Shooting, staking and ability use are direct and responsive; the immediate act of fighting is the most competent thing the game does.",
        },
        toolset_depth: {
          value: 1.5,
          rationale:
            "Character abilities, UV weapons and stake launchers offer real variety, and the co-op combinations are where the design comes closest to working.",
        },
        reward_rhythm: {
          value: 1,
          rationale:
            "Loot arrives steadily but is mostly incremental rarity; few drops change how a character is played.",
        },
        failure_fairness: {
          value: 1,
          rationale:
            "Failure is readable and cheap, though this is less a design achievement than a consequence of encounters that rarely threaten a prepared player.",
        },
        capability_balance: {
          value: 0.5,
          rationale:
            "The relationship between capability and pressure collapses: enemy AI is passive enough that player power is rarely tested, so the loop stops generating tension well before the campaign ends.",
        },
      },
      // Round 2 canonical total: 4.5
      pacing: {
        opening_effectiveness: {
          value: 1,
          rationale:
            "The opening establishes the premise and the loop efficiently, but shows the player almost everything the game will do within the first two hours.",
        },
        momentum_maintenance: {
          value: 1,
          rationale:
            "The campaign advances but does not escalate; the second district restates the first at a higher enemy level.",
        },
        runtime_justification: {
          value: 0.5,
          rationale:
            "Roughly 15–20 hours of content built from perhaps four hours of distinct ideas. The runtime is reached through repetition rather than development.",
        },
        session_rhythm: {
          value: 1,
          rationale:
            "Missions and Neighborhood objectives make clean, legible stopping points, and Update 4's pause and offline support finally made short sessions practical.",
        },
        content_density: {
          value: 1,
          rationale:
            "Meaningful encounters are separated by long, quiet traversal across a town with little to find between objectives.",
        },
      },
      // Round 2 canonical total: 5.5
      atmosphere: {
        sense_of_place: {
          value: 1.5,
          rationale:
            "Redfall itself is the game's real achievement — a specific New England town, convincingly emptied, with genuinely eerie interiors.",
        },
        mood_strength: {
          value: 1,
          rationale:
            "The dread the town establishes is undercut constantly by loot markers, respawning enemies and a mission layer that treats the setting as a playground.",
        },
        audiovisual_identity: {
          value: 1.5,
          rationale:
            "The blood-red sky, the frozen sea and the psychic vampire silhouettes are strong, memorable images that most of the game does not live up to.",
        },
        world_coherence: {
          value: 1,
          rationale:
            "The rules of the vampire outbreak are established but applied loosely, and the town's internal logic bends to accommodate the shooter systems.",
        },
        memory_residue: {
          value: 0.5,
          rationale:
            "Beyond the sky and the first walk through an abandoned house, very little of the experience leaves a distinct trace.",
        },
      },
      // Round 2 canonical total: 4.0
      thematic: {
        thematic_clarity: {
          value: 1,
          rationale:
            "Gestures at cult power, wealth and a community abandoned by institutions, but never develops a position on any of them.",
        },
        emotional_power: {
          value: 0.5,
          rationale:
            "The abandoned homes carry a real flicker of loss. Nothing in the authored material builds on it.",
        },
        theme_character_integration: {
          value: 1,
          rationale:
            "The heroes are defined by ability kits rather than by any relationship to what the game is nominally about.",
        },
        philosophical_weight: {
          value: 1,
          rationale:
            "The vampire-as-predatory-elite idea is present and legible but stated rather than examined.",
        },
        lasting_impact: {
          value: 0.5,
          rationale:
            "The game is remembered as a development story rather than for anything it says.",
        },
      },
      // Round 2 canonical total: 4.5
      craft: {
        mechanics_meaning: {
          value: 1,
          rationale:
            "UV light and stakes tie the mechanics to the fiction in an obvious, satisfying way, but that connection is the full extent of the integration.",
        },
        player_recontextualization: {
          value: 0.5,
          rationale:
            "Nothing in the game meaningfully revises what earlier actions meant.",
        },
        interactive_revelation: {
          value: 1,
          rationale:
            "Entering houses and reconstructing what happened to their occupants is genuine interactive discovery, and it is the best-realised idea in the game.",
        },
        medium_irreplaceability: {
          value: 1,
          rationale:
            "Exploring the town yourself matters; almost everything else would survive translation to another medium unchanged.",
        },
        meaningful_agency: {
          value: 1,
          rationale:
            "Approach and loadout choices exist but carry no consequence beyond the current fight.",
        },
      },
    },
    blocks: {
      great_fit: [
        "You specifically want a lightweight vampire co-op shooter.",
        "You are comfortable with repetitive mission structures.",
        "You value atmosphere and theme more than systemic depth.",
      ],
      know_before: [
        "The final update meaningfully improved usability and preservation.",
        "Offline solo play and pausing now exist.",
        "Those changes do not fundamentally redesign the core combat or world.",
      ],
      probably_not: [
        "You expect Dishonored or Prey-style systemic creativity.",
        "Empty-feeling open worlds are a major aversion.",
        "Enemy AI and encounter variety need to carry a shooter for you.",
      ],
    },
    tags: [
      { key: "open-world" },
      { key: "mission-based" },
      { key: "combat-heavy" },
      { key: "exploration-heavy" },
      { key: "co-op-forward" },
      { key: "environmental-storytelling" },
      { key: "horror" },
      { key: "repetition", intensity: "high" },
      { key: "grind", intensity: "medium" },
      { key: "technical-instability", intensity: "low" },
      { key: "power-fantasy" },
    ],
    sources: [
      {
        id: "src_redfall_launch_reviews",
        title: "Multiple reputable reviews of the May 2023 launch build",
        tier: "B",
        category: "critic",
        supports: [
          "story",
          "agency",
          "atmosphere",
          "thematic",
          "craft",
        ],
        note: "Extensive, but assess a build that no longer exists. Linked only to the dimensions Update 4 did not materially change; this mismatch is why overall confidence is held at Medium rather than High.",
      },
      {
        id: "src_redfall_update_2",
        title:
          "Game Update 2 release notes introducing Xbox Performance Mode",
        url: "https://bethesda.net/en-US/news/redfall-game-update-2-release-notes",
        publisher: "Bethesda Softworks",
        publishedAt: "2023-10-06",
        tier: "C",
        category: "first_party",
        note: "Establishes that the Xbox Series X|S 60fps Performance Mode arrived in Update 2, not Update 4. Used for factual update attribution, not for judging technical quality.",
      },
      {
        id: "src_redfall_update_4",
        title:
          "Game Update 4 patch notes and developer communication on the final build",
        tier: "C",
        category: "first_party",
        note: "Establishes the scope of the current build: offline play, pausing, Community Standing, revised Nest and Neighborhood systems. Used for facts about what changed, not for judging how well it works.",
      },
      {
        id: "src_redfall_final_build_reports",
        title: "Post-Update-4 player and press reports on the final build",
        tier: "B",
        category: "player_signal",
        supports: ["execution", "structure", "pacing"],
        note: "Thinner coverage than the launch window, and the sole current-state basis for the three dimensions Update 4 revised — which is why those three carry Low confidence.",
      },
    ],
  },
};
