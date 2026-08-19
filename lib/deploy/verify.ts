import {
  MANIFEST_PATH,
  parseManifest,
  type DeploymentManifest,
  type ManifestRejection,
} from "@/lib/deploy/manifest";

/**
 * Ask production what it is serving.
 *
 * This is the only operation in Phase 2D-2 that produces evidence about Live.
 * Everything else — a dispatch acknowledgement, a build status, a deploy that
 * reported success — is evidence about a *request*. The distinction is Master
 * Plan §9.8's, and it is the whole reason this file exists separately from
 * `lib/deploy/cloudflare.ts`: one talks to the system that builds the artifact,
 * the other talks to the artifact.
 *
 * ── Fail closed, in every direction ────────────────────────────────────────
 *
 * Every way this can go wrong resolves to "not proven", never to "probably
 * fine":
 *
 *   the origin is unreachable          → unverifiable
 *   it answers 404, 500, anything ≠200  → unverifiable
 *   the body is not JSON                → unverifiable
 *   the JSON is not a manifest          → unverifiable
 *   the digest does not match its own entries → unverifiable
 *   the manifest describes a *preview*  → unverifiable as production
 *
 * The last one is worth stating on its own. A preview artifact is a perfectly
 * healthy build, and its manifest parses exactly like a production one. If the
 * origin under verification is somehow a preview host — a misconfigured
 * runbook, a copied URL, a custom domain pointed somewhere unexpected — then
 * believing it would report profiles as Live on the strength of a hostname
 * nobody visits. So the environment is checked, not assumed from the URL.
 */

export interface VerifyTransport {
  readonly fetch: typeof globalThis.fetch;
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export type ProductionCheck =
  | { readonly kind: "verified"; readonly manifest: DeploymentManifest }
  | {
      readonly kind: "unverifiable";
      readonly rejection: ManifestRejection | "wrong-environment";
      readonly detail: string;
    };

/**
 * Fetch and verify the manifest at `origin`.
 *
 * `origin` is passed in rather than taken from `SITE_URL` so the same function
 * serves a test, a preview investigation and production without a special case
 * — and so the caller has to be explicit about which artifact it is making a
 * claim about.
 *
 * The request is deliberately uncached at both ends: `cache: "no-store"` here,
 * `cache-control: no-store` on the route. The question is "what is production
 * serving *now*", and a cached answer to that is a wrong answer that looks
 * exactly like a right one.
 */
export async function readProductionManifest(
  transport: VerifyTransport,
  origin: string,
): Promise<ProductionCheck> {
  const url = `${origin.replace(/\/+$/, "")}${MANIFEST_PATH}`;

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    transport.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  let response: Response;
  try {
    response = await transport.fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
  } catch (error) {
    return {
      kind: "unverifiable",
      rejection: "unreachable",
      detail:
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error),
    };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    return {
      kind: "unverifiable",
      rejection: "http-error",
      detail:
        `${url} answered ${response.status}. ` +
        (response.status === 404
          ? "A 404 most likely means the deployed artifact predates the deployment manifest, so what it serves cannot be established this way."
          : "Nothing can be concluded about what production serves."),
    };
  }

  const parsed = await parseManifest(await response.text());
  if (!parsed.ok) {
    return {
      kind: "unverifiable",
      rejection: parsed.rejection,
      detail: parsed.detail,
    };
  }

  if (parsed.manifest.siteEnv !== "production") {
    return {
      kind: "unverifiable",
      rejection: "wrong-environment",
      detail:
        `${url} is serving a "${parsed.manifest.siteEnv}" artifact. A preview ` +
        "build is a healthy artifact, but nothing it contains is Live, and " +
        "treating it as production would report profiles as served on the " +
        "strength of a hostname.",
    };
  }

  return { kind: "verified", manifest: parsed.manifest };
}
