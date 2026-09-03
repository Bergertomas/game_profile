-- IGDB staging: provider metadata with provenance, kept apart from editorial truth.
--
-- Phase 3A Item 5 (issue #48; ADR 0037). These tables hold a faithful copy of
-- what IGDB said — each row with the run that fetched it, when, through which
-- path (API or Data Partner dump), the provider checksum/updated_at and the raw
-- record — and NOTHING that the editorial model treats as its own. No column
-- here is a score, a publication state, a profile scope, or an artwork
-- clearance; the tables above the boundary (games, profile_scopes,
-- evaluations, game_artwork) are not altered by this migration except for one
-- integrity index on game_external_ids.
--
-- Identity is kept in three places on purpose:
--
--   games / profile_scopes          Should I Play?'s own canonical identity
--   igdb_games                      the provider's entity, by IGDB id
--   igdb_identity_candidates        a REVIEWED claim relating the two; only an
--                                   accepted `canonical_game` row is written
--                                   through to game_external_ids, by a person
--
-- IGDB's `version_parent` (same work, another edition) and `parent_game`
-- (additional content, or bundle membership) are different facts. Every edge in
-- igdb_game_relations names the provider field that asserted it, so the two can
-- never be read as one relation after the fact.
--
-- Additive only. Applied to a populated database in the regression suite like
-- every migration after 0002.

CREATE TYPE "public"."igdb_change_class" AS ENUM('provider_text_drift', 'identity_or_relationship', 'platform_or_release', 'artwork_candidate', 'material_scope');--> statement-breakpoint
CREATE TYPE "public"."igdb_change_review_state" AS ENUM('open', 'acknowledged', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."igdb_identity_class" AS ENUM('base_game', 'version_edition', 'dlc', 'expansion', 'standalone_expansion', 'bundle', 'port', 'remake', 'remaster', 'other_content', 'unclassified');--> statement-breakpoint
CREATE TYPE "public"."igdb_identity_role" AS ENUM('canonical_game', 'edition_of_game', 'dlc_of_game', 'expansion_of_game', 'standalone_expansion_of_game', 'remake_or_remaster_of_game', 'port_of_game', 'bundle_of_game', 'unrelated');--> statement-breakpoint
CREATE TYPE "public"."igdb_image_kind" AS ENUM('cover', 'artwork');--> statement-breakpoint
CREATE TYPE "public"."igdb_relation_kind" AS ENUM('version_of', 'dlc_of', 'expansion_of', 'standalone_expansion_of', 'mod_of', 'episode_of', 'season_of', 'pack_of', 'update_of', 'bundle_contains', 'port_of', 'remake_of', 'remaster_of', 'expanded_game_of', 'fork_of', 'parent_game_unclassified');--> statement-breakpoint
CREATE TYPE "public"."igdb_review_state" AS ENUM('proposed', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."igdb_source_kind" AS ENUM('api', 'dump', 'fixture');--> statement-breakpoint
CREATE TABLE "igdb_alternative_names" (
	"igdb_id" bigint PRIMARY KEY NOT NULL,
	"igdb_game_id" bigint NOT NULL,
	"checksum" uuid,
	"name" text NOT NULL,
	"comment" text,
	"raw" jsonb NOT NULL,
	"run_id" uuid NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "igdb_change_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"igdb_game_id" bigint NOT NULL,
	"run_id" uuid NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"previous_checksum" uuid,
	"next_checksum" uuid,
	"previous_igdb_updated_at" timestamp with time zone,
	"next_igdb_updated_at" timestamp with time zone,
	"classes" "igdb_change_class"[] NOT NULL,
	"changed_fields" jsonb NOT NULL,
	"requires_editorial_review" boolean NOT NULL,
	"review_state" "igdb_change_review_state" DEFAULT 'open' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "igdb_external_games" (
	"igdb_id" bigint PRIMARY KEY NOT NULL,
	"igdb_game_id" bigint NOT NULL,
	"checksum" uuid,
	"igdb_updated_at" timestamp with time zone,
	"source_id" integer,
	"source_name" text,
	"uid" text,
	"name" text,
	"platform_igdb_id" bigint,
	"url" text,
	"release_format_id" integer,
	"release_format_name" text,
	"raw" jsonb NOT NULL,
	"run_id" uuid NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "igdb_game_relations" (
	"subject_igdb_id" bigint NOT NULL,
	"object_igdb_id" bigint NOT NULL,
	"kind" "igdb_relation_kind" NOT NULL,
	"source_field" text NOT NULL,
	"asserted_by_igdb_id" bigint NOT NULL,
	"run_id" uuid NOT NULL,
	CONSTRAINT "igdb_game_relations_subject_igdb_id_object_igdb_id_kind_source_field_pk" PRIMARY KEY("subject_igdb_id","object_igdb_id","kind","source_field")
);
--> statement-breakpoint
CREATE TABLE "igdb_games" (
	"igdb_id" bigint PRIMARY KEY NOT NULL,
	"checksum" uuid,
	"igdb_updated_at" timestamp with time zone,
	"igdb_created_at" timestamp with time zone,
	"name" text NOT NULL,
	"slug" text,
	"url" text,
	"summary" text,
	"version_title" text,
	"game_type_id" integer,
	"game_type_name" text,
	"game_status_id" integer,
	"game_status_name" text,
	"parent_game_igdb_id" bigint,
	"version_parent_igdb_id" bigint,
	"identity_class" "igdb_identity_class" NOT NULL,
	"first_release_date" date,
	"platform_igdb_ids" bigint[] DEFAULT '{}' NOT NULL,
	"raw" jsonb NOT NULL,
	"source_kind" "igdb_source_kind" NOT NULL,
	"source_ref" text NOT NULL,
	"run_id" uuid NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_changed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "igdb_identity_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_game_id" bigint NOT NULL,
	"game_id" uuid,
	"scope_id" uuid,
	"role" "igdb_identity_role" NOT NULL,
	"state" "igdb_review_state" DEFAULT 'proposed' NOT NULL,
	"rationale" text NOT NULL,
	"proposed_by" text NOT NULL,
	"proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"decision_note" text
);
--> statement-breakpoint
CREATE TABLE "igdb_images" (
	"image_kind" "igdb_image_kind" NOT NULL,
	"igdb_id" bigint NOT NULL,
	"igdb_game_id" bigint NOT NULL,
	"checksum" uuid,
	"image_id" text NOT NULL,
	"width" integer,
	"height" integer,
	"image_type_id" integer,
	"image_type_name" text,
	"alpha_channel" boolean,
	"animated" boolean,
	"provider_url" text,
	"game_localization_igdb_id" bigint,
	"raw" jsonb NOT NULL,
	"run_id" uuid NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "igdb_images_image_kind_igdb_id_pk" PRIMARY KEY("image_kind","igdb_id")
);
--> statement-breakpoint
CREATE TABLE "igdb_ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_kind" "igdb_source_kind" NOT NULL,
	"source_ref" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"record_count" integer DEFAULT 0 NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "igdb_involved_companies" (
	"igdb_id" bigint PRIMARY KEY NOT NULL,
	"igdb_game_id" bigint NOT NULL,
	"checksum" uuid,
	"igdb_updated_at" timestamp with time zone,
	"company_igdb_id" bigint,
	"company_name" text,
	"developer" boolean DEFAULT false NOT NULL,
	"publisher" boolean DEFAULT false NOT NULL,
	"porting" boolean DEFAULT false NOT NULL,
	"supporting" boolean DEFAULT false NOT NULL,
	"raw" jsonb NOT NULL,
	"run_id" uuid NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "igdb_platforms" (
	"igdb_id" bigint PRIMARY KEY NOT NULL,
	"checksum" uuid,
	"igdb_updated_at" timestamp with time zone,
	"name" text NOT NULL,
	"slug" text,
	"abbreviation" text,
	"platform_type_id" integer,
	"platform_type_name" text,
	"raw" jsonb NOT NULL,
	"run_id" uuid NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "igdb_release_dates" (
	"igdb_id" bigint PRIMARY KEY NOT NULL,
	"igdb_game_id" bigint NOT NULL,
	"checksum" uuid,
	"igdb_updated_at" timestamp with time zone,
	"platform_igdb_id" bigint,
	"platform_name" text,
	"release_date" date,
	"date_format_id" integer,
	"date_format_name" text,
	"release_region_id" integer,
	"release_region_name" text,
	"status_id" integer,
	"status_name" text,
	"human" text,
	"raw" jsonb NOT NULL,
	"run_id" uuid NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "igdb_alternative_names" ADD CONSTRAINT "igdb_alternative_names_igdb_game_id_igdb_games_igdb_id_fk" FOREIGN KEY ("igdb_game_id") REFERENCES "public"."igdb_games"("igdb_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_alternative_names" ADD CONSTRAINT "igdb_alternative_names_run_id_igdb_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."igdb_ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_change_events" ADD CONSTRAINT "igdb_change_events_igdb_game_id_igdb_games_igdb_id_fk" FOREIGN KEY ("igdb_game_id") REFERENCES "public"."igdb_games"("igdb_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_change_events" ADD CONSTRAINT "igdb_change_events_run_id_igdb_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."igdb_ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_external_games" ADD CONSTRAINT "igdb_external_games_igdb_game_id_igdb_games_igdb_id_fk" FOREIGN KEY ("igdb_game_id") REFERENCES "public"."igdb_games"("igdb_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_external_games" ADD CONSTRAINT "igdb_external_games_run_id_igdb_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."igdb_ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_game_relations" ADD CONSTRAINT "igdb_game_relations_asserted_by_igdb_id_igdb_games_igdb_id_fk" FOREIGN KEY ("asserted_by_igdb_id") REFERENCES "public"."igdb_games"("igdb_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_game_relations" ADD CONSTRAINT "igdb_game_relations_run_id_igdb_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."igdb_ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_games" ADD CONSTRAINT "igdb_games_run_id_igdb_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."igdb_ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_identity_candidates" ADD CONSTRAINT "igdb_identity_candidates_igdb_game_id_igdb_games_igdb_id_fk" FOREIGN KEY ("igdb_game_id") REFERENCES "public"."igdb_games"("igdb_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_identity_candidates" ADD CONSTRAINT "igdb_identity_candidates_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_identity_candidates" ADD CONSTRAINT "igdb_identity_candidates_scope_id_profile_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."profile_scopes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_identity_candidates" ADD CONSTRAINT "igdb_identity_candidates_scope_belongs_to_game" FOREIGN KEY ("scope_id","game_id") REFERENCES "public"."profile_scopes"("id","game_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_images" ADD CONSTRAINT "igdb_images_igdb_game_id_igdb_games_igdb_id_fk" FOREIGN KEY ("igdb_game_id") REFERENCES "public"."igdb_games"("igdb_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_images" ADD CONSTRAINT "igdb_images_run_id_igdb_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."igdb_ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_involved_companies" ADD CONSTRAINT "igdb_involved_companies_igdb_game_id_igdb_games_igdb_id_fk" FOREIGN KEY ("igdb_game_id") REFERENCES "public"."igdb_games"("igdb_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_involved_companies" ADD CONSTRAINT "igdb_involved_companies_run_id_igdb_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."igdb_ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_platforms" ADD CONSTRAINT "igdb_platforms_run_id_igdb_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."igdb_ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_release_dates" ADD CONSTRAINT "igdb_release_dates_igdb_game_id_igdb_games_igdb_id_fk" FOREIGN KEY ("igdb_game_id") REFERENCES "public"."igdb_games"("igdb_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igdb_release_dates" ADD CONSTRAINT "igdb_release_dates_run_id_igdb_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."igdb_ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "igdb_alternative_names_game_idx" ON "igdb_alternative_names" USING btree ("igdb_game_id");--> statement-breakpoint
CREATE INDEX "igdb_change_events_game_idx" ON "igdb_change_events" USING btree ("igdb_game_id");--> statement-breakpoint
CREATE INDEX "igdb_external_games_game_idx" ON "igdb_external_games" USING btree ("igdb_game_id");--> statement-breakpoint
CREATE INDEX "igdb_game_relations_object_idx" ON "igdb_game_relations" USING btree ("object_igdb_id");--> statement-breakpoint
CREATE INDEX "igdb_games_parent_idx" ON "igdb_games" USING btree ("parent_game_igdb_id");--> statement-breakpoint
CREATE INDEX "igdb_games_version_parent_idx" ON "igdb_games" USING btree ("version_parent_igdb_id");--> statement-breakpoint
CREATE INDEX "igdb_identity_candidates_game_idx" ON "igdb_identity_candidates" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "igdb_identity_candidates_igdb_idx" ON "igdb_identity_candidates" USING btree ("igdb_game_id");--> statement-breakpoint
CREATE INDEX "igdb_images_game_idx" ON "igdb_images" USING btree ("igdb_game_id");--> statement-breakpoint
CREATE INDEX "igdb_involved_companies_game_idx" ON "igdb_involved_companies" USING btree ("igdb_game_id");--> statement-breakpoint
CREATE INDEX "igdb_release_dates_game_idx" ON "igdb_release_dates" USING btree ("igdb_game_id");--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Hand-written contract beneath the generated tables.
-- ---------------------------------------------------------------------------

-- One provider identity maps to at most one internal game. game_external_ids is
-- keyed (game, provider), which already stops one game claiming two IGDB ids;
-- this stops two games claiming the same one, which is a conflict a human must
-- resolve rather than a state the catalogue may silently hold.
CREATE UNIQUE INDEX game_external_ids_provider_external_unique
  ON game_external_ids (provider, external_id);
--> statement-breakpoint

ALTER TABLE igdb_ingestion_runs
  ADD CONSTRAINT igdb_ingestion_runs_source_ref_present
  CHECK (length(btrim(source_ref)) > 0);
--> statement-breakpoint

ALTER TABLE igdb_games
  ADD CONSTRAINT igdb_games_name_present CHECK (length(btrim(name)) > 0);
--> statement-breakpoint
ALTER TABLE igdb_games
  ADD CONSTRAINT igdb_games_source_ref_present CHECK (length(btrim(source_ref)) > 0);
--> statement-breakpoint
-- A record is never its own parent or its own edition.
ALTER TABLE igdb_games
  ADD CONSTRAINT igdb_games_not_own_parent
  CHECK (parent_game_igdb_id IS NULL OR parent_game_igdb_id <> igdb_id);
--> statement-breakpoint
ALTER TABLE igdb_games
  ADD CONSTRAINT igdb_games_not_own_version_parent
  CHECK (version_parent_igdb_id IS NULL OR version_parent_igdb_id <> igdb_id);
--> statement-breakpoint
-- The derived class and the raw field it derives from cannot disagree: a row is
-- a version/edition exactly when IGDB gave it a version_parent.
ALTER TABLE igdb_games
  ADD CONSTRAINT igdb_games_version_edition_iff_version_parent
  CHECK ((identity_class = 'version_edition') = (version_parent_igdb_id IS NOT NULL));
--> statement-breakpoint

ALTER TABLE igdb_game_relations
  ADD CONSTRAINT igdb_game_relations_not_reflexive
  CHECK (subject_igdb_id <> object_igdb_id);
--> statement-breakpoint
ALTER TABLE igdb_game_relations
  ADD CONSTRAINT igdb_game_relations_source_field_present
  CHECK (length(btrim(source_field)) > 0);
--> statement-breakpoint
-- version_of edges come from version_parent and nowhere else, and version_parent
-- asserts nothing but version_of. This is the anti-conflation rule in SQL.
ALTER TABLE igdb_game_relations
  ADD CONSTRAINT igdb_game_relations_version_field_matches_kind
  CHECK ((kind = 'version_of') = (source_field = 'version_parent'));
--> statement-breakpoint

ALTER TABLE igdb_images
  ADD CONSTRAINT igdb_images_image_id_shape CHECK (image_id ~ '^[A-Za-z0-9_-]+$');
--> statement-breakpoint
ALTER TABLE igdb_images
  ADD CONSTRAINT igdb_images_dimensions_positive
  CHECK ((width IS NULL OR width > 0) AND (height IS NULL OR height > 0));
--> statement-breakpoint

ALTER TABLE igdb_identity_candidates
  ADD CONSTRAINT igdb_identity_candidates_rationale_present
  CHECK (length(btrim(rationale)) > 0);
--> statement-breakpoint
ALTER TABLE igdb_identity_candidates
  ADD CONSTRAINT igdb_identity_candidates_proposed_by_present
  CHECK (length(btrim(proposed_by)) > 0);
--> statement-breakpoint
-- Every role but `unrelated` is a claim about a named internal game.
ALTER TABLE igdb_identity_candidates
  ADD CONSTRAINT igdb_identity_candidates_role_names_game
  CHECK (role = 'unrelated' OR game_id IS NOT NULL);
--> statement-breakpoint
-- A scope belongs to a game. The composite foreign key
-- igdb_identity_candidates_scope_belongs_to_game (generated above, against
-- profile_scopes (id, game_id)) proves the pair; this check closes the gap a
-- MATCH SIMPLE foreign key leaves open, where a NULL game_id beside a non-NULL
-- scope_id would not be checked at all.
ALTER TABLE igdb_identity_candidates
  ADD CONSTRAINT igdb_identity_candidates_scope_needs_game
  CHECK (scope_id IS NULL OR game_id IS NOT NULL);
--> statement-breakpoint
-- A decision is somebody's, at some time; a proposal is nobody's decision yet.
ALTER TABLE igdb_identity_candidates
  ADD CONSTRAINT igdb_identity_candidates_decision_consistent
  CHECK (
    (state = 'proposed' AND decided_by IS NULL AND decided_at IS NULL)
    OR (state <> 'proposed'
        AND decided_by IS NOT NULL AND length(btrim(decided_by)) > 0
        AND decided_at IS NOT NULL)
  );
--> statement-breakpoint
CREATE UNIQUE INDEX igdb_identity_candidates_one_accepted_canonical_per_igdb
  ON igdb_identity_candidates (igdb_game_id)
  WHERE state = 'accepted' AND role = 'canonical_game';
--> statement-breakpoint
CREATE UNIQUE INDEX igdb_identity_candidates_one_accepted_canonical_per_game
  ON igdb_identity_candidates (game_id)
  WHERE state = 'accepted' AND role = 'canonical_game';
--> statement-breakpoint

ALTER TABLE igdb_change_events
  ADD CONSTRAINT igdb_change_events_classes_present
  CHECK (cardinality(classes) > 0);
--> statement-breakpoint
ALTER TABLE igdb_change_events
  ADD CONSTRAINT igdb_change_events_review_consistent
  CHECK (
    (review_state = 'open' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (review_state <> 'open' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  );
--> statement-breakpoint

-- The change log is evidence. A row may be reviewed; it may not be rewritten or
-- removed, because a provider change that was observed and then edited away is
-- exactly the silent editorial drift ADR 0026 forbids.
CREATE OR REPLACE FUNCTION igdb_change_events_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'igdb_change_events is append-only: rows cannot be deleted'
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF NEW.id <> OLD.id
     OR NEW.igdb_game_id <> OLD.igdb_game_id
     OR NEW.run_id <> OLD.run_id
     OR NEW.detected_at <> OLD.detected_at
     OR NEW.previous_checksum IS DISTINCT FROM OLD.previous_checksum
     OR NEW.next_checksum IS DISTINCT FROM OLD.next_checksum
     OR NEW.previous_igdb_updated_at IS DISTINCT FROM OLD.previous_igdb_updated_at
     OR NEW.next_igdb_updated_at IS DISTINCT FROM OLD.next_igdb_updated_at
     OR NEW.classes <> OLD.classes
     OR NEW.changed_fields <> OLD.changed_fields
     OR NEW.requires_editorial_review <> OLD.requires_editorial_review
  THEN
    RAISE EXCEPTION 'igdb_change_events is append-only: only review_state, reviewed_by and reviewed_at may change'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER trg_igdb_change_events_append_only
  BEFORE UPDATE OR DELETE ON igdb_change_events
  FOR EACH ROW EXECUTE FUNCTION igdb_change_events_append_only();
