import { RUBRIC_V1, UNKNOWN } from "@/lib/rubric";
import { TAGS } from "@/lib/rubric/tags";
import type { Evaluation, GameWithEvaluation } from "@/lib/profile/types";
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

function evaluationRef(slug: string, versionNumber: number): string {
  return `(SELECT e.id FROM evaluations e JOIN games g ON g.id = e.game_id WHERE g.slug = ${sqlString(
    slug,
  )} AND e.version_number = ${versionNumber})`;
}

function sourceRef(sourceKey: string): string {
  return `(SELECT id FROM evidence_sources WHERE source_key = ${sqlString(
    sourceKey,
  )})`;
}

function emitEvaluation(
  out: string[],
  slug: string,
  evaluation: Evaluation,
  supersedesVersion: number | null,
): void {
  const supersedes =
    supersedesVersion === null ? "NULL" : evaluationRef(slug, supersedesVersion);

  out.push(
    `INSERT INTO evaluations (game_id, rubric_version, version_number, edition_scope, mode_scope, platform_scope, build_or_patch_scope, current_state_cutoff_at, status, evidence_status, evidence_maturity, confidence, evidence_cutoff_at, release_context, one_line_experience, primary_pull, primary_risk, platform_warning, score_provenance, provenance_note, evidence_ledger, published_at, supersedes_evaluation_id, change_summary) SELECT g.id, ${sqlString(
      evaluation.rubricVersion,
    )}, ${evaluation.versionNumber}, ${sqlString(
      evaluation.scope.edition,
    )}, ${sqlString(evaluation.scope.mode)}, ${sqlArray(
      evaluation.scope.platforms,
    )}, ${sqlString(evaluation.scope.buildOrPatch)}, ${sqlString(
      evaluation.scope.currentStateCutoff,
    )}, ${sqlString(evaluation.status)}, ${sqlString(
      evaluation.evidenceStatus,
    )}, ${sqlString(evaluation.evidenceMaturity)}, ${sqlString(
      evaluation.confidence,
    )}, ${sqlString(evaluation.evidenceCutoffAt)}, ${sqlString(
      evaluation.releaseContext,
    )}, ${sqlString(evaluation.oneLineExperience)}, ${sqlString(
      evaluation.primaryPull,
    )}, ${sqlString(evaluation.primaryRisk)}, ${sqlString(
      evaluation.platformWarning,
    )}, ${sqlString(evaluation.scoreProvenance)}, ${sqlString(
      evaluation.provenanceNote,
    )}, ${sqlString(evaluation.evidenceLedger)}, ${
      evaluation.publishedAt
        ? `${sqlString(evaluation.publishedAt)}::timestamptz`
        : "NULL"
    }, ${supersedes}, ${sqlString(
      evaluation.changeSummary,
    )} FROM games g WHERE g.slug = ${sqlString(
      slug,
    )} ON CONFLICT (game_id, rubric_version, version_number) DO NOTHING;`,
  );

  const evalRef = evaluationRef(slug, evaluation.versionNumber);

  // Per-dimension confidence: an editorial input, stored not derived (SOP §5).
  for (const [dimensionKey, confidence] of Object.entries(
    evaluation.dimensionConfidence,
  )) {
    out.push(
      `INSERT INTO dimension_assessments (evaluation_id, dimension_id, confidence) VALUES (${evalRef}, ${dimensionRef(
        evaluation.rubricVersion,
        dimensionKey,
      )}, ${sqlString(confidence)}) ON CONFLICT DO NOTHING;`,
    );
  }

  for (const [dimensionKey, entries] of Object.entries(evaluation.dimensions)) {
    for (const [subKey, entry] of Object.entries(entries)) {
      // NULL, not 0: an unknown is the absence of a score, not a score of zero.
      const score = entry.value === UNKNOWN ? "NULL" : String(entry.value);
      out.push(
        `INSERT INTO subcriterion_scores (evaluation_id, subcriterion_id, score, rationale, platform_note) SELECT ${evalRef}, s.id, ${score}, ${sqlString(
          entry.rationale || null,
        )}, ${sqlString(
          entry.platformNote,
        )} FROM subcriteria s JOIN dimensions d ON d.id = s.dimension_id WHERE d.rubric_version = ${sqlString(
          evaluation.rubricVersion,
        )} AND d.key = ${sqlString(dimensionKey)} AND s.key = ${sqlString(
          subKey,
        )} ON CONFLICT DO NOTHING;`,
      );
    }
  }

  for (const [blockType, items] of Object.entries(evaluation.blocks)) {
    items.forEach((text, index) => {
      out.push(
        `INSERT INTO profile_blocks (evaluation_id, block_type, item_order, text) VALUES (${evalRef}, ${sqlString(
          blockType,
        )}, ${index + 1}, ${sqlString(text)}) ON CONFLICT DO NOTHING;`,
      );
    });
  }

  for (const tag of evaluation.tags) {
    out.push(
      `INSERT INTO evaluation_tags (evaluation_id, tag_id, intensity, note) SELECT ${evalRef}, t.id, ${sqlString(
        tag.intensity,
      )}, ${sqlString(tag.note)} FROM tags t WHERE t.key = ${sqlString(
        tag.key,
      )} ON CONFLICT DO NOTHING;`,
    );
  }

  for (const source of evaluation.sources) {
    out.push(
      `INSERT INTO evidence_sources (source_key, title, url, publisher, author, published_at, evidence_tier, source_category) VALUES (${sqlString(
        source.id,
      )}, ${sqlString(source.title)}, ${sqlString(source.url)}, ${sqlString(
        source.publisher,
      )}, ${sqlString(source.author)}, ${sqlString(
        source.publishedAt,
      )}, ${sqlString(source.tier)}, ${sqlString(
        source.category,
      )}) ON CONFLICT (source_key) DO NOTHING;`,
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
        `INSERT INTO evaluation_evidence_links (evaluation_id, evidence_source_id, dimension_id, platform_scope, note) VALUES (${evalRef}, ${sourceRef(
          source.id,
        )}, ${target}, ${platformScope}, ${sqlString(
          source.note,
        )}) ON CONFLICT DO NOTHING;`,
      );
    }
  }
}

