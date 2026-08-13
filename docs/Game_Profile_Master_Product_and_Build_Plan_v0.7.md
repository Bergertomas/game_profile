# Should I Play? — Master Product & Build Plan v0.7

**Public product / site:** Should I Play?  
**Evaluation and methodology:** Game Profile  
**Canonical domain:** https://shouldiplay.gg  
**Product owner and final decision maker:** Tomas  
**Product and project orchestration:** ChatGPT  
**Engineering and product design:** Claude  
**Status:** Current product and roadmap constitution — Phase 2 active  
**Current checkpoint:** Phase 2A implementation complete and approved; one
rubric-specific primary-scope correction and merge are required before Phase 2B  
**Date:** 2026-08-13

---

## 0. Purpose and authority

### 0.1 How to use this document

This is the current operating specification for Should I Play? It describes the
product we are building, the decisions already locked, the architecture those
decisions require, the delivery sequence, and the active backlog.

It is a current-state constitution, not a chronological amendment log. Master
Plan v0.6 remains in the repository as history, but v0.7 supersedes it for
current product, roadmap, information-architecture, and architecture-direction
guidance.

The immediate product objective is:

> A non-coding editor can create, evaluate, preview, validate, publish, and
> revise a Game Profile without editing source code or fixtures.

Until that is true, the editorial machine is the highest-priority product
milestone. Public catalog breadth, Discover, Compare, personalization, and
additional architecture hardening are secondary unless they expose or remove a
real blocker to this objective.

### 0.2 Canonical document set

| Document | Authority |
|---|---|
| **Game_Profile_Master_Product_and_Build_Plan_v0.7.md** | Product scope, positioning, public and admin information architecture, roadmap, phase status, architecture direction, and cross-system product contracts |
| **Game_Profile_Scoring_Rubric_v1.0.md** | Scoring semantics: dimensions, subcriteria, score meanings, evaluation-scope rules, unknown/range behavior, platform-sensitive scoring rules, and rubric versioning |
| **Game_Profile_Editorial_Evidence_and_Data_Sourcing_SOP_v0.2.md** | Evidence operations: source collection, evidence mapping, confidence practice, source transparency, and pre-release evidence workflow |
| **Game_Profile_Calibration_Round_1_Report_v0.1.md** and **Game_Profile_Calibration_Round_2_Report_v0.1.md** | Approved calibration outcomes and the canonical fixture totals and interpretation they explicitly publish |
| **Should_I_Play_Brand_and_SEO_Foundation_v0.2.md** | Brand/domain rationale, organic-acquisition strategy, and the search-engine launch/runbook layer; current route and hosting implementation is governed by this Plan and accepted ADRs |
| **Game_Profile_Art_Direction_and_Anti_AI_Design_Brief_v0.1.md**, D3 record, and ADR 0013 | Visual principles, anti-patterns, and the chosen production visual grammar |
| **ADRs in docs/decisions** | Accepted implementation and architecture decisions beneath the product and methodology contracts |
| **README.md** | Operational onboarding and a concise description of the repository as implemented |
| **Code, schema, migrations, and tests** | Evidence of implementation state and enforcement; they do not silently redefine product or methodology |

**Game_Profile_Project_Context_v0.6.md** is a historical continuity snapshot. It
contains pre-Cloudflare, pre-D3, and pre-Phase-2 assumptions and is not
authoritative after v0.7. If a compact continuity brief is still useful, create
a new version from this Plan rather than amending v0.6 in place.

### 0.3 Authority boundaries

The Master Plan does not redefine the scoring rubric. Where a question is about
what a dimension means, how a subcriterion is scored, when a value is unknown,
or whether separate evaluations are required, Rubric v1.0 is authoritative.

The Master Plan does not replace the Evidence SOP. Where a question is about
which evidence to gather, how to map sources, how to assign confidence, or how
to operate a pre-release evidence pack, the SOP is authoritative.

The Evidence SOP cannot change score meanings; evidence supports an editorial
judgment made under the rubric. Sources are never votes that are mathematically
averaged into a Game Profile score.

The calibration reports own the approved content they actually publish. Code
must not substitute independently derived scores or copy when approved
calibration outcomes exist. A later legitimate profile revision still follows
the normal immutable version and supersession workflow; calibration totals are
not a ban on future re-evaluation.

ADRs decide implementation beneath these contracts. An ADR may not silently
change the product, rubric, or evidence policy. If implementation reveals a
genuine conflict, the conflict is escalated to Tomas rather than normalized in
code.

An explicitly approved product decision made after this version may supersede
the relevant part of the Plan, but it must be recorded in an ADR or the next
Master Plan revision. Passing chat ideas and implementation convenience are not
authority.

At every phase checkpoint:

1. compare the Plan with the current README, ADRs, schema, routes, and tests;
2. reconcile any approved material change into the Plan;
3. update operational documentation that now contradicts the implementation;
4. preserve older versioned documents instead of editing history to look
   cleaner than it was.

### 0.4 Conflict protocol

When two sources disagree:

1. identify which document owns the subject;
2. prefer the newest explicit approved decision within that subject;
3. do not infer product meaning from whichever behavior the code happens to
   implement;
4. stop and request a product decision if the authority is genuinely ambiguous;
5. record the resolution so the same conflict cannot recur.

---

## 1. Product identity and thesis

### 1.1 Brand architecture

**Should I Play?** is the public product, website, wordmark, metadata identity,
and external description.

**Game Profile** is the eight-dimension evaluation, the methodology, and the
name retained by internal types, database objects, and historical files.
Internal identifiers such as GameProfile and game_profile are correct and do
not imply that the public brand decision is unfinished.

The working-title question in v0.6 is closed.

### 1.2 The problem

Most game-discovery products answer whether a game is generally liked, what
score critics or users gave it, how long it is, what is popular, or what is
similar.

They do not answer the purchase question with enough specificity:

> What kind of experience is this game, where is it strong, where is it
> demanding, and what kind of preference or tolerance makes it a good or bad
> purchase?

An aggregate score hides the shape of the experience. Two games can both be
excellent while offering almost opposite combinations of story, agency,
pacing, atmosphere, structure, and craft.

### 1.3 Product promise

> **Not just whether a game is good. What kind of good is it?**

Should I Play? publishes a consistent, evidence-backed Game Profile so a player
can understand the experience before spending money and time.

The useful mental model remains a nutrition label for games: standardized,
comparable, interpretable, and explicit about uncertainty.

### 1.4 Core principles

- There is no public aggregate Game Profile score.
- There is no aggregate score in metadata, JSON-LD, share cards, search, or
  hidden public sorting.
- Each defined profile scope is evaluated under a stable rubric; personal
  interpretation may be derived later without rewriting that public profile.
- A low dimension score can be neutral descriptive information rather than a
  verdict that the game is bad.
- Unknown is not zero.
- Range is not a precise score.
- Confidence and evidence maturity describe what is known, not how impressive a
  number looks.
- Sources support judgments; they are not numerically averaged.
- Historical published evaluations are preserved.
- One materially distinct evaluated experience gets its own profile scope
  rather than being averaged with another mode or edition.
