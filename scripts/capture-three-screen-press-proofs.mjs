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
  { id: "help", url: "https://localhost:3000/help-center" },
  { id: "board", url: "https://localhost:3000/studio-board" },
  { id: "route-map", url: "https://localhost:3000/studio-conversation-room" },
];

const viewports = [
  { id: "laptop", width: 1280, height: 800 },
  { id: "mobile", width: 390, height: 844 },
];

async function signInIfNeeded(page) {
  const auth = await page.request.post(
    "https://localhost:3000/api/auth/local-customer-one",
  );
  if (auth.ok()) {
    await page.goto("https://localhost:3000/studio-board", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(1200);
    return;
  }
  const fixture = page.getByRole("button", { name: "Continue as Customer-One" });
  if (await fixture.count()) {
    await fixture.click();
    await page.waitForURL(/studio-board/, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }
}

async function pressOne(page) {
  return page.evaluate(() => {
    document.querySelectorAll("[data-pressed]").forEach((el) => {
      el.removeAttribute("data-pressed");
    });
    const nodes = [
      ...document.querySelectorAll(
        "a.utility-subnav__link, a.sb-nav__item, button, [role='button'], .studio-tile, [class*='chip'], [class*='primary-btn']",
      ),
    ].filter((el) => !el.closest(".owner-qa"));
    const pick =
      nodes.find((el) => {
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        const selected = el.matches(
          "[aria-current='page'], .utility-subnav__link--active, .sb-nav__item--active, .is-active",
        );
        return (
          !selected &&
          /Studio Board|Project Record|Speak|Type|Help|Start|Open Review|Final Delivery|Fill it out|Use Voice|Back/i.test(
            text,
          )
        );
      }) ||
      nodes.find((el) => el.tagName === "BUTTON") ||
      nodes[0];
    if (!pick) return null;
    pick.setAttribute("data-pressed", "true");
    const style = getComputedStyle(pick);
    return {
      text: (pick.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48),
      bg: style.backgroundColor,
      border: style.borderTopColor,
      color: style.color,
    };
  });
}

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
});
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 800 },
});
const page = await context.newPage();
const results = [];

for (const screen of screens) {
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(screen.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(800);
    if (screen.id === "board") await signInIfNeeded(page);
    await page.waitForTimeout(800);
    const restPath = path.join(out, `three-proof-${screen.id}-${vp.id}.jpg`);
    await page.screenshot({ path: restPath, type: "jpeg", quality: 72 });
    const pressed = await pressOne(page);
    const pressPath = path.join(out, `three-proof-${screen.id}-${vp.id}-press.jpg`);
    await page.screenshot({ path: pressPath, type: "jpeg", quality: 72 });
    results.push({
      screen: screen.id,
      viewport: vp.id,
      rest: restPath,
      press: pressPath,
      pressed,
    });
    process.stdout.write(
      `${screen.id} ${vp.id} press=${JSON.stringify(pressed)}\n`,
    );
  }
}

await browser.close();
process.stdout.write(`${JSON.stringify({ ok: true, count: results.length }, null, 2)}\n`);
