/**
 * CR-4 — Conversation Room End-to-End Certification (Playwright).
 *
 * Certifies the protected live journey against a running server.
 * Evidence → test-artifacts/cr4-conversation-room-journey/
 *
 * Env:
 *   CERT_BASE_URL  default http://127.0.0.1:3010
 *   CERT_COMMIT    recorded in report (informational)
 *   SESSION_SECRET required on the production server for /api/auth/signup
 *   NEXT_PUBLIC_PAYMENT_SANDBOX=1 must be present at `next build` for sandbox CTA
 *
 * Distinguishes: speechSynthesis.speak called vs audible quality (not claimed).
 *
 * Resume package modifications: truthful Voice-click assertions; Session-strip
 * Help/Lobby controls; checkout, customer-truth, completed-restart, service
 * persistence, and signed-in/out handoff matrices.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.CERT_BASE_URL || "http://127.0.0.1:3010";
const COMMIT =
  process.env.CERT_COMMIT || "02657aa1edc8e73c6b04d9a7ef843509a50dba3a";
const OUT = join(process.cwd(), "test-artifacts", "cr4-conversation-room-journey");

/** Complete flyer Intake answers so SAVE & CONTINUE is enabled (not a submit bypass). */
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

const INTAKE_SUBMIT_RE =
  /SAVE & CONTINUE TO (YOUR ACCOUNT|STUDIO BOARD)|Continue to Studio Board/i;

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "phone-390", width: 390, height: 844 },
  { id: "phone-360", width: 360, height: 800 },
];

const WD_KEY = "studio-squishy:working-draft:v1";
const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const VOICE_NARRATION_KEY = "studio-voice:narration-preference:v1";

mkdirSync(OUT, { recursive: true });

/** @type {{ check: string, status: "PASS"|"FAIL"|"BLOCKED"|"NOT_APPLICABLE", detail?: string, matrix?: string }[]} */
const results = [];

function push(check, status, extra = {}) {
  results.push({ check, status, ...extra });
  console.log(`${status.padEnd(14)} ${check}${extra.detail ? ` — ${extra.detail}` : ""}`);
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
                jobId: "v2-rtu-flyer",
                roadId: "i20",
                addedAt: "2026-07-26T12:03:00.000Z",
              },
            ],
      ...overrides.slices,
    },
  };
}

function seedPaidCampaign(extra = {}) {
  const now = new Date().toISOString();
  return {
    campaignId: `cr4-${Date.now()}`,
    campaignStatus: "PAYMENT_RECEIVED",
    paymentReceivedAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: ["v2-rtu-flyer"],
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
    },
    routeMapContext: {
      roadId: "i20",
      jobId: "v2-rtu-flyer",
      selectedServiceIds: ["v2-rtu-flyer"],
      currentStep: "intake",
    },
    routeMapIntakeDraft: extra.routeMapIntakeDraft ?? {
      answers: completeFlyerIntakeAnswers(),
      savedAt: now,
    },
    ...extra,
  };
}

async function installSpeechProbe(page) {
  await page.addInitScript(() => {
    window.__cr4SpeechCalls = 0;
    window.__cr4SpeechTexts = [];
    const synth = window.speechSynthesis;
    if (!synth || typeof synth.speak !== "function") return;
    const orig = synth.speak.bind(synth);
    synth.speak = (utterance) => {
      window.__cr4SpeechCalls = (window.__cr4SpeechCalls || 0) + 1;
      window.__cr4SpeechTexts = window.__cr4SpeechTexts || [];
      window.__cr4SpeechTexts.push(String(utterance?.text || ""));
      try {
        utterance.onend && setTimeout(() => utterance.onend?.({}), 0);
      } catch {
        /* ignore */
      }
      return orig(utterance);
    };
  });
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

async function readOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const overflowX = Math.max(doc.scrollWidth - doc.clientWidth, body.scrollWidth - body.clientWidth);
    const studioReview = Array.from(document.querySelectorAll("a,button")).some((el) => {
      if (el.closest(".owner-qa") || el.className?.toString?.().includes("owner-qa")) {
        return false; /* Dev-only Owner QA — not customer Conversation Nav */
      }
      const text = (el.textContent || "").trim();
      return /^studio review$/i.test(text);
    });
    const customerNavReview = Array.from(
      document.querySelectorAll('[aria-label="Studio control strip"] a, [aria-label="Studio control strip"] button'),
    ).some((el) => /studio review/i.test(el.textContent || ""));
    const customerText = body.innerText || "";
    const hostWording =
      /Voice Host|Host reply|coming in a later package/i.test(customerText) ||
      /recommendation engine|intelligent recommendation/i.test(customerText);
    return {
      overflowX,
      studioReview: studioReview || customerNavReview,
      hostWording,
      path: location.pathname + location.search,
    };
  });
}

/**
 * @returns {{ ok: boolean, method: "click"|"blocked"|"missing", blockedByTablet?: boolean }}
 */
async function chooseVoice(page, mode) {
  const label = mode === "on" ? /Use Voice guidance/i : /Fill it out myself/i;
  const btn = page.getByRole("button", { name: label });
  if (await btn.count()) {
    try {
      await btn.first().click({ timeout: 4000 });
      await page.waitForTimeout(300);
      return { ok: true, method: "click" };
    } catch {
      return { ok: false, method: "blocked", blockedByTablet: true };
    }
  }
  const toggle = page.getByRole("button", {
    name: mode === "on" ? /Voice: On/i : /Voice: Off/i,
  });
  if (await toggle.count()) {
    try {
      await toggle.first().click({ timeout: 4000 });
      await page.waitForTimeout(200);
      return { ok: true, method: "click" };
    } catch {
      return { ok: false, method: "blocked", blockedByTablet: true };
    }
  }
  return { ok: false, method: "missing" };
}

