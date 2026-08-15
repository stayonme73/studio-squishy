/**
 * STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1
 * Live Maya Brooks / Cedar & Bloom lifecycle-email walk.
 *
 * Run (Windows, existing Next on 3066):
 *   $env:PLAYWRIGHT_BROWSERS_PATH="$env:USERPROFILE\AppData\Local\ms-playwright"
 *   $env:CERT_BASE_URL="http://127.0.0.1:3066"
 *   $env:SESSION_SECRET="materials-upload-board-walk-ephemeral-not-for-production"
 *   npx tsx scripts/studio-operating-resend-lifecycle-notifications-and-watchdog-1-board-walk.mts
 */
import { chromium, type Browser, type Page } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function loadDotEnvLocal(): void {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
loadDotEnvLocal();

import type { CampaignRecord } from "../src/config/studio-board";
import { studioVoiceMachineCustomerCommunicationV1 } from "../src/config/studio-voice-machine-customer-communication-v1";
import { SESSION_COOKIE_NAME, createSessionToken } from "../src/lib/auth/session";
import {
  createClientAccount,
  findUserByEmail,
  findUserById,
  linkClientCampaign,
  markEmailVerified,
  toPublicUser,
} from "../src/lib/auth/users";
import { readCampaignEnvelope, upsertCampaignRecord } from "../src/lib/campaign-store/store";
import { getOrGenerateTasks, readTasksEnvelope, writeTasksEnvelope } from "../src/lib/campaign-tasks/store";
import { getOrInitializeMaterials } from "../src/lib/materials/store";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "../src/lib/plan-pricing";
import { recoverPaidOperatingChain } from "../src/lib/studio-paid-activation-recovery";
import { buildJobId } from "../src/lib/job-control/lane-map";
import { enqueueJobCommunicationRecord } from "../src/lib/job-control/communication";
import { createResendTransactionalAdapter } from "../src/lib/transactional-email/providers/resend";
import { sendTransactionalEmail } from "../src/lib/transactional-email";
import {
  composeCustomerEmail,
  deliverAuthorizedLifecycleNotices,
  evaluateLifecycleWatchdogFindings,
  isResendLifecycleConfigured,
  lifecycleNoticeReceipt,
  recoverMissingAuthorizedNotices,
  resolveLifecycleRecipientEmail,
  runLifecycleWatchdogSweep,
} from "../src/lib/studio-lifecycle-email";
import { askCustomerLifeFromStore } from "../src/lib/studio-customer-life";

const PORT = process.env.CERT_PORT || "3066";
const EXTERNAL_BASE = (process.env.CERT_BASE_URL || `http://127.0.0.1:${PORT}`).replace(/\/$/, "");
const SESSION_SECRET =
  process.env.WALK_SESSION_SECRET ||
  "materials-upload-board-walk-ephemeral-not-for-production";
process.env.SESSION_SECRET = SESSION_SECRET;

const SAFE_RECIPIENT =
  process.env.STUDIO_SAFE_TEST_RECIPIENT?.trim() || "thestudio7273@gmail.com";
const STAMP = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 12);
const OUT = join(
  process.cwd(),
  "docs",
  "launch",
  "studio-operating-resend-lifecycle-notifications-and-watchdog-1",
);
const SHOTS = join(OUT, "customer-board-walk", "shots");
mkdirSync(SHOTS, { recursive: true });

const MAYA_MUST_INCLUDE = [
  "Cedar & Bloom Home Organizing",
  "Back-to-School Reset",
  "2-hour home organization session",
  "$149",
  "August 24 through September 14, 2026",
  "Includes: one 2-hour organizing session; organization of one selected household area; simple organization plan for maintaining the space.",
  "Customers may choose: pantry, entryway, children's homework area, closet, or home office.",
  "(804) 555-0186",
  "cedarandbloom.example",
  "Book Your Reset",
].join("\n");

