# D3 evaluation artwork — source and rights status

> **NO ARTWORK IS COMMITTED TO THIS REPOSITORY.** This file records URLs and
> rights, not images. The design lab loads each asset live from the rights
> holder's own site or storefront listing, in development only. Nothing under
> `public/` and nothing in git history contains a copy of any of these works.

## Why it is done this way

An earlier attempt stored a downscaled copy under `public/design-lab/`. That was
wrong: `public/` is served as a static asset in production regardless of route
guards, so a 404 on `/design-lab/*` isolated the *route* and not the *file*.
Committed screenshots on a public branch leaked the same artwork a second way.
Both mistakes are structural — deleting the files later would not have removed
them from branch history — so that branch was abandoned rather than patched.

The rule now: **the repository stores an address and a rights record, never the
work.**

## Assets

| | Alan Wake 2 | Returnal | Redfall |
|---|---|---|---|
| **Rights holder** | Remedy Entertainment Plc / Epic Games Publishing | Housemarque / Sony Interactive Entertainment | Arkane Austin / Bethesda Softworks |
| **URL** | `https://www.alanwake.com/wp-content/uploads/2023/05/Alan_Wake_2_keyart_for_web3-2560x1318.webp` | `https://cdn.akamai.steamstatic.com/steam/apps/1649240/library_hero.jpg` | `https://cdn.akamai.steamstatic.com/steam/apps/1294810/library_hero.jpg` |
| **Source page** | `https://alanwake.com` | `https://store.steampowered.com/app/1649240/Returnal/` | `https://store.steampowered.com/app/1294810/Redfall/` |
| **Source type** | The official game site, operated by the rights holder | Publisher-supplied hero art on the publisher's own storefront listing | Publisher-supplied hero art on the publisher's own storefront listing |
| **Intrinsic size** | 2560 × 1318 WebP | 1920 × 620 JPEG | 1920 × 620 JPEG |
| **Retrieved** | 7 August 2026 | 7 August 2026 | 7 August 2026 |
| **Carries a game logo** | No | No | No |
| **Modifications** | None. Hard-cropped in CSS by `object-fit: cover` and an `object-position` per image. No filter, blur, recolour, desaturation or composite. | as left | as left |

All three are logo-free by choice: D3 sets the game's name in its own display
type, and a baked-in wordmark would compete with it.

## Rights status

**Evaluation only.** Publicly published promotional art, referenced by URL for
internal art-direction review. **Not licensed. Not cleared. Not redistributed.**
No permission has been requested from any rights holder.

## Containment

Four independent guards, all verifiable:

1. **No binary in the repo.** `git ls-files` returns no image asset for any of
   the three games, on any commit of this branch.
2. **No screenshot in the repo.** D3 review frames are delivered through the
   conversation. `docs/design/d3/` holds text only.
3. **Route guard.** `app/design-lab/layout.tsx` calls `notFound()` when
   `NODE_ENV === "production"`, so every `/design-lab/*` route returns 404.
   `tests/e2e/profile.spec.ts` asserts this against a real production build,
   including `/design-lab/d3` and all three `/design-lab/d3/[slug]` routes.
4. **Data guard.** `evaluationArtFor()` in `lib/design-lab/evaluation-art.ts`
   returns `null` when `NODE_ENV === "production"`, so a production build emits
   no `<img>` and no third-party URL even if a route guard were removed.

There is deliberately **no `images.remotePatterns` entry in `next.config.ts`, no
image proxy and no `next/image` use** for these assets. A remote-image
configuration would be production configuration that outlives the lab, which is
the class of leak this file exists to prevent. The stage uses a plain `<img>`
with a one-line eslint exemption explaining why.

Verified on the production build: the artwork URLs appear in **no** client
bundle (`.next/static`), **no** prerendered HTML or RSC payload, and **no**
non-sourcemap server chunk.

## Before any production use

D3's identity depends on real key art. If it is approved, one of the following
must happen **before** artwork appears on a public route:

- a written licence or press/editorial-use permission from each rights holder
  covering the intended use;
- replacement with artwork the product holds rights to; or
- shipping without game imagery.

Publisher press contacts, for the record — none has been contacted:

- Remedy Entertainment — `press@remedygames.com`,
  `https://www.remedygames.com/media-and-influencers`
- Housemarque / Sony Interactive Entertainment — via PlayStation press
- Bethesda Softworks / Arkane — via Bethesda press

## Removal

Deleting `lib/design-lab/evaluation-art.ts` removes every reference. Because no
binary was ever committed, no history rewrite is needed — which is the whole
point of holding addresses rather than files.
