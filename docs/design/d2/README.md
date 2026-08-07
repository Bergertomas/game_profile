# D2 — identity studies

> **Superseded and withdrawn.** D2-A was selected and became
> [D3 — Game-Led Profile](../d3/README.md); D2-B was not selected. Both routes,
> both components and all four review frames have been removed, together with
> the evaluation artwork that was stored under `public/`.
>
> The artwork should never have been committed: `public/` is served as a static
> asset in production regardless of route guards, and the four screenshots
> embedded the same uncleared key art a second way. D3 holds URLs and a rights
> record instead of files — see [`../d3/ASSET-PROVENANCE.md`](../d3/ASSET-PROVENANCE.md).
>
> This file is kept as the record of the comparison that led to D3. The frames
> it describes were delivered for review and are not in the repository.

Direction D was rejected on identity, not on structure. These two studies keep
everything D got right underneath them and change only what the page looks like
it is about.

Alan Wake 2 only, by design. Whether real game media, a different surface
strategy and a differently-drawn radar fix the identity problem is answerable
with one game; carrying it to three is the next step, not this one.

Routes, as they were while the studies existed: `/design-lab/d2/a` and
`/design-lab/d2/b`, development only.

---

## What both studies changed from D

These are constant across A and B, so the comparison between them is about
identity alone.

| | Direction D | D2 |
|---|---|---|
| First viewport | Running head, "Experience assessment", rubric version, calibration round, evidence cut-off, a status/confidence eyebrow, and the no-total-from-area explanation | Game, experience, profile shape. Nothing else. |
| Trust material | Spread across the masthead and the instrument | One block at the foot: "How this profile was made" — status, confidence, rubric, calibration round, cut-off, release context, ledger, full scope, evidence list and the derivation rule |
| Collapsed score row | Index · name · citation ordinals · leader dots · scale · value · confidence | Name · measurement · exact value |
| Confidence and evidence | Repeated on all eight rows | Inside `Why this score?`, read once and in context |
| Alignment device | Dotted leaders | The grid |
| Structure | Ruled divisions everywhere | Surface changes |
| Game presence | The title | Real key art, and an accent taken from it |

Preserved unchanged: the reusable `ProfileView` contract, Archivo display
typography, Newsreader for the summary and long rationale, the grid and
information hierarchy, exact values visible without interaction, the
exact/range/not-scored states, `letter-spacing: 0`, the 12px text floor,
`aria-expanded`/`aria-controls` disclosure with stable panel IDs, the open row
keeping its radar axis marked (`hovered ?? focused ?? open`), and the
radar-plus-score-row relationship.

---

## D2-A — Game-Led Editorial

The game arrives first, at full width, as itself: a shallow hard crop of the key
art with the title and the essential facts set into the composition, no card and
no floating panel. Directly beneath it a full-width graphite band carries the
one-sentence experience summary, the profile shape and the eight exact values —
so the instrument answers the image on the image's own ground rather than on a
sheet of paper.

The accent is the red the key art is made of (`#EE7454` on graphite, `#A8341B`
on light). It runs artwork → polygon → reading tick → active row.

- **Stage**: 268px at 390, 460px at 1440. Hard crop via `object-fit: cover` at
  `center 32%`, which keeps Wake's face in frame at both widths.
- **Radar**: light polygon fill (26%), accent stroke, accent register marks on
  graphite. Two grid rings, no graduations.
- **Serif**: the experience summary and expanded rationale only. Pull, risk and
  everything else are Archivo.

**Strongest idea.** The graphite band. The profile does not sit on paper below a
picture — it sits in the game's own darkness, which is what stops the instrument
reading as an appendix to the artwork.

**Principal risk.** It is the closer of the two to a marketing page. It stays on
the right side of that line only because the band arrives immediately, at full
width, carrying numbers.

---

## D2-B — Profile As Game Object

The artwork is held back to a hard-cropped field that bleeds off the right edge
of the identity region — clipped by the page, not framed by it, which is what
stops it reading as a split card. What dominates is the profile: a solid
silhouette in the game's own colour with a decisive ink stroke and heavy
register marks, drawn as an object rather than as a chart.

The page moves through three neutral surfaces — page `#EDEDEA`, white instrument
panel, trust band `#E1E1DD` — so cadence comes from ground changes instead of
ruled divisions.

- **Image field**: 38% of the width on desktop, full-bleed to the right edge; a
  152px band on mobile. Both figures are in frame at both widths.
- **Radar**: filled polygon at 88% in `#A8341B`, 2.5px ink stroke, 4.5px square
  register marks, two grid rings, no graduations, no bisector numerals.
- **Serif**: reserved for editorial interpretation — the experience summary, the
  pull and risk statements, and rationale inside a panel.

**Strongest idea.** The polygon as a solid object. It is the first version of
the radar that looks like a thing the product owns rather than a chart type it
borrowed.

**Principal risk.** A near-solid shape invites "bigger is better" even though
nothing is derived from the area, and the trust block says so explicitly. If
D2-B proceeds, that needs testing on Redfall — a small dense shape in cold blue
— before it is settled.

---

## Which visual variables changed between A and B

Everything else is held constant.

