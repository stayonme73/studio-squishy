/**
 * Builder QA: Studio Board binds a fresh non-Maya current campaign.
 * Does not remint Maya. Does not start Customer-One production. Does not merge.
 *
 * Usage: node scripts/mobile-board-current-customer-bind-qa.mjs
 * Requires HTTPS Studio on localhost:3000.
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const MAYA_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const MAYA_FILE = path.join(process.cwd(), "data", "campaigns", `${MAYA_ID}.json`);
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);
const PAID_AT = "2026-09-12T18:30:00.000Z";
const CUSTOMER_NAME = "Jordan";
const BUSINESS_NAME = "Harbor & Co.";

async function hashMayaFile() {
  const raw = await readFile(MAYA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return {
    sha256: createHash("sha256").update(raw).digest("hex"),
    freeze: parsed?.record?.productionFreeze ?? null,
    campaignName: parsed?.record?.campaignName ?? null,
    paymentReceivedAt: parsed?.record?.paymentReceivedAt ?? null,
  };
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const beforeMaya = await hashMayaFile();
  if (beforeMaya.freeze?.renderVersion !== 16 || beforeMaya.freeze?.doNotRemint !== true) {
    throw new Error("Maya envelope is not frozen at Version 16 before QA");
  }

  const campaignId = randomUUID();
  const email = `jordan-board-bind-${Date.now()}@local.dev`;
  const browser = await chromium.launch({ headless: true });
  const report = {
    ok: false,
    proofs: [],
    beforeMaya,
    afterMaya: null,
    user: null,
    campaignId,
    board: null,
  };

  try {
    const ctx = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 360, height: 780 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: "en-US",
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);

    await page.goto(`${BASE}/studio-lobby?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });

    const signup = await ctx.request.post(`${BASE}/api/auth/signup`, {
      data: {
        email,
        password: "StudioBoardBind9",
        displayName: CUSTOMER_NAME,
      },
    });
    const signupBody = await signup.json();
    if (!signup.ok() || !signupBody?.user?.id) {
      throw new Error(`Fresh customer signup failed: ${JSON.stringify(signupBody)}`);
    }
    if (String(signupBody.user.displayName) === "Maya") {
      throw new Error("Signup returned Maya instead of a fresh identity");
    }
    report.user = {
      id: signupBody.user.id,
      displayName: signupBody.user.displayName,
      email,
      currentCampaignId: signupBody.user.currentCampaignId ?? null,
    };

    await page.evaluate(
      ({ campaign, sandboxKey }) => {
        window.localStorage.setItem(
          "studio-squishy:current-campaign",
          JSON.stringify(campaign),
        );
        window.sessionStorage.setItem(sandboxKey, "1");
      },
      {
        sandboxKey: "studio-payment:sandbox-opt-in:v1",
        campaign: {
          campaignId,
          campaignName: BUSINESS_NAME,
          campaignStatus: "PAYMENT_RECEIVED",
          campaignDescription: "We received your payment.",
          estimatedCompletion: "After Project Intake",
          packageId: "custom-studio-plan",
          packageLabel: "Custom Studio Plan",
          paymentReceivedAt: PAID_AT,
          createdAt: PAID_AT,
          updatedAt: PAID_AT,
          deliverablesDelivered: {},
          approvedStudioPlan: {
            selectedServiceIds: ["v2-rtu-flyer"],
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
                deliverables: ["One flyer"],
                exclusions: [],
                timingWindowLabel: "3–5 days",
                revisionRule: "1 round",
                clientResponsibilities: [],
                executionResponsibility: "Studio",
              },
            ],
            approvedAt: PAID_AT,
          },
          routeMapContext: {
            roadId: "i20",
            jobId: "v2-rtu-flyer",
            selectedServiceIds: ["v2-rtu-flyer"],
            currentStep: "intake",
            selectedAt: PAID_AT,
          },
        },
      },
    );

    await page.goto(`${BASE}/studio-board?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForSelector(".sb-header-v3", { timeout: 20000 });
    await page.waitForTimeout(1500);
    report.proofs.push(await shot(page, "board-current-customer-bind-01-samsung.png"));

    const board = await page.evaluate(async () => {
      const text = document.body.innerText;
      const currentRes = await fetch("/api/campaigns/current", {
        credentials: "include",
      });
      const currentBody = await currentRes.json().catch(() => ({}));
      const local = window.localStorage.getItem("studio-squishy:current-campaign");
      return {
        text,
        greeting: document.querySelector(".sb-header-v3__greeting")?.textContent ?? "",
        name: document.querySelector(".sb-header-v3__name")?.textContent ?? "",
        hasFixture:
          Boolean(document.querySelector("[data-local-test-fixture]")) ||
          /LOCAL DEVELOPER TEST/i.test(text) ||
          /Save Studio fixture file/i.test(text),
        refundCollapsed: Boolean(
          document.querySelector("[data-refund-disclosure]:not([open])"),
        ),
        localCampaignId: local ? JSON.parse(local).campaignId : null,
        localCampaignName: local ? JSON.parse(local).campaignName : null,
        localPaidAt: local ? JSON.parse(local).paymentReceivedAt : null,
        currentStatus: currentRes.status,
        currentCampaignId: currentBody?.campaign?.record?.campaignId ?? currentBody?.campaign?.campaignId ?? null,
        currentCampaignName: currentBody?.campaign?.record?.campaignName ?? null,
      };
    });
    report.board = board;

    if (!/Jordan/i.test(board.greeting) && board.name !== CUSTOMER_NAME) {
      throw new Error(`Greeting is not the fresh customer: ${board.greeting}`);
    }
    if (/Maya/i.test(board.greeting) || /Maya/i.test(board.name)) {
      throw new Error("Greeting still shows Maya");
    }
    if (!board.text.includes(BUSINESS_NAME)) {
      throw new Error("Board does not show the fresh Harbor & Co. project");
    }
    if (/Maya.?s Mobile Boutique/i.test(board.text)) {
      throw new Error("Board still shows Maya’s Mobile Boutique");
    }
    if (!/September 12, 2026/i.test(board.text)) {
      throw new Error(`Payment date is not the new sandbox payment: missing September 12, 2026`);
    }
    if (/September 6, 2026/i.test(board.text)) {
      throw new Error("Board still shows Maya’s September 6 payment date");
    }
    if (board.hasFixture) {
      throw new Error("Developer fixture control is visible on the customer Board");
    }
    if (/0 of 1 complete/i.test(board.text) && /Ready for Review/i.test(board.text)) {
      throw new Error("Board says Ready for Review and 0 of 1 complete together");
    }
    if (board.localCampaignId !== campaignId) {
      throw new Error("Browser current campaign was overwritten");
    }
    if (board.currentCampaignId === MAYA_ID) {
      throw new Error("GET /api/campaigns/current still points this identity at Maya");
    }
    if (!board.refundCollapsed) {
      throw new Error("Billing & cancellation is no longer collapsed");
    }

    report.afterMaya = await hashMayaFile();
    if (report.afterMaya.sha256 !== beforeMaya.sha256) {
      throw new Error("Maya campaign file changed during Board bind QA");
    }
    if (report.afterMaya.freeze?.renderVersion !== 16) {
      throw new Error("Maya freeze version is no longer 16");
    }

    report.ok = true;
    await writeFile(
      path.join(OUT, "board-current-customer-bind-qa.json"),
      JSON.stringify(report, null, 2),
    );
    console.log("PASS Studio Board current-customer bind");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("FAIL Studio Board current-customer bind");
  console.error(error);
  process.exit(1);
});
