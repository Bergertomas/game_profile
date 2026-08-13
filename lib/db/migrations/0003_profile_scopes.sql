-- Profile scopes: a durable identity for one evaluated experience.
--
-- Rubric §1 requires separate evaluations where modes materially change the
-- experience. The previous contract could not represent that: the live-row
-- index was keyed on (game, rubric), so The Long Dark could publish Survival
-- *or* Wintermute and never both.
--
-- This migration inserts `profile_scopes` between the game and its evaluation
-- versions:
--
--   game
--    └── scope "survival"    → v1 pre-release → v2 launch → v3 post-patch
--    └── scope "wintermute"  → v1 launch      → v2 post-patch
--
-- Both are simultaneously current, each with an independent version history.
--
-- Identity is the scope row, never text. `edition_scope` and `mode_scope` stay
-- on the evaluation, where they remain the immutable snapshot of what that
-- version declared — matching two evaluations by comparing those strings is the
-- fragile mechanism this replaces, not one it inherits.
--
-- Existing data upgrades without loss: every game that has evaluations gets one
-- `default` scope holding its whole history, which is exactly what the old
-- one-series-per-game model meant.

CREATE TABLE "profile_scopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"summary" text,
	"display_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_scopes_game_key" UNIQUE("game_id","key"),
	CONSTRAINT "profile_scopes_game_identity" UNIQUE("id","game_id")
);
--> statement-breakpoint
ALTER TABLE "profile_scopes" ADD CONSTRAINT "profile_scopes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_scopes_game_order_idx" ON "profile_scopes" USING btree ("game_id","display_order","key");--> statement-breakpoint
-- A key is an editorial handle, not prose. Enforced so a future authoring UI
-- cannot mint "The Long Dark — Survival (2024 build)" as an identity.
ALTER TABLE "profile_scopes"
  ADD CONSTRAINT "profile_scopes_key_is_a_slug"
  CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
--> statement-breakpoint
ALTER TABLE "profile_scopes"
  ADD CONSTRAINT "profile_scopes_label_present"
  CHECK (length(btrim("label")) > 0);
--> statement-breakpoint

ALTER TABLE "evaluations" ADD COLUMN "scope_id" uuid;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Backfill.
--
-- Published and superseded rows are frozen by the 0002 immutability trigger, so
-- the structural backfill has to run with user triggers off. This is a schema
-- migration writing a new foreign key onto history, not an editorial edit: no
-- score, rationale, status or provenance value is touched, and the lineage and
-- completeness assertions are re-run over every row before the migration ends.
-- ---------------------------------------------------------------------------
ALTER TABLE "evaluations" DISABLE TRIGGER USER;
--> statement-breakpoint
INSERT INTO profile_scopes (game_id, key, label, summary, display_order)
SELECT DISTINCT
  e.game_id,
  'default',
  'Main profile',
  'Upgraded from the single-series model. Rename this scope when the game''s modes are separated editorially.',
  1
FROM evaluations e;
--> statement-breakpoint
UPDATE evaluations e
SET scope_id = ps.id
FROM profile_scopes ps
WHERE ps.game_id = e.game_id
  AND ps.key = 'default'
  AND e.scope_id IS NULL;
--> statement-breakpoint
ALTER TABLE "evaluations" ENABLE TRIGGER USER;
--> statement-breakpoint

ALTER TABLE "evaluations" ALTER COLUMN "scope_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_scope_id_profile_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."profile_scopes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- The scope must belong to the evaluation's own game. A composite foreign key,
-- so Postgres enforces it: two independent keys would let a Wintermute
-- evaluation point at a Returnal scope.
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_scope_belongs_to_game" FOREIGN KEY ("scope_id","game_id") REFERENCES "public"."profile_scopes"("id","game_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evaluations_scope_status_idx" ON "evaluations" USING btree ("scope_id","status");--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Uniqueness moves from the game to the scope. This is the change that makes
-- two current profiles for one game representable.
-- ---------------------------------------------------------------------------
ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_game_version";--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_scope_version" UNIQUE("scope_id","rubric_version","version_number");--> statement-breakpoint
DROP INDEX "evaluations_one_published_per_game_rubric";
--> statement-breakpoint
CREATE UNIQUE INDEX "evaluations_one_published_per_scope_rubric"
  ON evaluations (scope_id, rubric_version)
  WHERE status = 'published';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Supersession becomes scope-local.
