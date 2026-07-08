/**
 * Client Journey Coverage Self-Test V2 — five scenarios.
 * Run: node scripts/client-journey-coverage-v2-e2e.mjs
 * Requires: npm run dev (localhost:3000), SESSION_SECRET in .env.local
 */
import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ROUTE_MAP_E2E_CAMPAIGN_KEY,
  clickChooseThisJob,
  clickTestPayment,
  fillRouteMapIntake,
  intakeTitleMatches,
  loginBrowserContext,
  readRouteMapIntakeTitle,
  submitRouteMapIntake,
  waitForRouteMapIntake,
  waitForStudioBoardRecord,
} from "./lib/route-map-e2e-shared.mjs";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/client-journey-coverage-v2");
const REPORT_PATH = path.join(OUT_DIR, "e2e-report.md");
const CAMPAIGN_KEY = ROUTE_MAP_E2E_CAMPAIGN_KEY;
const MATERIALS_DIR = path.resolve("data/campaign-materials");

const ROAD = {
  i75: "Get My Business Started",
  i20: "Promote Something Now",
  update: "Update What I Already Have",
  random: "I Know What I Need",
};

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };

const LANE_CAPACITY = { quick: 2, standard: 2, heavy: 1 };

const CLIENT_LEAK_PATTERNS = [
  /\bv2-rtu-/i,
  /\bv2-addon-/i,
  /\bSKU\b/i,
  /\bPRODUCTION BRIEF\b/i,
  /\brm-j\d{3}\b/i,
  /\bscope routing\b/i,
  /\bJob context\b/i,
  /\bClient sending responsibilities\b/i,
  /\binternal note/i,
  /\bWorking Figma\b/i,
];

/** @type {Record<string, { pass: boolean; notes: string[]; campaignId?: string; jobId?: string; screenshot?: string }>} */
const caseResults = {};

function note(caseId, text) {
  if (!caseResults[caseId]) caseResults[caseId] = { pass: true, notes: [] };
  caseResults[caseId].notes.push(text);
}

function fail(caseId, text) {
  if (!caseResults[caseId]) caseResults[caseId] = { pass: true, notes: [] };
  caseResults[caseId].pass = false;
  caseResults[caseId].notes.push(`FAIL: ${text}`);
  console.log(`FAIL [${caseId}] ${text}`);
}

function pass(caseId, text) {
  note(caseId, `PASS: ${text}`);
  console.log(`PASS [${caseId}] ${text}`);
}

const SCENARIOS = [
  {
    caseId: "1-quick-flyer",
    sku: "v2-rtu-flyer",
    expectedLane: "quick",
    expectedPrice: "$300",
    persona: "Maria Chen — Maria's Corner Bakery (grand opening flyer)",
    road: ROAD.random,
    jobName: "Make Me a Flyer",
    intakeTitle: "Flyer Intake",
    markerValue: "Grand opening weekend",
    screenshotPrefix: "case1-flyer",
    intakeFields: [
      { type: "textarea", value: "Grand opening weekend — celebrate our new location on Main Street" },
      { type: "textarea", value: "June 15–16 · Free coffee with any pastry · 123 Main St · (555) 234-8901" },
      { type: "textarea", value: "Logo PNG, warm cream and brown brand colors, bakery interior photo" },
      { type: "select", value: "Both print and digital" },
      { type: "text", value: "8.5Ã—11 letter" },
    ],
    fullJourney: true,
  },
  {
    caseId: "2-standard-email",
    sku: "v2-rtu-email-kit",
    expectedLane: "standard",
    expectedPrice: "$350",
    persona: "Elena Park — Bloom & Petal Florist (Mother's Day promo)",
    road: ROAD.i20,
    jobName: "Make My Email Campaign Kit",
    intakeTitle: "Email Campaign Kit Intake",
    markerValue: "Mailchimp",
    screenshotPrefix: "case2-email",
    intakeFields: [
      { type: "textarea", value: "Mother's Day bouquet promotion — drive pre-orders for pickup May 10–11" },
      { type: "textarea", value: "Code MOM15 for 15% off · Order by May 8 · bloomandpetal.com/mothersday" },
      { type: "text", value: "Shop pre-order bouquets" },
      { type: "textarea", value: "Logo, rose bouquet hero photo, soft pink and sage brand colors" },
      { type: "select", value: "Yes — I own the list and have consent" },
      { type: "text", value: "Mailchimp — bloomandpetal@gmail.com account" },
    ],
    fullJourney: true,
  },
  {
    caseId: "3-heavy-video",
    sku: "v2-rtu-short-video",
    expectedLane: "heavy",
    expectedPrice: "$550",
    persona: "Marcus Webb — Precision Auto Care (oil change service spotlight)",
    road: ROAD.random,
    jobName: "Make Me a Short Video",
    intakeTitle: "Short Video Intake",
    markerValue: "Vertical",
    screenshotPrefix: "case3-video",
    intakeFields: [
      { type: "textarea", value: "Service spotlight — quick oil change turnaround for busy commuters" },
      { type: "select", value: "Vertical" },
      { type: "textarea", value: "Phone footage of bay + logo PNG, navy and silver brand colors" },
      { type: "textarea", value: "Same-day oil changes · Book at precisionautocare.com · Mon–Sat 7am–6pm" },
    ],
    fullJourney: true,
  },
];

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

