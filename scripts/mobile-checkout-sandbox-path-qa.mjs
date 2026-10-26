/**
 * Builder QA: restore Customer-One sandbox pay through to Intake.
 * Existing fixture only: ?studioPaymentSandbox=1 + Test pay with sandbox confirm.
 * Does not use a real card. Does not touch Maya. Does not merge.
 *
 * Usage: node scripts/mobile-checkout-sandbox-path-qa.mjs
 * Requires HTTPS Studio on localhost:3000.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

async function shot(page, name) {
  const file = path.join(OUT, name);
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
    /* Keyboard missed — hydrated pointerdown. */
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
  const clicked = await page.evaluate((chipLabel) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const el = buttons.find((btn) => btn.textContent?.trim() === chipLabel);
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "touch",
      }),
    );
    return true;
  }, label);
  if (!clicked) {
    throw new Error(`chip not found: ${label}`);
  }
  await page.waitForTimeout(300);
}

async function clickContinueToCheckout(page) {
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
        clientX: 180,
        clientY: 600,
      }),
    );
    el.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "touch",
        clientX: 180,
        clientY: 600,
      }),
    );
  });
}

async function walkToCheckout(page, report) {
  await page.goto(`${BASE}/lobby-entry/begin-new?studioPaymentSandbox=1`, {
    waitUntil: "load",
    timeout: 60000,
  });
  await page.waitForSelector('[data-voice-choice-action="off"]', {
    timeout: 30000,
  });
  report.steps.push("voice-choice");
  await chooseFillItOutMyself(page);
  await page.locator("#studio-guide-type-field").waitFor({
    state: "visible",
    timeout: 20000,
  });
  report.steps.push("fill-it-out-myself");
  await page.locator("#studio-guide-type-field").fill("Sandbox QA");
  await activateNamed(page, "Continue");
  report.steps.push("name");
  await chooseChip(page, "Social media graphics");
  await activateNamed(page, "Continue");
  report.steps.push("need");
  await page.locator("#studio-guide-type-field").fill("Sandbox Path Studio");
  await activateNamed(page, "Continue");
  report.steps.push("business");
  await chooseChip(page, "Within 2 weeks");
  await activateNamed(page, "Continue");
  report.steps.push("deadline");
  await chooseChip(page, "Nothing yet");
  await activateNamed(page, "Continue");
  report.steps.push("materials");
  await page
    .getByRole("button", { name: /Yes, this is correct|Looks good/i })
    .waitFor({ timeout: 20000 });
  await pointerActivate(
    page.getByRole("button", { name: /Yes, this is correct|Looks good/i }),
  );
  report.steps.push("summary");
  const promote = page.getByRole("button", { name: /Promote Something Now/i }).first();
  await promote.waitFor({ state: "visible", timeout: 20000 });
  await pointerActivate(promote);
  const routeContinue = page.getByRole("button", { name: /Continue with/i }).first();
  await routeContinue.waitFor({ timeout: 20000 });
  await pointerActivate(routeContinue);
  report.steps.push("route");
  await page.getByText("Make Me a Flyer", { exact: true }).first().waitFor({
    timeout: 20000,
  });
  await pointerActivate(page.getByRole("button", { name: /Add to Project/i }).first());
  report.steps.push("add-flyer");
  await pointerActivate(
    page.getByRole("button", { name: /Review Studio Plan/i }).first(),
  );
  report.steps.push("plan");
  await page.waitForTimeout(1500);
  await clickContinueToCheckout(page);
  await page.waitForSelector('[data-checkout-pay="continue"]', { timeout: 25000 });
  report.steps.push("checkout");
}

