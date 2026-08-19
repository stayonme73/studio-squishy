/**
 * STUDIO-OPERATING-ROOM-3-OWNER-CONSOLE-WHOLE-DESK-REHEARSAL-AND-CLOSEOUT-1
 * Room 3 Section 3 — whole-desk rehearsal + closeout sweep.
 *
 * Mixed desk: routine noise off-desk, genuine decisions, Section 2 loop,
 * scope stale-tab, machine recovery, refund replay, fresh session return.
 *
 * Safe fixtures. Does not reopen Resend.
 *
 *   $env:PLAYWRIGHT_BROWSERS_PATH="$env:USERPROFILE\AppData\Local\ms-playwright"
 *   $env:CERT_BASE_URL="http://127.0.0.1:3066"
 *   $env:SESSION_SECRET="materials-upload-board-walk-ephemeral-not-for-production"
 *   npx tsx scripts/studio-operating-room-3-owner-console-whole-desk-rehearsal-and-closeout-1-walk.mts
 */
import { chromium, type Page } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import type { CampaignRecord } from "../src/config/studio-board";
import type { CampaignExceptionKind } from "../src/lib/campaign-tasks/exceptions-types";
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
import { applyClientSubmitProblemReport } from "../src/lib/campaign-tasks/problem-report-actions";
import { applyRaiseException } from "../src/lib/campaign-tasks/exceptions-actions";
import { getOrGenerateTasks, writeTasksEnvelope } from "../src/lib/campaign-tasks/store";
import { getOrInitializeMaterials, writeMaterialsEnvelope } from "../src/lib/materials/store";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "../src/lib/plan-pricing";
import { buildJobId } from "../src/lib/job-control/lane-map";
import { syncJobRecordsFromCampaign } from "../src/lib/job-control/resolve-jobs";
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
  "studio-operating-room-3-owner-console-whole-desk-rehearsal-and-closeout-1",
  "owner-walk",
);
const SHOTS = join(OUT, "shots");
mkdirSync(SHOTS, { recursive: true });

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
const SKU = "v2-rtu-flyer" as const;
const MACHINE = {
  id: "studio-machine-walk",
  email: "studio-machine@studio.local",
  displayName: "Studio",
  roles: ["owner"] as const,
};

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
  try {
    await page.screenshot({ path: file, fullPage: true });
    return file;
  } catch {
    const fallback = join(SHOTS, `${name}-${Date.now()}.png`);
    await page.screenshot({ path: fallback, fullPage: true });
    return fallback;
  }
}

async function waitForCustomerJobLabel(
  page: Page,
  campaignId: string,
  pattern: RegExp,
): Promise<string> {
  let labels = "";
  for (let i = 0; i < 40; i += 1) {
    const res = await page.request
      .get(`${BASE}/api/campaigns/${encodeURIComponent(campaignId)}/project-status`)
      .catch(() => null);
    if (res?.ok()) {
      const body = (await res.json()) as {
        jobs?: ReadonlyArray<{ statusLabel?: string }>;
      };
      labels = (body.jobs ?? []).map((job) => job.statusLabel ?? "").join(" ");
      if (pattern.test(labels)) return labels;
    }
    await page.waitForTimeout(500);
  }
  return labels;
}

async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => (document.body?.innerText || "").replace(/\s+/g, " ").trim());
}

async function requestJson(
  page: Page,
  method: "get" | "patch",
  url: string,
  data?: unknown,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const res =
        method === "get"
          ? await page.request.get(url)
          : await page.request.patch(url, {
              data,
              headers: { "Content-Type": "application/json" },
            });
      const body = await res.json().catch(() => null);
      return { ok: res.ok(), status: res.status(), body };
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(1500 * (attempt + 1));
      await waitForServer(BASE, 10).catch(() => undefined);
    }
  }
  throw lastError;
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

