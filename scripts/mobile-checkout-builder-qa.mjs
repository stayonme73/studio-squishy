/**
 * Builder QA for Mobile Checkout button hierarchy.
 * Does not change production. Does not add inspection delay to the customer flow.
 *
 * Usage: node scripts/mobile-checkout-builder-qa.mjs
 * Requires the HTTPS Studio dev server on 127.0.0.1:3000.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const OUT_DIR = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

const DENIM = "rgb(84, 124, 146)";
const IVORY = "rgb(247, 244, 238)";
const EUCALYPTUS = "rgb(69, 107, 90)";

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

async function pageExcerpt(page) {
  return page.evaluate(() => {
    const heading = document.querySelector("h1, h2, [data-voice-choice-film]")?.textContent?.trim();
    return {
      url: location.href,
      heading: heading?.slice(0, 120) ?? null,
      text: (document.body?.innerText || "").replace(/\s+/g, " ").slice(0, 400),
    };
  });
}

function checkoutSeed() {
  const now = new Date().toISOString();
  const opening = {
    preferredName: "QA",
    projectNeed: "Marketing materials",
    businessName: "Personal project",
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

async function seedCheckout(page) {
  const seed = checkoutSeed();
  await page.addInitScript(({ draft, guide }) => {
    localStorage.setItem("studio-squishy:working-draft:v1", JSON.stringify(draft));
    localStorage.setItem("studio-guide:capture-draft:v1", JSON.stringify(guide));
    sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    sessionStorage.removeItem("studio-voice:first-entry-choice:v1");
    document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
  }, seed);
  await page.goto(
    `${BASE}/studio-conversation-room?stage=checkout&studioPaymentSandbox=1`,
    { waitUntil: "load", timeout: 60000 },
  );
  await page.waitForTimeout(1800);
  const continueSel = "[data-checkout-pay=continue]";
  const found = await page.locator(continueSel).count();
  if (!found) {
    await shot(page, "checkout-qa-seed-miss.png");
    const excerpt = await pageExcerpt(page);
    throw new Error(`seeded checkout missing continue CTA: ${JSON.stringify(excerpt)}`);
  }
  await waitForHydrated(page, continueSel).catch(() => {});
}

async function liveWalk(page, report) {
  await page.goto(`${BASE}/lobby-entry/begin-new?studioPaymentSandbox=1`, {
    waitUntil: "load",
    timeout: 60000,
  });
  await page.waitForSelector("[data-voice-choice-action=off]", { timeout: 30000 });
  report.steps.push("voice-choice");
  await shot(page, "checkout-qa-01-voice-choice.png");

  await chooseFillItOutMyself(page);
  await page.locator("#studio-guide-type-field").waitFor({ state: "visible", timeout: 20000 });
  report.steps.push("fill-it-out-myself");

  await page.locator("#studio-guide-type-field").fill("QA");
  await activateNamed(page, "Continue");
  report.steps.push("name");

  await chooseChip(page, "Marketing materials");
  await activateNamed(page, "Continue");
  report.steps.push("need");

  await chooseChip(page, "Personal project");
  await activateNamed(page, "Continue");
  report.steps.push("business");

  await chooseChip(page, "Within 2 weeks");
  await activateNamed(page, "Continue");
  report.steps.push("deadline");

  await chooseChip(page, "Nothing yet");
  await activateNamed(page, "Continue");
  report.steps.push("materials");

  await page.getByRole("button", { name: /Yes, this is correct|Looks good/i }).waitFor({ timeout: 20000 });
  await pointerActivate(page.getByRole("button", { name: /Yes, this is correct|Looks good/i }));
  report.steps.push("summary");
  await shot(page, "checkout-qa-02-route.png");

  const promote = page.getByRole("button", { name: /Promote Something Now/i }).first();
  if (await promote.count()) {
    await pointerActivate(promote);
  }
  const routeContinue = page.getByRole("button", { name: /Continue with/i }).first();
  await routeContinue.waitFor({ timeout: 20000 });
  await pointerActivate(routeContinue);
  report.steps.push("route");
  await shot(page, "checkout-qa-03-services.png");

  const flyer = page.getByText("Make Me a Flyer", { exact: true }).first();
  await flyer.waitFor({ timeout: 20000 });
  await flyer.scrollIntoViewIfNeeded();
  const add = page.getByRole("button", { name: /Add to Project/i }).first();
  await add.waitFor({ timeout: 15000 });
  await pointerActivate(add);
  report.steps.push("add-flyer");

  const review = page.getByRole("button", { name: /Review Studio Plan/i }).first();
  await review.waitFor({ timeout: 15000 });
  await pointerActivate(review);
  report.steps.push("plan");
  await page.waitForTimeout(1500);

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
  await page.waitForSelector("[data-checkout-pay=continue]", { timeout: 25000 });
  report.steps.push("checkout");
}

async function captureCheckoutProof(page, report) {
  await shot(page, "checkout-qa-04-checkout-top.png");
  const continueBtn = page.locator("[data-checkout-pay=continue]").first();
  await continueBtn.scrollIntoViewIfNeeded();
  await shot(page, "checkout-qa-05-continue-cta.png");
  report.continueButton = await continueBtn.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      tag: el.tagName,
      className: el.className,
      text: el.textContent?.trim(),
      background: s.backgroundColor,
      color: s.color,
      minHeight: s.minHeight,
      fontWeight: s.fontWeight,
      disabled: el.getAttribute("aria-disabled"),
    };
  });

  const back = page.getByRole("button", { name: /Back to Studio Plan/i }).first();
  report.backLink = await back.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      className: el.className,
      text: el.textContent?.trim(),
      background: s.backgroundColor,
      color: s.color,
      fontWeight: s.fontWeight,
    };
  });
  await back.scrollIntoViewIfNeeded();
  await shot(page, "checkout-qa-06-back-link.png");

  await pointerActivate(continueBtn);
  await page.waitForTimeout(500);
  report.confirmGuard = await page.evaluate(() => {
    const alert = document.querySelector("[role=alert]");
    const terms = document.querySelector("[data-checkout-terms]");
    const pay = document.querySelector("[data-checkout-pay=continue]");
    return {
      termsChecked: terms instanceof HTMLInputElement ? terms.checked : null,
      alertText: alert?.textContent?.trim() ?? null,
      stillOnCheckout: Boolean(pay),
      url: location.href,
    };
  });
  await shot(page, "checkout-qa-07-confirm-guard.png");

  const primaryOk =
    report.continueButton?.tag === "A" &&
    report.continueButton?.background === DENIM &&
    report.continueButton?.color === IVORY &&
    /lobby-entry-film__cta/.test(report.continueButton?.className ?? "") &&
    /Continue to secure checkout/i.test(report.continueButton?.text ?? "");
  const secondaryOk =
    Boolean(report.backLink) &&
    report.backLink.background !== DENIM &&
    (report.backLink.background === "rgba(0, 0, 0, 0)" ||
      report.backLink.background === "transparent") &&
    /Back to Studio Plan/i.test(report.backLink.text ?? "") &&
    (report.backLink.color === EUCALYPTUS || report.backLink.color.includes("69, 107, 90"));
  const guardOk =
    report.confirmGuard?.termsChecked === false &&
    report.confirmGuard?.stillOnCheckout === true &&
    Boolean(report.confirmGuard?.alertText);

  report.primaryOk = primaryOk;
  report.secondaryOk = secondaryOk;
  report.guardOk = guardOk;
  report.ok = Boolean(primaryOk && secondaryOk && guardOk);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = {
    ok: false,
    pathUsed: null,
    steps: [],
    continueButton: null,
    backLink: null,
    confirmGuard: null,
  };

  const contextOptions = {
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
  };

  try {
    const live = await browser.newContext(contextOptions);
    const livePage = await live.newPage();
    livePage.setDefaultTimeout(20000);
    try {
      await liveWalk(livePage, report);
      report.pathUsed = "live-customer-walk";
      await captureCheckoutProof(livePage, report);
    } catch (error) {
      report.liveWalkError = error instanceof Error ? error.message : String(error);
      report.liveWalkAt = await pageExcerpt(livePage).catch(() => null);
      await shot(livePage, "checkout-qa-live-walk-stop.png").catch(() => null);
    } finally {
      await live.close();
    }

    if (!report.continueButton) {
      const seeded = await browser.newContext(contextOptions);
      const seededPage = await seeded.newPage();
      seededPage.setDefaultTimeout(20000);
      try {
        await seedCheckout(seededPage);
        report.pathUsed = "seeded-checkout-fallback";
        report.steps.push("seeded-checkout");
        await captureCheckoutProof(seededPage, report);
      } finally {
        await seeded.close();
      }
    }
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  } finally {
    const reportFile = path.join(OUT_DIR, "checkout-qa-report.json");
    await writeFile(reportFile, JSON.stringify(report, null, 2));
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  }
}

main();
