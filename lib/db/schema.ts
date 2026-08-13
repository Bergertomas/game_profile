import {
  boolean,
  date,
  foreignKey,
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
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/**
 * Postgres schema for Game Profile (Master Plan §13).
 *
 * Design commitments encoded here:
 *  - Editorial data (evaluations) is separate from third-party metadata
 *    (game_external_ids). §25.11.
 *  - A game may carry several simultaneously current profiles, one per
 *    evaluated experience (profile_scopes). Rubric §1.
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

/**
 * Editorial maturity of a pre-release profile (SOP §10.1).
 * Required when evidence_status = 'pre_release'.
 */
export const evidenceMaturityEnum = pgEnum("evidence_maturity", [
  "announced",
  "showcased",
  "hands_on",
  "review_code",
]);

/** Plan §13.1. Drives the public source-category counts, never an average. */
export const sourceCategoryEnum = pgEnum("source_category", [
  "direct_play",
  "critic",
  "technical",
  "specialist_creator",
  "player_signal",
  "first_party",
]);

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

/**
 * How an evaluation's numbers came to exist — the durable kind, not the
 * workflow event that produced them.
 *
 * The first version of this enum listed `calibration_round_1`,
 * `calibration_round_2` and `derived_pending_round_1_reconciliation`. That was
 * right for a three-profile calibration corpus and wrong for everything after
 * it: an ordinary authored profile had no value to carry, a fourth round would
 * need a schema migration, and "pending reconciliation" is a state a profile
 * passes through rather than a fact about where its numbers came from.
 *
 *   editorial   — authored against the rubric and editorially signed off. The
 *                 normal case, and the one Phase 2 will use for every game.
 *   calibration — scored in a calibration round whose report publishes the
 *                 approved totals. Which round is data: see calibration_rounds.
 *   derived     — produced against the rubric without editorial sign-off, e.g.
 *                 by tooling. Requires a note, because a reader is entitled to
 *                 know the numbers have not been through review.
 *
 * Three kinds is the whole vocabulary. A new round is a row; a new workflow
 * state is not this column's business.
 */
export const scoreProvenanceEnum = pgEnum("score_provenance", [
  "editorial",
  "calibration",
  "derived",
]);

/**
 * The calibration rounds themselves.
 *
 * A registry rather than enum values, so conducting Round 3 inserts a row
 * instead of migrating a type — and so the round can carry its date and the
 * report that published its approved totals, which an enum label cannot.
 *
 * Frozen once a final evaluation cites it, exactly as evidence sources and tag
 * definitions are (ADR 0009): the round's label appears on the published page,
 * so rewriting it would rewrite that page's explanation of itself.
 */
export const calibrationRounds = pgTable("calibration_rounds", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  conductedAt: date("conducted_at"),
  /** Where the approved totals are published, e.g. the round's report. */
  reportReference: text("report_reference"),
});

/**
 * Whether the evidence ledger holds individual source records or only the broad
 * evidence *classes* the calibration profiles were scored against.
 *
 * Persisted rather than inferred: a database-backed reader must be able to tell
 * the two apart, so it never presents a source count that understates the real
 * basis for a score. Defaults to `pending` — a profile has to earn `populated`.
 */
