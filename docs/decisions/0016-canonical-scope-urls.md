# ADR 0016 — A game's primary profile scope owns its canonical URL

**Status:** Accepted · 2026-08-13
**Context:** [ADR 0014](0014-profile-scopes.md) introduced profile scopes and
left the public URL question explicitly open. This closes it.

## Problem

A game may publish several simultaneously current profiles — The Long Dark's
Survival and Wintermute are two evaluations of two different experiences, and
neither summarises the other. So `/games/the-long-dark` is ambiguous: it has to
answer with *something*, and every candidate answer has consequences for
canonicalisation, the sitemap, share cards and how a search result reads.

ADR 0014 deliberately refused to guess and listed three options. This records the
one chosen.

## Decision

```
/games/<slug>              the primary scope
/games/<slug>/<scope-key>  every sibling scope
```

The bare game URL answers with the game's **primary Game Profile**, not with an
index or a chooser. Most games have exactly one evaluated experience, so for
almost the whole catalogue this is the only URL that exists, and it stays clean.

There is no intermediary game-overview page. A person who searches for a game
wants the profile, not a menu.

### Primary is explicit data, never derived

`profile_scopes.is_primary`. Not the lowest `display_order`, not the first row.

Ordering is presentation: an editor reordering two scopes in a listing must not
silently move a canonical URL, because that is how a page loses its inbound
links and its search history. The two concepts are separated so that cannot
happen, and a test asserts that changing `display_order` leaves primacy alone.

### Two invariants, both in the database

1. **At most one primary scope per game** — a partial unique index.
2. **A game that publishes anything publishes its primary scope** — a deferred
   constraint trigger.

The second is the interesting one, and it is deliberately stronger than "a
primary scope exists". The weaker rule permits a state the public site cannot
answer for: primary scope still in draft, a sibling published, and
`/games/<slug>` therefore 404 while `/games/<slug>/<sibling>` resolves. The bare
game URL is the one people link, share and search for; it must resolve whenever
the game has any public content at all.

Editorially this says: publish the primary scope first, or make the scope you
are publishing the primary one. Both are one-line acts, and the error message
says so.

### One profile, one indexable address

- A sibling canonicalises to **its own** URL. Pointing it back at the game URL
  would tell a crawler that Wintermute's evaluation is a duplicate of
  Survival's, which is exactly backwards — they are different evaluations of
  different experiences.
- `/games/<slug>/<primary-key>` answers **308 to the bare game URL**. It is a
  real address that people will type and that an editor will copy out of the
  admin UI, so it must not 404 — but rendering it would publish one profile at
  two indexable URLs. The redirect is prerendered, so it costs nothing at
  request time.
- The sitemap lists each publicly current profile exactly once, at its canonical
  address.
- Share cards and JSON-LD resolve per scope, so a shared Wintermute link cannot
  show Survival's numbers.

### Structured data models one game, several pages

The `WebPage` node is the profile and carries the profile's URL. The `VideoGame`
node is anchored on the game's URL and shared by every scope, because two scopes
are two pages *about the same game* rather than two competing descriptions of
one product. A sibling gets a three-level breadcrumb under the game.

## Consequences

- Every seeded game is single-scope, so nothing about the public site changes
  today: three URLs, unchanged. The capability is proved against synthetic
  two-scope corpora.
- A game cannot publish a sibling before its primary. That is a real editorial
  constraint and it is the price of the bare URL always resolving.
- Renaming a scope key changes a sibling's public URL. This is unchanged from
  ADR 0014, where a key is identity and renaming one is a migration.

## Rejected alternatives

- **A game-overview page at `/games/<slug>`.** It puts a menu between a person
  and the answer they searched for, and for the ~99% of games with one scope it
  is a page with one link on it.
- **Every scope under a key, including the primary
  (`/games/<slug>/<primary-key>`), with the bare URL redirecting.** Symmetrical,
  and it makes the common case ugly: `/games/returnal/default` is the canonical
  URL for a game with one evaluated experience, which reads like a bug.
- **One page with a scope switcher on one URL.** One canonical URL for two
  evaluations means one of them is unreachable to a crawler and unlinkable by a
  reader, and the profiles are genuinely separate documents with separate
  evidence and separate publication dates.
- **404 the primary key instead of redirecting.** Simplest, and it turns a URL
  an editor will reasonably construct into a dead end for no gain.
