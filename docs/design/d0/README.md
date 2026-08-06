# D0 — Art direction exploration

Three compositionally distinct directions rendering the **same published Alan
Wake 2 evaluation**. Identical scores, tags, evidence, confidence and
recommendation text in all three; nothing about the data differs.

Routes (development only — every one 404s in production):

| | Route | Field | Typography |
|---|---|---|---|
| Index | `/design-lab` | — | — |
| A | `/design-lab/a` | Warm paper, light | System A — condensed grotesque + editorial serif |
| B | `/design-lab/b` | Cool paper, light | System B — characterful grotesque + technical mono |
| C | `/design-lab/c` | Warm ink, dark | High-contrast serif display + grotesque support |

Screenshots: `{A,B,C}-desktop.png` (1440×1000), `{A,B,C}-mobile.png` (390×844),
`{A,B,C}-why-this-score.png` (Atmosphere & World Pull expanded).

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

Applies to all three unless noted.

- **No bento grid, no card soup.** The only bordered containers in the whole
  exploration are A's radar plate (it is a figure) and B's sheet (it is the
  metaphor). C has none.
- **No glassmorphism, no frosted panels, no drop shadows, no gradient borders,
  no glowing strokes.** Radii are 0 everywhere.
- **No purple/blue ambient gradients.** Two of three directions are light; the
  dark one is warm ink, not navy, and its only gradient is a directional light
  shaft that is part of the image.
- **No centred marketing hero.** Every title is left-aligned and participates in
  a composition — A's is a masthead beside a figure, B's is inside a header band,
  C's breaks a plate edge.
- **No pills or badges.** Status, confidence, tags, intensities and source
  markers are all set as type. Tags are run-in lists (A, C) or a mono row (B),
  never a wall of rounded chips.
- **No progress bars.** A uses leader dots, B uses a hairline ruler with a tick,
  C uses no track at all — the numeral is the value.
- **No decorative iconography.** There are no icons anywhere. The only glyphs
  are typographic.
- **No good/bad colour.** One accent per game, used identically for the polygon,
  citations and active state; it never signals quality.
- **No stock component-library appearance.** No UI framework was added. Nothing
  is a shadcn primitive.
- **No hover-lift, parallax, animated gradients or ambient motion.** The only
  motion defined is a radar reveal, and it is inside
  `prefers-reduced-motion: no-preference`.
- **No placeholder copy.** Every word is canonical profile content.

## Accessibility and readability notes

- Score rows are real `<button aria-expanded>` elements inside semantic lists;
  every row is reachable by keyboard and carries an `sr-only` "Why this score?"
  label. Focusing a row highlights its radar axis exactly as hovering does, so
  the linkage is not pointer-only.
- Radar SVGs are `aria-hidden`; the exact values live in the DOM regardless.
- All three render two radar geometries and swap them with CSS at 640px, so
  labels land at 10–11px on a 390px viewport rather than ~7px. B additionally
  drops its tick-scale numerals below that breakpoint.
- Expansion happens in place with no layout shift above the opened row.
- Zero horizontal overflow at 390px in all three.
- Focus rings use each direction's accent at a 2px outline with 3px offset.
- **Known tradeoff:** C's `--dl-bone-faint` archival marks are deliberately quiet
  and sit near the AA floor for small text. They carry labels, never values —
  but if C proceeds, that ramp needs lifting.
- **Known tradeoff:** B is the densest and would need its line-height and tap
  targets re-checked before any production use on small phones.
