-- Generic score provenance.
--
-- `score_provenance` was calibration-specific: `calibration_round_1`,
-- `calibration_round_2`, `derived_pending_round_1_reconciliation`. Correct for
-- a three-profile calibration corpus, and wrong for every profile after it. An
-- ordinary authored evaluation had no value to carry and would have had to
-- pretend to belong to a round; a fourth round would have needed a schema
-- migration; and "pending reconciliation" is a state a profile passes through,
-- not a fact about where its numbers came from.
--
-- Two orthogonal things were tangled in one enum, and are separated here:
--
--   score_provenance   the durable KIND — editorial | calibration | derived
--   calibration_round  WHICH round, as a row in a registry
--
-- So a new round is data, a normal editorial profile needs neither a schema
-- change nor a fictitious round, and the column does not grow a value every
-- time the workflow acquires a state.

CREATE TABLE "calibration_rounds" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"conducted_at" date,
	"report_reference" text
);
--> statement-breakpoint
ALTER TABLE "calibration_rounds"
  ADD CONSTRAINT "calibration_rounds_key_is_a_slug"
  CHECK ("key" ~ '^[a-z0-9]+(_[a-z0-9]+)*$');
--> statement-breakpoint
ALTER TABLE "calibration_rounds"
  ADD CONSTRAINT "calibration_rounds_label_present"
  CHECK (length(btrim("label")) > 0);
--> statement-breakpoint

-- The two rounds that have actually been conducted. Registered here because the
-- data migration below needs them; later rounds arrive through the seed, which
-- is the point of making this a table.
INSERT INTO "calibration_rounds" ("key", "label", "conducted_at", "report_reference")
VALUES
  ('round_1', 'Calibration round 1', '2026-08-06',
   'docs/Game_Profile_Calibration_Round_1_Report_v0.1.md'),
  ('round_2', 'Calibration round 2', '2026-08-06',
   'docs/Game_Profile_Calibration_Round_2_Report_v0.1.md')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

ALTER TABLE "evaluations" ADD COLUMN "calibration_round" text;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_calibration_round_calibration_rounds_key_fk" FOREIGN KEY ("calibration_round") REFERENCES "public"."calibration_rounds"("key") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Re-express the existing values.
--
-- The column becomes text, the rows are rewritten, then it becomes the new
-- enum. Published rows are frozen by the 0002 immutability trigger, so the
-- rewrite runs with user triggers off: this restates existing provenance in a
-- vocabulary that can describe more than three profiles, and changes no score,
-- status or judgement. Every final snapshot is re-validated before commit.
-- ---------------------------------------------------------------------------
ALTER TABLE "evaluations" ALTER COLUMN "score_provenance" SET DATA TYPE text;
--> statement-breakpoint
ALTER TABLE "evaluations" DISABLE TRIGGER USER;
--> statement-breakpoint
UPDATE evaluations
SET calibration_round = CASE score_provenance
      WHEN 'calibration_round_1' THEN 'round_1'
      WHEN 'calibration_round_2' THEN 'round_2'
    END,
    -- A derived profile has to say so on the page. Existing rows carrying the
    -- reconciliation state may have no note; give them the one that state meant.
    provenance_note = CASE
      WHEN score_provenance NOT IN ('calibration_round_1', 'calibration_round_2')
       AND provenance_note IS NULL
      THEN 'Scored directly against the rubric rather than in a calibration round. Engineering-grade, not editorially signed off.'
      ELSE provenance_note
    END,
    score_provenance = CASE
      WHEN score_provenance IN ('calibration_round_1', 'calibration_round_2')
      THEN 'calibration'
      ELSE 'derived'
    END;
--> statement-breakpoint
ALTER TABLE "evaluations" ENABLE TRIGGER USER;
--> statement-breakpoint

DROP TYPE "public"."score_provenance";--> statement-breakpoint
CREATE TYPE "public"."score_provenance" AS ENUM('editorial', 'calibration', 'derived');--> statement-breakpoint
ALTER TABLE "evaluations" ALTER COLUMN "score_provenance" SET DATA TYPE "public"."score_provenance" USING "score_provenance"::"public"."score_provenance";--> statement-breakpoint

-- A calibration profile names its round; a non-calibration profile does not
-- have one. Both halves matter: the first stops "calibrated" being an
-- unfalsifiable claim, the second stops an editorial profile borrowing a
-- round's authority.
ALTER TABLE evaluations
  ADD CONSTRAINT calibration_provenance_names_its_round
  CHECK ((score_provenance = 'calibration') = (calibration_round IS NOT NULL));
--> statement-breakpoint
-- Derived numbers have not been through editorial review, and the page says so.
ALTER TABLE evaluations
  ADD CONSTRAINT derived_provenance_explains_itself
  CHECK (score_provenance <> 'derived' OR provenance_note IS NOT NULL);
--> statement-breakpoint

-- A round's label appears on every profile citing it, so it is part of those
-- profiles' published explanation of themselves — frozen on first final use,
-- exactly as evidence sources and tag definitions are (ADR 0009).
CREATE FUNCTION trg_calibration_round_final_immutable() RETURNS trigger AS $$
DECLARE
  citing_evaluation record;
BEGIN
  FOR citing_evaluation IN
    SELECT id, status
    FROM evaluations
    WHERE calibration_round = OLD.key
    ORDER BY id
    FOR SHARE
  LOOP
    IF citing_evaluation.status IN ('published', 'superseded') THEN
      RAISE EXCEPTION
        'calibration round % is cited by final evaluation % and is immutable',
        OLD.key, citing_evaluation.id
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER calibration_rounds_final_immutable
  BEFORE UPDATE OR DELETE ON calibration_rounds
  FOR EACH ROW EXECUTE FUNCTION trg_calibration_round_final_immutable();
--> statement-breakpoint

-- Re-validate every final snapshot and lineage neighbourhood after the rewrite.
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
