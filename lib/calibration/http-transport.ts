/**
 * The bounded HTTP transport for measured Phase 3A calls.
 *
 * D1 research attempt 2 ended after `300095 ms` as `failed_api / TypeError /
 * fetch failed` with no returned model, response ID or token usage (issue #101
 * comment 5554326255). The harness intended a 600-second bound, but it set that
 * bound only on an `AbortController`. Node's global `fetch` is undici, and
 * undici's dispatcher applies its own `headersTimeout` and `bodyTimeout`, both
 * defaulting to 300 seconds. A long research call that has not yet produced a
 * response header is therefore cut off by the transport 300 seconds in, long
 * before the intended bound, and the outer `TypeError: fetch failed` carries the
 * real reason only in its nested `cause`.
 *
 * This module makes the intended bound the effective one by configuring an
 * undici `Agent` for each call. Node exposes no public API for its bundled
 * undici, so the `Agent` class is taken from the global dispatcher undici
 * installs under its own well-known symbol. Using the bundled class rather than
 * a separately installed copy matters: the dispatcher is handed back to the same
 * `fetch` implementation that created it, so there is no cross-copy contract to
 * hold.
 *
 * If that class cannot be resolved — a future Node, or a process that replaced
 * the global dispatcher — this module refuses rather than falling back to the
 * default. Silently running a measured attempt under an unknown 300-second bound
 * is the exact failure being corrected.
 *
 * Nothing here retries, and nothing here changes what is sent.
 */

export class TransportBoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransportBoundError";
  }
}

/**
 * How long after the dispatcher bound the abort backstop fires.
 *
 * The two layers stop different things. The dispatcher bounds time-to-headers
 * and inactivity between body chunks; the abort bounds total wall clock, which
 * is the only thing that stops a response trickling bytes forever. The margin
 * keeps them from racing: undici runs its timeouts on a coarse timer that can
 * fire up to about half a second late, so the backstop sits clear of that and a
 * stalled connection is reported with undici's specific code rather than as a
 * generic abort.
 */
export const ABORT_BACKSTOP_HEADROOM_MS = 2_000;

/** Undici's own slot for the process-wide dispatcher. Stable since undici v5. */
const UNDICI_GLOBAL_DISPATCHER = Symbol.for("undici.globalDispatcher.1");

interface UndiciAgentOptions {
  readonly headersTimeout: number;
  readonly bodyTimeout: number;
}

/**
 * An opaque handle on the constructed dispatcher.
 *
 * Only the lifecycle is used here. The dispatcher is passed straight back to
 * `fetch`, which owns everything else about it.
 */
export interface BoundedDispatcher {
  close?(): Promise<void>;
  destroy?(): Promise<void>;
}

type UndiciAgentConstructor = new (options: UndiciAgentOptions) => BoundedDispatcher;

/**
 * The bundled undici `Agent` class, or `null` when it cannot be established.
 *
 * Node loads its bundled undici lazily, and the global dispatcher does not exist
 * until it does; constructing an empty `Headers` is the cheapest way to force
 * that load and has no other observable effect.
 */
export function bundledAgentConstructor(): UndiciAgentConstructor | null {
  new Headers();
  const installed = (globalThis as unknown as Record<symbol, unknown>)[UNDICI_GLOBAL_DISPATCHER];
  const constructor = (installed as { constructor?: unknown } | undefined)?.constructor;
  // Only undici's own `Agent` is accepted. A process that installed a proxy or
  // mock dispatcher would give us a class whose constructor either rejects these
  // options or ignores them, and ignoring them is indistinguishable from the
  // 300-second default this module exists to remove.
  if (typeof constructor !== "function" || constructor.name !== "Agent") return null;
  return constructor as UndiciAgentConstructor;
}

/** A dispatcher whose header and body bounds are exactly `timeoutMs`. */
export function boundedDispatcher(timeoutMs: number): BoundedDispatcher {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TransportBoundError(
      `the transport bound must be a positive number of milliseconds; got ${String(timeoutMs)}.`,
    );
  }
  const Agent = bundledAgentConstructor();
  if (Agent === null) {
    throw new TransportBoundError(
      "the undici Agent class backing Node's global fetch could not be established, so the " +
        "request timeout cannot be enforced at the HTTP dispatcher layer. Refusing rather than " +
        "running a measured call under undici's undocumented 300-second default, which is what " +
        "ended D1 research attempt 2. Check the Node version on this runtime before retrying.",
    );
  }
  return new Agent({ headersTimeout: timeoutMs, bodyTimeout: timeoutMs });
}

