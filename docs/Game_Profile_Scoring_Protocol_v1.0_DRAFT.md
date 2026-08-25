# Game Profile Scoring Protocol v1.0

- **Product:** Should I Play?
- **Methodology:** Game Profile
- **Status:** Owner-approved candidate — authorized for Appendix B calibration; not governing pending its gates and final approval
- **Date:** 2026-08-25
- **Owner/final editorial authority:** Tomas
- **Primary scoring editor:** Approved GPT scoring agent (initially GPT Chat)

---

## 0. Purpose and authority

This protocol defines how evidence becomes a scored Game Profile. It fills the
operational gap between:

- **Game Profile Scoring Rubric v1.0**, which owns dimension and subcriterion
  meaning;
- **Editorial Evidence & Data Sourcing SOP v0.2**, which owns evidence practice;
- the calibration reports, which provide approved reference profiles; and
- the product/database contracts, which own scope, history, validation and
  publication integrity.

This protocol does not alter the eight dimensions, create an aggregate score,
or turn sources into votes. Authority is subject-specific:

- Rubric v1.0 owns the scale, dimensions and subcriteria.
- This protocol, once finally approved after Appendix B, owns the operational
  path from evidence to a rubric value.
- The product/data contracts own persistence, derivation, history, validation
  and publication integrity.
- The Evidence SOP continues to govern evidence practice except where a later
  owner decision is explicitly recorded here.

Where this candidate supersedes governing text, it says so here, and
[ADR 0024](decisions/0024-scoring-protocol-v1-and-package-contract.md) registers
every entry so none happens silently:

- **SOP v0.2 §3 (source targets), restated by §4.1.** The SOP's five to eight
  is *substantive critic reviews within a larger pack* — deep dives, technical
  sources, player signal, direct play — which ADR 0006 §3 reads as eight to
  fifteen individual records in total. §4.1 restates that demand in this
  protocol's stricter unit, independent A/B evidentiary clusters, with C
  material no longer counting toward the floor: eight to ten clusters is the
  normal AA/AAA target and five is a genuine-scarcity floor. That is a
  comparable overall demand under a stricter counting rule, not the raising of
  a weaker one.
- **SOP v0.2 §5 (confidence conditions), superseded by §10.1.** Confidence
  derives from three recorded facts; "recent release" is no longer an
  automatic Medium condition.
- **ADR 0006 §1 (stored per-dimension confidence), superseded by §10.2–10.3.**
  The stored editorial input becomes the facts; the label becomes arithmetic
  over them.

Each superseded document should be amended when this protocol is finally
approved for governing use; this candidate does not pretend the older wording
never existed.

**Owner approval to calibrate — 2026-08-25.** Tomas approved this candidate and
ADR 0024 as the basis for Appendix B. This is not the final governing approval
in Appendix B step 10. The remaining calibration, Rubric v1.1, persistence and
production-record decisions are tracked in Master Plan v0.8 §3.8.

The protocol is intended for:

- manual GPT Chat-led launch-catalog production;
- later skill/API-assisted scoring;
- editorial audit and correction;
- blind rescoring and calibration;
- generation of validated draft-import packages.

No AI output may publish automatically. Tomas remains responsible for the final
editorial judgment.

### Operating sequence at a glance

1. Freeze edition, mode, platform/build and evidence cutoff.
2. Build and log the candidate source pool; screen claims rather than outlets.
3. Mask review grades and freeze/hash the closed evidence corpus.
4. Run a primary closed-corpus claim extraction, mapping and 40-value scoring
   pass.
5. Run one clean-context pass that independently rebuilds the claims, mappings
   and 40 decisions from the same raw corpus.
6. Measure the pre-adjudication differences; do not improve the metric with
   editorial reconciliation.
7. Adjudicate recorded differences to one exact half-step or Unknown.
8. Derive dimension results and confidence mechanically.
9. Only then write the fit interpretation, Primary Pull and Primary Risk.
10. Validate a versioned draft package, obtain Tomas's approval and import only
    into the existing draft/review/publication path.

### What calibration decides—and what it does not

There is no replacement rubric competing with Rubric v1.0. Appendix A and the
rest of this protocol operationalize that existing rubric; they do not create a
second set of dimensions or scores. Calibration asks whether independent GPT
Chat passes can apply Rubric v1.0 through this evidence/anchor procedure with
acceptable reliability.

- Tomas approves the calibration corpus and remains final editorial authority.
- GPT Chat performs the separate research, primary and blind-audit runs.
- Repeated ambiguity first changes protocol wording, examples or anchors.
- A genuine defect in a rubric dimension/subcriterion is escalated to Tomas as
  a separate Rubric v1.1 decision. Rubric v1.0 continues to govern unless that
  explicit versioned decision is approved.

Calibration never silently chooses the protocol over the rubric, and it never
retrofits scores merely to preserve an expected result.

---

## 1. Reproducibility contract

Game Profile uses editorial judgment. It does not claim that qualitative
evidence mechanically calculates a score. It defines four narrower and
testable forms of reproducibility. The first three are publication guarantees;
the fourth is a measured reliability gate that this candidate must pass before
it becomes governing.

### 1.1 Computational reproducibility

Given the same stored subcriterion values, all dimension values, ranges and
Unknown states are derived deterministically by the canonical scoring code.

### 1.2 Evidentiary reproducibility

Every scored judgment identifies the exact evidence packet, claims, scope,
platform/build context and cutoff that supported it.

### 1.3 Procedural reproducibility

Every evaluation follows the stages and decision rules in this protocol. A
reader can reconstruct how the approved value was selected without access to
private model chain-of-thought.

### 1.4 Independent editorial reliability

Two independent passes using the same frozen source corpus should normally
select the same anchor or an adjacent half-step. "Independent" means
independently sampled from the same approved model snapshot under the §2.3
configuration rules: identical inputs and decoding configuration, different
sampling seeds, no shared context. What §11 measures is therefore same-snapshot
repeatability under independent sampling — not cross-model robustness, which is
reported separately, and not human inter-rater reliability. Pre-adjudication
agreement is measured against §11. Owner adjudication creates an accountable
final decision; it never counts as independent agreement or improves the
reliability metric.

### 1.5 Publication standard

A final result is publishable and auditable only if:

1. its evaluation scope is frozen;
2. its source corpus, both independent claim ledgers and adjudicated evidence
   record are complete;
3. all 40 subcriteria have one exact half-step value or Unknown;
4. every numeric subcriterion has an anchor-based rationale and evidence links;
   every Unknown has an evidence-linked insufficiency rationale;
5. material disagreement is recorded;
6. confidence follows this protocol;
7. derivation checks pass;
8. blind audit is complete;
9. Tomas has approved the adjudicated record;
10. the approved snapshot is immutable after publication.

---

## 2. Roles and separation of responsibility

### 2.1 Research collection pass

The research pass constructs and freezes the corpus without selecting any
anchor or writing an interpretation. It records the candidate-source log,
coverage frame and normalized packet. That context ends before scoring begins.
The research collector may be GPT Chat, but may not continue into either
measured scoring pass in the same context.

### 2.2 GPT Chat — primary scoring editor

A clean-context GPT Chat pass:

- extracts atomic claims;
- maps claims to subcriteria;
- proposes exact scores or Unknown;
- records contradictions and limitations;
- assigns proposed confidence;
- writes concise public rationales and interpretation;
- produces the structured draft package.

The interpretation is withheld until scoring/adjudication under §12; it is not
shown to the auditor.

### 2.3 Blind audit pass

The clean-context primary and audit passes receive byte-identical scoring
inputs: frozen scope, coverage frame, normalized captured corpus in canonical
order, rubric, protocol, scoring prompt and output schema. Neither receives the
candidate-source/rejection log, research commentary, prior profile decisions or
the other's claim ledger, mappings, dispositions, values, confidence or
interpretation. The candidate log remains in the audit archive but outside both
scoring views.

The audit pass independently extracts claims, maps them, records
inclusion/rejection and scores the complete active decision set: all 40 for an
initial/full evaluation or the graph-derived set for a bounded reassessment.

The auditor may be a second GPT Chat run using the same approved model snapshot
and protocol version. It must not be primed with the first result. A later
cross-model robustness test is reported separately from same-snapshot
repeatability.

For a paired audit or calibration result to count, provider/model and exact
execution snapshot/build identifiers must match. `snapshot_unavailable` runs
may produce working drafts, but cannot satisfy the same-snapshot reliability
gate or complete publication under this protocol.

Matching snapshots is necessary but not sufficient: a configuration that makes
the two passes reproduce each other by construction measures nothing. The
decoding configuration for both scoring passes is pre-registered at the
protocol freeze (Appendix B step 6) and must be identical between the passes
except for the sampling seed. Where the provider exposes a seed, the two passes
record different seeds; a paired result whose seeds match — or whose decoding
is configured so that identical output is guaranteed rather than observed —
cannot satisfy §11.4. Where the provider exposes neither seed nor decoding
parameters, both manifests record `parameter_unavailable`; the pair may still
count only because provider-default sampling is stochastic, and the calibration
report states that limitation rather than hiding it.

### 2.4 Tomas — accountable editor

Tomas:

- approves the evaluation scope and game selection;
- reviews all flagged scoring differences;
- approves or edits the final profile within the rubric, evidence and protocol;
- records a concise reason for any owner override;
- authorizes publication. An owner override must select an evidence-supported
  anchor or Unknown and state why; an exception outside this protocol remains a
  draft until the protocol/rubric is explicitly amended.

### 2.5 Codex/Claude — engineering and import

Codex, Claude or other engineering agents may:

- validate/import the approved structured package;
- implement deterministic derivation and validation;
- report structural inconsistencies.

They do not independently reinterpret or rescore editorial content unless
explicitly assigned an audit role under the same protocol. After Tomas approves,
the authenticated editor—currently Tomas—executes publication through the
existing validated admin action.

---

## 3. Evaluation scope must be frozen first

No research or scoring begins until the evaluation declares:

- canonical game and edition;
- campaign/mode/profile scope;
- included and materially relevant platforms;
- patch, build or current-state cutoff;
- `release_state = announced | showcased | pre_release_playable | released`;
- `pre_release_playable_basis = hands_on | review_code` when
  `release_state = pre_release_playable`, null otherwise — the distinction the
  data contract's `evidence_maturity` and SOP §10.3's minimum-evidence rules
  turn on;
- `evidence_status = verified | provisional | pre_release`, derived by the
  §15.2 rule and stored;
