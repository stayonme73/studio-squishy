/**
 * Capture rebuilt Studio Review menu and hard-reset lobby — requires dev server on localhost:3000.
 * Run: node scripts/capture-studio-review-menu.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/studio-review-rebuild");
const MENU_FILE = path.join(OUT_DIR, "menu.png");
const RESET_LOBBY_FILE = path.join(OUT_DIR, "after-hard-reset-lobby.png");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Studio Review" }).click();
  await page.waitForSelector(".owner-qa__panel", { timeout: 10000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: MENU_FILE, fullPage: false });
  console.log(MENU_FILE);

  await page.getByRole("button", { name: "Reset Campaign" }).click();
  await page.locator(".owner-qa__confirm-actions .owner-qa__action--danger").click();
  await page.waitForURL("**/studio-lobby**", { timeout: 10000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: RESET_LOBBY_FILE, fullPage: false });
  console.log(RESET_LOBBY_FILE);

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
