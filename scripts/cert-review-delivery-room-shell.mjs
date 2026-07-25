/**
 * Package 7B1 — Review & Delivery Room Shell certification (Playwright).
 *
 * Uses route mocks so certification does not depend on seed mutation.
 * Evidence → test-artifacts/package-7b1-review-delivery-shell/
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.CERT_BASE_URL || "http://localhost:3000";
const OUT = join(process.cwd(), "test-artifacts", "package-7b1-review-delivery-shell");
const CLIENT_LOGIN = { email: "client@local.dev", password: "dev-only" };
const CAMPAIGN_ID = "pkg7b1-shell-cert";
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

function campaignRecord() {
  return {
    campaignId: CAMPAIGN_ID,
    campaignName: "Package 7B1 Shell Cert",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Shell foundation certification.",
    estimatedCompletion: "July 30, 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    paymentReceivedAt: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: new Date().toISOString(),
  };
}

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

const JOB_WAITING = {
  jobId: "job-waiting",
  serviceName: "Email Sequence",
  stageId: "waiting-on-you",
  label: "Waiting on You",
  explanation: "The Studio needs something from you before this work can continue.",
  actionOwner: "customer",
  blocksCampaignCustomerAction: true,
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

const JOB_DELIVERED = {
  jobId: "job-delivered",
  serviceName: "Brand Kit",
  stageId: "final-delivery",
  label: "Final Delivery",
  explanation: "This work has been delivered.",
  actionOwner: "complete",
  blocksCampaignCustomerAction: false,
  terminal: true,
};

async function preparePage(context, stagesBody, options = {}) {
  const page = await context.newPage();
  const delayMs = options.stagesDelayMs ?? 0;

  await page.route("**/api/campaigns/current", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ campaign: campaignRecord() }),
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
      body: JSON.stringify({ campaign: campaignRecord() }),
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
    { key: CAMPAIGN_KEY, record: campaignRecord() },
  );

  return page;
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

  // 1) Production → Studio Working
  {
    const page = await preparePage(
      context,
      stagesPayload(
        [JOB_PRODUCTION],
        "studio-working",
        "Studio Working",
        "The Studio owns the next move on this work.",
      ),
    );
    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "networkidle" });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    const heading = ((await page.locator("#rd-stage-heading").textContent()) || "").trim();
    push(`${prefix}: production → Studio Working`, heading === "Studio Working", {
      detail: heading,
    });
    const hasReviewLink = await page.locator("a", { hasText: "Open Review" }).count();
    push(`${prefix}: production has no Open Review link`, hasReviewLink === 0);
    await page.screenshot({ path: join(OUT, `${prefix}-01-studio-working.png`) });
    await page.close();
  }

  // 2) Waiting on You
  {
    const page = await preparePage(
      context,
      stagesPayload(
        [JOB_WAITING],
        "waiting-on-you",
        "Waiting on You",
        "The Studio needs something from you before this work can continue.",
      ),
    );
    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "networkidle" });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    const heading = ((await page.locator("#rd-stage-heading").textContent()) || "").trim();
    const explanation = (
      (await page.locator(".rd-stage-card__explanation").first().textContent()) || ""
    ).trim();
    push(`${prefix}: waiting → Waiting on You`, heading === "Waiting on You", {
      detail: heading,
    });
    push(
      `${prefix}: waiting uses generic explanation`,
      explanation ===
        "The Studio needs something from you before this work can continue.",
    );
    await page.screenshot({ path: join(OUT, `${prefix}-02-waiting-on-you.png`) });
    await page.close();
  }

  // 3) Mixed → Project in Progress
  {
    const page = await preparePage(
      context,
      stagesPayload(
        [JOB_REVIEW, JOB_PRODUCTION],
        "project-in-progress",
        "Project in Progress",
        "Your project has work in multiple stages.",
      ),
    );
    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "networkidle" });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    const summary = ((await page.locator(".rd-shell__summary-label").textContent()) || "").trim();
    const jobCount = await page.locator(".rd-job-list__item").count();
    push(`${prefix}: mixed → Project in Progress`, summary === "Project in Progress", {
      detail: summary,
    });
    push(`${prefix}: mixed shows all jobs`, jobCount === 2, { detail: `jobs=${jobCount}` });
    const openReview = page.locator("a", { hasText: "Open Review" });
    push(`${prefix}: mixed shows Open Review for reviewable job`, (await openReview.count()) === 1);
    await page.screenshot({ path: join(OUT, `${prefix}-03-mixed.png`) });
    await page.close();
  }

  // 4) Bare /feedback-studio with review-ready opens shell (not workspace)
  {
    const page = await preparePage(
      context,
      stagesPayload(
        [JOB_REVIEW],
        "work-ready-for-review",
        "Work Ready for Review",
        "Work is available for your review.",
      ),
      {
        reviews: [
          {
            jobId: JOB_REVIEW.jobId,
            campaignId: CAMPAIGN_ID,
            serviceName: JOB_REVIEW.serviceName,
          },
        ],
      },
    );
    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "networkidle" });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    const workspace = await page.locator(".fs-review--workspace").count();
    push(`${prefix}: bare review-ready opens shell`, workspace === 0);
    push(
      `${prefix}: bare review-ready shows stage card`,
      ((await page.locator("#rd-stage-heading").textContent()) || "").trim() ===
        "Work Ready for Review",
    );
    await page.screenshot({ path: join(OUT, `${prefix}-04-bare-review-ready.png`) });
    await page.close();
  }

  // 5) Explicit authorized ?jobId= opens existing workspace
  {
    const page = await preparePage(
      context,
      stagesPayload(
        [JOB_REVIEW],
        "work-ready-for-review",
        "Work Ready for Review",
        "Work is available for your review.",
      ),
      {
        reviews: [
          {
            jobId: JOB_REVIEW.jobId,
            campaignId: CAMPAIGN_ID,
            serviceName: JOB_REVIEW.serviceName,
          },
        ],
        jobReview: {
          jobId: JOB_REVIEW.jobId,
          campaignId: CAMPAIGN_ID,
          serviceName: JOB_REVIEW.serviceName,
          campaignName: "Package 7B1 Shell Cert",
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
        },
      },
    );
    await page.goto(
      `${BASE}/feedback-studio?jobId=${encodeURIComponent(JOB_REVIEW.jobId)}`,
      { waitUntil: "networkidle" },
    );
    await page.waitForSelector(".fs-review--workspace", { timeout: 15000 });
    const shell = await page.locator(".rd-shell").count();
    push(`${prefix}: explicit jobId opens JobReviewWorkspace`, shell === 0);
    await page.screenshot({ path: join(OUT, `${prefix}-05-explicit-review.png`) });
    await page.close();
  }

  // 6) Unknown jobId
  {
    const page = await preparePage(
      context,
      stagesPayload(
        [JOB_PRODUCTION],
        "studio-working",
        "Studio Working",
        "The Studio owns the next move on this work.",
      ),
    );
    await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent("opaque-unknown-id")}`, {
      waitUntil: "networkidle",
    });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    const heading = ((await page.locator("#rd-stage-heading").textContent()) || "").trim();
    push(`${prefix}: unknown jobId → not available`, heading === "That work is not available.", {
      detail: heading,
    });
    const bodyText = (await page.locator(".rd-shell").innerText()).toLowerCase();
    push(
      `${prefix}: unknown jobId does not mention other campaign`,
      !bodyText.includes("another campaign") && !bodyText.includes("does not exist"),
    );
    push(
      `${prefix}: unknown jobId still lists authorized jobs`,
      (await page.locator(".rd-job-list__item").count()) === 1,
    );
    await page.screenshot({ path: join(OUT, `${prefix}-06-unknown-job.png`) });
    await page.close();
  }

  // 7) Final Delivery card — no mock package / files
  {
    const page = await preparePage(
      context,
      stagesPayload(
        [JOB_DELIVERED],
        "final-delivery",
        "Final Delivery",
        "This work has been delivered.",
      ),
    );
    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "networkidle" });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    const deliveryLink = page.locator("a", { hasText: "Open Final Delivery" });
    push(`${prefix}: Final Delivery link present`, (await deliveryLink.count()) === 1);
    const href = await deliveryLink.getAttribute("href");
    push(`${prefix}: Final Delivery href is /deliverables`, href === "/deliverables", {
      detail: href || "(none)",
    });
    const html = await page.locator(".rd-shell").innerHTML();
    push(
      `${prefix}: Final Delivery card has no mock package/files`,
      !html.includes("fd-deliverables") &&
        !html.includes("fd-block") &&
        !html.toLowerCase().includes("download"),
    );
    await page.screenshot({ path: join(OUT, `${prefix}-07-final-delivery.png`) });
    await page.close();
  }

  // 8) Keyboard selection + focus
  {
    const page = await preparePage(
      context,
      stagesPayload(
        [JOB_WAITING, JOB_PRODUCTION],
        "waiting-on-you",
        "Waiting on You",
        "The Studio needs something from you before this work can continue.",
      ),
    );
    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "networkidle" });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    const second = page.locator(".rd-job-list__item").nth(1);
    await second.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    const heading = ((await page.locator("#rd-stage-heading").textContent()) || "").trim();
    push(`${prefix}: keyboard selects second job`, heading === "Studio Working", {
      detail: heading,
    });
    const focusedId = await page.evaluate(() => document.activeElement?.id || "");
    push(`${prefix}: focus moves to stage heading`, focusedId === "rd-stage-heading", {
      detail: focusedId,
    });
    await page.screenshot({ path: join(OUT, `${prefix}-08-keyboard.png`) });
    await page.close();
  }

  // 9) No horizontal overflow at 360 (phone viewport already narrow; also force 360)
  if (viewport.id === "phone") {
    const page = await preparePage(
      context,
      stagesPayload(
        [JOB_WAITING, JOB_PRODUCTION, JOB_DELIVERED],
        "project-in-progress",
        "Project in Progress",
        "Your project has work in multiple stages.",
      ),
    );
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "networkidle" });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
      };
    });
    push(
      `${prefix}: no horizontal overflow at 360`,
      overflow.scrollWidth <= overflow.clientWidth + 1,
      { detail: `${overflow.scrollWidth} vs ${overflow.clientWidth}` },
    );
    const target = await page.locator(".rd-job-list__item").first().boundingBox();
    push(
      `${prefix}: job target >= 44px`,
      Boolean(target && target.height >= 44),
      { detail: target ? `h=${target.height}` : "missing" },
    );
    await page.screenshot({ path: join(OUT, `${prefix}-09-360.png`) });
    await page.close();
  }

  // 10) Hydration throttle — no false stage flash
  {
    const page = await preparePage(
      context,
      stagesPayload(
        [JOB_PRODUCTION],
        "studio-working",
        "Studio Working",
        "The Studio owns the next move on this work.",
      ),
      { stagesDelayMs: 1200 },
    );
    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT, `${prefix}-10-hydration-loading.png`) });
    const busy = await page.locator('[aria-busy="true"]').count();
    const earlyHeading = await page.locator("#rd-stage-heading").count();
    const earlyNotReady = await page.evaluate(() =>
      /not ready|no active project/i.test(document.body?.innerText || ""),
    );
    push(`${prefix}: hydration shows busy state`, busy > 0);
    push(`${prefix}: hydration has no early stage heading`, earlyHeading === 0);
    push(`${prefix}: hydration has no false not-ready copy`, !earlyNotReady);
    await page.waitForSelector("#rd-stage-heading", { timeout: 10000 });
    await page.screenshot({ path: join(OUT, `${prefix}-11-hydration-ready.png`) });
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

const report = {
  package: "Package 7B1 — Review & Delivery Room Shell Foundation",
  base: BASE,
  generatedAt: new Date().toISOString(),
  results,
  pass: results.filter((r) => r.ok).length,
  fail: results.filter((r) => !r.ok).length,
};
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(
  `\nReport: ${join(OUT, "report.json")}  (${report.pass} pass / ${report.fail} fail)`,
);
process.exit(report.fail > 0 ? 1 : 0);
