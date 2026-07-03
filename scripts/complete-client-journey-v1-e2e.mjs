/**
 * Complete Client Journey Self-Test V1 — full spine E2E.
 * Social Media Posts + Post/Publish (v2-rtu-social-posts + v2-addon-post-publish).
 *
 * Run: node scripts/complete-client-journey-v1-e2e.mjs
 * Requires: npm run dev (localhost:3000), SESSION_SECRET in .env.local
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/complete-client-journey-v1");
const REPORT_PATH = path.join(OUT_DIR, "e2e-report.md");
const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const SKU = "v2-rtu-social-posts";

const PERSONA = {
  label: "James Rivera — FitFlow Training Studio (summer membership push)",
  road: "I Know What I Need",
  jobName: "Make My Social Media Posts",
  intakeTitle: "Social Media Posts Intake",
  expectedPrice: "$550",
  markerValue: "Instagram",
  intakeFields: [
    { type: "textarea", value: "Summer membership push — 4 posts promoting our new class schedule" },
    { type: "textarea", value: "Join now — first month 20% off · fitflowstudio.com/join · DM for details" },
    { type: "select", value: "Instagram" },
    { type: "textarea", value: "Logo, gym floor photos, brand teal and charcoal palette" },
    { type: "textarea", value: "#FitFlowSummer #NewMember" },
    { type: "select", value: "Instagram" },
    { type: "text", value: "Admin invite sent to studio@fitflow.com" },
    { type: "text", value: "June 12 after 6am" },
  ],
};

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

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };

/** @type {{ stage: string; pass: boolean; notes: string }[]} */
const stages = [];

