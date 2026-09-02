# Game Profile — Phase 3A Preregistration v1.0 DRAFT

- **Product:** Should I Play?
- **Methodology:** Game Profile
- **Program:** Phase 3A — Candidate Scoring Protocol calibration
- **Date opened:** 2026-09-02
- **Status:** **DRAFT — NOT AUTHORIZED TO SCORE**
- **Owner / final editorial authority:** Tomas
- **Designated scoring model:** OpenAI GPT-5.6 Sol, High reasoning
- **Repository:** `Bergertomas/game_profile`

## 0. Purpose and approval boundary

This document preregisters the Phase 3A calibration procedure before any candidate-protocol scoring begins. It converts Appendix B, the owner-approved cohort lock, ADR 0035, and the current package contract into one executable freeze record.

Nothing in this draft authorizes D1 research/scoring merely because the file exists. Phase 3A scoring may begin only after:

1. all `BLOCKING BEFORE D1` items in §12 are closed;
2. the exact preregistration commit and controlled-input digests are frozen;
3. Tomas explicitly approves this preregistration; and
4. the approved preregistration is merged to `main`.

No calibration run imports or publishes production scores.

---

## 1. Authority and effective methodology

The execution must use the repository state frozen by the approved preregistration commit. Subject-specific authority remains unchanged:

- `Game_Profile_Scoring_Rubric_v1.0.md` owns dimension/subcriterion meaning and the 0–2 half-step scale.
- `Game_Profile_Editorial_Evidence_and_Data_Sourcing_SOP_v0.2.md` owns evidence operations and the pre-release workflow where not superseded.
- `Game_Profile_Scoring_Protocol_v1.0_DRAFT.md` + accepted amendments own the candidate evidence-to-number procedure under calibration.
- `docs/decisions/0035-released-game-maturity-is-evidence-and-stability-based.md` supersedes the candidate protocol's old fixed twelve-month maturity sentence.
- `docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json` + the semantic validator own the structured package shape/enforcement for this candidate.
- `docs/Game_Profile_Phase_3A_Cohort_Lock_2026-09-02.md` owns the ten selected game identities/high-level scopes.
- Tomas owns final methodology/editorial decisions.

### Effective maturity semantics

Appendix B's mature-game gate remains. A released scope is `mature` when an explicit evidence/stability maturity review establishes that the evaluated product is sufficiently settled and understood for reliable current-state scoring. There is no minimum release age. Twelve months is a backstop review, not a waiting period or automatic promotion. Age-sensitive subcriterion evidence rules remain independent.

### Required-facet candidate behavior during development

The six development games test the candidate protocol's required-facet lower-of-two rule exactly as currently written. Facet records and parent values are retained for analysis. This does **not** make Rubric v1.1 governing. After D1–D6, Tomas must approve the required-facet rubric amendment or direct reversion before any holdout scoring; that is a separate Phase 3A gate.

---

## 2. Locked cohort and run order

No substitution occurs without Tomas's explicit approval and a revised cohort/preregistration record.

### Development — score sequentially

1. **D1 — Alan Wake 2** — current patched base-game/main-campaign scope; exact expansion handling pending §5 owner gate.
2. **D2 — Battlefield 6** — core Multiplayer, current state at evidence cutoff; exact mode exclusions frozen in §5.
3. **D3 — The Legend of Zelda: Tears of the Kingdom — Nintendo Switch 2 Edition**.
4. **D4 — Banishers: Ghosts of New Eden** — current patched main-game scope.
5. **D5 — Senua's Saga: Hellblade II Enhanced** — Enhanced main campaign; exact non-campaign mode exclusion frozen in §5.
6. **D6 — Saros** — current main-game scope across PS5 and PS5 Pro technical variants unless §5 is amended before approval.

### Untouched holdout — execute only after candidate freeze

1. **H1 — Resident Evil 4 Remake** — exact Separate Ways/Mercenaries handling pending §5 owner gate.
2. **H2 — Kingdom Come: Deliverance II** — exact story-expansion handling pending §5 owner gate.
3. **H3 — Astro Bot** — exact post-launch downloadable-level handling pending §5 owner gate.
4. **H4 — Immortals of Aveum** — current patched campaign; exact integrated endgame/NG+ handling pending §5 owner gate.

