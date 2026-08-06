# Game Profile — Art Direction & Anti-AI Design Brief v0.1
**Date:** 2026-08-06  
**Status:** Prepared now; activate at the dedicated UI/UX checkpoint  
**Owner:** Tomas  
**Product / design orchestration:** ChatGPT  
**Implementation / exploration:** Claude

---

# 0. Activation rule

**Do not use this document to trigger a production redesign yet.**

Activate this brief only when the functional vertical slice has reached all of these conditions:

- `/games/[slug]` works structurally,
- radar/spider profile works,
- exact score rows work,
- responsive skeleton exists,
- evidence/provenance model has been reconciled,
- seeded contrasting profiles render correctly,
- no major data-model blocker remains.

At that point ChatGPT should explicitly tell Tomas:

> **Now is the UI/UX checkpoint.**

Claude should then enter a separate **D0 Art Direction phase** before production visual polish.

---

# 1. The design problem

Game Profile has an unusual product idea:

> **Games have shapes, not one universal score.**

The visual design must feel equally authored.

A technically polished interface that looks like a generic AI-generated SaaS/gaming site is a product failure.

The site must not resemble the common “vibecoded” visual grammar:
- dark navy canvas,
- blue/purple gradients,
- glowing blobs,
- rounded glass cards,
- bento grids,
- pill-shaped everything,
- generic icon decoration,
- giant centered hero headline,
- excessive empty space,
- default component-library aesthetics.

The goal is not merely to be attractive.

The goal is to be **recognizable**.

A screenshot of a Game Profile page should eventually be identifiable as Game Profile even if the logo is removed.

---

# 2. North-star visual concept

## Editorial scouting instrument

The strongest conceptual territory is a hybrid of:

- premium game editorial,
- football/player scouting report,
- film/archive dossier,
- analytical reference sheet.

Borrow the **information mentality** from scouting:
- shape,
- attributes,
- evidence,
- comparison,
- strengths and weaknesses.

Borrow the **art direction mentality** from premium editorial:
- typography,
- asymmetry,
- image composition,
- confident hierarchy,
- intentional density.

Borrow the **credibility language** of a research dossier:
- source marks,
- footnotes,
- revision state,
- confidence,
- evidence trails.

Do **not** literally make it look like:
- a football manager game,
- a scientific lab dashboard,
- a magazine spread,
- a military HUD.

The product should synthesize those influences into its own grammar.

---

# 3. Anti-AI Design Manifesto

## Game Profile must not look generated.

Avoid these patterns unless there is a clear functional justification:

### Layout anti-patterns
- generic bento grids,
- every section inside a card,
- repeated identical rectangles,
- centered landing-page hero + subtitle + CTA,
- symmetric “three feature cards” compositions,
- dashboard sidebars by default,
- floating panels on floating panels,
- excessively wide gutters that create artificial “premium” emptiness.

### Surface anti-patterns
- glassmorphism,
- frosted blur panels,
- ubiquitous drop shadows,
- 16–24px corner radii everywhere,
- gradient borders,
- glowing strokes,
- blue/purple ambient blobs,
- translucent card soup.

### Typography anti-patterns
- default Inter/Geist-style SaaS hierarchy,
- every heading as generic semibold sans,
- giant marketing headline with tiny gray subtitle,
- excessive all-caps without hierarchy,
- decorative type choices unsupported by the editorial system.

### Interaction anti-patterns
- meaningless hover lift,
- every button as a pill,
- decorative motion with no information value,
- gratuitous parallax,
- animated gradients,
- carousel-heavy layouts,
- icon-only controls where words are clearer.

### Content anti-patterns
- emoji/icons representing every category,
- generic AI copy such as “Dive deeper into your gaming journey,”
- vague praise,
- empty marketing language,
- “smart insights” branding around normal information.

---

# 4. Preferred design grammar

Prefer:

