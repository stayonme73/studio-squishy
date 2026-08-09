/**
 * Route Map V1 — map-first UX screenshots (desktop + mobile).
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
  await page.waitForSelector(".route-map-page--immersive", { timeout: 25000 });
  await page.waitForTimeout(400);
}

async function selectRoadDesktop(page, customerLabel) {
  const chooseCard = page.locator(".route-map-choose-card", { hasText: customerLabel });
  const hotspot = page.locator(".route-map-board__hotspot", {
    has: page.locator(`[aria-label*="${customerLabel}"]`),
  });

  if (await chooseCard.count()) {
    await chooseCard.first().click();
  } else if (await hotspot.count()) {
    await hotspot.first().click();
  } else {
    const i75 = page.locator(".route-map-board__hotspot--i75");
    const random = page.locator(".route-map-board__hotspot--random");
    if (customerLabel.includes("Business")) await i75.click();
    else if (customerLabel.includes("Know What")) await random.click();
    else throw new Error(`Could not find road selector for "${customerLabel}"`);
  }

  await page.waitForSelector(".route-map-route-panel", { timeout: 25000 });
  await page.waitForTimeout(350);
}

async function selectRoadMobile(page, customerLabel) {
  const hotspot = page.locator(".route-map-mobile-scene .route-map-board__hotspot", {
    has: page.locator(`[aria-label*="${customerLabel}"]`),
  });

  if (await hotspot.count()) {
    await hotspot.first().click({ force: true });
  } else {
    await page.getByRole("button", { name: "Choose Your Route" }).click();
    await page.waitForTimeout(300);
    const card = page.locator(".route-map-mobile-scene__sheet .route-map-choose-card", {
      hasText: customerLabel,
    }).first();
    await card.click();
  }

  await page.waitForSelector(".route-map-route-panel", { timeout: 25000 });
  await page.waitForTimeout(350);
}

async function selectJobByName(page, jobName) {
  await page.getByRole("button", { name: new RegExp(jobName, "i") }).click();
  await page.waitForSelector(".route-map-job-card", { timeout: 15000 });
  await page.waitForTimeout(350);
}

async function capture(page, filename, fullPage = true) {
  await page.screenshot({
    path: path.join(OUT_DIR, filename),
    fullPage,
  });
  console.log(`  ✓ ${filename}`);
}

async function assertNoUtilityHeader(page) {
  const header = page.locator(".utility-header");
  if ((await header.count()) > 0) {
    throw new Error("Route Map must not show utility header / journey band chrome");
  }
}

async function assertLobbyBackdrop(page) {
  const backdrop = page.locator(".route-map-lobby-backdrop");
  if ((await backdrop.count()) === 0) {
    throw new Error("Route Map must show Studio Lobby backdrop");
  }
}

async function assertNoJobPinsOnMap(page) {
  const pins = page.locator(".route-map-map-pin");
  if ((await pins.count()) > 0) {
    throw new Error("Map must not show scattered job pins on highways");
  }
}

async function assertRoutePanelLayout(page) {
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
  await assertNoUtilityHeader(page);
  await assertLobbyBackdrop(page);
  await assertNoJobPinsOnMap(page);
  await capture(page, "01-desktop-full-map.png");

  const hideRoutes = page.getByRole("button", { name: /hide routes/i });
  if (await hideRoutes.count()) {
    try {
      await hideRoutes.click({ force: true });
      await page.waitForTimeout(400);
      await capture(page, "01-desktop-map-panel-collapsed.png");
    } catch {
      // optional — collapse control may sit outside viewport on some layouts
    }
    await gotoRouteMap(page);
  }

  await selectRoadDesktop(page, "Get My Business Started");
  await assertRoutePanelLayout(page);
  await capture(page, "02-desktop-route-panel-i75.png");

  await gotoRouteMap(page);
  await selectRoadDesktop(page, "Get My Business Started");
  await selectJobByName(page, "Make Me a Social Profile Setup Kit");
  await capture(page, "03-desktop-job-card-over-map.png");

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
  await assertNoUtilityHeader(page);
  await assertLobbyBackdrop(page);
  await assertNoJobPinsOnMap(page);
  await capture(page, "04-mobile-map-entrance.png", false);

  await page.getByRole("button", { name: "Choose Your Route" }).click();
  await page.waitForTimeout(350);
  await capture(page, "04b-mobile-choose-sheet.png", false);
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(200);

  await selectRoadMobile(page, "Get My Business Started");
  await assertRoutePanelLayout(page);
  await capture(page, "05-mobile-route-panel.png", false);

  await context.close();
}

async function writeReadme() {
  const readme = `Route Map V1 — Map-first screenshots
====================================
Base: ${BASE}/route-map

Desktop (1440×900)
------------------
01  Full-screen map (no job pins):     ${BASE}/route-map
02  Route panel slid up (I-75):        ${BASE}/route-map → Get My Business Started
03  Job detail card over map:          ${BASE}/route-map → I-75 → Make Me a Social Profile Setup Kit…

Mobile (390×844)
----------------
04  Map entrance (vertical routes):    ${BASE}/route-map
05  Route panel slid up:               ${BASE}/route-map → Get My Business Started

Notes
-----
- Map stays visible behind bottom-sheet panels.
- I-285 is visual perimeter only — not selectable.
- Route Start (rm-j001) is separate from numbered stops.
- Jobs/prices come from catalog rm-j001–rm-j008.

Capture: node scripts/capture-route-map-v1.mjs
`;
  await writeFile(path.join(OUT_DIR, "README.txt"), readme, "utf8");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  console.log("Capturing Route Map V1 map-first screenshots…");
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
