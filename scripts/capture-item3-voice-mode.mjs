/**
 * Item #3 only. Isolated context. Does not remint Maya.
 * Voice On = mic + "Tap the mic to speak." No type field.
 * Voice Off = type field + "Start typing below." No mic.
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

function workingDraft() {
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
      discoveryAnswers: {
        preferredName: "",
        projectNeed: "",
        businessName: "",
        requestedDeadline: "",
        deadlineStatus: "not_requested",
        existingMaterialsNote: "",
        confirmedAt: null,
      },
      currentConversationLocation: "conversation-room-stage:opening",
    },
  };
}

async function seed(page, voice) {
  await page.addInitScript(
    ({ draft, preference }) => {
      localStorage.setItem("studio-squishy:working-draft:v1", JSON.stringify(draft));
      localStorage.setItem(
        "studio-guide:capture-draft:v1",
        JSON.stringify({
          schemaVersion: 1,
          preferredName: "",
          projectNeed: "",
          businessName: "",
          requestedDeadline: "",
          deadlineStatus: "not_requested",
          existingMaterialsNote: "",
          confirmedAt: null,
          source: "lobby-guide-conversation",
        }),
      );
      sessionStorage.setItem("studio-voice:narration-preference:v1", preference);
      sessionStorage.setItem("studio-voice:first-entry-choice:v1", "done");
      document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
      sessionStorage.setItem("studio-guide:ui-step:v1", "ask_preferred_name");
    },
    { draft: workingDraft(), preference: voice },
  );
}

async function facts(page) {
  return page.evaluate(() => {
    const on = document.querySelector('[data-voice-pref="on"]');
    const off = document.querySelector('[data-voice-pref="off"]');
    const mic = document.querySelector("[class*='speakZone']");
    const type = document.querySelector("#studio-guide-type-field");
    const hint = document.body.innerText;
    const dock = document.querySelector("[data-permanent-communication='true']");
    const paint = (node) => {
      if (!node) return null;
      const style = getComputedStyle(node);
      return {
        pressed: node.getAttribute("aria-pressed"),
        bg: style.backgroundColor,
        border: style.borderColor,
        color: style.color,
      };
    };
    return {
      voiceOn: paint(on),
      voiceOff: paint(off),
      voiceMode: dock?.getAttribute("data-voice-mode") ?? null,
      micVisible: Boolean(mic),
      micText: mic?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      typeVisible: Boolean(type),
      hasOrStartTyping: /or start typing below/i.test(hint),
      hasTapTheMic: /Tap the mic to speak/i.test(hint),
      hasStartTyping: /Start typing below/i.test(hint),
    };
  });
}

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--ignore-certificate-errors"],
});

async function open(voice) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  await seed(page, voice);
  await page.goto(`${BASE}/studio-conversation-room?studioPaymentSandbox=1`, {
    waitUntil: "commit",
    timeout: 60000,
  });
  await page.waitForTimeout(1400);
  const film = page.locator("[data-voice-choice-film]");
  if (await film.count()) {
    const fill = page.locator(`[data-voice-choice-action="${voice}"]`).first();
    if (await fill.count()) {
      await fill.dispatchEvent("pointerdown");
      await fill.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
    }
  }
  await page.waitForSelector("[data-voice-pref], [data-permanent-communication]", {
    timeout: 20000,
  });
  await page.waitForTimeout(400);
  return { context, page };
}

const report = {};

{
  const { context, page } = await open("on");
  report.on = await facts(page);
  await page.screenshot({
    path: path.join(out, "item3-voice-on.jpg"),
    type: "jpeg",
    quality: 82,
  });
  const offToggle = page.locator('[data-voice-pref="off"]').first();
  if (await offToggle.count()) {
    await offToggle.dispatchEvent("pointerdown");
    await offToggle.click({ force: true }).catch(() => {});
    await page.waitForTimeout(600);
    report.onThenOff = await facts(page);
    await page.screenshot({
      path: path.join(out, "item3-voice-on-then-off.jpg"),
      type: "jpeg",
      quality: 82,
    });
  }
  await context.close();
}

{
  const { context, page } = await open("off");
  report.off = await facts(page);
  await page.screenshot({
    path: path.join(out, "item3-voice-off.jpg"),
    type: "jpeg",
    quality: 82,
  });
  const onToggle = page.locator('[data-voice-pref="on"]').first();
  if (await onToggle.count()) {
    await onToggle.dispatchEvent("pointerdown");
    await onToggle.click({ force: true }).catch(() => {});
    await page.waitForTimeout(600);
    report.offThenOn = await facts(page);
    await page.screenshot({
      path: path.join(out, "item3-voice-off-then-on.jpg"),
      type: "jpeg",
      quality: 82,
    });
  }
  await context.close();
}

await browser.close();
writeFileSync(path.join(out, "item3-voice-mode-facts.json"), JSON.stringify(report, null, 2));
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (report.on.voiceMode !== "on") throw new Error("Voice On mode missing");
if (!report.on.micVisible) throw new Error("Voice On missing mic");
if (report.on.typeVisible) throw new Error("Voice On still shows type field");
if (report.on.hasOrStartTyping) throw new Error("Voice On still says or start typing");
if (!report.on.hasTapTheMic) throw new Error("Voice On missing Tap the mic to speak");
if (report.on.voiceOn?.pressed !== "true") throw new Error("Voice On not selected");
if (report.on.voiceOff?.pressed !== "false") throw new Error("Voice Off selected while On");
if (report.off.voiceMode !== "off") throw new Error("Voice Off mode missing");
if (report.off.micVisible) throw new Error("Voice Off still shows mic");
if (!report.off.typeVisible) throw new Error("Voice Off missing type field");
if (!report.off.hasStartTyping) throw new Error("Voice Off missing Start typing below");
if (report.off.hasTapTheMic) throw new Error("Voice Off still shows mic instruction");
if (report.off.voiceOff?.pressed !== "true") throw new Error("Voice Off not selected");
if (report.off.voiceOn?.pressed !== "false") throw new Error("Voice On selected while Off");
if (report.onThenOff && report.onThenOff.voiceMode !== "off") {
  throw new Error("Toggle On→Off did not switch to typing");
}
if (report.offThenOn && report.offThenOn.voiceMode !== "on") {
  throw new Error("Toggle Off→On did not switch to mic");
}
