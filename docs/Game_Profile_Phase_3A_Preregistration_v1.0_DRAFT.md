# Game Profile — Phase 3A Preregistration v1.0 DRAFT

- **Product:** Should I Play?
- **Methodology:** Game Profile
- **Program:** Phase 3A — Candidate Scoring Protocol calibration
- **Date opened:** 2026-09-02
- **Status:** **FINAL ITEM 3 REVIEW — NOT AUTHORIZED TO SCORE**
- **Owner / final editorial authority:** Tomas
- **Designated scoring model:** OpenAI GPT-5.6 Sol, High reasoning
- **Repository:** `Bergertomas/game_profile`

## 0. Purpose and approval boundary

This document preregisters the Phase 3A calibration procedure before any candidate-protocol scoring begins. It converts Appendix B, the owner-approved cohort lock, ADR 0035, ADR 0036, the Evidence SOP and the current package contract into one durable execution specification.

The checklist boundary is deliberately non-circular:

- **Item 3 freezes the calibration contract:** games/order, scope/DLC choices, evidence/corpus policy, holdout isolation, designated model/configuration, controlled prompts/methodology/schema, measurement rules and acceptance gates.
- **Item 4 proves the implementation of that frozen contract:** API access/model identity, harness behavior, byte-identical paired inputs, strict output/schema handling, semantic validation, SHA-256 generation/verification, ledger/timing capture and failure behavior.
- **D1 remains blocked until both Item 3 and Item 4 pass.**

Therefore Item 4 is not a prerequisite for *completing Item 3*; it is a prerequisite for *starting D1*. This preserves the master checklist order without weakening any scoring gate.

Nothing in this draft authorizes D1 research/scoring merely because the file exists. Item 3 completes only after its §12.1 gates close, Tomas explicitly approves the final preregistration, and the approved record is merged to `main`. D1 then remains blocked on §12.2 / Item 4.

No calibration run imports or publishes production scores.

---

## 1. Authority and effective methodology

Execution uses the repository state frozen by the approved preregistration merge commit. Subject-specific authority remains unchanged:

- `docs/Game_Profile_Scoring_Rubric_v1.0.md` owns dimension/subcriterion meaning and the 0–2 half-step scale.
- `docs/Game_Profile_Editorial_Evidence_and_Data_Sourcing_SOP_v0.2.md` owns evidence operations and the pre-release workflow where not explicitly superseded.
- `docs/Game_Profile_Scoring_Protocol_v1.0_DRAFT.md` owns the candidate evidence-to-number procedure under calibration; it remains non-governing until Appendix B passes and Tomas gives final adoption approval.
- `docs/decisions/0035-released-game-maturity-is-evidence-and-stability-based.md` owns the corrected released-game maturity semantics; those semantics are physically incorporated into the candidate protocol on this preregistration branch.
- `docs/decisions/0036-phase3a-measured-scoring-execution-surface.md` owns the accepted measured GPT execution surface for this calibration.
- `docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json` plus the protocol's semantic-validator checklist own the structured package contract.
- `docs/Game_Profile_Phase_3A_Cohort_Lock_2026-09-02.md` owns the ten selected game identities/high-level scopes.
- Tomas owns final methodology/editorial decisions.

### Effective maturity semantics

Appendix B's mature-game gate remains. A released scope is `mature` when an explicit evidence/stability maturity review establishes that the evaluated product is sufficiently settled and understood for reliable current-state scoring. There is no minimum release age. Twelve months is a mandatory backstop review for scopes still `newly_released`, not a waiting period or automatic promotion. Age-sensitive subcriterion evidence rules remain independent.

### Required-facet candidate behavior during development

The six development games test the candidate protocol's required-facet lower-of-two rule exactly as currently written. Facet records and parent values are retained for analysis. This does **not** make Rubric v1.1 governing. After D1–D6, Tomas must approve the required-facet Rubric v1.1 amendment or direct reversion before holdout exposure; that is a separate Phase 3A gate.

---

## 2. Locked cohort, order and exact statistical scopes

No title substitution or scope expansion occurs without Tomas's explicit approval and a revised durable record.

### Development — execute sequentially

1. **D1 — Alan Wake 2** — current patched standard first-playthrough base main campaign; `The Final Draft` / New Game Plus is excluded as a separate replay scope, and `Night Springs` and `The Lake House` are excluded as separate expansion scopes.
2. **D2 — Battlefield 6** — core Multiplayer, current state at evidence cutoff, including permanent/current seasonal content that belongs to core Multiplayer; Campaign, Portal, REDSEC and other materially distinct modes excluded.
3. **D3 — The Legend of Zelda: Tears of the Kingdom — Nintendo Switch 2 Edition** — Switch 2 Edition base adventure/current edition state.
4. **D4 — Banishers: Ghosts of New Eden** — current patched main game.
5. **D5 — Senua's Saga: Hellblade II Enhanced** — Enhanced main campaign and Enhanced changes applicable to it; Dark Rot challenge mode excluded.
6. **D6 — Saros** — current main game across PS5 and PS5 Pro technical variants, with platform-specific technical handling where material; later materially distinct expansions/modes excluded unless separately approved.

### Untouched holdout — expose only after candidate freeze

