/**
 * STUDIO-OPERATING-ROOM-3-OWNER-CONSOLE-TRUTH-AND-DECISION-DESK-AUDIT-1
 * Owner-eyes walk: open Console → see judgment item → understand why →
 * decide once → durable result → leave → return → decision stuck.
 *
 * Safe fixtures. Does not create a Stripe charge. Does not reopen Resend.
 *
 *   $env:PLAYWRIGHT_BROWSERS_PATH="$env:USERPROFILE\AppData\Local\ms-playwright"
 *   $env:CERT_BASE_URL="http://127.0.0.1:3066"
 *   $env:SESSION_SECRET="materials-upload-board-walk-ephemeral-not-for-production"
 *   npx tsx scripts/studio-operating-room-3-owner-console-truth-and-decision-desk-audit-1-walk.mts
 */
import { chromium, type Page } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import type { CampaignRecord } from "../src/config/studio-board";
import {
  createClientAccount,
  linkClientCampaign,
  markEmailVerified,
} from "../src/lib/auth/users";
import { upsertCampaignRecord } from "../src/lib/campaign-store/store";
import {
  applyClientSubmitRefundRequest,
  withSyncedJobRecordsForRefund,
} from "../src/lib/campaign-tasks/refund-request-actions";
import { getOrGenerateTasks, writeTasksEnvelope } from "../src/lib/campaign-tasks/store";
import { getOrInitializeMaterials } from "../src/lib/materials/store";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "../src/lib/plan-pricing";
import { buildJobId } from "../src/lib/job-control/lane-map";
import { enqueueJobCommunicationRecord } from "../src/lib/job-control/communication";
import { OWNER_CONSOLE_ROUTE } from "../src/config/owner-console";

const PORT = process.env.CERT_PORT || "3066";
const EXTERNAL_BASE = (process.env.CERT_BASE_URL || "").replace(/\/$/, "");
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "materials-upload-board-walk-ephemeral-not-for-production";

const OUT = join(
  process.cwd(),
  "docs",
  "launch",
  "studio-operating-room-3-owner-console-truth-and-decision-desk-audit-1",
  "owner-walk",
);
const SHOTS = join(OUT, "shots");
mkdirSync(SHOTS, { recursive: true });

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const SKU = "v2-rtu-flyer" as const;

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

async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => (document.body?.innerText || "").replace(/\s+/g, " ").trim());
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
    env: { ...process.env, SESSION_SECRET, NEXT_PUBLIC_SITE_URL: base },
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  const ready = await waitForServer(base, 90);
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

async function ensureServer(): Promise<string> {
  const preferred = EXTERNAL_BASE || `http://127.0.0.1:${PORT}`;
  if (await waitForServer(preferred, EXTERNAL_BASE ? 20 : 8)) {
    push("dev_server_available", "PASS", `${preferred} (existing)`);
    return preferred;
  }
  if (EXTERNAL_BASE) {
    push("dev_server_available", "BLOCKED", `No server at ${EXTERNAL_BASE}`);
    throw new Error("blocked");
  }
  const started = await startLocalServer();
  push("dev_server_available", "PASS", `${started} (started)`);
  return started;
}

function paidCampaign(campaignId: string, campaignName: string): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals([SKU]);
  const lineItems = buildServiceScopeSnapshot([SKU]);
  return {
    campaignId,
    campaignName,
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Back-to-School Reset flyer",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      confirmedAmountCents: 6900,
      checkoutSessionId: `cs_${campaignId}`,
      selectedServiceIds: [SKU],
      decisionId: `dec_${campaignId}`,
      factFingerprint: `fp_${campaignId}`,
      draftRevision: 1,
      confirmedAt: now,
    },
    revisionRoundsUsed: 0,
    revisionRoundsIncluded: 1,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: [SKU],
      includedServiceIds: [SKU],
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

async function seedRoutine(userId: string, campaignId: string, campaignName: string): Promise<void> {
  const record = paidCampaign(campaignId, campaignName);
  await upsertCampaignRecord(record, userId);
  const materials = await getOrInitializeMaterials(campaignId, record);
  const tasks = await getOrGenerateTasks(campaignId, record);
  const synced = withSyncedJobRecordsForRefund(tasks, record, materials.items ?? []);
  const job = synced.jobRecords?.[0];
  if (!job) throw new Error("Routine job missing after sync");
  const withNotice = enqueueJobCommunicationRecord(synced, {
    campaign: record,
    clientId: userId,
    job,
    eventType: "payment_received",
    occurredAt: record.paymentReceivedAt,
    idempotencyKey: record.paymentReceivedAt,
  });
  await writeTasksEnvelope(withNotice);
}

