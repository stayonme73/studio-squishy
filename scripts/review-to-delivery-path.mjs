/**
 * Disposable review-room-v1 — Review → revision → approve → release → delivery.
 * Prerequisites: npm run dev @ 127.0.0.1:3475 (or VERIFY_BASE_URL)
 *
 * Run: node scripts/review-to-delivery-path.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CAMPAIGN_ID,
  JOB_ID,
  resubmitReviewRoomV1AfterRevision,
  writeReviewRoomV1SeedFiles,
} from "./seed-review-room-v1.mjs";
import { resolveVerifyBaseUrl, sessionCookiePlaywright } from "./review-room-v1-test-env.mjs";
import {
  DISPOSABLE_DELIVERABLE_BYTES,
  DISPOSABLE_FILENAMES,
  UNRELEASED_HARNESS_FILENAME,
  seedReviewRoomV1PrivateFileRoomObjects,
  sha256Prefixed,
} from "./review-room-v1-file-room-harness.mjs";

const BASE = resolveVerifyBaseUrl();
const OUT = path.resolve(
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/review-to-delivery-proofs",
);
const DELIVERABLE_KEYS = ["deliverable-0", "deliverable-1", "deliverable-2"];

/** @type {{ step: string, status: "PASS"|"FAIL"|"BLOCKED", detail: string }[]} */
const results = [];

