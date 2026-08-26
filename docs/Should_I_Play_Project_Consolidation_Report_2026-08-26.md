# Should I Play? — Project Consolidation Report

**Consolidated:** 2026-08-26

**Public product:** **Should I Play?**

**Domain:** `shouldiplay.gg`

**Evaluation construct:** **Game Profile**

This report is the reader-facing entry point to the current project. It
reconstructs and reconciles the decisions; it does not replace the accepted
ADRs, the resolution register or Master Product and Build Plan v0.9.

## 1. Executive state

### What the product is now

Should I Play? is an art-led, utility-first entrance to a profile-first Field
Guide for videogame decisions. It helps someone:

1. **Search** for a game already in mind;
2. **Compare** exactly two published profiles;
3. use **What should I play?** for bounded, deterministic needs-based
   discovery.

Its public answer is the shape, evidence and interpretation of eight separate
dimensions—not an overall score, ranking, match percentage or universal
winner. Game Profile names the method, not the product.

### What is actually built

The production and repository foundation includes:

- the public brand/domain and D3 visual/profile system;
- three substantive calibration profiles with DB-backed published reads;
- explicit primary and sibling scope routes;
- public methodology, canonical metadata, sitemap, robots and profile social
  cards without `AggregateRating`;
- a one-editor authoring system for games, scopes, evaluations, evidence,
  interpretation, validation, preview, publication and revision history;
- transactional publication, deployment requests, deterministic manifests,
  recovery, concurrency hardening and production proof;
- Cloudflare Access-protected admin and Hyperdrive transport with query caching
  disabled;
- a successful `production_verified` observation proving the current
  three-profile artifact Live;
- provider-independent code contracts for the four Search states,
  deterministic discovery constraints, practical time/session data, governed
  analytics events and official storefront destinations;
- the accepted editorial-fair-use data model and migration, not yet applied.

### What remains unproven or unbuilt

The first application-originated Cloudflare Builds dispatch and the first full
new-profile Publish -> dispatch -> Live cycle remain unexercised. They should be
proved by the first real catalog publication, not by another admin-hardening
project.

The current public site still lacks the resolved global Search, What should I
play?, exactly-two Compare, About/accountability, practical-time and official-
destination bands, curated homepage system, mixed-artwork catalog and governed
analytics transport. It has three profiles, not the 12–15 validation corpus or
the approximately-100 quiet-release catalog.

The final Fable source has received the ten bounded conformance corrections.
The repaired 772,155-byte HTML and its support bundle were recovered, rendered
independently, scanned and digested. A separate visual-completeness audit found
that it preserves the product/state contracts but does not complete the final
UI/art direction required by the attached resolutions. Phase 3B therefore
remains active.

### Where the Master Plan stands

- **Phase 2:** substantially complete; support mode only.
- **Phase 3A:** candidate Scoring Protocol calibration; active in parallel and
  required before bulk catalog scoring.
- **Phase 3B:** product/contract conformance complete; bounded canonical-screen
  and art-direction pass pending before owner acceptance.
- **Phase 4:** pending; build and privately validate the complete public product
  on 12–15 deliberately varied profiles.
- **Phase 5:** pending; grow to approximately 100 substantive profiles.
- **Phase 6:** pending; quiet public-release readiness.

### Next product milestone

Complete and accept the final canonical public screen set, then begin Phase 4
with the trust/orientation shell and practical-time/official-destination profile
value. In parallel, finish
Protocol v1 calibration and select the 12–15-profile validation corpus. The
first real new profile should prove the remaining publication/deployment path
as part of catalog work.

## 2. Chronological decision reconstruction

