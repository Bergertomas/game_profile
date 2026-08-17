# ADR 0020 — Publication is validated against its outcome, previewed through the public renderer, and deployed by rebuilding main

**Status:** Accepted · 2026-08-17
**Context:** Phase 2D. Closes Master Plan v0.8 §17.2 open decisions **4**
(publish/deploy trigger) and **5** (revision-history exposure), and records the
two implementation decisions Phase 2D-1 had to make to build the publish gate at
all.

## Problem

Master Plan §8.8 requires a list of checks before publication, and §9.8 requires
Published and Live to be distinct states. Neither says how. Four questions had to
be answered before an editor could publish anything:

1. What does a preview render, given that approving a profile against a lookalike
   is the failure 2D exists to prevent?
2. What state does the publish gate validate — the draft as it stands, or the
   profile publication would produce?
3. How does a publication cause a production deploy?
4. How much revision history is exposed?

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

### 2. The gate validates the outcome, not the input

`checkPublishReadiness` runs the semantic rules against the record **as a
successful publication would leave it** — this evaluation `published` and
carrying a publication date, the version it supersedes no longer live.

This is not a convenience. Validating the current state answers the wrong
question and refuses every revision there is: until the transaction commits, the
predecessor is still `published`, so `validateGameRecord` correctly reports
`history_not_superseded` and `multiple_published_evaluations` about a state that
publishing is precisely what resolves.

Two supporting points:

- The gate loads the whole scope series as `history`. Without it the supersession
  chain is length one and every revision fails as "the oldest in the chain but
  claims to supersede X". Nothing rendered changes — `buildProfileView` never
  reads `history`.
- The gate is **not** the guarantee. Postgres enforces the same rules
  independently and remains the backstop; the gate exists so an editor gets the
  whole list in sentences beforehand rather than one constraint name at a time.
  Where the two disagree, the database is right.

### 3. Spoiler review is an attestation, not a check

§8.8 lists "no spoiler leakage" as a publication check. No program can perform
it: whether a sentence spoils a game depends on what that game withholds and
when. The implementation therefore surfaces phrasings worth a second look as
**advisory** issues that never block, and requires an explicit editor attestation
at the point of publication.

A gate that claimed to detect spoilers would be worse than none, because it would
be believed.

### 4. Publication triggers a deploy by rebuilding `main`

A publication requests a production build through the **Cloudflare Workers Builds
API**, which runs the existing `npm run cf:deploy` path unchanged.

Rejected: a second deploy path via GitHub `repository_dispatch`. It would give a
tidy audit trail in Actions, but at the cost of two ways to reach production —
and §9.9's "production deploys the exact artifact verified under workerd" is
easier to keep true when there is one.

Rebuilding `main` keeps every existing guard in force: the branch guard in
`cf-deploy.mjs`, `cf:verify` under workerd, and the containment check, none of
which a bespoke deploy path would inherit for free.

**This is decided but not yet implemented.** Phase 2D-1 publishes to the database
only; the trigger, the Published/awaiting-deployment/Live reconciliation, and the
failure/retry/audit model are Phase 2D-2, which needs a scoped Cloudflare API
token the repository does not yet hold. 2D-1 states the gap in the interface
rather than implying Publish put the profile on the site.

### 5. Revision history is admin-only for now

Superseded evaluations get admin reads and a history view, where each version is
previewable as it renders. The public reader is unchanged: it selects
`status = 'published'` and has no other mode.

Public presentation of history stays an open question. Publishing a history view
is a promise to keep publishing one, and there is not yet enough real history to
know what shape that promise should take.

## Consequences

- Phase 2D-1 requires **no schema migration**. `status`, `published_at`,
  `version_number` and `supersedes_evaluation_id` already exist.
- Publishing changes the database, not the site. Until 2D-2, a published profile
  becomes Live at the next production build.
- The publish gate and the fixture corpus are validated by the same function,
  so neither can drift from the other without a test failing.
- `validateGameRecord` now also validates the evaluation's history at publish
  time. Published rows are immutable and were validated when they published, so
  this should not fire spuriously; if it ever does, it is reporting a real
  corruption of history rather than a gate defect.
- A later decision to expose history publicly is additive: the reads exist.
