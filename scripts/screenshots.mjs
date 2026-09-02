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
  { name: "profile-states", path: "/dev/profile-states" },
  { name: "compare-launcher", path: "/compare" },
  { name: "compare-pair", path: "/compare?games=alan-wake-2,returnal" },
  { name: "compare-states", path: "/dev/compare-states" },
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
  // The profile. Art-led on a preview build (the evaluation overlay resolves
  // there); the artless parity state is captured from the harness below.
  { name: "profile-390x667", path: "/games/alan-wake-2", width: 390, height: 667 },
  { name: "profile-320", path: "/games/alan-wake-2", width: 320, height: 568 },
  { name: "profile-200pc-1280", path: "/games/alan-wake-2", width: 1280, height: 800, rootFontPx: 32 },
  { name: "profile-200pc-390", path: "/games/alan-wake-2", width: 390, height: 844, rootFontPx: 32 },
  // Compare. Art-led on a preview build; the artless production state and
  // the mixed states are captured from the harness below.
  { name: "compare-390x667", path: "/compare?games=alan-wake-2,returnal", width: 390, height: 667 },
  { name: "compare-320", path: "/compare?games=alan-wake-2,returnal", width: 320, height: 568 },
  { name: "compare-200pc-1280", path: "/compare?games=alan-wake-2,returnal", width: 1280, height: 800, rootFontPx: 32 },
  { name: "compare-200pc-390", path: "/compare?games=alan-wake-2,returnal", width: 390, height: 844, rootFontPx: 32 },
];

/**
 * Compare states from the Slice 4 harness, captured as the component alone:
 * the artless production state at both references, the two mixed-art states,
 * and the relation fixture with a Range, Not scored and every relation word.
 */
const COMPARE_STATES = [
  { name: "compare-artless-1440", anchor: "artless", width: 1440, height: 900 },
  { name: "compare-artless-390", anchor: "artless", width: 390, height: 844 },
  { name: "compare-left-art-1440", anchor: "left-art", width: 1440, height: 900 },
  { name: "compare-right-art-390", anchor: "right-art", width: 390, height: 844 },
  { name: "compare-relations-1440", anchor: "relations", width: 1440, height: 900 },
  { name: "compare-self-pair-390", anchor: "self-pair", width: 390, height: 844 },
];

/**
 * The artless parity state, captured as the profile element alone from the
 * Slice 3 harness: the same Alan Wake 2 record with no artwork, at the desktop
 * and phone references. Production renders this state on every profile today.
 */
const ARTLESS = [
  { name: "profile-artless-1440", width: 1440, height: 900 },
  { name: "profile-artless-390", width: 390, height: 844 },
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

for (const shot of ARTLESS) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/dev/profile-states`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator('.gp[data-art="less"]')
    .first()
    .screenshot({ path: `${OUT}/${shot.name}.png` });
  await context.close();
}

for (const shot of COMPARE_STATES) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/dev/compare-states`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator(`#${shot.anchor} + .cp`)
    .screenshot({ path: `${OUT}/${shot.name}.png` });
  await context.close();
}

// A dimension disclosure open on the profile, at the phone reference: the
// state a full-page capture cannot show, and the one the disclosure contract
// is about.
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/games/alan-wake-2`, { waitUntil: "networkidle" });
  const why = page.locator(".gp-row__why").nth(5);
  await why.scrollIntoViewIfNeeded();
  await why.click();
  await page.waitForTimeout(300);
  await page.locator(".gp-row").nth(5).screenshot({ path: `${OUT}/profile-disclosure-open-mobile.png` });
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
