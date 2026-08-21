import { z } from "zod";
import { byCodeUnit } from "@/lib/order";

/**
 * What the deployed artifact says about itself.
 *
 * ── Why an artifact-owned manifest, and not a build report ─────────────────
 *
 * Master Plan §9.8 makes **Live** a fact about the artifact production is
 * serving right now. Nothing on the requesting side can establish that fact:
 *
 *   a build was requested        proves a POST was accepted
 *   a build reported success     proves a build process exited 0
 *   a deploy reported success    proves an upload was accepted
 *
 * None of those is "the bytes answering shouldiplay.gg contain version 3 of the
 * Returnal profile". A build can succeed and be superseded before its upload
 * lands; a later build can deploy over it; a rollback can restore an older
 * version without any build running at all. Every one of those is invisible to
 * a build-status poll, and each would have the tool claim something Live that
 * is not.
 *
 * So the artifact carries its own inventory, generated in the same
 * `next build` that renders the pages, through the same memoised public data
 * boundary they read, and served by the deployed Worker at
 * `/deployment-manifest`. (The memo is per process, so a build reads the corpus
 * once per render worker rather than once in total; see
 * lib/deploy/build-manifest.ts for why the proof does not depend on that.) Reading it back over the
 * public internet is the only evidence in this system that answers the actual
 * question, because it is the only one that comes *from the thing being asked
 * about*.
 *
 * ── The build UUID closes the loop ─────────────────────────────────────────
 *
 * Workers Builds injects `WORKERS_CI_BUILD_UUID` into the build, and it is the
 * same `build_uuid` the trigger API returns when a build is requested. So a
 * manifest naming build B is proof that the artifact production serves is the
 * one request R asked for — request and artifact identified by the same value,
 * arrived at from two independent directions.
 *
 * ── Read as data, never as authority ───────────────────────────────────────
 *
 * The manifest is fetched from a public URL. Everything below parses it
 * defensively and fails closed: an unreachable, malformed, truncated,
 * wrong-environment or fixture-backed manifest proves nothing, and "proves
 * nothing" must never round up to Live. `MANIFEST_SCHEMA` is strict for that
 * reason — an unexpected shape is a refusal, not a best-effort read.
 */

/**
 * Bumped only on a breaking change to the shape below.
 *
 * The verifier requires an exact match rather than a range. A manifest it does
 * not understand is one it cannot check, and the safe reading of "I cannot
 * check this" is "this is not proven Live" — not "close enough".
 */
export const MANIFEST_SCHEMA_ID = "should-i-play/deployment-manifest@1";

/** Where the deployed artifact answers. One definition; route and verifier share it. */
export const MANIFEST_PATH = "/deployment-manifest";

/**
 * Which corpus the build actually read.
 *
 * `lib/data/games.ts` still carries a fixture fallback for builds with no
 * database. A fixture-backed artifact is a real, correctly deployed site
 * serving the calibration corpus — and **no editorial evaluation is Live in
 * it**, whatever the editorial database contains. Recording the source in the
 * artifact is what lets the verifier say that out loud instead of comparing
 * evaluation ids that were never in play.
 */
export const MANIFEST_SOURCES = ["database", "fixtures"] as const;
export type ManifestSource = (typeof MANIFEST_SOURCES)[number];

/**
 * One published evaluation the artifact serves.
 *
 * `evaluationId` is the whole point: it is the only value that identifies a
 * version unambiguously. Slug plus version number does not — version numbers
 * are per `(scope, rubric)`, so two rubric generations both carry a "version 1"
 * for the same scope. The rest is for a human reading the manifest during an
 * incident, which is when it will actually be read.
 *
 * These are the primary keys of *published* rows, so the manifest enumerates
 * identifiers for content that is already public. Knowing one grants nothing:
 * `/admin` is 404 without configuration and behind Access with it. Hashing them
 * was considered and rejected — it would make the manifest unreadable at
 * exactly the moment somebody needs to read it.
 */
export const MANIFEST_ENTRY_SCHEMA = z
  .object({
    /**
     * Not `z.uuid()`. Database evaluations carry UUIDs, but the fixture corpus
     * uses readable keys (`evl_returnal_v1`) and a preview or laptop build
     * legitimately ships one. Requiring UUIDs would make such an artifact
     * report "malformed manifest" when the true and far more useful diagnosis
     * is `source: "fixtures"` — a healthy artifact in which no editorial
     * evaluation is Live.
     */
    evaluationId: z.string().min(1),
    gameSlug: z.string().min(1),
    scopeKey: z.string().min(1),
    versionNumber: z.number().int().positive(),
    rubricVersion: z.string().min(1),
    publishedAt: z.string().min(1).nullable(),
    path: z.string().startsWith("/"),
  })
  .strict();

