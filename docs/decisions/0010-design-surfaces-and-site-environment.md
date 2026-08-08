# ADR 0010 — Design surfaces are gated by site environment, not `NODE_ENV`

**Status:** Accepted · 2026-08-07
**Context:** [ADR 0008](0008-cloudflare-hosting.md) established branch previews.
Continuous visual review through a live browser is a stated requirement of this
project, and the design lab had made itself invisible everywhere except a laptop.

## The problem

`/design-lab/*`, `/dev/*` and the evaluation artwork were all gated on:

```ts
if (process.env.NODE_ENV === "production") notFound();
```

`NODE_ENV` describes **how the JavaScript was compiled**. A Cloudflare branch
preview is compiled exactly like production — that is the point of previewing a
production-quality artefact — so the gate could not tell a preview apart from the
public site:

| | design lab | reviewable in a browser |
|---|---|---|
| local `next dev` | available | only on the machine running it |
| Cloudflare branch preview | **404** | **no** |
| production | 404 | no |

So the one surface built to let design work be reviewed remotely was the one
place it could never be seen. Every D2/D3 review had to happen through
screenshots pasted into a conversation, which is precisely the workflow this
project set out to stop relying on.

## The decision

Gate design surfaces on the **site** environment, which already exists and
already means the right thing:

```ts
export const DESIGN_SURFACES_ENABLED = SITE_ENV !== "production";
```

No new environment variable, no parallel flag. `SITE_ENV` is resolved once at
build time by `next.config.ts` and pinned into the bundle (ADR 0008), so this
folds to a literal exactly as the old expression did.

| | design lab | artwork | indexable | canonical |
|---|---|---|---|---|
| local dev | yes | yes | no | production |
| Cloudflare branch preview | **yes** | **yes** | no | production |
| `main` production | 404 | none emitted | yes | production |

`NODE_ENV` still decides how the code is compiled. It no longer decides who the
site is for.

## What did not change

Every guarantee ADR 0008 established still holds, and each is asserted against a
running Worker rather than against source:

- a preview serves `Disallow: /` with no sitemap line, and `noindex, nofollow`
  on every page — including the lab, which additionally declares `noindex` in
  its own layout metadata regardless of environment;
- canonical URLs on a preview still point at `https://shouldiplay.gg/...`, so a
  preview host can never claim a production URL;
- design-lab paths never enter `sitemap.xml`, in any environment;
- production still 404s every design surface;
- a branch build still cannot promote itself to production.

`npm run cf:verify` gained a `--preview` mode that asserts the preview half of
that table, and `cf:deploy-preview` now runs it before uploading — the same
contract production already had: build the artefact, boot it, check what it
actually serves, upload that exact tree.

## The containment check earned its keep again

Moving the artwork guard from an inline `process.env` comparison to an imported
constant broke containment, and `npm run check:containment` caught it: all three
key-art URLs appeared in a production client chunk.

Next substitutes `process.env.NEXT_PUBLIC_SITE_ENV` textually **within a
module**. An imported boolean is not a literal at the point the bundler decides
whether the artwork table is reachable, so the table survived. `evaluation-art.ts`
therefore duplicates the expression as a literal member expression, with a
comment saying why, and a unit test asserts the duplicate agrees with the shared
constant in both directions.

This is the second time that check has caught this exact class of leak. It stays.

The check itself is now environment-aware, because the two builds have genuinely
different obligations:

- **production** — the artwork may appear nowhere in deployable output;
- **preview** — JavaScript chunks may carry it, because the lab is the point,
  but no *public document* may reference it: the home page, `/methodology`, any
  `/games/<slug>`, the sitemap and `robots.txt` are the same documents
  production serves.

Which rule applies is read back out of the artefact (the prerendered
`robots.txt` body), not from the ambient environment, because `cf:deploy` builds
production inside `cf-verify` and then runs the check from a shell that knows
nothing about it. An *explicit* `NEXT_PUBLIC_SITE_ENV` that disagrees with the
artefact is refused outright.

## Artwork rights: what a preview actually is

The evaluation key art is **not licensed and not cleared**. Three states, and
they are not the same:

| | |
|---|---|
| public production | artwork must never appear. Unchanged. |
| private/internal review | a laptop, or an Access-protected preview |
| **publicly-addressable, unindexed preview** | **what a bare preview URL is** |

**A preview URL is public unless it is protected. `noindex` is not access
control.** It asks well-behaved crawlers not to list the page; it stops nobody
who has the URL.

The exposure is bounded and worth stating precisely: the repository stores and
serves **no copy** of any artwork. Each image is fetched by the viewer's browser
directly from the rights holder's own server, from the URL that server publishes.
That is materially weaker than redistribution — but it is still a public display,
so a preview carrying artwork should be Access-protected.

Cloudflare supports this directly, and it is one click: **Workers & Pages →
`should-i-play` → Settings → Domains & Routes → Preview URLs → Enable Cloudflare
Access**, then authorise the reviewing email addresses. It creates a single
account-level "Cloudflare Workers Preview URLs" policy that covers every preview
URL, so it is done once rather than per branch.

Until that is enabled, treat preview URLs as shareable-but-public and do not post
them anywhere durable.

## Consequences

- The e2e suite builds and serves a **preview** artefact, so it asserts the
  preview half of the table. The production half lives in `cf:verify`, where the
  witness is the real Worker — the only witness that has ever caught a
  regression in it.
- A local `npm run build` is a preview build, so the lab is reachable at
  `localhost:3000/design-lab` after `next start`, not only under `next dev`.
- Production artwork is a separate decision from the D3 layout, and is not
  unblocked by any of this. See ADR 0011.
