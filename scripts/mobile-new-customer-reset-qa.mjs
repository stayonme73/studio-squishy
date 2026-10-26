/**
 * Builder QA: new-customer reset must not inherit Maya.
 * Seeds Maya browser state, takes Let’s Get Started, proves a blank opening.
 * Does not remint Maya. Does not start Customer-One production. Does not merge.
 *
 * Usage: node scripts/mobile-new-customer-reset-qa.mjs
 * Requires HTTPS Studio on localhost:3000.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const MAYA_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const MAYA_FILE = path.join(process.cwd(), "data", "campaigns", `${MAYA_ID}.json`);
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

async function hashMayaFile() {
  const raw = await readFile(MAYA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return {
    sha256: createHash("sha256").update(raw).digest("hex"),
    freeze: parsed?.record?.productionFreeze ?? null,
    campaignName: parsed?.record?.campaignName ?? null,
  };
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function seedMayaBrowserState(page) {
  await page.evaluate(
    ({ campaignId, sandboxKey }) => {
      const campaign = {
        campaignId,
        campaignName: "Maya’s Mobile Boutique",
        campaignStatus: "READY_FOR_REVIEW",
        campaignDescription: "Maya leftover",
        estimatedCompletion: "Frozen",
        packageId: "custom-studio-plan",
        packageLabel: "Custom Studio Plan",
        paymentReceivedAt: "2026-09-06T22:28:33.080Z",
        routeMapIntakeSubmittedAt: "2026-09-08T20:00:00.000Z",
        createdAt: "2026-09-06T10:00:00.000Z",
        updatedAt: "2026-09-08T20:00:00.000Z",
        deliverablesDelivered: {},
        approvedStudioPlan: {
          selectedServiceIds: ["v2-rtu-flyer"],
          includedServiceIds: ["v2-rtu-flyer"],
          additionalServiceIds: [],
          additionalCostUsd: 0,
          oneTimeTotalCents: 6900,
          monthlyTotalCents: 0,
          amountDueTodayCents: 6900,
          lineItems: [],
          approvedAt: "2026-09-06T22:28:33.080Z",
        },
      };
      window.localStorage.setItem(
        "studio-squishy:current-campaign",
        JSON.stringify(campaign),
      );
      window.localStorage.setItem(
        "studio-guide:capture-draft:v1",
        JSON.stringify({
          schemaVersion: 1,
          preferredName: "Maya",
          projectNeed: "Make Me a Flyer",
          businessName: "Maya’s Mobile Boutique",
          requestedDeadline: "",
          deadlineStatus: "unknown",
          existingMaterialsNote: "Maya leftover materials",
          confirmedAt: "2026-09-06T22:28:33.080Z",
          source: "lobby-guide-conversation",
        }),
      );
      window.sessionStorage.setItem(sandboxKey, "1");
      window.sessionStorage.setItem(
        "studioConversationSession",
        JSON.stringify({ journeyPhase: "intake", flowStep: "intake" }),
      );
    },
    {
      campaignId: MAYA_ID,
      sandboxKey: "studio-payment:sandbox-opt-in:v1",
    },
  );
}

async function waitForHydrated(page, selector) {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      return Object.keys(el).some(
        (key) =>
          key.startsWith("__reactFiber") ||
          key.startsWith("__reactProps") ||
          key.startsWith("__reactInternalInstance"),
      );
    },
    selector,
    { timeout: 20000 },
  );
}

async function chooseFillItOutMyself(page) {
  const selector = '[data-voice-choice-action="off"]';
  await page.waitForSelector(selector, { timeout: 30000 });
  await waitForHydrated(page, selector);
  const btn = page.locator(selector).first();
  await btn.focus();
  await page.keyboard.press("Enter");
  const typeField = page.locator("#studio-guide-type-field");
  try {
    await typeField.waitFor({ state: "visible", timeout: 4000 });
    return;
  } catch {
    /* Keyboard missed — hydrated pointerdown. */
  }
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "touch",
      }),
    );
  }, selector);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const beforeMaya = await hashMayaFile();
  if (beforeMaya.freeze?.renderVersion !== 16 || beforeMaya.freeze?.doNotRemint !== true) {
    throw new Error("Maya envelope is not frozen at Version 16 before QA");
  }

  const browser = await chromium.launch({ headless: true });
  const report = {
    ok: false,
    proofs: [],
    beforeMaya,
    afterMaya: null,
    afterStart: null,
    pageTextHasMaya: null,
    sandboxQuery: null,
  };

  try {
    const ctx = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 360, height: 780 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);

    await page.goto(
      `${BASE}/studio-lobby?lobbyEntry=reset&studioPaymentSandbox=1`,
      { waitUntil: "load", timeout: 60000 },
    );
    await seedMayaBrowserState(page);
    const cta = page.getByRole("link", { name: /LET’S GET STARTED/i }).first();
    await cta.waitFor({ state: "visible", timeout: 20000 });
    report.proofs.push(await shot(page, "new-customer-reset-01-lobby-maya-seed.png"));
    await cta.click({ timeout: 8000 }).catch(async () => {
      await cta.tap({ force: true });
    });

    await page.waitForURL(/studio-conversation-room/, { timeout: 30000 });
    await page.waitForSelector('[data-voice-choice-action="off"]', {
      timeout: 30000,
    });
    report.proofs.push(await shot(page, "new-customer-reset-02-opening.png"));
    await chooseFillItOutMyself(page);
    const nameField = page.locator("#studio-guide-type-field");
    await nameField.waitFor({ state: "visible", timeout: 15000 });
    report.proofs.push(await shot(page, "new-customer-reset-03-name-question.png"));
    const fieldValue = await nameField.inputValue().catch(() => "");
    const questionText = await page.locator("body").innerText();

    report.afterStart = await page.evaluate(() => ({
      campaign: window.localStorage.getItem("studio-squishy:current-campaign"),
      guide: window.localStorage.getItem("studio-guide:capture-draft:v1"),
      session: window.sessionStorage.getItem("studioConversationSession"),
      sandbox: window.sessionStorage.getItem("studio-payment:sandbox-opt-in:v1"),
      href: window.location.href,
    }));
    report.pageTextHasMaya = /Maya/i.test(questionText);
    report.sandboxQuery = /studioPaymentSandbox=1/.test(report.afterStart.href);
    report.nameFieldValue = fieldValue;
    report.hasNameQuestion = /what name would you like me to call you/i.test(
      questionText,
    );

    if (report.afterStart.campaign) {
      throw new Error("current-campaign pointer still present after Let’s Get Started");
    }
    if (report.afterStart.guide && /Maya/i.test(report.afterStart.guide)) {
      throw new Error("Guide capture still holds Maya after Let’s Get Started");
    }
    if (report.pageTextHasMaya) {
      throw new Error("Opening conversation still shows Maya copy");
    }
    if (fieldValue.trim()) {
      throw new Error("Name field was prefilled instead of blank");
    }
    if (!report.hasNameQuestion) {
      throw new Error("Did not land on a blank name question");
    }
    if (report.afterStart.sandbox !== "1" || !report.sandboxQuery) {
      throw new Error("Sandbox payment flag was not preserved");
    }

    report.afterMaya = await hashMayaFile();
    if (report.afterMaya.sha256 !== beforeMaya.sha256) {
      throw new Error("Maya campaign file changed during reset QA");
    }
    if (report.afterMaya.freeze?.renderVersion !== 16) {
      throw new Error("Maya freeze version is no longer 16");
    }

    report.ok = true;
    await writeFile(
      path.join(OUT, "new-customer-reset-qa.json"),
      JSON.stringify(report, null, 2),
    );
    console.log("PASS new-customer reset isolation");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("FAIL new-customer reset isolation");
  console.error(error);
  process.exit(1);
});
