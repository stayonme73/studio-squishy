/**
 * Prove completed Intake fill-in boxes are not yellow.
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

const intakeAnswers = {
  "shared:businessName": "Home Kitchen",
  "v2-rtu-flyer:flyerPurpose": "Grand opening weekend sale",
  "v2-rtu-flyer:mustInclude": "Call 555-0100 and mention 20% off.",
};

const campaign = {
  campaignId: "intake-no-yellow",
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
  routeMapIntakeDraft: {
    answers: intakeAnswers,
    savedAt: now,
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

function isYellowPaint(color) {
  const match = String(color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return /#(?:f7c900|f9d134|daa520|ffc|ffd|ffe98a)/i.test(color);
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  return r > 180 && g > 140 && b < 130;
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
await page.waitForSelector("[data-intake-type-line]", {
  timeout: 20000,
});

const facts = await page.evaluate(() => {
  const leftover = document.querySelector(
    ".route-map-social-intake__compact-field",
  );
  const fields = Array.from(
    document.querySelectorAll("[data-intake-type-line]"),
  ).map((node) => {
    const style = getComputedStyle(node);
    const card = node.closest(".route-map-social-intake__card");
    const heading =
      card?.querySelector("h3")?.textContent?.replace(/\s+/g, " ").trim() || "";
    return {
      heading,
      tag: node.tagName.toLowerCase(),
      value: String(node.value || "").slice(0, 48),
      name: node.getAttribute("name"),
      autocomplete: node.getAttribute("autocomplete"),
      readonly: node.readOnly,
      bg: style.backgroundColor,
      border: style.borderColor,
      shadow: style.boxShadow,
      fill: style.webkitTextFillColor,
    };
  });
  const cards = Array.from(
    document.querySelectorAll(".route-map-social-intake__card"),
  )
    .slice(0, 4)
    .map((card) => {
      const style = getComputedStyle(card);
      return {
        heading: card.querySelector("h3")?.textContent?.replace(/\s+/g, " ").trim() || "",
        bg: style.backgroundColor,
        border: `${style.borderWidth} ${style.borderStyle}`,
      };
    });
  return {
    leftoverCompactField: Boolean(leftover),
    fieldCount: fields.length,
    fields,
    cards,
    hasHomeKitchen: /Home Kitchen/i.test(document.body.innerText),
    hasFlyerPurpose: /What is this flyer for/i.test(document.body.innerText),
  };
});

facts.yellowFields = facts.fields.filter(
  (field) => isYellowPaint(field.bg) || isYellowPaint(field.shadow),
);
facts.yellowCards = facts.cards.filter((card) => isYellowPaint(card.bg));
facts.pass =
  facts.fields.length > 0 &&
  !facts.leftoverCompactField &&
  facts.yellowFields.length === 0 &&
  facts.yellowCards.length === 0 &&
  facts.fields.every((field) => field.autocomplete === "off");

await page.screenshot({
  path: path.join(out, "intake-no-yellow-phone.jpg"),
  type: "jpeg",
  quality: 80,
});
const purposeCard = page
  .locator(".route-map-social-intake__card")
  .filter({ hasText: "What is this flyer for" })
  .first();
if (await purposeCard.count()) {
  await purposeCard.scrollIntoViewIfNeeded().catch(() => {});
  await purposeCard.screenshot({
    path: path.join(out, "intake-no-yellow-flyer-purpose.jpg"),
    type: "jpeg",
    quality: 80,
  });
}
const nameCard = page
  .locator(".route-map-social-intake__card")
  .filter({ hasText: "business" })
  .first();
if (await nameCard.count()) {
  await nameCard.scrollIntoViewIfNeeded().catch(() => {});
  await nameCard.screenshot({
    path: path.join(out, "intake-no-yellow-business-name.jpg"),
    type: "jpeg",
    quality: 80,
  });
}

writeFileSync(path.join(out, "intake-no-yellow.json"), JSON.stringify(facts, null, 2));
await browser.close();
process.stdout.write(`${JSON.stringify(facts, null, 2)}\n`);
if (!facts.pass) {
  process.exitCode = 1;
}