- `evaluation_maturity = pre_release | newly_released | mature`;
- profile-level `stability_state = stable | bounded_change |
  actively_changing | unknown`;
- actual public release date where applicable;
- evidence cutoff date;
- direct-play status and exact scope if any;
- known exclusions.

If two modes or editions materially change the experience, create separate
profile scopes. If only technical performance varies by platform, retain one
base evaluation with platform-specific Technical Stability overrides and a
warning where required.

The scorer may not silently change scope to resolve contradictory evidence.

Compatibility is fixed:

| Release state | Allowed maturity | Public release date |
|---|---|---|
| `announced` | `pre_release` | must be null |
| `showcased` | `pre_release` | must be null |
| `pre_release_playable` | `pre_release` | must be null for the evaluated release |
| `released` | `newly_released` or `mature` | required |

`newly_released` lasts through the twelve-month maturity check; older catalog
games evaluated for the first time are `mature`. Stability is orthogonal and
may change without changing release state or maturity.

---

## 4. Evidence-pack standard

### 4.1 Released games

- **Scarcity floor:** five substantive independent sources where credible
  coverage is genuinely limited.
- **Normal AA/AAA target:** eight to ten substantive independent sources.
- Use more only when platform variance, technical instability, disagreement,
  live-service change or unusual complexity warrants it.

This restates SOP v0.2 §3's pack target in independence-cluster units; §0 and
ADR 0024 record the supersession.

The package records `collection_standard`: `scarcity_floor` means five to seven
independent active A/B clusters plus a concrete scarcity reason;
`normal_target` means eight to ten; `expanded_for_complexity` means eleven or
more plus the relevant complexity reason. These bands make the later validator
unambiguous; they do not turn source count into score weight.

The pack should contain, where relevant:

- full-game critical reviews;
- specialist/creator deep dives;
- technical analysis;
- current-state/patch reporting;
- player-signal synthesis;
- first-party facts;
- honestly disclosed direct play.

Source count is a collection sufficiency check, never a vote, divisor, score
input or substitute for claim-level coverage.

### 4.2 Source independence

Two items are not independent when one merely rewrites, syndicates, quotes or
summarizes the other. Repeated claims traceable to the same underlying report,
press release or viral post count as one evidentiary origin.

The source corpus records an `independence_cluster_id`. Two sources in the same
cluster may add context but do not count twice toward the collection floor.

### 4.3 Source admissibility

A source or individual claim is admissible only to the extent that it is:

- relevant to the evaluated scope/build/platform;
- sufficiently specific to map to a rubric subcriterion;
- based on demonstrated or credibly disclosed access;
- original rather than derivative;
- distinguishable from marketing or speculation;
- current enough for the claim being made;
- transparent about sponsorship/access where material.

Outlet size, prestige and review score confer no automatic authority.

### 4.4 Evidence tiers — admissibility, not weight

The current data model requires tiers A–D. Protocol v1.0 defines them for the
source's declared use in this evaluation; they are not outlet rankings and have
no numerical multiplier.

- **A — direct/high-fidelity:** first-hand evidence with explicit relevant
  scope and concrete observations or measurements; examples include disclosed
  direct play and primary technical measurement.
- **B — substantive independent:** original full-game review or specialist
  analysis with adequate scope and concrete support.
- **C — limited/contextual:** useful but incomplete evidence, first-party facts,
  patch documentation, or a player-signal synthesis that cannot independently
  establish a scored judgment.
- **D — watchlist/non-scoring:** speculation, weakly scoped assertion or other
  material retained only as context. Tier D claims cannot support a number.

Tier is assigned locally for this evaluation packet. A source may require a
different tier in a later evaluation if its relevance or scope differs. Claim-
level admissibility still governs; an A/B label never defeats stronger
counterevidence or mechanically unlocks a score.

Only independently clustered A/B sources count toward the §4.1 collection
floor/target. C material may be required for factual completeness but does not
fill a substantive-source slot; D never does. Meeting that count does not imply
that all 40 subcriteria are covered.

### 4.5 Source classes

**Critical review** — broad full-game assessment; useful for narrative,
structure, pacing, execution and overall experience.

**Specialist/creator analysis** — first-class evidence where scope, expertise
and examples are strong; often especially useful for systems, genre context,
endgame, narrative analysis or long-term play.

**Technical analysis** — primary evidence for performance, stability, image
quality, platform variance and patch effects.

**Documented gameplay** — an external recording/transcript inspected but not
controlled by the scorer; useful for observable interface, encounter, traversal
and structural claims, but unable to establish unseen late-game qualities.

**Direct play** — a named evaluator actually controlled the declared build. It
records evaluator, platform, build, dates, hours and covered segments. Watching
footage is never relabelled direct play.

**Player signal** — useful for recurring friction, current technical state,
late-game repetition and live-service health. Counts, percentages and popular
sentiment never map directly to scores.

**First-party material** — useful for factual metadata, patch contents and
stated intent. It is not independent evidence that the result is good, deep,
polished or well paced.

AI language processing is used to extract and normalize concrete claims, not
to calculate a sentiment score. For player signal, define a bounded sample,
deduplicate copied/brigaded material where possible, code only experience claims
with enough context, and report recurrence inside that sample. A phrase count,
positive/negative ratio or store-review percentage cannot become a rubric
value. It may establish a concrete issue worth deeper investigation; the
ordinary claim/anchor/counterevidence rules still decide the score.

### 4.6 Explicit exclusions

Do not use as numerical inputs:

- another publication's review score;
- Metacritic/OpenCritic/user averages;
- popularity or sales;
- marketing superlatives;
- isolated social-media claims;
- review-bombing totals;
- political/culture-war approval or disapproval detached from game execution;
- a source's agreement with the score expected in advance.

The scoring view masks external numeric/star/letter grades, aggregate badges
and ranking labels before either pass. The unmodified source remains identified
and hashed/archived where lawful for provenance, and the normalized scoring
packet receives its own digest. Substantive verdict prose is not masked, but a
claim may use only its concrete observation—not the source's grade or prestige.

No outlet blacklist or fixed source weight applies in Protocol v1.0. Curated
source sets or weighting may be reconsidered only after scoring audits show a
systematic, repeated failure that claim-level assessment does not solve. Such a
change requires a new protocol version and may not rewrite prior snapshots.

### 4.7 Corpus construction and freeze

Before scoring, the research pass records a candidate-source log—not only the
sources ultimately used. For each declared scope it records:

1. predefined query families for title/edition, full-game assessment,
   platform/technical state, late-game/endgame, specialist analysis, major
   patches and material known disagreement;
2. query text, service, date, result position where exposed and sources opened;
3. every candidate accepted, limited or rejected, with the §4.3 reason;
4. a coverage grid showing which subcriteria and platforms/builds the packet
   can actually observe;
5. an explicit scarcity reason when the packet stops below the normal target.

Collection stops only after the source-count standard is met, every relevant
query family has been run, known material counterevidence is represented, and
two final distinct query families add no new material claim category. This is a
research-saturation rule, not a consensus rule.

The raw/captured packet, candidate log and canonical source order are then
hashed and frozen before either scoring pass. A material omitted source found
later invalidates both pending passes: add it, freeze a new packet and rerun
both. A source may never be added after seeing a score merely to move that
score. Dynamic search results mean open-web discovery cannot be replayed
perfectly; the frozen packet and collection log make the actual research event
reconstructible and auditable.

---

## 5. Source manifest and claim ledger

### 5.1 Source manifest record

Each source record contains:

- stable source ID;
- title, author/creator and publisher/channel;
- URL or durable identifier;
- publication and access dates;
- exact page/section/timestamp locator for each used claim where available;
- captured-content hash or durable archive identifier where legally permitted;
- source class;
- evaluation-local evidence tier;
- independence cluster ID;
- evaluated platform/build and play scope where disclosed;
- completion/late-game scope where disclosed or inferable;
- sponsorship/access disclosure where relevant;
- independence/dependency note;
- admissibility limitations.

Player-signal sources additionally record platform, language, date window,
query/sampling method, deduplication method and coding limitations.

### 5.2 Atomic claim record

Each material observation becomes a concise claim record containing:

- stable claim ID and source ID;
- concise paraphrase of the observation;
- `claim_type = fact | direct_observation | interpretation | player_signal`;
- `claim_direction = supports_higher | supports_lower | mixed_or_context` for
  the mapped criterion;
- mapped dimension/subcriterion;
- scope/platform/build/time relevance;
- exact locator within the source where available;
- observed-unit IDs from the frozen criterion coverage frame (scenes,
  encounters, systems, sections, sessions, modes, builds or platforms);
- `observation_basis` from Appendix C and any separate scorer inference;
- recurrence: isolated, recurring or widespread — null for a `fact` claim,
  which states something rather than observes a spread;
- consequence: cosmetic, minor friction, material or blocking/defining — null
  for a `fact` claim, whose weight comes from the criteria it informs;
- anchor-condition IDs the claim may satisfy;
- corroborating and contradicting claim IDs;
- limitation/spoiler note;
- scorer disposition: accepted, limited, rejected or unresolved;
- disposition reason.

Do not store long copyrighted excerpts when a faithful paraphrase and citation
are sufficient.

One claim record maps to one subcriterion consequence. When the same source
observation legitimately affects several criteria, create linked
criterion-specific claim records and state the different consequence under
§6.2; do not attach one generic positive/negative claim to several scores.

Primary and audit passes create separate claim ledgers. The adjudicated ledger
preserves claim-inclusion, mapping and disposition differences; it is not a
destructive merge that hides them.

### 5.3 Claim quality is local

Quality is assessed claim by claim. A generally useful source may contain an
unsupported assertion; a generally weak source may still document a narrow,
verifiable fact. Whole-outlet reputation never substitutes for the local test.

---

## 6. Scoring procedure

Perform the following for each subcriterion in the active decision set. That set
is all 40 for initial/full work and the §14 graph-derived set for a bounded
reassessment.

### 6.1 Operational terms

- **Isolated:** observed in exactly one relevant coverage unit, with no
  persistent cross-unit consequence.
- **Recurring:** observed in at least two relevant coverage units but no more
  than half of them, or repeatedly within a noncentral loop.
- **Widespread:** observed in more than half of relevant coverage units, or
  under normal operation of a central core loop/system in at least two
  observations.

