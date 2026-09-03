# ADR 0037 — IGDB staging: provider identity, provenance and the editorial boundary

- **Status:** **Proposed** — candidate Item 5 engineering decision, pending the ChatGPT/Tomas readiness acceptance of the exact final record. It becomes Accepted only when Tomas/the orchestrator approves it. It does not approve IGDB as a dependency, does not clear artwork, and does not authorize D1.
- **Date:** 2026-09-02
- **Owner / final authority:** Tomas (product, editorial, legal posture); ChatGPT/GPT-5.6 Sol High performs the Item 5 readiness audit
- **Related:** Master Plan v0.9 §7.4, §10.1–10.2; Public Product Resolutions 2026-08-25 §7; ADR 0011 (artwork), ADR 0014/0016 (profile scopes), ADR 0026 (provider-first metadata ownership); issue #48

## Context

ADR 0026 fixed the ownership model — one approved primary provider for routine facts, provider-independent internal identity, field-level provenance, no provider influence on scores — and named IGDB as the preferred candidate pending written commercial/image terms and a representative data test. Nothing had been built: the schema held `game_external_ids` and `game_time_estimates`, the admin form let an editor type a provider id, and `lib/metadata/provenance.ts` selected between candidate values by declared ownership. There was no place to hold what IGDB actually said, no record of when or through which path it was fetched, and no way to say "this IGDB record is (or is not) that internal game" other than an editor writing the id directly.

Item 5 asks for the bounded staging/provenance layer that Phase 3A development scoring needs, without a catalog import, a runtime dependency, a scoring run or a publication. The current IGDB documentation (read 2026-09-02) fixes the facts this layer must respect: Twitch client-credentials OAuth, server-side requests only, 4 requests/second and 8 open requests, local storage explicitly preferred, user-facing static attribution under a commercial partnership, daily CSV dumps for Data Partners with a schema-versioned descriptor, table-backed `game_type`/`game_status` (the enum fields are deprecated), and two distinct parent fields on a game: `version_parent` ("if a version, this is the main game") and `parent_game` ("if a DLC, expansion or part of a bundle, this is the main game or bundle").

## Decision

### 1. Three identities, never collapsed

| Identity | Where it lives | Who may change it |
|---|---|---|
| Should I Play? canonical game and profile scope | `games`, `profile_scopes` | editorial, as before |
| IGDB entity | `igdb_games` (by IGDB id, with checksum and `updated_at`) | the staging job, faithfully |
| the relation between them | `igdb_identity_candidates` → accepted into `game_external_ids` | a named person |

A staged IGDB record is not a Should I Play? game. Tooling may *propose* that IGDB record X is the canonical record of game Y, or an edition, DLC, expansion, standalone expansion, remake/remaster, port or bundle of it. Only a decision carrying a decider's name moves a candidate out of `proposed`, and only an accepted `canonical_game` candidate is written through to `game_external_ids` — the table that has always held provider ids. One IGDB record can be the canonical record of at most one internal game, and one internal game can hold at most one canonical IGDB record; both are database constraints.

A candidate that names a profile scope names that scope's own game: a composite foreign key against `profile_scopes (id, game_id)` — the same ownership target `evaluations` uses — plus a check that a scope is never named without its game, so a candidate cannot pair game A with a scope of game B. The application refuses the same pairing with a sentence before the database does.

Internal identity is never derived from a provider name or slug. Those are staged as mutable provider text and classified as text drift when they move.

### 2. `version_parent` and `parent_game` are different facts, and stay different

IGDB's two parent fields are read as the two relations the provider documents, and every staged edge names the field that asserted it:

| IGDB field | Staged relation | Meaning |
|---|---|---|
| `version_parent` | `version_of` | same work, another edition (Gold, Deluxe, a platform-specific edition) |
| `parent_game` + child `game_type` | `dlc_of`, `expansion_of`, `standalone_expansion_of`, `mod_of`, `episode_of`, `season_of`, `pack_of`, `update_of` | additional content of the work |
| `parent_game` + any other child type | `parent_game_unclassified` | an open question, flagged for review, never guessed |
| base `dlcs`, `expansions`, `standalone_expansions` | the same content edges, asserted from the base side | |
| base `ports`, `remakes`, `remasters`, `expanded_games`, `forks` | `port_of`, `remake_of`, `remaster_of`, `expanded_game_of`, `fork_of` | another realisation of the work |
| base `bundles` | `bundle_contains` | a bundle that includes the work |

The database refuses `version_of` from any field but `version_parent`, refuses `version_parent` asserting anything but `version_of`, refuses a record that is its own parent or edition, and requires the derived `identity_class` to say `version_edition` exactly when `version_parent` is set. Each record's derived class (`base_game`, `version_edition`, `dlc`, `expansion`, `standalone_expansion`, `bundle`, `port`, `remake`, `remaster`, `other_content`, `unclassified`) is stored beside the raw fields it derives from, never instead of them.

Platform and release manifestations are their own rows (`igdb_release_dates`: platform, date, date format, region, status, each with checksum and `updated_at`), so "the PS5 release of the Gold Edition" is a release row on an edition record, not a third kind of game.

### 3. Provenance on every row