function attachPaymentSpies(page, report) {
  page.on("request", (request) => {
    if (request.url().includes("stripe.com")) {
      report.stripeHostRequests.push(request.url().slice(0, 180));
    }
    if (
      request.url().includes("/api/payments/checkout-session") &&
      request.method() === "POST"
    ) {
      let preferSandbox = null;
      try {
        const body = JSON.parse(request.postData() || "{}");
        preferSandbox = body.preferSandbox === true;
      } catch {
        preferSandbox = "unparsed";
      }
      report.api.checkoutSession.push({ preferSandbox });
    }
    if (
      request.url().includes("/api/payments/sandbox-confirm") &&
      request.method() === "POST"
    ) {
      report.api.sandboxConfirm.push({ requested: true });
    }
  });
  page.on("response", async (response) => {
    if (
      response.url().includes("/api/payments/checkout-session") &&
      response.request().method() === "POST"
    ) {
      const body = await response.json().catch(() => ({}));
      const last = report.api.checkoutSession.at(-1) || {};
      last.status = response.status();
      last.error = body.error ?? null;
      last.mode = body.mode ?? null;
      last.checkoutSessionIdPrefix = String(body.checkoutSessionId || "").slice(
        0,
        12,
      );
      if (!report.api.checkoutSession.length) {
        report.api.checkoutSession.push(last);
      } else {
        Object.assign(report.api.checkoutSession.at(-1), last);
      }
    }
    if (
      response.url().includes("/api/payments/sandbox-confirm") &&
      response.request().method() === "POST"
    ) {
      const body = await response.json().catch(() => ({}));
      const last = report.api.sandboxConfirm.at(-1) || {};
      last.status = response.status();
      last.ok = body.ok === true;
      last.paid = Boolean(body.campaign?.paymentReceivedAt);
      last.sandbox = body.campaign?.paymentTruth?.sandbox === true;
      if (!report.api.sandboxConfirm.length) {
        report.api.sandboxConfirm.push(last);
      } else {
        Object.assign(report.api.sandboxConfirm.at(-1), last);
      }
    }
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = {
    ok: false,
    steps: [],
    stripeHostRequests: [],
    api: { checkoutSession: [], sandboxConfirm: [] },
    continueWithoutSandbox: null,
    sandboxPath: null,
    proofs: [],
  };
  const contextOptions = {
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  };

  try {
    const ctx = await browser.newContext(contextOptions);
    const page = await ctx.newPage();
    page.setDefaultTimeout(25000);
    attachPaymentSpies(page, report);
    await walkToCheckout(page, report);
    report.proofs.push(await shot(page, "sandbox-path-01-checkout.png"));

    const continueCta = page.locator('[data-checkout-pay="continue"]').first();
    await continueCta.waitFor({ state: "visible" });
    const terms = page.locator('[data-checkout-terms="1"]').first();
    await terms.check({ force: true });
    await page.waitForTimeout(400);

    const sandboxBtn = page
      .locator('[data-developer-fixture="sandbox-confirm"] button')
      .first();
    const sandboxVisible = await sandboxBtn.isVisible().catch(() => false);
    report.sandboxPath = {
      query: await page.evaluate(() =>
        /studioPaymentSandbox=1/.test(window.location.search),
      ),
      sandboxVisible,
    };
    if (!sandboxVisible) {
      report.proofs.push(await shot(page, "sandbox-path-02-missing-fixture.png"));
      throw new Error("Test pay with sandbox confirm was not visible");
    }

    await continueCta.click({ timeout: 8000 }).catch(async () => {
      await continueCta.tap({ force: true });
    });
    await page.waitForTimeout(1500);
    const continueError = await page.evaluate(
      () => document.querySelector('[role="alert"]')?.textContent?.trim() || null,
    );
    report.continueWithoutSandbox = {
      error: continueError,
      stillOnCheckout: await page.locator('[data-checkout-pay="continue"]').count(),
      preferSandbox: report.api.checkoutSession.some((row) => row.preferSandbox === true),
      continueCalledWithoutSandbox: report.api.checkoutSession.some(
        (row) => row.preferSandbox === false,
      ),
    };
    report.proofs.push(await shot(page, "sandbox-path-02-continue-unconfigured.png"));

    await sandboxBtn.scrollIntoViewIfNeeded();
    const confirmWait = page.waitForResponse(
      (response) =>
        response.url().includes("/api/payments/sandbox-confirm") &&
        response.request().method() === "POST",
      { timeout: 25000 },
    );
    await pointerActivate(sandboxBtn);
    const confirmResponse = await confirmWait;
    const confirmBody = await confirmResponse.json().catch(() => ({}));
    report.api.sandboxConfirm.push({
      status: confirmResponse.status(),
      ok: confirmBody.ok === true,
      paid: Boolean(confirmBody.campaign?.paymentReceivedAt),
      sandbox: confirmBody.campaign?.paymentTruth?.sandbox === true,
    });
    await page.waitForSelector('[data-panel="intake"]', { timeout: 25000 });
    report.steps.push("intake");
    report.proofs.push(await shot(page, "sandbox-path-03-intake.png"));
    report.sandboxPath.intakeText = await page.evaluate(() => {
      const text = document.body.innerText.replace(/\s+/g, " ");
      return {
        intake: Boolean(document.querySelector('[data-panel="intake"]')),
        paymentReceived: /Payment received|Payment confirmed/i.test(text),
        cardNotReady: /Card payment is not ready yet/i.test(text),
      };
    });
    await ctx.close();

    const sandboxSessions = report.api.checkoutSession.filter(
      (row) => row.preferSandbox === true,
    );
    const stripeSessions = report.api.checkoutSession.filter(
      (row) => row.preferSandbox === false,
    );
    report.ok = Boolean(
      report.sandboxPath?.query &&
        report.sandboxPath?.sandboxVisible &&
        report.sandboxPath?.intakeText?.intake &&
        sandboxSessions.some((row) => row.mode === "sandbox") &&
        sandboxSessions.every((row) =>
          String(row.checkoutSessionIdPrefix || "").startsWith("cs_sandbox"),
        ) &&
        report.api.sandboxConfirm.some((row) => row.ok && row.sandbox && row.paid) &&
        stripeSessions.some((row) => row.error === "processor_not_configured") &&
        report.stripeHostRequests.length === 0,
    );
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    report.ok = false;
  } finally {
    await writeFile(
      path.join(OUT, "sandbox-path-report.json"),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

await main();
