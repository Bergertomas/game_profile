# Should I Play? — Master Product & Build Plan v0.8

**Public product / site:** Should I Play?  
**Evaluation and methodology:** Game Profile  
**Canonical domain:** https://shouldiplay.gg  
**Product owner and final decision maker:** Tomas  
**Product and project orchestration:** ChatGPT  
**Engineering and product design:** Claude  
**Status:** Current product and roadmap constitution — Phase 2 active  
**Current checkpoint:** Phase 2C complete and merged; authoritative Neon Postgres provisioned, migrated and serving production builds; Phase 2D active — slice 2D-1 (preview, publish gate, transactional publication, revision history) and slice 2D-2 (deploy trigger, Published/awaiting-deployment/Live reconciliation, failure/retry/audit) both **complete, merged and deployed**. Migration `0009_deployment_tracking` **is applied** to the authoritative database, and production serves `/deployment-manifest` from a build of `main`. The tool now derives Live from evidence read back from the deployed artifact.
**Remote `/admin` is activated:** Cloudflare Access protects `shouldiplay.gg/admin`, the seven runtime Worker secrets are set and deployed, an editor has authenticated against the production Worker, and the first `production_verified` observation is recorded. The first *application-originated* Builds dispatch has still not been made; it belongs to 2E's first real publication.

**2D-2 is deployed and has not been exercised**, and the distinction is load-bearing rather than pedantic. *Proven:* a production build from `main`; the manifest live on the canonical origin with a digest matching the three published evaluations; behaviour under workerd; migration `0009` in the authoritative database. *Not yet exercised:* a real Cloudflare Builds POST from the application, a real build uuid persisted and reconciled, the first `production_verified` observation, and one complete Publish → dispatch → Live cycle. All four deployment tables are empty. Phase 2 is **not** frozen and remote-admin activation is **not** complete.

An N1 hardening pass follows 2D-2 and precedes activation: it makes every unresolved deployment request recoverable without SQL, makes a verification observation atomic, parses the dispatch reason at the Server Action boundary, and corrects an unknown-`/games/*` route that answered 500 in production instead of 404. It adds no migration and no new capability.\
**Date:** 2026-08-15 · checkpoint refreshed 2026-08-24 (2D-1, 2D-2 and N1 merged and deployed; remote admin activated)

---

## 0. Purpose, authority, and how to use this plan

### 0.1 Purpose

This document is the current operating specification for **Should I Play?** It defines the product we are building, the decisions already locked, the architecture those decisions require, the active delivery sequence, and the current backlog.

It is a **current-state constitution**, not a chronological amendment log. Master Plan v0.7 remains in the repository as history; v0.8 supersedes it for current product scope, information architecture, roadmap status, architecture direction, and cross-system contracts.

The immediate product objective remains:

> **A non-coding editor can create, evaluate, preview, validate, publish, deploy, and revise a Game Profile without editing source code or fixtures.**

Until that is true, the editorial machine is the highest-priority product milestone. Catalog breadth, Discover, Compare, personalization, and additional architecture hardening remain secondary unless they remove a real blocker to that objective.

### 0.2 Canonical document set

| Document | Authority |
|---|---|
| **Game_Profile_Master_Product_and_Build_Plan_v0.8.md** | Product scope, positioning, public/admin IA, roadmap, current phase status, architecture direction, and cross-system product contracts |
| **Game_Profile_Scoring_Rubric_v1.0.md** | Scoring semantics: dimensions, subcriteria, score meanings, scope rules, Unknown/range behavior, platform-sensitive scoring, and rubric versioning |
| **Game_Profile_Editorial_Evidence_and_Data_Sourcing_SOP_v0.2.md** | Evidence operations: source collection, mapping, confidence practice, transparency, and pre-release workflow |
| **Game_Profile_Calibration_Round_1_Report_v0.1.md** and **Game_Profile_Calibration_Round_2_Report_v0.1.md** | Approved calibration outcomes and canonical calibration content they explicitly publish |
| **Should_I_Play_Brand_and_SEO_Foundation_v0.2.md** | Brand/domain rationale, organic-acquisition strategy, and launch/runbook layer; current routing/hosting contracts are governed by this Plan and accepted ADRs |
| **Game_Profile_Art_Direction_and_Anti_AI_Design_Brief_v0.1.md**, D3 record, ADR 0013 | Visual principles, anti-patterns, and the chosen production visual grammar |
| **ADRs in docs/decisions** | Accepted implementation and architecture decisions beneath the product/methodology contracts |
| **README.md** | Operational onboarding and concise repository-as-implemented summary |
| **Code, schema, migrations, tests** | Evidence of implementation state and enforcement; they do not silently redefine product or methodology |

Historical Project Context and older Master Plan versions are continuity records, not current authority.

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