- The public product must remain useful without accounts, social data, or
  personalization.

### 1.5 Product moat

The defensible system is the combination of:

1. a stable, published rubric;
2. a structured evidence and confidence practice;
3. multidimensional comparability;
4. purchase-oriented interpretation;
5. durable scope and revision history;
6. a recognizable profile instrument;
7. an editorial workflow capable of producing high-quality profiles
   consistently;
8. later personalization derived from the same public profile.

---

## 2. Users, jobs, goals, and non-goals

### 2.1 Primary audience

A player who buys several games a year, has limited time or budget, understands
that “good” and “for me” differ, and does not want to consume many long reviews
to make one purchase decision.

### 2.2 Secondary audience

An enthusiast comparing several credible games during a crowded release window.

### 2.3 Later audience

A user willing to state preferences or import play history so the public profile
can be interpreted personally.

### 2.4 Jobs to be done

**Purchase triage**  
Help choose among several credible games.

**Risk detection**  
Surface the structure, friction, punishment, pacing, or pressure that a positive
conventional review may not make salient.

**Experience expectation**  
Explain what spending many hours inside the game is likely to feel like.

**Fast research**  
Provide a credible, transparent picture without requiring a review marathon.

### 2.5 MVP and beta goals

The public product must let a visitor:

- find a game;
- understand its principal strengths quickly;
- understand its main risk or friction;
- read all eight dimensions and exact values;
- distinguish exact, range, and not-scored states;
- see evaluation scope, evidence state, confidence, and cutoff;
- inspect why a dimension received its score;
- compare meaningful profile differences;
- discover games by dimensions and experience traits;
- verify that a visible methodology exists.

The internal product must let an editor:

- create and maintain a game;
- define one or more profile scopes;
- author a new evaluation or revision;
- manage evidence, scores, confidence, tags, and interpretation;
- preview and validate the public result;
- publish transactionally;
- trigger and observe deployment;
- understand whether a published editorial version is actually live.

### 2.6 Product hypotheses

**Profile usefulness**  
The multidimensional profile helps purchase decisions more than a single score.

**Risk guidance**  
Primary Risk and recommendation blocks help prevent mismatched purchases.

**Comparison value**  
Aligned profiles help people choose among credible alternatives.

### 2.7 Non-goals

Do not build for the current product:

- native mobile applications;
- public user accounts;
- user reviews, comments, follows, or activity feeds;
- public list creation;
- community scoring or moderation;
- an AI chatbot;
- recommendation machine learning;
- storefront checkout;
- price tracking or deal alerts;
- game diary or backlog tracking;
- wiki-scale community metadata editing;
- automatic scraping of review text;
- a public aggregate score.

Personalization, saved games, notifications, storefront links, an API, and
embeddable profiles remain possible later layers. They are not prerequisites for
proving the core.

---

## 3. Game Profile methodology contract

This section describes how the product consumes the methodology. Rubric v1.0
remains authoritative for the scoring rules themselves.

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

Each dimension has five canonical subcriteria scored on:

- 0
- 0.5
- 1
- 1.5
- 2
- Unknown

The system derives the dimension value from the five subcriteria. Editors do not
enter dimension totals directly.

### 3.2 Public score representation

- Exact values display on a 0–10 scale in 0.5 increments.
- Unknown never becomes zero in storage, derivation, geometry, or copy.
- A supported range remains visibly a range.
- A missing or invalid required row is bad data, not evidence uncertainty.
- The radar is paired with exact score rows and never stands alone.
- No polygon area, mean, or weighted total is exposed as a rating.

The public/radar order is fixed and intentionally differs from the rubric
authoring order:

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

- product or edition;
- campaign or mode;
- covered platforms;
- build, patch, or current-state cutoff;
- evidence cutoff.

If a mode or edition materially changes the experience, it receives a separate
profile scope and evaluation history. Text matching does not decide whether two
versions belong to the same scope; that is an editorial judgment stored as a
relationship.

### 3.4 Platform-specific variation

The canonical base subcriterion score remains the value used to derive the
generic profile.

A material platform divergence is stored in
**subcriterion_platform_overrides**, keyed by evaluation, subcriterion, and
platform. It must differ from the base, carry a rationale, refer to a platform
the game ships on, and obey the same score grid.

Overrides:

- do not change the base dimension total;
- do not create a hidden second profile;
- may record Unknown as a real platform-specific state;
- fall back to the base through the platform-readings view where no override
  exists;
- support a future platform-specific reading without forcing platform choice
  into the current public UI.

The editor and public copy must not hide a severe platform divergence inside one
unexplained generic value.

### 3.5 Evidence and confidence

Each evaluation stores:

- evidence status: Verified, Provisional, or Pre-release;
- overall confidence;
- evidence cutoff;
- evidence maturity for pre-release work;
- evidence-ledger state;
- source relationships;
- score provenance;
- per-dimension confidence.

The four pre-release evidence-maturity states are:

- Announced
- Showcased
- Hands-on
- Review-code

Operational thresholds, evidence packs, confidence assignment, and pre-release
publication practice belong to the Evidence SOP.

### 3.6 Evidence ledger truthfulness

The calibration corpus contains broad evidence classes rather than a fully
reconciled set of individual source records. The stored ledger state therefore
distinguishes:

- **pending** — broad classes or incomplete source reconciliation;
- **populated** — individual source records are complete enough for literal
  source counts.

The public product must not present broad evidence classes as literal counts.
Counts remain suppressed while the ledger is pending.

When counts are shown, they count distinct sources, not links.

### 3.7 Score provenance

Score provenance records the durable origin of the numbers, not transient
workflow state:

- **editorial** — normal rubric-based work with editorial sign-off;
- **calibration** — approved through a named calibration round;
- **derived** — produced without editorial sign-off and accompanied by a public
  explanation.

Calibration rounds are rows in a registry, not enum values. A calibration
profile must name its round; a non-calibration profile must not. A future round
is data, not a schema migration.

Published provenance and referenced calibration-round metadata are immutable
history.

### 3.8 Recommendation and interpretation contract

Post-release profiles use:

- Great fit if…
- Know before buying…
- Probably not for you if…

Pre-release profiles use:

- Looks promising if…
- Watch before buying…
- Biggest unknowns…

Each profile also carries:

- one-line experience;
- Primary Pull;
- Primary Risk;
- controlled experience tags;
- platform warning where necessary.

Copy describes preferences and tolerances. It does not declare that a player
will love a game, convert score magnitude into morality, or disguise personal
taste as rubric meaning.

### 3.9 AI boundary

AI may assist with research summaries, contradiction detection, structured
notes, mapping candidates, missing-support flags, and copy drafts based on
approved structured data.

AI must not fabricate play, invent sources, silently resolve disagreement, turn
marketing claims into quality evidence, choose scores without editorial
responsibility, or publish automatically.

AI is not a dependency for Phase 2.

---

## 4. Profile identity, history, and public routing

### 4.1 Identity model

