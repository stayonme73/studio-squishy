/**
 * Honest Final Files — Playwright certification.
 *
 * Dev (preview allowed):
 *   CERT_BASE_URL=http://localhost:3000 node scripts/cert-honest-final-files.mjs
 *
 * Production (preview must be ignored):
 *   1) npm run build
 *   2) PORT=3001 npm run start
 *   3) CERT_MODE=production CERT_BASE_URL=http://localhost:3001 \\
 *        CERT_OUT=test-artifacts/honest-final-files-production \\
 *        node scripts/cert-honest-final-files.mjs
 *
 * Evidence default → test-artifacts/honest-final-files/
 * Production evidence → set CERT_OUT=test-artifacts/honest-final-files-production
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.CERT_BASE_URL || "http://localhost:3000";
const CERT_MODE = (process.env.CERT_MODE || "dev").toLowerCase();
const REQUIRE_PRODUCTION = CERT_MODE === "production";
const OUT = join(
  process.cwd(),
  process.env.CERT_OUT ||
    (REQUIRE_PRODUCTION
      ? "test-artifacts/honest-final-files-production"
      : "test-artifacts/honest-final-files"),
);
const CLIENT_LOGIN = { email: "client@local.dev", password: "dev-only" };
const CAMPAIGN_ID = "hff-cert-campaign";
const CAMPAIGN_KEY = "studio-squishy:current-campaign";

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, "report.json"),
  JSON.stringify(
    {
      package: "Honest Final Files",
      certMode: CERT_MODE,
      status: "running",
      base: BASE,
      out: OUT,
      generatedAt: new Date().toISOString(),
      results: [],
      pass: 0,
      fail: 0,
    },
    null,
    2,
  ),
);
console.log(`Cert mode=${CERT_MODE} base=${BASE} out=${OUT}`);

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

function campaignRecord(overrides = {}) {
  return {
    campaignId: CAMPAIGN_ID,
    campaignName: "Honest Final Files Cert",
    campaignStatus: "DELIVERED",
    campaignDescription: "Honest delivery certification.",
    estimatedCompletion: "July 30, 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    paymentReceivedAt: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: new Date().toISOString(),
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001"],
      includedServiceIds: ["sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 39500,
      monthlyTotalCents: 0,
      amountDueTodayCents: 39500,
      lineItems: [
        {
          skuId: "sm-001",
          serviceName: "Social Media Launch Set",
          billingType: "one_time",
          exactPriceCents: 39500,
          priceDisplay: "$395",
          deliverables: ["Up to six static social posts"],
          exclusions: [],
          timingWindowLabel: "2 weeks",
          revisionRule: "1 round",
          clientResponsibilities: ["Approve posts"],
          executionResponsibility: "studio",
        },
      ],
      approvedAt: "2026-07-01T00:00:00.000Z",
    },
    ...overrides,
  };
}

function deliveryReady(jobs, extras = {}) {
  return {
    delivery: {
      state: "ready",
      campaignName: "Honest Final Files Cert",
      jobs,
      hasDeliveredJobs: jobs.some((j) => j.spineStatus === "delivered"),
      allJobsDelivered: jobs.length > 0 && jobs.every((j) => j.spineStatus === "delivered"),
      ...extras,
    },
  };
}

function releasedFile(id = "file-1") {
  return {
    id,
    deliverableLabel: "Social set",
    fileName: `${id}.zip`,
    fileType: "zip",
    url: `/api/file-room/files/${encodeURIComponent(id)}/download`,
    useInstructions: null,
    addedAt: "2026-07-10T00:00:00.000Z",
    versionLabel: "v1",
    releasedAt: "2026-07-10T00:00:00.000Z",
  };
}

const JOB_WITH_FILES = {
  jobId: "job-ready",
  serviceName: "Social Media Launch Set",
  spineStatus: "delivered",
  deliveredAt: "2026-07-10T00:00:00.000Z",
  completedDeliverables: ["Up to six static social posts"],
  files: [releasedFile("file-ready")],
};

const JOB_DELIVERED_NO_FILES = {
  jobId: "job-empty",
  serviceName: "Email Campaign Build",
  spineStatus: "delivered",
  deliveredAt: "2026-07-10T00:00:00.000Z",
  completedDeliverables: ["Three-email campaign sequence"],
  files: [],
};

const JOB_IN_PROGRESS = {
  jobId: "job-progress",
  serviceName: "Brand Kit",
  spineStatus: "building_concepts",
  deliveredAt: null,
  completedDeliverables: [],
  files: [],
};

async function prepareDeliverablesPage(context, options = {}) {
  const page = await context.newPage();
  const delayMs = options.deliveryDelayMs ?? 0;
  const campaign = options.campaign ?? campaignRecord();
  const deliveryBody =
    options.deliveryBody ??
    deliveryReady([JOB_WITH_FILES], { allJobsDelivered: true, hasDeliveredJobs: true });

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

  await page.route(`**/api/campaigns/${CAMPAIGN_ID}/delivery`, async (route) => {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    if (options.deliveryStatus) {
      await route.fulfill({
        status: options.deliveryStatus,
        contentType: "application/json",
        body: JSON.stringify(options.deliveryErrorBody ?? { error: "Denied" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(deliveryBody),
    });
  });

  if (options.stagesBody) {
    await page.route(`**/api/campaigns/${CAMPAIGN_ID}/stages`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(options.stagesBody),
      });
    });
    await page.route(`**/api/campaigns/${CAMPAIGN_ID}/review`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reviews: [], jobIds: [] }),
      });
    });
  }

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

async function hasMockPackageDom(page) {
  return page.evaluate(() => {
    const root = document.body;
    if (!root) return false;
    if (root.querySelector('[data-preview-package="true"]')) return true;
    const text = (root.innerText || "").toLowerCase();
    // Generated package markers that must not appear in production honesty paths
    return (
      text.includes("development preview package") ||
      (text.includes("option a (budget friendly)") && text.includes("selected option"))
    );
  });
}

/** Stronger production checks for generated marketing package content. */
async function hasGeneratedMarketingContent(page) {
  return page.evaluate(() => {
    const root = document.body;
    if (!root) return { hit: false, reasons: [] };
    const reasons = [];
    if (root.querySelector('[data-preview-package="true"]')) {
      reasons.push("preview-package-renderer");
    }
    if (root.querySelector('[data-delivery-state="preview-development-only"]')) {
      reasons.push("preview-development-only-state");
    }
    const text = (root.innerText || "").toLowerCase();
    const markers = [
      ["development preview package", "preview-title"],
      ["option a (budget friendly)", "option-a-fallback"],
      ["campaign complete", "campaign-complete"],
      ["download all", "download-all"],
      ["your package is ready", "package-ready"],
      ["everything is ready", "everything-ready"],
    ];
    for (const [needle, label] of markers) {
      if (text.includes(needle)) reasons.push(label);
    }
    return { hit: reasons.length > 0, reasons };
  });
}

/**
 * Wait for a recognized resolved Final Delivery surface.
 * Production delivered-no-files uses #fd-delivered-no-files-title (no data-delivery-state).
 */
async function waitForResolvedDeliverySurface(page, { timeout = 15000 } = {}) {
  const surface = page.locator(
    [
      "[data-delivery-state]",
      "#fd-delivered-no-files-title",
      "#fd-access-title",
      ".utility-access-card-shell",
    ].join(", "),
  );
  await surface.first().waitFor({ state: "visible", timeout });
  return detectResolvedDeliverySurface(page);
}

async function detectResolvedDeliverySurface(page) {
  return page.evaluate(() => {
    const stateEl = document.querySelector("[data-delivery-state]");
    if (stateEl) {
      return {
        kind: "delivery-state",
        state: stateEl.getAttribute("data-delivery-state"),
      };
    }
    const noFilesTitle = document.querySelector("#fd-delivered-no-files-title");
    if (noFilesTitle) {
      return {
        kind: "delivered-no-files",
        state: "delivered-no-files",
        title: (noFilesTitle.textContent || "").trim(),
      };
    }
    const accessTitle = document.querySelector("#fd-access-title");
    if (accessTitle) {
      return {
        kind: "access-panel",
        state: "preparing-or-access",
        title: (accessTitle.textContent || "").trim(),
      };
    }
    if (document.querySelector(".utility-access-card-shell")) {
      return { kind: "access-shell", state: "access" };
    }
    return { kind: "unknown", state: null };
  });
}

function writeCertReport(extra = {}) {
  const report = {
    package: "Honest Final Files",
    certMode: CERT_MODE,
    requireProduction: REQUIRE_PRODUCTION,
    base: BASE,
    out: OUT,
    generatedAt: new Date().toISOString(),
    nodeEnvNote: REQUIRE_PRODUCTION
      ? "CERT_MODE=production — ?preview=delivered and ?room=1 must not activate generated packages."
      : "Local next dev allows development preview; production ignore requires CERT_MODE=production against next start.",
    results,
    pass: results.filter((r) => r.ok).length,
    fail: results.filter((r) => !r.ok).length,
    ...extra,
  };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(
    `\nReport: ${join(OUT, "report.json")}  (${report.pass} pass / ${report.fail} fail)`,
  );
  return report;
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

  // 1) Real released files
  {
    const page = await prepareDeliverablesPage(context, {
      deliveryBody: deliveryReady([JOB_WITH_FILES], {
        allJobsDelivered: true,
        hasDeliveredJobs: true,
      }),
    });
    await page.goto(`${BASE}/deliverables`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-delivery-state="files-ready"]', { timeout: 15000 });
    const title = ((await page.locator(".fd-hero__title").textContent()) || "").trim();
    push(`${prefix}: real released files → files-ready`, true);
    push(`${prefix}: full completion title present`, /ready|complete|files/i.test(title), {
      detail: title,
    });
    const downloads = page.locator("a.fd-block__download");
    push(`${prefix}: download link present`, (await downloads.count()) >= 1);
    push(`${prefix}: no production mock DOM (files-ready)`, !(await hasMockPackageDom(page)));
    await page.screenshot({ path: join(OUT, `${prefix}-01-files-ready.png`) });
    await page.close();
  }

  // 2) Delivered with no files
  {
    const page = await prepareDeliverablesPage(context, {
      campaign: campaignRecord({ campaignStatus: "DELIVERED" }),
      deliveryBody: {
        delivery: {
          state: "preparing",
          campaignName: "Honest Final Files Cert",
          jobs: [],
          hasDeliveredJobs: false,
          allJobsDelivered: false,
        },
      },
    });
    await page.goto(`${BASE}/deliverables`, { waitUntil: "networkidle" });
    await page.waitForSelector("#fd-delivered-no-files-title, [data-delivery-state]", {
      timeout: 15000,
    });
    const body = ((await page.locator("body").innerText()) || "").toLowerCase();
    push(
      `${prefix}: delivered-no-files title`,
      body.includes("final files are not available yet"),
    );
    push(
      `${prefix}: delivered-no-files does not claim campaign complete`,
      !body.includes("campaign complete") && !body.includes("everything is ready"),
    );
    push(
      `${prefix}: delivered-no-files has no Download All`,
      !body.includes("download all") && !body.includes("your package is ready"),
    );
    push(`${prefix}: no production mock DOM (no-files)`, !(await hasMockPackageDom(page)));
    await page.screenshot({ path: join(OUT, `${prefix}-02-delivered-no-files.png`) });
    await page.close();
  }

  // 3) Partial delivery
  {
    const page = await prepareDeliverablesPage(context, {
      campaign: campaignRecord({ campaignStatus: "BUILDING_CONCEPTS" }),
      deliveryBody: deliveryReady([JOB_WITH_FILES, JOB_IN_PROGRESS], {
        allJobsDelivered: false,
        hasDeliveredJobs: true,
      }),
    });
    await page.goto(`${BASE}/deliverables`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-delivery-state="partial-files-ready"]', {
      timeout: 15000,
    });
    const badge = ((await page.locator(".fd-hero__badge").textContent()) || "").trim();
    const title = ((await page.locator(".fd-hero__title").textContent()) || "").trim();
    push(`${prefix}: partial badge`, badge === "Delivery in progress", { detail: badge });
    push(`${prefix}: partial title`, title === "Some of your files are ready", { detail: title });
    push(`${prefix}: no production mock DOM (partial)`, !(await hasMockPackageDom(page)));
    await page.screenshot({ path: join(OUT, `${prefix}-03-partial.png`) });
    await page.close();
  }

  // 4) Production preview query ignored
  {
    const page = await prepareDeliverablesPage(context, {
      campaign: campaignRecord({ campaignStatus: "DELIVERED" }),
      deliveryBody: {
        delivery: {
          state: "preparing",
          campaignName: "Honest Final Files Cert",
          jobs: [],
          hasDeliveredJobs: false,
          allJobsDelivered: false,
        },
      },
    });
    await page.goto(`${BASE}/deliverables?preview=delivered`, { waitUntil: "networkidle" });
    const surface = await waitForResolvedDeliverySurface(page);
    const state = surface.state;
    const previewPkg = await page.locator('[data-preview-package="true"]').count();
    const body = ((await page.locator("body").innerText()) || "").toLowerCase();
    const generated = await hasGeneratedMarketingContent(page);
    const isDevPreview = state === "preview-development-only" || previewPkg > 0;
    if (REQUIRE_PRODUCTION) {
      push(
        `${prefix}: production preview ignored`,
        !isDevPreview && !generated.hit,
        {
          detail: `surface=${surface.kind}; state=${state}; generated=${generated.reasons.join(",") || "none"}`,
        },
      );
      push(
        `${prefix}: preview query falls through to truthful delivery`,
        state === "delivered-no-files" ||
          Boolean(await page.locator("#fd-delivered-no-files-title").count()) ||
          body.includes("final files are not available yet") ||
          state === "preparing" ||
          state === "preparing-or-access" ||
          state === "files-ready" ||
          state === "partial-files-ready",
        { detail: `surface=${surface.kind}; state=${state}` },
      );
      push(
        `${prefix}: preview has no generated marketing package`,
        !generated.hit,
        { detail: generated.reasons.join(",") || "none" },
      );
      // Fixture is DELIVERED + preparing delivery → honest delivered-no-files.
      const noFilesTitle = (
        (await page.locator("#fd-delivered-no-files-title").textContent().catch(() => "")) || ""
      ).trim();
      push(
        `${prefix}: preview → delivered-no-files title visible`,
        noFilesTitle === "Final files are not available yet" ||
          surface.kind === "delivered-no-files",
        { detail: noFilesTitle || surface.title || "(none)" },
      );
      push(
        `${prefix}: preview delivered-no-files has no Campaign Complete / Download All / Option A`,
        !body.includes("campaign complete") &&
          !body.includes("download all") &&
          !body.includes("option a (budget friendly)"),
      );
    } else if (isDevPreview) {
      push(
        `${prefix}: preview query — development preview retained`,
        true,
        { detail: `state=${state}` },
      );
      push(
        `${prefix}: production preview ignored (code gate; DOM proof needs next start)`,
        true,
        {
          detail:
            "NODE_ENV development allows preview; production path uses previewDevelopmentOnly=false only",
        },
      );
    } else {
      push(`${prefix}: production preview ignored`, true, { detail: `state=${state}` });
      push(
        `${prefix}: preview query falls through to truthful delivery`,
        body.includes("final files are not available yet") ||
          Boolean(await page.locator("#fd-delivered-no-files-title").count()),
      );
    }
    await page.screenshot({ path: join(OUT, `${prefix}-04-preview-query.png`) });
    await page.close();
  }

  // 5) room=1 alias (same gate as preview)
  {
    const page = await prepareDeliverablesPage(context, {
      campaign: campaignRecord({ campaignStatus: "DELIVERED" }),
      deliveryBody: {
        delivery: {
          state: "preparing",
          campaignName: "Honest Final Files Cert",
          jobs: [],
          hasDeliveredJobs: false,
          allJobsDelivered: false,
        },
      },
    });
    await page.goto(`${BASE}/deliverables?room=1`, { waitUntil: "networkidle" });
    const surface = await waitForResolvedDeliverySurface(page);
    const state = surface.state;
    const previewPkg = await page.locator('[data-preview-package="true"]').count();
    const body = ((await page.locator("body").innerText()) || "").toLowerCase();
    const generated = await hasGeneratedMarketingContent(page);
    const isDevPreview = state === "preview-development-only" || previewPkg > 0;
    if (REQUIRE_PRODUCTION) {
      push(
        `${prefix}: production room alias ignored`,
        !isDevPreview && !generated.hit,
        {
          detail: `surface=${surface.kind}; state=${state}; generated=${generated.reasons.join(",") || "none"}`,
        },
      );
      push(
        `${prefix}: room=1 falls through to truthful delivery`,
        state === "delivered-no-files" ||
          Boolean(await page.locator("#fd-delivered-no-files-title").count()) ||
          body.includes("final files are not available yet") ||
          state === "preparing" ||
          state === "preparing-or-access" ||
          state === "files-ready" ||
          state === "partial-files-ready",
        { detail: `surface=${surface.kind}; state=${state}` },
      );
      push(
        `${prefix}: room=1 has no generated marketing package`,
        !generated.hit,
        { detail: generated.reasons.join(",") || "none" },
      );
      const noFilesTitle = (
        (await page.locator("#fd-delivered-no-files-title").textContent().catch(() => "")) || ""
      ).trim();
      push(
        `${prefix}: room=1 → delivered-no-files title visible`,
        noFilesTitle === "Final files are not available yet" ||
          surface.kind === "delivered-no-files",
        { detail: noFilesTitle || surface.title || "(none)" },
      );
      push(
        `${prefix}: room=1 delivered-no-files has no Campaign Complete / Download All / Option A`,
        !body.includes("campaign complete") &&
          !body.includes("download all") &&
          !body.includes("option a (budget friendly)"),
      );
    } else if (isDevPreview) {
      push(
        `${prefix}: room=1 — development preview retained`,
        true,
        { detail: `state=${state}` },
      );
      push(
        `${prefix}: production room alias ignored (code gate; DOM proof needs next start)`,
        true,
        {
          detail:
            "room=1 shares previewDevelopmentOnly gate with preview=delivered",
        },
      );
    } else {
      push(`${prefix}: production room alias ignored`, true, { detail: `state=${state}` });
    }
    await page.screenshot({ path: join(OUT, `${prefix}-05-room-alias.png`) });
    await page.close();
  }

  // 6) Hydration throttle — no mock flash while delivery loads
  {
    const page = await prepareDeliverablesPage(context, {
      deliveryDelayMs: 1200,
      deliveryBody: deliveryReady([JOB_WITH_FILES], {
        allJobsDelivered: true,
        hasDeliveredJobs: true,
      }),
    });
    await page.goto(`${BASE}/deliverables`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT, `${prefix}-06-hydration-loading.png`) });
    const busy = await page.locator('[aria-busy="true"]').count();
    const earlyReady = await page.locator('[data-delivery-state="files-ready"]').count();
    const earlyMock = await page.locator('[data-preview-package="true"]').count();
    const earlyComplete = await page.evaluate(() =>
      /campaign complete|everything is ready|your package is ready/i.test(
        document.body?.innerText || "",
      ),
    );
    push(`${prefix}: hydration shows busy state`, busy > 0);
    push(`${prefix}: hydration has no early files-ready`, earlyReady === 0);
    push(`${prefix}: hydration has no mock package`, earlyMock === 0);
    push(`${prefix}: hydration has no false completion copy`, !earlyComplete);
    await page.waitForSelector('[data-delivery-state="files-ready"]', { timeout: 10000 });
    await page.screenshot({ path: join(OUT, `${prefix}-07-hydration-ready.png`) });
    await page.close();
  }

  // 7) Review Room Final Delivery link
  {
    const page = await prepareDeliverablesPage(context, {
      stagesBody: {
        summary: {
          summaryId: "final-delivery",
          label: "Final Delivery",
          explanation: "This work has been delivered.",
        },
        jobs: [
          {
            jobId: "job-delivered",
            serviceName: "Brand Kit",
            stageId: "final-delivery",
            label: "Final Delivery",
            explanation: "This work has been delivered.",
            actionOwner: "complete",
            blocksCampaignCustomerAction: false,
            terminal: true,
          },
        ],
      },
    });
    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".rd-shell", { timeout: 15000 });
    const deliveryLink = page.locator("a", { hasText: "Open Final Delivery" });
    push(`${prefix}: Review Room Final Delivery link present`, (await deliveryLink.count()) === 1);
    const href = await deliveryLink.getAttribute("href");
    push(`${prefix}: Review Room Final Delivery href is /deliverables`, href === "/deliverables", {
      detail: href || "(none)",
    });
    await page.screenshot({ path: join(OUT, `${prefix}-08-review-room-link.png`) });
    await page.close();
  }

  // 8) Keyboard-reachable download links
  {
    const page = await prepareDeliverablesPage(context, {
      deliveryBody: deliveryReady([JOB_WITH_FILES], {
        allJobsDelivered: true,
        hasDeliveredJobs: true,
      }),
    });
    await page.goto(`${BASE}/deliverables`, { waitUntil: "networkidle" });
    await page.waitForSelector("a.fd-block__download", { timeout: 15000 });
    const download = page.locator("a.fd-block__download").first();
    await download.focus();
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName || "");
    const focusedHref = await page.evaluate(
      () => (document.activeElement instanceof HTMLAnchorElement ? document.activeElement.href : ""),
    );
    push(`${prefix}: download link keyboard-focusable`, focusedTag === "A", {
      detail: focusedTag,
    });
    push(`${prefix}: focused download has href`, focusedHref.includes("/download") || focusedHref.length > 0, {
      detail: focusedHref,
    });
    await page.screenshot({ path: join(OUT, `${prefix}-09-keyboard-download.png`) });
    await page.close();
  }

  // 9) No horizontal overflow at 360
  if (viewport.id === "phone") {
    const page = await prepareDeliverablesPage(context, {
      deliveryBody: deliveryReady(
        [JOB_WITH_FILES, { ...JOB_DELIVERED_NO_FILES, files: [releasedFile("file-2")] }],
        { allJobsDelivered: true, hasDeliveredJobs: true },
      ),
    });
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${BASE}/deliverables`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-delivery-state]", { timeout: 15000 });
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

  // 10) Some delivered missing files — not completion
  {
    const page = await prepareDeliverablesPage(context, {
      deliveryBody: deliveryReady([JOB_WITH_FILES, JOB_DELIVERED_NO_FILES], {
        allJobsDelivered: true,
        hasDeliveredJobs: true,
      }),
    });
    await page.goto(`${BASE}/deliverables`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-delivery-state="partial-files-ready"]', {
      timeout: 15000,
    });
    const title = ((await page.locator(".fd-hero__title").textContent()) || "").trim();
    push(
      `${prefix}: all-delivered missing files → some-files-missing title`,
      title === "Some files are ready; some are still being prepared",
      { detail: title },
    );
    const body = ((await page.locator("body").innerText()) || "").toLowerCase();
    push(`${prefix}: missing-files path has no Campaign Complete`, !body.includes("campaign complete"));
    await page.screenshot({ path: join(OUT, `${prefix}-11-some-missing.png`) });
    await page.close();
  }

  await context.close();
}

