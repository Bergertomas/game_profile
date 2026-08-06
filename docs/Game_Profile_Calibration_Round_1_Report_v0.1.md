# Game Profile — Calibration Round 1 Report v0.1
**Date:** 2026-08-06  
**Rubric tested:** Game Profile Scoring Rubric v0.1  
**Corpus:** 14 games  
**Purpose:** Stress-test the generic public Game Profile model before Claude builds the product around it.

---

# 1. Executive conclusion

**The eight-dimension model survives Round 1.**

The calibration profiles are meaningfully different, including games that conventional aggregate scores often flatten together. The model correctly exposes:

- excellent games with weaker agency or pacing,
- mechanically superb games with repetition/punishment risk,
- survival/simulation games whose value is systemic rather than narrative,
- open-world games where combat quality and content structure diverge,
- remakes where inherited design and modern execution need separate context,
- games whose strongest quality is atmosphere rather than plot or mechanics.

However, Round 1 exposed several **real specification gaps** that should be fixed before implementation.

### Required rubric/product fixes
1. Make **evaluation scope** explicit: campaign/mode, platform, edition/version, evidence cutoff.
2. Clarify that a dimension score is **strength of that offering**, not a universal “good/bad” grade. A low Story score can simply mean “story is not the point.”
3. Do not penalize **markerless / mapless / intentionally demanding navigation** by default.
4. Rename/clarify **Session Flow** so slow simulation and run-based play are judged on appropriate progress rhythm rather than short-session convenience.
5. Treat **technical stability as platform-sensitive** when differences are material.
6. Score a remake as the **current playable experience**, while storing “remake context” separately. Do not award points merely for fidelity.
7. Treat rapidly changing post-launch games as **Provisional** even after release when evidence/patch state is still settling.

### Important calibration limitation
This corpus is intentionally full of distinctive, generally good games. It calibrates **shape** very well but not the bottom of the 0–10 range. Round 2 needs several mediocre/poor-execution anchors.

---

# 2. Score key

Dimensions:

| Key | Dimension |
|---|---|
| ST | Story & Character Investment |
| EX | Execution & Polish |
| SF | Structure & Focus |
| AG | Agency & Satisfaction |
| PA | Pacing & Time Respect |
| AT | Atmosphere & World Pull |
| TH | Thematic & Emotional Impact |
| CR | Medium-Specific Craft |

All scores are calibration drafts in 0.5 increments.

**There is intentionally no overall score.**

---

# 3. Calibration matrix

| Game | Status | ST | EX | SF | AG | PA | AT | TH | CR |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Alan Wake 2 | Verified / High | 9.5 | 9.0 | 8.5 | 7.5 | 8.0 | 10.0 | 9.5 | 10.0 |
| Kingdom Come: Deliverance II | Verified / High | 9.0 | 9.0 | 9.0 | 9.5 | 8.5 | 9.5 | 8.5 | 9.5 |
| Marvel's Spider-Man (2018) | Verified / High | 8.5 | 9.5 | 7.5 | 9.5 | 8.5 | 8.5 | 8.5 | 9.0 |
| Returnal | Verified / High | 7.5 | 9.5 | 8.5 | 10.0 | 7.5 | 9.5 | 8.5 | 10.0 |
| Resident Evil Requiem | Verified / High | 8.5 | 9.5 | 8.5 | 9.0 | 9.5 | 9.5 | 8.0 | 8.5 |
| Clair Obscur: Expedition 33 | Verified / High | 9.5 | 9.0 | 8.5 | 9.5 | 8.5 | 10.0 | 9.5 | 9.5 |
| Alien: Isolation | Verified / High | 7.0 | 8.5 | 6.5 | 6.5 | 6.0 | 10.0 | 7.5 | 9.5 |
| The Long Dark — Survival mode | Verified / Medium | 4.5 | 8.5 | 8.5 | 9.0 | 7.5 | 10.0 | 8.0 | 9.5 |
| Medieval Dynasty — current 2026 state | Verified / Medium | 5.5 | 8.0 | 7.5 | 8.5 | 6.5 | 8.5 | 6.5 | 8.5 |
| Rise of the Ronin | Verified / High | 7.0 | 8.0 | 7.0 | 9.5 | 7.5 | 8.0 | 7.0 | 8.5 |
| Hell is Us | Verified / Medium-High | 7.0 | 7.5 | 6.5 | 7.5 | 6.5 | 9.5 | 8.5 | 8.0 |
| Gothic 1 Remake | Provisional / Medium | 8.0 | 6.5 | 7.5 | 7.5 | 6.5 | 9.0 | 7.5 | 8.5 |
| Beast of Reincarnation | Provisional / Medium | 7.0 | 7.0 | 7.5 | 8.5 | 7.5 | 9.0 | 7.5 | 8.0 |
| Halo: Campaign Evolved | Provisional / Medium-High | 8.0 | 8.5 | 7.5 | 9.5 | 7.5 | 9.0 | 8.0 | 9.5 |

