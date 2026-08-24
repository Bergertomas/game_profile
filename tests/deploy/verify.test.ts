import { describe, expect, it } from "vitest";
import {
  MANIFEST_PATH,
  MANIFEST_SCHEMA_ID,
  digestEntries,
  type DeploymentManifest,
  type ManifestEntry,
} from "@/lib/deploy/manifest";
import { readProductionManifest, type VerifyTransport } from "@/lib/deploy/verify";

/**
 * Verification fails closed, in every direction.
 *
 * Each case below is a way of not knowing, and every one of them must resolve
 * to "not proven" rather than to a shrug that rounds up. The failure this
 * prevents is a tool that reports profiles as Live because the check errored.
 */

const ENTRY: ManifestEntry = {
  evaluationId: "11111111-1111-4111-8111-111111111111",
  gameSlug: "returnal",
  scopeKey: "default",
  versionNumber: 1,
  rubricVersion: "1.0",
  publishedAt: "2026-08-06",
  path: "/games/returnal",
};

async function manifestJson(
  overrides: Partial<DeploymentManifest> = {},
): Promise<string> {
  const entries = overrides.entries ?? [ENTRY];
  const doc: DeploymentManifest = {
    schema: MANIFEST_SCHEMA_ID,
    generatedAt: "2026-08-19T10:00:00.000Z",
    siteEnv: "production",
    buildUuid: "build-1",
    commitSha: "abc123",
    branch: "main",
    source: "database",
    rubricVersion: "1.0",
    digest: await digestEntries(entries),
    entries,
    ...overrides,
  };
  return JSON.stringify(doc);
}

function serving(status: number, body: string, sink?: string[]): VerifyTransport {
  return {
    fetch: async (input) => {
      sink?.push(String(input));
      return new Response(body, { status });
    },
  };
}

describe("readProductionManifest", () => {
  it("asks the origin for the manifest path, without a trailing-slash surprise", async () => {
    const urls: string[] = [];
    await readProductionManifest(
      serving(200, await manifestJson(), urls),
      "https://shouldiplay.gg/",
    );
    expect(urls).toEqual([`https://shouldiplay.gg${MANIFEST_PATH}`]);
  });

  it("verifies a production artifact", async () => {
    const result = await readProductionManifest(
      serving(200, await manifestJson()),
      "https://shouldiplay.gg",
    );
    expect(result.kind).toBe("verified");
    expect(result.kind === "verified" && result.manifest.entries).toHaveLength(1);
  });

  it("cannot conclude anything from an unreachable origin", async () => {
    const result = await readProductionManifest(
      {
        fetch: async () => {
          throw new Error("ENOTFOUND");
        },
      },
      "https://shouldiplay.gg",
    );
    expect(result).toMatchObject({ kind: "unverifiable", rejection: "unreachable" });
  });

  /**
   * A 404 is the expected answer from any artifact deployed before this
   * manifest existed, and the message says so — that is a migration state, not
   * a fault, and an operator should not spend an afternoon on it.
   */
  it("explains a 404 as an artifact that predates the manifest", async () => {
    const result = await readProductionManifest(
      serving(404, "not found"),
      "https://shouldiplay.gg",
    );
    expect(result).toMatchObject({ kind: "unverifiable", rejection: "http-error" });
    expect(result.kind === "unverifiable" && result.detail).toMatch(
      /predates the deployment manifest/,
    );
  });

  it("refuses an origin serving something that is not a manifest", async () => {
    const result = await readProductionManifest(
      serving(200, "<!doctype html><html>hello</html>"),
      "https://shouldiplay.gg",
    );
    expect(result).toMatchObject({ kind: "unverifiable", rejection: "malformed" });
  });

  it("refuses a manifest whose digest does not match its entries", async () => {
    const doc = JSON.parse(await manifestJson()) as DeploymentManifest;
    const tampered = { ...doc, entries: [{ ...ENTRY, versionNumber: 42 }] };
    const result = await readProductionManifest(
      serving(200, JSON.stringify(tampered)),
      "https://shouldiplay.gg",
    );
    expect(result).toMatchObject({
      kind: "unverifiable",
      rejection: "digest-mismatch",
    });
  });

  /**
   * The case a hostname cannot rule out.
   *
   * A preview artifact is healthy and its manifest parses exactly like a
   * production one. If the origin under verification is somehow a preview host
   * — a copied URL, a misconfigured runbook, a custom domain pointed somewhere
   * unexpected — believing it would report profiles as Live on the strength of
   * a hostname nobody visits. So the environment is checked, not assumed.
   */
  it("refuses a preview artifact even when it is served from the production origin", async () => {
    const result = await readProductionManifest(
      serving(200, await manifestJson({ siteEnv: "preview" })),
      "https://shouldiplay.gg",
    );
    expect(result).toMatchObject({
      kind: "unverifiable",
      rejection: "wrong-environment",
    });
  });

  /**
   * A fixture-backed production artifact IS verifiable — it is a real thing
   * production is serving — and the fact that nothing editorial is Live in it
   * is carried by `source`, for the caller to report rather than for this
   * function to hide behind a refusal.
   */
  it("verifies a fixture-backed artifact and says which corpus it read", async () => {
    const result = await readProductionManifest(
      serving(200, await manifestJson({ source: "fixtures" })),
      "https://shouldiplay.gg",
    );
    expect(result.kind).toBe("verified");
    expect(result.kind === "verified" && result.manifest.source).toBe("fixtures");
  });

  it("asks for an uncached answer", async () => {
    let seen: RequestInit | undefined;
    await readProductionManifest(
      {
        fetch: async (_input, init) => {
          seen = init;
          return new Response(await manifestJson(), { status: 200 });
        },
      },
      "https://shouldiplay.gg",
    );
    // The question is what production is serving *now*; a cached answer to that
    // is a wrong answer that looks exactly like a right one.
    expect(seen?.cache).toBe("no-store");
  });
});

