/**
 * Builder QA — sandbox payment from the accepted Maya $69 plan.
 * Does not add delay to the customer flow. Does not use a real card.
 *
 * Usage: node scripts/mobile-sandbox-payment-qa.mjs
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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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

async function pageExcerpt(page) {
  return page.evaluate(() => {
    const heading = document.querySelector(
      "h1, h2, [data-voice-choice-film]",
    )?.textContent?.trim();
    return {
      url: location.href,
      heading: heading?.slice(0, 120) ?? null,
      text: (document.body?.innerText || "").replace(/\s+/g, " ").slice(0, 500),
    };
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
    /* Keyboard missed — hydrated pointerdown, same as checkout builder QA. */
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
  await page.locator("#studio-guide-type-field").fill("Maya");
  await activateNamed(page, "Continue");
  report.steps.push("name");
  await chooseChip(page, "Social media graphics");
  await activateNamed(page, "Continue");
  report.steps.push("need");
  await page.locator("#studio-guide-type-field").fill("Maya’s Mobile Boutique");
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
  await page
    .locator('[data-developer-fixture="sandbox-confirm"]')
    .waitFor({ state: "attached", timeout: 15000 });
  report.steps.push("checkout");
}

async function checkoutState(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    const terms = document.querySelector('[data-checkout-terms="1"]');
    const sandbox = document.querySelector(
      '[data-developer-fixture="sandbox-confirm"]',
    );
    const continueCta = document.querySelector('[data-checkout-pay="continue"]');
    const doc = document.scrollingElement;
    let campaign = null;
    try {
      campaign = JSON.parse(
        window.localStorage.getItem("studio-squishy:current-campaign") || "null",
      );
    } catch {
      campaign = null;
    }
    const serviceIds = campaign?.approvedStudioPlan?.selectedServiceIds ?? [];
    return {
      headingCheckout: /Checkout/i.test(text),
      promote:
        /Promote Something Now/i.test(text) || campaign?.routeMapContext?.roadId === "i20",
      flyer:
        /Make Me a Flyer/i.test(text) ||
        (Array.isArray(serviceIds) && serviceIds.includes("v2-rtu-flyer")),
      sixtyNine:
        /\$69/.test(text) || campaign?.approvedStudioPlan?.amountDueTodayCents === 6900,
      voiceOff:
        window.sessionStorage.getItem("studio-voice:narration-preference:v1") ===
        "off",
      sandboxVisible: Boolean(sandbox),
      sandboxLabel: Boolean(
        sandbox && /Test pay with sandbox confirm/i.test(sandbox.textContent || ""),
      ),
      continueLabel: continueCta?.textContent?.trim() || null,
      termsChecked: terms instanceof HTMLInputElement ? terms.checked : null,
      intake: Boolean(document.querySelector('div[data-panel="intake"]')),
      intakeCopy: /Project Intake/i.test(text),
      paidCopy: /Payment confirmed|Payment received|Checkout confirmed/i.test(
        text,
      ),
      unpaidHonesty: /marks your project paid only after Stripe confirms/i.test(
        text,
      ),
      error: document.querySelector('[role="alert"]')?.textContent?.trim() || null,
      docScrollTop: doc instanceof HTMLElement ? doc.scrollTop : window.scrollY,
      sandboxQuery: /studioPaymentSandbox=1/.test(window.location.search),
      campaignPaid: Boolean(campaign?.paymentReceivedAt),
      campaignId: campaign?.campaignId ?? null,
      campaignName: campaign?.campaignName ?? null,
      amountDue: campaign?.approvedStudioPlan?.amountDueTodayCents ?? null,
      selectedServiceIds: serviceIds,
      roadId: campaign?.routeMapContext?.roadId ?? null,
      voicePreference: window.sessionStorage.getItem(
        "studio-voice:narration-preference:v1",
      ),
    };
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = {
    ok: false,
    audit: {
      provider: "stripe_hosted_checkout_plus_local_sandbox_fixture",
      stripeKeysInEnv: false,
      sandboxParam:
        "Shows Developer Sandbox fixture; Continue still tries Stripe hosted Checkout",
    },
    checks: {},
    proofs: [],
    steps: [],
    api: { checkoutSession: [], sandboxConfirm: [] },
    pageErrors: [],
    liveWalkAt: null,
  };
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  page.on("pageerror", (error) =>
    report.pageErrors.push(String(error).slice(0, 400)),
  );
  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/api/payments/checkout-session") && response.request().method() === "POST") {
      const body = await response.json().catch(() => ({}));
      report.api.checkoutSession.push({
        status: response.status(),
        mode: body.mode ?? null,
        error: body.error ?? null,
        sandboxConfirmRequired: body.sandboxConfirmRequired ?? null,
      });
    }
    if (url.includes("/api/payments/sandbox-confirm") && response.request().method() === "POST") {
      const body = await response.json().catch(() => ({}));
      report.api.sandboxConfirm.push({
        status: response.status(),
        ok: body.ok ?? false,
        alreadyPaid: body.alreadyPaid ?? null,
        paidAt: Boolean(body.campaign?.paymentReceivedAt),
      });
    }
  });

  try {
    await walkToCheckout(page, report);
    await page.locator('[data-developer-fixture="sandbox-confirm"]').scrollIntoViewIfNeeded();
    const opened = await checkoutState(page);
    report.proofs.push(await shot(page, "pay-qa-01-checkout-top.png"));
    report.checks.opensAtTop = opened.docScrollTop === 0;
    report.checks.planCorrect =
      opened.headingCheckout &&
      opened.promote &&
      opened.flyer &&
      opened.sixtyNine &&
      opened.voiceOff;
    report.checks.sandboxFixtureVisible =
      opened.sandboxVisible && opened.sandboxLabel && opened.sandboxQuery;
    report.checks.unpaidOnOpen = opened.campaignPaid === false;

    await page.locator('[data-checkout-pay="continue"]').click();
    await sleep(500);
    const withoutTerms = await checkoutState(page);
    report.proofs.push(await shot(page, "pay-qa-02-continue-without-terms.png"));
    report.checks.continueWithoutTermsBlocked =
      withoutTerms.campaignPaid === false &&
      !withoutTerms.intake &&
      Boolean(withoutTerms.error);
    report.checks.sandboxDisabledWithoutTerms = await page.evaluate(() => {
      const btn = document.querySelector(
        '[data-developer-fixture="sandbox-confirm"] button',
      );
      return btn instanceof HTMLButtonElement && btn.disabled === true;
    });

    await page.getByRole("button", { name: /Back to Studio Plan/i }).click();
    await page.waitForTimeout(1500);
    const back = await page.evaluate(() => document.body.innerText);
    report.proofs.push(await shot(page, "pay-qa-03-back-to-plan.png"));
    report.checks.backBeforePayKeepsPlan =
      /Make Me a Flyer/i.test(back) &&
      /\$69/.test(back) &&
      /Promote Something Now/i.test(back) &&
      /Continue to Checkout/i.test(back);

    await clickContinueToCheckout(page);
    await page.locator('[data-checkout-pay="continue"]').waitFor({
      state: "visible",
      timeout: 15000,
    });
    await page.reload({ waitUntil: "load", timeout: 60000 });
    await page.locator('[data-checkout-pay="continue"]').waitFor({
      state: "visible",
      timeout: 20000,
    });
    await page
      .locator('[data-developer-fixture="sandbox-confirm"]')
      .waitFor({ state: "attached", timeout: 15000 });
    const afterReloadUnpaid = await checkoutState(page);
    report.proofs.push(await shot(page, "pay-qa-04-refresh-before-pay.png"));
    report.checks.refreshBeforePayStillUnpaid =
      afterReloadUnpaid.campaignPaid === false &&
      afterReloadUnpaid.sandboxVisible === true &&
      afterReloadUnpaid.intake === false;

    await page.locator('[data-checkout-terms="1"]').check();
    await page.locator('[data-checkout-pay="continue"]').click();
    await sleep(1500);
    const stripeAttempt = await checkoutState(page);
    report.proofs.push(await shot(page, "pay-qa-05-continue-stripe-unconfigured.png"));
    report.checks.continueStripeDoesNotMarkPaid =
      stripeAttempt.campaignPaid === false && stripeAttempt.intake === false;
    report.checks.continueStripeNeedsProcessor = Boolean(
      stripeAttempt.error && /card payment is not ready|could not open|try again later/i.test(
        stripeAttempt.error,
      ),
    );

    const sandboxBtn = page
      .locator('[data-developer-fixture="sandbox-confirm"] button')
      .first();
    await sandboxBtn.click();
    await sandboxBtn.click().catch(() => {});
    await page.locator('div[data-panel="intake"]').waitFor({
      state: "visible",
      timeout: 20000,
    });
    const afterPay = await checkoutState(page);
    report.proofs.push(await shot(page, "pay-qa-06-after-sandbox-intake.png"));
    report.checks.sandboxOpensIntake =
      afterPay.intake === true && afterPay.intakeCopy === true;
    report.checks.paidCopyAfterSuccess = afterPay.paidCopy === true;
    report.checks.paidOnlyAfterSandboxConfirm =
      afterPay.campaignPaid === true && afterPay.amountDue === 6900;
    report.checks.stateSurvivesPay =
      afterPay.promote &&
      afterPay.flyer &&
      afterPay.sixtyNine &&
      afterPay.voiceOff &&
      afterPay.roadId === "i20" &&
      afterPay.amountDue === 6900;

    await page.reload({ waitUntil: "load", timeout: 60000 });
    await page.locator('div[data-panel="intake"]').waitFor({
      state: "visible",
      timeout: 20000,
    });
    const afterRefreshPaid = await checkoutState(page);
    report.proofs.push(await shot(page, "pay-qa-07-refresh-after-pay.png"));
    report.checks.refreshAfterPayStaysPaid =
      afterRefreshPaid.campaignPaid === true &&
      afterRefreshPaid.intake === true &&
      afterRefreshPaid.amountDue === 6900;

    report.checks.sandboxSessionWasSandbox = report.api.checkoutSession.some(
      (row) => row.mode === "sandbox" && row.sandboxConfirmRequired === true,
    );
    report.checks.sandboxConfirmWrotePaid = report.api.sandboxConfirm.some(
      (row) => row.ok === true && row.paidAt === true,
    );
    report.checks.duplicateConfirmIdempotent =
      report.api.sandboxConfirm.length <= 2 &&
      report.api.sandboxConfirm.every(
        (row) => row.ok === true || row.alreadyPaid === true,
      );

    report.ok =
      report.checks.opensAtTop === true &&
      report.checks.planCorrect === true &&
      report.checks.sandboxFixtureVisible === true &&
      report.checks.unpaidOnOpen === true &&
      report.checks.continueWithoutTermsBlocked === true &&
      report.checks.backBeforePayKeepsPlan === true &&
      report.checks.refreshBeforePayStillUnpaid === true &&
      report.checks.continueStripeDoesNotMarkPaid === true &&
      report.checks.sandboxOpensIntake === true &&
      report.checks.paidOnlyAfterSandboxConfirm === true &&
      report.checks.stateSurvivesPay === true &&
      report.checks.refreshAfterPayStaysPaid === true &&
      report.checks.sandboxSessionWasSandbox === true &&
      report.checks.sandboxConfirmWrotePaid === true &&
      report.checks.sandboxDisabledWithoutTerms === true &&
      report.checks.paidCopyAfterSuccess === true &&
      report.checks.duplicateConfirmIdempotent === true &&
      report.checks.continueStripeNeedsProcessor === true;
  } catch (error) {
    report.ok = false;
    report.pageErrors.push(String(error).slice(0, 1200));
    report.liveWalkAt = await pageExcerpt(page).catch(() => null);
    report.proofs.push(await shot(page, "pay-qa-fail.png").catch(() => null));
  } finally {
    await writeFile(
      path.join(OUT, "pay-qa-report.json"),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main();