### 2.3 Public MVP/beta goals

A visitor should be able to:

- find a game;
- understand its main strengths quickly;
- understand its main risk/friction;
- read all eight dimensions and exact values;
- distinguish exact, range, and not-scored states;
- see scope, evidence state, confidence, and cutoff;
- inspect why a dimension received its score;
- compare meaningful profile differences;
- discover games by dimensions and experience traits;
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

### 2.5 Current non-goals

Do not build for the current product:

- native mobile applications;
- public user accounts;
- user reviews/comments/follows/activity feeds;
- community scoring/moderation;
- public list creation;
- AI chatbot;
- recommendation machine learning;
- storefront checkout;
- price tracking/deal alerts;
- game diary/backlog tracking;
- wiki-scale community metadata editing;
- automatic review-text scraping;
- a public aggregate score.

Personalization, saved games, notifications, storefront links, an API, and embeddable profiles remain possible later layers, not prerequisites for proving the core.

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

AI may assist with research summaries, contradiction detection, structured notes, mapping candidates, missing-support flags, and copy drafts based on approved structured data.

AI must not fabricate play, invent sources, silently resolve disagreement, turn marketing claims into quality evidence, choose scores without editorial responsibility, or publish automatically. AI is not a Phase-2 dependency.

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

- `/` — library entrance: proposition, game shelf, explanation.
- `/games/[slug]` — primary Game Profile.
- `/games/[slug]/[scope-key]` — sibling profile scope.
- `/methodology` — public methodology generated from the canonical typed rubric.
- `robots.txt` / `sitemap.xml` — generated from site environment and public profile data.

### 5.2 Planned routes

- `/discover` — filterable catalog.
- `/compare` — two-to-four-profile comparison.
- `/about` — what Should I Play? is and is not.

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

Compare aligns scope/evidence state, runtime where available, all eight dimensions, Primary Pull/Risk, key experience tags, and material platform warnings. Two profiles may overlay radar polygons; three/four use aligned rows or bars. The product highlights **differences, not winners**.

---

## 6. Public Game Profile and visual system

### 6.1 Chosen direction

D3 — **Game-Led Profile** — is the canonical production design.

> authentic game identity/artwork → game-derived accent → attached graphite analytical field → bespoke radar + exact score instrument → editorial interpretation/evidence

The site is the frame; games carry color.

### 6.2 Visual constitution

- Site chrome is achromatic graphite and warm paper.
- Amber is a restrained brand signal, not a general light-surface accent.
- Each game contributes one identity accent; color never means quality.
- Archivo is the display/label/numeric family; Newsreader is prose.
- Typography and ruled separation carry hierarchy.
- No card soup, generic SaaS dashboard language, glassmorphism, neon gamer styling, HUD decoration, black-purple gradients, generic component-library identity, or green/red quality semantics.
- One canonical radar implementation serves the product.

Admin may be denser and more utilitarian than the public site, but it must remain clear, accessible, and intentional rather than becoming generic enterprise UI.

### 6.3 Profile hierarchy

A profile presents:

- game identity/hero stage;
- one-line experience;
- pre-release uncertainty notice where applicable;
- full radar;
- eight exact score rows and rationales;
- Primary Pull / Primary Risk;
- recommendation blocks;
- scope, confidence, evidence, and provenance;
- sibling switcher where applicable;
- additional profiles as the exit.

### 6.4 Artwork intent and fallback

Authentic game artwork is a **desired and material part of the intended production experience**.

The artwork-free composition is a safe, finished fallback, not the preferred visual end state for the catalog.

Cover and hero are separate roles. Artwork must remain rights-aware and cannot render publicly without production clearance.

---

## 7. Artwork and external-data policy

### 7.1 Rights-aware artwork

Every artwork row carries:

- game + role;
- URL + dimensions;
- source;
- clearance (`production` or `evaluation`);
- basis (`licence`, `provider-terms`, `press-kit`, `permission`, `internal-evaluation`);
- audit metadata where applicable (credit, source page, retrieval date, provider id, alt/crop data).

Production clearance cannot rest on `internal-evaluation` basis. Production artwork must be auditable.

### 7.2 Containment

- Evaluation-only artwork cannot enter production output, including serialized client payloads.
- Public DB reader filters clearance before constructing `ProfileView`.
- Production artifact scanning remains mandatory.
- Preview `noindex` is not access control.
- Preview URLs containing unpublished/evaluation material require Cloudflare Access before they are treated as private review surfaces.

### 7.3 Production artwork work still required

Before catalog-scale production art:

1. define lawful basis per source/publisher;
2. resolve provider terms and commercial-use questions;
3. decide permitted hosting/proxy/hotlink strategy;
4. retain per-asset provenance;
5. preserve graceful artless fallback.

### 7.4 Metadata providers/runtime

