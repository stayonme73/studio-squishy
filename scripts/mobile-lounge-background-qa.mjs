/**
 * Builder QA: one Lounge plate across the phone customer path.
 * Does not add inspection delay to the customer flow.
 *
 * Usage: node scripts/mobile-lounge-background-qa.mjs
 * Requires HTTPS Studio on 127.0.0.1:3000.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const OUT_DIR = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

async function shot(page, name) {
  const file = path.join(OUT_DIR, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function waitForHydrated(page, selector) {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      return Object.keys(el).some(
        (key) =>
          key.startsWith("__reactFiber") ||
          key.startsWith("__reactProps") ||
          key.startsWith("__reactInternalInstance"),
      );
    },
    selector,
    { timeout: 20000 },
  );
}

async function pointerActivate(locator) {
  await locator.first().scrollIntoViewIfNeeded().catch(() => {});
  await locator.first().click({ timeout: 8000 }).catch(async () => {
    await locator.first().tap({ force: true });
  });
}

async function chooseFillItOutMyself(page) {
  const selector = '[data-voice-choice-action="off"]';
  await page.waitForSelector(selector, { timeout: 30000 });
  await waitForHydrated(page, selector);
  const btn = page.locator(selector).first();
  await btn.focus();
  await page.keyboard.press("Enter");
  const typeField = page.locator("#studio-guide-type-field");
  try {
    await typeField.waitFor({ state: "visible", timeout: 4000 });
    return;
  } catch {
    /* Keyboard missed — try a hydrated pointerdown. */
  }
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "touch",
      }),
    );
  }, selector);
}

async function activateNamed(page, name) {
  const btn = page.getByRole("button", { name, exact: true }).first();
  await btn.waitFor({ state: "visible", timeout: 15000 });
  await pointerActivate(btn);
  await page.waitForTimeout(900);
}

async function chooseChip(page, label) {
  await page.waitForFunction(
    (chipLabel) =>
      Array.from(document.querySelectorAll("button")).some(
        (btn) => btn.textContent?.trim() === chipLabel,
      ),
    label,
    { timeout: 15000 },
  );
  await page.evaluate((chipLabel) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const el = buttons.find((btn) => btn.textContent?.trim() === chipLabel);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "touch",
      }),
    );
  }, label);
  await page.waitForTimeout(300);
}

async function samplePixels(page) {
  const buf = await page.screenshot({ fullPage: false, type: "png" });
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(buf)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  function at(x, y) {
    const idx = (info.width * y + x) * info.channels;
    return `rgb(${data[idx]}, ${data[idx + 1]}, ${data[idx + 2]})`;
  }
  return {
    topLeft: at(24, 48),
    topCenter: at(Math.floor(info.width / 2), 80),
    midRight: at(info.width - 40, Math.floor(info.height / 2)),
    aboveReview: at(Math.floor(info.width / 2), info.height - 120),
  };
}

async function sampleLounge(page) {
  const lounge = await page.evaluate(() => {
    const film = document.querySelector("[data-voice-choice-film]");
    const plate = film?.querySelector("[aria-hidden]") ?? null;
    const room = document.querySelector('[aria-label="Studio Conversation Room"]');
    const plateStyle = plate ? getComputedStyle(plate) : null;
    const roomBefore = room ? getComputedStyle(room, "::before") : null;
    const panel = document.querySelector("[data-name-question-panel]");
    const panelStyle = panel ? getComputedStyle(panel) : null;
    const panelBefore = panel ? getComputedStyle(panel, "::before") : null;
    const heading = document
      .querySelector("h1, h2, [data-voice-choice-film] p")
      ?.textContent?.trim()
      ?.slice(0, 80);
    return {
      heading,
      film: film
        ? {
            image: plateStyle?.backgroundImage ?? null,
            position: plateStyle?.backgroundPosition ?? null,
          }
        : null,
      room: room
        ? {
            image: roomBefore?.backgroundImage ?? null,
            position: roomBefore?.backgroundPosition ?? null,
          }
        : null,
      panel: panel
        ? {
            background: panelStyle?.backgroundColor,
            backdropFilter: panelStyle?.backdropFilter,
            beforeBackground: panelBefore?.backgroundColor,
            beforeFilter: panelBefore?.backdropFilter,
            overflow: panelStyle?.overflow,
            box: (() => {
              const b = panel.getBoundingClientRect();
              return { x: b.x, y: b.y, w: b.width, h: b.height };
            })(),
          }
        : null,
    };
  });
  lounge.pixels = await samplePixels(page);
  return lounge;
}

