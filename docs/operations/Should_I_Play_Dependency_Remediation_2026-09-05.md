# Dependency Remediation — bounded compatible lockfile update, 2026-09-05

**Status:** evidence note for issue #118 (parent #113), supported by the #115 / PR #117 lockfile audit

**Owner:** Tomas · **Orchestrator:** ChatGPT

**Scope:** `package-lock.json` only, plus this note. `package.json` is unchanged.
No workflow, source, migration, configuration, credential, calibration or
controlled-input file is touched, and nothing here authorizes a deployment.

## Outcome

`npm audit` goes from **9 vulnerabilities (7 moderate, 2 high)** to **4 moderate**.
Both high-severity findings are removed. The four that remain are one
`drizzle-kit → @esbuild-kit → esbuild@0.18.20` chain with no compatible upstream
fix; §4 dispositions it rather than forcing a breaking downgrade.

## 1. Baseline, reproduced

Against `main` at `e7dd4aae3623d6cb70e51ea2b8a7d964b96f134d`, `npm ci` from the
committed lockfile followed by `npm audit`:

```
9 vulnerabilities (7 moderate, 2 high)
```

| Package | Severity | Via |
|---|---|---|
| `undici` | high | 5 advisories (direct) |
| `nanoid` | high | GHSA-2v37-7h3g-55p8 (direct) |
| `miniflare` | moderate | depends on vulnerable `undici` |
| `wrangler` | moderate | depends on vulnerable `miniflare` |
| `qs` | moderate | 2 advisories (direct) |
| `esbuild` | moderate | GHSA-67mh-4wv8-2f99 (direct) |
| `@esbuild-kit/core-utils` | moderate | depends on vulnerable `esbuild` |
| `@esbuild-kit/esm-loader` | moderate | depends on vulnerable `@esbuild-kit/core-utils` |
| `drizzle-kit` | moderate | depends on vulnerable `@esbuild-kit/esm-loader` |

This matches the count reported by PR #117 and by `main` CI. The baseline was
reproduced here rather than inherited from that report.

## 2. Method

```
npm audit fix --package-lock-only
```

**No `--force`.** npm's only offer for the residual chain is
`npm audit fix --force → drizzle-kit@0.18.1`, an explicit breaking downgrade of
the tool that generates our migrations. It was not taken, and issue #118
prohibits it.

The same command was run independently in a scratch directory (`/tmp/lockexp`)
seeded with the committed `package.json` + `package-lock.json`. The scratch
result is **byte-identical** to the in-repo lockfile (`cmp` clean), so the
re-resolution is deterministic and not an artefact of local install state. Both
runs leave `package.json` byte-identical.

## 3. Exact dependency-tree change

18 lockfile entries change; `package.json` does not.

| Package | Before → After | Tree | Bump |
|---|---|---|---|
| `nanoid` | `3.3.17` → `3.3.18` | **prod** | patch |
| `qs` | `6.15.3` → `6.16.0` | dev | minor |
| `undici` | `7.28.0` → `7.29.0` | dev | minor |
| `miniflare` | `5.20260801.0-alpha` → `5.20260903.0-alpha` | dev | minor |
| `wrangler` | `4.119.0` → `4.129.0` | dev | minor |
| `workerd` + 5 × `@cloudflare/workerd-*` | `1.20260801.1` → `1.20260903.1` | dev | minor |
| `@speed-highlight/core` | `1.2.23` → `1.2.24` | dev | patch — incidental, in-range via `youch` |
| 6 × `@tailwindcss/oxide-wasm32-wasi/node_modules/*` | added | dev | **metadata only** |

The six added `@tailwindcss/oxide-wasm32-wasi` entries are `inBundle: true`,
`optional: true`, `cpu: ["wasm32"]` and carry **no `resolved` URL**. They are npm
writing out the already-bundled contents of a package that was present before;
nothing new is downloaded and no new code enters the tree.

