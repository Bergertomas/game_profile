# Should I Play? — Master Product & Build Plan v0.9

**Public product / site:** Should I Play?
**Evaluation and methodology:** Game Profile
**Canonical domain:** https://shouldiplay.gg
**Product owner and final decision maker:** Tomas
**Product and project orchestration:** ChatGPT
**Engineering:** Codex and Claude
**Public product design:** Tomas, ChatGPT, and the reconciled Fable design work
**Status:** Current product and roadmap constitution — amended through accepted Gate A, Gate B and full Compare direction, the completed shared handoff, Engineering Slice 1 merged on `main`, and the Slice 2 homepage system; Scoring Protocol calibration remains active
**Current checkpoint:** Phase 2's editorial/publishing architecture is substantially complete and in support mode. Gate A A1/A2 Rev 5.1, Gate B A3–A6 and full Compare C1–C4/C-rail are accepted. ADR 0013 is superseded; ADR 0031 governs the static Search index; ADRs 0033/0034 govern Compare. The cross-surface design-system and interaction handoff is complete. Engineering Slice 1 — the canonical shared tokens/font foundation, the editorially governed static Search and its four truthful states, accessible inline/header Search, and the bounded accepted homepage opening — is merged on `main`. Engineering Slice 2 completes the accepted homepage system on top of it: the “Start somewhere interesting” poster rail, the authored-shelf grammar with objective/evergreen/living kinds, publication windows, expiry and evergreen fallback, and the bounded “Choosing between…” presentation contract whose route into full Compare is explicitly deferred. Its qualitative editorial configurations ship empty pending owner-approved membership under P0.3. The accepted profile experience and full Compare follow. The first application-originated Cloudflare Builds dispatch and one complete new-profile Publish → dispatch → Live cycle remain unexercised and will be proved by the first real catalog publication, not by further standalone admin hardening.
**Public-product state:** production still exposes the earlier three-profile experience. The shared foundation and static Search are merged on `main` and the accepted homepage system is implemented on top of them; **production deployment of either remains pending** and is a separate, deliberate step. The accepted A3–A6 profile migration, deterministic What should I play?, exactly-two Compare, accountability, catalog, time/session guidance, storefront actions, governed analytics and mixed-artwork product remain unbuilt. The 12–15-profile corpus is a private validation milestone; quiet public release requires approximately 100 substantive profiles.
**Date:** 2026-08-26 · **Gate A amendment:** 2026-08-28 · **Gate B/Search amendment:** 2026-08-30 · **Compare acceptance:** 2026-08-31 · **Slice 1 integration:** 2026-09-01 · **Slice 2 homepage system:** 2026-09-01

---

## 0. Purpose, authority, and how to use this plan

### 0.1 Purpose

This document is the current operating specification for **Should I Play?** It defines the product we are building, the decisions already locked, the architecture those decisions require, the active delivery sequence, and the current backlog.

It is a **current-state constitution**, not a chronological amendment log. Master Plan v0.8 remains in the repository as history; v0.9 supersedes it for current product scope, information architecture, roadmap status, architecture direction, and cross-system contracts.

The immediate product objective is:

> **Turn the stable methodology and substantially complete publishing machine into a deliberately art-directed public product, validate it on 12–15 real profiles, then build a launch-quality catalog of approximately 100 substantive profiles.**

Public-product value now dominates engineering effort. Admin work continues only
where a concrete issue blocks data integrity, security, truthful publication or
proof, the ability to publish content, or the public product itself. The admin
is a one-editor internal tool and is not to be made SaaS-grade merely because an
edge case exists.

### 0.2 Canonical document set

| Document | Authority |
|---|---|
| **Should_I_Play_Project_Consolidation_Report_2026-08-26.md** | Reader-facing reconstructed chronology, decision/conflict register, plan audit and immediate agenda; navigation aid only, with no independent authority over the documents below |
| **Game_Profile_Master_Product_and_Build_Plan_v0.9.md** | Product scope, positioning, public/admin IA, roadmap, current phase status, architecture direction, and cross-system product contracts |
| **Should_I_Play_Public_Product_P0_Decisions_2026-08-24.md** | Governing owner decisions for the homepage, scoring-protocol direction, catalog/launch target, homepage curation, accountability, and artwork posture |
| **Should_I_Play_Public_Product_Resolutions_2026-08-25.md** | Later governing decisions for Search, What should I play?, metadata, time/session guidance, analytics, commerce, catalog operation, release posture, personalization sequencing, and the corrected artwork basis |
| **Game_Profile_Scoring_Rubric_v1.0.md** | Scoring semantics: dimensions, subcriteria, score meanings, scope rules, Unknown/range behavior, platform-sensitive scoring, and rubric versioning |
| **Game_Profile_Editorial_Evidence_and_Data_Sourcing_SOP_v0.2.md** | Evidence operations: source collection, mapping, confidence practice, transparency, and pre-release workflow |
| **Game_Profile_Scoring_Protocol_v1.0_DRAFT.md**, its package schema and ADR 0024 | Owner-approved candidate evidence-to-number protocol and reproducibility contract authorized for calibration; not governing until the ten-game development/holdout program and deferred gates pass and Tomas gives final approval |
| **Game_Profile_Calibration_Round_1_Report_v0.1.md** and **Game_Profile_Calibration_Round_2_Report_v0.1.md** | Approved calibration outcomes and canonical calibration content they explicitly publish |
| **Should_I_Play_Brand_and_SEO_Foundation_v0.2.md** | Brand/domain rationale, organic-acquisition strategy, and launch/runbook layer; current routing/hosting contracts are governed by this Plan and accepted ADRs |
| **Game_Profile_Art_Direction_and_Anti_AI_Design_Brief_v0.1.md**, D3 record, superseded ADR 0013, **Should_I_Play_Fable_Reconciliation_Brief_2026-08-26.md**, **Should_I_Play_Fable_Visual_Completeness_Audit_2026-08-26.md**, and **Should_I_Play_Fable_Canonical_Screen_Mission_2026-08-26.md** | Historical visual principles, anti-patterns and reconciliation evidence. ADR 0013 no longer governs the public visual system |
| Fable **Should I Play - Canonical Screens.dc.html**, A1–A6/C1–C4 and rails, plus ADRs 0030, 0032, 0033 and 0034 | Accepted homepage/profile/full Compare visual and interaction direction. The artifact complements this Plan; it does not replace product, methodology, evidence, data, artwork, or implementation contracts |
| **Should_I_Play_Shared_Design_System_and_Interaction_Handoff_v1.0_2026-08-31.md**, its token JSON and accessibility/conformance matrix | Current cross-surface implementation specification beneath the accepted visual ADRs: semantic tokens, components, states, responsive behavior, truth fallbacks, focus/keyboard behavior and conformance acceptance |
| **Should_I_Play_Score_and_Radar_Audit_2026-08-28.md**, **Should_I_Play_Gate_B_Profile_Brief_2026-08-28.md**, and **Should_I_Play_Gate_B_Fable_Result_Review_2026-08-29.md** | Read-only calibration/visualization findings, the bounded A3–A6 implementation contract and its acceptance evidence. The audit diagnoses existing values; it does not authorize score changes |
| ADR 0031 | Governing MVP Search architecture: editorially included static build-time index, no request-time public database/service |
| **Should_I_Play_Opus_Engineering_Readiness_Audit_2026-08-30.md** | Evidence-backed repository audit and reconciliation record; useful implementation evidence but not governing authority |
| **ADRs in docs/decisions** | Accepted implementation and architecture decisions beneath the product/methodology contracts |
| **README.md** | Operational onboarding and concise repository-as-implemented summary |
| **Code, schema, migrations, tests** | Evidence of implementation state and enforcement; they do not silently redefine product or methodology |

Historical Project Context, older Master Plan versions, ADR 0013 and superseded
Fable explorations are continuity records, not current visual authority. Within
the current Fable project, A1/A2 Rev 5.1 governs the homepage, A3–A6 governs
the profile direction and C1–C4/C-rail governs full Compare. A7 is reconciled
by the shared handoff and remains subordinate to that implementation contract.
Example values, polygons, copy, dates, roster, practical time and
artwork in any Fable screen are illustrative unless independently grounded by
canonical content and evidence records.

### 0.3 Authority boundaries

- The Master Plan does **not** redefine Rubric v1.0. Scoring meaning belongs to the rubric.
- The Master Plan does **not** replace the Evidence SOP. Evidence collection and confidence operations belong to the SOP.
- Sources support editorial judgments; they are never votes mathematically averaged into scores.
- ADRs decide implementation beneath the product/methodology contracts. An ADR may not silently change product meaning.
- If implementation exposes a genuine product conflict, escalate it rather than normalizing the conflict in code.
- An explicitly approved product decision made after this version may supersede the relevant Plan section, but must be recorded in an ADR or the next Plan revision.

At every major phase checkpoint:

1. compare this Plan with README, accepted ADRs, schema, routes, tests, and deployment behavior;
2. reconcile approved material changes;
3. correct operational docs that contradict implementation;
4. preserve older versioned documents rather than rewriting history.

### 0.4 Conflict protocol

When two sources disagree:

1. identify which document owns the subject;
2. prefer the newest explicit approved decision within that subject;
3. do not infer product meaning from whichever behavior code currently happens to implement;
4. request a product decision only if the authority is genuinely ambiguous;
5. record the resolution so the conflict does not recur.

---

## 1. Product identity and thesis

### 1.1 Brand architecture

**Should I Play?** is the public product, website, wordmark, metadata identity, and external description.

**Game Profile** is the eight-dimension evaluation and methodology. Internal identifiers such as `GameProfile` and `game_profile` may retain that name.

### 1.2 Product promise

> **Not just whether a game is good. What kind of good is it?**

Should I Play? describes the **shape of an experience** so a player can infer fit before spending money and time. The mental model is a nutrition label / scouting report for games: standardized, comparable, interpretable, transparent about uncertainty, and useful without pretending taste is universal.

### 1.3 Core principles

- There is **no public aggregate Game Profile score**.
- There is no hidden aggregate in metadata, JSON-LD, share cards, search ranking, or default sorting.
- A low dimension score may be intentionally descriptive rather than a verdict that the game is bad.
- Unknown is not zero.
- Range is not fake precision.
- Confidence and evidence maturity describe what is known, not how impressive a number looks.
- Sources support judgments; they do not calculate them.
- Historical published evaluations are preserved.
- A materially distinct evaluated experience gets its own profile scope rather than being averaged with another mode/edition.
- The public product must remain useful without accounts, social data, personalization, or AI chat.

### 1.4 Product moat

The defensible system is the combination of:

1. a stable public rubric;
2. structured evidence and confidence practice;
3. multidimensional comparability;
4. purchase-oriented interpretation;
5. durable scope and revision history;
6. a recognizable editorial/data-visualization instrument;
7. an editorial workflow capable of producing high-quality profiles consistently;
8. later personalization derived from the same public profile rather than replacing it.

---

## 2. Users, jobs, goals, and non-goals

### 2.1 Primary user

A player who buys several games a year, has limited time or budget, understands that “good” and “for me” differ, and does not want to consume many long reviews to make one purchase decision.

