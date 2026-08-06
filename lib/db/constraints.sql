-- Constraints and derived views that the Drizzle schema cannot express.
-- Apply after the generated migration.
--
-- These encode Master Plan §13.2 "Important constraints" and §22.3 "Data QA"
-- as database invariants rather than application-layer hopes.

-- ---------------------------------------------------------------------------
-- Scores are 0-2 in 0.5 increments, or NULL for an explicit editorial unknown.
-- NULL is never zero (Rubric §1, §22).
-- ---------------------------------------------------------------------------
ALTER TABLE subcriterion_scores
  ADD CONSTRAINT subcriterion_score_range
  CHECK (score IS NULL OR (score >= 0 AND score <= 2));

ALTER TABLE subcriterion_scores
  ADD CONSTRAINT subcriterion_score_half_steps
  CHECK (score IS NULL OR (score * 2) = floor(score * 2));

-- ---------------------------------------------------------------------------
-- Exactly one published evaluation per game per rubric version (Plan §13.2).
-- Superseded and draft rows are retained; only the live one is unique.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX evaluations_one_published_per_game
  ON evaluations (game_id, rubric_version)
  WHERE status = 'published';

-- ---------------------------------------------------------------------------
-- A published evaluation must carry its purchase-decision fields (Plan §13.2).
-- ---------------------------------------------------------------------------
ALTER TABLE evaluations
  ADD CONSTRAINT published_evaluation_is_complete
  CHECK (
    status <> 'published'
    OR (
      primary_pull IS NOT NULL
      AND primary_risk IS NOT NULL
      AND one_line_experience IS NOT NULL
      AND published_at IS NOT NULL
    )
  );

-- A pre-release profile may not claim High confidence (Rubric §14).
ALTER TABLE evaluations
  ADD CONSTRAINT pre_release_confidence_ceiling
  CHECK (NOT (evidence_status = 'pre_release' AND confidence = 'high'));

-- ---------------------------------------------------------------------------
-- Dimension totals are DERIVED, never stored (Plan §13.1).
--
-- unknown_count drives public presentation:
--   0  -> exact score
--   1  -> published as a range [low, low + 2]
--   >1 -> not scored; the radar breaks at this axis
-- See lib/scoring/derive.ts, which must stay in step with this view.
--
-- Note the deliberate absence of any cross-dimension aggregate. There is no
-- overall score in this product (Plan §9.1) and none may be added here.
-- ---------------------------------------------------------------------------
CREATE VIEW dimension_scores AS
SELECT
  ss.evaluation_id,
  s.dimension_id,
  COUNT(*) FILTER (WHERE ss.score IS NULL)               AS unknown_count,
  COALESCE(SUM(ss.score), 0)                             AS known_sum,
  CASE WHEN COUNT(*) FILTER (WHERE ss.score IS NULL) = 0
       THEN SUM(ss.score) END                            AS score,
  CASE WHEN COUNT(*) FILTER (WHERE ss.score IS NULL) = 1
       THEN COALESCE(SUM(ss.score), 0) END               AS low_estimate,
  CASE WHEN COUNT(*) FILTER (WHERE ss.score IS NULL) = 1
       THEN COALESCE(SUM(ss.score), 0) + 2 END           AS high_estimate
FROM subcriterion_scores ss
JOIN subcriteria s ON s.id = ss.subcriterion_id
GROUP BY ss.evaluation_id, s.dimension_id;