- typography as structure,
- hard rules and fine dividers,
- sharp or nearly sharp corners,
- asymmetric page composition,
- deliberate density,
- strong baseline alignment,
- meaningful negative space rather than large empty zones,
- editorial labels,
- restrained metadata,
- game artwork cropped compositionally,
- data integrated into the page rather than isolated in widgets,
- minimal iconography,
- one coherent accent system,
- visual hierarchy created through scale/weight/position before containers.

The page is the canvas.

A card must earn its existence.

---

# 5. Product personality

Game Profile should feel:

- intelligent,
- discerning,
- premium,
- analytical,
- editorial,
- calm,
- cinematic in restraint,
- confident without pretending objectivity,
- dense enough to reward enthusiasts,
- approachable enough for purchase decisions.

It should **not** feel:

- corporate SaaS,
- esports,
- streamer culture,
- tech-startup futurism,
- AI product,
- “gamer neon,”
- hyper-minimal fashion site,
- fan wiki,
- conventional review magazine.

---

# 6. Typography direction

Typography should do much of the visual work.

## Required exploration

Claude must test at least two fundamentally different typography systems during D0:

### System A — Editorial contrast
- distinctive display grotesque / condensed sans for titles, labels and numbers,
- serif or humanist editorial face for explanations and long-form rationale.

### System B — Analytical mono/grotesque
- characterful grotesque for titles/body,
- restrained mono or technical face for scores, evidence IDs, metadata and source references.

Do not choose the final system based only on “looks cool.”

Evaluate:
- game-title presence,
- dense score readability,
- mobile readability,
- evidence/citation legibility,
- long game names,
- multilingual resilience if Hebrew/localization is ever added,
- numeric differentiation.

## Typography rules

- Game title may be very large, but must participate in composition rather than behave like a marketing hero.
- Scores should be typographically strong.
- Metadata should be compact and quiet.
- Long explanations should have excellent reading measure.
- Avoid six near-identical font weights as hierarchy.
- Avoid uppercase everywhere.
- Avoid generic 14px gray text as the default secondary language.

---

# 7. Color strategy

Color should support identity without becoming the identity.

## Base palette

Explore both:

### Dark editorial
Near-black / charcoal / warm gray, not default navy-black.

### Light editorial
Warm off-white / paper-like neutral / black typography.

**A light default direction must genuinely be explored.**
Gaming products disproportionately default to dark mode; a strong light editorial approach may be more distinctive.

## Game-specific accent

A game may contribute one restrained accent derived from:
- key art,
- logo,
- dominant thematic color.

Examples conceptually:
- Alan Wake 2 → warm red / amber,
- Halo → restrained olive / military green,
- Expedition 33 → muted gold / blue.

Rules:
- accent never reduces product consistency,
- do not recolor every dimension differently by default,
- do not create rainbow radar charts,
- color must not communicate “good/bad” by itself.

---

# 8. Surface and geometry rules

Default:
- square / 0–4px radius,
- occasional deliberate larger radius only when functionally meaningful,
- minimal shadows,
- visible lines/dividers preferred to floating elevation.

Allowed card use:
- modal/drawer,
- clearly bounded interactive object,
- comparison object where separation is necessary,
- compact mobile grouping.

Not allowed:
- wrapping every paragraph, score, source and recommendation in its own rounded card.

---

# 9. Image treatment

Game artwork is editorial material, not wallpaper.

Prefer:
- aggressive but intentional crops,
- art breaking column boundaries,
- edge-to-edge image regions,
- contrast between image and analytical content,
- image masks/shapes only if they become a repeatable visual language.

Avoid:
- full-screen blurred hero backgrounds,
- dark overlays behind centered marketing copy,
- cover image inside a generic rounded card with glow,
- random screenshots used as decoration.

Artwork should create atmosphere while the **Game Profile data remains the protagonist**.

---

# 10. Signature radar / spider treatment

The radar is one of the product’s signature assets.

It must not look like:
- a default Recharts demo,
- a business BI widget,
- a football-game clone.

## Semantics — locked

Eight axes, clockwise:

1. Story & Characters
2. Thematic & Emotional
3. Atmosphere & World
4. Medium-Specific Craft
5. Agency & Satisfaction
6. Execution & Polish
7. Structure & Focus
8. Pacing & Time Respect

