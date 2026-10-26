import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = "https://localhost:3000";
const OUT =
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs";
mkdirSync(OUT, { recursive: true });

async function seedAndOpen(page, step, extras = {}) {
  const now = new Date().toISOString();
  await page.addInitScript(
    ({ now, step, extras }) => {
      localStorage.setItem(
        "studio-squishy:working-draft:v1",
        JSON.stringify({
          version: 1,
          status: "working_draft",
          editable: true,
          updatedAt: now,
          revision: 6,
          cursor: {
            conversationLocation: "conversation-room-stage:opening",
            flowStep: "opening",
          },
          attribution: [],
          slices: {
            discoveryAnswers: {
              preferredName: "Maya",
              projectNeed: extras.projectNeed || "Marketing materials",
              businessName: extras.businessName || "",
              requestedDeadline: extras.requestedDeadline || "",
              deadlineStatus: extras.deadlineStatus || "not_requested",
              existingMaterialsNote: extras.existingMaterialsNote || "",
              confirmedAt: extras.confirmedAt || null,
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
          projectNeed: extras.projectNeed || "Marketing materials",
          businessName: extras.businessName || "",
          requestedDeadline: extras.requestedDeadline || "",
          deadlineStatus: extras.deadlineStatus || "not_requested",
          existingMaterialsNote: extras.existingMaterialsNote || "",
          confirmedAt: extras.confirmedAt || null,
          source: "lobby-guide-conversation",
        }),
      );
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
      sessionStorage.setItem("studio-voice:first-entry-choice:v1", "done");
      sessionStorage.setItem("studio-guide:ui-step:v1", step);
      document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
    },
    { now, step, extras },
  );
  await page.goto(
    `${BASE}/studio-conversation-room?gstep=${step}&studioPaymentSandbox=1`,
    { waitUntil: "domcontentloaded", timeout: 60000 },
  );
  await page.waitForTimeout(2500);
}

async function facts(page) {
  return page.evaluate(() => {
    const question = [...document.querySelectorAll("h1")].at(-1);
    return {
      question: question?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      questionHtml: question?.innerHTML ?? "",
      back:
        [...document.querySelectorAll("button, a")].find((node) =>
          /back to/i.test(node.textContent ?? ""),
        )?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      voice: [...document.querySelectorAll("[data-voice-pref]")].map((node) =>
        node.textContent?.replace(/\s+/g, " ").trim(),
      ),
      extraLine: /extra details about your materials/i.test(document.body.innerText),
      chipDisplay: (() => {
        const row = document.querySelector("[class*='chipRow']");
        if (!row) return null;
        const style = getComputedStyle(row);
        return { display: style.display, columns: style.gridTemplateColumns };
      })(),
      snippet: document.body.innerText.replace(/\s+/g, " ").slice(0, 280),
    };
  });
}

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--ignore-certificate-errors"],
});
const report = {};

for (const item of [
  { step: "ask_business_name", file: "journey-chrome-business-name-360.jpg", extras: {} },
  {
    step: "ask_materials",
    file: "journey-chrome-materials-360.jpg",
    extras: { businessName: "Maya", deadlineStatus: "unconfirmed" },
  },
  {
    step: "summary",
    file: "journey-chrome-summary-360.jpg",
    extras: {
      businessName: "Maya",
      deadlineStatus: "unconfirmed",
      existingMaterialsNote: "Nothing yet",
    },
  },
]) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await seedAndOpen(page, item.step, item.extras);
  report[item.step] = await facts(page);
  const tablet = page.locator("[data-surface='tablet']").first();
  const dest = path.join(OUT, item.file);
  if (await tablet.count()) {
    await tablet.screenshot({ path: dest, type: "jpeg", quality: 84 });
  } else {
    await page.screenshot({ path: dest, type: "jpeg", quality: 84 });
  }
  await context.close();
}

writeFileSync(path.join(OUT, "journey-chrome-report.json"), JSON.stringify(report, null, 2));
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
await browser.close();