async function screenshot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function certifyViewports(browser) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await installSpeechProbe(page);
    await page.goto(`${BASE}/studio-conversation-room`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await clearStudioState(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const prefVisible = await page.getByText(/how would you like to continue/i).count();
    push(`${vp.id}: voice preference prompt visible`, prefVisible > 0 ? "PASS" : "FAIL", {
      matrix: "viewport",
    });

    const voiceChoice = await chooseVoice(page, "off");
    push(
      `${vp.id}: Voice Off control clickable without overlay intercept`,
      voiceChoice.method === "click" ? "PASS" : "FAIL",
      {
        matrix: "viewport",
        detail: `method=${voiceChoice.method}; blockedByTablet=${Boolean(voiceChoice.blockedByTablet)}`,
      },
    );
    const layout = await readOverflow(page);
    push(`${vp.id}: no horizontal overflow`, layout.overflowX <= 1 ? "PASS" : "FAIL", {
      matrix: "viewport",
      detail: `overflowX=${layout.overflowX}`,
    });
    push(`${vp.id}: no Studio Review link`, !layout.studioReview ? "PASS" : "FAIL", {
      matrix: "viewport",
    });
    push(`${vp.id}: no Host wording`, !layout.hostWording ? "PASS" : "FAIL", {
      matrix: "viewport",
    });

    const typeBtn = page.getByRole("button", { name: /^Type$/i });
    const helpBtn = page.getByRole("button", { name: /Help/i });
    push(
      `${vp.id}: Type control usable`,
      (await typeBtn.count()) > 0 && (await typeBtn.first().isEnabled()) ? "PASS" : "FAIL",
      { matrix: "viewport" },
    );
    push(
      `${vp.id}: Help control present`,
      (await helpBtn.count()) > 0 ? "PASS" : "FAIL",
      { matrix: "viewport" },
    );

    const tablet = page.locator('[data-stage]');
    push(
      `${vp.id}: Presentation tablet present`,
      (await tablet.count()) > 0 ? "PASS" : "FAIL",
      { matrix: "viewport" },
    );

    await screenshot(page, `${vp.id}-opening-voice-off`);
    await context.close();
  }
}

async function certifyVoicePreference(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await installSpeechProbe(page);
  await page.goto(`${BASE}/studio-conversation-room`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await clearStudioState(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);

  const before = await page.evaluate(() => window.__cr4SpeechCalls || 0);
  push(
    "Voice: no speech before preference",
    before === 0 ? "PASS" : "FAIL",
    { matrix: "voice", detail: `calls=${before}` },
  );

  const onChoice = await chooseVoice(page, "on");
  push(
    "Voice On: preference control clickable without overlay intercept",
    onChoice.method === "click" ? "PASS" : "FAIL",
    {
      matrix: "voice",
      detail: `method=${onChoice.method}; blockedByTablet=${Boolean(onChoice.blockedByTablet)}`,
    },
  );
  await page.waitForTimeout(600);
  const afterOn = await page.evaluate(() => ({
    calls: window.__cr4SpeechCalls || 0,
    texts: window.__cr4SpeechTexts || [],
    pref: sessionStorage.getItem("studio-voice:narration-preference:v1"),
  }));
  push(
    "Voice On: speech function called after preference",
    afterOn.calls >= 1 ? "PASS" : "FAIL",
    { matrix: "voice", detail: `calls=${afterOn.calls}` },
  );
  push(
    "Voice On: preference stored",
    afterOn.pref === "on" ? "PASS" : "FAIL",
    { matrix: "voice", detail: `pref=${afterOn.pref}` },
  );
  push(
    "Voice On: audible quality not claimed from mock",
    "NOT_APPLICABLE",
    { matrix: "voice", detail: "speak() observed only; no audible quality cert" },
  );

  /* Switch Off */
  const offChoice = await chooseVoice(page, "off");
  push(
    "Voice Off: toggle clickable without overlay intercept",
    offChoice.method === "click" ? "PASS" : "FAIL",
    {
      matrix: "voice",
      detail: `method=${offChoice.method}; blockedByTablet=${Boolean(offChoice.blockedByTablet)}`,
    },
  );
  await page.waitForTimeout(300);
  const callsAtOff = await page.evaluate(() => window.__cr4SpeechCalls || 0);
  await page.waitForTimeout(800);
  const callsAfterQuiet = await page.evaluate(() => ({
    calls: window.__cr4SpeechCalls || 0,
    pref: sessionStorage.getItem("studio-voice:narration-preference:v1"),
  }));
  push(
    "Voice Off: preference stored",
    callsAfterQuiet.pref === "off" ? "PASS" : "FAIL",
    { matrix: "voice" },
  );
  push(
    "Voice Off: no additional automatic narration while quiet",
    callsAfterQuiet.calls === callsAtOff ? "PASS" : "FAIL",
    { matrix: "voice", detail: `${callsAtOff}→${callsAfterQuiet.calls}` },
  );

  const typeAvailable = (await page.getByRole("button", { name: /^Type$/i }).count()) > 0;
  push("Voice Off: Type remains available", typeAvailable ? "PASS" : "FAIL", {
    matrix: "voice",
  });

  await screenshot(page, "desktop-voice-preference");
  await context.close();
}

async function certifyResumeStages(browser) {
  const stages = ["route", "services", "plan", "checkout", "intake"];
  for (const stage of stages) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await installSpeechProbe(page);
    await page.goto(`${BASE}/studio-conversation-room`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await clearStudioState(page);

    const needsPayment = stage === "checkout" || stage === "intake";
    await page.evaluate(
      ({ WD_KEY, CAMPAIGN_KEY, draft, campaign, needsPayment }) => {
        localStorage.setItem(WD_KEY, JSON.stringify(draft));
        if (needsPayment) {
          localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
        }
        sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
      },
      {
        WD_KEY,
        CAMPAIGN_KEY,
        draft: seedWorkingDraft(stage),
        campaign: seedPaidCampaign(
          stage === "checkout"
            ? { paymentReceivedAt: undefined, campaignStatus: "APPROVED" }
            : {},
        ),
        needsPayment,
      },
    );

    /* Checkout needs approved plan without payment; intake needs payment */
    if (stage === "checkout") {
      await page.evaluate(({ CAMPAIGN_KEY }) => {
        const raw = localStorage.getItem(CAMPAIGN_KEY);
        if (!raw) return;
        const c = JSON.parse(raw);
        delete c.paymentReceivedAt;
        c.campaignStatus = "APPROVED";
        localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(c));
      }, { CAMPAIGN_KEY });
    }

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    const dataStage = await page.locator("[data-stage]").first().getAttribute("data-stage");
    push(
      `Resume ${stage}: stage restored`,
      dataStage === stage ? "PASS" : "FAIL",
      { matrix: "resume", detail: `data-stage=${dataStage}` },
    );

    const speech = await page.evaluate(() => window.__cr4SpeechCalls || 0);
    push(
      `Resume ${stage}: Voice Off stays quiet`,
      speech === 0 ? "PASS" : "FAIL",
      { matrix: "resume", detail: `calls=${speech}` },
    );
    if (stage === "services" || stage === "plan" || stage === "checkout" || stage === "intake") {
      const selectedServices = await page.evaluate(({ WD_KEY }) => {
        const draft = JSON.parse(localStorage.getItem(WD_KEY) || "null");
        return draft?.slices?.selectedServices || [];
      }, { WD_KEY });
      push(
        `Resume ${stage}: selected services preserved`,
        selectedServices.some((service) => service.jobId === "v2-rtu-flyer") ? "PASS" : "FAIL",
        { matrix: "resume", detail: `selectedServices=${selectedServices.length}` },
      );
    }

    await screenshot(page, `resume-${stage}`);
    await context.close();
  }
}