| Date / context | Original decision | Later revision | Latest supported state |
| --- | --- | --- | --- |
| 6 Aug, Master Plan v0.4/v0.6 | **Game Profile** was both working product title and evaluation framework; methodology and calibration dominated. | Brand/product separation followed. | Historical foundation only. Game Profile now names the method. |
| Early Aug, rubric/evidence/scope ADRs | Eight dimensions, subcriteria-derived scores, explicit evidence/confidence, no unsupported certainty. | Later public design made the consequences more legible; it did not change the method. | Locked: eight dimensions, no aggregate, descriptive lows, range/Unknown/confidence/scope truth. |
| 13 Aug, Master Plan v0.7 | Public brand became **Should I Play?** at `shouldiplay.gg`; Game Profile remained the evaluation construct. | No later reversal. | Locked. Do not reopen. |
| 13–20 Aug, D3/ADR 0013 and public design | D3 became the individual-profile foundation; the product adopted Archivo + Newsreader, graphite + warm paper, ruled hierarchy and game-led accents. | Fable expanded the system to library/Search/Compare/mobile; later work preserved rather than rediscovered it. | Locked visual foundation; composition/states were reconciled in Phase 3B. |
| c. 20 Aug, Fable **Should I Play? at Fifteen** | Profile-first Field Guide, substantive catalog, trust design, two-game Compare, mobile Compare and deliberate art direction were explored in a large interactive artifact. | Some labels, launch scale, discovery, Search states, time, commerce and sequencing became obsolete after 24–25 Aug decisions. | Visual baseline, now superseded where the reconciled artifact explicitly changes it. |
| Earlier roadmap | Compare was deferred until profiles/catalog/search were established. | Homepage and product P0 work found that a small catalog gains decision value from direct pair comparison. | Superseded: exactly-two Compare is launch-critical but subordinate to profiles. |
| Earlier roadmap | MVP/launch was discussed as roughly 10–15, sometimes 15–25 profiles. | 24–25 Aug separated product validation from credible public usefulness. | 12–15 is private/limited validation; approximately 100 substantive profiles is the quiet-release floor. |
| 24 Aug, P0 owner decisions | Homepage became an art-led, utility-first entrance to a profile-first Field Guide with Find one, Compare two and Start with a question. Shape precedes interpretation; curated “Choosing between…” adds small-catalog value. | 25 Aug froze final journey labels and discovery semantics. | Homepage metaphor and hierarchy retained; labels are Search / Compare / What should I play?. |
| 24 Aug, P0 owner decisions | Authentic artwork should materially participate while preserving a complete artless fallback; exact legal route remained unresolved. | 25 Aug corrected the basis: editorial fair use may be used after implementation/policy/legal gates, alongside licensed/permissioned assets. | Mixed art/artless launch is locked; migration and legal/policy gate remain uncompleted. |
| 24 Aug, public-first correction | Phase 2 hardening had reached diminishing returns; public value should dominate. | Master Plan v0.9 moved Phase 2 to support mode. | Governing roadmap rule: admin work only for integrity, security, truthful publication/proof, content publication or public-product blockers. |
| 25 Aug, Search resolutions | Replace Find with global **Search** over published profiles and recognized factual identities. | Four availability states and private requests were specified. | Locked: published, recognized-unprofiled, ambiguous, unrecognized; no thin public stubs, public demand counts, queue or ETA. |
| 25 Aug, discovery resolutions | Replace vague Start with a question/Discover framing with a bounded product using controlled data and visible interpretation. | Intent, hard-eligibility, Unknown and time semantics were frozen. | Locked: **What should I play?**, deterministic at launch, no runtime LLM, editable criteria, no match percentage. |
| 25 Aug, Compare resolutions | Exactly two, difference/trade-off explanation, artwork-free, pair results noindex. | Shape-first homepage preview and interval-aware authoritative rows reconciled earlier Compare explorations. | Locked; all-pair prerendering is an implementation strategy subject to measured scale. |
| 25 Aug, practical-time resolutions | Time needed separate public treatment. | Old 15–25/40+/Vast language was replaced by exact bands and two session fields. | Locked outside the eight dimensions: Brief <=10, Moderate >10–25, Substantial >25–50, Long >50–100, Extensive >100, plus special states; useful window + interruption flexibility. |
| 25 Aug, metadata/commerce resolutions | Use a provider as a factual backbone without letting a provider own product meaning; complete the decision with official destinations. | Provider and affiliate choices remained open. | Provider-first/manual fallback locked; ordinary verified official links required; no live prices or affiliates are required for release. |
| 25 Aug, analytics resolutions | “No analytics” and “analytics later” were replaced by a purpose-limited release contract. | Raw queries and returning-browser identity were split into separate higher-risk layers. | Minimum traffic and semantic journey analytics are required for quiet release; raw-query/cross-session collection stays gated. |
| 25 Aug, personalization | Taste profiling/recommendations were attractive but premature. | Moved to the first major post-launch phase with prerequisites. | Deferred; no launch promise or disabled “coming soon” control. |
| 26 Aug, ADRs 0024–0029/Master Plan v0.9 | Converted resolutions into accepted protocol, Search/discovery, metadata, time, analytics and storefront contracts; made public-first sequencing explicit. | No later reversal. | Governing repository and roadmap constitution. |
| 26 Aug, Fable reconciliation | Existing **at Fifteen** artifact was surgically reconciled into **From Fifteen to a Hundred** with sixteen sections and 390px specimens. | Independent audit forced a major truth/semantics/accessibility repair; Fable 5 / High then applied the final ten bounded fixes and the recovered HTML passed an independent contract scan. A separate visual audit found that the attached resolution's art-led homepage and final canonical UI synthesis were not completed. | The artifact governs requirements/states, not final composition. Phase 3B needs one bounded visual-completion pass and owner acceptance. |

