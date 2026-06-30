/**
 * Owner Console Slice 1 — screenshot capture for pre-commit review
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET in .env.local
 *
 * Usage: node scripts/capture-owner-console-slice1.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp", "owner-console-slice1-screenshots");
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const OWNER_CONSOLE_ROUTE = "/file-room/owner-console";

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };

const VIEWPORT_LAPTOP = { width: 1440, height: 900 };
const VIEWPORT_PHONE = { width: 390, height: 844 };

const OUT = {
  laptop: path.join(OUT_DIR, "01-owner-console-laptop.png"),
  phone: path.join(OUT_DIR, "02-owner-console-phone.png"),
  card: path.join(OUT_DIR, "03-waiting-on-you-card.png"),
  empty: path.join(OUT_DIR, "04-empty-state.png"),
};

/** @param {string} campaignId @param {string} campaignName */
function buildCampaign(campaignId, campaignName) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName,
    businessName: `${campaignName} LLC`,
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Owner Console Slice 1 screenshot seed",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001"],
      includedServiceIds: ["sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 50000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 50000,
      lineItems: [
        {
          skuId: "sm-001",
          serviceName: "Social Media Launch Set",
          billingType: "one_time",
          exactPriceCents: 50000,
          priceDisplay: "$500",
          deliverables: ["Posts", "Content calendar"],
          exclusions: [],
          timingWindowLabel: "2 weeks",
          revisionRule: "1 round",
          clientResponsibilities: ["Brand logo and photos"],
          executionResponsibility: "shared",
        },
      ],
      approvedAt: now,
    },
    selectedCampaignOption: "Option A",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: {
        workingOn: "Owner Console capture",
        mainOffer: "Summer launch",
        primaryApproverName: "Client",
        primaryApproverEmail: "client@local.dev",
      },
      files: [],
      submittedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

class CookieJar {
  /** @type {Map<string, string>} */
  #cookies = new Map();
  clear() {
    this.#cookies.clear();
  }
  /** @param {string | null | undefined} setCookieHeader */
  absorb(setCookieHeader) {
    if (!setCookieHeader) return;
    const parts = setCookieHeader.split(/,(?=\s*[^;]+=[^;]+)/);
    for (const part of parts) {
      const [pair] = part.split(";");
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (!value) this.#cookies.delete(name);
      else this.#cookies.set(name, value);
    }
  }
  header() {
    if (this.#cookies.size === 0) return "";
    return [...this.#cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

const jar = new CookieJar();

/** @param {string} urlPath @param {RequestInit & { json?: unknown }} [options] */
async function fetchApi(urlPath, options = {}) {
  const headers = new Headers(options.headers ?? {});
  const cookie = jar.header();
  if (cookie) headers.set("Cookie", cookie);
  let body = options.body;
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }
  const res = await fetch(`${BASE}${urlPath}`, { ...options, headers, body, redirect: "manual" });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) for (const c of setCookie) jar.absorb(c);
  else jar.absorb(res.headers.get("set-cookie"));
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 500) };
  }
  return { status: res.status, json, text };
}

/** @param {{ email: string; password: string }} credentials */
async function loginApi(credentials) {
  jar.clear();
  const res = await fetchApi("/api/auth/login", { method: "POST", json: credentials });
  if (res.status !== 200) throw new Error(`Login failed for ${credentials.email}: ${res.status}`);
}

/** @param {import('playwright').BrowserContext} context @param {{ email: string; password: string }} credentials */
async function loginBrowserContext(context, credentials) {
  const res = await context.request.post(`${BASE}/api/auth/login`, { data: credentials });
  if (!res.ok()) throw new Error(`Playwright login failed: ${res.status()}`);
}

/** @param {string} campaignId @param {string} campaignName */
async function seedCampaignShell(campaignId, campaignName) {
  await loginApi(OWNER_LOGIN);
  const syncRes = await fetchApi("/api/campaigns/current", {
    method: "PATCH",
    json: { record: buildCampaign(campaignId, campaignName) },
  });
  if (syncRes.status !== 200) {
    throw new Error(`Campaign sync failed: ${syncRes.status} ${JSON.stringify(syncRes.json)}`);
  }
  await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  await fetchApi(`/api/campaigns/${campaignId}/materials`);
}