function creativeTaskId(tasks: Awaited<ReturnType<typeof getOrGenerateTasks>>): string | undefined {
  return (
    tasks.tasks.find(
      (entry) => entry.relatedServiceIds.includes(SKU) && entry.id.includes(":creative"),
    ) ??
    tasks.tasks.find((entry) => entry.relatedServiceIds.includes(SKU)) ??
    tasks.tasks[0]
  )?.id;
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

async function seedMissingFact(
  userId: string,
  campaignId: string,
  campaignName: string,
): Promise<void> {
  const record = paidCampaign(campaignId, campaignName);
  await upsertCampaignRecord(record, userId);
  const materials = await getOrInitializeMaterials(campaignId, record);
  const tasks = await getOrGenerateTasks(campaignId, record);
  const taskId = creativeTaskId(tasks);
  const raised = applyRaiseException(
    tasks,
    {
      kind: "missing_client_fact",
      title: "Store hours for the flyer",
      description: "Need the weekday store hours to finish the copy.",
      taskId,
    },
    MACHINE,
    { staffByUserId: {}, staffCapabilities: {} },
    materials,
  );
  if (!raised.ok) throw new Error(raised.error);
  const synced = syncJobRecordsFromCampaign(
    record,
    raised.envelope.tasks ?? [],
    raised.materialsEnvelope?.items ?? materials.items,
    raised.envelope.exceptionRecords ?? [],
    raised.envelope.jobRecords,
  );
  await writeTasksEnvelope({ ...raised.envelope, jobRecords: synced });
  if (raised.materialsEnvelope) await writeMaterialsEnvelope(raised.materialsEnvelope);
}

async function seedException(
  userId: string,
  campaignId: string,
  campaignName: string,
  kind: CampaignExceptionKind,
  title: string,
  description: string,
): Promise<void> {
  const record = paidCampaign(campaignId, campaignName);
  await upsertCampaignRecord(record, userId);
  const materials = await getOrInitializeMaterials(campaignId, record);
  const tasks = await getOrGenerateTasks(campaignId, record);
  const taskId = creativeTaskId(tasks);
  const raised = applyRaiseException(
    tasks,
    { kind, title, description, taskId },
    MACHINE,
    { staffByUserId: {}, staffCapabilities: {} },
    materials,
  );
  if (!raised.ok) throw new Error(raised.error);
  const synced = syncJobRecordsFromCampaign(
    record,
    raised.envelope.tasks ?? [],
    materials.items ?? [],
    raised.envelope.exceptionRecords ?? [],
    raised.envelope.jobRecords,
  );
  await writeTasksEnvelope({ ...raised.envelope, jobRecords: synced });
}

async function seedPricingException(
  userId: string,
  campaignId: string,
  campaignName: string,
  title: string,
): Promise<void> {
  await seedException(
    userId,
    campaignId,
    campaignName,
    "pricing_exception",
    title,
    "Customer was quoted $69. Production needs Owner judgment before continuing.",
  );
}

async function seedComplaint(
  userId: string,
  campaignId: string,
  campaignName: string,
): Promise<string> {
  const record = paidCampaign(campaignId, campaignName);
  await upsertCampaignRecord(record, userId);
  const materials = await getOrInitializeMaterials(campaignId, record);
  const tasks = await getOrGenerateTasks(campaignId, record);
  const synced = withSyncedJobRecordsForRefund(tasks, record, materials.items ?? []);
  const jobId = synced.jobRecords?.[0]?.jobId ?? buildJobId(campaignId, SKU);
  const submitted = applyClientSubmitProblemReport(
    synced,
    {
      jobId,
      message: "The flyer copy does not match what we agreed in intake.",
      idempotencyKey: `room3-s3-complaint-${campaignId}`,
    },
    {
      id: userId,
      email: "room3-s3-walk@local.dev",
      displayName: "Maya Brooks",
      roles: ["client"],
    },
  );
  if (!submitted.ok) throw new Error(submitted.error);
  await writeTasksEnvelope(submitted.envelope);
  return jobId;
}

async function seedMachineRecovery(
  userId: string,
  campaignId: string,
  campaignName: string,
): Promise<string> {
  const record = paidCampaign(campaignId, campaignName);
  await upsertCampaignRecord(record, userId);
  const materials = await getOrInitializeMaterials(campaignId, record);
  const tasks = await getOrGenerateTasks(campaignId, record);
  const taskId = creativeTaskId(tasks);
  const raised = applyRaiseException(
    tasks,
    {
      kind: "routine_internal",
      title: "Asset export mismatch",
      description: "Wrong dimensions in export — Machine resolves without Owner folder.",
      taskId,
    },
    MACHINE,
    { staffByUserId: {}, staffCapabilities: {} },
    materials,
  );
  if (!raised.ok) throw new Error(raised.error);
  const synced = syncJobRecordsFromCampaign(
    record,
    raised.envelope.tasks ?? [],
    materials.items ?? [],
    raised.envelope.exceptionRecords ?? [],
    raised.envelope.jobRecords,
  );
  await writeTasksEnvelope({ ...raised.envelope, jobRecords: synced });
  const routineId = raised.envelope.exceptionRecords?.find(
    (entry) => entry.kind === "routine_internal",
  )?.id;
  if (!routineId) throw new Error("routine_internal missing after seed");
  return routineId;
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
      email: "room3-s3-walk@local.dev",
      displayName: "Maya Brooks",
      roles: ["client"],
    },
  );
  if (!submitted.ok) throw new Error(submitted.error);
  await writeTasksEnvelope(submitted.envelope);
  return jobId;
}