Rules:
- no area-derived overall score,
- no red/green grading,
- unknown is never zero,
- exact numeric rows remain available,
- max two profiles overlaid,
- accessibility always preserved.

## D0 visual exploration must test

At least:
- grid prominence,
- label position,
- integrated score numerals,
- polygon fill strength,
- center treatment,
- axis-line treatment,
- game accent usage,
- uncertainty/range treatment,
- mobile label strategy.

The radar should eventually be recognizable enough that:

> **polygon + Game Profile typography = identifiable product**

without a logo.

---

# 11. Exact score rows

Radar = shape.

Rows = precision.

Rows should feel like a scouting/editorial sheet, not progress bars in a SaaS dashboard.

Explore:
- fine baseline tracks,
- typographic dots/rules,
- score numeral aligned at a hard edge,
- dimension names with restrained hierarchy,
- optional tiny confidence/evidence marker.

Avoid:
- chunky colorful progress bars,
- rounded progress pills,
- traffic-light colors,
- individual cards per dimension.

Example conceptual rhythm:

`STORY & CHARACTERS ........................ 9.5`

or an equivalent bespoke visual language.

---

# 12. Evidence and provenance visual language

Evidence should look like **research apparatus**, not another accordion full of cards.

Potential grammar:
- superscript source IDs,
- numbered source markers,
- margin notes,
- footnote-like citations,
- thin evidence rail,
- right-side annotation column on desktop,
- bottom sheet on mobile.

Example:

`ATMOSPHERE & WORLD — 9.5`

`01  Sense of Place .................... 2.0`
`02  Mood Strength ..................... 2.0`
`03  Audiovisual Identity .............. 2.0`
`04  World Coherence / Myth ............ 1.5`
`05  Memory Residue .................... 2.0`

`Evidence  [04] [07] [09] [11]`

The point is to make transparency feel native to the art direction.

---

# 13. Primary Pull / Primary Risk

Do not place these in two generic colored cards.

Explore editorial treatments such as:
- opposing columns,
- top/bottom annotations,
- marginal labels,
- horizontal ruled sections,
- “Pull / Risk” typographic pair.

They should be among the fastest things to scan after the radar.

---

# 14. Recommendation blocks

Released:
- Great fit if…
- Know before buying…
- Probably not for you if…

Pre-release:
- Looks promising if…
- Watch before buying…
- Biggest unknowns…

These must remain highly legible but should not become three matching bento cards.

Explore:
- three editorial columns,
- sequential ruled sections,
- differing typographic emphasis,
- desktop horizontal / mobile vertical transformation.

---

# 15. Comparison design

The compare experience should feel like scouting two players/two machines, not an ecommerce spec table.

For two games:
- side-by-side title/art identity,
- two radar silhouettes,
- aligned dimension rows,
- clear delta emphasis,
- one concise “what separates them?” editorial statement.

For 3–4 games:
- no multi-polygon radar mess,
- aligned table/bars,
- strong typographic column headers,
- sticky dimension labels where useful.

No “WINNER” badge.

The product explains difference; it does not crown a universal champion.

---

# 16. Navigation direction

Navigation should be quiet.

MVP primary concepts:
- Search
- Discover
- Compare
- Methodology

Avoid:
- giant pill nav,
- app-dashboard sidebar unless information architecture later demands it,
- decorative icons beside every nav item.

Search is a core behavior and may deserve more visual emphasis than navigation chrome.

---

# 17. Mobile philosophy

Mobile is not a compressed desktop dashboard.

Priorities:
1. title / status / core metadata,
2. profile silhouette,
3. primary pull/risk,
4. exact dimensions,
5. recommendation interpretation,
6. evidence on demand.

Radar labels must remain readable.

Do not solve mobile by:
- shrinking everything,
- hiding all context behind icons,
- turning every section into horizontal carousels.

---

# 18. Motion

Motion must communicate.

