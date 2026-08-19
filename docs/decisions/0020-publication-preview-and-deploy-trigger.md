# ADR 0020 — Publication is validated against its outcome, previewed through the public renderer, and deployed by rebuilding main

**Status:** Accepted · 2026-08-17 · revised 2026-08-18 after review
**Context:** Phase 2D. Closes Master Plan v0.8 §17.2 open decisions **4**
(publish/deploy trigger) and **5** (revision-history exposure), and records the
two implementation decisions Phase 2D-1 had to make to build the publish gate at
all.

## Problem

Master Plan §8.8 requires a list of checks before publication, and §9.8 requires
Published and Live to be distinct states. Neither says how. These questions had
to be answered before an editor could publish anything:

1. What does a preview render, given that approving a profile against a lookalike
   is the failure 2D exists to prevent — and does it show the catalogue as it is,
   or as publishing would leave it?
2. What state does the publish gate validate — the draft as it stands, or the
   profile publication would produce?
3. What guarantees the snapshot that was validated is the snapshot that is
   finalized?
4. How does a publication cause a production deploy?
5. How much revision history is exposed?

## Decision

### 1. The preview is the public renderer, or it is nothing

`readEvaluationProfile` loads any evaluation by id, whatever its status, through
the *same* projection the production build reads, and the preview page hands the
result to `GameProfile` — the component `/games/<slug>` renders. There is no
admin view model of a profile.

Two consequences are deliberate:

- **Uncleared artwork is filtered out of the preview**, exactly as it is
  publicly. An image that will not appear on the public page must not appear in
  the preview, or the preview is describing a page that does not exist. The gate
  reports the clearance gap in words instead.
- **The scope switcher's data is read on the editorial connection**, not through
  the public data layer. That layer resolves the corpus assembled at build time
  and falls back to fixtures when no build-time database is configured, so
  reusing it during an admin request would put the fixture catalogue on screen
  beside a real draft.

The JSON-LD graph and the "more in the library" strip are not reproduced, for
the same reason: both read the public data layer. They are page furniture rather
than the profile being approved.

**The preview is prospective**, with respect to the *database corpus* a
successful publication would leave — not with respect to production. It shows
what a later build reading that corpus would render, not as the catalogue
stands. The case that forces
this: a game with a published primary scope and a first draft of a second scope.
Built from the currently published set, that draft previews with no scope
switcher — and then the next successful production artifact, built from the
post-publication corpus, renders one on a page nobody approved. So the switcher
is assembled from the
published siblings with this evaluation's scope replaced-or-added, which also
makes a revision replace the version it supersedes rather than appearing beside
it. Only this evaluation moves; other scopes' drafts are not included, because
publishing this one does not publish those.

**The address shown is the one this profile would own**, from `profilePath` —
`/games/<slug>` only for the primary scope, `/games/<slug>/<scope-key>` for a
sibling (ADR 0016). Naming the bare game URL for every profile was wrong for
every sibling scope.

**A draft that cannot yet render says so.** `buildProfileView` throws on a
partially scored evaluation, and it is right to: the public renderer's contract
is a complete profile. That is the ordinary state of a draft, so `readPreview`
returns it as a state rather than letting the page 500, and points at the
Publish page, which already enumerates every gap.

### 2. The gate validates the outcome, not the input

`checkPublishReadiness` runs the semantic rules against the record **as a
successful publication would leave it** — this evaluation `published` and
carrying a publication date, the version it supersedes marked `superseded`.

This is not a convenience. Validating the current state answers the wrong
question and refuses every revision there is: until the transaction commits, the
predecessor is still `published`, so `validateGameRecord` correctly reports
`history_not_superseded` and `multiple_published_evaluations` about a state that
publishing is precisely what resolves.

Two supporting points:

- The gate loads this evaluation's series as `history`. Without it the
  supersession chain is length one and every revision fails as "the oldest in
  the chain but claims to supersede X". Nothing rendered changes —
  `buildProfileView` never reads `history`.
- **That series is rubric-local**: same scope *and* same rubric version. Version
  numbering and supersession are per `(scope, rubric)` — the database says so in
  `evaluations_scope_version UNIQUE (scope_id, rubric_version, version_number)`
  — so a rubric-1.0 evaluation is not history for a rubric-2.0 one. Without the
  filter, the first evaluation under a later rubric inherits the whole earlier
  generation and is refused with `history_rubric_mismatch`, a duplicate version
  number, and a chain it cannot satisfy. The admin revision-history page still
  shows every generation; that is a different question.
- The gate is **not** the guarantee. Postgres enforces the same rules
  independently and remains the backstop; the gate exists so an editor gets the
  whole list in sentences beforehand rather than one constraint name at a time.
  Where the two disagree, the database is right.

### 3. Publication locks its target before it validates it

