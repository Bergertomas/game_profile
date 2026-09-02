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
 *
 * Two modes, because there are two artefacts with different obligations:
 *
 *   default    production. Indexable, sitemap advertised, design surfaces gone.
 *   --preview  a Cloudflare branch preview. The design lab must be REACHABLE —
 *              that is what previews are for — while the whole site stays
 *              noindex, keeps production canonicals, and keeps design-lab URLs
 *              out of the sitemap.
 *
 * `cf:deploy-preview` runs the preview mode for the same reason `cf:deploy`
 * runs the production one: the guarantee is about what gets served, and only
 * the runtime can be asked.
 */
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import {
  MANIFEST_PATH,
  OPEN_NEXT_CLI,
  PRODUCTION_BRANCH,
  WRANGLER_CLI,
} from "./cf-common.mjs";
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

const PREVIEW = process.argv.includes("--preview");
const SITE_ENV = PREVIEW ? "preview" : "production";

console.log(`Building as ${SITE_ENV}…`);
const build = spawnSync(process.execPath, [OPEN_NEXT_CLI, "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_SITE_ENV: SITE_ENV,
    // An inherited branch name outranks the explicit value (a non-main branch
    // is always a preview), which would silently build the wrong artefact when
    // this runs inside Workers Builds. Drop it and say what we mean.
    WORKERS_CI_BRANCH: PREVIEW ? "" : PRODUCTION_BRANCH,
  },
});
if (build.status !== 0) process.exit(build.status ?? 1);

/*
 * Populate the static-assets incremental cache.
 *
 * `build` does not do this; `deploy` and `upload` do. Skipping it here would
 * boot a Worker that behaves differently from the one that ships: with no
 * populated cache the Worker cannot find the prerendered pages and re-renders
 * every request inside workerd instead of serving the build's output.
 *
 * That was invisible while fixtures were the only data source, because both
 * paths produced identical bytes. It stopped being invisible the moment the
 * build started reading Postgres and the Worker could not — the Worker served
 * the fixture corpus while the build had published the database's. Verifying an
 * artefact assembled differently from the deployed one is not verification.
 */
