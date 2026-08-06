# Game Profile — Master Product & Build Plan v0.6
**Working title:** Game Profile  
**Product owner / final decision maker:** Tomas  
**Product + project orchestration:** ChatGPT  
**Engineering + product design:** Claude  
**Status:** Foundation document for iteration — calibration corpus expanded  
**Date:** 2026-08-06

---

## 0. How to use this document

This is the operating specification for the first public version of the product. It is intentionally more specific than a normal PRD because Claude is both engineer and designer, and because the project should remain buildable by a very small team.

When a conflict appears between:
1. a passing idea from chat,
2. an implementation convenience,
3. this document,

Claude should flag the conflict rather than silently changing product behavior. The current approved document wins until Tomas/ChatGPT changes it.

The companion documents are:
- `Game_Profile_Scoring_Rubric_v0.1.md` — canonical scoring methodology.
- `Game_Profile_Project_Context_v0.1.md` — compact continuity / restart brief.

The first implementation goal is not “a beautiful gaming site.” It is to prove that a consistent multidimensional game profile helps a person decide whether a game is worth their money and time.

---

# 1. Product thesis

## 1.1 The problem

Most game-discovery products answer one of these questions:

- “Is this game generally considered good?”
- “What score did critics/users give it?”
- “What are people playing?”
- “How long is it?”
- “What games are similar?”
- “What did my friends rate it?”

Those are useful, but they do not answer the purchase question particularly well:

> **What kind of experience is this game, where is it strong, where is it demanding, and what kind of player is likely to enjoy or regret buying it?**

A single aggregate score hides this information.

An 87/100 can describe:
- an extraordinarily written but mechanically clumsy RPG,
- a nearly storyless but mechanically perfect action game,
- a punishing Soulslike,
- a tightly paced survival horror game,
- an enormous open-world sandbox.

Those products may all be “87s” while being radically different buying decisions.

## 1.2 Product promise

**Game Profile describes games consistently enough that players can recognize whether the experience fits them.**

Working value proposition:

> **Not just whether a game is good. What kind of good is it?**

Alternative UI copy:
- “Know what you’re buying.”
- “See the shape of the game.”
- “Find the game that fits the way you play.”

Do not brand-lock any slogan yet.

## 1.3 Core product principle

The public product does **not** start by predicting a universal “fit score.”

It publishes a standardized multidimensional profile:
- the same categories,
- the same scoring rules,
- transparent confidence,
- concise fit/warning guidance.

The player makes the judgment.

Later, once user preferences exist, the exact same game data can power a **personal match score** without changing the editorial foundation.

## 1.4 Why this is different

The moat is not the existence of ratings. It is:

1. **A stable rubric**
2. **Multidimensional comparability**
3. **Purchase-oriented interpretation**
4. **Evidence/confidence separation**
5. **Consistent editorial language**
6. **Eventually: personalization derived from the profile rather than replacing it**

The product should feel closer to a “nutrition label for games” than a conventional review score.

---

# 2. Source-model inheritance

The product grows out of Tomas Game Fit Score v1.2, but it must not simply publish Tomas’s personal gates.

The source model gives us several powerful structures:

- eight dimensions instead of one score,
- 0–2 subcriteria,
- strong emphasis on execution rather than premise,
- agency as a separate concern,
- pacing/time-respect as a first-class dimension,
- atmosphere/world pull,
- medium-specific craft,
- explicit risk flags,
- primary pull / primary risk,
- separation of recommendation tags from the score,
- calibration against known games,
- warning against overrating games because themes look good “on paper.”

What must be removed or generalized:
- Tomas-specific camera preferences,
- Tomas-specific genre preferences,
- Pacific Northwest bonuses,
- franchise-history bonuses,
- personal archetype bonuses,
- personal thematic resonance,
- Tomas-specific horror-pressure caps,
- personal time availability,
- “Anchor research value,”
- buy thresholds that depend on Tomas’s taste.

Public-product transformation:
- **personal fit → descriptive quality/profile**
- **personal caps → experience tags/warnings**
- **personal resonance → thematic/emotional impact**
- **form compatibility → structure, UX and friction**
- **weighted total → no public total at MVP**

---

# 3. Product goals and non-goals

## 3.1 MVP goals

The first public release must let a user:

1. Search for a game.
2. Open a game profile.
3. Understand its key strengths in under 15 seconds.
4. Understand its principal risks/frictions in under 30 seconds.
5. See all standardized dimension scores.
6. Understand what each dimension means.
7. See whether the profile is based on full post-release evidence or pre-release evidence.
8. Compare two or more relevant games before purchase.
9. Filter/discover games based on dimensions and experience traits.
10. Trust that scores follow a visible methodology.

## 3.2 Business/product validation goals

We want evidence for three hypotheses:

### H1 — Profile usefulness
Users find the multidimensional profile more useful for purchase decisions than a single critic score.

### H2 — Risk guidance
“Know before buying” / “probably not for you if” blocks materially help users avoid mismatch.

### H3 — Comparison value
Users facing multiple releases use side-by-side profiles to narrow choices.

## 3.3 Non-goals for MVP

Do **not** build:
- native iOS/Android apps,
- public user accounts,
- user reviews,
- comments,
- social following,
- activity feeds,
- public list creation,
- AI chatbot,
- personalized recommendation onboarding,
- recommendation ML,
- storefront checkout,
- price tracking,
- deal alerts,
- achievements,
- game diary/backlog tracking,
- community moderation,
- wiki-scale game metadata editing,
- automatic web scraping of review text,
- a public aggregate “Game Profile score.”

All are potential later layers. None are prerequisites for proving the core.

---

# 4. Target users and jobs-to-be-done

## 4.1 Primary target

A player who:
- buys several games per year,
- has limited time and/or budget,
- follows major releases,
- understands that “good” and “for me” are different,
- does not want to read 15 reviews before deciding.

## 4.2 Secondary target

A more engaged enthusiast comparing several games in a crowded release period.

## 4.3 Later target

A user who wants personalization and is willing to state preferences or import play history.

## 4.4 Core jobs

### JTBD 1 — Purchase triage
“When several good games release close together, help me decide which one is most likely to suit what I want.”

