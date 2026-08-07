# ADR 0008 — Hosting on Cloudflare Workers via OpenNext

**Status:** Accepted · 2026-08-07
**Supersedes:** the hosting half of [ADR 0001](0001-stack-and-hosting.md) (Vercel).
Everything else in ADR 0001 — Next.js 16, Drizzle, no chart library, self-hosted
fonts — stands unchanged.
**Context:** Cloudflare is the chosen DNS/CDN layer for `shouldiplay.gg`, and
continuous visual review of branches is now a stated workflow requirement.

## Decision

Deploy the Next.js application to **Cloudflare Workers** using
**`@opennextjs/cloudflare`** (the official Cloudflare adapter for OpenNext),
built and deployed by **Workers Builds** from GitHub.

- Production deploys from **`main` only**.
- Every other branch and pull request uploads a **preview version** with its own
  URL. A preview can never take production traffic.
- Registrar stays Porkbun; Cloudflare is authoritative DNS.

## Why Workers and not Pages

Cloudflare Pages was the historical answer and is no longer the current one:
Cloudflare's own framework guide for Next.js documents Workers +
`@opennextjs/cloudflare`, and Pages' `@cloudflare/next-on-pages` is in
maintenance. Workers gets the platform work — including the Next.js 16 support
we need. Choosing Pages today would mean adopting the deprecated path on day one.

## Why this app is a good fit

Every public route prerenders to a static asset: the home page, `/methodology`,
each `/games/<slug>`, `robots.txt`, `sitemap.xml`, and every Open Graph image.
The Worker exists to route and to serve the not-found path; the pages themselves
come off Cloudflare's edge as files.

That has a real consequence for the OpenNext configuration: `open-next.config.ts`
is intentionally bare, with no R2 incremental cache, because there is nothing to
cache yet. Add it when a route starts using ISR or on-demand revalidation.

The one thing worth watching: `@opennextjs/cloudflare` tracks Next.js releases
with a lag, and its peer range is explicit (`>=16.2.11` for the 16 line at the
time of writing). Next.js upgrades now need the adapter's support checked first
rather than being a routine bump. That is the price of this path and it is a
small one. Verified working end to end at Next 16.3.0 / adapter 1.20.2: the
built Worker was run under `workerd` locally and served every route correctly.

## This requires the Workers Paid plan

Measured, not assumed. The bundled Worker was uploaded to Cloudflare and
rejected:

> Your Worker exceeded the size limit of 1 MiB. Please upgrade to a paid plan to
> deploy Workers up to 10 MiB. `[code: 10027]`

The Next.js server bundle alone is **~917 KB gzipped** before anything of ours is
added, so the free plan's 1 MiB ceiling is not reachable by trimming. Removing
the Open Graph image routes (which pull in `@vercel/og`'s resvg/yoga WASM,
~180 KB gzipped) was tried and still exceeded the limit. Workers Paid is $5/month
and lifts the ceiling to 10 MiB, which this bundle sits comfortably inside.

**The free alternative, and why not:** every page prerenders, so the site could
ship today as a pure static export on Workers Static Assets, free and with no
Worker at all. That is rejected because Phase 2 onwards reads from Postgres and
needs a server — taking the static route now buys a few dollars a month and pays
for it with a migration back at exactly the point the project gets busy.

$5/month is inside "free/very-low-cost at our current scale". Should that change,
static export is the fallback and it is a config change rather than a rewrite.

## Environment separation

Every page is prerendered, so the environment must be resolved at **build** time,
not request time. `lib/site.ts` does this once:

1. `NEXT_PUBLIC_SITE_ENV` if explicitly set, else
2. `WORKERS_CI_BRANCH` (injected by Workers Builds) compared against `main`, else
3. `preview`.

Failing closed matters. Getting this wrong in the indexable direction puts
`*.workers.dev` hostnames into Google's index and takes months to unwind;
getting it wrong in the other direction is a one-line fix noticed on the first
`robots.txt` check after deploy. That check is step 1 of the post-deployment
runbook in `docs/Should_I_Play_Brand_and_SEO_Foundation_v0.2.md` §7.

