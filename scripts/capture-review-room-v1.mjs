/**
 * Capture Review Room V1 screenshots — run after seed-review-room-v1.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("tmp/review-room-v1");
const CAMPAIGN_ID = "review-room-v1";
const JOB_ID = `${CAMPAIGN_ID}:sm-001`;

async function login(email) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "dev-only" }),
  });
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/studio_session=([^;]+)/);
  if (!match) throw new Error("Login failed");
  return match[1];
}

async function patchReview(cookie, body) {
  await fetch(
    `${BASE}/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}/review`,
    {
      method: "PATCH",
      headers: {
        Cookie: `studio_session=${cookie}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

async function main() {
  execSync("node scripts/seed-review-room-v1.mjs", { stdio: "inherit" });
  await mkdir(OUT, { recursive: true });

  const clientCookie = await login("client@local.dev");
  const ownerCookie = await login("tagia@local.dev");

  const browser = await chromium.launch();
  const client = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await client.addCookies([
    { name: "studio_session", value: clientCookie, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  const page = await client.newPage();

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
  await page.waitForSelector(".fs-review--workspace", { timeout: 25000 });
  await page.screenshot({ path: path.join(OUT, "01-review-open.png"), fullPage: true });

  await page.locator(".fs-feedback-panel__btn", { hasText: "Add Sticky Note" }).click();
  await page.locator(".fs-feedback-panel__sticky-input").fill("Please warm up the headline tone");
  await page.locator(".fs-feedback-panel__sticky-actions .utility-btn--primary").click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "02-feedback-saved.png"), fullPage: true });

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
        id: "sticky-cap",
        deliverableKey: "deliverable-0",
        color: "coral",
        text: "Revise headline",
        createdAt: new Date().toISOString(),
      },
    ],
    voiceNotes: [],
    drawSections: ["deliverable-0"],
    updatedAt: new Date().toISOString(),
  };

  await patchReview(clientCookie, { action: "request_revision", feedback });
  await page.reload();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "03-revision-requested.png"), fullPage: true });

  execSync("node scripts/seed-review-room-v1.mjs", { stdio: "inherit" });
  const feedbackApproved = {
    ...feedback,
    sectionStatuses: {
      "deliverable-0": "approved",
      "deliverable-1": "approved",
      "deliverable-2": "skip",
    },
    stickyNotes: [],
    drawSections: [],
  };
  await patchReview(clientCookie, { action: "approve_for_delivery", feedback: feedbackApproved });
  await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(JOB_ID)}`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "04-approve-for-delivery.png"), fullPage: true });

  execSync("node scripts/seed-review-room-v1.mjs", { stdio: "inherit" });
  await fetch(`${BASE}/api/campaigns/current`, {
    method: "PATCH",
    headers: {
      Cookie: `studio_session=${clientCookie}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      record: {
        ...(await (await fetch(`${BASE}/api/campaigns/${CAMPAIGN_ID}`, {
          headers: { Cookie: `studio_session=${ownerCookie}` },
        })).json()).record,
        revisionRoundsUsed: 1,
      },
    }),
  }).catch(() => undefined);

  await patchReview(clientCookie, {
    action: "request_revision",
    feedback: {
      ...feedback,
      sectionStatuses: { "deliverable-0": "revision", "deliverable-1": "skip", "deliverable-2": "skip" },
    },
  });
  await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(JOB_ID)}`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "05-revision-limit.png"), fullPage: true });

  await browser.close();
  console.log(`Screenshots saved to ${OUT}/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