### 2.2 Core jobs

**Purchase triage** — choose among several credible games.
**Risk detection** — expose structure, friction, punishment, pacing, pressure, or other mismatch risks conventional review scores can hide.
**Experience expectation** — explain what many hours inside the game are likely to feel like.
**Fast research** — provide a credible picture without requiring a review marathon.

### 2.3 Product-validation and public-launch goals

The first 12–15 substantive profiles form a **private or limited
product-validation corpus**, not the broadly marketed public launch. That corpus
must be sufficient to validate the real homepage, Search/Discovery, Compare,
mobile behavior, mixed artwork/artless states, and the scoring/publication
pipeline.

Broad public launch requires approximately **100 substantive profiles**. The
exact title list is a curation/execution task, but it must prioritize recognizable
games people are deciding whether to play, meaningful variation across the eight
dimensions, useful related comparisons, a reasonable spread of eras/genres/
scales, and evidence availability. Rigid genre quotas are not required.

At either milestone, a visitor should be able to:

- find a game;
- compare exactly two profiles without receiving a universal winner;
- explore through a truthful question, experience, or curated collection;
- understand its main strengths quickly;
- understand its main risk/friction;
- read all eight dimensions and exact values;
- distinguish exact, range, and not-scored states;
- see scope, evidence state, confidence, and cutoff;
- inspect why a dimension received its score;
- understand meaningful profile differences;
- verify that a visible methodology exists.

### 2.4 Editorial-system goal

A non-coding editor should be able to:

- create and maintain a game;
- define one or more profile scopes;
- author a new evaluation or revision;
- manage evidence, scores, confidence, platform overrides, tags, and interpretation;
- preview and validate the public result;
- publish transactionally;
- trigger and observe deployment;
- distinguish editorially Published from actually Live;
- revise without mutating historical final snapshots.

That capability is now an operational support system, not the roadmap's primary
product. The first real catalog publication will prove the remaining application
dispatch path. Further internal work requires a concrete public-value, integrity,
security, or truthful-publication blocker.

### 2.5 Current non-goals

Do not build for the current product:

- native mobile applications;
- public user accounts;
- user reviews/comments/follows/activity feeds;
- community scoring/moderation;
- public list creation;
- AI chatbot;
- recommendation machine learning;
- storefront checkout or key sales;
- price tracking/deal alerts;
- game diary/backlog tracking;
- wiki-scale community metadata editing;
- automatic review-text scraping;
- a public aggregate score.

Personalization, saved games, notifications, live price/deal tracking, an API,
and embeddable profiles remain later layers. Verified ordinary storefront links
are part of the launch profile contract; processing transactions is not.

---

## 3. Game Profile methodology contract

Rubric v1.0 remains authoritative for score semantics. This section defines how the product consumes it.

### 3.1 Canonical dimensions

Rubric/editorial order:

1. Story & Character Investment
2. Execution & Polish
3. Structure & Focus
4. Agency & Satisfaction
5. Pacing & Time Respect
6. Atmosphere & World Pull
7. Thematic & Emotional Impact
8. Medium-Specific Craft

Each dimension has five canonical subcriteria scored on `0 / 0.5 / 1 / 1.5 / 2 / Unknown`. Dimension totals are **derived**, never entered directly.

### 3.2 Public score representation

- Exact values display on a 0–10 scale in 0.5 increments.
- Unknown never becomes zero in storage, derivation, geometry, or copy.
- Supported uncertainty remains a range.
- Missing required data is bad data, not “Unknown evidence.”
- Radar is always paired with exact score rows.
- No polygon area, mean, weighted total, or inferred universal score is exposed as a rating.

Fixed public/radar order:

1. Story & Characters
2. Thematic & Emotional
3. Atmosphere & World
4. Medium-Specific Craft
5. Agency & Satisfaction
6. Execution & Polish
7. Structure & Focus
8. Pacing & Time Respect

### 3.3 Mandatory evaluation scope

Every evaluation snapshot declares:

- product/edition;
- campaign/mode;
- covered platforms;
- build, patch, or current-state cutoff;
- evidence cutoff.

If a mode or edition materially changes the experience, it receives a separate profile scope and evaluation history. Scope identity is explicit data, not string matching.

### 3.4 Platform-specific variation

The canonical base subcriterion remains the value used to derive the generic profile. Material deviations live in `subcriterion_platform_overrides`.

Overrides:

- do not change base totals;
- may be Unknown;
- require a rationale;
- refer only to a platform the game ships on;
- fall back to the base where absent;
- do not silently create a second profile.

### 3.5 Evidence, confidence, and provenance

Each evaluation carries:

- evidence status: Verified / Provisional / Pre-release;
- overall confidence;
- per-dimension confidence;
- evidence cutoff;
- pre-release maturity when applicable;
- evidence-ledger state;
- source relationships;
- score provenance.

Pre-release maturity states: **Announced, Showcased, Hands-on, Review-code**.

Evidence-ledger state distinguishes `pending` from `populated`. Public source counts remain suppressed while reconciliation is incomplete and, when shown, count distinct sources rather than links.

Score provenance is:

- **editorial** — ordinary rubric-based editorial work;
- **calibration** — approved through a named calibration round;
- **derived** — produced without editorial sign-off and accompanied by an explanation.

### 3.6 Interpretation contract

Released profiles use:

- Great fit if…
- Know before buying…
- Probably not for you if…

Pre-release profiles use:

- Looks promising if…
- Watch before buying…
- Biggest unknowns…

Each profile also carries one-line experience, Primary Pull, Primary Risk, controlled experience tags, and platform warning where necessary.

### 3.7 AI boundary

The locked methodological direction is **claim-level rubric synthesis**, not
source-score aggregation. GPT Chat initially performs separate research,
primary-scoring and blind-audit contexts against one frozen evidence corpus.
Concrete scoped claims are mapped to explicit rubric anchors and counterevidence;
external review grades, aggregates, popularity, outlet prestige and general
positive/negative sentiment are not scoring inputs.

Five independent substantive evidence clusters is a genuine-scarcity floor;
eight to ten is the normal AA/AAA target. More are collected only where material
variance, instability, disagreement, live-service change or complexity requires
them. Count establishes collection sufficiency, never a score.

Tomas remains the accountable final editor. Codex or Claude may validate and
import an approved package and implement deterministic mechanics; no automated
process may score and publish without owner approval. AI must not fabricate play
or sources, silently resolve material disagreement, turn marketing claims into
quality evidence, or present the output as an objective AI verdict.

The detailed **Scoring Protocol v1.0 remains a candidate**. Before it governs
bulk catalog production it must pass its registered ten-game program: six
development cases and four untouched holdouts, with the exact/adjacent,
confidence, endpoint, traceability and derivation gates in the candidate
protocol. Until approval, the project must not describe the method publicly as
proven reproducible.

---

## 4. Profile identity, history, and public routing

### 4.1 Identity model

A Game Profile is **one evaluated experience of a game**, not the game row itself.

```text
game
  ├── profile scope "survival"
  │     └── v1 pre-release → v2 launch → v3 post-patch
  └── profile scope "wintermute"
        └── v1 launch → v2 post-patch
```

Each scope owns:

- stable key;
- public label;
- summary of what it covers/excludes;
- display order;
- explicit `is_primary` flag;
- independent version numbers;
- independent supersession chain.

Edition, mode, platforms, and build remain on each evaluation snapshot.

### 4.2 Publication/version rules

- At most one Published evaluation may exist per profile scope and rubric version.
- Draft, Review, Published, and Superseded are explicit states.
- Published and Superseded evaluations are immutable final snapshots.
- Corrections create new versions.
- Supersession is rubric-local, game-coherent, and scope-local.
- `PUBLIC_RUBRIC_VERSION` is the explicit public cutover selector.
- Public selection filters on Published + public rubric version; it does not choose “latest,” highest version, or first row.

### 4.3 Canonical route contract

```text
/games/[slug]              → explicit primary scope
/games/[slug]/[scope-key]  → published sibling scope
```

There is no generic intermediary game-overview page at the bare slug.

The database enforces:

- at most one primary scope per game;
- for every rubric version under which a game publishes any scope, its primary scope must also have a Published evaluation under that rubric.

### 4.4 Canonicalization and errors

- Primary profile canonicalizes to the bare game URL.
- Sibling canonicalizes to its own scoped URL.
- `/games/[slug]/[primary-key]` permanently redirects 308 to the bare URL.
- Sitemap lists each current public profile exactly once.
- Share cards, metadata, breadcrumbs, and JSON-LD resolve the actual scope.
- Unknown game/scope, draft-only scope, or scope without a current Published evaluation returns 404.
- A route never falls back from an unpublished primary to a sibling.

### 4.5 Multi-scope navigation — implemented

The public **scope switcher is implemented** and appears only when a game has at least two published profile scopes. It:

- links to each profile’s own canonical URL;
- makes the current scope explicit;
- uses the public label and current scope summary where useful;
- never client-swaps two evaluations behind one URL;
- remains absent for the ordinary single-scope case.

The behavior is proved against an explicitly synthetic multi-scope test corpus that is forbidden from production builds.

### 4.6 Identity-change policy

Identity changes are not ordinary content edits:

- a **scope key freezes as soon as the scope has any evaluation history**, including Draft;
- a **game slug freezes once any profile for that game is Published**;
- labels, summaries, and display order remain editable metadata;
- a genuine later slug/key rename requires migration-level work and a redirect/history decision.

These rules are enforced in the write layer, not merely hidden in the UI.

---

## 5. Public information architecture

### 5.1 Implemented routes

- `/` — accepted homepage system: the decision-first proposition with Search inside it, the three-game mosaic, the “Start somewhere interesting” poster rail, the authored shelves, the secondary “Choosing between…” module and the explanation.
- `/games/[slug]` — primary Game Profile.
- `/games/[slug]/[scope-key]` — sibling profile scope.
- `/methodology` — public methodology generated from the canonical typed rubric.
- `robots.txt` / `sitemap.xml` — generated from site environment and public profile data.

### 5.2 Resolved public-product IA

The homepage is an **art-led, utility-first entrance to a profile-first Field
Guide**. Registry describes the underlying retrieval behavior; it is not the
public proposition. The entrance supports three separately named journeys:

1. **Search** — the dominant known-title path over titles, aliases, editions and
   scopes;
2. **Compare** — the major secondary action for exactly two profiles, including
   a compact shape-first homepage preview before the full comparison;
3. **What should I play?** — progressive needs-based discovery through curated
   prompts, browsing/filters and bounded ordinary-language interpretation.

The labels and the A1/A2 Rev 5.1 conceptual hierarchy are locked. Search is
embedded into the opening composition and selected by default. Compare remains
immediately available but never becomes the default homepage subject. What
should I play? unfolds progressively rather than competing as an equal
oversized tab. The accepted homepage composition is:

- the decision-first **“Should you play it?”** proposition;
- a dark, cinematic and deliberately art-directed opening;
- the exact journey labels **Search / Compare / What should I play?**;
- a three-game artwork mosaic with integrated Game Profile fingerprints;
- expanded interactions that keep artwork visible;
- a general **“Start somewhere interesting”** poster rail;
- authored factual, evergreen and living discovery shelves after that rail;
- **“Choosing between…”** retained as a secondary curated module;
- the same conceptual hierarchy on desktop and mobile.

