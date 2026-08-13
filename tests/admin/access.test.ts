import { beforeAll, describe, expect, it } from "vitest";
import {
  readAccessConfig,
  readAccessToken,
  verifyAccessToken,
  type AccessConfig,
} from "@/lib/admin/access";

/**
 * Cloudflare Access assertion verification.
 *
 * Signed against a real RSA key pair generated here rather than against fixed
 * fixture strings. A hard-coded "valid token" cannot prove that the signature
 * check works — it proves only that the parser accepts one particular string,
 * and it would keep passing if `crypto.subtle.verify` were removed entirely.
 * Every negative case below is the positive token with exactly one thing wrong.
 */

const TEAM = "shouldiplay.cloudflareaccess.com";
const AUD = "b1a2c3d4e5f60718293a4b5c6d7e8f90";
const CONFIG: AccessConfig = { teamDomain: TEAM, audience: AUD };
const NOW = 1_776_000_000;

let keyPair: CryptoKeyPair;
let jwks: { keys: (JsonWebKey & { kid: string })[] };
let wrongKeyPair: CryptoKeyPair;

beforeAll(async () => {
  keyPair = await generateKey();
  wrongKeyPair = await generateKey();
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  jwks = { keys: [{ ...publicJwk, kid: "test-key" }] };
});

function generateKey(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  ) as Promise<CryptoKeyPair>;
}

function base64Url(input: string | Uint8Array): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

interface TokenParts {
  header?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  signWith?: CryptoKey;
}

async function mint({ header, payload, signWith }: TokenParts = {}) {
  const fullHeader = { alg: "RS256", kid: "test-key", typ: "JWT", ...header };
  const fullPayload = {
    iss: `https://${TEAM}`,
    aud: AUD,
    email: "editor@example.com",
    exp: NOW + 3600,
    iat: NOW - 10,
    ...payload,
  };
  const signingInput = `${base64Url(JSON.stringify(fullHeader))}.${base64Url(
    JSON.stringify(fullPayload),
  )}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    signWith ?? keyPair.privateKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
}

const verify = (token: string) =>
  verifyAccessToken(token, {
    config: CONFIG,
    fetchKeys: async () => jwks as { keys: [] },
    now: () => NOW,
  });

describe("A well-formed assertion", () => {
  it("names the editor it was issued to", async () => {
    await expect(verify(await mint())).resolves.toEqual({
      email: "editor@example.com",
      source: "access",
    });
  });
});

describe("Refusals", () => {
  it("rejects a signature from a different key", async () => {
    const token = await mint({ signWith: wrongKeyPair.privateKey });
    await expect(verify(token)).resolves.toBeNull();
  });

  it("rejects a token whose payload was edited after signing", async () => {
    const [header, payload, signature] = (await mint()).split(".");
    const tampered = base64Url(
      JSON.stringify({
        iss: `https://${TEAM}`,
        aud: AUD,
        email: "attacker@example.com",
        exp: NOW + 3600,
      }),
    );
    expect(payload).not.toBe(tampered);
    await expect(verify(`${header}.${tampered}.${signature}`)).resolves.toBeNull();
  });

  /**
   * The classic JWT forgery. `alg: none` verifies trivially if the algorithm is
   * read from the token, and an HMAC algorithm turns the public key into a
   * shared secret. Neither may reach the signature check at all.
   */
  it("rejects alg: none", async () => {
    const token = await mint({ header: { alg: "none" } });
    await expect(verify(token)).resolves.toBeNull();
  });

  it("rejects a symmetric algorithm", async () => {
    const token = await mint({ header: { alg: "HS256" } });
    await expect(verify(token)).resolves.toBeNull();
  });

  it("rejects an audience for a different Access application", async () => {
    const token = await mint({ payload: { aud: "some-other-application" } });
    await expect(verify(token)).resolves.toBeNull();
  });

  it("rejects an issuer from a different Zero Trust team", async () => {
    const token = await mint({
      payload: { iss: "https://someone-else.cloudflareaccess.com" },
    });
    await expect(verify(token)).resolves.toBeNull();
  });

  it("rejects an expired assertion", async () => {
    const token = await mint({ payload: { exp: NOW - 1 } });
    await expect(verify(token)).resolves.toBeNull();
  });

  it("rejects an assertion that is not valid yet", async () => {
    const token = await mint({ payload: { nbf: NOW + 60 } });
    await expect(verify(token)).resolves.toBeNull();
  });

  it("rejects an assertion with no email to attribute the edit to", async () => {
    const token = await mint({ payload: { email: undefined } });
    await expect(verify(token)).resolves.toBeNull();
  });

  it("rejects a key id that is not in the JWKS", async () => {
    const token = await mint({ header: { kid: "some-other-key" } });
    await expect(verify(token)).resolves.toBeNull();
  });

  it("rejects rather than admits when the JWKS cannot be fetched", async () => {
    const token = await mint();
    await expect(
      verifyAccessToken(token, {
        config: CONFIG,
        fetchKeys: async () => {
          throw new Error("network down");
        },
        now: () => NOW,
      }),
    ).resolves.toBeNull();
  });

  it("rejects malformed input without throwing", async () => {
    for (const bad of ["", "not-a-jwt", "a.b", "a.b.c.d", "!!!.???.***"]) {
      await expect(verify(bad)).resolves.toBeNull();
    }
  });
});

