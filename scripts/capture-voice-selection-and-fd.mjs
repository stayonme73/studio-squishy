/**
 * Voice On/Off selection paint + Maya Final Delivery facts.
 * Isolated Playwright context. Does not remint Maya or reset the live phone draft.
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

async function seedConversation(page, { stage, step, opening, voice = "off" }) {
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
    ({ draft, guide, step: uiStep, voicePref }) => {
      localStorage.setItem(
        "studio-squishy:working-draft:v1",
        JSON.stringify(draft),
      );
      localStorage.setItem(
        "studio-guide:capture-draft:v1",
        JSON.stringify({
          schemaVersion: 1,
          ...guide,
          source: "lobby-guide-conversation",
        }),
      );
      sessionStorage.setItem("studio-voice:narration-preference:v1", voicePref);
      sessionStorage.setItem("studio-voice:first-entry-choice:v1", "done");
      document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
      if (uiStep) sessionStorage.setItem("studio-guide:ui-step:v1", uiStep);
    },
    {
      draft: workingDraft({ stage, opening: answers }),
      guide: answers,
      step,
      voicePref: voice,
    },
  );
}

async function measureVoice(page) {
  return page.evaluate(() => {
    const on = document.querySelector('[data-voice-pref="on"]');
    const off = document.querySelector('[data-voice-pref="off"]');
    const continueBtn = document.querySelector(
      '.lobby-entry-film__cta:not([data-voice-pref]), [class*="primary"]',
    );
    const read = (node) => {
      if (!node) return null;
      const style = getComputedStyle(node);
      return {
        bg: style.backgroundColor,
        border: style.borderColor,
        pressed: node.getAttribute("aria-pressed"),
        cls: node.className,
      };
    };
    return {
      on: read(on),
      off: read(off),
      continue: read(continueBtn),
    };
  });
}

async function shot(page, name) {
  const dest = path.join(out, name);
  await page.screenshot({ path: dest, type: "jpeg", quality: 82 });
  process.stdout.write(`wrote ${dest}\n`);
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);

  await seedConversation(page, {
    stage: "opening",
    step: "ask_preferred_name",
    opening: {},
    voice: "off",
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
  await page.locator('[data-voice-pref="off"]').first().waitFor({ state: "attached", timeout: 15000 });
  process.stdout.write(`voice-off-selected ${JSON.stringify(await measureVoice(page))}\n`);
  await shot(page, "close-voice-off-selected.jpg");

  const voiceOn = page.locator('[data-voice-pref="on"]').first();
  await voiceOn.dispatchEvent("pointerdown");
  await voiceOn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(500);
  process.stdout.write(`voice-on-selected ${JSON.stringify(await measureVoice(page))}\n`);
  await shot(page, "close-voice-on-selected.jpg");
  await context.close();

  const planCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
    hasTouch: true,
    isMobile: true,
  });
  const plan = await planCtx.newPage();
  await seedConversation(plan, {
    stage: "plan",
    step: "summary",
    voice: "off",
    opening: {
      preferredName: "Maya",
      projectNeed: "I need a flyer for a grand opening.",
      businessName: "Home Kitchen",
      requestedDeadline: "September 15, 2026",
      deadlineStatus: "unconfirmed",
      existingMaterialsNote: "I have a logo.",
      confirmedAt: now,
    },
  });
  await plan.goto(`${BASE}/studio-conversation-room?stage=plan&studioPaymentSandbox=1`, {
    waitUntil: "commit",
    timeout: 60000,
  });
  await plan.waitForSelector("text=Studio Plan", { timeout: 20000 });
  await plan.waitForTimeout(700);
  process.stdout.write(`plan-voice-off ${JSON.stringify(await measureVoice(plan))}\n`);
  await shot(plan, "close-plan-voice-off.jpg");
  const planOn = plan.locator('[data-voice-pref="on"]').first();
  await planOn.dispatchEvent("pointerdown");
  await planOn.click({ force: true }).catch(() => {});
  await plan.waitForTimeout(400);
  process.stdout.write(`plan-voice-on ${JSON.stringify(await measureVoice(plan))}\n`);
  await shot(plan, "close-plan-voice-on.jpg");
  await planCtx.close();

  const fdCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
    hasTouch: true,
    isMobile: true,
  });
  const fd = await fdCtx.newPage();
  const auth = await fd.request.post(`${BASE}/api/auth/local-customer-one`);
  process.stdout.write(`fd-auth=${auth.status()}\n`);
  await fd.goto(`${BASE}/deliverables`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await fd.waitForSelector(".fd-hero, .fd-summary, [class*='fd-']", { timeout: 25000 });
  await fd.waitForTimeout(1500);
  const facts = await fd.evaluate(() => {
    const text = document.body.innerText;
    return {
      completionDate: /September 16, 2026/.test(text),
      filesReady: /Your files are ready/i.test(text),
      beingPrepared: /being prepared/i.test(text),
      pdf: /flyer-version-16\.pdf|Print-ready PDF|Download.*PDF/i.test(text),
      png: /flyer-version-16\.png|Download.*PNG|PNG/i.test(text),
      maya: /Maya/i.test(text),
      history: /Update History/i.test(text),
      historyLines: (text.match(/Update History[\s\S]{0,800}/) || [""])[0].slice(0, 400),
    };
  });
  process.stdout.write(`fd-facts ${JSON.stringify(facts)}\n`);
  await shot(fd, "close-final-delivery.jpg");
  await fdCtx.close();

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
