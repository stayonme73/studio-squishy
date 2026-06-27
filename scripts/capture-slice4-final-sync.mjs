/**
 * Capture Slice 4 final sync screenshot — starting fresh foundation on Project Summary.
 * Usage: npm run dev (separate terminal), then node scripts/capture-slice4-final-sync.mjs
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const STORAGE_KEY = "studio-squishy:business-discovery-answers";

const STARTING_FRESH = {
  "your-business": "Test Co",
  "your-situation": "Starting fresh",
  "your-challenge": "Lack of clarity or direction",
  "your-current-tools": "None yet / starting from scratch",
  "your-focus": "Marketing & growth",
  "success-looks-like": "More leads or customers, Launching something new",
  "whats-slowing-you-down": "Low visibility or reach",
};

const outPath = join(process.cwd(), "tmp", "slice4-final-sync.png");
const url = process.env.PROJECT_SUMMARY_URL ?? "http://localhost:3000/project-summary";

mkdirSync(join(process.cwd(), "tmp"), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.addInitScript(
  ({ key, answers }) => {
    window.localStorage.setItem(key, JSON.stringify(answers));
  },
  { key: STORAGE_KEY, answers: STARTING_FRESH },
);

await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForSelector("#ps-recommend-title", { timeout: 30_000 });
await page.waitForSelector(".ps-recommend__service-row", { timeout: 30_000 });
await page.waitForTimeout(800);

await page.screenshot({ path: outPath, fullPage: true });

await browser.close();
console.log(`Screenshot saved to ${outPath}`);