1. **H1 — Resident Evil 4 Remake** — current patched Leon main campaign; `Separate Ways` and Mercenaries excluded.
2. **H2 — Kingdom Come: Deliverance II** — current patched base main game; `Brushes with Death`, `Legacy of the Forge`, `Mysteria Ecclesiae` and other Expansion Pass/story DLC excluded.
3. **H3 — Astro Bot** — main campaign/current base-game path; permanent free post-launch challenge/downloadable levels excluded from this statistical scope.
4. **H4 — Immortals of Aveum** — current patched base campaign; NG+ and post-campaign Echollector/endgame objectives excluded as optional/endgame scope for this calibration.

The identity of the holdouts is not secret from Tomas or the repository. `Untouched` means that before candidate freeze they receive **no protocol scoring, no expected-score analysis, no rehearsal, no evidence packet and no use as development feedback**.

---

## 3. Holdout isolation and context hygiene

### 3.1 Development protection

During D1–D6:

- development research/scoring inputs must not contain the cohort-lock file's holdout section, holdout-specific preregistration analysis, expected holdout outcomes or prior Game Profile decisions for a holdout;
- no holdout evidence collection occurs;
- no holdout title is used as an anchor/example to tune protocol wording;
- no predicted holdout score/profile is produced;
- historical public/repository content about a holdout is never supplied to a scoring context unless it later enters that holdout's own frozen evidence corpus under the same source rules.

Engineering may know the holdout identities in order to enforce isolation. A development scoring/research context may not receive them as calibration material.

### 3.2 Research/scoring separation for every game

Each game uses three isolated executions:

1. **Research collection pass** — constructs candidate log, source manifest, coverage frames and frozen corpus. It never scores.
2. **Primary scoring pass** — stateless closed-corpus call; independently reconstructs claims/mappings/decisions.
3. **Audit scoring pass** — separate stateless closed-corpus call with byte-identical semantic inputs/configuration; it cannot see primary output.

The research context ends before scoring. Neither scoring pass receives the candidate/rejection log, research commentary, prior profile decisions, another pass, owner expectations, open-web access or external review grades.

### 3.3 Holdout exposure

After D1–D6, development analysis and the required launch/pre-release rehearsals, the candidate protocol/rubric decision/prompts/schema/model/configuration are frozen. **Only then** may H1 research begin. This is stronger than merely freezing before holdout scoring and makes holdout evidence itself unavailable as development feedback.

Once H1 research begins, any material anchor/mapping/confidence/prompt/schema change invalidates H1–H4 as untouched acceptance evidence. The program returns to development and requires a genuinely new holdout set under Appendix B.

---

## 4. Model/execution freeze

### 4.1 Accepted measured execution surface

ADR 0036 is owner-approved for Phase 3A calibration.

- **Provider:** OpenAI
- **Model ID:** `gpt-5.6-sol` — do not substitute moving alias `gpt-5.6`
- **Reasoning effort:** `high`
- **Reasoning mode:** standard, not Pro
- **API:** Responses API unless Item 4 demonstrates a contract incompatibility that requires a new owner-approved preregistration amendment
- **State:** stateless; no conversation/previous-response linkage
- **Store:** false where supported by the selected API/account contract
- **Scoring tools/network:** none
- **Research tools:** web search only as explicitly configured by the research harness; deterministic local capture/hash tooling may run outside the model
- **Seed:** `parameter_unavailable` when the selected endpoint exposes no seed; never fabricate one
- **Paired configuration:** every exposed model/decoding parameter is explicitly recorded and byte-identical across paired scoring calls except a seed when one is exposed; exposed seeds must differ

The harness must verify returned model identity before a run counts. If the provider cannot satisfy the preregistered identifier/configuration, stop rather than silently falling back to ChatGPT UI, another model, Pro mode or an engineering agent.

### 4.2 Controlled instruction set

The measured system hashes and supplies exact repository bytes for:

- `docs/scoring/Phase_3A_Execution_System_Instructions_v1.0.md`
- `docs/scoring/Phase_3A_Research_Prompt_v1.0.md`
- `docs/scoring/Phase_3A_Scoring_Prompt_v1.0.md`
- `docs/Game_Profile_Scoring_Rubric_v1.0.md`
- `docs/Game_Profile_Scoring_Protocol_v1.0_DRAFT.md`
- `docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json`

The wrapper assigns `primary` or `audit` as run metadata after model output; role metadata does not alter paired semantic inputs.

The owner-approved preregistration merge commit is the byte-level source of truth. Git commit/blob identifiers freeze which bytes are approved. Item 4 must additionally compute/verify the protocol-required lowercase SHA-256 values from those exact bytes before D1; SHA-256 generation is an implementation proof, not a reason to make Item 3 depend on Item 4.

### 4.3 Engineering agents do not score

Codex/Claude may implement and run the deterministic harness, capture outputs, compute digests, validate schema/semantics, measure timing and assemble the ledger. They may not alter model output because they disagree with a score, choose an anchor, reconcile paired results or write owner adjudication. A structural failure may trigger a logged new run only under the frozen retry rules; semantic repair is never silently inserted.

---

## 5. Owner-approved scope and DLC/content freeze

Tomas approved the recommended Phase 3A scope/execution choices on 2026-09-02. The table below is therefore frozen for this preregistration rather than a remaining owner gate.

