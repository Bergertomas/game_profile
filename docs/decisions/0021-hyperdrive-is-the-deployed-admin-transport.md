# ADR 0021 — Hyperdrive is the deployed Worker's database transport for `/admin`

**Status:** Accepted · 2026-08-18
**Context:** Reconciles a real divergence. Master Plan v0.8 §9.5 says "Do not
introduce pooling/Hyperdrive for admin unless measured need appears", and
[ADR 0018](0018-admin-access.md) says the deployed admin path uses "no pool, no
Hyperdrive, one short-lived connection per request". The code on `main` has
deliberately used a `HYPERDRIVE` binding for that path since 2026-08-15. This
records why, and narrows the earlier statements rather than leaving the
constitution contradicting the implementation.

## What the history shows

**This section is a reconstruction from the commit record, not a report of a
diagnosed incident.** No failure log, error report or written post-mortem exists
in the repository. What follows is the best-supported reading of the sequence,
and it is labelled as such because the difference matters: a future reader
deciding whether to remove the binding should know they are weighing an
inference, not a recorded finding.

The commits, in order, on the day remote admin was first wired against hosted
Neon:

| Commit | Change |
|---|---|
| `391c9f6` | Log sanitized admin database failures |
| `4a13375` | Require TLS for Neon admin connections — `ssl: "require"` |
| `1baf9cb` | Add the `no_throw_on_not_implemented_tls_options` compatibility flag |
| `e092c45` | Bind editorial admin to Hyperdrive |
| `6409655` | Route deployed admin database through Hyperdrive |
| `9deacb9` | Give local Hyperdrive verification a fail-closed connection string |

The sequence is the argument, and it reads consistently in one direction:
sanitized failure logging first — which is what one adds while diagnosing
something — then explicit TLS, because Neon requires it, then a Workers
compatibility flag whose committed rationale is precise:

> Postgres.js also passes Node TLS options that Workers does not implement.
> Since 2026-06-16 Workers throws on those unsupported options by default;
> disabling that throw lets the supported TLS connection proceed instead.

Only after that did Hyperdrive appear. That ordering is evidence, though not
proof: the commits do not state that the direct path had been observed failing
in a deployed Worker, and nobody wrote it down.

## Decision

**The deployed Worker reaches the editorial database through Hyperdrive.** The
binding is the admin path's transport.

The best-supported reason is transport rather than pooling. A direct
`postgres.js` → Neon TLS connection from inside the Workers runtime demonstrably
depends on Node TLS options the runtime does not implement — that part is not an
inference, it is the committed rationale of `1baf9cb` — and survives only behind
a compatibility flag that suppresses the resulting throw. Hyperdrive terminates
the database transport outside the Worker, so the Worker stops negotiating a
Postgres TLS session with primitives it only partly has.

What is *inferred* is that this constraint is why Hyperdrive was adopted rather
than some other motivation. The commit ordering supports it and nothing
contradicts it, but it was not written down at the time.

That distinction matters for reading v0.8 §9.5. The prohibition there is against
**pooling as a performance optimisation absent measured need**, and that
prohibition still stands: nothing about this change is motivated by throughput,
and the editorial team is still one person. The constraint that was met is a
runtime one, and the commit trail is the evidence for it.

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

## Amendment — N1: query caching on this binding (investigated, not changed)

This ADR chose Hyperdrive as the transport and did not consider what Hyperdrive
does to *reads*. It caches them, and this application is the case Cloudflare's
own guidance names as the wrong fit.

### What the configuration does today

`should-i-play-editorial` (`6129a6b8…`) carries `caching: { disabled: false }`
with no explicit ages, so Cloudflare's documented defaults apply: `max_age` 60
seconds and `stale_while_revalidate` 15 seconds. Caching is on by default for
every Hyperdrive configuration; nothing here opted into it.

### What Cloudflare documents

- Hyperdrive parses the wire protocol and caches eligible **non-mutating**
  query responses. Writes are never cached.
- **It does not invalidate cached reads when the application writes.** A
  matching `SELECT` can return the cached result until `max_age` expires, and
  can be served stale for the `stale_while_revalidate` window on top.
- The prescribed fix for reads that must be fresh is a **second Hyperdrive
  configuration created with `--caching-disabled`**, bound alongside the cached
  one, with those reads routed through it. A cache-disabled binding keeps the
  pooling and fast connection setup, which is the whole reason this ADR chose
  Hyperdrive.
- The examples given for that treatment are "authentication, sessions,
  permissions, billing state, **admin settings, and reads immediately after a
  write**".
- Since 2026-02-23, queries containing `VOLATILE` or `STABLE` functions
  (`NOW()`, `CURRENT_TIMESTAMP`, `RANDOM()`) are treated as uncacheable,
  including when those names appear only in comments.

### Why this application is squarely in that category

Every editorial action is a write followed immediately by a read of what was
just written. `revalidatePath` re-renders the page, and the re-render issues
fresh `SELECT`s:

| Action | The read that follows it |
|---|---|
| Request a build | the deployment page lists requests and events |
| Check production | the page reads the new `production_verified` event and artifact |
| Stop waiting for a request | the page reads the settled state |
| Publish | the publish page reads the evaluation's new status |

Two specific consequences, both plausible at first activation:

1. **An editor does not see what they just did**, for up to `max_age` plus the
   stale window. The obvious response to a button that appears to have done
   nothing is to press it again.
2. **The active-request guard reads stale state.** `dispatchDeployment` reads
   the open-request list before claiming; served from cache, it could report
   none open while one is. The advisory lock added in N1 serialises the two
   dispatchers against each other, and cannot help if the read itself is stale.

Nothing in the application currently avoids this. Drizzle emits ordinary
parameterised `SELECT`s with no volatile or stable function in their text, which
is precisely the shape Hyperdrive caches.

### What N1 did about it: nothing, deliberately

No Cloudflare configuration was changed by this branch, and no application-level
cache-busting was added — a hand-rolled cache-buster (a volatile function
smuggled into every admin query, a random comment) would be an undocumented
dependency on a parser Cloudflare explicitly says is not a cache-control API.

The recommended correction, if activation confirms the behaviour, is the
documented one: create a second Hyperdrive configuration with
`--caching-disabled` over the same database, bind it as (for example)
`HYPERDRIVE_FRESH`, and have `lib/admin/db.ts` prefer it. That is an external
configuration change plus a small binding change, and it belongs to whoever
performs remote-admin activation.

> **Do not act on that paragraph.** It records what N1 recommended, and the
> amendment below took a different route: caching was disabled on the existing
> configuration instead, so there is no second configuration and no
> `HYPERDRIVE_FRESH` binding to create. Kept as the record of the reasoning, not
> as an instruction.

### Activation test item

**This cannot be proven locally.** Wrangler's local Hyperdrive emulation
connects straight through and performs no caching, so a green `cf:verify` says
nothing either way. It must be observed against the real binding, and it is
listed with the other activation checks in the README:

> After activating remote `/admin`, write something and immediately reload the
> page that reads it. If the write is not visible, check Hyperdrive metrics by
> `cacheStatus` for `hit` on the admin reads, and apply the cache-disabled
> configuration above.

**Superseded by the amendment below.** The correction was applied before first
dispatch rather than after observing a failure, so the check above is now a
confirmation rather than a decision point.

## Amendment — activation prep: caching is disabled on this configuration

Applied 2026-08-22, before any deployment request had ever been made.

`should-i-play-editorial` (`6129a6b8…`) now carries `caching: { disabled: true }`.
Same configuration, same id, same origin, same `HYPERDRIVE` binding, same
`origin_connection_limit` of 20. Nothing in this repository changed to achieve
it and nothing needed to: the binding resolves a configuration by id, and it is
the configuration that was corrected.

### Why in place, rather than a second configuration

The amendment above proposed a second `--caching-disabled` configuration bound
as `HYPERDRIVE_FRESH`, because that is the shape Cloudflare's documentation
leads with — it is written for applications that have *both* kinds of read and
must route between them. This application does not. The binding serves `/admin`
and nothing else: every read behind it is an editor's read of editorial state,
and every one of them is a read that must be fresh. Cloudflare names that case
too — "disable query caching everywhere only when most reads must be fresh" —
and for a transport whose entire traffic is admin traffic, *most* is *all*.

So the second configuration would have been two pools against one database, a
binding to select between, a code path to choose it, and an obsolete
configuration to remember to delete. The simpler permanent state is one
configuration that does not cache, and it is what a reader of `wrangler.jsonc`
will find when they look the binding up.

Caching remains off for the public path by construction rather than by
configuration: the public site never reaches Hyperdrive at all (ADR 0017).

### What this does and does not buy

It removes the transport's ability to answer a read from a stale cache, which
was the one thing that could defeat the active-request guard in
`dispatchDeployment` — the advisory transaction lock serialises two dispatchers
against each other, and can do nothing about a read that never reached the
origin.

It does **not** make `settleDeploymentRequest` newly safe, and that is worth
saying because the two look alike. Settlement's guard is a compare-and-set
predicate on the `UPDATE` itself, evaluated by Postgres against the real row, so
a stale read could never have caused it to overwrite a resolved request. Fresh
reads make the operator's *screen* honest; the CAS makes the *write* honest, and
those are different guarantees held in different places.

### What is left to observe at activation

That caching is disabled is settled — it is a property of the configuration and
is readable from the Cloudflare API. What still needs one look on first use is
that the deployed Worker is exercising this configuration as expected: after
activating remote `/admin`, write something, reload the page that reads it, and
confirm Hyperdrive metrics report `cacheStatus` `disabled` for the admin reads
rather than `hit` or `miss`. There is nothing to observe before then, because no
admin request has ever reached this binding.
