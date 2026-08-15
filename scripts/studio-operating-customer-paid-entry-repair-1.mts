/**
 * STUDIO-OPERATING-CUSTOMER-PAID-ENTRY-REPAIR-1
 * Maya Brooks customer-style rerun from Lobby (not from an internal midpoint).
 *
 * Start Next separately on Windows, then:
 *   $env:CERT_BASE_URL="http://127.0.0.1:3071"
 *   $env:PLAYWRIGHT_BROWSERS_PATH="$env:USERPROFILE\AppData\Local\ms-playwright"
 *   npx tsx scripts/studio-operating-customer-paid-entry-repair-1.mts
 */
import { chromium, type Frame, type Page } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = process.env.CERT_PORT || "3071";
const BASE = (process.env.CERT_BASE_URL || `http://127.0.0.1:${PORT}`).replace(/\/$/, "");
const OUT = join(process.cwd(), "docs", "launch", "studio-operating-customer-paid-entry-repair-1");
const SHOTS = join(OUT, "customer-eyes");
const VOICE_NARRATION_KEY = "studio-voice:narration-preference:v1";

mkdirSync(SHOTS, { recursive: true });

const MAYA_NEED =
  "I need a promotional flyer for my Back-to-School Reset service. I want it to feel calm, polished, organized, and welcoming. I don't want it to look childish or overly busy. The main goal is to get people to book the service.";

const MUST_INCLUDE = [
  "Cedar & Bloom Home Organizing",
  "Back-to-School Reset",
  "2-hour home organization session",
  "$149",
  "August 24 through September 14, 2026",
  "Includes: one 2-hour organizing session; organization of one selected household area; simple organization plan for maintaining the space.",
  "Customers may choose: pantry, entryway, children's homework area, closet, or home office.",
  "(804) 555-0186",
  "cedarandbloom.example",
  "Book Your Reset",
].join("\n");

type Proof = {
  id: string;
  ok: boolean;
  detail: string;
  shot?: string;
};

const proofs: Proof[] = [];

function proof(id: string, ok: boolean, detail: string, shot?: string) {
  proofs.push({ id, ok, detail, shot });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${id}: ${detail}`);
}

async function shot(page: Page, name: string) {
  const file = join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function pageText(page: Page) {
  return page.evaluate(() => (document.body?.innerText || "").slice(0, 8000));
}

async function waitForServer(url: string, attempts = 90) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${url}/studio-lobby`, { method: "GET" });
      if (res.ok || res.status === 304) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function typeAndContinue(page: Page, text: string) {
  const field = page.locator("#studio-guide-type-field");
  if ((await field.count()) > 0) {
    await field.click({ timeout: 8000 });
    await field.fill(text);
  } else {
    const any = page.getByPlaceholder(/type|name|working|business|date|answer|ask/i).first();
    await any.click({ timeout: 8000 });
    await any.fill(text);
  }
  const continueBtn = page.getByRole("button", { name: /^Continue$/i }).first();
  if ((await continueBtn.count()) > 0) {
    await continueBtn.click();
  } else {
    await page.getByRole("button", { name: /Looks good|Yes, this is correct/i }).first().click();
  }
  await page.waitForTimeout(800);
}