| Game | Included statistical scope | Excluded / separate scope | State |
|---|---|---|---|
| D1 Alan Wake 2 | Current patched standard first-playthrough base main campaign, including free Anniversary/QoL updates applicable to it | `The Final Draft` / New Game Plus; `Night Springs`; `The Lake House` | **OWNER-CLARIFIED 2026-09-04** |
| D2 Battlefield 6 | Core current Multiplayer and permanent/current seasonal core-MP content at corpus cutoff | Campaign; Portal; REDSEC; other materially distinct modes | **OWNER-APPROVED 2026-09-02** |
| D3 Zelda: Tears of the Kingdom Switch 2 Edition | Switch 2 Edition base adventure + edition-level technical/features state | No separate story DLC in this scope; optional companion assistance does not redefine base scope | **OWNER-APPROVED 2026-09-02** |
| D4 Banishers | Current patched main game | Any later materially distinct expansion/content | **OWNER-APPROVED 2026-09-02** |
| D5 Hellblade II Enhanced | Enhanced main campaign + free Enhanced changes applicable to that campaign | Distinct Dark Rot challenge mode | **OWNER-APPROVED 2026-09-02** |
| D6 Saros | Current main game; PS5 + PS5 Pro technical variants with platform-specific technical handling when material | Any later materially distinct expansion/mode | **OWNER-APPROVED 2026-09-02** |
| H1 Resident Evil 4 Remake | Current patched Leon main campaign | `Separate Ways`; Mercenaries | **OWNER-APPROVED 2026-09-02** |
| H2 Kingdom Come: Deliverance II | Current patched base main game | `Brushes with Death`; `Legacy of the Forge`; `Mysteria Ecclesiae`; other Expansion Pass/story DLC | **OWNER-APPROVED 2026-09-02** |
| H3 Astro Bot | Main campaign/current base-game path | Permanent free post-launch challenge/downloadable levels | **OWNER-APPROVED 2026-09-02** |
| H4 Immortals of Aveum | Current patched base campaign | NG+; post-campaign Echollector/endgame objectives | **OWNER-APPROVED 2026-09-02** |

Free patches, bug fixes, accessibility additions, platform updates and balance changes that affect an included scope are part of the current-state evaluation even when optional expansion/mode content is excluded.

If an excluded expansion changes the base campaign through shared systems/patches, research may establish the resulting base-build state but may not silently score the separate expansion content itself.

Major DLC remains eligible for a distinct nested public subpage later; exclusion here is a calibration-scope decision, not a product claim that the DLC is unimportant.

### 5.1 D1 replay-scope clarification — owner-approved 2026-09-04

After measured D1 research attempt 1 identified that “current patched base main campaign” did not explicitly classify `The Final Draft` / New Game Plus, Tomas resolved the ambiguity by excluding it from D1's statistical scope and authorized a fresh research attempt. D1 evaluates the standard first-playthrough campaign as currently patched. Shared bug fixes, accessibility changes and QoL changes that affect that campaign remain included; alternate scenes, manuscript material and narrative closure exclusive to `The Final Draft` do not support D1 scores.

This is a scope clarification, not an expansion or a methodology change. `The Final Draft` is a materially distinct replay mode that requires campaign completion, so treating it separately follows Protocol §3's mode rule and is consistent with H4's explicit New Game Plus exclusion. The six controlled scoring inputs and their lock-set digest are unchanged. Attempt 1 remains immutable refusal evidence; the authorized fresh call is research attempt 2 and must receive only the clarified scope.

---

## 6. Per-game scope and maturity freeze

Before research starts for a game, create an immutable scope record containing every Protocol §3 field:

- canonical title/slug;
- edition and profile scope key;
- included mode(s) and platform(s);
- exact build/current-state cutoff description;
- release state and pre-release basis where applicable;
- evidence status and evaluation maturity;
- public release date;
- evidence cutoff rule;
- direct-play record;
- known exclusions;
- profile stability state;
- global scope state.

### 6.1 Released-game maturity record

The owner-approved cohort is preregistered as the ten **mature** games required by Appendix B. The baseline eligibility classification is:

| Run | Preregistered maturity | Qualification note |
|---|---|---|
| D1 Alan Wake 2 | `mature` | Established released base-campaign scope; current-state patching does not create an identified profile-shaping transformation. |
| D2 Battlefield 6 Multiplayer | `mature` | Explicit owner decision in ADR 0035; detailed determination in §6.2. |
| D3 Zelda TOTK Switch 2 Edition | `mature` | Released edition with bounded edition-level technical/features scope. |
| D4 Banishers | `mature` | Established released main-game scope; no preregistered active transformation. |
| D5 Hellblade II Enhanced | `mature` | Released Enhanced campaign scope; Dark Rot separated from the statistical scope. |
| D6 Saros | `mature` | Evidence/stability review under ADR 0035; detailed determination in §6.3. |
| H1 Resident Evil 4 Remake | `mature` | Established released Leon-campaign scope; DLC separated. |
| H2 Kingdom Come: Deliverance II | `mature` | Established released base-game scope; story DLC separated. |
| H3 Astro Bot | `mature` | Established released base campaign; post-launch challenge content separated. |
| H4 Immortals of Aveum | `mature` | Established released base campaign; optional endgame/NG+ separated. |

This table is an **eligibility/scope classification**, not holdout evidence collection or expected-score analysis. It relies on the already owner-approved cohort/scope selection and must not be used to tune scoring. Before research begins for any game, the immutable run scope still records/revalidates the ADR 0035 maturity facts at that game's evidence cutoff. If current-state facts invalidate mature eligibility, stop before corpus collection/scoring; do not silently change the classification or use the game as Appendix B evidence.