The freeze is directional and structural. Exact publication copy, game roster,
dates, scores, polygons and artwork rights do not become true because they
appear in the prototype.

The opening hero/artwork composition may be modestly shorter in production so
Search carries greater visual prominence. This is a bounded conformance
refinement: it must preserve the accepted composition, fingerprints, artwork
continuity and first-viewport Search availability.

There is no ranking feed, launch personalization, generic registry table,
automatic carousel, fake activity, or oversized search-only homepage.

Planned routes/surfaces:

- global Search behavior shared by homepage and public navigation, including
  published, recognized-unprofiled, ambiguous and unrecognized states. ADR
  0031 governs an editorially included static build-time index; there is no
  request-time public database or provider call;
- `/compare` — exactly-two-profile launcher;
- canonical two-profile comparison results subordinate to their source
  profiles. The dedicated Compare pass decides URL shape and index policy;
- a durable noindex What should I play? result state supporting refinement,
  trade-offs, sharing, refresh and browser navigation; exact route name is a
  design/IA implementation detail;
- `/about` — editorial identity, independence, funding, method and corrections;
- a route to all profiles when the catalog presentation requires it.

A traditional taxonomy-first `/discover` room remains later. The launch What
should I play? product already uses controlled facets, experience
classifications and visible criteria; it must not be renamed to Discover or
presented as an unrestricted AI chat.

### 5.3 Admin routes

Implemented in 2B:

- `/admin` — dashboard foundation;
- `/admin/games` — catalog administration;
- `/admin/games/new` — manual game creation;
- `/admin/games/[id]` — metadata, aliases, platforms, provider IDs, artwork records, profile scopes, primacy, evaluation history.

Planned for 2C/2D:

- `/admin/evaluations/[id]` — evidence, scores, confidence, overrides, tags, interpretation, preview, validation, publication/revision.

Admin routes are never public IA: they are authenticated, non-indexable, no-store, excluded from sitemap, and hidden as 404 when the editorial surface is not enabled.

### 5.4 Compare contract

Compare is launch-critical, subordinate to profiles, and limited to exactly two
profiles for the resolved product. It aligns scope/evidence state, all eight
dimensions, Primary Pull/Risk, key experience tags and material platform
warnings. It explains **differences and trade-offs, not winners** and never
introduces an aggregate, ranking, match percentage or universal verdict.

The homepage preview is shape-first: comparative shape, concise deterministic
interpretation, then the route to full Compare. An overlaid radar is currently
preferred but remains subject to accessibility/design validation. Wherever
comparative shapes appear, the product visibly explains that a bigger shape is
not better.

Exact values and ranges are intervals; Unknown has no interval. Each pair is
objectively equal, intersecting, disjoint or undetermined before a separate
presentation heuristic chooses which differences to summarize. Ranges are not
midpointed, confidence does not change the geometric relation, and the aligned
eight rows remain authoritative. Initial summary prominence thresholds remain
presentational defaults to test on the validation corpus, not rubric semantics.

The launcher permits arbitrary published pairs, including the same game across
different scopes. Scope-aware identity is required. ADR 0033 fixes an
order-preserving `/compare?games=<left>,<right>` share state: pair URLs are
`noindex, follow`, absent from the sitemap and rating/review schema, and are not
all prerendered. Unordered normalization is internal-only and never reorders
the displayed sides.

The primary full Compare composition is art-led: two equal artwork territories
frame a central two-profile radar, visually prominent differences/alignments
and canonical Shared/left-only/right-only tags. Art never indicates a winner.
Every pair must also have a complete artless parity state, and all values,
relations, tags and evidence remain understandable without imagery.

Exactly two is the MVP and resolved public contract. Older two-to-four language
is superseded for MVP; three/four-game Compare remains deferred and requires a
new product decision.

Individual profiles include an editor-selected “Compare with” entry point. It
must not be described as popular or commonly compared without usage evidence.

---

## 6. Public Game Profile and visual system

### 6.1 Chosen direction and gate boundary

ADR 0013 is superseded. The accepted Fable A1–A6 screens and ADRs 0030/0032
govern the public visual, information-hierarchy and interaction direction:

> decision answer → game/scope identity → Pull/Tax/fit/practical commitment → fixed-scale profile instrument → trust/platform detail → useful exits

A1/A2 Rev 5.1 governs the homepage and must not be redesigned or rediscovered.
A3–A6 governs the art-led/artless desktop/mobile profile and is accepted. D3
and ADR 0013 remain historical implementation lineage, not authority over the
new screens.

The accepted screens do **not** approve illustrative scores or radar shapes,
specimen practical time, profile copy not grounded in canonical content, dates,
example roster, destination records, or artwork clearance. They authorize
implementation of hierarchy and behavior, not fabrication of publication
facts.

Production must resolve the known Gate A cautions:

- desktop expanded radar labels shown near 9px require a genuinely readable
  size or an aligned supporting value list;
- expanded-state controls require coherent semantics and keyboard order,
  including the secondary profile link, without a focus trap;
- mobile Search must remain available without introductory scrolling at
  390×667, narrower widths and text zoom;
- artwork remains subject to the lawful-artwork policy and the complete no-art
  fallback;
- no missing Fable verifier message may be treated as production proof;
- unfinished dimension values and their polygons must not be copied into
  production.

### 6.2 Visual constitution

- The public opening is dark, cinematic and deliberately art-directed.
- Gate A's coral brand voice, cyan evidence role and JetBrains Mono
  evidence/numeric voice supersede ADR 0013's amber-led shared system.
- Gate B may use warm-paper reading grounds and Newsreader for extended
  editorial prose inside the accepted profile composition; shared token roles
  are finalized in the handoff, not inferred from A7.
- Each game contributes one identity accent; color never means quality.
- Archivo remains the primary display/label face. Typography, contrast and
  ruled separation carry hierarchy.
- No card soup, generic SaaS dashboard language, glassmorphism, neon gamer styling, HUD decoration, black-purple gradients, generic component-library identity, or green/red quality semantics.
- One canonical radar implementation serves the product.
- Production token values must be contrast-measured on their actual grounds;
  historical ADR 0013 ratios cannot be copied onto the dark system.

Admin may be denser and more utilitarian than the public site. It receives no
broad design pass unless usability blocks real content production.

### 6.3 Profile hierarchy

A profile presents:

- game identity/hero stage;
- explicit evaluated scope/build, full platform identities and evidence state;
- one-line experience;
- balanced public Pull / Tax;
- concise fit guidance;
- approved total commitment and useful-session facts, or truthful Unknown/
  omission where the record does not support them;
- full labelled radar plus eight permanent exact rows, confidence and
  rationales;
- pre-release/provisional/range/Unknown treatment where applicable;
- detailed fit, evidence, corrections and provenance;
- material platform warning, performance note, subcriterion platform note and
  platform override wherever it changes the playing decision;
- sibling switcher where applicable;
- an editor-selected “Compare with” entry point;
- additional profiles as the exit.

Poster/profile components must never derive a commitment band from Fable's
Alan Wake 2 specimen. Practical-time values require an approved scope-aware
record; otherwise render `Unknown` or omit an optional summary. Platform notes
and overrides are a Gate B truthfulness requirement and never change base
dimension totals.

The public meaning and data source for **Evaluated** remains open: implementation
must explicitly choose `evidence_cutoff_at`, `published_at` or a separately
modelled field and align the label to that meaning.

### 6.4 Artwork intent and fallback

Should I Play? will pursue an **artwork-forward mixed launch**. Authentic game
artwork is material to recognition, emotion and catalog richness, but it is not
a binary requirement for every profile. Cleared authentic artwork and the
deliberately designed artless state coexist in the launch catalog.

Cover and hero are separate roles; a cover is never stretched into a landscape
hero. Search, cards, profiles, authored homepage collections and the art-led
Compare composition may use artwork under the approved policy. Compare uses two
equal artwork territories and a complete artless parity state under ADR 0033.
Missing artwork must not create a placeholder, empty frame, layout hole or
inferior surface. Artwork must remain rights-aware and cannot render publicly
without production clearance.

---

## 7. Artwork and external-data policy

### 7.1 Rights-aware artwork

Every artwork row carries:

- game + role;
- URL + dimensions;
- source;
- clearance (`production` or `evaluation`);
- basis (`licence`, `provider-terms`, `press-kit`, `permission`,
  `editorial-fair-use`, `internal-evaluation`);
- audit metadata where applicable (credit, source page, retrieval date, provider id, alt/crop data).

Production clearance cannot rest on `internal-evaluation` basis. Production artwork must be auditable.

### 7.2 Containment

- Evaluation-only artwork cannot enter production output, including serialized client payloads.
- Public DB reader filters clearance before constructing `ProfileView`.
- Production artifact scanning remains mandatory.
- Preview `noindex` is not access control.
- Preview URLs containing unpublished/evaluation material require Cloudflare Access before they are treated as private review surfaces.

### 7.3 Production artwork work still required

Eligible candidates are official publisher/developer sites and press kits,
official publisher-supplied storefront assets, licensed providers, or direct
rights-holder permission. Community/fan artwork, user-uploaded screenshots and
unattributed image-search results are excluded without individual permission.
Public reachability is not a licence.

Every production use records source page, asserted basis, rights-holder credit,
retrieval date, dimensions, role and clearance. The product uses web-appropriate
resolution, distributes no standalone originals, performs no generative
alteration, avoids misleading crops, maintains a rights-holder removal channel,
and promptly removes or replaces a credibly disputed asset.

Acquisition priority is: homepage editorial features, major recent releases,
high-interest profiles, cards where recognition materially helps, then the rest
of the catalog. No artwork-coverage percentage is a launch gate.

Editorial fair use is now an approved independent basis for appropriate official
promotional artwork used to identify, navigate to, or directly illustrate a
substantive evaluation or criticism. It is not a blanket exemption for large
decorative atmosphere, standalone/original distribution, fan art or paid
advertising. Compare artwork is eligible only under ADR 0033 when it directly
identifies the two works inside a substantive comparison and the complete
artless state remains available. Explicit provider terms, press-kit permission,
licence or direct permission remain useful risk-reduction and scaling channels, not a
precondition that displaces the approved editorial basis.

The lawful artwork path remains seven explicit steps. Completed code or an
accepted art-led design does not collapse the operating gate:

1. **Legal review — OPEN:** obtain a proportionate, jurisdiction-aware review
   of the intended written editorial-fair-use policy and placements.
2. **ADR — DONE:** ADR 0011 records editorial fair use as a bounded basis.
3. **Enum migration — PARTIAL:** forward migration
   `0010_artwork_fair_use` exists; apply it to the authoritative database before
   deploying code or data that relies on the value.
4. **Types and validation — DONE:** application/schema validation and guarded
   production-clearance semantics recognize the explicit basis.
5. **Admin/import path — DONE IN FOUNDATION:** the one-editor input path can
   record the basis; no import may production-clear an asset automatically.