The three bands partition every observation count. On a frame of four or more
units every band is reachable: one unit is isolated, two up to half is
recurring, more than half is widespread — on the minimum four-unit frame, two
of four is recurring and three is widespread. The core-loop clause takes
precedence: a pattern under normal operation of a central core loop/system with
at least two observations is widespread regardless of its unit fraction, and
the noncentral-loop clause classifies as recurring only where neither
widespread clause applies. Where a criterion's *relevant* subset of the frame
is only two or three units, the recurring band is definitionally empty — one
unit is isolated and a majority is widespread — and the decision record says so
rather than forcing a band.
- **Cosmetic consequence:** perceptible but changes no required action, time,
  understanding, access or sustained response.
- **Minor-friction consequence:** creates local extra action/time/confusion or a
  bounded response without changing the sustained experience.
- **Material:** capable of changing the player's understanding, action,
  sustained experience or purchase decision; never defined by source count.
- **Blocking/defining consequence:** in the lower direction, prevents mandatory
  progress/basic function; in the higher direction, supplies a central function
  repeatedly without which the criterion's contribution would materially
  collapse.
- **Dominant pattern:** the pattern that best characterizes representative
  game units after severity and consequence are considered, not the opinion
  held by the largest number of sources.
- **Defining:** central to what the evaluated experience repeatedly offers; it
  does not mean famous, popular or culturally recognized.

Every numeric decision record identifies the observed units, recurrence,
consequence, the selected anchor, why the next lower anchor is insufficient and
why the next higher anchor is not met.

#### Representative-unit and pattern rule

Before claim extraction, declare a criterion coverage frame. For a campaign it
contains opening, early, middle and late/end strata; for run/sandbox/simulation
forms it substitutes representative progression states and core-loop/system
states. Add every included mode/platform/build and any optional/endgame stratum
that materially affects the declared scope. A criterion coverage frame
contains at least four coverage units: the default campaign strata supply four,
run/sandbox/simulation frames must reach at least four through representative
progression and core-loop/system states, and included modes, platforms, builds
and optional/endgame strata add units rather than replacing them. A frame that
cannot honestly reach four units means the scope was drawn too narrowly to
score; fix the scope, not the arithmetic. The frame is frozen with the
corpus; scorers may not choose representative units after seeing a candidate
anchor.

- `full` coverage observes every required temporal/progression stratum, every
  central core loop and every materially distinct included mode/platform.
- `bounded` coverage is missing exactly one noncentral stratum and has no known
  material mode/platform/build gap.
- `materially_limited` coverage is missing a central or late/end stratum, more
  than one noncentral stratum, or any materially variable included
  mode/platform/build.

To choose between opposing observed patterns:

1. separate scope/build/mode differences first under §8;
2. a blocking failure on the mandatory path controls even if encountered once;
3. otherwise compare recurrence (`widespread > recurring > isolated`), then
   consequence (`blocking/defining > material > minor > cosmetic`);
4. an isolated material counterpattern cannot define the value but prevents a
   `2` unless the endpoint review shows it is outside the criterion's relevant
   scope;
5. if opposing patterns remain tied on recurrence and consequence, select the
   lower of adjacent candidate anchors and record `adjacent_resolved`; if their
   candidate anchors differ by 1.0 or more, use Unknown.

Source quantity never breaks a pattern tie.

Rule 5 and §8.3 answer different questions, and the claim ledger decides which
applies. Rule 5 governs when the accepted claim set is internally coherent — no
material accepted-versus-accepted contradiction survives §8 — and the residual
doubt is which of two adjacent anchor descriptions better fits one agreed
pattern: select the lower and record `adjacent_resolved`. §8.3 governs when
credible claims still contradict each other about what the experience *is*
after §8.1 separation and the §8.2 evidentiary-fit test: if no defensible
advantage exists, the value is Unknown with `material_conflict`, never a
number. When it is unclear whether a tie is descriptive or evidentiary, it is
evidentiary and §8.3 governs.

#### Required-facet rule

Most criteria express one functional question even when their display name
uses a slash. Six criteria have required facets that can routinely diverge:

| Subcriterion key | Required facets |
|---|---|
| `narrative_momentum` | `development_momentum`; `payoff` |
| `failure_fairness` | `causality_feedback`; `proportionality_recovery` |
| `capability_balance` | `capability_counterplay`; `pressure_fit` |
| `session_rhythm` | `progress_unit_legibility`; `closure_resumption_loss` |
| `theme_character_integration` | `agent_situation_embodiment`; `thematic_testing_consequence` |
| `mechanics_meaning` | `rule_behavior`; `meaning_consequence` |

Store both required facet records even when one is Unknown. Each facet receives
an exact half-step or Unknown under the ordinary coverage rule. The parent
criterion is numeric only when both facets are numeric, and its value is their
lower value. If either facet is Unknown, the parent is Unknown and carries the
union of the facet missing-coverage classes. Do not average or let one
exceptional facet erase a weak/unknown required facet. Other criteria carry an
empty `facet_records` array; their slash/ampersand wording is an alternative or
explanatory label, not an instruction to invent facets.

Deriving the parent from the lower facet changes how these six criteria are
calculated, and Rubric §18 classes a calculation change as breaking. The rule
is therefore submitted as a proposed Rubric v1.1 amendment alongside this
candidate, recorded in ADR 0024, and this protocol cannot become governing
while it rests on an unapproved rubric change: either the amendment is approved
with the protocol, or the rule reverts to ordinary whole-criterion anchor
selection with facet records retained as evidence structure. The six criteria
span five of the eight dimensions, so Appendix B's development games must check
the rule's aggregate effect against the approved calibration corpus for
systematic deflation before the holdout is run.

### 6.2 Evidence-ownership boundaries

The same observation may be relevant to several criteria, but each criterion
owns a different consequence. The rationale must state that consequence rather
than duplicating one generic complaint or compliment.

- **Story Hook** owns the narrative reason to continue; **Opening
  Effectiveness** owns establishment of the full play contract.
- **Narrative Momentum** owns story-state development and payoff; **Momentum
  Maintenance** owns cadence of meaningful experiential change across the game.
- **Repetition Control** owns how reused units evolve; **Content Focus** owns
  alignment/prioritization to the core promise; **Content Density** owns the
  share of representative time that makes a meaningful contribution; **Runtime
  Justification** owns whether the declared arc/window continues after its
  central value or variation is exhausted.
- **Gameplay Execution** owns input-to-state fidelity, camera/collision behavior
  and actionable feedback; **UX Friction** owns avoidable interface/action
  overhead; **Navigation Legibility** owns cue-to-route/objective learning;
  **Failure/Resistance Fairness** owns causality, learnability and recovery when
  action meets resistance.
- **Moment-to-Moment Agency** owns immediate local causal influence; **Toolset
  Depth** owns differentiated viable approaches; **Capability Balance** owns
  the fit between counterplay and pressure; **Meaningful Agency** owns retained
  consequence, expression, responsibility or complicity.
- **Reward Rhythm** owns timing/proportionality of feedback and consequence;
  **Session/Progress Rhythm** owns progress-unit clarity, closure, resumption
  and loss horizon.
- **Mood Strength** owns tonal control; **Emotional Power** owns immediate
  affect; **Memory Residue** owns delayed sensory/spatial recall; **Lasting
  Impact** owns delayed emotional/thematic reflection.
- **World/Lore Integration** owns whether world information changes
  understanding or action; **World Coherence** owns internal systemic/spatial/
  social continuity; **Mechanics–Meaning Integration** owns rules embodying
  theme, role, narrative or world meaning.
- **Mechanics–Meaning** owns the rule-to-meaning mapping; **Player
  Recontextualization** owns backward reinterpretation; **Interactive
  Revelation** owns forward learning through participation; **Medium
  Irreplaceability** owns what central function a passive substitute loses.

**Consistency** is limited to the spread of execution defects across the
runtime/modes. It does not rescore story quality, pacing, content or every other
dimension.

### Step 1 — Assemble eligible claims

Load all accepted and unresolved claims mapped to the subcriterion, including
material counterevidence. Scoring is closed-corpus: do not assert facts from
model memory, unstored browsing or presumed consensus. Prior knowledge may only
raise a missing-evidence flag, which sends the packet back through §4.7 before
either pass continues. Do not see or use external review scores.

### Step 2 — Check coverage

Ask whether evidence observes the relevant portion of the game, current build
and relevant platforms. Late-game criteria require late-game/full-game evidence.
If the offering cannot be adequately observed, use Unknown.

**Time-dependent criteria:** Memory Residue and Lasting Impact describe delayed
effects. An AI may never supply its own supposed memory, emotion or personal
play history. A numeric value for either criterion requires an admissible,
dated retrospective observation whose evidenced elapsed-time lower bound is 30
or more days after the source's relevant play/completion; ordinary launch-review
predictions do not qualify. Values `0` and `0.5` require two independent eligible
retrospective claims because failure to demonstrate residue is not evidence of
its absence. Values `1.5` and `2` also require two independent eligible claims,
and `2` requires at least one with an elapsed lower bound of 180 days. A value
of `1` requires at least one eligible retrospective claim plus the ordinary
criterion coverage.

For each such claim the manifest stores `retrospective_observation_date`,
`play_completion_date` when disclosed, or an evidenced
`latest_possible_play_date` when only a conservative lower bound is known;
`elapsed_days_lower_bound` is derived rather than guessed. A source with no
date basis may add context but cannot unlock a numeric value.

Exactly one date basis is stored. Use disclosed `play_completion_date` when it
exists and set `latest_possible_play_date` null; otherwise use the conservative
latest-possible date and set completion null. A record containing both or
neither is invalid.

For an evaluated release less than 30 days old, both criteria are normally
Unknown and are placed on the three-month review. Pre-release material is
Unknown unless the exact evaluated content has already been publicly playable
in materially the same form for at least 90 days; any such exception is
disclosed and confidence may not exceed Medium. Fame, sales, awards, sequels,
online repetition and the scorer's prior knowledge cannot substitute for dated
retrospective evidence.

### Step 3 — State the observed pattern

Write a neutral observation record before selecting a number. It identifies the
representative in-game units observed, recurrence/spread, severity or strength,
functional consequence, dominant pattern and material limitation.

### Step 4 — Apply the behaviorally anchored scale

Select the anchor in Appendix A whose observable description best matches the
pattern. Scores describe the strength/extent of that offering, not whether every
player should want it.

### Step 5 — Perform the intent/genre check

