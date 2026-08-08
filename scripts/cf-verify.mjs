#!/usr/bin/env node
/**
 * Pre-deploy gate: build the Worker as production and assert what it *serves*.
 *
 * This exists because of a bug that unit tests, `next build` output and the e2e
 * suite all missed. Every prerendered file on disk said `Allow: /` and
 * `index, follow`; the Worker served `Disallow: /` and `noindex`, because the
 * environment was being resolved at request time from a build-only variable that
 * does not exist in the Workers runtime. Production would have quietly
 * deindexed itself while every local check stayed green.
 *
 * The only thing that catches that class of bug is asking the real runtime for
 * the real bytes, which is what this does. It stays outside `npm run verify`
 * because it builds again and boots workerd; `cf:deploy` invokes it as the
 * mandatory production gate.
 */
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { OPEN_NEXT_CLI, WRANGLER_CLI } from "./cf-common.mjs";
import {
  assertPortAvailable,
  parseVerifyPort,
  stopProcessTree,
} from "./cf-local-server.mjs";

const PORT = parseVerifyPort(process.env.CF_VERIFY_PORT);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const BOOT_TIMEOUT_MS = 120_000;
const REQUEST_TIMEOUT_MS = 10_000;

const failures = [];

function check(label, condition, detail) {
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
    failures.push(label);
  }
}

console.log("Building as production…");
const build = spawnSync(process.execPath, [OPEN_NEXT_CLI, "build"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_SITE_ENV: "production" },
});
if (build.status !== 0) process.exit(build.status ?? 1);

await assertPortAvailable(PORT);
console.log(`\nStarting the Worker on ${ORIGIN}…`);
const server = spawn(
  process.execPath,
  [WRANGLER_CLI, "dev", "--port", String(PORT)],
  {
    stdio: "inherit",
    detached: true,
    windowsHide: true,
  },
);
let observedServerOutcome = null;
const serverOutcome = new Promise((resolve) => {
  server.once("error", (error) => {
    observedServerOutcome = { error };
    resolve(observedServerOutcome);
  });
  server.once("exit", (code, signal) => {
    observedServerOutcome = { code, signal };
    resolve(observedServerOutcome);
  });
});

let exitCode = 1;
try {
  await waitForServer(serverOutcome);
  console.log("\nWhat the Worker actually serves:\n");

  const robots = await text("/robots.txt");
  check("robots.txt allows crawling", robots.includes("Allow: /"), robots.trim());
  check("robots.txt advertises the sitemap", robots.includes("Sitemap: https://shouldiplay.gg/sitemap.xml"));
  check("robots.txt excludes the dev surfaces", robots.includes("/dev/") && robots.includes("/design-lab/"));

  const page = await text("/games/returnal");
  check("game page is indexable", /content="index, follow"/.test(page), matchOf(page, /<meta name="robots"[^>]*>/));
  check("game page is canonical to production", page.includes('href="https://shouldiplay.gg/games/returnal"'));
  check("game page asks the search question", page.includes("<title>Should I Play Returnal? | Should I Play?</title>"));
  check("game page publishes no rating", !/aggregateRating|ratingValue|reviewRating/.test(page));

  const sitemap = await text("/sitemap.xml");
  check("sitemap uses the production origin", sitemap.includes("<loc>https://shouldiplay.gg/games/returnal</loc>"));
  check("sitemap omits dev surfaces", !sitemap.includes("/dev/") && !sitemap.includes("/design-lab"));

  const og = await head("/games/returnal/opengraph-image");
  check("share card renders", og.status === 200 && (og.type ?? "").includes("image/png"), `${og.status} ${og.type}`);

  for (const path of ["/dev/radar-states", "/design-lab"]) {
    const res = await head(path);
    check(`${path} is not reachable`, res.status === 404, `got ${res.status}`);
  }

  console.log(
    failures.length === 0
      ? "\nAll production checks passed."
      : `\n${failures.length} check(s) failed. Do not deploy.`,
  );
  exitCode = failures.length === 0 ? 0 : 1;
} finally {
  try {
    await stopProcessTree(server);
  } catch (error) {
    console.error(
      `\nFailed to clean up the verification Worker: ${error instanceof Error ? error.message : String(error)}`,
    );
    exitCode = 1;
  }
}
process.exit(exitCode);

async function waitForServer(outcome) {
  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (observedServerOutcome) throw workerStopped(observedServerOutcome);

    try {
      await fetch(`${ORIGIN}/robots.txt`, {
        signal: AbortSignal.timeout(1_500),
      });

      // A process that lost the port race can exit just after another server
      // answered our request. Require Wrangler to remain alive past readiness.
      const lostRace = await Promise.race([
        outcome,
        sleep(250).then(() => null),
      ]);
      if (lostRace) throw workerStopped(lostRace);
      return;
    } catch {
      const stoppedWhileWaiting = await Promise.race([
        outcome,
        sleep(750).then(() => null),
      ]);
      if (stoppedWhileWaiting) throw workerStopped(stoppedWhileWaiting);
    }
  }
  throw new Error(`Worker did not start within ${BOOT_TIMEOUT_MS}ms`);
}

function workerStopped(outcome) {
  if (outcome.error) {
    return new Error(`Wrangler failed to start: ${outcome.error.message}`);
  }
  return new Error(
    `Wrangler exited before verification (code ${outcome.code}, signal ${outcome.signal ?? "none"}).`,
  );
}

async function text(path) {
  return (
    await fetch(`${ORIGIN}${path}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  ).text();
}

async function head(path) {
  const response = await fetch(`${ORIGIN}${path}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return { status: response.status, type: response.headers.get("content-type") };
}

function matchOf(haystack, pattern) {
  return haystack.match(pattern)?.[0];
}
