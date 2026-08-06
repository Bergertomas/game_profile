# ADR 0003 — Public display order follows the radar, not the database

**Status:** Accepted · 2026-08-06
**Context:** Rubric v1.0 §22, Master Plan §15.2, Round 2 report §12

## Problem

The rubric defines two orders, and explicitly permits them to differ:

- **Canonical storage order** (Rubric §2–§9): Story, Execution, Structure,
  Agency, Pacing, Atmosphere, Thematic, Craft.
- **Radar order** (Rubric §22), clockwise from twelve o'clock: Story, Thematic,
  Atmosphere, Craft, Agency, Execution, Structure, Pacing — chosen so the ring
  progresses meaning/world → interactivity/play → delivery/time.

The documents do not say which order the exact score rows should use.

## Decision

Every public surface uses **radar order** — the score rows, the methodology page,
the compare table when it is built. Canonical order is retained for database
identities, storage and admin editing.

## Rationale

The radar and the score rows are a paired unit, and the pairing only works if a
reader can move between them. With the rows in storage order, the fourth row down
would be the fifth axis clockwise, and cross-referencing the shape against the
numbers would require re-reading a label every time. That defeats the reason the
two representations sit next to each other.

The rubric anticipates this: it fixes the radar order globally and then says the
underlying dimension IDs are unaffected.

## Consequences

- `dimensionsInRadarOrder()` is the default accessor; `dimensionsInCanonicalOrder()`
  exists for storage and future admin UI.
- A test asserts the two orders differ and that neither loses a dimension, so a
  future edit cannot quietly collapse them into one.
- The admin evaluation editor should score in **canonical** order, because that is
  the order the rubric document itself is written in and editors will work with
  the document open.
