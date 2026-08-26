# Should I Play? — Public Product Resolution Register

- **Decision dates:** 24–25 August 2026
- **Recorded:** 26 August 2026
- **Status:** Governing product decisions unless a row is explicitly marked otherwise
- **Source record:** `p_resolutions.md`, SHA-256 `29d4b2db2c04679d696411a7dd1bb1e2235061f168dd7756762890e1f8037e64`
- **Scope:** public journeys, Search, discovery, metadata, time, analytics, commerce, validation, catalog operation, personalization posture, and the corrected artwork basis

This record integrates the resolutions made after
`Should_I_Play_Public_Product_P0_Decisions_2026-08-24.md`. It is deliberately
written as a current decision contract rather than a transcript. The dated P0
record remains the chronology for the homepage, scoring-protocol direction,
catalog milestone correction, curation, accountability, and mixed-artwork
posture. Where this record is more specific or explicitly records a later
correction, this record governs.

The source file contained repeated explanations, intermediate options, and a
later correction to the artwork decision. Those passages are evidence of the
decision process; they are not separate competing requirements.

---

## 1. Supersession summary

The following later decisions replace wording in the 24 August record and in
Master Plan v0.9 as originally drafted:

| Earlier wording | Governing wording now |
|---|---|
| Find / Compare / Start with a question | **Search / Compare / What should I play?** |
| Registry as a possible public proposition | Field Guide remains public proposition; registry is an internal Search/catalog pattern |
| Search, Compare, and exploration shown with roughly equal prominence | Search is dominant; Compare is the major secondary action; What should I play? unfolds progressively |
| Search limited to published profiles | Search may recognize factual registry records without a published profile, but never creates a public stub page |
| Search/Discovery P0 remained open | The governing deterministic discovery model is now resolved at product-contract level |
| Lightweight traffic analytics only; custom events later | A small purpose-governed product-event layer is **required before public release**; provider remains open |
| Runtime/store providers were generally post-launch | Verified official storefront actions are required at launch; richer live commerce remains incremental |
| Personalization was an indefinite later possibility | It is the first major post-launch product phase, but receives no launch promise or disabled UI |
| Editorial fair use required a later product decision | Editorial fair use is an approved artwork basis for appropriate official promotional material; implementation and one-time legal review remain required before first production use under that basis |

The following remain unchanged:

- exactly eight Game Profile dimensions;
- no public or hidden universal aggregate;
- explicit scope, evidence, confidence, ranges, and Unknown;
- profiles as the substantive public objects;
- exactly two profiles in launch Compare;
- differences and trade-offs, never a winner;
- artwork-free Compare;
- 12–15 substantive profiles as private/limited validation;
- approximately 100 substantive profiles as the first credible quiet-public-release floor;
- continuous demand-weighted catalog expansion after release;
- public-product value over internal-tool polish.

---

## 2. Product ambition and launch posture

Should I Play? is intended to become a broad, trustworthy, profile-first
reference and decision product for gamers considering what to play, download,
or buy. It is not intended to remain a permanently small collection.

Catalog milestones:

- **12–15 substantive profiles:** private or limited product/design validation;
- **approximately 100 substantive profiles:** first credible public-release
  floor, not catalog completion;
- **after release:** continuous demand-prioritized widening and deepening.

Public release is quiet but real:

- fully public, canonical, and indexable where appropriate;
- selectively shared rather than launched with a concentrated campaign;
- monitored and patched in production;
- no prominent or permanent beta badge;
- a broader announcement waits for stable core journeys, trustworthy analytics,
  correct indexing, reliable mobile use, and sustainable content operations.

The release gate is outcome-based. It does not require a formal moderated
research program or an arbitrary external tester count. Tomas, GPT, and Claude
perform founder-led validation with fresh contexts, adversarial scenarios,
automated tests, accessibility checks, and production verification. Informal
outside testing is welcome but not mandatory.

---

