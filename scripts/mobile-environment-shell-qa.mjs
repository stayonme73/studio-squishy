/**
 * Builder QA: Studio Environment Shell vs Let’s Get Started Gold Master.
 * Does not add inspection delay. Does not implement sliding.
 *
 * Usage: node scripts/mobile-environment-shell-qa.mjs
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
    /* Keyboard missed. */
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

function parseRgb(value) {
  const match = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(value || "");
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function rgbClose(a, b, tol = 6) {
  const left = parseRgb(a);
  const right = parseRgb(b);
  if (!left || !right) return false;
  return left.every((channel, i) => Math.abs(channel - right[i]) <= tol);
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
  };
}

async function sampleShell(page) {
  const shell = await page.evaluate(() => {
    const root = document.querySelector("[data-studio-environment-shell]");
    const plate = document.querySelector(".studio-environment-shell__plate");
    const veil = document.querySelector(".studio-environment-shell__veil");
    const backdrop = document.querySelector(".studio-utility-backdrop");
    const plateStyle = plate ? getComputedStyle(plate) : null;
    const veilStyle = veil ? getComputedStyle(veil) : null;
    const backStyle = backdrop ? getComputedStyle(backdrop) : null;
    return {
      present: Boolean(root),
      src: plate?.getAttribute("src") ?? null,
      objectPosition: plateStyle?.objectPosition ?? null,
      objectFit: plateStyle?.objectFit ?? null,
      veilBackground: veilStyle?.backgroundColor ?? null,
      plateFilter: plateStyle?.filter ?? null,
      veilFilter: veilStyle?.backdropFilter ?? veilStyle?.webkitBackdropFilter ?? null,
      utilityDisplay: backStyle?.display ?? "absent",
    };
  });
  shell.pixels = await samplePixels(page);
  return shell;
}

function shellMatchesGoldMaster(sample) {
  if (!sample?.present) return false;
  if (!(sample.src || "").includes("studio-lobby-lounge.png")) return false;
  if (sample.objectPosition !== "16% 42%") return false;
  if (sample.objectFit !== "cover") return false;
  if (!(sample.plateFilter || "").includes("blur(2px)")) return false;
  if (sample.utilityDisplay !== "none" && sample.utilityDisplay !== "absent") {
    return false;
  }
  return true;
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
    await page.goto(`${BASE}/?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForSelector(".lobby-entry-film", { timeout: 30000 });
    report.samples.letsGetStarted = await sampleShell(page);
    await shot(page, "env-qa-01-lets-get-started.png");
    report.steps.push("lets-get-started");

    await page.goto(`${BASE}/lobby-entry/begin-new?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForSelector("[data-voice-choice-action=off]", { timeout: 30000 });
    report.samples.voiceChoice = await sampleShell(page);
    await shot(page, "env-qa-02-voice-choice.png");
    report.steps.push("voice-choice");

    await chooseFillItOutMyself(page);
    await page.locator("#studio-guide-type-field").waitFor({ state: "visible", timeout: 20000 });
    report.samples.name = await sampleShell(page);
    await shot(page, "env-qa-03-name.png");
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
    await pointerActivate(
      page.getByRole("button", { name: /Yes, this is correct|Looks good/i }),
    );
    const promote = page.getByRole("button", { name: /Promote Something Now/i }).first();
    if (await promote.count()) await pointerActivate(promote);
    const routeContinue = page.getByRole("button", { name: /Continue with/i }).first();
    await routeContinue.waitFor({ timeout: 20000 });
    await pointerActivate(routeContinue);
    await page.getByText("Make Me a Flyer", { exact: true }).first().waitFor({ timeout: 20000 });
    report.samples.services = await sampleShell(page);
    await shot(page, "env-qa-04-services.png");
    report.steps.push("services");

    await pointerActivate(page.getByRole("button", { name: /Add to Project/i }).first());
    await pointerActivate(page.getByRole("button", { name: /Review Studio Plan/i }).first());
    await page.waitForTimeout(1200);
    report.samples.plan = await sampleShell(page);
    await shot(page, "env-qa-05-plan.png");
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
    report.samples.checkout = await sampleShell(page);
    await shot(page, "env-qa-06-checkout.png");
    report.steps.push("checkout");

    await page.goto(`${BASE}/sign-in`, { waitUntil: "load", timeout: 60000 });
    report.samples.signIn = await sampleShell(page);
    await shot(page, "env-qa-07-sign-in.png");
    report.steps.push("sign-in");

    await page.goto(`${BASE}/studio-board`, { waitUntil: "load", timeout: 60000 });
    report.samples.board = await sampleShell(page);
    await shot(page, "env-qa-08-board.png");
    report.steps.push("board");

    await page.goto(`${BASE}/feedback-studio`, {
      waitUntil: "load",
      timeout: 60000,
    });
    report.samples.review = await sampleShell(page);
    await shot(page, "env-qa-09-review.png");
    report.steps.push("review");

    const gold = report.samples.letsGetStarted;
    const compareKeys = [
      "letsGetStarted",
      "voiceChoice",
      "name",
      "services",
      "plan",
      "checkout",
      "signIn",
      "board",
      "review",
    ];
    report.shellOk = compareKeys.every((key) =>
      shellMatchesGoldMaster(report.samples[key]),
    );
    report.cornersMatch =
      Boolean(gold?.pixels?.topLeft) &&
      ["voiceChoice", "name", "services", "checkout"].every((key) =>
        rgbClose(report.samples[key]?.pixels?.topLeft, gold.pixels.topLeft),
      );
    const desktop = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      colorScheme: "light",
    });
    const deskPage = await desktop.newPage();
    deskPage.setDefaultTimeout(20000);
    await deskPage.goto(`${BASE}/?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await deskPage.waitForSelector(".lobby-entry-film", { timeout: 30000 });
    report.samples.desktopLobby = await sampleShell(deskPage);
    await shot(deskPage, "env-qa-10-desktop-lobby.png");
    await desktop.close();
    report.desktopCropOk =
      report.samples.desktopLobby?.objectPosition === "50% 50%" &&
      (report.samples.desktopLobby?.src || "").includes(
        "studio-lobby-lounge.png",
      );

    report.ok = Boolean(report.shellOk && report.cornersMatch && report.desktopCropOk);
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  } finally {
    const reportFile = path.join(OUT_DIR, "env-qa-report.json");
    await writeFile(reportFile, JSON.stringify(report, null, 2));
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  }
}

main();
