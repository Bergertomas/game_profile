# Phase 3A Item 5 — IGDB Staging Readiness Record

- **Date:** 2026-09-02
- **Status:** engineering record for the Item 5 implementation; **does not close Item 5 and does not authorize D1**. ChatGPT/GPT-5.6 Sol High performs the readiness audit; Tomas owns every decision listed in §9.
- **Revision 2 (2026-09-03):** incorporates the orchestrator's first-round audit corrections — scope-ownership key on identity candidates, ADR 0037 marked Proposed, the authoritative migration reclassified as a post-acceptance rollout step with a read-only preflight, the owner's legal/access status recorded, the live contract proofs made mechanically runnable, and cohort mapping moved to Item 6.
- **Task contract:** GitHub issue #48
- **Forensic audit:** `docs/audits/Game_Profile_Phase_3A_Item_5_IGDB_Staging_Forensic_Audit_2026-09-02.md`
- **Decision record:** `docs/decisions/0037-igdb-staging-identity-and-provenance.md`
- **Implemented from `main` at:** `79f0159b31009173ede153cfc77729d6d2e5ec91`

## 1. Boundary

No calibration or holdout game was researched, scored, fetched or mapped. No IGDB request was made: the execution environment holds no IGDB or Twitch credential (verified by variable name only), so the live probe ran in its credentials-absent branch. No production, deployment or publication action was taken. The one database written was a disposable local Postgres 16; the staging proof against it rolled back and left zero staged rows. No scoring semantics, rubric anchor, cohort membership, holdout rule, evidence rule or artwork clearance changed.

## 2. Module map

| Module | Responsibility | Authority |
|---|---|---|
| `lib/db/schema.ts` (IGDB section), `lib/db/migrations/0011_igdb_staging.sql` | Eleven `igdb_*` tables, their checks, the append-only trigger, one unique index on `game_external_ids` | ADR 0037 §§1–3, 5–6 |
| `lib/igdb/contract.ts` | The documented IGDB facts as constants: URLs, limits, env var names, game-type names, field list, query builders, image URL, attribution text | audit §2 |
| `lib/igdb/redact.ts` | Redaction of credential values and credential-shaped echoes; literal masking of a caller-held secret such as the presigned dump URL | issue #48 §5 |
| `lib/igdb/record.ts` | The one intermediate `IgdbGameRecord`; API JSON parser with expanded/bare reference handling; unexpanded-field reporting | ADR 0037 §4 |
| `lib/igdb/dump.ts` | Data Partner listing/descriptor schemas; CSV parsed by declared schema type; per-endpoint tables assembled into records | ADR 0037 §4 |
| `lib/igdb/dump-observation.ts` | Non-vacuous observation of the real CSV array/timestamp encodings: declared-column raw cells, scanned across rows until a **non-empty** value is seen | §6 C |
| `lib/igdb/proof-gate.ts` | The fail-closed pass conditions for live proofs B and C, as pure functions | §6 B–C, §10 |
| `lib/igdb/normalize.ts` | Deterministic normalization; identity class; relation derivation by asserting field; staging flags | ADR 0037 §2 |
| `lib/igdb/change.ts` | Change classification into five classes; `requires_editorial_review` | ADR 0037 §5 |
| `lib/igdb/client.ts` | Credentials by name; Twitch token in a form body; rate gate 4/s and 8 open; one 429 back-off; safe results | audit §2 |
| `lib/igdb/staging-write.ts` | Ingestion runs; idempotent upsert with change events; identity candidates; the single boundary write | ADR 0037 §§1, 5 |
| `lib/igdb/fixtures/staging-proof.ts` | The synthetic ten-record corpus and its revised observation | issue #48 §6 |

### Command surface

