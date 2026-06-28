/**
 * Slice 2a+2b — File Room Materials section screenshot
 *
 * Seeds a custom Studio Plan campaign with mixed materials states, then captures
 * the Materials ledger section on the File Room campaign detail page.
 *
 * Prerequisites: dev server on localhost:3000 (or VERIFY_BASE_URL), SESSION_SECRET
 *
 * Usage: node scripts/capture-slice2-materials.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp");
const OUT_PATH = path.join(OUT_DIR, "slice2-materials-section.png");
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const MATERIALS_DIR = path.join(process.cwd(), "data", "campaign-materials");
const REPORT_PATH = path.join(OUT_DIR, "capture-slice2-materials-report.json");

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };

/** @param {string} campaignId */
function buildSlice2CampaignRecord(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 2 Materials Demo",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Materials ledger review capture",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    discoveryAnswers: {
      "your-business": "Harbor & Co.",
      "your-focus": "Marketing & growth",
    },
    discoverySubmittedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: ["bf-001", "vp-001", "sm-001"],
      includedServiceIds: ["bf-001", "vp-001", "sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 168500,
      monthlyTotalCents: 0,
      amountDueTodayCents: 168500,
      lineItems: [
        {
          skuId: "bf-001",
          serviceName: "Brand Identity Refresh",
          billingType: "one_time",
          exactPriceCents: 49500,
          priceDisplay: "$495",
          deliverables: ["Brand Direction Sheet", "Profile or cover graphic"],
          exclusions: [],
          timingWindowLabel: "2 weeks",
          revisionRule: "1 round",
          clientResponsibilities: [],
          executionResponsibility: "studio",
        },
        {
          skuId: "vp-001",
          serviceName: "Marketing Video Project",
          billingType: "one_time",
          exactPriceCents: 79500,
          priceDisplay: "$795",
          deliverables: ["One marketing video up to 60 seconds"],
          exclusions: [],
          timingWindowLabel: "3 weeks",
          revisionRule: "1 round",
          clientResponsibilities: [],
          executionResponsibility: "studio",
        },
        {
          skuId: "sm-001",
          serviceName: "Social Media Launch Set",
          billingType: "one_time",
          exactPriceCents: 39500,
          priceDisplay: "$395",
          deliverables: ["Up to six static social posts", "Content calendar"],
          exclusions: [],
          timingWindowLabel: "2 weeks",
          revisionRule: "1 round",
          clientResponsibilities: [],
          executionResponsibility: "studio",
        },
      ],
      approvedAt: now,
    },
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: {
        workingOn: "Spring product launch campaign",
        mainOffer: "Free consultation for new customers",
        destinationLink: "https://harbor-co.example.com/spring-offer",
        inspirationLinks: "https://pinterest.com/harbor-inspo",
        brandColorsFonts: "Navy #1A2B4C, sand #F4E8D8 — headings: Fraunces, body: Source Sans 3",
        socialPlatforms: "Instagram, Facebook",
        socialAccountLinks: "https://instagram.com/harborandco",
        emailPlatform: "Mailchimp",
        emailSender: "hello@harbor-co.example.com",
        primaryApproverName: "Jordan Lee",
        primaryApproverEmail: "jordan@harbor-co.example.com",
      },
      files: [
        {
          id: "file-logo-001",
          category: "logo",
          fileName: "harbor-co-logo-primary.svg",
          mimeType: "image/svg+xml",
          sizeBytes: 48210,
          uploadedAt: now,
        },
      ],
      submittedAt: now,
    },
    selectedCampaignOption: "Spring launch — social + video",
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

/**
 * @param {string} urlPath
 * @param {RequestInit & { json?: unknown }} [options]
 */
async function fetchApi(urlPath, options = {}) {
  const headers = new Headers(options.headers ?? {});
  const cookie = jar.header();
  if (cookie) headers.set("Cookie", cookie);

  let body = options.body;
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }

  const res = await fetch(`${BASE}${urlPath}`, {
    ...options,
    headers,
    body,
    redirect: "manual",
  });

  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) {
    for (const c of setCookie) jar.absorb(c);
  } else {
    jar.absorb(res.headers.get("set-cookie"));
  }

  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 500) };
  }

  return { status: res.status, json, text };
}

async function login() {
  const res = await fetchApi("/api/auth/login", { method: "POST", json: OWNER_LOGIN });
  if (res.status !== 200) throw new Error(`Login failed: HTTP ${res.status}`);
}

