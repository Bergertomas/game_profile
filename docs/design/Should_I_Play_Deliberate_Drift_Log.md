# Should I Play? — Deliberate-Drift Log

**Status:** Open running record  
**Owner of the format:** [Shared Design-System and Interaction Handoff v1.0
§15](Should_I_Play_Shared_Design_System_and_Interaction_Handoff_v1.0_2026-08-31.md)  
**Companion:** [Accessibility and Visual-Conformance Matrix
v1.0](Should_I_Play_Accessibility_and_Conformance_Matrix_v1.0_2026-08-31.md) §6

Every intentional departure from the accepted Fable specimen is recorded here,
with the reason and the evidence behind it. Pixel equality is not the goal;
handoff §15 and matrix §6 require that any material difference in proposition
hierarchy, section order, art-led/artless parity, Search prominence,
identity/radar relationships or type/colour/spacing roles is either corrected or
logged. This is the log.

An entry is not permission. It records a decision somebody can review, argue
with and reverse.

---

## A. Entries carried from the handoff

These are the seven the handoff itself names as already-known drift (§15). They
are recorded here so the log is complete rather than starting mid-story.

| Surface/component | Reference | Observed difference | Reason | Decision/evidence | Owner/date | Follow-up |
|---|---|---|---|---|---|---|
| Homepage opening | A1/A2 Rev 5.1, 1440 and 390 | Hero/artwork composition is shorter than the specimen | Approved refinement — Search gains prominence | ADR 0030 non-blocking owner refinement, 30 Aug 2026 | Tomas / 2026-08-30 | none |
| All surfaces | A1–A6, C1–C4 | Visible text floor is 12px; the specimen's 8.5–11px labels are not reproduced | Accessibility (WCAG 1.4.4, matrix X-05) | Handoff §2.2 rule 4; `tests/e2e/type-floor.spec.ts` measures painted text at 320/390×667/1440 | Handoff v1.0 / 2026-08-31 | none |
| All interactive components | A1–A6, C1–C4 | Hit areas are at least 44×44 CSS px even where the visible shape is smaller | Accessibility (matrix X-10) | Handoff §2.2 rule 5 | Handoff v1.0 / 2026-08-31 | none |
| Control boundaries and focus | A1–A6, C1–C4 | Boundaries and focus rings are stronger than the specimen's hairlines | Accessibility (WCAG 1.4.11, matrix X-04) | Handoff §2.2 rule 6; `border.control` / `border.focus` tokens | Handoff v1.0 / 2026-08-31 | none |
| Type system | A7 | Three functional type roles (Archivo / Newsreader / JetBrains Mono), not two | Reconciliation of A7 against the accepted screens | Handoff §2.2 rule 1 | Handoff v1.0 / 2026-08-31 | none |
| Editorial surface | A3–A6 | One warm editorial ground on an otherwise dark product | Accepted profile direction; not a second card theme | Handoff §2.2 rule 2, §3.1 | Handoff v1.0 / 2026-08-31 | none |
| Compare CTA copy | A1/A2 | "See the full comparison — artwork-free" replaced by "See the full comparison" | Content truth — Compare is art-led with artless parity (ADR 0033) | Handoff §2.2; asserted in `tests/curated-compare.test.ts` | Handoff v1.0 / 2026-08-31 | none |

---

## B. Engineering Slice 2 — the accepted homepage system

