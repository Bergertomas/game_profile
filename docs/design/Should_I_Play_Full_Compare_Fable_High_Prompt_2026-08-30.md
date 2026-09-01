# Fable High Prompt — Dedicated Full Compare Pass

**Historical first-pass prompt.** Its artwork-free direction and open URL/index
wording are superseded by ADR 0033 and the [31 August art-led revision
prompt](Should_I_Play_Full_Compare_Art_Led_Fable_High_Prompt_2026-08-31.md).
Retain it only as evidence of the rejected first candidate.

Work only inside the existing Claude/Fable project:

`https://claude.ai/design/p/1016e606-4407-4fb1-ad8d-f74c1e80ed82?file=Should+I+Play+-+Canonical+Screens.dc.html`

Use **Fable High**. Revise the existing canonical file; do not create a new
product direction. Do not modify A1–A6. A7 is provisional handoff material, not
authority.

## Mission

Add a dedicated, implementation-ready full Compare desktop/mobile pass that is
compatible with accepted A1/A2 Rev 5.1 and accepted A3–A6.

Create three clearly labelled regions/screens after the accepted material:

1. **Full Compare — desktop**
2. **Full Compare — mobile (390px)**
3. **Compare state and interaction handoff rail**

This is a bounded revision, not product discovery.

## Locked product contract

- Public brand: **Should I Play?**
- Game Profile is the evaluation methodology, not the public brand.
- Exactly two games.
- Full Compare is completely artwork-free.
- Difference- and trade-off-oriented; never a winner.
- Exactly eight fixed dimensions on a fixed public 0–10 half-step scale.
- No public or hidden aggregate, total area, average, match percentage, ranking,
  popularity or quality ordering.
- Low values are descriptive, not inherently bad.
- Unknown is not zero; ranges are not midpointed.
- Scope, build, platform, confidence, evidence status and provisional
  uncertainty stay explicit.
- The radar may remain the signature overview but is never the only exact or
  accessible representation.
- Preserve the dark, cinematic, deliberately art-directed A1/A2 language and
  the accepted A3–A6 editorial/evidence hierarchy without putting artwork into
  Compare.
- Exact journey labels remain **Search / Compare / What should I play?**.

## Canonical specimen — use these facts exactly

Compare **Alan Wake 2** with **Returnal**. Do not invent scores, commitment time,
dates, platform facts or evidence claims.

Use this fixed public order and exact values:

| Dimension | Alan Wake 2 | AW2 confidence | Returnal | Returnal confidence |
|---|---:|---|---:|---|
| Story & Character Investment | 9.5 | High | 7.5 | Medium |
| Thematic & Emotional Impact | 9.5 | High | 8.5 | Medium |
| Atmosphere & World Pull | 10 | High | 9.5 | High |
| Medium-Specific Craft | 10 | High | 10 | High |
| Agency & Satisfaction | 7.5 | High | 10 | High |
| Execution & Polish | 9 | Medium | 9.5 | High |
| Structure & Focus | 8.5 | High | 8.5 | High |
| Pacing & Time Respect | 8 | High | 7.5 | High |

Alan Wake 2 scope:

- Base game
- Single-player campaign
- PlayStation 5, Xbox Series X|S and PC
- Current retail build, post-launch updates applied
- Night Springs and The Lake House excluded
- Material warning: PC performance varies sharply with ray/path-tracing
  settings; console versions are the stable reference experience

Returnal scope:

- Base game
- Single-player main-game campaign
- PlayStation 5 and PC
- Current retail build, including suspend-cycle and Ascension updates
- Co-op and Tower of Sisyphus excluded

Both are Verified / High overall evidence. Alan Wake 2 Execution is Medium
confidence. Returnal Story and Thematic are Medium confidence because credible
readings conflict. Use full accessible platform identities and official-style
logos where appropriate; never show `XSX`.

There is no approved practical-time source record for either game. Omit the
comparison time band or show an explicitly labelled component-level Unknown;
never copy Fable specimen hours or manufacture a commitment band.

## Required desktop hierarchy

1. Product chrome and **Compare** context.
2. Two equally weighted game selectors showing title, exact scope, platform
   identities and evidence status. Neither side may look selected as the
   winner.
3. One concise editorial trade-off statement, not a verdict. The intended
   contrast is Alan Wake 2's narrative/world pull versus Returnal's sustained
   mechanical agency/mastery.
