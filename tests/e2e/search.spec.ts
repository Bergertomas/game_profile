import { expect, test, type Page } from "@playwright/test";

/**
 * Search, in a real browser.
 *
 * The matcher's behaviour is proven in vitest against the same index this page
 * ships (tests/public-search-index.test.ts). What can only be proven here is
 * everything the browser owns: that the listbox is wired to the input the way a
 * screen reader needs, that the keys do what the legend under the field says
 * they do, that the dialog contains focus and gives it back, and that none of
 * it pushes the page sideways at 320 CSS pixels or 200% text.
 */

const field = (page: Page) => page.getByRole("combobox", { name: "Search" });
const options = (page: Page) => page.getByRole("option");

async function type(page: Page, query: string) {
  await field(page).fill(query);
  // The listbox is rendered synchronously from the query, so one settled frame
  // is enough; waiting on a specific count here would hide a matcher change.
  await page.waitForTimeout(50);
}

/** Whether the document scrolls sideways — WCAG 1.4.10, asserted not assumed. */
async function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth + 1;
  });
}

test.describe("the opening", () => {
  test("leads with the question, and the field is the only control on it", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Should you play it?",
    );
    await expect(field(page)).toBeVisible();

    // The three journeys are named exactly, and the two that are not built are
    // not controls: no link and no button carries either label.
    const opening = page.locator(".sip-open");
    await expect(opening).toContainText("Compare");
    await expect(opening).toContainText("What should I play?");
    await expect(
      opening.getByRole("link", { name: /^Compare$/ }),
    ).toHaveCount(0);
    await expect(
      opening.getByRole("button", { name: /What should I play/ }),
    ).toHaveCount(0);
  });

  test("shows three profiles, each with a text equivalent of its shape", async ({
    page,
  }) => {
    await page.goto("/");
    const tiles = page.locator(".sip-open__tile");
    await expect(tiles).toHaveCount(3);

    // The polygon is decoration over the words. Every tile states its own
    // distribution in text, and never an overall rating.
    for (let i = 0; i < 3; i += 1) {
      await expect(tiles.nth(i)).toContainText(
        /Profile across 8 dimensions, each scored 0 to 10 independently/,
      );
    }
    // The rule is stated rather than avoided: the opening says there is no
    // overall score, and shows none. A page that simply never mentioned it
    // would pass a "no aggregate" grep and teach the visitor nothing.
    await expect(page.locator(".sip-open")).toContainText("No overall score.");
  });

  test("renders the artless sleeve where artwork is not cleared", async ({
    page,
  }) => {
    await page.goto("/");
    // Alan Wake 2 carries a hero and no cover, deliberately, so the mixed state
    // is reviewed on every preview. A cover is never demoted into this role.
    const sleeves = page.locator(".sip-open__sleeve");
    await expect(sleeves).toHaveCount(1);
    // And the tile is still a complete, readable card rather than a hole.
    const artless = page.locator(".sip-open__tile.is-artless");
    await expect(artless.getByRole("link")).toBeVisible();
  });
});

/**
 * The states reachable against the SHIPPED catalogue.
 *
 * Three of the four, because the fourth cannot be reached here: the recognised
 * registry ships empty by decision, so there is nothing for a query to land on.
 * All four are exercised through this same UI in
 * tests/e2e/recognized-registry.spec.ts, which builds the synthetic registry
 * corpus for exactly that purpose.
 */