### JTBD 2 — Risk detection
“Tell me the thing reviews may praise but I personally might hate.”

### JTBD 3 — Experience expectation
“Before I buy, tell me what spending 15–50 hours inside this game actually feels like.”

### JTBD 4 — Fast research
“Give me a credible picture without making me watch multiple hour-long reviews.”

---

# 5. Information architecture

## 5.1 Public routes

### `/`
Home
- global search
- featured upcoming/recent profiles
- “compare this month’s major releases”
- methodology teaser
- optional curated collections

### `/games/[slug]`
Canonical game profile page.

### `/discover`
Filterable catalog.
Initial filters:
- platform
- release status
- genre/form
- eight dimension thresholds
- runtime band if known
- warning/experience tags
- confidence
- release year

### `/compare`
Side-by-side comparison.
MVP target: 2–4 games.

### `/methodology`
Rubric and confidence model.
Critical for trust.

### `/about`
What Game Profile is / is not.

## 5.2 Private routes

### `/admin`
Dashboard:
- draft profiles
- upcoming games
- stale/review-needed profiles
- recently published

### `/admin/games/new`
Create/import game metadata.

### `/admin/games/[id]`
Edit metadata.

### `/admin/evaluations/[id]`
Score, source, preview and publish a profile.

---

# 6. Game profile page — product specification

The game page is the central product. Everything else supports it.

## 6.1 Above the fold

Desktop:
- cover / key art
- title
- developer/publisher
- release date/status
- platforms
- concise one-sentence “experience summary”
- evidence badge
- confidence badge
- primary pull
- primary risk

Mobile:
- title/meta
- hero image/cover
- experience summary
- confidence
- primary pull/risk
- dimension summary

Do not waste the first viewport on descriptive marketing copy.

## 6.2 Dimension display

Display all eight dimensions clearly.

Recommended first implementation:
- horizontal bar/rating rows,
- score out of 10,
- compact one-line explanation,
- optional click/expand for subcriteria.

Avoid radar chart as the **only** representation.
A radar visualization may be offered as a secondary visual because it communicates “shape,” but bars/rows are easier to read and compare accurately.

Public scores should be in **0.5 increments** unless later calibration justifies finer precision.

Example:
`Atmosphere & World Pull  9.5`

Do not display “9.47.”

## 6.3 Recommendation interpretation block

Canonical three-block structure:

### Great fit if…
Positive experience traits.

### Know before buying…
Meaningful caveats that are not necessarily disqualifying.

### Probably not for you if…
Strong mismatch conditions.

Rules:
- 2–5 bullets each.
- Concrete, not generic.
- Do not simply repeat dimension labels.
- Never write “you will love.”
- Avoid declaring player identity.
- Phrase around preferences and tolerances.

Good:
- “You want a tightly authored 12–18 hour campaign.”
- “You dislike repeated run failure and replaying cleared sections.”

Bad:
- “You are a hardcore gamer.”
- “You love good stories.”
- “This is objectively one of the best games ever.”

## 6.4 Experience tags

Tags describe the experience rather than judge it.

Initial taxonomy:
- linear
- hub-based
- open world
- mission-based
- systemic
- story-heavy
- dialogue-heavy
- cutscene-heavy
- exploration-heavy
- combat-heavy
- puzzle-heavy
- stealth-heavy
- resource pressure
- backtracking
- grind
- repetition
- run-reset structure
- high punishment
- low punishment
- high mechanical complexity
- reading-dense
- cinematic
- horror
- sustained tension
- helplessness sections
- power fantasy
- co-op-forward
- multiplayer-dependent
- buildcraft-heavy
- choice-consequence
- strong onboarding
- dated friction
- technical instability

Use controlled vocabulary, not arbitrary freeform tags.

Some tags may eventually use intensity:
`none / low / medium / high`.

## 6.5 Evidence/confidence strip

Every evaluation must visibly state one of:

### VERIFIED
Substantial post-release evidence. The profile is stable.

### PROVISIONAL
Released, but evidence is incomplete or rapidly changing.

### PRE-RELEASE
Based on preview/demo/developer/reviewer evidence. Scores are estimates.

Optional confidence:
- Low
- Medium
- High

Display evidence cutoff:
`Evidence checked: 6 Aug 2026`

For pre-release:
`Pre-release profile — expected to be reassessed after launch.`

## 6.6 Evidence & scoring transparency

Every profile includes a compact trust line such as:

`Verified · High confidence · 14 substantive sources · Evidence checked 6 Aug 2026 · Rubric v1.0`

Clicking `Evidence & scoring` opens:
- source-category counts,
- direct-play status,
- full linked source list,
- methodology link,
- per-dimension evidence coverage.

Each dimension exposes `Why this score?`, revealing:
- five subcriteria and their 0–2 values,
- concise rationale,
- confidence,
- linked evidence.

## 6.7 Revision history

Small expandable area:
- initial pre-release profile
- launch update
- post-patch change

Do not make editorial changes invisible.

---

# 7. Comparison experience

Comparison is strategically important because crowded release windows are one of the clearest use cases.

## 7.1 Compare table

Columns = games.
Rows:
- evidence status
- runtime band
- dimensions
- primary pull
- primary risk
- key experience tags

Highlight meaningful differences, not “winner” badges.

Example:
- Story & Characters: 8.5 / 7.0 / 9.0
- Pacing & Time Respect: 9.0 / 6.5 / 8.0
- Punishment: Low / High / Medium

## 7.2 “What separates them?” summary

A generated/editorial 2–4 sentence comparison:
- where Game A is stronger,
- what Game B asks the player to tolerate,
- what kind of mood/session Game C fits.

This is one of the highest-value areas for future AI assistance, but should be based strictly on structured profile data.

---

# 8. Discovery experience

Discovery should not initially attempt “recommendation AI.”

It should let the user express requirements.

Example queries through filters:
- Story & Characters >= 8
- Pacing & Time Respect >= 8
- no high-punishment tag
- <= medium mechanical complexity
- PS5
- 2025–2026

Result cards should show:
- cover
- title
- 2–3 strongest dimensions
- primary risk
- confidence
- status