4. Deterministic callouts before the full instrument:
   - largest clear contrast: Agency & Satisfaction, 7.5 versus 10;
   - meaningful alignment: Medium-Specific Craft, 10 versus 10;
   - material caveat: Alan Wake 2 platform-sensitive Execution and Returnal's
     Medium-confidence Story/Thematic readings.
5. Optional overlaid two-profile radar as signature overview. Use fixed axis
   order, persistent legend, different markers/line styles plus colour, and one
   calm explanation that larger is not universally better.
6. Authoritative difference-oriented paired instrument for all eight rows in
   fixed order. Show exact values and confidence without interaction.
7. Per-row semantic disclosures for the dimension question, comparison reading
   and relevant confidence/scope caveat.
8. Replace-left, replace-right and copy-link actions.

## Required mobile hierarchy

- Design at 390px and annotate behavior below 390px and at 200% text zoom.
- Both game identities/scopes and the central trade-off appear before the
  analytical instrument.
- Use a vertical paired-row instrument; no horizontally scrolling desktop
  table.
- Keep the radar only if it is genuinely legible. The exact paired rows remain
  permanent.
- Disclosure content follows its row in source order.
- Controls do not obscure content or require an introductory scroll to know
  what is being compared.

## Paired-value instrument

Explore a restrained dot/dumbbell treatment without superseding the radar
prematurely.

- Exact text values are always present.
- Equal, close, clear-difference and indeterminate relations have truthful
  structures.
- A connector appears only for comparable exact/range relations and never
  implies that farther right is universally better.
- Use labels and marker shapes in addition to colour.
- Unknown is never at the origin. A range is a range, not a midpoint.
- Confidence changes the interpretation/copy, not polygon geometry.

## State and interaction rail

Show component-labelled specimens for:

- exact/equal;
- exact/close;
- one range overlapping the other value;
- one Unknown;
- asymmetric confidence;
- one Provisional profile;
- different platform/build warning;
- missing/unpublished game;
- same game selected twice;
- replace-left/right with focus return;
- copy-link confirmation;
- keyboard order, Escape behavior and reduced motion.

Do not attribute fabricated range/Unknown states to the two canonical games.
Redfall may appear only as a state specimen using its real Provisional / Medium
status; do not turn that example into a loser demonstration.

## URL/index handoff note

Include this working recommendation in the handoff rail for later ADR review:

- shareable `/compare?games=alan-wake-2,returnal` state;
- preserve visible left/right selection order in the share URL; internal
  unordered-pair normalization may support caching/deduplication but must not
  reorder the displayed sides;
- pair states `noindex, follow`, absent from sitemap and rating/review schema;
- `/compare` is the only potentially indexable journey page;
- no all-pair prerender requirement.

Do not present this as already shipped.

## Accessibility and behavior

- All exact values and confidence labels are available without hover.
- Every paired value group explicitly identifies its game, exact
  value/range/Unknown and confidence in meaningful nonvisual source order.
- Radars are decorative when the exact paired equivalent is adjacent; otherwise
  supply a concise accessible description.
- Disclosure controls use real buttons with `aria-expanded` and
  `aria-controls`.
- Keyboard/source order matches reading order.
- Replacement dialogs return focus to the invoking control and do not trap it.
- Never rely on colour, left/right position or shape alone.
- Support reduced motion and 200% text zoom.

## Explicit exclusions

Do not change A1–A6. Do not redesign the homepage or profile. Do not add art,
third games, prices, subscription badges, match percentages, a recommended
choice, trophy/crown/checkmark winner language, total area, averages, sorting by
score, live AI, accounts or fabricated time data.

## Final self-check before responding

Report PASS/FAIL for each item:

1. A1–A6 unchanged.
2. Exactly two games and no artwork in full Compare.
3. Canonical values, order, scopes and confidence are exact.
4. No winner, aggregate, match percentage, area or ranking language.
5. Central trade-off and largest contrast appear before the full instrument.
6. Radar is not the only exact/accessibility representation.
7. All eight paired rows are permanent on desktop and mobile.
8. Equal, range, Unknown, asymmetric confidence and Provisional states are
   covered without fabricated game facts.
9. Platforms use full accessible identities; no visible `XSX`.
10. No specimen commitment hours/bands became facts.
11. Mobile is complete at 390px with narrower/text-zoom notes.
12. Keyboard, focus return, disclosure semantics and reduced motion are noted.
13. URL/index recommendation is present as handoff, not shipped truth.
14. Accepted A1/A2 art direction and A3–A6 evidence hierarchy remain coherent.

Then state exactly what changed, which screens were added, and any unresolved
bounded defect. Do not launch a background verifier unless its result will be
posted in the same response.