Third-party providers may enrich factual metadata. They do not own canonical identity, scores, evidence, interpretation, or history.

Preferred initial metadata direction remains IGDB behind an adapter, subject to fresh licensing/commercial-use review. Manual entry remains valid.

Runtime lives under the game, cannot feed scores automatically, and must come from an approved/licensed source rather than an unofficial HowLongToBeat scraper.

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

### 8.4 Admin operating policy: local-first now, remote soon

**Initial Phase-2 development is local-first**, but remote admin is a **near-term operational requirement**, not a later-phase wish.

Current operating mode:

- local `/admin` connects to the authoritative hosted Postgres using `ADMIN_DATABASE_URL`;
- deployed `/admin` remains disabled by default until its real remote path is verified;
- merging admin code does not itself expose the editorial tool.

Remote `/admin` should be enabled **during Phase 2, before normal editorial operations / Phase 2E at the latest**, once all of the following are true:

1. authoritative hosted Postgres is provisioned;
2. Cloudflare Access application/policy is configured for the admin hostname/path;
3. request-time `ADMIN_DATABASE_URL` is configured for the deployed Worker;
4. the enabled Access + DB path is tested under the real Worker/workerd contract, not only `next dev`;
5. failure behavior remains fail-closed.

This is sequencing for safety, not a decision to keep admin local.

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

### 8.6 Evaluation editor — Phase 2C

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

Two schema gaps should be closed with the editors:

- `evaluation_tags` needs authored ordering;
- `evaluation_evidence_links` needs authored ordering.

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

### 8.9 Reassessment queue

Later admin queue should flag pre-release games that launch, material patches/DLC, low confidence, stale cutoffs, incomplete ledgers, broken evidence links, new material platform variance, and publication/deployment mismatch.

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
- future remote `/admin` via request-time `ADMIN_DATABASE_URL`;
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

This path is not yet exercised end to end, because remote admin is not yet activated; proving it belongs to the remote-admin activation checkpoint.

### 9.6 Production DB cutover — immediate next infrastructure checkpoint

Until hosted Postgres is provisioned, production may still use the isolated calibration-fixture compatibility path.

That path is temporary and must end before normal DB-only editorial operation.

Cutover sequence:

1. create the Neon Postgres project in Frankfurt;
2. apply migrations and canonical seed to the authoritative DB;
3. configure Cloudflare Workers Builds `DATABASE_URL`;
4. produce a database-backed production build;
5. run browser/workerd/containment verification against that build;
6. set `REQUIRE_DATABASE=1` so production fails closed if `DATABASE_URL` is missing;
7. remove or strictly restrict any remaining production fixture fallback once confidence is established.

After cutover, production must **never silently republish calibration fixtures** as though they were the editorial corpus.

### 9.7 Static public rendering is locked for Phase 2

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

Begin search with Postgres full-text + trigram + aliases. Do not add Algolia/Elastic/Typesense until measured requirements justify it.

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

Shared registries/metadata include rubric versions, dimensions, subcriteria, calibration rounds, tags, evidence sources, platforms, aliases, provider IDs, runtime estimates, and artwork.

### 10.2 Games

Game owns stable factual/editorial metadata, aliases, platforms, provider IDs, runtime, artwork, and profile scopes. A game may exist without any public evaluation.

### 10.3 Profile scopes

Scope owns the durable identity of one evaluated experience: key, label, summary, `is_primary`, `display_order`. Key becomes frozen once evaluation history begins; labels/summaries/order remain editable. Reordering never changes canonical ownership.

### 10.4 Evaluations

Evaluation is one version inside a scope and includes rubric/version, mandatory scope snapshot, status, evidence state/maturity, confidence, ledger state, interpretation, platform warning, score provenance, author/reviewer data, publication time, predecessor, and change summary.

### 10.5 Integrity

Rubric shape is registered and cross-rubric score/evidence relationships are refused. Final snapshots and rubric identity are immutable. Dimension values are derived in TypeScript and in Postgres for queryability, not stored as editable duplicate totals. Evaluation versions/supersession remain the canonical history.

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

### 11.2 Initial analytics vocabulary

When analytics is added, cover search submission/result opening, profile view, dimension expansion, methodology opening, scope switching, compare actions, discovery filters, sharing, and optional outbound store clicks.

### 11.3 Operating metrics

Track discovery/search success, decision engagement, trust behavior, editorial throughput, confidence distribution, reassessment age, publication-to-live latency, and deploy failures/retries. Continue qualitative testing of real purchase decisions.

---

## 12. Delivery phases and current status

### Phase 0 — Rubric and calibration

**COMPLETE**

Rubric v1.0, two calibration rounds, three implementation profiles, approved totals/interpretation, evidence model, pre-release model, and radar/exact-row contract are established.

