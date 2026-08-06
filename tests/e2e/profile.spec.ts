import { expect, test } from "@playwright/test";

/**
 * UI regression + the visual QA pass required by Plan §22.2.
 *
 * These assert the product rules that are easy to break by accident:
 * no aggregate score anywhere, scores readable without hover, the eight rows
 * always present, and no horizontal overflow at phone width.
 */

const SLUGS = ["alan-wake-2", "returnal", "redfall"] as const;

const DIMENSION_NAMES = [
  "Story & Character Investment",
  "Thematic & Emotional Impact",
  "Atmosphere & World Pull",
  "Medium-Specific Craft",
  "Agency & Satisfaction",
  "Execution & Polish",
  "Structure & Focus",
  "Pacing & Time Respect",
];

for (const slug of SLUGS) {
  test.describe(slug, () => {
    test("shows all eight dimensions with exact scores, without interaction", async ({
      page,
    }) => {
      await page.goto(`/games/${slug}`);

      for (const name of DIMENSION_NAMES) {
        await expect(
          page.getByRole("heading", { name, exact: true }),
        ).toBeVisible();
      }

      // Every row shows a number in the form N.N out of 10, no hover required.
      const scores = await page
        .locator("summary .tabular")
        .allTextContents();
      expect(scores.length).toBe(8);
      for (const score of scores) {
        expect(score).toMatch(/^\d{1,2}\.\d\/10$/);
      }
    });

    test("subcriteria and rationales are reachable", async ({ page }) => {
      await page.goto(`/games/${slug}`);
      const first = page.locator("details").first();
      // Collapsed by default: present in the DOM for search and assistive tech,
      // but not shown until asked for.
      await expect(first.locator("ol > li").first()).toBeHidden();
      await first.locator("summary").click();
      await expect(first.locator("ol > li")).toHaveCount(5);
      await expect(first.locator("ol > li").first()).toBeVisible();
    });

    test("publishes no aggregate or overall score", async ({ page }) => {
      await page.goto(`/games/${slug}`);
      const body = (await page.locator("body").innerText()).toLowerCase();
      expect(body).not.toMatch(/overall score:\s*\d/);
      expect(body).not.toMatch(/average score/);
      expect(body).not.toMatch(/total score/);
      // The page must say the opposite, in as many words.
      expect(body).toContain("no overall score");
    });

    test("does not overflow horizontally on a phone", async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto(`/games/${slug}`);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("states its evidence status and evaluation scope", async ({ page }) => {
      await page.goto(`/games/${slug}`);
      await expect(page.getByText("Evidence checked")).toBeVisible();
      await expect(page.getByText("What was assessed")).toBeVisible();
    });
  });
}

test("keyboard focus on a score row highlights its radar axis", async ({
  page,
}) => {
  await page.goto("/games/alan-wake-2");
  const readout = page.locator("figcaption");
  await expect(readout).toContainText("no overall score");

  await page.locator("summary").first().focus();
  await expect(readout).toContainText("Story & Character Investment");
});

test("home page contrasts three distinct silhouettes", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("svg")).toHaveCount(3);
  for (const slug of SLUGS) {
    await expect(page.locator(`a[href="/games/${slug}"]`)).toBeVisible();
  }
});

/**
 * The unknown/range rendering itself is asserted in tests/radar-geometry.test.ts
 * (no vertex at the origin, dashed bridge across the gap) and reviewed visually
 * via /dev/radar-states. What matters here is that the harness never ships:
 * a development-only route must not be reachable in a production build.
 */
test("the development radar harness is not exposed in production", async ({
  page,
}) => {
  const response = await page.goto("/dev/radar-states");
  expect(response?.status()).toBe(404);
});

test("methodology states the no-overall-score rule", async ({ page }) => {
  await page.goto("/methodology");
  const body = (await page.locator("body").innerText()).toLowerCase();
  expect(body).toContain("there is no overall game profile score");
  // All eight dimensions and their subcriteria are documented.
  await expect(page.locator("ol li h3")).toHaveCount(8);
});