---

# 4. Profile-by-profile calibration notes

## 4.1 Alan Wake 2

**Profile shape:** narrative / atmosphere / medium-craft apex, with merely good rather than elite mechanical agency.

### Primary pull
A uniquely authored survival-horror experience where audiovisual design, narrative structure and interactivity continually reinforce one another.

### Primary risk
Slow investigative movement, backtracking and comparatively modest combat depth can feel heavy to players wanting constant mechanical momentum.

### Great fit if…
- You want ambitious, authored narrative games.
- Atmosphere and presentation matter as much as combat.
- You enjoy investigation, environmental storytelling and deliberate pacing.

### Know before buying…
- Exploration and case-board work consume meaningful time.
- Combat is effective but not the main reason the game is exceptional.
- The narrative expects attention.

### Probably not for you if…
- You need fast traversal and constant combat.
- Slow-burn mystery feels like friction rather than tension.
- Dense metanarrative structures annoy you.

### Calibration lesson
**Excellent proof that Agency and overall excellence must remain separable.** The model does not need to “rescue” a 7.5 Agency score with a cap/bonus system; the profile already communicates the truth.

---

## 4.2 Kingdom Come: Deliverance II

**Profile shape:** exceptionally broad strength across systems, story, immersion and player agency.

### Primary pull
A reactive historical RPG whose world, systems, quests and character story repeatedly interact instead of existing as separate layers.

### Primary risk
Its simulation-heavy rules, deliberate travel, learning curve and large runtime demand commitment.

### Great fit if…
- You want to inhabit a world rather than clear a map.
- Reactive RPG systems and grounded role-play matter.
- Long games are welcome when quests/world remain dense.

### Know before buying…
- The game intentionally makes basic competence something the player earns.
- Some systems remain fiddly or demanding.
- It is enormous.

### Probably not for you if…
- You want frictionless action-RPG immediacy.
- Simulation rules feel like chores.
- You dislike slow character progression.

### Calibration lesson
Confirms that **large open worlds can score highly in both Structure and Pacing**. Size is not bloat.

---

## 4.3 Marvel's Spider-Man (2018)

**Profile shape:** extremely high agency/execution with a weaker open-world-activity layer.

### Primary pull
Near-frictionless embodiment of Spider-Man through traversal, combat and a clean emotional superhero story.

### Primary risk
Optional map activities repeatedly fall back on conventional checklist/open-world design.

### Great fit if…
- Movement itself needs to feel joyful.
- You want polished blockbuster pacing and character warmth.
- Superhero power fantasy plus emotional sincerity appeals.

### Know before buying…
- Side content is notably weaker than the main campaign.
- The open world uses familiar towers, collectibles and repeat crimes.

### Probably not for you if…
- Checklist activities quickly exhaust you.
- You require deep systemic role-playing or consequential choice.

### Calibration lesson
Proves the model does not need philosophical depth to generate a strong profile. **Embodiment, joy and polish are legitimate high-value strengths.**

---

## 4.4 Returnal

**Profile shape:** elite agency / execution / craft, with intentional repetition creating a lower time-respect profile.

### Primary pull
One of the clearest examples of mechanical mastery, audiovisual feedback and death-loop structure reinforcing one another.

### Primary risk
Run failure, repetition and high execution demands are foundational rather than optional.

### Great fit if…
- Learning through repeated failure is satisfying.
- Fast, precise combat is a major purchase driver.
- You enjoy opaque narrative discovery.

