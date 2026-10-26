import { chromium } from "playwright";

const out =
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs/cleanup-working-on-today-selected.jpg";
const now = new Date().toISOString();
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  ignoreHTTPSErrors: true,
  hasTouch: true,
  isMobile: true,
});
const page = await context.newPage();
await page.addInitScript(({ now }) => {
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
          projectNeed: "",
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
  sessionStorage.setItem("studio-guide:ui-step:v1", "ask_project_need");
  document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
}, { now });
await page.goto(
  "https://localhost:3000/studio-conversation-room?gstep=ask_project_need&studioPaymentSandbox=1",
  { waitUntil: "commit", timeout: 60000 },
);
await page.waitForSelector("text=What are you working on today?", {
  timeout: 20000,
});
const chip = page.locator('button:has-text("Marketing materials")').first();
await chip.dispatchEvent("pointerdown");
await page.waitForTimeout(500);
const paint = await chip.evaluate((node) => {
  const style = getComputedStyle(node);
  const hits = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = [...sheet.cssRules];
    } catch {
      continue;
    }
    for (const rule of rules) {
      const text = rule.cssText || "";
      if (text.includes("#20262d") && text.includes("aria-pressed")) {
        hits.push(text.slice(0, 180));
      }
    }
  }
  return {
    selected: node.getAttribute("data-selected"),
    pressed: node.getAttribute("aria-pressed"),
    className: node.className,
    bg: style.backgroundColor,
    border: style.borderColor,
    inTablet: Boolean(node.closest('[data-surface="tablet"]')),
    inApp: Boolean(node.closest(".studio-environment-app")),
    hasApp: Boolean(document.querySelector(".studio-environment-app")),
    hrefs: [...document.styleSheets].map((sheet) => sheet.href).filter(Boolean),
    selectedRules: hits.slice(0, 6),
  };
});
process.stdout.write(`chip ${JSON.stringify(paint)}\n`);
await page.screenshot({ path: out, type: "jpeg", quality: 82 });
process.stdout.write(`wrote ${out}\n`);
await browser.close();
