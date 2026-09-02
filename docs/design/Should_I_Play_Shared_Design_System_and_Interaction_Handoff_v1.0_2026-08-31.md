# Should I Play? — Shared Design-System and Interaction Handoff v1.0

**Date:** 31 August 2026  
**Status:** Implementation-ready handoff for accepted public surfaces  
**Applies to:** A1/A2 Rev 5.1, A3–A6, C1–C4, B-rail and C-rail  
**Authority:** ADRs 0030, 0031, 0032, 0033 and 0034, the Master Plan v0.9,
the fixed eight-dimension methodology and the evidence/data contracts  
**Machine-readable tokens:**
[`handoff/should-i-play.tokens.v1.json`](handoff/should-i-play.tokens.v1.json)

## 1. Outcome and boundary

This handoff turns the accepted homepage, profile and full Compare compositions
into one implementable system. It resolves tokens, component variants,
responsive behavior, state coverage, focus and keyboard behavior, precise
non-visual equivalents, artwork fallbacks and truthful content projection.

It is not a new visual direction. It does not reopen the accepted opening
composition, journey hierarchy, profile hierarchy, Compare composition, fixed
eight dimensions, public scale or exactly-two contract. It also does not make
Fable's example scores, polygons, dates, copy, time estimates, destinations,
roster or artwork rights true.

The implementation rule is:

> Preserve the accepted composition and emotional character; replace every
> specimen fact with approved data, an explicit uncertainty state, or omission
> according to its field contract.

No aggregate score, hidden aggregate, winner, ranking, popularity signal,
match percentage or red/green good/bad system may be introduced.

This handoff derives from the accepted artifact; it does not replace it. Visual
implementation and conformance work imports the canonical file named in
[`Should_I_Play_Canonical_Design_Source.md`](Should_I_Play_Canonical_Design_Source.md)
and judges the rendered product against those frames, not against this prose
alone.

## 2. Source baseline and deliberate corrections

### 2.1 Measured reference frames

The accepted Fable specimen uses:

| Reference | Frame | Shared geometry |
|---|---:|---|
| Desktop | 1440px | 82rem content maximum, 2.5rem side gutters |
| Mobile | 390px | 1rem side gutters, stacked reading order |
| Desktop chrome | about 63px high | one compact public navigation row |
| Mobile chrome | about 54px high | brand plus one direct opening control |
| Profile desktop identity stage | about 431px art-led / 374px artless | artwork is atmosphere and identity, not a container requirement |
| Compare desktop identity stage | about 521px | two equal artwork territories with the radar at the seam |
| Compare mobile identity stage | about 217px | diptych remains legible above the editorial trade-off |

These are conformance references, not fixed page heights. Content and zoom are
allowed to make sections taller. Nothing may be clipped to preserve a specimen
height.

### 2.2 A7 reconciliation

The old A7 card is superseded wherever it conflicts with the accepted screens
or ADRs 0032–0034. Production uses the following reconciled rules:

1. **Three functional type roles, not two.** Archivo carries display, UI,
   labels and numerics; Newsreader carries authored editorial prose only;
   JetBrains Mono carries short evidence/status kickers only.
2. **A dark public ground with one deliberate warm editorial surface.** The
   warm paper band is allowed for concentrated fit/editorial reading; it is not
   a second generic card theme.
3. **Compare is art-led in its primary state.** It also has complete mixed-art
   and artless parity. “Compare is artwork-free by construction” is obsolete.
4. **The visible text floor is 12px.** The specimen's 8.5–11px labels are not
   production values. Decorative logo marks may be smaller only when adjacent
   full text supplies the accessible name.
5. **Interactive targets are at least 44×44 CSS px.** The specimen's compact
   shapes may be retained visually inside a larger hit area.
6. **Control boundaries and focus indicators are stronger than the specimen's
   faint hairlines.** Their contrast is part of the component contract.
7. **The homepage hero becomes modestly shorter.** Search gains prominence
   without changing the accepted proposition, mosaic, journey order or art
   direction.

The A1/A2 prototype phrase “See the full comparison — artwork-free” is also
obsolete. Production copy is **“See the full comparison”**. The accepted
homepage structure remains unchanged.

