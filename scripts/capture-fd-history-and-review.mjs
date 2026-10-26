import { mkdirSync } from "node:fs";
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

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  ignoreHTTPSErrors: true,
  hasTouch: true,
  isMobile: true,
});
const page = await context.newPage();
const auth = await page.request.post(`${BASE}/api/auth/local-customer-one`);
process.stdout.write(`auth=${auth.status()}\n`);

await page.goto(`${BASE}/deliverables`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForSelector(".fd-hero, .fd-summary, [class*='fd-']", {
  timeout: 25000,
});
await page.waitForTimeout(1200);

const facts = await page.evaluate(() => {
  const text = document.body.innerText;
  const downloads = [...document.querySelectorAll("a, button")]
    .map((node) => node.textContent?.trim())
    .filter((label) => label && /pdf|png|download/i.test(label));
  return {
    hasSept16: /September 16, 2026/.test(text),
    filesReady: /Your files are ready/i.test(text),
    history: /Update History/i.test(text),
    v16pdf: /flyer-version-16\.pdf/i.test(text) || downloads.some((label) => /pdf/i.test(label)),
    v16png: /flyer-version-16\.png/i.test(text) || downloads.some((label) => /png/i.test(label)),
    downloads,
    snippet: text.replace(/\s+/g, " ").slice(0, 1800),
  };
});
process.stdout.write(`${JSON.stringify(facts, null, 2)}\n`);

const history = page.locator("text=Update History").first();
if (await history.count()) {
  await history.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
}
await page.screenshot({
  path: path.join(out, "close-final-delivery-history.jpg"),
  type: "jpeg",
  quality: 82,
});

const file = page.locator("text=/PDF|PNG|Download/i").first();
if (await file.count()) {
  await file.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
}
await page.screenshot({
  path: path.join(out, "close-final-delivery-files.jpg"),
  type: "jpeg",
  quality: 82,
});

await page.goto(`${BASE}/feedback-studio`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForTimeout(1600);
await page.screenshot({
  path: path.join(out, "close-review-room.jpg"),
  type: "jpeg",
  quality: 82,
});
const review = await page.evaluate(() =>
  document.body.innerText.replace(/\s+/g, " ").slice(0, 800),
);
process.stdout.write(`review ${review}\n`);

await browser.close();