Intent changes the form-appropriate test, not whether the offering exists. An
unattempted or deliberately minimal offering may correctly score low as
descriptive information. Unknown means insufficient observation, never
non-attempt. Intent supplies no missing points.

Genre, budget, length, linearity/openness, maplessness, difficulty and
helplessness are not defects by themselves. Judge how the chosen form performs
the named subcriterion. An intentionally low-agency game may receive a low
Agency score while succeeding elsewhere. There is no N/A state and no
renormalization.

This is the operational interpretation of Rubric v1.0's phrase “absent where
expected”: because every Game Profile exposes the same 40 descriptive
subcriteria, an intentional non-offering is still shown as low and recorded as
`zero_reason = absent_offering`; it is not relabelled competent merely because
the omission was intentional. “Do not penalize genre” means do not call that
absence failed execution, leak it into unrelated criteria or infer an overall
bad game. The governing rubric should receive this clarification when the
protocol is approved; if its owner judges the clarification semantic rather
than editorial, it requires a rubric minor version rather than a silent change.

Absence must be positively observed across adequate scope. “The packet says
nothing about this” is Unknown, never evidence of absence and never a zero.

### Step 6 — Perform the counterevidence check

Actively test the proposed anchor against the strongest credible contradictory
claim. If that claim concerns a different patch/platform/scope, separate it. If
it remains materially unresolved and the scorer cannot support one anchor over
the other, use Unknown and lower confidence. A platform-specific difference
uses an exact/Unknown override where the current data contract allows it.

### Step 7 — Record the decision

Store:

- exact half-step value or Unknown;
- anchor selected;
- required facet records where applicable;
- structured internal rationale covering observation, anchor boundaries and
  counterevidence;
- concise public rationale;
- linked claim/source IDs;
- counterevidence disposition;
- proposed subcriterion confidence;
- for Unknown, one or more controlled missing-coverage classes and references
  to the claims, candidate-source records or coverage frame that prove the
  insufficiency;
- any platform override.

### Step 8 — No default score

`1` is not a neutral placeholder. Missing evidence becomes Unknown; genuine
mixed/ordinary performance becomes `1`.

---

## 7. Exact, Unknown and derived-dimension-range rules

### 7.1 Exact value

Use an exact value when evidence supports one anchor more strongly than adjacent
anchors and no unresolved disagreement would reasonably move it by 0.5 or more.

### 7.2 Unknown

Use Unknown when the relevant experience is not adequately observed, scope is
not resolvable, or credible evidence remains too weak/conflicted to select one
half-step anchor. Do not convert Unknown to zero or one. Unknown requires an
evidence-linked insufficiency rationale, not a numeric anchor.

### 7.3 Canonical dimension derivation

Subcriteria do not store ranges under Rubric v1.0. The canonical scoring code
derives one dimension result from the five exact/Unknown values:

- **0 Unknown:** exact total = sum of all five values.
- **1 Unknown:** range = `[sum of four known values, sum + 2]`.
- **2 or more Unknown:** `Not scored`/insufficient; no total or range is
  published.

All exact values and range endpoints are on the 0.5 grid. Unknown never becomes
zero in arithmetic or geometry. This algorithm is normative and must match
TypeScript, SQL/read-path and tests byte-for-byte. It never derives an aggregate
across the eight dimensions.

### 7.4 Platform overrides

Any subcriterion may carry an override when a covered platform materially
changes that specific experience; Technical Stability is the usual case. An
override is one exact half-step or Unknown, must differ from the base, must name
an included platform, and requires a rationale and confidence. Overrides never
change the base dimension total. Platform disagreement that cannot be expressed
truthfully as an override must be resolved by narrowing/splitting scope, not by
widening the canonical score.

---

## 8. Disagreement and contradiction protocol

### 8.1 Classify the apparent disagreement

Before adjudicating, test whether disagreement is actually caused by:

- different platforms or performance modes;
- different patches/current-state cutoffs;
- incomplete versus full-game coverage;
- solo versus cooperative play;
- different modes/editions;
- response heterogeneity linked to player preference rather than conflicting
  observations;
- source dependency or repetition.

Preference-linked heterogeneity remains evidence about fit and may affect
confidence or interpretation. It is not discarded merely because reactions
differ.

### 8.2 Resolve by evidentiary fit, not outlet rank

Prefer the claim that is more specific, better scoped, more current, based on
deeper relevant access, independently corroborated and directly tied to the
  subcriterion. Do not prefer it because the outlet is larger or because it agrees
  with Tomas or the primary scorer.

### 8.3 Unresolved disagreement

If credible disagreement remains capable of moving a subcriterion by 0.5 or
more:

- record both positions;
- select one anchor only when the evidentiary-fit rule establishes a defensible
  advantage;
- otherwise use Unknown;
- lower dimension confidence;
- mention the disagreement publicly when it materially affects a purchase
  decision.

An anchor tie that survives with an internally consistent accepted claim set is
not this section's case; §6.1 rule 5 resolves it to the lower adjacent anchor.

### 8.4 Source consensus is not arithmetic

Eight shallow claims do not mechanically defeat two deep claims. The record
must explain why one interpretation better fits the evaluated scope.

---

## 9. Endpoint-value gate

Only the true endpoints `0` and `2` receive an additional gate. Corroboration
raises confidence but no universal source quorum mechanically unlocks a value.
Before approval an endpoint requires:

- criterion-specific evidence spanning the relevant scope;
- explicit counterevidence review;
- a subcriterion-level calibration reference where available;
- an intent/genre check;
- a written reason that `0.5` or `1.5` is insufficient;
- exact agreement in blind scoring or Tomas's evidence-linked adjudication.

A `0` additionally records `zero_reason = absent_offering | failed_execution`.
Absence is descriptive and does not make the product globally bad. Fame,
popularity, novelty or cultural recognition cannot establish a `2`.

No published subcriterion-level calibration reference exists today: Rounds 1–2
publish dimension totals only, and ADR 0005 records the subcriterion
decompositions as engineering artefacts constrained to reproduce them. The
reference clause is therefore prospective — it binds once the Appendix B
program publishes subcriterion-level endpoint references, which it is directed
to do for every endpoint value its ten games produce — and an endpoint scored
before then satisfies the gate through the remaining requirements.

The gate is recorded structure, not intention: an endpoint decision carries an
`endpoint_gate` object naming the scope-spanning claims, the calibration
reference or its absence, and the intent/genre check, while the written reason
that `0.5` or `1.5` is insufficient is carried by the decision's adjacent
anchor-rejection field, mandatory at endpoints. The §15.1 validator confirms
the record and recomputes, from the difference and override records, that the
final value stood through blind exact agreement or a documented owner
adjudication.

---

## 10. Confidence protocol

Confidence describes the evidence supporting the score, not the desirability or
size of the score.

### 10.1 Subcriterion confidence

Before assigning confidence, record three closed facts:

- `coverage_state = full | bounded | materially_limited`;
- `conflict_state = none | adjacent_resolved | material_unresolved`;
- `stability_state = stable | bounded_change | actively_changing | unknown`.

Derive the label as follows:

- **High:** numeric value; `full + none + stable`.
- **Medium:** numeric value; no `materially_limited`, `material_unresolved`,
  `actively_changing` or `unknown` fact; and exactly one of `bounded`,
  `adjacent_resolved` or `bounded_change` applies.
- **Low:** any other defensible numeric value.
- **Unknown:** always Low confidence. If `material_unresolved` means either
  adjacent anchor remains defensible, the value must be Unknown rather than a
  Low-confidence number.

The scorer records the facts; the importer derives the label. Multiple bounded
limitations therefore produce Low rather than an editorial guess between
Medium and Low.

Recent release and absence of direct play do not mechanically lower confidence;
they matter only through an actual coverage or stability limitation. Direct-play
status remains public. This supersedes SOP v0.2 §5, which lists "recent
release" as a Medium condition and defines the labels qualitatively; the SOP is
amended on approval and ADR 0024 records the change.

### 10.2 Dimension confidence derivation

Record `dimension_scope_state = sound | threatened`. It is `threatened` when a
scope/build/platform mismatch could change the dimension but has not been
separated or resolved; otherwise it is `sound`.

- **High:** exact result; at least four subcriteria High and the fifth Medium or
  High; all five `stability_state = stable`; and `dimension_scope_state = sound`.
- **Medium:** exact or one-Unknown range; at least four subcriteria High/Medium;
  no more than one Low; no `material_unresolved` conflict; no `unknown`
  stability fact; `dimension_scope_state = sound`; and the High rule is not met.
- **Low:** every other state, including an insufficient dimension result.

A visible derived range therefore caps dimension confidence at Medium. Any
`actively_changing` subcriterion prevents High; any `unknown` stability fact or
threatened dimension scope produces Low. The importer uses only these stored
facts and counts.

### 10.3 Overall confidence derivation

Record `global_scope_state = sound | threatened` and the profile-level
`stability_state`. Global scope is threatened when the canonical edition/mode,
build cutoff or materially included platforms cannot be bounded for the profile
as a whole.

- **High:** all eight dimensions have exact results; at least six dimensions
  High and the other two Medium; `global_scope_state = sound`;
  profile-level `stability_state = stable`; `release_state = released`; and
  maturity is not `pre_release`.
- **Medium:** at least six dimensions are scoreable; at least six dimension
  confidence labels are High/Medium; no more than two are Low/insufficient;
  `global_scope_state = sound`; profile stability is not `unknown`; and the High
  rule is not met.
- **Low:** every other state.

Profiles with `release_state = announced | showcased` are Low. Other
pre-release profiles and games
under active remediation cannot exceed Medium. The importer recomputes
dimension and overall confidence from the stored facts; imported derived labels
are never trusted.

Deriving the dimension and overall labels from stored facts supersedes ADR 0006
§1's decision that per-dimension confidence is a stored editorial input: the
editorial input becomes the recorded facts, and the label becomes arithmetic
over them. ADR 0024 records the supersession; `dimension_assessments` remains
the storage location for the derived label and its note until the data contract
is amended.

---

## 11. Blind audit and adjudication

### 11.1 Independent pass

There are two total scoring passes: one primary and one independent audit. Both
receive the same canonically ordered captured source corpus and independently
create claim inclusion, mapping, disposition, observed-pattern, value and
confidence records. The auditor does not see:

- the primary claim ledger or rejected/accepted dispositions;
- primary proposed scores;
- dimension totals;
- Primary Pull/Risk;
- external review scores;
- Tomas's expected result.

