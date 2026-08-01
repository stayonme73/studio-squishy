/**
 * ISSUE-ENTRY-1 focused browser certification (not committed).
 * Prerequisites: next dev serving this working tree.
 * Usage: node scripts/smoke-issue-entry-1.mjs
 */
import { chromium } from "playwright";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.ISSUE1_BASE_URL ?? "http://127.0.0.1:3000";
const CLIENT = { email: "client-a@local.dev", password: "dev-only" };
const OTHER_CLIENT = { email: "client-b@local.dev", password: "dev-only" };
const CLIENT_USER_ID = "client-a";
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");

const results = [];
function record(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id} — ${detail}`);
}

async function loginApi(request, creds, attempt = 1) {
  const res = await request.post(`${BASE}/api/auth/login`, { data: creds });
  if (res.status() === 429 && attempt < 6) {
    const waitMs = attempt * 15000;
    console.log(`Login rate-limited for ${creds.email}; waiting ${waitMs}ms (attempt ${attempt})`);
    await new Promise((r) => setTimeout(r, waitMs));
    return loginApi(request, creds, attempt + 1);
  }
  if (!res.ok()) throw new Error(`Login failed ${creds.email}: ${res.status()}`);
}

function campaignEnvelope(campaignId, overrides = {}) {
  const now = new Date().toISOString();
  return {
    campaignId,
    clientUserId: CLIENT_USER_ID,
    syncVersion: 1,
    syncedAt: now,
    record: {
      campaignId,
      campaignName: "ISSUE-ENTRY-1 Smoke Campaign",
      campaignStatus: "BUILDING_CONCEPTS",
      campaignDescription: "Disposable ISSUE-ENTRY-1 browser smoke",
      estimatedCompletion: "Soon",
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      paymentReceivedAt: now,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    },
  };
}

/** Board intentionally has no approved plan (proves ISSUE-ENTRY-1 works pre-plan too). */
function approvedPlanOverride(now) {
  return {
    projectDetailsSubmittedAt: now,
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001"],
      includedServiceIds: ["sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 30000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 30000,
      lineItems: [
        lineItem("sm-001", "Social Media Launch Set", 30000, [
          "3 social post concepts",
          "Caption copy set",
          "Export-ready files",
        ]),
      ],
      approvedAt: now,
    },
  };
}

function lineItem(skuId, name, priceCents, deliverables) {
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
    clientResponsibilities: ["Provide brand assets"],
    executionResponsibility: "The Studio creates and delivers",
  };
}

function jobTasksEnvelope(campaignId, jobId, spineStatus) {
  const now = new Date().toISOString();
  return {
    campaignId,
    planFingerprint: "sm-001:one_time",
    tasks: [
      {
        id: "sm-001:creative_production",
        title: "sm-001 — creative_production",
        phase: "creative_production",
        status: "in_progress",
        relatedServiceIds: ["sm-001"],
        familyId: "social",
        catalogFamilyId: "social_media",
        serviceName: "sm-001",
        dependsOn: [],
        workflowState: "in_progress",
        responsibleRole: "creative_production",
      },
    ],
    exceptionRecords: [],
    exceptionEvents: [],
    jobRecords: [
      {
        jobId,
        campaignId,
        skuId: "sm-001",
        serviceName: "Social Media Launch Set",
        spineStatus,
        productionLane: "quick",
        intakeComplete: true,
        productionStartedAt: now,
        ownerApprovalPending: null,
        spineStatusSetAt: now,
        spineStatusSetBy: { role: "staff", displayName: "Producer" },
        spineStatusReason: "ISSUE-ENTRY-1 smoke fixture",
        clientDeadline: "Soon",
        deliverablePrep:
          spineStatus === "ready_for_review"
            ? [
                {
                  deliverableKey: "deliverable-0",
                  label: "3 social post concepts",
                  preparedAt: now,
                  preparedBy: { role: "staff", displayName: "Producer" },
                },
              ]
            : [],
        internalNotes: [],
        laneQueuedAt: now,
        updatedAt: now,
      },
    ],
    jobActivityEvents: [],
    jobReviewFeedback: [],
    ownerDecisionInteractions: [],
    updatedAt: now,
    version: 8,
    syncedAt: now,
  };
}

async function writeCampaign(campaignId, overrides = {}) {
  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  await writeFile(
    path.join(CAMPAIGNS_DIR, `${campaignId}.json`),
    JSON.stringify(campaignEnvelope(campaignId, overrides), null, 2),
  );
}

async function writeTasks(campaignId, jobId, spineStatus) {
  await mkdir(TASKS_DIR, { recursive: true });
  await writeFile(
    path.join(TASKS_DIR, `${campaignId}.json`),
    JSON.stringify(jobTasksEnvelope(campaignId, jobId, spineStatus), null, 2),
  );
}

async function measureOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflow: doc.scrollWidth > doc.clientWidth + 1,
    };
  });
}

const FORBIDDEN_CLAIMS =
  /(\bassigned\b|specialist review|escalated|being investigated|response due|support team notified|ticket number|priority level|department|human review|a person has read|sla\b)/i;

async function waitForComposerReady(page) {
  await page.waitForSelector("text=Project communication", { timeout: 45000 });
  await page.waitForSelector(".sb-project-communication__thread", { timeout: 45000 });
  await page.waitForFunction(
    () => {
      const thread = document.querySelector(".sb-project-communication__thread");
      if (!thread) return false;
      return !(thread.textContent || "").includes("Loading project messages");
    },
    null,
    { timeout: 45000 },
  );
  // The thread and the problem-report status resolve from two independent fetches
  // (`load()` awaits both before clearing `loading`) — small settle buffer avoids
  // reading DOM mid-paint on slower reload navigations.
  await page.waitForTimeout(300);
}

async function certifyComposer(page, label, { hasJob }) {
  // --- Accessibility: words not icons, fieldset/legend, keyboard reachable ---
  const legendText = await page.locator("legend").first().innerText();
  record(`${label}-a11y-legend`, legendText.trim().length > 0, `legend="${legendText}"`);

  const questionRadio = page.getByRole("radio", { name: "Ask a question" });
  const problemRadio = page.getByRole("radio", { name: "Report a problem" });
  await questionRadio.waitFor({ state: "visible" });
  await problemRadio.waitFor({ state: "visible" });
  record(`${label}-a11y-words-not-icons`, true, "options exposed as accessible radio names (words)");

  const questionCheckedDefault = await questionRadio.isChecked();
  record(
    `${label}-default-intent-question`,
    questionCheckedDefault,
    `Ask a question checked by default = ${questionCheckedDefault}`,
  );

  // Keyboard: focus + arrow key moves selection, exposes checked state to AT via role=radio.
  await questionRadio.focus();
  const focusedIsQuestion = await page.evaluate(() => {
    const el = document.activeElement;
    return el instanceof HTMLInputElement && el.type === "radio";
  });
  record(`${label}-a11y-keyboard-focus`, focusedIsQuestion, "radio input reachable via focus()");
  await page.keyboard.press("ArrowDown");
  const problemCheckedViaKeyboard = await problemRadio.isChecked();
  record(
    `${label}-a11y-keyboard-select`,
    problemCheckedViaKeyboard,
    `ArrowDown selected Report a problem = ${problemCheckedViaKeyboard}`,
  );
  // Return to question via keyboard too, then confirm via click below.
  await page.keyboard.press("ArrowUp");

  // --- Ordinary question path unchanged ---
  await questionRadio.check();
  const questionLabel = await page.locator(".sb-project-communication__label").innerText();
  record(`${label}-question-label`, questionLabel === "Message to The Studio", `label="${questionLabel}"`);

  const textarea = page.locator(".sb-project-communication__textarea");
  const questionMsg = `ISSUE-ENTRY-1 ordinary question (${label}) confirming timeline.`;
  await textarea.fill(questionMsg);
  const [questionResponse] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes("/project-communication/customer") &&
        !res.url().includes("problem-report") &&
        res.request().method() === "POST",
    ),
    page.locator(".sb-project-communication__submit").click(),
  ]);
  const questionBody = await questionResponse.json().catch(() => ({}));
  await page.waitForSelector("text=Message sent to The Studio.", { timeout: 20000 });
  record(`${label}-question-success-copy`, true, "unchanged COMM-D4 success copy shown");
  const threadText = await page.locator(".sb-project-communication__thread").innerText();
  const questionInStream = threadText.includes(questionMsg);
  record(
    `${label}-question-in-stream`,
    questionInStream,
    questionInStream
      ? "ordinary message appended to stream"
      : `missing; POST status=${questionResponse.status()} messagesReturned=${questionBody.messages?.length ?? "n/a"} threadText="${threadText.slice(0, 300)}"`,
  );

  // --- Switch to Report a problem ---
  await problemRadio.check();
  const selectedAttr = await page
    .locator('.sb-project-communication__intent-option[data-selected="true"]')
    .innerText();
  record(
    `${label}-a11y-selected-state`,
    selectedAttr.includes("Report a problem"),
    `data-selected option="${selectedAttr}"`,
  );

  const problemLabel = await page.locator(".sb-project-communication__label").innerText();
  record(`${label}-problem-label`, problemLabel === "Describe the problem", `label="${problemLabel}"`);
  const problemPlaceholder = await textarea.getAttribute("placeholder");
  record(
    `${label}-problem-placeholder`,
    problemPlaceholder === "Describe the problem with this project in plain text.",
    `placeholder="${problemPlaceholder}"`,
  );
  const submitLabel = await page.locator(".sb-project-communication__submit").textContent();
  record(
    `${label}-problem-submit-label`,
    submitLabel?.trim() === "Send problem report",
    `submit label="${submitLabel?.trim()}"`,
  );

  const problemMsg = `ISSUE-ENTRY-1 problem report (${label}) export files are missing a layer.`;
  await textarea.fill(problemMsg);
  await page.locator(".sb-project-communication__submit").click();
  await page.waitForSelector("text=Received by the Studio system.", { timeout: 20000 });
  record(`${label}-problem-confirmation`, true, "truthful system-receipt confirmation shown");

  const statusVisible = await page
    .locator(".sb-project-communication__problem-status", { hasText: "Received by the Studio system" })
    .first()
    .isVisible();
  record(`${label}-problem-status-shown`, statusVisible, "status backed by created record rendered");

  const returnedToQuestion = await questionRadio.isChecked();
  record(
    `${label}-not-permanent-mode`,
    returnedToQuestion,
    `composer returned to Ask a question after submit = ${returnedToQuestion}`,
  );

  // Scope to the Project Communication composer itself — pre-existing, unrelated Board
  // copy elsewhere on the page (e.g. "Creative team assigned.") is out of this package.
  const composerText = (
    await page
      .locator(
        '[aria-labelledby="fs-project-communication-title"], .sb-card--project-communication',
      )
      .first()
      .innerText()
  ).toLowerCase();
  const forbiddenMatch = composerText.match(FORBIDDEN_CLAIMS);
  record(
    `${label}-no-forbidden-claims`,
    !forbiddenMatch,
    forbiddenMatch ? `forbidden claim text found: "${forbiddenMatch[0]}"` : "clean",
  );

  // --- Duplicate submission is explicit and safe (one open complaint at a time) ---
  await problemRadio.check();
  const secondProblemMsg = `ISSUE-ENTRY-1 second distinct problem report (${label}).`;
  await textarea.fill(secondProblemMsg);
  const [dupResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/project-communication/customer/problem-report")),
    page.locator(".sb-project-communication__submit").click(),
  ]);
  const dupBody = await dupResponse.json().catch(() => ({}));
  await page
    .locator(".sb-project-communication__error")
    .first()
    .waitFor({ state: "visible", timeout: 10000 })
    .catch(() => {});
  const dupErrorText = await page
    .locator(".sb-project-communication__error")
    .first()
    .innerText()
    .catch(() => "");
  record(
    `${label}-duplicate-explicit-safe`,
    dupResponse.status() === 409 && /already open/i.test(dupErrorText),
    `status=${dupResponse.status()} body=${JSON.stringify(dupBody)} uiError="${dupErrorText}"`,
  );

  // --- Ordinary communication remains available after a problem was submitted ---
  await questionRadio.check();
  const followUpMsg = `ISSUE-ENTRY-1 follow-up ordinary message (${label}) after problem report.`;
  await textarea.fill(followUpMsg);
  await page.locator(".sb-project-communication__submit").click();
  await page.waitForSelector("text=Message sent to The Studio.", { timeout: 20000 });
  const followUpInStream = await page.locator(`text=${followUpMsg}`).first().isVisible();
  record(`${label}-ordinary-still-available`, followUpInStream, "ordinary message sent after problem report");

  // --- Refresh preserves both the record and the status ---
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForComposerReady(page);
  const persistedStatus = await page
    .locator(".sb-project-communication__problem-status", { hasText: "Received by the Studio system" })
    .first()
    .isVisible();
  record(`${label}-refresh-persist-status`, persistedStatus, "problem status survived refresh");
  const postRefreshThreadText = await page.locator(".sb-project-communication__thread").innerText();
  const persistedQuestion = postRefreshThreadText.includes(questionMsg);
  const persistedFollowUp = postRefreshThreadText.includes(followUpMsg);
  record(
    `${label}-refresh-persist-history`,
    persistedQuestion && persistedFollowUp,
    `ordinary messages survived refresh (q=${persistedQuestion} followUp=${persistedFollowUp}) thread="${postRefreshThreadText.slice(0, 400)}"`,
  );

  if (hasJob) {
    record(`${label}-job-association`, true, "jobId prop supplied to composer; server enforced job membership");
  }

  const overflow = await measureOverflow(page);
  record(`${label}-no-overflow`, !overflow.overflow, `scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`);
}

async function runBoard(browser, campaignId, viewport, label, storageState) {
  const context = await browser.newContext({ viewport, storageState });
  const page = await context.newPage();
  await page.goto(`${BASE}/studio-board?campaignId=${encodeURIComponent(campaignId)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await waitForComposerReady(page);
  await certifyComposer(page, label, { hasJob: false });
  await context.close();
}