/** @param {string} campaignId */
async function seedCampaign(campaignId) {
  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  await mkdir(MATERIALS_DIR, { recursive: true });
  await rm(path.join(MATERIALS_DIR, `${campaignId}.json`), { force: true });

  const record = buildSlice2CampaignRecord(campaignId);
  const syncRes = await fetchApi("/api/campaigns/current", {
    method: "PATCH",
    json: { record },
  });
  if (syncRes.status !== 200) {
    throw new Error(`Campaign sync failed: HTTP ${syncRes.status} ${JSON.stringify(syncRes.json)}`);
  }

  const materialsRes = await fetchApi(`/api/campaigns/${campaignId}/materials`);
  if (materialsRes.status !== 200) {
    throw new Error(`Materials init failed: HTTP ${materialsRes.status}`);
  }

  return { record, materials: materialsRes.json };
}

/**
 * Patch one submitted logo slot to approved_for_use so the screenshot shows usable vs missing.
 * @param {string} campaignId
 */
async function patchApprovedLogoSlot(campaignId) {
  const materialsPath = path.join(MATERIALS_DIR, `${campaignId}.json`);
  const envelope = JSON.parse(await readFile(materialsPath, "utf8"));
  const logoItem = envelope.items.find(
    (item) =>
      item.category === "logo-brand" &&
      item.relatedServiceIds?.includes("bf-001") &&
      item.reviewStatus === "submitted",
  );
  if (logoItem) {
    logoItem.reviewStatus = "approved_for_use";
  }
  await writeFile(materialsPath, JSON.stringify(envelope, null, 2), "utf8");
}

async function captureScreenshot(campaignId) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });

  const loginRes = await page.request.post(`${BASE}/api/auth/login`, {
    data: OWNER_LOGIN,
  });
  if (!loginRes.ok()) throw new Error(`Playwright login failed: HTTP ${loginRes.status()}`);

  await page.goto(`${BASE}/file-room/${campaignId}`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Materials ledger", { timeout: 15000 });
  await page.waitForSelector(".fr-materials-row", { timeout: 15000 });

  const materialsSection = page.locator(".utility-card", { hasText: "Materials ledger" });
  await materialsSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  await materialsSection.screenshot({ path: OUT_PATH });

  const fullPagePath = path.join(OUT_DIR, "slice2-materials-full-page.png");
  await page.screenshot({ path: fullPagePath, fullPage: true });

  await browser.close();
  return fullPagePath;
}

function summarizeMaterials(materialsPayload) {
  const items = materialsPayload?.materials?.items ?? [];
  const byStatus = {};
  for (const item of items) {
    byStatus[item.reviewStatus] = (byStatus[item.reviewStatus] ?? 0) + 1;
  }
  return {
    totalItems: items.length,
    blockingRequiredCount: materialsPayload?.blockingRequiredCount ?? 0,
    byStatus,
    sampleReasons: [...new Set(items.map((i) => i.reason))].slice(0, 6),
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  try {
    const probe = await fetch(BASE);
    console.log(`Server reachable: HTTP ${probe.status} (${BASE})`);
  } catch (error) {
    console.error(`Server not reachable at ${BASE}:`, error);
    process.exit(1);
  }

  jar.clear();
  await login();

  const campaignId = process.env.SLICE2_CAMPAIGN_ID ?? randomUUID();
  console.log(`Seeding campaign ${campaignId}…`);

  const { materials: initialMaterials } = await seedCampaign(campaignId);
  await patchApprovedLogoSlot(campaignId);

  console.log("Capturing Materials section screenshot…");
  const fullPagePath = await captureScreenshot(campaignId);

  const materialsRes = await fetchApi(`/api/campaigns/${campaignId}/materials`);
  const summary = summarizeMaterials(materialsRes.json);

  const report = {
    campaignId,
    screenshotPath: OUT_PATH,
    fullPagePath,
    baseUrl: BASE,
    summary,
    capturedAt: new Date().toISOString(),
  };
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log(`Screenshot: ${OUT_PATH}`);
  console.log(`Full page: ${fullPagePath}`);
  console.log(`Campaign ID: ${campaignId}`);
  console.log(`Materials summary:`, JSON.stringify(summary, null, 2));
  console.log(`Report: ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