| Variable | D2-A | D2-B |
|---|---|---|
| Artwork area, desktop | Full width × 460px, above everything | 38% × ~360px, beside the title |
| Artwork role | The page opens as the game | The game is context for the profile |
| Where the profile sits | Graphite, in the game's darkness | White panel, in the product's own light |
| Surface strategy | Two grounds: dark stage + band, then light | Three neutral grounds in sequence |
| Polygon | 26% fill, accent stroke, light silhouette | 88% fill, ink stroke, solid object |
| Radar dominance | Balanced with the artwork | Dominant; the largest element on the page |
| Serif range | Summary and rationale only | Summary, pull, risk and rationale |
| Title placement | Inside the composition, over the art | On the page ground, beside the art |
| Mobile order | Art → title → band → shape | Title → summary → art → shape |

---

## Asset source and rights

Full record: `public/design-lab/evaluation-art/PROVENANCE.md`. Summary:

- **Work**: *Alan Wake 2* key art.
- **Rights holder**: Remedy Entertainment Plc / Epic Games Publishing.
- **Source**: `https://www.alanwake.com/wp-content/uploads/2023/05/Alan_Wake_2_keyart_for_web3-2560x1318.webp` — the official *Alan Wake* site, operated by the rights holder. Retrieved 7 August 2026.
- **Committed**: 1600 × 824 WebP, quality 72, 134 KB. Downscaled and re-encoded from the 2560 × 1318 original; resample only, no other modification. Deliberately not a full-resolution master.
- **Rights status**: **evaluation only.** Not licensed, not cleared, not for
  redistribution. Referenced only by `/design-lab/d2/*`, which 404s in
  production; both studies carry a visible rights notice in the trust block.
- **Before any production use**: a written licence or press/editorial permission
  from Remedy (`press@remedygames.com`) and/or Epic Games Publishing, or
  replacement with owned artwork, or ship without game imagery. Remedy's press
  page is `https://www.remedygames.com/media-and-influencers`; it was not used to
  request permission and none has been requested.

No generated imagery, abstract SVG, fake texture or atmospheric gradient stands
in for game art anywhere in either study.

---

## Checks

Measured in Chromium against the running app, first viewport only.

| | D2-A 1440×1000 | D2-A 390×844 | D2-B 1440×1000 | D2-B 390×844 |
|---|---|---|---|---|
| Horizontal overflow | 0px | 0px | 0px | 0px |
| Elements with non-zero `letter-spacing` | 0 | 0 | 0 | 0 |
| Text–text box overlaps | 0 | 0 | 0 | 0 |
| AA failures against CSS grounds | 0 | 0 | 0 | 0 |
| Smallest text | 12px | 12px | 12px | 12px |
| Score-row height | 46px | 63.9px | 46px | 63.9px |
| Smallest rendered radar label | 13.0px | 11.4px | 13.4px | 11.4px |

### First viewport contents

| | D2-A 390×844 | D2-B 390×844 |
|---|---|---|
| Game imagery | 45–313px | 281–433px |
| Title | 223–263px | 73–113px |
| Radar | 503–780px — **100% visible** | 489–766px — **100% visible** |
| Next section begins | 808px | 786px |

Both satisfy the rule: title, recognisable game imagery and the complete radar
inside 844px, with the score rows visibly beginning.

At 1440×1000, D2-A's radar is 92% visible (bottom edge 1029px) and D2-B's is
100% (bottom edge 829px).

### Contrast of type set over photography

CSS cannot answer this, so it was measured from the painted frame: each study
was screenshot twice, once normally and once with the stage type hidden; glyph
coverage was isolated by differencing the two, and ground luminance read **only
at covered pixels**. The figure below is the worst single pixel any letterform
sits on.

| | Text | Floor | Worst covered pixel | p99 | Median |
|---|---|---|---|---|---|
| D2-A desktop | Title, 80px/700 | 3.0 | **6.88:1** | 9.05:1 | 13.87:1 |
| D2-A desktop | Metadata, 12px/600 | 4.5 | **6.30:1** | 6.80:1 | 8.65:1 |
| D2-A mobile | Title, 44px/700 | 3.0 | **4.46:1** | 9.89:1 | 14.84:1 |
| D2-A mobile | Metadata, 12px/600 | 4.5 | **8.47:1** | 8.80:1 | 9.77:1 |

D2-B sets no type over the image at all, so it has nothing to measure.

**On the scrim.** D2-A carries one overlay: a bottom-edge gradient, fully
transparent above the midline. It is tuned per viewport against those
measurements rather than by eye. Desktop crops a dark band of forest and would
clear AA with no scrim at all, so it gets a light one (0.22 → 0.60). A phone
shows the full frame height including the lit fern litter along the bottom edge,
where the brightest covered pixel drops the title to **1.9:1** unaided, so the
lower third is taken down harder there (0.50 → 0.88). The subject, the canopy
and the whole upper frame are painted as delivered — no blur, no full-frame
tint, no desaturation.

### Known tradeoffs

- **D2-A, 390px**: at that crop the title lands over Saga Anderson, so the
  second protagonist is largely covered. Wake and the red forest carry
  recognition on their own, but D2-B's shallower band frames both figures and
  D2-A's does not. Worth weighing if the identity has to work hardest on a
  phone.
- **D2-B**: the near-solid polygon is the strongest identity move in either
  study and also the one most likely to imply that area means quality. It needs
  a Redfall render before it is settled.
- Neither study has been checked against Returnal or Redfall. Both accents and
  both radar treatments are written to take any profile, but that is untested.

### Guardrails

No black-and-purple gradient, neon, glow, glass, HUD bracket, scanline,
particle, centred marketing headline, controller icon or store-page styling
appears in either study. Nothing has a border radius or a drop shadow. Gaming
identity comes from the real key art, the profile silhouette, the game's own
accent colour and the interaction — nothing else.
