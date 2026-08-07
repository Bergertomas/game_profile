# Design lab — D0 exploration and Direction D

**D0** is the three-direction exploration (A, B, C). It is kept intact as a
review artifact. **Direction D — Editorial Instrument** is the consolidated
direction chosen after that review, and is what the rest of this document leads
with.

Routes (development only — every one 404s in production, asserted by
`tests/e2e/profile.spec.ts`):

| | Route | Field | Typography |
|---|---|---|---|
| Index | `/design-lab` | — | — |
| **D** | **`/design-lab/d`** (Alan Wake 2) | **Light neutral, one game accent** | **Condensed Archivo display + Newsreader prose + Archivo tabular numerals** |
| D | `/design-lab/d/{alan-wake-2,returnal,redfall}` | | |
| D | `/design-lab/d/states` — score-state proof | | |
| A | `/design-lab/a` | Warm paper, light | System A — condensed grotesque + editorial serif |
| B | `/design-lab/b` | Cool paper, light | System B — characterful grotesque + technical mono |
| C | `/design-lab/c` | Warm ink, dark | High-contrast serif display + grotesque support |

Screenshots: `{A,B,C}-desktop.png` (1440×1000), `{A,B,C}-mobile.png` (390×844),
`{A,B,C}-why-this-score.png` (Atmosphere & World Pull expanded), and the
Direction D set listed under "D screenshots" below.

Fonts are vendored under `public/fonts/design-lab/`. Copyright, upstream source,
version and the full SIL OFL 1.1 text for all five faces are in
`public/fonts/design-lab/LICENSES.md`.

---

# D — Editorial Instrument

**Thesis.** A premium editorial document that behaves like a precise measurement
tool. Not a collage of A, B and C: one device does the work three separate
devices were doing.

**The consolidation.** A's leader-dot index line and B's shared measurement
ruler were the two strongest ideas in D0, and they were solving the same
problem from opposite ends — A made the row read as set type, B made eight rows
comparable against one scale. D fuses them into a single row:

```
01   Story & Character Investment ⁰¹ ·······   ├────────────┤        9.5   HIGH
     index    name + citation + leader dots     shared 0–10 scale   value  conf
```

The graduations are declared once in the column head, exactly as a printed table
declares its units; each row then carries only a hairline baseline, a measured
ink rule and an accent reading tick. Square ends, no track fill, no radius.

**Information hierarchy.** Four levels, in this order on every viewport:

1. Identity, status, confidence, scope and the one-line experience summary.
2. The radar and the eight exact score rows, under one heading, on one scale —
   the instrument.
3. Primary Pull and Primary Risk, as two opposed columns.
4. `Why this score?` (in place, inside the instrument), recommendations,
   traits, platform variance, provenance and evidence.

The top region is a single CSS grid with named areas, so desktop reads
identity + scope, then the full-width instrument, while a phone reads identity,
then the instrument, then scope. Nothing is duplicated in the DOM to achieve it.

**Radar.** Unboxed — there is no frame, plate, card or artwork behind it. B's
legible grid on the same 0–10 scale as the rows, with graduations along one
bisector so the two halves of the instrument visibly share a ruler; A's square
register marks instead of data dots; C's open space around it. A dimension
published as a range gets a dotted spur from its confirmed floor to its ceiling
and an open register mark at the top of the reach; a dimension with no
publishable total gets no vertex at all and a dashed bridge across the gap.

**Typography and surfaces.** Archivo at 72% width for display and all numerals
(tabular), Newsreader for every piece of prose read at length, JetBrains Mono
only for source ordinals and scale graduations. Rules and one raised ground do
all the structural work — there is not one bordered container in the direction.

**Colour.** A light neutral field (`#F4F4F2`), not sepia. One accent per game,
drawn from that game's own identity and used identically on a 4.5 and a 10.0:
Alan Wake 2 `#A8341B`, Returnal `#5B2F94`, Redfall `#27547B`. It marks the
polygon wash, the reading tick, citation ordinals, the status eyebrow and the
active row. It never signals quality, and no dimension is recoloured by its
value.