The identity of the holdouts is not secret from Tomas or the repository. `Untouched` means that before the candidate freeze they receive **no protocol scoring, no expected-score analysis, no rehearsal, no evidence packet, and no use as development feedback**.

---

## 3. Holdout isolation and context hygiene

### 3.1 Development protection

During D1–D6:

- development research/scoring inputs must not contain the holdout cohort-lock file, holdout-specific preregistration analysis, expected holdout outcomes, or prior Game Profile decisions for a holdout;
- no holdout evidence collection occurs;
- no holdout title is used as an anchor example to tune the candidate protocol;
- historical public/repository content about a holdout is never supplied to a scoring context unless it later enters that holdout's frozen evidence corpus under the same source rules.

### 3.2 Research/scoring separation for every game

Each game uses three isolated executions:

1. **Research collection pass** — constructs candidate log, source manifest, coverage frames and frozen corpus. It never scores.
2. **Primary scoring pass** — stateless closed-corpus call; reconstructs claims/mappings/decisions independently.
3. **Audit scoring pass** — separate stateless closed-corpus call with byte-identical semantic inputs/configuration; it cannot see primary output.

The research context ends before scoring. Neither scoring pass receives the candidate/rejection log, research commentary, prior profile decisions, another pass, owner expectations, open-web access, or external review grades.

### 3.3 Holdout exposure

After D1–D6 and development analysis, the candidate protocol/prompt/schema/model configuration is frozen. **Only then** may H1 research begin. Holdout research is therefore also protected from development tuning, even though Appendix B strictly requires the freeze only before holdout scoring. This is a deliberate stronger isolation rule.

Once H1 research begins, no material anchor/mapping/confidence/prompt/schema change may preserve the same holdout as acceptance evidence. Any such change returns the program to development and requires a genuinely new untouched holdout set as Appendix B requires.

---

## 4. Model/execution freeze

### 4.1 Measured scoring execution surface

The measured primary/audit passes are not ordinary ChatGPT tabs. They are executed by a small repository-controlled OpenAI API harness so the model inputs and provider-controlled configuration can be recorded exactly.

- **Provider:** OpenAI
- **Model ID / snapshot candidate:** `gpt-5.6-sol`
- **Reasoning effort:** `high`
- **Reasoning mode:** standard (not Pro)
- **API:** Responses API unless Item 4 verification demonstrates a contract incompatibility that requires an explicitly approved harness amendment
- **State:** stateless; no conversation/previous-response linkage
- **Store:** false where supported by the harness/account policy
- **Tools for scoring:** none
- **Tools for research:** web search only as explicitly configured by the research harness, plus deterministic local capture/hash tooling outside the scoring model
- **Seed:** `parameter_unavailable` if the selected Responses API configuration does not expose a seed; paired calls remain independent stochastic requests as Protocol §2.3 permits
- **Decoding/configuration:** every exposed parameter is explicitly recorded and byte-identical across the paired scoring calls except a seed if a seed becomes available

OpenAI's current model documentation lists `gpt-5.6-sol` under the GPT-5.6 Sol snapshot section and supports High reasoning. The harness must verify the returned model identity before a run counts. If the provider changes this contract or the returned model cannot be tied to the preregistered identifier, stop before scoring rather than substituting an alias.

### 4.2 Controlled instructions

The API harness supplies and hashes the exact repository bytes of:

- `docs/scoring/Phase_3A_Execution_System_Instructions_v1.0.md`
- `docs/scoring/Phase_3A_Scoring_Prompt_v1.0.md` for both primary/audit passes
- `docs/scoring/Phase_3A_Research_Prompt_v1.0.md` for research
- frozen Rubric, effective Protocol/amendments and output schema

The project-controlled execution instructions are what the package records as the system/developer-instruction digest. No hidden ChatGPT product system prompt is part of a measured API scoring run.

The wrapper assigns `primary` or `audit` as run metadata after the model output; role metadata does not change the semantic prompt/corpus supplied to the paired calls.

### 4.3 Engineering agents do not score

