/**
 * Cloudflare Access JWT verification.
 *
 * Access is the identity system for the editorial tool (ADR 0018). It sits in
 * front of `/admin/*` at the edge, authenticates against an allow-list of
 * editor emails, and forwards the request with a signed assertion. This module
 * is the second half of that arrangement: it checks the assertion rather than
 * trusting that the edge did its job.
 *
 * ── Why verify at all, when Access already stopped the request ──────────────
 *
 * Because "Access is in front of this route" is a fact about an account-level
 * dashboard policy, not about this repository — exactly the gap ADR 0012 named
 * for preview URLs. A policy can be scoped to the wrong hostname, be removed
 * during unrelated Zero Trust work, or simply never have been created. In every
 * one of those cases the Worker still answers, and without this check it would
 * answer an unauthenticated request with the editorial tool.
 *
 * ADR 0012 considered and declined this for the public site, on the grounds
 * that production content is public by design and request-time auth on a fully
 * prerendered Worker would cost more than the exposure warranted. It named the
 * condition for revisiting: "Revisit if a preview ever carries unpublished
 * editorial." The admin is unpublished editorial, so the condition has fired.
 *
 * ── No JWT dependency ───────────────────────────────────────────────────────
 *
 * RS256 verification is `crypto.subtle.verify` and some base64url. WebCrypto is
 * present in Node 22 and in workerd, so a library would add a dependency, a
 * supply-chain surface and a bundle cost to avoid roughly forty lines. The
 * parsing here is deliberately strict and rejects on anything it does not
 * positively recognise.
 */

/** A verified editor, and how we know who they are. */
export interface EditorIdentity {
  readonly email: string;
  /**
   * `access` — a verified Cloudflare Access assertion.
   * `development` — a local, non-production build with no Access in front of
   * it. Impossible in a production build; see `lib/admin/auth.ts`.
   */
  readonly source: "access" | "development";
}

/** The header Cloudflare Access adds to every request it forwards. */
export const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

/** Set by Access on the browser, and the fallback when the header is absent. */
export const ACCESS_COOKIE = "CF_Authorization";

export interface AccessConfig {
  /** e.g. "shouldiplay.cloudflareaccess.com". No scheme, no trailing slash. */
  readonly teamDomain: string;
  /** The Access application's Application Audience (AUD) tag. */
  readonly audience: string;
}

/**
 * Access configuration, or null when this deployment has none.
 *
 * Null is not "skip the check" — it is what makes the admin refuse to exist.
 * See `adminIsEnabled` in lib/admin/auth.ts.
 */
export function readAccessConfig(
  env: Readonly<Record<string, string | undefined>>,
): AccessConfig | null {
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim();
  const audience = env.CF_ACCESS_AUD?.trim();
  if (!teamDomain || !audience) return null;
  return { teamDomain: normaliseTeamDomain(teamDomain), audience };
}

/**
 * Tolerate the forms a person actually pastes out of the Zero Trust dashboard.
 * A scheme or a trailing slash here would produce an issuer that never matches
 * and a JWKS URL that 404s, both of which fail closed but for a confusing
 * reason.
 */
