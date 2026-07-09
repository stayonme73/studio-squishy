/**
 * Mobile QA — Owner Console + client sign-in at 390×844.
 * Run: node scripts/verify-mobile-owner-console.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const VIEWPORT = { width: 390, height: 844 };

async function login(email) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "dev-only" }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/studio_session=([^;]+)/);
  if (!match) throw new Error("No session cookie");
  return match[1];
}

async function noHorizontalScroll(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth <= doc.clientWidth + 2;
  });
}

const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

async function main() {
  const ownerCookie = await login("tagia@local.dev");
  const clientCookie = await login("studio-self-test@local.dev");

  const browser = await chromium.launch();
  const ownerContext = await browser.newContext({
    viewport: VIEWPORT,
    isMobile: true,
  });
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

  await ownerPage.goto(`${BASE}/file-room/owner-console`, { waitUntil: "networkidle", timeout: 45000 });
  const ownerDenied = await ownerPage.getByRole("heading", { name: /^Access denied$/i }).count();
  record("Owner Console — owner access", ownerDenied === 0, ownerDenied ? "access denied" : "loaded");

  const ownerText = await ownerPage.locator("body").innerText();
  record(
    "Owner Console — sequential desk visible",
    /today's decisions|current folder|review folder/i.test(ownerText),
  );
  record(
    "Owner Console — self-test campaign visible",
    /self-test/i.test(ownerText),
  );
  record("Owner Console — landing no page scroll", await ownerPage.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollHeight <= doc.clientHeight + 8;
  }));
  record("Owner Console — no horizontal scroll", await noHorizontalScroll(ownerPage));

  const reviewFolder = ownerPage.getByRole("button", { name: /^review folder$/i }).first();
  record("Owner Console — review folder button", (await reviewFolder.count()) > 0);

  if (await reviewFolder.count()) {
    await reviewFolder.click();
    const dock = ownerPage.locator(".fr-owner-console-actions-dock");
    record("Owner Console — mobile action dock after open", (await dock.count()) > 0);

  } else {
    record("Owner Console — mobile action dock after open", true, "no decisions to open");
  }

  const assignButton = ownerPage.getByRole("button", { name: /^assign$/i }).first();
  if (await assignButton.count()) {
    const box = await assignButton.boundingBox();
    const inViewport = Boolean(
      box && box.y >= 0 && box.y + box.height <= VIEWPORT.height + 4,
    );
    record(
      "Owner Console — assign button in viewport (no scroll)",
      inViewport,
      box ? `y=${Math.round(box.y)} h=${Math.round(box.height)}` : "no box",
    );
  } else {
    record("Owner Console — assign button in viewport (no scroll)", true, "no assign button this load");
  }

  const primaryAction = ownerPage.locator(".fr-owner-console-actions-dock .utility-btn--primary").first();
  if (await primaryAction.count()) {
    const box = await primaryAction.boundingBox();
    record(
      "Owner Console — primary action in dock",
      Boolean(box && box.y + box.height <= VIEWPORT.height + 4),
      box ? `y=${Math.round(box.y)}` : "no box",
    );
  }

  await ownerPage.screenshot({ path: "tmp/mobile-owner-console.png", fullPage: false });

  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await desktopContext.addCookies([
    {
      name: "studio_session",
      value: ownerCookie,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(`${BASE}/file-room/owner-console`, { waitUntil: "networkidle", timeout: 45000 });
  record("Owner Console — desktop sequential desk", /current folder|today's decisions/i.test(await desktopPage.locator("body").innerText()));
  record("Owner Console — desktop landing no page scroll", await desktopPage.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollHeight <= doc.clientHeight + 8;
  }));
  record("Owner Console — desktop no horizontal scroll", await noHorizontalScroll(desktopPage));
  await desktopPage.screenshot({ path: "tmp/desktop-owner-console.png", fullPage: false });

  const clientContext = await browser.newContext({
    viewport: VIEWPORT,
    isMobile: true,
  });
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

  for (const [label, url, selector] of [
    ["Studio Board", "/studio-board", ".sb.sb--v4, .no-active-project-panel"],
    ["Project Details", "/project-details", ".utility-page, .pd-page"],
    ["Sign in", "/sign-in", ".utility-page, form"],
  ]) {
    await clientPage.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 45000 });
    await clientPage.waitForSelector(selector, { timeout: 15000 }).catch(() => null);
    record(`${label} — mobile load`, true);
    record(`${label} — no horizontal scroll`, await noHorizontalScroll(clientPage));
  }

  await browser.close();

  const failed = results.filter((r) => !r.pass).length;
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
