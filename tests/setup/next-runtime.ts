import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Make Next's server modules importable from a plain Node test.
 *
 * `next/server` reaches for `globalThis.AsyncLocalStorage` at import time and
 * throws "Invariant: AsyncLocalStorage accessed in runtime where it is not
 * available" when it is absent. Next's own runtimes install it — the edge
 * runtime as a global, the Node server before loading user code — so nothing in
 * production depends on this shim; it only reproduces the ambient global that
 * every real runtime already provides.
 *
 * Assigned rather than replaced, so a runtime that already has one keeps it.
 */
const globals = globalThis as typeof globalThis & {
  AsyncLocalStorage?: typeof AsyncLocalStorage;
};
globals.AsyncLocalStorage ??= AsyncLocalStorage;
