-- Deployment requests, their audit trail, and proof of what production serves.
--
-- Master Plan §9.8 makes Published and Live different states, and P0 items
-- 12–14 ask for the trigger, the reconciliation and the failure/retry/audit
-- behaviour. Phase 2D-1 shipped Published. This is the rest.
--
-- ── Live is not a status, and must never become one ────────────────────────
--
-- The tempting shape is `ALTER TYPE evaluation_status ADD VALUE 'live'`. It is
-- wrong three times over:
--
--   1. `trg_evaluation_snapshot_immutable` permits exactly `draft|review ->
--      published` and `published -> superseded`. A `live` value would need a
--      hole in the one rule the editorial model rests on.
--   2. Published snapshots are immutable. Live changes without the evaluation
--      changing at all — a rollback, a later build, a deploy that failed after
--      a build succeeded — so writing it onto the row means mutating history to
--      record something that is not about the row's content.
--   3. Published is a fact this database owns. Live is a fact about a remote
--      artifact, established by evidence and revocable when that evidence goes
--      away. Storing them in one column asserts they are the same kind of
--      thing.
--
-- So Live is DERIVED, here, by asking which artifact was most recently proven
-- to be serving production and which evaluations that artifact contains.
-- `evaluations` is not touched by this migration at all.
--
-- ── Three kinds of row, because they have three different lifetimes ────────
--
--   deployment_requests               mutable current state of one build we asked for
--   deployment_events                 append-only; what happened, and when
--   deployment_artifacts (+ members)  immutable; what a proven artifact contained
--
-- Requests change: a build is dispatched, then reports, then is superseded.
-- Events never change, because an audit trail that can be edited is not one.
-- Artifacts never change, because they are a record of something already
-- observed in the world, and rewriting it would destroy the only evidence the
-- product has that a version was ever served.

-- ---------------------------------------------------------------------------
-- Vocabulary.
--
-- The build states are named `build_reported_*` on purpose. Cloudflare telling
-- us a build succeeded is a report about a build process, NOT evidence that
-- production serves its output: the upload can still fail, a later build can
-- land first, and a rollback can replace it afterwards. Any name shorter than
-- this invites a reader to treat the value as proof. Nothing in this schema
-- derives Live from these values.
-- ---------------------------------------------------------------------------
CREATE TYPE deployment_request_state AS ENUM (
  'pending',
  'dispatched',
  'dispatch_unknown',
  'refused',
  'build_reported_success',
  'build_reported_failure',
  'superseded'
);
--> statement-breakpoint

CREATE TYPE deployment_request_reason AS ENUM (
  'publication',
  'manual',
  'retry'
);
--> statement-breakpoint

CREATE TYPE deployment_event_kind AS ENUM (
  'dispatch_attempted',
  'dispatch_accepted',
  'dispatch_refused',
  'dispatch_unknown',
  'dispatch_coalesced',
  'build_status_observed',
  'production_verified',
  'production_unverifiable',
  'retry_requested'
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- A production build this tool asked for.
--
-- One row per request, not per publication. Several publications can be covered
-- by one build — the build reads the whole corpus — and coalescing onto an
-- in-flight request is what stops a batch of edits queueing a batch of builds.
-- Which publication prompted it is recorded, but it is provenance, not scope.
-- ---------------------------------------------------------------------------
CREATE TABLE deployment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state deployment_request_state NOT NULL DEFAULT 'pending',
  reason deployment_request_reason NOT NULL,

  -- Which branch was asked for. Not constrained to 'main' here, deliberately:
  -- the branch name has one definition in TypeScript (lib/site-env.ts) that
  -- cf-common.mjs already duplicates under test, and a third hard-coded copy in
  -- SQL — where it cannot import that constant — would be the copy that goes
  -- stale silently. Production-only deployment is enforced where it can be kept
  -- honest: the Cloudflare production trigger builds `main` and nothing else,
  -- and `cf-deploy.mjs` refuses any other branch.
  branch text NOT NULL,

  requested_by text NOT NULL,
  -- The publication that prompted this, when one did. RESTRICT because a
  -- request is evidence about an evaluation's journey to production, and
  -- deleting the evaluation out from under it would leave the audit trail
  -- describing something that no longer exists. Published rows cannot be
  -- deleted anyway; this covers the draft that never made it.
  triggering_evaluation_id uuid REFERENCES evaluations(id) ON DELETE RESTRICT,

  provider text NOT NULL DEFAULT 'cloudflare_workers_builds',
  -- Cloudflare's `build_uuid`. Null until the provider accepts the request, and
  -- permanently null for a request whose outcome we never established. It is
  -- also the value Workers Builds injects into the build as
  -- WORKERS_CI_BUILD_UUID, which is what lets a manifest read back from
  -- production be matched to the request that caused it.
  provider_build_id text,
  -- The last raw status string the provider reported, kept verbatim rather than
  -- mapped, because the Builds API does not document its status vocabulary and
  -- an unrecognised value must survive to be read by a human.
  provider_status text,
  -- One sanitized sentence. Never a credential, never a raw provider response.
  last_error text,

  requested_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz,
  last_checked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- A build id identifies exactly one request. Without this, a retry storm or a
  -- double-submitted form could attach one Cloudflare build to several requests
  -- and every one of them would claim its outcome.
  CONSTRAINT deployment_requests_build_id_unique
    UNIQUE (provider, provider_build_id),

  -- A dispatched request has a build to point at; anything else is a bookkeeping
  -- error that would make the request unmatchable against a manifest forever.
  CONSTRAINT deployment_requests_dispatched_has_build_id CHECK (
    state <> 'dispatched' OR provider_build_id IS NOT NULL
  ),
  CONSTRAINT deployment_requests_branch_not_blank CHECK (btrim(branch) <> '')
);
--> statement-breakpoint