### 11.2 Difference classes

- **Exact agreement:** same numeric value, or both Unknown with exactly the same
  nonempty `missing_coverage_classes` set after canonical sorting. Partial
  overlap is not a match.
- **Adjacent disagreement:** two numeric anchors separated by 0.5.
- **Material disagreement:** numeric anchors separated by 1.0 or more, or
  numeric versus Unknown, or both Unknown with different missing-class sets.

The report separately compares claim inclusion, claim-to-subcriterion mapping,
claim disposition, anchor selection and confidence. Agreement caused by a shared
primary interpretation is not independent reliability.

### 11.3 Mandatory adjudication

All material disagreements and any endpoint (`0`/`2`) disagreement must be
reviewed by Tomas. Adjacent disagreements must be reconciled by the scoring
editor and recorded; Tomas may review them in batch.

Adjudication must result in:

- one selected anchor with reason;
- or Unknown.

The final record preserves primary, audit and adjudicated values.

### 11.4 Reproducibility report

For every calibration batch report:

- exact subcriterion agreement rate;
- adjacent-or-exact agreement rate;
- material disagreement count;
- agreement by dimension and score band;
- common ambiguity causes;
- owner override count and reasons;
- wall-clock time and working effort per game for the research pass and for
  each scoring pass — the measurement that decides, before any catalog
  commitment, whether every production profile carries the full
  calibration-grade record or a reduced-but-auditable one.

Protocol v1.0 is production-ready only after a blind program using ten varied
mature games: six development games for anchor refinement and four untouched
holdout games for acceptance (400 paired subcriterion decisions in total).
Holdout metrics are calculated before owner adjudication; owner decisions never
improve them. The holdout must show:

- at least 90% numeric decisions in each pass overall;
- at least 36 of 40 numeric decisions for every game in each pass, with no
  dimension containing more than one Unknown;
- at least 70% exact subcriterion agreement;
- at least 95% exact-or-adjacent agreement;
- no more than 5% material disagreement overall;
- at least 90% exact-or-adjacent agreement within every dimension;
- at least 80% exact confidence-label agreement;
- no material endpoint disagreement;
- 100% of numeric final values traceable to evidence and an anchor;
- 100% of Unknown values carrying an evidence-linked insufficiency rationale;
- 100% deterministic derivation parity;
- no scope/platform/patch mismatch;
- no fabricated or unverifiable source;
- all disagreements adjudicated and retained.

An Unknown agreement therefore counts only on exact set equality, not any
overlap, and only when both independent insufficiency rationales substantiate
that set. Generic or repeated boilerplate does not qualify. Numeric-coverage
gates are evaluated before agreement rates, so a blanket-Unknown strategy fails
rather than inflating reliability.

If the holdout fails, the protocol returns to development. Any anchor change
after holdout exposure requires a fresh holdout set; the failed holdout cannot be
reused as unseen acceptance evidence. These are editorial reliability gates,
not claims of psychometric objectivity.

---

## 12. Interpretation and profile synthesis

Only after all eight dimensions are adjudicated may the scorer write:

- one-line experience;
- Primary Pull;
- Primary Risk;
- controlled experience tags/intensities;
- Great fit if…;
- Know before buying…;
- Probably not for you if…;
- material platform warning.

Experience tags use controlled Tag Registry v1.0. Boolean tags are present or
absent; only registry-declared intensity tags accept `low | medium | high`.
Freeform tag keys are invalid.

Primary Pull/Risk are purchase-decision summaries, not the highest and lowest
numbers by rule. They must be supported by the score record and may not smuggle
an aggregate verdict back into the product.

Pre-release wording follows the Evidence SOP and never sounds final. For a
pre-release profile (`evidence_status = pre_release`), the three interpretation
blocks carry the pre-release headings — *Looks promising if…*, *Watch before
buying…*, *Biggest unknowns…* — in the same three slots, keyed off evidence
status exactly as ADR 0006 §5 and Master Plan §3.6 define. The package stores
the same three arrays; the renderer selects the headings.

---

## 13. AI execution and recordkeeping

Every primary and audit pass carries an immutable run manifest containing:

- run ID, role and UTC start/end timestamps;
- provider, model label and exact snapshot/build ID where exposed; otherwise an
  explicit `snapshot_unavailable` limitation;
- protocol, rubric and package-schema versions;
- hashes of system instructions, scoring prompt/template, rubric, protocol and
  output schema;
- frozen source-packet digest and canonical source order;
- research date, evidence cutoff, search queries/collection strategy and all
  enabled research/tool/network access;
- decoding parameters and seed where exposed; otherwise an explicit
  `parameter_unavailable` value. The two scoring passes' configurations are
  identical except the seed, and exposed seeds differ (§2.3);
- retry count, validation failures, repairs and any human-supplied correction;
- structured-output digest.

The complete evaluation record contains the scope, source manifest, separate
primary and audit claim ledgers/decisions, adjudicated record, derivation output,
Tomas's approval and override reasons. A claim of same-input repeatability is
valid only when the frozen packet, instructions, schema, model snapshot and
exposed parameters match. Where a provider does not expose a snapshot or seed,
the limitation is reported rather than hidden.

Do not store or require hidden chain-of-thought. Store only evidence-linked,
reader-comprehensible rationales sufficient to audit the result.

The scorer must not claim direct play unless it occurred, fabricate a source,
silently resolve material disagreement, or publish automatically.

---

## 14. Reassessment

The scheduled clock begins on the public release date of the evaluated
edition/scope—not the research date, profile publication date or an unrelated
platform's release. For newly released games:

- three-month stabilization check;
- six-month check only when instability, active remediation, live-service change
  or unresolved uncertainty remains;
- twelve-month maturity check;
- event-triggered review at any time after a material change.

Checks do not automatically create revisions. A revision is required when
evidence changes a dimension/range/Unknown, confidence, Primary Pull/Risk,
fit interpretation, material platform warning or evaluation scope.

Older mature launch-catalog games receive one current-state evaluation and then
move to trigger-based monitoring.

Material triggers include major patches/overhauls, progression/economy/balance
redesign, material performance change, expansions affecting the base experience,
important ports/upgrades, server/offline changes, sustained evidence of a
late-game issue, or a credible correction. General sentiment movement, a new
review average or renewed online controversy is not itself a trigger; it opens
an investigation only when it points to a concrete claim about the evaluated
experience.

Initially, GPT Chat performs each scheduled or triggered evidence check and Tomas
approves its disposition. Later automation may surface candidate changes but
may not revise a profile. A no-change check records its trigger, date, sources,
affected-set analysis and conclusion in the evaluation history; it does not
create a new public revision or imply that the full profile was rescored.

For a revision, the research pass starts from the prior approved source corpus,
adds the change evidence and marks obsolete items `superseded` without deleting
them. It then freezes a new complete active corpus. Both scoring passes receive
that same active normalized corpus and the new scope/cutoff, but no prior claim
ledger, score, confidence or interpretation. The change packet alone is never
the scoring input.

The initial impact set contains every subcriterion mapped from a changed
accepted/unresolved claim. Add every one-hop neighbor in this closed, undirected
graph; an edge applies from either endpoint even if printed once. Do not expand
recursively beyond one hop:

| Criterion | Direct neighbors |
|---|---|
| `story_hook` | `opening_effectiveness` |
| `narrative_momentum` | `momentum_maintenance` |
| `repetition_control` | `content_focus`, `content_density` |
| `content_focus` | `repetition_control`, `content_density` |
| `content_density` | `repetition_control`, `content_focus`, `runtime_justification` |
| `runtime_justification` | `content_density` |
| `gameplay_execution` | `technical_stability`, `ux_friction`, `failure_fairness`, `consistency` |
| `technical_stability` | `gameplay_execution`, `production_cohesion`, `consistency` |
| `production_cohesion` | `technical_stability`, `consistency` |
| `consistency` | `dramatic_execution`, `gameplay_execution`, `technical_stability`, `production_cohesion` |
| `dramatic_execution` | `consistency` |
| `navigation_legibility` | `ux_friction` |
| `ux_friction` | `navigation_legibility`, `gameplay_execution` |
| `failure_fairness` | `gameplay_execution`, `capability_balance` |
| `moment_to_moment` | `toolset_depth`, `capability_balance`, `meaningful_agency` |
| `toolset_depth` | `moment_to_moment`, `capability_balance` |
| `capability_balance` | `moment_to_moment`, `toolset_depth`, `failure_fairness` |
| `meaningful_agency` | `moment_to_moment` |
| `reward_rhythm` | `session_rhythm` |
| `session_rhythm` | `reward_rhythm` |
| `mood_strength` | `emotional_power`, `memory_residue` |
| `emotional_power` | `mood_strength`, `lasting_impact` |
| `memory_residue` | `mood_strength` |
| `lasting_impact` | `emotional_power` |
| `world_lore_integration` | `world_coherence`, `mechanics_meaning` |
| `world_coherence` | `world_lore_integration`, `mechanics_meaning` |
| `mechanics_meaning` | `world_lore_integration`, `world_coherence`, `player_recontextualization`, `interactive_revelation`, `medium_irreplaceability` |
| `player_recontextualization` | `mechanics_meaning`, `interactive_revelation` |
| `interactive_revelation` | `mechanics_meaning`, `player_recontextualization`, `medium_irreplaceability` |
| `medium_irreplaceability` | `mechanics_meaning`, `interactive_revelation` |

Keys omitted from the graph have no automatic neighbor. The recorded initial
claim mapping plus this graph, rather than editor intuition, constructs the
affected set.

Every actual revision:

1. freezes a new evidence cutoff and complete active corpus while retaining the
   prior immutable snapshot and superseded source records;
2. constructs the affected set using the graph above;
3. runs independent primary and audit decisions for that complete affected set;
4. re-attests the three §10.1 confidence facts for every decision in the
   merged 40-decision map against the new evidence cutoff and active corpus —
   carried-forward decisions included, because a `stable` attested before the
   change evidence existed proves nothing about the state after it — and then
   re-derives every dimension and confidence result from the re-attested facts;
5. regenerates interpretation when any supporting decision changes; and
6. requires Tomas's approval before publication.

For `reassessment_affected`, load the immutable baseline named by
`baseline_package_digest`. Start with its complete 40 final decisions and
replace, by canonical key, every decision in the new graph-derived affected
set; no other decision or platform-override set changes. Then derive all eight
dimensions/confidence labels and interpretation from that merged 40-decision
map — after re-attesting the carried-forward decisions' confidence facts at
the new cutoff; a fact that cannot be re-attested from the new active corpus is
recorded at its degraded value rather than inherited.

