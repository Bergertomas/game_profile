# Phase 3A D1 — research collection and corpus-freeze handoff

Slice B implements the D1 **research collection pass and deterministic corpus
freeze only**. It does not score, does not adjudicate, does not write to a
database and does not accept an IGDB identity mapping. The next dependency slice
is **slice C: isolated primary/audit scoring transport**.

## What slice B added

| Surface | Role |
| --- | --- |
| `lib/calibration/holdout-isolation.ts` | The four locked holdout identities and the §3.1 guard. Wrapper-authored payloads fail closed; byte-locked Item 3 inputs are **reported**, never edited. |
| `lib/calibration/research-pass.ts` | The research execution contract (web-search-only), the derived model-facing Structured Output schema, and the deterministic corpus freeze. |
| `lib/calibration/d1-research.ts` | The D1 binding: consumes slice A's `D1_RUN_INPUT` unaltered, runs the gates, builds the request, freezes the corpus and emits the run receipt. |
| `scripts/calibration/d1-research.ts` | `npm run calib:d1-research` — dry run by default, `--live` opt-in, `--freeze` replay. |

`lib/calibration/scoring-pass-contract.ts` gained one shared export,
`deriveStructuredOutputsSchema`, so the scoring and research transport contracts
are derived by exactly one implementation. `lib/calibration/openai-client.ts`
gained one injectable `assertContract` option, defaulting to the scoring
contract; the research pass supplies its own because ADR 0036 §6 gives research
"separately controlled tool access" rather than a relaxed scoring contract.

## Running it

```bash
# 1. Plan only. Runs every gate, prints digests, sends nothing.
npm run calib:d1-research

# 2. The measured research call. Opt-in, refuses in CI, needs OPENAI_API_KEY.
npm run calib:d1-research -- --live --maturity <observation.json>

# 3. Deterministic replay of a captured output. No network call.
npm run calib:d1-research -- --freeze <capture.json> --maturity <observation.json>
```

`<observation.json>` is the current-state maturity revalidation made
**immediately before collection** (preregistration §7):

```json
{
  "evaluationMaturity": "mature",
  "profileStabilityState": "bounded_change",
  "materialProfileShapingChangesInFlight": [],
  "reviewedAt": "2026-09-04T06:00:00Z"
}
```

A live run refuses an observation older than 24 hours, and refuses any state the
slice-A gate rejects. `reviewedAt` is part of the request payload, so a `--freeze`
replay must pass the same observation file the capture was produced from; a
mismatch is reported as request drift and the freeze is refused.

## Gates, in the order they run

1. **Controlled-byte lock** — `verifyControlledInputs()` over the six Item 3
   inputs. Drift throws `ControlledInputDriftError` before a request exists. An
   injected lock manifest is re-checked, so it cannot be a way past the gate.
2. **Maturity revalidation** — slice A's `assertD1MaturityStillEligible`.
3. **Holdout isolation** — the wrapper-authored payload is scanned and fails
   closed. The byte-locked inputs are scanned and **reported**: the rubric's
   changelog names `KCD2` in a historical calibration list, and the Item 3 freeze
   is owner-approved and immutable to this slice, so the receipt discloses the
   mention rather than the wrapper editing a locked input.
4. **At freeze** — no scoring content, no unmasked review grade in the scoring
   view, every capture's SHA-256 equal to the manifest digest that commits to it,
   all seven query families present exactly once, the declared collection
   standard reproduced by the manifest's independent active A/B clusters, and the
   canonical `$defs/corpus` schema satisfied.

## Artifacts (git-ignored, `calibration-runs/d1-research/<runId>/`)

| File | Contents |
| --- | --- |
| `capture.json` | The raw model output, run facts, `frozen_at` and the semantic request digest. Written even when the freeze refuses the output, so a failed attempt stays evidence. |
| `corpus.json` | The canonical `corpus` object: research run manifest, candidate log, source manifest, coverage frames, both packet digests, canonical source order, `review_grades_masked`, `frozen_at`. |
| `semantic-input.json` | **The slice-C input.** |
| `receipt.json` | Controlled-byte hashes, supplied-input hashes, model/configuration/tool access, returned identity, timings, every digest, the maturity record, the isolation boundary, the research completion report, and `receipt_digest` over all of it. |

A ledger row is appended to `calibration-runs/phase3a-runs.jsonl` with
`role: "research"` for every attempt, including failed ones.

## What slice C consumes

`semantic-input.json` is exactly the `SemanticInput` shape
`lib/calibration/request-builder.ts` already takes:

```ts
buildScoringRequest({ semanticInput, maxOutputTokens /*, seed */ })
```

Its four members are `evaluation_scope` (with `evidence_cutoff` materialized from
the freeze's UTC calendar date through slice A's `freezeD1EvaluationScope`),
`coverage_frames`, `normalized_corpus` and `canonical_source_order`. The
normalized corpus is ordered by the canonical source order, so its bytes are a
function of the frozen corpus rather than of the model's array order, and
`buildScoringRequest`'s `normalized_packet_digest` reproduces
`corpus.normalized_packet_digest` exactly. Slice C should assert that equality
before spending a paired call.

Deliberately absent from the scoring view, per preregistration §3.2: the
candidate/rejection log, the collection reason, the research completion report
and any research commentary. Slice C must not reintroduce them, must expose no
tools (ADR 0036 §6), and must not consult the research context.

## Boundaries slice B did not cross

No scoring call, anchor choice, score field or interpretation. No adjudication,
calibration reading or D2 work. No holdout research. No production or database
mutation, deployment or publication. No identity acceptance. No cohort, scope,
DLC, prompt, schema-semantic or methodology change — the six controlled inputs
are read and hashed, never written.

## Open items for the orchestrator

- The Evidence SOP is named by the frozen research prompt's authoritative-input
  list but is **not** one of the six Item 3 controlled inputs. It is supplied
  from repository bytes and recorded in the receipt as a supplied input with its
  own SHA-256. If it should be byte-locked, that is a preregistration amendment
  and an owner decision.
- `normalized_captures` and `research_completion_report` are transport-only
  records: the package schema stores digests of content that lives outside it,
  and the frozen prompt asks for a completion report the schema does not define.
  Neither adds methodology — every capture is re-hashed against the manifest
  digest at freeze, and the report's derivable items are computed from the frozen
  corpus rather than requested from the model.
- The canonical source order is active sources first, then superseded, each group
  in UTF-16 code-unit order of source ID. Protocol §4.7 requires the order to be
  frozen and hashed but does not define it; this is a mechanical determinism rule
  and is stated here so it can be ratified or replaced deliberately.