Sort options:
- newest
- highest selected dimension
- strongest average across selected dimensions (internal utility only)
- shortest/longest if runtime data exists

Do not default-sort the entire catalog by an undisclosed aggregate score.

---

# 9. Scoring methodology — implementation contract

The canonical engineering-ready rubric is `Game_Profile_Scoring_Rubric_v1.0.md`.

Dimensions:

1. Story & Character Investment
2. Execution & Polish
3. Structure & Focus
4. Agency & Satisfaction
5. Pacing & Time Respect
6. Atmosphere & World Pull
7. Thematic & Emotional Impact
8. Medium-Specific Craft

Each dimension:
- five subcriteria,
- each scored 0 / 0.5 / 1 / 1.5 / 2,
- sum = 0–10.

## 9.1 No weighted public total

Do not calculate or expose a public “Game Profile Score” in MVP.

Internally, we may calculate:
- simple mean,
- selected-dimension mean,
- quality-control distributions,

but they are not a product score.

## 9.2 Missing evidence

Do not force a number where evidence is missing.

A subcriterion may be `unknown`.

If >1 of 5 subcriteria is unknown:
- dimension is provisional,
- score may be hidden or shown as a range,
- confidence cannot be High.

## 9.3 Pre-release scoring

Pre-release coverage is a first-class use case, but must distinguish **what has been observed** from **what the finished game may become**.

Pre-release profiles require:
- explicit `PRE-RELEASE` status,
- evidence maturity state: Announced / Showcased / Hands-on / Review-code,
- source/evidence links and source-category counts,
- confidence,
- evaluation scope such as demo/preview build,
- no false certainty.

Rules:
- first-party-only evidence does **not** justify a complete eight-dimension numerical profile,
- target at least 3 substantive independent hands-on sources for a normal Medium-confidence pre-release profile, while treating evidence depth as more important than a mechanical quota,
- still show the same dimension scale when evidence is sufficient,
- allow a displayed range when uncertainty is material, e.g. `7.0–8.0`,
- use `Unknown / Not enough evidence` where evidence does not support a bounded estimate,
- overall pre-release confidence cannot be High,
- individual observable dimensions may reach High confidence only with unusually strong direct/independent evidence,
- narrative payoff, runtime justification, late-game repetition, launch technical stability and lasting impact should usually remain ranged/unknown until full-game evidence exists.

Public pre-release trust line example:
`PRE-RELEASE · Medium confidence · 5 hands-on previews + public demo · checked 6 Aug 2026`

Pre-release recommendation blocks should use:
- `Looks promising if…`
- `Watch before buying…`
- `Biggest unknowns…`

At release:
- preserve the pre-release evaluation,
- create a new post-release evaluation,
- reassess every subcriterion,
- begin as `PROVISIONAL` if evidence is still incomplete,
- expose meaningful score changes in revision history.

A pre-release page is useful only if it is honest about what is unknown.

The canonical operating details live in `Game_Profile_Editorial_Evidence_and_Data_Sourcing_SOP_v0.2.md`.

---

# 10. Editorial evidence model

This product wins or loses on trust.

## 10.1 Evidence classes

### Tier A — Direct
- full game played by evaluator
- substantial hands-on
- official demo
- direct technical measurement

### Tier B — Strong external
- multiple reputable reviews
- credible technical analysis
- multiple independent hands-on reports
- post-launch player consensus with adequate sample

### Tier C — First-party
- developer interviews
- official gameplay
- store description
- marketing materials

Useful for facts and pre-release structure, weak for judging quality.

### Tier D — weak/anecdotal
- isolated comments
- unsourced claims
- rumor

Never the main basis of a numerical dimension.

## 10.2 Evidence rules

Every published evaluation stores:
- source title
- URL
- publisher/author when available
- date
- source category: direct play / critic / technical analysis / specialist or creator / player signal / first-party
- evidence tier
- relevant dimensions and, where useful, subcriteria
- notes
- spoiler flag if necessary

For a released game, a High-confidence numerical judgment should not rest on a single external review.

### Evidence-pack target for a released game

These are editorial targets rather than rigid quotas:

- **5–8 substantive critic reviews** from independent outlets with different editorial voices,
- **1–3 specialist/deep-dive sources** where useful,
- **1 technical-analysis source** when performance/technical execution is materially relevant,
- **player-sentiment signal** where legally/technically appropriate, treated as a signal rather than a vote that directly changes the rubric score,
- **direct evaluator play/hands-on** when available.

A normal high-confidence released profile will therefore often have roughly **8–15 substantive evidence sources**.

### Important scoring rule

Sources are **not numerically averaged into the Game Profile score**.

Instead:
1. evidence is mapped to relevant rubric subcriteria,
2. contradictions and agreement are recorded,
3. the editor assigns each 0–2 subcriterion score using the canonical rubric,
4. the five subcriteria sum to the dimension /10,
5. confidence reflects evidence breadth, quality and agreement.

This is an editorial synthesis with a reproducible rubric, not a crowd-score aggregator.

### Public transparency

Every profile should expose an `Evidence & scoring` view.

At profile level show:
- rubric version,
- evaluation status and confidence,
- evidence cutoff/current-state date,
- total substantive sources,
- source-category counts,
- whether direct evaluator play occurred,
- optional external player-signal summary where rights/terms permit.

At dimension level, `Why this score?` expands to show:
- the five subcriterion scores,
- one concise rationale per subcriterion,
- dimension confidence,
- number of evidence sources linked to that dimension,
- clickable source list.

Do not reproduce long review text. Summarize evidence and link to the original source.

## 10.3 AI use

AI may:
- summarize evidence,
- identify contradictions,
- draft structured notes,
- map evidence to rubric candidates,
- flag missing support,
- generate copy from approved structured data.

AI must **not**:
- fabricate play experience,
- invent sources,
- silently resolve contradictory evidence,
- turn marketing claims into quality facts,
- publish without human approval during the initial product stage.

---

# 11. Launch-catalog strategy

Do not start by trying to cover all games.

## 11.1 Calibration set

