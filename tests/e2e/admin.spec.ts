import { expect, test } from "@playwright/test";

/**
 * The editorial tool, as an unauthenticated visitor sees it.
 *
 * This build sets no admin variables — which is the deployed default and the
 * whole point of the arrangement in ADR 0018: shipping the admin does not
 * switch it on. So every `/admin` path must be indistinguishable from a path
 * that was never routed.
 *
 * A test that the *authenticated* tool works is not here on purpose. It would
 * need a build carrying a development identity and a live editorial database,
 * which is a different deployment shape from the one that ships; asserting the
 * refusal is what protects the site, and the tool's own behaviour is covered by
 * the unit suite and by working against a local database.
 */

const EVALUATION_ID = "2f1c9a6e-0f1e-4a5b-9c3d-8e7f6a5b4c3d";

const ADMIN_PATHS = [
  "/admin",
  "/admin/games",
  "/admin/games/new",
  `/admin/games/${EVALUATION_ID}`,
  /*
   * The Phase 2D surfaces, and `preview` is the one that matters most here.
   *
   * Every other admin page shows editorial *metadata* to anyone who got past
   * the guard. This one renders an unpublished profile through the public
   * renderer — a draft, at whatever stage it has reached, in the exact markup
   * the site uses. A leak here would not look like an admin page that escaped;
   * it would look like a published profile, which is the one thing the
   * published/draft distinction exists to prevent.
   */
  `/admin/evaluations/${EVALUATION_ID}/preview`,
  `/admin/evaluations/${EVALUATION_ID}/publish`,
  `/admin/scopes/${EVALUATION_ID}/history`,
];

for (const path of ADMIN_PATHS) {
  test(`${path} is not reachable without configuration`, async ({ page }) => {
    const response = await page.goto(path);
    // 404, not 503 or a login page: a deployment that answers "the admin is
    // here but switched off" has told a prober where to come back to.
    expect(response?.status()).toBe(404);
  });
}

test("no admin path leaks editorial vocabulary to an unauthenticated visitor", async ({
  page,
}) => {
  await page.goto("/admin/games");
  const body = (await page.locator("body").textContent()) ?? "";
  for (const word of ["Editorial dashboard", "Profile scopes", "Add a game"]) {
    expect(body).not.toContain(word);
  }
});

test("the sitemap lists published profiles only", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();
  expect(xml).toContain("/games/");
  expect(xml).not.toContain("/admin");
});

test("robots.txt keeps crawlers off the editorial tool", async ({ request }) => {
  const response = await request.get("/robots.txt");
  const text = await response.text();
  // A local build is a preview, so the whole site is disallowed. Either form
  // satisfies the requirement that /admin is never invited.
  expect(text).toMatch(/Disallow: \/(admin\/)?/);
  expect(text).not.toMatch(/Allow: \/admin/);
});
