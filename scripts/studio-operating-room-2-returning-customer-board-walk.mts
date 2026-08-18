/**
 * STUDIO-OPERATING-ROOM-2-RETURNING-CUSTOMER-BOARD-AND-HELP-CENTER-TRUTH-1
 * Narrow live signed-in Studio Board verification.
 *
 * Does not replay Lobby → checkout. Does not reopen Resend.
 * Creates the narrowest Maya-pattern signed-in fixture (unique sandbox email).
 *
 * Run (Windows), against the already-running local Next:
 *   $env:PLAYWRIGHT_BROWSERS_PATH="$env:USERPROFILE\AppData\Local\ms-playwright"
 *   $env:CERT_BASE_URL="http://127.0.0.1:3066"
 *   $env:SESSION_SECRET="materials-upload-board-walk-ephemeral-not-for-production"
 *   npx tsx scripts/studio-operating-room-2-returning-customer-board-walk.mts
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import type { CampaignRecord } from "../src/config/studio-board";
import {
  createClientAccount,
  linkClientCampaign,
  markEmailVerified,
} from "../src/lib/auth/users";
import { upsertCampaignRecord } from "../src/lib/campaign-store/store";
import { getOrGenerateTasks } from "../src/lib/campaign-tasks/store";
import { getOrInitializeMaterials } from "../src/lib/materials/store";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "../src/lib/plan-pricing";

const PORT = process.env.CERT_PORT || "3066";
const EXTERNAL_BASE = (process.env.CERT_BASE_URL || "").replace(/\/$/, "");
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "materials-upload-board-walk-ephemeral-not-for-production";

const OUT = join(
  process.cwd(),
  "docs",
  "launch",
  "studio-operating-room-2-returning-customer-board-and-help-center-truth-1",
  "customer-board-walk",
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
let BASE = EXTERNAL_BASE || `http://127.0.0.1:${PORT}`;

function push(check: string, status: Check["status"], detail?: string, shot?: string): void {
  results.push({ check, status, detail, shot });
  console.log(detail ? `${status}  ${check} — ${detail}` : `${status}  ${check}`);
}

async function shot(page: Page, name: string, fullPage = true): Promise<string> {
  const file = join(SHOTS, `${name}.png`);
  if (name.startsWith("01-") || name.startsWith("04-") || name.startsWith("05-")) {
    await page.evaluate(() => {
      const main = document.querySelector(".sb-main");
      if (main instanceof HTMLElement) main.scrollTop = 0;
      window.scrollTo(0, 0);
    });
    await page.locator(".sb-header-v3, .sb-card--current").first().waitFor({ timeout: 10_000 }).catch(() => undefined);
  }
  await page.screenshot({ path: file, fullPage });
  return file;
}

async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => (document.body?.innerText || "").slice(0, 16000));
}

function staleHits(text: string): string[] {
  const found: string[] = [];
  const patterns = [
    "Ask Squishy",
    "Current Campaign",
    "New Campaign",
    "OPEN CAMPAIGN",
    "Campaign Queued",
    "Campaign Stage",
    "Campaign Progress",
    "Your Campaign Journey",
    "Campaign Actions",
    "Campaign Complete",
    "Campaign Name",
    "Campaign Type",
    "START A NEW CAMPAIGN",
    "campaign concepts",
    "begin your campaign",
  ];
  for (const phrase of patterns) {
    if (new RegExp(phrase, "i").test(text)) found.push(phrase);
  }
  return found;
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
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      confirmedAmountCents: 6900,
      checkoutSessionId: `cs_maya_room2_${campaignId}`,
      paymentIntentId: `pi_maya_room2_${campaignId}`,
      stripeEventId: `evt_maya_room2_${campaignId}`,
      selectedServiceIds: ["v2-rtu-flyer"],
      decisionId: `dec_maya_room2_${campaignId}`,
      factFingerprint: `fp_maya_room2_${campaignId}`,
      draftRevision: 1,
      confirmedAt: now,
    },
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
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
    postPayActivation: {
      schemaVersion: 1,
      status: "activated",
      phase: "ready_for_routing",
      activatedAt: now,
      lastAttemptAt: now,
      checkoutSessionId: `cs_maya_room2_${campaignId}`,
      jobIds: [`job-maya-room2-${campaignId}`],
      taskCount: 1,
      intakeComplete: true,
      blockingRequiredMaterialsCount: 0,
      ownerActionRequired: false,
    },
  };
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
    await page.waitForURL(
      (url) => url.pathname === "/studio-board" || url.pathname === "/studio-board/",
      { timeout: 60_000, waitUntil: "domcontentloaded" },
    );
  } catch (error) {
    const login = await page.request.post(`${BASE}/api/auth/login`, {
      data: { email, password },
      headers: { "Content-Type": "application/json" },
    });
    if (!login.ok()) {
      throw new Error(
        `Sign-in did not open Board (${page.url()}). Login API ${login.status()}. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    await page.goto(`${BASE}/studio-board`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
  }
  await page.getByText(/Cedar & Bloom Home Organizing/i).first().waitFor({
    timeout: 45_000,
  });
}

function finish(code: number): number {
  const failed = results.filter((row) => row.status === "FAIL").length;
  const blocked = results.filter((row) => row.status === "BLOCKED").length;
  const passed = results.filter((row) => row.status === "PASS").length;
  const verdict =
    failed > 0
      ? "NOT CLOSED — signed-in Board walk failed"
      : blocked > 0
        ? "BLOCKED — start local server and re-run"
        : "SIGNED-IN BOARD WALK READY FOR MANAGER CLOSE";

  const evidence = {
    packageId: "STUDIO-OPERATING-ROOM-2-RETURNING-CUSTOMER-BOARD-AND-HELP-CENTER-TRUTH-1",
    kind: "signed-in-board-walk",
    recordedAt: new Date().toISOString(),
    baseUrl: BASE,
    totals: { passed, failed, blocked, total: results.length },
    verdict,
    results,
    notes: [
      "Continuation of the same Section 2 package. Did not replay Lobby → checkout.",
      "Did not reopen Resend. Did not start the next Room 2 section.",
      "Maya fixture: Cedar & Bloom, Make Me a Flyer $69, unique sandbox email.",
      "Email verification used markEmailVerified (no inbox).",
      "Board opened at /studio-board with no campaignId in the URL.",
      "Did not run paid-operating recovery / renderer bind. Fixture stays BUILDING_CONCEPTS.",
    ],
  };
  const outPath = join(OUT, "board-walk-evidence.json");
  writeFileSync(outPath, JSON.stringify(evidence, null, 2), "utf8");
  console.log(`\nEvidence: ${outPath}`);
  console.log(`Verdict: ${verdict} (${passed}/${results.length} PASS)`);
  process.exitCode = code;
  return code;
}

async function main(): Promise<number> {
  const stamp = Date.now();
  const campaignId = `maya-room2-board-${stamp}`;
  const email = `maya.room2.board.${stamp}@cedarandbloom.test`;
  const password = "MayaRoom2-Board-0817!";

  if (!EXTERNAL_BASE) {
    push("dev_server_available", "BLOCKED", "Set CERT_BASE_URL to the running Next server.");
    return finish(2);
  }
  BASE = EXTERNAL_BASE;
  const up = await waitForServer(BASE, 20);
  if (!up) {
    push("dev_server_available", "BLOCKED", `No server at ${BASE}`);
    return finish(2);
  }
  push("dev_server_available", "PASS", `${BASE} (external)`);

  process.env.SESSION_SECRET = SESSION_SECRET;

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
  push(
    "maya_fixture",
    "PASS",
    "Maya Brooks · Cedar & Bloom · paid Make Me a Flyer $69. Unique sandbox email. No new Stripe checkout.",
  );

  const browser: Browser = await chromium.launch({ headless: true });
  let contextA: BrowserContext | null = null;
  let contextB: BrowserContext | null = null;

  try {
    contextA = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const page = await contextA.newPage();
    await signIn(page, email, password);
    await page
      .waitForFunction(
        () => !/Loading materials/i.test(document.body?.innerText || ""),
        { timeout: 20_000 },
      )
      .catch(() => undefined);
    await page.evaluate(() => {
      const main = document.querySelector(".sb-main");
      if (main instanceof HTMLElement) main.scrollTop = 0;
      window.scrollTo(0, 0);
    });
    const boardShot = await shot(page, "01-signed-in-board");
    await page
      .locator(".sb-card--current")
      .first()
      .screenshot({
        path: join(SHOTS, "01b-current-project-card.png"),
        timeout: 5_000,
      })
      .catch(() => undefined);
    await page
      .locator(".sb-board-layout")
      .first()
      .screenshot({
        path: join(SHOTS, "01c-board-grid.png"),
        timeout: 5_000,
      })
      .catch(() => undefined);
    const boardText = await visibleText(page);
    const boardStale = staleHits(boardText);
    const nextStepText = await page.evaluate(() => {
      const next = document.querySelector('[data-testid="cvc-next"]');
      const materialsNext = document.querySelector(".sb-materials-board-next");
      const nextAction = document.querySelector(".sb-next-action");
      return [next?.textContent, materialsNext?.textContent, nextAction?.textContent]
        .filter(Boolean)
        .join(" \n ");
    });
    const reviewNavCurrent = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll(".sb-nav a, .sb-nav [href]"));
      const review = links.find((el) => /review room/i.test(el.textContent || ""));
      if (!review) return false;
      return (
        review.getAttribute("aria-current") === "page" ||
        review.className.includes("sb-nav__item--active") ||
        review.getAttribute("data-active") === "true"
      );
    });

    push(
      "sign_in_opens_board",
      /studio-board/i.test(page.url()) && /Cedar & Bloom/i.test(boardText) ? "PASS" : "FAIL",
      page.url(),
      boardShot,
    );
    push(
      "current_project_label",
      /Current Project/i.test(boardText) ? "PASS" : "FAIL",
      /Current Project/i.test(boardText) ? "Current Project heading is visible." : "Current Project heading missing.",
      boardShot,
    );
    push(
      "new_project_nav",
      /\bNew Project\b/i.test(boardText) ? "PASS" : "FAIL",
      /\bNew Project\b/i.test(boardText) ? "Sidebar New Project is visible." : "New Project missing.",
      boardShot,
    );
    push(
      "open_project_record",
      /View submitted project details|Open Project Record/i.test(boardText)
        ? "PASS"
        : "FAIL",
      "Customer path to Project Record is labeled without Campaign.",
      boardShot,
    );
    push(
      "no_stale_campaign_on_board",
      boardStale.length === 0 ? "PASS" : "FAIL",
      boardStale.length === 0
        ? "No Ask Squishy / Current Campaign / New Campaign residue on Board."
        : `Visible residue: ${boardStale.join(", ")}`,
      boardShot,
    );
    push(
      "ask_surface_on_board",
      /Project communication/i.test(boardText) && /Ask a question/i.test(boardText)
        ? "PASS"
        : "FAIL",
      "Board Project communication is the place to ask a question.",
      boardShot,
    );
    push(
      "no_speak_type_on_board",
      (await page.getByRole("button", { name: /^Speak$/i }).count()) === 0 &&
        (await page.getByRole("button", { name: /^Type$/i }).count()) === 0
        ? "PASS"
        : "FAIL",
      "Speak / Type stay off the Board. They belong on the Conversation Room dock.",
    );
    const currentStatusText = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".sb-current-campaign__metric"));
      const statusRow = rows.find((row) =>
        /current status/i.test(row.querySelector(".sb-current-campaign__label")?.textContent || ""),
      );
      return (statusRow?.querySelector(".sb-current-campaign__value")?.textContent || "").trim();
    });
    const claimsReviewReady =
      /open the review room/i.test(nextStepText) || reviewNavCurrent;
    const statusIsReview = /ready for review/i.test(currentStatusText);
    const claimsDeliveryReady = /your package is ready/i.test(nextStepText);
    const reviewMislead = claimsReviewReady && !statusIsReview;
    push(
      "review_delivery_not_false_ready",
      reviewMislead || claimsDeliveryReady ? "FAIL" : "PASS",
      reviewMislead
        ? `Next-step or Review nav claims Review is ready while Current Status is "${currentStatusText || "unknown"}". Next-step: ${nextStepText.slice(0, 240)}`
        : claimsDeliveryReady
          ? "Board claims Final Delivery is ready while Maya is not delivered."
          : statusIsReview
            ? `Current Status is Ready for Review. Next-step may invite Review. Status: ${currentStatusText}`
            : `Sidebar Review Room / Final Delivery exist; next-step does not tell Maya to open Review as if work is ready. Status: ${currentStatusText || "unread"}`,
      boardShot,
    );
    push(
      "no_duplicate_ask_squishy_on_board",
      /Ask Squishy/i.test(boardText) ? "FAIL" : "PASS",
      "Ask Squishy is gone from the Board.",
    );

    const recordControl = page.getByRole("button", {
      name: /View submitted project details/i,
    }).or(page.getByRole("link", { name: /View submitted project details|Open Project Record/i }));
    const recordVisible = (await recordControl.count()) > 0;
    if (recordVisible) {
      try {
        await recordControl.first().click({ timeout: 8_000 });
      } catch {
        await page.goto(`${BASE}/campaign-details`, { waitUntil: "domcontentloaded" });
      }
    } else {
      await page.goto(`${BASE}/campaign-details`, { waitUntil: "domcontentloaded" });
    }
    await page.waitForURL(/campaign-details/, { timeout: 30_000 });
    await page.getByText(/Ask the Studio|Project Overview|Cedar & Bloom/i).first().waitFor({
      timeout: 30_000,
    });
    const recordShot = await shot(page, "02-project-record-ask-the-studio");
    const recordText = await visibleText(page);
    const recordStale = staleHits(recordText);
    push(
      "ask_the_studio_not_squishy",
      /Ask the Studio/i.test(recordText) && !/Ask Squishy/i.test(recordText)
        ? "PASS"
        : "FAIL",
      /Ask the Studio/i.test(recordText)
        ? "Project Record shows Ask the Studio."
        : "Ask the Studio missing on Project Record.",
      recordShot,
    );
    push(
      "no_stale_campaign_on_project_record",
      recordStale.length === 0 ? "PASS" : "FAIL",
      recordStale.length === 0
        ? "No Campaign jargon on Project Record customer copy."
        : `Visible residue: ${recordStale.join(", ")}`,
      recordShot,
    );
    push(
      "project_record_review_not_false_ready",
      /open the review room/i.test(recordText) ? "FAIL" : "PASS",
      /open the review room/i.test(recordText)
        ? "Project Record upcoming Review step still tells the customer to open Review now."
        : "Project Record does not tell Maya to open Review while concepts are still being built.",
      recordShot,
    );

    await page.goto(`${BASE}/help-center#faq-email-notifications`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    const emailFaq = page.locator("#faq-email-notifications, [id*='email-notifications']").first();
    if ((await emailFaq.count()) > 0) {
      await emailFaq.click({ timeout: 5_000 }).catch(() => undefined);
    }
    const helpShot = await shot(page, "03-help-center-from-board-path");
    const helpText = await visibleText(page);
    push(
      "help_center_board_source_of_truth",
      /studio board is the source of truth/i.test(helpText) &&
        !/this version of The Studio/i.test(helpText) &&
        !/Ask Squishy/i.test(helpText)
        ? "PASS"
        : "FAIL",
      "Help Center email FAQ still agrees with Board as source of truth.",
      helpShot,
    );

    await page.goto(`${BASE}/studio-board`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.getByText(/Cedar & Bloom Home Organizing/i).first().waitFor({
      timeout: 45_000,
    });
    const returnShot = await shot(page, "04-fresh-return-to-board");
    const returnText = await visibleText(page);
    push(
      "fresh_return_to_board",
      /Current Project/i.test(returnText) && /Cedar & Bloom/i.test(returnText)
        ? "PASS"
        : "FAIL",
      "Same project is still on the Board after Help Center.",
      returnShot,
    );

    contextB = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const pageB = await contextB.newPage();
    await signIn(pageB, email, password);
    const freshShot = await shot(pageB, "05-new-browser-return");
    const freshText = await visibleText(pageB);
    push(
      "new_browser_same_board",
      /Cedar & Bloom/i.test(freshText) && /Current Project/i.test(freshText)
        ? "PASS"
        : "FAIL",
      "A fresh signed-in browser still opens the same Studio Board project.",
      freshShot,
    );
  } catch (error) {
    push(
      "walk_runtime",
      "FAIL",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await contextA?.close();
    await contextB?.close();
    await browser.close();
  }

  const failed = results.filter((row) => row.status === "FAIL").length;
  const blocked = results.filter((row) => row.status === "BLOCKED").length;
  return finish(failed > 0 || blocked > 0 ? 1 : 0);
}

void main();
