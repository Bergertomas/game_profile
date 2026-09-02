import { expect, test, type Page } from "@playwright/test";

/**
 * FULL COMPARE, in a real browser (ADR 0033, ADR 0034; handoff §10; matrix
 * C-01 to C-13 and X-06, X-08, X-09, X-12, X-14).
 *
 * The markup contract — order, parity, relation words, tag groups — is proved
 * in tests/compare-composition.test.ts. What only a browser can prove is
 * everything the address, the dialog and the layout own: that a selection
 * writes an address the reload restores in the same order, that replacing one
 * side keeps the other, that a self-pair is refused without losing the first
 * pick, that the selector is a contained dialog that gives focus back, that
 * Copy link announces and falls back, that a pair address is `noindex` and the
 * launcher is not, and that nothing pushes the document sideways at 320 CSS
 * pixels or 200% text.
 *
 * This preview artifact resolves the evaluation-clearance artwork, so the
 * real pair page is the art-led state here; the artless production state is
 * rendered by `/dev/compare-states`, beside the mixed and failed states.
 */

const PAIR = "/compare?games=alan-wake-2,returnal";
const STATES = "/dev/compare-states";

test.beforeEach(async ({ page }) => {
  // Never wait on a third-party CDN.
  await page.route(
    /^https:\/\/(www\.alanwake\.com|cdn\.akamai\.steamstatic\.com)\//,
    (route) => route.abort(),
  );
});

