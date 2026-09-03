import { describe, expect, it } from "vitest";
import { REDACTED, redactIgdb, redactIgdbDeep, redactIgdbWithSecrets, safeIgdbError } from "@/lib/igdb/redact";

const NO_ENV = {} as unknown as NodeJS.ProcessEnv;
const env = {
  IGDB_CLIENT_ID: "fixtureclientid0001",
  IGDB_CLIENT_SECRET: "fixturesecretvalue0001",
  IGDB_ACCESS_TOKEN: "fixturetokenvalue0001",
} as unknown as NodeJS.ProcessEnv;

describe("redactIgdb", () => {
  it("masks the literal values of the credential variables", () => {
    const out = redactIgdb("id=fixtureclientid0001 secret=fixturesecretvalue0001 token fixturetokenvalue0001", env);
    expect(out).not.toContain("fixtureclientid0001");
    expect(out).not.toContain("fixturesecretvalue0001");
    expect(out).not.toContain("fixturetokenvalue0001");
  });

  it("masks credential-shaped echoes even when the values are not in the environment", () => {
    expect(redactIgdb("Authorization: Bearer abcdefghij123456", NO_ENV)).toBe(`Authorization: ${REDACTED}`);
    expect(redactIgdb("Client-ID: abcdefghij123456", NO_ENV)).toBe(REDACTED);
    expect(redactIgdb("https://id.twitch.tv/oauth2/token?client_id=abc123&client_secret=s3cr3tvalue&grant_type=client_credentials", NO_ENV)).toBe(
      `https://id.twitch.tv/oauth2/token?client_id=${REDACTED}&client_secret=${REDACTED}&grant_type=client_credentials`,
    );
    expect(redactIgdb('{"access_token":"abc","expires_in":5}', NO_ENV)).toBe(`{"access_token":"${REDACTED}","expires_in":5}`);
  });

  it("never lets a presigned dump download URL through", () => {
    const url = "https://bucket.s3.amazonaws.com/1_games.csv?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123";
    expect(redactIgdb(`download ${url} now`, NO_ENV)).toBe(`download ${REDACTED} now`);
    expect(redactIgdb('{"s3_url":"https://example.invalid/signed?Signature=x","endpoint":"games"}', NO_ENV)).toBe(
      `{"s3_url":"${REDACTED}","endpoint":"games"}`,
    );
  });

  it("never lets the dump proof's own presigned URL through, signed or not", () => {
    // The dump-sample proof holds the exact URL, so it masks it as a literal
    // rather than trusting it to still look signed by the time it reaches a
    // string. A URL truncated at the query string still exposes bucket and
    // key, so the query-free prefix is masked too.
    const signed = "https://igdb-dumps.s3.eu-west-1.amazonaws.com/1756900000_platforms.csv?X-Amz-Signature=deadbeef";
    const unsigned = "https://igdb-dumps.s3.eu-west-1.amazonaws.com/1756900000_platforms.csv";
    for (const text of [
      `download failed: connect ECONNREFUSED ${signed}`,
      `download failed: getaddrinfo ENOTFOUND ${unsigned}`,
      `dump parser refused the file from ${unsigned}: Column versions: cannot read array cell.`,
    ]) {
      const out = redactIgdbWithSecrets(text, [signed], NO_ENV);
      expect(out).not.toContain("igdb-dumps.s3.eu-west-1.amazonaws.com");
      expect(out).not.toContain("1756900000_platforms.csv");
      expect(out).not.toContain("deadbeef");
      expect(out).toContain(REDACTED);
    }
  });

  it("still applies the standard credential patterns alongside a caller's literal", () => {
    const out = redactIgdbWithSecrets("Bearer abcdefghij123456 and https://x.invalid/f.csv?Signature=zz", ["https://x.invalid/f.csv?Signature=zz"], NO_ENV);
    expect(out).not.toContain("abcdefghij123456");
    expect(out).not.toContain("Signature=zz");
  });

  it("ignores empty or too-short caller secrets rather than masking everything", () => {
    expect(redactIgdbWithSecrets("a plain sentence", [null, undefined, "", "abc"], NO_ENV)).toBe("a plain sentence");
  });

  it("redacts recursively and yields a safe error pair", () => {
    const deep = redactIgdbDeep({ a: ["Bearer abcdefghij123456"], b: { c: "fixturesecretvalue0001" } }, env);
    expect(JSON.stringify(deep)).not.toMatch(/abcdefghij123456|fixturesecretvalue0001/);
    const safe = safeIgdbError(new Error("token fixturetokenvalue0001 rejected"), env);
    expect(safe).toEqual({ error_class: "Error", message: `token ${REDACTED} rejected` });
  });
});