/** @param {string} campaignId */
async function seedPopulatedExceptions(campaignId) {
  await loginApi(OWNER_LOGIN);

  const mcf = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "raise_exception",
      kind: "missing_client_fact",
      title: "OC-S1: Brand hex codes missing",
      description: "Copy blocked — client palette not confirmed for launch posts.",
      taskId: "sm-001:copy",
      clientRequestDraft: {
        exactClientOnlyItem: "Official brand hex codes for primary and secondary colors",
        whyBlocksWork: "Copy and creative cannot finalize color-accurate launch assets.",
        whyTeamCannotSolveInternally:
          "Team cannot infer exact brand colors from low-res social screenshots.",
      },
    },
  });
  if (mcf.status !== 200) {
    throw new Error(`missing_client_fact raise failed: ${mcf.status} ${JSON.stringify(mcf.json)}`);
  }

  const compliance = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "raise_exception",
      kind: "compliance_hold",
      title: "OC-S1: Unverified savings claim",
      description: "QA flagged promotional language pending Owner compliance review.",
      taskId: "sm-001:copy",
    },
  });
  if (compliance.status !== 200) {
    throw new Error(`compliance_hold raise failed: ${compliance.status}`);
  }

  const clientReq = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "raise_exception",
      kind: "client_request",
      title: "OC-S1: Need vector logo file",
      clientRequestDraft: {
        exactClientOnlyItem: "Vector logo (SVG or AI)",
        whyBlocksWork: "Required before creative production can start.",
      },
    },
  });
  if (clientReq.status !== 200) {
    throw new Error(`client_request raise failed: ${clientReq.status}`);
  }
}

/** Clear owner-waiting exceptions across all on-disk task files for empty-state capture. */
async function clearAllOwnerWaitingExceptions() {
  let files = [];
  try {
    files = (await readdir(TASKS_DIR)).filter((name) => name.endsWith(".json"));
  } catch {
    return;
  }

  for (const file of files) {
    const filePath = path.join(TASKS_DIR, file);
    const envelope = JSON.parse(await readFile(filePath, "utf8"));
    const records = envelope.exceptionRecords ?? [];
    if (records.length === 0) continue;

    let changed = false;
    for (const record of records) {
      if (
        record.status === "waiting_owner" ||
        (record.status === "open" &&
          (record.kind === "missing_client_fact" || record.kind === "client_request"))
      ) {
        record.status = "resolved";
        record.resolvedAt = new Date().toISOString();
        record.resolvedByUserId = "tagia";
        record.resolvedByDisplayName = "Owner";
        record.resolutionNotes = "Cleared for Owner Console empty-state screenshot";
        changed = true;
      }
    }

    if (changed) {
      envelope.updatedAt = new Date().toISOString();
      envelope.syncedAt = envelope.updatedAt;
      await writeFile(filePath, JSON.stringify(envelope, null, 2));
    }
  }
}

/** @param {import('playwright').Page} page */
async function waitForOwnerConsole(page) {
  await page.waitForSelector(".fr-owner-console-header__title", { timeout: 30000 });
  await page.waitForSelector("text=Owner Console", { timeout: 15000 });
}

/** @param {import('playwright').Page} page */
async function waitForPopulatedConsole(page) {
  await waitForOwnerConsole(page);
  await page.waitForSelector(".fr-owner-console-grid", { timeout: 30000 });
  await page.waitForSelector(".fr-owner-console-card", { timeout: 15000 });
}

/** @param {import('playwright').Page} page */
async function waitForEmptyConsole(page) {
  await waitForOwnerConsole(page);
  await page.waitForSelector(".fr-exceptions__empty", { timeout: 30000 });
  await page.waitForSelector("text=Nothing waiting on you", { timeout: 15000 });
}

