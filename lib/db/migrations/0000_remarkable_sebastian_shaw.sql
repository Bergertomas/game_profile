CREATE TYPE "public"."block_type" AS ENUM('great_fit', 'know_before', 'probably_not');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."evaluation_status" AS ENUM('draft', 'review', 'published', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."evidence_ledger_state" AS ENUM('populated', 'pending');--> statement-breakpoint
CREATE TYPE "public"."evidence_maturity" AS ENUM('announced', 'showcased', 'hands_on', 'review_code');--> statement-breakpoint
CREATE TYPE "public"."evidence_status" AS ENUM('verified', 'provisional', 'pre_release');--> statement-breakpoint
CREATE TYPE "public"."evidence_tier" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."release_status" AS ENUM('released', 'upcoming', 'early_access');--> statement-breakpoint
CREATE TYPE "public"."score_provenance" AS ENUM('calibration_round_1', 'calibration_round_2', 'derived_pending_round_1_reconciliation');--> statement-breakpoint
CREATE TYPE "public"."source_category" AS ENUM('direct_play', 'critic', 'technical', 'specialist_creator', 'player_signal', 'first_party');--> statement-breakpoint
CREATE TYPE "public"."tag_intensity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."tag_value_type" AS ENUM('boolean', 'intensity');--> statement-breakpoint
CREATE TABLE "dimension_assessments" (
	"evaluation_id" uuid NOT NULL,
	"dimension_id" uuid NOT NULL,
	"confidence" "confidence" NOT NULL,
	"note" text,
	CONSTRAINT "dimension_assessments_evaluation_id_dimension_id_pk" PRIMARY KEY("evaluation_id","dimension_id")
);
--> statement-breakpoint
CREATE TABLE "dimensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rubric_version" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"display_order" integer NOT NULL,
	"radar_order" integer NOT NULL,
	CONSTRAINT "dimensions_version_key" UNIQUE("rubric_version","key")
);
--> statement-breakpoint
CREATE TABLE "evaluation_evidence_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"evidence_source_id" uuid NOT NULL,
	"dimension_id" uuid,
	"subcriterion_id" uuid,
	"platform_scope" text[],
	"note" text,
	"spoiler_sensitive" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text,
	"summary" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_tags" (
	"evaluation_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"intensity" "tag_intensity",
	"note" text,
	CONSTRAINT "evaluation_tags_evaluation_id_tag_id_pk" PRIMARY KEY("evaluation_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"rubric_version" text NOT NULL,
	"version_number" integer NOT NULL,
	"edition_scope" text NOT NULL,
	"mode_scope" text NOT NULL,
	"platform_scope" text[] NOT NULL,
	"build_or_patch_scope" text NOT NULL,
	"current_state_cutoff_at" date,
	"status" "evaluation_status" DEFAULT 'draft' NOT NULL,
	"evidence_status" "evidence_status" NOT NULL,
	"evidence_maturity" "evidence_maturity",
	"confidence" "confidence" NOT NULL,
	"evidence_cutoff_at" date NOT NULL,
	"release_context" text,
	"one_line_experience" text,
	"primary_pull" text,
	"primary_risk" text,
	"platform_warning" text,
	"score_provenance" "score_provenance" NOT NULL,
	"provenance_note" text,
	"evidence_ledger" "evidence_ledger_state" DEFAULT 'pending' NOT NULL,
	"created_by" text,
	"reviewed_by" text,
	"published_at" timestamp with time zone,
	"supersedes_evaluation_id" uuid,
	"change_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluations_game_version" UNIQUE("game_id","rubric_version","version_number")
);
--> statement-breakpoint
CREATE TABLE "evidence_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"publisher" text,
	"author" text,
	"published_at" date,
	"accessed_at" date,
	"evidence_tier" "evidence_tier" NOT NULL,
	"source_category" "source_category" NOT NULL,
	"source_type" text,
	CONSTRAINT "evidence_sources_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