const MAYA_STYLE_NOTE =
  "Style: warm, clean, calm, uncluttered. Soft neutral atmosphere with subtle botanical influence. Do not use childish school graphics, cartoon pencils, school buses, loud primary colors, or cluttered layouts. No logo. No photos. No social handles. No testimonials. No discount. No guarantee. Do not state a service area.";

type Check = { check: string; status: "PASS" | "FAIL" | "BLOCKED"; detail?: string; shot?: string };
const results: Check[] = [];
const asked: Array<{ question: string; answer: string }> = [];

function push(check: string, status: Check["status"], detail?: string, shot?: string): void {
  results.push({ check, status, detail, shot });
  console.log(detail ? `${status}  ${check} — ${detail}` : `${status}  ${check}`);
}

function senderIdentitySafe(): { present: boolean; hasAt: boolean; looksLikeStudio: boolean } {
  const from = process.env.TRANSACTIONAL_EMAIL_FROM?.trim() ?? "";
  return {
    present: from.length > 0,
    hasAt: from.includes("@"),
    looksLikeStudio: /the studio/i.test(from),
  };
}

function commSnapshot(records: readonly { id: string; eventType: string; deliveryStatus: string; transportAttempts?: number; lastTransportCode?: string; transportProviderMessageId?: string; templateId: string; reason: string; messageContent: string }[] | undefined) {
  return (records ?? []).map((record) => ({
    id: record.id,
    eventType: record.eventType,
    deliveryStatus: record.deliveryStatus,
    attempts: record.transportAttempts ?? 0,
    lastTransportCode: record.lastTransportCode,
    providerMessageId: record.transportProviderMessageId,
    templateId: record.templateId,
    subject: record.reason,
    excerpt: record.messageContent.slice(0, 180),
    receipt: lifecycleNoticeReceipt(record as never),
  }));
}

function mayaPaidCampaign(
  campaignId: string,
  options?: { intakeComplete?: boolean },
): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals(["v2-rtu-flyer"]);
  const lineItems = buildServiceScopeSnapshot(["v2-rtu-flyer"]);
  const intakeComplete = options?.intakeComplete !== false;
  return {
    campaignId,
    campaignName: "Cedar & Bloom Home Organizing",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Back-to-School Reset flyer",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    ...(intakeComplete
      ? {
          projectDetailsSubmittedAt: now,
          routeMapIntakeSubmittedAt: now,
          routeMapIntake: {
            submittedAt: now,
            answers: {
              flyerPurpose: "Promotional flyer for Back-to-School Reset",
              mustInclude: `${MAYA_MUST_INCLUDE}\n\n${MAYA_STYLE_NOTE}`,
              materials: "No logo. No photos. Please use the business name as a wordmark.",
              intendedUse: "Both print and digital",
              callToAction: "Book Your Reset",
            },
          },
        }
      : {}),
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      confirmedAmountCents: 6900,
      checkoutSessionId: `cs_maya_resend_${campaignId}`,
      paymentIntentId: `pi_maya_resend_${campaignId}`,
      stripeEventId: `evt_maya_resend_${campaignId}`,
      selectedServiceIds: ["v2-rtu-flyer"],
      decisionId: `dec_maya_resend_${campaignId}`,
      factFingerprint: `fp_maya_resend_${campaignId}`,
      draftRevision: 1,
      confirmedAt: now,
    },
    revisionRoundsUsed: 0,
    revisionRoundsIncluded: 1,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: ["v2-rtu-flyer"],
      includedServiceIds: ["v2-rtu-flyer"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems,
      approvedAt: now,
    },
  };
}

async function waitForServer(url: string, attempts = 30): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`${url}/api/auth/session`, { method: "GET" });
      if (res.status > 0) return true;
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function ensureMayaUser(): Promise<{ id: string; email: string }> {
  const existing = await findUserByEmail(SAFE_RECIPIENT);
  if (existing) {
    await markEmailVerified(existing.id);
    return { id: existing.id, email: existing.email };
  }
  const created = await createClientAccount({
    email: SAFE_RECIPIENT,
    password: "MayaLifecycle-Walk-0815!",
    displayName: "Maya Brooks",
  });
  if (!created.ok) {
    throw new Error(created.message);
  }
  await markEmailVerified(created.user.id);
  return { id: created.user.id, email: created.user.email };
}