Every released development/holdout scope's run record includes review date, scope/build, evidence cutoff, settlement rationale, evidence-depth expectation, material known changes in flight and resulting stability state.

### 6.2 Battlefield 6 preregistered maturity determination

- **Scope:** Battlefield 6 — core Multiplayer, current state at corpus cutoff.
- **Review date:** 2026-09-02.
- **Evaluation maturity:** `mature`.
- **Preregistered stability expectation:** `bounded_change`, subject to the per-run current-state record.
- **Basis:** ADR 0035 already contains the owner's explicit mature classification. Ongoing seasons, maps, weapons, events, modes and ordinary gunplay/balance iteration are known parts of the product's evolution rather than, by themselves, evidence that core Multiplayer is epistemically immature. Current-state research must still represent material changes and platform variance at its cutoff.

### 6.3 Saros preregistered maturity determination

- **Scope:** Saros current main game, PS5 family.
- **Review date:** 2026-09-02.
- **Evaluation maturity:** `mature` for the Appendix B development corpus.
- **Preregistered stability expectation:** `stable`, downgraded at the per-run freeze if current evidence shows material active change.
- **Basis:** the game has been publicly released since 2026-04-30; the review environment is already deep and diverse enough to support the normal released-game evidence standard, with substantial post-launch full-game coverage and disagreement; PS5/PS5 Pro scope is well defined; no known imminent profile-shaping overhaul is part of the preregistered scope. This classification does not relax Memory Residue/Lasting Impact elapsed-evidence gates.

The per-run scope record must stop and reopen the maturity decision if the evidence cutoff reveals a material overhaul/remediation trajectory inconsistent with this preregistered determination.

---

## 7. Evidence cutoff and corpus-freeze policy

There is no single calendar cutoff for all ten games because runs are sequential and current-state evidence may evolve.

1. Each game's **evidence cutoff date** is the UTC calendar date of its corpus freeze.
2. `frozen_at` records the precise UTC timestamp.
3. The normalized packet contains only admitted evidence for the declared scope/current state discovered before `frozen_at`.
4. Exact patch/season/build/current-state interpretation is recorded in `build_cutoff`.
5. After freeze, neither scoring pass may browse or add evidence.
6. If a material omitted source/current-state change is discovered before adjudication, invalidate both pending scoring passes, update research, freeze a new packet and rerun both.
7. After an adjudicated development result closes, later evidence does not rewrite that run; a documented rerun occurs only when protocol/research change-control requires it.

Holdout corpus collection starts only after candidate freeze under §3.3.

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
- Candidate source/rejection log is retained outside scoring views.
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
3. validate each raw output structurally before comparison;
4. calculate pre-adjudication differences before editorial reconciliation;
5. preserve primary and audit outputs immutably.

A validation retry/repair never silently replaces a run. Every retry, validation failure and human-supplied correction is logged. A correction that changes semantic scoring content invalidates the measured pair and requires a fresh independent call rather than being counted as original agreement.

### 9.2 Difference classes

Use Protocol §11 exactly:

- exact numeric match, or both Unknown with identical nonempty missing-class sets;
- adjacent numeric disagreement = 0.5;
- material = >=1.0, numeric vs Unknown, or differing Unknown missing-class sets.

Measure claim inclusion/mapping/disposition and confidence agreement separately as required.

### 9.3 Development change control

D1–D6 may expose repeated protocol/mapping/anchor ambiguity. Record issues without opportunistically changing a rule mid-pair. A material candidate-protocol/prompt/schema change is versioned, and affected development games are rerun under the new candidate before candidate freeze. Preserve old runs.

### 9.4 Holdout adjudication

For H1–H4, calculate all acceptance metrics across the 160 paired subcriterion decisions **before** Tomas sees/uses adjudication to finalize values. Owner adjudication creates the accountable final record but never improves reliability metrics.

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

Calibration measures editorial feasibility separately from provider/tool waiting time. For each game record at minimum:

- research-pass wall-clock elapsed time;
- research **active** orchestration/QA time;
- primary API request elapsed time;
- primary active QA/validation time;
- audit API request elapsed time;
- audit active QA/validation time;
- adjudication active owner/editor time;
- external/provider/tool waiting time separately where measurable;
- retries/repairs and why.

Provider waiting is not editorial working effort. These measurements feed the final Phase 3A decision on full-versus-reduced production record retention.

---

## 12. Gates and change-control checkpoints

### 12.1 ITEM 3 — PREREGISTRATION CLOSE

- [x] **Protocol text incorporation:** ADR 0035 maturity semantics physically replace the obsolete fixed twelve-month rule in `Game_Profile_Scoring_Protocol_v1.0_DRAFT.md`; §§3/14 and the 2026-09-02 draft changelog are aligned.
- [x] **Cohort/order:** exact D1–D6 + H1–H4 identities/order frozen.
- [x] **Owner scope/DLC decisions:** all §5 rows owner-approved on 2026-09-02.
- [x] **Measured execution decision:** ADR 0036 owner-approved on 2026-09-02.
- [x] **Holdout isolation:** §3 frozen.
- [x] **Evidence/corpus policy:** §§7–8 frozen.
- [x] **Acceptance/timing policy:** §§9–11 frozen.
- [x] **Mature-corpus eligibility:** all ten statistical scopes preregistered as `mature`; BF6 is owner-accepted under ADR 0035; Saros determination is in §6.3 and is included in the final owner-approval gate below.
- [x] **Controlled-byte provenance:** all six controlled inputs have final-review Git blob identifiers recorded in §15.
- [ ] **Final owner approval:** Tomas explicitly approves this completed Item 3 record, including the Saros maturity determination.
- [ ] **Merge:** approved preregistration/ADR/prompt/protocol/bootstrap set is merged to `main`.

