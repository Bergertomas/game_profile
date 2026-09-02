import { expect, test, type Page } from "@playwright/test";

/**
 * ALL FOUR SEARCH STATES, in a real browser, through the real Search UI.
 *
 * This project builds with `PROFILE_TEST_CORPUS=recognized-registry`, which
 * fills the recognised-but-unprofiled registry with visibly synthetic titles
 * (content/test-corpus.ts). It is the only corpus in which the fourth state is
 * reachable at all: `content/search-registry.ts` ships EMPTY and must stay
 * empty, because a row in it is a public editorial claim about a real product
 * and no approved list of launch identities exists.
 *
 * So the shipped catalogue can reach three states and this one reaches four,
 * and nothing anywhere had to publish a fabricated identity to prove it. The
 * synthetic entries name no real game; a production build asking for this
 * corpus throws rather than serving them.
 *
 * The state that matters most here is the one with no page behind it. What is
 * asserted is as much about what is ABSENT — no link, no route, no stub, no
 * request or vote control — as about what is shown.
 */

const field = (page: Page) => page.getByRole("combobox", { name: "Search" });
const options = (page: Page) => page.getByRole("option");
const popup = (page: Page) => page.locator(".sip-search__popup");

/** A synthetic recognised title. Not a game. */
const RECOGNISED = "Test Corpus: Lantern Parade";

async function type(page: Page, query: string) {
  await field(page).fill(query);
  await page.waitForTimeout(50);
}

test.describe("the four states", () => {
  test("1 · published — an exact title opens that profile", async ({ page }) => {
    await page.goto("/");
    await type(page, "Alan Wake 2");
    await field(page).press("Enter");
    await expect(page).toHaveURL(/\/games\/alan-wake-2$/);
  });

  test("2 · recognized — named, explained, and given nowhere to go", async ({
    page,
  }) => {
    await page.goto("/");
    await type(page, "lantern parade");

    await expect(options(page)).toHaveCount(1);
    const row = options(page).first();
    await expect(row).toContainText(RECOGNISED);
    // The truthful copy: we know it, we have not profiled it, and we say so
    // rather than inventing a page.
    await expect(row).toContainText(/Recognised — not yet profiled/i);
    await expect(row).toContainText(/not yet evaluated/i);
    await expect(popup(page)).toContainText(
      /We know this game and have not profiled it yet\. There is no page to send you to/i,
    );
  });

  test("3 · ambiguous — candidates are offered and nothing is opened", async ({
    page,
  }) => {
    await page.goto("/");
    await type(page, "re");

    // Both published profiles are offered. The count is deliberately not
    // pinned: this corpus also holds synthetic recognised titles, and one of
    // them contains "re" — which is the matcher working, not a defect.
    await expect(options(page).filter({ hasText: "Redfall" })).toHaveCount(1);
    await expect(options(page).filter({ hasText: "Returnal" })).toHaveCount(1);
    await expect(page.locator(".sip-search__note")).toContainText(
      /More than one profile answers that/i,
    );

    await field(page).press("Enter");
    await page.waitForTimeout(150);
    await expect(page).toHaveURL(/\/$/);
  });

  test("4 · unrecognized — the miss is stated, with somewhere to go", async ({
    page,
  }) => {
    await page.goto("/");
    await type(page, "a title nobody has ever registered");
    await expect(options(page)).toHaveCount(0);
    await expect(page.locator(".sip-search__note")).toContainText(
      /We do not recognise that title/i,
    );
  });
});

