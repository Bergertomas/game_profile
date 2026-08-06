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
  profile/vocabulary.ts        public wording that varies with evidence state
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
| Sources are evidence, never votes averaged into a score | no source value reaches a number; wording is "supported by", never "calculated from" |
| Dimension totals are derived from subcriteria, never entered | `lib/scoring/derive.ts`, `dimension_scores` view |
| Scores are 0–2 in 0.5 increments | schema check constraints, `tests/scoring.test.ts` |
| `unknown` is never zero, on screen or in the database | `NULL` in Postgres, `null` vertex in geometry, [ADR 0004](docs/decisions/0004-unknown-and-range-scores.md) |
| Exact scores are readable without hover or interaction | `ScoreRows`, asserted in e2e |
| Radar axis order is globally fixed | `lib/rubric/v1.ts`, `tests/rubric.test.ts` |
| No good/bad colour semantics | one accent, used neutrally, at one opacity |
| Every evaluation declares edition, mode, platform and build | NOT NULL columns, shown on the page |
| Every dimension carries its own confidence | `dimension_assessments`, `tests/evidence.test.ts` |
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

```bash
npm run db:generate                    # regenerate the migration from the schema
npm run db:seed-sql > lib/db/seed.sql  # regenerate the seed from the fixtures

psql -d game_profile -f lib/db/migrations/0000_furry_marauders.sql
psql -d game_profile -f lib/db/constraints.sql   # checks + dimension_scores view
psql -d game_profile -f lib/db/seed.sql
```

`lib/db/seed.sql` is generated output. Edit `content/games/*.ts` and regenerate.

## Decisions

- [0001 — Stack and hosting](docs/decisions/0001-stack-and-hosting.md)
- [0002 — Data access for the vertical slice](docs/decisions/0002-data-access.md)
- [0003 — Public display order follows the radar](docs/decisions/0003-display-order.md)
- [0004 — Unknown and range scores](docs/decisions/0004-unknown-and-range-scores.md) *(confirmed by SOP v0.2 §10.6)*
- [0005 — Score provenance](docs/decisions/0005-score-provenance.md) *(reconciled against Calibration Round 1)*
- [0006 — Evidence provenance, per-dimension confidence and pre-release maturity](docs/decisions/0006-evidence-provenance-and-confidence.md)

## Not built, deliberately

Search, `/discover`, `/compare`, `/about`, admin auth and the evaluation editor
are Phases 2–5. Public accounts, reviews, comments, social features, AI chat,
recommendation ML and a public aggregate score are out of scope for the product,
not merely deferred.
