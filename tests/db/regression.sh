#!/usr/bin/env bash
#
# Postgres regression suite for the database contract.
#
#   DATABASE_URL=postgres://user@host:port/dbname tests/db/regression.sh
#
# Creates the schema from scratch via the canonical `npm run db:setup` path,
# then exercises the invariants that only a real database can prove: deferred
# constraint triggers, partial unique indexes, self-referencing foreign keys and
# the derived `dimension_scores` view.
#
# The database named in DATABASE_URL is DROPPED and recreated.

set -uo pipefail

: "${DATABASE_URL:?DATABASE_URL is not set}"

DB_NAME="$(basename "${DATABASE_URL%%\?*}")"
ADMIN_URL="${DATABASE_URL%/*}/postgres"

pass=0
fail=0

# Run SQL in its own transaction and assert it is rejected at COMMIT.
reject() {
  local label="$1" sql="$2" want="${3:-}"
  local out
  if out="$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "BEGIN;" -c "$sql" -c "COMMIT;" 2>&1)"; then
    printf '  FAIL  %s — accepted, expected rejection\n' "$label"; fail=$((fail + 1)); return
  fi
  if [[ -n "$want" && "$out" != *"$want"* ]]; then
    printf '  FAIL  %s — rejected for the wrong reason:\n        %s\n' \
      "$label" "$(printf '%s' "$out" | head -1)"; fail=$((fail + 1)); return
  fi
  printf '  pass  %s\n' "$label"; pass=$((pass + 1))
}

# Assert SQL is accepted.
accept() {
  local label="$1" sql="$2"
  if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "BEGIN;" -c "$sql" -c "COMMIT;" >/dev/null 2>&1; then
    printf '  pass  %s\n' "$label"; pass=$((pass + 1))
  else
    printf '  FAIL  %s — rejected, expected success\n' "$label"; fail=$((fail + 1))
  fi
}

# Assert a scalar query returns an expected value.
expect() {
  local label="$1" sql="$2" want="$3" got
  got="$(psql "$DATABASE_URL" -q -t -A -c "$sql" 2>&1 | grep -v '^$' | tail -1)"
  if [[ "$got" == "$want" ]]; then
    printf '  pass  %s (%s)\n' "$label" "$got"; pass=$((pass + 1))
  else
    printf '  FAIL  %s — expected %s, got %s\n' "$label" "$want" "$got"; fail=$((fail + 1))
  fi
}

echo "== 1. Canonical deployment from an empty database =="
psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" \
                  -c "CREATE DATABASE \"$DB_NAME\";" >/dev/null 2>&1
if npm run --silent db:setup >/dev/null 2>&1; then
  printf '  pass  npm run db:setup succeeded on an empty database\n'; pass=$((pass + 1))
else
  printf '  FAIL  npm run db:setup failed\n'; fail=$((fail + 1)); exit 1
fi
expect "dimension_scores view installed by migration" \
  "SELECT count(*) FROM information_schema.views WHERE table_name='dimension_scores';" "1"
expect "constraint triggers installed by migration" \
  "SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal;" "4"
expect "check constraints installed by migration" \
  "SELECT count(*) FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace;" "6"
expect "all 24 dimensions carry a precise score" \
  "SELECT count(*) FROM dimension_scores WHERE score IS NOT NULL;" "24"

echo
echo "== 2. Seed idempotence =="
before="$(psql "$DATABASE_URL" -t -A -c "SELECT count(*) FROM evidence_sources;")"
npm run --silent db:seed >/dev/null 2>&1
npm run --silent db:seed >/dev/null 2>&1
expect "evidence_sources unchanged after two extra seed runs" \
  "SELECT count(*) FROM evidence_sources;" "$before"
expect "evaluations unchanged" "SELECT count(*) FROM evaluations;" "3"
expect "subcriterion scores unchanged" "SELECT count(*) FROM subcriterion_scores;" "120"

echo
echo "== 3. Published-completeness: UPDATE bypasses (finding 2) =="
# A draft evaluation to retarget rows into. Draft status means it carries no
# completeness obligation of its own.
psql "$DATABASE_URL" -q -c "
INSERT INTO evaluations (game_id, rubric_version, version_number, edition_scope,
  mode_scope, platform_scope, build_or_patch_scope, status, evidence_status,
  confidence, evidence_cutoff_at, score_provenance)
SELECT g.id,'1.0',900,'draft','draft',ARRAY['PC'],'draft','draft','verified',
  'medium','2026-08-06','calibration_round_1'
FROM games g WHERE g.slug='alan-wake-2'
ON CONFLICT DO NOTHING;" >/dev/null 2>&1

