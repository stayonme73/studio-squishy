/**
 * Capture the Long video tile inside the live #our-work carousel.
 * Does not reopen the 8-sample family. Does not change other tiles.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLATE = path.join(
  ROOT,
  "docs/launch/studio-homepage-what-we-create-sample-set-1/OWNER-CONSOLE-RETURN/samples/long-to-short.jpg",
);
const OUT_DIR = path.join(
  ROOT,
  "docs/launch/studio-homepage-what-we-create-sample-set-1/OWNER-CONSOLE-RETURN/homepage-previews",
);
const OUT_JPG = path.join(OUT_DIR, "long-to-short-carousel.jpg");
const PROOF = path.join(
  ROOT,
  "docs/launch/studio-homepage-what-we-create-sample-set-1/OWNER-CONSOLE-RETURN/LONG-TO-SHORT-TILE-CROP-PROOF.json",
);
const LOCKED_PLATE_SHA = "375634382C188C80BEC18377DE687BBEBD508C1985F2512EB72E596EB2CFC36D";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
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
  const section = document.querySelector("#our-work");
  const tiles = [...document.querySelectorAll("#our-work .studio-homepage__tile")];
  const first = tiles[0];
  const art = first?.querySelector(".studio-homepage__tile-art");
  const img = first?.querySelector(".studio-homepage__tile-preview");
  const others = tiles.slice(1).map((tile) => ({
    label: tile.querySelector("p")?.textContent?.trim() || "",
    hasPreview: Boolean(tile.querySelector(".studio-homepage__tile-preview")),
  }));
  return {
    sectionId: section?.id || "",
    firstLabel: first?.querySelector("p")?.textContent?.trim() || "",
    previewSrc: img?.getAttribute("src") || "",
    artWidth: art ? Math.round(art.getBoundingClientRect().width) : 0,
    artHeight: art ? Math.round(art.getBoundingClientRect().height) : 0,
    otherTilesHavePreview: others.some((tile) => tile.hasPreview),
    otherTiles: others,
  };
});

const tile = page.locator("#our-work .studio-homepage__tile").first();
mkdirSync(OUT_DIR, { recursive: true });
await tile.screenshot({ path: OUT_JPG, type: "jpeg", quality: 90 });
await browser.close();

const plateSha = createHash("sha256").update(readFileSync(PLATE)).digest("hex").toUpperCase();
if (plateSha !== LOCKED_PLATE_SHA) {
  throw new Error(`Approved plate SHA changed: ${plateSha}`);
}
if (facts.firstLabel !== "Long video to short clips") {
  throw new Error(`First tile is not Long video: ${facts.firstLabel}`);
}
if (!facts.previewSrc.includes("long-to-short-tile.jpg")) {
  throw new Error(`Unexpected preview src: ${facts.previewSrc}`);
}
if (facts.otherTilesHavePreview) {
  throw new Error("Other tiles were changed.");
}

const proof = existsSync(PROOF) ? JSON.parse(readFileSync(PROOF, "utf8")) : {};
writeFileSync(
  PROOF,
  `${JSON.stringify(
    {
      ...proof,
      approvedPlateSha256: plateSha,
      approvedPlateAltered: false,
      otherTilesChanged: false,
      page1LayoutChanged: false,
      carouselScreenshot: "docs/launch/studio-homepage-what-we-create-sample-set-1/OWNER-CONSOLE-RETURN/homepage-previews/long-to-short-carousel.jpg",
      carouselFacts: facts,
      capturedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
  "utf8",
);

process.stdout.write(`${JSON.stringify({ out: OUT_JPG, facts, plateSha }, null, 2)}\n`);
