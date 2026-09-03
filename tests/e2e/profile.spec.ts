import { expect, test } from "@playwright/test";

/**
 * UI regression + the visual QA pass required by Plan §22.2.
 *
 * These assert the product rules that are easy to break by accident:
 * no aggregate score anywhere, scores readable without hover, the eight rows
 * always present, and no horizontal overflow at phone width. The accepted
 * A3–A6 composition's own contract — order, parity, zoom, keyboard — is
 * asserted in tests/e2e/profile-conformance.spec.ts.
 */

const SLUGS = ["alan-wake-2", "returnal", "redfall"] as const;

/**
 * Never wait on a third-party CDN.
 *
 * A preview build renders real key art from the rights holders' own servers.
 * That is correct for a human reviewing the page and wrong for a test suite:
 * it makes every navigation depend on someone else's uptime and on outbound
 * network access from CI, and `page.goto` waits for `load`. Blocking the
 * requests keeps the suite hermetic and deterministic — the markup is what
 * these tests are about, and that is asserted from the HTML instead.
 */
test.beforeEach(async ({ page }) => {
  await page.route(
    /^https:\/\/(www\.alanwake\.com|cdn\.akamai\.steamstatic\.com)\//,
    (route) => route.abort(),
  );
});

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

      const rows = page.locator(".gp-row");
      await expect(rows).toHaveCount(8);
      // In the fixed public order, every name visible.
      const names = await rows.locator(".gp-row__name").allTextContents();
      expect(names).toEqual(DIMENSION_NAMES);
      for (const row of await rows.all()) {
        await expect(row.locator(".gp-row__name")).toBeVisible();
      }

      // Every row shows its exact value with no hover and no click. Reading a
      // score must never require an interaction.
      const scores = await rows.locator(".gp-row__num").allTextContents();
      expect(scores.length).toBe(8);
      for (const score of scores) {
        expect(score).toMatch(/^\d{1,2}\.\d$/);
      }
      // And its confidence, in words, beside it.
      for (const confidence of await rows
        .locator(".gp-row__confidence")
        .allTextContents()) {
        expect(confidence).toMatch(/^(Low|Medium|High) confidence/);
      }
    });

    test("subcriteria and rationales are reachable", async ({ page }) => {
      await page.goto(`/games/${slug}`);
      const row = page.locator(".gp-row").first();
      const button = row.locator(".gp-row__why");
      const panel = row.locator(".gp-row__panel");

      // Collapsed by default: in the DOM for search and assistive tech, not
      // shown until asked for.
      await expect(panel).toBeHidden();
      await expect(button).toHaveAttribute("aria-expanded", "false");
      await expect(button).toHaveAttribute("aria-controls", await panel.getAttribute("id") ?? "");

      await button.click();
      await expect(panel).toBeVisible();
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await expect(panel.locator(".gp-sub")).toHaveCount(5);
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

      // And the same status and confidence stand before the answer, in words.
      const status = page.locator(".gp-status");
      await expect(status.getByText("Scope", { exact: true })).toBeVisible();
      await expect(status.locator(".gp-status__state")).toHaveText(
        /^(Verified|Provisional|Pre-release)$/,
      );
      await expect(status).toContainText(/(Low|Medium|High) confidence/);
      await expect(status).toContainText("Evidence cut-off");
      // The unresolved label never ships (ADR 0032).
      expect(await page.locator(".gp").innerText()).not.toMatch(/\bEvaluated\b/);
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
      expect(body).toMatch(/a bigger shape is not a better game/i);
    });

    test("exposes Why this score? with per-dimension confidence", async ({
      page,
    }) => {
      await page.goto(`/games/${slug}`);
      const row = page.locator(".gp-row").first();
      await row.locator(".gp-row__why").click();
      const panel = row.locator(".gp-row__panel");

      await expect(row.getByText(/(Low|Medium|High) confidence/)).toBeVisible();
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

      // Public evidence classes are concrete without exposing whether the
      // editor personally played/completed the game. That distinction remains
      // internal evidence metadata.
      await expect(trust.getByText("Direct play")).toHaveCount(0);
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

    test("carries no practical-time specimen and no invented destination", async ({
      page,
    }) => {
      // No approved record exists for any profile, so the band is absent —
      // not a placeholder, not the accepted screens' layout specimen (ADR
      // 0032, ADR 0027). No storefront or Compare destination exists either.
      await page.goto(`/games/${slug}`);
      await expect(page.locator(".gp-practical")).toHaveCount(0);
      const text = await page.locator(".gp").innerText();
      for (const specimen of [
        "Substantial",
        "45–90",
        "Needs room to breathe",
        "Total commitment",
        "Useful session",
        "Where to play",
        "Compare with",
      ]) {
        expect(text, specimen).not.toContain(specimen);
      }
      await expect(page.locator('.gp a[href*="compare"]')).toHaveCount(0);
    });
  });
}

