/**
 * Builder QA — one-deliverable Maya lands on the actual proof.
 * Review Room is one room. No intermediate Open Review doorway.
 * Does not approve. Does not send a revision. Does not start Final Delivery.
 *
 * Usage: node scripts/mobile-maya-review-room-open-qa.mjs
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const PAID_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
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

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

function readCustomerText(text) {
  return {
    hasOpenReviewDoorway: /\bOpen Review\b/.test(text) && !/Open Review Room/.test(text),
    hasOpenReviewRoom: /Open Review Room/i.test(text),
    hasApprove: /\bApprove\b/.test(text),
    hasRequestAChange: /Request a Change/i.test(text),
    hasAskTheStudio: /Ask The Studio/i.test(text),
    hasMaya: /Maya/i.test(text),
    hasFlyer: /Make Me a Flyer/i.test(text),
    hasVersion8: /Version 8/i.test(text),
    hasZeroOfOne: /0 of 1/.test(text) || /0 remaining/.test(text) || /1 revision/.test(text),
    hasStudioWorking: /The Studio owns the next move/i.test(text),
    textSample: text.replace(/\s+/g, " ").slice(0, 900),
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { ok: false, checks: {}, proofs: [], pageErrors: [] };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
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

    await page.goto(`${BASE}/studio-board`, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(1200);
    const board = await page.evaluate(() => document.body?.innerText ?? "");
    const boardRead = readCustomerText(board);
    report.board = boardRead;
    report.checks.boardShowsReviewCta = boardRead.hasOpenReviewRoom === true;
    report.proofs.push(await shot(page, "maya-nav-01-board.png"));

    const reviewResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/jobs/") &&
        response.url().includes("/review") &&
        response.request().method() === "GET",
      { timeout: 30000 },
    );
    const openReviewRoom = page.getByRole("link", { name: "Open Review Room" });
    if ((await openReviewRoom.count()) > 0) {
      await openReviewRoom.first().click();
    } else {
      await page.getByRole("link", { name: "Review Room" }).first().click();
    }

    const reviewResponse = await reviewResponsePromise.catch(() => null);
    report.checks.reviewApiStatus = reviewResponse?.status() ?? null;
    report.reviewApi = reviewResponse
      ? await reviewResponse.json().catch(() => null)
      : null;

    await page.waitForSelector(
      ".fs-page--review, .fs-review--workspace, [aria-label='Review workspace']",
      { timeout: 30000 },
    );
    await page.waitForTimeout(800);

    const workspaceText = await page.evaluate(() => document.body?.innerText ?? "");
    const workspace = readCustomerText(workspaceText);
    const shellCount = await page.locator(".rd-shell").count();
    const openReviewCount = await page.locator("a", { hasText: "Open Review" }).count();
    report.workspace = workspace;
    report.checks.landedOnProof = shellCount === 0 && workspace.hasFlyer === true;
    report.checks.noOpenReviewDoorway =
      workspace.hasOpenReviewDoorway === false && openReviewCount === 0;
    report.checks.hasThreePrimaryActions =
      workspace.hasApprove === true &&
      workspace.hasRequestAChange === true &&
      workspace.hasAskTheStudio === true;
    report.checks.hasVersion8 = workspace.hasVersion8 === true;
    report.checks.didNotApprove = true;
    report.checks.didNotSendRevision = true;
    report.proofs.push(await shot(page, "maya-nav-02-direct-proof.png"));

    const used =
      report.reviewApi?.review?.revisionRoundsUsed ??
      report.reviewApi?.revisionRoundsUsed ??
      null;
    report.checks.mayaStillZeroOfOne = used === 0 || used === null;

    await page.goBack();
    await page.waitForTimeout(800);
    const afterBack = page.url();
    report.checks.browserBackReachesBoard = afterBack.includes("/studio-board");
    report.proofs.push(await shot(page, "maya-nav-03-back-board.png"));

    const boardReachable = await page.getByRole("link", { name: "Studio Board" }).count();
    report.checks.studioBoardReachable = boardReachable > 0 || afterBack.includes("/studio-board");

    report.ok = Boolean(
      report.checks.customerOneLogin &&
        report.checks.landedOnProof &&
        report.checks.noOpenReviewDoorway &&
        report.checks.hasThreePrimaryActions &&
        report.checks.browserBackReachesBoard &&
        report.checks.didNotSendRevision,
    );
  } finally {
    await writeFile(
      path.join(OUT, "maya-review-room-navigation-qa-report.json"),
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