AW="(SELECT e.id FROM evaluations e JOIN games g ON g.id=e.game_id WHERE g.slug='alan-wake-2' AND e.version_number=1)"
DRAFT="(SELECT e.id FROM evaluations e JOIN games g ON g.id=e.game_id WHERE g.slug='alan-wake-2' AND e.version_number=900)"
SUB1="(SELECT s.id FROM subcriteria s JOIN dimensions d ON d.id=s.dimension_id WHERE d.key='atmosphere' AND s.key='memory_residue')"
SUB2="(SELECT s.id FROM subcriteria s JOIN dimensions d ON d.id=s.dimension_id WHERE d.key='atmosphere' AND s.key='mood_strength')"
DIM1="(SELECT id FROM dimensions WHERE key='pacing' AND rubric_version='1.0')"
DIM2="(SELECT id FROM dimensions WHERE key='agency' AND rubric_version='1.0')"

reject "moving subcriterion_scores.evaluation_id away" \
  "UPDATE subcriterion_scores SET evaluation_id=$DRAFT WHERE evaluation_id=$AW AND subcriterion_id=$SUB1;" \
  "missing 1 subcriterion score row"

reject "retargeting subcriterion_scores.subcriterion_id" \
  "DELETE FROM subcriterion_scores WHERE evaluation_id=$AW AND subcriterion_id=$SUB1;
   UPDATE subcriterion_scores SET subcriterion_id=$SUB1 WHERE evaluation_id=$AW AND subcriterion_id=$SUB2;" \
  "missing 1 subcriterion score row"

reject "moving dimension_assessments.evaluation_id away" \
  "UPDATE dimension_assessments SET evaluation_id=$DRAFT WHERE evaluation_id=$AW AND dimension_id=$DIM1;" \
  "missing 1 per-dimension confidence record"

reject "retargeting dimension_assessments.dimension_id" \
  "DELETE FROM dimension_assessments WHERE evaluation_id=$AW AND dimension_id=$DIM1;
   UPDATE dimension_assessments SET dimension_id=$DIM1 WHERE evaluation_id=$AW AND dimension_id=$DIM2;" \
  "missing 1 per-dimension confidence record"

reject "deleting a score row (regression)" \
  "DELETE FROM subcriterion_scores WHERE evaluation_id=$AW AND subcriterion_id=$SUB1;" \
  "missing 1 subcriterion score row"

# Deferral must survive: an editor may legitimately remove and replace a row
# within one transaction. Validation runs at COMMIT, not per statement.
accept "delete-then-reinsert within one transaction still commits" \
  "DELETE FROM subcriterion_scores WHERE evaluation_id=$AW AND subcriterion_id=$SUB1;
   INSERT INTO subcriterion_scores (evaluation_id, subcriterion_id, score, rationale)
   VALUES ($AW, $SUB1, 2, 'reinstated within the same transaction');"

accept "moving a row out and back within one transaction still commits" \
  "UPDATE subcriterion_scores SET evaluation_id=$DRAFT WHERE evaluation_id=$AW AND subcriterion_id=$SUB1;
   UPDATE subcriterion_scores SET evaluation_id=$AW WHERE evaluation_id=$DRAFT AND subcriterion_id=$SUB1;"

expect "score rows intact after all rejections" \
  "SELECT count(*) FROM subcriterion_scores;" "120"
expect "confidence records intact after all rejections" \
  "SELECT count(*) FROM dimension_assessments;" "24"

echo
echo "== 4. linked_evidence_count counts distinct sources (finding 3) =="
# Link one source to a dimension twice: once at dimension level, once narrowed
# to a subcriterion. The unique index permits it; the count must still be 1.
psql "$DATABASE_URL" -q -c "
INSERT INTO evaluation_evidence_links (evaluation_id, evidence_source_id, dimension_id, subcriterion_id)
SELECT $AW, l.evidence_source_id, l.dimension_id, $SUB1
FROM evaluation_evidence_links l
WHERE l.evaluation_id=$AW AND l.dimension_id=(SELECT id FROM dimensions WHERE key='atmosphere' AND rubric_version='1.0')
LIMIT 1
ON CONFLICT DO NOTHING;" >/dev/null 2>&1

expect "two links for one source count as two rows" \
  "SELECT count(*) FROM evaluation_evidence_links l JOIN dimensions d ON d.id=l.dimension_id WHERE l.evaluation_id=$AW AND d.key='atmosphere';" "2"
expect "…but linked_evidence_count reports one source" \
  "SELECT linked_evidence_count FROM dimension_scores ds JOIN dimensions d ON d.id=ds.dimension_id WHERE ds.evaluation_id=$AW AND d.key='atmosphere';" "1"

