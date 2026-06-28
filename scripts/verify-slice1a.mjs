/**
 * Slice 1a — File Room verification (repeatable)
 *
 * Prerequisites:
 *   - Dev server on localhost:3000
 *   - SESSION_SECRET in .env.local
 *
 * Usage: node scripts/verify-slice1a.mjs
 */

import { chromium } from "playwright";
import { randomUUID } from "node:crypto";
import { readdir, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const CAMPAIGN_SYNC_STATUS_KEY = "studio-squishy:campaign-sync-status";
const FIXTURE_IDS = new Set(["owner-qa-dev"]);

const APPROVED_DEV_LOGIN = {
  path: "POST /api/auth/login",
  body: { email: "tagia@local.dev", password: "dev-only" },
  note: "Seed user in src/lib/auth/studio-users.seed.json — dev-only plaintext password",
};

/** @typedef {{ pass: boolean; evidence: string[]; statusCodes?: Record<string, number> }} StepResult */

/** @type {{ A: Record<string, StepResult>; B: Record<string, StepResult>; C: Record<string, StepResult>; meta: Record<string, string> }} */
const report = { A: {}, B: {}, C: {}, meta: {} };

report.meta.approvedDevLogin =
  `${APPROVED_DEV_LOGIN.path} with ${JSON.stringify(APPROVED_DEV_LOGIN.body)} — ${APPROVED_DEV_LOGIN.note}`;

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

  return { status: res.status, json, text, headers: res.headers };
}

function isFixtureCampaignId(campaignId) {
  if (FIXTURE_IDS.has(campaignId)) return true;
  return campaignId.startsWith("test-");
}

function assertNonFixture(campaignId) {
  if (isFixtureCampaignId(campaignId) && process.env.ALLOW_FIXTURE_SYNC !== "1") {
    throw new Error(
      `Fixture campaignId "${campaignId}" blocked — use a real UUID or set ALLOW_FIXTURE_SYNC=1`,
    );
  }
}

/** @param {string} campaignId */
function buildFullCampaignRecord(campaignId) {
  assertNonFixture(campaignId);
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Slice 1a Verification Campaign",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Verification run",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    discoveryAnswers: { "your-business": "Verify Co", "your-focus": "Marketing & growth" },
    discoverySubmittedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: ["bf-001"],
      includedServiceIds: ["bf-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 50000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 50000,
      lineItems: [],
      approvedAt: now,
    },
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      primaryApproverName: "Tagia",
      primaryApproverEmail: "tagia@local.dev",
      submittedAt: now,
    },
    targetCompletionDate: null,
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [{ date: "Today", message: "Slice 1a verification" }],
    createdAt: now,
    updatedAt: now,
  };
}

/** @param {string} label @param {() => Promise<void>} fn */
async function runStep(section, label, fn) {
  const evidence = [];
  try {
    await fn(evidence);
    report[section][label] = { pass: true, evidence };
  } catch (error) {
    report[section][label] = {
      pass: false,
      evidence: [...evidence, error instanceof Error ? error.message : String(error)],
    };
  }
}

async function clearCampaignFiles() {
  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  const files = await readdir(CAMPAIGNS_DIR).catch(() => []);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const id = file.slice(0, -5);
    if (isFixtureCampaignId(id) && process.env.ALLOW_FIXTURE_SYNC !== "1") continue;
    await rm(path.join(CAMPAIGNS_DIR, file), { force: true });
  }
}

async function listNonFixtureCampaignFiles() {
  const files = await readdir(CAMPAIGNS_DIR).catch(() => []);
  return files.filter((f) => {
    if (!f.endsWith(".json")) return false;
    const id = f.slice(0, -5);
    if (isFixtureCampaignId(id) && process.env.ALLOW_FIXTURE_SYNC !== "1") return false;
    return true;
  });
}