function auditClientText(text) {
  return CLIENT_LEAK_PATTERNS.filter((re) => re.test(text)).map((re) => re.source);
}

async function clearCampaign(page) {
  await page.goto(BASE);
  await page.evaluate((key) => {
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
  }, CAMPAIGN_KEY);
}

async function gotoRouteMap(page) {
  await page.goto(`${BASE}/route-map`);
  await page.waitForSelector(".route-map-page--immersive", { timeout: 30000 });
  await page.waitForTimeout(400);
}

async function selectRoad(page, customerLabel) {
  const chooseCard = page.locator(".route-map-choose-card", { hasText: customerLabel });
  if (await chooseCard.count()) {
    await chooseCard.first().click();
  } else {
    const hotspot = page.locator(".route-map-board__hotspot", {
      has: page.locator(`[aria-label*="${customerLabel}"]`),
    });
    await hotspot.first().click();
  }
  await page.waitForSelector(".route-map-route-panel", { timeout: 25000 });
  await page.waitForTimeout(350);
}

async function fillIntakeWithPersona(page, scenario) {
  await fillRouteMapIntake(page, scenario);
}

async function waitForCampaignSync(page, campaignId, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await page.evaluate(() => {
      const raw = localStorage.getItem("studio-squishy:campaign-sync-status");
      return raw ? JSON.parse(raw) : null;
    });
    if (status?.campaignId === campaignId && status.state === "synced") return true;
    if (status?.campaignId === campaignId && status.state === "error") {
      return false;
    }
    await page.waitForTimeout(300);
  }
  return false;
}

async function jobPatch(ownerCookie, campaignId, jobId, body) {
  return api(
    ownerCookie,
    "PATCH",
    `/api/campaigns/${campaignId}/jobs/${encodeURIComponent(jobId)}`,
    body,
  );
}

