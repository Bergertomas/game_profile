import {
  IGDB_API_BASE,
  IGDB_ENV,
  IGDB_RATE_LIMIT,
  TWITCH_TOKEN_URL,
} from "./contract";
import { redactIgdb } from "./redact";
import { dumpDescriptorSchema, dumpListingSchema, type DumpDescriptor, type DumpListing } from "./dump";

/**
 * The IGDB transport: credentials, token, rate gate, and safe results.
 *
 * Server-side only, by the provider's own rule ("the API does not allow
 * requests directly from browsers … the request would leak your access
 * token"). Nothing under app/, components/ or the public read path imports
 * this module, and a test proves it (issue #48 §9: no runtime/public
 * dependency).
 *
 * Every result is SAFE by construction: it carries status, timing and a
 * redacted error message, never a header, never a URL with a query string,
 * never the token. There is deliberately no SDK — one `fetch` of a documented
 * shape, so retry and token behaviour stay in this file where they can be
 * read against the docs.
 */

export interface IgdbCredentials {
  readonly clientId: string;
  readonly clientSecret: string | null;
  /** A pre-issued app access token, if the environment supplies one. */
  readonly accessToken: string | null;
}

export interface CredentialReadout {
  readonly present: boolean;
  readonly credentials: IgdbCredentials | null;
  /** Variable NAMES that were missing. Never values. */
  readonly missing: readonly string[];
  /** Whether a pre-issued token would be used instead of minting one. */
  readonly usesPreIssuedToken: boolean;
}

/**
 * Read credentials by name. This is the only place the values are touched, and
 * the readout that leaves here names variables, never contents.
 *
 * `present` requires a Client ID and either a Client Secret (to mint a token)
 * or a pre-issued access token (to skip minting — see IGDB_TOKEN: an app may
 * hold 25 active tokens, and minting more revokes the oldest).
 */
export function readIgdbCredentials(env: NodeJS.ProcessEnv = process.env): CredentialReadout {
  const clientId = env[IGDB_ENV.clientId]?.trim() || env.TWITCH_CLIENT_ID?.trim() || null;
  const clientSecret = env[IGDB_ENV.clientSecret]?.trim() || env.TWITCH_CLIENT_SECRET?.trim() || null;
  const accessToken = env[IGDB_ENV.accessToken]?.trim() || null;
  const missing: string[] = [];
  if (!clientId) missing.push(IGDB_ENV.clientId);
  if (!clientSecret && !accessToken) missing.push(`${IGDB_ENV.clientSecret} (or ${IGDB_ENV.accessToken})`);
  if (missing.length > 0 || !clientId) {
    return { present: false, credentials: null, missing, usesPreIssuedToken: false };
  }
  return {
    present: true,
    credentials: { clientId, clientSecret, accessToken },
    missing: [],
    usesPreIssuedToken: accessToken !== null,
  };
}

export interface IgdbCallResult<T> {
  readonly ok: boolean;
  readonly status: number | null;
  readonly elapsedMs: number;
  readonly data: T | null;
  /** Redacted. Null when ok. */
  readonly error: string | null;
  /** How many times the call was attempted (1, or 2 after one 429 back-off). */
  readonly attempts: number;
}

export interface TokenResult {
  readonly ok: boolean;
  readonly status: number | null;
  readonly elapsedMs: number;
  /** Seconds until expiry, as the provider reported it. Safe to print. */
  readonly expiresInSeconds: number | null;
  readonly error: string | null;
  readonly preIssued: boolean;
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface IgdbClientOptions {
  readonly credentials: IgdbCredentials;
  readonly fetch?: FetchLike;
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly env?: NodeJS.ProcessEnv;
}

/**
 * The documented limits, enforced client-side: at most 4 request STARTS in
 * any rolling second and at most 8 requests in flight.
 */
export class IgdbRateGate {
  private readonly starts: number[] = [];
  private inFlight = 0;
  private readonly waiters: (() => void)[] = [];

  constructor(
    private readonly now: () => number,
    private readonly sleep: (ms: number) => Promise<void>,
    private readonly limits = IGDB_RATE_LIMIT,
  ) {}

  async acquire(): Promise<() => void> {
    for (;;) {
      const t = this.now();
      while (this.starts.length > 0 && t - this.starts[0]! >= 1000) this.starts.shift();
      if (this.inFlight < this.limits.maxOpenRequests && this.starts.length < this.limits.requestsPerSecond) {
        this.starts.push(t);
        this.inFlight += 1;
        let released = false;
        return () => {
          if (released) return;
          released = true;
          this.inFlight -= 1;
          const next = this.waiters.shift();
          if (next) next();
        };
      }
      if (this.inFlight >= this.limits.maxOpenRequests) {
        await new Promise<void>((resolve) => this.waiters.push(resolve));
      } else {
        await this.sleep(Math.max(1, 1000 - (t - this.starts[0]!)));
      }
    }
  }

