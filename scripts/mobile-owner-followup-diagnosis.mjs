/**
 * Diagnosis only — Checkout scroll inheritance, stationary Lounge, 1 Issue overlay.
 * Does not patch production. Does not add customer-flow delay.
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
  return {
    topLeft: at(24, 48),
    topCenter: at(Math.floor(info.width / 2), 80),
  };
}

async function sampleEnvironment(page) {
  const env = await page.evaluate(() => {
    const plate = document.querySelector(".studio-environment-shell__plate");
    const shell = document.querySelector("[data-studio-environment-shell]");
    const panel = document.querySelector("[data-name-question-panel]");
    const doc = document.scrollingElement;
    const plateBox = plate?.getBoundingClientRect();
    const shellBox = shell?.getBoundingClientRect();
    const panelBox = panel?.getBoundingClientRect();
    const continuePay = document.querySelector("[data-checkout-pay=continue]");
    const heading = Array.from(document.querySelectorAll("h1,h2")).find((el) =>
      /checkout|next steps|secure checkout/i.test(el.textContent || ""),
    );
    const overlay = document.querySelector("nextjs-portal");
    const issueBtn = Array.from(document.querySelectorAll("button,a,div")).find(
      (el) => /^\s*\d+\s+Issue/i.test(el.textContent || ""),
    );
    return {
      docScrollTop: doc instanceof HTMLElement ? doc.scrollTop : window.scrollY,
      winScrollY: window.scrollY,
      panelScrollTop: panel instanceof HTMLElement ? panel.scrollTop : null,
      panelOverflowY: panel ? getComputedStyle(panel).overflowY : null,
      plateTop: plateBox?.top ?? null,
      plateHeight: plateBox?.height ?? null,
      platePosition: plate ? getComputedStyle(plate).objectPosition : null,
      shellPosition: shell ? getComputedStyle(shell).position : null,
      shellTop: shellBox?.top ?? null,
      continuePayTop: continuePay?.getBoundingClientRect().top ?? null,
      headingTop: heading?.getBoundingClientRect().top ?? null,
      headingText: heading?.textContent?.trim().slice(0, 80) ?? null,
      overlayPresent: Boolean(overlay),
      issueText: issueBtn?.textContent?.trim().slice(0, 40) ?? null,
    };
  });
  env.pixels = await samplePixels(page);
  return env;
}

async function collectOverlay(page) {
  return page.evaluate(() => {
    const portal = document.querySelector("nextjs-portal");
    const shadow = portal?.shadowRoot;
    const text = [
      document.body.innerText,
      shadow?.textContent ?? "",
    ]
      .join("\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /issue|error|hydrat|css|parse/i.test(line))
      .slice(0, 40);
    return {
      portal: Boolean(portal),
      shadowHtml: shadow?.innerHTML?.slice(0, 4000) ?? null,
      lines: text,
    };
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = {
    ok: false,
    consoleErrors: [],
    pageErrors: [],
    steps: [],
    samples: {},
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
    await page.goto(`${BASE}/lobby-entry/begin-new?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await chooseFillItOutMyself(page);
    await page.locator("#studio-guide-type-field").waitFor({ state: "visible", timeout: 20000 });
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
    await pointerActivate(page.getByRole("button", { name: /Continue with/i }).first());
    await page.getByText("Make Me a Flyer", { exact: true }).first().waitFor({ timeout: 20000 });
    await pointerActivate(page.getByRole("button", { name: /Add to Project/i }).first());
    await pointerActivate(page.getByRole("button", { name: /Review Studio Plan/i }).first());
    await page.waitForTimeout(1200);
    report.samples.planTop = await sampleEnvironment(page);
    await shot(page, "diag-01-plan-top.png");

    await page.evaluate(() => {
      const cta = Array.from(document.querySelectorAll("a,button")).find((el) =>
        /Continue to Checkout/i.test(el.textContent || ""),
      );
      cta?.scrollIntoView({ block: "center", inline: "nearest" });
    });
    await page.waitForTimeout(400);
    report.samples.planScrolled = await sampleEnvironment(page);
    await shot(page, "diag-02-plan-scrolled-to-cta.png");
    report.steps.push("plan-scrolled");

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
    await page.waitForTimeout(200);
    report.samples.checkoutImmediate = await sampleEnvironment(page);
    await shot(page, "diag-03-checkout-immediate.png");
    report.steps.push("checkout-immediate");

    report.checkoutOpenedBelowFold = Boolean(
      report.samples.checkoutImmediate?.continuePayTop != null &&
        report.samples.checkoutImmediate.continuePayTop < 420 &&
        (report.samples.checkoutImmediate.docScrollTop > 40 ||
          (report.samples.checkoutImmediate.panelScrollTop ?? 0) > 40 ||
          (report.samples.checkoutImmediate.headingTop ?? 0) < -20),
    );

    await page.evaluate(() => {
      const doc = document.scrollingElement;
      if (doc instanceof HTMLElement) doc.scrollTop = 0;
      window.scrollTo(0, 0);
      const panel = document.querySelector("[data-name-question-panel]");
      if (panel instanceof HTMLElement) panel.scrollTop = 0;
    });
    await page.waitForTimeout(200);
    report.samples.checkoutForcedTop = await sampleEnvironment(page);
    await shot(page, "diag-04-checkout-forced-top.png");

    const beforeScroll = await sampleEnvironment(page);
    await page.evaluate(() => {
      const panel = document.querySelector("[data-name-question-panel]");
      if (panel instanceof HTMLElement && panel.scrollHeight > panel.clientHeight) {
        panel.scrollTop = Math.min(400, panel.scrollHeight);
        return;
      }
      const doc = document.scrollingElement;
      if (doc instanceof HTMLElement) doc.scrollTop = 400;
      else window.scrollTo(0, 400);
    });
    await page.waitForTimeout(200);
    const afterScroll = await sampleEnvironment(page);
    report.samples.loungeBeforeContentScroll = beforeScroll;
    report.samples.loungeAfterContentScroll = afterScroll;
    report.loungePlateStayedFixed =
      beforeScroll.shellTop === afterScroll.shellTop &&
      beforeScroll.plateTop === afterScroll.plateTop &&
      beforeScroll.platePosition === afterScroll.platePosition;
    report.loungeCornerChanged =
      beforeScroll.pixels.topLeft !== afterScroll.pixels.topLeft;
    await shot(page, "diag-05-checkout-after-content-scroll.png");

    report.overlay = await collectOverlay(page);
    report.samples.issueOnCheckout = await sampleEnvironment(page);

    const back = page.getByRole("button", { name: /Back to Studio Plan/i }).first();
    if (await back.count()) {
      await pointerActivate(back);
      await page.waitForTimeout(800);
      report.samples.backToPlan = await sampleEnvironment(page);
      const facts = await page.evaluate(() => document.body.innerText);
      report.backPreserved = {
        route: /Promote Something Now/.test(facts),
        flyer: /Make Me a Flyer/.test(facts),
        investment: /\$69/.test(facts),
      };
      await shot(page, "diag-06-back-to-plan.png");
    }

    report.ok = true;
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  } finally {
    const file = path.join(OUT_DIR, "diag-owner-followup-report.json");
    await writeFile(file, JSON.stringify(report, null, 2));
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  }
}

main();
