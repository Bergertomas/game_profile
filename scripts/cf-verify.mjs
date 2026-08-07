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
 * the real bytes, which is what this does. Not part of `npm run verify` — it
 * builds twice and boots workerd — but run it before any production deploy.
 */
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = Number(process.env.CF_VERIFY_PORT ?? 8787);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const BOOT_TIMEOUT_MS = 120_000;

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
const build = spawnSync("npx", ["opennextjs-cloudflare", "build"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_SITE_ENV: "production" },
});
if (build.status !== 0) process.exit(build.status ?? 1);

console.log(`\nStarting the Worker on ${ORIGIN}…`);
const server = spawn("npx", ["wrangler", "dev", "--port", String(PORT)], {
  stdio: "ignore",
  detached: true,
});

let exitCode = 1;
try {
  await waitForServer();
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
    process.kill(-server.pid, "SIGTERM");
  } catch {
    // Already gone.
  }
}
process.exit(exitCode);

async function waitForServer() {
  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await fetch(`${ORIGIN}/robots.txt`);
      return;
    } catch {
      await sleep(1000);
    }
  }
  throw new Error(`Worker did not start within ${BOOT_TIMEOUT_MS}ms`);
}

async function text(path) {
  return (await fetch(`${ORIGIN}${path}`)).text();
}

async function head(path) {
  const response = await fetch(`${ORIGIN}${path}`);
  return { status: response.status, type: response.headers.get("content-type") };
}

function matchOf(haystack, pattern) {
  return haystack.match(pattern)?.[0];
}
