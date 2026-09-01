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

/**
 * Which projects this invocation asked for, if it named any.
 *
 * Playwright filters PROJECTS by `--project`, but it starts every `webServer`
 * regardless — so `--project=desktop` was building and serving all three
 * corpora to run one of them. That is three concurrent Next builds for no
 * reason, and the contention showed up as navigation timeouts in whichever
 * project lost the race.
 *
 * Reading the flag here lets each server declare which project it belongs to,
 * so a project-only run starts exactly the server it needs. A full run still
 * starts all three, and scripts/playwright-server.mjs serialises their builds.
 */
const requestedProjects = new Set(
  process.argv.flatMap((argument, index) => {
    if (argument === "--project") return [process.argv[index + 1]];
    if (argument.startsWith("--project=")) return [argument.slice(10)];
    return [];
  }).filter((name): name is string => Boolean(name)),
);

/** Whether a named project is in this run. An unfiltered run includes all. */
function isRunning(project: string): boolean {
  return requestedProjects.size === 0 || requestedProjects.has(project);
}

interface ServerSpec {
  readonly project: string;
  readonly port: number;
  readonly corpus?: string;
}

function serverFor({ port, corpus }: ServerSpec) {
  return {
    // The wrapper owns both build and server lifecycle. Avoiding shell chains
    // matters on Windows: killing `cmd /c "build && start"` can leave the Next
    // child holding Playwright's output pipe open after every test has passed.
    command: `${nodeCommand} ${serverScript} ${port}${corpus ? ` ${corpus}` : ""}`,
    url: `http://localhost:${port}`,
    // Reusing whatever happens to own this port can make a local green run test
    // yesterday's build (or an unrelated app). Keep that escape hatch explicit.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    timeout: 240_000,
  };
}

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
    { project: "desktop", port: PORT },
    { project: "multi-scope", port: MULTI_SCOPE_PORT, corpus: "multi-scope" },
    {
      project: "recognized-registry",
      port: RECOGNIZED_PORT,
      corpus: "recognized-registry",
    },
  ]
    .filter((server) => isRunning(server.project))
    .map(serverFor),
});

function quoteForShell(value: string): string {
  return `"${value}"`;
}
