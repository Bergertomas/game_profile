# ADR 0023 — The production verifier self-fetches its own Custom Domain, and that requires `global_fetch_strictly_public`

**Status:** Accepted · 2026-08-24
**Context:** Activation. Corrects the first real production verification, which
failed. Implements the mechanism [ADR 0022](0022-deployment-requests-and-proof-of-live.md)
decided, on the hosting decided by [ADR 0008](0008-cloudflare-hosting.md), and
does not amend either.

## Problem

ADR 0022 made **Live** a fact about the artifact production is serving, provable
only by fetching `/deployment-manifest` from the canonical production origin and
revalidating it. That decision stands. What it did not account for is *where the
fetch runs from*.

The editorial tool is a Server Action inside the same deployed Worker. So when an
editor presses **Check production now**, the production Worker issues:

```
fetch("https://shouldiplay.gg/deployment-manifest")
```

— a request to its own hostname. `wrangler.jsonc` attaches this Worker to
`shouldiplay.gg` as a **Custom Domain**, which makes the Worker itself the origin
for that hostname.

Cloudflare's default global-fetch behaviour (`global_fetch_private_origin`)
routes a same-zone subrequest *"to the zone's origin server, ignoring any Workers
mapped to the URL"*. On a Custom Domain there is no other origin — the Worker was
it — so the request is aimed at nothing and Cloudflare answers **522**.
Cloudflare's Error 522 guidance names this exact case:

> If you are using Workers with a Custom Domain, performing a `fetch` to its own
> hostname will cause a `522` error. Consider using a Route, targeting another
> hostname, or enabling the `global_fetch_strictly_public` compatibility flag
> instead.

This is what happened on the first authenticated check, on
2026-08-23T15:40:12.228Z. It produced exactly one truthful
`production_unverifiable` event recording `http-error` and status 522, created no
request, no artifact, no membership and no Live claim, and left all three
Published profiles NOT PROVEN. **The machine failed correctly.** Production
itself was healthy throughout: the same URL answered 200 with the expected
manifest to any anonymous client, and the Worker was demonstrably alive in that
very request — it served `/admin/deployments` behind Access and wrote the audit
row through Hyperdrive in the same invocation.

Nothing in the repository anticipated this. `tests/deploy/verify.test.ts` injects
a fake transport, and `scripts/cf-verify.mjs` drives the Worker from a Node
process *outside* it at `http://127.0.0.1:$PORT`. Neither harness can express
"the Worker fetches its own Custom Domain", so both passed.

## Decision

### 1. Add `global_fetch_strictly_public`, and treat it as load-bearing

It is listed in `wrangler.jsonc`'s `compatibility_flags` with the reasoning
inline. The flag has **no "default as of" date** — no `compatibility_date`
enables it — so it must be named explicitly or the behaviour does not exist.

With it, global `fetch` routes *"as if the requests were made on the public
Internet"*: the verifier's request leaves for Cloudflare's front door and comes
back in through the same path a reader takes.

### 2. The flag preserves the proof invariant; it does not weaken it

This is the part worth stating plainly, because a compatibility flag looks like a
detail and this one is a correctness property.

The invariant is that **Live is based on what canonical production actually
serves, not on what the database or the current Worker process thinks it should
serve.** The flag *removes* the origin-bypass shortcut, leaving the publicly
served bytes as the only thing the verifier can observe. The proof gets stronger,
not weaker: after this change there is no routing path by which the check could
be answered from anything other than deployed production.

The loop terminates at depth one. The re-entered request is
`/deployment-manifest`, a `force-static` route served from the deployed assets by
`staticAssetsIncrementalCache`, which makes no further subrequest. The cost is one
nested Worker invocation per verification.

### 3. The alternatives were rejected, and why matters

| Option | Rejected because |
|---|---|
| Self service-binding (`WORKER_SELF_REFERENCE`) | Invokes this Worker directly, bypassing the edge. It observes what *this process* would serve — desired state wearing a proof's clothing. It is the exact substitution ADR 0022 exists to forbid. `wrangler.jsonc` already declines it for separate reasons. |
| A second hostname or Route (`verify.shouldiplay.gg`) | Works, but proves what a *different* hostname serves. Weaker evidence, plus a domain and a certificate to keep correct. Held as a fallback only if the flag proves unusable. |
| Read Neon, or reuse an in-process manifest object | Destroys the invariant outright. This is the tempting wrong answer ADR 0022 named, and it is still wrong when the excuse is a 522. |

### 4. A refusal now keeps enough to be actionable

The first event recorded status 522 but discarded `cf-ray`, the one value that
correlates a refusal with Cloudflare's own logs for that request. Verification now
carries a **fixed allow-list** — status, `cf-ray`, content type — into the
existing `jsonb` event detail. No migration: the column already accepts it.

The allow-list is closed by construction rather than by review. Response bodies,
cookies and authorization headers cannot be captured here, because only three
named fields are ever read. Adding a fourth means deciding again.

### 5. "Done." is not a report

`checkDeploymentAction` discarded `verifyProduction`'s result, and the generic
action button renders "Done." for anything that did not throw. So the failed check
told the editor "Done."

Nothing lied — the audit trail and the proof panel both said Unverified — but
"Done." is the only immediate feedback at the point of action. The action now
returns the outcome it had already computed: a concise confirmation naming the
verified artifact, or the refusal and its reason. An unverifiable result is still
**not an exception**; it returns `ok: false`, following the precedent
`requestDeploymentAction` already sets for a refusal that is not a fault. No
deployment state and no proof semantics change.

## Consequences

**This cannot be proven from this repository.** No test here can exercise a real
Custom-Domain self-fetch: `workerd` under `wrangler dev` has no Cloudflare edge in
front of it, so a local run cannot reproduce either the 522 or its absence. The
tests added with this ADR assert what they can honestly assert — that the flag is
present in the Worker's configuration, that the manifest contract is unchanged,
and that an unverifiable result no longer renders as generic success. **The flag's
actual effect is externally asserted, and the first evidence of it will be the
next real Check.**

The flag is global to the Worker, so its blast radius was audited. Every global
`fetch` in the deployed bundle was enumerated: the Access JWKS read
(`lib/admin/access.ts`, to `*.cloudflareaccess.com`) and the Workers Builds API
(`lib/deploy/cloudflare.ts`, to `api.cloudflare.com`) both target hostnames
outside this zone and are unaffected — the flag changes same-zone routing only.
Hyperdrive is a binding, not global `fetch`, and is untouched. The verifier is the
only same-zone fetch in the system, and it is the intended one.

Compatibility flags are Worker *configuration*, not code, so this takes effect
only when the Worker's configuration is next uploaded. `wrangler.jsonc` is the
source of truth and `wrangler deploy` reconciles remote configuration against it,
so a dashboard-only edit would drift and be reverted. Note the ordering: the fix
ships through the normal `main` deployment path, **not** through the tool it
fixes — which currently cannot request a build at all, since no Builds credential
exists.

The failed event stays. It is the correct record of a real refusal, the
`deployment_events` trigger refuses UPDATE and DELETE, and a proof system that
edits its own history to look better has stopped being one.