A Game Profile is one evaluated experience of a game, not the game row itself.

    game
      ├── profile scope "survival"
      │     └── v1 pre-release → v2 launch → v3 post-patch
      └── profile scope "wintermute"
            └── v1 launch → v2 post-patch

Both scopes may be simultaneously current. Each scope has:

- a stable key;
- a public label;
- a summary of what it covers and excludes;
- presentation order;
- an explicit primary flag;
- independent version numbers;
- an independent supersession chain.

The scope row is durable identity. Edition, mode, platforms, and build stay on
each evaluation so the historical snapshot preserves exactly what that version
claimed to cover.

### 4.2 Version and publication rules

- At most one evaluation may be Published per profile scope and rubric version.
- Draft, Review, Published, and Superseded are explicit states.
- Published and Superseded evaluations are immutable final snapshots.
- A correction creates a new version.
- Supersession is bidirectional, rubric-local, game-coherent, and scope-local.
- A predecessor is never overwritten or deleted out of history.
- PUBLIC_RUBRIC_VERSION is the explicit public cutover selector.
- Public selection filters on Published plus the public rubric version. It does
  not choose the highest version, newest timestamp, or first row.

### 4.3 Canonical route contract

    /games/[slug]              → the explicit primary scope
    /games/[slug]/[scope-key]  → a published sibling scope

There is no generic intermediary game-overview page at the bare slug.

The primary scope is explicit data: **profile_scopes.is_primary**. It is never
derived from display order.

Migration 0007 used existing display order once to backfill the new field for
the pre-existing single-scope corpus. That upgrade preserved prior behavior; it
is not an ongoing routing rule. After the field exists, ordering and primacy are
independent.

The product and database contract requires:

- at most one primary scope per game;
- for every rubric version under which a game publishes any scope, its primary
  scope must also have a Published evaluation under that same rubric version.

The second rule guarantees that the bare game URL resolves when the application
selects that rubric version. A sibling cannot be published first under a rubric
unless it becomes primary or the primary is published under the same rubric in
the same valid transaction.

Migration 0007 currently enforces a weaker cross-rubric form: it checks for any
Published primary evaluation, not a primary evaluation under each rubric being
published. That is sufficient for today's single-rubric corpus but not for a
future PUBLIC_RUBRIC_VERSION cutover. It must be tightened and regression-tested
before Phase 2A merges.

### 4.4 Canonicalization and errors

- A primary profile canonicalizes to the bare game URL.
- A sibling canonicalizes to its own scoped URL.
- The explicit primary-key route permanently redirects with 308 to the bare
  game URL.
- The sitemap lists each current public profile exactly once.
- Share cards, metadata, breadcrumbs, and JSON-LD resolve the actual scope.
- An unknown game, unknown scope, draft-only scope, or scope without a current
  Published evaluation returns 404.
- A route must never fall back from an unpublished primary to a sibling.

### 4.5 Multi-scope navigation

When a real game has several published scopes, every profile page for that game
must expose a clear scope switcher or equivalent sibling navigation.

The switcher:

- links to each profile's own canonical URL;
- makes the current scope explicit;
- uses the public scope label and, where needed, its summary;
- does not combine two evaluations into one page;
- does not make display order the owner of the canonical route.

The exact visual placement is Phase 2 applied design. The requirement is locked;
the current Phase 2A branch establishes the routes and data but does not yet ship
a dedicated scope-switcher component.

### 4.6 Structured-data identity

Each scope page is a distinct WebPage about the same VideoGame.

The WebPage owns the scope-specific URL and content. The VideoGame identity is
anchored on the game URL and shared across scope pages. No Review,
AggregateRating, or reviewRating schema is published.

---

## 5. Public information architecture

### 5.1 Implemented public routes

**/**  
Library entrance: proposition, game shelf, and explanation of a Game Profile.

**/games/[slug]**  
The game's primary Game Profile.

**/games/[slug]/[scope-key]**  
A sibling Game Profile for another materially distinct evaluated experience.

**/methodology**  
Public explanation of the eight-dimension method, generated from the canonical
typed rubric.

**robots.txt and sitemap.xml**  
Generated from site environment and published profile data.

### 5.2 Planned public routes

**/discover**  
Filterable catalog by platform, release state, genre/form, dimensions,
experience tags, confidence, runtime band where licensed data exists, and
release year.

**/compare**  
Side-by-side comparison for two to four profiles.

**/about**  
What Should I Play? is and is not.

### 5.3 Private routes planned for Phase 2

**/admin**  
Editorial queue, drafts, reassessments, deployment state, and recent activity.

**/admin/games/new**  
Manual game creation with future provider import feeding the same fields.

**/admin/games/[id]**  
Metadata, artwork rights record, profile scopes, primary scope, and evaluation
history.

**/admin/evaluations/[id]**  
Evidence, scores, confidence, platform overrides, tags, interpretation, preview,
validation, and publication.

Admin routes are authenticated, non-indexable, and absent from public sitemaps.

### 5.4 Game cards and catalog behavior

A card reads as a game first:

1. cover or a designed typographic sleeve;
2. title;
3. one sentence about the experience;
4. profile signal.

The small radar mark is last and decorative. The surrounding card names exact
strongest and weakest values so no meaning depends on shape or color alone.

Catalog sorting must not default to an undisclosed aggregate score. An internal
selected-dimension utility may support a user-directed query, but it is not a
public universal rating.

### 5.5 Compare contract

Compare aligns:

- scope and evidence state;
- runtime where available;
- all eight dimensions;
- Primary Pull and Primary Risk;
- key experience tags;
- meaningful platform warnings.

Two profiles may overlay radar polygons. Three or four profiles use aligned rows
or bars rather than an unreadable radar stack.

The product highlights differences, not winners.

---

## 6. Public Game Profile and visual system

### 6.1 Chosen direction

D0 art-direction exploration is complete. D3 — Game-Led Profile — is the
canonical production profile design.

The governing grammar is:

> authentic game identity or artwork → game-derived accent → attached graphite
> analytical field → bespoke radar and exact score instrument → editorial
> interpretation and evidence

D3 is no longer merely an experiment. The production game routes render its
component grammar. The design-lab D3 pages remain historical review surfaces
that are unavailable on production.

### 6.2 Site-wide visual constitution

The site is the frame; the games are the color.

- Site chrome is achromatic graphite and warm paper.
- Amber is the restrained brand signal for the question mark and dark-chrome
  affordances; it is not a general accent on light surfaces.
- Each game supplies one identity accent derived from its visual identity.
- The same accent marks a 4.0 and a 10.0; color never encodes quality.
- Archivo is the display, label, and numeric family.
- Newsreader is the prose family.
- Typography and ruled separation carry hierarchy.
- Containers do not become a soup of rounded cards.

### 6.3 Anti-generic guardrails

Do not introduce:

- generic SaaS dashboard composition;
- default component-library identity;
- glassmorphism;
- neon gamer styling;
- glow, scanlines, particles, or HUD brackets;
- black-purple gradients;
- rounded-card soup;
- blurred artwork as layout filler;
- quality semantics expressed as green/red;
- a second radar implementation.