Codex/Claude may implement and run the deterministic harness, capture outputs, compute digests, validate schema/semantics, measure timing, and assemble the ledger. They may not alter model output because they disagree with a score, choose an anchor, reconcile the two passes, or write owner adjudication. Any structural repair/retry is logged exactly.

---

## 5. Scope and DLC/content freeze

The following is the **recommended preregistration scope**. Rows marked `OWNER GATE` remain blocking until Tomas explicitly approves or changes them.

| Game | Included | Excluded / separate scope | State |
|---|---|---|---|
| D1 Alan Wake 2 | Current patched base main campaign, including free Anniversary/QoL updates | `Night Springs` and `The Lake House` expansions | **OWNER GATE** |
| D2 Battlefield 6 | Core current Multiplayer and permanent/current seasonal core-MP content at corpus cutoff | Campaign, Portal, REDSEC or other materially distinct modes | Freeze as recommended unless owner changes |
| D3 Zelda: Tears of the Kingdom Switch 2 Edition | Switch 2 Edition base adventure + edition-level technical/features state | No separate story DLC identified; optional companion assistance does not redefine base scope | Freeze as recommended |
| D4 Banishers | Current patched main game | Any future materially distinct expansion/content not present at preregistration | Freeze as recommended |
| D5 Hellblade II Enhanced | Enhanced main campaign and free Enhanced changes applicable to that campaign | Distinct Dark Rot challenge mode | Freeze as recommended |
| D6 Saros | Current main game; PS5 + PS5 Pro technical variants in one scope with platform-specific technical handling when material | Any later materially distinct expansion/mode | Freeze as recommended |
| H1 Resident Evil 4 Remake | Current patched Leon main campaign | `Separate Ways`; Mercenaries | **OWNER GATE** |
| H2 Kingdom Come: Deliverance II | Current patched base main game | `Brushes with Death`, `Legacy of the Forge`, `Mysteria Ecclesiae`, and other Expansion Pass story DLC | **OWNER GATE** |
| H3 Astro Bot | Main campaign/current base-game path | Permanent free post-launch challenge/downloadable levels | **OWNER GATE** |
| H4 Immortals of Aveum | Current patched base campaign | NG+ and post-campaign Echollector/endgame objectives as separate optional/endgame scope for this calibration | **OWNER GATE** |

Free patches, bug fixes, accessibility additions, platform updates and balance changes that affect the included scope are part of the current-state build even when optional expansion/mode content is excluded.

If an excluded expansion materially changes the base campaign through shared systems/patches, research may use first-party/current-state evidence to establish the base-build change, but may not silently score the separate expansion content itself.

---

## 6. Per-game scope/maturity freeze procedure

Before research starts for a game, create an immutable scope record containing every Protocol §3 field:

- canonical title/slug;
- edition;
- profile scope key;
- included mode(s);
- included platform(s);
- exact build/current-state cutoff description;
- release state;
- pre-release basis when applicable;
- evidence status;
- evaluation maturity;
- public release date;
- evidence cutoff rule;
- direct-play record;
- known exclusions;
- profile stability state;
- global scope state.

### Maturity review for released games

For every released development/holdout game, record the ADR 0035 maturity review before research scoring. At minimum record:

- review date;
- evaluated scope/build;
- evidence-cutoff policy;
- why the scope is sufficiently settled;
- evidence-depth expectation;
- known material changes still in flight;
- resulting stability state.

Battlefield 6 Multiplayer is already owner-accepted as mature in ADR 0035, but the per-run maturity record still captures its current-state rationale. Saros must pass the same review; it does not receive an age exception.

---

## 7. Evidence cutoff and corpus-freeze policy

There is no single calendar cutoff for all ten games because the runs are sequential and current-state evidence may evolve. Instead:

1. each game's **evidence cutoff date** is the UTC calendar date of its corpus freeze;
2. `frozen_at` records the precise UTC timestamp;
3. the normalized packet contains only evidence admitted under the protocol for the declared scope/current state and discovered before `frozen_at`;
4. the exact patch/season/build/current-state interpretation is recorded in `build_cutoff`;
5. after freeze, neither scoring pass may browse or add evidence;
6. if a material omitted source/current-state change is discovered before adjudication, invalidate both pending scoring passes, update research, freeze a new packet and rerun both;
7. after a game's adjudicated development result is closed, later evidence does not rewrite that run; it may create a documented development rerun only if the protocol/research packet legitimately requires it.