Create 20–30 established games deliberately chosen to cover different profile shapes:
- premium linear/cinematic,
- open-world narrative,
- Soulslike,
- survival horror,
- helpless horror,
- roguelike,
- RPG,
- turn-based,
- choice-heavy,
- mechanically excellent/light story,
- story-heavy/light mechanics,
- older game with friction,
- co-op/shared game.

The original Fitz calibrations are useful anchors because they already expose edge cases. The calibration corpus should deliberately cover radically different experience shapes rather than simply famous games.

### Recommended calibration corpus v0.1

#### Narrative / premium authored anchors
- Alan Wake 2
- Resident Evil Requiem
- Resident Evil 2 Remake
- Silent Hill 2 Remake
- Dead Space Remake
- Mass Effect
- Expedition 33
- Spider-Man 2018
- God of War 2018

#### Open-world / large-structure tests
- Kingdom Come: Deliverance II
- Red Dead Redemption 2
- The Witcher 3
- Assassin’s Creed IV: Black Flag
- Horizon Forbidden West
- Rise of the Ronin
- Medieval Dynasty

#### Friction / repetition / punishment tests
- Returnal
- Gothic Remake
- Hell is Us

#### Horror-agency contrast tests
- Alien: Isolation
- The Long Dark
- Silent Hill 2 Remake
- Resident Evil Requiem
- Dead Space Remake

#### Current / provisional-profile tests
- Beast of Reincarnation
- Halo: Campaign Evolved
- Gothic Remake
- Hell is Us

#### Legacy / form-modernization tests
- KOTOR
- Dragon Age titles
- Gothic Remake
- Halo: Campaign Evolved

Each title has a job in calibration:
- **Alien: Isolation** tests whether intentionally low/uneven player power can be described honestly without turning “helplessness” into an automatic quality penalty.
- **The Long Dark** tests systemic survival, repetition, slow pacing and emergent world pull without conventional narrative momentum.
- **Medieval Dynasty** tests whether long-form routine, crafting and management are correctly distinguished from empty bloat.
- **Rise of the Ronin** tests open-world density, repeated activities, combat agency and production/execution that may vary by dimension.
- **Returnal** remains the key test for excellent execution/agency coexisting with run-reset repetition and punishment.
- **Gothic Remake** tests modernization of a historically friction-heavy form and whether legacy identity survives improved UX/execution.
- **Halo: Campaign Evolved** tests remake/remaster evaluation, franchise continuity and the separation of inherited design strength from new execution.
- **Hell is Us** tests atmosphere, exploration readability, intentional ambiguity and potential friction without prematurely calling unconventional design “bad.”
- **Beast of Reincarnation** tests a current high-production game where combat, companion systems, narrative clarity and overall execution may land at different levels.

The public scores must be independently re-evaluated under the generic rubric, not copied from Tomas Fit.

### First calibration wave

Do not score the entire corpus before learning from it. Start with a deliberately contrasting first wave:

1. Alan Wake 2
2. Kingdom Come: Deliverance II
3. Spider-Man 2018
4. Returnal
5. Resident Evil Requiem
6. Expedition 33
7. Alien: Isolation
8. The Long Dark
9. Medieval Dynasty
10. Rise of the Ronin
11. Hell is Us
12. Gothic Remake
13. Beast of Reincarnation
14. Halo: Campaign Evolved

This 14-game wave is intentionally broad enough to expose rubric overlap, personal-preference leakage and weak tag definitions before the site architecture depends on them.

## 11.2 Current-release set

For launch, prioritize games that are:
- high-profile,
- purchase decisions rather than free curiosities,
- close together in release timing,
- likely to create comparison intent.

September 2026 is a good target window because current calendars include games such as The Blood of Dawnwalker, Marvel’s Wolverine, Control Resonant, Silent Hill: Townfall and others clustered within the month.

Do not promise complete calendar coverage.

## 11.3 Launch target

Recommended beta catalog:
- 25 calibration/legacy games
- 10–15 current/recent 2026 games
- 5–10 pre-release profiles

Total: roughly **40–50 high-quality profiles**.

Quality beats breadth.

---

# 12. Technical architecture

## 12.1 Platform decision

Build a **responsive website first**, installable/PWA-capable later.

Reasons:
- one codebase,
- immediate link sharing,
- SEO/indexable game pages,
- easier iteration,
- zero app-store review burden,
- suitable for search/comparison workflows,
- future PWA can provide app-like home-screen use.

## 12.2 Recommended stack

### Frontend / full stack
- Next.js 16+ App Router
- TypeScript
- React
- Tailwind CSS
- a restrained component primitive system (Radix/shadcn acceptable, but do not let default shadcn styling define the product)

### Hosting
- Vercel

### Database / auth
Preferred:
- Supabase Postgres
- Supabase Auth for **admin users only** at MVP
- optional Supabase Storage if we store owned/uploaded assets

Alternative:
- Vercel Postgres/Prisma if Claude strongly prefers it for implementation simplicity.

Default decision: **Supabase** unless a concrete engineering blocker appears.

### ORM/data access
Choose one:
- Drizzle, or
- Prisma

Preference: choose whichever Claude can keep simplest and most type-safe. Do not add an ORM only for fashion.

### Analytics
Phase 1:
- Vercel Web Analytics or similarly lightweight page analytics.

Phase 1.1:
- PostHog for product events if we need funnel/behavior analysis.

### Error monitoring
- Sentry after public beta, not required on the very first local prototype.

## 12.3 Metadata provider

Do not make the product’s intellectual core dependent on a third-party game API.

Internal DB owns:
- canonical title
- slug
- profile scores
- tags
- recommendation text
- editorial evidence
- revisions

Third-party metadata can enrich:
- cover
- release dates
- developer/publisher
- platforms
- genres
- optional average completion-time data
- external IDs such as Steam App ID

### Preferred metadata/runtime direction

**IGDB is the preferred first integration** if its licensing is acceptable for the current deployment stage.

IGDB exposes normal game metadata plus a `game_time_to_beats` dataset with average completion times and submission count.

### HowLongToBeat

HowLongToBeat is an excellent consumer-facing runtime source, but **do not build the product around an unofficial scraper/wrapper**.

As of Aug 2026, there is no documented official public HLTB API available for us to rely on. Community integrations generally wrap/scrape HLTB's internal website endpoints and may break when those endpoints/authentication change.