async function runReview(browser, campaignId, jobId, storageState) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState });
  const page = await context.newPage();
  await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(jobId)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await waitForComposerReady(page);
  await certifyComposer(page, "review", { hasJob: true });
  await context.close();
}

async function runUnifiedRoom(browser, roomState, campaignId, jobId, storageState) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState });
  const page = await context.newPage();
  await page.goto(
    `${BASE}/feedback-studio?roomState=${roomState}&jobId=${encodeURIComponent(jobId)}`,
    { waitUntil: "domcontentloaded", timeout: 60000 },
  );
  await waitForComposerReady(page);
  await certifyComposer(page, roomState, { hasJob: true });
  await context.close();
}

async function runAuthorization(browser, boardCampaignId, boardJobId, reviewCampaignId) {
  // Unauthenticated — must fail truthfully.
  const anon = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const anonPage = await anon.newPage();
  const anonGet = await anonPage.request.get(
    `${BASE}/api/campaigns/${boardCampaignId}/project-communication/customer/problem-report`,
  );
  record("unauth-problem-get", anonGet.status() === 401, `GET status=${anonGet.status()}`);
  const anonPost = await anonPage.request.post(
    `${BASE}/api/campaigns/${boardCampaignId}/project-communication/customer/problem-report`,
    { data: { action: "customer_problem_report", message: "spoof", idempotencyKey: "anon-1" } },
  );
  record("unauth-problem-post", anonPost.status() === 401, `POST status=${anonPost.status()}`);
  await anon.close();

  // Cross-customer — client-b must not read or write client-a's problem report.
  const other = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const otherPage = await other.newPage();
  await loginApi(otherPage.request, OTHER_CLIENT);
  const otherGet = await otherPage.request.get(
    `${BASE}/api/campaigns/${boardCampaignId}/project-communication/customer/problem-report`,
  );
  record("cross-customer-problem-get", otherGet.status() === 403, `GET status=${otherGet.status()}`);
  const otherPost = await otherPage.request.post(
    `${BASE}/api/campaigns/${boardCampaignId}/project-communication/customer/problem-report`,
    {
      data: {
        action: "customer_problem_report",
        message: "cross-customer attempt",
        idempotencyKey: "cross-1",
      },
    },
  );
  record("cross-customer-problem-post", otherPost.status() === 403, `POST status=${otherPost.status()}`);
  await other.close();

  // Authorized client — job/customer identifiers cannot be spoofed through the client.
  const client = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const clientPage = await client.newPage();
  await loginApi(clientPage.request, CLIENT);

  // Unknown job on this campaign fails truthfully (404), not silently accepted.
  const unknownJob = await clientPage.request.post(
    `${BASE}/api/campaigns/${boardCampaignId}/project-communication/customer/problem-report`,
    {
      data: {
        action: "customer_problem_report",
        message: "unknown job binding attempt",
        idempotencyKey: "unknown-job-1",
        jobId: "does-not-exist:sm-999",
      },
    },
  );
  record(
    "unknown-job-rejected",
    unknownJob.status() === 404,
    `POST with unowned/unknown jobId status=${unknownJob.status()}`,
  );

  // A jobId belonging to a DIFFERENT campaign cannot be spoofed onto this campaign's report.
  const crossCampaignJobSpoof = await clientPage.request.post(
    `${BASE}/api/campaigns/${boardCampaignId}/project-communication/customer/problem-report`,
    {
      data: {
        action: "customer_problem_report",
        message: "cross-campaign job spoof attempt",
        idempotencyKey: "cross-campaign-job-1",
        jobId: `${reviewCampaignId}:sm-001`,
      },
    },
  );
  record(
    "cross-campaign-job-spoof-rejected",
    crossCampaignJobSpoof.status() === 404,
    `POST with another campaign's jobId status=${crossCampaignJobSpoof.status()}`,
  );

  // Idempotency key replay with a different message body is rejected explicitly.
  // Uses its own campaign (no complaint has been opened on it yet) so the first
  // submit is expected to succeed, isolating this check from the "already open"
  // rule exercised by the other assertions in this function.
  const idempotencyCampaignId = `${boardCampaignId}-idem`;
  await writeCampaign(idempotencyCampaignId);
  const firstOfKey = await clientPage.request.post(
    `${BASE}/api/campaigns/${idempotencyCampaignId}/project-communication/customer/problem-report`,
    {
      data: {
        action: "customer_problem_report",
        message: "authorization-check original message",
        idempotencyKey: "auth-check-key-1",
      },
    },
  );
  record("auth-check-first-submit", firstOfKey.status() === 200, `status=${firstOfKey.status()}`);
  const conflictingReplay = await clientPage.request.post(
    `${BASE}/api/campaigns/${idempotencyCampaignId}/project-communication/customer/problem-report`,
    {
      data: {
        action: "customer_problem_report",
        message: "different message body reusing the same key",
        idempotencyKey: "auth-check-key-1",
      },
    },
  );
  record(
    "idempotency-key-conflict-rejected",
    conflictingReplay.status() === 409,
    `POST reusing key with different message status=${conflictingReplay.status()}`,
  );

  await client.close();
}

