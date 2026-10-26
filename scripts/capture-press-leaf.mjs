/**
 * Shared press-state proof. Isolated context. Does not remint Maya.
 * Holds data-pressed on one control so the transient press can be photographed
 * without changing customer behavior.
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
    },
  };
}

async function seed(page, { stage, step, opening }) {
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
      localStorage.setItem("studio-squishy:working-draft:v1", JSON.stringify(draft));
      localStorage.setItem(
        "studio-guide:capture-draft:v1",
        JSON.stringify({ schemaVersion: 1, ...guide, source: "lobby-guide-conversation" }),
      );
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
      sessionStorage.setItem("studio-voice:first-entry-choice:v1", "done");
      document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
      if (uiStep) sessionStorage.setItem("studio-guide:ui-step:v1", uiStep);
    },
    {
      draft: workingDraft({ stage, opening: answers }),
      guide: answers,
      step,
    },
  );
}

async function pressFacts(page, selector) {
  return page.evaluate((sel) => {
    const node = document.querySelector(sel);
    if (!node) return { missing: sel };
    const parents = [
      node.closest("[class*='chipRow']"),
      node.closest("[data-surface='tablet']"),
      node.closest("[data-film-family]"),
      node.closest("[data-active-question-cluster]"),
      node.parentElement,
    ].filter(Boolean);
    const child = getComputedStyle(node);
    return {
      sel,
      childBg: child.backgroundColor,
      childTransform: child.transform,
      parents: parents.map((parent) => {
        const wrap = getComputedStyle(parent);
        return {
          tag: parent.tagName,
          className: parent.className?.toString?.().slice(0, 80) || "",
          bg: wrap.backgroundColor,
          transform: wrap.transform,
          opacity: wrap.opacity,
        };
      }),
    };
  }, selector);
}

async function holdRealPress(page, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("no box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
}

async function holdPress(page, locator) {
  await locator.evaluate((node) => {
    node.setAttribute("data-pressed", "true");
    node.classList.add("is-pressed");
  });
}

async function shot(page, name) {
  const dest = path.join(out, name);
  await page.screenshot({ path: dest, type: "jpeg", quality: 82 });
  process.stdout.write(`wrote ${dest}\n`);
}

async function open(browser, seedArgs, query, waitText) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  await seed(page, seedArgs);
  await page.goto(`${BASE}/studio-conversation-room?${query}`, {
    waitUntil: "commit",
    timeout: 60000,
  });
  await page.waitForTimeout(1400);
  const film = page.locator("[data-voice-choice-film]");
  if (await film.count()) {
    const fill = page.locator('[data-voice-choice-action="off"]').first();
    if (await fill.count()) {
      await fill.dispatchEvent("pointerdown");
      await fill.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
    }
  }
  if (waitText) {
    await page.waitForSelector(`text=${waitText}`, { timeout: 15000 }).catch(() => {});
  }
  return { context, page };
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  {
    const { context, page } = await open(
      browser,
      {
        stage: "opening",
        step: "ask_deadline",
        opening: {
          preferredName: "Maya",
          projectNeed: "I need a flyer for a grand opening.",
          businessName: "Home Kitchen",
        },
      },
      "gstep=ask_deadline&studioPaymentSandbox=1",
      "Within 2 weeks",
    );
    const chip = page.locator("button", { hasText: "Within 2 weeks" }).first();
    await chip.waitFor({ state: "visible", timeout: 15000 });
    await holdPress(page, chip);
    await holdRealPress(page, chip);
    process.stdout.write(`deadline ${JSON.stringify(await pressFacts(page, "button[data-pressed='true']"))}\n`);
    await shot(page, "press-deadline-within-2-weeks.jpg");
    await page.mouse.up();
    await context.close();
  }

  {
    const { context, page } = await open(
      browser,
      {
        stage: "opening",
        step: "ask_project_need",
        opening: { preferredName: "Maya" },
      },
      "gstep=ask_project_need&studioPaymentSandbox=1",
      "Marketing materials",
    );
    const chip = page.locator("button", { hasText: "Marketing materials" }).first();
    await chip.waitFor({ state: "visible", timeout: 15000 });
    await holdPress(page, chip);
    await holdRealPress(page, chip);
    process.stdout.write(`chip ${JSON.stringify(await pressFacts(page, "button[data-pressed='true']"))}\n`);
    await shot(page, "press-answer-chip.jpg");
    await page.mouse.up();
    await context.close();
  }

  {
    const { context, page } = await open(
      browser,
      { stage: "opening", step: "ask_preferred_name", opening: {} },
      "studioPaymentSandbox=1",
      "Before we begin",
    );
    const voice = page.locator('[data-voice-pref="off"]').first();
    await voice.waitFor({ state: "attached", timeout: 15000 });
    await holdPress(page, voice);
    await holdRealPress(page, voice);
    process.stdout.write(`voice ${JSON.stringify(await pressFacts(page, "[data-voice-pref='off']"))}\n`);
    await shot(page, "press-voice-off.jpg");
    await page.mouse.up();
    const cont = page.locator(".lobby-entry-film__cta").first();
    await voice.evaluate((node) => {
      node.removeAttribute("data-pressed");
      node.classList.remove("is-pressed");
    });
    await holdPress(page, cont);
    await holdRealPress(page, cont);
    process.stdout.write(`continue ${JSON.stringify(await pressFacts(page, ".lobby-entry-film__cta[data-pressed='true']"))}\n`);
    await shot(page, "press-continue.jpg");
    await page.mouse.up();
    await context.close();
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
