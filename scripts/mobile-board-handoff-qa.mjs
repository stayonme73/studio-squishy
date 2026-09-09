/**
 * Builder QA — local/test Customer-One auth fixture → Studio Board.
 * Does not type a password. Does not use the owner's email.
 * Does not create a third Maya account.
 *
 * Usage: node scripts/mobile-board-handoff-qa.mjs
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
        selectedServices: [{ jobId: "v2-rtu-flyer", roadId: "i20", addedAt: now }],
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

async function countMayaAccounts() {
  try {
    const users = JSON.parse(await readFile(USERS_PATH, "utf8"));
    const maya = users.filter((user) => String(user.displayName || "").trim() === "Maya");
    return {
      total: users.length,
      maya: maya.length,
      mayaEmails: new Set(maya.map((user) => String(user.email || "").toLowerCase())).size,
    };
  } catch {
    return { total: 0, maya: 0, mayaEmails: 0 };
  }
}

function readBoardState() {
  const campaignRaw = localStorage.getItem("studio-squishy:current-campaign");
  const campaign = campaignRaw ? JSON.parse(campaignRaw) : null;
  const text = document.body?.innerText ?? "";
  return {
    url: location.href,
    paidAt: Boolean(campaign?.paymentReceivedAt),
    amountDue: campaign?.approvedStudioPlan?.amountDueTodayCents ?? null,
    flyer: Boolean(
      campaign?.approvedStudioPlan?.selectedServiceIds?.includes("v2-rtu-flyer"),
    ),
    intakeSubmitted: Boolean(campaign?.routeMapIntakeSubmittedAt),
    roadId: campaign?.routeMapContext?.roadId ?? null,
    campaignId: campaign?.campaignId ?? null,
    title: document.querySelector("#sb-current-campaign-title")?.textContent ?? "",
    visibleFlyer: /Make Me a Flyer/i.test(text),
    visiblePrice: /\$69/.test(text),
    visibleRoute: /Promote Something Now/i.test(text),
    visibleIntake: /Project Intake submitted/i.test(text),
    visibleBoutique: /Boutique/i.test(text),
  };
}

function readLayout() {
  const review = document.querySelector(".studio-review-mobile-tab");
  const signOutEl = [...document.querySelectorAll("button, a")].find((el) =>
    /sign out/i.test(el.textContent || ""),
  );
  const board = document.querySelector('[aria-label="Studio Board"]');
  const snapshot = document.querySelector(".sb-project-snapshot");
  const reviewBox = review?.getBoundingClientRect();
  const signOutBox = signOutEl?.getBoundingClientRect();
  const snapshotBox = snapshot?.getBoundingClientRect();
  const overlapReviewSignOut = Boolean(
    reviewBox &&
      signOutBox &&
      reviewBox.top < signOutBox.bottom &&
      reviewBox.bottom > signOutBox.top &&
      reviewBox.left < signOutBox.right &&
      reviewBox.right > signOutBox.left,
  );
  const nestedScroll = Boolean(
    board &&
      getComputedStyle(board).overflowY === "auto" &&
      document.documentElement.scrollHeight > window.innerHeight + 8,
  );
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    reviewHeight: reviewBox ? Math.round(reviewBox.height) : 0,
    reviewSecondary: Boolean(review) && (reviewBox?.height ?? 0) <= 80,
    overlapReviewSignOut,
    snapshotCoveredByReview: Boolean(
      reviewBox &&
        snapshotBox &&
        snapshotBox.bottom > reviewBox.top + 8 &&
        snapshotBox.top < reviewBox.bottom,
    ),
    nestedScroll,
    bodyOverflowY: getComputedStyle(document.body).overflowY,
    mainOverflowY: getComputedStyle(document.querySelector("main") ?? document.body)
      .overflowY,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { ok: false, checks: {}, proofs: [], pageErrors: [] };
  const campaignId = `board-handoff-qa-${Date.now()}`;
  const beforeMaya = await countMayaAccounts();
  report.beforeMaya = beforeMaya;

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

    await page.goto(`${BASE}/sign-in?from=%2Fstudio-board`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.locator("#sign-in-title").waitFor({ timeout: 15000 });
    await page.getByText("LOCAL DEVELOPER TEST", { exact: true }).waitFor({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Continue as Customer-One" }).waitFor({
      timeout: 15000,
    });
    await page
      .getByRole("button", { name: "Continue as Customer-One" })
      .scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    report.checks.fixtureVisibleOnLocalSignIn = true;
    report.proofs.push(await shot(page, "local-auth-fixture-01-signin.png"));

    const fixtureResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/local-customer-one") &&
        response.request().method() === "POST",
    );
    await Promise.all([
      fixtureResponsePromise,
      page.getByRole("button", { name: "Continue as Customer-One" }).click(),
    ]);
    const fixtureResponse = await fixtureResponsePromise;
    report.fixtureStatus = fixtureResponse.status();
    report.checks.fixtureAuthOk = fixtureResponse.ok();
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
    await page
      .locator(".sb-project-snapshot")
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    await page.waitForTimeout(400);

    const afterSignIn = await page.evaluate(readBoardState);
    const layout = await page.evaluate(readLayout);
    report.afterSignIn = afterSignIn;
    report.layout = layout;
    report.checks.boardOpened = /\/studio-board/.test(page.url());
    report.checks.paidAttached = afterSignIn.paidAt === true && afterSignIn.amountDue === 6900;
    report.checks.flyerAttached = afterSignIn.flyer === true;
    report.checks.routeI20 = afterSignIn.roadId === "i20";
    report.checks.intakeAttached = afterSignIn.intakeSubmitted === true;
    report.checks.sameCampaign = afterSignIn.campaignId === campaignId;
    report.checks.visibleBoutique = afterSignIn.visibleBoutique === true;
    report.checks.visibleFlyer = afterSignIn.visibleFlyer === true;
    report.checks.visiblePrice = afterSignIn.visiblePrice === true;
    report.checks.visibleIntake = afterSignIn.visibleIntake === true;
    report.routeLabelOnBoard = afterSignIn.visibleRoute === true;
    report.checks.reviewSecondary = layout.reviewSecondary === true;
    report.checks.noReviewOverlapSignOut = layout.overlapReviewSignOut === false;
    report.checks.noHorizontalOverflow = layout.horizontalOverflow === false;
    report.checks.noNestedScrollTrap = layout.nestedScroll === false;
    report.proofs.push(await shot(page, "local-auth-fixture-02-board-top.png"));
    const snapshot = page.locator(".sb-project-snapshot");
    if (await snapshot.count()) {
      await snapshot.scrollIntoViewIfNeeded();
      report.proofs.push(await shot(page, "local-auth-fixture-03-snapshot.png"));
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    report.proofs.push(await shot(page, "local-auth-fixture-04-board-bottom.png"));

    const sessionRes = await page.evaluate(async () => {
      const response = await fetch("/api/auth/session", { credentials: "include" });
      const body = await response.json().catch(() => ({}));
      return {
        ok: response.ok,
        hasUser: Boolean(body.user?.id),
        displayName: body.user?.displayName ?? null,
      };
    });
    report.session = sessionRes;
    report.checks.authenticatedSession = sessionRes.hasUser === true;
    report.checks.sessionIsMaya = sessionRes.displayName === "Maya";

    await page.reload({ waitUntil: "load" });
    await page.waitForURL(/\/studio-board/, { timeout: 15000 });
    await page
      .locator("#sb-current-campaign-title")
      .filter({ hasText: /Boutique/i })
      .waitFor({ timeout: 15000 });
    const afterReload = await page.evaluate(readBoardState);
    const sessionAfterReload = await page.evaluate(async () => {
      const response = await fetch("/api/auth/session", { credentials: "include" });
      const body = await response.json().catch(() => ({}));
      return { ok: response.ok, hasUser: Boolean(body.user?.id) };
    });
    report.afterReload = afterReload;
    report.sessionAfterReload = sessionAfterReload;
    report.checks.refreshStillBoard = /\/studio-board/.test(afterReload.url);
    report.checks.refreshStillPaid = afterReload.paidAt === true;
    report.checks.refreshStillFlyer = afterReload.flyer === true;
    report.checks.refreshStillIntake =
      afterSignIn.intakeSubmitted === true && afterReload.intakeSubmitted === true;
    report.checks.refreshStillAuthenticated = sessionAfterReload.hasUser === true;
    report.proofs.push(await shot(page, "local-auth-fixture-05-refresh.png"));

    const afterMaya = await countMayaAccounts();
    report.afterMaya = afterMaya;
    report.checks.noExtraMayaAccount = afterMaya.maya === beforeMaya.maya;

    const failed = Object.entries(report.checks).filter(([, value]) => !value);
    report.ok = failed.length === 0 && report.pageErrors.length === 0;
    report.failed = failed.map(([key]) => key);
  } catch (error) {
    report.ok = false;
    report.error = String(error);
    try {
      report.debug = { url: page.url() };
      report.proofs.push(await shot(page, "local-auth-fixture-error.png"));
    } catch {
      /* ignore */
    }
  } finally {
    await writeFile(
      path.join(OUT, "local-auth-fixture-report.json"),
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