test.describe("a recognised row is information, not a destination", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await type(page, "lantern parade");
    await expect(options(page)).toHaveCount(1);
  });

  test("carries no link, and therefore no stub route", async ({ page }) => {
    // The contract: a recognised game gets no page, no indexable stub and
    // nothing that could be mistaken for an evaluation of a game nobody has
    // evaluated. The absence of an anchor in the row is that contract, checked.
    await expect(options(page).first().locator("a")).toHaveCount(0);
    await expect(options(page).first().locator("[href]")).toHaveCount(0);
  });

  test("carries no request, vote or notify affordance", async ({ page }) => {
    // A control that records nothing is a lie told with a click. Nothing may
    // offer to take a request until a real receiver, a stated privacy
    // behaviour and a persistence contract exist — none of which do.
    const row = options(page).first();
    await expect(row.locator("button")).toHaveCount(0);
    await expect(row.locator("input")).toHaveCount(0);

    await expect(popup(page)).not.toContainText(
      /request|vote|notify|remind|sign up|waitlist|let us know|coming soon/i,
    );
    // Nor anywhere else on the page: the ban is on a generic affordance, not
    // just on one inside the row.
    await expect(
      page.getByRole("button", { name: /request|vote|notify/i }),
    ).toHaveCount(0);
  });

  test("promises no date, queue position or priority", async ({ page }) => {
    // "Not yet evaluated" is honest. A promise is not ours to make.
    await expect(popup(page)).not.toContainText(
      /soon|shortly|next week|next month|queue|position|priority|scheduled|planned for/i,
    );
  });

  test("is not selectable, and Enter opens nothing", async ({ page }) => {
    const row = options(page).first();
    await expect(row).toHaveAttribute("aria-disabled", "true");

    await field(page).press("ArrowDown");
    await field(page).press("Enter");
    await page.waitForTimeout(150);
    await expect(page).toHaveURL(/\/$/);

    // And a pointer on it does nothing either. `force` is required and is the
    // point: Playwright's actionability check refuses to click an
    // `aria-disabled` element, which is itself proof the row is not offered as
    // a control. Forcing past that proves the handler does nothing either.
    await row.click({ force: true });
    await page.waitForTimeout(150);
    await expect(page).toHaveURL(/\/$/);
  });

  test("announces the state to a screen reader", async ({ page }) => {
    await expect(page.locator('.sip-search [role="status"]')).toHaveText(
      "1 recognised game, not yet profiled.",
    );
  });
});

test("the synthetic titles are not published anywhere but the field", async ({
  page,
  request,
}) => {
  // Findable in Search, and absent from the catalogue, the shelf and the
  // sitemap. If a recognised title ever reached one of those it would be
  // indistinguishable from a profile, which is the whole failure this state
  // exists to prevent.
  await page.goto("/");
  await expect(page.locator(".sip-open")).not.toContainText("Test Corpus");
  await expect(page.locator("#catalogue")).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Lantern Parade");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).not.toContain("lantern-parade");
});

test.describe("a recognised title in Compare", () => {
  // Compare's selector speaks the Search index's truth: a recognised,
  // unprofiled title is offered as a row that says it cannot be chosen, and
  // an address naming it says the same. Neither invents a comparison.

  test("is offered as information, and cannot be chosen", async ({ page }) => {
    await page.goto("/compare");
    await page.getByRole("button", { name: "Choose the first game" }).click();
    const dialogField = page.getByRole("dialog").getByRole("combobox");
    await dialogField.fill(RECOGNISED);
    await page.waitForTimeout(60);
    const row = page.getByRole("dialog").getByRole("option", { name: new RegExp(RECOGNISED) });
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute("aria-disabled", "true");
    await expect(row).toContainText("Recognised — not yet profiled");
    await dialogField.press("ArrowDown");
    await dialogField.press("Enter");
    await expect(page).toHaveURL(/\/compare$/);
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("is named as unprofiled when an address asks for it", async ({ page }) => {
    await page.goto("/compare?games=test-corpus-lantern-parade,alan-wake-2");
    await expect(page.locator(".cp-notice")).toContainText(`We know ${RECOGNISED} and have not profiled it yet`);
    await expect(page.locator(".cp-instrument")).toHaveCount(0);
    // Alan Wake 2 was named on the right and stays there: nothing fills the left.
    await expect(page.getByRole("button", { name: "Choose the first game" })).toBeVisible();
  });
});
