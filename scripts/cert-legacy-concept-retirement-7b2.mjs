/**
 * Package 7B2 — Legacy Concept Review Customer-Path Retirement certification.
 *
 * Proves concept picker/review is unreachable; Review Room shell + job workspace remain.
 * Evidence → test-artifacts/package-7b2-legacy-concept-retirement/
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.CERT_BASE_URL || "http://localhost:3000";
const OUT = join(process.cwd(), "test-artifacts", "package-7b2-legacy-concept-retirement");
const CLIENT_LOGIN = { email: "client@local.dev", password: "dev-only" };
const CAMPAIGN_ID = "pkg7b2-concept-retire";
const CAMPAIGN_KEY = "studio-squishy:current-campaign";

mkdirSync(OUT, { recursive: true });

const results = [];

function push(check, ok, extra = {}) {
  results.push({ check, ok, ...extra });
  console.log(`${ok ? "PASS" : "FAIL"}  ${check}${extra.detail ? ` — ${extra.detail}` : ""}`);
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CLIENT_LOGIN),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/studio_session=([^;]+)/);
  if (!match) throw new Error("No session cookie");
  return match[1];
}

function baseCampaign(overrides = {}) {
  return {
    campaignId: CAMPAIGN_ID,
    campaignName: "Package 7B2 Concept Retirement",
    campaignStatus: "READY_FOR_REVIEW",
    campaignDescription: "Legacy concept retirement certification.",
    estimatedCompletion: "July 30, 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    paymentReceivedAt: "2026-07-01T00:00:00.000Z",
    projectDetailsSubmittedAt: "2026-07-02T00:00:00.000Z",
    selectedCampaignOption: "Campaign Concept B",
    conceptsGeneratedAt: "2026-07-03T00:00:00.000Z",
    concepts: [
      {
        id: "A",
        directionLabel: "Direction A",
        tagline: "Warm & welcoming",
        summary: "Legacy concept A for retirement cert.",
        whyChosen: "Historical fixture only.",
        hero: { headline: "A", subhead: "Warm", accent: "warm" },
      },
      {
        id: "B",
        directionLabel: "Direction B",
        tagline: "Bold & bright",
        summary: "Legacy concept B for retirement cert.",
        whyChosen: "Historical fixture only.",
        hero: { headline: "B", subhead: "Bold", accent: "bold" },
      },
      {
        id: "C",
        directionLabel: "Direction C",
        tagline: "Clean & premium",
        summary: "Legacy concept C for retirement cert.",
        whyChosen: "Historical fixture only.",
        hero: { headline: "C", subhead: "Premium", accent: "premium" },
      },
    ],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z",
    ...overrides,
  };
}

const JOB_PRODUCTION = {
  jobId: "job-production",
  serviceName: "Make Me a Flyer",
  stageId: "studio-working",
  label: "Studio Working",
  explanation: "The Studio owns the next move on this work.",
  actionOwner: "studio",
  blocksCampaignCustomerAction: false,
  terminal: false,
};

const JOB_REVIEW = {
  jobId: "job-review",
  serviceName: "Social Set",
  stageId: "work-ready-for-review",
  label: "Work Ready for Review",
  explanation: "Work is available for your review.",
  actionOwner: "customer",
  blocksCampaignCustomerAction: true,
  terminal: false,
};

function stagesPayload(jobs, summaryId, summaryLabel, summaryExplanation) {
  return {
    summary: {
      summaryId,
      label: summaryLabel,
      explanation: summaryExplanation,
    },
    jobs,
  };
}

function jobReviewPayload() {
  return {
    jobId: JOB_REVIEW.jobId,
    campaignId: CAMPAIGN_ID,
    serviceName: JOB_REVIEW.serviceName,
    campaignName: "Package 7B2 Concept Retirement",
    spineStatus: "ready_for_review",
    deliverables: [
      {
        key: "deliverable-0",
        label: "Primary",
        prepared: true,
        proofFiles: [],
      },
    ],
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    feedback: {
      jobId: JOB_REVIEW.jobId,
      campaignId: CAMPAIGN_ID,
      sectionStatuses: { "deliverable-0": "neutral" },
      stickyNotes: [],
      voiceNotes: [],
      drawSections: [],
      updatedAt: new Date().toISOString(),
    },
    activity: [],
    canRequestRevision: true,
    canApproveForDelivery: true,
    blockedReasons: [],
  };
}

async function preparePage(context, stagesBody, options = {}) {
  const page = await context.newPage();
  const campaign = options.campaign ?? baseCampaign();
  const delayMs = options.stagesDelayMs ?? 0;

  await page.route("**/api/campaigns/current", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ campaign }),
    });
  });

  await page.route(`**/api/campaigns/${CAMPAIGN_ID}`, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ campaign }),
    });
  });

  await page.route(`**/api/campaigns/${CAMPAIGN_ID}/stages`, async (route) => {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(stagesBody),
    });
  });

  await page.route(`**/api/campaigns/${CAMPAIGN_ID}/review`, async (route) => {
    const reviews = options.reviews ?? [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reviews, jobIds: reviews.map((r) => r.jobId) }),
    });
  });

  await page.route(`**/api/campaigns/${CAMPAIGN_ID}/jobs/**/review`, async (route) => {
    if (options.jobReview) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ review: options.jobReview }),
      });
      return;
    }
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: "This job is not ready for client review." }),
    });
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, record }) => {
      localStorage.setItem(key, JSON.stringify(record));
      window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
    },
    { key: CAMPAIGN_KEY, record: campaign },
  );

  return page;
}

