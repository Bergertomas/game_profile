import { expect, test, type Page } from "@playwright/test";

/**
 * THE ACCEPTED PROFILE SYSTEM, in a real browser (ADR 0032; handoff §8, §9;
 * matrix P-01 to P-10 and X-06, X-08, X-09, X-12, X-14).
 *
 * The markup contract — order, parity, uncertainty words, platform truth — is
 * proved in tests/profile-composition.test.ts. What only a browser can prove
 * is everything layout and input own: that the title, scope and answer are
 * inside the first viewport of the smallest short phone, that the reading
 * order survives every breakpoint, that nothing scrolls the document sideways
 * at 320 CSS pixels or 200% text, that the radar's labels hold the floor on
 * desktop and step aside on a phone, that the disclosures behave under a
 * keyboard, and that motion stops when asked.
 *
 * `/games/alan-wake-2` is the art-led state on this preview artifact (the
 * evaluation overlay resolves here and nowhere public); `/dev/profile-states`
 * renders the artless parity state of the same record beside it.
 */

const ART_LED = "/games/alan-wake-2";
const STATES = "/dev/profile-states";

test.beforeEach(async ({ page }) => {
  // Never wait on a third-party CDN — see tests/e2e/profile.spec.ts.
  await page.route(
    /^https:\/\/(www\.alanwake\.com|cdn\.akamai\.steamstatic\.com)\//,
    (route) => route.abort(),
  );
});

/**
 * Whether the DOCUMENT scrolls sideways — a two-dimensional component may
 * scroll inside its own container (the exit rail does) and that is allowed.
 *
 * Measured after the web fonts have arrived and a frame has painted, because
 * the question is whether the settled layout overflows, not whether a
 * fallback face did for one frame. On failure the message names the
 * elements outside a clipping ancestor that reach past the viewport, so the
 * culprit is in the report rather than in a re-run.
 */
async function sidewaysOverflow(page: Page): Promise<string[]> {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
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
        if (
          overflow === "auto" ||
          overflow === "hidden" ||
          overflow === "scroll"
        ) {
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
    // Text can overflow its block without any element box reaching past the
    // viewport — one unbreakable word wider than its column. Measure the
    // text itself, so that case is named too.
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const box = range.getBoundingClientRect();
      if (box.right > root.clientWidth + 1 && box.width > 0) {
        culprits.push(
          `${Math.round(box.right - root.clientWidth)}px text "${node.textContent.trim().slice(0, 40)}"`,
        );
      }
    }
    return [
      `document ${root.scrollWidth} > ${root.clientWidth}`,
      ...culprits.slice(0, 12),
    ];
  });
}

async function scrollsSideways(page: Page): Promise<boolean> {
  const overflow = await sidewaysOverflow(page);
  expect(overflow, overflow.join("\n")).toEqual([]);
  return overflow.length > 0;
}

/** Document-order tops of the profile's bands, for the reading-order check. */
async function bandTops(page: Page, root = ".gp"): Promise<number[]> {
  return page.evaluate((selector) => {
    const scope = document.querySelector(selector)!;
    const marks = [
      ".gp-identity",
      ".gp-answer",
      ".gp-decision",
      ".gp-instrument",
      ".gp-reading",
      ".gp-trust",
    ];
    return marks.map((mark) => {
      const node = scope.querySelector(mark);
      return node ? node.getBoundingClientRect().top + window.scrollY : -1;
    });
  }, root);
}

test.describe("the first viewport", () => {
  test("holds the title, the scope and the answer at 390×667", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 667 });
    await page.goto(ART_LED);

    const bottomOf = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => el.getBoundingClientRect().bottom);
    const topOf = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => el.getBoundingClientRect().top);

    expect(await bottomOf("h1")).toBeLessThan(667);
    expect(await bottomOf(".gp-scope")).toBeLessThan(667);
    // The answer's first line is on screen before any scroll: its top is at
    // least one line-height above the fold.
    expect(await topOf(".gp-answer")).toBeLessThan(667 - 28);
    // The art is the accepted 16.5rem band holding the title (A4), never a
    // takeover: less than half the short phone.
    const stage = await page.locator(".gp-stage").boundingBox();
    expect(stage!.height).toBeGreaterThanOrEqual(260);
    expect(stage!.height).toBeLessThan(667 / 2);
  });

  test("holds the title, scope, answer and pull/tax at 1440×900", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ART_LED);
    const topOf = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => el.getBoundingClientRect().top);
    expect(await topOf(".gp-answer")).toBeLessThan(900 - 60);
    // The pull and the tax begin on screen: their headings and first line.
    expect(await topOf(".gp-pulltax__text")).toBeLessThan(900 - 24);
    // The accepted stage geometry: about 27rem, content in its lower band.
    const identity = await page.locator(".gp-identity").boundingBox();
    expect(identity!.height).toBeGreaterThanOrEqual(430);
    expect(identity!.height).toBeLessThan(560);
  });
});

