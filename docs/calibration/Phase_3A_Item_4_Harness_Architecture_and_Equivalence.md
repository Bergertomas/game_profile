# Phase 3A Item 4 — Calibration Harness Architecture and Structured-Output Equivalence

- **Date:** 2026-09-02
- **Status:** engineering record for the Item 4 implementation; **does not close Item 4 and does not authorize D1**
- **Work order:** `docs/work-orders/Phase_3A_Item_4_Calibration_Harness_Engineering_Work_Order_2026-09-02.md`
- **Baseline audit:** `docs/audits/Game_Profile_Phase_3A_Item_4_Engineering_Readiness_Audit_2026-09-02.md`
- **Implemented from `main` at:** `3ee61b1ff01179dd7d705585fb80bd3148ba8942`

This record describes what was built and why, and documents the scoring-pass
Structured Output equivalence the work order §3.5 requires. It is an engineering
artefact. It does not amend the Master Plan, preregistration, rubric, protocol or
any ADR, and it creates no rule of its own: where it describes a rule, the
authority is the document cited beside it.

## 1. Boundary

No calibration game was researched or scored. No production, IGDB, database,
deployment or publication action was taken. No scoring semantics, rubric anchor,
cohort membership, holdout rule, evidence rule or acceptance threshold was
changed. The six controlled inputs were read and verified; none was written.

## 2. Module map

All harness code is under `lib/calibration/`, its commands under
`scripts/calibration/`, and its tests under `tests/calibration/`.

| Module | Responsibility | Authority |
|---|---|---|
| `canonical-json.ts` | RFC 8785 canonicalization and the lowercase SHA-256 digest | Protocol §15 |
| `controlled-inputs.ts` | The six approved inputs, blob + SHA-256 lock, lock manifest | Preregistration §15, ADR 0036 §7 |
| `package-schema.ts` | The one reusable canonical structural validator | Protocol §15, audit gate 4 |
| `package-types.ts` | TypeScript shapes for the validator's arithmetic | mirrors the schema |
| `protocol-tables.ts` | Required facets, collection bands, query families, reassessment graph | Protocol §§4.1, 6.1, 4.7, 14 |
| `derivation.ts` | Dimension totals, confidence labels, evidence status | Protocol §§7.3, 10, 15.2 |
| `semantic-validator.ts` | The complete §15.1 checklist, fail-closed | Protocol §15.1 |
| `scoring-pass-contract.ts` | The model-facing schema and its deterministic mapping | work order §3.5 |
| `request-builder.ts` | The single canonical request builder and pair invariants | ADR 0036 §5 |
| `openai-client.ts` | Responses transport and every execution-contract guard | ADR 0036 §§1–3, 6, 8 |
| `ledger.ts` | Append-only local run ledger, timing, retry accounting | work order §3.8 |
| `redact.ts` | Secret redaction for everything printed or persisted | work order §3.6 |

### Command surface

| Command | What it does | Network |
|---|---|---|
| `npm run calib:lock` | Verify the six controlled inputs; print the lock manifest | none |
| `npm run calib:validate -- <pkg>` | Canonical schema, then §15.1 semantic validation | none |
| `npm run calib:pair -- <input>` | Build the paired requests and prove the invariants | none |
| `npm run calib:harness` | The mocked harness test suite | none |
| `npm run calib:probe -- --live` | The manual credential-safe capability probe | **opt-in only** |
| `npm run calib:report` | The safe Item 4 proof report | none |

There is no command that bulk-scores the catalog, and a test asserts that no
other npm script can reach the live probe.

## 3. Three design decisions worth stating

**One builder, no role parameter.** `buildScoringRequest` accepts no run role at
all. Primary and audit are produced by calling the same function with the same
input, and the role is attached beside the request as wrapper metadata. A role
cannot leak into the model input through an argument that does not exist, which
is a stronger guarantee than checking afterwards that it did not. ADR 0036 §5.

