/**
 * Shared helpers for Studio Self-Test seed + runner scripts.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

export const STUDIO_SELF_TEST_CAMPAIGN_ID = "studio-self-test";

export const PATHS = {
  campaigns: path.join(process.cwd(), "data", "campaigns"),
  tasks: path.join(process.cwd(), "data", "campaign-tasks"),
  materials: path.join(process.cwd(), "data", "campaign-materials"),
  production: path.join(process.cwd(), "data", "campaign-production"),
  assignments: path.join(process.cwd(), "data", "campaign-assignments.json"),
  users: path.join(process.cwd(), "data", "studio-users.json"),
  results: path.join(process.cwd(), "data", "studio-self-test-results.json"),
};

export const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";

export const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };
export const CLIENT_SELF_TEST_LOGIN = {
  email: "studio-self-test@local.dev",
  password: "dev-only",
};

export const STAFF_SELF_TEST = {
  producer: {
    id: "staff-producer-self-test",
    email: "producer-self-test@local.dev",
    displayName: "Producer Self-Test",
    capabilities: ["producer_dispatcher"],
  },
  qa: {
    id: "staff-qa-self-test",
    email: "qa-self-test@local.dev",
    displayName: "QA Self-Test",
    capabilities: ["qa"],
  },
  strategy: {
    id: "staff-strategy-self-test",
    email: "strategy-self-test@local.dev",
    displayName: "Strategy Self-Test",
    capabilities: ["strategy"],
  },
};

const BUSINESS_DELIM = "\n---\n";

export const SELF_TEST_DISCOVERY_ANSWERS = {
  "your-business": `The Studio${BUSINESS_DELIM}Internal self-test — The Studio as first client`,
  "your-situation": "Promoting an offer, event, sale, or launch",
  "your-challenge": "I need help promoting something",
  "your-current-tools": "Social media accounts",
  "your-focus": "Promote an offer, event, or launch",
  "success-looks-like": "A successful launch, event, sale, or promotion",
  "whats-slowing-you-down": "I am not visible enough online",
};

export class CookieJar {
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

/** @param {string} urlPath @param {RequestInit & { json?: unknown; jar?: CookieJar }} [options] */
export async function fetchApi(urlPath, options = {}) {
  const jar = options.jar ?? new CookieJar();
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
  return { status: res.status, json, text, jar };
}

/** @param {{ email: string; password: string }} credentials @param {CookieJar} jar */
export async function login(credentials, jar) {
  jar.clear();
  const res = await fetchApi("/api/auth/login", { method: "POST", json: credentials, jar });
  if (res.status !== 200) throw new Error(`Login failed (${credentials.email}): ${res.status}`);
}

export function buildSelfTestCampaignRecord() {
  const now = new Date().toISOString();
  return {
    campaignId: STUDIO_SELF_TEST_CAMPAIGN_ID,
    campaignName: "The Studio Self-Test Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Internal harness — The Studio as first real client.",
    estimatedCompletion: "Self-test in progress",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    discoveryAnswers: SELF_TEST_DISCOVERY_ANSWERS,
    discoverySubmittedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001"],
      includedServiceIds: ["sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 39500,
      monthlyTotalCents: 0,
      amountDueTodayCents: 39500,
      lineItems: [
        {
          skuId: "sm-001",
          serviceName: "Social Media Launch Set",
          billingType: "one_time",
          exactPriceCents: 39500,
          priceDisplay: "$395",
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
    selectedCampaignOption: "Option A — Bold",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: {
        workingOn: "Studio Self-Test launch",
        mainOffer: "Prove Discovery → Delivery without duct tape",
        importantDates: "Ongoing internal QA",
        callToAction: "Run the harness",
        destinationLink: "https://the-studio.example/self-test",
        primaryApproverName: "Tagia Owner",
        primaryApproverEmail: "tagia@local.dev",
        marketingPieces: "Social posts, content calendar",
        marketingPieceUsage: "Internal proof of pipeline",
      },
      files: [],
      submittedAt: now,
    },
    targetCompletionDate: null,
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [{ date: "Today", message: "Studio Self-Test campaign seeded." }],
    createdAt: now,
    updatedAt: now,
  };
}

/** @param {string} campaignId */
export function buildCampaignEnvelope(campaignId, clientUserId = "client-self-test") {
  const now = new Date().toISOString();
  return {
    campaignId,
    clientUserId,
    record: buildSelfTestCampaignRecord(),
    syncedAt: now,
    syncVersion: 1,
  };
}

export function selfTestScriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