describe("Audience as an array", () => {
  it("accepts membership, not a substring", async () => {
    const included = await mint({ payload: { aud: ["other", AUD] } });
    await expect(verify(included)).resolves.toMatchObject({
      email: "editor@example.com",
    });

    const substring = await mint({ payload: { aud: [`${AUD}-staging`] } });
    await expect(verify(substring)).resolves.toBeNull();
  });
});

describe("Configuration", () => {
  it("is absent unless both halves are set", () => {
    expect(readAccessConfig({})).toBeNull();
    expect(readAccessConfig({ CF_ACCESS_TEAM_DOMAIN: TEAM })).toBeNull();
    expect(readAccessConfig({ CF_ACCESS_AUD: AUD })).toBeNull();
    expect(
      readAccessConfig({ CF_ACCESS_TEAM_DOMAIN: TEAM, CF_ACCESS_AUD: AUD }),
    ).toEqual({ teamDomain: TEAM, audience: AUD });
  });

  it("tolerates the forms a person pastes out of the dashboard", () => {
    // A scheme or trailing slash would silently produce an issuer that never
    // matches — fail-closed, but for a reason nobody would guess.
    expect(
      readAccessConfig({
        CF_ACCESS_TEAM_DOMAIN: " https://shouldiplay.cloudflareaccess.com/ ",
        CF_ACCESS_AUD: ` ${AUD} `,
      }),
    ).toEqual({ teamDomain: TEAM, audience: AUD });
  });
});

describe("Reading the assertion off a request", () => {
  it("prefers the header Access adds", () => {
    const headers = new Headers({
      "cf-access-jwt-assertion": "from-header",
      cookie: "CF_Authorization=from-cookie",
    });
    expect(readAccessToken(headers)).toBe("from-header");
  });

  it("falls back to the cookie a browser navigation carries", () => {
    const headers = new Headers({
      cookie: "other=1; CF_Authorization=from-cookie; another=2",
    });
    expect(readAccessToken(headers)).toBe("from-cookie");
  });

  it("finds nothing when there is nothing", () => {
    expect(readAccessToken(new Headers())).toBeNull();
    expect(readAccessToken(new Headers({ cookie: "unrelated=1" }))).toBeNull();
    // A cookie whose name merely contains the real one must not match.
    expect(
      readAccessToken(new Headers({ cookie: "NOT_CF_Authorization=x" })),
    ).toBeNull();
  });
});
