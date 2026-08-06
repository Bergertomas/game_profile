import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Postgres schema for Game Profile (Master Plan §13).
 *
 * Design commitments encoded here:
 *  - Editorial data (evaluations) is separate from third-party metadata
 *    (game_external_ids). §25.11.
 *  - Evaluations are versioned and never overwritten; supersession is a link,
 *    not a mutation. §25.12.
 *  - Every evaluation stores its rubric_version. Rubric §18.
 *  - Dimension totals are a VIEW derived from subcriterion_scores, never a
 *    hand-entered column, so the number and its rationale cannot disagree. §13.1.
 *  - Evaluation scope (edition/mode/platform/build) is NOT NULL. Rubric §1.
 */

export const releaseStatusEnum = pgEnum("release_status", [
  "released",
  "upcoming",
  "early_access",
]);

export const evaluationStatusEnum = pgEnum("evaluation_status", [
  "draft",
  "review",
  "published",
  "superseded",
]);

export const evidenceStatusEnum = pgEnum("evidence_status", [
  "verified",
  "provisional",
  "pre_release",
]);

export const confidenceEnum = pgEnum("confidence", ["low", "medium", "high"]);

export const evidenceTierEnum = pgEnum("evidence_tier", ["A", "B", "C", "D"]);

export const blockTypeEnum = pgEnum("block_type", [
  "great_fit",
  "know_before",
  "probably_not",
]);

export const tagValueTypeEnum = pgEnum("tag_value_type", [
  "boolean",
  "intensity",
]);

export const tagIntensityEnum = pgEnum("tag_intensity", [
  "low",
  "medium",
  "high",
]);

export const scoreProvenanceEnum = pgEnum("score_provenance", [
  "calibration_round_1",
  "calibration_round_2",
  "derived_pending_round_1_reconciliation",
]);

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    canonicalTitle: text("canonical_title").notNull(),
    summary: text("summary"),
    coverUrl: text("cover_url"),
    heroUrl: text("hero_url"),
    developerText: text("developer_text"),
    publisherText: text("publisher_text"),
    firstReleaseDate: date("first_release_date"),
    releaseStatus: releaseStatusEnum("release_status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("games_title_idx").on(table.canonicalTitle)],
);

/** Third-party provider IDs live here, never on `games`. Plan §12.3. */
export const gameExternalIds = pgTable(
  "game_external_ids",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    externalUrl: text("external_url"),
  },
  (table) => [primaryKey({ columns: [table.gameId, table.provider] })],
);

export const platforms = pgTable("platforms", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const gamePlatforms = pgTable(
  "game_platforms",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platforms.id, { onDelete: "cascade" }),
    releaseDate: date("release_date"),
    performanceNotes: text("performance_notes"),
  },
  (table) => [primaryKey({ columns: [table.gameId, table.platformId] })],
);

/** Alternate titles for search. Plan §12.4. */
export const gameAliases = pgTable(
  "game_aliases",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    aliasType: text("alias_type"),
  },
  (table) => [
    primaryKey({ columns: [table.gameId, table.alias] }),
    index("game_aliases_alias_idx").on(table.alias),
  ],
);

/**
 * Rubric metadata is versioned in the database as well as in code. The typed
 * module in lib/rubric is the authoring source; these rows exist so historical
 * evaluations remain joinable and renderable after a rubric version bump.
 */
export const dimensions = pgTable(
  "dimensions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rubricVersion: text("rubric_version").notNull(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    displayOrder: integer("display_order").notNull(),
    radarOrder: integer("radar_order").notNull(),
  },
  (table) => [unique("dimensions_version_key").on(table.rubricVersion, table.key)],
);

