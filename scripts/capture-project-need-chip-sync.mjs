import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = "https://localhost:3000";
const OUT =
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs";
mkdirSync(OUT, { recursive: true });

function seedProjectNeed(now) {
  return ({ now }) => {
    localStorage.setItem(
      "studio-squishy:working-draft:v1",
      JSON.stringify({
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
          discoveryAnswers: {
            preferredName: "Maya",
            projectNeed: "Business setup",
            businessName: "",
            requestedDeadline: "",
            deadlineStatus: "not_requested",
            existingMaterialsNote: "",
            confirmedAt: null,
          },
          currentConversationLocation: "conversation-room-stage:opening",
        },
      }),
    );
    localStorage.setItem(
      "studio-guide:capture-draft:v1",
      JSON.stringify({
        schemaVersion: 1,
        preferredName: "Maya",
        projectNeed: "Business setup",
        businessName: "",
        requestedDeadline: "",
        deadlineStatus: "not_requested",
        existingMaterialsNote: "",
        confirmedAt: null,
        source: "lobby-guide-conversation",
      }),
    );
    sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    sessionStorage.setItem("studio-voice:first-entry-choice:v1", "done");
    sessionStorage.setItem("studio-guide:ui-step:v1", "ask_project_need");
    document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
  };
}

async function fieldAndChips(page) {
  return page.evaluate(() => {
    const field = document.querySelector("textarea");
    const chips = [...document.querySelectorAll("[data-surface='tablet'] button")].filter(
      (node) =>
        node.getAttribute("data-tablet-continue") !== "true" &&
        node.textContent?.trim() &&
        node.textContent.trim() !== "Continue" &&
        node.textContent.trim() !== "Back",
    );
    const continues = [...document.querySelectorAll("button, a")].filter((node) => {
      const label = node.textContent?.replace(/\s+/g, " ").trim();
      return label === "Continue";
    });
    return {
      heading: document.querySelector("h1")?.textContent?.trim() ?? "",
      field: field instanceof HTMLTextAreaElement ? field.value : null,
      selected: chips
        .filter((node) => node.getAttribute("data-selected") === "true")
        .map((node) => node.textContent?.trim()),
      continueCount: continues.length,
      continueLabels: continues.map((node) => ({
        tag: node.tagName,
        tablet: node.getAttribute("data-tablet-continue"),
        send: node.getAttribute("data-send-action"),
      })),
      chipRow: (() => {
        const row = document.querySelector("[class*='chipRow']");
        if (!row) return null;
        const style = getComputedStyle(row);
        return {
          display: style.display,
          columns: style.gridTemplateColumns,
          gap: style.gap,
        };
      })(),
    };
  });
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
    chip.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        pointerId: 11,
      }),
    );
  }, label);
}

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--ignore-certificate-errors"],
});
const now = new Date().toISOString();
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 360, height: 800 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
page.setDefaultTimeout(25000);
await page.addInitScript(seedProjectNeed(now), { now });
await page.goto(
  `${BASE}/studio-conversation-room?gstep=ask_project_need&studioPaymentSandbox=1`,
  { waitUntil: "commit", timeout: 60000 },
);
await page.waitForSelector("text=What are you working on today?", {
  timeout: 20000,
});
await page.waitForTimeout(500);
const before = await fieldAndChips(page);
await tapChip(page, "Marketing materials");
await page.waitForTimeout(350);
const afterMarketing = await fieldAndChips(page);
await tapChip(page, "Presentation or document");
await page.waitForTimeout(350);
const afterPresentation = await fieldAndChips(page);
await tapChip(page, "Business setup");
await page.waitForTimeout(350);
const afterBusiness = await fieldAndChips(page);
const tablet = page.locator("[data-surface='tablet']").first();
const shot = path.join(OUT, "project-need-chip-sync-360.jpg");
if (await tablet.count()) {
  await tablet.screenshot({ path: shot, type: "jpeg", quality: 84 });
} else {
  await page.screenshot({ path: shot, type: "jpeg", quality: 84 });
}
const report = { before, afterMarketing, afterPresentation, afterBusiness };
writeFileSync(
  path.join(OUT, "project-need-chip-sync-report.json"),
  JSON.stringify(report, null, 2),
);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
await browser.close();