export type ManifestEntry = z.infer<typeof MANIFEST_ENTRY_SCHEMA>;

export const MANIFEST_SCHEMA = z
  .object({
    schema: z.literal(MANIFEST_SCHEMA_ID),
    /** When the build read the corpus — not when this was fetched. */
    generatedAt: z.iso.datetime(),
    /** `production` or `preview`, as the build resolved it. */
    siteEnv: z.enum(["production", "preview"]),
    /** `WORKERS_CI_BUILD_UUID`; null for a build Workers Builds did not run. */
    buildUuid: z.string().min(1).nullable(),
    /** `WORKERS_CI_COMMIT_SHA`; null outside Workers Builds. */
    commitSha: z.string().min(1).nullable(),
    /** `WORKERS_CI_BRANCH`; null outside Workers Builds. */
    branch: z.string().min(1).nullable(),
    source: z.enum(MANIFEST_SOURCES),
    /** The rubric generation the public reader selected on. */
    rubricVersion: z.string().min(1),
    /** `sha256` over the canonical entry list — one value to compare. */
    digest: z.string().regex(/^[0-9a-f]{64}$/),
    entries: z.array(MANIFEST_ENTRY_SCHEMA),
  })
  .strict();

export type DeploymentManifest = z.infer<typeof MANIFEST_SCHEMA>;

/**
 * A stable digest of exactly what is served.
 *
 * Sorted by `evaluationId` before hashing, so two builds of one corpus agree
 * whatever order the database returned rows in. The sort is by CODE POINT and
 * not `localeCompare`: the build computes this digest and the verifier
 * recomputes it in a different process, so a comparator that depends on the
 * runtime's locale or ICU build could make one machine's honest manifest look
 * tampered with to another. See lib/order.ts. Only identifying fields go in:
 * a changed label must not read as a changed corpus, and `generatedAt`
 * certainly must not — two builds of the same corpus are the same corpus.
 *
 * The parts are length-prefixed rather than concatenated, so no combination of
 * a slug and a scope key can spell the same string as a different pairing and
 * make two distinct corpora hash alike.
 *
 * WebCrypto rather than `node:crypto`: this runs in the build (Node) and is
 * verified from code that must also typecheck for the Worker bundle, and only
 * one of those has `node:crypto` without reaching for a compatibility flag.
 */
export async function digestEntries(
  entries: readonly ManifestEntry[],
): Promise<string> {
  const canonical = [...entries]
    .sort((a, b) => byCodeUnit(a.evaluationId, b.evaluationId))
    .map((entry) =>
      [
        entry.evaluationId,
        entry.rubricVersion,
        String(entry.versionNumber),
        entry.gameSlug,
        entry.scopeKey,
        entry.path,
      ]
        .map((part) => `${part.length}:${part}`)
        .join(""),
    )
    .join("");

  const bytes = new TextEncoder().encode(canonical);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Why a fetched manifest could not be used. Each is a refusal, never a warning. */
export type ManifestRejection =
  | "unreachable"
  | "http-error"
  | "malformed"
  | "digest-mismatch";

export type ManifestReadResult =
  | { readonly ok: true; readonly manifest: DeploymentManifest }
  | {
      readonly ok: false;
      readonly rejection: ManifestRejection;
      readonly detail: string;
    };

/**
 * Parse text that claims to be a manifest.
 *
 * The digest is recomputed rather than trusted. A manifest whose digest does
 * not match its own entries has been edited, truncated, or assembled by
 * something other than this build, and the correct response to all three is the
 * same refusal.
 */
export async function parseManifest(text: string): Promise<ManifestReadResult> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      rejection: "malformed",
      detail: error instanceof Error ? error.message : "unparseable JSON",
    };
  }

  const parsed = MANIFEST_SCHEMA.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      rejection: "malformed",
      detail: parsed.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; "),
    };
  }

  const recomputed = await digestEntries(parsed.data.entries);
  if (recomputed !== parsed.data.digest) {
    return {
      ok: false,
      rejection: "digest-mismatch",
      detail: `manifest claims ${parsed.data.digest}, but its ${parsed.data.entries.length} entries hash to ${recomputed}`,
    };
  }

  return { ok: true, manifest: parsed.data };
}
