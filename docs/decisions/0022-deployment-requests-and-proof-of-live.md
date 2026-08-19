# ADR 0022 — A publication requests a build; only the artifact's own manifest proves Live

**Status:** Accepted · 2026-08-19
**Context:** Phase 2D-2. Closes the remainder of Master Plan v0.8 §17.2 open
decision **4** (publish/deploy trigger authentication, persistence, retries and
audit model) and P0 items **12**, **13** and **14**. Builds on
[ADR 0020](0020-publication-preview-and-deploy-trigger.md), which decided the
mechanism and recorded it as not yet implemented.

## Problem

Master Plan §9.8 requires Published and Live to be distinct states, and requires
the tool to expose the gap, the failure and a retry. ADR 0020 settled *how* a
deploy is requested — the Cloudflare Workers Builds API, rebuilding `main` — and
deliberately left four questions open:

1. How is the API call authenticated, and where may the credential exist?
2. What is persisted, and with what lifetime?
3. **What counts as proof that a version is Live?**
4. What happens when any of it fails, and how is a retry made safe?

The third is the one that decides the shape of the other three, and it is the
one with a tempting wrong answer.

## Decision

### 1. Live is proven by the artifact, or it is not proven

The deployed artifact publishes its own inventory at **`/deployment-manifest`**,
generated during the same `next build` that renders the pages, from the same
corpus read. Verification fetches it from the production origin, revalidates it,
and only then records what production serves.

Everything else available to this system describes a **request**:

| Evidence | What it actually proves |
|---|---|
| The dispatch was accepted | a POST was accepted |
| Cloudflare reports the build succeeded | a build process exited 0 |
| The deploy step reported success | an upload was accepted |
| **The origin serves a manifest naming version V** | **production serves V** |

Only the last one answers the question. A build can succeed and have its upload
fail; a later build can land first; a rollback can restore an older artifact with
no build running at all. Every one of those is invisible to a build-status poll,
and each would have the tool claim something Live that is not.

So build status is recorded, displayed, and **advisory** — it exists to answer
"why has this not deployed", never "has this deployed". `tests/published-vs-live.
test.ts` pins that structurally: exactly one function in the codebase may write a
`production_verified` event, and only `lib/deploy/verify.ts` may fetch the
manifest.

**The build uuid closes the loop.** Workers Builds injects
`WORKERS_CI_BUILD_UUID` into the build, and it is the same `build_uuid` the
trigger API returns. A manifest naming build B is therefore proof that the
artifact production serves is the one request R asked for — the same value
arrived at from two independent directions.

**The manifest is `force-static`, and that is load-bearing.** Next 16 does not
cache `GET` Route Handlers by default. Without the directive the Worker would
evaluate the route per request, with no database and no build environment, and
report an empty corpus for every deployment — a manifest that looks like a
manifest and is worthless. `cf:verify` asserts against the deployed artifact
that two requests return byte-identical bodies, which is what distinguishes
prerendered from re-evaluated.

**Verification fails closed in every direction.** Unreachable, non-200,
unparseable, unrecognised schema, digest not matching its own entries, or a
manifest describing a *preview* artifact: all of them resolve to "not proven",
never to "probably fine". The preview case matters more than it looks — a
preview artifact is healthy and its manifest parses identically, so believing one
served from the production origin would report profiles as Live on the strength
of a hostname.

**The corpus source is part of the proof.** A build with no database reads the
calibration fixtures. That artifact is a real, correctly deployed site in which
**no editorial evaluation is Live**, and the manifest says so, so the tool
reports it rather than comparing ids that were never in play.

### 2. Live is derived, and must never become a status

`evaluations.status` is untouched. Live is derived from the most recently
*verified* production deployment — the latest `production_verified` event and the
artifact it proved.

Three reasons, and the first two are the database's:

- `trg_evaluation_snapshot_immutable` permits exactly `draft|review → published`
  and `published → superseded`. A `live` value needs a hole in the one rule the
  editorial model rests on.
- Published snapshots are immutable, and Live changes without the evaluation
  changing at all — a rollback, a later build, an upload that failed after a
  build succeeded.
- Published is a fact this database owns. Live is a fact about a remote artifact,
  established by evidence and **revocable when that evidence goes away**. One
  column asserting they are the same kind of thing is the error.

Derived from the most recent *observation*, deliberately, not from the newest
artifact: a rollback makes an older artifact the current one, and ordering by
build time would report the rolled-back version as Live forever.

### 3. Three states, because two would lie

| State | Meaning |
|---|---|
| Live | the verified artifact contains this version |
| Awaiting deployment | production was verified, and serves something else |
| Not proven | production has not been verified recently enough to say |

The third is not hedging. A tool that cannot reach production and shows
"awaiting deployment" is asserting production does **not** have the version —
which it does not know, and which may be false.

The reverse direction is reported too: versions production still serves that this
database no longer publishes. That is §9.8's "the previous deployed artifact
remains Live", and it is invisible to anything that only asks about the current
corpus.

### 4. Dispatch happens strictly after the publication commits

`publishEvaluationAction` commits the publication transaction, and only then asks
for a build, in a separate transaction, where every failure is recorded rather
than raised.

An editorial act that was validated, approved and committed must not be undone
because a third-party API timed out. Putting the dispatch inside the publication
transaction would also hold the evaluation's row lock across a network call to
another company.

### 5. Accepted, refused, unknown — and the third matters most

The obvious shape is success-or-failure, and the missing case is what causes
duplicate production builds.