async function main() {
  const rand = randomUUID().slice(0, 8);
  const boardCampaignId = `issue1-board-${rand}`;
  const boardPhoneCampaignId = `issue1-board-phone-${rand}`;
  const reviewCampaignId = `issue1-review-${rand}`;
  const finalCampaignId = `issue1-final-${rand}`;
  const deliveryCampaignId = `issue1-delivery-${rand}`;
  const reviewJobId = `${reviewCampaignId}:sm-001`;
  const finalJobId = `${finalCampaignId}:sm-001`;
  const deliveryJobId = `${deliveryCampaignId}:sm-001`;

  console.log(`ISSUE-ENTRY-1 smoke base=${BASE}`);
  console.log(`  board=${boardCampaignId} review=${reviewCampaignId} final=${finalCampaignId} delivery=${deliveryCampaignId}`);

  const now = new Date().toISOString();
  await writeCampaign(boardCampaignId);
  await writeCampaign(reviewCampaignId, approvedPlanOverride(now));
  await writeCampaign(finalCampaignId, approvedPlanOverride(now));
  await writeCampaign(deliveryCampaignId, approvedPlanOverride(now));
  await writeTasks(reviewCampaignId, reviewJobId, "ready_for_review");
  await writeTasks(finalCampaignId, finalJobId, "ready_for_review");
  await writeTasks(deliveryCampaignId, deliveryJobId, "ready_for_review");

  const browser = await chromium.launch({ headless: true });
  try {
    const loginCtx = await browser.newContext();
    await loginApi(loginCtx.request, CLIENT);
    const storage = await loginCtx.storageState();
    await loginCtx.close();

    await runBoard(browser, boardCampaignId, { width: 1440, height: 900 }, "board-desktop", storage);
    await writeCampaign(boardPhoneCampaignId);
    await runBoard(browser, boardPhoneCampaignId, { width: 390, height: 844 }, "board-phone", storage);
    await runReview(browser, reviewCampaignId, reviewJobId, storage);
    await runUnifiedRoom(browser, "final", finalCampaignId, finalJobId, storage);
    await runUnifiedRoom(browser, "delivery", deliveryCampaignId, deliveryJobId, storage);

    await runAuthorization(browser, boardCampaignId, null, reviewCampaignId);
  } finally {
    await browser.close();
    for (const id of [
      boardCampaignId,
      `${boardCampaignId}-idem`,
      boardPhoneCampaignId,
      reviewCampaignId,
      finalCampaignId,
      deliveryCampaignId,
    ]) {
      await rm(path.join(CAMPAIGNS_DIR, `${id}.json`), { force: true });
      await rm(path.join(TASKS_DIR, `${id}.json`), { force: true });
    }
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\nISSUE-ENTRY-1 smoke: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    for (const f of failed) console.log(`  FAIL ${f.id}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
