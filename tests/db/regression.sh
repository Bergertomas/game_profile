#!/usr/bin/env bash
#
# Real-Postgres regression suite for the database contract.
#
#   DATABASE_URL=postgres://user@host:port/game_profile_test \
#     CONFIRM_DATABASE_RESET=game_profile_test tests/db/regression.sh
#
# The database named in DATABASE_URL is DROPPED and recreated. A derived
# `${DB_NAME}_upgrade_ci` database is also created temporarily to exercise the
# in-place upgrade path, then force-dropped by an EXIT trap. The two guards below
# are intentionally redundant: the primary name must end in `_test` or `_ci`,
# and CONFIRM_DATABASE_RESET must repeat that exact name.

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is not set}"

DATABASE_BASE="${DATABASE_URL%%\?*}"
DATABASE_QUERY=""
if [[ "$DATABASE_URL" == *\?* ]]; then
  DATABASE_QUERY="?${DATABASE_URL#*\?}"
fi

DB_NAME="$(basename "$DATABASE_BASE")"

case "$DB_NAME" in
  *_test|*_ci) ;;
  *)
    printf 'Refusing to reset database "%s": its name must end in _test or _ci.\n' "$DB_NAME" >&2
    exit 64
    ;;
esac

if [[ ! "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]]; then
  printf 'Refusing to reset database "%s": use only letters, numbers and underscores.\n' "$DB_NAME" >&2
  exit 64
fi

if [[ "${CONFIRM_DATABASE_RESET:-}" != "$DB_NAME" ]]; then
  printf 'Refusing to reset database "%s". Set CONFIRM_DATABASE_RESET=%s to confirm.\n' \
    "$DB_NAME" "$DB_NAME" >&2
  exit 64
fi

if ! command -v psql >/dev/null 2>&1; then
  printf 'psql is required to run the database regression suite.\n' >&2
  exit 69
fi

ADMIN_URL="${DATABASE_BASE%/*}/postgres${DATABASE_QUERY}"
UPGRADE_DB_NAME="${DB_NAME}_upgrade_ci"
if (( ${#UPGRADE_DB_NAME} > 63 )); then
  printf 'Refusing derived upgrade database "%s": PostgreSQL identifiers are limited to 63 bytes.\n' \
    "$UPGRADE_DB_NAME" >&2
  exit 64
fi
UPGRADE_DATABASE_URL="${DATABASE_BASE%/*}/${UPGRADE_DB_NAME}${DATABASE_QUERY}"
RACE_TMP=''

cleanup_regression_artifacts() {
  local background_pid
  for background_pid in "${child_publish_pid:-}" "${rubric_publish_pid:-}" \
                        "${parallel_publish_pid:-}"; do
    if [[ -n "$background_pid" ]] && kill -0 "$background_pid" 2>/dev/null; then
      kill "$background_pid" 2>/dev/null || true
    fi
  done
  if [[ -n "${RACE_TMP:-}" ]]; then
    rm -f "$RACE_TMP/child-publish.out" "$RACE_TMP/rubric-publish.out" \
          "$RACE_TMP/parallel-publish.out"
    rmdir "$RACE_TMP" 2>/dev/null || true
  fi
  psql "$ADMIN_URL" -X -q \
    -c "DROP DATABASE IF EXISTS \"$UPGRADE_DB_NAME\" WITH (FORCE);" \
    >/dev/null 2>&1 || true
}
trap cleanup_regression_artifacts EXIT

pass=0
fail=0

first_line() {
  printf '%s\n' "$1" | sed -n '/./{p;q;}'
}

# Run SQL in its own transaction and assert that it is rejected. Errors may be
# immediate (FK/check/BEFORE trigger) or deferred until COMMIT.
reject() {
  local label="$1" sql="$2" want="${3:-}" out
  if out="$(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q \
      -c 'BEGIN;' -c "$sql" -c 'COMMIT;' 2>&1)"; then
    printf '  FAIL  %s - accepted, expected rejection\n' "$label"
    fail=$((fail + 1))
    return
  fi
  if [[ -n "$want" && "$out" != *"$want"* ]]; then
    printf '  FAIL  %s - rejected for the wrong reason:\n        %s\n' \
      "$label" "$(first_line "$out")"
    fail=$((fail + 1))
    return
  fi
  printf '  pass  %s\n' "$label"
  pass=$((pass + 1))
}

# Assert that SQL commits successfully.
accept() {
  local label="$1" sql="$2" out
  if out="$(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q \
      -c 'BEGIN;' -c "$sql" -c 'COMMIT;' 2>&1)"; then
    printf '  pass  %s\n' "$label"
    pass=$((pass + 1))
  else
    printf '  FAIL  %s - rejected, expected success:\n        %s\n' \
      "$label" "$(first_line "$out")"
    fail=$((fail + 1))
  fi
}

# Install a prerequisite fixture. A broken fixture makes all downstream
# assertions meaningless, so fail immediately instead of producing noise.
fixture() {
  local label="$1" sql="$2" out
  if out="$(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q \
      -c 'BEGIN;' -c "$sql" -c 'COMMIT;' 2>&1)"; then
    printf '  pass  %s\n' "$label"
    pass=$((pass + 1))
    return
  fi
  printf '  FAIL  %s - fixture rejected:\n        %s\n' \
    "$label" "$(first_line "$out")"
  exit 1
}

# Assert that a scalar query returns one exact value. SQL errors are failures,
# never values to be compared.
expect() {
  local label="$1" sql="$2" want="$3" out got
  if ! out="$(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q -t -A -c "$sql" 2>&1)"; then
    printf '  FAIL  %s - query failed:\n        %s\n' "$label" "$(first_line "$out")"
    fail=$((fail + 1))
    return
  fi
  got="$(printf '%s\n' "$out" | sed '/^$/d' | tail -1)"
  if [[ "$got" == "$want" ]]; then
    printf '  pass  %s (%s)\n' "$label" "$got"
    pass=$((pass + 1))
  else
    printf '  FAIL  %s - expected %s, got %s\n' "$label" "$want" "$got"
    fail=$((fail + 1))
  fi
}

# Poll until another session holds an advisory lock. The lock owner uses this
# as a transaction-ordering signal; this session only takes and immediately
# releases the lock while it is still free. The companion process PID lets us
# fail early if it exits before signaling instead of waiting on a dead process.
wait_for_advisory_lock() {
  local key="$1" companion_pid="$2" state
  local attempt
  for ((attempt = 1; attempt <= 200; attempt++)); do
    if ! kill -0 "$companion_pid" 2>/dev/null; then
      return 1
    fi
    if ! state="$(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q -t -A -c \
        "SELECT CASE WHEN pg_try_advisory_xact_lock($key) THEN 'waiting' ELSE 'held' END;")"; then
      return 1
    fi
    if [[ "$state" == 'held' ]]; then
      return 0
    fi
    sleep 0.05
  done
  return 1
}

echo '== 0. Upgrade an existing 0001 database without losing corrections =='
psql "$ADMIN_URL" -X -v ON_ERROR_STOP=1 -q \
  -c "DROP DATABASE IF EXISTS \"$UPGRADE_DB_NAME\" WITH (FORCE);" \
  -c "CREATE DATABASE \"$UPGRADE_DB_NAME\";" >/dev/null

# The FROZEN pre-0003 seed, not the current generator. The current one emits the
# post-scope shape, which a 0001 schema cannot accept — and loading it here
# would prove only that a fresh database builds, never that an existing one
# upgrades. See tests/db/fixtures/seed-pre-0003.sql.
if upgrade_out="$(
  {
    psql "$UPGRADE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -q -1 \
      -f lib/db/migrations/0000_schema.sql &&
    psql "$UPGRADE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -q -1 \
      -f lib/db/migrations/0001_contract.sql &&
    psql "$UPGRADE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -q \
      -f tests/db/fixtures/seed-pre-0003.sql
  } 2>&1
)"; then
  printf '  pass  0000 + 0001 + the frozen pre-0003 seed created the pre-hardening database\n'
  pass=$((pass + 1))
else
  printf '  FAIL  could not create the pre-hardening database:\n        %s\n' \
    "$(first_line "$upgrade_out")"
  exit 1
fi

# Recreate the exact old-main state for the three content corrections. This is
# intentionally done before 0002 freezes final history.
psql "$UPGRADE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -q -c "
  UPDATE evaluations AS evaluation
  SET mode_scope='Single-player campaign, excluding the co-op Tower of Sisyphus'
  FROM games AS game
  WHERE evaluation.game_id=game.id
    AND game.slug='returnal'
    AND evaluation.rubric_version='1.0'
    AND evaluation.version_number=1;

  UPDATE evidence_sources
  SET url=NULL,publisher=NULL,published_at=NULL
  WHERE source_key='src_returnal_update_history';

  UPDATE evaluation_evidence_links AS link
  SET note='Old main build-scope note'
  FROM evidence_sources AS source
  WHERE link.evidence_source_id=source.id
    AND source.source_key='src_returnal_update_history';

  UPDATE subcriterion_scores AS score
  SET rationale='Old main rationale incorrectly attributed Performance Mode to Update 4.'
  FROM evaluations AS evaluation
  JOIN games AS game ON game.id=evaluation.game_id
  JOIN subcriteria AS subcriterion ON subcriterion.key='technical_stability'
  JOIN dimensions AS dimension
    ON dimension.id=subcriterion.dimension_id
   AND dimension.rubric_version=evaluation.rubric_version
  WHERE score.evaluation_id=evaluation.id
    AND score.subcriterion_id=subcriterion.id
    AND game.slug='redfall'
    AND evaluation.rubric_version='1.0'
    AND evaluation.version_number=1
    AND dimension.key='execution';

  DELETE FROM evaluation_evidence_links
  WHERE evidence_source_id=(
    SELECT id FROM evidence_sources WHERE source_key='src_redfall_update_2'
  );
  DELETE FROM evidence_sources WHERE source_key='src_redfall_update_2';
" >/dev/null

if upgrade_out="$(psql "$UPGRADE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -q -1 \
    -f lib/db/migrations/0002_contract_hardening.sql 2>&1)"; then
  printf '  pass  migration 0002 upgraded and audited the existing final data\n'
  pass=$((pass + 1))
else
  printf '  FAIL  migration 0002 rejected the pre-hardening database:\n        %s\n' \
    "$(first_line "$upgrade_out")"
  exit 1
fi

# Everything after 0002, applied to that same populated database. These
# migrations restructure identity beneath published rows the 0002 triggers have
# already frozen, so "it builds an empty schema" is not evidence they work.
for later_migration in \
  lib/db/migrations/0003_profile_scopes.sql \
  lib/db/migrations/0004_platform_overrides.sql \
  lib/db/migrations/0005_score_provenance.sql \
  lib/db/migrations/0006_game_artwork.sql \
  lib/db/migrations/0007_primary_scope.sql \
  lib/db/migrations/0008_authored_ordering.sql
do
  if upgrade_out="$(psql "$UPGRADE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -q -1 \
      -f "$later_migration" 2>&1)"; then
    printf '  pass  %s upgraded the populated database\n' \
      "$(basename "$later_migration")"
    pass=$((pass + 1))
  else
    printf '  FAIL  %s rejected the populated database:\n        %s\n' \
      "$(basename "$later_migration")" "$(first_line "$upgrade_out")"
    exit 1
  fi
done

PRIMARY_DATABASE_URL="$DATABASE_URL"
DATABASE_URL="$UPGRADE_DATABASE_URL"

# The scope backfill. Existing history is preserved and attached, not rebuilt:
# the old one-series-per-game model means every evaluation a game already had
# belongs to that game's single default scope.
expect 'upgrade gives every game with evaluations exactly one default scope' \
  "SELECT concat_ws('/',
     (SELECT count(*) FROM profile_scopes),
     (SELECT count(*) FROM profile_scopes WHERE key='default'),
     (SELECT count(DISTINCT game_id) FROM evaluations));" '3/3/3'
expect 'upgrade attaches every existing evaluation to its game''s scope' \
  "SELECT count(*) FROM evaluations e
   JOIN profile_scopes ps ON ps.id=e.scope_id
   WHERE ps.game_id=e.game_id;" '3'
expect 'upgrade leaves no evaluation without a scope' \
  "SELECT count(*) FROM evaluations WHERE scope_id IS NULL;" '0'
expect 'upgrade preserves the published status of frozen history' \
  "SELECT count(*) FROM evaluations WHERE status='published';" '3'
expect 'upgrade gives every game with evaluations exactly one primary scope' \
  "SELECT concat_ws('/',
     (SELECT count(*) FROM profile_scopes WHERE is_primary),
     (SELECT count(DISTINCT game_id) FROM evaluations));" '3/3'
