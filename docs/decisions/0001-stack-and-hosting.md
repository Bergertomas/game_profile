# ADR 0001 — Stack and hosting

**Status:** Accepted · 2026-08-06
**Context:** Master Plan §12, §25

## Decision

Single Next.js 16 application (App Router, TypeScript, React 19), Tailwind CSS v4,
Drizzle ORM against managed Postgres, deployed to Vercel. Supabase remains the
intended Postgres/Auth provider per Master Plan §12.2.

No component library. Tailwind plus a small set of local components, because
"do not let default shadcn styling define the product" (§12.2) is easier to
honour by not installing it than by overriding it.

## Rationale

Nothing here departs from the Master Plan; this ADR records the details it left
to engineering.

- **Drizzle over Prisma.** Drizzle's schema is plain TypeScript that compiles to
  SQL we can read, which matters because several of our invariants
  (one published evaluation per game, 0.5 score increments, the derived
  `dimension_scores` view) live in SQL rather than in application code. Prisma's
  generated client is more ceremony for a schema this small.
- **No chart library.** The radar has hard product requirements a generic chart
  library fights: unknown axes must break the outline rather than plot at zero,
  no area may ever be computed, per-axis labels carry their own values, and the
  whole thing must be `aria-hidden` beside an authoritative score table. That is
  ~150 lines of SVG and pure geometry, and it removes a dependency whose defaults
  would work against us.
- **Self-hosted fonts.** Fraunces and Inter (both SIL OFL) are vendored into
  `public/fonts` rather than fetched at build time, so builds are hermetic.

## Consequences

- The scoring rule now exists twice: `lib/scoring/derive.ts` and the
  `dimension_scores` view in `lib/db/constraints.sql`. That duplication is
  deliberate — it is a cross-check, and both are exercised — but the two must be
  changed together. Both files carry a comment saying so.
- Tailwind v4 requires no `tailwind.config`; tokens live in `app/globals.css`
  under `@theme`.
