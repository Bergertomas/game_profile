# ADR 0001 — Stack and hosting

**Status:** Accepted · 2026-08-06 — hosting superseded by
[ADR 0008](0008-cloudflare-hosting.md) on 2026-08-07 (Cloudflare Workers via
OpenNext, not Vercel). Every other decision here stands.
**Context:** Master Plan §12, §25

## Decision

Single Next.js 16 application (App Router, TypeScript, React 19), Tailwind CSS v4,
Drizzle ORM against managed Postgres, ~~deployed to Vercel~~ (see ADR 0008).
Supabase remains the intended Postgres/Auth provider per Master Plan §12.2.

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
- **Self-hosted fonts.** Vendored into `public/fonts` rather than fetched at
  build time, so builds are hermetic and no third party sees a visitor's IP.
  Originally Fraunces and Inter; Archivo and Newsreader since
  [ADR 0013](0013-visual-system.md) made one typographic system site-wide.

## Consequences

- The scoring rule now exists twice: `lib/scoring/derive.ts` and the
  `dimension_scores` view (since ADR 0007, in `lib/db/migrations/0001_contract.sql`;
  originally a standalone `lib/db/constraints.sql`). That duplication is
  deliberate — it is a cross-check, and both are exercised — but the two must be
  changed together. Both files carry a comment saying so.
- Tailwind v4 requires no `tailwind.config`; tokens live in `app/globals.css`
  under `@theme`.