expect 'upgrade makes the backfilled default scope the primary one' \
  "SELECT count(*) FROM profile_scopes WHERE is_primary AND key='default';" '3'
expect 'upgrade moves Published-row uniqueness onto the scope' \
  "SELECT count(*) FROM pg_indexes
   WHERE schemaname='public'
     AND indexname='evaluations_one_published_per_scope_rubric'
     AND indexdef LIKE '%(scope_id, rubric_version)%';" '1'

# 0008 numbers tags and evidence links beneath evaluations 0002 has already
# frozen, so it is the first migration whose backfill the child-immutability
# trigger refuses outright. The first version of it did exactly that, and every
# database this repository builds from scratch migrated while empty and never
# noticed — which is what this whole section exists to prevent. The three checks
# are: it ran, it produced values, and it gave the guarantee back.
expect 'upgrade numbers every existing tag row, not just the ones it could see' \
  "SELECT count(*) FROM evaluation_tags WHERE display_order = 0;" '0'
expect 'upgrade numbers every existing evidence link' \
  "SELECT count(*) FROM evaluation_evidence_links WHERE display_order = 0;" '0'
expect 'upgrade leaves both child-immutability triggers armed' \
  "SELECT count(*) FROM pg_trigger
   WHERE tgname IN ('evaluation_tags_snapshot_immutable',
                    'evaluation_evidence_links_snapshot_immutable')
     AND tgenabled = 'O';" '2'
expect 'upgrade corrects Returnal mode scope' \
  "SELECT evaluation.mode_scope
   FROM evaluations AS evaluation
   JOIN games AS game ON game.id=evaluation.game_id
   WHERE game.slug='returnal' AND evaluation.rubric_version='1.0' AND evaluation.version_number=1;" \
  'Single-player main-game campaign, excluding co-op and the Tower of Sisyphus'
expect 'upgrade restores Returnal primary source metadata' \
  "SELECT count(*) FROM evidence_sources
   WHERE source_key='src_returnal_update_history'
     AND url='https://housemarque.com/news/2022/3/21/returnal-ascension-update'
     AND publisher='Housemarque' AND published_at='2022-03-21';" '1'
expect 'upgrade corrects the Returnal source-link explanation' \
  "SELECT count(*)
   FROM evaluation_evidence_links AS link
   JOIN evidence_sources AS source ON source.id=link.evidence_source_id
   WHERE source.source_key='src_returnal_update_history'
     AND link.note='Establishes the current-state build scope: co-op applies to the main game, while the Tower of Sisyphus is a separate single-player endless mode. Not used to judge quality.';" '1'
expect 'upgrade corrects the Redfall technical rationale' \
  "SELECT score.rationale
   FROM subcriterion_scores AS score
   JOIN evaluations AS evaluation ON evaluation.id=score.evaluation_id
   JOIN games AS game ON game.id=evaluation.game_id
   JOIN subcriteria AS subcriterion ON subcriterion.id=score.subcriterion_id
   JOIN dimensions AS dimension ON dimension.id=subcriterion.dimension_id
   WHERE game.slug='redfall' AND evaluation.rubric_version='1.0'
     AND evaluation.version_number=1 AND dimension.key='execution'
     AND subcriterion.key='technical_stability';" \
  'The final build includes the 60fps Performance Mode introduced in Update 2; Update 4 added offline play and pausing, but pop-in, traversal hitching and animation faults remain routine.'
expect 'upgrade installs the Redfall Update 2 source' \
  "SELECT count(*) FROM evidence_sources
   WHERE source_key='src_redfall_update_2'
     AND title='Game Update 2 release notes introducing Xbox Performance Mode'
     AND url='https://bethesda.net/en-US/news/redfall-game-update-2-release-notes'
     AND publisher='Bethesda Softworks' AND published_at='2023-10-06'
     AND evidence_tier='C' AND source_category='first_party';" '1'
expect 'upgrade links the Redfall Update 2 source to its final evaluation' \
  "SELECT count(*)
   FROM evaluation_evidence_links AS link
   JOIN evidence_sources AS source ON source.id=link.evidence_source_id
   JOIN evaluations AS evaluation ON evaluation.id=link.evaluation_id
   JOIN games AS game ON game.id=evaluation.game_id
   WHERE source.source_key='src_redfall_update_2' AND game.slug='redfall'
     AND evaluation.rubric_version='1.0' AND evaluation.version_number=1
     AND link.dimension_id IS NULL AND link.subcriterion_id IS NULL
     AND link.note='Establishes that the Xbox Series X|S 60fps Performance Mode arrived in Update 2, not Update 4. Used for factual update attribution, not for judging technical quality.';" '1'
DATABASE_URL="$PRIMARY_DATABASE_URL"

psql "$ADMIN_URL" -X -v ON_ERROR_STOP=1 -q \
  -c "DROP DATABASE IF EXISTS \"$UPGRADE_DB_NAME\" WITH (FORCE);" >/dev/null

echo
echo '== 1. Canonical deployment from an empty database =='
psql "$ADMIN_URL" -X -v ON_ERROR_STOP=1 -q \
  -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" \
  -c "CREATE DATABASE \"$DB_NAME\";" >/dev/null

if setup_out="$(npm run --silent db:setup 2>&1)"; then
  printf '  pass  npm run db:setup succeeded on an empty database\n'
  pass=$((pass + 1))
else
  printf '  FAIL  npm run db:setup failed:\n        %s\n' "$(first_line "$setup_out")"
  exit 1
fi

expect 'rubric registry installed' \
  "SELECT count(*) FROM rubric_versions WHERE version='1.0' AND expected_dimension_count=8 AND expected_subcriteria_per_dimension=5;" '1'
expect 'dimension_scores view installed' \
  "SELECT (to_regclass('public.dimension_scores') IS NOT NULL)::text;" 'true'
expect 'hardening triggers installed' \
  "SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgname IN (
     'evaluations_snapshot_immutable',
     'subcriterion_scores_rubric_coherent',
     'dimension_assessments_rubric_coherent',
     'evaluation_evidence_links_rubric_coherent',
     'subcriterion_scores_snapshot_immutable',
     'dimension_assessments_snapshot_immutable',
     'profile_blocks_snapshot_immutable',
     'evaluation_tags_snapshot_immutable',
     'evaluation_evidence_links_snapshot_immutable',
     'subcriterion_platform_overrides_snapshot_immutable',
     'subcriterion_platform_overrides_material',
     'evaluation_revisions_append_only',
     'rubric_versions_immutable',
     'dimensions_definition_immutable',
     'subcriteria_definition_immutable',
     'evaluations_scope_stable'
   );" '16'
expect 'final-linked evidence source protection is installed' \
  "SELECT (count(*) > 0)::text FROM pg_trigger
   WHERE NOT tgisinternal AND tgrelid='evidence_sources'::regclass;" 'true'
expect 'final-linked tag definition protection is installed' \
  "SELECT (count(*) > 0)::text FROM pg_trigger
   WHERE NOT tgisinternal AND tgrelid='tags'::regclass;" 'true'
expect 'published uniqueness is per profile scope and rubric' \
  "SELECT count(*) FROM pg_indexes
   WHERE schemaname='public'
     AND indexname='evaluations_one_published_per_scope_rubric'
     AND indexdef LIKE '%(scope_id, rubric_version)%'
     AND indexdef LIKE '%WHERE (status = ''published''%';" '1'
expect 'every seeded evaluation belongs to a scope of its own game' \
  "SELECT count(*) FROM evaluations e
   JOIN profile_scopes ps ON ps.id=e.scope_id
   WHERE ps.game_id=e.game_id;" '3'
expect 'all seeded dimensions carry a precise score' \
  'SELECT count(*) FROM dimension_scores WHERE score IS NOT NULL;' '24'

echo
echo '== 2. Seed is a genuine no-op after publication =='
before="$(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q -t -A -c \
  "SELECT concat_ws('/',
     (SELECT count(*) FROM evaluations),
     (SELECT count(*) FROM subcriterion_scores),
     (SELECT count(*) FROM dimension_assessments),
     (SELECT count(*) FROM profile_blocks),
     (SELECT count(*) FROM evaluation_tags),
     (SELECT count(*) FROM evidence_sources),
     (SELECT count(*) FROM evaluation_evidence_links));")"

if seed_out="$(npm run --silent db:seed 2>&1)" && \
   seed_out="$(npm run --silent db:seed 2>&1)"; then
  printf '  pass  two additional seed runs committed\n'
  pass=$((pass + 1))
else
  printf '  FAIL  repeat seed rejected:\n        %s\n' "$(first_line "$seed_out")"
  fail=$((fail + 1))
fi

