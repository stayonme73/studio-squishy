/**
 * Item #4 only. Isolated context. Does not remint Maya.
 * Measures Conversation Room question/title ranks on Samsung + laptop.
 */
import { mkdirSync, writeFileSync } from "node:fs";
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

const opening = {
  preferredName: "Maya",
  projectNeed: "I need a flyer for a grand opening.",
  businessName: "Home Kitchen",
  requestedDeadline: "September 15, 2026",
  deadlineStatus: "unconfirmed",
  existingMaterialsNote: "I have a logo.",
  confirmedAt: now,
};

function workingDraft(stage, answers) {
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
      discoveryAnswers: answers,
      currentConversationLocation: `conversation-room-stage:${stage}`,
    },
  };
}

async function seed(page, { stage, step, answers }) {
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
      draft: workingDraft(stage, answers),
      guide: answers,
      step,
    },
  );
}

async function measure(page) {
  return page.evaluate(() => {
    const heading =
      document.querySelector("[data-surface='tablet'] h1[class*='question']") ||
      document.querySelector("[data-surface='studio-plan'] h1[class*='question']") ||
      document.querySelector("[data-surface='tablet'] h2[class*='title']") ||
      document.querySelector("h1") ||
      document.querySelector("h2");
    if (!heading) return { missing: true, text: document.body.innerText.slice(0, 160) };
    const style = getComputedStyle(heading);
    return {
      text: heading.textContent?.replace(/\s+/g, " ").trim() ?? "",
      tag: heading.tagName,
      px: style.fontSize,
      weight: style.fontWeight,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
    };
  });
}

const views = [
  { name: "samsung", viewport: { width: 390, height: 844 }, isMobile: true },
  { name: "laptop", viewport: { width: 1280, height: 800 }, isMobile: false },
];

const screens = [
  {
    id: "name",
    wait: "Before we begin",
    stage: "opening",
    step: "ask_preferred_name",
    answers: {
      preferredName: "",
      projectNeed: "",
      businessName: "",
      requestedDeadline: "",
      deadlineStatus: "not_requested",
      existingMaterialsNote: "",
      confirmedAt: null,
    },
    query: "studioPaymentSandbox=1",
  },
  {
    id: "need",
    wait: "What are you working on today",
    stage: "opening",
    step: "ask_project_need",
    answers: { ...opening, projectNeed: "", businessName: "", confirmedAt: null },
    query: "gstep=ask_project_need&studioPaymentSandbox=1",
  },
  {
    id: "business",
    wait: "What is the name of your business",
    stage: "opening",
    step: "ask_business_name",
    answers: { ...opening, businessName: "", confirmedAt: null },
    query: "gstep=ask_business_name&studioPaymentSandbox=1",
  },
  {
    id: "summary",
    wait: "Here's what I understood",
    stage: "opening",
    step: "summary",
    answers: { ...opening, confirmedAt: null },
    query: "gstep=summary&studioPaymentSandbox=1",
  },
  {
    id: "route",
    wait: "Choose your route",
    stage: "route",
    step: "summary",
    answers: opening,
    query: "studioPaymentSandbox=1",
  },
];

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--ignore-certificate-errors"],
});

const report = {};

for (const view of views) {
  report[view.name] = {};
  for (const screen of screens) {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: view.viewport,
      isMobile: view.isMobile,
      hasTouch: view.isMobile,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(25000);
    await seed(page, screen);
    await page.goto(`${BASE}/studio-conversation-room?${screen.query}`, {
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
        await page.waitForTimeout(800);
      }
    }
    await page.waitForSelector(`text=${screen.wait}`, { timeout: 15000 }).catch(() => {});
    const facts = await measure(page);
    report[view.name][screen.id] = facts;
    await page.screenshot({
      path: path.join(out, `item4-${screen.id}-${view.name}.jpg`),
      type: "jpeg",
      quality: 82,
    });
    const tablet = page.locator("[data-surface='tablet'], [data-surface='studio-plan']").first();
    if (await tablet.count()) {
      await tablet.screenshot({
        path: path.join(out, `item4-${screen.id}-${view.name}-tablet.jpg`),
        type: "jpeg",
        quality: 82,
      }).catch(() => {});
    }
    await context.close();
  }
}

await browser.close();
writeFileSync(path.join(out, "item4-type-hierarchy-facts.json"), JSON.stringify(report, null, 2));
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

const questionPx = "21.6px"; /* 1.35rem at 16px */
for (const view of views) {
  const sizes = Object.values(report[view.name]).map((row) => row.px);
  const unique = [...new Set(sizes)];
  if (unique.length !== 1) {
    throw new Error(`${view.name} question sizes still differ: ${JSON.stringify(report[view.name])}`);
  }
  if (unique[0] !== questionPx) {
    throw new Error(`${view.name} expected ${questionPx}, got ${unique[0]}`);
  }
}
