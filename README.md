# Should I Play?

> Not just whether a game is good. What kind of good is it?

**Should I Play?** ([shouldiplay.gg](https://shouldiplay.gg)) gives every game a
**Game Profile**: eight fixed dimensions, each scored 0–10 against a published
rubric, so a player can tell what kind of experience a game is before buying it.
**There is no overall score** — one game may stand out through story and
atmosphere while another earns its shape through precise action and craft. They
are different experiences and different reasons to play.

*Should I Play?* is the site. *Game Profile* is the evaluation it publishes, and
the name of the methodology. Internal identifiers (`GameProfile`, `game_profile`,
this repository) keep the original name deliberately — the rename is public-facing
only. See [Brand, Discoverability & Hosting](docs/Should_I_Play_Brand_and_SEO_Foundation_v0.2.md).

The editorial/publication foundation is substantially complete and now operates
in support of the public-product program. Published profiles are read from
Postgres at build time; the Access-protected editorial tool covers games,
rights-aware artwork, scopes, evaluation authoring, preview, validation,
transactional publication, history, deployment requests and proof of what
production actually serves. See the
[Project Consolidation Report](docs/Should_I_Play_Project_Consolidation_Report_2026-08-26.md)
for the reconstructed chronology, current decision/conflict registers and
immediate product agenda; the governing documents are the
[Master Product & Build Plan v0.9](docs/Game_Profile_Master_Product_and_Build_Plan_v0.9.md)
and the dated
[Public Product P0 Decision Set](docs/Should_I_Play_Public_Product_P0_Decisions_2026-08-24.md)
plus the later
[Public Product Resolution Register](docs/Should_I_Play_Public_Product_Resolutions_2026-08-25.md).

The accepted A1–A6/C1–C4 public direction is now implementation-ready through
the [Shared Design-System and Interaction Handoff v1.0](docs/design/Should_I_Play_Shared_Design_System_and_Interaction_Handoff_v1.0_2026-08-31.md),
its [semantic token map](docs/design/handoff/should-i-play.tokens.v1.json) and
the [accessibility/conformance matrix](docs/design/Should_I_Play_Accessibility_and_Conformance_Matrix_v1.0_2026-08-31.md).
**Engineering Slice 1 is merged on `main`**: the shared token/font foundation,
the editorially governed static Search and its four truthful states, accessible
inline/header Search, and the bounded accepted homepage opening. Engineering
Slice 2 completes the accepted homepage system on top of it — the
"Start somewhere interesting" poster rail, the authored-shelf grammar and the
bounded "Choosing between…" presentation contract, whose editorial
configurations ship empty pending owner-approved membership — and is merged on
`main` too. Engineering Slice 3 implements the accepted A3–A6 profile system
in the current codebase: the decision before the instrument, complete
art-led/artless parity, the labelled radar with eight permanent exact rows,
Range/Unknown/Provisional/confidence as words, and the restored platform
warning, platform-note and override projection. Practical time and store
destinations render only from approved records, and none exists yet, so
neither appears. Engineering Slice 4 implements the accepted C1–C4 full
Compare system in the current codebase: `/compare` as an indexable launcher
with standalone guidance, the order-preserving `?games=<left>,<right>` pair
state that is `noindex, follow` and never in the sitemap, two equal identity
territories around the paired radar in art-led, mixed and complete artless
states, the deterministic interval-aware relationship field, the canonical
Shared/left-only/right-only tag map, eight paired exact rows, and Replace and
Copy-link controls. Its first release compares published primary profiles only
(ADR 0033 amendment, 2 September 2026). **Current production artifact observed 5 September 2026:** the canonical-origin
manifest identifies main `e7dd4aa`, production/database, build
`1de37fcf-f2d7-401c-9eab-fc19312fca86`, and three published entries; its corpus
digest was independently re-derived. The code includes Slices 1–4; the three
published profiles are a separate content fact. #115/PR #117 records the
observation and configuration-access limits. Working Agreement §4.1 delegates
merging and deploying in-scope reviewed engineering work to the orchestrator
under stated verification and rollback conditions.

**Remote admin and production Live proof are exercised.** The current state is:

| | |
|---|---|
| **Implemented and deployed** | migration `0009` and its schema; deployment-request persistence; the Cloudflare Builds client; manifest generation; the `/deployment-manifest` route; the reconciliation and Live-proof machinery; the `/admin` deployment surface |
| **Proven** | a production build from `main`; `/deployment-manifest` live on the canonical origin; corpus/digest matching the three published evaluations; behavior under workerd; migration `0009`; Access-authenticated editorial session through Hyperdrive; successful `production_verified` observation and Live state |
| **Not yet exercised** | a real Cloudflare Builds POST from this application; a build UUID produced by that application dispatch and reconciled; one complete new-profile Publish → dispatch → Live cycle |

**Activation checkpoint revalidated 30 August 2026:** the deployment tables are
not empty and Live proof is complete for the current three-profile artifact.
The remaining gap is specifically application-originated dispatch and the first
new-profile end-to-end cycle; it is not remote-admin activation or general
production proof.

Migration `0010_artwork_fair_use` was verified applied on 3 September 2026
(Master Plan §7.3). The separate bounded `0011_igdb_staging` integration was
applied and verified under PR #52. Neither historical authorization permits
another migration, asset clearance, import or publication.

The remaining dispatch proof belongs to the first real catalog publication. It
does not justify further standalone admin hardening.

**The editorial tool ships switched off by default.** `/admin` answers 404 unless a
deployment carries both an identity provider and a request-time editorial
database. Production now carries both behind Cloudflare Access; ordinary
previews/default deployments carry neither — see
[Editorial tool](#editorial-tool).

---

## Current execution checkpoint

Phase 3A Items 1–5 and Item-5 integration are complete. Item 6 / D1 is active:
#114 corrects deterministic capture hashing and scorer-visible provenance before
a further measured call. PR #112 already resolved Final Draft scope and
conditionally authorized attempt 2; #101 owns that execution and immutable
attempt-1 evidence. #113 coordinates parallel recovery; read the
[execution plan](docs/operations/Should_I_Play_Recovery_Execution_Plan_2026-09-05.md).
The original numbered checklist remains Master Plan Appendix B. Main merges that
deploy in-scope reviewed engineering work are delegated to the orchestrator under
Working Agreement §4.1; workers implement and review but never merge or deploy
their own work. No production-data, scoring, holdout or publication authority
follows from this checkpoint.

## Quick start

```bash
npm install
npx playwright install chromium   # once, for the e2e suite
npm run dev          # http://localhost:3000
npm run verify       # typecheck + lint + unit tests + production build
npm run test:e2e     # builds, serves, runs Playwright
```

If your environment ships a prebuilt Chromium instead, point the suite at it:
`PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome npm run test:e2e`.

Seeded profiles: [`/games/alan-wake-2`](http://localhost:3000/games/alan-wake-2),
[`/games/returnal`](http://localhost:3000/games/returnal),
[`/games/redfall`](http://localhost:3000/games/redfall).
`/dev/radar-states` (development only) renders the unknown and range states.

```bash
node scripts/screenshots.mjs screenshots http://localhost:3000
```

## Layout

```
app/
  globals.css                  the site-wide visual system: tokens and type roles
  layout.tsx                   the html shell only — no surface owns the root
  (public)/                    the published product. A route group: no URL has it in it
    layout.tsx                 site chrome, skip link, site-wide structured data
    page.tsx                   the accepted homepage: opening, rail, shelves, pairs
    games/[slug]/page.tsx      the game's primary profile, then the rail of the rest
    games/[slug]/[scope]/      a sibling profile scope; the primary key 308s
    games/[slug]/opengraph-image  prerendered share card, silhouette and all
    methodology/page.tsx       renders itself from the typed rubric
    compare/page.tsx           the Compare launcher, prerendered once; a pair is a
                               client-restored state of it, noindex by response header
    dev/radar-states/          unknown/range harness, non-production only
    dev/home-states/           rail, shelf and curated-pair harness, non-production only
    dev/profile-states/        art-led/artless, range/unknown, provisional, override,
                               practical-time and long-title profile states, non-production only
    dev/compare-states/        empty/left-only/pair/self-pair/invalid, every relation and tag
                               state, both/one/no/failed artwork, non-production only
  admin/                       the editorial tool. Authenticated, noindex, never prerendered
    layout.tsx                 the shell, and the guard every page passes through
    actions.ts                 every editorial mutation, one transaction each
    games/[id]/page.tsx        metadata, artwork rights, scopes, evaluation history
    deployments/page.tsx       Published vs what production actually serves
  deployment-manifest/         the artifact's inventory of itself, prerendered
  robots.ts / sitemap.ts       generated from the same data the pages read
components/
  SiteChrome.tsx               header and footer — achromatic, so games carry colour; site-chrome.css beside it
  ChromeNav.tsx                the ranked navigation, behind one Menu disclosure on a phone
  GameCard.tsx                 the one card grammar every list of games will use
  home/HomeOpening.tsx         the accepted opening: proposition, Search, mosaic
  home/PosterRail.tsx          the rail's controls and scroll position; no autoplay, ever
  home/ProfilePoster.tsx       one poster: art-led or artless, one link, one disclosure
  home/ShapeFragment.tsx       the game's own outline, faint and large, under every tile and poster
  home/EditorialShelf.tsx      the authored shelves, or nothing at all
  home/CuratedCompare.tsx      two identities, one decision, and the route into Compare
  compare/CompareApp.tsx       the client shell: the address is the state
  compare/CompareView.tsx      every Compare state from a resolved selection, compare.css beside it
  compare/CompareStage.tsx     two equal territories, the paired radar at the seam, two identities
  compare/PairedRadar.tsx      two shapes on one set of axes: solid/square and dashed/round
  compare/RelationField.tsx    clearest difference, exact alignment, read with care
  compare/TagMap.tsx           Shared, left-only, right-only — by key, no count
  compare/PairedInstrument.tsx eight paired exact rows with the relation in words
  compare/SelectorDialog.tsx   the Search grammar choosing a side; ineligible rows say why
  compare/CompareControls.tsx  Replace left, Replace right, Copy link with its fallback
  profile/GameProfile.tsx      the canonical A3–A6 profile, server-rendered, profile.css beside it
  profile/IdentityStage.tsx    identity stage (art-led or artless): evidence kicker, title, platforms, scope, the answer
  profile/DecisionBand.tsx     the pull and the tax, fit guidance, practical commitment
  profile/ProfileInstrument.tsx the one client leaf: labelled radar, eight exact rows, disclosures
  profile/instrument.tsx       one exact row: value, confidence, gloss, platform truth, rationale
  profile/radar.tsx            the only radar in the product, at three levels
  profile/ReadingBand.tsx      the warm reading ground: traits, platform warning and notes, scope detail
  profile/TrustBand.tsx        how this profile was made: scope record, evidence, credits
  profile/ScopeSwitcher.tsx    sibling navigation, only where a game has siblings
  admin/                       editorial form plumbing and panels
lib/
  home/shelves.ts              objective/evergreen/living shelves, windows, fallback
  home/curated-compare.ts      the curated-pair contract, without full Compare
  profile/platform.ts          warning, platform notes and overrides, projected without moving a total
  profile/practical.ts         practical time from an approved record, Unknown, or nothing
  compare/relationship.ts      Equal / Close / Clear difference / Indeterminate — never a midpoint
  compare/pair.ts              eight paired rows, the deterministic opening facts, the caveats
  compare/tags.ts              the tag map by canonical key, both intensities where they differ
  compare/index.ts             the build-time Compare index: eligible primary profiles only
  compare/selection.ts         what `?games=` resolves to, every failure in words
  compare/url.ts               `/compare?games=<left>,<right>`, order preserved
  search/registry.ts           four-state published/unprofiled coverage registry
  discovery/                   deterministic intent, Unknown, threshold and time rules
  metadata/provenance.ts       primary/official/manual factual precedence
  commerce/storefront.ts       verified ordinary/affiliate action contract
  analytics/events.ts          allowlisted semantic event registry
  rubric/                      canonical typed Rubric v1.0 — the source of truth
  scoring/derive.ts            dimension totals, unknowns, ranges
  radar/geometry.ts            pure, DOM-free chart geometry
  profile/vocabulary.ts        public wording that varies with evidence state
  profile/provenance.ts        where a profile's numbers came from
  validation/evaluation.ts     the publish gate
  db/                          Drizzle schema, migration, constraints, seed
  data/games.ts                the only data-access boundary
  data/fixture-profiles.ts     typed fixtures: tests, harnesses, parity
  db/client.ts                 the build-time Postgres connection
  db/read-profiles.ts          published profiles, assembled from Postgres
  admin/access.ts              Cloudflare Access assertion verification
  admin/auth.ts                whether the tool exists here, and who gets in
  admin/db.ts                  request-scoped editorial connection — no pool
  admin/games.ts               editorial reads: drafts and history included
  admin/write.ts               editorial writes, all transaction-scoped
  admin/deployments.ts         deployment requests, the audit trail, and Live
  deploy/manifest.ts           what the deployed artifact says about itself
  deploy/verify.ts             reads that back from production — the only proof
  deploy/cloudflare.ts         the only code that talks to the Cloudflare API
  deploy/config.ts             the credential boundary; nothing else reads it
  site.ts                      canonical origin, brand strings, build environment
  seo/                         JSON-LD graphs and share-card geometry
content/games/                 seeded evaluations
content/home-shelves.ts        approved homepage collections — objective only, for now
content/curated-compare.ts     approved "Choosing between…" pairs — empty, deliberately
docs/decisions/                ADRs
tests/                         unit (vitest) and e2e (playwright)
```

## Rules the code enforces

These are product semantics, not preferences. Most are covered by a test.

| Rule | Where |
|---|---|
| No aggregate score is computed, stored or displayed | no summing code exists; asserted in `tests/e2e` and `tests/radar-geometry.test.ts` |
| No aggregate score is published in JSON-LD or on a share card either | no `Review`/`AggregateRating` schema, asserted in `tests/seo.test.ts` |
| A preview deployment can never be indexed or become canonical | `lib/site.ts` fails closed; asserted in `tests/seo.test.ts` and against the real Worker by `npm run cf:verify` |
| The sitemap lists exactly the published profiles, the methodology and the Compare launcher, dated by publication | `app/sitemap.ts`, `tests/seo.test.ts` |
| Sources are evidence, never votes averaged into a score | no source value reaches a number; wording is "supported by", never "calculated from" |
| Dimension totals are derived from subcriteria, never entered | `lib/scoring/derive.ts`, `dimension_scores` view |
| Scores are 0–2 in 0.5 increments | schema check constraints, `tests/scoring.test.ts` |
| `unknown` is never zero, on screen or in the database | `NULL` in Postgres, `null` vertex in geometry, [ADR 0004](docs/decisions/0004-unknown-and-range-scores.md) |
| Exact scores are readable without hover or interaction | `components/profile/instrument.tsx`, asserted in e2e |
| The profile answers before it explains: identity and scope with the answer, pull/tax, fit, instrument, the warm reading ground, trust — in DOM order at every width | `components/profile/GameProfile.tsx`, `tests/profile-composition.test.ts`, `tests/e2e/profile-conformance.spec.ts` |
| Art-led and artless profiles carry identical content in identical order; no artwork never reserves a hole | `components/profile/IdentityStage.tsx`, asserted in both suites |
| Platform warning, subcriterion platform notes and overrides reach the page without moving a total | `lib/profile/platform.ts`, `tests/platform-projection.test.ts` |
| Practical time renders only from an approved record — a band, `Unknown`, or nothing; never the design specimen | `lib/profile/practical.ts`, `tests/practical-presentation.test.ts` |
| The unresolved "Evaluated" label does not ship; the record's own "Evidence cut-off" does | `components/profile/IdentityStage.tsx`, `tests/profile-composition.test.ts` |
| Radar axis order is globally fixed | `lib/rubric/v1.ts`, `tests/rubric.test.ts` |
| No good/bad colour semantics | one per-game accent, identity only; the same hue marks a 4.0 and a 10.0 |
| Nothing is communicated by shape or colour alone | the label-free card mark is `aria-hidden`; the card states its extremes as exact figures |
| One radar implementation, one visual system | `components/profile/radar.tsx`; `tests/accessibility-tokens.test.ts` fails on a second typeface |
| Every evaluation declares edition, mode, platform and build | NOT NULL columns, shown on the page |
| Every dimension carries its own confidence | `dimension_assessments`, publish trigger, `tests/lineage.test.ts` |
| A missing subcriterion row can never become a precise score | `dimension_scores` derives against the full expected set |
| A final evaluation has no gaps, including superseded history | rubric registry + deferrable completeness triggers |
| Evidence counts count distinct sources, not links | `COUNT(DISTINCT evidence_source_id)` in `dimension_scores` |
| Every edge of a supersession chain is validated and seeded as declared | `validateGameRecord`, `tests/lineage.test.ts` |
| Evidence sources are identified by key, never by title | `evidence_sources.source_key`, `tests/seed-sql.test.ts` |
| Final snapshots cannot be rewritten through children or shared source/tag metadata | immutable snapshot triggers, [ADR 0009](docs/decisions/0009-final-evaluation-and-rubric-integrity.md) |
| Superseded evaluations are preserved and linked, never overwritten | self-referencing FK + lineage validation, `tests/lineage.test.ts` |
| All source counts stay hidden until the ledger is genuinely populated | `evaluations.evidence_ledger`, `tests/evidence-copy.test.ts` |
| Every scored subcriterion has a rationale | publish gate, `tests/calibration.test.ts` |
| Pre-release profiles declare evidence maturity and cannot claim High confidence | check constraints, `tests/evidence.test.ts` |
| Pre-release recommendation blocks avoid verdict language | `lib/profile/vocabulary.ts`, `tests/evidence.test.ts` |
| Runtime data can never reach the eight dimension scores | `game_time_estimates` hangs off `games`, not `evaluations` |
| Published profiles are read from Postgres, through one data-access boundary | `lib/db/read-profiles.ts`, [ADR 0017](docs/decisions/0017-postgres-read-path.md) |
| The database reproduces the calibration corpus exactly | `tests/db-read/parity.test.ts` — 45 assertions over three profiles |
| Drafts, review rows and superseded history are never public | status filter, not ordering; `tests/db-read/resolution.test.ts` |
| A game's primary scope owns `/games/<slug>`, and is explicit data | `profile_scopes.is_primary`, [ADR 0016](docs/decisions/0016-canonical-scope-urls.md) |
| Reordering scopes never moves a canonical URL | primacy is a column, not `display_order`; asserted in both suites |
| One profile, one indexable address | siblings canonicalise to themselves; the primary key 308s to the game URL |
| A game may publish several current profiles, one per evaluated experience | `profile_scopes`, [ADR 0014](docs/decisions/0014-profile-scopes.md) |
| Only one published evaluation per profile scope per rubric version | unique partial index |
| Each profile scope versions and supersedes independently of its siblings | scope-local lineage triggers, `tests/profile-scope.test.ts` |
| A profile scope is identified by a key, never by matching mode text | FK + slug check constraint |
| Platform overrides are material deviations, and never move a dimension total | `subcriterion_platform_overrides`, [ADR 0015](docs/decisions/0015-platform-overrides-and-provenance.md) |
| An ordinary editorial profile needs no calibration round and no schema change | `score_provenance` kind + `calibration_rounds` registry |
| Artwork carries its clearance and basis, never a bare URL | `game_artwork`, [ADR 0011](docs/decisions/0011-production-artwork.md); `editorial-fair-use` is distinct and operationally gated |
| An unprofiled registry record never acquires a public profile route | `lib/search/registry.ts`, `tests/search-registry.test.ts` |
| Unknown under a hard discovery constraint is neither pass nor failure | `lib/discovery/constraints.ts`, `tests/discovery-contract.test.ts` |
| Total commitment and session suitability remain separate from all eight dimensions | `lib/discovery/time.ts`, `tests/practical-time.test.ts` |
| Provider/official/manual metadata uses declared precedence, never votes | `lib/metadata/provenance.ts`, `tests/metadata-provenance.test.ts` |
| Official storefront actions retain their ordinary link and require affiliate disclosure | `lib/commerce/storefront.ts`, `tests/storefront-actions.test.ts` |
| Ordinary product events cannot carry raw query text or arbitrary properties | `lib/analytics/events.ts`, `tests/analytics-events.test.ts` |
| All three profiles reproduce their calibration matrix exactly | `tests/calibration.test.ts` — 24 locked totals |
| The homepage never moves on its own: no autoplay, no loop, no timer | `components/home/PosterRail.tsx`, `tests/e2e/homepage.spec.ts` |
| A shelf with no members renders nothing — never a heading over an empty track | `lib/home/shelves.ts`, `tests/home-shelves.test.ts` |
| An objective shelf that would hold the whole catalogue has selected nothing, and disappears | `lib/home/shelves.ts`, P0.3's no-padding rule |
| A collection naming a profile this build does not publish fails the build | `lib/home/shelves.ts`, `lib/home/curated-compare.ts` |
| A time-bounded shelf expires into its evergreen fallback, never into stale copy | publication window + `fallbackId`, `tests/home-shelves.test.ts` |
| The curated pair links only a Compare pair that Compare can open — two primary profiles | `components/home/CuratedCompare.tsx`, `tests/curated-compare.test.ts` |
| A Compare relation is Equal at 0, Close at 0.5, Clear difference at 1.0 or more, and Indeterminate for any Range or Not scored — never a midpoint, never moved by confidence | `lib/compare/relationship.ts`, `tests/compare-relationship.test.ts` |
| Compare tags are compared by canonical key, never by label; a shared tag with two intensities writes both; nothing is counted | `lib/compare/tags.ts`, `tests/compare-tags.test.ts` |
| Compare is exactly two published primary profiles; a self-pair, an unknown, a recognised-only title or a sibling scope is refused in words and the valid side stays where it was written | `lib/compare/selection.ts`, `tests/compare-selection.test.ts`, `tests/e2e/compare.spec.ts` |
| A Compare pair is `noindex, follow`, never in the sitemap, and carries no rating or review schema; the launcher is indexable with its guidance | `next.config.ts`, `app/sitemap.ts`, `tests/compare-metadata.test.ts`, `npm run cf:verify` |
| Compare publishes no winner, aggregate, match percentage, ranking or hidden total, in UI, metadata or code | `tests/compare-composition.test.ts` scans the rendered document; no summing code exists |
| A missing, slow or failed image resolves to the authored artless composition | the sleeve renders under the artwork, never instead of it |

## Where the data comes from

Published profiles are read from **Postgres**, at build time, through the single
data-access boundary in `lib/data/games.ts`. Every public route is prerendered,
so the database is a *build* dependency: no Hyperdrive, no runtime pooling, no
Worker binding, and `DATABASE_URL` is a build variable rather than a secret.

```bash
DATABASE_URL=postgres://…/game_profile npm run build   # reads Postgres
npm run build                                          # reads the fixtures
```

The build says which path it took. **Production Postgres is provisioned** —
Neon, Frankfurt, [ADR 0019](docs/decisions/0019-hosted-postgres-and-admin-activation.md) —
and a production build has no fixture fallback at all: `SITE_ENV === "production"`
folds to a literal, so the fallback branch is unreachable code in a production
bundle rather than a switch that could be left off. `REQUIRE_DATABASE=1` says the
same thing for any other environment that must not substitute fixtures. Fixtures
remain the source for unit tests, parity, the development harnesses and the named
synthetic Playwright corpora.

### Migrations go out before the code that needs them

There is one authoritative database and the build reads it, so a branch that adds
a migration cannot build — anywhere, including its Cloudflare preview — until that
migration is applied to the database it will read. Apply it first:

```bash
DATABASE_URL=postgres://…/game_profile npm run db:migrate
```

This ordering is safe in the other direction, which is why it is the ordering:
migrations are additive, so `main` keeps building against a database that is one
ahead of it. `lib/db/schema-version.ts` states the precondition at the top of the
read, because the alternative is what actually happened — a driver-level
`column … does not exist`, two minutes into a build, blaming an unrelated
opengraph route.

```bash
DATABASE_URL=postgres://…/game_profile_test npm run test:db-read
```

runs the parity and resolution suites: 45 assertions proving the database
reproduces Alan Wake 2, Returnal and Redfall field for field including all 24
approved dimension totals, and 13 more proving drafts, review rows and
superseded history never become public.

## Profile identity and versioning

A profile is not "a game". It is **one evaluated experience of a game**, and a
game may have several at once.

```
game  The Long Dark
 ├── profile scope "survival"    → v1 pre-release → v2 launch → v3 post-patch
 └── profile scope "wintermute"  → v1 launch      → v2 post-patch
```

Rubric §1 requires separate evaluations where modes materially change the
experience, so both scopes are **simultaneously current**: each has its own
published row, its own version numbering starting at 1, and its own supersession
chain. Wintermute v2 replaces Wintermute v1 and never touches Survival.

Identity is the `profile_scopes` row, never text. Each evaluation still declares
its own `edition`, `mode`, `platforms` and `build` — that is the immutable
snapshot of what *that version* covered — but two versions belong to the same
series because they share a scope, not because their mode strings happen to
match. A re-worded mode is the same series; a materially different mode is a
different scope; only an editor can tell those apart.

| | identity | public label | per version |
|---|---|---|---|
| `profile_scopes` | `key` (`survival`) | `label` (`Survival`) | — |
| `evaluations` | `scope_id` + `version_number` | — | edition, mode, platforms, build |

Published-row uniqueness is `(scope, rubric version)` — one published
evaluation per scope per rubric, enforced by a partial unique index. Superseded
versions are preserved and linked, never overwritten.

### Public addresses

```
/games/<slug>              the game's PRIMARY scope
/games/<slug>/<scope-key>  every sibling scope
```

Primary is explicit data (`profile_scopes.is_primary`), never the lowest
`display_order` — reordering a listing must not move a canonical URL. The
database enforces at most one primary per game, and that a game publishing
anything publishes its primary scope, so the bare game URL always resolves.

One profile, one indexable address: a sibling canonicalises to itself, and
`/games/<slug>/<primary-key>` 308s to the bare URL rather than publishing the
same profile twice. See [ADR 0016](docs/decisions/0016-canonical-scope-urls.md).

**Every seeded game has exactly one scope (`default`), so the public site has the
same three URLs it always had.** A game with several published scopes shows a
scope switcher under its title, linking each profile at its own canonical URL
and marking the one being read; below two scopes it renders nothing at all,
because a chooser with one option asks a reader to weigh a distinction this game
does not have.

Since no seeded game has siblings, that branch is proved against a synthetic
multi-scope corpus (`content/test-corpus.ts`) which the Playwright `multi-scope`
project builds and drives in a real browser, alongside
`tests/scope-switcher.test.ts`, `tests/db-read/` and the database regression
suite. The corpus is opt-in via `PROFILE_TEST_CORPUS=multi-scope`, and a
production build **refuses** it rather than ignoring it: its scores are not an
evaluation of anything, and silently dropping the flag would make a
misconfigured production build look identical to a correct one.

## Editorial tool

`/admin` covers games, alternate titles, platforms, provider IDs, rights-aware
artwork records, profile scopes, explicit primary-scope management, evaluation
and score authoring, revision history, and publication.

The last two steps of an evaluation are `preview` and `publish`. **Preview
renders the profile through the public renderer** — the same component
`/games/<slug>` uses, from the same projection the production build reads — so
what an editor approves is what ships rather than a lookalike. **Publish**
checks every rule the database will enforce, reports them all at once in
sentences, and on success publishes this version and supersedes the one it
replaces in a single transaction.

Publishing changes the database, not the site: public pages are prerendered, so
a published profile becomes Live only once a later production build reads it,
verification succeeds, and that artifact deploys. Publishing does *request* that
build, and the request is recorded — but a request is not an arrival, and the
tool never treats one as the other.

### Published, awaiting deployment, and Live

`/admin/deployments` compares what the database publishes against what
production actually serves, and the second half of that sentence is the hard
part. Everything available on the requesting side describes a request:

| Evidence | What it proves |
|---|---|
| the dispatch was accepted | a POST was accepted |
| Cloudflare reports the build succeeded | a build process exited 0 |
| the deploy step reported success | an upload was accepted |
| **the origin serves a manifest naming version V** | **production serves V** |

So the deployed artifact publishes its own inventory at `/deployment-manifest`,
generated during the same `next build` that renders the pages, through the same
memoised data boundary they read. Verification fetches it from the production
origin, re-derives its digest, and only then records what production serves.

That memo is per process — Next renders static pages across several worker
processes — so a build reads the corpus once per render worker, not once in
total. Within a process the manifest and the pages beside it cannot disagree,
which is what rules out assembling the manifest from a separate query. Across
processes nothing is promised, and nothing needs to be: the digest makes the
manifest self-checking, and what is finally proven is what the deployed origin
serves rather than what any build process believed while assembling it. Build status is recorded and shown, and it is
advisory — it answers "why has this not deployed", never "has this deployed".

Three states, because two would lie:

| State | Meaning |
|---|---|
| **Live** | the verified artifact contains this version |
| **Awaiting deployment** | production was verified, and serves something else |
| **Not proven** | production has not been verified recently enough to say |

The third is not hedging. A tool that cannot reach production and reports
"awaiting deployment" is asserting production does *not* have the version, which
it does not know.

`Live` is derived, never stored: it is not a value of `evaluation_status` and
must not become one. A rollback changes what is Live without changing any
evaluation, and published snapshots are immutable.

Reconciliation is **editor-triggered**. There is no cron, queue or background
service: the stack has no scheduler, and a background poller would be the first
thing here to touch production with nobody present. "Awaiting deployment"
therefore persists until someone presses Check — which is honest, because until
someone looks, nobody knows.

Requesting a build needs three server-only variables, and with any of them unset
publication is unaffected and the tool says which is missing:

| Variable | Meaning |
|---|---|
| `CLOUDFLARE_API_TOKEN` | a **user-scoped** token with *Workers Builds Configuration: Edit* |
| `CLOUDFLARE_ACCOUNT_ID` | the account the Builds API is addressed against |
| `CLOUDFLARE_BUILDS_TRIGGER_ID` | the Workers Builds **production** trigger uuid — the one whose `branch_includes` is `["main"]` |
| `CLOUDFLARE_WORKER_TAG` | optional; enables build-status diagnostics only |

Two things Cloudflare's documentation is explicit about and that cost an
afternoon otherwise: the Builds API requires a **user-scoped** token —
account-scoped tokens return "Invalid token" — and it identifies a Worker by an
immutable **tag**, not by its name. Configuring the tag rather than looking it up
is what lets the token omit *Workers Scripts: Read*.

The credential is read in exactly one module, used in exactly one
`Authorization` header, and stripped from anything the provider echoes back.
Verification needs no credential at all, so it keeps working whatever the
deployment is configured with. See
[ADR 0020](docs/decisions/0020-publication-preview-and-deploy-trigger.md) and
[ADR 0022](docs/decisions/0022-deployment-requests-and-proof-of-live.md).

**Not yet exercised against the real Cloudflare Builds API.** The production
credential and trigger id are installed as secrets, no credential exists in the
repository, no test may call the API, and no deployment has yet been triggered
through this application path.

**It ships switched off by default.** Every `/admin` path answers 404 unless the
deployment carries both halves. Production carries them behind Access; an
ordinary deployment/default carries neither:

| Variable | Meaning |
|---|---|
| `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` | who may sign in — a Cloudflare Access application |
| `ADMIN_DATABASE_URL` | what there is to edit — a request-time editorial database |

404, not 503 or a login page: a deployment that says "the admin is here but
switched off" has told an unauthenticated prober where to come back to.
`npm run cf:verify` asserts that against the real deployed artefact.

`ADMIN_DATABASE_URL` is deliberately **not** `DATABASE_URL`. That one is the
public read path's *build* variable, so provisioning production Postgres must
not also switch on a request-time editorial surface in the Worker.

Locally:

```bash
ADMIN_DATABASE_URL=postgres://…/game_profile \
ADMIN_DEV_IDENTITY=you@example.com \
  npm run dev            # /admin is served at http://localhost:3000/admin
```

**The direct connection verifies the server's certificate.** It used to pass
`ssl: "require"`, which in postgres.js negotiates TLS and then switches
certificate verification *off* — encrypted, but to whoever answered. It now
passes `{ rejectUnauthorized: true }`, the driver's supported way to verify, and
every hosted database works unchanged. A local Postgres that speaks no TLS needs
the standard libpq opt-out spelled in the URL:

```bash
ADMIN_DATABASE_URL=postgres://…@127.0.0.1:5432/game_profile?sslmode=disable
```

That is the only way to turn verification off, it is visible in the connection
string, and it applies to that one connection. Hyperdrive is unaffected: it
terminates the transport itself and the Worker passes no TLS options at all
(ADR 0021).

**The application role is granted `SELECT, INSERT, UPDATE, DELETE` — never
`GRANT ALL`.** Withholding `TRUNCATE` is part of the deployment audit trail's
immutability, not tidiness: the append-only triggers are per-row on UPDATE and
DELETE, so a `TRUNCATE` fires none of them and would erase the trail in one
statement. `ALL` on a table includes `TRUNCATE`. In the authoritative database
the role is `should_i_play_admin` and holds exactly the four privileges above;
`tests/db/regression.sh` asserts that set is sufficient for the application and
insufficient to erase the trail. See
[ADR 0022](docs/decisions/0022-deployment-requests-and-proof-of-live.md#f-truncate-and-the-privilege-boundary-this-rests-on).

The development identity works **only under a real `next dev`** — it needs both
a non-production `SITE_ENV` and `NODE_ENV=development`, so no built artefact can
carry it. A Cloudflare preview is a non-production site *and* a
production-compiled build on a reachable hostname, so it requires Access like
any other deployment. Where Access is configured it is the only authority: a
missing or invalid assertion refuses rather than falling back.

Authorisation runs next to the data — inside every Server Action, and inside
every exported read entrypoint before it opens a connection. The layout guard
stays as UX and defence in depth, but is not what protects draft data: layouts
do not re-render on every navigation under Partial Rendering. The verified
identity is memoised per request, so a page with several panels verifies once.

A `proxy.ts` gate was written and removed: Next 16 pins Proxy to the Node.js
runtime and `@opennextjs/cloudflare` cannot build one. See
[ADR 0018](docs/decisions/0018-admin-access.md).

Two identity rules are enforced in the write layer, not just the form: a scope
key is fixed once the scope has any evaluation, and a game slug is fixed once
the game publishes a profile. Both are public addresses by then, and nothing
here redirects an old one.

## Database

The schema targets Postgres 16 and the integration workflow applies every
migration, loads the seed, runs the real-database contract suite and exercises
the derived view.

**The public site reads its published profiles from this database**, at build
time, through `lib/data/games.ts` — see [Where the data comes from](#where-the-data-comes-from)
and [ADR 0017](docs/decisions/0017-postgres-read-path.md). A migration must reach
this database *before* the branch that needs it is built — see
[Migrations go out before the code that needs them](#migrations-go-out-before-the-code-that-needs-them).

One command takes an empty database to a fully constrained, seeded schema:

```bash
DATABASE_URL=postgres://…/game_profile npm run db:setup
```

That is `db:migrate` followed by `db:seed`, and it is the canonical path — there
is no second step to remember. `0000_schema.sql` creates the tables,
`0001_contract.sql` installs the first checks and derived `dimension_scores`
view, and `0002_contract_hardening.sql` registers rubric identity and freezes
final history. `0003`–`0008` add profile scopes, platform overrides, general
score provenance, the artwork rights record, explicit primary scopes and
authored ordering for tags and evidence; `0009` deployment tracking; `0010`
the editorial-fair-use basis; `0011` the IGDB staging tables (see
[IGDB staging](#igdb-staging)). Drizzle applies every pending migration
transactionally, so the schema is never left half-built.

`0003`, `0005`, `0006` and `0008` write beneath rows the `0002` immutability
triggers have frozen. Each disables the relevant user triggers for that work
only, changes no score, status or judgement, and re-arms them before committing;
because Drizzle runs a migration in one transaction, a failure cannot leave a
trigger off. The regression suite applies every one of them to a *populated*
database built from `tests/db/fixtures/seed-pre-0003.sql`, because a migration
that only builds a correct empty schema has not been shown to upgrade anything —
`0008` shipped without that check and was refused by the very trigger the section
exists to catch, on the only databases that have published rows: the real ones.

```bash
npm run db:migrate                     # schema only
npm run db:seed                        # data only; safe to run repeatedly
npm run db:generate                    # regenerate migrations from the schema
npm run db:seed-sql > lib/db/seed.sql  # regenerate the seed from the fixtures

DATABASE_URL=postgres://…/game_profile_test \
  CONFIRM_DATABASE_RESET=game_profile_test npm run test:db  # destructive, disposable DB only
```

`test:db` requires Bash (`bash` on Linux/macOS, Git Bash or WSL on Windows) and
`psql`. It refuses any database name that does not end in `_test` or `_ci`, and
also requires the exact name repeated in `CONFIRM_DATABASE_RESET`.

`lib/db/seed.sql` is generated output — edit `content/games/*.ts` and regenerate.
A test asserts the committed file is byte-identical to the generator. Re-running
it is a no-op for identical snapshots; a conflicting natural key fails loudly,
and a declared new version can supersede its existing predecessor atomically.

## IGDB staging

Phase 3A Item 5 ([ADR 0037](docs/decisions/0037-igdb-staging-identity-and-provenance.md),
issue #48) adds a **provider staging layer** under `lib/igdb/`: a faithful,
provenance-carrying copy of what IGDB says, kept apart from editorial truth.
Nothing in it is scoring evidence, a publication, a profile scope or an
artwork clearance, and nothing public or build-time imports it.

Three identities stay separate: the internal canonical game/scope, the IGDB
entity (`igdb_games`, by IGDB id with checksum and `updated_at`), and the
reviewed relation between them (`igdb_identity_candidates`, accepted by a
named person into `game_external_ids`). IGDB's `version_parent` (an edition
of the same work) and `parent_game` (additional content, or a bundle) are
staged as different relations that name the field that asserted them, and
the database refuses to swap them. Provider changes append classified,
append-only review signals (`igdb_change_events`); a `material_scope`
change prompts editorial review and nothing else happens automatically.
Artwork is staged as candidates (`igdb_images`) with no clearance column at
all; the [ADR 0011](docs/decisions/0011-production-artwork.md) path is the
only way an image reaches the site.

```bash
npm run igdb:report                 # normalize the synthetic fixture; no network, no database
npm run igdb:probe                  # dry run: what the live probe would do
npm run igdb:probe -- --live        # opt-in, credential-safe readiness probe; never in CI
npm run igdb:probe -- --live --field-contract <id>   # exact field list on one non-cohort record; structural facts only
npm run igdb:probe -- --live --dump-sample platforms  # one small real dump through the production CSV path
DATABASE_URL=postgres://…/some_db CONFIRM_IGDB_STAGING=some_db \
  npm run igdb:stage-proof          # stage the fixture into a non-production database, rolled back unless --commit
DATABASE_URL=postgres://…/some_db npm run igdb:preflight   # read-only: is 0011 safe to apply here?
```

The probe reads `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` (or a pre-issued
`IGDB_ACCESS_TOKEN`) by name, sends them only in the Twitch form body and the
IGDB headers, and prints safe booleans, statuses, timings and counts through
redaction. The two contract proofs **fail closed**: `--field-contract` exits
non-zero unless the provider accepted the exact field list and
`unexpanded_fields` is empty, and `--dump-sample` exits non-zero unless the
production CSV parser accepted the file and a **non-empty** array value and a
timestamp value were actually observed in its rows. `platforms` is the default
because its dump schema carries both array columns (`versions`, `websites`) and
`TIMESTAMP` columns; `game_types` has timestamps but no array field, so it
cannot prove that half of the contract. There is no bulk import command; staging real records is Item 6 work, one
development game at a time, on the layer described in
[the readiness record](docs/calibration/Phase_3A_Item_5_IGDB_Staging_Readiness_Record.md).
Applying `0011` to the authoritative database is a separately authorized
rollout step preceded by `igdb:preflight`, not part of Item 5.

## Deployment

Cloudflare Workers via `@opennextjs/cloudflare`, built from GitHub by Workers
Builds. Production deploys from `main`; every other branch gets a preview version
with its own URL. See [ADR 0008](docs/decisions/0008-cloudflare-hosting.md).

```bash
npm run cf:build          # next build + OpenNext bundle -> .open-next/worker.js
npm run cf:preview        # the above, then run the real Worker locally under workerd
npm run cf:verify         # build as production, boot the Worker, assert what it serves
npm run cf:deploy         # verify + contain + deploy the exact artifact (main only)
npm run cf:deploy-preview # build, then upload a branch-aliased preview version
```

`cf:deploy` runs `cf:verify` before every production deploy, then checks the
resulting artifact for unlicensed evaluation art and deploys that same tree
without rebuilding. `cf:verify` is also available on its own; it is the only
check that sees what the Workers runtime actually returns — prerendered output on
disk, unit tests and e2e have all been green while the Worker served the opposite
(ADR 0008).

Both deploy paths produce the Worker they ship rather than inheriting whatever a
previous step left in `.open-next/`, so they behave the same on a laptop as in
Workers Builds regardless of how the CI build command is configured. Production
deploys the artifact that `cf:verify` actually booted; it does not rebuild after
the check.

`npm run cf:preview` is the honest pre-deploy check — it exercises the Worker
runtime, not just the Next.js build.

Every public route prerenders to a static asset, so the Worker mostly routes.
A local build is a **preview** build and is served `noindex`; set
`NEXT_PUBLIC_SITE_ENV=production` to reproduce the production artefact. That
default is deliberate — see `lib/site.ts`.

### Runbook: enable the deploy trigger from the editorial tool

The tool can ask Workers Builds for a production build. Nothing in this
repository can create the credential, and the deployed default has none, so this
is a deliberate act with named steps. It changes no code.

1. **Create a user-scoped API token** at
   `dash.cloudflare.com/profile/api-tokens`. Cloudflare requires this API to use
   a *user* token; an account-scoped one returns "Invalid token" and nothing in
   the error says why. Grant one permission: **Workers Builds Configuration —
   Edit**. *Workers Scripts: Read* is only needed to look a Worker tag up at
   runtime, which step 3 makes unnecessary.
2. **Find the production trigger uuid.** Each Worker has at most two triggers,
   one per branch class. The production one is the trigger whose
   `branch_includes` is `["main"]`:

   ```bash
   curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/workers/scripts" \
     -H "Authorization: Bearer $TOKEN" | jq '.result[] | {name: .id, tag: .tag}'
   curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/builds/workers/$TAG/triggers" \
     -H "Authorization: Bearer $TOKEN" | jq '.result[] | {trigger_uuid, trigger_name, branch_includes}'
   ```

3. **Set four variables** on the Worker (Settings -> Variables), as secrets:
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
   `CLOUDFLARE_BUILDS_TRIGGER_ID`, and optionally `CLOUDFLARE_WORKER_TAG` — the
   tag from step 2, which both removes the runtime lookup and enables
   build-status diagnostics.
4. **Verify before trusting it.** Open `/admin/deployments` and press **Check
   production now** *before* requesting anything. It needs no credential, and it
   establishes what production is currently serving so the first request has a
   baseline to be compared against. Until it has been pressed once, every
   published profile reads *not proven* — which is correct, and is what an
   unexercised deployment looks like.

Rolling the token back is deleting the variable: publication is unaffected,
verification keeps working, and the tool reports that no build can be requested.

**A request that will never resolve itself.** Three states can strand one:
*pending* (the row committed but the dispatch outcome never did), *dispatch
unknown* (no build id was returned, so there is nothing to ask Cloudflare
about), and *dispatched* whose build outcome cannot be read — which happens
whenever `CLOUDFLARE_WORKER_TAG` is unset, when a build has aged off
Cloudflare's recent list, and always when a build **failed**, since a failed
build never appears in a manifest. Each blocks every later manual request. Check
the Workers Builds dashboard and use **Stop waiting for this request** on the
deployment page. That records that you stopped waiting, and deliberately not
that the build failed: if it does deploy after all, verification still proves it
from the manifest.

**Verify these at activation, because nothing local can.**

- **Hyperdrive query caching — already corrected, confirm it is being used.**
  Hyperdrive does not invalidate cached reads when the application writes, and
  every editorial action here is a write followed immediately by a read of what
  was written. The editorial binding therefore has **caching disabled**:
  `should-i-play-editorial` (`6129a6b8…`) carries `caching: { disabled: true }`,
  applied before any deployment request was ever made. One configuration, one
  `HYPERDRIVE` binding, no second transport to route between. Wrangler's local
  emulation does no caching either way, so a green `cf:verify` still proves
  nothing about this. What remains is one look on first use: write something,
  reload the page that reads it, and confirm Hyperdrive metrics report
  `cacheStatus` **`disabled`** for the admin reads. If a future change ever
  re-enables caching on this configuration, the active-request guard in
  `dispatchDeployment` can be answered from a stale cache and two production
  builds become possible again. See
  [ADR 0021](docs/decisions/0021-hyperdrive-is-the-deployed-admin-transport.md#amendment--activation-prep-caching-is-disabled-on-this-configuration).
- **Reading the manifest needs the public front door — fixed 2026-08-24.**
  `verifyProduction` fetches the real `https://shouldiplay.gg/deployment-manifest`,
  and a Worker's fetch to its own Custom Domain is routed to the zone's *origin
  server* unless `global_fetch_strictly_public` is set. A Workers-only Custom
  Domain has no origin server, so every verification answered `http-error` while
  the same URL served a valid manifest to browsers. The flag is set in
  `wrangler.jsonc` and asserted by `tests/cf-command-paths.test.ts`; nothing
  local can prove the behaviour, because `cf:verify` has no zone to be inside of
  and previews run on workers.dev. See
  [ADR 0023](docs/decisions/0023-verifying-production-from-inside-the-worker.md).
- **The first real dispatch.** No Cloudflare Builds request has ever been made
  through this application. The first one is also the first test of the request
  lifecycle end to end. Still true after activation: the credential and trigger
  id are installed, but no build has been requested from `/admin`.
- **The application role's privileges.** No test here can reach the
  authoritative database. That the role holds `SELECT, INSERT, UPDATE, DELETE`
  and *not* `TRUNCATE` on the four deployment tables is asserted against a
  modelled role in `tests/db/regression.sh` and remains externally true of the
  real one.

### Runbook: protect preview URLs (one click, once, account-wide)

Previews render evaluation-clearance artwork, and `noindex` is discoverability
control, not access control — a preview URL is public to anyone holding it until
Cloudflare Access is on. Access is an account-level Zero Trust policy with no
representation in `wrangler.jsonc`, so it cannot be enabled from this repository.

1. Cloudflare dashboard -> **Workers & Pages** -> **should-i-play**
2. **Settings -> Domains & Routes**
3. Next to **Preview URLs**, click **Enable Cloudflare Access**
4. **Manage Cloudflare Access** -> authorise the reviewing email addresses

`cf:deploy-preview` reports the current state of this on every upload
(`node scripts/check-preview-access.mjs <url>` runs the same check by hand).
Until it is enabled, treat preview links as shareable-but-public: use them, do
not post them anywhere durable. See
[ADR 0012](docs/decisions/0012-preview-access-and-artwork-exposure.md).

## Decisions

- [0001 — Stack and hosting](docs/decisions/0001-stack-and-hosting.md)
- [0002 — Data access for the vertical slice](docs/decisions/0002-data-access.md)
- [0003 — Public display order follows the radar](docs/decisions/0003-display-order.md)
- [0004 — Unknown and range scores](docs/decisions/0004-unknown-and-range-scores.md) *(confirmed by SOP v0.2 §10.6)*
- [0005 — Score provenance](docs/decisions/0005-score-provenance.md) *(reconciled against Calibration Round 1)*
- [0006 — Evidence provenance, per-dimension confidence and pre-release maturity](docs/decisions/0006-evidence-provenance-and-confidence.md)
- [0007 — Database integrity: derivation completeness, source identity, lineage](docs/decisions/0007-database-integrity.md)
- [0008 — Hosting on Cloudflare Workers via OpenNext](docs/decisions/0008-cloudflare-hosting.md) *(supersedes the hosting half of 0001)*
- [0009 — Final evaluation and rubric integrity](docs/decisions/0009-final-evaluation-and-rubric-integrity.md)
- [0010 — Design surfaces are gated by site environment, not `NODE_ENV`](docs/decisions/0010-design-surfaces-and-site-environment.md)
- [0011 — Artwork is game metadata, and clearance decides where it renders](docs/decisions/0011-production-artwork.md)
- [0012 — `noindex` is not access control](docs/decisions/0012-preview-access-and-artwork-exposure.md)
- [0013 — Historical visual system](docs/decisions/0013-visual-system.md) *(superseded by 0030; profile direction completed by 0032)*
- [0014 — A game has profile scopes, and each one has its own history](docs/decisions/0014-profile-scopes.md)
- [0015 — Platform overrides, and provenance that describes ordinary work](docs/decisions/0015-platform-overrides-and-provenance.md)
- [0016 — A game's primary profile scope owns its canonical URL](docs/decisions/0016-canonical-scope-urls.md)
- [0017 — Postgres is the read path, and it is a build dependency](docs/decisions/0017-postgres-read-path.md) *(supersedes the fixture half of 0002)*
- [0018 — Cloudflare Access is the editorial identity, and the admin ships switched off](docs/decisions/0018-admin-access.md) *(supersedes the JWT deferral in 0012)*
- [0019 — Hosted Postgres and remote-admin activation](docs/decisions/0019-hosted-postgres-and-admin-activation.md)
- [0020 — Public-faithful preview and deployment trigger](docs/decisions/0020-publication-preview-and-deploy-trigger.md)
- [0021 — Hyperdrive is the deployed admin transport](docs/decisions/0021-hyperdrive-is-the-deployed-admin-transport.md)
- [0022 — Deployment requests and proof of Live](docs/decisions/0022-deployment-requests-and-proof-of-live.md)
- [0023 — Production verification from inside the Worker](docs/decisions/0023-verifying-production-from-inside-the-worker.md)
- [0024 — Candidate scoring protocol and package contract](docs/decisions/0024-scoring-protocol-v1-and-package-contract.md) *(proposed; not governing until calibration and owner approval)*
- [0025 — Search registry and deterministic discovery](docs/decisions/0025-search-registry-and-deterministic-discovery.md)
- [0026 — Provider-first, provider-independent metadata](docs/decisions/0026-provider-first-metadata-ownership.md)
- [0027 — Practical time is not a Game Profile dimension](docs/decisions/0027-practical-time-is-not-a-game-profile-dimension.md)
- [0028 — Purpose-governed product analytics](docs/decisions/0028-purpose-governed-product-analytics.md)
- [0029 — Official storefront actions before live commerce](docs/decisions/0029-official-storefront-actions-before-live-commerce.md)
- [0030 — Accepted Gate A homepage and public visual direction](docs/decisions/0030-gate-a-homepage-direction.md) *(supersedes 0013)*
- [0031 — Editorially governed static build-time Search index](docs/decisions/0031-static-build-time-search-index.md)
- [0032 — Accepted Gate B profile direction](docs/decisions/0032-gate-b-profile-direction.md)
- [0033 — Compare URL/index policy and art-led revision direction](docs/decisions/0033-compare-url-index-and-art-direction.md)
- [0034 — Accepted full Compare direction](docs/decisions/0034-accepted-full-compare-direction.md)

## Not built, deliberately

What should I play? UI, `/about`, sibling-scope Compare, the 12–15-profile
validation corpus and the approximately-100-profile quiet-release catalog are
not built. The profile offers no "Compare with" and no "Where to play": no
editor-selected pair and no verified storefront destination exist, and a
control that goes nowhere is worse than an honest absence. The homepage's
curated-Compare module can now link an eligible pair into Compare, and its
configuration is still empty. Static Search, the accepted homepage system and
the accepted profile system are merged on `main` (Slices 1 to 3); the accepted
full Compare system is implemented in the current codebase (Slice 4); the 5 September
canonical-origin manifest names main `e7dd4aa` (#115/PR #117). No profile carries an
approved practical-time record, so no profile shows total commitment or a
useful-session window; the component renders them from a record or not at all. The authored evergreen/living
shelves and the "Choosing between…" entries have their grammar, configuration
contract and tests, and no content: every entry either would carry is a
qualitative editorial claim Tomas approves, so both configurations ship empty
rather than inventing one (P0.3). The provider-independent discovery/time,
metadata precedence, storefront-action and event contracts are implemented and
tested as foundations. Evaluation authoring is built. Public accounts, reviews,
comments, social features, runtime AI chat, recommendation ML and a public
aggregate score remain out of current scope.
