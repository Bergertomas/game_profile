-- The primary profile scope: which of a game's evaluated experiences owns the
-- canonical public URL.
--
-- ADR 0014 left the addressing question open. It is now decided (ADR 0016):
--
--   /games/<slug>              the primary scope
--   /games/<slug>/<scope-key>  every sibling scope
--
-- Primary status is an explicit, durable property rather than something read
-- off `display_order`. Reordering two scopes is a presentation change; it must
-- not silently move a canonical URL, because that is how a page loses its
-- history and its inbound links.

ALTER TABLE "profile_scopes" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

-- Backfill: the scope that was already first in the public ordering becomes
-- primary, which for every existing game is its single `default` scope. This is
-- the only point at which `display_order` decides anything about primacy.
UPDATE profile_scopes ps
SET is_primary = true
WHERE ps.id = (
  SELECT inner_scope.id
  FROM profile_scopes AS inner_scope
  WHERE inner_scope.game_id = ps.game_id
  ORDER BY inner_scope.display_order, inner_scope.key
  LIMIT 1
);
--> statement-breakpoint

-- At most one primary per game.
CREATE UNIQUE INDEX "profile_scopes_one_primary_per_game"
  ON profile_scopes (game_id)
  WHERE is_primary;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Per rubric version, a game that publishes anything publishes its primary.
--
-- The weakest rule — "a primary scope exists" — permits a state the public site
-- cannot answer for: primary scope in draft, a sibling published, and
-- /games/<slug> therefore 404 while /games/<slug>/<sibling> works. The bare
-- game URL is the address people link, share and search for, so it is the one
-- that must always resolve when the game has anything public at all.
--
-- ASKING THE QUESTION PER GAME IS STILL TOO WEAK, and the gap is not
-- hypothetical once a second rubric is registered. Public resolution selects
-- Published rows for PUBLIC_RUBRIC_VERSION, so a game-wide question permits:
--
--     primary scope Published under rubric 1.0 only
--     sibling scope Published under rubric 2.0 only
--     PUBLIC_RUBRIC_VERSION moved to 2.0
--     → /games/<slug>/<sibling> resolves, /games/<slug> is 404
--
-- Every row involved is Published and the game-wide check is satisfied, yet the
-- canonical URL has no answer — exactly the outcome ADR 0016 exists to prevent.
-- The check therefore keys on (game, rubric version): for every rubric under
-- which any scope of a game publishes, the primary scope must publish too.
--
-- That also makes a rubric cut-over safe by construction. Migrating to a new
-- rubric must reach the primary scope before the public selector moves, which
-- is the order an editor would want anyway.
--
-- Editorially this says: publish the primary scope first, under the same rubric,
-- or make the scope you are publishing the primary one. Both are one-line acts.
--
-- DEFERRABLE INITIALLY DEFERRED, so an editor can insert a scope, publish an
-- evaluation and flip primacy inside one transaction in any order.
-- ---------------------------------------------------------------------------
CREATE FUNCTION assert_primary_scope_is_publishable(target_game uuid)
RETURNS void AS $$
DECLARE
  primary_scope   uuid;
  orphaned_rubric text;
BEGIN
  IF target_game IS NULL THEN
    RETURN;
  END IF;

  -- No public content anywhere: nothing to guarantee an address for.
  IF NOT EXISTS (
    SELECT 1 FROM evaluations
    WHERE game_id = target_game AND status = 'published'
  ) THEN
    RETURN;
  END IF;

  SELECT id INTO primary_scope
  FROM profile_scopes
  WHERE game_id = target_game AND is_primary;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'game % publishes a profile but has no primary profile scope; the canonical /games/<slug> URL would not resolve',
      target_game
      USING ERRCODE = 'check_violation';
  END IF;

  -- The first rubric under which some scope publishes and the primary does not.
  SELECT published.rubric_version INTO orphaned_rubric
  FROM evaluations AS published
  WHERE published.game_id = target_game
    AND published.status = 'published'
    AND NOT EXISTS (
      SELECT 1
      FROM evaluations AS primary_row
      WHERE primary_row.scope_id = primary_scope
        AND primary_row.status = 'published'
        AND primary_row.rubric_version = published.rubric_version
    )
  ORDER BY published.rubric_version
  LIMIT 1;

  IF orphaned_rubric IS NOT NULL THEN
    RAISE EXCEPTION
      'game % publishes a profile scope under rubric % while its primary scope publishes nothing under that rubric; the canonical /games/<slug> URL would not resolve if the public selector moved to %',
      target_game, orphaned_rubric, orphaned_rubric
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE FUNCTION trg_evaluation_primary_scope_coherent() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM assert_primary_scope_is_publishable(OLD.game_id);
    RETURN NULL;
  END IF;
  PERFORM assert_primary_scope_is_publishable(NEW.game_id);
  -- A retargeted evaluation can leave its former game without a public primary.
  IF TG_OP = 'UPDATE' AND OLD.game_id IS DISTINCT FROM NEW.game_id THEN
    PERFORM assert_primary_scope_is_publishable(OLD.game_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER evaluations_primary_scope_coherent
  AFTER INSERT OR UPDATE OR DELETE ON evaluations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_evaluation_primary_scope_coherent();
--> statement-breakpoint

-- The same guarantee from the other side: moving or removing primacy must not
-- strand a game that is already publishing.
CREATE FUNCTION trg_profile_scope_primary_coherent() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM assert_primary_scope_is_publishable(OLD.game_id);
    RETURN NULL;
  END IF;
  PERFORM assert_primary_scope_is_publishable(NEW.game_id);
  IF TG_OP = 'UPDATE' AND OLD.game_id IS DISTINCT FROM NEW.game_id THEN
    PERFORM assert_primary_scope_is_publishable(OLD.game_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER profile_scopes_primary_coherent
  AFTER INSERT OR UPDATE OR DELETE ON profile_scopes
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_profile_scope_primary_coherent();
--> statement-breakpoint

-- Validate every existing game before committing.
DO $$
DECLARE
  item record;
BEGIN
  FOR item IN SELECT DISTINCT game_id FROM evaluations LOOP
    PERFORM assert_primary_scope_is_publishable(item.game_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
