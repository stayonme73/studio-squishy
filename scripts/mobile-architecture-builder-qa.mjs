/**
 * Builder QA — three-layer shell, stage-entry scroll, reversible deck.
 * Does not add inspection delay to the customer flow. Does not hide Next.js overlay.
 *
 * Usage: node scripts/mobile-architecture-builder-qa.mjs
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
  const x = Math.floor(info.width * 0.08);
  return {
    muralTL: at(x, 36),
    muralML: at(x, Math.floor(info.height * 0.42)),
    muralBL: at(x, Math.floor(info.height * 0.78)),
  };
}

async function sampleEnvironment(page) {
  const env = await page.evaluate(() => {
    const plate = document.querySelector(".studio-environment-shell__plate");
    const frost = document.querySelector("[data-studio-environment-frost]");
    const shell = document.querySelector("[data-studio-environment-shell]");
    const panel = document.querySelector("[data-name-question-panel]");
    const doc = document.scrollingElement;
    const plateBox = plate?.getBoundingClientRect();
    const frostBox = frost?.getBoundingClientRect();
    const shellBox = shell?.getBoundingClientRect();
    const heading = Array.from(document.querySelectorAll("h1,h2")).find((el) =>
      /checkout|next steps|secure checkout|studio plan|choose your/i.test(
        el.textContent || "",
      ),
    );
    const cssParse = Array.from(document.querySelectorAll("nextjs-portal"))
      .map((node) => node.shadowRoot?.textContent || "")
      .join(" ");
    return {
      docScrollTop: doc instanceof HTMLElement ? doc.scrollTop : window.scrollY,
      panelScrollTop: panel instanceof HTMLElement ? panel.scrollTop : null,
      plateTop: plateBox?.top ?? null,
      plateLeft: plateBox?.left ?? null,
      plateHeight: plateBox?.height ?? null,
      plateWidth: plateBox?.width ?? null,
      platePosition: plate ? getComputedStyle(plate).objectPosition : null,
      frostTop: frostBox?.top ?? null,
      frostDisplay: frost ? getComputedStyle(frost).display : null,
      frostPointer: frost ? getComputedStyle(frost).pointerEvents : null,
      frostFilter: frost ? getComputedStyle(frost).backdropFilter : null,
      shellPosition: shell ? getComputedStyle(shell).position : null,
      shellTop: shellBox?.top ?? null,
      headingTop: heading?.getBoundingClientRect().top ?? null,
      headingText: heading?.textContent?.trim().slice(0, 80) ?? null,
      cssParseHit: /Parsing CSS source code failed/i.test(cssParse),
    };
  });
  env.pixels = await samplePixels(page);
  return env;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = {
    ok: false,
    consoleErrors: [],
    pageErrors: [],
    proofs: [],
    samples: {},
    checks: {},
  };
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
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.consoleErrors.push(msg.text().slice(0, 500));
    }
  });
  page.on("pageerror", (error) => {
    report.pageErrors.push(String(error).slice(0, 500));
  });

  try {
    await page.goto(`${BASE}/?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForSelector(".lobby-entry-film__cta", { timeout: 20000 });
    report.samples.letsGetStarted = await sampleEnvironment(page);
    report.proofs.push(await shot(page, "arch-qa-01-lets-get-started.png"));

    await page.goto(`${BASE}/lobby-entry/begin-new?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForSelector('[data-voice-choice-film="true"]', {
      timeout: 20000,
    });
    report.samples.voiceChoice = await sampleEnvironment(page);
    report.proofs.push(await shot(page, "arch-qa-02-voice-choice.png"));

    await chooseFillItOutMyself(page);
    await page.locator("#studio-guide-type-field").waitFor({
      state: "visible",
      timeout: 20000,
    });
    report.samples.firstQuestion = await sampleEnvironment(page);
    report.proofs.push(await shot(page, "arch-qa-03-first-question.png"));

    await pointerActivate(page.locator("[data-pre-checkout-deck-back]").first());
    await page.waitForSelector('[data-voice-choice-film="true"]', { timeout: 15000 });
    report.checks.deckBackToVoiceChoice = await page.evaluate(() =>
      Boolean(document.querySelector('[data-voice-choice-film="true"]')),
    );
    report.proofs.push(await shot(page, "arch-qa-03b-deck-back-voice-choice.png"));
    await chooseFillItOutMyself(page);
    await page.locator("#studio-guide-type-field").waitFor({
      state: "visible",
      timeout: 20000,
    });
    report.checks.deckReturnKeepsFirstQuestion = await page.evaluate(() =>
      /what name|preferred name|call you/i.test(document.body.innerText),
    );

    await page.locator("#studio-guide-type-field").fill("QA");
    await activateNamed(page, "Continue");
    await chooseChip(page, "Marketing materials");
    const longQuestionTop = await sampleEnvironment(page);
    await page.evaluate(() => {
      const panel = document.querySelector("[data-name-question-panel]");
      if (panel instanceof HTMLElement) panel.scrollTop = 420;
      window.scrollTo(0, 420);
    });
    await page.waitForTimeout(200);
    const longQuestionScrolled = await sampleEnvironment(page);
    report.samples.longQuestionTop = longQuestionTop;
    report.samples.longQuestionScrolled = longQuestionScrolled;
    report.proofs.push(await shot(page, "arch-qa-04-question-scrolled.png"));
    report.checks.plateStationaryOnQuestionScroll =
      longQuestionTop.plateTop === longQuestionScrolled.plateTop &&
      longQuestionTop.platePosition === longQuestionScrolled.platePosition &&
      longQuestionTop.frostTop === longQuestionScrolled.frostTop;
    report.checks.muralPointsOnQuestionScroll = {
      before: longQuestionTop.pixels,
      after: longQuestionScrolled.pixels,
    };

    await activateNamed(page, "Continue");
    await chooseChip(page, "I don’t have one yet");
    await page.locator("#studio-guide-type-field").fill("Maya’s Mobile Boutique");
    await page.waitForTimeout(200);
    report.checks.businessNameClearsShortcut = await page.evaluate(() => {
      const selected = Array.from(
        document.querySelectorAll('[aria-pressed="true"], [data-selected="true"]'),
      ).map((el) => el.textContent?.trim());
      const mustard = Array.from(document.querySelectorAll("button")).find((btn) =>
        /I don’t have one yet/i.test(btn.textContent || ""),
      );
      const pressed = mustard?.getAttribute("aria-pressed") === "true";
      return !pressed && !selected.some((text) => /I don’t have one yet/i.test(text || ""));
    });
    await activateNamed(page, "Continue");
    await chooseChip(page, "Within 2 weeks");
    await activateNamed(page, "Continue");
    await chooseChip(page, "Nothing yet");
    await activateNamed(page, "Continue");
    report.samples.reviewTogether = await sampleEnvironment(page);
    report.proofs.push(await shot(page, "arch-qa-05-review-together.png"));

    await pointerActivate(
      page.getByRole("button", { name: /Yes, this is correct|Looks good/i }),
    );
    report.samples.route = await sampleEnvironment(page);
    report.proofs.push(await shot(page, "arch-qa-06-route.png"));

    const promote = page.getByRole("button", { name: /Promote Something Now/i }).first();
    if (await promote.count()) await pointerActivate(promote);
    await pointerActivate(page.getByRole("button", { name: /Continue with/i }).first());
    await page.getByText("Make Me a Flyer", { exact: true }).first().waitFor({
      timeout: 20000,
    });
    report.samples.step2Top = await sampleEnvironment(page);
    report.proofs.push(await shot(page, "arch-qa-07-step2-top.png"));
    await page.evaluate(() => {
      const panel = document.querySelector("[data-name-question-panel]");
      if (panel instanceof HTMLElement) {
        panel.scrollTop = Math.floor(panel.scrollHeight / 2);
      }
    });
    report.samples.step2Mid = await sampleEnvironment(page);
    report.proofs.push(await shot(page, "arch-qa-08-step2-mid.png"));
    await page.evaluate(() => {
      const panel = document.querySelector("[data-name-question-panel]");
      if (panel instanceof HTMLElement) panel.scrollTop = panel.scrollHeight;
    });
    report.samples.step2Bottom = await sampleEnvironment(page);
    report.proofs.push(await shot(page, "arch-qa-09-step2-bottom.png"));
    report.checks.plateStationaryOnStep2 =
      report.samples.step2Top.plateTop === report.samples.step2Bottom.plateTop &&
      report.samples.step2Top.platePosition ===
        report.samples.step2Bottom.platePosition;

    await pointerActivate(page.getByRole("button", { name: /Add to Project/i }).first());
    await pointerActivate(page.getByRole("button", { name: /Review Studio Plan/i }).first());
    await page.waitForTimeout(800);
    report.samples.step3Top = await sampleEnvironment(page);
    report.proofs.push(await shot(page, "arch-qa-10-step3-top.png"));
    report.checks.step3OpensAtTop =
      (report.samples.step3Top.panelScrollTop ?? 0) === 0 &&
      (report.samples.step3Top.docScrollTop ?? 0) === 0;

    await page.evaluate(() => {
      const panel = document.querySelector("[data-name-question-panel]");
      if (panel instanceof HTMLElement) {
        panel.scrollTop = Math.min(panel.scrollHeight, 900);
      }
    });
    report.samples.step3Scrolled = await sampleEnvironment(page);
    report.proofs.push(await shot(page, "arch-qa-11-step3-scrolled.png"));
    report.checks.plateStationaryOnStep3 =
      report.samples.step3Top.plateTop ===
        report.samples.step3Scrolled.plateTop &&
      report.samples.step3Top.frostTop ===
        report.samples.step3Scrolled.frostTop &&
      report.samples.step3Top.pixels.muralTL ===
        report.samples.step3Scrolled.pixels.muralTL &&
      report.samples.step3Top.pixels.muralML ===
        report.samples.step3Scrolled.pixels.muralML;

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
    await page.waitForTimeout(250);
    report.samples.checkoutFromScrolledStep3 = await sampleEnvironment(page);
    report.proofs.push(await shot(page, "arch-qa-12-checkout-from-scrolled-step3.png"));
    report.checks.checkoutOpensAtTop =
      (report.samples.checkoutFromScrolledStep3.panelScrollTop ?? 0) === 0 &&
      (report.samples.checkoutFromScrolledStep3.docScrollTop ?? 0) === 0 &&
      (report.samples.checkoutFromScrolledStep3.headingTop ?? 0) >= 0;

    await pointerActivate(
      page.getByRole("button", { name: /Back to Studio Plan/i }).first(),
    );
    await page.waitForTimeout(600);
    report.samples.backToPlan = await sampleEnvironment(page);
    report.proofs.push(await shot(page, "arch-qa-13-back-to-plan.png"));
    report.checks.planStateIntact = await page.evaluate(() => {
      const text = document.body.innerText;
      return (
        /Promote Something Now/i.test(text) &&
        /Make Me a Flyer/i.test(text) &&
        /\$69/.test(text)
      );
    });

    await pointerActivate(
      page.getByRole("button", { name: /Back to Choose Your Services/i }).first(),
    );
    await page.waitForTimeout(600);
    report.checks.backToStep2KeepsFlyer = await page.evaluate(() =>
      /Make Me a Flyer/i.test(document.body.innerText),
    );
    report.proofs.push(await shot(page, "arch-qa-14-deck-back-step2.png"));

    const desktop = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 800 },
    });
    const desk = await desktop.newPage();
    await desk.goto(`${BASE}/?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });
    report.checks.desktopCrop = await desk.evaluate(() => {
      const plate = document.querySelector(".studio-environment-shell__plate");
      return plate ? getComputedStyle(plate).objectPosition : null;
    });
    await desk.close();
    await desktop.close();

    report.checks.phoneCrop =
      report.samples.letsGetStarted.platePosition === "16% 42%";
    report.checks.cssParseGone = !report.pageErrors.some((line) =>
      /Parsing CSS source code failed/i.test(line),
    );
    report.checks.noFullScreen14pxOverContent =
      report.samples.voiceChoice.frostDisplay === "none" &&
      report.samples.firstQuestion.frostPointer === "none" &&
      !/blur\(14px\)/.test(report.samples.firstQuestion.frostFilter || "");

    report.ok =
      report.checks.checkoutOpensAtTop === true &&
      report.checks.plateStationaryOnStep3 === true &&
      report.checks.plateStationaryOnQuestionScroll === true &&
      report.checks.planStateIntact === true &&
      report.checks.cssParseGone === true &&
      report.checks.phoneCrop === true &&
      report.checks.desktopCrop === "50% 50%" &&
      report.checks.deckBackToVoiceChoice === true &&
      report.checks.deckReturnKeepsFirstQuestion === true;
  } catch (error) {
    report.ok = false;
    report.pageErrors.push(String(error).slice(0, 800));
  } finally {
    await writeFile(
      path.join(OUT_DIR, "arch-qa-report.json"),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }

  console.log(JSON.stringify({ ok: report.ok, checks: report.checks }, null, 2));
  if (!report.ok) process.exit(1);
}

main();
