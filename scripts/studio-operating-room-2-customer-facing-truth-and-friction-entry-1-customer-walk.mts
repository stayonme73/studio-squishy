/**
 * STUDIO-OPERATING-ROOM-2-CUSTOMER-FACING-TRUTH-AND-FRICTION-ENTRY-1
 * First-time customer-eyes walk: Lobby → Conversation → services → Studio Plan →
 * payment handoff. Stops at hosted Stripe. Does not complete a paid order.
 *
 *   $env:CERT_PORT="3074"
 *   $env:CERT_BASE_URL="http://127.0.0.1:3074"
 *   $env:PLAYWRIGHT_BROWSERS_PATH="$env:USERPROFILE\AppData\Local\ms-playwright"
 *   npx tsx scripts/studio-operating-room-2-customer-facing-truth-and-friction-entry-1-customer-walk.mts
 */
import { chromium, type Page } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = process.env.CERT_PORT || "3074";
const BASE = (process.env.CERT_BASE_URL || `http://127.0.0.1:${PORT}`).replace(/\/$/, "");
const OUT = join(
  process.cwd(),
  "docs",
  "launch",
  "studio-operating-room-2-customer-facing-truth-and-friction-entry-1",
);
const SHOTS = join(OUT, "customer-eyes");
const VOICE_NARRATION_KEY = "studio-voice:narration-preference:v1";

mkdirSync(SHOTS, { recursive: true });

const CUSTOMER = {
  preferredName: "Jordan",
  businessName: "Hale Weekend Bakery",
  need:
    "I need a simple flyer for my Saturday farmers market stall so people know what I bake, where I'll be, and how to find me. I am not a designer.",
};

const FORBIDDEN_CUSTOMER_VISIBLE = [
  /squishy/i,
  /this build/i,
  /STRIPE_SECRET_KEY/,
  /sk_test_/,
  /sk_live_/,
  /\bCanva\b/i,
  /Decision Core/i,
  /studio_design_renderer/i,
];

type Proof = { id: string; ok: boolean; detail: string; shot?: string };
type Pause = {
  where: string;
  kind: "guess" | "equivalent-controls" | "internal-term" | "payment-already" | "what-next";
  note: string;
  blocking: boolean;
};

const proofs: Proof[] = [];
const pauses: Pause[] = [];
const stages: Record<string, { url: string; excerpt: string; shot?: string }> = {};