Admin applied design may be denser and more utilitarian than the public site,
but it must remain clear, accessible, and intentional rather than becoming a
generic enterprise dashboard.

### 6.4 Profile hierarchy

The profile page presents:

- the game identity and hero stage;
- one-line experience;
- evidence-sensitive notice when pre-release;
- full eight-axis radar;
- eight exact score rows with disclosure;
- Primary Pull and Primary Risk;
- recommendation blocks;
- scope, confidence, evidence, and provenance;
- more profiles as the exit.

Methodology and trust material are available without taking over the first
viewport. Pre-release uncertainty is stated before the reader interprets the
numbers.

### 6.5 Radar and accessibility contract

- One canonical radar implementation serves page, card, and state harness sizes.
- Eight axes use the globally fixed order.
- Grid and spokes remain visible over the fill so the shape reads as a
  measurement rather than a badge.
- Exact values remain readable without hover.
- Range and Not scored are visibly distinct.
- Unknown creates no zero vertex.
- The radar is aria-hidden where exact semantic HTML is the real reading
  surface.
- Focus, keyboard, reduced motion, and 12px minimum label floors remain
  enforced.

### 6.6 Artwork intent and fallback

Authentic game artwork is a desired and material part of the intended production
experience. The product should actively establish a lawful, scalable sourcing
policy.

The artwork-free composition is the safe, finished fallback, not the desired
visual end state for the catalog.

Cover and hero are separate roles. Neither substitutes for the other:
portrait cover art should not be cropped into a landscape stage, and a
landscape hero should not be forced into a portrait card.

---

## 7. Artwork and external-data policy

### 7.1 Rights-aware artwork model

Every artwork record always carries:

- game and role;
- URL and intrinsic dimensions;
- source;
- clearance;
- basis.

The model also carries, where applicable:

- alt text and crop focus;
- provider identifier;
- credit;
- source page;
- retrieval date.

Clearance answers the rendering question:

- **production** — may appear publicly;
- **evaluation** — local and protected preview review only.

Basis records why the asset is held:

- licence;
- provider terms;
- press kit;
- direct permission;
- internal evaluation.

Production clearance cannot rest on internal-evaluation basis. Production
artwork must have auditable source and credit information.

### 7.2 Containment

- Evaluation-only artwork must not enter production output, including serialized
  client payloads.
- The Postgres reader filters clearance before constructing ProfileView.
- The evaluation overlay remains behind a build-time literal so production
  dead-code elimination can remove its URLs.
- No evaluation artwork binary or review screenshot is committed.
- Production containment scans the built artifact.
- Preview containment ensures public documents do not reference evaluation art.
- Cloudflare Access is the actual preview access control; noindex is only a
  discoverability instruction.

Until Access is enabled account-wide, preview URLs must be treated as
shareable-but-public and not posted durably.

### 7.3 Production artwork work still required

Before catalog-scale production artwork:

1. choose and document the lawful basis per source or publisher;
2. resolve contradictory or unsuitable provider terms;
3. decide whether permitted bytes are hosted, proxied, or loaded from the
   rights holder;
4. add remote-image or storage infrastructure only after the rights decision;
5. retain per-asset provenance;
6. preserve the artless state for missing or uncleared assets.

### 7.4 Metadata providers

Third-party providers may enrich factual metadata. They do not own the canonical
game identity, scores, evidence, interpretation, or revision history.

The repository's preferred initial direction remains IGDB behind a provider
adapter, subject to a fresh licensing and commercial-use review before
production integration. Manual entry remains valid.

Do not make the product dependent on one provider's terms or uptime.

### 7.5 Runtime

Runtime estimates live under the game, not the evaluation, and cannot flow into
the eight scores automatically.

Do not build on an unofficial HowLongToBeat scraper. Any future runtime source
must be licensed or otherwise approved and hidden behind the same provider
boundary.

Player-review data may be an evidence signal where terms permit. It is never a
vote directly mapped into a dimension.

---

## 8. Editorial system specification

### 8.1 Workflow

The complete workflow is:

    Game metadata
      → Profile Scope
      → Evaluation / Revision
      → Evidence
      → Five subcriteria per dimension
      → Derived dimension states and totals
      → Per-dimension and overall confidence
      → Platform deviations
      → Controlled tags
      → Interpretation
      → Preview
      → Validation
      → Editorial publication
      → Rebuild and deployment
      → Live

The tool authors the existing public product. It does not create a second
methodology, domain model, or renderer.

### 8.2 Admin access

Phase 2B must choose the smallest secure admin-access approach compatible with:

- Cloudflare Workers;
- the current Postgres architecture;
- a tiny initial team and perhaps a handful of trusted editors;
- low maintenance;
- no public account system.

Do not build a custom identity platform. Do not add speculative role or
permission machinery.

### 8.3 Game and scope editor

An editor can:

- create a game manually;
- manage canonical title, slug, aliases, developer, publisher, release state,
  dates, platforms, summary, and provider IDs;
- attach rights-aware artwork records;
- create, label, summarize, and order profile scopes;
- designate the primary scope explicitly;
- understand Game → Profile Scope → Evaluation History without database
  vocabulary;
- see why a scope cannot be published before the primary;
- treat a scope-key rename as migration-level identity work.

Metadata import later populates these same fields. It does not create a parallel
game model.

### 8.4 Evaluation editor

An editor can:

- start a draft for a selected scope;
- choose pre-release, launch, post-release, or retrospective context;
- declare edition, mode, platforms, build, and cutoffs;
- attach and map evidence;
- score all canonical subcriteria;
- record rationales and confidence;
- add material platform overrides;
- manage tags;
- write experience, pull, risk, and recommendation blocks;
- save partial valid drafts;
- create a revision from existing history without mutating the predecessor.

The editor derives totals live through the same scoring logic the public product
uses.

### 8.5 Evidence editor

The evidence workflow must support:

- stable source identity;
- source metadata and category;
- mapping to an evaluation, dimension, or subcriterion;
- platform scope where relevant;
- disagreement and spoiler-sensitive notes;
- direct-play distinction;
- accurate evidence-ledger state;
- source-count suppression until reconciliation is complete.

Two known schema gaps should be closed with the editors:

- evaluation_tags has no authored ordering column;
- evaluation_evidence_links has no authored ordering column.

The public reader currently provides deterministic canonical order. That is
correct for parity, but it is not a substitute for preserving deliberate
editorial order once the editors exist.

### 8.6 Validation and publication

Before editorial publication, validation must check at least:

- complete registered rubric shape;
- valid score grid and correct Unknown/range representation;
- required rationales;
- per-dimension confidence;
- required evidence and maturity fields;
- scope ownership and primary-scope invariants;
- scope-local version and supersession rules;
- required interpretation blocks;
- provenance coherence;
- platform overrides that differ from a real base and never alter totals;
- artwork clearance and basis;
- no personal/Tomas-specific language;
- no aggregate score;
- no spoiler leakage;
- no draft/review exposure.

Published and Superseded snapshots are immutable. Publication and supersession
must be transactional.

### 8.7 Reassessment and revision

The admin queue should flag:

