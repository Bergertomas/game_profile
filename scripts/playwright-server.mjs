#!/usr/bin/env node
/**
 * Build the app, then own the Next production server for Playwright.
 *
 * An optional second argument names a test corpus, which is forwarded to the
 * build as `PROFILE_TEST_CORPUS`. It exists so the multi-scope Playwright
 * project can build a site whose catalogue contains a game with two published
 * profile scopes — the switcher's rendering branch is otherwise unreachable in
 * a browser, because every seeded game has exactly one evaluated experience.
 *
 * The corpus is a build input, not a runtime one: the pages are prerendered, so
 * it has to be set before `next build` rather than before `next start`. Both
 * commands get it anyway, since a mismatch between them is exactly the kind of
 * confusion worth not having.
 */
import { spawn, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  console.error(`playwright-server: invalid port "${process.argv[2]}".`);
  process.exit(64);
}

const corpus = process.argv[3];
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");

// A separate build directory per corpus. Sharing `.next` between the two
// Playwright projects would let whichever server started second overwrite the
// first one's prerendered pages mid-run, and the failure would look like a
// flaky test rather than like two builds fighting.
const env = {
  ...process.env,
  ...(corpus
    ? {
        PROFILE_TEST_CORPUS: corpus,
        NEXT_DIST_DIR: `.next-${corpus}`,
        // A named corpus is fixture-backed by definition. CI supplies these
        // variables for the ordinary server; empty values also prevent a local
        // .env file from making this build silently bypass its synthetic corpus.
        DATABASE_URL: "",
        REQUIRE_DATABASE: "",
      }
    : {}),
};

const build = spawnSync(process.execPath, [nextCli, "build"], {
  cwd: root,
  env,
  stdio: "inherit",
});
if (build.error) {
  console.error(`playwright-server: could not start Next build: ${build.error.message}`);
  process.exit(1);
}
if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawn(process.execPath, [nextCli, "start", "-p", String(port)], {
  cwd: root,
  env,
  stdio: "inherit",
  windowsHide: true,
});

let stopping = false;
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => stop(signal));
}

server.once("error", (error) => {
  console.error(`playwright-server: Next failed to start: ${error.message}`);
  process.exitCode = 1;
});
server.once("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});

function stop(signal) {
  if (stopping) return;
  stopping = true;
  if (server.exitCode === null && server.signalCode === null) {
    server.kill(signal);
  }
}
