# Should I Play? — Fable reconciliation checkpoint

**Recorded:** 2026-08-26
**Status:** Final contract repair completed with Fable 5 / High. The repaired
source and recovered HTML export pass the ten-item contract audit. A separate
visual-completeness audit found that the attached resolution's final UI/art-
direction promise is not complete. Phase 3B remains active.

## Durable locations

- Claude Design project:
  `https://claude.ai/design/p/1016e606-4407-4fb1-ad8d-f74c1e80ed82`
- Primary project file: **Should I Play - Reconciled**
- Repaired review file: **Should I Play - Reconciled (standalone)**
- Repaired present view:
  `https://claude.ai/design/p/1016e606-4407-4fb1-ad8d-f74c1e80ed82?file=Should+I+Play+-+Reconciled+%28standalone%29.html&present=1`
- Baseline artifact:
  `https://claude.ai/code/artifact/ff0227d1-ca7b-4ef1-859b-970d8e9bf2c1`
- Governing local brief:
  `docs/design/Should_I_Play_Fable_Reconciliation_Brief_2026-08-26.md`
- Governing decision register:
  `docs/Should_I_Play_Public_Product_Resolutions_2026-08-25.md`
- Conformance audit:
  `docs/design/Should_I_Play_Fable_Conformance_Audit_2026-08-26.md`
- Visual-completeness audit:
  `docs/design/Should_I_Play_Fable_Visual_Completeness_Audit_2026-08-26.md`
- Canonical-screen mission:
  `docs/design/Should_I_Play_Fable_Canonical_Screen_Mission_2026-08-26.md`
- Phase 4 repository implementation map:
  `docs/design/Should_I_Play_Phase_4_Implementation_Map_2026-08-26.md`
- Verified recovered HTML:
  `docs/design/artifacts/Should_I_Play_Reconciled_2026-08-26.html`
- Required sibling support bundle:
  `docs/design/artifacts/support.js`

The authenticated self-contained HTML export of **Should I Play? at Fifteen**
was uploaded to the project. Fable read the real baseline rather than
reconstructing it from screenshots or the brief alone.

## Run configuration

- Claude Design / Fable
- Model: **Fable 5**
- Effort: **High** for the final bounded repair
- No repository, database or production access was granted to Claude.

## What is complete

The reconciled artifact now contains sixteen linked sections:

1. Mission and change ledger
2. Journey model
3. Homepage at 12–15 and approximately 100 profiles
4. Four-state Search registry
5. Deterministic What should I play?
6. Practical time
7. Integrated profile
8. Compare
9. About and accountability
10. System states
11. Component inventory
12. Responsive behavior
13. Nonvisual equivalents
14. Copy contract
15. Sequencing and data dependencies
16. Owner decision register and design lock

It includes rendered 390px specimens for the mobile Search sheet, discovery,
profile and Compare; interaction/state examples; and implementation,
accessibility and content handoff material. It explicitly distinguishes real,
synthetic, proposed, later, locked and design-level material.

Fable also applied a broad conformance repair after an independent audit. That
repair removed the wrong public byline, public calibration language, invented
current affiliate claims, old time bands, false Search queue/activity signals,
incorrect discovery defaults and thresholds, misleading privacy claims,
expired-content staleness, admin-first sequencing and multiple accessibility
omissions.

## Final conformance repair

The post-reset repair applied and independently rechecked all ten previously
recorded mismatches:

1. Change the homepage's **Brief — around 12 h engaged** example to
   **Moderate — around 12 h engaged**.
2. Remove the invented rule that a dimension Must missing by `<= 0.5` becomes a
   near match. Under ADR 0025 a failed dimension Must is contradicted, while a
   crossing range, Unknown or Low confidence is indeterminate. Near/borderline
   is available for ADR 0027's session-budget-inside-useful-window case.
3. Add **Near matches** to the screen-reader heading outline and provide a
   concrete session-budget near-match specimen.
4. Render a `Meets:` line only when at least one verified meet exists.
5. Clarify Search resolution order: an exact, scope-correct published result
   wins; otherwise genuine ambiguity is resolved before recognized/unrecognized
   states.
6. Make the responsive table's commission mark explicitly future-only, or
   remove it from the launch row.
7. Replace the network-plus-parse `50 ms over 4G` claim with a measured budget;
   if `50 ms` remains, it applies to local parse/hydration only, with network
   measured separately.
8. Replace “one person, one rubric, applied the same way every time” with the
   more truthful “reviewed by the editor against the same published rubric.”
9. Repair stale section 14 copy: do not pre-decide the request receiver's exact
   storage shape; remove `post-2E`; and replace amendment “stubs/to be applied”
   with the already-integrated Master Plan mapping.
10. Replace the request-failure fallback “tell us by mail” with a retry-only
    state unless a distinct, verified coverage-request receiver exists.

These were conformance corrections, not new product discovery. The governing
ADRs and resolution register continue to win if the artifact conflicts.

## Export state

Claude's generated standalone-download UI did not expose a normal browser
download event, so the exact repaired artifact served by the authenticated
project was recovered from Claude's generated artifact URL and then checked as
a local HTML file. It is 772,155 bytes and contains the required corrected
strings with none of the ten stale contract strings. The 69,150-byte sibling
`support.js` was recovered from the same generated project and the pair rendered
independently through a loopback-only local server.

- Local artifact:
  `docs/design/artifacts/Should_I_Play_Reconciled_2026-08-26.html`
- SHA-256:
  `82734bab44b7e2035628426b09d0a8d8860b199ff8ac08b4de4d49464459533d`
- Support bundle SHA-256:
  `8fe7df74405f3c55f49b7249c74ea1397e65d07dea2b1bd3b4a489bec2e28cbe`

The older persistent **Should I Play - Reconciled (standalone)** project page
remained cached on its pre-repair content and is not the acceptance artifact.
The repaired source file and the recovered local HTML above are authoritative.

## Next contract

Resume the same project with **Fable 5 / High** for a bounded visual-completion
pass. Use the repaired artifact as the governing requirements/state source and
produce the concise canonical desktop/390px route screen set defined in the
visual-completeness audit. Do not reopen brand, product hierarchy, methodology,
Search/discovery semantics, Compare rules or roadmap scale.

Tomas reviews that screen set—not the current reconciliation document—as the
Phase 4 implementation specification. Acceptance freezes the provisional
`/play` route. Until then, do not begin wholesale UI implementation, push the
branch, apply migrations, deploy or change production without the separately
required approvals.
