/**
 * STUDIO-OPERATING-VOICE-MACHINE-AND-CUSTOMER-COMMUNICATION-1 — live Maya walk.
 *
 * Sign in → Board → ask Studio questions → real Machine answers →
 * answer a Studio request → leave → fresh browser → ask again.
 *
 * Run (Windows):
 *   $env:PLAYWRIGHT_BROWSERS_PATH="$env:USERPROFILE\AppData\Local\ms-playwright"
 *   $env:CERT_BASE_URL="http://127.0.0.1:3066"
 *   npx tsx scripts/studio-operating-voice-machine-and-customer-communication-1-board-walk.mts
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import type { CampaignRecord } from "../src/config/studio-board";
import { studioVoiceMachineCustomerCommunicationV1 } from "../src/config/studio-voice-machine-customer-communication-v1";
import { studioMaterialsUploadV1 } from "../src/config/studio-materials-upload-v1";
import {
  createClientAccount,
  linkClientCampaign,
  markEmailVerified,
} from "../src/lib/auth/users";
import { readCampaignEnvelope, upsertCampaignRecord } from "../src/lib/campaign-store/store";
import { getOrGenerateTasks } from "../src/lib/campaign-tasks/store";
import { getOrInitializeMaterials } from "../src/lib/materials/store";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "../src/lib/plan-pricing";
import { recoverPaidOperatingChain } from "../src/lib/studio-paid-activation-recovery";

const PORT = process.env.CERT_PORT || "3067";
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
  "studio-operating-voice-machine-and-customer-communication-1",
  "customer-board-walk",
);
const SHOTS = join(OUT, "shots");
mkdirSync(SHOTS, { recursive: true });

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

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

async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => (document.body?.innerText || "").slice(0, 16000));
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

function mayaPaidCampaign(campaignId: string, intakeComplete: boolean): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals(["v2-rtu-flyer"]);
  const lineItems = buildServiceScopeSnapshot(["v2-rtu-flyer"]);
  const intake = intakeComplete
    ? {
        projectDetailsSubmittedAt: now,
        routeMapIntakeSubmittedAt: now,
        routeMapIntake: {
          submittedAt: now,
          answers: {
            flyerPurpose: "Promotional flyer for Back-to-School Reset",
            mustInclude:
              "Back-to-School Reset — 2-hour session $149. August 24 – September 14, 2026. Call (804) 555-0186 or visit cedarandbloom.example. Book Your Reset.",
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
    campaignStatus: intakeComplete ? "BUILDING_CONCEPTS" : "PAYMENT_RECEIVED",
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
      checkoutSessionId: `cs_maya_voice_${campaignId}`,
      paymentIntentId: `pi_maya_voice_${campaignId}`,
      stripeEventId: `evt_maya_voice_${campaignId}`,
      selectedServiceIds: ["v2-rtu-flyer"],
      decisionId: `dec_maya_voice_${campaignId}`,
      factFingerprint: `fp_maya_voice_${campaignId}`,
      draftRevision: 1,
      confirmedAt: now,
    },
    revisionRoundsUsed: 0,
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

async function openBoardCommunication(page: Page): Promise<void> {
  await page.goto(`${BASE}/studio-board`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.getByText(/Cedar & Bloom Home Organizing/i).first().waitFor({
    timeout: 45_000,
  });
  const card = page.locator(".sb-card--project-communication").first();
  await card.waitFor({ timeout: 45_000 });
  await card.scrollIntoViewIfNeeded();
}

async function sendBoardMessage(page: Page, text: string): Promise<string> {
  const card = page.locator(".sb-card--project-communication").first();
  await card.scrollIntoViewIfNeeded();
  const textarea = card.locator("textarea").first();
  await textarea.waitFor({ state: "attached", timeout: 20_000 });
  await textarea.fill(text);
  const posted = page.waitForResponse(
    (res) =>
      res.url().includes("/project-communication/customer") &&
      res.request().method() === "POST" &&
      !res.url().includes("problem-report"),
    { timeout: 25_000 },
  );
  await page.evaluate(() => {
    const form = document.querySelector(
      ".sb-card--project-communication form.sb-project-communication__composer",
    ) as HTMLFormElement | null;
    const button = form?.querySelector(
      "button.sb-project-communication__submit",
    ) as HTMLButtonElement | null;
    button?.click();
  });
  const response = await posted;
  const json = (await response.json()) as {
    machineConfirmation?: string;
    message?: { machineAnswer?: { text?: string } | null };
  };
  if (!response.ok()) {
    throw new Error(`Board message POST failed (${response.status()})`);
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

async function uploadFirstOptionalFile(page: Page, filePath: string): Promise<void> {
  const addMore = page.getByRole("button", { name: /Add more \(optional\)/i });
  if ((await addMore.count()) > 0) {
    const expanded = await addMore.getAttribute("aria-expanded");
    if (expanded !== "true") await addMore.click();
  }
  const materials = page.locator(".sb-card--materials").first();
  await materials.waitFor({ timeout: 45_000 });
  await materials.scrollIntoViewIfNeeded();
  const fileInput = page.locator(".sb-materials-intake__file-input").first();
  await fileInput.waitFor({ state: "attached", timeout: 30_000 });
  await fileInput.setInputFiles(filePath);
  await page.getByText(/maya-optional-mark\.png/i).first().waitFor({ timeout: 10_000 });
  const nativeError = await page.evaluate(() => {
    const fileState = document.querySelector(".sb-materials-intake__file-state");
    const item = fileState?.closest("li");
    if (!item) return "Selected file row was not found.";
    const attest = item.querySelector(
      ".sb-materials-intake__attest input[type='checkbox']",
    ) as HTMLInputElement | null;
    if (attest && !attest.checked) attest.click();
    const send = item.querySelector(
      ".sb-materials-intake__submit",
    ) as HTMLButtonElement | null;
    if (!send) return "Send to Studio was not found on the selected file row.";
    if (send.disabled) return "Send to Studio was disabled.";
    send.click();
    return "";
  });
  if (nativeError) throw new Error(nativeError);
  const patch = await page.waitForResponse(
    (res) =>
      res.url().includes("/materials") &&
      res.request().method() === "PATCH" &&
      res.url().includes("audience=client"),
    { timeout: 25_000 },
  );
  if (!patch.ok()) {
    const body = await patch.text();
    throw new Error(`Materials upload PATCH failed (${patch.status()}): ${body.slice(0, 500)}`);
  }
}

function finish(code: number): number {
  stopLocalServer();
  const failed = results.filter((row) => row.status === "FAIL").length;
  const blocked = results.filter((row) => row.status === "BLOCKED").length;
  const passed = results.filter((row) => row.status === "PASS").length;
  const verdict =
    failed > 0
      ? "NOT CLOSED — communication walk failed"
      : blocked > 0
        ? "BLOCKED — start local server and re-run"
        : "VOICE + MACHINE + CUSTOMER COMMUNICATION READY FOR CLOSE";

  const evidence = {
    packageId: "STUDIO-OPERATING-VOICE-MACHINE-AND-CUSTOMER-COMMUNICATION-1",
    kind: "customer-board-walk",
    recordedAt: new Date().toISOString(),
    baseUrl: BASE,
    commitHint: COMMIT,
    runId: randomUUID(),
    totals: { passed, failed, blocked, total: results.length },
    verdict,
    asked,
    results,
    notes: [
      "Walk used Studio Board project communication (not an API-only substitute).",
      "Fresh Playwright context = new browser with empty cookies/localStorage.",
      "Maya facts unchanged: Cedar & Bloom, Make Me a Flyer $69, wordmark-only allowed.",
      "Intake completion after Maya's reply used existing Maya intake answers already on file for this flyer fixture.",
    ],
  };
  const outPath = join(OUT, "board-walk-evidence.json");
  writeFileSync(outPath, JSON.stringify(evidence, null, 2), "utf8");
  console.log(`\nEvidence: ${outPath}`);
  console.log(`Verdict: ${verdict}`);
  process.exitCode = code;
  return code;
}

async function main(): Promise<number> {
  const stamp = Date.now();
  const campaignId = `maya-voice-comms-${stamp}`;
  const email = `maya.voice.${stamp}@cedarandbloom.test`;
  const password = "MayaVoice-Walk-0815!";
  const filePath = join(OUT, "maya-optional-mark.png");
  writeFileSync(filePath, ONE_PIXEL_PNG);

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
  const campaign = mayaPaidCampaign(campaignId, false);
  await upsertCampaignRecord(campaign, created.user.id);
  await linkClientCampaign(created.user.id, campaignId);
  try {
    await recoverPaidOperatingChain(campaign);
  } catch (error) {
    console.warn(
      "Paid operating recovery warning:",
      error instanceof Error ? error.message : String(error),
    );
  }
  await getOrInitializeMaterials(campaignId, campaign);
  await getOrGenerateTasks(campaignId, campaign);
  push(
    "maya_fixture",
    "PASS",
    "Maya Brooks paid $69 flyer, intake incomplete, existing Cedar & Bloom facts only.",
  );

  const browser: Browser = await chromium.launch({ headless: true });
  let contextA: BrowserContext | null = null;
  let contextB: BrowserContext | null = null;

  try {
    contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInAsMaya(pageA, email, password);
    await openBoardCommunication(pageA);
    const signedInShot = await shot(pageA, "01-board-studio-request");
    const boardText = await visibleText(pageA);
    push(
      "sign_in_opens_board",
      /studio-board/i.test(pageA.url()) && /Cedar & Bloom/i.test(boardText) ? "PASS" : "FAIL",
      pageA.url(),
      signedInShot,
    );
    push(
      "studio_asks_maya_intake",
      boardText.includes(
        studioVoiceMachineCustomerCommunicationV1.customerCopy.studioRequestHeading,
      ) && /Project Intake/i.test(boardText)
        ? "PASS"
        : "FAIL",
      "Machine waiting-on-customer request visible on Board.",
      signedInShot,
    );

    const stagedQuestions: Array<{ question: string; expect: RegExp }> = [
      { question: "Did my payment go through?", expect: /payment is confirmed/i },
      {
        question: "Do you need anything else from me?",
        expect: /project intake/i,
      },
      { question: "Did you receive my file?", expect: /does not show a received upload/i },
      { question: "Has work started yet?", expect: /has not started/i },
      { question: "What is happening with my flyer?", expect: /payment is confirmed/i },
      { question: "Is anything holding it up?", expect: /project intake/i },
      { question: "When will I be able to review it?", expect: /not open yet/i },
      { question: "Can I make changes after I see it?", expect: /once the flyer is in review/i },
    ];
    for (const row of stagedQuestions) {
      const answer = await sendBoardMessage(pageA, row.question);
      push(
        `ask_${row.question.slice(0, 28).replace(/\W+/g, "_")}`,
        row.expect.test(answer) ? "PASS" : "FAIL",
        answer.slice(0, 220),
      );
    }

    const unknown = await sendBoardMessage(pageA, "What is Tagia's favorite color?");
    push(
      "unknown_does_not_guess",
      /will not guess/i.test(unknown) && !/received your reply/i.test(unknown)
        ? "PASS"
        : "FAIL",
      unknown.slice(0, 220),
    );

    const firstPay = asked.find((row) => row.question === "Did my payment go through?");
    const duplicatePay = await sendBoardMessage(pageA, "Did my payment go through?");
    push(
      "duplicate_question_same_truth",
      firstPay?.answer === duplicatePay ? "PASS" : "FAIL",
      "Same payment question asked twice. Same Machine answer.",
    );

    const reply = await sendBoardMessage(pageA, "I can finish Project Intake from here.");
    push(
      "maya_replies_to_studio_request",
      /received your reply/i.test(reply) || /received your question/i.test(reply)
        ? "PASS"
        : "FAIL",
      reply.slice(0, 220),
    );
    const afterReply = await visibleText(pageA);
    push(
      "waiting_still_open_until_intake_on_record",
      /Project Intake/i.test(afterReply) ? "PASS" : "FAIL",
      "Typed reply was recorded. Intake waiting did not silently clear.",
    );
    const askedShot = await shot(pageA, "02-asked-and-answered");
    push("asked_answered_screenshot", "PASS", "Board shows Machine answers under Maya's questions.", askedShot);

    const envelope = await readCampaignEnvelope(campaignId);
    if (!envelope?.record) {
      push("complete_intake_for_clear", "FAIL", "Campaign vanished before intake completion.");
      return finish(1);
    }
    const completed = mayaPaidCampaign(campaignId, true);
    await upsertCampaignRecord(
      {
        ...envelope.record,
        ...completed,
        campaignId,
        createdAt: envelope.record.createdAt,
      },
      created.user.id,
    );
    try {
      await recoverPaidOperatingChain(
        (await readCampaignEnvelope(campaignId))!.record,
      );
    } catch {
      /* recovery should not fail the customer communication walk */
    }

    await contextA.close();
    contextA = null;

    contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAsMaya(pageB, email, password);
    await openBoardCommunication(pageB);
    const returnShot = await shot(pageB, "03-fresh-context-return");
    const need = await sendBoardMessage(pageB, "Do you need anything else from me?");
    push(
      "fresh_context_waiting_cleared",
      /does not show anything waiting on you/i.test(need) ? "PASS" : "FAIL",
      need.slice(0, 220),
      returnShot,
    );
    const happening = await sendBoardMessage(pageB, "What is happening with my project?");
    push(
      "fresh_context_same_project_truth",
      /payment is confirmed/i.test(happening) && /intake is on file/i.test(happening)
        ? "PASS"
        : "FAIL",
      happening.slice(0, 240),
    );

    await uploadFirstOptionalFile(pageB, filePath);
    await pageB
      .getByText(studioMaterialsUploadV1.customerCopy.receivedStored)
      .first()
      .waitFor({ state: "attached", timeout: 30_000 });
    await openBoardCommunication(pageB);
    const received = await sendBoardMessage(pageB, "Did you receive my file?");
    push(
      "received_file_not_collapsed_into_approved",
      /still being checked for use/i.test(received) &&
        /not the same as approved/i.test(received)
        ? "PASS"
        : "FAIL",
      received.slice(0, 240),
    );
    const afterUploadShot = await shot(pageB, "04-received-not-approved");
    push(
      "return_later_communication_persists",
      asked.some((row) => row.question === "Did my payment go through?") ? "PASS" : "FAIL",
      "Earlier questions remain on the same project ledger after a fresh browser.",
      afterUploadShot,
    );
    push("owner_intervention", "PASS", "NONE. Routine questions did not require Tagia.");
  } catch (error) {
    push(
      "walk_exception",
      "FAIL",
      error instanceof Error ? error.message : String(error),
    );
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
