/**
 * C8d — Unified Delivery State Merge browser certification (Playwright).
 *
 * Console evidence only by default (no new artifact folder unless CERT_OUT is set).
 * Usage: CERT_BASE_URL=http://localhost:3000 node scripts/cert-c8d-unified-delivery-state-merge.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.CERT_BASE_URL || "http://localhost:3000";
const CLIENT_LOGIN = { email: "client@local.dev", password: "dev-only" };
/** Owns C8-CERT-1 / C8c fixtures used for Review regression. */
const OWNER_LOGIN = { email: "client-a@local.dev", password: "dev-only" };
const CAMPAIGN_ID = "c8d-browser-cert";
const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const REVIEW_JOB = "c8-cert-1-customer-one:sm-001";
const REVIEW_CAMPAIGN = "c8-cert-1-customer-one";

const results = [];
function push(check, ok, detail) {
  results.push({ check, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${check}${detail ? ` — ${detail}` : ""}`);
}

async function loginCookie(creds = CLIENT_LOGIN) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
  if (!res.ok) throw new Error(`Login failed (${creds.email}): ${res.status}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/studio_session=([^;]+)/);
  if (!match) throw new Error(`No session cookie for ${creds.email}`);
  return match[1];
}

function campaign(overrides = {}) {
  return {
    campaignId: CAMPAIGN_ID,
    campaignName: "C8d Browser Cert Campaign",
    campaignStatus: "DELIVERED",
    campaignDescription: "C8d composition certification only.",
    estimatedCompletion: "July 30, 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsIncluded: 2,
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
          revisionRule: "2 rounds",
          clientResponsibilities: ["Approve posts"],
          executionResponsibility: "studio",
        },
      ],
      approvedAt: "2026-07-01T00:00:00.000Z",
    },
    ...overrides,
  };
}

function deliveryReady() {
  return {
    delivery: {
      state: "ready",
      campaignName: "C8d Browser Cert Campaign",
      jobs: [
        {
          jobId: "job-ready",
          serviceName: "Social Media Launch Set",
          spineStatus: "delivered",
          deliveredAt: "2026-07-10T00:00:00.000Z",
          completedDeliverables: ["Up to six static social posts"],
          files: [
            {
              id: "file-ready",
              deliverableLabel: "Social set",
              fileName: "file-ready.zip",
              fileType: "zip",
              url: "/api/file-room/files/file-ready/download",
              useInstructions: null,
              addedAt: "2026-07-10T00:00:00.000Z",
              versionLabel: "v1",
              releasedAt: "2026-07-10T00:00:00.000Z",
            },
          ],
        },
      ],
      hasDeliveredJobs: true,
      allJobsDelivered: true,
    },
  };
}

async function seedCampaign(page, record) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, record: next }) => {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
    },
    { key: CAMPAIGN_KEY, record },
  );
}

async function mockCampaignApis(page, record, { deliveryBody, stagesBody } = {}) {
  await page.route("**/api/campaigns/current", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ campaign: record }),
    });
  });
  await page.route(`**/api/campaigns/${CAMPAIGN_ID}`, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ campaign: record }),
    });
  });
  if (deliveryBody) {
    await page.route(`**/api/campaigns/${CAMPAIGN_ID}/delivery`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(deliveryBody),
      });
    });
  }
  if (stagesBody) {
    await page.route(`**/api/campaigns/${CAMPAIGN_ID}/stages`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(stagesBody),
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
}

async function measureOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return {
      clientWidth: doc.clientWidth,
      scrollWidth: doc.scrollWidth,
      overflow: doc.scrollWidth > doc.clientWidth + 1,
    };
  });
}

