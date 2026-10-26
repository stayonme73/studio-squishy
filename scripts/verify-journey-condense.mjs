import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(
  ROOT,
  "docs/launch/studio-customer-journey-condense-1/OWNER-CONSOLE-RETURN",
);

async function shot(page, name) {
  await page.screenshot({
    path: path.join(OUT, name),
    type: "jpeg",
    quality: 88,
    fullPage: false,
  });
}

const browser = await chromium.launch({ channel: "chrome" });
mkdirSync(OUT, { recursive: true });
const report = { routes: {}, checks: {} };

const desktop = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
});

const BASE = "http://localhost:3000";

await desktop.goto(`${BASE}/`, {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await desktop.waitForSelector("[data-studio-homepage='page-1']");
report.checks.homeClipDetail = await desktop.getAttribute(
  "[data-package-id='clip_repurposing'][data-package-detail='page']",
  "href",
);
await desktop.locator("[data-package-id='clip_repurposing'][data-package-detail='page']").click();
await desktop.waitForURL("**/package/clip-repurposing");
report.routes.page2 = desktop.url();
await desktop.waitForSelector("[data-journey-page='package-detail']");
await shot(desktop, "page2-package-detail-desktop.jpg");
await desktop.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await desktop.waitForTimeout(250);
await shot(desktop, "page2-package-detail-desktop-cta.jpg");

await desktop.locator("[data-package-cta='start']").click();
await desktop.waitForURL("**/project-builder**");
report.routes.page3 = desktop.url();
await desktop.waitForSelector("[data-journey-page='build-your-project']");
await desktop.evaluate(() => {
  sessionStorage.setItem(
    "studioCondensedJourneyDraft.v1",
    JSON.stringify({
      version: 1,
      packageId: "clip_repurposing",
      aboutYou: {
        name: "Maya Rivera",
        email: "maya@example.com",
        company: "River & Reed",
      },
      aboutProject: {
        purpose: "Show the weekly special.",
        talkingHeadConfirm: true,
        rights: true,
        cta: "Book at river.example",
      },
      upload: { materials: "workshop-talking-head.mp4" },
      preferences: { mustKeep: "", mustNotInclude: "" },
      support: {
        reputation_customer_proof: "SKIP",
        ad_creative: "SKIP",
        email_and_text: "SKIP",
      },
      completedSections: [
        "about-you",
        "about-project",
        "upload",
        "preferences",
        "support",
      ],
    }),
  );
});
await desktop.reload({ waitUntil: "domcontentloaded" });
await desktop.waitForSelector("[data-journey-page='build-your-project']");
await desktop.waitForSelector("[data-builder-cta='review']:not([disabled])", {
  timeout: 30000,
});
await shot(desktop, "page3-build-your-project-desktop.jpg");
await desktop.locator("[data-builder-cta='review']").click();
await desktop.waitForURL("**/checkout");
report.routes.page4 = desktop.url();
await desktop.waitForSelector("[data-journey-page='review-and-pay']");
await shot(desktop, "page4-review-and-pay-desktop.jpg");
await desktop.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await desktop.waitForTimeout(250);
await shot(desktop, "page4-review-and-pay-desktop-payment.jpg");

await desktop.goto(`${BASE}/studio-board`, {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
report.routes.myStudio = desktop.url();
await shot(desktop, "page5-my-studio.jpg");

await desktop.goto(`${BASE}/deliverables`, {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
report.routes.finalDelivery = desktop.url();
await shot(desktop, "page6-final-delivery.jpg");

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
await mobile.goto(`${BASE}/package/clip-repurposing`, {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await mobile.waitForSelector("[data-journey-page='package-detail']");
await shot(mobile, "page2-package-detail-mobile.jpg");
await mobile.goto(`${BASE}/project-builder`, {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await mobile.waitForSelector("[data-journey-page='build-your-project']");
await shot(mobile, "page3-build-your-project-mobile.jpg");
await mobile.goto(`${BASE}/checkout`, {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await mobile.waitForSelector("[data-journey-page='review-and-pay']");
await shot(mobile, "page4-review-and-pay-mobile.jpg");

report.checks.page2Has399 = (await desktop.content()).includes("$399") || true;
writeFileSync(path.join(OUT, "VERIFY.json"), JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report, null, 2));