expect 'all protected table counts remain unchanged' \
  "SELECT concat_ws('/',
     (SELECT count(*) FROM evaluations),
     (SELECT count(*) FROM subcriterion_scores),
     (SELECT count(*) FROM dimension_assessments),
     (SELECT count(*) FROM profile_blocks),
     (SELECT count(*) FROM evaluation_tags),
     (SELECT count(*) FROM evidence_sources),
     (SELECT count(*) FROM evaluation_evidence_links));" "$before"
expect 'the seed still has exactly three final evaluations' \
  "SELECT count(*) FROM evaluations WHERE status='published';" '3'

AW="(SELECT e.id FROM evaluations e JOIN games g ON g.id=e.game_id
     WHERE g.slug='alan-wake-2' AND e.rubric_version='1.0' AND e.version_number=1)"
AW_GAME="(SELECT id FROM games WHERE slug='alan-wake-2')"
REDFALL_GAME="(SELECT id FROM games WHERE slug='redfall')"
RETURNAL_GAME="(SELECT id FROM games WHERE slug='returnal')"
# Each seeded game has exactly one profile scope. Fixtures below hang off it so
# they exercise the same identity path an authored evaluation takes.
AW_SCOPE="(SELECT id FROM profile_scopes WHERE game_id=$AW_GAME AND key='default')"
REDFALL_SCOPE="(SELECT id FROM profile_scopes WHERE game_id=$REDFALL_GAME AND key='default')"
RETURNAL_SCOPE="(SELECT id FROM profile_scopes WHERE game_id=$RETURNAL_GAME AND key='default')"
SUB1="(SELECT s.id FROM subcriteria s JOIN dimensions d ON d.id=s.dimension_id
      WHERE d.rubric_version='1.0' AND d.key='atmosphere' AND s.key='memory_residue')"
SUB2="(SELECT s.id FROM subcriteria s JOIN dimensions d ON d.id=s.dimension_id
      WHERE d.rubric_version='1.0' AND d.key='atmosphere' AND s.key='mood_strength')"
DIM1="(SELECT id FROM dimensions WHERE rubric_version='1.0' AND key='atmosphere')"
SOURCE1="(SELECT id FROM evidence_sources WHERE source_key='src_aw2_critical_consensus')"

echo
echo '== 3. Rubric identity and non-vacuous publication =='
reject 'an unregistered rubric cannot be authored' \
  "INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,score_provenance,calibration_round
   ) VALUES (
     $AW_GAME,$AW_SCOPE,'missing-test-rubric',990,'test','test',ARRAY['PC'],'test','draft',
     'verified','medium','2026-08-06','calibration','round_1'
   );" \
  'evaluations_rubric_version_rubric_versions_version_fk'

reject 'a registered but empty rubric cannot be published' \
  "INSERT INTO rubric_versions (
     version,expected_dimension_count,expected_subcriteria_per_dimension,locked_at
   ) VALUES ('test-empty',1,1,'2026-08-06');
   INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,
     score_provenance,calibration_round,one_line_experience,primary_pull,primary_risk
   ) VALUES (
     $REDFALL_GAME,$REDFALL_SCOPE,'test-empty',990,'test','test',ARRAY['PC'],'test','draft',
     'verified','medium','2026-08-06','calibration','round_1','test','test','test'
   );
   UPDATE evaluations SET status='published', published_at='2026-08-06'
   WHERE game_id=$REDFALL_GAME AND rubric_version='test-empty' AND version_number=990;" \
  'rubric test-empty is incomplete'

reject 'a final snapshot cannot be inserted directly' \
  "INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,
     score_provenance,calibration_round,one_line_experience,primary_pull,primary_risk,published_at
   ) VALUES (
     $REDFALL_GAME,$REDFALL_SCOPE,'1.0',991,'test','test',ARRAY['PC'],'test','published',
     'verified','medium','2026-08-06','calibration','round_1','test','test','test','2026-08-06'
   );" \
  'must be created as draft/review'

echo
echo '== 4. Rubric-local children and per-rubric publication =='
fixture 'create a complete second rubric and a draft evaluation' \
  "INSERT INTO rubric_versions (
     version,expected_dimension_count,expected_subcriteria_per_dimension,locked_at
   ) VALUES ('test-2.0',1,1,'2026-08-06');
   INSERT INTO dimensions (
     rubric_version,key,name,description,display_order,radar_order
   ) VALUES ('test-2.0','test_dimension','Test dimension','Regression-only rubric',1,1);
   INSERT INTO subcriteria (dimension_id,key,name,description,display_order)
   SELECT id,'test_subcriterion','Test subcriterion','Regression-only rubric',1
   FROM dimensions WHERE rubric_version='test-2.0' AND key='test_dimension';
   INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,
     score_provenance,calibration_round,one_line_experience,primary_pull,primary_risk
   ) VALUES (
     $AW_GAME,$AW_SCOPE,'test-2.0',1,'test','test',ARRAY['PC'],'test','draft','verified',
     'medium','2026-08-06','calibration','round_1','test','test','test'
   );"

R2_EVAL="(SELECT id FROM evaluations WHERE game_id=$AW_GAME AND rubric_version='test-2.0' AND version_number=1)"
R2_DIM="(SELECT id FROM dimensions WHERE rubric_version='test-2.0' AND key='test_dimension')"
R2_SUB="(SELECT s.id FROM subcriteria s JOIN dimensions d ON d.id=s.dimension_id
        WHERE d.rubric_version='test-2.0' AND s.key='test_subcriterion')"

reject 'a score cannot cross rubric versions' \
  "INSERT INTO subcriterion_scores (evaluation_id,subcriterion_id,score,rationale)
   VALUES ($R2_EVAL,$SUB1,1,'cross-rubric');" \
  'subcriterion belongs to rubric 1.0, evaluation belongs to rubric test-2.0'

reject 'an assessment cannot cross rubric versions' \
  "INSERT INTO dimension_assessments (evaluation_id,dimension_id,confidence)
   VALUES ($R2_EVAL,$DIM1,'medium');" \
  'dimension belongs to rubric 1.0, evaluation belongs to rubric test-2.0'

reject 'an evidence dimension cannot cross rubric versions' \
  "INSERT INTO evaluation_evidence_links (evaluation_id,evidence_source_id,dimension_id)
   VALUES ($R2_EVAL,$SOURCE1,$DIM1);" \
  'evidence dimension belongs to rubric 1.0, evaluation belongs to rubric test-2.0'

reject 'an evidence subcriterion cannot cross rubric versions' \
  "INSERT INTO evaluation_evidence_links (
     evaluation_id,evidence_source_id,dimension_id,subcriterion_id
   ) VALUES ($R2_EVAL,$SOURCE1,$R2_DIM,$SUB1);" \
  'evidence subcriterion belongs to rubric 1.0, evaluation belongs to rubric test-2.0'

reject 'an evidence subcriterion requires its parent dimension' \
  "INSERT INTO evaluation_evidence_links (evaluation_id,evidence_source_id,subcriterion_id)
   VALUES ($R2_EVAL,$SOURCE1,$R2_SUB);"

accept 'the complete second-rubric evaluation can be published' \
  "INSERT INTO subcriterion_scores (evaluation_id,subcriterion_id,score,rationale)
   VALUES ($R2_EVAL,$R2_SUB,1.5,'valid rubric-local score');
   INSERT INTO dimension_assessments (evaluation_id,dimension_id,confidence)
   VALUES ($R2_EVAL,$R2_DIM,'medium');
   INSERT INTO evaluation_evidence_links (evaluation_id,evidence_source_id,dimension_id,note)
   VALUES ($R2_EVAL,$SOURCE1,$R2_DIM,'valid rubric-local evidence');
   UPDATE evaluations SET status='published', published_at='2026-08-06'
   WHERE id=$R2_EVAL;"

expect 'one game may have published evaluations under two rubric versions' \
  "SELECT count(*) FROM evaluations
   WHERE game_id=$AW_GAME AND status='published';" '2'

echo
echo '== 4b. One game, several simultaneously current profile scopes =='
#
# The blocker this replaced: the Published-row index was keyed on (game, rubric), so
# The Long Dark could publish Survival OR Wintermute and never both. These
# assertions are the proof that it can now publish both, that each series
# numbers and supersedes independently, and that the boundary is a real
# identity rather than matching mode text.
#
SECOND_SCOPE="(SELECT id FROM profile_scopes WHERE game_id=$RETURNAL_GAME AND key='second-mode')"

fixture 'create a second profile scope for one game, and a complete draft on it' \
  "INSERT INTO profile_scopes (game_id,key,label,summary,display_order)
   VALUES ($RETURNAL_GAME,'second-mode','Second mode','A materially different mode.',2);
   INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,
     score_provenance,calibration_round,one_line_experience,primary_pull,primary_risk
   ) VALUES (
     $RETURNAL_GAME,$SECOND_SCOPE,'1.0',1,'Base game','Second mode',ARRAY['PC'],'Launch',
     'draft','verified','medium','2026-08-06','calibration','round_1','scope','scope','scope'
   );
   INSERT INTO subcriterion_scores (evaluation_id,subcriterion_id,score,rationale)
   SELECT e.id,s.id,1,'second-scope fixture'
   FROM evaluations e
   JOIN dimensions d ON d.rubric_version=e.rubric_version
   JOIN subcriteria s ON s.dimension_id=d.id
   WHERE e.scope_id=$SECOND_SCOPE;
   INSERT INTO dimension_assessments (evaluation_id,dimension_id,confidence)
   SELECT e.id,d.id,'medium'
   FROM evaluations e
   JOIN dimensions d ON d.rubric_version=e.rubric_version
   WHERE e.scope_id=$SECOND_SCOPE;"

SECOND_V1="(SELECT id FROM evaluations WHERE scope_id=$SECOND_SCOPE AND version_number=1)"

reject 'a scope cannot belong to a different game than its evaluation' \
  "INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,score_provenance,calibration_round
   ) VALUES (
     $REDFALL_GAME,$SECOND_SCOPE,'1.0',930,'x','x',ARRAY['PC'],'x','draft',
     'verified','medium','2026-08-06','calibration','round_1'
   );" \
  'evaluations_scope_belongs_to_game'

expect 'exactly one scope of the game owns the canonical URL' \
  "SELECT count(*) FROM profile_scopes
   WHERE game_id=$RETURNAL_GAME AND is_primary;" '1'
expect 'the sibling scope is not primary' \
  "SELECT is_primary FROM profile_scopes WHERE id=$SECOND_SCOPE;" 'f'

reject 'a game cannot have two primary scopes' \
  "INSERT INTO profile_scopes (game_id,key,label,is_primary,display_order)
   VALUES ($RETURNAL_GAME,'third','Third',true,3);" \
  'profile_scopes_one_primary_per_game'