The bounded package's pass and final decision sets contain exactly the
affected keys; the carried-forward decisions are not duplicated into it. Their
re-attested facts live in the reassessment record's
`carried_forward_reattestations` — one entry per rubric key outside the
affected set, each carrying the three §10.1 facts as attested at the new
cutoff. Derivation reads baseline decisions, affected-set replacements and
re-attested facts together; the published successor stores the bounded package
plus its baseline/patch lineage, and the full merged state is what it derives,
not what it re-stores. Missing baseline, duplicate keys, a key outside the
affected set, a carried-forward set that is not exactly the affected set's
complement, or a rubric/protocol incompatibility rejects the package; a rubric
or incompatible protocol change requires `reassessment_full`.

`evaluation_kind = reassessment_affected` must carry
`disposition = affected_set_revision`; `reassessment_full` must carry
`full_revision`. A no-change check creates a history event, not a scoring
package. An initial package has null baseline and reassessment record.

A full 40-subcriterion blind reassessment is required when the edition/scope or
core play contract changes, the impact cannot be bounded, or the impact set
reaches either eight subcriteria or three dimensions. Otherwise the recorded
affected-set audit is sufficient. Never patch a dimension total, confidence
label or public interpretation directly.

---

## 15. Structured draft-package contract

The scoring package is a versioned, closed-schema JSON document. The normative
field names, types, required/nullable rules, conditional score representation
and enums are defined in the companion
`docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json`. “At least”
does not apply: unknown properties are rejected.

Top level is exactly:

- `package_schema_version`;
- `package_id`;
- `scoring_content`;
- `content_digest`;
- `owner_approval`.

`content_digest` is lowercase SHA-256 over the RFC 8785 JSON Canonicalization
Scheme bytes of `scoring_content` only. It excludes itself and
`owner_approval`, avoiding a digest cycle. `owner_approval.approved_digest`
must equal it. Any edit to scoring content requires a new digest and approval.

Subcriterion ranges are invalid. JSON Schema validates shape; a companion
semantic validator additionally recomputes all dimension/confidence results,
verifies exactly 40 unique canonical subcriterion keys for initial/full work or
exactly the graph-derived affected set for a bounded reassessment, plus eight
unique derived-dimension keys; applies required-facet minima, confirms base/override
difference, checks all IDs/claim graphs/dates, verifies elapsed-time lower
bounds and confirms the digest. Semantic-validator failure rejects the whole
package. The database stores the complete approved package for audit but does
not treat that opaque document as the sole relational source of truth.

`owner_approval` names the authenticated actor, UTC decision time, approved
package digest, scope/rubric/protocol versions, approval status, every override
reason and an attestation that no AI published automatically. Approval of one
digest cannot authorize a repaired or regenerated package with another digest.
`audit_summary` contains the §11 difference counts/rates plus IDs for every
adjudicated difference; summary prose alone is invalid.

### 15.1 Mandatory semantic-validator checks

The validator has no editorial discretion. It rejects unless all are true:

1. canonical JSON and digest/approval binding match the rules above;
2. initial/full packages contain each of the 40 rubric keys exactly once in
   primary, audit and final decisions; affected reassessments contain exactly
   their graph-derived affected set in all three, and exactly the remaining
   rubric keys — each exactly once — in the reassessment record's
   carried-forward re-attestations;
3. primary/audit normalized-packet digest, source order, protocol/rubric/schema,
   prompt hashes and exact model snapshot match; their decoding configurations
   match except the sampling seed and exposed seeds differ (§2.3); their roles
   are correct and their scoring runs had no research/network tools;
4. all seven query-family dispositions occur exactly once; source collection
   standard/reason and independent active A/B cluster counts reproduce the
   five-versus-eight-to-ten rule; source/claim/difference/override references
   resolve; claim links contain no self-reference or relation-type
   contradiction; no active Tier-D claim supports a numeric decision; and
   experience-tag keys are unique;
5. numeric/Unknown conditional fields, zero reasons, anchor IDs, required-facet
   records/minima and platform base-difference rules hold; every numeric
   decision carries the adjacent anchor-rejection rationales its value admits;
   and every endpoint decision carries its §9 `endpoint_gate` record;
6. coverage states reproduce from the frozen coverage frame, Unknown reasons
   name a controlled missing class, every date is calendar-valid (the schema
   patterns bound fields and ranges; only the semantic validator knows
   February), and elapsed retrospective dates/lower bounds
   reproduce arithmetically; and the §6 Step 2 retrospective minima recompute
   for `memory_residue` and `lasting_impact` — the per-value independent-claim
   counts, the 180-day bound for `2`, releases under 30 days forced to Unknown,
   and the 90-day pre-release exception's Medium confidence cap;
7. final decisions equal a recorded primary/audit resolution or a documented
   owner override; difference classes and audit rates recompute exactly; every
   material difference and every difference touching an endpoint value is
   marked for owner review and is adjudicated; and every endpoint final value
   shows blind exact agreement or a documented owner adjudication;
8. all eight dimension result kinds/values and every confidence label reproduce
   from §§7 and 10; duplicated maturity/stability/scope facts match the frozen
   evaluation scope; release-state/date combinations are valid; the declared
   `evidence_status` reproduces from the §15.2 rule; and, for a bounded
   reassessment, every carried-forward key's re-attested facts are present in
   the reassessment record and are what derivation consumed (§14); and
9. reassessment source status, affected-set graph/threshold, baseline digest and
   disposition are internally consistent.

The JSON Schema and this checklist together are the package contract. Neither a
Claude prompt nor importer code may create missing rules.

An importer may create a draft only. Existing validation, preview, publication,
history, deployment and Live-proof machinery remains authoritative.

### 15.2 Package → relational import mapping

The importer writes a draft into the existing relational contract. These
mappings are normative; where one requires a migration, the migration is listed
in ADR 0024 and must land before the first import.

| Package | Relational contract |
|---|---|
| `evaluation_scope.evidence_status` | `evaluations.evidence_status`. Derived, then stored: `pre_release` iff `release_state ≠ released`; a released profile is `provisional` when `profile_stability_state` is `actively_changing` or `unknown`, or when overall confidence derives to Low; otherwise `verified`. |
| `release_state` + `pre_release_playable_basis` | `evaluations.evidence_maturity`: `announced → announced`, `showcased → showcased`, `pre_release_playable → hands_on` or `review_code` per the recorded basis; null for released profiles. The package's `evaluation_maturity` (pre_release / newly_released / mature) is a different, protocol-owned axis and never maps to this column. |
| `owner_approval.approval_status` | `evaluations.score_provenance`: an approved package imports as `editorial` — owner approval is the editorial sign-off. A package imported before approval may only produce a draft with `score_provenance = derived` and a `provenance_note` naming the package digest and its unapproved status. |
| `source.source_class` | `evidence_sources.source_category`: `critical_review → critic`, `technical_analysis → technical`, the rest map by name. `documented_gameplay` requires an additive enum-value migration; until it lands the importer rejects packages that use it rather than mislabelling them. |
| `source.source_tier` | Evaluation-local (§4.4), but `evidence_sources.evidence_tier` is global on the source row and frozen once a final evaluation cites it (ADR 0009 §2). The tier moves to `evaluation_evidence_links` by migration; until then a reused source whose local tier differs imports as a new source identity. |
| confidence labels | `High/Medium/Low` lowercase to the database's `confidence` enum. Labels are recomputed from the stored facts (§10) and written to `subcriterion_scores.evidence_confidence`, `dimension_assessments.confidence` and `evaluations.confidence`; imported labels are cross-checked, never trusted. |
| `evaluation_scope.evidence_cutoff` | `evaluations.evidence_cutoff_at`. Both are dates, not timestamps. |
| `interpretation` blocks | `profile_blocks` rows (`great_fit`, `know_before`, `probably_not`), 2–5 bullets each — the schema enforces the same 2–5 the publish gate does. Pre-release headings render per §12 from the same three slots. |
| `public_rationale` | `subcriterion_scores.rationale`, minimum 31 characters — the floor the calibration-corpus test already enforces. |
| the complete package | `scoring_packages` (ADR 0024 migration): an immutable row per approved document, keyed by unique `content_digest`, storing the whole package as `jsonb` with its schema/protocol/rubric versions, approval actor/time and `baseline_package_digest`. The evaluation the import creates references it through `evaluations.scoring_package_digest`; §14 resolves a baseline by selecting this table by digest. Run manifests, claim ledgers, endpoint gates, confidence facts and approval binding are thereby durable without becoming a second relational source of truth. |

Nothing here weakens §15's rule that the importer creates a draft only.

---

## 16. Protocol versioning and change control

Protocol changes require a new version when they alter:

- source admissibility;
- score-anchor meaning;
- contradiction/adjudication rules;
- confidence derivation;
- audit acceptance;
- source curation/weighting;
- AI responsibility.

Clarifying examples that do not change meaning may be added as a documented
minor revision.

#### Draft changelog

- **2026-08-25 — owner approval to enter calibration.** The candidate protocol
  and ADR 0024 are approved as the Appendix B basis, without making either
  governing. Master Plan v0.8 §3.8 records the four deferred gates and ADR 0024
  states the approval scope.
- **2026-08-25 — pre-approval revision after repository review.** Sampling
  independence (§1.4, §2.3, §13, §15.1); recurrence bands and the four-unit
  frame minimum (§6.1); adjacent-tie precedence (§6.1/§8.3); the supersession
  register and corrected SOP §3 reading (§0, §4.1, §10, ADR 0024); facet-rule
  escalation to a proposed Rubric v1.1 (§6.1); the recorded endpoint gate and
  prospective calibration references (§9); pre-release interpretation headings
  (§12); reassessment fact re-attestation (§14); grandfathering (§16); the
  §15.2 import mapping; and the matching package-schema tightening.

New versions are calibrated against the approved corpus before use. Published
profiles retain their original rubric/protocol provenance. No protocol change
silently rewrites historical evaluations.

The three published calibration profiles — and any profile published before
this protocol becomes governing — are grandfathered under their recorded
provenance: their approved totals, including the twenty subcriterion values at
`2` inside the four 10.0 dimension totals, stand as calibration-round outcomes
and are not retroactively rescored, re-gated or re-evidenced under §9 or §6
Step 2. This protocol applies to them prospectively, through §14: their next
revision runs under it in full.

