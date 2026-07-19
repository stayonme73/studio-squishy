/**
 * Operational check — Review Room → client approval → owner release → Final Delivery.
 * Prerequisites: npm run dev, node scripts/seed-review-room-v1.mjs
 *
 * Run: node scripts/review-to-delivery-path.mjs
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("tmp/review-to-delivery-path");
const CAMPAIGN_ID = "review-room-v1";
const JOB_ID = `${CAMPAIGN_ID}:sm-001`;
const DELIVERABLE_KEYS = ["deliverable-0", "deliverable-1", "deliverable-2"];

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
  return { status: res.status, json, text: JSON.stringify(json).slice(0, 300) };
}

async function jobPatch(cookie, body) {
  return api(
    cookie,
    "PATCH",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}`,
    body,
  );
}

async function main() {
  execSync("node scripts/seed-review-room-v1.mjs", { stdio: "inherit" });
  await mkdir(OUT, { recursive: true });

  const clientCookie = await login("client@local.dev");
  const ownerCookie = await login("tagia@local.dev");

  const openReview = await api(
    clientCookie,
    "GET",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}/review`,
  );
  record(
    "Review open — ready_for_review",
    openReview.status === 200 && openReview.json.review?.spineStatus === "ready_for_review",
    openReview.json.review?.spineStatus ?? `HTTP ${openReview.status}`,
  );

  const sectionStatuses = Object.fromEntries(DELIVERABLE_KEYS.map((key) => [key, "approved"]));
  const feedback = {
    jobId: JOB_ID,
    campaignId: CAMPAIGN_ID,
    sectionStatuses,
    stickyNotes: [],
    voiceNotes: [],
    drawSections: [],
    updatedAt: new Date().toISOString(),
  };

  const approve = await api(
    clientCookie,
    "PATCH",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}/review`,
    { action: "approve_for_delivery", feedback },
  );
  record(
    "Client approve_for_delivery",
    approve.status === 200 && approve.json.job?.spineStatus === "approved",
    approve.json.job?.spineStatus ?? approve.json.error ?? `HTTP ${approve.status}`,
  );

  for (let i = 0; i < DELIVERABLE_KEYS.length; i += 1) {
    const added = await jobPatch(ownerCookie, {
      action: "add_client_delivery_file",
      deliverableKey: DELIVERABLE_KEYS[i],
      fileName: `self-test-deliverable-${i + 1}.zip`,
      fileType: "ZIP",
      url: `https://files.example/self-test/${CAMPAIGN_ID}/deliverable-${i}.zip`,
    });
    if (added.status !== 200) {
      record("Add client delivery files", false, added.json.error ?? `HTTP ${added.status}`);
      break;
    }
    if (i === DELIVERABLE_KEYS.length - 1) {
      record("Add client delivery files", true, `${DELIVERABLE_KEYS.length} files`);
    }
  }

  const finalRelease = await jobPatch(ownerCookie, { action: "owner_final_release" });
  record(
    "Owner final release",
    finalRelease.status === 200,
    finalRelease.json.error ?? `HTTP ${finalRelease.status}`,
  );

  const delivered = await jobPatch(ownerCookie, { action: "mark_delivered" });
  record(
    "Owner mark_delivered",
    delivered.status === 200 && delivered.json.job?.spineStatus === "delivered",
    delivered.json.job?.spineStatus ?? delivered.json.error ?? `HTTP ${delivered.status}`,
  );

  const deliveryApi = await api(clientCookie, "GET", `/api/campaigns/${CAMPAIGN_ID}/delivery`);
  const jobs = deliveryApi.json.delivery?.jobs ?? [];
  record(
    "Final Delivery API",
    deliveryApi.status === 200 &&
      jobs.length === 1 &&
      jobs[0]?.jobId === JOB_ID &&
      (jobs[0]?.files?.length ?? 0) >= DELIVERABLE_KEYS.length,
    `jobs=${jobs.length} files=${jobs[0]?.files?.length ?? 0}`,
  );

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
      key: "studio-squishy:current-campaign",
      record: {
        campaignId: CAMPAIGN_ID,
        campaignName: "Harbor Cafe — Summer Social",
        campaignStatus: "DELIVERED",
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
  await page.goto(`${BASE}/deliverables`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const bodyText = await page.locator("body").innerText();
  record(
    "Final Delivery page",
    bodyText.includes("Final Delivery") && !bodyText.includes("Access denied"),
    bodyText.includes("deliverable") || bodyText.includes("Social") ? "content visible" : "page loaded",
  );
  await page.screenshot({ path: path.join(OUT, "final-delivery.png"), fullPage: true });
  await browser.close();

  const failed = results.filter((r) => !r.pass).length;
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
