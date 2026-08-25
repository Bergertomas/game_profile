# ADR 0024 — Scoring Protocol v1.0: declared supersessions and the package import contract

**Status:** Proposed · 2026-08-25 · pending the Appendix B calibration program
and Tomas's approval of Protocol v1.0. Nothing here governs until then.
**Context:** `docs/Game_Profile_Scoring_Protocol_v1.0_DRAFT.md` and
`docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json`; Rubric v1.0
§18; Evidence SOP v0.2 §3, §5; ADRs 0005, 0006, 0009; Master Plan v0.8 §0.3–0.4,
§3.5–3.6; the repository review of `25b85fe`.

## Problem

The candidate scoring protocol operationalizes Rubric v1.0, but four of its
rules change text that other documents own, and its §15 package contract cannot
populate the relational contract the importer must write into. AGENTS.md and
Master Plan §0.4 forbid resolving either kind of conflict silently or by
convenience. This ADR is the register: each supersession named, each migration
listed, so that approval of the protocol is also an explicit approval of these.

## Proposed decisions

### 1. Confidence conditions become recorded facts (supersedes SOP v0.2 §5, in part)

Protocol §10.1 derives the subcriterion label from three closed facts
(`coverage_state`, `conflict_state`, `stability_state`). SOP §5's qualitative
High/Medium/Low descriptions are replaced by that derivation, and its listing of
"recent release" as a Medium condition is reversed: recency matters only
through an actual coverage or stability limitation. On approval, the SOP is
amended (v0.3) to match.

### 2. Dimension and overall confidence become derived (supersedes ADR 0006 §1)

ADR 0006 §1 decided "per-dimension confidence is stored, not derived" because
confidence was an editorial input. Under the protocol the editorial input is
the recorded facts; the label is arithmetic over them (§10.2–10.3), and the
importer recomputes rather than trusts imported labels. What ADR 0006 §1 was
protecting — that a label is somebody's accountable judgment, not a number's
shadow — survives in the facts, which are attested per decision.
`dimension_assessments` remains the storage location for the derived label and
its editorial note until the data contract is amended.

### 3. The source-target supersession is restated on a corrected reading

The draft originally described SOP §3 as a "generic five-to-eight-source
target" being raised. SOP §3's 5–8 is substantive critic reviews *within* a
larger pack — ADR 0006 §3 reads the same section as "the 8–15 individual
records SOP §3 targets". Protocol §4.1 restates that demand in a stricter unit
(independent A/B evidentiary clusters, Tier C excluded from the floor): eight
to ten clusters normal, five a genuine-scarcity floor. A comparable overall
demand under a stricter counting rule, not the raising of a weaker one. The SOP
amendment on approval carries the cluster vocabulary.

### 4. The required-facet minimum is a proposed Rubric v1.1 amendment

Protocol §6.1 derives six criteria (`narrative_momentum`, `failure_fairness`,
`capability_balance`, `session_rhythm`, `theme_character_integration`,
`mechanics_meaning`) from the lower of two required facets. That changes how
those criteria are calculated, and Rubric §18 classes calculation changes as
breaking. The rule therefore travels with this ADR as a proposed Rubric v1.1
amendment. The protocol is deliberately conditional here and cannot become
governing in this state; approval resolves it down exactly one of two paths:

- **Approve Rubric v1.1.** The amendment is authored as a rubric minor version
  under Rubric §18, and every `rubric_version` constant moves with it — the
  protocol header, the package schema's three `"1.0"` consts, the run
  manifests, and the `rubric_versions` registry row the evaluations reference.
- **Reject the calculation change.** §6.1's parent-from-lower-facet sentence
  reverts to ordinary whole-criterion anchor selection. The facet *records*
  stay — they are protocol-owned evidence structure, and the schema's facet
  pairing enforcement is unaffected — but no arithmetic derives the parent
  from them.

The six criteria span five of the eight dimensions, so the Appendix B
development games must check the rule's aggregate effect against the approved
calibration corpus for systematic deflation before the holdout runs — evidence
for exactly this choice.

### 5. The published corpus is grandfathered