## 3. Governing public journeys and homepage hierarchy

The public journeys are:

1. **Search** — “I already know the game.”
2. **Compare** — “I am deciding between two games or using one as a reference.”
3. **What should I play?** — “I do not know the exact game; help me identify a
   suitable option for this need.”

Search has the greatest visual and interaction priority. Compare is immediately
available as a major secondary action. What should I play? is clearly available
but progressively disclosed. Editorial shelves and broader library browsing
follow. Personal-profile creation does not appear in the launch hierarchy.

The homepage remains an art-led, utility-first entrance to a profile-first Field
Guide. It may borrow useful browsing principles from large entertainment
libraries—recognizable artwork, editorial shelves, visible range, and
progressive disclosure—but not opaque engagement ranking, fake personalization,
or endless undifferentiated carousels.

The 24 August requirements still govern:

- compact artwork supporting rather than displacing utility;
- a shape-first inline comparison preview;
- mandatory “a bigger shape is not better” guidance;
- authored “Choosing between…” comparisons;
- artwork-led profile shelves;
- objective fresh shelves and explicitly authored evergreen/living shelves;
- editor-selected “Compare with” links on profiles;
- no rankings or automatic carousel.

---

## 4. Search and coverage registry

### 4.1 Search contract

Search is global and supports:

- canonical titles;
- alternate titles and aliases;
- common misspellings;
- editions and profile scopes where relevant;
- franchise/series identification where useful;
- disambiguating year, platform, edition, and scope context.

It routes published matches to the canonical profile route:

- `/games/[canonical-slug]` for the explicit primary scope;
- `/games/[canonical-slug]/[scope-key]` for a sibling scope.

### 4.2 Four required Search states

1. **Published profile** — open the applicable canonical profile.
2. **Recognized but unprofiled** — identify the game and state that its Game
   Profile is not yet available.
3. **Ambiguous title** — present enough edition/year/platform/scope context to
   choose correctly.
4. **Unrecognized query** — say no title was recognized and allow correction or
   broader browsing.

A recognized factual registry record is not a Game Profile. It receives no:

- public `/games` page;
- indexable factual stub;
- sitemap entry;
- profile structured data;
- scores, confidence, Pull/Risk, or recommendation.

Search may show truthful related published profiles based on franchise,
developer, normalized form, or an explicitly authored relationship. It must not
describe these as “best alternatives” or personalized recommendations without
supporting discovery criteria.

### 4.3 Coverage requests

A recognized unprofiled result offers **Request a Game Profile**.

The action:

- requires no account, email, explanation, or form;
- records a bounded internal demand signal;
- acknowledges receipt without promising coverage;
- exposes no public request count, queue, ranking, or ETA;
- uses proportionate, privacy-preserving deduplication/rate limiting;
- never affects evaluation content or result ordering.

Demand is one catalog input alongside relevance, coverage balance, comparison
value, evidence availability, and production cost.

---

## 5. What should I play? discovery contract

### 5.1 Runtime posture

Launch discovery does not depend on a paid runtime language-model API. It uses:

- a governed controlled vocabulary;
- title aliases;
- normalized factual facets;
- controlled experience classifications;
- the eight Game Profile dimensions when semantically appropriate;
- deterministic filters and ranking;
- a broad, generated phrase/synonym/misspelling layer;
- compositional query interpretation;
- visible and editable interpreted criteria.

GPT and Claude should be used aggressively during development to propose
concepts, synonyms, adversarial queries, expected interpretations, regression
corpora, and classification candidates. They do not silently govern definitions
or publish classifications.

A future hosted language-model API may translate language into the same
controlled concepts when usage and economics justify it. It cannot replace the
catalog or fabricate unpublished claims.

### 5.2 Results flow

The experience is a progressive hybrid:

- the homepage shows the interpreted request immediately;
- the visitor can correct, remove, or change criteria;
- a small preview shows the strongest initial matches;
- full results continue into a durable results state supporting refinement,
  filters, trade-offs, no-result behavior, sharing, refresh, and browser
  navigation;
- mobile may transition to the full state earlier;
- generated query-result states are normally noindex;
- stable substantive editorial collections may be indexable.

### 5.3 Intent model

Every interpreted criterion has one internal intent:

1. **Must include**
2. **Prefer**
3. **Prefer not**
4. **Must exclude**

Defaults:

- ordinary positive language → Prefer;
- ordinary negative language → Prefer not;
- explicit “must/only/require/no/nothing with” language → a hard constraint;
- a concrete available-session statement such as “I have 30 minutes” → Must,
  even without the word “must.”

Public controls use plain language such as “Local co-op — required” or “High
punishment — avoid.” No numeric importance weight or match percentage appears.

### 5.4 Constraint eligibility

**Tier 1 — hard eligible:** reliable facts/normalized categories such as
platform, release state, solo/multiplayer, local/online co-op, player count,
perspective, and governed structure.

**Tier 2 — conditionally hard eligible:** explicitly defined and deliberately
classified experiential categories such as horror, story-forward,
exploration-forward, cozy, or multiplayer-dependent. Provider-tag absence is
not proof of absence.

**Tier 3 — soft by default:** continuous editorial judgments and the eight
dimensions. These influence alignment and trade-off explanations unless an
explicit governed threshold contract applies.

### 5.5 Unknown under a hard constraint

Unknown is neither pass nor contradiction.

- known satisfaction → verified match;
- known violation → excluded from normal matches;
- Unknown/missing/ambiguous/stale → separate indeterminate group.

Every indeterminate result identifies which requirement could not be verified
and which other criteria it satisfies. Near match and indeterminate remain
different states.

### 5.6 Result ordering

Order considers, in sequence:

1. satisfaction of valid hard constraints;
2. alignment with requested characteristics;
3. evidence completeness and confidence;
4. material compromises/conflicts;
5. temporal or editorial relevance where appropriate.

Evidence confidence qualifies the product’s certainty. It is not match strength.
A query-specific internal relevance calculation is permitted, but it cannot
become an overall game-quality score, hidden universal ranking, or public match
percentage.

Preferred public groupings include:

- Strongest matches;
- Good possibilities;
- Matches with trade-offs;
- Possible options requiring confirmation.

No-result behavior distinguishes no verified match from incomplete catalog
coverage, offers explained near matches, and allows criteria to be relaxed. It
never silently discards a hard constraint.

---

## 6. Discovery data model

### 6.1 Faceted game type

Games/scopes use separate controlled facets rather than one genre tree or an
undifferentiated tag cloud:

- genre families;
- subgenres/recognized forms;
- perspective;
- structure;
- primary activities;
- mood and pressure;
- social format.

Facets belong to the game unless a materially distinct scope differs. A concise
public descriptor may combine facets, while Search and discovery retain the
full representation.

### 6.2 Balanced experience taxonomy

Launch discovery includes eleven editorial experience axes:

1. challenge demand;
2. reflex/precision demand;
3. mechanical complexity;
4. cognitive load;
5. failure penalty;
6. pressure/tension;
7. repetition or grind exposure;
8. guidance versus self-direction;
9. narrative emphasis;
10. emotional heaviness;
11. horror/fright intensity.

They normally use Low / Medium / High / Unknown / Not applicable. They describe
experience, not quality, and require later calibrated definitions.

### 6.3 Relationship to the eight dimensions

Discovery uses dimensions only when the request concerns the evidenced strength
of what that dimension evaluates—for example, polish, atmosphere, emotional
impact, focus, or medium-specific craft.

It does not substitute dimensions for facts or experience intensities:

- open world → structure facet;
- short game → total commitment;
- short sessions → session suitability;
- horror/cozy → mood/intensity classification;
- multiplayer → social format;
- story-heavy → narrative emphasis, not Story & Character Investment quality.

