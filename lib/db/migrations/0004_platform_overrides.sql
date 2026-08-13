-- Real platform-specific subcriterion overrides.
--
-- Rubric §3 permits a materially platform-specific Technical Stability reading.
-- The schema could not hold one: `subcriterion_scores` carried a `platform_id`
-- under a primary key of (evaluation, subcriterion), so it could store at most
-- one platform per score — the one shape the feature cannot use. That column
-- was never functional and is dropped here rather than left looking usable.
--
-- The base score stays canonical. It is what the profile publishes and what
-- `dimension_scores` derives from; nothing below changes a dimension total.
-- Overrides are an exception layer, so a severe PC/console divergence is
-- recorded explicitly instead of being averaged into one unexplained number or
-- forcing a whole parallel evaluation per platform.

CREATE TABLE "subcriterion_platform_overrides" (
	"evaluation_id" uuid NOT NULL,
	"subcriterion_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"score" numeric(2, 1),
	"rationale" text NOT NULL,
	"evidence_confidence" "confidence",
	CONSTRAINT "subcriterion_platform_overrides_evaluation_id_subcriterion_id_platform_id_pk" PRIMARY KEY("evaluation_id","subcriterion_id","platform_id")
);
--> statement-breakpoint
ALTER TABLE "subcriterion_scores" DROP CONSTRAINT "subcriterion_scores_platform_id_platforms_id_fk";
--> statement-breakpoint
ALTER TABLE "subcriterion_platform_overrides" ADD CONSTRAINT "subcriterion_platform_overrides_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcriterion_platform_overrides" ADD CONSTRAINT "subcriterion_platform_overrides_base_fk" FOREIGN KEY ("evaluation_id","subcriterion_id") REFERENCES "public"."subcriterion_scores"("evaluation_id","subcriterion_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcriterion_scores" DROP COLUMN "platform_id";
--> statement-breakpoint

-- Same scalar rules as the base score. NULL is unknown on this platform, never
-- zero (Rubric §1, §22).
ALTER TABLE subcriterion_platform_overrides
  ADD CONSTRAINT subcriterion_override_score_range
  CHECK (score IS NULL OR (score >= 0 AND score <= 2));
--> statement-breakpoint
ALTER TABLE subcriterion_platform_overrides
  ADD CONSTRAINT subcriterion_override_half_steps
  CHECK (score IS NULL OR (score * 2) = floor(score * 2));
--> statement-breakpoint
-- An unexplained divergence is precisely what Rubric §3 forbids.
ALTER TABLE subcriterion_platform_overrides
  ADD CONSTRAINT subcriterion_override_rationale_present
  CHECK (length(btrim(rationale)) > 0);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- An override represents a MATERIAL deviation.
--
-- Two rules, both structural rather than editorial judgement:
--   1. it must actually differ from the base value — a row repeating the base
--      is not an override, and would make "this game diverges on PC" true of
--      every platform mentioned anywhere;
--   2. the platform must be one the game ships on, so an override cannot be
--      filed against a platform the evaluation could not have assessed.
-- ---------------------------------------------------------------------------
CREATE FUNCTION trg_platform_override_is_material() RETURNS trigger AS $$
DECLARE
  base_score      numeric(2,1);
  base_exists     boolean;
  override_game   uuid;
  platform_shipped boolean;
BEGIN
  SELECT score, true INTO base_score, base_exists
  FROM subcriterion_scores
  WHERE evaluation_id = NEW.evaluation_id
    AND subcriterion_id = NEW.subcriterion_id
  FOR SHARE;

  -- A missing base row is reported by the composite foreign key.
  IF base_exists IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.score IS NOT DISTINCT FROM base_score THEN
    RAISE EXCEPTION
      'platform override for evaluation % repeats the base score; an override records a material deviation, not agreement',
      NEW.evaluation_id
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT game_id INTO override_game FROM evaluations WHERE id = NEW.evaluation_id;

  SELECT EXISTS (
    SELECT 1 FROM game_platforms
    WHERE game_id = override_game AND platform_id = NEW.platform_id
  ) INTO platform_shipped;

  IF NOT platform_shipped THEN
    RAISE EXCEPTION
      'platform override names a platform this game does not ship on'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER subcriterion_platform_overrides_material
  BEFORE INSERT OR UPDATE ON subcriterion_platform_overrides
  FOR EACH ROW EXECUTE FUNCTION trg_platform_override_is_material();
--> statement-breakpoint

-- Overrides are evaluation-owned children and are frozen with the rest of a
-- final snapshot. A correction is a new evaluation version, exactly as it is
-- for a score, a block or an evidence link (ADR 0009).
CREATE TRIGGER subcriterion_platform_overrides_snapshot_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON subcriterion_platform_overrides
  FOR EACH ROW EXECUTE FUNCTION trg_evaluation_child_immutable();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- How a consumer asks for a platform-specific reading.
--
-- One row per (evaluation, subcriterion, platform the game ships on). Where no
-- override exists the base value is returned, so a caller never has to
-- implement the fallback itself and cannot implement it differently from
-- anyone else.
--
-- `is_override` is a separate column rather than something to infer: COALESCE
-- cannot distinguish "no override" from "an override recording unknown", and
-- those are opposite claims.
--
-- Deliberately NOT joined into `dimension_scores`. There is one published
-- profile per evaluation and its numbers are the base ones; a platform-
-- parameterised dimension total would be a second, competing profile with no
-- page to live on. See ADR 0015.
-- ---------------------------------------------------------------------------
CREATE VIEW subcriterion_platform_readings AS
SELECT
  ss.evaluation_id,
  ss.subcriterion_id,
  p.id                                   AS platform_id,
  p.slug                                 AS platform_slug,
  ss.score                               AS base_score,
  CASE WHEN o.platform_id IS NULL THEN ss.score ELSE o.score END AS score,
  (o.platform_id IS NOT NULL)            AS is_override,
  o.rationale                            AS override_rationale,
  o.evidence_confidence                  AS override_confidence
FROM subcriterion_scores ss
JOIN evaluations e   ON e.id = ss.evaluation_id
JOIN game_platforms gp ON gp.game_id = e.game_id
JOIN platforms p     ON p.id = gp.platform_id
LEFT JOIN subcriterion_platform_overrides o
  ON  o.evaluation_id   = ss.evaluation_id
  AND o.subcriterion_id = ss.subcriterion_id
  AND o.platform_id     = p.id;