| Command | What it does | Network | Database |
|---|---|---|---|
| `npm run igdb:report` | Normalize the fixture, print identity classes, relations, flags and change classes | none | none |
| `npm run igdb:probe` | Dry run: what the live probe would do; whether credentials are present (names only) | none | none |
| `npm run igdb:probe -- --live` | The manual credential-safe readiness probe (§6 A) | **opt-in only; refuses CI** | none |
| `npm run igdb:probe -- --live --field-contract <id>` | The exact `IGDB_GAME_FIELDS` request for one non-cohort record through the production parser; structural facts only (§6 B) | **opt-in only; refuses CI** | none |
| `npm run igdb:probe -- --live --dump-sample [endpoint]` | Describe one dump (default `platforms`), download it once under a size cap, parse it through the production dump path, observe the real array/timestamp encodings; fails closed; the presigned URL is never printed (§6 C) | **opt-in only; refuses CI** | none |
| `npm run igdb:stage-proof` | Stage the fixture three times into a named non-production database; rolled back unless `--commit` | none | requires `CONFIRM_IGDB_STAGING=<db>` |
| `npm run igdb:preflight` | Read-only rollout preflight for `0011`: duplicates that would break the new unique index, whether 0011 is recorded, whether `igdb_*` tables exist | none | SELECT only |

There is no bulk import, sync or refresh command. Staging real records is Item 6 work, one development game at a time (§9).

## 3. Identity model and decisions

See ADR 0037 §§1–2 for the model. Decisions taken in this slice, each reversible and each recorded so it is not re-derived:

1. **`game_external_ids` remains the accepted canonical mapping.** Item 5 adds the reviewed route into it (`igdb_identity_candidates`) and the unique index `(provider, external_id)`. The index is an integrity rule, not a product change: two internal games holding one provider identity is a conflict for a person to resolve. `npm run igdb:preflight` reports any such duplicates before the index is ever applied.
1a. **A candidate that names a scope names that scope's own game.** `igdb_identity_candidates (scope_id, game_id)` is a composite foreign key against `profile_scopes (id, game_id)` — the ownership target ADR 0014 created for exactly this — and `igdb_identity_candidates_scope_needs_game` refuses a scope without a game (the gap a MATCH SIMPLE foreign key leaves open). `proposeIdentityCandidate` refuses the same crossed pairing with a sentence before insertion. Covered by unit, database and regression tests, including the populated-database upgrade path.
2. **Identity class is derived and stored beside its inputs**, with a database check that `version_edition` ⇔ `version_parent IS NOT NULL`, so the derived and raw views cannot disagree.
3. **`parent_game` on a record whose type is not additional content is `parent_game_unclassified`**, flagged for review. The fixture's "remake with a parent_game" case shows the shape. The layer does not guess.
4. **Relations are stored per asserting side.** A DLC edge appears once from the child's `parent_game` and once from the base's `dlcs`; the primary key includes the source field. A one-sided assertion between two staged records is an `info` flag, never an error.
5. **Platform release rows are staged on the record that carries them.** The edition's PS4 release is a release row on the edition, not on the base game; nothing merges them.
6. **Provider text (`name`, `slug`, `summary`, `url`, `version_title`) is staged and classified as drift when it moves.** A test proves renaming every fixture record changes no identity class and no relation.
7. **Calibration-title mapping is not performed, and is not an Item 5 condition.** Which IGDB record is each development title, and how an edition, an enhanced release or a platform-family scope maps onto `version_parent` / `parent_game` records, are identity candidates proposed and decided in Item 6 run preparation, one development game at a time, on this staging layer. Holdout titles are never staged into a development context; the live contract proof refuses any record whose name matches a cohort or holdout title (`lib/igdb/cohort-guard.ts`).

## 4. Provenance model

Every staged row carries `run_id` → `igdb_ingestion_runs (source_kind, source_ref, started_at, finished_at, record_count)`, `fetched_at`, the provider `checksum` and `igdb_updated_at` where supplied, `raw` (the provider record as received) and the normalized columns. `igdb_games` additionally carries `first_seen_at` and `last_changed_at`.