CREATE INDEX deployment_requests_state_idx
  ON deployment_requests (state, requested_at DESC);
--> statement-breakpoint
CREATE INDEX deployment_requests_evaluation_idx
  ON deployment_requests (triggering_evaluation_id);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- What a production artifact said about itself.
--
-- Written only from a manifest fetched from a deployed origin and verified
-- (lib/deploy/manifest.ts). Never from a build report, never from an intention.
--
-- The natural key is (generated_at, digest): two artifacts built from the same
-- corpus at the same instant are the same artifact, and any other pair is
-- distinguishable. `build_uuid` would be a better key but is null for a build
-- Workers Builds did not run, and a laptop `npm run cf:deploy` produces exactly
-- such an artifact — one that must still be recordable, because it is one that
-- can genuinely be serving production.
-- ---------------------------------------------------------------------------
CREATE TABLE deployment_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  generated_at timestamptz NOT NULL,
  digest text NOT NULL,
  build_uuid text,
  commit_sha text,
  branch text,
  site_env text NOT NULL,
  -- 'database' or 'fixtures'. A fixture-backed artifact is a healthy site in
  -- which NO editorial evaluation is Live, and recording that distinction is
  -- what stops the tool comparing ids that were never in play.
  source text NOT NULL,
  rubric_version text NOT NULL,
  -- Exactly the document that was served, so a later reader can audit the
  -- derivation rather than trust the columns above.
  manifest jsonb NOT NULL,

  first_observed_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT deployment_artifacts_identity UNIQUE (generated_at, digest),
  CONSTRAINT deployment_artifacts_digest_shape CHECK (digest ~ '^[0-9a-f]{64}$'),
  CONSTRAINT deployment_artifacts_source_known CHECK (source IN ('database', 'fixtures')),
  CONSTRAINT deployment_artifacts_site_env_known CHECK (site_env IN ('production', 'preview'))
);
--> statement-breakpoint

CREATE INDEX deployment_artifacts_build_uuid_idx
  ON deployment_artifacts (build_uuid);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Which evaluations a proven artifact contains.
--
-- `evaluation_id` IS DELIBERATELY text WITH NO FOREIGN KEY, and this is the one
-- place in the schema where that is right.
--
-- These rows record what a remote document claimed, not what this database
-- believes. A fixture-backed artifact names ids like `evl_returnal_v1` that are
-- not evaluations at all; a preview artifact may name rows from another
-- database entirely. A foreign key would make those artifacts unrecordable —
-- and being unable to record "production is serving something I do not
-- recognise" would delete exactly the evidence an operator needs most.
--
-- The join back to `evaluations` therefore happens in queries, where a
-- non-matching id is a finding rather than a constraint violation.
-- ---------------------------------------------------------------------------
CREATE TABLE deployment_artifact_evaluations (
  artifact_id uuid NOT NULL REFERENCES deployment_artifacts(id) ON DELETE RESTRICT,
  evaluation_id text NOT NULL,
  PRIMARY KEY (artifact_id, evaluation_id)
);
--> statement-breakpoint

CREATE INDEX deployment_artifact_evaluations_evaluation_idx
  ON deployment_artifact_evaluations (evaluation_id);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- The audit trail.