6. **Written operating policy — OPEN:** document source eligibility, editorial
   placement, attribution, resolution, storage/proxy/hotlink behavior,
   standalone-download prohibition, dispute handling and takedown.
7. **Containment re-verification — OPEN FOR REAL ASSETS:** retain per-asset
   provenance and the complete artless fallback, then re-run production
   containment against the first real cleared assets and every material path
   change.

No production asset may rely on editorial fair use until all seven steps are
closed for the relevant operating state.

GPT may identify candidates and prepare provenance. Codex or Claude may
implement ingestion and validation. Tomas alone approves production basis and
final visual selection; no automated process may production-clear an asset.

### 7.4 Metadata providers/runtime

Discovery metadata uses provider-first layered ownership. One approved primary
provider supplies routine facts; official publisher/developer/platform/store
sources take precedence for critical, disputed or volatile facts; secondary
providers fill meaningful gaps rather than being merged routinely. Imported
values retain provenance/freshness and map into a provider-independent internal
vocabulary. Approved corrections survive refreshes and manual records remain
valid.

IGDB is the preferred initial candidate, not yet approved pending written
commercial/image terms and a representative ~30-game data test. RAWG is a
contingency. Public pages never depend on a live provider request, and provider
ratings, popularity, classifications or artwork availability cannot alter Game
Profile evaluations.

Total commitment and session suitability are separate. Runtime is scoped,
sourced provider-backed context and cannot feed scores. HowLongToBeat remains a
candidate only; an unofficial scraper is not an approved production source.

---

## 8. Editorial system specification

### 8.1 Complete workflow

```text
Game metadata
  → Profile Scope
  → Evaluation / Revision
  → Evidence
  → 5 subcriteria × 8 dimensions
  → Derived dimension states/totals
  → Per-dimension + overall confidence
  → Platform deviations
  → Controlled tags
  → Interpretation
  → Preview
  → Validation
  → Editorial publication
  → Rebuild/deployment
  → Live
```

The editor authors the existing public product. It does not create a second methodology, scoring system, domain model, or renderer.

### 8.2 Admin identity and authorization — locked after Phase 2B

**Cloudflare Access is the editorial identity for every remote deployment.** The Worker verifies the Access assertion; the edge policy alone is not treated as sufficient.

Authorization layers:

- Cloudflare Access blocks unauthenticated remote requests at the edge;
- every exported admin **read entrypoint** authorizes before opening the editorial database;
- every Server Action authorizes before mutation;
- the admin layout also guards as UX/defense in depth.

`requireEditor()` is request-scoped/memoized, not global auth state.

No password store, user table, reset flow, public login system, speculative RBAC, or custom identity platform is introduced.

### 8.3 Local development identity

`ADMIN_DEV_IDENTITY` is a **genuine local `next dev` convenience only**. It requires both:

- non-production site environment; and
- `NODE_ENV === development`.

A production-compiled Cloudflare preview can never use the development identity. Any remote deployment requires Cloudflare Access.

### 8.4 Admin operating policy: activated, one-editor, subordinate

Remote `/admin` is active behind Cloudflare Access and the Worker verifies the
assertion. Authenticated production editorial reads use the restricted Hyperdrive
transport, whose query caching is disabled. A successful production-manifest
observation has been persisted and the three current profiles read Live.

The admin remains a one-editor internal tool. Its accepted limits include manual
reconciliation/retry, no RBAC or multi-tenant organization model, no account
onboarding, no queue/cron/background poller, and no separate visual-design phase.
Reopen an internal issue only when real catalog work demonstrates a blocker.

### 8.5 Game/scope administration — Phase 2B complete

The admin currently supports:

- manual game creation;
- canonical title, slug, aliases, developer, publisher, release state/date, summary;
- platforms and performance notes;
- provider IDs;
- rights-aware cover/hero artwork records;
- profile scope creation/editing;
- explicit primary-scope management as a separate deliberate action;
- evaluation-history visibility;
- explanation of primary-publication blockers;
- dashboard foundation and actionable catalog state.

Identity locks described in §4.6 are enforced server-side.

### 8.6 Evaluation editor — Phase 2C complete

An editor must be able to:

- start a Draft for a selected scope;
- choose evaluation context (pre-release/launch/post-release/retrospective);
- declare edition, mode, platforms, build, and cutoffs;
- attach/map evidence;
- score all 40 canonical subcriteria;
- record rationales and confidence;
- add material platform overrides;
- manage tags;
- write one-line experience, pull, risk, and recommendation blocks;
- save incomplete but structurally valid drafts;
- create a revision from history without mutating the predecessor;
- see live derived totals through the same scoring logic the public site uses.

### 8.7 Evidence editor

Must support stable source identity, source metadata/category, mapping to evaluation/dimension/subcriterion, platform scope, disagreement/spoiler notes, direct-play distinction, accurate ledger state, and source-count suppression until reconciliation is complete.

Authored ordering for evaluation tags and evidence links is implemented.

### 8.8 Validation/publication/revision — Phase 2D

Before publication validate at least:

- complete registered rubric shape;
- score grid + correct Unknown/range representation;
- required rationales;
- per-dimension confidence;
- required evidence/maturity fields;
- scope ownership and primary invariants;
- scope-local version/supersession rules;
- required interpretation blocks;
- provenance coherence;
- platform override validity without total contamination;
- artwork clearance/basis;
- no personal/Tomas-specific language;
- no aggregate score;
- no spoiler leakage;
- no draft/review exposure.

Publication and supersession are transactional. Published and Superseded snapshots remain immutable.

### 8.9 Reassessment operation

The P0 decision defines scheduled and triggered reassessment policy. Initially
GPT performs each evidence check and Tomas approves its disposition. A dedicated
admin queue is deferred until profile volume proves that a version-controlled or
manual operating list is insufficient.

---

## 9. Database and infrastructure constitution

### 9.1 Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Zod
- Postgres 16
- Drizzle ORM/migrations
- Vitest
- Playwright
- Cloudflare Workers
- OpenNext via `@opennextjs/cloudflare`
- GitHub Actions

Vercel is not the host. Supabase is not the selected database/auth stack.

### 9.2 One authoritative hosted Postgres

**There is one authoritative hosted production/editorial Postgres database.**

It contains real games, drafts, evidence, scores, final evaluations, and history. Publication status determines what the public build may read; there is **not** a separate “editorial DB” and “public DB” that must be synchronized.

Consumers of the same authoritative DB:

- local `/admin` via `ADMIN_DATABASE_URL`;
- remote `/admin` via the request-time Hyperdrive binding;
- Cloudflare production builds via build-time `DATABASE_URL`.

Separate **disposable test/CI databases** remain isolated and must never contain or mutate real editorial content.

### 9.3 Hosted provider — Neon

Initial provider is **Neon Postgres**.

Initial region is **AWS Europe (Frankfurt / eu-central-1)** because current latency-sensitive DB traffic is editorial rather than public-user traffic, and the initial editor operates from Israel. Public visitors are served prerendered Cloudflare assets and do not query Neon per request.

Provider/region assumptions:

- start on a suitable Neon Free plan during Phase 2 development;
- move to a paid Neon tier when reliability, retention, backup/recovery, operational use, or quotas justify it;
- keep application architecture ordinary-Postgres portable rather than depending on Neon-only product semantics;
- reassess region strategy if Postgres later enters a latency-sensitive public request path or the editorial team becomes geographically distributed.

### 9.4 Public read path

`lib/data/games.ts` remains the single public data-access boundary.

With build-time `DATABASE_URL`, the build reads Published evaluations for `PUBLIC_RUBRIC_VERSION`, excludes Draft/Review/Superseded history, filters artwork clearance, loads platform overrides without contaminating base totals, and constructs the existing `GameWithEvaluation → ProfileView` path.

All public profile routes are prerendered/static. Postgres is a **build dependency**, not a public-request dependency.

Therefore the public path requires:

- build-time `DATABASE_URL`;
- no runtime Worker database secret;
- no Hyperdrive requirement (this describes the **public** path; the deployed admin path does use Hyperdrive as its transport — see §9.5 and [ADR 0021](decisions/0021-hyperdrive-is-the-deployed-admin-transport.md));
- no request-time public DB connection pool;
- no dependency on DB availability for already deployed pages.

### 9.5 Admin DB path

Admin data access is intentionally separate from the public boundary because it sees drafts, review rows, superseded history, and all artwork clearances.

`ADMIN_DATABASE_URL` is deliberately distinct from `DATABASE_URL` so provisioning the public build does not silently switch on remote administration.

For the current tiny editorial team, each admin request uses one short-lived Postgres connection and closes it explicitly. Do not introduce pooling for admin as a *performance* optimisation unless measured need appears.

**Amended 2026-08-18.** The deployed Worker reaches the editorial database through a `HYPERDRIVE` binding, and that is accepted — see [ADR 0021](decisions/0021-hyperdrive-is-the-deployed-admin-transport.md). The reason is transport rather than throughput: a direct `postgres.js` → Neon TLS connection from inside the Workers runtime relies on Node TLS options Workers does not implement, and survives only behind a compatibility flag that suppresses the resulting throw. Hyperdrive terminates that transport outside the Worker.

The no-pool rule is unchanged in substance and still holds of the Worker itself: a client is created per call and closed in `finally`, nothing is retained between requests, and Hyperdrive's pool lives outside the Worker. Local `next dev` still connects directly through `ADMIN_DATABASE_URL`, and public profile reads remain build-time Postgres that never touch Hyperdrive.

This path is exercised end to end by an authenticated production editorial
session. Hyperdrive configuration reports caching disabled. The first
application-originated Builds dispatch remains the only material production
workflow proof not yet exercised.

### 9.6 Production DB cutover — complete

Neon Frankfurt is provisioned, migrations and canonical seed are applied,
Workers Builds receives the build-time database URL, production builds from the
database, and `REQUIRE_DATABASE=1` fails closed. Production must never silently
republish calibration fixtures as though they were the editorial corpus.

### 9.7 Static public rendering is the default through product validation

Do not move `/games/*` to request-time rendering merely to make Publish appear instant.

Reasons:

- profiles change relatively infrequently;
- public pages remain edge-served and fast;
- a DB outage cannot remove already-deployed profiles;
- no public Hyperdrive/runtime DB path is needed;
- artwork containment and deployment reasoning remain simpler.

Reconsider runtime rendering only after measured publication volume/latency makes static publishing materially inadequate.

### 9.8 Editorial publication versus Live

For 2D, **Published** and **Live** are distinct:

```text
editor approves publication
  → DB publication transaction commits
  → deployment requested
  → build reads new Published corpus
  → verification succeeds
  → deployment succeeds
  → new profile becomes Live
```

If build/deploy fails:

- DB version remains editorially Published / awaiting deployment;
- previous deployed artifact remains Live;
- admin exposes the mismatch and failure;
- retry is possible;
- the product does not falsely claim the new version is live.

Hook authentication, persistence, retry and audit model are settled by [ADR 0022](decisions/0022-deployment-requests-and-proof-of-live.md).

