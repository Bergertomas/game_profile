# Should I Play? — Phase 4 implementation map

**Date:** 2026-08-26

**Status:** Ready to execute after Phase 3B design acceptance. This map turns
the reconciled product/design contracts into repository work; it does not
replace the Master Plan or authorize deployment.

## Starting point

The repository already has the public D3 profile foundation, the shared
Archivo/Newsreader and graphite/warm-paper system, scope-correct profile routes,
DB-backed published-profile reads, canonical SEO behavior and the accepted
provider-independent Search, discovery, practical-time, analytics and
storefront contracts.

The current public product still exposes only the homepage, profiles and
methodology. It does not yet expose the resolved global Search, `/compare`,
durable What should I play? results, `/about`, curated homepage system,
practical-time band, official-destination band or product analytics transport.

## Reuse versus add

| Product concern | Reuse | Add or extend |
| --- | --- | --- |
| Visual system | `app/globals.css`, `components/profile/profile.css`, game accents | Public component tokens only where a repeated state proves a missing token; no parallel design system |
| Public shell | `app/(public)/layout.tsx`, `components/SiteChrome.tsx` | Ranked navigation, global Search trigger/sheet, About and Compare links, mobile behavior |
| Homepage | `app/(public)/page.tsx`, `components/GameCard.tsx`, profile radar | Three-journey hierarchy, compact art strip, objective/evergreen/living shelves, curated Compare preview, release-scale all-profiles affordance |
| Profiles | `components/profile/*`, canonical game routes | Public byline/provenance, practical time, Where to play, corrections context, access disclosure, stale-evidence copy and Compare exits |
| Search truth | `lib/search/registry.ts` | Build-emitted index, matcher/suggestions, accessible combobox, mobile dialog and the four rendered states |
| Discovery truth | `lib/discovery/contracts.ts`, `constraints.ts`, `time.ts` | Versioned vocabulary/index projection, interpreter, editable ledger, evidence buckets, durable noindex results route and relax behavior |
| Compare truth | Existing profile/radar/ordering contracts | Exactly-two launcher/result routes, interval relation rows, artwork-free identities, nonvisual equivalent and pair canonicalization/noindex |
| Commerce | `lib/commerce/storefront.ts` | Minimal persistence/authoring needed to publish verified official destinations and render launch truth |
| Analytics | `lib/analytics/events.ts` | Local/test instrumentation first; provider transport only after provider/privacy approval |
| SEO | Existing metadata, structured-data and sitemap helpers | About/Compare/discovery metadata, pair-result noindex, truthful social cards; never `AggregateRating` |

## Implementation sequence

### Slice 0 — accept the design contract

**Work:** review the completed Fable conformance audit and verified recovered
HTML, freeze the durable discovery route and record Tomas's acceptance.

**Exit:** Phase 3B is complete. No remaining choice can change navigation,
page types, content requirements or data contracts.

### Slice 1 — trust, orientation and shell

**User value:** every public page explains who made the judgment, how to read it
and how to report a factual problem; the real rooms are reachable.

**Work:**

- extend `SiteChrome` with the accepted ranked public navigation and global
  Search entry without flattening the three journeys into equal tabs;
- add `/about` with editorial identity, independence/funding truth,
  AI-assisted/human-governed method and corrections policy;
- centralize the public byline string **the editor** and provenance label
  **Editor reviewed**;
- add the compact reading key and contextual corrections action to profiles;
- remove any public audit/calibration vocabulary that escapes from internal
  provenance structures.

**Tests:** route/metadata tests, public-copy truth assertions, keyboard/focus
order and 320px/200% reflow smoke coverage.

### Slice 2 — practical time and official completion actions

**User value:** a profile answers how much time the game asks, what a useful
session looks like and where the evaluated scope can actually be played.

**Work:**

- add only the persistence and one-editor authoring required for
  `TotalCommitmentRecord`, `SessionSuitabilityRecord`, verified official store
  destinations and complimentary-access disclosure;
- render total commitment and session suitability as profile facts outside the
  eight-dimension instrument;
- render ordinary official destinations, edition/platform caveats and
  conservative unavailable/stale states;
- keep affiliates and live prices absent unless separately approved later.

**Tests:** band boundaries, range/special states, scope isolation, source and
override truth, destination expiry/fallback and no score coupling.

### Slice 3 — global Search registry

**User value:** a visitor who knows a title can reach the exact profile or learn
honestly why the catalog cannot yet answer.

**Work:**

- emit one approved Search index from published scope records plus recognized
  provider/manual-fallback identities;
- implement the shared combobox/listbox and mobile full-height dialog;
- render published, recognized-unprofiled, ambiguous and unrecognized states;
- preserve exact scope-correct canonical routing and no thin routes for
  recognized-only records;
