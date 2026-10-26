import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(
  root,
  "docs/launch/studio-operating-visual-system-freeze-1/owner-proof",
);

const screens = [
  { id: "board", url: "https://localhost:3000/studio-board", wait: ".sb-card__tab" },
  { id: "record", url: "https://localhost:3000/campaign-details", wait: ".cd-grid, .cd-overview, .utility-title" },
  { id: "review", url: "https://localhost:3000/feedback-studio", wait: ".fs-page, .rd-shell, .fs-room" },
];

const viewports = [
  { id: "mobile", width: 390, height: 844 },
  { id: "laptop", width: 1280, height: 800 },
];

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();
const auth = await page.request.post("https://localhost:3000/api/auth/local-customer-one");
process.stdout.write(`auth=${auth.status()}\n`);

for (const screen of screens) {
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(screen.url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return !/Loading your project/i.test(text) && text.replace(/\s+/g, " ").length > 80;
    }, { timeout: 25000 }).catch(() => {});
    await page.waitForSelector(screen.wait, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2200);
    const dest = path.join(out, `freeze-confirm-${screen.id}-${vp.id}.jpg`);
    await page.screenshot({ path: dest, type: "jpeg", quality: 78 });
    const title = await page.evaluate(() => document.body.innerText.slice(0, 80));
    process.stdout.write(`${screen.id} ${vp.id} ${JSON.stringify(title)}\n`);
  }
}

await browser.close();