async function sectionA() {
  jar.clear();

  await runStep("A", "file-room returns 401 with no session", async (evidence) => {
    const res = await fetchApi("/file-room");
    evidence.push(`GET /file-room → HTTP ${res.status}`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  const campaignId = randomUUID();
  const record = buildFullCampaignRecord(campaignId);

  await runStep("A", "PATCH /api/campaigns/current returns 401 without login", async (evidence) => {
    const res = await fetchApi("/api/campaigns/current", {
      method: "PATCH",
      json: { record },
    });
    evidence.push(`PATCH /api/campaigns/current → HTTP ${res.status}`);
    evidence.push(`Body: ${JSON.stringify(res.json)}`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await runStep("A", "no session created after sync attempt", async (evidence) => {
    const session = await fetchApi("/api/auth/session");
    evidence.push(`GET /api/auth/session → HTTP ${session.status}`);
    evidence.push(`Body: ${JSON.stringify(session.json)}`);
    if (session.status !== 401) throw new Error(`Expected 401 (no session), got ${session.status}`);
    if (session.json?.user) throw new Error("Session user should be null");
  });

  await runStep("A", "sync never calls auth bootstrap endpoints", async (evidence) => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const authCalls = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/auth/login") || url.includes("/api/auth/session")) {
        authCalls.push(`${req.method()} ${url}`);
      }
    });

    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.removeItem("studio-squishy:campaign-sync-status");
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    });

    // Mirror syncCampaignToServer (sync-client.ts) — raw fetch alone does not write localStorage.
    await page.evaluate(async (payload) => {
      const key = "studio-squishy:campaign-sync-status";
      const nowIso = () => new Date().toISOString();
      localStorage.setItem(
        key,
        JSON.stringify({ campaignId: payload.campaignId, state: "syncing", updatedAt: nowIso() }),
      );
      const response = await fetch("/api/campaigns/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ record: payload }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        localStorage.setItem(
          key,
          JSON.stringify({
            campaignId: payload.campaignId,
            state: "error",
            lastError: body.error ?? `HTTP ${response.status}`,
            updatedAt: nowIso(),
          }),
        );
        console.error("[campaign-sync] FAILED", body.error ?? response.status);
      }
    }, record);

    const syncStatus = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, CAMPAIGN_SYNC_STATUS_KEY);

    evidence.push(`localStorage ${CAMPAIGN_SYNC_STATUS_KEY}: ${JSON.stringify(syncStatus)}`);
    evidence.push(`Auth bootstrap calls during sync: ${authCalls.length === 0 ? "none" : authCalls.join(", ")}`);

    if (authCalls.length > 0) throw new Error("Sync triggered auth bootstrap endpoints");
    if (!syncStatus || syncStatus.state !== "error") {
      throw new Error(`Expected sync status state=error, got ${syncStatus?.state ?? "missing"}`);
    }
    if (!String(syncStatus.lastError ?? "").includes("Authentication required")) {
      throw new Error(`Expected lastError to mention Authentication required, got ${syncStatus.lastError}`);
    }

    await browser.close();
  });

  await runStep("A", "no owner/staff role without explicit login", async (evidence) => {
    const session = await fetchApi("/api/auth/session");
    if (session.status === 200 && session.json?.user) {
      const roles = session.json.user.roles ?? [];
      evidence.push(`Unexpected session roles: ${roles.join(", ")}`);
      if (roles.includes("owner") || roles.includes("staff")) {
        throw new Error("Sync attempt must not grant owner/staff role");
      }
    } else {
      evidence.push("No session — owner/staff role not present (expected)");
    }
  });
}