export function buildSeedSql(
  profiles: readonly GameWithEvaluation[],
): string {
  const out: string[] = [];

  out.push("-- GENERATED FILE — do not edit by hand.");
  out.push("-- Regenerate with: npm run db:seed-sql > lib/db/seed.sql");
  out.push("-- Source of truth: content/games/*.ts");
  out.push("--");
  out.push("-- Every statement is idempotent: re-running this file is a no-op.");
  out.push("BEGIN;");
  out.push("");

  // -- Rubric ---------------------------------------------------------------
  out.push(`-- Rubric v${RUBRIC_V1.version}`);
  for (const dimension of RUBRIC_V1.dimensions) {
    const radarOrder = RUBRIC_V1.radarOrder.indexOf(dimension.key) + 1;
    out.push(
      `INSERT INTO dimensions (rubric_version, key, name, description, display_order, radar_order) VALUES (${sqlString(
        RUBRIC_V1.version,
      )}, ${sqlString(dimension.key)}, ${sqlString(
        dimension.name,
      )}, ${sqlString(dimension.coreQuestion)}, ${
        dimension.displayOrder
      }, ${radarOrder}) ON CONFLICT (rubric_version, key) DO NOTHING;`,
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
        )} ON CONFLICT (dimension_id, key) DO NOTHING;`,
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

  // -- Platforms ------------------------------------------------------------
  const platforms = new Map<string, string>();
  for (const { game } of profiles) {
    for (const platform of game.platforms) {
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
    // Never emit SQL for a record that would fail the publish gate.
    assertValidGameRecord(record);

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

    // Oldest first, so each evaluation's predecessor already exists when the
    // supersedes_evaluation_id subquery resolves.
    let previousVersion: number | null = null;
    for (const superseded of history) {
      emitEvaluation(out, game.slug, superseded, previousVersion);
      previousVersion = superseded.versionNumber;
    }
    emitEvaluation(out, game.slug, evaluation, previousVersion);

    out.push("");
  }

  out.push("COMMIT;");
  return out.join("\n") + "\n";
}
