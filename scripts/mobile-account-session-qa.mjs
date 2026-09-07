/**
 * Builder QA — local session config for Create Account.
 * Does not use the owner's Samsung email. Does not print secrets.
 *
 * Usage: node scripts/mobile-account-session-qa.mjs
 * Requires HTTPS Studio on localhost:3000 with SESSION_SECRET loaded.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

function paidSubmittedSeed(campaignId) {
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
      revision: 8,
      cursor: {
        conversationLocation: "intake",
        flowStep: "intake-submitted",
        journeyPhase: "intake",
      },
      attribution: [],
      slices: {
        discoveryAnswers: opening,
        currentConversationLocation: "intake",
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
      campaignId,
      campaignName: "Maya’s Mobile Boutique",
      campaignStatus: "PAYMENT_RECEIVED",
      updatedAt: now,
      paymentReceivedAt: now,
      routeMapIntakeSubmittedAt: now,
      routeMapIntake: {
        submittedAt: now,
        answers: {
          "shared:materials": "I will provide this later",
          "v2-rtu-flyer:flyerPurpose": "Grand opening flyer",
          "v2-rtu-flyer:mustInclude": "Maya’s Mobile Boutique",
          "v2-rtu-flyer:intendedUse": "Print",
        },
      },
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
            revisionRule: "1 round",
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

async function removeQaUser(email) {
  try {
    const raw = await readFile(USERS_PATH, "utf8");
    const users = JSON.parse(raw);
    const next = users.filter(
      (user) => String(user.email || "").toLowerCase() !== email.toLowerCase(),
    );
    await writeFile(USERS_PATH, `${JSON.stringify(next, null, 2)}\n`);
  } catch {
    /* ignore */
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { ok: false, checks: {}, proofs: [], pageErrors: [] };
  const campaignId = `session-qa-${Date.now()}`;
  const email = `session-qa-${Date.now()}@example.com`;
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", (error) => {
    const message = String(error);
    if (message.includes("appendChild")) return;
    report.pageErrors.push(message.slice(0, 400));
  });

  try {
    const seed = paidSubmittedSeed(campaignId);
    await page.addInitScript(({ draft, guide, campaign }) => {
      if (sessionStorage.getItem("qa-session-seeded")) return;
      sessionStorage.setItem("qa-session-seeded", "1");
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

    await page.goto(`${BASE}/sign-up?from=%2Fstudio-board`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.locator("#sign-up-title").waitFor({ timeout: 15000 });
    await page.getByRole("button", { name: "Show password" }).waitFor({
      timeout: 15000,
    });
    await page.getByLabel(/your name/i).fill("Maya QA");
    await page.getByLabel(/^email$/i).fill(email);
    await page.getByLabel(/^password$/i).fill("secure-pass-99");
    const filled = {
      name: await page.getByLabel(/your name/i).inputValue(),
      email: await page.getByLabel(/^email$/i).inputValue(),
      passwordLength: (await page.getByLabel(/^password$/i).inputValue()).length,
    };
    report.filled = {
      name: filled.name,
      emailMatches: filled.email === email,
      passwordLength: filled.passwordLength,
    };
    report.proofs.push(await shot(page, "account-session-00-form.png"));

    const createBtn = page.getByRole("button", {
      name: "Create account",
      exact: true,
    });
    await createBtn.scrollIntoViewIfNeeded();
    const signupResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/signup") &&
        response.request().method() === "POST",
    );
    await Promise.all([
      signupResponsePromise,
      createBtn.click(),
    ]);
    const signupResponse = await signupResponsePromise;
    const signupBody = await signupResponse.json().catch(() => ({}));
    report.signupStatus = signupResponse.status();
    report.checks.signupOk = signupResponse.ok();
    report.checks.noSecretLeak = !/session_secret/i.test(
      JSON.stringify(signupBody),
    );
    report.checks.sessionCookie = (await context.cookies()).some(
      (cookie) => cookie.name === "studio_session" && cookie.value.length > 0,
    );

    await page.waitForURL(/\/studio-board/, { timeout: 15000 });
    await page.getByRole("heading", { name: "Studio Board" }).waitFor({
      timeout: 15000,
    });
    await page
      .locator("#sb-current-campaign-title")
      .filter({ hasText: /Boutique/i })
      .waitFor({ timeout: 15000 });
    report.checks.boardOpened = /\/studio-board/.test(page.url());
    const afterSignup = await page.evaluate(() => {
      const campaignRaw = localStorage.getItem(
        "studio-squishy:current-campaign",
      );
      const campaign = campaignRaw ? JSON.parse(campaignRaw) : null;
      return {
        paidAt: Boolean(campaign?.paymentReceivedAt),
        amountDue: campaign?.approvedStudioPlan?.amountDueTodayCents ?? null,
        flyer: Boolean(
          campaign?.approvedStudioPlan?.selectedServiceIds?.includes(
            "v2-rtu-flyer",
          ),
        ),
        intakeSubmitted: Boolean(campaign?.routeMapIntakeSubmittedAt),
        campaignId: campaign?.campaignId ?? null,
      };
    });
    report.afterSignup = afterSignup;
    report.checks.paidAttached = afterSignup.paidAt === true && afterSignup.amountDue === 6900;
    report.checks.flyerAttached = afterSignup.flyer === true;
    report.checks.intakeAttached = afterSignup.intakeSubmitted === true;
    report.checks.sameCampaign = afterSignup.campaignId === campaignId;
    report.proofs.push(await shot(page, "account-session-01-board.png"));

    const sessionRes = await page.evaluate(async () => {
      const response = await fetch("/api/auth/session", {
        credentials: "include",
      });
      const body = await response.json().catch(() => ({}));
      return {
        ok: response.ok,
        hasUser: Boolean(body.user?.id),
      };
    });
    report.session = sessionRes;
    report.checks.authenticatedSession = sessionRes.hasUser === true;

    await page.reload({ waitUntil: "load" });
    await page.waitForURL(/\/studio-board/, { timeout: 15000 });
    await page
      .locator("#sb-current-campaign-title")
      .filter({ hasText: /Boutique/i })
      .waitFor({ timeout: 15000 });
    const afterReload = await page.evaluate(async () => {
      const response = await fetch("/api/auth/session", {
        credentials: "include",
      });
      const body = await response.json().catch(() => ({}));
      const campaignRaw = localStorage.getItem(
        "studio-squishy:current-campaign",
      );
      const campaign = campaignRaw ? JSON.parse(campaignRaw) : null;
      return {
        url: location.href,
        hasUser: Boolean(body.user?.id),
        paidAt: Boolean(campaign?.paymentReceivedAt),
        flyer: Boolean(
          campaign?.approvedStudioPlan?.selectedServiceIds?.includes(
            "v2-rtu-flyer",
          ),
        ),
      };
    });
    report.afterReload = afterReload;
    report.checks.refreshStillBoard = /\/studio-board/.test(afterReload.url);
    report.checks.refreshStillSession = afterReload.hasUser === true;
    report.checks.refreshStillPaid = afterReload.paidAt === true;
    report.proofs.push(await shot(page, "account-session-02-refresh.png"));

    const failed = Object.entries(report.checks).filter(([, value]) => !value);
    report.ok = failed.length === 0 && report.pageErrors.length === 0;
    report.failed = failed.map(([key]) => key);
  } catch (error) {
    report.ok = false;
    report.error = String(error);
    try {
      report.debug = {
        url: page.url(),
        buttons: await page.getByRole("button").allTextContents(),
      };
      report.proofs.push(await shot(page, "account-session-error.png"));
    } catch {
      /* ignore debug failures */
    }
  } finally {
    await removeQaUser(email);
    await writeFile(
      path.join(OUT, "account-session-report.json"),
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