On 31 August, Fable 5 High updated A7 only with these reconciled rules. A text-
content integrity check over every artifact section before A7 was identical
before and after: 63,844 characters and SHA-256
`3cac48bd2b4106bc32dd6e7afe9d2b295783beca1f97dc6866d87c0b29460b62`.
This proves the bounded operation did not rewrite A1–A6, B-rail, C1–C4 or
C-rail at the text/semantic-content level; implementation conformance remains a
separate production check.

## 3. Foundations

### 3.1 Colour roles

Use semantic aliases from the token file. Raw colour values belong in the
token layer, not scattered component styles.

| Role | Token | Use |
|---|---|---|
| Canvas | `color.surface.canvas` | default page ground |
| Stage | `color.surface.stage` | cinematic identity and artwork territory |
| Chrome | `color.surface.chrome` | public header and modal chrome |
| Panel | `color.surface.panel` | instrument, relationship and structured-data panels |
| Raised panel | `color.surface.panelRaised` | nested interactive or selected state |
| Editorial | `color.surface.editorial` | Pull/Tax or fit prose where the accepted profile calls for paper contrast |
| Primary text | `color.text.primary` | titles and essential decisions |
| Muted/quiet text | `color.text.muted`, `color.text.quiet` | supporting context only; never critical distinctions |
| Coral | `color.brand.coral` | brand and primary affordance, never “better” |
| Cyan | `color.brand.evidenceCyan` | focus/evidence, never “worse” or “more correct” |

The relationship aliases `equal`, `close`, `difference` and `indeterminate`
are presentation aids. Every relation also has a word, marker geometry and
accessible sentence. Game colours identify the two games; they do not encode
quality.

Text and interactive boundaries must meet WCAG 2.1 AA contrast in the final
computed state. `border.control` is the minimum normal boundary for a control
on the dark ground. Disabled controls still remain identifiable, though they
need not meet the contrast requirement for active components.

### 3.2 Typography

| Role | Family | Production rule |
|---|---|---|
| Display/title | Archivo | restrained weight; no faux cinematic all-caps |
| UI, values and labels | Archivo | tabular numerals for aligned scores/time |
| Editorial interpretation | Newsreader | prose only; do not use for controls or data labels |
| Evidence/status kicker | JetBrains Mono | uppercase, `0.14em` tracking, 12px minimum |

Body copy defaults to 16px/1.5. Editorial prose may use 18–22px/1.6 depending
on measure. Hero display is approximately 3.8rem/1.05 desktop and 2.1rem/1.08
mobile. Profile titles are approximately 4.2rem desktop and 2.5rem mobile, but
use fluid sizing and wrap rather than truncating a game title.

No meaningful visible text is smaller than 0.75rem. Do not reproduce Fable's
9px radar labels or mobile Compare cue. Long-form copy targets 45–70 characters
per line; compact labels may wrap to two lines.

### 3.3 Spacing, borders and radii

Use the token spacing scale. Default public content is bounded by `82rem`, with
2.5rem desktop and 1rem mobile gutters. Structural page bands are square.
Controls use the control radius, media the media radius, and only feature
panels use the larger feature radius. Avoid turning every content group into a
rounded card.

Hairlines separate reading regions; they do not substitute for spacing.
Controls receive a visible boundary or a filled state and a focus outline that
does not depend on the browser's default clipping behavior.

### 3.4 Responsive contract

Implementation is content-first rather than device-class-first. Validate at:

- 320px minimum width;
- 390px reference mobile, including 390×667;
- 640px content breakpoint;
- 1024px wide-layout breakpoint;
- 1440px reference desktop;
- 200% browser text zoom at all relevant viewport widths.

At the 390×667 reference, the Search journey label and actual Search input must
be available before any introductory scroll. Use a desktop hero maximum of
about 27.5rem and a mobile target of about 25.5rem, then additionally constrain
the composition so header + hero + at least 12rem of the Search region fit in
`100svh` on short screens. Reduce artwork depth and decorative overlap before
reducing text or hiding Search.

At 200% zoom, all pages become a single reading column where necessary. No
two-dimensional component may create page-level horizontal scrolling. The
Compare diptych may remain side-by-side as a visual strip only while its text
and controls move into the normal vertical reading flow.

### 3.5 Motion

Motion explains state; it does not perform the meaning.

