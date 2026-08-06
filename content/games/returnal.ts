import type { GameWithEvaluation } from "@/lib/profile/types";

/**
 * Profile B — agency / execution / craft dominant with repetition and time risk
 * (Round 2 report §13).
 *
 * SCORE PROVENANCE: derived from Rubric v1.0; the Calibration Round 1 report is
 * not present in this repository. Marked for reconciliation.
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
      mode: "Single-player campaign, excluding the co-op Tower of Sisyphus",
      platforms: ["PlayStation 5", "PC"],
      buildOrPatch:
        "Current retail build, including the suspend-cycle and Ascension updates",
    },
    status: "published",
    evidenceStatus: "verified",
    confidence: "high",
    evidenceCutoffAt: "2026-08-06",
    releaseContext: "Post-release",
    scoreProvenance: "derived_pending_round_1_reconciliation",
    provenanceNote:
      "Scores derived from Rubric v1.0 pending reconciliation with the Calibration Round 1 report.",
    publishedAt: "2026-08-06",
    oneLineExperience:
      "A bullet-hell shooter of extraordinary feel bound to a run structure that can take everything back, wrapped in a cryptic story about a woman who cannot stop arriving.",
    primaryPull:
      "Combat and movement of near-reference quality — a speed, clarity and physical precision very few action games reach.",
    primaryRisk:
      "A single run can last hours and end with almost all of it gone. The structure asks for a kind of uninterrupted time many players cannot give it.",
    dimensions: {
      story: {
        story_hook: {
          value: 1.5,
          rationale:
            "The premise lands instantly and is genuinely unsettling, but the game withholds so much so early that the hook is mood rather than stakes.",
        },
        character_investment: {
          value: 1.5,
          rationale:
            "Selene is a strong, well-performed presence and the house sequences give her real interiority, though she remains deliberately opaque for most of the runtime.",
        },
        narrative_coherence: {
          value: 1,
          rationale:
            "The fiction sustains multiple mutually exclusive readings by design. Coherent as a psychological text, but the literal world rules are never settled.",
        },
        narrative_momentum: {
          value: 1,
          rationale:
            "Story arrives in fragments gated behind run progress, so long stretches deliver nothing new, and the payoff is contested rather than proportionate to the setup.",
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
          value: 1.5,
          rationale:
            "Quality holds across all six biomes, though the later biomes reuse encounter grammar more heavily than the early ones.",
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
          value: 1,
          rationale:
            "Early biomes are re-traversed many times, and after a failed late run the mandatory return through familiar rooms is the game's most-cited friction.",
        },
        ux_friction: {
          value: 1.5,
          rationale:
            "The interface is clean and information-dense. The suspend-cycle feature added later helps, but it is a single slot consumed on load rather than a save.",
        },
        content_focus: {
          value: 1,
          rationale:
            "Very little is padding by intent, yet the structure requires replaying cleared content as a matter of course, which produces the effect of padding regardless.",
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
          value: 1.5,
          rationale:
            "Damage is nearly always readable and avoidable — deaths feel earned. What is not proportionate is the cost: a fair death can still cost three hours.",
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
          value: 1,
          rationale:
            "Momentum is repeatedly reset by design. Progress is real across runs, but a lost run returns the player to material already mastered.",
        },
        runtime_justification: {
          value: 1.5,
          rationale:
            "The content justifies a long engagement for a player who bonds with the loop; the same content does not justify the hours spent re-clearing it for a player who does not.",
        },
        session_rhythm: {
          value: 0.5,
          rationale:
            "The game's weakest point. A meaningful run can exceed three hours with no save, and the later suspend feature is one slot, deleted on load. The unit of progress does not fit most people's lives.",
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
          value: 1.5,
          rationale:
            "The house sequences and the sound of the Severed are highly distinctive; the procedural rooms themselves blur together in memory.",
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
          value: 1.5,
          rationale:
            "Selene's inability to stop returning is both the mechanic and the psychology, though the connective tissue between them is left to the player to build.",
        },
        philosophical_weight: {
          value: 1.5,
          rationale:
            "It reaches seriously for guilt, denial and the myth of Sisyphus and gives them real substance, without arriving anywhere conclusive.",
        },
        lasting_impact: {
          value: 1.5,
          rationale:
            "The ending has sustained years of argument, which is itself evidence of residue, though many players remember the feel of playing it over what it meant.",
        },
      },
      craft: {
        mechanics_meaning: {
          value: 2,
          rationale:
            "The death loop is not a metaphor bolted to a roguelike; the compulsion to run again is the game's argument about its protagonist, enacted by the player.",
        },
        player_recontextualization: {
          value: 1.5,
          rationale:
            "Act 3 and the second ending materially change what the earlier runs meant, though the reframing is optional and easily missed.",
        },
        interactive_revelation: {
          value: 1.5,
          rationale:
            "Understanding Atropos is a function of exploring it, and mastery is learned only by doing, though most explicit lore still arrives as text to read.",
        },
        medium_irreplaceability: {
          value: 2,
          rationale:
            "Told passively, the central experience disappears entirely — the point is that you, personally, lost the progress and chose to start again.",
        },
        meaningful_agency: {
          value: 1.5,
          rationale:
            "Build and route choices carry genuine consequence within a run, but they do not alter the story, so the meaning is felt rather than authored.",
        },
      },
    },
    blocks: {
      great_fit: [
        "You want combat that rewards practice, and you will keep playing to get better at it.",
        "You can give the game long uninterrupted sessions.",
        "You enjoy building around whatever weapons and traits a run happens to give you.",
        "You are comfortable with a story that stays deliberately unresolved.",
      ],
      know_before: [
        "A full run can exceed three hours, and the suspend feature is a single slot that is consumed when you resume.",
        "Dying returns you to the start with your permanent upgrades but not your build.",
        "The early biomes are re-traversed many times over the course of the game.",
        "Story is delivered in fragments gated behind progress, not in a continuous thread.",
      ],
      probably_not: [
        "You dislike repeated run failure and replaying sections you have already cleared.",
        "You mostly play in short sessions and need to stop whenever you like.",
        "You want a narrative that explains itself.",
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
        note: "Treated as evidence about execution, structure and pacing rather than as a vote. Individual source records to be populated in the editorial evidence manager.",
      },
      {
        id: "src_returnal_save_discourse",
        title:
          "Documented post-launch player consensus on run length and the absence of mid-run saving",
        tier: "B",
        note: "Primary basis for the Session / Progress Rhythm subcriterion and the Pacing profile.",
      },
      {
        id: "src_returnal_update_history",
        title:
          "Developer update history, including the suspend-cycle and Ascension updates",
        tier: "C",
        note: "Establishes the current-state build scope. Not used to judge quality.",
      },
    ],
  },
};