**The derived schema is transport only.** Nothing is trusted because the model
returned it. Constraints dropped so OpenAI Structured Outputs will accept the
schema are re-imposed locally by the canonical schema and the semantic validator
before a run counts, so a dropped constraint can only cause a local rejection,
never a silently accepted package. §4 below documents the mapping.

**The ledger is append-only.** A failed attempt is evidence. The module offers
no update or rewrite path, so a harness cannot turn a failed run into a clean
one; a retry is a new recorded attempt that never feeds the invalid output back
to the model.

## 4. Structured-output equivalence (work order §3.5)

### 4.1 The canonical schema cannot be posted unchanged

`canonicalSchemaCompatibility()` walks the approved schema and reports every
construct outside the Structured Outputs subset. On the approved bytes it finds
**294 occurrences across 18 keywords**:

| Keyword | Count | Keyword | Count | Keyword | Count |
|---|---|---|---|---|---|
| `minItems` | 36 | `oneOf` | 22 | `pattern` | 10 |
| `if` | 34 | `allOf` | 22 | `multipleOf` | 6 |
| `then` | 34 | `minimum` | 22 | `minLength` | 3 |
| `maxItems` | 26 | `contains` | 19 | `format` | 2 |
| `uniqueItems` | 25 | `else` | 15 | `maxLength` | 1 |
| | | `maximum` | 15 | `exclusiveMinimum` | 1 |
| | | | | `not` | 1 |

Reproduce with `npm run calib:report`. This settles the deterministic half of the
question on repository evidence: an explicitly equivalent derived schema is
required, not merely convenient. The live half — that the derived schema is in
fact accepted by the API — was tested with
`npm run calib:probe -- --live --schema-probe` and failed at the API schema
boundary (§6).

### 4.2 What the model is asked for, and what it is not

The canonical scoring prompt asks for one `scoringPass`. The derived schema's
root therefore has exactly two properties, `claim_ledger` and `decisions`, taken
from the canonical `$defs/scoringPass` and carrying all 15 transitively
referenced definitions.

The run manifest is deliberately **absent**. Role, timing, digests, seed, retry
count and tool access are facts about the execution, not model output; the model
is never asked for them and therefore cannot assert them. The wrapper supplies
the manifest, which is exactly what the scoring prompt means by "the execution
wrapper assigns `primary` or `audit` only as run metadata after the model output".

### 4.3 The transformation, and why it cannot alter score semantics

Applied mechanically, per subschema:

| Canonical construct | Derived form | Effect on the accepted value set |
|---|---|---|
| `oneOf: [X, {"type":"null"}]` | `anyOf: [X, {"type":"null"}]` | identical — the branches are disjoint by type |
| `allOf` / `if` / `then` / `else` / `not` / `contains` | removed | widens |
| `pattern`, `format`, `minLength`, `maxLength` | removed | widens |
| `minItems`, `maxItems`, `uniqueItems` | removed | widens |
| `minimum`, `maximum`, `exclusiveMinimum`, `multipleOf` | removed | widens |
| every object | `additionalProperties: false`, all properties `required` | unchanged — the canonical schema already requires every property of every object it defines |
| `enum`, `const`, `type`, `$ref`, `properties`, `items` | carried through unchanged | unchanged |

Every transformation either preserves the accepted set or widens it. None
narrows it, and none rewrites a value. So:

> **L(canonical) ⊆ L(derived)**

The mapping back is `assembleScoringPass`, which copies the two arrays and adds
the wrapper's run manifest. It does not reorder, default, coerce or fill in — a
tested property, because any of those would be the harness quietly authoring
scoring content. The assembled pass is then validated against the **full**
canonical schema and the **complete** §15.1 semantic validator. Composing the
two facts: a value the derived schema admits but the canonical one does not is
rejected on arrival, so the widening is not exploitable, and difficult fields are
not omitted to make the API accept the schema — they are all present.

