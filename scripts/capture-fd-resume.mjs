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

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();
const auth = await page.request.post("https://localhost:3000/api/auth/local-customer-one");
process.stdout.write(`auth=${auth.status()}\n`);

await page.setViewportSize({ width: 390, height: 844 });
await page.goto("https://localhost:3000/deliverables", {
  waitUntil: "domcontentloaded",
  timeout: 20000,
});
await page.waitForSelector(".fd-hero, .fd-summary, [class*='fd-']", { timeout: 25000 });
await page.waitForTimeout(1500);
const facts = await page.evaluate(() => {
  const text = document.body.innerText;
  return {
    completionDate: /September 16, 2026/.test(text),
    historyNotEmpty: /Update History/i.test(text) && !/Update History\s*$/m.test(text),
    filesReady: /Your files are ready/i.test(text),
    beingPrepared: /being prepared/i.test(text),
    pdf: /PDF/i.test(text),
    png: /PNG/i.test(text),
    maya: /Maya/i.test(text),
  };
});
process.stdout.write(`${JSON.stringify(facts)}\n`);
await page.screenshot({
  path: path.join(out, "fd-resume-mobile.jpg"),
  type: "jpeg",
  quality: 80,
  fullPage: true,
});
await browser.close();