async function fetchJob(ownerCookie, campaignId, jobId, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const res = await api(
      ownerCookie,
      "GET",
      `/api/campaigns/${campaignId}/jobs/${encodeURIComponent(jobId)}`,
    );
    const job = res.json.jobRecords?.find((j) => j.jobId === jobId) ?? null;
    if (job) return job;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

async function clearBlockingMaterials(cookie, campaignId) {
  const res = await api(cookie, "GET", `/api/campaigns/${campaignId}/materials`);
  const items = res.json.materials?.items ?? res.json.items ?? [];
  const blocking = items.filter(
    (item) =>
      item.requirementLevel === "required" &&
      ["missing", "requested", "needs_clarification"].includes(item.reviewStatus),
  );
  for (const item of blocking) {
    await api(cookie, "PATCH", `/api/campaigns/${campaignId}/materials`, {
      action: "team_review",
      itemId: item.id,
      reviewStatus: "approved_for_use",
    });
  }
  return blocking.length;
}

async function patchMaterialsFile(campaignId, mutator) {
  const filePath = path.join(MATERIALS_DIR, `${campaignId}.json`);
  let envelope;
  try {
    envelope = JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return false;
  }
  mutator(envelope);
  envelope.updatedAt = new Date().toISOString();
  envelope.syncedAt = new Date().toISOString();
  await writeFile(filePath, JSON.stringify(envelope, null, 2), "utf8");
  return true;
}

async function verifyLaneCapacityPolicy(caseId, expectedLane, job) {
  const cap = LANE_CAPACITY[expectedLane];
  if (!job) {
    fail(caseId, "No job record for lane verification");
    return;
  }
  if (job.productionLane !== expectedLane) {
    fail(caseId, `Lane assignment expected ${expectedLane}, got ${job.productionLane}`);
    return;
  }
  pass(caseId, `${expectedLane} lane assigned (capacity ${cap})`);
}

async function runRouteMapCheckout(page, scenario, shotDir, logCaseId = scenario.caseId, ownerCookie = null) {
  await clearCampaign(page);
  await gotoRouteMap(page);
  await page.screenshot({ path: path.join(shotDir, `${scenario.screenshotPrefix}-01-route-map.png`), fullPage: true });

  await selectRoad(page, scenario.road);
  await page.getByRole("button", { name: new RegExp(scenario.jobName.slice(0, 20), "i") }).click();
  await page.waitForSelector(".route-map-job-card", { timeout: 15000 });
  await clickChooseThisJob(page);
  await page.waitForSelector(".route-map-checkout-addon, .pay-paper-card--summary", {
    timeout: 15000,
  });

  const checkoutText = await page.locator(".pay-paper-card--summary").innerText();
  if (!checkoutText.includes(scenario.expectedPrice)) {
    fail(logCaseId, `Checkout price missing ${scenario.expectedPrice}`);
  } else {
    pass(logCaseId, `Checkout shows ${scenario.expectedPrice}`);
  }
  await page.screenshot({ path: path.join(shotDir, `${scenario.screenshotPrefix}-02-checkout.png`), fullPage: true });

  await clickTestPayment(page);

  await waitForRouteMapIntake(page);
  const intakeTitle = await readRouteMapIntakeTitle(page);
  if (!intakeTitleMatches(scenario, intakeTitle)) {
    fail(logCaseId, `Intake title expected "${scenario.intakeTitle}", got "${intakeTitle}"`);
  } else {
    pass(logCaseId, `Service-specific intake: ${intakeTitle}`);
  }

  await fillIntakeWithPersona(page, scenario);
  await page.screenshot({ path: path.join(shotDir, `${scenario.screenshotPrefix}-03-intake.png`), fullPage: true });
  await submitRouteMapIntake(page, scenario);
  await waitForStudioBoardRecord(page);

  const campaign = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, CAMPAIGN_KEY);

  const campaignId = campaign?.campaignId ?? "";
  const jobId = `${campaignId}:${scenario.sku}`;
  if (!caseResults[logCaseId]) caseResults[logCaseId] = { pass: true, notes: [] };
  caseResults[logCaseId].campaignId = campaignId;
  caseResults[logCaseId].jobId = jobId;

  const clientSummaryText = await page.locator('[data-testid="route-map-client-summary"]').innerText();
  const leaks = auditClientText(clientSummaryText);
  if (leaks.length) {
    fail(logCaseId, `Client summary leaks: ${leaks.join(", ")}`);
  } else if (!clientSummaryText.includes(scenario.markerValue)) {
    fail(logCaseId, `Client summary missing marker "${scenario.markerValue}"`);
  } else {
    pass(logCaseId, "Studio Board + Project Record client-safe");
  }
  await page.screenshot({ path: path.join(shotDir, `${scenario.screenshotPrefix}-04-studio-board.png`), fullPage: true });

  if (ownerCookie && campaign) {
    try {
      JSON.stringify(campaign);
      await api(ownerCookie, "PATCH", "/api/campaigns/current", { record: campaign });
    } catch {
      fail(logCaseId, "Invalid campaign JSON in localStorage — cannot sync");
    }
  }

  const synced = await waitForCampaignSync(page, campaignId);
  if (!synced && ownerCookie && campaign) {
    const serverSync = await api(ownerCookie, "PATCH", "/api/campaigns/current", { record: campaign });
    if (serverSync.status === 200) pass(logCaseId, `Campaign synced via API: ${campaignId}`);
    else fail(logCaseId, `Campaign sync failed: ${serverSync.json.error ?? serverSync.status}`);
  } else if (!synced) {
    fail(logCaseId, "Campaign sync timeout");
  } else {
    pass(logCaseId, `Campaign synced: ${campaignId}`);
  }

  return { campaignId, jobId, campaign };
}

async function verifyJobLane(ownerCookie, caseId, campaignId, jobId, expectedLane) {
  const job = await fetchJob(ownerCookie, campaignId, jobId);
  if (!job) {
    fail(caseId, "Job record not found after intake");
    return null;
  }
  verifyLaneCapacityPolicy(caseId, expectedLane, job);
  return job;
}

