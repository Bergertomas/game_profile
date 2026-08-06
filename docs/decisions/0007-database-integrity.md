# ADR 0007 — Database integrity: derivation completeness, source identity, lineage

**Status:** Accepted · 2026-08-06
**Context:** Master Plan §13.1–13.2, §22.3, §23.3 (ADRs required for "score
storage/derivation"); SOP v0.2 §10.9

Recorded because these are exactly the class of decision Plan §23.3 says to
write down: how scores are derived and stored, and what the database will refuse.

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

Triggers also fire on DELETE against `subcriterion_scores` and
`dimension_assessments`, so rows cannot be stripped out from under an
already-published profile.

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
references it. Validation covers the application-side rules — history must be
marked `superseded`, only one evaluation may be published, and the current
evaluation must link to the most recent historical one.

No historical evaluation is seeded for the three calibration games, because none
exists: inventing one would be fabricated editorial history. The capability is
covered by tests over synthetic corpora and was verified end-to-end against
Postgres.

## 5. Evidence-ledger state is persisted

`evaluations.evidence_ledger` (`populated` / `pending`, defaulting to `pending`)
now lives in the database rather than only in the fixtures, so a
database-backed reader reaches the same conclusion the fixture-backed one does
and never prints a source count that understates the real basis for a score.

## Migration note

The project has never been deployed, so the schema is still a single initial
migration and it was regenerated in place rather than accumulating an ALTER
migration for pre-release changes. The first deployment establishes the baseline;
after that, changes here become ordinary incremental migrations.
