/**
 * VISUAL SYSTEM MASTER CORRECTION proofs.
 * Conversation Room, Studio Plan, Checkout, Intake, Studio Board, Review Room.
 * Samsung 390×844 + laptop 1280×800.
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

const allViewports = [
  { id: "samsung", width: 390, height: 844, isMobile: true, hasTouch: true },
  { id: "laptop", width: 1280, height: 800, isMobile: false, hasTouch: false },
];
const only = process.argv[3];
const viewports = only
  ? allViewports.filter((vp) => vp.id === only)
  : allViewports;

function workingDraft({ stage, opening }) {
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

const planOpening = {
  preferredName: "Maya",
  projectNeed: "I need a flyer for a grand opening.",
  businessName: "Home Kitchen",
  requestedDeadline: "September 15, 2026",
  deadlineStatus: "unconfirmed",
  existingMaterialsNote: "I have a logo.",
  confirmedAt: now,
};

async function seedConversation(page, { stage, step, opening }) {
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
    ({ draft, guide, step: uiStep }) => {
      localStorage.setItem(
        "studio-squishy:working-draft:v1",
        JSON.stringify(draft),
      );
      localStorage.setItem(
        "studio-guide:capture-draft:v1",
        JSON.stringify({ schemaVersion: 1, ...guide, source: "lobby-guide-conversation" }),
      );
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
      sessionStorage.setItem("studio-voice:first-entry-choice:v1", "done");
      document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
      if (uiStep) {
        sessionStorage.setItem("studio-guide:ui-step:v1", uiStep);
      }
    },
    {
      draft: workingDraft({ stage, opening: answers }),
      guide: answers,
      step,
    },
  );
}

async function measureGlass(page, selector) {
  return page.evaluate((sel) => {
    const node = document.querySelector(sel);
    if (!node) return { missing: sel };
    const style = getComputedStyle(node);
    return {
      sel,
      bg: style.backgroundColor,
      blur: style.backdropFilter || style.webkitBackdropFilter || "",
    };
  }, selector);
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

async function withPage(browser, vp, run) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    ignoreHTTPSErrors: true,
    colorScheme: "light",
    hasTouch: vp.hasTouch,
    isMobile: vp.isMobile,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  await run(page);
  await context.close();
}

async function captureConversation(browser, vp) {
  await withPage(browser, vp, async (page) => {
    await seedConversation(page, {
      stage: "opening",
      step: "ask_preferred_name",
      opening: {},
    });
    await page.goto(`${BASE}/studio-conversation-room?studioPaymentSandbox=1`, {
      waitUntil: "commit",
      timeout: 60000,
    });
    await page.waitForTimeout(1600);
    const film = page.locator("[data-voice-choice-film]");
    if (await film.count()) {
      const fill = page.locator('[data-voice-choice-action="off"]').first();
      if (await fill.count()) {
        await fill.dispatchEvent("pointerdown");
        await fill.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1200);
      }
    }
    await page
      .locator('section[data-surface="tablet"], [data-voice-choice-film]')
      .first()
      .waitFor({ state: "attached", timeout: 15000 });
    await page.waitForTimeout(500);
    process.stdout.write(
      `conversation ${vp.id} ${JSON.stringify(await measureGlass(page, 'section[data-surface="tablet"]'))}\n`,
    );
    await shot(page, `master-conversation-${vp.id}.jpg`);
  });
}

async function capturePlan(browser, vp) {
  await withPage(browser, vp, async (page) => {
    await seedConversation(page, {
      stage: "plan",
      step: "summary",
      opening: planOpening,
    });
    await page.goto(`${BASE}/studio-conversation-room?stage=plan&studioPaymentSandbox=1`, {
      waitUntil: "commit",
      timeout: 60000,
    });
    await page.waitForSelector("text=Studio Plan", { timeout: 20000 });
    await page.waitForTimeout(700);
    process.stdout.write(
      `plan ${vp.id} ${JSON.stringify(await measureGlass(page, '[data-surface="studio-plan"]'))}\n`,
    );
    await shot(page, `master-studio-plan-${vp.id}.jpg`);
  });
}

async function captureCheckout(browser, vp) {
  await withPage(browser, vp, async (page) => {
    await seedConversation(page, {
      stage: "checkout",
      step: "checkout",
      opening: planOpening,
    });
    await page.goto(
      `${BASE}/studio-conversation-room?stage=checkout&studioPaymentSandbox=1`,
      { waitUntil: "commit", timeout: 60000 },
    );
    await page.waitForSelector("text=What Happens Next, text=Checkout, [data-panel='checkout']", {
      timeout: 20000,
    }).catch(() => {});
    await page.waitForTimeout(800);
    process.stdout.write(
      `checkout ${vp.id} ${JSON.stringify(await measureGlass(page, "[data-panel='checkout'] .co-card, .co-card, .pay-paper-card"))}\n`,
    );
    await shot(page, `master-checkout-${vp.id}.jpg`);
  });
}

async function captureNamed(browser, vp, { id, url, wait, measure }) {
  await withPage(browser, vp, async (page) => {
    if (id === "board" || id === "review") {
      const auth = await page.request.post(`${BASE}/api/auth/local-customer-one`);
      process.stdout.write(`${id} ${vp.id} auth=${auth.status()}\n`);
    }
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(wait, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    if (measure) {
      process.stdout.write(
        `${id} ${vp.id} ${JSON.stringify(await measureGlass(page, measure))}\n`,
      );
    }
    await shot(page, `master-${id}-${vp.id}.jpg`);
  });
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });

  for (const vp of viewports) {
    await captureConversation(browser, vp);
    await capturePlan(browser, vp);
    await captureCheckout(browser, vp);
    await captureNamed(browser, vp, {
      id: "intake",
      url: `${BASE}/local-test-fixtures?inspect=intake`,
      wait: ".route-map-social-intake, [class*='intake'], h1",
      measure: ".route-map-social-intake__card, [class*='intake-card']",
    });
    await captureNamed(browser, vp, {
      id: "board",
      url: `${BASE}/studio-board`,
      wait: ".sb, .sb-sidebar, .sb-main",
      measure: ".sb-card",
    });
    await captureNamed(browser, vp, {
      id: "review",
      url: `${BASE}/feedback-studio`,
      wait: ".fs-page, .rd-shell, .fs-room, h1",
      measure: ".fs-review-proof, .rd-stage-card, .fs-status-card",
    });
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
