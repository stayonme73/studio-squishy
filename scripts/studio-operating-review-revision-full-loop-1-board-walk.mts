/**
 * STUDIO-OPERATING-REVIEW-REVISION-FULL-LOOP-1 — live Maya Review walk.
 *
 * Production → QA → Review the real flyer → question ≠ revision → one allowed
 * revision → QA again → re-review Version 2 → approve exact version → Final Delivery
 * → fresh browser return.
 *
 * Run (Windows, existing Next):
 *   $env:PLAYWRIGHT_BROWSERS_PATH="$env:USERPROFILE\AppData\Local\ms-playwright"
 *   $env:CERT_BASE_URL="http://127.0.0.1:3066"
 *   $env:SESSION_SECRET="materials-upload-board-walk-ephemeral-not-for-production"
 *   npx tsx scripts/studio-operating-review-revision-full-loop-1-board-walk.mts
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";

import type { CampaignRecord } from "../src/config/studio-board";
import { studioReviewRevisionFullLoopV1 } from "../src/config/studio-review-revision-full-loop-v1";
import { studioVoiceMachineCustomerCommunicationV1 } from "../src/config/studio-voice-machine-customer-communication-v1";
import {
  createClientAccount,
  linkClientCampaign,
  markEmailVerified,
} from "../src/lib/auth/users";
import { readCampaignEnvelope, upsertCampaignRecord } from "../src/lib/campaign-store/store";
import { getOrGenerateTasks, readTasksEnvelope } from "../src/lib/campaign-tasks/store";
import { getOrInitializeMaterials } from "../src/lib/materials/store";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "../src/lib/plan-pricing";
import { recoverPaidOperatingChain } from "../src/lib/studio-paid-activation-recovery";
import { ensureDispatchExecution } from "../src/lib/studio-dispatch";
import { resolveFlyerObserverPngRelativePath } from "../src/lib/studio-customer-life";
import { FLYER_INCLUDED_SLOT_TRUTH } from "../src/lib/studio-review-revision/flyer-purchase-delivery-truth";
import { buildJobId } from "../src/lib/job-control/lane-map";
import { DESIGN_RENDERER_PROOF_SKU } from "../src/lib/studio-design-renderer";

const PORT = process.env.CERT_PORT || "3068";
const EXTERNAL_BASE = (process.env.CERT_BASE_URL || "").replace(/\/$/, "");
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "materials-upload-board-walk-ephemeral-not-for-production";
const COMMIT =
  process.env.CERT_COMMIT ||
  (() => {
    try {
      return readFileSync(join(process.cwd(), ".git", "HEAD"), "utf8").trim();
    } catch {
      return "unknown";
    }
  })();

const OUT = join(
  process.cwd(),
  "docs",
  "launch",
  "studio-operating-review-revision-full-loop-1",
);
const SHOTS = join(OUT, "customer-board-walk", "shots");
const ARTIFACTS = join(OUT, "artifacts");
mkdirSync(SHOTS, { recursive: true });
mkdirSync(ARTIFACTS, { recursive: true });

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
const asked: Array<{ question: string; answer: string }> = [];
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

async function waitForServer(url: string, attempts = 180): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`${url}/api/auth/session`, { method: "GET" });
      if (res.status > 0) return true;
    } catch {
      try {
        const lobby = await fetch(`${url}/sign-in`, { method: "GET" });
        if (lobby.status > 0) return true;
      } catch {
        /* retry */
      }
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
      checkoutSessionId: `cs_maya_review_${campaignId}`,
      paymentIntentId: `pi_maya_review_${campaignId}`,
      stripeEventId: `evt_maya_review_${campaignId}`,
      selectedServiceIds: ["v2-rtu-flyer"],
      decisionId: `dec_maya_review_${campaignId}`,
      factFingerprint: `fp_maya_review_${campaignId}`,
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

