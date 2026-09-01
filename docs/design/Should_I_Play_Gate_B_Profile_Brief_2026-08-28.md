# Should I Play? — Gate B Profile Design Brief

**Date:** 2026-08-28  
**Gate:** B — A3–A6 only  
**Design tool/model:** Fable High  
**Status:** implemented in Fable and accepted by Tomas on 30 August 2026; ADR
0032 governs the resulting screens

## 1. Outcome

Revise the existing profile screens so a visitor can answer **“Should I play
this?”** quickly, then inspect the eight-dimension evidence without the page
feeling like a report.

Produce four canonical screens in the existing **Should I Play - Canonical
Screens** file:

- **A3:** art-led desktop profile;
- **A4:** art-led mobile profile;
- **A5:** complete artless desktop profile;
- **A6:** complete artless mobile profile.

Use the same published Alan Wake 2 profile for all four. Artless is a rendering
state, not a different or lesser content state. Do not revise A1/A2.

## 2. Governing inputs

1. Master Product and Build Plan v0.9, amended 28 August.
2. Public Product Resolution Register, including the Gate A amendment.
3. ADR 0030 and the accepted A1/A2 Rev 5.1 direction.
4. ADRs 0030 and 0032 as the governing public visual/profile direction; ADR
   0013 is superseded historical lineage.
5. Scoring Rubric v1.0, Evidence SOP v0.2 and the candidate protocol's
   uncertainty/confidence contracts.
6. **Should I Play? — Score and Radar Audit**, 28 August 2026.
7. Canonical repository content for Alan Wake 2, Returnal and Redfall.

The Fable artifact complements these sources. It does not own publication
scores, scope, evidence, time data or artwork rights.

## 3. User questions and success test

The page must answer, in this order:

1. **What game and exact scope is this?**
2. **What is it like to play?**
3. **What is the pull, and what tax must I accept?**
4. **Who is it a strong or poor fit for?**
5. **How much time and what kind of session does it ask?**
6. **What is its eight-dimension shape, exact value by exact value?**
7. **How confident and current is this evaluation?**
8. **What material platform/build differences apply?**
9. **Where can I play it, compare it or continue browsing?**

The design succeeds when the first five questions are answerable before a
reader enters the methodological detail, while questions six through eight
remain precise, trustworthy and easy to inspect.

## 4. Locked product and visual constraints

- Public product is **Should I Play?**; Game Profile names the method.
- Exactly eight dimensions on the fixed 0–10 scale.
- No aggregate, average, total area, rank, match percentage, winner, popularity
  or trending language.
- Low is descriptive; Unknown is not zero; range is not midpointed.
- Scope, build, platform, evidence confidence and provisional uncertainty stay
  explicit.
- Dark, cinematic, deliberately art-directed opening compatible with A1/A2.
- Graphite/warm-paper reading system, Archivo + Newsreader, ruled/hairline
  hierarchy, zero-radius grammar and restrained game-led accent.
- Authentic artwork may be used only as **PRIVATE DESIGN-ONLY** unless already
  cleared. Do not make a rights claim.
- The no-art state is complete, intentional and equal in hierarchy/content.
- Platform logos replace abbreviations such as “XSX”; every logo has an
  adjacent or accessible full platform name.
- No card soup, dashboard, storefront takeover, magazine template, glass,
  gradient gamer HUD, decorative telemetry or generic AI styling.

## 5. Canonical A3–A6 content specimen

### 5.1 Publication-truth fields

**Title:** Alan Wake 2  
**Developer:** Remedy Entertainment  
**Scope:** Base game · Single-player campaign · current retail build,
post-launch updates applied  
**Platforms:** PlayStation 5 · Xbox Series X|S · PC  
**Evidence state:** Verified  
**Overall confidence:** High  
**Evidence cutoff:** 6 August 2026  
**Platform warning:** PC performance varies sharply with ray-tracing and
path-tracing settings. Console versions are the stable reference experience.

**One-line experience**  
A deliberately slow horror mystery told from two sides at once, where
assembling the story is the main act of play and combat is a rationed
interruption.

**The pull**  
A uniquely authored survival-horror experience where audiovisual design,
narrative structure and interactivity continually reinforce one another.

**The tax**  
Slow investigative movement, backtracking and comparatively modest combat
depth can feel heavy if you want constant mechanical momentum.

“The tax” is the public rendering of the structured Primary Risk: the
load-bearing friction or cost a player must accept, not a penalty or negative
score.

**Fit guidance**

- Strong fit if ambitious authored narrative, atmosphere and investigation
  matter as much as combat.
- Know first: case-board work, exploration and attentive reading consume real
  time; combat is not the main reason to play.
- Probably not for you if slow traversal, dense metanarrative or restrained
  combat reliably becomes friction.

### 5.2 Exact instrument values

Use public radar order:

