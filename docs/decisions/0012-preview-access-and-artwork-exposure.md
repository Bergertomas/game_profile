# ADR 0012 — `noindex` is not access control

**Status:** Accepted · 2026-08-09
**Context:** [ADR 0010](0010-design-surfaces-and-site-environment.md) made
Cloudflare branch previews the review surface. [ADR 0011](0011-production-artwork.md)
lets evaluation-clearance artwork render there and nowhere else.

## The problem

A preview is treated as private because it is `noindex`, `Disallow: /` and
unlisted in the sitemap. None of that is access control:

| control | what it actually does |
|---|---|
| `noindex` | asks well-behaved crawlers not to *list* the page |
| `Disallow: /` | asks well-behaved crawlers not to *fetch* the page |
| Cloudflare Access | stops an unauthenticated request |

Only the third is a control. The first two are requests, addressed to the
subset of clients that honour them, and neither stops anyone holding the URL.
A preview rendering uncleared third-party key art is therefore a **public
display** until Access is enabled, however unlisted it is.

The exposure is bounded and worth stating precisely, because overstating it is
its own error: this repository stores and serves **no copy** of any artwork.
Every image is fetched by the viewer's browser directly from the rights
holder's own server, from the URL that server publishes. That is materially
weaker than redistribution. It is still a public display.

## The decision

**Cloudflare Access on preview URLs is a required control, not a nicety** —
and it cannot be enabled from this repository.

Access for preview URLs is an account-level Zero Trust policy. It has no
representation in `wrangler.jsonc`, no Wrangler flag, and no build-time
equivalent; enabling it in code is not available at any price. Pretending
otherwise, or leaving a checklist item nobody re-reads, are the two ways this
gets quietly forgotten.

So the repository does the part it can actually do: **it asks, out loud, on
every preview deploy.** `scripts/check-preview-access.mjs` makes one
unauthenticated request to the preview URL Cloudflare just printed and reports
what came back. An Access-protected host redirects to the account's
`*.cloudflareaccess.com` login; an unprotected one serves the page.

```
PASS:    Preview URL is behind Cloudflare Access.
WARNING: Preview URL answers an unauthenticated request. …
```

### Why it warns rather than fails

Failing the deploy on an unprotected preview would remove the review surface
previews exist to provide, and ADR 0010 exists because that surface was
previously missing. Trading a working capability for a warning is the wrong
direction. The check is loud, it is on the deploy path, and it cannot be
satisfied by assumption — that is the whole of what an advisory check owes.

`tests/preview-access.test.ts` covers the classification, including the case
that would be wrong silently: an ordinary canonical or trailing-slash redirect
must not be read as a login wall.

## The runbook item

One click, once, account-wide. It creates a single reusable **"Cloudflare
Workers Preview URLs"** policy covering every preview URL in the account, so it
does not have to be repeated per branch or per Worker.

1. Cloudflare dashboard → **Workers & Pages**
2. Select **should-i-play**
3. **Settings → Domains & Routes**
4. Next to **Preview URLs**, click **Enable Cloudflare Access**
5. **Manage Cloudflare Access** → authorise the reviewing email addresses

Until that is done, treat preview links as shareable-but-public: use them, do
not post them anywhere durable.

JWT validation in the Worker (`Cf-Access-Jwt-Assertion`) is the belt-and-braces
step Cloudflare recommends for applications that must not be reachable by
origin address. It is not adopted here: this site's production content is
public by design, the preview's only sensitive payload is third-party artwork
served from its owner's CDN, and adding request-time auth to a fully
prerendered Worker would cost more than the exposure warrants. Revisit if a
preview ever carries unpublished editorial.

## Consequences

- `cf:deploy-preview` reports the Access state of every preview it uploads.
- The state is a fact about the account, so the check reports rather than
  asserts — it is the one guarantee in this project that the repository cannot
  own end to end, and it says so instead of implying otherwise.
- Production is untouched. It carries no evaluation-clearance artwork in any
  form, and `check:containment` proves that against the built artefact.
