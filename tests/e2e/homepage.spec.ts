import { expect, test, type Page } from "@playwright/test";

/**
 * THE ACCEPTED HOMEPAGE SYSTEM, in a real browser.
 *
 * The markup contract is proved in vitest (tests/home-rail.test.ts). What only
 * a browser can prove is everything layout and input own: that the step
 * controls know where the ends of the rail are, that nothing on this page moves
 * on its own, that a preview opens and gives focus back, that the artwork
 * stays put while it is open, and that none of it pushes the document sideways
 * at 320 CSS pixels or 200% text.
 *
 * Search's own behaviour lives in tests/e2e/search.spec.ts. What is asserted
 * here is its RANK: it is still the first thing on the page and still entirely
 * inside the first viewport of the smallest phone the product supports, with a
 * rail, shelves and a curated module now beneath it.
 */

const rail = (page: Page) => page.locator(".sip-rail").first();
const track = (page: Page) => rail(page).locator(".sip-rail__track");
const previous = (page: Page) =>
  page.getByRole("button", { name: /^Previous posters in/ }).first();
const next = (page: Page) =>
  page.getByRole("button", { name: /^Next posters in/ }).first();

async function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth + 1;
  });
}

const scrollLeft = (page: Page) =>
  track(page).evaluate((element) => element.scrollLeft);

const maxScroll = (page: Page) =>
  track(page).evaluate((element) => element.scrollWidth - element.clientWidth);

test.describe("the accepted composition", () => {
  test("runs proposition, rail, then the explainer — in that order", async ({
    page,
  }) => {
    await page.goto("/");

    const order = await page.evaluate(() => {
      const marks = [
        ".sip-open",
        ".sip-rail",
        "#read-a-profile",
      ] as const;
      return marks.map((selector) => {
        const node = document.querySelector(selector);
        return node ? node.getBoundingClientRect().top + window.scrollY : -1;
      });
    });
    expect(order.every((top) => top >= 0)).toBe(true);
    expect(order[0]!).toBeLessThan(order[1]!);
    expect(order[1]!).toBeLessThan(order[2]!);
  });

  test("has one h1, and it is the proposition", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("Should you play it?");
  });

  test("keeps #catalogue resolvable for Search's recovery link", async ({
    page,
  }) => {
    await page.goto("/");
    // The "Browse all N profiles" link in the unrecognised state points here.
    await expect(page.locator("#catalogue")).toHaveText(
      "Start somewhere interesting",
    );
  });

  test("says what the rail is, and that it is not a ranking", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(rail(page)).toContainText("in catalogue order");
    await expect(rail(page)).toContainText("Not a ranking");
    // A horizontal row of games is the exact shape a reader has learned to read
    // as a chart, so the page says outright that it is not one.
    await expect(rail(page)).not.toContainText(/trending|popular|most played/i);
  });

  test("shows no shelf and no curated comparison, because none is approved", async ({
    page,
  }) => {
    await page.goto("/");
    // The shipped editorial configuration is empty by decision and the
    // objective shelves select the whole three-profile catalogue, which is not
    // a selection. Both regions therefore render nothing at all — no heading
    // over an empty track, and no placeholder pair.
    await expect(page.locator(".sip-shelves")).toHaveCount(0);
    await expect(page.locator(".sip-choosing")).toHaveCount(0);
    await expect(page.getByText("Choosing between")).toHaveCount(0);
  });

  test("links only to pages that exist", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page
      .locator("a[href]")
      .evaluateAll((nodes) =>
        nodes
          .map((node) => node.getAttribute("href") ?? "")
          .filter((href) => href.startsWith("/") && !href.startsWith("//")),
      );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of [...new Set(hrefs)]) {
      const response = await request.get(href.split("#")[0] || "/");
      expect(response.status(), href).toBe(200);
    }
  });
});

