# ADR 0017 — Postgres is the read path, and it is a build dependency

**Status:** Accepted · 2026-08-13
**Context:** Phase 2A. Supersedes the fixture half of
[ADR 0002](0002-data-access.md).

## Decision

The public site reads published Game Profiles from Postgres. `lib/data/games.ts`
remains the only data-access boundary and keeps its exact API; the fixture
implementation moves to `lib/data/fixture-profiles.ts` and a new
`lib/db/read-profiles.ts` assembles the same `GameWithEvaluation` records from
the database. Both are handed to the same `buildProfileView`.

There is deliberately **no second view model**. One domain shape, two ways of
loading it, and `tests/db-read/parity.test.ts` proves the two agree profile by
profile against the calibration corpus.

## The fact that shapes everything else: reads happen at build time

Every public route is prerendered. The database is therefore read during
`next build`, not in the Cloudflare Worker.

This is why 2A needs no Hyperdrive, no runtime connection pooling, no Worker
binding and no runtime credential. `DATABASE_URL` is a **build** variable.

It also means the whole published corpus is loaded once per build process, in a
fixed number of set-based queries, rather than queried per page. A few hundred
games is a few tens of thousands of rows; the alternative is N+1 against every
profile in the catalogue. (Per process: the memo in `lib/data/games.ts` is
module-scoped and Next renders across several worker processes, so a build
performs one read per worker that needs one.)

**It also means publishing a profile will require a rebuild.** That is a real
constraint on the editorial workflow and it is not decided here — see "What 2D
still has to choose".

## What the Worker must be told to serve

The Worker does not automatically serve the HTML the build produced. With no
incremental cache configured it re-renders each page on request, inside workerd,
from whatever the data layer can reach there.

While fixtures were the only source this was unobservable: build and runtime
rendered identical bytes. It stopped being unobservable the moment the build
started reading Postgres and the Worker could not — the Worker would quietly
serve the fixture corpus while the build had published the database's. Proved by
changing a title in the database, rebuilding, and watching the Worker serve the
old one.

Two changes fix it, and both were found by asking the real runtime:

1. `open-next.config.ts` uses `staticAssetsIncrementalCache`, which reads
   prerendered pages back out of the deployed assets. Read-only by design, which
   is correct for a site whose content changes only when it is rebuilt.
2. `cf:verify` runs `populateCache local` after building. `build` does not
   populate that cache; `deploy` and `upload` do. Verifying an artefact
   assembled differently from the deployed one is not verification.

### `dynamicParams = false` still does not work on a page

Adding it makes the Worker answer **every** game page with 404 and
`Internal: NoFallbackError`, while `next start` serves them all correctly. It
shipped once, was fixed in Phase 1, and was reintroduced during this cutover
because the reason lived only in a commit message. The reason now lives in both
page files. The export is unnecessary anyway: an unknown slug renders on demand,
finds no published profile and calls `notFound()`.

## Public selection

For a scope and rubric version, the public profile is the evaluation that is
`published` under `PUBLIC_RUBRIC_VERSION`. That is a filter, not a choice: the
database already guarantees at most one published row per (scope, rubric).

Nothing orders by version number or creation date, because neither is what makes
a row public — `draft` and `review` rows routinely carry the *highest* version,
and a superseded row is preserved history.

Superseded evaluations are excluded and are not loaded at all. Nothing public
renders them; they are editorial data for the revision-history view in 2D.

## Artwork clearance is filtered in the query

Not a presentation detail. `GameProfile` is a client component, so the whole
`ProfileView` — including `game.artwork` — is serialised into the prerendered
payload whether or not the stage renders an image. An uncleared row loaded here
would put its URL in production output, where `check:containment` would not find
it, because its needles come from the evaluation overlay rather than from the
database.

The reader therefore filters `clearance` in SQL, mirroring `mayRender`:
production-cleared always, evaluation-cleared only when design surfaces are on.
The leak is unrepresentable rather than merely unrendered.

## The temporary compatibility path

Production Postgres is not yet provisioned, and the public site has to stay
deployable. A build with no `DATABASE_URL` reads the calibration fixtures and
says so, loudly, in the build log.

This is not a second long-term datastore and must not become one. Removing it is
deleting one branch in `loadPublishedProfiles`, once a production `DATABASE_URL`
exists. Fixtures keep three legitimate uses afterwards: unit tests, development
harnesses (`/dev/radar-states`, the design lab), and the parity fixture.

## Provisioning gap, and the cutover switch

To make production read Postgres (Master Plan v0.7 §9.5):

1. A hosted Postgres 16 instance reachable from Cloudflare Workers Builds.
2. `DATABASE_URL` set as a **Workers Builds build variable** — not a Worker
   secret, because it is never read at runtime.
3. `npm run db:migrate && npm run db:seed` run once against it.
4. A database-backed production build verified under workerd.
5. `REQUIRE_DATABASE=1` set as a build variable, after which the fallback branch
   in `loadPublishedProfiles` is deleted.

No account is created and no provider is chosen here.

Step 5 is the one worth naming. The fallback's dangerous failure is quiet:
production republishing the calibration corpus as though it were the editorial
corpus, with nothing in the output to say so. `REQUIRE_DATABASE=1` turns a
missing `DATABASE_URL` into a build error rather than a silent substitution. It
defaults off, because production has no database yet and the site has to stay
deployable until it does — so cutover is one variable, not a code change.

## Static rendering is settled — CLOSED by Master Plan v0.7 §9.6

This ADR originally left static-versus-runtime publication open, because it was
written before the post-2A product review. **The Plan has since closed it.**

Public `/games/*` routes stay prerendered throughout Phase 2, and publication
triggers a rebuild and deploy. `/games` must not move to request-time database
rendering to make an admin Publish button feel instant, and no Hyperdrive
binding, Worker database secret or runtime connection pool is to be introduced.

So the reasoning below is no longer a trade-off to weigh — it is the contract:
profiles change infrequently, the editorial team is small, pages stay
edge-served, and a database outage cannot remove profiles that are already
deployed. A future ADR records the concrete 2D deployment-trigger
implementation.

## Consequences

- `lib/data/games.ts` did what ADR 0002 promised: swapping fixtures for Drizzle
  queries changed that file and nothing above it.
- The build announces which path it took, because a silent fallback is how a
  fixture-backed deploy gets mistaken for a database-backed one.
- `max: 1` on the connection. The read path is one sequential pass, so a pool
  buys nothing — and it makes transactional test isolation possible, which is
  the only way to exercise a *published* row given that the immutability
  triggers make one un-deletable.
- Two known modelling gaps, deferred to the evidence and tag editors in 2C:
  neither `evaluation_tags` nor `evaluation_evidence_links` has an ordering
  column, so an authored sequence is not representable. `buildProfileView`
  therefore orders both canonically — tags by the controlled vocabulary, sources
  by their stable key — so the page is identical whichever reader ran.