async function seedRefund(userId: string, campaignId: string, campaignName: string): Promise<string> {
  const record = paidCampaign(campaignId, campaignName);
  await upsertCampaignRecord(record, userId);
  const materials = await getOrInitializeMaterials(campaignId, record);
  const tasks = await getOrGenerateTasks(campaignId, record);
  const synced = withSyncedJobRecordsForRefund(tasks, record, materials.items ?? []);
  const waiting = {
    ...synced,
    jobRecords: (synced.jobRecords ?? []).map((job) => ({
      ...job,
      spineStatus: "waiting_on_client" as const,
    })),
  };
  const jobId = waiting.jobRecords?.[0]?.jobId ?? buildJobId(campaignId, SKU);
  const submitted = applyClientSubmitRefundRequest(
    waiting,
    {
      jobId,
      reason: "The project stalled and I need to stop. Please refund this flyer.",
      requestedOutcome: "Full refund",
      sourceChannel: "studio_board_help",
    },
    {
      id: userId,
      email: "room3-owner-walk@local.dev",
      displayName: "Maya Brooks",
      roles: ["client"],
    },
  );
  if (!submitted.ok) throw new Error(submitted.error);
  await writeTasksEnvelope(submitted.envelope);
  return jobId;
}

async function signIn(page: Page, email: string, password: string, waitFor: RegExp): Promise<void> {
  await page.goto(`${BASE}/sign-in?from=/studio-board`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.locator("form.utility-form").waitFor({ timeout: 30_000 });
  await page.locator('form.utility-form input[type="email"]').fill(email);
  await page.locator("form.utility-form .utility-password__input").fill(password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  try {
    await page.waitForURL((url) => url.pathname.includes("/studio-board"), {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    });
  } catch {
    const login = await page.request.post(`${BASE}/api/auth/login`, {
      data: { email, password },
      headers: { "Content-Type": "application/json" },
    });
    if (!login.ok()) throw new Error(`Login API ${login.status()}`);
    await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  }
  await page.getByText(waitFor).first().waitFor({ timeout: 45_000 }).catch(() => undefined);
}

async function openOwnerConsole(page: Page): Promise<void> {
  await page.goto(`${BASE}${OWNER_CONSOLE_ROUTE}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  try {
    await page
      .getByText(/Today's Desk|Your desk is clear|File Room|Good (morning|afternoon|evening)/i)
      .first()
      .waitFor({ timeout: 90_000 });
  } catch (error) {
    const url = page.url();
    const text = await visibleText(page);
    await shot(page, "00-owner-console-timeout");
    throw new Error(`Owner Console did not load. url=${url} text=${text.slice(0, 500)}`);
  }
}

async function openRefundFolder(page: Page, refundName: string): Promise<boolean> {
  const body = await visibleText(page);
  const onRefundClosedFolder =
    body.toLowerCase().includes(refundName.toLowerCase()) &&
    /Refund decision — Make Me a Flyer/i.test(body);

  if (!onRefundClosedFolder) {
    const decisions = page.getByRole("button", { name: /Decisions/i }).first();
    if ((await decisions.count()) > 0) await decisions.click();
    const folder = page
      .locator(".fr-owner-sequential__cabinet-folder")
      .filter({ hasText: refundName })
      .first();
    if ((await folder.count()) === 0) return false;
    await folder.click();
    await page.getByRole("button", { name: /Back to desk/i }).waitFor({ state: "hidden", timeout: 8_000 }).catch(() => undefined);
  }

  const review = page.locator(".fr-owner-sequential__folder-closed .utility-btn--primary").first();
  await review.waitFor({ state: "visible", timeout: 15_000 });
  await review.click();
  await page.getByRole("button", { name: /Close Folder/i }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: /Approve refund/i }).waitFor({ timeout: 15_000 });
  const openText = (await visibleText(page)).toLowerCase();
  return openText.includes(refundName.toLowerCase());
}

async function main(): Promise<number> {
  BASE = await ensureServer();
  const stamp = randomUUID().slice(0, 8);
  const clientEmail = `room3-owner-walk-${stamp}@local.dev`;
  const created = await createClientAccount({
    email: clientEmail,
    password: "dev-only",
    displayName: "Maya Brooks",
  });
  if (!created.ok) throw new Error(created.message);
  await markEmailVerified(created.user.id);
  const routineName = `Room 3 Routine ${stamp}`;
  const refundName = `Room 3 Refund ${stamp}`;
  const routineId = `room3-s1-routine-${stamp}`;
  const refundId = `room3-s1-refund-${stamp}`;
  await seedRoutine(created.user.id, routineId, routineName);
  await seedRefund(created.user.id, refundId, refundName);
  await linkClientCampaign(created.user.id, routineId);
  await linkClientCampaign(created.user.id, refundId);
  push("fixtures_seeded", "PASS", `${routineName} + ${refundName}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("dialog", (dialog) => void dialog.accept());

  try {
    await signIn(page, OWNER_LOGIN.email, OWNER_LOGIN.password, /Studio Board|File Room|Cedar/i);
    await page.request.post(`${BASE}/api/auth/login`, {
      data: OWNER_LOGIN,
      headers: { "Content-Type": "application/json" },
    });
    await openOwnerConsole(page);
    let text = await visibleText(page);
    const openShot = await shot(page, "01-owner-console-open");
    push(
      "open_console",
      /Owner Console|Today's Desk/i.test(text) ? "PASS" : "FAIL",
      text.slice(0, 180),
      openShot,
    );
    push(
      "stale_squishy_language",
      /squishy says/i.test(text) ? "FAIL" : "PASS",
      /squishy says/i.test(text) ? "Squishy says still on desk" : "Desk briefing / Studio",
    );
    push(
      "stale_all_campaigns",
      /all campaigns/i.test(text) ? "FAIL" : "PASS",
      /all campaigns/i.test(text) ? "All campaigns still in footer" : "File Room / projects",
    );

    const opened = await openRefundFolder(page, refundName).catch(async (error) => {
      await shot(page, "02-refund-folder-open-failed");
      push("genuine_refund_appears", "FAIL", String(error).slice(0, 240));
      return false;
    });
    await page.waitForTimeout(600);
    text = await visibleText(page);
    const folderShot = await shot(page, "02-refund-folder");
    push(
      "genuine_refund_appears",
      opened &&
        text.toLowerCase().includes(refundName.toLowerCase()) &&
        /Should this work receive a refund/i.test(text)
        ? "PASS"
        : "FAIL",
      text.slice(0, 240),
      folderShot,
    );
    push(
      "noise_routine_payment_not_a_folder",
      text.includes(routineName) && /What you decide/i.test(text)
        ? "FAIL"
        : text.includes("Payment received") && /pending owner send/i.test(text)
          ? "FAIL"
          : "PASS",
      "Routine payment / progress did not become the current Owner folder",
    );
    push(
      "decision_card_context",
      /What you decide/i.test(text) &&
        /Client refund reason/i.test(text) &&
        /Approve refund/i.test(text)
        ? "PASS"
        : "FAIL",
      "Refund card fields",
    );

    const reason = page.locator("#refund-reason");
    if ((await reason.count()) > 0) {
      await reason.fill("Approved on the Owner desk after the customer asked to stop.");
    }
    const approve = page.getByRole("button", { name: /Approve refund/i }).first();
    if ((await approve.count()) === 0) {
      push("owner_approves_refund", "FAIL", "Approve refund button missing");
    } else {
      await approve.click();
      const approved = await page
        .waitForFunction(
          (name) => {
            const text = (document.body?.innerText || "").replace(/\s+/g, " ");
            return /Refund approved/i.test(text) || !text.includes(name);
          },
          refundName,
          { timeout: 20_000 },
        )
        .then(() => true)
        .catch(() => false);
      push(
        "owner_approves_refund",
        approved ? "PASS" : "FAIL",
        approved ? "Refund decision recorded" : "Approve clicked but this refund folder did not clear",
      );
    }

    await page.goto(`${BASE}/file-room`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await openOwnerConsole(page);
    text = await visibleText(page);
    const returnShot = await shot(page, "03-return-after-decision");
    const refundStillOpen = text.toLowerCase().includes(refundName.toLowerCase());
    push(
      "decision_stuck_after_return",
      refundStillOpen ? "FAIL" : "PASS",
      refundStillOpen ? `${refundName} still on desk` : `${refundName} left the desk`,
      returnShot,
    );

    await page.request.post(`${BASE}/api/auth/logout`).catch(() => undefined);
    await signIn(page, clientEmail, "dev-only", /Cedar|Room 3|Studio Board/i);
    await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page
      .getByText(/Cancelled|An owner decision has been recorded|This work is closed after an Owner decision/i)
      .first()
      .waitFor({ timeout: 45_000 })
      .catch(() => undefined);
    await page.getByText(/Refund Request/i).first().scrollIntoViewIfNeeded().catch(() => undefined);
    const boardText = await visibleText(page);
    const boardShot = await shot(page, "04-customer-after-owner-refund");
    const customerTruth =
      /\bCancelled\b/i.test(boardText) ||
      /An owner decision has been recorded/i.test(boardText) ||
      /This work is closed after an Owner decision/i.test(boardText);
    push(
      "customer_project_updates_after_owner_decision",
      customerTruth ? "PASS" : "FAIL",
      boardText.slice(0, 400),
      boardShot,
    );
  } finally {
    await browser.close();
    if (!EXTERNAL_BASE) stopLocalServer();
  }

  const passed = results.filter((entry) => entry.status === "PASS").length;
  const failed = results.filter((entry) => entry.status === "FAIL").length;
  const blocked = results.filter((entry) => entry.status === "BLOCKED").length;
  const evidence = { passed, failed, blocked, results };
  writeFileSync(join(OUT, "walk-evidence.json"), JSON.stringify(evidence, null, 2), "utf8");
  console.log(`\nEvidence: ${join(OUT, "walk-evidence.json")}`);
  console.log(`Walk ${passed}/${results.length} PASS · ${failed} FAIL · ${blocked} BLOCKED`);
  const code = failed > 0 || blocked > 0 ? 1 : 0;
  process.exitCode = code;
  return code;
}

main().catch((error) => {
  console.error(error);
  stopLocalServer();
  process.exit(1);
});
