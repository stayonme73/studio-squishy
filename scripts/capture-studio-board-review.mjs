import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "docs", "review-captures");
mkdirSync(outDir, { recursive: true });

const url = process.env.STUDIO_BOARD_URL ?? "http://localhost:3000/studio-board";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForSelector(".sb", { timeout: 30_000 });
await page.waitForSelector(".sb-card--campaign", { state: "visible", timeout: 30_000 });
await page.waitForTimeout(1200);

await page.screenshot({
  path: join(outDir, "studio-board-full.png"),
  fullPage: false,
});

await page.locator(".sb-card--campaign").screenshot({
  path: join(outDir, "studio-board-campaign-tile.png"),
});

await page.locator(".sb-next__sticky").screenshot({
  path: join(outDir, "studio-board-philosophy-card.png"),
});

await browser.close();

console.log(`Saved review captures to ${outDir}`);
