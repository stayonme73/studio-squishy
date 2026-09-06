/**
 * Builder QA — phone Checkout presentation flatten.
 * Does not complete sandbox payment. Does not change production.
 *
 * Usage: node scripts/mobile-checkout-presentation-qa.mjs
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
  report.steps.push("checkout");
}

function mayaCheckoutSeed() {
  const now = new Date().toISOString();
  const opening = {
    preferredName: "Maya",
    projectNeed: "Social media graphics",
    businessName: "Maya’s Mobile Boutique",
    requestedDeadline: "Within 2 weeks",
    deadlineStatus: "unconfirmed",
    existingMaterialsNote: "Nothing yet",
    confirmedAt: now,
  };
  return {
    draft: {
      version: 1,
      status: "working_draft",
      editable: true,
      updatedAt: now,
      revision: 4,
      cursor: {
        conversationLocation: "conversation-room-stage:checkout",
        flowStep: "checkout",
        journeyPhase: "conversation",
      },
      attribution: [],
      slices: {
        discoveryAnswers: opening,
        currentConversationLocation: "conversation-room-stage:checkout",
        routeRecommendation: {
          roadId: "i20",
          projectNeed: opening.projectNeed,
          recommendedAt: now,
        },
        customerSelectedRoute: { roadId: "i20", selectedAt: now },
        selectedServices: [
          { jobId: "v2-rtu-flyer", roadId: "i20", addedAt: now },
        ],
      },
    },
    guide: {
      schemaVersion: 1,
      ...opening,
      source: "lobby-guide-conversation",
    },
  };
}

async function seedCheckout(page, { sandboxQuery }) {
  const seed = mayaCheckoutSeed();
  await page.addInitScript(({ draft, guide }) => {
    localStorage.setItem("studio-squishy:working-draft:v1", JSON.stringify(draft));
    localStorage.setItem("studio-guide:capture-draft:v1", JSON.stringify(guide));
    sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    sessionStorage.removeItem("studio-voice:first-entry-choice:v1");
    document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
  }, seed);
  const query = sandboxQuery ? "&studioPaymentSandbox=1" : "";
  await page.goto(
    `${BASE}/studio-conversation-room?stage=checkout${query}`,
    { waitUntil: "load", timeout: 60000 },
  );
  await page.waitForSelector('[data-checkout-pay="continue"]', { timeout: 25000 });
}

async function layoutState(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    const pageSurface = document.querySelector(
      '[data-checkout-surface="page-content"]',
    );
    const hostSurface = document.querySelector('[data-checkout-surface="host"]');
    const panel = document.querySelector("[data-name-question-panel]");
    const cards = Array.from(document.querySelectorAll(".co-card")).map((el) => {
      const s = getComputedStyle(el);
      return {
        background: s.backgroundColor,
        backdropFilter: s.backdropFilter,
        boxShadow: s.boxShadow,
        borderTopWidth: s.borderTopWidth,
      };
    });
    const continueCta = document.querySelector('[data-checkout-pay="continue"]');
    const continueStyle = continueCta ? getComputedStyle(continueCta) : null;
    const terms = document.querySelector('[data-checkout-terms="1"]');
    const sandbox = document.querySelector(
      '[data-developer-fixture="sandbox-confirm"]',
    );
    const sandboxBtn = sandbox?.querySelector("button");
    const doc = document.scrollingElement;
    return {
      headingCheckout: /Checkout/i.test(text),
      promote: /Promote Something Now/i.test(text),
      flyer: /Make Me a Flyer/i.test(text),
      sixtyNine: /\$69/.test(text),
      lounge: Boolean(document.querySelector("[data-studio-environment-shell]")),
      frost: Boolean(document.querySelector("[data-studio-environment-frost]")),
      pageSurface: Boolean(pageSurface),
      hostSurface: Boolean(hostSurface),
      pageOverflow: pageSurface ? getComputedStyle(pageSurface).overflow : null,
      pageOverflowY: pageSurface ? getComputedStyle(pageSurface).overflowY : null,
      panelOverflowY: panel ? getComputedStyle(panel).overflowY : null,
      panelScrollTop: panel instanceof HTMLElement ? panel.scrollTop : null,
      docScrollTop: doc instanceof HTMLElement ? doc.scrollTop : window.scrollY,
      cards,
      continueClass: continueCta?.className ?? null,
      continueText: continueCta?.textContent?.trim() ?? null,
      continueBackground: continueStyle?.backgroundColor ?? null,
      termsChecked: terms instanceof HTMLInputElement ? terms.checked : null,
      sandboxVisible: Boolean(sandbox),
      sandboxLabel: Boolean(
        sandbox && /Test pay with sandbox confirm/i.test(sandbox.textContent || ""),
      ),
      sandboxDisabled:
        sandboxBtn instanceof HTMLButtonElement ? sandboxBtn.disabled : null,
      sandboxQuery: /studioPaymentSandbox=1/.test(window.location.search),
      error: document.querySelector('[role="alert"]')?.textContent?.trim() || null,
    };
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = {
    ok: false,
    checks: {},
    proofs: [],
    steps: [],
    api: { checkoutSession: [] },
    pageErrors: [],
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
  page.on("request", (request) => {
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
      if (!report.api.checkoutSession.length) {
        report.api.checkoutSession.push(last);
      } else {
        Object.assign(report.api.checkoutSession.at(-1), last);
      }
    }
  });

  try {
    await walkToCheckout(page, report);
    await sleep(800);
    const opened = await layoutState(page);
    report.proofs.push(await shot(page, "checkout-present-01-top.png"));
    report.opened = opened;
    report.checks.opensAtTop =
      opened.docScrollTop === 0 && opened.panelScrollTop === 0;
    report.checks.planCorrect =
      opened.headingCheckout &&
      opened.promote &&
      opened.flyer &&
      opened.sixtyNine;
    report.checks.threeLayerShell = opened.lounge && opened.frost;
    report.checks.noNestedHostSurface =
      opened.pageSurface === true && opened.hostSurface === false;
    report.checks.pageSurfaceDoesNotOwnScroll =
      opened.pageOverflow !== "auto" &&
      opened.pageOverflowY !== "auto" &&
      opened.pageOverflowY !== "scroll";
    report.checks.cardsFlattened = opened.cards.every(
      (card) =>
        card.backdropFilter === "none" &&
        (card.boxShadow === "none" || card.boxShadow === ""),
    );
    report.checks.continueIsDenimCta =
      /lobby-entry-film__cta/.test(opened.continueClass || "") &&
      /Continue to secure checkout/i.test(opened.continueText || "");
    report.checks.sandboxVisibleAuthorized =
      opened.sandboxVisible && opened.sandboxLabel && opened.sandboxQuery;
    report.checks.sandboxDisabledUntilTerms = opened.sandboxDisabled === true;

    await page.locator('[data-checkout-pay="continue"]').click();
    await sleep(500);
    const withoutTerms = await layoutState(page);
    report.checks.continueWithoutTermsBlocked =
      Boolean(withoutTerms.error) && withoutTerms.sandboxDisabled === true;

    await page.locator('[data-checkout-terms="1"]').check();
    const withTerms = await layoutState(page);
    report.checks.checkboxWorks = withTerms.termsChecked === true;
    report.checks.sandboxEnabledAfterTerms = withTerms.sandboxDisabled === false;

    await page.locator('[data-checkout-pay="continue"]').scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "checkout-present-02-actions.png"));
    await Promise.all([
      page
        .waitForResponse(
          (response) =>
            response.url().includes("/api/payments/checkout-session") &&
            response.request().method() === "POST",
          { timeout: 15000 },
        )
        .catch(() => null),
      page.evaluate(() => {
        document
          .querySelector('[data-checkout-pay="continue"]')
          ?.closest("form")
          ?.requestSubmit();
      }),
    ]);
    await sleep(800);
    const stripeAttempt = await layoutState(page);
    report.stripeAttemptError = stripeAttempt.error;
    report.proofs.push(await shot(page, "checkout-present-03-continue-unconfigured.png"));
    report.checks.continueNotSandbox =
      report.api.checkoutSession.length > 0 &&
      report.api.checkoutSession.every((row) => row.preferSandbox !== true);
    report.checks.continueNeedsProcessor = Boolean(
      stripeAttempt.error &&
        /card payment is not ready|could not open|try again later/i.test(
          stripeAttempt.error,
        ),
    );
    report.checks.continueDidNotMarkPaid = stripeAttempt.sandboxVisible === true;
    report.checks.sandboxRemainsSeparate = stripeAttempt.sandboxLabel === true;

    await page.getByRole("button", { name: /Back to Studio Plan/i }).click();
    await page.waitForTimeout(1500);
    const back = await page.evaluate(() => document.body.innerText);
    report.proofs.push(await shot(page, "checkout-present-04-back-to-plan.png"));
    report.checks.backToPlan =
      /Make Me a Flyer/i.test(back) &&
      /\$69/.test(back) &&
      /Promote Something Now/i.test(back) &&
      /Continue to Checkout/i.test(back);

    const noSandboxPage = await context.newPage();
    noSandboxPage.setDefaultTimeout(25000);
    await seedCheckout(noSandboxPage, { sandboxQuery: false });
    const withoutQuery = await layoutState(noSandboxPage);
    report.proofs.push(await shot(noSandboxPage, "checkout-present-05-no-sandbox-query.png"));
    report.checks.sandboxHiddenWithoutQuery =
      withoutQuery.sandboxVisible === false && withoutQuery.sandboxQuery === false;
    await noSandboxPage.close();

    const failed = Object.entries(report.checks).filter(([, value]) => !value);
    report.ok = failed.length === 0 && report.pageErrors.length === 0;
    report.failed = failed.map(([key]) => key);
  } catch (error) {
    report.ok = false;
    report.error = String(error);
  } finally {
    await writeFile(
      path.join(OUT, "checkout-present-report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    await browser.close();
  }

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