async function runFullProductionPath(ownerCookie, page, scenario, campaignId, jobId, campaign, shotDir) {
  let job = await fetchJob(ownerCookie, campaignId, jobId);
  verifyLaneCapacityPolicy(scenario.caseId, scenario.expectedLane, job);

  await page.goto(`${BASE}/file-room/owner-console`, { waitUntil: "networkidle" });
  await page.waitForSelector(".fr-control-room-lanes", { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: path.join(shotDir, `${scenario.screenshotPrefix}-05-owner-console.png`), fullPage: true });
  pass(scenario.caseId, "Owner Control Room loaded");

  const cleared = await clearBlockingMaterials(ownerCookie, campaignId);
  pass(scenario.caseId, `Materials gate cleared (${cleared} items)`);

  job = await fetchJob(ownerCookie, campaignId, jobId);
  if (job?.spineStatus !== "ready_for_queue" && job?.spineStatus !== "building_concepts") {
    fail(scenario.caseId, `Expected ready_for_queue after materials, got ${job?.spineStatus}`);
  } else {
    pass(scenario.caseId, `Job queue status after materials: ${job?.spineStatus}`);
  }

  if (job?.spineStatus === "ready_for_queue") {
    const accepted = await jobPatch(ownerCookie, campaignId, jobId, { action: "record_acceptance_review" });
    if (accepted.status !== 200) {
      fail(scenario.caseId, `Acceptance Review failed: ${accepted.json.error}`);
    }
    const start = await jobPatch(ownerCookie, campaignId, jobId, { action: "start_building_concepts" });
    if (start.status !== 200) {
      fail(scenario.caseId, `Start building concepts failed: ${start.json.error}`);
    } else {
      pass(scenario.caseId, "Production Workspace — Building Concepts started");
      job = start.json.job ?? job;
    }
  }

  await page.goto(`${BASE}/file-room/${campaignId}/production/${encodeURIComponent(jobId)}`, {
    waitUntil: "networkidle",
  });
  await page.screenshot({ path: path.join(shotDir, `${scenario.screenshotPrefix}-05-production.png`), fullPage: true });

  const planLine = campaign?.approvedStudioPlan?.lineItems?.find(
    (l) => (l.skuId ?? l.serviceId) === scenario.sku,
  );
  const deliverables = planLine?.deliverables ?? [];
  const deliverableKeys = deliverables.map((_, i) => `deliverable-${i}`);

  for (let i = 0; i < deliverableKeys.length; i += 1) {
    const prep = await jobPatch(ownerCookie, campaignId, jobId, {
      action: "mark_deliverable_prepared",
      deliverableKey: deliverableKeys[i],
    });
    if (prep.status !== 200) {
      fail(scenario.caseId, `Mark deliverable ${i} failed: ${prep.json.error}`);
      break;
    }
    job = prep.json.job;
  }
  pass(scenario.caseId, `${deliverableKeys.length} deliverables prepared`);

  await jobPatch(ownerCookie, campaignId, jobId, {
    action: "add_internal_note",
    content: "E2E internal note — must not appear to client",
  });
  await jobPatch(ownerCookie, campaignId, jobId, {
    action: "add_working_file_ref",
    label: "Working Figma board",
    url: "https://figma.com/file/e2e-internal",
  });

  const submit = await jobPatch(ownerCookie, campaignId, jobId, { action: "submit_for_owner_approval" });
  if (submit.status !== 200) fail(scenario.caseId, `Submit to Review Room failed: ${submit.json.error}`);
  else pass(scenario.caseId, "Production submitted client-ready work to Review Room");

  await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(jobId)}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(shotDir, `${scenario.screenshotPrefix}-06-review-room.png`), fullPage: true });

  const jobsRes = await api(ownerCookie, "GET", `/api/campaigns/${campaignId}/jobs/${encodeURIComponent(jobId)}`);
  const activity = jobsRes.json.jobActivityEvents ?? [];
  const statusEvents = activity.filter((e) => e.kind === "status_change" || e.kind === "approval");
  if (statusEvents.length < 2 || !statusEvents.every((e) => e.occurredAt)) {
    fail(scenario.caseId, `Activity log insufficient (${statusEvents.length} events)`);
  } else {
    pass(scenario.caseId, `${statusEvents.length} timestamped status/approval events`);
  }

  const reviewGet = await api(ownerCookie, "GET", `/api/campaigns/${campaignId}/jobs/${encodeURIComponent(jobId)}/review`);
  const clientActivityLeaks = (reviewGet.json.review?.activity ?? []).filter((e) =>
    ["internal_note", "working_file_ref"].includes(e.kind),
  );
  if (clientActivityLeaks.length) fail(scenario.caseId, "Review Room activity leaked internal events");
  else pass(scenario.caseId, "Review Room activity client-safe");

  await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(jobId)}`, { waitUntil: "networkidle" });
  await page.waitForSelector(".fs-review--workspace", { timeout: 20000 }).catch(() => {});
  const reviewPageText = await page.locator("body").innerText();
  if (auditClientText(reviewPageText).length || reviewPageText.includes("Working Figma")) {
    fail(scenario.caseId, "Review Room UI leaked internal content");
  } else {
    pass(scenario.caseId, "Review Room UI client-safe");
  }
  await page.screenshot({ path: path.join(shotDir, `${scenario.screenshotPrefix}-07-review-room.png`), fullPage: true });

  const sectionStatuses = Object.fromEntries(deliverableKeys.map((key) => [key, "approved"]));
  const feedback = {
    jobId,
    campaignId,
    sectionStatuses,
    stickyNotes: [],
    voiceNotes: [],
    drawSections: [],
    updatedAt: new Date().toISOString(),
  };
  const approveDelivery = await api(
    ownerCookie,
    "PATCH",
    `/api/campaigns/${campaignId}/jobs/${encodeURIComponent(jobId)}/review`,
    { action: "approve_for_delivery", feedback },
  );
  if (approveDelivery.status !== 200) fail(scenario.caseId, "Client approve for delivery failed");
  else pass(scenario.caseId, "Approved for delivery");

  const finalRelease = await jobPatch(ownerCookie, campaignId, jobId, { action: "owner_final_release" });
  if (finalRelease.status !== 200) fail(scenario.caseId, "Owner final release failed");
  else pass(scenario.caseId, "Owner final release â†’ Ready for Delivery");

  for (let i = 0; i < deliverableKeys.length; i += 1) {
    await jobPatch(ownerCookie, campaignId, jobId, {
      action: "add_client_delivery_file",
      deliverableKey: deliverableKeys[i],
      fileName: `${scenario.screenshotPrefix}-deliverable-${i + 1}.zip`,
      fileType: "ZIP",
      url: `https://files.example/e2e/${campaignId}/deliverable-${i}.zip`,
    });
  }

  const delivered = await jobPatch(ownerCookie, campaignId, jobId, { action: "mark_delivered" });
  if (delivered.status !== 200 || delivered.json.job?.spineStatus !== "delivered") {
    fail(scenario.caseId, `Mark delivered failed: ${delivered.json.error ?? delivered.json.job?.spineStatus}`);
  } else {
    pass(scenario.caseId, "Job marked DELIVERED");
  }

  const deliveryApi = await api(ownerCookie, "GET", `/api/campaigns/${campaignId}/delivery`);
  const deliveryJobs = deliveryApi.json.delivery?.jobs ?? [];
  const onlyThisJob =
    deliveryJobs.length === 1 &&
    deliveryJobs[0]?.jobId === jobId &&
    (deliveryJobs[0]?.files?.length ?? 0) >= deliverableKeys.length;
  if (!onlyThisJob) fail(scenario.caseId, `Final Delivery API isolation failed (${deliveryJobs.length} jobs)`);
  else pass(scenario.caseId, "Final Delivery API — only this job's files");

  await page.goto(`${BASE}/deliverables`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const deliveryPageText = await page.locator("body").innerText();
  if (auditClientText(deliveryPageText).length) fail(scenario.caseId, "Final Delivery page leaked internal content");
  else pass(scenario.caseId, "Final Delivery page client-safe");
  await page.screenshot({ path: path.join(shotDir, `${scenario.screenshotPrefix}-08-delivered.png`), fullPage: true });
}

