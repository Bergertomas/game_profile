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

The shared OpenAI transport applies one explicit 600-second bound at both the
AbortController and Undici header/body dispatch layers. Node Fetch otherwise
supplies Undici's 300-second per-request defaults, which match D1 attempt 2's
observed 300095 ms failure ahead of the harness's abort timer (issue #126).
That attempt did not retain its nested cause, so the default is the strong
transport diagnosis rather than a proven cause, and it establishes nothing about
the provider's processing state. D1 attempt 3 then held one request open for
334398 ms and terminated on a provider tokens-per-minute rate-limit response
rather than a socket timeout, which confirms the corrected bound is in force; it
still proves nothing about provider processing or spend for either attempt. The
dispatcher changes the bound only: it adds no retry or fallback. A transport failure retains the safe nested
error class/code when one exists, so the ledger can distinguish an Undici
timeout from the outer `TypeError: fetch failed` without storing headers or
credentials.

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
   view, strict capture/manifest linkage followed by wrapper-computed content
   digests (below), all seven query families present exactly once, the declared
   collection standard reproduced by the manifest's independent active A/B
   clusters, and the canonical `$defs/corpus` schema satisfied.

## The research transport contract (v2, issue #114)

Transport v1 projected the canonical `$defs/source` unchanged into the
model-facing schema, so it demanded `normalized_content_digest` — a required
lowercase SHA-256 — and `raw_content_digest` from a pass whose only tool is web
search, and the freeze then compared that model-stated value to its own hash of
the same text. **The contract was not executable.** It looked executable only
because the test fixtures computed the digests locally with `createHash`, which
is exactly the capability the live model does not have.

Preregistration §4.1 settles it directly: web search only as configured, and
"deterministic local capture/hash tooling may run outside the model". So:

- the model-facing `$defs` carries a derived `capturedSource` — the canonical
  source record **minus** the two wrapper digests. It is derived from the
  controlled bytes by removal only, so a canonical field the model owns appears
  automatically and one that disappears disappears here too; the canonical
  `$defs/source` itself is read, never rewritten, and a canonical schema that
  stopped declaring either digest fails the projection loudly;
- the transport-only record is `source_captures`: one entry per source with
  `normalized_content` and a nullable `raw_content`. `raw_content` is nullable
  exactly as `raw_content_digest` is — a source whose raw bytes were not retained
  records a null digest, never a fabricated one;
- the wrapper validates the linkage strictly and then computes both digests over
  the exact UTF-8 bytes of the captures. It refuses a model-stated wrapper digest
  (even a correct one: a model cannot compute SHA-256, so a stated value is a
  fabrication that occasionally coincides), a missing or duplicated capture, a
  capture for an unknown source, a capture that is not a non-empty string, and a
  capture carrying an unpaired surrogate — which has no UTF-8 encoding, so its
  digest would commit to substituted bytes;
- the raw model output is preserved separately and unrepaired in `capture.json`,
  and `raw_packet_digest` is still taken over it. The assembled manifest is
  visibly a wrapper derivation.

**Versioning.** The capture, the receipt and the frozen packet each carry the
transport version. A v1 capture is refused on `--freeze` **before** anything is
derived or written, with a diagnostic naming the superseded contract and the
remedy, so an existing attempt directory is left exactly as it was recorded
(preregistration §9.1, §9.3). An attempt the v1 freeze already refused stays
refused. Slice C refuses a pre-v2 packet by version for the same reason.

## Artifacts (git-ignored, `calibration-runs/d1-research/<runId>/`)

`<runId>` is `d1-research-<semanticRequestDigest[0..24]>-a<attempt>`, so every
attempt has its own directory.

