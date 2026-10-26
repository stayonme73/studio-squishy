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
const now = new Date().toISOString();

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  ignoreHTTPSErrors: true,
  hasTouch: true,
  isMobile: true,
});
const page = await context.newPage();
page.setDefaultTimeout(60000);
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
        conversationLocation: "conversation-room-stage:checkout",
        flowStep: "checkout",
      },
      attribution: [],
      slices: {
        discoveryAnswers: {
          preferredName: "Maya",
          projectNeed: "I need a flyer for a grand opening.",
          businessName: "Home Kitchen",
          requestedDeadline: "September 15, 2026",
          deadlineStatus: "unconfirmed",
          existingMaterialsNote: "I have a logo.",
          confirmedAt: now,
        },
        currentConversationLocation: "conversation-room-stage:checkout",
        routeRecommendation: {
          roadId: "i75",
          projectNeed: "I need a flyer for a grand opening.",
          recommendedAt: now,
        },
        customerSelectedRoute: { roadId: "i75", selectedAt: now },
        selectedServices: [{ jobId: "v2-rtu-flyer", roadId: "i75", addedAt: now }],
      },
    }),
  );
  sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
  sessionStorage.setItem("studio-voice:first-entry-choice:v1", "done");
  document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
}, { now });

await page.goto(
  "https://localhost:3000/studio-conversation-room?stage=checkout&studioPaymentSandbox=1",
  { waitUntil: "commit", timeout: 60000 },
);
await page.waitForSelector("text=What Happens Next", { timeout: 25000 });
await page.locator("text=What Happens Next").first().scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
const paint = await page.evaluate(() => {
  const card = document.querySelector("[data-panel='checkout'] .co-card");
  const style = card ? getComputedStyle(card) : null;
  return {
    bg: style?.backgroundColor || "",
    blur: style?.backdropFilter || "",
  };
});
process.stdout.write(`checkout-card ${JSON.stringify(paint)}\n`);
await page.screenshot({
  path: path.join(out, "cleanup-checkout-clear.jpg"),
  type: "jpeg",
  quality: 82,
});
await page.screenshot({
  path: path.join(out, "cleanup-checkout-next.jpg"),
  type: "jpeg",
  quality: 82,
});
process.stdout.write(`wrote ${path.join(out, "cleanup-checkout-clear.jpg")}\n`);
await browser.close();