async function sidewaysOverflow(page: Page): Promise<string[]> {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  return page.evaluate(() => {
    const root = document.documentElement;
    if (root.scrollWidth <= root.clientWidth + 1) return [];
    const culprits: string[] = [];
    for (const el of document.querySelectorAll("body *")) {
      const box = el.getBoundingClientRect();
      if (box.right <= root.clientWidth + 1 || box.width === 0) continue;
      let ancestor: Element | null = el.parentElement;
      let clipped = false;
      while (ancestor && ancestor !== document.body) {
        const overflow = getComputedStyle(ancestor).overflowX;
        if (overflow === "auto" || overflow === "hidden" || overflow === "scroll") {
          clipped = true;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (!clipped) {
        culprits.push(
          `${Math.round(box.right - root.clientWidth)}px ${el.tagName.toLowerCase()}.${String(el.className).split(" ").join(".")}`,
        );
      }
    }
    return [`document ${root.scrollWidth} > ${root.clientWidth}`, ...culprits.slice(0, 12)];
  });
}

const replaceLeft = (page: Page) =>
  page.getByRole("button", { name: /^Replace .* on the left$/ });
const replaceRight = (page: Page) =>
  page.getByRole("button", { name: /^Replace .* on the right$/ });
const dialog = (page: Page) => page.getByRole("dialog");
const field = (page: Page) => dialog(page).getByRole("combobox");

/** Open a pair address and wait until the pair is restored from it. */
async function openPair(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator(".cp-instrument")).toBeVisible();
}

/** Choose a game through the open dialog, by keyboard. */
async function chooseByKeyboard(page: Page, query: string) {
  await field(page).fill(query);
  await page.waitForTimeout(60);
  await field(page).press("ArrowDown");
  await field(page).press("Enter");
}

test.describe("the launcher", () => {
  test("carries standalone guidance, every eligible game, and one control", async ({ page }) => {
    await page.goto("/compare");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Compare two Game Profiles");
    await expect(page.getByRole("heading", { name: "How a relation is decided" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What can be compared" })).toBeVisible();
    for (const title of ["Alan Wake 2", "Returnal", "Redfall"]) {
      await expect(page.getByRole("link", { name: `Start with ${title} on the left` })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Choose the first game" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose the right game" })).toHaveCount(0);
    await expect(page.locator(".cp-stage")).toHaveCount(0);
  });

  test("is not marked noindex by itself, and is canonical at /compare", async ({ page }) => {
    await page.goto("/compare");
    // A preview build is noindex site-wide; what must NOT be there is a
    // Compare-specific opt-out. The pair header is asserted separately.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://shouldiplay.gg/compare",
    );
    const response = await page.request.get("/compare");
    expect(response.headers()["x-robots-tag"] ?? "").not.toContain("noindex");
  });
});

test.describe("selection and the address", () => {
  test("a first pick writes a left-only address; a second completes the pair in order", async ({ page }) => {
    await page.goto("/compare");
    await page.getByRole("button", { name: "Choose the first game" }).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page).getByRole("heading")).toHaveText("Choose the left game");
    await chooseByKeyboard(page, "Returnal");
    await expect(page).toHaveURL(/\/compare\?games=returnal$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Compare two Game Profiles");
    await expect(page.getByText("Returnal is on the left.")).toBeVisible();
    // Focus returned to the control that opened the dialog, which now names the game.
    await expect(replaceLeft(page)).toBeFocused();

    await page.getByRole("button", { name: "Choose the right game" }).click();
    await chooseByKeyboard(page, "Alan Wake");
    await expect(page).toHaveURL(/\/compare\?games=returnal,alan-wake-2$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Returnal and Alan Wake 2");
    await expect(page.locator(".cp-row")).toHaveCount(8);
  });

  test("a shared address restores the same left and right after a reload", async ({ page }) => {
    await page.goto("/compare?games=returnal,alan-wake-2");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Returnal and Alan Wake 2");
    const first = page.locator(".cp-identity").first();
    await expect(first).toContainText("Left · Game Profile");
    await expect(first).toContainText("Returnal");
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Returnal and Alan Wake 2");
  });

  test("replacing one side keeps the other exactly where it was", async ({ page }) => {
    await openPair(page, PAIR);
    await replaceRight(page).click();
    await expect(dialog(page).getByRole("heading")).toHaveText("Replace Returnal on the right");
    await chooseByKeyboard(page, "Redfall");
    await expect(page).toHaveURL(/\/compare\?games=alan-wake-2,redfall$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Alan Wake 2 and Redfall");
    await expect(replaceRight(page)).toBeFocused();

    await replaceLeft(page).click();
    await chooseByKeyboard(page, "Returnal");
    await expect(page).toHaveURL(/\/compare\?games=returnal,redfall$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Returnal and Redfall");
  });

  test("the back button restores the previous pair", async ({ page }) => {
    await openPair(page, PAIR);
    await replaceRight(page).click();
    await chooseByKeyboard(page, "Redfall");
    await expect(page).toHaveURL(/redfall$/);
    await page.goBack();
    await expect(page).toHaveURL(/alan-wake-2,returnal$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Alan Wake 2 and Returnal");
  });
});

test.describe("refusals", () => {
  test("a self-pair chosen in the selector is refused inline and the pick stays", async ({ page }) => {
    await page.goto("/compare?games=alan-wake-2");
    await page.getByRole("button", { name: "Choose the right game" }).click();
    await chooseByKeyboard(page, "Alan Wake");
    const error = dialog(page).getByRole("alert");
    await expect(error).toBeVisible();
    await expect(error).toContainText("Alan Wake 2 is already on the left");
    await expect(field(page)).toHaveAttribute("aria-invalid", "true");
    await expect(field(page)).toHaveAttribute("aria-describedby", new RegExp(await error.getAttribute("id") ?? "x"));
    await expect(dialog(page)).toBeVisible();
    await expect(page).toHaveURL(/\/compare\?games=alan-wake-2$/);
    // The refused game is still offered with the reason on the row, and a
    // different one can be chosen straight away.
    await expect(dialog(page).getByRole("option", { name: /Already on the left/ })).toHaveCount(1);
    await chooseByKeyboard(page, "Returnal");
    await expect(page).toHaveURL(/alan-wake-2,returnal$/);
  });

  test("a self-pair in the address is refused and the left selection is kept", async ({ page }) => {
    await page.goto("/compare?games=alan-wake-2,alan-wake-2");
    // Next's own route announcer is an alert too; the notice is the one asked for.
    await expect(page.locator('.cp-notice[role="alert"]')).toContainText("Alan Wake 2 is already on the left");
    await expect(page.getByText("Alan Wake 2 is on the left.")).toBeVisible();
    await expect(page.locator(".cp-instrument")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Choose the right game" })).toBeVisible();
  });

  test("an unknown identity is named, and the valid side stays where it was written", async ({ page }) => {
    await page.goto("/compare?games=no-such-game,returnal");
    await expect(page.locator(".cp-notice")).toContainText('There is no Game Profile at "no-such-game"');
    await expect(page.locator(".cp-instrument")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Choose the first game" })).toBeVisible();
  });

  test("a sibling scope is refused as not yet eligible", async ({ page }) => {
    await page.goto("/compare?games=alan-wake-2,returnal/tower-of-sisyphus");
    await expect(page.locator(".cp-notice")).toContainText("main profile for now");
    await expect(page.getByText("Alan Wake 2 is on the left.")).toBeVisible();
  });
});

test.describe("the selector dialog", () => {
  test("is named, contains focus, closes on Escape and returns focus", async ({ page }) => {
    await openPair(page, PAIR);
    await replaceLeft(page).click();
    await expect(dialog(page)).toHaveAttribute("aria-modal", "true");
    await expect(field(page)).toBeFocused();
    // Tab cycles inside the modal: the page behind is inert.
    for (let i = 0; i < 6; i += 1) await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => document.activeElement?.closest("dialog") !== null),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(replaceLeft(page)).toBeFocused();
  });

  test("offers only main profiles; a query names what cannot be chosen", async ({ page }) => {
    await openPair(page, PAIR);
    await replaceRight(page).click();
    await field(page).fill("a");
    await page.waitForTimeout(60);
    const options = dialog(page).getByRole("option");
    expect(await options.count()).toBeGreaterThan(0);
    await expect(dialog(page).getByRole("option", { name: /Already on the left/ })).toHaveCount(1);
    await field(page).fill("zzzz-not-a-game");
    await page.waitForTimeout(60);
    await expect(dialog(page).locator(".sip-search__note")).toContainText("We do not recognise that title");
  });

  test("works by touch as well as keyboard", async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto("/compare");
    await page.getByRole("button", { name: "Choose the first game" }).tap();
    await field(page).fill("Redfall");
    await page.waitForTimeout(60);
    await dialog(page).getByRole("option", { name: /^Redfall/ }).dispatchEvent("mousedown");
    await expect(page).toHaveURL(/\/compare\?games=redfall$/);
    await context.close();
  });
});

test.describe("copy link", () => {
  test("announces success politely and keeps its name", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openPair(page, PAIR);
    const button = page.getByRole("button", { name: "Copy link to this comparison" });
    await button.click();
    const status = page.locator(".cp-share__status");
    await expect(status).toHaveAttribute("role", "status");
    await expect(status).toContainText("Link copied. It opens Alan Wake 2 on the left and Returnal on the right.");
    await expect(button).toHaveText("Copy link to this comparison");
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/\/compare\?games=alan-wake-2,returnal$/);
    await expect(page.locator(".cp-share__fallback")).toBeHidden();
  });

  test("falls back to a selected read-only address when the clipboard is refused", async ({ page }) => {
    await openPair(page, PAIR);
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new Error("denied")) },
        configurable: true,
      });
    });
    await page.getByRole("button", { name: "Copy link to this comparison" }).click();
    await expect(page.locator(".cp-share__status")).toContainText("Copying failed");
    const fallback = page.getByLabel("Link to this comparison");
    await expect(fallback).toBeVisible();
    await expect(fallback).toHaveValue(/\/compare\?games=alan-wake-2,returnal$/);
    await expect(fallback).toBeFocused();
    expect(
      await fallback.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!),
    ).toBeGreaterThan(10);
  });
});

