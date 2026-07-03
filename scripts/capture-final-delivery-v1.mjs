/**
 * Capture Final Delivery V1 screenshots.
 * Usage: node scripts/seed-final-delivery-v1.mjs && node scripts/capture-final-delivery-v1.mjs
 * Requires dev server at localhost:3000.
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp", "final-delivery-v1");
const CAMPAIGN_ID = "final-delivery-v1";
const JOB_ID = encodeURIComponent(`${CAMPAIGN_ID}:sm-001`);

async function login(email, password) {
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) throw new Error(`Login failed for ${email}: ${loginRes.status}`);
  const setCookie = loginRes.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/studio_session=([^;]+)/);
  if (!match) throw new Error("No session cookie");
  return match[1];
}

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();

const ownerCookie = await login("tagia@local.dev", "dev-only");
const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ownerContext.addCookies([
  {
    name: "studio_session",
    value: ownerCookie,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  },
]);
const ownerPage = await ownerContext.newPage();

await ownerPage.goto(`${BASE}/file-room/owner-console`, { waitUntil: "networkidle" });
await ownerPage.locator(".fr-control-room-desk").waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
await ownerPage.screenshot({
  path: path.join(OUT_DIR, "01-owner-desk-final-release-needed.png"),
  fullPage: true,
});

await ownerPage.goto(`${BASE}/file-room/${CAMPAIGN_ID}/production/${JOB_ID}`, {
  waitUntil: "networkidle",
});
await ownerPage.screenshot({
  path: path.join(OUT_DIR, "02-production-workspace-before-release.png"),
  fullPage: true,
});

const releaseBtn = ownerPage.getByRole("button", { name: /Approve final release/i });
if (await releaseBtn.isVisible()) {
  await releaseBtn.click();
  await ownerPage.waitForTimeout(1500);
  await ownerPage.screenshot({
    path: path.join(OUT_DIR, "03-ready-for-delivery.png"),
    fullPage: true,
  });
}

for (const [index, row] of ["deliverable-0", "deliverable-1", "deliverable-2"].entries()) {
  const select = ownerPage.locator("select").first();
  await select.selectOption(row);
  await ownerPage.getByPlaceholder(/File name/i).fill(`deliverable-${index + 1}.zip`);
  await ownerPage.getByPlaceholder(/Type/i).fill("ZIP");
  await ownerPage.getByPlaceholder(/Download URL/i).fill(`https://files.example/${row}.zip`);
  await ownerPage.getByRole("button", { name: /Add client file/i }).click();
  await ownerPage.waitForTimeout(800);
}

await ownerPage.screenshot({
  path: path.join(OUT_DIR, "04-client-delivery-files-added.png"),
  fullPage: true,
});

const deliverBtn = ownerPage.getByRole("button", { name: /Mark delivered to client/i });
if (await deliverBtn.isVisible()) {
  await deliverBtn.click();
  await ownerPage.waitForTimeout(1500);
  await ownerPage.screenshot({
    path: path.join(OUT_DIR, "05-mark-delivered.png"),
    fullPage: true,
  });
}

await ownerContext.close();

const clientCookie = await login("client@local.dev", "dev-only");
const clientContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await clientContext.addCookies([
  {
    name: "studio_session",
    value: clientCookie,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  },
]);
const clientPage = await clientContext.newPage();
await clientPage.goto(`${BASE}/deliverables`, { waitUntil: "networkidle" });
await clientPage.screenshot({
  path: path.join(OUT_DIR, "06-client-final-delivery.png"),
  fullPage: true,
});

await clientContext.close();
await browser.close();
console.log(`Screenshots saved to ${OUT_DIR}`);