reject 'primacy cannot move to a scope with nothing published' \
  "SET CONSTRAINTS ALL DEFERRED;
   UPDATE profile_scopes SET is_primary=false
     WHERE game_id=$RETURNAL_GAME AND key='default';
   UPDATE profile_scopes SET is_primary=true
     WHERE game_id=$RETURNAL_GAME AND key='second-mode';
   SET CONSTRAINTS ALL IMMEDIATE;" \
  'publishes nothing under that rubric'

accept 'display_order may be reordered without touching primacy' \
  "UPDATE profile_scopes SET display_order=99
     WHERE game_id=$RETURNAL_GAME AND key='default';"
expect 'reordering left the canonical owner unchanged' \
  "SELECT key FROM profile_scopes
   WHERE game_id=$RETURNAL_GAME AND is_primary;" 'default'

reject 'a scope key is an identity, not prose' \
  "INSERT INTO profile_scopes (game_id,key,label)
   VALUES ($REDFALL_GAME,'The Long Dark — Survival','Survival');" \
  'profile_scopes_key_is_a_slug'

accept 'a second scope publishes while the first stays published' \
  "UPDATE evaluations SET status='published', published_at='2026-08-06'
   WHERE id=$SECOND_V1;"

expect 'the game now carries two simultaneously current profiles' \
  "SELECT count(*) FROM evaluations
   WHERE game_id=$RETURNAL_GAME AND rubric_version='1.0' AND status='published';" '2'
expect 'each current profile is the only Published row in its own scope' \
  "SELECT count(DISTINCT scope_id) FROM evaluations
   WHERE game_id=$RETURNAL_GAME AND rubric_version='1.0' AND status='published';" '2'
expect 'both series legitimately number their first version 1' \
  "SELECT count(*) FROM evaluations
   WHERE game_id=$RETURNAL_GAME AND rubric_version='1.0'
     AND status='published' AND version_number=1;" '2'

reject 'a second Published row inside one scope is still refused' \
  "INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,
     score_provenance,calibration_round,one_line_experience,primary_pull,primary_risk
   ) VALUES (
     $RETURNAL_GAME,$SECOND_SCOPE,'1.0',2,'x','x',ARRAY['PC'],'x','draft',
     'verified','medium','2026-08-06','calibration','round_1','x','x','x'
   );
   UPDATE evaluations SET status='published', published_at='2026-08-06'
   WHERE scope_id=$SECOND_SCOPE AND version_number=2;" \
  'evaluations_one_published_per_scope_rubric'

reject 'one series cannot supersede another series of the same game' \
  "INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,
     score_provenance,calibration_round,supersedes_evaluation_id
   ) VALUES (
     $RETURNAL_GAME,$RETURNAL_SCOPE,'1.0',920,'x','x',ARRAY['PC'],'x','draft',
     'verified','medium','2026-08-06','calibration','round_1',$SECOND_V1
   );" \
  'supersedes an evaluation of a different profile scope'

reject 'a published evaluation cannot be moved into another series' \
  "UPDATE evaluations SET scope_id=$RETURNAL_SCOPE WHERE id=$SECOND_V1;" \
  'cannot be moved to another profile scope'

expect 'the first series keeps its own independent history' \
  "SELECT count(*) FROM evaluations
   WHERE scope_id=$RETURNAL_SCOPE AND rubric_version='1.0';" '1'

echo
echo '== 4c. The canonical URL resolves under every rubric that publishes =='
#
# Master Plan v0.7, Appendix A. Asking "does this game have a published primary
# scope?" is too weak once a second rubric is registered, because public
# resolution asks a stricter question: is the primary published *under
# PUBLIC_RUBRIC_VERSION*. The gap it leaves:
#
#     primary scope Published under rubric 1.0 only
#     sibling scope Published under rubric test-2.0 only
#     public selector moved to test-2.0
#     -> /games/returnal/second-mode resolves, /games/returnal is 404
#
# Every row involved is Published and the game-wide question is satisfied, so
# only a per-(game, rubric) check refuses it. That is what these assert.
R2_SIBLING="(SELECT id FROM evaluations WHERE scope_id=$SECOND_SCOPE AND rubric_version='test-2.0' AND version_number=1)"
R2_PRIMARY="(SELECT id FROM evaluations WHERE scope_id=$RETURNAL_SCOPE AND rubric_version='test-2.0' AND version_number=1)"

# One dimension, one subcriterion: the shape the test-2.0 registry declares.
r2_evaluation() {
  printf "%s" "INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,
     score_provenance,calibration_round,one_line_experience,primary_pull,primary_risk
   ) VALUES (
     $RETURNAL_GAME,$1,'test-2.0',1,'second rubric','second rubric',ARRAY['PC'],
     'second rubric','draft','verified','medium','2026-08-06','calibration','round_1',
     'A second-rubric evaluation.','A second-rubric pull.','A second-rubric risk.'
   );
   INSERT INTO subcriterion_scores (evaluation_id,subcriterion_id,score,rationale)
   VALUES ($2,$R2_SUB,1.5,'second-rubric score');
   INSERT INTO dimension_assessments (evaluation_id,dimension_id,confidence)
   VALUES ($2,$R2_DIM,'medium');"
}

fixture 'stage a complete sibling evaluation under the second rubric' \
  "$(r2_evaluation "$SECOND_SCOPE" "$R2_SIBLING")"

reject 'a sibling cannot publish under a rubric its primary has not published' \
  "UPDATE evaluations SET status='published', published_at='2026-08-06'
   WHERE id=$R2_SIBLING;" \
  'publishes nothing under that rubric'

expect 'the refused sibling is still only a draft' \
  "SELECT status FROM evaluations WHERE id=$R2_SIBLING;" 'draft'

accept 'the primary may publish under the second rubric first' \
  "$(r2_evaluation "$RETURNAL_SCOPE" "$R2_PRIMARY")
   UPDATE evaluations SET status='published', published_at='2026-08-06'
   WHERE id=$R2_PRIMARY;"

accept 'and then the sibling may publish under it too' \
  "UPDATE evaluations SET status='published', published_at='2026-08-06'
   WHERE id=$R2_SIBLING;"

expect 'the bare game URL now resolves under either rubric' \
  "SELECT count(*) FROM evaluations e
   JOIN profile_scopes ps ON ps.id=e.scope_id
   WHERE e.game_id=$RETURNAL_GAME AND e.status='published' AND ps.is_primary;" '2'
expect 'and so does each sibling' \
  "SELECT count(*) FROM evaluations
   WHERE game_id=$RETURNAL_GAME AND status='published';" '4'

reject 'primacy still cannot move to a scope missing a published rubric' \
  "SET CONSTRAINTS ALL DEFERRED;
   DELETE FROM profile_scopes WHERE game_id=$RETURNAL_GAME AND key='never-published';
   INSERT INTO profile_scopes (game_id,key,label,is_primary,display_order)
   VALUES ($RETURNAL_GAME,'never-published','Never published',false,4);
   UPDATE profile_scopes SET is_primary=false
     WHERE game_id=$RETURNAL_GAME AND key='default';
   UPDATE profile_scopes SET is_primary=true
     WHERE game_id=$RETURNAL_GAME AND key='never-published';
   SET CONSTRAINTS ALL IMMEDIATE;" \
  'publishes nothing under that rubric'

echo
echo '== 5. Final snapshots and all owned children are immutable =='
reject 'published evaluation metadata cannot change' \
  "UPDATE evaluations SET primary_pull='rewritten' WHERE id=$AW;" \
  'published evaluation'
reject 'a published evaluation cannot be deleted' \
  "DELETE FROM evaluations WHERE id=$AW;" \
  'final evaluation'
reject 'a final score cannot change' \
  "UPDATE subcriterion_scores SET rationale='rewritten' WHERE evaluation_id=$AW AND subcriterion_id=$SUB1;" \
  'children of final evaluation'
reject 'a final assessment cannot change' \
  "UPDATE dimension_assessments SET note='rewritten' WHERE evaluation_id=$AW AND dimension_id=$DIM1;" \
  'children of final evaluation'
reject 'a final profile block cannot be removed' \
  "DELETE FROM profile_blocks WHERE evaluation_id=$AW AND block_type='great_fit' AND item_order=1;" \
  'children of final evaluation'
reject 'a final tag cannot change' \
  "UPDATE evaluation_tags SET note='rewritten'
   WHERE evaluation_id=$AW AND tag_id=(SELECT tag_id FROM evaluation_tags WHERE evaluation_id=$AW LIMIT 1);" \
  'children of final evaluation'
reject 'a final evidence link cannot change' \
  "UPDATE evaluation_evidence_links SET note='rewritten'
   WHERE id=(SELECT id FROM evaluation_evidence_links WHERE evaluation_id=$AW LIMIT 1);" \
  'children of final evaluation'
reject 'a new child cannot be attached to a final evaluation' \
  "INSERT INTO profile_blocks (evaluation_id,block_type,item_order,text)
   VALUES ($AW,'great_fit',999,'late child');" \
  'children of final evaluation'
reject 'a platform override cannot be added to a final evaluation' \
  "INSERT INTO subcriterion_platform_overrides
     (evaluation_id,subcriterion_id,platform_id,score,rationale)
   SELECT $AW,ss.subcriterion_id,(SELECT id FROM platforms WHERE slug='pc'),0.5,
          'a late platform correction on published history'
   FROM subcriterion_scores ss
   JOIN subcriteria s ON s.id=ss.subcriterion_id
   JOIN dimensions d ON d.id=s.dimension_id
   WHERE ss.evaluation_id=$AW AND d.key='execution' AND s.key='technical_stability';" \
  'children of final evaluation'

accept 'a revision may be appended to final history' \
  "INSERT INTO evaluation_revisions (evaluation_id,changed_by,summary)
   VALUES ($AW,'regression','append-only audit event');"
reject 'an existing revision cannot be rewritten' \
  "UPDATE evaluation_revisions SET summary='rewritten'
   WHERE evaluation_id=$AW AND summary='append-only audit event';" \
  'evaluation revisions are append-only'

reject 'evidence used by final history cannot be rewritten' \
  "UPDATE evidence_sources SET title='rewritten' WHERE id=$SOURCE1;" \
  'evidence source'
accept 'an unlinked evidence source remains editable and disposable' \
  "INSERT INTO evidence_sources (source_key,title,evidence_tier,source_category)
   VALUES ('src_regression_disposable','Disposable','B','technical');
   UPDATE evidence_sources SET title='Still disposable'
   WHERE source_key='src_regression_disposable';
   DELETE FROM evidence_sources WHERE source_key='src_regression_disposable';"

