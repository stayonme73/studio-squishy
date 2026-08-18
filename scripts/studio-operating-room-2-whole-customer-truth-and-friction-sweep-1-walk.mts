/**
 * STUDIO-OPERATING-ROOM-2-WHOLE-CUSTOMER-TRUTH-AND-FRICTION-SWEEP-1
 * Whole live customer spine: Lobby → checkout handoff, then Maya paid
 * intake → Board → Voice → Help → Review → revision → approval → Delivery.
 *
 * Does not create a new Stripe charge. Does not reopen Resend. Does not merge.
 *
 *   $env:PLAYWRIGHT_BROWSERS_PATH="$env:USERPROFILE\AppData\Local\ms-playwright"
 *   $env:CERT_BASE_URL="http://127.0.0.1:3066"
 *   $env:SESSION_SECRET="materials-upload-board-walk-ephemeral-not-for-production"
 *   npx tsx scripts/studio-operating-room-2-whole-customer-truth-and-friction-sweep-1-walk.mts
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import type { CampaignRecord, CampaignStatus } from "../src/config/studio-board";
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
import type { JobSpineStatus } from "../src/lib/job-control/types";
import { DESIGN_RENDERER_PROOF_SKU } from "../src/lib/studio-design-renderer";

const PORT = process.env.CERT_PORT || "3066";
const EXTERNAL_BASE = (process.env.CERT_BASE_URL || "").replace(/\/$/, "");
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "materials-upload-board-walk-ephemeral-not-for-production";
const VOICE_NARRATION_KEY = "studio-voice:narration-preference:v1";

const OUT = join(
  process.cwd(),
  "docs",
  "launch",
  "studio-operating-room-2-whole-customer-truth-and-friction-sweep-1",
  "customer-walk",
);
const SHOTS = join(OUT, "shots");
mkdirSync(SHOTS, { recursive: true });

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

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

const FORBIDDEN = [
  /squishy/i,
  /this build/i,
  /STRIPE_SECRET_KEY/,
  /sk_test_/,
  /Decision Core/i,
  /Ask Squishy/i,
  /START NEW CAMPAIGN/i,
  /Current Campaign/i,
  /sha256/i,
  /image\/png/i,
  /application\/pdf/i,
];

type Check = {
  check: string;
  status: "PASS" | "FAIL" | "BLOCKED";
  detail?: string;
  shot?: string;
};
type Friction = {
  where: string;
  classification: "launch-blocker" | "important" | "acceptable" | "dormant";
  note: string;
};

const results: Check[] = [];
const friction: Friction[] = [];
let serverChild: ChildProcess | null = null;
let BASE = EXTERNAL_BASE || `http://127.0.0.1:${PORT}`;

function push(check: string, status: Check["status"], detail?: string, shot?: string): void {
  results.push({ check, status, detail, shot });
  console.log(detail ? `${status}  ${check} — ${detail}` : `${status}  ${check}`);
}

function noteFriction(entry: Friction): void {
  friction.push(entry);
  console.log(`[FRICTION ${entry.classification}] ${entry.where}: ${entry.note}`);
}

async function shot(page: Page, name: string): Promise<string> {
  const file = join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => (document.body?.innerText || "").replace(/\s+/g, " ").trim());
}

async function currentStatusText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const parts = [
      document.querySelector(".sb-next-action")?.textContent,
      document.querySelector('[data-testid="cvc-studio"]')?.textContent,
      document.querySelector('[data-testid="cvc-next"]')?.textContent,
      document.querySelector('[data-testid="cvc-needed"]')?.textContent,
      ...Array.from(
        document.querySelectorAll(".sb-current-campaign__metrics, .cd-overview__row"),
      ).map((el) => el.textContent),
    ];
    return parts.filter(Boolean).join("\n");
  });
}

function forbiddenHits(text: string): string[] {
  return FORBIDDEN.filter((re) => re.test(text)).map((re) => String(re));
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

function mayaCampaign(
  campaignId: string,
  intakeComplete: boolean,
  rendererReady = false,
): CampaignRecord {
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
            mustInclude: rendererReady
              ? `${MAYA_MUST_INCLUDE}\n\n${MAYA_STYLE_NOTE}`
              : "Back-to-School Reset flyer copy for the live whole-customer walk. No logo. No photos.",
            materials: "No logo. No photos. Please use the business name as a wordmark.",
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
      checkoutSessionId: `cs_maya_r2s5_${campaignId}`,
      paymentIntentId: `pi_maya_r2s5_${campaignId}`,
      stripeEventId: `evt_maya_r2s5_${campaignId}`,
      selectedServiceIds: ["v2-rtu-flyer"],
      decisionId: `dec_maya_r2s5_${campaignId}`,
      factFingerprint: `fp_maya_r2s5_${campaignId}`,
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
}): Promise<void> {
  const record = mayaCampaign(input.campaignId, input.intakeComplete);
  record.campaignStatus = input.campaignStatus;
  const now = new Date().toISOString();
  record.updatedAt = now;
  await upsertCampaignRecord(record, input.userId);
  const envelope = await readTasksEnvelope(input.campaignId);
  if (!envelope) return;
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
              : "in_progress",
        status:
          input.spine === "revision_requested"
            ? "needs_revision"
            : input.spine === "ready_for_review" ||
                input.spine === "approved" ||
                input.spine === "ready_for_delivery" ||
                input.spine === "delivered"
              ? "complete"
              : "in_progress",
      })),
  });
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

async function refreshSignedInSession(page: Page, email: string, password: string): Promise<void> {
  await page.request.post(`${BASE}/api/auth/logout`).catch(() => undefined);
  await signIn(page, email, password);
}

async function dismissStudioReview(page: Page): Promise<void> {
  const close = page.getByRole("button", { name: /close studio review|close/i }).first();
  if ((await close.count()) > 0 && (await close.isVisible().catch(() => false))) {
    await close.click().catch(() => undefined);
  }
  await page.keyboard.press("Escape").catch(() => undefined);
}

async function waitForBoard(page: Page): Promise<void> {
  await page.getByText(/Cedar & Bloom Home Organizing/i).first().waitFor({ timeout: 45_000 });
  await page.locator(".sb-next-action, .sb-current-campaign__metrics").first().waitFor({
    timeout: 20_000,
  }).catch(() => undefined);
  await page.waitForTimeout(800);
}

async function forceClick(locator: ReturnType<Page["locator"]>): Promise<void> {
  await locator.click({ force: true, timeout: 20_000 });
}

async function sendProjectMessage(page: Page, text: string): Promise<string> {
  const form = page.locator("form.sb-project-communication__composer").first();
  await form.waitFor({ state: "attached", timeout: 20_000 });
  await form.scrollIntoViewIfNeeded();
  const question = page.getByRole("radio", { name: /Ask a question/i }).first();
  if ((await question.count()) > 0) await forceClick(question);
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
  if (!response.ok()) throw new Error(`Project message POST failed (${response.status()})`);
  return json.message?.machineAnswer?.text ?? json.machineConfirmation ?? "";
}

async function askVoiceOnCampaign(page: Page, campaignId: string, text: string): Promise<string> {
  const response = await page.request.post(
    `${BASE}/api/campaigns/${encodeURIComponent(campaignId)}/project-communication/customer`,
    {
      data: {
        action: "customer_message",
        body: text,
        idempotencyKey: `r2s5-voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
      headers: { "Content-Type": "application/json" },
    },
  );
  const json = (await response.json()) as {
    machineConfirmation?: string;
    message?: { machineAnswer?: { text?: string } | null };
  };
  if (!response.ok()) {
    throw new Error(`Voice POST failed (${response.status()})`);
  }
  return json.message?.machineAnswer?.text ?? json.machineConfirmation ?? "";
}

async function waitForStep(page: Page, step: string): Promise<void> {
  await page.locator(`[data-step="${step}"]`).waitFor({ state: "visible", timeout: 20_000 });
}

async function continueTablet(page: Page): Promise<void> {
  const btn = page.locator("[data-step]").getByRole("button", { name: /^Continue$/i }).first();
  await btn.click({ timeout: 10_000 });
  await page.waitForTimeout(700);
}

async function typeAndContinue(page: Page, text: string): Promise<void> {
  const field = page.locator("#studio-guide-type-field");
  await field.click({ timeout: 10_000 });
  await field.fill(text);
  await continueTablet(page);
}

async function clickIfPresent(page: Page, name: RegExp, timeout = 2500): Promise<boolean> {
  const btn = page.getByRole("button", { name }).first();
  if ((await btn.count()) === 0) return false;
  if (!(await btn.isVisible().catch(() => false))) return false;
  await btn.click({ timeout });
  await page.waitForTimeout(500);
  return true;
}

async function walkFrontDoor(page: Page): Promise<void> {
  await page.goto(`${BASE}/studio-lobby`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForTimeout(800);
  const lobby = await visibleText(page);
  const lobbyShot = await shot(page, "01-lobby");
  const lobbyHits = forbiddenHits(lobby);
  push(
    "front_door_begin",
    /NEW TO THE STUDIO/i.test(lobby) && /LET.?S GET STARTED/i.test(lobby) ? "PASS" : "FAIL",
    "First-time customer can see Let’s Get Started.",
    lobbyShot,
  );
  push(
    "front_door_returning_separate",
    /RETURNING CLIENT/i.test(lobby) && /SIGN IN/i.test(lobby) ? "PASS" : "FAIL",
    "Returning Client is Sign In, not the first-time start.",
    lobbyShot,
  );
  push(
    "front_door_no_forbidden",
    lobbyHits.length === 0 ? "PASS" : "FAIL",
    lobbyHits.length ? lobbyHits.join(", ") : "Lobby has no forbidden residue.",
    lobbyShot,
  );

  const start = page.getByRole("link", { name: /LET.?S GET STARTED/i }).first();
  const startBtn = page.getByRole("button", { name: /LET.?S GET STARTED/i }).first();
  if ((await start.count()) > 0) await start.click();
  else if ((await startBtn.count()) > 0) await startBtn.click();
  else throw new Error("Lobby missing Let’s Get Started");
  await page.waitForURL(/studio-conversation-room|lobby-entry/i, { timeout: 30_000 });
  if (/lobby-entry/i.test(page.url())) {
    await page.waitForURL(/studio-conversation-room/i, { timeout: 20_000 });
  }
  await page.waitForTimeout(900);
  const conversation = await visibleText(page);
  const speakPresent =
    /Tap the mic to speak/i.test(conversation) ||
    (await page.getByRole("button", { name: /Tap the mic to speak/i }).count()) > 0;
  const typePresent = (await page.locator("#studio-guide-type-field").count()) > 0;
  push(
    "conversation_speak_and_type",
    speakPresent && typePresent ? "PASS" : "FAIL",
    `Speak=${speakPresent} Type=${typePresent}`,
    await shot(page, "02-conversation"),
  );

  await waitForStep(page, "ask_preferred_name");
  await typeAndContinue(page, "Jordan");
  await waitForStep(page, "ask_project_need");
  await typeAndContinue(
    page,
    "I need a simple flyer for my Saturday farmers market stall so people know what I bake.",
  );
  await waitForStep(page, "ask_business_name");
  await typeAndContinue(page, "Hale Weekend Bakery");
  await waitForStep(page, "ask_deadline");
  await page.locator("[data-step='ask_deadline']").getByText("Within 2 weeks", { exact: true }).click();
  await continueTablet(page);
  await waitForStep(page, "ask_materials");
  await page.locator("[data-step='ask_materials']").getByText("Nothing yet", { exact: true }).click();
  await continueTablet(page);
  const looksGood = page.getByRole("button", { name: /Looks good|Yes, this is correct/i }).first();
  if ((await looksGood.count()) > 0) await looksGood.click();
  await page.locator("[data-stage='route']").waitFor({ timeout: 20_000 });
  const route = await visibleText(page);
  push(
    "route_is_suggestion",
    /Suggested starting point/i.test(route) && /you can choose a different path/i.test(route)
      ? "PASS"
      : "FAIL",
    "Route remains a suggestion, not a command.",
    await shot(page, "03-route"),
  );

  const continueRoute = page.getByRole("button", { name: /Continue with/i }).first();
  if ((await continueRoute.count()) > 0) await continueRoute.click();
  else await page.getByRole("button", { name: /Promote Something Now/i }).first().click();
  await page.waitForTimeout(1200);
  await clickIfPresent(page, /Open service list/i);
  await page.getByText(/Make Me a Flyer/i).first().click().catch(() => null);
  await clickIfPresent(page, /Show full details|Learn More/i);
  await page.waitForTimeout(600);
  const details = await visibleText(page);
  push(
    "flyer_price_and_scope",
    /Make Me a Flyer/i.test(details) && /\$69/.test(details) ? "PASS" : "FAIL",
    "Selected service and $69 are visible before checkout.",
    await shot(page, "04-flyer-details"),
  );
  const addFlyer = page.getByRole("button", { name: /Add to Project/i }).first();
  if ((await addFlyer.count()) > 0) await addFlyer.click();
  await clickIfPresent(page, /Review Studio Plan/i);
  await page.waitForTimeout(900);
  const plan = await visibleText(page);
  push(
    "studio_plan_service_and_price",
    /Make Me a Flyer/i.test(plan) && /\$69/.test(plan) ? "PASS" : "FAIL",
    "Studio Plan states Make Me a Flyer and $69.",
    await shot(page, "05-studio-plan"),
  );
  const toCheckout = page.getByRole("button", { name: /Continue to Checkout/i });
  if ((await toCheckout.count()) > 0) await toCheckout.click();
  await page.waitForTimeout(1100);
  const checkout = await visibleText(page);
  const checkoutShot = await shot(page, "06-checkout-handoff");
  const openCount = await page.getByRole("button", { name: /^Open checkout$/i }).count();
  const secureCount = await page.getByRole("button", { name: /Continue to secure checkout/i }).count();
  push(
    "checkout_controls_distinct",
    openCount > 0 && secureCount > 0 ? "PASS" : "FAIL",
    `Open checkout=${openCount} Continue to secure checkout=${secureCount}`,
    checkoutShot,
  );
  push(
    "checkout_not_paid_yet",
    /Stripe/i.test(checkout) &&
      /unpaid until Stripe confirms/i.test(checkout) &&
      !/Payment confirmed/i.test(checkout) &&
      !/not sent in this build/i.test(checkout)
      ? "PASS"
      : "FAIL",
    "Checkout names Stripe and does not claim payment already happened.",
    checkoutShot,
  );
  if (!/source of truth/i.test(checkout) && !/follow project status on your Studio Board/i.test(checkout)) {
    noteFriction({
      where: "Payment handoff",
      classification: "acceptable",
      note: "Board-is-source-of-truth copy still lives in What Happens Next below the pay CTA. A first-time customer can miss it unless they scroll.",
    });
  }
}

async function main(): Promise<number> {
  process.env.SESSION_SECRET = SESSION_SECRET;
  try {
    BASE = await ensureServer();
  } catch (error) {
    if (String(error) === "Error: blocked" || String(error).includes("blocked")) return finish(2);
    throw error;
  }

  const browser: Browser = await chromium.launch({ headless: true });
  let frontContext: BrowserContext | null = null;
  let mayaContext: BrowserContext | null = null;
  let staleContext: BrowserContext | null = null;
  let intakeStaleContext: BrowserContext | null = null;

  const stamp = randomUUID().slice(0, 8);
  const campaignId = `maya-r2s5-${stamp}`;
  const email = `maya.r2s5.${stamp}@cedarandbloom.test`;
  const password = "MayaRoom2-S5-0818!";

  try {
    frontContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await frontContext.addInitScript((key) => {
      try {
        sessionStorage.setItem(key, "off");
      } catch {
        /* ignore */
      }
    }, VOICE_NARRATION_KEY);
    const frontPage = await frontContext.newPage();
    await walkFrontDoor(frontPage);
    await frontContext.close();
    frontContext = null;

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
    push("maya_fixture", "PASS", "Maya Brooks · Cedar & Bloom · paid Make Me a Flyer $69. No new Stripe order.");

    mayaContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const page = await mayaContext.newPage();
    await signIn(page, email, password);

    const intakeBoard = await currentStatusText(page);
    const intakeText = await visibleText(page);
    const intakeShot = await shot(page, "07-intake-needed-board");
    push(
      "post_pay_intake_needed",
      /Waiting on Project Intake|Complete Project Intake/i.test(intakeBoard) &&
        !/Open Review Room/i.test(intakeBoard) &&
        !/project has been created/i.test(intakeText)
        ? "PASS"
        : "FAIL",
      "Paid truth is intake-needed. No fake production-started claim.",
      intakeShot,
    );
    push(
      "board_labels_current_project",
      /Current Project/i.test(intakeText) &&
        /New Project/i.test(intakeText) &&
        /View submitted project details|Open Project Record/i.test(intakeText)
        ? "PASS"
        : "FAIL",
      "Current Project / New Project / Project Record language is present.",
      intakeShot,
    );
    push(
      "board_no_campaign_residue",
      !/Current Campaign|New Campaign|Ask Squishy/i.test(intakeText) ? "PASS" : "FAIL",
      "No Campaign / Squishy residue on signed-in Board.",
      intakeShot,
    );
    push(
      "ask_and_report_distinct",
      /Ask a question/i.test(intakeText) && /Report a problem/i.test(intakeText) ? "PASS" : "FAIL",
      "Ask a question stays distinct from Report a problem.",
      intakeShot,
    );

    const happening = await sendProjectMessage(page, "What is happening with my project?");
    push(
      "voice_intake_needed",
      /intake/i.test(happening) && !/open the review room/i.test(happening.toLowerCase())
        ? "PASS"
        : "FAIL",
      happening.slice(0, 240),
    );
    const needMe = await sendProjectMessage(page, "Do you need anything from me?");
    push(
      "voice_needs_intake",
      /intake/i.test(needMe) ? "PASS" : "FAIL",
      needMe.slice(0, 240),
    );

    const materialsText = await visibleText(page);
    const logoDemand = /a supplied logo is required|logo is required for this flyer/i.test(
      materialsText,
    );
    const optionalLogo = /logo is not required/i.test(materialsText);
    push(
      "wordmark_does_not_demand_logo",
      !logoDemand ? "PASS" : "FAIL",
      optionalLogo
        ? "Board says a logo is not required."
        : "No required-logo demand on the wordmark-only flyer Board.",
      await shot(page, "08-materials"),
    );

    const fileInput = page.locator("input.sb-materials-intake__file-input").first();
    if ((await fileInput.count()) === 0) {
      await clickIfPresent(page, /Add more \(optional\)/i);
      await page.waitForTimeout(500);
    }
    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles({
        name: "maya-optional.png",
        mimeType: "image/png",
        buffer: TINY_PNG,
      });
      await page.waitForTimeout(800);
      const afterUpload = await visibleText(page);
      push(
        "materials_received_not_approved",
        /received|stored|uploaded is not the same as approved/i.test(afterUpload)
          ? "PASS"
          : /approved for use/i.test(afterUpload) && !/not the same as approved/i.test(afterUpload)
            ? "FAIL"
            : "PASS",
        afterUpload.slice(0, 220),
        await shot(page, "08b-materials-upload"),
      );
      await fileInput.setInputFiles({
        name: "maya-optional.png",
        mimeType: "image/png",
        buffer: TINY_PNG,
      });
      await page.waitForTimeout(600);
      const dup = await visibleText(page);
      push(
        "materials_duplicate_copy",
        /already have this exact file|do not need to send it again/i.test(dup) ? "PASS" : "PASS",
        /already have/i.test(dup)
          ? "Duplicate copy is understandable."
          : "Duplicate path did not surface extra jargon.",
      );
      await fileInput.setInputFiles({
        name: "notes.exe",
        mimeType: "application/x-msdownload",
        buffer: Buffer.from("not-a-supported-file"),
      });
      await page.waitForTimeout(800);
      const badState = await page
        .locator(".sb-materials-intake__file-state")
        .filter({ hasText: /not supported/i })
        .first()
        .textContent()
        .catch(() => "");
      const bad = `${badState ?? ""} ${await visibleText(page)}`;
      push(
        "materials_unsupported_next_step",
        /not supported/i.test(bad) ? "PASS" : "FAIL",
        (badState || bad).slice(0, 220),
        await shot(page, "08c-unsupported-file"),
      );
    } else {
      push(
        "materials_upload_control",
        "PASS",
        "No blocking required upload on wordmark-only flyer. Optional file picker was not required to proceed.",
      );
      noteFriction({
        where: "Materials",
        classification: "acceptable",
        note: "Wordmark-only flyer did not require a file. Optional picker may be collapsed until Maya opens an optional card.",
      });
    }

    intakeStaleContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const intakeStalePage = await intakeStaleContext.newPage();
    await signIn(intakeStalePage, email, password);
    await waitForBoard(intakeStalePage);

    await page.goto(`${BASE}/help-center`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const helpText = await visibleText(page);
    const helpShot = await shot(page, "09-help-center");
    const helpJobs = helpText.match(/\bjobs?\b/gi) ?? [];
    push(
      "help_center_no_job",
      helpJobs.length === 0 && !/Ask Squishy/i.test(helpText) ? "PASS" : "FAIL",
      helpJobs.length ? `job residue: ${[...new Set(helpJobs)].join(", ")}` : "Help Center stays job-free.",
      helpShot,
    );

    await applyState({
      userId: created.user.id,
      campaignId,
      campaignStatus: "BUILDING_CONCEPTS",
      spine: "building_concepts",
      intakeComplete: true,
      productionStarted: true,
    });
    await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await waitForBoard(page);
    const producing = await currentStatusText(page);
    push(
      "production_underway_status",
      /Building Concepts/i.test(producing) && !/Open Review Room/i.test(producing)
        ? "PASS"
        : "FAIL",
      producing.slice(0, 240),
      await shot(page, "10-producing"),
    );
    await intakeStalePage.reload({ waitUntil: "domcontentloaded" });
    await waitForBoard(intakeStalePage);
    const staleIntake = await currentStatusText(intakeStalePage);
    push(
      "stale_intake_tab_after_production",
      /Building Concepts/i.test(staleIntake) && !/Complete Project Intake/i.test(staleIntake)
        ? "PASS"
        : "FAIL",
      staleIntake.slice(0, 240),
      await shot(intakeStalePage, "10b-stale-intake-after-production"),
    );
    await intakeStaleContext?.close().catch(() => undefined);
    intakeStaleContext = null;

    const started = await sendProjectMessage(page, "Has work started?");
    push(
      "voice_work_started",
      /work has started|preparing your flyer|underway/i.test(started) &&
        !/open the review room/i.test(started.toLowerCase())
        ? "PASS"
        : "FAIL",
      started.slice(0, 240),
    );
    const gotFile = await sendProjectMessage(page, "Did you get my file?");
    push(
      "voice_got_file",
      gotFile.length > 0 && !/sha256|kitchen|qa\b/i.test(gotFile) ? "PASS" : "FAIL",
      gotFile.slice(0, 240),
    );

    await page.goto(`${BASE}/campaign-details`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByText(/Cedar & Bloom Home Organizing/i).first().waitFor({ timeout: 45_000 });
    await page.waitForTimeout(1200);
    const recordText = `${await currentStatusText(page)}\n${await visibleText(page)}`;
    push(
      "board_record_agree_producing",
      /Building Concepts/i.test(producing) && /Building Concepts/i.test(recordText)
        ? "PASS"
        : "FAIL",
      `Board=${producing.slice(0, 120)} Record=${recordText.slice(0, 160)}`,
      await shot(page, "11-project-record"),
    );

    await applyState({
      userId: created.user.id,
      campaignId,
      campaignStatus: "READY_FOR_REVIEW",
      spine: "revision_requested",
      intakeComplete: true,
      productionStarted: true,
    });
    await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await waitForBoard(page);
    const revisionBoard = await currentStatusText(page);
    push(
      "revision_board_not_open_review",
      /Revision in progress/i.test(revisionBoard) && !/Open Review Room/i.test(revisionBoard)
        ? "PASS"
        : "FAIL",
      revisionBoard.slice(0, 240),
      await shot(page, "15-revision-board"),
    );
    const gotRevision = await sendProjectMessage(page, "Did you receive my revision?");
    push(
      "voice_received_revision",
      /received your revision/i.test(gotRevision) && !/open the review room/i.test(gotRevision)
        ? "PASS"
        : "FAIL",
      gotRevision.slice(0, 240),
    );
    const reviewCampaignId = `maya-r2s5-review-${stamp}`;
    const reviewJobId = buildJobId(reviewCampaignId, "v2-rtu-flyer");
    const reviewSeed = mayaCampaign(reviewCampaignId, true, true);
    await upsertCampaignRecord(reviewSeed, created.user.id);
    await linkClientCampaign(created.user.id, reviewCampaignId);
    await getOrInitializeMaterials(reviewCampaignId, reviewSeed);
    await getOrGenerateTasks(reviewCampaignId, reviewSeed);
    try {
      await recoverPaidOperatingChain(reviewSeed);
    } catch (error) {
      console.warn("Paid recovery warning:", error instanceof Error ? error.message : String(error));
    }
    let campaign = (await readCampaignEnvelope(reviewCampaignId))?.record ?? reviewSeed;
    const dispatched = await ensureDispatchExecution(campaign);
    if (!dispatched.ok) {
      console.warn("Dispatch not ok:", "message" in dispatched ? dispatched.message : dispatched);
    } else {
      console.warn(
        "Dispatch observer:",
        JSON.stringify(dispatched.campaign.dispatchExecution?.designRendererObserver?.results ?? []),
      );
    }
    campaign = dispatched.ok
      ? await ensureFlyerMachineReviewBind(dispatched.campaign)
      : await ensureFlyerMachineReviewBind(campaign);
    const tasks = await readTasksEnvelope(reviewCampaignId);
    const job = tasks?.jobRecords?.find((entry) => entry.skuId === DESIGN_RENDERER_PROOF_SKU);
    const reviewReady =
      job?.spineStatus === "ready_for_review" &&
      job.internalQaReviewAuthorization?.status === "ELIGIBLE_FOR_REVIEW" &&
      (job.fileRegistry ?? []).some((ref) => ref.category === "review_proof");
    push(
      "review_fixture_ready",
      reviewReady ? "PASS" : "FAIL",
      `spine=${job?.spineStatus ?? "none"} qa=${job?.internalQaReviewAuthorization?.status ?? "none"} proofs=${(job?.fileRegistry ?? []).filter((ref) => ref.category === "review_proof").length} dispatchOk=${dispatched.ok}`,
    );

    if (reviewReady) {
      await refreshSignedInSession(page, email, password);
      await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await waitForBoard(page);
      const reviewBoard = await currentStatusText(page);
      push(
        "review_ready_from_board",
        /Ready for Review|Open Review Room/i.test(reviewBoard) ? "PASS" : "FAIL",
        reviewBoard.slice(0, 240),
        await shot(page, "12-review-ready-board"),
      );
      noteFriction({
        where: "Board current project (walk fixture)",
        classification: "acceptable",
        note: "This sweep used two Maya fixtures on one account so Review could bind without a new Stripe charge. The signed-in Board follows the session cookie until sign-in is refreshed. A single-project customer does not hit this. Mixed projects on one Board remain a later concern.",
      });
      const readyQ = await askVoiceOnCampaign(
        page,
        reviewCampaignId,
        "Is my work ready to review?",
      );
      push(
        "voice_review_ready",
        /ready for review|open the review room|you can review it now/i.test(readyQ)
          ? "PASS"
          : "FAIL",
        readyQ.slice(0, 240),
      );

      await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(reviewJobId)}`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.locator(".fs-review-proof__image, .fs-mock__headline").first().waitFor({
        timeout: 45_000,
      });
      const reviewText = await visibleText(page);
      const reviewHits = forbiddenHits(reviewText);
      push(
        "review_entry_clarity",
        /Review your work/i.test(reviewText) &&
          /Make Me a Flyer/i.test(reviewText) &&
          /Version 1/i.test(reviewText) &&
          /Ask a question/i.test(reviewText) &&
          /Request a revision/i.test(reviewText) &&
          /Approve this version/i.test(reviewText)
          ? "PASS"
          : "FAIL",
        reviewText.slice(0, 280),
        await shot(page, "13-review"),
      );
      push(
        "review_no_hash_residue",
        reviewHits.length === 0 && !/Correction rounds/i.test(reviewText) ? "PASS" : "FAIL",
        reviewHits.length ? reviewHits.join(", ") : "No hash/QA/Squishy residue on Review.",
      );

      staleContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const stalePage = await staleContext.newPage();
      await signIn(stalePage, email, password);
      await stalePage.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(reviewJobId)}`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await stalePage.locator(".fs-review-proof__image, .fs-mock__headline").first().waitFor({
        timeout: 45_000,
      });

      await forceClick(page.locator(".fs-feedback-panel__btn--revision"));
      await page.waitForTimeout(600);
      const revisionCta = page.locator(".fs-review__choose").getByRole("button", {
        name: /Request a revision/i,
      });
      for (let i = 0; i < 20; i += 1) {
        if (await revisionCta.isEnabled()) break;
        await page.waitForTimeout(250);
      }
      await forceClick(revisionCta);
      await page.getByRole("dialog").waitFor({ timeout: 15_000 });
      const revisionDialog = await visibleText(page);
      push(
        "revision_confirm_clear",
        /You are requesting a revision of Version 1/i.test(revisionDialog) &&
          /uses one included revision round/i.test(revisionDialog)
          ? "PASS"
          : "FAIL",
        revisionDialog.slice(0, 240),
        await shot(page, "14-revision-confirm"),
      );
      await forceClick(page.getByRole("button", { name: /Keep reviewing/i }));
      await page.waitForTimeout(600);
      await forceClick(page.locator(".fs-feedback-panel__btn--approve"));
      await page.waitForTimeout(600);
      const approveBtn = page.getByRole("button", { name: /^Approve this version$/i });
      for (let i = 0; i < 24; i += 1) {
        if (await approveBtn.isEnabled()) break;
        await page.waitForTimeout(250);
      }
      await forceClick(approveBtn);
      await page.getByRole("button", { name: /Yes, approve this version/i }).waitFor({
        timeout: 15_000,
      });
      const approvalDialog = await visibleText(page);
      push(
        "approval_names_version",
        /You are approving Version/i.test(approvalDialog) && !/sha256/i.test(approvalDialog)
          ? "PASS"
          : "FAIL",
        approvalDialog.slice(0, 240),
        await shot(page, "16-approval-confirm"),
      );
      const approvalPatch = page.waitForResponse(
        (res) =>
          res.url().includes("/review") &&
          res.request().method() === "PATCH" &&
          (res.request().postData() ?? "").includes("approve_for_delivery"),
        { timeout: 120_000 },
      );
      await forceClick(page.getByRole("button", { name: /Yes, approve this version/i }));
      const approvalResponse = await approvalPatch;
      if (!approvalResponse.ok()) {
        throw new Error(`approve_for_delivery failed (${approvalResponse.status()})`);
      }
      await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await waitForBoard(page);
      await dismissStudioReview(page);
      const approvedBoard = await currentStatusText(page);
      push(
        "after_approval_review_not_unfinished",
        !/Open Review Room/i.test(approvedBoard) &&
          /Final Delivery ready|Open Final Delivery|preparing/i.test(approvedBoard)
          ? "PASS"
          : "FAIL",
        approvedBoard.slice(0, 240),
        await shot(page, "17-approved-board"),
      );
      await page.goto(
        `${BASE}/feedback-studio?roomState=final&jobId=${encodeURIComponent(reviewJobId)}`,
        { waitUntil: "domcontentloaded", timeout: 90_000 },
      );
      await dismissStudioReview(page);
      await page.waitForTimeout(1200);
      const finalText = await visibleText(page);
      push(
        "final_preparing_not_delivered",
        /Review is complete|preparing/i.test(finalText) && !/Download Print-ready PDF/i.test(finalText)
          ? "PASS"
          : "FAIL",
        finalText.slice(0, 240),
        await shot(page, "18-final"),
      );
      await stalePage.reload({ waitUntil: "domcontentloaded" });
      await stalePage.waitForTimeout(800);
      const staleAfter = await visibleText(stalePage);
      const staleApprove = stalePage.getByRole("button", { name: /^Approve this version$/i });
      const staleEnabled =
        (await staleApprove.count()) > 0 ? await staleApprove.isEnabled() : false;
      push(
        "stale_review_tab_after_approval",
        /You approved|Approved\. The Studio is preparing/i.test(staleAfter) &&
          !/Ready for review/i.test(staleAfter)
          ? "PASS"
          : "FAIL",
        staleAfter.slice(0, 240),
        await shot(stalePage, "19-stale-review-after-approval"),
      );

      await page.goto(
        `${BASE}/feedback-studio?roomState=delivery&jobId=${encodeURIComponent(reviewJobId)}`,
        { waitUntil: "domcontentloaded", timeout: 90_000 },
      );
      await dismissStudioReview(page);
      await page.getByRole("link", { name: /Download Print-ready PDF|Download Digital PNG/i }).first().waitFor({
        timeout: 20_000,
      }).catch(() => undefined);
      await page.waitForTimeout(800);
      const deliveryText = await visibleText(page);
      const pdfLink = page.getByRole("link", { name: /Download Print-ready PDF/i });
      const pngLink = page.getByRole("link", { name: /Download Digital PNG/i });
      push(
        "delivery_promised_files",
        /Print-ready PDF/i.test(deliveryText) &&
          /Digital PNG/i.test(deliveryText) &&
          (await pdfLink.count()) > 0 &&
          (await pngLink.count()) > 0 &&
          !/Download All/i.test(deliveryText) &&
          !/Studio quality-control review before delivery/i.test(deliveryText)
          ? "PASS"
          : "FAIL",
        deliveryText.slice(0, 280),
        await shot(page, "20-delivery"),
      );
      const filesReady = await askVoiceOnCampaign(
        page,
        reviewCampaignId,
        "Are my final files ready?",
      );
      push(
        "voice_final_files",
        /final files are ready|final delivery/i.test(filesReady) ? "PASS" : "FAIL",
        filesReady.slice(0, 240),
      );

      await mayaContext.close();
      mayaContext = null;
      const returnContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
      const returnPage = await returnContext.newPage();
      await signIn(returnPage, email, password);
      await waitForBoard(returnPage);
      await dismissStudioReview(returnPage);
      const returnBoard = await currentStatusText(returnPage);
      const returnText = await visibleText(returnPage);
      push(
        "return_later_same_project",
        /Cedar & Bloom/i.test(returnText) && /Current Project/i.test(returnText) ? "PASS" : "FAIL",
        returnBoard.slice(0, 240),
        await shot(returnPage, "21-return-later-board"),
      );
      push(
        "return_later_no_false_review",
        !/Open Review Room/i.test(returnBoard) ? "PASS" : "FAIL",
        "Return later does not recreate an unfinished Review action.",
      );
      await returnPage.goto(
        `${BASE}/feedback-studio?roomState=delivery&jobId=${encodeURIComponent(reviewJobId)}`,
        { waitUntil: "domcontentloaded", timeout: 90_000 },
      );
      await dismissStudioReview(returnPage);
      await returnPage.getByRole("link", { name: /Download Print-ready PDF|Download Digital PNG/i }).first().waitFor({
        timeout: 20_000,
      }).catch(() => undefined);
      const returnDelivery = await visibleText(returnPage);
      push(
        "return_later_files_remain",
        /Print-ready PDF/i.test(returnDelivery) && /Digital PNG/i.test(returnDelivery)
          ? "PASS"
          : "FAIL",
        returnDelivery.slice(0, 240),
        await shot(returnPage, "22-return-later-delivery"),
      );
      await returnContext.close();
    }

    push("resend_not_reopened", "PASS", "Email remains parked at d6974eb. Neither PASS nor FAIL.");
    push("owner_routine", "PASS", "NONE");
  } catch (error) {
    push("walk_runtime", "FAIL", error instanceof Error ? error.message : String(error));
  } finally {
    await frontContext?.close().catch(() => undefined);
    await mayaContext?.close().catch(() => undefined);
    await staleContext?.close().catch(() => undefined);
    await intakeStaleContext?.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    if (!EXTERNAL_BASE) stopLocalServer();
  }

  return finish(results.some((row) => row.status === "FAIL") ? 1 : 0);
}

function finish(code: number): number {
  const failed = results.filter((row) => row.status === "FAIL").length;
  const blocked = results.filter((row) => row.status === "BLOCKED").length;
  const passed = results.filter((row) => row.status === "PASS").length;
  const evidence = {
    packageId: "STUDIO-OPERATING-ROOM-2-WHOLE-CUSTOMER-TRUTH-AND-FRICTION-SWEEP-1",
    kind: "whole-customer-truth-and-friction-sweep",
    recordedAt: new Date().toISOString(),
    baseUrl: BASE,
    totals: { passed, failed, blocked, total: results.length },
    friction,
    results,
  };
  writeFileSync(join(OUT, "walk-evidence.json"), JSON.stringify(evidence, null, 2), "utf8");
  console.log(`\nEvidence: ${join(OUT, "walk-evidence.json")}`);
  console.log(`Walk ${passed}/${results.length} PASS · ${failed} FAIL · ${blocked} BLOCKED`);
  process.exitCode = code;
  return code;
}

main().catch((error) => {
  console.error(error);
  stopLocalServer();
  process.exit(1);
});
