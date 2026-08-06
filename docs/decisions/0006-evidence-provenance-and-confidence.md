# ADR 0006 — Evidence provenance, per-dimension confidence and pre-release maturity

**Status:** Accepted · 2026-08-06
**Context:** Master Plan v0.6 §6.6, §9.3, §10.2, §12.3, §13.1; Project Context
v0.6 §17–§18; Editorial Evidence & Data Sourcing SOP v0.2

## Scope

Master Plan v0.6 and the SOP introduced evidence provenance, per-dimension
confidence, a pre-release operating model and provider-backed runtime data. This
ADR records the foundational parts implemented now — the ones that would
otherwise become migration debt — and what was deliberately left for Phase 2.

## Decisions

### 1. Per-dimension confidence is stored, not derived

Confidence is an editorial input, so it cannot live in the `dimension_scores`
view alongside the numbers it qualifies. A `dimension_assessments` table holds
`(evaluation_id, dimension_id, confidence, note)`. The view left-joins it and
also exposes a derived `linked_evidence_count`, matching the shape Plan §13.1
describes.

This is what lets the product say something an aggregate cannot. Redfall's
pattern is the demonstration: Atmosphere is High because the town was unchanged
by Game Update 4 and is well documented, while Structure, Execution and Pacing
are Low because Update 4 revised precisely those systems and almost no full
review covers the result. The confidence column maps the evidence gap.

### 2. Evidence carries a category and links to dimensions

`evidence_sources.source_category` is a required enum: direct play, critic,
technical, specialist/creator, player signal, first-party. It drives the public
source-category counts.

`evaluation_evidence_links` moved from a composite primary key to a surrogate
one. A single source routinely bears on several dimensions, so one row per
(source, dimension) pair is the point; the old key made that impossible. A
unique index with `NULLS NOT DISTINCT` keeps a source from being linked to the
same dimension twice, and a NULL dimension means profile-level evidence.

### 3. Source counts are withheld until the ledger is real

The calibration profiles were scored against broad critical consensus, recorded
here as a handful of truthful evidence *classes* rather than the 8–15 individual
records SOP §3 targets. Publishing "supported by 3 sources" would understate the
basis more than saying nothing does.

`evaluation.evidenceLedger` is therefore `pending` on all three seed profiles.
The trust line shows every other field and says "source records pending"; the
per-dimension counts stay hidden. It flips to `populated` when the Phase 2
evidence manager holds real records, and nothing else needs to change.

Wording throughout is "supported by", never "calculated from" (SOP §6). Sources
are evidence, not votes in an average.

### 4. Pre-release maturity is a first-class column

`evaluations.evidence_maturity` is a required enum whenever
`evidence_status = 'pre_release'`, and forbidden otherwise — both enforced by a
check constraint. "Pre-release" alone does not say whether anyone has played the
thing, which is the distinction the whole SOP §10 model turns on.

Validation additionally enforces: overall pre-release confidence cannot be High;
an `announced` profile cannot publish a precise score for all eight dimensions
(SOP §10.3); and a Medium-confidence pre-release profile targets at least three
substantive independent sources.

### 5. Pre-release recommendation blocks reuse the same three slots

The headings switch from *Great fit / Know before buying / Probably not for you*
to *Looks promising / Watch before buying / Biggest unknowns* (SOP §10.8), keyed
off `evidence_status` rather than a separate set of block types.

The three slots are semantically the same — positive fit, caveats, mismatch —
and the SOP describes the change as a switch in wording once a post-release
evaluation exists. Adding three more `block_type` enum values would not have
been migration debt either (Postgres adds enum values without a rewrite), so
this is a simplicity choice, not a forced one. If the slots genuinely diverge in
content later, adding values remains cheap.

### 6. Runtime data hangs off `games`, never off scores

`game_time_estimates` is provider-backed, keyed by `(game_id, provider)`, and
carries an `attribution_text` column for providers that require display credit.

It attaches to the game rather than the evaluation deliberately: runtime is
factual metadata and must never feed the eight dimensions. Pacing & Time Respect
judges whether time is *earned*, which is an editorial judgement a completion-
time average cannot make (SOP §7).

Per SOP §8, no HowLongToBeat integration is built. IGDB `game_time_to_beats` is
the intended first source, behind the same adapter.

## Deliberately not built

- IGDB adapter and ingestion. The schema is ready; the integration is Phase 3.
- The full clickable `Evidence & scoring` drawer with per-source lists. The
  profile-level fields Plan §6.6 lists are on the page today; the drawer belongs
  with the Phase 2 evidence manager that will populate it.
- Steam player-signal ingestion, pending the usage/commercial-terms review the
  SOP requires before it becomes a product dependency.
- Any actual pre-release profile. The machinery is built and tested so the first
  one is correct on day one, but no seeded game is pre-release.

## Consequences

- `dimensionConfidence` is required on every evaluation and validated for
  completeness across all eight dimensions.
- Two representations of the scoring rule still exist (TypeScript module and SQL
  view) and must change together. Both were re-verified against Postgres 16
  after this change: all 24 canonical totals, the per-dimension confidence join,
  the linked-evidence counts, and every check constraint.