Item 3 completes at that merge. **The merge does not authorize D1 by itself.**

### 12.2 ITEM 4 — ENGINEERING READINESS; BLOCKING BEFORE D1

Item 4 must prove, against the Item 3-approved bytes:

- [ ] configured OpenAI access can call `gpt-5.6-sol` with `reasoning.effort=high` and the returned model identity satisfies ADR 0036;
- [ ] scoring calls are stateless, tool/network-free and share no prior-response context;
- [ ] paired primary/audit semantic inputs and exposed configuration are byte-identical except an exposed differing seed;
- [ ] structured output is accepted strictly against the canonical package/scoring-pass contract or an explicitly equivalent deterministic validated representation;
- [ ] the semantic validator enforces the protocol/schema contract and fails closed;
- [ ] SHA-256 is computed and verified over the exact approved controlled bytes and recorded in run manifests; Git SHA is provenance, not a substitute;
- [ ] run ledger/timing/retry/validation-failure capture works;
- [ ] a failed model/config/schema/digest check blocks the run rather than silently repairing/substituting;
- [ ] API credential handling, spend controls and fixtures do not expose secrets.

If Item 4 cannot prove those points, D1 does not begin; the checklist returns to the relevant methodology/engineering step.

### 12.3 REQUIRED AFTER D1–D6 / BEFORE HOLDOUT EXPOSURE

- [ ] analyze development ambiguity/reliability and rerun changed development cases as required;
- [ ] Tomas decides the proposed required-facet Rubric v1.1 lower-of-two amendment or directs reversion;
- [ ] run the mandatory launch-window and pre-release rehearsals in §13;
- [ ] resolve any material defect exposed by development/rehearsals and rerun affected development cases;
- [ ] freeze candidate Protocol, Rubric decision, prompts, schema, exact model/configuration and harness revision;
- [ ] record immutable candidate-freeze commit + SHA-256 digests;
- [ ] confirm H1–H4 remain untouched under §3.

### 12.4 OTHER PHASE 3A GATES, NOT ITEM 3 OR D1 BLOCKERS

- immutable scoring-package approval lifecycle decision before migration 4 / first import;
- full-vs-reduced production-record decision at final protocol approval using measured effort;
- IGDB staging readiness is separate Item 5 and may create metadata/editorial-review signals but may not auto-change scores.

---

## 13. Newly released / pre-release validation outside the 6+4 statistics

The mature ten-game statistical corpus does not by itself validate the product's highest-intent release-window use case.

After development scoring and before candidate freeze, Phase 3A runs:

1. **Launch-window rehearsal:** a just-released title with moving launch evidence, provisionally The Blood of Dawnwalker if suitable at execution time.
2. **Pre-release estimation rehearsal:** the most decision-relevant upcoming game with sufficient `SHOWCASED`, `HANDS-ON` or `REVIEW-CODE` evidence at execution time.

These use the Evidence SOP's pre-release model: evidence-bounded exact estimates, ranges or Unknown; never unsupported speculative scoring from studio reputation, trailers, hype or genre assumptions. Preserve pre-release history and reassess fresh after launch.

They do not count toward Appendix B's 160 holdout decisions. Any material protocol defect discovered here must be resolved before holdout exposure.

---

## 14. Master checklist state

1. Baseline and source audit — **COMPLETED**
2. Cohort reconciliation — **COMPLETED**
3. Preregistration — **IN PROGRESS / FINAL OWNER APPROVAL PENDING**
4. Phase 3A engineering readiness — **PENDING; starts only after Item 3 merge and blocks D1**
5. IGDB staging readiness — PENDING
6. Development run games 1–6 — PENDING
7. Development calibration analysis + launch-window/pre-release rehearsals — PENDING
8. Candidate freeze — PENDING
9. Untouched holdout run games 1–4 — PENDING
10. Acceptance report — PENDING
11. Publication preparation — PENDING
12. Deferred product follow-up / Compare parity — PENDING

Do not advance Item 3 to complete until Tomas gives the §12.1 final approval and the approved record is merged to `main`.

---

## 15. Controlled-input provenance table

The exact approved merge commit will be the authoritative byte freeze. These Git blob identifiers name the final-review bytes. Item 4 derives and verifies protocol-required SHA-256 from these exact bytes before D1.

### 15.1 Item 3 final-review identities (2026-09-02)