- a pre-release game that has launched;
- a large patch, DLC, or material current-state change;
- low-confidence profiles;
- stale evidence cutoffs;
- incomplete ledgers;
- broken evidence links;
- new platform releases with material divergence;
- deployment failure or editorial publication still awaiting deployment.

The public reader deliberately excludes Superseded history. Phase 2D needs an
editorial history query and a public revision-history treatment without
weakening the public current-row selector.

---

## 9. Current technical architecture

### 9.1 Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Zod validation
- Postgres 16
- Drizzle ORM and migration tooling
- Vitest
- Playwright
- Cloudflare Workers
- OpenNext through @opennextjs/cloudflare
- GitHub Actions
- Node 22 build baseline

Vercel is not the host. Supabase is not the selected default database or auth
provider. A hosted Postgres provider and the admin-auth approach remain separate
open decisions.

### 9.2 Layering

The canonical public path is:

    Rubric and editorial records
      → Postgres reader or controlled fixture reader
      → GameWithEvaluation
      → buildProfileView
      → ProfileView
      → public components

**lib/data/games.ts** is the single public data-access boundary. Route and React
components do not know about Drizzle or SQL.

There is one domain/view contract, not fixture and database versions of the
product.

### 9.3 Postgres public read path

When DATABASE_URL is configured, the build:

- reads Published rows for PUBLIC_RUBRIC_VERSION;
- excludes Draft, Review, and Superseded rows by status;
- loads the whole published corpus in nine set-based queries;
- assembles the existing domain shape;
- filters artwork by clearance;
- exposes platform overrides without using them in base totals;
- orders tags and evidence deterministically for parity;
- memoizes the corpus for the one build process.

The three calibration profiles have field-for-field fixture/Postgres parity at
the public view boundary. All 24 approved calibration totals are unchanged.

Two carrier-level differences are intentional:

- fixture-authored internal handles become database UUIDs, but nothing renders
  or routes on those surrogate IDs; evidence source identity remains the stable
  source key and must match;
- raw tag and evidence-link arrays have no authored order columns yet, so the
  public builder orders them canonically and the rendered ProfileView remains
  identical.

### 9.4 Build-time database dependency

All public routes are prerendered. Postgres is read during the build, not by the
deployed Worker on each request.

Therefore Phase 2 public profiles require:

- DATABASE_URL as a Workers Builds build variable;
- no Worker database secret;
- no Hyperdrive binding;
- no request-time connection pool;
- no runtime dependency on Postgres availability for already deployed pages.

The build-time connection is intentionally single-connection and short-lived.

### 9.5 Temporary fixture compatibility path

Production Postgres is not yet provisioned. Until cutover, a build without
DATABASE_URL may use the isolated calibration fixture path and must announce
that choice loudly.

This is temporary compatibility, not a second datastore.

Once production Postgres is provisioned and cutover is declared complete:

- production DATABASE_URL is mandatory;
- a production build missing it must fail closed;
- production must never silently republish the calibration fixtures;
- fixtures remain valid only for unit tests, development/state harnesses, and
  parity/migration testing.

Activating production Postgres requires:

1. a hosted Postgres 16 instance reachable by Workers Builds;
2. DATABASE_URL configured as a build variable;
3. migrations and seed applied once;
4. a database-backed production build verified under workerd;
5. removal or environment restriction of the production fallback.

### 9.6 Static public rendering is locked for Phase 2

Public Game Profile routes remain prerendered/static throughout Phase 2.

Do not move /games routes to request-time database rendering merely to make an
admin Publish button appear instant.

Reasons:

- profiles change relatively infrequently;
- the editorial team is small;
- public pages remain fast and edge-served;
- a database outage cannot remove already deployed profiles;
- no Hyperdrive or runtime database path is required;
- the current rights-containment model remains simpler.

Runtime rendering may be reconsidered only after measured publication volume or
latency makes the static contract materially inadequate.

### 9.7 Editorial publication versus live deployment

For Phase 2D, “Published” and “Live” are distinct states:

    editor approves publication
      → database publication transaction commits
      → deployment is requested
      → build reads the new Published corpus
      → verification succeeds
      → deployment succeeds
      → new profile is Live

If build or deployment fails:

- the database version remains editorially Published and awaiting deployment;
- the previous deployed artifact remains publicly Live;
- the admin shows the mismatch clearly;
- an editor can inspect the failure and retry;
- the system does not claim that the new version is live.

The exact persistence model, hook authentication, retry policy, and deployment
status table are Phase 2D implementation decisions. The behavioral distinction
is locked.

### 9.8 Cloudflare/OpenNext deployment contract

- Porkbun remains the registrar; Cloudflare is authoritative DNS, CDN, and
  application host for shouldiplay.gg.
- The apex shouldiplay.gg is the production custom domain; www redirects to the
  apex.
- Once that custom domain is confirmed live, the production Worker must stop
  answering on its workers.dev hostname so there is no second address serving
  canonical content.
- Production deploys from main only.
- Non-main branches create preview versions.
- Preview builds are noindex and canonicalize to production.
- Preview access requires Cloudflare Access.
- The Worker name is should-i-play.
- Workers Paid is required by the current bundle-size contract documented in
  ADR 0008.
- Production deploys the exact artifact verified under workerd.
- A branch build cannot promote itself to production.
- Rollback uses Cloudflare deployment history.

OpenNext must use the static-assets incremental-cache adapter so the Worker
serves the HTML produced by the database-backed build instead of re-rendering
inside workerd.

The verification path must populate that cache in the same way deployment does.
Verifying an artifact assembled differently from the one deployed is not
verification.

Do not add dynamicParams = false to the game page routes under the current
OpenNext version. It causes every game page to fail in workerd despite a
successful Next build and local server.

### 9.9 Search architecture

Start with Postgres full-text search, trigram similarity, and aliases.

Do not add Algolia, Elastic, Typesense, or another search service until measured
requirements justify it.

### 9.10 No additional service layer

Do not add:

- microservices;
- GraphQL;
- a separate public API service;
- an event bus;
- speculative repository/service abstractions;
- a second rendering model.

Use the smallest maintained system that preserves product semantics and
historical integrity.

---

## 10. Data model constitution

### 10.1 Core hierarchy

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

Shared registries and metadata:

- rubric_versions
- dimensions
- subcriteria
- calibration_rounds
- tags
- evidence_sources
- platforms
- game_platforms
- game_aliases
- game_external_ids
- game_time_estimates
- game_artwork

### 10.2 Games

A game owns stable factual/editorial metadata, aliases, platforms, external IDs,
runtime data, artwork records, and profile scopes.

A game may exist without any public evaluation.

### 10.3 Profile scopes

A scope owns the durable identity of one evaluated experience and contains:

- key;
- public label;
- summary;
- is_primary;
- display_order.

Key changes are migrations. Labels, summaries, and presentation order are
editable metadata. Reordering does not change canonical ownership.

### 10.4 Evaluations

An evaluation is one immutable-capable version inside a scope and includes:

