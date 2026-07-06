/**
 * Owner Folder workflow proof — Ready for Review / Needs My Approval.
 * Prerequisites: npm run dev
 *
 * Run: node scripts/prove-owner-folder-review-gate.mjs
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const CAMPAIGN_ID = "production-workspace-v1";
const JOB_ID = `${CAMPAIGN_ID}:sm-001`;

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

async function main() {
  execSync("node scripts/seed-production-workspace-v1.mjs", { stdio: "inherit" });

  const ownerCookie = await login("tagia@local.dev");

  const jobBefore = await api(
    ownerCookie,
    "GET",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}`,
  );
  const jobBeforeRecord = (jobBefore.json.jobRecords ?? []).find(
    (entry) => entry.jobId === JOB_ID,
  );
  record(
    "Seed — owner approval pending before review",
    jobBefore.status === 200 && jobBeforeRecord?.ownerApprovalPending === "before_review",
    jobBeforeRecord?.ownerApprovalPending ?? `HTTP ${jobBefore.status}`,
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies([
    { name: "studio_session", value: ownerCookie, domain: "localhost", path: "/" },
  ]);
  const page = await context.newPage();

  await page.goto(`${BASE}/file-room/owner-console`, { waitUntil: "networkidle" });
  const bodyText = await page.locator("body").innerText();

  record(
    "Closed folder — Squishy says before open",
    bodyText.includes("Production has finished this campaign") &&
      bodyText.includes("before the client can see it"),
  );
  record(
    "Closed folder — why first briefing",
    bodyText.includes("approval before the client can review") ||
      bodyText.includes("waiting on Owner approval"),
  );

  await page.getByRole("button", { name: /Review Folder/i }).click();
  const openText = await page.locator(".fr-owner-sequential__working-scroll").innerText();

  const sendBackButton = page.getByRole("button", { name: /Send back to production/i });
  const askTeamButton = page.getByRole("button", { name: /Ask team/i });
  const askClientButton = page.getByRole("button", { name: /Ask client/i });
  record(
    "Open folder — all action buttons visible",
    (await sendBackButton.count()) > 0 &&
      (await askTeamButton.count()) > 0 &&
      (await askClientButton.count()) > 0,
  );
  record(
    "Open folder — decision question",
    openText.includes("Is this creative ready for the client to see in Review Room"),
  );
  record(
    "Open folder — what Tagia reviews",
    openText.includes("Review concepts, prepared deliverables"),
  );
  record(
    "Open folder — planned actions listed",
    openText.includes("Send back for revision") && openText.includes("Ask team"),
  );

  await page.locator("#review-gate-team-note").fill("Caption tone needs another pass before client review.");
  page.once("dialog", (dialog) => dialog.accept());
  await sendBackButton.click();
  await page.waitForTimeout(1500);

  const afterSendBackText = await page.locator("body").innerText();
  record(
    "After send back — Squishy status banner",
    afterSendBackText.includes("left your desk") &&
      afterSendBackText.includes("production"),
  );

  const jobAfterSendBack = await api(
    ownerCookie,
    "GET",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}`,
  );
  const jobSendBackRecord = (jobAfterSendBack.json.jobRecords ?? []).find(
    (entry) => entry.jobId === JOB_ID,
  );
  record(
    "After send back — owner gate cleared",
    jobSendBackRecord?.ownerApprovalPending == null,
    String(jobSendBackRecord?.ownerApprovalPending),
  );
  record(
    "After send back — spine building_concepts",
    jobSendBackRecord?.spineStatus === "building_concepts",
    jobSendBackRecord?.spineStatus,
  );
  record(
    "After send back — folder routed off Owner Desk",
    jobSendBackRecord?.ownerApprovalPending == null &&
      jobSendBackRecord?.spineStatus === "building_concepts",
    "gate cleared and production rework",
  );

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
