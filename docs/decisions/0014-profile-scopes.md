# ADR 0014 — A game has profile scopes, and each one has its own history

**Status:** Accepted · 2026-08-13
**Context:** Rubric §1; [ADR 0009](0009-final-evaluation-and-rubric-integrity.md)
§6; Plan §13.2

## Problem

Rubric §1 is explicit:

> If different modes materially change the experience, create separate
> evaluations rather than averaging them together.

The contract could not hold two. Live-row uniqueness was
`(game_id, rubric_version)` and version numbering was
`(game_id, rubric_version, version_number)`, so **The Long Dark could publish
Survival or Wintermute and never both**. Whichever was published second would
either collide with the first or silently supersede it.

The workaround available in the old model — one evaluation covering both modes —
is the averaging the rubric forbids, and it would have had to be discovered by
an editor rather than refused by the database.

## Decision

`profile_scopes` sits between the game and its evaluation versions.

```
game
 └── scope "survival"    → v1 pre-release → v2 launch → v3 post-patch
 └── scope "wintermute"  → v1 launch      → v2 post-patch
```

Both scopes are simultaneously **current**. Each has its own published row, its
own version numbering starting at 1, and its own supersession chain.

| column | meaning |
|---|---|
| `key` | stable editorial handle, unique per game — `survival` |
| `label` | public name — `Survival` |
| `summary` | what the scope covers, and what it excludes |
| `display_order` | ordering within the game; ties break on `key` |

### Identity is the row, never the text

`edition_scope` and `mode_scope` stay **on the evaluation**, where they are the
immutable snapshot of what that version declared (Rubric §1 requires each
evaluation to declare its scope, and history must preserve the wording it was
published under).

Matching two evaluations by comparing those strings is precisely the fragile
mechanism this replaces. A re-worded mode is the same series; a materially
different mode is a different scope; **only an editor can tell those apart**, and
the FK is where that judgement is recorded.

So the two fields are not duplicates. `label` is navigation — *Wintermute* —
while `mode_scope` is the precise declared scope of one version — *"Story mode:
all five episodes, excluding Survival"*. They answer different questions.

### What moved to the scope

- `evaluations_scope_version` unique on `(scope_id, rubric_version, version_number)`
- `evaluations_one_published_per_scope_rubric` — one live row per scope per rubric
- supersession coherence, in both directions, is scope-local

### What the database enforces rather than trusts

- **The scope belongs to the evaluation's game**, as a composite foreign key
  against `profile_scopes (id, game_id)`. Two independent keys would let a
  Wintermute evaluation point at a Returnal scope; one composite key cannot.
- **A key is an identity, not prose** — `^[a-z0-9]+(-[a-z0-9]+)*$`, so a future
  authoring UI cannot mint `The Long Dark — Survival (2024 build)` as one.
- **A final evaluation cannot be moved to another series.**
- The seed refuses to run if any evaluation sits on a scope the corpus no longer
  declares. Renaming a key is a migration, not a content edit: left unguarded it
  would create a *second* series, publish version 1 into it, and leave two live
  profiles for one experience with neither obviously wrong.

### Scope metadata is editable; snapshots are not

`label`, `summary` and `display_order` are ordinary editorial metadata and the
seed upserts them. Renaming a scope rewrites no published judgement, unlike a
score or a rationale. This also converges an upgraded database — whose scopes
migration 0003 named — onto the authored values.

## Upgrade

Every game with evaluations receives one `default` scope holding its entire
history. That is exactly what the old one-series-per-game model meant, so
nothing is reinterpreted and no history is lost. The regression suite proves it
against a frozen pre-0003 seed rather than against an empty schema.

## Consequences

- One game can publish several current profiles. Two modes no longer compete for
  one row.
- Version numbers are per series, which is what a version has always meant. The
  alternative — forcing Wintermute to start at v2 because Survival exists —
  would make the number mean "how many profiles has this game had".
- The seeded corpus keeps one scope per game, so no page changes. The capability
  is proved against synthetic two-scope corpora in unit and database tests, the
  same way supersession chains already are. Inventing a real two-mode profile is
  editorial work Phase 2 owns.

## What still needs a product decision

**The public URL of a multi-scope game.** `/games/the-long-dark` is ambiguous
once two scopes are current, and the answer is an information-architecture and
SEO decision rather than an engineering one:

- one page per scope (`/games/the-long-dark/survival`), with the bare slug
  redirecting or serving a chooser;
- one page carrying a scope switcher, one canonical URL;
- a primary scope at the bare slug, siblings at sub-paths.

Each has different consequences for canonicalisation, the sitemap, share cards
and how a search result reads. Until it is decided, `getGameProfile(slug)`
returns the first scope in `(display_order, key)` order — deterministic, and
correct today because every seeded game has exactly one — and
`listProfileScopes(slug)` returns all of them for any surface that must see
them. Nothing in the model forecloses any of the three options.

## Rejected alternatives

- **Free-text `(game, edition, mode)` as the identity.** A typo or a re-wording
  forks the series; a deliberate narrowing looks identical to a correction. The
  rubric's distinction is editorial judgement, which text equality cannot carry.
- **Moving `edition_scope` / `mode_scope` onto the scope row.** It removes the
  apparent duplication, but a published evaluation's declared scope would then
  live on a mutable row — making frozen history editable through the side door
  that ADR 0009 closed everywhere else.
- **A scope column on `evaluations` instead of a table.** No place for the
  public label or ordering, and no foreign key to make the game/scope
  relationship enforceable.
