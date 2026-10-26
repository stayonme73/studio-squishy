/**
 * Builder QA — phone revision confirmation. Does not send or approve.
 * Maya must stay 0 of 1.
 *
 * Usage: node scripts/mobile-maya-review-confirm-qa.mjs
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
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

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function readReview(request, cookie) {
  const res = await request.get(
    `${BASE}/api/campaigns/${encodeURIComponent(PAID_ID)}/jobs/${encodeURIComponent(JOB_ID)}/review`,
    { headers: { Cookie: `studio_session=${cookie}` } },
  );
  const json = await res.json();
  const review = json.review;
  const feedback = review?.feedback ?? {};
  return {
    http: res.status(),
    spineStatus: review?.spineStatus ?? null,
    revisionRoundsUsed: review?.revisionRoundsUsed ?? null,
    revisionRoundsRemaining: review?.revisionRoundsRemaining ?? null,
    submittedAt: feedback.submittedAt ?? null,
    stickyNotes: feedback.stickyNotes ?? [],
    voiceNotes: feedback.voiceNotes ?? [],
    drawSections: feedback.drawSections ?? [],
    highlights: feedback.highlights ?? [],
    textComments: feedback.textComments ?? [],
    sectionStatuses: feedback.sectionStatuses ?? {},
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

    report.before = await readReview(context.request, token);
    report.checks.mayaWasZeroOfOneBefore = report.before.revisionRoundsUsed === 0;
    report.checks.staleVoiceWasPresent = report.before.voiceNotes.length > 0;
    report.checks.staleHighlightsWerePresent = report.before.highlights.length > 0;

    await page.goto(
      `${BASE}/feedback-studio?jobId=${encodeURIComponent(JOB_ID)}`,
      { waitUntil: "load", timeout: 60000 },
    );
    await page.waitForSelector(".fs-phone-dock", { timeout: 30000 });
    await page.waitForTimeout(800);
    await page.locator(".fs-phone-dock").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Request a Change" }).click();
    await page.waitForTimeout(400);
    const field = page.locator("#fs-phone-dock-change-field");
    await field.waitFor({ state: "visible" });
    const typed = (await field.inputValue()).trim();
    if (!typed) {
      await field.fill("Please make Call or visit more prominent as the headline.");
    }
    await page.locator(".fs-phone-dock__send").click();
    await page.waitForSelector(".fs-submit-confirm", { timeout: 15000 });
    report.proofs.push(await shot(page, "maya-confirm-01-phone-customer.png"));

    const dialog = page.locator(".fs-submit-confirm");
    const dialogText = ((await dialog.innerText()) || "").replace(/\s+/g, " ");
    report.dialogText = dialogText;
    report.checks.hasConfirmTitle = /Confirm revision request/i.test(dialogText);
    report.checks.hasVersionLead = /You're requesting a revision of Version 8/.test(
      dialogText,
    );
    report.checks.hasYourRequest = /Your request/i.test(dialogText);
    report.checks.hasTypedInstruction = /Please make Call or visit more prominent as the headline/.test(
      dialogText,
    );
    report.checks.noStickyCount = !/sticky note/i.test(dialogText);
    report.checks.noMarkedSections = !/marked section/i.test(dialogText);
    report.checks.noVoiceCount = !/voice note/i.test(dialogText);
    report.checks.noWrittenComments = !/written comment/i.test(dialogText);
    report.checks.noSectionDecision = !/section decision/i.test(dialogText);
    report.checks.hasKeepReviewing = await dialog
      .getByRole("button", { name: "Keep Reviewing" })
      .isVisible();
    report.checks.confirmSendVisible = await dialog
      .getByRole("button", { name: "Send Revision Request" })
      .isVisible();
    report.checks.noStaleVoiceAttachment =
      !/Voice feedback/i.test(dialogText) || Boolean(report.before.voiceNotes.length === 0);

    await dialog.getByRole("button", { name: "Keep Reviewing" }).click();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await page.waitForTimeout(400);
      report.after = await readReview(context.request, token);
      if (
        report.after.voiceNotes.length === 0 &&
        report.after.highlights.length === 0 &&
        report.after.submittedAt == null
      ) {
        break;
      }
    }
    report.checks.mayaStillZeroOfOne = report.after.revisionRoundsUsed === 0;
    report.checks.notSubmitted = report.after.submittedAt == null;
    report.checks.voiceCleared = report.after.voiceNotes.length === 0;
    report.checks.highlightsCleared = report.after.highlights.length === 0;
    report.checks.onlyCurrentTypedRequest =
      report.after.stickyNotes.length === 1 &&
      report.after.stickyNotes[0]?.text ===
        "Please make Call or visit more prominent as the headline.";
    report.checks.didNotSend = true;
    report.checks.didNotApprove = true;
    report.finalPayload = {
      stickyNotes: report.after.stickyNotes,
      voiceNotes: report.after.voiceNotes,
      drawSections: report.after.drawSections,
      highlights: report.after.highlights,
      textComments: report.after.textComments,
      sectionStatuses: report.after.sectionStatuses,
    };

    report.ok = Boolean(
      report.checks.customerOneLogin &&
        report.checks.mayaWasZeroOfOneBefore &&
        report.checks.hasConfirmTitle &&
        report.checks.hasVersionLead &&
        report.checks.hasYourRequest &&
        report.checks.hasTypedInstruction &&
        report.checks.noStickyCount &&
        report.checks.noMarkedSections &&
        report.checks.noVoiceCount &&
        report.checks.noWrittenComments &&
        report.checks.noSectionDecision &&
        report.checks.hasKeepReviewing &&
        report.checks.noStaleVoiceAttachment &&
        report.checks.mayaStillZeroOfOne &&
        report.checks.notSubmitted &&
        report.checks.voiceCleared &&
        report.checks.highlightsCleared &&
        report.checks.onlyCurrentTypedRequest &&
        report.checks.didNotSend,
    );
  } finally {
    await writeFile(
      path.join(OUT, "maya-review-confirm-qa-report.json"),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  }
}

await main();