**Evidence language.** A's marginalia — superscript accent ordinals beside each
dimension name, a numbered source apparatus in the outer column — with B's
explicit statements about what the numbers are: every panel closes with the
derivation, and the evidence column states that sources are evidence, not votes.
The ledger is still `pending` on all three seeded profiles, so no source count is
published; the column says why.

**Mobile.** Complete radar above the fold at 390×844, measured: the radar's
bottom edge lands at **713.8px** (Alan Wake 2) and **729.9px** (Redfall) of the
844px viewport, with the figure caption still visible. Score rows become
two-line — index, name, value and confidence on the first, the shared scale at
full row width on the second — so the scale is never dropped and every row is a
66.5px touch target.

## What D kept, and from where

| From | Kept |
|---|---|
| **A** | Editorial hierarchy — a masthead with a lede, not a hero. Condensed display typography. Newsreader for prose read at length. Evidence as marginalia: superscript accent ordinals in the row, a numbered source apparatus in the outer column. The leader-dot index rhythm carrying the eye from name to number. Square register marks on the polygon. |
| **B** | Radar clarity — visible grid, graduations, unambiguous readings. One shared measurement scale, identical on every row. Hard alignment: fixed columns for scale, value and confidence, so nothing reflows between a `9.5`, a `7.0–9.0` and a `Not scored`. Tabular numerals throughout. Explicit derivation and confidence language — every panel ends with how the total was derived, and per-dimension confidence is on the row itself, not hidden. |
| **C** | Willingness to let the composition breathe: generous space around the instrument, no panel walls, sections divided by a single rule. The title/visual relationship — identity and instrument read as one spread rather than two stacked blocks. |

## What D rejected, and why

| Rejected | Why |
|---|---|
| **B's fully boxed dashboard density** | The sheet border, the panel splits and the internal boxes are what pushed B toward the dashboard failure mode. D has no bordered container at all — rules and one raised ground carry the structure. |
| **C's full-page dark palette** | D is a light neutral field. Dark was the single strongest pull toward "premium dark website", and it made C's quiet ramps unfixable without redesigning the palette. |
| **C's oversized plate-first hierarchy** | The plate pushed identity and the profile down the page. In D the silhouette is the first visual, and on a phone it is complete before the fold. |
| **C's authored SVG forest plate** | We hold no licence to Alan Wake 2 key art, and a stand-in illustration is still a fabrication of the game's look. D ships **no game image**. `Game.coverUrl` and `heroUrl` remain optional in the model; when real licensed art exists, it can be added — until then the absence is honest and the layout does not have a hole in it. |
| **Radar below metadata, Pull/Risk or recommendations on mobile** | The scope register moves *below* the instrument on a phone. Build strings are the longest metadata on the page and would have cost roughly 270px above the silhouette. |
| **Generic cards, pills, progress bars, glass, gradients, shadows, decorative icons, component-library styling** | See the rejected-patterns list at the foot of this document; it applies to D as written, with the additions noted there. |

## D screenshots

| File | Viewport | What it shows |
|---|---|---|
| `D-alan-wake-2-desktop.png` | 1440×1000 | D at desktop. Also the 1440×1000 reference capture. |
| `D-alan-wake-2-tablet.png` | 768×1000 | The middle breakpoint: single column, inline scale retained. |
| `D-alan-wake-2-mobile.png` | 390×844 | Title, status and the complete radar above the fold. |
| `D-returnal-desktop.png` / `D-returnal-mobile.png` | 1440×1000 / 390×844 | Same presentation, different game and accent. |
| `D-redfall-desktop.png` / `D-redfall-mobile.png` | 1440×1000 / 390×844 | A 4.0–5.5 profile that still reads as a serious document. |
| `D-why-this-score.png` / `D-why-this-score-mobile.png` | 1440×1000 / 390×844 | Atmosphere & World Pull expanded — the same dimension A, B and C were captured on. |
| `D-score-states.png` / `D-score-states-mobile.png` | 1440×1000 / 390×844 | Precise, range, not-scored and Low/Medium/High confidence in one instrument. |
| `D-full-desktop.png` / `D-full-mobile.png` | 1440 / 390, full page | The whole document, both extremes. |