### D0 — Art direction

**COMPLETE**

D3 Game-Led Profile is the production visual grammar. Do not restart profile-level art-direction exploration without a concrete product problem.

### Phase 1 — Public vertical slice and foundation

**COMPLETE**

Next.js application, rubric, public profile/home/methodology, Postgres schema/integrity, profile scopes, overrides, provenance, artwork rights model, Cloudflare/OpenNext, SEO, CI, containment, browser and workerd verification are established.

### Phase 2 — Editorial system

**ACTIVE**

#### 2A — DB-backed public read path and scope routing

**COMPLETE**

Delivered Postgres public read path, parity, Published-only selection, explicit primary scope, sibling routes/canonical behavior, build-time DB contract, static cache fix, and DB-backed CI/workerd verification.

#### 2B — Admin access and game/scope foundation

**COMPLETE — merged to main**

Delivered:

- Cloudflare Access editorial identity with Worker-side assertion verification;
- local-only development identity;
- authorization at read boundary and every mutation;
- admin shell and dashboard;
- game metadata editor;
- aliases, platforms, provider IDs;
- rights-aware artwork fields;
- profile-scope editor;
- explicit primary management;
- evaluation-history visibility;
- scope-key and published-slug identity locks;
- public scope switcher + synthetic multi-scope coverage.

#### Infrastructure checkpoint — authoritative Postgres cutover

**COMPLETE**

Neon Frankfurt provisioned, migrations and canonical seed applied, build-time `DATABASE_URL` configured in Workers Builds, verified under browser/workerd/containment gates, and failing closed with `REQUIRE_DATABASE=1`.

This was an infrastructure checkpoint between completed 2B and deep 2C/real editorial work, not a new product phase. Migrations are applied to the authoritative database *before* the branch that introduces them can build, because every public page is prerendered and therefore queries the live database during `next build`.

#### 2C — Evaluation authoring

**COMPLETE — merged to main**

Delivered:

- draft evaluation editor;
- evidence-source manager/mapping;
- 40-subcriterion score editor;
- per-dimension confidence;
- Unknown/range support;
- platform overrides;
- tags + authored ordering;
- one-line experience / pull / risk / recommendation blocks;
- live derived totals + validation feedback.

Also delivered: one working evaluation per scope, authored tag/evidence ordering (migration 0008), and a grouped subcriterion selector in evidence mapping.

**2C stop condition (met):** working evaluation authoring, verified against existing semantics, reviewed, then 2D opened.

#### Remote admin activation checkpoint

**DONE — 2026-08-24**

Deployed `/admin` is enabled and was verified under the real Worker contract, which is what this checkpoint asked for. Observed rather than assumed:

- a self-hosted Cloudflare Access application protects `shouldiplay.gg/admin` and its descendants, and nothing else — `/`, `/methodology`, `/games/*`, `/deployment-manifest`, `/robots.txt` and `/sitemap.xml` are all reachable unauthenticated;
- the seven runtime settings are Worker **secrets**, not Workers Builds variables, so a future `wrangler deploy` preserves them;
- an editor authenticated through Access and the dashboard rendered live editorial data, which exercises Access JWT verification and the Hyperdrive request-time path together;
- the first `production_verified` observation is recorded, and the published profiles read Live rather than *not proven*.

Two things this checkpoint did **not** establish, both deliberately left to 2E rather than manufactured against an unchanged corpus:

- the first **application-originated** Cloudflare Builds dispatch, and its reconciliation from request → build uuid → manifest;
- a direct reading of Hyperdrive `cacheStatus` in the metrics dashboard. The configuration carries `caching: { disabled: true }` and that was confirmed through the Cloudflare API, so the property is set; what is unobserved is the metric confirming it in flight.

Activation also found a real defect, which is why it existed: verification could never succeed, because a Worker's fetch to its own Custom Domain is routed to a non-existent origin unless `global_fetch_strictly_public` is set. See [ADR 0023](decisions/0023-verifying-production-from-inside-the-worker.md).

#### 2D — Preview, validation, publication, revision

**ACTIVE — delivered in two slices**

##### 2D-1 — preview, validation, publication, revision history

**COMPLETE — merged and deployed**

Delivered:

- public-faithful draft preview, rendered by the public renderer and assembled
  in the state publication would leave — including the scope switcher a first
  publication of a second scope would create;
- the complete publish gate of §8.8, reporting every failing rule at once
  rather than one constraint at a time;
- transactional publication and supersession, serialized against concurrent
  editorial mutation by a row lock taken before the gate reads;
- admin revision history, rubric-local lineage, every version previewable.

Requires no schema migration.

##### 2D-2 — deployment, and the Published/Live distinction

**COMPLETE — merged and deployed**

