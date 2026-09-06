/**
 * MJ-D16 reopen diagnosis — real pointer path, not keyboard Enter.
 * Does not tap Use Voice guidance. Does not change production.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

function hitProbe() {
  const fill = document.querySelector('[data-voice-choice-action="off"]');
  const voice = document.querySelector('[data-voice-choice-action="on"]');
  const review = document.querySelector(
    "[data-studio-review-mobile-tab], .studio-review-mobile-tab",
  );
  const frost = document.querySelector("[data-studio-environment-frost]");
  const film = document.querySelector("[data-voice-choice-film]");
  const back = document.querySelector("[data-pre-checkout-deck-back]");
  function box(el) {
    if (!(el instanceof HTMLElement)) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      top: r.top,
      bottom: r.bottom,
      left: r.left,
      right: r.right,
      width: r.width,
      height: r.height,
      z: s.zIndex,
      pe: s.pointerEvents,
      display: s.display,
    };
  }
  function at(x, y) {
    const el = document.elementFromPoint(x, y);
    return {
      x,
      y,
      tag: el?.tagName ?? null,
      id: el instanceof HTMLElement ? el.id : null,
      className: el instanceof HTMLElement ? String(el.className).slice(0, 120) : null,
      action: el instanceof HTMLElement ? el.getAttribute("data-voice-choice-action") : null,
      review: Boolean(el?.closest("[data-studio-review-mobile-tab], .studio-review-mobile-tab")),
      film: Boolean(el?.closest("[data-voice-choice-film]")),
      frost: Boolean(el?.closest("[data-studio-environment-frost]")),
      text: el?.textContent?.trim().slice(0, 60) ?? null,
    };
  }
  const fillBox = box(fill);
  const voiceBox = box(voice);
  const reviewBox = box(review);
  const fillCenter = fillBox
    ? at(fillBox.left + fillBox.width / 2, fillBox.top + fillBox.height / 2)
    : null;
  const fillBottom = fillBox
    ? at(fillBox.left + fillBox.width / 2, fillBox.bottom - 4)
    : null;
  const voiceCenter = voiceBox
    ? at(voiceBox.left + voiceBox.width / 2, voiceBox.top + voiceBox.height / 2)
    : null;
  return {
    viewport: { w: window.innerWidth, h: window.innerHeight, dvh: window.innerHeight },
    fillBox,
    voiceBox,
    reviewBox,
    frostBox: box(frost),
    filmBox: box(film),
    backBox: box(back),
    fillCenter,
    fillBottom,
    voiceCenter,
    overlapReview:
      fillBox && reviewBox
        ? fillBox.bottom > reviewBox.top && fillBox.top < reviewBox.bottom
        : null,
    fillHittable: fillCenter?.action === "off" && !fillCenter?.review,
    voiceHittable: voiceCenter?.action === "on" && !voiceCenter?.review,
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = {
    ok: false,
    attempts: [],
    pageErrors: [],
    consoleErrors: [],
  };

  for (const viewport of [
    { name: "phone-780", width: 360, height: 780 },
    { name: "phone-urlbar", width: 360, height: 640 },
  ]) {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const events = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") report.consoleErrors.push(msg.text().slice(0, 300));
    });
    page.on("pageerror", (error) => report.pageErrors.push(String(error).slice(0, 300)));

    await page.exposeFunction("noteEvt", (row) => events.push(row));
    await page.goto(`${BASE}/lobby-entry/begin-new?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForSelector('[data-voice-choice-action="off"]', { timeout: 30000 });
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-voice-choice-action="off"]');
      return Boolean(
        el && Object.keys(el).some((key) => key.startsWith("__reactFiber")),
      );
    });

    await page.evaluate(() => {
      const fill = document.querySelector('[data-voice-choice-action="off"]');
      const voice = document.querySelector('[data-voice-choice-action="on"]');
      for (const el of [fill, voice]) {
        if (!el) continue;
        for (const type of ["pointerdown", "pointerup", "pointercancel", "touchend", "click"]) {
          el.addEventListener(
            type,
            (event) => {
              window.noteEvt({
                action: el.getAttribute("data-voice-choice-action"),
                type: event.type,
                pe: event.defaultPrevented,
                cancelable: event.cancelable,
              });
            },
            true,
          );
        }
      }
    });

    const before = await page.evaluate(hitProbe);
    await page.screenshot({
      path: path.join(OUT, `mjd16-hit-${viewport.name}.png`),
      fullPage: false,
    });

    const fill = page.locator('[data-voice-choice-action="off"]').first();
    const box = await fill.boundingBox();
    if (!box) throw new Error("no fill box");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.touchscreen.tap(x, y);
    let afterTap = null;
    try {
      await page.locator("#studio-guide-type-field").waitFor({
        state: "visible",
        timeout: 4000,
      });
      afterTap = await page.evaluate(() => ({
        gate: Boolean(document.querySelector("[data-voice-choice-film]")),
        name: /Before we begin|what name|call you/i.test(document.body.innerText),
        listening: /Listening|Tap to finish/i.test(document.body.innerText),
        voiceOff: /Voice: Off/i.test(document.body.innerText),
      }));
    } catch {
      afterTap = {
        gate: await page.evaluate(() =>
          Boolean(document.querySelector("[data-voice-choice-film]")),
        ),
        name: false,
        timeout: true,
      };
      const holdBox = await fill.boundingBox();
      if (holdBox) {
        const hx = holdBox.x + holdBox.width / 2;
        const hy = holdBox.y + holdBox.height / 2;
        await page.evaluate(async ([px, py]) => {
          const el = document.elementFromPoint(px, py);
          const opts = {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: "touch",
            clientX: px,
            clientY: py,
          };
          el?.dispatchEvent(new PointerEvent("pointerdown", opts));
          await new Promise((r) => setTimeout(r, 80));
          el?.dispatchEvent(new PointerEvent("pointerup", opts));
          el?.dispatchEvent(new PointerEvent("click", { bubbles: true, cancelable: true }));
        }, [hx, hy]);
        try {
          await page.locator("#studio-guide-type-field").waitFor({
            state: "visible",
            timeout: 4000,
          });
          afterTap.dispatchFallback = await page.evaluate(() => ({
            gate: Boolean(document.querySelector("[data-voice-choice-film]")),
            name: /Before we begin|what name|call you/i.test(document.body.innerText),
          }));
        } catch {
          afterTap.dispatchFallback = { timeout: true };
        }
      }
    }

    report.attempts.push({
      viewport,
      before,
      events: [...events],
      afterTap,
    });
    await context.close();
  }

  report.ok = report.attempts.every(
    (row) => row.afterTap?.name === true || row.afterTap?.dispatchFallback?.name === true,
  );
  await writeFile(path.join(OUT, "mjd16-hit-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!report.ok) process.exit(1);
}

main();