- Hover/focus colour: 150ms.
- Standard expand/collapse and control movement: 220ms.
- Artwork crossfade or restrained pan: 320ms.
- One-time atmospheric reveal: up to 600ms.
- No autoplaying carousel, looping parallax, pulsing score or radar drawing
  required to read the comparison.
- Under `prefers-reduced-motion: reduce`, atmospheric effects, parallax and
  animated chart drawing stop; state transitions are immediate or near-
  immediate and focus never moves unexpectedly.

## 4. Shared content and state grammar

### 4.1 Truth vocabulary

Use these states consistently:

| State | Meaning | Required presentation |
|---|---|---|
| Exact | one approved half-step value | number plus label and confidence |
| Range | evidence supports an approved interval | both endpoints; never a fabricated midpoint |
| Unknown | evidence cannot support a value | the word “Unknown”; no zero and no plotted point |
| Provisional | evaluation is usable but remains explicitly provisional | visible status near identity and relevant caveat |
| High/Medium/Low confidence | evidence confidence, not score quality | words available wherever confidence is shown |
| Omitted | an optional field has no approved record and its contract permits absence | component collapses cleanly without filler copy |

Unknown and zero are different. Range and uncertainty are different. A missing
artwork asset is not missing content. Confidence may alter annotation and line
treatment, never the geometry of an exact score.

### 4.2 Artwork state model

Every media component supports `cleared`, `loading`, `failed`, `absent` and
`not-eligible`. Only `cleared` artwork may render publicly. Loading reserves
geometry without showing a misleading dominant colour. Failed, absent and
not-eligible states switch to the authored artless composition; they do not
show a broken-image icon, empty black rectangle or apology.

In Compare, the state matrix is both / left only / right only / neither. One
artless side becomes a typographic game-colour territory of equal visual
weight. Credits attach to the relevant identity and do not disrupt the decision
reading order.

Where the adjacent title already names the game, artwork uses empty alt text
and remains outside the accessibility tree. A standalone meaningful image uses
the approved factual alt record. Every asset still follows the lawful seven-
step artwork path and placement clearance.

### 4.3 Destination and practical-time fallbacks

Practical time is not a ninth dimension. Render only approved values:

- total commitment: exact, bounded range, special state or Unknown;
- useful session: approved range or Unknown;
- platform/store destination: verified destination for the evaluated scope,
  with edition/platform caveat where required.

Never infer commitment bands from a Fable example, game length stereotype or
dimension value. If a required field has no source, use Unknown. If an optional
field's contract permits absence, omit the row. Do not publish a dead or
decorative destination action.

The public meaning and source of **Evaluated** remains unresolved. Do not ship
that label until its copy/data decision is approved. Other approved provenance
copy may occupy the space without implying a date.

## 5. Public chrome and journey navigation

### 5.1 Site chrome

Anatomy: wordmark, ranked public navigation, Search opening action and compact
mobile menu only where links no longer fit. The wordmark links home. Current
page indication uses text/shape as well as colour and has `aria-current="page"`.

Desktop maintains one compact row. Mobile keeps the wordmark and the direct
Search opening action visible; secondary links may enter a disclosure/menu.
Opening and closing any modal returns focus to its invoker.

### 5.2 Homepage journey switcher

Exact labels and order:

1. Search
2. Compare
3. What should I play?

Search is selected by default and is visually dominant. Compare never becomes
the default homepage subject.

If the three labels switch one colocated content region, implement them as a
manual-activation tablist: one tab in the tab sequence, Left/Right and
Home/End move focus, Enter/Space activates, and each tab owns one labelled
tabpanel. Selection keeps focus on the tab. On mobile, the same labels may use
stacked controls, but their semantics and order remain unchanged.

If a selected panel expands below the switcher, its first control is reached by
normal Tab; it is not focused automatically. Artwork remains visible behind or
beside the expanded interaction.

## 6. Search

### 6.1 Architecture boundary

Search consumes the editorially included static build-time registry. It does
not query Postgres, a game provider, a search service or an LLM per request.
Provider/import presence never publishes a title into Search without the
editorial inclusion flag.

### 6.2 Component anatomy

- persistent visible label;
- text input with search purpose and combobox semantics;
- clear action when non-empty;
- result list capped at seven suggestions;
- a status line for useful asynchronous/state announcements;
- state-specific result content and recovery action.

