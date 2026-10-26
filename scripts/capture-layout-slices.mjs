/**
 * Item #4 layout slices. Isolated. Does not remint Maya.
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

const openingOpen = {
  preferredName: "Tagia",
  projectNeed: "Marketing materials",
  businessName: "Home Kitchen",
  requestedDeadline: "",
  deadlineStatus: "not_requested",
  existingMaterialsNote: "",
  confirmedAt: null,
};

const openingPaid = {
  preferredName: "Tagia",
  projectNeed: "Marketing materials",
  businessName: "Home Kitchen",
  requestedDeadline: "Within 2 weeks",
  deadlineStatus: "unconfirmed",
  existingMaterialsNote: "I have a logo.",
  confirmedAt: now,
};

const extras = {
  routeRecommendation: {
    roadId: "i75",
    projectNeed: "Marketing materials",
    recommendedAt: now,
  },
  customerSelectedRoute: { roadId: "i75", selectedAt: now },
  selectedServices: [{ jobId: "v2-rtu-flyer", roadId: "i75", addedAt: now }],
};

function draft(stage, step, answers, useExtras) {
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
      discoveryAnswers: answers,
      currentConversationLocation: `conversation-room-stage:${stage}`,
      ...(useExtras ? extras : {}),
    },
  };
}

async function dismissFilm(page) {
  const film = page.locator("[data-voice-choice-film]");
  if (await film.count()) {
    const fill = page.locator('[data-voice-choice-action="off"]').first();
    if (await fill.count()) {
      await fill.dispatchEvent("pointerdown");
      await fill.click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
    }
  }
}

async function facts(page) {
  return page.evaluate(() => {
    const text = document.body.innerText.replace(/\s+/g, " ");
    const tablet = document.querySelector("[data-surface=tablet]");
    const panel = document.querySelector("[class*=nameQuestionPanel]");
    const map = document.querySelector(
      "[class*=mapHeroImg], [data-surface=tablet] figure img",
    );
    const back = document.querySelector("[class*=backLink], [class*=deckBack]");
    const heading = document.querySelector("h1, h2");
    const t = tablet ? tablet.getBoundingClientRect() : null;
    const p = panel ? panel.getBoundingClientRect() : null;
    const chips = Array.from(document.querySelectorAll("button")).filter((n) =>
      /Photos|Logo|Nothing yet|Something else/i.test(n.textContent || ""),
    );
    return {
      snippet: text.slice(0, 200),
      hasStep2: /step 2/i.test(text),
      hasStep3: /step 3/i.test(text),
      pad: tablet ? getComputedStyle(tablet).padding : null,
      backTop: back ? Math.round(back.getBoundingClientRect().top) : null,
      titleTop: heading ? Math.round(heading.getBoundingClientRect().top) : null,
      mapFit: map ? getComputedStyle(map).objectFit : null,
      mapH: map ? Math.round(map.getBoundingClientRect().height) : 0,
      panelOverflowY: panel ? getComputedStyle(panel).overflowY : null,
      panelScroll: panel ? panel.scrollHeight > panel.clientHeight + 1 : null,
      panelBottom: p ? Math.round(p.bottom) : null,
      tabletBottom: t ? Math.round(t.bottom) : null,
      docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      docScrollH: document.documentElement.scrollHeight,
      vh: window.innerHeight,
      chipsInPanel: chips.map((n) => {
        const b = n.getBoundingClientRect();
        return {
          text: (n.textContent || "").trim().slice(0, 32),
          bottom: Math.round(b.bottom),
          inPanel: p ? b.bottom <= p.bottom + 2 : null,
        };
      }),
    };
  });
}

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--ignore-certificate-errors"],
});

const cases = [
  {
    name: "layout-slice-summary",
    url: `${BASE}/studio-conversation-room?studioPaymentSandbox=1`,
    stage: "opening",
    step: "summary",
    answers: openingOpen,
    extras: false,
    wait: "understood",
  },
  {
    name: "layout-slice-materials",
    url: `${BASE}/studio-conversation-room?studioPaymentSandbox=1`,
    stage: "opening",
    step: "ask_materials",
    answers: openingOpen,
    extras: false,
    wait: "materials",
  },
  {
    name: "layout-slice-checkout",
    url: `${BASE}/studio-conversation-room?stage=checkout&studioPaymentSandbox=1`,
    stage: "checkout",
    step: "checkout",
    answers: openingPaid,
    extras: true,
    wait: "Checkout",
  },
];

const report = {};

for (const item of cases) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.addInitScript(
    ({ d, g, s }) => {
      localStorage.setItem("studio-squishy:working-draft:v1", JSON.stringify(d));
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
      sessionStorage.setItem("studio-guide:ui-step:v1", s);
    },
    {
      d: draft(item.stage, item.step, item.answers, item.extras),
      g: item.answers,
      s: item.step,
    },
  );
  await page.goto(item.url, { waitUntil: "commit", timeout: 60000 });
  await page.waitForTimeout(1600);
  await dismissFilm(page);
  await page.waitForSelector(`text=${item.wait}`, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);
  const measured = await facts(page);
  await page.screenshot({
    path: path.join(out, `${item.name}-phone.jpg`),
    type: "jpeg",
    quality: 80,
  });
  writeFileSync(path.join(out, `${item.name}.json`), JSON.stringify(measured, null, 2));
  report[item.name] = measured;
  await context.close();
}

await browser.close();
writeFileSync(path.join(out, "layout-slice-facts.json"), JSON.stringify(report, null, 2));
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
