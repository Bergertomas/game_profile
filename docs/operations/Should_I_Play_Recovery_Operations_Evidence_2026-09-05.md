# Should I Play — Recovery Operations Evidence, 5 September 2026

- **Status:** evidence and decision-preparation report. **Authorizes nothing.**
- **Assignment:** issue #115 (parent #113), independent Claude High lane, alongside #114
- **Author:** repository-native Claude runner (`claude/issue-115-20260905-0747`)
- **Observed at:** `2026-09-05T07:47:18Z` – `2026-09-05T07:53:21Z` (UTC)
- **`main` verified at:** `e7dd4aae3623d6cb70e51ea2b8a7d964b96f134d` (`e7dd4aa`), *"calibration: clarify D1 Final Draft scope (#112)"*, committed `2026-09-04T23:02:50Z`
- **Branch head this report was produced from:** the same `e7dd4aa`, checked out on the task branch

### Revision 2 — evidence correction round, 2026-09-05

Requested by Tomas on PR #117 at branch head
`cf2c4f3d8b077faf1a62b3138cc88392ebf30833`. **Accuracy corrections only.** No new
audit, no re-run of the §2 build, no expanded hardening scope, and no live
mutation. The baseline is unchanged: `main` at `e7dd4aa`, observation window
`07:47:18Z`–`07:53:21Z`, and every originally observed fact, timestamp, ID and
count is preserved exactly. The only new observation is the read-only re-fetch in
Appendix A at `2026-09-05T08:01:08Z`, which returned the same artifact.

What changed, and why — several revision-1 conclusions exceeded their evidence:

| # | Revision 1 said | Revision 2 says | Where |
|---|---|---|---|
| 1 | the build "finished without a human step"; every merge deploys; ~5 min delivery | automatic Workers Builds causation is an **inference** consistent with the ADR/config record; no accessible dashboard/audit history, so human intervention **cannot be excluded**; `generatedAt` is a build stamp, **not** an observed activation time; `5 m 26 s` is one interval, not a guarantee | §1.2, §1.3, §1.4, §6.3 |
| 2 | `source: database` ⇒ the authoritative DB holds exactly three; "a build with no database falls back to fixtures" | it proves **three published entries in this manifest**, not DB row counts, and not which DB/credentials; production **fails closed** — `lib/data/games.ts` throws rather than falling back. The revision-1 sentence contradicted the code and is corrected | §1.2, §1.3, §6.3 |
| 3 | "none of the nine ships in / reaches production" | package-**directory** absence is not proof code is absent from bundled output — as the vendored `nanoid` loop shows. **No demonstrated first-party reachability**; universal non-reachability **not** proven. Tool/build exposure retained as a standalone reason for the bounded patch | §2.3, §2.5, §6.3, §6.4 R5 |
| 4 | the ruleset "makes 'reviewed' mechanically true" | it enforces **PR + required checks**; at 0 approvals GitHub merges unreviewed PRs, so independent review stays an **orchestrator process duty**. Admin bypass restated as an explicit exception | §1.5(a), §4.2, §4.3, §6.4 R2 |
| 5 | manifest shown abbreviated, entries elided | **Appendix A** carries the verbatim body and headers with the observation timestamp; every excerpt is labelled abbreviated | §1.2, Appendix A, E1 |
| 6 | "complete-except-F"; §3.6 read as disclaiming the procedure | requalification is **PENDING in full** until Work behaviour is observed; complete-except-F is a possible **future** state. The §3.4 procedure **is** proposed | §3.6, §5.3 |

Where revision 1's phrasing is withdrawn, the text says so at the point of
correction rather than only here.

This report records observations and options. It does **not** approve a deployment
authority model, does not restore or change any schedule, does not change any
dependency, workflow, branch-protection or platform setting, and does not declare
any gate passed. Every recommendation below is a proposal for Tomas or the
program owner/orchestrator to decide.

## 0. Preflight receipt and scope discipline

