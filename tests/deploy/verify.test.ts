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
