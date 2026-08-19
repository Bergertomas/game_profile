import { buildDeploymentManifest } from "@/lib/deploy/build-manifest";

/**
 * The artifact's inventory of itself, at `/deployment-manifest`.
 *
 * ── Why this is a route and not a build report ─────────────────────────────
 *
 * Everything the editorial tool could learn from the requesting side describes
 * a *request*: a build was accepted, a build exited 0, an upload succeeded.
 * None of them is evidence about the bytes production is serving now. This is
 * the only surface in the system that is, because the answer is served by the
 * thing being asked about (see lib/deploy/manifest.ts).
 *
 * ── `force-static` is load-bearing ─────────────────────────────────────────
 *
 * Next 16 does not cache `GET` Route Handlers by default — the bundled docs are
 * explicit: "Route Handlers are not cached by default … To cache a `GET`
 * method, use a route config option such as `export const dynamic =
 * 'force-static'`". Without it this route would be dynamic, meaning the Worker
 * would evaluate it per request, with no database and no build environment, and
 * report an empty fixture-shaped corpus for every deployment. It would look
 * like a working manifest and be worthless.
 *
 * With it, the handler runs during `next build` and its output is prerendered
 * into the assets that `staticAssetsIncrementalCache` serves — the same
 * mechanism, and the same guarantee, as every public page (open-next.config.ts).
 *
 * `cf:verify` asserts the deployed artifact serves this correctly, because
 * "static under `next build`" and "static under workerd" have already differed
 * once on this stack (ADR 0017, `dynamicParams`).
 *
 * ── Public, and deliberately so ────────────────────────────────────────────
 *
 * It lists identifiers for content that is already public, and it must be
 * readable without credentials or it cannot serve its purpose: verification has
 * to be possible from anywhere, including from an editorial tool running on a
 * laptop against production. `robots.ts` excludes it from crawling — it is a
 * machine record, not a page — which is tidiness, not access control.
 */
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const manifest = await buildDeploymentManifest();

  return new Response(`${JSON.stringify(manifest, null, 2)}\n`, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Prerendered content, but the verifier's question is "what is production
      // serving *now*". An intermediary answering from cache would let a stale
      // manifest certify a deployment that has since been replaced, so this
      // asks every hop not to. The verifier additionally sends `cache: no-store`
      // — neither is sufficient alone, and the cost of both is nil.
      "cache-control": "no-store, must-revalidate",
      "x-robots-tag": "noindex",
    },
  });
}
