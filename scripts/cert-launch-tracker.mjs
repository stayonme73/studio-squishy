/**
 * Temporary Launch Tracker — access + layout certification (Playwright).
 * Evidence → test-artifacts/launch-tracker/
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.CERT_BASE_URL || "http://localhost:3000";
const OUT = join(process.cwd(), "test-artifacts", "launch-tracker");
const ROUTE = "/file-room/launch-tracker";

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const CLIENT_LOGIN = { email: "client@local.dev", password: "dev-only" };

mkdirSync(OUT, { recursive: true });
const results = [];

function push(check, ok, extra = {}) {
  results.push({ check, ok, ...extra });
  console.log(`${ok ? "PASS" : "FAIL"}  ${check}${extra.detail ? ` — ${extra.detail}` : ""}`);
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/studio_session=([^;]+)/);
  if (!match) throw new Error(`No session cookie for ${email}`);
  return match[1];
}

async function withCookie(browser, cookie, viewport, fn) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: "reduce",
  });
  if (cookie) {
    await context.addCookies([
      {
        name: "studio_session",
        value: cookie,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  }
  const page = await context.newPage();
  try {
    await fn(page);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  // Signed-out
  await withCookie(browser, null, { width: 1280, height: 800 }, async (page) => {
    await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle" });
    const url = page.url();
    const denied =
      url.includes("/sign-in") ||
      url.includes("/access-denied") ||
      (await page.locator("text=Launch Tracker").count()) === 0;
    push("signed-out denied or redirected", denied, { detail: url });
    await page.screenshot({ path: join(OUT, "signed-out.png") });
  });

  // Customer
  const clientCookie = await login(CLIENT_LOGIN.email, CLIENT_LOGIN.password);
  await withCookie(browser, clientCookie, { width: 1280, height: 800 }, async (page) => {
    await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle" });
    const url = page.url();
    const titleCount = await page.locator("h1.lt-header__title", { hasText: "Launch Tracker" }).count();
    const denied =
      url.includes("/sign-in") ||
      url.includes("/access-denied") ||
      titleCount === 0;
    push("customer denied", denied && titleCount === 0, { detail: url });
    await page.screenshot({ path: join(OUT, "customer-denied.png") });
  });

  // Owner — desktop
  const ownerCookie = await login(OWNER_LOGIN.email, OWNER_LOGIN.password);
  await withCookie(browser, ownerCookie, { width: 1440, height: 900 }, async (page) => {
    await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle" });
    await page.waitForSelector("h1.lt-header__title", { timeout: 15000 });
    push("owner can open Launch Tracker", (await page.locator("h1.lt-header__title").innerText()).trim() === "Launch Tracker");
    push("temporary label visible", (await page.locator("[data-lt-temp-label]").count()) === 1);
    const body = await page.locator(".lt-doc").innerText();
    push("Master Launch List content renders", /Launch Goal|CURRENTLY IN PROGRESS/i.test(body));
    push("completed crossed-out items display", (await page.locator(".lt-doc del").count()) > 0);
    push("current active item visible", (await page.locator(".lt-heading--active").count()) > 0);
    push("Tagia Notes visible", /Tagia Notes/i.test(body));
    push("Scout Notes visible", /Scout Notes/i.test(body));
    push("Decisions Needed visible", /Decisions Needed/i.test(body));
    push("Blocker Notes visible", /Blocker Notes/i.test(body));
    push("Daily Progress Notes visible", /Daily Progress Notes/i.test(body));
    push("Visual Quality Queue appears", /Visual Quality Queue/i.test(body));
    push("Parking Lot appears", /Parking Lot/i.test(body));
    const pageText = await page.locator("body").innerText();
    push(
      "no internal absolute Windows path exposed",
      !/C:\\Users\\/i.test(pageText) && !/C:\\\\Users\\\\/i.test(pageText),
      { detail: /C:\\Users\\/i.test(pageText) ? "path found" : "redacted" },
    );
    // Customer nav check: UtilityNav should not be the primary entry; File Room header may show link for owner only
    await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle" });
    const boardText = await page.locator("body").innerText();
    push("customer Studio Board does not expose Launch Tracker", !/Launch Tracker/i.test(boardText));
    await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: join(OUT, "desktop-owner.png"), fullPage: true });
  });

  // Owner — phone + 360
  await withCookie(browser, ownerCookie, { width: 390, height: 844 }, async (page) => {
    await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle" });
    await page.waitForSelector("h1.lt-header__title", { timeout: 15000 });
    push("phone renders Launch Tracker", (await page.locator("h1.lt-header__title").count()) === 1);
    await page.screenshot({ path: join(OUT, "phone-owner.png"), fullPage: true });

    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(200);
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    push(
      "360px no horizontal overflow",
      overflow.scrollWidth <= overflow.clientWidth + 1,
      { detail: `${overflow.scrollWidth} vs ${overflow.clientWidth}` },
    );
    await page.screenshot({ path: join(OUT, "phone-360.png"), fullPage: true });
  });
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
const report = {
  package: "Temporary Launch Tracker",
  status: failed.length === 0 ? "passed" : "failed",
  route: ROUTE,
  base: BASE,
  generatedAt: new Date().toISOString(),
  pass: results.filter((r) => r.ok).length,
  fail: failed.length,
  results,
};
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(`\n${report.pass} pass / ${report.fail} fail → ${join(OUT, "report.json")}`);
if (failed.length > 0) process.exit(1);