## 3. Decision register

| Area | Decision | Status | Governing now? | Notes |
| --- | --- | --- | --- | --- |
| Public identity | Product is **Should I Play?**; Game Profile is the method | **LOCKED** | Yes | Do not reopen |
| Evaluation | Exactly eight dimensions; subcriteria-derived | **LOCKED** | Yes | No ninth practical-time dimension |
| Aggregate | No public or hidden overall score | **LOCKED** | Yes | Includes machine-readable output |
| Meaning of lows | Descriptive, not inherently bad | **LOCKED** | Yes | Product explains fit/trade-offs |
| Evidence | Scope, confidence, range, Unknown and provisional status stay explicit | **LOCKED** | Yes | Sources are not votes |
| Primary scope | Explicit durable primary scope, never display-order inference | **LOCKED** | Yes | Canonical URLs follow ADR 0016 |
| Product shape | Profile-first Field Guide/library, not rankings | **LOCKED** | Yes | Registry is an internal retrieval metaphor |
| Homepage | Art-led, utility-first entrance; compact art supports utility | **LOCKED** | Yes | Full-height featured hero superseded |
| Journeys | Search / Compare / What should I play? | **LOCKED** | Yes | Ranked, not three equal tabs |
| Search states | Published / recognized-unprofiled / ambiguous / unrecognized | **LOCKED** | Yes | Global Search is launch-critical |
| Unprofiled games | Search-only factual record, no public stub route | **LOCKED** | Yes | Private request only |
| Coverage request mechanism | Accountless, private, deduplicated demand signal | **LOCKED** | Yes | Exact receiver/storage implementation is open |
| Coverage request receiver | Exact endpoint, deduplication, retention and abuse/privacy controls | **OPEN** | No | Must make the confirmation copy true |
| Discovery | Deterministic controlled-data interpreter with editable criteria | **LOCKED** | Yes | No runtime model or match percentage |
| Durable discovery route | Fable recommends `/play` | **PROVISIONAL** | Conditional | Freezes with Phase 3B acceptance |
| Experience taxonomy | Eleven balanced axes, descriptive not quality | **LOCKED** | Yes | Public anchors/labels need corpus calibration |
| Compare | Exactly two; differences not winners; artless; pair noindex | **LOCKED** | Yes | Profiles/rows remain authoritative |
| Compare prerender strategy | Prerender while measured corpus/pair cost is sensible | **PROVISIONAL** | Conditional | Dynamic/server fallback only when justified |
| Validation corpus | 12–15 substantive, deliberately varied profiles | **LOCKED** | Yes | Private/limited product validation |
| Quiet-release floor | Approximately 100 substantive profiles | **LOCKED** | Yes | Provisional may stand when truthfully tagged |
| Curation | Objective, evergreen authored and living expiring shelves | **LOCKED** | Yes | No fake activity or ranking feed |
| Practical time | Commitment plus session suitability outside rubric | **LOCKED** | Yes | Exact source is open |
| Practical-time source | Approved estimate source and attribution method | **OPEN** | No | No scraping without an approved contract |
| Metadata | Provider-first, provider-independent, manual fallback | **LOCKED** | Yes | Exact provider/terms open |
| Metadata provider | Exact primary provider and terms | **OPEN** | No | Manual fallback already governs |
| IGDB | Preferred candidate pending terms and test | **PROVISIONAL** | Conditional | No provider lock-in |
| Storefront | Verified official completion actions; richer commerce incremental | **LOCKED** | Yes | Ordinary links baseline |
| Current funding | Self-funded; no ads, affiliate links or paid coverage | **LOCKED** | Yes | Future affiliate programs are optional |
| Artwork | Mixed art/artless launch; licensed/permissioned or gated editorial fair use | **LOCKED** | Yes | Policy/legal and migration gates remain |
| Artwork activation gate | One-time policy/legal review and migration timing | **OPEN** | No | Required before the first fair-use production asset |
| SEO | Stable substantive profile pages; truthful canonical/sitemap/schema | **LOCKED** | Yes | No programmatic sludge or AggregateRating |
| Analytics | Purpose-limited traffic + semantic journey layer by quiet release | **LOCKED** | Yes | Provider open; risky layers gated |
| Analytics provider | Exact semantic event provider | **OPEN** | No | No internal dashboard required |
| Public byline | **the editor** | **LOCKED** | Yes | One public string |
| Public provenance | **Editor reviewed** | **LOCKED** | Yes | Audit/calibration lineage stays internal |
| Corrections | Contextual correction route and versioned material corrections | **LOCKED** | Yes | Mailbox operation still to verify |
| Corrections operation | Verify receiver and monitor/response workflow | **OPEN** | No | A factual operational check |
| Scoring Protocol | Candidate v1 must pass registered development/holdout gates | **PROVISIONAL** | Conditional | Blocks bulk catalog scoring, not frozen UI contracts |
| Catalog lineups | Exact 12–15 validation and approximately-100 release titles | **OPEN** | No | Must satisfy deliberate breadth, not quotas |
| Personalization | First major post-launch product phase | **DEFERRED** | No | Reopen only with catalog/taste/validation prerequisites |
| Content descriptors | Violence/phobia descriptors excluded from launch vocabulary | **DEFERRED** | No | Requires explicit later policy |
| Extra admin hardening | No SaaS-grade work absent a public/integrity blocker | **DEFERRED** | No | One-editor limitations accepted |
| Reconciled Fable artifact | Contract-conformant requirements/state reference; final UI/art direction incomplete | **PROVISIONAL** | Conditional | Does not outrank ADRs and is not yet the Phase 4 visual authority |

