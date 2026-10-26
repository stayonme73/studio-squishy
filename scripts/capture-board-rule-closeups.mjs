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

const shots = [
  { id: "mobile", width: 390, height: 844 },
  { id: "laptop", width: 1280, height: 800 },
];

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();
const auth = await page.request.post("https://localhost:3000/api/auth/local-customer-one");
process.stdout.write(`auth=${auth.status()}\n`);

for (const shot of shots) {
  await page.setViewportSize({ width: shot.width, height: shot.height });
  await page.goto("https://localhost:3000/studio-board", {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await page.waitForFunction(() => {
    const tabs = [...document.querySelectorAll(".sb-card__tab")];
    const hasMaterials = tabs.some((el) => /Materials Received/i.test(el.textContent || ""));
    const stillLoading = /Loading your project/i.test(document.body.innerText);
    return hasMaterials && !stillLoading;
  }, { timeout: 25000 });
  const paint = await page.evaluate(() => {
    const read = (el) => (el ? getComputedStyle(el).borderWidth : "missing");
    const tabs = [...document.querySelectorAll(".sb-card__tab")]
      .filter((el) => /Materials Received|Materials We Still Need|What You Should Do Next|Current Project/i.test(el.textContent || ""))
      .map((el) => {
        const card = el.closest(".sb-card");
        const style = card ? getComputedStyle(card) : null;
        return {
          text: el.textContent?.trim().slice(0, 40),
          borderBottom: getComputedStyle(el).borderBottom,
          cardBorder: style ? style.border : "",
          padding: style ? style.padding : "",
          width: style ? Math.round(card.getBoundingClientRect().width) : 0,
        };
      });
    return {
      glance: read(document.querySelector(".sb-materials-glance")),
      tabs,
    };
  });
  process.stdout.write(`${shot.id} ${JSON.stringify(paint)}\n`);
  const tab = page.locator(".sb-card__tab").filter({ hasText: /Materials Received/i }).first();
  await tab.scrollIntoViewIfNeeded();
  const box = await tab.boundingBox().catch(() => null);
  const dest = path.join(out, `five-screen-board-${shot.id}-rules.jpg`);
  if (box) {
    const clip = {
      x: Math.max(0, box.x - 16),
      y: Math.max(0, box.y - 12),
      width: Math.min(shot.width - Math.max(0, box.x - 16) - 8, shot.id === "mobile" ? 374 : 900),
      height: shot.id === "mobile" ? 520 : 400,
    };
    await page.screenshot({ path: dest, type: "jpeg", quality: 80, clip });
  } else {
    await page.screenshot({ path: dest, type: "jpeg", quality: 80 });
  }
}

await browser.close();