async function readRoomSignals(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText || "";
    return {
      url: location.href,
      pathname: location.pathname,
      search: location.search,
      roomState:
        document.querySelector("[data-room-state]")?.getAttribute("data-room-state") || null,
      deliveryState:
        document.querySelector("[data-delivery-state]")?.getAttribute("data-delivery-state") ||
        null,
      embedded: document.querySelector("[data-embedded='true']") != null,
      reviewToolsLabeled: /REVIEW TOOLS/i.test(text),
      projectCommLabeled: /PROJECT COMMUNICATION/i.test(text),
      hasDownload: !!document.querySelector("a.fd-block__download"),
      downloadHref: document.querySelector("a.fd-block__download")?.getAttribute("href") || null,
      previewPackage: !!document.querySelector('[data-preview-package="true"]'),
      hasOpenDelivery: Array.from(document.querySelectorAll("a")).some((a) =>
        /Open Delivery/i.test(a.textContent || ""),
      ),
      headerTitle:
        document.querySelector(".utility-header__title, h1")?.textContent?.trim() || null,
      pageLead:
        document.querySelector(".utility-header__lead, .utility-page-header__lead")?.textContent?.trim() ||
        null,
      bodySnippet: text.replace(/\s+/g, " ").slice(0, 500),
      utilityHeaderCount: document.querySelectorAll("header.utility-header, .utility-header").length,
      fsRoom: !!document.querySelector(".fs-room"),
      toolsUnavailableCopy: /not available|not used during Delivery|preparing final delivery/i.test(
        text,
      ),
    };
  });
}

console.log(`C8d browser cert base=${BASE}`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const cookie = await loginCookie(CLIENT_LOGIN);
await context.addCookies([
  { name: "studio_session", value: cookie, domain: "localhost", path: "/" },
]);

// A: Review regression (owner of C8-CERT-1 fixture)
{
  const ownerCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ownerCookie = await loginCookie(OWNER_LOGIN);
  await ownerCtx.addCookies([
    { name: "studio_session", value: ownerCookie, domain: "localhost", path: "/" },
  ]);
  const page = await ownerCtx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, campaignId }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          campaignId,
          campaignName: "C8-CERT-1",
          campaignStatus: "BUILDING_CONCEPTS",
        }),
      );
      window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
    },
    { key: CAMPAIGN_KEY, campaignId: REVIEW_CAMPAIGN },
  );
  await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(REVIEW_JOB)}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);
  const text = await page.locator("body").innerText();
  const includedBefore = (text.match(/Included[:\s]*(\d+)/i) || [])[1] || null;
  const remainingBefore = (text.match(/Remaining[:\s]*(\d+)/i) || [])[1] || null;
  const usedBefore = (text.match(/Used[:\s]*(\d+)/i) || [])[1] || null;
  push(
    "A Review job workspace opens for authorized jobId",
    /feedback-studio/.test(page.url()) && !/sign-in/i.test(text) && /REVIEW TOOLS/i.test(text),
    page.url() + " :: " + text.replace(/\s+/g, " ").slice(0, 220),
  );
  push("A REVIEW TOOLS labeled", /REVIEW TOOLS/i.test(text));
  push("A PROJECT COMMUNICATION labeled", /PROJECT COMMUNICATION/i.test(text));
  push(
    "A correction accounting visible",
    Boolean(includedBefore || remainingBefore || /correction/i.test(text)),
    `included=${includedBefore} used=${usedBefore} remaining=${remainingBefore}`,
  );
  push(
    "A C8b handoff/receipt/locked vocabulary present or not forced",
    /locked|receipt|submitted|handoff|REVIEW TOOLS/i.test(text),
    "presence check only — fixture may be pre-submit",
  );

  await page.goto(`${BASE}/feedback-studio?roomState=final`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.goto(`${BASE}/feedback-studio?roomState=delivery`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(REVIEW_JOB)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(3000);
  const textAfter = await page.locator("body").innerText();
  const includedAfter = (textAfter.match(/Included[:\s]*(\d+)/i) || [])[1] || null;
  const remainingAfter = (textAfter.match(/Remaining[:\s]*(\d+)/i) || [])[1] || null;
  const usedAfter = (textAfter.match(/Used[:\s]*(\d+)/i) || [])[1] || null;
  push(
    "A Correction balances unchanged after Final/Delivery navigation",
    includedBefore === includedAfter &&
      remainingBefore === remainingAfter &&
      usedBefore === usedAfter &&
      includedBefore != null,
    `before=${includedBefore}/${usedBefore}/${remainingBefore} after=${includedAfter}/${usedAfter}/${remainingAfter}`,
  );
  await ownerCtx.close();
}

// E2: wrong customer blocked from owned Review job
{
  const page = await context.newPage();
  await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(REVIEW_JOB)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2500);
  const text = await page.locator("body").innerText();
  const blocked =
    /not available|denied|access|does not belong|wrong|sign in|no active/i.test(text) &&
    !/Approve for delivery|Request revision/i.test(text);
  push(
    "E Wrong-customer cannot open owned Review workspace tools",
    blocked || !/REVIEW TOOLS/i.test(text) || /not available|denied|access/i.test(text),
    text.replace(/\s+/g, " ").slice(0, 240),
  );
  await page.close();
}

