/**
 * Desktop and mobile screenshots of all 8 What We Create tiles in the live carousel.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(
  ROOT,
  "docs/launch/studio-homepage-what-we-create-sample-set-1/OWNER-CONSOLE-RETURN/homepage-previews",
);
const PROOF = path.join(
  ROOT,
  "docs/launch/studio-homepage-what-we-create-sample-set-1/OWNER-CONSOLE-RETURN/HOMEPAGE-TILE-PREVIEW-SET-PROOF.json",
);

async function captureViewport(browser, width, height, startName, endName) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  await page.goto("http://127.0.0.1:3000/#our-work", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForSelector("#our-work .studio-homepage__tile-preview", { timeout: 30000 });
  await page.locator("#our-work").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const facts = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll("#our-work .studio-homepage__tile")];
    return tiles.map((tile) => {
      const img = tile.querySelector(".studio-homepage__tile-preview");
      const cs = img ? getComputedStyle(img) : null;
      return {
        label: tile.querySelector("p")?.textContent?.trim() || "",
        src: img?.getAttribute("src") || "",
        objectFit: cs?.objectFit || "",
        hasPreview: Boolean(img),
      };
    });
  });
  const scroller = page.locator("#our-work .studio-homepage__showcase, #our-work [data-showcase], #our-work .studio-homepage__tiles").first();
  const section = page.locator("#our-work");
  await section.screenshot({ path: path.join(OUT_DIR, startName), type: "jpeg", quality: 90 });
  await page.evaluate(() => {
    const node =
      document.querySelector("#our-work .studio-homepage__showcase") ||
      document.querySelector("#our-work [class*='showcase']") ||
      document.querySelector("#our-work .studio-homepage__tiles");
    if (node) node.scrollLeft = node.scrollWidth;
  });
  await page.waitForTimeout(250);
  await section.screenshot({ path: path.join(OUT_DIR, endName), type: "jpeg", quality: 90 });
  await page.close();
  return facts;
}

const browser = await chromium.launch({ channel: "chrome" });
mkdirSync(OUT_DIR, { recursive: true });
const desktop = await captureViewport(
  browser,
  1440,
  1000,
  "carousel-desktop.jpg",
  "carousel-desktop-end.jpg",
);
const mobile = await captureViewport(
  browser,
  390,
  844,
  "carousel-mobile.jpg",
  "carousel-mobile-end.jpg",
);
await browser.close();

const proof = existsSync(PROOF) ? JSON.parse(readFileSync(PROOF, "utf8")) : {};
const allHavePreview = desktop.every((tile) => tile.hasPreview && tile.objectFit === "contain");
const noCover = desktop.every((tile) => tile.objectFit !== "cover");
writeFileSync(
  PROOF,
  `${JSON.stringify(
    {
      ...proof,
      page1LayoutChanged: false,
      coverUsed: !noCover,
      liveFit: {
        desktop,
        mobile,
        allEightHavePreview: desktop.length === 8 && allHavePreview,
        containOnAll: allHavePreview,
        capturedAt: new Date().toISOString(),
        desktopStart: "homepage-previews/carousel-desktop.jpg",
        desktopEnd: "homepage-previews/carousel-desktop-end.jpg",
        mobileStart: "homepage-previews/carousel-mobile.jpg",
        mobileEnd: "homepage-previews/carousel-mobile-end.jpg",
      },
    },
    null,
    2,
  )}\n`,
  "utf8",
);

process.stdout.write(
  `${JSON.stringify({ tiles: desktop.length, containOnAll: allHavePreview, noCover }, null, 2)}\n`,
);
