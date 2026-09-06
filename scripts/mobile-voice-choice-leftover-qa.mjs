/**
 * Voice Choice leftover-tap + Let’s Get Started visual match proof.
 * Does not add a customer-flow delay. Holds pointerdown only in Playwright.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const BASE = "https://localhost:3000";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);
const WELCOME_DENIM = "rgb(84, 124, 146)";
const WELCOME_IVORY = "rgb(247, 244, 238)";

async function buttonPaint(locator) {
  return locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      className: el.className,
      ariaPressed: el.getAttribute("aria-pressed"),
      background: s.backgroundColor,
      borderColor: s.borderTopColor,
      color: s.color,
      radius: s.borderRadius,
    };
  });
}

function matchesWelcome(paint) {
  return (
    paint?.background === WELCOME_DENIM &&
    paint?.borderColor === WELCOME_DENIM &&
    paint?.color === WELCOME_IVORY &&
    paint?.radius === "8.8px"
  );
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 780 },
    hasTouch: true,
    isMobile: true,
  });
  const report = { ok: false };
  const welcomePng = path.join(OUT, "voice-choice-welcome-lets-get-started.png");
  const voicePng = path.join(OUT, "voice-choice-rest-welcome-cta.png");

  try {
    await page.goto(`${BASE}/?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });
    const welcomeCta = page
      .locator("a.lobby-entry-film__cta")
      .filter({ hasText: /LET’S GET STARTED|LET'S GET STARTED/i })
      .first();
    await welcomeCta.waitFor({ state: "visible", timeout: 30000 });
    report.welcome = await buttonPaint(welcomeCta);
    await page.screenshot({ path: welcomePng });

    await welcomeCta.click();
    const fill = page.locator('[data-voice-choice-action="off"]').first();
    const voice = page.locator('[data-voice-choice-action="on"]').first();
    await fill.waitFor({ state: "visible", timeout: 30000 });
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-voice-choice-action="off"]');
      return Boolean(
        el && Object.keys(el).some((key) => key.startsWith("__reactFiber")),
      );
    });
    report.voiceRest = await buttonPaint(voice);
    report.fillRest = await buttonPaint(fill);
    await page.screenshot({ path: voicePng });

    const box = await fill.boundingBox();
    if (!box) throw new Error("no fill button box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(80);
    report.press = await buttonPaint(fill);
    await page.screenshot({
      path: path.join(OUT, "voice-choice-press-selected.png"),
    });
    await page.mouse.up();
    await page.locator("#studio-guide-type-field").waitFor({
      state: "visible",
      timeout: 15000,
    });
    await page.waitForTimeout(400);
    report.after = await page.evaluate(() => {
      const text = (document.body?.innerText || "").replace(/\s+/g, " ");
      return {
        listening: /Listening/i.test(text),
        tapToFinish: /Tap to finish/i.test(text),
        nameQuestion: /What should I call you|Before we begin|What are you working/i.test(
          text,
        ),
        voiceOff: /Voice: Off/i.test(text),
        fillGone: !document.querySelector("[data-voice-choice-film]"),
      };
    });
    await page.screenshot({
      path: path.join(OUT, "voice-choice-after-fill-no-listen.png"),
    });

    const sameFamily =
      matchesWelcome(report.welcome) &&
      matchesWelcome(report.voiceRest) &&
      matchesWelcome(report.fillRest) &&
      /lobby-entry-film__cta/.test(report.voiceRest?.className ?? "") &&
      /lobby-entry-film__cta/.test(report.fillRest?.className ?? "") &&
      !/studio-tile--standard|studio-tile--selected/.test(
        `${report.voiceRest?.className ?? ""} ${report.fillRest?.className ?? ""}`,
      );
    const pressed =
      report.press?.ariaPressed === "true" &&
      matchesWelcome(report.press) &&
      !/studio-tile--selected/.test(report.press?.className ?? "");
    report.sameFamily = sameFamily;
    report.pressedMatchesWelcome = pressed;
    report.ok = Boolean(
      sameFamily &&
        pressed &&
        report.after?.fillGone &&
        report.after?.nameQuestion &&
        report.after?.voiceOff &&
        !report.after?.listening &&
        !report.after?.tapToFinish,
    );
    await sharp({
      create: {
        width: 720,
        height: 780,
        channels: 3,
        background: "#2e2b28",
      },
    })
      .composite([
        { input: welcomePng, left: 0, top: 0 },
        { input: voicePng, left: 360, top: 0 },
      ])
      .png()
      .toFile(path.join(OUT, "voice-choice-side-by-side-welcome.png"));
    await writeFile(
      path.join(OUT, "voice-choice-welcome-cta-family-report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
