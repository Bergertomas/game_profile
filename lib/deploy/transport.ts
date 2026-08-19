import type { CloudflareTransport } from "@/lib/deploy/cloudflare";
import type { VerifyTransport } from "@/lib/deploy/verify";

/**
 * The real network, for the server actions that need it.
 *
 * `lib/deploy/cloudflare.ts` and `lib/deploy/verify.ts` both take their `fetch`
 * as an argument with no default, so that a test cannot fall through to the
 * live Cloudflare API by forgetting one. This module is the single place that
 * supplies the real one, which keeps that omission deliberate and greppable:
 * anything reaching production goes through this import, and nothing in
 * `tests/` does.
 *
 * The wrapper is not ceremony. `fetch` is specified to throw a `TypeError` when
 * invoked with the wrong `this`, and passing `globalThis.fetch` around as a
 * bare reference is exactly how that happens on some runtimes.
 */
export const liveTransport: CloudflareTransport & VerifyTransport = {
  fetch: (...args: Parameters<typeof globalThis.fetch>) =>
    globalThis.fetch(...args),
};