export const subcriteria = pgTable(
  "subcriteria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dimensionId: uuid("dimension_id")
      .notNull()
      .references(() => dimensions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [unique("subcriteria_dimension_key").on(table.dimensionId, table.key)],
);

/** One editorial version of one scoped game experience. Plan §13.1. */
export const evaluations = pgTable(
  "evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    rubricVersion: text("rubric_version").notNull(),
    versionNumber: integer("version_number").notNull(),

    // Mandatory evaluation scope. Rubric §1.
    editionScope: text("edition_scope").notNull(),
    modeScope: text("mode_scope").notNull(),
    platformScope: text("platform_scope").array().notNull(),
    buildOrPatchScope: text("build_or_patch_scope").notNull(),
    currentStateCutoffAt: date("current_state_cutoff_at"),

    status: evaluationStatusEnum("status").notNull().default("draft"),
    evidenceStatus: evidenceStatusEnum("evidence_status").notNull(),
    confidence: confidenceEnum("confidence").notNull(),
    evidenceCutoffAt: date("evidence_cutoff_at").notNull(),
    releaseContext: text("release_context"),

    oneLineExperience: text("one_line_experience"),
    primaryPull: text("primary_pull"),
    primaryRisk: text("primary_risk"),
    platformWarning: text("platform_warning"),

    scoreProvenance: scoreProvenanceEnum("score_provenance").notNull(),
    provenanceNote: text("provenance_note"),

    createdBy: text("created_by"),
    reviewedBy: text("reviewed_by"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    supersedesEvaluationId: uuid("supersedes_evaluation_id"),
    changeSummary: text("change_summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("evaluations_game_version").on(
      table.gameId,
      table.rubricVersion,
      table.versionNumber,
    ),
    index("evaluations_game_status_idx").on(table.gameId, table.status),
  ],
);

/**
 * The atomic unit of scoring. `score` is nullable: NULL means an explicit
 * editorial `unknown`, which is not zero and must never be rendered as zero.
 * Rubric §1, §22.
 */
export const subcriterionScores = pgTable(
  "subcriterion_scores",
  {
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => evaluations.id, { onDelete: "cascade" }),
    subcriterionId: uuid("subcriterion_id")
      .notNull()
      .references(() => subcriteria.id, { onDelete: "restrict" }),
    score: numeric("score", { precision: 2, scale: 1 }),
    /** Platform-specific override, chiefly for Technical Stability. Rubric §3. */
    platformId: uuid("platform_id").references(() => platforms.id),
    rationale: text("rationale"),
    platformNote: text("platform_note"),
    evidenceConfidence: confidenceEnum("evidence_confidence"),
  },
  (table) => [
    primaryKey({ columns: [table.evaluationId, table.subcriterionId] }),
  ],
);

export const profileBlocks = pgTable(
  "profile_blocks",
  {
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => evaluations.id, { onDelete: "cascade" }),
    blockType: blockTypeEnum("block_type").notNull(),
    itemOrder: integer("item_order").notNull(),
    text: text("text").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.evaluationId, table.blockType, table.itemOrder],
    }),
  ],
);

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  valueType: tagValueTypeEnum("value_type").notNull().default("boolean"),
});

export const evaluationTags = pgTable(
  "evaluation_tags",
  {
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => evaluations.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "restrict" }),
    intensity: tagIntensityEnum("intensity"),
    note: text("note"),
  },
  (table) => [primaryKey({ columns: [table.evaluationId, table.tagId] })],
);

export const evidenceSources = pgTable("evidence_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  url: text("url"),
  publisher: text("publisher"),
  author: text("author"),
  publishedAt: date("published_at"),
  accessedAt: date("accessed_at"),
  evidenceTier: evidenceTierEnum("evidence_tier").notNull(),
  sourceType: text("source_type"),
});

export const evaluationEvidenceLinks = pgTable(
  "evaluation_evidence_links",
  {
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => evaluations.id, { onDelete: "cascade" }),
    evidenceSourceId: uuid("evidence_source_id")
      .notNull()
      .references(() => evidenceSources.id, { onDelete: "restrict" }),
    dimensionId: uuid("dimension_id").references(() => dimensions.id),
    subcriterionId: uuid("subcriterion_id").references(() => subcriteria.id),
    note: text("note"),
    spoilerSensitive: boolean("spoiler_sensitive").notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.evaluationId, table.evidenceSourceId] }),
  ],
);

export const evaluationRevisions = pgTable("evaluation_revisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  evaluationId: uuid("evaluation_id")
    .notNull()
    .references(() => evaluations.id, { onDelete: "cascade" }),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  changedBy: text("changed_by"),
  summary: text("summary").notNull(),
});
