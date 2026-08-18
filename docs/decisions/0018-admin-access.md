# ADR 0018 — Cloudflare Access is the editorial identity, and the admin ships switched off

**Status:** Accepted · 2026-08-13
**Context:** Phase 2B. Answers Master Plan §8.2 (minimal admin access) and
§17.2 (open decision: minimal admin authentication). Supersedes the deferral in
[ADR 0012](0012-preview-access-and-artwork-exposure.md) on Worker-side JWT
verification.

## Decision

**Cloudflare Access authenticates editors. The Worker verifies the assertion it
forwards. Neither is enough alone, and a deployment missing either has no
editorial tool at all.**

```
Cloudflare Access          stops an unauthenticated request at the edge
requireEditor()            in the admin layout — UX and defence in depth
requireEditor()            in every read entrypoint, before a connection opens
requireEditor()            in every Server Action, before anything is written
```

No password store, no session table, no reset flow, no user table. §8.2 says
"do not build a custom identity platform"; the cheapest way to comply is to not
build one. Access gives one-time-PIN-to-an-allow-listed-email or Google/GitHub
for a team of one to five, and its free tier covers far more editors than this
product will have.

## Why the Worker verifies, when Access already refused

"Access is in front of this route" is a fact about an account-level Zero Trust
policy, not about this repository. A policy can be scoped to the wrong hostname,
removed during unrelated Zero Trust work, or never created. In each case the
Worker still answers, and without verification it answers with the editorial
tool.

ADR 0012 considered exactly this and declined it, on the grounds that production
content is public by design and request-time auth on a prerendered Worker costs
more than the exposure warrants. It named its own revisit condition: *"Revisit
if a preview ever carries unpublished editorial."* The admin is unpublished
editorial. The condition has fired.

Verification is `crypto.subtle.verify` plus base64url — WebCrypto exists in Node
and workerd, so a JWT library would add a dependency and a supply-chain surface
to avoid forty lines. It is strict about the things that make JWT verification
worthless when they are lax: RS256 only (never the token's own `alg`, which is
how `none` and HMAC forgeries work), issuer and audience matched exactly,
expiry and not-before enforced, and an unreachable JWKS is a refusal rather than
a pass.

## The guard sits next to the data, because a proxy cannot deploy

The obvious design was a `proxy.ts` route gate. **It cannot run on this stack.**
Next 16 renamed middleware to Proxy and pins it to the Node.js runtime — the
`runtime` segment option is explicitly unavailable in a proxy file — and
`@opennextjs/cloudflare` rejects it:

```
ERROR Node.js middleware is not currently supported.
      Consider switching to Edge Middleware.
```

The gate was written, and it passed `next build`, the unit suite, the browser
suite and `next start`. It failed only at `cf:verify`, which is the one gate
that asks the real runtime — the same class of failure as `dynamicParams = false`
in ADR 0017, and the second time that script has earned its keep.

So authorisation lives where it has to anyway: **next to the data**.

- Every Server Action calls `requireEditor()` before it does anything. Next's
  proxy documentation states that Server Functions are POSTs to the route that
  uses them, that a matcher excluding a path also skips Server Function calls on
  it, and that *"a matcher change or a refactor that moves a Server Function to
  a different route can silently remove Proxy coverage."* A guard that travels
  with the mutation cannot be refactored away from it.
- Every exported **read** entrypoint authorises before it opens a connection.
  The admin layout still guards, but only as UX and defence in depth: Next's
  authentication guidance warns that layouts do not re-render on every
  navigation under Partial Rendering and that a segment may be entered by more
  than one path, so a layout check is a thing that usually runs rather than one
  that always runs. The editorial reader deliberately sees drafts, review rows,
  superseded history and artwork of every clearance — precisely the data that
  must not depend on a parent segment having rendered.

`withAuthorizedAdminDatabase` is the boundary; the unauthorised
`withAdminDatabase` remains for tests and internal composition and is not
reachable from a route. The verified identity is memoised with React `cache()`,
which is request-scoped — one Access verification per render however many
guarded reads a page performs, and no auth state anywhere that outlives a
request.

`noindex`, `no-store` and `same-origin` referrer headers moved to
`next.config.ts`, where they are static routing metadata needing no runtime.

## Shipping switched off

Two variables, and **both** are absent in the deployed default:

| Variable | Meaning |
|---|---|
| `CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD` | who may sign in |
| `ADMIN_DATABASE_URL` | what there is to edit |

Missing either, every `/admin` path answers **404** — not 503, and not a login
page. A deployment that says "the admin is here but switched off" has told an
unauthenticated prober where to come back to. `cf:verify` asserts the 404
against the real deployed artefact.

So merging Phase 2B changes nothing about the deployed Worker. Turning the tool
on is a deliberate act with a name.

### `ADMIN_DATABASE_URL` is deliberately not `DATABASE_URL`

`DATABASE_URL` is the public read path's **build** variable (ADR 0017): Workers
Builds sets it, the build renders the public corpus with it, and the deployed
Worker never sees it. Reusing the name would mean that provisioning production
Postgres — a build-variable change, and a step already on the P0 list — also
silently switched on a request-time editorial surface in the Worker.