**No direct-dependency change and no major bump anywhere.** The lockfile's root
manifest entry (`packages[""]`, the mirror of `package.json`) hashes identically
before and after: `2d7b742e1f09226fa6280685f2689d5fac9af3273c48ce773b8e2925fd8a8bd8`.

### Compatibility

- `@opennextjs/cloudflare@1.20.2` declares `peerDependencies.wrangler: "^4.86.0"`;
  `4.129.0` satisfies it.
- `wrangler.jsonc` pins `compatibility_date: "2026-08-07"`; `workerd 1.20260903.1`
  is later than that date and supports it.
- The Workers toolchain (`workerd`/`miniflare`/`wrangler`) is what the
  production-runtime `npm run cf:verify` gate exercises, so that gate — not a
  static reading of this table — is the compatibility evidence. See §5.

## 4. Residual: 4 moderate, `esbuild@0.18.20` under `drizzle-kit`

```
esbuild <=0.24.2 · moderate · GHSA-67mh-4wv8-2f99
  @esbuild-kit/core-utils → @esbuild-kit/esm-loader → drizzle-kit
```

**This is an upstream limit, not a deferral.** `drizzle-kit@0.31.10` is the
*latest published version* (`npm view drizzle-kit version` → `0.31.10`, the
version this repository already pins) and it still declares
`"@esbuild-kit/esm-loader": "^2.5.5"`. Both `@esbuild-kit` packages are
themselves marked deprecated in the registry ("Merged into tsx:
https://tsx.hirok.io") with no fixed release to move to. There is no compatible
version that resolves this chain.

Bounded non-reachability assessment, stated as an argument about the advisory's
own precondition — **not** from the absence of a build-artifact directory:

1. GHSA-67mh-4wv8-2f99 requires a running esbuild **development server**
   (`esbuild --serve` / `serve()`); the attack is a hostile web page issuing
   requests to that listener.
2. Measured: `@esbuild-kit/core-utils/dist/index.js` (60,585 bytes) and
   `@esbuild-kit/esm-loader/dist/index.js` (4,512 bytes) — the entire shipped
   implementation — contain **zero** case-insensitive matches for `serve`. They
   transform TypeScript for a Node loader; they open no listener.
3. `drizzle-kit` appears in exactly two places in this repository: the
   `db:generate` script and a **type-only** import in `drizzle.config.ts`. It is
   a devDependency invoked by no build, deploy, test or request path.
4. `esbuild@0.18.20` exists only under
   `node_modules/@esbuild-kit/core-utils/node_modules/`. The other copies in the
   tree — `0.25.4`, `0.25.12`, `0.28.1` — are outside the vulnerable `<=0.24.2`
   range.

Residual exposure is therefore a developer-workstation scenario requiring a
hostile page to be visited *while* a `db:generate` run is in flight, against a
listener this chain never opens. It is not production-reachable.

**Expected steady state:** `npm audit` will continue to report `4 moderate`
until `drizzle-kit` drops `@esbuild-kit` upstream. That is not a regression and
should not be re-diagnosed as one. Revisit when a `drizzle-kit` release ships
without the `@esbuild-kit/esm-loader` dependency.

## 5. Verification

Because `workerd`/`miniflare`/`wrangler` move, the required evidence is the
project's real CI on the pull request for this change — the **Quality** job
(`npm run verify`: typecheck → lint → test → build → containment) and the
**Integration** job, including the production-runtime `npm run cf:verify` gate
that boots the built Worker under `workerd` and asserts what it serves, plus
`npm run check:containment`.

Local pre-push checks were deliberately kept to the lockfile evidence in §1–§4:
an earlier attempt at this task exhausted its runner envelope re-running the full
local suite and left no durable branch, so the amended execution order is patch →
push → CI. **CI on the PR is the acceptance gate, and this note is not an
acceptance claim.** No `cf:deploy`, no preview-deploy command, no production or
authoritative-database access, and no scoring, calibration or holdout work was
involved in producing this change.