console.log("\nPopulating the static-assets cache…");
const populate = spawnSync(
  process.execPath,
  [OPEN_NEXT_CLI, "populateCache", "local"],
  { stdio: "inherit", env: { ...process.env } },
);
if (populate.status !== 0) process.exit(populate.status ?? 1);

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
  if (PREVIEW) {
    // A preview is a live, publicly-addressable host that is not the product.
    // Nothing about it may enter an index.
    check("robots.txt refuses all crawling", robots.includes("Disallow: /"), robots.trim());
    check("robots.txt advertises no sitemap", !robots.includes("Sitemap:"), robots.trim());
  } else {
    check("robots.txt allows crawling", robots.includes("Allow: /"), robots.trim());
    check("robots.txt advertises the sitemap", robots.includes("Sitemap: https://shouldiplay.gg/sitemap.xml"));
    check("robots.txt excludes the dev surfaces", robots.includes("/dev/") && robots.includes("/design-lab/"));
  }

  // Status first. A 404 body still carries the root layout's indexable
  // metadata, so every content check below would pass while the Worker served
  // nothing — which is exactly how `dynamicParams = false` slipped through as
  // "indexable" while 404ing every game page.
  const gamePage = await get("/games/returnal");
  check(
    "game page is served at all",
    gamePage.status === 200,
    `got ${gamePage.status}`,
  );
  const page = gamePage.body;
  check(
    PREVIEW ? "game page is not indexable" : "game page is indexable",
    PREVIEW
      ? /content="noindex, nofollow"/.test(page)
      : /content="index, follow"/.test(page),
    matchOf(page, /<meta name="robots"[^>]*>/),
  );
  // True in both environments, and load-bearing in preview: a preview host must
  // never be able to claim canonical status for a production URL.
  check("game page is canonical to production", page.includes('href="https://shouldiplay.gg/games/returnal"'));
  check("game page asks the search question", page.includes("<title>Should I Play Returnal? | Should I Play?</title>"));
  check("game page publishes no rating", !/aggregateRating|ratingValue|reviewRating/.test(page));

  // ── An address that does not exist answers 404, in the real runtime ─────
  //
  // Every published profile is prerendered, so the ONLY `/games/*` URLs the
  // deployed Worker renders on demand are ones that do not exist. That render
  // has no database — the public path is build-time Postgres only (ADR 0017) —
  // and a production bundle refuses to load a corpus without one, which threw
  // before `notFound()` could be reached. Production answered **500** for every
  // unknown or stale game URL: mistyped links, retired slugs, and every URL a
  // crawler still held.
  //
  // Nothing else catches this. The unit suite and `next start` both have a
  // database in the process, so the throw never happens there; only asking
  // workerd for the real bytes reproduces the deployed condition. It is checked
  // here for the same reason `dynamicParams` is: this is the gate that asks the
  // runtime that actually serves.
  for (const [label, path] of [
    ["unknown game slug", "/games/no-such-game"],
    ["unknown scope", "/games/returnal/no-such-scope"],
    ["unknown slug and scope", "/games/no-such-game/no-such-scope"],
    ["a slug that looks like a file", "/games/returnal.json"],
    ["an unknown root route", "/no-such-page"],
  ]) {
    const missing = await get(path);
    check(
      `${label} answers 404, not a server error`,
      missing.status === 404,
      `${path} got ${missing.status}`,
    );
  }

  const sitemap = await text("/sitemap.xml");
  check("sitemap uses the production origin", sitemap.includes("<loc>https://shouldiplay.gg/games/returnal</loc>"));
  // Design surfaces stay out of the sitemap in EVERY environment. In preview
  // they are reachable, which is exactly when it would be easy to list them.
  check("sitemap omits dev surfaces", !sitemap.includes("/dev/") && !sitemap.includes("/design-lab"));

  // ── The artifact's inventory of itself ──────────────────────────────────
  //
  // Phase 2D-2 derives Live from this document and nothing else, so a build
  // that ships it broken does not report a broken manifest — it reports that
  // nothing is Live, forever, while the site serves perfectly. That failure is
  // silent everywhere except here.
  const manifestResponse = await get(MANIFEST_PATH);
  check(
    "deployment manifest is served",
    manifestResponse.status === 200,
    `got ${manifestResponse.status}`,
  );
  check(
    "deployment manifest is JSON",
    (manifestResponse.headers?.get("content-type") ?? "").includes("application/json"),
    manifestResponse.headers?.get("content-type") ?? "absent",
  );

  let manifest = null;
  try {
    manifest = JSON.parse(manifestResponse.body);
  } catch (error) {
    check("deployment manifest parses", false, String(error));
  }

  if (manifest) {
    check(
      "deployment manifest declares the expected schema",
      manifest.schema === "should-i-play/deployment-manifest@1",
      String(manifest.schema),
    );
    check(
      `deployment manifest reports siteEnv "${SITE_ENV}"`,
      manifest.siteEnv === SITE_ENV,
      String(manifest.siteEnv),
    );
    check(
      "deployment manifest carries a digest",
      /^[0-9a-f]{64}$/.test(String(manifest.digest)),
      String(manifest.digest),
    );

    // Every profile the manifest claims must be a profile the sitemap lists.
    // Two independent surfaces built from one corpus read: if they disagree,
    // the manifest is describing something the artifact does not serve, which
    // is the one way a *self*-reported inventory can still lie.
    const missing = (manifest.entries ?? [])
      .map((entry) => entry.path)
      .filter((path) => !sitemap.includes(`<loc>https://shouldiplay.gg${path}</loc>`));
    check(
      "every manifest entry is a profile the sitemap lists",
      missing.length === 0,
      missing.join(", ") || "none missing",
    );

    // PRERENDERED, NOT EVALUATED PER REQUEST.
    //
    // `force-static` is what makes this a record of the build. Without it the
    // Worker would run the handler per request — no database, no build
    // variables — and answer with an empty corpus that looks like a manifest.
    // A second request proves which happened: a prerendered body is byte-
    // identical, a re-evaluated one carries a fresh `generatedAt`.
    const second = await get(MANIFEST_PATH);
    check(
      "deployment manifest is prerendered, not re-evaluated per request",
      second.body === manifestResponse.body,
      `first generatedAt ${manifest.generatedAt}, second ${
        (() => {
          try {
            return JSON.parse(second.body).generatedAt;
          } catch {
            return "unparseable";
          }
        })()
      }`,
    );
  }

  // Followed from the page's own `og:image` rather than hard-coded. Next
  // appends a cache-busting hash to a generated image route, derived from that
  // route's module path — so it moves whenever the file moves, as it did when
  // the public routes went into a route group. The address a crawler is
  // actually handed is the one worth verifying.
  const shareCardUrl = page.match(/property="og:image"\s+content="([^"]+)"/)?.[1];
  check("game page publishes a share-card URL", Boolean(shareCardUrl), shareCardUrl ?? "none");
  if (shareCardUrl) {
    const { pathname, search } = new URL(shareCardUrl);
    const og = await head(`${pathname}${search}`);
    check(
      "share card renders",
      og.status === 200 && (og.type ?? "").includes("image/png"),
      `${og.status} ${og.type}`,
    );
  }

  // The editorial tool, in the artefact that actually deploys.
  //
  // It ships in every build and is switched on by configuration this deployment
  // does not have: no Cloudflare Access application, no `ADMIN_DATABASE_URL`
  // (ADR 0018). Unconfigured, it must be indistinguishable from a path that was
  // never routed — in BOTH environments, because a preview carries the same
  // code and unpublished editorial is not preview-appropriate content either.
  //
  // Asked of workerd rather than of `next start`, because the whole reason this
  // script exists is that the two runtimes disagree: the obvious `proxy.ts`
  // gate passed everywhere else and could not be built for Cloudflare at all.
  for (const path of ["/admin", "/admin/games", "/admin/games/new"]) {
    const res = await get(path);
    check(`${path} is not reachable unconfigured`, res.status === 404, String(res.status));
    check(
      `${path} is never indexable`,
      (res.headers?.get("x-robots-tag") ?? "").includes("noindex"),
      res.headers?.get("x-robots-tag") ?? "absent",
    );
  }

  const DESIGN_SURFACES = [
    "/dev/radar-states",
    "/dev/home-states",
    "/dev/profile-states",
    "/design-lab",
    "/design-lab/d3/alan-wake-2",
  ];
  for (const path of DESIGN_SURFACES) {
    const res = await get(path);
    if (PREVIEW) {
      // The whole point of a preview. If these 404 here, design work is
      // invisible everywhere except a laptop and the pipeline is pointless.
      check(`${path} is reachable for review`, res.status === 200, `got ${res.status}`);
      check(
        `${path} is not indexable`,
        /content="noindex, nofollow"/.test(res.body),
        matchOf(res.body, /<meta name="robots"[^>]*>/) ?? "no robots meta",
      );
    } else {
      check(`${path} is not reachable`, res.status === 404, `got ${res.status}`);
    }
  }

  const artHosts = ["alanwake.com", "steamstatic.com"];
  if (PREVIEW) {
    // A preview exists to review the real page with real artwork, so the game
    // page is expected to carry it — and to say on what basis.
    check(
      "game page renders evaluation artwork for review",
      artHosts.some((host) => page.includes(host)),
    );
    check(
      "game page states the artwork clearance basis",
      page.includes("Not cleared for production"),
    );
  } else {
    // The absolute guarantee. check-build-containment asserts it against the
    // artefact; this asserts it against what the Worker actually returns.
    const home = await text("/");
    check(
      "no production page requests evaluation artwork",
      artHosts.every((host) => !home.includes(host) && !page.includes(host)),
    );
  }

  console.log(
    failures.length === 0
      ? `\nAll ${SITE_ENV} checks passed.`
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
  return (await get(path)).body;
}

async function get(path) {
  const response = await fetch(`${ORIGIN}${path}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  // Headers as well as the body: the admin checks assert on `x-robots-tag`,
  // which is routing configuration rather than page content and so cannot be
  // read out of the HTML.
  return {
    status: response.status,
    headers: response.headers,
    body: await response.text(),
  };
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
