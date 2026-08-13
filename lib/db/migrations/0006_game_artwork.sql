-- Artwork carries its rights record, or it does not exist.
--
-- `games` held bare `cover_url` and `hero_url` columns. That is precisely the
-- failure ADR 0011 exists to prevent, encoded in the schema: a naked URL
-- records that an image is *reachable* and nothing about whether it may be
-- shown, so anything fetchable looks usable. The application model already had
-- clearance and basis; the database did not, and the database is where an
-- import, a migration or a future editor writes.
--
-- Every asset now arrives with the permission it renders under and the basis it
-- is held on, or it does not arrive. Artwork stays optional: no seeded game
-- carries a record, so production keeps rendering the artless composition,
-- which is a finished design rather than a gap.

CREATE TYPE "public"."artwork_basis" AS ENUM('licence', 'provider-terms', 'press-kit', 'permission', 'internal-evaluation');--> statement-breakpoint
CREATE TYPE "public"."artwork_clearance" AS ENUM('production', 'evaluation');--> statement-breakpoint
CREATE TYPE "public"."artwork_role" AS ENUM('cover', 'hero');--> statement-breakpoint
CREATE TABLE "game_artwork" (
	"game_id" uuid NOT NULL,
	"role" "artwork_role" NOT NULL,
	"url" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"alt_text" text,
	"focus" text,
	"source" text NOT NULL,
	"external_id" text,
	"clearance" "artwork_clearance" NOT NULL,
	"basis" "artwork_basis" NOT NULL,
	"credit" text,
	"source_page" text,
	"retrieved_at" date,
	CONSTRAINT "game_artwork_game_id_role_pk" PRIMARY KEY("game_id","role")
);
--> statement-breakpoint
ALTER TABLE "game_artwork" ADD CONSTRAINT "game_artwork_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "cover_url";--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "hero_url";
--> statement-breakpoint

-- The one consistency rule worth encoding. Everything else about `basis` is a
-- human judgement this schema has no business policing — but an asset held for
-- internal evaluation cannot also be cleared for the public site, and that is
-- not a judgement call.
ALTER TABLE game_artwork
  ADD CONSTRAINT game_artwork_cleared_basis
  CHECK (NOT (clearance = 'production' AND basis = 'internal-evaluation'));
--> statement-breakpoint
-- Intrinsic dimensions are how a surface reserves space before the image loads.
-- A zero would collapse the layout the artless composition was designed to hold.
ALTER TABLE game_artwork
  ADD CONSTRAINT game_artwork_dimensions_positive
  CHECK (width > 0 AND height > 0);
--> statement-breakpoint
ALTER TABLE game_artwork
  ADD CONSTRAINT game_artwork_source_present
  CHECK (length(btrim(source)) > 0);
--> statement-breakpoint
ALTER TABLE game_artwork
  ADD CONSTRAINT game_artwork_url_is_absolute
  CHECK (url ~ '^https://');
--> statement-breakpoint

-- Production-cleared artwork is a rights position somebody took, so it is
-- auditable: it must say who to credit and where the asset came from. An
-- evaluation-clearance record is internal and is held to the looser rule.
ALTER TABLE game_artwork
  ADD CONSTRAINT game_artwork_production_is_attributable
  CHECK (
    clearance <> 'production'
    OR (credit IS NOT NULL AND length(btrim(credit)) > 0 AND source_page IS NOT NULL)
  );