async function readStoredCampaign(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, CAMPAIGN_KEY);
}

async function assertNoConceptUi(page, prefix, label) {
  const picker = await page.locator(".fs-picker, .fs-picker__grid, .fs-direction-card").count();
  const conceptReview = await page
    .locator('[aria-label*="Concept A review"], [aria-label*="Concept B review"], [aria-label*="Concept C review"]')
    .count();
  const chooseDirection = await page.getByRole("button", { name: /Choose this direction/i }).count();
  const chooseLink = await page.getByRole("link", { name: /Review this direction/i }).count();
  push(`${prefix}: ${label} — no concept picker DOM`, picker === 0);
  push(`${prefix}: ${label} — no concept review DOM`, conceptReview === 0);
  push(`${prefix}: ${label} — no Choose this direction`, chooseDirection === 0 && chooseLink === 0);
}

async function certifyViewport(browser, cookie, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: "reduce",
  });
  await context.addCookies([
    {
      name: "studio_session",
      value: cookie,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const prefix = viewport.id;
  const emptyStages = stagesPayload(
    [],
    "project-in-progress",
    "Project in Progress",
    "Your project has work in multiple stages.",
  );
  const productionStages = stagesPayload(
    [JOB_PRODUCTION],
    "studio-working",
    "Studio Working",
    "The Studio owns the next move on this work.",
  );
  const reviewStages = stagesPayload(
    [JOB_REVIEW],
    "work-ready-for-review",
    "Work Ready for Review",
    "Work is available for your review.",
  );

  // 1) Bare Review Room → shell
  {
    const page = await preparePage(context, productionStages);
    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "networkidle" });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    push(`${prefix}: bare opens shell`, (await page.locator(".rd-shell").count()) === 1);
    push(`${prefix}: bare does not open workspace`, (await page.locator(".fs-review--workspace").count()) === 0);
    await assertNoConceptUi(page, prefix, "bare");
    await page.screenshot({ path: join(OUT, `${prefix}-01-bare-shell.png`) });
    await page.close();
  }

  // 2) READY_FOR_REVIEW + concepts → shell
  {
    const page = await preparePage(context, emptyStages);
    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "networkidle" });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    push(`${prefix}: READY_FOR_REVIEW opens shell`, (await page.locator(".rd-shell").count()) === 1);
    await assertNoConceptUi(page, prefix, "READY_FOR_REVIEW");
    const empty = ((await page.locator(".rd-shell__empty").textContent()) || "").trim();
    push(
      `${prefix}: READY_FOR_REVIEW empty work copy`,
      empty === "There is no active work on this project yet.",
      { detail: empty },
    );
    await page.screenshot({ path: join(OUT, `${prefix}-02-ready-for-review-shell.png`) });
    await page.close();
  }

  // 3–6) Concept A/B/C/unknown → shell; mutation proof
  for (const concept of ["A", "B", "C", "Z"]) {
    const page = await preparePage(context, emptyStages);
    const before = await readStoredCampaign(page);
    await page.goto(`${BASE}/feedback-studio?concept=${concept}`, { waitUntil: "networkidle" });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    push(`${prefix}: concept=${concept} opens shell`, (await page.locator(".rd-shell").count()) === 1);
    await assertNoConceptUi(page, prefix, `concept=${concept}`);
    const after = await readStoredCampaign(page);
    push(
      `${prefix}: concept=${concept} status unchanged`,
      after?.campaignStatus === before?.campaignStatus && after?.campaignStatus === "READY_FOR_REVIEW",
    );
    push(
      `${prefix}: concept=${concept} selected option unchanged`,
      after?.selectedCampaignOption === before?.selectedCampaignOption,
    );
    push(
      `${prefix}: concept=${concept} concepts unchanged`,
      JSON.stringify(after?.concepts) === JSON.stringify(before?.concepts) &&
        after?.conceptsGeneratedAt === before?.conceptsGeneratedAt,
    );
    push(
      `${prefix}: concept=${concept} no completion timestamp added`,
      after?.updatedAt === before?.updatedAt,
    );
    await page.screenshot({ path: join(OUT, `${prefix}-03-concept-${concept}.png`) });
    await page.close();
  }

  // 7) Valid jobId → workspace
  {
    const page = await preparePage(context, reviewStages, {
      reviews: [{ jobId: JOB_REVIEW.jobId, campaignId: CAMPAIGN_ID, serviceName: JOB_REVIEW.serviceName }],
      jobReview: jobReviewPayload(),
    });
    await page.goto(
      `${BASE}/feedback-studio?jobId=${encodeURIComponent(JOB_REVIEW.jobId)}`,
      { waitUntil: "networkidle" },
    );
    await page.waitForSelector(".fs-review--workspace", { timeout: 15000 });
    push(`${prefix}: valid jobId opens workspace`, (await page.locator(".fs-review--workspace").count()) === 1);
    push(`${prefix}: valid jobId has no shell`, (await page.locator(".rd-shell").count()) === 0);
    await assertNoConceptUi(page, prefix, "valid jobId");
    await page.screenshot({ path: join(OUT, `${prefix}-04-job-workspace.png`) });
    await page.close();
  }

  // 8) concept + valid jobId → workspace
  {
    const page = await preparePage(context, reviewStages, {
      reviews: [{ jobId: JOB_REVIEW.jobId, campaignId: CAMPAIGN_ID, serviceName: JOB_REVIEW.serviceName }],
      jobReview: jobReviewPayload(),
    });
    await page.goto(
      `${BASE}/feedback-studio?concept=A&jobId=${encodeURIComponent(JOB_REVIEW.jobId)}`,
      { waitUntil: "networkidle" },
    );
    await page.waitForSelector(".fs-review--workspace", { timeout: 15000 });
    push(
      `${prefix}: concept+jobId opens workspace`,
      (await page.locator(".fs-review--workspace").count()) === 1,
    );
    await assertNoConceptUi(page, prefix, "concept+jobId");
    await page.screenshot({ path: join(OUT, `${prefix}-05-concept-plus-job.png`) });
    await page.close();
  }

  // 9) Unknown jobId → unavailable
  {
    const page = await preparePage(context, productionStages);
    await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent("opaque-unknown-id")}`, {
      waitUntil: "networkidle",
    });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    const heading = ((await page.locator("#rd-stage-heading").textContent()) || "").trim();
    push(`${prefix}: unknown jobId unavailable`, heading === "That work is not available.", {
      detail: heading,
    });
    await page.screenshot({ path: join(OUT, `${prefix}-06-unknown-job.png`) });
    await page.close();
  }

  // 10) Board / Project Record wording (config surface via Board page)
  {
    const page = await preparePage(context, emptyStages);
    await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const boardText = (await page.locator("body").innerText()) || "";
    push(`${prefix}: Board no Review My Concepts`, !/Review My Concepts/i.test(boardText));
    push(`${prefix}: Board no Concepts Ready For Review`, !/Concepts Ready For Review/i.test(boardText));
    push(`${prefix}: Board no Review Concepts label`, !/\bReview Concepts\b/i.test(boardText));
    push(
      `${prefix}: Board shows Open Review Room or Ready for Review`,
      /Open Review Room|Ready for Review/i.test(boardText),
    );
    push(`${prefix}: Board roadmap not Review Concepts`, !/\bReview Concepts\b/i.test(boardText));
    await page.screenshot({ path: join(OUT, `${prefix}-07-board-wording.png`) });

    await page.goto(`${BASE}/campaign-details`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const recordText = (await page.locator("body").innerText()) || "";
    push(
      `${prefix}: Project Record no Review Campaign Concepts`,
      !/Review Campaign Concepts/i.test(recordText),
    );
    await page.screenshot({ path: join(OUT, `${prefix}-08-project-record.png`) });
    await page.close();
  }

  // 11) Hydration — no concept UI flash
  {
    const page = await preparePage(context, emptyStages, { stagesDelayMs: 1200 });
    await page.goto(`${BASE}/feedback-studio?concept=A`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);
    const earlyPicker = await page.locator(".fs-picker, .fs-direction-card").count();
    const earlyChoose = await page.getByRole("button", { name: /Choose this direction/i }).count();
    push(`${prefix}: hydration no concept picker flash`, earlyPicker === 0);
    push(`${prefix}: hydration no Choose this direction flash`, earlyChoose === 0);
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    await page.screenshot({ path: join(OUT, `${prefix}-09-hydration.png`) });
    await page.close();
  }

  // 12) No route loop on concept URL
  {
    const page = await preparePage(context, emptyStages);
    await page.goto(`${BASE}/feedback-studio?concept=B`, { waitUntil: "networkidle" });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    const url = page.url();
    push(
      `${prefix}: no route loop`,
      url.includes("/feedback-studio") && url.includes("concept=B") && !url.includes("/sign-in"),
      { detail: url },
    );
    await page.close();
  }

  // 13) Phone 360 overflow
  if (viewport.id === "phone") {
    const page = await preparePage(context, productionStages);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${BASE}/feedback-studio?concept=A`, { waitUntil: "networkidle" });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
    });
    push(
      `${prefix}: no horizontal overflow at 360`,
      overflow.scrollWidth <= overflow.clientWidth + 1,
      { detail: `${overflow.scrollWidth} vs ${overflow.clientWidth}` },
    );
    await page.screenshot({ path: join(OUT, `${prefix}-10-360.png`) });
    await page.close();
  }

  // 14) No invented released-file state on Review Room
  {
    const page = await preparePage(context, emptyStages);
    await page.goto(`${BASE}/feedback-studio?concept=A`, { waitUntil: "networkidle" });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    const html = (await page.locator(".rd-shell").innerHTML()).toLowerCase();
    push(
      `${prefix}: no invented released-file UI`,
      !html.includes("fd-deliverables") && !html.includes("download package"),
    );
    await page.close();
  }

  await context.close();
}

const cookie = await login();
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { id: "desktop", width: 1440, height: 900 },
    { id: "phone", width: 390, height: 844 },
  ]) {
    console.log(`\n--- ${viewport.id} ${viewport.width}x${viewport.height} ---`);
    await certifyViewport(browser, cookie, viewport);
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
const report = {
  package: "Package 7B2 — Legacy Concept Review Customer-Path Retirement",
  status: failed.length === 0 ? "passed" : "failed",
  base: BASE,
  generatedAt: new Date().toISOString(),
  pass: results.filter((r) => r.ok).length,
  fail: failed.length,
  results,
};
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(`\n${report.pass} pass / ${report.fail} fail → ${join(OUT, "report.json")}`);
if (failed.length > 0) process.exit(1);
