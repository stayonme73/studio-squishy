/**
 * STUDIO-OPERATING-ROOM-3-OWNER-DECISION-EXECUTION-AND-AFTERMATH-1
 * Owner-eyes walk: decide once → Machine acts → customer/project truth updates
 * → ask-loop returns → replay is blocked → leave/return.
 *
 * Safe fixtures. Does not reopen Resend.
 *
 *   $env:PLAYWRIGHT_BROWSERS_PATH="$env:USERPROFILE\AppData\Local\ms-playwright"
 *   $env:CERT_BASE_URL="http://127.0.0.1:3066"
 *   $env:SESSION_SECRET="materials-upload-board-walk-ephemeral-not-for-production"
 *   npx tsx scripts/studio-operating-room-3-owner-decision-execution-and-aftermath-1-walk.mts
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
import { applyRaiseException } from "../src/lib/campaign-tasks/exceptions-actions";
import { getOrGenerateTasks, writeTasksEnvelope } from "../src/lib/campaign-tasks/store";
import { getOrInitializeMaterials } from "../src/lib/materials/store";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "../src/lib/plan-pricing";
import { buildJobId } from "../src/lib/job-control/lane-map";
import { syncJobRecordsFromCampaign } from "../src/lib/job-control/resolve-jobs";
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
  "studio-operating-room-3-owner-decision-execution-and-aftermath-1",
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

async function seedPricingException(
  userId: string,
  campaignId: string,
  campaignName: string,
  title: string,
): Promise<void> {
  const record = paidCampaign(campaignId, campaignName);
  await upsertCampaignRecord(record, userId);
  const materials = await getOrInitializeMaterials(campaignId, record);
  const tasks = await getOrGenerateTasks(campaignId, record);
  const task =
    tasks.tasks.find(
      (entry) =>
        entry.relatedServiceIds.includes(SKU) && entry.id.includes(":creative"),
    ) ??
    tasks.tasks.find((entry) => entry.relatedServiceIds.includes(SKU)) ??
    tasks.tasks[0];
  const raised = applyRaiseException(
    tasks,
    {
      kind: "pricing_exception",
      title,
      description: "Customer was quoted $69. Production needs Owner judgment before continuing.",
      taskId: task?.id,
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
    let login: Awaited<ReturnType<typeof page.request.post>> | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      login = await page.request.post(`${BASE}/api/auth/login`, {
        data: { email, password },
        headers: { "Content-Type": "application/json" },
      });
      if (login.ok()) break;
      if (login.status() === 429) {
        await page.waitForTimeout(1500 * (attempt + 1));
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
    (await page.locator(".fr-owner-sequential__folder-campaign").first().textContent().catch(() => "")) ?? ""
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
    (await page.locator(".fr-owner-sequential__working-campaign").first().textContent().catch(() => "")) ?? ""
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
          /Routed to the client queue/i.test(text) ||
          /Your desk is clear/i.test(text)
        );
      },
      undefined,
      { timeout: 25_000 },
    )
    .then(() => true)
    .catch(() => false);
}

async function main(): Promise<number> {
  BASE = await ensureServer();
  const stamp = randomUUID().slice(0, 8);
  const clientEmail = `room3-s2-walk-${stamp}@local.dev`;
  const created = await createClientAccount({
    email: clientEmail,
    password: "dev-only",
    displayName: "Maya Brooks",
  });
  if (!created.ok) throw new Error(created.message);
  await markEmailVerified(created.user.id);

  const priceName = `Room 3 Price ${stamp}`;
  const declineName = `Room 3 Decline ${stamp}`;
  const askName = `Room 3 Ask ${stamp}`;
  const holdName = `Room 3 Hold ${stamp}`;
  const refundName = `Room 3 Refund ${stamp}`;
  const priceId = `room3-s2w-price-${stamp}`;
  const declineId = `room3-s2w-decline-${stamp}`;
  const askId = `room3-s2w-ask-${stamp}`;
  const holdId = `room3-s2w-hold-${stamp}`;
  const refundId = `room3-s2w-refund-${stamp}`;

  await seedPricingException(created.user.id, priceId, priceName, "Quoted flyer price exception");
  await seedPricingException(created.user.id, declineId, declineName, "Quoted flyer price to decline");
  await seedPricingException(created.user.id, askId, askName, "Need quote confirmation");
  await seedPricingException(created.user.id, holdId, holdName, "Hold pricing internally");
  const refundJobId = await seedRefund(created.user.id, refundId, refundName);
  await linkClientCampaign(created.user.id, priceId);
  await linkClientCampaign(created.user.id, declineId);
  await linkClientCampaign(created.user.id, askId);
  await linkClientCampaign(created.user.id, holdId);
  await linkClientCampaign(created.user.id, refundId);
  push("fixtures_seeded", "PASS", `${priceName} + ${declineName} + ${askName} + ${holdName} + ${refundName}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  let lastDialog = "";
  page.on("dialog", (dialog) => {
    lastDialog = dialog.message();
    void dialog.accept();
  });

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
    text = await visibleText(page);
    push(
      "non_refund_decision_on_desk",
      text.includes(priceName) && text.includes(askName) ? "PASS" : "FAIL",
      "Pricing exception folders visible in Decisions cabinet",
    );

    const openedPrice = await openNamedFolder(page, priceName);
    text = await visibleText(page);
    const priceShot = await shot(page, "02-pricing-folder");
    push(
      "pricing_folder_context",
      openedPrice && /Should this pricing exception/i.test(text) && /Approve pricing exception/i.test(text)
        ? "PASS"
        : "FAIL",
      text.slice(0, 220),
      priceShot,
    );
    const approvePrice = page.getByRole("button", { name: /Approve pricing exception/i }).first();
    if ((await approvePrice.count()) > 0) {
      await approvePrice.click();
      const carried = await waitForDecisionCarried(page);
      push(
        "pricing_approve_machine_acts",
        carried ? "PASS" : "FAIL",
        carried
          ? "Pricing approve confirmed by Machine briefing"
          : "No post-decision briefing after approve",
      );
    } else {
      push("pricing_approve_machine_acts", "FAIL", "Approve pricing exception missing");
    }

    const openedDecline = await openNamedFolder(page, declineName);
    lastDialog = "";
    const declineBtn = page.getByRole("button", { name: /^Decline$/i }).first();
    if (openedDecline && (await declineBtn.count()) > 0) {
      await declineBtn.click();
      const declined = await waitForDecisionCarried(page);
      if (!declined) await page.waitForTimeout(800);
    }
    push(
      "pricing_decline_recorded",
      openedDecline && (/quoted or purchased pricing stays/i.test(lastDialog) || /Pricing exception declined/i.test(await visibleText(page)))
        ? "PASS"
        : "FAIL",
      lastDialog.slice(0, 220) || (openedDecline ? "Decline confirm was empty" : "Decline folder missing"),
      await shot(page, "02b-pricing-decline"),
    );

    const openedAsk = await openNamedFolder(page, askName);
    text = await visibleText(page);
    push(
      "ask_folder_not_closed",
      openedAsk && /Ask client — need information/i.test(text) ? "PASS" : "FAIL",
      text.slice(0, 180),
      await shot(page, "03-ask-folder"),
    );
    const clientBox = page.locator("#decision-client-msg");
    if ((await clientBox.count()) > 0) {
      await clientBox.fill("Please confirm the $69 flyer quote you were shown.");
    }
    const askBtn = page.getByRole("button", { name: /Ask client — need information/i }).first();
    if ((await askBtn.count()) > 0) {
      await askBtn.click();
      const carried = await waitForDecisionCarried(page);
      push(
        "owner_ask_recorded",
        carried ? "PASS" : "FAIL",
        carried ? "Ask client confirmed by Machine briefing" : "No post-decision briefing after ask",
      );
    } else {
      push("owner_ask_recorded", "FAIL", "Ask client button missing");
    }

    await openOwnerConsole(page);
    text = await visibleText(page);
    push(
      "ask_left_active_tray",
      text.includes(askName) && /Need quote confirmation/i.test(text) && /Review Folder/i.test(text)
        ? "FAIL"
        : "PASS",
      text.includes(askName) ? `${askName} still visible on desk` : `${askName} left the decision tray`,
    );

    await page.request.post(`${BASE}/api/auth/logout`).catch(() => undefined);
    await page.waitForTimeout(2000);
    await signIn(page, clientEmail, "dev-only", /Cedar|Room 3|Studio Board/i);
    const askLabels = await waitForCustomerJobLabel(page, askId, /Waiting on you/i);
    push(
      "customer_sees_owner_ask",
      /Waiting on you/i.test(askLabels) ? "PASS" : "FAIL",
      `ask jobs=${askLabels || "(empty)"}`,
      await shot(page, "04-customer-after-ask"),
    );

    const reply = await page.request.post(
      `${BASE}/api/campaigns/${encodeURIComponent(askId)}/project-communication/customer`,
      {
        data: {
          action: "customer_message",
          body: "Yes — please honor the $69 flyer quote.",
          idempotencyKey: `room3-s2-ask-reply-${stamp}`,
        },
        headers: { "Content-Type": "application/json" },
      },
    );
    push(
      "customer_reply_recorded",
      reply.ok() ? "PASS" : "FAIL",
      `POST project-communication ${reply.status()}`,
    );

    await page.request.post(`${BASE}/api/auth/logout`).catch(() => undefined);
    await page.waitForTimeout(2000);
    await signIn(page, OWNER_LOGIN.email, OWNER_LOGIN.password, /Studio Board|File Room|Cedar/i);
    await page.request.post(`${BASE}/api/auth/login`, {
      data: OWNER_LOGIN,
      headers: { "Content-Type": "application/json" },
    });
    await openOwnerConsole(page);
    text = await visibleText(page);
    const returnedShot = await shot(page, "05-ask-returned");
    const returned = await openNamedFolder(page, askName);
    push(
      "ask_loop_returns_to_desk",
      returned ? "PASS" : "FAIL",
      returned ? "Ask folder ready for Owner again" : `${askName} did not return`,
      returnedShot,
    );
    if (returned) {
      const approveReturned = page.getByRole("button", { name: /Approve pricing exception/i }).first();
      if ((await approveReturned.count()) > 0) {
        await approveReturned.click();
        await waitForDecisionCarried(page);
      }
    }

    const openedHold = await openNamedFolder(page, holdName);
    text = await visibleText(page);
    const teamNote = page.locator("#decision-team-note");
    if ((await teamNote.count()) > 0) {
      await teamNote.fill("Need the original quote screenshot before I decide.");
    }
    const holdBtn = page.getByRole("button", { name: /^Hold$/i }).first();
    lastDialog = "";
    if (openedHold && (await holdBtn.count()) > 0) {
      await holdBtn.click();
      await page.waitForTimeout(800);
    }
    push(
      "hold_is_not_approve_or_decline",
      /not an approve or decline/i.test(lastDialog) || /pause/i.test(lastDialog)
        ? "PASS"
        : "FAIL",
      lastDialog.slice(0, 220) || "Hold confirm dialog was empty",
      await shot(page, "06-hold-folder"),
    );

    const openedRefund = await openNamedFolder(page, refundName);
    text = await visibleText(page);
    push(
      "refund_folder_still_available",
      openedRefund && /Approve refund/i.test(text) ? "PASS" : "FAIL",
      text.slice(0, 180),
      await shot(page, "07-refund-folder"),
    );
    const reason = page.locator("#refund-reason");
    if ((await reason.count()) > 0) {
      await reason.fill("Approved after the customer asked to stop.");
    }
    const approveRefund = page.getByRole("button", { name: /Approve refund/i }).first();
    if ((await approveRefund.count()) > 0) {
      await approveRefund.click();
      const carried = await waitForDecisionCarried(page);
      push(
        "refund_approve_recorded",
        carried ? "PASS" : "FAIL",
        carried
          ? "Refund approve confirmed by Machine briefing"
          : "No post-decision briefing after refund approve",
      );
    } else {
      push("refund_approve_recorded", "FAIL", "Approve refund missing");
    }

    const replay = await page.request.patch(
      `${BASE}/api/campaigns/${encodeURIComponent(refundId)}/jobs/${encodeURIComponent(refundJobId)}`,
      {
        data: { action: "owner_approve_refund", reason: "Clicked again." },
        headers: { "Content-Type": "application/json" },
      },
    );
    push(
      "refund_replay_blocked",
      replay.status() === 409 || replay.status() === 422 ? "PASS" : "FAIL",
      `replay status ${replay.status()}`,
    );

    await openOwnerConsole(page);
    text = await visibleText(page);
    const returnShot = await shot(page, "08-return-after-decisions");
    push(
      "handled_left_active_tray",
      text.includes(priceName) || text.includes(refundName) || text.includes(declineName)
        ? "FAIL"
        : "PASS",
      "Approved and declined folders left Today's Desk",
      returnShot,
    );

    const completedTray = page.getByRole("button", { name: /Completed Today/i }).first();
    if ((await completedTray.count()) > 0) {
      await completedTray.click();
      await page.waitForTimeout(600);
    }
    text = await visibleText(page);
    push(
      "recently_handled_shows_result",
      /Quoted flyer price exception|Quoted flyer price to decline|Refund/i.test(text)
        ? "PASS"
        : "FAIL",
      text.slice(0, 220),
      await shot(page, "08b-recently-handled"),
    );

    await page.request.post(`${BASE}/api/auth/logout`).catch(() => undefined);
    await page.waitForTimeout(2000);
    await signIn(page, clientEmail, "dev-only", /Cedar|Room 3|Studio Board/i);
    const refundLabels = await waitForCustomerJobLabel(page, refundId, /Cancelled/i);
    await linkClientCampaign(created.user.id, refundId);
    await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page
      .waitForFunction(
        () => /\bCancelled\b/i.test(document.body?.innerText || "") || /closed after an Owner decision/i.test(document.body?.innerText || ""),
        undefined,
        { timeout: 45_000 },
      )
      .catch(() => undefined);
    const boardText = await visibleText(page);
    push(
      "customer_truth_after_refund",
      /Cancelled/i.test(refundLabels) || /closed after an Owner decision/i.test(boardText)
        ? "PASS"
        : "FAIL",
      `jobs=${refundLabels} board=${boardText.slice(0, 180)}`,
      await shot(page, "09-customer-after-refund"),
    );

    const declineLabels = await waitForCustomerJobLabel(page, declineId, /Queued|Building|Ready|Studio/i);
    push(
      "customer_truth_after_decline_not_cancelled",
      !/Cancelled/i.test(declineLabels) && declineLabels.trim().length > 0
        ? "PASS"
        : "FAIL",
      `decline jobs=${declineLabels}`,
    );
  } finally {
    await browser.close();
    if (!EXTERNAL_BASE) stopLocalServer();
  }

  const passed = results.filter((entry) => entry.status === "PASS").length;
  const failed = results.filter((entry) => entry.status === "FAIL").length;
  const blocked = results.filter((entry) => entry.status === "BLOCKED").length;
  writeFileSync(join(OUT, "walk-evidence.json"), JSON.stringify({ passed, failed, blocked, results }, null, 2), "utf8");
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