- add the private deduplicated request endpoint only after its receiver,
  storage and privacy contract are approved. Do not ship a decorative or fake
  request control.

**Tests:** aliases, year/edition/scope ambiguity, typo suggestions, seven-row
cap, keyboard grammar, announcements, no-result recovery, no stub-route or
sitemap leakage, and measured index transfer/parse budgets.

### Slice 4 — homepage curation grammar

**User value:** the small validation catalog feels intentionally useful, while
the same entrance can grow to approximately 100 profiles without a redesign.

**Work:**

- make Search the dominant field, Compare the major secondary action and What
  should I play? the progressive question;
- implement objective shelves only from facts that truly support them;
- keep evergreen and “Choosing between…” membership in reviewed configuration;
- implement living collections with authored start/expiry/fallback so expired
  material never renders;
- preserve art-led and designed-artless cards as equal catalog states;
- add the release-scale cap/count/letter-index behavior only at its measured
  trigger; do not add a generic registry table or fake activity.

**Storage:** prefer reviewed file/build configuration until catalog work proves
that an admin surface is a publication blocker.

### Slice 5 — exactly-two Compare

**User value:** a visitor can understand meaningful differences between two
candidate games without a universal winner.

**Work:**

- implement the indexable `/compare` launcher and canonical pair result route;
- keep results artwork-free and pair pages `noindex`;
- align identities, scope/build/evidence state, all eight authoritative rows,
  Pull/Risk, experience tags and material platform caveats;
- compute interval relations directly, preserving ranges and Unknown;
- treat summary prominence as presentation only; never compute an aggregate,
  match percentage or winner;
- prerender validation/release pairs while measured scale permits, with a
  server/dynamic fallback only when pair growth justifies it.

**Tests:** canonical pair ordering, self-pair redirect, missing-half 404,
range/Unknown/asymmetric confidence, screen-reader row prose, mobile sticky
identity and social-card truth.

### Slice 6 — deterministic What should I play?

**User value:** someone who does not know a title can state a need, inspect how
the site understood it and see honest matches, trade-offs and uncertainty.

**Work:**

- emit the governed vocabulary, normalized facts, experience classifications,
  dimension values/confidence and practical-time fields needed by discovery;
- implement the bounded client interpreter and visible/editable intent ledger;
- enforce hard-eligibility tiers and only the Strong-or-better/Exceptional
  dimension thresholds;
- classify hard outcomes as satisfied, contradicted or indeterminate;
- reserve near/borderline for governed cases such as a session budget inside
  the useful window, never an arbitrary dimension tolerance;
- render verified, near/borderline, trade-off, indeterminate and no-match states
  without a public match percentage or universal ranking;
- use the Phase 3B-accepted durable noindex route and preserve browser history,
  refresh and sharing.

**Tests:** generated phrase/misspelling corpus, contradictory and unsupported
fragments, range/Unknown/Low-confidence truth table, incomplete-catalog copy,
relax/reverse behavior, stable ordering and no runtime-model/network dependency.

### Slice 7 — public-product hardening and private validation

**User value:** the complete product works on real content and phones, not only
on happy-path specimens.

**Work:**

- run the full screen/state inventory through keyboard, VoiceOver-equivalent
  semantics, contrast, reduced motion, 200% zoom and 320px reflow checks;
- establish measured Search/discovery transfer, parse and interaction budgets;
- validate art-led/artless, provisional, stale, range, Unknown, long-title and
  failure states;
- instrument the versioned local/test event contract; enable only privacy-
  approved production layers;
- produce and validate the 12–15-profile corpus, including the first real new-
  profile Publish -> dispatch -> Live observation.

**Exit:** Phase 4's private/limited product test works coherently and produces a
measured content-production baseline. It is not the quiet public release gate.

## Admin boundary

Allowed Phase 4 admin work is limited to the minimum authoring/persistence
needed for public Search registry identities, time/session facts, official
destinations, disclosures and truthful curation publication. Do not build
role management, multi-user workflow, a curation CMS, internal analytics
dashboards or generic SaaS-grade edge handling for a one-editor tool.

Reopen an internal issue only when it blocks data integrity, security, truthful
publication/proof, content publication or the public product.

## Parallel content/protocol track

Protocol v1 calibration remains a precondition to bulk catalog production, not
to implementing already-frozen public contracts. Phase 4 public surfaces and
the 12–15-profile corpus can progress while Phase 3A finishes, but no
approximately-100-profile scoring run begins until the protocol gate passes.

## Deployment boundary

All work remains local and preview/test scoped until separately approved. Do
not apply the pending artwork migration, deploy production, mutate production
data or push the branch as a side effect of implementing this map.