function record(step, status, detail = "") {
  results.push({ step, status, detail });
  console.log(`${status.padEnd(7)} ${step}${detail ? ` — ${detail}` : ""}`);
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

async function loginLocalCustomerOne() {
  const res = await fetch(`${BASE}/api/auth/local-customer-one`, { method: "POST" });
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/studio_session=([^;]+)/);
  if (!match) return { ok: false, status: res.status };
  return { ok: true, cookie: match[1], status: res.status };
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

async function jobPatch(cookie, body) {
  return api(
    cookie,
    "PATCH",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}`,
    body,
  );
}

function emptyFeedback(sectionStatuses) {
  return {
    jobId: JOB_ID,
    campaignId: CAMPAIGN_ID,
    sectionStatuses,
    stickyNotes: [],
    voiceNotes: [],
    drawSections: [],
    updatedAt: new Date().toISOString(),
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await writeReviewRoomV1SeedFiles();

  const clientCookie = await login("client@local.dev");
  const ownerCookie = await login("tagia@local.dev");

  const openReview = await api(
    clientCookie,
    "GET",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}/review`,
  );
  record(
    "open-review-room",
    openReview.status === 200 && openReview.json.review?.spineStatus === "ready_for_review"
      ? "PASS"
      : "FAIL",
    openReview.json.review?.spineStatus ?? `HTTP ${openReview.status} ${openReview.json.error ?? ""}`,
  );

  const draftFeedback = emptyFeedback({
    "deliverable-0": "neutral",
    "deliverable-1": "neutral",
    "deliverable-2": "neutral",
  });
  draftFeedback.stickyNotes = [
    {
      id: "sticky-harness",
      deliverableKey: "deliverable-0",
      color: "coral",
      text: "Harness sticky — headline tone",
      createdAt: new Date().toISOString(),
    },
  ];

  const save = await api(
    clientCookie,
    "PATCH",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}/review`,
    { action: "save_feedback", feedback: draftFeedback },
  );
  record(
    "save-feedback",
    save.status === 200 && save.json.feedback?.stickyNotes?.length >= 1 ? "PASS" : "FAIL",
    save.json.error ?? `HTTP ${save.status}`,
  );

  const revisionFeedback = emptyFeedback({
    "deliverable-0": "revision",
    "deliverable-1": "approved",
    "deliverable-2": "skip",
  });
  revisionFeedback.stickyNotes = draftFeedback.stickyNotes;

  const revision = await api(
    clientCookie,
    "PATCH",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}/review`,
    { action: "request_revision", feedback: revisionFeedback },
  );
  record(
    "request-revision",
    revision.status === 200 && revision.json.job?.spineStatus === "revision_requested"
      ? "PASS"
      : "FAIL",
    revision.json.job?.spineStatus ?? revision.json.error ?? `HTTP ${revision.status}`,
  );

  await resubmitReviewRoomV1AfterRevision(2);

  let harnessPrimaryBytes = DISPOSABLE_DELIVERABLE_BYTES["deliverable-0"];
  try {
    const seeded = await seedReviewRoomV1PrivateFileRoomObjects(
      BASE,
      ownerCookie,
      "work:review-room-v1:v2",
      "cycle-2",
    );
    harnessPrimaryBytes = seeded.primaryDownload.body;
    record("file-room-private-upload", "PASS", "review_proof x3 + internal unreleased control");
  } catch (error) {
    record(
      "file-room-private-upload",
      "FAIL",
      error instanceof Error ? error.message : String(error),
    );
  }

  const openAfterRework = await api(
    clientCookie,
    "GET",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}/review`,
  );
  record(
    "open-review-after-rework",
    openAfterRework.status === 200 &&
      openAfterRework.json.review?.spineStatus === "ready_for_review"
      ? "PASS"
      : "FAIL",
    openAfterRework.json.review?.spineStatus ?? `HTTP ${openAfterRework.status}`,
  );

  const approveFeedback = emptyFeedback({
    "deliverable-0": "approved",
    "deliverable-1": "approved",
    "deliverable-2": "skip",
  });

  const approve = await api(
    clientCookie,
    "PATCH",
    `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}/review`,
    { action: "approve_for_delivery", feedback: approveFeedback },
  );
  const approvedSpine = approve.json.job?.spineStatus;
  record(
    "approve-for-delivery",
    approve.status === 200 &&
      (approvedSpine === "approved" ||
        approvedSpine === "ready_for_delivery" ||
        approvedSpine === "delivered")
      ? "PASS"
      : "FAIL",
    approvedSpine ?? approve.json.error ?? `HTTP ${approve.status}`,
  );

  let jobState = approve.json.job;

  if (jobState?.spineStatus === "ready_for_delivery") {
    record("authorized-release", "PASS", "Routine system Final Delivery authorization");
  } else if (jobState?.spineStatus === "approved") {
    record(
      "authorized-release",
      "BLOCKED",
      "Approved but system release did not open — approval/delivery file identity mismatch",
    );
  } else {
    record("authorized-release", "FAIL", `Unexpected spine ${jobState?.spineStatus ?? "none"}`);
  }

  if (jobState?.spineStatus === "ready_for_delivery") {
    const delivered = await jobPatch(ownerCookie, { action: "mark_delivered" });
    record(
      "mark-delivered",
      delivered.status === 200 && delivered.json.job?.spineStatus === "delivered"
        ? "PASS"
        : "FAIL",
      delivered.json.job?.spineStatus ?? delivered.json.error ?? `HTTP ${delivered.status}`,
    );
    jobState = delivered.json.job ?? jobState;
  } else {
    record("mark-delivered", "BLOCKED", "Requires ready_for_delivery");
  }

  const deliveryApi = await api(clientCookie, "GET", `/api/campaigns/${CAMPAIGN_ID}/delivery`);
  const jobs = deliveryApi.json.delivery?.jobs ?? [];
  const files = jobs[0]?.files ?? [];
  record(
    "delivery-api-client",
    deliveryApi.status === 200 && jobs.length >= 1 && files.length >= 1 ? "PASS" : "FAIL",
    `jobs=${jobs.length} files=${files.length}`,
  );

  const stranger = await loginLocalCustomerOne();

  const primaryFile =
    files.find((file) => file.fileName === DISPOSABLE_FILENAMES["deliverable-0"]) ?? files[0];
  const downloadPath =
    primaryFile?.url?.startsWith("http")
      ? new URL(primaryFile.url).pathname
      : primaryFile?.url ?? primaryFile?.accessHref;

  const exposesUnreleased = files.some((file) => file.fileName === UNRELEASED_HARNESS_FILENAME);
  record(
    "unreleased-not-exposed",
    exposesUnreleased ? "FAIL" : "PASS",
    exposesUnreleased ? "Unreleased harness file appeared in delivery API" : "unreleased omitted",
  );

  if (downloadPath) {
    const dlRes = await fetch(`${BASE}${downloadPath.startsWith("/") ? downloadPath : `/${downloadPath}`}`, {
      headers: { Cookie: `studio_session=${clientCookie}` },
    });
    const body = dlRes.ok ? Buffer.from(await dlRes.arrayBuffer()) : Buffer.alloc(0);
    const bytesMatch = body.equals(harnessPrimaryBytes);
    record(
      "download-bytes-authorized",
      dlRes.status === 200 && bytesMatch ? "PASS" : "FAIL",
      `HTTP ${dlRes.status} bytesMatch=${bytesMatch} expectedSha=${sha256Prefixed(harnessPrimaryBytes).slice(0, 20)}…`,
    );

    if (stranger.ok) {
      const strangerDl = await fetch(
        `${BASE}${downloadPath.startsWith("/") ? downloadPath : `/${downloadPath}`}`,
        { headers: { Cookie: `studio_session=${stranger.cookie}` } },
      );
      record(
        "download-cross-customer-denied",
        strangerDl.status === 403 || strangerDl.status === 401 || strangerDl.status === 404
          ? "PASS"
          : "FAIL",
        `foreign session HTTP ${strangerDl.status}`,
      );
    }
  } else {
    record("download-bytes-authorized", "FAIL", "No client-visible download href on delivery view");
  }

  if (!stranger.ok) {
    record("cross-customer-denied", "BLOCKED", `local-customer-one unavailable HTTP ${stranger.status}`);
  } else {
    const foreignReview = await api(
      stranger.cookie,
      "GET",
      `/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}/review`,
    );
    const foreignDelivery = await api(stranger.cookie, "GET", `/api/campaigns/${CAMPAIGN_ID}/delivery`);
    const denied =
      (foreignReview.status === 403 || foreignReview.status === 404) &&
      (foreignDelivery.status === 403 || foreignDelivery.status === 404);
    record(
      "cross-customer-denied",
      denied ? "PASS" : "FAIL",
      `review=${foreignReview.status} delivery=${foreignDelivery.status}`,
    );
  }

  async function assertConveyorDeliveryUi(page, viewport, screenshotBase) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const deliveryUrl = `${BASE}/feedback-studio?roomState=delivery&jobId=${encodeURIComponent(JOB_ID)}&campaignId=${encodeURIComponent(CAMPAIGN_ID)}`;
    await page.goto(deliveryUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector("[data-final-delivery-room]", { timeout: 60000 });
    await page.waitForSelector("main.fdr--ready", { timeout: 30000 });
    await page.locator("button.fdr__package:not([disabled])").click();
    await page.waitForSelector("main.fdr--open", { timeout: 15000 });
    await page.keyboard.press("Escape");
    await page.waitForSelector("main.fdr--open:not(.fdr--reading)", { timeout: 10000 });
    await page.locator('button.fdr__tile[data-group="files"]').click();
    const downloadLink = page.locator(".fdr__files a[download]").first();
    await downloadLink.waitFor({ state: "visible", timeout: 15000 });
    const href = await downloadLink.getAttribute("href");
    const linkText = await downloadLink.innerText();
    const hasExpectedName = linkText.includes(DISPOSABLE_FILENAMES["deliverable-0"]);
    await page.screenshot({
      path: path.join(OUT, `${screenshotBase}-conveyor-files.png`),
      fullPage: true,
    });
    return { href, hasExpectedName };
  }

  const browser = await chromium.launch({ headless: true });
  const clientContext = await browser.newContext();
  await clientContext.addCookies([
    sessionCookiePlaywright(BASE, clientCookie),
  ]);
  const page = await clientContext.newPage();

  let desktopUi = { href: null, hasExpectedName: false };
  let mobileUi = { href: null, hasExpectedName: false };
  try {
    desktopUi = await assertConveyorDeliveryUi(
      page,
      { width: 1280, height: 800 },
      "desktop-1280",
    );
    record(
      "final-delivery-conveyor-desktop-1280",
      desktopUi.hasExpectedName && desktopUi.href ? "PASS" : "FAIL",
      desktopUi.href ?? "missing download href",
    );
    mobileUi = await assertConveyorDeliveryUi(page, { width: 390, height: 844 }, "mobile-390");
    record(
      "final-delivery-conveyor-mobile-390",
      mobileUi.hasExpectedName && mobileUi.href ? "PASS" : "FAIL",
      mobileUi.href ?? "missing download href",
    );
    const partialOk =
      (await page.locator("body").innerText()).includes("Your package is open") ||
      (await page.locator("body").innerText()).includes("Your files");
    record(
      "final-delivery-messaging",
      partialOk ? "PASS" : "FAIL",
      "Conveyor open + files sheet (partial/full copy via released presentation)",
    );
  } catch (error) {
    if (!results.some((r) => r.step === "final-delivery-conveyor-desktop-1280")) {
      record(
        "final-delivery-conveyor-desktop-1280",
        "FAIL",
        error instanceof Error ? error.message : String(error),
      );
    }
    if (!results.some((r) => r.step === "final-delivery-conveyor-mobile-390")) {
      record("final-delivery-conveyor-mobile-390", "FAIL", "blocked by conveyor failure");
    }
    await page.screenshot({ path: path.join(OUT, "final-delivery-conveyor-error.png"), fullPage: true });
  }
  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    campaignId: CAMPAIGN_ID,
    jobId: JOB_ID,
    results,
  };
  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

  const failed = results.some((r) => r.status === "FAIL");
  const blocked = results.filter((r) => r.status === "BLOCKED");
  if (blocked.length) {
    console.log(`\nBlocked (${blocked.length}): ${blocked.map((b) => b.step).join(", ")}`);
  }
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
