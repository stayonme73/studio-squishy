/**
 * Skip coral, deadline order, materials chips write the field.
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
    projectNeed: extra.projectNeed || "Marketing materials",
    businessName: extra.businessName || "",
    requestedDeadline: extra.requestedDeadline || "",
    deadlineStatus: extra.deadlineStatus || "not_requested",
    existingMaterialsNote: extra.existingMaterialsNote || "",
    confirmedAt: null,
  };
  return {
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
    step,
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
  await page.waitForTimeout(1100);
  const film = page.locator("[data-voice-choice-film]");
  if (await film.count()) {
    const fill = page.locator('[data-voice-choice-action="off"]').first();
    if (await fill.count()) {
      await fill.dispatchEvent("pointerdown");
      await fill.click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
    }
  }
}

async function tapChip(page, label) {
  await page.evaluate((text) => {
    const chip = [...document.querySelectorAll("button")].find(
      (node) => node.textContent?.trim() === text,
    );
    if (!(chip instanceof HTMLElement)) return;
    chip.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 11,
      }),
    );
    chip.click();
  }, label);
  await page.waitForTimeout(300);
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

const deadlinePage = await context.newPage();
await openStep(deadlinePage, "ask_deadline");
await deadlinePage.waitForSelector("text=requested deadline", { timeout: 20000 });
const deadline = await deadlinePage.evaluate(() => {
  const chips = [...document.querySelectorAll("[class*='chipRow'] button")].map(
    (node) => (node.textContent || "").trim(),
  );
  const skip = document.querySelector("button[data-skip-action], [data-skip-action] button");
  const skipStyle = skip ? getComputedStyle(skip) : null;
  return {
    chips,
    skipHtml: skip?.outerHTML?.slice(0, 280) || null,
    skipColor: skipStyle?.color || null,
    skipBorder: skipStyle?.borderTopColor || skipStyle?.borderColor || null,
    cssHasCoral: [...document.styleSheets].some((sheet) => {
      try {
        return [...sheet.cssRules].some((rule) => String(rule.cssText || "").includes("#d94e2b"));
      } catch {
        return false;
      }
    }),
  };
});
await deadlinePage.screenshot({
  path: path.join(out, "skip-coral-deadline.jpg"),
  type: "jpeg",
  quality: 80,
});
await deadlinePage.close();

const materialsPage = await context.newPage();
await openStep(materialsPage, "ask_materials");
await materialsPage.waitForSelector("text=Logo", { timeout: 20000 }).catch(() => {});
const materialsHead = await materialsPage.evaluate(() =>
  document.body.innerText.replace(/\s+/g, " ").slice(0, 240),
);
await tapChip(materialsPage, "Logo");
await tapChip(materialsPage, "Photos");
const materials = await materialsPage.evaluate(() => {
  const field = document.querySelector("textarea, input[type='text']");
  return { value: field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement ? field.value : "" };
});
await materialsPage.screenshot({
  path: path.join(out, "materials-chips-fill-field.jpg"),
  type: "jpeg",
  quality: 80,
});
await materialsPage.close();

const facts = {
  materialsHead,
  deadline,
  materials,
  deadlineOrder:
    deadline.chips.includes("More than 1 month") &&
    deadline.chips.indexOf("No deadline yet") ===
      deadline.chips.indexOf("More than 1 month") + 1 &&
    deadline.chips.indexOf("I have a specific date") ===
      deadline.chips.indexOf("No deadline yet") + 1,
  skipCoral: /217,\s*78,\s*43|d94e2b/i.test(
    `${deadline.skipColor} ${deadline.skipBorder}`,
  ),
  materialsFilled: /Logo/.test(materials.value) && /Photos/.test(materials.value),
};
facts.pass = facts.deadlineOrder && facts.skipCoral && facts.materialsFilled;
writeFileSync(path.join(out, "skip-coral-materials.json"), JSON.stringify(facts, null, 2));
await browser.close();
process.stdout.write(`${JSON.stringify(facts, null, 2)}\n`);
if (!facts.pass) process.exitCode = 1;
