import { spawnSync } from "node:child_process";
import { createServer } from "node:net";

const DEFAULT_VERIFY_PORT = 8787;

export function parseVerifyPort(value) {
  const port = value === undefined ? DEFAULT_VERIFY_PORT : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(
      `CF_VERIFY_PORT must be an integer from 1 to 65535 (received "${value}").`,
    );
  }
  return port;
}

/** Refuse to start if the verification origin is already owned by something else. */
export async function assertPortAvailable(port, host = "127.0.0.1") {
  const probe = createServer();
  probe.unref();

  try {
    await new Promise((resolve, reject) => {
      probe.once("error", reject);
      probe.listen({ host, port, exclusive: true }, resolve);
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Verification port ${host}:${port} is already in use or unavailable; ` +
        `refusing to test an unowned server (${detail}).`,
    );
  } finally {
    if (probe.listening) {
      await new Promise((resolve, reject) =>
        probe.close((error) => (error ? reject(error) : resolve())),
      );
    }
  }
}

/**
 * Stop a detached Wrangler process and every process it created.
 *
 * Negative process-group IDs are POSIX-only. Windows throws for them, so use
 * its process-tree primitive instead. Failure is surfaced to the deploy gate:
 * leaving a stale Worker behind would make a later run capable of verifying
 * the wrong artifact.
 */
export async function stopProcessTree(child, { timeoutMs = 5_000 } = {}) {
  if (!child.pid || hasExited(child)) return;

  if (process.platform === "win32") {
    const result = spawnSync(
      "taskkill",
      ["/PID", String(child.pid), "/T", "/F"],
      { stdio: "ignore", windowsHide: true, timeout: timeoutMs },
    );
    const stopped = await waitForExit(child, timeoutMs);
    if (!stopped) {
      const detail = result.error?.message ?? `exit status ${result.status}`;
      throw new Error(
        `Could not stop Wrangler process tree ${child.pid}: ${detail}.`,
      );
    }
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (error) {
    if (
      !hasExited(child) &&
      /** @type {NodeJS.ErrnoException} */ (error).code !== "ESRCH"
    ) {
      throw error;
    }
  }

  if (await waitForExit(child, timeoutMs)) return;

  process.kill(-child.pid, "SIGKILL");
  if (!(await waitForExit(child, 2_000))) {
    throw new Error(`Could not stop Wrangler process group ${child.pid}.`);
  }
}

function hasExited(child) {
  return child.exitCode !== null || child.signalCode !== null;
}

async function waitForExit(child, timeoutMs) {
  if (hasExited(child)) return true;
  return new Promise((resolve) => {
    const onExit = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      child.off("exit", onExit);
      resolve(false);
    }, timeoutMs);
    child.once("exit", onExit);
  });
}
