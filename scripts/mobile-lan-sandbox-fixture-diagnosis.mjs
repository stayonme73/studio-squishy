/**
 * Diagnose builder-vs-Samsung sandbox fixture discrepancy against the
 * actual LAN-served build. Does not pay. Does not redesign Checkout.
 *
 * Usage: node scripts/mobile-lan-sandbox-fixture-diagnosis.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const LAN = "https://10.126.244.254:3000";
const LOCAL = "https://localhost:3000";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

function checkoutSeed() {
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
        selectedServices: [{ jobId: "v2-rtu-flyer", roadId: "i20", addedAt: now }],
      },
    },
    guide: {
      schemaVersion: 1,
      ...opening,
      source: "lobby-guide-conversation",
    },
    campaign: {
      campaignId: "lan-diag-maya-flyer",
      campaignName: opening.businessName,
      campaignStatus: "DRAFT_RECEIVED",
      campaignDescription: "Awaiting payment confirmation.",
      estimatedCompletion: "After payment and Project Intake",
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      revisionRoundsUsed: 0,
      deliverablesDelivered: {},
      paymentReceivedAt: null,
      createdAt: now,
      updatedAt: now,
      routeMapContext: {
        selectedServiceIds: ["v2-rtu-flyer"],
        jobId: "v2-rtu-flyer",
        roadId: "i20",
        selectedAt: now,
        currentStep: "checkout",
      },
      approvedStudioPlan: {
        selectedServiceIds: ["v2-rtu-flyer"],
        includedServiceIds: ["v2-rtu-flyer"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 6900,
        monthlyTotalCents: 0,
        amountDueTodayCents: 6900,
        lineItems: [],
        approvedAt: now,
      },
    },
  };
}

async function inspectCheckout(page) {
  return page.evaluate(() => {
    const search = window.location.search;
    const fixture = document.querySelector(
      '[data-developer-fixture="sandbox-confirm"]',
    );
    const continueCta = document.querySelector('[data-checkout-pay="continue"]');
    const terms = document.querySelector('[data-checkout-terms="1"]');
    const fixtureBox = fixture?.getBoundingClientRect();
    const continueBox = continueCta?.getBoundingClientRect();
    const fixtureStyle = fixture ? getComputedStyle(fixture) : null;
    const btn = fixture?.querySelector("button");
    const btnStyle = btn ? getComputedStyle(btn) : null;
    const cx = fixtureBox ? fixtureBox.left + fixtureBox.width / 2 : null;
    const cy = fixtureBox ? fixtureBox.top + fixtureBox.height / 2 : null;
    const hit =
      cx != null && cy != null ? document.elementFromPoint(cx, cy) : null;
    const campaign = JSON.parse(
      window.localStorage.getItem("studio-squishy:current-campaign") || "null",
    );
    return {
      href: location.href,
      search,
      sandboxQuery: /studioPaymentSandbox=1/.test(search),
      fixtureInDom: Boolean(fixture),
      fixtureLabel: fixture?.textContent?.replace(/\s+/g, " ").trim().slice(0, 220) ?? null,
      fixtureDisplay: fixtureStyle?.display ?? null,
      fixtureVisibility: fixtureStyle?.visibility ?? null,
      fixtureOpacity: fixtureStyle?.opacity ?? null,
      fixturePointer: fixtureStyle?.pointerEvents ?? null,
      fixtureTop: fixtureBox?.top ?? null,
      fixtureBottom: fixtureBox?.bottom ?? null,
      continueTop: continueBox?.top ?? null,
      continueBottom: continueBox?.bottom ?? null,
      viewportHeight: window.innerHeight,
      fixtureInViewport:
        Boolean(fixtureBox) &&
        fixtureBox.bottom > 0 &&
        fixtureBox.top < window.innerHeight &&
        fixtureBox.height > 0,
      continueInViewport:
        Boolean(continueBox) &&
        continueBox.bottom > 0 &&
        continueBox.top < window.innerHeight,
      buttonLabel: btn?.textContent?.trim() ?? null,
      buttonDisabled: btn instanceof HTMLButtonElement ? btn.disabled : null,
      buttonDisplay: btnStyle?.display ?? null,
      hitTag: hit instanceof HTMLElement ? hit.tagName : null,
      hitText: hit instanceof HTMLElement ? hit.textContent?.trim().slice(0, 80) : null,
      hitIsFixture: Boolean(
        hit instanceof HTMLElement &&
          hit.closest("[data-developer-fixture=sandbox-confirm]"),
      ),
      termsChecked: terms instanceof HTMLInputElement ? terms.checked : null,
      bodyHasTestPay: /Test pay with sandbox confirm/i.test(document.body.innerText),
      bodyHasContinue: /Continue to secure checkout/i.test(document.body.innerText),
      campaignPaid: Boolean(campaign?.paymentReceivedAt),
      nodeEnvHint: null,
    };
  });
}

async function runAgainst(browser, base, suffix, report) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  const seed = checkoutSeed();
  await page.addInitScript(({ draft, guide, campaign }) => {
    localStorage.setItem("studio-squishy:working-draft:v1", JSON.stringify(draft));
    localStorage.setItem("studio-guide:capture-draft:v1", JSON.stringify(guide));
    localStorage.setItem("studio-squishy:current-campaign", JSON.stringify(campaign));
    sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    sessionStorage.removeItem("studio-voice:first-entry-choice:v1");
    document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
  }, seed);

  await page.goto(`${base}/?studioPaymentSandbox=1`, {
    waitUntil: "load",
    timeout: 60000,
  });
  const lobbySearch = await page.evaluate(() => location.search);

  await page.goto(
    `${base}/studio-conversation-room?stage=checkout&studioPaymentSandbox=1`,
    { waitUntil: "load", timeout: 60000 },
  );
  await page.waitForTimeout(2000);
  await page.locator('[data-checkout-pay="continue"]').waitFor({
    state: "visible",
    timeout: 25000,
  });

  const atContinue = await inspectCheckout(page);
  await page.screenshot({
    path: path.join(OUT, `lan-diag-${suffix}-01-at-continue.png`),
    fullPage: false,
  });

  const fixture = page.locator('[data-developer-fixture="sandbox-confirm"]');
  const attached = await fixture.count();
  if (attached) {
    await fixture.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  }
  const afterScroll = await inspectCheckout(page);
  await page.screenshot({
    path: path.join(OUT, `lan-diag-${suffix}-02-scrolled-fixture.png`),
    fullPage: false,
  });

  let session = { status: null, body: {} };
  try {
    await page.locator('[data-checkout-terms="1"]').check();
    const continueRes = page.waitForResponse(
      (response) =>
        response.url().includes("/api/payments/checkout-session") &&
        response.request().method() === "POST",
      { timeout: 8000 },
    );
    await page.locator('[data-checkout-pay="continue"]').click();
    session = await continueRes.then(async (response) => ({
      status: response.status(),
      body: await response.json().catch(() => ({})),
    }));
    await page.waitForTimeout(800);
  } catch (error) {
    session = { status: null, body: { waitError: String(error).slice(0, 240) } };
  }
  const afterContinue = await inspectCheckout(page);
  await page.screenshot({
    path: path.join(OUT, `lan-diag-${suffix}-03-continue-unconfigured.png`),
    fullPage: false,
  });

  await context.close();
  report[suffix] = {
    lobbySearch,
    atContinue,
    afterScroll,
    afterContinue,
    checkoutSession: {
      status: session.status,
      mode: session.body.mode ?? null,
      error: session.body.error ?? null,
      preferSandboxSent: session.body.sandboxConfirmRequired ?? null,
    },
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = {
    ok: false,
    servedCommitExpected: "128572812595bd6726e32e3811da6668721945d5",
  };
  try {
    await runAgainst(browser, LAN, "lan", report);
    await runAgainst(browser, LOCAL, "localhost", report);
    const lan = report.lan;
    report.ok =
      lan.lobbySearch.includes("studioPaymentSandbox=1") &&
      lan.atContinue.sandboxQuery === true &&
      lan.atContinue.fixtureInDom === true &&
      lan.afterScroll.fixtureInDom === true &&
      lan.afterScroll.bodyHasTestPay === true &&
      lan.afterScroll.fixtureDisplay !== "none" &&
      lan.afterContinue.campaignPaid === false;
    report.continueRemainsUnconfigured =
      lan.checkoutSession.error === "processor_not_configured" &&
      lan.checkoutSession.mode == null;
    report.ok = report.ok && report.continueRemainsUnconfigured;
  } catch (error) {
    report.error = String(error).slice(0, 1200);
  } finally {
    await writeFile(
      path.join(OUT, "lan-diag-sandbox-fixture-report.json"),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main();