Use the ARIA combobox/listbox pattern with DOM focus retained in the input and
`aria-activedescendant` for the active option. Down/Up moves through results,
Enter chooses, Escape first closes the list and then clears only when explicitly
designed, and Tab follows normal page order. Pointer hover mirrors but does not
replace keyboard activation.

### 6.3 Four truthful states

| State | Render | Route/action |
|---|---|---|
| Published | exact title, scope/build context where needed | canonical published profile |
| Recognized but unprofiled | factual identity and honest coverage statement | no public stub; coverage request only after approved receiver/privacy contract |
| Ambiguous | candidate identities with enough year/edition/scope detail | user chooses one; do not silently prefer a published near-match |
| Unrecognized | no unsupported identity assertion | edit query and restrained suggestions if supported |

Loading retains the entered query. Empty returns editorial suggestions rather
than “no results.” Errors preserve the input and provide a retry; they never
convert recognized-unprofiled into unrecognized.

On mobile, the full-height Search sheet may be a modal dialog. It must have an
accessible name, focus containment, an explicit Close control, Escape support,
background inertness and focus return. The homepage inline Search remains
available without opening the modal.

## 7. Homepage components

### 7.1 Opening composition

The accepted decision-first proposition, three-game artwork mosaic and
integrated compact fingerprints remain. The artwork is atmospheric and may be
cropped; the proposition and Search are never cropped. The modest height
reduction described in §3.4 is the only planned compositional refinement.

Compact fingerprints are 72px desktop and 64px mobile targets. They are
decorative if the same eight exact values are immediately available in the
expanded preview/profile destination. If they convey unique information, give
the SVG a concise accessible name and expose a hidden ordered value list.

### 7.2 “Start somewhere interesting” rail

The rail is a semantic list of general-interest profile posters, not a ranking
or trending feed. It has labelled previous/next actions with 44px targets,
disabled end states, one-viewport-step movement and no autoplay or infinite
loop. Native horizontal scrolling remains available on touch.

A poster has one canonical title/profile link and, where used, a separate
preview disclosure button. Do not nest interactive elements. The preview
button uses `aria-expanded` and `aria-controls`; its panel follows the card in
DOM order. Escape closes and returns focus to the button. Hover or
`focus-within` may mirror the preview, but a keyboard user has an explicit
control and coherent next focus target. Expansion never hides the artwork.

Commitment may show an approved value, Unknown, or nothing according to the
contract. No poster fabricates a short/medium/long band.

### 7.3 Authored shelves

Shelves follow the general poster rail. Objective shelves require data that
actually proves membership; evergreen and living shelves use reviewed
configuration. Living shelves require start/expiry/fallback behavior. Empty or
expired shelves do not render a heading with an empty track.

“Choosing between…” remains a secondary curated module. Its summary may show
two identities, a compact paired radar and a trade-off sentence, but never a
winner or computed match. The route label is **“See the full comparison”**.

## 8. Profile page

### 8.1 Reading order and hierarchy

The semantic order is:

1. one page `h1` with game identity;
2. scope/build/platform and Provisional state;
3. rapid “Should I play this?” answer;
4. Pull and Tax;
5. fit guidance;
6. practical commitment;
7. full eight-dimension instrument;
8. trust, evidence, corrections and destinations.

Desktop may visually combine identity and the answer, but DOM order remains
meaningful without CSS. Mobile follows this order directly. Platform logos are
decorative marks adjacent to the full platform name; do not publish “XSX” or
similar abbreviations as the only label.

Artless profile pages collapse the media depth into a designed typographic
identity stage. They do not reserve the art-led hero height or show a blank.

### 8.2 Decision, Pull, Tax and fit

The decision answer is concise and conditional, not a review verdict. Pull and
Tax are paired editorial statements mapped from the governed interpretation
fields; neither is a score. Fit guidance answers who is likely to value the
experience and who should be cautious without diagnosing the visitor.

Long copy wraps and increases section height. Do not truncate methodological
meaning behind ellipses. Editorial prose may use the warm surface and
Newsreader; labels and values remain Archivo/JetBrains Mono by their roles.

### 8.3 Scope/platform controls

Use links when switching to a canonical scope URL; use a tablist only when the
URL does not change and one in-page panel is being selected. The active scope
has text/shape and `aria-current` or `aria-selected` as appropriate. Every
visible platform note/override is projected from the evaluated scope and does
not mutate the base score silently.

