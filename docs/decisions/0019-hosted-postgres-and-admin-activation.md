# ADR 0019 — Neon is the authoritative hosted Postgres, and remote admin is a near-term Phase-2 activation

**Status:** Accepted · 2026-08-15  
**Context:** Post-Phase-2B checkpoint. Records the product decisions incorporated into Master Plan v0.8 and closes the remaining hosted-database / remote-admin operating questions left open after ADRs 0017 and 0018.

## Decision

### One authoritative hosted Postgres

Should I Play? uses **one authoritative hosted production/editorial Postgres database** for real product data.

The same database is used by:

- local `/admin` through `ADMIN_DATABASE_URL`;
- eventual remote `/admin` through request-time `ADMIN_DATABASE_URL`;
- production public builds through build-time `DATABASE_URL`.

Publication status is what separates public from non-public editorial data. There is no separate public database that must be synchronized from an editorial database.

CI and integration tests use separate disposable databases and must never mutate the authoritative editorial database.

## Provider and initial region

The initial hosted provider is **Neon Postgres**.

The initial region is **AWS Europe, Frankfurt (`eu-central-1`)**.

The region is chosen for the architecture that exists now, not for an assumed future traffic map:

- public Game Profile pages are prerendered and served by Cloudflare, so a North American visitor does not query Postgres on each page view;
- the latency-sensitive database traffic during Phase 2 is editorial/admin traffic plus bounded build work;
- the initial editor operates from Israel, making Frankfurt a better interactive DB location than US East for the current system.

This is not permanent doctrine. Reassess region strategy if Postgres later enters a latency-sensitive public request path or editorial operations become geographically distributed.

## Cost / portability policy

A suitable Neon Free plan is acceptable during Phase-2 development. Upgrade when reliability, recovery/retention, quotas, or real operational usage justify paid hosting.

Application architecture must remain ordinary-Postgres portable. Do not make Neon-specific product features required semantics without a later explicit decision.

## Production cutover

Production currently retains the temporary fixture compatibility path described in ADR 0017. That path ends as an operating mode once the authoritative hosted database is provisioned.

Cutover sequence:

1. create the Neon project in Frankfurt;
2. apply migrations and canonical seed;
3. configure Cloudflare Workers Builds `DATABASE_URL`;
4. verify a database-backed production artifact through browser, workerd, and containment gates;
5. set `REQUIRE_DATABASE=1` so a production build missing its database fails closed;
6. remove or strictly restrict the remaining production fixture fallback after the cutover is proven.

Production must never silently publish calibration fixtures as though they were the current editorial corpus after cutover.

## Remote admin operating policy

ADR 0018 intentionally left open whether `/admin` would ever be deployed. That product question is now closed.

**Remote admin is a near-term Phase-2 operational requirement.**

The editor remains local-first initially because the remote path should not be enabled before its real dependencies are provisioned and verified. This is sequencing, not a decision to keep administration local.

Remote `/admin` should be enabled during Phase 2, **before normal Phase-2E editorial operations at the latest**, once:

1. authoritative hosted Postgres exists;
2. Cloudflare Access is configured for the remote admin surface;
3. deployed `ADMIN_DATABASE_URL` is configured;
4. the enabled Access + database path is verified under the real Worker/workerd contract;
5. invalid/missing identity and DB failures remain fail-closed.

The security decisions of ADR 0018 remain unchanged:

- Cloudflare Access is the remote identity provider;
- the Worker verifies the Access assertion;
- sensitive read entrypoints authorize before DB access;
- every Server Action authorizes before mutation;
- `ADMIN_DEV_IDENTITY` remains a genuine local `next dev` convenience only;
- `ADMIN_DATABASE_URL` remains separate from build-time `DATABASE_URL`.

## Consequences

- Provisioning production Postgres is the immediate infrastructure checkpoint after Phase 2B.
- Phase 2C may be developed local-first against the authoritative hosted DB once provisioned.
- Public traffic geography does not currently determine the DB region because the database is outside the public page-view request path.
- Remote editorial work becomes a supported normal workflow during Phase 2 rather than a later-phase feature.
- A later move to public request-time DB usage would require explicit reassessment of region, connection strategy, and the static-public-rendering contract.

## Amendment — activation performed, 2026-08-24

This ADR called remote admin a near-term Phase-2 activation and set the
conditions for it. Those conditions are now met, and this records what was
actually observed rather than what was intended.

**Configured and verified.** A self-hosted Cloudflare Access application
protects `shouldiplay.gg/admin` and its descendants. Its scope was checked
explicitly rather than assumed: `/admin`, `/admin/`, `/admin/games` and
`/admin/deployments` all meet Access, while `/`, `/methodology`, `/games/*`,
`/deployment-manifest`, `/robots.txt` and `/sitemap.xml` remain reachable
unauthenticated, and `/adminx` is a plain 404 — so the rule is a path rule and
not a prefix glob that would over-match.

**The seven runtime settings are Worker secrets**, not Workers Builds
environment variables and not plaintext variables:
`CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `ADMIN_DATABASE_URL`,
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_BUILDS_TRIGGER_ID`,
`CLOUDFLARE_WORKER_TAG`. Secrets rather than variables is deliberate: Wrangler
replaces dashboard plaintext variables on deploy and preserves existing secrets,
so the non-sensitive identifiers are stored as secrets purely for durability.
`DATABASE_URL` remains the build-time public read path and was not touched.

**An editor authenticated end to end.** The dashboard rendered live editorial
data under the production Worker, which exercises Access JWT verification and
the Hyperdrive request-time path in a single act — neither of which any local or
preview test can reach.

**One operational trap worth recording.** Adding a secret through the Cloudflare
dashboard creates a new Worker *version* but does not deploy it, so
`wrangler secret list` reports a name the running Worker does not have. Wrangler
refuses the next `secret put` for exactly this reason ("the latest version of
your Worker isn't currently deployed"). The clean resolution is
`wrangler versions secret put` to fold the remaining secret onto the latest
version, then one `wrangler versions deploy` — a single deployment that activates
everything, rather than a partially-configured Worker.

**Still unproven at the close of activation:** the first application-originated
Cloudflare Builds dispatch and its reconciliation, and a metrics reading of
Hyperdrive `cacheStatus`. Both are deliberately deferred to 2E's first real
publication rather than manufactured against an unchanged corpus. Activation
also uncovered a defect that made verification impossible until fixed — see
[ADR 0023](0023-verifying-production-from-inside-the-worker.md).