Delivered the Cloudflare Workers Builds rebuild trigger, deployment-state
persistence, Published/awaiting-deployment/Live reconciliation, and
failure/retry/audit behavior. Recorded in
[ADR 0022](decisions/0022-deployment-requests-and-proof-of-live.md).

The central decision is what counts as proof. A dispatch acknowledgement, a
build reported successful and a deploy step reporting success are all facts
about a *request*; none of them is a fact about what production serves. So the
deployed artifact publishes its own inventory at `/deployment-manifest`,
generated in the same build that renders the pages, and **Live is derived from
reading that back and from nothing else**. Build status is recorded and shown,
and is advisory: it answers "why has this not deployed", never "has this
deployed".

Three states, because two would lie: Live, awaiting deployment, and **not
proven** — the last for when production has not been verified recently enough to
say either way. `Live` is not an evaluation status and must not become one;
`tests/published-vs-live.test.ts` now checks that structurally as well as in
prose.

Reconciliation is editor-triggered. There is no cron, queue or background
service — §9.10, and a background poller would be the first thing here to touch
production with nobody present.

**Not yet exercised against the real Cloudflare API**: no credential exists in
the repository, no test may call it, and no production deployment has been
triggered through this path. That belongs with remote-admin activation, next to
the Hyperdrive path ADR 0021 records as equally unexercised.

#### 2E — Real editorial trial

**PENDING**

Deliver Game #4 without fixture edits, author 3–5 real profiles through the tool, include at least one stress case (multi-scope/pre-release/platform variance), measure friction, fix workflow problems, and prove non-coding end-to-end operation.

**Phase 2 exit:**

> A non-coding editor can create, evaluate, preview, validate, publish, deploy, and revise a Game Profile without touching source code.

### Phase 3 — Catalog, search, and content scale

**PENDING** — real search/aliases, catalog/home scaling, metadata adapter + manual fallback, 15–25 real profiles, stable scope navigation at scale.

### Phase 4 — Discover and Compare

**PENDING** — Discover filters, URL-persisted state, 2–4 profile Compare, meaningful difference summary, responsive behavior.

### Phase 5 — Public beta hardening

**PARTIALLY PULLED FORWARD**

Already substantial: SEO, sitemap/robots, share cards, structured data, responsive/accessibility foundations, deployment hardening, CI, real-runtime verification.

Still needed: About, analytics, launch runbook, final perf/a11y audit, polished failures, production artwork policy/rollout, catalog scale toward 40–50 profiles, final editorial/operational QA.

---

## 13. Current prioritized backlog

### P0 — immediate / before Phase 2 exit

Items 1–7, 10, 11 and 15 are **done**; the rest are open. Kept numbered rather
than deleted so the sequence stays legible against the roadmap above.

1. ~~**Provision Neon Postgres in Frankfurt.**~~ **DONE**
2. ~~Apply migrations + seed to the authoritative DB.~~ **DONE**
3. ~~Configure Cloudflare Workers Builds `DATABASE_URL`.~~ **DONE**
4. ~~Verify a real DB-backed production build under browser/workerd/containment gates.~~ **DONE**
5. ~~Set `REQUIRE_DATABASE=1`; eliminate silent production fixture fallback.~~ **DONE**
6. ~~Build Phase 2C evaluation/evidence/scoring/confidence/tag/interpretation authoring.~~ **DONE**
7. ~~Add authored ordering for evaluation tags and evidence links.~~ **DONE** (migration 0008)
8. Review 2C UX with a real scoring workflow; fix friction. **OPEN** — deferred to the dedicated admin UI/UX pass, and to 2E's trial, which is where real authoring volume will expose it.
9. ~~Configure and verify remote admin with Cloudflare Access + `ADMIN_DATABASE_URL`; enable during Phase 2 and no later than pre-2E editorial operations.~~ **DONE** (2026-08-24) — Access, the seven runtime secrets, an authenticated editor session and the first `production_verified` observation are all in place; the deployed Hyperdrive admin path is exercised end to end. The first real Builds dispatch is **not** part of this and remains open under item 12. Previously read: **OPEN** — now also the point at which the deployed Hyperdrive admin path is exercised end to end (ADR 0021) and the first real Cloudflare Builds dispatch is made. Nothing local can prove either. Hyperdrive query caching is no longer among them: the editorial configuration was set to `caching: { disabled: true }` in activation prep, before any deployment request existed, so read-after-write freshness is a settled property of the transport rather than something to discover on first use (ADR 0021, "activation prep: caching is disabled").
10. ~~Build 2D public-faithful preview and complete publish validation.~~ **DONE** (2D-1)
11. ~~Implement transactional publication/revision/supersession.~~ **DONE** (2D-1)
12. ~~Implement secure Cloudflare rebuild/deploy trigger.~~ **DONE** (2D-2, ADR 0022) — server-only user-scoped token, no deploy hook. The credential is now installed and the trigger id resolved to the production trigger (`branch_includes: ["main"]`), but **no build has yet been requested through the application**: the path from a dispatch to a reconciled build uuid is unexercised and is 2E's first real publication to prove.
13. ~~Expose Published / awaiting deployment / Live.~~ **DONE** (2D-2) — plus a third state, *not proven*, for when production cannot currently be verified.
14. ~~Add deployment failure/retry/audit behavior.~~ **DONE** (2D-2, hardened in N1) — append-only trail, coalescing on identical intent serialized against concurrent requesters, no automatic retry of an unestablished dispatch, and an operator path out of every durably unresolved state that never fabricates a provider outcome.
15. ~~Add revision-history reads/UI.~~ **DONE** (2D-1, admin-only)
16. Run 3–5 profile editorial trial. **OPEN** — 2E.
17. Establish production artwork sourcing/clearance policy. **OPEN**

