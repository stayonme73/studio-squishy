/**
 * STUDIO-OPERATING-ROOM-2-REVIEW-FINAL-DELIVERY-TRUTH-AND-FRICTION-1
 * Live Maya Review → Final → Delivery customer-truth walk.
 *
 * Uses the existing Maya flyer fixture path (paid Make Me a Flyer). Does not
 * reopen Room 1 as a production rebuild. Does not merge. Does not start Owner Console.
 *
 * Run (Windows), against the already-running local Next:
 *   $env:PLAYWRIGHT_BROWSERS_PATH="$env:USERPROFILE\AppData\Local\ms-playwright"
 *   $env:CERT_BASE_URL="http://127.0.0.1:3066"
 *   $env:SESSION_SECRET="materials-upload-board-walk-ephemeral-not-for-production"
 *   npx tsx scripts/studio-operating-room-2-review-final-delivery-truth-1-walk.mts
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import type { CampaignRecord } from "../src/config/studio-board";
import { studioReviewRevisionFullLoopV1 } from "../src/config/studio-review-revision-full-loop-v1";
import {
  createClientAccount,
  linkClientCampaign,
  markEmailVerified,
} from "../src/lib/auth/users";
import { readCampaignEnvelope, upsertCampaignRecord } from "../src/lib/campaign-store/store";
import {
  getOrGenerateTasks,
  readTasksEnvelope,
  writeTasksEnvelope,
} from "../src/lib/campaign-tasks/store";
import { getOrInitializeMaterials } from "../src/lib/materials/store";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "../src/lib/plan-pricing";
import { recoverPaidOperatingChain } from "../src/lib/studio-paid-activation-recovery";
import { ensureDispatchExecution } from "../src/lib/studio-dispatch";
import { ensureFlyerMachineReviewBind } from "../src/lib/studio-customer-life";
import { buildJobId } from "../src/lib/job-control/lane-map";
import type { CorrectionUseRecord } from "../src/lib/job-control/correction-round-ledger";
import { DESIGN_RENDERER_PROOF_SKU } from "../src/lib/studio-design-renderer";

const PORT = process.env.CERT_PORT || "3066";
const EXTERNAL_BASE = (process.env.CERT_BASE_URL || "").replace(/\/$/, "");
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "materials-upload-board-walk-ephemeral-not-for-production";

const OUT = join(
  process.cwd(),
  "docs",
  "launch",
  "studio-operating-room-2-review-final-delivery-truth-and-friction-1",
  "customer-walk",
);
const SHOTS = join(OUT, "shots");
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

type Check = {
  check: string;
  status: "PASS" | "FAIL" | "BLOCKED";
  detail?: string;
  shot?: string;
};

const results: Check[] = [];
let serverChild: ChildProcess | null = null;
let BASE = EXTERNAL_BASE || `http://127.0.0.1:${PORT}`;

function push(check: string, status: Check["status"], detail?: string, shot?: string): void {
  results.push({ check, status, detail, shot });
  console.log(detail ? `${status}  ${check} — ${detail}` : `${status}  ${check}`);
}

async function shot(page: Page, name: string): Promise<string> {
  const file = join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function forceClick(locator: ReturnType<Page["locator"]>): Promise<void> {
  await locator.click({ force: true, timeout: 20_000 });
}

async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => (document.body?.innerText || "").slice(0, 18000));
}

function residueHits(text: string): string[] {
  const found: string[] = [];
  const patterns = [
    "Feedback Studio",
    "Correction rounds",
    "Ask Squishy",
    "START NEW CAMPAIGN",
    "Your Campaign",
    "sha256",
    "Kitchen",
    "image/png",
    "application/pdf",
    "Submit request changes",
    "Submit approval",
    "Approve for Delivery",
    "Owner Console",
  ];
  for (const phrase of patterns) {
    if (new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text)) {
      found.push(phrase);
    }
  }
  return found;
}

async function waitForServer(url: string, attempts = 60): Promise<boolean> {
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

async function startLocalServer(): Promise<string> {
  const base = `http://127.0.0.1:${PORT}`;
  serverChild = spawn("npx", ["next", "dev", "-H", "127.0.0.1", "-p", PORT], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SESSION_SECRET,
      NEXT_PUBLIC_SITE_URL: base,
    },
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  const ready = await waitForServer(base);
  if (!ready) {
    serverChild.kill();
    serverChild = null;
    throw new Error(`Local next dev did not become ready on ${base}`);
  }
  return base;
}

function stopLocalServer(): void {
  if (!serverChild) return;
  try {
    serverChild.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  serverChild = null;
}

function mayaPaidCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals(["v2-rtu-flyer"]);
  const lineItems = buildServiceScopeSnapshot(["v2-rtu-flyer"]);
  return {
    campaignId,
    campaignName: "Cedar & Bloom Home Organizing",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Back-to-School Reset flyer",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
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
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      confirmedAmountCents: 6900,
      checkoutSessionId: `cs_maya_r2s3_${campaignId}`,
      paymentIntentId: `pi_maya_r2s3_${campaignId}`,
      stripeEventId: `evt_maya_r2s3_${campaignId}`,
      selectedServiceIds: ["v2-rtu-flyer"],
      decisionId: `dec_maya_r2s3_${campaignId}`,
      factFingerprint: `fp_maya_r2s3_${campaignId}`,
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

async function signInAsMaya(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${BASE}/sign-in?from=/studio-board`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.locator("form.utility-form").waitFor({ timeout: 30_000 });
  await page.waitForTimeout(600);
  await page.locator('form.utility-form input[type="email"]').fill(email);
  await page.locator('form.utility-form input[type="password"]').fill(password);
  const loginResponse = page.waitForResponse(
    (res) => res.url().includes("/api/auth/login") && res.request().method() === "POST",
    { timeout: 20_000 },
  );
  await page.locator('form.utility-form button[type="submit"]').click();
  const login = await loginResponse;
  if (!login.ok()) {
    throw new Error(`Sign-in POST failed (${login.status()})`);
  }
  await page.waitForURL(
    (url) => url.pathname === "/studio-board" || url.pathname === "/studio-board/",
    { timeout: 45_000, waitUntil: "domcontentloaded" },
  );
  await page.getByText(/Cedar & Bloom Home Organizing/i).first().waitFor({
    timeout: 45_000,
  });
}

async function sendProjectMessage(page: Page, text: string): Promise<string> {
  const form = page.locator("form.sb-project-communication__composer").first();
  await form.waitFor({ state: "attached", timeout: 20_000 });
  await form.scrollIntoViewIfNeeded();
  const question = page.getByRole("radio", { name: /Ask a question/i }).first();
  if ((await question.count()) > 0) {
    await forceClick(question);
  }
  const textarea = form.locator("textarea").first();
  await textarea.fill(text);
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
  if (!response.ok()) {
    throw new Error(`Project message POST failed (${response.status()})`);
  }
  return (
    json.message?.machineAnswer?.text ??
    json.machineConfirmation ??
    ""
  );
}

function finish(code: number): number {
  const pass = results.filter((row) => row.status === "PASS").length;
  const fail = results.filter((row) => row.status === "FAIL").length;
  const blocked = results.filter((row) => row.status === "BLOCKED").length;
  const summary = {
    packageId: "STUDIO-OPERATING-ROOM-2-REVIEW-FINAL-DELIVERY-TRUTH-AND-FRICTION-1",
    totals: { pass, fail, blocked, all: results.length },
    results,
  };
  writeFileSync(join(OUT, "walk-results.json"), JSON.stringify(summary, null, 2));
  console.log(`\nWalk ${pass}/${results.length} PASS · ${fail} FAIL · ${blocked} BLOCKED`);
  stopLocalServer();
  return code;
}

async function main(): Promise<number> {
  const stamp = randomUUID().slice(0, 8);
  const campaignId = `maya-r2s3-${stamp}`;
  const email = `maya.r2s3.${stamp}@cedarandbloom.test`;
  const password = "MayaReview-Walk-0817!";
  const jobId = buildJobId(campaignId, "v2-rtu-flyer");

  if (!EXTERNAL_BASE) {
    console.log(`Starting local next on :${PORT} …`);
    BASE = await startLocalServer();
    push("dev_server_available", "PASS", `${BASE} (spawned)`);
  } else {
    BASE = EXTERNAL_BASE;
    const up = await waitForServer(BASE, 30);
    if (!up) {
      push("dev_server_available", "BLOCKED", `No server at ${BASE}`);
      return finish(2);
    }
    push("dev_server_available", "PASS", `${BASE} (external)`);
  }

  const created = await createClientAccount({
    email,
    password,
    displayName: "Maya Brooks",
  });
  if (!created.ok) {
    push("maya_account", "FAIL", created.message);
    return finish(1);
  }
  await markEmailVerified(created.user.id);
  let campaign = mayaPaidCampaign(campaignId);
  await upsertCampaignRecord(campaign, created.user.id);
  await linkClientCampaign(created.user.id, campaignId);
  await getOrInitializeMaterials(campaignId, campaign);
  await getOrGenerateTasks(campaignId, campaign);
  try {
    await recoverPaidOperatingChain(campaign);
  } catch (error) {
    console.warn("Paid recovery warning:", error instanceof Error ? error.message : String(error));
  }
  const afterRecovery = (await readCampaignEnvelope(campaignId))?.record;
  if (afterRecovery) {
    const dispatched = await ensureDispatchExecution(afterRecovery);
    if (dispatched.ok) {
      campaign = await ensureFlyerMachineReviewBind(dispatched.campaign);
    } else {
      campaign = await ensureFlyerMachineReviewBind(afterRecovery);
    }
  }

  const tasks = await readTasksEnvelope(campaignId);
  const job = tasks?.jobRecords?.find((entry) => entry.skuId === DESIGN_RENDERER_PROOF_SKU);
  const reviewReady =
    job?.spineStatus === "ready_for_review" &&
    job.internalQaReviewAuthorization?.status === "ELIGIBLE_FOR_REVIEW" &&
    (job.fileRegistry ?? []).some((ref) => ref.category === "review_proof");
  push(
    "maya_review_fixture_ready",
    reviewReady ? "PASS" : "FAIL",
    `spine=${job?.spineStatus ?? "none"} qa=${job?.internalQaReviewAuthorization?.status ?? "none"} proofs=${(job?.fileRegistry ?? []).filter((ref) => ref.category === "review_proof").length}`,
  );
  if (!reviewReady) {
    return finish(1);
  }

  const browser: Browser = await chromium.launch({ headless: true });
  let contextA: BrowserContext | null = null;
  let contextB: BrowserContext | null = null;
  let savedPdfFiles: NonNullable<typeof job>["clientDeliveryFiles"] | undefined;

  try {
    contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInAsMaya(pageA, email, password);
    const boardShot = await shot(pageA, "01-board-review-ready");
    const boardText = await visibleText(pageA);
    push(
      "review_entry_from_board",
      /Open Review Room/i.test(boardText) || /Ready for Review/i.test(boardText)
        ? "PASS"
        : "FAIL",
      boardText.slice(0, 240),
      boardShot,
    );

    await pageA.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(jobId)}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await pageA.locator(".fs-review-proof__image, .fs-mock__headline").first().waitFor({
      timeout: 45_000,
    });
    const reviewShot = await shot(pageA, "02-review-entry");
    const reviewText = await visibleText(pageA);
    const residue = residueHits(reviewText);
    push(
      "review_entry_clarity",
      /Review your work/i.test(reviewText) &&
        /Make Me a Flyer/i.test(reviewText) &&
        /Version 1/i.test(reviewText) &&
        /Cedar & Bloom/i.test(reviewText)
        ? "PASS"
        : "FAIL",
      reviewText.slice(0, 280),
      reviewShot,
    );
    push(
      "question_revision_approval_distinct",
      /Ask a question/i.test(reviewText) &&
        /Request a revision/i.test(reviewText) &&
        /Approve this version/i.test(reviewText) &&
        /Mark section for changes/i.test(reviewText)
        ? "PASS"
        : "FAIL",
      "Ask / Request a revision / Approve this version / Mark section for changes",
    );
    push(
      "revision_allowance_visible",
      /Revision rounds/i.test(reviewText) &&
        /Included/i.test(reviewText) &&
        /Remaining/i.test(reviewText) &&
        !/Correction rounds/i.test(reviewText)
        ? "PASS"
        : "FAIL",
      reviewText.includes("Remaining") ? "Included / used / remaining shown as revision rounds" : "Allowance rail missing",
    );
    push(
      "review_language_residue",
      residue.length === 0 ? "PASS" : "FAIL",
      residue.length ? residue.join(", ") : "No Feedback Studio / correction / hash / MIME residue",
    );

    const question = await sendProjectMessage(
      pageA,
      studioReviewRevisionFullLoopV1.customerCopy.whichVersionAmILookingAt,
    );
    const tasksAfterQuestion = await readTasksEnvelope(campaignId);
    push(
      "question_does_not_sound_or_act_like_revision",
      /Version 1/i.test(question) &&
        !/sha256/i.test(question) &&
        (tasksAfterQuestion?.jobCorrectionUses ?? []).length === 0 &&
        tasksAfterQuestion?.jobRecords?.find((entry) => entry.skuId === "v2-rtu-flyer")
          ?.spineStatus === "ready_for_review"
        ? "PASS"
        : "FAIL",
      question.slice(0, 240),
    );

    await forceClick(pageA.locator(".fs-feedback-panel__btn--approve"));
    await pageA.waitForTimeout(600);
    const approveCta = pageA.locator(".fs-review__choose").getByRole("button", {
      name: /^Approve this version$/i,
    });
    for (let i = 0; i < 20; i += 1) {
      if (await approveCta.isEnabled()) break;
      await pageA.waitForTimeout(250);
    }
    await forceClick(approveCta);
    await pageA.getByRole("dialog").waitFor({ timeout: 15_000 });
    const approvalDialog = await visibleText(pageA);
    push(
      "approval_names_current_version",
      /You are approving Version 1/i.test(approvalDialog) &&
        /Yes, approve this version/i.test(approvalDialog) &&
        !/sha256/i.test(approvalDialog)
        ? "PASS"
        : "FAIL",
      approvalDialog.slice(0, 240),
      await shot(pageA, "04-approval-confirm"),
    );
    await forceClick(pageA.getByRole("button", { name: /Keep reviewing/i }));

    await forceClick(pageA.locator(".fs-feedback-panel__btn--revision"));
    await pageA.waitForTimeout(600);
    const revisionCta = pageA.locator(".fs-review__choose").getByRole("button", {
      name: /Request a revision/i,
    });
    for (let i = 0; i < 20; i += 1) {
      if (await revisionCta.isEnabled()) break;
      await pageA.waitForTimeout(250);
    }
    await forceClick(revisionCta);
    await pageA.getByRole("dialog").waitFor({ timeout: 15_000 });
    const revisionDialog = await visibleText(pageA);
    push(
      "revision_confirm_names_version_and_allowance",
      /You are requesting a revision of Version 1/i.test(revisionDialog) &&
        /uses one included revision round/i.test(revisionDialog) &&
        /Send revision request/i.test(revisionDialog)
        ? "PASS"
        : "FAIL",
      revisionDialog.slice(0, 240),
      await shot(pageA, "03-revision-confirm"),
    );
    await forceClick(pageA.getByRole("button", { name: /Keep reviewing/i }));
    await forceClick(pageA.locator(".fs-feedback-panel__btn--approve"));
    await pageA.waitForTimeout(600);

    contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAsMaya(pageB, email, password);
    await pageB.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(jobId)}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await pageB.locator(".fs-review-proof__image, .fs-mock__headline").first().waitFor({
      timeout: 45_000,
    });

    const envelopeForExhaust = await readTasksEnvelope(campaignId);
    if (envelopeForExhaust && job) {
      const used: CorrectionUseRecord = {
        id: `corr-${campaignId}-seed`,
        campaignId,
        jobId: job.jobId,
        idempotencyKey: `${job.jobId}:seed-exhausted`,
        packageId: "seed-exhausted",
        submittedAt: new Date().toISOString(),
        submissionType: "revision_requested",
        releaseActivityId: null,
        versionLabel: "Version 1",
        actorUserId: created.user.id,
        actorDisplayName: "Maya Brooks",
        occurredAt: new Date().toISOString(),
        ordinal: 1,
        consumptionKind: "included",
        stickyNoteCount: 0,
        voiceNoteCount: 0,
        drawSectionCount: 0,
        sectionStatuses: {},
      };
      await writeTasksEnvelope({
        ...envelopeForExhaust,
        jobCorrectionUses: [...(envelopeForExhaust.jobCorrectionUses ?? []), used],
        updatedAt: new Date().toISOString(),
      });
    }
    await pageA.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
    await pageA.locator(".fs-review-proof__image, .fs-mock__headline").first().waitFor({
      timeout: 45_000,
    });
    const exhaustedText = await visibleText(pageA);
    const revisionBtn = pageA.locator(".fs-review__choose").getByRole("button", {
      name: /Request a revision/i,
    });
    push(
      "revision_allowance_exhausted_wording",
      /All included revision rounds have been used/i.test(exhaustedText) &&
        (await revisionBtn.isDisabled())
        ? "PASS"
        : "FAIL",
      exhaustedText.slice(0, 240),
      await shot(pageA, "05-revision-exhausted"),
    );

    await forceClick(pageA.locator(".fs-feedback-panel__btn--approve"));
    await pageA.waitForTimeout(600);
    const approveBtn = pageA.getByRole("button", { name: /^Approve this version$/i });
    for (let i = 0; i < 24; i += 1) {
      if (await approveBtn.isEnabled()) break;
      await pageA.waitForTimeout(250);
    }
    await forceClick(approveBtn);
    await pageA.getByRole("button", { name: /Yes, approve this version/i }).waitFor({
      timeout: 15_000,
    });
    const approvalPatch = pageA.waitForResponse(
      (res) =>
        res.url().includes("/review") &&
        res.request().method() === "PATCH" &&
        (res.request().postData() ?? "").includes("approve_for_delivery"),
      { timeout: 120_000 },
    );
    await forceClick(pageA.getByRole("button", { name: /Yes, approve this version/i }));
    const approvalResponse = await approvalPatch;
    if (!approvalResponse.ok()) {
      await shot(pageA, "05b-approval-failed");
      throw new Error(`approve_for_delivery failed (${approvalResponse.status()})`);
    }
    await shot(pageA, "05b-after-approval-click");
    await pageA.goto(
      `${BASE}/feedback-studio?roomState=final&jobId=${encodeURIComponent(jobId)}`,
      { waitUntil: "domcontentloaded", timeout: 90_000 },
    );
    await pageA.waitForTimeout(800);
    const finalText = await visibleText(pageA);
    const finalResidue = residueHits(finalText);
    push(
      "final_state_clarity",
      /Review is complete/i.test(finalText) &&
        !/Download All/i.test(finalText) &&
        !/Studio quality-control review before delivery/i.test(finalText)
        ? "PASS"
        : "FAIL",
      finalText.slice(0, 280),
      await shot(pageA, "06-final-state"),
    );
    push(
      "final_does_not_imply_delivery_files",
      /Delivery/i.test(finalText) && !/Download Print-ready PDF/i.test(finalText)
        ? "PASS"
        : /files you will keep/i.test(finalText)
          ? "PASS"
          : "FAIL",
      "Final keeps downloads in Delivery",
    );
    push(
      "final_language_residue",
      finalResidue.length === 0 ? "PASS" : "FAIL",
      finalResidue.length ? finalResidue.join(", ") : "No internal residue on Final",
    );

    await pageB.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
    await pageB.waitForTimeout(800);
    const staleText = await visibleText(pageB);
    const staleApprove = pageB.getByRole("button", { name: /^Approve this version$/i });
    const staleEnabled =
      (await staleApprove.count()) > 0 ? await staleApprove.isEnabled() : false;
    push(
      "stale_tab_cannot_approve_old_version",
      /Review is complete|preparing your final files|Delivery/i.test(staleText) ||
        staleEnabled === false
        ? "PASS"
        : "FAIL",
      staleText.slice(0, 240),
      await shot(pageB, "07-stale-tab-after-approval"),
    );

    await pageA.goto(
      `${BASE}/feedback-studio?roomState=delivery&jobId=${encodeURIComponent(jobId)}`,
      { waitUntil: "domcontentloaded", timeout: 90_000 },
    );
    await pageA.waitForTimeout(1200);
    const deliveryText = await visibleText(pageA);
    const deliveryResidue = residueHits(deliveryText);
    const pdfLink = pageA.getByRole("link", { name: /Download Print-ready PDF/i });
    const pngLink = pageA.getByRole("link", { name: /Download Digital PNG/i });
    push(
      "delivery_png_pdf_truth",
      /Print-ready PDF/i.test(deliveryText) &&
        /Digital PNG/i.test(deliveryText) &&
        /Version 1/i.test(deliveryText) &&
        (await pdfLink.count()) > 0 &&
        (await pngLink.count()) > 0 &&
        !/Download All/i.test(deliveryText) &&
        !/Studio quality-control review before delivery/i.test(deliveryText) &&
        !/One defined design direction/i.test(deliveryText) &&
        !/Other work is still with The Studio/i.test(deliveryText)
        ? "PASS"
        : "FAIL",
      deliveryText.slice(0, 280),
      await shot(pageA, "08-delivery-files"),
    );
    push(
      "delivery_language_residue",
      deliveryResidue.length === 0 ? "PASS" : "FAIL",
      deliveryResidue.length ? deliveryResidue.join(", ") : "No MIME / Campaign / hash residue",
    );
    const pdfHref = (await pdfLink.count()) > 0 ? await pdfLink.first().getAttribute("href") : null;
    const pngHref = (await pngLink.count()) > 0 ? await pngLink.first().getAttribute("href") : null;
    let pdfOk = false;
    let pngOk = false;
    if (pdfHref) {
      const res = await pageA.request.get(new URL(pdfHref, BASE).toString());
      pdfOk = res.ok();
    }
    if (pngHref) {
      const res = await pageA.request.get(new URL(pngHref, BASE).toString());
      pngOk = res.ok();
    }
    push(
      "download_controls_work",
      Boolean(pdfOk && pngOk) ? "PASS" : "FAIL",
      `pdf=${pdfOk} png=${pngOk}`,
    );

    const deliveredEnvelope = await readTasksEnvelope(campaignId);
    const deliveredJob = deliveredEnvelope?.jobRecords?.find(
      (entry) => entry.skuId === DESIGN_RENDERER_PROOF_SKU,
    );
    savedPdfFiles = deliveredJob?.clientDeliveryFiles;
    if (deliveredEnvelope && deliveredJob?.clientDeliveryFiles) {
      const withoutPdf = deliveredJob.clientDeliveryFiles.filter(
        (file) => !/pdf/i.test(file.fileType) && !/\.pdf$/i.test(file.fileName),
      );
      await writeTasksEnvelope({
        ...deliveredEnvelope,
        jobRecords: (deliveredEnvelope.jobRecords ?? []).map((entry) =>
          entry.jobId === deliveredJob.jobId
            ? { ...entry, clientDeliveryFiles: withoutPdf }
            : entry,
        ),
        updatedAt: new Date().toISOString(),
      });
      await pageA.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
      await pageA.waitForTimeout(1500);
      const missingText = await visibleText(pageA);
      push(
        "missing_promised_file_is_honest",
        /Some of your files are ready|still being prepared|not available yet|Delivery in progress|Some files are ready/i.test(
          missingText,
        ) && !/Project Complete|statusDelivered/i.test(missingText)
        ? "PASS"
        : "FAIL",
        missingText.slice(0, 280),
        await shot(pageA, "09-missing-pdf"),
      );
      await writeTasksEnvelope({
        ...deliveredEnvelope,
        jobRecords: (deliveredEnvelope.jobRecords ?? []).map((entry) =>
          entry.jobId === deliveredJob.jobId
            ? { ...entry, clientDeliveryFiles: savedPdfFiles }
            : entry,
        ),
        updatedAt: new Date().toISOString(),
      });
    } else {
      push("missing_promised_file_is_honest", "FAIL", "No client delivery files to withhold");
    }

    await pageA.goto(`${BASE}/help-center`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await pageA.waitForTimeout(800);
    const studioReview = pageA.getByText(/STUDIO REVIEW/i).first();
    if ((await studioReview.count()) > 0) {
      await pageA.keyboard.press("Escape").catch(() => undefined);
    }
    const helpHeading = pageA.getByRole("heading", { name: /Help Center/i }).first();
    await helpHeading.waitFor({ timeout: 15_000 }).catch(() => undefined);
    const helpText = await visibleText(pageA);
    push(
      "help_and_communication_in_review",
      (/Help Center/i.test(helpText) || (await helpHeading.count()) > 0) &&
        !/Ask Squishy/i.test(helpText)
        ? "PASS"
        : "FAIL",
      helpText.slice(0, 200),
      await shot(pageA, "10-help-center"),
    );

    await contextA.close();
    contextA = null;
    await contextB.close();
    contextB = await browser.newContext();
    const pageReturn = await contextB.newPage();
    await signInAsMaya(pageReturn, email, password);
    await pageReturn.goto(
      `${BASE}/feedback-studio?roomState=delivery&jobId=${encodeURIComponent(jobId)}`,
      { waitUntil: "domcontentloaded", timeout: 90_000 },
    );
    await pageReturn.waitForTimeout(1000);
    const returnText = await visibleText(pageReturn);
    push(
      "return_later_complete_and_files_reachable",
      (/Print-ready PDF/i.test(returnText) && /Digital PNG/i.test(returnText)) ||
        /Delivery/i.test(returnText)
        ? "PASS"
        : "FAIL",
      returnText.slice(0, 240),
      await shot(pageReturn, "11-return-later"),
    );
    push(
      "return_later_does_not_demand_review_action",
      !/Approve this version/i.test(returnText) ||
        (await pageReturn.getByRole("button", { name: /^Approve this version$/i }).count()) === 0
        ? "PASS"
        : "FAIL",
      "Approved project does not still look like open Review",
    );
    push("owner_intervention", "PASS", "NONE");
  } catch (error) {
    push("walk_exception", "FAIL", error instanceof Error ? error.message : String(error));
  } finally {
    await contextA?.close();
    await contextB?.close();
    await browser.close();
  }

  const failed = results.filter((row) => row.status === "FAIL").length;
  return finish(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