Acceptable:
- subtle radar reveal on first profile load,
- score-row transition that reinforces measurement,
- evidence drawer transition,
- compare delta transition,
- image transition where it supports navigation.

Avoid:
- perpetual ambient motion,
- floating blobs,
- decorative scroll effects,
- everything fading/sliding independently,
- hover-scale on every interactive surface.

Respect reduced-motion settings.

---

# 19. Three D0 exploration directions

Claude must produce **three compositionally distinct directions** for the **same Alan Wake 2 profile**.

They must differ in:
- layout,
- typography,
- information density,
- artwork treatment,
- radar integration,
- evidence treatment.

Changing only colors does not count.

## Direction A — Editorial Dossier

Characteristics:
- magazine/archive influence,
- strong asymmetric grid,
- oversized title typography,
- game art interacting with layout,
- serif/grotesque contrast,
- evidence as marginalia/footnotes,
- radar feels like an analytical stamp inside an editorial spread.

Question:
> Can Game Profile feel authoritative and beautiful without looking like software?

## Direction B — Scouting Sheet

Characteristics:
- denser,
- more analytical,
- radar as primary anchor,
- hard grid/rules,
- strong score numerals,
- compact metadata,
- evidence/source markers,
- highly scannable.

Question:
> Can Game Profile become an instantly readable “player card for games” without literally copying sports UI?

## Direction C — Cinematic Archive

Characteristics:
- strong artwork composition,
- restrained dark/light fields,
- archival labels,
- cinematic typography,
- data appearing as annotations embedded around the artwork/profile,
- radar less boxed, more integrated.

Question:
> Can the page feel like a premium cultural artifact while remaining a serious decision tool?

---

# 20. Mandatory fourth direction

After Tomas + ChatGPT review A/B/C:

Claude must create **Direction D — Consolidated Game Profile**.

Direction D should intentionally combine selected strengths from the exploration.

Example review language:
- keep A typography,
- keep B radar treatment,
- keep C art crop,
- reject all three navigation patterns.

Do not directly ship A/B/C.

The exploration exists to generate parts, not to force selection of a whole concept.

---

# 21. Design-lab workflow for Claude

At D0 activation:

Create a non-production route such as:

`/design-lab/profile`

or equivalent.

Requirements:
- no production page replacement,
- all directions render the same profile data,
- desktop and mobile examples,
- easy switching A/B/C/D,
- screenshots at fixed widths.

Recommended screenshot widths:
- ~390px mobile,
- ~768px tablet,
- ~1440px desktop.

Do not spend time making design-lab architecture elegant.
It is disposable experimentation infrastructure.

---

# 22. D0 deliverables

Claude must provide:

1. A, B, C desktop screenshots.
2. A, B, C mobile screenshots.
3. Short rationale for each direction.
4. Explicit list of intentional anti-AI choices.
5. Notes on accessibility/readability tradeoffs.
6. No production implementation yet.
7. After review: Direction D.
8. Final D screenshots desktop/mobile.
9. Proposed design tokens only after D is approved.

---

# 23. Design critique checklist

For every direction ask:

## Identity
- Could this screenshot plausibly belong to 50 other AI-built products?
- Is there a recognizable Game Profile grammar?
- Does the radar feel proprietary?

## Product comprehension
- Can I understand the game’s shape in seconds?
- Are pull/risk immediately visible?
- Can I find exact scores quickly?
- Does evidence feel trustworthy rather than cluttered?

## Visual authorship
- Is layout driven by content, or by component-library defaults?
- Is typography doing real work?
- Are containers necessary?
- Is the composition interesting without gimmicks?

## Restraint
- Are there decorative elements with no job?
- Is game art overpowering the analytical product?
- Is there too much color?
- Is motion serving meaning?

## Mobile
- Does mobile preserve identity?
- Is anything tiny because desktop was merely squeezed?
- Are radar labels readable?
- Is evidence discoverable?

If the answer to the first Identity question is “yes,” reject the direction.

---

# 24. Design tokens — do not lock prematurely

Do not define final:
- color palette,
- font stack,
- radius scale,
- shadow scale,
- spacing system,
- animation language