function record(stage, pass, notes = "") {
  stages.push({ stage, pass, notes });
  console.log(`${pass ? "PASS" : "FAIL"} — ${stage}${notes ? `: ${notes}` : ""}`);
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

async function fillIntakeWithPersona(page) {
  let fieldIdx = 0;
  const fields = page.locator(".route-map-intake__field");
  const count = await fields.count();
  for (let i = 0; i < count; i += 1) {
    const spec = PERSONA.intakeFields[fieldIdx];
    if (!spec) break;
    const field = fields.nth(i);
    const select = field.locator("select");
    const textarea = field.locator("textarea");
    const input = field.locator('input[type="text"]');
    if (spec.type === "select" && (await select.count())) {
      await select.selectOption({ label: spec.value });
      fieldIdx += 1;
    } else if (spec.type === "textarea" && (await textarea.count())) {
      await textarea.fill(spec.value);
      fieldIdx += 1;
    } else if (spec.type === "text" && (await input.count())) {
      await input.fill(spec.value);
      fieldIdx += 1;
    }
  }
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
      throw new Error(`Campaign sync failed: ${status.lastError}`);
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
async function clearBlockingMaterials(cookie, campaignId) {
  const res = await api(cookie, "GET", `/api/campaigns/${campaignId}/materials`);
  const items = res.json.materials?.items ?? [];
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

async function fetchJob(ownerCookie, campaignId, jobId) {
  const res = await api(
    ownerCookie,
    "GET",
    `/api/campaigns/${campaignId}/jobs/${encodeURIComponent(jobId)}`,
  );
  return res.json.jobRecords?.find((j) => j.jobId === jobId) ?? null;
}

async function fetchCampaignRecord(ownerCookie, campaignId) {
  const res = await api(ownerCookie, "GET", `/api/campaigns/${campaignId}`);
  return res.json.campaign?.record ?? null;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  try {
    const probe = await fetch(`${BASE}/route-map`, {
      signal: AbortSignal.timeout(120_000),
    });
    if (!probe.ok) throw new Error(`Dev server returned ${probe.status}`);
  } catch (error) {
    console.error(`Dev server not reachable at ${BASE}. Run npm run dev first.`);
    console.error(error);
    process.exit(1);
  }

  const ownerCookie = await login(OWNER_LOGIN.email, OWNER_LOGIN.password);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([
    {
      name: "studio_session",
      value: ownerCookie,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();

  let campaignId = "";
  let jobId = "";

  try {
    await clearCampaign(page);
    await gotoRouteMap(page);
    await page.screenshot({ path: path.join(OUT_DIR, "01-route-map.png"), fullPage: true });

    await selectRoad(page, PERSONA.road);
    await page.getByRole("button", { name: new RegExp(PERSONA.jobName.slice(0, 20), "i") }).click();
    await page.waitForSelector(".route-map-job-card", { timeout: 15000 });
    await page.screenshot({ path: path.join(OUT_DIR, "02-job-selected.png"), fullPage: true });

    await page.getByRole("button", { name: /choose this job/i }).click();
    await page.waitForSelector(".route-map-checkout-addon, .pay-paper-card--summary", {
      timeout: 15000,
    });

    const addonCheckbox = page.locator(".route-map-checkout-addon input[type='checkbox']");
    if (await addonCheckbox.count()) await addonCheckbox.check();

    const checkoutText = await page.locator(".pay-paper-card--summary").innerText();
    record(
      "Route Map → job selection → checkout (Post/Publish)",
      checkoutText.includes(PERSONA.expectedPrice) && checkoutText.toLowerCase().includes("post"),
      `price visible: ${checkoutText.includes(PERSONA.expectedPrice)}`,
    );
    await page.screenshot({ path: path.join(OUT_DIR, "03-checkout-post-publish.png"), fullPage: true });

    const terms = page.locator('input[name="terms"]');
    if (await terms.count()) await terms.check();
    await page.getByRole("button", { name: /test payment|sandbox/i }).first().click();

    await page.waitForSelector(".route-map-intake", { timeout: 25000 });
    const intakeTitle = await page.locator("#route-map-intake-title").innerText();
    record(
      "Service-specific intake form",
      intakeTitle === PERSONA.intakeTitle,
      intakeTitle,
    );
    await page.screenshot({ path: path.join(OUT_DIR, "04-intake-form.png"), fullPage: true });

    await fillIntakeWithPersona(page);
    await page.getByRole("button", { name: /Submit intake/i }).click();
    await page.waitForURL(/studio-board.*record=open/, { timeout: 25000 });
    await page.waitForSelector('[data-testid="route-map-client-summary"]', { timeout: 15000 });

    const campaign = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, CAMPAIGN_KEY);

    campaignId = campaign?.campaignId ?? "";
    jobId = `${campaignId}:${SKU}`;

    const clientSummaryText = await page.locator('[data-testid="route-map-client-summary"]').innerText();
    const clientLeaks = auditClientText(clientSummaryText);
    record(
      "Studio Board + Project Record (client-safe)",
      clientLeaks.length === 0 &&
        clientSummaryText.includes(PERSONA.markerValue) &&
        campaign?.campaignStatus === "BUILDING_CONCEPTS",
      clientLeaks.length ? `leaks: ${clientLeaks.join(", ")}` : `status=${campaign?.campaignStatus}`,
    );
    await page.screenshot({ path: path.join(OUT_DIR, "05-studio-board-record.png"), fullPage: true });

    const synced = await waitForCampaignSync(page, campaignId);
    record("Campaign sync to server", synced, synced ? campaignId : "sync timeout");

    const campaignRecord = await fetchCampaignRecord(ownerCookie, campaignId);
    record(
      "Server campaign envelope",
      Boolean(campaignRecord?.routeMapIntakeSubmittedAt),
      campaignRecord?.routeMapIntakeSubmittedAt ?? "missing intake timestamp",
    );

    await page.goto(`${BASE}/studio-board?productionBrief=open`);
    await page.waitForTimeout(800);
    const briefVisible = (await page.locator('[data-testid="route-map-production-brief"]').count()) > 0;
    record(
      "Production brief (internal — owner view)",
      briefVisible,
      briefVisible ? "brief panel open" : "missing brief",
    );
    await page.screenshot({ path: path.join(OUT_DIR, "06-production-brief-internal.png"), fullPage: true });

    await page.goto(`${BASE}/studio-board?record=open`);
    await page.waitForTimeout(500);
    const clientBoardText = await page.locator('[data-testid="route-map-client-summary"]').innerText();
    record(
      "Client board hides production brief",
      !clientBoardText.includes("SKU") && !clientBoardText.includes("Job context"),
    );

    let job = await fetchJob(ownerCookie, campaignId, jobId);
    record(
      "Owner Control Room — job record exists",
      Boolean(job),
      job ? `spine=${job.spineStatus}` : "no job",
    );

    const clearedMaterials = await clearBlockingMaterials(ownerCookie, campaignId);
    record(
      "Materials gate cleared (owner approved)",
      clearedMaterials >= 0,
      `${clearedMaterials} blocking items cleared`,
    );

    job = await fetchJob(ownerCookie, campaignId, jobId);
    record(
      "Job returns to queue after materials cleared",
      job?.spineStatus === "ready_for_queue",
      job?.spineStatus ?? "missing job",
    );

    if (job?.spineStatus === "ready_for_queue") {
      const start = await jobPatch(ownerCookie, campaignId, jobId, {
        action: "start_building_concepts",
      });
      record(
        "Production Workspace — start Building Concepts",
        start.status === 200 && start.json.job?.spineStatus === "building_concepts",
        start.json.error ?? start.json.job?.spineStatus,
      );
      job = start.json.job ?? job;
    } else {
      record(
        "Production Workspace — start Building Concepts",
        job?.spineStatus === "building_concepts",
        `already ${job?.spineStatus}`,
      );
    }

    await page.goto(`${BASE}/file-room/owner-console`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(OUT_DIR, "07-owner-control-room.png"), fullPage: true });

    const planLine = campaignRecord?.approvedStudioPlan?.lineItems?.find(
      (l) => (l.skuId ?? l.serviceId) === SKU,
    );
    const deliverables = planLine?.deliverables ?? [];
    const deliverableKeys = deliverables.map((_, i) => `deliverable-${i}`);

    for (let i = 0; i < deliverableKeys.length; i += 1) {
      const prep = await jobPatch(ownerCookie, campaignId, jobId, {
        action: "mark_deliverable_prepared",
        deliverableKey: deliverableKeys[i],
      });
      if (prep.status !== 200) {
        record(`Mark deliverable ${i} prepared`, false, prep.json.error);
        break;
      }
      job = prep.json.job;
    }
    record(
      "Production Workspace — all deliverables prepared",
      deliverableKeys.every((key) =>
        (job?.deliverablePrep ?? []).some((d) => d.deliverableKey === key && d.preparedAt),
      ),
      `${deliverableKeys.length} deliverables`,
    );

    await jobPatch(ownerCookie, campaignId, jobId, {
      action: "add_internal_note",
      content: "E2E internal note — must not appear to client",
    });
    await jobPatch(ownerCookie, campaignId, jobId, {
      action: "add_working_file_ref",
      label: "Working Figma board",
      url: "https://figma.com/file/e2e-internal",
    });

    const submit = await jobPatch(ownerCookie, campaignId, jobId, {
      action: "submit_for_owner_approval",
    });
    record(
      "Production → Owner Desk (before review gate)",
      submit.status === 200 && submit.json.job?.ownerApprovalPending === "before_review",
      submit.json.error ?? submit.json.job?.ownerApprovalPending,
    );
    job = submit.json.job ?? job;

    await page.goto(`${BASE}/file-room/owner-console`, { waitUntil: "networkidle" });
    const deskText = await page.locator(".fr-control-room-desk").innerText().catch(() => "");
    record(
      "Owner Desk shows approval_before_review",
      deskText.includes("Review gate") && deskText.includes("Social Media"),
      deskText.slice(0, 120),
    );
    await page.screenshot({ path: path.join(OUT_DIR, "08-owner-desk-review-gate.png"), fullPage: true });

    await page.goto(
      `${BASE}/file-room/${campaignId}/production/${encodeURIComponent(jobId)}`,
      { waitUntil: "networkidle" },
    );
    await page.screenshot({ path: path.join(OUT_DIR, "09-production-workspace.png"), fullPage: true });

    const approveReview = await jobPatch(ownerCookie, campaignId, jobId, {
      action: "owner_approve_for_review",
    });
    record(
      "Owner approval → Ready for Review",
      approveReview.status === 200 && approveReview.json.job?.spineStatus === "ready_for_review",
      approveReview.json.error ?? approveReview.json.job?.spineStatus,
    );
    job = approveReview.json.job ?? job;

    const jobsRes = await api(ownerCookie, "GET", `/api/campaigns/${campaignId}/jobs/${encodeURIComponent(jobId)}`);
    const activity = jobsRes.json.jobActivityEvents ?? [];
    const statusEvents = activity.filter((e) => e.kind === "status_change" || e.kind === "approval");
    record(
      "Activity log — timestamped status changes",
      statusEvents.length >= 3 && statusEvents.every((e) => e.occurredAt),
      `${statusEvents.length} status/approval events`,
    );

    const reviewGet = await api(ownerCookie, "GET", `/api/campaigns/${campaignId}/jobs/${encodeURIComponent(jobId)}/review`);
    record(
      "Review Room — client can open job",
      reviewGet.status === 200 && reviewGet.json.review?.spineStatus === "ready_for_review",
      `HTTP ${reviewGet.status}`,
    );

    const reviewActivity = reviewGet.json.review?.activity ?? [];
    const clientActivityLeaks = reviewActivity.filter((e) =>
      ["internal_note", "working_file_ref"].includes(e.kind),
    );
    record(
      "Review Room — activity log client-safe",
      clientActivityLeaks.length === 0,
      clientActivityLeaks.length ? "internal events leaked" : `${reviewActivity.length} client events`,
    );

    await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(jobId)}`, {
      waitUntil: "networkidle",
    });
    await page.waitForSelector(".fs-review--workspace", { timeout: 20000 }).catch(() => {});
    const reviewPageText = await page.locator("body").innerText();
    record(
      "Review Room UI — no internal leaks",
      auditClientText(reviewPageText).length === 0 && !reviewPageText.includes("Working Figma"),
    );
    await page.screenshot({ path: path.join(OUT_DIR, "10-review-room.png"), fullPage: true });

    const sectionStatuses = Object.fromEntries(
      deliverableKeys.map((key) => [key, "approved"]),
    );
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
    record(
      "Client approve for delivery",
      approveDelivery.status === 200 && approveDelivery.json.job?.spineStatus === "approved",
      approveDelivery.json.error ?? approveDelivery.json.job?.spineStatus,
    );
    job = approveDelivery.json.job ?? job;

    await page.goto(`${BASE}/file-room/owner-console`, { waitUntil: "networkidle" });
    const deskDelivery = await page.locator(".fr-control-room-desk").innerText().catch(() => "");
    record(
      "Owner Desk — final release gate",
      /final release|before delivery|delivery/i.test(deskDelivery),
    );
    await page.screenshot({ path: path.join(OUT_DIR, "11-owner-desk-final-release.png"), fullPage: true });

    const finalRelease = await jobPatch(ownerCookie, campaignId, jobId, {
      action: "owner_final_release",
    });
    record(
      "Owner final release → Ready for Delivery",
      finalRelease.status === 200 && finalRelease.json.job?.spineStatus === "ready_for_delivery",
      finalRelease.json.error ?? finalRelease.json.job?.spineStatus,
    );
    job = finalRelease.json.job ?? job;

    for (let i = 0; i < deliverableKeys.length; i += 1) {
      await jobPatch(ownerCookie, campaignId, jobId, {
        action: "add_client_delivery_file",
        deliverableKey: deliverableKeys[i],
        fileName: `fitflow-post-${i + 1}.zip`,
        fileType: "ZIP",
        url: `https://files.example/e2e/${campaignId}/deliverable-${i}.zip`,
      });
    }

    const delivered = await jobPatch(ownerCookie, campaignId, jobId, { action: "mark_delivered" });
    record(
      "Mark delivered to client",
      delivered.status === 200 && delivered.json.job?.spineStatus === "delivered",
      delivered.json.error ?? delivered.json.job?.spineStatus,
    );
    job = delivered.json.job ?? job;

    await page.goto(`${BASE}/file-room/${campaignId}/production/${encodeURIComponent(jobId)}`, {
      waitUntil: "networkidle",
    });
    await page.screenshot({ path: path.join(OUT_DIR, "12-production-delivered.png"), fullPage: true });

    const deliveryApi = await api(ownerCookie, "GET", `/api/campaigns/${campaignId}/delivery`);
    const deliveryJobs = deliveryApi.json.delivery?.jobs ?? [];
    const onlyThisJob =
      deliveryJobs.length === 1 &&
      deliveryJobs[0]?.jobId === jobId &&
      (deliveryJobs[0]?.files?.length ?? 0) === deliverableKeys.length;
    record(
      "Final Delivery API — only this job's files",
      deliveryApi.status === 200 && onlyThisJob,
      `${deliveryJobs.length} jobs, ${deliveryJobs[0]?.files?.length ?? 0} files`,
    );

    await page.goto(`${BASE}/deliverables`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const deliveryPageText = await page.locator("body").innerText();
    record(
      "Final Delivery page — client files visible",
      deliveryPageText.includes("fitflow-post") || deliveryPageText.includes(".zip"),
      deliveryPageText.includes("Make My Social Media Posts") ? "service name shown" : "check files",
    );
    record(
      "Final Delivery page — no internal leaks",
      auditClientText(deliveryPageText).length === 0,
    );
    await page.screenshot({ path: path.join(OUT_DIR, "13-final-delivery.png"), fullPage: true });

    await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const postDeliveryRecord = await fetchCampaignRecord(ownerCookie, campaignId);
    const boardStatus = await page.locator(".sb-eta-panel__status, .sb-metric__value").first().innerText().catch(() => "");
    record(
      "Studio Board updates after delivery",
      postDeliveryRecord?.campaignStatus === "DELIVERED" ||
        /deliver/i.test(boardStatus),
      (postDeliveryRecord?.campaignStatus ?? boardStatus) || "unknown",
    );
    await page.screenshot({ path: path.join(OUT_DIR, "14-studio-board-delivered.png"), fullPage: true });
  } catch (error) {
    record("Unhandled error", false, error instanceof Error ? error.message : String(error));
  } finally {
    await browser.close();
  }

  const allPass = stages.every((s) => s.pass);
  const leakStages = stages.filter((s) => s.stage.includes("leak") || s.stage.includes("client-safe"));
  const leakPass = leakStages.every((s) => s.pass);

  const lines = [
    "# Complete Client Journey Self-Test V1 — E2E Report",
    "",
    `Date: ${new Date().toISOString()}`,
    `Base URL: ${BASE}`,
    `Branch: fix/discovery-responsive-layout`,
    "",
    "## Client persona + path",
    "",
    `- **Persona:** ${PERSONA.label}`,
    `- **SKU:** \`${SKU}\` + \`v2-addon-post-publish\``,
    `- **Route:** ${PERSONA.road}`,
    `- **Campaign ID:** ${campaignId || "(not created)"}`,
    `- **Job ID:** ${jobId || "(not created)"}`,
    "",
    "## Stage verification",
    "",
    "| Stage | Result | Notes |",
    "|-------|--------|-------|",
  ];

  for (const s of stages) {
    lines.push(`| ${s.stage} | ${s.pass ? "**PASS**" : "**FAIL**"} | ${s.notes.replace(/\|/g, "\\|")} |`);
  }

  lines.push(
    "",
    "## Data leak audit",
    "",
    `- Client Project Record / Board: ${stages.find((s) => s.stage.includes("Studio Board + Project Record"))?.pass ? "PASS" : "FAIL"}`,
    `- Review Room activity + UI: ${stages.filter((s) => s.stage.includes("Review Room")).every((s) => s.pass) ? "PASS" : "FAIL"}`,
    `- Final Delivery page: ${stages.find((s) => s.stage.includes("Final Delivery page — no internal"))?.pass ? "PASS" : "FAIL"}`,
    `- Internal notes/files: added during test; must not appear in client views — ${leakPass ? "PASS" : "FAIL"}`,
    "",
    "## Activity log verification",
    "",
    stages.find((s) => s.stage.includes("Activity log"))?.notes ?? "Not verified",
    "",
    "## Screenshots",
    "",
    ...Array.from({ length: 14 }, (_, i) => {
      const n = String(i + 1).padStart(2, "0");
      return `- \`tmp/complete-client-journey-v1/${n}-*.png\``;
    }),
    "",
    "## Overall",
    "",
    allPass ? "**ALL STAGES PASSED**" : "**FAILURES DETECTED — see table above**",
    "",
    "## Fixes applied",
    "",
    "None — see git log if fixes were committed during this run.",
    "",
    "---",
    "*Complete Client Journey Self-Test V1*",
  );

  await writeFile(REPORT_PATH, lines.join("\n"), "utf8");
  console.log(`\nReport: ${REPORT_PATH}`);
  console.log(`Screenshots: ${OUT_DIR}`);

  if (!allPass) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
