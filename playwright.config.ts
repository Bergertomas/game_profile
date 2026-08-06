import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3111);

/**
 * `PLAYWRIGHT_CHROMIUM_PATH` is an optional escape hatch for environments that
 * ship a prebuilt browser at a fixed location. Left unset — the normal case —
 * Playwright resolves its own managed Chromium, so the suite runs on any
 * machine without editing this file.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

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
    // Invoked through npx so the suite does not assume npm, pnpm or yarn — each
    // puts the `next` binary in node_modules/.bin, which npx resolves.
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