test.describe("search states in the shipped catalogue", () => {
  test("published — an exact title opens that profile", async ({ page }) => {
    await page.goto("/");
    await type(page, "Alan Wake 2");
    await field(page).press("Enter");
    await expect(page).toHaveURL(/\/games\/alan-wake-2$/);
  });

  test("ambiguous — candidates are offered and nothing is opened", async ({
    page,
  }) => {
    await page.goto("/");
    await type(page, "re");
    await expect(options(page)).toHaveCount(2);
    await expect(page.locator(".sip-search__note")).toContainText(
      /More than one profile answers that/i,
    );

    // Enter on an ambiguous query must not navigate. The product does not pick.
    await field(page).press("Enter");
    await page.waitForTimeout(150);
    await expect(page).toHaveURL(/\/$/);
  });

  test("unrecognized — the miss is stated, with somewhere to go", async ({
    page,
  }) => {
    await page.goto("/");
    await type(page, "a game nobody has profiled");
    await expect(options(page)).toHaveCount(0);
    await expect(page.locator(".sip-search__note")).toContainText(
      /We do not recognise that title/i,
    );
    await expect(
      page.getByRole("link", { name: /Browse all 3 profiles/ }),
    ).toBeVisible();
  });

  test("no suggestion is ever a link to a page that does not exist", async ({
    page,
  }) => {
    await page.goto("/");
    await type(page, "re");
    for (const href of await page
      .locator(".sip-search__popup a")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")))) {
      expect(href).toBeTruthy();
      expect(href).not.toBe("#");
    }
  });
});

