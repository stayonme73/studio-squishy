/**
 * Builder QA — Intake Save & Continue must open Account Handoff immediately.
 * Does not create an account. Does not type name/email/password.
 *
 * Usage: node scripts/mobile-account-handoff-qa.mjs
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

function paidMayaSeed() {
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
      revision: 7,
      cursor: {
        conversationLocation: "conversation-room-stage:intake",
        flowStep: "intake",
        journeyPhase: "conversation",
      },
      attribution: [],
      slices: {
        discoveryAnswers: opening,
        currentConversationLocation: "conversation-room-stage:intake",
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
    campaign: {
      campaignId: `account-handoff-qa-${Date.now()}`,
      campaignName: "Maya’s Mobile Boutique",
      campaignStatus: "PAYMENT_RECEIVED",
      updatedAt: now,
      paymentReceivedAt: now,
      approvedStudioPlan: {
        selectedServiceIds: ["v2-rtu-flyer"],
        packageId: "custom-studio-plan",
        includedServiceIds: ["v2-rtu-flyer"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 6900,
        monthlyTotalCents: 0,
        amountDueTodayCents: 6900,
        lineItems: [
          {
            skuId: "v2-rtu-flyer",
            serviceId: "v2-rtu-flyer",
            serviceName: "Make Me a Flyer",
            billingType: "one_time",
            exactPriceCents: 6900,
            priceDisplay: "$69",
          },
        ],
        approvedAt: now,
      },
      routeMapContext: {
        roadId: "i20",
        jobId: "v2-rtu-flyer",
        selectedServiceIds: ["v2-rtu-flyer"],
        currentStep: "intake",
      },
    },
  };
}

function readAccountState() {
  const url = location.href;
  const text = document.body.innerText;
  const campaignRaw = localStorage.getItem("studio-squishy:current-campaign");
  const campaign = campaignRaw ? JSON.parse(campaignRaw) : null;
  const createAccount = Array.from(document.querySelectorAll("a, button")).filter(
    (el) => /create account/i.test(el.textContent || ""),
  );
  const signIn = Array.from(document.querySelectorAll("a, button")).filter((el) =>
    /^sign in$/i.test((el.textContent || "").trim()),
  );
  return {
    url,
    onAccountHandoff: /\/account-handoff/.test(url),
    onConversationRoom: /\/studio-conversation-room/.test(url),
    headingHandoff: /Open your Studio Board/i.test(text),
    createAccountCount: createAccount.length,
    signInCount: signIn.length,
    paidAt: Boolean(campaign?.paymentReceivedAt),
    amountDue: campaign?.approvedStudioPlan?.amountDueTodayCents ?? null,
    flyer: Boolean(
      campaign?.approvedStudioPlan?.selectedServiceIds?.includes("v2-rtu-flyer"),
    ),
    intakeSubmitted: Boolean(campaign?.routeMapIntakeSubmittedAt),
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { ok: false, checks: {}, proofs: [], pageErrors: [] };
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

  try {
    const seed = paidMayaSeed();
    await page.addInitScript(({ draft, guide, campaign }) => {
      if (sessionStorage.getItem("qa-account-handoff-seeded")) return;
      sessionStorage.setItem("qa-account-handoff-seeded", "1");
      localStorage.setItem(
        "studio-squishy:working-draft:v1",
        JSON.stringify(draft),
      );
      localStorage.setItem(
        "studio-guide:capture-draft:v1",
        JSON.stringify(guide),
      );
      localStorage.setItem(
        "studio-squishy:current-campaign",
        JSON.stringify(campaign),
      );
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    }, seed);
    await page.goto(
      `${BASE}/studio-conversation-room?stage=intake&studioPaymentSandbox=1`,
      { waitUntil: "load", timeout: 60000 },
    );
    await page.waitForSelector(
      '[data-panel="intake"][data-surface="page"]',
      { timeout: 25000 },
    );

    await page.getByRole("button", { name: "I will provide this later" }).click();
    const areas = page.locator(
      '[data-panel="intake"][data-surface="page"] textarea',
    );
    await areas.nth(0).fill("Grand opening flyer for Maya’s Mobile Boutique.");
    await areas.nth(1).fill(
      "Maya’s Mobile Boutique. 20% off this weekend. Phone 555-0100.",
    );
    await page.getByRole("button", { name: "Print", exact: true }).click();

    const continueBtn = page.getByRole("button", {
      name: /SAVE & CONTINUE TO YOUR ACCOUNT/i,
    });
    await continueBtn.waitFor({ state: "visible" });
    await expectEnabled(continueBtn);

    const urlBefore = page.url();
    await continueBtn.click();
    await page.waitForURL(/\/account-handoff/, { timeout: 12000 });
    await page.waitForSelector("#account-handoff-title", { timeout: 10000 });

    const arrived = await page.evaluate(readAccountState);
    report.arrived = arrived;
    report.checks.leftIntakeWithoutRefresh = arrived.onAccountHandoff;
    report.checks.didNotStayOnConversationRoom = arrived.onConversationRoom === false;
    report.checks.urlChangedFromIntake = arrived.url !== urlBefore;
    report.checks.handoffHeading = arrived.headingHandoff === true;
    report.checks.oneCreateAccount = arrived.createAccountCount === 1;
    report.checks.oneSignIn = arrived.signInCount === 1;
    report.checks.paidPreserved = arrived.paidAt === true && arrived.amountDue === 6900;
    report.checks.flyerPreserved = arrived.flyer === true;
    report.checks.intakeSubmitted = arrived.intakeSubmitted === true;
    report.proofs.push(await shot(page, "account-handoff-01-immediate.png"));

    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#account-handoff-title", { timeout: 10000 });
    const afterReload = await page.evaluate(readAccountState);
    report.afterReload = afterReload;
    report.checks.refreshStillHandoff = afterReload.onAccountHandoff === true;
    report.checks.refreshStillPaid = afterReload.paidAt === true;
    report.checks.refreshStillFlyer = afterReload.flyer === true;
    report.checks.refreshStillSubmitted = afterReload.intakeSubmitted === true;
    report.checks.stillOneCreateAccount = afterReload.createAccountCount === 1;
    report.proofs.push(await shot(page, "account-handoff-02-refresh.png"));

    const failed = Object.entries(report.checks).filter(([, value]) => !value);
    report.ok = failed.length === 0 && report.pageErrors.length === 0;
    report.failed = failed.map(([key]) => key);
  } catch (error) {
    report.ok = false;
    report.error = String(error);
  } finally {
    await writeFile(
      path.join(OUT, "account-handoff-report.json"),
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

async function expectEnabled(locator) {
  const disabled = await locator.isDisabled();
  if (disabled) {
    throw new Error("Save & Continue stayed disabled after required Intake.");
  }
}

main();
