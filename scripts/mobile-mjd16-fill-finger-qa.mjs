/**
 * MJ-D16 builder QA — production mobile path, real finger hold, repeated fresh entry.
 * Does not tap Use Voice guidance. Does not add customer-flow delay.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function inspectButtons(page) {
  return page.evaluate(() => {
    function info(sel) {
      const el = document.querySelector(sel);
      if (!(el instanceof HTMLElement)) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const span = el.querySelector("span");
      return {
        action: el.getAttribute("data-voice-choice-action"),
        href: el.getAttribute("href"),
        pe: s.pointerEvents,
        spanPe: span ? getComputedStyle(span).pointerEvents : null,
        top: r.top,
        bottom: r.bottom,
        z: s.zIndex,
        tag: el.tagName,
      };
    }
    const frost = document.querySelector(".studio-environment-shell__frost");
    const frostStyle = frost ? getComputedStyle(frost) : null;
    const fill = document.querySelector('[data-voice-choice-action="off"]');
    const box = fill?.getBoundingClientRect();
    const hit =
      box &&
      document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );
    return {
      fill: info('[data-voice-choice-action="off"]'),
      voice: info('[data-voice-choice-action="on"]'),
      samePath:
        document.querySelectorAll("[data-voice-choice-action]").length === 2,
      frostDisplay: frostStyle?.display ?? null,
      frostPe: frostStyle?.pointerEvents ?? null,
      hitTag: hit instanceof HTMLElement ? hit.tagName : null,
      hitAction:
        hit instanceof HTMLElement
          ? hit.closest("[data-voice-choice-action]")?.getAttribute(
              "data-voice-choice-action",
            )
          : null,
    };
  });
}

async function fingerHoldFill(page, { screenshotPressPath } = {}) {
  const fill = page.locator('[data-voice-choice-action="off"]').first();
  await fill.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-voice-choice-action="off"]');
    return Boolean(
      el && Object.keys(el).some((key) => key.startsWith("__reactFiber")),
    );
  });
  const box = await fill.boundingBox();
  if (!box) throw new Error("no fill box");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.evaluate(() => {
    window.__mjd16Events = [];
    const el = document.querySelector('[data-voice-choice-action="off"]');
    if (!(el instanceof HTMLElement)) return;
    for (const type of [
      "pointerdown",
      "pointerup",
      "pointercancel",
      "touchend",
      "click",
    ]) {
      el.addEventListener(
        type,
        (event) => {
          window.__mjd16Events.push({
            type: event.type,
            cancelable: event.cancelable,
            defaultPrevented: event.defaultPrevented,
            pressed: el.dataset.gatePressed || null,
          });
        },
        true,
      );
    }
  });
  await page.mouse.move(x, y);
  await page.mouse.down();
  await sleep(120);
  const during = await page.evaluate(() => {
    const el = document.querySelector('[data-voice-choice-action="off"]');
    return {
      pressed: el instanceof HTMLElement ? el.dataset.gatePressed || null : null,
      gate: Boolean(document.querySelector("[data-voice-choice-film]")),
    };
  });
  if (screenshotPressPath) {
    await page.screenshot({ path: screenshotPressPath, fullPage: false });
  }
  await sleep(230);
  await page.mouse.up();
  const events = await page.evaluate(() => window.__mjd16Events || []);
  return { during, events };
}

async function afterState(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    return {
      gate: Boolean(document.querySelector("[data-voice-choice-film]")),
      nameQuestion: /Before we begin|what name|call you/i.test(text),
      listening: /Listening/i.test(text),
      tapToFinish: /Tap to finish/i.test(text),
      voiceOff: /Voice: Off/i.test(text),
    };
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { ok: false, attempts: [], paths: null, pageErrors: [] };
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  try {
    for (let i = 1; i <= 3; i += 1) {
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.on("pageerror", (error) =>
        report.pageErrors.push(String(error).slice(0, 300)),
      );
      await page.goto(`${BASE}/lobby-entry/begin-new?studioPaymentSandbox=1`, {
        waitUntil: "load",
        timeout: 60000,
      });
      await page.waitForSelector('[data-voice-choice-action="off"]', {
        timeout: 30000,
      });
      if (!report.paths) {
        report.paths = await inspectButtons(page);
        await page.screenshot({
          path: path.join(OUT, "mjd16-fix-voice-choice.png"),
          fullPage: false,
        });
      }
      const hold = await fingerHoldFill(page, {
        screenshotPressPath:
          i === 1 ? path.join(OUT, "mjd16-fix-press-hold.png") : undefined,
      });
      await page.locator("#studio-guide-type-field").waitFor({
        state: "visible",
        timeout: 15000,
      });
      const after = await afterState(page);
      await page.screenshot({
        path: path.join(OUT, `mjd16-fix-after-fill-${i}.png`),
        fullPage: false,
      });
      report.attempts.push({ n: i, after, hold });
      await page.close();
    }
    report.ok =
      report.attempts.length === 3 &&
      report.attempts.every(
        (row) =>
          row.after.gate === false &&
          row.after.nameQuestion === true &&
          row.after.listening === false &&
          row.after.tapToFinish === false &&
          row.after.voiceOff === true &&
          row.hold.during.pressed === "true" &&
          row.hold.during.gate === true &&
          row.hold.events.some((event) => event.type === "pointerdown") &&
          row.hold.events.some((event) => event.type === "pointerup") &&
          !row.hold.events.some((event) => event.type === "pointercancel"),
      ) &&
      report.paths?.fill?.href === report.paths?.voice?.href &&
      report.paths?.fill?.pe === "auto" &&
      report.paths?.voice?.pe === "auto" &&
      report.paths?.fill?.spanPe === "none" &&
      report.paths?.voice?.spanPe === "none" &&
      report.paths?.frostDisplay === "none" &&
      report.paths?.hitAction === "off";
  } catch (error) {
    report.ok = false;
    report.pageErrors.push(String(error).slice(0, 800));
  } finally {
    await writeFile(
      path.join(OUT, "mjd16-fix-report.json"),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main();
