# D3 — Game-Led Profile

The consolidated direction, built on the selected D2-A identity study.

Routes — development only, 404 in a production build:
`/design-lab/d3` (Alan Wake 2) and `/design-lab/d3/{alan-wake-2,returnal,redfall}`.

Review screenshots are **not** in this repository. They embed uncleared
third-party key art and are delivered through the conversation instead. See
`ASSET-PROVENANCE.md` for why, and for the rights record on all three assets.

## What D3 changed from D2-A

| | D2-A | D3 |
|---|---|---|
| Desktop title | Over the artwork | Over the artwork — kept |
| Mobile title | Over the artwork, landing on Saga Anderson | On the graphite field directly below the picture. Nothing is set over the artwork at phone width and no subject is covered. |
| Desktop stage | 460px | 390px, so the whole radar clears a 1440×1000 viewport with room to spare |
| Mobile scrim | Bottom-edge ramp, 0.50 → 0.88 | **None.** With no type on the picture there is nothing to protect. |
| Desktop scrim | Full-width bottom ramp | A diagonal from the bottom-left corner only — the sole part of the frame the title and credit occupy. Zero before the middle of the image. |
| Polygon fill | 26% | 35%, with the grid drawn **over** the fill |
| Grid rings | 2 | 4 (every 2.5), plus all eight spokes, all above the fill |
| Mobile summary | 17px | 15px — it supports the identity instead of becoming the headline |
| Collapsed row | Dimension, ruler, value | unchanged |

Preserved from D2-A: recognisable full-width game artwork, the graphite profile
field attached directly to it with no floating container, the artwork-to-accent
connection, the dark radar treatment, exact score rows, Archivo with selective
Newsreader, and the simplified public hierarchy.

Preserved from Direction D underneath: the reusable `ProfileView` contract, the
shared 0–10 measurement, exact/range/not-scored states, `letter-spacing: 0`, the
12px text floor, `aria-expanded`/`aria-controls` disclosure with stable panel
IDs, and the open row keeping its radar axis marked (`hovered ?? focused ?? open`).

## The radar

The one thing that had to be got right: a filled shape can stop being a
measurement and become a coloured quality badge. Three decisions prevent that.

1. **The grid is painted over the fill**, not under it — four rings at every
   2.5 and all eight spokes cross the polygon.
2. **The fill is a third**, not near-solid. Enough to read as a silhouette from
   across the room, not enough to invite area comparison.
3. **Every axis still carries its exact number** at the axis end, and the eight
   rows repeat them against a shared ruler.

D2-B's 88% fill was rejected for exactly this reason and is not carried forward.

## Accents

One colour per game, taken from that game's own key art, in two tints so the hue
sits on graphite and on the light lower page at AA. It marks the polygon, the
reading tick and the active row identically on a 4.0 and a 10.0. Nothing maps
colour to quality and no dimension is recoloured by its value.

| | Light surfaces | Graphite / panel | Taken from |
|---|---|---|---|
| Alan Wake 2 | `#A8341B` 5.85 / 5.19 | `#EE7454` 5.96 / 6.26 | The red the Dark Place is lit by |
| Returnal | `#6F5400` 6.30 / 5.60 | `#E0B23A` 8.70 / 9.14 | The amber rigging on Selene's suit |
| Redfall | `#27547B` 7.03 / 6.24 | `#5C9EDE` 6.08 / 6.38 | The moonlit blue of the whole frame |

## Validation across the three games

| | Alan Wake 2 | Returnal | Redfall |
|---|---|---|---|
| Horizontal overflow (desktop / mobile) | 0 / 0 | 0 / 0 | 0 / 0 |
| Non-zero `letter-spacing` | 0 | 0 | 0 |
| Text–text box overlaps | 0 | 0 | 0 |
| AA failures against CSS grounds | 0 | 0 | 0 |
| Smallest text | 12px | 12px | 12px |
| Score-row height (desktop / mobile) | 46 / 63.9px | 46 / 63.9px | 46 / 63.9px |
| Smallest radar label (desktop / mobile) | 13.0 / 11.4px | 13.0 / 11.4px | 13.0 / 11.4px |

### First viewport

Identical geometry across all three, because the grammar is identical.

| | Desktop 1440×1000 | Mobile 390×844 |
|---|---|---|
| Artwork | 45–435px | 45–255px |
| Title | 314–383px, inside the picture | 277–313px, on the graphite field |
| Radar | 577–948px — **100% visible** | 473–772px — **100% visible** |
| Next section begins | 577px (rows, beside the radar) | 773–796px |

Title, recognisable media and the complete radar are inside the first viewport
at both sizes, with the score rows visibly beginning.

### Type over artwork

Measured from the painted frame, not from CSS: each page was captured twice,
once normally and once with the identity block hidden; glyph coverage was
isolated by differencing the two, and ground luminance read **only at covered
pixels**. The figure is the worst single pixel any letterform sits on.

| | Text | Floor | Worst covered pixel | p99 | Median |
|---|---|---|---|---|---|
| Alan Wake 2 | Title 76px/700 | 3.0 | **8.82:1** | 10.78:1 | 15.52:1 |
| Alan Wake 2 | Credit 12px/600 | 4.5 | **6.30:1** | 6.44:1 | 7.03:1 |
| Returnal | Title 76px/700 | 3.0 | **4.08:1** | 4.58:1 | 15.13:1 |
| Returnal | Credit 12px/600 | 4.5 | **5.80:1** | 5.93:1 | 6.94:1 |
| Redfall | Title 76px/700 | 3.0 | **15.48:1** | 15.75:1 | 16.44:1 |
| Redfall | Credit 12px/600 | 4.5 | **7.19:1** | 7.19:1 | 7.21:1 |

Mobile has nothing to measure: no type is set over artwork at that width.

Returnal's lit pod wall is the case that sets the scrim. With the earlier
full-width bottom ramp its title measured 1.78:1; the corner diagonal brings it
to 4.08:1 while leaving the pod wall, the "APPROACH FORBIDDEN" sign and Selene
herself painted as delivered.

### Score states

Only exact values occur in the seed corpus, so range and Unknown are exercised
by `/design-lab/d/states`, which is unchanged and still passing. The D3 row and
radar components implement all three: a range draws a dotted reach on the radar
and an open tick on the ruler; an unscored dimension draws no vertex, a dashed
bridge across the polygon gap, a dashed ruler baseline and the words "Not
scored" — never a zero.

### Guardrails

No black-and-purple gradient, neon, glow, glass, HUD bracket, scanline,
particle, blurred artwork, centred marketing headline, controller icon or
store-page card appears anywhere. Nothing has a border radius or a drop shadow.
No running head, rubric version, calibration round, evidence cut-off or
publication date appears above the fold — all of it is in "How this profile was
made" at the foot.

### Known tradeoffs

- Returnal's title clears its floor by the narrowest margin of the three
  (4.08:1 against 3.0) because its art is the brightest at the bottom-left. A
  future game with a bright lower-left corner may need the crop moved rather
  than the scrim raised.
- The three heroes have different intrinsic aspect ratios (1.94:1 for the Alan
  Wake 2 key art, 3.10:1 for the two store heroes), so the shallow stage crops
  them by different amounts. It holds at these three; a portrait-only asset
  would not work in this stage and would need a different framing rule.