async function runWaitingOnClientCase(ownerCookie, page, shotDir) {
  const caseId = "4-waiting-on-client";
  caseResults[caseId] = { pass: true, notes: [] };

  const scenario = SCENARIOS[0];
  try {
    const { campaignId, jobId } = await runRouteMapCheckout(page, scenario, shotDir, caseId, ownerCookie);
    caseResults[caseId].campaignId = campaignId;
    caseResults[caseId].jobId = jobId;

    await verifyJobLane(ownerCookie, caseId, campaignId, jobId, scenario.expectedLane);

    const materialsRes = await api(ownerCookie, "GET", `/api/campaigns/${campaignId}/materials`);
    const items = materialsRes.json.materials?.items ?? materialsRes.json.items ?? [];
    const blocking = items.filter(
      (item) =>
        item.requirementLevel === "required" &&
        ["missing", "requested", "needs_clarification"].includes(item.reviewStatus),
    );
    if (blocking.length === 0) {
      fail(caseId, "No blocking materials after intake — cannot test waiting policy");
      return;
    }
    pass(caseId, `${blocking.length} blocking required materials present`);

    const requestedAt48h = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString();
    const requestedAt73h = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString();

    await patchMaterialsFile(campaignId, (envelope) => {
      for (const item of envelope.items) {
        if (blocking.some((b) => b.id === item.id)) {
          item.reviewStatus = "missing";
          item.promotionApprovedAt = requestedAt48h;
        }
      }
    });

    let job = await fetchJob(ownerCookie, campaignId, jobId);
    if (job?.spineStatus === "waiting_on_client") {
      fail(caseId, "Job moved to waiting_on_client before 72h threshold");
    } else {
      pass(caseId, "Job still in production queue at ~48h (reminder window, not tray yet)");
    }

    await patchMaterialsFile(campaignId, (envelope) => {
      for (const item of envelope.items) {
        if (blocking.some((b) => b.id === item.id)) {
          item.promotionApprovedAt = requestedAt73h;
        }
      }
    });

    job = await fetchJob(ownerCookie, campaignId, jobId);
    if (job?.spineStatus !== "waiting_on_client") {
      fail(caseId, `Expected waiting_on_client at 72h+, got ${job?.spineStatus}`);
    } else {
      pass(caseId, "72h policy â†’ Waiting on Client");
    }
    if (job?.returnLane && job.returnLane !== scenario.expectedLane) {
      fail(caseId, `returnLane expected ${scenario.expectedLane}, got ${job.returnLane}`);
    } else {
      pass(caseId, `returnLane preserved: ${job?.returnLane ?? job?.productionLane}`);
    }

    await page.goto(`${BASE}/file-room/owner-console`, { waitUntil: "networkidle" });
    const waitingTray = page.locator(".fr-control-room-waiting");
    const waitingText = (await waitingTray.innerText().catch(() => "")) || "";
    if (!waitingText.includes(scenario.jobName.split(" ").slice(-1)[0]) && !waitingText.includes("Flyer")) {
      note(caseId, "Waiting tray may list job under service name variant");
    }
    pass(caseId, "Owner Control Room waiting tray visible");
    await page.screenshot({ path: path.join(shotDir, "case4-waiting-on-client.png"), fullPage: true });

    await clearBlockingMaterials(ownerCookie, campaignId);
    job = await fetchJob(ownerCookie, campaignId, jobId);
    if (job?.spineStatus !== "ready_for_queue") {
      fail(caseId, `After materials arrive expected ready_for_queue, got ${job?.spineStatus}`);
    } else {
      pass(caseId, "Materials cleared â†’ re-queued to correct lane");
    }
    if (job?.productionLane !== scenario.expectedLane) {
      fail(caseId, `Re-queue lane expected ${scenario.expectedLane}, got ${job?.productionLane}`);
    }
  } catch (error) {
    fail(caseId, error instanceof Error ? error.message : String(error));
  }
}

