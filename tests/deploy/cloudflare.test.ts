import { describe, expect, it } from "vitest";
import {
  readBuildStatus,
  requestBuild,
  type CloudflareTransport,
} from "@/lib/deploy/cloudflare";
import { redactSecrets, type DeployConfig } from "@/lib/deploy/config";

/**
 * The Cloudflare client, against a mock. Nothing here reaches the network.
 *
 * That is structural rather than a promise: `requestBuild` and
 * `readBuildStatus` take their transport as a required argument with no
 * default, so a test cannot fall through to the real API by forgetting one.
 * `tests/deploy/credential-boundary.test.ts` pins the other half — that no test
 * imports the module which supplies the real `fetch`.
 */

const SECRET = "cf-token-0123456789abcdef0123456789abcdef";

const CONFIG: DeployConfig = {
  accountId: "account-1",
  triggerId: "trigger-1",
  workerTag: "worker-tag-1",
  apiToken: SECRET,
};

interface Recorded {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

function transportReturning(
  status: number,
  body: string,
  sink?: Recorded[],
): CloudflareTransport {
  return {
    fetch: async (input, init) => {
      sink?.push({ url: String(input), init });
      return new Response(body, { status });
    },
  };
}

function transportThrowing(error: Error): CloudflareTransport {
  return {
    fetch: async () => {
      throw error;
    },
  };
}

describe("requestBuild", () => {
  it("asks the documented endpoint for the named branch", async () => {
    const calls: Recorded[] = [];
    await requestBuild(
      transportReturning(200, JSON.stringify({ result: { build_uuid: "b-9" } }), calls),
      CONFIG,
      "main",
    );

    expect(calls).toHaveLength(1);
    // Cloudflare's Workers Builds API reference:
    // POST /accounts/{account_id}/builds/triggers/{trigger_uuid}/builds
    expect(calls[0]!.url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/account-1/builds/triggers/trigger-1/builds",
    );
    expect(calls[0]!.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({ branch: "main" });
  });

  it("reports the build id when Cloudflare accepts", async () => {
    const outcome = await requestBuild(
      transportReturning(200, JSON.stringify({ result: { build_uuid: "b-9" } })),
      CONFIG,
      "main",
    );
    expect(outcome).toEqual({ kind: "accepted", buildId: "b-9" });
  });

  /**
   * A 4xx is Cloudflare declining to act, so no build exists and a retry is
   * safe. This is the half of the split that may be retried.
   */
  it("treats a 4xx as a refusal, with Cloudflare's own reason", async () => {
    const outcome = await requestBuild(
      transportReturning(
        403,
        JSON.stringify({ success: false, errors: [{ code: 10000, message: "Invalid token" }] }),
      ),
      CONFIG,
      "main",
    );
    expect(outcome).toMatchObject({ kind: "refused", status: 403 });
    expect(outcome.kind === "refused" && outcome.detail).toContain("Invalid token");
  });

  /**
   * A 5xx may be a proxy failing AFTER the request reached the service, so a
   * build may exist. Reporting it as a refusal is what queues a duplicate
   * production build.
   */
  it("treats a 5xx as unknown, not as a refusal", async () => {
    const outcome = await requestBuild(
      transportReturning(502, "bad gateway"),
      CONFIG,
      "main",
    );
    expect(outcome.kind).toBe("unknown");
  });

  it("treats a transport failure as unknown", async () => {
    const outcome = await requestBuild(
      transportThrowing(new Error("socket hang up")),
      CONFIG,
      "main",
    );
    expect(outcome.kind).toBe("unknown");
    expect(outcome.kind === "unknown" && outcome.detail).toMatch(
      /may or may not have been queued/,
    );
  });

  it("treats a timeout as unknown", async () => {
    const abortError = new Error("The operation was aborted.");
    abortError.name = "AbortError";
    const outcome = await requestBuild(transportThrowing(abortError), CONFIG, "main");
    expect(outcome.kind).toBe("unknown");
  });

  /**
   * A 200 with no build id is the subtlest failure here: the build probably
   * exists, and nothing can ever match it to this request. Calling it accepted
   * would invent an id; calling it refused would invite a duplicate.
   */
  it("treats a success carrying no build id as unknown", async () => {
    const outcome = await requestBuild(
      transportReturning(200, JSON.stringify({ result: null, success: true })),
      CONFIG,
      "main",
    );
    expect(outcome.kind).toBe("unknown");
  });

  /**
   * The response shape is parsed loosely on purpose: a field Cloudflare adds
   * later must not turn an accepted dispatch into an unknown one, because the
   * cost of that is a second production build.
   */
  it("still accepts a response that has gained unexpected fields", async () => {
    const outcome = await requestBuild(
      transportReturning(
        200,
        JSON.stringify({
          result: { build_uuid: "b-9", new_field: 1 },
          success: true,
          brand_new_key: "whatever",
        }),
      ),
      CONFIG,
      "main",
    );
    expect(outcome).toEqual({ kind: "accepted", buildId: "b-9" });
  });

  it("sends the credential as a bearer header and nowhere else", async () => {
    const calls: Recorded[] = [];
    await requestBuild(
      transportReturning(200, JSON.stringify({ result: { build_uuid: "b-9" } }), calls),
      CONFIG,
      "main",
    );

    const { url, init } = calls[0]!;
    const headers = init?.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${SECRET}`);
    expect(url).not.toContain(SECRET);
    expect(String(init?.body)).not.toContain(SECRET);
  });

  /**
   * The provider echoes request context in some error bodies, and this
   * repository does not get to assume it never echoes the header.
   */
  it("strips the credential out of anything Cloudflare echoes back", async () => {
    const outcome = await requestBuild(
      transportReturning(
        400,
        JSON.stringify({
          errors: [{ code: 1, message: `bad request with Bearer ${SECRET}` }],
        }),
      ),
      CONFIG,
      "main",
    );
    expect(outcome.kind).toBe("refused");
    const detail = outcome.kind === "refused" ? outcome.detail : "";
    expect(detail).not.toContain(SECRET);
    expect(detail).toContain("[redacted]");
  });

  it("strips the credential out of a transport error message", async () => {
    const outcome = await requestBuild(
      transportThrowing(new Error(`connect failed using ${SECRET}`)),
      CONFIG,
      "main",
    );
    const detail = outcome.kind === "unknown" ? outcome.detail : "";
    expect(detail).not.toContain(SECRET);
  });
});

describe("readBuildStatus", () => {
  it("says so plainly when no worker tag is configured", async () => {
    const outcome = await readBuildStatus(
      transportReturning(200, "{}"),
      { ...CONFIG, workerTag: null },
      "b-9",
    );
    expect(outcome).toMatchObject({ kind: "unavailable" });
    // And says the important part: this is a diagnostic, not a prerequisite.
    expect(outcome.kind === "unavailable" && outcome.detail).toMatch(
      /Live is proven by the\s+artifact's manifest/,
    );
  });

  it("finds the build it asked about", async () => {
    const outcome = await readBuildStatus(
      transportReturning(
        200,
        JSON.stringify({
          result: [
            { build_uuid: "other", status: "running" },
            { build_uuid: "b-9", status: "success", build_outcome: "success" },
          ],
        }),
      ),
      CONFIG,
      "b-9",
    );
    expect(outcome).toEqual({
      kind: "found",
      status: "success",
      buildOutcome: "success",
    });
  });

  /**
   * A build old enough to have fallen off Cloudflare's recent list says nothing
   * about whether it succeeded. `not-found` is distinct from `found` for that
   * reason: it must never be read as a verdict.
   */
  it("distinguishes 'not in the list' from a verdict", async () => {
    const outcome = await readBuildStatus(
      transportReturning(200, JSON.stringify({ result: [] })),
      CONFIG,
      "b-9",
    );
    expect(outcome).toEqual({ kind: "not-found" });
  });

  it("reports an unusable answer as unavailable rather than guessing", async () => {
    for (const [status, body] of [
      [500, "boom"],
      [200, "not json"],
      [200, JSON.stringify({ result: "not an array" })],
    ] as const) {
      const outcome = await readBuildStatus(
        transportReturning(status, body),
        CONFIG,
        "b-9",
      );
      expect(outcome.kind).toBe("unavailable");
    }
  });
});

describe("redactSecrets", () => {
  it("removes every occurrence, not just the first", () => {
    expect(redactSecrets(`${SECRET} and ${SECRET}`, [SECRET])).toBe(
      "[redacted] and [redacted]",
    );
  });

  it("leaves text alone when there is nothing to redact", () => {
    expect(redactSecrets("nothing secret here", [null, undefined])).toBe(
      "nothing secret here",
    );
  });

  /**
   * A two-character "secret" would turn redaction into noise across every
   * message. Cloudflare tokens are 40 characters; the floor sits far below
   * that and far above the length at which a false positive is plausible.
   */
  it("ignores values too short to be a credential", () => {
    expect(redactSecrets("a short string", ["a"])).toBe("a short string");
  });
});
