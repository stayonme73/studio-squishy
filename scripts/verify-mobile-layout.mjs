/**
 * Live mobile QA — 390×844 portrait.
 * Run: node scripts/verify-mobile-layout.mjs
 * Live: VERIFY_BASE_URL=https://studio-squishy.vercel.app node scripts/verify-mobile-layout.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const VIEWPORT = { width: 390, height: 844 };
const CAMPAIGN_KEY = "studio-squishy:current-campaign";

function readyCampaign() {
  return {
    campaignId: "mobile-qa",
    campaignName: "Brand Awareness",
    packageId: "spark",
    packageLabel: "SPARK",
    campaignStatus: "READY_FOR_REVIEW",
    paymentStatus: "PAID",
    selectedCampaignOption: null,
    deliverables: {},
    submittedAt: new Date().toISOString(),
  };
}

async function layoutOk(page, selector, test) {
  return page.evaluate(
    ({ selector, test }) => {
      const el = document.querySelector(selector);
      if (!el) return { ok: false, reason: `missing ${selector}` };
      const s = getComputedStyle(el);
      const vw = window.innerWidth;
      const rect = el.getBoundingClientRect();
      if (rect.width > vw + 2) {
        return { ok: false, reason: `${selector} wider than viewport (${rect.width} > ${vw})` };
      }
      if (test === "flex-col") {
        return {
          ok: s.display === "flex" && s.flexDirection === "column",
          reason: `display=${s.display} flexDirection=${s.flexDirection}`,
        };
      }
      if (test === "single-col-grid") {
        const cols = s.gridTemplateColumns;
        const ok = !cols.includes(" ") || cols === `${vw}px` || cols.endsWith("px");
        return { ok, reason: `gridTemplateColumns=${cols}` };
      }
      if (test === "single-col-or-flex") {
        if (s.display === "flex" && s.flexDirection === "column") return { ok: true, reason: "flex column" };
        const cols = s.gridTemplateColumns;
        const ok = !cols.includes(" ") || cols.split(" ").length === 1;
        return { ok, reason: `display=${s.display} cols=${cols}` };
      }
      return { ok: true, reason: "n/a" };
    },
    { selector, test },
  );
}

async function noHorizontalScroll(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth <= doc.clientWidth + 2;
  });
}

const checks = [
  {
    name: "1. Welcome Hall — Studio Board link visible",
    url: "/",
    run: async (page) => {
      const link = page.getByRole("link", { name: /Open Studio Board/i });
      const visible = await link.isVisible();
      const scroll = await noHorizontalScroll(page);
      return visible && scroll;
    },
  },
  {
    name: "2. Studio Guide — package single column",
    url: "/studio-guide-prototype",
    run: async (page) => {
      await page.locator(".sg-proto-booklet-hit").nth(1).click();
      await page.waitForSelector(".sg-proto-proposal-body", { timeout: 10000 });
      const r = await layoutOk(page, ".sg-proto-proposal-body", "flex-col");
      const scroll = await noHorizontalScroll(page);
      return r.ok && scroll;
    },
  },
  {
    name: "3. Payment — vertical stack",
    url: "/payment?package=momentum",
    run: async (page) => {
      const r = await layoutOk(page, ".pay-checkout-grid", "single-col-or-flex");
      const scroll = await noHorizontalScroll(page);
      return r.ok && scroll;
    },
  },
  {
    name: "4. Intake — content-height panel",
    url: "/draft-room?begin=1&package=spark",
    run: async (page) => {
      await page.waitForSelector(".dri-intake-shell", { timeout: 15000 });
      const shell = await page.$eval(".dri-intake-shell", (el) => ({
        minHeight: getComputedStyle(el).minHeight,
        height: getComputedStyle(el).height,
      }));
      const scroll = await noHorizontalScroll(page);
      return (shell.minHeight === "0px" || shell.height === "auto") && scroll;
    },
  },
  {
    name: "5. Studio Board — single column",
    url: "/studio-board",
    seedCampaign: true,
    run: async (page) => {
      await page.waitForSelector(".sb.sb--v4", { timeout: 15000 });
      const sb = await layoutOk(page, ".sb.sb--v4", "single-col-or-flex");
      const board = await layoutOk(page, ".sb-board-layout", "flex-col");
      const scroll = await noHorizontalScroll(page);
      return sb.ok && board.ok && scroll;
    },
  },
  {
    name: "6. Campaign Record — full width",
    url: "/studio-board?record=open",
    seedCampaign: true,
    run: async (page) => {
      await page.waitForSelector(".sb.sb--v4", { timeout: 15000 });
      await page.waitForSelector(".sb-record-drawer__panel", { timeout: 15000 });
      const w = await page.$eval(".sb-record-drawer__panel", (el) => el.offsetWidth);
      const vw = await page.evaluate(() => window.innerWidth);
      const scroll = await noHorizontalScroll(page);
      return w >= vw - 4 && scroll;
    },
  },
  {
    name: "7. Review Room — cards stack",
    url: "/review-room",
    seedCampaign: true,
    run: async (page) => {
      await page.waitForSelector(".rr-options, .utility-shell", { timeout: 10000 });
      const hasCards = await page.locator(".rr-options").count();
      if (hasCards === 0) return true;
      const r = await layoutOk(page, ".rr-options", "single-col-grid");
      const scroll = await noHorizontalScroll(page);
      return r.ok && scroll;
    },
  },
  {
    name: "8. Final Delivery — single column grids",
    url: "/deliverables",
    seedCampaign: true,
    run: async (page) => {
      await page.waitForSelector(".utility-page, .fd-empty__title", { timeout: 10000 });
      const scroll = await noHorizontalScroll(page);
      const grid = await page.locator(".fd-deliverables__grid").count();
      if (grid === 0) return scroll;
      const r = await layoutOk(page, ".fd-deliverables__grid", "single-col-grid");
      return r.ok && scroll;
    },
  },
  {
    name: "9. Help Center — no horizontal scroll",
    url: "/help-center",
    run: async (page) => {
      await page.waitForSelector(".utility-page", { timeout: 10000 });
      return noHorizontalScroll(page);
    },
  },
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT, isMobile: true });
const page = await context.newPage();

let failed = 0;
const results = [];

for (const check of checks) {
  try {
    if (check.seedCampaign) {
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({ key, campaign }) => localStorage.setItem(key, JSON.stringify(campaign)),
        { key: CAMPAIGN_KEY, campaign: readyCampaign() },
      );
    }
    await page.goto(`${BASE}${check.url}`, { waitUntil: "networkidle", timeout: 45000 });
    const ok = await check.run(page);
    results.push({ name: check.name, ok });
    console.log(ok ? "PASS" : "FAIL", check.name);
    if (!ok) failed += 1;
  } catch (error) {
    results.push({ name: check.name, ok: false, error: error.message });
    console.log("FAIL", check.name, "-", error.message);
    failed += 1;
  }
}

await browser.close();
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed on ${BASE}`);
process.exit(failed > 0 ? 1 : 0);