## 4. Conflict / contradiction register

| Conflict | Earlier position | Later position | Governing interpretation now |
| --- | --- | --- | --- |
| Product name | Game Profile as working product title | Should I Play? as public brand; Game Profile as method | Later explicit brand separation governs |
| Compare sequencing | Defer Compare until profile/catalog foundation | Compare is launch-critical and gives a small catalog decision value | Build exactly-two Compare in Phase 4 after shared profile/Search foundations, not after launch |
| Launch catalog size | 10–15 or 15–25 as MVP/launch | 12–15 is validation; approximately 100 is quiet release | Later scale correction governs; do not market the validation corpus as broad utility |
| Homepage journey labels | Find / Compare / Start with a question | Search / Compare / What should I play? | Later labels and ranked hierarchy govern |
| Discovery posture | Categories/tags or possibly broad natural-language discovery | Bounded deterministic interpretation over controlled data | Later contract governs; no chatbot implication |
| Compare count | Earlier 2–4-game ideas | Exactly two | Exactly two governs; multi-game Compare is not MVP scope |
| Compare hierarchy | Difference list could lead | Comparative shape, concise interpretation, authoritative rows | Shape-first presentation governs; rows remain methodological authority |
| Practical time | Old 15–25/40+/Vast bands and mixed pacing concepts | Exact five-band commitment + two session fields | ADR 0027 governs; old copy is superseded |
| Analytics | No analytics or defer all analytics | Minimum release measurement with separated privacy layers | Quiet release includes traffic and semantic events; raw queries/cross-session identity remain gated |
| Commerce | Pick affiliate/store provider first or add price comparison | Verified official action layer first; affiliates/live prices later | Ordinary official destinations govern; Compare never becomes price comparison |
| Artwork basis | Lawful scalable route unresolved or effectively license-only | Mixed licensed/permissioned/editorial-fair-use basis with safeguards | Later corrected basis governs; legal/policy/migration gate still blocks fair-use assets |
| Admin roadmap | Continue hardening toward a robust general internal product | Public-product value dominates; admin is one-editor support tooling | Stop non-blocking admin work; prove remaining deployment path with real catalog work |
| Scope primacy | Risk of deriving primary from display/order | Explicit persisted primary scope | Explicit primary governs; ordering remains presentation only |
| Search resolution copy | Reconciled artifact said “published beats ambiguous” | ADR 0025 requires honest ambiguity except an exact scope-correct identity | Fix the artifact; the ADR/code contract governs |
| Discovery near match | Reconciled artifact invented a dimension miss tolerance of `<= 0.5` | ADR 0025 says hard misses contradict; ADR 0027 defines session-budget borderline | Remove dimension tolerance; reserve near/borderline for governed relations |
| Fable sequencing | Artifact briefly reintroduced admin/Track-A-first work | Master Plan v0.9 puts Phase 2 in support and 3A parallel | Repaired public-first sequence governs |

## 5. Master Plan audit

