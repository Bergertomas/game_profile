# Evaluation artwork — provenance and rights status

> **NOT CLEARED FOR PRODUCTION.** Everything in this directory is third-party
> copyrighted artwork held for internal design evaluation only. It is used by
> the development-only `/design-lab` routes, which 404 in a production build.
> No licence, permission or clearance for public use has been obtained, applied
> for, or is implied by its presence here.

## `alan-wake-2-keyart-eval.webp`

| | |
|---|---|
| **Work** | *Alan Wake 2* key art |
| **Rights holder** | Remedy Entertainment Plc / Epic Games Publishing |
| **Source URL** | `https://www.alanwake.com/wp-content/uploads/2023/05/Alan_Wake_2_keyart_for_web3-2560x1318.webp` |
| **Source site** | `https://alanwake.com` — the official *Alan Wake* game site, operated by the rights holder |
| **Retrieved** | 7 August 2026 |
| **Original** | 2560 × 1318 WebP, 642,846 bytes |
| **Committed here** | 1600 × 824 WebP, quality 72, 134,358 bytes — **downscaled and re-encoded**, deliberately not a full-resolution master |
| **Modifications** | Resample only. No recolouring, no compositing, no generated content, no cropping baked into the file — the studies crop it in CSS. |
| **Rights status** | **Evaluation only.** Publicly published promotional art, reproduced here at reduced resolution for internal art-direction review. Not licensed. Not cleared. Not for redistribution. |

## Why this asset

The Direction D review found that the game had no visual presence beyond its
title. Judging whether real game media fixes that requires *real* game media:
a generated, abstract or illustrated stand-in would answer a different
question. This is the rights holder's own key art, from the rights holder's own
site, and it is the single most recognisable image of the game.

## Conditions of use in this repository

1. Referenced only from `/design-lab/d2/*`, which `notFound()` in production.
   `tests/e2e/profile.spec.ts` asserts every one of those routes returns 404 in
   a production build.
2. Never referenced by a production route, component or token.
3. Reduced resolution. Do not replace it with a full-resolution master.
4. Never presented as owned, licensed or cleared. Both studies carry a visible
   evaluation notice on the page.

## Before any production use

Direction D2's identity treatment depends on real key art. If a treatment is
approved, one of the following must happen **before** the artwork appears on a
public route:

- a written licence or press/editorial-use permission from Remedy Entertainment
  (`press@remedygames.com`) and/or Epic Games Publishing covering the intended
  use; **or**
- replacement with artwork the product holds rights to; **or**
- the treatment ships without game imagery.

Remedy publishes formal press packs at
`https://www.remedygames.com/media-and-influencers` (Alan Wake 2 pack:
`https://spaces.hightail.com/space/S3CvOb740R/files`). That page and its media
contact are the correct route to a real permission — it was not used to obtain
one, and no permission has been requested.

## Removal

Deleting this directory and the `--dl-art` references in
`app/design-lab/design-lab.css` removes every copy of the asset from the working
tree. Note that a deletion commit does **not** remove it from git history; a
history rewrite would be required if that is ever needed.