`tests/calibration/scoring-pass-contract.test.ts` asserts each step, including
the round trip (an assembled pass is byte-identical to the canonical one) and the
re-imposition (a malformed `anchor_id`, which transports fine because `pattern`
was dropped, is rejected locally).

## 5. Semantic validator coverage

`validatePackageSemantics` implements all nine §15.1 clauses. Each issue it
reports carries its clause number and rule family, so a reviewer can walk the
checklist against the output. Rules the JSON Schema already enforces are not
duplicated; rules JSON Schema cannot express are implemented here, including:

- the RFC 8785 digest and the approval binding;
- exact 40-key (or exactly-affected-set) decision sets across all three sets;
- the full pair invariant set, including tool-free and correction-free passes;
- reference resolution across sources, claims, units, frames, candidates,
  differences and overrides; claim-link self-reference and relation-type
  contradiction; the Tier-D rule;
- anchor identity, the required-facet **lower-of-two** rule, override validity,
  and confidence labels recomputed from the recorded facts;
- calendar-valid dates (February included), elapsed-day arithmetic, and the
  retrospective minima for `memory_residue` and `lasting_impact` — the 30-day
  floor, the two-independent-claim rule for `0`/`0.5`/`1.5`/`2`, the 180-day
  requirement at `2`, the under-30-day Unknown rule, and the pre-release Medium
  cap;
- difference classification and every audit rate, recomputed;
- dimension totals via the product's existing `lib/scoring/derive.ts` — not a
  second implementation, because §7.3 requires byte-for-byte agreement with the
  published read path;
- dimension and overall confidence recomputed from **re-derived** labels, since
  §10.3 says imported derived labels are never trusted;
- `evidence_status` recomputed from §15.2;
- the reassessment one-hop graph, baseline binding and carried-forward
  complement.

## 6. Open items and owner determinations

Updated 2026-09-02 after Tomas's Item 4 forensic review of PR #43 and the live
Gate 1 probes from current `main` at
`1e113f587595ee2fdcc4648f253d0fa702076836`. Two of the four items below were
resolved by owner determination and are now implemented; one remains an
owner/orchestrator follow-up; the live probe has now exposed an implementation
gap in the derived transport schema.

### 6.1 Live Gate 1 evidence — gate 1 remains PARTIAL

Both credential-safe probes were run manually on 2026-09-02 from clean current
`main` at `1e113f587595ee2fdcc4648f253d0fa702076836`, with the credential supplied
only through the local environment. No credential or secret value was printed
or committed. Both requests used the fixed non-game probe input, exact model
`gpt-5.6-sol`, `reasoning.effort = high`, `reasoning.context = current_turn`,
`store = false`, `tools = []`, and the 256-token output cap. The successful call
returned standard reasoning mode in its effective reasoning metadata.

The tiny-contract capability probe started at `2026-09-02T17:00:38.983Z` and
returned **PASS**:

- HTTP 200;
- requested and returned model `gpt-5.6-sol`; identity matched;
- effective reasoning `{context: current_turn, effort: high, mode: standard,
  summary: null}`;
- no stronger snapshot/build identifier exposed by the API;
- response ID
  `resp_0eaf2b924f801e4b016a985638465487d298fed854eb85d734`;
- 78 input, 23 output, 101 total tokens; 0 reasoning tokens reported;
- 3,328 ms API elapsed time; and
- structured output accepted under the tiny probe schema.

The real derived scoring-pass schema probe started at
`2026-09-02T17:00:51.482Z` and returned **FAIL** before model execution:

- HTTP 400;
- no returned model, response ID, reasoning metadata, token usage or structured
  output; and
- provider error:
  `Invalid schema for response_format 'phase3a_scoring_pass': In context=('anyOf', '0'), 'additionalProperties' is required to be supplied and to be false.`