  get openRequests(): number {
    return this.inFlight;
  }
}

export interface IgdbClient {
  ensureToken(): Promise<TokenResult>;
  /** POST an APIcalypse body to `/v4/{endpoint}`. */
  query<T = unknown>(endpoint: string, body: string): Promise<IgdbCallResult<T>>;
  /** `/v4/{endpoint}/count` with an optional `where` clause. */
  count(endpoint: string, where?: string): Promise<IgdbCallResult<number>>;
  listDumps(): Promise<IgdbCallResult<DumpListing>>;
  describeDump(endpoint: string): Promise<IgdbCallResult<DumpDescriptor>>;
}

const ENDPOINT_SHAPE = /^[a-z_]+(\/count)?$/;

export function createIgdbClient(options: IgdbClientOptions): IgdbClient {
  const fetchImpl: FetchLike = options.fetch ?? ((input, init) => fetch(input, init));
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const env = options.env ?? process.env;
  const gate = new IgdbRateGate(now, sleep);
  const { credentials } = options;

  let token: string | null = credentials.accessToken;
  let tokenExpiresAt: number | null = null;

  const safe = (message: string) => redactIgdb(message, env).split(credentials.clientId).join("[redacted]");

  async function ensureToken(): Promise<TokenResult> {
    if (token && (tokenExpiresAt === null || tokenExpiresAt > now())) {
      return { ok: true, status: null, elapsedMs: 0, expiresInSeconds: null, error: null, preIssued: credentials.accessToken !== null };
    }
    if (!credentials.clientSecret) {
      return { ok: false, status: null, elapsedMs: 0, expiresInSeconds: null, error: "No client secret and no usable pre-issued token.", preIssued: false };
    }
    const started = now();
    try {
      // Form-encoded body, as the Twitch client-credentials flow documents. The
      // credentials never appear in the URL, so no URL this client ever
      // handles is credential-bearing.
      const body = new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        grant_type: "client_credentials",
      });
      const response = await fetchImpl(TWITCH_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const elapsedMs = now() - started;
      if (!response.ok) {
        return { ok: false, status: response.status, elapsedMs, expiresInSeconds: null, error: `Token request failed with HTTP ${response.status}.`, preIssued: false };
      }
      const json = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
      if (typeof json.access_token !== "string" || json.access_token.length === 0) {
        return { ok: false, status: response.status, elapsedMs, expiresInSeconds: null, error: "Token response carried no access_token.", preIssued: false };
      }
      const expiresIn = typeof json.expires_in === "number" ? json.expires_in : null;
      token = json.access_token;
      tokenExpiresAt = expiresIn === null ? null : now() + expiresIn * 1000;
      return { ok: true, status: response.status, elapsedMs, expiresInSeconds: expiresIn, error: null, preIssued: false };
    } catch (error) {
      return { ok: false, status: null, elapsedMs: now() - started, expiresInSeconds: null, error: safe(error instanceof Error ? error.message : String(error)), preIssued: false };
    }
  }

  async function call<T>(method: "GET" | "POST", path: string, body: string | null): Promise<IgdbCallResult<T>> {
    const tokenResult = await ensureToken();
    if (!tokenResult.ok) {
      return { ok: false, status: tokenResult.status, elapsedMs: tokenResult.elapsedMs, data: null, error: tokenResult.error, attempts: 0 };
    }
    const started = now();
    let attempts = 0;
    for (;;) {
      attempts += 1;
      const release = await gate.acquire();
      let response: Response;
      try {
        response = await fetchImpl(`${IGDB_API_BASE}/${path}`, {
          method,
          headers: {
            "Client-ID": credentials.clientId,
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            ...(body === null ? {} : { "Content-Type": "text/plain" }),
          },
          ...(body === null ? {} : { body }),
        });
      } catch (error) {
        release();
        return { ok: false, status: null, elapsedMs: now() - started, data: null, error: safe(error instanceof Error ? error.message : String(error)), attempts };
      }
      release();
      if (response.status === 429 && attempts === 1) {
        // One documented back-off; a second 429 is reported, not retried.
        await sleep(1000);
        continue;
      }
      const elapsedMs = now() - started;
      if (!response.ok) {
        return { ok: false, status: response.status, elapsedMs, data: null, error: `IGDB ${path} answered HTTP ${response.status}.`, attempts };
      }
      try {
        const data = (await response.json()) as T;
        return { ok: true, status: response.status, elapsedMs, data, error: null, attempts };
      } catch (error) {
        return { ok: false, status: response.status, elapsedMs, data: null, error: safe(`IGDB ${path} returned unreadable JSON: ${error instanceof Error ? error.message : String(error)}`), attempts };
      }
    }
  }

  function assertEndpoint(endpoint: string): void {
    if (!ENDPOINT_SHAPE.test(endpoint)) throw new Error(`Malformed IGDB endpoint name: ${JSON.stringify(endpoint)}`);
  }

  return {
    ensureToken,
    query<T>(endpoint: string, body: string) {
      assertEndpoint(endpoint);
      return call<T>("POST", endpoint, body);
    },
    async count(endpoint: string, where?: string) {
      assertEndpoint(endpoint);
      const result = await call<{ count?: unknown }>("POST", `${endpoint}/count`, where ? `where ${where};` : "");
      const count = result.data && typeof result.data.count === "number" ? result.data.count : null;
      return { ...result, data: count, ok: result.ok && count !== null, error: result.ok && count === null ? "Count response carried no count." : result.error };
    },
    async listDumps() {
      const result = await call<unknown>("GET", "dumps", null);
      if (!result.ok) return { ...result, data: null };
      const parsed = dumpListingSchema.safeParse(result.data);
      return parsed.success
        ? { ...result, data: parsed.data }
        : { ...result, ok: false, data: null, error: "Dump listing did not match the documented shape." };
    },
    async describeDump(endpoint: string) {
      assertEndpoint(endpoint);
      const result = await call<unknown>("GET", `dumps/${endpoint}`, null);
      if (!result.ok) return { ...result, data: null };
      const parsed = dumpDescriptorSchema.safeParse(result.data);
      return parsed.success
        ? { ...result, data: parsed.data }
        : { ...result, ok: false, data: null, error: "Dump descriptor did not match the documented shape." };
    },
  };
}