---

# Appendix A — Behaviorally anchored subcriterion scales

These anchors operationalize Rubric v1.0. They are internal editorial anchors,
not public grades. Choose the closest observed pattern after applying scope,
intent, evidence and contradiction rules. Evaluative adjectives in the table
are summaries, never evidence. Every selection must also satisfy the shared
intensity band below and the observation record required by §6.1:

| Value | Shared cross-criterion intensity band |
|---|---|
| `0` | The offering is absent in the declared form, or a widespread/blocking failure prevents the criterion's basic function. Requires the endpoint gate. |
| `0.5` | The offering appears, but recurring material limitations dominate its contribution across representative units. |
| `1` | The offering performs its basic function; evidence is materially mixed, ordinary or bounded rather than predominantly weak or strong. |
| `1.5` | A clear strength recurs across representative units; limitations are bounded and do not overturn the pattern. |
| `2` | The strength is defining across the relevant scope, survives the strongest counterevidence and has no material weak pattern. Requires the endpoint gate. |

An anchor is not selected from tone or adjective matching. The decision record
must point to the criterion-specific behaviors, recurrence and consequences
that place the game in that band.

Each table cell has the stable anchor ID
`<canonical_subcriterion_key>@<numeric_score>` (for example,
`story_hook@1.5`). Canonical keys come from the versioned rubric registry;
display names are not identifiers.

## A1. Story & Character Investment

| Subcriterion | 0 | 0.5 | 1 | 1.5 | 2 |
|---|---|---|---|---|---|
| Story Hook & Stakes | The declared form supplies no legible reason to follow its narrative, or incoherence prevents one | The reason to continue emerges only intermittently or too late for the form and repeatedly loses force | Premise/stakes establish a workable reason to continue but pull varies | The form's immediate or slow-burn hook develops at an appropriate time and sustains attention with bounded lapses | Hook/stakes repeatedly renew the narrative reason to continue and remain defining through the declared arc |
| Character Investment | Relevant characters, agents or player-authored/emergent roles are absent, illegible or prevent intended investment | Character/agent expression is thin or inconsistent enough that attachment rarely survives | Relevant figures/roles support some attachment or interest, with materially mixed realization | Distinct behavior, relationships or player-authored expression sustain investment across the arc | Character/agent realization repeatedly produces unusually strong attachment or fascination and defines the experience |
| Narrative Coherence | No legible narrative logic is offered, or plot/motivations/rules repeatedly contradict or collapse | Frequent gaps or arbitrary turns undermine understanding | Mostly functional with visible gaps or uneven logic | Coherent and well-motivated with minor weaknesses | Exceptionally rigorous/integrated narrative and world logic |
| Narrative Momentum & Payoff | Narrative development/payoff is absent, inert or collapses | Repeated stalls and weak payoff substantially drain investment | Adequate development/payoff with uneven stretches | Strong escalation/development and satisfying payoff | Exceptional progression and payoff reframe or fulfill the experience |
| World/Lore Integration | World/lore material is absent, contradictory or functionally irrelevant to investment | Mostly decorative exposition with little experiential effect | Competently supports setting/story in parts | Meaningfully integrated across story, exploration or systems | Indispensable integration makes world/lore a defining source of investment |

## A2. Execution & Polish

| Subcriterion | 0 | 0.5 | 1 | 1.5 | 2 |
|---|---|---|---|---|---|
| Dramatic/Writing Execution | Dramatic/writing work is absent or repeatedly fails its basic intended function | Frequent weak writing/delivery undermines otherwise legible intent | Competent or materially mixed execution | Consistently strong writing, staging and delivery | Exceptional dramatic execution is a defining reference-point strength |
| Gameplay Execution | Core interaction is broken, unreadable or persistently unreliable | Frequent responsiveness, feedback or implementation failures | Functional/competent with recurring limitations | Input, state change and feedback remain clear and reliable with bounded faults | Input, state change and feedback reinforce one another across the full core loop with no material execution weakness |
| Technical Stability | Scope is effectively unplayable or dominated by severe failures | Frequent major bugs/crashes/performance failures | Playable with visible recurring technical problems | Stable and polished with minor/nonmaterial issues | Exceptionally robust technical state across the declared scope |
| Production Cohesion | Major elements feel fragmented, unfinished or mutually incompatible | Visible compromises repeatedly break cohesion | Mostly coherent with mixed/uneven components | Art/audio/UX/content/systems feel strongly unified | Exceptional cohesion makes every production layer reinforce the whole |
| Consistency | Execution defects dominate substantial sections, modes or systems | Defect severity/spread varies sharply and repeatedly disrupts otherwise functional execution | Execution is broadly functional but notable defect clusters or dips remain | Reliable execution persists across the declared runtime/modes with only bounded defect clusters | No material execution-defect pattern appears across the declared runtime/modes after active counterexample search |

## A3. Structure & Focus

| Subcriterion | 0 | 0.5 | 1 | 1.5 | 2 |
|---|---|---|---|---|---|
| Structural Intentionality | Chosen form repeatedly sabotages the intended experience | Frequent mismatch between structure and goals | Workable/mixed structure with clear compromises | Structure consistently supports intended play | Form and intent reinforce one another exceptionally |
| Navigation & Information Legibility | Intended information model leaves necessary action persistently unintelligible | Recurring unproductive confusion exceeds intended discovery/friction | Learnable and functional with notable friction | Clear and coherent within the game's chosen guidance model | Exceptionally elegant communication/navigation deepens engagement |
| Repetition Control | Reuse makes the intended experience substantially untenable | Pervasive filler/reuse overwhelms meaningful variation | Noticeable mixed repetition remains tolerable | Reuse is mostly purposeful and sustained by variation | Repetition is transformed into an exceptional structural strength |
| UX / Interaction Friction | Interface/onboarding/checkpoint/inventory friction blocks core engagement | Pervasive avoidable friction repeatedly disrupts play | Functional/tolerable with recurring roughness | Low or purposeful friction supports the design | Exceptionally clear, elegant interaction removes barriers without flattening intent |
| Content Focus | Content selection/prioritization repeatedly obscures or displaces the core promise | Recurring weakly justified obligations materially dilute the core promise | Prioritization is mixed: meaningful and expendable strands both shape the experience | Most selected content reinforces the core promise; diversions are bounded or clearly purposeful | Selection and prioritization are defining strengths: virtually every strand sharpens, contrasts with or deliberately rests the core promise |

## A4. Agency & Satisfaction

| Subcriterion | 0 | 0.5 | 1 | 1.5 | 2 |
|---|---|---|---|---|---|
| Moment-to-Moment Agency | Input offers essentially no meaningful influence within the intended play | Influence is narrow, unreliable or mostly cosmetic | Functional agency supports ordinary engagement | Actions reliably create strong tactical/expressive influence | Exceptional immediacy and consequence make agency a defining strength |
| Toolset / Choice Depth | The declared play supplies no differentiated tool or choice depth | Shallow or false choices offer little differentiated use | Adequate options with limited depth | Rich, viable tools support varied strategies/expression | Exceptional systemic depth produces sustained or emergent choice |
| Reward Rhythm | Actions/progress repeatedly produce little legible or satisfying reward | Rewards are weak, erratic or quickly exhausted | Adequate/mixed feedback and progression | Satisfying feedback/progress/mastery is sustained | Exceptional reinforcement makes action, learning and reward inseparable |
| Failure / Friction Fairness | The form supplies no resistance/error/recovery relationship, or that relationship is arbitrary, unreadable and structurally disproportionate | Opaque causality, weak feedback or punitive recovery repeatedly blocks learning | Causality and recovery are broadly learnable/proportionate but meaningful rough cases remain | Resistance supplies clear causes, actionable feedback and proportionate recovery across representative units | Resistance and recovery repeatedly deepen learning/tension without a material arbitrary or opaque pattern |
| Capability Balance | The form supplies no capability–pressure relationship, or available counterplay cannot meaningfully engage the pressure | Capability and pressure are repeatedly mismatched, collapsing counterplay or intended tension | Counterplay is adequate but balance produces recurring dominant, redundant or weak options | Viable capability remains well matched to pressure while preserving tension and expression | Capability, counterplay and pressure remain mutually constraining across the full core loop, sustaining both mastery and viable expression |

## A5. Pacing & Time Respect

| Subcriterion | 0 | 0.5 | 1 | 1.5 | 2 |
|---|---|---|---|---|---|
| Opening Effectiveness | Opening fails to establish loop, stakes or usable engagement | Slow/confusing/weak opening substantially delays value | Competently establishes the experience with unevenness | Strong opening establishes appeal and expectations efficiently | Exceptional opening immediately teaches, hooks and defines the experience |
| Momentum Maintenance | Prolonged stalls or regression dominate development | Recurring dead zones substantially drain engagement | Uneven but functional momentum | Strong development/variation sustains engagement | Masterful pacing continuously renews or deepens the experience |
| Runtime Justification | Most of the declared campaign/evaluation window continues after its central value or variation is exhausted | Substantial stretches add little new value relative to their time cost | The declared window contains both earned development and clearly weak/excess stretches | Nearly all of the declared window adds development, variation, contrast or deliberate rest; excess is bounded | Every major stretch of the declared window changes, deepens or deliberately contextualizes the experience; its duration is integral to the form |
| Session / Progress Rhythm | Progress units are opaque or unusable for the intended design | Poorly signposted/structured progress repeatedly frustrates commitment | Workable progress rhythm with recurring friction | Clear, appropriate progress units support sustained play | Exceptional rhythm makes sessions/progression intrinsically coherent and motivating |
| Content Density | Representative time is dominated by activity, transit or waiting that contributes neither play, story, discovery, mood nor purposeful rest | Low-contribution time regularly outweighs meaningful contribution | Contribution varies substantially across representative time samples | A high share of representative time contributes through play, story, discovery, mood, contrast or deliberate rest | Nearly all representative time makes a legible contribution; quiet, travel and downtime are retained only where their experiential function is evidenced |

## A6. Atmosphere & World Pull