async function signIn(page: Page, email: string, password: string, waitFor: RegExp): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const login = await page.request.post(`${BASE}/api/auth/login`, {
        data: { email, password },
        headers: { "Content-Type": "application/json" },
      });
      if (login.ok()) {
        await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await page.getByText(waitFor).first().waitFor({ timeout: 45_000 }).catch(() => undefined);
        return;
      }
      if (login.status() === 429) {
        await page.waitForTimeout(2500 * (attempt + 1));
        continue;
      }
      break;
    } catch {
      await waitForServer(BASE, 15).catch(() => undefined);
      await page.waitForTimeout(2500 * (attempt + 1));
    }
  }

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
    let login: Awaited<ReturnType<typeof page.request.post>> | null = null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      login = await page.request.post(`${BASE}/api/auth/login`, {
        data: { email, password },
        headers: { "Content-Type": "application/json" },
      });
      if (login.ok()) break;
      if (login.status() === 429) {
        await page.waitForTimeout(2500 * (attempt + 1));
        continue;
      }
      throw new Error(`Login API ${login.status()}`);
    }
    if (!login?.ok()) throw new Error(`Login API ${login?.status() ?? "failed"}`);
    await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  }
  await page.getByText(waitFor).first().waitFor({ timeout: 45_000 }).catch(() => undefined);
}

