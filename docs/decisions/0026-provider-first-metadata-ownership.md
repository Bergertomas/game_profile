# ADR 0026 — Provider-first, provider-independent metadata ownership

**Status:** Accepted · 2026-08-26
**Context:** Master Plan v0.9 §7.4 and §10.1–10.6;
`Should_I_Play_Public_Product_Resolutions_2026-08-25.md` §7.

## Decision

Should I Play? uses one approved primary provider as the routine factual-data
backbone, but stores provider-independent identity and normalized public values.

Ownership has three layers:

1. provider-backed factual identity and availability;
2. Should I Play? normalization, facets and scope relationships;
3. Should I Play? editorial evaluation and interpretation.

Official publisher, developer, platform or storefront sources override the
primary provider for critical, volatile or disputed facts. A secondary provider
is used only for a material gap or conflict. Routine multi-provider averaging or
field voting is rejected. Approved manual corrections survive refreshes.

Each imported field retains enough provenance to identify its source, external
identity, retrieval time, transformation/mapping, approved override and public
value. Adapters isolate provider payloads from the public/application contract.
No public page depends on a live provider call, and provider failure cannot
remove a deployed profile.

Provider ratings, popularity, rankings, classifications and artwork availability
cannot calculate or alter Game Profile scores, Search/discovery order or
coverage priority. Artwork remains a separate rights-controlled record even
when a provider supplies an image URL.

IGDB is the preferred candidate, not an approved dependency, pending written
commercial/image terms and a representative approximately-30-game data test.
RAWG is the contingency. Manual entry remains a supported operating fallback.

## Consequences

- Internal concept IDs and correction records are durable across provider
  changes.
- Refresh jobs must be idempotent and cannot overwrite approved editorial or
  manual values silently.
- The launch may proceed on a documented manual fallback if no provider passes
  terms/coverage tests.
- Paying for a provider is an economic decision after demonstrated value, not a
  prerequisite implied by this architecture.