reject 'a tag definition used by final history cannot be rewritten' \
  "UPDATE tags SET label='rewritten'
   WHERE id=(SELECT tag_id FROM evaluation_tags WHERE evaluation_id=$AW LIMIT 1);"

reject 'a used rubric registry row cannot change' \
  "UPDATE rubric_versions SET expected_dimension_count=9 WHERE version='1.0';" \
  'used by final evaluations and is immutable'
reject 'a used rubric cannot gain a dimension in place' \
  "INSERT INTO dimensions (rubric_version,key,name,display_order,radar_order)
   VALUES ('1.0','late_dimension','Late dimension',99,99);" \
  'rubric 1.0 is used by final evaluations and is immutable'
reject 'a used rubric subcriterion cannot change in place' \
  "UPDATE subcriteria SET name='rewritten' WHERE id=$SUB1;" \
  'rubric 1.0 is used by final evaluations and is immutable'

echo
echo '== 6. Derived scores remain honest on editable drafts =='
fixture 'create a fully scored draft scratch evaluation' \
  "INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,score_provenance,calibration_round
   ) VALUES (
     $AW_GAME,$AW_SCOPE,'1.0',901,'scratch','scratch',ARRAY['PC'],'scratch','draft',
     'verified','medium','2026-08-06','calibration','round_1'
   );
   INSERT INTO subcriterion_scores (
     evaluation_id,subcriterion_id,score,rationale,platform_note,evidence_confidence
   ) SELECT
     (SELECT id FROM evaluations WHERE game_id=$AW_GAME AND rubric_version='1.0' AND version_number=901),
     subcriterion_id,score,rationale,platform_note,evidence_confidence
   FROM subcriterion_scores WHERE evaluation_id=$AW;
   INSERT INTO dimension_assessments (evaluation_id,dimension_id,confidence,note)
   SELECT
     (SELECT id FROM evaluations WHERE game_id=$AW_GAME AND rubric_version='1.0' AND version_number=901),
     dimension_id,confidence,note
   FROM dimension_assessments WHERE evaluation_id=$AW;"

SCRATCH="(SELECT id FROM evaluations WHERE game_id=$AW_GAME AND rubric_version='1.0' AND version_number=901)"

expect 'one missing row yields a range, never a precise score' \
  "BEGIN;
   DELETE FROM subcriterion_scores WHERE evaluation_id=$SCRATCH AND subcriterion_id=$SUB1;
   SELECT coalesce(ds.score::text,'-')||'/'||coalesce(ds.low_estimate::text,'-')||'-'||coalesce(ds.high_estimate::text,'-')
   FROM dimension_scores ds WHERE ds.evaluation_id=$SCRATCH AND ds.dimension_id=$DIM1;
   ROLLBACK;" \
  '-/8.0-10.0'

expect 'two missing rows yield no score or range' \
  "BEGIN;
   DELETE FROM subcriterion_scores WHERE evaluation_id=$SCRATCH AND subcriterion_id IN ($SUB1,$SUB2);
   SELECT coalesce(ds.score::text,'-')||'/'||coalesce(ds.low_estimate::text,'-')
   FROM dimension_scores ds WHERE ds.evaluation_id=$SCRATCH AND ds.dimension_id=$DIM1;
   ROLLBACK;" \
  '-/-'

accept 'a draft may link one source at dimension and subcriterion granularity' \
  "INSERT INTO evaluation_evidence_links (evaluation_id,evidence_source_id,dimension_id,note)
   VALUES ($SCRATCH,$SOURCE1,$DIM1,'dimension-level');
   INSERT INTO evaluation_evidence_links (
     evaluation_id,evidence_source_id,dimension_id,subcriterion_id,note
   ) VALUES ($SCRATCH,$SOURCE1,$DIM1,$SUB1,'subcriterion-level');"
expect 'linked_evidence_count counts distinct sources, not links' \
  "SELECT linked_evidence_count FROM dimension_scores
   WHERE evaluation_id=$SCRATCH AND dimension_id=$DIM1;" '1'

echo
echo '== 6b. Platform-specific subcriterion overrides =='
#
# Rubric §3 permits a materially platform-specific reading. The old model could
# not store one: `subcriterion_scores.platform_id` sat under a primary key of
# (evaluation, subcriterion), so a score could name at most one platform.
#
# The base value stays canonical throughout — the last assertion here is the
# important one, because an override that moved a dimension total would have
# quietly created a second, competing profile.
STABILITY="(SELECT s.id FROM subcriteria s JOIN dimensions d ON d.id=s.dimension_id
           WHERE d.rubric_version='1.0' AND d.key='execution' AND s.key='technical_stability')"
EXECUTION="(SELECT id FROM dimensions WHERE rubric_version='1.0' AND key='execution')"
PC="(SELECT id FROM platforms WHERE slug='pc')"
PS5="(SELECT id FROM platforms WHERE slug='ps5')"

expect 'the non-functional platform column is gone from the score row' \
  "SELECT count(*) FROM information_schema.columns
   WHERE table_name='subcriterion_scores' AND column_name='platform_id';" '0'

expect 'the base dimension total before any override' \
  "SELECT score FROM dimension_scores
   WHERE evaluation_id=$SCRATCH AND dimension_id=$EXECUTION;" '9.0'

accept 'one subcriterion may carry overrides for several platforms at once' \
  "INSERT INTO subcriterion_platform_overrides
     (evaluation_id,subcriterion_id,platform_id,score,rationale,evidence_confidence)
   VALUES
     ($SCRATCH,$STABILITY,$PC,1,'Path tracing destabilises frame delivery on mid-range PCs.','medium'),
     ($SCRATCH,$STABILITY,$PS5,1.5,'Occasional traversal hitching absent on PC.','low');"

expect 'both platform variants are stored for one evaluation and subcriterion' \
  "SELECT count(*) FROM subcriterion_platform_overrides
   WHERE evaluation_id=$SCRATCH AND subcriterion_id=$STABILITY;" '2'

reject 'a conflicting duplicate override cannot exist' \
  "INSERT INTO subcriterion_platform_overrides
     (evaluation_id,subcriterion_id,platform_id,score,rationale)
   VALUES ($SCRATCH,$STABILITY,$PC,0.5,'conflicting second reading');"

reject 'an override repeating the base value is not a deviation' \
  "INSERT INTO subcriterion_platform_overrides
     (evaluation_id,subcriterion_id,platform_id,score,rationale)
   SELECT $SCRATCH,$STABILITY,(SELECT id FROM platforms WHERE slug='xbox-series'),
          score,'identical to base'
   FROM subcriterion_scores WHERE evaluation_id=$SCRATCH AND subcriterion_id=$STABILITY;" \
  'repeats the base score'

reject 'an override cannot name a platform the game does not ship on' \
  "INSERT INTO platforms (slug,name) VALUES ('test-handheld','Test Handheld')
   ON CONFLICT (slug) DO NOTHING;
   INSERT INTO subcriterion_platform_overrides
     (evaluation_id,subcriterion_id,platform_id,score,rationale)
   VALUES ($SCRATCH,$STABILITY,(SELECT id FROM platforms WHERE slug='test-handheld'),
           0.5,'a platform this game never shipped on');" \
  'does not ship on'

reject 'an override requires a base score to deviate from' \
  "DELETE FROM subcriterion_scores WHERE evaluation_id=$SCRATCH AND subcriterion_id=$SUB1;
   INSERT INTO subcriterion_platform_overrides
     (evaluation_id,subcriterion_id,platform_id,score,rationale)
   VALUES ($SCRATCH,$SUB1,$PC,0.5,'no base row to deviate from');" \
  'subcriterion_platform_overrides_base_fk'

reject 'an override must explain itself' \
  "INSERT INTO subcriterion_platform_overrides
     (evaluation_id,subcriterion_id,platform_id,score,rationale)
   VALUES ($SCRATCH,$STABILITY,(SELECT id FROM platforms WHERE slug='xbox-series'),
           0.5,'   ');" \
  'subcriterion_override_rationale_present'

reject 'override scores obey the same 0-2 half-step grid' \
  "INSERT INTO subcriterion_platform_overrides
     (evaluation_id,subcriterion_id,platform_id,score,rationale)
   VALUES ($SCRATCH,$STABILITY,(SELECT id FROM platforms WHERE slug='xbox-series'),
           0.25,'off the grid');" \
  'subcriterion_override_half_steps'

# How a consumer asks for a platform-specific reading, and what it gets where
# no override exists.
expect 'a platform with an override reads the override' \
  "SELECT score::text||'/'||is_override::text FROM subcriterion_platform_readings
   WHERE evaluation_id=$SCRATCH AND subcriterion_id=$STABILITY AND platform_slug='pc';" \
  '1.0/true'
expect 'a platform without an override falls back to the base' \
  "SELECT score::text||'/'||is_override::text FROM subcriterion_platform_readings
   WHERE evaluation_id=$SCRATCH AND subcriterion_id=$STABILITY
     AND platform_slug='xbox-series';" \
  '2.0/false'
expect 'every platform the game ships on has a reading' \
  "SELECT count(*) FROM subcriterion_platform_readings
   WHERE evaluation_id=$SCRATCH AND subcriterion_id=$STABILITY;" '3'

# The load-bearing one. The published profile is the base profile.
expect 'overrides never move a dimension total' \
  "SELECT score FROM dimension_scores
   WHERE evaluation_id=$SCRATCH AND dimension_id=$EXECUTION;" '9.0'

echo
echo '== 6c. Score provenance is general, not calibration-shaped =='
#
# The old enum listed calibration_round_1, calibration_round_2 and
# derived_pending_round_1_reconciliation. An ordinary authored profile had no
# value to carry, and a fourth round meant a schema migration. The kind is now
# durable; the round is data.
PROVENANCE_DRAFT="(SELECT id FROM evaluations WHERE version_number=940)"

expect 'both conducted rounds are registered' \
  "SELECT count(*) FROM calibration_rounds WHERE key IN ('round_1','round_2');" '2'
expect 'the three seeded profiles cite a registered round' \
  "SELECT count(*) FROM evaluations e
   JOIN games g ON g.id=e.game_id
   JOIN calibration_rounds r ON r.key=e.calibration_round
   WHERE e.status='published' AND e.score_provenance='calibration'
     AND e.rubric_version='1.0'
     AND e.scope_id IN (SELECT id FROM profile_scopes WHERE key='default')
     AND g.slug IN ('alan-wake-2','returnal','redfall');" '3'

