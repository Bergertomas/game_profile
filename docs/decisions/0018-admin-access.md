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
requireEditor()            verifies the signed assertion in the admin layout
requireEditor()            …and again inside every Server Action
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

## The gate is the layout, because a proxy cannot deploy

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

So authorisation lives where it has to anyway: in the admin layout, and inside
every Server Action. The per-action guard is not belt-and-braces. Next's own
proxy documentation states that Server Functions are POSTs to the route that
uses them, that a matcher excluding a path also skips Server Function calls on
it, and that *"a matcher change or a refactor that moves a Server Function to a
different route can silently remove Proxy coverage."* A guard that travels with
the mutation cannot be refactored away from it.

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

### The local-development identity

`next dev` has no Access in front of it, so `ADMIN_DEV_IDENTITY` names an editor
directly. The guard is the build environment rather than the variable:
`SITE_ENV` folds to a literal at build time, so in a production bundle the
branch is unreachable and no value of that variable can conjure an
unauthenticated editor.

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
