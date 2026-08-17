-- Authored ordering for evaluation tags and evidence links.
--
-- Master Plan §8.7 names these as the two known schema gaps, and Phase 2C is
-- where they close, because 2C is where an editor first has an order to author.
--
-- ── What was wrong with deriving it ────────────────────────────────────────
--
-- Neither table had an ordering column, so an authored sequence was not
-- representable at all. `buildProfileView` compensated by imposing a canonical
-- order — tags by the controlled vocabulary, evidence by source key — which was
-- correct for parity and is not the same thing as preserving what an editor
-- decided. ADR 0017 recorded that as deferred to the editors. Here it is.
--
-- Row order in a table is not an answer either: Postgres makes no promise about
-- it, and an UPDATE can physically move a row.
--
-- ── The backfill preserves exactly what is rendered today ──────────────────
--
-- Not insertion order, which is unknowable, and not the primary key, which is a
-- surrogate. Each existing row is numbered by the order the public site is
-- currently putting it in, so no published page changes when the readers start
-- honouring the column.
--
-- ── Why the immutability triggers are switched off, and only here ──────────
--
-- `evaluation_tags` and `evaluation_evidence_links` carry
-- `trg_evaluation_child_immutable`, which refuses any INSERT, UPDATE or DELETE
-- against a child of a `published` or `superseded` evaluation. That is the rule
-- the whole editorial model rests on, and the backfill below is an UPDATE of
-- exactly those rows, so on any database holding a published profile the first
-- version of this migration died on:
--
--     children of final evaluation 05668920-… are immutable; create a new version
--
-- It ran green everywhere anyway, because every database this repository builds
-- from scratch — CI, the local harnesses, the regression suite — migrates while
-- empty and seeds afterwards. The only databases with published rows at
-- migration time are the real ones.
--
-- Adding a presentation column to history is migration-level work, which is the
-- one thing the trigger is not there to stop: it exists so that *editorial*
-- writes cannot revise a final evaluation, and the answer it gives — "create a
-- new version" — is not available to a schema change. The alternative is worse
-- and silent: leave every published row at the column default and the public
-- pages re-order themselves the moment the readers start honouring it.
--
-- So the two triggers come off, for two statements, and go straight back on.
-- Drizzle runs a migration inside one transaction, so a failure anywhere below
-- rolls the re-enable back with everything else — the triggers cannot be left
-- off by a half-applied migration. Nothing else is disabled: the tag-definition
-- and rubric-coherence triggers fire only on columns this migration never
-- touches, and they stay armed throughout.

ALTER TABLE evaluation_tags
  ADD COLUMN display_order integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE evaluation_evidence_links
  ADD COLUMN display_order integer NOT NULL DEFAULT 0;
--> statement-breakpoint

ALTER TABLE evaluation_tags
  DISABLE TRIGGER evaluation_tags_snapshot_immutable;
--> statement-breakpoint
ALTER TABLE evaluation_evidence_links
  DISABLE TRIGGER evaluation_evidence_links_snapshot_immutable;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Tags: the controlled vocabulary's own order (lib/rubric/tags.ts).
