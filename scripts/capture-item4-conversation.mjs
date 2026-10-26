/**
 * Item #4 only. Isolated context. Does not remint Maya.
 * Samsung-width Conversation proofs: one surface, no horizontal clip.
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

function workingDraft(opening) {
  return {
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
      discoveryAnswers: opening,
      currentConversationLocation: "conversation-room-stage:opening",
    },
  };
}

async function seed(page, { step, opening }) {
  await page.addInitScript(
    ({ draft, guide, uiStep }) => {
      localStorage.setItem("studio-squishy:working-draft:v1", JSON.stringify(draft));
      localStorage.setItem(
        "studio-guide:capture-draft:v1",
        JSON.stringify({ schemaVersion: 1, ...guide, source: "lobby-guide-conversation" }),
      );
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
      sessionStorage.setItem("studio-voice:first-entry-choice:v1", "done");
      document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
      sessionStorage.setItem("studio-guide:ui-step:v1", uiStep);
    },
    {
      draft: workingDraft(opening),
      guide: opening,
      uiStep: step,
    },
  );
}

async function facts(page) {
  return page.evaluate(() => {
    const room = document.querySelector("[data-layout='one-tablet']");
    const tablet = document.querySelector("[data-surface='tablet']");
    const field = document.querySelector("#studio-guide-type-field");
    const continueBtn = document.querySelector(".lobby-entry-film__cta, [class*='sendBtn']");
    const tooWide = Array.from(
      document.querySelectorAll(
        "[data-layout='one-tablet'] input, [data-layout='one-tablet'] textarea, [data-layout='one-tablet'] button, [data-layout='one-tablet'] a, [data-surface='tablet']",
      ),
    )
      .map((node) => {
        const box = node.getBoundingClientRect();
        return {
          text: node.textContent?.replace(/\s+/g, " ").trim().slice(0, 40) ?? node.id,
          width: Math.round(box.width),
          right: Math.round(box.right),
          overflow: box.right > window.innerWidth + 1 || box.width > window.innerWidth + 1,
        };
      })
      .filter((row) => row.overflow);
    return {
      vw: window.innerWidth,
      roomOverflow: room ? room.scrollWidth > room.clientWidth + 1 : null,
      tabletOverflow: tablet ? tablet.scrollWidth > tablet.clientWidth + 1 : null,
      docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      fieldWidth: field ? Math.round(field.getBoundingClientRect().width) : null,
      fieldRight: field ? Math.round(field.getBoundingClientRect().right) : null,
      continueWidth: continueBtn
        ? Math.round(continueBtn.getBoundingClientRect().width)
        : null,
      continueRight: continueBtn
        ? Math.round(continueBtn.getBoundingClientRect().right)
        : null,
      tooWide,
    };
  });
}

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--ignore-certificate-errors"],
});

const cases = [
  {
    name: "item4-name",
    step: "ask_preferred_name",
    opening: {
      preferredName: "",
      projectNeed: "",
      businessName: "",
      requestedDeadline: "",
      deadlineStatus: "not_requested",
      existingMaterialsNote: "",
      confirmedAt: null,
    },
    wait: "Before we begin",
  },
  {
    name: "item4-typed-name",
    step: "ask_preferred_name",
    opening: {
      preferredName: "Tagia",
      projectNeed: "",
      businessName: "",
      requestedDeadline: "",
      deadlineStatus: "not_requested",
      existingMaterialsNote: "",
      confirmedAt: null,
    },
    wait: "Before we begin",
    typeValue: "Tagia",
  },
  {
    name: "item4-choice",
    step: "ask_project_need",
    opening: {
      preferredName: "Tagia",
      projectNeed: "",
      businessName: "",
      requestedDeadline: "",
      deadlineStatus: "not_requested",
      existingMaterialsNote: "",
      confirmedAt: null,
    },
    wait: "Marketing materials",
  },
  {
    name: "item4-text",
    step: "ask_business_name",
    opening: {
      preferredName: "Tagia",
      projectNeed: "Marketing materials",
      businessName: "",
      requestedDeadline: "",
      deadlineStatus: "not_requested",
      existingMaterialsNote: "",
      confirmedAt: null,
    },
    wait: "business",
  },
  {
    name: "item4-materials",
    step: "ask_materials",
    opening: {
      preferredName: "Tagia",
      projectNeed: "Marketing materials",
      businessName: "Home Kitchen",
      requestedDeadline: "",
      deadlineStatus: "not_requested",
      existingMaterialsNote: "",
      confirmedAt: null,
    },
    wait: "materials",
  },
  {
    name: "item4-review",
    step: "summary",
    opening: {
      preferredName: "Tagia",
      projectNeed: "Marketing materials",
      businessName: "Home Kitchen",
      requestedDeadline: "",
      deadlineStatus: "not_requested",
      existingMaterialsNote: "Something else — leftover notes",
      confirmedAt: null,
    },
    wait: "understood",
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
  page.setDefaultTimeout(25000);
  await seed(page, item);
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
  await page.waitForSelector("text=" + item.wait, { timeout: 15000 }).catch(() => {});
  if (item.typeValue) {
    const field = page.locator("#studio-guide-type-field");
    if (await field.count()) {
      await field.fill(item.typeValue);
      await page.waitForTimeout(200);
    }
  }
  await page.waitForTimeout(400);
  const measured = await facts(page);
  const tablet = page.locator("[data-surface='tablet']").first();
  if (await tablet.count()) {
    await tablet.screenshot({
      path: path.join(out, `${item.name}-tablet.jpg`),
      type: "jpeg",
      quality: 82,
    });
  }
  await page.screenshot({
    path: path.join(out, `${item.name}-phone.jpg`),
    type: "jpeg",
    quality: 82,
    fullPage: false,
  });
  report[item.name] = measured;
  await context.close();
}

{
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 320, height: 720 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  await seed(page, cases[0]);
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
  report["item4-name-320"] = await facts(page);
  await page.screenshot({
    path: path.join(out, "item4-name-320-phone.jpg"),
    type: "jpeg",
    quality: 82,
  });
  await context.close();
}

await browser.close();
writeFileSync(path.join(out, "item4-conversation-facts.json"), JSON.stringify(report, null, 2));
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

for (const [name, row] of Object.entries(report)) {
  if (row.docOverflow) throw new Error(`${name} document overflows`);
  if (row.tabletOverflow) throw new Error(`${name} tablet overflows`);
  if (row.tooWide?.length) throw new Error(`${name} too wide: ${JSON.stringify(row.tooWide)}`);
  if (row.fieldRight != null && row.fieldRight > row.vw + 1) {
    throw new Error(`${name} type field exceeds viewport`);
  }
  if (row.continueRight != null && row.continueRight > row.vw + 1) {
    throw new Error(`${name} Continue exceeds viewport`);
  }
}
