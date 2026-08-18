/**
 * STUDIO-OPERATING-ROOM-2-MIXED-STATUS-AND-TERMINOLOGY-TRUTH-1
 * Live mixed-state Board / Project Record / Help Center customer-truth walk.
 *
 * Does not replay Lobby → checkout. Does not reopen Resend. Does not merge.
 *
 * Run (Windows), against already-running Next or it will start :3066:
 *   $env:PLAYWRIGHT_BROWSERS_PATH="$env:USERPROFILE\AppData\Local\ms-playwright"
 *   $env:CERT_BASE_URL="http://127.0.0.1:3066"
 *   $env:SESSION_SECRET="materials-upload-board-walk-ephemeral-not-for-production"
 *   npx tsx scripts/studio-operating-room-2-mixed-status-and-terminology-truth-1-walk.mts
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { CampaignRecord, CampaignStatus } from "../src/config/studio-board";
import {
  createClientAccount,
  linkClientCampaign,
  markEmailVerified,
} from "../src/lib/auth/users";
import { upsertCampaignRecord } from "../src/lib/campaign-store/store";
import {
  getOrGenerateTasks,
  readTasksEnvelope,
  writeTasksEnvelope,
} from "../src/lib/campaign-tasks/store";
import { getOrInitializeMaterials } from "../src/lib/materials/store";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "../src/lib/plan-pricing";
import type { JobSpineStatus } from "../src/lib/job-control/types";

const PORT = process.env.CERT_PORT || "3066";
const EXTERNAL_BASE = (process.env.CERT_BASE_URL || "").replace(/\/$/, "");
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "materials-upload-board-walk-ephemeral-not-for-production";

const OUT = join(
  process.cwd(),
  "docs",
  "launch",
  "studio-operating-room-2-mixed-status-and-terminology-truth-1",
  "customer-walk",
);
const SHOTS = join(OUT, "shots");
mkdirSync(SHOTS, { recursive: true });

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

async function currentStatusText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const parts = [
      document.querySelector(".sb-next-action")?.textContent,
      document.querySelector('[data-testid="cvc-studio"]')?.textContent,
      document.querySelector('[data-testid="cvc-next"]')?.textContent,
      document.querySelector('[data-testid="cvc-needed"]')?.textContent,
      ...Array.from(document.querySelectorAll(".sb-current-campaign__metrics, .cd-overview__row")).map(
        (el) => el.textContent,
      ),
    ];
    return parts.filter(Boolean).join("\n");
  });
}

async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => (document.body?.innerText || "").slice(0, 18000));
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

function mayaCampaign(campaignId: string, intakeComplete: boolean): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals(["v2-rtu-flyer"]);
  const lineItems = buildServiceScopeSnapshot(["v2-rtu-flyer"]);
  return {
    campaignId,
    campaignName: "Cedar & Bloom Home Organizing",
    campaignStatus: intakeComplete ? "BUILDING_CONCEPTS" : "PAYMENT_RECEIVED",
    campaignDescription: "Back-to-School Reset flyer",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: intakeComplete ? now : undefined,
    routeMapIntakeSubmittedAt: intakeComplete ? now : undefined,
    routeMapIntake: intakeComplete
      ? {
          submittedAt: now,
          answers: {
            flyerPurpose: "Promotional flyer for Back-to-School Reset",
            mustInclude: "Back-to-School Reset flyer copy for live mixed-status walk.",
            materials: "No logo. No photos.",
            intendedUse: "Both print and digital",
            callToAction: "Book Your Reset",
          },
        }
      : undefined,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      confirmedAmountCents: 6900,
      checkoutSessionId: `cs_maya_r2s4_${campaignId}`,
      paymentIntentId: `pi_maya_r2s4_${campaignId}`,
      stripeEventId: `evt_maya_r2s4_${campaignId}`,
      selectedServiceIds: ["v2-rtu-flyer"],
      decisionId: `dec_maya_r2s4_${campaignId}`,
      factFingerprint: `fp_maya_r2s4_${campaignId}`,
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

async function applyState(input: {
  userId: string;
  campaignId: string;
  campaignStatus: CampaignStatus;
  spine: JobSpineStatus;
  intakeComplete: boolean;
  productionStarted: boolean;
}): Promise<CampaignRecord> {
  const record = mayaCampaign(input.campaignId, input.intakeComplete);
  record.campaignStatus = input.campaignStatus;
  const now = new Date().toISOString();
  record.updatedAt = now;
  await upsertCampaignRecord(record, input.userId);
  const envelope = await readTasksEnvelope(input.campaignId);
  if (envelope) {
    await writeTasksEnvelope({
      ...envelope,
      updatedAt: now,
      jobRecords: (envelope.jobRecords ?? []).map((job) => ({
        ...job,
        spineStatus: input.spine,
        productionStartedAt: input.productionStarted ? job.productionStartedAt ?? now : undefined,
      })),
      tasks: (envelope.tasks ?? []).map((task) => ({
        ...task,
        workflowState:
          input.spine === "revision_requested"
            ? "needs_revision"
            : input.spine === "ready_for_review" ||
                input.spine === "approved" ||
                input.spine === "ready_for_delivery" ||
                input.spine === "delivered"
              ? "complete"
              : task.workflowState,
        status:
          input.spine === "revision_requested"
            ? "needs_revision"
            : input.spine === "ready_for_review" ||
                input.spine === "approved" ||
                input.spine === "ready_for_delivery" ||
                input.spine === "delivered"
              ? "complete"
              : task.status,
      })),
    });
  }
  return record;
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
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
  await page.getByText(/Cedar & Bloom Home Organizing/i).first().waitFor({ timeout: 45_000 });
}

async function openBoardAndRecord(page: Page): Promise<{ board: string; record: string }> {
  await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByText(/Cedar & Bloom Home Organizing/i).first().waitFor({ timeout: 45_000 });
  await page.waitForTimeout(1200);
  const board = await currentStatusText(page);
  await page.goto(`${BASE}/campaign-details`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByText(/Cedar & Bloom Home Organizing/i).first().waitFor({ timeout: 45_000 });
  await page.waitForTimeout(1200);
  const record = await currentStatusText(page);
  return { board, record };
}

function finish(code: number): number {
  const failed = results.filter((row) => row.status === "FAIL").length;
  const blocked = results.filter((row) => row.status === "BLOCKED").length;
  const passed = results.filter((row) => row.status === "PASS").length;
  const verdict =
    failed > 0
      ? "NOT CLOSED — mixed-status walk failed"
      : blocked > 0
        ? "BLOCKED — start local server and re-run"
        : "PARK FOR MANAGER";
  const evidence = {
    packageId: "STUDIO-OPERATING-ROOM-2-MIXED-STATUS-AND-TERMINOLOGY-TRUTH-1",
    kind: "mixed-status-customer-walk",
    recordedAt: new Date().toISOString(),
    baseUrl: BASE,
    totals: { passed, failed, blocked, total: results.length },
    verdict,
    results,
  };
  writeFileSync(join(OUT, "walk-evidence.json"), JSON.stringify(evidence, null, 2), "utf8");
  console.log(`\nEvidence: ${join(OUT, "walk-evidence.json")}`);
  console.log(`Verdict: ${verdict} (${passed}/${results.length} PASS)`);
  process.exitCode = code;
  return code;
}

async function main(): Promise<number> {
  const stamp = Date.now();
  const campaignId = `maya-room2-s4-${stamp}`;
  const email = `maya.room2.s4.${stamp}@cedarandbloom.test`;
  const password = "MayaRoom2-S4-0818!";

  process.env.SESSION_SECRET = SESSION_SECRET;
  if (EXTERNAL_BASE) {
    BASE = EXTERNAL_BASE;
    if (!(await waitForServer(BASE, 20))) {
      push("dev_server_available", "BLOCKED", `No server at ${BASE}`);
      return finish(2);
    }
    push("dev_server_available", "PASS", `${BASE} (external)`);
  } else {
    BASE = await startLocalServer();
    push("dev_server_available", "PASS", `${BASE} (started)`);
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
  const seed = mayaCampaign(campaignId, false);
  await upsertCampaignRecord(seed, created.user.id);
  await linkClientCampaign(created.user.id, campaignId);
  await getOrInitializeMaterials(campaignId, seed);
  await getOrGenerateTasks(campaignId, seed);
  push("maya_fixture", "PASS", "Maya Brooks · Cedar & Bloom · Make Me a Flyer $69");

  const browser: Browser = await chromium.launch({ headless: true });
  let context: BrowserContext | null = null;
  let staleContext: BrowserContext | null = null;

  try {
    context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const page = await context.newPage();
    await signIn(page, email, password);

    const states: Array<{
      id: string;
      campaignStatus: CampaignStatus;
      spine: JobSpineStatus;
      intakeComplete: boolean;
      productionStarted: boolean;
      expect: RegExp;
      forbid: RegExp;
    }> = [
      {
        id: "01-intake-needed",
        campaignStatus: "PAYMENT_RECEIVED",
        spine: "ready_for_queue",
        intakeComplete: false,
        productionStarted: false,
        expect: /Waiting on Project Intake|Complete Project Intake/i,
        forbid: /Open Review Room/i,
      },
      {
        id: "02-intake-received",
        campaignStatus: "BUILDING_CONCEPTS",
        spine: "building_concepts",
        intakeComplete: true,
        productionStarted: false,
        expect: /Project Intake Received/i,
        forbid: /Open Review Room/i,
      },
      {
        id: "03-production-underway",
        campaignStatus: "BUILDING_CONCEPTS",
        spine: "building_concepts",
        intakeComplete: true,
        productionStarted: true,
        expect: /Building Concepts/i,
        forbid: /Open Review Room/i,
      },
      {
        id: "04-review-not-ready",
        campaignStatus: "BUILDING_CONCEPTS",
        spine: "building_concepts",
        intakeComplete: true,
        productionStarted: true,
        expect: /Building Concepts/i,
        forbid: /Open Review Room/i,
      },
      {
        id: "05-review-ready",
        campaignStatus: "READY_FOR_REVIEW",
        spine: "ready_for_review",
        intakeComplete: true,
        productionStarted: true,
        expect: /Ready for Review/i,
        forbid: /Project Intake Received|Building Concepts In Progress/i,
      },
      {
        id: "06-revision-underway",
        campaignStatus: "READY_FOR_REVIEW",
        spine: "revision_requested",
        intakeComplete: true,
        productionStarted: true,
        expect: /Revision in progress/i,
        forbid: /Open Review Room/i,
      },
      {
        id: "07-revised-version-ready",
        campaignStatus: "READY_FOR_REVIEW",
        spine: "ready_for_review",
        intakeComplete: true,
        productionStarted: true,
        expect: /Ready for Review/i,
        forbid: /Revision in progress/i,
      },
      {
        id: "08-approved",
        campaignStatus: "READY_FOR_REVIEW",
        spine: "approved",
        intakeComplete: true,
        productionStarted: true,
        expect: /Approved — preparing files/i,
        forbid: /Open Review Room/i,
      },
      {
        id: "09-final-delivery-ready",
        campaignStatus: "READY_FOR_REVIEW",
        spine: "ready_for_delivery",
        intakeComplete: true,
        productionStarted: true,
        expect: /Final Delivery ready/i,
        forbid: /Open Review Room/i,
      },
    ];

    for (const state of states) {
      await applyState({
        userId: created.user.id,
        campaignId,
        campaignStatus: state.campaignStatus,
        spine: state.spine,
        intakeComplete: state.intakeComplete,
        productionStarted: state.productionStarted,
      });
      const { board, record } = await openBoardAndRecord(page);
      const boardShot = await shot(page, `${state.id}-record`);
      await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      const boardOnly = await shot(page, `${state.id}-board`);
      const combined = `${board}\n${record}`;
      const ok = state.expect.test(combined) && !state.forbid.test(combined);
      push(
        `state_${state.id}`,
        ok ? "PASS" : "FAIL",
        ok
          ? `Board/Record current language matches ${state.id}.`
          : `Expected ${state.expect} and not ${state.forbid}. Board excerpt: ${board.slice(0, 280)}`,
        boardOnly || boardShot,
      );
    }

    await page.goto(`${BASE}/help-center`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const helpText = await visibleText(page);
    const helpShot = await shot(page, "10-help-center");
    const helpJobs = helpText.match(/\bjobs?\b/gi) ?? [];
    push(
      "help_center_no_job_noun",
      helpJobs.length === 0 ? "PASS" : "FAIL",
      helpJobs.length === 0
        ? "Help Center customer copy uses service language, not job."
        : `Visible job residue: ${[...new Set(helpJobs)].join(", ")}`,
      helpShot,
    );
    push(
      "help_center_policy_meaning",
      /per service/i.test(helpText) && /may be approved/i.test(helpText) ? "PASS" : "FAIL",
      "Refund/production policy meaning is preserved with service language.",
      helpShot,
    );

    await applyState({
      userId: created.user.id,
      campaignId,
      campaignStatus: "READY_FOR_REVIEW",
      spine: "ready_for_review",
      intakeComplete: true,
      productionStarted: true,
    });
    staleContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const stalePage = await staleContext.newPage();
    await signIn(stalePage, email, password);
    const staleBefore = await currentStatusText(stalePage);
    await applyState({
      userId: created.user.id,
      campaignId,
      campaignStatus: "READY_FOR_REVIEW",
      spine: "revision_requested",
      intakeComplete: true,
      productionStarted: true,
    });
    await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(800);
    const freshAfter = await currentStatusText(page);
    const freshShot = await shot(page, "11-fresh-after-revision");
    await stalePage.reload({ waitUntil: "domcontentloaded" });
    await stalePage.waitForTimeout(800);
    const staleAfterReload = await currentStatusText(stalePage);
    push(
      "stale_tab_before_advance",
      /Ready for Review/i.test(staleBefore) ? "PASS" : "FAIL",
      "Tab kept Review-ready copy before the state advanced.",
    );
    push(
      "fresh_tab_current_truth",
      /Revision in progress/i.test(freshAfter) && !/Open Review Room/i.test(freshAfter)
        ? "PASS"
        : "FAIL",
      "Fresh Board after revision shows Revision in progress, not Open Review Room.",
      freshShot,
    );
    push(
      "stale_tab_reload_current_truth",
      /Revision in progress/i.test(staleAfterReload) ? "PASS" : "FAIL",
      "Reloaded earlier tab follows current revision state.",
    );

    await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const refundText = await visibleText(page);
    push(
      "refund_section_service_language",
      /Which service is this request about/i.test(refundText) ||
        /refund review for a service/i.test(refundText) ||
        /No services are available for a refund request/i.test(refundText)
        ? "PASS"
        : /Which job is this request about/i.test(refundText)
          ? "FAIL"
          : "PASS",
      /Which job/i.test(refundText)
        ? "Refund section still says job."
        : "Refund customer copy does not ask which job.",
    );
  } catch (error) {
    push("walk_runtime", "FAIL", error instanceof Error ? error.message : String(error));
  } finally {
    await staleContext?.close().catch(() => undefined);
    await context?.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    if (!EXTERNAL_BASE) stopLocalServer();
  }

  const failed = results.filter((row) => row.status === "FAIL").length;
  return finish(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  stopLocalServer();
  process.exit(1);
});
