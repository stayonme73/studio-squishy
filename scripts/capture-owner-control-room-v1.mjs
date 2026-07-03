import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT = "tmp/owner-control-room-v1";

const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "tagia@local.dev", password: "dev-only" }),
});
if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
const setCookie = loginRes.headers.get("set-cookie") ?? "";
const match = setCookie.match(/studio_session=([^;]+)/);
if (!match) throw new Error("No session cookie");

await mkdir(OUT, { recursive: true });
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
await page.screenshot({ path: `${OUT}/05-owner-control-room-section.png` });
await page.locator(".fr-control-room-desk").screenshot({ path: `${OUT}/06-owner-desk.png` });
const waiting = page.locator(".fr-control-room-waiting");
if ((await waiting.count()) > 0) {
  await waiting.screenshot({ path: `${OUT}/04-waiting-on-client-tray.png` });
}
await page.locator(".fr-control-room-activity").screenshot({ path: `${OUT}/07-activity-timeline.png` });
await browser.close();
console.log(`Screenshots updated in ${OUT}/`);