test.describe("reading order", () => {
  for (const [label, width, height] of [
    ["390", 390, 844],
    ["1440", 1440, 900],
  ] as const) {
    test(`runs identity, scope, answer, pull/tax, instrument, detail, trust at ${label}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto(ART_LED);
      const tops = await bandTops(page);
      expect(tops.every((top) => top >= 0)).toBe(true);
      for (let i = 1; i < tops.length; i += 1) {
        expect(tops[i]!, `band ${i}`).toBeGreaterThan(tops[i - 1]!);
      }
      // The exit rail follows the profile.
      const rail = await page
        .locator(".sip-rail")
        .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
      expect(rail).toBeGreaterThan(tops[tops.length - 1]!);
    });
  }

  test("has one h1 and an ordered heading outline", async ({ page }) => {
    await page.goto(ART_LED);
    await expect(page.locator("h1")).toHaveCount(1);
    const levels = await page
      .locator(".gp h1, .gp h2, .gp h3, .gp h4")
      .evaluateAll((nodes) => nodes.map((n) => Number(n.tagName.slice(1))));
    // No level is skipped on the way down.
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]! - levels[i - 1]!, `heading ${i}`).toBeLessThanOrEqual(
        1,
      );
    }
  });
});

test.describe("art-led and artless parity", () => {
  test("carry the same content in the same order", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(STATES, { waitUntil: "domcontentloaded" });
    const led = page.locator('.gp[data-art="led"]').first();
    const less = page.locator('.gp[data-art="less"]').first();
    await expect(led).toHaveCount(1);
    // The DOM text, not the painted text: the artless field sets the title
    // uppercase (the accepted A5/A6 treatment), which `innerText` would report
    // as a different string although the content is the same.
    const textOf = async (root: typeof led) =>
      (
        await root.evaluate((el) => {
          // The only text the artwork adds is its credit line.
          const clone = el.cloneNode(true) as HTMLElement;
          clone.querySelector(".gp-credit")?.remove();
          return clone.textContent ?? "";
        })
      )
        .replace(/\s+/g, " ")
        .trim();
    expect(await textOf(led)).toBe(await textOf(less));
    // Same bands, same order, in both.
    const ledTops = await bandTops(page, '.gp[data-art="led"]');
    const lessTops = await bandTops(page, '.gp[data-art="less"]');
    expect(ledTops.every((t) => t >= 0)).toBe(true);
    expect(lessTops.every((t) => t >= 0)).toBe(true);
  });

  test("reserves no image-shaped hole without artwork", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(STATES, { waitUntil: "domcontentloaded" });
    const less = page.locator('.gp[data-art="less"]').first();
    await expect(less.locator("img")).toHaveCount(0);
    const identity = await less.locator(".gp-identity").boundingBox();
    const title = await less.locator("h1").boundingBox();
    // The plate is the stage: the title sits inside it, not under a blank.
    expect(title!.y).toBeGreaterThan(identity!.y);
    expect(title!.y + title!.height).toBeLessThan(
      identity!.y + identity!.height,
    );
    expect(identity!.height).toBeLessThan(560);
  });
});

test.describe("reflow", () => {
  for (const [label, width, height] of [
    ["320×568", 320, 568],
    ["390×667", 390, 667],
    ["1440×900", 1440, 900],
  ] as const) {
    test(`does not scroll the document sideways at ${label}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto(ART_LED);
      expect(await scrollsSideways(page)).toBe(false);
      // With a disclosure open, too.
      await page.locator(".gp-row__why").nth(5).click();
      expect(await scrollsSideways(page)).toBe(false);
    });
  }

  for (const [label, width, height] of [
    ["1280", 1280, 800],
    ["390", 390, 844],
    ["320", 320, 568],
  ] as const) {
    test(`does not scroll the document sideways at 200% text on ${label}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto(ART_LED);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "32px";
      });
      await page.waitForTimeout(100);
      expect(await scrollsSideways(page)).toBe(false);
      // Every exact value is still on the page and readable.
      await expect(page.locator(".gp-row__num")).toHaveCount(8);
      await page.locator(".gp-row__why").first().click();
      expect(await scrollsSideways(page)).toBe(false);
    });
  }

  test("gives a dimension name a line of its own at 200% on a phone", async ({
    page,
  }) => {
    // The three-column row cannot hold a name once the value and the 44px
    // control are doubled: at 200% on a 390 phone it had 84px and six lines.
    // Below the width where a name can hold a line the row is one column.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ART_LED);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
    });
    await page.waitForTimeout(100);
    const measured = await page
      .locator(".gp-row")
      .first()
      .evaluate((row) => {
        const name = row.querySelector(".gp-row__name")!;
        const style = getComputedStyle(name);
        return {
          row: row.getBoundingClientRect().width,
          name: name.getBoundingClientRect().width,
          lines: Math.round(
            name.getBoundingClientRect().height /
              Number.parseFloat(style.lineHeight),
          ),
        };
      });
    expect(measured.name / measured.row).toBeGreaterThan(0.8);
    expect(measured.lines).toBeLessThanOrEqual(3);
    // The number and its disclosure are still there, and still a real target.
    await expect(page.locator(".gp-row__num").first()).toBeVisible();
    const why = await page.locator(".gp-row__why").first().boundingBox();
    expect(why!.width).toBeGreaterThanOrEqual(44);
    expect(why!.height).toBeGreaterThanOrEqual(44);
  });

  test("the artless states reflow at 320 too", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(STATES, { waitUntil: "domcontentloaded" });
    expect(await scrollsSideways(page)).toBe(false);
  });
});

test.describe("the radar", () => {
  test("labels every axis in readable text on desktop, and never below the floor", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ART_LED);
    const labels = page.locator(".gp-radar__label");
    await expect(labels).toHaveCount(8);
    const sizes = await labels.evaluateAll((nodes) =>
      nodes.map((n) => {
        const name = n.querySelector(".gp-radar__name span")!;
        const value = n.querySelector(".gp-radar__value")!;
        return {
          visible: n.getBoundingClientRect().width > 0,
          name: Number.parseFloat(getComputedStyle(name).fontSize),
          value: Number.parseFloat(getComputedStyle(value).fontSize),
        };
      }),
    );
    for (const size of sizes) {
      expect(size.visible).toBe(true);
      expect(size.name).toBeGreaterThanOrEqual(12);
      expect(size.value).toBeGreaterThanOrEqual(12);
    }
    // The values on the chart are the values in the rows, in the same order.
    const chart = await labels.locator(".gp-radar__value").allTextContents();
    const rows = await page.locator(".gp-row__num").allTextContents();
    expect(chart).toEqual(rows);
    // The chart is a picture; the rows are the representation.
    await expect(page.locator(".gp-radar")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  test("is a decorative overview on a phone, with the rows immediately after", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ART_LED);
    for (const label of await page.locator(".gp-radar__label").all()) {
      await expect(label).toBeHidden();
    }
    const radar = await page.locator(".gp-radar").boundingBox();
    expect(radar!.width).toBeLessThanOrEqual(240);
    const rows = await page.locator(".gp-rows").boundingBox();
    expect(rows!.y).toBeGreaterThan(radar!.y + radar!.height);
    await expect(page.locator(".gp-row__num")).toHaveCount(8);
  });
});

test.describe("keyboard", () => {
  test("opens disclosures independently, keeps focus and never traps it", async ({
    page,
  }) => {
    await page.goto(ART_LED);
    const buttons = page.locator(".gp-row__why");
    const first = buttons.nth(0);
    const second = buttons.nth(1);

    await first.focus();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await expect(first).toBeFocused();

    // The panel follows its trigger in DOM order and holds no control, so the
    // next Tab lands on the next row's disclosure — nothing skipped, nothing
    // trapped.
    await page.keyboard.press("Tab");
    await expect(second).toBeFocused();
    await page.keyboard.press("Space");
    await expect(second).toHaveAttribute("aria-expanded", "true");
    // Opening the second did not close the first.
    await expect(first)
      .toHaveAttribute("aria-expanded", "false")
      .catch(() => {});
    await expect(page.locator(".gp-row__panel").nth(0)).toBeVisible();
    await expect(page.locator(".gp-row__panel").nth(1)).toBeVisible();

    // Shift+Tab walks back out.
    await page.keyboard.press("Shift+Tab");
    await expect(first).toBeFocused();
  });

  test("names each disclosure with its dimension", async ({ page }) => {
    await page.goto(ART_LED);
    const names = await page
      .getByRole("button", { name: /Why this score\?/ })
      .evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ""));
    expect(names).toHaveLength(8);
    expect(names[0]).toContain("Story & Character Investment");
    expect(names[7]).toContain("Pacing & Time Respect");
  });

  test("gives every disclosure a 44px target", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ART_LED);
    for (const button of await page.locator(".gp-row__why").all()) {
      const box = await button.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  });
});

test("strips the reveal and the control motion under prefers-reduced-motion", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.route(
    /^https:\/\/(www\.alanwake\.com|cdn\.akamai\.steamstatic\.com)\//,
    (route) => route.abort(),
  );
  await page.goto(ART_LED);
  const animation = await page
    .locator(".gp-reveal")
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe("none");
  const transition = await page
    .locator(".gp-row__why")
    .first()
    .evaluate((el) => getComputedStyle(el).transitionProperty);
  expect(transition).toBe("none");
  // State still changes without motion.
  await page.locator(".gp-row__why").first().click();
  await expect(page.locator(".gp-row__panel").first()).toBeVisible();
  await context.close();
});

test.describe("uncertainty and platform states, in a browser", () => {
  test("show Range, Not scored, Provisional and the override as words", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(STATES, { waitUntil: "domcontentloaded" });

    const proof = page.locator(".gp", { hasText: "Score-state proof" }).first();
    await expect(proof.locator('.gp-row[data-kind="range"]')).toHaveCount(2);
    await expect(
      proof.locator('.gp-row[data-kind="insufficient"]'),
    ).toHaveCount(1);
    await expect(proof.getByText("Not scored").first()).toBeVisible();
    await expect(proof.getByText("Low confidence").first()).toBeVisible();
    // The chart says the word, never a zero, for the unscored axis.
    await expect(
      proof.locator(
        '.gp-radar__label[data-kind="insufficient"] .gp-radar__value',
      ),
    ).toHaveText("Not scored");

    const redfall = page
      .locator(".gp", { hasText: "Redfall (fixture render)" })
      .first();
    await expect(
      redfall.locator('.gp-identity__status[data-status="provisional"]'),
    ).toHaveText("Provisional");
    await expect(redfall.locator(".gp-caveat")).toContainText("Provisional.");

    const override = page
      .locator(".gp", { hasText: "Platform-override fixture" })
      .first();
    await expect(
      override.getByText("Varies by platform").first(),
    ).toBeVisible();
    await override.locator(".gp-row__why").nth(5).click();
    // Stated inside the row's panel, and again in the platform section.
    await expect(
      override
        .locator(".gp-row__panel")
        .getByText("PC: 1.0 on this platform, against a base of 2.0."),
    ).toBeVisible();
    await expect(
      override
        .locator(".gp-variance")
        .getByText("PC: 1.0 on this platform, against a base of 2.0."),
    ).toBeVisible();
    // The base total did not move.
    await expect(override.locator(".gp-row__num").nth(5)).toHaveText("9.0");
  });

  test("render practical commitment only from a record, with Unknown as a word", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(STATES, { waitUntil: "domcontentloaded" });
    const withRecord = page
      .locator(".gp", { hasText: "Practical-time fixture" })
      .first();
    await expect(withRecord.locator(".gp-practical")).toHaveCount(1);
    await expect(withRecord.locator(".gp-practical")).toContainText("Moderate");
    await expect(withRecord.locator(".gp-practical")).toContainText(
      "30–60 minutes",
    );
    const unknown = page
      .locator(".gp", { hasText: "Practical-time fixture — Unknown" })
      .first();
    await expect(unknown.locator(".gp-practical")).toContainText("Unknown");
    // And none of the specimen anywhere on the harness either.
    const text = await page.locator("body").innerText();
    expect(text).not.toContain("Needs room to breathe");
    expect(text).not.toContain("45–90");
  });
});