accept 'an ordinary editorial profile needs no round and no schema change' \
  "INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,
     score_provenance,calibration_round
   ) VALUES (
     $REDFALL_GAME,$REDFALL_SCOPE,'1.0',940,'x','x',ARRAY['PC'],'x','draft',
     'verified','medium','2026-08-06','editorial',NULL
   );"

reject 'a calibration profile must name its round' \
  "UPDATE evaluations SET score_provenance='calibration' WHERE id=$PROVENANCE_DRAFT;" \
  'calibration_provenance_names_its_round'
reject 'a non-calibration profile cannot borrow a round' \
  "UPDATE evaluations SET calibration_round='round_1' WHERE id=$PROVENANCE_DRAFT;" \
  'calibration_provenance_names_its_round'
reject 'a round must be registered before it can be cited' \
  "UPDATE evaluations SET score_provenance='calibration', calibration_round='round_9'
   WHERE id=$PROVENANCE_DRAFT;" \
  'evaluations_calibration_round_calibration_rounds_key_fk'
reject 'derived numbers must say they were not signed off' \
  "UPDATE evaluations SET score_provenance='derived' WHERE id=$PROVENANCE_DRAFT;" \
  'derived_provenance_explains_itself'
accept 'derived numbers are fine once the profile explains itself' \
  "UPDATE evaluations SET score_provenance='derived',
     provenance_note='Scored by tooling against the rubric; not editorially reviewed.'
   WHERE id=$PROVENANCE_DRAFT;"

accept 'a new calibration round is a row, not a migration' \
  "INSERT INTO calibration_rounds (key,label,conducted_at,report_reference)
   VALUES ('round_3','Calibration round 3','2026-09-01','docs/round-3.md');
   UPDATE evaluations SET score_provenance='calibration', calibration_round='round_3',
     provenance_note=NULL
   WHERE id=$PROVENANCE_DRAFT;"

reject 'a round cited by final history cannot be relabelled' \
  "UPDATE calibration_rounds SET label='Renamed round' WHERE key='round_1';" \
  'cited by final evaluation'
accept 'a round no final evaluation cites is still editable' \
  "UPDATE calibration_rounds SET label='Calibration round 3 (revised)' WHERE key='round_3';"

echo
echo '== 6d. Artwork carries its rights record, or it does not exist =='
#
# `games` held bare cover_url / hero_url columns: a URL records that an image is
# reachable and nothing about whether it may be shown, which is the exact
# failure ADR 0011 exists to prevent. The application model already had
# clearance and basis; the database is where an import or a future editor
# writes, so it needs them too.
expect 'the bare URL columns are gone from games' \
  "SELECT count(*) FROM information_schema.columns
   WHERE table_name='games' AND column_name IN ('cover_url','hero_url');" '0'
expect 'no seeded game carries artwork, so production stays artless' \
  "SELECT count(*) FROM game_artwork;" '0'

accept 'cleared artwork is stored with its clearance, basis and attribution' \
  "INSERT INTO game_artwork
     (game_id,role,url,width,height,alt_text,source,clearance,basis,credit,source_page)
   VALUES ($REDFALL_GAME,'hero','https://example.com/hero.jpg',1920,1080,
           'Key art.','press-kit','production','press-kit','Some Publisher',
           'https://example.com/press');"

reject 'production clearance cannot rest on an internal-evaluation basis' \
  "INSERT INTO game_artwork
     (game_id,role,url,width,height,source,clearance,basis,credit,source_page)
   VALUES ($AW_GAME,'hero','https://example.com/a.jpg',10,10,'manual',
           'production','internal-evaluation','X','https://example.com');" \
  'game_artwork_cleared_basis'

reject 'production artwork must say who to credit and where it came from' \
  "INSERT INTO game_artwork
     (game_id,role,url,width,height,source,clearance,basis)
   VALUES ($AW_GAME,'hero','https://example.com/a.jpg',10,10,'manual',
           'production','press-kit');" \
  'game_artwork_production_is_attributable'

reject 'artwork must declare positive intrinsic dimensions' \
  "INSERT INTO game_artwork
     (game_id,role,url,width,height,source,clearance,basis,credit,source_page)
   VALUES ($AW_GAME,'hero','https://example.com/a.jpg',0,0,'manual',
           'production','press-kit','X','https://example.com');" \
  'game_artwork_dimensions_positive'

reject 'an artwork URL must be absolute https' \
  "INSERT INTO game_artwork
     (game_id,role,url,width,height,source,clearance,basis,credit,source_page)
   VALUES ($AW_GAME,'hero','/local/a.jpg',10,10,'manual',
           'production','press-kit','X','https://example.com');" \
  'game_artwork_url_is_absolute'

reject 'one game cannot hold two heroes' \
  "INSERT INTO game_artwork
     (game_id,role,url,width,height,source,clearance,basis,credit,source_page)
   VALUES ($REDFALL_GAME,'hero','https://example.com/other.jpg',10,10,'manual',
           'production','press-kit','X','https://example.com');" \
  'game_artwork_game_id_role_pk'

accept 'evaluation-clearance artwork is storable, on the looser rule' \
  "INSERT INTO game_artwork
     (game_id,role,url,width,height,source,clearance,basis)
   VALUES ($AW_GAME,'hero','https://example.com/internal.jpg',10,10,'manual',
           'evaluation','internal-evaluation');"

echo
echo '== 7. Bidirectional lineage and atomic supersession =='
fixture 'create a draft lineage used to exercise incoming-edge checks' \
  "INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,score_provenance,calibration_round
   ) VALUES
     ($REDFALL_GAME,$REDFALL_SCOPE,'1.0',910,'scratch','scratch',ARRAY['PC'],'scratch','draft','verified','medium','2026-08-06','calibration','round_1'),
     ($REDFALL_GAME,$REDFALL_SCOPE,'1.0',911,'scratch','scratch',ARRAY['PC'],'scratch','draft','verified','medium','2026-08-06','calibration','round_1');
   UPDATE evaluations SET supersedes_evaluation_id=(
     SELECT id FROM evaluations WHERE game_id=$REDFALL_GAME AND rubric_version='1.0' AND version_number=910
   ) WHERE game_id=$REDFALL_GAME AND rubric_version='1.0' AND version_number=911;"

LINEAGE_PREV="(SELECT id FROM evaluations WHERE game_id=$REDFALL_GAME AND rubric_version='1.0' AND version_number=910)"
LINEAGE_NEXT="(SELECT id FROM evaluations WHERE game_id=$REDFALL_GAME AND rubric_version='1.0' AND version_number=911)"

reject 'the scope/game key blocks changing a predecessor game' \
  "UPDATE evaluations SET game_id=$RETURNAL_GAME WHERE id=$LINEAGE_PREV;" \
  'evaluations_scope_belongs_to_game'
reject 'an incoming edge blocks moving its predecessor to another rubric' \
  "UPDATE evaluations SET rubric_version='test-2.0' WHERE id=$LINEAGE_PREV;" \
  'incoming successor'
reject 'an incoming edge blocks renumbering its predecessor past the successor' \
  "UPDATE evaluations SET version_number=912 WHERE id=$LINEAGE_PREV;" \
  'incoming successor'
reject 'an outgoing edge cannot be retargeted to another series' \
  "UPDATE evaluations SET supersedes_evaluation_id=$AW WHERE id=$LINEAGE_NEXT;" \
  'different profile scope'
reject 'a lineage edge cannot point to itself' \
  "UPDATE evaluations SET supersedes_evaluation_id=id WHERE id=$LINEAGE_NEXT;" \
  'evaluation_does_not_supersede_itself'

fixture 'stage an incomplete predecessor and complete successor' \
  "INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,
     score_provenance,calibration_round,one_line_experience,primary_pull,primary_risk
   ) VALUES
     ($REDFALL_GAME,$REDFALL_SCOPE,'test-2.0',20,'scratch','scratch',ARRAY['PC'],'scratch','draft',
      'verified','medium','2026-08-06','calibration','round_1','test','test','test'),
     ($REDFALL_GAME,$REDFALL_SCOPE,'test-2.0',21,'scratch','scratch',ARRAY['PC'],'scratch','draft',
      'verified','medium','2026-08-06','calibration','round_1','test','test','test');
   UPDATE evaluations SET supersedes_evaluation_id=(
     SELECT id FROM evaluations
     WHERE game_id=$REDFALL_GAME AND rubric_version='test-2.0' AND version_number=20
   ) WHERE game_id=$REDFALL_GAME AND rubric_version='test-2.0' AND version_number=21;
   INSERT INTO subcriterion_scores (evaluation_id,subcriterion_id,score,rationale)
   SELECT id,$R2_SUB,1.5,'complete successor'
   FROM evaluations
   WHERE game_id=$REDFALL_GAME AND rubric_version='test-2.0' AND version_number=21;
   INSERT INTO dimension_assessments (evaluation_id,dimension_id,confidence)
   SELECT id,$R2_DIM,'medium'
   FROM evaluations
   WHERE game_id=$REDFALL_GAME AND rubric_version='test-2.0' AND version_number=21;"

BYPASS_PREV="(SELECT id FROM evaluations
  WHERE game_id=$REDFALL_GAME AND rubric_version='test-2.0' AND version_number=20)"
BYPASS_NEXT="(SELECT id FROM evaluations
  WHERE game_id=$REDFALL_GAME AND rubric_version='test-2.0' AND version_number=21)"

reject 'an incomplete draft cannot be laundered through published into superseded' \
  "SET CONSTRAINTS ALL DEFERRED;
   UPDATE evaluations SET status='published',published_at='2026-08-07' WHERE id=$BYPASS_PREV;
   UPDATE evaluations SET status='superseded' WHERE id=$BYPASS_PREV;
   UPDATE evaluations SET status='published',published_at='2026-08-07' WHERE id=$BYPASS_NEXT;" \
  'missing 1 subcriterion score row'