Changing scope must announce the new scope only when it occurs without
navigation. It must not move focus into the page body.

### 8.4 Evidence and disclosures

Dimension explanations and evidence confidence are available from each exact
row. Use native `details/summary` or a button with `aria-expanded` and
`aria-controls`. Expanded content follows its trigger, is reachable by normal
Tab, and does not trap focus. Escape may close a custom popover and return focus
when the component is genuinely overlaid; inline disclosure need not override
native behavior.

Corrections and evidence links use descriptive action text. “Editor reviewed”
and other approved provenance copy may appear; internal audit/calibration
language does not leak into the public voice.

## 9. The eight-dimension instrument

### 9.1 Invariants

- exactly eight methodology dimensions in canonical order;
- fixed public 0–10 scale in half steps;
- no catalog normalization or rescaling;
- no overall score, average, area, percentage or hidden winner logic;
- each axis answers only its rubric-defined question;
- exact value rows are authoritative and permanent;
- confidence, scope and Provisional uncertainty remain visible.

### 9.2 Three radar levels

| Level | Target | Function | Precision equivalent |
|---|---:|---|---|
| Homepage compact | 72px desktop / 64px mobile | recognizable fingerprint and profile identity | expanded preview or linked profile exact list |
| Profile full | about 360px desktop / 240px mobile | labelled overview of one fixed profile | adjacent eight exact/range/Unknown rows |
| Compare overview | about 340px desktop / 128px mobile | two-shape orientation at the artwork seam | aligned paired relationship rows |

Full radar labels are at least 12px and remain readable against artwork/panel
grounds. If mobile geometry cannot support eight unambiguous labels, the chart
is decorative and the exact rows immediately follow; do not shrink labels
below the floor.

For an exact score, plot the approved point. For Range, show the interval using
a band/gap treatment or omit the vertex; never plot a midpoint. For Unknown,
plot no point. The non-visual list says the dimension name, exact value/range/
Unknown, fixed scale and confidence.

Use `role="img"` with a concise labelled description only if the chart adds a
useful overview. Otherwise use `aria-hidden="true"`; do not make a screen
reader traverse SVG paths or eight redundant point nodes.

## 10. Full Compare

### 10.1 Route and eligibility

Compare is exactly two published profiles. The launcher is indexable at
`/compare`. A completed pair uses the order-preserving query state
`/compare?games=<left-slug>,<right-slug>`, is
`noindex,follow`, is absent from sitemap and pair schema, and is not
prerendered across all catalog combinations.

The route supports empty, left-only and both-selected states. A self-pair is
refused inline with a clear explanation and leaves the first selection intact.
Unpublished or recognized-only identities are not eligible.

### 10.2 Identity stage

Desktop uses two equal artwork territories with the paired radar at the seam,
visually “emanating” from both games. Mobile keeps a compact diptych and seam
radar before the editorial trade-off. The left and right identities always
have written names and persistent game-side markers, so colour/artwork are
supplementary.

Both-art, one-art and no-art states preserve equal identity weight. Loading and
failure resolve through the artwork state model in §4.2.

### 10.3 Editorial trade-off and relations

The first prose after identity answers the meaningful choice, not which game
wins. The relationship field then summarizes Equal, Close, Clear difference
and Indeterminate dimensions. It may be visually striking, but the exact rows
remain the methodological authority.

Relationship computation is fixed:

| Relationship | Exact-value rule | Visual and textual rule |
|---|---|---|
| Equal | delta = 0 | stacked/equal marker plus “Equal” |
| Close | delta = 0.5 | short bridge plus “Close” |
| Clear difference | delta ≥ 1.0 | separated endpoints plus “Clear difference” and direction by game name |
| Indeterminate | any Range, Unknown or incomparable state | no certainty-implying bridge; state and values written out |

Do not collapse a Range to a midpoint for relation classification. Confidence
affects explanatory copy and line style, not the exact geometry.

### 10.4 Canonical tag map

Tags are compared by canonical key, not display-string coincidence. Desktop
uses left-unique / shared / right-unique regions; mobile follows the same
reading order in a single flow. Shared traits are bright/central and explicitly
labelled “Shared”; unique traits remain attached to a named game. If a shared
key has different approved intensity, it remains shared and exposes both
intensities. Do not compute overlap counts or a compatibility percentage.

