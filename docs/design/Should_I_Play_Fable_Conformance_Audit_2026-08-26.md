# Should I Play? — Fable conformance audit

**Audit date:** 2026-08-26

**Artifact:** **Should I Play - Reconciled** repaired source and recovered HTML
export

**Disposition:** Contract-conformant requirements/state source; not ready for
final visual acceptance or use as the implementation authority. See the
separate visual-completeness audit.

## Authority order

When sources differ, implementation follows this order:

1. accepted ADRs and invariant tests;
2. `Should_I_Play_Public_Product_Resolutions_2026-08-25.md`;
3. Master Product and Build Plan v0.9;
4. the Fable reconciliation brief;
5. the reconciled Fable artifact;
6. the superseded **Should I Play? at Fifteen** artifact.

The Fable artifact is the visual and interaction specification only after it
conforms to the higher-order product contracts. Synthetic examples never
become editorial truth merely because they appear in a specimen.

## Outcome

The mission succeeded in preserving the product's deliberate editorial
identity while extending it from a profile-first 12–15-profile validation
corpus to the approximately-100-profile quiet-release product. It does not look
or behave like a generic SaaS dashboard. The warm-paper/graphite Field Guide
system, Archivo/Newsreader typography, zero-radius/hairline grammar, game-led
accent restraint, art-led and designed-artless states, and D3 profile instrument
remain coherent.

The artifact now gives engineering materially useful coverage of:

- the ranked Search / Compare / What should I play? journey model;
- homepage behavior at the validation and release scales;
- the four Search availability states and private request confirmation;
- deterministic, inspectable discovery with editable criteria;
- total commitment and session suitability outside the eight dimensions;
- profile, Compare, About, corrections, storefront and trust additions;
- loading, empty, stale, error, long-title and artless states;
- 390px Search, discovery, profile and Compare specimens;
- nonvisual radar/row equivalents, focus behavior, live regions, reflow,
  contrast, reduced motion and touch-target acceptance criteria;
- build sequencing, component reuse and data dependencies.

## Governing decisions correctly preserved

The repaired artifact correctly preserves or now states:

- public brand **Should I Play?**; **Game Profile** only as methodology;
- exactly eight dimensions and no public or hidden aggregate;
- descriptive low values and explicit Unknown, range, confidence and scope;
- scope-correct canonical profile routes and exactly-two, artwork-free Compare;
- differences rather than a universal winner, with pair results `noindex`;
- profile-first library posture and Search as the dominant named-title path;
- deterministic discovery with no runtime LLM and no match percentage;
- ordinary-language preferences, explicit hard language and session statements;
- Strong-or-better `7.5+` and Exceptional `10` as the only dimension hard
  thresholds;
- the accepted time bands and High/Medium/Low interruption flexibility;
- self-funded current truth, ordinary official store links and no live prices
  at launch;
- public byline **the editor** and public provenance **Editor reviewed**;
- neutral stale-evidence copy unless a re-verification state is actually
  authored;
- 12–15 profiles as private product validation, approximately 100 as the quiet
  public-release floor;
- Phase 2 admin work in support mode and public-product value governing the
  roadmap.

## Corrections verified in the final repair

| Priority | Surface | Verified correction | Governing source | Result |
| --- | --- | --- | --- | --- |
| P0 | Discovery | Deleted the `<= 0.5` dimension-Must rescue. A hard dimension miss contradicts; crossing range, Unknown or Low confidence is indeterminate. | ADR 0025 | PASS |
| P0 | Discovery/time | Defined near/borderline through the session-budget-inside-useful-window rule and added the 90-minute/60–120-minute specimen. | ADR 0027 | PASS |
| P0 | Homepage | Re-banded the 12-hour Halo specimen from Brief to Moderate. | ADR 0027 | PASS |
| P0 | Search | Stated that only an exact, scope-correct published identity may open directly; genuine ambiguity otherwise precedes recognized/unrecognized. | ADR 0025 | PASS |
| P0 | Handoff | Removed stale request-storage, `post-2E` and unapplied-amendment claims. | Resolution register; Master Plan v0.9 | PASS |
| P1 | Accessibility | Included Near matches in the result-heading outline and specified omission of empty `Meets:` labels. | WCAG 2.1 AA; copy truthfulness | PASS |
| P1 | Performance | Separated network transfer from local parse/hydration; retained `50 ms` only as a provisional local target pending measurement. | Master Plan performance gate | PASS |
| P1 | Trust copy | Replaced the repeatability overclaim with “reviewed against the same published rubric.” | ADR 0009; public trust posture | PASS |
| P1 | Commerce | Made commission marking future-only and specified no commission marks at launch. | ADR 0029; current funding truth | PASS |
| P1 | Request error | Made failure retry-only and explicitly excluded the corrections mailbox as a coverage-request channel. | ADR 0025; resolution T3 | PASS |

