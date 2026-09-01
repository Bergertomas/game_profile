# ADR 0031 — Search uses an editorially governed static build-time index

**Status:** Accepted · 2026-08-30

**Context:** ADR 0017; Master Plan §§5.2, 9.7 and 9.10; the 25 August Search and
recognized-title resolutions; the accepted Gate A Search-first opening; and the
Opus engineering-readiness audit.

## Problem

Search is the dominant public journey, but the current public architecture is
static and has no request-time database. Earlier language mentioned Postgres
full-text/trigram as a possible implementation while ADR 0017 and the Master
Plan prohibit request-time Postgres on the public path. A public registry dump
would also expose titles the editor had not chosen to recognize publicly.

## Decision

MVP Search uses a static index emitted during the production build and shipped
with the public artifact.

The index contains:

- published profiles with canonical title, approved aliases and scope-aware
  identity;
- recognized-but-unprofiled registry records only when an explicit editorial
  inclusion flag permits public Search recognition;
- the minimum normalized fields required to distinguish published,
  recognized-but-unprofiled, ambiguous and unrecognized states.

Providers and imports may propose titles or aliases. They cannot set public
Search inclusion automatically. The editor owns the inclusion decision and
approved corrections survive refreshes.

The browser searches the emitted index. Public Search performs no request-time
Postgres, provider, search-service or language-model call. Publication and a new
build refresh the index through the same authoritative corpus boundary used by
the rest of the static product.

Recognized-but-unprofiled entries:

- render an honest inline unavailable state;
- may offer the governed private coverage-request action;
- receive no public profile stub, canonical route, sitemap entry or structured
  profile data;
- carry no inferred score, artwork, commitment band or availability promise.

Generated query/result states are not substantive indexable pages by default.
The exact Search page/component composition and durable discovery-results route
remain implementation decisions beneath this contract.

## Consequences

- Search moves ahead of full Compare in the public implementation sequence.
- `readRegistryTitles()` or its equivalent starts from games/aliases rather
  than published evaluations, but emits only editorially included records.
- The build fails on invalid aliases, ambiguous identity or a registry record
  that violates the inclusion contract rather than silently widening Search.
- The first index receives an explicit compressed-size budget and deterministic
  ordering tests. Partitioning or another search service requires measured
  scale evidence and a new ADR.
- Coverage requests remain a separate, rate-limited, no-PII public write path;
  the static index itself is read-only.

## Rejected for MVP

- request-time Postgres full-text/trigram;
- a live provider-backed Search request;
- a hosted search service without measured need;
- exporting every imported game automatically;
- Search-driven public stub pages;
- score, popularity or commercial ordering.
