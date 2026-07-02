/**
 * Route Map V1 — review packet screenshots (desktop + mobile).
 * Run: node scripts/capture-route-map-v1.mjs
 * Requires app at localhost:3000 (npm run dev or npm start after build).
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/route-map-v1-screenshots");
const CAMPAIGN_KEY = "studio-squishy:current-campaign";

async function clearCampaign(page) {
  await page.goto(BASE);
  await page.evaluate((key) => {
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
  }, CAMPAIGN_KEY);
}

async function gotoRouteMap(page) {
  await page.goto(`${BASE}/route-map`);
  await page.waitForSelector(".route-map-page", { timeout: 25000 });
  await page.waitForTimeout(400);
}

async function selectRoad(page, customerLabel) {
  const laneTile = page.locator(".route-map-lane-tile", { hasText: customerLabel }).first();
  const sidebarLink = page.locator(".route-map-sidebar__link", { hasText: customerLabel }).first();

  if (await laneTile.isVisible()) {
    await laneTile.click();
  } else if (await sidebarLink.count()) {
    await sidebarLink.first().click();
  } else {
    throw new Error(`Could not find road selector for "${customerLabel}"`);
  }

  await page.waitForSelector(".route-map-road, .route-map-road--shelf", { timeout: 25000 });
  await page.waitForTimeout(350);
}

async function selectJobByName(page, jobName) {
  await page.getByRole("button", { name: new RegExp(jobName, "i") }).click();
  await page.waitForSelector(".route-map-job-card", { timeout: 15000 });
  await page.waitForTimeout(350);
}

async function chooseJob(page) {
  await page.getByRole("button", { name: /CHOOSE THIS JOB/i }).click();
  await page.waitForSelector(".route-map-checkout, .pay-shell", { timeout: 15000 });
  await page.waitForTimeout(350);
}

async function completeCheckout(page) {
  const terms = page.locator('input[name="terms"]');
  await terms.check();
  const sandbox = page.getByRole("button", { name: /test payment|sandbox/i });
  if (await sandbox.count()) {
    await sandbox.first().click();
  } else {
    await page.locator('input[name="fullName"]').fill("Route Map Review");
    await page.locator('input[name="email"]').fill("review@thestudio.test");
    await page.locator('input[name="cardNumber"]').fill("4242 4242 4242 4242");
    await page.locator('input[name="expDate"]').fill("12 / 30");
    await page.locator('input[name="cvv"]').fill("123");
    await page.locator('input[name="zipCode"]').fill("30303");
    await page.getByRole("button", { name: /complete payment|pay/i }).click();
  }
  await page.waitForSelector(".route-map-intake", { timeout: 20000 });
  await page.waitForTimeout(400);
}

async function capture(page, filename, fullPage = true) {
  await page.screenshot({
    path: path.join(OUT_DIR, filename),
    fullPage,
  });
  console.log(`  ✓ ${filename}`);
}

async function assertNoGlobalSevenDayCopy(page) {
  const bodyText = await page.locator(".route-map-page").innerText();
  const lower = bodyText.toLowerCase();
  if (lower.includes("7 business days") || lower.includes("first concepts within 7")) {
    throw new Error("Route Map UI must not contain global 7-business-day language");
  }
  const goldBadge = page.locator(".route-map-job-card .route-map-badge");
  if ((await goldBadge.count()) > 0) {
    throw new Error("Job cards must not show the global 7 BUSINESS DAYS badge");
  }
}

async function assertLaneSelectorLayout(page, { desktop = false } = {}) {
  const i285Tile = page.locator(".route-map-lane-tile", { hasText: "Loop Route" });
  const perimeterTile = page.locator(".route-map-lane-tile", { hasText: "Perimeter Loop" });
  if ((await i285Tile.count()) > 0 || (await perimeterTile.count()) > 0) {
    throw new Error("I-285 must not appear as a selectable lane tile");
  }

  const selectableTiles = page.locator(".route-map-lane-tile");
  const tileCount = await selectableTiles.count();
  if (tileCount !== 4) {
    throw new Error(`Expected 4 selectable lane tiles, got ${tileCount}`);
  }

  const i285Control = page.locator(".route-map-highway__control--i285");
  if ((await i285Control.count()) > 0) {
    throw new Error("I-285 must not appear as a clickable highway control");
  }

  if (desktop) {
    const highway = page.locator(".route-map-highway");
    await highway.waitFor({ state: "visible" });
    const box = await highway.boundingBox();
    if (!box || box.width < 600) {
      throw new Error(`Highway map hero should be visually dominant on desktop (width=${box?.width ?? 0})`);
    }
  }
}

async function assertRoadViewLayout(page) {
  const loopBadges = page.locator(".route-map-stop__badge--loop");
  if ((await loopBadges.count()) > 0) {
    throw new Error("Loop stop badges must not appear on job tiles");
  }

  const routeStartInStops = page.locator(".route-map-stop", {
    hasText: "Help Me Figure Out What I Need",
  });
  if ((await routeStartInStops.count()) > 0) {
    throw new Error("Route Start must not appear as a numbered stop tile");
  }

  const routeStartOption = page.locator(".route-map-route-start");
  if ((await routeStartOption.count()) === 0) {
    throw new Error("Route Start must appear as a separate lane entrance option");
  }
}

async function captureDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await clearCampaign(page);
  await gotoRouteMap(page);
  await assertNoGlobalSevenDayCopy(page);
  await assertLaneSelectorLayout(page, { desktop: true });
  await capture(page, "01-desktop-lane-selector.png");

  await selectRoad(page, "Get My Business Started");
  await assertRoadViewLayout(page);
  await capture(page, "02-desktop-i75-road-view.png");

  await gotoRouteMap(page);
  await selectRoad(page, "Promote Something Now");
  await assertRoadViewLayout(page);
  await capture(page, "03-desktop-i20-road-view.png");

  await gotoRouteMap(page);
  await selectRoad(page, "Update What I Already Have");
  await assertRoadViewLayout(page);
  await capture(page, "04-desktop-update-interchange-road-view.png");

  await gotoRouteMap(page);
  await selectRoad(page, "I Know What I Need");
  await capture(page, "05-desktop-random-exit-job-shelf.png");

  await gotoRouteMap(page);
  await selectRoad(page, "Get My Business Started");
  await selectJobByName(page, "Set Up My Facebook");
  await assertNoGlobalSevenDayCopy(page);
  await capture(page, "06-desktop-social-setup-job-card.png");

  await gotoRouteMap(page);
  await selectRoad(page, "I Know What I Need");
  await selectJobByName(page, "Make Me a Page");
  await capture(page, "07-desktop-job-card.png");

  await chooseJob(page);
  await capture(page, "08-desktop-checkout-embedded.png");

  await completeCheckout(page);
  await capture(page, "09-desktop-intake-form.png");

  await context.close();
}

async function captureMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const page = await context.newPage();

  await clearCampaign(page);
  await gotoRouteMap(page);
  await assertNoGlobalSevenDayCopy(page);
  await assertLaneSelectorLayout(page);
  await capture(page, "10-mobile-lane-selector.png", false);

  await selectRoad(page, "Get My Business Started");
  await selectJobByName(page, "Set Up My Facebook");
  await assertNoGlobalSevenDayCopy(page);
  await capture(page, "11-mobile-social-setup-job-card.png", false);

  await context.close();
}

async function writeReadme() {
  const readme = `Route Map V1 — Screenshot URLs
================================
Base: ${BASE}/route-map

Desktop (1440×900)
------------------
01  Lane selector (map hero — 4 selectable lanes, I-285 perimeter only):  ${BASE}/route-map
02  I-75 road view:                 ${BASE}/route-map → Get My Business Started
03  I-20 road view:                 ${BASE}/route-map → Promote Something Now
04  Update interchange road view:   ${BASE}/route-map → Update What I Already Have
05  Random Exit / job shelf (7):    ${BASE}/route-map → I Know What I Need
06  Social setup job card (rm-j002): ${BASE}/route-map → I-75 → Set Up My Facebook…
07  Job card (page job):            ${BASE}/route-map → Random Exit → Make Me a Page…
08  Checkout (embedded):            step after CHOOSE THIS JOB
09  Intake form:                    step after payment

Mobile (390×844)
----------------
10  Front door lanes:              ${BASE}/route-map
11  Social setup job card:         ${BASE}/route-map → I-75 → Set Up My Facebook…

Notes
-----
- I-285 is visual perimeter on the map diagram — not a customer lane tile.
- Update Exit branches from the interchange ramp, not a fourth main highway.
- Route Start (rm-j001) is a separate lane entrance option — not Stop 1.
- No LOOP STOP badges on individual job tiles.

Capture: node scripts/capture-route-map-v1.mjs
`;
  await writeFile(path.join(OUT_DIR, "README.txt"), readme, "utf8");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  console.log("Capturing Route Map V1 screenshots…");
  await captureDesktop(browser);
  await captureMobile(browser);
  await browser.close();
  await writeReadme();
  console.log(`Done → ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
