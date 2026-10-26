import { chromium } from "playwright";

async function pointerActivate(locator) {
  await locator.dispatchEvent("pointerdown");
  await locator.click({ force: true }).catch(() => {});
}

const browser = await chromium.launch({ headless: true });
const page = await (
  await browser.newContext({
    viewport: { width: 360, height: 780 },
    ignoreHTTPSErrors: true,
    colorScheme: "light",
  })
).newPage();

await page.goto(
  "https://localhost:3000/lobby-entry/begin-new?studioPaymentSandbox=1",
  { waitUntil: "domcontentloaded" },
);
await page.waitForTimeout(1400);
await pointerActivate(page.locator('[data-voice-choice-action="off"]').first());
await page.locator('[data-name-question-panel="true"]').waitFor({ state: "visible" });
await page.locator("#studio-guide-type-field").fill("Maya");
await pointerActivate(page.getByRole("button", { name: "Continue" }));
await page.getByRole("heading", { name: "What are you working on today?" }).waitFor({ state: "visible" });
await page.waitForTimeout(1800);

const info = await page.evaluate(() => {
  const controls = document.querySelector('[data-studio-controls-tab="true"]');
  const sideNav = document.querySelector('[data-studio-surface="navigation"]');
  const review = document.querySelector(".studio-review-mobile-tab, .owner-qa");
  const presence = document.querySelector("[data-studio-surface='presence-rail']");
  const wave = document.querySelector("[data-studio-voice-presence='wave']");
  const room = document.querySelector("[data-name-question]");
  const privacy = document.querySelector("[class*='micPrivacy']");
  function box(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      text: (el.textContent || "").trim().slice(0, 80),
      display: cs.display,
      position: cs.position,
      background: cs.backgroundColor,
      bottom: r.bottom,
      top: r.top,
      height: r.height,
      width: r.width,
      visible: r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden",
    };
  }
  return {
    roomNameQuestion: room?.getAttribute("data-name-question"),
    controls: box(controls),
    sideNav: box(sideNav),
    review: box(review),
    presence: box(presence),
    wave: box(wave),
    privacy: box(privacy),
    scrollHeight: document.scrollingElement?.scrollHeight,
    innerHeight: window.innerHeight,
  };
});
console.log("AT TOP", JSON.stringify(info, null, 2));

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(400);
const bottom = await page.evaluate(() => {
  const controls = document.querySelector('[data-studio-controls-tab="true"]');
  const review = document.querySelector(".studio-review-mobile-tab .owner-qa__toggle, .owner-qa__toggle");
  const presence = document.querySelector("[data-studio-surface='presence-rail']");
  const wave = document.querySelector("[data-studio-voice-presence='wave']");
  function box(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      text: (el.textContent || "").trim().slice(0, 60),
      display: cs.display,
      bg: cs.backgroundColor,
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      height: Math.round(r.height),
    };
  }
  return {
    scrollY: window.scrollY,
    controls: box(controls),
    review: box(review),
    presence: box(presence),
    wave: box(wave),
  };
});
console.log("AT BOTTOM", JSON.stringify(bottom, null, 2));
await page.screenshot({
  path: "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs/28-project-need-bottom-360.png",
  fullPage: false,
});
await browser.close();