test.describe("index policy on a pair", () => {
  test("a pair address answers X-Robots-Tag noindex, follow, and the document says so too", async ({ page }) => {
    const response = await page.request.get(PAIR);
    expect(response.headers()["x-robots-tag"]).toBe("noindex, follow");
    await openPair(page, PAIR);
    // Metadata may render more than one robots tag; every one of them says so.
    await expect
      .poll(() =>
        page.locator('meta[name="robots"]').evaluateAll((metas) => {
          const contents = metas.map((meta) => (meta as HTMLMetaElement).content);
          return contents.length > 0 && contents.every((c) => c === "noindex, follow");
        }),
      )
      .toBe(true);
    await expect(page).toHaveTitle(/Alan Wake 2 and Returnal, compared/);
  });

  test("the sitemap carries the launcher and no pair", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("<loc>https://shouldiplay.gg/compare</loc>");
    expect(sitemap).not.toContain("games=");
  });
});

test.describe("the composition in a browser", () => {
  test("keeps the accepted order and reads left before right at 390×667", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 667 });
    await openPair(page, PAIR);
    const tops = await page.evaluate(() =>
      [
        '.cp-identity[data-side="left"]',
        '.cp-identity[data-side="right"]',
        ".cp-relations",
        ".cp-tags",
        ".cp-instrument",
        ".cp-controls",
      ].map((selector) => document.querySelector(selector)!.getBoundingClientRect().top + window.scrollY),
    );
    expect([...tops]).toEqual([...tops].sort((a, b) => a - b));
    // Both titles before the first scroll.
    const first = page.getByRole("heading", { level: 1 });
    await expect(first).toBeInViewport();
  });

  test("the row's relation sits between the sides on a wide screen without reordering the DOM", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPair(page, PAIR);
    const row = page.locator(".cp-row").first();
    const [left, relation, right] = await Promise.all([
      row.locator('.cp-row__side[data-side="left"]').boundingBox(),
      row.locator(".cp-row__relation").boundingBox(),
      row.locator('.cp-row__side[data-side="right"]').boundingBox(),
    ]);
    expect(left!.x).toBeLessThan(relation!.x);
    expect(relation!.x).toBeLessThan(right!.x);
    const order = await row.evaluate((el) =>
      [...el.querySelectorAll(".cp-row__side, .cp-row__relation")].map((node) => node.className),
    );
    expect(order[0]).toContain("cp-row__side");
    expect(order[2]).toContain("cp-row__relation");

    // The stage: identities flank the seam column and the legend sits in it,
    // beside the identities rather than on a row of its own.
    const [leftId, legend, rightId] = await Promise.all([
      page.locator('.cp-identity[data-side="left"]').boundingBox(),
      page.locator(".cp-legend").boundingBox(),
      page.locator('.cp-identity[data-side="right"]').boundingBox(),
    ]);
    expect(leftId!.x + leftId!.width).toBeLessThanOrEqual(legend!.x + 1);
    expect(legend!.x + legend!.width).toBeLessThanOrEqual(rightId!.x + 1);
    expect(legend!.y).toBeLessThan(leftId!.y + leftId!.height);
    // And the note stays inside the legend rather than wrapping beside it.
    const note = await page.locator(".cp-legend__note").boundingBox();
    expect(note!.x + note!.width).toBeLessThanOrEqual(legend!.x + legend!.width + 1);
  });

  test("at 200% text on 1280 the stage is one column and the identities keep their width", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openPair(page, PAIR);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
    });
    await page.waitForTimeout(100);
    const [leftId, rightId] = await Promise.all([
      page.locator('.cp-identity[data-side="left"]').boundingBox(),
      page.locator('.cp-identity[data-side="right"]').boundingBox(),
    ]);
    expect(leftId!.width).toBeGreaterThan(900);
    expect(rightId!.y).toBeGreaterThan(leftId!.y + leftId!.height - 1);
  });

  test("every row is a Details disclosure that opens independently and keeps focus", async ({ page }) => {
    await openPair(page, PAIR);
    const buttons = page.locator(".cp-row__why");
    await expect(buttons).toHaveCount(8);
    const first = buttons.nth(0);
    const second = buttons.nth(1);
    await first.focus();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await expect(first).toBeFocused();
    const panel = page.locator(`#${await first.getAttribute("aria-controls")}`);
    await expect(panel).toBeVisible();
    await second.click();
    await expect(second).toHaveAttribute("aria-expanded", "true");
    await expect(first).toHaveAttribute("aria-expanded", "true");
    const box = await first.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("keyboard order follows the DOM: identity links, disclosures, then Replace and Copy", async ({ page }) => {
    await openPair(page, PAIR);
    const sequence: string[] = [];
    await page.locator(".cp-identity__link").first().focus();
    for (let i = 0; i < 30; i += 1) {
      sequence.push(
        await page.evaluate(() => (document.activeElement as HTMLElement).innerText.trim().slice(0, 40)),
      );
      if (/Copy link/.test(sequence[sequence.length - 1]!)) break;
      await page.keyboard.press("Tab");
    }
    const indexOf = (pattern: RegExp) => {
      const index = sequence.findIndex((text) => pattern.test(text));
      expect(index, `${pattern} in ${JSON.stringify(sequence)}`).toBeGreaterThanOrEqual(0);
      return index;
    };
    // `innerText` reports the painted text, which the control sets in capitals.
    expect(indexOf(/Read the Game Profile/)).toBeLessThan(indexOf(/Details/i));
    expect(indexOf(/Details/i)).toBeLessThan(indexOf(/Replace Alan Wake 2 on the left/));
    expect(indexOf(/Replace Alan Wake 2 on the left/)).toBeLessThan(indexOf(/Replace Returnal on the right/));
    expect(indexOf(/Replace Returnal on the right/)).toBeLessThan(indexOf(/Copy link/));
  });

  test("stops motion under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPair(page, PAIR);
    const transitions = await page.evaluate(() =>
      [...document.querySelectorAll(".cp-button, .cp-row__why, .cp-row__chevron")].map(
        (el) => getComputedStyle(el).transitionProperty,
      ),
    );
    expect(transitions.every((value) => value === "none" || value === "all")).toBe(true);
    expect(transitions.every((value) => value === "none")).toBe(true);
  });
});