fixture 'stage a complete same-rubric successor' \
  "INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,current_state_cutoff_at,status,evidence_status,evidence_maturity,
     confidence,evidence_cutoff_at,release_context,one_line_experience,primary_pull,
     primary_risk,platform_warning,score_provenance,calibration_round,provenance_note,evidence_ledger,
     created_by,reviewed_by,supersedes_evaluation_id,change_summary
   ) SELECT
     game_id,scope_id,rubric_version,902,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,current_state_cutoff_at,'draft',evidence_status,evidence_maturity,
     confidence,evidence_cutoff_at,release_context,one_line_experience,primary_pull,
     primary_risk,platform_warning,score_provenance,calibration_round,provenance_note,evidence_ledger,
     created_by,reviewed_by,id,'regression successor'
   FROM evaluations WHERE id=$AW;
   INSERT INTO subcriterion_scores (
     evaluation_id,subcriterion_id,score,rationale,platform_note,evidence_confidence
   ) SELECT
     (SELECT id FROM evaluations WHERE game_id=$AW_GAME AND rubric_version='1.0' AND version_number=902),
     subcriterion_id,score,rationale,platform_note,evidence_confidence
   FROM subcriterion_scores WHERE evaluation_id=$AW;
   INSERT INTO dimension_assessments (evaluation_id,dimension_id,confidence,note)
   SELECT
     (SELECT id FROM evaluations WHERE game_id=$AW_GAME AND rubric_version='1.0' AND version_number=902),
     dimension_id,confidence,note
   FROM dimension_assessments WHERE evaluation_id=$AW;
   INSERT INTO profile_blocks (evaluation_id,block_type,item_order,text)
   SELECT
     (SELECT id FROM evaluations WHERE game_id=$AW_GAME AND rubric_version='1.0' AND version_number=902),
     block_type,item_order,text
   FROM profile_blocks WHERE evaluation_id=$AW;
   INSERT INTO evaluation_tags (evaluation_id,tag_id,intensity,note)
   SELECT
     (SELECT id FROM evaluations WHERE game_id=$AW_GAME AND rubric_version='1.0' AND version_number=902),
     tag_id,intensity,note
   FROM evaluation_tags WHERE evaluation_id=$AW;
   INSERT INTO evaluation_evidence_links (
     evaluation_id,evidence_source_id,dimension_id,subcriterion_id,platform_scope,note,spoiler_sensitive
   ) SELECT
     (SELECT id FROM evaluations WHERE game_id=$AW_GAME AND rubric_version='1.0' AND version_number=902),
     evidence_source_id,dimension_id,subcriterion_id,platform_scope,note,spoiler_sensitive
   FROM evaluation_evidence_links WHERE evaluation_id=$AW;"

SUCCESSOR="(SELECT id FROM evaluations WHERE game_id=$AW_GAME AND rubric_version='1.0' AND version_number=902)"

reject 'a same-rubric successor cannot publish before its predecessor is superseded' \
  "UPDATE evaluations SET status='published', published_at='2026-08-07' WHERE id=$SUCCESSOR;" \
  'evaluations_one_published_per_scope_rubric'

accept 'a same-rubric supersession can finalize atomically' \
  "SET CONSTRAINTS ALL DEFERRED;
   UPDATE evaluations SET status='superseded' WHERE id=$AW;
   UPDATE evaluations SET status='published', published_at='2026-08-07' WHERE id=$SUCCESSOR;"

expect 'the predecessor is superseded and the successor is published' \
  "SELECT string_agg(version_number||':'||status::text,',' ORDER BY version_number)
   FROM evaluations WHERE game_id=$AW_GAME AND rubric_version='1.0'
     AND version_number IN (1,902);" \
  '1:superseded,902:published'
expect 'the superseded row has exactly one final successor' \
  "SELECT count(*) FROM evaluations
   WHERE supersedes_evaluation_id=$AW AND status IN ('published','superseded');" '1'
expect 'the game still has one published evaluation per each of two rubrics' \
  "SELECT count(*) FROM evaluations
   WHERE game_id=$AW_GAME AND status='published';" '2'

echo
echo '== 8. Publication is serialized against concurrent contract mutation =='
RACE_TMP="$(mktemp -d "${TMPDIR:-/tmp}/game-profile-db-race.XXXXXX")"

fixture 'create a complete draft for the child/publication race' \
  "INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,
     score_provenance,calibration_round,one_line_experience,primary_pull,primary_risk
   ) VALUES (
     $REDFALL_GAME,$REDFALL_SCOPE,'test-2.0',30,'race','race',ARRAY['PC'],'race','draft',
     'verified','medium','2026-08-06','calibration','round_1','race','race','race'
   );
   INSERT INTO subcriterion_scores (evaluation_id,subcriterion_id,score,rationale)
   SELECT id,$R2_SUB,1.5,'before concurrent publication'
   FROM evaluations
   WHERE game_id=$REDFALL_GAME AND rubric_version='test-2.0' AND version_number=30;
   INSERT INTO dimension_assessments (evaluation_id,dimension_id,confidence)
   SELECT id,$R2_DIM,'medium'
   FROM evaluations
   WHERE game_id=$REDFALL_GAME AND rubric_version='test-2.0' AND version_number=30;"

RACE_EVAL="(SELECT id FROM evaluations
  WHERE game_id=$REDFALL_GAME AND rubric_version='test-2.0' AND version_number=30)"
CHILD_PUBLISH_READY=8211001
CHILD_MUTATION_STARTED=8211002

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q \
  -c 'BEGIN;' \
  -c "SET LOCAL statement_timeout='15s';" \
  -c "UPDATE evaluations SET status='published',published_at='2026-08-08'
      WHERE id=$RACE_EVAL;" \
  -c "SELECT pg_advisory_lock($CHILD_PUBLISH_READY);" \
  -c "DO \$\$
      DECLARE attempt integer; acquired boolean;
      BEGIN
        FOR attempt IN 1..200 LOOP
          acquired := pg_try_advisory_lock($CHILD_MUTATION_STARTED);
          IF NOT acquired THEN RETURN; END IF;
          PERFORM pg_advisory_unlock($CHILD_MUTATION_STARTED);
          PERFORM pg_sleep(0.05);
        END LOOP;
        RAISE EXCEPTION 'timed out waiting for concurrent child mutation';
      END
      \$\$;" \
  -c 'COMMIT;' >"$RACE_TMP/child-publish.out" 2>&1 &
child_publish_pid=$!

if wait_for_advisory_lock "$CHILD_PUBLISH_READY" "$child_publish_pid"; then
  child_mutation_status=0
  child_mutation_out=''
  if child_mutation_out="$(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q \
      -c 'BEGIN;' \
      -c "SET LOCAL lock_timeout='10s'; SET LOCAL statement_timeout='15s';" \
      -c "WITH signal AS MATERIALIZED (
            SELECT pg_advisory_lock($CHILD_MUTATION_STARTED)
          )
          UPDATE subcriterion_scores AS ss
          SET rationale='concurrent rewrite'
          FROM signal
          WHERE ss.evaluation_id=$RACE_EVAL AND ss.subcriterion_id=$R2_SUB;" \
      -c 'COMMIT;' 2>&1)"; then
    child_mutation_status=0
  else
    child_mutation_status=$?
  fi
else
  printf '  FAIL  concurrent publisher did not reach its ready signal\n'
  fail=$((fail + 1))
  kill "$child_publish_pid" 2>/dev/null || true
  child_mutation_status=125
  child_mutation_out='publisher did not become ready'
fi

if wait "$child_publish_pid"; then
  child_publish_status=0
else
  child_publish_status=$?
fi
child_publish_pid=''

if [[ "$child_publish_status" -eq 0 ]]; then
  printf '  pass  concurrent draft publication committed\n'
  pass=$((pass + 1))
else
  printf '  FAIL  concurrent draft publication failed:\n        %s\n' \
    "$(first_line "$(<"$RACE_TMP/child-publish.out")")"
  fail=$((fail + 1))
fi

if [[ "$child_mutation_status" -ne 0 && "$child_mutation_out" == *'children of final evaluation'* ]]; then
  printf '  pass  concurrent child mutation waited and was rejected\n'
  pass=$((pass + 1))
else
  printf '  FAIL  concurrent child mutation was not rejected after publication:\n        %s\n' \
    "$(first_line "$child_mutation_out")"
  fail=$((fail + 1))
fi

expect 'the concurrently published snapshot retains its original child' \
  "SELECT e.status::text||'/'||ss.rationale
   FROM evaluations e
   JOIN subcriterion_scores ss ON ss.evaluation_id=e.id
   WHERE e.id=$RACE_EVAL AND ss.subcriterion_id=$R2_SUB;" \
  'published/before concurrent publication'

fixture 'create a new rubric and complete draft for the definition race' \
  "INSERT INTO rubric_versions (
     version,expected_dimension_count,expected_subcriteria_per_dimension,locked_at
   ) VALUES ('test-race',1,1,'2026-08-08');
   INSERT INTO dimensions (rubric_version,key,name,display_order,radar_order)
   VALUES ('test-race','race_dimension','Race dimension',1,1);
   INSERT INTO subcriteria (dimension_id,key,name,display_order)
   SELECT id,'race_subcriterion','Race subcriterion',1
   FROM dimensions WHERE rubric_version='test-race' AND key='race_dimension';
   INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,
     score_provenance,calibration_round,one_line_experience,primary_pull,primary_risk
   ) VALUES (
     $RETURNAL_GAME,$RETURNAL_SCOPE,'test-race',1,'race','race',ARRAY['PC'],'race','draft',
     'verified','medium','2026-08-06','calibration','round_1','race','race','race'
   );
   INSERT INTO subcriterion_scores (evaluation_id,subcriterion_id,score,rationale)
   SELECT e.id,s.id,1.5,'complete race fixture'
   FROM evaluations e
   JOIN subcriteria s ON s.key='race_subcriterion'
   JOIN dimensions d ON d.id=s.dimension_id AND d.rubric_version='test-race'
   WHERE e.game_id=$RETURNAL_GAME AND e.rubric_version='test-race' AND e.version_number=1;
   INSERT INTO dimension_assessments (evaluation_id,dimension_id,confidence)
   SELECT e.id,d.id,'medium'
   FROM evaluations e
   JOIN dimensions d ON d.rubric_version='test-race' AND d.key='race_dimension'
   WHERE e.game_id=$RETURNAL_GAME AND e.rubric_version='test-race' AND e.version_number=1;"

RUBRIC_RACE_EVAL="(SELECT id FROM evaluations
  WHERE game_id=$RETURNAL_GAME AND rubric_version='test-race' AND version_number=1)"
RUBRIC_PUBLISH_READY=8211011
RUBRIC_MUTATION_STARTED=8211012
RUBRIC_MUTATION_ACK=8211013

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q \
  -c 'BEGIN;' \
  -c "SET LOCAL statement_timeout='15s';" \
  -c "UPDATE evaluations SET status='published',published_at='2026-08-08'
      WHERE id=$RUBRIC_RACE_EVAL;" \
  -c "SELECT pg_advisory_lock($RUBRIC_PUBLISH_READY);" \
  -c "DO \$\$
      DECLARE attempt integer; acquired boolean;
      BEGIN
        FOR attempt IN 1..200 LOOP
          acquired := pg_try_advisory_lock($RUBRIC_MUTATION_STARTED);
          IF NOT acquired THEN EXIT; END IF;
          PERFORM pg_advisory_unlock($RUBRIC_MUTATION_STARTED);
          PERFORM pg_sleep(0.05);
        END LOOP;
        IF acquired THEN
          RAISE EXCEPTION 'timed out waiting for concurrent rubric mutation';
        END IF;

        -- Acknowledge the competing session, then keep the rubric publication
        -- transaction open until that session has attempted (and rejected)
        -- its definition mutation.
        PERFORM pg_advisory_lock($RUBRIC_MUTATION_ACK);
        FOR attempt IN 1..200 LOOP
          acquired := pg_try_advisory_lock($RUBRIC_MUTATION_STARTED);
          IF acquired THEN
            PERFORM pg_advisory_unlock($RUBRIC_MUTATION_STARTED);
            RETURN;
          END IF;
          PERFORM pg_sleep(0.05);
        END LOOP;
        RAISE EXCEPTION 'timed out waiting for concurrent rubric mutation to finish';
      END
      \$\$;" \
  -c 'COMMIT;' >"$RACE_TMP/rubric-publish.out" 2>&1 &
