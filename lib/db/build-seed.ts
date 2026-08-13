import { CALIBRATION_ROUND_LIST } from "@/lib/profile/provenance";
import { RUBRIC_V1, UNKNOWN } from "@/lib/rubric";
import { TAGS } from "@/lib/rubric/tags";
import type {
  Evaluation,
  EvidenceSource,
  GameWithEvaluation,
} from "@/lib/profile/types";
import { assertValidGameRecord } from "@/lib/validation/evaluation";

/**
 * Generate seed SQL from the typed fixtures the site renders.
 *
 * Two properties this file exists to guarantee:
 *
 *  1. **Idempotence.** Every statement is safe to run twice. Sources are keyed
 *     on their stable `source_key`, never on their title — titles are not
 *     unique, and resolving by title both merges distinct sources and
 *     duplicates rows on re-seed.
 *  2. **Consistency.** The fixtures are the single source of truth for both the
 *     rendered site and the database, so the two cannot drift.
 *
 * Extracted from the CLI script so tests can run it over synthetic corpora —
 * notably supersession chains, which the real calibration corpus does not have.
 */

export function sqlString(value: string | null | undefined): string {
  if (value === null || value === undefined) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlArray(values: readonly string[]): string {
  return `ARRAY[${values.map(sqlString).join(", ")}]`;
}

function dimensionRef(rubricVersion: string, key: string): string {
  return `(SELECT id FROM dimensions WHERE rubric_version = ${sqlString(
    rubricVersion,
  )} AND key = ${sqlString(key)})`;
}

/** Resolve a profile scope by (game slug, scope key) — its natural key. */
function scopeRef(slug: string, scopeKey: string): string {
  return `(SELECT ps.id FROM profile_scopes ps JOIN games g ON g.id = ps.game_id WHERE g.slug = ${sqlString(
    slug,
  )} AND ps.key = ${sqlString(scopeKey)})`;
}

/**
 * Resolve an evaluation by (game, profile scope, rubric version, version
 * number).
 *
 * The database's uniqueness contract is `(scope_id, rubric_version,
 * version_number)`. Both qualifiers are load-bearing: version 1 legitimately
 * exists once per scope of a game, and again for each rubric version. Resolving
 * on the game alone would return two rows the moment a game has a second scope.
 */
function evaluationRef(
  slug: string,
  scopeKey: string,
  rubricVersion: string,
  versionNumber: number,
): string {
  return `(SELECT e.id FROM evaluations e WHERE e.scope_id = ${scopeRef(
    slug,
    scopeKey,
  )} AND e.rubric_version = ${sqlString(
    rubricVersion,
  )} AND e.version_number = ${versionNumber})`;
}

function sourceRef(sourceKey: string): string {
  return `(SELECT id FROM evidence_sources WHERE source_key = ${sqlString(
    sourceKey,
  )})`;
}

interface SeedFinalizer {
  readonly evaluationRef: string;
  readonly targetStatus: Evaluation["status"];
  readonly publishedAt?: string;
}

function isNewEvaluation(evaluationRefSql: string): string {
  return `EXISTS (SELECT 1 FROM _seed_new_evaluations seeded WHERE seeded.evaluation_id = ${evaluationRefSql})`;
}

function sourceMetadataSignature(source: EvidenceSource): string {
  return JSON.stringify({
    title: source.title,
    url: source.url ?? null,
    publisher: source.publisher ?? null,
    author: source.author ?? null,
    publishedAt: source.publishedAt ?? null,
    tier: source.tier,
    category: source.category,
  });
}

function sourceMetadataMatches(source: EvidenceSource): string {
  return [
    `title = ${sqlString(source.title)}`,
    `url IS NOT DISTINCT FROM ${sqlString(source.url)}`,
    `publisher IS NOT DISTINCT FROM ${sqlString(source.publisher)}`,
    `author IS NOT DISTINCT FROM ${sqlString(source.author)}`,
    `published_at IS NOT DISTINCT FROM ${sqlString(source.publishedAt)}`,
    `evidence_tier = ${sqlString(source.tier)}`,
    `source_category = ${sqlString(source.category)}`,
  ].join(" AND ");
}

function evaluationSnapshotMatches(
  evaluation: Evaluation,
  supersedesRef: string,
): string {
  return [
    `edition_scope = ${sqlString(evaluation.scope.edition)}`,
    `mode_scope = ${sqlString(evaluation.scope.mode)}`,
    `platform_scope = ${sqlArray(evaluation.scope.platforms)}`,
    `build_or_patch_scope = ${sqlString(evaluation.scope.buildOrPatch)}`,
    `current_state_cutoff_at IS NOT DISTINCT FROM ${sqlString(evaluation.scope.currentStateCutoff)}`,
    `evidence_status = ${sqlString(evaluation.evidenceStatus)}`,
    `evidence_maturity IS NOT DISTINCT FROM ${sqlString(evaluation.evidenceMaturity)}`,
    `confidence = ${sqlString(evaluation.confidence)}`,
    `evidence_cutoff_at = ${sqlString(evaluation.evidenceCutoffAt)}`,
    `release_context = ${sqlString(evaluation.releaseContext)}`,
    `one_line_experience = ${sqlString(evaluation.oneLineExperience)}`,
    `primary_pull = ${sqlString(evaluation.primaryPull)}`,
    `primary_risk = ${sqlString(evaluation.primaryRisk)}`,
    `platform_warning IS NOT DISTINCT FROM ${sqlString(evaluation.platformWarning)}`,
    `score_provenance = ${sqlString(evaluation.scoreProvenance.kind)}`,
    `calibration_round IS NOT DISTINCT FROM ${sqlString(evaluation.scoreProvenance.round)}`,
    `provenance_note IS NOT DISTINCT FROM ${sqlString(evaluation.scoreProvenance.note)}`,
    `evidence_ledger = ${sqlString(evaluation.evidenceLedger)}`,
    `published_at IS NOT DISTINCT FROM ${
      evaluation.status === "published" || evaluation.status === "superseded"
        ? `${sqlString(evaluation.publishedAt)}::timestamptz`
        : "NULL"
    }`,
    `supersedes_evaluation_id IS NOT DISTINCT FROM ${supersedesRef}`,
    `change_summary IS NOT DISTINCT FROM ${sqlString(evaluation.changeSummary)}`,
  ].join(" AND ");
}

function emitEvaluation(
  out: string[],
  finalizers: SeedFinalizer[],
  slug: string,
  scopeKey: string,
  evaluation: Evaluation,
  /**
   * The evaluation this one declares it supersedes, already resolved from the
   * typed chain. Inferring it from sorted version numbers instead would let the
   * generator silently repair a malformed chain — writing SQL that disagrees
   * with the data it came from. Validation rejects malformed chains; the
   * generator emits exactly what it was given.
   */
  supersedes: Evaluation | null,
): void {
  if (evaluation.status === "superseded" && !evaluation.publishedAt) {
    throw new Error(
      `${slug}: superseded evaluation "${evaluation.id}" needs publishedAt so the seed can reconstruct draft -> published -> superseded history.`,
    );
  }

  const supersedesRef =
    supersedes === null
      ? "NULL"
      : evaluationRef(
          slug,
          scopeKey,
          supersedes.rubricVersion,
          supersedes.versionNumber,
        );

  out.push(
    `WITH inserted AS (INSERT INTO evaluations (game_id, scope_id, rubric_version, version_number, edition_scope, mode_scope, platform_scope, build_or_patch_scope, current_state_cutoff_at, status, evidence_status, evidence_maturity, confidence, evidence_cutoff_at, release_context, one_line_experience, primary_pull, primary_risk, platform_warning, score_provenance, calibration_round, provenance_note, evidence_ledger, published_at, supersedes_evaluation_id, change_summary) SELECT g.id, ${scopeRef(
      slug,
      scopeKey,
    )}, ${sqlString(
      evaluation.rubricVersion,
    )}, ${evaluation.versionNumber}, ${sqlString(
      evaluation.scope.edition,
    )}, ${sqlString(evaluation.scope.mode)}, ${sqlArray(
      evaluation.scope.platforms,
    )}, ${sqlString(evaluation.scope.buildOrPatch)}, ${sqlString(
      evaluation.scope.currentStateCutoff,
    )}, 'draft', ${sqlString(
      evaluation.evidenceStatus,
    )}, ${sqlString(evaluation.evidenceMaturity)}, ${sqlString(
      evaluation.confidence,
    )}, ${sqlString(evaluation.evidenceCutoffAt)}, ${sqlString(
      evaluation.releaseContext,
    )}, ${sqlString(evaluation.oneLineExperience)}, ${sqlString(
      evaluation.primaryPull,
    )}, ${sqlString(evaluation.primaryRisk)}, ${sqlString(
      evaluation.platformWarning,
    )}, ${sqlString(evaluation.scoreProvenance.kind)}, ${sqlString(
      evaluation.scoreProvenance.round,
    )}, ${sqlString(evaluation.scoreProvenance.note)}, ${sqlString(evaluation.evidenceLedger)}, NULL, ${supersedesRef}, ${sqlString(
      evaluation.changeSummary,
    )} FROM games g WHERE g.slug = ${sqlString(
      slug,
    )} ON CONFLICT (scope_id, rubric_version, version_number) DO NOTHING RETURNING id) INSERT INTO _seed_new_evaluations (evaluation_id) SELECT id FROM inserted;`,
  );

  const evalRef = evaluationRef(
    slug,
    scopeKey,
    evaluation.rubricVersion,
    evaluation.versionNumber,
  );
  const newEvaluationGuard = isNewEvaluation(evalRef);
  finalizers.push({
    evaluationRef: evalRef,
    targetStatus: evaluation.status,
    publishedAt: evaluation.publishedAt,
  });
  const compatibleStatus =
    evaluation.status === "superseded"
      ? "status IN ('published', 'superseded')"
      : `status = ${sqlString(evaluation.status)}`;
  out.push(
    `DO $seed$ BEGIN IF NOT ${newEvaluationGuard} AND NOT EXISTS (SELECT 1 FROM evaluations WHERE id = ${evalRef} AND ${compatibleStatus} AND ${evaluationSnapshotMatches(
      evaluation,
      supersedesRef,
    )}) THEN RAISE EXCEPTION 'seed snapshot mismatch for % scope % rubric % version %', ${sqlString(
      slug,
    )}, ${sqlString(scopeKey)}, ${sqlString(evaluation.rubricVersion)}, ${
      evaluation.versionNumber
    } USING ERRCODE = 'check_violation'; END IF; END $seed$;`,
  );

  // Per-dimension confidence: an editorial input, stored not derived (SOP §5).
  for (const [dimensionKey, confidence] of Object.entries(
    evaluation.dimensionConfidence,
  )) {
    out.push(
      `INSERT INTO dimension_assessments (evaluation_id, dimension_id, confidence) SELECT ${evalRef}, ${dimensionRef(
        evaluation.rubricVersion,
        dimensionKey,
      )}, ${sqlString(confidence)} WHERE ${newEvaluationGuard} ON CONFLICT DO NOTHING;`,
    );
  }

  for (const [dimensionKey, entries] of Object.entries(evaluation.dimensions)) {
    for (const [subKey, entry] of Object.entries(entries)) {
      // NULL, not 0: an unknown is the absence of a score, not a score of zero.
      const score = entry.value === UNKNOWN ? "NULL" : String(entry.value);
      const subcriterionSource = `FROM subcriteria s JOIN dimensions d ON d.id = s.dimension_id WHERE d.rubric_version = ${sqlString(
        evaluation.rubricVersion,
      )} AND d.key = ${sqlString(dimensionKey)} AND s.key = ${sqlString(
        subKey,
      )}`;
      out.push(
        `INSERT INTO subcriterion_scores (evaluation_id, subcriterion_id, score, rationale, platform_note) SELECT ${evalRef}, s.id, ${score}, ${sqlString(
          entry.rationale || null,
        )}, ${sqlString(
          entry.platformNote,
        )} ${subcriterionSource} AND ${newEvaluationGuard} ON CONFLICT DO NOTHING;`,
      );

      // Material per-platform deviations (Rubric §3). Emitted after the base
      // row, which the composite foreign key requires to exist.
      for (const override of entry.platformOverrides ?? []) {
        const overrideScore =
          override.value === UNKNOWN ? "NULL" : String(override.value);
        out.push(
          `INSERT INTO subcriterion_platform_overrides (evaluation_id, subcriterion_id, platform_id, score, rationale, evidence_confidence) SELECT ${evalRef}, s.id, (SELECT id FROM platforms WHERE slug = ${sqlString(
            override.platform,
          )}), ${overrideScore}, ${sqlString(
            override.rationale,
          )}, ${sqlString(
            override.confidence,
          )} ${subcriterionSource} AND ${newEvaluationGuard} ON CONFLICT DO NOTHING;`,
        );
      }
    }
  }

  for (const [blockType, items] of Object.entries(evaluation.blocks)) {
    items.forEach((text, index) => {
      out.push(
        `INSERT INTO profile_blocks (evaluation_id, block_type, item_order, text) SELECT ${evalRef}, ${sqlString(
          blockType,
        )}, ${index + 1}, ${sqlString(text)} WHERE ${newEvaluationGuard} ON CONFLICT DO NOTHING;`,
      );
    });
  }

  for (const tag of evaluation.tags) {
    out.push(
      `INSERT INTO evaluation_tags (evaluation_id, tag_id, intensity, note) SELECT ${evalRef}, t.id, ${sqlString(
        tag.intensity,
      )}, ${sqlString(tag.note)} FROM tags t WHERE t.key = ${sqlString(
        tag.key,
      )} AND ${newEvaluationGuard} ON CONFLICT DO NOTHING;`,
    );
  }

  for (const source of evaluation.sources) {
    out.push(
      `INSERT INTO evidence_sources (source_key, title, url, publisher, author, published_at, evidence_tier, source_category) SELECT ${sqlString(
        source.id,
      )}, ${sqlString(source.title)}, ${sqlString(source.url)}, ${sqlString(
        source.publisher,
      )}, ${sqlString(source.author)}, ${sqlString(
        source.publishedAt,
      )}, ${sqlString(source.tier)}, ${sqlString(
        source.category,
      )} WHERE ${newEvaluationGuard} ON CONFLICT (source_key) DO NOTHING;`,
    );
    out.push(
      `DO $seed$ BEGIN IF ${newEvaluationGuard} AND NOT EXISTS (SELECT 1 FROM evidence_sources WHERE source_key = ${sqlString(
        source.id,
      )} AND ${sourceMetadataMatches(
        source,
      )}) THEN RAISE EXCEPTION 'evidence source key % resolves to different metadata', ${sqlString(
        source.id,
      )} USING ERRCODE = 'check_violation'; END IF; END $seed$;`,
    );

    const platformScope = source.platformScope
      ? sqlArray(source.platformScope)
      : "NULL";

    // One link per dimension the source bears on; a single profile-level link
    // (dimension_id NULL) when it supports no particular score.
    const targets = source.supports?.length
      ? source.supports.map((key) => dimensionRef(evaluation.rubricVersion, key))
      : ["NULL"];
    for (const target of targets) {
      out.push(
        `INSERT INTO evaluation_evidence_links (evaluation_id, evidence_source_id, dimension_id, platform_scope, note) SELECT ${evalRef}, ${sourceRef(
          source.id,
        )}, ${target}, ${platformScope}, ${sqlString(
          source.note,
        )} WHERE ${newEvaluationGuard} ON CONFLICT DO NOTHING;`,
      );
    }
  }
}

export function buildSeedSql(
  profiles: readonly GameWithEvaluation[],
): string {
  const out: string[] = [];
  const finalizers: SeedFinalizer[] = [];
  const gamesBySlug = new Map<string, string>();
  const evaluationsByNaturalKey = new Set<string>();
  const sourcesByKey = new Map<string, string>();
  /** Scope natural key (`slug\0key`) -> the record that claimed it. */
  const scopesByNaturalKey = new Set<string>();
  /** Scope id -> natural key, so one id cannot describe two scopes. */
  const scopeIdOwners = new Map<string, string>();
  /** Every scope key declared per game, for the orphan check emitted below. */
  const scopeKeysByGame = new Map<string, string[]>();

  // Validate database identities across the whole corpus. Record-local checks
  // cannot detect two games or sources that claim the same global key with
  // different metadata, leaving insertion order to choose which truth wins.
  for (const record of profiles) {
    assertValidGameRecord(record);

    const gameSignature = JSON.stringify(record.game);
    const existingGame = gamesBySlug.get(record.game.slug);
    if (existingGame !== undefined && existingGame !== gameSignature) {
      throw new Error(
        `Game slug "${record.game.slug}" has conflicting metadata in the seed corpus.`,
      );
    }
    gamesBySlug.set(record.game.slug, gameSignature);

    // Scope identity across the whole corpus. A record-local check cannot see
    // that two records of one game claim the same scope key — which makes them
    // the same series, silently competing for its one published row — or that
    // one scope id has been pasted onto two different scopes.
    const scopeNaturalKey = `${record.game.slug} ${record.scope.key}`;
    if (scopesByNaturalKey.has(scopeNaturalKey)) {
      throw new Error(
        `${record.game.slug}: profile scope "${record.scope.key}" appears in more than one seed record. Two current profiles of one game need two distinct scope keys.`,
      );
    }
    scopesByNaturalKey.add(scopeNaturalKey);

    const scopeIdOwner = scopeIdOwners.get(record.scope.id);
    if (scopeIdOwner !== undefined && scopeIdOwner !== scopeNaturalKey) {
      throw new Error(
        `Profile scope id "${record.scope.id}" is used by two different scopes in the seed corpus.`,
      );
    }
    scopeIdOwners.set(record.scope.id, scopeNaturalKey);
    scopeKeysByGame.set(record.game.slug, [
      ...(scopeKeysByGame.get(record.game.slug) ?? []),
      record.scope.key,
    ]);

    for (const evaluation of [
      ...(record.history ?? []),
      record.evaluation,
    ]) {
      // Keyed on the scope, not the game: version 1 of Survival and version 1
      // of Wintermute are different evaluations and must both be seedable.
      const naturalKey = `${record.scope.id}\u0000${evaluation.rubricVersion}\u0000${evaluation.versionNumber}`;
      if (evaluationsByNaturalKey.has(naturalKey)) {
        throw new Error(
          `${record.game.slug} › ${record.scope.key}: rubric ${evaluation.rubricVersion} version ${evaluation.versionNumber} appears in more than one seed record.`,
        );
      }
      evaluationsByNaturalKey.add(naturalKey);

      for (const source of evaluation.sources) {
        const signature = sourceMetadataSignature(source);
        const existingSource = sourcesByKey.get(source.id);
        if (existingSource !== undefined && existingSource !== signature) {
          throw new Error(
            `Evidence source key "${source.id}" has conflicting metadata in the seed corpus.`,
          );
        }
        sourcesByKey.set(source.id, signature);
      }
    }
  }

  out.push("-- GENERATED FILE — do not edit by hand.");
  out.push("-- Regenerate with: npm run db:seed-sql > lib/db/seed.sql");
  out.push("-- Source of truth: content/games/*.ts");
  out.push("--");
  out.push("-- Every statement is idempotent: re-running this file is a no-op.");
  out.push("BEGIN;");
  out.push(
    "CREATE TEMP TABLE _seed_new_evaluations (evaluation_id uuid PRIMARY KEY) ON COMMIT DROP;",
  );
  out.push("");

  // -- Rubric ---------------------------------------------------------------
  out.push(`-- Rubric v${RUBRIC_V1.version}`);
  for (const dimension of RUBRIC_V1.dimensions) {
    const radarOrder = RUBRIC_V1.radarOrder.indexOf(dimension.key) + 1;
    out.push(
      `INSERT INTO dimensions (rubric_version, key, name, description, display_order, radar_order) SELECT ${sqlString(
        RUBRIC_V1.version,
      )}, ${sqlString(dimension.key)}, ${sqlString(
        dimension.name,
      )}, ${sqlString(dimension.coreQuestion)}, ${
        dimension.displayOrder
      }, ${radarOrder} WHERE NOT EXISTS (SELECT 1 FROM dimensions WHERE rubric_version = ${sqlString(
        RUBRIC_V1.version,
      )} AND key = ${sqlString(
        dimension.key,
      )}) ON CONFLICT (rubric_version, key) DO NOTHING;`,
    );
    for (const sub of dimension.subcriteria) {
      out.push(
        `INSERT INTO subcriteria (dimension_id, key, name, description, display_order) SELECT id, ${sqlString(
          sub.key,
        )}, ${sqlString(sub.name)}, ${sqlString(sub.description)}, ${
          sub.displayOrder
        } FROM dimensions WHERE rubric_version = ${sqlString(
          RUBRIC_V1.version,
        )} AND key = ${sqlString(
          dimension.key,
        )} AND NOT EXISTS (SELECT 1 FROM subcriteria existing WHERE existing.dimension_id = dimensions.id AND existing.key = ${sqlString(
          sub.key,
        )}) ON CONFLICT (dimension_id, key) DO NOTHING;`,
      );
    }
  }
  out.push("");

  // -- Tag vocabulary -------------------------------------------------------
  out.push("-- Controlled experience-tag vocabulary");
  for (const tag of TAGS) {
    out.push(
      `INSERT INTO tags (key, label, category, description, value_type) VALUES (${sqlString(
        tag.key,
      )}, ${sqlString(tag.label)}, ${sqlString(tag.category)}, ${sqlString(
        tag.description,
      )}, ${sqlString(tag.valueType)}) ON CONFLICT (key) DO NOTHING;`,
    );
  }
  out.push("");

  // -- Calibration rounds ---------------------------------------------------
  //
  // A registry, so conducting Round 3 is an entry here rather than a schema
  // migration. Insert-if-absent rather than upsert: a round's label appears on
  // every profile citing it, and the database freezes it on first final use.
  out.push("-- Calibration rounds");
  for (const round of CALIBRATION_ROUND_LIST) {
    out.push(
      `INSERT INTO calibration_rounds (key, label, conducted_at, report_reference) VALUES (${sqlString(
        round.key,
      )}, ${sqlString(round.label)}, ${sqlString(
        round.conductedAt,
      )}, ${sqlString(round.reportReference)}) ON CONFLICT (key) DO NOTHING;`,
    );
  }
  out.push("");

  // -- Platforms ------------------------------------------------------------
  const platforms = new Map<string, string>();
  for (const { game } of profiles) {
    for (const platform of game.platforms) {
      const existingName = platforms.get(platform.slug);
      if (existingName !== undefined && existingName !== platform.name) {
        throw new Error(
          `Platform slug "${platform.slug}" is named both "${existingName}" and "${platform.name}".`,
        );
      }
      platforms.set(platform.slug, platform.name);
    }
  }
  out.push("-- Platforms");
  for (const [slug, name] of platforms) {
    out.push(
      `INSERT INTO platforms (slug, name) VALUES (${sqlString(
        slug,
      )}, ${sqlString(name)}) ON CONFLICT (slug) DO NOTHING;`,
    );
  }
  out.push("");

  // -- Games and evaluations ------------------------------------------------
  for (const record of profiles) {
    const { game, evaluation } = record;
    const history = [...(record.history ?? [])].sort(
      (a, b) => a.versionNumber - b.versionNumber,
    );

    out.push(`-- ${game.canonicalTitle}`);
    out.push(
      `INSERT INTO games (slug, canonical_title, summary, developer_text, publisher_text, first_release_date, release_status) VALUES (${sqlString(
        game.slug,
      )}, ${sqlString(game.canonicalTitle)}, ${sqlString(
        game.summary,
      )}, ${sqlString(game.developerText)}, ${sqlString(
        game.publisherText,
      )}, ${sqlString(game.firstReleaseDate)}, ${sqlString(
        game.releaseStatus,
      )}) ON CONFLICT (slug) DO NOTHING;`,
    );

    for (const platform of game.platforms) {
      out.push(
        `INSERT INTO game_platforms (game_id, platform_id) SELECT g.id, p.id FROM games g, platforms p WHERE g.slug = ${sqlString(
          game.slug,
        )} AND p.slug = ${sqlString(
          platform.slug,
        )} ON CONFLICT DO NOTHING;`,
      );
    }
    for (const alias of game.aliases) {
      out.push(
        `INSERT INTO game_aliases (game_id, alias, alias_type) SELECT id, ${sqlString(
          alias,
        )}, 'common' FROM games WHERE slug = ${sqlString(
          game.slug,
        )} ON CONFLICT DO NOTHING;`,
      );
    }

    /*
     * Artwork, where the game has any. No seeded game does, so this emits
     * nothing today and the artless composition is what production renders.
     *
     * The record travels with its clearance and basis, never as a bare URL:
     * a URL alone says an image is reachable and nothing about whether it may
     * be shown (ADR 0011). Validation has already refused any record that is
     * not cleared for production, because a fixture ships in the production
     * bundle whether or not anything renders it.
     */
    const artwork = game.artwork;
    if (artwork) {
      for (const [role, image] of [
        ["cover", artwork.cover],
        ["hero", artwork.hero],
      ] as const) {
        if (!image) continue;
        out.push(
          `INSERT INTO game_artwork (game_id, role, url, width, height, alt_text, focus, source, external_id, clearance, basis, credit, source_page, retrieved_at) SELECT id, ${sqlString(
            role,
          )}, ${sqlString(image.url)}, ${image.width}, ${
            image.height
          }, ${sqlString(image.alt)}, ${sqlString(image.focus)}, ${sqlString(
            artwork.source,
          )}, ${sqlString(artwork.externalId)}, ${sqlString(
            artwork.clearance,
          )}, ${sqlString(artwork.basis)}, ${sqlString(
            artwork.credit ?? game.publisherText,
          )}, ${sqlString(artwork.sourcePage)}, ${sqlString(
            artwork.retrieved,
          )} FROM games WHERE slug = ${sqlString(
            game.slug,
          )} ON CONFLICT (game_id, role) DO UPDATE SET url = EXCLUDED.url, width = EXCLUDED.width, height = EXCLUDED.height, alt_text = EXCLUDED.alt_text, focus = EXCLUDED.focus, source = EXCLUDED.source, external_id = EXCLUDED.external_id, clearance = EXCLUDED.clearance, basis = EXCLUDED.basis, credit = EXCLUDED.credit, source_page = EXCLUDED.source_page, retrieved_at = EXCLUDED.retrieved_at;`,
        );
      }
    }

    /*
     * The profile scope, upserted rather than inserted-if-absent.
     *
     * `key` is identity and is matched on; label, summary and ordering are
     * ordinary editorial metadata, so the fixture stays authoritative for them.
     * That is deliberately unlike an evaluation snapshot: renaming a scope from
     * "Story mode" to "Wintermute" rewrites no published judgement, whereas
     * changing a published score would. It also converges an upgraded database,
     * whose scopes were named by migration 0003, onto the authored values.
     */
    out.push(
      `INSERT INTO profile_scopes (game_id, key, label, summary, display_order) SELECT g.id, ${sqlString(
        record.scope.key,
      )}, ${sqlString(record.scope.label)}, ${sqlString(
        record.scope.summary,
      )}, ${record.scope.displayOrder} FROM games g WHERE g.slug = ${sqlString(
        game.slug,
      )} ON CONFLICT (game_id, key) DO UPDATE SET label = EXCLUDED.label, summary = EXCLUDED.summary, display_order = EXCLUDED.display_order;`,
    );

    // Oldest first, so each evaluation's predecessor already exists when the
    // supersedes_evaluation_id subquery resolves. The link itself comes from
    // the declared data, not from position in this list — validation has
    // already proved the two agree.
    const chain = [...history, evaluation].sort(
      (a, b) => a.versionNumber - b.versionNumber,
    );
    const byId = new Map(chain.map((e) => [e.id, e]));

    for (const link of chain) {
      const supersedes = link.supersedesEvaluationId
        ? (byId.get(link.supersedesEvaluationId) ?? null)
        : null;
      if (link.supersedesEvaluationId && !supersedes) {
        // Unreachable: assertValidGameRecord rejects a dangling link above.
        // Throwing rather than emitting NULL keeps a silent repair impossible.
        throw new Error(
          `${game.slug}: evaluation "${link.id}" supersedes unknown "${link.supersedesEvaluationId}".`,
        );
      }
      emitEvaluation(
        out,
        finalizers,
        game.slug,
        record.scope.key,
        link,
        supersedes,
      );
    }

    out.push("");
  }

  /*
   * No evaluation of a seeded game may sit on a scope this corpus does not
   * declare.
   *
   * Renaming a scope key in a fixture is the dangerous edit: the seed would
   * create a *new* series, insert version 1 into it, and publish it alongside
   * the original — two live profiles for one experience, neither obviously
   * wrong, and the immutability triggers would freeze both. The scope key is
   * identity, so a rename is a migration rather than a content edit.
   *
   * The check cannot distinguish that from a scope legitimately added outside
   * the fixtures, so it names both readings and refuses either way. Failing
   * loudly is the right default here: the alternative is publishing a second
   * profile for one experience and finding out later.
   *
   * Scoped to games this corpus owns, so an editor adding a new *game* is
   * unaffected.
   */
  out.push("-- Every seeded evaluation still belongs to a declared scope.");
  for (const [slug, keys] of scopeKeysByGame) {
    out.push(
      `DO $seed$ BEGIN IF EXISTS (SELECT 1 FROM evaluations e JOIN games g ON g.id = e.game_id JOIN profile_scopes ps ON ps.id = e.scope_id WHERE g.slug = ${sqlString(
        slug,
      )} AND ps.key <> ALL (${sqlArray(
        keys,
      )})) THEN RAISE EXCEPTION 'game % has evaluations on a profile scope this seed does not declare. Either a scope key was renamed in the fixtures — which is a migration, not a content edit, because the key is the series identity — or a scope was added outside them and needs declaring here.', ${sqlString(
        slug,
      )} USING ERRCODE = 'check_violation'; END IF; END $seed$;`,
    );
  }
  out.push("");

  out.push(
    "-- Finalize new rows; an existing published predecessor may make the one allowed transition to superseded.",
  );
  for (const finalizer of finalizers) {
    const guard = isNewEvaluation(finalizer.evaluationRef);
    if (finalizer.targetStatus === "published") {
      out.push(
        `UPDATE evaluations SET status = 'published', published_at = ${sqlString(
          finalizer.publishedAt,
        )}::timestamptz WHERE id = ${finalizer.evaluationRef} AND ${guard};`,
      );
    } else if (finalizer.targetStatus === "superseded") {
      out.push(
        `UPDATE evaluations SET status = 'published', published_at = ${sqlString(
          finalizer.publishedAt,
        )}::timestamptz WHERE id = ${finalizer.evaluationRef} AND ${guard};`,
      );
      out.push(
        `UPDATE evaluations SET status = 'superseded' WHERE id = ${finalizer.evaluationRef} AND status = 'published';`,
      );
    } else if (finalizer.targetStatus === "review") {
      out.push(
        `UPDATE evaluations SET status = 'review' WHERE id = ${finalizer.evaluationRef} AND ${guard};`,
      );
    }
  }
  out.push("COMMIT;");
  return out.join("\n") + "\n";
}
