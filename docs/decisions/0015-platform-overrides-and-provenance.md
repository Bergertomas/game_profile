# ADR 0015 — Platform overrides, and provenance that describes ordinary work

**Status:** Accepted · 2026-08-13
**Context:** Rubric §1, §3; [ADR 0005](0005-score-provenance.md);
[ADR 0009](0009-final-evaluation-and-rubric-integrity.md) — which left platform
overrides explicitly open

Two model blockers, both of which had to be closed before Phase 2 authors real
profiles, because both would otherwise be discovered by an editor rather than
refused by the database.

---

## 1. Platform-specific subcriterion overrides

### Problem

Rubric §3:

> If platform performance differs materially, store platform-specific Technical
> Stability overrides/notes. Do not hide severe PC/console differences inside a
> single unexplained number.

`subcriterion_scores` carried a `platform_id` column under a primary key of
`(evaluation_id, subcriterion_id)`. That row can therefore name **at most one
platform** — the single shape the feature cannot use. The column was never
functional. ADR 0009 recorded it as an open decision rather than pretend
otherwise.

### Decision

A dedicated table, `subcriterion_platform_overrides`, keyed on
`(evaluation_id, subcriterion_id, platform_id)`. The dead column is dropped
rather than left looking usable.

**The base score stays canonical.** It is what the profile publishes, and it is
the only value that reaches a dimension total. `dimension_scores` is untouched,
and a regression assertion pins a dimension total across an override being
added — because an override that moved a total would have created a second,
competing profile with no page to publish it on.

Overrides are the exception layer. A severe PC/console divergence is recorded
explicitly instead of being averaged into one unexplained number, and without
forcing every evaluation to be duplicated per platform.

### What the database enforces

| rule | mechanism |
|---|---|
| no conflicting duplicate | primary key |
| an override has a base to deviate from | composite FK to `subcriterion_scores` |
| the value actually differs from the base | trigger |
| the platform is one the game ships on | trigger, against `game_platforms` |
| a rationale exists | check constraint |
| same 0–2 half-step grid, NULL for unknown | check constraints |
| frozen on a final evaluation | the existing child-immutability trigger |

The "must differ" rule is the one that carries meaning. A row repeating the base
value is not a deviation, and would make "this game diverges on that platform"
true of every platform anybody happened to mention.

### How a consumer asks for a platform reading

`subcriterion_platform_readings` — one row per (evaluation, subcriterion,
platform the game ships on), returning the override where one exists and the
base where it does not. So no caller writes the fallback itself, and no two
callers write it differently.

`is_override` is a column rather than something inferred: `COALESCE` cannot
distinguish *no override* from *an override recording unknown*, and those are
opposite claims.

### `platform_note` is not an override

It stays on the base row and is what it always was — prose context on the
canonical score ("PC is demanding at ray-traced presets"). The two calibration
fixtures using it record context, not deviations, so no seeded profile carries
an override and no approved total moves. A test pins that.

---

## 2. Score provenance

### Problem

`score_provenance` was a flat enum of calibration states: `calibration_round_1`,
`calibration_round_2`, `derived_pending_round_1_reconciliation`. It described the
three-profile calibration corpus exactly and described nothing else.

- An ordinary authored profile had **no value to carry**, and would have had to
  claim membership of a calibration round it was never part of.
- A fourth round meant a schema migration.
- "Pending reconciliation" is a state a profile passes *through*. Encoding
  workflow events as provenance values is how an enum grows without bound —
  and that particular value outlived its reason the moment ADR 0005 was
  reconciled.

### Decision

Two orthogonal things, separated.

```
score_provenance    the durable KIND — editorial | calibration | derived
calibration_round   WHICH round, as a row in a registry
```

| kind | meaning |
|---|---|
| `editorial` | authored against the rubric and editorially signed off. The normal case, and what Phase 2 authors every game as. |
| `calibration` | scored in a calibration round whose report publishes the approved totals. |
| `derived` | produced against the rubric without editorial sign-off, e.g. by tooling. |

`calibration_rounds` is a registry table carrying each round's label, date and
the report that published its totals — none of which an enum label could hold.
Round 3 is an inserted row, not a migration.

Three kinds is the whole vocabulary, and it is meant to stay that way. A new
workflow state is not this column's business.

### Enforced

- **A calibration profile names its round**, so "calibrated" is not an
  unfalsifiable claim — the round is what makes the totals checkable against a
  report.
- **A non-calibration profile has no round**, so an editorial profile cannot
  borrow a round's authority.
- **Derived numbers carry a note.** They have not been through review and a
  reader is entitled to know; silence would present them exactly like
  signed-off ones.
- **A round is frozen once final history cites it**, as evidence sources and tag
  definitions already are (ADR 0009). Its label appears on every profile citing
  it, so rewriting it would rewrite those profiles' explanation of themselves.

### Migration

`calibration_round_1|2` → `calibration` + the matching registry row.
`derived_pending_round_1_reconciliation` → `derived`, with the note that state
implied. The three calibration fixtures re-express unchanged in substance: no
total moves, and `tests/calibration.test.ts` still locks all 24 — now checking
each profile is traceable to a *named report* rather than to the word
"calibration".

## Consequences

- A normal new profile needs no schema change and pretends to belong to nothing.
- Platform variance is representable without redesigning the scoring system
  around platforms — which was an explicit non-goal, and remains one.
- Both migrations rewrite columns on rows the 0002 immutability triggers have
  frozen. Each disables user triggers for the structural rewrite only, changes
  no score, status or judgement, and re-runs the completeness and lineage
  assertions over every row before committing. The regression suite applies them
  to a populated database built from a frozen pre-0003 seed, not to an empty
  schema.

## Rejected alternatives

- **Platform scores as a first-class dimension of the scoring system.** Every
  dimension total would become a function of platform, which is a different
  product: eight numbers per platform, no canonical profile, and a page that
  cannot say what the game is like without first asking what you own.
- **A nullable `platform_id` on the score row, with the primary key widened.**
  Every score row would then need a platform, making "no platform variance" a
  thing that must be spelled rather than the default.
- **Keeping `score_provenance` as an enum and adding `editorial`.** It leaves
  the round in the same column, so Round 3 is still a migration and the value
  list still grows with the workflow.