- rubric and version number;
- mandatory edition, mode, platform, and build scope;
- current-state and evidence cutoffs;
- workflow status;
- evidence status and maturity;
- overall confidence;
- evidence-ledger state;
- interpretation fields;
- platform warning;
- score provenance and optional calibration round or derived note;
- author/reviewer fields;
- publication time;
- predecessor and change summary.

### 10.5 Rubric integrity

Rubric versions are registered and declare a non-empty expected shape.
Dimensions and evaluations reference that registry. Cross-rubric score,
dimension-assessment, and evidence relationships are refused.

Rubric identities and final snapshots are frozen so history cannot be rewritten
through child rows or shared metadata.

### 10.6 Derived values

Dimension totals are derived in TypeScript for the application and in a
Postgres view for queryability. They are not stored as editable duplicate
numbers.

Parity tests protect both interpretations.

### 10.7 History

Evaluation versions and supersession are the canonical historical record.
Field-level revision events may support editorial audit, but they do not replace
versioned final snapshots.

---

## 11. SEO, discoverability, and measurement

### 11.1 Discoverability contract

Organic search is a primary acquisition channel and an architectural property.

Every public profile must have:

- permanent canonical URL;
- scope-correct title and description;
- Open Graph and social card;
- scope-correct structured data;
- sitemap inclusion exactly once;
- publication date;
- substantive server-rendered content.

Preview and design routes:

- are noindex and nofollow;
- do not enter the sitemap;
- canonicalize to production where applicable;
- cannot become production through a branch configuration mistake.

### 11.2 Product events

When analytics is added, the initial event vocabulary should cover:

- search submission and result opening;
- profile view;
- dimension expansion;
- methodology opening;
- scope switching;
- compare add and compare view;
- discovery filter use;
- profile sharing;
- optional outbound storefront click.

### 11.3 Key operating metrics

**Discovery**

- search-to-profile rate;
- zero-result rate;
- missing-game demand.

**Decision engagement**

- profile-to-compare rate;
- recommendation and rationale engagement;
- profiles per session;
- share rate.

**Trust**

- methodology visits;
- dimension expansion;
- return after a profile revision.

**Editorial operations**

- time to create a profile;
- profiles per week;
- confidence distribution;
- reassessment age;
- publication-to-live latency;
- deployment failure and retry rate.

Early qualitative validation remains essential: ask whether the profile helped
someone decide, what they inferred, and what would make them avoid the game.

---

## 12. Delivery phases and current status

### Phase 0 — Rubric and calibration

**Status: COMPLETE**

Delivered:

- Rubric v1.0;
- two calibration rounds;
- low, middle, and high anchors;
- three implementation profiles: Alan Wake 2, Returnal, Redfall;
- canonical totals and interpretation;
- evidence and pre-release operating model;
- radar plus exact-row visualization contract.

### D0 — Art-direction exploration

**Status: COMPLETE**

Delivered:

- Anti-AI art-direction brief;
- distinct exploratory directions;
- D3 consolidated Game-Led Profile;
- validation across three radically different score shapes and desktop/mobile;
- D3 promoted to the production game route;
- one site-wide visual system.

Profile-level art-direction exploration is closed. New public surfaces apply the
system; they do not restart it.

### Phase 1 — Public vertical slice and foundation

**Status: COMPLETE**

Delivered:

- Next.js application and typed rubric;
- production Game Profile, home, and methodology;
- three calibrated profiles;
- versioned Postgres schema and strong integrity constraints;
- profile scopes;
- platform overrides;
- general score provenance;
- rights-aware artwork;
- pre-release and evidence-state machinery;
- Cloudflare/OpenNext deployment;
- canonical domain and SEO foundation;
- preview isolation and artifact containment;
- GitHub Actions;
- Postgres, Playwright, and workerd verification.

### Phase 2 — Editorial system

**Status: ACTIVE**

#### 2A — Database-backed public read path and scope routing

**Status: COMPLETE AND APPROVED, WITH ONE REQUIRED PRE-MERGE CORRECTION**

Delivered:

- Postgres public reader behind the existing boundary;
- fixture/Postgres parity for all three calibration profiles;
- Published-only public selection;
- explicit primary scope;
- sibling scope route and canonical behavior;
- scope-correct sitemap, cards, and structured data;
- build-time DB architecture;
- static-assets incremental-cache deployment fix;
- database-backed CI, browser, and workerd verification.

At v0.7 authoring time, this implementation exists on the Phase 2A branch based
on the merged Phase 1 main. The cross-rubric primary-publication edge case
documented in Appendix A must be corrected and the branch merged before 2B
begins.

#### 2B — Admin access and game/scope foundation

**Status: NEXT**

Deliver:

- chosen admin authentication;
- protected, non-indexable admin shell;
- dashboard foundation;
- manual game editor;
- aliases, platforms, provider IDs, and rights-aware artwork fields;
- profile-scope editor;
- explicit primary-scope management;
- clear evaluation-history navigation;
- public multi-scope switcher, proven against a multi-scope test corpus and
  rendered only when a game has more than one published scope.

#### 2C — Evaluation authoring

**Status: PENDING**

Deliver:

- draft evaluation editor;
- evidence-source manager and mapping;
- 40-subcriterion score editor;
- per-dimension confidence;
- Unknown and range support;
- platform overrides;
- tags and authored ordering;
- one-line experience, pull, risk, and recommendation blocks;
- live derived totals and validation feedback.

#### 2D — Preview, validation, publication, and revision

**Status: PENDING**

Deliver:

- public-faithful draft preview;
- complete publish-gate UI;
- transactional publish and scope-local supersession;
- revision-history query and UI;
- rebuild/deploy trigger;
- Published/awaiting deployment/Live distinction;
- failure, retry, and deployment audit behavior;
- verification that the production database cutover is fail-closed and that no
  authorable content can silently fall back to fixtures.

#### 2E — Real editorial trial

**Status: PENDING**

Deliver:

- create Game #4 without source-code fixture edits;
- author three to five real profiles through the tool;
- include at least one workflow stress case such as multi-scope, pre-release, or
  material platform variance;
- measure editorial time and friction;
- correct workflow problems before scaling;
- prove a non-coding editor can publish end to end.

Phase 2 exit:

> A non-coding editor can create, evaluate, preview, validate, publish, deploy,
> and revise a Game Profile without touching source code.

### Phase 3 — Catalog, search, and content scale

**Status: PENDING**

Deliver:

- real search and aliases;
- catalog/home scaling;
- metadata adapter with manual fallback;
- 15–25 real profiles;
- stable card and scope navigation at catalog scale.

Exit: users can reliably find the games that exist.

### Phase 4 — Discover and Compare

**Status: PENDING**

Deliver:

- Discover filters with URL-persisted state;
- two-to-four-profile Compare;
- meaningful-difference summary;
- responsive comparison behavior.

Exit: the crowded-release purchase-triage use case is complete.

### Phase 5 — Public beta hardening

**Status: PARTIALLY PULLED FORWARD**

Already substantially delivered:

- canonical SEO;
- sitemap and robots;
- share cards and structured data;
- responsive and accessibility foundations;
- deployment hardening;
- CI and real-runtime verification.