| Controlled input | Version | Git blob SHA at final Item 3 review | SHA-256 |
|---|---|---|---|
| `docs/scoring/Phase_3A_Execution_System_Instructions_v1.0.md` | 1.0 | `caa241d45f3c6619ae7b139cd0e135a8168ee009` | `476168dd797fdeacb912228eac3e22fb07421d9c78187a1ba4c1904e248ad738` |
| `docs/scoring/Phase_3A_Research_Prompt_v1.0.md` | 1.0 | `401920703c9d3e8577641c3616e9c7d39bbd71a0` | `fb7028c1a54c88807bcbf3fe01d6ce0fd9b62e8808d36a8b93625d7277bb2d68` |
| `docs/scoring/Phase_3A_Scoring_Prompt_v1.0.md` | 1.0 | `64ae778e1d93d9f9b0c7faa7902a447154a0bc89` | `af3b2d76810dfc8030a2af8fe1db16db69ca3d1647a2833b4f450e10a62a8021` |
| `docs/Game_Profile_Scoring_Rubric_v1.0.md` | 1.0 | `93524fd398099423e31f8b7f88c0efd7886c7b66` | `57fde417225cb641a12d7b7dbca7b4d1be0ba2fb353c17f1f6397ff6435fbeb8` |
| `docs/Game_Profile_Scoring_Protocol_v1.0_DRAFT.md` | candidate 1.0 | `1fa2707421518396c6c68ca26d36c5d98df92e7b` | `da88505c53d601b0d2cc8052bd34325bcea259b22de656be637439508a66d16b` |
| `docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json` | 1.0 draft | `9cee78be1b70e463e67b1dbea51678039269918b` | `ad67da7eb44fd3907a791d491e05e2c34cbe22d3c9f1642913d3798f1b285f33` |

The SHA-256 column was filled by the Item 4 harness (`npm run calib:lock`) over these exact bytes; the Git blob SHA remains provenance and is not a substitute for it.

### 15.2 Amendment 1 — machine-reproducible coverage state (issue #44, approved 2026-09-02)

Tomas approved the issue #44 amendment as revised by the orchestrator: `coverageUnit.omission_effect`; required `coverage_observed_unit_ids`/`coverage_missing_unit_ids` on `scoreDecision` and `platformOverride` forming a total partition of the frozen frame; deterministic coverage-state derivation; `optional_endgame` added to `missing_coverage_classes`, which stays Unknown-only. Coverage-state meanings, rubric anchors, cohort/scope, evidence rules, holdout rules and scoring authority are unchanged.

Four of the six controlled inputs changed. **These identities supersede §15.1 for those four; the other two keep their §15.1 identities.**

| Controlled input | Version | Git blob SHA after Amendment 1 | SHA-256 |
|---|---|---|---|
| `docs/scoring/Phase_3A_Execution_System_Instructions_v1.0.md` | 1.0 | `caa241d45f3c6619ae7b139cd0e135a8168ee009` (unchanged) | `476168dd797fdeacb912228eac3e22fb07421d9c78187a1ba4c1904e248ad738` |
| `docs/scoring/Phase_3A_Research_Prompt_v1.0.md` | 1.0 | `dcb5f2c580a447ac2565641342325dc33ed6092d` | `d4f7e11ba031b4d4b42b23bf58025e95495172b9bc6a5de0feb3e42363994502` |
| `docs/scoring/Phase_3A_Scoring_Prompt_v1.0.md` | 1.0 | `3d6da870cbf2c0d918c0b592d02a6cbfada9bc16` | `bc1e6f2d96b2ecd82b6519f2d3c605f2a2fcf79f1a76acc5a6631af1235cd940` |
| `docs/Game_Profile_Scoring_Rubric_v1.0.md` | 1.0 | `93524fd398099423e31f8b7f88c0efd7886c7b66` (unchanged) | `57fde417225cb641a12d7b7dbca7b4d1be0ba2fb353c17f1f6397ff6435fbeb8` |
| `docs/Game_Profile_Scoring_Protocol_v1.0_DRAFT.md` | candidate 1.0 | `1e678bb9d1ac68998fcc1826e2b5ac9f33778a11` | `2a40b102f22958442574a370495f4ca92791e67b3b6bd4c4814a7273f1c95ad5` |
| `docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json` | 1.0 draft | `2a766c042c085d67eb25f1cd7f6df5c45e693796` | `1c2c8aaa9807b87089d7a4b428e5378e7da1523e78837bcfd34f90cb7466a259` |

Harness lock-set digest over the Amendment 1 bytes: `62d90b14fcde14af639e0c51259b28b41b4e2ce2063398d91eb2244e9637c42c`. **Superseded by Amendment 2 (§15.3).**

### 15.3 Amendment 2 — carried-forward re-attestations derive coverage (issue #44, approved 2026-09-02)

Tomas approved extending Amendment 1 to `carriedForwardReattestation`, on the orchestrator's finding that `mergedDecisions` consumes a carried-forward `coverage_state` to re-derive confidence, which would leave the assertion-only path Amendment 1 removes open on exactly the keys a bounded reassessment does not rescore.

The re-attestation now carries required `coverage_observed_unit_ids` and `coverage_missing_unit_ids`, disjoint and together accounting for the whole of that criterion's **new** frozen frame, and its `coverage_state` derives from those missing units' frozen `omission_effect` exactly as §6.1 derives a decision's. Coverage-state meanings, rubric anchors, cohort/scope, evidence rules, holdout rules and scoring authority are unchanged.

**Two** controlled inputs changed — package schema and candidate protocol (§14). The research and scoring prompts were explicitly out of scope and keep their Amendment 1 identities; the rubric and execution system instructions keep their §15.1 identities. **Superseded by §15.4 for the protocol; every other identity below is still current.**