| Plan area | Action | Audit |
| --- | --- | --- |
| Phase 0 rubric foundation | KEEP | The eight-dimension method remains the constitutional core. |
| Phase 2 editorial/publication machine | MODIFY | Mark substantially complete/support mode. Keep only integrity, security, truthful publication/proof, publishing and public blockers. |
| First application dispatch/full Live cycle | REORDER | Prove it through the first real new catalog publication in Phase 4, not another isolated admin project. |
| Generic multi-user/admin SaaS hardening | REMOVE | It has no present public value and the tool has one editor. |
| Phase 3A Protocol calibration | KEEP | Necessary before bulk scoring and for sustainable human-time measurement. Run in parallel with public implementation. |
| Phase 3B Fable reconciliation | MODIFY | Contract conformance/export are complete. Add one bounded canonical-screen/art-direction pass, then Tomas acceptance; no product rediscovery. |
| Provider-independent public contracts | KEEP | Already implemented as foundations; connect them to persistence/build projections and surfaces during Phase 4. |
| Phase 4 12–15 corpus | MODIFY | Treat as private product validation across all real states, not public launch. Include the first new-profile E2E proof. |
| Phase 4 internal order | REORDER | Trust/orientation -> time/storefront -> Search -> homepage -> Compare -> discovery -> hardening, while protocol/content work proceeds in parallel. |
| Minimal public-data authoring | ADD | Add only persistence/admin inputs that block truthful time, destination, Search registry, disclosure or curation publication. |
| Phase 5 approximately-100 production | KEEP | This is the scale/content operation needed for credible quiet release. |
| Phase 6 release readiness | MODIFY | Include operational Search Console, traffic measurement, approved semantic events, truthful sitemap/canonical checks and final privacy gates. |
| Phase 7 personalization | KEEP | Keep explicitly post-launch and evidence-gated; remove any launch hint/control. |
| Traditional taxonomy-first catalog/Discover | REMOVE | Not launch scope. The Field Guide entrance, Search and bounded discovery cover launch needs. |
| Live price/affiliate program | REMOVE | Not a release blocker. Official destinations ship first. |
| Broad internal analytics dashboard | REMOVE | Explicitly unnecessary. Provider failure is non-blocking. |
| Visual conformance review | ADD | Fable should review the implemented product after each major responsive surface and once before Phase 4 exit. |

The result is not a new roadmap; it is Master Plan v0.9 with the old admin-first
residue removed and the accepted design/implementation dependency order made
operational.

## 6. Proposed Master Plan vNext

### Phase 3B closure — complete and accept one public specification

**Objective:** turn the contract-conformant artifact into a concise canonical
screen set and accept it.

**User value:** engineering implements one coherent product rather than a mix of
old mockups and newer contracts.

**Deliverables:** canonical desktop/390px screens for the public routes and
material states; a genuinely art-led, utility-first homepage; realistic mixed
art/artless composition; frozen discovery route; and Tomas acceptance. The ten
contract corrections and verified local HTML are complete inputs.

**Exit criteria:** no open choice can change navigation, page types, content or
data contracts.

**Out of scope:** new brand, rubric, product discovery or implementation polish.

### Phase 4A — trust, orientation and practical profile value

**Objective:** make the current profiles and shell answer the real decision more
completely.

**User value:** readers see who reviewed the game, how to interpret it, how much
time it asks, where to play and how to correct a fact.

**Deliverables:** accepted shell/navigation, About, public byline/provenance,
reading key, contextual corrections, total commitment, session suitability,
official destinations and access disclosure.

**Exit criteria:** all three current profiles render truthful complete launch
states on desktop/mobile, including Unknown/unavailable/stale variants.

**Out of scope:** broad admin redesign, affiliates/live prices and discovery.

### Phase 4B — Search and the scalable Field Guide entrance

**Objective:** implement the dominant known-title path and homepage curation
grammar.

**User value:** visitors can find exact profiles, understand coverage gaps and
browse an intentional small library.

**Deliverables:** emitted index, accessible global Search/mobile sheet, four
states, approved request endpoint, objective/evergreen/living shelves, compact
art system and curated Compare preview.

**Exit criteria:** aliases/scopes/ambiguity/no-result behavior passes the corpus;
expired curation cannot render; no thin routes or fake activity exist.

**Out of scope:** external search service or curation CMS.

### Phase 4C — exactly-two Compare

**Objective:** build the full subordinate comparison journey.

**User value:** two candidates can be understood through meaningful differences
without a winner score.

**Deliverables:** launcher, canonical pair route, artwork-free identities,
interval-aware rows, concise deterministic summary, mobile sticky identity,
noindex/social-card behavior and profile exits.

