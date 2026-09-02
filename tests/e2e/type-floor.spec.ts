import { expect, test, type Page } from "@playwright/test";

/**
 * THE 12px FLOOR, measured rather than promised.
 *
 * A `font-size` in a stylesheet is not the size a reader gets: it is inherited,
 * overridden, scaled by a `clamp()` against the viewport, and reset by a
 * container the author forgot about. The only honest way to hold a floor is to
 * ask the browser what it actually painted, at every width the product claims
 * to support.
 *
 * ── What counts ────────────────────────────────────────────────────────────
 *
 * Meaningful VISIBLE text: a text node with real characters, whose element is
 * displayed, has non-zero size, and is not visually-hidden. Screen-reader-only
 * text is excluded because it is never painted — its size is irrelevant to a
 * reader and clamping it would be cargo cult.
 *
 * ── Why it runs at four viewports ──────────────────────────────────────────
 *
 * Because the failures are viewport-dependent. A `clamp()` floor that is fine
 * at 1440 can drop below 12px at 320, and the two sizes this test was written
 * to catch — an 11px notation line and a 9px measurement cue — were both fixed
 * values that looked deliberate in a stylesheet and were unreadable on a phone.
 */

const FLOOR_PX = 12;

/** The public surfaces, plus the chrome that appears on all of them. */
const PAGES = ["/", "/methodology", "/games/alan-wake-2", "/games/redfall"] as const;

const VIEWPORTS = [
  { label: "320", width: 320, height: 640 },
  { label: "390x667", width: 390, height: 667 },
  { label: "1440", width: 1440, height: 900 },
] as const;

interface Offender {
  readonly size: number;
  readonly selector: string;
  readonly text: string;
}

/**
 * Every painted text node below the floor, with enough context to fix it.
 *
 * Walks text nodes rather than elements so that a small span inside a
 * correctly-sized paragraph is caught: the floor is a property of the text a
 * person reads, not of the block it happens to sit in.
 */
async function undersizedText(page: Page, floor: number): Promise<Offender[]> {
  return page.evaluate((limit) => {
    const found: { size: number; selector: string; text: string }[] = [];
    const seen = new Set<Element>();

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? "";
      if (!text) continue;

      const element = node.parentElement;
      if (!element || seen.has(element)) continue;
      seen.add(element);

      const style = getComputedStyle(element);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number.parseFloat(style.opacity) === 0
      ) {
        continue;
      }

      // Visually-hidden text is announced, never painted. The 1px clip box is
      // the tell, and it is the same box Tailwind's `sr-only` produces.
      const box = element.getBoundingClientRect();
      if (box.width <= 1 || box.height <= 1) continue;

      const size = Number.parseFloat(style.fontSize);
      if (Number.isFinite(size) && size < limit) {
        const id = element.id ? `#${element.id}` : "";
        const cls =
          typeof element.className === "string" && element.className
            ? `.${element.className.trim().split(/\s+/).join(".")}`
            : "";
        found.push({
          size: Math.round(size * 100) / 100,
          selector: `${element.tagName.toLowerCase()}${id}${cls}`,
          text: text.slice(0, 48),
        });
      }
    }
    return found;
  }, floor);
}

function describe(offenders: Offender[]): string {
  return offenders
    .map((o) => `  ${o.size}px  ${o.selector}\n           "${o.text}"`)
    .join("\n");
}

for (const viewport of VIEWPORTS) {
  for (const path of PAGES) {
    test(`no visible text below ${FLOOR_PX}px on ${path} at ${viewport.label}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(path);
      const offenders = await undersizedText(page, FLOOR_PX);
      expect(
        offenders,
        `text below the ${FLOOR_PX}px floor:\n${describe(offenders)}`,
      ).toEqual([]);
    });
  }
}

/**
 * A guard on the guard.
 *
 * A detector that reports nothing is indistinguishable from a product with no
 * violations, and the second is only worth believing if the first is proven
 * wrong. This paints a known-bad node, confirms it is caught with its size and
 * selector, removes it, and confirms the page is clean again.
 */
test("the detector actually catches undersized text", async ({ page }) => {
  await page.goto("/");
  await expect(await undersizedText(page, FLOOR_PX)).toEqual([]);

  await page.evaluate(() => {
    const bad = document.createElement("p");
    bad.id = "floor-probe";
    bad.textContent = "eleven pixel text";
    bad.style.fontSize = "11px";
    document.body.append(bad);
  });

  const caught = await undersizedText(page, FLOOR_PX);
  expect(caught).toHaveLength(1);
  expect(caught[0]!.size).toBe(11);
  expect(caught[0]!.selector).toBe("p#floor-probe");

  await page.evaluate(() => document.getElementById("floor-probe")?.remove());
  expect(await undersizedText(page, FLOOR_PX)).toEqual([]);
});

test("holds the floor with the search listbox open", async ({ page }) => {
  // The popup is the densest surface in the product — rows, metadata, a
  // keyboard legend and a footnote — and it is drawn only on interaction, so a
  // page-load sweep would never see it.
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto("/");
  await page.getByRole("combobox", { name: "Search" }).fill("re");
  await expect(page.getByRole("option").first()).toBeVisible();

  const offenders = await undersizedText(page, FLOOR_PX);
  expect(
    offenders,
    `text below the ${FLOOR_PX}px floor:\n${describe(offenders)}`,
  ).toEqual([]);
});

test("holds the floor inside the header dialog", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto("/methodology");
  await page.getByRole("button", { name: "Search" }).click();
  await page.locator("dialog[open] input").fill("re");
  await expect(page.getByRole("option").first()).toBeVisible();

  const offenders = await undersizedText(page, FLOOR_PX);
  expect(
    offenders,
    `text below the ${FLOOR_PX}px floor:\n${describe(offenders)}`,
  ).toEqual([]);
});

test("holds the floor at 200% text", async ({ page }) => {
  // Doubling the root size cannot push anything below the floor, but a
  // `clamp()` whose upper bound is viewport-relative can shrink relative to the
  // text around it. This is the check that the scale still holds together.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  const offenders = await undersizedText(page, FLOOR_PX);
  expect(
    offenders,
    `text below the ${FLOOR_PX}px floor:\n${describe(offenders)}`,
  ).toEqual([]);
});
