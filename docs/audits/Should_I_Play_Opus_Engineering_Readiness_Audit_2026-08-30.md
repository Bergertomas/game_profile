# Should I Play? — Opus Engineering Readiness Audit Record

**Recorded:** 30 August 2026  
**Source artifact:** [Gate A Engineering Readiness](https://claude.ai/code/artifact/09f39864-b39f-4aaa-a05f-042bf5af68cb)  
**Source report date:** 28 August 2026  
**Source repository state:** `claude/shouldiplay-readiness-audit-g05glg` at
`df26c4b`, reported identical to `origin/main` at the time  
**Normalized rendered text:** 48,617 characters; SHA-256
`3f9f1ec8bcc3be8a4f8f776e8811f957f9582d3ab8ce0dbe00f24220ebdb73a6`  
**Authority:** Evidence-backed audit; **not a governing product document**

## 1. How to use this record

The Opus report is a strong read-only inventory of the repository state it
examined. It read source, migrations, ADRs, CI and test files but ran no gates
because dependencies were absent in its checkout. Its facts must therefore be
revalidated against the current branch before action.

The report predates the completed Master Plan v0.9 reconciliation, ADR 0030,
Gate B acceptance and ADRs 0031/0032. Its proposed blockers do not override
later owner decisions.

## 2. Evidence accepted from the audit

The following findings remain useful implementation evidence:

- public profile reads are DB-backed at build time and fail closed in
  production;
- primary/sibling scope routing, publication history, manifest proof, Access,
  sitemap/canonical behavior and containment have real code/test enforcement;
- Search, Compare, discovery and About are not implemented public routes;
- the current radar geometry already preserves exact/range/Unknown semantics;
- artless card/profile states are complete production states;
- focus return, Escape dismissal and anchored poster expansion are genuinely
  new interaction work;
- the existing profile root is a broad client boundary and must not be copied
  onto catalogue-scale homepage composition;
- the public reader drops some stored platform-note/override information;
- no approved production artwork currently makes the accepted art-led direction
  publication-ready;
- session suitability, normalized facets and the eleven experience axes should
  not receive premature schema expansion before real editorial work exposes
  their authoring cost.

## 3. Revalidation against the current branch

| Opus observation | Current resolution |
|---|---|
| The 27 locked resolution records were outside the repository constitution | Master Plan v0.9 and the canonical Public Product Resolution Register already integrate the exact `p_resolutions.md` source hash. Revalidated 30 August 2026. |
| README said production Live proof was not exercised | Current README already records `production_verified` and Live as proven; only application-originated dispatch and a new-profile Publish → dispatch → Live cycle remain. The activation wording is reinforced in this pass. |
| Gate A versus ADR 0013 required Tomas | Resolved: Gate A supersedes ADR 0013. ADRs 0013/0030 and the Master Plan are amended. |
| Search runtime required Tomas | Resolved: ADR 0031 selects an editorially governed static build-time index. |
| Compare could be two to four | Resolved: MVP is exactly two. Older two-to-four wording is superseded/deferred. |
| Compare URL/index policy | Remains open for the dedicated Compare pass. No all-pair prerender default is authorized. |
| “Evaluated” date source | Remains an explicit Gate B implementation copy/data decision. |
| Registry publication could be a database dump | Resolved: recognized-but-unprofiled Search inclusion requires an editorial flag. |
| Artwork legal review | Still open inside the seven-step lawful artwork path. |

## 4. Adjusted public implementation sequence

The report's slices are evidence, not the roadmap. The governing adjustments
are:

1. complete governance/README/audit archival and run the installed baseline;
2. complete the dedicated full Compare design pass and resolve URL/index policy;
3. translate A1–A6 and Compare through the design-system/interaction handoff;
4. implement the static Search index and four truthful states early because
   Search is more load-bearing than Compare in engineering priority;
5. implement accepted homepage/profile slices without fabricating artwork,
   practical time or missing platform distinctions;
6. implement the accepted exactly-two full Compare experience;
7. run conformance/accessibility review against accepted screens;
8. perform a real editorial trial before session/facet/eleven-axis schema work.

Specific guards:

- poster/profile components render approved commitment data, `Unknown` or
  omission; Fable examples never become derived bands;
- do not refactor the existing profile client boundary as preparatory homepage
  work; revisit it only within Gate B implementation;
- restore material platform performance notes, subcriterion platform notes and
  overrides as public truthfulness requirements without changing base totals;
- preserve the complete no-art state until the lawful artwork path closes.

## 5. Baseline gates

The current branch has installed JavaScript dependencies. The local task ran
Node 26.3.1; CI pins Node 22. No PostgreSQL client/server, Docker runtime or
`DATABASE_URL` was available, so no existing or production database was used.

| Gate | Result | Evidence |
|---|---|---|
| `npm run typecheck` | **PASS** | Next route types generated; TypeScript completed with no error. |
| `npm run lint` | **FAIL** | The only findings are in tracked generated Fable support code at `docs/design/artifacts/support.js`: two errors and three warnings. The same lint command passes when that artifact directory is excluded. No lint configuration was changed in this document-only pass. |
| `npm run test` | **PASS** | 45 files; 576/576 tests. The local-server safety test required permission to bind loopback. |
| `npm run build` | **PASS** | Exact Turbopack preview build; 32 static pages generated from the three calibration fixtures. An initial runner port-permission failure was transient and the authorized retry passed. A webpack diagnostic build also passed. |
| `npm run check:containment` | **PASS** | Preview artifact scanned successfully; evaluation artwork references were permitted because the artifact is noindex. |
| `npm run test:e2e` | **PASS** | 69/69 Playwright tests. |
| `npm run cf:verify -- --preview` | **PASS** | OpenNext build, cache population and workerd checks all passed. |
| `npm run test:db` | **NOT RUN** | Requires a fresh disposable PostgreSQL database and `psql`; neither PostgreSQL nor Docker is installed in this environment. |
| `npm run test:db-read` | **NOT RUN** | Same unavailable PostgreSQL prerequisite. |
| `npm run cf:verify` | **BLOCKED AS DESIGNED** | Without `DATABASE_URL`, the production build failed closed with `CorpusUnavailableError` rather than publishing fixtures. The production Worker checks therefore did not run. |
| Composite `npm run verify` | **FAIL** | Stops at the generated Fable support-file lint findings; its typecheck passes and its remaining constituent gates pass when run independently. |

This is a useful installed baseline, not a green CI claim. Before product code
lands, either exclude the archived generated Fable runtime from source linting
or deliberately bring that vendored artifact under the repository's React/Next
rules, then rerun the exact Node 22 CI matrix with fresh `_ci` databases. The
former is the narrower readiness correction because the file is design
evidence, not application source.