**What proves the last step is the artifact, not the build.** A dispatch
acknowledgement, a successful build report and a successful deploy report are
facts about a request; only the deployed artifact's own manifest, read back from
the production origin, is a fact about what production serves. Live is derived
from that and from nothing else, and where it cannot be established the tool
reports *not proven* rather than guessing in either direction.

### 9.9 Cloudflare/OpenNext contract

- Cloudflare is authoritative DNS/CDN/app host for `shouldiplay.gg`.
- Production deploys from `main` only.
- Non-main branches create previews.
- Preview builds are noindex and canonicalize appropriately to production.
- Preview/unpublished editorial surfaces require Cloudflare Access where privacy is expected.
- Production deploys the exact artifact verified under workerd.
- OpenNext static-assets incremental cache must serve the prerendered build output rather than re-rendering pages in workerd.
- Verification must populate cache in the same way deployment does.
- Do not reintroduce `dynamicParams = false` on the current OpenNext game page routes; it breaks those routes under workerd.
- `workers.dev` should be disabled for production canonical content once the custom domain is confirmed live.

### 9.10 Search/no extra service layer

ADR 0031 governs MVP Search as an editorially controlled static build-time
index. The build emits approved canonical titles, aliases, published profiles
and explicitly included recognized-but-unprofiled registry records. The browser
searches that artifact; the public request path performs no Postgres, provider,
hosted-search or language-model call. Imports may propose registry entries but
cannot make them publicly searchable without an editorial inclusion decision.

Search covers published, recognized-unprofiled, ambiguous and unrecognized
states. Unprofiled entries create no route, sitemap entry, structured profile
data, score, artwork, commitment band or coverage promise.

What should I play? launches from the same locally emitted approved catalog
data and composes a governed vocabulary, normalized facets, experience
classifications, time/session context, relevant dimension values, deterministic
constraints and a broad testable language layer. Interpreted criteria remain
visible and editable.

The initial runtime does not depend on a paid language-model API. Request-time
Postgres full-text/trigram, an external search service, or a hosted model may be
added only when measured corpus/language behavior justifies a new decision. A
later model may map language into the same controlled concepts; it cannot invent
unpublished claims, replace the catalog, or create a hidden universal ranking.

Do not add microservices, GraphQL, a separate public API service, an event bus, or a second rendering/domain model.

---

## 10. Data model constitution

### 10.1 Core hierarchy

```text
games
  → profile_scopes
      → evaluations
          → dimension_assessments
          → subcriterion_scores
              → subcriterion_platform_overrides
          → profile_blocks
          → evaluation_tags
          → evaluation_evidence_links
          → evaluation_revisions
```

Shared registries/metadata include rubric versions, dimensions, subcriteria,
calibration rounds, tags, evidence sources, platforms, aliases, provider IDs,
provider provenance/overrides, faceted game types, controlled discovery
concepts, experience classifications, total-commitment records, session
suitability, official/store destinations, coverage-request signals and artwork.

Before the candidate Scoring Protocol imports a package, the forward migrations
registered by ADR 0024 must add durable immutable package storage and the exact
relational mappings the protocol requires. Before accepting complimentary game
access, add a structured profile-level disclosure field. Homepage editorial
collections initially live in small version-controlled configuration; no
curation admin console is required.

### 10.2 Games

Game owns stable factual/editorial metadata, aliases, platforms, provider IDs, runtime, artwork, and profile scopes. A game may exist without any public evaluation.

### 10.3 Profile scopes

Scope owns the durable identity of one evaluated experience: key, label, summary, `is_primary`, `display_order`. Key becomes frozen once evaluation history begins; labels/summaries/order remain editable. Reordering never changes canonical ownership.

### 10.4 Evaluations

Evaluation is one version inside a scope and includes rubric/version, mandatory scope snapshot, status, evidence state/maturity, confidence, ledger state, interpretation, platform warning, score provenance, author/reviewer data, publication time, predecessor, and change summary.

### 10.5 Integrity

Rubric shape is registered and cross-rubric score/evidence relationships are refused. Final snapshots and rubric identity are immutable. Dimension values are derived in TypeScript and in Postgres for queryability, not stored as editable duplicate totals. Evaluation versions/supersession remain the canonical history.

### 10.6 Discovery and practical-context contract

Discovery criteria declare their concept, factual/normalized/editorial owner,
constraint-eligibility tier, scopes, supported values, Unknown/not-applicable
behavior, provenance, thresholds and language mappings. The eleven launch
experience axes are distinct from factual facets and from the eight dimensions.

Total commitment stores focused, engaged-play and completionist estimates where
applicable; engaged play determines the public band. Session suitability stores
useful-session window and interruption flexibility independently. Both are
scope-aware and preserve Variable, Unknown and Not applicable.

Recognized unprofiled games remain registry records only. They cannot acquire a
canonical game-profile route or public evaluation fields until a substantive
profile is published. Coverage requests are private bounded demand signals and
never votes on evaluation content.

Do not begin the scope-grain session-suitability, normalized-facet or eleven-
experience-axis schema expansions before the first real editorial trial. Use
profiles #4–#6 to measure authoring cost and expose missing states first. This
does not block the static Search index, which can begin with canonical titles,
approved aliases, publication state and explicit editorial registry inclusion.

---

## 11. SEO, discoverability, and measurement

### 11.1 Discoverability contract

Every public profile needs:

- permanent canonical URL;
- scope-correct title/description;
- Open Graph/social card;
- scope-correct structured data;
- sitemap inclusion exactly once;
- publication date;
- substantive server-rendered content.

No `Review`, `AggregateRating`, or `reviewRating` schema is published.

Preview/design/admin surfaces stay out of the public index and sitemap; authentication, not `noindex`, protects private editorial content.

Acquisition depends on stable substantive profiles and truthful editorial
surfaces, not mass-generated combination pages or artificial categories.
Recognized-unprofiled Search results do not create public stubs. Generated What
should I play? results are noindex and excluded from the sitemap. The dedicated
Compare pass decides Compare URL, canonical and index policy; until then no
pair-result indexing or all-pair prerender contract is assumed. Stable
substantive editorial collections may be indexable.

### 11.2 Analytics and privacy contract

Purpose-governed analytics is required for quiet public release. It has four
separate layers:

1. Cloudflare Web Analytics and Search Console for traffic/acquisition;
2. a small semantic product-event provider for core journeys;
3. a separately governed raw-query research dataset;
4. a first-party pseudonymous returning-browser record.

The launch event registry covers Search submissions/selections/unprofiled/no
result/coverage requests; discovery submissions/interpretation edits/result
states/selections/constraint relaxation; Compare start/selection/view/source
profile; and profile Compare/evidence/outbound actions. Events describe stable
intentions, not widget names.

Ordinary events never contain raw query text, form fields, keystrokes, raw DOM,
unrestricted URLs/query strings, contact details, advertising identifiers or
fingerprints. Raw discovery text is stored separately, is not linked to the
persistent visitor ID by default, is access-restricted/redacted, and begins with
a provisional 90-day unsanitized retention. The first-party visitor ID has no
name/email or cross-site use, is resettable/opt-out, and begins with a suggested
180-day inactivity expiry.

Before raw-query or cross-session collection, publish the privacy notice and
complete the focused lawful-basis/consent, DPA, subprocessor, data-location,
retention, deletion/export, transfer and breach-handling review. The final event
provider is open; provider failure must never affect the public product. No
internal analytics console is required.

### 11.3 Operating metrics

Track discovery/search success, decision engagement, trust behavior, editorial throughput, confidence distribution, reassessment age, publication-to-live latency, and deploy failures/retries. Continue qualitative testing of real purchase decisions.

### 11.4 Public accountability

Should I Play? launches as an independently operated, editor-led publication.
It is currently self-funded, accepts no payment or placement for coverage, and
currently uses neither advertising nor affiliate links. Future commercial
changes are disclosed when introduced. Complimentary access may be accepted but
is disclosed on the relevant profile and never guarantees coverage or affects
scoring.

The public byline is **the editor**. The product claims independence and
methodological consistency, not impossible human impartiality. Corrections and
relevant contrary evidence go to `corrections@shouldiplay.gg`; profile links
identify game and scope. Material corrections use versioned evaluation and
publication rather than silent overwrites. No response-time promise is made.

Public methodology describes a structured, AI-assisted editorial process — not
an AI verdict. It explains evidence collection, claim extraction, rubric
mapping, a separate audit pass and editor approval without making the model
vendor the subject.

### 11.5 Commerce and storefront actions

Every launch profile should identify supported platforms and provide verified
official “Where to play” destinations where facts are reliable. Ordinary
non-affiliate links are the baseline; approved affiliate links may replace or
supplement them with clear disclosure. A paying destination never hides a
material non-paying one, and commerce never affects evaluation, coverage,
Search/discovery ordering or Compare.

The model distinguishes game/scope, edition, platform, region, storefront,
ordinary/affiliate URL, relationship, disclosure, source, freshness and
staleness. Unverifiable prices/offers disappear conservatively while an official
destination may remain. A 10–20-profile PC live-commerce pilot and broader
availability/price/subscription integrations are later stages, not launch
blockers.

---

## 12. Delivery phases and current status

### Phase 0 — Rubric and calibration foundation

**COMPLETE**

Rubric v1.0, two historical calibration rounds, three implementation profiles,
the eight-dimension public contract, evidence model, pre-release model, and
radar/exact-row foundation are established. These three profiles are
grandfathered under their recorded calibration provenance; the candidate
Scoring Protocol applies prospectively at their next revision.

### D0 / Phase 1 — Art direction and public vertical slice

**COMPLETE AS FOUNDATION**

D3 Game-Led Profile, the public renderer, methodology, canonical scope routes,
Postgres model, Cloudflare/OpenNext delivery, SEO, containment and test
foundation are implemented. D3 remains the profile foundation. The public
homepage/Search/Compare design is not complete merely because D3 shipped.

### Phase 2 — Editorial and publication machine

**SUBSTANTIALLY COMPLETE; SUPPORT MODE**

Implemented and proven:

- DB-backed build-time public read path;
- game/scope and evaluation authoring;
- evidence, scoring, confidence, platform, tag and interpretation editing;
- public-faithful preview and complete publish gate;
- transactional publication, supersession and history;
- Access-protected remote admin and authenticated Hyperdrive reads;
- deployment requests, manifest proof, recovery and N1 hardening;
- a successful production observation proving the current three profiles Live.

Still unexercised:

- the first application-originated Cloudflare Builds dispatch;
- one complete new-profile Publish → dispatch → manifest → Live cycle.

Those two facts are proved by the first real catalog publication. They are not a
reason to continue generic admin work. The one-editor limitations in §8.4 are
accepted.

### Phase 3A — Candidate Scoring Protocol calibration

**ACTIVE / PRECONDITION TO BULK CATALOG PRODUCTION**

**Objective:** prove that the evidence-to-half-step procedure is sufficiently
repeatable, auditable and operationally affordable without pretending
qualitative judgment is mathematically objective.

Tomas approved the candidate Protocol v1.0 and ADR 0024 on 25 August 2026 as
the basis for Appendix B calibration. That authorizes the exercise; it does not
make the candidate governing. Rubric v1.0, Evidence SOP v0.2 and the current
data contract remain in force meanwhile.