Policy:
1. Do not ship HLTB scraping in MVP.
2. If HowLongToBeat offers official/licensed API access later, implement it behind the same runtime-provider adapter.
3. Until then, prefer IGDB's official time-to-beat endpoint.
4. An external HLTB link may be considered separately after checking linking/branding terms.

### Provider/licensing rule

- IGDB is free for non-commercial use under its documented terms; commercial use requires partnership.
- RAWG and any later source must be reviewed for attribution/commercial-use conditions.
- Steam player-review data may be technically accessible, but usage rights and commercial-use restrictions must be reviewed before it becomes a product dependency.
- Never couple the editorial score to the availability of one external provider.

Therefore:
1. Build provider adapters.
2. Keep canonical editorial data in our DB.
3. Cache permitted metadata rather than repeatedly querying on every page request.
4. For beta, manual metadata entry remains a valid fallback.
5. Before monetization/commercial launch, perform a licensing pass on every external data source.

Suggested interface:
```ts
interface GameMetadataProvider {
  search(query: string): Promise<GameMetadataCandidate[]>
  getGame(externalId: string): Promise<GameMetadata>
}
```

Provider-specific IDs live in a mapping table.

## 12.4 Search

MVP:
- Postgres full-text + trigram similarity
- aliases table for alternate names
- no Algolia/Elastic/Typesense initially

Only add external search infrastructure after measured need.

## 12.5 Rendering

Game pages should be server-rendered/static where practical.
On publish/update:
- revalidate relevant game route
- revalidate discovery data
- update sitemap

This keeps the site fast and crawlable.

---

# 13. Data model

The schema must support versioned editorial evaluations.

## 13.1 Core entities

### `games`
- id UUID
- slug
- canonical_title
- summary
- cover_url
- hero_url
- developer_text
- publisher_text
- first_release_date
- release_status
- created_at
- updated_at

### `game_external_ids`
- game_id
- provider
- external_id
- external_url

### `game_time_estimates`
Provider-backed runtime data; never part of the eight-dimension score.
- game_id
- provider
- external_game_id
- main_or_hasty_seconds nullable
- normal_or_main_plus_seconds nullable
- completionist_seconds nullable
- submission_count nullable
- provider_updated_at nullable
- fetched_at
- attribution_text nullable

### `platforms`
- id
- slug
- name

### `game_platforms`
- game_id
- platform_id
- release_date
- performance_notes optional

### `game_aliases`
- game_id
- alias
- alias_type

### `dimensions`
Versionable rubric metadata.
- id
- rubric_version
- key
- name
- description
- display_order

### `subcriteria`
- id
- dimension_id
- key
- name
- description
- display_order

### `evaluations`
One editorial version of one scoped game experience.
- id
- game_id
- rubric_version
- version_number
- edition_scope
- mode_scope
- platform_scope
- build_or_patch_scope
- current_state_cutoff_at
- status: draft/review/published/superseded
- evidence_status: verified/provisional/pre_release
- confidence: low/medium/high
- evidence_cutoff_at
- release_context
- one_line_experience
- primary_pull
- primary_risk
- created_by
- reviewed_by
- published_at
- supersedes_evaluation_id
- change_summary

### `subcriterion_scores`
- evaluation_id
- subcriterion_id
- score numeric nullable
- platform_id nullable (used for material platform-specific overrides, especially Technical Stability)
- low_estimate nullable
- high_estimate nullable
- rationale
- evidence_confidence

### `dimension_scores`
Prefer a database view/derived value where possible rather than duplicated manual numbers.
- evaluation_id
- dimension_id
- score
- low_estimate
- high_estimate
- confidence: low/medium/high
- linked_evidence_count derived

### `profile_blocks`
- evaluation_id
- block_type: great_fit / know_before / probably_not
- item_order
- text

### `tags`
- id
- key
- label
- category
- description
- value_type: boolean/intensity

### `evaluation_tags`
- evaluation_id
- tag_id
- intensity nullable
- note optional

### `evidence_sources`
- id
- title
- url
- publisher
- author
- published_at
- accessed_at
- evidence_tier
- source_category: direct_play / critic / technical / specialist_creator / player_signal / first_party
- source_type
- platform_scope nullable

### `evaluation_evidence_links`
- evaluation_id
- evidence_source_id
- dimension_id nullable
- subcriterion_id nullable
- note
- spoiler_sensitive bool

### `evaluation_revisions`
Optional if normal evaluation versioning does not capture field-level history.
- evaluation_id
- changed_at
- changed_by
- summary

## 13.2 Important constraints

- Only one current published evaluation per game/rubric version.
- Scores must be 0–2 in 0.5 increments at subcriterion level.
- Published evaluation must have:
  - evidence status,
  - confidence,
  - primary pull,
  - primary risk,
  - all required recommendation blocks or explicit exemptions.
- A game can exist without an evaluation.
- An evaluation can be pre-release and later superseded.

---

# 14. Admin/editorial workflow

The private tooling is as important as the public page because the bottleneck is content production.

## 14.1 Create game

1. Search metadata provider/manual catalog.
2. Select candidate or create manually.
3. Verify title, platform, date.
4. Save game record.

## 14.2 Create evaluation

1. Choose context:
   - pre-release
   - launch
   - post-release
   - legacy retrospective
2. Add evidence.
3. Score subcriteria.
4. System derives dimension scores.
5. Add tags.
6. Write:
   - one-line experience
   - primary pull
   - primary risk
   - three recommendation blocks
7. Preview public page.
8. Run validation.
9. Publish.

## 14.3 Validation checks

Before Publish:
- all dimension/subcriterion data structurally valid,
- unknown fields handled correctly,
- every strong claim has evidence notes,
- pre-release state visible,
- no contradictory recommendation text,
- no personal/Tomas-specific language,
- no spoiler leakage,
- no fake precision,
- no total score accidentally displayed.

## 14.4 Reassessment queue

Admin dashboard flags:
- pre-release game now released,
- profile older than configurable period,
- large patch/DLC noted,
- confidence low,
- missing scores,
- broken evidence URL,
- new platform release if relevant.

