/**
 * Owner Folder workflow proof — Direction Disagreement / Folder 3B.
 * Prerequisites: npm run dev
 *
 * Run: node scripts/prove-owner-folder-direction-disagreement.mjs
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const CAMPAIGN_ID = "direction-disagreement-v1";
const EXCEPTION_ID = "exc-direction-disagreement-v1";
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
  execSync("node scripts/seed-direction-disagreement-v1.mjs", { stdio: "inherit" });

  const ownerCookie = await login("tagia@local.dev");

  const tasksBefore = await api(ownerCookie, "GET", `/api/campaigns/${CAMPAIGN_ID}/tasks`);
  const excBefore = findException(tasksBefore.json);
  const taskBefore = findTask(tasksBefore.json);
  record(
    "Seed — direction disagreement waiting on Owner",
    tasksBefore.status === 200 &&
      excBefore?.kind === "direction_disagreement" &&
      excBefore?.status === "waiting_owner" &&
      taskBefore?.workflowBlockedReason?.includes("owner_escalation"),
    `${excBefore?.status} / ${taskBefore?.workflowState}`,
  );

  const holdPatch = await api(ownerCookie, "PATCH", `/api/campaigns/${CAMPAIGN_ID}/tasks`, {
    action: "owner_hold_direction_disagreement",
    exceptionId: EXCEPTION_ID,
    note: "Need strategy and production alignment call.",
    ownerNotes: "Hold until brief is reconciled.",
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

  execSync("node scripts/seed-direction-disagreement-v1.mjs", { stdio: "inherit" });

  const confirmPatch = await api(ownerCookie, "PATCH", `/api/campaigns/${CAMPAIGN_ID}/tasks`, {
    action: "owner_confirm_direction_disagreement",
    exceptionId: EXCEPTION_ID,
    ownerNotes: "Direction B stands — strategy brief overrides production alternate.",
  });
  record("API confirm — PATCH succeeds", confirmPatch.status === 200, String(confirmPatch.status));

  const tasksConfirmed = await api(ownerCookie, "GET", `/api/campaigns/${CAMPAIGN_ID}/tasks`);
  const excConfirmed = findException(tasksConfirmed.json);
  const taskConfirmed = findTask(tasksConfirmed.json);
  record(
    "API confirm — exception resolved",
    excConfirmed?.status === "resolved",
    excConfirmed?.status,
  );
  record(
    "API confirm — owner notes persisted",
    (excConfirmed?.resolutionNotes ?? "").includes("Direction B stands"),
  );
  record(
    "API confirm — task blocker cleared",
    taskConfirmed?.workflowState === "ready_for_qa" && !taskConfirmed?.workflowBlockedReason,
    taskConfirmed?.workflowState,
  );

  execSync("node scripts/seed-direction-disagreement-v1.mjs", { stdio: "inherit" });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies([
    { name: "studio_session", value: ownerCookie, domain: "localhost", path: "/" },
  ]);
  const page = await context.newPage();

  await page.goto(`${BASE}/file-room/owner-console`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Decisions/i }).first().click();
  await page.waitForTimeout(300);

  const directionCabinetItem = page
    .locator(".fr-owner-sequential__cabinet-items button")
    .filter({ hasText: "Direction disagreement" });

  const hasDirectionInCabinet = (await directionCabinetItem.count()) > 0;
  record("Browser — direction disagreement listed in Decisions cabinet", hasDirectionInCabinet);

  if (hasDirectionInCabinet) {
    await directionCabinetItem.first().click();
    await page.waitForTimeout(400);

    const closedText = await page.locator("body").innerText();
    record(
      "Browser — closed folder Squishy copy",
      closedText.includes("Production is paused until you confirm"),
    );

    await page.getByRole("button", { name: /Review Folder/i }).click();
    const openText = await page.locator(".fr-owner-sequential__working-scroll").innerText();

    record(
      "Browser — open folder decision question",
      openText.includes("Which creative direction stands"),
    );
    record("Browser — Owner Notes field", openText.includes("Owner Notes"));
    record(
      "Browser — action buttons",
      (await page.getByRole("button", { name: /Confirm direction/i }).count()) > 0 &&
        (await page.getByRole("button", { name: "Hold", exact: true }).count()) > 0,
    );
    record("Browser — no Ask Client", !openText.match(/Ask client/i));
  } else {
    record(
      "Browser — UI checks skipped",
      true,
      "direction folder not in aggregate desk (other campaigns may take priority)",
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