### Know before buying…
- Repeating areas is the structure, not filler accidentally left in.
- Narrative is deliberately fragmented.
- Difficulty remains central.

### Probably not for you if…
- Lost run progress feels like wasted time.
- Repeating spaces/enemies rapidly drains motivation.
- You want story momentum independent of mastery.

### Calibration lesson
This is the strongest proof that **a trait can reduce Pacing/Time Respect without being a design failure**. The public UI must never render low scores as red “bad” grades.

---

## 4.5 Resident Evil Requiem

**Profile shape:** very high pacing, execution, agency and atmosphere; slightly less unified thematically because of the deliberate Grace/Leon contrast.

### Primary pull
A tightly choreographed horror-action campaign that offers both vulnerability/puzzle pressure and high-agency Resident Evil combat.

### Primary risk
The tonal/gameplay transition between Grace and Leon can feel like two different Resident Evil philosophies stitched together.

### Great fit if…
- You want survival horror with real pressure valves.
- Focused 10–15 hour campaigns appeal.
- Variety between fear, puzzles and action helps pacing.

### Know before buying…
- Grace and Leon are intentionally different play experiences.
- The later action emphasis may reduce horror intensity.

### Probably not for you if…
- You want one consistent mode of horror throughout.
- Action-heavy Resident Evil is a dealbreaker.

### Calibration lesson
Confirms the value of **Capability Balance** inside Agency: horror can remain frightening while still scoring strongly for player agency.

---

## 4.6 Clair Obscur: Expedition 33

**Profile shape:** unusually strong across narrative, combat agency, atmosphere, emotion and medium craft.

### Primary pull
Turn-based tactical combat made physically participatory through timing/parry systems, wrapped in an emotionally ambitious authored RPG.

### Primary risk
Melodrama, occasional narrative messiness and timing-based defensive execution may repel players who want purely strategic turn-based play.

### Great fit if…
- Story and character emotion are major drivers.
- You want turn-based depth without passive combat.
- Strong art/music identity matters.

### Know before buying…
- Defensive parry timing materially affects combat.
- Exploration is narrower than the visual scope may imply.

### Probably not for you if…
- You dislike turn-based structures even when hybridized.
- Repeated timing inputs inside an RPG annoy you.

### Calibration lesson
Validates separating **Agency** from genre. A turn-based game can score 9.5 for agency.

---

## 4.7 Alien: Isolation

**Profile shape:** atmosphere/craft apex with distinctly lower pacing, structure and direct player power.

### Primary pull
A remarkably authentic Alien world combined with systemic predator AI that makes stealth tension feel reactive rather than scripted.

### Primary risk
The campaign is longer and more repetitive than the core cat-and-mouse loop comfortably supports.

### Great fit if…
- Sustained dread is the point.
- Evasion, observation and improvisation are satisfying forms of play.
- You value source-material authenticity.

### Know before buying…
- Hiding/avoidance is central.
- Save-point and encounter friction can be harsh.
- The campaign repeatedly returns to similar tension patterns.

### Probably not for you if…
- Helplessness exhausts you.
- You want combat to solve the main threat.
- Repeated stealth failure destroys immersion.

### Calibration lesson
A critical success. The profile makes the tradeoff obvious **without declaring the game bad because Agency = 6.5**.

---

## 4.8 The Long Dark — Survival mode

**Profile shape:** weak conventional narrative, extraordinary atmosphere/systemic agency/craft.

### Primary pull
A survival simulation where weather, geography, supplies and player judgment generate the story.

### Primary risk
Slow routine, permanent consequences and long stretches without conventional plot progression are the intended experience.

### Great fit if…
- Emergent stories matter more than scripted stories.
- Resource decisions and route planning are satisfying.
- Solitude and environmental immersion appeal.

### Know before buying…
- Progress can be slow and fragile.
- Survival mode is fundamentally different from Wintermute/Story mode.
- Death may erase a long run.

### Probably not for you if…
- You need authored story beats to create momentum.
- Routine survival maintenance feels like chores.
- Permanent loss is unacceptable.

### Calibration lesson
**This exposed the biggest data-model issue in Round 1:** mode scope must be first-class. “The Long Dark” cannot honestly have one profile covering Survival and Story mode.