function proof(id: string, ok: boolean, detail: string, shot?: string) {
  proofs.push({ id, ok, detail, shot });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${id}: ${detail}`);
}

function pause(entry: Pause) {
  pauses.push(entry);
  console.log(`[PAUSE${entry.blocking ? " BLOCKING" : ""}] ${entry.where}: ${entry.note}`);
}

async function shot(page: Page, name: string) {
  const file = join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file.replace(/\\/g, "/");
}

async function visibleText(page: Page) {
  return page.evaluate(() => (document.body?.innerText || "").replace(/\s+/g, " ").trim());
}

function forbiddenHits(text: string) {
  return FORBIDDEN_CUSTOMER_VISIBLE.filter((re) => re.test(text)).map((re) => String(re));
}

async function recordStage(page: Page, id: string) {
  const excerpt = await visibleText(page);
  const image = await shot(page, id);
  stages[id] = { url: page.url(), excerpt: excerpt.slice(0, 2200), shot: image };
  const hits = forbiddenHits(excerpt);
  proof(
    `${id}-no-forbidden-jargon`,
    hits.length === 0,
    hits.length === 0
      ? "No Squishy / this-build / Stripe-env / Canva jargon in visible copy."
      : `Forbidden customer-visible matches: ${hits.join(", ")}`,
    image,
  );
  return { excerpt, image };
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

async function waitForStep(page: Page, step: string) {
  await page.locator(`[data-step="${step}"]`).waitFor({ state: "visible", timeout: 20_000 });
}

async function continueTablet(page: Page) {
  const btn = page.locator("[data-step]").getByRole("button", { name: /^Continue$/i }).first();
  await btn.click({ timeout: 10_000 });
  await page.waitForTimeout(700);
}

async function typeAndContinue(page: Page, text: string) {
  const field = page.locator("#studio-guide-type-field");
  await field.click({ timeout: 10_000 });
  await field.fill(text);
  await continueTablet(page);
}

async function clickIfPresent(page: Page, name: RegExp, timeout = 2500) {
  const btn = page.getByRole("button", { name }).first();
  if ((await btn.count()) === 0) return false;
  if (!(await btn.isVisible().catch(() => false))) return false;
  await btn.click({ timeout });
  await page.waitForTimeout(500);
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

async function walkToCheckout(page: Page) {
  await page.goto(`${BASE}/studio-lobby`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForTimeout(800);
  const lobby = await recordStage(page, "01-lobby");

  proof(
    "lobby-first-time-knows-where-to-begin",
    /NEW TO THE STUDIO/i.test(lobby.excerpt) && /LET.?S GET STARTED/i.test(lobby.excerpt),
    "Lobby offers New to The Studio with Let’s Get Started.",
    lobby.image,
  );
  proof(
    "lobby-returning-is-separate",
    /RETURNING CLIENT/i.test(lobby.excerpt) && /SIGN IN/i.test(lobby.excerpt),
    "Returning Client is a Sign In path, not the first-time start.",
    lobby.image,
  );
  if (!/NEW TO THE STUDIO/i.test(lobby.excerpt) || !/LET.?S GET STARTED/i.test(lobby.excerpt)) {
    pause({
      where: "Lobby",
      kind: "guess",
      note: "First-time customer would have to guess how to begin.",
      blocking: true,
    });
  }

  const start = page.getByRole("link", { name: /LET.?S GET STARTED/i }).first();
  const startBtn = page.getByRole("button", { name: /LET.?S GET STARTED/i }).first();
  if ((await start.count()) > 0) {
    await start.click();
  } else if ((await startBtn.count()) > 0) {
    await startBtn.click();
  } else {
    throw new Error("Lobby missing Let’s Get Started");
  }
  await page.waitForURL(/studio-conversation-room|lobby-entry/i, { timeout: 30_000 });
  if (/lobby-entry/i.test(page.url())) {
    await page.waitForURL(/studio-conversation-room/i, { timeout: 20_000 });
  }
  await page.waitForTimeout(900);
  const conversation = await recordStage(page, "02-conversation-open");

  const speakPresent =
    /Tap the mic to speak/i.test(conversation.excerpt) ||
    (await page.getByRole("button", { name: /Tap the mic to speak/i }).count()) > 0;
  const typePresent = (await page.locator("#studio-guide-type-field").count()) > 0;
  proof(
    "conversation-speak-and-type",
    speakPresent && typePresent,
    speakPresent && typePresent
      ? "Customer can speak or type. Voice is not the only fill path."
      : `Speak visible=${speakPresent} type field=${typePresent}.`,
    conversation.image,
  );
  if (!speakPresent || !typePresent) {
    pause({
      where: "Conversation Room",
      kind: "guess",
      note: "Customer could not clearly see both Speak and Type.",
      blocking: true,
    });
  }

  await waitForStep(page, "ask_preferred_name");
  await typeAndContinue(page, CUSTOMER.preferredName);
  await waitForStep(page, "ask_project_need");
  await typeAndContinue(page, CUSTOMER.need);
  await waitForStep(page, "ask_business_name");
  await typeAndContinue(page, CUSTOMER.businessName);
  await waitForStep(page, "ask_deadline");
  await page.locator("[data-step='ask_deadline']").getByText("Within 2 weeks", { exact: true }).click();
  await page.waitForTimeout(400);
  await continueTablet(page);
  await waitForStep(page, "ask_materials");
  await page.locator("[data-step='ask_materials']").getByText("Nothing yet", { exact: true }).click();
  await page.waitForTimeout(250);
  await continueTablet(page);
  const looksGood = page.getByRole("button", { name: /Looks good|Yes, this is correct/i }).first();
  if ((await looksGood.count()) > 0) await looksGood.click();
  await page.waitForTimeout(1100);
  await page.locator("[data-stage='route']").waitFor({ timeout: 20_000 });

  const route = await recordStage(page, "03-route-recommendation");
  proof(
    "route-is-suggestion-not-command",
    /Suggested starting point/i.test(route.excerpt) &&
      /you can choose a different path/i.test(route.excerpt),
    "Route is framed as a suggested starting point the customer can change.",
    route.image,
  );
  if (/you (must|should|need to) (take|choose|pick)/i.test(route.excerpt)) {
    pause({
      where: "Route recommendation",
      kind: "internal-term",
      note: "Recommendation language overclaims as a command.",
      blocking: true,
    });
  }

  const continueRoute = page.getByRole("button", { name: /Continue with/i }).first();
  if ((await continueRoute.count()) > 0) {
    await continueRoute.click();
  } else {
    await page.getByRole("button", { name: /Promote Something Now/i }).first().click();
  }
  await page.waitForTimeout(1200);

  await clickIfPresent(page, /Open service list/i);
  const services = await recordStage(page, "04-service-selection");
  proof(
    "services-include-flyer",
    /Make Me a Flyer/i.test(services.excerpt),
    "Make Me a Flyer is on the currently presented service list.",
    services.image,
  );

  await page.getByText(/Make Me a Flyer/i).first().click().catch(() => null);
  await page.waitForTimeout(400);
  await clickIfPresent(page, /Show full details|Learn More/i);
  await page.waitForTimeout(600);
  const details = await recordStage(page, "05-flyer-learn-more");
  proof(
    "flyer-has-inclusion-and-exclusion",
    /Included/i.test(details.excerpt) &&
      /The Studio Does Not Offer/i.test(details.excerpt),
    "Flyer details show included work and what The Studio does not offer.",
    details.image,
  );
  proof(
    "flyer-shows-price",
    /\$69/.test(details.excerpt) || /\$69/.test(services.excerpt),
    "Customer can see the $69 Studio fee before checkout.",
    details.image,
  );

  const addFlyer = page.getByRole("button", { name: /Add to Project/i }).first();
  if ((await addFlyer.count()) > 0) await addFlyer.click();
  await page.waitForTimeout(700);

  await clickIfPresent(page, /Review Studio Plan/i);
  await page.waitForTimeout(900);
  const plan = await recordStage(page, "06-studio-plan");
  proof(
    "plan-states-selected-service-and-price",
    /Make Me a Flyer/i.test(plan.excerpt) && /\$69/.test(plan.excerpt),
    "Studio Plan states Make Me a Flyer and $69.",
    plan.image,
  );
  await clickIfPresent(page, /Revisions, materials|View Details|Plan details/i);
  await page.waitForTimeout(500);
  const planDetails = await recordStage(page, "07-studio-plan-details");
  if (
    !/revision/i.test(`${plan.excerpt} ${planDetails.excerpt}`) &&
    !/You.ll Need|We'll Need|you.ll handle/i.test(`${plan.excerpt} ${planDetails.excerpt}`)
  ) {
    pause({
      where: "Studio Plan",
      kind: "what-next",
      note: "Could not find revision / materials / responsibility copy near the plan.",
      blocking: true,
    });
  } else {
    proof(
      "plan-shows-responsibility-or-revision",
      true,
      "Studio Plan or extras mention revisions or what the customer needs to provide.",
      planDetails.image,
    );
  }

  const toCheckout = page.getByRole("button", { name: /Continue to Checkout/i });
  if ((await toCheckout.count()) > 0) await toCheckout.click();
  await page.waitForTimeout(1100);

  const checkout = await recordStage(page, "08-payment-handoff");
  await page.getByText(/What Happens Next/i).first().scrollIntoViewIfNeeded().catch(() => null);
  const checkoutFull = await visibleText(page);
  pause({
    where: "Payment handoff",
    kind: "what-next",
    note: "Tablet already says intake comes next. Board-is-source-of-truth copy lives in What Happens Next, below Continue to secure checkout, so a first-time customer can miss it unless they scroll.",
    blocking: false,
  });
  proof(
    "checkout-names-stripe-and-unpaid-until-confirmed",
    /Stripe/i.test(checkout.excerpt) &&
      /unpaid until Stripe confirms/i.test(checkoutFull) &&
      !/not sent in this build/i.test(checkoutFull) &&
      !/not connected/i.test(checkoutFull),
    "Checkout names Stripe and says the project stays unpaid until Stripe confirms payment.",
    checkout.image,
  );
  proof(
    "checkout-board-is-source-of-truth",
    /source of truth/i.test(checkoutFull) || /follow project status on your Studio Board/i.test(checkoutFull),
    "What Happens Next still tells the customer the Studio Board is the source of truth.",
    checkout.image,
  );
  const openCount = await page.getByRole("button", { name: /^Open checkout$/i }).count();
  const secureCount = await page.getByRole("button", { name: /Continue to secure checkout/i }).count();
  const openVisible = await page.getByRole("button", { name: /^Open checkout$/i }).first().isVisible().catch(() => false);
  const stageAttr = await page.locator("[data-stage]").first().getAttribute("data-stage").catch(() => null);

  proof(
    "tablet-open-checkout-is-not-the-pay-cta",
    openVisible || /Open checkout/i.test(checkout.excerpt),
    `Tablet uses Open checkout (visible=${openVisible}, count=${openCount}). Stage=${stageAttr ?? "—"}.`,
    checkout.image,
  );
  proof(
    "secure-checkout-cta-present",
    secureCount > 0 || /Continue to secure checkout/i.test(checkout.excerpt),
    `Continue to secure checkout is the actual pay action (count=${secureCount}).`,
    checkout.image,
  );
  if (openCount > 0 && secureCount > 0) {
    const openName = (await page.getByRole("button", { name: /^Open checkout$/i }).first().innerText()) || "";
    const secureName =
      (await page.getByRole("button", { name: /Continue to secure checkout/i }).first().innerText()) || "";
    proof(
      "checkout-controls-are-distinct",
      openName.trim().toLowerCase() !== secureName.trim().toLowerCase(),
      `Open checkout vs Continue to secure checkout stay distinct (“${openName.trim()}” / “${secureName.trim()}”).`,
      checkout.image,
    );
  } else if (secureCount > 1 && openCount === 0) {
    pause({
      where: "Payment handoff",
      kind: "equivalent-controls",
      note: "More than one Continue to secure checkout button and no Open checkout label — customer may think both pay.",
      blocking: true,
    });
    proof("checkout-controls-are-distinct", false, "Tablet and form still share the Stripe CTA label.", checkout.image);
  }

  proof(
    "checkout-does-not-claim-paid-yet",
    !/Payment confirmed/i.test(checkout.excerpt) && !/Payment is complete/i.test(checkout.excerpt),
    "Checkout does not claim payment already occurred.",
    checkout.image,
  );

  if (openVisible) {
    await page.getByRole("button", { name: /^Open checkout$/i }).first().click();
    await page.waitForTimeout(600);
  }

  const afterOpen = await recordStage(page, "09-checkout-panel");
  proof(
    "opening-panel-did-not-mark-paid",
    !/Payment confirmed/i.test(afterOpen.excerpt) && !/checkout\.stripe\.com/i.test(page.url()),
    "Open checkout only reveals checkout details. Stripe hosted page has not opened yet.",
    afterOpen.image,
  );

  const backToPlan = page.getByRole("button", { name: /Back to Studio Plan/i }).first();
  if ((await backToPlan.count()) > 0) {
    await backToPlan.click();
    await page.waitForTimeout(700);
    const back = await recordStage(page, "10-back-to-plan");
    proof(
      "back-from-checkout-stays-unpaid",
      !/Payment confirmed/i.test(back.excerpt) &&
        !/Payment is complete/i.test(back.excerpt) &&
        (await page.locator("[data-stage]").first().getAttribute("data-stage").catch(() => null)) !== "intake",
      "Back to Studio Plan does not invent a paid project or jump to intake.",
      back.image,
    );
    const again = page.getByRole("button", { name: /Continue to Checkout/i });
    if ((await again.count()) > 0) await again.click();
    await page.waitForTimeout(800);
  }

  const payCta = page.getByRole("button", { name: /Continue to secure checkout/i }).first();
  if ((await payCta.count()) > 0) {
    await payCta.click().catch(() => null);
    await page.waitForTimeout(300);
  }
  const terms = page.locator("[data-checkout-terms='1']").first();
  if ((await terms.count()) > 0) {
    await terms.scrollIntoViewIfNeeded();
    await terms.check({ force: true });
  } else {
    await page.getByLabel(/I reviewed my Studio Plan/i).check({ force: true }).catch(() => null);
  }

  const beforeStripe = page.url();
  const submit = page.locator("[data-checkout-pay='continue']").first();
  if ((await submit.count()) > 0) {
    await submit.scrollIntoViewIfNeeded();
    await submit.click();
  } else {
    await page.getByRole("button", { name: /Continue to secure checkout/i }).last().click();
  }
  await page.waitForURL(/checkout\.stripe\.com/i, { timeout: 45_000 }).catch(() => null);
  const stripeUrl = page.url();
  const stripeShot = await shot(page, "11-hosted-stripe-handoff");
  proof(
    "hosted-stripe-opened",
    /checkout\.stripe\.com/i.test(stripeUrl),
    `Continue to secure checkout opened hosted Stripe. before=${beforeStripe} after=${stripeUrl}`,
    stripeShot,
  );

  if (/checkout\.stripe\.com/i.test(stripeUrl)) {
    const back = page.getByRole("link", { name: /back|return/i }).first();
    if ((await back.count()) > 0) await back.click();
    else await page.goBack();
    await page.waitForTimeout(2000);
  }
  const cancel = await recordStage(page, "12-cancel-or-back-from-stripe");
  const cancelStage = await page.locator("[data-stage]").first().getAttribute("data-stage").catch(() => null);
  const cancelText = cancel.excerpt;
  proof(
    "cancel-back-stays-unpaid",
    !/Payment confirmed/i.test(cancelText) &&
      !/project has been created/i.test(cancelText) &&
      cancelStage !== "intake",
    `After cancel/back: stage=${cancelStage ?? "—"} still unpaid. No created-project claim.`,
    cancel.image,
  );
  if (/Payment confirmed|Payment is complete/i.test(cancelText)) {
    pause({
      where: "Payment cancel",
      kind: "payment-already",
      note: "Cancel/back made the customer wonder whether payment already occurred.",
      blocking: true,
    });
  }
}

async function main() {
  const ready = await waitForServer(BASE);
  if (!ready) throw new Error(`No Studio server at ${BASE}`);

  const { browser, page } = await launchBrowser();
  try {
    await walkToCheckout(page);
  } catch (error) {
    const failShot = await shot(page, "zz-walk-threw").catch(() => undefined);
    proof("walk-completed-without-throw", false, String(error), failShot);
  } finally {
    await browser.close();
  }

  const blocking = pauses.filter((p) => p.blocking);
  const failed = proofs.filter((p) => !p.ok);
  const evidence = {
    packageId: "STUDIO-OPERATING-ROOM-2-CUSTOMER-FACING-TRUTH-AND-FRICTION-ENTRY-1",
    kind: "customer-eyes-front-door-walk",
    customer: CUSTOMER,
    base: BASE,
    closed: false,
    parkCheckpoint: "90dcc84",
    ownerRoutine: "NONE",
    proofs,
    pauses,
    stages,
    totals: {
      proofs: proofs.length,
      passed: proofs.filter((p) => p.ok).length,
      failed: failed.length,
      pauses: pauses.length,
      blockingPauses: blocking.length,
    },
  };
  const evidencePath = join(OUT, "customer-eyes", "walk-evidence.json");
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(`\nEvidence: ${evidencePath}`);
  console.log(
    `Proofs ${evidence.totals.passed}/${evidence.totals.proofs} · pauses ${pauses.length} (blocking ${blocking.length})`,
  );
  if (failed.length > 0 || blocking.length > 0) {
    process.exitCode = 1;
  }
}

await main();