The first result proves configured project access to the exact preregistered
model and effective High/current-turn/standard reasoning configuration. The
second result disproves the current architecture record's expectation that the
derived scoring-pass schema is accepted by the live Structured Outputs API.
This is a fail-closed transport-schema implementation defect, not calibration
evidence and not a scoring result.

Gate 1 remains **PARTIAL**, Item 4 remains incomplete, and D1 remains blocked
until the derived schema is corrected and the live schema probe passes. No
calibration game was researched or scored by either probe.

### 6.2 Coverage-state centrality — RESOLVED by controlled amendment (issue #44)

The gap: §6.1 separated `bounded` from `materially_limited` partly by whether a
missing stratum was central or late/end, and the package recorded missing
*classes*, not missing *units*. Worse, the schema's numeric branch forces
`missing_coverage_classes` empty, so a **numeric** decision carried no
machine-readable coverage gap at all and the shipped check was vacuous there.

Resolved by Amendment 1, owner-approved on 2026-09-02 as revised by the
orchestrator (preregistration §15.2):

- `coverageUnit.omission_effect` — `materially_limiting | bounding |
  nonlimiting`, frozen with the frame. A `central` unit must be
  `materially_limiting`.
- `coverage_observed_unit_ids` / `coverage_missing_unit_ids` on `scoreDecision`
  and `platformOverride`, disjoint and together covering the **whole** frozen
  frame. The three-state effect exists so irrelevance is declared at freeze
  time rather than by dropping a unit from accounting after anchors are visible.
- Coverage state is derived: any missing `materially_limiting` →
  `materially_limited`; else 0 `bounding` → `full`, 1 → `bounded`, ≥2 →
  `materially_limited`. Missing `nonlimiting` units never lower it.
- A linked non-rejected claim's observed units may not be recorded missing, and
  a numeric value requires at least one observed unit.
- `optional_endgame` added to `missing_coverage_classes`, which stays
  Unknown-only; when populated, its frame-bound classes are the classes of the
  missing units that actually contribute to insufficiency.

Coverage-state meanings, rubric anchors, cohort/scope, evidence rules, holdout
rules and scoring authority are unchanged.

### 6.3 `audit_summary.difference_ids` — RESOLVED by owner determination

**Owner determination, 2026-09-02.** `difference_ids` is not limited to
`owner_review_required`. It equals the IDs of every per-key record representing
an actual divergence requiring reconciliation or retention:

> `difference_class != exact` **or** any of `claim_inclusion_differs`,
> `mapping_differs`, `disposition_differs`, `confidence_differs` is true.

Clean exact rows with no secondary difference are omitted. Material/endpoint
owner review remains a stricter subset. The validator now enforces this as **set
equality** in both directions — a missing divergent row and an unexpected clean
row are both rejected — replacing the earlier floor-only check.

### 6.4 One difference record per paired decision — CONFIRMED by owner

**Owner determination, 2026-09-02.** `adjudication.differences` contains one
record per paired decision, `difference_class = exact` included. This is the
coherent reading of the closed enum and is what makes the paired metrics, and
the per-key claim/mapping/disposition/confidence differences, reproducible. The
validator requires a record for every paired key, and a test covers the omission
case.

## 7. Contract defects corrected in review

Two defects were found by Tomas's Item 4 forensic review of PR #43 on
2026-09-02 and are fixed on this branch. Both were real, and both are recorded
here because each concerns a digest that later work will rely on.

### 7.1 RFC 8785 must fail on invalid Unicode

`canonical-json.ts` originally iterated UTF-16 code units and deliberately let
an unpaired surrogate pass through, on the reasoning that JCS escapes only
characters below U+0020. That reasoning was wrong about the consequence: a lone
surrogate has **no UTF-8 encoding**, so `Buffer.from(…, "utf8")` silently
substitutes U+FFFD. The canonical bytes would then no longer represent the
input, two distinct inputs could produce the same digest, and hash
interoperability would break precisely where the digest is load-bearing — the
package `content_digest` and the `owner_approval.approved_digest` bound to it.

