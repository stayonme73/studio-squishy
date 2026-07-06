/**
 * Owner Folder workflow proof — Ready to Release / approval_before_delivery.
 * Prerequisites: npm run dev
 *
 * Run: node scripts/prove-owner-folder-release-gate.mjs
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const CAMPAIGN_ID = "final-delivery-v1";
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
  execSync("node scripts/seed-final-delivery-v1.mjs", { stdio: "inherit" });

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
    "Seed — final release pending before delivery",
    jobBefore.status === 200 &&
      jobBeforeRecord?.ownerApprovalPending === "before_delivery" &&
      jobBeforeRecord?.spineStatus === "approved",
    `${jobBeforeRecord?.spineStatus} / ${jobBeforeRecord?.ownerApprovalPending}`,
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
    bodyText.includes("client approved this package") &&
      bodyText.includes("Final Delivery"),
  );
  record(
    "Closed folder — release-first briefing",
    bodyText.includes("sign-off before final delivery"),
  );

  await page.getByRole("button", { name: /Review Folder/i }).click();
  const openText = await page.locator(".fr-owner-sequential__working-scroll").innerText();

  record(
    "Open folder — decision question",
    openText.includes("Can the client receive this final delivery"),
  );
  record(
    "Open folder — what Tagia reviews",
    openText.includes("QA is complete") && openText.includes("client-safe"),
  );

  const releaseButton = page.getByRole("button", { name: /Release to client/i });
  const sendBackButton = page.getByRole("button", { name: /Send back to production/i });
  const askTeamButton = page.getByRole("button", { name: /Ask team/i });
  record(
    "Open folder — release action buttons visible",
    (await releaseButton.count()) > 0 &&
      (await sendBackButton.count()) > 0 &&
      (await askTeamButton.count()) > 0,
  );

  await page.locator("#release-gate-team-note").fill("Caption export needs one more QA check.");
  page.once("dialog", (dialog) => dialog.accept());
  await sendBackButton.click();
  await page.waitForTimeout(1500);

  const afterSendBackText = await page.locator("body").innerText();
  record(
    "After send back — Squishy status banner",
    afterSendBackText.includes("left your desk") &&
      afterSendBackText.includes("production"),
  );

  const jobAfter = await api(
    ownerCookie,
    "GET",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}`,
  );
  const jobRecord = (jobAfter.json.jobRecords ?? []).find((entry) => entry.jobId === JOB_ID);
  record(
    "After send back — owner gate cleared",
    jobRecord?.ownerApprovalPending == null,
    String(jobRecord?.ownerApprovalPending),
  );
  record(
    "After send back — spine building_concepts",
    jobRecord?.spineStatus === "building_concepts",
    jobRecord?.spineStatus,
  );
  record(
    "After send back — folder routed off Owner Desk",
    jobRecord?.ownerApprovalPending == null && jobRecord?.spineStatus === "building_concepts",
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