There are no secrets in the application yet — the site reads typed fixtures, not
Postgres. When `DATABASE_URL` arrives it goes in the Worker's production
environment as a secret and is not exposed to preview versions. Deliberately not
built ahead of that need.

## Preview URLs

`preview_urls` is on. Workers Builds uploads a version for every non-production
branch, and `scripts/cf-preview-deploy.mjs` attaches a `--preview-alias` derived
from the branch name, so each branch keeps one stable, readable review URL that
follows its newest commit rather than minting a new hostname per push.

`workers_dev` is currently on so there is a working URL before `shouldiplay.gg`
is attached. Turn it off once the custom domain is live: a production build
answering on `<worker>.workers.dev` is a second host serving canonical content,
and there is no reason to leave it addressable.

## Worker identity is `should-i-play`, in three places

The first Git-integration deploy failed with:

> Service binding `WORKER_SELF_REFERENCE` references Worker `game-profile` which
> was not found.

`WORKER_SELF_REFERENCE` is the self-reference `@opennextjs/cloudflare` uses for
on-demand revalidation and its cache queue. Nothing in the app needs it yet —
every route is prerendered — but Cloudflare's framework auto-detection adds it
when connecting a repository, and with no `name` it could agree with, it took the
one thing it could find: the `package.json` name, which was `game-profile`. No
such Worker exists, and none should be created; the only Cloudflare application
for this repository is **`should-i-play`**.

The fix makes the repository authoritative rather than leaving anything to
inference. The name now appears in exactly two places and they must agree:

| Where | Why it matters |
|---|---|
| `wrangler.jsonc` → `name` | the Worker actually deployed to |
| `package.json` → `name` | the fallback auto-detection reads when it finds no config |

**The binding itself is not declared, deliberately.** The obvious fix — keep the
binding and point it at `should-i-play` — trades a wrong name for a
chicken-and-egg: a service binding must name a Worker that already has a script
uploaded, so a *self*-reference cannot resolve on a Worker's first successful
deploy. Nothing in this app uses the binding anyway (no ISR, no on-demand
revalidation, every route prerendered), and an uploaded configuration replaces
the Worker's bindings — so not declaring it is what clears the stale one.

Add it back, pointing at `should-i-play`, when a route first needs ISR. By then
the Worker will have deployed and the reference will resolve.

A complete `wrangler.jsonc` is also the thing that stops Cloudflare
auto-generating a configuration of its own: a local `wrangler deploy --dry-run`
with this file present reports only the `ASSETS` binding and leaves the file
untouched.

`.node-version` pins Node 22 for the build container. Next.js 16 needs Node ≥ 20,
and a default that drifts below that fails in a way that looks nothing like a
version problem.

## Repository-side configuration

| File | Role |
|---|---|
| `wrangler.jsonc` | Worker name, `nodejs_compat`, assets and self-reference bindings, preview settings |
| `open-next.config.ts` | Adapter config (bare; see above) |
| `scripts/cf-deploy.mjs` | Production deploy, refusing any branch but `main` |
| `scripts/cf-preview-deploy.mjs` | Branch-aliased preview upload for Workers Builds |
| `package.json` → `cf:*` | `cf:build`, `cf:preview`, `cf:deploy`, `cf:deploy-preview` |

The branch check in `cf:deploy` duplicates the dashboard's production-branch
setting on purpose. Promoting an experiment to `shouldiplay.gg` is one
mis-set dropdown away and the failure is public, so the rule is also written
somewhere it gets code-reviewed.

Workers Builds settings (dashboard, one-time):

| Setting | Value |
|---|---|
| Build command | `npm run cf:build` |
| Deploy command | `npm run cf:deploy` |
| Non-production branch deploy command | `npm run cf:deploy-preview` |
| Production branch | `main` |

## Consequences

- `npm run cf:preview` runs the real Worker locally under `workerd`. It is the
  honest pre-deploy check and catches things `next build` cannot.
- A local `npm run build` is a *preview* build (`noindex`). To reproduce the
  production artefact, set `NEXT_PUBLIC_SITE_ENV=production`.
- `.open-next/` and `.wrangler/` are build output and are gitignored.
- Rollback is Cloudflare's version history: previous versions stay addressable,
  and a deployment can be pointed back at one without rebuilding.
