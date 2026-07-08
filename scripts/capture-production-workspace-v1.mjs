/**
 * Capture Production Workspace V1 screenshots.
 * Usage: node scripts/capture-production-workspace-v1.mjs
 * Requires dev server at localhost:3000 and seed data.
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp", "production-workspace-v1");
const CAMPAIGN_ID = "production-workspace-v1";
const JOB_ID = encodeURIComponent(`${CAMPAIGN_ID}:sm-001`);

const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "tagia@local.dev", password: "dev-only" }),
});
if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
const setCookie = loginRes.headers.get("set-cookie") ?? "";
const match = setCookie.match(/studio_session=([^;]+)/);
if (!match) throw new Error("No session cookie");

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addCookies([
  {
    name: "studio_session",
    value: match[1],
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  },
]);
const page = await context.newPage();

await page.goto(`${BASE}/file-room/owner-console`, { waitUntil: "networkidle" });
await page.locator(".fr-control-room").scrollIntoViewIfNeeded();
await page.screenshot({
  path: path.join(OUT_DIR, "01-owner-console-approval-desk.png"),
  fullPage: true,
});

await page.goto(`${BASE}/file-room/${CAMPAIGN_ID}/production/${JOB_ID}`, {
  waitUntil: "networkidle",
});
await page.locator(".fr-production-workspace").waitFor({ state: "visible" });
await page.screenshot({
  path: path.join(OUT_DIR, "02-production-workspace-approval-pending.png"),
  fullPage: true,
});

const approveBtn = page.getByRole("button", { name: /Send to Review Room/i });
if (await approveBtn.isVisible()) {
  await approveBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(OUT_DIR, "03-ready-for-review-spine.png"),
    fullPage: true,
  });
}

await browser.close();
console.log(`Screenshots saved to ${OUT_DIR}`);
