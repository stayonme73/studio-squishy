/**
 * Focused contrast + Studio Review production exposure checks.
 * Usage: STUDIO_BASE_URL=http://127.0.0.1:3475 node scripts/focused-chatgpt-qa-verification.mjs
 * Production: STUDIO_BASE_URL=http://127.0.0.1:3476 NODE_ENV=production node scripts/focused-chatgpt-qa-verification.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.STUDIO_BASE_URL ?? "http://127.0.0.1:3475";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1",
  "focused-chatgpt-qa-verification-2026-10-24",
);

function relLuminance([r, g, b]) {
  const s = [r, g, b].map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
}

function contrastRatio(fg, bg) {
  const L1 = relLuminance(fg);
  const L2 = relLuminance(bg);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

async function sampleContrast(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false };
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const cx = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1);
    const cy = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1);
    const under = document.elementFromPoint(cx, cy);
    const fg = style.color;
    let bgEl = under;
    let bg = "transparent";
    for (let i = 0; i < 8 && bgEl; i++) {
      const bs = getComputedStyle(bgEl);
      const bc = bs.backgroundColor;
      if (bc && bc !== "rgba(0, 0, 0, 0)" && bc !== "transparent") {
        bg = bc;
        break;
      }
      bgEl = bgEl.parentElement;
    }
    function parseRgb(s) {
      const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return [255, 255, 255];
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    }
    return {
      found: true,
      text: el.textContent?.trim().slice(0, 80),
      fg,
      bgSampled: bg,
      textShadow: style.textShadow,
      fontSize: style.fontSize,
      fgRgb: parseRgb(fg),
      bgRgb: parseRgb(bg),
      rect: { top: rect.top, h: rect.height },
    };
  }, selector);
}

async function studioReviewProbe(page, route) {
  await page.goto(`${BASE}${route}?studioReview=1`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  return page.evaluate(() => {
    const tab = document.querySelector("[data-studio-review-mobile-tab]");
    const panel = document.querySelector(".owner-qa__panel");
    const journey = document.querySelector(".owner-qa-studio-system, [class*='OwnerQa']");
    const devReset = [...document.querySelectorAll("button, a")].some((n) =>
      /reset campaign|device preview|customer journey/i.test(n.textContent ?? ""),
    );
    return {
      tabPresent: Boolean(tab && tab.offsetParent !== null),
      tabText: tab?.textContent?.trim() ?? null,
      panelOpen: Boolean(panel),
      devJourneyChrome: devReset,
      ownerQaActionCount: document.querySelectorAll(".owner-qa__action").length,
    };
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = {
    base: BASE,
    at: new Date().toISOString(),
    nodeEnvNote: process.env.NODE_ENV ?? "unset (dev server typical)",
    viewports: [],
    studioReview: [],
    contrast: [],
  };

  for (const vp of [
    { name: "mobile", width: 390, height: 844 },
    { name: "desktop", width: 1280, height: 800 },
  ]) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    await page.goto(`${BASE}/help-center`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".utility-page--help-center", { timeout: 45000 });
    const hcBack = await sampleContrast(page, "a.utility-topbar__back");
    const hcTitle = await sampleContrast(page, ".utility-topbar__title");
    if (hcBack.found) {
      hcBack.contrastRatio = contrastRatio(hcBack.fgRgb, hcBack.bgRgb);
      hcBack.wcagAANormal = hcBack.contrastRatio >= 4.5;
    }
    if (hcTitle.found) {
      hcTitle.contrastRatio = contrastRatio(hcTitle.fgRgb, hcTitle.bgRgb);
      hcTitle.wcagAANormal = hcTitle.contrastRatio >= 4.5;
    }
    await page.screenshot({
      path: path.join(OUT, `help-center-header-${vp.name}.png`),
      clip: { x: 0, y: 0, width: vp.width, height: Math.min(220, vp.height) },
    });

    const signIn = await context.request.post(`${BASE}/api/auth/local-customer-one`, { data: {} });
    if (!signIn.ok()) {
      throw new Error(`Customer-One sign-in failed: ${signIn.status()}`);
    }
    await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".sb--v4, .utility-topbar", { timeout: 45000 }).catch(() => {});
    const sbBack = await sampleContrast(page, "a.utility-topbar__back");
    const sbTitle = await sampleContrast(page, ".utility-topbar__title");
    if (sbBack.found) {
      sbBack.contrastRatio = contrastRatio(sbBack.fgRgb, sbBack.bgRgb);
      sbBack.wcagAANormal = sbBack.contrastRatio >= 4.5;
    }
    if (sbTitle.found) {
      sbTitle.contrastRatio = contrastRatio(sbTitle.fgRgb, sbTitle.bgRgb);
      sbTitle.wcagAANormal = sbTitle.contrastRatio >= 4.5;
    }
    await page.screenshot({
      path: path.join(OUT, `studio-board-header-${vp.name}.png`),
      clip: { x: 0, y: 0, width: vp.width, height: Math.min(280, vp.height) },
    });

    report.viewports.push({ viewport: vp.name, helpCenter: { back: hcBack, title: hcTitle }, studioBoard: { back: sbBack, title: sbTitle } });

    for (const route of ["/studio-board", "/feedback-studio", "/studio-conversation-room"]) {
      report.studioReview.push({
        viewport: vp.name,
        route,
        ...(await studioReviewProbe(page, route)),
      });
    }

    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".fs-page, .utility-page", { timeout: 30000 }).catch(() => {});
    const rrOk = await page.evaluate(() =>
      Boolean(document.querySelector(".fs-page, [class*='feedback'], .utility-page")),
    );
    report.viewports[report.viewports.length - 1].reviewRoomLoads = rrOk;

    await context.close();
  }

  await browser.close();
  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, out: OUT, report }, null, 2));
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
