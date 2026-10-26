/**
 * Real Samsung Customer-One — Complete Project Intake button.
 * Taps the Board CTA. Does not invent Jordan. Does not remint Maya.
 * Does not submit Intake. Does not open Review Room.
 *
 * Usage: node scripts/mobile-board-complete-intake-button-qa.mjs
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.STUDIO_PROOF_ORIGIN ?? "https://localhost:3000";
const MAYA_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const FRESH_ID = "2577b971-d0f9-4f3f-a03c-7d73bbcbdc2b";
const MAYA_FILE = path.join(process.cwd(), "data", "campaigns", `${MAYA_ID}.json`);
const FRESH_FILE = path.join(process.cwd(), "data", "campaigns", `${FRESH_ID}.json`);
const CAMPAIGN_DIR = path.join(process.cwd(), "data", "campaigns");
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
  };
}

async function campaignFileCount() {
  const files = await readdir(CAMPAIGN_DIR);
  return files.filter((name) => name.endsWith(".json")).length;
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function plantStaleSamsungState(page) {
  await page.evaluate(
    ({ mayaId }) => {
      window.sessionStorage.setItem("studio-payment:sandbox-opt-in:v1", "1");
      window.sessionStorage.setItem("studio-voice:first-entry-choice:v1", "required");
      window.sessionStorage.removeItem("studio-voice:narration-preference:v1");
      window.localStorage.removeItem("studio-squishy:working-draft:v1");
      window.localStorage.removeItem("studio-guide:capture-draft:v1");
      window.localStorage.setItem(
        "studio-squishy:current-campaign",
        JSON.stringify({
          campaignId: mayaId,
          campaignName: "Maya’s Mobile Boutique",
          campaignStatus: "READY_FOR_REVIEW",
          campaignDescription: "Stale Samsung pointer",
          estimatedCompletion: "Soon",
          packageId: "custom-studio-plan",
          packageLabel: "Custom Studio Plan",
          paymentReceivedAt: "2026-09-06T22:28:33.080Z",
          createdAt: "2026-09-06T22:28:32.897Z",
          updatedAt: "2026-09-12T18:01:27.495Z",
          deliverablesDelivered: {},
        }),
      );
    },
    { mayaId: MAYA_ID },
  );
}

async function tapCompleteIntake(page) {
  const cta = page.getByRole("link", { name: "Complete Project Intake" });
  await cta.waitFor({ state: "visible", timeout: 20000 });
  await cta.scrollIntoViewIfNeeded();
  const href = await cta.getAttribute("href");
  await cta.click();
  return href;
}

async function readIntakeSurface(page) {
  return page.evaluate(async () => {
    const text = document.body.innerText;
    const href = window.location.href;
    const localRaw = window.localStorage.getItem("studio-squishy:current-campaign");
    const local = localRaw ? JSON.parse(localRaw) : null;
    const currentRes = await fetch("/api/campaigns/current", { credentials: "include" });
    const currentBody = await currentRes.json().catch(() => ({}));
    const record = currentBody?.campaign?.record ?? currentBody?.campaign ?? null;
    const textareaValues = Array.from(document.querySelectorAll("textarea")).map(
      (node) => String(node.value || "").trim(),
    );
    return {
      href,
      text,
      voiceChoice: /How would you like to continue/i.test(text),
      openedReview: /\/feedback-studio|\/review-room/i.test(href),
      hasIntakePanel: Boolean(
        document.querySelector('[data-panel="intake"], [data-stage="intake"]'),
      ),
      progress: /4 of 6/i.test(text),
      localCampaignId: local?.campaignId ?? null,
      localCampaignName: local?.campaignName ?? null,
      currentCampaignId: record?.campaignId ?? null,
      currentCampaignName: record?.campaignName ?? null,
      currentSubmittedAt: record?.routeMapIntakeSubmittedAt ?? null,
      currentSandbox: record?.paymentTruth?.sandbox ?? null,
      draftPurpose: record?.routeMapIntakeDraft?.answers?.["v2-rtu-flyer:flyerPurpose"] ?? null,
      textareaValues,
    };
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const beforeMaya = await hashMayaFile();
  if (beforeMaya.freeze?.renderVersion !== 16 || beforeMaya.freeze?.doNotRemint !== true) {
    throw new Error("Maya envelope is not frozen at Version 16 before QA");
  }
  const freshDisk = JSON.parse(await readFile(FRESH_FILE, "utf8"));
  if (freshDisk.clientUserId !== "local-customer-one") {
    throw new Error("Fresh campaign is not owned by local-customer-one");
  }
  if (freshDisk.record?.routeMapIntakeSubmittedAt) {
    throw new Error("Fresh campaign Intake is already submitted — do not auto-submit");
  }
  const beforeCount = await campaignFileCount();

  const browser = await chromium.launch({ headless: true });
  const report = {
    ok: false,
    origin: BASE,
    proofs: [],
    beforeMaya,
    afterMaya: null,
    beforeCount,
    afterCount: null,
    firstHref: null,
    firstIntake: null,
    refresh: null,
    reentry: null,
  };

  try {
    const ctx = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 360, height: 780 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: "en-US",
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);

    await page.goto(`${BASE}/studio-lobby?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });

    const fixtureLogin = await ctx.request.post(`${BASE}/api/auth/local-customer-one`, {
      data: {},
    });
    const loginBody = await fixtureLogin.json().catch(() => ({}));
    if (!fixtureLogin.ok()) {
      throw new Error(`Customer-One login failed: ${JSON.stringify(loginBody)}`);
    }

    await plantStaleSamsungState(page);
    await page.goto(`${BASE}/studio-board?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForSelector(".sb-header-v3", { timeout: 20000 });
    await page.waitForTimeout(1800);
    report.proofs.push(await shot(page, "board-complete-intake-button-01-board.png"));

    report.firstHref = await tapCompleteIntake(page);
    await page.waitForURL(/stage=intake/, { timeout: 25000 });
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll("textarea")).some((node) =>
          /Launch announcement for The Studio|Opening October 2026/i.test(
            node.value || "",
          ),
        ) || /4 of 6/i.test(document.body.innerText),
      { timeout: 20000 },
    );
    await page.waitForTimeout(400);
    report.proofs.push(await shot(page, "board-complete-intake-button-02-after-tap.png"));
    report.firstIntake = await readIntakeSurface(page);

    if (report.firstIntake.openedReview) {
      throw new Error("Tap opened Review Room — forbidden");
    }
    if (report.firstIntake.voiceChoice) {
      throw new Error("Tap opened Voice Choice instead of Project Intake");
    }
    if (!String(report.firstHref || "").includes(FRESH_ID)) {
      throw new Error(`CTA href missing fresh campaign: ${report.firstHref}`);
    }
    if (!String(report.firstHref || "").includes("studioPaymentSandbox=1")) {
      throw new Error(`CTA href dropped sandbox: ${report.firstHref}`);
    }
    if (!report.firstIntake.href.includes(FRESH_ID)) {
      throw new Error(`Intake URL missing fresh campaign: ${report.firstIntake.href}`);
    }
    if (!report.firstIntake.href.includes("studioPaymentSandbox=1")) {
      throw new Error(`Intake URL dropped sandbox: ${report.firstIntake.href}`);
    }
    if (report.firstIntake.currentCampaignId !== FRESH_ID) {
      throw new Error(`Intake bound ${report.firstIntake.currentCampaignId}, expected ${FRESH_ID}`);
    }
    if (report.firstIntake.localCampaignId === MAYA_ID) {
      throw new Error("Intake still bound Maya in localStorage");
    }
    if (/Maya’s Mobile Boutique|Maya's Mobile Boutique/i.test(report.firstIntake.text)) {
      throw new Error("Intake opened Maya’s Mobile Boutique");
    }
    if (
      !report.firstIntake.progress &&
      !report.firstIntake.textareaValues.some((value) =>
        /Launch announcement for The Studio|Opening October 2026/i.test(value),
      )
    ) {
      throw new Error("Saved Intake draft was not restored");
    }
    if (report.firstIntake.currentSubmittedAt) {
      throw new Error("Intake was submitted automatically");
    }

    await page.reload({ waitUntil: "load", timeout: 60000 });
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll("textarea")).some((node) =>
          /Launch announcement for The Studio|Opening October 2026/i.test(
            node.value || "",
          ),
        ) || /4 of 6/i.test(document.body.innerText),
      { timeout: 20000 },
    );
    report.refresh = await readIntakeSurface(page);
    report.proofs.push(await shot(page, "board-complete-intake-button-03-refresh.png"));
    if (report.refresh.currentCampaignId !== FRESH_ID) {
      throw new Error("Refresh lost the fresh campaign");
    }
    if (
      !report.refresh.progress &&
      !report.refresh.textareaValues.some((value) =>
        /Launch announcement for The Studio|Opening October 2026/i.test(value),
      )
    ) {
      throw new Error("Refresh lost the saved Intake draft");
    }
    if (report.refresh.currentSubmittedAt) {
      throw new Error("Refresh submitted Intake");
    }

    await plantStaleSamsungState(page);
    await page.goto(`${BASE}/studio-board?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForSelector(".sb-header-v3", { timeout: 20000 });
    await page.waitForTimeout(1800);
    await tapCompleteIntake(page);
    await page.waitForURL(/stage=intake/, { timeout: 25000 });
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll("textarea")).some((node) =>
          /Launch announcement for The Studio|Opening October 2026/i.test(
            node.value || "",
          ),
        ) || /4 of 6/i.test(document.body.innerText),
      { timeout: 20000 },
    );
    report.reentry = await readIntakeSurface(page);
    report.proofs.push(await shot(page, "board-complete-intake-button-04-reentry.png"));
    if (report.reentry.currentCampaignId !== FRESH_ID) {
      throw new Error("Re-entry opened the wrong campaign");
    }
    if (
      !report.reentry.progress &&
      !report.reentry.textareaValues.some((value) =>
        /Launch announcement for The Studio|Opening October 2026/i.test(value),
      )
    ) {
      throw new Error("Re-entry did not restore the saved Intake draft");
    }
    if (report.reentry.openedReview) {
      throw new Error("Re-entry opened Review Room");
    }

    report.afterCount = await campaignFileCount();
    if (report.afterCount !== beforeCount) {
      throw new Error(
        `Campaign file count changed ${beforeCount} → ${report.afterCount} — duplicate created`,
      );
    }
    const freshAfter = JSON.parse(await readFile(FRESH_FILE, "utf8"));
    if (freshAfter.record?.routeMapIntakeSubmittedAt) {
      throw new Error("Fresh campaign Intake was submitted during QA");
    }

    report.afterMaya = await hashMayaFile();
    if (report.afterMaya.sha256 !== beforeMaya.sha256) {
      throw new Error("Maya envelope changed during Intake button proof");
    }

    report.ok = true;
  } finally {
    await writeFile(
      path.join(OUT, "board-complete-intake-button-qa.json"),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }

  if (!report.ok) {
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        proofs: report.proofs,
        firstHref: report.firstHref,
        campaignId: report.firstIntake?.currentCampaignId,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
