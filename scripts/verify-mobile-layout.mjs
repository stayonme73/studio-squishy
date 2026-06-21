/**
 * Pre-deploy mobile layout checks at 390×844.
 * Run: node scripts/verify-mobile-layout.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const VIEWPORT = { width: 390, height: 844 };

const CAMPAIGN_KEY = "studio-squishy:current-campaign";

function readyCampaign() {
  return {
    campaignId: "mobile-verify",
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

const checks = [
  {
    name: "Payment stacks vertically",
    url: "/payment?package=momentum",
    assert: async (page) => {
      const cols = await page.$eval(".pay-checkout-grid", (el) =>
        getComputedStyle(el).gridTemplateColumns,
      );
      return cols === "390px" || cols.includes("1fr") || !cols.includes(" ");
    },
  },
  {
    name: "Studio Board single column",
    url: "/studio-board",
    assert: async (page) => {
      const display = await page.$eval(".sb-board-layout", (el) => getComputedStyle(el).display);
      const cols = await page.$eval(".sb-board-layout", (el) =>
        getComputedStyle(el).gridTemplateColumns,
      );
      return display === "flex" || cols === "390px" || cols === "1fr";
    },
  },
  {
    name: "Studio Guide package single column",
    url: "/studio-guide-prototype",
    assert: async (page) => {
      await page.locator(".sg-proto-booklet-hit").nth(1).click();
      await page.waitForSelector(".sg-proto-proposal-body", { timeout: 8000 });
      const display = await page.$eval(".sg-proto-proposal-body", (el) =>
        getComputedStyle(el).display,
      );
      const flexDir = await page.$eval(".sg-proto-proposal-body", (el) =>
        getComputedStyle(el).flexDirection,
      );
      return display === "flex" && flexDir === "column";
    },
  },
  {
    name: "Review Room cards stack",
    url: "/review-room",
    seedCampaign: true,
    assert: async (page) => {
      const cols = await page.$eval(".rr-options", (el) =>
        getComputedStyle(el).gridTemplateColumns,
      );
      return cols === "390px" || cols === "1fr" || !cols.includes(" ");
    },
  },
  {
    name: "Feedback Studio cards stack",
    url: "/feedback-studio",
    seedCampaign: true,
    assert: async (page) => {
      const cols = await page.$eval(".fs-picker__grid", (el) =>
        getComputedStyle(el).gridTemplateColumns,
      );
      return cols === "390px" || cols === "1fr" || !cols.includes(" ");
    },
  },
  {
    name: "Welcome Hall Studio Board link visible",
    url: "/",
    assert: async (page) => {
      const link = page.getByRole("link", { name: /Open Studio Board/i });
      return (await link.isVisible()) && (await link.boundingBox()) !== null;
    },
  },
  {
    name: "Studio Board nav order",
    url: "/studio-board",
    assert: async (page) => {
      const labels = await page.locator(".sb-nav__item").allTextContents();
      const expected = [
        "Welcome Hall",
        "Studio Guide",
        "Studio Board",
        "Campaign Record",
        "Review Room",
        "Final Delivery",
        "Help Center",
        "New Campaign",
      ];
      const normalized = labels.map((t) => t.replace(/\s+/g, " ").trim().split("\n")[0]);
      return JSON.stringify(normalized) === JSON.stringify(expected);
    },
  },
  {
    name: "Campaign Record full width panel",
    url: "/studio-board?record=open",
    assert: async (page) => {
      await page.waitForSelector(".sb-record-drawer__panel", { timeout: 8000 });
      const width = await page.$eval(".sb-record-drawer__panel", (el) => el.offsetWidth);
      const vw = await page.evaluate(() => window.innerWidth);
      return width >= vw - 4;
    },
  },
  {
    name: "Intake panel content-height",
    url: "/draft-room/begin?package=spark",
    assert: async (page) => {
      await page.waitForSelector(".dri-intake-shell", { timeout: 15000 });
      const shell = await page.$eval(".dri-intake-shell", (el) => ({
        height: getComputedStyle(el).height,
        minHeight: getComputedStyle(el).minHeight,
      }));
      return shell.minHeight === "0px" || shell.minHeight === "auto";
    },
  },
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT });
const page = await context.newPage();

let failed = 0;
for (const check of checks) {
  try {
    if (check.seedCampaign) {
      await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({ key, campaign }) => localStorage.setItem(key, JSON.stringify(campaign)),
        { key: CAMPAIGN_KEY, campaign: readyCampaign() },
      );
    }
    await page.goto(`${BASE}${check.url}`, { waitUntil: "networkidle", timeout: 30000 });
    const ok = await check.assert(page);
    console.log(ok ? "PASS" : "FAIL", check.name);
    if (!ok) failed += 1;
  } catch (error) {
    console.log("FAIL", check.name, "-", error.message);
    failed += 1;
  }
}

await browser.close();
process.exit(failed > 0 ? 1 : 0);