| # | Surface/component | Reference | Observed difference | Reason | Decision/evidence | Owner/date | Follow-up |
|---|---|---|---|---|---|---|---|
| B-01 | Homepage — the warm "In the library" card grid | A1/A2 Rev 5.1, 1440 and 390 | The pre-Gate-A card grid is removed; the accepted poster rail takes its place | Accepted composition. ADR 0030 and Plan §5.2 list a mosaic, a poster rail, authored shelves and a curated module; a second full catalogue listing on the same page is in none of them | ADR 0030 decision list; Plan §5.2; `app/(public)/page.tsx` | Claude / 2026-09-01 | none. `#catalogue` still resolves — the rail's heading carries it, asserted in `tests/e2e/homepage.spec.ts` |
| B-02 | Poster frame | A1/A2 poster rail | Posters use a 3:4 frame rather than the 2:3 cover frame `GameCard` uses | Responsive stress. At 320–390px a 2:3 poster inside a scrolling rail costs roughly 300px of height per row before the plate, which pushes the shelves below it out of reach on a short phone. Artwork is atmospheric here and may be cropped (ADR 0030) | `components/home/home-sections.css`; reflow assertions in `tests/e2e/homepage.spec.ts` | Claude / 2026-09-01 | revisit if a cover-art-heavy catalogue makes the crop lossy |
| B-03 | Rail track | A1/A2 poster rail, 1440 | The track bleeds past the 82rem measure at viewports wider than ~87rem while the heading, note and credits stay inside it | Faithfulness to the accepted composition: a rail clipped hard at the measure reads as a truncated grid rather than as something that scrolls | `components/home/home-sections.css` | Claude / 2026-09-01 | none |
| B-04 | Authored shelves | A1/A2 shelves | No shelf renders on production today | Content truth. The objective shelves that are configured resolve to the entire three-profile catalogue, which is not a selection, and every evergreen/living collection is a qualitative editorial claim Tomas approves (P0.3). Padding the design with an invented collection is the failure this rule exists to prevent | `content/home-shelves.ts`; `lib/home/shelves.ts`; `tests/home-shelves.test.ts`; states reviewable at `/dev/home-states` | Claude / 2026-09-01 | shelves appear as soon as an approved collection or a catalogue larger than one shelf exists. No code change needed |
| B-05 | "Choosing between…" | A1/A2 curated module | The module renders nothing on production today | Content truth. A pairing and its tension sentence are both owner-approved editorial claims and none exists | `content/curated-compare.ts`; `tests/curated-compare.test.ts`; state reviewable at `/dev/home-states` | Claude / 2026-09-01 | as B-04 |
| B-06 | "Choosing between…" CTA | A1/A2; handoff §7.3 | The accepted "See the full comparison" route is not published; the module states that full Compare is not built instead | Technical dependency. `/compare` is Slice 4. Publishing the route would be a broken link; printing the label as inert text would imply a destination that does not exist | `components/home/CuratedCompare.tsx` takes the route as a parameter; both branches asserted in `tests/curated-compare.test.ts` | Claude / 2026-09-01 | Slice 4 passes `compareRouteFor` and the accepted CTA appears with no component change |
| B-07 | Homepage journey labels | Handoff §5.2 | Search / Compare / What should I play? are a marked list, not an ARIA tablist | The handoff's tablist contract is conditional on the three labels switching one colocated content region. They do not: Compare and What should I play? are accepted and unbuilt, so there is no panel to switch and a tab that responded to Enter by doing nothing would teach a visitor the product is a mock-up | Carried from Slice 1 (`components/home/HomeOpening.tsx`); handoff §5.2 first sentence | Claude / 2026-09-01 (carried) | becomes a tablist when a second journey has a panel |
| B-08 | Poster preview panel | Handoff §7.1 | The preview carries the one-line experience, primary pull and primary risk rather than the eight exact values | Handoff §7.1 makes a compact fingerprint decorative when the eight exact values are available in "the expanded preview **or** the linked profile destination". The poster links to the profile, which carries all eight; eight long dimension names inside a 15.5rem poster would wrap to roughly forty lines and bury the editorial fields a reader actually wants at this size | `components/home/ProfilePoster.tsx`; `tests/home-rail.test.ts` | Claude / 2026-09-01 | revisit if the poster ever loses its profile link |
| B-09 | Homepage artwork | A1/A2, all viewports | Every poster and mosaic tile renders the artless typographic sleeve | Rights. Production clears no artwork (ADR 0011), and evaluation-basis assets may never reach production (ADR 0012, `npm run check:containment`) | `lib/profile/artwork.ts`; art-led parity asserted against a cleared fixture in `tests/home-rail.test.ts` | Carried from ADR 0011 | none. Art-led and artless are the same component and neither outranks the other |
| B-10 | Public header | A1/A2 chrome, 390 at 200% text | The one compact chrome row is allowed to wrap onto a second line, and only at extreme zoom | Responsive stress. At 390 CSS px with the root font doubled, the wordmark, the Search opener and "How we score" cannot share a line, and a header that refuses to wrap scrolled the whole document sideways on every page — which handoff §3.4 forbids | `components/SiteChrome.tsx`; 200% assertions in `tests/e2e/homepage.spec.ts` | Claude / 2026-09-01 | none. Nothing wraps at any ordinary size |

## C. Defects found and fixed while implementing Slice 2

Recorded here rather than in the drift table because they are corrections, not
departures. Both were latent before this slice and both were found by the
conformance envelope the matrix requires.

| # | Where | Defect | Fix |
|---|---|---|---|
| C-01 | `components/home/home-opening.css`, `components/home/home-sections.css` | The artwork rights notice carries the URL an asset was loaded from. A URL is one unbreakable token, so it set a min-content floor wider than a 320px phone and scrolled the document sideways — a preview-only credit line becoming a WCAG 1.4.10 failure | `overflow-wrap: anywhere` on both notices |
| C-02 | `components/home/home-sections.css` | Visually-hidden text is `position: absolute`, and an absolutely positioned box whose containing block is outside a scroll container is not clipped by it. A poster's screen-reader label three screens along the rail was laid out against the viewport and pushed the document sideways | `position: relative` on the poster and on each control that carries a hidden label |