No query double-counts the same concept through a dimension and redundant tag.

### 6.4 Dimension hard-threshold contract

Dimension requests normally remain preferences. Explicit hard language may
create one transparent minimum:

- **Strong-or-better:** dimension result at least 1.5 on the rubric’s 0–2 scale;
- **Exceptional:** dimension result 2.0.

For hard qualification:

- exact at/above threshold → qualifies;
- exact/range entirely below → fails;
- range crossing threshold → indeterminate;
- Unknown → indeterminate;
- Low evidence confidence → indeterminate;
- at least Medium confidence is required for a full match.

This does not authorize summing dimensions or interpreting tolerance for rough
edges as a preference for low quality.

---

## 7. Provider-first metadata ownership

Should I Play? uses one approved primary provider as the routine factual-data
backbone, with bounded official-source verification and enrichment.

### 7.1 Ownership layers

1. **Provider-backed facts:** titles, aliases, developer/publisher, release
   dates/status, platforms, series/version relationships, basic genres/modes,
   player counts, perspective, identifiers, and approved runtime records.
2. **Should I Play? normalization:** stable internal identity, facets, social
   format, player-count distinctions, explicit Yes/No/Unknown/Not applicable,
   discovery concepts, and scope relationships.
3. **Should I Play? editorial evaluation:** eight dimensions, evidence,
   confidence, scope, experience intensities, session interpretation, Pull/Risk,
   editorial copy, comparables, shelves, and trade-offs.

Provider ratings, popularity, classifications, or artwork availability never
calculate or alter evaluation scores.

### 7.2 Precedence and provenance

- the approved primary provider supplies routine facts;
- official publisher/developer/platform/store sources override critical,
  disputed, or volatile facts;
- secondary providers fill material gaps or resolve conflicts only;
- approved manual corrections survive refreshes;
- provider access is behind adapters;
- public pages never depend on a live provider request;
- provider failure cannot remove published profiles.

Imported data retains enough field-level provenance to answer source, retrieval
time, transformation, correction, refresh behavior, and current public value.
Normalization uses stable internal concept IDs, versioned mappings, explicit
Unknown/ambiguous states, and exceptions.

### 7.3 Provider status

- **IGDB:** preferred candidate, not approved pending written commercial terms,
  image clarification, and a representative data test;
- **RAWG:** contingency pending its own commercial/caching/attribution clarity;
- routine multi-provider reconciliation: removed from MVP;
- one-provider adapter plus manual fallback: governing.

Do not pay approximately $150/month for a metadata provider until the product
generates roughly $1,500/month in dependable revenue and the provider has proven
greater value than cost. Reaching that threshold permits evaluation, not
automatic purchase.

The final provider test covers approximately 30 representative current,
historical, AAA, indie, multiplatform, aliased, remade, expanded, and
structurally unusual games.

Artwork remains a separate rights-controlled workflow even when a provider
returns image URLs.

---

## 8. Total commitment and session suitability

These are distinct practical concepts and neither is a ninth dimension.

### 8.1 Total commitment

Total commitment estimates completion time for the applicable profile scope.
An approved record retains provider/source, external identity, scope, estimate
type, hours/range, freshness, uncertainty, and override state.

The normal public headline is derived from **engaged play**: central path plus
meaningful optional content, without completionist behavior. Focused path
remains visible; completionist time is secondary.

Governing engaged-play bands:

| Band | Estimate |
|---|---:|
| Brief | up to 10 hours |
| Moderate | over 10 through 25 hours |
| Substantial | over 25 through 50 hours |
| Long | over 50 through 100 hours |
| Extensive | over 100 hours |

Special states are Open-ended, Variable, Unknown, and Not applicable. A range
crossing one adjacent boundary may use a combined label; wider uncertainty uses
Variable or Unknown rather than a midpoint.