Four gates remain explicit:

1. run six development games and four untouched holdouts, then record final
   governing approval or return the protocol to development;
2. after development evidence and before holdout, decide ADR 0024 §4's Rubric
   v1.1 required-facet path;
3. before migration 4 or the first package import, decide the immutable-package
   approval lifecycle recorded in ADR 0024 §6; and
4. at final approval, use measured time and effort to choose the full or a
   deliberately reduced production record.

Calibration may use disclosed `parameter_unavailable` pairs under ADR 0024 §8.
That is an accepted calibration condition, not an unrecorded deferral.

**Deliverables:**

- candidate Protocol v1.0, package schema, ADR 0024 and behavioral validation;
- six pre-registered development games;
- anchor/protocol corrections found by those cases;
- frozen protocol, prompts, schema, model snapshot and decoding configuration;
- four untouched holdout games;
- pre-adjudication agreement, confidence, endpoint, traceability and derivation
  report;
- time/effort measurement per research and scoring pass;
- Tomas's approval or explicit return to development.

**Exit criteria:** every holdout gate in the candidate protocol passes, no
integrity failure remains, and Tomas approves both the protocol and the
production-record depth justified by measured effort.

**Out of scope:** a scoring API, dedicated scoring skill, autonomous catalog
agent, automated publishing, outlet-score weighting, or rewriting the three
existing calibration profiles.

### Phase 3B — Public-product design gates

**COMPLETE — VISUAL GATES AND SHARED HANDOFF**

The 24–25 August decision records resolve the product contract. Gate A resolves
the homepage composition and interaction direction under ADR 0030. Gate B
resolves the A3–A6 profile direction under ADR 0032. No further homepage or
profile concept exploration is authorized. Accepted artifacts are not
publication truth for specimen time, private artwork, unresolved dates,
destinations or unsupported content, and they are not proof that production
matches the design.

**Gate B objective:** revise the existing A3–A6 profile screens into one
implementation-ready desktop/mobile specification that is compatible with
Gate A and makes “Should I play this?” rapidly answerable.

**Required Gate B inputs and deliverables:**

- a read-only audit of the canonical eight dimensions, fixed scale, current
  calibration values, distributions, compression, relationships and anchors;
- a three-level radar contract for compact homepage fingerprint, full labelled
  profile instrument and exactly-two Compare overview, with exact accessible
  values outside the chart;
- A3 art-led desktop profile and A4 art-led mobile profile;
- A5 complete artless desktop profile and A6 complete artless mobile profile;
- resolved hierarchy among identity/scope, decision answer, public Pull/Tax
  (mapped from Primary Pull/Risk), fit guidance, practical commitment and the
  eight-dimension instrument;
- exact values, dimension explanations, evidence confidence, ranges, Unknown,
  provisional status, scope/build/platform differences and platform logos;
- useful session length and total commitment outside the eight dimensions;
- editorial voice and trust/evidence that do not turn the page into a report;
- mobile reading order, keyboard behavior and complete artwork/no-art parity;
- an implementation component/state inventory and acceptance criteria.

Gate B uses Fable High and revises the existing screens. It does not spend
design usage on A1/A2, a new brand, a new rubric, rankings, launch
personalization, broad admin design or a runtime chatbot.

The read-only [score/radar audit](design/Should_I_Play_Score_and_Radar_Audit_2026-08-28.md),
[implementation-ready brief](design/Should_I_Play_Gate_B_Profile_Brief_2026-08-28.md)
and [self-contained Fable High prompt](design/Should_I_Play_Gate_B_Fable_High_Prompt_2026-08-28.md)
are complete. On 29 August, Fable High applied the bounded A3–A6 pass and a
subsequent truth correction to remove unsupported play-log and completion-time
source claims. Fable reported 15/15 checklist items passing; independent review
confirmed the canonical values, permanent exact rows, semantic disclosures,
art/artless parity, absence of the unsupported claims and preservation of the
design-specimen warning. The separate background verifier still did not post a
result. The candidate, evidence and remaining caveats are recorded in the
[Gate B candidate review](design/Should_I_Play_Gate_B_Fable_Result_Review_2026-08-29.md).

Tomas accepted the Gate B candidate on 30 August 2026 as good enough to proceed.
The homepage hero-height observation is a bounded implementation refinement,
not a reopened gate. A7's older token card is reconciled by the completed
cross-surface design-system/interaction handoff.

**Gate A/Gate B exit criteria:** met. Fable High completed a first dedicated
Compare candidate and an independent review found its data/accessibility checks
satisfied while A1–A6 remained unchanged. Tomas accepted its URL/index policy
but rejected its artwork-free visual direction. The [first candidate
review](design/Should_I_Play_Full_Compare_Fable_Result_Review_2026-08-31.md)
records that split decision; ADR 0033 governs the art-led revision and URL/index
policy. Tomas accepted the [revised art-led candidate](design/Should_I_Play_Full_Compare_Art_Led_Result_Review_2026-08-31.md)
on 31 August 2026; ADR 0034 closes the full Compare design gate. The
[shared design-system/interaction handoff](design/Should_I_Play_Shared_Design_System_and_Interaction_Handoff_v1.0_2026-08-31.md),
[semantic tokens](design/handoff/should-i-play.tokens.v1.json) and
[accessibility/conformance matrix](design/Should_I_Play_Accessibility_and_Conformance_Matrix_v1.0_2026-08-31.md)
are complete. They reconcile A7's stale two-face/artwork-free rules, specify the
bounded hero-height refinement and make the accepted surfaces implementation-
ready. Within engineering, the shared foundation and static Search move ahead
of homepage, profile and full Compare under ADR 0031.

### Phase 4 — 12–15-profile product-validation corpus

**PENDING**

**Objective:** validate the real public product and content-production system on
a deliberately varied but bounded corpus.

**User value:** a credible private preview or limited test in which Search,
Compare, What should I play?, shelves, profiles, evidence states, mixed artwork
and mobile behavior can be evaluated with real content.

**Deliverables:**

- 12–15 substantive profiles produced through the approved manual AI-assisted
  workflow;
- provider-independent factual records, aliases, normalized facets, eleven
  experience classifications, total commitment, session suitability and
  official storefront destinations for the validation corpus;
- a measured research/scoring/editing time baseline;
- the first real new-profile application dispatch and Live proof;
- the reconciled homepage, global Search, deterministic What should I play?,
  exactly-two Compare and individual-profile experience;
- all four Search availability states and accountless private coverage requests;
- verified/trade-off/near-match/indeterminate/no-match discovery behavior;
- factual, evergreen and living editorial shelf configuration;
- corrections/About and disclosure behavior;
- total-commitment/session-suitability and official “Where to play” behavior;
- representative art-led and artless states;
- the approved artwork-basis migration/policy/legal gate if any validation asset
  relies on editorial fair use;
- a versioned analytics event registry and local/test instrumentation contract,
  without enabling raw-query or cross-session collection prematurely;
- founder-led decision scenarios, adversarial query corpus, accessibility
  checks and production observations.

**Exit criteria:** the product works coherently across real content states,
editorial throughput is measured, no publication blocker remains, and the
private/limited test demonstrates what must change before scale.

**Out of scope:** marketing the product as a broadly useful public catalog,
inflated categories, programmatic SEO, automated scoring, personalization or a
curation admin console.

### Phase 5 — Catalog production toward quiet public release

**PENDING**

**Objective:** grow the validated product to approximately 100 substantive
profiles without weakening evidence, transparency or design quality.

**Deliverables:**

- curated approximately-100-title plan under §2.3;
- manual GPT research/primary/audit packages with Tomas approval;
- current-state mature-game evaluations and the scheduled/triggered update
  policy;
- comparison-rich clusters that arise from useful title selection rather than
  fabricated quotas;
- one approved routine metadata-provider adapter or a documented manual fallback
  that can sustain the release catalog;
- calibrated experience classifications and practical-time records at catalog
  scale;
- verified official platform/store destinations with freshness and ordinary-
  link fallback;
- monthly-or-event-driven living editorial rotations with expiry/fallback;
- mixed lawful artwork/artless rollout;
- throughput improvements justified by measured bottlenecks.

**Exit criteria:** approximately 100 substantive profiles are publishable,
evidence and approval packages remain auditable, update obligations are
operable, and the product is genuinely useful beyond a controlled test.

**Out of scope:** lowering the method to hit a count, automated publication,
fixed outlet weighting, arbitrary artwork-coverage quotas or building
infrastructure merely to look scalable.

### Phase 6 — Quiet public-release readiness

**PENDING**

**Objective:** establish that the approximately-100-profile product is
trustworthy, comprehensible, accessible, indexable and supportable.

**Deliverables:**

- final performance, accessibility and responsive audit;
- canonical/robots/sitemap/structured-data and social-card verification;
- Search Console setup and representative URL inspection;
- lawful artwork policy/operations, artless conformance and removal path;
- public methodology, About, corrections and commercial disclosures;
- founder-led validation of real Search, Compare and What should I play?
  decisions, including adversarial and incomplete-catalog cases;
- Cloudflare/Search Console acquisition measurement, the approved semantic
  event provider, event registry, operational privacy controls, and the focused
  legal/privacy review required before any raw-query or cross-session data;
- verified official action links and conservative stale/unavailable behavior;
- visual-conformance review against the reconciled design specification;
- single-editor launch and correction runbook.

**Exit criteria:** the definition of done in §18 passes.

### Phase 7 — First post-launch product phase: personal matching validation

**DEFERRED UNTIL THE QUIET PUBLIC RELEASE IS STABLE**

**Objective:** determine whether explicit player preferences create repeatable
decision value beyond the launch discovery tools.

**Deliverables:** recover the earlier questionnaire, reconcile it with the
current dimensions/facets/experience axes, test an ephemeral no-account taste
profile, evaluate dimension-by-dimension fit and trade-offs, and decide whether
persistence/accounts are justified.

**Exit criteria:** matching semantics are understandable and useful without a
fit percentage, and persistence is added only if repeated use demonstrably
benefits from saving.

**Out of scope:** pre-launch promises, disabled personalization UI, opaque
recommendation ML, social profiles, behavioral surveillance, or polygon overlap
as a universal fit score.

Other post-launch work remains evidence-triggered: richer taxonomy/browsing,
dynamic Compare rendering, live-commerce expansion, public revision history,
durable curation tooling and a future model-backed language interpreter over
the same controlled concepts.

---

## 13. Current prioritized backlog

### P0 — current public-product design/proof work

1. Record A1/A2 Rev 5.1 as the accepted Gate A homepage direction in the Master
   Plan, decision register and ADR 0030. **DONE when this amendment merges.**
2. Complete the read-only score/radar audit without modifying scores,
   normalizing the catalog, adding a dimension or deriving an aggregate.
   **DONE in the 28 August audit**
3. Prepare and accept the Gate B A3–A6 profile-page revision in Fable High.
   **DONE; accepted 30 August under ADR 0032**
4. Reconcile the governing documents, archive the Opus readiness evidence,
   correct operational documentation and run the dependency-installed baseline
   gates before product code. **DONE; results and remaining runner/lint gaps are
   recorded in the audit**