function normaliseTeamDomain(value: string): string {
  return value.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

interface JwtHeader {
  readonly alg: string;
  readonly kid: string;
}

interface JwtPayload {
  readonly aud?: string | readonly string[];
  readonly iss?: string;
  readonly email?: string;
  readonly exp?: number;
  readonly nbf?: number;
}

/** A JSON Web Key, narrowed to what `importKey` needs for RS256. */
interface Jwk {
  readonly kid?: string;
  readonly kty?: string;
  readonly alg?: string;
  readonly n?: string;
  readonly e?: string;
}

export interface VerifyOptions {
  readonly config: AccessConfig;
  /** Injected so tests can verify against a key pair without a network. */
  readonly fetchKeys?: (url: string) => Promise<{ keys: Jwk[] }>;
  /** Injected so expiry is testable. Seconds since the epoch. */
  readonly now?: () => number;
}

/**
 * Verify an Access assertion and return the editor it names.
 *
 * Returns null for every failure — malformed, wrong algorithm, unknown key,
 * bad signature, wrong audience, wrong issuer, expired, or carrying no email.
 * The caller cannot tell those apart on purpose: an unauthenticated caller
 * learns nothing about why, and there is nothing an editor can do with the
 * distinction that re-authenticating does not already do.
 */
export async function verifyAccessToken(
  token: string,
  { config, fetchKeys = fetchAccessKeys, now = unixSeconds }: VerifyOptions,
): Promise<EditorIdentity | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [
    string,
    string,
    string,
  ];

  const header = decodeJson<JwtHeader>(encodedHeader);
  // RS256 only. Accepting the token's own `alg` unchecked is the classic JWT
  // forgery: `none` verifies trivially, and an HMAC algorithm lets a public key
  // be used as a shared secret.
  if (!header || header.alg !== "RS256" || typeof header.kid !== "string") {
    return null;
  }

  const payload = decodeJson<JwtPayload>(encodedPayload);
  if (!payload) return null;

  if (payload.iss !== `https://${config.teamDomain}`) return null;
  if (!audienceMatches(payload.aud, config.audience)) return null;

  const currentTime = now();
  if (typeof payload.exp !== "number" || payload.exp <= currentTime) return null;
  if (typeof payload.nbf === "number" && payload.nbf > currentTime) return null;

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  if (!email) return null;

  let keys: readonly Jwk[];
  try {
    const document = await fetchKeys(
      `https://${config.teamDomain}/cdn-cgi/access/certs`,
    );
    keys = document.keys ?? [];
  } catch {
    // A JWKS that cannot be fetched is not a reason to admit the request.
    return null;
  }

  const jwk = keys.find((candidate) => candidate.kid === header.kid);
  if (!jwk?.n || !jwk.e) return null;

  const signature = decodeBase64Url(encodedSignature);
  if (!signature) return null;

  let verified: boolean;
  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: "RSA", alg: "RS256", n: jwk.n, e: jwk.e, ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      signature,
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
  } catch {
    return null;
  }

  return verified ? { email, source: "access" } : null;
}

/**
 * `aud` is a string or an array of strings in the JWT spec, and Access has used
 * both. Membership either way; never a substring match.
 */
function audienceMatches(
  aud: string | readonly string[] | undefined,
  expected: string,
): boolean {
  if (typeof aud === "string") return aud === expected;
  if (Array.isArray(aud)) return aud.includes(expected);
  return false;
}

async function fetchAccessKeys(url: string): Promise<{ keys: Jwk[] }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`JWKS request failed: ${response.status}`);
  return (await response.json()) as { keys: Jwk[] };
}

function unixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function decodeJson<T>(segment: string): T | null {
  const bytes = decodeBase64Url(segment);
  if (!bytes) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}

function decodeBase64Url(segment: string): Uint8Array<ArrayBuffer> | null {
  // Reject anything outside the base64url alphabet rather than letting `atob`
  // interpret it. Standard base64 `+` and `/` are not valid here.
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) return null;
  const padded = segment
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(segment.length / 4) * 4, "=");
  try {
    const binary = atob(padded);
    // Backed by a plain ArrayBuffer rather than the ArrayBufferLike a bare
    // `new Uint8Array(n)` infers, so it satisfies `BufferSource` for WebCrypto.
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Pull the assertion out of a request.
 *
 * Access sends both a header and a cookie; the header is authoritative and the
 * cookie is what a direct browser navigation carries.
 */
export function readAccessToken(headers: Headers): string | null {
  const header = headers.get(ACCESS_JWT_HEADER);
  if (header) return header.trim();

  const cookies = headers.get("cookie");
  if (!cookies) return null;
  for (const pair of cookies.split(";")) {
    const separator = pair.indexOf("=");
    if (separator === -1) continue;
    if (pair.slice(0, separator).trim() !== ACCESS_COOKIE) continue;
    const value = pair.slice(separator + 1).trim();
    return value || null;
  }
  return null;
}
