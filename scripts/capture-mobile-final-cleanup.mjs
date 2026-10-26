/**
 * MOBILE FINAL CLEANUP proofs — Conversation only.
 * Isolated Playwright context. Does not touch the live phone working draft.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(
  root,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);
mkdirSync(out, { recursive: true });

const BASE = process.argv[2] || "https://localhost:3000";
const now = new Date().toISOString();

function workingDraft({ stage, step, opening }) {
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
      routeRecommendation: opening.projectNeed
        ? {
            roadId: "i75",
            projectNeed: opening.projectNeed,
            recommendedAt: now,
          }
        : undefined,
      customerSelectedRoute: opening.projectNeed
        ? { roadId: "i75", selectedAt: now }
        : undefined,
      selectedServices: opening.projectNeed
        ? [{ jobId: "v2-rtu-flyer", roadId: "i75", addedAt: now }]
        : undefined,
    },
  };
}

function guideDraft(opening) {
  return {
    schemaVersion: 1,
    ...opening,
    source: "lobby-guide-conversation",
  };
}

async function seed(page, { stage, step, opening, voiceChoice }) {
  const empty = {
    preferredName: "",
    projectNeed: "",
    businessName: "",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    confirmedAt: null,
  };
  const answers = { ...empty, ...opening };
  await page.addInitScript(
    ({ draft, guide, step: uiStep, voiceChoice: gate }) => {
      localStorage.setItem(
        "studio-squishy:working-draft:v1",
        JSON.stringify(draft),
      );
      localStorage.setItem(
        "studio-guide:capture-draft:v1",
        JSON.stringify(guide),
      );
      if (gate) {
        sessionStorage.removeItem("studio-voice:narration-preference:v1");
        sessionStorage.setItem("studio-voice:first-entry-choice:v1", "required");
        document.cookie =
          "studio_voice_first_entry=1; path=/; max-age=600; SameSite=Lax";
        sessionStorage.removeItem("studio-guide:ui-step:v1");
        return;
      }
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
      sessionStorage.setItem("studio-voice:first-entry-choice:v1", "done");
      document.cookie =
        "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
      if (uiStep) {
        sessionStorage.setItem("studio-guide:ui-step:v1", uiStep);
      }
    },
    {
      draft: workingDraft({
        stage,
        step,
        opening: answers,
      }),
      guide: guideDraft(answers),
      step,
      voiceChoice,
    },
  );
}

async function shot(page, name) {
  const dest = path.join(out, name);
  await page.screenshot({
    path: dest,
    type: "jpeg",
    quality: 82,
    fullPage: false,
  });
  process.stdout.write(`wrote ${dest}\n`);
}

async function withPage(browser, seedArgs, run) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
    colorScheme: "light",
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  if (seedArgs) await seed(page, seedArgs);
  await run(page);
  await context.close();
}

async function openRoom(page, query) {
  await page.goto(`${BASE}/studio-conversation-room?${query}`, {
    waitUntil: "commit",
    timeout: 60000,
  });
  await page.waitForTimeout(1800);
}

async function tap(page, selector) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible", timeout: 8000 });
  await loc.dispatchEvent("pointerdown");
  await loc.click({ force: true }).catch(() => {});
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });

  await withPage(
    browser,
    { stage: "opening", step: "ask_preferred_name", opening: {}, voiceChoice: true },
    async (page) => {
      await openRoom(page, "studioPaymentSandbox=1");
      await page.waitForSelector("[data-voice-choice-film]", { timeout: 15000 });
      await shot(page, "cleanup-voice-choice.jpg");
      const fill = page.locator('[data-voice-choice-action="off"]');
      await fill.evaluate((node) => {
        node.dataset.gatePressed = "true";
        node.setAttribute("aria-pressed", "true");
      });
      await shot(page, "cleanup-voice-choice-selected.jpg");
      const facts = await page.evaluate(() => {
        const panel = document.querySelector("[data-voice-choice-film] [class*='panel']");
        const before = panel ? getComputedStyle(panel, "::before") : null;
        const style = panel ? getComputedStyle(panel) : null;
        return {
          blur: before?.backdropFilter || before?.webkitBackdropFilter || "",
          bg: style?.backgroundColor || "",
          backHref: document.querySelector("[data-pre-checkout-deck-back]")?.getAttribute("href"),
        };
      });
      process.stdout.write(`voice-choice ${JSON.stringify(facts)}\n`);
    },
  );

  await withPage(
    browser,
    { stage: "opening", step: "ask_preferred_name", opening: {}, voiceChoice: true },
    async (page) => {
      await openRoom(page, "studioPaymentSandbox=1");
      await page.waitForSelector("[data-voice-choice-film]", { timeout: 15000 });
      await tap(page, '[data-voice-choice-action="off"]');
      await page.waitForSelector("text=Before we begin", { timeout: 15000 });
      await shot(page, "cleanup-first-question.jpg");
      await tap(page, '[data-voice-pref="on"]');
      await page.waitForTimeout(400);
      const pressed = await page.locator('[data-voice-pref="on"]').getAttribute("aria-pressed");
      process.stdout.write(`voice-on-selected=${pressed}\n`);
      await shot(page, "cleanup-first-question-voice-on-selected.jpg");
    },
  );

  await withPage(
    browser,
    {
      stage: "opening",
      step: "ask_project_need",
      opening: { preferredName: "Maya" },
    },
    async (page) => {
      await openRoom(page, "gstep=ask_project_need&studioPaymentSandbox=1");
      await page.waitForSelector("text=What are you working on today?", {
        timeout: 15000,
      });
      await shot(page, "cleanup-working-on-today.jpg");
      await tap(page, 'button:has-text("Marketing materials")');
      await page.waitForTimeout(350);
      await shot(page, "cleanup-working-on-today-selected.jpg");
    },
  );

  await withPage(
    browser,
    {
      stage: "opening",
      step: "ask_business_name",
      opening: {
        preferredName: "Maya",
        projectNeed: "I need a flyer for a grand opening.",
      },
    },
    async (page) => {
      await openRoom(page, "gstep=ask_business_name&studioPaymentSandbox=1");
      await page.waitForSelector("text=What is the name of your business?", {
        timeout: 15000,
      });
      await shot(page, "cleanup-business-name.jpg");
    },
  );

  await withPage(
    browser,
    {
      stage: "opening",
      step: "ask_materials",
      opening: {
        preferredName: "Maya",
        projectNeed: "I need a flyer for a grand opening.",
        businessName: "Home Kitchen",
      },
    },
    async (page) => {
      await openRoom(page, "gstep=ask_materials&studioPaymentSandbox=1");
      await page.waitForSelector("text=files or materials", { timeout: 15000 });
      await tap(page, 'button:has-text("Logo")');
      await page.waitForTimeout(350);
      await shot(page, "cleanup-materials.jpg");
    },
  );

  await withPage(
    browser,
    {
      stage: "plan",
      step: "summary",
      opening: {
        preferredName: "Maya",
        projectNeed: "I need a flyer for a grand opening.",
        businessName: "Home Kitchen",
        requestedDeadline: "September 15, 2026",
        deadlineStatus: "unconfirmed",
        existingMaterialsNote: "I have a logo.",
        confirmedAt: now,
      },
    },
    async (page) => {
      await openRoom(page, "stage=plan&studioPaymentSandbox=1");
      await page.waitForSelector("text=Studio Plan", { timeout: 15000 });
      await shot(page, "cleanup-studio-plan.jpg");
    },
  );

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
