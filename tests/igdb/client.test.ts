import { describe, expect, it } from "vitest";
import { IgdbRateGate, createIgdbClient, readIgdbCredentials } from "@/lib/igdb/client";
import { REDACTED } from "@/lib/igdb/redact";

/**
 * The transport: credentials are read by name and never leave; the token is
 * requested in a form body; the documented limits are enforced client-side;
 * every error is redacted.
 */

const asEnv = (values: Record<string, string>) => values as unknown as NodeJS.ProcessEnv;
const NO_ENV = {} as unknown as NodeJS.ProcessEnv;
const CREDS = { clientId: "fixtureclientid0001", clientSecret: "fixturesecretvalue0001", accessToken: null };

interface Call {
  readonly url: string;
  readonly init: RequestInit;
}

function fakeFetch(handler: (call: Call, n: number) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetchImpl = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return handler({ url, init }, calls.length);
  };
  return { calls, fetchImpl };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("readIgdbCredentials", () => {
  it("names what is missing and never returns a value in the readout", () => {
    expect(readIgdbCredentials(asEnv({}))).toEqual({ present: false, credentials: null, missing: ["IGDB_CLIENT_ID", "IGDB_CLIENT_SECRET (or IGDB_ACCESS_TOKEN)"], usesPreIssuedToken: false });
    const readout = readIgdbCredentials(asEnv({ IGDB_CLIENT_ID: "x", IGDB_ACCESS_TOKEN: "t" }));
    expect(readout.present).toBe(true);
    expect(readout.usesPreIssuedToken).toBe(true);
    expect(JSON.stringify({ ...readout, credentials: undefined })).not.toMatch(/"x"|"t"/);
    expect(readIgdbCredentials(asEnv({ TWITCH_CLIENT_ID: "a", TWITCH_CLIENT_SECRET: "b" })).present).toBe(true);
  });
});

describe("token request", () => {
  it("posts the client-credentials grant as a form body, never in the URL", async () => {
    const { calls, fetchImpl } = fakeFetch(() => json({ access_token: "tok_abcdefghij", expires_in: 5000, token_type: "bearer" }));
    const client = createIgdbClient({ credentials: CREDS, fetch: fetchImpl, env: NO_ENV });
    const token = await client.ensureToken();
    expect(token).toMatchObject({ ok: true, status: 200, expiresInSeconds: 5000, preIssued: false });
    expect(calls[0]?.url).toBe("https://id.twitch.tv/oauth2/token");
    expect(calls[0]?.url).not.toContain("?");
    expect(String(calls[0]?.init.body)).toBe("client_id=fixtureclientid0001&client_secret=fixturesecretvalue0001&grant_type=client_credentials");
    // Cached: a second call does not mint again.
    await client.ensureToken();
    expect(calls).toHaveLength(1);
  });

  it("uses a pre-issued token without touching Twitch", async () => {
    const { calls, fetchImpl } = fakeFetch(() => json({ count: 15 }));
    const client = createIgdbClient({ credentials: { ...CREDS, clientSecret: null, accessToken: "preissued0001" }, fetch: fetchImpl, env: NO_ENV });
    const count = await client.count("game_types");
    expect(count.data).toBe(15);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.igdb.com/v4/game_types/count");
    expect((calls[0]?.init.headers as Record<string, string>).Authorization).toBe("Bearer preissued0001");
    expect((calls[0]?.init.headers as Record<string, string>)["Client-ID"]).toBe("fixtureclientid0001");
  });

  it("reports a failed token request by status, without the secret", async () => {
    const { fetchImpl } = fakeFetch(() => json({ message: "bad" }, 403));
    const client = createIgdbClient({ credentials: CREDS, fetch: fetchImpl, env: NO_ENV });
    const token = await client.ensureToken();
    expect(token.ok).toBe(false);
    expect(token.status).toBe(403);
    expect(token.error).not.toContain("fixturesecretvalue0001");
    const query = await client.query("games", "fields id;");
    expect(query.ok).toBe(false);
    expect(query.attempts).toBe(0);
  });
});