### P1 — strong beta value

- Postgres search + aliases;
- metadata import;
- expanded catalog;
- real multi-scope content;
- Discover;
- Compare;
- analytics;
- About;
- runtime where licensed;
- approved store links.

### P2 — after validation

- personal preference vector;
- derived personal match;
- saved games/shortlists;
- release-watch notifications;
- price context;
- API/embeddable cards.

### P3 — requires new product decision

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

**Source/build** — TypeScript, lint zero warnings, unit tests, production build, artifact containment.  
**Database** — migrations on empty/populated paths, invalid-transaction tests, score parity, scope lineage/primary invariants, override invariants, artwork constraints, public read parity/exclusion, admin-write rules.  
**Browser** — desktop/mobile, exact/range/Not scored, keyboard/disclosure, canonical/sibling routing, 404 behavior, primary redirect, no aggregate score, admin disabled/enabled states as applicable.  
**Cloudflare** — build deployable OpenNext artifact, populate static cache, boot workerd, verify production/preview SEO, verify DB-derived bytes, verify containment, deploy exact verified artifact.

### 14.2 Current checkpoint evidence

2B merged after targeted review and fixes for:

- remote preview development-identity bypass;
- admin read authorization being too dependent on layout;
- ordinary-edit access to durable URL identity.

Post-fix reported gates were green across unit, DB contract, DB read/editorial-write tests, browser, workerd DB/fallback paths, containment, typecheck, and lint. These counts are checkpoint evidence, not permanent targets.

### 14.3 Product-semantic acceptance

Tests must continue protecting:

- no aggregate score anywhere;
- 24 approved calibration totals;
- Unknown not zero;
- range not exact;
- fixed radar order;
- complete rubric shape;
- immutable final snapshots;
- one Published evaluation per scope+rubric;
- independent scope histories;
- explicit primary ownership;
- rubric-specific primary-publication invariant;
- display order not changing canonical ownership;
- one indexable address/profile;
- identity locks for scope keys and published slugs;
- platform overrides not changing base totals;
- source counts hidden while ledger pending;
- uncleared artwork excluded from production;
- preview non-indexability;
- admin authorization next to sensitive reads and all mutations;
- development identity unavailable in deployed builds;
- production Worker bytes matching the verified build;
- production DB fail-closed after cutover.

### 14.4 Phase-2 editorial acceptance

Before Phase 2 exits, a non-coding editor must demonstrate:

1. create a game;
2. create/designate a scope;
3. start/save an incomplete draft;
4. attach/map evidence;
5. score 40 subcriteria with rationales;
6. set confidence, tags, interpretation, and material platform deviations;
7. preview public states;
8. resolve validation errors;
9. publish;
10. observe deployment state;
11. confirm canonical page Live;
12. create a revision preserving the previous snapshot;
13. perform the workflow remotely through Access-protected admin once remote admin is activated.

---

## 15. Risks and mitigations

### Product looks like another review score

Mitigate with no total, visible profile shape, risk-oriented interpretation, comparison, and methodology.

### Subjectivity disguised as science

Mitigate with public rubric, half-step scale, rationales, evidence, confidence, history, and no fake precision.

### Editorial throughput remains bottleneck

Mitigate by making 2C/2D the P0, testing real authoring early, measuring time/friction, and resisting unrelated architecture work.

### Static publishing obscures Live state

Mitigate by separating Published from Live, tracking deployment, preserving the last good artifact, and surfacing failure/retry.

### Production silently falls back to fixtures

Mitigate by immediate Neon cutover and `REQUIRE_DATABASE=1` fail-closed behavior.

### Remote admin exposure/misconfiguration

Mitigate with Access at the edge, Worker-side assertion verification, authorization next to reads/writes, no remote development identity, separate admin DB variable, disabled-by-default deployment, and enabled-path workerd verification before activation.

