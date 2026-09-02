import { expect, test } from "@playwright/test";

/**
 * The public scope switcher, in a real browser, against a real multi-scope
 * corpus (Master Plan §12, 2B).
 *
 * This project builds with `PROFILE_TEST_CORPUS=multi-scope`, which adds a
 * synthetic second scope to Returnal — the "Tower of Sisyphus" sibling that
 * Returnal's own scope summary already says is outside the main evaluation.
 * Every real seeded game has one evaluated experience, so without it the
 * switcher's rendering branch cannot be exercised in a browser at all.
 *
 * The synthetic profile's numbers are not an evaluation of anything and are
 * documented as such in content/test-corpus.ts. Nothing here asserts on them
 * except that the two profiles are different documents, which is the property
 * that makes "the sibling URL renders the sibling's evaluation" testable.
 */

const GAME = "/games/returnal";
const SIBLING = "/games/returnal/tower-of-sisyphus";

test("the bare game URL still serves the primary scope", async ({ page }) => {
  const response = await page.goto(GAME);
  expect(response?.status()).toBe(200);
  // Never a redirect to a sibling, and never a chooser page: the canonical URL
  // answers with the primary profile itself (ADR 0016).
  expect(new URL(page.url()).pathname).toBe(GAME);
  await expect(page.locator("h1")).toHaveText("Returnal");
});

test("the sibling scope has its own page at its own address", async ({ page }) => {
  const response = await page.goto(SIBLING);
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("Returnal");
});

test("both pages offer the switcher, and it names the current scope", async ({
  page,
}) => {
  await page.goto(GAME);
  const switcher = page.getByRole("navigation", {
    name: /Evaluated experiences of Returnal/i,
  });
  await expect(switcher).toBeVisible();
  await expect(switcher).toContainText("Main game");
  await expect(switcher).toContainText("Tower of Sisyphus");

  // The scope you are reading is marked, not linked to itself.
  await expect(switcher.locator('[aria-current="page"]')).toHaveText("Main game");
  await expect(switcher.locator(`a[href="${GAME}"]`)).toHaveCount(0);

  await page.goto(SIBLING);
  const siblingSwitcher = page.getByRole("navigation", {
    name: /Evaluated experiences of Returnal/i,
  });
  await expect(siblingSwitcher.locator('[aria-current="page"]')).toHaveText(
    "Tower of Sisyphus",
  );
});

test("the switcher navigates between the two profiles", async ({ page }) => {
  await page.goto(GAME);
  await page
    .getByRole("navigation", { name: /Evaluated experiences/i })
    .getByRole("link", { name: "Tower of Sisyphus" })
    .click();

  await expect(page).toHaveURL(new RegExp(`${SIBLING}$`));

  // Back the other way, to the bare game URL rather than to /games/returnal/default.
  await page
    .getByRole("navigation", { name: /Evaluated experiences/i })
    .getByRole("link", { name: "Main game" })
    .click();
  await expect(page).toHaveURL(new RegExp(`${GAME}$`));
});

test("the two addresses render different evaluations", async ({ page }) => {
  // The failure this catches is a sibling URL that resolves but serves the
  // primary's evaluation — a bug every structural assertion above would pass
  // straight through, because the game, title and artwork are all shared.
  // Asserted inside the profile's answer, not across the page. "More
  // profiles" lists every other published profile including this game's own
  // sibling — deliberately, since a sibling is a different evaluated experience
  // and belongs on the rail — so each page legitimately carries the other's
  // one-line experience in a poster preview. Mutual exclusion is the wrong
  // property; what matters is which evaluation the profile itself is rendering.
  await page.goto(GAME);
  const primaryAnswer = page.locator(".gp-answer");
  await expect(primaryAnswer.getByText("bullet-hell shooter")).toBeVisible();
  await expect(primaryAnswer.getByText("escalating endurance test")).toHaveCount(0);
  // Scoped to the dimension rows' values, not the subcriterion values inside
  // the expanded panels.
  const primaryScores = await page.locator(".gp-row__num").allTextContents();
  expect(primaryScores).toHaveLength(8);

  await page.goto(SIBLING);
  const siblingAnswer = page.locator(".gp-answer");
  await expect(siblingAnswer.getByText("escalating endurance test")).toBeVisible();
  await expect(siblingAnswer.getByText("bullet-hell shooter")).toHaveCount(0);
  const siblingScores = await page.locator(".gp-row__num").allTextContents();
  expect(siblingScores).toHaveLength(8);

  // The synthetic sibling moves three subcriteria, so at least one dimension
  // total has to differ. Identical grids would mean the sibling page rendered
  // the primary's evaluation.
  expect(siblingScores).not.toEqual(primaryScores);
});

test("each profile canonicalises to its own address", async ({ page }) => {
  // A sibling canonicalising back to the game URL would tell a crawler its
  // evaluation is a duplicate of the primary's, which is exactly backwards.
  await page.goto(SIBLING);
  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  expect(canonical).toContain(SIBLING);
});

test("the primary key redirects rather than publishing a second address", async ({
  page,
}) => {
  const response = await page.goto("/games/returnal/default");
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe(GAME);
});

test("a single-scope game shows no switcher", async ({ page }) => {
  // The ordinary case, asserted in the same corpus as the multi-scope one so
  // the absence is proved by the switcher's own logic rather than by the corpus
  // simply having nothing to show.
  await page.goto("/games/alan-wake-2");
  await expect(
    page.getByRole("navigation", { name: /Evaluated experiences/i }),
  ).toHaveCount(0);
});

/**
 * Search against a game that publishes two evaluated experiences.
 *
 * This is the only corpus in which the scope half of the search contract is
 * reachable at all: with one scope per game, "several valid readings of what
 * you typed" cannot be produced, and the branch that shows candidates instead
 * of guessing is dead code in a browser.
 */
test.describe("search across two scopes", () => {
  const field = (page: import("@playwright/test").Page) =>
    page.getByRole("combobox", { name: "Search" });

  test("offers both scopes, and names the one that is not the primary", async ({
    page,
  }) => {
    await page.goto("/");
    await field(page).fill("returna");

    const options = page.getByRole("option");
    await expect(options).toHaveCount(2);
    // The sibling is identified by its scope, because "Returnal" alone would be
    // two rows saying the same thing about two different evaluations.
    await expect(options.filter({ hasText: "Tower of Sisyphus" })).toHaveCount(1);

    // A prefix of two profiles opens neither.
    await field(page).press("Enter");
    await page.waitForTimeout(150);
    await expect(page).toHaveURL(/\/$/);
  });

  test("opens a scope when the query names that scope exactly", async ({
    page,
  }) => {
    await page.goto("/");
    await field(page).fill("Returnal Tower of Sisyphus");
    await field(page).press("Enter");
    await expect(page).toHaveURL(new RegExp(`${SIBLING}$`));
  });

  test("the game's own name opens the game's canonical address", async ({
    page,
  }) => {
    // ADR 0016: the primary scope owns the bare title, and the profile served
    // there carries the switcher to its siblings. That is the canonical answer
    // to "Returnal", not a guess between two evaluations.
    await page.goto("/");
    await field(page).fill("Returnal");
    await field(page).press("Enter");
    await expect(page).toHaveURL(new RegExp(`${GAME}$`));
  });
});
