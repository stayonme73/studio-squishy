/**
 * Review Room V1 — focused E2E + screenshots.
 * Prerequisites: npm run dev, node scripts/seed-review-room-v1.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("tmp/review-room-v1");
const CAMPAIGN_ID = "review-room-v1";
const JOB_ID = `${CAMPAIGN_ID}:sm-001`;
const CAMPAIGN_KEY = "studio-squishy:current-campaign";

const CLIENT_LOGIN = { email: "client@local.dev", password: "dev-only" };
const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };

const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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
    credentials: "include",
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
  await mkdir(OUT, { recursive: true });

  await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CLIENT_LOGIN),
  });

  const clientCookie = await login(CLIENT_LOGIN.email, CLIENT_LOGIN.password);
  const ownerCookie = await login(OWNER_LOGIN.email, OWNER_LOGIN.password);

  const openReview = await api(
    clientCookie,
    "GET",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}/review`,
  );
  record(
    "Client opens ready-for-review job",
    openReview.status === 200 && openReview.json.review?.spineStatus === "ready_for_review",
    `status ${openReview.status}`,
  );

  const feedback = {
    jobId: JOB_ID,
    campaignId: CAMPAIGN_ID,
    sectionStatuses: {
      "deliverable-0": "revision",
      "deliverable-1": "approved",
      "deliverable-2": "skip",
    },
    stickyNotes: [
      {
        id: "sticky-e2e",
        deliverableKey: "deliverable-0",
        color: "coral",
        text: "Please adjust the headline tone",
        createdAt: new Date().toISOString(),
      },
    ],
    voiceNotes: [],
    drawSections: ["deliverable-0"],
    updatedAt: new Date().toISOString(),
  };

  const save = await api(
    clientCookie,
    "PATCH",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}/review`,
    { action: "save_feedback", feedback },
  );
  record(
    "Saves sticky, section, and annotation feedback",
    save.status === 200 && save.json.feedback?.stickyNotes?.length === 1,
  );

  const reload = await api(
    clientCookie,
    "GET",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}/review`,
  );
  record(
    "Reloads persisted feedback",
    reload.json.review?.feedback?.stickyNotes?.[0]?.text === feedback.stickyNotes[0].text,
  );

  const forbidden = await api(
    clientCookie,
    "GET",
    `/api/campaigns/production-workspace-v1/jobs/production-workspace-v1%3Asm-001/review`,
  );
  record("Client isolation", forbidden.status === 403 || forbidden.status === 404);

  const browser = await chromium.launch();
  const clientContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await clientContext.addCookies([
    {
      name: "studio_session",
      value: clientCookie,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await clientContext.newPage();

  await page.goto(BASE);
  await page.evaluate(
    ({ key, record }) => {
      localStorage.setItem(key, JSON.stringify(record));
      window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
    },
    {
      key: CAMPAIGN_KEY,
      record: {
        campaignId: CAMPAIGN_ID,
        campaignName: "Harbor Cafe — Summer Social",
        campaignStatus: "BUILDING_CONCEPTS",
        campaignDescription: "Review Room V1 demo.",
        estimatedCompletion: "July 18, 2026",
        packageId: "custom-studio-plan",
        packageLabel: "Custom Studio Plan",
        revisionRoundsIncluded: 1,
        revisionRoundsUsed: 0,
        createdAt: "2026-07-02T08:00:00.000Z",
        updatedAt: new Date().toISOString(),
      },
    },
  );

  await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(JOB_ID)}`);
  await page.waitForSelector(".fs-review--workspace", { timeout: 20000 });
  await page.screenshot({ path: path.join(OUT, "01-review-open.png"), fullPage: true });

  await page.locator(".fs-feedback-panel__btn", { hasText: "Add Sticky Note" }).click();
  await page.locator(".fs-feedback-panel__sticky-input").fill("E2E sticky note");
  await page.locator(".fs-feedback-panel__sticky-actions .utility-btn--primary").click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "02-feedback-saved.png"), fullPage: true });

  await browser.close();

  const revision = await api(
    clientCookie,
    "PATCH",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}/review`,
    { action: "request_revision", feedback: { ...feedback, submittedAt: null } },
  );
  record(
    "Requests revision and production receives it",
    revision.status === 200 && revision.json.job?.spineStatus === "revision_requested",
  );

  const prodView = await api(
    ownerCookie,
    "GET",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}`,
  );
  record(
    "Production job spine reflects revision",
    prodView.json.jobRecords?.find((j) => j.jobId === JOB_ID)?.spineStatus === "revision_requested",
  );

  const report = results
    .map((r) => `- [${r.pass ? "x" : " "}] ${r.name}${r.detail ? ` — ${r.detail}` : ""}`)
    .join("\n");
  await writeFile(path.join(OUT, "e2e-report.md"), `# Review Room V1 E2E\n\n${report}\n`);

  const failed = results.filter((r) => !r.pass).length;
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
