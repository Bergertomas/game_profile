/**
 * Generate seed SQL from the same typed fixtures the site renders.
 *
 * The vertical slice reads fixtures; the schema in lib/db/schema.ts is real but
 * not yet connected. This script is the bridge that stops the two from drifting:
 * the database is seeded from the fixtures, not from a hand-written copy.
 *
 *   npm run db:seed-sql > lib/db/seed.sql
 */
import { SEED_PROFILES } from "@/content";
import { RUBRIC_V1, UNKNOWN } from "@/lib/rubric";
import { TAGS } from "@/lib/rubric/tags";
import { assertValidEvaluation } from "@/lib/validation/evaluation";

const out: string[] = [];

function q(value: string | null | undefined): string {
  if (value === null || value === undefined) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function arr(values: readonly string[]): string {
  return `ARRAY[${values.map(q).join(", ")}]`;
}

out.push("-- GENERATED FILE — do not edit by hand.");
out.push("-- Regenerate with: npm run db:seed-sql > lib/db/seed.sql");
out.push("-- Source of truth: content/games/*.ts");
out.push("BEGIN;");
out.push("");

// -- Rubric -------------------------------------------------------------------
out.push("-- Rubric v" + RUBRIC_V1.version);
for (const dimension of RUBRIC_V1.dimensions) {
  const radarOrder = RUBRIC_V1.radarOrder.indexOf(dimension.key) + 1;
  out.push(
    `INSERT INTO dimensions (rubric_version, key, name, description, display_order, radar_order) VALUES (${q(
      RUBRIC_V1.version,
    )}, ${q(dimension.key)}, ${q(dimension.name)}, ${q(
      dimension.coreQuestion,
    )}, ${dimension.displayOrder}, ${radarOrder}) ON CONFLICT (rubric_version, key) DO NOTHING;`,
  );
  for (const sub of dimension.subcriteria) {
    out.push(
      `INSERT INTO subcriteria (dimension_id, key, name, description, display_order) SELECT id, ${q(
        sub.key,
      )}, ${q(sub.name)}, ${q(sub.description)}, ${sub.displayOrder} FROM dimensions WHERE rubric_version = ${q(
        RUBRIC_V1.version,
      )} AND key = ${q(dimension.key)} ON CONFLICT (dimension_id, key) DO NOTHING;`,
    );
  }
}
out.push("");

// -- Tag vocabulary -----------------------------------------------------------
out.push("-- Controlled experience-tag vocabulary");
for (const tag of TAGS) {
  out.push(
    `INSERT INTO tags (key, label, category, description, value_type) VALUES (${q(
      tag.key,
    )}, ${q(tag.label)}, ${q(tag.category)}, ${q(tag.description)}, ${q(
      tag.valueType,
    )}) ON CONFLICT (key) DO NOTHING;`,
  );
}
out.push("");

// -- Platforms ----------------------------------------------------------------
const platforms = new Map<string, string>();
for (const { game } of SEED_PROFILES) {
  for (const platform of game.platforms) platforms.set(platform.slug, platform.name);
}
out.push("-- Platforms");
for (const [slug, name] of platforms) {
  out.push(
    `INSERT INTO platforms (slug, name) VALUES (${q(slug)}, ${q(name)}) ON CONFLICT (slug) DO NOTHING;`,
  );
}
out.push("");

// -- Games and evaluations ----------------------------------------------------
for (const record of SEED_PROFILES) {
  // Never emit SQL for an evaluation that would fail the publish gate.
  assertValidEvaluation(record.evaluation);

  const { game, evaluation } = record;
  out.push(`-- ${game.canonicalTitle}`);
  out.push(
    `INSERT INTO games (slug, canonical_title, summary, developer_text, publisher_text, first_release_date, release_status) VALUES (${q(
      game.slug,
    )}, ${q(game.canonicalTitle)}, ${q(game.summary)}, ${q(
      game.developerText,
    )}, ${q(game.publisherText)}, ${q(game.firstReleaseDate)}, ${q(
      game.releaseStatus,
    )}) ON CONFLICT (slug) DO NOTHING;`,
  );

  for (const platform of game.platforms) {
    out.push(
      `INSERT INTO game_platforms (game_id, platform_id) SELECT g.id, p.id FROM games g, platforms p WHERE g.slug = ${q(
        game.slug,
      )} AND p.slug = ${q(platform.slug)} ON CONFLICT DO NOTHING;`,
    );
  }
  for (const alias of game.aliases) {
    out.push(
      `INSERT INTO game_aliases (game_id, alias, alias_type) SELECT id, ${q(
        alias,
      )}, 'common' FROM games WHERE slug = ${q(game.slug)} ON CONFLICT DO NOTHING;`,
    );
  }

  out.push(
    `INSERT INTO evaluations (game_id, rubric_version, version_number, edition_scope, mode_scope, platform_scope, build_or_patch_scope, current_state_cutoff_at, status, evidence_status, confidence, evidence_cutoff_at, release_context, one_line_experience, primary_pull, primary_risk, platform_warning, score_provenance, provenance_note, published_at, change_summary) SELECT id, ${q(
      evaluation.rubricVersion,
    )}, ${evaluation.versionNumber}, ${q(evaluation.scope.edition)}, ${q(
      evaluation.scope.mode,
    )}, ${arr(evaluation.scope.platforms)}, ${q(
      evaluation.scope.buildOrPatch,
    )}, ${q(evaluation.scope.currentStateCutoff)}, ${q(evaluation.status)}, ${q(
      evaluation.evidenceStatus,
    )}, ${q(evaluation.confidence)}, ${q(evaluation.evidenceCutoffAt)}, ${q(
      evaluation.releaseContext,
    )}, ${q(evaluation.oneLineExperience)}, ${q(evaluation.primaryPull)}, ${q(
      evaluation.primaryRisk,
    )}, ${q(evaluation.platformWarning)}, ${q(evaluation.scoreProvenance)}, ${q(
      evaluation.provenanceNote,
    )}, ${evaluation.publishedAt ? `${q(evaluation.publishedAt)}::timestamptz` : "NULL"}, ${q(
      evaluation.changeSummary,
    )} FROM games WHERE slug = ${q(game.slug)};`,
  );

  const evalRef = `(SELECT e.id FROM evaluations e JOIN games g ON g.id = e.game_id WHERE g.slug = ${q(
    game.slug,
  )} AND e.version_number = ${evaluation.versionNumber})`;

  for (const [dimensionKey, entries] of Object.entries(evaluation.dimensions)) {
    for (const [subKey, entry] of Object.entries(entries)) {
      // NULL, not 0: an unknown is the absence of a score, not a score of zero.
      const score = entry.value === UNKNOWN ? "NULL" : String(entry.value);
      out.push(
        `INSERT INTO subcriterion_scores (evaluation_id, subcriterion_id, score, rationale, platform_note) SELECT ${evalRef}, s.id, ${score}, ${q(
          entry.rationale || null,
        )}, ${q(entry.platformNote)} FROM subcriteria s JOIN dimensions d ON d.id = s.dimension_id WHERE d.rubric_version = ${q(
          evaluation.rubricVersion,
        )} AND d.key = ${q(dimensionKey)} AND s.key = ${q(subKey)};`,
      );
    }
  }

  for (const [blockType, items] of Object.entries(evaluation.blocks)) {
    items.forEach((text, index) => {
      out.push(
        `INSERT INTO profile_blocks (evaluation_id, block_type, item_order, text) VALUES (${evalRef}, ${q(
          blockType,
        )}, ${index + 1}, ${q(text)});`,
      );
    });
  }

  for (const tag of evaluation.tags) {
    out.push(
      `INSERT INTO evaluation_tags (evaluation_id, tag_id, intensity, note) SELECT ${evalRef}, id, ${q(
        tag.intensity,
      )}, ${q(tag.note)} FROM tags WHERE key = ${q(tag.key)};`,
    );
  }

  for (const source of evaluation.sources) {
    out.push(
      `INSERT INTO evidence_sources (title, url, publisher, author, published_at, evidence_tier) VALUES (${q(
        source.title,
      )}, ${q(source.url)}, ${q(source.publisher)}, ${q(source.author)}, ${q(
        source.publishedAt,
      )}, ${q(source.tier)});`,
    );
    out.push(
      `INSERT INTO evaluation_evidence_links (evaluation_id, evidence_source_id, note) SELECT ${evalRef}, id, ${q(
        source.note,
      )} FROM evidence_sources WHERE title = ${q(source.title)};`,
    );
  }
  out.push("");
}

out.push("COMMIT;");

process.stdout.write(out.join("\n") + "\n");