The three published calibration profiles (and anything else published before
the protocol governs) keep their recorded provenance. Their approved totals —
including the twenty subcriterion values at `2` inside the four 10.0 dimension
totals — are not retroactively re-gated under §9 or re-evidenced under §6
Step 2. The protocol reaches them prospectively, through §14, at their next
revision. Protocol §16 states the same rule; this ADR is where it is decided.

### 6. Migrations and mappings required before the first import

Protocol §15.2 is the normative field mapping. It depends on:

1. **`documented_gameplay`** — an additive value on the `source_category`
   enum. Until applied, the importer rejects packages using the class rather
   than mislabelling them.
2. **Evaluation-local evidence tier** — protocol §4.4 makes tier a property of
   the source's use in one evaluation; `evidence_sources.evidence_tier` is
   global and frozen once a final evaluation cites the source (ADR 0009 §2).
   The tier column moves to `evaluation_evidence_links`. Until then, a reused
   source whose local tier differs imports as a new source identity — ugly,
   honest, and exactly what ADR 0009 prescribes for changed source metadata.
3. **Rule-derived columns** — `evidence_status` from release state, stability
   and derived confidence; `evidence_maturity` from `release_state` plus the
   package's `pre_release_playable_basis` (`hands_on`/`review_code`);
   `score_provenance = editorial` for an approved package (owner approval is
   the editorial sign-off) and `derived` plus a mandatory note for a draft
   imported before approval; confidence labels lowercased and recomputed.

4. **The package itself** — protocol §15 requires the database to store the
   complete approved package for audit, and §14 resolves reassessment
   baselines by `baseline_package_digest`; neither has a home today. A
   `scoring_packages` table: `content_digest` text primary key (the RFC 8785
   SHA-256, giving baseline resolution and uniqueness in one), the whole
   document as `jsonb`, `package_id`, schema/protocol/rubric versions,
   approval actor and UTC time, and a nullable `baseline_package_digest`
   self-reference with ON DELETE RESTRICT so a baseline cannot be deleted out
   from under its successor (the same posture as `supersedes_evaluation_id`,
   ADR 0009). Rows are immutable once written — corrections are a new digest,
   exactly as `owner_approval` already requires. `evaluations` gains a
   nullable `scoring_package_digest` reference to it, set by the importer on
   the draft it creates. Run manifests, claim ledgers, endpoint gates,
   confidence facts, approval binding and baselines are thereby durable
   without the opaque document becoming a second relational source of truth.

No migration here changes public meaning; all four are additive or relocations.

### 7. The endpoint gate is recorded structure

§9's gate acquires a per-decision `endpoint_gate` record (scope-spanning
claims, calibration reference or its absence, intent/genre check), mandatory
adjacent anchor rejections at endpoints, and validator enforcement — including
recomputing from the difference and override records that every endpoint final
value stood through blind exact agreement or a documented owner adjudication.
No subcriterion-level calibration references exist yet (ADR 0005 left their
publication open); the reference clause binds prospectively once Appendix B
produces them.

### 8. Calibration validity under undisclosed decoding parameters

Protocol §2.3 excludes `snapshot_unavailable` runs from the reliability gate
but lets a `parameter_unavailable` pair count, because provider-default
sampling is stochastic and the initially named scoring editor exposes neither
seed nor decoding controls. That is a consciously weaker claim: two such
passes are independent samples, but their configurations cannot be *proven*
identical, so same-snapshot repeatability becomes provider-dependent to that
extent. Approving the protocol accepts this explicitly; the calibration report
must state which pairs ran under it. The alternative — requiring exposed
seeds for all calibration pairs — is stronger and is the standard to move to
if a scoring path with exposed decoding controls becomes the primary editor.

## Consequences

- Approval of Protocol v1.0 approves this register; a rejected entry sends the
  protocol back to development rather than being quietly dropped.
- On approval: SOP v0.2 → v0.3 (source-target vocabulary, confidence facts),
  and the Rubric v1.1 decision of §4 above is made explicitly, down one of
  its two named paths.
- The migrations of §6 above land before the first package import; the §15.1
  checklist plus the JSON Schema remain the entire enforcement surface.
- Published snapshots are untouched throughout — §5 above and Master Plan
  §0.3's history rule are the same commitment.