`publishEvaluation` takes `SELECT … FOR UPDATE` on the evaluation row **before**
`checkPublishReadiness` reads anything, and holds it through the status change.

Without it, validation and finalization are two unsynchronised halves.
`trg_evaluation_child_immutable` takes `FOR SHARE` on the owning evaluation
before any score, assessment, block, tag or evidence-link write — but the
readiness reads take no locks at all, so an editor working in another tab can
commit between "the gate passed" and the UPDATE, and the row that becomes
Published is not the row that was validated.

The database still catches the subset it enforces: `assert_published_evaluation_
complete` re-reads the children, so a newly created gap is refused. It has no
opinion about prose, evidence maturity, confidence coherence or provenance —
exactly the rules the gate exists for.

`FOR UPDATE` conflicts with that `FOR SHARE`, which closes the window and makes
two simultaneous Publish submissions safe as a side effect: the second blocks,
resumes after the first commits, re-reads, and stops at `already_published`
rather than racing the partial unique index. A child write already waiting
behaves the same way — it resumes, sees the final status, and gets the
immutability refusal it would have got a moment later.

This is not new machinery. `lock_rubric_contract` already explains its
fail-fast choice with "publication has already locked its evaluation row"; until
now that was only true from the UPDATE onward.

`tests/db-read/publication-concurrency.test.ts` proves it with two connections,
and fails when the lock is removed.

### 4. Spoiler review is an attestation, not a check

§8.8 lists "no spoiler leakage" as a publication check. No program can perform
it: whether a sentence spoils a game depends on what that game withholds and
when. The implementation therefore surfaces phrasings worth a second look as
**advisory** issues that never block, and requires an explicit editor attestation
at the point of publication.

A gate that claimed to detect spoilers would be worse than none, because it would
be believed.

### 5. Publication triggers a deploy by rebuilding `main`

A publication requests a production build through the **Cloudflare Workers Builds
API**, which runs the existing `npm run cf:deploy` path unchanged.

Rejected: a second deploy path via GitHub `repository_dispatch`. It would give a
tidy audit trail in Actions, but at the cost of two ways to reach production —
and §9.9's "production deploys the exact artifact verified under workerd" is
easier to keep true when there is one.

Rebuilding `main` keeps every existing guard in force: the branch guard in
`cf-deploy.mjs`, `cf:verify` under workerd, and the containment check, none of
which a bespoke deploy path would inherit for free.

**Implemented in Phase 2D-2** ([ADR 0022](0022-deployment-requests-and-proof-of-live.md)),
which answers the four questions this ADR left open: how the call is
authenticated, what is persisted, what counts as proof that a version is Live,
and how failure and retry behave. Phase 2D-1 published to the database only and
said so in the interface; a publication now also *requests* a build, and 2D-2's
central decision is that requesting one proves nothing — Live is established by
reading the deployed artifact's own manifest and by nothing else.

Still unexercised against the real Cloudflare API: no credential exists in this
repository, no test may call it, and no production deployment has been triggered
through this path. That belongs with remote-admin activation.

### 6. Revision history is admin-only for now

Superseded evaluations get admin reads and a history view, where each version is
previewable as it renders. The public reader is unchanged: it selects
`status = 'published'` and has no other mode.

Public presentation of history stays an open question. Publishing a history view
is a promise to keep publishing one, and there is not yet enough real history to
know what shape that promise should take.

## Consequences

- Phase 2D-1 requires **no schema migration**. `status`, `published_at`,
  `version_number` and `supersedes_evaluation_id` already exist.
- Publishing changes the database, not the site. A published version becomes
  Live only once a later production build reads it, verification succeeds, and
  that artifact deploys — so a version can be Published, and even later
  Superseded, without ever having been served. 2D-1 tracked only Published and
  said so; 2D-2 tracks the gap without collapsing it, because asking for a build
  is not the same as one arriving.
- The publish gate and the fixture corpus are validated by the same function,
  so neither can drift from the other without a test failing.
- `validateGameRecord` now also validates the evaluation's history at publish
  time. Published rows are immutable and were validated when they published, so
  this should not fire spuriously; if it ever does, it is reporting a real
  corruption of history rather than a gate defect.
- Publication holds a row lock on its target for the duration of validation, so
  a long gate blocks editorial writes to *that one evaluation* while it runs.
  That is the intended trade: the alternative is publishing something nobody
  validated. Nothing else in the scope, game or rubric is blocked.
- **Published is not Live.** Every surface says so, and
  `tests/published-vs-live.test.ts` holds the wording to a reviewed set so the
  tool cannot drift back into implying that pressing Publish changed the site.
  From 2D-2 that guard also checks structure rather than only prose: `live`
  cannot become an evaluation status, and exactly one function may record
  production as verified.
- A later decision to expose history publicly is additive: the reads exist.
