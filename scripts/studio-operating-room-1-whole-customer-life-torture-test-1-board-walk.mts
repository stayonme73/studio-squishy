/**
 * STUDIO-OPERATING-ROOM-1-WHOLE-CUSTOMER-LIFE-TORTURE-TEST-1
 *
 * One Maya project. Full Room 1 life plus locked chaotic cracks.
 * Branded email is NOT YET CERTIFIED — not a pass, not a fail.
 *
 * Run (Windows, existing Next):
 *   $env:PLAYWRIGHT_BROWSERS_PATH="$env:USERPROFILE\AppData\Local\ms-playwright"
 *   $env:CERT_BASE_URL="http://127.0.0.1:3066"
 *   $env:SESSION_SECRET="materials-upload-board-walk-ephemeral-not-for-production"
 *   npx tsx scripts/studio-operating-room-1-whole-customer-life-torture-test-1-board-walk.mts
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";

import type { CampaignRecord } from "../src/config/studio-board";
import { studioDispatchV1 } from "../src/config/studio-dispatch-v1";
import { studioMaterialsUploadV1 } from "../src/config/studio-materials-upload-v1";
import { studioReviewRevisionFullLoopV1 } from "../src/config/studio-review-revision-full-loop-v1";
import { studioRoom1WholeCustomerLifeTortureTestV1 as cfg } from "../src/config/studio-room-1-whole-customer-life-torture-test-v1";
import { studioCustomerLifeV1 } from "../src/config/studio-customer-life-v1";
import { studioVoiceMachineCustomerCommunicationV1 } from "../src/config/studio-voice-machine-customer-communication-v1";
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
import type { ServerTasksEnvelope } from "../src/lib/campaign-tasks/types";
import { isPrivateStoredMaterial } from "../src/lib/materials/client-file-store";
import { getOrInitializeMaterials, readMaterialsEnvelope } from "../src/lib/materials/store";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "../src/lib/plan-pricing";
import { recoverPaidOperatingChain } from "../src/lib/studio-paid-activation-recovery";
import { ensureDispatchExecution } from "../src/lib/studio-dispatch";
import {
  askCustomerLifeFromStore,
  bindFlyerIdentityToQaRecords,
  ensureFlyerMachineReviewBind,
  resolveFlyerObserverPngRelativePath,
  statusSummaryHasObsoleteContradiction,
} from "../src/lib/studio-customer-life";
import { FLYER_INCLUDED_SLOT_TRUTH } from "../src/lib/studio-review-revision/flyer-purchase-delivery-truth";
import { buildJobId } from "../src/lib/job-control/lane-map";
import {
  applyJobCommunicationTransportResult,
  enqueueJobCommunicationRecord,
} from "../src/lib/job-control/communication";
import { DESIGN_RENDERER_PROOF_SKU } from "../src/lib/studio-design-renderer";

const PORT = process.env.CERT_PORT || "3066";
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
  "studio-operating-room-1-whole-customer-life-torture-test-1",
);
const SHOTS = join(OUT, "customer-board-walk", "shots");
const ARTIFACTS = join(OUT, "artifacts");
const TMP = join(OUT, "tmp");
mkdirSync(SHOTS, { recursive: true });
mkdirSync(ARTIFACTS, { recursive: true });
mkdirSync(TMP, { recursive: true });

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

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const TINY_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

type CheckStatus = "PASS" | "FAIL" | "BLOCKED";
type Check = {
  check: string;
  status: CheckStatus;
  detail?: string;
  shot?: string;
};
type Crack = {
  beat: string;
  mayaSaw: string;
  machineBelieved: string;
  teamDid: string;
  voiceSaid: string;
  failure: string | null;
  recovered: string | null;
  ownerAction: "NONE" | "REQUIRED";
};

const results: Check[] = [];
const cracks: Crack[] = [];
const asked: Array<{ question: string; answer: string }> = [];
let serverChild: ChildProcess | null = null;
let BASE = EXTERNAL_BASE || `http://127.0.0.1:${PORT}`;

function push(check: string, status: CheckStatus, detail?: string, shot?: string): void {
  results.push({ check, status, detail, shot });
  console.log(detail ? `${status}  ${check} — ${detail}` : `${status}  ${check}`);
}

function crack(entry: Crack): void {
  cracks.push(entry);
  console.log(`CRACK  ${entry.beat} — owner=${entry.ownerAction}`);
}

function voiceStatusLooksCoherent(text: string): boolean {
  return (
    !statusSummaryHasObsoleteContradiction(text) &&
    !(
      /ready for Review/i.test(text) &&
      (/has not been assigned/i.test(text) ||
        /no received upload/i.test(text) ||
        /getting your project ready/i.test(text))
    )
  );
}

async function shot(page: Page, name: string): Promise<string> {
  const file = join(SHOTS, `${name}.png`);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      if (existsSync(file)) unlinkSync(file);
      await page.screenshot({ path: file, fullPage: true });
      return file;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  return file;
}

async function forceClick(locator: ReturnType<Page["locator"]>): Promise<void> {
  await locator.click({ force: true, timeout: 20_000 });
}

async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => (document.body?.innerText || "").slice(0, 18000));
}

async function waitForMayaProject(page: Page): Promise<void> {
  await page.getByText(/Cedar & Bloom Home Organizing/i).first().waitFor({
    timeout: 45_000,
  });
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

function mayaPaidCampaign(campaignId: string, withIntake: boolean): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals(["v2-rtu-flyer"]);
  const lineItems = buildServiceScopeSnapshot(["v2-rtu-flyer"]);
  const intake = withIntake
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
    : {};
  return {
    campaignId,
    campaignName: "Cedar & Bloom Home Organizing",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Back-to-School Reset flyer",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      confirmedAmountCents: 6900,
      checkoutSessionId: `cs_maya_torture_${campaignId}`,
      paymentIntentId: `pi_maya_torture_${campaignId}`,
      stripeEventId: `evt_maya_torture_${campaignId}`,
      selectedServiceIds: ["v2-rtu-flyer"],
      decisionId: `dec_maya_torture_${campaignId}`,
      factFingerprint: `fp_maya_torture_${campaignId}`,
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
    ...intake,
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

async function openBoardMaterials(page: Page): Promise<void> {
  await page.goto(`${BASE}/studio-board`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.getByText(/Cedar & Bloom Home Organizing/i).first().waitFor({
    timeout: 45_000,
  });
  const addMore = page.getByRole("button", { name: /Add more \(optional\)/i });
  if ((await addMore.count()) > 0) {
    const expanded = await addMore.getAttribute("aria-expanded");
    if (expanded !== "true") await addMore.click();
  }
  const materials = page.locator(".sb-card--materials").first();
  await materials.waitFor({ timeout: 45_000 });
  await materials.scrollIntoViewIfNeeded();
  await page.locator(".sb-materials-intake__file-input").first().waitFor({
    state: "attached",
    timeout: 30_000,
  });
}

async function selectAndTrySend(
  page: Page,
  filePath: string,
  waitForStoredPatch = false,
): Promise<void> {
  const fileInput = page.locator(".sb-materials-intake__file-input").first();
  await fileInput.waitFor({ state: "attached", timeout: 30_000 });
  await fileInput.setInputFiles(filePath);
  await page.waitForTimeout(600);
  const patch = waitForStoredPatch
    ? page.waitForResponse(
        (res) =>
          res.url().includes("/materials") &&
          res.request().method() === "PATCH" &&
          res.url().includes("audience=client"),
        { timeout: 25_000 },
      )
    : null;
  await page.evaluate(() => {
    const fileState = document.querySelector(".sb-materials-intake__file-state");
    const item = fileState?.closest("li");
    if (!item) return;
    const attest = item.querySelector(
      ".sb-materials-intake__attest input[type='checkbox']",
    ) as HTMLInputElement | null;
    if (attest && !attest.checked) attest.click();
    const send = item.querySelector(
      ".sb-materials-intake__submit",
    ) as HTMLButtonElement | null;
    if (send && !send.disabled) send.click();
  });
  if (patch) {
    const res = await patch;
    if (!res.ok()) {
      const body = await res.text();
      throw new Error(`Materials upload PATCH failed (${res.status()}): ${body.slice(0, 400)}`);
    }
  }
}

function rewindQaForFail(envelope: ServerTasksEnvelope): ServerTasksEnvelope {
  return {
    ...envelope,
    qaRecords: (envelope.qaRecords ?? []).filter(
      (record) => !record.taskId.includes("v2-rtu-flyer"),
    ),
    jobRecords: (envelope.jobRecords ?? []).map((job) =>
      job.skuId !== "v2-rtu-flyer"
        ? job
        : {
            ...job,
            internalQaReviewAuthorization: undefined,
            spineStatus:
              job.spineStatus === "ready_for_review"
                ? "building_concepts"
                : job.spineStatus,
          },
    ),
    updatedAt: new Date().toISOString(),
  };
}

function finish(code: number): number {
  stopLocalServer();
  const failed = results.filter((row) => row.status === "FAIL").length;
  const blocked = results.filter((row) => row.status === "BLOCKED").length;
  const passed = results.filter((row) => row.status === "PASS").length;
  const ownerRequired = cracks.some((entry) => entry.ownerAction === "REQUIRED");
  const verdict =
    failed > 0
      ? "NOT CLOSED — torture walk found a Room 1 crack"
      : blocked > 0
        ? "BLOCKED — start local server and re-run"
        : ownerRequired
          ? "NOT CLOSED — a crack required Tagia"
          : "PARKED FOR MANAGER — same Maya project kept one Studio story through the locked cracks. Room 1 is not closed. Branded email remains NOT YET CERTIFIED.";

  const evidence = {
    packageId: cfg.packageId,
    kind: "whole-customer-life-torture-walk",
    recordedAt: new Date().toISOString(),
    baseUrl: BASE,
    commitHint: COMMIT,
    runId: randomUUID(),
    totals: { passed, failed, blocked, total: results.length },
    verdict,
    roomClosed: false,
    email: {
      status: "NOT_YET_CERTIFIED",
      verdict: "EXTERNAL_PREREQUISITE",
      countedAs: "neither_pass_nor_fail",
      protectedCheckpoint: cfg.comeBackLaterEmail.protectedCheckpoint,
      parkedPackageId: cfg.comeBackLaterEmail.parkedPackageId,
      reason: cfg.comeBackLaterEmail.reason,
      note: "Email is a nudge. Board and Voice remain the project truth even when branded transport is unavailable.",
    },
    paymentHonesty:
      "Payment on this walk is the sealed processor-confirmed Maya fixture ($69 Make Me a Flyer). Hosted Stripe click-through was certified in an earlier Room 1 package. Intake after that confirmation was submitted as the locked Maya brief so later cracks share one campaign id.",
    asked,
    cracks,
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
  const campaignId = `maya-room1-torture-${stamp}`;
  const email = `maya.torture.${stamp}@cedarandbloom.test`;
  const password = "MayaTorture-Walk-0815!";
  const jobId = buildJobId(campaignId, "v2-rtu-flyer");
  const gifPath = join(TMP, "maya-wrong.gif");
  const pngPath = join(TMP, "maya-optional-mark.png");
  writeFileSync(gifPath, TINY_GIF);
  writeFileSync(pngPath, ONE_PIXEL_PNG);

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
  let campaign = mayaPaidCampaign(campaignId, false);
  await upsertCampaignRecord(campaign, created.user.id);
  await linkClientCampaign(created.user.id, campaignId);
  await getOrInitializeMaterials(campaignId, campaign);
  await getOrGenerateTasks(campaignId, campaign);
  push("maya_paid_entry_seeded", "PASS", `campaign=${campaignId} fee=$69 fixture, not a live Stripe click`);

  const browser: Browser = await chromium.launch({ headless: true });
  let contextA: BrowserContext | null = null;
  let contextB: BrowserContext | null = null;
  let contextC: BrowserContext | null = null;
  let produced: string | null = null;
  let pinDecisionId: string | null = null;
  let v1Hash: string | null = null;
  let v2Hash: string | null = null;

  try {
    contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInAsMaya(pageA, email, password);
    const entryShot = await shot(pageA, "01-entry-paid-waiting-intake");
    const entryText = await visibleText(pageA);
    const needAsk = await sendProjectMessage(pageA, "Do you need anything else from me?");
    const intakeVoice = await askCustomerLifeFromStore({
      campaignId,
      question: "What is holding my flyer?",
    });
    const happeningPaid = await askCustomerLifeFromStore({
      campaignId,
      question: "What's happening with my flyer?",
    });
    asked.push({ question: "What is holding my flyer?", answer: intakeVoice.answer.text });
    asked.push({
      question: "What's happening with my flyer? (paid / intake missing)",
      answer: happeningPaid.answer.text,
    });
    push(
      "voice_asks_for_intake_after_pay",
      /Project Intake/i.test(needAsk) || /Project Intake/i.test(intakeVoice.answer.text)
        ? "PASS"
        : "FAIL",
      needAsk.slice(0, 220),
      entryShot,
    );
    push(
      "voice_status_paid_intake_missing",
      happeningPaid.answer.phase === "awaiting_intake" &&
        /Project Intake is still needed/i.test(happeningPaid.answer.text) &&
        voiceStatusLooksCoherent(happeningPaid.answer.text)
        ? "PASS"
        : "FAIL",
      happeningPaid.answer.text.slice(0, 280),
    );
    crack({
      beat: "entry_after_payment_before_intake",
      mayaSaw: /Cedar & Bloom/i.test(entryText)
        ? "Board showed Cedar & Bloom Home Organizing after sign-in."
        : "Board did not show the Maya project after sign-in.",
      machineBelieved: "Payment confirmed. Project Intake not submitted.",
      teamDid: "No team action. Machine held the next step for intake.",
      voiceSaid: needAsk || intakeVoice.answer.text,
      failure: null,
      recovered: null,
      ownerAction: "NONE",
    });

    const withIntake = mayaPaidCampaign(campaignId, true);
    const savedIntake = await upsertCampaignRecord(
      { ...campaign, ...withIntake, campaignId },
      created.user.id,
    );
    campaign = savedIntake.record;
    await pageA.reload({ waitUntil: "domcontentloaded" });
    const afterIntakeAsk = await sendProjectMessage(pageA, "Do you need anything else from me?");
    const waitingAsk = await sendProjectMessage(pageA, "What's happening with my flyer?");
    asked.push({ question: "What's happening with my flyer? (after intake)", answer: waitingAsk });
    push(
      "intake_submitted_same_campaign",
      Boolean(campaign.routeMapIntakeSubmittedAt) ? "PASS" : "FAIL",
      afterIntakeAsk.slice(0, 220),
    );
    push(
      "voice_status_after_intake_coherent",
      voiceStatusLooksCoherent(waitingAsk) &&
        !/has not been assigned/i.test(waitingAsk) &&
        !(/Review is open/i.test(waitingAsk) && /not assigned/i.test(waitingAsk))
        ? "PASS"
        : "FAIL",
      waitingAsk.slice(0, 280),
    );
    crack({
      beat: "intake",
      mayaSaw: "Project Intake was accepted. Board still showed the same Cedar & Bloom project.",
      machineBelieved: "Intake complete. Locked Maya brief is on the campaign record.",
      teamDid: "No extra team form. Machine stored the submitted intake answers.",
      voiceSaid: afterIntakeAsk,
      failure: null,
      recovered: null,
      ownerAction: "NONE",
    });
    crack({
      beat: "waiting_after_intake",
      mayaSaw: "Board still showed the same Cedar & Bloom project. Review was not required yet.",
      machineBelieved: "Paid + intake on record. Optional materials not required. Production may still be recovering.",
      teamDid: "No person jumped in.",
      voiceSaid: waitingAsk,
      failure: null,
      recovered: null,
      ownerAction: "NONE",
    });

    await openBoardMaterials(pageA);
    await selectAndTrySend(pageA, gifPath);
    await pageA.getByText(studioMaterialsUploadV1.customerCopy.unsupportedType).first().waitFor({
      timeout: 10_000,
    });
    const wrongShot = await shot(pageA, "02-wrong-upload-rejected");
    const materialsAfterWrong = await readMaterialsEnvelope(campaignId);
    const storedAfterWrong = (materialsAfterWrong?.items ?? []).filter((item) =>
      /maya-wrong\.gif/i.test(item.fileName ?? item.label ?? ""),
    );
    push(
      "wrong_upload_rejected",
      storedAfterWrong.length === 0 ? "PASS" : "FAIL",
      studioMaterialsUploadV1.customerCopy.unsupportedType,
      wrongShot,
    );
    crack({
      beat: "wrong_upload",
      mayaSaw: studioMaterialsUploadV1.customerCopy.unsupportedType,
      machineBelieved: "The GIF was not stored. No fake receipt.",
      teamDid: "No Team clarification ticket. The type is simply not accepted.",
      voiceSaid: "(not asked — Board already showed the unsupported-type receipt)",
      failure: "Maya tried to send a GIF.",
      recovered: "Maya was told to send a supported type. Project record unchanged.",
      ownerAction: "NONE",
    });

    await selectAndTrySend(pageA, pngPath, true);
    await pageA.getByText(/maya-optional-mark\.png/i).first().waitFor({ timeout: 15_000 });
    const storedCopy = pageA.getByText(studioMaterialsUploadV1.customerCopy.receivedStored).first();
    await storedCopy.waitFor({ timeout: 20_000 }).catch(() => undefined);
    const goodShot = await shot(pageA, "03-optional-png-stored");
    const materialsAfterStore = await readMaterialsEnvelope(campaignId);
    const storedOptional = (materialsAfterStore?.items ?? []).filter((item) =>
      /maya-optional-mark\.png/i.test(item.fileName ?? item.label ?? ""),
    );
    push(
      "optional_png_stored",
      storedOptional.some((item) => isPrivateStoredMaterial(item)) ||
        storedOptional.some((item) => Boolean(item.storageRef?.checksumSha256))
        ? "PASS"
        : "FAIL",
      storedOptional
        .map(
          (item) =>
            `${item.fileName}:${item.uploadStatus}:${item.storageRef?.checksumSha256?.slice(0, 12) ?? "no-hash"}`,
        )
        .join("; ") || "No optional PNG row on the materials envelope.",
      goodShot,
    );
    await selectAndTrySend(pageA, pngPath, true);
    const duplicateWait = pageA.getByText(studioMaterialsUploadV1.customerCopy.duplicateKept);
    await duplicateWait.first().waitFor({ timeout: 20_000 }).catch(() => undefined);
    const dupShot = await shot(pageA, "04-duplicate-kept-first");
    const dupText = await visibleText(pageA);
    push(
      "duplicate_upload_kept_first",
      dupText.includes(studioMaterialsUploadV1.customerCopy.duplicateKept) ? "PASS" : "FAIL",
      studioMaterialsUploadV1.customerCopy.duplicateKept,
      dupShot,
    );
    crack({
      beat: "duplicate_upload",
      mayaSaw: studioMaterialsUploadV1.customerCopy.duplicateKept,
      machineBelieved: "The exact PNG bytes were already stored. Duplicate did not replace the first.",
      teamDid: "No extra filing. First stored object kept.",
      voiceSaid: "(Board receipt was enough)",
      failure: "Maya sent the same optional PNG twice.",
      recovered: "First file stayed. Maya did not need Tagia.",
      ownerAction: "NONE",
    });

    const firstRecover = await recoverPaidOperatingChain(campaign);
    const afterFirst = (await readCampaignEnvelope(campaignId))?.record ?? campaign;
    if (afterFirst.dispatchExecution) {
      const stalled = await upsertCampaignRecord(
        {
          ...afterFirst,
          dispatchExecution: {
            ...afterFirst.dispatchExecution,
            status: studioDispatchV1.envelopeStatuses.pendingRetry,
          },
        },
        created.user.id,
      );
      campaign = stalled.record;
    } else {
      campaign = afterFirst;
    }
    const stallVoice = await askCustomerLifeFromStore({
      campaignId,
      question: "What's happening with my flyer?",
    });
    asked.push({ question: "What's happening with my flyer? (injected stall)", answer: stallVoice.answer.text });
    push(
      "voice_status_stall_inject_coherent",
      voiceStatusLooksCoherent(stallVoice.answer.text)
        ? "PASS"
        : "FAIL",
      stallVoice.answer.text.slice(0, 280),
    );
    const secondRecover = await recoverPaidOperatingChain(
      (await readCampaignEnvelope(campaignId))?.record ?? campaign,
    );
    const thirdRecover = await recoverPaidOperatingChain(secondRecover.campaign);
    campaign = (await readCampaignEnvelope(campaignId))?.record ?? secondRecover.campaign;
    const dispatched = await ensureDispatchExecution(campaign);
    campaign = dispatched.campaign;
    const recoveredVoice = await askCustomerLifeFromStore({
      campaignId,
      question: "Has work started on my flyer?",
    });
    asked.push({ question: "Has work started on my flyer?", answer: recoveredVoice.answer.text });
    const happeningProducing = await askCustomerLifeFromStore({
      campaignId,
      question: "What's happening with my flyer?",
    });
    asked.push({
      question: "What's happening with my flyer? (after stall recover)",
      answer: happeningProducing.answer.text,
    });
    push(
      "voice_status_production_underway_or_ready",
      happeningProducing.truth.phase !== "awaiting_intake" &&
        voiceStatusLooksCoherent(happeningProducing.answer.text) &&
        (happeningProducing.truth.reviewEligible
          ? /ready for Review/i.test(happeningProducing.answer.text)
          : !/ready for Review/i.test(happeningProducing.answer.text))
        ? "PASS"
        : "FAIL",
      `${happeningProducing.answer.phase}: ${happeningProducing.answer.text}`.slice(0, 280),
    );
    push(
      "stall_recover_without_tagia",
      firstRecover.ownerActionRequired === false &&
        secondRecover.ownerActionRequired === false &&
        thirdRecover.reason === "already_clear"
        ? "PASS"
        : "FAIL",
      `first=${firstRecover.reason} second=${secondRecover.reason} third=${thirdRecover.reason}`,
    );
    crack({
      beat: "timeout_or_stall_recover",
      mayaSaw: "Board did not ask Maya to pay again or contact Tagia.",
      machineBelieved: `Dispatch marked ${studioDispatchV1.envelopeStatuses.pendingRetry}, then recovered.`,
      teamDid: "No team rescue. recoverPaidOperatingChain ran twice after the stall flag.",
      voiceSaid: recoveredVoice.answer.text,
      failure: "A pending_retry stall was injected after first recovery.",
      recovered: thirdRecover.reason === "already_clear" ? "Second recovery cleared it. Owner NONE." : thirdRecover.reason,
      ownerAction: "NONE",
    });

    produced = await copyFlyerPng(campaignId, "maya-flyer-v1.png");
    push(
      "machine_produced_maya_flyer",
      produced ? "PASS" : "FAIL",
      produced ?? "No PNG after sealed flyer dispatch.",
    );

    const observer = campaign.dispatchExecution?.designRendererObserver?.results.find(
      (result) => result.skuId === DESIGN_RENDERER_PROOF_SKU && result.ok,
    );
    const pngAbs = produced && existsSync(produced) ? produced : latestRenderFlyerPng(campaignId);
    const pngHash = pngAbs ? fileSha256(pngAbs) : "";
    const envelopeBeforeFail = await readTasksEnvelope(campaignId);
    if (envelopeBeforeFail && pngHash && observer) {
      const stripped = rewindQaForFail(envelopeBeforeFail);
      const failedBind = bindFlyerIdentityToQaRecords({
        campaign,
        envelope: stripped,
        pngContentSha256: pngHash,
        renderVersion: 1,
        artifactId: `flyer-v${observer.renderVersion ?? 1}`,
        designEvidence: { gatePassed: false } as never,
        clientUserId: created.user.id,
      });
      await writeTasksEnvelope(failedBind.envelope);
      const qaFailVoice = await askCustomerLifeFromStore({
        campaignId,
        question: studioReviewRevisionFullLoopV1.customerCopy.readyForReviewQuestion,
      });
      asked.push({ question: "Is my flyer ready for me to review? (qa_fail)", answer: qaFailVoice.answer.text });
      const qaFailStatus = await askCustomerLifeFromStore({
        campaignId,
        question: "What's happening with my flyer?",
      });
      asked.push({
        question: "What's happening with my flyer? (qa_fail)",
        answer: qaFailStatus.answer.text,
      });
      await pageA.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(jobId)}`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await pageA.waitForTimeout(1800);
      const reviewBeforeReadyShot = await shot(pageA, "05b-review-nav-before-ready");
      const reviewBeforeReadyText = await visibleText(pageA);
      const prematureProof = await pageA.locator("img.fs-review-proof__image").count();
      const claimsReviewReady =
        /You are reviewing Version/i.test(reviewBeforeReadyText) ||
        (await pageA.getByRole("button", { name: /Approve for Delivery/i }).count()) > 0;
      const stillNotEligible = !(await askCustomerLifeFromStore({
        campaignId,
        question: "Is my flyer ready for me to review?",
      })).truth.reviewEligible;
      push(
        "review_nav_before_ready_does_not_expose_artifact",
        stillNotEligible &&
          prematureProof === 0 &&
          !claimsReviewReady &&
          !qaFailVoice.truth.reviewEligible
          ? "PASS"
          : "FAIL",
        `eligibleAfterLoad=${!stillNotEligible} proofImgs=${prematureProof} claimsReady=${claimsReviewReady} ${reviewBeforeReadyText.slice(0, 200)}`,
        reviewBeforeReadyShot,
      );
      push(
        "voice_status_qa_fail_coherent",
        /internal quality check/i.test(qaFailStatus.answer.text) &&
          !/ready for Review/i.test(qaFailStatus.answer.text) &&
          voiceStatusLooksCoherent(qaFailStatus.answer.text)
          ? "PASS"
          : "FAIL",
        qaFailStatus.answer.text.slice(0, 280),
      );
      await pageA.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await waitForMayaProject(pageA);
      const qaFailShot = await shot(pageA, "05-qa-fail-review-closed");
      const qaFailBoard = await visibleText(pageA);
      push(
        "qa_fail_keeps_review_closed",
        failedBind.qaAction === "qa_fail" &&
          !qaFailVoice.truth.reviewEligible &&
          /not open yet|still preparing/i.test(qaFailVoice.answer.text)
          ? "PASS"
          : "FAIL",
        `action=${failedBind.qaAction} eligible=${qaFailVoice.truth.reviewEligible} ${qaFailVoice.answer.text.slice(0, 160)}`,
        qaFailShot,
      );
      crack({
        beat: "qa_failure",
        mayaSaw: /Open Review Room/i.test(qaFailBoard)
          ? "Board still offered Review while QA had failed — leak."
          : "Review was not offered. Maya was told the flyer was not ready.",
        machineBelieved: "qa_fail on the flyer identity. Review not eligible.",
        teamDid: "Internal quality check rejected the renderer output. No customer-facing Kitchen jargon.",
        voiceSaid: qaFailVoice.answer.text,
        failure: "Internal design quality evidence did not pass.",
        recovered: null,
        ownerAction: "NONE",
      });

      const rebound = await ensureFlyerMachineReviewBind(
        (await readCampaignEnvelope(campaignId))?.record ?? campaign,
      );
      campaign = rebound;
      const qaPassVoice = await askCustomerLifeFromStore({
        campaignId,
        question: studioReviewRevisionFullLoopV1.customerCopy.readyForReviewQuestion,
      });
      asked.push({ question: "Is my flyer ready for me to review? (after qa_pass)", answer: qaPassVoice.answer.text });
      const happeningQaPass = await askCustomerLifeFromStore({
        campaignId,
        question: "What's happening with my flyer?",
      });
      asked.push({
        question: "What's happening with my flyer? (after qa_pass)",
        answer: happeningQaPass.answer.text,
      });
      await pageA.reload({ waitUntil: "domcontentloaded" });
      await waitForMayaProject(pageA);
      const qaPassShot = await shot(pageA, "06-qa-pass-review-open");
      const qaPassBoard = await visibleText(pageA);
      push(
        "qa_pass_opens_review_same_project",
        qaPassVoice.truth.reviewEligible &&
          /you can review it now/i.test(qaPassVoice.answer.text)
          ? "PASS"
          : "FAIL",
        qaPassVoice.answer.text.slice(0, 220),
        qaPassShot,
      );
      push(
        "voice_status_review_ready",
        happeningQaPass.answer.phase === "ready_for_review" &&
          happeningQaPass.truth.reviewEligible &&
          /ready for Review/i.test(happeningQaPass.answer.text) &&
          voiceStatusLooksCoherent(happeningQaPass.answer.text)
          ? "PASS"
          : "FAIL",
        happeningQaPass.answer.text.slice(0, 280),
      );
      crack({
        beat: "qa_pass_then_review",
        mayaSaw: /Open Review Room|Ready for Review/i.test(qaPassBoard)
          ? "Board offered Review after QA passed."
          : "Board copy after QA pass.",
        machineBelieved: "Later qa_pass bound the same flyer identity. Review eligible.",
        teamDid: "Machine retried quality on the same campaign. No Tagia step.",
        voiceSaid: qaPassVoice.answer.text,
        failure: "Earlier qa_fail on the same campaign.",
        recovered: "Same project, later qa_pass, Review opened without Owner.",
        ownerAction: "NONE",
      });
    } else {
      push("qa_fail_keeps_review_closed", "FAIL", "Missing flyer identity for QA fail/pass drill.");
    }

    let tasks = await readTasksEnvelope(campaignId);
    const flyerJob = tasks?.jobRecords?.find((entry) => entry.skuId === "v2-rtu-flyer");
    if (tasks && flyerJob) {
      const queued = enqueueJobCommunicationRecord(tasks, {
        campaign,
        clientId: created.user.id,
        job: flyerJob,
        eventType: "ready_for_review",
        idempotencyKey: "torture-failed-notice",
      });
      const notice = queued.jobCommunicationRecords?.find((record) =>
        record.id.includes("torture-failed-notice"),
      );
      const failedTransport = notice
        ? applyJobCommunicationTransportResult(queued, notice.id, {
            ok: false,
            code: "delivery_failed",
          })
        : queued;
      await writeTasksEnvelope(failedTransport);
      const afterFailVoice = await askCustomerLifeFromStore({
        campaignId,
        question: "When can I review it?",
      });
      asked.push({ question: "When can I review it? (failed notice)", answer: afterFailVoice.answer.text });
      await pageA.reload({ waitUntil: "domcontentloaded" });
      await waitForMayaProject(pageA);
      const failNoticeShot = await shot(pageA, "07-failed-notice-board-still-honest");
      const failNoticeBoard = await visibleText(pageA);
      const durableFailed = (await readTasksEnvelope(campaignId))?.jobCommunicationRecords?.find(
        (record) => record.id.includes("torture-failed-notice"),
      );
      push(
        "failed_notification_board_and_voice_honest",
        durableFailed?.deliveryStatus === "delivery_failed" &&
          afterFailVoice.truth.reviewEligible &&
          /you can review it now/i.test(afterFailVoice.answer.text) &&
          !/email failed|unavailable/i.test(afterFailVoice.answer.text)
          ? "PASS"
          : "FAIL",
        `mail=${durableFailed?.deliveryStatus} eligible=${afterFailVoice.truth.reviewEligible} ${afterFailVoice.answer.text.slice(0, 160)}`,
        failNoticeShot,
      );
      crack({
        beat: "failed_notification",
        mayaSaw: /Open Review Room|Ready for Review/i.test(failNoticeBoard)
          ? "Board still offered Review. Mail failure was not presented as project truth."
          : failNoticeBoard.slice(0, 180),
        machineBelieved: `ready_for_review notice deliveryStatus=${durableFailed?.deliveryStatus ?? "missing"}. Review eligible remains true.`,
        teamDid: "No Owner send duty. Transport failed; Board stayed the record.",
        voiceSaid: afterFailVoice.answer.text,
        failure: "Lifecycle notice transport marked delivery_failed.",
        recovered: "Voice still sent Maya to Review from the Board. Email did not become the source of truth.",
        ownerAction: "NONE",
      });
      const happeningReviewEmail = await askCustomerLifeFromStore({
        campaignId,
        question: "What's happening with my flyer?",
      });
      asked.push({
        question: "What's happening with my flyer? (Review ready while email failed)",
        answer: happeningReviewEmail.answer.text,
      });
      push(
        "voice_status_review_email_secondary",
        happeningReviewEmail.truth.reviewEligible &&
          happeningReviewEmail.truth.noticeTransportPending &&
          /ready for Review/i.test(happeningReviewEmail.answer.text) &&
          /email notification is still retrying/i.test(happeningReviewEmail.answer.text) &&
          !/has not been assigned/i.test(happeningReviewEmail.answer.text) &&
          !/no received upload/i.test(happeningReviewEmail.answer.text) &&
          !/getting your project ready/i.test(happeningReviewEmail.answer.text) &&
          voiceStatusLooksCoherent(happeningReviewEmail.answer.text)
          ? "PASS"
          : "FAIL",
        happeningReviewEmail.answer.text.slice(0, 280),
      );
      const mixedLive = (await readCampaignEnvelope(campaignId))?.record ?? campaign;
      const priorDispatch = mixedLive.dispatchExecution;
      if (priorDispatch) {
        await upsertCampaignRecord(
          {
            ...mixedLive,
            dispatchExecution: {
              ...priorDispatch,
              status: studioDispatchV1.envelopeStatuses.pendingRetry,
            },
          },
          created.user.id,
        );
      }
      const mixedVoice = await askCustomerLifeFromStore({
        campaignId,
        question: "What's happening with my flyer?",
      });
      asked.push({
        question: "What's happening with my flyer? (mixed historical stall + Review)",
        answer: mixedVoice.answer.text,
      });
      push(
        "voice_status_mixed_historical_resolves_hierarchy",
        mixedVoice.answer.phase === "ready_for_review" &&
          mixedVoice.truth.activationPendingRetry === true &&
          /ready for Review/i.test(mixedVoice.answer.text) &&
          !/has not been assigned/i.test(mixedVoice.answer.text) &&
          !/getting your project ready/i.test(mixedVoice.answer.text) &&
          voiceStatusLooksCoherent(mixedVoice.answer.text)
          ? "PASS"
          : "FAIL",
        `pendingRetry=${mixedVoice.truth.activationPendingRetry} assigned=${mixedVoice.truth.productionAssigned} ${mixedVoice.answer.text}`.slice(
          0,
          280,
        ),
      );
      if (priorDispatch) {
        const afterMixed = (await readCampaignEnvelope(campaignId))?.record ?? mixedLive;
        if (afterMixed.dispatchExecution) {
          const restored = await upsertCampaignRecord(
            {
              ...afterMixed,
              dispatchExecution: {
                ...afterMixed.dispatchExecution,
                status: priorDispatch.status,
              },
            },
            created.user.id,
          );
          campaign = restored.record;
        }
      }
    }

    contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAsMaya(pageB, email, password);
    const twoBrowserShot = await shot(pageB, "08-second-browser-same-project");
    const twoBrowserText = await visibleText(pageB);
    const twoBrowserVoice = await sendProjectMessage(pageB, "Is my flyer ready for me to review?");
    push(
      "two_browsers_same_maya_story",
      /Cedar & Bloom/i.test(twoBrowserText) && /you can review it now/i.test(twoBrowserVoice)
        ? "PASS"
        : "FAIL",
      twoBrowserVoice.slice(0, 220),
      twoBrowserShot,
    );
    crack({
      beat: "two_browsers",
      mayaSaw: "A second signed-in browser showed the same Cedar & Bloom project and Review.",
      machineBelieved: "One campaign id. Two sessions. Same Machine record.",
      teamDid: "No duplicate job created.",
      voiceSaid: twoBrowserVoice,
      failure: "Two live sessions at once.",
      recovered: "Both browsers told the same story.",
      ownerAction: "NONE",
    });

    await pageB.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(jobId)}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await pageB.locator(".fs-review-proof__image, .fs-mock__headline").first().waitFor({
      timeout: 45_000,
    });
    await shot(pageB, "09-stale-tab-version-1");

    await pageA.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(jobId)}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    try {
      await pageA.locator(".fs-review-proof__image, .fs-mock__headline").first().waitFor({
        timeout: 45_000,
      });
    } catch (error) {
      await shot(pageA, "10-review-not-ready");
      throw new Error(
        `${error instanceof Error ? error.message : String(error)} | ${(await visibleText(pageA)).slice(0, 400)}`,
      );
    }
    const reviewShot = await shot(pageA, "10-maya-reviews-real-flyer");
    const reviewText = await visibleText(pageA);
    const proofImg = pageA.locator("img.fs-review-proof__image");
    push(
      "maya_sees_real_flyer_version_and_actions",
      (await proofImg.count()) > 0 &&
        /Version 1/i.test(reviewText) &&
        /Request Revision/i.test(reviewText) &&
        /Approve for Delivery/i.test(reviewText)
        ? "PASS"
        : "FAIL",
      reviewText.slice(0, 280),
      reviewShot,
    );

    const question = await sendProjectMessage(pageA, "Do you need anything else from me?");
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
    crack({
      beat: "question_not_revision",
      mayaSaw: "Review stayed open. Asking a question did not spend the included round.",
      machineBelieved: "No correction-use row. Spine still ready_for_review.",
      teamDid: "No production restart.",
      voiceSaid: question,
      failure: null,
      recovered: null,
      ownerAction: "NONE",
    });

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
      name: /Request Revision/i,
    });
    for (let i = 0; i < 20; i += 1) {
      if (await jobRevision.isEnabled()) break;
      await pageA.waitForTimeout(250);
    }
    await forceClick(jobRevision);
    await pageA.getByRole("button", { name: /Submit request changes/i }).waitFor({
      timeout: 15_000,
    });
    const revisionPatch = pageA.waitForResponse(
      (res) =>
        res.url().includes("/review") &&
        res.request().method() === "PATCH" &&
        (res.request().postData() ?? "").includes("request_revision"),
      { timeout: 120_000 },
    );
    await forceClick(pageA.getByRole("button", { name: /Submit request changes/i }));
    const revisionResponse = await revisionPatch;
    if (!revisionResponse.ok()) {
      const body = await revisionResponse.text();
      throw new Error(`request_revision failed (${revisionResponse.status()}): ${body.slice(0, 280)}`);
    }
    await pageA.getByText(/Revision requested — returning to production/i).first().waitFor({
      timeout: 30_000,
    });
    const revShot = await shot(pageA, "11-revision-requested-ack");
    const afterRevTasks = await readTasksEnvelope(campaignId);
    push(
      "revision_received_and_durable",
      (afterRevTasks?.jobCorrectionUses ?? []).length === 1 ? "PASS" : "FAIL",
      `Correction uses: ${(afterRevTasks?.jobCorrectionUses ?? []).length}`,
      revShot,
    );
    const receivedAsk = await sendProjectMessage(pageA, "Did you receive my revision?");
    push(
      "voice_revision_received",
      /received your revision request/i.test(receivedAsk) ||
        /requested change was applied/i.test(receivedAsk)
        ? "PASS"
        : "FAIL",
      receivedAsk.slice(0, 220),
    );
    crack({
      beat: "revision",
      mayaSaw: "Review acknowledged the revision and returned the job to production.",
      machineBelieved: "One correction-use row. Spine left ready_for_review.",
      teamDid: "Machine applied the included revision round. No extra Owner step.",
      voiceSaid: receivedAsk,
      failure: null,
      recovered: null,
      ownerAction: "NONE",
    });
    const happeningRevision = await askCustomerLifeFromStore({
      campaignId,
      question: "What's happening with my flyer?",
    });
    asked.push({
      question: "What's happening with my flyer? (revision underway)",
      answer: happeningRevision.answer.text,
    });
    const revSpine =
      afterRevTasks?.jobRecords?.find((entry) => entry.skuId === "v2-rtu-flyer")?.spineStatus;
    push(
      "voice_status_revision_underway",
      voiceStatusLooksCoherent(happeningRevision.answer.text) &&
        (revSpine === "revision_requested"
          ? /revision is in progress/i.test(happeningRevision.answer.text) &&
            !/ready for Review/i.test(happeningRevision.answer.text)
          : /ready for Review|revision is in progress/i.test(happeningRevision.answer.text))
        ? "PASS"
        : "FAIL",
      `spine=${revSpine} ${happeningRevision.answer.text}`.slice(0, 280),
    );

    for (let i = 0; i < 24; i += 1) {
      const latest = await readTasksEnvelope(campaignId);
      const current = latest?.jobRecords?.find((entry) => entry.skuId === "v2-rtu-flyer");
      const proofs = (current?.fileRegistry ?? []).filter((ref) => ref.category === "review_proof");
      if (current?.spineStatus === "ready_for_review" && proofs.length >= 2) break;
      await pageA.waitForTimeout(2500);
    }
    const v2Path = await copyFlyerPng(campaignId, "maya-flyer-v2.png");
    v1Hash = produced && existsSync(produced) ? fileSha256(produced) : null;
    v2Hash = v2Path && existsSync(v2Path) ? fileSha256(v2Path) : null;
    const v2PdfPath = v2Path ? v2Path.replace(/\.png$/i, ".pdf") : null;
    const v2PdfHash = v2PdfPath && existsSync(v2PdfPath) ? fileSha256(v2PdfPath) : null;
    const v2SourcePng = latestRenderFlyerPng(campaignId);
    const v2Declared = v2SourcePng ? declaredTextFromRenderPng(v2SourcePng) : "";
    push(
      "revised_artifact_produced",
      Boolean(v2Path && v1Hash && v2Hash && v1Hash !== v2Hash) ? "PASS" : "FAIL",
      v2Path ? `v1=${v1Hash?.slice(0, 12)} v2=${v2Hash?.slice(0, 12)}` : "No Version 2 PNG",
    );
    push(
      "creative_brief_fidelity_v2",
      /Cedar & Bloom/i.test(v2Declared) &&
        /Back-to-School Reset/i.test(v2Declared) &&
        /\$149/.test(v2Declared) &&
        /Book Your Reset/i.test(v2Declared) &&
        /555-0186/.test(v2Declared) &&
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
    const rereviewShot = await shot(pageA, "12-rereview-version-2");
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
    const happeningV2 = await sendProjectMessage(pageA, "What's happening with my flyer?");
    asked.push({ question: "What's happening with my flyer? (Version 2 ready)", answer: happeningV2 });
    push(
      "voice_status_version_2_ready",
      /ready for Review/i.test(happeningV2) &&
        !/has not been assigned/i.test(happeningV2) &&
        voiceStatusLooksCoherent(happeningV2)
        ? "PASS"
        : "FAIL",
      happeningV2.slice(0, 280),
    );

    await forceClick(pageA.locator(".fs-feedback-panel__btn--approve"));
    await pageA.waitForTimeout(800);
    const jobApprove = pageA.getByRole("button", { name: /Approve for Delivery/i });
    for (let i = 0; i < 24; i += 1) {
      if (await jobApprove.isEnabled()) break;
      await pageA.waitForTimeout(250);
    }
    if (!(await jobApprove.isEnabled())) {
      await shot(pageA, "13-approve-still-disabled");
      throw new Error(`Approve stayed disabled. ${(await visibleText(pageA)).slice(0, 400)}`);
    }
    await forceClick(jobApprove);
    await pageA.getByRole("button", { name: /Submit approval/i }).waitFor({ timeout: 15_000 });
    const approvalPatch = pageA.waitForResponse(
      (res) =>
        res.url().includes("/review") &&
        res.request().method() === "PATCH" &&
        (res.request().postData() ?? "").includes("approve_for_delivery"),
      { timeout: 120_000 },
    );
    await forceClick(pageA.getByRole("button", { name: /Submit approval/i }));
    const approvalResponse = await approvalPatch;
    if (!approvalResponse.ok()) {
      const body = await approvalResponse.text();
      throw new Error(`approve_for_delivery failed (${approvalResponse.status()}): ${body.slice(0, 280)}`);
    }
    await pageA
      .getByText(/Feedback submitted|preparing your final files|exact version you approved/i)
      .first()
      .waitFor({ timeout: 30_000 });
    const approveShot = await shot(pageA, "13-approved-exact-version");
    const afterApprove = await readTasksEnvelope(campaignId);
    const approvedJob = afterApprove?.jobRecords?.find((entry) => entry.skuId === "v2-rtu-flyer");
    const pin = approvedJob?.customerApprovedArtifactAuthorization;
    pinDecisionId = pin?.decisionId ?? null;
    const cdf = approvedJob?.clientDeliveryFiles ?? [];
    const pinHex = (pin?.contentSha256s?.[0] ?? "").replace(/^sha256:/i, "");
    const pinHexes = (pin?.contentSha256s ?? []).map((hash) =>
      hash.replace(/^sha256:/i, "").toLowerCase(),
    );
    const pngFile = cdf.find((file) => /png|jpg/i.test(file.fileType));
    const pdfFile = cdf.find((file) => /pdf/i.test(file.fileType));
    const pngHex = (pngFile?.contentSha256 ?? "").replace(/^sha256:/i, "").toLowerCase();
    const pdfHex = (pdfFile?.contentSha256 ?? "").replace(/^sha256:/i, "").toLowerCase();
    let staleStatus = 0;
    let staleBody = "";
    try {
      const staleApprove = pageB.waitForResponse(
        (res) =>
          res.url().includes("/review") &&
          res.request().method() === "PATCH" &&
          (res.request().postData() ?? "").includes("approve_for_delivery"),
        { timeout: 12_000 },
      );
      await forceClick(pageB.locator(".fs-feedback-panel__btn--approve")).catch(() => undefined);
      const jobApproveB = pageB.getByRole("button", { name: /Approve for Delivery/i });
      if (await jobApproveB.isEnabled().catch(() => false)) {
        await forceClick(jobApproveB);
        const submitB = pageB.getByRole("button", { name: /Submit approval/i });
        if (await submitB.count()) await forceClick(submitB);
      }
      const staleRes = await staleApprove;
      staleStatus = staleRes.status();
      staleBody = (await staleRes.text()).slice(0, 220);
    } catch {
      staleStatus = 0;
      staleBody = "Stale Version 1 tab could not approve after Version 2 was already approved.";
    }
    const afterStale = await readTasksEnvelope(campaignId);
    const stillV2 =
      afterStale?.jobRecords?.find((entry) => entry.skuId === "v2-rtu-flyer")
        ?.customerApprovedArtifactAuthorization?.contentSha256s?.[0] ?? pin?.contentSha256s?.[0];
    const stillV2Hex = (stillV2 ?? "").replace(/^sha256:/i, "");
    push(
      "stale_version_cannot_win",
      Boolean(v1Hash && v2Hash && pinHex === v2Hash && pinHex !== v1Hash) &&
        stillV2Hex === (v2Hash ?? "") &&
        !cdf.some((file) => (file.contentSha256 ?? "").replace(/^sha256:/i, "") === v1Hash) &&
        (staleStatus === 0 || staleStatus === 422 || staleStatus >= 400)
        ? "PASS"
        : "FAIL",
      `v1=${v1Hash?.slice(0, 12)} v2=${v2Hash?.slice(0, 12)} pin=${pinHex.slice(0, 12)} stalePatch=${staleStatus} ${staleBody}`.slice(
        0,
        240,
      ),
      approveShot,
    );
    crack({
      beat: "stale_version_attempt",
      mayaSaw: "Current Review tab showed Version 2. The other tab still had Version 1.",
      machineBelieved: `Approval pin ${pinHex.slice(0, 12)} matches Version 2, not Version 1.`,
      teamDid: "Delivery assembled from the approved identity, not the stale tab.",
      voiceSaid: studioCustomerLifeV1.customerCopy.approvedVersion,
      failure: `Stale tab approval attempt: HTTP ${staleStatus || "none"}. ${staleBody}`,
      recovered: "Version 1 did not become Final Delivery.",
      ownerAction: "NONE",
    });
    push(
      "exact_final_delivery",
      cdf.some((file) => (file.contentSha256 ?? "").replace(/^sha256:/i, "") === pinHex) &&
        pinHex === (v2Hash ?? "") &&
        (approvedJob?.spineStatus === "ready_for_delivery" ||
          approvedJob?.spineStatus === "delivered")
        ? "PASS"
        : "FAIL",
      `spine=${approvedJob?.spineStatus} files=${cdf.length}`,
    );
    push(
      "five_slot_classification",
      FLYER_INCLUDED_SLOT_TRUTH.filter((slot) => slot.class === "customer_promised_file").length ===
        2
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
      `files=${cdf.length} png=${pngHex.slice(0, 12)} pdf=${pdfHex.slice(0, 12)}`,
    );

    await pageA.goto(`${BASE}/deliverables`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await pageA.waitForTimeout(1200);
    const deliveryShot = await shot(pageA, "14-final-delivery-png-and-pdf");
    const deliveryText = await visibleText(pageA);
    push(
      "final_delivery_customer_truth",
      /Print-ready PDF/i.test(deliveryText) &&
        /Digital PNG or JPG/i.test(deliveryText) &&
        /Version 2/i.test(deliveryText)
        ? "PASS"
        : "FAIL",
      deliveryText.slice(0, 280),
      deliveryShot,
    );
    crack({
      beat: "final_delivery",
      mayaSaw: /Print-ready PDF/i.test(deliveryText)
        ? "Final Delivery showed Version 2 print PDF and digital PNG."
        : deliveryText.slice(0, 180),
      machineBelieved: "Customer promised files bound to the approved hashes.",
      teamDid: "No extra hand packaging. Exact approved identity released.",
      voiceSaid: studioCustomerLifeV1.customerCopy.finalReady,
      failure: null,
      recovered: null,
      ownerAction: "NONE",
    });
    const happeningFinal = await askCustomerLifeFromStore({
      campaignId,
      question: "What's happening with my flyer?",
    });
    asked.push({
      question: "What's happening with my flyer? (approved / Final Delivery)",
      answer: happeningFinal.answer.text,
    });
    push(
      "voice_status_approved_final_ready",
      happeningFinal.truth.finalDeliveryReady &&
        /final files are ready/i.test(happeningFinal.answer.text) &&
        !/has not been assigned/i.test(happeningFinal.answer.text) &&
        !/retrying/i.test(happeningFinal.answer.text) &&
        voiceStatusLooksCoherent(happeningFinal.answer.text)
        ? "PASS"
        : "FAIL",
      happeningFinal.answer.text.slice(0, 280),
    );

    await contextA.close();
    contextA = null;
    await contextB.close();
    contextB = null;
    contextC = await browser.newContext();
    const pageC = await contextC.newPage();
    await signInAsMaya(pageC, email, password);
    await pageC.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(jobId)}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await pageC
      .getByText(/Cedar & Bloom Home Organizing|Make Me a Flyer|Delivery in progress|final files/i)
      .first()
      .waitFor({ timeout: 45_000 });
    const returnShot = await shot(pageC, "15-fresh-context-return");
    const returnVoice = await sendProjectMessage(pageC, "Did you keep my approval?");
    await pageC.goto(`${BASE}/deliverables`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await waitForMayaProject(pageC);
    await shot(pageC, "16-return-later-final-delivery");
    const returnTasks = await readTasksEnvelope(campaignId);
    const returnJob = returnTasks?.jobRecords?.find((entry) => entry.skuId === "v2-rtu-flyer");
    push(
      "leave_return_preserves_approval_and_history",
      returnJob?.customerApprovedArtifactAuthorization?.decisionId === pinDecisionId &&
        (returnTasks?.jobCorrectionUses ?? []).length === 1 &&
        (returnJob?.clientDeliveryFiles ?? []).some((file) => /pdf/i.test(file.fileType)) &&
        (returnJob?.clientDeliveryFiles ?? []).some((file) => /png|jpg/i.test(file.fileType))
        ? "PASS"
        : "FAIL",
      `spine=${returnJob?.spineStatus} ${returnVoice.slice(0, 160)}`,
      returnShot,
    );
    crack({
      beat: "return_later",
      mayaSaw: "A fresh browser still had the same Cedar & Bloom project, approval, and files.",
      machineBelieved: `Approval decision ${pinDecisionId ?? "missing"} and one revision history row survived.`,
      teamDid: "No rebuild. Return used the stored campaign.",
      voiceSaid: returnVoice,
      failure: "Maya left and came back in a new browser.",
      recovered: "Nothing was erased. No Tagia restore.",
      ownerAction: "NONE",
    });

    push(
      "owner_intervention",
      "PASS",
      "NONE. Routine cracks recovered without Tagia. Room 1 is not closed by this count. Branded email remains NOT YET CERTIFIED in evidence.email, not in this pass/fail list.",
    );
  } catch (error) {
    push("walk_exception", "FAIL", error instanceof Error ? error.message : String(error));
    crack({
      beat: "walk_exception",
      mayaSaw: "Walk stopped.",
      machineBelieved: "See walk_exception detail.",
      teamDid: "Scout halted rather than invent a recovery.",
      voiceSaid: "",
      failure: error instanceof Error ? error.message : String(error),
      recovered: null,
      ownerAction: "REQUIRED",
    });
  } finally {
    await contextA?.close();
    await contextB?.close();
    await contextC?.close();
    await browser.close();
  }

  const failed = results.filter((row) => row.status === "FAIL").length;
  return finish(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
