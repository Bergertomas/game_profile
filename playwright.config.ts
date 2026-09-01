import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";

const PORT = Number(process.env.PORT ?? 3111);
/**
 * The multi-scope corpus gets its own port, its own build directory and its own
 * project, rather than being folded into the main one.
 *
 * It has to be a second build: the corpus is chosen before `next build`,
 * because every public page is prerendered. Keeping it separate also keeps the
 * ordinary catalogue exactly as it ships — the main project still asserts
 * against three games and no switcher, which is what almost every reader sees.
 */
const MULTI_SCOPE_PORT = PORT + 1;

/**
 * The recognised-registry corpus gets a third build for the same reason.
 *
 * `content/search-registry.ts` ships empty and must — a row in it is a public
 * editorial claim about a real product — so the search field's
 * recognised-but-unprofiled branch is unreachable in a browser against the
 * shipped catalogue. `PROFILE_TEST_CORPUS=recognized-registry` fills it with
 * visibly synthetic titles that name no real game, and a production build
 * asking for it refuses outright (lib/search/test-registry.ts).
 */
const RECOGNIZED_PORT = PORT + 2;

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

const chromium = {
  ...devices["Desktop Chrome"],
  ...(executablePath ? { launchOptions: { executablePath } } : {}),
};

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
      use: chromium,
      testIgnore: /(multi-scope|recognized-registry)\.spec\.ts$/,
    },
    {
      name: "multi-scope",
      use: { ...chromium, baseURL: `http://localhost:${MULTI_SCOPE_PORT}` },
      testMatch: /multi-scope\.spec\.ts$/,
    },
    {
      name: "recognized-registry",
      use: { ...chromium, baseURL: `http://localhost:${RECOGNIZED_PORT}` },
      testMatch: /recognized-registry\.spec\.ts$/,
    },
  ],
  webServer: [
    {
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
    {
      command: `${nodeCommand} ${serverScript} ${MULTI_SCOPE_PORT} multi-scope`,
      url: `http://localhost:${MULTI_SCOPE_PORT}`,
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
      timeout: 240_000,
    },
    {
      command: `${nodeCommand} ${serverScript} ${RECOGNIZED_PORT} recognized-registry`,
      url: `http://localhost:${RECOGNIZED_PORT}`,
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
      timeout: 240_000,
    },
  ],
});

function quoteForShell(value: string): string {
  return `"${value}"`;
}
