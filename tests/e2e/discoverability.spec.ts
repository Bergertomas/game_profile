import { expect, test } from "@playwright/test";

/**
 * What a crawler and a social unfurler actually receive.
 *
 * The unit suite checks the functions that build this; these checks read the
 * served HTML, which is the only place a metadata regression actually shows up.
 *
 * The e2e server runs a plain `next build`, so it is a *preview* build and is
 * correctly served `noindex` — that is asserted here rather than worked around,
 * because it is the fail-closed behaviour the whole preview story depends on.
 */

const SLUGS = ["alan-wake-2", "returnal", "redfall"] as const;
const CANONICAL_ORIGIN = "https://shouldiplay.gg";

test.describe("game page discoverability", () => {
  for (const slug of SLUGS) {
    test(`${slug} states its canonical URL and search intent`, async ({
      page,
    }) => {
      await page.goto(`/games/${slug}`);

      await expect(page).toHaveTitle(/^Should I Play .+\? \| Should I Play\?$/);

      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute(
        "href",
        `${CANONICAL_ORIGIN}/games/${slug}`,
      );

      const description = page.locator('meta[name="description"]');
      await expect(description).not.toHaveAttribute("content", "");

      // A share card that unfurls: title, description and a real image.
      await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
      await expect(page.locator('meta[property="og:description"]')).toHaveCount(1);
      const image = await page
        .locator('meta[property="og:image"]')
        .getAttribute("content");
      expect(image).toContain("/opengraph-image");
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image",
      );
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
        "content",
        /\/opengraph-image/,
      );
    });

    test(`${slug} serves its substantive content in the HTML`, async ({
      request,
    }) => {
      // No browser, no JavaScript: exactly what Googlebot's first fetch sees.
      const html = await (await request.get(`/games/${slug}`)).text();
      // The radar is aria-hidden decoration; the text under it is the content.
      const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

      expect(text).toContain("Story &amp; Character Investment");
      expect(text).toContain("Evidence &amp; scope");
      // Eight dimension totals, written out rather than only drawn.
      expect(text.match(/\d{1,2}\.\d \/10/g)?.length ?? 0).toBeGreaterThanOrEqual(
        8,
      );
      // And the reasoning behind them, not just the numbers.
      expect(text).toContain("Why this score?");
    });

    test(`${slug} publishes structured data with no rating`, async ({ page }) => {
      await page.goto(`/games/${slug}`);
      const blocks = await page
        .locator('script[type="application/ld+json"]')
        .allTextContents();
      expect(blocks.length).toBeGreaterThan(0);

      const types = blocks.flatMap((block) => {
        const parsed = JSON.parse(block) as {
          "@graph": { "@type": string }[];
        };
        return parsed["@graph"].map((node) => node["@type"]);
      });
      expect(types).toContain("VideoGame");
      expect(types).toContain("BreadcrumbList");

      // The core product principle, in machine-readable form.
      for (const block of blocks) {
        expect(block).not.toContain("aggregateRating");
        expect(block).not.toContain("ratingValue");
        expect(block).not.toContain("reviewRating");
      }
    });
  }
});

test("the share card renders as a real PNG", async ({ request }) => {
  const response = await request.get("/games/alan-wake-2/opengraph-image");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  expect((await response.body()).byteLength).toBeGreaterThan(10_000);
});

test("the sitemap lists every published profile, on the canonical origin", async ({
  request,
}) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toContain(`<loc>${CANONICAL_ORIGIN}/</loc>`);
  expect(xml).toContain(`<loc>${CANONICAL_ORIGIN}/methodology</loc>`);
  for (const slug of SLUGS) {
    expect(xml).toContain(`<loc>${CANONICAL_ORIGIN}/games/${slug}</loc>`);
  }
  expect(xml).not.toContain("/dev/");
});

test("a non-production build refuses crawling and indexing", async ({
  request,
  page,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /");
  expect(robots).not.toContain("Sitemap:");

  await page.goto("/games/alan-wake-2");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  // …while still naming production as canonical, never the preview host.
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${CANONICAL_ORIGIN}/games/alan-wake-2`,
  );
});

test("the brand is the site and Game Profile is the evaluation", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("banner").getByText("Should I Play?", { exact: true }),
  ).toBeVisible();
  // The header must not present the evaluation construct as the site's name.
  await expect(
    page.getByRole("banner").getByText("Game Profile", { exact: true }),
  ).toHaveCount(0);

  await expect(page.getByRole("contentinfo")).toContainText("Game Profile");
});
