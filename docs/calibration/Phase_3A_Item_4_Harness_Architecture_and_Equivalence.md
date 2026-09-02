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
fact accepted by the API — is `npm run calib:probe -- --live --schema-probe`, and
is **not yet run** (§6).

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

## 6. Open items for the Item 4 gate audit

These are reported rather than resolved. Two are owner/orchestrator decisions;
one is an environment gap.

### 6.1 The live probe has not been run — gate 1 remains PARTIAL

`OPENAI_API_KEY` is not configured in the engineering environment, so the live
capability probe was not executed. Actual project access, returned model
identity, effective reasoning configuration, whether the API exposes a snapshot
identifier stronger than the model ID, and whether the derived scoring-pass
schema is accepted by Structured Outputs are therefore **unproven**. The probe is
implemented, exercised on both refusal paths, and ready:

```
OPENAI_API_KEY=... npm run calib:probe -- --live
OPENAI_API_KEY=... npm run calib:probe -- --live --schema-probe
```

Gate 1 cannot close on repository evidence alone.

### 6.2 Coverage-state centrality is not recoverable from the record

Protocol §6.1 separates `bounded` from `materially_limited` partly by whether the
missing stratum is **central**:

> `materially_limited` coverage is missing a **central or late/end stratum**, more
> than one noncentral stratum, or any materially variable included
> mode/platform/build.

The coverage frame records each unit's `centrality`, but a decision records only
`missing_coverage_classes` — which *classes* are missing, never which *units*. A
decision missing exactly one `temporal_stratum` is therefore indistinguishable,
from the record alone, between a missing noncentral stratum (`bounded`) and a
missing late/end stratum (`materially_limited`).

Rather than invent a rule, the validator implements the unambiguous part and
never rejects a package the protocol permits: `full` iff no missing classes;
`bounded` requires exactly one missing class and none of mode/platform/build; any
mode/platform/build gap or two or more missing classes is `materially_limited`.
The residual gap is that a `bounded` which should be `materially_limited` on
centrality grounds is accepted.

**Decision needed from ChatGPT/Tomas**, since the schema is a controlled input
and engineering may not amend it: either record the missing unit IDs (a schema
amendment, re-approved through the preregistration), or accept the documented
partial check as sufficient for Phase 3A.

### 6.3 `audit_summary.difference_ids` — floor implemented, exact set not stated

Protocol §15 says `audit_summary` carries "IDs for every adjudicated difference".
The validator enforces the unambiguous floor — every `owner_review_required`
difference must be listed, and every listed ID must resolve — but does not
require set equality, because "adjudicated" is not defined tightly enough to rule
out an editor also listing a reconciled adjacent difference. Confirmation that
the floor is the intended rule would let this be tightened.

### 6.4 One difference record per paired decision

The audit rates are defined over the paired decision set, so the validator
requires a difference record for every paired key, including exact agreements
(the `difference_class` enum admits `exact`). This is the reading that makes
`exact_count` and `exact_rate` recomputable. If differences were instead intended
to list only disagreements, the counts would need another source and this rule
should be revisited.

## 7. Verification

See the pull request for the exact commands and results.