`serializeString` now terminates canonicalization on an unpaired high or low
surrogate, in property names as well as values, while emitting a valid
surrogate pair unchanged. Tests cover a lone high surrogate, a lone low
surrogate, a lone surrogate inside a property name, a nested occurrence with its
reported path, and a valid pair that round-trips through UTF-8 without
substitution.

### 7.2 `run_manifest.output_schema_digest` binds the approved schema

The builder originally set `output_schema_digest` to the digest of the **derived
transport schema**. The run manifest's controlled-input digests are defined over
the exact Item 3-approved bytes (gate 6), so that field must be the SHA-256 of
`docs/schemas/Game_Profile_Scoring_Package_v1.0_DRAFT.schema.json` — otherwise
the manifest attests to an artefact the owner never approved.

`output_schema_digest` is now `controlledDigest(lock, "output_schema")`. The
derived schema's digest is still recorded, as a separate
`scoringPassSchemaDigest` field on the request for the local ledger and proof
report, and it remains covered by `semantic_request_digest`. A regression test
asserts the manifest field equals the controlled output-schema lock and that the
transport digest is a different value.

## 8. Amendment 1 and the transport correction

### 8.1 Controlled bytes

Amendment 1 changed four of the six controlled inputs — package schema,
candidate protocol, research prompt, scoring prompt. The rubric and the
execution system instructions are byte-identical to their Item 3 identities.
New Git blob IDs and SHA-256 values are recorded in preregistration §15.2, and
the harness lock in `lib/calibration/controlled-inputs.ts` was updated to the
amended bytes; the lock-set digest moved from
`fd202c048c564353a8d644ec3b10a8f71e2e627bca53cf73d941a199b670a18d` to
`62d90b14fcde14af639e0c51259b28b41b4e2ce2063398d91eb2244e9637c42c`.

The design is owner-approved; the resulting **bytes** are not. ChatGPT/Tomas
review the exact controlled diff and provenance before the implementing pull
request merges.

`scoring-pass-contract.ts` needed no change: the transport schema is derived
from the canonical schema at runtime, so the two new decision fields reached the
model contract automatically. A test asserts that, and asserts that
`omission_effect` does **not** reach it — the research pass freezes it, and the
scoring model is never asked for it.

### 8.2 The Structured Outputs transport correction

Separate from Amendment 1 and carried in its own commit. PR #45's live Gate 1
probe returned HTTP 400 before the model ran:

> Invalid schema for response_format 'phase3a_scoring_pass': In
> context=('anyOf', '0'), 'additionalProperties' is required to be supplied and
> to be false.

The closure step keyed off `type === "object"`, and `retrospectiveTime.oneOf`
carries two branches that declare only `properties` — a cross-field constraint
("exactly one date basis"), not a type alternative. They were converted to
`anyOf` and left unclosed.

Closing them in place would have been worse than the bug: each branch names two
of the four members, so `required` of its own keys plus
`additionalProperties: false` forbids the other two members the parent still
requires, making the branch — and the union — unsatisfiable. The API would
accept that schema and no model output could ever validate against it, which
surfaces only after a measured run has been spent.

`oneOf` is therefore classified rather than converted: a type union (every
branch carries `type`/`$ref`/`const`/`enum`) becomes `anyOf`; a
property-constraint `oneOf` is dropped for transport like `allOf` and
`if`/`then`, and re-imposed by canonical validation. Closure now applies to
anything object-shaped at every depth, and
`structuredOutputsClosureViolations` is run by `buildScoringPassSchema`, which
throws rather than returning a schema the API would reject. Ajv compiles
unclosed objects happily, so without that guard the local suite stays green
while the live call fails.

Gate 1 stays PARTIAL until the live schema probe is re-run and passes on the
corrected schema.

## 9. Verification

See the pull request for the exact commands and results.
