# Game Profile — Project Context / Continuity Brief v0.6
**Purpose:** Paste/read this first when a new ChatGPT or Claude thread starts.  
**Date:** 2026-08-06

---

# 0. Amendment — brand, domain and hosting (2026-08-07)

This document predates the brand decision. Read this section first; where it
conflicts with anything below, this section wins.

- **Public product/site brand: “Should I Play?”** This is what the header, the
  metadata, the social cards and any external description of the product say.
- **Canonical production domain: `https://shouldiplay.gg`.** Registered at
  Porkbun; Cloudflare is authoritative DNS, CDN and the application host.
- **“Game Profile” is no longer the site name.** It remains the name of the
  eight-dimension evaluation this site publishes, and of the methodology
  (“Game Profile Scoring Rubric v1.0”). Internal type names, database objects
  and file names keep `GameProfile`/`game_profile` — that is correct, not a
  leftover. The rename is public-facing only.
- **Organic search is a primary acquisition channel**, so indexability is an
  architectural requirement rather than a launch chore. Every published game
  must be a server-rendered, indexable page at the permanent URL
  `https://shouldiplay.gg/games/<slug>`.
- **There is still no aggregate score — including in machine-readable form.**
  No `aggregateRating`, no `reviewRating`, no averaged dimension figure in
  JSON-LD, share cards or metadata. `tests/seo.test.ts` enforces this.
- Everything about the brand, the discoverability architecture, the hosting
  topology, analytics and the post-launch search-engine runbook lives in
  **`docs/Should_I_Play_Brand_and_SEO_Foundation_v0.2.md`** and
  **`docs/decisions/0008-cloudflare-hosting.md`**. Those are the source of
  truth for those topics; do not restate them in new strategy documents.

Unchanged by the rename: the eight dimensions, the rubric, the evidence model,
the calibration corpus (Alan Wake 2 / Returnal / Redfall) and the build order in
§11.

---

# 1. What we are building

A public website that profiles video games across a standardized set of experience/quality dimensions so a player can decide whether a game suits what they want.

The key idea:
> Do not merely tell people whether a game is “good.” Show what kind of experience it is.

The product came from Tomas’s personal `Tomas Game Fit Score v1.2`, but we deliberately removed the requirement to know the user.

The public product scores the **game once**.
Personalization may later interpret that data differently for each user.

---

# 2. Core decisions already made

## Locked unless explicitly revisited

- Website first, not native app.
- Responsive/mobile excellent.
- No public user accounts at MVP.
- No user reviews/comments/social feed.
- No public aggregate overall game score at MVP.
- Eight standardized dimensions.
- Five 0–2 subcriteria per dimension.
- Public scoring precision: 0.5 increments.
- Unknown values allowed.
- Explicit pre-release/provisional/verified states.
- Confidence shown.
- Primary pull and primary risk on every profile.
- Three recommendation blocks:
  - Great fit if…
  - Know before buying…
  - Probably not for you if…
- Controlled experience tags.
- Comparison is an important launch/near-launch use case.
- Admin/editorial tooling is a first-class requirement.
- Evidence and evaluation revisions are stored.
- AI can assist research/drafting but does not auto-publish.
- Third-party game APIs enrich metadata only; they do not own our scoring/editorial core.
- Architecture should be intentionally small-team/low-maintenance.

---

# 3. Current rubric

1. Story & Character Investment
2. Execution & Polish
3. Structure & Focus
4. Agency & Satisfaction
5. Pacing & Time Respect
6. Atmosphere & World Pull
7. Thematic & Emotional Impact
8. Medium-Specific Craft

Canonical definitions live in `Game_Profile_Scoring_Rubric_v0.1.md`.

---

# 4. Source model principles worth preserving

From Tomas Game Fit Score:
- “Story gets me through the door. Gameplay keeps me in the room. Atmosphere makes me remember the room.”
- Strong premise is not enough; execution matters.
- Weak narrative can be compensated by exceptional play/craft, but public Game Profile should show dimensions rather than hide compensation in one total.
- Open world itself is not the problem; empty bloat is.
- Agency deserves its own dimension.
- Fear/pressure and player capability should be distinguished.
- Long is fine when rich; empty time is the problem.
- Atmosphere is “a place in the head,” not graphical fidelity.
- Medium-specific craft means gameplay is part of meaning, not merely delivery.
- “On-paper themes” do not guarantee emotional impact.
- Joyful/frictionless play can be excellent without heavy philosophical themes.
- Recommendation/risk tags should remain separate from core scoring.

