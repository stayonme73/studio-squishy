/**
 * Item #4 Intake cleanup. Isolated. Does not remint Maya.
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
  preferredName: "Tagia",
  projectNeed: "Marketing materials",
  businessName: "Home Kitchen",
  requestedDeadline: "Within 2 weeks",
  deadlineStatus: "unconfirmed",
  existingMaterialsNote: "I have a logo.",
  confirmedAt: now,
};

const campaign = {
  campaignId: "layout-slice-intake",
  campaignName: "Home Kitchen Flyer",
  campaignStatus: "PAYMENT_RECEIVED",
  campaignDescription: "Paid",
  estimatedCompletion: "",
  packageId: "custom-studio-plan",
  packageLabel: "Custom Studio Plan",
  paymentReceivedAt: now,
  createdAt: now,
  updatedAt: now,
  deliverablesDelivered: {},
  studioNotes: [{ date: "Today", message: "Payment received." }],
  routeMapContext: {
    roadId: "i75",
    jobId: "v2-rtu-flyer",
    selectedServiceIds: ["v2-rtu-flyer"],
    currentStep: "intake",
    selectedAt: now,
  },
  approvedStudioPlan: {
    selectedServiceIds: ["v2-rtu-flyer"],
    includedServiceIds: ["v2-rtu-flyer"],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents: 6900,
    monthlyTotalCents: 0,
    amountDueTodayCents: 6900,
    lineItems: [],
    approvedAt: now,
  },
};

const draft = {
  version: 1,
  status: "working_draft",
  editable: true,
  updatedAt: now,
  revision: 4,
  cursor: {
    conversationLocation: "conversation-room-stage:intake",
    flowStep: "intake",
  },
  attribution: [],
  slices: {
    discoveryAnswers: opening,
    currentConversationLocation: "conversation-room-stage:intake",
    routeRecommendation: {
      roadId: "i75",
      projectNeed: opening.projectNeed,
      recommendedAt: now,
    },
    customerSelectedRoute: { roadId: "i75", selectedAt: now },
    selectedServices: [{ jobId: "v2-rtu-flyer", roadId: "i75", addedAt: now }],
  },
};

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
  ({ d, g, c }) => {
    localStorage.setItem("studio-squishy:working-draft:v1", JSON.stringify(d));
    localStorage.setItem("studio-squishy:current-campaign", JSON.stringify(c));
    localStorage.setItem(
      "studio-guide:capture-draft:v1",
      JSON.stringify({
        schemaVersion: 1,
        ...g,
        source: "lobby-guide-conversation",
      }),
    );
    sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    sessionStorage.setItem("studio-voice:first-entry-choice:v1", "done");
    document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
    sessionStorage.setItem("studio-guide:ui-step:v1", "intake");
  },
  { d: draft, g: opening, c: campaign },
);
await page.goto(`${BASE}/studio-conversation-room?stage=intake&studioPaymentSandbox=1`, {
  waitUntil: "commit",
  timeout: 60000,
});
await page.waitForTimeout(1800);
const film = page.locator("[data-voice-choice-film]");
if (await film.count()) {
  const fill = page.locator('[data-voice-choice-action="off"]').first();
  if (await fill.count()) {
    await fill.dispatchEvent("pointerdown");
    await fill.click({ force: true }).catch(() => {});
    await page.waitForTimeout(600);
  }
}
await page.waitForSelector("text=Exact text", { timeout: 15000 }).catch(() => {});
const printChip = page.getByRole("button", { name: "Print", exact: true }).first();
if (await printChip.count()) {
  await printChip.scrollIntoViewIfNeeded().catch(() => {});
  await printChip.click({ force: true }).catch(() => {});
  await page.waitForTimeout(300);
}
const laterChip = page.getByRole("button", { name: "I will provide this later" }).first();
if (await laterChip.count()) {
  await laterChip.click({ force: true }).catch(() => {});
  await page.waitForTimeout(300);
}

const facts = await page.evaluate(() => {
  const text = document.body.innerText.replace(/\s+/g, " ");
  const cards = Array.from(document.querySelectorAll(".route-map-social-intake__card"));
  const cardPaint = cards.slice(0, 3).map((card) => {
    const style = getComputedStyle(card);
    return {
      bg: style.backgroundColor,
      border: style.borderWidth,
      radius: style.borderRadius,
      pad: style.padding,
    };
  });
  const confirmed = Array.from(
    document.querySelectorAll("[class*=intakePaidAckItem][data-confirmed=true]"),
  ).map((node) => ({
    text: (node.textContent || "").trim(),
    color: getComputedStyle(node).color,
    bg: getComputedStyle(node).backgroundColor,
  }));
  const selectedChips = Array.from(
    document.querySelectorAll(
      ".route-map-social-intake__chip[aria-pressed=true], .route-map-social-intake__chip[data-selected=true]",
    ),
  ).map((node) => ({
    text: (node.textContent || "").trim(),
    color: getComputedStyle(node).color,
    bg: getComputedStyle(node).backgroundColor,
    border: getComputedStyle(node).borderColor,
  }));
  const chipGroups = Array.from(
    document.querySelectorAll(".route-map-social-intake__chips"),
  ).map((node) => {
    const style = getComputedStyle(node);
    const parent = node.closest(".route-map-social-intake__card");
    const heading = parent?.querySelector("h3")?.textContent?.replace(/\s+/g, " ").trim() || "";
    return {
      heading,
      bg: style.backgroundColor,
      border: `${style.borderWidth} ${style.borderStyle} ${style.borderColor}`,
      radius: style.borderRadius,
      pad: style.padding,
      shadow: style.boxShadow,
    };
  });
  const field = document.querySelector(
    ".route-map-social-intake__compact-field textarea, .route-map-social-intake__compact-field input",
  );
  return {
    snippet: text.slice(0, 220),
    hasExactText: /Exact text, offer details/i.test(text),
    payment: /Payment received/i.test(text),
    services: /Services confirmed/i.test(text),
    cardPaint,
    confirmed,
    selectedChips,
    chipGroups,
    fieldPad: field ? getComputedStyle(field).padding : null,
    docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
});

await page.screenshot({
  path: path.join(out, "layout-slice-intake-phone.jpg"),
  type: "jpeg",
  quality: 80,
});
const materialsGroup = page.locator(".route-map-social-intake__card--materials").first();
if (await materialsGroup.count()) {
  await materialsGroup.scrollIntoViewIfNeeded().catch(() => {});
  await materialsGroup.screenshot({
    path: path.join(out, "layout-slice-intake-materials-chips.jpg"),
    type: "jpeg",
    quality: 80,
  });
}
const intendedUse = page.locator(".route-map-social-intake__card").filter({ hasText: "Intended use" }).first();
if (await intendedUse.count()) {
  await intendedUse.scrollIntoViewIfNeeded().catch(() => {});
  await intendedUse.screenshot({
    path: path.join(out, "layout-slice-intake-intended-use-chips.jpg"),
    type: "jpeg",
    quality: 80,
  });
}
writeFileSync(path.join(out, "layout-slice-intake.json"), JSON.stringify(facts, null, 2));
await browser.close();
process.stdout.write(`${JSON.stringify(facts, null, 2)}\n`);