/** @param {import('playwright').Page} page */
async function captureFrPage(page, filePath) {
  const root = page.locator(".fr-page");
  await root.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(400);
  await root.screenshot({ path: filePath });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const populatedCampaignId = `owner-console-s1-${randomUUID().slice(0, 8)}`;
  const emptyCampaignId = `owner-console-empty-${randomUUID().slice(0, 8)}`;

  await seedCampaignShell(populatedCampaignId, "Owner Console Slice 1 Capture");
  await clearAllOwnerWaitingExceptions();
  await seedPopulatedExceptions(populatedCampaignId);

  await seedCampaignShell(emptyCampaignId, "Owner Console Empty Capture");

  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge",
  });

  try {
    // 01 — laptop
    const laptopContext = await browser.newContext({ viewport: VIEWPORT_LAPTOP });
    await loginBrowserContext(laptopContext, OWNER_LOGIN);
    const laptopPage = await laptopContext.newPage();
    await laptopPage.goto(`${BASE}${OWNER_CONSOLE_ROUTE}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await waitForPopulatedConsole(laptopPage);
    await captureFrPage(laptopPage, OUT.laptop);
    await laptopContext.close();

    // 02 — phone
    const phoneContext = await browser.newContext({ viewport: VIEWPORT_PHONE });
    await loginBrowserContext(phoneContext, OWNER_LOGIN);
    const phonePage = await phoneContext.newPage();
    await phonePage.goto(`${BASE}${OWNER_CONSOLE_ROUTE}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await waitForPopulatedConsole(phonePage);
    await captureFrPage(phonePage, OUT.phone);
    await phoneContext.close();

    // 03 — decision card detail (missing_client_fact selected)
    const cardContext = await browser.newContext({ viewport: VIEWPORT_LAPTOP });
    await loginBrowserContext(cardContext, OWNER_LOGIN);
    const cardPage = await cardContext.newPage();
    await cardPage.goto(`${BASE}${OWNER_CONSOLE_ROUTE}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await waitForPopulatedConsole(cardPage);

    const mcfQueueItem = cardPage.locator(".fr-owner-console-queue__item", {
      hasText: "OC-S1: Brand hex codes missing",
    });
    await mcfQueueItem.first().click();
    await cardPage.waitForSelector(".fr-owner-console-actions", { timeout: 15000 });

    const fieldLabels = [
      "What happened",
      "Why Owner",
      "Recommended next action",
      "Impact if no action",
      "Actions",
      "Where work goes after",
    ];
    for (const label of fieldLabels) {
      await cardPage.waitForSelector(`text=${label}`, { timeout: 10000 });
    }

    const actionButtons = cardPage.locator(".fr-owner-console-actions .utility-btn");
    const actionCount = await actionButtons.count();
    if (actionCount < 2) {
      throw new Error(`Expected action buttons on decision card, found ${actionCount}`);
    }

    const detailPanel = cardPage.locator(".fr-owner-console-grid__detail");
    await detailPanel.screenshot({ path: OUT.card });
    await cardContext.close();

    // 04 — empty state (clear all owner-waiting exceptions on disk)
    await clearAllOwnerWaitingExceptions();

    const emptyContext = await browser.newContext({ viewport: VIEWPORT_LAPTOP });
    await loginBrowserContext(emptyContext, OWNER_LOGIN);
    const emptyPage = await emptyContext.newPage();
    await emptyPage.goto(`${BASE}${OWNER_CONSOLE_ROUTE}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await waitForEmptyConsole(emptyPage);
    await captureFrPage(emptyPage, OUT.empty);
    await emptyContext.close();

    const readme = [
      "Owner Console Slice 1 screenshots",
      "",
      `Login: ${OWNER_LOGIN.email} / ${OWNER_LOGIN.password}`,
      "",
      "Campaign IDs:",
      `  Populated queue: ${populatedCampaignId}`,
      `  Empty seed (no exceptions): ${emptyCampaignId}`,
      "",
      "URLs:",
      `  Owner Console: ${BASE}${OWNER_CONSOLE_ROUTE}`,
      "",
      "Viewports:",
      `  01 laptop: ${VIEWPORT_LAPTOP.width}x${VIEWPORT_LAPTOP.height} @ 100% device scale`,
      `  02 phone:  ${VIEWPORT_PHONE.width}x${VIEWPORT_PHONE.height} @ 100% device scale`,
      `  03 card:   ${VIEWPORT_LAPTOP.width}x${VIEWPORT_LAPTOP.height} — detail panel crop`,
      `  04 empty:  ${VIEWPORT_LAPTOP.width}x${VIEWPORT_LAPTOP.height} @ 100% device scale`,
      "",
      "Screenshots:",
      `  ${OUT.laptop}`,
      `  ${OUT.phone}`,
      `  ${OUT.card}`,
      `  ${OUT.empty}`,
      "",
      "Notes:",
      "  Before capture, resolves existing waiting_owner rows in data/campaign-tasks/*.json.",
      "  Populated seed raises missing_client_fact, compliance_hold, and client_request.",
      "  Empty state capture resolves all waiting_owner exceptions again.",
      "",
      `Captured: ${new Date().toISOString()}`,
    ].join("\n");

    await writeFile(path.join(OUT_DIR, "README.txt"), readme, "utf8");

    console.log(`Populated campaign: ${populatedCampaignId}`);
    console.log(`Empty campaign: ${emptyCampaignId}`);
    for (const [key, filePath] of Object.entries(OUT)) {
      console.log(`  ${key}: ${filePath}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