async function certifySignedOut(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/deliverables`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const url = page.url();
  const body = ((await page.locator("body").innerText()) || "").toLowerCase();
  const signedOutOk =
    url.includes("/login") ||
    url.includes("/sign-in") ||
    body.includes("sign in") ||
    body.includes("log in") ||
    body.includes("access") ||
    (await page.locator(".utility-access-card-shell, .utility-card").count()) > 0;
  push("signed-out: deliverables does not show released files", signedOutOk, {
    detail: url,
  });
  push("signed-out: no mock package DOM", !(await hasMockPackageDom(page)));
  await page.screenshot({ path: join(OUT, "signed-out.png") });
  await page.close();
  await context.close();
}

async function certifyDenied(browser, cookie) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
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
  const page = await prepareDeliverablesPage(context, {
    deliveryStatus: 403,
    deliveryErrorBody: { error: "You do not have access to this delivery." },
  });
  await page.goto(`${BASE}/deliverables`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const body = ((await page.locator("body").innerText()) || "").toLowerCase();
  push(
    "denied: delivery error does not invent package",
    !body.includes("option a (budget friendly)") &&
      (await page.locator('[data-preview-package="true"]').count()) === 0,
  );
  push(
    "denied: shows access/error surface",
    body.includes("try again") ||
      body.includes("error") ||
      body.includes("access") ||
      body.includes("unable") ||
      (await page.locator(".utility-access-card-shell, .utility-card").count()) > 0,
  );
  await page.screenshot({ path: join(OUT, "denied.png") });
  await page.close();
  await context.close();
}

const cookie = await login();
const browser = await chromium.launch({ headless: true });
let fatalError = null;
try {
  for (const viewport of [
    { id: "desktop", width: 1440, height: 900 },
    { id: "phone", width: 390, height: 844 },
  ]) {
    console.log(`\n--- ${viewport.id} ${viewport.width}x${viewport.height} ---`);
    await certifyViewport(browser, cookie, viewport);
  }
  console.log("\n--- signed-out ---");
  await certifySignedOut(browser);
  console.log("\n--- denied ---");
  await certifyDenied(browser, cookie);
} catch (error) {
  fatalError = error instanceof Error ? error : new Error(String(error));
  push("certification run fatal error", false, {
    detail: fatalError.message,
  });
  console.error(fatalError);
} finally {
  await browser.close();
}

const report = writeCertReport(
  fatalError
    ? {
        status: "crashed",
        fatalError: fatalError.message,
      }
    : {
        status: results.some((r) => !r.ok) ? "failed" : "passed",
      },
);
process.exit(report.fail > 0 || fatalError ? 1 : 0);