test.describe("keyboard and screen-reader semantics", () => {
  test("aria-controls names an element that exists while the popup is closed", async ({
    page,
  }) => {
    await page.goto("/");
    const input = field(page);
    await expect(input).toHaveAttribute("aria-expanded", "false");

    // The bug this guards: an IDREF to a node that is only rendered while the
    // popup is open is dangling for the whole time it is closed.
    const controlsResolves = await page.evaluate(() => {
      const combobox = document.querySelector('[role="combobox"]');
      const id = combobox?.getAttribute("aria-controls");
      return Boolean(id && document.getElementById(id));
    });
    expect(controlsResolves).toBe(true);
  });

  test("arrow keys move the highlight through aria-activedescendant", async ({
    page,
  }) => {
    await page.goto("/");
    await type(page, "re");
    const input = field(page);
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await expect(input).not.toHaveAttribute("aria-activedescendant", /./);

    await input.press("ArrowDown");
    const first = await input.getAttribute("aria-activedescendant");
    expect(first).toBeTruthy();
    // The named option is the one marked selected, and focus stayed in the
    // input so the reader can keep typing.
    await expect(page.locator(`[id="${first}"]`)).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(input).toBeFocused();

    await input.press("ArrowDown");
    expect(await input.getAttribute("aria-activedescendant")).not.toBe(first);

    await input.press("ArrowUp");
    expect(await input.getAttribute("aria-activedescendant")).toBe(first);
  });

  test("Enter opens the highlighted row", async ({ page }) => {
    await page.goto("/");
    await type(page, "re");
    await field(page).press("ArrowDown");
    await field(page).press("Enter");
    await expect(page).toHaveURL(/\/games\/(redfall|returnal)$/);
  });

  test("a pointer opens the row it lands on", async ({ page }) => {
    await page.goto("/");
    await type(page, "returnal");
    await options(page).first().click();
    await expect(page).toHaveURL(/\/games\/returnal$/);
  });

  test("the state of the listbox is announced politely", async ({ page }) => {
    await page.goto("/");
    const live = page.locator('.sip-search [role="status"]');
    await expect(live).toHaveAttribute("aria-live", "polite");

    await type(page, "re");
    await expect(live).toHaveText(/2 possible matches/);
    await type(page, "a game nobody has profiled");
    await expect(live).toHaveText("No match.");
  });

  test("Escape clears the inline field, as its legend promises", async ({
    page,
  }) => {
    await page.goto("/");
    await type(page, "re");
    await field(page).press("Escape");
    await expect(field(page)).toHaveValue("");
    await expect(field(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("`/` focuses the field on a page that has one", async ({ page }) => {
    await page.goto("/");
    await page.locator("h1").click();
    await page.keyboard.press("/");
    await expect(field(page)).toBeFocused();
    // And it is a shortcut, not a character: nothing was typed into the field.
    await expect(field(page)).toHaveValue("");
  });

  test("`/` typed into the field is a slash, not a shortcut", async ({
    page,
  }) => {
    await page.goto("/");
    await field(page).click();
    await page.keyboard.press("/");
    await expect(field(page)).toHaveValue("/");
  });
});

test.describe("the header dialog", () => {
  const trigger = (page: Page) => page.getByRole("button", { name: "Search" });

  test("opens, takes focus, closes on Escape and hands focus back", async ({
    page,
  }) => {
    await page.goto("/methodology");
    await trigger(page).click();

    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog.getByRole("combobox", { name: "Search" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
  });

  test("contains focus while it is open", async ({ page }) => {
    await page.goto("/methodology");
    await trigger(page).click();

    // Ten tabs is more than the dialog holds, so a leak would have shown by now.
    //
    // The property asserted is the one that matters: focus never reaches a
    // control on the page BEHIND the dialog. It is not "activeElement is always
    // inside the dialog" — cycling past the last tabbable element rests on
    // `body` for a step in Chromium, which is neither a leak nor something a
    // user can act on.
    let everInside = false;
    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.press("Tab");
      const escaped = await page.evaluate(() => {
        const dialog = document.querySelector("dialog[open]");
        const active = document.activeElement;
        if (!dialog || !active) return "no dialog";
        if (active === document.body || active === document.documentElement) {
          return null;
        }
        return dialog.contains(active)
          ? null
          : `${active.tagName.toLowerCase()}.${active.className}`;
      });
      expect(escaped, `tab ${i + 1} reached the page behind the dialog`).toBeNull();

      everInside ||= await page.evaluate(() => {
        const dialog = document.querySelector("dialog[open]");
        return Boolean(
          dialog &&
            document.activeElement &&
            document.activeElement !== document.body &&
            dialog.contains(document.activeElement),
        );
      });
    }
    // And the dialog's own controls are reachable, so containment is not simply
    // "nothing is focusable".
    expect(everInside, "focus cycled through the dialog's own controls").toBe(
      true,
    );
  });

  test("the close button closes it and hands focus back too", async ({
    page,
  }) => {
    await page.goto("/methodology");
    await trigger(page).click();
    await page.getByRole("button", { name: /Close/ }).click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
  });

  test("`/` opens it on a page with no field of its own", async ({ page }) => {
    await page.goto("/methodology");
    await page.keyboard.press("/");
    await expect(page.locator("dialog[open]")).toBeVisible();
  });

  test("searching from the dialog navigates and closes it", async ({ page }) => {
    await page.goto("/methodology");
    await trigger(page).click();
    const input = page.locator("dialog[open]").getByRole("combobox");
    await input.fill("Returnal");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/games\/returnal$/);
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  });
});

test.describe("reflow, zoom and motion", () => {
  for (const [label, width, height] of [
    ["320", 320, 640],
    ["390", 390, 667],
  ] as const) {
    test(`does not scroll sideways at ${label} CSS pixels`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      expect(await scrollsSideways(page)).toBe(false);

      // Nor with the listbox open over it, which is the state that introduces a
      // second absolutely-positioned layer.
      await type(page, "re");
      expect(await scrollsSideways(page)).toBe(false);
    });
  }

  test("puts the search input on screen at 390×667 without scrolling", async ({
    page,
  }) => {
    // The one measurable form of "reduce the opening artwork's vertical
    // dominance": on the smallest supported phone the field is reachable
    // without scrolling past a picture to find it.
    await page.setViewportSize({ width: 390, height: 667 });
    await page.goto("/");
    const box = await field(page).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(667);
  });

  test("does not scroll sideways at 200% text", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
    });
    expect(await scrollsSideways(page)).toBe(false);

    await type(page, "re");
    expect(await scrollsSideways(page)).toBe(false);
  });

  test("strips its motion under prefers-reduced-motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    const durations = await page.evaluate(() =>
      [...document.querySelectorAll(".sip-search-trigger, .sip-open__tile a")].map(
        (node) => getComputedStyle(node).transitionDuration,
      ),
    );
    expect(durations.length).toBeGreaterThan(0);
    for (const duration of durations) {
      expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.001);
    }
    await context.close();
  });
});
