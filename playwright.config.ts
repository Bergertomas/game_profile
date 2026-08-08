import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";

const PORT = Number(process.env.PORT ?? 3111);

/**
 * `PLAYWRIGHT_CHROMIUM_PATH` is an optional escape hatch for environments that
 * ship a prebuilt browser at a fixed location. Left unset — the normal case —
 * Playwright resolves its own managed Chromium, so the suite runs on any
 * machine without editing this file.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const nodeCommand = quoteForShell(process.execPath);
const serverScript = quoteForShell(
  join(process.cwd(), "scripts", "playwright-server.mjs"),
);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],
  webServer: {
    // The wrapper owns both build and server lifecycle. Avoiding shell chains
    // matters on Windows: killing `cmd /c "build && start"` can leave the Next
    // child holding Playwright's output pipe open after every test has passed.
    command: `${nodeCommand} ${serverScript} ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Reusing whatever happens to own this port can make a local green run test
    // yesterday's build (or an unrelated app). Keep that escape hatch explicit.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    timeout: 240_000,
  },
});

function quoteForShell(value: string): string {
  return `"${value}"`;
}