Every comparison capture uses the same top origin (`window.scrollTo(0, 0)` after
`document.fonts.ready`), the same viewport and `deviceScaleFactor: 2`, so the
three games can be laid side by side without adjustment. The two full-page
captures neutralise the radar's `position: sticky` for the capture only —
otherwise Chromium repeats the figure down the page — and are the only images
that differ in capture settings.

## D verification

Measured in Chromium on the running app, across `/design-lab/d`,
`/design-lab/d/redfall` and `/design-lab/d/states`:

| Check | 1440×1000 | 768×1000 | 390×844 |
|---|---|---|---|
| Horizontal overflow | 0px | 0px | 0px |
| Elements with non-zero `letter-spacing` | 0 | 0 | 0 |
| WCAG AA failures (all visible text, measured against its own painted ground) | 0 | 0 | 0 |
| Smallest text on the page | 12px | 12px | 12px |
| Smallest score-row height | 46px | 46.5px | 66.5px |
| Smallest rendered radar label | 10.8px | 11.2px | 11.6px |
| Radar bottom edge vs viewport | 741 / 1000 | 784 / 1000 | 714 / 844 |

- The contrast ramps A, B and C were carrying (≈3.24:1, 3.49:1 and 3.51:1) are
  not reused. D's quietest text colour is `#54595F` at **6.42:1** on the field
  and **5.92:1** on the raised ground used for an open panel; the weakest accent
  pairing is Alan Wake 2's `#A8341B` at **5.54:1** on that same raised ground.
  The 12px floor applies to every label, including the radar's.
- `letter-spacing: 0` is enforced by a descendant rule on `.dl-d`, so no local
  style or SVG attribute can reintroduce tracking. There is no negative tracking
  anywhere in the direction; label legibility is bought with size, weight and
  contrast instead.
- Score rows are real `<button aria-expanded aria-controls>` elements inside an
  `<ol>`. Panel IDs are stable (`dl-d-why-<dimension>`) and the panel is always
  in the DOM — `hidden` when closed — so `aria-controls` always resolves.
- The open row keeps its radar axis marked; hover and focus borrow the marker
  while they are on a different row, then hand it back (`hovered ?? focused ??
  open`).
- Exact values are visible on every row without interaction, including
  `Not scored`, and the radar is `aria-hidden` with `shapeDescription` supplied
  to assistive technology from inside the figure.
- Suite: `npm run typecheck`, `npm run lint`, `npm test` (152 unit tests) and
  `npm run test:e2e` (31 Playwright tests, production build) all pass. The
  production-404 test now covers `/design-lab/d`, all three
  `/design-lab/d/[slug]` renders, `/design-lab/d/states` and an unknown slug.
- Production routes, components, tokens, fixtures, scores, schema and migrations
  are untouched: the only non-lab file this branch changes is
  `tests/e2e/profile.spec.ts`.

---

## A — Editorial Dossier

**Thesis.** A researched game file set on paper. The page is a document, not an
application. Nothing is in a card except the radar plate, which earns its frame
by being a figure.

**Information hierarchy.** Asymmetric 12-column spread. Title, scope and lede
occupy seven columns; the radar is stamped into the remaining five as *Fig. 1*.
Below a strong rule, pull and risk sit as genuinely opposing columns. The
measurements then run as the page's spine in eight columns, with a true outer
margin carrying the analytical apparatus.

**Radar.** An analytical plate: ink line-work on paper, hairline octagon grid,
square vertex marks that read as printed register marks rather than data points.
Axis name above, value below, both in condensed grotesque. Framed and captioned
like a figure in a printed report — and the caption is where the "no total is
derived from the area" rule is stated.

**Typography and surfaces.** Archivo at 68% width for display and all numerals;
Newsreader for every piece of prose read at length. One rule weight for
structure, one heavier rule for major divisions. No shadows, no radii.

**Evidence language.** True marginalia. Superscript accent numerals in the prose,
an "In the margin" column that explains why Execution sits at Medium confidence,
and a numbered footnote apparatus at the foot of the document.

