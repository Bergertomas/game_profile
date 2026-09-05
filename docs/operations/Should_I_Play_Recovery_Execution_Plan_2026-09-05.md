# Should I Play — Recovery Management and Execution Plan

- **Date / baseline:** 5 September 2026; main `e7dd4aae3623d6cb70e51ea2b8a7d964b96f134d`.
- **Authority:** Tomas's 5 September instruction to implement audit-driven Master Plan corrections and execute an immediate parallel plan using Claude extensively, recorded in [#113](https://github.com/Bergertomas/game_profile/issues/113). This is an execution plan beneath the Master Plan, Working Agreement, current AI allocation and subject-specific authorities.
- **Coordination:** #113 owns recovery; #101 remains the measured D1 record. Main Appendix B preserves original Items 1–12.
- **State at issue:** two Claude lanes dispatched (#114 xhigh, #115 High); management reconciliation and independent integration review owned by ChatGPT/Astra. Dispatch is not acceptance or completion.

## 1. Outcome and scope

Restore an executable, evidence-backed critical path from D1 through Phase 3A
and onward to a useful real product. Repair the specific transport defects,
remove misleading current-state instructions, make production integration an
explicit effect-aware decision, and measure actual research/editorial throughput.

The product thesis, eight dimensions, no-aggregate rule, Unknown/range semantics,
static architecture, accepted visual direction, cohort and launch thresholds
remain sound working authorities. No new platform, methodology rewrite or
design rediscovery is justified by this recovery task.

Items 1–5 remain completed historical decisions. Newly discovered transport
defects are current Item-6 preconditions; they do not erase the earlier
engineering acceptance. Final Draft scope was resolved in PR #112. The
0010 and separately authorized 0011 migrations are already applied. Their
authorizations must not be reused for another production action.

## 2. Evidence behind immediate priorities

| Finding | Source at baseline | Consequence / required correction |
|---|---|---|
| M1: model must author SHA-256 of its generated captures | `lib/calibration/research-pass.ts` model-owned source manifest, derived schema and freeze digest comparison; fixtures use local `createHash` | Derive transport without model-authored hash fields; wrapper computes exact capture hashes and assembles canonical corpus. Preregistration §4.1 permits deterministic local capture/hash tooling. |
| M2: scorer input omits required provenance | `normalizedScoringPacket`, `request-builder.ts`, `d1-scoring.ts`; validator uses source tier/independence/dates | Carry necessary frozen source metadata into both identical scoring inputs; exclude candidate/rejection log and research commentary. |
| Merge/production authority conflict | Working Agreement §4 versus ADR 0008, README and `scripts/cf-deploy.mjs` | **Resolved 5 September 2026.** Tomas approved standing orchestrator authority to accept, merge and deploy in-scope reviewed engineering work through existing main/Workers wiring; Working Agreement §4.1 owns the conditions. Owner gates for production DB work, publication, credentials/access/settings/domains/billing/spending, methodology/freeze/adoption and unresolved product direction are unchanged. |
| Recovery state differs from current navigation | Work read on 5 September: Event Wake enabled; former Watchdog was the expired Night Run, disabled after 06:01 UTC; guide retains post-prompt requalification | **Recovery decision taken.** The existing task `6a9a57402f248191857fc31c2cd46baf` is restored as `Should I Play — Watchdog`, enabled and hourly without expiry. Current-prompt qualification is still owed; do not assert event-path requalification or infer a completed recovery run from configuration. |
| CI dependency warnings untriaged | Baseline CI reports 9 vulnerabilities, including 2 high | #115 identifies packages, reachable exposure and minimal remedy. Severity alone is not a production exploit conclusion. |
| Real evidence and full product journeys unproven | #101 attempt 1 refused; no frozen real corpus/pair; content registries empty despite working foundations | Obtain D1 evidence first, then measured production and real 12–15-profile journeys. Fixture completeness does not establish product validation. |

These are implementation/evidence findings. M1/M2 did not cause the recorded
attempt-1 refusal: that record identifies the now-resolved scope ambiguity.
No audit observation substitutes for inspection of the actual retained artifacts.

## 3. Work ownership and parallel execution

| Lane | Executor / effort | Owned files or output | Dependencies | Acceptance owner |
|---|---|---|---|---|
| A — #114 D1 transport | Claude xhigh | Relevant calibration transport/types/tests/scripts and the B/C handoffs only | Current authorities; no dependency on B | ChatGPT/Astra inspects actual diff and offline proof |
| B — #115 operations | Claude High | New recovery operations evidence report only | Independent read-only repo/CI/platform evidence | ChatGPT/Astra validates evidence and owner packet |
| C — management | ChatGPT/Astra | Master Plan, bootstrap, Working Agreement, README, ADR-0037 status, this plan; narrow wake/runner current-state reconciliation | Current-main evidence and owner instruction | Independent Claude review informs ChatGPT acceptance |
| D — management review | Claude High, after C PR exists | Review comments only; no overlapping edits | Exact management PR head | ChatGPT fixes material findings |
| E — #118 dependency remediation | Claude High | Compatible package-lock update and its evidence note only | #115's reproduced audit; independent of calibration code | ChatGPT reviews diff, audit and full runtime CI |
| F — concrete follow-ups | Claude High/xhigh by risk | Only files named in a subsequently bounded issue | Accepted A/B evidence and any applicable owner decision | Independent review before integration |

Two concurrent Claude workers are the normal target. A third qualifies only
when the management PR is ready for read-only independent review: no file,
branch or contract collision with A/B. Do not split M1 and M2 into simultaneous
writers in the same research/freeze contract.

Before launch, inspect active/queued Actions, open PRs, recent task comments and
file ownership. Use one task branch per assignment, the runner's canonical
issue prefix, and complete the push/PR handoff. A reviewer does not self-merge.
No worker gains acceptance, scoring, holdout, production or publication authority.

#113 is the single recovery coordination frontier. While the originating
ChatGPT session is active, other orchestrator sessions inspect and avoid
duplicating its assignments. Event-level claims still follow the wake guide.
If the session ends, its latest checkpoint must release/transfer coordination,
name active runs and exact heads, and state the remaining gate. A new session
must reconstruct actual state; a stale “active” sentence is not a permanent lock.

## 4. First execution wave — deliverable contracts

### A. D1 transport repair (#114)

**Done means:** a coherent PR with executable transport, complete scorer input,
unchanged controlled files, deterministic replay and meaningful refusal tests.
The issue owns the exact acceptance list and file boundary.

Required evidence:
- current-main/base/head SHAs and changed-path list;
- real derived-schema fixture that succeeds without any model-supplied hash;
- exact UTF-8 capture hashing, including newlines/unicode; post-freeze tampering
  and missing/duplicate links refuse;
- source tier/cluster/date changes affect scorer-visible bytes and digest;
- both isolated requests consume identical source provenance and source order;
- candidate/rejection log and research commentary absent from scoring;
- immutable artifact readback and cross-binding checks remain enforced;
- old artifact versions remain replayable or receive explicit versioned
  incompatibility diagnostics; old refused attempt never becomes silently
  “repaired” data;
- relevant calibration suite, typecheck and lint; exact controlled lock
  `4d78ed79c02654972a96e02f0211282e0b4386ed9e93c16cf2de255375d7c2ce`.

Use synthetic sources only. No live D1 request, source acquisition, scoring,
model substitution or protected holdout work. If a controlled change is truly
necessary, stop at the precise conflict and follow the preregistration's owner
amendment/rerun rules. Do not adjust thresholds to make tests pass.

### B. Operations evidence and concrete decisions (#115)

**Done means:** one evidence report with facts, inferences and unavailable
checks distinguished, plus a minimal execution proposal for each real risk.

- Trace main → Workers Builds → deploy; separate CI success from canonical-origin
  manifest proof. Verify public manifest/configuration only through authorized
  read access. Unavailable access remains a named gap.
- Triage exact dependency advisories against the committed lockfile and actual
  runtime/build/test exposure. Propose bounded remediation when justified,
  without broad upgrades.
- Enumerate current-prompt wake qualification still owed after #106/#107;
  retain accepted historical proofs and avoid repeating the entire smoke suite.
- Prepare the minimal main required-check/review option; do not alter access policy.
- Supply a recovery schedule recommendation; Work-side current configuration is
  checked by ChatGPT, not inferred from the runner's lack of access.
- No workflow, dependency, live task, secret, access-policy, Cloudflare or Neon
  changes in this evidence assignment.

### C. Management reconciliation

**Done means:** a reviewable docs PR whose current instructions agree:
active Item 6, completed Item-5 integration, closed Final Draft gate, current
AI allocation, current transport blockers and truthful production/recovery
observations. Preserve historical frozen text, owner decisions and original
checklist numbers. Link this plan rather than duplicating its queue everywhere.

Close stale tracker issues only where existing repository evidence satisfies
their exact acceptance; otherwise narrow their body and retain the actual
remaining work. Keep #42 and #50 as their valid deferred/objective records.
Do not turn cleanup into a second constitutional audit.

## 5. Integration and owner decision packet

**Superseded 5 September 2026 by owner approval.** Working Agreement §4.1 now
delegates acceptance, merge and code deployment of in-scope reviewed engineering
work to the orchestrator through the existing main/Workers wiring. ADR 0008's
main/Workers deployment effect is a fact to verify and roll back, not a per-PR
owner gate; a docs-only diff can still trigger deployment, and that is expected
rather than blocking. The generic runner still lacks production credentials and
never merges or deploys its own work.

Every integration still requires exact-head review, actually successful
applicable CI, sound current-base integration, pre/post canonical-origin
verification and a known rollback reference. The precise live dashboard settings
remain uninspected in this session; read-only inspection is routine when
authorized access is available, while changing live settings remains owner-gated
configuration work. Do not change production configuration to avoid or widen the
delegation.

| Decision | Recommended bounded treatment | Required point | What it does not authorize |
|---|---|---|---|
| Recovery main integration | **Decided 5 September 2026:** standing delegation granted. The orchestrator merges and deploys exact reviewed in-scope commits through existing main/Workers wiring under Working Agreement §4.1, with rollback reference recorded and origin verified before and after. | No longer a per-PR owner point | DB writes/imports, editorial publication, secrets/access/settings/domain/billing changes, methodology/freeze/adoption, unresolved product direction |
| Standing recovery after Night Run expiry | **Decided 5 September 2026:** the existing task `6a9a57402f248191857fc31c2cd46baf` is restored as `Should I Play — Watchdog`, enabled, hourly on the hour Asia/Jerusalem from 21:00 without expiry, on the #113 comment `5550624826` recovery-only prompt. Existing task reused, not duplicated. Event-primary claims still wait on current-prompt requalification. | Satisfied | New production/scoring permissions, model substitution, or any claim that the event path is requalified |
| Minimal main guard | Adopt only specific required checks/review controls justified by #115, considering the one-owner review/runner setup | Before changing access policy | Organization-wide governance redesign |
| Required facets / Rubric v1.1 | Decide from D1–D6 evidence under ADR 0024 §4 | Item 7, before holdout/freeze sequence | A preemptive methodology choice in this plan |
| Immutable-package approval lifecycle | Prepare recommendation from real editorial trial; approved-only immutable content is a candidate, not an adopted choice | Before related migration/first import | Production migration itself |
| Candidate freeze and final adoption/depth | Present exact candidate and later all gate/effort evidence | Items 8 and 10 respectively | Automatic publication |
| Artwork / provider / privacy operating decisions | Batch precise records and recommended options; use existing approved principles | Before affected assets/public-commercial use/collection | New asset rights by inference or a public launch decision |

Known production evidence must include the deployment target, build/commit,
pre-change manifest if obtainable, planned verification and rollback to the
previous known-good artifact. If unavailable, the decision packet says so.
Do not claim a policy choice or release was approved merely because Tomas
authorized plan restructuring and engineering work.

## 6. D1 restart and measured-run management

When A is accepted and safely integrated:
1. Fresh live-main preflight and #101 inspection; verify no other execution is
   active and attempt numbering still matches the immutable record.
2. Verify the six controlled files and exact lock. Confirm registered Sol model,
   parameters, isolated contexts, tool restrictions, non-CI runtime and credential
   availability without exposing a credential.
3. Produce the fresh first-party ADR-0035 maturity observation. Apply the
   already-approved standard-first-playthrough scope and exclusions from PR #112.
4. Run offline/dry preflight and required holdout-identifier inspection from #95.
   Never use an audit summary as permission to skip a gate.
5. Execute only the existing conditionally authorized attempt 2. No automatic
   retries. Preserve raw attempt and frozen artifacts, digests, usage, elapsed
   time and refusal details. A further attempt needs the governing retry ruling.
6. Independently inspect the actual persisted real corpus: exact bytes and
   cross-bindings, coverage/depth, admission/provenance, maturity/scope, credible
   disagreement, grade masking, leakage and deterministic replay. Unavailable
   raw artifacts mean acceptance cannot be asserted.
7. Only after real-corpus acceptance, run the registered isolated primary/audit
   pair. Report pre-adjudication metrics; adjudication does not improve them.
8. Validate D1 and record its acceptance or exact defect/frontier in #101.
   Only accepted D1 unlocks D2. Complete D2–D6 sequentially as preregistered.

A successful schema response is not adequate evidence by itself. Same-corpus
agreement does not establish external validity or usefulness. Source independence
must be supported, not inferred from different URLs. Absence of evidence remains
Unknown/refusal as prescribed; engineering must not invent a score or source.

## 7. Return to the remaining original checklist

| Item | Entry condition | Evidence to finish / handoff |
|---|---|---|
| 6 | Corrected integrated transport + fresh registered preflight | Six accepted development cases, isolated pair artifacts, provenance and per-pass time/cost/QA record |
| 7 | All development cases accepted | Development-only analysis, required-facet owner decision, launch-window and evidence-bounded pre-release rehearsals; material fixes and affected reruns |
| 8 | Item 7 complete and no material unresolved defect | Owner freezes exact protocol/rubric decision/prompts/schema/model/configuration/harness with commit and digests |
| 9 | Freeze complete | H1–H4 research and pairs under frozen rules; untouched until entry, no tuning from holdout |
| 10 | Holdout complete | All registered gate results including failures, confidence/endpoint/traceability/derivation, limitations and effort; owner adoption/return-to-development and production-depth decision |
| 11 | Adopted outcome and applicable lifecycle decisions | Validated package/publication preparation, migration/import plan if needed; separate production/publication permission |
| 12 | Governing prior items and accepted design source available | One bounded Compare/#42 conformance pass, exact-row/range/Unknown/accessibility proof and owner visual acceptance |

No holdout title/source research or packet preparation is a parallel task before
Item 8. No measured scorer replacement follows from Astra orchestration.
No workload quota changes the experiment.

## 8. Product and launch execution after Phase 3A

### Private validation — 12–15 substantive profiles

Run the first real editorial trial before expanding session/facet/eleven-axis
schema. Then form parallel product/content lanes only against accepted contracts:

- **Editorial/content:** approved evidence-backed profiles, scope/provenance,
  practical time/store facts, editorial shelves and curated comparisons.
- **Public journey implementation:** discovery UI and truthful result states,
  recognized-title/coverage-request flow, corrections/About/disclosures; finish
  deferred conformance under accepted canonical design.
- **Release operations:** lawful mixed artwork/artless assets, provider/manual
  factual path, local event instrumentation and required privacy decisions,
  first real application Publish → dispatch → manifest → Live proof.

Test actual purchase-decision tasks on real content: find, compare exactly two,
interpret uncertainty, understand mismatch risk, inspect evidence and select a
verified official destination. Include mobile, keyboard, screen-reader and
representative real-art states; Chromium fixture tests alone do not prove all of
these. Capture concrete confusion/task failures and correct material defects.
Do not manufacture activation, traffic or conversion metrics before collection
is approved and operating.

Exit only with coherent real journeys, measured editorial throughput, resolved
publication blockers and documented learning. This is private/limited validation,
not a marketed broad launch.

### Catalog and quiet release — approximately 100 profiles

Use observed production effort and quality to choose batches and staffing.
Prioritize recognizable decision-relevant titles and useful comparisons with
evidence availability; no rigid genre quota or thin programmatic pages.
Operate reassessment ownership, factual refresh signals and review windows.
Supply an approved routine metadata adapter or a sustainable documented manual
fallback; Item-5 staging alone is not that adapter.

Complete Master Plan §18: substantive catalog, coherent journeys, methodology
and accountability, lawful assets, provider/commerce/privacy operations,
accessibility/performance/SEO/social checks, security/dependency disposition,
backup/recovery and first-publication proof. Owner authorizes quiet release.
Business objectives of $5k/$10k/$20k gross monthly revenue remain objectives;
no forecast or launch date is supported until real throughput and audience
evidence exist.

## 9. Management cadence, metrics and failure recovery

Use completion events for prompt review during active orchestration; a watchdog
is recovery, not the throughput clock. Do not claim current event-primary
reliability until the guide's requalification is recorded. Never synthesize a
claim or mark a qualification gate passed from configuration inspection alone.

At each accepted result or material blocker, update #113/#101 as appropriate:
exact main/base/head, active runs/PRs, result and evidence, correction versus
acceptance, next eligible action, owner/access blocker and coordination handoff.
One bounded correction round is normal; further rounds require a concrete
remaining material risk. Do not restart the whole audit after a narrow fix.

Track **observations**, with timestamps and denominators:
- queued/run/CI/review/integration elapsed time and correction loops;
- accepted outcomes per Claude window, actual capacity/exhaustion where visible;
- per-pass API usage/cost and elapsed time; research, editorial QA and adjudication
  minutes separately, including failed attempts;
- evidence scarcity, refusal and Unknown reasons;
- profile production/revision effort and publication-to-Live latency;
- private-test task failures and comprehension; later approved acquisition,
  continuation and commercial intent/revenue measures.

Claude's 70–90% useful-window utilization remains an aspiration, never a quota.
Do not infer subscription capacity from an idle Actions list or invent baseline
throughput. If capacity is exhausted, record the reported reset, preserve work,
do independent review/planning and resume the highest-value task after reset.
Do not repeatedly retry against the same exhausted capacity or insufficient
turn envelope. An auth failure is different from quota or an implementation bug.

## 10. Review and observation checkpoint

Independent Claude review of management PR #116 at `3f27909` verified the original
checklist, controlled-file exclusion and preserved owner gates. Its one blocking
finding was the wake guide's contradictory “armed” statement; lane C added the
dated current observation there. Narrow follow-ups also restored explicit
orchestrator duties, role flexibility and per-slice visual/accessibility review,
and reconciled the runner masthead.

#115 delivered PR #117. Its source report was sent through one bounded accuracy
correction round: deployment timing is not proof of no human intervention;
manifest entries are not total database contents; bundle-directory absence
cannot establish universal vulnerability non-reachability; PR+checks with zero
approvals does not enforce independent review. Accept the corrected evidence,
not the original overstatements.

The originating orchestrator independently fetched the public origin manifest
on 5 September and re-derived its entry digest:
`cc08d7242cc41f100f67728bcacda77736a8ff23701581ed730df3b2a95ced1f`.
It identifies production/database, main `e7dd4aa`, build
`1de37fcf-f2d7-401c-9eab-fc19312fca86` and three published entries.
This resolves the earlier audit's inaccessible-origin limitation. It does not
prove dashboard trigger settings, future deployment timing or any new editorial
publication. A subsequent second-client HTTP request was denied; the successful
curl observation and matching manifest digest are the stated evidence.

#118 is the bounded compatible dependency-remediation assignment arising from
the audit. Its files are independent of calibration and management; no merge or
production authority is implied. Historical trackers #35/#47/#59/#61 were
closed with explicit existing-main completion evidence; #42/#50 remain valid.

## 11. Completion boundary for recovery

Recovery completes when:
- the management docs agree and the original checklist remains intact;
- the two transport defects are independently accepted and integrated under
  actual applicable deployment authority;
- #101 can run current preflight on a suitable runtime, or has one precise
  external access/owner gate rather than a misleading READY claim;
- operation/dependency findings have bounded dispositions, with no false claim
  of current Live or wake/watchdog proof;
- the coordinator has advanced every currently eligible action and left an
  exact durable frontier for the next one.

A branch/PR is implemented work; acceptance, merge, deployment, real-corpus
acceptance and final product adoption are separate evidence-backed states.