HowLongToBeat is a preferred candidate, not an approved provider. Do not scrape
first and resolve permission later. Verify API/feed availability, commercial
use, attribution, storage, caching, derived bands, refresh, and correction
obligations.

### 8.2 Session suitability

Session suitability has two scope-aware fields:

**Useful session window**

- Very short: approximately 20–30 minutes;
- Short: approximately 30–60 minutes;
- Longer: approximately 60–120 minutes;
- Extended: typically more than two hours;
- Variable / Unknown / Not applicable.

**Interruption flexibility**

- High;
- Medium;
- Low;
- Unknown;
- Not applicable.

The public summary is derived from both. Neither silently overrides the other.
Conflicts are stated directly, such as “Short runs, but finish the run” or “Best
with an hour or more, but easy to pause.” The underlying fields remain
inspectable.

Reacclimation cost remains editorial rationale, not a third launch axis, unless
the validation corpus repeatedly proves the two-axis model misleading.

### 8.3 Time-budget behavior

A concrete available-session statement defaults to a hard constraint. For a
hard budget:

- window upper bound at/below budget → full match;
- budget falls inside the window → labeled borderline near match;
- window begins above budget → does not satisfy;
- Unknown → indeterminate.

Preference wording keeps the criterion soft. Total completion budget and
session budget remain separate and visible.

---

## 9. Analytics and privacy

Purpose-governed product analytics is required for public release. It exists to
improve Search, discovery, coverage, Compare, profile usefulness, return
behavior, and reliability—not to maximize addictive engagement or influence
editorial output.

### 9.1 Four layers

1. **Traffic/acquisition:** Cloudflare Web Analytics and Search Console.
2. **Product events:** a custom-event provider; final provider remains open.
3. **Query research:** a separate raw natural-language dataset.
4. **Cross-session behavior:** a first-party pseudonymous visitor record.

### 9.2 Initial semantic events

Search:

- `search_submitted`
- `search_profile_selected`
- `search_unprofiled_result_shown`
- `search_no_result`
- `profile_coverage_requested`

Discovery:

- `discovery_submitted`
- `discovery_interpretation_edited`
- `discovery_result_set_viewed`
- `discovery_result_selected`
- `discovery_constraint_relaxed`

Compare:

- `compare_started`
- `compare_second_profile_selected`
- `compare_viewed`
- `compare_source_profile_opened`

Profiles:

- `profile_compare_started`
- `profile_evidence_expanded`
- `profile_outbound_link_followed`

Events describe stable intentions rather than UI widgets. Controlled properties
may include surface, internal game/scope IDs, taxonomy/parser version, criterion
counts/types, result state, catalog version, device class, and pseudonymous
session/visitor IDs.

Ordinary event properties must not contain raw query text, form contents,
keystrokes, raw DOM text, unrestricted URLs/query strings, contact details,
advertising IDs, or fingerprints.

### 9.3 Query research and visitor identity

Raw query text is stored separately because it is necessary to improve language
coverage and interpretation. It is not linked to the persistent cross-session
visitor ID by default. Initial provisional retention is 90 days for unsanitized
queries; sanitized research/regression examples may be retained longer.

The first-party returning-browser identifier is pseudonymous, not anonymous and
not a taste profile. It has no name/email, no cross-site use, no fingerprinting,
a visible reset/opt-out, restricted provider use, and a suggested 180-day
inactivity expiry.

Before enabling raw-query or cross-session collection, publish an accurate
privacy notice and complete a focused lawful-basis, consent, DPA, subprocessor,
data-location, retention, deletion/export, transfer, and breach-handling review.

A version-controlled event registry owns every event’s definition, trigger,
purpose, owner, permitted/prohibited properties, schema version, and retention
class. No internal analytics console is required.

---

## 10. Commerce and storefront actions

Full commerce is the intended destination, delivered incrementally. It never
affects scores, coverage, Search/discovery ordering, Compare conclusions, or
store visibility.