### 10.5 Paired exact rows

Every row names the dimension once, then exposes left game value, relation and
right game value in a stable order. Desktop may use a dot/dumbbell treatment;
mobile stacks values while retaining left then right order. The accessible
group name is equivalent to:

> Narrative Momentum. Alan Wake 2: 9 out of 10, medium confidence. Returnal: 4
> out of 10, high confidence. Clear difference; Alan Wake 2 is higher by 5.

Range says both endpoints. Unknown says Unknown. No row relies on endpoint
position, brightness, colour or hover to convey its relationship.

### 10.6 Compare controls

Each identity has a **Replace** action with the game name in its accessible
name. Replacing one side preserves the other. A modal selector follows the
Search dialog contract and returns focus to the invoking Replace control.

**Copy link** announces success or failure in a polite live region without
changing its accessible name mid-focus. If Clipboard API access fails, reveal
a selected read-only URL field and instructions. The action does not claim the
pair page is canonical/indexable.

Focus order is public chrome, left identity actions, right identity actions,
trade-off/relations, tags, row disclosures, left Replace, right Replace, Copy
link, footer. Visual repositioning must not reorder DOM focus.

## 11. Component ownership and implementation map

Reuse the existing truth and rendering boundaries; introduce new public
components only where the accepted system needs them.

| Concern | Existing owner to reuse | Planned public component/extension |
|---|---|---|
| Public shell | `components/SiteChrome.tsx` | ranked navigation, Search opener, mobile disclosure |
| Homepage | `app/(public)/page.tsx`, `components/GameCard.tsx` | `JourneySwitcher`, `SearchField`, `PosterRail`, `EditorialShelf`, `CuratedCompare` |
| Profile route/data | canonical game routes, `components/profile/ProfilePage.tsx` | retain build-time data boundary |
| Profile composition | `GameProfile.tsx`, `GameStage.tsx`, `ProfileLower.tsx`, `profile.css` | implement accepted A3–A6 variants in this slice |
| Scope | `ScopeSwitcher.tsx`, canonical URLs | full platform names/logos and note/override projection |
| Radar/instrument | `instrument.tsx`, `radar.tsx`, `lib/radar/geometry.ts` | three presentation variants; exact rows authoritative |
| Artwork | `lib/profile/artwork.ts`, `lib/profile/accent.ts` | `ArtworkTerritory` with cleared/loading/fallback states |
| Search truth | `lib/search/registry.ts` | static emitted index, combobox and mobile dialog |
| Compare truth | profile/radar/order contracts | new `/compare` route, `CompareStage`, `RelationField`, `TagMap`, `PairedInstrument` |
| Practical time | `lib/discovery/time.ts` | profile fact band only after approved record/source |
| Store actions | `lib/commerce/storefront.ts` | verified destinations and conservative unavailable state |
| Metadata | current SEO helpers | launcher metadata; pair `noindex,follow`; no pair schema/sitemap |

Do not refactor the broad `GameProfile` client boundary before the Gate B
implementation slice needs it. Do not begin session/facet/eleven-axis schema
expansions before the real editorial trial proves the required persistence.

JetBrains Mono currently lives only in the design-lab asset area. Promote a
proper licensed production font asset during the shared-foundation slice;
never reference a design-lab route or generated Fable file at runtime.

## 12. Required state fixtures

Each component story/test fixture must use explicit, reviewable data. At
minimum cover:

- short and very long game titles;
- one game with several current scopes;
- exact 0, 0.5, middle and 10 values;
- Range crossing a relation threshold;
- Unknown beside exact and Unknown beside Unknown;
- Provisional profile with Low confidence;
- complete Pull/Tax and deliberately absent optional practical fact;
- both artwork, left-only, right-only, no artwork, slow load and failed image;
- published, recognized-unprofiled, ambiguous and unrecognized Search;
- empty, half-selected, valid and self-pair Compare;
- shared tag with equal intensity, shared tag with different intensity, and
  side-unique tags;
- long platform names and a material platform override;
- 320px, 390×667, 1440px and 200% zoom.

Fable's Alan Wake 2 / Returnal values may be used only when they match approved
canonical fixtures. Otherwise use labelled test fixtures that cannot be
mistaken for publication content.

