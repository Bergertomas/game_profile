# ADR 0028 — Purpose-governed product analytics

**Status:** Accepted · 2026-08-26
**Context:** Master Plan v0.9 §11.2;
`Should_I_Play_Public_Product_Resolutions_2026-08-25.md` §9.

## Decision

Quiet public release includes the minimum analytics needed to improve the three
core journeys and operate the site. Analytics is not used to optimize addictive
engagement or influence editorial scores, coverage decisions, commerce display
or result ordering.

Four data layers remain separate:

1. Cloudflare Web Analytics and Search Console for acquisition/traffic;
2. a small semantic product-event provider;
3. a restricted raw-query research dataset;
4. a first-party pseudonymous returning-browser record.

Ordinary product events use a version-controlled event registry. Event names
describe stable intentions—not current widgets—and properties are controlled.
They never contain raw queries, form contents, keystrokes, raw DOM text,
unrestricted URLs/query strings, contact details, advertising identifiers or
fingerprints.

Raw query text is never an ordinary event property. If enabled, it is stored in
a separate access-restricted dataset and is not linked to the returning-browser
identifier by default. Initial policy candidates are 90 days for unsanitized
queries and 180 days of inactivity for the first-party identifier.

The visitor record contains no name/email, has no cross-site use or
fingerprinting, and provides reset/opt-out. Before raw-query or cross-session
collection is enabled, the product publishes an accurate privacy notice and
completes a focused lawful-basis/consent, DPA, subprocessor, location, retention,
deletion/export, transfer and incident review.

Provider failure is non-blocking. No internal analytics dashboard is required.

## Consequences

- Instrumentation is validated against an allowlisted registry before provider
  transport.
- Raw query research cannot be added as a convenient extra property.
- Traffic-only measurement may run before the higher-risk layers; collection is
  staged by completed privacy controls rather than enabled as one bundle.
- The final event provider remains an open implementation choice.
