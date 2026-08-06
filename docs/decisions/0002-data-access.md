# ADR 0002 — Data access for the vertical slice

**Status:** Accepted · 2026-08-06
**Context:** Master Plan §13, Phase 1 ("No admin UI required yet; seed data is
acceptable"), Project Context §11

## Problem

The Master Plan requires evaluation and rubric versioning "from day one" and a
schema with edition/mode/platform/build scope. It also specifies that the first
vertical slice may run on seed data. No Supabase project exists yet, and the
slice must not be blocked on provisioning one.

The obvious failure mode is a fixture-shaped prototype whose data model turns out
not to fit the real schema, discovered at Phase 2.

## Decision

Build all three layers now, with a single seam between them.

1. **`lib/db/schema.ts`** — the real Drizzle Postgres schema, with versioning,
   supersession, NOT NULL scope columns and platform-specific score overrides.
   Committed with a generated migration and a companion `constraints.sql` holding
   the check constraints and the derived `dimension_scores` view.
2. **`content/games/*.ts`** — typed fixtures, validated by the same publish gate
   an editor will hit in the admin UI (`lib/validation/evaluation.ts`).
3. **`lib/data/games.ts`** — the only module the site uses to read data. Three
   functions. Swapping fixtures for Drizzle queries changes this file and nothing
   else.

`scripts/emit-seed-sql.ts` generates seed SQL from the fixtures, so the database
is populated from the same source the site renders. The fixtures and the schema
cannot drift apart without the generator failing.

## Verification

The schema, constraints and generated seed were applied to a real Postgres 16
instance. The `dimension_scores` view reproduces every total that
`lib/scoring/derive.ts` computes, including the range case for a single unknown
subcriterion, and every check constraint was confirmed to reject invalid data
(score above 2, score off the 0.5 grid, a second published evaluation for one
game, a published evaluation missing its primary risk, a High-confidence
pre-release profile).

## Consequences

- Phase 2 starts from a schema that has already run, not one that has only
  type-checked.
- `lib/data/games.ts` is currently `async` for no reason other than to make the
  swap to real queries a no-op at every call site.
- Until Postgres is provisioned, the fixtures are authoritative. `seed.sql` is
  generated output and is marked as such.