before Direction D is approved.

The design system should be **derived from the art direction**, not allowed to determine it.

This is intentionally the reverse of the normal component-library-first workflow.

---

# 25. Component-library rule

Radix/shadcn/headless primitives may be used internally for accessibility and behavior.

They must **not define visual identity**.

If a component still visibly looks like stock shadcn after styling, it is not finished.

Default library appearance is implementation scaffolding only.

---

# 26. Game-specific personality without product fragmentation

The product frame stays stable.

A game can vary:
- accent color,
- hero/art crop,
- selected image material.

A game should not vary:
- typography family,
- radar grammar,
- evidence language,
- scoring layout,
- navigation system,
- core spacing/grid philosophy.

This lets Alan Wake 2 feel like Alan Wake 2 while still unmistakably being a Game Profile page.

---

# 27. Home / discovery implications

Do not design the homepage first.

The **game profile page is the visual source of truth**.

Once its language is approved:
- derive game cards,
- derive search results,
- derive discovery,
- derive compare,
- derive home.

This prevents the brand from becoming a generic marketing homepage wrapped around a distinctive inner product.

---

# 28. Brand/logo implication

Do not let logo design delay product art direction.

The interface grammar should be recognizable before the logo exists.

A future mark may potentially draw from:
- polygon/profile shape,
- axis geometry,
- measurement/reference-sheet language.

But no logo exploration is required for D0.

---

# 29. Accessibility is part of the art direction

Distinctive does not mean obscure.

Requirements:
- strong contrast,
- readable body measure,
- keyboard navigation,
- no color-only state,
- exact values outside radar,
- semantic headings,
- visible focus,
- reduced motion,
- mobile tap targets.

Any visual concept that depends on illegibility to feel “editorial” is rejected.

---

# 30. Success criteria

The D0 phase passes when:

1. Alan Wake 2, Returnal and Redfall look unmistakably different **because of their data**, not because each got a different website skin.
2. The product itself remains unmistakably the same.
3. Someone can identify the profile silhouette rapidly.
4. Exact scores remain easy to read.
5. Evidence feels like part of the product, not an appendix.
6. Mobile retains the visual identity.
7. The interface does not resemble generic AI/SaaS output.
8. Tomas and ChatGPT can articulate the chosen visual grammar in concrete terms.

---

# 31. Prompt to use when D0 is activated

Do not send this prompt until ChatGPT explicitly says the project has reached the UI/UX checkpoint.

> We are now entering **D0 — Art Direction** for Game Profile.
>
> Read `Game_Profile_Art_Direction_and_Anti_AI_Design_Brief_v0.1.md` completely before changing production UI.
>
> This is an exploration phase, not a redesign implementation phase.
>
> Create a disposable `/design-lab/profile` environment and produce three genuinely different visual directions — A: Editorial Dossier, B: Scouting Sheet, C: Cinematic Archive — using the exact same Alan Wake 2 profile data.
>
> The directions must differ at the level of composition, typography, density, artwork treatment, radar integration and evidence treatment. Color swaps do not count.
>
> Do not replace the current production profile page yet.
>
> For each direction, provide 1440px desktop and ~390px mobile screenshots, a short rationale, and identify the specific choices you made to avoid generic AI/vibecoded aesthetics.
>
> Follow the Anti-AI Design Manifesto strictly. In particular, avoid generic bento layouts, card soup, glassmorphism, purple/blue gradient ambience, pill-everything UI, stock shadcn appearance, decorative Lucide iconography and generic centered SaaS hero composition.
>
> The radar/spider profile is a signature visualization and must feel bespoke rather than like a chart-library demo.
>
> Stop after A/B/C and their screenshots. Do not consolidate or productionize until Tomas and ChatGPT review the directions.

---

# 32. Current status

**Prepared:** yes.  
**Send to Claude now:** no.  
**Activation trigger:** functional profile vertical slice + evidence architecture reconciled.  
**Next action when trigger is reached:** ChatGPT explicitly informs Tomas that it is time for the UI/UX checkpoint.
