/**
 * Opening questions: one page scroll, Skip air, deadline grid.
 * Isolated. Does not remint Maya.
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

function seed(step, extra = {}) {
  const now = new Date().toISOString();
  const answers = {
    preferredName: "Tagia",
    projectNeed: extra.projectNeed || "",
    businessName: extra.businessName || "",
    requestedDeadline: extra.requestedDeadline || "",
    deadlineStatus: extra.deadlineStatus || "not_requested",
    existingMaterialsNote: extra.existingMaterialsNote || "",
    confirmedAt: extra.confirmedAt || null,
  };
  return {
    now,
    step,
    draft: {
      version: 1,
      status: "working_draft",
      editable: true,
      updatedAt: now,
      revision: 4,
      cursor: {
        conversationLocation: "conversation-room-stage:opening",
        flowStep: "opening",
      },
      attribution: [],
      slices: {
        discoveryAnswers: answers,
        currentConversationLocation: "conversation-room-stage:opening",
      },
    },
    guide: {
      schemaVersion: 1,
      ...answers,
      source: "lobby-guide-conversation",
    },
  };
}

async function openStep(page, step, extra = {}) {
  const packed = seed(step, extra);
  await page.addInitScript(
    ({ d, g, s }) => {
      localStorage.setItem("studio-squishy:working-draft:v1", JSON.stringify(d));
      localStorage.setItem("studio-guide:capture-draft:v1", JSON.stringify(g));
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
      sessionStorage.setItem("studio-voice:first-entry-choice:v1", "done");
      document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
      sessionStorage.setItem("studio-guide:ui-step:v1", s);
    },
    { d: packed.draft, g: packed.guide, s: step },
  );
  await page.goto(
    `${BASE}/studio-conversation-room?gstep=${step}&studioPaymentSandbox=1`,
    { waitUntil: "commit", timeout: 60000 },
  );
  await page.waitForTimeout(1200);
  const film = page.locator("[data-voice-choice-film]");
  if (await film.count()) {
    const fill = page.locator('[data-voice-choice-action="off"]').first();
    if (await fill.count()) {
      await fill.dispatchEvent("pointerdown");
      await fill.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }
}

function scrollFacts() {
  const tablet = document.querySelector('[data-stage="opening"][data-surface="tablet"]');
  const main = document.querySelector("[data-question-scroll-root]");
  const cluster = document.querySelector("[data-active-question-cluster]");
  const panel = document.querySelector("[class*='nameQuestionPanel']");
  const skip = document.querySelector("[data-skip-action]");
  const row = document.querySelector("[class*='chipRow']");
  const read = (node) => {
    if (!node) return null;
    const style = getComputedStyle(node);
    return {
      overflow: style.overflow,
      overflowY: style.overflowY,
      height: style.height,
      maxHeight: style.maxHeight,
    };
  };
  return {
    step: tablet?.getAttribute("data-step") || "",
    tablet: read(tablet),
    main: read(main),
    cluster: read(cluster),
    panel: read(panel),
    skipMargin: skip ? getComputedStyle(skip).marginTop : null,
    chipRow: row
      ? {
          display: getComputedStyle(row).display,
          columns: getComputedStyle(row).gridTemplateColumns,
        }
      : null,
  };
}

function isPageScroll(paint) {
  const inner = [paint.main, paint.cluster, paint.panel].filter(Boolean);
  return inner.every((node) => node.overflowY === "visible" || node.overflowY === "clip");
}

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--ignore-certificate-errors"],
});
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 360, height: 800 },
  isMobile: true,
  hasTouch: true,
});

const needPage = await context.newPage();
await openStep(needPage, "ask_project_need");
await needPage.waitForSelector("text=What are you working on today?", {
  timeout: 20000,
});
const need = await needPage.evaluate(scrollFacts);
await needPage.screenshot({
  path: path.join(out, "opening-one-page-project-need.jpg"),
  type: "jpeg",
  quality: 80,
});
await needPage.close();

const deadlinePage = await context.newPage();
await openStep(deadlinePage, "ask_deadline", { projectNeed: "Marketing materials" });
await deadlinePage.waitForSelector("text=requested deadline", { timeout: 20000 });
const deadline = await deadlinePage.evaluate(scrollFacts);
await deadlinePage.screenshot({
  path: path.join(out, "opening-one-page-deadline.jpg"),
  type: "jpeg",
  quality: 80,
});
await deadlinePage.close();

const businessPage = await context.newPage();
await openStep(businessPage, "ask_business_name", {
  projectNeed: "Marketing materials",
});
await businessPage.waitForSelector("text=name of your", { timeout: 20000 });
const business = await businessPage.evaluate(scrollFacts);
await businessPage.screenshot({
  path: path.join(out, "opening-one-page-business-name.jpg"),
  type: "jpeg",
  quality: 80,
});
await businessPage.close();

const facts = {
  need,
  deadline,
  business,
  needOnePage: isPageScroll(need),
  deadlineOnePage: isPageScroll(deadline),
  businessOnePage: isPageScroll(business),
  deadlineGrid: Boolean(deadline.chipRow?.columns?.includes(" ")),
  skipAir:
    Number.parseFloat(business.skipMargin || "0") >= 16 &&
    Number.parseFloat(deadline.skipMargin || "0") >= 16,
};
facts.pass =
  facts.needOnePage &&
  facts.deadlineOnePage &&
  facts.businessOnePage &&
  facts.deadlineGrid &&
  facts.skipAir;

writeFileSync(path.join(out, "opening-one-page.json"), JSON.stringify(facts, null, 2));
await browser.close();
process.stdout.write(`${JSON.stringify(facts, null, 2)}\n`);
if (!facts.pass) process.exitCode = 1;