| Question (issue #48 §3) | Answer |
|---|---|
| provider / source | `source_kind` (`api` \| `dump` \| `fixture`) and `source_ref` (`api:v4`, `dump:<file_name>@<schema_version>`, or the fixture name) on the row and on its run |
| endpoint / entity id | the table is the endpoint; `igdb_id` is the entity id (covers and artworks keyed `(image_kind, igdb_id)` because they are separate id spaces) |
| checksum / updated_at | `checksum`, `igdb_updated_at` columns, per row |
| fetch time | `fetched_at`, per row; run timing on `igdb_ingestion_runs` |
| raw vs normalized | `raw` jsonb beside the normalized columns |
| review / acceptance state | `igdb_identity_candidates.state` with decider and time; `igdb_change_events.review_state` with reviewer and time |
| which local entity it maps to | `igdb_identity_candidates (game_id, scope_id, role)`; accepted canonical → `game_external_ids` |
| factual / artwork candidate / editorial input | by table: metadata tables are factual; `igdb_images` are candidates; nothing staged is editorial input until a person makes it one |

## 5. API + Data Partner dump strategy

One normalizer, two parsers (ADR 0037 §4). Which path is authoritative for what, **conditional on entitlement** the repository cannot verify:

| Need | Authoritative path | Fallback | Why |
|---|---|---|---|
| Initial / bootstrap load | Data Partner dumps (`/v4/dumps` → per-endpoint CSV, schema-versioned) | API point lookups by explicit id list, ≤500 per request | a dump is one consistent daily snapshot; the API at 4 req/s is not a bulk channel |
| Daily / bulk refresh | dumps (updated within 24 h) | API `where updated_at > <last run>` sweeps, ordered and offset-paged | same |
| Point lookup / verification | API `where id = (…)` with expanded table-backed names | — | authoritative current state for a few records; the probe pattern |
| Change detection | `checksum` + `updated_at` comparison in `stageNormalized`, from whichever path supplied the record | field comparison when a checksum is absent (flagged `missing_checksum`) | deterministic and path-independent |
| Development / calibration staging | API point lookups of the explicitly approved id list into a non-production database | — | tiny, auditable, no bulk |

Webhooks exist on the IGDB side but would require a public endpoint, i.e. a runtime dependency; they are not used. Popularity, ratings and PopScore are neither requested nor staged.

**Unverified in this environment, mechanically provable elsewhere:** the CSV cell encoding of `LONG[]` and `TIMESTAMP` columns in real dumps, and live acceptance of the exact expanded field list `IGDB_GAME_FIELDS` (nested expanders such as `release_dates.platform.name`). The adapter reads by declared schema type, accepts `{1,2}` and `[1,2]` arrays and unix or ISO timestamps, and refuses anything else rather than guessing; the parser tolerates bare references and reports unexpanded children, so a rejected expander degrades to a visible warning, not silent empty staging. `npm run igdb:probe -- --live --dump-sample platforms` and `--field-contract <non-cohort id>` (§6) report exactly these facts from a credentialed environment without editing source, and **fail closed** rather than reporting a warning beside a success. Dump access is enabled for the project (audit §2a), so the dump sample is expected to run.

## 6. Credential-safe live proofs

`scripts/igdb/probe.ts`, three opt-in proofs, all refusing CI, all printing through `redactIgdb`, none staging anything:

**A. Readiness probe** (`--live`): `credentials_present`, `auth_ok`, `igdb_request_ok`, `dump_entitlement_ok`, plus HTTP statuses, elapsed times, `game_types` count, token expiry seconds, and whether a pre-issued token was used. Credentials are read by name in `readIgdbCredentials`, sent in the Twitch form body and the IGDB headers by the client, and never printed.

**B. Field-contract probe** (`--live --field-contract <igdb_id>`): posts the exact `IGDB_GAME_FIELDS` query for one id, parses the response with the production parser and normalizer, and reports structural facts only — request status, records returned, parser acceptance, which requested children (if any) came back unexpanded, whether checksum/updated_at/type names resolved, identity class, relation counts by kind, release/artwork/company/alias/external counts, and staging flag codes. No name, summary or editorial content is printed. The record's name and alternative names are checked against the cohort and holdout titles and the probe aborts on a match, so the proof is made against a non-cohort record by construction.

**B fails closed.** `evaluateFieldContractGate` (`lib/igdb/proof-gate.ts`) passes only when the provider accepted the query, **exactly one** record came back, the production parser accepted it, and **`unexpanded_fields` is empty**. The parser deliberately tolerates a bare reference so that a rejected expander degrades to visible staging rather than silence — right for ingestion, wrong for a proof — so the command exits non-zero and names the unexpanded children when any requested expansion is unresolved. An ambiguous partial expansion must not look green.

**C. Dump-sample probe** (`--live --dump-sample [endpoint]`, default `IGDB_DUMP_PROOF_ENDPOINT` = `platforms`; `--dump-max-bytes` raises the 25 MB cap): calls `/v4/dumps/{endpoint}`, downloads the file once, parses it through `parseDumpCsv` with the descriptor's declared schema, and reports schema version, size, column names and types, rows parsed, and the array and timestamp encodings observed. The presigned S3 URL exists only in memory, is never printed, and is masked as a literal (with its query-free prefix) in every error string this proof can emit, so it cannot leak even if it stops looking signed.

**The endpoint is `platforms`, not `game_types`.** Read from <https://api-docs.igdb.com/> on 2026-09-03:

| Endpoint | Documented fields | Can prove an array? | Can prove a timestamp? |
|---|---|---|---|
| `game_types` | `checksum` (uuid), `created_at` (datetime), `type` (String), `updated_at` (datetime) | **No — no array field exists** | yes |
| `platforms` | `versions` ("Array of Platform Version IDs"), `websites` ("Array of Platform Website IDs"), `created_at`/`updated_at` (datetime), plus `name`/`slug`/`generation`/`platform_type`/`checksum` | **yes** | yes |

"All endpoints are available as CSV Data Dumps!", and `GET /v4/dumps/{endpoint}` returns `schema_version` plus a `schema` map of column → type whose documented vocabulary includes `LONG`, `STRING`, `LONG[]`, `DOUBLE`, `TIMESTAMP` and `UUID`. A dump proof therefore has to sample an endpoint whose schema really contains both an array type and a `TIMESTAMP`. `platforms` does and is a small reference table; the previous `game_types` instruction asked for an array encoding the endpoint cannot supply, so that proof was vacuous and is corrected here.

**C fails closed, and its observation is non-vacuous.** `parseDumpCsv` remains the sole authority on whether the file is acceptable. Only after it accepts does `observeDumpEncodings` (`lib/igdb/dump-observation.ts`) characterise the bytes, and it does so by reading the **raw cell of each column the descriptor declares** with that type — never by pattern-matching a whole CSV line, which would read a timestamp out of an unrelated `STRING` column. It scans data rows in file order until it has seen a **non-empty** array value and a timestamp value, or the (size-capped) file runs out, and reports `rows_scanned`, the column and row where each encoding was observed, and how many array cells were empty or unreadable. An empty array cell (`{}`, `[]`, blank, `NULL`) is not an observation: it carries no element, so it cannot show how an element is written.

`evaluateDumpProofGate` passes only when the descriptor was accepted, a real schema version was observed, the parser accepted the file, rows were parsed, **and both `array_encoding_observed ∈ {braces, brackets}` and `timestamp_encoding_observed ∈ {unix, iso}`**. `none` is never a pass. Two failures are named explicitly: an endpoint whose schema declares no array (or no `TIMESTAMP`) type cannot prove that half of the contract at all, and a declared type whose value was never observed is **inconclusive, not proved** — the declaration is not the evidence. In either case the command exits non-zero and states what endpoint or evidence is needed.

Run in this environment on 2026-09-02 (A only; B and C need credentials):

```
IGDB readiness probe

  credentials_present        false
  missing_variables          IGDB_CLIENT_ID; IGDB_CLIENT_SECRET (or IGDB_ACCESS_TOKEN)
  uses_pre_issued_token      false
  auth_ok                    false
  igdb_request_ok            false
  dump_entitlement_ok        false
  (statuses, timings, counts) null
```

Exit code 1, no network call. **The credentials are not present in this execution environment.** `auth_ok`, `igdb_request_ok` and `dump_entitlement_ok` therefore remain unproven here. The credentialed runner supplies A, B and C by running the three commands above and pasting the safe output into the Item 5 audit (§10); no source edit is needed.

## 7. Non-production staging proof

Fixture: ten synthetic records (`lib/igdb/fixtures/staging-proof.ts`; ids 9000001–9000010; no real title) covering base game, edition via `version_parent` with `version_title`, DLC / expansion / standalone expansion via `parent_game` and the base's arrays, remaster / port / bundle asserted from the base side, a remake that also carries a `parent_game` (the unclassified case), an orphan whose parent is not staged, twelve release rows across PC (6), PlayStation 4 (48) and a synthetic platform with a European regional release, five artwork candidates, companies, an alias and an external id. A revised observation changes one thing per change class.

`npm run igdb:report` (offline; reproducible):

```
records 10 · relations 13 · release dates 12 · artwork candidates 5 · flags 5 · order-independent yes
9000001 base_game · 9000002 version_edition (version_parent=9000001) · 9000003 dlc · 9000004 expansion ·
9000005 standalone_expansion · 9000006 remaster · 9000007 port · 9000008 bundle · 9000009 remake · 9000010 dlc
change: 9000001 provider_text_drift, artwork_candidate, identity_or_relationship review=no
        9000002 platform_or_release review=no
        9000003 material_scope review=YES
```

`npm run igdb:stage-proof` against a disposable local Postgres 16 seeded with the calibration corpus (rehearsal, rolled back):

```
pass 1 inserted 10 · pass 2 unchanged 10 (0 inserted, 0 updated, 0 events) · pass 3 updated 3, events 3, review prompts 1
idempotent re-stage yes · editorial boundary held yes
games 3→3 · profile_scopes 3→3 · evaluations 3→3 · game_artwork 0→0 · game_external_ids 0→0 · subcriterion_scores 120→120
```

Zero `igdb_*` rows remained after the rehearsal.

## 8. Change-review and artwork contracts

Change classes and the review rule are in ADR 0037 §5; the append-only trigger is `trg_igdb_change_events_append_only`. Artwork candidates are in ADR 0037 §6: `igdb_images` has no clearance, basis or credit column; regression section 10 and the boundary test prove it, and the staging proof shows `game_artwork` at 0 → 0. The static attribution requirement is recorded as `IGDB_ATTRIBUTION`.

## 9. Owner / legal status and later gates

Settled by the owner's clarification on issue #48 (2026-09-03; recorded in audit §2a): development API/data integration is explicitly authorized while the formal agreement is prepared, and Data Partner dump access is enabled for the project. Neither is an open Item 5 question.

Tracked as later gates, not Item 5 blockers:

1. **Signed partnership / public-commercial status.** No completed/signed agreement has been durably established; it is not claimed. It governs public-commercial use and the static attribution obligation, not development staging.
2. **Public image-use basis.** IGDB's service access does not sublicense third-party image rights. Staging an `image_id` is not a use; any public use needs the basis Tomas approves under ADR 0011 (`provider-terms` would require the terms to say so; `editorial-fair-use` remains operationally gated). Nothing here changes that.
3. **Item 6 identity mapping.** Which IGDB record is each development title, and how an edition, enhanced release or platform-family scope maps onto `version_parent` / `parent_game` records, are identity candidates proposed and decided one development game at a time in Item 6 on this layer. Holdout titles are never staged into a development context. For any applicable DLC/expansion, Tomas's explicit include/exclude decision remains required before scoring.
4. **Where attribution renders** on the public product is a later product decision.

## 10. Remaining Item 5 readiness items

Item 5 is judged on code, the non-production proof, and the live provider-contract proofs. Nothing below mutates authoritative data.

| # | Item | Owner | Evidence |
|---|---|---|---|
| 1 | Safe readiness probe with real credentials (§6 A): `credentials_present`, `auth_ok`, `igdb_request_ok`, `dump_entitlement_ok` | credentialed runner | probe output (safe fields only) pasted into the Item 5 audit |
| 2 | Field-contract probe on a non-cohort id (§6 B): provider accepts `IGDB_GAME_FIELDS`, exactly the one record returns, parser accepts the response, `unexpanded_fields` **empty** (the command exits non-zero otherwise) | credentialed runner | probe output |
| 3 | Dump-sample probe on `platforms` (§6 C): real schema version, production CSV parser accepts the file, rows parsed, a **non-empty** array encoding observed and a timestamp encoding observed (`none` is not a pass) | credentialed runner | probe output |
| 4 | ChatGPT/Tomas readiness ruling on this PR | orchestrator | PASS ruling |

## 10a. Post-acceptance rollout (not Item 5; separately authorized)

The Cloudflare Workers build of this branch is red because the build reads the authoritative database, which does not carry `0011`. That is an expected integration condition on a branch that adds a migration (README, "Migrations go out before the code that needs them"), not evidence against the staging architecture, and it is **not** to be fixed during the audit: issue #48 forbids production/bulk mutation during Item 5.

After acceptance, and on Tomas's separate explicit authorization (Working Agreement §4):

1. `DATABASE_URL=<authoritative> npm run igdb:preflight` — read-only; reports duplicates that would break `game_external_ids_provider_external_unique`, whether 0011 is already recorded, and whether `igdb_*` tables already exist. Resolve any duplicate first.
2. `DATABASE_URL=<authoritative> npm run db:migrate` — applies `0011` (additive: eleven new tables, one unique index; no editorial table altered).
3. The next Workers build of the branch goes green; merge follows the ordinary path.

D1 does not start until this integration step is complete.

## 11. Verification

### Revision 2 (2026-09-03, after the first-round audit corrections)

| Check | Result |
|---|---|
| `npm run typecheck`, `npm run lint` | pass (0 warnings) |
| `npm run test` | 77 files, 1250 tests pass (75 under `tests/igdb/`) |
| `npm run build` + `npm run check:containment` | pass (preview build; production containment unchanged) |
| `npm run test:db` (Postgres 16, disposable) | 208 passed, 0 failed — section 10 now includes the crossed scope/game rejection, the scope-without-game rejection and the valid own-scope candidate; the populated upgrade path applies `0011` with the composite key |
| `npm run test:db-read` | 12 files, 216 tests pass (17 in `igdb-staging.test.ts`, including the scope-ownership rule in code and in the database) |
| `npm run igdb:stage-proof` (rehearsal) | idempotent yes, editorial boundary held yes, exit 0 |
| `npm run igdb:preflight` | READY/nothing-to-do on a migrated database; **BLOCKED, exit 1** on a pre-0011 database seeded with two games sharing `igdb 777` |
| `npm run test:e2e` (Chromium via `PLAYWRIGHT_CHROMIUM_PATH`, local Postgres) | 221 passed, 0 failed, 0 flaky |
| GitHub Actions on `41bae50` | Quality and Integration green |
| `npm run igdb:probe -- --live` | credentials absent in this environment; exit 1; no network |

### Revision 1 (2026-09-02)

| Check | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass (0 warnings) |
| `npm run test` | 76 files, 1245 tests pass (70 new under `tests/igdb/`) |
| `npm run build` + `npm run check:containment` | pass (preview build; production containment unchanged) |
| `npm run test:db` (Postgres 16, disposable) | 205 passed, 0 failed, including section 10 and the populated-database upgrade through `0011` |
| `npm run test:db-read` | 12 files, 215 tests pass (16 new in `igdb-staging.test.ts`) |
| `npm run igdb:report` | as §7 |
| `npm run igdb:stage-proof` (rehearsal) | as §7; exit 0 |
| `npm run igdb:probe -- --live` | credentials absent; exit 1; no network |
| `npm run test:e2e` (Chromium via `PLAYWRIGHT_CHROMIUM_PATH`, local Postgres) | 221 passed, 0 failed, 0 flaky, exit 0 |