Every staged row carries the ingestion run that fetched it (`igdb_ingestion_runs`: source kind `api` | `dump` | `fixture`, source ref, timing, count), `fetched_at`, the provider checksum and `updated_at` where IGDB supplies them, the raw provider record as received, and the normalized columns beside it. A field can therefore answer: provider, endpoint/entity id, provider checksum/updated_at, fetch time, raw versus normalized value, which run and path produced it, and — through the candidate table — which internal entity it is mapped to and in what review state.

Which *kind* of thing a staged value is follows from its table: `igdb_games`, `igdb_release_dates`, `igdb_involved_companies`, `igdb_alternative_names` and `igdb_external_games` are factual metadata; `igdb_images` are artwork candidates; nothing staged is editorial input until a person makes it one.

### 4. One normalizer, two paths

The API (`/v4/games` with table-backed fields expanded to their names) and the Data Partner dumps (per-endpoint CSV, parsed by the dump descriptor's declared schema and assembled into game records) both produce the same intermediate record and go through the same normalizer, so staging cannot drift between paths. A test proves the fixture normalizes to byte-identical staging through both. Which path is authoritative for what is recorded in the readiness record, not here: it depends on entitlement the repository cannot verify.

### 5. Provider change is a review signal, nothing more

Re-staging a record compares it with what is held and appends one classified event to `igdb_change_events`: `provider_text_drift`, `artwork_candidate`, `platform_or_release`, `identity_or_relationship`, or `material_scope` (a change to `parent_game`, `version_parent`, `game_type`, or an edition/DLC/expansion/standalone-expansion edge). Only `material_scope` sets `requires_editorial_review`. The log is append-only by trigger: a row may be acknowledged or dismissed by a named person and may not be rewritten or deleted. No event touches an evaluation, score, publication state or artwork clearance; the writer module never names those tables, and a test walks its source and the row counts of those tables across a full staging run.

### 6. Artwork stays a candidate

`igdb_images` holds the provider's `image_id`, dimensions, image type, checksum and returned URL — enough to build a provider URL at any size and to attribute the asset later — and has no clearance, basis or credit column, so it cannot say an image may render. The only path to the public site is unchanged from ADR 0011: a human-created `game_artwork` row with `source = 'igdb'`, `external_id = image_id`, and the clearance and basis that editor decided. IGDB exposing an image proves nothing about rights, and the seven-step lawful-artwork path, containment and the artless fallback are untouched.

The commercial-partnership attribution requirement ("user facing attribution to IGDB.com … in a static location") is recorded with the integration (`IGDB_ATTRIBUTION`) so it travels with any later public use; where it renders is a later product decision.

### 7. No runtime or public dependency; no accidental live call

Nothing under `app/`, `components/`, `content/`, the public data boundary, the profile/search/home/compare/SEO modules or the build-time read path imports the provider layer, and the provider layer imports nothing from Next, the app or the editorial write path. The one live command, `npm run igdb:probe -- --live`, is opt-in, refuses under CI, requests no game record, and reports only safe booleans, statuses, timings and counts through redaction. CI runs no live call.

## Consequences

- Development/calibration staging can hold the IGDB facts for an explicitly listed set of ids, with full provenance, before D1 — once credentials are supplied and the owner mapping decisions in the readiness record are made. It cannot score, publish or clear anything.
- Editions, DLC, expansions, standalone expansions, ports, remakes, remasters and bundles arrive as distinct staged records with distinct relations; deciding which of them a profile scope covers remains Tomas's explicit decision (Item 3 preregistration, cohort lock), now recorded as an identity candidate rather than a chat recollection.
- `game_external_ids` gains one integrity index (one provider identity per internal game). Nothing else above the boundary changes.
- IGDB remains a *preferred candidate* under ADR 0026. This ADR builds the adapter and the boundary. Per the owner's durable status on issue #48 (comment of 2026-09-03): IGDB has explicitly authorized proceeding with the development API/data integration while the formal partnership agreement is prepared, and Data Partner dump access has been enabled for the project; a completed/signed agreement has not been durably established, and IGDB's service access does not sublicense third-party image rights. Development integration and dump access are therefore not open Item 5 questions; signed partnership/public-commercial status and public image-use basis remain later gates.
- Applying migration `0011` to the authoritative database is a **post-acceptance rollout prerequisite**, separately authorized by Tomas after this record and its code are accepted, preceded by the read-only `npm run igdb:preflight`. It is not part of Item 5 (issue #48: no production/bulk mutation during Item 5).

## Rejected alternatives

- **Writing IGDB fields onto `games`.** It is the failure ADR 0011 already removed once for artwork: provider truth becomes indistinguishable from editorial truth, and a refresh silently overwrites a correction.
- **One `relation` column with a free-text kind.** The two IGDB parent fields would be readable as one relation, which is exactly the conflation the staging layer exists to prevent.
- **Deriving the internal game from the IGDB record automatically when a name matches.** Mutable provider text is not identity (Plan §7.2). Matching is a proposal; acceptance is a person's.
- **A clearance column on staged images "for convenience".** Two places to say an image may render is one place too many; ADR 0011 keeps the question on the game record where a person answers it.
- **Building around the legacy `category`/`status` enums.** The migration period has ended; the table-backed fields are the target and the enum fields are not read.