| Controlled input | Version | Git blob SHA after Amendment 2 | SHA-256 |
|---|---|---|---|
| `docs/scoring/Phase_3A_Execution_System_Instructions_v1.0.md` | 1.0 | `caa241d45f3c6619ae7b139cd0e135a8168ee009` (unchanged since §15.1) | `476168dd797fdeacb912228eac3e22fb07421d9c78187a1ba4c1904e248ad738` |
| `docs/scoring/Phase_3A_Research_Prompt_v1.0.md` | 1.0 | `dcb5f2c580a447ac2565641342325dc33ed6092d` (unchanged since §15.2) | `d4f7e11ba031b4d4b42b23bf58025e95495172b9bc6a5de0feb3e42363994502` |
| `docs/scoring/Phase_3A_Scoring_Prompt_v1.0.md` | 1.0 | `3d6da870cbf2c0d918c0b592d02a6cbfada9bc16` (unchanged since §15.2) | `bc1e6f2d96b2ecd82b6519f2d3c605f2a2fcf79f1a76acc5a6631af1235cd940` |
| `docs/Game_Profile_Scoring_Rubric_v1.0.md` | 1.0 | `93524fd398099423e31f8b7f88c0efd7886c7b66` (unchanged since §15.1) | `57fde417225cb641a12d7b7dbca7b4d1be0ba2fb353c17f1f6397ff6435fbeb8` |
| `docs/Game_Profile_Scoring_Protocol_v1.0_DRAFT.md` | candidate 1.0 | `c7ef89853d26d134f8e0fe1cc6a07aed3b5bc985` | `fcc5b7121442f9573cd434cd570065324cfcfcd86413bb8a4e0fab7792ae6f1d` |
| `docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json` | 1.0 draft | `8e49d552b08eeee2bdcb2fd240d77d48ddfbafc6` | `d7cbc199d7c8afa1ddbe6da64fa7d2eb51dec03cffcb43cc3219567650ee38ac` |

Harness lock-set digest over the Amendment 2 bytes: `284af531c7a9af28fa33af046ac2c4437f187e6b1e022e2cdc4df90cab0a0e1d` — **superseded by §15.4.**

### 15.4 Amendment 3 — final claim references go through reconciled claims (issue #44, approved 2026-09-02)

Tomas approved the orchestrator recommendation that adjudicated final decisions reference package-level reconciled claims while raw primary and audit claim IDs remain pass-local. The reason is a property of the design rather than a defect in it: the two scoring passes are role-blind runs over byte-identical input and cannot coordinate identifiers, so both may naturally emit the same raw claim ID. Resolving a final decision's evidence against a flat union of the two ledgers made that legitimate collision either ambiguous or silently mis-resolved. The `reconciledClaim` structure already keeps `primary_claim_ids` and `audit_claim_ids` apart, so the ledger a raw ID belongs to is named by the field holding it.

Protocol §11.3 now records the contract, §5.2 cross-references it and §15.1(4) names it as a validator obligation: a final decision's `claim_ids`, its `endpoint_gate` scope-spanning references and its platform overrides' `claim_ids` name a `reconciled_claim_id`, which resolves through the record into the pass ledgers; the reconciled record covers every claim a final decision rests on, including on blind exact agreement; and an unresolved, duplicated or claim-less reconciled reference, or a reconciled record naming a raw claim absent from the ledger it names, is rejected. No package-global uniqueness rule is imposed on raw claim IDs and no string-prefix convention is introduced. Scoring anchors, evidence semantics, coverage-state meanings, cohort/scope, blind-pass configuration and scoring authority are unchanged.

**Superseded by §15.5 for the protocol; every other identity below is still current.** **One** controlled input changed — the candidate protocol. The package schema needed no change: `reconciledClaim` already carries `reconciled_claim_id`, `primary_claim_ids` and `audit_claim_ids`, and a final decision's `claim_ids` items already have the same `$defs/id` type, so the approved contract is representable in the current structures. Its bytes are proven unchanged, not asserted: `git diff --name-only <Amendment 2 head> -- docs/scoring docs/Game_Profile_Scoring_Rubric_v1.0.md docs/schemas` returns empty. **These identities are the current freeze.**

| Controlled input | Version | Git blob SHA after Amendment 3 | SHA-256 |
|---|---|---|---|
| `docs/scoring/Phase_3A_Execution_System_Instructions_v1.0.md` | 1.0 | `caa241d45f3c6619ae7b139cd0e135a8168ee009` (unchanged since §15.1) | `476168dd797fdeacb912228eac3e22fb07421d9c78187a1ba4c1904e248ad738` |
| `docs/scoring/Phase_3A_Research_Prompt_v1.0.md` | 1.0 | `dcb5f2c580a447ac2565641342325dc33ed6092d` (unchanged since §15.2) | `d4f7e11ba031b4d4b42b23bf58025e95495172b9bc6a5de0feb3e42363994502` |
| `docs/scoring/Phase_3A_Scoring_Prompt_v1.0.md` | 1.0 | `3d6da870cbf2c0d918c0b592d02a6cbfada9bc16` (unchanged since §15.2) | `bc1e6f2d96b2ecd82b6519f2d3c605f2a2fcf79f1a76acc5a6631af1235cd940` |
| `docs/Game_Profile_Scoring_Rubric_v1.0.md` | 1.0 | `93524fd398099423e31f8b7f88c0efd7886c7b66` (unchanged since §15.1) | `57fde417225cb641a12d7b7dbca7b4d1be0ba2fb353c17f1f6397ff6435fbeb8` |
| `docs/Game_Profile_Scoring_Protocol_v1.0_DRAFT.md` | candidate 1.0 | `6184075aea584f7a7fcf89da5800b8bbf4f88ab7` | `dff413ddaf227496709272d0bb3e96b61d90dbb52e1500ae8e43b30a88aa6d89` |
| `docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json` | 1.0 draft | `8e49d552b08eeee2bdcb2fd240d77d48ddfbafc6` (unchanged since §15.3) | `d7cbc199d7c8afa1ddbe6da64fa7d2eb51dec03cffcb43cc3219567650ee38ac` |

