/**
 * Builder QA — Review Room visual + production quality wake for live Maya.
 * Does not approve. Does not request a revision. Does not start Final Delivery.
 *
 * Usage: node scripts/mobile-review-room-quality-qa.mjs
 * Requires HTTPS Studio on localhost:3000.
 */
import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const PAID_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const JOB_ID = `${PAID_ID}:v2-rtu-flyer`;
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

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

function readPaidEnvelope() {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "campaigns", `${PAID_ID}.json`), "utf8"),
  );
}

function observerFlyer(record) {
  return (
    record?.dispatchExecution?.designRendererObserver?.results?.find(
      (row) => row.skuId === "v2-rtu-flyer",
    ) ?? null
  );
}

function flyerJob() {
  const tasksPath = path.join(process.cwd(), "data", "campaign-tasks", `${PAID_ID}.json`);
  if (!existsSync(tasksPath)) return null;
  const tasks = JSON.parse(readFileSync(tasksPath, "utf8"));
  return (
    (tasks.jobRecords ?? []).find((row) => String(row.jobId || "").includes("v2-rtu-flyer")) ??
    null
  );
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function waitForObserverChange(beforeVersion, timeoutMs) {
  const started = Date.now();
  let latest = observerFlyer(readPaidEnvelope().record);
  while (Date.now() - started < timeoutMs) {
    latest = observerFlyer(readPaidEnvelope().record);
    if (!latest) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }
    if (latest.renderVersion !== beforeVersion) return latest;
    if (
      latest.ok &&
      latest.invocationOutcome === "ALREADY_RENDERED" &&
      Date.now() - started > 25000
    ) {
      return latest;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return latest;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { ok: false, checks: {}, proofs: [], pageErrors: [] };
  const beforeRecord = readPaidEnvelope().record;
  const beforeObserver = observerFlyer(beforeRecord);
  report.before = {
    campaignStatus: beforeRecord.campaignStatus,
    observer: beforeObserver,
    job: flyerJob()
      ? {
          spineStatus: flyerJob().spineStatus ?? null,
          qaStatus: flyerJob().internalQaReviewAuthorization?.status ?? null,
        }
      : null,
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

    await page.addInitScript(() => {
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    });

    const wake = await context.request.get(`${BASE}/api/campaigns/current`, {
      timeout: 180000,
    });
    report.checks.wakeStatus = wake.status();
    const afterObserver = await waitForObserverChange(
      beforeObserver?.renderVersion ?? null,
      120000,
    );
    const afterRecord = readPaidEnvelope().record;
    const afterJob = flyerJob();
    report.after = {
      campaignStatus: afterRecord.campaignStatus,
      observer: afterObserver,
      job: afterJob
        ? {
            spineStatus: afterJob.spineStatus ?? null,
            qaStatus: afterJob.internalQaReviewAuthorization?.status ?? null,
          }
        : null,
    };
    report.checks.observerOk = afterObserver?.ok === true;
    report.checks.outcome = afterObserver?.invocationOutcome ?? null;
    report.checks.newVersionMinted =
      Number(afterObserver?.renderVersion ?? 0) >
      Number(beforeObserver?.renderVersion ?? 0);
    report.checks.pngExists = Boolean(
      afterObserver?.pngRelativePath &&
        existsSync(path.join(process.cwd(), afterObserver.pngRelativePath)),
    );
    report.checks.statusReadyForReview = afterRecord.campaignStatus === "READY_FOR_REVIEW";
    report.checks.spineReady = afterJob?.spineStatus === "ready_for_review";
    report.checks.qaEligible =
      afterJob?.internalQaReviewAuthorization?.status === "ELIGIBLE_FOR_REVIEW";

    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector("text=Open Review", { timeout: 20000 });
    await page.waitForTimeout(400);
    const shell = await page.evaluate(() => {
      const text = document.body?.innerText ?? "";
      return {
        businessNameCount: (text.match(/Maya.?s Mobile Boutique/gi) ?? []).length,
        workReadyCount: (text.match(/Work Ready for Review/gi) ?? []).length,
        hasOpenReview: /Open Review/i.test(text),
        hasApprove: /Approve this version/i.test(text),
      };
    });
    report.shell = shell;
    report.checks.shellOpenReview = shell.hasOpenReview === true;
    report.checks.shellDoesNotRepeatWorkReadyExcess = shell.workReadyCount <= 1;
    report.proofs.push(await shot(page, "rr-quality-01-shell.png"));

    await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(JOB_ID)}`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForSelector(".fs-review-proof__image", { timeout: 20000 });
    await page.waitForTimeout(400);
    const workspace = await page.evaluate(() => {
      const text = document.body?.innerText ?? "";
      const img = document.querySelector(".fs-review-proof__image");
      const approve = Array.from(document.querySelectorAll("button")).find((el) =>
        /Approve this version/i.test(el.textContent || ""),
      );
      const revision = Array.from(document.querySelectorAll("button")).find((el) =>
        /Request a revision/i.test(el.textContent || ""),
      );
      const reviewLead = /Review your work — Make Me a Flyer/i.test(text);
      return {
        hasProof: Boolean(img?.getAttribute("src")),
        proofAlt: img?.getAttribute("alt") ?? "",
        hasApprove: Boolean(approve),
        hasRevision: Boolean(revision),
        approveDisabled: approve?.disabled ?? null,
        reviewLeadRepeated: reviewLead,
        businessNameCount: (text.match(/Maya.?s Mobile Boutique/gi) ?? []).length,
        readyForReviewCount: (text.match(/Ready for review/gi) ?? []).length,
        hasStudioReviewTab: /STUDIO REVIEW/i.test(text),
      };
    });
    report.workspace = workspace;
    report.checks.workspaceHasProof = workspace.hasProof === true;
    report.checks.workspaceHasActions =
      workspace.hasApprove === true && workspace.hasRevision === true;
    report.checks.didNotClickApprove = true;
    report.checks.repeatedLeadRemoved = workspace.reviewLeadRepeated === false;
    report.proofs.push(await shot(page, "rr-quality-02-workspace.png"));

    await page.evaluate(() => {
      const rail = document.querySelector(".fs-review__rail");
      if (rail) rail.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(400);
    report.proofs.push(await shot(page, "rr-quality-03-tools.png"));

    await page.evaluate(() => {
      const actions = document.querySelector(".fs-review__choose");
      if (actions) actions.scrollIntoView({ block: "end" });
    });
    await page.waitForTimeout(300);
    report.proofs.push(await shot(page, "rr-quality-04-actions.png"));

    await page.evaluate(() => {
      const panel = document.querySelector(".fs-feedback-panel");
      if (panel) panel.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(400);
    report.proofs.push(await shot(page, "rr-quality-05-review-tools.png"));

    report.ok =
      report.checks.customerOneLogin === true &&
      report.checks.workspaceHasProof === true &&
      report.checks.workspaceHasActions === true &&
      report.checks.didNotClickApprove === true;
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  } finally {
    await browser.close();
    const outFile = path.join(OUT, "rr-quality-qa.json");
    await writeFile(outFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  }
}

main();
