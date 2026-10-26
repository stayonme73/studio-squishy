/**
 * Samsung-walk three-defect proof. Isolated context. Does not remint Maya.
 * 1) Conversation question typography
 * 2) Pinned mic / type dock
 * 3) Continue to Secure Checkout actually fires hosted checkout
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

function workingDraft({ stage, opening }) {
  return {
    version: 1,
    status: "working_draft",
    editable: true,
    updatedAt: now,
    revision: 4,
    cursor: {
      conversationLocation: `conversation-room-stage:${stage}`,
      flowStep: stage,
    },
    attribution: [],
    slices: {
      discoveryAnswers: opening,
      currentConversationLocation: `conversation-room-stage:${stage}`,
      routeRecommendation: opening.projectNeed
        ? { roadId: "i75", projectNeed: opening.projectNeed, recommendedAt: now }
        : undefined,
      customerSelectedRoute: opening.projectNeed
        ? { roadId: "i75", selectedAt: now }
        : undefined,
      selectedServices: opening.projectNeed
        ? [{ jobId: "v2-rtu-flyer", roadId: "i75", addedAt: now }]
        : undefined,
    },
  };
}

const opening = {
  preferredName: "Maya",
  projectNeed: "I need a flyer for a grand opening.",
  businessName: "Home Kitchen",
  requestedDeadline: "October 15, 2026",
  deadlineStatus: "unconfirmed",
  existingMaterialsNote: "I have a logo.",
  confirmedAt: now,
};

async function seed(page, { stage, step, answers }) {
  const empty = {
    preferredName: "",
    projectNeed: "",
    businessName: "",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    confirmedAt: null,
  };
  const next = { ...empty, ...answers };
  await page.addInitScript(
    ({ draft, guide, step: uiStep }) => {
      localStorage.setItem("studio-squishy:working-draft:v1", JSON.stringify(draft));
      localStorage.setItem(
        "studio-guide:capture-draft:v1",
        JSON.stringify({ schemaVersion: 1, ...guide, source: "lobby-guide-conversation" }),
      );
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
      sessionStorage.setItem("studio-voice:first-entry-choice:v1", "done");
      document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
      if (uiStep) sessionStorage.setItem("studio-guide:ui-step:v1", uiStep);
    },
    {
      draft: workingDraft({ stage, opening: next }),
      guide: next,
      step,
    },
  );
}

async function withPage(browser, fn) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    return await fn(page);
  } finally {
    await context.close();
  }
}

async function shot(page, name) {
  const file = path.join(out, name);
  await page.screenshot({ path: file, type: "jpeg", quality: 82, fullPage: false });
  process.stdout.write(`shot ${name}\n`);
  return file;
}

async function dismissVoice(page) {
  const film = page.locator("[data-voice-choice-film]");
  if (await film.count()) {
    const fill = page.locator('[data-voice-choice-action="off"]').first();
    if ((await fill.count()) === 0) return;
    await fill.dispatchEvent("pointerdown", { timeout: 3000 }).catch(() => {});
    await fill.click({ force: true, timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
}

const facts = {};

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--ignore-certificate-errors"],
});

try {
  facts.question = await withPage(browser, async (page) => {
    await seed(page, {
      stage: "opening",
      step: "ask_project_need",
      answers: { preferredName: "Maya" },
    });
    await page.goto(`${BASE}/studio-conversation-room`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await dismissVoice(page);
    await page.waitForSelector("#conversation-room-active-question-heading", {
      timeout: 20000,
    });
    await page.waitForTimeout(500);
    const measured = await page.evaluate(() => {
      const heading = document.querySelector(
        "#conversation-room-active-question-heading",
      );
      const dock = document.querySelector("[data-answer-dock='pinned']");
      const speak = document.querySelector(
        "[data-permanent-communication='true'] [class*='speakZone']",
      );
      const field = document.querySelector("#studio-guide-type-field, [class*='typeLine']");
      const continueBtn = document.querySelector(
        "[data-permanent-communication='true'] .lobby-entry-film__cta, [data-permanent-communication='true'] [class*='sendBtn']",
      );
      const scroll = document.querySelector("[data-question-scroll-root='true']");
      const hs = heading ? getComputedStyle(heading) : null;
      const ss = speak ? getComputedStyle(speak) : null;
      const headingBox = heading?.getBoundingClientRect();
      const speakBox = speak?.getBoundingClientRect();
      const scrollBox = scroll?.getBoundingClientRect();
      return {
        headingText: heading?.textContent?.trim() ?? null,
        headingSize: hs?.fontSize ?? null,
        headingWeight: hs?.fontWeight ?? null,
        dockPinned: Boolean(dock),
        dockOutsideScroll: Boolean(
          dock && scroll && !scroll.contains(dock),
        ),
        speakMinHeight: ss?.minHeight ?? null,
        speakPadding: ss?.padding ?? null,
        speakInScroll: Boolean(speak && scroll?.contains(speak)),
        speakTop: speakBox ? Math.round(speakBox.top) : null,
        fieldVisible: field
          ? (() => {
              const box = field.getBoundingClientRect();
              return box.top >= 0 && box.bottom <= window.innerHeight + 4;
            })()
          : false,
        continueBox: continueBtn
          ? (() => {
              const box = continueBtn.getBoundingClientRect();
              const tablet = document
                .querySelector("[data-surface='tablet']")
                ?.getBoundingClientRect();
              return {
                top: Math.round(box.top),
                bottom: Math.round(box.bottom),
                inTablet: tablet
                  ? box.bottom <= tablet.bottom + 2 && box.top >= tablet.top - 2
                  : false,
              };
            })()
          : null,
        scrollBottom: scrollBox ? Math.round(scrollBox.bottom) : null,
        headingTop: headingBox ? Math.round(headingBox.top) : null,
      };
    });
    await shot(page, "samsung-walk-question-type.jpg");
    await shot(page, "samsung-walk-mic-dock.jpg");
    return measured;
  });

  facts.summary = await withPage(browser, async (page) => {
    await seed(page, {
      stage: "opening",
      step: "summary",
      answers: opening,
    });
    await page.goto(`${BASE}/studio-conversation-room`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await dismissVoice(page);
    await page.waitForSelector("text=Here’s what I understood", { timeout: 20000 });
    const summarySize = await page.evaluate(() => {
      const heading = document.querySelector(
        "[data-surface='tablet'] h1, [data-surface='tablet'] h2",
      );
      return {
        text: heading?.textContent?.trim() ?? null,
        size: heading ? getComputedStyle(heading).fontSize : null,
      };
    });
    await shot(page, "samsung-walk-summary-type.jpg");
    return summarySize;
  });

  facts.checkout = await withPage(browser, async (page) => {
    const requests = [];
    page.on("request", (req) => {
      if (/checkout|payment|stripe/i.test(req.url())) {
        requests.push({ method: req.method(), url: req.url() });
      }
    });
    await seed(page, {
      stage: "checkout",
      step: "checkout",
      answers: opening,
    });
    await page.goto(
      `${BASE}/studio-conversation-room?stage=checkout&studioPaymentSandbox=1`,
      { waitUntil: "domcontentloaded", timeout: 60000 },
    );
    await dismissVoice(page);
    await page.waitForSelector("#checkout-pay-continue, [data-checkout-pay='continue']", {
      timeout: 25000,
    });
    const terms = page.locator("[data-checkout-terms='1']").first();
    if (await terms.count()) {
      await terms.check({ force: true }).catch(async () => {
        await terms.click({ force: true });
      });
    }
    await page.waitForTimeout(500);
    const before = await page.evaluate(() => {
      const pay = document.querySelector("[data-checkout-pay='continue']");
      const box = document.querySelector("[data-checkout-terms='1']");
      return {
        label: pay?.textContent?.trim() ?? null,
        termsChecked: box instanceof HTMLInputElement ? box.checked : null,
      };
    });
    await shot(page, "samsung-walk-checkout-before.jpg");
    const pay = page.locator("[data-checkout-pay='continue']").first();
    await pay.dispatchEvent("pointerdown", { button: 0, clientX: 200, clientY: 700 });
    await pay.dispatchEvent("pointerup", { button: 0, clientX: 200, clientY: 700 });
    await pay.click({ force: true }).catch(() => {});
    await page
      .waitForResponse(
        (res) => res.url().includes("/api/payments/checkout-session"),
        { timeout: 8000 },
      )
      .catch(() => {});
    await page.waitForTimeout(1200);
    const after = await page.evaluate(() => {
      const pay = document.querySelector("[data-checkout-pay='continue']");
      const alert = document.querySelector("[role='alert']");
      return {
        completing: pay?.getAttribute("data-completing") ?? null,
        ariaBusy: pay?.getAttribute("aria-busy") ?? null,
        href: window.location.href,
        alert: alert?.textContent?.trim() ?? null,
      };
    });
    await shot(page, "samsung-walk-checkout-after.jpg");
    return { before, after, requests };
  });
} finally {
  await browser.close();
}

const report = path.join(out, "samsung-walk-three-facts.json");
writeFileSync(report, JSON.stringify(facts, null, 2));
process.stdout.write(`${report}\n${JSON.stringify(facts, null, 2)}\n`);
