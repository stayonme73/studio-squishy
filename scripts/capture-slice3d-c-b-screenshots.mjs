/**
 * Seed + capture Slice 3d-c-b screenshots
 * Usage: node scripts/capture-slice3d-c-b-screenshots.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp", "slice3d-c-b-screenshots");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const STAFF_PRODUCER_ID = "staff-producer-verify-3dc";

const OWNER = { email: "tagia@local.dev", password: "dev-only" };
const PRODUCER = { email: "producer-verify-3dc@local.dev", password: "dev-only" };

class CookieJar {
  /** @type {Map<string, string>} */
  #cookies = new Map();
  clear() {
    this.#cookies.clear();
  }
  absorb(setCookieHeader) {
    if (!setCookieHeader) return;
    for (const part of setCookieHeader.split(/,(?=\s*[^;]+=[^;]+)/)) {
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
    return [...this.#cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

const jar = new CookieJar();

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
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function loginApi(credentials) {
  jar.clear();
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
    redirect: "manual",
  });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status}`);
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) for (const c of setCookie) jar.absorb(c);
  else jar.absorb(res.headers.get("set-cookie"));

  const cookies = [];
  for (const [name, value] of jar.header().split("; ").map((pair) => pair.split("="))) {
    if (name && value) cookies.push({ name, value, url: BASE });
  }
  return cookies;
}

function buildCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 3d-c-b Screenshot Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Screenshot seed",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001"],
      includedServiceIds: ["sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 100000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 100000,
      lineItems: [
        {
          skuId: "sm-001",
          serviceName: "Social Media Launch Set",
          billingType: "one_time",
          exactPriceCents: 50000,
          priceDisplay: "$500",
          deliverables: ["Posts"],
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
    createdAt: now,
    updatedAt: now,
  };
}

async function seedCampaign(campaignId) {
  await writeFile(
    ASSIGNMENTS_PATH,
    JSON.stringify(
      {
        staffByUserId: { [STAFF_PRODUCER_ID]: [campaignId] },
        staffCapabilities: { [STAFF_PRODUCER_ID]: ["producer_dispatcher"] },
      },
      null,
      2,
    ),
  );
  await loginApi(OWNER);
  await fetchApi("/api/campaigns/current", {
    method: "PATCH",
    json: { record: buildCampaign(campaignId) },
  });
  await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  await fetchApi(`/api/campaigns/${campaignId}/materials`);

  await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "raise_exception",
      kind: "missing_client_fact",
      title: "Brand hex codes missing",
      description: "QA flagged palette gap — internal only",
    },
  });
  const logoRaise = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "raise_exception",
      kind: "client_request",
      title: "Need vector logo",
      clientRequestDraft: {
        exactClientOnlyItem: "Vector logo file",
        whyBlocksWork: "Needed for launch assets",
      },
    },
  });
  if (logoRaise.status !== 200) throw new Error("Logo raise failed");
  const logoId = logoRaise.json.exceptionRecords?.find((e) => e.title === "Need vector logo")?.id;
  const approveLogo = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "approve_client_request",
      exceptionId: logoId,
      category: "logo-brand",
      clientFacingLabel: "Logo file",
      clientFacingPrompt: "Please send your logo file",
      whyNeeded:
        "We need your logo file to keep your brand consistent across your Social Media Launch Set.",
      requirementLevel: "required",
      relatedServiceIds: ["sm-001"],
    },
  });
  if (approveLogo.status !== 200) throw new Error("Promote seed failed");

  await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "raise_exception",
      kind: "compliance_hold",
      title: "Compliance hold screenshot",
      description: "Non-promotable control row",
    },
  });
  const declineRaise = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "raise_exception",
      kind: "client_request",
      title: "Declined client request",
      clientRequestDraft: { exactClientOnlyItem: "Brand guidelines PDF" },
    },
  });
  const declinedId = declineRaise.json.exceptionRecords?.find(
    (e) => e.title === "Declined client request",
  )?.id;
  await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "decline_promotion",
      exceptionId: declinedId,
      notes: "Studio can source from discovery intake",
    },
  });
}

async function loginUi(context, credentials) {
  const cookies = await loginApi(credentials);
  await context.addCookies(cookies);
}

async function openExceptions(page, campaignId) {
  await page.goto(`${BASE}/file-room/${campaignId}#file-room-exceptions`, {
    waitUntil: "networkidle",
  });
  await page.locator("#file-room-exceptions").scrollIntoViewIfNeeded();
}

async function shot(page, name) {
  const filePath = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath });
  console.log(`saved ${filePath}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const campaignId = `verify-3dc-b-ui-${randomUUID().slice(0, 8)}`;
  console.log(`Seeding ${campaignId}`);
  await seedCampaign(campaignId);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 960 } });
  await loginUi(context, OWNER);
  const page = await context.newPage();

  await openExceptions(page, campaignId);

  const mcf = page.locator(".fr-exception-row", { hasText: "Brand hex codes missing" });
  await mcf.getByRole("button", { name: /Owner client-material review/i }).click();
  await shot(page, "01-owner-approval-panel-mcf");

  await page.locator(".fr-exception-promotion input.fr-exception-panel__input").first().fill(
    "Brand color confirmation (client-safe)",
  );
  await page
    .locator('section[aria-label="Client-facing wording"] textarea')
    .last()
    .fill("Internal team QA exception — before client send (edit example only)");
  await shot(page, "02-owner-edits-client-wording");

  await page.getByRole("button", { name: /Hold for internal review/i }).click();
  await page
    .locator(".fr-exception-promotion textarea")
    .filter({ hasNot: page.locator("[placeholder]") })
    .first()
    .fill("Internal team: verify palette against discovery intake before client send");
  await shot(page, "03-owner-hold-waiting-internal");

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: /Decline promotion/i }).click();
  await page.locator(".fr-exception-promotion textarea").last().fill(
    "Resolve internally — do not send to client",
  );
  await shot(page, "04-owner-decline-internal-reason");
  await browser.close();

  const producerBrowser = await chromium.launch({ headless: true });
  const producerContext = await producerBrowser.newContext({ viewport: { width: 1280, height: 960 } });
  await loginUi(producerContext, PRODUCER);
  const producerPage = await producerContext.newPage();
  await openExceptions(producerPage, campaignId);
  await producerPage.locator(".fr-exception-row", { hasText: "Brand hex codes missing" })
    .getByRole("button", { name: /View details/i }).click();
  await shot(producerPage, "05-producer-readonly-details");
  await producerBrowser.close();

  const ownerBrowser2 = await chromium.launch({ headless: true });
  const ownerContext2 = await ownerBrowser2.newContext({ viewport: { width: 1280, height: 960 } });
  await loginUi(ownerContext2, OWNER);
  const ownerPage2 = await ownerContext2.newPage();
  await openExceptions(ownerPage2, campaignId);
  const compliance = ownerPage2.locator(".fr-exception-row", { hasText: "Compliance hold screenshot" });
  await compliance.scrollIntoViewIfNeeded();
  await shot(ownerPage2, "06-non-promotable-no-approval-panel");

  const promoted = ownerPage2.locator(".fr-exception-row", { hasText: "Need vector logo" });
  await promoted.scrollIntoViewIfNeeded();
  await shot(ownerPage2, "07-already-promoted-readonly");

  const promotedDetails = promoted.locator(".fr-exception-promotion--readonly");
  await promotedDetails.scrollIntoViewIfNeeded();
  await shot(ownerPage2, "08-promoted-client-safe-wording");
  await ownerBrowser2.close();

  console.log(`campaignId=${campaignId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
