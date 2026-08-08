# ADR 0009 — Final evaluation and rubric integrity

**Status:** Accepted · 2026-08-08

## Context

The first database contract rejected an incomplete published evaluation only by
joining through the rubric rows that happened to exist. An unknown rubric with
no dimensions therefore made the expected set empty and passed vacuously. Final
scores, evidence links and shared source metadata also remained editable, and
lineage checks covered only the row carrying an outgoing supersession link.

The written product contract is unambiguous on one important point: the live-row
uniqueness boundary is `(game, rubric version)`, not game alone. A rubric change
may preserve both published interpretations while the public application makes
an explicit cut-over choice.

## Decision

1. `rubric_versions` is a migration-owned registry. Evaluations and dimensions
   reference it, and each registered version declares a non-zero expected shape.
   Publication verifies that the shape exists before checking every score and
   per-dimension confidence row. A future rubric requires an explicit migration.
2. `published` and `superseded` are both final snapshots. Required publication
   fields and complete rubric coverage apply to both. Final evaluation fields,
   owned children, existing revision events, linked evidence-source metadata and
   linked tag definitions cannot be rewritten. Corrections create a new version
   (and, when source metadata itself changed, a new source identity).
3. Supersession is rubric-local and bidirectional. A final successor requires a
   superseded predecessor; a superseded row has exactly one final successor.
   The transition is checked at transaction commit so predecessor and successor
   can be finalized atomically.
4. Child mutations take a conflicting lock on their owner evaluation. Rubric
   definition edits and finalization also coordinate on a shared transaction
   identity, in two modes: finalization takes it in *shared* mode, definition
   edits take it *exclusively*. A conflict fails fast with a retryable
   serialization error. This prevents two individually valid editor
   transactions from committing an invalid combined state, while leaving
   unrelated evaluations free to publish at the same time — the contract needs
   publication to exclude contract edits, not to exclude other publications.
5. Generated seeds insert new evaluations as drafts, attach children only to
   transaction-local newly inserted IDs, verify any pre-existing natural key is
   the same snapshot, and finalize last. When appending history, the declared
   existing predecessor may make the sole allowed `published → superseded`
   transition. Corpus-wide validation rejects conflicting global source keys.
6. The partial unique index remains one published evaluation per
   `(game_id, rubric_version)`. `PUBLIC_RUBRIC_VERSION` is the application-level
   selector for the single rubric rendered on public pages.

## Consequences

- A typo such as `1.O`, an empty registered rubric, cross-rubric children and an
  incomplete final history row are database errors rather than editorial bugs.
- Re-seeding a published snapshot is a genuine no-op; changed same-version data
  fails instead of silently drifting. Appending a correctly linked version is
  supported transactionally.
- The known Returnal and Redfall corrections are an explicit pre-freeze data
  patch in migration `0002`, so an upgraded 0001 database matches a fresh one.
- Rubric definition edits are intentionally low-throughput, serialized
  editorial operations. That is preferable to allowing a rare race to rewrite
  public history. Publication is not serialized against itself: two editors
  publishing different games under the same rubric proceed independently.
- The two known content corrections are asserted, not merely attempted. Each
  patch is guarded on the exact pre-hardening value, so a database holding any
  other text would silently keep it — and the immutability triggers installed
  moments later would freeze it permanently. Migration `0002` therefore
  verifies its own patches and aborts rather than freezing uncorrected data.
- Platform-specific score overrides remain a separate product/schema decision;
  this ADR does not make the currently non-authoritative column look functional.

## Rejected alternatives

- **One published row globally per game.** This contradicts the Master Plan and
  erases the ability to preserve an evaluation under the rubric that produced
  it.
- **Mutable shared evidence and tag rows.** Frozen links alone do not preserve a
  snapshot when the linked title, URL, tier or label can change underneath it.
- **Application-only validation.** Imports, migrations and future editor paths
  all reach Postgres; historical integrity must hold at that boundary too.