test.describe("reflow", () => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 667 },
    { width: 1440, height: 900 },
  ]) {
    test(`does not scroll sideways at ${viewport.width}, closed and with a disclosure open`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openPair(page, PAIR);
      expect(await sidewaysOverflow(page)).toEqual([]);
      await page.locator(".cp-row__why").first().click();
      expect(await sidewaysOverflow(page)).toEqual([]);
    });
  }

  for (const width of [1280, 390, 320]) {
    test(`does not scroll sideways at 200% text on ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openPair(page, PAIR);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "32px";
      });
      expect(await sidewaysOverflow(page)).toEqual([]);
      await page.locator(".cp-row__why").first().click();
      expect(await sidewaysOverflow(page)).toEqual([]);
      await expect(page.locator(".cp-row")).toHaveCount(8);
    });
  }

  test("the harness states reflow at 320 too", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(STATES);
    expect(await sidewaysOverflow(page)).toEqual([]);
  });
});

test.describe("artwork states", () => {
  test("the harness renders both, left-only, right-only and no artwork with equal identity order", async ({ page }) => {
    await page.goto(STATES);
    for (const art of ["both", "left", "right", "none"]) {
      const stage = page.locator(`.cp-stage[data-art="${art}"]`).first();
      await expect(stage, art).toBeVisible();
      await expect(stage.locator(".cp-identity").nth(0)).toContainText("Left · Game Profile");
      await expect(stage.locator(".cp-identity").nth(1)).toContainText("Right · Game Profile");
      const fields = stage.locator(".cp-art__field");
      const [leftBox, rightBox] = await Promise.all([fields.nth(0).boundingBox(), fields.nth(1).boundingBox()]);
      expect(Math.abs(leftBox!.height - rightBox!.height), art).toBeLessThan(2);
      expect(Math.abs(leftBox!.width - rightBox!.width), art).toBeLessThan(2);
    }
  });

  test("a failed image leaves the territory beneath it and loses no content", async ({ page }) => {
    await page.goto(STATES);
    const failed = page.locator("#failed-art + .cp");
    await expect(failed.locator(".cp-identity").nth(0)).toContainText("Failed-artwork fixture");
    const img = failed.locator(".cp-art__field img").first();
    // The image did not load; the wash under it is painted; no broken glyph text.
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(0);
    await expect(failed.locator('.cp-art__field[data-side="left"] .cp-art__wash')).toBeVisible();
    await expect(failed.locator(".cp-row")).toHaveCount(8);
  });

  test("a slow image is the same composition while it loads", async ({ page }) => {
    // Hold the artwork responses open: what is on screen meanwhile is the
    // authored territory, with every identity and row already present.
    await page.route(/steamstatic|alanwake/, () => new Promise(() => {}));
    await page.goto(PAIR, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".cp-identity").nth(0)).toContainText("Alan Wake 2");
    await expect(page.locator(".cp-identity").nth(1)).toContainText("Returnal");
    await expect(page.locator(".cp-row")).toHaveCount(8);
    await expect(page.locator('.cp-art__field[data-side="left"] .cp-art__wash')).toBeVisible();
  });
});

test("the Compare harness is reachable for review, unindexed", async ({ page }) => {
  const response = await page.goto(STATES);
  expect(response?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  for (const id of ["art-led", "artless", "left-art", "right-art", "failed-art", "empty", "left-only", "self-pair", "invalid", "relations", "provisional", "tags", "long", "override"]) {
    await expect(page.locator(`#${id}`), id).toHaveCount(1);
  }
  // The relation fixture: every relation word, both endpoints of a range, Not scored.
  const relations = page.locator("#relations + .cp");
  for (const word of ["Equal", "Close", "Clear difference", "Indeterminate"]) {
    await expect(relations.locator(".cp-row .cp-word", { hasText: word }).first(), word).toBeVisible();
  }
  // Two ranges (Agency and Pacing) and two Not scored (Execution, both sides).
  await expect(relations.locator(".cp-row__kind")).toHaveCount(2);
  await expect(relations.locator(".cp-row__num", { hasText: "–" }).first()).toBeVisible();
  await expect(relations.locator(".cp-row__notscored")).toHaveCount(2);
  // The tag fixture: a shared tag with two intensities writes both.
  await expect(page.locator("#tags + .cp .cp-tag[data-differs]")).toContainText("Resource pressure · Alan Wake 2 Medium · Tag fixture (Returnal tags, edited) High");
});
