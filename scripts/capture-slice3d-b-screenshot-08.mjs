/** Capture screenshot 08 only — run after main capture script */
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "scripts", "screenshots", "slice3d-b");
const campaignId = process.argv[2];
const CLIENT = { email: "client@local.dev", password: "dev-only" };

if (!campaignId) {
  console.error("Usage: node scripts/capture-slice3d-b-screenshot-08.mjs <campaignId>");
  process.exit(1);
}

async function browserLogin(page, credentials) {
  await page.goto(`${BASE}/file-room`, { waitUntil: "domcontentloaded" });
  await page.evaluate(async (creds) => {
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds),
    });
  }, credentials);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await browserLogin(page, CLIENT);
await page.goto(`${BASE}/file-room/${campaignId}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
if (await page.locator("#file-room-exceptions").count()) {
  throw new Error("Client must not see Exceptions section");
}
const file = path.join(OUT_DIR, "08-client-file-room-forbidden.png");
await page.screenshot({ path: file, fullPage: true });
console.log(`saved ${file}`);
await browser.close();
