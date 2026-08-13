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
-- A game with any published profile has a published primary profile.
--
-- The weaker rule — "a primary scope exists" — permits a state the public site
-- cannot answer for: primary scope in draft, a sibling published, and
-- /games/<slug> therefore 404 while /games/<slug>/<sibling> works. The bare
-- game URL is the address people link, share and search for, so it is the one
-- that must always resolve when the game has anything public at all.
--
-- Editorially this says: publish the primary scope first, or make the scope you
-- are publishing the primary one. Both are one-line editorial acts.
--
-- DEFERRABLE INITIALLY DEFERRED, so an editor can insert a scope, publish an
-- evaluation and flip primacy inside one transaction in any order.
-- ---------------------------------------------------------------------------
CREATE FUNCTION assert_primary_scope_is_publishable(target_game uuid)
RETURNS void AS $$
DECLARE
  published_scopes  bigint;
  primary_scope     uuid;
  primary_published boolean;
BEGIN
  IF target_game IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*) INTO published_scopes
  FROM evaluations
  WHERE game_id = target_game AND status = 'published';

  -- No public content: nothing to guarantee an address for.
  IF published_scopes = 0 THEN
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

  SELECT EXISTS (
    SELECT 1 FROM evaluations
    WHERE scope_id = primary_scope AND status = 'published'
  ) INTO primary_published;

  IF NOT primary_published THEN
    RAISE EXCEPTION
      'game % publishes a sibling profile scope while its primary scope has none; publish the primary scope, or make the published scope primary',
      target_game
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