async function mintCookie(userId: string): Promise<string> {
  const record = await findUserById(userId);
  if (!record) throw new Error("Maya user missing after create.");
  return createSessionToken(toPublicUser(record));
}

async function seedCampaign(
  campaignId: string,
  userId: string | null,
  intakeComplete: boolean,
) {
  const campaign = mayaPaidCampaign(campaignId, { intakeComplete });
  await upsertCampaignRecord(campaign, userId ?? undefined);
  if (userId) await linkClientCampaign(userId, campaignId);
  await getOrInitializeMaterials(campaignId, campaign);
  await getOrGenerateTasks(campaignId, campaign);
  return campaign;
}

async function inspectResendMessage(id: string | undefined): Promise<{
  inspected: boolean;
  httpStatus?: number;
  from?: string;
  to?: unknown;
  subject?: string;
  lastEvent?: string;
}> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key || !id) return { inspected: false };
  const response = await fetch(`https://api.resend.com/emails/${id}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    return { inspected: false, httpStatus: response.status };
  }
  const body = (await response.json()) as {
    from?: string;
    to?: unknown;
    subject?: string;
    last_event?: string;
  };
  return {
    inspected: true,
    httpStatus: response.status,
    from: body.from,
    to: body.to,
    subject: body.subject,
    lastEvent: body.last_event,
  };
}

async function sendProjectMessage(page: Page, text: string): Promise<string> {
  const form = page.locator("form.sb-project-communication__composer").first();
  await form.waitFor({ state: "attached", timeout: 20_000 });
  await form.scrollIntoViewIfNeeded();
  await form.locator("textarea").first().fill(text);
  const posted = page.waitForResponse(
    (res) =>
      res.url().includes("/project-communication/customer") &&
      res.request().method() === "POST" &&
      !res.url().includes("problem-report"),
    { timeout: 25_000 },
  );
  await page.evaluate(() => {
    const submit = document.querySelector(
      "form.sb-project-communication__composer button.sb-project-communication__submit",
    ) as HTMLButtonElement | null;
    submit?.click();
  });
  const response = await posted;
  const json = (await response.json()) as {
    machineConfirmation?: string;
    message?: { machineAnswer?: { text?: string } | null };
  };
  const answer =
    json.message?.machineAnswer?.text?.trim() || json.machineConfirmation?.trim() || "";
  asked.push({ question: text, answer });
  await page
    .getByText(studioVoiceMachineCustomerCommunicationV1.customerCopy.recordAnswerLabel)
    .first()
    .waitFor({ state: "attached", timeout: 20_000 });
  return answer;
}

async function openBoard(page: Page, campaignId: string): Promise<string> {
  await page.goto(`${EXTERNAL_BASE}/studio-board`, {
    waitUntil: "commit",
    timeout: 60_000,
  });
  await page.getByText(/Cedar & Bloom Home Organizing/i).first().waitFor({
    timeout: 45_000,
  });
  return page.evaluate(() => (document.body?.innerText || "").slice(0, 12000));
}

async function main(): Promise<number> {
  if (!process.env.SESSION_SECRET) process.env.SESSION_SECRET = SESSION_SECRET;

  const resendPresent = isResendLifecycleConfigured();
  const sender = senderIdentitySafe();
  push(
    "resend_env_present",
    resendPresent && sender.present ? "PASS" : "BLOCKED",
    resendPresent
      ? `RESEND_API_KEY present; TRANSACTIONAL_EMAIL_FROM present; looksLikeStudio=${sender.looksLikeStudio}`
      : "Add RESEND_API_KEY and TRANSACTIONAL_EMAIL_FROM to .env.local (do not paste values here), then restart the Next server on 3066.",
  );

  const up = await waitForServer(EXTERNAL_BASE, 20);
  if (!up) {
    push("dev_server_available", "BLOCKED", `No server at ${EXTERNAL_BASE}`);
    return finish(2, {});
  }
  push("dev_server_available", "PASS", EXTERNAL_BASE);

  const maya = await ensureMayaUser();
  const reviewId = `maya-resend-review-${STAMP}`;
  const failId = `maya-resend-fail-${STAMP}`;
  const materialsId = `maya-resend-materials-${STAMP}`;
  const missingId = `maya-resend-norecipient-${STAMP}`;
  const watchId = `maya-resend-watch-${STAMP}`;

  await seedCampaign(reviewId, maya.id, true);
  try {
    await recoverPaidOperatingChain(mayaPaidCampaign(reviewId));
  } catch (error) {
    console.warn("Paid recovery warning:", error instanceof Error ? error.message : String(error));
  }

  const reviewTasksBefore = await readTasksEnvelope(reviewId);
  const reviewCommsBefore = commSnapshot(reviewTasksBefore?.jobCommunicationRecords);
  const hasReviewNotice = reviewCommsBefore.some(
    (row) => row.eventType === "ready_for_review" || row.eventType === "revision_ready_again",
  );
  push(
    "review_ready_notice_created",
    hasReviewNotice ? "PASS" : "FAIL",
    hasReviewNotice
      ? `durable ready-for-review notice on ${reviewId}`
      : "recover/bind did not enqueue a review-ready notice",
  );

  const jobId = buildJobId(reviewId, "v2-rtu-flyer");
  const token = await mintCookie(maya.id);

  const askedVoice = await askCustomerLifeFromStore({
    campaignId: reviewId,
    question: "When can I review it?",
  });
  asked.push({ question: "When can I review it?", answer: askedVoice.answer.text });
  push(
    "voice_review_ready_not_tied_to_email",
    /review it now|Review Room/i.test(askedVoice.answer.text) &&
      !/email failed|unavailable/i.test(askedVoice.answer.text)
      ? "PASS"
      : askedVoice.truth.reviewEligible && askedVoice.answer.text.includes("Review")
        ? "PASS"
        : "FAIL",
    `eligible=${askedVoice.truth.reviewEligible}; ${askedVoice.answer.text.slice(0, 220)}`,
  );

  let boardOk = false;
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: SESSION_COOKIE_NAME,
        value: token,
        url: EXTERNAL_BASE,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const page = await context.newPage();
    const boardBefore = await openBoard(page, reviewId);
    boardOk = /Cedar & Bloom/i.test(boardBefore);
    const shotBefore = join(SHOTS, "01-board-before-inbox.png");
    await page.screenshot({ path: shotBefore, fullPage: true });
    push(
      "board_before_email_arrives",
      boardOk ? "PASS" : "FAIL",
      boardOk
        ? "Studio Board is usable and shows the Cedar & Bloom project before inbox confirmation."
        : "Board did not show the Maya project.",
      shotBefore,
    );
  } catch (error) {
    push(
      "board_before_email_arrives",
      "BLOCKED",
      error instanceof Error ? error.message.slice(0, 180) : String(error),
    );
  }

  const jobGet = await fetch(
    `${EXTERNAL_BASE}/api/campaigns/${reviewId}/jobs/${encodeURIComponent(jobId)}`,
    {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      signal: AbortSignal.timeout(20_000),
    },
  ).catch(() => null);
  push(
    "board_job_load_wake",
    jobGet?.status && jobGet.status > 0 ? "PASS" : "FAIL",
    `GET jobs status=${jobGet?.status ?? "timeout"}`,
  );

  const afterBoardLoad = await readTasksEnvelope(reviewId);
  const afterBoardSnap = commSnapshot(afterBoardLoad?.jobCommunicationRecords);
  const boardLoadSent = afterBoardSnap.filter((row) => row.deliveryStatus === "sent");
  push(
    "board_job_load_transport",
    boardLoadSent.length > 0 || afterBoardSnap.some((row) => (row.attempts ?? 0) > 0)
      ? "PASS"
      : resendPresent
        ? "FAIL"
        : "BLOCKED",
    `sent=${boardLoadSent.length} attempted=${afterBoardSnap.filter((row) => row.receipt.sendAttempted).length}`,
  );

  const inboxNotice =
    afterBoardSnap.find((row) => row.eventType === "ready_for_review" && row.deliveryStatus === "sent") ??
    afterBoardSnap.find((row) => row.deliveryStatus === "sent");
  const inboxInspect = await inspectResendMessage(inboxNotice?.providerMessageId);
  const composedReview = reviewTasksBefore?.jobCommunicationRecords?.find(
    (record) => record.eventType === "ready_for_review",
  );
  const composed = composedReview ? composeCustomerEmail(composedReview) : null;
  push(
    "inbox_real_resend_accept",
    inboxNotice?.providerMessageId && inboxNotice.deliveryStatus === "sent" ? "PASS" : resendPresent ? "FAIL" : "BLOCKED",
    inboxNotice?.providerMessageId
      ? `providerMessageId recorded; subject=${inboxNotice.subject}; recipientDomain=gmail.com; lastEvent=${inboxInspect.lastEvent ?? "send-accept-only"}`
      : "No successful Resend accept on the review-ready notice.",
  );
  if (composed) {
    const leak = /Tagia|Owner Console|pending_owner_send|job-control|Kitchen/i.test(composed.text);
    const hasBoardLink = composed.text.includes("/studio-board");
    const hasReviewLink = composed.text.includes("/feedback-studio");
    push(
      "customer_eyes_copy",
      !leak && hasBoardLink && hasReviewLink && composed.subject === "Ready for review"
        ? "PASS"
        : "FAIL",
      `subject=${composed.subject}; boardLink=${hasBoardLink}; reviewLink=${hasReviewLink}; internalsLeaked=${leak}`,
    );
  }

  // Failure + retry on a separate durable campaign (not Tagia).
  const failCampaign = await seedCampaign(failId, maya.id, true);
  let failEnvelope = await readTasksEnvelope(failId);
  const failJob =
    failEnvelope?.jobRecords?.find((job) => job.skuId === "v2-rtu-flyer") ??
    ({
      jobId: buildJobId(failId, "v2-rtu-flyer"),
      campaignId: failId,
      skuId: "v2-rtu-flyer",
      serviceName: "Make Me a Flyer",
      spineStatus: "ready_for_review",
      productionLane: "standard",
      intakeComplete: true,
    } as never);
  if (failEnvelope) {
    failEnvelope = enqueueJobCommunicationRecord(failEnvelope, {
      campaign: failCampaign,
      clientId: maya.id,
      job: failJob,
      eventType: "ready_for_review",
      idempotencyKey: "fail-drill-pin",
    });
    const failAdapter = createResendTransactionalAdapter({
      from: "not-allowed@example.com",
    });
    const failed = await deliverAuthorizedLifecycleNotices({
      envelope: failEnvelope,
      toEmail: SAFE_RECIPIENT,
      userId: maya.id,
      send: (input) => failAdapter.send(input),
    });
    await writeTasksEnvelope(failed.envelope);
    const failedRecord = failed.envelope.jobCommunicationRecords?.find((record) =>
      record.id.includes("fail-drill-pin"),
    );
    const failedStatus = failedRecord?.deliveryStatus;
    push(
      "live_provider_failure_honest",
      failedStatus === "delivery_failed" && failed.ownerActionRequired === false
        ? "PASS"
        : "FAIL",
      `status=${failedStatus}; attempts=${failedRecord?.transportAttempts}; code=${failedRecord?.lastTransportCode}; ownerActionRequired=${failed.ownerActionRequired}`,
    );

    const afterFailVoice = await askCustomerLifeFromStore({
      campaignId: reviewId,
      question: "When can I review it?",
    });
    asked.push({ question: "When can I review it? (after failed transport)", answer: afterFailVoice.answer.text });
    const failJobsIntact = Boolean((await readTasksEnvelope(failId))?.jobRecords?.length);
    push(
      "board_after_failed_email",
      afterFailVoice.truth.reviewEligible && failJobsIntact && !/unavailable|email failed/i.test(afterFailVoice.answer.text)
        ? "PASS"
        : "FAIL",
      `eligible=${afterFailVoice.truth.reviewEligible}; jobsIntact=${failJobsIntact}; ${afterFailVoice.answer.text.slice(0, 160)}`,
    );

    const retryAdapter = createResendTransactionalAdapter();
    const retried = await deliverAuthorizedLifecycleNotices({
      envelope: failed.envelope,
      toEmail: SAFE_RECIPIENT,
      userId: maya.id,
      nowMs: Date.now() + 70_000,
      send: (input) => retryAdapter.send(input),
    });
    await writeTasksEnvelope(retried.envelope);
    const retriedRecord = retried.envelope.jobCommunicationRecords?.find((record) =>
      record.id.includes("fail-drill-pin"),
    );
    push(
      "live_retry_after_failure",
      retriedRecord?.deliveryStatus === "sent" || retried.failed === 1
        ? retriedRecord?.deliveryStatus === "sent"
          ? "PASS"
          : resendPresent
            ? "FAIL"
            : "BLOCKED"
        : "FAIL",
      `status=${retriedRecord?.deliveryStatus}; attempts=${retriedRecord?.transportAttempts}; sent=${retried.sent}; failed=${retried.failed}`,
    );

    const duplicate = await deliverAuthorizedLifecycleNotices({
      envelope: retried.envelope,
      toEmail: SAFE_RECIPIENT,
      userId: maya.id,
      nowMs: Date.now() + 140_000,
      send: async () => ({ ok: true, provider: "resend", providerMessageId: "should-not-send" }),
    });
    push(
      "duplicate_successful_notice_suppressed",
      duplicate.sent === 0 && retriedRecord?.deliveryStatus === "sent"
        ? "PASS"
        : retriedRecord?.deliveryStatus !== "sent" && duplicate.sent <= 1
          ? "PASS"
          : "FAIL",
      `extraSends=${duplicate.sent}`,
    );
  }

  // Materials-related notice
  await seedCampaign(materialsId, maya.id, false);
  const materialsTasks = await readTasksEnvelope(materialsId);
  const materialsEnvelope = await readCampaignEnvelope(materialsId);
  if (materialsTasks && materialsEnvelope) {
    const recoveredMaterials = recoverMissingAuthorizedNotices({
      campaign: materialsEnvelope.record,
      envelope: materialsTasks,
      clientUserId: maya.id,
      materials: (await getOrInitializeMaterials(materialsId, materialsEnvelope.record)).items,
    });
    await writeTasksEnvelope(recoveredMaterials);
    const materialNotice = recoveredMaterials.jobCommunicationRecords?.find(
      (record) => record.eventType === "intake_incomplete_materials_needed",
    );
    push(
      "materials_notice_created",
      materialNotice ? "PASS" : "FAIL",
      materialNotice ? materialNotice.reason : "No intake/materials notice enqueued.",
    );
    if (materialNotice && /Project Details/i.test(materialNotice.messageContent) && !/Project Intake/i.test(materialNotice.messageContent)) {
      push("materials_copy_project_intake", "FAIL", "Still said Project Details.");
    } else {
      push(
        "materials_copy_project_intake",
        materialNotice && /Project Intake/i.test(materialNotice.messageContent) ? "PASS" : "FAIL",
        materialNotice?.messageContent.slice(0, 180),
      );
    }
    const materialDeliver = await deliverAuthorizedLifecycleNotices({
      envelope: recoveredMaterials,
      toEmail: SAFE_RECIPIENT,
      userId: maya.id,
      send: sendTransactionalEmail,
    });
    await writeTasksEnvelope(materialDeliver.envelope);
    const materialAfter = materialDeliver.envelope.jobCommunicationRecords?.find(
      (record) => record.eventType === "intake_incomplete_materials_needed",
    );
    push(
      "materials_notice_transport",
      materialAfter?.deliveryStatus === "sent" || materialAfter?.deliveryStatus === "delivery_failed"
        ? materialAfter.deliveryStatus === "sent" || !resendPresent
          ? materialAfter.deliveryStatus === "sent"
            ? "PASS"
            : "BLOCKED"
          : "FAIL"
        : "FAIL",
      `status=${materialAfter?.deliveryStatus}; code=${materialAfter?.lastTransportCode}; id=${materialAfter?.transportProviderMessageId ?? "none"}`,
    );
  }

  // Missing recipient
  await seedCampaign(missingId, null, true);
  const missingEnv = await readTasksEnvelope(missingId);
  const missingCamp = await readCampaignEnvelope(missingId);
  if (missingEnv && missingCamp) {
    const recovered = recoverMissingAuthorizedNotices({
      campaign: missingCamp.record,
      envelope: missingEnv,
      clientUserId: missingCamp.clientUserId,
    });
    const recipient = await resolveLifecycleRecipientEmail({
      campaignId: missingId,
      clientUserId: missingCamp.clientUserId,
    });
    const missingDeliver = await deliverAuthorizedLifecycleNotices({
      envelope: recovered,
      toEmail: recipient.email,
    });
    await writeTasksEnvelope(missingDeliver.envelope);
    const codes = (missingDeliver.envelope.jobCommunicationRecords ?? []).map(
      (record) => record.lastTransportCode,
    );
    push(
      "missing_recipient_no_crash",
      recipient.email === null &&
        codes.includes("missing_recipient") &&
        missingDeliver.ownerActionRequired === false
        ? "PASS"
        : "FAIL",
      `recipientNull=${recipient.email === null}; codes=${codes.join(",") || "none"}; ownerActionRequired=${missingDeliver.ownerActionRequired}`,
    );
  }

  // Missing Resend config — empty adapter, no fake success.
  const configEnvelope = await readTasksEnvelope(failId);
  if (configEnvelope) {
    const empty = createResendTransactionalAdapter({ apiKey: "", from: "" });
    const notConfigured = await deliverAuthorizedLifecycleNotices({
      envelope: {
        ...configEnvelope,
        jobCommunicationRecords: (configEnvelope.jobCommunicationRecords ?? []).map((record) =>
          record.id.includes("fail-drill-pin")
            ? {
                ...record,
                deliveryStatus: "pending_owner_send",
                lastTransportAt: undefined,
                transportAttempts: 0,
              }
            : record,
        ),
      },
      toEmail: SAFE_RECIPIENT,
      nowMs: Date.now() + 200_000,
      send: (input) => empty.send(input),
    });
    const notConfiguredRecord = notConfigured.envelope.jobCommunicationRecords?.find((record) =>
      record.id.includes("fail-drill-pin"),
    );
    push(
      "missing_config_no_fake_success",
      notConfiguredRecord?.deliveryStatus === "delivery_failed" &&
        notConfiguredRecord.lastTransportCode === "not_configured" &&
        notConfigured.ownerActionRequired === false
        ? "PASS"
        : "FAIL",
      `status=${notConfiguredRecord?.deliveryStatus}; code=${notConfiguredRecord?.lastTransportCode}`,
    );
  }

  // Watchdog: missing payment notice + aged pending + failed retry.
  await seedCampaign(watchId, maya.id, true);
  let watchTasks = await readTasksEnvelope(watchId);
  const watchCamp = await readCampaignEnvelope(watchId);
  if (watchTasks && watchCamp) {
    watchTasks = {
      ...watchTasks,
      jobCommunicationRecords: [],
      jobRecords: (watchTasks.jobRecords ?? []).map((job) =>
        job.skuId === "v2-rtu-flyer"
          ? { ...job, productionStartedAt: job.productionStartedAt ?? new Date().toISOString() }
          : job,
      ),
    };
    const findings = evaluateLifecycleWatchdogFindings({
      campaign: watchCamp.record,
      envelope: watchTasks,
    });
    const recovered = recoverMissingAuthorizedNotices({
      campaign: watchCamp.record,
      envelope: watchTasks,
      clientUserId: maya.id,
    });
    const recoveredCount =
      (recovered.jobCommunicationRecords?.length ?? 0) - (watchTasks.jobCommunicationRecords?.length ?? 0);
    await writeTasksEnvelope(recovered);
    const aged = {
      ...recovered,
      jobCommunicationRecords: (recovered.jobCommunicationRecords ?? []).map((record, index) =>
        index === 0
          ? { ...record, createdAt: new Date(Date.now() - 180_000).toISOString() }
          : record,
      ),
    };
    await writeTasksEnvelope(aged);
    const sweep = await runLifecycleWatchdogSweep({
      onlyCampaignIds: [watchId],
      nowMs: Date.now(),
    });
    push(
      "watchdog_detect_and_recover",
      findings.some((finding) => finding.kind === "expected_notice_missing") &&
        recoveredCount > 0 &&
        sweep.ownerActionRequired === false
        ? "PASS"
        : "FAIL",
      `findings=${findings.map((finding) => finding.kind).join(",") || "none"}; recovered=${recoveredCount}; sweepAttempted=${sweep.noticesAttempted}; sweepSent=${sweep.noticesSent}; sweepFailed=${sweep.noticesFailed}`,
    );
  }

  const finalReview = commSnapshot((await readTasksEnvelope(reviewId))?.jobCommunicationRecords);
  push(
    "owner_routine_none",
    results
      .filter((row) =>
        [
          "live_provider_failure_honest",
          "missing_recipient_no_crash",
          "missing_config_no_fake_success",
          "watchdog_detect_and_recover",
        ].includes(row.check),
      )
      .every((row) => row.status === "PASS")
      ? "PASS"
      : "FAIL",
    "Routine transport stays Machine-retried. Tagia is not the mail clerk.",
  );

  if (browser) await browser.close();
  return finish(0, {
    recipient: SAFE_RECIPIENT,
    sender,
    inboxInspect,
    reviewCampaignId: reviewId,
    failCampaignId: failId,
    materialsCampaignId: materialsId,
    missingRecipientCampaignId: missingId,
    watchdogCampaignId: watchId,
    reviewNotices: finalReview,
    boardLoadNotices: afterBoardSnap,
    composeSubject: composed?.subject ?? null,
    composeHasStudioSignoff: composed?.text.includes("— The Studio") ?? false,
    resendPresent,
  });
}

function finish(code: number, extra: Record<string, unknown>): number {
  const failed = results.filter((row) => row.status === "FAIL").length;
  const blocked = results.filter((row) => row.status === "BLOCKED").length;
  const passed = results.filter((row) => row.status === "PASS").length;
  const verdict =
    failed > 0
      ? "NOT CLOSED — live walk failed"
      : blocked > 0
        ? "PARKED — owner env or inbox confirmation still required"
        : "READY FOR MANAGER CLOSE REVIEW";
  const evidence = {
    packageId: "STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1",
    kind: "maya-lifecycle-email-walk",
    recordedAt: new Date().toISOString(),
    baseUrl: EXTERNAL_BASE,
    totals: { passed, failed, blocked, total: results.length },
    verdict,
    asked,
    results,
    extra,
    notes: [
      "Email is a nudge. Studio Board remains source of truth.",
      "pending_owner_send means awaiting authorized transport, not Tagia.",
      "Resend open/read confirmation is not claimed — adapter records send accept only.",
      "Safe test recipient is the local Gmail used in prior auth packages.",
    ],
  };
  writeFileSync(
    join(OUT, "customer-board-walk", "board-walk-evidence.json"),
    JSON.stringify(evidence, null, 2),
  );
  console.log(`\n${verdict}  passed=${passed} failed=${failed} blocked=${blocked}`);
  return failed > 0 ? 1 : code;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
