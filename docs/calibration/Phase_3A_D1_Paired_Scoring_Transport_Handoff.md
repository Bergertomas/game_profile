# Phase 3A D1 — isolated paired scoring transport handoff

Slice C implements the D1 **paired primary/audit scoring transport only**. It
consumes one already-frozen slice-B packet, proves the two calls are
byte-identical, executes each as an isolated clean context, validates what comes
back and records the evidence. It chooses no score, no anchor, no rationale, no
confidence label and no adjudication, and it does not research, mutate a database
or publish anything.

**GPT-5.6 Sol High remains the sole D1 editorial scorer.** Everything below is
the machinery that carries a frozen packet to that scorer and carries the raw
result back with receipts. Editorial judgment begins where this command ends.

## What slice C added

| Surface | Role |
| --- | --- |
| `lib/calibration/d1-scoring.ts` | The D1 binding: the six preflight gates, the pair proof, one isolated call, the run manifest (where the role first exists), pass-scoped validation and the receipts. |
| `scripts/calibration/d1-scoring.ts` | `npm run calib:d1-scoring` — dry run by default, `--live` opt-in, `--replay` for deterministic re-derivation. |

Nothing in slice B, the request builder, the scoring-pass contract, the OpenAI
client, the ledger or the validators was modified. Slice C consumes them as they
are: `buildScoringRequest` and `assertPairInvariants` for the pair,
`callResponses`' default scoring contract for the transport, `package-schema`'s
compiled canonical validator and `semantic-validator`'s `deriveCoverageState` for
validation, and `appendLedgerEntry` for the run ledger.

## Running it

```bash
# 1. Plan only. Runs every gate, proves the pair, prints digests, sends nothing.
npm run calib:d1-scoring -- --run calibration-runs/d1-research/<researchRunId>

# 2. The two measured scoring calls. Opt-in, refuses in CI, needs OPENAI_API_KEY.
npm run calib:d1-scoring -- --run calibration-runs/d1-research/<researchRunId> --live

# 3. Deterministic re-derivation from captured outputs. No network call.
npm run calib:d1-scoring -- --run calibration-runs/d1-research/<researchRunId> --replay
```

`--run` takes the **slice-B run directory**, not a single file. All three of
`semantic-input.json`, `corpus.json` and `receipt.json` are required, because the
packet alone cannot prove it is the packet that was frozen: the corpus holds the
digest that commits to it and the receipt holds the controlled-input lock it was
frozen under, and those are what make a drift refusal possible at all.

## Gates, in the order they run

Every gate runs before a request exists, so a run that should not happen cannot
get as far as having something to send.

1. **Controlled-byte lock** — `verifyControlledInputs()` over the six Item 3
   inputs. Drift throws `ControlledInputDriftError`. An injected lock manifest is
   re-checked, so it cannot be a way past the gate.
2. **Research-lock continuity** — the lock set the corpus was frozen under must
   still be the bytes this call would send. Scoring a corpus against different
   methodology bytes than it was collected under is the drift preregistration
   §9.3 says to record rather than paper over.
3. **Handoff digest binding** — `semantic-input.json` is re-hashed here and must
   reproduce `corpus.normalized_packet_digest` and the research receipt's copy of
   it, and its canonical source order must equal the frozen order. The corpus must
   record `review_grades_masked`.
4. **Scope lock** — the scoring view's `evaluation_scope` is re-derived from
   slice A's immutable `D1_RUN_INPUT` plus the freeze date and must match byte for
   byte, so a mutated scope key, edition, platform list or Night Springs / The
   Lake House exclusion cannot reach a scoring call.
5. **Scoring-view isolation** — no research or downstream context key
   (`candidate_source_log`, `collection_reason`, `research_completion_report`,
   `query_family_audit`, another pass, adjudication, owner approval …), no
   unmasked review grade, and no holdout identity anywhere in the packet.
   Preregistration §3.1 forbids holdout material in a development scoring context
   outright, so this fails closed over the whole scoring view — not only over
   wrapper-authored bytes as in the research pass.
6. **Pair proof** — both requests come from the one frozen builder with no second
   path, and `assertPairInvariants` throws on any difference ADR 0036 §5 forbids.
   A seed is the only permitted difference, and only when the endpoint exposes
   one; the two must then differ.

Holdout mentions inside the byte-locked Item 3 inputs are **reported** in the
receipt, never edited: the Item 3 freeze is owner-approved and immutable to this
slice, so the receipt discloses the true isolation boundary rather than implying
a cleanliness the frozen bytes do not have. This is the same treatment slice B
applies.

## What each call is

Per ADR 0036 §§1–3, 6 and preregistration §4.1, every scoring request is sent
with `model: gpt-5.6-sol`, `reasoning.effort: high`,
`reasoning.context: current_turn`, `store: false`, `tools: []`, an explicit
`max_output_tokens` bound (64 000), no `previous_response_id` and no
`conversation`. `assertExecutionContract` enforces all of that inside
`callResponses` before anything is sent, and the returned model identity is
checked before an output is accepted (ADR 0036 §8).

There is no retry loop anywhere in the path. Preregistration §9.1 makes a retry a
fresh independent call the operator records, so a transport-level retry would be
the silent repair the protocol forbids. The primary and audit calls are two
separate requests executed one after the other; the audit call is built from the
same frozen packet and never sees what primary returned.

The run role is not a parameter of the builder or of the execution function. It
exists for the first time in `buildD1ScoringManifest`, which takes the model
output as an argument precisely so it cannot be called before there is one —
preregistration §4.2 and the frozen scoring prompt both say the wrapper assigns
`primary`/`audit` only as run metadata after the model output.