| Dimension | Value | Confidence |
|---|---:|---|
| Story & Character Investment | 9.5 | High |
| Thematic & Emotional Impact | 9.5 | High |
| Atmosphere & World Pull | 10 | High |
| Medium-Specific Craft | 10 | High |
| Agency & Satisfaction | 7.5 | High |
| Execution & Polish | 9 | Medium |
| Structure & Focus | 8.5 | High |
| Pacing & Time Respect | 8 | High |

These values are canonical. Do not copy a polygon from Fable; generate geometry
from this ordered list on the fixed scale.

### 5.3 Practical-time design specimen

The repository does not yet contain an approved source/provider record for
Alan Wake 2 practical time. To draw the component, use the following only when
it is visibly annotated in the design note as **DESIGN SPECIMEN — NOT
PUBLICATION TRUTH**:

- Total commitment: **Substantial**;
- focused 18 h · engaged 27 h · completionist 40 h;
- useful session: **45–90 minutes**;
- interruption: safest at chapter breaks; mid-scene saves are rationed;
- controlled summary: **Needs room to breathe.**

The finished product must replace this with an approved scope-aware record or
show Unknown. Do not present the design specimen as sourced fact.

The public label/source semantics for **Evaluated** remain open. The specimen's
evidence cutoff must not silently settle whether production uses
`evidence_cutoff_at`, `published_at` or a separately modelled field.

## 6. Required information hierarchy

### 6.1 Desktop reading order

1. **Global chrome** — quiet and subordinate.
2. **Identity stage** — authentic hero crop or deliberate artless identity;
   title, developer, full platform logos/names and game accent.
3. **Scope/status line** — scope/build, Verified/Provisional, overall confidence
   and evaluated date in one compact but readable block.
4. **Immediate decision answer** — one-line experience, then balanced **The
   pull / The tax**. This is editorial voice and visually outranks the chart.
5. **At-a-glance fit and commitment** — concise fit guidance beside two separate
   practical facts: total commitment and useful session/interruption. Do not
   turn these into a ninth axis.
6. **Full profile instrument** — labelled radar plus exact aligned rows,
   confidence and expandable explanations.
7. **Detailed fit guidance and experience traits** — scan-friendly, not a grid
   of interchangeable cards.
8. **Scope/build/platform detail** — platform warning and sibling scope switcher
   only where real.
9. **Where to play** — verified official destinations, visually secondary to
   editorial judgment; no live-price comparison.
10. **Trust/evidence band** — editor reviewed, evidence cutoff/status,
    methodology link, access disclosure if applicable, contextual corrections.
11. **Exit** — editor-selected Compare with; more profiles.

At 1440×900, title, exact scope/status, one-line answer, Pull/Tax and the two
practical facts should be visible without scrolling. The radar may begin at the
fold but must not displace the answer.

### 6.2 Mobile reading order

Use the same DOM and conceptual order:

1. compact identity stage;
2. title;
3. full platform identities;
4. scope/status/evidence line;
5. one-line answer;
6. The pull;
7. The tax;
8. concise fit guidance;
9. total commitment;
10. useful session/interruption;
11. full radar and exact rows;
12. dimension explanations;
13. detailed fit/traits;
14. platform/scope detail;
15. destinations;
16. trust/corrections;
17. Compare with and more profiles.

At 390×667, the title, scope/status and one-line answer must appear before the
first scroll. The art stage must not become a full-screen takeover. Pull/Tax is
the immediate next content. Nothing essential moves into a swipe-only rail or
horizontal overflow.

## 7. Profile instrument behavior

### 7.1 Radar

- Use the fixed public axis order and fixed 0–10 scale.
- Labels must be genuinely readable at 100% and text zoom; roughly 9px is not
  acceptable.
- The radar is overview, not the only precise or accessible representation.
- No tooltip is required to discover an exact value.
- No area, average, “balanced” badge or bigger-is-better implication.
- Explain once: shape describes what the game strongly offers; larger is not a
  universal verdict.
- For exact values, plot the canonical point.
- For a range, use a restrained uncertainty band only if clear; exact endpoints
  remain in the row.
- For Unknown/Not scored, leave a labelled gap/indeterminate treatment; never
  pull the point to zero.

### 7.2 Exact rows

Every row permanently shows:

- full dimension label;
- exact value, range or Not scored;
- confidence as text;
- one concise plain-language explanation.

A disclosure may reveal the fuller rationale and evidence notes. The trigger is
a real button with `aria-expanded` and `aria-controls`; focus remains on the
trigger, no content is hover-only, and opening one row does not reorder or trap
focus. The radar itself need not be keyboard-interactive when the rows provide
the complete equivalent.

### 7.3 Bounded uncertainty specimens

Add a compact annotation/state rail to the Fable file—not a fifth canonical
route screen—showing:

- exact + High;
- exact + Medium/Low;
- one-Unknown dimension range;
- Not scored from insufficient evidence;
- Provisional overall status;
- material platform override/warning.