For holdouts, corpus collection starts only after candidate freeze (§3.3).

---

## 8. Evidence collection standard

Research follows the effective Protocol §4 and the canonical research prompt.

- Genuine scarcity floor: 5 independent active A/B evidence clusters with a concrete scarcity reason.
- Normal AA/AAA target: 8–10 independent active A/B clusters.
- >10 only for recorded complexity such as platform variance, technical instability, current-state/live-service change, credible disagreement or unusual scope complexity.
- C material may supply factual/contextual completeness but does not fill the substantive floor.
- D is watchlist/non-scoring.
- Source count is never a vote, divisor or score input.
- All seven query families are run or explicitly marked not applicable.
- Candidate source/rejection log is retained outside the scoring view.
- Known material counterevidence is represented.
- Research stops only after the protocol saturation rule is met.
- Review grades/rankings/aggregate scores are masked from both scoring views.
- Time-dependent criteria follow their dated retrospective-evidence rules exactly.

---

## 9. Paired scoring, measurement and adjudication

### 9.1 Paired scoring

For each frozen packet:

1. execute one primary closed-corpus scoring call;
2. execute one independent audit call with byte-identical semantic inputs/configuration;
3. validate each raw output structurally before comparing it;
4. calculate pre-adjudication differences before any editorial reconciliation;
5. preserve primary and audit output immutably.

A validation retry/repair never silently replaces a run. Every retry, validation failure and human-supplied correction is logged. A correction that changes semantic scoring content invalidates the measured pair and requires a fresh independent call rather than being counted as original agreement.

### 9.2 Difference classes

Use Protocol §11 exactly:

- exact numeric match, or both Unknown with identical nonempty missing-class set;
- adjacent numeric disagreement = 0.5;
- material = >=1.0, numeric vs Unknown, or differing Unknown missing-class sets.

Measure claim inclusion/mapping/disposition and confidence agreement separately as required.

### 9.3 Development adjudication/change control

D1–D6 may expose repeated protocol/mapping/anchor ambiguity. Record issues without opportunistically changing the rule mid-pass. A material candidate-protocol/prompt/schema change is versioned, and affected development games are rerun under the new candidate before candidate freeze. Preserve old runs; do not overwrite them.

### 9.4 Holdout adjudication

For H1–H4, calculate all acceptance metrics across the 160 paired subcriterion decisions **before** Tomas sees/uses adjudication to finalize values. Owner adjudication can create the accountable final record but never improve the reliability metrics.

---

## 10. Acceptance gates

The untouched holdout passes only if all current Protocol §11.4 gates pass:

- >=90% numeric decisions in each pass overall;
- >=36/40 numeric decisions for every game in each pass, with no dimension containing >1 Unknown;
- >=70% exact subcriterion agreement;
- >=95% exact-or-adjacent agreement;
- <=5% material disagreement overall;
- >=90% exact-or-adjacent agreement within every dimension;
- >=80% exact confidence-label agreement;
- no material endpoint disagreement;
- 100% numeric final values traceable to evidence + anchor;
- 100% Unknowns with evidence-linked insufficiency rationales;
- 100% deterministic derivation parity;
- no scope/platform/patch mismatch;
- no fabricated/unverifiable source;
- all disagreements adjudicated and retained.

Any gate failure returns the protocol to development. Any later material anchor/mapping/confidence/prompt change requires a genuinely new untouched holdout set.

---

## 11. Timing / effort preregistration

Calibration must measure feasibility separately from provider waiting time.

For each game record at minimum:

- research-pass wall-clock elapsed time;
- research **active** orchestration/QA time;
- primary API request elapsed time;
- primary active QA/validation time;
- audit API request elapsed time;
- audit active QA/validation time;
- adjudication active owner/editor time;
- external/provider/tool waiting time separately where measurable;
- retries/repairs and why.