### 10.1 Launch baseline

Every launch profile should provide:

- supported platforms where evidence is reliable;
- verified official “Get the game” / “Where to play” destinations;
- edition/platform awareness where required;
- honest unavailable/uncertain states;
- ordinary links when no affiliate relationship exists;
- clear commercial disclosure.

Steam remains visible even without an affiliate program. A paying store never
displaces a materially important non-paying store.

### 10.2 Incremental rollout

1. universal official action layer;
2. affiliate-ready internal model and approved programs;
3. limited live-commerce pilot on roughly 10–20 PC profiles;
4. evidence-based expansion by platform, region, offers, and subscriptions.

The internal model distinguishes game/scope, edition, platform, region,
storefront, ordinary URL, affiliate URL, relationship type, disclosure, source,
freshness, and staleness.

Stale or unverifiable prices/offers disappear conservatively while verified
official destinations may remain. Should I Play? does not process payments,
sell keys, promise worldwide price coverage, or show grey-market sellers under
the launch contract.

---

## 11. Catalog and content operation

Catalog widening and deepening are permanent primary operations.

- **Widening:** new games and primary scopes.
- **Deepening:** meaningful sibling scopes, evidence, platform distinctions,
  reassessments, artwork, availability, and commerce.

Initial planning guardrails are approximately:

- 60% demand anchors;
- 25% breadth coverage;
- 15% strategic/methodological coverage.

These are not rigid quotas. Candidate signals include requests, recognized
unprofiled searches, discovery gaps, external search demand, release relevance,
evergreen importance, platform/genre/era/experience gaps, useful comparisons,
methodological extremes, and profiles needing refresh.

The backlog maintains four lanes:

- high-demand additions;
- coverage-gap additions;
- strategic comparison/methodology additions;
- existing-profile deepening and refresh.

### 11.1 Profile production

The production system is human-governed and evidence-assisted:

1. scope definition;
2. source collection;
3. evidence normalization;
4. independent GPT/Claude analysis where useful;
5. Tomas editorial adjudication;
6. public writing;
7. traceability/truth verification;
8. publication proof.

AI output is working material, never published truth. The quality floor remains
eight dimensions, no aggregate, descriptive lows, explicit scope/uncertainty,
traceable evidence, contradictions preserved rather than averaged, and useful
editorial explanation.

Profiles #4–#6 establish the first production baseline:

- one relatively simple profile;
- one typical profile;
- one complex or multi-scope/platform-sensitive profile.

Measure sourcing, normalization, evaluation, writing, verification, artwork,
platform/commerce, and publication effort. Profile #4 is catalog work and a
measured sample, not a separate infrastructure phase.

---

## 12. Personalization posture

Personal matching is the first major post-launch product phase but is not a
launch dependency.

Preferred progression:

1. recover and reconcile the existing questionnaire with the current rubric and
   discovery vocabulary;
2. test an ephemeral no-account preference profile;
3. validate matching semantics;
4. test dimension-by-dimension personal/game comparison and radar overlap;
5. add persistence/accounts only if saving creates demonstrated repeat value;
6. add “compare with my preferences.”

Launch must not advertise personalization as coming soon, place it in primary
navigation, or show disabled controls. A restrained tester invitation is allowed
only once a real experiment, data handling, schedule, and review capacity exist.

A future personal radar must distinguish desired intensity, minimum acceptable
level, importance, indifference, and active dislike. Polygon area or overlap
never becomes a fit percentage.

---

## 13. Corrected artwork basis

Editorial fair use is an approved, independent production basis for appropriate
official promotional artwork used to identify, navigate to, or directly
illustrate substantive evaluation and criticism.

Rights-basis hierarchy:

1. use provider terms, press-kit permission, licence, or direct permission when
   conveniently available;
2. use the approved editorial-fair-use policy for appropriate official
   promotional material;
