/**
 * 360px Lounge light-glass proofs for the current customer spine.
 * Usage: node scripts/capture-lounge-glass-360.mjs [baseUrl]
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(
  __dirname,
  "..",
  "docs",
  "launch",
  "studio-operating-mobile-customer-journey-certification-1",
  "lounge-glass-proofs",
);

const BASE =
  process.argv[2] ||
  process.env.STUDIO_PROOF_URL ||
  "https://localhost:3000";

const now = new Date().toISOString();
const opening = {
  preferredName: "Maya",
  projectNeed: "I need a flyer for a grand opening.",
  businessName: "Home Kitchen",
  requestedDeadline: "September 15, 2026",
  deadlineStatus: "unconfirmed",
  existingMaterialsNote: "I have a logo.",
  confirmedAt: now,
};

function workingDraft(stage) {
  return {
    version: 1,
    status: "working_draft",
    editable: true,
    updatedAt: now,
    revision: 4,
    cursor: {
      conversationLocation: `conversation-room-stage:${stage}`,
      flowStep: stage,
    },
    attribution: [],
    slices: {
      discoveryAnswers: opening,
      currentConversationLocation: `conversation-room-stage:${stage}`,
      routeRecommendation: {
        roadId: "i75",
        projectNeed: opening.projectNeed,
        recommendedAt: now,
      },
      customerSelectedRoute: { roadId: "i75", selectedAt: now },
      selectedServices: [
        { jobId: "v2-rtu-flyer", roadId: "i75", addedAt: now },
      ],
    },
  };
}

const guideDraft = {
  schemaVersion: 1,
  ...opening,
  source: "lobby-guide-conversation",
};

async function seed(page, { stage, step, emptyOpening }) {
  const draft = emptyOpening
    ? {
        version: 1,
        status: "working_draft",
        editable: true,
        updatedAt: now,
        revision: 1,
        cursor: {
          conversationLocation: "conversation-room-stage:opening",
          flowStep: "opening",
        },
        attribution: [],
        slices: {
          currentConversationLocation: "conversation-room-stage:opening",
        },
      }
    : workingDraft(stage);
  const guide = emptyOpening
    ? {
        schemaVersion: 1,
        preferredName: "",
        projectNeed: "",
        businessName: "",
        requestedDeadline: "",
        deadlineStatus: "not_requested",
        existingMaterialsNote: "",
        confirmedAt: null,
        source: "lobby-guide-conversation",
      }
    : guideDraft;
  await page.addInitScript(
    ({ draft, guide, step: uiStep }) => {
      localStorage.setItem(
        "studio-squishy:working-draft:v1",
        JSON.stringify(draft),
      );
      localStorage.setItem(
        "studio-guide:capture-draft:v1",
        JSON.stringify(guide),
      );
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
      sessionStorage.removeItem("studio-voice:first-entry-choice:v1");
      document.cookie =
        "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
      if (uiStep) {
        sessionStorage.setItem("studio-guide:ui-step:v1", uiStep);
      } else {
        sessionStorage.removeItem("studio-guide:ui-step:v1");
      }
    },
    { draft, guide, step },
  );
}

async function shot(page, name) {
  const path = join(outDir, name);
  await page.screenshot({ path, fullPage: true });
  console.log("wrote", path);
}

async function pointerActivate(locator) {
  await locator.dispatchEvent("pointerdown");
  await locator.click({ force: true }).catch(() => {});
}

async function withPage(browser, seedArgs, run) {
  const context = await browser.newContext({
    viewport: { width: 360, height: 780 },
    ignoreHTTPSErrors: true,
    colorScheme: "light",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  if (seedArgs) await seed(page, seedArgs);
  await run(page);
  await context.close();
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  await withPage(browser, null, async (page) => {
    await page.goto(`${BASE}/?studioPaymentSandbox=1`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(1200);
    await shot(page, "14-welcome-360.png");
  });

  await withPage(browser, null, async (page) => {
    await page.addInitScript(() => {
      sessionStorage.removeItem("studio-voice:narration-preference:v1");
      sessionStorage.setItem("studio-voice:first-entry-choice:v1", "required");
      document.cookie =
        "studio_voice_first_entry=1; path=/; max-age=600; SameSite=Lax";
    });
    await page.goto(
      `${BASE}/studio-conversation-room?studioPaymentSandbox=1`,
      { waitUntil: "domcontentloaded" },
    );
    await page.waitForTimeout(1800);
    await shot(page, "15-voice-choice-360.png");
    // 26-voice-choice-owner-accepted-360.png is the OWNER ACCEPTED lock.
    // Do not overwrite it from this script.
  });

  await withPage(
    browser,
    { stage: "opening", step: "ask_project_need" },
    async (page) => {
      await page.goto(
        `${BASE}/studio-conversation-room?gstep=ask_project_need&studioPaymentSandbox=1`,
        { waitUntil: "domcontentloaded" },
      );
      await page.waitForTimeout(1200);
      const fill = page.locator('[data-voice-choice-action="off"]');
      if (await fill.count()) {
        await pointerActivate(fill.first());
        await page.waitForTimeout(800);
      }
      await shot(page, "15-opening-question-360.png");
    },
  );

  await withPage(browser, { stage: "opening", step: "summary" }, async (page) => {
    await page.goto(
      `${BASE}/studio-conversation-room?gstep=summary&studioPaymentSandbox=1`,
      { waitUntil: "domcontentloaded" },
    );
    await page.waitForTimeout(1800);
    await shot(page, "16-review-360.png");
  });

  await withPage(browser, { stage: "route" }, async (page) => {
    await page.goto(
      `${BASE}/studio-conversation-room?stage=route&studioPaymentSandbox=1`,
      { waitUntil: "domcontentloaded" },
    );
    await page.waitForTimeout(1800);
    await shot(page, "17-route-360.png");
  });

  await withPage(browser, { stage: "services" }, async (page) => {
    await page.goto(
      `${BASE}/studio-conversation-room?stage=services&studioPaymentSandbox=1`,
      { waitUntil: "domcontentloaded" },
    );
    await page.waitForTimeout(1800);
    await shot(page, "18-services-360.png");
    const controls = page.locator('[data-studio-controls-tab="true"]');
    if (await controls.count()) {
      await pointerActivate(controls.first());
      await page.waitForTimeout(600);
    }
    await shot(page, "19-studio-controls-360.png");
  });

  await withPage(browser, { stage: "checkout" }, async (page) => {
    await page.goto(
      `${BASE}/studio-conversation-room?stage=checkout&studioPaymentSandbox=1`,
      { waitUntil: "domcontentloaded" },
    );
    await page.waitForTimeout(1800);
    await shot(page, "20-payment-360.png");
  });

  await withPage(browser, null, async (page) => {
    await page.goto(`${BASE}/sign-in?studioPaymentSandbox=1`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(1200);
    await shot(page, "21-auth-signin-360.png");
  });

  await withPage(browser, null, async (page) => {
    await page.goto(`${BASE}/studio-board?studioPaymentSandbox=1`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(1500);
    await shot(page, "22-board-360.png");
  });

  await withPage(browser, null, async (page) => {
    await page.goto(`${BASE}/feedback-studio?studioPaymentSandbox=1`, {
      waitUntil: "commit",
      timeout: 60000,
    });
    await page.waitForTimeout(2500);
    await shot(page, "23-delivery-review-360.png");
  });

  await browser.close();
}


main().catch((error) => {
  console.error(error);
  process.exit(1);
});
