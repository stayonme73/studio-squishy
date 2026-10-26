import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(
  root,
  "docs/launch/studio-operating-visual-system-freeze-1/owner-proof",
);
mkdirSync(out, { recursive: true });

const screens = [
  { id: "record", url: "https://localhost:3000/campaign-details", wait: "h1, .cd-grid, .utility-title, .utility-page" },
  { id: "review", url: "https://localhost:3000/feedback-studio", wait: ".fs-page, .rd-shell, .fs-room, h1" },
  { id: "board", url: "https://localhost:3000/studio-board", wait: ".sb, .sb-sidebar, .sb-main, h1" },
  { id: "payment", url: "https://localhost:3000/local-test-fixtures?inspect=payment", wait: ".pay-paper-card, .co-card, .payment-page, h1" },
  { id: "intake", url: "https://localhost:3000/local-test-fixtures?inspect=intake", wait: ".route-map-social-intake, [class*='intake'], h1" },
];

const viewports = [
  { id: "laptop", width: 1280, height: 800 },
  { id: "mobile", width: 390, height: 844 },
];

const finalCleanupOnly = process.argv.includes("--final-cleanup");
const allowed = finalCleanupOnly
  ? new Set(["board-laptop", "board-mobile", "review-mobile"])
  : null;

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 800 },
});
const page = await context.newPage();

const auth = await page.request.post(
  "https://localhost:3000/api/auth/local-customer-one",
);
process.stdout.write(`auth=${auth.status()}\n`);

for (const screen of screens) {
  for (const vp of viewports) {
    if (allowed && !allowed.has(`${screen.id}-${vp.id}`)) continue;
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(screen.url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.waitForSelector(screen.wait, { timeout: 15000 }).catch(() => {});
    const dest = path.join(out, `five-screen-${screen.id}-${vp.id}.jpg`);
    await page.screenshot({
      path: dest,
      type: "jpeg",
      quality: 72,
      fullPage: screen.id === "board" && vp.id === "laptop",
    });
    const paint = await page.evaluate(() => {
      const pick = (sel) =>
        [...document.querySelectorAll(sel)].slice(0, 5).map((el) => ({
          cls: String(el.className).slice(0, 56),
          bg: getComputedStyle(el).backgroundColor,
          border: getComputedStyle(el).borderTopColor,
          color: getComputedStyle(el).color,
          blur: getComputedStyle(el).backdropFilter,
        }));
      return {
        title: document.title,
        path: location.pathname + location.search,
        glass: pick(
          ".sb-sidebar, .fs-review-proof, .fs-review-proof__image, .cd-vision, .cd-overview, .pay-paper-card, .co-card, .route-map-social-intake__card, .utility-card",
        ),
        selected: pick(
          ".sb-nav__item--active, [aria-current='page'], .utility-subnav__link--active, .cd-journey__step--current .cd-journey__dot, .rd-job-list__item--selected",
        ),
        rules: pick(".sb-card__tab"),
        clip: [...document.querySelectorAll(".sb-card--current, .sb-card--progress, .sb-card--project-snapshot, .sb-card--materials-next")].slice(0, 4).map((el) => ({
          cls: String(el.className).slice(0, 56),
          overflow: getComputedStyle(el).overflow,
          height: getComputedStyle(el).height,
          minHeight: getComputedStyle(el).minHeight,
          scroll: el.scrollHeight,
        })),
        tabRule: [...document.querySelectorAll(".sb-card__tab")].slice(0, 3).map((el) => getComputedStyle(el).borderBottomColor),
      };
    });
    process.stdout.write(`${screen.id} ${vp.id} ${JSON.stringify(paint)}\n`);
  }
}

await browser.close();
