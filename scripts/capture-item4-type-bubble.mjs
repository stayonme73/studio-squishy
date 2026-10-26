/**
 * Item #4 only. Isolated. Name-question type field: one outer bubble, no inner outline.
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
const page = await context.newPage();
await page.addInitScript(
  ({ draft }) => {
    localStorage.setItem("studio-squishy:working-draft:v1", JSON.stringify(draft));
    localStorage.setItem(
      "studio-guide:capture-draft:v1",
      JSON.stringify({
        schemaVersion: 1,
        preferredName: "",
        projectNeed: "",
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
    sessionStorage.setItem("studio-guide:ui-step:v1", "ask_preferred_name");
  },
  {
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
        discoveryAnswers: {
          preferredName: "",
          projectNeed: "",
          businessName: "",
          requestedDeadline: "",
          deadlineStatus: "not_requested",
          existingMaterialsNote: "",
          confirmedAt: null,
        },
      },
    },
  },
);
await page.goto(`${BASE}/studio-conversation-room?studioPaymentSandbox=1`, {
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
await page.waitForSelector("#studio-guide-type-field", { timeout: 15000 });
const facts = await page.evaluate(() => {
  const line = document.querySelector("#studio-guide-type-field");
  const wrap = line?.parentElement;
  const lineStyle = line ? getComputedStyle(line) : null;
  const wrapStyle = wrap ? getComputedStyle(wrap) : null;
  return {
    innerBorder: lineStyle?.borderTopWidth,
    innerStyle: lineStyle?.borderTopStyle,
    outerBorder: wrapStyle?.borderTopWidth,
    outerColor: wrapStyle?.borderTopColor,
  };
});
const field = page.locator("#studio-guide-type-field").first();
await field.screenshot({
  path: path.join(out, "item4-type-bubble-field.jpg"),
  type: "jpeg",
  quality: 85,
});
await page.screenshot({
  path: path.join(out, "item4-type-bubble-name.jpg"),
  type: "jpeg",
  quality: 82,
});
writeFileSync(path.join(out, "item4-type-bubble-facts.json"), JSON.stringify(facts, null, 2));
await browser.close();
process.stdout.write(`${JSON.stringify(facts, null, 2)}\n`);
if (facts.innerBorder !== "0px" && facts.innerStyle !== "none") {
  throw new Error(`inner textarea still has a border: ${facts.innerBorder}`);
}
if (facts.outerBorder === "0px") {
  throw new Error("outer type field lost its bubble");
}