---

# 5. Product positioning

Not:
- Metacritic replacement
- Backlog tracker
- social review network
- universal recommendation algorithm
- “AI tells you what to play”

Instead:
- standardized profile
- purchase triage
- risk awareness
- comparison
- eventually personalized interpretation

Useful mental model:
**nutrition label for games.**

---

# 6. MVP public pages

- `/`
- `/games/[slug]`
- `/discover`
- `/compare`
- `/methodology`
- `/about`

Private:
- `/admin`
- game editor
- evaluation editor
- evidence manager
- preview/publish

---

# 7. Preferred technical direction

Default:
- Next.js 16+ / TypeScript
- Tailwind
- managed Postgres
- Supabase DB + admin Auth preferred
- Vercel deploy
- Postgres search initially
- metadata provider behind adapter

Do not add:
- microservices
- GraphQL
- separate search engine
- public auth
- social infrastructure
unless a measured need appears.

---

# 8. Content model essentials

Game and evaluation are separate.

A game can have:
- pre-release evaluation,
- launch evaluation,
- later revised evaluation.

Every evaluation knows:
- rubric version
- evidence status
- confidence
- evidence cutoff
- subcriterion scores
- dimension totals
- recommendation blocks
- tags
- primary pull/risk
- sources
- revision lineage

History must not be overwritten.

---

# 9. Initial catalog strategy

Beta target: ~40–50 profiles.

Rough mix:
- 25 established calibration games
- 10–15 current/recent titles
- 5–10 pre-release profiles

Do not chase complete game-database coverage.

Established/calibration candidates now include:
- Alan Wake 2
- Resident Evil Requiem / Resident Evil games
- Silent Hill 2 Remake
- Dead Space Remake
- Mass Effect
- RDR2
- KOTOR
- KCD2
- The Witcher 3
- AC Black Flag
- Horizon Forbidden West
- Expedition 33
- Spider-Man 2018
- God of War 2018
- Returnal
- Dragon Age games
- Hell is Us
- Gothic Remake
- Halo: Campaign Evolved
- Alien: Isolation
- The Long Dark
- Medieval Dynasty
- Beast of Reincarnation
- Rise of the Ronin

They must be rescored generically.

### First calibration wave
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

Purpose: deliberately stress narrative, agency, punishment, survival, repetition, open-world structure, remake modernization, atmosphere, friction and provisional/current-game evidence before scaling the product.

September 2026 is a useful launch context because several high-profile games cluster in that period.

---

# 10. Project roles

## Tomas
Owner, final product decision.

## ChatGPT
Product/project lead and orchestrator.
Maintains:
- requirements
- rubric coherence
- priorities
- Claude briefs
- scope control
- acceptance criteria
- continuity docs

## Claude
Engineering lead + designer.
Builds:
- app
- DB
- UI/design system
- admin
- tests
- deployment

Claude raises material tradeoffs instead of silently changing semantics.

---

# 11. Current build order

1. Calibration Rounds 1 and 2 completed; rubric frozen as v1.0.
2. Claude creates repository foundation.
3. Build typed canonical rubric + DB evaluation scope.
4. Seed Alan Wake 2, Returnal and Redfall profiles (Forspoken optional fourth).
5. Build public profile vertical slice with radar/spider + exact score rows.
6. Validate that radically different profile silhouettes are obvious.
7. DB/admin workflow refinement.
8. Search.
9. Admin/editorial UI.
10. Catalog/home.
11. Discover.
12. Compare.
13. Public beta hardening.

Do not build personalization yet.

---

# 12. The first major product test

Show someone three game profiles without telling them conventional scores.

Ask:
1. What kind of experience do you think each game is?
2. Which would you choose?
3. What would make you avoid one?
4. Did the profile tell you something a normal 8/10 does not?

If the answer is weak, fix the profile language before scaling engineering.

---

# 13. Open decisions

- final brand/product name
- visual identity
- final metadata provider/licensing
- radar chart yes/no
- exact pre-release range UI
- store links
- monetization
- whether compare is beta day-one or immediately after
- long-term user preference onboarding

None should block the first profile vertical slice.

---

# 14. Working rule for future iterations

When Tomas gives feedback, classify it:

### A. Product truth
Changes user value/meaning.
Update PRD/rubric before implementation.

### B. UX/design
Changes presentation/flow.
Add design ticket with acceptance criteria.

