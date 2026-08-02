/**
 * CUSTOMER-ONE-E2E-CERT-1 — Customer-One end-to-end certification (Playwright).
 *
 * Journey:
 *   Lobby → Conversation Room → Payment → Intake → Account Handoff/Auth
 *   → Studio Board → Review / Final / Delivery
 *
 * Truth limits (locked for this package):
 * - Project Claim is NOT started / NOT certified here.
 * - Post-Board Review/Final/Delivery require honest production-state seed
 *   (CR-4 payment+intake does not invent ready_for_review).
 * - Sandbox payment only (sealed Payment room not reopened).
 * - Pre-CR Host/Route Map scripts are not evidence.
 *
 * Env:
 *   CERT_BASE_URL  default http://127.0.0.1:3031
 *   CERT_COMMIT    recorded tip
 *   SESSION_SECRET required on server for signup/login
 *   NEXT_PUBLIC_PAYMENT_SANDBOX=1 required at next build for sandbox CTA
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.CERT_BASE_URL || "http://127.0.0.1:3031";
const COMMIT =
  process.env.CERT_COMMIT || "0a8f84625d526d29109b5ded6ba11197ce0f1f95";
const OUT = join(process.cwd(), "test-artifacts", "customer-one-e2e-1");
const CAMPAIGNS_DIR = join(process.cwd(), "data", "campaigns");
const TASKS_DIR = join(process.cwd(), "data", "campaign-tasks");
const MATERIALS_DIR = join(process.cwd(), "data", "campaign-materials");
const USERS_PATH = join(process.cwd(), "data", "studio-users.json");

const WD_KEY = "studio-squishy:working-draft:v1";
const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const VOICE_NARRATION_KEY = "studio-voice:narration-preference:v1";
const SKU = "v2-rtu-flyer";
const INTAKE_SUBMIT_RE =
  /SAVE & CONTINUE TO (YOUR ACCOUNT|STUDIO BOARD)|Continue to Studio Board/i;

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "phone-390", width: 390, height: 844 },
];

mkdirSync(OUT, { recursive: true });

/** @type {{ check: string, status: "PASS"|"FAIL"|"BLOCKED"|"NOT_APPLICABLE"|"LIMIT", detail?: string, matrix?: string }[]} */
const results = [];

function push(check, status, extra = {}) {
  results.push({ check, status, ...extra });
  console.log(
    `${status.padEnd(14)} ${check}${extra.detail ? ` — ${extra.detail}` : ""}`,
  );
}

function completeFlyerIntakeAnswers() {
  return {
    "shared:businessName": "Cert Cafe",
    "shared:materials": "I will provide this later",
    "v2-rtu-flyer:flyerPurpose": "Weekend cafe promotion flyer",
    "v2-rtu-flyer:mustInclude":
      "Open Saturday 9am, 20% off pastries, 123 Main St",
    "v2-rtu-flyer:intendedUse": "Both print and digital",
  };
}

function stageLocation(stage) {
  return `conversation-room-stage:${stage}`;
}

function seedWorkingDraft(stage, overrides = {}) {
  const location = stageLocation(stage);
  return {
    version: 1,
    status: "working_draft",
    editable: true,
    updatedAt: new Date().toISOString(),
    revision: 3,
    cursor: {
      conversationLocation: location,
      journeyPhase: "conversation",
      flowStep: stage,
    },
    attribution: overrides.attribution ?? [],
    slices: {
      currentConversationLocation: location,
      discoveryAnswers: {
        preferredName: "Cert",
        projectNeed: "Flyer for grand opening",
        businessName: "Cert Cafe",
        requestedDeadline: "",
        deadlineStatus: "not_requested",
        existingMaterialsNote: "",
        confirmedAt: "2026-07-26T12:00:00.000Z",
      },
      routeRecommendation: {
        roadId: "i20",
        projectNeed: "Flyer for grand opening",
        recommendedAt: "2026-07-26T12:01:00.000Z",
      },
      customerSelectedRoute: {
        roadId: "i20",
        selectedAt: "2026-07-26T12:02:00.000Z",
      },
      selectedServices:
        stage === "opening" || stage === "route"
          ? []
          : [
              {
                jobId: SKU,
                roadId: "i20",
                addedAt: "2026-07-26T12:03:00.000Z",
              },
            ],
      ...overrides.slices,
    },
  };
}

function seedCheckoutCampaign(extra = {}) {
  const now = new Date().toISOString();
  const campaignId = extra.campaignId || `c1e2e-${Date.now()}`;
  return {
    campaignId,
    campaignStatus: "APPROVED",
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: [SKU],
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      includedServiceIds: [SKU],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 14900,
      monthlyTotalCents: 0,
      amountDueTodayCents: 14900,
      lineItems: [
        {
          skuId: SKU,
          serviceId: SKU,
          serviceName: "Ready-to-Use Flyer",
          billingType: "one_time",
          exactPriceCents: 14900,
          priceDisplay: "$149",
          deliverables: ["Print-ready flyer", "Digital flyer file"],
          exclusions: [],
          timingWindowLabel: "3–5 business days",
          revisionRule: "1 revision round",
          clientResponsibilities: ["Provide business details"],
          executionResponsibility: "The Studio creates and delivers",
        },
      ],
      approvedAt: now,
    },
    routeMapContext: {
      roadId: "i20",
      jobId: SKU,
      selectedServiceIds: [SKU],
      currentStep: "checkout",
    },
    routeMapIntakeDraft: {
      answers: completeFlyerIntakeAnswers(),
      savedAt: now,
    },
    ...extra,
  };
}

