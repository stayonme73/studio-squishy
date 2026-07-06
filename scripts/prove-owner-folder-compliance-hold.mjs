/**
 * Owner Folder workflow proof — Compliance Hold / Folder 3A.
 * Prerequisites: npm run dev
 *
 * Run: node scripts/prove-owner-folder-compliance-hold.mjs
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const CAMPAIGN_ID = "compliance-hold-v1";
const EXCEPTION_ID = "exc-compliance-hold-v1";
const TASK_ID = "sm-001:copy";

const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

async function login(email) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "dev-only" }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/studio_session=([^;]+)/);
  if (!match) throw new Error("No session cookie");
  return match[1];
}

async function api(cookie, method, urlPath, body) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: {
      Cookie: `studio_session=${cookie}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function findException(payload) {
  return (payload.exceptionRecords ?? []).find((entry) => entry.id === EXCEPTION_ID);
}

function findTask(payload) {
  return (payload.tasks ?? []).find((entry) => entry.id === TASK_ID);
}

async function main() {
  execSync("node scripts/seed-compliance-hold-v1.mjs", { stdio: "inherit" });

  const ownerCookie = await login("tagia@local.dev");

  const tasksBefore = await api(ownerCookie, "GET", `/api/campaigns/${CAMPAIGN_ID}/tasks`);
  const excBefore = findException(tasksBefore.json);
  const taskBefore = findTask(tasksBefore.json);
  record(
    "Seed — compliance hold waiting on Owner",
    tasksBefore.status === 200 &&
      excBefore?.kind === "compliance_hold" &&
      excBefore?.status === "waiting_owner" &&
      taskBefore?.workflowBlockedReason?.includes("compliance_hold"),
    `${excBefore?.status} / ${taskBefore?.workflowState}`,
  );

  const holdPatch = await api(ownerCookie, "PATCH", `/api/campaigns/${CAMPAIGN_ID}/tasks`, {
    action: "owner_hold_compliance_hold",
    exceptionId: EXCEPTION_ID,
    note: "Need legal review before clear.",
    ownerNotes: "Hold until counsel responds.",
  });
  record("API hold — PATCH succeeds", holdPatch.status === 200, String(holdPatch.status));

  const tasksHeld = await api(ownerCookie, "GET", `/api/campaigns/${CAMPAIGN_ID}/tasks`);
  const excHeld = findException(tasksHeld.json);
  record(
    "API hold — exception waiting_internal (off Owner desk)",
    excHeld?.status === "waiting_internal",
    excHeld?.status,
  );
  record(
    "API hold — exception event recorded",
    (tasksHeld.json.exceptionEvents ?? []).some(
      (entry) => entry.exceptionId === EXCEPTION_ID && entry.action === "assigned",
    ),
  );
  record(
    "API hold — task stays blocked",
    findTask(tasksHeld.json)?.workflowState === "blocked",
  );

  execSync("node scripts/seed-compliance-hold-v1.mjs", { stdio: "inherit" });

  const clearPatch = await api(ownerCookie, "PATCH", `/api/campaigns/${CAMPAIGN_ID}/tasks`, {
    action: "owner_clear_compliance_hold",
    exceptionId: EXCEPTION_ID,
    ownerNotes: "Claim substantiated with client file on record.",
  });
  record("API clear — PATCH succeeds", clearPatch.status === 200, String(clearPatch.status));

  const tasksCleared = await api(ownerCookie, "GET", `/api/campaigns/${CAMPAIGN_ID}/tasks`);
  const excCleared = findException(tasksCleared.json);
  const taskCleared = findTask(tasksCleared.json);
  record(
    "API clear — exception resolved",
    excCleared?.status === "resolved",
    excCleared?.status,
  );
  record(
    "API clear — owner notes persisted",
    (excCleared?.resolutionNotes ?? "").includes("Claim substantiated"),
  );
  record(
    "API clear — task blocker cleared",
    taskCleared?.workflowState === "ready_for_qa" && !taskCleared?.workflowBlockedReason,
    taskCleared?.workflowState,
  );

  execSync("node scripts/seed-compliance-hold-v1.mjs", { stdio: "inherit" });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies([
    { name: "studio_session", value: ownerCookie, domain: "localhost", path: "/" },
  ]);
  const page = await context.newPage();

  await page.goto(`${BASE}/file-room/owner-console`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Decisions/i }).first().click();
  await page.waitForTimeout(300);

  const complianceCabinetItem = page
    .locator(".fr-owner-sequential__cabinet-items button")
    .filter({ hasText: "Compliance hold" });

  const hasComplianceInCabinet = (await complianceCabinetItem.count()) > 0;
  record("Browser — compliance hold listed in Decisions cabinet", hasComplianceInCabinet);

  if (hasComplianceInCabinet) {
    await complianceCabinetItem.first().click();
    await page.waitForTimeout(400);

    const closedText = await page.locator("body").innerText();
    record(
      "Browser — closed folder Squishy copy",
      closedText.includes("Compliance needs your review"),
    );

    await page.getByRole("button", { name: /Review Folder/i }).click();
    const openText = await page.locator(".fr-owner-sequential__working-scroll").innerText();

    record(
      "Browser — open folder decision question",
      openText.includes("Is this work cleared to continue"),
    );
    record("Browser — Owner Notes field", openText.includes("Owner Notes"));
    record(
      "Browser — action buttons",
      (await page.getByRole("button", { name: /Clear \/ resolve/i }).count()) > 0 &&
        (await page.getByRole("button", { name: "Hold", exact: true }).count()) > 0,
    );
    record("Browser — no Ask Client", !openText.match(/Ask client/i));
  } else {
    record(
      "Browser — UI checks skipped",
      true,
      "compliance folder not in aggregate desk (other campaigns may take priority)",
    );
  }

  await browser.close();

  const failed = results.filter((entry) => !entry.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
