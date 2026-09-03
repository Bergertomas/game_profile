# Game Profile — Phase 3A Item 5: IGDB Staging Forensic Audit

- **Date:** 2026-09-02
- **Status:** engineering audit; input to the Item 5 implementation (ADR 0037) and to the ChatGPT/Tomas readiness audit
- **Base:** `main` at `79f0159b31009173ede153cfc77729d6d2e5ec91` (Item 4 merge, PR #46)
- **Task contract:** GitHub issue #48
- **Boundary:** no calibration game researched or scored; no IGDB record fetched; no production, database, deployment or publication action

## 1. Current-state findings before editing

Issue #48 §1 asks what already existed for each concern. Read from the code and migrations on the base commit.

| Concern | What existed on `main` | Where | Finding |
|---|---|---|---|
| Canonical game identity | `games.id` (uuid), `slug` unique and frozen once published, `canonical_title` | `lib/db/schema.ts`, `lib/admin/write.ts` `assertSlugMayChange` | Sound. Slug is an address, not an identity; the write path already refuses to rename a published game. |
| Editions / versions / scopes | `profile_scopes` (key, label, `is_primary`, `display_order`); `evaluations.edition_scope` / `mode_scope` as immutable per-version snapshots | ADR 0014, 0016; migrations 0003, 0007 | Scopes model *evaluated experiences*, not provider editions. There was no representation of "this edition is the same work as that base game" outside evaluation prose. |
| DLC / expansion relations | none | — | No table, column or type relates one game to another as DLC, expansion, edition, port, remake, remaster or bundle. Compare's relationship field (`lib/compare/relationship.ts`) is an interval-aware presentation, not a data relation. |
| Provider / external ids | `game_external_ids (game_id, provider, external_id, external_url)` PK `(game_id, provider)`; admin form and `upsertExternalId` | migration 0000; `lib/admin/write.ts`; `app/admin/games/[id]/page.tsx` | Sound as the *accepted mapping*. Two gaps: nothing prevented two games claiming one provider id, and nothing recorded who accepted the mapping or why. |
| Metadata provenance | `lib/metadata/provenance.ts` — `MetadataCandidate` with `sourceKind`, `sourceId`, `retrievedAt`, `approved`; `selectMetadataCandidate` by declared ownership | ADR 0026; tests/metadata-provenance.test.ts | A selection rule with no storage behind it: no table holds a candidate value, its source, retrieval time or raw form. Nothing referenced IGDB except the string `"igdb:1"` in a test. |
| Runtime provenance | `game_time_estimates (provider, external_game_id, provider_updated_at, fetched_at, attribution_text)` | migration 0000; ADR 0006 | The one existing provider-shaped table. Names IGDB `game_time_to_beats` as the intended source; no adapter. Not touched by Item 5 (runtime is explicitly out of the bounded slice). |
| Artwork provenance / clearance | `game_artwork (source, external_id, clearance, basis, credit, source_page, retrieved_at)`; DB checks; `check:containment`; evaluation overlay | ADR 0011 + amendments, migrations 0006, 0010 | Complete and human-gated. `source` is free text so `'igdb'` needs no schema change; `external_id` can hold an IGDB `image_id`. No provider candidate storage existed. |
| Import / staging tables | none | — | No staging table of any kind. `lib/db/build-seed.ts` generates SQL from typed fixtures; it is a content seed, not an import. |
| Static registry / search / catalog | `lib/search/registry.ts`, `public-index.ts`; build-time only | ADR 0025, 0031 | No provider input. Registry inclusion is explicit and editorial. |
| Change / review workflows | evaluation status machine (draft → review → published → superseded); `evaluation_revisions`; deployment requests/events | ADR 0009, 0020 | All editorial. No mechanism for a provider-originated review prompt. |
| Secrets / configuration | `.gitignore` excludes `.env*`, `.dev.vars`, `/calibration-runs/`; Item 4's `lib/calibration/redact.ts`, opt-in `calib:probe`, CI refusal; a test proves no aggregate script reaches the probe | Item 4 work order §3.6, §3.10 | The pattern to reuse. **No IGDB or Twitch credential exists in this execution environment** (checked by variable name only: no `IGDB_*` or `TWITCH_*` variable is set). |

### Conclusions drawn from the audit

1. **Do not duplicate `game_external_ids`.** It is the accepted canonical mapping and stays so. Item 5 adds the reviewed path into it and one integrity index.
2. **Do not put provider fields on `games`.** ADR 0011 removed exactly that shape once (bare `cover_url`); the staging layer is separate tables with provenance on every row.
3. **`profile_scopes` is not a provider-edition table.** A scope is an evaluated experience Tomas defines; an IGDB edition or DLC becomes relevant to a scope only through an identity candidate a person accepts.
4. **`lib/metadata/provenance.ts` stays.** Its ownership selection will read from staged values later; nothing about it changes now.
5. **Artwork needs a candidate store with no clearance concept**, so the only clearance path remains `game_artwork`.

## 2. IGDB contract verification (api-docs.igdb.com, read 2026-09-02)

Read directly from the current documentation, not from memory. Each fact below drives a design choice named beside it.

| Area | Current documented fact | Consequence |
|---|---|---|
| Account / auth | Twitch account with 2FA; Confidential app in the Twitch Developer Portal; Client ID + Client Secret; OAuth2 client-credentials grant at `https://id.twitch.tv/oauth2/token`; response `access_token`, `expires_in`, `token_type: bearer`. Twitch's own doc (read the same day) specifies the parameters as `x-www-form-urlencoded` body. | Credentials sent in a form body, never a URL; tokens held in memory only. |
| Token lifetime | Access token active for 60 days; max 25 active tokens per application, exceeding it inactivates older ones. | Prefer a pre-issued token (`IGDB_ACCESS_TOKEN`) so probes do not revoke a colleague's token. |
| Requests | `POST https://api.igdb.com/v4/{endpoint}`; headers `Client-ID` and `Authorization: Bearer …`; APIcalypse body. Browser requests refused ("would leak your access token"). | Server-side only; no public/runtime dependency. |
| Rate limits | 4 requests/second (429 on excess); up to 8 open requests at any moment. | Client-side rate gate: 4 starts per rolling second, 8 in flight; one 429 back-off. |
| Query limits | default 10, max 500 per request; `offset` paging; `/count`; multi-query; expanders (`field.subfield`). | Batches of ≤500 ids; `updated_at` sweeps ordered and offset-paged. |
| Storage / caching | FAQ: "Yes. In fact, we prefer if you store and serve the data to your end users." Data may be kept on partnership termination. | Local staging is the intended pattern. |
| Commercial use / attribution | Free for non-commercial and commercial; commercial use is a partnership via partner@igdb.com; "we ask for user facing attribution to IGDB.com … visible to your users and located in a static location (e.g. not in a change log)". | Attribution requirement recorded with the integration; **a signed partnership is not asserted** — see §2a for the owner's durable access status. |
| Data Partner dumps | Exclusive to Data Partners; every endpoint as daily CSV (within 24 h); `GET /v4/dumps` → `[{endpoint, file_name, updated_at}]`; `GET /v4/dumps/{endpoint}` → presigned S3 URL valid 5 minutes, `size_bytes`, `updated_at`, `schema_version`, `schema` (column → `LONG`, `STRING`, `LONG[]`, `DOUBLE`, `TIMESTAMP`, `UUID`, …); schema version changes with the schema. CSV cell encoding of arrays/timestamps is **not documented**. | Dump adapter parses by declared schema, accepts `{…}` and `[…]` arrays, refuses what it cannot read; real-dump verification needs the entitlement. |
| Dump proof endpoint (re-read 2026-09-03) | `game_types` documents exactly four fields — `checksum` (uuid), `created_at` (datetime), `type` (String), `updated_at` (datetime) — and **no array field**. `platforms` documents `versions` ("Array of Platform Version IDs") and `websites` ("Array of Platform Website IDs") alongside `created_at`/`updated_at` (datetime). | The dump proof samples `platforms`, whose schema can carry both `LONG[]` and `TIMESTAMP`; a `game_types` sample cannot prove an array encoding and is no longer claimed to. |
| `games` fields | `game_type` (ref → Game Type), `game_status` (ref → Game Status); `category` and `status` **DEPRECATED**; `parent_game` "If a DLC, expansion or part of a bundle, this is the main game or bundle"; `version_parent` "If a version, this is the main game"; `version_title` "Title of this version (i.e Gold edition)"; arrays `dlcs`, `expansions`, `standalone_expansions`, `expanded_games`, `bundles`, `ports`, `remakes`, `remasters`, `forks`; `platforms`, `release_dates`, `involved_companies`, `alternative_names`, `external_games`, `cover`, `artworks`; `checksum` (uuid, "Hash of the object"); `updated_at`, `created_at`. | The identity model in ADR 0037 §2. |
| Game types | Enum table lists `main_game 0, dlc_addon 1, expansion 2, bundle 3, standalone_expansion 4, mod 5, episode 6, season 7, remake 8, remaster 9, expanded_game 10, port 11, fork 12, pack 13, update 14`; `/game_types` carries `type` (string), `checksum`, timestamps. | Resolve by name via expander/lookup; keep the id beside it; unknown names → `unclassified`. |
| Game statuses | `released 0, alpha 2, beta 3, early_access 4, offline 5, cancelled 6, rumored 7, delisted 8`; `/game_statuses` carries `status` (string). | Staged as id + name; classified under `platform_or_release` when it moves. |
| Editions | `/game_versions` (`game`, `games`, `features`); the per-game link is `version_parent`; the docs' own example excludes editions with `where version_parent = null`. | `version_of` from `version_parent` only. |
| Release dates | `/release_dates`: `date`, `human`, `y/m/d`, `platform` (ref), `date_format` (ref; `category` deprecated), `release_region` (ref; `region` deprecated), `status` (ref → Release Date Status), `checksum`, `updated_at`. Legacy region enum: europe 1 … brazil 10; legacy format enum YYYYMMMMDD 0 … TBD 7. | One `igdb_release_dates` row per manifestation with resolved names and ids. |
| Involved companies | `company`, `developer`, `publisher`, `porting`, `supporting`, `checksum`, `updated_at`. | Staged verbatim. |
| External games | `external_game_source` (ref; `category` deprecated), `game_release_format` (ref; `media` deprecated), `uid`, `platform`, `url`, `countries`, `year`. | Staged for later storefront work; not a product action. |
| Covers / artworks | `image_id`, `width`, `height`, `url` (t_thumb), `image_type` (ref; `artwork_type` deprecated), `alpha_channel`, `animated`, `checksum`; covers may belong to a `game_localization`. Image URL: `https://images.igdb.com/igdb/image/upload/t_{size}/{image_id}.jpg`, `_2x` retina; removed images persist 30 days. | Candidate rows keyed `(kind, id)` with `image_id`; no clearance concept. |
| Enum → table migration | "Migration Period: starting on February 18 to August 31 (6 months)… After the migration period, the old field names will be removed." New endpoints include `game_types`, `game_status`, `date_formats`, `release_date_regions`, `external_game_sources`, `game_release_formats`, `platform_types`, `image_types`. Age-rating ids will not match the old enum values. | Only table-backed fields are requested; a test proves no deprecated field is in the query. |
| Webhooks | `POST /{endpoint}/webhooks` with `url`, `secret`, `method` (create/update/delete) exists. | Noted; not used — it would require a public endpoint, which is a runtime dependency Item 5 forbids. |
| Popularity / ratings | PopScore and `rating`/`aggregated_rating` exist. | Not requested, not staged: they cannot feed scores (ADR 0026). |
| Licence | Code examples under the Twitch Developer Services Agreement. | No IGDB example code is copied. |

## 2a. Legal / access status (owner clarification, issue #48 comment of 2026-09-03)

Recorded from the owner's safe summary on issue #48; no correspondence text, address, credential or Client ID is reproduced here.

| Fact | Status | Consequence for Item 5 |
|---|---|---|
| Development API/data integration | **Explicitly authorized by IGDB** while the formal partnership agreement is being prepared | Not an open Item 5 policy question |
| Data Partner dump feature | **Enabled for the project's Client ID** | Not an open Item 5 policy question; `dump_entitlement_ok` from the live probe is the mechanical confirmation |
| Completed/signed partnership agreement | **Not durably established** as of 2026-09-03; not to be claimed | A later legal / public-commercial status gate, tracked, not an Item 5 blocker |
| Third-party image rights | IGDB's data services include image assets but the partnership does **not** sublicense or transfer third-party media rights | Public image use remains separately gated by ADR 0011 and the project's lawful-basis path; staging an `image_id` is not a use |

## 3. What Item 5 therefore adds (see ADR 0037 and the readiness record)

- migration `0011_igdb_staging` — eleven `igdb_*` tables and their contract, plus one unique index on `game_external_ids (provider, external_id)`;
- `lib/igdb/` — contract constants, redaction, record parser, dump adapter, normalizer, change classifier, transport, staging writer, and the synthetic proof fixture;
- `scripts/igdb/` — `igdb:probe` (manual, live, credential-safe; with the fail-closed `--field-contract <id>` and `--dump-sample [endpoint]` proofs, the latter defaulting to `platforms` because `game_types` declares no array field), `igdb:report` (fixture proof, offline), `igdb:stage-proof` (non-production database rehearsal), `igdb:preflight` (read-only rollout preflight for 0011);
- tests under `tests/igdb/`, `tests/db-read/igdb-staging.test.ts`, and regression section 10 in `tests/db/regression.sh`.

Nothing above the boundary — `games`, `profile_scopes`, `evaluations`, `game_artwork`, the public read path, the admin write path — changes behaviour.
