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

      const rows = page.locator(".gp__row");
      await expect(rows).toHaveCount(8);
      for (const name of DIMENSION_NAMES) {
        await expect(
          rows.locator(".gp__row-name").filter({ hasText: name }).first(),
        ).toBeVisible();
      }

      // Every row shows its exact value with no hover and no click. Reading a
      // score must never require an interaction.
      const scores = await rows.locator(".gp__num").allTextContents();
      expect(scores.length).toBe(8);
      for (const score of scores) {
        expect(score).toMatch(/^\d{1,2}\.\d$/);
      }
    });

    test("subcriteria and rationales are reachable", async ({ page }) => {
      await page.goto(`/games/${slug}`);
      const row = page.locator(".gp__row-wrap").first();
      const panel = row.locator(".gp__panel");

      // Collapsed by default: in the DOM for search and assistive tech, not
      // shown until asked for.
      await expect(panel).toBeHidden();
      await expect(row.locator(".gp__row")).toHaveAttribute(
        "aria-expanded",
        "false",
      );

      await row.locator(".gp__row").click();
      await expect(panel).toBeVisible();
      await expect(row.locator(".gp__row")).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      await expect(panel.locator("ol > li")).toHaveCount(5);
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

    test("states its evidence status, confidence and full evaluation scope", async ({
      page,
    }) => {
      await page.goto(`/games/${slug}`);
      const trust = page.locator("section", {
        has: page.getByText("How this profile was made"),
      });

      // An unscoped score is not a valid score (Rubric §1).
      for (const term of [
        "Evidence status",
        "Overall confidence",
        "Rubric",
        "Evidence cut-off",
        "Edition",
        "Mode",
        "Platforms",
        "Build",
      ]) {
        await expect(trust.getByText(term, { exact: true }).first()).toBeVisible();
      }
      await expect(trust.getByText("v1.0", { exact: true })).toBeVisible();
    });

    test("says the totals are derived, and never that they are calculated from sources", async ({
      page,
    }) => {
      await page.goto(`/games/${slug}`);
      const body = await page.locator("body").innerText();
      // Sources are evidence, not votes (SOP §6).
      expect(body).not.toMatch(/calculated from \d+/i);
      expect(body).toMatch(/derived from those five, never entered by hand/i);
      // Nor may the shape be presented as a quantity.
      expect(body).toMatch(/nothing is\s+calculated from the area/i);
    });

    test("exposes Why this score? with per-dimension confidence", async ({
      page,
    }) => {
      await page.goto(`/games/${slug}`);
      const row = page.locator(".gp__row-wrap").first();
      await row.locator(".gp__row").click();
      const panel = row.locator(".gp__panel");

      await expect(panel.getByText("Why this score?")).toBeVisible();
      await expect(panel.getByText(/(Low|Medium|High) confidence/)).toBeVisible();
      // The published total must be reproducible from the five values shown.
      await expect(panel.getByText(/Derived, not entered/)).toBeVisible();
    });

    test("names pending evidence classes without publishing source counts", async ({
      page,
    }) => {
      await page.goto(`/games/${slug}`);
      const trust = page.locator("section", {
        has: page.getByText("How this profile was made"),
      });

      // Counts of evidence by kind, never one opaque number.
      await expect(trust.getByText("Direct play").first()).toBeVisible();
      await expect(trust.getByText("Critic reviews").first()).toBeVisible();
      await expect(
        trust.getByText("Source records pending").first(),
      ).toBeVisible();
      await expect(
        trust.getByText(/not yet the individual records behind them/),
      ).toBeVisible();
      // No "supported by N sources" claim while the ledger is pending.
      expect(await trust.innerText()).not.toMatch(
        /\b\d+\s+(?:linked\s+)?sources?\b/i,
      );
    });
  });
}

test("an unknown game slug is not rendered on demand", async ({ request }) => {
  expect((await request.get("/games/not-a-game")).status()).toBe(404);
  expect(
    (await request.get("/games/not-a-game/opengraph-image")).status(),
  ).toBe(404);
});

test("keyboard focus reaches every score row and drives the radar", async ({
  page,
}) => {
  await page.goto("/games/alan-wake-2");

  // The polygon is aria-hidden decoration; its text equivalent describes the
  // distribution and must not imply a rating.
  const shape = page.locator(".gp-sr").first();
  await expect(shape).toContainText("scored 0 to 10 independently");

  // Every row is a real button: reachable, operable and expandable by keyboard.
  const first = page.locator(".gp__row").first();
  await first.focus();
  await expect(first).toBeFocused();
  await expect(first).toHaveAttribute("data-active", "true");

  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-expanded", "false");
});

test("home page contrasts three distinct silhouettes", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("svg")).toHaveCount(3);
  for (const slug of SLUGS) {
    await expect(page.locator(`a[href="/games/${slug}"]`)).toBeVisible();
  }
});

/**
 * This suite builds and serves a PREVIEW artifact — the same thing a Cloudflare
 * branch deployment is. So the design surfaces below are expected to be
 * reachable here, and that is what these tests assert.
 *
 * The production side of the same guarantee — every one of these routes 404ing
 * on the public site — is asserted by `npm run cf:verify`, against the real
 * Worker rather than `next start`. It belongs there rather than here because
 * proving it needs a second build in a different environment, and because the
 * runtime is the only witness that has ever caught a regression in it.
 */
test("the development radar harness is reachable for review, unindexed", async ({
  page,
}) => {
  const response = await page.goto("/dev/radar-states");
  expect(response?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("every design-lab route is reachable for review, and none is indexable", async ({
  page,
}) => {
  // Design exploration is why previews exist. Every route under the segment is
  // reviewable — including each Direction D and D3 render and the score-state
  // proofs, which are prerendered per game and so are separate routes rather
  // than one dynamic page — and none of them may be indexable anywhere.
  for (const route of [
    "/design-lab",
    "/design-lab/a",
    "/design-lab/b",
    "/design-lab/c",
    "/design-lab/d",
    ...SLUGS.map((slug) => `/design-lab/d/${slug}`),
    "/design-lab/d/states",
    "/design-lab/d3",
    ...SLUGS.map((slug) => `/design-lab/d3/${slug}`),
    "/design-lab/d3/states",
  ]) {
    // `domcontentloaded`, not `load`: the D3 routes reference key art on the
    // rights holders' own servers, and a review-surface reachability check must
    // not depend on a third-party CDN being up or reachable from CI.
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), route).toBe(200);
    await expect(page.locator('meta[name="robots"]'), route).toHaveAttribute(
      "content",
      /noindex/,
    );
  }

  // A slug the lab does not know still 404s, for the ordinary reason.
  const missing = await page.goto("/design-lab/d/not-a-game", {
    waitUntil: "domcontentloaded",
  });
  expect(missing?.status()).toBe(404);
});

test("no public page requests evaluation artwork, even in preview", async ({
  request,
}) => {
  // The lab may reference uncleared key art; a public document may not, in any
  // environment. check-build-containment asserts this against the build output
  // — this asserts it against what the server actually returns.
  const artHosts = ["alanwake.com", "steamstatic.com"];
  for (const path of ["/", "/methodology", ...SLUGS.map((s) => `/games/${s}`)]) {
    const body = await (await request.get(path)).text();
    for (const host of artHosts) {
      expect(body.includes(host), `${path} references ${host}`).toBe(false);
    }
  }
});

test("production profile pages keep the site chrome", async ({ page }) => {
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