async function openOwnerConsole(page: Page): Promise<void> {
  await page.goto(`${BASE}${OWNER_CONSOLE_ROUTE}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page
    .getByText(/Today's Desk|Your desk is clear|File Room|Good (morning|afternoon|evening)/i)
    .first()
    .waitFor({ timeout: 90_000 });
}

async function openNamedFolder(page: Page, campaignName: string): Promise<boolean> {
  const closeFolder = page.getByRole("button", { name: /Close Folder/i }).first();
  if ((await closeFolder.count()) > 0 && (await closeFolder.isVisible().catch(() => false))) {
    await closeFolder.click();
    await page.waitForTimeout(400);
  }
  const backToDesk = page.getByRole("button", { name: /Back to desk/i }).first();
  if ((await backToDesk.count()) > 0 && (await backToDesk.isVisible().catch(() => false))) {
    await backToDesk.click();
    await page.waitForTimeout(400);
  }

  const currentName = (
    (await page.locator(".fr-owner-sequential__folder-campaign").first().textContent().catch(() => "")) ??
    ""
  ).trim();
  const alreadyCurrent = currentName.toLowerCase() === campaignName.toLowerCase();

  if (!alreadyCurrent) {
    const decisions = page.locator(".fr-owner-sequential__tray--needs-my-decision").first();
    if ((await decisions.count()) === 0) return false;
    const active = await decisions.evaluate((el) =>
      el.className.includes("fr-owner-sequential__tray--active"),
    );
    if (!active) await decisions.click();
    const folder = page
      .locator(".fr-owner-sequential__cabinet-folder")
      .filter({ hasText: campaignName })
      .first();
    await folder.waitFor({ state: "attached", timeout: 20_000 }).catch(() => undefined);
    if ((await folder.count()) === 0) {
      await decisions.click();
      await page.waitForTimeout(400);
      await decisions.click();
      await folder.waitFor({ state: "attached", timeout: 15_000 }).catch(() => undefined);
    }
    if ((await folder.count()) === 0) return false;
    await folder.scrollIntoViewIfNeeded().catch(() => undefined);
    await folder.click({ force: true });
    await page
      .getByRole("button", { name: /Back to desk/i })
      .waitFor({ state: "hidden", timeout: 8_000 })
      .catch(() => undefined);
    await page
      .locator(".fr-owner-sequential__folder-campaign")
      .filter({ hasText: campaignName })
      .first()
      .waitFor({ state: "visible", timeout: 15_000 })
      .catch(() => undefined);
  }

  const review = page.locator(".fr-owner-sequential__folder-closed .utility-btn--primary").first();
  const reviewVisible = await review
    .waitFor({ state: "visible", timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (!reviewVisible) return false;
  await review.click();
  const opened = await page
    .getByRole("button", { name: /Close Folder/i })
    .waitFor({ state: "visible", timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (!opened) return false;
  const openName = (
    (await page.locator(".fr-owner-sequential__working-campaign").first().textContent().catch(() => "")) ??
    ""
  ).trim();
  return openName.toLowerCase() === campaignName.toLowerCase();
}

async function waitForDecisionCarried(page: Page): Promise<boolean> {
  return page
    .waitForFunction(
      () => {
        const text = document.body?.innerText || "";
        return (
          /Confirmed: the decision is recorded/i.test(text) ||
          /Pricing exception approved/i.test(text) ||
          /Pricing exception declined/i.test(text) ||
          /Scope change approved/i.test(text) ||
          /Routed to the client queue/i.test(text) ||
          /Refund approved/i.test(text) ||
          /Your desk is clear/i.test(text)
        );
      },
      undefined,
      { timeout: 25_000 },
    )
    .then(() => true)
    .catch(() => false);
}

async function ensureDecisionsTray(page: Page): Promise<void> {
  const decisionsTray = page.locator(".fr-owner-sequential__tray--needs-my-decision").first();
  if ((await decisionsTray.count()) > 0) {
    const active = await decisionsTray.evaluate((el) =>
      el.className.includes("fr-owner-sequential__tray--active"),
    );
    if (!active) await decisionsTray.click();
    await page
      .locator(".fr-owner-sequential__cabinet-folder")
      .first()
      .waitFor({ state: "visible", timeout: 20_000 })
      .catch(() => undefined);
  }
}

async function countCabinetFoldersWithText(page: Page, needle: string): Promise<number> {
  await ensureDecisionsTray(page);
  return page.locator(".fr-owner-sequential__cabinet-folder").filter({ hasText: needle }).count();
}

async function ensureOwnerSession(page: Page): Promise<void> {
  const session = await page.request.get(`${BASE}/api/auth/session`);
  const body = (await session.json().catch(() => null)) as {
    user?: { email?: string };
  } | null;
  if (body?.user?.email?.toLowerCase() === OWNER_LOGIN.email.toLowerCase()) return;
  await signIn(page, OWNER_LOGIN.email, OWNER_LOGIN.password, /Studio Board|File Room|Cedar/i);
  await page.request.post(`${BASE}/api/auth/login`, {
    data: OWNER_LOGIN,
    headers: { "Content-Type": "application/json" },
  });
}

async function main(): Promise<number> {
  BASE = await ensureServer();
  const stamp = randomUUID().slice(0, 8);
  const clientEmail = `room3-s3-walk-${stamp}@local.dev`;
  const created = await createClientAccount({
    email: clientEmail,
    password: "dev-only",
    displayName: "Maya Brooks",
  });
  if (!created.ok) throw new Error(created.message);
  await markEmailVerified(created.user.id);

  const routineName = `Room 3 S3 Routine ${stamp}`;
  const factName = `Room 3 S3 Missing Fact ${stamp}`;
  const priceName = `Room 3 S3 Price ${stamp}`;
  const declineName = `Room 3 S3 Decline ${stamp}`;
  const askName = `Room 3 S3 Ask ${stamp}`;
  const holdName = `Room 3 S3 Hold ${stamp}`;
  const scopeName = `Room 3 S3 Scope ${stamp}`;
  const revisionName = `Room 3 S3 Revision ${stamp}`;
  const complianceName = `Room 3 S3 Compliance ${stamp}`;
  const complaintName = `Room 3 S3 Complaint ${stamp}`;
  const refundName = `Room 3 S3 Refund ${stamp}`;
  const recoveryName = `Room 3 S3 Recovery ${stamp}`;

  const routineId = `room3-s3-routine-${stamp}`;
  const factId = `room3-s3-fact-${stamp}`;
  const priceId = `room3-s3-price-${stamp}`;
  const declineId = `room3-s3-decline-${stamp}`;
  const askId = `room3-s3-ask-${stamp}`;
  const holdId = `room3-s3-hold-${stamp}`;
  const scopeId = `room3-s3-scope-${stamp}`;
  const revisionId = `room3-s3-revision-${stamp}`;
  const complianceId = `room3-s3-compliance-${stamp}`;
  const complaintId = `room3-s3-complaint-${stamp}`;
  const refundId = `room3-s3-refund-${stamp}`;
  const recoveryId = `room3-s3-recovery-${stamp}`;

  await seedRoutine(created.user.id, routineId, routineName);
  await seedMissingFact(created.user.id, factId, factName);
  await seedPricingException(created.user.id, priceId, priceName, "Quoted flyer price exception");
  await seedPricingException(created.user.id, declineId, declineName, "Quoted flyer price to decline");
  await seedPricingException(created.user.id, askId, askName, "Need quote confirmation");
  await seedPricingException(created.user.id, holdId, holdName, "Hold pricing internally");
  await seedException(
    created.user.id,
    scopeId,
    scopeName,
    "scope_change",
    "Scope change — extra deliverable requested",
    "Client asked for a second layout variant outside the approved plan.",
  );
  await seedException(
    created.user.id,
    revisionId,
    revisionName,
    "revision_exhausted",
    "Client Boundary Review — revision limit reached",
    "Client requested another full rewrite after the included revision round.",
  );
  await seedException(
    created.user.id,
    complianceId,
    complianceName,
    "compliance_hold",
    "Compliance hold — unverified health claim",
    "QA flagged an unverified health claim in caption copy.",
  );
  await seedComplaint(created.user.id, complaintId, complaintName);
  const refundJobId = await seedRefund(created.user.id, refundId, refundName);
  const recoveryExceptionId = await seedMachineRecovery(
    created.user.id,
    recoveryId,
    recoveryName,
  );

  for (const id of [
    routineId,
    factId,
    priceId,
    declineId,
    askId,
    holdId,
    scopeId,
    revisionId,
    complianceId,
    complaintId,
    refundId,
    recoveryId,
  ]) {
    await linkClientCampaign(created.user.id, id);
  }

  push(
    "fixtures_seeded",
    "PASS",
    `${priceName} + ${declineName} + ${askName} + ${holdName} + ${scopeName} + ${refundName} + ${recoveryName}`,
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const clientContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const clientPage = await clientContext.newPage();
  const staleTab = await context.newPage();
  let lastDialog = "";
  const acceptDialog = (dialog: { message: () => string; accept: () => Promise<void> }) => {
    lastDialog = dialog.message();
    void dialog.accept();
  };
  page.on("dialog", acceptDialog);
  staleTab.on("dialog", acceptDialog);

  try {
    await signIn(clientPage, clientEmail, "dev-only", /Studio Board|Cedar|Room 3/i);
    await signIn(page, OWNER_LOGIN.email, OWNER_LOGIN.password, /Studio Board|File Room|Cedar/i);
    await ensureOwnerSession(page);
    await openOwnerConsole(page);
    await ensureDecisionsTray(page);
    let text = await visibleText(page);
    const openShot = await shot(page, "01-owner-console-open");

    push(
      "routine_noise_off_desk",
      text.includes(routineName) || /Payment received/i.test(text) ? "FAIL" : "PASS",
      text.includes(routineName)
        ? `${routineName} appeared on Today's Desk`
        : "Routine payment_received stayed off the sequential desk",
      openShot,
    );

    push(
      "missing_fact_off_desk",
      text.toLowerCase().includes(factName.toLowerCase()) ? "FAIL" : "PASS",
      text.toLowerCase().includes(factName.toLowerCase())
        ? "Ordinary missing fact appeared as Owner work"
        : "Ordinary missing fact stayed off the sequential desk",
    );

    push(
      "certification_fixtures_hidden",
      /Package 3 Certification|p3-cert-/i.test(text) ? "FAIL" : "PASS",
      /Package 3 Certification|p3-cert-/i.test(text)
        ? "Stale certification residue on desk"
        : "Historical certification folders filtered from live desk",
    );

    const folderMatch = text.match(/(\d+)\s+folders?/i);
    const folderCount = folderMatch ? Number(folderMatch[1]) : NaN;
    push(
      "first_glance_understandable",
      Number.isFinite(folderCount) &&
        /sorted them by urgency|organized today's/i.test(text) &&
        /Today's Desk/i.test(text) &&
        !/forensic/i.test(text)
        ? "PASS"
        : "FAIL",
      Number.isFinite(folderCount)
        ? `${folderCount} folders · urgency briefing present`
        : "Could not read Today's Desk folder count",
    );

    const stampFolderCount = await countCabinetFoldersWithText(page, stamp);
    push(
      "mixed_desk_decision_count",
      stampFolderCount >= 7 && !/Package 3 Certification/i.test(text) ? "PASS" : "FAIL",
      `${stampFolderCount}/9 seeded decisions for stamp ${stamp} · desk total ${Number.isFinite(folderCount) ? folderCount : "?"} folders`,
    );

    push(
      "one_stop_no_control_room",
      (await page.locator(".fr-control-room").count()) === 0 &&
        !/Needs Communication/i.test(text) &&
        !/test-send/i.test(text)
        ? "PASS"
        : "FAIL",
      "Sequential landing only — no Control Room panels or test-send queue",
    );

    push(
      "terminology_residue",
      /squishy says|pending owner send|all campaigns/i.test(text) ? "FAIL" : "PASS",
      /squishy says/i.test(text)
        ? "Squishy says still on desk"
        : /pending owner send/i.test(text)
          ? "Pending owner send on desk"
          : /all campaigns/i.test(text)
            ? "All campaigns footer residue"
            : "Desk briefing / File Room terminology clean",
    );

    const scopeInCabinet = await countCabinetFoldersWithText(page, scopeName);
    push(
      "genuine_scope_on_desk",
      scopeInCabinet > 0 ? "PASS" : "FAIL",
      scopeInCabinet > 0
        ? `${scopeName} visible in Decisions cabinet`
        : `${scopeName} missing from Decisions cabinet`,
    );

    const openedPrice = await openNamedFolder(page, priceName);
    text = await visibleText(page);
    const approvePrice = page.getByRole("button", { name: /Approve pricing exception/i }).first();
    if (openedPrice && (await approvePrice.count()) > 0) {
      await approvePrice.click();
      const carried = await waitForDecisionCarried(page);
      push(
        "session_approve_pricing",
        carried ? "PASS" : "FAIL",
        carried ? "Pricing approve confirmed by Machine briefing" : "Approve did not carry",
        await shot(page, "02-pricing-approve"),
      );
    } else {
      push("session_approve_pricing", "FAIL", "Pricing approve folder or button missing");
    }

    await page.goto(`${BASE}/file-room`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await openOwnerConsole(page);
    text = await visibleText(page);
    push(
      "leave_return_handled_stays",
      text.includes(priceName) ? "FAIL" : "PASS",
      text.includes(priceName) ? `${priceName} still on desk after return` : `${priceName} left the desk`,
      await shot(page, "03-leave-return-after-price"),
    );

    const openedDecline = await openNamedFolder(page, declineName);
    lastDialog = "";
    const declineBtn = page.getByRole("button", { name: /^Decline$/i }).first();
    if (openedDecline && (await declineBtn.count()) > 0) {
      await declineBtn.click();
      await waitForDecisionCarried(page);
    }
    push(
      "session_decline_pricing",
      openedDecline &&
        (/quoted or purchased pricing stays/i.test(lastDialog) ||
          /Pricing exception declined/i.test(await visibleText(page)))
        ? "PASS"
        : "FAIL",
      lastDialog.slice(0, 220) || (openedDecline ? "Decline confirm was empty" : "Decline folder missing"),
      await shot(page, "04-pricing-decline"),
    );

    const openedAsk = await openNamedFolder(page, askName);
    text = await visibleText(page);
    const clientBox = page.locator("#decision-client-msg");
    if ((await clientBox.count()) > 0) {
      await clientBox.fill("Please confirm the $69 flyer quote you were shown.");
    }
    const askBtn = page.getByRole("button", { name: /Ask client — need information/i }).first();
    let askCarried = false;
    if (openedAsk && (await askBtn.count()) > 0) {
      await askBtn.click();
      askCarried = await waitForDecisionCarried(page);
    }
    push(
      "session_ask_client",
      openedAsk && askCarried ? "PASS" : "FAIL",
      openedAsk
        ? askCarried
          ? "Ask client confirmed by Machine briefing"
          : "Ask client clicked but no post-decision briefing"
        : `${askName} folder missing`,
      await shot(page, "05-ask-folder"),
    );

    await waitForCustomerJobLabel(clientPage, askId, /Waiting on you/i);
    const reply = await clientPage.request.post(
      `${BASE}/api/campaigns/${encodeURIComponent(askId)}/project-communication/customer`,
      {
        data: {
          action: "customer_message",
          body: "Yes — please honor the $69 flyer quote.",
          idempotencyKey: `room3-s3-ask-reply-${stamp}`,
        },
        headers: { "Content-Type": "application/json" },
      },
    );
    push(
      "customer_reply_recorded",
      reply.ok() ? "PASS" : "FAIL",
      `POST project-communication ${reply.status()}`,
    );

    await ensureOwnerSession(page);
    await openOwnerConsole(page);
    const returnedAsk = await openNamedFolder(page, askName);
    if (returnedAsk) {
      const approveReturned = page.getByRole("button", { name: /Approve pricing exception/i }).first();
      if ((await approveReturned.count()) > 0) {
        await approveReturned.click();
        await waitForDecisionCarried(page);
      }
    }
    push(
      "ask_loop_returns",
      returnedAsk ? "PASS" : "FAIL",
      returnedAsk ? `${askName} returned to Owner desk after client reply` : `${askName} did not return`,
      await shot(page, "06-ask-returned"),
    );

    const openedHold = await openNamedFolder(page, holdName);
    text = await visibleText(page);
    const teamNote = page.locator("#decision-team-note");
    if ((await teamNote.count()) > 0) {
      await teamNote.fill("Need the original quote screenshot before I decide.");
    }
    lastDialog = "";
    const holdBtn = page.getByRole("button", { name: /^Hold$/i }).first();
    if (openedHold && (await holdBtn.count()) > 0) {
      await holdBtn.click();
      await waitForDecisionCarried(page);
      await page.waitForTimeout(800);
    }
    push(
      "session_hold_pause",
      openedHold &&
        (/not an approve or decline/i.test(lastDialog) || /pause/i.test(lastDialog))
        ? "PASS"
        : "FAIL",
      lastDialog.slice(0, 220) || (openedHold ? "Hold confirm dialog was empty" : "Hold folder missing"),
      await shot(page, "07-hold-pause"),
    );

    const holdTasksResponse = await requestJson(
      page,
      "get",
      `${BASE}/api/campaigns/${encodeURIComponent(holdId)}/tasks`,
    );
    const holdTasks = holdTasksResponse.body as {
      exceptionRecords?: Array<{ id: string; status: string; kind: string }>;
    };
    const holdException = holdTasks.exceptionRecords?.find(
      (entry) => entry.kind === "pricing_exception" && entry.status === "waiting_internal",
    );
    const internalReturn = holdException
      ? await requestJson(
          page,
          "patch",
          `${BASE}/api/campaigns/${encodeURIComponent(holdId)}/tasks`,
          {
            action: "complete_internal_owner_follow_up",
            exceptionId: holdException.id,
            note: "Found the original $69 quote screenshot in intake files.",
            outcome: "needs_owner_judgment",
          },
        )
      : null;

    await openOwnerConsole(page);
    const returnedHold = await openNamedFolder(page, holdName);
    push(
      "hold_internal_return",
      internalReturn?.ok && returnedHold ? "PASS" : "FAIL",
      holdException
        ? `follow_up ${internalReturn?.status ?? "missing"} · returned=${returnedHold}`
        : "No waiting_internal pricing exception after hold",
      await shot(page, "08-hold-returned"),
    );

    const internalReplay = holdException
      ? await requestJson(
          page,
          "patch",
          `${BASE}/api/campaigns/${encodeURIComponent(holdId)}/tasks`,
          {
            action: "complete_internal_owner_follow_up",
            exceptionId: holdException.id,
            note: "Duplicate stale-tab update.",
            outcome: "needs_owner_judgment",
          },
        )
      : null;
    push(
      "internal_replay_idempotent",
      internalReplay?.ok ? "PASS" : "FAIL",
      `replay status ${internalReplay?.status ?? "missing"}`,
    );

    let holdApproved = false;
    if (returnedHold) {
      const approveHold = page.getByRole("button", { name: /Approve pricing exception/i }).first();
      if ((await approveHold.count()) > 0) {
        await approveHold.click();
        holdApproved = await waitForDecisionCarried(page);
      }
    }
    push(
      "hold_approve",
      holdApproved ? "PASS" : "FAIL",
      holdApproved ? `${holdName} approved after internal return` : `${holdName} approve did not carry`,
    );

    const recoveryResolve = await requestJson(
      page,
      "patch",
      `${BASE}/api/campaigns/${encodeURIComponent(recoveryId)}/tasks`,
      {
        action: "resolve_exception",
        exceptionId: recoveryExceptionId,
        resolutionNotes: "Export dimensions corrected — no Owner folder required.",
      },
    );
    await openOwnerConsole(page);
    text = await visibleText(page);
    push(
      "machine_recovery_no_owner_folder",
      recoveryResolve.ok && !text.includes(recoveryName) ? "PASS" : "FAIL",
      recoveryResolve.ok
        ? `${recoveryName} resolved via API without Owner desk folder`
        : `resolve_exception ${recoveryResolve.status} · recovery visible=${text.includes(recoveryName)}`,
      await shot(page, "09-machine-recovery"),
    );

    const openedScopeStale = await openNamedFolder(page, scopeName);
    if (!openedScopeStale) {
      push("stale_tab_scope_resolved_elsewhere", "FAIL", `${scopeName} missing for stale-tab test`);
    } else {
      await ensureOwnerSession(staleTab);
      await openOwnerConsole(staleTab);
      const openedScopeOther = await openNamedFolder(staleTab, scopeName);
      const approveScopeOther = staleTab
        .getByRole("button", { name: /Approve scope change/i })
        .first();
      if (openedScopeOther && (await approveScopeOther.count()) > 0) {
        await approveScopeOther.click();
        await waitForDecisionCarried(staleTab);
      }

      await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(800);
      text = await visibleText(page);
      const scopeTasksResponse = await requestJson(
        page,
        "get",
        `${BASE}/api/campaigns/${encodeURIComponent(scopeId)}/tasks`,
      );
      const scopeTasks = scopeTasksResponse.body as {
        exceptionRecords?: Array<{ id: string; kind: string; status: string }>;
      };
      const scopeExceptionId = scopeTasks.exceptionRecords?.find(
        (entry) => entry.kind === "scope_change",
      )?.id;
      const scopeRetry = scopeExceptionId
        ? await requestJson(
            page,
            "patch",
            `${BASE}/api/campaigns/${encodeURIComponent(scopeId)}/tasks`,
            {
              action: "owner_approve_scope_change",
              exceptionId: scopeExceptionId,
              ownerNotes: "Stale tab retry.",
            },
          )
        : null;
      const staleBlocked =
        scopeRetry?.status === 409 ||
        scopeRetry?.status === 422 ||
        !text.includes(scopeName) ||
        /already resolved|no longer needs|not ready/i.test(text);
      push(
        "stale_tab_scope_resolved_elsewhere",
        staleBlocked ? "PASS" : "FAIL",
        `tab1 retry status ${scopeRetry?.status ?? "missing"} · scope still open=${text.includes(scopeName)}`,
        await shot(page, "10-stale-tab-scope"),
      );
    }

    const openedRefund = await openNamedFolder(page, refundName);
    text = await visibleText(page);
    push(
      "decision_card_context_refund",
      openedRefund &&
        text.toLowerCase().includes(refundName.toLowerCase()) &&
        /Should this work receive a refund/i.test(text) &&
        /Approve refund/i.test(text)
        ? "PASS"
        : "FAIL",
      text.slice(0, 220),
      await shot(page, "11-refund-folder"),
    );
    const reason = page.locator("#refund-reason");
    if ((await reason.count()) > 0) {
      await reason.fill("Approved on the Owner desk after the customer asked to stop.");
    }
    const approveRefund = page.getByRole("button", { name: /Approve refund/i }).first();
    if ((await approveRefund.count()) > 0) {
      await approveRefund.click();
      await waitForDecisionCarried(page);
    }

    const replay = await page.request.patch(
      `${BASE}/api/campaigns/${encodeURIComponent(refundId)}/jobs/${encodeURIComponent(refundJobId)}`,
      {
        data: { action: "owner_approve_refund", reason: "Clicked again." },
        headers: { "Content-Type": "application/json" },
      },
    );
    push(
      "stale_tab_refund_replay_blocked",
      replay.status() === 409 || replay.status() === 422 ? "PASS" : "FAIL",
      `replay status ${replay.status()}`,
    );

    await openOwnerConsole(page);
    text = await visibleText(page);
    const remainingDeskCount = text.match(/(\d+)\s+folders?/i)?.[1] ?? "?";

    const freshContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const freshPage = await freshContext.newPage();
    freshPage.on("dialog", acceptDialog);
    await signIn(freshPage, OWNER_LOGIN.email, OWNER_LOGIN.password, /Studio Board|File Room|Cedar/i);
    await freshPage.request.post(`${BASE}/api/auth/login`, {
      data: OWNER_LOGIN,
      headers: { "Content-Type": "application/json" },
    });
    await openOwnerConsole(freshPage);
    const freshText = await visibleText(freshPage);
    const freshAccurate =
      !freshText.includes(priceName) &&
      !freshText.includes(refundName) &&
      !freshText.includes(scopeName) &&
      !freshText.includes(declineName);
    push(
      "fresh_session_return",
      freshAccurate ? "PASS" : "FAIL",
      freshAccurate
        ? `Fresh session desk accurate · ${remainingDeskCount} folders remain for open items`
        : "Fresh session still shows handled folders",
      await shot(freshPage, "12-fresh-session"),
    );
    await freshContext.close();

    const refundLabels = await waitForCustomerJobLabel(clientPage, refundId, /Cancelled/i);
    await linkClientCampaign(created.user.id, refundId);
    await clientPage.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await clientPage
      .waitForFunction(
        () =>
          /\bCancelled\b/i.test(document.body?.innerText || "") ||
          /closed after an Owner decision/i.test(document.body?.innerText || ""),
        undefined,
        { timeout: 45_000 },
      )
      .catch(() => undefined);
    const boardText = await visibleText(clientPage);
    push(
      "customer_truth_after_refund",
      /Cancelled/i.test(refundLabels) || /closed after an Owner decision/i.test(boardText)
        ? "PASS"
        : "FAIL",
      `jobs=${refundLabels} board=${boardText.slice(0, 180)}`,
      await shot(clientPage, "13-customer-after-refund"),
    );

    await ensureOwnerSession(page);
    await openOwnerConsole(page);
    await page
      .waitForFunction(
        () => {
          const body = document.body?.innerText || "";
          return /Your desk is clear/i.test(body) || /Completed Today/i.test(body);
        },
        undefined,
        { timeout: 25_000 },
      )
      .catch(() => undefined);

    const completedTray = page.getByRole("button", { name: /Completed Today/i }).first();
    if ((await completedTray.count()) > 0) {
      await completedTray.click();
      await page
        .locator(".fr-owner-sequential__cabinet-item-title")
        .first()
        .waitFor({ state: "visible", timeout: 15_000 })
        .catch(() => undefined);
    }
    text = await visibleText(page);
    const recentlyHandledPattern =
      /Quoted flyer price exception|Quoted flyer price to decline|Hold pricing internally|Scope change|Refund request/i;
    push(
      "recently_handled_useful",
      recentlyHandledPattern.test(text) ? "PASS" : "FAIL",
      text.slice(0, 220),
      await shot(page, "14-recently-handled"),
    );

    await openOwnerConsole(page);
    text = await visibleText(page);
    push(
      "handled_left_active_tray",
      text.includes(priceName) ||
        text.includes(refundName) ||
        text.includes(declineName) ||
        text.includes(scopeName) ||
        text.includes(holdName)
        ? "FAIL"
        : "PASS",
      "Handled folders left Today's Desk active tray",
      await shot(page, "15-handled-left-tray"),
    );
  } finally {
    await staleTab.close().catch(() => undefined);
    await clientContext.close().catch(() => undefined);
    await browser.close();
    if (!EXTERNAL_BASE) stopLocalServer();
  }

  const passed = results.filter((entry) => entry.status === "PASS").length;
  const failed = results.filter((entry) => entry.status === "FAIL").length;
  const blocked = results.filter((entry) => entry.status === "BLOCKED").length;
  writeFileSync(
    join(OUT, "walk-evidence.json"),
    JSON.stringify({ passed, failed, blocked, results }, null, 2),
    "utf8",
  );
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