**Mobile.** Single column; the plate moves under the title, its labels switch to
a compact geometry so they render at ~10px rather than ~7px. Leader-dot rows
survive intact because they are set type, not a layout trick.

**Strongest idea.** The leader-dot measurement line —
`STORY & CHARACTER INVESTMENT ⁰¹ ......... 9.5`. It makes the eight scores read
as an index in a printed document, which is exactly the "nutrition label"
positioning, and it is instantly recognisable.

**Principal risk.** The most conservative of the three. It could be mistaken for
a well-set article rather than a product, and the light paper field may read as
insufficiently "game" to some audiences.

---

## B — Scouting Sheet

**Thesis.** A measuring instrument printed on one sheet. Everything is tabular,
ruled and aligned to a shared measurement column.

**Information hierarchy.** A bounded sheet inside a cool field. Header band,
identity block with tabular metadata, then pull and risk as a two-row ruled
band with margin labels. The instrument proper is a two-panel split: radar
anchor on the left, the eight measurements as a hard-aligned table on the right,
closed by a reading note so the column does not end in a void.

**Radar.** An instrument dial. Heavier grid presence than the other two, a
labelled tick scale along the bisector, hollow vertex circles that fill with
accent when active, mono legend labels. The one direction where the radar is
unambiguously the primary anchor rather than an illustration.

**Typography and surfaces.** Space Grotesk for language; JetBrains Mono for every
measurement, identifier, status and metadata value. The mono is doing
information work — it is what makes the sheet read as an instrument — not
decoration. Square corners, 1.5px sheet border, hairline internal rules.

**Evidence language.** Instrument legend. Source markers are bordered mono
numerals (`01`, `02`); the `EV` column on every row lists which sources bear on
that dimension; the legend at the foot expands them with tiers.

**Mobile.** The sheet metaphor holds because it was always a grid. The 10rem
measurement ruler is dropped below 640px — the numeral carries the value there —
and the metadata stays in two tabular columns rather than collapsing to a list.

**Strongest idea.** The shared measurement column. Because the ruler is identical
on every row, the eye reads position against one scale instead of comparing eight
independently-scaled bars. It is the clearest "shape at a glance" of the three.

**Principal risk.** Closest to the dashboard failure mode. It survives because
there are no widgets, tiles or cards — but push the density further and it tips.

---

## C — Cinematic Archive

**Thesis.** An archival record of a work. A full-bleed authored plate opens the
page, the title breaks its lower edge, and analysis is set as annotation in open
dark fields rather than inside containers.

**Information hierarchy.** Plate, then a title that overlaps it, then a
deliberately sparse arrangement: lede and the pull/risk pair on the left, an
archival "Record" rail on the right. The radar section is unboxed entirely.

**Radar.** Drawn straight into the field — no frame, no panel. The grid is barely
present, the polygon carries a soft radial wash, and the values are set at the
axis ends in the display serif so the chart reads as plate artwork rather than a
chart component.

**Typography and surfaces.** Instrument Serif at display sizes against Archivo
for support, with mono reserved for archival marks (`ACC. 001`, `PLATE I`). No
surfaces at all: the dark field is the only ground, divided by hairlines.

**Evidence language.** Archival record. Status, confidence, provenance, ledger
state, edition, mode and build are set as a catalogue rail; sources are a
numbered accession list.

**Imagery.** We hold no licence to Alan Wake 2 key art, so the plate is authored:
a stand of trees silhouetted against two shafts of light, with the game's own
profile geometry registered faintly over it and archive perforation along both
edges. Light cutting through dark forest *is* what the game is about, so this
supports the game's identity rather than decorating around it. **This is a
stand-in.** With a licence, the same composition takes a hard crop of real key
art in the same position, and the geometry overlay stays.

**Mobile.** The plate shortens to 34vh, the title still breaks its edge, and the
Record rail moves below the lede. Radar labels switch to compact geometry.

**Strongest idea.** The title breaking the plate edge, and the radar with no
container at all. Together they make the page feel authored rather than
assembled.

**Principal risk.** The most likely to drift toward "premium dark website". Its
discipline depends entirely on the plate staying composed and the fields staying
empty; add one panel and it collapses into the genre.