### Hosted DB region becomes wrong later

Frankfurt is selected for **current** editorial traffic, not as permanent doctrine. Reassess if public request-time DB traffic or geographically distributed editorial use changes latency assumptions.

### Rights-unsafe artwork leaks

Mitigate with clearance+basis records, query filtering, protected previews, and artifact scanning.

### Third-party provider lock-in

Mitigate with adapters, canonical internal data, manual fallback, licensing review, and ordinary-Postgres portability.

### Scope semantics collapse back to one profile/game

Mitigate with explicit scope identity, independent history, primary ownership, sibling URLs, scope switcher, and admin hierarchy.

### Architecture hardening crowds out content

Require a concrete blocker or measured failure before adding infrastructure; after the Neon cutover, the next product proof is evaluation authoring and then real Game #4.

---

## 16. Working model and engineering rules

### 16.1 Roles

**Tomas** — product owner, final decision maker, product/quality sanity check, launch approval.  
**ChatGPT** — product/project lead, Plan coherence and prioritization, contract definition, implementation review, drift/scope control, checkpoint reconciliation.  
**Claude** — engineering lead/product designer, implementation proposals, code/migrations/tests/deployment work, previews/verification, tradeoff escalation; does not redefine product semantics without approval.

### 16.2 Material decision protocol

For material ambiguity return:

1. decision required;
2. recommended option;
3. alternatives;
4. product consequences;
5. technical consequences.

Implementation details that do not affect user experience, methodology, data integrity, rights exposure, security, or durable architecture may be chosen/documented without escalation.

### 16.3 Engineering rules

1. Prefer boring, maintained technology.
2. Keep one application and one public domain model.
3. No microservices/GraphQL/event bus without measured need.
4. No public authentication in MVP.
5. Keep scoring versioned/testable.
6. Seed canonical rubric labels; do not scatter semantic string copies.
7. Separate editorial truth from third-party metadata.
8. Preserve history.
9. Never derive Verified from release date.
10. Never auto-publish AI output.
11. Optimize mobile profile reading.
12. Treat Compare as a product, not a generic table.
13. Optimize editorial throughput.
14. Avoid fake precision; surface uncertainty.
15. Keep `main` deployable and use meaningful PRs.
16. PRs should record decisions, schema impact, tests, limitations, screenshots where relevant.
17. Do not bundle unrelated refactors with product work.
18. Do not reopen accepted foundations without a concrete blocker.
19. Security checks belong at the sensitive operation/data boundary, not merely in shared layout/chrome.
20. Ask for a product decision only when the answer materially changes product or durable contract.

---

## 17. Decisions: closed and still open

### 17.1 Closed decisions

- Public brand = Should I Play?
- Game Profile = evaluation/methodology.
- Rubric v1.0 canonical; eight dimensions; no aggregate score.
- D3 is production profile direction.
- Radar paired with exact rows.
- Profile scopes are durable identity.
- Primary scope explicit; never inferred from display order.
- Bare game URL serves primary; siblings own canonical subpaths; no intermediary overview.
- Scope switcher exists for multiple published scopes.
- Scope keys freeze once any evaluation exists; game slugs freeze after publication.
- Base score canonical; platform overrides never alter totals.
- Provenance kinds = editorial/calibration/derived.
- Artwork requires clearance+basis; authentic artwork is intended; uncleared artwork cannot reach production.
- Postgres is operational source of editorial truth.
- One authoritative hosted production/editorial database, with separate disposable test/CI DBs.
- Hosted provider = **Neon**.
- Initial Neon region = **Frankfurt**, because current DB traffic is editorial/build-time rather than public-request traffic; revisit if assumptions change.
- Free tier is acceptable during development; upgrade when reliability/usage warrants.
- Public Postgres reads happen at build time through Phase 2.
- Public profiles stay prerendered/static through Phase 2.
- Editorial publication requires rebuild/deploy before Live.
- Cloudflare Access is remote editorial identity; Worker verifies the assertion.
- `ADMIN_DEV_IDENTITY` is local `next dev` only.
- Admin authorization is enforced next to reads and every mutation.
- Admin initially operates local-first, **but remote admin is a near-term Phase-2 requirement and should be enabled before Phase 2E at the latest after verification**.
- Production fails closed without database after cutover.
- Public accounts/social/recommendation ML remain out of current scope.

### 17.2 Open decisions required during Phase 2