test("an unknown game slug is not rendered on demand", async ({ request }) => {
  expect((await request.get("/games/not-a-game")).status()).toBe(404);
  expect(
    (await request.get("/games/not-a-game/opengraph-image")).status(),
  ).toBe(404);
});

test("an unknown profile scope is not rendered on demand", async ({
  request,
}) => {
  // A scope key that does not exist, and a real game with no such sibling.
  expect((await request.get("/games/alan-wake-2/not-a-scope")).status()).toBe(
    404,
  );
  expect((await request.get("/games/not-a-game/survival")).status()).toBe(404);
});

test("a primary scope has exactly one indexable address", async ({
  request,
}) => {
  // Every seeded game is single-scope, so its scope key is the primary one.
  // The bare game URL is the page; the keyed URL redirects to it rather than
  // publishing the same profile at a second address (ADR 0016).
  for (const slug of SLUGS) {
    const keyed = await request.get(`/games/${slug}/default`, {
      maxRedirects: 0,
    });
    expect(keyed.status(), `/games/${slug}/default`).toBe(308);
    expect(keyed.headers()["location"]).toBe(`/games/${slug}`);
  }
});

test("every game page canonicalises to its own address", async ({ page }) => {
  for (const slug of SLUGS) {
    await page.goto(`/games/${slug}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://shouldiplay.gg/games/${slug}`,
    );
  }
});

test("keyboard focus reaches every disclosure and lights its axis", async ({
  page,
}) => {
  await page.goto("/games/alan-wake-2");

  // The figure is aria-hidden decoration; its text equivalent describes the
  // distribution and must not imply a rating.
  const shape = page.locator(".gp-instrument .sr-only", {
    hasText: "scored 0 to 10 independently",
  });
  await expect(shape).toHaveCount(1);

  // Every disclosure is a real button: reachable, operable by keyboard, and
  // its row's axis is marked while it holds focus.
  const first = page.locator(".gp-row__why").first();
  await first.focus();
  await expect(first).toBeFocused();
  await expect(page.locator(".gp-row").first()).toHaveAttribute("data-active", "true");

  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-expanded", "true");
  // Focus stays where it was: no trap, no jump into the panel.
  await expect(first).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-expanded", "false");
});

test("home page contrasts three distinct silhouettes", async ({ page }) => {
  await page.goto("/");
  // One instrument mark per poster. Counted through the poster's own mark,
  // not through every <svg> on the page, so neither the explainer radar below
  // the rail, the opening's fingerprints nor the poster's own large outline
  // fragment is mistaken for a fourth game.
  await expect(page.locator("article .sip-poster__mark svg")).toHaveCount(
    SLUGS.length,
  );

  // Scoped to the rail. Every game is reachable from two places on this page —
  // the opening mosaic and its poster — and both are correct; what this asserts
  // is that the RAIL still lists all three at their canonical addresses.
  const rail = page.locator("section", { has: page.locator("#catalogue") });
  for (const slug of SLUGS) {
    await expect(rail.locator(`a[href="/games/${slug}"]`)).toBeVisible();
  }
});