Use contract-labelled dummy state data for range/Not scored rather than
inventing a real game's result. Use Returnal and Redfall only as named references
for real confidence/provisional patterns.

## 8. Artwork and complete artless state

### Art-led

- Use an authentic existing private-design asset with a documented focal crop.
- Text contrast must come from composition/ground, not a destructive blur or
  heavy filter over the image.
- The stage has emotional weight but remains compact enough for the decision
  answer to lead.
- Artwork is not repeated decoratively through every section.

### Artless

- Render the same Alan Wake 2 content and identical reading hierarchy.
- Replace the art role with an authored typographic identity field using the
  game accent, title, spine/ruled geometry and controlled negative space.
- Do not show a placeholder icon, empty frame, fake texture, generated image or
  generic grey gradient.
- Preserve stage height only where useful; do not reserve a dead image-shaped
  hole.
- All metadata, decision guidance, instrument, destinations and trust content
  remain present.

## 9. Editorial voice versus structured information

Editorial voice owns:

- one-line experience;
- The pull;
- The tax;
- fit guidance;
- concise dimension explanations.

Structured information owns:

- exact title/scope/build/platform identity;
- evidence status, confidence and cutoff;
- exact/range/Unknown values;
- practical-time fields and provenance;
- official destinations and correction route.

Do not turn evidence into a large preamble or repeated badge field. Put trust
where it answers uncertainty: overall status near scope, dimension confidence
on the row, material platform caveat beside the affected facts, and the fuller
evidence ledger at the trust band.

## 10. Responsive, keyboard and accessibility contract

- Semantic page landmarks and one logical heading order.
- Visual and DOM reading order match at every breakpoint.
- Minimum 44×44 CSS-pixel target for compact controls.
- Full keyboard access, visible focus and no focus trap.
- Every interactive element appears in coherent sequential focus order,
  including secondary profile/Compare links.
- No hover-only content or precision.
- Color is never the only carrier of value, status, game identity or comparison.
- Platform logos have accessible full names; decorative artwork is hidden when
  adjacent text already identifies the game, otherwise it has useful alt text.
- Test 390×844, 390×667, 360px, 320px, 200% text zoom and keyboard-only use.
- No clipped title, horizontal scrolling, overlapping radar labels or hidden
  Search/navigation.
- Respect reduced motion; motion cannot be required to understand state.
- Expanded rationale must remain usable with screen readers and after text
  reflow.

## 11. Component and state handoff

The design must identify at least:

- `ProfileIdentityStage` with art/artless variants;
- `ProfileIdentity`, `PlatformList`, `ScopeSummary` and optional
  `ScopeSwitcher`;
- `EvidenceState` and `PlatformWarning`;
- `DecisionAnswer`, `PullTaxPair` and `FitSummary`;
- `PracticalCommitment` with commitment/session subfields;
- `ProfileInstrument`, canonical `Radar` and `DimensionRows`;
- `DimensionDisclosure` for rationale/evidence;
- `ExperienceTraits`;
- `WhereToPlay`;
- `TrustBand` and contextual `CorrectionLink`;
- `CompareWith` and `MoreProfiles`.

For each, note desktop/mobile layout, art/artless behavior, exact/range/Unknown,
High/Medium/Low, Verified/Provisional/Pre-release, long title, long scope,
platform-warning and missing-data behavior. Do not design an admin component.

## 12. Acceptance criteria

Gate B passes only if all are true:

- A3–A6 feel like the accepted A1/A2 system without changing A1/A2.
- The page answers the decision before asking the reader to study the chart.
- Title, full scope/build, platforms and evidence state are immediately clear.
- Pull and Tax are balanced, specific and more prominent than generic tags.
- Practical commitment and useful session are distinct and outside the rubric.
- All eight exact canonical values are visible and correctly ordered.
- Confidence, Provisional, range and Not scored have truthful structural states.
- The radar is useful but never the only exact/accessibility representation.
- Platform logos replace cryptic abbreviations and retain accessible text.
- Art-led and artless versions have equal content and intentional composition.
- Mobile follows the required reading order without a full-screen art takeover.
- Keyboard order is coherent; disclosures do not trap or lose focus.
- No aggregate, winner, ranking, popularity, trending or quality-color mechanic
  appears.
- The output includes concise component/state/spacing/behavior annotations
  sufficient for engineering handoff.

## 13. Inputs still required before publication, not before Fable

Fable can proceed with labelled design-only specimens. Production publication
still requires:

- the final lawful/cleared artwork asset, focal point, credit and alt treatment;
- an approved source/provider record for total commitment and session data, or
  an honest Unknown state;
- verified official destination URLs and any required disclosure;
- approved platform-logo assets/usage and accessible labels;
- owner sign-off on final public copy;
- a real approved scoring package before any range/Unknown specimen is assigned
  to a named game;
- implemented responsive/keyboard behavior and independent conformance proof.

These are data, rights and implementation gates. They do not reopen the Gate A
direction or block the bounded Gate B design pass.