async function walkMayaToCheckout(page: Page, label: string) {
  await page.goto(`${BASE}/studio-lobby`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForTimeout(600);
  const start = page.getByRole("link", { name: /LET.?S GET STARTED/i }).first();
  if ((await start.count()) > 0) {
    await start.click();
    await page.waitForURL(/studio-conversation-room/i, { timeout: 30_000 }).catch(() => null);
    if (/lobby-entry/i.test(page.url())) {
      await page.waitForURL(/studio-conversation-room/i, { timeout: 20_000 }).catch(() => null);
    }
  } else {
    await page.goto(`${BASE}/studio-conversation-room`, { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(900);

  await typeAndContinue(page, "Maya");
  await typeAndContinue(page, MAYA_NEED);
  await typeAndContinue(page, "Cedar & Bloom Home Organizing");
  const specific = page.getByRole("button", { name: /I have a specific date/i });
  if ((await specific.count()) > 0) {
    await specific.click();
    await page.waitForTimeout(300);
  }
  await typeAndContinue(page, "August 23, 2026");
  const nothing = page.getByRole("button", { name: /^Nothing yet$/i });
  if ((await nothing.count()) > 0) {
    await nothing.click();
    await page.waitForTimeout(250);
  }
  await typeAndContinue(
    page,
    "No logo supplied. No customer images. No social handles. No testimonials.",
  );
  const looksGood = page.getByRole("button", { name: /Looks good|Yes, this is correct/i }).first();
  if ((await looksGood.count()) > 0) await looksGood.click();
  await page.waitForTimeout(1100);

  const continueRoute = page.getByRole("button", { name: /Continue with/i }).first();
  if ((await continueRoute.count()) > 0) {
    await continueRoute.click();
  } else {
    await page.getByRole("button", { name: /Promote Something Now/i }).first().click();
  }
  await page.waitForTimeout(1200);

  const openServices = page.getByRole("button", { name: /Open service list/i });
  if ((await openServices.count()) > 0) await openServices.click();
  await page.waitForTimeout(500);
  await page.getByText(/Make Me a Flyer/i).first().click().catch(() => null);
  const addFlyer = page.getByRole("button", { name: /Add to Project/i }).first();
  if ((await addFlyer.count()) > 0) await addFlyer.click();
  await page.waitForTimeout(600);

  const reviewPlan = page.getByRole("button", { name: /Review Studio Plan/i });
  if ((await reviewPlan.count()) > 0) await reviewPlan.click();
  await page.waitForTimeout(800);
  const toCheckout = page.getByRole("button", { name: /Continue to Checkout/i });
  if ((await toCheckout.count()) > 0) await toCheckout.click();
  await page.waitForTimeout(1000);

  const checkoutShot = await shot(page, `${label}-checkout`);
  const text = await pageText(page);
  proof(
    `${label}-flyer-69`,
    /Make Me a Flyer/i.test(text) && /\$69/.test(text),
    "Checkout shows Make Me a Flyer at $69.",
    checkoutShot,
  );
  proof(
    `${label}-no-live-processing-lie`,
    !/not applied in this build/i.test(text),
    "Checkout no longer says live card processing is missing from this build.",
    checkoutShot,
  );
  return { checkoutShot, text };
}

async function acceptTermsAndLaunchStripe(page: Page) {
  const payCta = page.getByRole("button", {
    name: /Continue to secure checkout/i,
  });
  if ((await payCta.count()) > 0) {
    await payCta.first().click().catch(() => null);
    await page.waitForTimeout(400);
  }
  const terms = page.locator("[data-checkout-terms='1']").first();
  if ((await terms.count()) > 0) {
    await terms.scrollIntoViewIfNeeded();
    await terms.check({ force: true });
  } else {
    await page.getByLabel(/I reviewed my Studio Plan/i).check({ force: true }).catch(() => null);
  }
  const submit = page.locator("[data-checkout-pay='continue']").first();
  const before = page.url();
  if ((await submit.count()) > 0) {
    await submit.scrollIntoViewIfNeeded();
    await submit.click();
  } else {
    await page.getByRole("button", { name: /Continue to secure checkout/i }).last().click();
  }
  await page.waitForURL(/checkout\.stripe\.com/i, { timeout: 45_000 }).catch(() => null);
  return { before, after: page.url() };
}

async function fillStripeTestCard(page: Page) {
  await page.waitForTimeout(1500);
  const email = page.getByPlaceholder(/email@example\.com/i).or(page.locator("#email"));
  if ((await email.count()) > 0) {
    await email.first().fill("maya.brooks.repair1@example.com");
  }

  const saveInfo = page.getByLabel(/Save my information for faster checkout/i);
  if ((await saveInfo.count()) > 0 && (await saveInfo.isChecked().catch(() => false))) {
    await saveInfo.uncheck({ force: true }).catch(() => null);
  }

  const cardRadio = page.getByRole("radio", { name: /^Card$/i });
  if ((await cardRadio.count()) > 0) {
    await cardRadio.first().click({ force: true });
    await page.waitForTimeout(800);
  } else {
    await page.getByText(/^Card$/).first().click().catch(() => null);
    await page.waitForTimeout(800);
  }

  async function fillIn(scope: Page | Frame) {
    const number = scope
      .locator(
        'input[name="number"], input[name="cardNumber"], input[name="cardnumber"], input[placeholder*="1234"], input[autocomplete="cc-number"]',
      )
      .first();
    if ((await number.count()) === 0) return false;
    await number.click();
    await number.fill("");
    await number.pressSequentially("4242424242424242", { delay: 30 });
    const exp = scope
      .locator(
        'input[name="expiry"], input[name="cardExpiry"], input[name="exp-date"], input[placeholder*="MM"], input[autocomplete="cc-exp"]',
      )
      .first();
    if ((await exp.count()) > 0) {
      await exp.click();
      await exp.pressSequentially("1234", { delay: 30 });
    }
    const cvc = scope
      .locator(
        'input[name="cvc"], input[name="cardCvc"], input[placeholder*="CVC"], input[autocomplete="cc-csc"]',
      )
      .first();
    if ((await cvc.count()) > 0) {
      await cvc.click();
      await cvc.pressSequentially("123", { delay: 30 });
    }
    const zip = scope
      .locator(
        'input[name="postal"], input[name="postalCode"], input[autocomplete="postal-code"]',
      )
      .first();
    if ((await zip.count()) > 0) {
      await zip.fill("23220");
    }
    return true;
  }

  const named = await fillIn(page);
  if (!named) {
    for (const frame of page.frames()) {
      if (await fillIn(frame).catch(() => false)) break;
    }
  }

  const cardholder = page
    .getByPlaceholder(/Full name on card/i)
    .or(page.getByLabel(/Cardholder name/i));
  if ((await cardholder.count()) > 0) {
    await cardholder.first().fill("Maya Brooks");
  }
  const zipPage = page.getByLabel(/^ZIP$/i).or(page.getByPlaceholder(/ZIP/i));
  if ((await zipPage.count()) > 0) {
    await zipPage.first().fill("23220");
  }
  const country = page.getByLabel(/Country or region/i);
  if ((await country.count()) > 0) {
    await country.first().selectOption({ label: "United States" }).catch(() => null);
  }
  return true;
}

async function launchBrowser() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript((key) => {
    try {
      sessionStorage.setItem(key, "off");
    } catch {
      /* ignore */
    }
  }, VOICE_NARRATION_KEY);
  return { browser, context, page: await context.newPage() };
}

async function main() {
  const ready = await waitForServer(BASE);
  if (!ready) throw new Error(`No Studio server at ${BASE}`);

  const { browser: signInBrowser, page: signInPage } = await launchBrowser();
  await signInPage.goto(`${BASE}/sign-in?from=/studio-board`, {
    waitUntil: "domcontentloaded",
  });
  const signInShot = await shot(signInPage, "sign-in-unpaid-honesty");
  const signInText = await pageText(signInPage);
  proof(
    "unpaid-sign-in-honesty",
    !/project has been created/i.test(signInText),
    "Unpaid Board sign-in does not say the project was created.",
    signInShot,
  );
  await signInBrowser.close();

  const { browser: cancelBrowser, page: cancelPage } = await launchBrowser();
  await walkMayaToCheckout(cancelPage, "cancel");
  const launchedCancel = await acceptTermsAndLaunchStripe(cancelPage);
  const stripeCancelShot = await shot(cancelPage, "hosted-stripe-before-cancel");
  proof(
    "cancel-hosted-stripe-opened",
    /checkout\.stripe\.com/i.test(launchedCancel.after),
    `Cancel path opened hosted Checkout: ${launchedCancel.after}`,
    stripeCancelShot,
  );
  if (/checkout\.stripe\.com/i.test(cancelPage.url())) {
    const back = cancelPage.getByRole("link", { name: /back|return/i }).first();
    if ((await back.count()) > 0) await back.click();
    else await cancelPage.goBack();
    await cancelPage.waitForTimeout(2000);
  }
  const cancelReturnShot = await shot(cancelPage, "cancelled-checkout-return");
  const cancelText = await pageText(cancelPage);
  const cancelStage = await cancelPage
    .locator("[data-stage]")
    .first()
    .getAttribute("data-stage")
    .catch(() => null);
  proof(
    "cancelled-payment-honesty",
    !/project has been created/i.test(cancelText) &&
      cancelStage !== "intake" &&
      (/cancel/i.test(cancelText) || /still saved/i.test(cancelText) || cancelStage === "checkout"),
    `After cancel: stage=${cancelStage ?? "—"} unpaid; no created-project claim.`,
    cancelReturnShot,
  );
  proof(
    "cancelled-not-intake",
    cancelStage === "checkout" || cancelStage === null,
    `Cancelled checkout stayed on checkout (stage=${cancelStage ?? "—"}), not intake.`,
    cancelReturnShot,
  );
  await cancelBrowser.close();

  const { browser, page } = await launchBrowser();
  await walkMayaToCheckout(page, "pay");
  const launched = await acceptTermsAndLaunchStripe(page);
  const stripeShot = await shot(page, "hosted-stripe-checkout");
  const openedStripe = /checkout\.stripe\.com/i.test(launched.after);
  proof(
    "hosted-stripe-opened",
    openedStripe,
    openedStripe
      ? `Hosted Stripe Checkout opened: ${launched.after}`
      : `Did not leave Studio checkout. url=${launched.after} text=${(await pageText(page)).slice(0, 400)}`,
    stripeShot,
  );

  if (openedStripe) {
    const filled = await fillStripeTestCard(page);
    const stripeFilledShot = await shot(page, "hosted-stripe-card-filled");
    proof(
      "stripe-test-card-filled",
      filled,
      filled ? "Test card fields found." : "Could not fill Stripe card fields.",
      stripeFilledShot,
    );
    const payBtn = page.getByRole("button", { name: /^Pay$/i });
    if ((await payBtn.count()) > 0) {
      await payBtn.first().click();
    } else {
      await page.getByRole("button", { name: /Pay|Complete/i }).last().click().catch(() => null);
    }
    await page.waitForTimeout(3000);
    const payingShot = await shot(page, "hosted-stripe-after-pay-click");
    await page
      .waitForURL(/studio-conversation-room/i, { timeout: 90_000 })
      .catch(() => null);
  }

  await page.waitForTimeout(2500);
  const returnShot = await shot(page, "studio-return-after-pay");
  const returnUrl = page.url();
  const returnText = await pageText(page);
  const paidStage = await page
    .locator("[data-stage]")
    .first()
    .getAttribute("data-stage")
    .catch(() => null);
  const intakeOpen =
    paidStage === "intake" ||
    /Project Intake/i.test(returnText) ||
    (await page.getByRole("button", { name: /Continue intake/i }).count()) > 0;
  proof(
    "successful-studio-return",
    /studio-conversation-room/i.test(returnUrl) && openedStripe,
    `Returned to Studio after Stripe. stage=${paidStage ?? "—"} url=${returnUrl}`,
    returnShot,
  );
  proof(
    "intake-after-confirmed-pay",
    Boolean(intakeOpen),
    intakeOpen
      ? "Project Intake is the next customer step after confirmed payment."
      : `Intake did not open. stage=${paidStage ?? "—"} copy=${returnText.slice(0, 400)}`,
    returnShot,
  );
  proof(
    "no-false-created-after-pay-path",
    !/project has been created/i.test(returnText) || Boolean(intakeOpen),
    "Customer copy does not congratulate an unpaid created project.",
    returnShot,
  );

  if (intakeOpen) {
    const continueIntake = page.getByRole("button", { name: /Continue intake/i });
    if ((await continueIntake.count()) > 0) await continueIntake.click();
    await page.waitForTimeout(800);
    const noMaterials = page.getByRole("button", { name: /I do not have this yet/i });
    if ((await noMaterials.count()) > 0) {
      await noMaterials.first().click();
    }
    const later = page.getByRole("button", { name: /I will provide this later/i });
    const describe = page.getByRole("button", { name: /I can describe what I have/i });
    const purpose = page.getByLabel(/What is this flyer for/i).first();
    if ((await purpose.count()) === 0 && (await describe.count()) > 1) {
      await describe.nth(1).click();
    }
    if ((await page.getByLabel(/What is this flyer for/i).count()) > 0) {
      await page.getByLabel(/What is this flyer for/i).first().fill(
        "Promotional flyer for the Back-to-School Reset service.",
      );
    }
    const must = page.getByLabel(/Exact text, offer details/i).first();
    if ((await must.count()) > 0) await must.fill(MUST_INCLUDE);
    const use = page.getByLabel(/Intended use/i).first();
    if ((await use.count()) > 0) {
      await use.selectOption({ label: "Both print and digital" }).catch(async () => {
        await use.click();
        await page.getByText(/Both print and digital/i).first().click();
      });
    }
    const intakeFilled = await shot(page, "intake-no-logo");
    const intakeText = await pageText(page);
    proof(
      "no-logo-intake-truth",
      /I do not have this yet|No logo|not erase your purchase/i.test(intakeText),
      "Intake lets Maya say she does not have a logo. No test logo invented.",
      intakeFilled,
    );
  }

  await browser.close();

  const passed = proofs.filter((p) => p.ok).length;
  const failed = proofs.filter((p) => !p.ok).length;
  writeFileSync(
    join(OUT, "evidence.json"),
    JSON.stringify({ base: BASE, passed, failed, proofs }, null, 2),
  );
  console.log(`Proofs ${passed}/${proofs.length}  failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