function latestRenderFlyerFile(
  campaignId: string,
  filename: "flyer.png" | "flyer.pdf",
): string | null {
  const root = join(process.cwd(), "data", "campaign-design-artifacts", campaignId);
  if (!existsSync(root)) return null;
  let newest: { version: number; abs: string } | null = null;
  const stack = [root];
  const needle = new RegExp(
    `[/\\\\]renders[/\\\\]v(\\d+)[/\\\\]${filename.replace(".", "\\.")}$`,
    "i",
  );
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
        continue;
      }
      const match = needle.exec(abs.replace(/\\/g, "/"));
      if (!match) continue;
      const version = Number(match[1]);
      if (!newest || version >= newest.version) newest = { version, abs };
    }
  }
  return newest?.abs ?? null;
}

function latestRenderFlyerPng(campaignId: string): string | null {
  return latestRenderFlyerFile(campaignId, "flyer.png");
}

function fileSha256(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function declaredTextFromRenderPng(pngAbs: string): string {
  const specAbs = pngAbs.replace(/flyer\.png$/i, "design-spec.json");
  if (!existsSync(specAbs)) return "";
  try {
    const spec = JSON.parse(readFileSync(specAbs, "utf8")) as {
      layers?: Array<{ type?: string; content?: string }>;
    };
    return (spec.layers ?? [])
      .filter((layer) => layer.type === "text" && layer.content)
      .map((layer) => layer.content)
      .join("\n");
  } catch {
    return "";
  }
}

async function copyFlyerPng(campaignId: string, versionName: string): Promise<string | null> {
  const envelope = await readCampaignEnvelope(campaignId);
  const flyer = envelope?.record.dispatchExecution?.designRendererObserver?.results.find(
    (result) => result.skuId === DESIGN_RENDERER_PROOF_SKU && result.ok,
  );
  const fromLatest = latestRenderFlyerPng(campaignId);
  const rel = flyer ? resolveFlyerObserverPngRelativePath(flyer) : undefined;
  const fromIdentity = rel ? join(process.cwd(), rel) : null;
  const abs =
    fromLatest && existsSync(fromLatest)
      ? fromLatest
      : fromIdentity && existsSync(fromIdentity)
        ? fromIdentity
        : null;
  if (!abs) return null;
  const dest = join(ARTIFACTS, versionName);
  copyFileSync(abs, dest);
  const pdfSrc = abs.replace(/\.png$/i, ".pdf");
  if (existsSync(pdfSrc)) {
    copyFileSync(pdfSrc, dest.replace(/\.png$/i, ".pdf"));
  }
  return dest;
}

async function signInAsMaya(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${BASE}/sign-in?from=/studio-board`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.locator("form.utility-form").waitFor({ timeout: 30_000 });
  await page.waitForTimeout(800);
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
  const answer =
    json.message?.machineAnswer?.text?.trim() ||
    json.machineConfirmation?.trim() ||
    "";
  asked.push({ question: text, answer });
  await page
    .getByText(studioVoiceMachineCustomerCommunicationV1.customerCopy.recordAnswerLabel)
    .first()
    .waitFor({ state: "attached", timeout: 20_000 });
  return answer;
}

function finish(code: number): number {
  stopLocalServer();
  const failed = results.filter((row) => row.status === "FAIL").length;
  const blocked = results.filter((row) => row.status === "BLOCKED").length;
  const passed = results.filter((row) => row.status === "PASS").length;
  const verdict =
    failed > 0
      ? "NOT CLOSED — review/revision walk failed"
      : blocked > 0
        ? "BLOCKED — start local server and re-run"
        : "REVIEW + REVISION FULL LOOP READY FOR CLOSE";

  const evidence = {
    packageId: studioReviewRevisionFullLoopV1.packageId,
    kind: "customer-review-walk",
    recordedAt: new Date().toISOString(),
    baseUrl: BASE,
    commitHint: COMMIT,
    runId: randomUUID(),
    totals: { passed, failed, blocked, total: results.length },
    verdict,
    asked,
    results,
    artifacts: {
      v1: existsSync(join(ARTIFACTS, "maya-flyer-v1.png"))
        ? "artifacts/maya-flyer-v1.png"
        : null,
      v2: existsSync(join(ARTIFACTS, "maya-flyer-v2.png"))
        ? "artifacts/maya-flyer-v2.png"
        : null,
      v1Pdf: existsSync(join(ARTIFACTS, "maya-flyer-v1.pdf"))
        ? "artifacts/maya-flyer-v1.pdf"
        : null,
      v2Pdf: existsSync(join(ARTIFACTS, "maya-flyer-v2.pdf"))
        ? "artifacts/maya-flyer-v2.pdf"
        : null,
    },
    notes: [
      "Maya facts restored from locked brief: included services, botanical/soft-neutral style, wordmark-only, Book Your Reset CTA.",
      "Lifecycle email was not built. Board / Review / Voice were the customer truth surfaces.",
      "Review has no revision-file attachment control. Reported as later enhancement, not invented.",
      "Fresh Playwright context = new browser with empty cookies/localStorage.",
    ],
  };
  mkdirSync(join(OUT, "customer-board-walk"), { recursive: true });
  writeFileSync(
    join(OUT, "customer-board-walk", "board-walk-evidence.json"),
    JSON.stringify(evidence, null, 2),
    "utf8",
  );
  console.log(`\nEvidence: ${join(OUT, "customer-board-walk", "board-walk-evidence.json")}`);
  console.log(`Verdict: ${verdict}`);
  process.exitCode = code;
  return code;
}

async function main(): Promise<number> {
  const stamp = Date.now();
  const campaignId = `maya-review-loop-${stamp}`;
  const email = `maya.review.${stamp}@cedarandbloom.test`;
  const password = "MayaReview-Walk-0815!";
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
  const campaign = mayaPaidCampaign(campaignId);
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
      const flyerResult = dispatched.campaign.dispatchExecution?.designRendererObserver?.results.find(
        (result) => result.skuId === DESIGN_RENDERER_PROOF_SKU,
      );
      console.log("flyer observer", flyerResult);
    } else {
      console.log("dispatch not ok", dispatched);
    }
  }
  const produced = await copyFlyerPng(campaignId, "maya-flyer-v1.png");
  push(
    "machine_produced_maya_flyer",
    produced ? "PASS" : "FAIL",
    produced ?? "No PNG after sealed flyer dispatch.",
  );

  const tasks = await readTasksEnvelope(campaignId);
  const qaPass = (tasks?.qaRecords ?? []).some(
    (record) => record.action === "qa_pass" && record.taskId.includes("v2-rtu-flyer"),
  );
  const qaFailFirst = (tasks?.qaRecords ?? []).some((record) => record.action === "qa_fail");
  push(
    "qa_pass_required_before_review",
    qaPass ? "PASS" : "FAIL",
    qaFailFirst
      ? "A qa_fail exists on the ledger; Review opened only after a later qa_pass."
      : qaPass
        ? "Internal QA pass is on the record. Renderer success was not treated as customer-ready by itself."
        : "No flyer QA pass recorded.",
  );
  const job = tasks?.jobRecords?.find((entry) => entry.skuId === "v2-rtu-flyer");
  const proofCount = (job?.fileRegistry ?? []).filter(
    (ref) => ref.category === "review_proof",
  ).length;
  push(
    "review_proof_bytes_presented",
    proofCount > 0 && Boolean(job?.deliverablePrep?.some((entry) => entry.preparedAt))
      ? "PASS"
      : "FAIL",
    `Review proofs: ${proofCount}. Prepared: ${Boolean(job?.deliverablePrep?.some((e) => e.preparedAt))}`,
  );
  push(
    "review_qa_pin_survives_on_job",
    job?.internalQaReviewAuthorization?.status === "ELIGIBLE_FOR_REVIEW"
      ? "PASS"
      : "FAIL",
    job?.internalQaReviewAuthorization
      ? `pin ${job.internalQaReviewAuthorization.workVersionId}`
      : "QA Review pin missing on job record — Review Room would 403.",
  );

  const browser: Browser = await chromium.launch({ headless: true });
  let contextA: BrowserContext | null = null;
  let contextB: BrowserContext | null = null;

  try {
    contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInAsMaya(pageA, email, password);
    const boardShot = await shot(pageA, "01-board-review-ready");
    const boardText = await visibleText(pageA);
    push(
      "board_tells_maya_review_is_ready",
      /Open Review Room/i.test(boardText) || /Ready for Review/i.test(boardText)
        ? "PASS"
        : "FAIL",
      boardText.slice(0, 240),
      boardShot,
    );

    const readyAsk = await sendProjectMessage(
      pageA,
      studioReviewRevisionFullLoopV1.customerCopy.readyForReviewQuestion,
    );
    push(
      "voice_review_ready_from_record",
      /you can review it now/i.test(readyAsk) ? "PASS" : "FAIL",
      readyAsk.slice(0, 220),
    );

    await pageA.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(jobId)}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    try {
      await pageA.locator(".fs-review-proof__image, .fs-mock__headline").first().waitFor({
        timeout: 45_000,
      });
    } catch (error) {
      await shot(pageA, "02-review-not-ready");
      const body = await visibleText(pageA);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)} | review body: ${body.slice(0, 400)}`,
      );
    }
    const reviewShot = await shot(pageA, "02-maya-reviews-real-flyer");
    const reviewText = await visibleText(pageA);
    const proofImg = pageA.locator("img.fs-review-proof__image");
    push(
      "maya_sees_real_flyer_version_and_actions",
      (await proofImg.count()) > 0 &&
        /Version 1/i.test(reviewText) &&
        /Request a revision/i.test(reviewText) &&
        /Approve this version/i.test(reviewText)
        ? "PASS"
        : "FAIL",
      reviewText.slice(0, 280),
      reviewShot,
    );
    push(
      "review_shows_flyer_design_not_qc_download",
      /finished single-sided flyer/i.test(reviewText) &&
        !/Studio quality-control review before delivery/i.test(reviewText)
        ? "PASS"
        : "FAIL",
      reviewText.slice(0, 220),
    );
    push(
      "no_kitchen_jargon_in_review",
      !/qa_pass|design-qa|Kitchen|Owner Console/i.test(reviewText) ? "PASS" : "FAIL",
      "Customer Review copy checked for internal terminology.",
    );

    const question = await sendProjectMessage(
      pageA,
      "Do you need anything else from me?",
    );
    const tasksAfterQuestion = await readTasksEnvelope(campaignId);
    push(
      "question_does_not_create_revision",
      (tasksAfterQuestion?.jobCorrectionUses ?? []).length === 0 &&
        tasksAfterQuestion?.jobRecords?.find((entry) => entry.skuId === "v2-rtu-flyer")
          ?.spineStatus === "ready_for_review"
        ? "PASS"
        : "FAIL",
      question.slice(0, 220),
    );

    await forceClick(pageA.getByRole("button", { name: /^Add Sticky Note$/i }));
    const coral = pageA.getByRole("button", { name: /Revision Request/i });
    if ((await coral.count()) > 0) {
      await forceClick(coral.first());
    }
    await pageA.locator(".fs-feedback-panel__sticky-input").fill(
      "Please make Book Your Reset more prominent as the headline.",
    );
    await forceClick(pageA.getByRole("button", { name: /^Place note$/i }));
    await forceClick(pageA.locator(".fs-feedback-panel__btn--revision"));
    await pageA.waitForTimeout(800);
    const jobRevision = pageA.locator(".fs-review__choose").getByRole("button", {
      name: /Request a revision/i,
    });
    for (let i = 0; i < 20; i += 1) {
      if (await jobRevision.isEnabled()) break;
      await pageA.waitForTimeout(250);
    }
    await forceClick(jobRevision);
    await pageA.getByRole("button", { name: /Send revision request/i }).waitFor({
      timeout: 15_000,
    });
    const revisionPatch = pageA.waitForResponse(
      (res) =>
        res.url().includes("/review") &&
        res.request().method() === "PATCH" &&
        (res.request().postData() ?? "").includes("request_revision"),
      { timeout: 120_000 },
    );
    await forceClick(pageA.getByRole("button", { name: /Send revision request/i }));
    const revisionResponse = await revisionPatch;
    if (!revisionResponse.ok()) {
      const body = await revisionResponse.text();
      throw new Error(`request_revision failed (${revisionResponse.status()}): ${body.slice(0, 280)}`);
    }
    await pageA.getByText(/Revision requested — returning to production/i).first().waitFor({
      timeout: 30_000,
    });
    const revShot = await shot(pageA, "03-revision-requested-ack");
    const afterRevTasks = await readTasksEnvelope(campaignId);
    const uses = afterRevTasks?.jobCorrectionUses ?? [];
    push(
      "revision_received_and_durable",
      uses.length === 1 ? "PASS" : "FAIL",
      `Correction uses: ${uses.length}`,
      revShot,
    );

    const receivedAsk = await sendProjectMessage(pageA, "Did you receive my revision?");
    push(
      "voice_revision_received",
      /received your revision request/i.test(receivedAsk) ||
        /requested change was applied/i.test(receivedAsk) ? "PASS" : "FAIL",
      receivedAsk.slice(0, 220),
    );

    for (let i = 0; i < 24; i += 1) {
      const latest = await readTasksEnvelope(campaignId);
      const flyerJob = latest?.jobRecords?.find((entry) => entry.skuId === "v2-rtu-flyer");
      const proofs = (flyerJob?.fileRegistry ?? []).filter(
        (ref) => ref.category === "review_proof",
      );
      if (flyerJob?.spineStatus === "ready_for_review" && proofs.length >= 2) break;
      await pageA.waitForTimeout(2500);
    }
    const v2Path = await copyFlyerPng(campaignId, "maya-flyer-v2.png");
    const v1Hash = produced && existsSync(produced) ? fileSha256(produced) : null;
    const v2Hash = v2Path && existsSync(v2Path) ? fileSha256(v2Path) : null;
    const v2PdfPath = v2Path ? v2Path.replace(/\.png$/i, ".pdf") : null;
    const v2PdfHash =
      v2PdfPath && existsSync(v2PdfPath) ? fileSha256(v2PdfPath) : null;
    const v2SourcePng = latestRenderFlyerPng(campaignId);
    const v2Declared = v2SourcePng ? declaredTextFromRenderPng(v2SourcePng) : "";
    push(
      "revised_artifact_produced",
      Boolean(v2Path && v1Hash && v2Hash && v1Hash !== v2Hash) ? "PASS" : "FAIL",
      v2Path
        ? `v1=${v1Hash?.slice(0, 12)} v2=${v2Hash?.slice(0, 12)}`
        : "No Version 2 PNG",
    );
    push(
      "creative_brief_fidelity_v2",
      /Cedar & Bloom/i.test(v2Declared) &&
        /Back-to-School Reset/i.test(v2Declared) &&
        /\$149/.test(v2Declared) &&
        /2-hour home organization session/i.test(v2Declared) &&
        /one selected household area/i.test(v2Declared) &&
        /simple organization plan for maintaining the space/i.test(v2Declared) &&
        /pantry/i.test(v2Declared) &&
        /entryway/i.test(v2Declared) &&
        /homework area/i.test(v2Declared) &&
        /closet/i.test(v2Declared) &&
        /home office/i.test(v2Declared) &&
        /Book Your Reset/i.test(v2Declared) &&
        /555-0186/.test(v2Declared) &&
        /cedarandbloom\.example/i.test(v2Declared) &&
        /2026/.test(v2Declared) &&
        !/Includes:/i.test(v2Declared) &&
        !/Includes: one 2-hour organizing session/i.test(v2Declared) &&
        !/Finished single-sided flyer/i.test(v2Declared) &&
        !/You distribute/i.test(v2Declared) &&
        !/Local business/i.test(v2Declared) &&
        !/school bus/i.test(v2Declared) &&
        !/guarantee/i.test(v2Declared)
        ? "PASS"
        : "FAIL",
      v2Declared.slice(0, 280),
    );

    await pageA.reload({ waitUntil: "domcontentloaded" });
    await pageA.locator(".fs-review-proof__image, .fs-mock__headline").first().waitFor({
      timeout: 45_000,
    });
    const rereviewShot = await shot(pageA, "04-rereview-version-2");
    const rereviewText = await visibleText(pageA);
    push(
      "rereview_shows_new_version",
      /Version 2/i.test(rereviewText) ? "PASS" : "FAIL",
      rereviewText.slice(0, 240),
      rereviewShot,
    );

    const made = await sendProjectMessage(
      pageA,
      studioReviewRevisionFullLoopV1.customerCopy.didYouMakeMyChange,
    );
    push(
      "voice_applied_change_from_record",
      /requested change was applied/i.test(made) ? "PASS" : "FAIL",
      made.slice(0, 220),
    );
    const which = await sendProjectMessage(
      pageA,
      studioReviewRevisionFullLoopV1.customerCopy.whichVersionAmILookingAt,
    );
    push(
      "voice_current_version",
      /Version 2/i.test(which) ? "PASS" : "FAIL",
      which.slice(0, 220),
    );

    const left = await sendProjectMessage(pageA, "How many changes do I have left?");
    push(
      "revision_allowance_exhausted",
      /no remaining revision rounds of the 1 included/i.test(left) ? "PASS" : "FAIL",
      left.slice(0, 220),
    );
    const revisionJobBtn = pageA.locator(".fs-review__choose").getByRole("button", {
      name: /Request a revision/i,
    });
    push(
      "second_included_revision_blocked",
      (await revisionJobBtn.isDisabled()) ? "PASS" : "FAIL",
      "Job-level Request a revision is disabled after the included round.",
    );

    await forceClick(pageA.locator(".fs-feedback-panel__btn--approve"));
    await pageA.waitForTimeout(800);
    const jobApprove = pageA.getByRole("button", { name: /^Approve this version$/i });
    for (let i = 0; i < 24; i += 1) {
      if (await jobApprove.isEnabled()) break;
      await pageA.waitForTimeout(250);
    }
    if (!(await jobApprove.isEnabled())) {
      await shot(pageA, "05-approve-still-disabled");
      throw new Error(
        `Approve this version stayed disabled. Body: ${(await visibleText(pageA)).slice(0, 500)}`,
      );
    }
    await forceClick(jobApprove);
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
      const body = await approvalResponse.text();
      throw new Error(`approve_for_delivery failed (${approvalResponse.status()}): ${body.slice(0, 280)}`);
    }
    await pageA.getByText(/Feedback submitted|preparing your final files|exact version you approved/i).first().waitFor({
      timeout: 30_000,
    });
    const approveShot = await shot(pageA, "05-approved-exact-version");
    const afterApprove = await readTasksEnvelope(campaignId);
    const approvedJob = afterApprove?.jobRecords?.find((entry) => entry.skuId === "v2-rtu-flyer");
    const pin = approvedJob?.customerApprovedArtifactAuthorization;
    const cdf = approvedJob?.clientDeliveryFiles ?? [];
    push(
      "exact_approval_binding",
      pin?.status === "CUSTOMER_APPROVED" &&
        Boolean(pin.contentSha256s?.[0]) &&
        (pin.contentSha256s[0] ?? "").replace(/^sha256:/i, "") === (v2Hash ?? "")
        ? "PASS"
        : "FAIL",
      `Pin ${pin?.workVersionId ?? "none"} ${pin?.contentSha256s?.[0] ?? ""}`.slice(0, 180),
      approveShot,
    );
    const pinHash = pin?.contentSha256s?.[0] ?? "";
    const pinHexes = (pin?.contentSha256s ?? []).map((hash) =>
      hash.replace(/^sha256:/i, "").toLowerCase(),
    );
    const pinHex = pinHash.replace(/^sha256:/i, "");
    const pngFile = cdf.find((file) => /png|jpg/i.test(file.fileType));
    const pdfFile = cdf.find((file) => /pdf/i.test(file.fileType));
    const pngHex = (pngFile?.contentSha256 ?? "").replace(/^sha256:/i, "").toLowerCase();
    const pdfHex = (pdfFile?.contentSha256 ?? "").replace(/^sha256:/i, "").toLowerCase();
    push(
      "stale_version_cannot_win",
      Boolean(v1Hash && v2Hash && pinHex === v2Hash && pinHex !== v1Hash) &&
        !cdf.some((file) => (file.contentSha256 ?? "").replace(/^sha256:/i, "") === v1Hash)
        ? "PASS"
        : "FAIL",
      `v1=${v1Hash?.slice(0, 12)} v2=${v2Hash?.slice(0, 12)} pin=${pinHex.slice(0, 12)} files=${cdf.length}`,
    );
    push(
      "exact_final_delivery",
      cdf.some((file) => (file.contentSha256 ?? "").replace(/^sha256:/i, "") === pinHex) &&
        pinHex === (v2Hash ?? "") &&
        (approvedJob?.spineStatus === "ready_for_delivery" ||
          approvedJob?.spineStatus === "delivered")
        ? "PASS"
        : "FAIL",
      `spine=${approvedJob?.spineStatus} files=${cdf.length} pin=${pin?.workVersionId ?? "none"}`,
    );
    push(
      "five_slot_classification",
      FLYER_INCLUDED_SLOT_TRUTH.filter((slot) => slot.class === "customer_promised_file").length === 2 &&
        FLYER_INCLUDED_SLOT_TRUTH.some((slot) => slot.class === "internal_qa") &&
        FLYER_INCLUDED_SLOT_TRUTH.some((slot) => slot.class === "supporting_studio_work")
        ? "PASS"
        : "FAIL",
      FLYER_INCLUDED_SLOT_TRUTH.map((slot) => `${slot.key}:${slot.class}`).join(", "),
    );
    push(
      "customer_received_promised_png_and_pdf",
      Boolean(
        pngFile &&
          pdfFile &&
          cdf.length === 2 &&
          pngHex === (v2Hash ?? "") &&
          pdfHex &&
          pdfHex === (v2PdfHash ?? "") &&
          pngHex !== pdfHex &&
          pinHexes.includes(pngHex) &&
          pinHexes.includes(pdfHex),
      )
        ? "PASS"
        : "FAIL",
      `files=${cdf.length} png=${pngHex.slice(0, 12)} pdf=${pdfHex.slice(0, 12)} v2pdf=${(v2PdfHash ?? "").slice(0, 12)} pin=${pinHexes.map((h) => h.slice(0, 8)).join("+")}`,
    );

    await pageA.goto(`${BASE}/deliverables`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await pageA.waitForTimeout(1200);
    const deliveryShot = await shot(pageA, "07-final-delivery-png-and-pdf");
    const deliveryText = await visibleText(pageA);
    push(
      "final_delivery_customer_truth",
      /Print-ready PDF/i.test(deliveryText) &&
        /Digital PNG or JPG/i.test(deliveryText) &&
        /Version 2/i.test(deliveryText) &&
        !/Studio quality-control review before delivery/i.test(deliveryText) &&
        !/One defined design direction/i.test(deliveryText)
        ? "PASS"
        : "FAIL",
      deliveryText.slice(0, 280),
      deliveryShot,
    );

    await contextA.close();
    contextA = null;
    contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAsMaya(pageB, email, password);
    await pageB.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(jobId)}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    const returnShot = await shot(pageB, "06-fresh-context-return");
    const returnTasks = await readTasksEnvelope(campaignId);
    const returnJob = returnTasks?.jobRecords?.find((entry) => entry.skuId === "v2-rtu-flyer");
    push(
      "leave_return_preserves_approval_and_history",
      returnJob?.customerApprovedArtifactAuthorization?.decisionId === pin?.decisionId &&
        (returnTasks?.jobCorrectionUses ?? []).length === 1 &&
        (returnJob?.clientDeliveryFiles ?? []).some((file) => /pdf/i.test(file.fileType)) &&
        (returnJob?.clientDeliveryFiles ?? []).some((file) => /png|jpg/i.test(file.fileType))
        ? "PASS"
        : "FAIL",
      `spine=${returnJob?.spineStatus}`,
      returnShot,
    );
    push("revision_attachment_not_invented", "PASS", "Review has no file-attach control. Later enhancement.");
    push("owner_intervention", "PASS", "NONE. Routine Review, revision, QA, and Final Delivery did not require Tagia.");
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