---

## 4.9 Medieval Dynasty — current 2026 state

**Profile shape:** strong systemic agency/craft and immersion; modest narrative and deliberately slow pacing.

### Primary pull
A long-form village/survival simulation where accumulating routines gradually become ownership of a living settlement.

### Primary risk
Resource gathering, production chains and progression can cross from meditative routine into grind depending on the player.

### Great fit if…
- Building and maintaining a settlement is intrinsically satisfying.
- Slow, visible long-term progress appeals.
- You enjoy survival without constant combat pressure.

### Know before buying…
- Story mostly supports the simulation rather than carrying the game.
- Combat is secondary.
- Custom settings can radically change friction.

### Probably not for you if…
- Repetitive gathering/crafting reads as filler.
- You need rapid unlock cadence.
- You want a combat-forward medieval RPG.

### Calibration lesson
Pacing must judge **whether repetition earns its place**, not whether repetition exists. Also shows that customization/settings can materially change the profile and may need a “config sensitivity” tag later.

---

## 4.10 Rise of the Ronin

**Profile shape:** elite combat agency embedded in a much more conventional open-world structure.

### Primary pull
Deep, responsive Team Ninja combat with meaningful style/parry expression.

### Primary risk
The surrounding open world and side-content structure are substantially more conventional and repetitive than the combat system.

### Great fit if…
- Combat depth is the main reason you play action RPGs.
- Historical Japan strongly appeals.
- You enjoy build/style experimentation.

### Know before buying…
- Story is functional rather than the primary strength.
- Open-world activities can repeat.
- Combat has a learning curve.

### Probably not for you if…
- You want Ghost of Tsushima-style cinematic focus.
- Checklist open-world structure quickly burns you out.
- Complex parry/combat systems are unwanted.

### Calibration lesson
Excellent evidence that **Agency and Structure must remain separate**. Collapsing them into “Gameplay” would destroy the useful information.

---

## 4.11 Hell is Us

**Profile shape:** atmosphere/theme-forward game whose deliberate navigation philosophy is more compelling than its repetitive combat/content structure.

### Primary pull
A haunting world that trusts observation and memory rather than turning exploration into waypoint-following.

### Primary risk
Enemy variety, repeated combat and some quest/navigation friction can make the systems feel shallower than the world deserves.

### Great fit if…
- You want to pay attention and solve where to go yourself.
- World tone and unsettling thematic material matter.
- Markerless exploration sounds exciting.

### Know before buying…
- The absence of maps/markers is a deliberate design commitment.
- Combat offers tools but limited enemy variety.
- Opinions on the friction are polarized.

### Probably not for you if…
- Getting lost feels like wasted time.
- You expect deep Soulslike build/combat variety.
- Repeated enemy types quickly undermine engagement.

### Calibration lesson
The old Navigation & Readability wording could accidentally score **“no markers” as bad design**. It needs an intent-aware clarification.

---

## 4.12 Gothic 1 Remake

**Profile shape:** strong world/atmosphere and reactivity constrained by technical roughness, old-school friction and uneven pacing.

### Primary pull
A hostile, reactive RPG world that still feels unusually unconcerned with guiding or flattering the player.

### Primary risk
Technical problems, clunky interactions and legacy design friction remain significant even after modernization.

### Great fit if…
- You want an RPG world that expects observation and self-direction.
- NPC/world reactivity matters more than smooth onboarding.
- Deliberate old-school friction is appealing.

### Know before buying…
- Technical quality varies by platform/build.
- Combat and lockpicking remain divisive.
- The second half is less consistently strong.

### Probably not for you if…
- Roughness immediately kills immersion.
- You expect modern objective guidance.
- 30fps/platform-performance limitations are unacceptable.

### Calibration lesson
Confirms **platform scope cannot remain a footnote** when Technical Stability is one-fifth of Execution.

---

## 4.13 Beast of Reincarnation

**Profile shape:** promising combat/atmosphere with uneven encounter, world and technical execution.

**Status:** Provisional because the game is only days old and evidence is still settling.

### Primary pull
Parry-centric sword combat combined with companion-command actions creates a distinct active/support rhythm.

