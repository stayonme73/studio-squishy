/**
 * Studio Board shared-chrome proof — phone + laptop.
 * Isolated. Does not remint Maya. No merge. No push.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(
  root,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);
mkdirSync(out, { recursive: true });

const BASE = process.argv[2] || "https://localhost:3000";

async function measure(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const title = document.querySelector(".utility-topbar__title, h1");
    const back = document.querySelector(".utility-topbar__back");
    const subnav = document.querySelector(".utility-subnav");
    const sidebar = document.querySelector(".sb-sidebar");
    const brand = document.querySelector(".sb-brand");
    const titleStyle = title ? getComputedStyle(title) : null;
    return {
      href: location.href,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowX: doc.scrollWidth > window.innerWidth + 1,
      title: title?.textContent?.trim() ?? null,
      titleFontSize: titleStyle?.fontSize ?? null,
      titleTransform: titleStyle?.textTransform ?? null,
      titleLetterSpacing: titleStyle?.letterSpacing ?? null,
      back: back?.textContent?.trim() ?? null,
      hasRoomNav: Boolean(subnav),
      roomNav: [...document.querySelectorAll(".utility-subnav__label")].map((el) =>
        el.textContent.trim(),
      ),
      sidebarVisible: Boolean(sidebar && getComputedStyle(sidebar).display !== "none"),
      brandVisible: Boolean(brand && getComputedStyle(brand).display !== "none"),
      snippet: document.body.innerText.replace(/\s+/g, " ").slice(0, 220),
    };
  });
}

async function capture(browser, name, width, height) {
  const page = await browser.newPage({
    viewport: { width, height },
    ignoreHTTPSErrors: true,
  });
  await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector(".sb, .utility-topbar__title, h1", { timeout: 20000 });
  await page.waitForTimeout(800);
  const facts = await measure(page);
  const shot = path.join(out, `${name}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  await page.close();
  return { ...facts, shot };
}

const browser = await chromium.launch({ headless: true });
try {
  const phone = await capture(browser, "board-shared-chrome-phone", 360, 740);
  const laptop = await capture(browser, "board-shared-chrome-laptop", 1280, 800);
  const report = {
    capturedAt: new Date().toISOString(),
    phone,
    laptop,
    pass:
      !phone.overflowX &&
      !laptop.overflowX &&
      phone.hasRoomNav &&
      laptop.hasRoomNav &&
      !phone.sidebarVisible &&
      !laptop.sidebarVisible &&
      phone.titleFontSize === "21.6px" &&
      phone.titleTransform === "none",
  };
  writeFileSync(
    path.join(out, "board-shared-chrome-facts.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (phone.overflowX || laptop.overflowX) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