--
-- Every interaction with the provider and every verification attempt lands
-- here, successful or not. Failures especially: a tool that records only what
-- worked cannot answer "why is this still not Live", which is the only question
-- anyone will ever ask it.
-- ---------------------------------------------------------------------------
CREATE TABLE deployment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- MONOTONIC, AND THE LIVE DERIVATION DEPENDS ON IT.
  --
  -- "Which artifact is production serving" is answered by the most recent
  -- `production_verified` event. Ordering that by timestamp alone is ambiguous
  -- in exactly the case that matters: `now()` is TRANSACTION start time, so two
  -- verifications in one transaction carry an identical `occurred_at` and the
  -- database is free to return either. The test that caught this verified a
  -- rollback — new artifact, then the older one again — and got told the
  -- rolled-back version was Live.
  --
  -- `clock_timestamp()` below fixes the transaction case and is the more honest
  -- default anyway (an event happened when it happened, not when its
  -- transaction began). This sequence settles the rest: microsecond ties, and
  -- any future clock adjustment.
  seq bigserial NOT NULL,

  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  kind deployment_event_kind NOT NULL,

  request_id uuid REFERENCES deployment_requests(id) ON DELETE RESTRICT,
  artifact_id uuid REFERENCES deployment_artifacts(id) ON DELETE RESTRICT,

  -- The editor who caused it, or 'system' for an automatic step.
  actor text NOT NULL,
  -- One sentence, written for a human reading this during an incident.
  summary text NOT NULL,
  -- Structured context. MUST NOT contain credentials: the Cloudflare client
  -- sanitizes before anything reaches here (lib/deploy/cloudflare.ts).
  detail jsonb,

  CONSTRAINT deployment_events_summary_not_blank CHECK (btrim(summary) <> '')
);
--> statement-breakpoint

CREATE INDEX deployment_events_recent_idx
  ON deployment_events (occurred_at DESC, seq DESC);
--> statement-breakpoint
CREATE INDEX deployment_events_request_idx
  ON deployment_events (request_id, occurred_at DESC);
--> statement-breakpoint
-- The Live derivation reads this: the most recent `production_verified` event
-- and the artifact it proved. Partial, because that is a handful of rows out of
-- everything the trail accumulates.
CREATE INDEX deployment_events_verified_idx
  ON deployment_events (occurred_at DESC, seq DESC)
  WHERE kind = 'production_verified';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Append-only, enforced.
--
-- The application has no code that updates or deletes these rows, which is a
-- fact about today's application. The trigger is the fact about the data: a
-- psql session, a future refactor and a well-meant cleanup script all meet the
-- same refusal. An audit trail whose immutability rests on nobody having
-- written the UPDATE yet is not evidence of anything.
-- ---------------------------------------------------------------------------
CREATE FUNCTION trg_deployment_record_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    '% rows are append-only: % is not permitted. These records are evidence about deployments that already happened; correct the record by appending, never by editing.',
    TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER deployment_events_append_only
  BEFORE UPDATE OR DELETE ON deployment_events
  FOR EACH ROW EXECUTE FUNCTION trg_deployment_record_append_only();
--> statement-breakpoint

CREATE TRIGGER deployment_artifacts_append_only
  BEFORE UPDATE OR DELETE ON deployment_artifacts
  FOR EACH ROW EXECUTE FUNCTION trg_deployment_record_append_only();
--> statement-breakpoint

CREATE TRIGGER deployment_artifact_evaluations_append_only
  BEFORE UPDATE OR DELETE ON deployment_artifact_evaluations
  FOR EACH ROW EXECUTE FUNCTION trg_deployment_record_append_only();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Requests are mutable, but not arbitrarily.
--
-- A request's identity, its cause and what it asked for are settled the moment
-- it is created. Only the columns that track what has since been learned may
-- move. Without this, a retry could rewrite an earlier request's reason and
-- requester, and the trail would show one request that had always been the
-- current one.
--
-- `provider_build_id` may be set once, from null. It may not be changed
-- afterwards: a request that has already been matched to a Cloudflare build
-- cannot later claim a different one without orphaning every event that named
-- the first.
-- ---------------------------------------------------------------------------
CREATE FUNCTION trg_deployment_request_identity_frozen() RETURNS trigger AS $$
BEGIN
  IF NEW.id <> OLD.id
     OR NEW.reason <> OLD.reason
     OR NEW.branch <> OLD.branch
     OR NEW.requested_by <> OLD.requested_by
     OR NEW.provider <> OLD.provider
     OR NEW.requested_at <> OLD.requested_at
     OR NEW.triggering_evaluation_id IS DISTINCT FROM OLD.triggering_evaluation_id THEN
    RAISE EXCEPTION
      'deployment request % is fixed in what it asked for and who asked; only its observed state may change',
      OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.provider_build_id IS NOT NULL
     AND NEW.provider_build_id IS DISTINCT FROM OLD.provider_build_id THEN
    RAISE EXCEPTION
      'deployment request % is already matched to build %; a request cannot be re-pointed at another build',
      OLD.id, OLD.provider_build_id
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER deployment_requests_identity_frozen
  BEFORE UPDATE ON deployment_requests
  FOR EACH ROW EXECUTE FUNCTION trg_deployment_request_identity_frozen();