Read before any conclusion below: `AGENTS.md`;
`docs/Should_I_Play_Orchestrator_Bootstrap.md`;
`docs/Should_I_Play_Working_Agreement.md`;
`docs/operations/Should_I_Play_AI_Role_Allocation_2026-09-05.md`;
`docs/operations/Claude_Code_GitHub_Runner.md`;
`docs/operations/ChatGPT_Work_GitHub_Wake.md`;
Master Plan v0.9 §§8.4, 9.8, 9.9 and its status/*Public-product state* headers;
`docs/decisions/0008-cloudflare-hosting.md`,
`docs/decisions/0020-publication-preview-and-deploy-trigger.md`,
`docs/decisions/0022-deployment-requests-and-proof-of-live.md`; `README.md`
(deployment, Published-vs-Live and `cf:*` sections); `.github/workflows/ci.yml`,
`.github/workflows/claude.yml`, `.github/workflows/orchestrator-wake.yml`;
`scripts/cf-deploy.mjs`, `scripts/cf-common.mjs`; `package.json`,
`package-lock.json`.

**What was actually done to the repository:** one new file — this one. No source,
test, workflow, lockfile or configuration file was modified.
`git status --porcelain` was empty before the report was written, and the local
`npm ci` / OpenNext build used for §2 wrote only into gitignored paths
(`node_modules/`, `.next/`, `.open-next/`). The dependency-remedy experiment in
§2.4 ran in `/tmp/depfix`, on a **copy** of `package.json` and
`package-lock.json`, so the repository lockfile is untouched.

**Revision 2 added nothing to that list.** It edited this file only. Its sole
new action against anything outside the repository was one unauthenticated
read-only `GET` of the public deployment manifest (Appendix A); no build was
re-run, no dependency command was executed, and no other file was touched.

**Everything reachable only through the ChatGPT Work product is unavailable to
this runner.** Task existence, task state, automation IDs, schedules, prompts as
actually pasted, run transcripts and last-run times cannot be read or verified
here. Where this report refers to them it says so explicitly and attributes the
claim to its source.

---

## 1. Deployment: what merging `main` actually does

### 1.1 The chain, traced to its end

| Link | What the repository/CI proves | Where |
|---|---|---|
| PR merges to `main` | proved | PR #112 merged `2026-09-04T23:02:50Z`, producing `e7dd4aa` |
| GitHub Actions `CI` runs on `push` to `main` | proved | `.github/workflows/ci.yml` `on.push.branches: [main]`; run `33927977061`, both jobs green |
| GitHub Actions deploys | **proved false — no deploy step exists** | `ci.yml` has exactly two jobs, `Quality` and `Integration`; neither runs `cf:deploy`. No workflow in `.github/workflows/` invokes any `cf:*` deploy script. There is **no** deployment credential in GitHub Actions |
| Workers Builds builds `main` and runs `npm run cf:deploy` | **not verifiable from the runner** | this is dashboard configuration. ADR 0008 records the intended settings (Deploy command `npm run cf:deploy`, non-production `npm run cf:deploy-preview`, production branch `main`) but the dashboard itself cannot be read here |
| `cf:deploy` refuses non-`main` | proved as code | `scripts/cf-deploy.mjs` exits 1 when `WORKERS_CI_BRANCH` is set and is not `PRODUCTION_BRANCH`; `scripts/cf-common.mjs` sets `PRODUCTION_BRANCH = "main"` |
| **The production origin serves an artifact built from `main` HEAD** | **proved, from the artifact itself** | see §1.2 |

### 1.2 App-origin evidence — the only kind ADR 0022 accepts

Read-only `GET https://shouldiplay.gg/deployment-manifest`, response observed
`2026-09-05T07:52Z`, HTTP 200, `x-opennext: 1`, `server: cloudflare`. Abbreviated
here; the **verbatim** body and headers, re-fetched read-only at
`2026-09-05T08:01:08Z`, are in Appendix A:

```json
{
  "schema": "should-i-play/deployment-manifest@1",
  "generatedAt": "2026-09-04T23:08:16.051Z",
  "siteEnv": "production",
  "buildUuid": "1de37fcf-f2d7-401c-9eab-fc19312fca86",
  "commitSha": "e7dd4aae3623d6cb70e51ea2b8a7d964b96f134d",
  "branch": "main",
  "source": "database",
  "rubricVersion": "1.0",
  "digest": "cc08d7242cc41f100f67728bcacda77736a8ff23701581ed730df3b2a95ced1f",
  "entries": [ /* ABBREVIATED — alan-wake-2, redfall, returnal; verbatim in Appendix A */ ]
}
```

This is the evidence class ADR 0022 §1 calls the only one that answers the
question. It is not a green Cloudflare check and not a build report; it is the
production origin naming the commit it was built from.

**A note on what `generatedAt` is.** It is a value the *build* stamped into the
artifact. It is **not** an observed time of production activation, and this
runner observed no activation event at all — only that, at `07:52Z`, the origin
was already serving this artifact. The activation happened at some unobserved
moment between `generatedAt` and the first probe.

What follows, at the strength the evidence supports:

1. **Fact. Production currently serves an artifact built from `e7dd4aa` —
   current `main` HEAD.** Not an older artifact. This is a direct observation of
   the response.
2. **Fact, then inference.** The *fact* is two timestamps: PR #112 merged
   `2026-09-04T23:02:50Z`; the served artifact records
   `generatedAt 2026-09-04T23:08:16.051Z`, **5 m 26 s** later. The *inference* is
   that the merge triggered an automatic Workers Builds build and deploy. It is
   an inference consistent with the ADR/config record — ADR 0008 records the
   production branch as `main` with Deploy command `npm run cf:deploy`, no
   GitHub Actions workflow deploys (E12), and README records the
   application-originated Cloudflare Builds POST as never exercised — but it is
   **not proven from the origin**. Specifically, and deliberately not claimed:
   - It does **not** prove the build ran *without a human step*. Cloudflare
     build history and the dashboard audit log are unreadable from this runner,
     so a manual dashboard build or retry within that window **cannot be
     excluded**. An earlier draft of this report asserted "finished without a
     human step"; that assertion exceeded the evidence and is withdrawn.
   - It does **not** establish what *every future* merge to `main` will do.
     Trigger configuration is dashboard state that can change and that this
     runner cannot read; one observation of one merge is not a rule.
   - It is **not** a five-minute delivery guarantee. `5 m 26 s` is one measured
     interval on one build, and it measures merge→`generatedAt`, not
     merge→public availability. Where this report elsewhere says "about five
     minutes", read it as *the one observed order of magnitude*, not an SLO.
3. **Fact, narrowly.** `"source": "database"` with `siteEnv: "production"`
   records that **this artifact's** published corpus was read from a Postgres
   connection rather than the fixture path, and this manifest publishes
   **three** entries (`alan-wake-2`, `redfall`, `returnal`; Appendix A).
   It does **not** prove *which* database or which credentials were used, and it
   does **not** prove the database contains exactly three rows or exactly three
   evaluations — only that three entries are published in this manifest at
   `rubricVersion 1.0`.
   Note also that production **fails closed**: `lib/data/games.ts`
   `databaseIsRequired()` returns true whenever `SITE_ENV === "production"`, and
   `loadPublishedProfiles()` then throws `CorpusUnavailableError` rather than
   reading fixtures — the comment states in as many words that "in a production
   bundle the fallback branch below is unreachable code". So a production build
   with no `DATABASE_URL` does **not** fall back to fixtures; it refuses. An
   earlier draft of this report said the opposite; that sentence contradicted
   `lib/data/games.ts` and is corrected here. The consequence is *stronger*, not
   weaker: a successful production build proves a Postgres connection was
   configured and answered — but still says nothing about which one.

Corroborating live probes (read-only GETs, same session): `/compare` → HTTP 200,
`<title>Compare two Game Profiles | Should I Play?</title>`; `/methodology`,
`/games/alan-wake-2`, `/robots.txt`, `/` all HTTP 200. `/compare` is the Slice 4
route.

### 1.3 The discrepancy this creates, stated precisely

Master Plan v0.9's *Public-product state* and status header, and `README.md`
line 58, both say of Slices 1–4: *"none of it is yet deliberately deployed to
production"*, and *"the deployed site still serves the earlier three-profile
experience"*.

Those two clauses are not the same claim, and only one of them holds:

- **The three-profile clause is consistent with what was observed, and it is a
  *data* matter.** The manifest publishes exactly three evaluations
  (Appendix A). That is a statement about this artifact's published corpus, not
  a count of database rows: this runner has no authoritative-database access and
  does not assert what the database contains. Publication is gated separately
  and nothing observed here suggests otherwise.
- **The "not deployed" clause does not hold for code.** The Slice 1–4
  application code merged to `main` is what production is running: `/compare`
  answers 200 from the production origin, and the manifest names `e7dd4aa`.

I classify this as **documentation drift to reconcile**, not misconduct, and I
make **no claim of past unauthorized deployment**. The behaviour is exactly what
ADR 0008 decided and recorded — "Production deploys from `main` only", built and
deployed by Workers Builds from GitHub, with a repository-side branch guard whose
comment says in as many words that `WORKERS_CI_BRANCH` is a Workers Builds
signal. Automatic deployment on merge is the *accepted architecture*. What has
drifted is the prose in two governing documents that describes production as
carrying older code, and the Working Agreement's implicit model of what a merge
costs. Who owns the reconciliation: the Master Plan owns its own status lines,
README owns implemented-behaviour description. Neither is this report's to change.

### 1.4 The authority question against Working Agreement §4

§4 lists as routinely permitted, without fresh Tomas approval: creating branches,
editing in-scope files, committing, pushing, opening/updating a PR. It permits
the orchestrator to merge an independently reviewed **non-production**
implementation PR, provided "the merge itself does not activate production…".
It reserves to Tomas "activating or changing production deployments".

Given §1.2, **a merge to `main` is to be treated as activating a production code
deployment**: one merge was observed to be followed, minutes later, by a
production artifact naming that merge's commit, and ADR 0008 records
deploy-from-`main` as the accepted configuration. That is an inference about
merge behaviour generally, not a proven universal — but it is the inference the
authority question must be decided against, because planning on the weaker
reading would mean assuming a merge is safe when the one measurement available
says it was not.

The consequence is that §4's two clauses cannot both be confidently satisfied by
a merge to `main` under the current platform configuration: the routine merge
permission and the production reservation collide on the same action. That
collision is the concrete decision #113 is holding integration for, and it is
real rather than procedural — on the one observed instance a merged regression
would have reached `shouldiplay.gg` within minutes, whether or not anybody was
present.

Three further boundary observations, factual:

- The merge does **not** publish editorial content, mutate the authoritative
  database, or change scoring. Publication remains a separate database act; the
  corpus a build reads is whatever is already published.
- It **can** change what the public site renders for already-published profiles,
  because the renderer is code. A profile-rendering defect merged to `main` is a
  public defect within minutes.
- The production build reads *a* database at build time (`source: "database"`;
  §1.2 fact 3 — which database is not observable here). A merged change to the
  build-time read path therefore executes against whatever data that connection
  serves, without any GitHub-side credential being involved. The runner-safety
  boundary in the runner guide ("must not be given production database
  credentials") is intact — the credential is held build-side, not in GitHub
  Actions — but the *effect* of a merged change is not bounded by that.

### 1.5 The two options, with tradeoffs. Neither is approved here.

**Option (a) — bounded code-deployment authorization for reviewed commits, data
and publication gates unchanged.**

Tomas records a standing decision that merging an independently reviewed,
in-scope, non-publication PR to `main` is authorized to deploy application code
to production, while publication, database migration/mutation, secrets/access,
domain/DNS and methodology gates remain exactly as reserved today. The Working
Agreement §4 bullet is amended to say so explicitly instead of leaving the
collision implicit.

- *Cost:* one owner decision plus a Working Agreement §4 edit and a Master
  Plan/README status correction. **No platform change, no repository code
  change.** Least-cost by a wide margin.
- *Gain:* the operating model matches observed reality; merges stop being
  ambiguous; #113's integration hold can lift on a recorded basis rather than a
  guess.
- *Risk accepted:* a reviewed-but-wrong merge is public within minutes (§1.2
  fact 2 — one observed interval, not a guarantee). Rollback exists (Cloudflare
  version history, per ADR 0008 Consequences) but is a dashboard action, so
  mean-time-to-recover depends on a person being available.
- *Sensible pairing:* the required-check guard (§4 below), which makes
  **PR-and-CI-green** mechanically true rather than conventional. It does
  **not** make *review* mechanically true — see §4.3; independent review remains
  an orchestrator process duty that no ruleset setting enforces. Without the
  guard, option (a) authorizes deployment on a branch that currently accepts any
  direct push with no check at all.

**Option (b) — separate integration and release triggers.**

`main` stops being the production branch; a deliberate act promotes code to
production. Two concrete shapes, both requiring dashboard changes this runner
cannot verify are available:

- **(b1) Release branch.** Point the Workers Builds production trigger at a
  `release` branch; `main` merges then produce preview versions only.
  *Repository cost:* `PRODUCTION_BRANCH` in `scripts/cf-common.mjs` and its
  TypeScript twin in `lib/site-env.ts` must change together — `tests/cf-command-paths.test.ts`
  asserts they agree — plus the environment-resolution rules in ADR 0008
  ("non-main `WORKERS_CI_BRANCH` is always preview") would need re-deriving, or
  every `main` build becomes a `noindex` preview of the site's own content.
  *Risk:* this is the exact class of change ADR 0008 documents biting the project
  once already (the `resolveSiteEnv` indirection bug that would have served
  `noindex` from `shouldiplay.gg` while every local check stayed green). It is
  cheap to describe and not cheap to get right.
  *Also:* ADR 0022's dispatch path hard-codes the expectation that the production
  trigger's `branch_includes` is `["main"]` (`lib/deploy/cloudflare.ts`,
  `lib/deploy/config.ts`), so the admin deploy surface changes with it.
- **(b2) Disable automatic builds on the production trigger; deploy only by
  explicit dispatch.** The application already implements the dispatch side
  (ADR 0022; `CLOUDFLARE_BUILDS_TRIGGER_ID`), and README records that path as
  *implemented but never exercised against the real API*. So (b2) would make the
  first real use of an unexercised integration the thing that stands between
  reviewed code and production.
  *Whether Workers Builds actually supports disabling push-triggered builds while
  keeping the trigger dispatchable is **not verifiable from this runner** and must
  be checked in the dashboard before this option is costed.*

**Recommendation, offered as a recommendation only:** take **(a)**, paired with
the §4 required-check guard, and treat **(b1)** as a later change justified only
if a real incident or the approach of quiet public release makes automatic
promotion unacceptable. Reasons: (a) costs one decision and two documentation
corrections and removes a live authority ambiguity today; (b) costs a
dashboard change plus a repository change in the one area whose failure mode the
project has already paid for once, and it does that while Phase 3A is the
critical path and no public release is imminent. Under option (a) the residual
risk is a public regression, which is recoverable; under a rushed (b) the
residual risk is a silent environment-resolution defect, which ADR 0008 records
as invisible to every local check.

**What is not decided here, and must not be inferred:** that (a) is approved;
that any past merge was authorized or unauthorized; that publication, migration,
secrets or methodology gates change in any way under either option. They do not.

---

## 2. Dependency audit, reproduced on the exact lockfile

### 2.1 Reproduction and match to CI

Commands run at `2026-09-05T07:47Z` on `e7dd4aa`, against the committed
`package-lock.json` (lockfileVersion 3):

```
npm audit --json          # 9 total: 2 high, 7 moderate, 0 critical, 0 low
```

Prior main CI, matched: run **`33927977061`** (push of `e7dd4aa`), Quality job
**`101200525591`**, log line at `2026-09-04T23:03:20.580Z`:

> `9 vulnerabilities (7 moderate, 2 high)`

**The two high and seven moderate findings are still present and are the same
nine.** Both jobs of that run concluded `success` — CI does not gate on `npm
audit`; the counts are the summary `npm ci` prints.

### 2.2 The nine findings

| # | Package | Installed | Sev | Advisory | Direct? | npm tree class |
|---|---|---|---|---|---|---|
| 1 | `undici` | 7.28.0 | **high** | [GHSA-4cwx-7wf7-3272](https://github.com/advisories/GHSA-4cwx-7wf7-3272) — cross-user info disclosure / parse-time crash via degenerate private cache directives (CVSS 7.4). Same node also carries GHSA-8xcm-r25x-g524, GHSA-m8rv-5g2x-5cg5, GHSA-jr45-8vmc-qm54, GHSA-v3r7-h72x-cjcm (moderate) | no | **dev** — `wrangler` → `miniflare@5.20260801.0-alpha` (pins `undici` exactly `7.28.0`) |
| 2 | `nanoid` | 3.3.17 | **high** | [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) — custom generators loop indefinitely when `size` is zero (CVSS 5.9, CWE-835) | no | **npm marks this node non-dev** — see §2.3 |
| 3 | `qs` | 6.15.3 | moderate | [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx), [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) | no | **dev** — `@opennextjs/aws` → `express@5.2.1` / `body-parser` |
| 4 | `miniflare` | 5.20260801.0-alpha | moderate | via `undici` | no | **dev** — `wrangler` |
| 5 | `wrangler` | 4.119.0 | moderate | via `miniflare` | **yes** (devDependency) | **dev** |
| 6 | `esbuild` | 0.18.20 (nested) | moderate | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) — the dev server accepts any origin's requests and returns the response | no | **dev** — only at `node_modules/@esbuild-kit/core-utils/node_modules/esbuild` |
| 7 | `@esbuild-kit/core-utils` | * | moderate | via `esbuild` | no | **dev** |
| 8 | `@esbuild-kit/esm-loader` | * | moderate | via `@esbuild-kit/core-utils` | no | **dev** |
| 9 | `drizzle-kit` | 0.31.10 | moderate | via `@esbuild-kit/esm-loader` | **yes** (devDependency) | **dev** |

Findings 6–9 are one chain with one root cause: `drizzle-kit` still depends on the
deprecated `@esbuild-kit/esm-loader`, which pins `esbuild ~0.18.20`. Findings 1,
4 and 5 are one chain rooted in `wrangler`.

The project's other `esbuild` copies — `node_modules/esbuild@0.25.12`,
`tsx`'s and `wrangler`'s `0.28.1`, `@opennextjs/aws`'s `0.25.4`, `vitest`'s
`0.28.1` — are all **outside** the advisory range and are not findings.

### 2.3 Reachability — measured against the artifact, not argued

`npm audit` marks the hoisted `nanoid@3.3.17` node as **non-dev**, because
`next@16.3.0` carries a non-dev `postcss` that declares `nanoid ^3.3.16`. That
classification is what makes finding #2 look like production exposure. It is not.

Verified by building the deployable artifact locally (`npm ci` then
`opennextjs-cloudflare build`, 48 MB `.open-next/`, "Worker saved in
`.open-next/worker.js`") and inspecting what it actually contains:

| Package | Directories inside `.open-next/` |
|---|---|
| `nanoid` | **only** `server-functions/default/node_modules/next/dist/compiled/nanoid` — Next's own vendored, webpack-compiled copy, `{"name":"nanoid","main":"index.cjs"}` with no version field. The audited `node_modules/nanoid` package is **absent** |
| `undici` | **0** |
| `qs` | **0** |
| `esbuild` / `@esbuild-kit` | **0** |
| `miniflare` | **0** |
| `postcss` | **0** |

The artifact carries exactly one `node_modules` tree
(`server-functions/default/node_modules`, 10 entries: `@emnapi`, `@next`, `@swc`,
`client-only`, `detect-libc`, `next`, `react`, `react-dom`, `semver`,
`styled-jsx`).

So, stated at the strength the evidence supports — and the limit of that
strength matters, because the measurement above is a **package-directory**
measurement:

- **Fact, exactly as measured.** No **installed package directory** for any of
  the nine audited packages is present in `.open-next/`, except the Next-vendored
  `nanoid` copy noted in the table. The audited `node_modules/nanoid` package —
  the node the advisory is written against — is absent.
- **Residual unknown, stated plainly.** Absence of a package *directory* is
  **not** proof that the package's *code* is absent from bundled output. Modern
  bundling inlines dependency code into emitted chunks, which is precisely what
  the vendored `nanoid` case demonstrates: the directory measurement said
  "absent" for `node_modules/nanoid` while the advisory's `while(true)` loop was
  in fact present in the Worker in compiled, vendored form. This report did
  **not** scan the emitted chunks for inlined copies of `undici`, `qs`,
  `esbuild`, `miniflare` or `postcss`, so it cannot and does not claim that none
  of the nine reaches production. Any statement of that blanket form elsewhere
  in earlier drafts of this report, in §6, or in the PR description is withdrawn
  and superseded by this paragraph.
- **Fact.** No first-party code imports any of them: `nanoid`, `qs` and `undici`
  have zero occurrences across `app/`, `lib/`, `components/`, `scripts/` and
  `tests/`.
- **Therefore, the honest formulation:** **no first-party reachability was
  demonstrated** for any of the nine — not *universal non-reachability proven*.
  The distinction is the whole point. What was ruled out is a first-party call
  path; what was not ruled out is transitive use inside bundled framework code.
- **Inference (not proven here), and deliberately not overstated.** Next's
  vendored `nanoid` copy does contain the `customRandom` `while(true)` loop the
  advisory describes, so the *code shape* is present in the artifact. Triggering
  it requires calling `customAlphabet`/`customRandom` with `size === 0`. No
  first-party code calls nanoid at all, and no request-controlled value reaches a
  nanoid `size` argument through any path I inspected. I did not exhaustively
  audit Next's internal call sites, so I state this as low residual risk rather
  than as proven non-reachability.
- **Inference.** GHSA-67mh-4wv8-2f99 requires `esbuild serve` to be running.
  `drizzle-kit` uses `@esbuild-kit/esm-loader` to load the TypeScript config; it
  starts no dev server. Exposure would be to a developer machine or CI runner
  during `npm run db:generate`, not to production.
- **Inference.** The `undici`/`qs` exposure that was *identified* is to
  `wrangler`/`miniflare` and the OpenNext build's local server — a developer
  machine and the CI `Integration` job, which does run `npm run cf:verify` under
  `workerd`. No production-traffic path was identified; per the residual unknown
  above, that is not the same as establishing there is none.

### 2.4 Available minimal remedy — measured, in a scratch copy

Run on copies of `package.json` and `package-lock.json` in `/tmp/depfix`, leaving
the repository untouched:

```
npm audit fix --package-lock-only
```

Result: **both high findings and three of the seven moderate findings resolve;
four moderate remain.** `package.json` is **unchanged** — this is a lockfile-only
change. Version deltas (30 lines of the flat version map):

| Package | Before → after |
|---|---|
| `nanoid` | 3.3.17 → **3.3.18** (patched; the advisory's fixed version does exist on the registry) |
| `qs` | 6.15.3 → **6.16.0** |
| `undici` | 7.28.0 → **7.29.0** |
| `wrangler` | 4.119.0 → **4.129.0** (satisfies the existing `^4.119.0`) |
| `miniflare` | …20260801.0-alpha → …20260903.0-alpha |
| `workerd` (×5 platform builds) | 1.20260801.1 → **1.20260903.1** |
| `@speed-highlight/core`, `@tailwindcss/oxide-wasm32-wasi` subtree | minor/added |

The four that remain are the `drizzle-kit` → `@esbuild-kit` → `esbuild` chain.
There is **no remedy available** for them: `drizzle-kit@latest` *is* 0.31.10, the
version already installed, and it still declares `@esbuild-kit/esm-loader ^2.5.5`.
`npm audit fix --force` "resolves" them by installing **`drizzle-kit@0.18.1`** —
a major *downgrade* of the migration tool. That must not be done.

(Note for whoever repeats this: `npm audit fix --dry-run --package-lock-only`
reports `changed: 0` and 9 remaining vulnerabilities. That is a dry-run reporting
artifact. The non-dry run in a scratch copy is what produced the table above.)

### 2.5 Recommended fix assignment — small, justified, and not performed here

Nothing observed here makes this urgent: **no first-party production
reachability was demonstrated for any of the nine** (§2.3 — which is not the
same as proving none reaches production, and the residual unknown there stands).
Two justifications for acting remain, and both are legitimate on their own:

- **Tool and build exposure.** Whatever the production picture, these packages
  *are* executed — `undici`/`miniflare` under `wrangler` and `cf:verify`,
  `esbuild` under `drizzle-kit`, `qs` in the OpenNext build's local server — on
  developer machines and on the CI `Integration` runner. That is a real
  exposure surface and is by itself a sufficient reason for the bounded patch.
- **Signal hygiene.** A permanent `2 high, 7 moderate` line in every CI log is
  the condition under which a genuinely new high finding goes unnoticed.

Proposed bounded assignment, for the orchestrator to frame and authorize:

- **Scope:** `package-lock.json` only. Run `npm audit fix --package-lock-only`.
  Do **not** touch `package.json`. Do **not** use `--force`.
- **Why it is not a rubber stamp:** the same command upgrades `wrangler`
  4.119.0 → 4.129.0 and `workerd` 1.20260801.1 → 1.20260903.1. `workerd` is the
  runtime `npm run cf:verify` boots and the runtime family production runs, so
  full CI — specifically the `Integration` job's `cf:verify` and
  `check:containment` steps — is the acceptance evidence, not a courtesy.
- **Expected outcome:** `2 high, 7 moderate` → `0 high, 4 moderate`.
- **Explicitly out of scope:** the `drizzle-kit`/`esbuild` chain. Record it as a
  known no-upstream-fix residual with no demonstrated first-party reachability,
  and re-check when `drizzle-kit` publishes a release that drops `@esbuild-kit`.
- **Interaction with §1:** this is a merge to `main`, which on the §1.2 evidence
  is to be treated as deploying. It is a lockfile change that alters the build
  toolchain, so it should land under whatever integration authority #113
  settles, not ahead of it.

---

## 3. Event Wake — what re-qualification actually requires now

### 3.1 What #103 proved, and against which prompt

`docs/operations/ChatGPT_Work_GitHub_Wake.md` §7.1 records the 2026-09-04 smoke
on disposable PR #103 against `main` at **`32a1b9f`**: gates A1, A2 (including
the skipped-run branch), A3's dedupe branch, B, D, E, F and G proved; A3 step 3
and C2/C3 explicitly open. The owner then promoted the event path to primary.

The prompt text changed **after** that head. Measured from the two ```text blocks
in the guide:

| Head | §5.1 prompt | Length |
|---|---|---|
| `32a1b9f` (the smoke's head) | opens `You are GPT-5.6 Sol, program owner/orchestrator…` | **1,349** chars |
| `e7dd4aa` (current `main`) | opens `You are the GPT program owner/orchestrator…`, adds the model-pinning and scoring-runtime clauses | **1,899** chars |

The change landed in **`8c54185`**, *"ops: accept unpinned Event Wake runtime…
(#107)"*, `2026-09-04T17:59:32Z`, closing issue #106.
`tests/orchestrator-wake.test.ts` asserts the guide states its own character
count accurately, and it does (1,899).

So the smoke and the current repository prompt are **not the same text**. §5.1.1
records that the owner updated the live Work task
(automation `6a9adadaba888191b3b6b4d779681140`) to the new text on 2026-09-04 and
that §5.1 is a transcription of that live configuration — an owner-side fact this
runner cannot verify.

The repository already reaches the right conclusion and says so twice, and this
report only supplies the measurements behind it. §5.1.1: *"the §7 gates must
still be re-run on a disposable PR before the event path is relied on as primary
again… that obligation is not weakened, waived or deemed satisfied by the change
being small."* §7 Promotion rule: *"the re-paste half of the trigger is
complete; the disposable-PR re-run of these gates remains pending."*

**One documentation nit, non-material:** PR #107's description states the new
prompt is 1,666 characters. The merged text is 1,899, and the self-consistency
test pins the merged value. The PR body describes an intermediate revision.

### 3.2 What has *not* changed — this is what makes the re-run small

```
git diff --stat 32a1b9f..HEAD -- .github/workflows/     # empty
git log --oneline 3acca85..HEAD -- .github/workflows/   # 32a1b9f only
```

**`.github/workflows/**` is byte-identical to the head every #103 gate ran
against.** The bridge, the machine-addressable `run-name`, the discrimination on
workflow definition path, the association rules, the dedupe marker and the
`pull-requests: write` permission are all unchanged. The re-qualification trigger
that fired is *"the Work task's prompt changed"* — the *"the bridge workflow
changed"* trigger did **not** fire.

The bridge also still runs: `Orchestrator Wake Bridge` run **`33953458136`**
concluded `success` at `2026-09-05T07:46:11Z` on `e7dd4aa`, minutes before this
report.

### 3.3 Which gates the prompt change can actually invalidate

| Gate | Exercises | Prompt-sensitive? |
|---|---|---|
| A1 CI wake | bridge only | no |
| A2 Claude wake + skipped-run branch | bridge only | no |
| A3 steps 1–2 dedupe | bridge only | no |
| D GitHub never chooses work | bridge only | no |
| G the comment posts | bridge only | no |
| **B** bot comment wakes Work; Work preflights | the Work task and its prompt | **yes** |
| **E** failure classification without corrective action | the Work task and its prompt | **yes** |
| **F** watchdog survives / coexists | the scheduled watchdog task | **yes, and currently blocked — §5** |

### 3.4 The smallest exact procedure

This is a **proposal**; only the owner/orchestrator narrows a stated gate set,
and §7 as written says "these gates are re-run" without distinguishing.

The honest observation is that narrowing buys very little. B and E each need a
real bridge wake comment to consume, and producing one *is* A1/A2/G. The only
steps a narrowed run would skip are the deliberate unrelated-comment step
(A2 step 5) and one bridge re-run (A3 steps 1–2) — one comment and one button.
**Recommendation: re-run the full set except F, because the marginal cost of the
full set is roughly two clicks and it leaves no argument about coverage.**

Procedure, in order:

1. Open a disposable non-production PR — documentation-only, deliberately not for
   merge, closed and its branch deleted afterwards, exactly as #103 was.
2. Let ordinary `CI` run. Record: source CI run ID; bridge run ID; bridge exit
   reason; the single wake comment ID; that `workflow.name` is `CI`,
   `workflow.path` is `.github/workflows/ci.yml`, `association` is
   `workflow_run.pull_requests`, and `target_pr_head` matches the PR's real head.
   **(A1, G)**
3. Invoke `@claude` on the disposable item with a harmless assignment. Record:
   source run ID; bridge run ID; one wake comment; `workflow.name` =
   `Claude Code Runner`; `workflow.run_name` = the
   `claude-work-item-<n>-comment-<id>` value; `association` = `claude_source_pr`
   or `claude_issue_branch_prefix`; `runner_source.head_branch` = `main` while
   `target_pr_head.ref` is the task branch. **(A2)**
4. Post an unrelated comment with no trigger phrase; confirm the bridge exits
   `Ignoring skipped Claude workflow run <id>` and posts nothing. **(A2 step 5)**
5. Re-run the **bridge** for one of those source events; confirm exit
   `Wake <event_id> already exists on PR #<n>; no-op.` and exactly one comment
   remains. **(A3 steps 1–2)**
6. **B — the gate that matters.** With the Work task enabled, confirm it wakes on
   the step-2 or step-3 bot comment within minutes; confirm its first substantive
   step is repository preflight and that it visibly reports
   `Project preflight: main <short SHA> · bootstrap read · active item
   <number/name>`. For a no-action classification a claim comment is **not**
   required and its absence is **not** a failure — require the claim only if the
   run proceeds to a merge, correction, new issue or Claude launch, and then it
   must precede that mutation.
7. **E.** Push one deliberately failing test to the disposable branch. Confirm CI
   concludes `failure`, the bridge wakes, and the awakened run performs **no**
   claim, no `@claude` launch, no merge, no issue and no other mutation.
8. **D.** Inspect the bridge run: metadata transport only, no ready-queue query,
   no acceptance rule, no merge, no Claude trigger, no checklist update, no
   production action.
9. **F.** Deferred — see §5. It cannot be observed while no scheduled watchdog
   occurrence is pending.
10. Close the disposable PR unmerged; delete the branch.

**Evidence slots to fill in `docs/operations/ChatGPT_Work_GitHub_Wake.md` §7.1**
(a new dated re-qualification table beside the 2026-09-04 one — do not overwrite
it; #103's evidence is a record of what was true then):

| Field | Value |
|---|---|
| Re-qualification date / `main` SHA | |
| Disposable PR number | |
| Prompt in force (character count; matches guide §5.1?) | |
| A1 — source CI run / bridge run / wake comment / exit reason | |
| A2 — source run / bridge run / wake comment / `run_name` / association | |
| A2 step 5 — skipped source run / bridge run / exit reason | |
| A3 steps 1–2 — bridge rerun / exit reason / comment count | |
| B — wake comment ID / Work start time / preflight receipt as printed | |
| E — failing commit SHA / CI run / failing job / wake comment / observed absence of mutation | |
| D — bridge run inspected / confirmed metadata-only | |
| G — exit reason reached / comment exists | |
| F — deferred, with the reason | |
| A3 step 3, C2, C3 | still open first-natural-occurrence — do **not** mark passed | |

### 3.5 Rules that stay exactly as they are

Nothing in this section weakens: marker/schema/repository/`event_id` validation;
lowest-comment-ID canonicality for both wake and claim; the mandatory claim
before **every** project mutation; the read-only fail-closed stop on validation,
repository-access, write or claim failure; the mandatory fresh repository
preflight; GitHub's metadata-only role; the owner, holdout and Phase-3A
scoring-runtime boundaries (§5.2 step 18a). A3 step 3 and C2/C3 remain open
observations and **may never be closed by assertion**.

### 3.6 What cannot be observed without Work access

- Whether the Work task exists, is enabled, and carries the exact §5.1 text.
- The connected GitHub app's action permissions as they apply to event-triggered
  runs, and whether any action pauses for approval.
- Any run's transcript, so the preflight receipt in gate B is observable only if
  the awakened run posts it somewhere durable, or the owner reads it in the Work
  UI. §7.1's gate F row already states this limit for the watchdog.
- Whether a duplicate webhook delivery has ever occurred (C2).

Gate B is therefore **owner-observed**, not runner-observed. This runner can
produce steps 1–5, 7 and 8 mechanically; steps 6 and the B/E Work-side
observations require someone with Work access to look and record.

**No synthetic live wake, no comment injection and no Work-task edit was
performed by this report, and none is proposed.** (Earlier wording here said
"performed or is proposed", which read as disclaiming the §3.4 procedure as
well. To be exact: the §3.4 disposable-PR procedure **is** proposed — that is
what §3.4 is — and it deliberately contains no synthetic wake, no comment
injection into a real work item, and no edit to any Work task. Its steps 2–5
produce *genuine* bridge events on a disposable PR, exactly as #103 did.)

**Requalification status as of this report: PENDING, in full.** Nothing in §3
qualifies, re-qualifies or partially qualifies the Event Wake path. The gates
are re-qualified only by observed Work behaviour recorded in the §3.4 evidence
slots, and none of that has happened yet.

---

## 4. `main` has no protection. Minimal guard proposal.

### 4.1 Observed, read-only, `2026-09-05T07:49Z`

```
gh api repos/Bergertomas/game_profile/branches/main --jq '{name,protected}'
  → {"name":"main","protected":false}
gh api repos/Bergertomas/game_profile/rulesets
  → []
gh api repos/Bergertomas/game_profile --jq '{allow_auto_merge,delete_branch_on_merge,visibility}'
  → {"allow_auto_merge":false,"delete_branch_on_merge":false,"visibility":"public"}
```

`GET /branches/main/protection` returns **403 "Resource not accessible by
integration"** for this GitHub App token. `protected: false` and the empty
ruleset list are nonetheless conclusive: an unprotected branch is what that pair
means.

Direct pushes to `main` do occur and are the owner's:
`a664a15` *"docs: adopt Astra-era AI role allocation and audit work order"*
(Tomas Klion, `2026-09-04T22:54:53Z`) has no PR reference. That is an owner act on
an owner repository and is noted as context for the bypass design below, not as a
finding.

Combined with §1.2, the current state is: **anything that reaches `main` by any
route is on `shouldiplay.gg` within about five minutes, with no required check
and no required review.**

### 4.2 Minimal proposal — one repository ruleset, two required checks

Deliberately the smallest thing that closes the gap. This is a **proposal for
Tomas**; the app token cannot even read branch protection, let alone write it.

Target `main`. Enable exactly:

| Rule | Setting | Why this and not more |
|---|---|---|
| Require a pull request before merging | on, **0 required approvals** | preserves the Working Agreement's orchestrator-merge path — §4 authorizes the orchestrator to merge an independently reviewed PR, and a required-approver count would add a GitHub ceremony the agreement deliberately removed. What this buys is that every change to `main` has a PR, a diff and a CI run. **It buys nothing about review:** at 0 approvals GitHub will merge an unreviewed PR, so independent review stays a process duty (§4.3) |
| Require status checks to pass | on; contexts **`Quality`** and **`Integration`** | the two job names on `.github/workflows/ci.yml`, confirmed from run `33927977061`. `Integration` is the job that runs `cf:verify` under `workerd` and `check:containment` — the checks ADR 0008 says are the only ones that catch a silent production-environment defect |
| Require branches to be up to date before merging | **off** | it forces a rebase-and-rerun on every merge behind another; the project merges frequently and the cost is real. Revisit only if a semantic conflict actually lands |
| Bypass list | **repository admin (Tomas)** | preserves the owner's direct-push ability, which is in active use. A guard the owner cannot bypass on their own repository will be worked around or switched off |
| Block force pushes / deletions | on | free, and `main` is the deployment source |
| Everything else (signed commits, linear history, required deployments, CODEOWNERS, merge-queue) | **off** | none of it addresses the observed gap and each adds friction |

### 4.3 Boundary, stated plainly

- This is **not** a compliance expansion. It is one ruleset that makes
  **"arrived via a pull request, with `Quality` and `Integration` green"**
  mechanically true on the branch that deploys to production. It adds no
  scanning requirement, no approval bureaucracy, no CODEOWNERS, no new workflow.
- **It does not make "reviewed" mechanically true, and this report withdraws any
  earlier phrasing that said it did.** A pull-request rule with **0** required
  approvals enforces the *existence* of a PR and the *passing* of the named
  checks; it permits merging a PR nobody read. Independent review under Working
  Agreement §4 therefore remains an **orchestrator process duty**, unenforced by
  GitHub, and the guard must not be cited as evidence that it happened. Raising
  the approval count is the mechanical alternative, and it is deliberately not
  proposed here because it would break the orchestrator-merge path; that
  tradeoff is the owner's to revisit.
- **Admin bypass is an explicit exception, not an oversight.** With repository
  admin on the bypass list, the owner can push to `main` without a PR and
  without the required checks — so the guarantee above holds for everyone
  *except* the bypassing admin. That is the deliberate design (§4.2, bypass
  row); it is stated here so nobody reads the ruleset as covering all paths.
- **Only Tomas can do it.** Ruleset and branch-protection writes require admin;
  this runner's token is refused read access to the protection endpoint. The
  program owner/orchestrator cannot do it either unless separately granted.
- **It is coupled to §1.** Under option (a), this guard is what makes the
  authorization safe to grant — reviewed-and-CI-green becomes a precondition of
  deployment rather than a convention. Under option (b) it is still worth having
  but is less load-bearing.
- **It does not authorize deployment.** A ruleset constrains how code reaches
  `main`; it says nothing about whether reaching `main` should deploy. That
  remains §1's owner decision.

---

## 5. The scheduled watchdog — an observation to verify Work-side, not a runner fact

### 5.1 What the repository requires

Two places, both current authority:

- Bootstrap: *"The scheduled watchdog that promotion retains is **armed**: the
  hourly, recovery-only ChatGPT task `Should I Play — Watchdog` (automation
  `6a9a57402f248191857fc31c2cd46baf`). It is a recovery path, not a throughput
  clock; the wake guide owns its contract and **only Tomas changes that
  schedule**."*
- Wake guide §7.1: *"Promoting the event path is not authority to run without a
  watchdog: if no scheduled occurrence is pending, re-arm it. Only Tomas changes
  that schedule… If a future observation shows no occurrence pending on that
  automation, treat it as the same re-arm obligation above rather than as a
  licence to run without a watchdog."*

### 5.2 The observation carried in issue #115

Issue #115 records that automation **`6a9a57402f248191857fc31c2cd46baf`** — the
same ID the bootstrap and wake guide name as `Should I Play — Watchdog` — was
observed reused as a bounded "Night Run" and **disabled after 06:01 UTC on
2026-09-05**, and that the Event Wake automation
(`6a9adadaba888191b3b6b4d779681140`, per §5.1.1) remained enabled with
re-qualification pending.

**This runner has verified none of that.** No Work-side state is readable here.
The observation is recorded because it is consequential, attributed to its source,
and flagged for fresh verification by the orchestrator or owner.

### 5.3 What follows *if* the observation holds

Stated conditionally, because the antecedent is unverified:

1. **No scheduled recovery path is armed.** The wake guide's re-arm obligation
   is then unmet. The Event Wake being primary does not substitute — the whole
   point of the watchdog is to recover an event that is never delivered, a Work
   task that never wakes, and a run that stops read-only on a failed claim.
2. **Wake-guide gate F cannot be re-run.** F is *"leave the hourly checkpoint
   unchanged and verify its next scheduled run still performs normal
   preflight/recovery"*. With no occurrence pending there is nothing to observe,
   so F would remain deferred even after the §3.4 procedure is executed.
   **This is a statement about F alone.** It must not be read as saying the
   re-qualification is otherwise complete: as of this report **no** gate of the
   §3.4 procedure has been re-run, so the current qualification state is
   *pending in full*. "Complete-except-F" is a possible **future** state — the
   one reached if and only if steps 1–8 are executed and their evidence slots
   filled — not today's.
3. **The automation ID in two governing documents may no longer denote what they
   say it denotes.** If `6a9a5740…` is now a Night Run rather than
   `Should I Play — Watchdog`, the bootstrap's and wake guide's identifications
   are stale. That is documentation drift for the owner/orchestrator to reconcile
   after verifying the live state — not for this report to rewrite.

**No schedule restoration authority is granted to this worker, none is claimed,
and nothing was changed.** Re-arming is Tomas's, explicitly, in both documents.

### 5.4 What the orchestrator should verify Work-side

- Does an automation `6a9a57402f248191857fc31c2cd46baf` exist, what is its
  current name, prompt and cadence, and is it enabled?
- Is any occurrence pending on it?
- Is `6a9adadaba888191b3b6b4d779681140` (`Should I Play — Event Wake`) enabled,
  and does its prompt match guide §5.1 byte-for-byte at 1,899 characters?
- Were any other automations created or repurposed in the same window?

---

## 6. Consolidated record

### 6.1 Observation frame

| | |
|---|---|
| Observed | `2026-09-05T07:47:18Z` – `07:53:21Z` UTC |
| `main` HEAD | `e7dd4aae3623d6cb70e51ea2b8a7d964b96f134d` |
| Branch | `claude/issue-115-20260905-0747`, based on the same SHA |
| Open PRs at observation | none |
| Production origin | `https://shouldiplay.gg`, serving an artifact built from `e7dd4aa` |

### 6.2 Evidence index

| Ref | Command / URL |
|---|---|
| E1 | `GET https://shouldiplay.gg/deployment-manifest` → 200; `commitSha e7dd4aa`, `generatedAt 2026-09-04T23:08:16.051Z`, `buildUuid 1de37fcf-f2d7-401c-9eab-fc19312fca86`, `siteEnv production`, `source database`, 3 entries. First observed `2026-09-05T07:52Z`; **verbatim body and headers re-fetched `2026-09-05T08:01:08Z` — Appendix A** |
| E2 | `GET https://shouldiplay.gg/compare` → 200, `<title>Compare two Game Profiles \| Should I Play?</title>` |
| E3 | PR #112 `mergedAt 2026-09-04T23:02:50Z` → `e7dd4aa`; CI run `33927977061` both jobs green |
| E4 | <https://github.com/Bergertomas/game_profile/actions/runs/33927977061> — Quality job `101200525591`, log `2026-09-04T23:03:20.580Z`: `9 vulnerabilities (7 moderate, 2 high)` |
| E5 | `npm audit --json` on `e7dd4aa`: `{moderate: 7, high: 2, critical: 0, total: 9}`; `prod 25 / dev 911 / optional 307` |
| E6 | `npm audit fix --package-lock-only` in `/tmp/depfix` → `0 high, 4 moderate`; lockfile-only; `package.json` unchanged |
| E7 | `npm ci` + `opennextjs-cloudflare build` → `.open-next/` (48 MB). **Package-directory measurement only** — `find .open-next -type d -name <pkg>`: `undici` 0, `qs` 0, `esbuild` 0, `miniflare` 0, `postcss` 0, `@esbuild-kit` 0; `nanoid` only `.../next/dist/compiled/nanoid`. Emitted chunks were **not** scanned for inlined code (§2.3 residual unknown) |
| E8 | `git diff --stat 32a1b9f..HEAD -- .github/workflows/` → empty |
| E9 | §5.1 prompt lengths from the guide's ```text blocks: 1,349 at `32a1b9f`, 1,899 at `e7dd4aa`; changed in `8c54185` (#107) |
| E10 | `gh api …/branches/main` → `protected: false`; `gh api …/rulesets` → `[]`; `…/branches/main/protection` → 403 for this token |
| E11 | Bridge run `33953458136` → `success`, `2026-09-05T07:46:11Z`, head `e7dd4aa` |
| E12 | `scripts/cf-deploy.mjs`, `scripts/cf-common.mjs` (`PRODUCTION_BRANCH = "main"`), `.github/workflows/ci.yml` (no deploy step) |

### 6.3 Facts / inferences / unavailable

**Facts — directly observed.** Production serves an artifact naming `e7dd4aa`,
with `siteEnv: production`, `source: database` and three published entries
(E1, E3, Appendix A). The artifact's `generatedAt` is `23:08:16.051Z`, **5 m
26 s** after PR #112's merge at `23:02:50Z` — two timestamps, not an observed
activation event. `/compare` — Slice 4 — answers 200 from production (E2). No
GitHub Actions workflow deploys (E12). The audit findings are unchanged from main
CI: 2 high, 7 moderate, the same nine (E4, E5). No installed package directory
for any of the nine is present in `.open-next/`, except Next's vendored
compiled `nanoid` (E7). A lockfile-only fix clears both highs and three
moderates (E6). The workflows are byte-identical to the smoke's head (E8). The
Work prompt grew 1,349 → 1,899 characters after the smoke (E9). `main` is
unprotected with no rulesets (E10).

**Inferences — reasoned, labelled, not proven here.** That the merge triggered
an automatic Workers Builds build and deploy: an inference consistent with the
ADR 0008/config record and with the absence of any Actions deploy step, but not
proven from the origin — build history and dashboard audit logs are unreadable
here, so **human intervention in that window cannot be excluded**, no claim is
made about what *future* merges will do, and `5 m 26 s` is one measured
interval, not a delivery guarantee (§1.2). That the nanoid advisory is not
reachable — the audited package is absent and no first-party code calls it, but
the vendored compiled copy *is* in the Worker and Next's internal call sites
were not exhaustively audited. That the esbuild advisory needs `esbuild serve`,
which `drizzle-kit` never starts. That the identified `undici`/`qs` exposure is
to developer machines and the CI Integration job.

**Explicitly NOT claimed.** That any of the nine is proven absent from
production: the §2.3 measurement is package-directory absence, emitted chunks
were not scanned for inlined code, and what was established is **no
demonstrated first-party reachability** rather than proven universal
non-reachability. That the authoritative database contains exactly three rows
or evaluations: the manifest proves three *published entries in this manifest*.
Which database or credentials the build used. That any wake gate is qualified or
partially qualified. That the §4.2 ruleset would make review mechanically true;
it enforces PR-plus-checks, with admin bypass as an explicit exception.

**Unavailable from this runner.** Cloudflare dashboard: Workers Builds trigger
configuration, build/deploy commands, production branch, build history, the build
that produced `1de37fcf-…`, whether push-triggered builds can be disabled while
keeping API dispatch. ChatGPT Work: every task's existence, state, prompt text,
schedule, run transcript and last-run time — including both automation IDs in §5.
GitHub: `/branches/main/protection` (403 for this token). The authoritative
database (out of scope and forbidden). Any live wake, Work run or scoring
execution (forbidden and not attempted).

### 6.4 Ranked risks, each with its next action

**R1 — The deployment-authority collision is live and unresolved.** A merge to
`main` is to be treated as deploying code to production within minutes (§1.2 —
one observed instance plus the ADR 0008 record); Working Agreement §4 reserves
production activation to Tomas while routinely permitting the merge that causes
it, and two governing documents describe production as running older code.
*Impact:* high — a reviewed-but-wrong merge is public quickly, and the operating
model does not describe reality. *Next action:* Tomas decides §1.5 option (a) or
(b); the orchestrator then corrects Master Plan v0.9's *Public-product state*
and README line 58 to separate "code deployed" from "three profiles published".
Until then #113's integration hold is correct and should stand.

**R2 — `main` is unprotected while it is the production source.** Any push, by
any route, reaches production without a required check or a PR. (The §4.2
proposal closes the PR-and-checks half; review remains a process duty, and
admin bypass remains an explicit exception — §4.3.)
*Impact:* high, and it compounds R1. *Next action:* Tomas applies the §4.2
ruleset. Owner-only; nobody else can.

**R3 — No scheduled watchdog appears to be armed (unverified).** If #115's
observation holds, the recovery path the promotion explicitly retained is absent
and the wake guide's re-arm obligation is unmet. *Impact:* medium-high — it is a
recovery path, so it costs nothing until something else fails, and then it costs
the recovery. *Next action:* the orchestrator verifies the live automation state
(§5.4) and reports it; only Tomas re-arms.

**R4 — Event Wake is operating as primary with re-qualification pending.** The
repository says so in two places; this report adds only the measurement that the
prompt genuinely changed and that the bridge did not. *Impact:* medium — the
bridge half is provably unchanged, so the untested surface is the Work task's
behaviour under the new prompt. *Next action:* run §3.4 steps 1–8 on a disposable
PR, fill the §3.4 evidence slots, defer F behind R3.

**R5 — Nine standing audit findings, none with demonstrated first-party
production reachability.** *Impact:* low-to-medium as security exposure — the
identified exposure is tool/build-time (developer machines and the CI
`Integration` runner), and production absence is *not* proven, only
undemonstrated as first-party reachable (§2.3); medium as signal hygiene,
because a permanent `2 high, 7 moderate` line is how a real new high goes
unnoticed. *Next action:* the §2.5 bounded lockfile-only assignment, sequenced
after R1 settles integration authority, with full CI as its acceptance evidence.

**R6 — Documentation drift.** Master Plan/README deployment prose (R1);
possibly-stale watchdog automation ID in the bootstrap and wake guide (R3); PR
#107's 1,666-character figure against the merged 1,899. *Impact:* low
individually; collectively they are why an agent reading current authority would
have concluded production was running older code. *Next action:* fold into the
#113 reconciliation lane (C), after R1 and R3 are decided — not before, or the
corrections encode an unresolved decision.

### 6.5 What this report does not do

It does not approve a deployment-authority model, declare any wake gate passed,
change or restore any schedule, change any dependency, workflow, configuration or
branch-protection setting, touch production, the authoritative database, secrets,
credentials or publication, perform or authorize any live wake, scoring or
research, or claim that any past deployment was unauthorized. It reports and
proposes. Every decision above belongs to Tomas or the program
owner/orchestrator.

---

## Appendix A — verbatim deployment-manifest response

Re-fetched **read-only** for replayability. Command, run from the runner with no
authentication and no state change:

```
$ date -u +%Y-%m-%dT%H:%M:%SZ
2026-09-05T08:01:07Z
$ curl -sS -D - https://shouldiplay.gg/deployment-manifest
$ date -u +%Y-%m-%dT%H:%M:%SZ
2026-09-05T08:01:08Z
```

**Response observed `2026-09-05T08:01:08Z`.** Response headers, verbatim
(`report-to` endpoint URL truncated — it is a per-request Cloudflare NEL token
and carries no evidentiary content; everything else is complete):

```
HTTP/2 200
date: Sat, 05 Sep 2026 08:01:08 GMT
content-type: application/json; charset=utf-8
cache-control: no-store, must-revalidate
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
x-nextjs-cache: HIT
x-opennext: 1
x-robots-tag: noindex
report-to: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=…"}]}
nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
server: cloudflare
cf-ray: a363b44899c5d3d7-SJC
alt-svc: h3=":443"; ma=86400
```

Response body, **verbatim and complete**, 1,184 bytes as served:

```json
{
  "schema": "should-i-play/deployment-manifest@1",
  "generatedAt": "2026-09-04T23:08:16.051Z",
  "siteEnv": "production",
  "buildUuid": "1de37fcf-f2d7-401c-9eab-fc19312fca86",
  "commitSha": "e7dd4aae3623d6cb70e51ea2b8a7d964b96f134d",
  "branch": "main",
  "source": "database",
  "rubricVersion": "1.0",
  "digest": "cc08d7242cc41f100f67728bcacda77736a8ff23701581ed730df3b2a95ced1f",
  "entries": [
    {
      "evaluationId": "24f3cd1e-9dd4-4dd6-947b-bb9174df4270",
      "gameSlug": "alan-wake-2",
      "scopeKey": "default",
      "versionNumber": 1,
      "rubricVersion": "1.0",
      "publishedAt": "2026-08-06",
      "path": "/games/alan-wake-2"
    },
    {
      "evaluationId": "3b1fd44e-73f2-4bb8-89f4-afd1a7f67041",
      "gameSlug": "redfall",
      "scopeKey": "default",
      "versionNumber": 1,
      "rubricVersion": "1.0",
      "publishedAt": "2026-08-06",
      "path": "/games/redfall"
    },
    {
      "evaluationId": "2601fb46-620f-44a7-9413-4e478d552bb3",
      "gameSlug": "returnal",
      "scopeKey": "default",
      "versionNumber": 1,
      "rubricVersion": "1.0",
      "publishedAt": "2026-08-06",
      "path": "/games/returnal"
    }
  ]
}
```

**What this appendix is for, and what it is not.** It exists so a reader can
independently replay the digest and the manifest's shape against the origin
without taking §1.2's abbreviation on trust. Every excerpt of this response
elsewhere in the report is labelled as abbreviated and resolves here.

It remains a **published manifest**, not a database read. This runner has **no
authoritative-database access**, and nothing in this appendix speaks to what the
database contains — only to what this artifact publishes: three entries, at
`rubricVersion 1.0`, with the `evaluationId`s above. `generatedAt` is a
build-stamped value, not an observed activation time (§1.2).

Note that the body is byte-identical in `commitSha`, `buildUuid`, `generatedAt`
and `digest` to the `07:52Z` observation nine minutes earlier: the same artifact
was still being served, so no redeploy intervened during this report's
observation window.
