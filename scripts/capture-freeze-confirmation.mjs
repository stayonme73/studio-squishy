import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(
  root,
  "docs/launch/studio-operating-visual-system-freeze-1/owner-proof",
);
mkdirSync(out, { recursive: true });

const screens = [
  { id: "lobby", url: "https://localhost:3000/", wait: "main, .studio-lobby, [data-studio-lobby], h1" },
  { id: "conversation", url: "https://localhost:3000/studio-conversation-room", wait: "main, [data-studio-surface], h1" },
  { id: "payment", url: "https://localhost:3000/local-test-fixtures?inspect=payment", wait: ".pay-paper-card, .co-card, h1" },
  { id: "intake", url: "https://localhost:3000/local-test-fixtures?inspect=intake", wait: ".route-map-social-intake, [class*='intake'], h1" },
  { id: "board", url: "https://localhost:3000/studio-board", wait: ".sb, .sb-sidebar, .sb-main" },
  { id: "record", url: "https://localhost:3000/campaign-details", wait: ".cd-grid, .utility-page, h1" },
  { id: "review", url: "https://localhost:3000/feedback-studio", wait: ".fs-page, .rd-shell, .fs-room, h1" },
  { id: "help", url: "https://localhost:3000/help-center", wait: ".help-center, .hc-card, h1" },
  { id: "delivery", url: "https://localhost:3000/deliverables", wait: ".fd-hero, .fd-summary, [class*='fd-']" },
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
    await page.waitForSelector(screen.wait, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1600);
    const dest = path.join(out, `freeze-confirm-${screen.id}-${vp.id}.jpg`);
    await page.screenshot({ path: dest, type: "jpeg", quality: 78 });
    process.stdout.write(`${screen.id} ${vp.id} wrote\n`);
  }
}

await browser.close();
