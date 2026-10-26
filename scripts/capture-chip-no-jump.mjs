import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = "https://localhost:3000";
const OUT =
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs";
mkdirSync(OUT, { recursive: true });

function seedProjectNeed(now) {
  return ({ now }) => {
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
  };
}

async function pointerActivate(locator) {
  await locator.dispatchEvent("pointerdown");
  await locator.dispatchEvent("pointerup");
  await locator.click({ force: true }).catch(() => {});
}

async function chipFacts(page, label) {
  return page.evaluate((text) => {
    const buttons = [...document.querySelectorAll("button")];
    const chip = buttons.find((node) => node.textContent?.trim() === text);
    if (!chip) return { missing: true, text };
    const style = getComputedStyle(chip);
    return {
      text,
      selected: chip.getAttribute("data-selected"),
      pressed: chip.getAttribute("aria-pressed"),
      heading: document.querySelector("h1")?.textContent?.trim() ?? "",
      borderWidth: style.borderWidth,
      borderColor: style.borderColor,
    };
  }, label);
}

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--ignore-certificate-errors"],
});

const report = {};

{
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  await page.goto(`${BASE}/studio-conversation-room?studioPaymentSandbox=1`, {
    waitUntil: "commit",
    timeout: 60000,
  });
  await page.waitForSelector("[data-voice-choice-film]", { timeout: 20000 });
  await page.evaluate(() => {
    const el = document.querySelector('[data-voice-choice-action="off"]');
    if (!(el instanceof HTMLElement)) return;
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
      }),
    );
    el.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
      }),
    );
  });
  await page.waitForTimeout(400);
  const stillOnGate = await page.locator("[data-voice-choice-film]").count();
  const fillPressed = await page.evaluate(
    () =>
      document
        .querySelector('[data-voice-choice-action="off"]')
        ?.getAttribute("aria-pressed") ?? null,
  );
  await page.screenshot({
    path: path.join(OUT, "no-jump-voice-choice-selected-360.jpg"),
    type: "jpeg",
    quality: 82,
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const el = document.querySelector("[data-voice-choice-continue]");
    if (!(el instanceof HTMLElement)) return;
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 2,
      }),
    );
  });
  try {
    await page.waitForSelector("text=Before we begin", { timeout: 12000 });
  } catch {
    await page.screenshot({
      path: path.join(OUT, "no-jump-voice-choice-continue-miss-360.jpg"),
      type: "jpeg",
      quality: 82,
    });
  }
  const afterContinue = await page.evaluate(() => ({
    gate: Boolean(document.querySelector("[data-voice-choice-film]")),
    heading: document.querySelector("h1")?.textContent?.trim() ?? "",
    namePanel: Boolean(document.querySelector("[data-name-question-panel='true']")),
    snippet: document.body.innerText.replace(/\s+/g, " ").slice(0, 220),
    fillPressed: document
      .querySelector('[data-voice-choice-action="off"]')
      ?.getAttribute("aria-pressed"),
    continueDisabled: document
      .querySelector("[data-voice-choice-continue]")
      ?.getAttribute("aria-disabled"),
  }));
  report.voiceChoice = {
    stillOnGateAfterFill: stillOnGate > 0,
    fillPressed,
    afterContinue,
  };
  await context.close();
}

{
  const now = new Date().toISOString();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  await page.addInitScript(seedProjectNeed(now), { now });
  await page.goto(
    `${BASE}/studio-conversation-room?gstep=ask_project_need&studioPaymentSandbox=1`,
    { waitUntil: "commit", timeout: 60000 },
  );
  await page.waitForSelector("text=What are you working on today?", {
    timeout: 20000,
  });
  const chip = page.locator('button:has-text("Marketing materials")').first();
  await chip.dispatchEvent("pointerdown");
  await page.waitForTimeout(400);
  const afterChip = await chipFacts(page, "Marketing materials");
  const stillOnNeed = await page.evaluate(() =>
    /What are you working on today/i.test(document.body.innerText),
  );
  const tablet = page.locator("[data-surface='tablet']").first();
  if (await tablet.count()) {
    await tablet.screenshot({
      path: path.join(OUT, "no-jump-marketing-materials-selected-360.jpg"),
      type: "jpeg",
      quality: 82,
    });
  } else {
    await page.screenshot({
      path: path.join(OUT, "no-jump-marketing-materials-selected-360.jpg"),
      type: "jpeg",
      quality: 82,
    });
  }
  await page.waitForTimeout(1000);
  const continueBtn = page.locator("[data-tablet-continue='true']").first();
  if (await continueBtn.count()) {
    await continueBtn.click({ force: true });
  } else {
    await page.getByRole("button", { name: "Continue" }).first().click({ force: true });
  }
  await page.waitForTimeout(800);
  const afterNeedContinue = await page.evaluate(() => ({
    heading: document.querySelector("h1")?.textContent?.trim() ?? "",
    snippet: document.body.innerText.replace(/\s+/g, " ").slice(0, 180),
  }));
  report.projectNeed = { afterChip, stillOnNeed, afterNeedContinue };
  await context.close();
}

{
  const now = new Date().toISOString();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  await page.addInitScript(seedProjectNeed(now), { now });
  await page.goto(
    `${BASE}/studio-conversation-room?gstep=ask_project_need&studioPaymentSandbox=1`,
    { waitUntil: "commit", timeout: 60000 },
  );
  await page.waitForSelector("text=What are you working on today?", {
    timeout: 20000,
  });
  const chip = page.locator('button:has-text("Website")').first();
  const trim = await chip.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      borderWidth: style.borderWidth,
      borderColor: style.borderColor,
    };
  });
  const tablet = page.locator("[data-surface='tablet']").first();
  if (await tablet.count()) {
    await tablet.screenshot({
      path: path.join(OUT, "trim-defined-working-on-today-laptop.jpg"),
      type: "jpeg",
      quality: 82,
    });
  } else {
    await page.screenshot({
      path: path.join(OUT, "trim-defined-working-on-today-laptop.jpg"),
      type: "jpeg",
      quality: 82,
    });
  }
  report.laptopTrim = trim;
  await context.close();
}

writeFileSync(
  path.join(OUT, "no-jump-chip-continue-report.json"),
  JSON.stringify(report, null, 2),
);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
await browser.close();