test.describe("the rail", () => {
  test("is a list of the published profiles, each linking to its own profile", async ({
    page,
  }) => {
    await page.goto("/");
    const posters = track(page).locator("li.sip-poster");
    await expect(posters).toHaveCount(3);

    for (const slug of ["alan-wake-2", "redfall", "returnal"]) {
      await expect(
        track(page).locator(`a[href="/games/${slug}"]`),
      ).toHaveCount(1);
    }
  });

  test("disables both ends when there is nothing to scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    // Three posters fit inside 1440, so both ends of the rail are already
    // reached. A control that looked live here would teach a reader the rail
    // was broken.
    await expect(previous(page)).toBeDisabled();
    await expect(next(page)).toBeDisabled();
  });

  test("steps one viewport at a time and disables each end as it reaches it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(previous(page)).toBeDisabled();
    await expect(next(page)).toBeEnabled();

    const viewport = await track(page).evaluate((el) => el.clientWidth);
    await next(page).click();
    // One press moves the track by its own visible width — or to the end of the
    // rail, whichever comes first. A press that moved a poster's width, or the
    // whole rail, would both be guesses a reader has to re-read the row to
    // recover from.
    await expect
      .poll(() => scrollLeft(page), { timeout: 5000 })
      .toBeGreaterThan(Math.min(viewport, await maxScroll(page)) * 0.5);
    await expect(previous(page)).toBeEnabled();

    // Keep pressing until the rail runs out. However few posters the catalogue
    // has, the far control ends up disabled and the near one live.
    for (let press = 0; press < 6 && (await next(page).isEnabled()); press += 1) {
      await next(page).click();
      await page.waitForTimeout(400);
    }
    await expect(next(page)).toBeDisabled({ timeout: 5000 });
    await expect(previous(page)).toBeEnabled();

    await previous(page).click();
    await expect(next(page)).toBeEnabled({ timeout: 5000 });
  });

  test("keeps native scrolling, and the controls follow it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // What touch and a trackpad do: move the track, not press a button.
    await track(page).evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect(next(page)).toBeDisabled({ timeout: 3000 });
    await expect(previous(page)).toBeEnabled();
  });

  test("never moves on its own", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const before = await scrollLeft(page);
    await page.waitForTimeout(1600);
    expect(await scrollLeft(page)).toBe(before);
    // No autoplay means no timer, and no loop means the first poster is still
    // the first poster.
    await expect(track(page).locator("li.sip-poster").first()).toBeVisible();
  });

  test("gives every control a 44px target", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const controls = rail(page).locator("button");
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const box = await controls.nth(i).boundingBox();
      expect(box, `control ${i}`).not.toBeNull();
      expect(box!.height, `control ${i} height`).toBeGreaterThanOrEqual(44);
      expect(box!.width, `control ${i} width`).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("the poster preview", () => {
  const disclosure = (page: Page) =>
    page.getByRole("button", { name: /^Preview of / }).first();

  test("opens, closes on Escape, and hands focus back to its own control", async ({
    page,
  }) => {
    await page.goto("/");
    const button = disclosure(page);
    await expect(button).toHaveAttribute("aria-expanded", "false");

    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const panelId = await button.getAttribute("aria-controls");
    await expect(page.locator(`[id="${panelId}"]`)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(`[id="${panelId}"]`)).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("is reachable and operable from the keyboard alone", async ({ page }) => {
    await page.goto("/");
    const firstPoster = track(page).locator("li.sip-poster").first();
    await firstPoster.locator("a").focus();
    await page.keyboard.press("Tab");

    const button = firstPoster.locator("button");
    await expect(button).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-expanded", "true");

    // The panel follows its trigger, so the next Tab lands inside what the
    // button just opened rather than past it.
    const panelId = await button.getAttribute("aria-controls");
    await expect(page.locator(`[id="${panelId}"]`)).toBeVisible();
  });

  test("never hides the artwork it belongs to", async ({ page }) => {
    await page.goto("/");
    const poster = track(page).locator("li.sip-poster").first();
    const art = poster.locator(".sip-poster__art");

    // Document coordinates, not viewport ones: pressing the control scrolls it
    // into view, and a page-scroll would otherwise read as the artwork moving.
    const box = () =>
      art.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { top: rect.top + window.scrollY, height: rect.height };
      });

    const before = await box();
    await poster.locator("button").click();
    await expect(poster.locator("button")).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    const after = await box();
    // The panel opens below the poster; the picture has not moved or shrunk.
    expect(after.top).toBeCloseTo(before.top, 0);
    expect(after.height).toBeCloseTo(before.height, 0);
    await expect(art).toBeVisible();

    // And the panel really is beneath it, rather than over it.
    const panelTop = await poster
      .locator(".sip-poster__panel")
      .evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
    expect(panelTop).toBeGreaterThanOrEqual(after.top + after.height);
  });

  test("previews only approved editorial fields", async ({ page }) => {
    await page.goto("/");
    const poster = track(page).locator("li.sip-poster").first();
    await poster.locator("button").click();
    const panel = poster.locator(".sip-poster__panel");
    await expect(panel).toContainText("What it is");
    await expect(panel).toContainText("Primary pull");
    await expect(panel).toContainText("Primary risk");
    // No commitment band, no session length, no store action.
    await expect(panel).not.toContainText(/hours|minutes|how long|buy|store/i);
  });
});

test.describe("reflow, zoom and motion", () => {
  for (const [label, width, height] of [
    ["320", 320, 640],
    ["390x667", 390, 667],
    ["1440", 1440, 900],
  ] as const) {
    test(`does not scroll the document sideways at ${label}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      expect(await scrollsSideways(page)).toBe(false);

      // Nor with a preview open, which is the state that adds a second block
      // inside a horizontally scrolling track.
      await track(page).locator("li.sip-poster").first().locator("button").click();
      expect(await scrollsSideways(page)).toBe(false);
    });
  }

  for (const [label, width] of [
    ["1280", 1280],
    ["390", 390],
  ] as const) {
    test(`does not scroll the document sideways at 200% text on ${label}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "32px";
      });
      expect(await scrollsSideways(page)).toBe(false);

      // And every function is still there at that size.
      await expect(next(page)).toBeVisible();
      await expect(
        track(page).locator("li.sip-poster").first().locator("button"),
      ).toBeVisible();
    });
  }

  test("keeps Search whole inside the first viewport at 390×667", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 667 });
    await page.goto("/");
    const box = await page
      .getByRole("combobox", { name: "Search" })
      .boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(667);

    // And the rail is BELOW it: browsing never outranks the journey a visitor
    // with a title in mind can actually finish.
    const railTop = (await rail(page).boundingBox())!.y;
    expect(railTop).toBeGreaterThan(box!.y);
  });

  test("strips the rail's motion under prefers-reduced-motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const durations = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          ".sip-rail__step, .sip-poster__disclose, .sip-poster__title a",
        ),
      ].map((node) => getComputedStyle(node).transitionDuration),
    );
    expect(durations.length).toBeGreaterThan(0);
    for (const duration of durations) {
      expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.001);
    }

    // A step still moves the rail; it simply arrives rather than glides.
    await next(page).click();
    await expect.poll(() => scrollLeft(page)).toBeGreaterThan(0);
    await context.close();
  });
});