--
-- Spelled out rather than joined from a table, because the vocabulary lives in
-- typed code and this migration is a historical record of the order that was
-- being rendered on the day it ran. A tag added to the vocabulary later sorts
-- after these, which is the same thing the application did with an unknown key.
-- ---------------------------------------------------------------------------
WITH vocabulary(key, position) AS (
  VALUES
  ('linear', 1),
  ('hub-based', 2),
  ('open-world', 3),
  ('mission-based', 4),
  ('run-based', 5),
  ('sandbox', 6),
  ('systemic', 7),
  ('story-heavy', 8),
  ('dialogue-heavy', 9),
  ('lore-heavy', 10),
  ('environmental-storytelling', 11),
  ('choice-consequence', 12),
  ('cutscene-heavy', 13),
  ('combat-heavy', 14),
  ('stealth-heavy', 15),
  ('exploration-heavy', 16),
  ('puzzle-heavy', 17),
  ('traversal-heavy', 18),
  ('buildcraft-heavy', 19),
  ('management-heavy', 20),
  ('backtracking', 21),
  ('grind', 22),
  ('repetition', 23),
  ('run-reset', 24),
  ('high-punishment', 25),
  ('difficult-checkpointing', 26),
  ('inventory-pressure', 27),
  ('resource-pressure', 28),
  ('reading-dense', 29),
  ('complex-onboarding', 30),
  ('horror', 31),
  ('sustained-tension', 32),
  ('helplessness-sections', 33),
  ('power-fantasy', 34),
  ('melancholy', 35),
  ('comedic', 36),
  ('cozy', 37),
  ('co-op-forward', 38),
  ('couch-friendly', 39),
  ('multiplayer-dependent', 40),
  ('pvp-forward', 41),
  ('dated-friction', 42),
  ('technical-instability', 43),
  ('performance-sensitive', 44)
),
numbered AS (
  SELECT
    et.evaluation_id,
    et.tag_id,
    row_number() OVER (
      PARTITION BY et.evaluation_id
      ORDER BY COALESCE(v.position, 1000000), tags.key
    ) AS authored_order
  FROM evaluation_tags AS et
  JOIN tags ON tags.id = et.tag_id
  LEFT JOIN vocabulary AS v ON v.key = tags.key
)
UPDATE evaluation_tags AS et
SET display_order = numbered.authored_order
FROM numbered
WHERE numbered.evaluation_id = et.evaluation_id
  AND numbered.tag_id = et.tag_id;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Evidence links: by source key, then by the dimension each link supports.
--
-- The same order `orderSources` produces today. Deliberately mechanical: it
-- makes no claim that one source matters more than another, which ordering by
-- tier would. Evidence is counted, never weighted (SOP §6).
-- ---------------------------------------------------------------------------
WITH numbered AS (
  SELECT
    l.id,
    row_number() OVER (
      PARTITION BY l.evaluation_id
      ORDER BY es.source_key, COALESCE(d.display_order, -1), l.id
    ) AS authored_order
  FROM evaluation_evidence_links AS l
  JOIN evidence_sources AS es ON es.id = l.evidence_source_id
  LEFT JOIN dimensions AS d ON d.id = l.dimension_id
)
UPDATE evaluation_evidence_links AS l
SET display_order = numbered.authored_order
FROM numbered
WHERE numbered.id = l.id;
--> statement-breakpoint

-- Immutability restored. Every write after this migration commits — editorial,
-- scripted or by hand — faces the same refusal it faced before.
ALTER TABLE evaluation_tags
  ENABLE TRIGGER evaluation_tags_snapshot_immutable;
--> statement-breakpoint
ALTER TABLE evaluation_evidence_links
  ENABLE TRIGGER evaluation_evidence_links_snapshot_immutable;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- NO UNIQUENESS CONSTRAINT ON (evaluation_id, display_order), DELIBERATELY.
--
-- It was written and removed. Uniqueness sounds like the obvious integrity rule
-- and buys nothing the readers need, while making every writer that does not
-- care about order — a migration, a regression fixture, a psql session adding
-- one tag — fail on the column's default. Two rows sharing a position is not
-- corruption; it is an unstated preference between them.
--
-- Both readers therefore sort by `display_order` and then by a stable
-- tiebreaker (tag key, source key), which makes the order total whatever the
-- column contains. The editor assigns distinct positions because it is
-- rewriting a whole list; nothing else has to.
-- ---------------------------------------------------------------------------
CREATE INDEX evaluation_tags_order_idx
  ON evaluation_tags (evaluation_id, display_order);
--> statement-breakpoint
CREATE INDEX evaluation_evidence_links_order_idx
  ON evaluation_evidence_links (evaluation_id, display_order);