5. Review the revised full Compare visual candidate under ADR 0033:
   exactly two games, art-led with complete artless parity, central radar,
   striking but non-judgmental difference/alignment and shared/unique tag
   treatment. The URL/index policy is accepted. **DONE; accepted 31 August
   under ADR 0034**
6. Produce the cross-surface design-system/interaction handoff. **DONE;
   v1.0 handoff, token JSON and conformance matrix recorded 31 August**
7. Implement the dominant static Search journey under ADR 0031 before full
   Compare implementation. **DONE ON THE INTEGRATION LINE; pending merge and
   deliberate deployment**
8. Implement the accepted homepage/profile composition in bounded vertical
   slices, including truthful platform projections and no fabricated practical
   time. **OPEN**
9. Complete review of the candidate Scoring Protocol/package contract and run
   the six-development/four-holdout program. **OPEN IN PARALLEL; precondition to
   bulk catalog production**
10. Create and operationally verify corrections@shouldiplay.gg plus contextual
   profile links before About claims that route. **OPEN**
11. Complete the seven-step lawful artwork path before clearing any artwork
   specifically on editorial-fair-use. **PARTIAL: ADR, enum migration, types,
   validation and tests implemented; one-time legal/policy operating gate OPEN.**
12. Produce the first real new catalog profile through the full Publish →
   dispatch → Live path and build the 12–15-profile validation corpus.
   **OPEN; belongs to Phase 4**

Admin work remains out of this sequence unless it blocks integrity, security,
truthful publication/deployment proof, the ability to publish or the public
product.

### P1 — before quiet public release

- finish the approximately-100-profile curated catalog;
- operate the three-month, conditional six-month, twelve-month and
  material-change update policy;
- implement Search/Discovery, exactly-two Compare and the resolved profile
  hierarchy at launch quality;
- operate the recognized-title registry and private coverage-request path;
- provide governed total-commitment/session-suitability records and verified
  official storefront actions;
- maintain factual, evergreen and living homepage collections;
- establish mixed lawful-art/artless production;
- approve a sustainable primary metadata path or document the manual fallback;
- publish methodology, About, corrections and commercial disclosures;
- complete accessibility, performance, SEO/social and qualitative decision
  testing;
- operate purpose-governed acquisition/product analytics and complete the
  required privacy/legal controls before raw-query or cross-session collection.

### P2 — after launch evidence

- richer Discover/taxonomy and a traditional catalog surface;
- dynamic/server Compare if build scale requires it;
- three/four-profile Compare;
- public revision history;
- richer live pricing/subscription/availability providers;
- dedicated curation/reassessment administration;
- the explicit no-account personal-matching experiment, followed by saving only
  if value is demonstrated;
- optional model-backed natural-language interpretation over the controlled
  discovery contract;
- price context, alerts, API or embeddable profiles.

### P3 — requires a new product decision

- social graph;
- user reviews/comments;
- community scoring;
- native applications;
- recommendation ML;
- moderation systems;
- public user profiles.

---

## 14. QA and acceptance

### 14.1 Required verification layers

Every material change uses the layers proportional to its risk:

1. static validation: typecheck, lint and document/schema parsing;
2. semantic/unit tests for rubric, routes, scoring packages and public truth;
3. database/migration tests where contracts change;
4. production build and containment;
5. workerd/browser checks for runtime and responsive behavior;
6. production observation only for facts no local environment can prove.

### 14.2 Scoring-protocol acceptance

The candidate protocol is not governing merely because its document and schema
exist. Acceptance requires the exact registered development/holdout program.
Owner adjudication creates the final accountable result but never improves the
independent agreement metrics. A failed holdout returns to development and
invalidates that holdout for reuse after protocol changes.

### 14.3 Product-semantic acceptance

The product fails acceptance if it:

- creates an overall score, winner, ranking, match percentage or quality color;
- treats low as inherently bad, Unknown as zero or range as a midpoint;
- hides scope, provisional state, confidence or material evidence limitation;
- calls source counts votes or uses review scores as scoring inputs;
- implies a bigger radar area is better;
- calls editor-selected comparisons popular without evidence;
- simulates catalog activity through randomization, empty filters or fake scale;
- describes AI output as an objective verdict or permits automatic publication;
- exposes uncleared artwork or leaves the artless state visibly broken.

### 14.4 Public-product validation acceptance

At the 12–15-profile milestone:

- Search, Compare and What should I play? work with real content and the locked
  hierarchy;
- Search exercises published, recognized-unprofiled, ambiguous and unrecognized
  states without creating a stub profile;
- discovery distinguishes verified, near-match, trade-off, indeterminate and
  no-verified-match states without silently weakening a hard constraint;
- exactly-two Compare is comprehensible on desktop and mobile;
- users can explain shape-not-rank and find the material risk quickly;
- factual/evergreen/living shelves behave truthfully, including expiry/fallback;
- profile and artwork states cover long titles, scopes, Unknown/ranges,
  provisional evidence and mixed art/artless cases;
- practical time/session records and official storefront actions remain useful
  in missing, variable, stale and partially known states;
- at least one new profile has completed the full publication/deployment proof;
- production effort per profile is measured rather than guessed.

### 14.5 Launch acceptance

Quiet public release additionally requires the approximately-100-profile catalog,
approved scoring protocol, operational update policy, accountability/corrections,
lawful artwork operations, verified official actions, purpose-governed analytics,
accessibility/performance/SEO conformance and real decision testing in §18.

---

## 15. Risks and mitigations

### Subjectivity disguised as science

**Mitigation:** fixed public rubric, claim/anchor traceability, separate blind
pass, measured agreement, visible uncertainty, owner accountability and no
claim of objective AI scoring.

### Protocol rigor makes the catalog infeasible

**Mitigation:** measure effort in calibration before committing production to
the full record depth; simplify only through an explicit versioned decision that
preserves auditability.

### Catalog count weakens substance

**Mitigation:** approximately 100 is a usefulness target, not permission for
thin pages. A profile does not count unless its evidence, rationale, scope and
interpretation meet the publication contract.

### A 12–15 corpus is mistaken for launch

**Mitigation:** call it product validation/private preview and do not market it
as broad catalog coverage.

### Compare recreates rankings

**Mitigation:** exactly two, shape/trade-off language, mandatory bigger-is-not-
better guidance, no winner/aggregate/match percentage, and profile/evidence
links remain authoritative.

### Discovery implies intelligence the product does not have

**Mitigation:** expose the bounded mechanism, use authored prompts/controlled
metadata, and say honestly when the catalog has no suitable result.

### Recognized-title coverage becomes thin SEO content

**Mitigation:** unprofiled registry records exist only inside Search, carry no
profile claims and create no route, sitemap entry, structured data or indexable
stub. Coverage requests remain private signals without public counts or promises.

### Provider metadata silently becomes editorial truth

**Mitigation:** retain layered ownership, field provenance, provider-independent
concept IDs, official-source overrides and durable manual corrections. Provider
ratings/popularity never influence the Game Profile or result ordering.

### Query learning creates disproportionate privacy risk

**Mitigation:** separate raw queries from ordinary events and the persistent
visitor ID, minimize properties/retention, provide reset/opt-out and complete the
focused privacy/legal review before raw-query or cross-session collection.

### Commerce compromises editorial independence

**Mitigation:** ordinary official links are the baseline; relationships are
disclosed; paying stores never hide material non-paying stores; commerce is
excluded from scoring, coverage and discovery/Compare ordering.

### Editorial shelves become stale or algorithmically misleading

**Mitigation:** objective automation only for factual dates; qualitative
membership is authored and approved; time-sensitive collections carry expiry
and evergreen fallback; no randomization.

### Artwork creates rights or visual-consistency risk

**Mitigation:** auditable basis/clearance, official sources, containment,
legal review before fair-use clearance, removal channel, separate cover/hero
roles and a first-class artless state.

### Architecture/admin work crowds out public value

**Mitigation:** internal work requires a concrete integrity, security,
publication or public-product blocker. One-editor limitations are accepted.

### External design work drifts from governing decisions

**Mitigation:** reconcile the latest Fable artifact against the dated P0 record,
translate it into governed implementation material, then perform conformance
review on the real product.

### Static publishing or pair generation stops scaling

**Mitigation:** retain the simple static/build-emitted architecture until
measured build time, route count or publication latency crosses an agreed
threshold; change architecture from evidence, not anticipation.

---

## 16. Working model and engineering rules

### 16.1 Roles

- **Tomas:** product owner, final editorial authority, qualitative shelf/artwork
  approval and publication approval.
- **ChatGPT/GPT scoring context:** research, claim extraction, primary scoring,
  separate blind audit, interpretation and editorial proposals under the
  candidate protocol.
- **Codex/Claude:** engineering, deterministic validation, import, testing,
  documentation reconciliation and implementation review. They may create a
  draft from an approved package but may not auto-publish it.
- **Fable/design tools:** reconcile and specify the approved public product;
  they do not rediscover the product or supersede owner decisions silently.

### 16.2 Material decision protocol

A material decision is one that changes methodology, public meaning, identity,
routing, data shape, publication truth, IA, launch criteria, rights posture or
security boundary.

For each material decision:

1. identify the authority that owns it;
2. record chronology and supersession;
3. update this Plan or a named governing decision document;
4. use an ADR for implementation beneath that product decision;
5. update code/tests only after the contract is clear;
6. preserve historical versioned documents.

### 16.3 Engineering and product rules

1. Keep rubric and derivation logic single-source.
2. Never average sources or derive an aggregate score.
3. Preserve exact/range/Unknown and confidence truth end to end.
4. Keep public identity, scope and canonical ownership explicit.
5. Preserve immutable final history and truthful Live proof.
6. Never auto-publish AI output.
7. Make artwork clearance an auditable permission, not an assumption.
8. Keep public rendering static/build-emitted until measurement requires more.
9. Keep the one-editor admin simple and fail-safe.
10. Optimize public comprehension, mobile use and catalog production before
    speculative platform work.
11. Treat Search, Compare and curation as product contracts, not generic widgets.
12. Do not build fake activity, engagement loops, points, streaks or popularity
    claims.
13. Keep main deployable and changes meaningfully scoped.
14. When code differs from governing decisions, report drift rather than
    treating implementation as authority.

---

## 17. Decisions: closed, provisional, open and superseded

### 17.1 Closed/governing decisions

- Public brand = **Should I Play?**; Game Profile = evaluation/methodology.
- Rubric v1.0; exactly eight dimensions; no aggregate score anywhere.
- Low is descriptive; Unknown is not zero; range is not fake precision.
- Evidence/confidence/scope/provisional truth is public.
- Sources support judgments and are not votes.
- Profile-first Field Guide; Registry is a retrieval pattern, not proposition.
- Homepage = art-led, utility-first entrance with Search dominant, Compare as
  major secondary action and What should I play? progressively disclosed.
- Gate A A1/A2 Rev 5.1 = canonical homepage visual and interaction direction:
  “Should you play it?”, dark cinematic opening, Search selected by default,
  three-game artwork/fingerprint mosaic, “Start somewhere interesting” rail,
  authored shelves, secondary “Choosing between…”, visible artwork during
  expansion and a shared desktop/mobile conceptual hierarchy.