**Exit criteria:** exact/range/Unknown/asymmetric-confidence/scope-pair cases and
nonvisual equivalents pass.

**Out of scope:** more than two games, global rankings and price comparison.

### Phase 4D — deterministic What should I play?

**Objective:** add needs-based discovery over approved catalog data.

**User value:** visitors can express a need, correct the interpretation and see
verified matches, trade-offs, borderline relations and uncertainty.

**Deliverables:** governed vocabulary, build projection, interpreter, editable
criteria, result groups, relaxation, durable noindex state and privacy copy.

**Exit criteria:** adversarial phrase corpus and hard-constraint truth tables
pass without runtime model/network dependency or public match percentage.

**Out of scope:** chatbot, personalization and content descriptors.

### Phase 4E — 12–15-profile private validation

**Objective:** test the complete product and production workflow on varied real
content.

**User value:** a credible private/limited preview whose behavior can be learned
from before scale.

**Deliverables:** 12–15 profiles, mixed artwork/artless states, first new-profile
Publish -> dispatch -> Live proof, measured production time, local/test event
instrumentation and founder-led scenarios.

**Exit criteria:** coherent desktop/mobile/accessibility behavior, no publication
blocker, measured content throughput and a bounded change list for scale.

**Out of scope:** claiming public catalog breadth.

### Phase 5 — catalog production to approximately 100

**Objective:** scale validated content and factual operations without weakening
quality.

**User value:** Search, Compare and discovery become broadly useful across a
balanced catalog.

**Deliverables:** curated lineup, approved provider/manual fallback, calibrated
classifications/time data, official destinations, living curation operations,
routine reassessment and approximately 100 substantive profiles.

**Exit criteria:** catalog coverage and operations satisfy the quiet-release
criteria; provisional profiles remain truthfully marked.

**Out of scope:** automated scoring or SEO page factories.

### Phase 6 — quiet public release

**Objective:** expose the product carefully and verify truth, acquisition and
operations.

**User value:** a fast, accessible, trustworthy public decision product.

**Deliverables:** production conformance, Search Console/sitemap/canonical
verification, traffic and approved semantic events, privacy notice/controls,
social cards, correction/reassessment operation and release observations.

**Exit criteria:** the §18 release definition passes with no false scale,
commercial or evidence claims.

**Out of scope:** accounts, personalization, live global price data, native apps
and growth loops.

### Phase 7 — post-launch personal matching validation

**Objective:** test whether an explicit taste model materially improves
decisions over Search/Compare/discovery.

**User value:** only if validated, a more personal interpretation of the same
profiles without changing editorial truth.

**Deliverables/exit:** recovered questionnaire, transparent profile, small
opt-in test and evidence that it improves decisions.

**Out of scope:** inferred surveillance, hidden taste score or score changes.

## 7. Open product questions

### P0 — must answer before the dedicated UI/UX implementation pass

#### Complete and accept the final canonical UI set

**Why it matters:** it freezes composition, responsive behavior, component
states and copy hierarchy.

**Prior constraints:** D3/Field Guide system and all product contracts are
locked; the ten conformance fixes are complete; the current artifact does not
outrank ADRs and is not a final-composition authority.

**Recommendation:** use the repaired artifact as the requirements/state source,
complete the bounded visual pass in the same Fable project, then review one
canonical screen set—not the old exploratory concepts.

**Tomas choice:** accept or reject the resulting canonical screen set. The
current artifact should not be accepted as the final UI.

#### Freeze the durable discovery route

**Why it matters:** links, history, noindex behavior and implementation paths
depend on it.

**Prior constraints:** a durable full-results state is locked; exact route was
left to Phase 3B. Fable recommends `/play`.

**Recommendation:** accept `/play`; it is short, public-facing and avoids
renaming the capability to Discover.

**Tomas choice:** approve `/play` with the artifact.

#### Freeze launch copy/state semantics where the design still conflicts

**Why it matters:** a dimension tolerance or false timing/funding claim changes
product truth, not just wording.

**Prior constraints:** ADRs 0025/0027/0029 and the public byline/provenance
decisions already answer these.

**Recommendation:** apply the ten audit corrections; do not debate them as new
options.

**Tomas choice:** none unless rejecting a governing ADR.

### P1 — must answer before public MVP / quiet launch

#### Select the 12–15 and approximately-100 title lineups

**Why it matters:** validates breadth, comparison clusters, evidence states,
artwork and content throughput.

