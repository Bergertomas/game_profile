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
--
-- CRITICAL: the totals are computed against the COMPLETE expected subcriterion
-- set for the evaluation's rubric version, not against whatever score rows
-- happen to exist. Aggregating only existing rows would let a dimension missing
-- two of its five rows report a confident, precise total from the other three —
-- exactly the false precision the product forbids (Plan §25.18).
--
-- A missing row is therefore indistinguishable from an explicit unknown here,
-- which is the honest reading: we have no value for it either way. The
-- application layer (lib/scoring/derive.ts) is stricter and throws on a missing
-- key, because there it means an authoring bug rather than absent evidence.
CREATE VIEW dimension_scores AS
WITH expected AS (
  SELECT
    e.id AS evaluation_id,
    d.id AS dimension_id,
    s.id AS subcriterion_id
  FROM evaluations e
  JOIN dimensions d  ON d.rubric_version = e.rubric_version
  JOIN subcriteria s ON s.dimension_id = d.id
),
totals AS (
  SELECT
    x.evaluation_id,
    x.dimension_id,
    COUNT(*)                                          AS expected_count,
    COUNT(ss.subcriterion_id)                         AS present_count,
    COUNT(*) FILTER (WHERE ss.score IS NULL)          AS unknown_count,
    COALESCE(SUM(ss.score), 0)                        AS known_sum
  FROM expected x
  LEFT JOIN subcriterion_scores ss
    ON  ss.evaluation_id  = x.evaluation_id
    AND ss.subcriterion_id = x.subcriterion_id
  GROUP BY x.evaluation_id, x.dimension_id
)
SELECT
  t.evaluation_id,
  t.dimension_id,
  t.expected_count,
  t.present_count,
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

-- ---------------------------------------------------------------------------
-- Publish-time completeness.
--
-- The view above guarantees a missing row can never become a precise score.
-- These triggers go further and stop a published evaluation from having gaps at
-- all: every expected subcriterion needs a row (explicitly `unknown` if that is
-- the truth), and every dimension needs an explicit confidence record.
--
-- DEFERRABLE INITIALLY DEFERRED so a seed or an editor can insert the
-- evaluation, then its scores, then commit. The check runs once at COMMIT.
-- ---------------------------------------------------------------------------
CREATE FUNCTION assert_published_evaluation_complete(target uuid)
RETURNS void AS $$
DECLARE
  published    boolean;
  missing_rows bigint;
  missing_conf bigint;
BEGIN
  SELECT status = 'published' INTO published FROM evaluations WHERE id = target;
  -- Row gone (cascade delete) or not published yet: nothing to enforce.
  IF published IS NOT TRUE THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO missing_rows
  FROM evaluations e
  JOIN dimensions d  ON d.rubric_version = e.rubric_version
  JOIN subcriteria s ON s.dimension_id = d.id
  LEFT JOIN subcriterion_scores ss
    ON ss.evaluation_id = e.id AND ss.subcriterion_id = s.id
  WHERE e.id = target AND ss.evaluation_id IS NULL;

  IF missing_rows > 0 THEN
    RAISE EXCEPTION
      'published evaluation % is missing % subcriterion score row(s); record an explicit unknown instead of omitting the row',
      target, missing_rows
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COUNT(*) INTO missing_conf
  FROM evaluations e
  JOIN dimensions d ON d.rubric_version = e.rubric_version
  LEFT JOIN dimension_assessments da
    ON da.evaluation_id = e.id AND da.dimension_id = d.id
  WHERE e.id = target AND da.evaluation_id IS NULL;

  IF missing_conf > 0 THEN
    RAISE EXCEPTION
      'published evaluation % is missing % per-dimension confidence record(s)',
      target, missing_conf
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION trg_evaluation_publish_complete() RETURNS trigger AS $$
BEGIN
  PERFORM assert_published_evaluation_complete(NEW.id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION trg_child_publish_complete() RETURNS trigger AS $$
BEGIN
  PERFORM assert_published_evaluation_complete(OLD.evaluation_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER evaluations_publish_complete
  AFTER INSERT OR UPDATE ON evaluations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_evaluation_publish_complete();

-- Rows may not be stripped out from under an already-published evaluation.
CREATE CONSTRAINT TRIGGER subcriterion_scores_publish_complete
  AFTER DELETE ON subcriterion_scores
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_child_publish_complete();

CREATE CONSTRAINT TRIGGER dimension_assessments_publish_complete
  AFTER DELETE ON dimension_assessments
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_child_publish_complete();

-- ---------------------------------------------------------------------------
-- Supersession lineage (SOP §10.9). The FK itself is in the Drizzle schema;
-- these are the rules it cannot express.
-- ---------------------------------------------------------------------------
ALTER TABLE evaluations
  ADD CONSTRAINT evaluation_does_not_supersede_itself
  CHECK (supersedes_evaluation_id IS NULL OR supersedes_evaluation_id <> id);

CREATE FUNCTION trg_supersession_is_coherent() RETURNS trigger AS $$
DECLARE
  prev_game    uuid;
  prev_version integer;
BEGIN
  IF NEW.supersedes_evaluation_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT game_id, version_number INTO prev_game, prev_version
  FROM evaluations WHERE id = NEW.supersedes_evaluation_id;

  IF prev_game <> NEW.game_id THEN
    RAISE EXCEPTION
      'evaluation % supersedes an evaluation of a different game', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF prev_version >= NEW.version_number THEN
    RAISE EXCEPTION
      'evaluation % (version %) supersedes version %, which is not earlier',
      NEW.id, NEW.version_number, prev_version
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER evaluations_supersession_coherent
  AFTER INSERT OR UPDATE ON evaluations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_supersession_is_coherent();