| Subcriterion | 0 | 0.5 | 1 | 1.5 | 2 |
|---|---|---|---|---|---|
| Sense of Place | Spaces remain generic, illegible or fail to cohere as a place | Thin/inconsistent place-making offers little inhabitable identity | Recognizable setting with some convincing locations | Vivid, grounded locations sustain strong place identity | Extraordinary place-making makes inhabitation/exploration a defining draw |
| Mood Strength | Intended mood is absent or repeatedly contradicted | Mood appears intermittently but rarely holds | Competent mood with uneven intensity | Strong, sustained tone shapes the experience | Exceptional tonal control produces a singular emotional/sensory state |
| Audiovisual Identity | Art/audio are incoherent, functionally weak or indistinct | Limited/inconsistent identity contributes little | Competent cohesive presentation with some distinction | Repeated visual/audio choices form a distinctive, coherent language | Visual and audio motifs, rules and feedback form a defining language sustained across the declared scope, independent of public recognition |
| World Coherence / Myth | World lacks usable rules/continuity or repeatedly contradicts itself | Thin/decorative world logic offers little depth | Adequate internal continuity and context | Convincing rules/history/culture meaningfully enrich the world | Exceptional mythic/systemic coherence makes the world feel independently real |
| Memory Residue | Eligible retrospective evidence consistently reports no recoverable distinctive place, sound or image | Retrospective recall is sparse, generic or confined to one isolated impression | Multiple places, sounds or images remain recoverable after elapsed time, with mixed specificity | Independent retrospective evidence retains several specific sensory/spatial memories after elapsed time | Specific sensory/spatial memories recur across independent retrospective evidence, including evidence after 180+ days, and remain defining without relying on fame |

## A7. Thematic & Emotional Impact

| Subcriterion | 0 | 0.5 | 1 | 1.5 | 2 |
|---|---|---|---|---|---|
| Thematic Clarity | Themes are absent, incoherent or contradicted by execution | Themes are stated/gestured at but remain shallow | Recognizable themes receive mixed but substantive treatment | Themes are clearly and consistently developed | Exceptional thematic articulation rewards sustained interpretation |
| Emotional Power | Eligible observations consistently report no emotional effect, or the intended affect repeatedly fails | Affect is sporadic, forced or too weak to survive representative moments | Some moments produce the intended affect while others remain inert or counterproductive | The intended affect recurs strongly across representative moments with bounded misses | Emotional response is a defining, sustained consequence of the experience across independent evidence—not a proxy for acclaim |
| Theme–Character Integration | Themes remain detached from relevant characters, agents, situations, player role or emergent actors | Themes are mostly stated rather than enacted by those agents/situations | Themes are enacted in some relevant agents/situations but integration is uneven | Relevant agents, situations or the player's role repeatedly embody and test the themes | Theme and relevant agents/situations are mutually dependent across the declared form; removing either would dismantle the thematic operation |
| Philosophical / Mythic Weight | Larger ideas are absent or function only as empty gestures | Treatment remains shallow, asserted or internally untested | Some ideas receive meaningful development amid conventional or mixed handling | Systems, situations or narrative repeatedly test substantive ideas and support reflection | Competing implications are developed and tested across the work so that the ideas materially deepen how its events/actions are understood |
| Lasting Impact | Eligible retrospective evidence consistently reports no continuing emotional/thematic effect | Retrospective effect is brief, generic or confined to an isolated idea/moment | Some specific themes/emotions remain active after elapsed time, with mixed depth | Independent retrospective evidence shows sustained reflection or changed interpretation after elapsed time | Specific emotional/thematic consequences recur across independent retrospective evidence, including evidence after 180+ days, and continue to deepen later understanding |

## A8. Medium-Specific Craft

| Subcriterion | 0 | 0.5 | 1 | 1.5 | 2 |
|---|---|---|---|---|---|
| Mechanics–Meaning Integration | Mechanics are detached from or contradict intended meaning | Occasional/token connection adds little | Some meaningful reinforcement between play and meaning | Mechanics consistently embody narrative/theme/world | Exceptional integration makes mechanics themselves the central meaning |
| Player Recontextualization | Play never meaningfully changes understanding of prior action/assumption | Slight or mostly scripted recontextualization | At least one meaningful interactive shift in understanding | Strong/recurring recontextualization depends on prior play | Transformative recontextualization makes the player's own action newly legible |
| Interactive Revelation / Discovery | Relevant knowledge is delivered almost entirely passively | Interaction adds little beyond accessing fixed information | Some meaningful discovery occurs through doing/exploring | Substantial understanding is produced through interaction | Exceptional revelation could not work without active discovery |
| Medium Irreplaceability | In a stated passive-adaptation test, the core function transfers with little loss beyond control/input | Passive substitution loses some texture but preserves nearly all central meaning/function | Passive substitution loses meaningful participation, discovery, expression or responsibility, though the central work remains recognizable | Passive substitution loses major causal or experiential functions and changes what the work means | Removing interactivity destroys the work's central causal/interpretive function rather than merely changing its presentation |
| Meaningful Agency | Actions have no meaningful consequence/expression/complicity | Choice/action is mostly cosmetic or weakly connected to meaning | Some consequences/expression create meaning | Strong agency repeatedly shapes interpretation or responsibility | Exceptional agency makes the player's authorship/complicity indispensable |

---

# Appendix B — Reproducibility calibration procedure

Before Protocol v1.0 becomes governing:

1. Pre-register ten varied mature games before any protocol scoring: six
   development games and four untouched holdout games.
2. Select for varied score bands, genre/forms, length, narrative/agency balance,
   platform conditions and evidence disagreement—not for famous consensus.
3. Freeze one canonically ordered evidence packet per game under §4. The packet
   is captured before either scoring pass and its digest is recorded.
4. Run two independent passes per game under §11.1. Each creates its own claim
   ledger and decisions from the raw frozen packet.
5. Use the six development games to identify repeated mapping/anchor ambiguity.
   Amend the protocol where necessary and rerun changed development cases.
6. Freeze the candidate protocol, prompts, schemas, one exact model execution
   snapshot/build and the decoding configuration both scoring passes will use,
   before exposing any of the four holdout packets to scoring; all eight
   holdout passes use that snapshot and configuration, and paired passes differ
   only in sampling seed (§2.3). Each paired development run must likewise
   match snapshots, even when the protocol later changes.
7. Score the holdout once. Calculate every §11.4 acceptance metric on the 160
   paired holdout decisions before adjudication.
8. If any gate fails, return to development. Any subsequent anchor, mapping,
   confidence or prompt change requires a new, genuinely untouched holdout.
9. Only after measurement, adjudicate every difference and verify 100%
   evidence/anchor traceability, Unknown rationales, derivation parity and
   record retention.
10. Tomas approves Protocol v1.0 only if every holdout gate passes and no
    integrity failure occurred. The approval also decides, from the recorded
    per-game time and effort, whether the full record is required for every
    production profile or reserved for calibration, endpoints and disagreement
    cases — before the catalog commits to either answer.

The ten-game set should collectively include:

- narrative/atmosphere-led and agency/execution-led strengths;
- intentionally minimal story or agency offerings;
- mixed/compromised and materially weak execution;
- short, long, linear, open and systems-led forms;
- at least one platform-variable or substantially patched game;
- both high-evidence-consensus and credible-disagreement cases.

Calibration tests protocol consistency; it must not be used to force new games
to resemble the existing score shapes.

---

# Appendix C — Protocol-owned closed vocabularies

Machine packages use only these values unless a later protocol/schema version
adds another. Display labels may differ; stored meaning may not.

| Field | Allowed values |
|---|---|
| `score_value_kind` | `numeric`, `unknown` |
| `numeric_score` | `0`, `0.5`, `1`, `1.5`, `2` |
| `source_tier` | `A`, `B`, `C`, `D` |
| `source_class` | `critical_review`, `specialist_creator`, `technical_analysis`, `documented_gameplay`, `player_signal`, `first_party`, `direct_play` |
| `claim_type` | `fact`, `direct_observation`, `interpretation`, `player_signal` |
| `claim_direction` | `supports_higher`, `supports_lower`, `mixed_or_context` |
| `observation_basis` | `source_reported`, `documented_gameplay`, `direct_play`, `scorer_inference` |
| `recurrence` | `isolated`, `recurring`, `widespread` |
| `consequence` | `cosmetic`, `minor_friction`, `material`, `blocking_or_defining` |
| `claim_disposition` | `accepted`, `limited`, `rejected`, `unresolved` |
| `subcriterion_confidence` | `High`, `Medium`, `Low` |
| `coverage_state` | `full`, `bounded`, `materially_limited` |
| `conflict_state` | `none`, `adjacent_resolved`, `material_unresolved` |
| `stability_state` | `stable`, `bounded_change`, `actively_changing`, `unknown` |
| `scope_state` | `sound`, `threatened` |
| `release_state` | `announced`, `showcased`, `pre_release_playable`, `released` |
| `pre_release_playable_basis` | `hands_on`, `review_code` |
| `evidence_status` | `verified`, `provisional`, `pre_release` |
| `evaluation_maturity` | `pre_release`, `newly_released`, `mature` |
| `direct_play_status` | `none`, `partial`, `complete` |
| `candidate_source_disposition` | `accepted`, `limited`, `rejected` |
| `source_record_status` | `active`, `superseded` |
| `missing_coverage_class` | `temporal_stratum`, `progression_state`, `core_loop`, `mode`, `platform`, `build`, `retrospective_elapsed`, `source_scarcity`, `unresolved_scope`, `material_conflict` |
| `difference_class` | `exact`, `adjacent`, `material` |
| `zero_reason` | `absent_offering`, `failed_execution` |
| `dimension_result_kind` | `exact`, `range`, `insufficient` |
| `decision_role` | `primary`, `audit`, `adjudicated` |
| `reassessment_disposition` | `no_change`, `affected_set_revision`, `full_revision` — `no_change` appears only in evaluation-history events; a scoring package never carries it (§14) |
| `reassessment_trigger` | `scheduled_3m`, `scheduled_6m`, `scheduled_12m`, `major_patch`, `systems_redesign`, `performance_change`, `expansion_base_effect`, `port_or_upgrade`, `service_availability`, `late_game_evidence`, `credible_correction` |
| `approval_status` | `draft`, `approved`, `rejected` |

`Unknown` is represented by `score_value_kind = unknown` and a null numeric
value; it is not an additional number. `snapshot_unavailable` is the declared
value of `model_snapshot_build_id` when the provider exposes no snapshot
identifier, and `parameter_unavailable` the declared value of `seed` when none
is exposed; both are limitations, not hidden defaults (§2.3, §13). `blocking_or_defining` takes its meaning
from claim direction and selected anchor and must not be interpreted without
the claim text.
