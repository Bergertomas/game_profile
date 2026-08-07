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
      await expect(page.getByText("Evidence checked").first()).toBeVisible();
      await expect(page.getByText("What was assessed")).toBeVisible();
    });

    test("carries a trust line above the numbers", async ({ page }) => {
      await page.goto(`/games/${slug}`);
      const trustLine = page
        .locator("section", { has: page.locator("#profile-heading") })
        .locator("p", { hasText: "Rubric v1.0" });
      await expect(trustLine).toContainText(/confidence/i);
      await expect(trustLine).toContainText("Rubric v1.0");
      await expect(trustLine).toContainText("Evidence checked");
      // Sources are evidence, not votes (SOP §6).
      const body = await page.locator("body").innerText();
      expect(body).not.toMatch(/calculated from \d+/i);
    });

    test("exposes Why this score? with per-dimension confidence", async ({
      page,
    }) => {
      await page.goto(`/games/${slug}`);
      const first = page.locator("details").first();
      await first.locator("summary").click();
      // Two matches by design: a screen-reader label naming the affordance on
      // the summary, and the visible heading on the panel it opens.
      await expect(first.getByText("Why this score?")).toHaveCount(2);
      await expect(first.getByText("Why this score?").last()).toBeVisible();
      await expect(first.getByText(/(Low|Medium|High) confidence/)).toBeVisible();
      // The published total must be reproducible from the five values shown.
      await expect(first.getByText(/derived, not entered/)).toBeVisible();
    });

    test("reports source categories rather than a single opaque count", async ({
      page,
    }) => {
      await page.goto(`/games/${slug}`);
      const evidence = page.locator("section", {
        has: page.locator("#evidence-heading"),
      });
      await expect(evidence.getByText("Direct play")).toBeVisible();
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

test("the design lab is not exposed in production", async ({ page }) => {
  // Design exploration must never reach a visitor. Every route under the
  // segment 404s, not just the index — including each Direction D render and
  // the score-state proof, which are prerendered per game and so are separate
  // routes rather than one dynamic page.
  for (const route of [
    "/design-lab",
    "/design-lab/a",
    "/design-lab/b",
    "/design-lab/c",
    "/design-lab/d",
    ...SLUGS.map((slug) => `/design-lab/d/${slug}`),
    "/design-lab/d/states",
    // A slug the lab does not know must 404 for the ordinary reason too.
    "/design-lab/d/not-a-game",
  ]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(404);
  }
});

test("production profile pages are untouched by the design lab", async ({
  page,
}) => {
  // The lab hides the site chrome via its own stylesheet; that must not leak.
  await page.goto("/games/alan-wake-2");
  await expect(page.locator("body > header")).toBeVisible();
  await expect(page.locator("body > footer")).toBeVisible();
});

test("released profiles use verdict wording, not pre-release wording", async ({
  page,
}) => {
  // The three seeded games are all released, so none may show the pre-release
  // headings or the pre-release notice (SOP §10.8).
  for (const slug of SLUGS) {
    await page.goto(`/games/${slug}`);
    await expect(page.getByText("Great fit if…")).toBeVisible();
    await expect(page.getByText("Looks promising if…")).toHaveCount(0);
    await expect(page.getByText("Biggest unknowns…")).toHaveCount(0);
    await expect(page.getByText("not the finished release")).toHaveCount(0);
  }
});

test("methodology states the no-overall-score rule", async ({ page }) => {
  await page.goto("/methodology");
  const body = (await page.locator("body").innerText()).toLowerCase();
  expect(body).toContain("there is no overall game profile score");
  // All eight dimensions and their subcriteria are documented.
  await expect(page.locator("ol li h3")).toHaveCount(8);
});
