import {
  PUBLIC_RUBRIC_VERSION,
  listGameProfiles,
  publishedCorpusSource,
} from "@/lib/data/games";
import {
  MANIFEST_SCHEMA_ID,
  digestEntries,
  type DeploymentManifest,
  type ManifestEntry,
} from "@/lib/deploy/manifest";
import { SITE_ENV, profilePath } from "@/lib/site";

/**
 * Assembles the manifest the deployed artifact serves.
 *
 * ── This runs during `next build`, and that is the whole guarantee ─────────
 *
 * It reads `listGameProfiles()` — the same public data boundary every page,
 * the sitemap and the share cards read, memoised for the process. So this is a
 * second consumer of a read rather than a read of its own.
 *
 * Assembling it from a fresh database query instead would be the classic
 * near-miss. It would usually agree, and on the one occasion that matters —
 * a publication committing midway through a build — it would certify a corpus
 * the artifact does not contain.
 *
 * ── The precise shape of that guarantee ────────────────────────────────────
 *
 * The memo is module-scoped, so it holds PER PROCESS. Next renders static pages
 * across several worker processes, so a build performs one corpus read per
 * worker that needs one — not one read for the whole build, which earlier
 * wording here claimed. Within a process the guarantee is exact and is what
 * rules out the near-miss above; across processes it is not a guarantee at all,
 * and the design does not rest on one.
 *
 * It does not need to. `digestEntries` makes the manifest self-checking: the
 * verifier recomputes the digest from the entries it received and refuses any
 * manifest whose digest does not match its own contents. And the question the
 * manifest answers is settled by reading it back FROM the deployed origin, so
 * what is finally proven is what production serves — not what any build process
 * believed while assembling it. A publication committing mid-build is visible
 * as an artifact that does not contain the new version, which is exactly the
 * "awaiting deployment" state the tool exists to show.
 *
 * ── Build identity comes from the build, not from this repository ──────────
 *
 * Workers Builds injects `WORKERS_CI_BUILD_UUID`, `WORKERS_CI_COMMIT_SHA` and
 * `WORKERS_CI_BRANCH` (Cloudflare, "Build configuration: default variables").
 * They are absent for a laptop build, and null is the honest answer there —
 * a local `npm run cf:deploy` produces a real artifact that no build request
 * asked for, and the manifest should say so rather than inventing an identity
 * that would then fail to match anything.
 */
function buildEnvironmentValue(name: string): string | null {
  return process.env[name]?.trim() || null;
}

export async function buildDeploymentManifest(): Promise<DeploymentManifest> {
  const profiles = await listGameProfiles();
  const source = await publishedCorpusSource();

  const entries: ManifestEntry[] = profiles.map((profile) => ({
    evaluationId: profile.evaluation.id,
    gameSlug: profile.game.slug,
    scopeKey: profile.scope.key,
    versionNumber: profile.evaluation.versionNumber,
    rubricVersion: profile.evaluation.rubricVersion,
    publishedAt: profile.evaluation.publishedAt ?? null,
    // The address this profile actually owns: `/games/<slug>` for a primary
    // scope, `/games/<slug>/<key>` for a sibling (ADR 0016). Reconstructing it
    // any other way would put every sibling at its primary's URL.
    path: profilePath(profile.game.slug, profile.scope),
  }));

  return {
    schema: MANIFEST_SCHEMA_ID,
    generatedAt: new Date().toISOString(),
    siteEnv: SITE_ENV,
    buildUuid: buildEnvironmentValue("WORKERS_CI_BUILD_UUID"),
    commitSha: buildEnvironmentValue("WORKERS_CI_COMMIT_SHA"),
    branch: buildEnvironmentValue("WORKERS_CI_BRANCH"),
    source,
    rubricVersion: PUBLIC_RUBRIC_VERSION,
    digest: await digestEntries(entries),
    entries,
  };
}