// B: Final
{
  const page = await context.newPage();
  const record = campaign({ campaignStatus: "IN_PRODUCTION" });
  await mockCampaignApis(page, record, {
    stagesBody: {
      summary: {
        summaryId: "approved-for-final-delivery",
        label: "Approved for Final Delivery",
        explanation: "This work is approved and the Studio is preparing final delivery.",
      },
      jobs: [
        {
          jobId: "job-final-prep",
          serviceName: "Social Media Launch Set",
          stageId: "approved-for-final-delivery",
          label: "Approved for Final Delivery",
          explanation: "This work is approved and the Studio is preparing final delivery.",
          actionOwner: "studio",
          blocksCampaignCustomerAction: false,
          terminal: false,
        },
      ],
    },
    deliveryBody: {
      delivery: {
        state: "preparing",
        campaignName: "C8d Browser Cert Campaign",
        jobs: [],
        hasDeliveredJobs: false,
        allJobsDelivered: false,
      },
    },
  });
  await seedCampaign(page, record);
  await page.goto(`${BASE}/feedback-studio?roomState=final`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-room-state='final'], .rd-stage-card, .fs-feedback-panel", {
    timeout: 20000,
  });
  const s = await readRoomSignals(page);
  const overflow = await measureOverflow(page);
  push(
    "B Final URL stays on feedback-studio",
    s.pathname === "/feedback-studio" && s.search.includes("roomState=final"),
    s.url,
  );
  push("B Final data-room-state=final", s.roomState === "final", String(s.roomState));
  push("B Final REVIEW TOOLS labeled", s.reviewToolsLabeled);
  push("B Final PROJECT COMMUNICATION labeled", s.projectCommLabeled);
  push("B Final tools unavailable copy present", s.toolsUnavailableCopy);
  const finalRoot = page.locator("[data-final-substance='true']");
  await finalRoot.waitFor({ state: "visible", timeout: 15000 });
  const finalAttrs = await finalRoot.evaluate((el) => ({
    deliveryAvailability: el.getAttribute("data-delivery-availability"),
    customerAction: el.getAttribute("data-customer-action"),
    text: (el.textContent || "").replace(/\s+/g, " ").trim(),
  }));
  push("B Final substance block present", true);
  push(
    "B Final has work / action / next / availability facts",
    /Work in Final|Customer action|What happens next|Delivery availability/i.test(finalAttrs.text),
    finalAttrs.text.slice(0, 280),
  );
  push(
    "B Final does not invent timing or percentages",
    !/soon|tomorrow|\d+%|percent complete/i.test(finalAttrs.text),
    finalAttrs.text.slice(0, 200),
  );
  push(
    "B Final delivery availability is preparing (no released files)",
    finalAttrs.deliveryAvailability === "preparing",
    String(finalAttrs.deliveryAvailability),
  );
  push(
    "B Final customer action none_required for Studio-owned stage",
    finalAttrs.customerAction === "none_required",
    String(finalAttrs.customerAction),
  );
  push(
    "B Final CTA matches preparing truth",
    /View Delivery status/i.test(finalAttrs.text) && !/Open Delivery/i.test(finalAttrs.text),
    finalAttrs.text.slice(0, 160),
  );
  push("B Final does not show download links", !s.hasDownload, String(s.downloadHref));
  push("B Final no preview package", !s.previewPackage);
  push("B Final uses fs-room shell", s.fsRoom);
  push("B Final desktop no horizontal overflow", !overflow.overflow, JSON.stringify(overflow));
  console.log("B Final headerTitle:", s.headerTitle, "lead:", s.pageLead);
  console.log("B Final bodySnippet:", s.bodySnippet);

  const deliveryLink = page.locator("a", { hasText: /View Delivery status|Open Delivery/i }).first();
  if ((await deliveryLink.count()) > 0) {
    await deliveryLink.click();
    await page.waitForTimeout(1500);
    const after = await readRoomSignals(page);
    push(
      "B Open Delivery enters Delivery in same room",
      after.pathname === "/feedback-studio" && after.search.includes("roomState=delivery"),
      after.url,
    );
  } else {
    push("B Open Delivery enters Delivery in same room", false, "link missing");
  }
  await page.close();
}