**Prior constraints:** deliberate genre/platform/era/business-model diversity;
no inflated quotas or SEO sludge.

**Recommendation:** choose the 12–15 corpus first for adversarial coverage, then
derive the approximately-100 plan from permanent demand-weighted breadth.

**Tomas choice:** approve both lineups; the first is needed before Phase 4E.

#### Approve the factual metadata provider and terms

**Why it matters:** title registry, aliases, platforms and update operation need
a sustainable backbone.

**Prior constraints:** provider-first, one primary, official overrides and a
manual fallback. IGDB is only provisional.

**Recommendation:** bounded IGDB terms/data test; retain manual fallback if it
fails.

**Tomas choice:** approve provider/terms after the test.

#### Approve practical-time source and attribution

**Why it matters:** the public band cannot say “sourced” without a lawful,
repeatable method.

**Prior constraints:** HowLongToBeat is a candidate only; no scraping without an
approved contract.

**Recommendation:** define editor logs plus one approved external source, with
range/uncertainty and override provenance.

**Tomas choice:** approve the method/source before publishing time facts.

#### Choose the coverage-request receiver and privacy/storage contract

**Why it matters:** confirmation copy must prove what is stored, deduplicated and
retained.

**Prior constraints:** no account, public count, queue, ETA or promise; separate
from corrections.

**Recommendation:** a bounded first-party endpoint with per-title deduplication,
abuse protection and minimal retained data; do not capture contact details.

**Tomas choice:** approve receiver/retention after technical/privacy review.

#### Verify corrections and complimentary-access facts

**Why it matters:** public accountability cannot point to an unmonitored mailbox
or omit a material access fact.

**Prior constraints:** public route carries title/scope/evidence-cutoff context;
material corrections are versioned internally.

**Recommendation:** operationally verify `corrections@shouldiplay.gg` and audit
the three existing profiles once for complimentary access.

**Tomas choice:** factual confirmation only.

#### Complete artwork policy/legal and migration gates

**Why it matters:** authentic artwork is high product value but must remain
lawful, attributable, necessary and replaceable.

**Prior constraints:** mixed art/artless launch; editorial fair use is allowed
only after the accepted safeguards and one-time review.

**Recommendation:** complete policy/legal review and apply migration 0010 only
when the first gated asset is ready for an approved deployment.

**Tomas choice:** approve the policy/legal outcome.

#### Finish Protocol v1 calibration and production-time baseline

**Why it matters:** approximately 100 profiles are infeasible without a valid,
repeatable human-governed process.

**Prior constraints:** registered six-game development and four-game holdout
program; Tomas final approval.

**Recommendation:** continue in parallel with public implementation; block bulk
catalog scoring, not Phase 4 shell work.

**Tomas choice:** approve/fail the protocol after the report.

#### Select minimum analytics and complete privacy gates

**Why it matters:** release should answer whether Search, Compare and discovery
work without optimizing addictive engagement.

**Prior constraints:** Cloudflare/Search Console, a small semantic provider,
separate raw-query dataset and separate pseudonymous visitor layer.

**Recommendation:** enable traffic plus allowlisted semantic events for quiet
release; leave raw queries and cross-session identity off until separately
justified and reviewed.

**Tomas choice:** approve provider and any higher-risk layer.

#### Complete SEO/social operations

**Why it matters:** substantive profiles are the acquisition loop; indexing and
shares must reflect real publication.

**Prior constraints:** no `AggregateRating`, mass-generated thin pages or
indexable pair/query results.

**Recommendation:** before release verify Search Console, sitemap/canonicals,
profile and Compare social cards and basic truthful `VideoGame`/breadcrumb
schema. Bing Webmaster can follow in the same release-readiness pass if the
operational cost is trivial.

**Tomas choice:** none beyond approving final social-card art direction.

### P2 — can be learned after launch

- **Personal matching:** reopen only after approximately-100 catalog coverage,
  a recovered transparent taste model and opt-in validation.
- **Raw-query and returning-browser analytics:** enable only if concrete
  vocabulary/retention questions justify the privacy cost.
- **Affiliates and live offers:** pilot after universal official destinations;
  never let payment affect editorial or store visibility.
- **Dynamic Compare strategy:** replace pair prerendering only when measured
  build size/time or catalog growth requires it.
- **Content descriptors:** violence/phobia descriptors need a separate policy,
  source and calibration decision.
- **Traditional taxonomy-first catalog/Discover:** add only if Search, shelves
  and bounded discovery stop serving catalog browsing.
- **Formal research program:** useful later, not a launch gate; founder-led
  scenario validation is sufficient now.