---

# 15. UX and visual design direction for Claude

Claude is the designer, but should design **from product semantics**, not from a generic “gaming website” aesthetic.

## 15.1 Personality

Target:
- premium editorial
- analytical
- confident
- clean
- a little cinematic
- not sterile SaaS
- not neon gamer cliché
- not magazine clutter

Think:
“Letterboxd/consumer-lab clarity meets premium game editorial,”
not “RGB esports dashboard.”

## 15.2 Core visual motif

The **profile shape** is the identity.

Scores and tags should be visually memorable enough that a screenshot of a profile immediately looks like this product.

Approved motif:
- **eight-axis radar/spider polygon as the at-a-glance profile silhouette,**
- eight stacked score rows for exact readable values,
- strong typography,
- cover art as atmosphere, not UI wallpaper.

### Radar/spider chart contract
The polygon is a signature visualization, not a replacement for readable scores.

- exactly eight axes,
- fixed axis order across the product,
- single-game polygon is default,
- maximum two overlaid games in radar comparison,
- 3–4 game comparison uses aligned bars/table instead,
- no green/red school-grade semantics,
- no total polygon-area score,
- unknown values must not collapse to zero,
- tap/hover gives exact score and definition,
- screen-reader/HTML score rows always exist,
- mobile labels must remain legible.

Recommended clockwise axis order:
1. Story & Characters
2. Thematic & Emotional
3. Atmosphere & World
4. Medium-Specific Craft
5. Agency & Satisfaction
6. Execution & Polish
7. Structure & Focus
8. Pacing & Time Respect

This ordering creates a readable progression from meaning/world → interactivity/play → delivery/time.

## 15.3 Color

Use a restrained base palette.
Dimension colors may exist, but:
- keep them consistent,
- accessible,
- never rely on color alone,
- avoid rainbow dashboard noise.

## 15.4 Typography

Prioritize:
- readable score labels,
- strong game title hierarchy,
- compact supporting text,
- excellent mobile legibility.

## 15.5 Mobile first in interaction, desktop strong in comparison

Most game-page browsing must be excellent on mobile.
Comparison should take advantage of desktop width while still supporting swipe/stack on mobile.

## 15.6 Performance

Targets:
- no giant autoplay hero video,
- lazy-load noncritical imagery,
- stable layout,
- good Core Web Vitals,
- cover images optimized.

---

# 16. SEO/content discoverability

Every game page should expose:
- canonical title
- release date
- developer
- platforms
- profile summary
- dimension labels
- relevant structured metadata

Generate:
- canonical URLs
- OpenGraph image
- sitemap
- robots
- Game structured data where valid

Potential landing pages later:
- `/best-story-games`
- `/low-punishment-games`
- `/best-paced-games`
- `/games-like/...`

Do not launch SEO spam pages before the core dataset is credible.

---

# 17. Measurement plan

## 17.1 North-star candidate

**Qualified profile decisions per visitor**

We cannot directly know a purchase decision initially, so proxy with high-intent actions.

## 17.2 MVP product events

Track:
- `search_submitted`
- `search_result_opened`
- `profile_viewed`
- `dimension_expanded`
- `methodology_opened`
- `compare_added`
- `compare_viewed`
- `discover_filter_applied`
- `external_store_clicked` (if added)
- `profile_shared`

## 17.3 Key metrics

### Discovery effectiveness
- search → profile CTR
- % zero-result searches
- top missing games

### Decision engagement
- profile → compare rate
- profile → share rate
- recommendation-block visibility/engagement
- avg profiles/session

### Trust
- methodology page visits
- dimension expand rate
- return visits after pre-release profiles become verified

### Content operations
- median time to create profile
- profiles/week
- % profiles with High confidence
- reassessment backlog age

## 17.4 Explicit validation prompt

Optional lightweight prompt after meaningful interaction:
“Did this help you decide?”
- Yes
- Somewhat
- No

This may be more valuable early than sophisticated analytics.

---

# 18. Delivery phases

These are effort ranges, not calendar promises.

## Phase 0 — Product/rubric calibration
**Goal:** prove the generic scoring system works before building much UI.

Deliverables:
- rubric v0.1 locked
- 10 calibration games scored manually
- score disagreements documented
- tag taxonomy v0.1
- recommendation-block style guide
- 2–3 low-fidelity game-page sketches

Exit criteria:
- same evidence produces reasonably consistent scoring,
- generic rubric does not accidentally reintroduce Tomas taste,
- profiles meaningfully distinguish different games.

Estimated engineering/product effort: 1–3 focused days.

## Phase 1 — Vertical-slice prototype
**Goal:** one real game profile end to end.

Deliverables:
- Next.js repo
- DB connection
- seeded rubric
- one game
- one evaluation
- public profile page
- basic responsive design

No admin UI required yet; seed data is acceptable.

Exit:
- deployed preview URL,
- profile works on phone and desktop,
- scores and recommendation blocks readable.

Estimated: 2–4 days.

## Phase 2 — Editorial system
**Goal:** make content production sustainable.

Deliverables:
- admin auth
- game editor
- evaluation editor
- subcriterion scoring UI
- evidence source manager
- tags
- preview
- validation
- publish/versioning

Exit:
- a non-coding editor can create/publish a profile.

Estimated: 4–7 days.

## Phase 3 — Catalog/search/home
Deliverables:
- home
- search
- game cards
- aliases
- 15–25 real profiles
- metadata-import adapter/manual fallback

Exit:
- users can find games reliably.

Estimated: 3–5 days + editorial scoring time.

## Phase 4 — Discover + compare
Deliverables:
- `/discover`
- filters
- URL-persisted filter state
- `/compare`
- 2–4 game comparison
- “what separates them” summary

Exit:
- crowded-release comparison use case is complete.

Estimated: 3–6 days.

## Phase 5 — Public beta hardening
Deliverables:
- methodology
- about
- SEO
- sitemap
- analytics
- error handling
- accessibility QA
- responsive QA
- basic performance pass
- 40–50 profiles

Exit:
- safe to share publicly.

Estimated engineering: 2–4 days.
Editorial throughput is the larger variable.

---

# 19. Prioritized backlog