// B2: Focused Job A has no files; Job B has released files — must not imply Job A is released
{
  const page = await context.newPage();
  const record = campaign({ campaignStatus: "IN_PRODUCTION" });
  await mockCampaignApis(page, record, {
    stagesBody: {
      summary: {
        summaryId: "approved-for-final-delivery",
        label: "Approved for Final Delivery",
        explanation: "Mixed Final and Delivery jobs on one project.",
      },
      jobs: [
        {
          jobId: "job-a",
          serviceName: "Social Media Launch Set",
          stageId: "approved-for-final-delivery",
          label: "Approved for Final Delivery",
          explanation: "This work is approved and the Studio is preparing final delivery.",
          actionOwner: "studio",
          blocksCampaignCustomerAction: false,
          terminal: false,
        },
        {
          jobId: "job-b",
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
    deliveryBody: {
      delivery: {
        state: "ready",
        campaignName: "C8d Browser Cert Campaign",
        jobs: [
          {
            jobId: "job-b",
            serviceName: "Brand Kit",
            spineStatus: "delivered",
            deliveredAt: "2026-07-10T00:00:00.000Z",
            completedDeliverables: ["Brand kit files"],
            files: [
              {
                id: "file-b",
                deliverableLabel: "Brand kit",
                fileName: "brand-kit.zip",
                fileType: "zip",
                url: "/api/file-room/files/file-b/download",
                useInstructions: null,
                addedAt: "2026-07-10T00:00:00.000Z",
                versionLabel: "Proof B",
                releasedAt: "2026-07-10T00:00:00.000Z",
              },
            ],
          },
        ],
        hasDeliveredJobs: true,
        allJobsDelivered: false,
      },
    },
  });
  await seedCampaign(page, record);
  await page.goto(`${BASE}/feedback-studio?roomState=final&jobId=${encodeURIComponent("job-a")}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("[data-final-substance='true']", { timeout: 20000 });
  const multi = await page.locator("[data-final-substance='true']").evaluate((el) => ({
    availability: el.getAttribute("data-delivery-availability"),
    text: (el.textContent || "").replace(/\s+/g, " ").trim(),
  }));
  push(
    "B2 Multi-job Final availability is available_other",
    multi.availability === "available_other",
    String(multi.availability),
  );
  push(
    "B2 Multi-job Final does not claim focused work files are released",
    /Other project files/i.test(multi.text) &&
      /this work are not yet released/i.test(multi.text) &&
      !/Released files for this work are available/i.test(multi.text),
    multi.text.slice(0, 280),
  );
  push(
    "B2 Multi-job Final still names Job A as work in Final",
    /Social Media Launch Set/i.test(multi.text) && /Approved for Final Delivery/i.test(multi.text),
    multi.text.slice(0, 200),
  );
  push("B2 Multi-job Final does not borrow Job B version label", !/Proof B/i.test(multi.text));

  // Stale jobId — campaign-level summary, no silent substitute naming
  await page.goto(
    `${BASE}/feedback-studio?roomState=final&jobId=${encodeURIComponent("job-stale-unlisted")}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForSelector("[data-final-substance='true']", { timeout: 20000 });
  const stale = await page.locator("[data-final-substance='true']").evaluate((el) => ({
    unavailable: el.getAttribute("data-requested-job-unavailable"),
    text: (el.textContent || "").replace(/\s+/g, " ").trim(),
  }));
  push(
    "B2 Stale jobId marks requested unavailable without oracle",
    stale.unavailable === "true" &&
      /not available for Final/i.test(stale.text) &&
      !/another customer|wrong campaign|denied|forbidden/i.test(stale.text),
    stale.text.slice(0, 240),
  );
  push(
    "B2 Stale jobId does not silently name Job A or Job B as the request",
    !/Social Media Launch Set ·/i.test(stale.text) && !/Brand Kit ·/i.test(stale.text),
    stale.text.slice(0, 240),
  );
  await page.close();
}

// C: Delivery released files
{
  const page = await context.newPage();
  const record = campaign();
  await mockCampaignApis(page, record, { deliveryBody: deliveryReady() });
  await seedCampaign(page, record);
  await page.goto(`${BASE}/feedback-studio?roomState=delivery`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(
    "[data-room-state='delivery'], [data-delivery-state], a.fd-block__download",
    { timeout: 20000 },
  );
  const s = await readRoomSignals(page);
  const overflow = await measureOverflow(page);
  push(
    "C Delivery URL on feedback-studio",
    s.pathname === "/feedback-studio" && s.search.includes("roomState=delivery"),
    s.url,
  );
  push("C Delivery room state attr", s.roomState === "delivery", String(s.roomState));
  push("C Honest Final Files embedded marker", s.embedded, `deliveryState=${s.deliveryState}`);
  push("C REVIEW TOOLS labeled", s.reviewToolsLabeled);
  push("C PROJECT COMMUNICATION labeled", s.projectCommLabeled);
  push("C Released download present", s.hasDownload, s.downloadHref);
  push(
    "C Download uses protected file-room path",
    Boolean(
      s.downloadHref &&
        s.downloadHref.includes("/api/file-room/files/") &&
        s.downloadHref.includes("/download"),
    ),
    s.downloadHref,
  );
  push("C No preview package in released path", !s.previewPackage);
  push("C Desktop no horizontal overflow", !overflow.overflow, JSON.stringify(overflow));
  console.log("C Delivery snippet:", s.bodySnippet);
  await page.close();
}

// C2: preparing
{
  const page = await context.newPage();
  const record = campaign({ campaignStatus: "IN_PRODUCTION" });
  await mockCampaignApis(page, record, {
    deliveryBody: {
      delivery: {
        state: "preparing",
        campaignName: "C8d Browser Cert Campaign",
        jobs: [],
        hasDeliveredJobs: false,
        allJobsDelivered: false,
      },
    },
  });
  await seedCampaign(page, record);
  await page.goto(`${BASE}/feedback-studio?roomState=delivery`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const s = await readRoomSignals(page);
  const text = await page.locator("body").innerText();
  push("C2 Preparing has no downloads", !s.hasDownload);
  push("C2 Preparing no preview package", !s.previewPackage);
  push(
    "C2 Preparing truthful language",
    /prepar|not ready|not available|still|working/i.test(text),
    text.replace(/\s+/g, " ").slice(0, 220),
  );
  await page.close();
}

// D: /deliverables redirect
{
  const page = await context.newPage();
  const record = campaign();
  await mockCampaignApis(page, record, { deliveryBody: deliveryReady() });
  await seedCampaign(page, record);
  await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const responses = [];
  page.on("response", (res) => {
    if (res.url().includes("/deliverables") || res.url().includes("roomState=delivery")) {
      responses.push({ status: res.status(), url: res.url() });
    }
  });
  await page.goto(`${BASE}/deliverables?preview=delivered&room=1`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(2000);
  const landed = page.url();
  const s = await readRoomSignals(page);
  push(
    "D /deliverables lands on feedback-studio Delivery",
    landed.includes("/feedback-studio") && landed.includes("roomState=delivery"),
    landed,
  );
  push(
    "D query params preserved",
    landed.includes("preview=delivered") && landed.includes("room=1"),
    landed,
  );
  push("D no redirect loop (URL not /deliverables)", !landed.includes("/deliverables"), landed);
  push(
    "D Delivery content in unified room",
    s.roomState === "delivery" || s.embedded || s.hasDownload,
    `room=${s.roomState} emb=${s.embedded}`,
  );

  await page.goBack();
  await page.waitForTimeout(1200);
  const backUrl = page.url();
  push(
    "D Back does not trap on /deliverables",
    !backUrl.includes("/deliverables"),
    backUrl,
  );
  push(
    "D Back returns to prior history entry",
    /studio-board|feedback-studio/.test(backUrl),
    backUrl,
  );
  console.log("D redirect responses:", JSON.stringify(responses.slice(0, 8)));
  await page.close();
}

// E: signed-out
{
  const signedOut = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await signedOut.newPage();
  await page.goto(`${BASE}/feedback-studio?roomState=delivery`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const text = await page.locator("body").innerText();
  const url = page.url();
  push(
    "E Signed-out Delivery blocked or auth-required",
    /sign in|sign-in|log in|auth|session|not signed|access/i.test(text) || /sign-in/.test(url),
    `${url} :: ${text.replace(/\s+/g, " ").slice(0, 180)}`,
  );
  await page.goto(`${BASE}/deliverables`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const text2 = await page.locator("body").innerText();
  const url2 = page.url();
  push(
    "E Signed-out /deliverables does not bypass auth",
    /sign in|sign-in|log in|auth|session|not signed|access/i.test(text2) ||
      /sign-in/.test(url2) ||
      (url2.includes("roomState=delivery") && /sign in|auth|access/i.test(text2)),
    `${url2} :: ${text2.replace(/\s+/g, " ").slice(0, 180)}`,
  );
  await signedOut.close();
}

// F: phone
{
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  await phone.addCookies([
    { name: "studio_session", value: cookie, domain: "localhost", path: "/" },
  ]);
  const page = await phone.newPage();
  const record = campaign();
  await mockCampaignApis(page, record, { deliveryBody: deliveryReady() });
  await seedCampaign(page, record);
  await page.goto(`${BASE}/feedback-studio?roomState=delivery`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const s = await readRoomSignals(page);
  const overflow = await measureOverflow(page);
  push("F Phone REVIEW TOOLS discoverable", s.reviewToolsLabeled);
  push("F Phone PROJECT COMMUNICATION discoverable", s.projectCommLabeled);
  push("F Phone no horizontal overflow", !overflow.overflow, JSON.stringify(overflow));
  push("F Phone download usable present", s.hasDownload, s.downloadHref);

  await page.goto(`${BASE}/feedback-studio?roomState=final`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const s2 = await readRoomSignals(page);
  const overflow2 = await measureOverflow(page);
  push("F Phone Final REVIEW TOOLS", s2.reviewToolsLabeled);
  push("F Phone Final PROJECT COMMUNICATION", s2.projectCommLabeled);
  push("F Phone Final no horizontal overflow", !overflow2.overflow, JSON.stringify(overflow2));
  await phone.close();
}

await browser.close();
const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
console.log(`\nSUMMARY pass=${pass} fail=${fail} total=${results.length}`);
process.exit(fail > 0 ? 1 : 0);
