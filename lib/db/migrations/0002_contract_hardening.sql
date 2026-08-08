CREATE TABLE "rubric_versions" (
	"version" text PRIMARY KEY NOT NULL,
	"expected_dimension_count" integer NOT NULL,
	"expected_subcriteria_per_dimension" integer NOT NULL,
	"locked_at" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rubric_versions"
  ADD CONSTRAINT "rubric_versions_expected_dimension_count_positive"
  CHECK (expected_dimension_count > 0);
--> statement-breakpoint
ALTER TABLE "rubric_versions"
  ADD CONSTRAINT "rubric_versions_expected_subcriteria_count_positive"
  CHECK (expected_subcriteria_per_dimension > 0);
--> statement-breakpoint
-- Rubric identity is migration-owned. A fixture may populate the registered
-- shape, but it may not invent a version merely by spelling one on an
-- evaluation. This row must therefore exist before either foreign key below is
-- installed, including on an already-seeded database.
INSERT INTO "rubric_versions" (
  "version",
  "expected_dimension_count",
  "expected_subcriteria_per_dimension",
  "locked_at"
) VALUES ('1.0', 8, 5, '2026-08-06');
--> statement-breakpoint
-- Refuse to bless unexpected legacy values. The migration deliberately knows
-- only the canonical rubric registered above; a future rubric gets its own
-- explicit migration and registry row.
DO $$
DECLARE
  unexpected_versions text;
BEGIN
  SELECT string_agg(rubric_version, ', ' ORDER BY rubric_version)
  INTO unexpected_versions
  FROM (
    SELECT rubric_version FROM dimensions
    UNION
    SELECT rubric_version FROM evaluations
  ) versions
  WHERE rubric_version <> '1.0';

  IF unexpected_versions IS NOT NULL THEN
    RAISE EXCEPTION
      'cannot register rubric identities: unregistered version(s): %',
      unexpected_versions
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
ALTER TABLE "dimensions" ADD CONSTRAINT "dimensions_rubric_version_rubric_versions_version_fk" FOREIGN KEY ("rubric_version") REFERENCES "public"."rubric_versions"("version") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_rubric_version_rubric_versions_version_fk" FOREIGN KEY ("rubric_version") REFERENCES "public"."rubric_versions"("version") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "evaluations_supersedes_idx" ON "evaluations" USING btree ("supersedes_evaluation_id");
--> statement-breakpoint
ALTER INDEX "evaluations_one_published_per_game"
  RENAME TO "evaluations_one_published_per_game_rubric";
--> statement-breakpoint
-- A finalized lineage is a chain, not a tree. Multiple in-progress drafts may
-- start from the same predecessor, but only one may become published history.
CREATE UNIQUE INDEX "evaluations_one_final_successor"
  ON evaluations (supersedes_evaluation_id)
  WHERE supersedes_evaluation_id IS NOT NULL
    AND status IN ('published', 'superseded');
--> statement-breakpoint

-- Superseded rows are published history, not a looser archival state. Keeping
-- the old published-only check would allow an incomplete draft to pass through
-- `published` and end the transaction as `superseded`, after the deferred
-- publish trigger had stopped considering it.
ALTER TABLE evaluations
  DROP CONSTRAINT published_evaluation_is_complete;
--> statement-breakpoint
ALTER TABLE evaluations
  ADD CONSTRAINT final_evaluation_is_complete
  CHECK (
    status NOT IN ('published', 'superseded')
    OR (
      primary_pull IS NOT NULL
      AND primary_risk IS NOT NULL
      AND one_line_experience IS NOT NULL
      AND published_at IS NOT NULL
    )
  );
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Legacy-data audit. Do not silently repair an evaluation by dropping or
-- retargeting a child: abort with the offending identity so an editor can make
-- an explicit versioned correction.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  offender uuid;
BEGIN
  SELECT ss.evaluation_id INTO offender
  FROM subcriterion_scores ss
  JOIN evaluations e ON e.id = ss.evaluation_id
  JOIN subcriteria s ON s.id = ss.subcriterion_id
  JOIN dimensions d ON d.id = s.dimension_id
  WHERE e.rubric_version <> d.rubric_version
  LIMIT 1;
  IF offender IS NOT NULL THEN
    RAISE EXCEPTION
      'cross-rubric subcriterion score exists for evaluation %', offender
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT da.evaluation_id INTO offender
  FROM dimension_assessments da
  JOIN evaluations e ON e.id = da.evaluation_id
  JOIN dimensions d ON d.id = da.dimension_id
  WHERE e.rubric_version <> d.rubric_version
  LIMIT 1;
  IF offender IS NOT NULL THEN
    RAISE EXCEPTION
      'cross-rubric dimension assessment exists for evaluation %', offender
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT l.evaluation_id INTO offender
  FROM evaluation_evidence_links l
  JOIN evaluations e ON e.id = l.evaluation_id
  LEFT JOIN dimensions d ON d.id = l.dimension_id
  LEFT JOIN subcriteria s ON s.id = l.subcriterion_id
  LEFT JOIN dimensions sd ON sd.id = s.dimension_id
   WHERE (l.subcriterion_id IS NOT NULL AND l.dimension_id IS NULL)
      OR (d.id IS NOT NULL AND d.rubric_version <> e.rubric_version)
      OR (sd.id IS NOT NULL AND sd.rubric_version <> e.rubric_version)
      OR (d.id IS NOT NULL AND sd.id IS NOT NULL AND d.id <> sd.id)
  LIMIT 1;
  IF offender IS NOT NULL THEN
    RAISE EXCEPTION
      'incoherent evidence target exists for evaluation %', offender
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- A subcriterion target always carries its parent dimension. The public
-- dimension evidence count joins by dimension_id; accepting a NULL parent here
-- would make otherwise-valid evidence disappear from that count and would let
-- the same semantic link be stored twice.
ALTER TABLE evaluation_evidence_links
  ADD CONSTRAINT evidence_subcriterion_requires_dimension
  CHECK (subcriterion_id IS NULL OR dimension_id IS NOT NULL);
--> statement-breakpoint

-- Correct the two known pre-hardening fixture errors before final snapshots are
-- frozen. Fresh databases receive these values from seed.sql; this data patch
-- keeps an already-seeded 0001 database on the same canonical content.
UPDATE evaluations AS e
SET mode_scope = 'Single-player main-game campaign, excluding co-op and the Tower of Sisyphus'
FROM games AS g
WHERE e.game_id = g.id
  AND g.slug = 'returnal'
  AND e.rubric_version = '1.0'
  AND e.version_number = 1
  AND e.mode_scope = 'Single-player campaign, excluding the co-op Tower of Sisyphus';
--> statement-breakpoint
UPDATE evidence_sources
SET url = 'https://housemarque.com/news/2022/3/21/returnal-ascension-update',
    publisher = 'Housemarque',
    published_at = '2022-03-21'
WHERE source_key = 'src_returnal_update_history';
--> statement-breakpoint
UPDATE evaluation_evidence_links AS link
SET note = 'Establishes the current-state build scope: co-op applies to the main game, while the Tower of Sisyphus is a separate single-player endless mode. Not used to judge quality.'
FROM evidence_sources AS source
WHERE link.evidence_source_id = source.id
  AND source.source_key = 'src_returnal_update_history';
--> statement-breakpoint
UPDATE subcriterion_scores AS score
SET rationale = 'The final build includes the 60fps Performance Mode introduced in Update 2; Update 4 added offline play and pausing, but pop-in, traversal hitching and animation faults remain routine.'
FROM evaluations AS evaluation
JOIN games AS game ON game.id = evaluation.game_id
JOIN subcriteria AS subcriterion ON subcriterion.key = 'technical_stability'
JOIN dimensions AS dimension
  ON dimension.id = subcriterion.dimension_id
 AND dimension.rubric_version = evaluation.rubric_version
WHERE score.evaluation_id = evaluation.id
  AND score.subcriterion_id = subcriterion.id
  AND game.slug = 'redfall'
  AND evaluation.rubric_version = '1.0'
  AND evaluation.version_number = 1
  AND dimension.key = 'execution';
--> statement-breakpoint
INSERT INTO evidence_sources (
  source_key,
  title,
  url,
  publisher,
  published_at,
  evidence_tier,
  source_category
)
SELECT
  'src_redfall_update_2',
  'Game Update 2 release notes introducing Xbox Performance Mode',
  'https://bethesda.net/en-US/news/redfall-game-update-2-release-notes',
  'Bethesda Softworks',
  '2023-10-06',
  'C',
  'first_party'
WHERE EXISTS (
  SELECT 1
  FROM evaluations AS evaluation
  JOIN games AS game ON game.id = evaluation.game_id
  WHERE game.slug = 'redfall'
    AND evaluation.rubric_version = '1.0'
    AND evaluation.version_number = 1
)
ON CONFLICT (source_key) DO UPDATE
SET title = EXCLUDED.title,
    url = EXCLUDED.url,
    publisher = EXCLUDED.publisher,
    published_at = EXCLUDED.published_at,
    evidence_tier = EXCLUDED.evidence_tier,
    source_category = EXCLUDED.source_category;
--> statement-breakpoint
INSERT INTO evaluation_evidence_links (
  evaluation_id,
  evidence_source_id,
  note
)
SELECT
  evaluation.id,
  source.id,
  'Establishes that the Xbox Series X|S 60fps Performance Mode arrived in Update 2, not Update 4. Used for factual update attribution, not for judging technical quality.'
FROM evaluations AS evaluation
JOIN games AS game ON game.id = evaluation.game_id
JOIN evidence_sources AS source ON source.source_key = 'src_redfall_update_2'
WHERE game.slug = 'redfall'
  AND evaluation.rubric_version = '1.0'
  AND evaluation.version_number = 1
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Rubric-local children. Foreign keys prove that every referenced row exists;
-- these triggers prove that it belongs to the evaluation's rubric. They run on
-- drafts too so an editor cannot carry poisoned data up to the publish gate.
-- ---------------------------------------------------------------------------
CREATE FUNCTION trg_subcriterion_score_rubric_coherent() RETURNS trigger AS $$
DECLARE
  evaluation_rubric text;
  child_rubric      text;
BEGIN
  SELECT rubric_version INTO evaluation_rubric
  FROM evaluations WHERE id = NEW.evaluation_id
  FOR SHARE;

  SELECT d.rubric_version INTO child_rubric
  FROM subcriteria s
  JOIN dimensions d ON d.id = s.dimension_id
  WHERE s.id = NEW.subcriterion_id
  FOR SHARE OF s, d;

  -- Missing parents are reported by their ordinary foreign keys.
  IF evaluation_rubric IS NOT NULL
     AND child_rubric IS NOT NULL
     AND evaluation_rubric <> child_rubric THEN
    RAISE EXCEPTION
      'subcriterion belongs to rubric %, evaluation belongs to rubric %',
      child_rubric, evaluation_rubric
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER subcriterion_scores_rubric_coherent
  BEFORE INSERT OR UPDATE OF evaluation_id, subcriterion_id
  ON subcriterion_scores
  FOR EACH ROW EXECUTE FUNCTION trg_subcriterion_score_rubric_coherent();
--> statement-breakpoint

CREATE FUNCTION trg_dimension_assessment_rubric_coherent() RETURNS trigger AS $$
DECLARE
  evaluation_rubric text;
  child_rubric      text;
BEGIN
  SELECT rubric_version INTO evaluation_rubric
  FROM evaluations WHERE id = NEW.evaluation_id
  FOR SHARE;
  SELECT rubric_version INTO child_rubric
  FROM dimensions WHERE id = NEW.dimension_id
  FOR SHARE;

  IF evaluation_rubric IS NOT NULL
     AND child_rubric IS NOT NULL
     AND evaluation_rubric <> child_rubric THEN
    RAISE EXCEPTION
      'dimension belongs to rubric %, evaluation belongs to rubric %',
      child_rubric, evaluation_rubric
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER dimension_assessments_rubric_coherent
  BEFORE INSERT OR UPDATE OF evaluation_id, dimension_id
  ON dimension_assessments
  FOR EACH ROW EXECUTE FUNCTION trg_dimension_assessment_rubric_coherent();
--> statement-breakpoint

CREATE FUNCTION trg_evidence_link_rubric_coherent() RETURNS trigger AS $$
DECLARE
  evaluation_rubric      text;
  dimension_rubric       text;
  subcriterion_rubric    text;
  subcriterion_dimension uuid;
BEGIN
  -- Serialize source edits with link creation. The source's own immutability
  -- trigger takes the inverse lock and checks every linked evaluation.
  PERFORM 1 FROM evidence_sources
  WHERE id = NEW.evidence_source_id
  FOR SHARE;

  SELECT rubric_version INTO evaluation_rubric
  FROM evaluations WHERE id = NEW.evaluation_id
  FOR SHARE;

  IF NEW.dimension_id IS NOT NULL THEN
    SELECT rubric_version INTO dimension_rubric
    FROM dimensions WHERE id = NEW.dimension_id
    FOR SHARE;
    IF evaluation_rubric IS NOT NULL
       AND dimension_rubric IS NOT NULL
       AND evaluation_rubric <> dimension_rubric THEN
      RAISE EXCEPTION
        'evidence dimension belongs to rubric %, evaluation belongs to rubric %',
        dimension_rubric, evaluation_rubric
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.subcriterion_id IS NOT NULL THEN
    IF NEW.dimension_id IS NULL THEN
      RAISE EXCEPTION
        'subcriterion evidence must declare its parent dimension'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT d.rubric_version, s.dimension_id
    INTO subcriterion_rubric, subcriterion_dimension
    FROM subcriteria s
    JOIN dimensions d ON d.id = s.dimension_id
    WHERE s.id = NEW.subcriterion_id
    FOR SHARE OF s, d;

    IF evaluation_rubric IS NOT NULL
       AND subcriterion_rubric IS NOT NULL
       AND evaluation_rubric <> subcriterion_rubric THEN
      RAISE EXCEPTION
        'evidence subcriterion belongs to rubric %, evaluation belongs to rubric %',
        subcriterion_rubric, evaluation_rubric
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.dimension_id IS NOT NULL
       AND subcriterion_dimension IS NOT NULL
       AND NEW.dimension_id <> subcriterion_dimension THEN
      RAISE EXCEPTION
        'evidence subcriterion does not belong to its declared dimension'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER evaluation_evidence_links_rubric_coherent
  BEFORE INSERT OR UPDATE OF evaluation_id, dimension_id, subcriterion_id
  ON evaluation_evidence_links
  FOR EACH ROW EXECUTE FUNCTION trg_evidence_link_rubric_coherent();
--> statement-breakpoint

-- Changing a draft's rubric after children have been attached would invalidate
-- them without firing any child trigger. Require the editor to clear/rebuild the
-- draft explicitly instead of carrying scores across methodologies.
CREATE FUNCTION trg_evaluation_rubric_change_coherent() RETURNS trigger AS $$
DECLARE
  locked_version text;
BEGIN
  IF NEW.rubric_version IS DISTINCT FROM OLD.rubric_version THEN
    FOR locked_version IN
      SELECT version
      FROM rubric_versions
      WHERE version = OLD.rubric_version OR version = NEW.rubric_version
      ORDER BY version
    LOOP
      -- Shared: this must exclude definition edits, not other evaluations.
      PERFORM lock_rubric_contract(locked_version, false);
    END LOOP;

    IF (
       EXISTS (SELECT 1 FROM subcriterion_scores WHERE evaluation_id = OLD.id)
       OR EXISTS (SELECT 1 FROM dimension_assessments WHERE evaluation_id = OLD.id)
       OR EXISTS (SELECT 1 FROM evaluation_evidence_links WHERE evaluation_id = OLD.id)
    ) THEN
      RAISE EXCEPTION
        'evaluation % has rubric-bound children; clear them before changing rubric',
        OLD.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER evaluations_rubric_change_coherent
  BEFORE UPDATE OF rubric_version ON evaluations
  FOR EACH ROW EXECUTE FUNCTION trg_evaluation_rubric_change_coherent();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Final snapshots are immutable. A correction is a new evaluation version.
-- The only permitted change to a published row is the exact status transition
-- `published -> superseded`; all content and provenance must remain byte-for-
-- byte the same. Evaluation-owned children are frozen for both final states.
-- ---------------------------------------------------------------------------
CREATE FUNCTION lock_rubric_contract(target_version text, exclusive boolean)
RETURNS void AS $$
DECLARE
  contract_key bigint;
  acquired     boolean;
BEGIN
  IF target_version IS NULL THEN
    RETURN;
  END IF;

  contract_key := hashtextextended('game-profile:rubric:' || target_version, 0);

  -- Fail fast instead of waiting: definition DML has already locked its target
  -- row before a BEFORE trigger runs, while publication has already locked its
  -- evaluation row. Waiting in both directions can deadlock. A transaction-
  -- scoped advisory identity makes exactly one side proceed and tells the
  -- editor to retry the other operation.
  --
  -- The two modes matter. What must not interleave is a rubric *definition*
  -- edit against a *finalization* that is validating the shape it produces.
  -- Two finalizations do not conflict with each other at all, so publication
  -- takes the lock in shared mode: an exclusive lock here would make
  -- publishing two unrelated games under the same rubric fail as a spurious
  -- serialization error, which is contention the contract never needed.
  IF exclusive THEN
    acquired := pg_try_advisory_xact_lock(contract_key);
  ELSE
    acquired := pg_try_advisory_xact_lock_shared(contract_key);
  END IF;

  IF NOT acquired THEN
    RAISE EXCEPTION
      'rubric % is being edited or finalized concurrently; retry the transaction',
      target_version
      USING ERRCODE = 'serialization_failure';
  END IF;
END;
$$ LANGUAGE plpgsql VOLATILE;
--> statement-breakpoint

CREATE FUNCTION trg_evaluation_snapshot_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP <> 'DELETE' AND NEW.status IN ('published', 'superseded') THEN
    -- Shared: two games finalizing under one rubric are independent.
    PERFORM lock_rubric_contract(NEW.rubric_version, false);
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('published', 'superseded') THEN
      RAISE EXCEPTION
        'evaluation % must be created as draft/review and finalized only after its children exist',
        NEW.id
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('published', 'superseded') THEN
      RAISE EXCEPTION
        'final evaluation % is immutable; preserve it and create a new version',
        OLD.id
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status = 'published' THEN
    IF NEW.status = 'superseded'
       AND (to_jsonb(NEW) - 'status') = (to_jsonb(OLD) - 'status') THEN
      RETURN NEW;
    END IF;
    IF to_jsonb(NEW) = to_jsonb(OLD) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION
      'published evaluation % is immutable; create a new version', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.status = 'superseded' THEN
    IF to_jsonb(NEW) = to_jsonb(OLD) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION
      'superseded evaluation % is immutable history', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status = 'superseded' THEN
    RAISE EXCEPTION
      'evaluation % cannot skip the published state on its way to superseded',
      NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER evaluations_snapshot_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION trg_evaluation_snapshot_immutable();
--> statement-breakpoint

CREATE FUNCTION trg_evaluation_child_immutable() RETURNS trigger AS $$
DECLARE
  old_owner_id uuid;
  new_owner_id uuid;
  owner        record;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    old_owner_id := OLD.evaluation_id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    new_owner_id := NEW.evaluation_id;
  END IF;

  -- Lock both possible owners in a stable order. A status or rubric UPDATE
  -- takes a conflicting row lock, so a concurrent child mutation either
  -- finishes before publication or waits, observes the final state, and fails.
  FOR owner IN
    SELECT id, status
    FROM evaluations
    WHERE id = old_owner_id OR id = new_owner_id
    ORDER BY id
    FOR SHARE
  LOOP
    IF owner.status IN ('published', 'superseded') THEN
      RAISE EXCEPTION
        'children of final evaluation % are immutable; create a new version',
        owner.id
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
CREATE TRIGGER subcriterion_scores_snapshot_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON subcriterion_scores
  FOR EACH ROW EXECUTE FUNCTION trg_evaluation_child_immutable();
--> statement-breakpoint
CREATE TRIGGER dimension_assessments_snapshot_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON dimension_assessments
  FOR EACH ROW EXECUTE FUNCTION trg_evaluation_child_immutable();
--> statement-breakpoint
CREATE TRIGGER profile_blocks_snapshot_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON profile_blocks
  FOR EACH ROW EXECUTE FUNCTION trg_evaluation_child_immutable();
--> statement-breakpoint
CREATE TRIGGER evaluation_tags_snapshot_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON evaluation_tags
  FOR EACH ROW EXECUTE FUNCTION trg_evaluation_child_immutable();
--> statement-breakpoint
CREATE TRIGGER evaluation_evidence_links_snapshot_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON evaluation_evidence_links
  FOR EACH ROW EXECUTE FUNCTION trg_evaluation_child_immutable();
--> statement-breakpoint

-- Evidence metadata and tag definitions are part of the public explanation.
-- Freezing only the join rows would still let a shared parent rewrite every
-- historical profile at once. Definitions remain editable until their first
-- final use; a correction after that receives a new source/tag identity.
CREATE FUNCTION trg_evidence_source_final_immutable() RETURNS trigger AS $$
DECLARE
  linked_evaluation record;
BEGIN
  FOR linked_evaluation IN
    SELECT evaluation.id, evaluation.status
    FROM evaluation_evidence_links AS link
    JOIN evaluations AS evaluation ON evaluation.id = link.evaluation_id
    WHERE link.evidence_source_id = OLD.id
    ORDER BY evaluation.id
    FOR SHARE OF evaluation
  LOOP
    IF linked_evaluation.status IN ('published', 'superseded') THEN
      RAISE EXCEPTION
        'evidence source % is linked to final evaluation % and is immutable',
        OLD.source_key,
        linked_evaluation.id
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
CREATE TRIGGER evidence_sources_final_immutable
  BEFORE UPDATE OR DELETE ON evidence_sources
  FOR EACH ROW EXECUTE FUNCTION trg_evidence_source_final_immutable();
--> statement-breakpoint

CREATE FUNCTION trg_evaluation_tag_definition_locked() RETURNS trigger AS $$
BEGIN
  PERFORM 1 FROM tags WHERE id = NEW.tag_id FOR SHARE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER evaluation_tags_definition_locked
  BEFORE INSERT OR UPDATE OF tag_id ON evaluation_tags
  FOR EACH ROW EXECUTE FUNCTION trg_evaluation_tag_definition_locked();
--> statement-breakpoint

CREATE FUNCTION trg_tag_definition_final_immutable() RETURNS trigger AS $$
DECLARE
  linked_evaluation record;
BEGIN
  FOR linked_evaluation IN
    SELECT evaluation.id, evaluation.status
    FROM evaluation_tags AS link
    JOIN evaluations AS evaluation ON evaluation.id = link.evaluation_id
    WHERE link.tag_id = OLD.id
    ORDER BY evaluation.id
    FOR SHARE OF evaluation
  LOOP
    IF linked_evaluation.status IN ('published', 'superseded') THEN
      RAISE EXCEPTION
        'tag definition % is linked to final evaluation % and is immutable',
        OLD.key,
        linked_evaluation.id
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
CREATE TRIGGER tags_final_immutable
  BEFORE UPDATE OR DELETE ON tags
  FOR EACH ROW EXECUTE FUNCTION trg_tag_definition_final_immutable();
--> statement-breakpoint

-- Revision rows are an audit log. They may be appended after publication, but
-- an existing audit event is never rewritten or removed.
CREATE FUNCTION trg_evaluation_revision_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'evaluation revisions are append-only'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER evaluation_revisions_append_only
  BEFORE UPDATE OR DELETE ON evaluation_revisions
  FOR EACH ROW EXECUTE FUNCTION trg_evaluation_revision_append_only();
--> statement-breakpoint

-- Once final evaluations use a rubric, its registered identity and canonical
-- shape are historical data too. A changed rubric is a new version.
CREATE FUNCTION rubric_has_final_evaluation(target_version text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM evaluations
    WHERE rubric_version = target_version
      AND status IN ('published', 'superseded')
  );
END;
$$ LANGUAGE plpgsql VOLATILE;
--> statement-breakpoint
CREATE FUNCTION trg_rubric_version_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    -- Exclusive: this rewrites the registered contract itself.
    PERFORM lock_rubric_contract(OLD.version, true);
  END IF;
  IF TG_OP <> 'INSERT' AND rubric_has_final_evaluation(OLD.version) THEN
    RAISE EXCEPTION 'rubric version % is used by final evaluations and is immutable', OLD.version
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER rubric_versions_immutable
  BEFORE UPDATE OR DELETE ON rubric_versions
  FOR EACH ROW EXECUTE FUNCTION trg_rubric_version_immutable();
--> statement-breakpoint

CREATE FUNCTION trg_dimension_definition_immutable() RETURNS trigger AS $$
DECLARE
  old_version    text;
  new_version    text;
  locked_version text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    old_version := OLD.rubric_version;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    new_version := NEW.rubric_version;
  END IF;

  -- Inserts have no dimension row to lock, so publication and definition
  -- edits coordinate on the migration-owned rubric identity.
  FOR locked_version IN
    SELECT version
    FROM rubric_versions
    WHERE version = old_version OR version = new_version
    ORDER BY version
  LOOP
    -- Exclusive: a dimension is part of the rubric's canonical shape.
    PERFORM lock_rubric_contract(locked_version, true);
  END LOOP;

  IF old_version IS NOT NULL AND rubric_has_final_evaluation(old_version) THEN
    RAISE EXCEPTION 'rubric % is used by final evaluations and is immutable', old_version
      USING ERRCODE = 'check_violation';
  END IF;
  IF new_version IS NOT NULL AND rubric_has_final_evaluation(new_version) THEN
    RAISE EXCEPTION 'rubric % is used by final evaluations and is immutable', new_version
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER dimensions_definition_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON dimensions
  FOR EACH ROW EXECUTE FUNCTION trg_dimension_definition_immutable();
--> statement-breakpoint

CREATE FUNCTION trg_subcriterion_definition_immutable() RETURNS trigger AS $$
DECLARE
  old_rubric text;
  new_rubric text;
  locked_rubric text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT rubric_version INTO old_rubric
    FROM dimensions WHERE id = OLD.dimension_id
    FOR SHARE;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT rubric_version INTO new_rubric
    FROM dimensions WHERE id = NEW.dimension_id
    FOR SHARE;
  END IF;

  FOR locked_rubric IN
    SELECT version
    FROM rubric_versions
    WHERE version = old_rubric OR version = new_rubric
    ORDER BY version
  LOOP
    -- Exclusive: a subcriterion is part of the rubric's canonical shape.
    PERFORM lock_rubric_contract(locked_rubric, true);
  END LOOP;

  IF old_rubric IS NOT NULL AND rubric_has_final_evaluation(old_rubric) THEN
    RAISE EXCEPTION 'rubric % is used by final evaluations and is immutable', old_rubric
      USING ERRCODE = 'check_violation';
  END IF;
  IF new_rubric IS NOT NULL AND rubric_has_final_evaluation(new_rubric) THEN
    RAISE EXCEPTION 'rubric % is used by final evaluations and is immutable', new_rubric
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP <> 'DELETE' THEN
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER subcriteria_definition_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON subcriteria
  FOR EACH ROW EXECUTE FUNCTION trg_subcriterion_definition_immutable();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Non-vacuous publish completeness. A registry row has to exist (FK), its
-- canonical shape must be fully present, and then every evaluation child is
-- checked exactly as before. An empty/typo rubric can no longer satisfy the
-- inner joins by producing zero expected rows.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_published_evaluation_complete(target uuid)
RETURNS void AS $$
DECLARE
  current_status                    evaluation_status;
  current_rubric                    text;
  expected_dimensions              integer;
  expected_subcriteria_per_dimension integer;
  actual_dimensions                bigint;
  malformed_dimensions             bigint;
  missing_rows                     bigint;
  missing_conf                     bigint;
BEGIN
  SELECT status, rubric_version
  INTO current_status, current_rubric
  FROM evaluations WHERE id = target;

  -- Row gone (cascade delete) or not final yet: nothing to enforce.
  IF NOT FOUND OR current_status NOT IN ('published', 'superseded') THEN
    RETURN;
  END IF;

  SELECT rv.expected_dimension_count, rv.expected_subcriteria_per_dimension
  INTO expected_dimensions, expected_subcriteria_per_dimension
  FROM rubric_versions AS rv WHERE rv.version = current_rubric;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'published evaluation % uses unregistered rubric %', target, current_rubric
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (
    WHERE subcriterion_count <> expected_subcriteria_per_dimension
  )
  INTO actual_dimensions, malformed_dimensions
  FROM (
    SELECT d.id, COUNT(s.id) AS subcriterion_count
    FROM dimensions d
    LEFT JOIN subcriteria s ON s.dimension_id = d.id
    WHERE d.rubric_version = current_rubric
    GROUP BY d.id
  ) shape;

  IF actual_dimensions <> expected_dimensions OR malformed_dimensions > 0 THEN
    RAISE EXCEPTION
      'rubric % is incomplete: expected % dimensions with % subcriteria each; found % dimensions and % malformed dimension(s)',
      current_rubric,
      expected_dimensions,
      expected_subcriteria_per_dimension,
      actual_dimensions,
      malformed_dimensions
      USING ERRCODE = 'check_violation';
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
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Bidirectional, rubric-local supersession coherence. 0001 validated only the
-- row carrying the outgoing link, so changing its predecessor later could
-- invalidate an incoming edge without firing the check.
-- ---------------------------------------------------------------------------
CREATE FUNCTION assert_evaluation_lineage_coherent(target uuid)
RETURNS void AS $$
DECLARE
  current_game       uuid;
  current_rubric     text;
  current_version    integer;
  current_status     evaluation_status;
  predecessor_id     uuid;
  predecessor_game   uuid;
  predecessor_rubric text;
  predecessor_version integer;
  predecessor_status evaluation_status;
  incoming           record;
  final_successors   bigint := 0;
BEGIN
  SELECT game_id, rubric_version, version_number, status, supersedes_evaluation_id
  INTO current_game, current_rubric, current_version, current_status, predecessor_id
  FROM evaluations WHERE id = target;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF predecessor_id IS NOT NULL THEN
    SELECT game_id, rubric_version, version_number, status
    INTO predecessor_game, predecessor_rubric, predecessor_version, predecessor_status
    FROM evaluations WHERE id = predecessor_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'evaluation % supersedes a nonexistent evaluation', target
        USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF predecessor_game <> current_game THEN
      RAISE EXCEPTION 'evaluation % supersedes an evaluation of a different game', target
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
    SELECT id, game_id, rubric_version, version_number, status
    FROM evaluations WHERE supersedes_evaluation_id = target
  LOOP
    IF incoming.game_id <> current_game THEN
      RAISE EXCEPTION 'incoming successor % belongs to a different game', incoming.id
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

CREATE OR REPLACE FUNCTION trg_supersession_is_coherent() RETURNS trigger AS $$
BEGIN
  PERFORM assert_evaluation_lineage_coherent(NEW.id);
  IF NEW.supersedes_evaluation_id IS NOT NULL THEN
    PERFORM assert_evaluation_lineage_coherent(NEW.supersedes_evaluation_id);
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD.supersedes_evaluation_id IS NOT NULL
     AND OLD.supersedes_evaluation_id IS DISTINCT FROM NEW.supersedes_evaluation_id THEN
    PERFORM assert_evaluation_lineage_coherent(OLD.supersedes_evaluation_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- Validate all pre-existing final snapshots and lineage neighborhoods before
-- the migration commits. The current seed has no history, but this keeps the
-- upgrade safe once real editorial data exists.
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