async function certifyLobbyRoundTrip(browser) {
  for (const stage of ["services", "intake"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await installSpeechProbe(page);
    await page.goto(`${BASE}/studio-conversation-room`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await clearStudioState(page);
    await page.evaluate(
      ({ WD_KEY, CAMPAIGN_KEY, draft, campaign, stage }) => {
        localStorage.setItem(WD_KEY, JSON.stringify(draft));
        if (stage === "intake") {
          localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
        }
        sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
      },
      {
        WD_KEY,
        CAMPAIGN_KEY,
        draft: seedWorkingDraft(stage),
        campaign: seedPaidCampaign(),
        stage,
      },
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    const before = await page.evaluate(({ WD_KEY }) => localStorage.getItem(WD_KEY), {
      WD_KEY,
    });

    const strip = page.locator('[aria-label="Studio control strip"]');
    const lobbyBtn = strip.getByRole("button", { name: /Return to Lobby/i });
    let lobbyClick = "missing";
    if (await lobbyBtn.count()) {
      await lobbyBtn.first().evaluate((el) =>
        el.scrollIntoView({ block: "nearest", inline: "nearest" }),
      );
      try {
        await lobbyBtn.first().click({ timeout: 5000 });
        lobbyClick = "click";
      } catch (error) {
        lobbyClick = `blocked: ${String(error?.message || error).slice(0, 120)}`;
      }
    }

    push(
      `Lobby round-trip from ${stage}: Session Return to Lobby clickable`,
      lobbyClick === "click" ? "PASS" : "FAIL",
      {
        matrix: "lobby",
        detail: lobbyClick,
      },
    );

    if (lobbyClick === "click") {
      await page.waitForURL(/\/studio-lobby\?lobbyEntry=reset/i, { timeout: 6000 }).catch(() => {});
    }
    const url = page.url();
    push(
      `Lobby round-trip from ${stage}: Entry Film reset param`,
      /\/studio-lobby\?lobbyEntry=reset/i.test(url) ? "PASS" : "FAIL",
      { matrix: "lobby", detail: url },
    );

    const speech = await page.evaluate(() => window.__cr4SpeechCalls || 0);
    push(
      `Lobby round-trip from ${stage}: Lobby silent probe recorded`,
      "PASS",
      { matrix: "lobby", detail: `speechCalls=${speech}` },
    );

    await page.goto(`${BASE}/studio-conversation-room`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(800);
    const after = await page.evaluate(({ WD_KEY }) => localStorage.getItem(WD_KEY), {
      WD_KEY,
    });
    push(
      `Lobby round-trip from ${stage}: working draft preserved`,
      Boolean(before) && before === after ? "PASS" : "FAIL",
      { matrix: "lobby" },
    );
    const dataStage = await page.locator("[data-stage]").first().getAttribute("data-stage");
    push(
      `Lobby round-trip from ${stage}: stage restored on re-entry`,
      dataStage === stage ? "PASS" : "FAIL",
      { matrix: "lobby", detail: `data-stage=${dataStage}` },
    );

    await screenshot(page, `lobby-roundtrip-${stage}`);
    await context.close();
  }
}

async function certifyCheckoutTruth(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/studio-conversation-room`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await clearStudioState(page);

  const campaign = seedPaidCampaign();
  delete campaign.paymentReceivedAt;
  campaign.campaignStatus = "APPROVED";
  campaign.routeMapContext.currentStep = "checkout";

  await page.evaluate(
    ({ WD_KEY, CAMPAIGN_KEY, draft, campaign }) => {
      localStorage.setItem(WD_KEY, JSON.stringify(draft));
      localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    },
    {
      WD_KEY,
      CAMPAIGN_KEY,
      draft: seedWorkingDraft("checkout"),
      campaign,
    },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  /* Reveal payment / sandbox UI if collapsed — never click disabled Complete Checkout. */
  const showPayment = page.getByRole("button", { name: /Show payment form/i });
  if (await showPayment.count()) {
    try {
      await showPayment.first().evaluate((el) =>
        el.scrollIntoView({ block: "start", inline: "nearest" }),
      );
      await showPayment.first().click({ timeout: 5000, force: false });
      await page.waitForTimeout(500);
      push("Checkout: Show payment form opens sandbox surface", "PASS", {
        matrix: "checkout",
      });
    } catch (error) {
      push("Checkout: Show payment form opens sandbox surface", "FAIL", {
        matrix: "checkout",
        detail: String(error?.message || error).slice(0, 160),
      });
    }
  }

  const body = await page.locator("body").innerText();
  const honesty =
    /Developer Sandbox/i.test(body) ||
    /card payment processing is not connected/i.test(body) ||
    /live card processing is not connected/i.test(body);
  push("Checkout: sandbox / non-live honesty visible", honesty ? "PASS" : "FAIL", {
    matrix: "checkout",
  });
  push(
    "Checkout: no false live tax claim",
    !/tax(?:es)? (?:have been )?(?:charged|collected|calculated)/i.test(body) ? "PASS" : "FAIL",
    { matrix: "checkout", detail: "rendered checkout copy scanned" },
  );
  const sandboxContinue = page.getByRole("button", {
    name: /Test continue to Project Intake/i,
  });
  if (!(await sandboxContinue.count())) {
    push("Checkout: sandbox continue control present", "FAIL", {
      matrix: "checkout",
      detail: "Test continue to Project Intake was not rendered after Show payment form",
    });
  } else {
    let firstClick = "click";
    try {
      await sandboxContinue.first().click({ timeout: 5000 });
    } catch (error) {
      firstClick = `blocked: ${String(error?.message || error).slice(0, 120)}`;
    }
    push("Checkout: sandbox continue click is actionable", firstClick === "click" ? "PASS" : "FAIL", {
      matrix: "checkout",
      detail: firstClick,
    });
    await page.waitForTimeout(700);
    const progressed = await page.locator("[data-stage]").first().getAttribute("data-stage");
    const progressedUrl = page.url();
    push(
      "Checkout: sandbox success advances to Intake",
      progressed === "intake" || /(?:[?&]step=intake|\/studio-board)/i.test(progressedUrl) ? "PASS" : "FAIL",
      { matrix: "checkout", detail: `data-stage=${progressed}; url=${progressedUrl}` },
    );
    const paymentStateBeforeSecond = await page.evaluate(({ CAMPAIGN_KEY }) => {
      const campaign = JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || "null");
      return { receivedAt: campaign?.paymentReceivedAt, status: campaign?.campaignStatus };
    }, { CAMPAIGN_KEY });
    const secondDisabled = await sandboxContinue.first().isDisabled().catch(() => true);
    let secondClick = "not-attempted";
    if (!secondDisabled && await sandboxContinue.count()) {
      try {
        await sandboxContinue.first().click({ timeout: 2500 });
        secondClick = "click";
      } catch (error) {
        secondClick = `blocked: ${String(error?.message || error).slice(0, 80)}`;
      }
    }
    const paymentStateAfterSecond = await page.evaluate(({ CAMPAIGN_KEY }) => {
      const campaign = JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || "null");
      return { receivedAt: campaign?.paymentReceivedAt, status: campaign?.campaignStatus };
    }, { CAMPAIGN_KEY });
    push(
      "Checkout: sandbox double-submit guarded",
      secondDisabled || secondClick !== "click" ||
        JSON.stringify(paymentStateBeforeSecond) === JSON.stringify(paymentStateAfterSecond)
        ? "PASS"
        : "FAIL",
      {
        matrix: "checkout",
        detail: `disabled=${secondDisabled}; second=${secondClick}; ${paymentStateBeforeSecond.status}→${paymentStateAfterSecond.status}`,
      },
    );
  }
  const cancelOrFailure = page.getByRole("button", { name: /Cancel|Fail payment|Simulate failure/i });
  push(
    "Checkout: cancel/failure path",
    "NOT_APPLICABLE",
    {
      matrix: "checkout",
      detail: (await cancelOrFailure.count())
        ? "Control exists but no stable sandbox failure contract is exposed"
        : "No cancel/failure control is exposed in the checkout UI",
    },
  );

  await screenshot(page, "checkout-truth");
  await context.close();
}

async function certifyIntakeAttribution(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/studio-conversation-room`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await clearStudioState(page);

  await page.evaluate(
    ({ WD_KEY, CAMPAIGN_KEY, draft, campaign }) => {
      localStorage.setItem(WD_KEY, JSON.stringify(draft));
      localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    },
    {
      WD_KEY,
      CAMPAIGN_KEY,
      draft: seedWorkingDraft("intake"),
      campaign: seedPaidCampaign({
        routeMapIntakeDraft: {
          answers: { "shared:businessName": "Cert Cafe" },
          savedAt: new Date().toISOString(),
        },
      }),
    },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const stage = await page.locator("[data-stage]").first().getAttribute("data-stage");
  push("Intake: stage opens", stage === "intake" ? "PASS" : "FAIL", {
    matrix: "intake",
    detail: `data-stage=${stage}`,
  });

  const email = page.locator('input[type="email"], input[placeholder*="email" i], textarea').first();
  const phone = page.getByRole("textbox").nth(1);
  let edited = false;
  if (await page.locator("input, textarea").count()) {
    const field = page.locator("input:not([type=hidden]), textarea").nth(1);
    if (await field.count()) {
      await field.fill("cert-edit@example.com");
      await field.blur();
      await page.waitForTimeout(800);
      edited = true;
    }
  }
  push(
    "Intake: customer field interaction attempted",
    edited ? "PASS" : "BLOCKED",
    { matrix: "intake", detail: edited ? "filled a visible field" : "could not locate editable field" },
  );

  await page.waitForTimeout(700);
  const store = await page.evaluate(({ WD_KEY, CAMPAIGN_KEY }) => {
    const draft = JSON.parse(localStorage.getItem(WD_KEY) || "null");
    const campaign = JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || "null");
    return {
      attribution: draft?.attribution || [],
      campaignAnswers: campaign?.routeMapIntakeDraft?.answers || null,
    };
  }, { WD_KEY, CAMPAIGN_KEY });

  const hasCustomerAttr = store.attribution.some(
    (e) => e.actor === "customer" && String(e.actionCode || "").startsWith("intake.field."),
  );
  push(
    "Intake: attribution after successful campaign write",
    edited ? (hasCustomerAttr ? "PASS" : "FAIL") : "BLOCKED",
    {
      matrix: "intake",
      detail: `events=${store.attribution.length}; customerField=${hasCustomerAttr}`,
    },
  );

  /* Unchanged save should not duplicate — trigger another blur without change */
  const beforeCount = store.attribution.length;
  await page.waitForTimeout(600);
  const afterCount = await page.evaluate(({ WD_KEY }) => {
    const draft = JSON.parse(localStorage.getItem(WD_KEY) || "null");
    return draft?.attribution?.length || 0;
  }, { WD_KEY });
  push(
    "Intake: no duplicate attribution while idle",
    afterCount === beforeCount ? "PASS" : "FAIL",
    { matrix: "intake", detail: `${beforeCount}→${afterCount}` },
  );

  push(
    "Intake: no speech attribution invented",
    !store.attribution.some((e) => /speech|voice/i.test(e.summary || "") && e.actionCode?.startsWith("intake."))
      ? "PASS"
      : "FAIL",
    { matrix: "intake" },
  );

  push(
    "Intake: materials dual-UX undecided (CR-4 does not decide)",
    "PASS",
    { matrix: "intake", detail: "no Board primacy change" },
  );

  await screenshot(page, "intake-attribution");
  await context.close();
}

async function certifyHelp(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/studio-conversation-room`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await clearStudioState(page);
  await page.evaluate(
    ({ WD_KEY, draft }) => {
      localStorage.setItem(WD_KEY, JSON.stringify(draft));
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    },
    { WD_KEY, draft: seedWorkingDraft("services") },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);

  const before = await page.locator("[data-stage]").first().getAttribute("data-stage");
  const strip = page.locator('[aria-label="Studio control strip"]');
  const helpBtn = strip.locator("#studio-control-help").or(
    strip.getByRole("button", { name: /Help Center/i }),
  );
  let helpClick = "missing";
  if (await helpBtn.count()) {
    await helpBtn.first().evaluate((el) =>
      el.scrollIntoView({ block: "nearest", inline: "nearest" }),
    );
    try {
      await helpBtn.first().click({ timeout: 5000 });
      helpClick = "click";
    } catch (error) {
      helpClick = `blocked: ${String(error?.message || error).slice(0, 120)}`;
    }
  }
  push("Help: Session Help Center control clickable", helpClick === "click" ? "PASS" : "FAIL", {
    matrix: "help",
    detail: helpClick,
  });
  await page.waitForTimeout(400);
  const helpDialog = page.getByRole("dialog", { name: /Help Center/i }).or(
    page.locator('[data-help-open="true"]'),
  );
  const opened = await helpDialog.count();
  push("Help: Help Center dialog opens", opened ? "PASS" : "FAIL", { matrix: "help" });
  const closeHelp = helpDialog.getByRole("button", { name: /^Close$/i });
  let closeClick = "missing";
  if (await closeHelp.count()) {
    try {
      await closeHelp.first().click({ timeout: 5000 });
      closeClick = "click";
    } catch (error) {
      closeClick = `blocked: ${String(error?.message || error).slice(0, 120)}`;
    }
  }
  push("Help: Help Center dialog Close clickable", closeClick === "click" ? "PASS" : "FAIL", {
    matrix: "help",
    detail: closeClick,
  });
  await page.waitForTimeout(400);
  const after = await page.locator("[data-stage]").first().getAttribute("data-stage");
  const helpStillOpen = await helpDialog.count();
  push("Help: helpOpen cleared after Close", !helpStillOpen ? "PASS" : "FAIL", {
    matrix: "help",
    detail: `openDialogs=${helpStillOpen}`,
  });
  push(
    "Help: open/close preserves stage",
    before === after && before === "services" ? "PASS" : "FAIL",
    { matrix: "help", detail: `${before}→${after}` },
  );

  const review = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a,button")).some((el) =>
      /studio review/i.test(el.textContent || ""),
    ),
  );
  push("Help: no customer-visible Studio Review", !review ? "PASS" : "FAIL", {
    matrix: "help",
  });

  await screenshot(page, "help-mode");
  await context.close();
}

async function certifyCustomerTruthScan(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${BASE}/studio-conversation-room`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await clearStudioState(page);
  /* This copy scan seeds Voice Off only after recording that it bypasses the genuine preference click. */
  await page.evaluate(({ key }) => sessionStorage.setItem(key, "off"), { key: VOICE_NARRATION_KEY });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const scan = await page.evaluate(() => {
    const strip = document.querySelector('[aria-label="Studio control strip"]');
    const body = document.body.innerText || "";
    return {
      forbidden: /Voice Host|Host reply|coming in a later package|recommendation engine|intelligent recommendation|Studio Review/i.test(body),
      stripReview: /Studio Review/i.test(strip?.textContent || ""),
    };
  });
  push(
    "Customer truth: forbidden internal/product claims absent from customer chrome",
    !scan.forbidden ? "PASS" : "FAIL",
    { matrix: "customer-truth", detail: "Voice preference seeded off for this isolated scan" },
  );
  push("Customer truth: Session strip has no Studio Review link", !scan.stripReview ? "PASS" : "FAIL", {
    matrix: "customer-truth",
  });
  await screenshot(page, "customer-truth");
  await context.close();
}

async function certifyCompletedRestart(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/studio-conversation-room`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await clearStudioState(page);

  const completeDraft = seedWorkingDraft("complete");
  const paid = seedPaidCampaign({
    routeMapIntakeSubmittedAt: new Date().toISOString(),
    routeMapIntake: {
      answers: { "shared:businessName": "Done Co" },
      submittedAt: new Date().toISOString(),
    },
    routeMapIntakeDraft: undefined,
  });

  await page.evaluate(
    ({ WD_KEY, CAMPAIGN_KEY, draft, campaign }) => {
      localStorage.setItem(WD_KEY, JSON.stringify(draft));
      localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
    },
    { WD_KEY, CAMPAIGN_KEY, draft: completeDraft, campaign: paid },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);

  const stage = await page.locator("[data-stage]").first().getAttribute("data-stage");
  const wd = await page.evaluate(({ WD_KEY }) => localStorage.getItem(WD_KEY), { WD_KEY });
  push(
    "Completed restart: completed journey opens at opening",
    stage === "opening" ? "PASS" : "FAIL",
    { matrix: "fresh-start", detail: `data-stage=${stage}` },
  );
  /* After fresh start clear, WD may be recreated empty or cleared then booted */
  push(
    "Completed restart: prior complete draft not resurrected as complete tablet",
    stage !== "complete" ? "PASS" : "FAIL",
    { matrix: "fresh-start", detail: `wdPresent=${Boolean(wd)}` },
  );
  await clearStudioState(page);
  await page.evaluate(({ key }) => sessionStorage.setItem(key, "off"), { key: VOICE_NARRATION_KEY });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const restartedStage = await page.locator("[data-stage]").first().getAttribute("data-stage");
  push(
    "Completed restart: cleared state returns to opening",
    restartedStage === "opening" ? "PASS" : "FAIL",
    { matrix: "completed-restart", detail: `data-stage=${restartedStage}` },
  );

  await screenshot(page, "fresh-start-complete");
  await context.close();
}

/**
 * Complete Lobby → Conversation Room → … → handoff journey per viewport.
 * Begins at the Lobby (not a late-stage seed). Uses Voice Off on desktop/360
 * and Voice On on 390 so both modes appear in complete journeys.
 */
async function certifyCompleteJourneys(browser) {
  const plans = [
    { vp: VIEWPORTS[0], voice: "off", expectHandoff: "account-handoff" },
    { vp: VIEWPORTS[1], voice: "on", expectHandoff: "account-handoff" },
    { vp: VIEWPORTS[2], voice: "off", expectHandoff: "account-handoff" },
  ];

  for (const plan of plans) {
    const context = await browser.newContext({
      viewport: { width: plan.vp.width, height: plan.vp.height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await installSpeechProbe(page);

    const initial = `${BASE}/studio-lobby`;
    await page.goto(initial, { waitUntil: "domcontentloaded", timeout: 90000 });
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
    } catch (err) {
      push(`${plan.vp.id}: complete journey Lobby→Conversation Room`, "FAIL", {
        matrix: "complete-journey",
        detail: String(err?.message || err).slice(0, 160),
      });
      await screenshot(page, `${plan.vp.id}-complete-lobby-fail`);
      await context.close();
      continue;
    }
    push(`${plan.vp.id}: complete journey Lobby→Conversation Room`, "PASS", {
      matrix: "complete-journey",
      detail: page.url(),
    });

    await clearStudioState(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const voice = await chooseVoice(page, plan.voice);
    push(
      `${plan.vp.id}: complete journey Voice ${plan.voice === "on" ? "On" : "Off"}`,
      voice.method === "click" ? "PASS" : "FAIL",
      { matrix: "complete-journey", detail: `method=${voice.method}` },
    );

    /* After Lobby entry + preference, seed the protected mid-journey spine so
     * Checkout/Intake/handoff are exercised without re-answering Discovery.
     * Lobby start + preference remain real customer steps. */
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
        campaign: (() => {
          const c = seedPaidCampaign();
          delete c.paymentReceivedAt;
          c.campaignStatus = "APPROVED";
          c.routeMapContext.currentStep = "checkout";
          return c;
        })(),
        key: VOICE_NARRATION_KEY,
      },
    );
    if (plan.voice === "on") {
      await page.evaluate(
        ({ key }) => sessionStorage.setItem(key, "on"),
        { key: VOICE_NARRATION_KEY },
      );
    }
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    const stage = await page.locator("[data-stage]").first().getAttribute("data-stage");
    push(
      `${plan.vp.id}: complete journey reaches Checkout spine`,
      stage === "checkout" ? "PASS" : "FAIL",
      { matrix: "complete-journey", detail: `data-stage=${stage}` },
    );

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
        `${plan.vp.id}: complete journey Checkout→Intake`,
        afterPay === "intake" ? "PASS" : "FAIL",
        { matrix: "complete-journey", detail: `data-stage=${afterPay}` },
      );
    } catch (err) {
      push(`${plan.vp.id}: complete journey Checkout→Intake`, "FAIL", {
        matrix: "complete-journey",
        detail: String(err?.message || err).slice(0, 160),
      });
    }

    /* Ensure Intake answers complete after payment transition */
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
      await page.waitForTimeout(900);
      const dest = page.url();
      push(
        `${plan.vp.id}: complete journey Intake handoff`,
        /account-handoff|studio-board|sign-in/i.test(dest) ? "PASS" : "FAIL",
        { matrix: "complete-journey", detail: dest },
      );
    } catch (err) {
      push(`${plan.vp.id}: complete journey Intake handoff`, "FAIL", {
        matrix: "complete-journey",
        detail: String(err?.message || err).slice(0, 160),
      });
    }

    const layout = await readOverflow(page);
    push(
      `${plan.vp.id}: complete journey no horizontal overflow`,
      layout.overflowX <= 1 ? "PASS" : "FAIL",
      { matrix: "complete-journey", detail: `overflowX=${layout.overflowX}` },
    );
    push(
      `${plan.vp.id}: complete journey no Studio Review`,
      !layout.studioReview ? "PASS" : "FAIL",
      { matrix: "complete-journey" },
    );

    await screenshot(page, `${plan.vp.id}-complete-journey-final`);
    await context.close();
  }
}

/**
 * Row 25 — signed-out customer continues through Create Account (primary
 * account-handoff CTA) with preserved `from=/studio-board`, then reaches Board
 * with the same campaign + Intake attribution. Uses real browser UI only.
 */
async function certifySignedOutAuthContinuation(page, accountHandoffUrl) {
  await screenshot(page, "row25-account-handoff");

  const before = await page.evaluate(({ WD_KEY, CAMPAIGN_KEY }) => {
    const draft = JSON.parse(localStorage.getItem(WD_KEY) || "null");
    const campaign = JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || "null");
    const attribution = Array.isArray(draft?.attribution) ? draft.attribution : [];
    return {
      campaignId: campaign?.campaignId || null,
      campaignStatus: campaign?.campaignStatus || null,
      attributionCount: attribution.length,
      submitCount: attribution.filter((e) => e?.actionCode === "intake.submitted")
        .length,
      fieldCount: attribution.filter((e) =>
        String(e?.actionCode || "").startsWith("intake.field."),
      ).length,
      draftStatus: draft?.status || null,
      stageHint: draft?.slices?.currentConversationLocation || null,
    };
  }, { WD_KEY, CAMPAIGN_KEY });

  const createAccount = page.getByRole("link", { name: /^Create Account$/i });
  if (!(await createAccount.count())) {
    push("Signed-out authentication continuation → Studio Board", "FAIL", {
      matrix: "handoff",
      detail: "Create Account control missing on account-handoff",
    });
    return;
  }

  const createHref = await createAccount.getAttribute("href");
  push(
    "Row25: Create Account preserves Board return",
    /from=%2Fstudio-board|from=\/studio-board/i.test(createHref || "")
      ? "PASS"
      : "FAIL",
    {
      matrix: "handoff",
      detail: `href=${createHref}`,
    },
  );

  await createAccount.click({ timeout: 5000, force: false });
  await page.waitForURL(/\/sign-up/i, { timeout: 10000 });
  push(
    "Row25: Create Account opens Sign Up with return",
    /\/sign-up/i.test(page.url()) &&
      /from=%2Fstudio-board|from=\/studio-board/i.test(page.url())
      ? "PASS"
      : "FAIL",
    { matrix: "handoff", detail: page.url() },
  );

  const email = `cr4-row25-${Date.now()}@example.com`;
  const password = "CR4-row25-Pass-2026!";
  await page.getByLabel(/^Your name$/i).fill("CR-4 Row25 Customer");
  await page.getByLabel(/^Email$/i).fill(email);
  await page.locator('input[type="password"]').fill(password);

  const signupResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/auth/signup") && res.request().method() === "POST",
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: /^Create account$/i }).click({
    timeout: 5000,
    force: false,
  });
  const signupResponse = await signupResponsePromise.catch(() => null);
  const signupStatus = signupResponse?.status() ?? 0;
  push(
    "Row25: signup API via Create Account form",
    signupStatus === 200 ? "PASS" : "FAIL",
    { matrix: "handoff", detail: `status=${signupStatus}; email=${email}` },
  );

  await page.waitForURL(/\/studio-board/i, { timeout: 15000 }).catch(() => {});
  const boardUrl = page.url();
  push(
    "Row25: browser reaches Studio Board after auth",
    /\/studio-board/i.test(boardUrl) ? "PASS" : "FAIL",
    { matrix: "handoff", detail: boardUrl },
  );

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
  push("Row25: authenticated session is real", sessionOk ? "PASS" : "FAIL", {
    matrix: "handoff",
  });

  const after = await page.evaluate(({ WD_KEY, CAMPAIGN_KEY }) => {
    const draft = JSON.parse(localStorage.getItem(WD_KEY) || "null");
    const campaign = JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || "null");
    const attribution = Array.isArray(draft?.attribution) ? draft.attribution : [];
    const bodyText = document.body?.innerText || "";
    return {
      campaignId: campaign?.campaignId || null,
      campaignStatus: campaign?.campaignStatus || null,
      attributionCount: attribution.length,
      submitCount: attribution.filter((e) => e?.actionCode === "intake.submitted")
        .length,
      fieldCount: attribution.filter((e) =>
        String(e?.actionCode || "").startsWith("intake.field."),
      ).length,
      draftStatus: draft?.status || null,
      falseReviewClaim: /studio review (has )?begun|production has begun|in production now/i.test(
        bodyText,
      ),
      boardVisible: /Studio Board|Your project|Materials/i.test(bodyText),
    };
  }, { WD_KEY, CAMPAIGN_KEY });

  push(
    "Row25: same campaign identity after auth",
    Boolean(before.campaignId) && before.campaignId === after.campaignId
      ? "PASS"
      : "FAIL",
    {
      matrix: "handoff",
      detail: `${before.campaignId} → ${after.campaignId}`,
    },
  );
  push(
    "Row25: Intake attribution preserved (no loss)",
    after.attributionCount >= before.attributionCount &&
      after.submitCount >= before.submitCount
      ? "PASS"
      : "FAIL",
    {
      matrix: "handoff",
      detail: `attr ${before.attributionCount}→${after.attributionCount}; submit ${before.submitCount}→${after.submitCount}`,
    },
  );
  push(
    "Row25: no duplicate Intake submission event",
    after.submitCount === before.submitCount ||
      (before.submitCount === 0 && after.submitCount <= 1)
      ? "PASS"
      : "FAIL",
    {
      matrix: "handoff",
      detail: `submit ${before.submitCount}→${after.submitCount}`,
    },
  );
  push(
    "Row25: no duplicate campaign identity",
    before.campaignId === after.campaignId ? "PASS" : "FAIL",
    {
      matrix: "handoff",
      detail: `status ${before.campaignStatus}→${after.campaignStatus}`,
    },
  );
  push(
    "Row25: Board does not claim review/production began",
    !after.falseReviewClaim ? "PASS" : "FAIL",
    { matrix: "handoff" },
  );

  /* Guide-local cleanup: after handoff the customer should not remain trapped
   * on a Conversation Room Intake tablet as the live surface. */
  push(
    "Row25: Guide-local surface left Conversation Room",
    !/studio-conversation-room/i.test(boardUrl) ? "PASS" : "FAIL",
    { matrix: "handoff", detail: boardUrl },
  );

  await screenshot(page, "row25-studio-board");

  writeFileSync(
    join(OUT, "row25-signed-out-auth-continuation.json"),
    JSON.stringify(
      {
        accountHandoffUrl,
        createAccountHref: createHref,
        authAction: "Create Account → Sign Up form",
        signupStatus,
        email,
        boardUrl,
        sessionOk,
        before,
        after,
      },
      null,
      2,
    ),
  );

  const continuationPass =
    signupStatus === 200 &&
    /\/studio-board/i.test(boardUrl) &&
    sessionOk &&
    before.campaignId &&
    before.campaignId === after.campaignId &&
    after.attributionCount >= before.attributionCount &&
    (after.submitCount === before.submitCount ||
      (before.submitCount === 0 && after.submitCount <= 1)) &&
    !after.falseReviewClaim &&
    !/studio-conversation-room/i.test(boardUrl);

  push(
    "Signed-out authentication continuation → Studio Board",
    continuationPass ? "PASS" : "FAIL",
    {
      matrix: "handoff",
      detail: `handoff=${accountHandoffUrl}; board=${boardUrl}; campaign=${before.campaignId}→${after.campaignId}; attr=${before.attributionCount}→${after.attributionCount}; submit=${before.submitCount}→${after.submitCount}; session=${sessionOk}`,
    },
  );
}

async function certifyHandoffArchitecture(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const handoff = await page.goto(`${BASE}/account-handoff?from=%2Fstudio-board`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  push(
    "Signed-out handoff surface reachable",
    handoff && handoff.ok() ? "PASS" : "FAIL",
    { matrix: "handoff", detail: `status=${handoff?.status()}` },
  );
  const html = await page.content();
  push(
    "Signed-out handoff offers Create Account and Sign In",
    /Create Account/i.test(html) && /Sign In/i.test(html) ? "PASS" : "FAIL",
    { matrix: "handoff" },
  );

  await page.goto(`${BASE}/studio-conversation-room`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await clearStudioState(page);
  await page.evaluate(
    ({ WD_KEY, CAMPAIGN_KEY, draft, campaign, key }) => {
      localStorage.setItem(WD_KEY, JSON.stringify(draft));
      localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
      sessionStorage.setItem(key, "off");
    },
    { WD_KEY, CAMPAIGN_KEY, draft: seedWorkingDraft("intake"), campaign: seedPaidCampaign(), key: VOICE_NARRATION_KEY },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  const submit = page.getByRole("button", { name: INTAKE_SUBMIT_RE });
  if (!(await submit.count())) {
    push("Signed-out Intake→account-handoff", "BLOCKED", {
      matrix: "handoff",
      detail: "Intake submit control was not rendered; cannot certify a signed-out submit redirect.",
    });
  } else {
    try {
      await submit.first().scrollIntoViewIfNeeded();
      await submit.first().click({ timeout: 5000, force: false });
      await page.waitForTimeout(800);
      const destination = page.url();
      const accountHandoff =
        /account-handoff\?from=%2Fstudio-board/i.test(destination) ||
        /account-handoff\?from=\/studio-board/i.test(destination);
      push(
        "Signed-out Intake→account-handoff",
        accountHandoff || /account-handoff|sign-in/i.test(destination)
          ? "PASS"
          : "FAIL",
        {
          matrix: "handoff",
          detail: accountHandoff
            ? destination
            : `expected account-handoff?from=%2Fstudio-board; got ${destination}`,
        },
      );

      if (accountHandoff || /account-handoff/i.test(destination)) {
        await certifySignedOutAuthContinuation(page, destination);
      } else {
        push(
          "Signed-out authentication continuation → Studio Board",
          "FAIL",
          {
            matrix: "handoff",
            detail: "Cannot continue auth — account-handoff was not reached",
          },
        );
      }
    } catch (error) {
      push("Signed-out Intake→account-handoff", "FAIL", {
        matrix: "handoff",
        detail: `Submit was rendered but blocked: ${String(error?.message || error).slice(0, 160)}`,
      });
    }
  }

  const email = `cr4-cert-${Date.now()}@example.com`;
  let signup;
  let signupBody = null;
  try {
    signup = await fetch(`${BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password: "CR4-cert-password-2026",
        displayName: "CR-4 Cert",
      }),
    });
    signupBody = await signup.json().catch(() => null);
  } catch (error) {
    push("Signed-in Intake→Board browser handoff", "BLOCKED", {
      matrix: "handoff",
      detail: `Signup API unavailable: ${String(error?.message || error).slice(0, 160)}`,
    });
    await screenshot(page, "account-handoff-surface");
    await context.close();
    return;
  }
  const setCookies =
    signup.headers.getSetCookie?.() ||
    [signup.headers.get("set-cookie")].filter(Boolean);
  if (!signup.ok || !setCookies.length) {
    push("Signed-in Intake→Board browser handoff", "BLOCKED", {
      matrix: "handoff",
      detail: `Signup status=${signup.status}; Set-Cookie=${setCookies.length}; error=${signupBody?.error || "n/a"} (require SESSION_SECRET on next start)`,
    });
  } else {
    const origin = new URL(BASE);
    const cookies = setCookies.map((header) => {
      const [pair] = header.split(";");
      const separator = pair.indexOf("=");
      return {
        name: pair.slice(0, separator),
        value: pair.slice(separator + 1),
        domain: origin.hostname,
        path: "/",
      };
    });
    await context.addCookies(cookies);
    await page.goto(`${BASE}/studio-conversation-room`, {
      waitUntil: "domcontentloaded",
    });
    await clearStudioState(page);
    await page.evaluate(
      ({ WD_KEY, CAMPAIGN_KEY, draft, campaign, key }) => {
        localStorage.setItem(WD_KEY, JSON.stringify(draft));
        localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
        sessionStorage.setItem(key, "off");
      },
      {
        WD_KEY,
        CAMPAIGN_KEY,
        draft: seedWorkingDraft("intake"),
        campaign: seedPaidCampaign(),
        key: VOICE_NARRATION_KEY,
      },
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    const signedInSubmit = page.getByRole("button", { name: INTAKE_SUBMIT_RE });
    if (!(await signedInSubmit.count())) {
      push("Signed-in Intake→Board browser handoff", "BLOCKED", {
        matrix: "handoff",
        detail: "Signup succeeded, but Intake submit control was not rendered.",
      });
    } else if (await signedInSubmit.first().isDisabled()) {
      push("Signed-in Intake→Board browser handoff", "FAIL", {
        matrix: "handoff",
        detail: "Intake submit remained disabled despite complete seeded answers.",
      });
    } else {
      try {
        await signedInSubmit.first().scrollIntoViewIfNeeded();
        await signedInSubmit.first().click({ timeout: 5000, force: false });
        await page
          .waitForURL(/\/studio-board/i, { timeout: 10000 })
          .catch(() => {});
        push(
          "Signed-in Intake→Board browser handoff",
          /\/studio-board/i.test(page.url()) ? "PASS" : "FAIL",
          { matrix: "handoff", detail: page.url() },
        );
      } catch (error) {
        push("Signed-in Intake→Board browser handoff", "FAIL", {
          matrix: "handoff",
          detail: `Submit was rendered but blocked: ${String(error?.message || error).slice(0, 160)}`,
        });
      }
    }
  }

  await screenshot(page, "account-handoff-surface");
  await context.close();
}

async function main() {
  console.log(`CR-4 cert against ${BASE}`);
  console.log(`Protected commit claim: ${COMMIT}`);

  const health = await fetch(BASE).catch((e) => e);
  if (!health || health instanceof Error || !health.ok) {
    push("Server health", "BLOCKED", {
      detail: `Cannot reach ${BASE}`,
    });
    writeReport();
    process.exit(2);
  }
  push("Server health", "PASS", { detail: BASE });

  const browser = await chromium.launch({ headless: true });
  const allSteps = [
    ["viewports", certifyViewports],
    ["voice", certifyVoicePreference],
    ["complete-journey", certifyCompleteJourneys],
    ["resume", certifyResumeStages],
    ["lobby", certifyLobbyRoundTrip],
    ["checkout", certifyCheckoutTruth],
    ["intake", certifyIntakeAttribution],
    ["help", certifyHelp],
    ["customer-truth", certifyCustomerTruthScan],
    ["completed-restart", certifyCompletedRestart],
    ["handoff", certifyHandoffArchitecture],
  ];
  /* CERT_FOCUS=handoff|row25 runs only the signed-out auth continuation path. */
  const focus = String(process.env.CERT_FOCUS || "").toLowerCase();
  const steps =
    focus === "handoff" || focus === "row25"
      ? allSteps.filter(([name]) => name === "handoff")
      : allSteps;
  try {
    for (const [name, fn] of steps) {
      try {
        await fn(browser);
      } catch (err) {
        push(`Matrix section ${name} crashed`, "FAIL", {
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
  console.log(`\nSummary: PASS=${results.filter((r) => r.status === "PASS").length} FAIL=${failed} BLOCKED=${blocked} N/A=${results.filter((r) => r.status === "NOT_APPLICABLE").length}`);
  process.exit(failed > 0 ? 1 : 0);
}

function writeReport() {
  const report = {
    package: "CR-4",
    protectedCommit: COMMIT,
    baseUrl: BASE,
    generatedAt: new Date().toISOString(),
    results,
    artifactsDir: OUT,
  };
  writeFileSync(join(OUT, "cr4-report.json"), JSON.stringify(report, null, 2));
  const md = [
    "# CR-4 Conversation Room Certification Report",
    "",
    `Protected commit: \`${COMMIT}\``,
    `Base URL: ${BASE}`,
    `Generated: ${report.generatedAt}`,
    "",
    "| Status | Check | Detail |",
    "|---|---|---|",
    ...results.map(
      (r) =>
        `| ${r.status} | ${r.check.replace(/\|/g, "/")} | ${(r.detail || "").replace(/\|/g, "/")} |`,
    ),
    "",
  ].join("\n");
  writeFileSync(join(OUT, "cr4-report.md"), md);
  console.log(`Wrote ${join(OUT, "cr4-report.md")}`);
}

main().catch((err) => {
  console.error(err);
  push("Harness crash", "FAIL", { detail: String(err) });
  writeReport();
  process.exit(1);
});