---

## Generic AI-design patterns deliberately rejected

Applies to all four unless noted.

- **No bento grid, no card soup.** The only bordered containers anywhere are A's
  radar plate (it is a figure) and B's sheet (it is the metaphor). C and D have
  none at all — D's structure is rules and one raised ground.
- **No glassmorphism, no frosted panels, no drop shadows, no gradient borders,
  no glowing strokes.** Radii are 0 everywhere. D's active row uses an
  `inset` box-shadow, which is a 2px margin keyline with no blur and no offset,
  not elevation.
- **No purple/blue ambient gradients.** Three of four directions are light; the
  dark one is warm ink, not navy, and its only gradient is a directional light
  shaft that is part of the image. D has no gradient at all except the
  leader-dot repeat, which is set type rendered as a background.
- **No centred marketing hero.** Every title is left-aligned and participates in
  a composition — A's is a masthead beside a figure, B's is inside a header band,
  C's breaks a plate edge, D's is a masthead with a scope register in the margin.
- **No pills or badges.** Status, confidence, tags, intensities and source
  markers are all set as type. Tags are run-in lists (A, C, D) or a mono row (B),
  never a wall of rounded chips.
- **No progress bars.** A uses leader dots, B uses a hairline ruler with a tick,
  C uses no track at all, D fuses the first two: a leader-dot line into a
  hairline 0–10 baseline with a measured ink rule and an accent reading tick.
  Square ends, no filled track, no radius.
- **No decorative iconography.** There are no icons anywhere. The only glyphs
  are typographic.
- **No good/bad colour.** One accent per game, used identically for the polygon,
  citations and active state; it never signals quality. In D this is verifiable
  side by side: Redfall's 4.0–5.5 profile is rendered in exactly the same way as
  Alan Wake 2's, and the score-state proof puts a 10.0 at Low confidence.
- **No stock component-library appearance.** No UI framework was added. Nothing
  is a shadcn primitive.
- **No hover-lift, parallax, animated gradients or ambient motion.** The only
  motion defined is a radar reveal, and it is inside
  `prefers-reduced-motion: no-preference`.
- **No placeholder imagery.** D carries no game image rather than a stand-in.
  See the rejection of C's authored plate above.
- **No placeholder copy.** Every word is canonical profile content.

## Accessibility and readability notes

- Score rows are real `<button aria-expanded>` elements inside semantic lists;
  every row is reachable by keyboard and carries an `sr-only` "Why this score?"
  label. Focusing a row highlights its radar axis exactly as hovering does, so
  the linkage is not pointer-only. D adds `aria-controls` with stable panel IDs
  and keeps the panel in the DOM (`hidden` when closed) so the reference always
  resolves.
- Radar SVGs are `aria-hidden`; the exact values live in the DOM regardless. D
  additionally places `shapeDescription` inside the figure for assistive
  technology, and states the "no total from area" rule in the visible caption.
- All four render two radar geometries and swap them with CSS at 640px, so
  labels land at 10–11px on a 390px viewport rather than ~7px. B additionally
  drops its tick-scale numerals below that breakpoint; D drops its bisector
  graduations there for the same reason.
- Expansion happens in place with no layout shift above the opened row.
- Zero horizontal overflow at 390px in all four.
- Focus rings use each direction's accent at a 2px outline with 3px offset.
- **A/B/C known tradeoff, resolved in D:** C's `--dl-bone-faint` archival marks
  sat near the AA floor (≈3.51:1), as did A's `--dl-ink-faint` (≈3.24:1) and B's
  (≈3.49:1). None of those ramps is carried into D, whose quietest text colour is
  6.42:1 on the field and 5.92:1 on the raised ground, with a 12px floor. A, B
  and C are left as reviewed rather than retro-fitted.
- **A/B/C known tradeoff, resolved in D:** B is the densest and would have needed
  its line-height and tap targets re-checked on small phones. D's rows are
  66.5px at 390px and 46–46.5px above 640px, both clear of the 44px minimum.
  Dimension names wrap rather than truncate below 640px — the label for a number
  is never clipped to protect the leader-dot rhythm, which is dropped there.
