/**
 * Owner Console V1 — API proof script
 *
 * Prerequisites: dev server on localhost:3000, SESSION_SECRET in .env.local
 * Usage: node scripts/prove-owner-console-v1.mjs
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp", "owner-console-v1-proof");
const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "campaign-assignments.json");
const STAFF_STRATEGY_ID = "staff-strategy-capture";
const STRATEGY_LOGIN = { email: "strategy-capture@local.dev", password: "dev-only" };
const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };

/** @type {Record<string, { pass: boolean; evidence: string[] }>} */
const report = {};
/** @type {Record<string, string>} */
const meta = {};

class CookieJar {
  /** @type {Map<string, string>} */
  #cookies = new Map();
  clear() {
    this.#cookies.clear();
  }
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

async function login(credentials) {
  jar.clear();
  const res = await fetchApi("/api/auth/login", { method: "POST", json: credentials });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status}`);
}

function buildCampaign(campaignId, campaignName) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName,
    businessName: `${campaignName} LLC`,
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Owner Console V1 proof seed",
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
        workingOn: "Owner Console V1 proof",
        mainOffer: "Launch",
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

async function assignStaff(campaignId) {
  let assignments = { staffByUserId: {}, staffCapabilities: {} };
  try {
    assignments = JSON.parse(await readFile(ASSIGNMENTS_PATH, "utf8"));
  } catch {
    /* fresh */
  }
  assignments.staffByUserId = assignments.staffByUserId ?? {};
  assignments.staffCapabilities = assignments.staffCapabilities ?? {};
  assignments.staffByUserId[STAFF_STRATEGY_ID] = [campaignId];
  assignments.staffCapabilities[STAFF_STRATEGY_ID] = ["strategy"];
  await writeFile(ASSIGNMENTS_PATH, JSON.stringify(assignments, null, 2), "utf8");
}

async function seedCampaign(campaignId, campaignName) {
  await login(OWNER_LOGIN);
  const sync = await fetchApi("/api/campaigns/current", {
    method: "PATCH",
    json: { record: buildCampaign(campaignId, campaignName) },
  });
  if (sync.status !== 200) throw new Error(`Campaign sync failed: ${sync.status}`);
  await assignStaff(campaignId);
  await fetchApi(`/api/campaigns/${campaignId}/tasks`);
  await fetchApi(`/api/campaigns/${campaignId}/materials`);
}

function record(key, pass, evidence) {
  report[key] = { pass, evidence };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const campaignId = `owner-console-v1-${randomUUID().slice(0, 8)}`;
  meta.campaignId = campaignId;

  await seedCampaign(campaignId, "Owner Console V1 Proof");

  // Promotion decision (missing_client_fact)
  const mcf = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "raise_exception",
      kind: "missing_client_fact",
      title: "OC-V1: Brand palette missing",
      description: "Copy blocked pending client hex codes.",
      taskId: "sm-001:copy",
      clientRequestDraft: {
        exactClientOnlyItem: "Official brand hex codes",
        whyBlocksWork: "Creative cannot finalize color-accurate assets.",
      },
    },
  });
  const mcfId = mcf.json?.exceptionRecords?.find((e) => e.title.includes("OC-V1"))?.id;
  record(
    "promotion_raise",
    mcf.status === 200 && Boolean(mcfId),
    [`raise status ${mcf.status}`, `exceptionId ${mcfId ?? "missing"}`],
  );

  // Drill-down routes before resolving (mcf still waiting on owner)
  const studioConsole = await fetchApi("/file-room/owner-console");
  record(
    "studio_console_route",
    studioConsole.status === 200 && studioConsole.text.includes("Owner Console"),
    [`GET /file-room/owner-console → ${studioConsole.status}`],
  );

  const drillDown = await fetchApi(
    `/file-room/${campaignId}/owner-console?item=${encodeURIComponent(mcfId ?? "")}`,
  );
  record(
    "campaign_drill_down_route",
    drillDown.status === 200 &&
      (drillDown.text.includes("Linked context") ||
        drillDown.text.includes("fr-owner-console-context")),
    [`GET campaign owner-console → ${drillDown.status}`],
  );

  record(
    "scan_buckets_markup",
    studioConsole.text.includes("Blocked work") &&
      studioConsole.text.includes("Waiting on client") &&
      studioConsole.text.includes("Ready to move"),
    ["scan section titles found in studio-wide HTML"],
  );

  const approve = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "approve_client_request",
      exceptionId: mcfId,
      category: "factual-confirmation",
      contentKind: "confirmation",
      clientFacingLabel: "Brand hex codes",
      clientFacingPrompt: "Please confirm primary and secondary brand hex codes.",
      whyNeeded: "Required for color-accurate launch creative.",
      requirementLevel: "required",
    },
  });
  record(
    "promotion_approve",
    approve.status === 200,
    [`approve status ${approve.status}`, `error ${approve.json?.error ?? "none"}`],
  );

  // Exception resolution (compliance_hold)
  const compliance = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "raise_exception",
      kind: "compliance_hold",
      title: "OC-V1: Savings claim review",
      taskId: "sm-001:copy",
    },
  });
  const complianceId = compliance.json?.exceptionRecords?.find((e) =>
    e.title.includes("Savings claim"),
  )?.id;

  const resolve = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "resolve_exception",
      exceptionId: complianceId,
      resolutionNotes: "Owner cleared compliance concern for proof.",
    },
  });
  record(
    "exception_resolve",
    resolve.status === 200,
    [`resolve status ${resolve.status}`, `complianceId ${complianceId ?? "missing"}`],
  );

  // Owner reassign — strategy task needs Kitchen workVersionId after claim + draft
  await login(STRATEGY_LOGIN);
  const claim = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    json: {
      action: "claim",
      taskId: "sm-001:strategy_content_direction",
      from: "unstarted",
      claimVersion: null,
    },
  });
  if (claim.status !== 200) {
    record("owner_reassign", false, [`claim failed ${claim.status}`]);
  } else {
    const versionRes = await fetchApi(`/api/campaigns/${campaignId}/production`, {
      method: "PATCH",
      json: {
        action: "create_version",
        taskId: "sm-001:strategy_content_direction",
        body: "Strategy direction draft for Owner Console reassign proof.",
      },
    });
    const production = await fetchApi(`/api/campaigns/${campaignId}/production`);
    const workVersionId =
      production.json?.versions?.find(
        (v) => v.taskId === "sm-001:strategy_content_direction",
      )?.id ?? null;

    await login(OWNER_LOGIN);
    const tasksBefore = await fetchApi(`/api/campaigns/${campaignId}/tasks`);
    const strategyTask = tasksBefore.json?.tasks?.find(
      (t) => t.id === "sm-001:strategy_content_direction",
    );
    const reassign = await fetchApi(`/api/campaigns/${campaignId}/tasks`, {
      method: "PATCH",
      json: {
        action: "reassign",
        taskId: "sm-001:strategy_content_direction",
        from: strategyTask?.workflowState ?? "in_progress",
        claimVersion: strategyTask?.claimedAt ?? null,
        toUserId: STAFF_STRATEGY_ID,
        toRole: "strategy",
        handoff: {
          completedSummary: "Owner remote reassign from console proof.",
          sourceContext: "Owner Console V1 proof script.",
          nextSteps: "Strategy AI continues in Team Office.",
          workVersionId: workVersionId ?? undefined,
        },
      },
    });
    record(
      "owner_reassign",
      reassign.status === 200 && versionRes.status === 200,
      [
        `create_version ${versionRes.status}`,
        `reassign status ${reassign.status}`,
        `error ${reassign.json?.error ?? "none"}`,
      ],
    );
  }

  const allPass = Object.values(report).every((entry) => entry.pass);
  const summary = {
    pass: allPass,
    meta,
    report,
    provedAt: new Date().toISOString(),
  };

  await writeFile(path.join(OUT_DIR, "proof-report.json"), JSON.stringify(summary, null, 2));

  console.log(JSON.stringify(summary, null, 2));
  if (!allPass) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