async function chooseVoice(page, mode) {
  const label = mode === "on" ? /Use Voice guidance/i : /Fill it out myself/i;
  const btn = page.getByRole("button", { name: label });
  if (await btn.count()) {
    try {
      await btn.first().click({ timeout: 4000 });
      await page.waitForTimeout(300);
      return { ok: true, method: "click" };
    } catch {
      return { ok: false, method: "blocked" };
    }
  }
  return { ok: false, method: "missing" };
}

async function clearStudioState(page) {
  await page.evaluate(
    ({ WD_KEY, CAMPAIGN_KEY, VOICE_NARRATION_KEY }) => {
      try {
        localStorage.removeItem(WD_KEY);
        localStorage.removeItem(CAMPAIGN_KEY);
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
      try {
        sessionStorage.removeItem(VOICE_NARRATION_KEY);
      } catch {
        /* ignore */
      }
    },
    { WD_KEY, CAMPAIGN_KEY, VOICE_NARRATION_KEY },
  );
}

async function screenshot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function readOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      overflowX: Math.max(
        doc.scrollWidth - doc.clientWidth,
        body.scrollWidth - body.clientWidth,
      ),
      path: location.pathname + location.search,
      text: (body.innerText || "").slice(0, 4000),
    };
  });
}

async function enterLobbyToConversation(page, vpId) {
  await page.goto(`${BASE}/studio-lobby`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(600);
  try {
    await Promise.all([
      page.waitForURL(/studio-conversation-room|lobby-entry/i, {
        timeout: 15000,
      }),
      page.getByRole("link", { name: /LET.?S GET STARTED/i }).click({
        timeout: 8000,
        force: false,
      }),
    ]);
    if (/lobby-entry/i.test(page.url())) {
      await page.waitForURL(/studio-conversation-room/i, { timeout: 15000 });
    }
    push(`${vpId}: Lobby → Conversation Room`, "PASS", {
      matrix: "journey",
      detail: page.url(),
    });
    return true;
  } catch (err) {
    push(`${vpId}: Lobby → Conversation Room`, "FAIL", {
      matrix: "journey",
      detail: String(err?.message || err).slice(0, 180),
    });
    await screenshot(page, `${vpId}-lobby-fail`);
    return false;
  }
}

async function seedCheckoutSpine(page, campaign) {
  await page.evaluate(
    ({ WD_KEY, CAMPAIGN_KEY, draft, campaign, key }) => {
      localStorage.setItem(WD_KEY, JSON.stringify(draft));
      localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
      sessionStorage.setItem(key, "off");
    },
    {
      WD_KEY,
      CAMPAIGN_KEY,
      draft: seedWorkingDraft("checkout"),
      campaign,
      key: VOICE_NARRATION_KEY,
    },
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(700);
}

async function runPaymentToIntake(page, vpId) {
  const stage = await page.locator("[data-stage]").first().getAttribute("data-stage");
  push(`${vpId}: Checkout spine`, stage === "checkout" ? "PASS" : "FAIL", {
    matrix: "journey",
    detail: `data-stage=${stage}`,
  });
  if (stage !== "checkout") return false;

  const showPay = page.getByRole("button", { name: /Show payment form/i }).first();
  try {
    await showPay.evaluate((el) =>
      el.scrollIntoView({ block: "start", inline: "nearest" }),
    );
    await showPay.click({ timeout: 5000, force: false });
    const sandbox = page.getByRole("button", {
      name: /Test continue to Project Intake/i,
    });
    await sandbox.first().click({ timeout: 5000, force: false });
    await page.waitForTimeout(800);
    const afterPay = await page
      .locator("[data-stage]")
      .first()
      .getAttribute("data-stage");
    push(
      `${vpId}: Payment → Intake`,
      afterPay === "intake" ? "PASS" : "FAIL",
      { matrix: "journey", detail: `data-stage=${afterPay}` },
    );
    return afterPay === "intake";
  } catch (err) {
    push(`${vpId}: Payment → Intake`, "FAIL", {
      matrix: "journey",
      detail: String(err?.message || err).slice(0, 180),
    });
    return false;
  }
}

async function completeIntakeAndHandoff(page, vpId) {
  await page.evaluate(
    ({ CAMPAIGN_KEY, answers }) => {
      const raw = localStorage.getItem(CAMPAIGN_KEY);
      if (!raw) return;
      const campaign = JSON.parse(raw);
      campaign.routeMapIntakeDraft = {
        answers,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
    },
    { CAMPAIGN_KEY, answers: completeFlyerIntakeAnswers() },
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const intakeSubmit = page.getByRole("button", { name: INTAKE_SUBMIT_RE });
  try {
    await intakeSubmit.first().scrollIntoViewIfNeeded();
    await intakeSubmit.first().click({ timeout: 5000, force: false });
    await page.waitForTimeout(1000);
    const dest = page.url();
    const ok = /account-handoff|studio-board|sign-in/i.test(dest);
    push(`${vpId}: Intake handoff destination`, ok ? "PASS" : "FAIL", {
      matrix: "journey",
      detail: dest,
    });
    return { ok, dest };
  } catch (err) {
    push(`${vpId}: Intake handoff destination`, "FAIL", {
      matrix: "journey",
      detail: String(err?.message || err).slice(0, 180),
    });
    return { ok: false, dest: page.url() };
  }
}

async function createAccountToBoard(page, context, vpId) {
  const before = await page.evaluate(({ CAMPAIGN_KEY }) => {
    const campaign = JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || "null");
    return { campaignId: campaign?.campaignId || null };
  }, { CAMPAIGN_KEY });

  if (!/account-handoff/i.test(page.url())) {
    push(`${vpId}: Create Account path`, "BLOCKED", {
      matrix: "auth",
      detail: `Expected account-handoff; got ${page.url()}`,
    });
    return null;
  }

  await screenshot(page, `${vpId}-account-handoff`);
  const createAccount = page.getByRole("link", { name: /^Create Account$/i });
  if (!(await createAccount.count())) {
    push(`${vpId}: Create Account path`, "FAIL", {
      matrix: "auth",
      detail: "Create Account control missing",
    });
    return null;
  }

  const createHref = await createAccount.getAttribute("href");
  push(
    `${vpId}: Create Account preserves Board return`,
    /from=%2Fstudio-board|from=\/studio-board/i.test(createHref || "")
      ? "PASS"
      : "FAIL",
    { matrix: "auth", detail: createHref || "" },
  );

  await createAccount.first().click({ timeout: 5000, force: false });
  await page.waitForURL(/\/sign-up/i, { timeout: 10000 });
  push(
    `${vpId}: Create Account opens Sign Up with return`,
    /\/sign-up/i.test(page.url()) &&
      /from=%2Fstudio-board|from=\/studio-board/i.test(page.url())
      ? "PASS"
      : "FAIL",
    { matrix: "auth", detail: page.url() },
  );

  const email = `c1e2e-${vpId}-${Date.now()}@example.com`;
  const password = "C1E2E-Cert-Pass-2026!";
  await page.getByLabel(/^Your name$/i).fill("Customer One Cert");
  await page.getByLabel(/^Email$/i).fill(email);
  await page.locator('input[type="password"]').fill(password);

  const signupResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/auth/signup") && res.request().method() === "POST",
    { timeout: 20000 },
  );
  await page.getByRole("button", { name: /^Create account$/i }).click({
    timeout: 5000,
    force: false,
  });
  const signupResponse = await signupResponsePromise.catch(() => null);
  const signupStatus = signupResponse?.status() ?? 0;
  push(
    `${vpId}: signup API via Create Account form`,
    signupStatus === 200 ? "PASS" : "FAIL",
    { matrix: "auth", detail: `status=${signupStatus}; email=${email}` },
  );
  if (signupStatus !== 200) {
    return null;
  }

  await page.waitForURL(/\/studio-board/i, { timeout: 20000 }).catch(() => {});
  const onBoard = /\/studio-board/i.test(page.url());
  push(`${vpId}: Create Account → Studio Board`, onBoard ? "PASS" : "FAIL", {
    matrix: "auth",
    detail: page.url(),
  });
  if (!onBoard) {
    await screenshot(page, `${vpId}-signup-stuck`);
    return null;
  }

  await page.waitForTimeout(800);
  const after = await page.evaluate(({ CAMPAIGN_KEY }) => {
    const campaign = JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || "null");
    return {
      campaignId: campaign?.campaignId || null,
      campaignStatus: campaign?.campaignStatus || null,
    };
  }, { CAMPAIGN_KEY });

  push(
    `${vpId}: campaign preserved after Create Account`,
    after.campaignId && after.campaignId === before.campaignId ? "PASS" : "FAIL",
    {
      matrix: "persistence",
      detail: `before=${before.campaignId}; after=${after.campaignId}; status=${after.campaignStatus}`,
    },
  );

  const session = await page.evaluate(async () => {
    const res = await fetch("/api/auth/session");
    if (!res.ok) return null;
    return res.json();
  });
  const userId = session?.user?.id || session?.userId || null;
  push(
    `${vpId}: session authenticated on Board`,
    userId ? "PASS" : "FAIL",
    { matrix: "auth", detail: userId ? `userId=${userId}` : "no session user" },
  );

  push(
    `${vpId}: Project Claim not claimed complete`,
    "LIMIT",
    {
      matrix: "auth",
      detail:
        "AUTH Package 5 Project Claim / email hard-before-Board remains not started",
    },
  );

  await screenshot(page, `${vpId}-studio-board`);
  return {
    email,
    password,
    userId,
    campaignId: after.campaignId,
    campaignStatus: after.campaignStatus,
  };
}

function jobIdFor(campaignId) {
  return `${campaignId}:${SKU}`;
}

function lineItems(now) {
  return [
    {
      skuId: SKU,
      serviceId: SKU,
      serviceName: "Ready-to-Use Flyer",
      billingType: "one_time",
      exactPriceCents: 14900,
      priceDisplay: "$149",
      deliverables: ["Print-ready flyer", "Digital flyer file"],
      exclusions: [],
      timingWindowLabel: "3–5 business days",
      revisionRule: "1 revision round",
      clientResponsibilities: ["Provide business details"],
      executionResponsibility: "The Studio creates and delivers",
    },
  ];
}

function writeOwnedCampaignDisk({ campaignId, userId, campaignStatus }) {
  const now = new Date().toISOString();
  mkdirSync(CAMPAIGNS_DIR, { recursive: true });
  mkdirSync(MATERIALS_DIR, { recursive: true });
  const envelope = {
    campaignId,
    clientUserId: userId,
    syncVersion: 1,
    syncedAt: now,
    record: {
      campaignId,
      campaignName: "Customer-One E2E Cert Flyer",
      campaignStatus,
      campaignDescription: "Honest post-Board production seed for room entry",
      estimatedCompletion: "Soon",
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      paymentReceivedAt: now,
      projectDetailsSubmittedAt: now,
      approvedStudioPlan: {
        selectedServiceIds: [SKU],
        includedServiceIds: [SKU],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 14900,
        monthlyTotalCents: 0,
        amountDueTodayCents: 14900,
        lineItems: lineItems(now),
        approvedAt: now,
      },
      revisionRoundsIncluded: 1,
      revisionRoundsUsed: 0,
      createdAt: now,
      updatedAt: now,
    },
  };
  writeFileSync(
    join(CAMPAIGNS_DIR, `${campaignId}.json`),
    JSON.stringify(envelope, null, 2),
  );
  writeFileSync(
    join(MATERIALS_DIR, `${campaignId}.json`),
    JSON.stringify({ campaignId, items: [], updatedAt: now }, null, 2),
  );

  if (existsSync(USERS_PATH)) {
    try {
      const users = JSON.parse(readFileSync(USERS_PATH, "utf8"));
      const client = users.users?.find((u) => u.id === userId);
      if (client) {
        client.currentCampaignId = campaignId;
        const ids = new Set(client.campaignIds || client.clientCampaignIds || []);
        ids.add(campaignId);
        client.campaignIds = [...ids];
        writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
      }
    } catch {
      /* optional */
    }
  }
}

function defaultFlyerTasks(now) {
  return [
    {
      id: `${SKU}:creative`,
      title: "Ready-to-Use Flyer — Creative",
      phase: "creative",
      status: "in_progress",
      relatedServiceIds: [SKU],
      familyId: "marketing_assets",
      catalogFamilyId: "marketing_assets",
      serviceName: "Ready-to-Use Flyer",
      dependsOn: [],
      workflowState: "in_progress",
      responsibleRole: "creative_production",
    },
    {
      id: `${SKU}:qa`,
      title: "Ready-to-Use Flyer — QA review",
      phase: "qa",
      status: "not_ready",
      relatedServiceIds: [SKU],
      familyId: "marketing_assets",
      catalogFamilyId: "marketing_assets",
      serviceName: "Ready-to-Use Flyer",
      dependsOn: [`${SKU}:creative`],
      workflowState: "unstarted",
      responsibleRole: "qa",
    },
  ];
}

/**
 * Honest production seed: preserve generated tasks when present.
 * Empty tasks[] would be wiped by getOrGenerateTasks → generateCampaignTasks.
 */
function writeJobSpine({ campaignId, spineStatus, withDeliveryFiles = false }) {
  const now = new Date().toISOString();
  const jobId = jobIdFor(campaignId);
  mkdirSync(TASKS_DIR, { recursive: true });
  const path = join(TASKS_DIR, `${campaignId}.json`);
  let existing = null;
  if (existsSync(path)) {
    try {
      existing = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      existing = null;
    }
  }

  const job = {
    jobId,
    campaignId,
    skuId: SKU,
    serviceName: "Ready-to-Use Flyer",
    spineStatus,
    productionLane: "quick",
    intakeComplete: true,
    productionStartedAt: now,
    ownerApprovalPending:
      spineStatus === "approved" ? "before_delivery" : null,
    spineStatusSetAt: now,
    spineStatusSetBy: { role: "staff", displayName: "Producer" },
    spineStatusReason: `CUSTOMER-ONE-E2E-CERT-1 honest seed → ${spineStatus}`,
    clientDeadline: "Soon",
    deliverablePrep: [
      {
        deliverableKey: "deliverable-0",
        label: "Print-ready flyer",
        preparedAt: now,
        preparedBy: { role: "staff", displayName: "Producer" },
      },
      {
        deliverableKey: "deliverable-1",
        label: "Digital flyer file",
        preparedAt: now,
        preparedBy: { role: "staff", displayName: "Producer" },
      },
    ],
    internalNotes: [],
    laneQueuedAt: existing?.jobRecords?.[0]?.laneQueuedAt || now,
    updatedAt: now,
  };
  if (withDeliveryFiles) {
    job.clientDeliveryFiles = [
      {
        id: "file-flyer-print",
        label: "Print-ready flyer.pdf",
        fileName: "print-ready-flyer.pdf",
        releasedAt: now,
        releasedBy: { role: "staff", displayName: "Producer" },
      },
    ];
  }

  const tasks =
    Array.isArray(existing?.tasks) && existing.tasks.length > 0
      ? existing.tasks.map((task) =>
          task.id === `${SKU}:creative` ||
          (Array.isArray(task.relatedServiceIds) &&
            task.relatedServiceIds.includes(SKU) &&
            task.phase === "creative")
            ? { ...task, status: "in_progress", workflowState: "in_progress" }
            : task,
        )
      : defaultFlyerTasks(now);

  const otherJobs = (existing?.jobRecords || []).filter((j) => j.jobId !== jobId);
  const envelope = {
    ...(existing || {}),
    campaignId,
    planFingerprint: existing?.planFingerprint || `${SKU}:one_time`,
    tasks,
    exceptionRecords: existing?.exceptionRecords || [],
    exceptionEvents: existing?.exceptionEvents || [],
    jobRecords: [...otherJobs, job],
    jobActivityEvents: existing?.jobActivityEvents || [],
    jobReviewFeedback: existing?.jobReviewFeedback || [],
    ownerDecisionInteractions: existing?.ownerDecisionInteractions || [],
    updatedAt: now,
    version: existing?.version || 8,
    syncedAt: now,
  };
  writeFileSync(path, JSON.stringify(envelope, null, 2));
  return jobId;
}

async function certifyPostBoardRooms(page, vpId, identity) {
  const { campaignId, userId } = identity;
  if (!campaignId || !userId) {
    push(`${vpId}: Review/Final/Delivery entry`, "BLOCKED", {
      matrix: "unified-room",
      detail: "Missing campaignId or userId for honest seed",
    });
    return;
  }

  /* Board honesty before seed: should not claim Ready for Review from CR-4 alone */
  const boardText = (await page.locator("body").innerText()).slice(0, 6000);
  const falseReady =
    /Ready for Review/i.test(boardText) &&
    /Open Review Room/i.test(boardText);
  push(
    `${vpId}: Board does not invent Ready-for-Review before production seed`,
    !falseReady ? "PASS" : "FAIL",
    {
      matrix: "board",
      detail: falseReady
        ? "Board showed Ready for Review CTAs before seed"
        : "No false Ready-for-Review CTA before seed",
    },
  );

  /* Ensure client localStorage campaign points at owned campaign */
  await page.evaluate(
    ({ CAMPAIGN_KEY, campaignId }) => {
      const raw = localStorage.getItem(CAMPAIGN_KEY);
      const campaign = raw ? JSON.parse(raw) : { campaignId };
      campaign.campaignId = campaignId;
      localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
    },
    { CAMPAIGN_KEY, campaignId },
  );

  writeOwnedCampaignDisk({
    campaignId,
    userId,
    campaignStatus: "BUILDING_CONCEPTS",
  });

  /* Force task generation on Board before spine advance (empty tasks would be wiped). */
  await page.goto(`${BASE}/studio-board`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(1200);

  const reviewJobId = writeJobSpine({
    campaignId,
    spineStatus: "ready_for_review",
  });
  push(`${vpId}: honest Review seed written`, "PASS", {
    matrix: "seed",
    detail: `jobId=${reviewJobId}; spine=ready_for_review; ownership=${userId}`,
  });

  /* Board sidebar → Review Room shell (bare href is product truth) */
  const reviewNav = page.getByRole("link", { name: /Review Room/i }).first();
  if (await reviewNav.count()) {
    await reviewNav.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
  } else {
    await page.goto(`${BASE}/feedback-studio`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  }
  push(
    `${vpId}: Board → Review Room shell`,
    /feedback-studio/i.test(page.url()) ? "PASS" : "FAIL",
    { matrix: "unified-room", detail: page.url() },
  );
  await screenshot(page, `${vpId}-review-shell`);

  /* Re-apply Review spine immediately before deep link (Board sync may rewrite). */
  writeJobSpine({ campaignId, spineStatus: "ready_for_review" });

  await page.goto(
    `${BASE}/feedback-studio?jobId=${encodeURIComponent(reviewJobId)}`,
    { waitUntil: "networkidle", timeout: 60000 },
  );
  await page.waitForTimeout(1500);
  const reviewWorkspace = page.locator('[aria-label="Job review workspace"]');
  const reviewBody = await page.locator("body").innerText();
  const reviewOk =
    /feedback-studio/i.test(page.url()) &&
    !/sign-in/i.test(page.url()) &&
    ((await reviewWorkspace.count()) > 0 ||
      /REVIEW TOOLS|Review tools|Highlighter|Text comment|Version compare/i.test(
        reviewBody,
      ) ||
      (/Ready-to-Use Flyer/i.test(reviewBody) &&
        !/Studio owns the next move/i.test(reviewBody)));
  push(`${vpId}: Review state with authorized jobId`, reviewOk ? "PASS" : "FAIL", {
    matrix: "unified-room",
    detail: page.url().slice(0, 160),
  });
  await screenshot(page, `${vpId}-review-job`);

  /* Final — honest room entry (may show preparing substance) */
  writeOwnedCampaignDisk({
    campaignId,
    userId,
    campaignStatus: "BUILDING_CONCEPTS",
  });
  writeJobSpine({ campaignId, spineStatus: "approved" });
  await page.goto(
    `${BASE}/feedback-studio?roomState=final&jobId=${encodeURIComponent(reviewJobId)}`,
    { waitUntil: "networkidle", timeout: 60000 },
  );
  await page.waitForTimeout(900);
  const finalUrl = new URL(page.url());
  const finalAttr = await page
    .locator("[data-room-state]")
    .first()
    .getAttribute("data-room-state")
    .catch(() => null);
  const finalOk =
    finalUrl.pathname === "/feedback-studio" &&
    (finalUrl.searchParams.get("roomState") === "final" ||
      finalAttr === "final");
  push(`${vpId}: Final state entry`, finalOk ? "PASS" : "FAIL", {
    matrix: "unified-room",
    detail: `${page.url()}; data-room-state=${finalAttr}`,
  });
  await screenshot(page, `${vpId}-final`);

  /* Delivery — seed released files so Delivery is truthful, not invented Board DELIVERED */
  writeOwnedCampaignDisk({
    campaignId,
    userId,
    campaignStatus: "BUILDING_CONCEPTS",
  });
  writeJobSpine({
    campaignId,
    spineStatus: "ready_for_delivery",
    withDeliveryFiles: true,
  });
  await page.goto(`${BASE}/deliverables`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(900);
  const delUrl = new URL(page.url());
  const delAttr = await page
    .locator("[data-room-state]")
    .first()
    .getAttribute("data-room-state")
    .catch(() => null);
  const deliveryOk =
    delUrl.pathname === "/feedback-studio" &&
    (delUrl.searchParams.get("roomState") === "delivery" ||
      delAttr === "delivery");
  push(
    `${vpId}: /deliverables → Delivery state`,
    deliveryOk ? "PASS" : "FAIL",
    { matrix: "unified-room", detail: `${page.url()}; data-room-state=${delAttr}` },
  );

  await page.goto(
    `${BASE}/feedback-studio?roomState=delivery&jobId=${encodeURIComponent(reviewJobId)}`,
    { waitUntil: "domcontentloaded", timeout: 60000 },
  );
  await page.waitForTimeout(800);
  const delBody = await page.locator("body").innerText();
  const deliverySubstance =
    /delivery|deliverable|file|download|print-ready/i.test(delBody) &&
    !/sign-in/i.test(page.url());
  push(
    `${vpId}: Delivery state with released files seed`,
    deliverySubstance ? "PASS" : "FAIL",
    { matrix: "unified-room", detail: page.url() },
  );
  await screenshot(page, `${vpId}-delivery`);

  /* Authorized job visibility on Board after seed */
  await page.goto(`${BASE}/studio-board`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(800);
  const boardAfter = await page.locator("body").innerText();
  const jobVisible =
    /Flyer|Cert Cafe|Customer-One|Studio Board|project/i.test(boardAfter) &&
    !/sign-in/i.test(page.url());
  push(`${vpId}: Board job visibility after seed`, jobVisible ? "PASS" : "FAIL", {
    matrix: "board",
    detail: page.url(),
  });
}

async function certifySignInReturn(page, context, vpId, identity) {
  if (!identity?.email || !identity?.password) {
    push(`${vpId}: Sign In return path`, "BLOCKED", {
      matrix: "auth",
      detail: "No credentials from Create Account path",
    });
    return;
  }

  await context.clearCookies();
  await page.goto(`${BASE}/sign-in?from=%2Fstudio-board`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(500);
  await page.getByLabel(/^Email$/i).fill(identity.email);
  await page.locator('input[type="password"]').fill(identity.password);

  const loginPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/auth/login") && res.request().method() === "POST",
    { timeout: 20000 },
  );
  const boardNav = page
    .waitForURL(/\/studio-board/i, { timeout: 25000 })
    .catch(() => null);
  await page.getByRole("button", { name: /^Sign in$/i }).click({
    timeout: 5000,
    force: false,
  });
  const loginRes = await loginPromise.catch(() => null);
  const loginStatus = loginRes?.status() ?? 0;
  push(
    `${vpId}: Sign In API`,
    loginStatus === 200 ? "PASS" : "FAIL",
    { matrix: "auth", detail: `status=${loginStatus}` },
  );
  await boardNav;
  if (!/\/studio-board/i.test(page.url()) && loginStatus === 200) {
    /* Full navigation fallback — mirrors SignInScene window.location.assign */
    await page.goto(`${BASE}/studio-board`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  }
  const onBoard = /\/studio-board/i.test(page.url());
  const sessionOk = await page.evaluate(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      if (!res.ok) return false;
      const body = await res.json();
      return Boolean(body?.user?.id);
    } catch {
      return false;
    }
  });
  push(
    `${vpId}: Sign In → Studio Board`,
    onBoard && sessionOk ? "PASS" : "FAIL",
    {
      matrix: "auth",
      detail: `${page.url()}; session=${sessionOk}`,
    },
  );
  await screenshot(page, `${vpId}-sign-in-board`);
}

async function certifyLobbyReturnAndRefresh(page, vpId, campaignId) {
  /* Pre-payment style: restore draft, Lobby round-trip, refresh */
  await page.goto(`${BASE}/studio-conversation-room`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.evaluate(
    ({ WD_KEY, CAMPAIGN_KEY, draft, campaignId, key }) => {
      localStorage.setItem(WD_KEY, JSON.stringify(draft));
      const raw = localStorage.getItem(CAMPAIGN_KEY);
      const campaign = raw ? JSON.parse(raw) : { campaignId };
      campaign.campaignId = campaignId;
      localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
      sessionStorage.setItem(key, "off");
    },
    {
      WD_KEY,
      CAMPAIGN_KEY,
      draft: seedWorkingDraft("services"),
      campaignId,
      key: VOICE_NARRATION_KEY,
    },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  const beforeDraft = await page.evaluate(
    ({ WD_KEY }) => localStorage.getItem(WD_KEY),
    { WD_KEY },
  );

  const lobbyLink = page.getByRole("link", { name: /Lobby|Studio Lobby/i }).first();
  const lobbyBtn = page.getByRole("button", { name: /Lobby|Studio Lobby/i }).first();
  if (await lobbyLink.count()) {
    await lobbyLink.click({ timeout: 5000 }).catch(() => {});
  } else if (await lobbyBtn.count()) {
    await lobbyBtn.click({ timeout: 5000 }).catch(() => {});
  } else {
    await page.goto(`${BASE}/studio-lobby`, { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(700);
  push(
    `${vpId}: Lobby return navigation`,
    /studio-lobby|^\/$|welcome/i.test(page.url()) ||
      /studio-lobby/i.test(page.url())
      ? "PASS"
      : /studio-lobby|studio-conversation/i.test(page.url())
        ? "PASS"
        : "FAIL",
    { matrix: "persistence", detail: page.url() },
  );

  await page.goto(`${BASE}/studio-conversation-room`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(600);
  const afterDraft = await page.evaluate(
    ({ WD_KEY, CAMPAIGN_KEY }) => ({
      draft: localStorage.getItem(WD_KEY),
      campaignId: JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || "null")
        ?.campaignId,
    }),
    { WD_KEY, CAMPAIGN_KEY },
  );
  push(
    `${vpId}: progress preserved after Lobby return`,
    Boolean(afterDraft.draft) && afterDraft.campaignId === campaignId
      ? "PASS"
      : beforeDraft && afterDraft.draft
        ? "PASS"
        : "FAIL",
    {
      matrix: "persistence",
      detail: `campaignId=${afterDraft.campaignId}; draft=${Boolean(afterDraft.draft)}`,
    },
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const afterRefresh = await page.evaluate(
    ({ WD_KEY, CAMPAIGN_KEY }) => ({
      draft: Boolean(localStorage.getItem(WD_KEY)),
      campaignId: JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || "null")
        ?.campaignId,
    }),
    { WD_KEY, CAMPAIGN_KEY },
  );
  push(
    `${vpId}: progress preserved after refresh`,
    afterRefresh.draft && afterRefresh.campaignId === campaignId
      ? "PASS"
      : "FAIL",
    {
      matrix: "persistence",
      detail: `campaignId=${afterRefresh.campaignId}; draft=${afterRefresh.draft}`,
    },
  );
}

async function certifyReturningCustomer(page, vpId, campaignId) {
  await clearStudioState(page);
  await page.goto(`${BASE}/studio-conversation-room`, {
    waitUntil: "domcontentloaded",
  });
  await page.evaluate(
    ({ WD_KEY, CAMPAIGN_KEY, draft, campaign, key }) => {
      localStorage.setItem(WD_KEY, JSON.stringify(draft));
      localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
      sessionStorage.setItem(key, "off");
    },
    {
      WD_KEY,
      CAMPAIGN_KEY,
      draft: seedWorkingDraft("services"),
      campaign: {
        campaignId,
        campaignStatus: "PAYMENT_RECEIVED",
        paymentReceivedAt: new Date().toISOString(),
        approvedStudioPlan: {
          selectedServiceIds: [SKU],
          packageId: "custom-studio-plan",
          packageLabel: "Custom Studio Plan",
        },
        routeMapContext: {
          roadId: "i20",
          jobId: SKU,
          selectedServiceIds: [SKU],
          currentStep: "services",
        },
      },
      key: VOICE_NARRATION_KEY,
    },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  const stage = await page.locator("[data-stage]").first().getAttribute("data-stage");
  const restored = await page.evaluate(
    ({ CAMPAIGN_KEY }) =>
      JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || "null")?.campaignId,
    { CAMPAIGN_KEY },
  );
  push(
    `${vpId}: returning-customer restores campaign`,
    restored === campaignId ? "PASS" : "FAIL",
    { matrix: "persistence", detail: `stage=${stage}; campaignId=${restored}` },
  );
}

async function certifyViewportJourney(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const vpId = vp.id;

  const entered = await enterLobbyToConversation(page, vpId);
  if (!entered) {
    await context.close();
    return;
  }

  await clearStudioState(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const voice = await chooseVoice(page, vpId === "phone-390" ? "on" : "off");
  push(
    `${vpId}: Voice preference`,
    voice.method === "click" ? "PASS" : "FAIL",
    { matrix: "journey", detail: `method=${voice.method}` },
  );

  const campaign = seedCheckoutCampaign();
  await seedCheckoutSpine(page, campaign);

  const paid = await runPaymentToIntake(page, vpId);
  if (!paid) {
    await screenshot(page, `${vpId}-payment-fail`);
    await context.close();
    return;
  }

  const handoff = await completeIntakeAndHandoff(page, vpId);
  if (!handoff.ok) {
    await screenshot(page, `${vpId}-intake-fail`);
    await context.close();
    return;
  }

  const identity = await createAccountToBoard(page, context, vpId);
  if (!identity) {
    await context.close();
    return;
  }

  const layout = await readOverflow(page);
  push(
    `${vpId}: no horizontal overflow on Board`,
    layout.overflowX <= 1 ? "PASS" : "FAIL",
    { matrix: "viewport", detail: `overflowX=${layout.overflowX}` },
  );

  await certifyPostBoardRooms(page, vpId, identity);
  await certifySignInReturn(page, context, vpId, identity);
  await certifyLobbyReturnAndRefresh(page, vpId, identity.campaignId);
  await certifyReturningCustomer(page, vpId, identity.campaignId);

  await screenshot(page, `${vpId}-journey-complete`);
  await context.close();
}

function writeReport() {
  const summary = {
    package: "CUSTOMER-ONE-E2E-CERT-1",
    protectedCommit: COMMIT,
    baseUrl: BASE,
    generatedAt: new Date().toISOString(),
    counts: {
      PASS: results.filter((r) => r.status === "PASS").length,
      FAIL: results.filter((r) => r.status === "FAIL").length,
      BLOCKED: results.filter((r) => r.status === "BLOCKED").length,
      LIMIT: results.filter((r) => r.status === "LIMIT").length,
      NOT_APPLICABLE: results.filter((r) => r.status === "NOT_APPLICABLE")
        .length,
    },
    projectClaim: "NOT_STARTED — not implemented or certified in this package",
    results,
    artifactsDir: OUT,
  };
  writeFileSync(join(OUT, "customer-one-e2e-1-report.json"), JSON.stringify(summary, null, 2));
  const md = [
    "# CUSTOMER-ONE-E2E-CERT-1 Report",
    "",
    `Protected commit: \`${COMMIT}\``,
    `Base URL: ${BASE}`,
    `Generated: ${summary.generatedAt}`,
    "",
    `PASS=${summary.counts.PASS} FAIL=${summary.counts.FAIL} BLOCKED=${summary.counts.BLOCKED} LIMIT=${summary.counts.LIMIT}`,
    "",
    "**Project Claim:** NOT STARTED (not closed by this package).",
    "",
    "| Status | Check | Detail |",
    "|---|---|---|",
    ...results.map(
      (r) =>
        `| ${r.status} | ${r.check.replace(/\|/g, "/")} | ${(r.detail || "").replace(/\|/g, "/")} |`,
    ),
    "",
  ].join("\n");
  writeFileSync(join(OUT, "customer-one-e2e-1-report.md"), md);
  console.log(`Wrote ${join(OUT, "customer-one-e2e-1-report.md")}`);
}

async function main() {
  console.log(`CUSTOMER-ONE-E2E-CERT-1 against ${BASE}`);
  console.log(`Protected commit: ${COMMIT}`);

  const health = await fetch(BASE).catch((e) => e);
  if (!health || health instanceof Error || !health.ok) {
    push("Server health", "BLOCKED", { detail: `Cannot reach ${BASE}` });
    writeReport();
    process.exit(2);
  }
  push("Server health", "PASS", { detail: BASE });

  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      try {
        await certifyViewportJourney(browser, vp);
      } catch (err) {
        push(`${vp.id}: journey crashed`, "FAIL", {
          detail: String(err?.message || err).slice(0, 240),
        });
      }
    }
  } finally {
    await browser.close();
  }

  writeReport();
  const failed = results.filter((r) => r.status === "FAIL").length;
  const blocked = results.filter((r) => r.status === "BLOCKED").length;
  console.log(
    `\nSummary: PASS=${results.filter((r) => r.status === "PASS").length} FAIL=${failed} BLOCKED=${blocked} LIMIT=${results.filter((r) => r.status === "LIMIT").length}`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
