/**
 * Contrast revision proof — one light smoke, Samsung + laptop.
 * Isolated. Does not remint Maya. Opacity is not locked.
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
  campaignId: "contrast-smoke-intake",
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

function draft(stage, step, extras) {
  return {
    version: 1,
    status: "working_draft",
    editable: true,
    updatedAt: now,
    revision: 4,
    cursor: {
      conversationLocation: `conversation-room-stage:${stage}`,
      flowStep: step,
    },
    attribution: [],
    slices: {
      discoveryAnswers: opening,
      currentConversationLocation: `conversation-room-stage:${stage}`,
      ...(extras
        ? {
            routeRecommendation: {
              roadId: "i75",
              projectNeed: opening.projectNeed,
              recommendedAt: now,
            },
            customerSelectedRoute: { roadId: "i75", selectedAt: now },
            selectedServices: [{ jobId: "v2-rtu-flyer", roadId: "i75", addedAt: now }],
          }
        : {}),
    },
  };
}

const viewports = [
  { name: "phone", width: 360, height: 800, isMobile: true, hasTouch: true },
  { name: "laptop", width: 1280, height: 800, isMobile: false, hasTouch: false },
];

const screens = [
  {
    name: "lobby",
    url: `${BASE}/?studioPaymentSandbox=1`,
    wait: "Studio",
    seed: false,
  },
  {
    name: "summary",
    url: `${BASE}/studio-conversation-room?studioPaymentSandbox=1`,
    wait: "understood",
    seed: { stage: "opening", step: "summary", extras: false, campaign: false },
  },
  {
    name: "intake",
    url: `${BASE}/studio-conversation-room?stage=intake&studioPaymentSandbox=1`,
    wait: "Exact text",
    seed: { stage: "intake", step: "intake", extras: true, campaign: true },
  },
  {
    name: "checkout",
    url: `${BASE}/studio-conversation-room?stage=checkout&studioPaymentSandbox=1`,
    wait: "Checkout",
    seed: { stage: "checkout", step: "checkout", extras: true, campaign: true },
  },
  {
    name: "help-center",
    url: `${BASE}/help-center`,
    wait: "Help",
    seed: false,
  },
  {
    name: "studio-board",
    url: `${BASE}/studio-board`,
    wait: "Studio Board",
    seed: false,
    login: true,
  },
];

async function dismissFilm(page) {
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

async function measure(page) {
  return page.evaluate(() => {
    const veil = document.querySelector(".studio-environment-shell__veil");
    const chip = document.querySelector(
      ".route-map-social-intake__chip, [class*=chip]:not([class*=chipRow]):not([class*=chips]), [data-voice-pref]",
    );
    const selected = document.querySelector(
      "[aria-pressed=true], [data-selected=true], .route-map-social-intake__chip--selected",
    );
    const leftover = document.querySelector(
      ".route-map-social-intake__card, .co-card, [class*=hostSurface]",
    );
    const field = document.querySelector("textarea, input:not([type=hidden])");
    const any = document.querySelector("h1, h2, p, button");
    const styleOf = (node) => {
      if (!node) return null;
      const style = getComputedStyle(node);
      return {
        bg: style.backgroundColor,
        border: `${style.borderWidth} ${style.borderStyle} ${style.borderColor}`,
        blur: style.backdropFilter || style.webkitBackdropFilter,
      };
    };
    return {
      snippet: document.body.innerText.replace(/\s+/g, " ").slice(0, 160),
      veil: styleOf(veil),
      chip: styleOf(chip),
      selected: styleOf(selected),
      leftover: styleOf(leftover),
      field: styleOf(field),
      type: any ? getComputedStyle(any).color : null,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
}

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--ignore-certificate-errors"],
});

const report = {};

for (const viewport of viewports) {
  for (const screen of screens) {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    });
    const page = await context.newPage();
    if (screen.login) {
      await page.request
        .post(`${BASE}/api/auth/login`, {
          data: { email: "tagia@local.dev", password: "dev-only" },
        })
        .catch(() => {});
    }
    if (screen.seed) {
      await page.addInitScript(
        ({ d, g, c, step }) => {
          localStorage.setItem("studio-squishy:working-draft:v1", JSON.stringify(d));
          if (c) localStorage.setItem("studio-squishy:current-campaign", JSON.stringify(c));
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
          sessionStorage.setItem("studio-guide:ui-step:v1", step);
        },
        {
          d: draft(screen.seed.stage, screen.seed.step, screen.seed.extras),
          g: opening,
          c: screen.seed.campaign ? campaign : null,
          step: screen.seed.step,
        },
      );
    }
    const key = `contrast-smoke-${screen.name}-${viewport.name}`;
    try {
      await page.goto(screen.url, { waitUntil: "commit", timeout: 60000 });
      await page.waitForTimeout(1600);
      await dismissFilm(page);
      await page.waitForSelector(`text=${screen.wait}`, { timeout: 12000 }).catch(() => {});
      if (screen.name === "intake") {
        const printChip = page.getByRole("button", { name: "Print", exact: true }).first();
        if (await printChip.count()) {
          await printChip.click({ force: true }).catch(() => {});
          await page.waitForTimeout(250);
        }
      }
      const facts = await measure(page);
      await page.screenshot({
        path: path.join(out, `${key}.jpg`),
        type: "jpeg",
        quality: 80,
      });
      report[key] = facts;
    } catch (error) {
      report[key] = { error: String(error) };
    }
    await context.close();
  }
}

await browser.close();
writeFileSync(path.join(out, "contrast-smoke-facts.json"), JSON.stringify(report, null, 2));
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