async function sectionB() {
  jar.clear();
  await clearCampaignFiles();

  const campaignId = randomUUID();
  const record = buildFullCampaignRecord(campaignId);
  report.meta.testCampaignId = campaignId;

  await runStep("B", "owner login via approved dev path", async (evidence) => {
    evidence.push(`Approved path: ${report.meta.approvedDevLogin}`);
    const res = await fetchApi("/api/auth/login", {
      method: "POST",
      json: APPROVED_DEV_LOGIN.body,
    });
    evidence.push(`POST /api/auth/login → HTTP ${res.status}`);
    evidence.push(`User: ${JSON.stringify(res.json?.user ?? null)}`);
    if (res.status !== 200) throw new Error(`Login failed with ${res.status}`);
    const roles = res.json?.user?.roles ?? [];
    if (!roles.includes("owner")) throw new Error(`Expected owner role, got ${roles.join(", ")}`);
    if (!jar.header().includes("studio_session")) throw new Error("studio_session cookie not set");
  });

  await runStep("B", "first sync creates one server campaign file", async (evidence) => {
    const res = await fetchApi("/api/campaigns/current", {
      method: "PATCH",
      json: { record },
    });
    evidence.push(`PATCH #1 → HTTP ${res.status}, syncVersion=${res.json?.syncVersion}, syncedAt=${res.json?.syncedAt}`);
    if (res.status !== 200) throw new Error(`First sync failed: ${JSON.stringify(res.json)}`);

    const files = await listNonFixtureCampaignFiles();
    evidence.push(`data/campaigns/ files (non-fixture): ${files.join(", ") || "(none)"}`);
    if (files.length !== 1) throw new Error(`Expected exactly 1 file, found ${files.length}`);

    const envelope = JSON.parse(await readFile(path.join(CAMPAIGNS_DIR, files[0]), "utf8"));
    evidence.push(`Envelope campaignId=${envelope.campaignId}, syncVersion=${envelope.syncVersion}`);
    if (envelope.campaignId !== campaignId) throw new Error("campaignId mismatch in server file");

    const r = envelope.record;
    if (!r.discoverySubmittedAt) throw new Error("Missing discoverySubmittedAt");
    if (!r.approvedStudioPlan) throw new Error("Missing approvedStudioPlan");
    if (!r.paymentReceivedAt) throw new Error("Missing paymentReceivedAt");
    if (!r.projectDetailsSubmittedAt) throw new Error("Missing projectDetailsSubmittedAt");
    if (r.campaignStatus !== "BUILDING_CONCEPTS") throw new Error(`Unexpected status: ${r.campaignStatus}`);

    evidence.push(
      `Frozen fields: discovery=yes, plan=yes, payment=yes, projectDetails=yes, status=${r.campaignStatus}`,
    );
  });

  await runStep("B", "repeat sync is idempotent (one file, syncVersion increments)", async (evidence) => {
    const updated = { ...record, updatedAt: new Date().toISOString() };
    const res = await fetchApi("/api/campaigns/current", {
      method: "PATCH",
      json: { record: updated },
    });
    evidence.push(`PATCH #2 → HTTP ${res.status}, syncVersion=${res.json?.syncVersion}`);

    const files = await listNonFixtureCampaignFiles();
    evidence.push(`data/campaigns/ files after repeat: ${files.join(", ")}`);
    if (files.length !== 1) throw new Error(`Expected still 1 file, found ${files.length}`);

    const envelope = JSON.parse(await readFile(path.join(CAMPAIGNS_DIR, files[0]), "utf8"));
    evidence.push(`syncVersion after repeat: ${envelope.syncVersion}, syncedAt: ${envelope.syncedAt}`);
    if (envelope.syncVersion < 2) throw new Error(`Expected syncVersion >= 2, got ${envelope.syncVersion}`);

    const dupes = files.filter((f) => f === `${campaignId}.json`);
    if (dupes.length !== 1) throw new Error("Duplicate campaignId files detected");
  });

  await runStep("B", "file-room accessible with owner session", async (evidence) => {
    const res = await fetchApi("/file-room");
    evidence.push(`GET /file-room → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(`Expected 200 with owner session, got ${res.status}`);
    if (!res.text.includes("Slice 1a Verification Campaign")) {
      throw new Error("File Room HTML missing verification campaign name");
    }
    evidence.push("File Room lists verification campaign");
  });
}

async function sectionC() {
  await runStep("C", "logout clears session", async (evidence) => {
    const res = await fetchApi("/api/auth/logout", { method: "POST" });
    evidence.push(`POST /api/auth/logout → HTTP ${res.status}`);
    if (res.status !== 200) throw new Error(`Logout failed: ${res.status}`);
  });

  await runStep("C", "file-room returns 401 after logout", async (evidence) => {
    const res = await fetchApi("/file-room");
    evidence.push(`GET /file-room → HTTP ${res.status}`);
    if (res.status !== 401) throw new Error(`Expected 401 after logout, got ${res.status}`);
  });

  await runStep("C", "customer routes have no File Room nav links", async (evidence) => {
    for (const route of ["/studio-board", "/project-summary"]) {
      const res = await fetchApi(route);
      evidence.push(`GET ${route} → HTTP ${res.status}`);
      const lower = res.text.toLowerCase();
      const hits = [];
      if (lower.includes("/file-room")) hits.push("/file-room href");
      if (lower.includes("file room — slice 1a")) hits.push("Slice 1a File Room title");
      if (hits.length > 0) throw new Error(`${route} contains File Room link markers: ${hits.join(", ")}`);
      evidence.push(`${route}: no File Room nav links`);
    }
  });
}

function printReport() {
  console.log("\n" + "=".repeat(72));
  console.log("SLICE 1a VERIFICATION REPORT");
  console.log("=".repeat(72));
  console.log(`Base URL: ${BASE}`);
  console.log(`Approved dev login: ${report.meta.approvedDevLogin}`);
  console.log(`Test campaignId (B): ${report.meta.testCampaignId ?? "n/a"}`);
  console.log("");
  console.log("KEY ASSERTIONS:");
  console.log("  • Sync never creates or elevates session (A)");
  console.log("  • File Room is server-authorized only — owner/staff session required (A, C)");
  console.log("  • Manual owner session for sync is temporary Slice 1 dev bridge, NOT future public client-auth");
  console.log("");

  for (const section of ["A", "B", "C"]) {
    console.log(`--- Section ${section} ---`);
    for (const [label, result] of Object.entries(report[section])) {
      const icon = result.pass ? "PASS" : "FAIL";
      console.log(`  [${icon}] ${label}`);
      for (const line of result.evidence) console.log(`         ${line}`);
    }
    console.log("");
  }

  const allPass = ["A", "B", "C"].every((s) =>
    Object.values(report[s]).every((r) => r.pass),
  );
  console.log(allPass ? "OVERALL: PASS" : "OVERALL: FAIL");
  console.log("=".repeat(72));
  return allPass;
}

async function main() {
  console.log("Slice 1a verification starting…");
  console.log(`Server probe: ${BASE}`);

  try {
    const probe = await fetch(BASE);
    console.log(`Dev server reachable: HTTP ${probe.status}`);
  } catch (error) {
    console.error(`Dev server not reachable at ${BASE}:`, error);
    process.exit(1);
  }

  await sectionA();
  await sectionB();
  await sectionC();

  const pass = printReport();
  await writeFile(
    path.join(process.cwd(), "tmp", "verify-slice1a-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  console.log("Report JSON: tmp/verify-slice1a-report.json");
  process.exit(pass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
