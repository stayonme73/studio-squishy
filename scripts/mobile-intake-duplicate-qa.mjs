/**
 * Builder QA — phone Intake is one surface after paid.
 * Does not complete Intake. Does not change production.
 *
 * Usage: node scripts/mobile-intake-duplicate-qa.mjs
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
      revision: 6,
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
      campaignId: `intake-dup-qa-${Date.now()}`,
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
    await page.waitForSelector('[data-panel="intake"]', { timeout: 25000 });
    await page.waitForTimeout(800);

    const state = await page.evaluate(() => {
      const text = document.body.innerText;
      const panels = Array.from(
        document.querySelectorAll('[data-panel="intake"]'),
      );
      const preparing = Array.from(document.querySelectorAll("h1, h2")).filter(
        (el) => /Preparing your project for production/i.test(el.textContent || ""),
      );
      const closeButtons = Array.from(document.querySelectorAll("button")).filter(
        (el) => el.textContent?.trim() === "Close",
      );
      const pageSurface = document.querySelector(
        '[data-panel="intake"][data-surface="page"]',
      );
      const overlaySurface = document.querySelector(
        '[data-panel="intake"][data-surface="overlay"]',
      );
      return {
        panelCount: panels.length,
        pageSurface: Boolean(pageSurface),
        overlaySurface: Boolean(overlaySurface),
        preparingCount: preparing.length,
        closeCount: closeButtons.length,
        headingIntake: /Project Intake/i.test(text),
        paymentReceived: /Payment received/i.test(text),
        servicesConfirmed: /Services confirmed/i.test(text),
        flyer: /Make Me a Flyer|Flyer/i.test(text),
        lounge: Boolean(document.querySelector("[data-studio-environment-shell]")),
        paidAt: Boolean(
          JSON.parse(
            localStorage.getItem("studio-squishy:current-campaign") || "null",
          )?.paymentReceivedAt,
        ),
        amountDue: JSON.parse(
          localStorage.getItem("studio-squishy:current-campaign") || "null",
        )?.approvedStudioPlan?.amountDueTodayCents,
      };
    });
    report.state = state;
    report.proofs.push(await shot(page, "intake-dup-01-one-surface.png"));

    report.checks.oneIntakePanel = state.panelCount === 1;
    report.checks.pageNotOverlay =
      state.pageSurface === true && state.overlaySurface === false;
    report.checks.noPreparingTablet = state.preparingCount === 0;
    report.checks.noClose = state.closeCount === 0;
    report.checks.ackAndIntake =
      state.headingIntake &&
      state.paymentReceived &&
      state.servicesConfirmed;
    report.checks.paidStatePreserved =
      state.paidAt === true && state.amountDue === 6900;
    report.checks.lounge = state.lounge === true;

    await page.reload({ waitUntil: "load", timeout: 60000 });
    await page.waitForSelector('[data-panel="intake"]', { timeout: 25000 });
    const afterReload = await page.evaluate(() => {
      const panels = document.querySelectorAll('[data-panel="intake"]');
      const preparing = Array.from(document.querySelectorAll("h1, h2")).filter(
        (el) => /Preparing your project for production/i.test(el.textContent || ""),
      );
      const closeButtons = Array.from(document.querySelectorAll("button")).filter(
        (el) => el.textContent?.trim() === "Close",
      );
      const campaign = JSON.parse(
        localStorage.getItem("studio-squishy:current-campaign") || "null",
      );
      return {
        panelCount: panels.length,
        preparingCount: preparing.length,
        closeCount: closeButtons.length,
        paidAt: Boolean(campaign?.paymentReceivedAt),
        amountDue: campaign?.approvedStudioPlan?.amountDueTodayCents,
      };
    });
    report.afterReload = afterReload;
    report.proofs.push(await shot(page, "intake-dup-02-refresh.png"));
    report.checks.refreshStillOneSurface =
      afterReload.panelCount === 1 &&
      afterReload.preparingCount === 0 &&
      afterReload.closeCount === 0;
    report.checks.refreshStaysPaid =
      afterReload.paidAt === true && afterReload.amountDue === 6900;

    const failed = Object.entries(report.checks).filter(([, value]) => !value);
    report.ok = failed.length === 0 && report.pageErrors.length === 0;
    report.failed = failed.map(([key]) => key);
  } catch (error) {
    report.ok = false;
    report.error = String(error);
  } finally {
    await writeFile(
      path.join(OUT, "intake-dup-report.json"),
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