### Primary risk
Regular encounters, limited combat variety, vague worldbuilding and platform performance can fall below the promise of the concept.

### Great fit if…
- Parry-driven action and boss learning are appealing.
- Melancholic post-apocalyptic worlds attract you.
- Companion-assisted combat sounds fresh.

### Know before buying…
- Early reviews disagree on how fully the systems develop.
- Performance differs materially by platform/hardware.
- The storytelling can be intentionally/vaguely delivered.

### Probably not for you if…
- Repeated ordinary combat undermines boss-driven games for you.
- You need highly explicit worldbuilding.
- Technical inconsistency is a dealbreaker.

### Calibration lesson
Validates the confidence system. **A released game can still deserve Provisional status.**

---

## 4.14 Halo: Campaign Evolved

**Profile shape:** superb inherited sandbox agency/craft, strong modern execution, with legacy repetition and modernization tradeoffs.

**Status:** Provisional/Medium-High because it is newly released and PC/console evidence differs.

### Primary pull
Halo CE's unusually durable combat sandbox and enemy AI, modernized without replacing the encounter language that made it special.

### Primary risk
Some inherited repetitive spaces remain, while new cutscenes/visual choices can dilute the original campaign's pacing or tone for some players.

### Great fit if…
- Sandbox FPS combat and reactive enemy AI matter.
- You want a focused campaign rather than an open-world shooter.
- Co-op campaign is valuable.

### Know before buying…
- There is no competitive multiplayer package.
- PC performance/scalability concerns are more significant than on consoles.
- It remains recognizably a 2001 campaign beneath the modernization.

### Probably not for you if…
- Repeated Forerunner/Flood spaces are a hard stop.
- You expect a total structural reinvention.
- A Halo release without PvP feels incomplete.

### Calibration lesson
The profile should score **the 2026 playable campaign**, not award or remove points because changes are “faithful.” Remake fidelity belongs in context, not the eight dimensions.

---

# 5. Cross-game test results

## 5.1 Does the model distinguish “good in different ways”?
**Yes. Strongly.**

Examples:
- Alan Wake 2 and Returnal can both be elite products while their Agency profiles differ materially.
- Alien: Isolation can reach 10 Atmosphere / 9.5 Craft while sitting at 6–6.5 in Pacing/Agency/Structure.
- Medieval Dynasty can be a strong systemic product while Story stays at 5.5.
- Rise of the Ronin separates 9.5 combat agency from 7.0 structure/story.
- Spider-Man shows how joyful embodiment compensates experientially without requiring an explicit score bonus.

This is exactly what the product is supposed to reveal.

---

## 5.2 Are dimensions overlapping too much?

### Story vs Thematic Impact
Some overlap, but it survived.
- A story can be coherent/compelling without being thematically powerful.
- A systemic game can have thematic impact without much authored story.

Keep both.

### Agency vs Medium-Specific Craft
Potential overlap, but Returnal / Expedition 33 / Alien show the distinction works:
- Agency asks whether acting feels meaningful/satisfying.
- Craft asks whether interactivity itself creates meaning/experience impossible to preserve unchanged in passive media.

Keep both, but examples in rubric should emphasize the distinction.

### Structure vs Pacing
This is the closest overlap.
- Structure = organization, information, repetition architecture, UX.
- Pacing = felt use of time and momentum.

Alien and Rise of the Ronin demonstrate why both matter.

Keep both.

---

# 6. Rubric changes approved from Round 1

These should become Scoring Rubric v0.2.

## R1 — Strength, not universal goodness
Add:

> A Game Profile dimension measures the strength/extent of that experiential offering. Low does not automatically mean “bad.” A game that does not meaningfully pursue conventional narrative should receive a low Story & Character Investment score if appropriate; that is useful descriptive information and is not an overall quality penalty.

UI implication:
- never use red/green quality semantics for score bars,
- never display an average overall score.

## R2 — Required evaluation scope
Every evaluation declares:
- product/edition
- game mode/campaign scope
- platform scope
- patch/build/current-state cutoff
- evidence cutoff

## R3 — Mode-specific profiles
If modes materially change the experience, create separate evaluations.
Example:
- The Long Dark — Survival
- The Long Dark — Wintermute