CREATE TABLE "game_aliases" (
	"game_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"alias_type" text,
	CONSTRAINT "game_aliases_game_id_alias_pk" PRIMARY KEY("game_id","alias")
);
--> statement-breakpoint
CREATE TABLE "game_external_ids" (
	"game_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"external_url" text,
	CONSTRAINT "game_external_ids_game_id_provider_pk" PRIMARY KEY("game_id","provider")
);
--> statement-breakpoint
CREATE TABLE "game_platforms" (
	"game_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"release_date" date,
	"performance_notes" text,
	CONSTRAINT "game_platforms_game_id_platform_id_pk" PRIMARY KEY("game_id","platform_id")
);
--> statement-breakpoint
CREATE TABLE "game_time_estimates" (
	"game_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_game_id" text,
	"main_or_hasty_seconds" integer,
	"normal_or_main_plus_seconds" integer,
	"completionist_seconds" integer,
	"submission_count" integer,
	"provider_updated_at" timestamp with time zone,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attribution_text" text,
	CONSTRAINT "game_time_estimates_game_id_provider_pk" PRIMARY KEY("game_id","provider")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"canonical_title" text NOT NULL,
	"summary" text,
	"cover_url" text,
	"hero_url" text,
	"developer_text" text,
	"publisher_text" text,
	"first_release_date" date,
	"release_status" "release_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "platforms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profile_blocks" (
	"evaluation_id" uuid NOT NULL,
	"block_type" "block_type" NOT NULL,
	"item_order" integer NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "profile_blocks_evaluation_id_block_type_item_order_pk" PRIMARY KEY("evaluation_id","block_type","item_order")
);
--> statement-breakpoint
CREATE TABLE "subcriteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dimension_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"display_order" integer NOT NULL,
	CONSTRAINT "subcriteria_dimension_key" UNIQUE("dimension_id","key")
);
--> statement-breakpoint
CREATE TABLE "subcriterion_scores" (
	"evaluation_id" uuid NOT NULL,
	"subcriterion_id" uuid NOT NULL,
	"score" numeric(2, 1),
	"platform_id" uuid,
	"rationale" text,
	"platform_note" text,
	"evidence_confidence" "confidence",
	CONSTRAINT "subcriterion_scores_evaluation_id_subcriterion_id_pk" PRIMARY KEY("evaluation_id","subcriterion_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"value_type" "tag_value_type" DEFAULT 'boolean' NOT NULL,
	CONSTRAINT "tags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "dimension_assessments" ADD CONSTRAINT "dimension_assessments_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dimension_assessments" ADD CONSTRAINT "dimension_assessments_dimension_id_dimensions_id_fk" FOREIGN KEY ("dimension_id") REFERENCES "public"."dimensions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_evidence_links" ADD CONSTRAINT "evaluation_evidence_links_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_evidence_links" ADD CONSTRAINT "evaluation_evidence_links_evidence_source_id_evidence_sources_id_fk" FOREIGN KEY ("evidence_source_id") REFERENCES "public"."evidence_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_evidence_links" ADD CONSTRAINT "evaluation_evidence_links_dimension_id_dimensions_id_fk" FOREIGN KEY ("dimension_id") REFERENCES "public"."dimensions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_evidence_links" ADD CONSTRAINT "evaluation_evidence_links_subcriterion_id_subcriteria_id_fk" FOREIGN KEY ("subcriterion_id") REFERENCES "public"."subcriteria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_revisions" ADD CONSTRAINT "evaluation_revisions_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_tags" ADD CONSTRAINT "evaluation_tags_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_tags" ADD CONSTRAINT "evaluation_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_supersedes_evaluation_id_evaluations_id_fk" FOREIGN KEY ("supersedes_evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_aliases" ADD CONSTRAINT "game_aliases_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_external_ids" ADD CONSTRAINT "game_external_ids_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD CONSTRAINT "game_platforms_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD CONSTRAINT "game_platforms_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_time_estimates" ADD CONSTRAINT "game_time_estimates_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_blocks" ADD CONSTRAINT "profile_blocks_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcriteria" ADD CONSTRAINT "subcriteria_dimension_id_dimensions_id_fk" FOREIGN KEY ("dimension_id") REFERENCES "public"."dimensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcriterion_scores" ADD CONSTRAINT "subcriterion_scores_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcriterion_scores" ADD CONSTRAINT "subcriterion_scores_subcriterion_id_subcriteria_id_fk" FOREIGN KEY ("subcriterion_id") REFERENCES "public"."subcriteria"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcriterion_scores" ADD CONSTRAINT "subcriterion_scores_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evaluation_evidence_links_eval_idx" ON "evaluation_evidence_links" USING btree ("evaluation_id","dimension_id");--> statement-breakpoint
CREATE INDEX "evaluations_game_status_idx" ON "evaluations" USING btree ("game_id","status");--> statement-breakpoint
CREATE INDEX "game_aliases_alias_idx" ON "game_aliases" USING btree ("alias");--> statement-breakpoint
CREATE INDEX "games_title_idx" ON "games" USING btree ("canonical_title");