### C. Engineering
Changes architecture/quality.
Claude proposes solution/tradeoffs.

### D. Content calibration
Changes score/tag definitions or a profile.
Update rubric/profile data, not necessarily code.

### E. Nice-to-have
Backlog it unless it solves a current validation problem.

This protects the project from turning every thought into immediate scope.

---

# 15. Version log

## v0.4 — 2026-08-06
- Completed Calibration Round 2: Banishers, Vampyr, Observer: System Redux, Forspoken, Redfall, Crimson Desert.
- Rubric frozen as engineering-ready v1.0.
- Added low/mid score anchors.
- Approved radar/spider polygon as signature secondary visualization.
- Radar remains paired with exact numeric score rows.
- Maximum two overlaid polygons in compare mode.
- Claude handoff profiles selected: Alan Wake 2, Returnal, Redfall (+ Forspoken optional).

## v0.3 — 2026-08-06
- Completed 14-game Calibration Round 1.
- Eight-dimension architecture passed.
- Rubric advanced to v0.2.
- Added mandatory edition/mode/platform/build evaluation scope.
- Added platform-specific Technical Stability override requirement.
- Clarified scores as offering strength, not universal goodness.
- Added intent-aware navigation and Session / Progress Rhythm.
- Added current-state and remake-context rules.
- Lower-range calibration deferred to Round 2.

## v0.2 — 2026-08-06
- Expanded calibration corpus with Hell is Us, Gothic Remake, Halo: Campaign Evolved, Alien: Isolation, The Long Dark, Medieval Dynasty, Beast of Reincarnation and Rise of the Ronin.
- Defined a deliberate 14-game first calibration wave and the specific rubric stress-test role of the new titles.

## v0.1 — 2026-08-06
- Product reframed from personal Tomas Fit to standardized public Game Profile.
- No aggregate public score.
- Generic eight-dimension rubric defined.
- Evidence/confidence model introduced.
- Three purchase-oriented interpretation blocks defined.
- Responsive website + managed Postgres architecture selected.
- Claude designated engineering/design lead.
- ChatGPT designated product/project orchestrator.
- Continuity file created.



---

# 16. Signature visualization decision

The public profile uses:
1. **Radar/spider polygon** for immediate game “shape”.
2. **Eight exact score rows** for precision and accessibility.

Radar order:
Story → Theme → Atmosphere → Medium Craft → Agency → Execution → Structure → Pacing.

Do not compute or imply a total score from polygon area.


---

# 17. Evidence + external-data decision — 2026-08-06

External APIs enrich factual metadata; they do not calculate Game Profile dimension scores.

Preferred first provider:
- IGDB for title/cover/platform/release/developer/publisher/genre
- IGDB `game_time_to_beats` for runtime where available

The eight scores remain editorial:
- five 0–2 subcriteria per dimension,
- evidence mapped to those subcriteria,
- editor scores under Rubric v1.0,
- system sums to /10,
- confidence stored.

Typical released-game evidence target:
- 5–8 critic reviews,
- 1–3 specialist/creator deep dives,
- technical analysis where relevant,
- player signal where permitted,
- direct play when available.

Sources are not averaged mathematically.

Public profiles expose source counts, evidence cutoff, rubric version and per-dimension `Why this score?` details.

Do not build on unofficial HLTB scraping/wrappers in MVP. Prefer IGDB's documented time-to-beat endpoint. Steam player-review data is a useful optional signal, but usage/commercial terms require review before it becomes a public product dependency.


---

# 18. Pre-release operating model — 2026-08-06

Pre-release games are a first-class subset.

Internal evidence maturity:
- ANNOUNCED
- SHOWCASED
- HANDS-ON
- REVIEW-CODE / PRE-LAUNCH REVIEWS

Rules:
- first-party-only material does not justify a complete eight-score profile,
- target ~3+ substantive independent hands-on sources for a normal Medium-confidence pre-release profile,
- overall PRE-RELEASE confidence cannot be High,
- dimensions use precise estimate / range / Unknown depending on evidence,
- risky-to-infer areas include full narrative payoff, runtime justification, late-game repetition, launch stability and lasting impact,
- public trust line names evidence types,
- pre-release recommendation blocks use `Looks promising if / Watch before buying / Biggest unknowns`,
- pre-release evaluation is preserved at launch and superseded by a new post-release evaluation,
- first post-release profile may be PROVISIONAL.

Canonical details: `Game_Profile_Editorial_Evidence_and_Data_Sourcing_SOP_v0.2.md`.