## R4 — Intent-aware navigation
Change Structure subcriterion 2 to:

**Navigation & Information Legibility**  
Does the game provide enough environmental, interface or systemic information for its intended navigation model to be learnable and coherent?

Explicit rule:
- no map, quest marker or compass is not inherently a penalty,
- confused information design is.

## R5 — Session/Progress Rhythm
Rename Pacing subcriterion 4:
- from **Session Flow**
- to **Session / Progress Rhythm**

Judge whether the game creates appropriate, legible progress units for its design.
Do not reward short-session convenience by default.

## R6 — Platform-sensitive execution
Technical Stability may have platform overrides.
If material:
- public profile shows a platform warning,
- global Execution confidence drops,
- evaluation stores platform-specific Technical Stability.

## R7 — Remake context
The eight scores represent the current product.
Store separately:
- remake/remaster/re-release type,
- source game,
- modernization summary,
- inherited-vs-new design note.

Do not score “faithfulness” unless the user is explicitly viewing a remake-comparison feature.

## R8 — Current-state scoring
Profiles score the current patched state at the declared cutoff.
Material changes create a revision, not silent overwrites.

---

# 7. New/adjusted tag candidates from Round 1

Add to controlled vocabulary:

### Navigation / structure
- no-quest-markers
- no-map
- observation-led-navigation
- legacy-structure
- repeated-environments

### Failure / progress
- permadeath
- run-reset
- high-punishment
- save-point-friction
- slow-burn
- long-form-progression

### Narrative
- emergent-narrative
- environmental-storytelling
- fragmented-narrative
- melodramatic

### Combat
- parry-centric
- low-direct-power
- companion-command
- combat-light
- high-combat-depth

### Simulation
- routine-driven
- settlement-management
- resource-management
- configuration-sensitive

### Product/version
- remake
- actively-updated
- platform-sensitive-performance

Do not expose every internal tag publicly. Public taxonomy should remain curated.

---

# 8. Calibration distribution warning

The 14-game corpus has an internal mean of roughly 8.3 across all dimension observations.

Dimension means in this selected set:

- Story: ~7.6
- Execution: ~8.4
- Structure: ~7.8
- Agency: ~8.7
- Pacing: ~7.6
- Atmosphere: ~9.3
- Thematic Impact: ~8.1
- Medium Craft: ~9.0

This does **not** mean the rubric is necessarily inflated. The corpus was selected because these games are interesting, distinctive calibration cases and mostly well-regarded.

But it means we have not calibrated the lower anchors.

---

# 9. Required Round 2

Add 4–6 games chosen specifically for:

1. weak execution despite an interesting premise,
2. genuinely empty/repetitive open-world design,
3. poor story but competent mechanics,
4. technically broken launch/current product,
5. mechanically shallow cinematic game,
6. bland atmosphere/world despite competent production.

The Tomas source model already identifies useful candidates such as:
- Banishers
- Vampyr
- Observer

Those would be good starting points because the original personal model already identified exactly why they failed for Tomas, while the generic rubric now has to determine which problems are personal mismatch and which are broadly observable execution/friction.

Do **not** change score thresholds further until Round 2.

---

# 10. Product decisions after Round 1

### Keep
- eight dimensions,
- 0.5 public increments,
- no aggregate public score,
- three recommendation blocks,
- primary pull/risk,
- evidence confidence,
- controlled tags.

### Change before Claude builds DB
- add evaluation scope fields,
- add mode-specific evaluation support,
- add platform-specific Technical Stability overrides,
- add remake context,
- add current-state/build cutoff.

### Change before Claude designs score UI
- scores must look descriptive, not school grades,
- low bars cannot be automatically red,
- tooltip/methodology must explain “strength, not universal goodness.”

---

# 11. Verdict

**Round 1 passes.**

More importantly, it did what calibration is supposed to do: it found real flaws before engineering encoded them.

The fundamental product thesis remains intact:
> One game profile, many visible dimensions, no single number hiding the tradeoffs.

The next correct move is:
1. incorporate rubric v0.2,
2. run a smaller Round 2 on low/mid anchors,
3. then give Claude three deliberately contrasting completed profiles for the first UI vertical slice.