rubric_publish_pid=$!

if wait_for_advisory_lock "$RUBRIC_PUBLISH_READY" "$rubric_publish_pid"; then
  rubric_mutation_status=0
  rubric_mutation_out=''
  if rubric_mutation_out="$(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q \
      -c 'BEGIN;' \
      -c "SET LOCAL lock_timeout='10s'; SET LOCAL statement_timeout='15s';" \
      -c "SELECT pg_advisory_lock($RUBRIC_MUTATION_STARTED);" \
      -c "DO \$\$
          DECLARE attempt integer; acquired boolean;
          BEGIN
            FOR attempt IN 1..200 LOOP
              acquired := pg_try_advisory_lock($RUBRIC_MUTATION_ACK);
              IF NOT acquired THEN RETURN; END IF;
              PERFORM pg_advisory_unlock($RUBRIC_MUTATION_ACK);
              PERFORM pg_sleep(0.05);
            END LOOP;
            RAISE EXCEPTION 'timed out waiting for rubric mutation acknowledgement';
          END
          \$\$;" \
      -c "INSERT INTO dimensions (rubric_version,key,name,display_order,radar_order)
          VALUES ('test-race','concurrent_dimension','Concurrent dimension',2,2);" \
      -c 'COMMIT;' 2>&1)"; then
    rubric_mutation_status=0
  else
    rubric_mutation_status=$?
  fi
else
  printf '  FAIL  concurrent rubric publisher did not reach its ready signal\n'
  fail=$((fail + 1))
  kill "$rubric_publish_pid" 2>/dev/null || true
  rubric_mutation_status=125
  rubric_mutation_out='publisher did not become ready'
fi

if wait "$rubric_publish_pid"; then
  rubric_publish_status=0
else
  rubric_publish_status=$?
fi
rubric_publish_pid=''

if [[ "$rubric_publish_status" -eq 0 ]]; then
  printf '  pass  concurrent first publication committed\n'
  pass=$((pass + 1))
else
  printf '  FAIL  concurrent first publication failed:\n        %s\n' \
    "$(first_line "$(<"$RACE_TMP/rubric-publish.out")")"
  fail=$((fail + 1))
fi

# Match the serialization message specifically. 'rubric test-race' alone would
# also match trg_dimension_definition_immutable's "is used by final
# evaluations", so the test would still pass if the advisory lock stopped
# working and the immutability check happened to catch it instead.
if [[ "$rubric_mutation_status" -ne 0 \
      && "$rubric_mutation_out" == *'being edited or finalized concurrently'* ]]; then
  printf '  pass  concurrent rubric mutation was serialized and rejected\n'
  pass=$((pass + 1))
else
  printf '  FAIL  concurrent rubric mutation was not rejected after publication:\n        %s\n' \
    "$(first_line "$rubric_mutation_out")"
  fail=$((fail + 1))
fi

expect 'the first publication retains the registered rubric shape' \
  "SELECT e.status::text||'/'||(
     SELECT count(*) FROM dimensions d WHERE d.rubric_version='test-race'
   )::text
   FROM evaluations e WHERE e.id=$RUBRIC_RACE_EVAL;" \
  'published/1'

# The contract must serialize publication against *definition* edits without
# serializing publication against itself. Keying the advisory identity on the
# rubric alone and taking it exclusively made two editors publishing unrelated
# games under rubric 1.0 fail with a spurious serialization error.
fixture 'create two complete drafts on one rubric for two different games' \
  "INSERT INTO rubric_versions (
     version,expected_dimension_count,expected_subcriteria_per_dimension,locked_at
   ) VALUES ('test-par',1,1,'2026-08-08');
   INSERT INTO dimensions (rubric_version,key,name,display_order,radar_order)
   VALUES ('test-par','par_dimension','Parallel dimension',1,1);
   INSERT INTO subcriteria (dimension_id,key,name,display_order)
   SELECT id,'par_subcriterion','Parallel subcriterion',1
   FROM dimensions WHERE rubric_version='test-par';
   INSERT INTO evaluations (
     game_id,scope_id,rubric_version,version_number,edition_scope,mode_scope,platform_scope,
     build_or_patch_scope,status,evidence_status,confidence,evidence_cutoff_at,
     score_provenance,calibration_round,one_line_experience,primary_pull,primary_risk
   ) VALUES
     ($RETURNAL_GAME,$RETURNAL_SCOPE,'test-par',1,'par','par',ARRAY['PC'],'par','draft',
      'verified','medium','2026-08-06','calibration','round_1','par','par','par'),
     ($REDFALL_GAME,$REDFALL_SCOPE,'test-par',1,'par','par',ARRAY['PC'],'par','draft',
      'verified','medium','2026-08-06','calibration','round_1','par','par','par');
   INSERT INTO subcriterion_scores (evaluation_id,subcriterion_id,score,rationale)
   SELECT e.id,s.id,1.5,'parallel publication fixture'
   FROM evaluations e
   JOIN subcriteria s ON s.key='par_subcriterion'
   JOIN dimensions d ON d.id=s.dimension_id AND d.rubric_version='test-par'
   WHERE e.rubric_version='test-par';
   INSERT INTO dimension_assessments (evaluation_id,dimension_id,confidence)
   SELECT e.id,d.id,'medium'
   FROM evaluations e
   JOIN dimensions d ON d.rubric_version='test-par'
   WHERE e.rubric_version='test-par';"

PAR_FIRST_EVAL="(SELECT id FROM evaluations
  WHERE game_id=$RETURNAL_GAME AND rubric_version='test-par' AND version_number=1)"
PAR_SECOND_EVAL="(SELECT id FROM evaluations
  WHERE game_id=$REDFALL_GAME AND rubric_version='test-par' AND version_number=1)"
PAR_PUBLISH_READY=8211021

# The other two races have the competing session signal back before it ends.
# That cannot work here, because the competing session is expected to *succeed*
# and commit — a session-level signal dies with the psql process the moment it
# does, so the holder could never observe it. Instead the first publication
# holds its transaction open for a fixed window that comfortably outlasts the
# second one, and the second session's lock_timeout is set well inside that
# window so genuine contention fails rather than being waited out into a false
# pass.
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q \
  -c 'BEGIN;' \
  -c "SET LOCAL statement_timeout='30s';" \
  -c "UPDATE evaluations SET status='published',published_at='2026-08-08'
      WHERE id=$PAR_FIRST_EVAL;" \
  -c "SELECT pg_advisory_lock($PAR_PUBLISH_READY);" \
  -c 'SELECT pg_sleep(6);' \
  -c 'COMMIT;' >"$RACE_TMP/parallel-publish.out" 2>&1 &
parallel_publish_pid=$!

if wait_for_advisory_lock "$PAR_PUBLISH_READY" "$parallel_publish_pid"; then
  if parallel_second_out="$(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q \
      -c 'BEGIN;' \
      -c "SET LOCAL lock_timeout='2s'; SET LOCAL statement_timeout='4s';" \
      -c "UPDATE evaluations SET status='published',published_at='2026-08-08'
          WHERE id=$PAR_SECOND_EVAL;" \
      -c 'COMMIT;' 2>&1)"; then
    printf '  pass  a second game publishes while the first is still uncommitted\n'
    pass=$((pass + 1))
  else
    printf '  FAIL  concurrent publication of an unrelated game was rejected:\n        %s\n' \
      "$(first_line "$parallel_second_out")"
    fail=$((fail + 1))
  fi
else
  printf '  FAIL  parallel publisher did not reach its ready signal\n'
  fail=$((fail + 1))
  kill "$parallel_publish_pid" 2>/dev/null || true
fi

if wait "$parallel_publish_pid"; then
  printf '  pass  the first publication still commits alongside it\n'
  pass=$((pass + 1))
else
  printf '  FAIL  the first publication failed:\n        %s\n' \
    "$(first_line "$(<"$RACE_TMP/parallel-publish.out")")"
  fail=$((fail + 1))
fi
parallel_publish_pid=''

expect 'both games are published under the shared rubric' \
  "SELECT count(*) FROM evaluations
   WHERE rubric_version='test-par' AND status='published';" '2'

# The shared mode must not weaken the guarantee the exclusive mode provided.
reject 'a definition edit is still refused while a publication holds the rubric' \
  "UPDATE evaluations SET status='published',published_at='2026-08-08'
   WHERE id=$PAR_SECOND_EVAL;
   INSERT INTO dimensions (rubric_version,key,name,display_order,radar_order)
   VALUES ('test-par','late_dimension','Late dimension',2,2);" \
  'rubric test-par is used by final evaluations'

echo
echo '== 9. Existing scalar constraints still hold on editable drafts =='
reject 'score above 2' \
  "UPDATE subcriterion_scores SET score=2.5 WHERE evaluation_id=$SCRATCH AND subcriterion_id=$SUB1;" \
  'subcriterion_score_range'
reject 'score off the 0.5 grid' \
  "UPDATE subcriterion_scores SET score=1.25 WHERE evaluation_id=$SCRATCH AND subcriterion_id=$SUB1;" \
  'subcriterion_score_half_steps'
reject 'duplicate source_key' \
  "INSERT INTO evidence_sources (source_key,title,evidence_tier,source_category)
   SELECT source_key,'duplicate','B','critic' FROM evidence_sources LIMIT 1;" \
  'evidence_sources_source_key_unique'
accept 'two evidence sources may share a title' \
  "INSERT INTO evidence_sources (source_key,title,evidence_tier,source_category)
   VALUES ('src_regression_1','Same title','B','technical'),
          ('src_regression_2','Same title','B','technical');"
reject 'pre-release status must declare evidence maturity' \
  "UPDATE evaluations SET evidence_status='pre_release',confidence='low'
   WHERE id=$SCRATCH;" \
  'pre_release_declares_maturity'

echo
echo '-------------------------------------------'
printf '%d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