1. ~~Exact 2C admin information design and interaction model for efficient 40-subcriterion authoring.~~ **CLOSED** by the shipped 2C editor; revisit in the dedicated admin UI/UX pass.
2. ~~Authored ordering representation for tags/evidence links.~~ **CLOSED** by migration 0008.
3. Exact remote-admin Cloudflare Access operational configuration and enabled-path verification runbook. **OPEN**
4. ~~Exact publish/deploy trigger authentication, persistence, retries, and audit model.~~ **CLOSED** — mechanism by [ADR 0020](decisions/0020-publication-preview-and-deploy-trigger.md) (Cloudflare Workers Builds API, rebuilding `main`); authentication, persistence, proof of Live, retry and audit by [ADR 0022](decisions/0022-deployment-requests-and-proof-of-live.md). Operational activation — issuing the token and exercising the path against the real API — is part of open decision 3.
5. ~~Revision-history public presentation and how much history is exposed.~~ **CLOSED for now** — admin-only, public reader unchanged (ADR 0020). Reopen when there is enough real history to know what a public view should promise.
6. Production artwork sourcing policy: legal basis, provider/publisher source, storage/refresh/clearance process. **OPEN**
7. Canonical-domain operational confirmation: apex/www and eventual `workers.dev` disablement. **OPEN**

### 17.3 Later decisions

- final metadata provider after licensing review;
- licensed runtime source / beta inclusion;
- store links at launch;
- exact Compare beta timing;
- analytics implementation/consent;
- monetization;
- long-term personalization onboarding.

---

## 18. Public beta definition of done

Public beta is ready when:

- 40+ varied high-quality profiles exist;
- released profiles have credible Medium/High confidence where evidence supports it;
- pre-release profiles are unmistakably different;
- search works for titles/common aliases;
- multi-scope games navigate clearly;
- mobile profiles are excellent;
- Compare exists or has an explicit immediate beta commitment;
- Methodology and About are public;
- no aggregate score exists in visible or machine-readable output;
- a non-coding editor can create, publish, deploy, and revise;
- remote editorial operations are safely usable behind Access;
- production artwork is lawful/auditable with artless fallback;
- public pages are fast, accessible, indexable, and observable;
- analytics can test search/profile/compare/return behavior;
- at least ten real purchase decisions have been tested qualitatively.

Beta is not blocked by native apps, public accounts, social features, hundreds of games, monetization, or personalization.

---

## Appendix A — v0.8 reconciliation baseline

v0.8 was reconciled against:

- Master Plan v0.7;
- merged `main` after Phase 2B / PR #16;
- README after Phase 2B;
- Rubric v1.0;
- Evidence SOP v0.2;
- ADRs through **0018**;
- D3 art-direction records;
- public Postgres read-path architecture;
- Phase-2B admin authentication/data-boundary implementation;
- the targeted post-review security/identity fixes;
- the product decisions made at the v0.8 checkpoint on database/provider/admin operation.

### Material v0.8 changes from v0.7

1. Phase 2A is no longer described as pending merge/correction; it is complete.
2. Phase 2B is now complete and merged.
3. The implemented public scope switcher replaces v0.7’s “still to build” wording.
4. Cloudflare Access is now the chosen remote editorial identity, with Worker-side verification.
5. Authorization lives at admin read/write boundaries; layout guard is defense in depth.
6. Development identity is explicitly local `next dev`, never a deployed preview.
7. Scope keys and published game slugs have explicit identity locks.
8. One authoritative hosted production/editorial Postgres is now locked; test/CI DBs remain separate/disposable.
9. **Neon Frankfurt** is selected as the initial hosted Postgres provider/region.
10. Production Postgres provisioning is the immediate infrastructure checkpoint.
11. Local-first admin is explicitly temporary sequencing; remote admin is a near-term Phase-2 requirement, required before Phase 2E at the latest.
12. P0 backlog is rewritten around Neon cutover → 2C → remote-admin activation → 2D → real editorial trial.

### Important operational truth at this checkpoint

The architecture is intentionally asymmetric:

```text
Public visitor anywhere
  → Cloudflare edge/static artifact
  → no Postgres request per page view

Editor (initially local; later remote)
  → admin application
  → authoritative Neon Postgres

Production build
  → Neon Postgres
  → prerendered artifact
  → Cloudflare deployment
```

That is why initial database region is selected around editorial/build access rather than assumed public traffic geography.

---

## Appendix B — immediate execution sequence after v0.8

Do not begin broad new product work out of order.

1. Merge/accept v0.8 documentation.
2. Provision Neon Postgres in Frankfurt.
3. Migrate + seed authoritative database.
4. Configure production build-time `DATABASE_URL`.
5. Verify database-backed production artifact under the real runtime.
6. Set `REQUIRE_DATABASE=1` and close the production fixture fallback.
7. Begin **Phase 2C only**; stop after evaluation-authoring checkpoint for review.
8. During Phase 2, configure/verify remote admin and enable it before Phase 2E normal editorial operations.
9. Proceed to 2D only after 2C product/UX review.

The next major product proof remains:

> **Should I Play? can create a new, evidence-backed Game Profile through the editorial tool rather than through source-code fixtures.**