- ADR 0013 is superseded; A1–A6 plus ADRs 0030/0032 govern the accepted
  homepage/profile visual, while C1–C4/C-rail plus ADRs 0033/0034 govern the
  accepted Compare URL/index, hierarchy and interaction direction.
- Gate B A3–A6 = accepted art-led/artless desktop/mobile profile direction;
  decision answer precedes the fixed-scale instrument and permanent exact rows.
- MVP Search = editorially governed static build-time index with no public
  request-time database/provider/service; registry inclusion is explicit.
- Search is global and supports published, recognized-unprofiled, ambiguous and
  unrecognized states; unprofiled records never receive public profile stubs.
- Coverage requests are accountless private demand signals without counts,
  queue, ETA or coverage promise.
- What should I play? is a deterministic, controlled-data product with visible
  editable interpretation; Must/Prefer/Prefer-not/Must-exclude intentions;
  governed hard eligibility; and separate indeterminate handling for Unknown.
- There is no public match percentage or hidden universal relevance/quality
  score.
- Compare is launch-critical, exactly two and subordinate to profiles.
- Full Compare = accepted art-led C1/C2 and complete artless-parity C3/C4,
  with two equal artwork territories, central radar, permanent exact rows and
  canonical shared/unique tags under ADR 0034.
- Homepage comparison is shape before interpretation with mandatory
  bigger-is-not-better guidance.
- Explicit primary scope owns /games/[slug]; sibling scopes own their
  subpaths.
- 12–15 profiles = private/limited product-validation milestone.
- Approximately 100 substantive profiles = quiet public-release floor.
- Catalog expansion remains a permanent demand-weighted breadth/depth operation;
  profiles #4–#6 establish measured simple/typical/complex throughput.
- Claim-level rubric synthesis; GPT Chat initially scores; separate blind audit;
  Tomas approves; Codex/Claude validate/import; no automatic publication.
- Five independent substantive evidence clusters is scarcity floor; eight to
  ten is normal AA/AAA target.
- Homepage uses objective factual shelves, authored evergreen decision shelves,
  and a time-bounded living editorial layer.
- Qualitative shelf membership and copy are approved by Tomas and stored in
  small version-controlled configuration.
- Byline = “the editor”; independence, self-funding and commercial posture are
  disclosed; corrections use corrections@shouldiplay.gg.
- Artwork-forward mixed launch; artless remains first-class; Compare uses two
  equal artwork territories with complete artless parity under ADR 0033.
- Editorial fair use is an approved independent basis for appropriate official
  promotional artwork after its one-time legal/implementation gate.
- Metadata is provider-first but provider-independent: one routine provider,
  official overrides for critical facts, secondary sources only for gaps or
  conflicts, and manual corrections that survive refresh.
- Total commitment and session suitability are separate practical concepts and
  neither is a ninth dimension.
- Purpose-governed traffic/product analytics is a public-release requirement;
  raw-query research and pseudonymous cross-session identity are separately
  controlled.
- Verified official storefront actions are the launch baseline; richer live
  commerce is incremental and never affects editorial output or ordering.
- Quiet public release is fully public/indexable where appropriate, selectively
  shared and monitored without a permanent beta posture.
- Personal matching is the first major post-launch phase, with no launch promise
  or disabled UI.
- Public-product value dominates admin engineering.
- Remote admin, Hyperdrive and production Live proof are operational.

### 17.2 Provisional decisions

- exact Scoring Protocol anchors, formulas, package contract and implementation
  changes until calibration/approval;
- publication copy within the accepted homepage hierarchy;
- exact calibrated labels/anchors for the eleven experience axes;
- exact public session-summary phrase matrix;
- IGDB as primary metadata provider and HowLongToBeat as runtime provider,
  pending terms and representative tests;
- analytics provider, 90-day raw-query retention and 180-day visitor inactivity
  expiry pending focused review;
- exact durable discovery-results route.

### 17.3 Open P0 implementation/design decisions

- public meaning/data source of the **Evaluated** date label;
- exact initial 12–15 and approximately-100 title lineups;
- calibration outcome and production record-depth decision.

### 17.4 Deferred decisions

- the post-launch ephemeral personalization experiment, then accounts only if
  persistence demonstrates value;
- automatic carousel and behavioral ranking;
- richer Discover/taxonomy;
- Postgres/external search service;
- model-backed natural-language interpretation;
- three/four-game Compare;
- dynamic/server Compare until measured pair/build scaling requires it;
- live price/subscription/availability expansion;
- dedicated curation/reassessment admin;
- public revision history;
- recommendation ML.

### 17.5 Superseded decisions

- editorial/admin completion as the dominant roadmap milestone;
- standalone profile #4/3–5-profile admin trial before public design;
- broad admin UI/art-direction pass;
- 12–15 profiles as public launch;
- 15–25 or 40+ as the governing launch threshold;
- Discover before Compare;
- 2–4-profile MVP Compare;
- registry/table-first or search-only homepage;
- public journey labels Find / Compare / Start with a question;
- three equal-priority homepage journey tabs;
- Search limited to published profiles only;
- indexable unprofiled game stubs;
- custom semantic analytics deferred until after launch;
- all store/provider work deferred until after launch;
- personalization as an indefinite, unscheduled possibility;
- editorial fair use awaiting another product decision;
- full-height featured-game hero;
- a difference list preceding comparative shape on the homepage;
- artwork inside Compare;
- a universal winner, ranking feed or aggregate score.

---

## 18. Quiet public-release definition of done

Should I Play? is ready for quiet public release when:

- approximately 100 varied, substantive profiles exist;
- the Scoring Protocol has passed its six-development/four-holdout program and
  Tomas has approved it;
- each new protocol profile is backed by a validated, owner-approved package;
- released and pre-release profiles communicate confidence and maturity
  truthfully;
- the art-led, utility-first homepage gives Search dominant priority, Compare
  major secondary priority and What should I play? progressive depth;
- exactly-two Compare is excellent on desktop and mobile and never implies a
  winner;
- Search works for titles, aliases, scopes, ambiguity and recognized-unprofiled
  records, without creating public stubs, and its coverage request remains a
  private signal;
- What should I play? exposes editable interpretation, keeps hard constraints
  truthful, separates Unknown/indeterminate from near matches and publishes no
  match percentage;
- editorial shelves remain authored, current and non-manipulative;
- public profiles make Pull, Risk, scope, evidence, rationale, total commitment,
  session suitability and supported platforms legible;
- every profile has verified official “Where to play” destinations where facts
  are reliable, with ordinary-link fallback and commercial disclosure;
- Methodology, About, corrections, byline and commercial disclosures are live;
- no aggregate score exists in visible or machine-readable output;
- one-editor publication, dispatch, Live proof, correction and reassessment
  operations are usable;
- artwork is lawful/auditable and mixed art/artless states are visually complete;
- public pages are fast, accessible, indexable and socially shareable;
- Search Console/traffic measurement and the approved semantic product-event
  layer are operational; any raw-query or returning-browser collection has the
  required notice, controls and focused privacy/legal review;
- founder-led fresh-context and adversarial validation shows that people can use
  Search, Compare and What should I play? without mistaking descriptive
  dimensions for rankings.

Release is not blocked by native apps, accounts, social features,
personalization, hundreds beyond the approximate-100 target, affiliate
agreements, live global price coverage, a formal moderated research program, a
paid metadata provider, a scoring API or a curation/admin analytics console.

---

## Appendix A — v0.9 reconciliation baseline

v0.9 reconciles:

- Master Plan v0.8;
- production/main after remote-admin activation and successful Live proof;
- the complete owner P0 decision record dated 24 August 2026;
- all 27 locked records in the later owner resolution source dated 25 August
  2026, revalidated through the canonical register at SHA-256
  `29d4b2db2c04679d696411a7dd1bb1e2235061f168dd7756762890e1f8037e64`;
- the candidate Scoring Protocol/package contract and its repository review;
- the accepted Gate A A1/A2 and Gate B A3–A6 Fable direction;
- ADRs through 0034, with ADR 0013 superseded;
- the explicit public-first directional correction.

Material changes from v0.8:

1. public-product value replaces admin completion as the dominant objective;
2. Phase 2 moves to support mode;
3. 12–15 becomes private product validation, not broad launch;
4. approximately 100 substantive profiles becomes the public-launch target;
5. the claim-level scoring protocol/calibration program becomes the precondition
   to bulk catalog production;
6. the homepage becomes the art-led three-journey Field Guide entrance;
7. the dedicated exactly-two Compare design pass and shared handoff precede
   engineering, where static Search moves ahead of full Compare implementation;
8. factual/evergreen/living editorial curation and ownership are recorded;
9. accountability, corrections and AI-assisted-method language are recorded;
10. the artwork-forward mixed launch and activated editorial-fair-use basis with
    a legal/implementation gate are recorded;
11. Search becomes global and recognizes unprofiled registry records without
    creating public stubs;
12. deterministic What should I play? gains explicit intent, hard-eligibility,
    Unknown and practical-time semantics;
13. metadata ownership, official storefront actions and purpose-governed launch
    analytics become public-release contracts;
14. personal matching becomes the first major post-launch phase without any
    launch promise;
15. old 15–25/40+/Discover-first/2–4 Compare/admin-first and later-analytics/
    store-provider decisions are explicitly superseded.
16. Gate A and Gate B close homepage/profile rediscovery while preserving
    illustrative-content, artwork, truthfulness and conformance boundaries;
17. Compare remains exactly two; its URL/index and accepted visual direction
    are governed by ADRs 0033/0034, while the public **Evaluated** label remains
    an explicit copy/data decision.

---

## Appendix B — immediate execution sequence

1. Preserve the accepted A1/A2 Rev 5.1 homepage direction; do not revise or
   rediscover it.
2. Preserve accepted Gate B A3–A6; do not publish specimen time or private
   artwork as facts.
3. Complete the pre-code governance/readiness baseline: ADR supersession,
   static Search decision, README/current-state reconciliation, Opus evidence
   archive and all installed repository gates.
4. Preserve the accepted ADR 0034 exactly-two,
   art-led-with-artless-parity full Compare direction and ADR 0033 URL/index
   policy; do not reopen them.
5. Preserve the completed design-system and interaction handoff across A1–A6
   and C1–C4, including its A7 reconciliation and modest homepage hero-height
   refinement.
6. Preserve the integrated static Search index and its four truthful states;
   complete the remaining accepted homepage, then profile, then Compare slices.
7. Run visual-conformance and accessibility review against the accepted system
   after each relevant implementation slice.
8. In parallel, finish candidate-protocol review and the registered
   development/holdout calibration.
9. Run the first real editorial trial before session/facet/eleven-axis schema
   expansion; build and test the public product against the 12–15-profile
   validation corpus, including the first new-profile dispatch and Live
   observation.
10. Approve the sustainable metadata/runtime/store inputs and analytics/privacy
   operations needed for release.
11. Incorporate measured learning, scale toward approximately 100 substantive
    profiles and complete quiet public-release validation under §18.
