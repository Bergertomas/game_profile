#!/usr/bin/env node
/** Build the app, then own the Next production server for Playwright. */
import { spawn, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  console.error(`playwright-server: invalid port "${process.argv[2]}".`);
  process.exit(64);
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");

const build = spawnSync(process.execPath, [nextCli, "build"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});
if (build.error) {
  console.error(`playwright-server: could not start Next build: ${build.error.message}`);
  process.exit(1);
}
if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawn(process.execPath, [nextCli, "start", "-p", String(port)], {
  cwd: root,
  env: process.env,
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