## 13. Interaction and accessibility acceptance

The detailed test matrix is in
[`Should_I_Play_Accessibility_and_Conformance_Matrix_v1.0_2026-08-31.md`](Should_I_Play_Accessibility_and_Conformance_Matrix_v1.0_2026-08-31.md).
The cross-surface minimum is:

- WCAG 2.1 AA colour, text resize, reflow and non-text contrast;
- one logical `h1`, ordered headings and landmark names;
- all functions keyboard-operable with visible focus and no trap;
- 44×44 target minimum;
- no meaning conveyed by artwork, colour, brightness, position or animation
  alone;
- exact score/range/Unknown and confidence available as text;
- dialogs named, contained, Escape-closeable and focus-returning;
- live regions limited to result/status changes that need announcement;
- reduced-motion behavior verified;
- 320px and 200% zoom without page-level horizontal scrolling;
- loading/error/empty states retain context and recovery.

## 14. Implementation slices and definition of done

### Slice 1 — shared foundation and static Search

Promote the token layer and production fonts, update chrome, emit the static
registry, and implement inline/mobile Search with all four states. The accepted
homepage hero refinement may be included when the opening Search is integrated.

**Done when:** Search works by keyboard and touch at 320px/390×667/desktop,
there is no request-time service, unprofiled titles have no public stubs, and
all state copy is truthful. A coverage-request control is absent until its
receiver/privacy contract exists.

### Slice 2 — accepted homepage system

Implement A1/A2 composition, the poster rail, authored shelves and secondary
curated Compare. Preserve artwork during expanded interactions.

**Done when:** A1/A2 conformance is reviewed at 1440/390, Search remains the
default and first-viewport control, rail/disclosures have coherent keyboard
behavior, and no specimen commitment values enter production.

### Slice 3 — accepted profile system

Implement A3–A6, practical/store rows only where truth contracts are ready,
three-level radar support, scope/platform truth and evidence disclosures.

**Done when:** art-led/artless parity, fixed eight values, Range/Unknown/
Provisional/confidence, 200% reflow and the mobile reading order pass. The
existing client boundary may be refactored only as this slice requires.

### Slice 4 — accepted full Compare

Implement `/compare`, order-preserving pair state, art-led/mixed/artless
identity, relationship field, canonical tags, paired rows and share action.

**Done when:** exactly-two/self-pair behavior, interval-aware relationships,
URL/index rules, both/one/no-art states, keyboard/dialog/share behavior and all
non-colour equivalents pass. No winner/aggregate/match percentage exists in UI,
metadata or code.

### Slice 5 — visual conformance and accessibility closure

Capture reference screenshots, compare against the accepted frames, run the
matrix and record deliberate drift.

**Done when:** every material difference is either corrected or logged with
reason, owner and evidence; accessibility defects are fixed; and production
content is independently checked against approved records.

## 15. Deliberate-drift log

For every intentional departure from the accepted specimen, record:

| Field | Required content |
|---|---|
| Surface/component | exact location |
| Reference | A/C screen and viewport |
| Observed difference | measurable description |
| Reason | content truth, accessibility, responsive stress, technical limit or approved refinement |
| Decision/evidence | ADR, contract, test or owner acceptance |
| Owner/date | accountable person and timestamp |
| Follow-up | none, revisit threshold or linked issue |

The known initial entries are: the shorter homepage hero; 12px label floor;
44px targets; stronger control boundaries/focus; production three-type-role
system; warm editorial-surface exception; and removal of stale artwork-free
Compare copy.

## 16. Handoff exit checklist

- [x] Accepted A1–A6/C1–C4 measured and reconciled.
- [x] Semantic machine-readable token map created.
- [x] A7 conflicts resolved in this governing handoff.
- [x] Component anatomy and responsive behavior specified.
- [x] Search, artwork, uncertainty and data fallbacks specified.
- [x] Three radar levels and authoritative exact equivalents specified.
- [x] Exactly-two Compare relationships, tags and URL/index behavior specified.
- [x] Keyboard, focus, screen-reader, motion and zoom contracts specified.
- [x] Repository ownership and implementation order mapped.
- [x] Acceptance fixtures, conformance matrix and deliberate-drift format defined.

The design-system/interaction handoff is complete. The next engineering slice
is the shared public foundation plus editorially governed static Search.
