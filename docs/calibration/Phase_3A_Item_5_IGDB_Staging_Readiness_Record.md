# Phase 3A Item 5 — IGDB Staging Readiness Record

- **Date:** 2026-09-02
- **Status:** engineering record for the Item 5 implementation; **does not close Item 5 and does not authorize D1**. ChatGPT/GPT-5.6 Sol High performs the readiness audit; Tomas owns every decision listed in §9.
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
| `lib/igdb/redact.ts` | Redaction of credential values and credential-shaped echoes | issue #48 §5 |
| `lib/igdb/record.ts` | The one intermediate `IgdbGameRecord`; API JSON parser with expanded/bare reference handling; unexpanded-field reporting | ADR 0037 §4 |
| `lib/igdb/dump.ts` | Data Partner listing/descriptor schemas; CSV parsed by declared schema type; per-endpoint tables assembled into records | ADR 0037 §4 |
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
| `npm run igdb:probe -- --live` | The manual credential-safe readiness probe | **opt-in only; refuses CI** | none |
| `npm run igdb:stage-proof` | Stage the fixture three times into a named non-production database; rolled back unless `--commit` | none | requires `CONFIRM_IGDB_STAGING=<db>` |

There is no bulk import, sync or refresh command. Staging real records is a later, owner-authorized step (§9).

## 3. Identity model and decisions

See ADR 0037 §§1–2 for the model. Decisions taken in this slice, each reversible and each recorded so it is not re-derived:

1. **`game_external_ids` remains the accepted canonical mapping.** Item 5 adds the reviewed route into it (`igdb_identity_candidates`) and the unique index `(provider, external_id)`. The index is an integrity rule, not a product change: two internal games holding one provider identity is a conflict for a person to resolve.
2. **Identity class is derived and stored beside its inputs**, with a database check that `version_edition` ⇔ `version_parent IS NOT NULL`, so the derived and raw views cannot disagree.
3. **`parent_game` on a record whose type is not additional content is `parent_game_unclassified`**, flagged for review. The fixture's "remake with a parent_game" case shows the shape. The layer does not guess.
4. **Relations are stored per asserting side.** A DLC edge appears once from the child's `parent_game` and once from the base's `dlcs`; the primary key includes the source field. A one-sided assertion between two staged records is an `info` flag, never an error.
5. **Platform release rows are staged on the record that carries them.** The edition's PS4 release is a release row on the edition, not on the base game; nothing merges them.
6. **Provider text (`name`, `slug`, `summary`, `url`, `version_title`) is staged and classified as drift when it moves.** A test proves renaming every fixture record changes no identity class and no relation.
7. **Calibration-title mapping is not performed.** Which IGDB record is Alan Wake 2, whether "Tears of the Kingdom — Switch 2 Edition" is a `version_parent` edition or a distinct record, whether "Hellblade II Enhanced" is an update, an edition or a re-release, and how Saros's PS5/PS5 Pro handling maps — these are exactly the identity candidates a person accepts, and they need credentials and Tomas (§9).

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

**Unverified without entitlement:** the CSV cell encoding of `LONG[]` and `TIMESTAMP` columns in real dumps. The adapter reads by declared schema type, accepts `{1,2}` and `[1,2]` arrays and unix or ISO timestamps, and refuses anything else rather than guessing. Confirming against one real dump is the first step after `dump_entitlement_ok` reads true.

**Unverified live:** acceptance of the exact expanded field list `IGDB_GAME_FIELDS` (nested expanders such as `release_dates.platform.name`). The parser tolerates bare references and reports unexpanded children, so a rejected expander degrades to a visible warning, not silent empty staging.

## 6. Credential-safe live probe

`scripts/igdb/probe.ts`. Reports `credentials_present`, `auth_ok`, `igdb_request_ok`, `dump_entitlement_ok`, plus HTTP statuses, elapsed times, `game_types` count, token expiry seconds, and whether a pre-issued token was used. Credentials are read by name in `readIgdbCredentials`, sent in the Twitch form body and the IGDB headers by the client, and never printed; every printed string passes through `redactIgdb`.

Run in this environment on 2026-09-02:

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

Exit code 1, no network call. **The credentials reported to exist are not present in this execution environment.** `auth_ok`, `igdb_request_ok` and `dump_entitlement_ok` therefore remain unproven here; running the probe where the credentials live is the first Item 5 follow-up (§10).

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

## 9. Unresolved owner / legal questions (STOP items — not decided here)

1. **Commercial partnership / Data Partner status.** The docs make commercial use a partnership with user-facing static attribution, and dumps exclusive to Data Partners. Issue #48 says authorization "has been reported"; no durable evidence of a signed agreement is in the repository. Until Tomas records the agreement (or its absence), `dump_entitlement_ok` from the probe is the only fact, and the API path is the operating assumption.
2. **Image terms.** ADR 0026 and Plan §7.3 hold IGDB pending "image clarification". Staging an `image_id` is not a use; any public use needs the basis Tomas approves under ADR 0011 (`provider-terms` would require the terms to say so; `editorial-fair-use` remains operationally gated). Nothing here changes that.
3. **Calibration identity mapping.** Which IGDB record is each cohort title, and how the Switch 2 Edition, the Enhanced release and the PS5 / PS5 Pro scope map onto `version_parent` / `parent_game` records, are identity-candidate decisions Tomas accepts. Holdout titles must not be staged into any development context (cohort lock, holdout protection).
4. **DLC inclusion for calibration scope** remains Item 3 / owner territory; the staging layer will surface DLC and expansion edges as candidates and `material_scope` prompts, never decide them.
5. **Where attribution renders** on the public product is a later product decision.

## 10. Remaining Item 5 blockers before D1

| # | Blocker | Owner | Evidence needed |
|---|---|---|---|
| 1 | Live probe with real credentials: `auth_ok`, `igdb_request_ok`, `dump_entitlement_ok` | Tomas / whoever holds the credentials | probe output pasted into the Item 5 audit (safe fields only) |
| 2 | Live acceptance of `IGDB_GAME_FIELDS` on a point lookup of a non-cohort id | engineering, after 1 | no `unexpanded` fields reported |
| 3 | Real dump CSV encoding confirmed (arrays, timestamps) if entitlement exists | engineering, after 1 | one endpoint parsed by declared schema without refusal |
| 4 | Commercial / image terms status recorded durably | Tomas | a dated record in `docs/` |
| 5 | Cohort identity candidates proposed and decided for the six development titles; holdout excluded | engineering proposes, Tomas decides | accepted `igdb_identity_candidates` rows in the non-production staging database |
| 6 | ChatGPT/Tomas readiness audit of this PR | orchestrator | PASS ruling |

## 11. Verification (2026-09-02, this environment)

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
| `npm run test:e2e` (Chromium, local Postgres) | pass, exit 0, no failures or flakes |