## P0 — Must exist for beta

### Product
- generic rubric v0.1
- game profile page
- confidence/evidence status
- primary pull/risk
- three recommendation blocks
- controlled experience tags
- methodology page

### Engineering
- DB schema
- evaluation versioning
- search
- responsive pages
- admin publishing
- deployment
- SEO basics

## P1 — Strong launch value
- compare
- discovery filters
- revision history
- pre-release ranges
- analytics
- rich share cards
- metadata import

## P2 — After validation
- personal preference profile
- derived personal match score
- saved games
- “compare my shortlist”
- release-watch notifications
- storefront links
- price context
- API
- embeddable profile card

## P3 — Do not touch until product earns it
- social graph
- user reviews
- comments
- native mobile
- public profiles
- recommendation ML
- community scoring
- moderation systems

---

# 20. Personalization roadmap (later, not MVP)

The architecture should make this easy later.

## 20.1 User preference vector

A user may set:
- importance per dimension,
- hard aversions,
- preferred structures,
- tolerance thresholds.

Example:
```json
{
  "dimension_weights": {
    "story": 1.4,
    "pacing": 1.3,
    "agency": 1.0,
    "atmosphere": 1.2,
    "craft": 0.8
  },
  "aversions": {
    "high_punishment": 2,
    "run_reset_structure": 3
  }
}
```

Then personal fit is derived from the public game profile.

This is the correct inversion of the original Tomas model:
- score the game once,
- personalize interpretation later.

## 20.2 Guardrail

Never let a personal match overwrite the public profile.

Public:
`Pacing & Time Respect: 6.5`

Personal:
`This matters a lot to you, so it lowers your match.`

---

# 21. Product risks and mitigations

## Risk 1 — “This is just another review score”
Mitigation:
- no aggregate score,
- emphasize shape/risk,
- compare dimensions,
- methodology visibility.

## Risk 2 — Subjectivity disguised as science
Mitigation:
- clear rubric,
- 0.5 increments,
- evidence notes,
- confidence states,
- version history,
- avoid fake decimal precision.

## Risk 3 — Editorial workload
Mitigation:
- start with 40–50 games,
- efficient admin,
- reuse structured evidence,
- AI assistance only after rubric is stable.

## Risk 4 — Pre-release inaccuracy
Mitigation:
- visible pre-release status,
- confidence,
- ranges/unknowns,
- mandatory post-launch reassessment.

## Risk 5 — Third-party metadata licensing
Mitigation:
- adapter layer,
- internal canonical database,
- manual fallback,
- resolve commercial rights before scaling.

## Risk 6 — Rubric overlap
Narrative, execution, emotional impact and craft can bleed into one another.
Mitigation:
- dimension definitions with “not this” boundaries,
- calibration exercises,
- subcriterion rationales.

## Risk 7 — Scores become popularity consensus
Mitigation:
- score rubric behavior, not hype,
- reviews are evidence, not votes,
- use contrarian score only when evidence supports it.

## Risk 8 — Claude optimizes implementation at cost of product
Mitigation:
- acceptance criteria,
- decision log,
- product questions escalated instead of silently resolved.

---

# 22. QA strategy

## 22.1 Rubric QA

For each calibration game:
- score independently,
- explain subcriterion rationale,
- compare against game profile intent,
- identify ambiguous definitions,
- update rubric only when ambiguity recurs.

## 22.2 UI QA

Test:
- iPhone-ish width
- common Android width
- tablet
- 1366/1440 desktop
- ultrawide comparison

Check:
- scores readable without hover
- no horizontal overflow except deliberate comparison
- keyboard navigation
- visible focus
- semantic headings
- contrast
- reduced-motion support

## 22.3 Data QA

Automated:
- score range checks
- 0.5 increment checks
- publish completeness
- one active published evaluation
- valid slugs
- unique aliases where intended

## 22.4 Regression tests

At minimum:
- profile route renders
- search finds alias
- compare retains selected games
- publish transitions draft correctly
- old evaluation remains historically accessible internally

---

# 23. Repository / engineering workflow

Recommended GitHub structure:
```text
/
  app/
  components/
  lib/
    db/
    scoring/
    metadata/
    validation/
  content/        # optional seed fixtures
  docs/
    product/
    architecture/
    decisions/
  tests/
```

## 23.1 Branching

Keep simple:
- `main` deployable
- feature branches
- PR for meaningful changes

## 23.2 PR contract for Claude

Every meaningful PR description contains:
- What changed
- Why
- Screenshots for UI
- Data/schema changes
- Tests run
- Known limitations
- Product decisions made/needed

Claude must not bundle unrelated refactors into product work.

## 23.3 ADRs

Create lightweight Architecture Decision Records only for consequential decisions:
- metadata provider
- auth choice
- ORM
- score storage/derivation
- pre-release range representation

---

# 24. Working model between Tomas, ChatGPT and Claude

## Tomas
- owner
- taste/sanity check
- final product decisions
- approves launch quality

## ChatGPT
- PM/product lead
- owns PRD/rubric coherence
- prioritizes backlog
- converts feedback into tickets
- reviews Claude’s output against product intent
- identifies scope creep
- maintains continuity docs

## Claude
- engineering lead
- product designer
- proposes implementation options
- writes code
- maintains repo quality
- produces screenshots/previews
- raises blockers/tradeoffs
- does not redefine product semantics without approval

## Decision protocol

For a material ambiguity Claude should return:
1. the decision required,
2. recommended option,
3. alternatives,
4. product/technical consequences.

For trivial implementation details, Claude chooses and documents them.

---

# 25. Claude-specific implementation rules

1. **Do not over-engineer.**
2. Prefer boring, maintained technology.
3. No microservices.
4. No separate API service unless a real need appears.
5. No GraphQL.
6. No event bus.
7. No search SaaS until Postgres search fails measured requirements.
8. No public authentication in MVP.
9. Keep scoring logic versioned and testable.
10. Do not hardcode rubric labels throughout components; seed them from canonical config/DB.
11. Separate editorial data from third-party metadata.
12. Preserve historical evaluation versions.
13. Never derive “verified” from release date alone.
14. Do not auto-publish AI output.
15. Build mobile game profile quality before elaborate desktop decoration.
16. Treat compare as product UI, not a generic HTML table.
17. Optimize admin workflow: content production is a core operational problem.
18. Avoid fake score precision.
19. Surface unknowns.
20. Ask for a product decision only when the choice changes user experience, methodology, data integrity or long-term architecture.

