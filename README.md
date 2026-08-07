# Should I Play?

> Not just whether a game is good. What kind of good is it?

**Should I Play?** ([shouldiplay.gg](https://shouldiplay.gg)) gives every game a
**Game Profile**: eight fixed dimensions, each scored 0–10 against a published
rubric, so a player can tell what kind of experience a game is before buying it.
**There is no overall score** — an 87 can describe a beautifully written but
mechanically clumsy RPG or a nearly storyless, mechanically perfect action game,
and those are entirely different purchases.

*Should I Play?* is the site. *Game Profile* is the evaluation it publishes, and
the name of the methodology. Internal identifiers (`GameProfile`, `game_profile`,
this repository) keep the original name deliberately — the rename is public-facing
only. See [Brand, Discoverability & Hosting](docs/Should_I_Play_Brand_and_SEO_Foundation_v0.2.md).

This repository is at **Phase 1**: the public profile vertical slice.

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
  page.tsx                     three contrasting silhouettes side by side
  games/[slug]/page.tsx        the canonical profile page
  games/[slug]/opengraph-image  prerendered share card, silhouette and all
  methodology/page.tsx         renders itself from the typed rubric
  robots.ts / sitemap.ts       generated from the same data the pages read
  dev/radar-states/            unknown/range harness, dev only
components/
  ProfilePanel.tsx             radar + score rows as one linked unit
  ProfileRadar.tsx             the signature eight-axis silhouette
  ScoreRows.tsx                exact scores, always visible, expandable
lib/
  rubric/                      canonical typed Rubric v1.0 — the source of truth
  scoring/derive.ts            dimension totals, unknowns, ranges
  radar/geometry.ts            pure, DOM-free chart geometry
  profile/vocabulary.ts        public wording that varies with evidence state
  validation/evaluation.ts     the publish gate
  db/                          Drizzle schema, migration, constraints, seed
  data/games.ts                the only data-access boundary
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
| Exact scores are readable without hover or interaction | `ScoreRows`, asserted in e2e |
| Radar axis order is globally fixed | `lib/rubric/v1.ts`, `tests/rubric.test.ts` |
| No good/bad colour semantics | one accent, used neutrally, at one opacity |
| Every evaluation declares edition, mode, platform and build | NOT NULL columns, shown on the page |
| Every dimension carries its own confidence | `dimension_assessments`, publish trigger, `tests/lineage.test.ts` |
| A missing subcriterion row can never become a precise score | `dimension_scores` derives against the full expected set |
| A published evaluation has no gaps | deferrable constraint triggers, on delete *and* retargeting update |
| Evidence counts count distinct sources, not links | `COUNT(DISTINCT evidence_source_id)` in `dimension_scores` |
| Every edge of a supersession chain is validated and seeded as declared | `validateGameRecord`, `tests/lineage.test.ts` |
| Evidence sources are identified by key, never by title | `evidence_sources.source_key`, `tests/seed-sql.test.ts` |
| Superseded evaluations are preserved and linked, never overwritten | self-referencing FK + lineage validation, `tests/lineage.test.ts` |
| Source counts stay hidden until the ledger is genuinely populated | `evaluations.evidence_ledger`, `tests/lineage.test.ts` |
| Every scored subcriterion has a rationale | publish gate, `tests/calibration.test.ts` |
| Pre-release profiles declare evidence maturity and cannot claim High confidence | check constraints, `tests/evidence.test.ts` |
| Pre-release recommendation blocks avoid verdict language | `lib/profile/vocabulary.ts`, `tests/evidence.test.ts` |
| Runtime data can never reach the eight dimension scores | `game_time_estimates` hangs off `games`, not `evaluations` |
| Only one published evaluation per game per rubric version | unique partial index |
| All three profiles reproduce their calibration matrix exactly | `tests/calibration.test.ts` — 24 locked totals |

## Database

The schema is real and has been applied to Postgres 16 — migration, constraints
and the derived view all run, and the seed loads. The site does not yet read from
it; see [ADR 0002](docs/decisions/0002-data-access.md).

One command takes an empty database to a fully constrained, seeded schema:

```bash
DATABASE_URL=postgres://…/game_profile npm run db:setup
```

That is `db:migrate` followed by `db:seed`, and it is the canonical path — there
is no second step to remember. `0000_schema.sql` creates the tables and
`0001_contract.sql` installs the checks, indexes, triggers and the
`dimension_scores` view; Drizzle applies all pending migrations inside a single
transaction, so the schema is never left half-built.

```bash
npm run db:migrate                     # schema only
npm run db:seed                        # data only; safe to run repeatedly
npm run db:generate                    # regenerate migrations from the schema
npm run db:seed-sql > lib/db/seed.sql  # regenerate the seed from the fixtures

DATABASE_URL=… tests/db/regression.sh  # 33 Postgres invariant checks
```

`lib/db/seed.sql` is generated output — edit `content/games/*.ts` and regenerate.
A test asserts the committed file is byte-identical to the generator, and every
statement in it is idempotent.

## Deployment

Cloudflare Workers via `@opennextjs/cloudflare`, built from GitHub by Workers
Builds. Production deploys from `main`; every other branch gets a preview version
with its own URL. See [ADR 0008](docs/decisions/0008-cloudflare-hosting.md).

```bash
npm run cf:build          # next build + OpenNext bundle -> .open-next/worker.js
npm run cf:preview        # the above, then run the real Worker locally under workerd
npm run cf:verify         # build as production, boot the Worker, assert what it serves
npm run cf:deploy         # build, then deploy to production (main only)
npm run cf:deploy-preview # build, then upload a branch-aliased preview version
```

Run `cf:verify` before any production deploy. It is the only check that sees what
the Workers runtime actually returns — prerendered output on disk, unit tests and
e2e have all been green while the deployed Worker served the opposite (ADR 0008).

Both deploy scripts build the Worker they ship rather than inheriting whatever a
previous step left in `.open-next/`, so they behave the same on a laptop as in
Workers Builds regardless of how the CI build command is configured.

`npm run cf:preview` is the honest pre-deploy check — it exercises the Worker
runtime, not just the Next.js build.

Every public route prerenders to a static asset, so the Worker mostly routes.
A local build is a **preview** build and is served `noindex`; set
`NEXT_PUBLIC_SITE_ENV=production` to reproduce the production artefact. That
default is deliberate — see `lib/site.ts`.

## Decisions

- [0001 — Stack and hosting](docs/decisions/0001-stack-and-hosting.md)
- [0002 — Data access for the vertical slice](docs/decisions/0002-data-access.md)
- [0003 — Public display order follows the radar](docs/decisions/0003-display-order.md)
- [0004 — Unknown and range scores](docs/decisions/0004-unknown-and-range-scores.md) *(confirmed by SOP v0.2 §10.6)*
- [0005 — Score provenance](docs/decisions/0005-score-provenance.md) *(reconciled against Calibration Round 1)*
- [0006 — Evidence provenance, per-dimension confidence and pre-release maturity](docs/decisions/0006-evidence-provenance-and-confidence.md)
- [0007 — Database integrity: derivation completeness, source identity, lineage](docs/decisions/0007-database-integrity.md)
- [0008 — Hosting on Cloudflare Workers via OpenNext](docs/decisions/0008-cloudflare-hosting.md) *(supersedes the hosting half of 0001)*

## Not built, deliberately

Search, `/discover`, `/compare`, `/about`, admin auth and the evaluation editor
are Phases 2–5. Public accounts, reviews, comments, social features, AI chat,
recommendation ML and a public aggregate score are out of scope for the product,
not merely deferred.