/**
 * THE ACCEPTED A1/A2 COMPOSITION, measured.
 *
 * Structure matching the accepted screens is not conformance; the rendered
 * page has to hold the accepted geometry. These are the numbers the handoff
 * fixes (§2.1, §3.4, §7.1) and the first-viewport rule ADR 0030 froze.
 */
test.describe("conformance to the accepted composition", () => {
  test("keeps the desktop hero inside its 27.5rem maximum, with Search in the first viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const hero = await page
      .locator(".sip-open__hero")
      .evaluate((element) => element.getBoundingClientRect().height);
    // 27.5rem at the 16px root (handoff §3.4). Content and zoom may make it
    // taller; the shipped catalogue at the reference width must not.
    expect(hero).toBeLessThanOrEqual(27.5 * 16);

    // The console follows the hero and its field is still on the first screen.
    const field = (await page
      .getByRole("combobox", { name: "Search" })
      .boundingBox())!;
    expect(field.y + field.height).toBeLessThanOrEqual(900);
  });

  test("keeps the chrome to one compact row at both reference widths", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const desktop = await page
      .locator("header")
      .evaluate((element) => element.getBoundingClientRect().height);
    expect(desktop).toBeLessThanOrEqual(64);

    await page.setViewportSize({ width: 390, height: 667 });
    await page.goto("/");
    const mobile = await page
      .locator("header")
      .evaluate((element) => element.getBoundingClientRect().height);
    expect(mobile).toBeLessThanOrEqual(56);
  });

  test("shows the proposition, all three games and the Search input at 390×667", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 667 });
    await page.goto("/");

    const h1 = (await page.locator("h1").boundingBox())!;
    expect(h1.y + h1.height).toBeLessThanOrEqual(667);

    // Authentic game identity is in the first viewport: every tile's title is
    // on screen, whole, before any scroll.
    const tiles = page.locator(".sip-open__tile");
    await expect(tiles).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) {
      const title = (await tiles.nth(i).locator("h2").boundingBox())!;
      expect(title.y).toBeGreaterThanOrEqual(0);
      expect(title.y + title.height).toBeLessThanOrEqual(667);
    }

    // And Search is still there without an introductory scroll — after the
    // games on screen, before them in the focus order.
    const field = page.getByRole("combobox", { name: "Search" });
    const box = (await field.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(667);
    const lastTile = (await tiles.nth(2).boundingBox())!;
    expect(box.y).toBeGreaterThan(lastTile.y);
  });

  test("puts the console after the hero in the focus order", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 667 });
    await page.goto("/");
    // The accepted order: the three game tiles, then the switcher's Compare
    // link, then the Search field — at every width.
    await page.locator(".sip-open__tile").nth(2).locator("a").focus();
    await page.keyboard.press("Tab");
    await expect(
      page.locator(".sip-open").getByRole("link", { name: /^Compare$/ }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("combobox", { name: "Search" })).toBeFocused();
  });

  test("puts the Search field directly under a switcher that has Search selected", async ({
    page,
  }) => {
    await page.goto("/");
    const current = page.locator(".sip-open__path.is-current");
    await expect(current).toHaveText(/Search/);
    const paths = (await page.locator(".sip-open__paths").boundingBox())!;
    const field = (await page
      .getByRole("combobox", { name: "Search" })
      .boundingBox())!;
    expect(field.y).toBeGreaterThan(paths.y + paths.height - 1);
  });

  test("keeps the accepted mosaic geometry: one game at scale, two stacked beside it", async ({
    page,
  }) => {
    for (const [width, height] of [
      [1440, 900],
      [390, 667],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      const [lead, second, third] = await page
        .locator(".sip-open__tile")
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const r = node.getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height };
          }),
        );
      // The lead tile spans both rows of the left column; the two beside it
      // share the right column, one above the other.
      expect(lead!.h).toBeGreaterThan(second!.h * 1.8);
      expect(second!.x).toBeGreaterThan(lead!.x + lead!.w - 1);
      expect(third!.x).toBeCloseTo(second!.x, 0);
      expect(third!.y).toBeGreaterThan(second!.y + second!.h - 1);
      // And every tile carries its integrated fingerprint, drawn over a well.
      await expect(page.locator(".sip-open__fingerprint svg")).toHaveCount(3);
    }
  });

  test("paints no broken-image glyph when artwork fails to load", async ({
    page,
  }) => {
    // Every image the opening or rail may carry is review-clearance art loaded
    // from another host. Block it, so the failed state is the one rendered.
    await page.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
    await page.goto("/");
    // A picture that cannot load leaves the document (handoff §4.2), so there
    // is nothing for the browser to draw a glyph for — in the opening, and on
    // the rail once its lazily loaded posters have been asked for…
    await expect(page.locator(".sip-open__art img")).toHaveCount(0);
    await page.locator(".sip-rail__track").scrollIntoViewIfNeeded();
    await expect(page.locator(".sip-poster__art img")).toHaveCount(0);
    // …and the authored territory is under every frame either way.
    await expect(page.locator(".sip-open__fragment")).toHaveCount(3);
    await expect(page.locator(".sip-poster__fragment")).toHaveCount(3);
    await expect(page.locator(".sip-open__sleeve")).toHaveCount(3);
  });

  test("keeps the picture out of the accessibility tree where the title names the game", async ({
    page,
  }) => {
    await page.goto("/");
    const images = page.locator(".sip-open__art img, .sip-poster__art img");
    const count = await images.count();
    for (let i = 0; i < count; i += 1) {
      await expect(images.nth(i)).toHaveAttribute("alt", "");
    }
  });
});

test.describe("the public chrome on a phone", () => {
  test("keeps the wordmark and Search in the row and puts the links behind Menu", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 667 });
    await page.goto("/");
    const menu = page.getByRole("button", { name: "Menu" });
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.getByRole("button", { name: "Search", exact: true }),
    ).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav).toBeHidden();

    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Compare" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "How we score" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(nav).toBeHidden();
    await expect(menu).toBeFocused();
  });

  test("shows the links in the row on a desktop, with no Menu control", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Compare" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "How we score" })).toBeVisible();
  });

  test("marks the current page in the navigation", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/compare");
    await expect(
      page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Compare" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