test("the opening links each featured game to its canonical address", async ({
  page,
}) => {
  await page.goto("/");
  const opening = page.locator(".sip-open");
  for (const slug of SLUGS) {
    await expect(opening.locator(`a[href="/games/${slug}"]`)).toBeVisible();
  }
});

test("a poster leads with the game, not with its numbers", async ({ page }) => {
  await page.goto("/");
  const poster = page.locator("li.sip-poster").first();

  // The poster's own heading is the game and nothing else. If a score or a
  // dimension name were reaching the heading, the hierarchy the rail exists to
  // enforce would have inverted.
  // textContent, not innerText: the display face may be transformed in CSS, and
  // the assertion is about the words in the document, not about the rendering.
  const heading = (await poster.locator("h3").textContent()) ?? "";
  expect(heading).toMatch(/^Alan Wake 2\b/);
  expect(heading).not.toMatch(/\d\.\d/);
  expect(heading).not.toMatch(/Atmosphere|Strongest|Weakest/);

  // The mark carries no text of its own, so the poster owes its distribution in
  // words — nothing in this product is communicated by shape alone.
  // The poster's own shape sentence, not the labels inside its two controls.
  await expect(poster.locator("> .sr-only")).toContainText(
    /Profile across 8 dimensions, each scored 0 to 10 independently/,
  );

  // And no aggregate, here or anywhere.
  const body = await page.content();
  expect(body).not.toMatch(/overall score:\s*\d/);
  expect(body).not.toMatch(/average score/);
});

test("a profile exits onto the rest of the catalogue, never onto itself", async ({
  page,
}) => {
  // The accepted exit is the poster rail — the same grammar as the homepage —
  // carrying every OTHER published profile at its canonical address. No
  // similarity, no ranking, no "Compare with" until Slice 4 gives it a route.
  await page.goto("/games/alan-wake-2");
  const rail = page.locator(".sip-rail");
  await expect(rail).toHaveCount(1);
  await expect(rail.getByRole("heading", { name: "More profiles" })).toBeVisible();
  await expect(rail.locator('a[href="/games/returnal"]')).toBeVisible();
  await expect(rail.locator('a[href="/games/redfall"]')).toBeVisible();
  await expect(rail.locator('a[href="/games/alan-wake-2"]')).toHaveCount(0);
  await expect(rail).toContainText("Not a ranking");
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
test("the development harnesses are reachable for review, unindexed", async ({
  page,
}) => {
  for (const route of ["/dev/radar-states", "/dev/profile-states", "/dev/compare-states"]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator('meta[name="robots"]'), route).toHaveAttribute(
      "content",
      /noindex/,
    );
  }
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

test("evaluation artwork renders in preview, and says on what basis", async ({
  request,
}) => {
  // This suite serves a preview artifact, where reviewing the real page with
  // real artwork is the point. What must hold is that the basis travels with
  // the image — a page carrying uncleared art has to say so.
  //
  // Production carries none of it at all; that guarantee is asserted against
  // the built artefact by check-build-containment and against the Worker by
  // `npm run cf:verify`.
  for (const slug of SLUGS) {
    const body = await (await request.get(`/games/${slug}`)).text();
    expect(body).toMatch(/alanwake\.com|steamstatic\.com/);
    expect(body).toContain("Not cleared for production");
  }

  // The rail shows covers on a review surface for the same reason the profile
  // shows a hero: the poster grammar cannot be reviewed without them.
  const home = await (await request.get("/")).text();
  expect(home).toMatch(/steamstatic\.com/);

  // A page with no game on it must not acquire artwork in any environment.
  const methodology = await (await request.get("/methodology")).text();
  expect(methodology).not.toMatch(/alanwake\.com|steamstatic\.com/);
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