--
-- Same rules as 0002, with the boundary moved: a version supersedes the
-- previous version *of its own series*. Wintermute v2 cannot supersede Survival
-- v1, and each series numbers its versions independently.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_evaluation_lineage_coherent(target uuid)
RETURNS void AS $$
DECLARE
  current_scope       uuid;
  current_rubric      text;
  current_version     integer;
  current_status      evaluation_status;
  predecessor_id      uuid;
  predecessor_scope   uuid;
  predecessor_rubric  text;
  predecessor_version integer;
  predecessor_status  evaluation_status;
  incoming            record;
  final_successors    bigint := 0;
BEGIN
  SELECT scope_id, rubric_version, version_number, status, supersedes_evaluation_id
  INTO current_scope, current_rubric, current_version, current_status, predecessor_id
  FROM evaluations WHERE id = target;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF predecessor_id IS NOT NULL THEN
    SELECT scope_id, rubric_version, version_number, status
    INTO predecessor_scope, predecessor_rubric, predecessor_version, predecessor_status
    FROM evaluations WHERE id = predecessor_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'evaluation % supersedes a nonexistent evaluation', target
        USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF predecessor_scope <> current_scope THEN
      RAISE EXCEPTION
        'evaluation % supersedes an evaluation of a different profile scope', target
        USING ERRCODE = 'check_violation';
    END IF;
    IF predecessor_rubric <> current_rubric THEN
      RAISE EXCEPTION 'evaluation % crosses rubric lineages (% -> %)', target, predecessor_rubric, current_rubric
        USING ERRCODE = 'check_violation';
    END IF;
    IF predecessor_version >= current_version THEN
      RAISE EXCEPTION
        'evaluation % (version %) supersedes version %, which is not earlier',
        target, current_version, predecessor_version
        USING ERRCODE = 'check_violation';
    END IF;
    IF current_status IN ('published', 'superseded')
       AND predecessor_status <> 'superseded' THEN
      RAISE EXCEPTION
        'final evaluation % requires predecessor % to be superseded',
        target, predecessor_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  FOR incoming IN
    SELECT id, scope_id, rubric_version, version_number, status
    FROM evaluations WHERE supersedes_evaluation_id = target
  LOOP
    IF incoming.scope_id <> current_scope THEN
      RAISE EXCEPTION 'incoming successor % belongs to a different profile scope', incoming.id
        USING ERRCODE = 'check_violation';
    END IF;
    IF incoming.rubric_version <> current_rubric THEN
      RAISE EXCEPTION 'incoming successor % belongs to a different rubric', incoming.id
        USING ERRCODE = 'check_violation';
    END IF;
    IF incoming.version_number <= current_version THEN
      RAISE EXCEPTION 'incoming successor % is not a later version', incoming.id
        USING ERRCODE = 'check_violation';
    END IF;
    IF incoming.status IN ('published', 'superseded') THEN
      final_successors := final_successors + 1;
    END IF;
  END LOOP;

  IF current_status = 'superseded' AND final_successors <> 1 THEN
    RAISE EXCEPTION
      'superseded evaluation % must have exactly one final successor; found %',
      target, final_successors
      USING ERRCODE = 'check_violation';
  END IF;
  IF current_status = 'published' AND final_successors <> 0 THEN
    RAISE EXCEPTION
      'published evaluation % has a final successor and must be superseded', target
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- An evaluation's scope may not be moved to another series once it is history.
-- Nothing else in 0002 covers this: `scope_id` did not exist when the snapshot
-- immutability trigger was written, and it is compared by whole-row jsonb, so
-- it is in fact already frozen — this makes the intent explicit and survives a
-- future rewrite of that trigger.
CREATE FUNCTION trg_evaluation_scope_stable() RETURNS trigger AS $$
BEGIN
  IF OLD.status IN ('published', 'superseded')
     AND NEW.scope_id IS DISTINCT FROM OLD.scope_id THEN
    RAISE EXCEPTION
      'final evaluation % cannot be moved to another profile scope', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER evaluations_scope_stable
  BEFORE UPDATE OF scope_id ON evaluations
  FOR EACH ROW EXECUTE FUNCTION trg_evaluation_scope_stable();
--> statement-breakpoint

-- Re-validate every lineage neighbourhood and final snapshot under the new
-- scope-local rules before committing.
DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT id FROM evaluations WHERE status IN ('published', 'superseded')
  LOOP
    PERFORM assert_published_evaluation_complete(item.id);
  END LOOP;
  FOR item IN SELECT id FROM evaluations LOOP
    PERFORM assert_evaluation_lineage_coherent(item.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
