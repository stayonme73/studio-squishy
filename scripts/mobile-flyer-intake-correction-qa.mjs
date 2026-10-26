/**
 * Builder QA — targeted Maya flyer Intake correction on the live campaign.
 * Does not rebuild Maya. Does not inject a flyer. Does not force review-ready.
 *
 * Usage: node scripts/mobile-flyer-intake-correction-qa.mjs
 * Requires HTTPS Studio on localhost:3000.
 */
import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const PAID_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);
const PURPOSE = "Grand opening flyer for Maya’s Mobile Boutique";
const MUST_INCLUDE =
  "Grand Opening — first styling appointment $45. Call (804) 555-0142 or visit mayasmobileboutique.example.";
const INTENDED_USE = "Both print and digital";

function loadSessionSecret() {
  const raw = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("SESSION_SECRET=")) continue;
    return line.slice("SESSION_SECRET=".length).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("SESSION_SECRET is not configured");
}

function mintSessionCookie(user, currentCampaignId) {
  const payload = {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    currentCampaignId,
    clientCampaignIds: user.clientCampaignIds ?? [],
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    issuedAt: Date.now(),
  };
  const payloadJson = JSON.stringify(payload);
  const payloadPart = Buffer.from(payloadJson).toString("base64url");
  const signature = createHmac("sha256", loadSessionSecret())
    .update(payloadJson)
    .digest("base64url");
  return `${payloadPart}.${signature}`;
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

function readPaidEnvelope() {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "campaigns", `${PAID_ID}.json`), "utf8"),
  );
}

function flyerAnswers(record) {
  const answers = record?.routeMapIntake?.answers ?? {};
  return {
    submittedAt: record?.routeMapIntakeSubmittedAt ?? null,
    materials: answers["shared:materials"] ?? null,
    flyerPurpose: answers["v2-rtu-flyer:flyerPurpose"] ?? answers.flyerPurpose ?? null,
    mustInclude: answers["v2-rtu-flyer:mustInclude"] ?? answers.mustInclude ?? null,
    intendedUse: answers["v2-rtu-flyer:intendedUse"] ?? answers.intendedUse ?? null,
  };
}

function observerFlyer(record) {
  return (
    record?.dispatchExecution?.designRendererObserver?.results?.find(
      (row) => row.skuId === "v2-rtu-flyer",
    ) ?? null
  );
}

function workingDraftForIntake() {
  const now = new Date().toISOString();
  return {
    version: 1,
    status: "working_draft",
    editable: true,
    updatedAt: now,
    revision: 8,
    cursor: {
      conversationLocation: "conversation-room-stage:intake",
      flowStep: "intake",
      journeyPhase: "conversation",
    },
    attribution: [],
    slices: {
      discoveryAnswers: {
        preferredName: "Maya",
        projectNeed: "Promote Something Now",
        businessName: "Maya’s Mobile Boutique",
        requestedDeadline: "Within 2 weeks",
        deadlineStatus: "unconfirmed",
        existingMaterialsNote: "Nothing yet",
        confirmedAt: now,
      },
      currentConversationLocation: "conversation-room-stage:intake",
      routeRecommendation: {
        roadId: "i20",
        projectNeed: "Promote Something Now",
        recommendedAt: now,
      },
      customerSelectedRoute: { roadId: "i20", selectedAt: now },
      selectedServices: [{ jobId: "v2-rtu-flyer", roadId: "i20", addedAt: now }],
    },
  };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAnswersOnDisk(timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const answers = flyerAnswers(readPaidEnvelope().record);
    if (answers.flyerPurpose && answers.mustInclude && answers.intendedUse) {
      return answers;
    }
    await sleep(500);
  }
  return flyerAnswers(readPaidEnvelope().record);
}