Harness lock-set digest over the Amendment 3 bytes: `175df6ad60c28af9dcf41f8efdc6a89e23ddc6f02df0d58a95e1aecf65647bf3` — **superseded by §15.5.**

### 15.5 Amendment 4 — adjudication and owner-stage reference integrity (issue #44, approved 2026-09-02)

Tomas approved the bounded reference-integrity closure identified by the Gate-5 forensic pass on `484150f`. Amendment 3 named the reconciled namespace for adjudicated final decisions but stopped there, and the audit found the exceptions that left: owner-override evidence still resolved against a flat union of the two pass ledgers, final and final-platform-override `insufficiency_reference_ids` were not resolved at all, endpoint-gate references were checked for existence but not for criterion or disposition, pass-level platform-override claims were not criterion-mapped, the §4.4 Tier-D rule did not follow evidence through reconciliation, and a duplicate `reconciled_claim_id` was caught only if a decision happened to reference it.

Protocol §11.3 now states the closure and §15.1(4) names it. All adjudication- and owner-stage claim references name a `reconciled_claim_id`; `reconciled_claim_id` is package-unique whether or not it is referenced; disposition and admissibility decide what may satisfy a gate, so a scope-spanning §9 claim and the evidence under a numeric value or numeric owner override must reach a non-rejected claim mapped to the scored criterion, and §4.4's Tier-D bar follows evidence through reconciliation; platform-override claims are criterion-mapped in the passes and in the adjudicated set alike; and `insufficiency_reference_ids` names exactly one of four object kinds — a reconciled claim, a frozen candidate-source record, the scored criterion's own coverage frame, or a unit of that frame. Raw claim IDs remain pass-local and may collide across ledgers. This is reference integrity only: scoring anchors, evidence tiers, coverage meanings, cohort/scope, prompts, blind-pass configuration and scoring authority are unchanged.

**One** controlled input changed — the candidate protocol. The package schema again needed no change: the contract is expressible in the existing `$defs/id` fields and record structures. Its bytes are proven unchanged rather than asserted: `git diff --name-only <Amendment 3 head> -- docs/scoring docs/Game_Profile_Scoring_Rubric_v1.0.md docs/schemas` returns empty. **These identities are the current freeze.**

| Controlled input | Version | Git blob SHA after Amendment 4 | SHA-256 |
|---|---|---|---|
| `docs/scoring/Phase_3A_Execution_System_Instructions_v1.0.md` | 1.0 | `caa241d45f3c6619ae7b139cd0e135a8168ee009` (unchanged since §15.1) | `476168dd797fdeacb912228eac3e22fb07421d9c78187a1ba4c1904e248ad738` |
| `docs/scoring/Phase_3A_Research_Prompt_v1.0.md` | 1.0 | `dcb5f2c580a447ac2565641342325dc33ed6092d` (unchanged since §15.2) | `d4f7e11ba031b4d4b42b23bf58025e95495172b9bc6a5de0feb3e42363994502` |
| `docs/scoring/Phase_3A_Scoring_Prompt_v1.0.md` | 1.0 | `3d6da870cbf2c0d918c0b592d02a6cbfada9bc16` (unchanged since §15.2) | `bc1e6f2d96b2ecd82b6519f2d3c605f2a2fcf79f1a76acc5a6631af1235cd940` |
| `docs/Game_Profile_Scoring_Rubric_v1.0.md` | 1.0 | `93524fd398099423e31f8b7f88c0efd7886c7b66` (unchanged since §15.1) | `57fde417225cb641a12d7b7dbca7b4d1be0ba2fb353c17f1f6397ff6435fbeb8` |
| `docs/Game_Profile_Scoring_Protocol_v1.0_DRAFT.md` | candidate 1.0 | `3ebf7cc7636a08d5e2da0f077910d36f4421797a` | `2aeeac03f6adca9dbd457834b006fe12c536d90896b1748df96314e114ef14cf` |
| `docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json` | 1.0 draft | `8e49d552b08eeee2bdcb2fd240d77d48ddfbafc6` (unchanged since §15.3) | `d7cbc199d7c8afa1ddbe6da64fa7d2eb51dec03cffcb43cc3219567650ee38ac` |

Harness lock-set digest over the current bytes: `4d78ed79c02654972a96e02f0211282e0b4386ed9e93c16cf2de255375d7c2ce`.

Amendments 1 through 4 are pending exact-byte review: all four designs are owner-approved, and the resulting controlled bytes and provenance must be reviewed by ChatGPT/Tomas before the implementing pull request merges and before any downstream work relies on them.

Any byte change to a controlled input after final owner approval invalidates this Item 3 freeze until the preregistration is amended and re-approved.