## Accessibility acceptance contract

The artifact's accessibility section is useful but remains a specification
until verified in the real application. Phase 4 implementation must test:

- semantic heading and landmark order, including every discovery bucket;
- combobox/listbox and `aria-activedescendant` behavior;
- mobile Search dialog focus entry, containment, Escape/Close behavior and
  focus restoration;
- criteria controls' name, role, value and live announcements;
- interval/range/Unknown prose equivalents and authoritative score rows;
- 200% zoom and 320 CSS-pixel reflow without page-level two-axis scrolling;
- minimum 44 by 44 CSS-pixel touch targets on touch layouts;
- token-pair contrast rather than palette-level assumptions;
- reduced-motion behavior and visible keyboard focus;
- programmatic association of request, index and Compare errors with their
  initiating controls.

## Implementation posture

Do not port the artifact wholesale. Implement it through the repository's
existing public profile components, emitted provider-independent contracts and
static route architecture. Preserve server-rendered shelves and all-profile
fallbacks; progressive Search and discovery may enhance them on the client.
Keep synthetic Fable data in fixtures/tests only.

The repository-level file/component sequence is recorded in
`Should_I_Play_Phase_4_Implementation_Map_2026-08-26.md`.

The recommended Phase 4 build sequence remains:

1. trust/orientation and shared public tokens;
2. practical-time and official-destination data/rendering;
3. global Search and the four registry states;
4. homepage curation grammar at 12–15 profiles;
5. exactly-two Compare;
6. deterministic What should I play?;
7. responsive, accessibility, content-state and performance hardening.

This is a dependency order inside Phase 4, not a reason to defer user-visible
value. Phase 2 admin receives work only when integrity, security, truthful
publication/proof, content publication or the public product is blocked.

## Remaining owner facts and implementation choices

The design must not fabricate answers to the genuinely open items:

- metadata provider and terms, with the manual fallback already governing;
- exact coverage-request receiver, deduplication and privacy/storage contract;
- approved practical-time source and attribution method;
- whether any existing profile requires a complimentary-access backfill;
- operational verification of `corrections@shouldiplay.gg`;
- eventual analytics event provider and the separate privacy gates for raw
  query or returning-browser collection;
- future affiliate programs, if ever.

None of these reopens the product hierarchy, eight-dimension method, Compare
semantics, catalog scale, current self-funded posture or public byline.

## Final acceptance gate

Phase 3B remains active. The contract/export gates stand as follows:

1. **PASS** — the P0 corrections are visible in the repaired Fable source;
2. **PASS** — Fable completed the four bounded A–D verification passes without
   a reported contract regression;
3. **PASS** — the recovered generated HTML plus its sibling support bundle
   rendered independently through a loopback-only local server and was scanned
   as a local file;
4. **PASS** — the export digest is recorded here;
5. **PENDING DESIGN** — the canonical-screen/art-direction pass defined in
   `Should_I_Play_Fable_Visual_Completeness_Audit_2026-08-26.md` completes;
6. **PENDING OWNER** — Tomas accepts that final screen set as the Phase 4
   implementation specification and freezes `/play`.

**Final export:**
`docs/design/artifacts/Should_I_Play_Reconciled_2026-08-26.html`

**Size:** 772,155 bytes

**SHA-256:**
`82734bab44b7e2035628426b09d0a8d8860b199ff8ac08b4de4d49464459533d`

**Required support bundle:** `docs/design/artifacts/support.js` — 69,150 bytes

**Support bundle SHA-256:**
`8fe7df74405f3c55f49b7249c74ea1397e65d07dea2b1bd3b4a489bec2e28cbe`

**Cache note:** the older persistent **Should I Play - Reconciled
(standalone)** project page did not refresh to the repaired content and is not
the final acceptance source. The repaired **Should I Play - Reconciled** source
and recovered HTML above govern the review.
