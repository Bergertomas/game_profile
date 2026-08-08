# ADR 0007 — Database integrity: derivation completeness, source identity, lineage

**Status:** Accepted · 2026-08-06
**Hardened by:** [ADR 0009](0009-final-evaluation-and-rubric-integrity.md) —
rubric identity, final-snapshot immutability and bidirectional lineage.
**Context:** Master Plan §13.1–13.2, §22.3, §23.3 (ADRs required for "score
storage/derivation"); SOP v0.2 §10.9

Recorded because these are exactly the class of decision Plan §23.3 says to
write down: how scores are derived and stored, and what the database will refuse.

## 0. The contract ships inside the migrations

`npm run db:migrate` is the canonical database setup path, and the only one.
`0000_schema.sql` creates the tables; `0001_contract.sql` installs the initial
checks and `dimension_scores` view; later contract migrations harden those
invariants without creating a second setup path. Drizzle applies all pending
migrations transactionally, so the schema is never left half-built.

The contract previously lived in a standalone `lib/db/constraints.sql` applied
by a second, documented-but-manual command. A normal migration-only deployment
therefore produced a schema that silently accepted incomplete published
evaluations and reported false precision from partially-scored dimensions —
every invariant below existed only for whoever remembered step two. That file is
gone; its content is the migration.

`npm run db:seed` loads the (idempotent) generated data afterwards, and
`npm run db:setup` runs both. Structure and data stay separate commands because
they have different lifecycles, but neither is optional folklore.

## 1. The derived view aggregates the expected set, not the present set

The `dimension_scores` view previously grouped over whatever `subcriterion_scores`
rows existed. A dimension missing two of its five rows therefore reported
`unknown_count = 0` and a confident, precise total from the other three — a
false 6.0 where the truth was "we have three of five values". A dimension with
no rows at all simply vanished from the view.

The view now builds the complete expected set first — every dimension of the
evaluation's rubric version, every subcriterion of each — and LEFT JOINs the
scores onto it. A missing row is indistinguishable from an explicit `unknown`,
which is the honest reading: there is no value either way. `expected_count` and
`present_count` are exposed so a caller can tell the two apart when it matters.

The application layer is deliberately **stricter**: `deriveDimensionScore`
throws on a missing key rather than treating it as unknown. There, a gap means
an authoring bug, and failing loudly is right. In SQL the same gap may mean
partially-entered editorial work, and degrading honestly is right.

## 2. Publish completeness is enforced, not assumed

Deferrable constraint triggers reject a published evaluation that lacks a score
row for any expected subcriterion, or a confidence record for any dimension.
`DEFERRABLE INITIALLY DEFERRED` so a seed or an editor can write the evaluation,
then its children, then commit; the check runs once at COMMIT.

Triggers also fire on **DELETE or UPDATE** against `subcriterion_scores` and
`dimension_assessments`, so rows cannot be stripped out from under an
already-published profile — nor quietly retargeted away from it. An UPDATE that
changes `evaluation_id`, `subcriterion_id` or `dimension_id` leaves the original
evaluation short of a required record just as a DELETE does; the trigger checks
`OLD.evaluation_id`, the evaluation that lost the row. The row's new owner can
only have gained one, and its primary key already prevents duplicates there.

Deferral is what makes this usable: an editor may legitimately delete and
reinsert a score, or move a row out and back, inside one transaction. The check
runs at COMMIT, so multi-step editorial work completes before it is judged.

If an editor genuinely has no evidence for a subcriterion, the answer is to
record an explicit `unknown`, not to omit the row. Absence of evidence is a
publishable editorial statement; absence of a row is a data defect.

## 3. Evidence sources are identified by key, never by title

`evidence_sources.source_key` is a required unique column carrying the stable
editorial id (`src_aw2_technical_analysis`). Seeding previously resolved sources
by title, which is wrong twice over: titles are not unique — "Digital Foundry
performance analysis" describes a hundred different articles — so distinct
sources silently merge, and re-running the seed duplicates rows.

Every statement in the generated seed is now `ON CONFLICT … DO NOTHING`, and
`tests/seed-sql.test.ts` asserts it. Re-running the seed is a verified no-op.

## 4. Supersession is a real foreign key

`supersedes_evaluation_id` self-references `evaluations.id` with
`ON DELETE RESTRICT`, so a lineage cannot point at a missing evaluation and
history cannot be deleted out from under its successor (Plan §25.12). Three
further rules are enforced by check constraint and trigger: an evaluation may
not supersede itself, may not supersede another game's evaluation, and may not
supersede a version equal to or later than its own.

The typed model gained `GameWithEvaluation.history`, and the seed generator
emits a chain oldest-first so each predecessor exists before its successor
references it.

Validation covers **every edge of the chain**, not only the newest one. Ordered
by version: the oldest evaluation supersedes nothing, and each later one
supersedes exactly its immediate predecessor, in the same game, at a strictly
earlier version. Checking only the final link left a three-version chain free to
carry a broken, skipped or reversed link in its middle.

The generator emits the **declared** link resolved from the typed chain, never
one inferred from sort order. Inferring would let it silently repair malformed
data into plausible-looking SQL that disagreed with its source; instead
validation rejects the chain and generation fails. Evaluation references are
qualified by `(game slug, rubric_version, version_number)` to match the
database's uniqueness contract — version 1 may legitimately exist twice for one
game under two rubric versions.

No historical evaluation is seeded for the three calibration games, because none
exists: inventing one would be fabricated editorial history. The capability is
covered by tests over synthetic corpora and was verified end-to-end against
Postgres.

## 5. Evidence counts are counts of sources

`dimension_scores.linked_evidence_count` counts `DISTINCT evidence_source_id`,
not link rows. One source may reasonably be linked to a dimension twice — once at
dimension level, once narrowed to a subcriterion — and it is still one source
supporting that dimension. `COUNT(*)` overstated support in exactly the place
the public page says "supported by N linked sources".

It remains a count of evidence and nothing more: never a divisor, a weight, or
an input to any score (SOP §6).

## 6. Evidence-ledger state is persisted

`evaluations.evidence_ledger` (`populated` / `pending`, defaulting to `pending`)
now lives in the database rather than only in the fixtures, so a
database-backed reader reaches the same conclusion the fixture-backed one does
and never prints a source count that understates the real basis for a score.

## Verification

`tests/db/regression.sh` exercises all of the above against a real Postgres
instance: it drops and recreates the database, builds it with `npm run db:setup`,
and asserts 33 scenarios — schema completeness after a migration-only deploy,
seed idempotence, each of the four UPDATE bypass routes, deferral surviving
legitimate multi-step edits, distinct source counting, false-precision
protection, and every lineage rule.

## Migration note

The project has never been deployed, so migrations were regenerated in place
rather than accumulating ALTERs for pre-release changes: `0000_schema.sql` and
`0001_contract.sql` are the baseline. The first deployment fixes that baseline;
after it, changes here become ordinary incremental migrations and
`0001_contract.sql` must not be edited retroactively.