echo
echo "== 5. Derived scores never gain false precision (finding 4, prior pass) =="
expect "one missing row yields a range, not a score" \
  "BEGIN; SET CONSTRAINTS ALL DEFERRED;
   DELETE FROM subcriterion_scores WHERE evaluation_id=$AW AND subcriterion_id=$SUB1;
   SELECT coalesce(score::text,'-')||'/'||coalesce(low_estimate::text,'-')||'-'||coalesce(high_estimate::text,'-')
   FROM dimension_scores ds JOIN dimensions d ON d.id=ds.dimension_id
   WHERE ds.evaluation_id=$AW AND d.key='atmosphere'; ROLLBACK;" \
  "-/8.0-10.0"

expect "two missing rows yield no score at all" \
  "BEGIN; SET CONSTRAINTS ALL DEFERRED;
   DELETE FROM subcriterion_scores WHERE evaluation_id=$AW AND subcriterion_id IN ($SUB1,$SUB2);
   SELECT coalesce(score::text,'-')||'/'||coalesce(low_estimate::text,'-')
   FROM dimension_scores ds JOIN dimensions d ON d.id=ds.dimension_id
   WHERE ds.evaluation_id=$AW AND d.key='atmosphere'; ROLLBACK;" \
  "-/-"

echo
echo "== 6. Supersession lineage (finding 4) =="
reject "supersedes a nonexistent evaluation" \
  "UPDATE evaluations SET supersedes_evaluation_id='00000000-0000-0000-0000-000000000001' WHERE id=$AW;" \
  "violates foreign key constraint"
reject "supersedes itself" \
  "UPDATE evaluations SET supersedes_evaluation_id=id WHERE id=$AW;" \
  "evaluation_does_not_supersede_itself"
reject "supersedes another game's evaluation" \
  "UPDATE evaluations SET supersedes_evaluation_id=(SELECT e.id FROM evaluations e JOIN games g ON g.id=e.game_id WHERE g.slug='redfall') WHERE id=$AW;" \
  "different game"
reject "supersedes a later version" \
  "UPDATE evaluations SET supersedes_evaluation_id=$DRAFT WHERE id=$AW;" \
  "is not earlier"
# Alan Wake 2's live evaluation is version 1, so a legitimate predecessor has to
# sit below it. Renumber the scratch draft to version 0 and link forward.
accept "a valid forward link is accepted" \
  "UPDATE evaluations SET version_number=0 WHERE id=$DRAFT;
   UPDATE evaluations SET supersedes_evaluation_id=(SELECT e.id FROM evaluations e JOIN games g ON g.id=e.game_id WHERE g.slug='alan-wake-2' AND e.version_number=0) WHERE id=$AW;"
reject "deleting an evaluation another still supersedes" \
  "DELETE FROM evaluations WHERE version_number=0;" \
  "violates foreign key constraint"

psql "$DATABASE_URL" -q -c "
UPDATE evaluations SET supersedes_evaluation_id=NULL WHERE version_number=1;
DELETE FROM evaluations WHERE version_number=0;" >/dev/null 2>&1

echo
echo "== 7. Pre-existing invariants still hold =="
reject "score above 2" "UPDATE subcriterion_scores SET score=2.5 WHERE score=2;" "subcriterion_score_range"
reject "score off the 0.5 grid" "UPDATE subcriterion_scores SET score=1.25 WHERE score=1;" "half_steps"
reject "duplicate source_key" \
  "INSERT INTO evidence_sources (source_key,title,evidence_tier,source_category) SELECT source_key,'other','B','critic' FROM evidence_sources LIMIT 1;" \
  "evidence_sources_source_key_unique"
accept "two sources may share a title" \
  "INSERT INTO evidence_sources (source_key,title,evidence_tier,source_category) VALUES ('src_t1','Same title','B','technical'),('src_t2','Same title','B','technical');"
reject "second published evaluation for one game" \
  "INSERT INTO evaluations (game_id, rubric_version, version_number, edition_scope, mode_scope, platform_scope, build_or_patch_scope, status, evidence_status, confidence, evidence_cutoff_at, score_provenance, one_line_experience, primary_pull, primary_risk, published_at)
   SELECT game_id,'1.0',902,'x','y',ARRAY['z'],'b','published','verified','medium','2026-08-06','calibration_round_1','a','b','c',now() FROM evaluations WHERE version_number=1 LIMIT 1;" \
  "evaluations_one_published_per_game"
reject "pre-release without evidence maturity" \
  "UPDATE evaluations SET evidence_status='pre_release', confidence='low' WHERE id=$AW;" \
  "pre_release_declares_maturity"

echo
echo "-------------------------------------------"
printf '%d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]] || exit 1