- **accepted** — Cloudflare returned a build id.
- **refused** — a 4xx. Cloudflare declined; no build exists; a retry is safe.
- **unknown** — a timeout, a transport failure, a 5xx, or a 200 naming no build
  id. A build may or may not exist.

A 5xx is `unknown` rather than `refused` because a proxy can fail *after* the
request reached the service. A timeout is the common case: the request very
likely arrived and the response was lost.

**Nothing retries an unknown automatically.** There is no build id to look for,
so it cannot be settled by looking; an editor checks Cloudflare and records what
they found, and the trail records that a person decided.

### 6. Coalescing is on identical intent, not on overlapping effect

A build reads the whole corpus, so one build can carry several publications. It
does not follow that a publication arriving mid-build needs no build: nothing
here knows *when* a running build read the database.

- A second request naming the **same** triggering evaluation while the first is
  unresolved is a double-submitted form, and gets the existing request.
- Two **different** publications get two requests. A redundant build is a few
  minutes of CI; a missed one is a profile that never reaches the site.
- A `manual` or `retry` request is refused while anything is unresolved, because
  those are the paths a human can repeat at will.

### 7. Persistence: current state, append-only events, immutable artifacts

Migration `0009_deployment_tracking.sql`, four tables, chosen by lifetime:

| Table | Lifetime |
|---|---|
| `deployment_requests` | mutable current state of one requested build |
| `deployment_events` | append-only; what happened and when |
| `deployment_artifacts` | immutable; what a proven artifact contained |
| `deployment_artifact_evaluations` | immutable membership |

Enforced by trigger, not by convention: the events and artifacts tables refuse
`UPDATE` and `DELETE` outright, and a request's identity — its reason, requester,
branch, cause and matched build — is frozen after creation while its observed
state may move. An audit trail whose immutability rests on nobody having written
the `UPDATE` yet is not evidence of anything.

Two details that look like fussiness and are not:

- **`deployment_events.seq` is a `bigserial`, and the Live derivation orders by
  it.** `now()` is transaction start time, so two verifications in one
  transaction carry an identical `occurred_at` and Postgres may return either.
  The test that caught this verified a rollback and was told the rolled-back
  version was Live.
- **`deployment_artifact_evaluations.evaluation_id` is `text` with no foreign
  key.** These rows record what a remote document claimed, not what this
  database believes; a fixture-backed artifact names ids that are not evaluations
  at all. A foreign key would make "production is serving something I do not
  recognise" unrecordable, which deletes exactly the evidence an operator needs
  most.

### 8. The credential is server-only, and narrower than the documented example

`CLOUDFLARE_API_TOKEN` is read in exactly one module and used in exactly one
place, as an `Authorization` header. It never appears in a message, a log, a
stored row or a rendered page; every string returned from the client passes
through `redactSecrets` first, because the provider's error bodies are not this
repository's to make promises about.

Least privilege, verified against Cloudflare's current API reference rather than
from memory:

| Permission | Level | Needed? |
|---|---|---|
| Workers Builds Configuration | Edit | **Yes** — this is what triggers a build |
| Workers Scripts | Read | **No** — only to *discover* the Worker tag |

The documented flow looks the tag up at runtime. Configuring
`CLOUDFLARE_WORKER_TAG` instead removes the call and with it the permission.
Cloudflare additionally requires the Builds API token to be **user-scoped**;
their documentation states account-scoped tokens "are not supported and will
return 'Invalid token' errors".

Deployment fails closed: with any of the token, account id or trigger id unset,
no build can be requested, publication is unaffected, and the tool says which
variable is missing. Verification needs no credential at all and keeps working.

**No deploy hook.** A deploy-hook UUID is a bearer secret in a URL, which would
change the accepted authentication decision rather than implement it.

### 9. Reconciliation is editor-triggered, and says so

There is no cron, no queue, and no background service. §9.10 rules out adding
service layers, the stack has no scheduler, and a background poller would be the
first thing in this system that touches production with nobody present.

The cost is real and stated on the page: "awaiting deployment" persists until
someone presses Check. That is honest, because until someone looks, nobody knows.

## Consequences

- **Migration 0009 must be applied to the authoritative database before this
  code is built against it.** `assertSchemaIsCurrent` refuses a database behind
  the checkout, and the public build reads that database. This is the ordering
  rule the repository already documents, not a new hazard — but it is the same
  one that blocked Phase 2C, so it is stated again here.
- A deployment that has never been verified reports every published profile as
  **not proven**, including profiles that are certainly being served. That is
  correct and will look alarming once; one press of Check resolves it.
- An artifact deployed before this migration answers 404 at
  `/deployment-manifest`, and verification says so in those words rather than
  reporting a fault.
- The manifest is public. It lists identifiers for content that is already
  public, and it must stay readable without credentials or verification cannot
  work from anywhere. Hashing the ids was considered and rejected: it would make
  the manifest unreadable at exactly the moment somebody needs to read it.
  `robots.txt` excludes it from crawling, which is tidiness rather than access
  control.
- Publishing several scopes in a row requests several builds. Deliberate; see
  §6.
- Build-status polling needs `CLOUDFLARE_WORKER_TAG`. Without it everything
  still works and the tool says the diagnostic is unavailable — Live never
  depended on it.
- **This has not been exercised against the real Cloudflare API.** No test may
  call it, no credential exists in this repository, and no production deployment
  was triggered. What is proven is the behaviour against a mock transport, the
  schema against real Postgres, and the manifest against the real artifact under
  workerd. Exercising the trigger end to end belongs with remote-admin
  activation, alongside the Hyperdrive path ADR 0021 records as equally
  unexercised.