Master Plan §9.4 rules out a Worker database secret, a Hyperdrive binding and a
request-time connection pool. That contract is about the public path and it is
kept exactly: with `ADMIN_DATABASE_URL` unset, no request-time database access
exists anywhere in the deployment.

**Whether the admin is ever deployed at all is an open decision, and it is not
taken here.** Running it locally against production Postgres is a sufficient
editorial surface for a team this size and requires no Worker credential
whatsoever. Deploying it means accepting a request-time database path for
`/admin` only — no pool, no Hyperdrive, one short-lived connection per request,
opened and closed in a `finally`. That is a trade for the product owner, not a
default that creeps in.

> **Amended by [ADR 0021](0021-hyperdrive-is-the-deployed-admin-transport.md),
> 2026-08-18.** The deployed admin path *does* use a Hyperdrive binding, as its
> database transport. A direct `postgres.js` → Neon TLS connection from inside
> the Workers runtime depends on Node TLS options Workers does not implement.
> The rest of this paragraph stands: no Worker-side pool, one short-lived
> connection per request, opened and closed in a `finally`, and local `next dev`
> still connects directly. Every security decision in this ADR is unchanged.

### The local-development identity is local, not merely non-production

`next dev` has no Access in front of it, so `ADMIN_DEV_IDENTITY` names an editor
directly. Two conditions gate it, and the second was added after review caught
the first being insufficient on its own:

- `SITE_ENV !== "production"` — folds to a literal at build time, so the branch
  is unreachable in a production bundle rather than merely false at runtime;
- `NODE_ENV === "development"` — true under `next dev` and false in every
  `next build` artefact, including one built on a laptop.

**`SITE_ENV` alone was wrong, and not theoretically.** A Cloudflare branch
preview is a non-production site environment *and* a production-compiled build
on a publicly reachable hostname. A preview configured with `ADMIN_DEV_IDENTITY`
and `ADMIN_DATABASE_URL` but no Access application would have authenticated
every request as that named editor while authenticating the requester not at
all — the editorial tool, open, on a URL that is deliberately shared for review.

A remote deployment requires Cloudflare Access whether or not it is the
production one. `tests/admin/auth.test.ts` pins that directly, and it was also
confirmed against a real production-compiled preview build serving `/admin` as
404 with both variables set.

Where Access **is** configured, it is the only authority. A missing or invalid
assertion refuses rather than falling through to a development identity that
happens to also be set — otherwise a misconfigured `aud` would quietly open the
tool to anyone.

## What the tool teaches, beyond collecting fields

Two rules exist in Postgres and would otherwise reach an editor as a constraint
violation after a form was filled in:

- **A sibling scope cannot publish before the primary, per rubric version**
  (ADR 0016). The interface states which scope, which rubric, and what would
  break — computed from the same state the trigger checks, so the explanation
  and the constraint cannot disagree.
- **Production-cleared artwork must carry a credit and a source page.** An asset
  that may appear publicly is a rights position, so it has to be auditable
  (ADR 0011). Surfaced as two required fields with a reason rather than as
  `game_artwork_production_is_attributable`.

Moving primacy is a separate action from editing a scope, with its own
confirmation naming both URLs. Combining them into one "save" is precisely how
reordering a listing silently moves a canonical URL.

### Identity is frozen once it is public

Master Plan §8.3 requires the editor to "treat a scope-key rename as
migration-level identity work". A warning beside an ordinary Save button does
not do that — it makes breaking a canonical sibling URL one careless click,
sitting between relabelling and reordering. So:

- **A scope key is fixed once the scope has any evaluation**, published or not.
  A draft is what an editor is about to publish, and renaming underneath it is
  the same mistake arriving a day earlier. Before that the scope has never
  addressed anything and a typo is free to fix.
- **A game slug is fixed once the game publishes a profile.** Before
  publication it is a working title; after, `/games/<slug>` has been crawled,
  linked and shared, and nothing here would redirect it.

Both are enforced in the write layer, not only hidden in the form — a hidden
field can be forged, and the interface is a courtesy rather than a control. A
genuine rename after publication needs a redirect and a decision about history,
and belongs to whoever builds that.

## Consequences

- Merging 2B does not expose an editorial surface. Two variables and one Zero
  Trust policy do, and all three are the product owner's to set.
- `lib/admin/*` is a second data-access boundary, separate from the public one
  by design: the editorial reader sees drafts, review rows, superseded history
  and artwork of every clearance. A public reader that *could* be asked for
  draft rows is one refactor away from publishing one.
- The public chrome moved into an `app/(public)` route group. An editorial tool
  framed by the site header and a reader-facing footer is a tool wearing a
  shopfront, and the site-wide JSON-LD would have been emitted on pages showing
  unpublished drafts. No public URL changed; the generated share-card URLs
  picked up a different cache-busting hash, which the metadata carries and which
  both `cf:verify` and the browser suite now follow rather than hard-code.
- Phase 2C inherits the guard, the transaction helper and the error translation.
  Evaluation and score authoring add forms, not a second admin methodology.