/** How long a graceful close may take before the pool is destroyed instead. */
const RELEASE_TIMEOUT_MS = 2_000;

/**
 * Release a dispatcher's sockets.
 *
 * Bounded and never throwing, because this runs after the call has finished: a
 * pool that will not close gracefully must not hold up persisting an attempt
 * that has already been paid for, and a close failure is not a measurement fact.
 */
export async function releaseDispatcher(dispatcher: BoundedDispatcher | null): Promise<void> {
  if (dispatcher === null) return;
  let settled = false;
  try {
    await Promise.race([
      (dispatcher.close?.() ?? Promise.resolve()).then(() => {
        settled = true;
      }),
      new Promise<void>((resolve) => {
        setTimeout(resolve, RELEASE_TIMEOUT_MS).unref();
      }),
    ]);
  } catch {
    settled = true;
  }
  if (settled) return;
  // Sockets left open would keep the event loop alive on the way out. Not
  // awaited: the point of the bound is not to wait here.
  void Promise.resolve(dispatcher.destroy?.()).catch(() => {});
}

export interface TransportBoundProof {
  /** Whether the configured bound governed a real stalled connection. */
  readonly ok: boolean;
  readonly bound_ms: number;
  readonly elapsed_ms: number;
  /** The nested transport class/code observed, when there was one. */
  readonly cause_class: string | null;
  readonly cause_code: string | null;
  readonly detail: string | null;
}

/**
 * Prove the dispatcher bound on this runtime, offline.
 *
 * Binds an ephemeral loopback server that accepts the request and never sends a
 * response header — the shape of the attempt-2 failure — and checks that the
 * configured bound, not undici's default, is what ends the call. No provider is
 * contacted, no credential is read and nothing is spent.
 *
 * This is a runtime check rather than only a test, because the runtime that runs
 * a measured attempt is not the runtime that runs CI. The operator's dry run
 * reports it before any live call.
 */
export async function proveTransportBound(boundMs = 250): Promise<TransportBoundProof> {
  const { createServer } = await import("node:http");
  const server = createServer(() => {
    // Deliberately never respond.
  });
  let dispatcher: BoundedDispatcher | null = null;
  const started = Date.now();
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (address === null || typeof address === "string") {
      return {
        ok: false,
        bound_ms: boundMs,
        elapsed_ms: 0,
        cause_class: null,
        cause_code: null,
        detail: "the loopback probe server did not report a port",
      };
    }
    dispatcher = boundedDispatcher(boundMs);
    await fetch(`http://127.0.0.1:${address.port}/`, {
      method: "POST",
      dispatcher,
    } as RequestInit);
    return {
      ok: false,
      bound_ms: boundMs,
      elapsed_ms: Date.now() - started,
      cause_class: null,
      cause_code: null,
      detail: "a server that never sends headers returned a response",
    };
  } catch (error) {
    const elapsed = Date.now() - started;
    if (error instanceof TransportBoundError) {
      return {
        ok: false,
        bound_ms: boundMs,
        elapsed_ms: elapsed,
        cause_class: error.name,
        cause_code: null,
        detail: error.message,
      };
    }
    const cause = (error as { cause?: { name?: unknown; code?: unknown } } | null)?.cause;
    const causeClass = typeof cause?.name === "string" ? cause.name : null;
    const causeCode = typeof cause?.code === "string" ? cause.code : null;
    // The bound governed if the call ended on undici's headers timeout at
    // something close to it, rather than at the 300-second default.
    const ok = causeCode === "UND_ERR_HEADERS_TIMEOUT" && elapsed < boundMs + 5_000;
    return {
      ok,
      bound_ms: boundMs,
      elapsed_ms: elapsed,
      cause_class: causeClass,
      cause_code: causeCode,
      detail: ok ? null : "the configured bound did not end the stalled call",
    };
  } finally {
    await releaseDispatcher(dispatcher);
    server.close();
  }
}
