import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "docs", "review-captures");
mkdirSync(outDir, { recursive: true });

const url =
  process.env.TEXTURE_EXPLORATION_URL ?? "http://localhost:3002/studio-board/textures";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForSelector(".btx-grid", { timeout: 30_000 });
await page.waitForTimeout(800);

await page.screenshot({
  path: join(outDir, "texture-exploration-full.png"),
  fullPage: true,
});

const columns = page.locator(".btx-col");
for (let index = 0; index < 3; index += 1) {
  const label = ["a", "b", "c"][index];
  await columns.nth(index).screenshot({
    path: join(outDir, `texture-exploration-${label}.png`),
  });
}

await browser.close();

console.log(`Saved texture exploration captures to ${outDir}`);
