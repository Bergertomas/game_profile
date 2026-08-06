# Game Profile

> Not just whether a game is good. What kind of good is it?

Game Profile describes games across eight fixed dimensions, each scored 0–10
against a published rubric, so a player can tell what kind of experience a game is
before buying it. **There is no overall score** — an 87 can describe a beautifully
written but mechanically clumsy RPG or a nearly storyless, mechanically perfect
action game, and those are entirely different purchases.

This repository is at **Phase 1**: the public profile vertical slice.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
npm run verify       # typecheck + unit tests
npm run test:e2e     # builds, serves, runs Playwright
```

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
  methodology/page.tsx         renders itself from the typed rubric
  dev/radar-states/            unknown/range harness, dev only
components/
  ProfilePanel.tsx             radar + score rows as one linked unit
  ProfileRadar.tsx             the signature eight-axis silhouette
  ScoreRows.tsx                exact scores, always visible, expandable
lib/
  rubric/                      canonical typed Rubric v1.0 — the source of truth
  scoring/derive.ts            dimension totals, unknowns, ranges
  radar/geometry.ts            pure, DOM-free chart geometry
  validation/evaluation.ts     the publish gate
  db/                          Drizzle schema, migration, constraints, seed
  data/games.ts                the only data-access boundary
content/games/                 seeded evaluations
docs/decisions/                ADRs
tests/                         unit (vitest) and e2e (playwright)
```

## Rules the code enforces

These are product semantics, not preferences. Most are covered by a test.

| Rule | Where |
|---|---|
| No aggregate score is computed, stored or displayed | no summing code exists; asserted in `tests/e2e` and `tests/radar-geometry.test.ts` |
| Dimension totals are derived from subcriteria, never entered | `lib/scoring/derive.ts`, `dimension_scores` view |
| Scores are 0–2 in 0.5 increments | schema check constraints, `tests/scoring.test.ts` |
| `unknown` is never zero, on screen or in the database | `NULL` in Postgres, `null` vertex in geometry, [ADR 0004](docs/decisions/0004-unknown-and-range-scores.md) |
| Exact scores are readable without hover or interaction | `ScoreRows`, asserted in e2e |
| Radar axis order is globally fixed | `lib/rubric/v1.ts`, `tests/rubric.test.ts` |
| No good/bad colour semantics | one accent, used neutrally, at one opacity |
| Every evaluation declares edition, mode, platform and build | NOT NULL columns, shown on the page |
| Every scored subcriterion has a rationale | publish gate, `tests/calibration.test.ts` |
| Only one published evaluation per game per rubric version | unique partial index |
| Redfall reproduces the Round 2 matrix exactly | `tests/calibration.test.ts` |

## Database

The schema is real and has been applied to Postgres 16 — migration, constraints
and the derived view all run, and the seed loads. The site does not yet read from
it; see [ADR 0002](docs/decisions/0002-data-access.md).

```bash
npm run db:generate                    # regenerate the migration from the schema
npm run db:seed-sql > lib/db/seed.sql  # regenerate the seed from the fixtures

psql -d game_profile -f lib/db/migrations/0000_skinny_ben_urich.sql
psql -d game_profile -f lib/db/constraints.sql   # checks + dimension_scores view
psql -d game_profile -f lib/db/seed.sql
```

`lib/db/seed.sql` is generated output. Edit `content/games/*.ts` and regenerate.

## Decisions

- [0001 — Stack and hosting](docs/decisions/0001-stack-and-hosting.md)
- [0002 — Data access for the vertical slice](docs/decisions/0002-data-access.md)
- [0003 — Public display order follows the radar](docs/decisions/0003-display-order.md)
- [0004 — Unknown and range scores](docs/decisions/0004-unknown-and-range-scores.md) *(needs product sign-off)*
- [0005 — Score provenance and the missing Round 1 report](docs/decisions/0005-score-provenance.md) *(needs editorial reconciliation)*

## Not built, deliberately

Search, `/discover`, `/compare`, `/about`, admin auth and the evaluation editor
are Phases 2–5. Public accounts, reviews, comments, social features, AI chat,
recommendation ML and a public aggregate score are out of scope for the product,
not merely deferred.
