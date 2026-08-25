# Should I Play?

> Not just whether a game is good. What kind of good is it?

**Should I Play?** ([shouldiplay.gg](https://shouldiplay.gg)) gives every game a
**Game Profile**: eight fixed dimensions, each scored 0–10 against a published
rubric, so a player can tell what kind of experience a game is before buying it.
**There is no overall score** — a beautifully written but mechanically clumsy
RPG and a nearly storyless, mechanically perfect action game can look equally
strong at a glance, but they are entirely different purchases.

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
[Master Product & Build Plan v0.9](docs/Game_Profile_Master_Product_and_Build_Plan_v0.9.md)
and the dated
[Public Product P0 Decision Set](docs/Should_I_Play_Public_Product_P0_Decisions_2026-08-24.md).

**Remote admin and production Live proof are exercised.** The current state is:

| | |
|---|---|
| **Implemented and deployed** | migration `0009` and its schema; deployment-request persistence; the Cloudflare Builds client; manifest generation; the `/deployment-manifest` route; the reconciliation and Live-proof machinery; the `/admin` deployment surface |
| **Proven** | a production build from `main`; `/deployment-manifest` live on the canonical origin; corpus/digest matching the three published evaluations; behavior under workerd; migration `0009`; Access-authenticated editorial session through Hyperdrive; successful `production_verified` observation and Live state |
| **Not yet exercised** | a real Cloudflare Builds POST from this application; a build UUID produced by that application dispatch and reconciled; one complete new-profile Publish → dispatch → Live cycle |

The remaining dispatch proof belongs to the first real catalog publication. It
does not justify further standalone admin hardening.

**The editorial tool ships switched off by default.** `/admin` answers 404 unless a
deployment carries both an identity provider and a request-time editorial
database. Production now carries both behind Cloudflare Access; ordinary
previews/default deployments carry neither — see
[Editorial tool](#editorial-tool).

---

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
    page.tsx                   the library entrance — proposition, shelf, explainer
    games/[slug]/page.tsx      the game's primary profile, then more games
    games/[slug]/[scope]/      a sibling profile scope; the primary key 308s
    games/[slug]/opengraph-image  prerendered share card, silhouette and all
    methodology/page.tsx       renders itself from the typed rubric
    dev/radar-states/          unknown/range harness, non-production only
  admin/                       the editorial tool. Authenticated, noindex, never prerendered
    layout.tsx                 the shell, and the guard every page passes through
    actions.ts                 every editorial mutation, one transaction each
    games/[id]/page.tsx        metadata, artwork rights, scopes, evaluation history
    deployments/page.tsx       Published vs what production actually serves
  deployment-manifest/         the artifact's inventory of itself, prerendered
  robots.ts / sitemap.ts       generated from the same data the pages read
components/
  SiteChrome.tsx               header and footer — achromatic, so games carry colour
  GameCard.tsx                 the one card grammar every list of games will use
  profile/radar.tsx            the only radar in the product, at three sizes
  profile/instrument.tsx       score rows, disclosure and hover linking
  profile/GameProfile.tsx      the canonical profile, with profile.css beside it
  profile/ScopeSwitcher.tsx    sibling navigation, only where a game has siblings
  admin/                       editorial form plumbing and panels
lib/
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
| The sitemap lists exactly the published profiles, dated by publication | `app/sitemap.ts`, `tests/seo.test.ts` |
| Sources are evidence, never votes averaged into a score | no source value reaches a number; wording is "supported by", never "calculated from" |
| Dimension totals are derived from subcriteria, never entered | `lib/scoring/derive.ts`, `dimension_scores` view |
| Scores are 0–2 in 0.5 increments | schema check constraints, `tests/scoring.test.ts` |
| `unknown` is never zero, on screen or in the database | `NULL` in Postgres, `null` vertex in geometry, [ADR 0004](docs/decisions/0004-unknown-and-range-scores.md) |
| Exact scores are readable without hover or interaction | `components/profile/instrument.tsx`, asserted in e2e |
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
| Source counts stay hidden until the ledger is genuinely populated | `evaluations.evidence_ledger`, `tests/lineage.test.ts` |
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
| Artwork carries its clearance and basis, never a bare URL | `game_artwork`, [ADR 0011](docs/decisions/0011-production-artwork.md) |
| All three profiles reproduce their calibration matrix exactly | `tests/calibration.test.ts` — 24 locked totals |

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
authored ordering for tags and evidence. Drizzle applies every pending migration
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
- [0013 — One Should I Play? visual system](docs/decisions/0013-visual-system.md)
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

## Not built, deliberately

The resolved public homepage, Search/Discovery, `/compare`, `/about`, the
12–15-profile validation corpus and the approximately-100-profile launch catalog
are not built. Evaluation authoring is built. Public accounts, reviews,
comments, social features, AI chat, recommendation ML and a public aggregate
score remain out of current scope.