## Validation, and what it deliberately does not cover

Each pass is validated in two layers, and neither repairs anything:

1. the canonical package schema's own `scoringPass` definition, compiled by the
   shared `package-schema` module — the same structural contract a complete
   package is held to, applied to the part that exists now;
2. the pass-scoped subset of Protocol §15.1 that can be decided from one pass
   plus the frozen packet: digest binding, decision-set completeness against the
   forty rubric subcriteria, pass-local reference integrity, the §6.1 coverage
   derivation (through the existing `deriveCoverageState`, not a second
   implementation) and the required-facet rule.

Reference integrity here is criterion-scoped, not merely existential. A claim's
`observed_unit_ids` must be units of the frozen frame of the criterion that
claim is mapped to (§5.2), and an `insufficiency_reference_ids` entry naming a
coverage frame or unit — on a decision or on one of its platform overrides —
must name the scored criterion's own frame or a unit of it, because "another
criterion's frame or unit says nothing about this criterion's coverage and does
not resolve" (§15.1 amendment 4). A reference to a real frozen object belonging
to a different criterion is reported as exactly that, distinct from a reference
that names nothing frozen at all.

The §15.1 families that need the pair or the adjudicated package —
`pair_invariants` over outputs, `adjudication`, `derivation`, the package-level
half of `coverage_and_time`, and `reassessment` — are **not** evaluated here and
are named explicitly in every receipt under `deferred_to_package_assembly`.
`validatePackageSemantics` already owns them and runs at package assembly, which
is the orchestrator's stage.

One known asymmetry, recorded rather than smoothed over: §15.1 amendment 4 lets
`insufficiency_reference_ids` name a frozen candidate-source record, but §3.2
withholds the candidate log from the scoring view, so that one kind is not
resolvable from a pass. Such a reference is reported as an unresolved reference
for the orchestrator, never guessed at.

Any issue at all makes the pass invalid and the pair non-counting. That is the
intended outcome: a material protocol, mapping or anchor defect is handed to the
orchestrator under the registered rerun/versioning rules (preregistration §§7.6,
9.1, 9.3), and engineering does not resolve it.

## Artifacts (git-ignored, `calibration-runs/d1-scoring/<pairId>/`)

| File | Contents |
| --- | --- |
| `<role>/capture.json` | The raw model output, run facts and the semantic request digest it was produced from. Written even when assembly refuses the output, so a failed attempt stays evidence. |
| `<role>/manifest.json` | The canonical run manifest — the only place the role exists. |
| `<role>/pass.json` | The assembled canonical `scoringPass`: the manifest plus exactly what the model returned. |
| `<role>/validation.json` | Every structural and pass-scoped issue, or none. |
| `<role>/receipt.json` | Controlled-input lock, model/configuration/tool access, returned identity, timings, every digest, the isolation record, the validation result and `receipt_digest` over all of it. |
| `<role>/failed-attempt.json` | Written instead of `capture.json` when the call itself failed. |
| `pair-receipt.json` | The byte-identity proof, the isolation record, both run IDs, `pair_counts` and every blocking reason. |

A ledger row is appended to `calibration-runs/phase3a-runs.jsonl` with
`role: "primary"` or `"audit"` for every attempt, including failed ones. Nothing
under `calibration-runs/` is committed (Item 4 work order §3.8).

## Where editorial scoring begins

Slice C stops at `pair-receipt.json`. When the real frozen D1 corpus exists, the
GPT-5.6 Sol High orchestrator's sequence is:

1. run slice B to a clean frozen corpus, giving `calibration-runs/d1-research/<runId>/`;
2. run `npm run calib:d1-scoring -- --run <that directory>` and read the plan —
   the pair proof, the digests and the isolation record — before spending
   anything;
3. run the same command with `--live`;
4. read `pair-receipt.json`. If `pair_counts` is false, every blocking reason is
   listed there and in the per-pass `validation.json`; handle it under the
   preregistered rerun/versioning rules rather than editing an output;
5. if the pair counts, take `primary/pass.json` and `audit/pass.json` as the two
   measured passes. **Difference classification, adjudication, derived
   dimensions, interpretation and owner approval all begin here**, outside this
   command, and `validatePackageSemantics` runs over the assembled package at
   that point.

## Boundaries slice C did not cross

No editorial scoring judgment, anchor, rationale, confidence label or
adjudication. No repair, normalisation or reordering of model output. No
research call and no change to the frozen corpus. No D2 work and no holdout
research. No production or database mutation, deployment, publication or identity
promotion. No cohort, scope, DLC, prompt, schema-semantic, anchor, confidence or
methodology change — the six controlled inputs are read and hashed, never
written.

## Open items for the orchestrator

- **The output bound is an engineering ceiling, not a preregistered value.**
  `D1_SCORING_MAX_OUTPUT_TOKENS` is 64 000: generous for forty decisions with
  rationales plus a claim ledger, and bounded so a run cannot become unbounded
  spend (work order §3.10). If a real D1 pass truncates against it, that is a
  transport failure to record and re-run at a higher bound, not a scoring result.
- **`pair_counts` is deliberately strict.** It requires both passes to validate
  with zero issues. If the orchestrator judges a particular reported issue
  immaterial, that is an owner-level determination recorded against the run — the
  transport does not have a "warn" tier and should not acquire one by default.
- **The candidate-source reference asymmetry above** may deserve either a
  protocol clarification or a scoring-view addition. Both are methodology
  decisions and are out of this slice's scope.
