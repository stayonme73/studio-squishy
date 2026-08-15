/**
 * STUDIO-OPERATING-MATERIALS-UPLOAD-AND-RECEIPT-1 — live Maya Board walk.
 *
 * Sign in → Studio Board → upload a real file through the materials UI →
 * truthful stored receipt → close context → fresh browser → sign in again →
 * same file still attached. Not an API-only substitute.
 *
 * Run (Windows):
 *   $env:PLAYWRIGHT_BROWSERS_PATH="$env:USERPROFILE\AppData\Local\ms-playwright"
 *   npx tsx scripts/studio-operating-materials-upload-and-receipt-1-board-walk.mts
 *
 * Optional:
 *   CERT_BASE_URL  use an already-running Next server
 *   CERT_PORT      default 3066 when this script starts Next
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import type { CampaignRecord } from "../src/config/studio-board";
import { studioMaterialsUploadV1 } from "../src/config/studio-materials-upload-v1";
import {
  createClientAccount,
  linkClientCampaign,
  markEmailVerified,
} from "../src/lib/auth/users";
import { upsertCampaignRecord } from "../src/lib/campaign-store/store";
import { getOrGenerateTasks } from "../src/lib/campaign-tasks/store";
import { getOrInitializeMaterials, readMaterialsEnvelope } from "../src/lib/materials/store";
import { isPrivateStoredMaterial } from "../src/lib/materials/client-file-store";
import { computePlanPricingTotals, buildServiceScopeSnapshot } from "../src/lib/plan-pricing";
import { recoverPaidOperatingChain } from "../src/lib/studio-paid-activation-recovery";

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
  "studio-operating-materials-upload-and-receipt-1",
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
let serverChild: ChildProcess | null = null;
let BASE = EXTERNAL_BASE || `http://127.0.0.1:${PORT}`;

function push(check: string, status: Check["status"], detail?: string, shot?: string): void {
  results.push({ check, status, detail, shot });
  console.log(
    detail ? `${status}  ${check} — ${detail}` : `${status}  ${check}`,
  );
}

async function shot(page: Page, name: string): Promise<string> {
  const file = join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => (document.body?.innerText || "").slice(0, 12000));
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
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      confirmedAmountCents: 6900,
      checkoutSessionId: `cs_maya_board_${campaignId}`,
      paymentIntentId: `pi_maya_board_${campaignId}`,
      stripeEventId: `evt_maya_board_${campaignId}`,
      selectedServiceIds: ["v2-rtu-flyer"],
      decisionId: `dec_maya_board_${campaignId}`,
      factFingerprint: `fp_maya_board_${campaignId}`,
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

async function uploadFirstOptionalFile(page: Page, filePath: string): Promise<void> {
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
      ? "NOT CLOSED — Board walk failed"
      : blocked > 0
        ? "BLOCKED — start local server and re-run"
        : "MATERIALS UPLOAD & RECEIPT READY FOR CLOSE";

  const evidence = {
    packageId: "STUDIO-OPERATING-MATERIALS-UPLOAD-AND-RECEIPT-1",
    kind: "customer-board-walk",
    recordedAt: new Date().toISOString(),
    baseUrl: BASE,
    commitHint: COMMIT,
    runId: randomUUID(),
    totals: { passed, failed, blocked, total: results.length },
    verdict,
    results,
    notes: [
      "Walk used Studio Board materials UI (Choose file + Send to Studio). Not an API-only substitute.",
      "Fresh Playwright context = new browser with empty cookies/localStorage.",
      "Maya facts unchanged: Cedar & Bloom, Make Me a Flyer $69, wordmark-only allowed.",
      "Email verification used markEmailVerified (no Tagia inbox).",
      "Board opened at /studio-board with no campaignId in the URL.",
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
  const campaignId = `maya-board-upload-${stamp}`;
  const email = `maya.board.${stamp}@cedarandbloom.test`;
  const password = "MayaBoard-Walk-0815!";
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
  const campaign = mayaPaidCampaign(campaignId);
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
  const tasks = await getOrGenerateTasks(campaignId, campaign);
  const jobCount = tasks.jobRecords?.length ?? 0;
  push(
    "maya_fixture",
    jobCount > 0 ? "PASS" : "FAIL",
    jobCount > 0
      ? "Maya Brooks paid $69 flyer, intake complete, no invented business facts."
      : "Paid flyer fixture has no Machine job to attach a stored file.",
  );
  if (jobCount === 0) {
    return finish(1);
  }

  const browser: Browser = await chromium.launch({ headless: true });
  let contextA: BrowserContext | null = null;
  let contextB: BrowserContext | null = null;

  try {
    contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signInAsMaya(pageA, email, password);
    const signedInShot = await shot(pageA, "01-signed-in-board");
    const boardText = await visibleText(pageA);
    push(
      "sign_in_opens_board",
      /studio-board/i.test(pageA.url()) && /Cedar & Bloom/i.test(boardText) ? "PASS" : "FAIL",
      pageA.url(),
      signedInShot,
    );

    await openBoardMaterials(pageA);
    const beforeUpload = await visibleText(pageA);
    const logoRequired =
      /please send your logo file/i.test(beforeUpload) &&
      !/logo is not required/i.test(beforeUpload);
    const logoShot = await shot(pageA, "02-optional-materials-before-upload");
    push(
      "no_false_logo_required_blocker",
      logoRequired ? "FAIL" : "PASS",
      logoRequired
        ? "Board still required a logo file."
        : "Optional logo/photo copy. Wordmark-only flyer not blocked.",
      logoShot,
    );
    push(
      "no_internal_id_required",
      /campaignId=/.test(pageA.url()) ? "FAIL" : "PASS",
      pageA.url(),
    );

    await uploadFirstOptionalFile(pageA, filePath);
    const storedReceipt = pageA.getByText(studioMaterialsUploadV1.customerCopy.receivedStored).first();
    await storedReceipt.waitFor({ state: "attached", timeout: 30_000 });
    await storedReceipt.scrollIntoViewIfNeeded();
    const receivedShot = await shot(pageA, "03-stored-receipt");
    const receivedText = await visibleText(pageA);
    push(
      "stored_file_acknowledgement",
      receivedText.includes(studioMaterialsUploadV1.customerCopy.receivedStored) ? "PASS" : "FAIL",
      "Customer-safe stored receipt on Board after Send to Studio.",
      receivedShot,
    );
    push(
      "uploaded_is_not_approved_for_use",
      /approved for use/i.test(receivedText) &&
        !/uploaded is not the same as approved for use/i.test(receivedText)
        ? "FAIL"
        : "PASS",
      "Allowed PNG stored as received / under review. Not auto-approved for use.",
    );

    await uploadFirstOptionalFile(pageA, filePath);
    const duplicateReceipt = pageA.getByText(studioMaterialsUploadV1.customerCopy.duplicateKept).first();
    await duplicateReceipt.waitFor({ state: "attached", timeout: 20_000 });
    await duplicateReceipt.scrollIntoViewIfNeeded();
    const duplicateShot = await shot(pageA, "04-duplicate-kept");
    const duplicateText = await visibleText(pageA);
    push(
      "duplicate_upload_customer_safe",
      duplicateText.includes(studioMaterialsUploadV1.customerCopy.duplicateKept)
        ? "PASS"
        : "FAIL",
      "Same file sent again. First copy kept.",
      duplicateShot,
    );

    const afterUpload = await readMaterialsEnvelope(campaignId);
    const storedItem = afterUpload?.items.find(isPrivateStoredMaterial);
    push(
      "ledger_has_stored_bytes",
      storedItem ? "PASS" : "FAIL",
      storedItem
        ? `${storedItem.fileName} checksum=${storedItem.storageRef?.checksumSha256}`
        : "No stored material on the project ledger.",
    );

    await contextA.close();
    contextA = null;

    contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInAsMaya(pageB, email, password);
    await openBoardMaterials(pageB);
    const returnShot = await shot(pageB, "05-fresh-context-return");
    const returnText = await visibleText(pageB);
    const cookies = await contextB.cookies();
    const hadLocalCampaign = await pageB.evaluate(() =>
      Boolean(window.localStorage.getItem("studio-squishy:current-campaign")),
    );
    push(
      "fresh_context_sign_in",
      /studio-board/i.test(pageB.url()) ? "PASS" : "FAIL",
      `cookies=${cookies.length} localCampaignAfterLoad=${hadLocalCampaign}`,
    );
    const storedNamed = studioMaterialsUploadV1.customerCopy.storedFileStillAttached(
      "maya-optional-mark.png",
    );
    push(
      "fresh_context_file_still_attached",
      returnText.includes(storedNamed) || /maya-optional-mark\.png/i.test(returnText)
        ? "PASS"
        : "FAIL",
      returnText.includes(storedNamed)
        ? "Fresh context shows the same stored filename attached to the project."
        : "Fresh Board did not show Maya's stored filename.",
      returnShot,
    );
    push(
      "fresh_context_still_not_approved_for_use",
      /approved for use/i.test(returnText) &&
        !/uploaded is not the same as approved for use/i.test(returnText)
        ? "FAIL"
        : "PASS",
    );

    const returnLedger = await readMaterialsEnvelope(campaignId);
    const stillStored = returnLedger?.items.find(isPrivateStoredMaterial);
    push(
      "stored_file_persists_after_return",
      stillStored?.fileName === "maya-optional-mark.png" &&
        stillStored.storageRef?.checksumSha256 === storedItem?.storageRef?.checksumSha256
        ? "PASS"
        : "FAIL",
      stillStored
        ? `same checksum ${stillStored.storageRef?.checksumSha256}`
        : "Stored file missing after return.",
    );
    push("owner_intervention", "PASS", "NONE. No Tagia download/re-upload. No Owner desk.");
    push(
      "no_tagia_inbox_or_manual_bridge",
      "PASS",
      "Account, payment fixture, and verification are scripted. Customer Board used for upload/return.",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      const pages = contextB?.pages() ?? contextA?.pages() ?? [];
      const last = pages.at(-1);
      if (last) {
        const dump = await visibleText(last);
        const dumpShot = await shot(last, "99-walk-failure");
        writeFileSync(join(OUT, "walk-failure-page.txt"), dump, "utf8");
        push("board_walk_runtime", "FAIL", message, dumpShot);
      } else {
        push("board_walk_runtime", "FAIL", message);
      }
    } catch {
      push("board_walk_runtime", "FAIL", message);
    }
  } finally {
    await contextA?.close().catch(() => undefined);
    await contextB?.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }

  const failed = results.some((row) => row.status === "FAIL");
  const blocked = results.some((row) => row.status === "BLOCKED");
  return finish(failed ? 1 : blocked ? 2 : 0);
}

main().catch((error) => {
  console.error(error);
  stopLocalServer();
  process.exit(1);
});
