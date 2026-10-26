import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(
  here,
  "..",
  "docs",
  "launch",
  "studio-operating-mobile-customer-journey-certification-1",
  "lounge-glass-proofs",
  "denim-jean-candidates.html",
);
const outPath = join(
  here,
  "..",
  "docs",
  "launch",
  "studio-operating-mobile-customer-journey-certification-1",
  "lounge-glass-proofs",
  "denim-jean-candidates-360.png",
);

const html = readFileSync(htmlPath, "utf8").replace(
  'url("/welcome-hall/studio-lobby-lounge.png")',
  'url("https://localhost:3000/welcome-hall/studio-lobby-lounge.png")',
);

const browser = await chromium.launch();
const page = await browser.newPage({
  ignoreHTTPSErrors: true,
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});
await page.setContent(html, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: outPath, fullPage: true });
console.log("wrote", outPath);
await browser.close();
