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

await browser.close();
console.log(`Wrote screenshots to ${OUT}/`);