| File | Contents |
| --- | --- |
| `capture.json` | The raw model output, `transport_version`, run facts, `frozen_at`, the semantic request digest and `output_digest` over the model output. Written even when the freeze refuses the output, so a failed attempt stays evidence; a refused attempt lands in `d1-research-unfrozen-<digest>-a<attempt>/`. |
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
   `semantic-input.json` must still hash to `corpus.normalized_packet_digest`,
   each of its entries' capture text must still hash to that source's
   `corpus.source_manifest[*].normalized_content_digest`, and the capture's
   output to `corpus.raw_packet_digest`. The per-source binding exists so an edit
   names the source it touched instead of only reporting that the packet as a
   whole no longer matches. Any failure throws; there is no repair path and no
   warning tier. The same verification runs on the way in, so a corrupted
   artifact is refused where it would be consumed.
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

Its members are `packet_version`, `evaluation_scope` (with `evidence_cutoff`
materialized from the freeze's UTC calendar date through slice A's
`freezeD1EvaluationScope`), `coverage_frames`, `normalized_corpus` and
`canonical_source_order`. The normalized corpus is ordered by the canonical
source order, so its bytes are a function of the frozen corpus rather than of the
model's array order, and `buildScoringRequest`'s `normalized_packet_digest`
reproduces `corpus.normalized_packet_digest` exactly. Slice C should assert that
equality before spending a paired call.

Each `normalized_corpus` entry is the **whole frozen canonical source record**
plus its `normalized` capture text. That is admissibility rather than generosity:
Protocol §4.4 forbids an active Tier-D claim from supporting a number, §4.1 bands
the collection standard by independent active A/B clusters, and §15.1(6) decides
retrospective elapsed time from publication dates — and the semantic validator
enforces all three after the run. A packet that hid `source_tier`,
`independence_cluster_id`, `publication_date`, `accessed_at`, the locator and the
disclosure/dependency fields was asking both scorers to satisfy rules from facts
they were never given (issue #114, finding M2). Because the whole canonical
record is projected, a later canonical source field reaches both scorers
automatically rather than waiting for a hand-maintained list to be updated.

Deliberately absent from the scoring view, per preregistration §3.2: the
candidate/rejection log, the collection standard and reason, the query-family
audit, the research run manifest, the research completion report and any research
commentary. Slice C must not reintroduce them, must expose no tools (ADR 0036
§6), and must not consult the research context.

One consequence worth stating plainly: the §4.6 review-grade mask now runs over
the source titles and locators too, because they are part of the scoring view.
A locator whose path reads as a grade (`…/9/10/…`) will refuse the freeze. That
is the mask working as written rather than a new rule, and narrowing it would be
a methodology decision rather than an engineering one.

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
- `source_captures` and `research_completion_report` are transport-only records:
  the package schema stores digests of content that lives outside it, and the
  frozen prompt asks for a completion report the schema does not define. Neither
  adds methodology — the manifest's content digests are computed by the wrapper
  from the capture bytes at freeze, and the report's derivable items are computed
  from the frozen corpus rather than requested from the model.
- The frozen research prompt's step 12 asks the model to "freeze … timestamps,
  and digests". The wrapper already owned the freeze timestamp, both packet
  digests, the canonical source order and the masking assertion, because the
  model cannot know them; the per-source content digests are the same kind of
  fact and are now owned the same way. No controlled input was changed, and none
  needed to be. If the orchestrator reads step 12 as reserving the per-source
  digests to the model, that is a preregistration question rather than an
  engineering one — but the contract cannot be executed that way.
- The canonical source order is active sources first, then superseded, each group
  in UTF-16 code-unit order of source ID. Protocol §4.7 requires the order to be
  frozen and hashed but does not define it; this is a mechanical determinism rule
  and is stated here so it can be ratified or replaced deliberately.

## What consumes this

Slice C — the isolated paired primary/audit scoring transport — takes the run
directory this slice writes and carries it to the designated scorer. See
`Phase_3A_D1_Paired_Scoring_Transport_Handoff.md` for its command, gates,
artifacts and the point where editorial scoring begins.