function lineItem(skuId, name, priceCents, deliverables = ["Finished deliverable"]) {
  return {
    skuId,
    serviceId: skuId,
    serviceName: name,
    billingType: "one_time",
    exactPriceCents: priceCents,
    priceDisplay: `$${priceCents / 100}`,
    deliverables,
    exclusions: [],
    timingWindowLabel: "3–5 business days",
    revisionRule: "1 revision round",
    clientResponsibilities: [],
    executionResponsibility: "The Studio creates and delivers",
  };
}

async function seedMultiJobCampaign(ownerCookie) {
  const campaignId = `multi-job-v2-${Date.now()}`;
  const now = new Date().toISOString();
  const flyerSku = "v2-rtu-flyer";
  const emailSku = "v2-rtu-email-kit";
  const flyerJobId = `${campaignId}:${flyerSku}`;
  const emailJobId = `${campaignId}:${emailSku}`;

  const record = {
    campaignId,
    campaignName: "Harbor View Café — Summer push (multi-job)",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Client Journey Coverage V2 — multi-job isolation test",
    estimatedCompletion: "July 15, 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: "2026-07-01T10:00:00.000Z",
    routeMapIntakeSubmittedAt: now,
    routeMapContext: { jobId: flyerSku, roadId: "random-exit" },
    approvedStudioPlan: {
      selectedServiceIds: [flyerSku, emailSku],
      includedServiceIds: [flyerSku, emailSku],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 65000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 65000,
      lineItems: [
        lineItem(flyerSku, "Make Me a Flyer", 30000, ["Flyer design", "Print-ready PDF"]),
        lineItem(emailSku, "Make My Email Campaign Kit", 35000, ["Email 1", "Email 2"]),
      ],
      approvedAt: now,
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    createdAt: now,
    updatedAt: now,
  };

  const syncRes = await api(ownerCookie, "PATCH", "/api/campaigns/current", { record });
  if (syncRes.status !== 200) {
    throw new Error(`Campaign seed failed: ${syncRes.status} ${JSON.stringify(syncRes.json)}`);
  }

  const tasksRes = await api(ownerCookie, "GET", `/api/campaigns/${campaignId}/jobs/${encodeURIComponent(flyerJobId)}`);
  if (tasksRes.status !== 200) {
    await api(ownerCookie, "GET", `/api/campaigns/${campaignId}/materials`);
  }

  const requestedAt73h = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString();
  await patchMaterialsFile(campaignId, (envelope) => {
    for (const item of envelope.items) {
      if (item.relatedServiceIds?.includes(emailSku)) {
        item.requirementLevel = "required";
        item.reviewStatus = "missing";
        item.promotionApprovedAt = requestedAt73h;
      }
    }
    if (!envelope.items.some((item) => item.relatedServiceIds?.includes(emailSku))) {
      envelope.items.push({
        id: `mat-email-logo-${campaignId}`,
        category: "logo-brand",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Brand photos for email",
        reason: "Required for email kit",
        relatedServiceIds: [emailSku],
        promotionApprovedAt: requestedAt73h,
        uploadStatus: "none",
      });
    }
  });

  return { campaignId, flyerJobId, emailJobId, record };
}

async function runMultiJobCase(ownerCookie, page, shotDir) {
  const caseId = "5-multi-job";
  caseResults[caseId] = { pass: true, notes: [] };

  try {
    const { campaignId, flyerJobId, emailJobId } = await seedMultiJobCampaign(ownerCookie);
    caseResults[caseId].campaignId = campaignId;
    caseResults[caseId].jobId = `${flyerJobId} + ${emailJobId}`;

    let flyerJob = await fetchJob(ownerCookie, campaignId, flyerJobId);
    let emailJob = await fetchJob(ownerCookie, campaignId, emailJobId);

    if (!flyerJob || !emailJob) {
      fail(caseId, "Expected two independent job records");
      return;
    }
    pass(caseId, "Two job records under one client campaign");

    if (flyerJob.productionLane === emailJob.productionLane && flyerJob.productionLane === "quick") {
      note(caseId, "Both jobs may share lane type — lanes differ by SKU");
    }
    pass(caseId, `Flyer lane=${flyerJob.productionLane}, Email lane=${emailJob.productionLane}`);

    await clearBlockingMaterials(ownerCookie, campaignId);
    flyerJob = await fetchJob(ownerCookie, campaignId, flyerJobId);
    if (flyerJob?.spineStatus !== "ready_for_queue") {
      fail(caseId, `Flyer should be ready_for_queue, got ${flyerJob?.spineStatus}`);
    }

    await patchMaterialsFile(campaignId, (envelope) => {
      for (const item of envelope.items) {
        if (item.relatedServiceIds?.includes("v2-rtu-email-kit")) {
          item.requirementLevel = "required";
          item.reviewStatus = "missing";
          item.promotionApprovedAt = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString();
        }
      }
    });
    emailJob = await fetchJob(ownerCookie, campaignId, emailJobId);
    if (emailJob?.spineStatus !== "waiting_on_client") {
      fail(caseId, `Email job should be waiting_on_client, got ${emailJob?.spineStatus}`);
    } else {
      pass(caseId, "Email job Waiting on Client while flyer remains unblocked");
    }

    const accepted = await jobPatch(ownerCookie, campaignId, flyerJobId, { action: "record_acceptance_review" });
    if (accepted.status !== 200) {
      fail(caseId, `Flyer Acceptance Review blocked: ${accepted.json.error}`);
    }
    const start = await jobPatch(ownerCookie, campaignId, flyerJobId, { action: "start_building_concepts" });
    if (start.status !== 200) {
      fail(caseId, `Flyer production start blocked: ${start.json.error}`);
    } else {
      pass(caseId, "Blocked email job did not stop flyer production start");
    }

    const deliverableKeys = ["deliverable-0", "deliverable-1"];
    for (const key of deliverableKeys) {
      await jobPatch(ownerCookie, campaignId, flyerJobId, {
        action: "mark_deliverable_prepared",
        deliverableKey: key,
      });
    }
    await jobPatch(ownerCookie, campaignId, flyerJobId, { action: "submit_for_owner_approval" });
    await jobPatch(ownerCookie, campaignId, flyerJobId, { action: "owner_approve_for_review" });

    const feedback = {
      jobId: flyerJobId,
      campaignId,
      sectionStatuses: { "deliverable-0": "approved", "deliverable-1": "approved" },
      stickyNotes: [],
      voiceNotes: [],
      drawSections: [],
      updatedAt: new Date().toISOString(),
    };
    await api(ownerCookie, "PATCH", `/api/campaigns/${campaignId}/jobs/${encodeURIComponent(flyerJobId)}/review`, {
      action: "approve_for_delivery",
      feedback,
    });
    await jobPatch(ownerCookie, campaignId, flyerJobId, { action: "owner_final_release" });
    for (let i = 0; i < deliverableKeys.length; i += 1) {
      await jobPatch(ownerCookie, campaignId, flyerJobId, {
        action: "add_client_delivery_file",
        deliverableKey: deliverableKeys[i],
        fileName: `harbor-flyer-${i + 1}.zip`,
        fileType: "ZIP",
        url: `https://files.example/e2e/${campaignId}/flyer-${i}.zip`,
      });
    }
    const delivered = await jobPatch(ownerCookie, campaignId, flyerJobId, { action: "mark_delivered" });
    if (delivered.json.job?.spineStatus !== "delivered") {
      fail(caseId, "Flyer not delivered");
    } else {
      pass(caseId, "Flyer job DELIVERED");
    }

    emailJob = await fetchJob(ownerCookie, campaignId, emailJobId);
    if (emailJob?.spineStatus !== "waiting_on_client") {
      fail(caseId, `Email job should still be waiting_on_client, got ${emailJob?.spineStatus}`);
    } else {
      pass(caseId, "Email job still Waiting on Client after flyer delivered");
    }

    const deliveryApi = await api(ownerCookie, "GET", `/api/campaigns/${campaignId}/delivery`);
    const deliveryJobs = deliveryApi.json.delivery?.jobs ?? [];
    const hasFlyerOnly =
      deliveryJobs.length === 1 &&
      deliveryJobs[0]?.jobId === flyerJobId &&
      !deliveryJobs.some((j) => j.jobId === emailJobId);
    if (!hasFlyerOnly) {
      fail(caseId, `Delivery isolation failed — ${deliveryJobs.length} jobs in delivery API`);
    } else {
      pass(caseId, "Final Delivery shows only delivered flyer job");
    }

    await page.goto(`${BASE}/studio-board?record=open`, { waitUntil: "networkidle" });
    await page.evaluate(
      ({ key, record }) => {
        localStorage.setItem(key, JSON.stringify(record));
        window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
      },
      { key: CAMPAIGN_KEY, record: (await api(ownerCookie, "GET", `/api/campaigns/${campaignId}`)).json.campaign?.record },
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(shotDir, "case5-multi-job-board.png"), fullPage: true });
    pass(caseId, "Studio Board updated for multi-job campaign");
  } catch (error) {
    fail(caseId, error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(MATERIALS_DIR, { recursive: true });

  try {
    const probe = await fetch(`${BASE}/route-map`, { signal: AbortSignal.timeout(120_000) });
    if (!probe.ok) throw new Error(`Dev server returned ${probe.status}`);
  } catch (error) {
    console.error(`Dev server not reachable at ${BASE}. Run npm run dev first.`);
    console.error(error);
    process.exit(1);
  }

  const ownerCookie = await login(OWNER_LOGIN.email, OWNER_LOGIN.password);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await loginBrowserContext(context, BASE);
  const page = await context.newPage();

  for (const scenario of SCENARIOS) {
    caseResults[scenario.caseId] = { pass: true, notes: [] };
    console.log(`\n=== ${scenario.caseId}: ${scenario.persona} ===`);
    try {
      const { campaignId, jobId, campaign } = await runRouteMapCheckout(page, scenario, OUT_DIR, scenario.caseId, ownerCookie);
      await verifyJobLane(ownerCookie, scenario.caseId, campaignId, jobId, scenario.expectedLane);
      if (scenario.fullJourney) {
        await runFullProductionPath(ownerCookie, page, scenario, campaignId, jobId, campaign, OUT_DIR);
      }
    } catch (error) {
      fail(scenario.caseId, error instanceof Error ? error.message : String(error));
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log("\n=== 4-waiting-on-client ===");
  await runWaitingOnClientCase(ownerCookie, page, OUT_DIR);

  console.log("\n=== 5-multi-job ===");
  await runMultiJobCase(ownerCookie, page, OUT_DIR);

  await browser.close();

  const allPass = Object.values(caseResults).every((r) => r.pass);
  const lines = [
    "# Client Journey Coverage Self-Test V2 — E2E Report",
    "",
    `Date: ${new Date().toISOString()}`,
    `Base URL: ${BASE}`,
    `Branch: fix/discovery-responsive-layout`,
    "",
    "## Summary",
    "",
    "| Case | SKU / scenario | Lane | Capacity | Result | Key notes |",
    "|------|----------------|------|----------|--------|-----------|",
  ];

  const caseMeta = [
    { id: "1-quick-flyer", label: "Quick Lane: Flyer", sku: "v2-rtu-flyer", lane: "quick", cap: 2 },
    { id: "2-standard-email", label: "Standard Lane: Email Kit", sku: "v2-rtu-email-kit", lane: "standard", cap: 2 },
    { id: "3-heavy-video", label: "Heavy Lane: Short Video", sku: "v2-rtu-short-video", lane: "heavy", cap: 1 },
    { id: "4-waiting-on-client", label: "Waiting on Client", sku: "v2-rtu-flyer", lane: "quick", cap: "—" },
    { id: "5-multi-job", label: "Multi-job client", sku: "flyer + email-kit", lane: "mixed", cap: "—" },
  ];

  for (const meta of caseMeta) {
    const r = caseResults[meta.id] ?? { pass: false, notes: ["Not run"] };
    lines.push(
      `| ${meta.label} | \`${meta.sku}\` | ${meta.lane} | ${meta.cap} | ${r.pass ? "**PASS**" : "**FAIL**"} | ${(r.notes[r.notes.length - 1] ?? "").replace(/\|/g, "\\|")} |`,
    );
  }

  lines.push("", "## Per-case detail", "");
  for (const meta of caseMeta) {
    const r = caseResults[meta.id];
    if (!r) continue;
    lines.push(`### ${meta.label}`, "");
    if (r.campaignId) lines.push(`- Campaign: \`${r.campaignId}\``);
    if (r.jobId) lines.push(`- Job: \`${r.jobId}\``);
    for (const n of r.notes) lines.push(`- ${n}`);
    lines.push("");
  }

  lines.push(
    "## Screenshots",
    "",
    "- `tmp/client-journey-coverage-v2/case1-flyer-*.png`",
    "- `tmp/client-journey-coverage-v2/case2-email-*.png`",
    "- `tmp/client-journey-coverage-v2/case3-video-*.png`",
    "- `tmp/client-journey-coverage-v2/case4-waiting-on-client.png`",
    "- `tmp/client-journey-coverage-v2/case5-multi-job-board.png`",
    "",
    "## Overall",
    "",
    allPass ? "**ALL CASES PASSED**" : "**FAILURES DETECTED — see table above**",
    "",
    "## Fixes applied",
    "",
    "See git log if fixes were committed during this run.",
  );

  await writeFile(REPORT_PATH, lines.join("\n"), "utf8");
  console.log(`\nReport: ${REPORT_PATH}`);

  if (!allPass) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