/**
 * A refusal has to be actionable, and the first real one was not quite.
 *
 * It recorded `http-error` and status 522 — enough to know the shape of the
 * failure — but discarded `cf-ray`, which is the only value that ties the
 * observation to Cloudflare's own record of that exact request. Without it a
 * refusal cannot be correlated with anything; with it, an operator has a key to
 * paste into the dashboard.
 *
 * The allow-list is closed by construction. These tests exist to keep it that
 * way: the response arrives from a public URL over a network and is persisted
 * into an append-only trail that cannot be edited afterwards, so a body or a
 * `set-cookie` leaking in is permanent.
 */
describe("what a refusal keeps about the response", () => {
  function respondingWith(
    status: number,
    body: string,
    headers: Record<string, string>,
  ): VerifyTransport {
    return { fetch: async () => new Response(body, { status, headers }) };
  }

  it("keeps status, cf-ray and content type when the origin answers badly", async () => {
    const result = await readProductionManifest(
      respondingWith(522, "error", {
        "cf-ray": "a2fb3dfa28aae5eb-IAD",
        "content-type": "text/html; charset=UTF-8",
      }),
      "https://shouldiplay.gg",
    );

    expect(result).toMatchObject({
      kind: "unverifiable",
      rejection: "http-error",
      observed: {
        status: 522,
        cfRay: "a2fb3dfa28aae5eb-IAD",
        contentType: "text/html; charset=UTF-8",
      },
    });
  });

  it("keeps nothing else, whatever the response carried", async () => {
    const result = await readProductionManifest(
      respondingWith(500, "an internal error, with detail nobody vetted", {
        "cf-ray": "ray-1",
        "content-type": "text/plain",
        "set-cookie": "session=super-secret",
        authorization: "Bearer a-token-that-must-not-be-persisted",
        "x-internal-hostname": "origin-3.internal",
      }),
      "https://shouldiplay.gg",
    );

    const observed =
      result.kind === "unverifiable" ? result.observed : undefined;

    // The allow-list, asserted as an exact shape rather than by absence, so a
    // fourth field cannot be added without this failing.
    expect(Object.keys(observed ?? {}).sort()).toEqual([
      "cfRay",
      "contentType",
      "status",
    ]);
    expect(JSON.stringify(observed)).not.toMatch(
      /secret|Bearer|internal|nobody vetted/i,
    );
  });

  it("records a missing cf-ray as absent rather than inventing one", async () => {
    const result = await readProductionManifest(
      respondingWith(503, "down", {}),
      "https://shouldiplay.gg",
    );

    expect(result.kind === "unverifiable" && result.observed).toMatchObject({
      status: 503,
      cfRay: null,
    });
  });

  /**
   * A malformed or wrong-environment answer is still an answer, and correlating
   * it is just as useful as correlating a 522.
   */
  it("keeps the same subset when a 200 fails to be a manifest", async () => {
    const result = await readProductionManifest(
      respondingWith(200, "<!doctype html>", {
        "cf-ray": "ray-2",
        "content-type": "text/html",
      }),
      "https://shouldiplay.gg",
    );

    expect(result).toMatchObject({
      kind: "unverifiable",
      rejection: "malformed",
      observed: { status: 200, cfRay: "ray-2" },
    });
  });

  it("has nothing to describe when no response arrived at all", async () => {
    const result = await readProductionManifest(
      {
        fetch: async () => {
          throw new Error("ENOTFOUND");
        },
      },
      "https://shouldiplay.gg",
    );

    expect(result).toMatchObject({
      kind: "unverifiable",
      rejection: "unreachable",
    });
    expect(result.kind === "unverifiable" && result.observed).toBeUndefined();
  });

  /**
   * The diagnostics are an addition to a refusal, not a change to what counts
   * as proof. A verified artifact is verified on its manifest and its digest,
   * exactly as before, and carries no response metadata into the proof.
   */
  it("does not attach response metadata to a successful verification", async () => {
    const result = await readProductionManifest(
      respondingWith(200, await manifestJson(), { "cf-ray": "ray-3" }),
      "https://shouldiplay.gg",
    );

    expect(result.kind).toBe("verified");
    expect(Object.keys(result).sort()).toEqual(["kind", "manifest"]);
  });
});