Do not report provider waiting as editorial working effort. These measures feed the final Phase 3A decision on whether production profiles keep the full calibration-grade record or a reduced-but-auditable form.

---

## 12. Gates and unresolved items

### BLOCKING BEFORE D1

- [ ] **Protocol text incorporation:** physically amend `Game_Profile_Scoring_Protocol_v1.0_DRAFT.md` so ADR 0035's maturity semantics replace the obsolete fixed twelve-month sentence; add the amendment to the draft changelog. The preregistration may not freeze a knowingly contradictory effective protocol bundle.
- [ ] **Owner scope/DLC decisions:** resolve the `OWNER GATE` rows in §5.
- [ ] **Execution-harness proof:** Item 4 must prove the OpenAI API harness can call `gpt-5.6-sol` at `reasoning.effort=high`, return the expected model identity, run scoring with no tools/shared state, produce strict structured output or a deterministic validated equivalent, capture required manifest fields, and keep the paired semantic inputs byte-identical.
- [ ] **Digest proof:** compute and record SHA-256 of the exact controlled system instructions, research/scoring prompts, Rubric, effective Protocol, and package schema from the freeze commit. Git blob SHAs/commit IDs are additional provenance but do not substitute for the package's SHA-256 fields.
- [ ] **Semantic-validator readiness:** Item 4 must confirm the validator enforces the current package/protocol contract before a run can be accepted.
- [ ] **Owner approval:** Tomas explicitly approves the final preregistration after the above items are closed.

### REQUIRED AFTER D1–D6 / BEFORE HOLDOUT RESEARCH

- [ ] analyze development ambiguity/reliability and rerun changed development cases as required;
- [ ] Tomas decides the proposed required-facet Rubric v1.1 lower-of-two amendment or directs reversion;
- [ ] freeze candidate Protocol, Rubric decision, prompts, schema, exact model/configuration and harness revision;
- [ ] record immutable freeze commit + SHA-256 digests;
- [ ] confirm H1–H4 remain untouched under §3;
- [ ] run the mandatory launch-window and pre-release rehearsals before candidate freeze/holdout only in the sequence approved by the master checklist; these do not enter the 6+4 statistics and any material change they cause must occur before holdout exposure.

### OTHER PHASE 3A GATES, NOT BLOCKERS TO D1 SCORING

- immutable scoring-package approval lifecycle decision before migration 4 / first import;
- full-vs-reduced production-record decision at final approval using measured effort;
- IGDB staging readiness is separate Item 5 and cannot auto-change editorial scores.

---

## 13. Newly released / pre-release validation outside the 6+4 statistics

The mature ten-game statistical corpus does not by itself validate the product's highest-intent use case.

After development scoring and before candidate freeze, Phase 3A also runs:

1. **Launch-window rehearsal:** a just-released title with moving launch evidence, provisionally The Blood of Dawnwalker if still suitable at execution time.
2. **Pre-release estimation rehearsal:** the most decision-relevant upcoming game with sufficient showcased/hands-on/review-code evidence at execution time.

These apply the existing SOP pre-release model: evidence-bounded exact estimates, ranges or Unknown; never unsupported speculative scoring from studio reputation, trailers, hype or genre assumptions. Preserve pre-release history and reassess fresh after launch.

They do not count toward Appendix B's 160 holdout decisions. A material protocol defect discovered here must be resolved before holdout exposure.

---

## 14. Checklist state

1. Baseline and source audit — **COMPLETED**
2. Cohort reconciliation — **COMPLETED**
3. Preregistration — **IN PROGRESS / THIS DOCUMENT**
4. Phase 3A engineering readiness — **PENDING; supplies D1 execution-harness/validator proof**
5. IGDB staging readiness — PENDING
6. Development run games 1–6 — PENDING
7. Development calibration analysis + launch-window/pre-release rehearsals — PENDING
8. Candidate freeze — PENDING
9. Untouched holdout run games 1–4 — PENDING
10. Acceptance report — PENDING
11. Publication preparation — PENDING
12. Deferred product follow-up / Compare parity — PENDING

Item 3 is not complete until every `BLOCKING BEFORE D1` checkbox is closed and Tomas approves the frozen record.
