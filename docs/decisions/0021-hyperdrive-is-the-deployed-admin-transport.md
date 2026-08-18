# ADR 0021 — Hyperdrive is the deployed Worker's database transport for `/admin`

**Status:** Accepted · 2026-08-18
**Context:** Reconciles a real divergence. Master Plan v0.8 §9.5 says "Do not
introduce pooling/Hyperdrive for admin unless measured need appears", and
[ADR 0018](0018-admin-access.md) says the deployed admin path uses "no pool, no
Hyperdrive, one short-lived connection per request". The code on `main` has
deliberately used a `HYPERDRIVE` binding for that path since 2026-08-15. This
records why, and narrows the earlier statements rather than leaving the
constitution contradicting the implementation.

## What actually happened

Reconstructed from the commits, in order, on the day remote admin was first
wired against hosted Neon:

| Commit | Change |
|---|---|
| `391c9f6` | Log sanitized admin database failures |
| `4a13375` | Require TLS for Neon admin connections — `ssl: "require"` |
| `1baf9cb` | Add the `no_throw_on_not_implemented_tls_options` compatibility flag |
| `e092c45` | Bind editorial admin to Hyperdrive |
| `6409655` | Route deployed admin database through Hyperdrive |
| `9deacb9` | Give local Hyperdrive verification a fail-closed connection string |

The sequence is the argument. Sanitized failure logging came first because the
deployed admin path was failing and the failures were unreadable. TLS was then
made explicit, because Neon requires it. Then `wrangler.jsonc` acquired a
compatibility flag whose committed rationale is precise:

> Postgres.js also passes Node TLS options that Workers does not implement.
> Since 2026-06-16 Workers throws on those unsupported options by default;
> disabling that throw lets the supported TLS connection proceed instead.

Only after that did Hyperdrive appear.

## Decision

**The deployed Worker reaches the editorial database through Hyperdrive.** The
binding is the admin path's transport.

The reason is transport, not pooling. A direct `postgres.js` → Neon TLS
connection from inside the Workers runtime depends on Node TLS options the
runtime does not implement, and survives only behind a compatibility flag that
suppresses the resulting throw. Hyperdrive terminates the database transport
outside the Worker, so the Worker is no longer the thing negotiating a Postgres
TLS session with primitives it only partly has.

That distinction matters for reading v0.8 §9.5. The prohibition there is against
**pooling as a performance optimisation absent measured need**, and that
prohibition still stands: nothing about this change is motivated by throughput,
and the editorial team is still one person. What was encountered is a runtime
constraint, met in practice, with a commit trail — which is what "measured need"
has to mean when the measurement is "the deployed path did not work".

## What is unchanged, and must stay unchanged

- **Public profile reads never touch Hyperdrive.** They are build-time Postgres
  through `lib/db/client.ts`, and every public route is prerendered. §9.4's "no
  Hyperdrive requirement" describes the public path and remains true as written.
- **No Worker-side connection pool.** `lib/admin/db.ts` creates a client per
  call and closes it in `finally`; nothing is retained across requests.
  Hyperdrive's pool lives outside the Worker, which is what lets §9.5's "one
  short-lived connection per request, closed explicitly" stay literally true of
  the Worker's own behaviour.
- **Local `next dev` still connects directly.** `adminDatabaseConnection()`
  prefers `ADMIN_DATABASE_URL` when `NODE_ENV === "development"`, so editorial
  work does not require a Cloudflare runtime.
- **`ADMIN_DATABASE_URL` stays distinct from `DATABASE_URL`.** Provisioning the
  public build still does not switch on remote administration.
- **The direct URL remains a fallback** in a deployed Worker when no Hyperdrive
  binding is present, which is what makes the cutover reversible.
- **Local emulation fails closed.** The binding carries
  `localConnectionString: postgres://unused:unused@127.0.0.1:1/unused` because
  Wrangler requires *a* local string whenever a Hyperdrive binding exists, and
  `cf:verify` asserts that `/admin` is unreachable. Pointing local emulation at
  a closed endpoint means an accidental query fails rather than reaching the
  production database.

## Honest limitation

**This path has not yet been exercised end to end.** Remote admin is not
activated: `cf:verify` deliberately asserts that `/admin` answers 404, so the
verification that runs today proves the admin is *off*, not that the Hyperdrive
connection works. The evidence for this decision is the runtime constraint and
the commit trail, not a green request against a deployed editorial page.

Proving it is the **remote-admin activation checkpoint** (Master Plan §8.4, P0
item 9), required during Phase 2 and no later than before 2E. If activation
shows the direct path is in fact viable — a Workers runtime change, or a
`postgres.js` release that stops passing unimplemented options — that is grounds
to revisit this ADR, not to quietly keep a binding nothing needs.

## Consequences

- Master Plan v0.8 §9.5 is amended to point here rather than to read as a flat
  prohibition.
- ADR 0018's "no Hyperdrive" is narrowed to the public path and to the *pooling*
  question; its security decisions are untouched.
- The deployed admin path now depends on a Cloudflare account resource
  (Hyperdrive config `6129a6b8…`) as well as on the database. Losing it breaks
  deployed `/admin` while leaving the public site entirely unaffected, because
  the public site does not use it.
- Application code stays ordinary-Postgres portable, as ADR 0019 requires:
  Hyperdrive hands back a connection string, and nothing above
  `adminDatabaseConnection()` knows which transport produced it.