Still required:

- About page;
- analytics and decision validation;
- search-engine launch runbook;
- final performance and accessibility audit;
- polished failure states;
- production artwork policy and rollout;
- catalog scale toward 40–50 profiles;
- final editorial and operational QA.

---

## 13. Current prioritized backlog

### P0 — Before Phase 2 exit

1. Tighten the primary-publication trigger to require a Published primary under
   each rubric version that has a Published sibling, and add the cross-rubric
   regression case.
2. Merge the approved Phase 2A implementation and v0.7.
3. Correct the two stale Phase 2A README statements.
4. Provision hosted production Postgres.
5. Configure build-time DATABASE_URL, migrate, seed, and verify.
6. Make production fail closed without its database after cutover and before
   normal DB-only editorial authoring begins.
7. Choose and implement minimal admin authentication.
8. Build game, artwork-record, and profile-scope administration.
9. Build evidence, score, confidence, platform-override, tag, and
   interpretation authoring.
10. Add explicit ordering for authored tags and evidence presentation.
11. Build preview and publish validation.
12. Implement transactional revision and supersession.
13. Trigger Cloudflare rebuild/deploy from publication.
14. Expose Published versus awaiting deployment versus Live.
15. Add revision-history reads and UI.
16. Run a three-to-five-profile editorial trial.
17. Establish the production artwork sourcing and clearance policy.

### P1 — Strong beta value

- Postgres search and aliases;
- metadata import;
- expanded catalog;
- multi-scope switcher in real content;
- Discover;
- Compare;
- analytics;
- About;
- runtime display where licensed data exists;
- store links if approved.

### P2 — After validation

- personal preference vector;
- derived personal match;
- saved games and shortlists;
- release-watch notifications;
- price context;
- API and embeddable cards.

### P3 — Do not start without a new product decision

- social graph;
- user reviews and comments;
- community scoring;
- native applications;
- recommendation ML;
- moderation systems;
- public profiles.

---

## 14. QA and acceptance

### 14.1 Required verification layers

**Source and build**

- type generation and TypeScript;
- lint with zero warnings;
- unit tests;
- production Next build;
- artifact containment.

**Database**

- migrations on empty and populated upgrade paths;
- schema contract and invalid-transaction tests;
- derived-score parity;
- scope-local lineage;
- primary-scope invariants;
- platform-override invariants;
- rights-aware artwork constraints;
- build-time public read-path parity and exclusion.

**Browser**

- desktop and mobile profile behavior;
- exact/range/Not scored states;
- keyboard and disclosure behavior;
- canonical and sibling routing;
- unknown and draft-only 404 behavior;
- primary-key redirect;
- no aggregate score.

**Cloudflare**

- build the deployable OpenNext artifact;
- populate the static cache;
- boot under workerd;
- verify production and preview SEO behavior;
- verify database-derived bytes are served;
- verify containment;
- deploy the exact verified artifact.

### 14.2 Current Phase 2A checkpoint

Checkpoint figures are evidence, not permanent targets:

| Suite | Phase 2A result |
|---|---:|
| Unit | 282 passing |
| Database contract | 148 assertions |
| Database public read path | 58 assertions |
| Browser/e2e | 50 passing |
| Fixture/Postgres parity | 45 field-level assertions over three profiles |
| Workerd verification | Passing with Postgres and temporary fixture path |
| Artifact containment | Passing for production and preview |

### 14.3 Product-semantic acceptance

Automated tests must continue to protect:

- no aggregate score in any channel;
- 24 approved calibration totals;
- Unknown not zero;
- range not exact;
- fixed radar order;
- complete registered rubric shape;
- immutable final snapshots;
- one Published evaluation per scope and rubric;
- independent scope histories;
- explicit primary ownership;
- primary publication under every rubric version that publishes a sibling;
- display order not affecting canonical URL;
- one indexable address per profile;
- platform overrides not changing base totals;
- source counts hidden while the ledger is pending;
- evaluation artwork excluded from production;
- preview non-indexability;
- production Worker bytes matching the build.

### 14.4 Editorial acceptance

Before Phase 2 exits, a non-coding editor must demonstrate:

1. create a new game;
2. create and designate a profile scope;
3. save an incomplete draft;
4. attach and map evidence;
5. score 40 subcriteria with rationales;
6. set confidence, tags, interpretation, and any platform warning;
7. preview all public states;
8. resolve validation errors;
9. publish;
10. observe deployment;
11. confirm the canonical page is live;
12. create a revision while preserving the old snapshot.

---

## 15. Risks and mitigations

### Risk — The product looks like another review score

Mitigate with no total, visible profile shape, risk-oriented interpretation,
comparison, and methodology.

### Risk — Subjectivity is disguised as science

Mitigate with the public rubric, half-step scale, rationales, evidence,
confidence, history, and no fake decimal precision.

### Risk — Editorial throughput remains the bottleneck

Mitigate by making the editor the current P0, running real editorial work during
development, measuring time, and resisting unrelated architecture work.

### Risk — Static publishing obscures what is live

Mitigate by separating Published from Live, tracking deployment, preserving the
last good artifact, and surfacing failure and retry.

### Risk — Production silently falls back to fixtures

Mitigate by loudly labeling the temporary path and failing closed after database
cutover.

### Risk — Rights-unsafe artwork leaks

Mitigate through rights-aware rows, query-level clearance filtering,
environment gates, Access-protected previews, and artifact scanning.

### Risk — Third-party providers become product infrastructure

Mitigate with adapters, internal canonical data, manual fallback, licensing
review, and no score dependency.

### Risk — Scope semantics collapse back into one profile per game

Mitigate with profile-scope identity, scope-local uniqueness and history,
explicit primary ownership, canonical sibling URLs, and admin workflow that
makes the hierarchy legible.

### Risk — Platform overrides become competing totals

Mitigate by keeping base values canonical, storing deviations separately, and
testing that totals do not move.

### Risk — Architecture hardening crowds out content

Mitigate by requiring a concrete blocker or measured failure before new
infrastructure work and by making Game #4 the next major proof.

---

## 16. Working model and engineering rules

### 16.1 Roles

**Tomas**

- product owner;
- final decision maker;
- product and quality sanity check;
- approves launch.

**ChatGPT**

- product and project lead;
- owns Plan coherence and prioritization;
- converts feedback into explicit contracts;
- reviews implementation against product meaning;
- identifies drift and scope creep;
- maintains continuity and checkpoint reconciliation.

**Claude**

- engineering lead and product designer;
- proposes implementation options;
- writes code, migrations, tests, and deployment changes;
- produces previews and verification;
- raises product tradeoffs;
- does not redefine product semantics without approval.

### 16.2 Material decision protocol

For a material ambiguity, return:

1. the decision required;
2. the recommended option;
3. alternatives;
4. product consequences;
5. technical consequences.

Implementation details that do not affect user experience, methodology, data
integrity, rights exposure, or durable architecture may be chosen and documented
without escalation.

### 16.3 Engineering rules

