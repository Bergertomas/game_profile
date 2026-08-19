import { describe, expect, it } from "vitest";
import {
  MANIFEST_SCHEMA_ID,
  digestEntries,
  parseManifest,
  type DeploymentManifest,
  type ManifestEntry,
} from "@/lib/deploy/manifest";

/**
 * The manifest is the only evidence in this system about what production
 * serves, so it is read defensively and every rejection below is a refusal to
 * claim anything — never a warning that gets rounded up.
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

async function manifest(
  overrides: Partial<DeploymentManifest> = {},
): Promise<DeploymentManifest> {
  const entries = overrides.entries ?? [ENTRY];
  return {
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
}

describe("digestEntries", () => {
  it("does not depend on the order rows came back in", async () => {
    const second: ManifestEntry = {
      ...ENTRY,
      evaluationId: "22222222-2222-4222-8222-222222222222",
      gameSlug: "redfall",
      path: "/games/redfall",
    };
    expect(await digestEntries([ENTRY, second])).toBe(
      await digestEntries([second, ENTRY]),
    );
  });

  it("ignores fields that do not identify a version", async () => {
    // Two builds of one corpus are one corpus. `publishedAt` is descriptive.
    expect(await digestEntries([{ ...ENTRY, publishedAt: null }])).toBe(
      await digestEntries([ENTRY]),
    );
  });

  it("distinguishes a different version of the same profile", async () => {
    expect(await digestEntries([{ ...ENTRY, versionNumber: 2 }])).not.toBe(
      await digestEntries([ENTRY]),
    );
  });

  /**
   * Length-prefixing, not concatenation.
   *
   * Without it, a slug of "alan" plus a scope key of "wake" hashes the same as
   * "alanwake" plus "" — two different corpora reporting one digest, and the
   * comparison that decides Live silently answering "unchanged".
   */
  it("cannot be fooled by moving a character between fields", async () => {
    const a = { ...ENTRY, gameSlug: "alan", scopeKey: "wake" };
    const b = { ...ENTRY, gameSlug: "alanwake", scopeKey: "" };
    expect(await digestEntries([a])).not.toBe(await digestEntries([b]));
  });
});

describe("parseManifest", () => {
  it("accepts a manifest this build could produce", async () => {
    const result = await parseManifest(JSON.stringify(await manifest()));
    expect(result.ok).toBe(true);
  });

  /**
   * A fixture-backed build is a real artifact and must parse.
   *
   * Its ids are readable keys rather than UUIDs. Rejecting them would report
   * "malformed manifest" for a healthy preview or laptop build, when the true
   * and far more useful diagnosis is `source: "fixtures"` — an artifact in
   * which no editorial evaluation is Live.
   */
  it("accepts the fixture corpus's readable ids", async () => {
    const entries = [{ ...ENTRY, evaluationId: "evl_returnal_v1" }];
    const result = await parseManifest(
      JSON.stringify(await manifest({ entries, source: "fixtures" })),
    );
    expect(result.ok).toBe(true);
  });

  it("refuses text that is not JSON", async () => {
    const result = await parseManifest("<!doctype html><html>404</html>");
    expect(result).toMatchObject({ ok: false, rejection: "malformed" });
  });

  it("refuses an unknown schema id", async () => {
    const doc = { ...(await manifest()), schema: "something/else@9" };
    const result = await parseManifest(JSON.stringify(doc));
    expect(result).toMatchObject({ ok: false, rejection: "malformed" });
  });

  it("refuses a field it does not recognise", async () => {
    // Strict, so a manifest from a newer artifact is refused rather than half
    // understood. A verifier that cannot check something must not certify it.
    const doc = { ...(await manifest()), somethingNew: true };
    const result = await parseManifest(JSON.stringify(doc));
    expect(result).toMatchObject({ ok: false, rejection: "malformed" });
  });

  /**
   * The digest is recomputed, never trusted.
   *
   * An edited, truncated or hand-assembled manifest is exactly what this
   * catches, and all three deserve the same refusal.
   */
  it("refuses a manifest whose digest does not match its own entries", async () => {
    const doc = await manifest();
    const tampered = {
      ...doc,
      entries: [{ ...ENTRY, versionNumber: 99 }],
    };
    const result = await parseManifest(JSON.stringify(tampered));
    expect(result).toMatchObject({ ok: false, rejection: "digest-mismatch" });
  });

  it("refuses a truncated entry list even when the digest field survives", async () => {
    const second: ManifestEntry = {
      ...ENTRY,
      evaluationId: "33333333-3333-4333-8333-333333333333",
    };
    const full = await manifest({ entries: [ENTRY, second] });
    const truncated = { ...full, entries: [ENTRY] };
    const result = await parseManifest(JSON.stringify(truncated));
    expect(result).toMatchObject({ ok: false, rejection: "digest-mismatch" });
  });

  it("accepts an empty corpus, which is a real state and not an error", async () => {
    const result = await parseManifest(
      JSON.stringify(await manifest({ entries: [] })),
    );
    expect(result.ok).toBe(true);
  });
});