async function waitForObserver(timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const flyer = observerFlyer(readPaidEnvelope().record);
    if (
      flyer &&
      flyer.action === "invoked" &&
      (flyer.ok === true ||
        (flyer.ok === false && flyer.failureCode !== "INVALID_DESIGN_SPEC"))
    ) {
      return flyer;
    }
    await sleep(1000);
  }
  return observerFlyer(readPaidEnvelope().record);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = {
    ok: false,
    checks: {},
    proofs: [],
    pageErrors: [],
    before: flyerAnswers(readPaidEnvelope().record),
  };
  const browser = await chromium.launch({ headless: true });
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
    const login = await context.request.post(`${BASE}/api/auth/local-customer-one`, {
      timeout: 30000,
    });
    const loginBody = await login.json();
    report.checks.customerOneLogin = Boolean(login.ok() && loginBody?.user?.id);
    const token = mintSessionCookie(loginBody.user, PAID_ID);
    await context.addCookies([
      {
        name: "studio_session",
        value: token,
        url: BASE,
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    const envelope = readPaidEnvelope();
    await page.addInitScript(({ draft }) => {
      localStorage.setItem(
        "studio-squishy:working-draft:v1",
        JSON.stringify(draft),
      );
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    }, { draft: workingDraftForIntake() });

    await page.goto(`${BASE}/studio-conversation-room?stage=intake`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.evaluate((campaign) => {
      localStorage.setItem(
        "studio-squishy:current-campaign",
        JSON.stringify(campaign),
      );
    }, envelope.record);
    await page.reload({ waitUntil: "load", timeout: 60000 });
    await page.waitForSelector('[data-panel="intake"][data-surface="page"]', {
      timeout: 25000,
    });
    await page.waitForTimeout(800);

    const opened = await page.evaluate(() => {
      const surface = document.querySelector(
        '[data-panel="intake"][data-surface="page"]',
      );
      const text = surface?.innerText || "";
      const cards = Array.from(
        document.querySelectorAll(
          '[data-panel="intake"][data-surface="page"] .route-map-social-intake__card',
        ),
      ).map((card) =>
        (card.querySelector("h3")?.textContent || "").replace(/\s+/g, " ").trim(),
      );
      return {
        title: surface?.querySelector("h2")?.textContent?.trim() ?? "",
        cardCount: cards.length,
        cards,
        hasMaterialsCard: cards.some((label) => /logo|materials|wordmark/i.test(label)),
        hasAlreadySubmitted: /already been submitted/i.test(text),
        continueDisabled: document.querySelector('[data-intake-action="continue"]')
          ?.disabled,
      };
    });
    report.opened = opened;
    report.checks.targetedReopen =
      opened.cardCount === 3 &&
      opened.hasMaterialsCard === false &&
      opened.hasAlreadySubmitted === false;
    report.proofs.push(await shot(page, "flyer-correction-01-reopen.png"));

    const textareas = page.locator(
      '[data-panel="intake"][data-surface="page"] textarea',
    );
    await textareas.nth(0).fill(PURPOSE);
    await textareas.nth(1).fill(MUST_INCLUDE);
    await page.getByRole("button", { name: INTENDED_USE, exact: true }).click();
    await page.waitForTimeout(400);
    report.proofs.push(await shot(page, "flyer-correction-02-filled.png"));

    const continueBtn = page.locator('[data-intake-action="continue"]');
    report.checks.continueEnabledAfterFacts = (await continueBtn.isDisabled()) === false;
    const correctionPost = page.waitForResponse(
      (response) =>
        response.url().includes("/flyer-intake-correction") &&
        response.request().method() === "POST",
      { timeout: 30000 },
    );
    await continueBtn.click();
    const post = await correctionPost;
    report.checks.correctionPostStatus = post.status();
    report.checks.correctionPostBody = await post.json().catch(() => null);

    const persisted = await waitForAnswersOnDisk(20000);
    report.afterSubmit = persisted;
    report.checks.submittedAtPreserved =
      persisted.submittedAt === report.before.submittedAt;
    report.checks.materialsPreserved = persisted.materials === "I do not have this yet";
    report.checks.purposeSaved = persisted.flyerPurpose === PURPOSE;
    report.checks.mustIncludeSaved = persisted.mustInclude === MUST_INCLUDE;
    report.checks.intendedUseSaved = persisted.intendedUse === INTENDED_USE;
    report.checks.notStudioFee = !String(persisted.mustInclude || "").includes("$69");

    await page.goto(`${BASE}/studio-conversation-room?stage=intake`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForSelector('[data-panel="intake"][data-surface="page"]', {
      timeout: 25000,
    });
    await page.waitForTimeout(600);
    const afterRefresh = await page.evaluate(() => {
      const surface = document.querySelector(
        '[data-panel="intake"][data-surface="page"]',
      );
      const text = surface?.innerText || "";
      const purpose = Array.from(document.querySelectorAll("textarea"))
        .map((el) => el.value)
        .join("\n");
      return {
        alreadySubmitted: /already been submitted/i.test(text),
        stillCorrection: /flyer details are still needed/i.test(text),
        purposePresent: purpose.includes("Grand opening flyer"),
        mustIncludePresent: purpose.includes("$45") && purpose.includes("(804) 555-0142"),
      };
    });
    report.afterRefresh = afterRefresh;
    report.checks.correctionClosedAfterSave =
      afterRefresh.alreadySubmitted === true || afterRefresh.stillCorrection === false;
    report.proofs.push(await shot(page, "flyer-correction-03-refresh.png"));

    const wake = await context.request.get(`${BASE}/api/campaigns/current`, {
      timeout: 180000,
    });
    report.checks.wakeStatus = wake.status();
    const observer = await waitForObserver(180000);
    report.observer = observer;
    report.checks.rendererInvoked = observer?.action === "invoked";
    report.checks.rendererOk = observer?.ok === true;
    report.checks.rendererOutcome = observer?.invocationOutcome ?? null;
    report.checks.pngExists = Boolean(
      observer?.pngRelativePath &&
        existsSync(path.join(process.cwd(), observer.pngRelativePath)),
    );
    report.checks.notFakeFlyer =
      report.checks.pngExists === true && observer?.ok === true;

    const latest = readPaidEnvelope().record;
    report.campaignStatus = latest.campaignStatus;
    report.checks.statusNotForced =
      latest.campaignStatus !== "READY_FOR_REVIEW" || observer?.ok === true;

    const tasksPath = path.join(
      process.cwd(),
      "data",
      "campaign-tasks",
      `${PAID_ID}.json`,
    );
    let job = null;
    if (existsSync(tasksPath)) {
      const tasks = JSON.parse(readFileSync(tasksPath, "utf8"));
      job =
        (tasks.jobRecords ?? []).find((row) =>
          String(row.jobId || "").includes("v2-rtu-flyer"),
        ) ?? null;
    }
    report.job = job
      ? {
          spineStatus: job.spineStatus ?? null,
          qaStatus: job.internalQaReviewAuthorization?.status ?? null,
        }
      : null;
    report.checks.legitimatelyReviewReady =
      report.checks.rendererOk === true &&
      report.job?.spineStatus === "ready_for_review" &&
      report.job?.qaStatus === "ELIGIBLE_FOR_REVIEW";

    report.ok = Boolean(
      report.checks.targetedReopen &&
        report.checks.purposeSaved &&
        report.checks.mustIncludeSaved &&
        report.checks.intendedUseSaved &&
        report.checks.submittedAtPreserved &&
        report.checks.materialsPreserved &&
        report.checks.notStudioFee,
    );
  } finally {
    await writeFile(
      path.join(OUT, "flyer-correction-qa-report.json"),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