1. Prefer boring, maintained technology.
2. Keep one application and one public domain model.
3. No microservices, GraphQL, or event bus.
4. No public authentication in MVP.
5. Keep scoring versioned and testable.
6. Seed rubric labels from canonical data; do not scatter string copies.
7. Separate editorial truth from third-party metadata.
8. Preserve history.
9. Never derive Verified from release date.
10. Never auto-publish AI output.
11. Optimize mobile profile reading.
12. Treat Compare as a product, not a generic table.
13. Optimize editorial throughput.
14. Avoid fake precision.
15. Surface uncertainty.
16. Keep main deployable and use meaningful PRs.
17. Include decisions, schema impact, tests, limitations, and screenshots where
    relevant in PR descriptions.
18. Do not bundle unrelated refactors with product work.
19. Do not reopen accepted foundations without a concrete blocker.
20. Ask for a product decision only when the answer materially changes the
    product or its durable contract.

---

## 17. Decisions still open

These are genuine open decisions. They must not be confused with already locked
contracts.

### Required during Phase 2

1. **Hosted Postgres provider and provisioning owner.**
2. **Minimal admin authentication approach.**
3. **Exact publish/deploy integration:** secure trigger, status persistence,
   retries, and failure audit.
4. **Exact admin information design** within the locked workflow.
5. **Authored ordering representation** for tags and evidence links.
6. **Revision-history public presentation** and how much history is exposed.
7. **Production artwork sourcing policy:** provider or publisher basis, storage,
   refresh, and clearance process.
8. **Cloudflare Access operational completion** for preview URLs if not already
   enabled.
9. **Canonical-domain operational confirmation:** verify the apex and www
   redirect, then disable workers.dev if the custom domain is live.

### Required before or during later phases

10. Final metadata provider after current licensing review.
11. Licensed runtime source and whether runtime appears at beta.
12. Whether store links appear at launch.
13. Whether Compare is beta day one or immediately after.
14. Analytics implementation and consent requirements.
15. Monetization.
16. Long-term personalization onboarding.

### Decisions that are not open

- Public brand is Should I Play?
- Game Profile is the evaluation and methodology.
- Rubric v1.0 is canonical.
- There are eight dimensions and no aggregate score.
- D3 is the production profile direction.
- Radar remains paired with exact score rows.
- Profile scopes are durable identity.
- Primary scope is explicit and not display order.
- Bare game URL serves the primary profile.
- Siblings have their own canonical subpaths.
- There is no intermediary game-overview page for now.
- Base scores remain canonical; platform overrides do not change totals.
- Provenance kinds are editorial, calibration, and derived.
- Artwork must carry clearance and basis.
- Authentic artwork is an intended production goal.
- Uncleared artwork cannot render in production.
- Postgres is the operational editorial source.
- Public Postgres reads occur at build time in Phase 2.
- Public profiles remain prerendered/static in Phase 2.
- Editorial publication triggers a rebuild/deploy before content becomes Live.
- Production must fail closed without its database after cutover.
- Public accounts, social features, and recommendation ML are out of current
  scope.

---

## 18. Public beta definition of done

Public beta is ready when:

- 40 or more varied, high-quality profiles exist;
- released profiles have credible Medium or High confidence where evidence
  supports it;
- pre-release profiles are unmistakably different;
- search works for titles and common aliases;
- multi-scope games navigate clearly;
- mobile profiles are excellent;
- Compare is available or has an explicitly near-term beta commitment;
- Methodology and About are public;
- no aggregate score exists in visible or machine-readable output;
- a non-coding editor can create, publish, deploy, and revise;
- production artwork use is lawful and auditable, with artless fallback;
- public pages are fast, accessible, indexable, and operationally observable;
- analytics can test search, profile, compare, and return behavior;
- at least ten real purchase decisions have been tested qualitatively.

Beta is not blocked by:

- native applications;
- public accounts;
- social features;
- hundreds of games;
- monetization;
- personalization.

---

## Appendix A — Current implementation baseline

This plan was reconciled against:

- Master Product & Build Plan v0.6;
- README on the Phase 2A branch;
- Rubric v1.0;
- Evidence SOP v0.2;
- ADRs 0001–0017;
- the Art Direction and Anti-AI brief;
- D3 design and asset-provenance records;
- the current schema, routes, public reader, CI, and deployment configuration;
- the approved Phase 2A report and subsequent product decisions.

Repository state used:

- merged Phase 1 main at commit 757513a;
- completed Phase 2A branch at commit 010151c.

The Phase 2A branch is the correct implementation baseline for v0.7 because it
contains accepted ADRs 0016 and 0017, explicit primary-scope routing, and the
Postgres build-time read path.

### Required Phase 2A correctness follow-up

The independent v0.7 audit found one edge case not covered by the 2A tests.
Migration 0007 asks whether a game with any Published scope has any Published
primary scope. Public resolution asks a stricter question: whether the primary
has a Published evaluation under PUBLIC_RUBRIC_VERSION.

With two registered rubrics, the current trigger permits:

- primary Published only under rubric 1.0;
- sibling Published only under rubric 2.0;
- public selector changed to 2.0;
- sibling scoped URL resolves while the bare game URL 404s.

This contradicts ADR 0016's canonical-availability purpose. The trigger and its
tests must key the check by game and rubric version before the Phase 2A branch
merges. This is an implementation correction to a locked rule, not a new product
decision.

### Known documentation follow-up

The Phase 2A README correctly documents most new behavior but still contains two
stale statements:

- its opening phase label says the repository is at Phase 1;
- a later database paragraph says the site does not yet read from Postgres.

Those lines should be corrected when Phase 2A and v0.7 merge. This does not
change the authority or implementation described here.

ADR 0017 also records static-versus-runtime publication as open because it was
written before the post-2A product review. The decision is now closed by this
Plan: Phase 2 keeps static public profiles and publication triggers
rebuild/deploy. A future ADR should record the concrete 2D deployment-state
implementation.

The repository still sets workers_dev to true because source configuration
cannot prove whether the account-level custom domain is attached. The approved
target is to turn it off after shouldiplay.gg is confirmed live. Preview Access
is likewise account-level and must be checked externally rather than inferred
from source.

---

## Appendix B — What v0.7 supersedes from v0.6

v0.7 removes or replaces these stale assumptions:

- “Game Profile” as the public working title;
- Rubric v0.1 and Project Context v0.1 references;
- Vercel hosting;
- Supabase as an already selected default DB/auth stack;
- Vercel Analytics as the assumed analytics path;
- a pre-D0 generic design direction;
- profile-scope routing left undefined;
- primary scope inferred or selected by ordering;
- one Published evaluation per game;
- non-functional platform override storage;
- calibration-specific provenance values;
- bare artwork URLs without clearance and basis;
- fixture-backed public reads as the operational architecture;
- vague server/static rendering with route revalidation;
- publication treated as synonymous with live content;
- Phase 0, Phase 1, and the first ten foundation tickets described as future
  work;
- “one active published evaluation” without scope and rubric qualification;
- open questions already closed by the brand, D3, radar, routing, and Phase 2A
  decisions.

v0.6 remains preserved as a historical planning record.
