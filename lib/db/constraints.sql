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

-- A pre-release profile may not claim High confidence (Rubric §14, SOP §10.1).
-- Individual dimensions still may — see dimension_assessments.
ALTER TABLE evaluations
  ADD CONSTRAINT pre_release_confidence_ceiling
  CHECK (NOT (evidence_status = 'pre_release' AND confidence = 'high'));

-- Evidence maturity is required for a pre-release profile and meaningless
-- otherwise (SOP §10.1). "Pre-release" alone does not say whether anyone has
-- actually played the thing.
ALTER TABLE evaluations
  ADD CONSTRAINT pre_release_declares_maturity
  CHECK (
    (evidence_status = 'pre_release' AND evidence_maturity IS NOT NULL)
    OR (evidence_status <> 'pre_release' AND evidence_maturity IS NULL)
  );

-- ---------------------------------------------------------------------------
-- One evidence link per (evaluation, source, dimension, subcriterion). A source
-- may legitimately appear many times against different dimensions, but not
-- twice against the same one. NULLS NOT DISTINCT so that two profile-level
-- links for the same source also collide.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX evaluation_evidence_links_unique
  ON evaluation_evidence_links (
    evaluation_id, evidence_source_id, dimension_id, subcriterion_id
  )
  NULLS NOT DISTINCT;

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
-- `confidence` is joined from dimension_assessments rather than computed:
-- it is an editorial input. `linked_evidence_count` is derived, and is a count
-- of supporting sources — never a divisor, never a weight (SOP §6).
CREATE VIEW dimension_scores AS
WITH totals AS (
  SELECT
    ss.evaluation_id,
    s.dimension_id,
    COUNT(*) FILTER (WHERE ss.score IS NULL) AS unknown_count,
    COALESCE(SUM(ss.score), 0)               AS known_sum
  FROM subcriterion_scores ss
  JOIN subcriteria s ON s.id = ss.subcriterion_id
  GROUP BY ss.evaluation_id, s.dimension_id
)
SELECT
  t.evaluation_id,
  t.dimension_id,
  t.unknown_count,
  t.known_sum,
  CASE WHEN t.unknown_count = 0 THEN t.known_sum END     AS score,
  CASE WHEN t.unknown_count = 1 THEN t.known_sum END     AS low_estimate,
  CASE WHEN t.unknown_count = 1 THEN t.known_sum + 2 END AS high_estimate,
  da.confidence                                          AS confidence,
  (
    SELECT COUNT(*)
    FROM evaluation_evidence_links l
    WHERE l.evaluation_id = t.evaluation_id
      AND l.dimension_id = t.dimension_id
  )                                                      AS linked_evidence_count
FROM totals t
LEFT JOIN dimension_assessments da
  ON da.evaluation_id = t.evaluation_id
 AND da.dimension_id = t.dimension_id;