export const evidenceLedgerStateEnum = pgEnum("evidence_ledger_state", [
  "populated",
  "pending",
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

/**
 * One evaluated experience of a game, and the durable identity of its
 * evaluation series (Rubric §1: "If different modes materially change the
 * experience, create separate evaluations rather than averaging them").
 *
 *   game
 *    └── profile scope "survival"    → v1 pre-release → v2 launch → v3 patched
 *    └── profile scope "wintermute"  → v1 launch      → v2 patched
 *
 * Both scopes are simultaneously *current*: each carries its own published row
 * and its own independent supersession history. That is the whole reason this
 * table exists — the previous model keyed the live row on the game, so The Long
 * Dark could publish Survival or Wintermute but never both.
 *
 * Identity is this row's `id`, never text. `edition_scope` and `mode_scope`
 * stay on the evaluation, where they are an immutable snapshot of what that
 * version declared; matching two evaluations by comparing those strings is
 * exactly the fragile mechanism this replaces. A re-worded mode is the same
 * series; a materially different mode is a different scope, and only an editor
 * can tell those apart.
 *
 * `key` is the stable editorial handle ("survival"), `label` the public one
 * ("Survival"). Ordering is `(display_order, key)` — deterministic without a
 * uniqueness constraint that would make reordering two scopes a two-step dance.
 */
export const profileScopes = pgTable(
  "profile_scopes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    /** What this scope covers, and what it deliberately excludes. */
    summary: text("summary"),
    displayOrder: integer("display_order").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("profile_scopes_game_key").on(table.gameId, table.key),
    /**
     * Not redundant with the primary key. It is the target of the composite
     * foreign key on `evaluations`, which is what makes "an evaluation's scope
     * belongs to the evaluation's game" a real referential constraint rather
     * than a trigger that has to be remembered.
     */
    unique("profile_scopes_game_identity").on(table.id, table.gameId),
    index("profile_scopes_game_order_idx").on(
      table.gameId,
      table.displayOrder,
      table.key,
    ),
  ],
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
 * Registered, locked rubric identities.
 *
 * Evaluations and dimensions both reference this table, so a typo such as
 * `1.O` cannot create a vacuously-complete published profile. The expected
 * shape is checked again by the publish constraint trigger: registering a
 * version without its canonical dimensions is not enough to make it usable.
 */
export const rubricVersions = pgTable("rubric_versions", {
  version: text("version").primaryKey(),
  expectedDimensionCount: integer("expected_dimension_count").notNull(),
  expectedSubcriteriaPerDimension: integer(
    "expected_subcriteria_per_dimension",
  ).notNull(),
  lockedAt: date("locked_at").notNull(),
});

/**
 * Rubric metadata is versioned in the database as well as in code. The typed
 * module in lib/rubric is the authoring source; these rows exist so historical
 * evaluations remain joinable and renderable after a rubric version bump.
 */
export const dimensions = pgTable(
  "dimensions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rubricVersion: text("rubric_version")
      .notNull()
      .references(() => rubricVersions.version, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
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
    /**
     * The evaluation series this version belongs to. Every uniqueness and
     * supersession rule below is keyed on this rather than on `game_id`, which
     * is what lets two modes of one game be published at the same time.
     */
    scopeId: uuid("scope_id")
      .notNull()
      .references(() => profileScopes.id, { onDelete: "restrict" }),
    rubricVersion: text("rubric_version")
      .notNull()
      .references(() => rubricVersions.version, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    versionNumber: integer("version_number").notNull(),

    /**
     * Mandatory declared scope (Rubric §1), snapshotted per version.
     *
     * `profile_scopes` carries the identity; these carry what this particular
     * evaluation said it covered, and they are frozen with the rest of the
     * snapshot once it is published. A v3 that re-words its mode still belongs
     * to the same series, and history keeps the wording it was published under.
     */
    editionScope: text("edition_scope").notNull(),
    modeScope: text("mode_scope").notNull(),
    platformScope: text("platform_scope").array().notNull(),
    buildOrPatchScope: text("build_or_patch_scope").notNull(),
    currentStateCutoffAt: date("current_state_cutoff_at"),

    status: evaluationStatusEnum("status").notNull().default("draft"),
    evidenceStatus: evidenceStatusEnum("evidence_status").notNull(),
    /** Required when evidence_status = 'pre_release'. See constraints.sql. */
    evidenceMaturity: evidenceMaturityEnum("evidence_maturity"),
    confidence: confidenceEnum("confidence").notNull(),
    evidenceCutoffAt: date("evidence_cutoff_at").notNull(),
    releaseContext: text("release_context"),

    oneLineExperience: text("one_line_experience"),
    primaryPull: text("primary_pull"),
    primaryRisk: text("primary_risk"),
    platformWarning: text("platform_warning"),

    scoreProvenance: scoreProvenanceEnum("score_provenance").notNull(),
    /**
     * Required when provenance is `calibration`, and meaningless otherwise —
     * a check constraint enforces the biconditional, so a profile can neither
     * claim a round it does not have nor cite one it is not from.
     */
    calibrationRound: text("calibration_round").references(
      () => calibrationRounds.key,
      { onDelete: "restrict", onUpdate: "restrict" },
    ),
    /** Required when provenance is `derived`. Shown in-product. */
    provenanceNote: text("provenance_note"),
    evidenceLedger: evidenceLedgerStateEnum("evidence_ledger")
      .notNull()
      .default("pending"),

    createdBy: text("created_by"),
    reviewedBy: text("reviewed_by"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /**
     * The evaluation this one replaces. Self-referencing so the lineage is a
     * real, enforced chain rather than a loose uuid: you cannot point at an
     * evaluation that does not exist, and ON DELETE RESTRICT means history
     * cannot be deleted out from under its successor (Plan §25.12).
     */
    supersedesEvaluationId: uuid("supersedes_evaluation_id").references(
      (): AnyPgColumn => evaluations.id,
      { onDelete: "restrict" },
    ),
    changeSummary: text("change_summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("evaluations_scope_version").on(
      table.scopeId,
      table.rubricVersion,
      table.versionNumber,
    ),
    /**
     * The scope must belong to the same game as the evaluation. A composite
     * key, so Postgres enforces it: with two independent foreign keys a
     * Wintermute evaluation could point at a Returnal scope.
     */
    foreignKey({
      name: "evaluations_scope_belongs_to_game",
      columns: [table.scopeId, table.gameId],
      foreignColumns: [profileScopes.id, profileScopes.gameId],
    }).onDelete("restrict"),
    index("evaluations_game_status_idx").on(table.gameId, table.status),
    index("evaluations_scope_status_idx").on(table.scopeId, table.status),
    index("evaluations_supersedes_idx").on(table.supersedesEvaluationId),
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
    rationale: text("rationale"),
    /**
     * Platform *context* on the canonical score, e.g. "PC is demanding at
     * ray-traced presets". Prose, not a deviation — a materially different
     * value on a platform is an override row, not a note.
     */
    platformNote: text("platform_note"),
    evidenceConfidence: confidenceEnum("evidence_confidence"),
  },
  (table) => [
    primaryKey({ columns: [table.evaluationId, table.subcriterionId] }),
  ],
);

/**
 * A materially different value for one subcriterion on one platform.
 * Rubric §3: "If platform performance differs materially, store
 * platform-specific Technical Stability overrides/notes. Do not hide severe
 * PC/console differences inside a single unexplained number."
 *
 * A separate table rather than a nullable column on the score row, because the
 * score row's primary key is (evaluation, subcriterion): it can hold at most
 * one platform, which is the one shape this feature cannot use. The old
 * `platform_id` column there was therefore never functional and is dropped.
 *
 * ── What the numbers mean ───────────────────────────────────────────────────
 *
 * The base `subcriterion_scores.score` remains canonical. It is what the
 * profile publishes, what `dimension_scores` derives from, and what a reader
 * sees; an override never enters a dimension total. Overrides are the exception
 * layer — "on this platform, this specific reading differs and here is why" —
 * so that a severe divergence is recorded rather than averaged into the base or
 * duplicated into a whole parallel evaluation per platform.
 *
 * Enforced, not merely intended:
 *  - one row per (evaluation, subcriterion, platform), by primary key, so a
 *    conflicting duplicate cannot exist;
 *  - a base score row must exist, by composite foreign key;
 *  - the value must actually differ from the base — an override equal to the
 *    base is not a material deviation, it is noise;
 *  - the platform must be one the game ships on;
 *  - the rationale is required, because an unexplained divergence is exactly
 *    the "single unexplained number" the rubric forbids;
 *  - overrides on a final evaluation are frozen with the rest of its children.
 *
 * A consumer reads a platform-specific value through the
 * `subcriterion_platform_readings` view, which falls back to the base wherever
 * no override exists.
 */
export const subcriterionPlatformOverrides = pgTable(
  "subcriterion_platform_overrides",
  {
    evaluationId: uuid("evaluation_id").notNull(),
    subcriterionId: uuid("subcriterion_id").notNull(),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platforms.id, { onDelete: "restrict" }),
    /** NULL means unknown on this platform — never zero, as everywhere else. */
    score: numeric("score", { precision: 2, scale: 1 }),
    rationale: text("rationale").notNull(),
    evidenceConfidence: confidenceEnum("evidence_confidence"),
  },
  (table) => [
    primaryKey({
      columns: [table.evaluationId, table.subcriterionId, table.platformId],
    }),
    foreignKey({
      name: "subcriterion_platform_overrides_base_fk",
      columns: [table.evaluationId, table.subcriterionId],
      foreignColumns: [
        subcriterionScores.evaluationId,
        subcriterionScores.subcriterionId,
      ],
    }).onDelete("cascade"),
  ],
);

/**
 * Per-dimension editorial assessment (SOP §5, Plan §13.1).
 *
 * Confidence is an editorial *input*, not something derivable from the scores,
 * so it cannot live in the `dimension_scores` view. A dimension may sit at
 * Medium inside an otherwise High-confidence profile — that is the point of
 * recording it separately.
 */
export const dimensionAssessments = pgTable(
  "dimension_assessments",
  {
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => evaluations.id, { onDelete: "cascade" }),
    dimensionId: uuid("dimension_id")
      .notNull()
      .references(() => dimensions.id, { onDelete: "restrict" }),
    confidence: confidenceEnum("confidence").notNull(),
    note: text("note"),
  },
  (table) => [primaryKey({ columns: [table.evaluationId, table.dimensionId] })],
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
  /**
   * Stable editorial key, e.g. "src_aw2_technical_analysis".
   *
   * This is how seeds and imports identify a source. Titles are not unique —
   * "Digital Foundry performance analysis" describes a hundred different
   * articles — so resolving by title silently merges distinct sources and makes
   * re-seeding non-idempotent.
   */
  sourceKey: text("source_key").notNull().unique(),
  title: text("title").notNull(),
  url: text("url"),
  publisher: text("publisher"),
  author: text("author"),
  publishedAt: date("published_at"),
  accessedAt: date("accessed_at"),
  evidenceTier: evidenceTierEnum("evidence_tier").notNull(),
  sourceCategory: sourceCategoryEnum("source_category").notNull(),
  /** Free-text refinement beneath the enum, e.g. "video essay". */
  sourceType: text("source_type"),
});

/**
 * Evidence attached to an evaluation, optionally narrowed to a dimension or a
 * single subcriterion (Plan §13.1).
 *
 * A surrogate key rather than a composite one: a single source routinely bears
 * on several dimensions, so one row per (source, dimension) pair is the point.
 * A NULL dimension means profile-level evidence — scope or factual context that
 * does not support any particular score. The uniqueness rule lives in
 * constraints.sql because it needs NULLS NOT DISTINCT.
 */
export const evaluationEvidenceLinks = pgTable(
  "evaluation_evidence_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => evaluations.id, { onDelete: "cascade" }),
    evidenceSourceId: uuid("evidence_source_id")
      .notNull()
      .references(() => evidenceSources.id, { onDelete: "restrict" }),
    dimensionId: uuid("dimension_id").references(() => dimensions.id),
    subcriterionId: uuid("subcriterion_id").references(() => subcriteria.id),
    /** Platforms this source speaks to, where that matters (Plan §13.1). */
    platformScope: text("platform_scope").array(),
    note: text("note"),
    spoilerSensitive: boolean("spoiler_sensitive").notNull().default(false),
  },
  (table) => [
    index("evaluation_evidence_links_eval_idx").on(
      table.evaluationId,
      table.dimensionId,
    ),
  ],
);

/**
 * Provider-backed runtime data (Plan §13.1 `game_time_estimates`, SOP §7).
 *
 * Deliberately hangs off `games`, not `evaluations`: runtime is factual
 * metadata, and it must NEVER feed the eight dimension scores. Pacing & Time
 * Respect judges whether time is *earned*, which is an editorial judgement that
 * a completion-time average cannot make.
 *
 * IGDB `game_time_to_beats` is the preferred first source. Do not build on an
 * unofficial HowLongToBeat scraper (SOP §8).
 */
export const gameTimeEstimates = pgTable(
  "game_time_estimates",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    externalGameId: text("external_game_id"),
    mainOrHastySeconds: integer("main_or_hasty_seconds"),
    normalOrMainPlusSeconds: integer("normal_or_main_plus_seconds"),
    completionistSeconds: integer("completionist_seconds"),
    submissionCount: integer("submission_count"),
    providerUpdatedAt: timestamp("provider_updated_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Attribution text some providers require us to display. */
    attributionText: text("attribution_text"),
  },
  (table) => [primaryKey({ columns: [table.gameId, table.provider] })],
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