3. use the deliberate artless fallback when a use is weak, ambiguous,
   objectionable, or unresolved.

Fair use is not a blanket exemption. Large decorative imagery without direct
editorial context, standalone galleries/original downloads, fan art without
permission, paid advertisements, and Compare artwork remain outside the
approved posture.

Before the first production asset is cleared on this basis:

- obtain a proportionate one-time review of the written policy by an Israeli IP
  lawyer;
- amend ADR 0011 and the rights-basis enum through a forward migration;
- update application/schema/import/admin/test boundaries;
- document source, placement, attribution, resolution, storage, and takedown;
- verify containment and artless fallback.

No automated process may production-clear artwork. Tomas approves the basis and
final visual selection.

This is a product/operating decision, not legal advice or per-asset clearance.

---

## 14. Remaining open implementation and due-diligence items

These are real open items; they do not reopen the product model:

- exact final public copy, responsive composition, and interaction design;
- Fable reconciliation against this record;
- exact route name for durable discovery results;
- calibrated definitions/anchors for the eleven experience axes;
- session-suitability public labels and controlled phrase matrix wording;
- exact primary metadata provider approval and refresh intervals;
- approved runtime provider;
- analytics provider and focused privacy/compliance review;
- exact official storefront/affiliate providers and availability-refresh policy;
- correction mailbox operational verification;
- one-time artwork-policy legal review;
- initial 12–15 and approximately-100 title lineups;
- scoring-protocol calibration outcome;
- recovered personalization questionnaire;
- whether/when a real personal-matching tester invitation is scheduled.

---

## 15. Consolidated status register

| Area | Decision | Status |
|---|---|---|
| Public journeys | Search / Compare / What should I play? | LOCKED |
| Homepage hierarchy | Search dominant; Compare secondary; discovery progressive | LOCKED |
| Search registry | Published, recognized-unprofiled, ambiguous, unrecognized states | LOCKED |
| Unprofiled routing | Inline unavailable result; no public stub route | LOCKED |
| Coverage request | Accountless one-action private demand signal | LOCKED |
| Discovery runtime | Deterministic controlled-data interpretation | LOCKED |
| Runtime model API | Later optional interpreter over the same concepts | DEFERRED |
| Discovery intent | Must include / Prefer / Prefer not / Must exclude | LOCKED |
| Constraint eligibility | Three governed tiers | LOCKED |
| Unknown hard constraints | Separate indeterminate result group | LOCKED |
| Match percentage | None | LOCKED |
| Game type | Faceted hybrid model | LOCKED |
| Experience taxonomy | Eleven balanced axes; anchors to calibrate | LOCKED |
| Dimension thresholds | Strong ≥1.5; Exceptional 2.0; Medium confidence for hard pass | LOCKED |
| Metadata ownership | Provider-first, layered, provider-independent | LOCKED |
| Provider precedence | One primary; official override; secondary only for gaps/conflicts | LOCKED |
| IGDB | Preferred candidate pending terms/test | PROVISIONAL |
| Total commitment | Engaged-play headline plus sourced estimates | LOCKED |
| Commitment bands | Brief/Moderate/Substantial/Long/Extensive plus special states | LOCKED |
| Session suitability | Useful window plus interruption flexibility | LOCKED |
| Concrete session budget | Hard by default and visibly editable | LOCKED |
| Analytics | Four-layer purpose/privacy-governed launch contract | LOCKED |
| Analytics provider | Not selected | OPEN |
| Commerce | Official action layer required; richer commerce incremental | LOCKED |
| Quiet public release | Governing launch posture | LOCKED |
| Formal research program | Not a launch requirement | LOCKED |
| Catalog expansion | Permanent demand-weighted breadth model | LOCKED |
| Profile production | Human-governed, evidence-assisted | LOCKED |
| Personalization | First major post-launch phase; no launch promise | DEFERRED |
| Editorial fair use | Approved basis after implementation/legal gate | LOCKED |