describe("requests", () => {
  it("retries exactly once after a 429, then reports", async () => {
    const { calls, fetchImpl } = fakeFetch((_call, n) => (n === 1 ? json({ access_token: "tok_abcdefghij", expires_in: 1 }) : json([], 429)));
    const client = createIgdbClient({ credentials: CREDS, fetch: fetchImpl, env: NO_ENV, sleep: async () => {} });
    const result = await client.query("games", "fields id; limit 1;");
    expect(result).toMatchObject({ ok: false, status: 429, attempts: 2 });
    expect(calls).toHaveLength(3);
  });

  it("redacts a transport error that echoes a credential", async () => {
    const { fetchImpl } = fakeFetch((_call, n) => {
      if (n === 1) return json({ access_token: "tok_abcdefghij", expires_in: 1 });
      throw new Error("connect failed for Client-ID: fixtureclientid0001 with Bearer tok_abcdefghij");
    });
    const client = createIgdbClient({ credentials: CREDS, fetch: fetchImpl, env: NO_ENV });
    const result = await client.query("games", "fields id;");
    expect(result.ok).toBe(false);
    expect(result.error).not.toContain("fixtureclientid0001");
    expect(result.error).not.toContain("tok_abcdefghij");
    expect(result.error).toContain(REDACTED);
  });

  it("validates the documented dump shapes and refuses malformed endpoint names", async () => {
    const { fetchImpl } = fakeFetch((call, n) => {
      if (n === 1) return json({ access_token: "tok_abcdefghij", expires_in: 1 });
      if (call.url.endsWith("/dumps")) return json([{ endpoint: "games", file_name: "1_games.csv", updated_at: 1 }]);
      return json({ nonsense: true });
    });
    const client = createIgdbClient({ credentials: CREDS, fetch: fetchImpl, env: NO_ENV });
    expect((await client.listDumps()).data).toEqual([{ endpoint: "games", file_name: "1_games.csv", updated_at: 1 }]);
    expect((await client.describeDump("games")).ok).toBe(false);
    expect(() => client.query("../games", "")).toThrow(/Malformed/);
    await expect(client.describeDump("Games;drop")).rejects.toThrow(/Malformed/);
  });

  it("does not treat 401 or 403 on /dumps as a transport failure", async () => {
    const { fetchImpl } = fakeFetch((call, n) => (n === 1 ? json({ access_token: "tok_abcdefghij", expires_in: 1 }) : json({}, call.url.endsWith("/dumps") ? 403 : 200)));
    const client = createIgdbClient({ credentials: CREDS, fetch: fetchImpl, env: NO_ENV });
    const dumps = await client.listDumps();
    expect(dumps).toMatchObject({ ok: false, status: 403, data: null });
  });
});

describe("IgdbRateGate", () => {
  it("allows at most four starts per rolling second", async () => {
    let now = 0;
    const slept: number[] = [];
    const gate = new IgdbRateGate(
      () => now,
      async (ms) => {
        slept.push(ms);
        now += ms;
      },
    );
    for (let i = 0; i < 4; i += 1) (await gate.acquire())();
    expect(slept).toEqual([]);
    (await gate.acquire())();
    expect(slept).toEqual([1000]);
    expect(now).toBe(1000);
  });

  it("holds the ninth request until one of eight completes", async () => {
    let now = 0;
    const gate = new IgdbRateGate(
      () => now,
      async (ms) => {
        now += ms;
      },
    );
    const releases: (() => void)[] = [];
    for (let i = 0; i < 8; i += 1) releases.push(await gate.acquire());
    expect(gate.openRequests).toBe(8);
    let ninthStarted = false;
    const ninth = gate.acquire().then((release) => {
      ninthStarted = true;
      release();
    });
    await Promise.resolve();
    expect(ninthStarted).toBe(false);
    releases[0]!();
    await ninth;
    expect(ninthStarted).toBe(true);
    expect(gate.openRequests).toBe(7);
  });
});