- **Advanced schema/dynamic social experimentation:** only where search/social
  evidence shows value; never add rating semantics.
- **Admin curation console/internal dashboard:** build only after file/build
  configuration demonstrably blocks one-editor publication.

## 8. Design readiness

Yes: the project is finally ready for the dedicated UI/UX/art-direction phase.
The reconciled Fable artifact completed the contract/state foundation, but the
actual final-composition phase is not complete.

The foundation is stable because identity, methodology, route/scoping model,
journey hierarchy, Search/discovery/Compare semantics, catalog milestones,
time, artwork, trust, SEO, analytics, commerce and admin boundaries are now
explicit contracts. The repository also has the real D3 visual/profile system
and provider-independent domain foundations.

Before implementation, Fable must produce the bounded canonical screen set
defined in the visual-completeness audit; Tomas and ChatGPT then settle Phase
3B acceptance and the `/play` route. The ten audit corrections are not new
owner questions. Provider, time-source, request-receiver and catalog choices
can be made during Phase 4 before their dependent slices ship.

Design can still answer exact spacing, responsive composition, interaction
polish, copy rhythm and component variants. It cannot invent new scoring,
ranking, funding, privacy, evidence or availability semantics.

The prior **Should I Play? at Fifteen** artifact remains the visual-system
baseline; the reconciled **From Fifteen to a Hundred** file is the governing
requirements/state successor. Neither is yet the final canonical screen set.
Generic AI/SaaS aesthetics, bento/card soup, glass, neon HUD treatment, fake
activity and oversized search-only composition remain rejected.

## 9. Fable reconciliation plan

The efficient Fable mission from this point is now:

1. preserve the existing project, repaired source and verified recovered HTML;
2. use the visual-completeness audit to produce the canonical desktop/390px
   public screen set without reopening product discovery;
3. use realistic controlled artwork composition to finish the art-led homepage
   and mixed art/artless system;
4. have Tomas accept the result as the Phase 4 specification and freeze
   `/play`;
5. during implementation, use Fable for bounded responsive-state or art-
   direction questions without rediscovering the product;
6. after each major surface and before Phase 4 exit, compare the real
   implementation against the accepted artifact and log intentional drift.

Use **Fable 5 / High** inside the existing Claude Design project for the visual-
completion pass. Do not rerun discovery. Opus Extra is useful only for a fresh-
context copy/accessibility critique of the completed canonical screen set; ADR
conformance remains a Codex/repository review.

## 10. Immediate next agenda

1. **Run the bounded Fable High canonical-screen/art-direction pass.**
2. **Review that final screen set with Tomas; accept it and freeze `/play`.**
3. **Approve the 12–15-profile validation lineup and its diversity/adversarial
   coverage.**
4. **Run Phase 4 Slice 1: public shell, About, byline/provenance, reading key and
   contextual corrections.**
5. **Choose/approve the practical-time source and add minimal time/storefront
   persistence plus profile bands.**
6. **Choose the request receiver/privacy contract and build the four-state
   global Search.**
7. **Implement the curated homepage grammar and exactly-two Compare.**
8. **Calibrate vocabulary/experience anchors on the validation corpus and build
   deterministic What should I play?.**
9. **Complete the 12–15-profile private test, including the first real new-
   profile Publish -> dispatch -> Live proof.**
10. **Finish Protocol v1 calibration, incorporate measured learning and begin
    approximately-100-profile catalog production.**

## Governing companion documents

- `Game_Profile_Master_Product_and_Build_Plan_v0.9.md`
- `Should_I_Play_Public_Product_P0_Decisions_2026-08-24.md`
- `Should_I_Play_Public_Product_Resolutions_2026-08-25.md`
- `decisions/0024-scoring-protocol-v1-and-package-contract.md`
- `decisions/0025-search-registry-and-deterministic-discovery.md`
- `decisions/0026-provider-first-metadata-ownership.md`
- `decisions/0027-practical-time-is-not-a-game-profile-dimension.md`
- `decisions/0028-purpose-governed-product-analytics.md`
- `decisions/0029-official-storefront-actions-before-live-commerce.md`
- `design/Should_I_Play_Fable_Conformance_Audit_2026-08-26.md`
- `design/Should_I_Play_Fable_Visual_Completeness_Audit_2026-08-26.md`
- `design/Should_I_Play_Fable_Canonical_Screen_Mission_2026-08-26.md`
- `design/Should_I_Play_Phase_4_Implementation_Map_2026-08-26.md`