---

# 26. Initial acceptance tests

## Profile page

Given a published post-release evaluation:
- title/meta render,
- eight dimension scores appear,
- score explanations accessible,
- pull/risk visible,
- recommendation blocks visible,
- evidence status = VERIFIED,
- evidence cutoff visible.

Given a pre-release evaluation:
- PRE-RELEASE is unmistakable,
- confidence appears,
- unknown/range dimensions do not look like confirmed scores.

## Search
Searching:
- canonical title finds game,
- common alias finds game,
- typo tolerance is reasonable.

## Compare
Selecting 2–4 games:
- URL is shareable,
- dimensions align row-by-row,
- missing values remain visibly missing rather than 0,
- meaningful risk-tag differences are visible.

## Admin
A privileged editor can:
- create game,
- create draft evaluation,
- save partial work,
- attach sources,
- score rubric,
- preview,
- publish,
- supersede with a revision.

---

# 27. First 10 tickets for Claude

These are deliberately ordered to reduce wasted implementation.

### GP-001 — Repository foundation
Create Next.js/TypeScript project, lint/test basics, Vercel-ready configuration.

### GP-002 — Canonical rubric module
Represent locked rubric v1.0 as typed data with version number and tests for score ranges, unknowns and radar axis ordering.

### GP-003 — Database schema
Implement games/evaluations/subcriteria/scores/tags/evidence/versioning.

### GP-004 — Seed calibration profile
Seed one complete game with realistic profile data.

### GP-005 — Public game-profile vertical slice
Implement `/games/[slug]` mobile + desktop.

### GP-006 — Profile visual system
Create reusable score row, evidence badge, risk/pull card, recommendation block.

### GP-007 — Second/third profile shape test
Seed two radically different games and verify the visual/profile system communicates differences.

### GP-008 — Search vertical slice
Home search → game page.

### GP-009 — Admin authentication skeleton
One or two approved admin users only.

### GP-010 — Evaluation editor prototype
Subcriterion scoring, autosave/save draft, derived dimension scores, preview.

**Do not start compare/discovery until GP-005–007 prove that a single profile works.**

---

# 28. Claude kickoff brief

Paste this section to Claude with the repository/context files:

> You are the engineering lead and product designer for Game Profile. Read the Master Product & Build Plan, Scoring Rubric and Project Context files before changing code. The core product is a standardized multidimensional game profile, not a conventional review site and not a universal aggregate score.
>
> First, challenge the implementation plan only where you see a real technical/product risk. Do not redesign the product wholesale. Then execute GP-001 through GP-004 and stop at the first point where a material product decision is required.
>
> Optimize for a tiny team, low maintenance and fast iteration. Prefer a single Next.js application with managed Postgres. Preserve evaluation versioning and rubric versioning from day one. Do not add public accounts, social features, AI chat, recommendation ML or a public aggregate score.
>
> For design, make the profile shape recognizable, premium and editorial rather than “gaming neon” or generic SaaS. Mobile profile reading is primary. Provide screenshots/previews for visual work.
>
> Any time you think a requirement should change, state: (1) what you propose, (2) why, (3) user impact, (4) engineering impact.

---

# 29. Questions intentionally left open

These are not blockers for the first vertical slice.

1. Final product name.
2. Exact branding/palette/typeface.
3. Whether radar chart survives user testing.
4. Whether dimension scores display only 0.5 increments or broader bands.
5. Final game metadata provider.
6. Whether runtime comes from manual editorial data or a licensed external source.
7. Whether store links exist at launch.
8. Whether compare launches in beta or immediately after beta.
9. Exact public wording for evidence status.
10. Monetization.

Do not prematurely decide these in code unless necessary.

---

# 30. Recommended immediate next move

Before Claude builds the full editorial system:

1. Use locked scoring rubric v1.0 after two calibration rounds.
2. Hand Claude the rubric + three deliberately contrasting completed profiles (Alan Wake 2, Returnal, Redfall; Forspoken optional fourth).
3. Build the radar + exact-score-row game-profile vertical slice.
4. Build one game page.
5. Judge whether a user can understand the game’s “shape” at a glance.
6. Only then build the admin/catalog machinery.

This minimizes the biggest project risk: building a polished site around a profile language that has not yet been calibrated.

---

# Appendix A — Current market/implementation notes (verified 2026-08-06)

- Metacritic remains centered on aggregate critic/user scores and filtering by platform/genre/year.
- Backloggd centers collection tracking, user ratings/reviews, lists, social activity and discovery; its public roadmap still includes recommendations and advanced filters as major requested features.
- This reinforces the opportunity: our MVP should not compete on social logging or “another average rating.”
- September 2026 currently has a dense release calendar, supporting comparison/purchase-triage as a concrete launch use case.
- IGDB currently documents free non-commercial API use, while commercial use requires partnership.
- RAWG currently exposes extensive metadata, but usage includes plan/attribution/commercial conditions; do not bind the product to it until terms are acceptable.
- Next.js 16 is current in 2026 and is a reasonable maintained foundation.
- Supabase remains a managed Postgres/Auth/Storage option appropriate to a small team.

---

# Appendix B — Definition of done for public beta

Public beta is ready when:

- 40+ profiles exist with meaningful variety.
- At least 75% of released-game profiles are High or Medium confidence with adequate evidence.
- Pre-release profiles are visibly distinct.
- Search works for common titles/aliases.
- Mobile profile page is excellent.
- Compare or a near-term compare preview exists.
- Methodology is public.
- No public total score appears.
- Admin can publish without code edits.
- Pages load quickly.
- Analytics can tell us whether users search, compare and return.
- We have manually tested at least 10 purchase decisions and can explain how Game Profile improved or failed to improve them.

The beta is **not** blocked by:
- native apps,
- public accounts,
- social features,
- hundreds of games,
- monetization,
- personalization.

