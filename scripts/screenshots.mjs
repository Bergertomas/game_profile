import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Capture the review screenshots required by Plan §23.2 (screenshots for UI
 * work) at the viewports listed in §22.2.
 *
 * Usage: node scripts/screenshots.mjs [outDir] [baseUrl]
 */

const OUT = process.argv[2] ?? "screenshots";
const BASE = process.argv[3] ?? "http://localhost:3111";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "android", width: 360, height: 800 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "desktop", width: 1440, height: 1000 },
];

const PAGES = [
  { name: "home", path: "/" },
  { name: "alan-wake-2", path: "/games/alan-wake-2" },
  { name: "returnal", path: "/games/returnal" },
  { name: "redfall", path: "/games/redfall" },
  { name: "methodology", path: "/methodology" },
  { name: "radar-states", path: "/dev/radar-states" },
  { name: "home-states", path: "/dev/home-states" },
];

/**
 * The conformance envelope from the accessibility/visual matrix §1.
 *
 * These are not "more sizes" — they are the specific stress cases the accepted
 * homepage has to survive: the short phone where Search must be reachable
 * without scrolling past a picture, the narrowest supported width, and 200%
 * text at both a desktop and a phone baseline. Captured viewport-only, because
 * what is being evidenced is what fits in a first viewport.
 */
const CONFORMANCE = [
  { name: "home-390x667", path: "/", width: 390, height: 667 },
  { name: "home-320", path: "/", width: 320, height: 568 },
  { name: "home-200pc-1280", path: "/", width: 1280, height: 800, rootFontPx: 32 },
  { name: "home-200pc-390", path: "/", width: 390, height: 844, rootFontPx: 32 },
];

mkdirSync(OUT, { recursive: true });

// Same optional override as playwright.config.ts: unset on a normal machine,
// set in environments that ship a prebuilt browser at a fixed path.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const browser = await chromium.launch(
  executablePath ? { executablePath } : {},
);

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  for (const target of PAGES) {
    await page.goto(`${BASE}${target.path}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `${OUT}/${target.name}-${viewport.name}.png`,
      fullPage: viewport.name === "desktop" || viewport.name === "mobile",
    });
  }
  await context.close();
}

// Above-the-fold crops for quick review.
for (const viewport of [VIEWPORTS[0], VIEWPORTS[3]]) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  for (const target of PAGES.slice(1, 4)) {
    await page.goto(`${BASE}${target.path}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `${OUT}/fold-${target.name}-${viewport.name}.png`,
    });
  }
  await context.close();
}

// The conformance envelope. Viewport-only and at device scale 1, so a capture
// is directly comparable with the CSS pixel budgets the matrix states.
for (const shot of CONFORMANCE) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle" });
  if (shot.rootFontPx) {
    await page.evaluate((size) => {
      document.documentElement.style.fontSize = `${size}px`;
    }, shot.rootFontPx);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${OUT}/${shot.name}.png` });
  await context.close();
}

// The poster preview open, at the phone reference. The one state a full-page
// capture cannot show, and the one the disclosure contract is about.
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const disclosure = page.locator(".sip-poster__disclose").first();
  if (await disclosure.count()) {
    await disclosure.scrollIntoViewIfNeeded();
    await disclosure.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/home-preview-open-mobile.png` });
  }
  await context.close();
}

await browser.close();
console.log(`Wrote screenshots to ${OUT}/`);
