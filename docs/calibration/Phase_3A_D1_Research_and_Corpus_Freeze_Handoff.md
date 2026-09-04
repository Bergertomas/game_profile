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

# Any mode: name which attempt of this request is being recorded (default 1).
npm run calib:d1-research -- --live --maturity <observation.json> --attempt 2
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

`<runId>` is `d1-research-<semanticRequestDigest[0..24]>-a<attempt>`, so every
attempt has its own directory.

| File | Contents |
| --- | --- |
| `capture.json` | The raw model output, run facts, `frozen_at`, the semantic request digest and `output_digest` over the model output. Written even when the freeze refuses the output, so a failed attempt stays evidence; a refused attempt lands in `d1-research-unfrozen-<digest>-a<attempt>/`. |
| `corpus.json` | The canonical `corpus` object: research run manifest, candidate log, source manifest, coverage frames, both packet digests, canonical source order, `review_grades_masked`, `frozen_at`. |
| `semantic-input.json` | **The slice-C input.** |
| `receipt.json` | Controlled-byte hashes, supplied-input hashes, model/configuration/tool access, returned identity, timings, every digest, the maturity record, the isolation boundary, the research completion report, and `receipt_digest` over all of it. |

A ledger row is appended to `calibration-runs/phase3a-runs.jsonl` with
`role: "research"` for every attempt, including failed ones.

### Persistence is verbatim, verified and immutable

`lib/calibration/artifact-store.ts` owns every artifact write, and three rules
apply to all of them (issue #88, the #87 defects 1 and 2):

1. **Verbatim.** A digest commits to exact bytes, so nothing edits an artifact
   after its digest exists. Credential redaction stays on the console, error and
   ledger surfaces, which are where a key can actually appear. It used to run
   over the artifacts too, and it does not only match credentials: ordinary prose
   such as `torch-bearer carrying` satisfies the `Bearer <token>` pattern, so a
   normalized capture could reach disk altered while the receipt still claimed
   the unaltered digest.
2. **Read-back verified.** After each write the bytes are re-read from disk and
   must reproduce what was written, re-derive the same RFC 8785 canonical digest,
   satisfy the digests the artifact records about itself (`receipt_digest`,
   `output_digest`) and satisfy the declared cross-artifact bindings —
   `semantic-input.json` must still hash to `corpus.normalized_packet_digest` and
   the capture's output to `corpus.raw_packet_digest`. Any failure throws; there
   is no repair path and no warning tier. The same verification runs on the way
   in, so a corrupted artifact is refused where it would be consumed.
3. **Immutable.** A write that would replace an existing artifact with different
   bytes is refused (preregistration §9.1, §9.3). A byte-identical rewrite is
   permitted, which is what keeps the `--freeze` determinism check meaningful. A
   `--live` run additionally refuses **before** the call if its attempt directory
   already holds artifacts, so a repeat neither overwrites the earlier attempt
   nor wastes the new one.

`--attempt <n>` names the attempt and defaults to 1. The operator states it; the
harness never renumbers one on their behalf, because preregistration §9.1 makes a
retry a fresh independent call the operator records and ADR 0036 §10 makes any
model retry a new logged run. When a run directory is already populated the
refusal names the next free attempt number.

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

## What consumes this

Slice C — the isolated paired primary/audit scoring transport — takes the run
directory this slice writes and carries it to the designated scorer. See
`Phase_3A_D1_Paired_Scoring_Transport_Handoff.md` for its command, gates,
artifacts and the point where editorial scoring begins.