function loungeLooksMaster(sample) {
  const layer = sample.film || sample.room;
  if (!layer) return false;
  return (layer.image || "").includes("studio-lobby-lounge.png");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { ok: false, steps: [], samples: {} };

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  try {
    await page.goto(`${BASE}/lobby-entry/begin-new?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForSelector("[data-voice-choice-action=off]", { timeout: 30000 });
    report.samples.voiceChoice = await sampleLounge(page);
    await shot(page, "lounge-qa-01-voice-choice.png");
    report.steps.push("voice-choice");

    await chooseFillItOutMyself(page);
    await page.locator("#studio-guide-type-field").waitFor({ state: "visible", timeout: 20000 });
    report.samples.name = await sampleLounge(page);
    await shot(page, "lounge-qa-02-name.png");
    report.steps.push("name");

    await page.locator("#studio-guide-type-field").fill("QA");
    await activateNamed(page, "Continue");
    await chooseChip(page, "Marketing materials");
    await activateNamed(page, "Continue");
    await chooseChip(page, "Personal project");
    await activateNamed(page, "Continue");
    await chooseChip(page, "Within 2 weeks");
    await activateNamed(page, "Continue");
    await chooseChip(page, "Nothing yet");
    await activateNamed(page, "Continue");
    await page.getByRole("button", { name: /Yes, this is correct|Looks good/i }).waitFor({ timeout: 20000 });
    report.samples.summary = await sampleLounge(page);
    await shot(page, "lounge-qa-03-summary.png");
    report.steps.push("summary");

    await pointerActivate(page.getByRole("button", { name: /Yes, this is correct|Looks good/i }));
    const promote = page.getByRole("button", { name: /Promote Something Now/i }).first();
    if (await promote.count()) {
      await pointerActivate(promote);
    }
    const routeContinue = page.getByRole("button", { name: /Continue with/i }).first();
    await routeContinue.waitFor({ timeout: 20000 });
    report.samples.route = await sampleLounge(page);
    await shot(page, "lounge-qa-04-route.png");
    report.steps.push("route");

    await pointerActivate(routeContinue);
    await page.getByText("Make Me a Flyer", { exact: true }).first().waitFor({ timeout: 20000 });
    report.samples.services = await sampleLounge(page);
    await shot(page, "lounge-qa-05-services.png");
    report.steps.push("services");

    const add = page.getByRole("button", { name: /Add to Project/i }).first();
    await pointerActivate(add);
    await pointerActivate(page.getByRole("button", { name: /Review Studio Plan/i }).first());
    await page.waitForTimeout(1200);
    report.samples.plan = await sampleLounge(page);
    await shot(page, "lounge-qa-06-plan.png");
    report.steps.push("plan");

    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll("a,button")).some((el) =>
          /Continue to Checkout/i.test(el.textContent || ""),
        ),
      null,
      { timeout: 20000 },
    );
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll("a,button")).find((node) =>
        /Continue to Checkout/i.test(node.textContent || ""),
      );
      if (!el) return;
      el.scrollIntoView({ block: "center" });
      el.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "touch",
        }),
      );
      el.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "touch",
        }),
      );
    });
    await page.waitForSelector("[data-checkout-pay=continue]", { timeout: 25000 });
    report.samples.checkout = await sampleLounge(page);
    await shot(page, "lounge-qa-07-checkout.png");
    report.steps.push("checkout");

    const required = ["voiceChoice", "name", "services", "plan", "checkout"];
    const voicePixels = report.samples.voiceChoice?.pixels;
    report.cornersMatch =
      Boolean(voicePixels) &&
      ["name", "services", "checkout"].every(
        (key) => report.samples[key]?.pixels?.topLeft === voicePixels.topLeft,
      );
    report.servicesIsCard = Boolean(
      report.samples.services?.panel?.box &&
        report.samples.services.panel.box.h < 800 &&
        report.samples.services.panel.box.y > 20,
    );
    report.ok =
      required.every((key) => loungeLooksMaster(report.samples[key])) &&
      report.cornersMatch &&
      report.servicesIsCard;
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  } finally {
    const reportFile = path.join(OUT_DIR, "lounge-qa-report.json");
    await writeFile(reportFile, JSON.stringify(report, null, 2));
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  }
}

main();
